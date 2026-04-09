using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Web;
using DotNetNuke.Entities.Portals;
using DotNetNuke.Entities.Users;

namespace DZP.RouteContext
{
    /// <summary>
    /// Validated per-request route context. Returns null when:
    ///  - RouteActive is not set (no slug route matched)
    ///  - [community] slug is in the route but not in the Community table
    ///  - current user is not a member of that community (SuperUsers bypass)
    ///  - [company] slug is in the route but not in the Company table
    /// Result is cached in HttpContext.Items for the entire request.
    /// </summary>
    public class RouteContext
    {
        private const string CacheKey = "RouteContext";
        private static bool _permissionsSynced;

        public int CommunityId { get; private set; }
        public string CommunitySlug { get; private set; }
        public string CommunityName { get; private set; }
        public int CommunityRoleId { get; private set; }
        public string CommunityRoleName { get; private set; }
        public string CompanySlug { get; private set; }
        public string CompanyName { get; private set; }

        /// <summary>
        /// Returns the validated context for this request, or null if
        /// the route is inactive or any slug failed DB validation.
        /// </summary>
        public static RouteContext Current
        {
            get
            {
                var items = HttpContext.Current.Items;
                if (items.Contains(CacheKey))
                    return items[CacheKey] as RouteContext;

                var ctx = Resolve(items);
                items[CacheKey] = ctx; // cache null too — don't re-query
                return ctx;
            }
        }

        private static RouteContext Resolve(System.Collections.IDictionary items)
        {
            // 1. RouteActive must be set by DynamicRoutes
            if (items["RouteActive"] == null)
                return null;

            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr))
                return null;

            if (!_permissionsSynced)
            {
                _permissionsSynced = true;
                EnsureTabPermissions(connStr);
            }

            var ctx = new RouteContext();
            var ps = PortalSettings.Current;
            var user = ps?.UserInfo;

            // 2. Validate [community] if present in route
            var communitySlug = items["community"] as string;
            if (!string.IsNullOrEmpty(communitySlug))
            {
                int communityId;
                var name = LookupCommunity(connStr, communitySlug, out communityId);
                if (name == null) return null;

                // Check membership (SuperUsers bypass)
                if (user == null || !user.IsSuperUser)
                {
                    var userId = user != null ? user.UserID : -1;
                    if (!IsUserInCommunity(connStr, userId, communityId))
                    {
                        DenyAccess();
                        return null;
                    }

                    // Resolve the user's community role
                    if (user != null && user.UserID > 0)
                    {
                        int roleId;
                        string roleName;
                        LookupCommunityRole(connStr, user.UserID, communityId, out roleId, out roleName);
                        ctx.CommunityRoleId = roleId;
                        ctx.CommunityRoleName = roleName;

                        // Must have a role in the community
                        if (roleId <= 0)
                        {
                            DenyAccess();
                            return null;
                        }

                        // If this tab has VIEW for specific community roles, enforce them
                        if (ps != null && ps.ActiveTab != null
                            && !IsCommunityRoleAllowedOnTab(connStr, roleId, ps.ActiveTab.TabID))
                        {
                            DenyAccess();
                            return null;
                        }
                    }
                }

                ctx.CommunityId = communityId;
                ctx.CommunitySlug = communitySlug;
                ctx.CommunityName = name;
            }

            // 3. Validate [company] if present in route
            var companySlug = items["company"] as string;
            if (!string.IsNullOrEmpty(companySlug))
            {
                var name = LookupSlug(connStr, "SELECT Name FROM Company WHERE Slug = @slug", companySlug);
                if (name == null) return null;
                ctx.CompanySlug = companySlug;
                ctx.CompanyName = name;
            }

