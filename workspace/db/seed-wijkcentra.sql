-- ═══════════════════════════════════════════════════════════════
--  Seed: Dummy "Wijkcentra" (NL community/neighborhood centers)
--
--  All-in-one seed. Creates / refreshes:
--    1) 6 Wijkcentrum communities (skipped if slug exists).
--    2) 10 CommunityGroups per centrum.
--    3) 10 Companies per centrum (with rich CompanyInfo JSON:
--       about, address, phone, email, website, banner, opening hours).
--    4) 30 Blog posts per centrum (PostType 1-3 random, never 0,
--       IsDraft=0, IsDeleted=0, picsum image, lorem-ish content).
--    5) 20 dummy NL users (via AddUser proc, portal 0).
--    6) Distributes users across centra + a random group + company.
--    7) Tags ~70% of posts to 1-2 community groups (PostGroups).
--    8) Generates real Dnn_Modules_Blog_Comments matching each
--       post's CommentCount so the UI actually renders them.
--
--  Idempotent-ish:
--    * Communities skipped if slug already exists.
--    * Users dedup by Username.
--    * UserCommunity / UserCommunityGroups / UserCompany guarded.
--    * Comments only inserted on posts that have none.
--
--  Run with sqlcmd -I (QUOTED_IDENTIFIER ON) — script also sets it.
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 0) Globals                                                ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @ModuleId      INT = (SELECT TOP 1 m.ModuleID
                              FROM Modules m
                              JOIN ModuleDefinitions md ON m.ModuleDefID = md.ModuleDefID
                              JOIN DesktopModules    dm ON md.DesktopModuleID = dm.DesktopModuleID
                              WHERE dm.FolderName = 'Dnn.Modules.Blog');
DECLARE @PortalId      INT = 0;
DECLARE @DefaultAuthor INT = (SELECT TOP 1 UserID FROM Users WHERE IsDeleted = 0 AND IsSuperUser = 1);
DECLARE @CreatedBy     INT = @DefaultAuthor;

IF @ModuleId IS NULL
BEGIN
    RAISERROR('No Dnn.Modules.Blog module instance found. Add the Blog module to a page first.', 16, 1);
    RETURN;
END

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 1) Create 20 dummy users FIRST so they can author posts  ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @DummyUsers TABLE (
    Idx       INT,
    FirstName NVARCHAR(50),
    LastName  NVARCHAR(50),
    Username  NVARCHAR(100),
    Email     NVARCHAR(256),
    UserId    INT NULL
);

INSERT INTO @DummyUsers (Idx, FirstName, LastName, Username, Email) VALUES
    ( 1, N'Sanne',    N'de Vries',     N'sanne.devries',     N'sanne.devries@example.com'),
    ( 2, N'Jeroen',   N'Bakker',       N'jeroen.bakker',     N'jeroen.bakker@example.com'),
    ( 3, N'Lotte',    N'Visser',       N'lotte.visser',      N'lotte.visser@example.com'),
    ( 4, N'Bram',     N'Janssen',      N'bram.janssen',      N'bram.janssen@example.com'),
    ( 5, N'Eva',      N'Smit',         N'eva.smit',          N'eva.smit@example.com'),
    ( 6, N'Tim',      N'Mulder',       N'tim.mulder',        N'tim.mulder@example.com'),
    ( 7, N'Anouk',    N'de Boer',      N'anouk.deboer',      N'anouk.deboer@example.com'),
    ( 8, N'Daan',     N'van Dijk',     N'daan.vandijk',      N'daan.vandijk@example.com'),
    ( 9, N'Fleur',    N'Peters',       N'fleur.peters',      N'fleur.peters@example.com'),
    (10, N'Sven',     N'Hendriks',     N'sven.hendriks',     N'sven.hendriks@example.com'),
    (11, N'Iris',     N'Dekker',       N'iris.dekker',       N'iris.dekker@example.com'),
    (12, N'Joris',    N'van der Berg', N'joris.vanderberg',  N'joris.vanderberg@example.com'),
    (13, N'Maud',     N'Brouwer',      N'maud.brouwer',      N'maud.brouwer@example.com'),
    (14, N'Niels',    N'Vermeulen',    N'niels.vermeulen',   N'niels.vermeulen@example.com'),
    (15, N'Sophie',   N'Hoekstra',     N'sophie.hoekstra',   N'sophie.hoekstra@example.com'),
    (16, N'Kasper',   N'van Leeuwen',  N'kasper.vanleeuwen', N'kasper.vanleeuwen@example.com'),
    (17, N'Lisa',     N'Kramer',       N'lisa.kramer',       N'lisa.kramer@example.com'),
    (18, N'Mark',     N'Schouten',     N'mark.schouten',     N'mark.schouten@example.com'),
    (19, N'Esmee',    N'Maas',         N'esmee.maas',        N'esmee.maas@example.com'),
    (20, N'Pieter',   N'Willems',      N'pieter.willems',    N'pieter.willems@example.com');

