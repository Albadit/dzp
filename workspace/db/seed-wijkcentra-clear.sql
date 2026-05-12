-- ═══════════════════════════════════════════════════════════════
--  Clear: Removes everything created by seed-wijkcentra.sql
--
--  Targets:
--      - the 50 fixed Rotterdam locations
--      - companies/groups/posts/comments/questions/tags under them
--      - users whose Username starts with 'dzpdummy.'
--
--  Idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRY
    BEGIN TRANSACTION;

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 1) Resolve target communities                           ║
    -- ╚══════════════════════════════════════════════════════════╝

    DECLARE @CitySlugs TABLE (
        Slug NVARCHAR(128) NOT NULL PRIMARY KEY
    );

    INSERT INTO @CitySlugs (Slug) VALUES
        (N'lijnbaan'),
        (N'koopgoot-beurstraverse'),
        (N'winkelcentrum-zuidplein'),
        (N'alexandrium-shopping-center'),
        (N'alexandrium-megastores'),
        (N'alexandrium-woonmall'),
        (N'markthal-rotterdam'),
        (N'hoogstraat'),
        (N'meent'),
        (N'oude-binnenweg'),
        (N'nieuwe-binnenweg'),
        (N'van-oldenbarneveltstraat'),
        (N'de-bijenkorf-binnenwegplein-gebied'),
        (N'coolsingel-winkelgebied'),
        (N'beursplein'),
        (N'binnenwegplein'),
        (N'korte-hoogstraat'),
        (N'witte-de-withstraat'),
        (N'west-kruiskade'),
        (N'kruiskade'),
        (N'pannekoekstraat'),
        (N'goudsesingel'),
        (N'zwaanshalskwartier'),
        (N'noordplein-oude-noorden'),
        (N'lusthofstraat'),
        (N'vlietlaan-kralingen'),
        (N'winkelcentrum-hesseplaats'),
        (N'boulevard-nesselande'),
        (N'winkelcentrum-schiebroek'),
        (N'kleiwegkwartier'),
        (N'bergse-dorpsstraat-hillegersberg'),
        (N'binnenban-hoogvliet'),
        (N'winkelcentrum-hoogvliet-centrum'),
        (N'winkelcentrum-zalmplaat'),
        (N'plein-1953'),
        (N'slinge-de-slinge'),
        (N'spinozaweg'),
        (N'beverwaard-winkelgebied'),
        (N'groene-hilledijk'),
        (N'boulevard-zuid'),
        (N'afrikaanderplein'),
        (N'vuurplaat'),
        (N'cor-kieboomplein-stadionweg'),
        (N'de-veranda-pathe-de-kuip-gebied'),
        (N'bigshops-parkboulevard'),
        (N'vierambachtsstraat'),
        (N'mathenesserplein'),
        (N'crooswijkseweg-winkelgebied'),
        (N'crooswijkse-winkelhoek'),
        (N'de-esch-winkelgebied');

    DECLARE @CommIds TABLE (Id INT NOT NULL PRIMARY KEY);
    DECLARE @DummyUids TABLE (UserId INT NOT NULL PRIMARY KEY);

    INSERT INTO @CommIds (Id)
    SELECT c.Id
    FROM Community c
    JOIN @CitySlugs s ON s.Slug = c.Slug;

    INSERT INTO @DummyUids (UserId)
    SELECT u.UserID
    FROM Users u
    WHERE u.IsSuperUser = 0
      AND u.Username LIKE N'dzpdummy.%';

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 2) Cascade-delete every child of the target communities ║
    -- ║                                                         ║
    -- ║ Migration 002 added ON DELETE CASCADE on every FK that  ║
    -- ║ chains down from Community, so a single DELETE here     ║
    -- ║ wipes:                                                  ║
    -- ║                                                         ║
    -- ║   Community                                             ║
    -- ║     ├─ Company                  → UserCompany           ║
    -- ║     ├─ CommunityGroups          → UserCommunityGroups   ║
    -- ║     ├─ UserCommunity            → UserCommunityRole     ║
    -- ║     ├─ CommunityDiscoverCategory → CommunityDiscoverButton
    -- ║     └─ Dnn_Modules_Blog_Posts                           ║
    -- ║           ├─ Comments                                   ║
    -- ║           ├─ PostGroups                                 ║
    -- ║           └─ Questions                                  ║
    -- ║                 ├─ QuestionOptions                      ║
    -- ║                 └─ Answers                              ║
    -- ║                                                         ║
    -- ║ The Community rows themselves are removed too — the     ║
    -- ║ seed re-creates them (Slug, Name, ImageUrl) on the next ║
    -- ║ run, so the 50 wijkcentra reappear with fresh Ids.      ║
    -- ╚══════════════════════════════════════════════════════════╝

    DELETE FROM Community
    WHERE Id IN (SELECT Id FROM @CommIds);

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 3) Soft-delete dummy users                              ║
    -- ║                                                         ║
    -- ║ Users.UserID isn't on the cascade chain (multi-cascade- ║
    -- ║ path rule), so dummies are soft-deleted set-based.      ║
    -- ╚══════════════════════════════════════════════════════════╝

    UPDATE Users
    SET IsDeleted = 1
    WHERE UserID IN (SELECT UserId FROM @DummyUids);

    IF OBJECT_ID('UserPortals','U') IS NOT NULL
    BEGIN
        UPDATE UserPortals
        SET IsDeleted = 1
        WHERE UserId IN (SELECT UserId FROM @DummyUids);
    END;

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;
