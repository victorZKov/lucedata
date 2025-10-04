-- SQL Server initial schema for configs
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[configs]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.configs (
    [key] NVARCHAR(4000) PRIMARY KEY,
    [value] NVARCHAR(MAX)
  );
END
-- SQL Server initialization migration
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[configs]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.configs (
    [key] NVARCHAR(200) PRIMARY KEY,
    [value] NVARCHAR(MAX) NOT NULL
  );
END
