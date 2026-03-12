<%
    var ps = DotNetNuke.Entities.Portals.PortalSettings.Current;
    var hdrLogoUrl = ps.HomeDirectory + ps.LogoFile;

    // Use the original URL path (before RouteConfig.RewritePath) when available
    var hdrOriginalPath = HttpContext.Current.Items["RouteOriginalPath"] as string;
    var hdrRawUrl = HttpContext.Current.Request.RawUrl;
    var hdrQsIdx = hdrRawUrl.IndexOf('?');
    var hdrPath = hdrOriginalPath ?? (hdrQsIdx >= 0 ? hdrRawUrl.Substring(0, hdrQsIdx) : hdrRawUrl);
    var hdrSegs = hdrPath.TrimStart('/').Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

    // Check if the first segment is a real root-level DNN page (e.g. "settings")
    var hdrAllTabs = DotNetNuke.Entities.Tabs.TabController.Instance.GetTabsByPortal(ps.PortalId).AsList();
    var hdrFirstIsRealPage = hdrSegs.Length > 0 && hdrAllTabs.Any(t =>
        t.ParentId == -1 && !t.IsDeleted
        && t.TabName.Equals(hdrSegs[0], StringComparison.OrdinalIgnoreCase));
    var hdrSiteUrl = hdrSegs.Length > 0 && !hdrFirstIsRealPage
        ? "/" + hdrSegs[0] + "/home"
        : "/home"; // updated later when on non-community pages
    var hdrSiteName = ps.PortalName;
    var hdrUser = DotNetNuke.Entities.Users.UserController.Instance.GetCurrentUserInfo();
    var hdrUserName = hdrUser.DisplayName;
    var hdrUserEmail = hdrUser.Email;
    var hdrProfileImg = "/DnnImageHandler.ashx?mode=profilepic&userId=" + hdrUser.UserID;

    // Look up community name from the URL slug
    var hdrCommunitySlug = hdrSegs.Length > 0 && !hdrFirstIsRealPage ? hdrSegs[0] : null;
    var hdrCommunity = "";
    if (!string.IsNullOrEmpty(hdrCommunitySlug))
    {
        var hdrConnStr = System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"] != null
            ? System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"].ConnectionString
            : null;
        if (!string.IsNullOrEmpty(hdrConnStr))
        {
            using (var hdrConn = new System.Data.SqlClient.SqlConnection(hdrConnStr))
            {
                hdrConn.Open();
                using (var hdrCmd = hdrConn.CreateCommand())
                {
                    hdrCmd.CommandText = "SELECT Name FROM Community WHERE Slug = @slug";
                    hdrCmd.Parameters.AddWithValue("@slug", hdrCommunitySlug);
                    hdrCommunity = (hdrCmd.ExecuteScalar() as string) ?? "";
                }
            }
        }
    }

    // Determine highest DNN role for this user
    var hdrRole = "Lid";
    var hdrUserRoles = hdrUser.Roles;
    if (hdrUser.IsSuperUser)
    {
        hdrRole = "Superuser";
    }
    else if (hdrUserRoles != null)
    {
        // Skip generic DNN roles, pick the most relevant one
        var hdrSkipRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "Registered Users", "Subscribers", "All Users", "Unverified Users" };
        foreach (var r in hdrUserRoles)
        {
            if (!hdrSkipRoles.Contains(r))
            {
                hdrRole = r;
                break;
            }
        }
    }

    // Slug prefix for community-scoped links
    var hdrSlug = "";
    var hdrCommunityLink = "/home"; // fallback
    if (hdrSegs.Length > 0 && !hdrFirstIsRealPage)
    {
        // On a community page — use slug from URL
        hdrSlug = "/" + hdrSegs[0];
        hdrCommunityLink = hdrSlug + "/home";
        hdrSiteUrl = hdrCommunityLink;
    }
    else
    {
        // On a non-community page (e.g. /settings) — look up user's communities
        var hdrLinkConnStr = System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"] != null
            ? System.Configuration.ConfigurationManager.ConnectionStrings["SiteSqlServer"].ConnectionString
            : null;
        if (!string.IsNullOrEmpty(hdrLinkConnStr) && hdrUser.UserID > 0)
        {
            var hdrUserSlugs = new System.Collections.Generic.List<string>();
            using (var hdrLinkConn = new System.Data.SqlClient.SqlConnection(hdrLinkConnStr))
            {
                hdrLinkConn.Open();
                using (var hdrLinkCmd = hdrLinkConn.CreateCommand())
                {
                    hdrLinkCmd.CommandText = "SELECT c.Slug FROM Community c INNER JOIN UserCommunity uc ON c.CommunityId = uc.CommunityId WHERE uc.UserId = @uid";
                    hdrLinkCmd.Parameters.AddWithValue("@uid", hdrUser.UserID);
                    using (var hdrLinkRdr = hdrLinkCmd.ExecuteReader())
                    {
                        while (hdrLinkRdr.Read())
                            hdrUserSlugs.Add(hdrLinkRdr.GetString(0));
                    }
                }
            }
            if (hdrUserSlugs.Count == 1)
            {
                hdrSlug = "/" + hdrUserSlugs[0];
                hdrCommunityLink = hdrSlug + "/home";
                hdrSiteUrl = hdrCommunityLink;
            }
            else if (hdrUserSlugs.Count > 1)
            {
                hdrCommunityLink = "/dashboard";
                hdrSiteUrl = "/dashboard";
            }
        }
    }

    // User popup menu links
    var hdrOnDashboard = hdrSegs.Length > 0 && hdrSegs[0].Equals("dashboard", StringComparison.OrdinalIgnoreCase);
    var hdrPopupLinks = hdrOnDashboard
        ? new[] {
            new { Href = "/settings/profile",           Label = "Gebruikersprofiel bewerken",   Css = "text-gray-700", Separator = "" },
            new { Href = "/settings",                   Label = "Mijn instellingen",            Css = "text-gray-700", Separator = "" },
            new { Href = "/logoff",                     Label = "Uitloggen",                    Css = "text-red-600",  Separator = "border-t border-gray-200" },
        }
        : new[] {
            new { Href = hdrCommunityLink,              Label = "Community",                    Css = "text-gray-700", Separator = "border-b border-gray-200" },
            new { Href = "/settings/profile",           Label = "Gebruikersprofiel bewerken",   Css = "text-gray-700", Separator = "" },
            new { Href = "/settings",                   Label = "Mijn instellingen",            Css = "text-gray-700", Separator = "" },
            new { Href = "/logoff",                     Label = "Uitloggen",                    Css = "text-red-600",  Separator = "border-t border-gray-200" },
        };
