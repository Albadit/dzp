# Dynamic Segment Routing (Next.js convention)

HTTP module for DNN that walks the page tree recursively, matching URL segments
to either literal child pages or **dynamic segments** — DNN pages named with
brackets like `[community]`, `[company]`.

No explicit template registration needed. The brackets are self-identifying:
any page whose name matches `[param]` is automatically treated as a dynamic
route segment.

## How It Works

1. URL contains a file extension → **skip** (static file)
2. First segment is a physical directory on disk → **skip** (auto-detected)
3. All segments resolve to real DNN pages → **skip** (let DNN handle it)
4. First segment matches a non-dynamic root page but children don't resolve → **404**
5. First segment is a child of a dynamic root page (standalone) → **rewrite** to parent
6. Otherwise walk the DNN page tree: match each segment as a literal child page
   or a dynamic segment (captures the segment value) → **rewrite** to the resolved path

### Access Control

- After authentication, the module checks community membership via the
  `UserCommunity` / `Community` tables. Non-members get redirected.
- Superusers always have access.

### Post-Login Redirect

After login, users are redirected to `/{community-slug}/home` based on their
first community membership instead of the default DNN landing page.

### Example

Given dynamic pages `[community]` and `[company]`, the URL
`/keizerswaard/bond/dashboard` resolves as:

| Segment | Match | Result |
|---------|-------|--------|
| `keizerswaard` | `[community]` (dynamic) | `Items["community"] = "keizerswaard"` |
| `bond` | `[company]` (dynamic) | `Items["company"] = "bond"` |
| `dashboard` | literal child page | — |

Rewritten path: `/[community]/[company]/dashboard`

| URL | Result |
|-----|--------|
| `/keizerswaard` | Rewrites to `/[community]` |
| `/keizerswaard/dashboard` | Rewrites to `/[community]/dashboard` |
| `/keizerswaard/bond` | Rewrites to `/[community]/[company]` |
| `/dashboard` | Standalone → rewrites to `/[community]/dashboard` |
| `/admin` | Skipped (reserved prefix) |
| `/some-real-page` | Skipped (existing DNN page) |

## Files

| File | Purpose |
|------|---------|
| `RouteConfig.cs` | `IHttpModule` — intercepts, validates, and rewrites URLs |
| `RouteConfigFix.cs` | Companion `IHttpModule` — cancels DNN's 301 redirect for slug routes |
| `Constants.cs` | `IsDynamic()` / `ParamName()` / `IsSystemPrefix()` helpers |
| `Data/Community.cs` | `ISegment` implementation — slug validation, access control, template redirect |
| `Data/ISegment.cs` | Interface for dynamic segment repositories |
| `Models/DzpContext.cs` | Per-request state (lazy singleton via `HttpContext.Items`) |
| `web.config` (modules section) | Module registration order: RouteConfig → UrlRewrite → RouteConfigFix |
| `debug.csproj` (workspace root) | Compiles all `.cs` files into `bin/DnnDev.Debug.dll` |

## Prerequisites

- Dynamic pages (e.g. **[community]**, **[company]**) must exist as DNN pages
- Child pages (e.g. **dashboard**) should exist under the appropriate dynamic page
- The `Community`, `UserCommunity`, and `Users` tables must exist for access control

## Setup Steps

### 1. Create Dynamic Pages

Create DNN pages with bracket names like `[community]`, `[company]`.
The module auto-detects any page matching `[param]` as a dynamic segment.

### 2. Build

```powershell
dotnet build debug.csproj --configuration Debug
```

Or press **Ctrl+Shift+B** in VS Code (runs the `build-debug` task).

### 3. Verify web.config Registration

Three modules must be registered in this exact order:

```xml
<modules>
  <add name="ServiceRequestScopeModule" ... />
  <add name="RequestFilter" ... />
  <add name="RouteConfig"
       type="DnnDev.Routing.RouteConfig, DnnDev.Debug"
       preCondition="managedHandler" />
  <add name="UrlRewrite" ... />
  <add name="RouteConfigFix"
       type="DnnDev.Routing.RouteConfigFix, DnnDev.Debug"
       preCondition="managedHandler" />
</modules>
```

**Order matters:**
- **RouteConfig** fires first in `BeginRequest` — resolves slug URLs and rewrites to `TabId`
- **UrlRewrite** (DNN) fires next — may 301-redirect because the canonical friendly URL
  doesn't match the browser's URL (DNN strips brackets from `[param]` page names)
- **RouteConfigFix** fires last — detects and cancels DNN's 301 redirect for slug routes,
  re-applies the rewrite, and lets the pipeline continue normally

### 4. Recycle the App Pool

```powershell
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" recycle apppool "DNN_dnndev"
```

Or run the **recycle-dnn** task in VS Code.

## Reading Route Values

Route values are stored in `HttpContext.Items` keyed by param name (without brackets):

```csharp
// In a DNN module or skin
var community = HttpContext.Current.Items["community"] as string;
var company   = HttpContext.Current.Items["company"] as string;
var keys      = HttpContext.Current.Items["RouteKeys"] as string[];
var isRouted  = HttpContext.Current.Items["RouteActive"] != null;
var original  = HttpContext.Current.Items["RouteOriginalPath"] as string;
```

```csharp
// In a 2sxc Razor template
var community = System.Web.HttpContext.Current.Items["community"] as string;
```

| Key | Type | Description |
|-----|------|-------------|
| `community` | `string` | The captured community slug value |
| `company` | `string` | The captured company slug value |
| `RouteKeys` | `string[]` | All matched param names |
| `RouteActive` | `bool` | `true` when routing was applied |
| `RouteOriginalPath` | `string` | Original URL path before rewriting |

## Defining Nav Sections

In `_route-dzp.ascx`, use bracket placeholders in URLs:

```csharp
static readonly SidebarSection[] NavSections = {
    new SidebarSection("Community",
        N("/[community]/home",     "home"),
        N("/[community]/timeline", "message-square-text")
    ),
};
```

The sidebar resolves `[community]` to the actual slug at runtime.

## Adding a New Dynamic Segment

1. Create a DNN page named `[param]` (e.g. `[project]`) at the desired level
2. That's it — the module detects it automatically
3. Read the value: `HttpContext.Current.Items["project"]`

## Physical Directory Detection

The routing module auto-detects physical directories in the web root at runtime
using `Directory.Exists`. Any URL whose first segment matches a physical folder
(e.g. `/portals/...`, `/api/...`, `/admin/...`) is skipped automatically.

No manual list to maintain — new directories from DNN updates are detected
automatically. DNN system URLs like `/login` and `/register` that have no
physical directory are handled safely: they fail `IsValidSlug` and fall through
to DNN's own URL handling.

## Debug Logging

Set the constant in `RouteConfig.cs` to enable file-based logging:

```csharp
private const bool EnableLogging = true;
```

Logs are written to `App_Data/RouteConfig.log`. Disable for production.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on `/{slug}` | No dynamic page at root level | Create a `[param]` page in DNN |
| 404 on `/{slug}/child` | Child page doesn't exist | Create it as a DNN child page under `[param]` |
| Redirect on `/{slug}` | User not a member of the community | Add user to `UserCommunity` table |
| Redirect loop to `/dashboard` | Browser cached old 301 | Clear browser cache or use incognito |
| Existing page broken | Slug matches a real DNN page name | The module skips known DNN pages — check page name |
| Changes not picked up | Old DLL cached by IIS | Rebuild + recycle app pool |
| `RouteConfigFix` not intercepting | Module order wrong in web.config | Ensure order: RouteConfig → UrlRewrite → RouteConfigFix |
