-- ═══════════════════════════════════════════════════════════════
--  Seed: Dummy communities
-- ═══════════════════════════════════════════════════════════════

-- Communities
SET IDENTITY_INSERT [dbo].[Community] ON;

INSERT INTO [dbo].[Community] ([CommunityID], [Slug], [Name]) VALUES
    (1, N'keizerswaard',   N'Keizerswaard'),
    (2, N'hoeksche-waard', N'Hoeksche Waard'),
    (3, N'vlaardingen',    N'Vlaardingen'),
    (4, N'spijkenisse',    N'Spijkenisse');

SET IDENTITY_INSERT [dbo].[Community] OFF;
