<!--#include file="partials/_registers.ascx" -->
<!--#include file="partials/_includes.ascx" -->

<!-- Main Content -->
<dnn:MENU runat="server" id="headerMenu" MenuStyle="menus/header" NodeSelector="*,0,1" />
<div class="flex min-h-[calc(100dvh-70px)]">
    <dnn:MENU runat="server" id="sidebarMenu" MenuStyle="menus/sidebar" NodeSelector="*,0,3" />
    <main class="flex-1 flex p-8">
        <div id="BannerPane" runat="server"></div>
        <div id="ContentPane" class="w-full" runat="server"></div> 
        <div id="FluidPane" runat="server"></div>
    </main>
</div>