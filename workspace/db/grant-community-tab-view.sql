-- ═══════════════════════════════════════════════════════════════
--  Grant community tab permissions:
--  1. "Registered Users" VIEW on ALL community tabs
--     (lets DNN HTTP pipeline pass — RouteContext enforces access)
--  2. "Community Manager" VIEW on manage tabs only
--     (RouteContext checks: if a tab has community-role VIEW,
--      the user's role in that community must match)
-- ═══════════════════════════════════════════════════════════════

DECLARE @PortalID INT = 0;

-- Resolve IDs
DECLARE @RegUsersRoleID INT = (
    SELECT RoleID FROM Roles
    WHERE PortalID = @PortalID AND RoleName = 'Registered Users'
);
DECLARE @CMRoleID INT = (
    SELECT RoleID FROM Roles
    WHERE PortalID = @PortalID AND RoleName = 'Community Manager'
);
DECLARE @ViewPermID INT = (
    SELECT PermissionID FROM Permission
    WHERE PermissionCode = 'SYSTEM_TAB' AND PermissionKey = 'VIEW'
);
DECLARE @CommunityTabID INT = (
    SELECT TabID FROM Tabs
    WHERE PortalID = @PortalID AND TabPath = '//[community]' AND IsDeleted = 0
);
DECLARE @ManageTabID INT = (
    SELECT TabID FROM Tabs
    WHERE PortalID = @PortalID AND TabPath = '//[community]//manage' AND IsDeleted = 0
);

-- Bail out if anything is missing
IF @RegUsersRoleID IS NULL OR @CMRoleID IS NULL OR @ViewPermID IS NULL
   OR @CommunityTabID IS NULL OR @ManageTabID IS NULL
BEGIN
    PRINT 'ERROR: Could not resolve one or more required IDs.';
    PRINT '  @RegUsersRoleID  = ' + ISNULL(CAST(@RegUsersRoleID AS VARCHAR), 'NULL');
    PRINT '  @CMRoleID        = ' + ISNULL(CAST(@CMRoleID AS VARCHAR), 'NULL');
    PRINT '  @ViewPermID      = ' + ISNULL(CAST(@ViewPermID AS VARCHAR), 'NULL');
    PRINT '  @CommunityTabID  = ' + ISNULL(CAST(@CommunityTabID AS VARCHAR), 'NULL');
    PRINT '  @ManageTabID     = ' + ISNULL(CAST(@ManageTabID AS VARCHAR), 'NULL');
    RETURN;
END;

-- ═══════════════════════════════════════════════════════════════
--  PART 1: "Registered Users" VIEW on ALL community descendant tabs
-- ═══════════════════════════════════════════════════════════════
;WITH AllDescendants AS (
    SELECT TabID FROM Tabs WHERE TabID = @CommunityTabID AND IsDeleted = 0
    UNION ALL
    SELECT t.TabID FROM Tabs t INNER JOIN AllDescendants d ON t.ParentId = d.TabID WHERE t.IsDeleted = 0
)
INSERT INTO TabPermission
    (TabID, PermissionID, AllowAccess, RoleID, UserID,
     CreatedByUserID, CreatedOnDate, LastModifiedByUserID, LastModifiedOnDate)
SELECT
    d.TabID, @ViewPermID, 1, @RegUsersRoleID, NULL,
    -1, GETDATE(), -1, GETDATE()
FROM AllDescendants d
WHERE NOT EXISTS (
    SELECT 1 FROM TabPermission tp
    WHERE tp.TabID = d.TabID AND tp.PermissionID = @ViewPermID
      AND tp.RoleID = @RegUsersRoleID AND tp.AllowAccess = 1
);
PRINT 'Part 1 — Registered Users VIEW: inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';

-- ═══════════════════════════════════════════════════════════════
--  PART 2: "Community Manager" VIEW on manage tab + descendants
--  This tells RouteContext that manage pages are restricted to
--  users whose community role is "Community Manager".
-- ═══════════════════════════════════════════════════════════════
;WITH ManageDescendants AS (
    SELECT TabID FROM Tabs WHERE TabID = @ManageTabID AND IsDeleted = 0
    UNION ALL
    SELECT t.TabID FROM Tabs t INNER JOIN ManageDescendants d ON t.ParentId = d.TabID WHERE t.IsDeleted = 0
)
INSERT INTO TabPermission
    (TabID, PermissionID, AllowAccess, RoleID, UserID,
     CreatedByUserID, CreatedOnDate, LastModifiedByUserID, LastModifiedOnDate)
SELECT
    d.TabID, @ViewPermID, 1, @CMRoleID, NULL,
    -1, GETDATE(), -1, GETDATE()
FROM ManageDescendants d
WHERE NOT EXISTS (
    SELECT 1 FROM TabPermission tp
    WHERE tp.TabID = d.TabID AND tp.PermissionID = @ViewPermID
      AND tp.RoleID = @CMRoleID AND tp.AllowAccess = 1
);
PRINT 'Part 2 — Community Manager VIEW on manage: inserted ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows.';

