<%@ Control AutoEventWireup="false" Explicit="True" Inherits="DotNetNuke.UI.Containers.Container" %>
<%@ Register TagPrefix="dnn" TagName="TITLE" Src="~/Admin/Containers/Title.ascx" %>
<div class="mb-6 last:mb-0">
    <h2 class="font-heading text-xl font-semibold leading-[1.4] text-gray-900 mb-4 pb-3 border-b-2 border-primary-500"><dnn:TITLE runat="server" id="dnnTITLE" CssClass="" /></h2>
    <div class="text-base leading-[1.75] text-gray-700" id="ContentPane" runat="server"></div>
</div>
