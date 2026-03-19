using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;

namespace DnnDev.Routing.Data
{
    /// <summary>
    /// Centralized data access for Community and UserCommunity tables.
    /// All SQL queries go through this class — no raw SQL in views or routing code.
    ///
    /// Implements <see cref="ISegment"/> so RouteConfig can treat
    /// [community] the same as any other dynamic segment ([company], etc.).
    /// </summary>
    public class Community : ISegment
    {
        /// <summary>Singleton used by RouteConfig and Constants.Segments.</summary>
        public static readonly Community Instance = new Community();

        // ── ISegment ───────────────────────────────────────────

        public string ParamName => Constants.Segments.Community;

        public bool IsValidSlug(string slug) => IsValidCommunitySlug(slug);

        public string ResolveTemplateRedirect(string username) => ResolveUserRedirect(username);

        public string CheckAccess(string username, string slugValue) => CheckCommunityAccess(username, slugValue);

        public string GetNameBySlug(string slug) => GetCommunityNameBySlug(slug);

        public List<string> GetUserSlugsById(int userId) => GetUserSlugsByUserId(userId);

        public int GetUserEntityCount(int userId, bool isSuperUser) => GetUserCommunityCount(userId, isSuperUser);
        // ── Connection helper ────────────────────────────────────────────

        private static string GetConnectionString()
        {
            return ConfigurationManager.ConnectionStrings[Constants.ConnectionStringName]?.ConnectionString;
        }

        /// <summary>
        /// Returns true when a usable connection string is configured.
        /// </summary>
        public static bool IsAvailable()
        {
            return !string.IsNullOrEmpty(GetConnectionString());
        }

        // ── Community queries ────────────────────────────────────────────

        /// <summary>
        /// Get the display name for a community identified by its URL slug.
        /// Returns empty string when the slug is unknown.
        /// </summary>
        public static string GetCommunityNameBySlug(string slug)
        {
            if (string.IsNullOrEmpty(slug)) return "";

            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return "";

            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Name FROM Community WHERE Slug = @slug";
                    cmd.Parameters.AddWithValue("@slug", slug);
                    return (cmd.ExecuteScalar() as string) ?? "";
                }
            }
        }

        /// <summary>
        /// Get all community slugs in the system.
        /// Used by RouteConfig to determine if a URL segment is a community.
        /// </summary>
        public static List<string> GetAllSlugs()
        {
            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return new List<string>();

            var slugs = new List<string>();
            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT Slug FROM Community";
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var slug = reader["Slug"] as string;
                            if (!string.IsNullOrEmpty(slug))
                                slugs.Add(slug);
                        }
                    }
                }
            }
            return slugs;
        }

        // ── User–Community queries ───────────────────────────────────────

        /// <summary>
        /// Get the community slugs accessible to a specific DNN user (by username).
        /// </summary>
        public static List<string> GetUserSlugsByUsername(string username)
        {
            if (string.IsNullOrEmpty(username)) return new List<string>();

            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return new List<string>();

            var slugs = new List<string>();
            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        SELECT c.Slug
                        FROM Community c
                        INNER JOIN UserCommunity uc ON c.CommunityId = uc.CommunityId
                        INNER JOIN Users u ON u.UserID = uc.UserId
                        WHERE u.Username = @username";
                    cmd.Parameters.AddWithValue("@username", username);
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var slug = reader["Slug"] as string;
                            if (!string.IsNullOrEmpty(slug))
                                slugs.Add(slug);
                        }
                    }
                }
            }
            return slugs;
        }

        /// <summary>
        /// Get the community slugs accessible to a specific DNN user (by user ID).
        /// </summary>
        public static List<string> GetUserSlugsByUserId(int userId)
        {
            if (userId <= 0) return new List<string>();

            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return new List<string>();

            var slugs = new List<string>();
            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = @"
                        SELECT c.Slug
                        FROM Community c
                        INNER JOIN UserCommunity uc ON c.CommunityId = uc.CommunityId
                        WHERE uc.UserId = @userId";
                    cmd.Parameters.AddWithValue("@userId", userId);
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var slug = reader["Slug"] as string;
                            if (!string.IsNullOrEmpty(slug))
                                slugs.Add(slug);
                        }
                    }
                }
            }
            return slugs;
        }

        /// <summary>
        /// Count how many communities a user belongs to (or total for superusers).
        /// </summary>
        public static int GetUserCommunityCount(int userId, bool isSuperUser)
        {
            if (userId <= 0) return 0;

            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return 0;

            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    if (isSuperUser)
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM Community";
                    }
                    else
                    {
                        cmd.CommandText = "SELECT COUNT(*) FROM UserCommunity WHERE UserId = @userId";
                        cmd.Parameters.AddWithValue("@userId", userId);
                    }
                    return (int)cmd.ExecuteScalar();
                }
            }
        }

        /// <summary>
        /// Check if a DNN user is a superuser by username.
        /// </summary>
        public static bool IsSuperUser(string username)
        {
            if (string.IsNullOrEmpty(username)) return false;

            var connStr = GetConnectionString();
            if (string.IsNullOrEmpty(connStr)) return false;

            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT IsSuperUser FROM Users WHERE Username = @username";
                    cmd.Parameters.AddWithValue("@username", username);
                    var result = cmd.ExecuteScalar();
                    return result != null && (bool)result;
                }
            }
        }

        // ── High-level route helpers ──────────────────────────────────────

        /// <summary>
        /// Returns true when the slug corresponds to an existing community.
        /// </summary>
        public static bool IsValidCommunitySlug(string slug)
        {
            return !string.IsNullOrEmpty(GetCommunityNameBySlug(slug));
        }

        /// <summary>
        /// Determine the correct redirect URL for an authenticated user entering
        /// a community route.  Returns null when no redirect is needed.
        ///
        /// Rules:
        ///   - Multi-community user → dashboard
        ///   - Single-community user → /{slug}/home
        ///   - No communities → fallback home
        /// </summary>
        public static string ResolveUserRedirect(string username)
        {
            if (string.IsNullOrEmpty(username)) return null;

            var slugs = GetUserSlugsByUsername(username);
            if (slugs.Count == 0) return Constants.FallbackHomeUrl;
            if (slugs.Count > 1) return Constants.DashboardUrl;
            return "/" + slugs[0] + "/" + Constants.PageHome;
        }

        /// <summary>
        /// Check whether <paramref name="username"/> may access the community
        /// identified by <paramref name="slug"/>.  Superusers always pass.
        /// Returns null when access is allowed, or a redirect URL otherwise.
        /// </summary>
        public static string CheckCommunityAccess(string username, string slug)
        {
            if (string.IsNullOrEmpty(username)) return null; // anonymous — let DNN handle
            if (IsSuperUser(username)) return null; // superusers can go anywhere

            var userSlugs = GetUserSlugsByUsername(username);
            if (userSlugs.Exists(s => s.Equals(slug, StringComparison.OrdinalIgnoreCase)))
                return null; // member — allow

            // Not a member — redirect to own community or dashboard
            if (userSlugs.Count == 1)
                return "/" + userSlugs[0] + "/" + Constants.PageHome;
            if (userSlugs.Count > 1)
                return Constants.DashboardUrl;
            return Constants.FallbackHomeUrl;
        }
    }
}
