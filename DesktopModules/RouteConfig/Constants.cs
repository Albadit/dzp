using System;
using System.Collections.Generic;

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
        public const string ItemRouteSlug = "RouteSlug";
        public const string ItemRouteTemplate = "RouteTemplate";
        public const string ItemDzpContext = "DzpContext";

        /// <summary>Internal key used by RouteConfig to save the raw path before DNN rewrites.</summary>
        internal const string ItemRawOriginalPath = "_OriginalPath";

        // ── Template page names ──────────────────────────────────────────
        // DNN pages whose name is in this set act as slug templates.
        public static readonly HashSet<string> TemplatePages =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "community-slug",
                "company-slug",
            };

        // ── Reserved URL prefixes ────────────────────────────────────────
        // First URL segments that must never be treated as community slugs.
        public static readonly HashSet<string> ReservedPrefixes =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "admin", "host", "portals", "desktopmodules", "providers",
                "resources", "install", "api", "icons", "images", "js",
                "controls", "bin", "app_data", "config", "login", "register",
                "logoff", "default", "error", "keepalive"
            };

        // ── DNN roles to ignore when resolving a user's display role ─────
        public static readonly HashSet<string> GenericDnnRoles =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Registered Users", "Subscribers", "All Users", "Unverified Users"
            };

        // ── Defaults ─────────────────────────────────────────────────────
        public const string DefaultRoleLabel = "Lid";
        public const string FallbackHomeUrl = "/home";
        public const string DashboardUrl = "/dashboard";
        public const string ConnectionStringName = "SiteSqlServer";
    }
}
