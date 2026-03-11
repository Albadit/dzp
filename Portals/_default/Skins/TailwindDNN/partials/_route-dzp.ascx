<script runat="server">
// -- Define sidebar sections here --
static readonly SidebarSection[] NavSections = {
    new SidebarSection("Community",
        N("/{community-slug}/home",       "home"),
        N("/{community-slug}/timeline",   "message-square-text"),
        N("/{community-slug}/discover",   "library-big")
    ),
    new SidebarSection("Management",
        N("/{community-slug}/manage/users",     "users"),
        N("/{community-slug}/manage/company",   "building-2"),
        N("/{community-slug}/manage/managers",   "handshake"),
        N("/{community-slug}/manage/groups",     "component"),
        N("/{community-slug}/manage/newsletter", "newspaper")
    ),
};
</script>
