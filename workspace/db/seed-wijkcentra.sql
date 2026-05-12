-- ═══════════════════════════════════════════════════════════════
--  Seed: Rotterdam Wijkcentra / shopping-area stress data
--
--  Chunk-aware version.
--
--  Required sqlcmd variables:
--      UsersPerCommunity
--      GroupsPerCommunity
--      CompaniesPerCommunity
--      PostsPerCommunity
--      MinCommentsPerPost
--      MaxCommentsPerPost
--      SingleQuestionsPerSurvey
--      MultiQuestionsPerSurvey
--      OpenQuestionsPerSurvey
--      CommunityOffset
--      CommunityLimit
--
--  Example:
--      sqlcmd -I -b -W -s " " -i seed-wijkcentra.sql ^
--        -v UsersPerCommunity=100 ^
--           GroupsPerCommunity=4 ^
--           CompaniesPerCommunity=10 ^
--           PostsPerCommunity=20 ^
--           MinCommentsPerPost=5 ^
--           MaxCommentsPerPost=15 ^
--           CommunityOffset=0 ^
--           CommunityLimit=1
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 0) Variables                                            ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @UsersPerCommunity      INT = $(UsersPerCommunity);
DECLARE @NumUsers               INT;  -- computed below = UsersPerCommunity * #cities
DECLARE @GroupsPerCommunity     INT = $(GroupsPerCommunity);
DECLARE @CompaniesPerCommunity  INT = $(CompaniesPerCommunity);
DECLARE @PostsPerCommunity      INT = $(PostsPerCommunity);
DECLARE @MinCommentsPerPost     INT = $(MinCommentsPerPost);
DECLARE @MaxCommentsPerPost     INT = $(MaxCommentsPerPost);
DECLARE @SingleQuestionsPerSurvey INT = $(SingleQuestionsPerSurvey);
DECLARE @MultiQuestionsPerSurvey  INT = $(MultiQuestionsPerSurvey);
DECLARE @OpenQuestionsPerSurvey   INT = $(OpenQuestionsPerSurvey);
DECLARE @CommunityOffset        INT = $(CommunityOffset);
DECLARE @CommunityLimit         INT = $(CommunityLimit);

DECLARE @PortalId INT = 0;

DECLARE @ModuleId INT = (
    SELECT TOP 1 m.ModuleID
    FROM Modules m
    JOIN ModuleDefinitions md ON m.ModuleDefID = md.ModuleDefID
    JOIN DesktopModules dm ON md.DesktopModuleID = dm.DesktopModuleID
    WHERE dm.FolderName = 'Dnn.Modules.Blog'
);

DECLARE @DefaultAuthor INT = (
    SELECT TOP 1 UserID
    FROM Users
    WHERE IsDeleted = 0
      AND IsSuperUser = 1
    ORDER BY UserID
);

DECLARE @CreatedBy INT = @DefaultAuthor;

DECLARE @BeheerderRole INT = (
    SELECT TOP 1 RoleID
    FROM Roles
    WHERE RoleName = N'Community beheerder'
);

DECLARE @LidRole INT = (
    SELECT TOP 1 RoleID
    FROM Roles
    WHERE RoleName = N'Lid'
);

IF @ModuleId IS NULL
BEGIN
    RAISERROR('No Dnn.Modules.Blog module instance found. Add the Blog module to a page first.', 16, 1);
    RETURN;
END;

IF @DefaultAuthor IS NULL
BEGIN
    RAISERROR('No active superuser found. Cannot seed host-authored drafts.', 16, 1);
    RETURN;
END;

IF @CommunityOffset < 0 OR @CommunityLimit < 1
BEGIN
    RAISERROR('CommunityOffset must be >= 0 and CommunityLimit must be >= 1.', 16, 1);
    RETURN;
END;

IF @MaxCommentsPerPost < @MinCommentsPerPost
BEGIN
    RAISERROR('MaxCommentsPerPost must be greater than or equal to MinCommentsPerPost.', 16, 1);
    RETURN;
END;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 1) Numbers table                                       ║
-- ╚══════════════════════════════════════════════════════════╝

IF OBJECT_ID('tempdb..#Numbers') IS NOT NULL DROP TABLE #Numbers;

CREATE TABLE #Numbers (
    n INT NOT NULL PRIMARY KEY
);

;WITH gen AS (
    SELECT TOP (
        CASE
            WHEN 50 * CASE WHEN @PostsPerCommunity < 1 THEN 1 ELSE @PostsPerCommunity END * 20 < 16384
                THEN 16384
            ELSE 50 * CASE WHEN @PostsPerCommunity < 1 THEN 1 ELSE @PostsPerCommunity END * 20
        END
    )
    ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
    FROM sys.all_objects a
    CROSS JOIN sys.all_objects b
)
INSERT INTO #Numbers (n)
SELECT n
FROM gen;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 2) Word pools                                           ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @Cities TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    City NVARCHAR(128) NOT NULL,
    Slug NVARCHAR(128) NOT NULL
);

INSERT INTO @Cities (City, Slug) VALUES
    (N'Lijnbaan',                              N'lijnbaan'),
    (N'Koopgoot / Beurstraverse',              N'koopgoot-beurstraverse'),
    (N'Winkelcentrum Zuidplein',               N'winkelcentrum-zuidplein'),
    (N'Alexandrium Shopping Center',           N'alexandrium-shopping-center'),
    (N'Alexandrium Megastores',                N'alexandrium-megastores'),
    (N'Alexandrium Woonmall',                  N'alexandrium-woonmall'),
    (N'Markthal Rotterdam',                    N'markthal-rotterdam'),
    (N'Hoogstraat',                            N'hoogstraat'),
    (N'Meent',                                 N'meent'),
    (N'Oude Binnenweg',                        N'oude-binnenweg'),
    (N'Nieuwe Binnenweg',                      N'nieuwe-binnenweg'),
    (N'Van Oldenbarneveltstraat',              N'van-oldenbarneveltstraat'),
    (N'De Bijenkorf / Binnenwegplein-gebied',  N'de-bijenkorf-binnenwegplein-gebied'),
    (N'Coolsingel-winkelgebied',               N'coolsingel-winkelgebied'),
    (N'Beursplein',                            N'beursplein'),
    (N'Binnenwegplein',                        N'binnenwegplein'),
    (N'Korte Hoogstraat',                      N'korte-hoogstraat'),
    (N'Witte de Withstraat',                   N'witte-de-withstraat'),
    (N'West-Kruiskade',                        N'west-kruiskade'),
    (N'Kruiskade',                             N'kruiskade'),
    (N'Pannekoekstraat',                       N'pannekoekstraat'),
    (N'Goudsesingel',                          N'goudsesingel'),
    (N'Zwaanshalskwartier',                    N'zwaanshalskwartier'),
    (N'Noordplein / Oude Noorden',             N'noordplein-oude-noorden'),
    (N'Lusthofstraat',                         N'lusthofstraat'),
    (N'Vlietlaan / Kralingen',                 N'vlietlaan-kralingen'),
    (N'Winkelcentrum Hesseplaats',             N'winkelcentrum-hesseplaats'),
    (N'Boulevard Nesselande',                  N'boulevard-nesselande'),
    (N'Winkelcentrum Schiebroek',              N'winkelcentrum-schiebroek'),
    (N'Kleiwegkwartier',                       N'kleiwegkwartier'),
    (N'Bergse Dorpsstraat / Hillegersberg',    N'bergse-dorpsstraat-hillegersberg'),
    (N'Binnenban Hoogvliet',                   N'binnenban-hoogvliet'),
    (N'Winkelcentrum Hoogvliet Centrum',       N'winkelcentrum-hoogvliet-centrum'),
    (N'Winkelcentrum Zalmplaat',               N'winkelcentrum-zalmplaat'),
    (N'Plein 1953',                            N'plein-1953'),
    (N'Slinge / De Slinge',                    N'slinge-de-slinge'),
    (N'Spinozaweg',                            N'spinozaweg'),
    (N'Beverwaard winkelgebied',               N'beverwaard-winkelgebied'),
    (N'Groene Hilledijk',                      N'groene-hilledijk'),
    (N'Boulevard Zuid',                        N'boulevard-zuid'),
    (N'Afrikaanderplein',                      N'afrikaanderplein-gebied'),
    (N'Vuurplaat',                             N'vuurplaat'),
    (N'Cor Kieboomplein / Stadionweg',         N'cor-kieboomplein-stadionweg'),
    (N'De Veranda / Pathe-De Kuip gebied',     N'de-veranda-pathe-de-kuip-gebied'),
    (N'Bigshops Parkboulevard',                N'bigshops-parkboulevard'),
    (N'Vierambachtsstraat',                    N'vierambachtsstraat'),
    (N'Mathenesserplein',                      N'mathenesserplein'),
    (N'Crooswijkseweg winkelgebied',           N'crooswijkseweg-winkelgebied'),
    (N'Crooswijkse Winkelhoek',                N'crooswijkse-winkelhoek'),
    (N'De Esch winkelgebied',                  N'de-esch-winkelgebied');

