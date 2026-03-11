#!/usr/bin/env python3
"""
Unified database management script for SQL Server via pyodbc.

Usage:
  python db.py schema          - Apply schema files (schema*.sql)
  python db.py migrate         - Run migration files (migrations/*.sql)
  python db.py seed            - Run seed files (seed*.sql)
  python db.py drop [--yes]    - Drop all dbo objects
  python db.py reset [--yes]   - drop -> schema -> seed (shortcut)
  python db.py export          - Backup database to .bak file
  python db.py import <file>   - Restore database from .bak file
"""

import os
import sys
import glob
import re
import subprocess
import pyodbc
from datetime import datetime
from dotenv import load_dotenv
from tabulate import tabulate

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))

MSSQL_HOST = os.getenv("MSSQL_HOST", "127.0.0.1")
MSSQL_PORT = os.getenv("SQLSERVER_PORT", "1433")
MSSQL_USER = os.getenv("DB_USER", "sa")
MSSQL_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("MSSQL_PASSWORD", ""))
MSSQL_DATABASE = os.getenv("DB_NAME", os.getenv("MSSQL_DATABASE", "master"))

SQL_DIR = os.path.join(SCRIPT_DIR, "..", "db")  # SQL files live in workspace/db/
BACKUP_DIR = os.path.join(SQL_DIR, "backups")
DOCKER_CONTAINER = os.getenv("DOCKER_CONTAINER", "sqlserver-dzp")
SERVER_BACKUP_DIR = "/var/opt/mssql/data"  # Inside the Linux container


# ── Connection ────────────────────────────────────────────────────
def get_connection():
    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={MSSQL_HOST},{MSSQL_PORT};"
        f"DATABASE={MSSQL_DATABASE};"
        f"UID={MSSQL_USER};"
        f"PWD={MSSQL_PASSWORD}"
    )
    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        print(f"Connected to {MSSQL_DATABASE} on {MSSQL_HOST},{MSSQL_PORT}")
        return conn
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)


# ── SQL execution ─────────────────────────────────────────────────
def run_sql(conn, sql):
    """Execute a SQL string, splitting on GO batches."""
    batches = split_batches(sql)
    cursor = conn.cursor()
    for batch in batches:
        if batch.strip():
            cursor.execute(batch)
    cursor.close()


def split_batches(sql):
    """Split a SQL script on GO batch separators."""
    import re
    return re.split(r"^\s*GO\s*$", sql, flags=re.MULTILINE | re.IGNORECASE)


# ── File helpers ──────────────────────────────────────────────────
def find_files(prefix):
    """Find SQL files matching prefix*.sql, with *init* files sorted first."""
    pattern = os.path.join(SQL_DIR, f"{prefix}*.sql")
    files = sorted(glob.glob(pattern))

    init_files = [f for f in files if "init" in os.path.basename(f).lower()]
    if len(init_files) > 1:
        names = ", ".join(os.path.basename(f) for f in init_files)
        print(f"Multiple init files found: {names}")
        sys.exit(1)

    non_init = [f for f in files if f not in init_files]
    return init_files + non_init


def run_files(conn, prefix, label):
    """Run all SQL files matching the prefix."""
    files = find_files(prefix)
    if not files:
        print(f"No {label} files found ({prefix}*.sql)")
        sys.exit(1)

    names = "\n   - ".join(os.path.basename(f) for f in files)
    print(f"Found {len(files)} {label} file(s):\n   - {names}\n")

    for filepath in files:
        name = os.path.basename(filepath)
        print(f"Running {name}...")
        with open(filepath, "r", encoding="utf-8") as f:
            sql = f.read()
        run_sql(conn, sql)
        print(f"{name} executed successfully\n")

    print(f"All {label} files applied successfully!")


# ── Commands ──────────────────────────────────────────────────────
def cmd_schema(conn):
    run_files(conn, "schema", "schema")


def cmd_migrate(conn):
    migrations_dir = os.path.join(SQL_DIR, "migrations")
    if not os.path.isdir(migrations_dir):
        print("No migrations directory found")
        sys.exit(1)

    files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    if not files:
        print("No migration files found")
        sys.exit(1)

    for filepath in files:
        name = os.path.basename(filepath)
        print(f"Running migration: {name}...")
        with open(filepath, "r", encoding="utf-8") as f:
            sql = f.read()

        for batch in split_batches(sql):
            if not batch.strip():
                continue
            try:
                conn.cursor().execute(batch)
            except pyodbc.Error as e:
                msg = str(e).lower()
                if "already exists" in msg or "duplicate" in msg:
                    continue
                raise

        print(f"{name} applied successfully")

    print("All migrations complete!")


def cmd_seed(conn):
    run_files(conn, "seed", "seed")


