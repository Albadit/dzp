using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using DotNetNuke.Entities.Portals;
using DotNetNuke.Entities.Tabs;
using DnnDev.Routing.Data;

namespace DnnDev.Routing
{
    /// <summary>
    /// HTTP Module that handles recursive slug-based routing for DNN.
    ///
    /// Template pages are DNN pages listed in <see cref="Constants.TemplatePages"/>.
    /// Any URL segment at a template position is accepted as a slug value.
    /// The module walks the DNN page tree recursively, matching segments to
    /// either literal child pages or template pages (which capture the value).
    ///
    /// HttpContext.Items after /keizerswaard/bond/ardit:
    ///   Items["community-slug"] = "keizerswaard"
    ///   Items["company-slug"]   = "bond"
    ///   Items["user-id"]        = "ardit"
    ///   Items["RouteKeys"]      = string[] { "community-slug", "company-slug", "user-id" }
    ///   Items["RouteActive"]    = true
    ///
    /// Build:   dotnet build debug.csproj
    /// Result:  bin\DnnDev.Debug.dll
    /// </summary>
    public class RouteConfig : IHttpModule
    {
        /// <summary>
        /// Set to true to write detailed routing info to App_Data\RouteConfig.log.
        /// </summary>
        private const bool EnableLogging = false;

        // ── Slug validators per template page ──────────────────────────
        // Maps template page name → function that returns true if the slug exists.
        // Templates without an entry are accepted without validation.
        private static readonly Dictionary<string, Func<string, bool>> SlugValidators =
            new Dictionary<string, Func<string, bool>>(StringComparer.OrdinalIgnoreCase)
            {
                ["community-slug"] = slug =>
                    CommunityRepository.GetAllSlugs()
                        .Any(s => s.Equals(slug, StringComparison.OrdinalIgnoreCase)),
            };

        // ── Cache (refreshes every 30 seconds) ──────────────────────────
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, IList<TabInfo>>
            AllTabsCache = new System.Collections.Concurrent.ConcurrentDictionary<int, IList<TabInfo>>();
        private static DateTime _tabsCacheExpiry = DateTime.MinValue;
        private static readonly object _tabsCacheLock = new object();

        public void Init(HttpApplication context)
        {
            context.BeginRequest += OnBeginRequest;
            context.PostAuthenticateRequest += OnPostAuthenticateRequest;
        }

        private void OnBeginRequest(object sender, EventArgs e)
        {
            var app = (HttpApplication)sender;
            var request = app.Context.Request;
            var path = request.Url.AbsolutePath;

            // Store original path before DNN's URL rewriter changes it
            app.Context.Items[Constants.ItemRawOriginalPath] = path;

            try
            {
                ProcessRoute(app, request, path);
            }
            catch (Exception ex)
            {
                Log("EXCEPTION for " + path + ": " + ex);
            }
        }

        /// <summary>
        /// After authentication, if any URL segment is literally a template page name
        /// (e.g. "community-slug"), replace it with the authenticated user's actual
        /// community slug and redirect.
        /// </summary>
        private void OnPostAuthenticateRequest(object sender, EventArgs e)
        {
            var app = (HttpApplication)sender;
            var request = app.Context.Request;

            // Use the original path we stored at BeginRequest (before DNN rewrote it)
            var originalPath = app.Context.Items[Constants.ItemRawOriginalPath] as string;
            if (string.IsNullOrEmpty(originalPath) || originalPath.Contains("."))
                return;

            var trimmed = originalPath.Trim('/');
            if (string.IsNullOrEmpty(trimmed))
                return;

            var segments = trimmed.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0)
                return;

