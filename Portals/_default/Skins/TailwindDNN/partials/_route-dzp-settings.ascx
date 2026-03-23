<script runat="server">
static readonly DZP.RouteContext.SidebarSection[] NavSections = {
    new DZP.RouteContext.SidebarSection("Instellingen",
        DZP.RouteContext.SidebarHelper.N("/settings/profile",       "user"),
        DZP.RouteContext.SidebarHelper.N("/settings/password",      "key-round"),
        DZP.RouteContext.SidebarHelper.N("/settings/notifications", "bell")
    ),
};
</script>