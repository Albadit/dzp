<script runat="server">
// -- Define sidebar sections here --
static readonly SidebarSection[] NavSections = {
    new SidebarSection("Community",
        N("/[community]/home",       "home"),
        N("/[community]/timeline",   "message-square-text"),
        N("/[community]/discover",   "library-big")
    ),
    new SidebarSection("Management",
        N("/[community]/manage/users",     "users"),
        N("/[community]/manage/company",   "building-2"),
        N("/[community]/manage/managers",   "handshake"),
        N("/[community]/manage/groups",     "component"),
        N("/[community]/manage/newsletter", "newspaper")
    ),
    new SidebarSection("Admin",
        N("/administrator/communities", "plus-circle")
    ),
};
</script>