            try
            {
                var username = app.Context.User?.Identity?.Name;
                if (string.IsNullOrEmpty(username))
                    return; // Anonymous — let DNN handle permissions

                // ── Case 1: URL starts with literal template name "community-slug" ──
                // Redirect to the user's actual community or dashboard
                if (segments[0].Equals("community-slug", StringComparison.OrdinalIgnoreCase))
                {
                    var communitySlugs = CommunityRepository.GetUserSlugsByUsername(username);
                    if (communitySlugs.Count == 0)
                        return;

                    string newPath;
                    if (communitySlugs.Count == 1)
                    {
                        segments[0] = communitySlugs[0];
                        newPath = "/" + string.Join("/", segments) + "/home";
                    }
                    else
                    {
                        newPath = "/dashboard";
                    }

                    Log(originalPath + " -> community redirect to " + newPath + " for user '" + username + "'");
                    app.Context.Response.Redirect(newPath, false);
                    app.Context.ApplicationInstance.CompleteRequest();
                    return;
                }

                // ── Case 2: URL starts with a community slug — verify membership ──
                var allSlugs = CommunityRepository.GetAllSlugs();
                if (allSlugs.Count == 0 || !allSlugs.Any(s =>
                    s.Equals(segments[0], StringComparison.OrdinalIgnoreCase)))
                    return; // Not a community URL — let DNN handle it

                // Superusers can access any community
                if (CommunityRepository.IsSuperUser(username))
                    return;

                // Check if user belongs to this community
                var userSlugs = CommunityRepository.GetUserSlugsByUsername(username);
                if (userSlugs.Any(s =>
                    s.Equals(segments[0], StringComparison.OrdinalIgnoreCase)))
                    return; // User belongs — allow

                // User does NOT belong to this community — redirect to their own
                string redirectPath;
                if (userSlugs.Count == 1)
                    redirectPath = "/" + userSlugs[0] + "/home";
                else if (userSlugs.Count > 1)
                    redirectPath = Constants.DashboardUrl;
                else
                    redirectPath = "/";

                Log(originalPath + " -> ACCESS DENIED for '" + username
                    + "', not a member of '" + segments[0] + "', redirecting to " + redirectPath);
                app.Context.Response.Redirect(redirectPath, false);
                app.Context.ApplicationInstance.CompleteRequest();
            }
            catch (Exception ex)
            {
                Log("Community redirect EXCEPTION: " + ex);
            }
        }

        private static void Log(string msg)
        {
            if (!EnableLogging) return;
            #pragma warning disable CS0162
            try
            {
                var logFile = System.IO.Path.Combine(
                    HttpRuntime.AppDomainAppPath, "App_Data", "RouteConfig.log");
                System.IO.File.AppendAllText(logFile,
                    DateTime.Now.ToString("HH:mm:ss.fff") + " " + msg + Environment.NewLine);
            }
            catch { }
            #pragma warning restore CS0162
        }

        private void ProcessRoute(HttpApplication app, HttpRequest request, string path)
        {
            // Skip static files and root
            if (path.Contains("."))
                return;
            var trimmed = path.Trim('/');
            if (string.IsNullOrEmpty(trimmed))
                return;

            var segments = trimmed.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length == 0)
                return;

            // 1. Skip physical/virtual system directories (no DNN tab for these)
            if (Constants.SystemPrefixes.Contains(segments[0]))
                return;

            // 1b. Skip DNN control URLs (e.g. /page/ctl/Edit/mid/418)
            if (segments.Any(s => s.Equals("ctl", StringComparison.OrdinalIgnoreCase)))
                return;

            // 2. Resolve portal
            int portalId = ResolvePortalId(request);
            if (portalId < 0)
                return;

            // 3. Get all tabs for the portal (cache refreshes every 30s)
            if (DateTime.UtcNow > _tabsCacheExpiry)
            {
                lock (_tabsCacheLock)
                {
                    if (DateTime.UtcNow > _tabsCacheExpiry)
                    {
                        AllTabsCache.Clear();
                        _tabsCacheExpiry = DateTime.UtcNow.AddSeconds(30);
                    }
                }
            }
            var allTabs = AllTabsCache.GetOrAdd(portalId, pid =>
                TabController.Instance.GetTabsByPortal(pid).AsList());

