# RouteContext

## Why it exists

DNN uses a flat role system - a user either has a role or doesn't, globally. This breaks when users have **different roles in different communities**. For example, a user can be a "Community Manager" in Hoeksche Waard but just a "Lid" (member) in Bond.

DNN's HTTP pipeline checks `TabPermission` before any module or Razor code runs. If a page is locked to "Community Manager", a user who is a Lid in one community gets blocked from that page in **all** communities - even the ones where they are a Community Manager.

### The solution: two-layer security

1. **DNN layer** - All dynamic-route tabs (`[community]`, `[company]`, etc.) auto-provision VIEW for "Registered Users" so the HTTP pipeline lets authenticated users through.
2. **RouteContext layer** - On every request, RouteContext validates community membership and checks the user's role **within that specific community** (from `UserCommunity`, not DNN's `UserRoles`) against the tab's `TabPermission` entries. The user does not need to have the DNN role directly assigned - only a matching `UserCommunity.RoleID` entry.

## How it works

### Request flow

```
HTTP Request → DNN Pipeline (Registered Users = pass) → RouteContext.Current
```

`RouteContext.Current` is called by Razor views and modules. On first access per request, it runs `Resolve()`:

1. **Route check** - `RouteActive` must be set by `Bond.DynamicRoutes` HTTP module (meaning the URL matched a slug pattern like `[community]/home`).
2. **Community validation** - Looks up `[community]` slug in the `Community` table. Returns null if not found.
3. **Membership check** - Queries `UserCommunity` to verify the user belongs to this community. SuperUsers bypass this. If not a member → **403 redirect**.
4. **Role resolution** - Queries `UserCommunity JOIN Roles` to get the user's role in this specific community (e.g. "Community Manager" or "Lid"). Stored in `CommunityRoleId` / `CommunityRoleName`. The role comes from `UserCommunity`, **not** from DNN's global `UserRoles` table.
5. **Tab-level role check** - If the tab has VIEW for any community-scoped role (a role used in `UserCommunity`), the user's community role must match. If no community role has VIEW on the tab, any community member is allowed through. If denied → **403 redirect**.
6. **Company validation** - If `[company]` is in the route, looks it up in the `Company` table.

### Auto-provisioning permissions

`EnsureTabPermissions()` runs once per app pool lifecycle (first request after recycle). It finds every top-level tab whose `TabPath` starts with `//[` (e.g. `//[community]`, `//[company]`) and collects all their descendants. Then it:

- **Registered Users VIEW** - Inserts `AllowAccess = 1` VIEW for "Registered Users" on each tab. This is the DNN pipeline passthrough so authenticated users are not blocked before RouteContext runs.

The SQL is idempotent - `NOT EXISTS` prevents duplicates.

**Community-role VIEW permissions are NOT auto-provisioned.** They must be configured via the DNN admin UI (Pages → select tab → Permissions).

#### Example: restricting manage pages

To allow only "Community Manager" on `/[community]/manage/*`:

1. Go to DNN Admin → Pages → the manage tab
2. Add VIEW **Allow** for the "Community Manager" role
3. Do NOT add VIEW for "Lid" - Lid users will be denied because the tab is restricted

#### How restricted vs unrestricted works

| Tab has VIEW for a community role? | Behavior |
|---|---|
| **No** (e.g. `home`) | Any community member can access (unrestricted) |
| **Yes** (e.g. `manage` has Community Manager) | Only that specific role can access (restricted) |

### Access denied

When a user fails any check, `DenyAccess()` redirects to DNN's built-in access denied page (`Globals.AccessDeniedURL()`), which shows the yellow "You do not have access" banner within the site skin.

## Properties

| Property | Type | Description |
|---|---|---|
| `CommunityId` | `int` | Database ID of the matched community |
| `CommunitySlug` | `string` | URL slug (e.g. `hoeksche-waard`) |
| `CommunityName` | `string` | Display name (e.g. `Hoeksche Waard`) |
| `CommunityRoleId` | `int` | User's role ID in this community |
| `CommunityRoleName` | `string` | User's role name (e.g. `Community Manager`, `Lid`) |
| `CompanySlug` | `string` | Company slug if `[company]` is in the route |
| `CompanyName` | `string` | Company display name |

## Usage in Razor

```csharp
var rc = DZP.RouteContext.RouteContext.Current;
if (rc == null) { /* route not active or access denied */ return; }

var communityName = rc.CommunityName;
var userRole = rc.CommunityRoleName;
```

## Key methods

| Method | Description |
|---|---|
| `RouteContext.Current` | Per-request singleton. Resolves and caches the route context. Returns `null` if route is inactive or validation failed. |
| `EnsureTabPermissions()` | Runs once per app pool. Auto-provisions Registered Users VIEW on every `//[…]` descendant tab. Community role permissions are set via DNN admin. |
| `IsCommunityRoleAllowedOnTab()` | If the tab has VIEW for any community role, the user's role must match. If no community role has VIEW, any member is allowed. |
| `LookupCommunityRole()` | Gets the user's `RoleID` / `RoleName` from `UserCommunity JOIN Roles` for a specific community. |
| `IsUserInCommunity()` | Returns true if the user has a row in `UserCommunity` for the given community. |
| `DenyAccess()` | Redirects to DNN's built-in access-denied page (`Globals.AccessDeniedURL()`). |

## Static helpers

| Method | Description |
|---|---|
| `GetAllCommunities()` | Returns all communities (for dashboards) |
| `GetUserCommunities(user)` | Returns communities the user belongs to (all for SuperUsers) |

## Database tables used

- `Community` - community definitions (CommunityID, Slug, Name)
- `UserCommunity` - user↔community membership with RoleID FK to DNN `Roles`
- `Company` - company definitions (Slug, Name)
- `Tabs` - DNN page tree
- `TabPermission` / `Permission` - DNN page-level access control
- `Roles` - DNN role definitions

## Build

```
dotnet build debug.csproj --configuration Debug
```

Output: `bin\DZP.RouteContext.dll`

After building, recycle the IIS app pool to load the new DLL.
