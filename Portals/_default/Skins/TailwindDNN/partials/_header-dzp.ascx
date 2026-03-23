<%
    // ── Derive all state from URL segments + DNN APIs ──
    var _ps   = DotNetNuke.Entities.Portals.PortalSettings.Current;
    var _user = _ps != null ? _ps.UserInfo : null;
    var _req  = HttpContext.Current.Request;
    var _path = _req.RawUrl.Split('?')[0];
    var _segs = _path.Trim('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
    var _auth = _req.IsAuthenticated;

    var _isOnDashboard = _segs.Length > 0 && _segs[0].Equals("dashboard", StringComparison.OrdinalIgnoreCase);
    var _isOnSettings  = _segs.Length > 0 && _segs[0].Equals("settings",  StringComparison.OrdinalIgnoreCase);
    var _communitySlug = (_segs.Length >= 2 && !_isOnDashboard && !_isOnSettings
                          && !_segs[0].Equals("administrator", StringComparison.OrdinalIgnoreCase))
                         ? _segs[0] : "";
    var _communityLink = !string.IsNullOrEmpty(_communitySlug) ? "/" + _communitySlug + "/home" : "/dashboard";

    // Reuse sidebar's cached query (or run it once if header renders first)
    var _communityName = "";
    var _ctxItems = HttpContext.Current.Items;
    if (!string.IsNullOrEmpty(_communitySlug)) {
        if (_ctxItems.Contains("dzp:CommunityValid")) {
            if ((bool)_ctxItems["dzp:CommunityValid"] && _ctxItems.Contains("dzp:CommunityName"))
                _communityName = _ctxItems["dzp:CommunityName"].ToString();
        } else {
            try {
                var connStr = System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"].ConnectionString;
                using (var conn = new System.Data.SqlClient.SqlConnection(connStr))
                using (var cmd  = new System.Data.SqlClient.SqlCommand("SELECT Name FROM Community WHERE Slug = @slug", conn)) {
                    cmd.Parameters.AddWithValue("@slug", _communitySlug);
                    conn.Open();
                    var result = cmd.ExecuteScalar();
                    if (result != null) {
                        _communityName = result.ToString();
                        _ctxItems["dzp:CommunityName"] = _communityName;
                        _ctxItems["dzp:CommunityValid"] = true;
                    } else {
                        _ctxItems["dzp:CommunityValid"] = false;
                    }
                }
            } catch {
                _ctxItems["dzp:CommunityValid"] = false;
            }
        }
    }
    var _logoUrl       = (_ps != null && !string.IsNullOrEmpty(_ps.LogoFile)) ? _ps.HomeDirectory + _ps.LogoFile : "";
    var _profileImg    = (_user != null && _user.UserID > 0)
                         ? "/DnnImageHandler.ashx?mode=profilepic&userId=" + _user.UserID + "&h=64&w=64" : "";
    var _displayName   = _user != null ? (_user.DisplayName ?? "") : "";
    var _email         = _user != null ? (_user.Email ?? "") : "";

    var settingsUrl  = "/settings";
    var dashboardUrl = "/dashboard";

    var hdrPopupLinks = _isOnDashboard
        ? new[] {
            new { Href = settingsUrl + "/profile",      Label = "Gebruikersprofiel bewerken",   Css = "text-gray-700", Separator = "" },
            new { Href = settingsUrl,                   Label = "Mijn instellingen",            Css = "text-gray-700", Separator = "" },
            new { Href = "/Logoff.aspx",                Label = "Uitloggen",                    Css = "text-red-600",  Separator = "border-t border-gray-200" },
        }
        : new[] {
            new { Href = _communityLink,                Label = "Community",                    Css = "text-gray-700", Separator = "border-b border-gray-200" },
            new { Href = settingsUrl + "/profile",      Label = "Gebruikersprofiel bewerken",   Css = "text-gray-700", Separator = "" },
            new { Href = settingsUrl,                   Label = "Mijn instellingen",            Css = "text-gray-700", Separator = "" },
            new { Href = "/Logoff.aspx",                Label = "Uitloggen",                    Css = "text-red-600",  Separator = "border-t border-gray-200" },
        };
%>

<div class="sticky top-0 z-50 bg-white flex h-17.5 p-3 border-b border-[#D9D9D9]">
    <div class="lg:w-[250px] mr-4 flex gap-2.5 shrink-0 items-center">
        <!-- Mobile hamburger -->
        <button type="button" id="sidebar-toggle" class="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors" aria-label="Toggle sidebar">
            <i data-lucide="menu" class="size-5"></i>
        </button>
        <!-- Logo -->
        <a href="/" class="lg:block hidden self-stretch">
            <img src="<%= _logoUrl %>" alt="<%= _ps != null ? _ps.PortalName : "" %>" class="h-full"/>
        </a>
    </div>
    <div class="w-full flex justify-between">
        <div class="flex gap-2.5 <%= string.IsNullOrEmpty(_communityName) ? "invisible" : "" %>">
            <div class="sm:flex hidden h-full aspect-square object-cover rounded-xs bg-gray-200 justify-center items-center font-bold">Logo</div>
            <div class="lg:w-80 w-45 flex flex-col lg:justify-between justify-center">
                <span class="lg:text-base text-sm font-bold w-full text-ellipsis overflow-hidden whitespace-nowrap"><%= _communityName %></span>
                <div class="flex gap-2 items-center">
                    <i data-lucide="coffee" class="size-3 shrink-0"></i>
                    <span class="lg:text-base w-full text-xs text-ellipsis overflow-hidden whitespace-nowrap"></span>
                </div>
            </div>
        </div>
        <div class="flex gap-8 items-center">
            <i data-lucide="bell" class="lg:block hidden size-5.5 shrink-0"></i>
            <i data-lucide="search" class="lg:block hidden size-5.5 shrink-0"></i>
            <div id="user-menu-trigger" class="flex gap-2.5 items-center self-stretch relative cursor-pointer">
                <img src="<%= _profileImg %>" alt="<%= _displayName %>" class="h-full shrink-0 aspect-square object-cover rounded-full">
                <div class="lg:flex hidden flex-col max-w-32 leading-none">
                    <span class="w-full font-bold text-ellipsis overflow-hidden whitespace-nowrap"><%= _displayName %></span>
                    <span class="w-full text-sm text-ellipsis overflow-hidden whitespace-nowrap"><%= _email %></span>
                </div>

                <!-- User Popup -->
                <div id="user-popup" class="hidden absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                    <ul class="flex flex-col">
                        <% foreach (var link in hdrPopupLinks) { %>
                        <li class="<%= link.Separator %>"><a href="<%= link.Href %>" class="block px-4 py-2 text-sm <%= link.Css %> hover:bg-gray-100"><%= link.Label %></a></li>
                        <% } %>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var toggle  = document.getElementById('sidebar-toggle');
    var popup   = document.getElementById('user-popup');
    var trigger = document.getElementById('user-menu-trigger');

    // Toggle sidebar from header hamburger
    if (toggle) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
      });
    }

    // Toggle user popup menu
    if (trigger && popup) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        popup.classList.toggle('hidden');
      });
    }

    // Close user popup on outside click
    document.addEventListener('click', function (e) {
      if (popup && trigger && !trigger.contains(e.target)) {
        popup.classList.add('hidden');
      }
    });
  });
</script>
