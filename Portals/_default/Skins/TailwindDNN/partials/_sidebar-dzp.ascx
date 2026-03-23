<%@ Import Namespace="System.Collections.Generic" %>
<%@ Import Namespace="System.Linq" %>
<%@ Import Namespace="System.Text" %>
<%@ Import Namespace="System.Text.RegularExpressions" %>
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
    //  Static caches (computed once per app domain)
    // ══════════════════════════════════════

    static readonly Regex BracketRegex = new Regex(@"\[([^\]]+)\]", RegexOptions.Compiled);

    // Pre-split href templates: each entry is { original href, segments[] }
    static readonly List<KeyValuePair<string, string[]>> HrefTemplates = BuildHrefTemplates();
    static List<KeyValuePair<string, string[]>> BuildHrefTemplates() {
        var list = new List<KeyValuePair<string, string[]>>();
        CollectHrefs(null, list);
        return list;
    }
    static void CollectHrefs(SidebarLink[] links, List<KeyValuePair<string, string[]>> list) {
        if (links == null) {
            foreach (var section in NavSections)
                CollectHrefs(section.Items, list);
            return;
        }
        foreach (var link in links) {
            list.Add(new KeyValuePair<string, string[]>(
                link.Href,
                link.Href.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries)));
            if (link.Children != null && link.Children.Length > 0)
                CollectHrefs(link.Children, list);
        }
    }

    // ══════════════════════════════════════
    //  Shared per-request state (HttpContext.Items)
    // ══════════════════════════════════════

    const string CacheKey_CommunityName = "dzp:CommunityName";
    const string CacheKey_CommunityValid = "dzp:CommunityValid";

    /// <summary>Validates a community slug, caching result in HttpContext.Items so
    /// the header and sidebar don't each run their own SQL query.</summary>
    static bool ValidateCommunitySlug(string slug) {
        var items = HttpContext.Current.Items;
        if (items.Contains(CacheKey_CommunityValid))
            return (bool)items[CacheKey_CommunityValid];

        var valid = false;
        if (!string.IsNullOrEmpty(slug)) {
            try {
                var connStr = System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"].ConnectionString;
                using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                using (var cmd  = new System.Data.SqlClient.SqlCommand("SELECT Name FROM Community WHERE Slug = @slug", conn)) {
                    cmd.Parameters.AddWithValue("@slug", slug);
                    conn.Open();
                    var result = cmd.ExecuteScalar();
                    if (result != null) {
                        items[CacheKey_CommunityName] = result.ToString();
                        valid = true;
                    }
                }
            } catch { }
        }
        items[CacheKey_CommunityValid] = valid;
        return valid;
    }

    // ══════════════════════════════════════
    //  Permission check
    // ══════════════════════════════════════

    static bool CanUserViewTab(DotNetNuke.Entities.Tabs.TabInfo tab, UserInfo user) {
        if (user != null && user.IsSuperUser) return true;
        var userId = user != null ? user.UserID : -1;
        #pragma warning disable CS0618
        var perms = tab.TabPermissions.Cast<TabPermissionInfo>();
        #pragma warning restore CS0618
        var userPerms = perms.Where(p => p.UserID == userId).ToList();
        if (userPerms.Count > 0) {
            var viewPerms = userPerms.Where(p => p.PermissionKey == "VIEW").ToList();
            return viewPerms.Count > 0 && viewPerms.All(p => p.AllowAccess);
        }
        return TabPermissionController.CanViewPage(tab);
    }

    // ══════════════════════════════════════
    //  Extract placeholders from URL
    // ══════════════════════════════════════

    static Dictionary<string, string> ExtractPlaceholders(string[] urlSegments) {
        var ph = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var kv in HrefTemplates) {
            var tplSegments = kv.Value;
            if (tplSegments.Length > urlSegments.Length) continue;

            var match = true;
            for (int i = 0; i < tplSegments.Length; i++) {
                var tpl = tplSegments[i];
                if (tpl[0] == '[' && tpl[tpl.Length - 1] == ']') continue;
                if (!tpl.Equals(urlSegments[i], StringComparison.OrdinalIgnoreCase)) { match = false; break; }
            }
            if (!match) continue;

            for (int i = 0; i < tplSegments.Length; i++) {
                var tpl = tplSegments[i];
                if (tpl[0] == '[' && tpl[tpl.Length - 1] == ']' && !ph.ContainsKey(tpl))
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

        // Build O(1) lookup by TabPath (case-insensitive)
        var tabByPath = new Dictionary<string, DotNetNuke.Entities.Tabs.TabInfo>(StringComparer.OrdinalIgnoreCase);
        foreach (var t in allTabs)
            if (!t.IsDeleted && !tabByPath.ContainsKey(t.TabPath))
                tabByPath[t.TabPath] = t;

        var currentNorm = currentPath.TrimEnd('/');
        var groups = new List<SbNavGroup>();
        foreach (var section in NavSections) {
            var items = new List<SbNavItem>();
            foreach (var link in section.Items) {
                var item = ConvertLink(link, placeholders, currentNorm, tabByPath, user);
                if (item != null) items.Add(item);
            }
            if (items.Count > 0)
                groups.Add(new SbNavGroup { Title = section.Title, Items = items });
        }
        return groups;
    }

    static SbNavItem ConvertLink(SidebarLink link, Dictionary<string, string> placeholders, string currentNorm,
        Dictionary<string, DotNetNuke.Entities.Tabs.TabInfo> tabByPath, UserInfo user) {
        var href = link.Href;
        foreach (var kv in placeholders) href = href.Replace(kv.Key, kv.Value);
        href = BracketRegex.Replace(href, "$1");

        // Permission: match href to DNN tab via TabPath
        var tabPath = "//" + string.Join("//", href.Trim('/').Split('/'));
        DotNetNuke.Entities.Tabs.TabInfo tab;
        if (!tabByPath.TryGetValue(tabPath, out tab)) {
            // If resolved path didn't match (slugs replaced), try the original template path
            var tplPath = "//" + string.Join("//", link.Href.Trim('/').Split('/'));
            tabByPath.TryGetValue(tplPath, out tab);
        }

        if (tab != null && !CanUserViewTab(tab, user)) return null;

        var children = new List<SbNavItem>();
        if (link.Children != null && link.Children.Length > 0) {
            foreach (var child in link.Children) {
                var ci = ConvertLink(child, placeholders, currentNorm, tabByPath, user);
                if (ci != null) children.Add(ci);
            }
        }

        var isActive = currentNorm.Equals(href.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
        var hasActiveChild = children.Any(c => c.IsActive || c.IsExpanded);

        var label = tab != null ? tab.Title : href.Trim('/').Split('/').Last();

        return new SbNavItem {
            Label = label,
            Icon = string.IsNullOrEmpty(link.Icon) ? null : link.Icon,
            Url = href,
            IsActive = isActive,
            IsExpanded = isActive || hasActiveChild,
            Items = children
        };
    }

    // ══════════════════════════════════════
    //  Render HTML
    // ══════════════════════════════════════

    static string RenderNav(List<SbNavItem> items, int depth) {
        var sb = new StringBuilder(items.Count * 256);
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
                sb.Append("<div class=\"flex items-center justify-between ").Append(pl).Append(' ').Append(py)
                  .Append(" rounded-lg text-sm transition-colors cursor-pointer ").Append(active)
                  .Append("\" data-submenu-parent aria-expanded=\"").Append(exp).AppendLine("\">");
                sb.Append("  <a href=\"").Append(item.Url).Append("\" class=\"flex items-center gap-3 flex-1\">");
                if (item.Icon != null) sb.Append("<i data-lucide=\"").Append(item.Icon).Append("\" class=\"").Append(ico).Append(" shrink-0\"></i>");
                sb.Append("<span>").Append(label).AppendLine("</span></a>");
                sb.AppendLine("  <button type=\"button\" class=\"sidebar-submenu-toggle p-0.5 rounded hover:bg-gray-200 transition-colors\">");
                sb.Append("    <i data-lucide=\"chevron-right\" class=\"size-4 transition-transform duration-200").Append(rot).AppendLine("\"></i>");
                sb.AppendLine("  </button></div>");
                sb.Append("<div class=\"grid\" style=\"grid-template-rows:").Append(rows).AppendLine(";\">");
                sb.Append("  <div class=\"overflow-hidden pl-4\">").Append(RenderNav(item.Items, depth + 1)).AppendLine("</div>");
                sb.AppendLine("</div>");
            } else {
                sb.Append("<a href=\"").Append(item.Url).Append("\" class=\"flex items-center gap-3 ").Append(pl)
                  .Append(' ').Append(py).Append(" rounded-lg text-sm transition-colors ").Append(active).Append("\">");
                if (item.Icon != null) sb.Append("<i data-lucide=\"").Append(item.Icon).Append("\" class=\"").Append(ico).Append(" shrink-0\"></i>");
                sb.Append("<span>").Append(label).AppendLine("</span></a>");
            }
            sb.AppendLine("</li>");
        }
        sb.AppendLine("</ul>");
        return sb.ToString();
    }

