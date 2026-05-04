-- ═══════════════════════════════════════════════════════════════
--  Clear: Removes everything created by seed-wijkcentra.sql
--
--  Deletes (in FK-safe order) for any Community whose Slug
--  starts with 'wijkcentrum-':
--    * Blog QuestionOptions, Questions, Comments, PostGroups, Posts
--    * UserCompany rows for those communities' companies
--    * Companies
--    * UserCommunityGroups for those communities' groups
--    * CommunityGroups
--    * UserCommunity links
--    * Community rows themselves
--
--  Also removes the 20 dummy users created by the seed
--  (matched by Username), including their UserPortals,
--  UserRoles, profile and aspnet membership rows.
--
--  Idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

BEGIN TRY
    BEGIN TRANSACTION;

    -- ── Resolve target communities ─────────────────────────────
    DECLARE @CommIds TABLE (Id INT PRIMARY KEY);
    INSERT INTO @CommIds (Id)
    SELECT Id FROM Community WHERE Slug LIKE N'wijkcentrum-%';

    DECLARE @CompIds TABLE (Id INT PRIMARY KEY);
    INSERT INTO @CompIds (Id)
    SELECT Id FROM Company WHERE CommunityId IN (SELECT Id FROM @CommIds);

    DECLARE @GroupIds TABLE (Id INT PRIMARY KEY);
    INSERT INTO @GroupIds (Id)
    SELECT Id FROM CommunityGroups WHERE CommunityId IN (SELECT Id FROM @CommIds);

    DECLARE @PostIds TABLE (PostId INT PRIMARY KEY);
    INSERT INTO @PostIds (PostId)
    SELECT PostId FROM Dnn_Modules_Blog_Posts WHERE CommunityId IN (SELECT Id FROM @CommIds);

    -- ── 1) Blog content (children first) ───────────────────────
    IF OBJECT_ID('Dnn_Modules_Blog_QuestionOptions','U') IS NOT NULL
    BEGIN
        DELETE qo
        FROM Dnn_Modules_Blog_QuestionOptions qo
        JOIN Dnn_Modules_Blog_Questions q ON q.QuestionId = qo.QuestionId
        WHERE q.PostId IN (SELECT PostId FROM @PostIds);
    END

    IF OBJECT_ID('Dnn_Modules_Blog_Questions','U') IS NOT NULL
        DELETE FROM Dnn_Modules_Blog_Questions
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('Dnn_Modules_Blog_Comments','U') IS NOT NULL
        DELETE FROM Dnn_Modules_Blog_Comments
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    IF OBJECT_ID('Dnn_Modules_Blog_PostGroups','U') IS NOT NULL
        DELETE FROM Dnn_Modules_Blog_PostGroups
        WHERE PostId IN (SELECT PostId FROM @PostIds);

    DELETE FROM Dnn_Modules_Blog_Posts
    WHERE PostId IN (SELECT PostId FROM @PostIds);

    PRINT N'Cleared: blog posts, comments, post-groups, questions, options.';

    -- ── 2) Company links + companies ───────────────────────────
    IF OBJECT_ID('UserCompany','U') IS NOT NULL
        DELETE FROM UserCompany
        WHERE CompanyId IN (SELECT Id FROM @CompIds);

    DELETE FROM Company
    WHERE Id IN (SELECT Id FROM @CompIds);

    PRINT N'Cleared: companies and user-company links.';

    -- ── 3) Group links + groups ────────────────────────────────
    IF OBJECT_ID('UserCommunityGroups','U') IS NOT NULL
        DELETE FROM UserCommunityGroups
        WHERE CommunityGroupId IN (SELECT Id FROM @GroupIds);

    DELETE FROM CommunityGroups
    WHERE Id IN (SELECT Id FROM @GroupIds);

    PRINT N'Cleared: community groups and user-group links.';

    -- ── 4) Community membership + community ────────────────────
    IF OBJECT_ID('UserCommunity','U') IS NOT NULL
        DELETE FROM UserCommunity
        WHERE CommunityId IN (SELECT Id FROM @CommIds);

    DELETE FROM Community
    WHERE Id IN (SELECT Id FROM @CommIds);

    PRINT N'Cleared: communities and user-community links.';

    -- ── 5) Dummy users (delete via DNN proc when available) ────
    DECLARE @DummyUsernames TABLE (Username NVARCHAR(100) PRIMARY KEY);
    INSERT INTO @DummyUsernames (Username) VALUES
        (N'sanne.devries'), (N'jeroen.bakker'), (N'lotte.visser'),
        (N'bram.janssen'),  (N'eva.smit'),      (N'tim.mulder'),
        (N'anouk.deboer'),  (N'daan.vandijk'),  (N'fleur.peters'),
        (N'sven.hendriks'), (N'iris.dekker'),   (N'joris.vanderberg'),
        (N'maud.brouwer'),  (N'niels.vermeulen'),(N'sophie.hoekstra'),
        (N'kasper.vanleeuwen'),(N'lisa.kramer'),(N'mark.schouten'),
        (N'esmee.maas'),    (N'pieter.willems');

    DECLARE @DummyUids TABLE (UserId INT PRIMARY KEY);
    INSERT INTO @DummyUids (UserId)
    SELECT u.UserID
    FROM Users u
    JOIN @DummyUsernames d ON d.Username = u.Username
    WHERE u.IsSuperUser = 0;

    -- Strip them from any remaining link tables we manage
    IF OBJECT_ID('UserCompany','U') IS NOT NULL
        DELETE FROM UserCompany WHERE UserId IN (SELECT UserId FROM @DummyUids);
    IF OBJECT_ID('UserCommunityGroups','U') IS NOT NULL
        DELETE FROM UserCommunityGroups WHERE UserId IN (SELECT UserId FROM @DummyUids);
    IF OBJECT_ID('UserCommunity','U') IS NOT NULL
        DELETE FROM UserCommunity WHERE UserId IN (SELECT UserId FROM @DummyUids);

    -- Hard-delete via DNN's DeleteUser proc when present, else fall back to flagging IsDeleted
    DECLARE @duid INT;
    DECLARE delUserCur CURSOR LOCAL FAST_FORWARD FOR
        SELECT UserId FROM @DummyUids;
    OPEN delUserCur;
    FETCH NEXT FROM delUserCur INTO @duid;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF OBJECT_ID('DeleteUser','P') IS NOT NULL
            EXEC DeleteUser @UserID = @duid;
        ELSE
            UPDATE Users SET IsDeleted = 1 WHERE UserID = @duid;

        FETCH NEXT FROM delUserCur INTO @duid;
    END
    CLOSE delUserCur;
    DEALLOCATE delUserCur;

    PRINT N'Cleared: dummy users (DeleteUser proc or IsDeleted flag).';

    COMMIT TRANSACTION;
    PRINT N'Done. All wijkcentrum seed data removed.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR(@msg, 16, 1);
END CATCH
