using System;
using System.Collections.Generic;
using DnnDev.Routing.Data;

namespace DnnDev.Routing
{
    /// <summary>
    /// Shared immutable values used across routing, data access, and skin partials.
    /// </summary>
    public static class Constants
    {
        // ── HttpContext.Items keys ────────────────────────────────────────
        public const string ItemOriginalPath = "RouteOriginalPath";
        public const string ItemRouteKeys = "RouteKeys";
        public const string ItemRouteActive = "RouteActive";
        public const string ItemDzpContext = "DzpContext";

        /// <summary>Internal key used by RouteConfig to save the raw path before DNN rewrites.</summary>
        internal const string ItemRawOriginalPath = "_OriginalPath";

        // ── Dynamic segments (Next.js convention) ────────────────────────
        // DNN pages named [param] are dynamic route segments.
        // No explicit registration needed — brackets are self-identifying.

        /// <summary>True if the page name is a dynamic segment, e.g. "[community]".</summary>
        public static bool IsDynamic(string pageName) =>
            pageName != null && pageName.Length > 2
            && pageName[0] == '[' && pageName[pageName.Length - 1] == ']';

        /// <summary>Extracts the param name: "[community]" → "community".</summary>
        public static string ParamName(string pageName) =>
            pageName.Substring(1, pageName.Length - 2);

        // ── System URL prefix detection ────────────────────────────────
        // Auto-detects physical directories in the web root at runtime.
        // No manual list needed — survives DNN updates and new folders.
        // DNN system URLs (/login, /register, etc.) don't need to be listed
        // here because they either live in a physical directory (admin/) or
        // fail IsValidSlug and fall through to DNN's own URL handling.
        public static bool IsSystemPrefix(string segment)
        {
            var dir = System.IO.Path.Combine(
                System.Web.HttpRuntime.AppDomainAppPath, segment);
            return System.IO.Directory.Exists(dir);
        }

        // ── DNN roles to ignore when resolving a user's display role ─────
        public static readonly HashSet<string> GenericDnnRoles =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Registered Users", "Subscribers", "All Users", "Unverified Users"
            };

        // ── Well-known dynamic segment names ──────────────────────────────
        // Each constant maps to a DNN page named [param].
        // Add new entries here when new dynamic pages are created.
        // The Repository property links the segment to its ISegment.
        public static class Segments
        {
            public const string Community = "community";
            // public const string Company = "company";

            /// <summary>
            /// Registry of all dynamic segments and their repositories.
            /// Keyed by param name (case-insensitive). RouteConfig iterates this
            /// for validation, template resolution, and access checking at any page depth.
            ///
            /// To add a new segment:
            ///   1. Add a const above (e.g. Company = "company")
            ///   2. Create a class implementing ISegment
            ///   3. Add an entry here: [Company] = CompanyRepository.Instance
            /// </summary>
            public static readonly Dictionary<string, ISegment> Registry =
                new Dictionary<string, ISegment>(StringComparer.OrdinalIgnoreCase)
                {
                    [Community] = Data.Community.Instance,
                    // [Company] = Data.Company.Instance,
                };

            /// <summary>Look up the repository for a param name. Returns null if unregistered.</summary>
            public static ISegment Get(string paramName)
            {
                ISegment repo;
                return Registry.TryGetValue(paramName, out repo) ? repo : null;
            }
        }

        // ── Well-known page names ──────────────────────────────────────────
        public const string PageHome         = "home";
        public const string PageDashboard    = "dashboard";
        public const string PageSettings     = "settings";
        public const string Page404          = "404 Error Page";

        // ── Defaults ─────────────────────────────────────────────────────
        public const string DefaultRoleLabel = "Lid";
        public const string FallbackHomeUrl  = "/" + PageHome;
        public const string DashboardUrl     = "/" + PageDashboard;
        public const string ConnectionStringName = "SiteSqlServer";
    }
}
