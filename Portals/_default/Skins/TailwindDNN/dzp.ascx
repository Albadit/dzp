<!--#include file="partials/_registers.ascx" -->
<!--#include file="partials/_includes.ascx" -->

<!-- Main Content -->
<!--#include file="partials/_header-dzp.ascx" -->
<div class="flex min-h-[calc(100dvh-70px)]">
    <!--#include file="partials/_route-dzp.ascx" -->
    <!--#include file="partials/_sidebar-dzp.ascx" -->
    <main class="flex-1 flex p-8">
        <div id="BannerPane" runat="server"></div>
        <div id="ContentPane" class="w-full" runat="server"></div> 
        <div id="FluidPane" runat="server"></div>
    </main>
</div>