-- ═══════════════════════════════════════════════════════════════
--  Seed: Stress-test "Wijkcentra" (Dutch community centers)
--
--  Tunable counters at the top control everything. Defaults:
--       50 communities (fixed — one per Rotterdam location in @Cities)
--      500 dummy users  (Username LIKE 'dzpdummy.%')
--      200 community groups (~2 per community)
--      500 companies   (~5 per community)
--     1000 blog posts  (~10 per community)
--    Per published post: 5-15 comments (capped at audience size,
--    audience users may comment more than once for stress data).
--
--  Set-based wherever possible — runs in seconds even at scale.
--
--  Dummy user authoring is restricted by the Drafts feed, so the
--  FIRST post in every community is authored by the host/super-
--  user and marked as a draft. The SECOND post is "scheduled"
--  (PublishOn in the future). The rest are published.
--
--  Audience model (used for both comments and view/click stats):
--      * Members of the post's community whose group memberships
--        intersect the post's tagged groups (when any).
--      * Plus all "Community beheerders" of the community.
--
--  Run with sqlcmd -I (script also sets QUOTED_IDENTIFIER ON).
-- ═══════════════════════════════════════════════════════════════

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 0) Tunable scale + globals                                ║
-- ║    All counts must be supplied via sqlcmd -v.              ║
-- ║    Communities are fixed (50 Rotterdam locations in        ║
-- ║    @Cities). In-script :setvar would override -v           ║
-- ║    (sqlcmd precedence), so no defaults here.               ║
-- ║    To run standalone:                                      ║
-- ║      sqlcmd -i seed-wijkcentra.sql ^                       ║
-- ║        -v NumUsers=50 ^                                    ║
-- ║           GroupsPerCommunity=20 CompaniesPerCommunity=10 ^ ║
-- ║           PostsPerCommunity=10 MinCommentsPerPost=5 ^      ║
-- ║           MaxCommentsPerPost=15                            ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @NumUsers               INT = $(NumUsers);
DECLARE @GroupsPerCommunity     INT = $(GroupsPerCommunity);
DECLARE @CompaniesPerCommunity  INT = $(CompaniesPerCommunity);
DECLARE @PostsPerCommunity      INT = $(PostsPerCommunity);
DECLARE @MinCommentsPerPost     INT = $(MinCommentsPerPost);
DECLARE @MaxCommentsPerPost     INT = $(MaxCommentsPerPost);

DECLARE @ModuleId      INT = (SELECT TOP 1 m.ModuleID
                              FROM Modules m
                              JOIN ModuleDefinitions md ON m.ModuleDefID = md.ModuleDefID
                              JOIN DesktopModules    dm ON md.DesktopModuleID = dm.DesktopModuleID
                              WHERE dm.FolderName = 'Dnn.Modules.Blog');
DECLARE @PortalId      INT = 0;
DECLARE @DefaultAuthor INT = (SELECT TOP 1 UserID FROM Users WHERE IsDeleted = 0 AND IsSuperUser = 1);
DECLARE @CreatedBy     INT = @DefaultAuthor;
DECLARE @BeheerderRole INT = (SELECT TOP 1 RoleID FROM Roles WHERE RoleName = N'Community beheerder');

IF @ModuleId IS NULL
BEGIN
    RAISERROR('No Dnn.Modules.Blog module instance found. Add the Blog module to a page first.', 16, 1);
    RETURN;
END

-- A reusable Numbers table (1..50 * @PostsPerCommunity * 16, plenty).
-- Built once; cheap.
IF OBJECT_ID('tempdb..#Numbers') IS NOT NULL DROP TABLE #Numbers;
CREATE TABLE #Numbers (n INT PRIMARY KEY);
;WITH gen AS (
    SELECT TOP (CASE WHEN 50 * @PostsPerCommunity * 16 < 16384
                     THEN 16384 ELSE 50 * @PostsPerCommunity * 16 END)
           ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
INSERT INTO #Numbers (n) SELECT n FROM gen;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 1) Word pools                                             ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @Cities TABLE (Id INT IDENTITY(1,1), City NVARCHAR(128), Slug NVARCHAR(128));
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

DECLARE @FirstNames TABLE (Id INT IDENTITY(1,1), F NVARCHAR(40));
INSERT INTO @FirstNames (F) VALUES
    (N'Sanne'),(N'Jeroen'),(N'Lotte'),(N'Bram'),(N'Eva'),(N'Tim'),(N'Anouk'),(N'Daan'),(N'Fleur'),(N'Sven'),
    (N'Iris'),(N'Joris'),(N'Maud'),(N'Niels'),(N'Sophie'),(N'Kasper'),(N'Lisa'),(N'Mark'),(N'Esmee'),(N'Pieter'),
    (N'Noa'),(N'Tess'),(N'Finn'),(N'Roos'),(N'Jens'),(N'Liam'),(N'Sara'),(N'Luuk'),(N'Lara'),(N'Floris'),
    (N'Yara'),(N'Senna'),(N'Milan'),(N'Julie'),(N'Bas'),(N'Lieke'),(N'Stijn'),(N'Lynn'),(N'Tom'),(N'Mila');

DECLARE @LastNames TABLE (Id INT IDENTITY(1,1), L NVARCHAR(40));
INSERT INTO @LastNames (L) VALUES
    (N'de Vries'),(N'Bakker'),(N'Visser'),(N'Janssen'),(N'Smit'),(N'Mulder'),(N'de Boer'),(N'van Dijk'),(N'Peters'),(N'Hendriks'),
    (N'Dekker'),(N'van der Berg'),(N'Brouwer'),(N'Vermeulen'),(N'Hoekstra'),(N'van Leeuwen'),(N'Kramer'),(N'Schouten'),(N'Maas'),(N'Willems'),
    (N'Kuiper'),(N'de Wit'),(N'Hofman'),(N'Bos'),(N'Vos'),(N'Boer'),(N'Verhoef'),(N'Smits'),(N'van Beek'),(N'Koster');

DECLARE @GroupNames TABLE (Id INT IDENTITY(1,1), Name NVARCHAR(64));
INSERT INTO @GroupNames (Name) VALUES
    (N'Tuinieren'), (N'Koken'), (N'Wandelen'), (N'Boeken'), (N'Schilderen'),
    (N'Yoga'), (N'Buurtfeest'), (N'Klussen'), (N'Muziek'), (N'Fietsen'),
    (N'Zwemmen'), (N'Schaken'), (N'Filmavond'), (N'Quizzen'), (N'Naaicafe'),
    (N'Hardlopen'), (N'Tekenen'), (N'Dansen'), (N'Volleybal'), (N'Vrijwilligers');

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
-- ║ 2) Communities (set-based)                               ║
-- ╚══════════════════════════════════════════════════════════╝

-- Build planned community list: Slug + Name.
IF OBJECT_ID('tempdb..#PlanCommunities') IS NOT NULL DROP TABLE #PlanCommunities;
CREATE TABLE #PlanCommunities (
    Seq  INT PRIMARY KEY,
    Slug NVARCHAR(96) NOT NULL UNIQUE,
    Name NVARCHAR(128) NOT NULL,
    City NVARCHAR(64) NOT NULL
);

;WITH C AS (
    SELECT n.n AS Seq,
           ((n.n - 1) % (SELECT COUNT(*) FROM @Cities)) + 1 AS CityIdx
    FROM   #Numbers n
    WHERE  n.n <= (SELECT COUNT(*) FROM @Cities)
)
INSERT INTO #PlanCommunities (Seq, Slug, Name, City)
SELECT  c.Seq,
        ci.Slug,
        ci.City,
        ci.City
FROM    C c
JOIN    @Cities ci ON ci.Id = c.CityIdx;

INSERT INTO Community (Slug, Name, ImageUrl)
SELECT pc.Slug, pc.Name,
       N'https://picsum.photos/seed/' + pc.Slug + N'/1200/400'
FROM   #PlanCommunities pc
WHERE  NOT EXISTS (SELECT 1 FROM Community c WHERE c.Slug = pc.Slug);

RAISERROR(N'Step 2: Communities ensured (50).', 0, 1) WITH NOWAIT;