            // 4. Try to resolve the ENTIRE URL as real DNN pages first.
            //    Walk segments against the page tree; if every segment matches
            //    an actual page, return immediately and let DNN handle it.
            //    This ensures pages like /settings/profile are never mistaken
            //    for slug values.
            {
                int walkParent = -1;
                bool allLiteral = true;
                for (int i = 0; i < segments.Length; i++)
                {
                    var pageMatch = allTabs.FirstOrDefault(t =>
                        t.ParentId == walkParent && !t.IsDeleted
                        && t.TabName.Equals(segments[i], StringComparison.OrdinalIgnoreCase));
                    if (pageMatch != null)
                    {
                        walkParent = pageMatch.TabID;
                    }
                    else
                    {
                        allLiteral = false;
                        break;
                    }
                }
                if (allLiteral)
                {
                    Log(path + " -> all segments match real DNN pages, skipping");
                    return;
                }

                // 4b. The first segment matches a real (non-template) root page,
                //     but later segments didn't resolve. This means the URL is
                //     something like /settings/home where "settings" exists but
                //     "home" is not a child of "settings".
                //     DNN would silently show the parent page — force a 404 instead.
                var firstRootPage = allTabs.FirstOrDefault(t =>
                    t.ParentId == -1 && !t.IsDeleted
                    && !Constants.TemplatePages.ContainsKey(t.TabName)
                    && t.TabName.Equals(segments[0], StringComparison.OrdinalIgnoreCase));
                if (firstRootPage != null)
                {
                    Log(path + " -> first segment '" + segments[0]
                        + "' is a real page but remaining segments unresolved, rewriting to 404");
                    var errorPage = allTabs.FirstOrDefault(t =>
                        !t.IsDeleted && t.TabName.Equals("404 Error Page", StringComparison.OrdinalIgnoreCase));
                    if (errorPage != null)
                    {
                        app.Context.Items[Constants.ItemRouteActive] = true;
                        app.Context.RewritePath("/" + errorPage.TabName);
                        app.Context.Response.StatusCode = 404;
                    }
                    return;
                }
            }

            // 4c. Standalone template pages (e.g. /dashboard).
            //     These are single-segment-only routes defined in TemplatePages values.
            //     If the first segment matches a standalone page, allow only exact match;
            //     extra segments after it → 404.
            //     Since standalone pages are children of a template page in the DNN tree,
            //     we must rewrite the URL to the template parent path.
            foreach (var kvp in Constants.TemplatePages)
            {
                foreach (var standalone in kvp.Value)
                {
                    if (!segments[0].Equals(standalone, StringComparison.OrdinalIgnoreCase))
                        continue;

                    if (segments.Length == 1)
                    {
                        // Rewrite /dashboard → /community-slug/dashboard so DNN finds the page
                        var rewritten = "/" + kvp.Key + "/" + standalone;
                        Log(path + " -> standalone page '" + standalone + "', rewriting to " + rewritten);
                        app.Context.Items[Constants.ItemRouteActive] = true;
                        app.Context.Items[Constants.ItemOriginalPath] = path;
                        app.Context.RewritePath(rewritten);
                        return;
                    }

                    // Extra segments after standalone page → 404
                    Log(path + " -> standalone page '" + standalone + "' with extra segments, rewriting to 404");
                    var err404 = allTabs.FirstOrDefault(t =>
                        !t.IsDeleted && t.TabName.Equals("404 Error Page", StringComparison.OrdinalIgnoreCase));
                    if (err404 != null)
                    {
                        app.Context.Items[Constants.ItemRouteActive] = true;
                        app.Context.RewritePath("/" + err404.TabName);
                        app.Context.Response.StatusCode = 404;
                    }
                    return;
                }
            }

            // 5. Slug routing: walk URL segments against the DNN page tree.
            //    At each level try:
            //      a) Literal child-page match (non-template pages)
            //      b) Template match: a child page in SlugTemplates whose values contain the segment
            //    If neither matches → fall through → DNN 404.
            var resolvedPath = "";
            var routeValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            int currentParent = -1; // root (top-level tabs have ParentId == -1)
            bool firstSegmentMatched = false;

