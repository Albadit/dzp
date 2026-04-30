-- Manual fix: create the stored procedures and table with underscore names
-- Run this directly against the DZP database, then delete this file.

-- Drop old AdvancedTable_* objects (original module name)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_GetItems]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTable_GetItems]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_GetItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTable_GetItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_AddItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTable_AddItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_UpdateItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTable_UpdateItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_DeleteItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTable_DeleteItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTable_Items]') AND type in (N'U'))
    DROP TABLE dbo.[AdvancedTable_Items]
GO

-- Drop old AdvancedTableDZP_* objects (if they exist)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_GetItems]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTableDZP_GetItems]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_GetItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTableDZP_GetItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_AddItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTableDZP_AddItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_UpdateItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTableDZP_UpdateItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_DeleteItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[AdvancedTableDZP_DeleteItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[AdvancedTableDZP_Items]') AND type in (N'U'))
    DROP TABLE dbo.[AdvancedTableDZP_Items]
GO

-- Drop old dot-named objects from the failed install (if they exist)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_GetItems]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn.Modules.TableDZP_GetItems]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_GetItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn.Modules.TableDZP_GetItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_AddItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn.Modules.TableDZP_AddItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_UpdateItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn.Modules.TableDZP_UpdateItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_DeleteItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn.Modules.TableDZP_DeleteItem]
GO
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn.Modules.TableDZP_Items]') AND type in (N'U'))
    DROP TABLE dbo.[Dnn.Modules.TableDZP_Items]
GO

-- Create table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn_Modules_TableDZP_Items]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.[Dnn_Modules_TableDZP_Items] (
        ItemId              INT IDENTITY(1,1)   NOT NULL,
        ModuleId            INT                 NOT NULL,
        Title               NVARCHAR(256)       NOT NULL,
        Description         NVARCHAR(MAX)       NULL,
        CreatedByUserId     INT                 NOT NULL,
        CreatedOnDate       DATETIME            NOT NULL DEFAULT GETDATE(),
        LastModifiedByUserId INT                NULL,
        LastModifiedOnDate  DATETIME            NULL,
        CONSTRAINT [PK_Dnn_Modules_TableDZP_Items] PRIMARY KEY (ItemId)
    )
END
GO

-- GetItems
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn_Modules_TableDZP_GetItems]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn_Modules_TableDZP_GetItems]
GO
a
CREATE PROCEDURE dbo.[Dnn_Modules_TableDZP_GetItems]
    @ModuleId INT
AS
BEGIN
    SELECT ItemId, ModuleId, Title, [Description],
           CreatedByUserId, CreatedOnDate,
           LastModifiedByUserId, LastModifiedOnDate
    FROM dbo.[Dnn_Modules_TableDZP_Items]
    WHERE ModuleId = @ModuleId
    ORDER BY CreatedOnDate DESC
END
GO

-- GetItem
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn_Modules_TableDZP_GetItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn_Modules_TableDZP_GetItem]
GO

CREATE PROCEDURE dbo.[Dnn_Modules_TableDZP_GetItem]
    @ItemId   INT,
    @ModuleId INT
AS
BEGIN
    SELECT ItemId, ModuleId, Title, [Description],
           CreatedByUserId, CreatedOnDate,
           LastModifiedByUserId, LastModifiedOnDate
    FROM dbo.[Dnn_Modules_TableDZP_Items]
    WHERE ItemId = @ItemId AND ModuleId = @ModuleId
END
GO

-- AddItem
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn_Modules_TableDZP_AddItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn_Modules_TableDZP_AddItem]
GO

CREATE PROCEDURE dbo.[Dnn_Modules_TableDZP_AddItem]
    @ModuleId        INT,
    @Title           NVARCHAR(256),
    @Description     NVARCHAR(MAX),
    @CreatedByUserId INT,
    @CreatedOnDate   DATETIME
AS
BEGIN
    INSERT INTO dbo.[Dnn_Modules_TableDZP_Items]
        (ModuleId, Title, [Description], CreatedByUserId, CreatedOnDate)
    VALUES
        (@ModuleId, @Title, @Description, @CreatedByUserId, @CreatedOnDate)

    SELECT SCOPE_IDENTITY()
END
GO

-- UpdateItem
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.[Dnn_Modules_TableDZP_UpdateItem]') AND type in (N'P'))
    DROP PROCEDURE dbo.[Dnn_Modules_TableDZP_UpdateItem]
GO

CREATE PROCEDURE dbo.[Dnn_Modules_TableDZP_UpdateItem]
    @ItemId                 INT,
    @ModuleId               INT,
    @Title                  NVARCHAR(256),
    @Description            NVARCHAR(MAX),
    @LastModifiedByUserId   INT,
    @LastModifiedOnDate     DATETIME
AS
BEGIN
    UPDATE dbo.[Dnn_Modules_TableDZP_Items]
    SET Title                  = @Title,
        [Description]          = @Description,
        LastModifiedByUserId   = @LastModifiedByUserId,
        LastModifiedOnDate     = @LastModifiedOnDate
    WHERE ItemId = @ItemId AND ModuleId = @ModuleId
END
GO
