-- ═══════════════════════════════════════════════════════════════
--  Schema: Community & UserCommunity
-- ═══════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Community' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[Community] (
    [CommunityID] INT IDENTITY(1,1) NOT NULL,
    [Slug] NVARCHAR(256) NOT NULL,
    [Name] NVARCHAR(256) NOT NULL,
    CONSTRAINT [PK_Community] PRIMARY KEY ([CommunityID]),
    CONSTRAINT [UQ_Community_Slug] UNIQUE ([Slug])
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserCommunity' AND schema_id = SCHEMA_ID('dbo'))
CREATE TABLE [dbo].[UserCommunity] (
    [UserID] INT NOT NULL,
    [CommunityID] INT NOT NULL,
    [RoleID] INT NULL,
    CONSTRAINT [PK_UserCommunity] PRIMARY KEY ([UserID], [CommunityID]),
    CONSTRAINT [FK_UserCommunity_Users] FOREIGN KEY ([UserID])
        REFERENCES [dbo].[Users]([UserID]),
    CONSTRAINT [FK_UserCommunity_Community] FOREIGN KEY ([CommunityID])
        REFERENCES [dbo].[Community]([CommunityID]),
    CONSTRAINT [FK_UserCommunity_Roles] FOREIGN KEY ([RoleID])
        REFERENCES [dbo].[Roles]([RoleID])
);