</script>

<%
    // ── Derive all state from URL segments + DNN APIs ──
    var _sbPs   = DotNetNuke.Entities.Portals.PortalSettings.Current;
    var _sbUser = _sbPs != null ? _sbPs.UserInfo : null;
    var _sbReq  = HttpContext.Current.Request;
    var _sbPath = _sbReq.RawUrl.Split('?')[0];
    var _sbSegs = _sbPath.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
    var _sbAuth = _sbReq.IsAuthenticated;

    var _sbSeg0         = _sbSegs.Length > 0 ? _sbSegs[0] : "";
    var _sbIsOnDash     = _sbSeg0.Equals("dashboard",     StringComparison.OrdinalIgnoreCase);
    var _sbIsOnSettings = _sbSeg0.Equals("settings",      StringComparison.OrdinalIgnoreCase);
    var _sbIsOnAdmin    = _sbSeg0.Equals("administrator", StringComparison.OrdinalIgnoreCase);
    var _sbSlug         = (_sbSegs.Length >= 2 && !_sbIsOnDash && !_sbIsOnSettings && !_sbIsOnAdmin) ? _sbSeg0 : "";
    var _sbHasCommunity = !string.IsNullOrEmpty(_sbSlug) && ValidateCommunitySlug(_sbSlug);
    var _sbLogoUrl      = (_sbPs != null && !string.IsNullOrEmpty(_sbPs.LogoFile)) ? _sbPs.HomeDirectory + _sbPs.LogoFile : "";

    // Extract template placeholders from NavSections + current URL segments
    var placeholders = ExtractPlaceholders(_sbSegs);

    // Build nav with active-state + permission checks
    var navGroups = BuildNavGroups(placeholders, _sbPath, _sbPs.PortalId, _sbUser);

    // Determine logo link: community home if slug present, otherwise /dashboard
    var resolvedSlug = placeholders.ContainsKey("[community]") ? placeholders["[community]"] : _sbSlug;
    var sbLogoUrl = !string.IsNullOrEmpty(resolvedSlug)
        ? "/" + resolvedSlug + "/home"
        : "/dashboard";
%>

<!-- Overlay for mobile -->
<div id="sidebar-overlay" class="hidden fixed inset-0 z-30 bg-black/40 lg:hidden"></div>

<!-- Sidebar -->
<aside id="sidebar" class="fixed top-0 lg:sticky lg:top-[70px] z-40 h-dvh lg:h-[calc(100dvh-70px)] w-[250px] -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col">

    <!-- Header (mobile only) -->
    <div class="h-17.5 flex items-center justify-between px-4 py-3 border-b border-gray-200 lg:hidden shrink-0">
        <a href="<%= sbLogoUrl %>" class="self-stretch">
            <img src="<%= _sbLogoUrl %>" alt="<%= _sbPs != null ? _sbPs.PortalName : "" %>" class="h-full"/>
        </a>
        <button type="button" id="sidebar-close" class="p-1 rounded-md hover:bg-gray-100 transition-colors" aria-label="Close sidebar">
            <i data-lucide="x" class="size-5 text-gray-500"></i>
        </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-3 py-4">
        <% if (_sbAuth && !_sbIsOnSettings) { %>
        <div class="mb-6">
            <ul class="space-y-1">
                <li>
                    <a href="/dashboard" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors <%= _sbIsOnDash ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900" %>">
                        <i data-lucide="layout-dashboard" class="size-5 shrink-0"></i>
                        <span>Dashboard</span>
                    </a>
                </li>
            </ul>
        </div>
        <% } %>
        <% if ((_sbHasCommunity || _sbIsOnSettings) && !_sbIsOnDash) { %>
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
