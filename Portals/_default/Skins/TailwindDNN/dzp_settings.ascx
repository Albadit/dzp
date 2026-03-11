<!--#include file="partials/_registers.ascx" -->
<!--#include file="partials/_includes.ascx" -->

<!-- Main Content -->
<!--#include file="partials/_header-dzp.ascx" -->
<div class="flex h-[calc(100dvh-70px)]">
    <!--#include file="partials/_route-dzp-settings.ascx" -->
    <!--#include file="partials/_sidebar-dzp.ascx" -->
    <main class="flex-1 min-h-0 overflow-y-auto flex p-8">
        <div id="BannerPane" runat="server"></div>
        <div id="ContentPane" class="w-full gap-4" runat="server"></div> 
        <div id="FluidPane" runat="server"></div>
    </main>
</div>