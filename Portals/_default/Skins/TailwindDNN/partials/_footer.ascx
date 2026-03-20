<footer class="footer-section bg-gray-900 text-gray-300 text-sm leading-relaxed">
    <!-- Accent Bar -->
    <div class="h-1 bg-linear-to-r from-slate-600 to-cyan-700"></div>

    <!-- Footer Content -->
    <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">

            <!-- Left: Nav Links -->
            <div class="flex flex-col gap-4">
                <nav>
                    <dnn:MENU runat="server" id="dnnMENU_Footer" MenuStyle="menus/footer" NodeSelector="*,0,1" />
                </nav>

                <!-- Terms / Privacy -->
                <div class="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                    <dnn:TERMS runat="server" id="dnnTerms" CssClass="text-gray-300 no-underline transition-colors duration-150 hover:text-white" />
                    <span class="text-white/30">|</span>
                    <dnn:PRIVACY runat="server" id="dnnPrivacy" CssClass="text-gray-300 no-underline transition-colors duration-150 hover:text-white" />
                </div>

                <!-- Copyright -->
                <div class="text-sm text-gray-300">
                    <dnn:COPYRIGHT runat="server" id="dnnCopyright" CssClass="inline" />
                </div>
            </div>

            <!-- Right: Logo watermark -->
            <div class="hidden lg:block">
                <dnn:LOGO runat="server" id="dnnLOGO_Footer" CssClass="h-32 w-auto opacity-30" />
            </div>
        </div>
    </div>
</footer>