DECLARE @uIdx INT = 1, @uFn NVARCHAR(50), @uLn NVARCHAR(50),
        @uName NVARCHAR(100), @uEmail NVARCHAR(256), @newUid INT;
DECLARE @uidTbl TABLE (Uid INT);

WHILE @uIdx <= 20
BEGIN
    SELECT @uFn = FirstName, @uLn = LastName, @uName = Username, @uEmail = Email
    FROM @DummyUsers WHERE Idx = @uIdx;

    DELETE FROM @uidTbl;
    INSERT INTO @uidTbl
    EXEC AddUser
        @PortalID        = @PortalId,
        @Username        = @uName,
        @FirstName       = @uFn,
        @LastName        = @uLn,
        @AffiliateId     = NULL,
        @IsSuperUser     = 0,
        @Email           = @uEmail,
        @DisplayName     = @uFn,
        @UpdatePassword  = 0,
        @Authorised      = 1,
        @CreatedByUserID = @CreatedBy;

    SELECT @newUid = Uid FROM @uidTbl;
    IF @newUid IS NULL
        SELECT @newUid = UserID FROM Users WHERE Username = @uName;

    -- Reactivate if a previous clear soft-deleted this dummy user.
    UPDATE Users SET DisplayName = @uFn + N' ' + @uLn, IsDeleted = 0 WHERE UserID = @newUid;
    UPDATE UserPortals SET IsDeleted = 0 WHERE UserId = @newUid AND PortalId = @PortalId;
    UPDATE @DummyUsers SET UserId = @newUid WHERE Idx = @uIdx;
    SET @uIdx = @uIdx + 1;
END

PRINT N'Step 1: 20 dummy users ready.';

-- ── Author pool: dummy users + any non-deleted portal users ──
DECLARE @Authors TABLE (UserId INT);
INSERT INTO @Authors (UserId)
SELECT UserId FROM @DummyUsers WHERE UserId IS NOT NULL
UNION
SELECT u.UserID
FROM Users u
INNER JOIN UserPortals up ON up.UserId = u.UserID
WHERE u.IsDeleted = 0 AND up.PortalId = @PortalId;

IF NOT EXISTS (SELECT 1 FROM @Authors)
    INSERT INTO @Authors VALUES (@DefaultAuthor);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 2) Word pools                                             ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @Centra TABLE (Slug NVARCHAR(64), Name NVARCHAR(128), City NVARCHAR(64));
INSERT INTO @Centra VALUES
    (N'wijkcentrum-de-meern',        N'Wijkcentrum De Meern',        N'Utrecht'),
    (N'wijkcentrum-overvecht',       N'Wijkcentrum Overvecht',       N'Utrecht'),
    (N'wijkcentrum-bos-en-lommer',   N'Wijkcentrum Bos en Lommer',   N'Amsterdam'),
    (N'wijkcentrum-charlois',        N'Wijkcentrum Charlois',        N'Rotterdam'),
    (N'wijkcentrum-escamp',          N'Wijkcentrum Escamp',          N'Den Haag'),
    (N'wijkcentrum-stratum',         N'Wijkcentrum Stratum',         N'Eindhoven');

DECLARE @GroupNames TABLE (Id INT IDENTITY(1,1), Name NVARCHAR(64));
INSERT INTO @GroupNames (Name) VALUES
    (N'Tuinieren'), (N'Koken'), (N'Wandelen'), (N'Boeken'), (N'Schilderen'),
    (N'Yoga'), (N'Buurtfeest'), (N'Klussen'), (N'Muziek'), (N'Fietsen'),
    (N'Zwemmen'), (N'Schaken'), (N'Filmavond'), (N'Quizzen'), (N'Naaicafe');

DECLARE @CompanyAdjectives TABLE (Id INT IDENTITY(1,1), Word NVARCHAR(32));
INSERT INTO @CompanyAdjectives (Word) VALUES
    (N'Groene'), (N'Gouden'), (N'Blauwe'), (N'Stille'), (N'Vrolijke'),
    (N'Snelle'), (N'Slimme'), (N'Warme'), (N'Verse'), (N'Helder');

DECLARE @CompanyNouns TABLE (Id INT IDENTITY(1,1), Word NVARCHAR(32));
INSERT INTO @CompanyNouns (Word) VALUES
    (N'Bakkerij'), (N'Kapsalon'), (N'Garage'), (N'Bloemist'), (N'Drukkerij'),
    (N'Ijssalon'), (N'Cafe'), (N'Boekhandel'), (N'Atelier'), (N'Schoenmakerij'),
    (N'Adviesbureau'), (N'Schoonmaak');

DECLARE @PostTitleStems TABLE (Id INT IDENTITY(1,1), Title NVARCHAR(128));
INSERT INTO @PostTitleStems (Title) VALUES
    (N'Buurt-BBQ aanstaande zaterdag'),
    (N'Nieuwe openingstijden bekend'),
    (N'Hulp gezocht voor onze tuin'),
    (N'Workshop schilderen voor beginners'),
    (N'Gezocht: vrijwilligers'),
    (N'Bedankt voor de geweldige avond!'),
    (N'Belangrijke mededeling van het bestuur'),
    (N'Onderhoud aan het gebouw'),
    (N'Filmavond - kom je ook?'),
    (N'Inschrijving geopend voor de cursus'),
    (N'Even voorstellen: nieuwe coordinator'),
    (N'Foto-impressie van het buurtfeest'),
    (N'Enquete: wat vind jij?'),
    (N'Wijziging in het programma'),
    (N'Meld je nu aan voor de wandeling');

DECLARE @PostBodies TABLE (Id INT IDENTITY(1,1), Body NVARCHAR(MAX));
INSERT INTO @PostBodies (Body) VALUES
    (N'<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Beste buurtbewoners, we organiseren binnenkort weer een gezellige bijeenkomst.</p><p>Iedereen is welkom!</p>'),
    (N'<p>We zijn ontzettend blij om te kunnen aankondigen dat het programma weer start. Aanmelden kan via de receptie of online.</p>'),
    (N'<p>Bedankt aan alle vrijwilligers die zich het afgelopen seizoen hebben ingezet voor onze buurt. Zonder jullie was dit niet mogelijk geweest.</p>'),
    (N'<p>Let op: in verband met onderhoudswerkzaamheden is het centrum komende woensdag gesloten. Excuses voor het ongemak.</p>'),
    (N'<p>Heb jij een uurtje per week over? We zoeken nog enthousiaste mensen om te helpen met de wekelijkse activiteiten. Stuur een bericht!</p>'),
    (N'<p>Tijdens onze laatste bijeenkomst hebben we veel positieve reacties gekregen. Bekijk hieronder de foto-impressie en de aankondigingen voor de volgende keer.</p>');

DECLARE @CommentBodies TABLE (Id INT IDENTITY(1,1), Body NVARCHAR(500));
INSERT INTO @CommentBodies (Body) VALUES
    (N'Wat een leuk initiatief, ik kom zeker langs!'),
    (N'Top, ik heb me net aangemeld. Tot dan!'),
    (N'Mag ik mijn buurvrouw ook meenemen?'),
    (N'Heel fijn dat dit weer wordt georganiseerd.'),
    (N'Hoe laat begint het precies?'),
    (N'Mooi dat er nog steeds zoveel saamhorigheid is in onze wijk.'),
    (N'Ik kan helaas niet, maar veel succes!'),
    (N'Bedankt voor de duidelijke uitleg.'),
    (N'Kan ik ergens een foto achterlaten?'),
    (N'Geweldig! Ik ben er zeker bij met mijn kinderen.'),
    (N'Is er parkeergelegenheid in de buurt?'),
    (N'Heeft iemand al ervaring met deze workshop?'),
    (N'Wat een goede vraag, ik vraag me dat ook af.'),
    (N'Klinkt geweldig, complimenten aan de organisatie.'),
    (N'Gaan jullie volgende maand iets soortgelijks doen?'),
    (N'Bedankt voor het delen van deze informatie!'),
    (N'Ik vind het een prima idee. Ga ik aan meedoen.'),
    (N'Misschien handig om dit ook in de nieuwsbrief te zetten.'),
    (N'Mijn man is al jaren actief, hij vindt het super.'),
    (N'Echt iets voor mijn dochter, ik ga het haar laten weten.');

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 3a) Pre-create communities + assign dummy users to them   ║
-- ║     (so companies/posts can pick owners/authors that are  ║
-- ║      actually members of the community).                  ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @Slug NVARCHAR(64), @Name NVARCHAR(128), @City NVARCHAR(64);
DECLARE @CommunityId INT;
DECLARE @i INT, @j INT;
DECLARE @gName NVARCHAR(64), @cName NVARCHAR(128), @cSlug NVARCHAR(128);
DECLARE @ownerId INT;
DECLARE @phone NVARCHAR(64), @email NVARCHAR(256), @website NVARCHAR(256);
DECLARE @open NVARCHAR(8), @close NVARCHAR(8), @hoursJson NVARCHAR(MAX);
DECLARE @info NVARCHAR(MAX);

-- Make sure all centra communities exist up front.
DECLARE pre_centra CURSOR LOCAL FAST_FORWARD FOR
    SELECT Slug, Name FROM @Centra;
OPEN pre_centra;
FETCH NEXT FROM pre_centra INTO @Slug, @Name;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Community WHERE Slug = @Slug)
    BEGIN
        INSERT INTO Community (Slug, Name, ImageUrl)
        VALUES (@Slug, @Name, N'https://picsum.photos/seed/' + @Slug + N'/1200/400');
    END
    FETCH NEXT FROM pre_centra INTO @Slug, @Name;
END
CLOSE pre_centra;
DEALLOCATE pre_centra;

-- Build ordered list of seed communities.
DECLARE @SeedCommunities TABLE (RowNo INT IDENTITY(1,1), Id INT);
INSERT INTO @SeedCommunities (Id)
SELECT c.Id
FROM Community c
JOIN @Centra ce ON ce.Slug = c.Slug
ORDER BY c.Id;

DECLARE @SeedCommCount INT = (SELECT COUNT(*) FROM @SeedCommunities);

-- Assign every dummy user to exactly one centrum (round-robin).
-- Two extra users per centrum become "Community beheerder" (RoleID=100).
DECLARE @UserCommunityMap TABLE (
    UserId      INT,
    CommunityId INT,
    IsBeheerder BIT
);

;WITH Numbered AS (
    SELECT UserId,
           ROW_NUMBER() OVER (ORDER BY Idx) - 1 AS RowIdx
    FROM @DummyUsers
    WHERE UserId IS NOT NULL
)
INSERT INTO @UserCommunityMap (UserId, CommunityId, IsBeheerder)
SELECT  n.UserId,
        sc.Id,
        CASE WHEN n.RowIdx / @SeedCommCount < 2 THEN 1 ELSE 0 END   -- first 2 rotations = beheerder
FROM    Numbered n
JOIN    @SeedCommunities sc ON sc.RowNo = (n.RowIdx % @SeedCommCount) + 1;

-- Materialize UserCommunity + UserCommunityRole (Community beheerder).
DECLARE @BeheerderRoleId INT = (SELECT TOP 1 RoleID FROM Roles WHERE RoleName = N'Community beheerder');

INSERT INTO UserCommunity (UserId, CommunityId)
SELECT m.UserId, m.CommunityId
FROM @UserCommunityMap m
WHERE NOT EXISTS (
    SELECT 1 FROM UserCommunity uc
    WHERE uc.UserId = m.UserId AND uc.CommunityId = m.CommunityId
);

IF @BeheerderRoleId IS NOT NULL
BEGIN
    INSERT INTO UserCommunityRole (UserCommunityId, RoleId)
    SELECT uc.Id, @BeheerderRoleId
    FROM   UserCommunity uc
    JOIN   @UserCommunityMap m
        ON m.UserId = uc.UserId AND m.CommunityId = uc.CommunityId
    WHERE  m.IsBeheerder = 1
      AND  NOT EXISTS (
            SELECT 1 FROM UserCommunityRole ucr
            WHERE ucr.UserCommunityId = uc.Id AND ucr.RoleId = @BeheerderRoleId
      );
END

PRINT N'Step 3a: Communities created and dummy users distributed (incl. Community beheerder).';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 3b) Loop per wijkcentrum: groups, companies, posts        ║
-- ║     (owners/authors are picked from this community's      ║
-- ║      members only).                                        ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE cursor_centra CURSOR LOCAL FAST_FORWARD FOR
    SELECT Slug, Name, City FROM @Centra;
