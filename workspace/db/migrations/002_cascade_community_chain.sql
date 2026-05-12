-- ═══════════════════════════════════════════════════════════════
--  Migration 002: ON DELETE CASCADE on the Community-rooted chain
--
--  After this runs, deleting a Community row automatically deletes
--  every dummy/blog/discover child via cascading FKs:
--
--      Community
--        ├── Company
--        │     └── UserCompany           (CASCADE on CompanyId)
--        ├── CommunityGroups
--        │     └── UserCommunityGroups   (CASCADE on CommunityGroupId)
--        ├── UserCommunity
--        │     └── UserCommunityRole     (CASCADE on UserCommunityId)
--        ├── CommunityDiscoverCategory
--        │     └── CommunityDiscoverButton (already CASCADE)
--        └── Dnn_Modules_Blog_Posts
--              ├── Dnn_Modules_Blog_Comments     (CASCADE on PostId)
--              ├── Dnn_Modules_Blog_PostGroups   (CASCADE on PostId)
--              └── Dnn_Modules_Blog_Questions    (CASCADE on PostId)
--                    ├── Dnn_Modules_Blog_QuestionOptions (CASCADE on QuestionId)
--                    └── Dnn_Modules_Blog_Answers         (CASCADE on QuestionId)
--
--  IMPORTANT (multi-cascade-path rule)
--    SQL Server forbids a table from being reachable via more than
--    one CASCADE path. UserCommunity, UserCommunityGroups, UserCompany
--    and Dnn_Modules_Blog_Answers all also reference Users.UserID. We
--    keep those Users-side FKs as NO ACTION so only the Community-side
--    deletes cascade. Deleting a real User still requires manual
--    cleanup (the existing seed-wijkcentra-clear.sql already does this).
--
--  Idempotent: each FK is dropped (if present) and recreated.
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @sql NVARCHAR(MAX);

-- ──────────────────────────────────────────────────────────────
-- Helper: drop every FK that references the target (parent_table,
-- parent_column) FROM the given (child_table, child_column).
-- Then recreate it with ON DELETE CASCADE.
-- ──────────────────────────────────────────────────────────────

DECLARE @fk SYSNAME, @ChildSchema SYSNAME, @ChildTable SYSNAME,
        @ChildCol SYSNAME, @ParentSchema SYSNAME, @ParentTable SYSNAME,
        @ParentCol SYSNAME;

DECLARE @work TABLE (
    ChildSchema  SYSNAME,
    ChildTable   SYSNAME,
    ChildCol     SYSNAME,
    ParentSchema SYSNAME,
    ParentTable  SYSNAME,
    ParentCol    SYSNAME
);

INSERT INTO @work VALUES
    -- Blog chain
    (N'dbo', N'Dnn_Modules_Blog_Posts',           N'CommunityId', N'dbo', N'Community',                    N'Id'),
    (N'dbo', N'Dnn_Modules_Blog_Comments',        N'PostId',      N'dbo', N'Dnn_Modules_Blog_Posts',       N'PostId'),
    (N'dbo', N'Dnn_Modules_Blog_PostGroups',      N'PostId',      N'dbo', N'Dnn_Modules_Blog_Posts',       N'PostId'),
    (N'dbo', N'Dnn_Modules_Blog_Questions',       N'PostId',      N'dbo', N'Dnn_Modules_Blog_Posts',       N'PostId'),
    (N'dbo', N'Dnn_Modules_Blog_QuestionOptions', N'QuestionId',  N'dbo', N'Dnn_Modules_Blog_Questions',   N'QuestionId'),
    (N'dbo', N'Dnn_Modules_Blog_Answers',         N'QuestionId',  N'dbo', N'Dnn_Modules_Blog_Questions',   N'QuestionId'),
    -- Community children
    (N'dbo', N'Company',                          N'CommunityId', N'dbo', N'Community',                    N'Id'),
    (N'dbo', N'CommunityGroups',                  N'CommunityId', N'dbo', N'Community',                    N'Id'),
    (N'dbo', N'UserCommunity',                    N'CommunityId', N'dbo', N'Community',                    N'Id'),
    -- Membership children
    (N'dbo', N'UserCommunityRole',                N'UserCommunityId', N'dbo', N'UserCommunity',            N'Id'),
    (N'dbo', N'UserCommunityGroups',              N'CommunityGroupId', N'dbo', N'CommunityGroups',         N'Id'),
    (N'dbo', N'UserCompany',                      N'CompanyId',   N'dbo', N'Company',                      N'Id');

DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
    SELECT ChildSchema, ChildTable, ChildCol, ParentSchema, ParentTable, ParentCol
    FROM @work;

OPEN cur;
FETCH NEXT FROM cur INTO @ChildSchema, @ChildTable, @ChildCol, @ParentSchema, @ParentTable, @ParentCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Skip if either table doesn't exist in this DB.
    IF OBJECT_ID(QUOTENAME(@ChildSchema) + N'.' + QUOTENAME(@ChildTable),  N'U') IS NULL
       OR OBJECT_ID(QUOTENAME(@ParentSchema) + N'.' + QUOTENAME(@ParentTable), N'U') IS NULL
    BEGIN
        PRINT N'-- skip (missing table): ' + @ChildTable + N'.' + @ChildCol + N' -> ' + @ParentTable + N'.' + @ParentCol;
        FETCH NEXT FROM cur INTO @ChildSchema, @ChildTable, @ChildCol, @ParentSchema, @ParentTable, @ParentCol;
        CONTINUE;
    END;

    -- Find existing FK(s) matching (child table/col -> parent table/col).
    DECLARE @fkNames TABLE (Name SYSNAME);
    DELETE FROM @fkNames;

    INSERT INTO @fkNames (Name)
    SELECT fk.name
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc
      ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns cc
      ON cc.object_id = fkc.parent_object_id AND cc.column_id = fkc.parent_column_id
    JOIN sys.columns pc
      ON pc.object_id = fkc.referenced_object_id AND pc.column_id = fkc.referenced_column_id
    WHERE fk.parent_object_id     = OBJECT_ID(QUOTENAME(@ChildSchema)  + N'.' + QUOTENAME(@ChildTable))
      AND fk.referenced_object_id = OBJECT_ID(QUOTENAME(@ParentSchema) + N'.' + QUOTENAME(@ParentTable))
      AND cc.name = @ChildCol
      AND pc.name = @ParentCol;

    DECLARE fkCur CURSOR LOCAL FAST_FORWARD FOR SELECT Name FROM @fkNames;
    OPEN fkCur;
    FETCH NEXT FROM fkCur INTO @fk;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'ALTER TABLE ' + QUOTENAME(@ChildSchema) + N'.' + QUOTENAME(@ChildTable)
                 + N' DROP CONSTRAINT ' + QUOTENAME(@fk) + N';';
        PRINT @sql;
        EXEC sp_executesql @sql;

        FETCH NEXT FROM fkCur INTO @fk;
    END;
    CLOSE fkCur;
    DEALLOCATE fkCur;

    -- Recreate as ON DELETE CASCADE (deterministic name).
    DECLARE @newName SYSNAME =
        N'FK_' + @ChildTable + N'_' + @ChildCol + N'__' + @ParentTable + N'_' + @ParentCol + N'__cascade';

    -- If a constraint by that exact name already exists (from a previous
    -- partial run), drop it before recreating.
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = @newName)
    BEGIN
        SET @sql = N'ALTER TABLE ' + QUOTENAME(@ChildSchema) + N'.' + QUOTENAME(@ChildTable)
                 + N' DROP CONSTRAINT ' + QUOTENAME(@newName) + N';';
        PRINT @sql;
        EXEC sp_executesql @sql;
    END;

    SET @sql =
        N'ALTER TABLE ' + QUOTENAME(@ChildSchema) + N'.' + QUOTENAME(@ChildTable)
      + N' WITH CHECK ADD CONSTRAINT ' + QUOTENAME(@newName)
      + N' FOREIGN KEY (' + QUOTENAME(@ChildCol) + N')'
      + N' REFERENCES '   + QUOTENAME(@ParentSchema) + N'.' + QUOTENAME(@ParentTable)
                          + N' (' + QUOTENAME(@ParentCol) + N')'
      + N' ON DELETE CASCADE;';
    PRINT @sql;
    EXEC sp_executesql @sql;

    FETCH NEXT FROM cur INTO @ChildSchema, @ChildTable, @ChildCol, @ParentSchema, @ParentTable, @ParentCol;
END;

CLOSE cur;
DEALLOCATE cur;

COMMIT TRANSACTION;

PRINT N'';
PRINT N'Migration 002 done. Verify with:';
PRINT N'   SELECT OBJECT_NAME(parent_object_id) AS ChildTbl, name, delete_referential_action_desc';
PRINT N'   FROM sys.foreign_keys WHERE delete_referential_action_desc = ''CASCADE'' ORDER BY ChildTbl;';
