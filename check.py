#!/usr/bin/env python3
"""Verificación sin paquetes externos ni acceso a la base activa."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent


def main() -> None:
    with tempfile.TemporaryDirectory(prefix='horno-check-') as isolated:
        env = {**os.environ, 'HORNO_DATA_DIR': isolated}
        subprocess.run(['python', '-m', 'unittest', 'test_server', '-v'],
                       cwd=ROOT, env=env, check=True)
        subprocess.run(['node', '--test', 'test_store.cjs'], cwd=ROOT, check=True)
        for script in ['store.js', 'motion.js']:
            subprocess.run(['node', '--check', script], cwd=ROOT, check=True)
        for page in ROOT.glob('*.html'):
            for index, (attrs, source) in enumerate(re.findall(
                    r'<script([^>]*)>([\s\S]*?)</script>', page.read_text())):
                if 'application/ld+json' in attrs:
                    json.loads(source)
                    continue
                script = Path(isolated) / f'{page.stem}-{index}.js'
                script.write_text(source)
                subprocess.run(['node', '--check', str(script)], check=True)
    print('Verificación completa: base temporal, tests y sintaxis correctos.')


if __name__ == '__main__':
    main()
