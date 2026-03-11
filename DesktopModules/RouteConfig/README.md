# Recursive Slug-Based Routing

HTTP module for DNN that walks the page tree recursively, matching URL segments
to either literal child pages or **template pages** that capture slug values.

## How It Works

1. URL contains a file extension → **skip** (static file)
2. First segment is a reserved DNN prefix → **skip**
3. All segments resolve to real DNN pages → **skip** (let DNN handle it)
4. First segment matches a non-template root page but children don't resolve → **404**
5. Otherwise walk the DNN page tree: match each segment as a literal child page
   or a template page (captures the segment value) → **rewrite** to the resolved path

Template pages are DNN pages whose name appears in the `TemplatePages` set in
`RouteConfig.cs`. Any URL segment at a template position is accepted as a slug.

### Access Control

- After authentication, the module checks community membership via the
  `UserCommunity` / `Community` tables. Non-members get a 403.
- Superusers always have access.

### Post-Login Redirect

After login, users are redirected to `/{community-slug}/home` based on their
first community membership instead of the default DNN landing page.

### Example

Given template pages `community-slug` and `company-slug`, the URL
`/keizerswaard/bond/dashboard` resolves as:

| Segment | Match | Result |
|---------|-------|--------|
| `keizerswaard` | `community-slug` (template) | `Items["community-slug"] = "keizerswaard"` |
| `bond` | `company-slug` (template) | `Items["company-slug"] = "bond"` |
| `dashboard` | literal child page | — |

Rewritten path: `/community-slug/company-slug/dashboard`

| URL | Result |
|-----|--------|
| `/keizerswaard` | Rewrites to `/community-slug` |
| `/keizerswaard/dashboard` | Rewrites to `/community-slug/dashboard` |
| `/keizerswaard/bond` | Rewrites to `/community-slug/company-slug` |
| `/admin` | Skipped (reserved prefix) |
| `/some-real-page` | Skipped (existing DNN page) |

## Files

| File | Purpose |
|------|---------|
| `DesktopModules/RouteConfig/RouteConfig.cs` | `IHttpModule` — intercepts, validates, and rewrites URLs |
| `web.config` (modules section) | Module registration, placed **before** DNN's `UrlRewrite` |
| `debug.csproj` (workspace root) | Compiles all `.cs` files into `bin/DnnDev.Debug.dll` |

## Prerequisites

- Template pages (e.g. **community-slug**, **company-slug**) must exist as DNN pages
- Child pages (e.g. **dashboard**) should exist under the appropriate template page
- The `Community`, `UserCommunity`, and `Users` tables must exist for access control

## Setup Steps

### 1. Create Template Pages

Create DNN pages matching the names in the `TemplatePages` set. These pages act as
templates — the URL segment is captured as a route value instead of being matched literally.

### 2. Configure Template Pages

Edit `RouteConfig.cs` and update the `TemplatePages` set:

```csharp
private static readonly HashSet<string> TemplatePages =
    new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "community-slug",
        "company-slug",
        // Add more template page names here
    };
```

### 3. Build

```powershell
dotnet build debug.csproj --configuration Debug
```

Or press **Ctrl+Shift+B** in VS Code (runs the `build-debug` task).

### 4. Verify web.config Registration

The module must be registered **before** DNN's `UrlRewrite` module:

```xml
<modules>
  <add name="ServiceRequestScopeModule" ... />
  <add name="RequestFilter" ... />
  <add name="RouteConfig"
       type="DnnDev.Routing.RouteConfig, DnnDev.Debug"
       preCondition="managedHandler" />
  <add name="UrlRewrite" ... />
</modules>
```

**Order matters.** The module must fire before `UrlRewrite` so DNN doesn't 404 first.

### 5. Recycle the App Pool

```powershell
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" recycle apppool "DNN_dnndev"
```

Or run the **recycle-dnn** task in VS Code.

## Reading Route Values in Your Page

Route values are stored in `HttpContext.Items` keyed by template page name:

```csharp
// In a DNN module or skin
var community = HttpContext.Current.Items["community-slug"] as string;
var company   = HttpContext.Current.Items["company-slug"] as string;
var keys      = HttpContext.Current.Items["RouteKeys"] as string[];
var isRouted  = HttpContext.Current.Items["RouteActive"] != null;
var original  = HttpContext.Current.Items["RouteOriginalPath"] as string;
```

```csharp
// In a 2sxc Razor template
var community = System.Web.HttpContext.Current.Items["community-slug"] as string;
```

| Key | Type | Description |
|-----|------|-------------|
| `community-slug` | `string` | The captured community slug value |
| `company-slug` | `string` | The captured company slug value |
| `RouteKeys` | `string[]` | All matched template keys |
| `RouteActive` | `bool` | `true` when routing was applied |
| `RouteSlug` | `string` | First matched slug value (backward compat) |
| `RouteTemplate` | `string` | First matched template name (backward compat) |
| `RouteOriginalPath` | `string` | Original URL path before rewriting |

## Reserved Prefixes

These first-segment values are blocked to protect DNN system paths:

`admin`, `host`, `portals`, `desktopmodules`, `providers`, `resources`,
`install`, `api`, `icons`, `images`, `js`, `controls`, `bin`, `app_data`,
`config`, `login`, `register`, `logoff`, `default`, `error`, `keepalive`

Edit `IsReservedPrefix()` in `RouteConfig.cs` to add more.

## Debug Logging

Set the constant in `RouteConfig.cs` to enable file-based logging:

```csharp
private const bool EnableLogging = true;
```

Logs are written to `App_Data/RouteConfig.log`. Disable for production.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 404 on `/{slug}` | No template page matches | Ensure template pages exist and are in `TemplatePages` |
| 404 on `/{slug}/child` | Child page doesn't exist under the template page | Create it as a DNN child page |
| 403 on `/{slug}` | User not a member of the community | Add user to `UserCommunity` table |
| Existing page broken | Slug matches a real DNN page name | The module skips known DNN pages — check page name |
| Changes not picked up | Old DLL cached by IIS | Rebuild + recycle app pool |
| Module order wrong | DNN 404s before module fires | Ensure `RouteConfig` appears **before** `UrlRewrite` in web.config |
