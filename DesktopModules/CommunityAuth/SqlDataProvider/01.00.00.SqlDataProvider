-- ═══════════════════════════════════════════════════════════════
--  Schema: Community & UserCommunity
-- ═══════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Community' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[Community] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [Slug] NVARCHAR(256) NOT NULL,
    [Name] NVARCHAR(256) NOT NULL,
    [CreatedOn] DATETIME2 NOT NULL CONSTRAINT [DF_Community_CreatedOn] DEFAULT (GETUTCDATE()),
    CONSTRAINT [PK_Community] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_Community_Slug] UNIQUE ([Slug])
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCommunity' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[UserCommunity] (
    [Id] INT IDENTITY(1,1) NOT NULL,
    [UserId] INT NOT NULL,
    [CommunityId] INT NOT NULL,
    [RoleId] INT NULL,
    [CreatedOn] DATETIME2 NOT NULL CONSTRAINT [DF_UserCommunity_CreatedOn] DEFAULT (GETUTCDATE()),
    CONSTRAINT [PK_UserCommunity] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_UserCommunity_User_Community] UNIQUE ([UserId], [CommunityId]),
    CONSTRAINT [FK_UserCommunity_Users] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users]([UserID]),
    CONSTRAINT [FK_UserCommunity_Community] FOREIGN KEY ([CommunityId])
        REFERENCES [dbo].[Community]([Id]),
    CONSTRAINT [FK_UserCommunity_Roles] FOREIGN KEY ([RoleId])
        REFERENCES [dbo].[Roles]([RoleID])
);

-- ═══════════════════════════════════════════════════════════════
--  Schema: CommunityGroups & UserCommunityGroups
-- ═══════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CommunityGroups' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[CommunityGroups] (
    [Id]          INT            IDENTITY(1,1) NOT NULL,
    [CommunityId] INT           NOT NULL,
    [Name]        NVARCHAR(256) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [CreatedOn]   DATETIME2     NOT NULL CONSTRAINT [DF_CommunityGroups_CreatedOn] DEFAULT (GETUTCDATE()),
    CONSTRAINT [PK_CommunityGroups]            PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CommunityGroups_Community]  FOREIGN KEY ([CommunityId])
        REFERENCES [dbo].[Community]([Id])
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCommunityGroups' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[UserCommunityGroups] (
    [Id]               INT        IDENTITY(1,1) NOT NULL,
    [UserId]           INT        NOT NULL,
    [CommunityGroupId] INT       NOT NULL,
    [CreatedOn]        DATETIME2 NOT NULL CONSTRAINT [DF_UserCommunityGroups_CreatedOn] DEFAULT (GETUTCDATE()),
    CONSTRAINT [PK_UserCommunityGroups]                    PRIMARY KEY ([Id]),
    CONSTRAINT [FK_UserCommunityGroups_Users]              FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users]([UserID]),
    CONSTRAINT [FK_UserCommunityGroups_CommunityGroups]    FOREIGN KEY ([CommunityGroupId])
        REFERENCES [dbo].[CommunityGroups]([Id]),
    CONSTRAINT [UQ_UserCommunityGroups_User_Group]         UNIQUE ([UserId], [CommunityGroupId])
);
