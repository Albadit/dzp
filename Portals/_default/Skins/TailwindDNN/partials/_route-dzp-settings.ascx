<script runat="server">
// ── Define sidebar sections here ──
static readonly SidebarSection[] NavSections = {
    new SidebarSection("Instellingen",
        N("/settings/profile",       "user"),
        N("/settings/password",      "key-round"),
        N("/settings/notifications", "bell")
    ),
};
</script>