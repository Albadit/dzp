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
    /// DNN pages named with brackets (e.g. [community], [company]) are
    /// dynamic segments — Next.js convention. The module auto-detects them
    /// from the page tree; no explicit registration needed.
    ///
    /// HttpContext.Items after /keizerswaard/bond/ardit:
    ///   Items["community"] = "keizerswaard"
    ///   Items["company"]   = "bond"
    ///   Items["RouteKeys"] = string[] { "community", "company" }
    ///   Items["RouteActive"]  = true
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

        // ── Dynamic segment handling is driven by Constants.Segments.Registry ──
        // Each ISegment provides validation, template resolution,
        // and access checking. No per-segment dictionaries needed here.

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

            // Store original path before DNN's URL rewriter changes it.
            // Only write once — DNN may Server.Transfer to the 404 error page,
            // restarting the pipeline. We need the FIRST path to survive.
            if (app.Context.Items[Constants.ItemRawOriginalPath] == null)
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

                // ── Case 0: ProcessRoute detected a param name used as a URL value ──
                // e.g. /community/home where "community" is the [community] param name.
                // Redirect logged-in users to their actual slug, anonymous to fallback.
                var resolveParam = app.Context.Items["_ResolveParamName"] as string;
                if (resolveParam != null)
                {
                    var repo = Constants.Segments.Get(resolveParam);
                    if (repo != null)
                    {
                        string redirect;
                        if (!string.IsNullOrEmpty(username))
                            redirect = repo.ResolveTemplateRedirect(username) ?? Constants.FallbackHomeUrl;
                        else
                            redirect = Constants.FallbackHomeUrl;

                        Log(originalPath + " -> param name '" + resolveParam
                            + "' used as URL, redirecting to " + redirect
                            + " (user: " + (username ?? "anonymous") + ")");
                        app.Context.Response.Redirect(redirect, false);
                        app.Context.ApplicationInstance.CompleteRequest();
                        return;
                    }
                }

                if (string.IsNullOrEmpty(username))
                    return; // Anonymous — let DNN handle permissions

                // ── Case 1: URL contains a literal template name at any depth ──
                // e.g. /[community]/home or /keizerswaard/[company]/dashboard
                // Redirect the authenticated user to their actual slug value.
                for (int i = 0; i < segments.Length; i++)
                {
                    if (!Constants.IsDynamic(segments[i]))
                        continue;

                    var paramName = Constants.ParamName(segments[i]);
                    var repo = Constants.Segments.Get(paramName);
                    if (repo == null)
                        continue;

                    var redirect = repo.ResolveTemplateRedirect(username);
                    if (redirect == null)
                        continue;

                    Log(originalPath + " -> template [" + paramName
                        + "] at depth " + i + ", redirecting to " + redirect
                        + " for user '" + username + "'");
                    app.Context.Response.Redirect(redirect, false);
                    app.Context.ApplicationInstance.CompleteRequest();
                    return;
                }

                // ── Case 2: Check access for every matched dynamic segment ──
                // ProcessRoute (BeginRequest) already captured the route values.
                // Walk them all — works for [community] at root, [company] at
                // depth 2, or any other dynamic segment at any layer.
                var routeKeys = app.Context.Items[Constants.ItemRouteKeys] as string[];
                if (routeKeys != null)
                {
                    foreach (var key in routeKeys)
                    {
                        var repo = Constants.Segments.Get(key);
                        if (repo == null)
                            continue;

                        var slugValue = app.Context.Items[key] as string;
                        if (string.IsNullOrEmpty(slugValue))
                            continue;

                        var accessRedirect = repo.CheckAccess(username, slugValue);
                        if (accessRedirect == null)
                            continue; // allowed

                        Log(originalPath + " -> ACCESS DENIED for '" + username
                            + "' on [" + key + "]='" + slugValue
                            + "', redirecting to " + accessRedirect);
                        app.Context.Response.Redirect(accessRedirect, false);
                        app.Context.ApplicationInstance.CompleteRequest();
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("Community redirect EXCEPTION: " + ex);
            }
        }

        private static void Log(string msg)
        {
            #pragma warning disable CS0162
            if (!EnableLogging) return;
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

            Log(path + " -> BEGIN routing (" + segments.Length + " segment(s): "
                + string.Join("/", segments) + ")");

            // 1. Skip physical/virtual directories (auto-detected from disk)
            if (Constants.IsSystemPrefix(segments[0]))
            {
                Log(path + " -> skipped (physical directory '" + segments[0] + "')");
                return;
            }

            // 1b. Skip DNN control URLs (e.g. /page/ctl/Edit/mid/418)
            if (segments.Any(s => s.Equals("ctl", StringComparison.OrdinalIgnoreCase)))
            {
                Log(path + " -> skipped (ctl URL)");
                return;
            }

            // 2. Resolve portal
            int portalId = ResolvePortalId(request);
            if (portalId < 0)
                return;

            // 3. Get all tabs for the portal (DNN caches these internally)
            var allTabs = TabController.Instance.GetTabsByPortal(portalId).AsList();

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
                    && !Constants.IsDynamic(t.TabName)
                    && t.TabName.Equals(segments[0], StringComparison.OrdinalIgnoreCase));
                if (firstRootPage != null)
                {
                    Log(path + " -> first segment '" + segments[0]
                        + "' is a real page but remaining segments unresolved, rewriting to 404");
                    RewriteTo404(app, allTabs);
                    return;
                }
            }

            // 4c. Standalone pages: first segment matches a child of a dynamic root page.
            //     e.g. /dashboard exists under [community] in DNN, so rewrite
            //     /dashboard → /[community]/dashboard.
            //     Auto-detected from the page tree — no static config needed.
            var dynamicRoots = allTabs
                .Where(t => t.ParentId == -1 && !t.IsDeleted && Constants.IsDynamic(t.TabName))
                .ToList();
            foreach (var dynRoot in dynamicRoots)
            {
                var childMatch = allTabs.FirstOrDefault(t =>
                    t.ParentId == dynRoot.TabID && !t.IsDeleted
                    && t.TabName.Equals(segments[0], StringComparison.OrdinalIgnoreCase));
                if (childMatch == null)
                    continue;

                if (segments.Length == 1)
                {
                    Log(path + " -> standalone page '" + segments[0] + "' (TabId=" + childMatch.TabID + ")");
                    app.Context.Items[Constants.ItemRouteActive] = true;
                    app.Context.Items[Constants.ItemOriginalPath] = path;
                    app.Context.Items["_DeferredTabId"] = childMatch.TabID;
                    app.Context.RewritePath("/Default.aspx", "", "TabId=" + childMatch.TabID);
                    return;
                }

                // Extra segments after standalone page → 404
                Log(path + " -> standalone page '" + segments[0] + "' with extra segments, rewriting to 404");
                RewriteTo404(app, allTabs);
                return;
            }

            // 5. Slug routing: walk URL segments against the DNN page tree.
            //    At each level try:
            //      a) Literal child-page match (non-template pages)
            //      b) Template match: a child page in SlugTemplates whose values contain the segment
            //    If neither matches → fall through → DNN 404.
            var resolvedPath = "";
            var extraPathInfo = ""; // friendly-URL params beyond the last matched tab
            var routeValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            int currentParent = -1; // root (top-level tabs have ParentId == -1)
            bool firstSegmentMatched = false;

            for (int segIndex = 0; segIndex < segments.Length; segIndex++)
            {
                var segment = segments[segIndex];
                var children = allTabs
                    .Where(t => t.ParentId == currentParent && !t.IsDeleted)
                    .ToList();

                // a) Literal match — non-dynamic child page
                var literalMatch = children.FirstOrDefault(t =>
                    t.TabName.Equals(segment, StringComparison.OrdinalIgnoreCase)
                    && !Constants.IsDynamic(t.TabName));

                if (literalMatch != null)
                {
                    resolvedPath += "/" + literalMatch.TabName;
                    currentParent = literalMatch.TabID;
                    Log(path + " seg[" + segIndex + "] '" + segment + "' -> literal page");
                    continue;
                }

                // b) Dynamic match — accept ANY value for the first [param] child found
                var dynamicChild = children.FirstOrDefault(t => Constants.IsDynamic(t.TabName));
                if (dynamicChild != null)
                {
                    var dynParamName = Constants.ParamName(dynamicChild.TabName);

                    // If the URL value equals the param name itself (e.g. "community"
                    // for [community]), the user typed the template name as a URL.
                    // Flag it for PostAuth — we can't redirect here because we don't
                    // have auth info yet.
                    if (segment.Equals(dynParamName, StringComparison.OrdinalIgnoreCase))
                    {
                        app.Context.Items["_ResolveParamName"] = dynParamName;
                        Log(path + " seg[" + segIndex + "] '" + segment
                            + "' equals param name '" + dynParamName
                            + "', deferring to PostAuth");
                        return;
                    }

                    // For the FIRST segment, validate immediately.
                    // If the slug doesn't exist in the DB, this URL isn't a
                    // slug route at all (e.g. /dashboard, /something-random).
                    // Return and let DNN handle it (404 or whatever it does).
                    if (segIndex == 0)
                    {
                        var repo = Constants.Segments.Get(dynParamName);
                        if (repo != null && !repo.IsValidSlug(segment))
                        {
                            Log(path + " seg[0] '" + segment
                                + "' is not a valid " + dynParamName
                                + " slug, not a route — letting DNN handle it");
                            return;
                        }
                    }

                    resolvedPath += "/" + dynamicChild.TabName;
                    routeValues[dynParamName] = segment;
                    currentParent = dynamicChild.TabID;
                    if (segIndex == 0) firstSegmentMatched = true;
                    Log(path + " seg[" + segIndex + "] '" + segment
                        + "' -> dynamic '" + dynamicChild.TabName + "'");
                    continue;
                }

                // c) No match — if we already matched a dynamic segment, treat the
                //    remaining segments as DNN friendly-URL parameters
                //    (e.g. /author/Daniel%20Metter after /[community]/timeline).
                if (firstSegmentMatched)
                {
                    for (int r = segIndex; r < segments.Length; r++)
                    {
                        resolvedPath += "/" + segments[r];
                        extraPathInfo += "/" + segments[r];
                    }
                    Log(path + " seg[" + segIndex + "] '" + segment
                        + "' -> no child page, appending remaining as friendly-URL params");
                    break;
                }

                // No dynamic segment matched yet → not a slug URL
                Log(path + " seg[" + segIndex + "] '" + segment + "' -> no match, returning");
                return;
            }

            // The first segment MUST match a dynamic segment (otherwise it's not a slug URL)
            if (!firstSegmentMatched)
                return;

            // 5b. Validate captured slug values against the database.
            //     Each dynamic segment can have a registered validator in SlugValidators.
            //     If validation fails, redirect to the previous page or fallback.
            foreach (var kvp in routeValues)
            {
                var repo = Constants.Segments.Get(kvp.Key);
                if (repo == null)
                    continue; // No repository registered — accept any value

                if (!repo.IsValidSlug(kvp.Value))
                {
                    Log(path + " -> " + kvp.Key + " value '" + kvp.Value + "' not found in DB, redirecting back");
                    var referer = request.Headers["Referer"];
                    var fallback = string.IsNullOrEmpty(referer) ? Constants.FallbackHomeUrl : referer;
                    app.Context.Response.Redirect(fallback, false);
                    app.Context.ApplicationInstance.CompleteRequest();
                    return;
                }
            }

            // 6. Store all route values in HttpContext.Items keyed by param name
            foreach (var kvp in routeValues)
                app.Context.Items[kvp.Key] = kvp.Value;

            // Store the list of matched param keys so Razor can discover them
            app.Context.Items[Constants.ItemRouteKeys] = routeValues.Keys.ToArray();
            app.Context.Items[Constants.ItemRouteActive] = true;

            Log(path + " -> REWRITE /Default.aspx?TabId=" + currentParent
                + " (" + resolvedPath + ") values=["
                + string.Join(", ", routeValues.Select(kv => kv.Key + "=" + kv.Value))
                + "]");

            // Store the original path so skin partials can read the real URL
            app.Context.Items[Constants.ItemOriginalPath] = path;

            // Rewrite to DNN's internal format. DNN's UrlRewrite (next in the
            // pipeline) will resolve this and may 301-redirect because the
            // canonical friendly URL doesn't match the browser's URL.
            // RouteConfigFix (registered after UrlRewrite) intercepts the 301.
            app.Context.Items["_DeferredTabId"] = currentParent;
            app.Context.Items["_DeferredExtraPath"] = extraPathInfo;
            app.Context.RewritePath("/Default.aspx", extraPathInfo, "TabId=" + currentParent);
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

        /// <summary>Rewrite to the site's 404 error page (if one exists).</summary>
        private static void RewriteTo404(HttpApplication app, IList<TabInfo> allTabs)
        {
            var errorPage = allTabs.FirstOrDefault(t =>
                !t.IsDeleted && t.TabName.Equals(Constants.Page404, StringComparison.OrdinalIgnoreCase));
            if (errorPage != null)
            {
                app.Context.Items[Constants.ItemRouteActive] = true;
                app.Context.RewritePath("/" + errorPage.TabName);
                app.Context.Response.StatusCode = 404;
            }
        }

        public void Dispose() { }
    }
}