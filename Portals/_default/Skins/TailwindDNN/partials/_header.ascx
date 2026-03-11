<header class="sticky top-0 z-50">
    <!-- Top Bar: User/Login -->
    <div class="hidden lg:block bg-slate-800 text-white">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-10 items-center justify-end gap-4 text-sm">
                <dnn:LOGIN runat="server" id="dnnLogin" CssClass="text-white hover:text-cyan-300 transition-colors font-medium" />
                <dnn:USER runat="server" id="dnnUser" CssClass="text-cyan-300 hover:text-white transition-colors" />
            </div>
        </div>
    </div>

    <!-- Main Header: Logo + Nav -->
    <div class="bg-slate-700">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-20 items-center justify-between">

                <!-- Logo -->
                <div class="flex shrink-0 items-center">
                    <dnn:LOGO runat="server" id="dnnLOGO" CssClass="h-12 w-auto" />
                </div>

                <!-- Desktop Navigation -->
                <nav class="hidden lg:flex lg:items-center lg:gap-2" aria-label="Main Navigation">
                    <dnn:MENU runat="server" id="dnnMENU" MenuStyle="menus/header" NodeSelector="*,0,2" />
                </nav>

                <!-- Mobile Menu Button -->
                <button type="button"
                        class="hamburger lg:hidden"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                        onclick="this.classList.toggle('open'); var m=document.getElementById('mobile-menu'); m.classList.toggle('open'); this.setAttribute('aria-expanded', m.classList.contains('open'));">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <div id="mobile-menu" class="lg:hidden bg-slate-700">
        <div class="flex lg:hidden p-4">
            <dnn:MENU runat="server" id="dnnMENU_Mobile" MenuStyle="menus/header" NodeSelector="*,0,2" />
        </div>
        <div class="lg:hidden border-t border-white/10 px-4 py-3">
            <div class="flex items-center gap-3 text-sm">
                <dnn:USER runat="server" id="dnnUser_Mobile" CssClass="text-white/70" />
                <dnn:LOGIN runat="server" id="dnnLogin_Mobile" CssClass="text-cyan-300 text-xs font-medium" />
            </div>
        </div>
    </div>
</header>

<script>
(function(){
    var mql = window.matchMedia('(min-width: 1024px)');
    function closeMobile(){
        if(!mql.matches) return;
        var btn = document.querySelector('.hamburger');
        var menu = document.getElementById('mobile-menu');
        if(btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
        if(menu) menu.classList.remove('open');
    }
    mql.addEventListener('change', closeMobile);
})();
</script>
