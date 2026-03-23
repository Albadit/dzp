<script runat="server">
static readonly DZP.RouteContext.SidebarSection[] NavSections = {
    new DZP.RouteContext.SidebarSection("Community",
        DZP.RouteContext.SidebarHelper.N("/[community]/home",       "home"),
        DZP.RouteContext.SidebarHelper.N("/[community]/timeline",   "message-square-text"),
        DZP.RouteContext.SidebarHelper.N("/[community]/discover",   "library-big")
    ),
    new DZP.RouteContext.SidebarSection("Management",
        DZP.RouteContext.SidebarHelper.N("/[community]/manage/users",     "users"),
        DZP.RouteContext.SidebarHelper.N("/[community]/manage/company",   "building-2"),
        DZP.RouteContext.SidebarHelper.N("/[community]/manage/managers",   "handshake"),
        DZP.RouteContext.SidebarHelper.N("/[community]/manage/groups",     "component"),
        DZP.RouteContext.SidebarHelper.N("/[community]/manage/newsletter", "newspaper")
    ),
    new DZP.RouteContext.SidebarSection("Admin",
        DZP.RouteContext.SidebarHelper.N("/administrator/communities", "plus-circle")
    ),
};
</script>
