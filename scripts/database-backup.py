"""Consistent SQLite backup and restore. Run from any working directory.
python scripts/database-backup.py
python scripts/database-backup.py --verify path/to/backup.db
python scripts/database-backup.py --restore path/to/backup.db --confirm-stopped
"""
import argparse, datetime, pathlib, sqlite3, tempfile
from contextlib import closing
ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = ROOT / 'prisma' / 'dev.db'
BACKUPS = ROOT / '.local' / 'backups'
def verify(path):
    with closing(sqlite3.connect(f'{path.as_uri()}?mode=ro', uri=True)) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok': raise RuntimeError('Integrity check failed')
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {'users','tickets','auth_sessions'} <= tables: raise RuntimeError('Not a BRU database')
def copy(source,target):
    with closing(sqlite3.connect(f'{source.as_uri()}?mode=ro',uri=True)) as src, closing(sqlite3.connect(target)) as dst: src.backup(dst)
    verify(target)
def backup():
    BACKUPS.mkdir(parents=True,exist_ok=True)
    target=BACKUPS/('bru-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.db')
    copy(DB,target);return target
parser=argparse.ArgumentParser();parser.add_argument('--verify',type=pathlib.Path);parser.add_argument('--restore',type=pathlib.Path);parser.add_argument('--confirm-stopped',action='store_true');args=parser.parse_args()
if args.verify:
    source=args.verify.resolve();verify(source)
    with tempfile.TemporaryDirectory(prefix='bru-restore-check-') as temp:
        restored=pathlib.Path(temp)/'restored.db';copy(source,restored)
        with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(restored)) as dst:
            for table in ('users','tickets','ticket_status_logs'):
                assert src.execute(f'SELECT count(*) FROM {table}').fetchone()==dst.execute(f'SELECT count(*) FROM {table}').fetchone()
    print('Restore rehearsal passed; live database unchanged')
elif args.restore:
    if not args.confirm_stopped: parser.error('Stop app processes first and pass --confirm-stopped')
    source=args.restore.resolve()
    if source==DB.resolve(): parser.error('Restore source cannot be live database')
    verify(source);print('Rollback backup:',backup());copy(source,DB)
    with sqlite3.connect(DB) as db: db.execute('DELETE FROM auth_sessions')
    print('Restored; sessions revoked. Check migration status and compatible app version before restarting; see LOCAL-OPERATIONS.md.')
else: print(backup())

