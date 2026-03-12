using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using DotNetNuke.Entities.Portals;
using DotNetNuke.Entities.Tabs;

namespace DnnDev.Routing
{
    /// <summary>
    /// HTTP Module that handles recursive slug-based routing for DNN.
    ///
    /// Template pages are DNN pages listed in <see cref="TemplatePages"/>.
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

        // ── Template page names ───────────────────────────────────────────
        // Any DNN page whose name is in this set acts as a template:
        // the URL segment is captured as a route value instead of being
        // matched literally. Add/remove names here and rebuild.
        private static readonly HashSet<string> TemplatePages =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "community-slug",
                "company-slug",
            };

        // ── Cache (reset on app-pool recycle) ──────────────────────────
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<int, IList<TabInfo>>
            AllTabsCache = new System.Collections.Concurrent.ConcurrentDictionary<int, IList<TabInfo>>();

        public void Init(HttpApplication context)
        {
            context.BeginRequest += OnBeginRequest;
        }

        private void OnBeginRequest(object sender, EventArgs e)
        {
            var app = (HttpApplication)sender;
            var request = app.Context.Request;
            var path = request.Url.AbsolutePath;

            try
            {
                ProcessRoute(app, request, path);
            }
            catch (Exception ex)
            {
                Log("EXCEPTION for " + path + ": " + ex);
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

            // 1. Skip reserved DNN system prefixes
            if (IsReservedPrefix(segments[0]))
                return;

            // 2. Resolve portal
            int portalId = ResolvePortalId(request);
            if (portalId < 0)
                return;

            // 3. Get all tabs for the portal
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
                    && !TemplatePages.Contains(t.TabName)
                    && t.TabName.Equals(segments[0], StringComparison.OrdinalIgnoreCase));
                if (firstRootPage != null)
                {
                    Log(path + " -> first segment '" + segments[0]
                        + "' is a real page but remaining segments unresolved, rewriting to 404");
                    var errorPage = allTabs.FirstOrDefault(t =>
                        !t.IsDeleted && t.TabName.Equals("404 Error Page", StringComparison.OrdinalIgnoreCase));
                    if (errorPage != null)
                    {
                        app.Context.Items["RouteActive"] = true;
                        app.Context.RewritePath("/" + errorPage.TabName);
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
                    && !TemplatePages.Contains(t.TabName));

                if (literalMatch != null)
                {
                    resolvedPath += "/" + literalMatch.TabName;
                    currentParent = literalMatch.TabID;
                    Log(path + " seg[" + segIndex + "] '" + segment + "' -> literal page");
                    continue;
                }

                // b) Template match — accept ANY value for the first template child found
                var templateChild = children.FirstOrDefault(t => TemplatePages.Contains(t.TabName));
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

                // c) No match for this segment → fall through → DNN 404
                Log(path + " seg[" + segIndex + "] '" + segment + "' -> no match, returning");
                return;
            }

            // The first segment MUST match a template (otherwise it's not a slug URL)
            if (!firstSegmentMatched)
                return;

            // 6. Store all route values in HttpContext.Items keyed by template name
            foreach (var kvp in routeValues)
                app.Context.Items[kvp.Key] = kvp.Value;

            // Store the list of matched template keys so Razor can discover them
            app.Context.Items["RouteKeys"] = routeValues.Keys.ToArray();
            app.Context.Items["RouteActive"] = true;

            // Backward-compat: RouteSlug / RouteTemplate = first template matched
            if (routeValues.Count > 0)
            {
                var first = routeValues.First();
                app.Context.Items["RouteSlug"] = first.Value;
                app.Context.Items["RouteTemplate"] = first.Key;
            }

            Log(path + " -> REWRITE " + resolvedPath + " values=["
                + string.Join(", ", routeValues.Select(kv => kv.Key + "=" + kv.Value))
                + "]");

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

        /// <summary>
        /// Skip slugs that match DNN system paths to avoid hijacking real folders.
        /// </summary>
        private static bool IsReservedPrefix(string slug)
        {
            var reserved = new[]
            {
                "admin", "host", "portals", "desktopmodules", "providers",
                "resources", "install", "api", "icons", "images", "js",
                "controls", "bin", "app_data", "config", "login", "register",
                "logoff", "default", "error", "keepalive"
            };

            foreach (var r in reserved)
            {
                if (slug.Equals(r, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        public void Dispose() { }
    }
}