            for (int segIndex = 0; segIndex < segments.Length; segIndex++)
            {
                var segment = segments[segIndex];
                var children = allTabs
                    .Where(t => t.ParentId == currentParent && !t.IsDeleted)
                    .ToList();

                // a) Literal match — non-template child page
                var literalMatch = children.FirstOrDefault(t =>
                    t.TabName.Equals(segment, StringComparison.OrdinalIgnoreCase)
                    && !Constants.TemplatePages.ContainsKey(t.TabName));

                if (literalMatch != null)
                {
                    resolvedPath += "/" + literalMatch.TabName;
                    currentParent = literalMatch.TabID;
                    Log(path + " seg[" + segIndex + "] '" + segment + "' -> literal page");
                    continue;
                }

                // b) Template match — accept ANY value for the first template child found
                var templateChild = children.FirstOrDefault(t => Constants.TemplatePages.ContainsKey(t.TabName));
                if (templateChild != null)
                {
                    resolvedPath += "/" + templateChild.TabName;
                    routeValues[templateChild.TabName] = segment;
                    currentParent = templateChild.TabID;
                    if (segIndex == 0) firstSegmentMatched = true;
                    Log(path + " seg[" + segIndex + "] '" + segment
                        + "' -> template '" + templateChild.TabName + "'");
                    continue;
                }

                // c) No match — if we already matched a template, treat the
                //    remaining segments as DNN friendly-URL parameters
                //    (e.g. /author/Daniel%20Metter after /community-slug/timeline).
                if (firstSegmentMatched)
                {
                    for (int r = segIndex; r < segments.Length; r++)
                        resolvedPath += "/" + segments[r];
                    Log(path + " seg[" + segIndex + "] '" + segment
                        + "' -> no child page, appending remaining as friendly-URL params");
                    break;
                }

                // No template matched yet → not a slug URL
                Log(path + " seg[" + segIndex + "] '" + segment + "' -> no match, returning");
                return;
            }

            // The first segment MUST match a template (otherwise it's not a slug URL)
            if (!firstSegmentMatched)
                return;

            // 5b. Validate captured slug values against the database.
            //     Each template page can have a registered validator in SlugValidators.
            //     If validation fails, redirect to the previous page or fallback.
            foreach (var kvp in routeValues)
            {
                Func<string, bool> validator;
                if (!SlugValidators.TryGetValue(kvp.Key, out validator))
                    continue; // No validator registered — accept any value

                if (!validator(kvp.Value))
                {
                    Log(path + " -> " + kvp.Key + " value '" + kvp.Value + "' not found in DB, redirecting back");
                    var referer = request.Headers["Referer"];
                    var fallback = string.IsNullOrEmpty(referer) ? Constants.FallbackHomeUrl : referer;
                    app.Context.Response.Redirect(fallback, false);
                    app.Context.ApplicationInstance.CompleteRequest();
                    return;
                }
            }

            // 6. Store all route values in HttpContext.Items keyed by template name
            foreach (var kvp in routeValues)
                app.Context.Items[kvp.Key] = kvp.Value;

            // Store the list of matched template keys so Razor can discover them
            app.Context.Items[Constants.ItemRouteKeys] = routeValues.Keys.ToArray();
            app.Context.Items[Constants.ItemRouteActive] = true;

            // Backward-compat: RouteSlug / RouteTemplate = first template matched
            if (routeValues.Count > 0)
            {
                var first = routeValues.First();
                app.Context.Items[Constants.ItemRouteSlug] = first.Value;
                app.Context.Items[Constants.ItemRouteTemplate] = first.Key;
            }

            Log(path + " -> REWRITE " + resolvedPath + " values=["
                + string.Join(", ", routeValues.Select(kv => kv.Key + "=" + kv.Value))
                + "]");

            // Store the original path so skin partials can read the real URL
            app.Context.Items[Constants.ItemOriginalPath] = path;

            app.Context.RewritePath(resolvedPath);
        }

        /// <summary>
        /// Resolve the DNN portal ID from the request's host header.
        /// Falls back to portal 0 (default portal) when no alias matches.
        /// </summary>
        private static int ResolvePortalId(HttpRequest request)
        {
            var host = request.Url.Host;

            #pragma warning disable CS0618 // Instance deprecated in 9.7.2, replacement requires DI (not available in IHttpModule)
            var aliases = PortalAliasController.Instance.GetPortalAliases();
            #pragma warning restore CS0618
            if (aliases == null)
                return 0;

            foreach (var key in aliases.Keys)
            {
                var alias = aliases[key.ToString()];
                if (alias != null)
                {
                    #pragma warning disable CS0618 // HTTPAlias/PortalID deprecated in 9.7.2
                    var aliasHost = alias.HTTPAlias.Split('/')[0];
                    if (aliasHost.Equals(host, StringComparison.OrdinalIgnoreCase))
                        return alias.PortalID;
                    #pragma warning restore CS0618
                }
            }

            return 0; // fallback to default portal
        }

        public void Dispose() { }
    }
}