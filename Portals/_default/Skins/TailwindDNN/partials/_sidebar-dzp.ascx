<%@ Import Namespace="System.Collections.Generic" %>
<%@ Import Namespace="System.Linq" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Web" %>
<%@ Import Namespace="DotNetNuke.Entities.Portals" %>
<%@ Import Namespace="DotNetNuke.Entities.Tabs" %>
<%@ Import Namespace="DotNetNuke.Entities.Users" %>
<%@ Import Namespace="DotNetNuke.Security.Permissions" %>

<script runat="server">

    // ══════════════════════════════════════
    //  Data classes
    // ══════════════════════════════════════

    class SidebarSection {
        public string Title;
        public SidebarLink[] Items;
        public SidebarSection(string title, params SidebarLink[] items) { Title = title; Items = items; }
    }

    class SidebarLink {
        public string Href, Icon;
        public SidebarLink[] Children;
        public SidebarLink(string href, string icon, params SidebarLink[] children) {
            Href = href; Icon = icon; Children = children ?? new SidebarLink[0];
        }
    }

    class SbNavGroup {
        public string Title;
        public List<SbNavItem> Items;
    }

    class SbNavItem {
        public string Label, Icon, Url;
        public bool IsActive, IsExpanded;
        public List<SbNavItem> Items;
        public bool HasChildren { get { return Items != null && Items.Count > 0; } }
    }

    // ══════════════════════════════════════
    //  Shorthand + config
    // ══════════════════════════════════════

    static SidebarLink N(string href, string icon, params SidebarLink[] children)
        { return new SidebarLink(href, icon, children); }

    static SidebarLink N(string href, params SidebarLink[] children)
        { return new SidebarLink(href, "", children); }

    // ══════════════════════════════════════
    //  Permission check
    // ══════════════════════════════════════

    static bool CanUserViewTab(DotNetNuke.Entities.Tabs.TabInfo tab, UserInfo user) {
        if (user != null && user.IsSuperUser) return true;
        var userId = user != null ? user.UserID : -1;
        #pragma warning disable CS0618
        var userPerms = tab.TabPermissions.Cast<TabPermissionInfo>().Where(p => p.UserID == userId).ToList();
        #pragma warning restore CS0618
        if (userPerms.Any()) {
            var viewPerms = userPerms.Where(p => p.PermissionKey == "VIEW").ToList();
            return viewPerms.Any() && viewPerms.All(p => p.AllowAccess);
        }
        return TabPermissionController.CanViewPage(tab);
    }

    // ══════════════════════════════════════
    //  Extract placeholders from URL
    // ══════════════════════════════════════

    // Dynamically matches ALL {placeholder} tokens found in NavSections href
    // templates against the current URL by aligning path segments.
    // No hardcoded markers — just add {my-thing} in any href and it works.

    static void CollectHrefs(SidebarLink[] links, List<string> hrefs) {
        foreach (var link in links) {
            hrefs.Add(link.Href);
            if (link.Children != null && link.Children.Length > 0)
                CollectHrefs(link.Children, hrefs);
        }
    }

    static Dictionary<string, string> ExtractPlaceholders(string[] urlSegments) {
        var ph = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // Collect all href templates from config
        var hrefs = new List<string>();
        foreach (var section in NavSections) CollectHrefs(section.Items, hrefs);

        // Try to match each template against the current URL
        foreach (var href in hrefs) {
            var tplSegments = href.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            if (tplSegments.Length > urlSegments.Length) continue;

            var match = true;
            for (int i = 0; i < tplSegments.Length; i++) {
                var tpl = tplSegments[i];
                if (tpl.StartsWith("{") && tpl.EndsWith("}")) continue; // placeholder — skip
                if (!tpl.Equals(urlSegments[i], StringComparison.OrdinalIgnoreCase)) { match = false; break; }
            }
            if (!match) continue;

            // Extract placeholder values from matched positions
            for (int i = 0; i < tplSegments.Length; i++) {
                var tpl = tplSegments[i];
                if (tpl.StartsWith("{") && tpl.EndsWith("}") && !ph.ContainsKey(tpl))
                    ph[tpl] = urlSegments[i];
            }
        }

        return ph;
    }

    // ══════════════════════════════════════
    //  Build nav groups from config
    // ══════════════════════════════════════

    static List<SbNavGroup> BuildNavGroups(Dictionary<string, string> placeholders, string currentPath, int portalId, UserInfo user) {
        var allTabs = TabController.Instance.GetTabsByPortal(portalId).AsList();
        var groups = new List<SbNavGroup>();
        foreach (var section in NavSections) {
            var items = new List<SbNavItem>();
            foreach (var link in section.Items) {
                var item = ConvertLink(link, placeholders, currentPath, allTabs, user);
                if (item != null) items.Add(item);
            }
            if (items.Count > 0)
                groups.Add(new SbNavGroup { Title = section.Title, Items = items });
        }
        return groups;
    }

    static SbNavItem ConvertLink(SidebarLink link, Dictionary<string, string> placeholders, string currentPath,
        IList<DotNetNuke.Entities.Tabs.TabInfo> allTabs, UserInfo user) {
        var href = link.Href;
        foreach (var kv in placeholders) href = href.Replace(kv.Key, kv.Value);
        // Strip braces from any unresolved placeholders: {foo} → foo
        href = System.Text.RegularExpressions.Regex.Replace(href, @"\{([^}]+)\}", "$1");

        // Permission: match href to DNN tab via TabPath
        var tabPath = "//" + string.Join("//", href.Trim('/').Split('/'));
        var tab = allTabs.FirstOrDefault(t =>
            t.TabPath.Equals(tabPath, StringComparison.OrdinalIgnoreCase) && !t.IsDeleted);

        // If resolved path didn't match (slugs replaced), try the original template path
        // e.g. href="/keizerswaard/home" won't match, but template "/{community-slug}/home"
        // maps to DNN tab //community-slug//home which does exist.
        if (tab == null) {
            var tplPath = "//" + string.Join("//", link.Href.Trim('/').Split('/')
                .Select(s => s.StartsWith("{") && s.EndsWith("}") ? s.Trim('{', '}') : s));
            tab = allTabs.FirstOrDefault(t =>
                t.TabPath.Equals(tplPath, StringComparison.OrdinalIgnoreCase) && !t.IsDeleted);
        }

        if (tab != null && !CanUserViewTab(tab, user)) return null;

        var children = new List<SbNavItem>();
        if (link.Children != null && link.Children.Length > 0) {
            foreach (var child in link.Children) {
                var ci = ConvertLink(child, placeholders, currentPath, allTabs, user);
                if (ci != null) children.Add(ci);
            }
        }

        var isActive = currentPath.TrimEnd('/').Equals(href.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
        var hasActiveChild = children.Any(c => c.IsActive || c.IsExpanded);

        // Use the slug-replaced href directly — NavigateURL would produce
        // template names like /community-slug/home instead of /keizerswaard/home
        var url = href;

        // Derive label from DNN tab title; fall back to last URL segment
        var label = tab != null ? tab.Title : href.Trim('/').Split('/').Last();

        return new SbNavItem {
            Label = label,
            Icon = string.IsNullOrEmpty(link.Icon) ? null : link.Icon,
            Url = url,
            IsActive = isActive,
            IsExpanded = isActive || hasActiveChild,
            Items = children
        };
    }

    // ══════════════════════════════════════
    //  Render HTML
    // ══════════════════════════════════════

    static string RenderNav(List<SbNavItem> items, int depth) {
        var sb = new StringBuilder();
        var pl = depth == 0 ? "px-3" : "pl-" + (3 + depth * 4);
        var py = depth == 0 ? "py-2.5" : "py-2";
        var ico = depth == 0 ? "size-5" : "size-4";

        sb.Append("<ul class=\"space-y-1");
        if (depth > 0) sb.Append(" mt-0.5");
        sb.AppendLine("\">");

        foreach (var item in items) {
            var active = item.IsActive
                ? "bg-primary-50 text-primary-700 font-semibold"
                : (depth == 0
                    ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900");
            var label = HttpUtility.HtmlEncode(item.Label);

            sb.AppendLine("<li>");
            if (item.HasChildren) {
                var exp = item.IsExpanded ? "true" : "false";
                var rot = item.IsExpanded ? " rotate-90" : "";
                var rows = item.IsExpanded ? "1fr" : "0fr";
                sb.AppendLine("<div class=\"flex items-center justify-between " + pl + " " + py + " rounded-lg text-sm transition-colors cursor-pointer " + active + "\" data-submenu-parent aria-expanded=\"" + exp + "\">");
                sb.Append("  <a href=\"" + item.Url + "\" class=\"flex items-center gap-3 flex-1\">");
                if (item.Icon != null) sb.Append("<i data-lucide=\"" + item.Icon + "\" class=\"" + ico + " shrink-0\"></i>");
                sb.AppendLine("<span>" + label + "</span></a>");
                sb.AppendLine("  <button type=\"button\" class=\"sidebar-submenu-toggle p-0.5 rounded hover:bg-gray-200 transition-colors\">");
                sb.AppendLine("    <i data-lucide=\"chevron-right\" class=\"size-4 transition-transform duration-200" + rot + "\"></i>");
                sb.AppendLine("  </button></div>");
                sb.AppendLine("<div class=\"grid\" style=\"grid-template-rows:" + rows + ";\">");
                sb.AppendLine("  <div class=\"overflow-hidden pl-4\">" + RenderNav(item.Items, depth + 1) + "</div>");
                sb.AppendLine("</div>");
            } else {
                sb.Append("<a href=\"" + item.Url + "\" class=\"flex items-center gap-3 " + pl + " " + py + " rounded-lg text-sm transition-colors " + active + "\">");
                if (item.Icon != null) sb.Append("<i data-lucide=\"" + item.Icon + "\" class=\"" + ico + " shrink-0\"></i>");
                sb.AppendLine("<span>" + label + "</span></a>");
            }
            sb.AppendLine("</li>");
        }
        sb.AppendLine("</ul>");
        return sb.ToString();
    }

</script>

<%
    var sb = DnnDev.Routing.Models.DzpContext.Current;

    // Extract template placeholders from NavSections + current URL segments
    var placeholders = ExtractPlaceholders(sb.Segments);

    // Merge route values from DzpContext (set by RouteConfig)
    foreach (var kv in sb.Placeholders)
    {
        if (!placeholders.ContainsKey(kv.Key))
            placeholders[kv.Key] = kv.Value;
    }

    // Build nav with active-state + permission checks
    var navGroups = BuildNavGroups(placeholders, sb.CurrentPath, sb.Portal.PortalId, sb.User);

    // Determine logo link (use resolved slug from route values)
    var sbSlug = placeholders.ContainsKey("{community-slug}") ? placeholders["{community-slug}"] : null;
    var sbLogoUrl = !string.IsNullOrEmpty(sbSlug)
        ? "/" + sbSlug + "/home"
        : (sb.IsOnCommunityPage
            ? "/" + sb.Segments[0] + "/home"
            : DnnDev.Routing.Constants.FallbackHomeUrl);
%>

<!-- Overlay for mobile -->
<div id="sidebar-overlay" class="hidden fixed inset-0 z-30 bg-black/40 lg:hidden"></div>

<!-- Sidebar -->
<aside id="sidebar" class="fixed top-0 lg:sticky lg:top-[70px] z-40 h-dvh lg:h-[calc(100dvh-70px)] w-[250px] -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col">

    <!-- Header (mobile only) -->
    <div class="h-17.5 flex items-center justify-between px-4 py-3 border-b border-gray-200 lg:hidden shrink-0">
        <a href="<%= sbLogoUrl %>" class="self-stretch">
            <img src="<%= sb.LogoUrl %>" alt="<%= sb.Portal.PortalName %>" class="h-full"/>
        </a>
        <button type="button" id="sidebar-close" class="p-1 rounded-md hover:bg-gray-100 transition-colors" aria-label="Close sidebar">
            <i data-lucide="x" class="size-5 text-gray-500"></i>
        </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
        <% if (sb.ShowDashboardLink && !sb.IsOnSettings) { %>
        <div class="mb-6">
            <ul class="space-y-1">
                <li>
                    <a href="/dashboard" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors <%= sb.IsOnDashboard ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" %>">
                        <i data-lucide="layout-dashboard" class="size-5 shrink-0"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
            </ul>
        </div>
        <% } %>
        <% if (!sb.IsOnCommunityRoot) { %>
        <% foreach (var group in navGroups) { %>
        <div class="mb-6">
            <h3 class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400"><%= group.Title %></h3>
            <% Response.Write(RenderNav(group.Items, 0)); %>
        </div>
        <% } %>
        <% } %>
    </nav>

    <!-- Footer -->
    <div class="border-t border-gray-200 px-3 py-4 shrink-0">
        <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <i data-lucide="help-circle" class="size-5 shrink-0"></i>
            <span>Help & Support</span>
        </a>
    </div>
</aside>

<script>
(function () {
    function setup() {
        var sidebar  = document.getElementById('sidebar');
        var overlay  = document.getElementById('sidebar-overlay');
        var closeBtn = document.getElementById('sidebar-close');

        function closeSidebar() {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }

        if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
        if (overlay)  overlay.addEventListener('click', closeSidebar);

        sidebar.querySelectorAll('.sidebar-submenu-toggle').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var parent  = btn.closest('[data-submenu-parent]');
                var submenu = parent.nextElementSibling;
                var chevron = btn.querySelector('svg') || btn.querySelector('[data-lucide]');
                var isOpen  = parent.getAttribute('aria-expanded') === 'true';

                parent.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                submenu.style.gridTemplateRows = isOpen ? '0fr' : '1fr';
                if (chevron) chevron.classList.toggle('rotate-90');
            });
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', function () { setTimeout(setup, 50); });
    else
        setTimeout(setup, 50);
})();
</script>
