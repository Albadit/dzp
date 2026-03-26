<dnn:META ID="mobileScale" runat="server" Name="viewport" Content="width=device-width, initial-scale=1.0" />
<dnn:DnnCssExclude runat="server" Name="dnndefault" />

<!-- Anti-FOUC: set theme on <html> before first paint -->
<script>
  (function(){var t=localStorage.getItem('theme')||((window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)?'dark':'light');var h=document.documentElement;h.setAttribute('data-theme',t);h.className=h.className.replace(/\b(light|dark)\b/g,'').trim()+' '+t;})();
</script>

<!-- Google Fonts: Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />

<!-- DNN  default skin CSS -->
<dnn:DnnCssInclude runat="server" FilePath="css/default.css" Priority="2" PathNameAlias="SkinPath" />
<!-- DNN Pane & Module Components styling (optional) -->
<dnn:DnnCssInclude runat="server" FilePath="css/dnn.css" Priority="100" PathNameAlias="SkinPath" />

<!-- Tailwind CSS Browser Runtime: compiles Tailwind classes in the browser from the <style> block below -->
<dnn:DnnJsInclude runat="server" FilePath="js/tailwind4.js" Priority="100" PathNameAlias="SkinPath" ForceProvider="DnnFormBottomProvider" />
<dnn:DnnJsInclude runat="server" FilePath="js/lucide.min.js" Priority="100" PathNameAlias="SkinPath" ForceProvider="DnnFormBottomProvider" />
<dnn:DnnJsInclude runat="server" FilePath="js/theme-switcher.js" Priority="101" PathNameAlias="SkinPath" ForceProvider="DnnFormBottomProvider" />

<!-- Initialize Lucide icons globally after the DOM is ready -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) lucide.createIcons();
  });
</script>

<!-- Tailwind theme config for browser runtime to process -->
<!--#include file="../css/_theme.html" -->
<!--#include file="../css/_global.html" -->