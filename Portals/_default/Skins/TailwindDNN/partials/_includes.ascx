<dnn:META ID="mobileScale" runat="server" Name="viewport" Content="width=device-width, initial-scale=1.0" />
<dnn:DnnCssExclude runat="server" Name="dnndefault" />

<!-- Google Fonts: Inter -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />

<!-- DNN  default skin CSS -->
<dnn:DnnCssInclude runat="server" FilePath="resources/css/default.css" Priority="2" PathNameAlias="SkinPath" />
<!-- DNN Pane & Module Components styling (optional) -->
<dnn:DnnCssInclude runat="server" FilePath="resources/css/dnn.css" Priority="100" PathNameAlias="SkinPath" />
<!-- Pre-compiled Tailwind CSS Loads in <head> -->
<dnn:DnnCssInclude runat="server" FilePath="resources/css/tailwind.css" Priority="1" PathNameAlias="SkinPath" />

<!-- Tailwind CSS Browser Runtime: compiles Tailwind classes in the browser from the <style> block below -->
<dnn:DnnJsInclude runat="server" FilePath="resources/js/tailwind4.js" Priority="100" PathNameAlias="SkinPath" ForceProvider="DnnFormBottomProvider" />
<dnn:DnnJsInclude runat="server" FilePath="resources/js/lucide.min.js" Priority="100" PathNameAlias="SkinPath" ForceProvider="DnnFormBottomProvider" />

<!-- Initialize Lucide icons. Wait for DOMContentLoaded so the body-bottom lucide.min.js has executed. -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) lucide.createIcons();
  });
</script>