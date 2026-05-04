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
    DECLARE @CompIds TABLE (Id INT NOT NULL PRIMARY KEY);
    DECLARE @GroupIds TABLE (Id INT NOT NULL PRIMARY KEY);
    DECLARE @PostIds TABLE (PostId INT NOT NULL PRIMARY KEY);
    DECLARE @DummyUids TABLE (UserId INT NOT NULL PRIMARY KEY);

    INSERT INTO @CommIds (Id)
    SELECT c.Id
    FROM Community c
    JOIN @CitySlugs s ON s.Slug = c.Slug;

    INSERT INTO @CompIds (Id)
    SELECT co.Id
    FROM Company co
    WHERE co.CommunityId IN (SELECT Id FROM @CommIds);

    INSERT INTO @GroupIds (Id)
    SELECT g.Id
    FROM CommunityGroups g
    WHERE g.CommunityId IN (SELECT Id FROM @CommIds);

    INSERT INTO @PostIds (PostId)
    SELECT p.PostId
    FROM Dnn_Modules_Blog_Posts p
    WHERE p.CommunityId IN (SELECT Id FROM @CommIds);

    INSERT INTO @DummyUids (UserId)
    SELECT u.UserID
    FROM Users u
    WHERE u.IsSuperUser = 0
      AND u.Username LIKE N'dzpdummy.%';

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 2) Count what will be cleared                           ║
    -- ╚══════════════════════════════════════════════════════════╝

    DECLARE @CntCommunities INT = (SELECT COUNT(*) FROM @CommIds);
    DECLARE @CntCompanies INT = (SELECT COUNT(*) FROM @CompIds);
    DECLARE @CntGroups INT = (SELECT COUNT(*) FROM @GroupIds);
    DECLARE @CntPosts INT = (SELECT COUNT(*) FROM @PostIds);
    DECLARE @CntDummyUsers INT = (SELECT COUNT(*) FROM @DummyUids);

    DECLARE @CntComments INT = 0;
    DECLARE @CntPostGroups INT = 0;
    DECLARE @CntQuestions INT = 0;
    DECLARE @CntQuestionOptions INT = 0;
    DECLARE @CntUserCompany INT = 0;
    DECLARE @CntUserGroups INT = 0;
    DECLARE @CntUserCommunity INT = 0;
    DECLARE @CntUserCommunityRole INT = 0;

    IF OBJECT_ID('Dnn_Modules_Blog_Comments','U') IS NOT NULL
        SELECT @CntComments = COUNT(*)
        FROM Dnn_Modules_Blog_Comments
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('Dnn_Modules_Blog_PostGroups','U') IS NOT NULL
        SELECT @CntPostGroups = COUNT(*)
        FROM Dnn_Modules_Blog_PostGroups
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('Dnn_Modules_Blog_Questions','U') IS NOT NULL
        SELECT @CntQuestions = COUNT(*)
        FROM Dnn_Modules_Blog_Questions
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('Dnn_Modules_Blog_QuestionOptions','U') IS NOT NULL
        SELECT @CntQuestionOptions = COUNT(*)
        FROM Dnn_Modules_Blog_QuestionOptions qo
        JOIN Dnn_Modules_Blog_Questions q ON q.QuestionId = qo.QuestionId
        WHERE q.PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('UserCompany','U') IS NOT NULL
        SELECT @CntUserCompany = COUNT(*)
        FROM UserCompany
        WHERE CompanyId IN (SELECT Id FROM @CompIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);

    IF OBJECT_ID('UserCommunityGroups','U') IS NOT NULL
        SELECT @CntUserGroups = COUNT(*)
        FROM UserCommunityGroups
        WHERE CommunityGroupId IN (SELECT Id FROM @GroupIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);

    IF OBJECT_ID('UserCommunity','U') IS NOT NULL
        SELECT @CntUserCommunity = COUNT(*)
        FROM UserCommunity
        WHERE CommunityId IN (SELECT Id FROM @CommIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);

    IF OBJECT_ID('UserCommunityRole','U') IS NOT NULL
        SELECT @CntUserCommunityRole = COUNT(*)
        FROM UserCommunityRole
        WHERE UserCommunityId IN (
            SELECT Id
            FROM UserCommunity
            WHERE CommunityId IN (SELECT Id FROM @CommIds)
               OR UserId IN (SELECT UserId FROM @DummyUids)
        );

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 3) Delete blog content, children first                  ║
    -- ╚══════════════════════════════════════════════════════════╝

    IF OBJECT_ID('Dnn_Modules_Blog_QuestionOptions','U') IS NOT NULL
    BEGIN
        DELETE qo
        FROM Dnn_Modules_Blog_QuestionOptions qo
        JOIN Dnn_Modules_Blog_Questions q ON q.QuestionId = qo.QuestionId
        WHERE q.PostId IN (SELECT PostId FROM @PostIds);
    END;

    IF OBJECT_ID('Dnn_Modules_Blog_Questions','U') IS NOT NULL
    BEGIN
        DELETE FROM Dnn_Modules_Blog_Questions
        WHERE PostId IN (SELECT PostId FROM @PostIds);
    END;

    IF OBJECT_ID('Dnn_Modules_Blog_Comments','U') IS NOT NULL
    BEGIN
        DELETE FROM Dnn_Modules_Blog_Comments
        WHERE PostId IN (SELECT PostId FROM @PostIds);
    END;

    IF OBJECT_ID('Dnn_Modules_Blog_PostGroups','U') IS NOT NULL
    BEGIN
        DELETE FROM Dnn_Modules_Blog_PostGroups
        WHERE PostId IN (SELECT PostId FROM @PostIds);
    END;

    DELETE FROM Dnn_Modules_Blog_Posts
    WHERE PostId IN (SELECT PostId FROM @PostIds);

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 4) Delete companies and company links                   ║
    -- ╚══════════════════════════════════════════════════════════╝

    IF OBJECT_ID('UserCompany','U') IS NOT NULL
    BEGIN
        DELETE FROM UserCompany
        WHERE CompanyId IN (SELECT Id FROM @CompIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);
    END;

    DELETE FROM Company
    WHERE Id IN (SELECT Id FROM @CompIds);

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 5) Delete groups and group links                        ║
    -- ╚══════════════════════════════════════════════════════════╝

    IF OBJECT_ID('UserCommunityGroups','U') IS NOT NULL
    BEGIN
        DELETE FROM UserCommunityGroups
        WHERE CommunityGroupId IN (SELECT Id FROM @GroupIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);
    END;

    DELETE FROM CommunityGroups
    WHERE Id IN (SELECT Id FROM @GroupIds);

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 6) Delete community links and communities               ║
    -- ╚══════════════════════════════════════════════════════════╝

    IF OBJECT_ID('UserCommunityRole','U') IS NOT NULL
    BEGIN
        DELETE FROM UserCommunityRole
        WHERE UserCommunityId IN (
            SELECT Id
            FROM UserCommunity
            WHERE CommunityId IN (SELECT Id FROM @CommIds)
               OR UserId IN (SELECT UserId FROM @DummyUids)
        );
    END;

    IF OBJECT_ID('UserCommunity','U') IS NOT NULL
    BEGIN
        DELETE FROM UserCommunity
        WHERE CommunityId IN (SELECT Id FROM @CommIds)
           OR UserId IN (SELECT UserId FROM @DummyUids);
    END;

    DELETE FROM Community
    WHERE Id IN (SELECT Id FROM @CommIds);

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 7) Delete dummy users                                   ║
    -- ╚══════════════════════════════════════════════════════════╝

    DECLARE @duid INT;

    DECLARE delUserCur CURSOR LOCAL FAST_FORWARD FOR
        SELECT UserId
        FROM @DummyUids;

    OPEN delUserCur;

    FETCH NEXT FROM delUserCur INTO @duid;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF OBJECT_ID('DeleteUser','P') IS NOT NULL
        BEGIN
            EXEC DeleteUser @UserID = @duid;
        END
        ELSE
        BEGIN
            UPDATE Users
            SET IsDeleted = 1
            WHERE UserID = @duid;
        END;

        FETCH NEXT FROM delUserCur INTO @duid;
    END;

    CLOSE delUserCur;
    DEALLOCATE delUserCur;

    COMMIT TRANSACTION;

    -- ╔══════════════════════════════════════════════════════════╗
    -- ║ 8) Compact summary                                      ║
    -- ╚══════════════════════════════════════════════════════════╝

    SELECT
        CAST(@CntCommunities AS VARCHAR(11)) AS Communities,
        CAST(@CntDummyUsers AS VARCHAR(10)) AS DummyUsers,
        CAST(@CntGroups AS VARCHAR(6)) AS Groups,
        CAST(@CntCompanies AS VARCHAR(9)) AS Companies,
        CAST(@CntPosts AS VARCHAR(5)) AS Posts,
        CAST(@CntComments AS VARCHAR(8)) AS Comments,
        CAST(@CntPostGroups AS VARCHAR(4)) AS Tags,
        CAST(@CntQuestions AS VARCHAR(9)) AS Questions,
        CAST(@CntQuestionOptions AS VARCHAR(7)) AS Options,
        CAST(@CntUserCommunity AS VARCHAR(11)) AS Memberships,
        CAST(@CntUserCommunityRole AS VARCHAR(5)) AS Roles,
        CAST(@CntUserCompany AS VARCHAR(12)) AS UserCompanies,
        CAST(@CntUserGroups AS VARCHAR(10)) AS UserGroups;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH;