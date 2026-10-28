"""Opt-in verification of the shipped bootstrap against an existing Azure SQL database."""

import argparse
import json
import os
from pathlib import Path
import re
import struct
import subprocess


def cli(*args):
    result = subprocess.run(
        ["az.cmd" if os.name == "nt" else "az", *args],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode:
        raise RuntimeError(result.stderr)
    return json.loads(result.stdout)


def execute_script(connection, root, source):
    source = re.sub(r"^:ON ERROR EXIT\s*$", "", source, flags=re.MULTILINE)
    source = re.sub(
        r"^:r (.+)\s*$",
        lambda match: (root / match[1].strip()).read_text(),
        source, flags=re.MULTILINE,
    )
    if "$(" in source:
        raise ValueError("Unresolved SQLCMD variable")
    for batch in re.split(r"^\s*GO\s*$", source, flags=re.MULTILINE | re.IGNORECASE):
        if batch.strip():
            connection.cursor().execute(batch)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("app-root", "server", "database", "identity", "subscription"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    if args.database.lower() in ("master", "tempdb", "model", "msdb"):
        raise ValueError("Use only an explicitly approved user database.")
    identity = cli("identity", "show", "--ids", args.identity,
                   "--subscription", args.subscription, "--output", "json")
    client_id = identity["clientId"]
    principal_id = identity["principalId"]
    if client_id.lower() == principal_id.lower():
        raise ValueError("Identity test requires distinct client and principal IDs.")
    result = cli("account", "get-access-token", "--subscription", args.subscription,
                 "--resource", "https://database.windows.net/", "--output", "json")
    token = result["accessToken"].encode("utf-16-le")
    import pyodbc

    connection = pyodbc.connect(
        f"Driver={{ODBC Driver 18 for SQL Server}};Server=tcp:{args.server},1433;"
        f"Database={args.database};Encrypt=yes;TrustServerCertificate=no;",
        attrs_before={1256: struct.pack("<I", len(token)) + token},
        timeout=60, autocommit=True,
    )
    try:
        root = Path(args.app_root).resolve()
        observed = connection.cursor().execute("SELECT DB_NAME()").fetchone()[0]
        if observed != args.database:
            raise ValueError("Connected database does not match the approved target.")
        bootstrap = (root / "infra" / "bootstrap.sql").read_text()
        bootstrap = bootstrap.replace("$(DabClientId)", client_id).replace("$(DabPrincipalId)", principal_id)
        execute_script(connection, root, bootstrap)
        execute_script(connection, root, bootstrap)
        row = connection.cursor().execute(
            "SELECT type, CONVERT(uniqueidentifier,sid) FROM sys.database_principals WHERE name='app_runtime'"
        ).fetchone()
        if row is None or row[0] != "E" or str(row[1]).lower() != client_id.lower():
            raise ValueError("Stored SQL user SID must equal Azure's client ID, not its principal object ID.")
        rights = connection.cursor().execute(
            "EXECUTE AS USER='app_runtime';"
            "SELECT HAS_PERMS_BY_NAME('dbo.Items','OBJECT','SELECT'),"
            "HAS_PERMS_BY_NAME('dbo.Items','OBJECT','INSERT'),"
            "HAS_PERMS_BY_NAME('api.CreateItem','OBJECT','EXECUTE');"
        ).fetchone()
        connection.cursor().execute("REVERT;")
        if list(rights) != [0, 0, 1]:
            raise ValueError("Runtime permissions must deny base-table reads/writes and allow procedure execution.")
        print("CLOUD SQL BOOTSTRAP PASSED: Azure client-ID SID binding, repeat bootstrap and least privilege.")
    except Exception:
        connection.cursor().execute("IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
