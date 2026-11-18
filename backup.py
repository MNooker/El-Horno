#!/usr/bin/env python3
"""Crea una copia consistente de SQLite sin detener el servidor."""
import os,sqlite3
from datetime import datetime
from pathlib import Path
root=Path(__file__).resolve().parent
source=Path(os.environ.get('HORNO_DATA_DIR',str(root/'data')))/'elhorno.sqlite3'
if not source.exists():raise SystemExit('No existe la base de datos. Inicia primero el servidor.')
dest=source.parent/'backups';dest.mkdir(exist_ok=True);dest.chmod(0o700)
path=dest/('elhorno-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.sqlite3')
with sqlite3.connect(source) as origin,sqlite3.connect(path) as target:origin.backup(target)
path.chmod(0o600)
print(path)
