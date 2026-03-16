using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using DotNetNuke.Entities.Portals;
using DotNetNuke.Entities.Tabs;
using DotNetNuke.Entities.Users;
using DnnDev.Routing.Data;

namespace DnnDev.Routing.Models
{
    /// <summary>
    /// Per-request state computed once and shared across all skin partials.
    /// Stored in HttpContext.Items[Constants.ItemDzpContext].
    ///
    /// This eliminates duplicate URL parsing and database queries that were
    /// previously scattered across _header-dzp.ascx and _sidebar-dzp.ascx.
    /// </summary>
    public class DzpContext
    {
        // ── Portal / User ────────────────────────────────────────────────
        public PortalSettings Portal { get; private set; }
        public UserInfo User { get; private set; }
        public string UserDisplayName { get; private set; }
        public string UserEmail { get; private set; }
        public string ProfileImageUrl { get; private set; }

        // ── URL state ────────────────────────────────────────────────────
        public string CurrentPath { get; private set; }
        public string[] Segments { get; private set; }

        // ── Community state ──────────────────────────────────────────────
        public string CommunitySlug { get; private set; }
        public string CommunityName { get; private set; }
        public string UserRole { get; private set; }
        public bool IsOnCommunityPage { get; private set; }
        public bool IsOnDashboard { get; private set; }
        public bool IsOnSettings { get; private set; }
        public bool ShowDashboardLink { get; private set; }

        // ── Computed URLs ────────────────────────────────────────────────
        public string LogoUrl { get; private set; }
        public string SiteUrl { get; private set; }
        public string CommunityLink { get; private set; }

        // ── Route placeholders ───────────────────────────────────────────
        public Dictionary<string, string> Placeholders { get; private set; }

        // ── First-segment analysis ───────────────────────────────────────
        public bool FirstSegmentIsRealPage { get; private set; }
        public bool IsOnCommunityRoot { get; private set; }

        // ══════════════════════════════════════
        //  Factory — get or create per request
        // ══════════════════════════════════════

        /// <summary>
        /// Retrieve the DzpContext for the current request, creating it on first access.
        /// </summary>
        public static DzpContext Current
        {
            get
            {
                var items = HttpContext.Current.Items;
                var ctx = items[Constants.ItemDzpContext] as DzpContext;
                if (ctx == null)
                {
                    ctx = Build();
                    items[Constants.ItemDzpContext] = ctx;
                }
                return ctx;
            }
        }

        // ══════════════════════════════════════
        //  Builder
        // ══════════════════════════════════════