-- Resolve community ids back into the plan.
ALTER TABLE #PlanCommunities ADD CommunityId INT NULL;
UPDATE pc
SET    pc.CommunityId = c.Id
FROM   #PlanCommunities pc
JOIN   Community        c ON c.Slug = pc.Slug;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 3) Dummy users (loop — AddUser proc isn't set-able)       ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @uIdx INT = 1;
DECLARE @uFn NVARCHAR(40), @uLn NVARCHAR(40), @uName NVARCHAR(100), @uEmail NVARCHAR(256), @newUid INT;
DECLARE @uidTbl TABLE (Uid INT);
DECLARE @FirstCount INT = (SELECT COUNT(*) FROM @FirstNames);
DECLARE @LastCount  INT = (SELECT COUNT(*) FROM @LastNames);

IF OBJECT_ID('tempdb..#PlanUsers') IS NOT NULL DROP TABLE #PlanUsers;
CREATE TABLE #PlanUsers (Idx INT PRIMARY KEY, Username NVARCHAR(100), UserId INT NULL);

WHILE @uIdx <= @NumUsers
BEGIN
    SELECT @uFn = F FROM @FirstNames WHERE Id = ((@uIdx - 1) % @FirstCount) + 1;
    SELECT @uLn = L FROM @LastNames  WHERE Id = ((@uIdx - 1) % @LastCount)  + 1;
    SET @uName  = N'dzpdummy.' + RIGHT(N'0000000' + CAST(@uIdx AS NVARCHAR(16)), 7);
    SET @uEmail = @uName + N'@example.com';

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

    UPDATE Users        SET DisplayName = @uFn + N' ' + @uLn, IsDeleted = 0 WHERE UserID = @newUid;
    UPDATE UserPortals  SET IsDeleted = 0 WHERE UserId = @newUid AND PortalId = @PortalId;

    INSERT INTO #PlanUsers (Idx, Username, UserId) VALUES (@uIdx, @uName, @newUid);
    SET @uIdx = @uIdx + 1;
END

DECLARE @msg3 NVARCHAR(200) = N'Step 3: Dummy users ready (' + CAST(@NumUsers AS NVARCHAR(16)) + N').'; RAISERROR(@msg3, 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 4) UserCommunity round-robin + Beheerder roles            ║
-- ╚══════════════════════════════════════════════════════════╝

-- Each user is assigned to exactly one community (round-robin).
-- The first 2 full rotations of users (per community) become
-- Community beheerders.
DECLARE @CommCount INT = (SELECT COUNT(*) FROM #PlanCommunities);

;WITH UC AS (
    SELECT pu.UserId,
           ((pu.Idx - 1) % @CommCount) + 1 AS Seq,
           (pu.Idx - 1) / @CommCount      AS Rotation
    FROM   #PlanUsers pu
)
INSERT INTO UserCommunity (UserId, CommunityId)
SELECT u.UserId, pc.CommunityId
FROM   UC u
JOIN   #PlanCommunities pc ON pc.Seq = u.Seq
WHERE  NOT EXISTS (
    SELECT 1 FROM UserCommunity x
    WHERE x.UserId = u.UserId AND x.CommunityId = pc.CommunityId
);

IF @BeheerderRole IS NOT NULL
BEGIN
    ;WITH Beh AS (
        SELECT pu.UserId,
               ((pu.Idx - 1) % @CommCount) + 1 AS Seq,
               (pu.Idx - 1) / @CommCount      AS Rotation
        FROM   #PlanUsers pu
    )
    INSERT INTO UserCommunityRole (UserCommunityId, RoleId)
    SELECT uc.Id, @BeheerderRole
    FROM   Beh b
    JOIN   #PlanCommunities pc ON pc.Seq = b.Seq
    JOIN   UserCommunity    uc ON uc.UserId = b.UserId AND uc.CommunityId = pc.CommunityId
    WHERE  b.Rotation < 2
      AND  NOT EXISTS (
            SELECT 1 FROM UserCommunityRole x
            WHERE x.UserCommunityId = uc.Id AND x.RoleId = @BeheerderRole
      );
END

RAISERROR(N'Step 4: Users distributed across communities (incl. Beheerders).', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 5) CommunityGroups (set-based)                            ║
-- ║    @GroupsPerCommunity groups per community.              ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @GroupNameCount INT = (SELECT COUNT(*) FROM @GroupNames);

;WITH G AS (
    SELECT pc.CommunityId, pc.City, pc.Name AS CommName, pc.Seq AS CommSeq, n.n AS Idx,
           ((pc.Seq - 1) * @GroupsPerCommunity + n.n) AS GlobalSeq
    FROM   #PlanCommunities pc
    JOIN   #Numbers         n  ON n.n <= @GroupsPerCommunity
)
INSERT INTO CommunityGroups (CommunityId, Name, Description)
SELECT g.CommunityId,
       gn.Name,
       N'Groep voor ' + gn.Name + N' liefhebbers in ' + g.CommName + N'.'
FROM   G g
JOIN   @GroupNames gn ON gn.Id = ((g.Idx - 1) % @GroupNameCount) + 1;

DECLARE @msg5 NVARCHAR(200) = N'Step 5: Groups created (' + CAST(@CommCount * @GroupsPerCommunity AS NVARCHAR(16)) + N').'; RAISERROR(@msg5, 0, 1) WITH NOWAIT;

-- Cache (CommunityId, GroupId) for downstream lookups.
IF OBJECT_ID('tempdb..#GroupsByComm') IS NOT NULL DROP TABLE #GroupsByComm;
SELECT g.Id AS GroupId, g.CommunityId,
       ROW_NUMBER() OVER (PARTITION BY g.CommunityId ORDER BY g.Id) AS GroupSeq
INTO   #GroupsByComm
FROM   CommunityGroups g
JOIN   #PlanCommunities pc ON pc.CommunityId = g.CommunityId;

CREATE INDEX IX_GroupsByComm_Comm ON #GroupsByComm (CommunityId, GroupSeq);

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 6) Companies                                              ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @AdjCount INT = (SELECT COUNT(*) FROM @CompanyAdjectives);
DECLARE @NounCount INT = (SELECT COUNT(*) FROM @CompanyNouns);

;WITH PerComm AS (
    SELECT pc.CommunityId, pc.Slug, pc.Name AS CommName, pc.City, pc.Seq AS CommSeq, n.n AS Idx
    FROM   #PlanCommunities pc
    JOIN   #Numbers n ON n.n <= @CompaniesPerCommunity
), Cmp AS (
    SELECT  pc.CommunityId, pc.Slug, pc.CommName, pc.City, pc.Idx,
            a.Word + N' ' + nm.Word AS CName,
            pc.CommSeq * 1000 + pc.Idx AS UniqueOrd
    FROM    PerComm pc
    JOIN    @CompanyAdjectives a  ON a.Id  = ((pc.Idx - 1) % @AdjCount)  + 1
    JOIN    @CompanyNouns       nm ON nm.Id = ((pc.Idx - 1 + (CHECKSUM(pc.Slug) & 0x7fffffff)) % @NounCount) + 1
)
INSERT INTO Company (CommunityId, Slug, Name, OwnerId, CompanyInfo, ImageUrl, CreatedOn)
SELECT  c.CommunityId,
        LOWER(REPLACE(c.CName, N' ', N'-')) + N'-' + c.Slug + N'-' + CAST(c.Idx AS NVARCHAR(8)) AS CSlug,
        c.CName,
        ISNULL((SELECT TOP 1 uc.UserId FROM UserCommunity uc
                WHERE uc.CommunityId = c.CommunityId
                ORDER BY (c.UniqueOrd + uc.UserId)), @DefaultAuthor),
        N'{"about":"' + c.CName + N' is een fictief bedrijf in ' + c.City + N'.",'
            + N'"address":"Hoofdstraat ' + CAST((((CHECKSUM(NEWID()) & 0x7fffffff) % 200) + 1) AS NVARCHAR(8)) + N', ' + c.City + N'",'
            + N'"phone":"+31 6 1234 ' + RIGHT(N'0000' + CAST(((CHECKSUM(NEWID()) & 0x7fffffff) % 10000) AS NVARCHAR(8)), 4) + N'",'
            + N'"email":"' + LOWER(REPLACE(c.CName, N' ', N'.')) + N'@example.com",'
            + N'"website":"https://www.' + LOWER(REPLACE(REPLACE(c.CName, N' ', N''), N'''', N'')) + N'.nl",'
            + N'"banner":"https://picsum.photos/seed/banner-' + c.Slug + N'-' + CAST(c.Idx AS NVARCHAR(8)) + N'/1200/400",'
            + N'"openingHours":{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],'
            + N'"thu":["09:00","17:00"],"fri":["09:00","17:00"],"sat":["10:00","14:00"],"sun":[]}}',
        N'https://picsum.photos/seed/co-' + c.Slug + N'-' + CAST(c.Idx AS NVARCHAR(8)) + N'/600/400',
        GETUTCDATE()
FROM    Cmp c;

DECLARE @msg6 NVARCHAR(200) = N'Step 6: Companies created (' + CAST(@CommCount * @CompaniesPerCommunity AS NVARCHAR(16)) + N').'; RAISERROR(@msg6, 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 7) UserCommunityGroups + UserCompany                      ║
-- ║    Each user joins one random group + one company in      ║
-- ║    their community. (Set-based, deterministic.)           ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH UserComm AS (
    SELECT uc.UserId, uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId) AS RankInComm,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = uc.CommunityId) AS GrpCnt
    FROM   UserCommunity uc
    JOIN   #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCommunityGroups (UserId, CommunityGroupId)
SELECT u.UserId, g.GroupId
FROM   UserComm u
JOIN   #GroupsByComm g
       ON g.CommunityId = u.CommunityId
      AND g.GroupSeq    = CASE WHEN u.GrpCnt > 0 THEN ((u.RankInComm - 1) % u.GrpCnt) + 1 ELSE 0 END
WHERE  u.GrpCnt > 0
  AND  NOT EXISTS (
        SELECT 1 FROM UserCommunityGroups x
        WHERE x.UserId = u.UserId AND x.CommunityGroupId = g.GroupId
  );

-- Optional second group for ~50% of users.
;WITH UserComm AS (
    SELECT uc.UserId, uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId DESC) AS RankInComm,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = uc.CommunityId) AS GrpCnt
    FROM   UserCommunity uc
    JOIN   #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCommunityGroups (UserId, CommunityGroupId)
SELECT u.UserId, g.GroupId
FROM   UserComm u
JOIN   #GroupsByComm g
       ON g.CommunityId = u.CommunityId
      AND g.GroupSeq    = CASE WHEN u.GrpCnt > 0 THEN ((u.RankInComm - 1) % u.GrpCnt) + 1 ELSE 0 END
WHERE  u.UserId % 2 = 0  -- approximately half
  AND  u.GrpCnt > 0
  AND  NOT EXISTS (
        SELECT 1 FROM UserCommunityGroups x
        WHERE x.UserId = u.UserId AND x.CommunityGroupId = g.GroupId
  );

-- UserCompany: assign each user to one company in their community.
IF OBJECT_ID('tempdb..#CompaniesByComm') IS NOT NULL DROP TABLE #CompaniesByComm;
SELECT  c.Id AS CompanyId, c.CommunityId,
        ROW_NUMBER() OVER (PARTITION BY c.CommunityId ORDER BY c.Id) AS CmpSeq
INTO    #CompaniesByComm
FROM    Company c
JOIN    #PlanCommunities pc ON pc.CommunityId = c.CommunityId;

;WITH UserComm AS (
    SELECT uc.UserId, uc.CommunityId,
           ROW_NUMBER() OVER (PARTITION BY uc.CommunityId ORDER BY uc.UserId) AS RankInComm,
           (SELECT COUNT(*) FROM #CompaniesByComm cc WHERE cc.CommunityId = uc.CommunityId) AS CmpCnt
    FROM   UserCommunity uc
    JOIN   #PlanCommunities pc ON pc.CommunityId = uc.CommunityId
)
INSERT INTO UserCompany (UserId, CompanyId, ShowInTeam)
SELECT u.UserId, c.CompanyId, 1
FROM   UserComm u
JOIN   #CompaniesByComm c
       ON c.CommunityId = u.CommunityId
      AND c.CmpSeq      = CASE WHEN u.CmpCnt > 0 THEN ((u.RankInComm - 1) % u.CmpCnt) + 1 ELSE 0 END
WHERE  u.CmpCnt > 0
  AND  NOT EXISTS (
        SELECT 1 FROM UserCompany x
        WHERE x.UserId = u.UserId AND x.CompanyId = c.CompanyId
  );

RAISERROR(N'Step 7: UserCommunityGroups + UserCompany populated.', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 8) Posts (set-based)                                      ║
-- ║    Per community: post #1 = draft (host-authored),        ║
-- ║                   post #2 = scheduled (future PublishOn), ║
-- ║                   rest    = published.                    ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @TitleCount INT = (SELECT COUNT(*) FROM @PostTitleStems);
DECLARE @BodyCount  INT = (SELECT COUNT(*) FROM @PostBodies);

-- Precompute deterministic per-(community,post) randoms.
-- (Avoids NEWID() inside CROSS APPLY/JOIN predicates, which re-evaluates
--  per inner row and silently drops rows.)
IF OBJECT_ID('tempdb..#PostPlan') IS NOT NULL DROP TABLE #PostPlan;
SELECT  pc.CommunityId, pc.Slug AS CSlug, pc.City, pc.Seq AS CommSeq, n.n AS PostIdx,
        (CHECKSUM(pc.CommunityId, n.n, 1) & 0x7fffffff) AS R1,
        (CHECKSUM(pc.CommunityId, n.n, 2) & 0x7fffffff) AS R2,
        (CHECKSUM(pc.CommunityId, n.n, 3) & 0x7fffffff) AS R3,
        (CHECKSUM(pc.CommunityId, n.n, 4) & 0x7fffffff) AS R4
INTO    #PostPlan
FROM    #PlanCommunities pc
JOIN    #Numbers         n  ON n.n <= @PostsPerCommunity;

INSERT INTO Dnn_Modules_Blog_Posts
    (ModuleId, CommunityId, PostType, Title, Content, ImageUrl,
     AuthorUserId, PublishOn, EventClosingOn,
     IsDraft, IsDeleted, ViewCount, ClickCount, CommentCount,
     CreatedOn, ModifiedOn)
SELECT  @ModuleId,
        p.CommunityId,
        ((p.R1 % 3) + 1) AS PostType,
        CASE WHEN p.PostIdx = 1 THEN N'[Concept] '
             WHEN p.PostIdx = 2 THEN N'[Gepland] '
             ELSE N'' END
            + ts.Title + N' (' + p.City + N' #' + CAST(p.PostIdx AS NVARCHAR(8)) + N')',
        bd.Body,
        N'https://picsum.photos/seed/post-' + p.CSlug + N'-' + CAST(p.PostIdx AS NVARCHAR(8)) + N'/800/450',
        CASE WHEN p.PostIdx = 1 THEN @DefaultAuthor
             ELSE ISNULL(
                    (SELECT TOP 1 uc.UserId FROM UserCommunity uc
                     WHERE uc.CommunityId = p.CommunityId
                     ORDER BY (CHECKSUM(p.R2, uc.UserId) & 0x7fffffff)),
                    @DefaultAuthor) END,
        CASE WHEN p.PostIdx = 2
             THEN DATEADD(MINUTE,  (p.R3 % (60*24*30)) + 60, GETUTCDATE())
             ELSE DATEADD(MINUTE, -((p.R3 % (60*24*90)) + 1), GETUTCDATE())
        END AS PublishOn,
        NULL,                              -- EventClosingOn (set later for events)
        CASE WHEN p.PostIdx = 1 THEN 1 ELSE 0 END,    -- IsDraft
        0,                                 -- IsDeleted
        0, 0, 0,                           -- counts (later steps populate)
        DATEADD(DAY, -((p.R4 % 90) + 1), GETUTCDATE()),
        GETUTCDATE()
FROM    #PostPlan p
JOIN    @PostTitleStems ts ON ts.Id = ((p.R1 / 3)  % @TitleCount) + 1
JOIN    @PostBodies     bd ON bd.Id = ((p.R1 / 17) % @BodyCount)  + 1;

-- Set EventClosingOn for PostType=2 (Event) posts.
UPDATE p
SET    p.EventClosingOn = DATEADD(DAY,
        ((CHECKSUM(NEWID(), p.PostId) & 0x7fffffff) % 60) + 1,
        ISNULL(p.PublishOn, GETUTCDATE()))
FROM   Dnn_Modules_Blog_Posts p
JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
WHERE  p.PostType = 2 AND p.EventClosingOn IS NULL;

DECLARE @msg8 NVARCHAR(200) = N'Step 8: Posts created (' + CAST(@CommCount * @PostsPerCommunity AS NVARCHAR(16)) + N').'; RAISERROR(@msg8, 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 9) PostGroups: tag ~70% of posts to 1-2 groups            ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH Eligible AS (
    SELECT p.PostId, p.CommunityId,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = p.CommunityId) AS GrpCnt,
           (CHECKSUM(NEWID(), p.PostId) & 0x7fffffff) AS Rnd
    FROM   Dnn_Modules_Blog_Posts p
    JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
-- Primary tag: ~70% of posts pick one group.
INSERT INTO Dnn_Modules_Blog_PostGroups (PostId, CommunityGroupId)
SELECT e.PostId, g.GroupId
FROM   Eligible e
JOIN   #GroupsByComm g
       ON g.CommunityId = e.CommunityId
      AND g.GroupSeq    = CASE WHEN e.GrpCnt > 0 THEN (e.Rnd % e.GrpCnt) + 1 ELSE 0 END
WHERE  e.GrpCnt > 0 AND (e.Rnd % 10) < 7;

;WITH Eligible AS (
    SELECT p.PostId, p.CommunityId,
           (SELECT COUNT(*) FROM #GroupsByComm g WHERE g.CommunityId = p.CommunityId) AS GrpCnt,
           (CHECKSUM(NEWID(), p.PostId, 'second') & 0x7fffffff) AS Rnd
    FROM   Dnn_Modules_Blog_Posts p
    JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
-- Secondary tag: ~30% of posts pick a different group.
INSERT INTO Dnn_Modules_Blog_PostGroups (PostId, CommunityGroupId)
SELECT e.PostId, g.GroupId
FROM   Eligible e
JOIN   #GroupsByComm g
       ON g.CommunityId = e.CommunityId
      AND g.GroupSeq    = CASE WHEN e.GrpCnt > 1 THEN (e.Rnd % e.GrpCnt) + 1 ELSE 0 END
WHERE  e.GrpCnt > 1 AND (e.Rnd % 10) < 3
  AND  NOT EXISTS (
        SELECT 1 FROM Dnn_Modules_Blog_PostGroups pg
        WHERE pg.PostId = e.PostId AND pg.CommunityGroupId = g.GroupId
  );

RAISERROR(N'Step 9: Posts tagged to community groups.', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 10) Per-post audience (community members in tagged       ║
-- ║     groups OR all members if untagged) + Beheerders.     ║
-- ╚══════════════════════════════════════════════════════════╝

IF OBJECT_ID('tempdb..#PostAudience') IS NOT NULL DROP TABLE #PostAudience;
CREATE TABLE #PostAudience (PostId INT NOT NULL, UserId INT NOT NULL,
    PRIMARY KEY (PostId, UserId));

;WITH WPosts AS (
    SELECT p.PostId, p.CommunityId
    FROM   Dnn_Modules_Blog_Posts p
    JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
    WHERE  p.IsDeleted = 0
), Beheerders AS (
    SELECT uc.UserId, uc.CommunityId
    FROM   UserCommunity uc
    JOIN   UserCommunityRole ucr ON ucr.UserCommunityId = uc.Id
    WHERE  ucr.RoleId = @BeheerderRole
)
INSERT INTO #PostAudience (PostId, UserId)
SELECT DISTINCT w.PostId, x.UserId
FROM   WPosts w
CROSS APPLY (
    -- Community members, restricted to tagged groups when applicable.
    SELECT uc.UserId
    FROM   UserCommunity uc
    WHERE  uc.CommunityId = w.CommunityId
      AND (
            NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_PostGroups pg WHERE pg.PostId = w.PostId)
         OR EXISTS (
                SELECT 1
                FROM   UserCommunityGroups ucg
                JOIN   Dnn_Modules_Blog_PostGroups pg
                       ON pg.CommunityGroupId = ucg.CommunityGroupId
                WHERE  ucg.UserId = uc.UserId AND pg.PostId = w.PostId)
          )
    UNION
    SELECT b.UserId FROM Beheerders b WHERE b.CommunityId = w.CommunityId
) x;

CREATE INDEX IX_PostAud_Post ON #PostAudience (PostId) INCLUDE (UserId);

RAISERROR(N'Step 10: Per-post audience computed.', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 11) Comments (set-based, audience-bound)                  ║
-- ║     Per published post: random 5-15 comments, sampled    ║
-- ║     with replacement from #PostAudience.                  ║
-- ╚══════════════════════════════════════════════════════════╝

DECLARE @CmtBodyCount INT = (SELECT COUNT(*) FROM @CommentBodies);

;WITH Targets AS (
    SELECT  p.PostId, p.CreatedOn,
            -- Random comment count in [@MinCommentsPerPost, @MaxCommentsPerPost]
            @MinCommentsPerPost
              + ((CHECKSUM(NEWID(), p.PostId) & 0x7fffffff)
                 % (@MaxCommentsPerPost - @MinCommentsPerPost + 1)) AS NumCmts,
            (SELECT COUNT(*) FROM #PostAudience pa WHERE pa.PostId = p.PostId) AS AudSize
    FROM    Dnn_Modules_Blog_Posts p
    JOIN    #PlanCommunities pc ON pc.CommunityId = p.CommunityId
    WHERE   p.IsDraft = 0 AND p.IsDeleted = 0 AND p.PublishOn <= GETUTCDATE()
), Expanded AS (
    SELECT  t.PostId, t.CreatedOn, n.n AS Slot,
            t.AudSize,
            (CHECKSUM(NEWID(), t.PostId, n.n) & 0x7fffffff) AS R
    FROM    Targets t
    JOIN    #Numbers n ON n.n <= t.NumCmts
    WHERE   t.AudSize > 0
)
INSERT INTO Dnn_Modules_Blog_Comments (PostId, UserId, Body, IsDeleted, CreatedOn)
SELECT  e.PostId,
        au.UserId,
        bd.Body,
        0,
        DATEADD(MINUTE, e.R % (60 * 24 * 7), e.CreatedOn)
FROM    Expanded e
CROSS APPLY (
    SELECT TOP 1 pa.UserId
    FROM   #PostAudience pa
    WHERE  pa.PostId = e.PostId
    ORDER BY (CHECKSUM(NEWID(), e.PostId, e.Slot, pa.UserId) & 0x7fffffff)
) au
CROSS APPLY (
    SELECT TOP 1 cb.Body
    FROM   @CommentBodies cb
    WHERE  cb.Id = ((e.R / 7) % @CmtBodyCount) + 1
) bd;

-- Sync CommentCount on every published post.
UPDATE p
SET    p.CommentCount = ISNULL(cmt.cnt, 0)
FROM   Dnn_Modules_Blog_Posts p
JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
OUTER APPLY (
    SELECT COUNT(*) AS cnt
    FROM   Dnn_Modules_Blog_Comments c
    WHERE  c.PostId = p.PostId AND c.IsDeleted = 0
) cmt;

RAISERROR(N'Step 11: Comments inserted and CommentCount synced.', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 12) Survey questions for PostType=3 (set-based)           ║
-- ║     One single + one multi + one open per such post.      ║
-- ╚══════════════════════════════════════════════════════════╝

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

DECLARE @SingleQCount INT = (SELECT COUNT(*) FROM @SingleQ);
DECLARE @MultiQCount  INT = (SELECT COUNT(*) FROM @MultiQ);
DECLARE @OpenQCount   INT = (SELECT COUNT(*) FROM @OpenQ);

-- Q1 (single)
IF OBJECT_ID('tempdb..#NewQs') IS NOT NULL DROP TABLE #NewQs;
CREATE TABLE #NewQs (PostId INT, QuestionId INT, QType INT,
                     O1 NVARCHAR(128), O2 NVARCHAR(128), O3 NVARCHAR(128), O4 NVARCHAR(128));

INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
OUTPUT inserted.PostId, inserted.QuestionId, 1, NULL, NULL, NULL, NULL INTO #NewQs (PostId, QuestionId, QType, O1, O2, O3, O4)
SELECT  p.PostId, 1, sq.Q, 1
FROM    Dnn_Modules_Blog_Posts p
JOIN    #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN    @SingleQ sq ON sq.Id = (((CHECKSUM(p.PostId, 1) & 0x7fffffff) % @SingleQCount) + 1)
WHERE   p.PostType = 3 AND p.IsDeleted = 0
  AND   NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Questions q WHERE q.PostId = p.PostId AND q.QuestionType = 1);

-- Fill option text for single questions (deterministic from question text hash)
UPDATE nq
SET    O1 = sq.O1, O2 = sq.O2, O3 = sq.O3, O4 = sq.O4
FROM   #NewQs nq
JOIN   Dnn_Modules_Blog_Questions q ON q.QuestionId = nq.QuestionId
JOIN   @SingleQ sq ON sq.Id = (((CHECKSUM(q.QuestionText) & 0x7fffffff) % @SingleQCount) + 1)
WHERE  nq.QType = 1;

INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder)
SELECT QuestionId, OptionText, SortOrder
FROM (
    SELECT QuestionId, O1 AS OptionText, 1 AS SortOrder FROM #NewQs WHERE QType = 1
    UNION ALL SELECT QuestionId, O2, 2 FROM #NewQs WHERE QType = 1
    UNION ALL SELECT QuestionId, O3, 3 FROM #NewQs WHERE QType = 1
    UNION ALL SELECT QuestionId, O4, 4 FROM #NewQs WHERE QType = 1
) x;

-- Q2 (multi)
DELETE FROM #NewQs;
INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
OUTPUT inserted.PostId, inserted.QuestionId, 2, NULL, NULL, NULL, NULL INTO #NewQs (PostId, QuestionId, QType, O1, O2, O3, O4)
SELECT  p.PostId, 2, mq.Q, 2
FROM    Dnn_Modules_Blog_Posts p
JOIN    #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN    @MultiQ mq ON mq.Id = (((CHECKSUM(p.PostId, 2) & 0x7fffffff) % @MultiQCount) + 1)
WHERE   p.PostType = 3 AND p.IsDeleted = 0
  AND   NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Questions q WHERE q.PostId = p.PostId AND q.QuestionType = 2);

UPDATE nq
SET    O1 = mq.O1, O2 = mq.O2, O3 = mq.O3, O4 = mq.O4
FROM   #NewQs nq
JOIN   Dnn_Modules_Blog_Questions q ON q.QuestionId = nq.QuestionId
JOIN   @MultiQ mq ON mq.Id = (((CHECKSUM(q.QuestionText) & 0x7fffffff) % @MultiQCount) + 1)
WHERE  nq.QType = 2;

INSERT INTO Dnn_Modules_Blog_QuestionOptions (QuestionId, OptionText, SortOrder)
SELECT QuestionId, OptionText, SortOrder
FROM (
    SELECT QuestionId, O1 AS OptionText, 1 AS SortOrder FROM #NewQs WHERE QType = 2
    UNION ALL SELECT QuestionId, O2, 2 FROM #NewQs WHERE QType = 2
    UNION ALL SELECT QuestionId, O3, 3 FROM #NewQs WHERE QType = 2
    UNION ALL SELECT QuestionId, O4, 4 FROM #NewQs WHERE QType = 2
) x;

-- Q3 (open) — no options
INSERT INTO Dnn_Modules_Blog_Questions (PostId, QuestionType, QuestionText, SortOrder)
SELECT  p.PostId, 3, oq.Q, 3
FROM    Dnn_Modules_Blog_Posts p
JOIN    #PlanCommunities pc ON pc.CommunityId = p.CommunityId
JOIN    @OpenQ oq ON oq.Id = (((CHECKSUM(p.PostId, 3) & 0x7fffffff) % @OpenQCount) + 1)
WHERE   p.PostType = 3 AND p.IsDeleted = 0
  AND   NOT EXISTS (SELECT 1 FROM Dnn_Modules_Blog_Questions q WHERE q.PostId = p.PostId AND q.QuestionType = 3);

RAISERROR(N'Step 12: Survey questions ensured (single + multi + open per PostType=3 post).', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 13) View / Click stats bounded by audience                ║
-- ║     Views: 30-100% of audience                            ║
-- ║     Clicks: 20-80% of Views                               ║
-- ║     Drafts and not-yet-published: zeroed.                 ║
-- ╚══════════════════════════════════════════════════════════╝

;WITH PostAudienceCnt AS (
    SELECT  p.PostId,
            ISNULL((SELECT COUNT(*) FROM #PostAudience pa WHERE pa.PostId = p.PostId), 0) AS Audience
    FROM    Dnn_Modules_Blog_Posts p
    JOIN    #PlanCommunities pc ON pc.CommunityId = p.CommunityId
)
UPDATE p
SET    p.ViewCount  = v.Views,
       p.ClickCount = v.Clicks
FROM   Dnn_Modules_Blog_Posts p
JOIN   PostAudienceCnt pa ON pa.PostId = p.PostId
CROSS APPLY (
    SELECT  CASE WHEN pa.Audience = 0 THEN 0
                 ELSE pa.Audience - ((CHECKSUM(NEWID(), p.PostId) & 0x7fffffff) % CASE WHEN pa.Audience > 1
                                                                              THEN CAST(CEILING(pa.Audience * 0.7) AS INT)
                                                                              ELSE 1 END)
            END AS Views
) vRaw
CROSS APPLY (
    SELECT  vRaw.Views,
            CASE WHEN vRaw.Views = 0 THEN 0
                 ELSE CAST(vRaw.Views * (0.2 + ((CHECKSUM(NEWID(), p.PostId) & 0x7fffffff) % 60) / 100.0) AS INT)
            END AS Clicks
) v;

UPDATE p
SET    p.ViewCount = 0, p.ClickCount = 0, p.CommentCount = 0
FROM   Dnn_Modules_Blog_Posts p
JOIN   #PlanCommunities pc ON pc.CommunityId = p.CommunityId
WHERE  p.IsDraft = 1 OR p.PublishOn > GETUTCDATE();

RAISERROR(N'Step 13: View / Click counts bounded by audience.', 0, 1) WITH NOWAIT;

-- ╔══════════════════════════════════════════════════════════╗
-- ║ 14) Final summary                                         ║
-- ╚══════════════════════════════════════════════════════════╝

SELECT
    @CommCount                                                         AS Communities,
    (SELECT COUNT(*) FROM Users WHERE Username LIKE N'dzpdummy.%')     AS DummyUsers,
    (SELECT COUNT(*) FROM CommunityGroups g
        JOIN Community c ON c.Id = g.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS Groups,
    (SELECT COUNT(*) FROM Company co
        JOIN Community c ON c.Id = co.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS Companies,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Posts p
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS Posts,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Posts p
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc)
          AND p.IsDraft = 1)                                             AS Drafts,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Posts p
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc)
          AND p.PublishOn > GETUTCDATE() AND p.IsDraft = 0)              AS Scheduled,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_PostGroups pg
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = pg.PostId
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS PostGroupTags,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Comments cm
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = cm.PostId
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS Comments,
    (SELECT COUNT(*) FROM Dnn_Modules_Blog_Questions q
        JOIN Dnn_Modules_Blog_Posts p ON p.PostId = q.PostId
        JOIN Community c ON c.Id = p.CommunityId
        WHERE c.Id IN (SELECT pc.CommunityId FROM #PlanCommunities pc))  AS Questions;

RAISERROR(N'Done.', 0, 1) WITH NOWAIT;
