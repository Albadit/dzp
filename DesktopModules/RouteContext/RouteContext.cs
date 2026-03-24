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

        public int CommunityId { get; private set; }
        public string CommunitySlug { get; private set; }
        public string CommunityName { get; private set; }
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
                        return null;
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
            using (var cmd = new SqlCommand("SELECT CommunityID, Name FROM Community WHERE Slug = @slug", conn))
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

        private static bool IsUserInCommunity(string connStr, int userId, int communityId)
        {
            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand(
                "SELECT 1 FROM UserCommunity WHERE UserID = @userId AND CommunityID = @communityId", conn))
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

        // ── Dashboard helpers ────────────────────────────────────

        public class CommunityInfo
        {
            public int Id;
            public string Slug;
            public string Name;
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
            using (var cmd = new SqlCommand("SELECT CommunityID, Slug, Name FROM Community ORDER BY Name", conn))
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
                    cmd.CommandText = "SELECT CommunityID, Slug, Name FROM Community ORDER BY Name";
                }
                else
                {
                    cmd.CommandText = @"
                        SELECT c.CommunityID, c.Slug, c.Name
                        FROM Community c
                        INNER JOIN UserCommunity uc ON c.CommunityID = uc.CommunityID
                        WHERE uc.UserID = @userId
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
    }
}