        private static DzpContext Build()
        {
            var ctx = new DzpContext();
            var ps = PortalSettings.Current;
            ctx.Portal = ps;

            // ── URL parsing ──────────────────────────────────────────
            var originalPath = HttpContext.Current.Items[Constants.ItemOriginalPath] as string;
            var rawUrl = HttpContext.Current.Request.RawUrl;
            var qsIdx = rawUrl.IndexOf('?');
            ctx.CurrentPath = originalPath ?? (qsIdx >= 0 ? rawUrl.Substring(0, qsIdx) : rawUrl);
            ctx.Segments = ctx.CurrentPath
                .TrimStart('/')
                .Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

            // ── User info ────────────────────────────────────────────
            var user = UserController.Instance.GetCurrentUserInfo();
            ctx.User = user;
            ctx.UserDisplayName = user.DisplayName;
            ctx.UserEmail = user.Email;
            ctx.ProfileImageUrl = "/DnnImageHandler.ashx?mode=profilepic&userId=" + user.UserID;

            // ── Clear last_community cookie on logout ────────────────
            if (user == null || user.UserID <= 0)
            {
                var stale = HttpContext.Current.Request.Cookies["last_community"];
                if (stale != null)
                {
                    HttpContext.Current.Response.Cookies.Set(new HttpCookie("last_community", "")
                    {
                        Path = "/",
                        HttpOnly = true,
                        Expires = DateTime.UtcNow.AddDays(-1)
                    });
                }
            }

            // ── First-segment detection ──────────────────────────────
            var allTabs = TabController.Instance.GetTabsByPortal(ps.PortalId).AsList();
            ctx.FirstSegmentIsRealPage = ctx.Segments.Length > 0
                && allTabs.Any(t =>
                    t.ParentId == -1 && !t.IsDeleted
                    && t.TabName.Equals(ctx.Segments[0], StringComparison.OrdinalIgnoreCase));

            // ── Page detection flags ─────────────────────────────────
            ctx.IsOnCommunityPage = ctx.Segments.Length > 0 && !ctx.FirstSegmentIsRealPage;
            ctx.IsOnDashboard = ctx.Segments.Length > 0
                && ctx.Segments[0].Equals("dashboard", StringComparison.OrdinalIgnoreCase);
            ctx.IsOnSettings = ctx.Segments.Length > 0
                && ctx.Segments[0].Equals("settings", StringComparison.OrdinalIgnoreCase);
            ctx.IsOnCommunityRoot = ctx.Segments.Length == 1 && ctx.IsOnCommunityPage;

            // ── Community slug & name ────────────────────────────────
            var communitySlug = ctx.Segments.Length > 0 ? ctx.Segments[0] : null;

            // Only treat it as a community slug if it actually exists in the DB
            var communityName = CommunityRepository.GetCommunityNameBySlug(communitySlug);
            if (string.IsNullOrEmpty(communityName))
                communitySlug = null;

            // Remember last visited community in a cookie
            if (!string.IsNullOrEmpty(communitySlug))
            {
                var cookie = new HttpCookie("last_community", communitySlug)
                {
                    Path = "/",
                    HttpOnly = true,
                    Expires = DateTime.UtcNow.AddDays(90)
                };
                HttpContext.Current.Response.Cookies.Set(cookie);
            }

            // Fallback: cookie → DB (for non-community pages like /administrator)
            if (string.IsNullOrEmpty(communitySlug) && user != null && user.UserID > 0)
            {
                var lastCookie = HttpContext.Current.Request.Cookies["last_community"];
                if (lastCookie != null && !string.IsNullOrEmpty(lastCookie.Value))
                {
                    communitySlug = lastCookie.Value;
                    communityName = CommunityRepository.GetCommunityNameBySlug(communitySlug);

                    // Invalid cookie — community no longer exists
                    if (string.IsNullOrEmpty(communityName))
                    {
                        communitySlug = null;
                        HttpContext.Current.Response.Cookies.Set(new HttpCookie("last_community", "")
                        {
                            Path = "/",
                            HttpOnly = true,
                            Expires = DateTime.UtcNow.AddDays(-1)
                        });
                    }
                }

                // If still unresolved, fall back to DB
                if (string.IsNullOrEmpty(communitySlug))
                {
                    var userSlugs = CommunityRepository.GetUserSlugsByUserId(user.UserID);
                    if (userSlugs.Count > 0)
                    {
                        communitySlug = userSlugs[userSlugs.Count - 1];
                        communityName = CommunityRepository.GetCommunityNameBySlug(communitySlug);
                    }
                }
            }

            ctx.CommunitySlug = communitySlug;
            ctx.CommunityName = communityName ?? "";

            // ── User role ────────────────────────────────────────────
            ctx.UserRole = ResolveUserRole(user);

            // ── Community link & site URL ────────────────────────────
            ResolveCommunityLinks(ctx);

            // ── Dashboard visibility ─────────────────────────────────
            if (user != null && user.UserID > 0)
            {
                ctx.ShowDashboardLink = CommunityRepository.GetUserCommunityCount(user.UserID, user.IsSuperUser) > 1;
            }

            // ── Logo URL ─────────────────────────────────────────────
            ctx.LogoUrl = ps.HomeDirectory + ps.LogoFile;

            // ── Placeholders (for sidebar nav) ───────────────────────
            ctx.Placeholders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            // Load route values from HttpContext.Items (set by RouteConfig)
            var routeKeys = HttpContext.Current.Items[Constants.ItemRouteKeys] as string[];
            if (routeKeys != null)
            {
                foreach (var key in routeKeys)
                {
                    var val = HttpContext.Current.Items[key] as string;
                    if (!string.IsNullOrEmpty(val))
                        ctx.Placeholders["{" + key + "}"] = val;
                }
            }

            // Ensure community-slug is in Placeholders for sidebar nav
            if (!string.IsNullOrEmpty(ctx.CommunitySlug)
                && !ctx.Placeholders.ContainsKey("{community-slug}"))
            {
                ctx.Placeholders["{community-slug}"] = ctx.CommunitySlug;
            }

            return ctx;
        }

        // ══════════════════════════════════════
        //  Helpers
        // ══════════════════════════════════════

        private static string ResolveUserRole(UserInfo user)
        {
            if (user.IsSuperUser) return "Superuser";

            var roles = user.Roles;
            if (roles != null)
            {
                foreach (var r in roles)
                {
                    if (!Constants.GenericDnnRoles.Contains(r))
                        return r;
                }
            }
            return Constants.DefaultRoleLabel;
        }

        private static void ResolveCommunityLinks(DzpContext ctx)
        {
            if (!string.IsNullOrEmpty(ctx.CommunitySlug))
            {
                ctx.CommunityLink = "/" + ctx.CommunitySlug + "/home";
                ctx.SiteUrl = ctx.CommunityLink;
            }
            else
            {
                ctx.CommunityLink = Constants.FallbackHomeUrl;
                ctx.SiteUrl = Constants.FallbackHomeUrl;
            }
        }
    }
}