OPEN cursor_centra;
FETCH NEXT FROM cursor_centra INTO @Slug, @Name, @City;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @CommunityId = Id FROM Community WHERE Slug = @Slug;

    -- ── Member pool for this community (used for owner/author picks) ──
    DECLARE @CommunityMembers TABLE (UserId INT);
    DELETE FROM @CommunityMembers;
    INSERT INTO @CommunityMembers (UserId)
    SELECT UserId FROM UserCommunity WHERE CommunityId = @CommunityId;

    -- Fallback if for some reason no members exist (shouldn't happen).
    IF NOT EXISTS (SELECT 1 FROM @CommunityMembers)
        INSERT INTO @CommunityMembers (UserId) VALUES (@DefaultAuthor);

    -- ── 10 groups (skip if community already populated) ─────
    IF NOT EXISTS (SELECT 1 FROM CommunityGroups WHERE CommunityId = @CommunityId)
    BEGIN
        SET @i = 1;
        WHILE @i <= 10
        BEGIN
            SELECT @gName = Name FROM @GroupNames WHERE Id = ((@i - 1) % 15) + 1;
            INSERT INTO CommunityGroups (CommunityId, Name, Description)
            VALUES (@CommunityId,
                    @gName + N' ' + @City + N' #' + CAST(@i AS NVARCHAR(8)),
                    N'Groep voor ' + @gName + N' liefhebbers in ' + @Name + N'.');
            SET @i = @i + 1;
        END
    END

    -- ── 10 companies with rich CompanyInfo ─────────────────
    IF NOT EXISTS (SELECT 1 FROM Company WHERE CommunityId = @CommunityId)
    BEGIN
        SET @i = 1;
        WHILE @i <= 10
        BEGIN
            SELECT @cName = a.Word + N' ' + n.Word
            FROM @CompanyAdjectives a
            CROSS JOIN @CompanyNouns n
            WHERE a.Id = ((@i - 1) % 10) + 1
              AND n.Id = ((@i - 1 + ABS(CHECKSUM(@Slug))) % 12) + 1;

            SET @cSlug   = LOWER(REPLACE(@cName, N' ', N'-'))
                         + N'-' + @Slug + N'-' + CAST(@i AS NVARCHAR(8));
            SET @phone   = N'+31 6 '
                         + RIGHT(N'0000' + CAST((ABS(CHECKSUM(NEWID())) % 10000) AS NVARCHAR(8)), 4)
                         + N' '
                         + RIGHT(N'0000' + CAST((ABS(CHECKSUM(NEWID())) % 10000) AS NVARCHAR(8)), 4);
            SET @email   = LOWER(REPLACE(@cName, N' ', N'.')) + N'@example.com';
            SET @website = N'https://www.' + LOWER(REPLACE(REPLACE(@cName, N' ', N''), N'''', N'')) + N'.nl';
            SET @open    = CAST(8  + (ABS(CHECKSUM(NEWID())) % 3) AS NVARCHAR(2)) + N':00';
            SET @close   = CAST(17 + (ABS(CHECKSUM(NEWID())) % 5) AS NVARCHAR(2)) + N':00';
            SET @hoursJson =
                N'{' +
                    N'"mon":["' + @open + N'","' + @close + N'"],' +
                    N'"tue":["' + @open + N'","' + @close + N'"],' +
                    N'"wed":["' + @open + N'","' + @close + N'"],' +
                    N'"thu":["' + @open + N'","' + @close + N'"],' +
                    N'"fri":["' + @open + N'","' + @close + N'"],' +
                    N'"sat":["10:00","14:00"],' +
                    N'"sun":[]' +
                N'}';
            SET @info =
                N'{' +
                    N'"about":"' + @cName + N' is een fictief bedrijf in ' + @City + N'. Wij zijn er voor jou.",' +
                    N'"address":"Hoofdstraat ' + CAST(((ABS(CHECKSUM(NEWID())) % 200) + 1) AS NVARCHAR(8))
                                          + N', ' + @City + N'",' +
                    N'"phone":"' + @phone + N'",' +
                    N'"email":"' + @email + N'",' +
                    N'"website":"' + @website + N'",' +
                    N'"banner":"https://picsum.photos/seed/banner-' + @cSlug + N'/1200/400",' +
                    N'"openingHours":' + @hoursJson +
                N'}';

            SELECT TOP 1 @ownerId = UserId FROM @CommunityMembers ORDER BY NEWID();

            INSERT INTO Company (CommunityId, Slug, Name, OwnerId, CompanyInfo, ImageUrl, CreatedOn)
            VALUES (@CommunityId, @cSlug, @cName, @ownerId, @info,
                    N'https://picsum.photos/seed/co-' + @cSlug + N'/600/400',
                    GETUTCDATE());

            SET @i = @i + 1;
        END
    END

    -- ── 30 posts (only if none exist yet for this community) ─
    IF NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Posts WHERE CommunityId = @CommunityId)
    BEGIN
        SET @j = 1;
        WHILE @j <= 30
        BEGIN
            DECLARE @ptype TINYINT = ((ABS(CHECKSUM(NEWID())) % 3) + 1);
            DECLARE @author INT;
            DECLARE @title NVARCHAR(128);
            DECLARE @body  NVARCHAR(MAX);
            DECLARE @img   NVARCHAR(512);
            DECLARE @views INT      = ABS(CHECKSUM(NEWID())) % 500;
            DECLARE @clicks INT     = @views / 5;
            DECLARE @comments INT   = ABS(CHECKSUM(NEWID())) % 25;
            DECLARE @publishOn DATETIME2  = DATEADD(MINUTE, -1 * (ABS(CHECKSUM(NEWID())) % (60 * 24 * 90)), GETUTCDATE());
            DECLARE @eventClose DATETIME2 = CASE WHEN @ptype = 2
                                                 THEN DATEADD(DAY, (ABS(CHECKSUM(NEWID())) % 60) + 1, @publishOn)
                                                 ELSE NULL END;

            SELECT TOP 1 @author = UserId FROM @CommunityMembers ORDER BY NEWID();
            SELECT TOP 1 @title  = Title  FROM @PostTitleStems ORDER BY NEWID();
            SELECT TOP 1 @body   = Body   FROM @PostBodies     ORDER BY NEWID();

            SET @title = @title + N' (' + @City + N' #' + CAST(@j AS NVARCHAR(8)) + N')';
            SET @img   = N'https://picsum.photos/seed/post-' + @Slug + N'-' + CAST(@j AS NVARCHAR(8)) + N'/800/450';

            INSERT INTO Dnn_Modules_Blog_Posts
                (ModuleId, CommunityId, PostType, Title, Content, ImageUrl,
                 AuthorUserId, PublishOn, EventClosingOn,
                 IsDraft, IsDeleted, ViewCount, ClickCount, CommentCount,
                 CreatedOn, ModifiedOn)
            VALUES
                (@ModuleId, @CommunityId, @ptype, @title, @body, @img,
                 @author, @publishOn, @eventClose,
                 0, 0, @views, @clicks, @comments,
                 @publishOn, @publishOn);

            SET @j = @j + 1;
        END
    END

    PRINT N'Centrum: ' + @Name + N' (CommunityId=' + CAST(@CommunityId AS NVARCHAR(16)) + N') ready.';

    FETCH NEXT FROM cursor_centra INTO @Slug, @Name, @City;
END
CLOSE cursor_centra;
DEALLOCATE cursor_centra;

PRINT N'Step 2-3: Communities, groups, companies, posts seeded.';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 4) Link community members to a group + a company         ║
-- ║    (UserCommunity rows themselves were created in 3a.)   ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @uid INT, @cid INT, @groupId INT, @companyId INT;

DECLARE userCur CURSOR LOCAL FAST_FORWARD FOR
    SELECT uc.UserId, uc.CommunityId
    FROM   UserCommunity uc
    JOIN   Community c ON c.Id = uc.CommunityId
    JOIN   @Centra ce  ON ce.Slug = c.Slug
    WHERE  uc.UserId IN (SELECT UserId FROM @DummyUsers WHERE UserId IS NOT NULL);
OPEN userCur;
FETCH NEXT FROM userCur INTO @uid, @cid;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Primary group
    SELECT TOP 1 @groupId = Id FROM CommunityGroups WHERE CommunityId = @cid ORDER BY NEWID();
    IF @groupId IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM UserCommunityGroups WHERE UserId = @uid AND CommunityGroupId = @groupId)
        INSERT INTO UserCommunityGroups (UserId, CommunityGroupId) VALUES (@uid, @groupId);

    -- Optional second group
    IF (ABS(CHECKSUM(NEWID())) % 2) = 0
    BEGIN
        SELECT TOP 1 @groupId = Id
        FROM CommunityGroups
        WHERE CommunityId = @cid
          AND Id NOT IN (SELECT CommunityGroupId FROM UserCommunityGroups WHERE UserId = @uid)
        ORDER BY NEWID();
        IF @groupId IS NOT NULL
            INSERT INTO UserCommunityGroups (UserId, CommunityGroupId) VALUES (@uid, @groupId);
    END

    -- Link to a company within the same community
    SELECT TOP 1 @companyId = Id FROM Company WHERE CommunityId = @cid ORDER BY NEWID();
    IF @companyId IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM UserCompany WHERE UserId = @uid AND CompanyId = @companyId)
        INSERT INTO UserCompany (UserId, CompanyId, ShowInTeam) VALUES (@uid, @companyId, 1);

    FETCH NEXT FROM userCur INTO @uid, @cid;
END
CLOSE userCur;
DEALLOCATE userCur;

PRINT N'Step 4: Users linked to a group + a company within their community.';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 5) Tag posts to 0-2 community groups                      ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @postId INT, @postCommId INT, @rnd INT, @groupsToTag INT;

DECLARE postGroupCur CURSOR LOCAL FAST_FORWARD FOR
    SELECT p.PostId, p.CommunityId
    FROM Dnn_Modules_Blog_Posts p
    JOIN Community c ON c.Id = p.CommunityId
    WHERE c.Slug LIKE N'wijkcentrum-%'
      AND NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_PostGroups pg WHERE pg.PostId = p.PostId);
OPEN postGroupCur;
FETCH NEXT FROM postGroupCur INTO @postId, @postCommId;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @rnd = ABS(CHECKSUM(NEWID())) % 10;
    SET @groupsToTag = CASE WHEN @rnd < 3 THEN 0
                            WHEN @rnd < 8 THEN 1
                            ELSE 2 END;

    IF @groupsToTag > 0
        INSERT INTO Dnn_Modules_Blog_PostGroups (PostId, CommunityGroupId)
        SELECT TOP (@groupsToTag) @postId, g.Id
        FROM CommunityGroups g
        WHERE g.CommunityId = @postCommId
        ORDER BY NEWID();

    FETCH NEXT FROM postGroupCur INTO @postId, @postCommId;
END
CLOSE postGroupCur;
DEALLOCATE postGroupCur;

PRINT N'Step 5: Posts tagged to community groups.';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 6) Generate real comments matching CommentCount           ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @CommentAuthors TABLE (UserId INT);
INSERT INTO @CommentAuthors (UserId)
SELECT UserId FROM @DummyUsers WHERE UserId IS NOT NULL
UNION
SELECT u.UserID
FROM Users u
INNER JOIN UserPortals up ON up.UserId = u.UserID
WHERE u.IsDeleted = 0 AND up.PortalId = @PortalId AND u.IsSuperUser = 0;

DECLARE @desired INT, @inserted INT, @authorId INT, @cBody NVARCHAR(500);
DECLARE @postCreated DATETIME2, @commentDate DATETIME2;

DECLARE commentCur CURSOR LOCAL FAST_FORWARD FOR
    SELECT p.PostId, p.CommentCount, p.CreatedOn
    FROM Dnn_Modules_Blog_Posts p
    JOIN Community c ON c.Id = p.CommunityId
    WHERE c.Slug LIKE N'wijkcentrum-%'
      AND p.IsDraft = 0
      AND p.IsDeleted = 0
      AND NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Comments cm
                      WHERE cm.PostId = p.PostId AND cm.IsDeleted = 0);
OPEN commentCur;
FETCH NEXT FROM commentCur INTO @postId, @desired, @postCreated;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF @desired < 3  SET @desired = 3 + (ABS(CHECKSUM(NEWID())) % 4);
    IF @desired > 12 SET @desired = 12;

    SET @inserted = 0;
    WHILE @inserted < @desired
    BEGIN
        SELECT TOP 1 @authorId = UserId FROM @CommentAuthors ORDER BY NEWID();
        SELECT TOP 1 @cBody    = Body   FROM @CommentBodies  ORDER BY NEWID();
        SET @commentDate = DATEADD(MINUTE, ABS(CHECKSUM(NEWID())) % (60 * 24 * 7), @postCreated);

        INSERT INTO Dnn_Modules_Blog_Comments (PostId, UserId, Body, IsDeleted, CreatedOn)
        VALUES (@postId, @authorId, @cBody, 0, @commentDate);

        SET @inserted = @inserted + 1;
    END

    UPDATE Dnn_Modules_Blog_Posts
    SET CommentCount = (SELECT COUNT(*) FROM Dnn_Modules_Blog_Comments
                        WHERE PostId = @postId AND IsDeleted = 0)
    WHERE PostId = @postId;

    FETCH NEXT FROM commentCur INTO @postId, @desired, @postCreated;
END
CLOSE commentCur;
DEALLOCATE commentCur;

PRINT N'Step 6: Comments generated and post counts synced.';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 7) Survey questions: 3 per PostType=3 (Investigation)     ║
-- ║    Always one of each type (single, multi, open).         ║
-- ╚══════════════════════════════════════════════════════════╝

-- Pools of survey question stems + option sets (Dutch, neighborhood-y).
DECLARE @SingleQ TABLE (Id INT IDENTITY(1,1), Q NVARCHAR(256), O1 NVARCHAR(128), O2 NVARCHAR(128), O3 NVARCHAR(128), O4 NVARCHAR(128));
INSERT INTO @SingleQ (Q, O1, O2, O3, O4) VALUES
    (N'Hoe vaak bezoek je ons wijkcentrum?',     N'Wekelijks',           N'Maandelijks',         N'Een paar keer per jaar',  N'(Bijna) nooit'),
    (N'Hoe tevreden ben je over de activiteiten?', N'Zeer tevreden',     N'Tevreden',            N'Neutraal',                N'Ontevreden'),
    (N'Op welk moment van de dag kom je het liefst langs?', N'Ochtend', N'Middag',              N'Avond',                   N'Weekend'),
    (N'Hoe ben je bekend geraakt met dit initiatief?', N'Via buren',    N'Via social media',    N'Via de nieuwsbrief',      N'Anders');

DECLARE @MultiQ TABLE (Id INT IDENTITY(1,1), Q NVARCHAR(256), O1 NVARCHAR(128), O2 NVARCHAR(128), O3 NVARCHAR(128), O4 NVARCHAR(128));
INSERT INTO @MultiQ (Q, O1, O2, O3, O4) VALUES
    (N'Welke activiteiten interesseren je? (meerdere antwoorden mogelijk)', N'Sport & beweging', N'Cultuur & kunst', N'Educatie',           N'Sociale ontmoetingen'),
    (N'Welke faciliteiten zou je willen zien?',                            N'Koffiehoek',        N'Werkplekken',     N'Speelhoek kinderen', N'Buitenterras'),
    (N'Aan welke dagen ben je doorgaans beschikbaar?',                     N'Maandag - Donderdag', N'Vrijdag',       N'Zaterdag',           N'Zondag'),
    (N'Welke onderwerpen vind je belangrijk voor de buurt?',               N'Veiligheid',        N'Groen & milieu',  N'Zorg',               N'Mobiliteit');

DECLARE @OpenQ TABLE (Id INT IDENTITY(1,1), Q NVARCHAR(256));
INSERT INTO @OpenQ (Q) VALUES
    (N'Heb je nog suggesties of opmerkingen voor ons?'),
    (N'Wat zou je graag willen veranderen in onze wijk?'),
    (N'Welke nieuwe activiteit zou je graag terugzien?'),
    (N'Heb je tips voor de organisatie?');

DECLARE @qPostId INT, @qid INT;
DECLARE @qText NVARCHAR(256), @oA NVARCHAR(128), @oB NVARCHAR(128), @oC NVARCHAR(128), @oD NVARCHAR(128);

DECLARE surveyCur CURSOR LOCAL FAST_FORWARD FOR
    SELECT p.PostId
    FROM Dnn_Modules_Blog_Posts p
    JOIN Community c ON c.Id = p.CommunityId
    WHERE c.Slug LIKE N'wijkcentrum-%'
      AND p.PostType = 3
      AND p.IsDeleted = 0
      AND NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Questions q WHERE q.PostId = p.PostId);
OPEN surveyCur;
FETCH NEXT FROM surveyCur INTO @qPostId;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Q1: single-choice (QuestionType = 1)
    SELECT TOP 1 @qText = Q, @oA = O1, @oB = O2, @oC = O3, @oD = O4
    FROM @SingleQ ORDER BY NEWID();
    INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
    VALUES (@qPostId, 1, @qText, 1);
    SET @qid = SCOPE_IDENTITY();
    INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder) VALUES
        (@qid, @oA, 1), (@qid, @oB, 2), (@qid, @oC, 3), (@qid, @oD, 4);

    -- Q2: multi-choice (QuestionType = 2)
    SELECT TOP 1 @qText = Q, @oA = O1, @oB = O2, @oC = O3, @oD = O4
    FROM @MultiQ ORDER BY NEWID();
    INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
    VALUES (@qPostId, 2, @qText, 2);
    SET @qid = SCOPE_IDENTITY();
    INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder) VALUES
        (@qid, @oA, 1), (@qid, @oB, 2), (@qid, @oC, 3), (@qid, @oD, 4);

    -- Q3: open text (QuestionType = 3, no options)
    SELECT TOP 1 @qText = Q FROM @OpenQ ORDER BY NEWID();
    INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
    VALUES (@qPostId, 3, @qText, 3);

    FETCH NEXT FROM surveyCur INTO @qPostId;
END
CLOSE surveyCur;
DEALLOCATE surveyCur;

PRINT N'Step 7: Survey questions ensured (single + multi + open per PostType=3 post).';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 8) Reset post stats so Views/Clicks <= Audience           ║
-- ║    Audience = UserCommunity members of post's community.  ║
-- ║    Views: random 30-100% of audience.                     ║
-- ║    Clicks: random 20-80% of Views.                        ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH PostAudience AS (
    SELECT  p.PostId,
            ISNULL((SELECT COUNT(*) FROM UserCommunity uc WHERE uc.CommunityId = p.CommunityId), 0) AS Audience
    FROM    Dnn_Modules_Blog_Posts p
    JOIN    Community c ON c.Id = p.CommunityId
    WHERE   c.Slug LIKE N'wijkcentrum-%'
)
UPDATE p
SET    p.ViewCount  = v.Views,
       p.ClickCount = v.Clicks
FROM   Dnn_Modules_Blog_Posts p
JOIN   PostAudience pa ON pa.PostId = p.PostId
CROSS APPLY (
    SELECT  CASE WHEN pa.Audience = 0 THEN 0
                 ELSE pa.Audience - (ABS(CHECKSUM(NEWID(), p.PostId)) % CASE WHEN pa.Audience > 1
                                                                              THEN CAST(CEILING(pa.Audience * 0.7) AS INT)
                                                                              ELSE 1 END)
            END AS Views
) vRaw
CROSS APPLY (
    SELECT  vRaw.Views,
            CASE WHEN vRaw.Views = 0 THEN 0
                 ELSE CAST(vRaw.Views * (0.2 + (ABS(CHECKSUM(NEWID(), p.PostId)) % 60) / 100.0) AS INT)
            END AS Clicks
) v;

PRINT N'Step 8: Post Views/Clicks reset within Audience bounds.';

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 9) Final summary                                          ║
-- ╚══════════════════════════════════════════════════════════╝

SELECT
    c.Id,
    c.Slug,
    (SELECT COUNT(*) FROM UserCommunity        WHERE CommunityId = c.Id)            AS Members,
    (SELECT COUNT(*) FROM CommunityGroups      WHERE CommunityId = c.Id)            AS Groups,
    (SELECT COUNT(*) FROM Company              WHERE CommunityId = c.Id)            AS Companies,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Posts p WHERE p.CommunityId = c.Id)      AS Posts,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Comments cm
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = cm.PostId
        WHERE p.CommunityId = c.Id)                                                  AS Comments,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_PostGroups pg
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = pg.PostId
        WHERE p.CommunityId = c.Id)                                                  AS PostGroupTags,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Posts p
        WHERE p.CommunityId = c.Id AND p.PostType = 3)                               AS Surveys,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Questions q
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
        WHERE p.CommunityId = c.Id)                                                  AS Questions
FROM Community c
WHERE c.Slug LIKE N'wijkcentrum-%'
ORDER BY c.Id;

PRINT N'Done.';