def cmd_drop(conn):
    drop_sql = """
    -- Foreign keys
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += 'ALTER TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name)
        + ' DROP CONSTRAINT ' + QUOTENAME(f.name) + ';' + CHAR(13)
    FROM sys.foreign_keys f
    INNER JOIN sys.tables t ON f.parent_object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo';
    EXEC sp_executesql @sql;

    -- Views
    SET @sql = N'';
    SELECT @sql += 'DROP VIEW ' + QUOTENAME(s.name) + '.' + QUOTENAME(v.name) + ';' + CHAR(13)
    FROM sys.views v
    INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
    WHERE s.name = 'dbo';
    EXEC sp_executesql @sql;

    -- Procedures
    SET @sql = N'';
    SELECT @sql += 'DROP PROCEDURE ' + QUOTENAME(s.name) + '.' + QUOTENAME(p.name) + ';' + CHAR(13)
    FROM sys.procedures p
    INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
    WHERE s.name = 'dbo';
    EXEC sp_executesql @sql;

    -- Functions
    SET @sql = N'';
    SELECT @sql += 'DROP FUNCTION ' + QUOTENAME(s.name) + '.' + QUOTENAME(o.name) + ';' + CHAR(13)
    FROM sys.objects o
    INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND o.type IN ('FN','IF','TF','AF');
    EXEC sp_executesql @sql;

    -- Tables
    SET @sql = N'';
    SELECT @sql += 'DROP TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ';' + CHAR(13)
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo';
    EXEC sp_executesql @sql;

    -- User-defined types
    SET @sql = N'';
    SELECT @sql += 'DROP TYPE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ';' + CHAR(13)
    FROM sys.types t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND t.is_user_defined = 1;
    EXEC sp_executesql @sql;

    -- Sequences
    SET @sql = N'';
    SELECT @sql += 'DROP SEQUENCE ' + QUOTENAME(s.name) + '.' + QUOTENAME(sq.name) + ';' + CHAR(13)
    FROM sys.sequences sq
    INNER JOIN sys.schemas s ON sq.schema_id = s.schema_id
    WHERE s.name = 'dbo';
    EXEC sp_executesql @sql;
    """

    print("Dropping all dbo objects...")
    run_sql(conn, drop_sql)
    print("All dbo schema objects dropped\n")
    print("Database cleanup completed!")


def get_master_connection():
    """Connect to the master database as sa for RESTORE/BACKUP operations."""
    sa_password = os.getenv("MSSQL_PASSWORD", MSSQL_PASSWORD)
    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={MSSQL_HOST},{MSSQL_PORT};"
        f"DATABASE=master;"
        f"UID=sa;"
        f"PWD={sa_password}"
    )
    return pyodbc.connect(conn_str, autocommit=True)


def docker_cp_from(container_path, local_path):
    """Copy a file from the Docker container to the local filesystem."""
    subprocess.run(
        ["docker", "cp", f"{DOCKER_CONTAINER}:{container_path}", local_path],
        check=True,
    )


def docker_cp_to(local_path, container_path):
    """Copy a file from the local filesystem into the Docker container."""
    subprocess.run(
        ["docker", "cp", local_path, f"{DOCKER_CONTAINER}:{container_path}"],
        check=True,
    )