            return ctx;
        }

        private static string LookupCommunity(string connStr, string slug, out int communityId)
        {
            communityId = 0;
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand("SELECT Id, Name FROM Community WHERE Slug = @slug", conn))
            {
                cmd.Parameters.AddWithValue("@slug", slug);
                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    communityId = reader.GetInt32(0);
                    return reader.GetString(1);
                }
            }
        }

        private static void DenyAccess()
        {
            HttpContext.Current.Response.Redirect(
                DotNetNuke.Common.Globals.AccessDeniedURL(), true);
        }

        /// <summary>
        /// Runs once per app pool lifecycle. Ensures "Registered Users" VIEW
        /// on all dynamic-route descendant tabs (any top-level tab whose path
        /// starts with //[…]) so the DNN HTTP pipeline lets authenticated
        /// users through. Community-role VIEW permissions (e.g. Community
        /// Manager on manage tabs) must be set via the DNN admin UI.
        /// Idempotent — NOT EXISTS prevents duplicates.
        /// </summary>
        private static void EnsureTabPermissions(string connStr)
        {
            const string sql = @"
                DECLARE @PortalID INT = 0;
                DECLARE @RegUsersRoleID INT = (
                    SELECT RoleID FROM Roles WHERE PortalID = @PortalID AND RoleName = 'Registered Users');
                DECLARE @ViewPermID INT = (
                    SELECT PermissionID FROM Permission
                    WHERE PermissionCode = 'SYSTEM_TAB' AND PermissionKey = 'VIEW');

                IF @RegUsersRoleID IS NULL OR @ViewPermID IS NULL
                    RETURN;

                ;WITH AllDesc AS (
                    SELECT TabID FROM Tabs
                    WHERE PortalID = @PortalID AND TabPath LIKE '//[[]%]' AND IsDeleted = 0
                    UNION ALL
                    SELECT t.TabID FROM Tabs t INNER JOIN AllDesc d ON t.ParentId = d.TabID WHERE t.IsDeleted = 0
                )
                INSERT INTO TabPermission
                    (TabID, PermissionID, AllowAccess, RoleID, UserID,
                     CreatedByUserID, CreatedOnDate, LastModifiedByUserID, LastModifiedOnDate)
                SELECT d.TabID, @ViewPermID, 1, @RegUsersRoleID, NULL,
                       -1, GETDATE(), -1, GETDATE()
                FROM AllDesc d
                WHERE NOT EXISTS (
                    SELECT 1 FROM TabPermission tp
                    WHERE tp.TabID = d.TabID AND tp.PermissionID = @ViewPermID
                      AND tp.RoleID = @RegUsersRoleID);";

            try
            {
                using (var conn = new SqlConnection(connStr))
                using (var cmd = new SqlCommand(sql, conn))
                {
                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
            }
            catch { /* non-fatal — permissions may already exist */ }
        }

        private static bool IsUserInCommunity(string connStr, int userId, int communityId)
        {
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(
                "SELECT 1 FROM UserCommunity WHERE UserId = @userId AND CommunityId = @communityId", conn))
            {
                cmd.Parameters.AddWithValue("@userId", userId);
                cmd.Parameters.AddWithValue("@communityId", communityId);
                conn.Open();
                return cmd.ExecuteScalar() != null;
            }
        }

        private static string LookupSlug(string connStr, string sql, string slug)
        {
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(sql, conn))
            {
                cmd.Parameters.AddWithValue("@slug", slug);
                conn.Open();
                var result = cmd.ExecuteScalar();
                return result?.ToString();
            }
        }

        private static void LookupCommunityRole(string connStr, int userId, int communityId, out int roleId, out string roleName)
        {
            roleId = 0;
            roleName = null;
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(
                "SELECT r.RoleID, r.RoleName FROM UserCommunity uc INNER JOIN Roles r ON r.RoleID = uc.RoleId WHERE uc.UserId = @userId AND uc.CommunityId = @communityId", conn))
            {
                cmd.Parameters.AddWithValue("@userId", userId);
                cmd.Parameters.AddWithValue("@communityId", communityId);
                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        roleId = reader.GetInt32(0);
                        roleName = reader.GetString(1);
                    }
                }
            }
        }

        /// <summary>
        /// Returns true if the user's community role is allowed on this tab.
        /// If the tab has VIEW for any community-scoped role (a role that
        /// exists in UserCommunity), the user's role must match one of them.
        /// If no community role has VIEW on this tab, any member is allowed.
        /// The role comes from UserCommunity, not DNN's UserRoles table.
        /// </summary>
        private static bool IsCommunityRoleAllowedOnTab(string connStr, int roleId, int tabId)
        {
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(@"
                DECLARE @restricted BIT = CASE WHEN EXISTS (
                    SELECT 1 FROM TabPermission tp
                    INNER JOIN Permission p ON p.PermissionID = tp.PermissionID
                    WHERE tp.TabID = @tabId AND tp.AllowAccess = 1
                      AND p.PermissionCode = 'SYSTEM_TAB' AND p.PermissionKey = 'VIEW'
                      AND tp.RoleID IN (SELECT DISTINCT RoleId FROM UserCommunity)
                ) THEN 1 ELSE 0 END;
                SELECT CASE
                    WHEN @restricted = 0 THEN 1
                    WHEN EXISTS (
                        SELECT 1 FROM TabPermission tp
                        INNER JOIN Permission p ON p.PermissionID = tp.PermissionID
                        WHERE tp.TabID = @tabId AND tp.RoleID = @roleId AND tp.AllowAccess = 1
                          AND p.PermissionCode = 'SYSTEM_TAB' AND p.PermissionKey = 'VIEW'
                    ) THEN 1
                    ELSE 0
                END;", conn))
            {
                cmd.Parameters.AddWithValue("@tabId", tabId);
                cmd.Parameters.AddWithValue("@roleId", roleId);
                conn.Open();
                var result = cmd.ExecuteScalar();
                return result != null && (int)result == 1;
            }
        }

        // ── Dashboard helpers ────────────────────────────────────

        /// <summary>
        /// Lightweight fallback: resolve community from the Referer header.
        /// Used during 2sxc AJAX module re-renders where the request URL
        /// does not contain the community slug.
        /// </summary>
        public static RouteContext ResolveFromReferer()
        {
            var request = HttpContext.Current?.Request;
            if (request == null) return null;
            var referer = request.UrlReferrer;
            if (referer == null) return null;

            // URL like /hoeksche-waard/timeline → segments[1] = "hoeksche-waard"
            var segments = referer.AbsolutePath.Split(new[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length < 1) return null;

            var slug = segments[0];
            var community = GetCommunityBySlug(slug);
            if (community == null) return null;

            var ps = PortalSettings.Current;
            var user = ps?.UserInfo;
            var ctx = new RouteContext
            {
                CommunityId = community.Id,
                CommunitySlug = community.Slug,
                CommunityName = community.Name
            };

            // Resolve the user's community role (if logged in)
            if (user != null && user.UserID > 0 && !user.IsSuperUser)
            {
                var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
                if (!string.IsNullOrEmpty(connStr))
                {
                    int roleId;
                    string roleName;
                    LookupCommunityRole(connStr, user.UserID, community.Id, out roleId, out roleName);
                    ctx.CommunityRoleId = roleId;
                    ctx.CommunityRoleName = roleName;
                }
            }

            return ctx;
        }

        /// <summary>
        /// Looks up a community by slug. Returns null if not found.
        /// </summary>
        public static CommunityInfo GetCommunityBySlug(string slug)
        {
            if (string.IsNullOrEmpty(slug)) return null;
            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return null;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand("SELECT Id, Slug, Name FROM Community WHERE Slug = @slug", conn))
            {
                cmd.Parameters.AddWithValue("@slug", slug);
                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    if (!reader.Read()) return null;
                    return new CommunityInfo
                    {
                        Id   = reader.GetInt32(0),
                        Slug = reader.GetString(1),
                        Name = reader.GetString(2)
                    };
                }
            }
        }

        public class CommunityInfo
        {
            public int Id;
            public string Slug;
            public string Name;
        }

        public class GroupInfo
        {
            public int Id;
            public int CommunityId;
            public string Name;
            public string Description;
        }

        /// <summary>
        /// Returns all groups in a specific community.
        /// </summary>
        public static List<GroupInfo> GetAllCommunityGroups(int communityId)
        {
            var list = new List<GroupInfo>();
            if (communityId <= 0) return list;

            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return list;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(
                "SELECT Id, CommunityId, Name, Description FROM CommunityGroups WHERE CommunityId = @cid ORDER BY Name", conn))
            {
                cmd.Parameters.AddWithValue("@cid", communityId);
                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new GroupInfo
                        {
                            Id          = reader.GetInt32(0),
                            CommunityId = reader.GetInt32(1),
                            Name        = reader.GetString(2),
                            Description = reader.IsDBNull(3) ? null : reader.GetString(3)
                        });
                    }
                }
            }
            return list;
        }

        /// <summary>
        /// Returns all communities.
        /// </summary>
        public static List<CommunityInfo> GetAllCommunities()
        {
            var list = new List<CommunityInfo>();
            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return list;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand("SELECT Id, Slug, Name FROM Community ORDER BY Name", conn))
            {
                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new CommunityInfo
                        {
                            Id   = reader.GetInt32(0),
                            Slug = reader.GetString(1),
                            Name = reader.GetString(2)
                        });
                    }
                }
            }
            return list;
        }

        /// <summary>
        /// Returns communities the user belongs to (or all for SuperUsers).
        /// </summary>
        public static List<CommunityInfo> GetUserCommunities(UserInfo user)
        {
            var list = new List<CommunityInfo>();
            if (user == null || user.UserID <= 0) return list;

            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return list;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                if (user.IsSuperUser)
                {
                    cmd.CommandText = "SELECT Id, Slug, Name FROM Community ORDER BY Name";
                }
                else
                {
                    cmd.CommandText = @"
                        SELECT c.Id, c.Slug, c.Name
                        FROM Community c
                        INNER JOIN UserCommunity uc ON c.Id = uc.CommunityId
                        WHERE uc.UserId = @userId
                        ORDER BY c.Name";
                    cmd.Parameters.AddWithValue("@userId", user.UserID);
                }

                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new CommunityInfo
                        {
                            Id   = reader.GetInt32(0),
                            Slug = reader.GetString(1),
                            Name = reader.GetString(2)
                        });
                    }
                }
            }
            return list;
        }

        /// <summary>
        /// Returns groups the user belongs to (or all for SuperUsers).
        /// Community Managers get ALL groups in the communities they manage.
        /// Regular members (Lid) only get groups they are explicitly assigned to.
        /// </summary>
        public static List<GroupInfo> GetUserGroups(UserInfo user)
        {
            var list = new List<GroupInfo>();
            if (user == null || user.UserID <= 0) return list;

            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return list;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = conn.CreateCommand())
            {
                if (user.IsSuperUser)
                {
                    cmd.CommandText = @"
                        SELECT g.Id, g.CommunityId, g.Name, g.Description
                        FROM CommunityGroups g
                        ORDER BY g.Name";
                }
                else
                {
                    // Return groups the user is explicitly in, PLUS all groups
                    // from communities where the user is a Community Manager
                    cmd.CommandText = @"
                        SELECT DISTINCT g.Id, g.CommunityId, g.Name, g.Description
                        FROM CommunityGroups g
                        LEFT JOIN UserCommunityGroups ucg ON g.Id = ucg.CommunityGroupId AND ucg.UserId = @userId
                        LEFT JOIN UserCommunity uc ON g.CommunityId = uc.CommunityId AND uc.UserId = @userId
                        LEFT JOIN Roles r ON uc.RoleId = r.RoleID
                        WHERE ucg.UserId IS NOT NULL
                           OR r.RoleName = 'Community Manager'
                        ORDER BY g.Name";
                    cmd.Parameters.AddWithValue("@userId", user.UserID);
                }

                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        list.Add(new GroupInfo
                        {
                            Id          = reader.GetInt32(0),
                            CommunityId = reader.GetInt32(1),
                            Name        = reader.GetString(2),
                            Description = reader.IsDBNull(3) ? null : reader.GetString(3)
                        });
                    }
                }
            }
            return list;
        }

        /// <summary>
        /// Returns communities the user belongs to, along with their community slug.
        /// Community Managers see the community slug in results so posts tagged
        /// with community slugs are visible. Regular members only see their
        /// explicitly assigned groups.
        /// Returns a combined set of community slugs + group names for filtering.
        /// </summary>
        public static HashSet<string> GetUserContentTags(UserInfo user)
        {
            var tags = new HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            if (user == null || user.UserID <= 0) return tags;

            var connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString;
            if (string.IsNullOrEmpty(connStr)) return tags;

            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();

                if (user.IsSuperUser)
                {
                    // SuperUsers see everything
                    using (var cmd = new SqlCommand("SELECT Slug FROM Community", conn))
                    using (var reader = cmd.ExecuteReader())
                        while (reader.Read()) tags.Add(reader.GetString(0));

                    using (var cmd2 = new SqlCommand("SELECT Name FROM CommunityGroups", conn))
                    using (var reader2 = cmd2.ExecuteReader())
                        while (reader2.Read()) tags.Add(reader2.GetString(0));
                }
                else
                {
                    // Community Managers: add the community slug (sees all posts tagged with it)
                    // + all group names in that community
                    using (var cmd = new SqlCommand(@"
                        SELECT c.Slug FROM Community c
                        INNER JOIN UserCommunity uc ON c.Id = uc.CommunityId
                        INNER JOIN Roles r ON uc.RoleId = r.RoleID
                        WHERE uc.UserId = @userId AND r.RoleName = 'Community Manager'", conn))
                    {
                        cmd.Parameters.AddWithValue("@userId", user.UserID);
                        using (var reader = cmd.ExecuteReader())
                            while (reader.Read()) tags.Add(reader.GetString(0));
                    }

                    using (var cmd2 = new SqlCommand(@"
                        SELECT g.Name FROM CommunityGroups g
                        INNER JOIN UserCommunity uc ON g.CommunityId = uc.CommunityId
                        INNER JOIN Roles r ON uc.RoleId = r.RoleID
                        WHERE uc.UserId = @userId AND r.RoleName = 'Community Manager'", conn))
                    {
                        cmd2.Parameters.AddWithValue("@userId", user.UserID);
                        using (var reader = cmd2.ExecuteReader())
                            while (reader.Read()) tags.Add(reader.GetString(0));
                    }

                    // Regular members: add only their specific group names
                    using (var cmd3 = new SqlCommand(@"
                        SELECT g.Name FROM CommunityGroups g
                        INNER JOIN UserCommunityGroups ucg ON g.Id = ucg.CommunityGroupId
                        WHERE ucg.UserId = @userId", conn))
                    {
                        cmd3.Parameters.AddWithValue("@userId", user.UserID);
                        using (var reader = cmd3.ExecuteReader())
                            while (reader.Read()) tags.Add(reader.GetString(0));
                    }
                }
            }
            return tags;
        }
    }
}
