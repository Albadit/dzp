<%
    var _sbPs   = DotNetNuke.Entities.Portals.PortalSettings.Current;
    var _sbReq  = HttpContext.Current.Request;
    var _sbPath = _sbReq.RawUrl.Split('?')[0];
    var _sbSegs = _sbPath.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

    var _sbSeg0         = _sbSegs.Length > 0 ? _sbSegs[0] : "";
    var _sbIsOnDash     = _sbSeg0.Equals("dashboard",     StringComparison.OrdinalIgnoreCase);
    var _sbIsOnSettings = _sbSeg0.Equals("settings",      StringComparison.OrdinalIgnoreCase);
    var _sbIsOnAdmin    = _sbSeg0.Equals("administrator", StringComparison.OrdinalIgnoreCase);
    var _sbSlug         = (_sbSegs.Length >= 2 && !_sbIsOnDash && !_sbIsOnSettings && !_sbIsOnAdmin) ? _sbSeg0 : "";

    var _sbHasCommunity = !string.IsNullOrEmpty(_sbSlug)
        && HttpContext.Current.Items.Contains("dzp:CommunityValid")
        && (bool)HttpContext.Current.Items["dzp:CommunityValid"];

    var _sbLogoUrl = (_sbPs != null && !string.IsNullOrEmpty(_sbPs.LogoFile)) ? _sbPs.HomeDirectory + _sbPs.LogoFile : "";
    var sbLogoUrl  = _sbHasCommunity ? "/" + _sbSlug + "/home" : "/dashboard";
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
        <dnn:MENU runat="server" id="sidebarMenu" MenuStyle="menus/sidebar" NodeSelector="*,0,3" />
    </nav>

    <!-- Footer -->
    <div class="border-t border-gray-200 px-3 py-4 shrink-0">
        <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <i data-lucide="help-circle" class="size-5 shrink-0"></i>
            <span>Help & Support</span>
        </a>
    </div>
</aside>

<script src="<%= SkinPath %>js/sidebar.js"></script>
