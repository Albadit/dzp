-- =============================================================
-- Module 7413 (ItemId 2) — Admin > Communities user assignment
-- Remove all UserRoles manipulation from insert/update/delete/bulkdelete
-- =============================================================
DECLARE @json7413 NVARCHAR(MAX) = (
    SELECT CAST(Description AS NVARCHAR(MAX))
    FROM AdvancedTable_Items WHERE ItemId = 2);

-- QueryInsert: keep UserCommunity insert, remove UserRoles insert
SET @json7413 = JSON_MODIFY(@json7413, '$.QueryInsert',
    N'DECLARE @lidRid INT = (SELECT RoleID FROM Roles WHERE RoleName = ''Lid'' AND PortalID = 0);' + CHAR(13)+CHAR(10) +
    N'INSERT INTO UserCommunity (UserID, CommunityID, RoleID)' + CHAR(13)+CHAR(10) +
    N'SELECT CAST(@UserID AS INT), CAST(value AS INT), @lidRid' + CHAR(13)+CHAR(10) +
    N'FROM STRING_SPLIT(@CommunityID, '','' )' + CHAR(13)+CHAR(10) +
    N'WHERE RTRIM(LTRIM(value)) <> ''''');

-- QueryUpdate: keep UserCommunity delete+re-insert, remove UserRoles logic
SET @json7413 = JSON_MODIFY(@json7413, '$.QueryUpdate',
    N'DECLARE @lidRid INT = (SELECT RoleID FROM Roles WHERE RoleName = ''Lid'' AND PortalID = 0);' + CHAR(13)+CHAR(10) +
    N'DELETE FROM UserCommunity WHERE UserID = CAST(@pk AS INT);' + CHAR(13)+CHAR(10) +
    N'INSERT INTO UserCommunity (UserID, CommunityID, RoleID)' + CHAR(13)+CHAR(10) +
    N'SELECT CAST(@UserID AS INT), CAST(value AS INT), @lidRid' + CHAR(13)+CHAR(10) +
    N'FROM STRING_SPLIT(@CommunityID, '','' )' + CHAR(13)+CHAR(10) +
    N'WHERE RTRIM(LTRIM(value)) <> ''''');

-- QueryDelete: just delete from UserCommunity
SET @json7413 = JSON_MODIFY(@json7413, '$.QueryDelete',
    N'DELETE FROM UserCommunity WHERE UserID = CAST(@pk AS INT)');

-- QueryBulkDelete: just bulk delete from UserCommunity
SET @json7413 = JSON_MODIFY(@json7413, '$.QueryBulkDelete',
    N'DELETE FROM UserCommunity WHERE UserID IN ({ids})');

UPDATE AdvancedTable_Items SET Description = @json7413 WHERE ItemId = 2;
PRINT 'Module 7413 (ItemId 2) updated — ' + CAST(@@ROWCOUNT AS VARCHAR) + ' row(s)';

-- =============================================================
-- Module 8417 (ItemId 1002) — [community]/manage/users
-- Remove all UserRoles manipulation from insert/update/delete/bulkdelete
-- =============================================================
DECLARE @json8417 NVARCHAR(MAX) = (
    SELECT CAST(Description AS NVARCHAR(MAX))
    FROM AdvancedTable_Items WHERE ItemId = 1002);

-- QueryInsert: keep UserCommunity insert, remove UserRoles insert
SET @json8417 = JSON_MODIFY(@json8417, '$.QueryInsert',
    N'DECLARE @rid INT = (SELECT RoleID FROM Roles WHERE RoleName = @RoleName AND PortalID = 0);' + CHAR(13)+CHAR(10) +
    N'INSERT INTO UserCommunity (UserID, CommunityID, RoleID) VALUES (@UserID, @rc_CommunityId, @rid)');

-- QueryUpdate: just update UserCommunity.RoleID, no UserRoles sync
SET @json8417 = JSON_MODIFY(@json8417, '$.QueryUpdate',
    N'DECLARE @newRid INT = (SELECT RoleID FROM Roles WHERE RoleName = @RoleName AND PortalID = 0);' + CHAR(13)+CHAR(10) +
    N'UPDATE UserCommunity SET RoleID = @newRid WHERE UserID = @pk AND CommunityID = @rc_CommunityId');

-- QueryDelete: just delete from UserCommunity
SET @json8417 = JSON_MODIFY(@json8417, '$.QueryDelete',
    N'DELETE FROM UserCommunity WHERE UserID = @pk AND CommunityID = @rc_CommunityId');

-- QueryBulkDelete: just bulk delete from UserCommunity
SET @json8417 = JSON_MODIFY(@json8417, '$.QueryBulkDelete',
    N'DELETE FROM UserCommunity WHERE UserID IN ({ids}) AND CommunityID = @rc_CommunityId');

UPDATE AdvancedTable_Items SET Description = @json8417 WHERE ItemId = 1002;
PRINT 'Module 8417 (ItemId 1002) updated — ' + CAST(@@ROWCOUNT AS VARCHAR) + ' row(s)';
