/* =========================================================
   Sirivatana Intranet CMS - schema (Microsoft SQL Server)
   Run with: npm run db:init   (or execute in SSMS, batch by batch)
   ========================================================= */

/* ---------- Role ---------- */
IF OBJECT_ID('dbo.Role', 'U') IS NULL
CREATE TABLE dbo.Role (
    r_id  INT IDENTITY(1,1) PRIMARY KEY,
    name  VARCHAR(30) NOT NULL UNIQUE          -- 'admin' | 'editor' | 'user'
);
GO

/* ---------- Users (employee data) ---------- */
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    u_id         INT IDENTITY(1,1) PRIMARY KEY,
    employee_id  VARCHAR(20)   NOT NULL UNIQUE,
    first_name   NVARCHAR(100) NOT NULL,
    last_name    NVARCHAR(100) NOT NULL
);
GO

/* ---------- User_account (login) ---------- */
IF OBJECT_ID('dbo.User_account', 'U') IS NULL
CREATE TABLE dbo.User_account (
    uc_id          INT IDENTITY(1,1) PRIMARY KEY,
    u_id           INT NOT NULL UNIQUE REFERENCES dbo.Users(u_id),   -- 1 person : 1 account
    r_id           INT NOT NULL REFERENCES dbo.Role(r_id),
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,                             -- bcrypt hash, never plain text
    is_active      BIT NOT NULL DEFAULT 1,
    last_login_at  DATETIME2 NULL
);
GO

/* ---------- Main_category ---------- */
IF OBJECT_ID('dbo.Main_category', 'U') IS NULL
CREATE TABLE dbo.Main_category (
    mc_id       INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(200) NOT NULL,
    side        TINYINT NOT NULL DEFAULT 2 CHECK (side IN (1, 2, 3)),  -- 1=center 2=left 3=right
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BIT NOT NULL DEFAULT 1,
    create_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    create_by   INT NULL REFERENCES dbo.User_account(uc_id)           -- NULL for seeded rows
);
GO

/* ---------- Sub_category ---------- */
IF OBJECT_ID('dbo.Sub_category', 'U') IS NULL
CREATE TABLE dbo.Sub_category (
    sc_id       INT IDENTITY(1,1) PRIMARY KEY,
    mc_id       INT NOT NULL REFERENCES dbo.Main_category(mc_id),
    name        NVARCHAR(200) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BIT NOT NULL DEFAULT 1,
    create_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    create_by   INT NULL REFERENCES dbo.User_account(uc_id)
);
GO

/* ---------- Content ---------- */
IF OBJECT_ID('dbo.Content', 'U') IS NULL
CREATE TABLE dbo.Content (
    c_id        INT IDENTITY(1,1) PRIMARY KEY,
    sc_id       INT NOT NULL REFERENCES dbo.Sub_category(sc_id),
    title       NVARCHAR(300) NOT NULL,
    body        NVARCHAR(MAX) NULL,                                   -- sanitized HTML
    publish_at  DATETIME2 NULL,                                       -- NULL = show immediately
    expire_at   DATETIME2 NULL,                                       -- NULL = never expires
    status      VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'published', 'hidden')),
    is_pinned   BIT NOT NULL DEFAULT 0,
    view_count  INT NOT NULL DEFAULT 0,
    create_by   INT NOT NULL REFERENCES dbo.User_account(uc_id),
    create_at   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    update_at   DATETIME2 NULL,
    delete_at   DATETIME2 NULL                                        -- soft delete
    -- (all DATETIME2 columns store UTC)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Content_list')
CREATE INDEX IX_Content_list ON dbo.Content (sc_id, status, delete_at) INCLUDE (publish_at, expire_at, is_pinned);
GO

/* ---------- Content_media ---------- */
IF OBJECT_ID('dbo.Content_media', 'U') IS NULL
CREATE TABLE dbo.Content_media (
    cm_id          INT IDENTITY(1,1) PRIMARY KEY,
    c_id           INT NOT NULL REFERENCES dbo.Content(c_id),
    original_name  NVARCHAR(255) NOT NULL,
    kind           VARCHAR(20) NOT NULL
                   CHECK (kind IN ('header', 'gallery', 'inline', 'attachment')),
    file_size      BIGINT NOT NULL,
    file_path      VARCHAR(500) NOT NULL,                             -- e.g. /uploads/2026/10/<uuid>.jpg
    sort_order     INT NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Content_media_c_id')
CREATE INDEX IX_Content_media_c_id ON dbo.Content_media (c_id, kind, sort_order);
GO

/* ---------- Audit_log ---------- */
IF OBJECT_ID('dbo.Audit_log', 'U') IS NULL
CREATE TABLE dbo.Audit_log (
    log_id       BIGINT IDENTITY(1,1) PRIMARY KEY,
    uc_id        INT NULL REFERENCES dbo.User_account(uc_id),         -- NULL when login failed / unknown user
    username     VARCHAR(50) NULL,
    action       VARCHAR(30) NOT NULL,
    target_type  VARCHAR(30) NULL,
    target_id    VARCHAR(50) NULL,
    message      NVARCHAR(500) NOT NULL,
    ip_address   VARCHAR(45) NULL,
    create_at    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Audit_log_time')
CREATE INDEX IX_Audit_log_time ON dbo.Audit_log (create_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Audit_log_action')
CREATE INDEX IX_Audit_log_action ON dbo.Audit_log (action, create_at DESC);
GO