DECLARE @FirstNames TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, F NVARCHAR(40));
INSERT INTO @FirstNames (F) VALUES
    (N'Sanne'),(N'Jeroen'),(N'Lotte'),(N'Bram'),(N'Eva'),(N'Tim'),(N'Anouk'),(N'Daan'),(N'Fleur'),(N'Sven'),
    (N'Iris'),(N'Joris'),(N'Maud'),(N'Niels'),(N'Sophie'),(N'Kasper'),(N'Lisa'),(N'Mark'),(N'Esmee'),(N'Pieter'),
    (N'Noa'),(N'Tess'),(N'Finn'),(N'Roos'),(N'Jens'),(N'Liam'),(N'Sara'),(N'Luuk'),(N'Lara'),(N'Floris'),
    (N'Yara'),(N'Senna'),(N'Milan'),(N'Julie'),(N'Bas'),(N'Lieke'),(N'Stijn'),(N'Lynn'),(N'Tom'),(N'Mila');

DECLARE @LastNames TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, L NVARCHAR(40));
INSERT INTO @LastNames (L) VALUES
    (N'de Vries'),(N'Bakker'),(N'Visser'),(N'Janssen'),(N'Smit'),(N'Mulder'),(N'de Boer'),(N'van Dijk'),(N'Peters'),(N'Hendriks'),
    (N'Dekker'),(N'van der Berg'),(N'Brouwer'),(N'Vermeulen'),(N'Hoekstra'),(N'van Leeuwen'),(N'Kramer'),(N'Schouten'),(N'Maas'),(N'Willems'),
    (N'Kuiper'),(N'de Wit'),(N'Hofman'),(N'Bos'),(N'Vos'),(N'Boer'),(N'Verhoef'),(N'Smits'),(N'van Beek'),(N'Koster');

DECLARE @GroupNames TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(64));
INSERT INTO @GroupNames (Name) VALUES
    (N'Tuinieren'), (N'Koken'), (N'Wandelen'), (N'Boeken'), (N'Schilderen'),
    (N'Yoga'), (N'Buurtfeest'), (N'Klussen'), (N'Muziek'), (N'Fietsen'),
    (N'Zwemmen'), (N'Schaken'), (N'Filmavond'), (N'Quizzen'), (N'Naaicafe'),
    (N'Hardlopen'), (N'Tekenen'), (N'Dansen'), (N'Volleybal'), (N'Vrijwilligers');

DECLARE @CompanyAdjectives TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Word NVARCHAR(32));
INSERT INTO @CompanyAdjectives (Word) VALUES
    (N'Groene'), (N'Gouden'), (N'Blauwe'), (N'Stille'), (N'Vrolijke'),
    (N'Snelle'), (N'Slimme'), (N'Warme'), (N'Verse'), (N'Helder');

DECLARE @CompanyNouns TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Word NVARCHAR(32));
INSERT INTO @CompanyNouns (Word) VALUES
    (N'Bakkerij'), (N'Kapsalon'), (N'Garage'), (N'Bloemist'), (N'Drukkerij'),
    (N'Ijssalon'), (N'Cafe'), (N'Boekhandel'), (N'Atelier'), (N'Schoenmakerij'),
    (N'Adviesbureau'), (N'Schoonmaak');

DECLARE @PostTitleStems TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Title NVARCHAR(128));
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

DECLARE @PostBodies TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Body NVARCHAR(MAX));
INSERT INTO @PostBodies (Body) VALUES
    (N'<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Beste buurtbewoners, we organiseren binnenkort weer een gezellige bijeenkomst.</p><p>Iedereen is welkom!</p>'),
    (N'<p>We zijn ontzettend blij om te kunnen aankondigen dat het programma weer start. Aanmelden kan via de receptie of online.</p>'),
    (N'<p>Bedankt aan alle vrijwilligers die zich het afgelopen seizoen hebben ingezet voor onze buurt. Zonder jullie was dit niet mogelijk geweest.</p>'),
    (N'<p>Let op: in verband met onderhoudswerkzaamheden is het centrum komende woensdag gesloten. Excuses voor het ongemak.</p>'),
    (N'<p>Heb jij een uurtje per week over? We zoeken nog enthousiaste mensen om te helpen met de wekelijkse activiteiten. Stuur een bericht!</p>'),
    (N'<p>Tijdens onze laatste bijeenkomst hebben we veel positieve reacties gekregen. Bekijk hieronder de foto-impressie en de aankondigingen voor de volgende keer.</p>');

DECLARE @CommentBodies TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Body NVARCHAR(500));
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

DECLARE @TotalCommunityCount INT = (SELECT COUNT(*) FROM @Cities);
-- One shared pool of dummy users that joins every community —
-- avoids exploding Users by (users-per-community * #communities).
SET @NumUsers = @UsersPerCommunity;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 3) Communities for this chunk                           ║
-- ╚══════════════════════════════════════════════════════════╝

IF OBJECT_ID('tempdb..#PlanCommunities') IS NOT NULL DROP TABLE #PlanCommunities;

CREATE TABLE #PlanCommunities (
    Seq INT NOT NULL PRIMARY KEY,
    Slug NVARCHAR(128) NOT NULL UNIQUE,
    Name NVARCHAR(128) NOT NULL,
    City NVARCHAR(128) NOT NULL,
    CommunityId INT NULL
);

;WITH C AS (
    SELECT n.n AS Seq,
           n.n AS CityIdx
    FROM #Numbers n
    WHERE n.n > @CommunityOffset
      AND n.n <= @CommunityOffset + @CommunityLimit
      AND n.n <= @TotalCommunityCount
)
INSERT INTO #PlanCommunities (Seq, Slug, Name, City)
SELECT c.Seq,
       ci.Slug,
       ci.City,
       ci.City
FROM C c
JOIN @Cities ci ON ci.Id = c.CityIdx;

DECLARE @CommCount INT = (SELECT COUNT(*) FROM #PlanCommunities);

IF @CommCount = 0
BEGIN
    RETURN;
END;

INSERT INTO Community (Slug, Name, ImageUrl)
SELECT pc.Slug,
       pc.Name,
       N'https://picsum.photos/seed/' + pc.Slug + N'/1200/400'
FROM #PlanCommunities pc
WHERE NOT EXISTS (
    SELECT 1
    FROM Community c
    WHERE c.Slug = pc.Slug
);

UPDATE pc
SET pc.CommunityId = c.Id
FROM #PlanCommunities pc
JOIN Community c ON c.Slug = pc.Slug;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 4) Dummy users                                          ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @uIdx INT = 1;
DECLARE @uFn NVARCHAR(40);
DECLARE @uLn NVARCHAR(40);
DECLARE @uName NVARCHAR(100);
DECLARE @uEmail NVARCHAR(256);
DECLARE @newUid INT;

DECLARE @uidTbl TABLE (Uid INT);

DECLARE @FirstCount INT = (SELECT COUNT(*) FROM @FirstNames);
DECLARE @LastCount INT = (SELECT COUNT(*) FROM @LastNames);

IF OBJECT_ID('tempdb..#PlanUsers') IS NOT NULL DROP TABLE #PlanUsers;

CREATE TABLE #PlanUsers (
    Idx INT NOT NULL PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    UserId INT NULL
);

WHILE @uIdx <= @NumUsers
BEGIN
    SELECT @uFn = F FROM @FirstNames WHERE Id = ((@uIdx - 1) % @FirstCount) + 1;
    SELECT @uLn = L FROM @LastNames  WHERE Id = ((@uIdx - 1) % @LastCount) + 1;

    SET @uName = N'dzpdummy.' + RIGHT(N'0000000' + CAST(@uIdx AS NVARCHAR(16)), 7);
    SET @uEmail = @uName + N'@example.com';
    SET @newUid = NULL;

    SELECT @newUid = UserID
    FROM Users
    WHERE Username = @uName;

    IF @newUid IS NULL
    BEGIN
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
        BEGIN
            SELECT @newUid = UserID
            FROM Users
            WHERE Username = @uName;
        END;
    END;

    IF @newUid IS NOT NULL
    BEGIN
        UPDATE Users
        SET DisplayName = @uFn + N' ' + @uLn,
            FirstName = @uFn,
            LastName = @uLn,
            Email = @uEmail,
            IsDeleted = 0
        WHERE UserID = @newUid;

        UPDATE UserPortals
        SET IsDeleted = 0
        WHERE UserId = @newUid
          AND PortalId = @PortalId;

        INSERT INTO #PlanUsers (Idx, Username, UserId)
        VALUES (@uIdx, @uName, @newUid);
    END;

    SET @uIdx = @uIdx + 1;
END;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 5) UserCommunity + beheerders                           ║
-- ║                                                         ║
-- ║ Every dummy user joins every community in this chunk.   ║
-- ║ Same Users rows are shared across all communities so we ║
-- ║ don't blow up the Users table.                          ║
-- ╚══════════════════════════════════════════════════════════╝

INSERT INTO UserCommunity (UserId, CommunityId)
SELECT pu.UserId,
       pc.CommunityId
FROM #PlanUsers pu
CROSS JOIN #PlanCommunities pc
WHERE NOT EXISTS (
    SELECT 1
    FROM UserCommunity x
    WHERE x.UserId = pu.UserId
      AND x.CommunityId = pc.CommunityId
);

-- Every member ("lid") gets the Lid role on join.
IF @LidRole IS NOT NULL
BEGIN
    INSERT INTO UserCommunityRole (UserCommunityId, RoleId)
    SELECT uc.Id,
           @LidRole
    FROM UserCommunity uc
    JOIN #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
    JOIN #PlanUsers pu ON pu.UserId = uc.UserId
    WHERE NOT EXISTS (
        SELECT 1
        FROM UserCommunityRole x
        WHERE x.UserCommunityId = uc.Id
          AND x.RoleId = @LidRole
    );
END;

-- The first 2 dummy users (by Idx) act as Community-beheerder in
-- every community.
IF @BeheerderRole IS NOT NULL
BEGIN
    INSERT INTO UserCommunityRole (UserCommunityId, RoleId)
    SELECT uc.Id,
           @BeheerderRole
    FROM UserCommunity uc
    JOIN #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
    JOIN #PlanUsers pu ON pu.UserId = uc.UserId
    WHERE pu.Idx <= 2
      AND NOT EXISTS (
          SELECT 1
          FROM UserCommunityRole x
          WHERE x.UserCommunityId = uc.Id
            AND x.RoleId = @BeheerderRole
      );
END;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 6) Community groups                                     ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @GroupNameCount INT = (SELECT COUNT(*) FROM @GroupNames);

;WITH G AS (
    SELECT pc.CommunityId,
           pc.Name AS CommName,
           n.n AS Idx,
           gn.Name +
             CASE
                 WHEN ((n.n - 1) / @GroupNameCount) = 0 THEN N''
                 ELSE N' ' + CAST(((n.n - 1) / @GroupNameCount) + 1 AS NVARCHAR(8))
             END AS GroupName
    FROM #PlanCommunities pc
    JOIN #Numbers n ON n.n <= @GroupsPerCommunity
    JOIN @GroupNames gn ON gn.Id = ((n.n - 1) % @GroupNameCount) + 1
)
INSERT INTO CommunityGroups (CommunityId, Name, Description)
SELECT g.CommunityId,
       g.GroupName,
       N'Groep voor ' + g.GroupName + N' liefhebbers in ' + g.CommName + N'.'
FROM G g
WHERE NOT EXISTS (
    SELECT 1
    FROM CommunityGroups x
    WHERE x.CommunityId = g.CommunityId
      AND x.Name = g.GroupName
);

IF OBJECT_ID('tempdb..#GroupsByComm') IS NOT NULL DROP TABLE #GroupsByComm;

SELECT g.Id AS GroupId,
       g.CommunityId,
       ROW_NUMBER() OVER (PARTITION BY g.CommunityId ORDER BY g.Id) AS GroupSeq
INTO #GroupsByComm
FROM CommunityGroups g
JOIN #PlanCommunities pc ON pc.CommunityId = g.CommunityId;

CREATE INDEX IX_GroupsByComm_Comm ON #GroupsByComm (CommunityId, GroupSeq);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 7) Companies                                            ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @AdjCount INT = (SELECT COUNT(*) FROM @CompanyAdjectives);
DECLARE @NounCount INT = (SELECT COUNT(*) FROM @CompanyNouns);

;WITH PerComm AS (
    SELECT pc.CommunityId,
           pc.Slug,
           pc.City,
           pc.Seq AS CommSeq,
           n.n AS Idx
    FROM #PlanCommunities pc
    JOIN #Numbers n ON n.n <= @CompaniesPerCommunity
),
Cmp AS (
    SELECT pc.CommunityId,
           pc.Slug,
           pc.City,
           pc.Idx,
           a.Word + N' ' + nm.Word +
             CASE
                 WHEN pc.Idx <= (@AdjCount * @NounCount) THEN N''
                 ELSE N' ' + CAST(pc.Idx AS NVARCHAR(8))
             END AS CName,
           LOWER(REPLACE(a.Word + N'-' + nm.Word, N' ', N'-')) + N'-' + pc.Slug + N'-' + CAST(pc.Idx AS NVARCHAR(8)) AS CSlug,
           pc.CommSeq * 1000 + pc.Idx AS UniqueOrd
    FROM PerComm pc
    JOIN @CompanyAdjectives a ON a.Id = ((pc.Idx - 1) % @AdjCount) + 1
    JOIN @CompanyNouns nm ON nm.Id = ((pc.Idx - 1 + (CHECKSUM(pc.Slug) & 0x7fffffff)) % @NounCount) + 1
)
INSERT INTO Company (CommunityId, Slug, Name, OwnerId, CompanyInfo, ImageUrl, CreatedOn)
SELECT c.CommunityId,
       c.CSlug,
       c.CName,
       ISNULL((
           SELECT TOP 1 uc.UserId
           FROM UserCommunity uc
           WHERE uc.CommunityId = c.CommunityId
           ORDER BY (CHECKSUM(c.UniqueOrd, uc.UserId) & 0x7fffffff)
       ), @DefaultAuthor),
       N'{"about":"' + c.CName + N' is een fictief bedrijf in ' + c.City + N'.",'
       + N'"address":"Hoofdstraat ' + CAST((((CHECKSUM(c.CSlug) & 0x7fffffff) % 200) + 1) AS NVARCHAR(8)) + N', ' + c.City + N'",'
       + N'"phone":"+31 6 1234 ' + RIGHT(N'0000' + CAST(((CHECKSUM(c.CSlug, 2) & 0x7fffffff) % 10000) AS NVARCHAR(8)), 4) + N'",'
       + N'"email":"' + LOWER(REPLACE(c.CName, N' ', N'.')) + N'@example.com",'
       + N'"website":"https://www.' + LOWER(REPLACE(REPLACE(c.CName, N' ', N''), N'''', N'')) + N'.nl",'
       + N'"banner":"https://picsum.photos/seed/banner-' + c.CSlug + N'/1200/400",'
       + N'"openingHours":{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],'
       + N'"thu":["09:00","17:00"],"fri":["09:00","17:00"],"sat":["10:00","14:00"],"sun":[]}}',
       N'https://picsum.photos/seed/co-' + c.CSlug + N'/600/400',
       GETUTCDATE()
FROM Cmp c
WHERE NOT EXISTS (
    SELECT 1
    FROM Company x
    WHERE x.CommunityId = c.CommunityId
      AND x.Slug = c.CSlug
);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 8) UserCommunityGroups + UserCompany                    ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH UserComm AS (
    SELECT uc.UserId,
           uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId) AS RankInComm,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = uc.CommunityId) AS GrpCnt
    FROM UserCommunity uc
    JOIN #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCommunityGroups (UserId, CommunityGroupId)
SELECT u.UserId,
       g.GroupId
FROM UserComm u
JOIN #GroupsByComm g ON g.CommunityId = u.CommunityId
                    AND g.GroupSeq = CASE WHEN u.GrpCnt > 0 THEN ((u.RankInComm - 1) % u.GrpCnt) + 1 ELSE 0 END
WHERE u.GrpCnt > 0
  AND NOT EXISTS (
      SELECT 1
      FROM UserCommunityGroups x
      WHERE x.UserId = u.UserId
        AND x.CommunityGroupId = g.GroupId
  );

;WITH UserComm AS (
    SELECT uc.UserId,
           uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId DESC) AS RankInComm,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = uc.CommunityId) AS GrpCnt
    FROM UserCommunity uc
    JOIN #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCommunityGroups (UserId, CommunityGroupId)
SELECT u.UserId,
       g.GroupId
FROM UserComm u
JOIN #GroupsByComm g ON g.CommunityId = u.CommunityId
                    AND g.GroupSeq = CASE WHEN u.GrpCnt > 0 THEN ((u.RankInComm - 1) % u.GrpCnt) + 1 ELSE 0 END
WHERE u.UserId % 2 = 0
  AND u.GrpCnt > 0
  AND NOT EXISTS (
      SELECT 1
      FROM UserCommunityGroups x
      WHERE x.UserId = u.UserId
        AND x.CommunityGroupId = g.GroupId
  );

IF OBJECT_ID('tempdb..#CompaniesByComm') IS NOT NULL DROP TABLE #CompaniesByComm;

SELECT c.Id AS CompanyId,
       c.CommunityId,
       ROW_NUMBER() OVER (PARTITION BY c.CommunityId ORDER BY c.Id) AS CmpSeq
INTO #CompaniesByComm
FROM Company c
JOIN #PlanCommunities pc ON pc.CommunityId = c.CommunityId;

CREATE INDEX IX_CompaniesByComm_Comm ON #CompaniesByComm (CommunityId, CmpSeq);

;WITH UserComm AS (
    SELECT uc.UserId,
           uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId) AS RankInComm,
           (SELECT COUNT(*) FROM #CompaniesByComm cc WHERE cc.CommunityId = uc.CommunityId) AS CmpCnt
    FROM UserCommunity uc
    JOIN #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCompany (UserId, CompanyId, ShowInTeam)
SELECT u.UserId,
       c.CompanyId,
       1
FROM UserComm u
JOIN #CompaniesByComm c ON c.CommunityId = u.CommunityId
                       AND c.CmpSeq = CASE WHEN u.CmpCnt > 0 THEN ((u.RankInComm - 1) % u.CmpCnt) + 1 ELSE 0 END
WHERE u.CmpCnt > 0
  AND NOT EXISTS (
      SELECT 1
      FROM UserCompany x
      WHERE x.UserId = u.UserId
        AND x.CompanyId = c.CompanyId
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 9) Posts                                                ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @TitleCount INT = (SELECT COUNT(*) FROM @PostTitleStems);
DECLARE @BodyCount INT = (SELECT COUNT(*) FROM @PostBodies);

IF OBJECT_ID('tempdb..#PostPlan') IS NOT NULL DROP TABLE #PostPlan;

SELECT pc.CommunityId,
       pc.Slug AS CSlug,
       pc.City,
       pc.Seq AS CommSeq,
       n.n AS PostIdx,
       (CHECKSUM(pc.CommunityId, n.n, 1) & 0x7fffffff) AS R1,
       (CHECKSUM(pc.CommunityId, n.n, 2) & 0x7fffffff) AS R2,
       (CHECKSUM(pc.CommunityId, n.n, 3) & 0x7fffffff) AS R3,
       (CHECKSUM(pc.CommunityId, n.n, 4) & 0x7fffffff) AS R4
INTO #PostPlan
FROM #PlanCommunities pc
JOIN #Numbers n ON n.n <= @PostsPerCommunity;

;WITH PlannedPosts AS (
    SELECT p.CommunityId,
           p.CSlug,
           p.City,
           p.PostIdx,
           p.R1,
           p.R2,
           p.R3,
           p.R4,
           ((p.R1 % 3) + 1) AS PostType,
           CASE
               WHEN p.PostIdx = 1 THEN N'[Concept] '
               WHEN p.PostIdx = 2 THEN N'[Gepland] '
               ELSE N''
           END + ts.Title + N' (' + p.City + N' #' + CAST(p.PostIdx AS NVARCHAR(8)) + N')' AS Title,
           bd.Body AS Body
    FROM #PostPlan p
    JOIN @PostTitleStems ts ON ts.Id = ((p.R1 / 3) % @TitleCount) + 1
    JOIN @PostBodies bd ON bd.Id = ((p.R1 / 17) % @BodyCount) + 1
)
INSERT INTO Dnn_Modules_Blog_Posts
    (ModuleId, CommunityId, PostType, Title, Content, ImageUrl,
     AuthorUserId, PublishOn, EventClosingOn,
     IsDraft, IsDeleted, ViewCount, ClickCount, CommentCount,
     CreatedOn, ModifiedOn, IsPriority)
SELECT @ModuleId,
       p.CommunityId,
       p.PostType,
       p.Title,
       p.Body,
       N'https://picsum.photos/seed/post-' + p.CSlug + N'-' + CAST(p.PostIdx AS NVARCHAR(8)) + N'/800/450',
       CASE
           WHEN p.PostIdx = 1 THEN @DefaultAuthor
           ELSE ISNULL((
               SELECT TOP 1 uc.UserId
               FROM UserCommunity uc
               WHERE uc.CommunityId = p.CommunityId
               ORDER BY (CHECKSUM(p.R2, uc.UserId) & 0x7fffffff)
           ), @DefaultAuthor)
       END,
       CASE
           WHEN p.PostIdx = 2
               THEN DATEADD(MINUTE, (p.R3 % (60 * 24 * 30)) + 60, GETUTCDATE())
           ELSE DATEADD(MINUTE, -((p.R3 % (60 * 24 * 90)) + 1), GETUTCDATE())
       END,
       NULL,
       CASE WHEN p.PostIdx = 1 THEN 1 ELSE 0 END,
       0,
       0,
       0,
       0,
       DATEADD(DAY, -((p.R4 % 90) + 1), GETUTCDATE()),
       GETUTCDATE(),
       -- Pin the first published post (PostIdx=3) and an extra one (PostIdx=7
       -- when seeded) so the "priority always on top" behaviour is visible
       -- right after seeding without overwhelming the feed.
       CASE WHEN p.PostIdx IN (3, 7) THEN 1 ELSE 0 END
FROM PlannedPosts p
WHERE NOT EXISTS (
    SELECT 1
    FROM Dnn_Modules_Blog_Posts x
    WHERE x.CommunityId = p.CommunityId
      AND x.Title = p.Title
      AND x.IsDeleted = 0
);

UPDATE p
SET p.EventClosingOn = DATEADD(
        DAY,
        ((CHECKSUM(p.PostId, p.CommunityId, 8) & 0x7fffffff) % 60) + 1,
        ISNULL(p.PublishOn, GETUTCDATE())
    )
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
WHERE p.PostType = 2
  AND p.EventClosingOn IS NULL;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 10) Post groups                                         ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH Eligible AS (
    SELECT p.PostId,
           p.CommunityId,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = p.CommunityId) AS GrpCnt,
           (CHECKSUM(p.PostId, p.CommunityId, 91) & 0x7fffffff) AS Rnd
    FROM Dnn_Modules_Blog_Posts p
    JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
INSERT INTO Dnn_Modules_Blog_PostGroups (PostId, CommunityGroupId)
SELECT e.PostId,
       g.GroupId
FROM Eligible e
JOIN #GroupsByComm g ON g.CommunityId = e.CommunityId
                    AND g.GroupSeq = CASE WHEN e.GrpCnt > 0 THEN (e.Rnd % e.GrpCnt) + 1 ELSE 0 END
WHERE e.GrpCnt > 0
  AND (e.Rnd % 10) < 7
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_PostGroups x
      WHERE x.PostId = e.PostId
        AND x.CommunityGroupId = g.GroupId
  );

;WITH Eligible AS (
    SELECT p.PostId,
           p.CommunityId,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = p.CommunityId) AS GrpCnt,
           (CHECKSUM(p.PostId, p.CommunityId, 92) & 0x7fffffff) AS Rnd
    FROM Dnn_Modules_Blog_Posts p
    JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
INSERT INTO Dnn_Modules_Blog_PostGroups (PostId, CommunityGroupId)
SELECT e.PostId,
       g.GroupId
FROM Eligible e
JOIN #GroupsByComm g ON g.CommunityId = e.CommunityId
                    AND g.GroupSeq = CASE WHEN e.GrpCnt > 1 THEN (e.Rnd % e.GrpCnt) + 1 ELSE 0 END
WHERE e.GrpCnt > 1
  AND (e.Rnd % 10) < 3
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_PostGroups x
      WHERE x.PostId = e.PostId
        AND x.CommunityGroupId = g.GroupId
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 11) Post audience                                       ║
-- ╚══════════════════════════════════════════════════════════╝

IF OBJECT_ID('tempdb..#PostAudience') IS NOT NULL DROP TABLE #PostAudience;

CREATE TABLE #PostAudience (
    PostId INT NOT NULL,
    UserId INT NOT NULL,
    PRIMARY KEY (PostId, UserId)
);

;WITH WPosts AS (
    SELECT p.PostId,
           p.CommunityId
    FROM Dnn_Modules_Blog_Posts p
    JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
    WHERE p.IsDeleted = 0
),
Beheerders AS (
    SELECT uc.UserId,
           uc.CommunityId
    FROM UserCommunity uc
    JOIN UserCommunityRole ucr ON ucr.UserCommunityId = uc.Id
    WHERE @BeheerderRole IS NOT NULL
      AND ucr.RoleId = @BeheerderRole
)
INSERT INTO #PostAudience (PostId, UserId)
SELECT DISTINCT w.PostId,
       x.UserId
FROM WPosts w
CROSS APPLY (
    SELECT uc.UserId
    FROM UserCommunity uc
    WHERE uc.CommunityId = w.CommunityId
      AND (
            NOT EXISTS (
                SELECT 1
                FROM Dnn_Modules_Blog_PostGroups pg
                WHERE pg.PostId = w.PostId
            )
            OR EXISTS (
                SELECT 1
                FROM UserCommunityGroups ucg
                JOIN Dnn_Modules_Blog_PostGroups pg ON pg.CommunityGroupId = ucg.CommunityGroupId
                WHERE ucg.UserId = uc.UserId
                  AND pg.PostId = w.PostId
            )
      )

    UNION

    SELECT b.UserId
    FROM Beheerders b
    WHERE b.CommunityId = w.CommunityId
) x;

CREATE INDEX IX_PostAud_Post ON #PostAudience (PostId) INCLUDE (UserId);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 12) Comments                                            ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @CmtBodyCount INT = (SELECT COUNT(*) FROM @CommentBodies);

;WITH Targets AS (
    SELECT p.PostId,
           p.CreatedOn,
           @MinCommentsPerPost
             + ((CHECKSUM(p.PostId, p.CommunityId, 111) & 0x7fffffff)
                % (@MaxCommentsPerPost - @MinCommentsPerPost + 1)) AS NumCmts,
           (SELECT COUNT(*) FROM #PostAudience pa WHERE pa.PostId = p.PostId) AS AudSize
    FROM Dnn_Modules_Blog_Posts p
    JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
    WHERE p.IsDraft = 0
      AND p.IsDeleted = 0
      AND p.PublishOn <= GETUTCDATE()
      AND NOT EXISTS (
          SELECT 1
          FROM Dnn_Modules_Blog_Comments c
          WHERE c.PostId = p.PostId
            AND c.IsDeleted = 0
      )
),
Expanded AS (
    SELECT t.PostId,
           t.CreatedOn,
           n.n AS Slot,
           t.AudSize,
           (CHECKSUM(t.PostId, n.n, 112) & 0x7fffffff) AS R
    FROM Targets t
    JOIN #Numbers n ON n.n <= t.NumCmts
    WHERE t.AudSize > 0
)
INSERT INTO Dnn_Modules_Blog_Comments (PostId, UserId, Body, IsDeleted, CreatedOn)
SELECT e.PostId,
       au.UserId,
       cb.Body,
       0,
       DATEADD(MINUTE, e.R % (60 * 24 * 7), e.CreatedOn)
FROM Expanded e
CROSS APPLY (
    SELECT TOP 1 pa.UserId
    FROM #PostAudience pa
    WHERE pa.PostId = e.PostId
    ORDER BY (CHECKSUM(e.PostId, e.Slot, pa.UserId, 113) & 0x7fffffff)
) au
JOIN @CommentBodies cb ON cb.Id = ((e.R / 7) % @CmtBodyCount) + 1;

UPDATE p
SET p.CommentCount = ISNULL(cmt.cnt, 0)
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
OUTER APPLY (
    SELECT COUNT(*) AS cnt
    FROM Dnn_Modules_Blog_Comments c
    WHERE c.PostId = p.PostId
      AND c.IsDeleted = 0
) cmt;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 13) Survey questions                                    ║
-- ║                                                         ║
-- ║ Re-runs without an intervening clear keep existing      ║
-- ║ questions; run seed-wijkcentra-clear.sql first when you ║
-- ║ change the per-survey counts.                           ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @SingleQ TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Q NVARCHAR(256),
    O1 NVARCHAR(128),
    O2 NVARCHAR(128),
    O3 NVARCHAR(128),
    O4 NVARCHAR(128)
);

INSERT INTO @SingleQ (Q, O1, O2, O3, O4) VALUES
    (N'Hoe vaak bezoek je ons wijkcentrum?', N'Wekelijks', N'Maandelijks', N'Een paar keer per jaar', N'(Bijna) nooit'),
    (N'Hoe tevreden ben je over de activiteiten?', N'Zeer tevreden', N'Tevreden', N'Neutraal', N'Ontevreden'),
    (N'Op welk moment van de dag kom je het liefst langs?', N'Ochtend', N'Middag', N'Avond', N'Weekend'),
    (N'Hoe ben je bekend geraakt met dit initiatief?', N'Via buren', N'Via social media', N'Via de nieuwsbrief', N'Anders');

DECLARE @MultiQ TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Q NVARCHAR(256),
    O1 NVARCHAR(128),
    O2 NVARCHAR(128),
    O3 NVARCHAR(128),
    O4 NVARCHAR(128)
);

INSERT INTO @MultiQ (Q, O1, O2, O3, O4) VALUES
    (N'Welke activiteiten interesseren je? (meerdere antwoorden mogelijk)', N'Sport & beweging', N'Cultuur & kunst', N'Educatie', N'Sociale ontmoetingen'),
    (N'Welke faciliteiten zou je willen zien?', N'Koffiehoek', N'Werkplekken', N'Speelhoek kinderen', N'Buitenterras'),
    (N'Aan welke dagen ben je doorgaans beschikbaar?', N'Maandag - Donderdag', N'Vrijdag', N'Zaterdag', N'Zondag'),
    (N'Welke onderwerpen vind je belangrijk voor de buurt?', N'Veiligheid', N'Groen & milieu', N'Zorg', N'Mobiliteit');

DECLARE @OpenQ TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Q NVARCHAR(256)
);

INSERT INTO @OpenQ (Q) VALUES
    (N'Heb je nog suggesties of opmerkingen voor ons?'),
    (N'Wat zou je graag willen veranderen in onze wijk?'),
    (N'Welke nieuwe activiteit zou je graag terugzien?'),
    (N'Heb je tips voor de organisatie?');

DECLARE @SingleQCount INT = (SELECT COUNT(*) FROM @SingleQ);
DECLARE @MultiQCount INT = (SELECT COUNT(*) FROM @MultiQ);
DECLARE @OpenQCount INT = (SELECT COUNT(*) FROM @OpenQ);

-- Stress-test how the survey UI scales: each survey post gets a
-- mixed-type question set sized via the sqlcmd variables above
-- (controlled from reseed.ps1).

-- ── Single-choice questions ─────────────────────────────────────
INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
SELECT p.PostId,
       1,
       sq.Q + N' (Vraag ' + CAST(n.n AS NVARCHAR(8)) + N')',
       n.n
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN #Numbers n ON n.n <= @SingleQuestionsPerSurvey
JOIN @SingleQ sq ON sq.Id = (((CHECKSUM(p.PostId, 1, n.n) & 0x7fffffff) % @SingleQCount) + 1)
WHERE p.PostType = 3
  AND p.IsDeleted = 0
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_Questions q
      WHERE q.PostId = p.PostId
        AND q.QuestionType = 1
        AND q.SortOrder = n.n
  );

INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder)
SELECT q.QuestionId, x.OptionText, x.SortOrder
FROM Dnn_Modules_Blog_Questions q
JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN @SingleQ sq ON sq.Id = (((CHECKSUM(q.PostId, 1, q.SortOrder) & 0x7fffffff) % @SingleQCount) + 1)
CROSS APPLY (
    VALUES (sq.O1, 1), (sq.O2, 2), (sq.O3, 3), (sq.O4, 4)
) x(OptionText, SortOrder)
WHERE q.QuestionType = 1
  AND p.PostType = 3
  AND q.SortOrder BETWEEN 1 AND @SingleQuestionsPerSurvey
  AND x.OptionText IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_QuestionOptions qo
      WHERE qo.QuestionId = q.QuestionId
        AND qo.SortOrder = x.SortOrder
  );

-- ── Multiple-choice questions ───────────────────────────────────
INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
SELECT p.PostId,
       2,
       mq.Q + N' (Vraag ' + CAST(n.n AS NVARCHAR(8)) + N')',
       100 + n.n
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN #Numbers n ON n.n <= @MultiQuestionsPerSurvey
JOIN @MultiQ mq ON mq.Id = (((CHECKSUM(p.PostId, 2, n.n) & 0x7fffffff) % @MultiQCount) + 1)
WHERE p.PostType = 3
  AND p.IsDeleted = 0
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_Questions q
      WHERE q.PostId = p.PostId
        AND q.QuestionType = 2
        AND q.SortOrder = 100 + n.n
  );

INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder)
SELECT q.QuestionId, x.OptionText, x.SortOrder
FROM Dnn_Modules_Blog_Questions q
JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN @MultiQ mq ON mq.Id = (((CHECKSUM(q.PostId, 2, q.SortOrder - 100) & 0x7fffffff) % @MultiQCount) + 1)
CROSS APPLY (
    VALUES (mq.O1, 1), (mq.O2, 2), (mq.O3, 3), (mq.O4, 4)
) x(OptionText, SortOrder)
WHERE q.QuestionType = 2
  AND p.PostType = 3
  AND q.SortOrder BETWEEN 101 AND 100 + @MultiQuestionsPerSurvey
  AND x.OptionText IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_QuestionOptions qo
      WHERE qo.QuestionId = q.QuestionId
        AND qo.SortOrder = x.SortOrder
  );

-- ── Open questions ──────────────────────────────────────────────
INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
SELECT p.PostId,
       3,
       oq.Q + N' (Vraag ' + CAST(n.n AS NVARCHAR(8)) + N')',
       200 + n.n
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN #Numbers n ON n.n <= @OpenQuestionsPerSurvey
JOIN @OpenQ oq ON oq.Id = (((CHECKSUM(p.PostId, 3, n.n) & 0x7fffffff) % @OpenQCount) + 1)
WHERE p.PostType = 3
  AND p.IsDeleted = 0
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_Questions q
      WHERE q.PostId = p.PostId
        AND q.QuestionType = 3
        AND q.SortOrder = 200 + n.n
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 13b) Survey answers                                     ║
-- ║                                                         ║
-- ║ Seed dummy submissions for every published survey post  ║
-- ║ (PostType = 3) so that the post-card "comments" total   ║
-- ║ matches the total number of survey answers.             ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @AnswerTexts TABLE (Id INT IDENTITY(1,1) PRIMARY KEY, Body NVARCHAR(500));
INSERT INTO @AnswerTexts (Body) VALUES
    (N'Bedankt voor de enquete, ik vind dit een goed initiatief.'),
    (N'Meer activiteiten in het weekend zou geweldig zijn.'),
    (N'Ik mis een gezellige ontmoetingsplek voor jongeren.'),
    (N'Misschien iets organiseren rond duurzaamheid?'),
    (N'Houden zo, het is goed zoals het nu loopt.'),
    (N'Een vaste koffieochtend voor ouderen zou helpen.'),
    (N'Graag meer aandacht voor de speeltuinen in de buurt.'),
    (N'Goede communicatie via de nieuwsbrief, ga zo door.'),
    (N'Ik zou graag meer culturele evenementen zien.'),
    (N'Veiligheid s avonds blijft een aandachtspunt.');

DECLARE @AnsTextCount INT = (SELECT COUNT(*) FROM @AnswerTexts);

-- Eligible questions: published survey posts in this chunk that
-- still have no answers stored.
IF OBJECT_ID('tempdb..#SurveyQ') IS NOT NULL DROP TABLE #SurveyQ;

SELECT q.QuestionId,
       q.PostId,
       q.QuestionType
INTO #SurveyQ
FROM Dnn_Modules_Blog_Questions q
JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
WHERE p.PostType = 3
  AND p.IsDraft = 0
  AND p.IsDeleted = 0
  AND p.PublishOn <= GETUTCDATE()
  AND NOT EXISTS (
      SELECT 1
      FROM Dnn_Modules_Blog_Answers a
      WHERE a.QuestionId = q.QuestionId
  );

-- Every audience member answers every question (no sampling).
IF OBJECT_ID('tempdb..#Responders') IS NOT NULL DROP TABLE #Responders;

SELECT sq.QuestionId,
       sq.PostId,
       sq.QuestionType,
       pa.UserId,
       (CHECKSUM(sq.QuestionId, pa.UserId, 211) & 0x7fffffff) AS R
INTO #Responders
FROM #SurveyQ sq
JOIN #PostAudience pa ON pa.PostId = sq.PostId;

-- ── Single-choice answers (one option per user) ────────────────
;WITH OptsByQ AS (
    SELECT qo.QuestionId,
           qo.OptionId,
           ROW_NUMBER() OVER (PARTITION BY qo.QuestionId ORDER BY qo.SortOrder, qo.OptionId) AS Seq,
           COUNT(*) OVER (PARTITION BY qo.QuestionId) AS Cnt
    FROM Dnn_Modules_Blog_QuestionOptions qo
)
INSERT INTO Dnn_Modules_Blog_Answers (QuestionId, UserId, OptionId, AnswerText, CreatedOn)
SELECT r.QuestionId,
       r.UserId,
       o.OptionId,
       NULL,
       DATEADD(MINUTE, -(r.R % (60 * 24 * 30)), GETUTCDATE())
FROM #Responders r
JOIN OptsByQ o ON o.QuestionId = r.QuestionId
              AND o.Seq = (r.R % CASE WHEN o.Cnt = 0 THEN 1 ELSE o.Cnt END) + 1
WHERE r.QuestionType = 1;

-- ── Multiple-choice answers (1-N options per user) ─────────────
;WITH OptsByQ AS (
    SELECT qo.QuestionId,
           qo.OptionId,
           ROW_NUMBER() OVER (PARTITION BY qo.QuestionId ORDER BY qo.SortOrder, qo.OptionId) AS Seq,
           COUNT(*) OVER (PARTITION BY qo.QuestionId) AS Cnt
    FROM Dnn_Modules_Blog_QuestionOptions qo
),
Picks AS (
    SELECT r.QuestionId,
           r.UserId,
           r.R,
           o.OptionId,
           o.Seq,
           o.Cnt,
           (CHECKSUM(r.QuestionId, r.UserId, o.OptionId, 212) & 0x7fffffff) AS PR
    FROM #Responders r
    JOIN OptsByQ o ON o.QuestionId = r.QuestionId
    WHERE r.QuestionType = 2
)
INSERT INTO Dnn_Modules_Blog_Answers (QuestionId, UserId, OptionId, AnswerText, CreatedOn)
SELECT p.QuestionId,
       p.UserId,
       p.OptionId,
       NULL,
       DATEADD(MINUTE, -(p.PR % (60 * 24 * 30)), GETUTCDATE())
FROM Picks p
WHERE
      -- Guarantee at least one option per user.
      p.Seq = (p.R % CASE WHEN p.Cnt = 0 THEN 1 ELSE p.Cnt END) + 1
   -- Other options are picked with ~35% probability each.
   OR (p.PR % 100) < 35;

-- ── Open answers (free text) ───────────────────────────────────
INSERT INTO Dnn_Modules_Blog_Answers (QuestionId, UserId, OptionId, AnswerText, CreatedOn)
SELECT r.QuestionId,
       r.UserId,
       NULL,
       at.Body,
       DATEADD(MINUTE, -(r.R % (60 * 24 * 30)), GETUTCDATE())
FROM #Responders r
JOIN @AnswerTexts at ON at.Id = ((r.R / 13) % @AnsTextCount) + 1
WHERE r.QuestionType = 3;

-- Note: post.CommentCount is NOT overridden for surveys — it stays
-- in sync with the regular Comments table (set in section 12), so
-- the post card's "comments" indicator and the reactions tab agree.

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 14) View / click stats                                  ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH PostAudienceCnt AS (
    SELECT p.PostId,
           ISNULL((SELECT COUNT(*) FROM #PostAudience pa WHERE pa.PostId = p.PostId), 0) AS Audience
    FROM Dnn_Modules_Blog_Posts p
    JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
UPDATE p
SET p.ViewCount = v.Views,
    p.ClickCount = v.Clicks
FROM Dnn_Modules_Blog_Posts p
JOIN PostAudienceCnt pa ON pa.PostId = p.PostId
CROSS APPLY (
    SELECT CASE
               WHEN pa.Audience = 0 THEN 0
               ELSE pa.Audience - (
                    (CHECKSUM(p.PostId, p.CommunityId, 131) & 0x7fffffff)
                    % CASE
                          WHEN pa.Audience > 1 THEN CAST(CEILING(pa.Audience * 0.7) AS INT)
                          ELSE 1
                      END
               )
           END AS Views
) vRaw
CROSS APPLY (
    SELECT vRaw.Views,
           CASE
               WHEN vRaw.Views = 0 THEN 0
               ELSE CAST(vRaw.Views * (0.2 + ((CHECKSUM(p.PostId, p.CommunityId, 132) & 0x7fffffff) % 60) / 100.0) AS INT)
           END AS Clicks
) v;

UPDATE p
SET p.ViewCount = 0,
    p.ClickCount = 0,
    p.CommentCount = 0
FROM Dnn_Modules_Blog_Posts p
JOIN #PlanCommunities pc ON pc.CommunityId = p.CommunityId
WHERE p.IsDraft = 1
   OR p.PublishOn > GETUTCDATE();

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 14b) Discovery cards (Ondekt)                           ║
-- ║                                                         ║
-- ║ Seeds CommunityDiscoverCategory + CommunityDiscoverButton ║
-- ║ per community, each with a Lucide icon name.            ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @DiscoverCats TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(128),
    Descr NVARCHAR(512),
    Icon  NVARCHAR(64)
);

INSERT INTO @DiscoverCats (Title, Descr, Icon) VALUES
    (N'Eten & Drinken',   N'Lokale restaurants, cafes en lunchadressen om te ontdekken.',  N'utensils'),
    (N'Winkelen',         N'Winkels, boutieks en marktjes in de buurt.',                   N'shopping-bag'),
    (N'Cultuur',          N'Musea, galeries, theaters en bijzondere plekken.',             N'palette'),
    (N'Buurthuis',        N'Activiteiten en bijeenkomsten in en rondom het wijkcentrum.',  N'house'),
    (N'Sport & Beweging', N'Sportscholen, parken en sportieve activiteiten.',              N'dumbbell'),
    (N'Groen & Parken',   N'Wandel- en fietsroutes en groene plekken om te ontspannen.',   N'trees');

DECLARE @DiscoverBtns TABLE (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CatIdx INT,
    Label NVARCHAR(128),
    Icon  NVARCHAR(64),
    UrlSuffix NVARCHAR(128)
);

INSERT INTO @DiscoverBtns (CatIdx, Label, Icon, UrlSuffix) VALUES
    (1, N'Restaurants',     N'utensils-crossed', N'restaurants'),
    (1, N'Cafes',           N'coffee',           N'cafes'),
    (1, N'Lunchrooms',      N'sandwich',         N'lunch'),
    (1, N'Terrassen',       N'sun',              N'terrassen'),

    (2, N'Boutieks',        N'shirt',            N'boutieks'),
    (2, N'Markten',         N'store',            N'markten'),
    (2, N'Boekhandels',     N'book-open',        N'boekhandels'),

    (3, N'Musea',           N'landmark',         N'musea'),
    (3, N'Galeries',        N'image',            N'galeries'),
    (3, N'Theaters',        N'drama',            N'theaters'),

    (4, N'Agenda',          N'calendar',         N'agenda'),
    (4, N'Cursussen',       N'graduation-cap',   N'cursussen'),
    (4, N'Vrijwilligers',   N'hand-heart',       N'vrijwilligers'),

    (5, N'Sportscholen',    N'dumbbell',         N'sportscholen'),
    (5, N'Yoga',            N'flower',           N'yoga'),
    (5, N'Hardlooproutes',  N'footprints',       N'hardlopen'),

    (6, N'Parken',          N'tree-pine',        N'parken'),
    (6, N'Wandelroutes',    N'map',              N'wandelroutes'),
    (6, N'Fietsroutes',     N'bike',             N'fietsroutes');

INSERT INTO CommunityDiscoverCategory (CommunityId, Title, Description, Icon, IsVisible, SortOrder, CreatedOn)
SELECT pc.CommunityId,
       dc.Title,
       dc.Descr,
       dc.Icon,
       1,
       dc.Id,
       GETUTCDATE()
FROM #PlanCommunities pc
CROSS JOIN @DiscoverCats dc
WHERE NOT EXISTS (
    SELECT 1
    FROM CommunityDiscoverCategory x
    WHERE x.CommunityId = pc.CommunityId
      AND x.Title = dc.Title
);

INSERT INTO CommunityDiscoverButton (CommunityDiscoverCategoryId, Label, Icon, Url, IsVisible, SortOrder, CreatedOn)
SELECT cat.Id,
       db.Label,
       db.Icon,
       N'https://example.com/' + pc.Slug + N'/' + db.UrlSuffix,
       1,
       db.Id,
       GETUTCDATE()
FROM #PlanCommunities pc
JOIN CommunityDiscoverCategory cat ON cat.CommunityId = pc.CommunityId
JOIN @DiscoverCats dc ON dc.Title = cat.Title
JOIN @DiscoverBtns db ON db.CatIdx = dc.Id
WHERE NOT EXISTS (
    SELECT 1
    FROM CommunityDiscoverButton x
    WHERE x.CommunityDiscoverCategoryId = cat.Id
      AND x.Label = db.Label
);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 15) Compact final summary                               ║
-- ╚══════════════════════════════════════════════════════════╝

SELECT
    CAST(c.Id AS VARCHAR(6)) AS Id,
    CAST(c.Slug AS VARCHAR(32)) AS Slug,

    CAST((
        SELECT COUNT(*)
        FROM UserCommunity uc
        WHERE uc.CommunityId = c.Id
    ) AS VARCHAR(7)) AS Members,

    CAST((
        SELECT COUNT(*)
        FROM CommunityGroups g
        WHERE g.CommunityId = c.Id
    ) AS VARCHAR(6)) AS Groups,

    CAST((
        SELECT COUNT(*)
        FROM Company co
        WHERE co.CommunityId = c.Id
    ) AS VARCHAR(9)) AS Companies,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Posts p
        WHERE p.CommunityId = c.Id
    ) AS VARCHAR(5)) AS Posts,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Posts p
        WHERE p.CommunityId = c.Id
          AND p.IsDraft = 1
    ) AS VARCHAR(6)) AS Drafts,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Posts p
        WHERE p.CommunityId = c.Id
          AND p.PublishOn > GETUTCDATE()
          AND p.IsDraft = 0
    ) AS VARCHAR(9)) AS Scheduled,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Comments cm
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = cm.PostId
        WHERE p.CommunityId = c.Id
    ) AS VARCHAR(8)) AS Comments,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_PostGroups pg
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = pg.PostId
        WHERE p.CommunityId = c.Id
    ) AS VARCHAR(4)) AS Tags,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Posts p
        WHERE p.CommunityId = c.Id
          AND p.PostType = 3
    ) AS VARCHAR(7)) AS Surveys,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Questions q
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
        WHERE p.CommunityId = c.Id
    ) AS VARCHAR(9)) AS Questions,

    CAST((
        SELECT COUNT(*)
        FROM Dnn_Modules_Blog_Answers a
        JOIN Dnn_Modules_Blog_Questions q ON q.QuestionId = a.QuestionId
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
        WHERE p.CommunityId = c.Id
    ) AS VARCHAR(8)) AS Answers,

    CAST((
        SELECT COUNT(*)
        FROM CommunityDiscoverCategory dc
        WHERE dc.CommunityId = c.Id
    ) AS VARCHAR(7)) AS DiscCats,

    CAST((
        SELECT COUNT(*)
        FROM CommunityDiscoverButton db
        JOIN CommunityDiscoverCategory dc ON dc.Id = db.CommunityDiscoverCategoryId
        WHERE dc.CommunityId = c.Id
    ) AS VARCHAR(7)) AS DiscBtns

FROM Community c
JOIN #PlanCommunities pc ON pc.CommunityId = c.Id
ORDER BY pc.Seq;