%>

<div class="flex h-17.5 p-3 border-b border-[#D9D9D9]">
    <div class="lg:w-[250px] mr-4 flex gap-2.5 shrink-0 items-center">
        <!-- Mobile hamburger -->
        <button type="button" id="sidebar-toggle" class="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors" aria-label="Toggle sidebar">
            <i data-lucide="menu" class="size-5"></i>
        </button>
        <!-- Logo -->
        <a href="<%= hdrSiteUrl %>" class="lg:block hidden self-stretch">
            <img src="<%= hdrLogoUrl %>" alt="<%= hdrSiteName %>" class="h-full"/>
        </a>
    </div>
    <div class="w-full flex justify-between">
        <div class="flex gap-2.5 <%= string.IsNullOrEmpty(hdrCommunity) ? "invisible" : "" %>">
            <div class="sm:flex hidden h-full aspect-square object-cover rounded-xs bg-gray-200 justify-center items-center font-bold">Logo</div>
            <div class="lg:w-80 w-45 flex flex-col lg:justify-between justify-center">
                <span class="lg:text-base text-sm font-bold w-full text-ellipsis overflow-hidden whitespace-nowrap"><%= hdrCommunity %></span>
                <div class="flex gap-2 items-center">
                    <i data-lucide="coffee" class="size-3 shrink-0"></i>
                    <span class="lg:text-base w-full text-xs text-ellipsis overflow-hidden whitespace-nowrap"><%= hdrRole %></span>
                </div>
            </div>
        </div>
        <div class="flex gap-8 items-center">
            <i data-lucide="bell" class="lg:block hidden size-5.5 shrink-0"></i>
            <i data-lucide="search" class="lg:block hidden size-5.5 shrink-0"></i>
            <div id="user-menu-trigger" class="flex gap-2.5 items-center self-stretch relative cursor-pointer">
                <img src="<%= hdrProfileImg %>" alt="<%= hdrUserName %>" class="h-full shrink-0 aspect-square object-cover rounded-full">
                <div class="lg:flex hidden flex-col max-w-32 leading-none">
                    <span class="w-full font-bold text-ellipsis overflow-hidden whitespace-nowrap"><%= hdrUserName %></span>
                    <span class="w-full text-sm text-ellipsis overflow-hidden whitespace-nowrap"><%= hdrUserEmail %></span>
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