def cmd_export(conn):
    """Backup the entire database to a .bak file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{MSSQL_DATABASE}_{timestamp}.bak"
    server_path = f"{SERVER_BACKUP_DIR}/{filename}"  # Linux path inside container

    print(f"Backing up {MSSQL_DATABASE} to {DOCKER_CONTAINER}:{server_path}...")

    backup_sql = (
        f"BACKUP DATABASE [{MSSQL_DATABASE}] "
        f"TO DISK = N'{server_path}' "
        f"WITH FORMAT, INIT, COMPRESSION, "
        f"NAME = N'{MSSQL_DATABASE} Full Backup'"
    )
    cursor = conn.cursor()
    cursor.execute(backup_sql)
    while cursor.nextset():
        pass
    cursor.close()

    print(f"Backup complete on server: {server_path}")

    # Copy from container to local backups dir
    os.makedirs(BACKUP_DIR, exist_ok=True)
    local_path = os.path.join(BACKUP_DIR, filename)
    try:
        docker_cp_from(server_path, local_path)
        print(f"Copied to: {local_path}")
    except subprocess.CalledProcessError as e:
        print(f"Warning: docker cp failed ({e}). Backup still exists inside container.")


def list_backups():
    """List available .bak files and let the user pick one."""
    if not os.path.isdir(BACKUP_DIR):
        print(f"No backups directory found at {BACKUP_DIR}")
        sys.exit(1)

    baks = sorted(glob.glob(os.path.join(BACKUP_DIR, "*.bak")))
    if not baks:
        print("No .bak files found in backups/")
        sys.exit(1)

    rows = []
    for i, path in enumerate(baks, 1):
        name = os.path.basename(path)
        size_mb = os.path.getsize(path) / (1024 * 1024)
        mtime = datetime.fromtimestamp(os.path.getmtime(path)).strftime("%Y-%m-%d %H:%M:%S")
        rows.append([i, name, f"{size_mb:.1f} MB", mtime])

    print(tabulate(rows, headers=["#", "Filename", "Size", "Date"], tablefmt="simple"))
    print()

    try:
        choice = input("Pick a backup number (or Enter to cancel): ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        sys.exit(0)
    if not choice:
        print("Cancelled.")
        sys.exit(0)
    try:
        idx = int(choice) - 1
        if idx < 0 or idx >= len(baks):
            raise ValueError
    except ValueError:
        print("Invalid selection.")
        sys.exit(1)

    return baks[idx]


def cmd_import(conn):
    """Restore a database from a .bak file."""
    # Find the backup file from args or prompt with a list
    bak_file = None
    for arg in sys.argv[2:]:
        if arg.endswith(".bak"):
            bak_file = arg
            break

    if not bak_file:
        bak_file = list_backups()

    # Resolve to absolute path
    bak_file = os.path.abspath(bak_file)
    if not os.path.isfile(bak_file):
        print(f"File not found: {bak_file}")
        sys.exit(1)

    # Copy .bak into the container so SQL Server can access it
    filename = os.path.basename(bak_file)
    server_path = f"{SERVER_BACKUP_DIR}/{filename}"
    print(f"Copying {filename} into {DOCKER_CONTAINER}:{server_path}...")
    try:
        docker_cp_to(bak_file, server_path)
    except subprocess.CalledProcessError as e:
        print(f"Failed to copy file into container: {e}")
        sys.exit(1)

    print(f"Restoring {MSSQL_DATABASE} from {server_path}...")

    # Need master connection to kick users and restore
    conn.close()
    master_conn = get_master_connection()

    # Set single-user mode to kick all connections
    try:
        master_conn.execute(
            f"ALTER DATABASE [{MSSQL_DATABASE}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
        )
    except pyodbc.Error:
        pass  # May fail if already single-user or no other connections

    try:
        # Get logical file names from the backup
        cursor = master_conn.cursor()
        cursor.execute(f"RESTORE FILELISTONLY FROM DISK = N'{server_path}'")
        files = []
        for row in cursor.fetchall():
            files.append((row[0], row[1]))  # LogicalName, PhysicalName
        cursor.close()

        # Get current database file locations
        cursor = master_conn.cursor()
        cursor.execute(
            f"SELECT name, physical_name FROM sys.master_files "
            f"WHERE database_id = DB_ID(N'{MSSQL_DATABASE}')"
        )
        current_files = {row[0]: row[1] for row in cursor.fetchall()}
        cursor.close()

        # Build RESTORE command with MOVE clauses
        move_clauses = []
        for logical_name, _physical in files:
            if logical_name in current_files:
                move_clauses.append(
                    f"MOVE N'{logical_name}' TO N'{current_files[logical_name]}'"
                )

        restore_sql = f"RESTORE DATABASE [{MSSQL_DATABASE}] FROM DISK = N'{server_path}' WITH REPLACE"
        if move_clauses:
            restore_sql += ", " + ", ".join(move_clauses)

        cursor = master_conn.cursor()
        cursor.execute(restore_sql)
        while cursor.nextset():
            pass
        cursor.close()

        print(f"Restore complete: {MSSQL_DATABASE}")
    finally:
        # Always set back to multi-user, even if restore fails or is interrupted
        try:
            master_conn.execute(
                f"ALTER DATABASE [{MSSQL_DATABASE}] SET MULTI_USER"
            )
        except pyodbc.Error:
            pass
        master_conn.close()


def confirm_then_run(conn, fn):
    if "--yes" in sys.argv or "-y" in sys.argv:
        print("WARNING: This will DELETE ALL DATA in your database!\n")
        fn(conn)
        return

    print("WARNING: This will DELETE ALL DATA in your database!\n")
    try:
        answer = input("Are you sure? (y/N): ").strip().lower()
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        sys.exit(0)
    if answer == "y":
        fn(conn)
    else:
        print("Cancelled.")
        sys.exit(0)


# ── Main ──────────────────────────────────────────────────────────
COMMANDS = {
    "schema": cmd_schema,
    "migrate": cmd_migrate,
    "seed": cmd_seed,
    "export": cmd_export,
    "import": cmd_import,
    "drop": lambda conn: confirm_then_run(conn, cmd_drop),
    "reset": lambda conn: confirm_then_run(
        conn, lambda c: (cmd_drop(c), cmd_schema(c), cmd_seed(c))
    ),
}

def main():
    command = sys.argv[1] if len(sys.argv) > 1 else None

    if not command or command in ("--help", "-h"):
        print("""
Usage: python db.py <command> [options]

Commands:
  schema     Apply schema files (schema*.sql)
  migrate    Run migration files (migrations/*.sql)
  seed       Run seed files (seed*.sql)
  export     Backup entire database to .bak file
  import     Restore database from .bak file
  drop       Drop all dbo objects
  reset      drop -> schema -> seed

Options:
  --yes, -y  Skip confirmation for destructive commands
""")
        sys.exit(0)

    if command not in COMMANDS:
        print(f"Unknown command: {command}\nRun \"python db.py --help\" for usage.")
        sys.exit(1)

    conn = get_connection()
    print(f"Using database: {MSSQL_DATABASE}\n")
    try:
        COMMANDS[command](conn)
    finally:
        try:
            conn.close()
        except pyodbc.ProgrammingError:
            pass


if __name__ == "__main__":
    main()
