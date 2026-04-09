-- ═══════════════════════════════════════════════════════════════
--  Migration: Rename Community.CommunityID → Id
--             Rename UserCommunity PK to Id,
--             UserID → UserId, CommunityID → CommunityId, RoleID → RoleId
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Community: CommunityID → Id ──

-- Drop FK from UserCommunity → Community
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserCommunity_Community')
    ALTER TABLE [dbo].[UserCommunity] DROP CONSTRAINT [FK_UserCommunity_Community];

-- Drop FK from CommunityGroups → Community
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_CommunityGroups_Community')
    ALTER TABLE [dbo].[CommunityGroups] DROP CONSTRAINT [FK_CommunityGroups_Community];

-- Drop PK
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'PK_Community')
    ALTER TABLE [dbo].[Community] DROP CONSTRAINT [PK_Community];

-- Rename column
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Community') AND name = 'CommunityID')
    EXEC sp_rename 'Community.CommunityID', 'Id', 'COLUMN';

-- Re-create PK
ALTER TABLE [dbo].[Community] ADD CONSTRAINT [PK_Community] PRIMARY KEY ([Id]);

-- Re-create FK from CommunityGroups
ALTER TABLE [dbo].[CommunityGroups]
    ADD CONSTRAINT [FK_CommunityGroups_Community] FOREIGN KEY ([CommunityId])
        REFERENCES [dbo].[Community]([Id]);

-- ── 2. UserCommunity: rename columns + add Id PK ──

-- Drop FK to Roles
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserCommunity_Roles')
    ALTER TABLE [dbo].[UserCommunity] DROP CONSTRAINT [FK_UserCommunity_Roles];

-- Drop FK to Users
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserCommunity_Users')
    ALTER TABLE [dbo].[UserCommunity] DROP CONSTRAINT [FK_UserCommunity_Users];

-- Drop composite PK
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'PK_UserCommunity')
    ALTER TABLE [dbo].[UserCommunity] DROP CONSTRAINT [PK_UserCommunity];

-- Rename columns
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserCommunity') AND name = 'UserID')
    EXEC sp_rename 'UserCommunity.UserID', 'UserId', 'COLUMN';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserCommunity') AND name = 'CommunityID')
    EXEC sp_rename 'UserCommunity.CommunityID', 'CommunityId', 'COLUMN';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserCommunity') AND name = 'RoleID')
    EXEC sp_rename 'UserCommunity.RoleID', 'RoleId', 'COLUMN';

-- Add Id identity column if not exists
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserCommunity') AND name = 'Id')
    ALTER TABLE [dbo].[UserCommunity] ADD [Id] INT IDENTITY(1,1) NOT NULL;

-- New PK on Id
ALTER TABLE [dbo].[UserCommunity] ADD CONSTRAINT [PK_UserCommunity] PRIMARY KEY ([Id]);

-- Unique constraint on (UserId, CommunityId)
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_UserCommunity_User_Community')
    ALTER TABLE [dbo].[UserCommunity] ADD CONSTRAINT [UQ_UserCommunity_User_Community] UNIQUE ([UserId], [CommunityId]);

-- Re-create FKs
ALTER TABLE [dbo].[UserCommunity]
    ADD CONSTRAINT [FK_UserCommunity_Users] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users]([UserID]);

ALTER TABLE [dbo].[UserCommunity]
    ADD CONSTRAINT [FK_UserCommunity_Community] FOREIGN KEY ([CommunityId])
        REFERENCES [dbo].[Community]([Id]);

ALTER TABLE [dbo].[UserCommunity]
    ADD CONSTRAINT [FK_UserCommunity_Roles] FOREIGN KEY ([RoleId])
        REFERENCES [dbo].[Roles]([RoleID]);

PRINT 'Migration complete';
