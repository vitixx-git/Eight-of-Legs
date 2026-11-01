#!/usr/bin/env python3
"""Пересоздаёт js/tests/sources.js — список всех модулей js/ для test.audio."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
files = sorted('../' + str(p.relative_to(root / 'js')).replace('\\', '/') for p in (root / 'js').rglob('*.js'))
files = [f for f in files if f != '../tests/sources.js']
(root / 'js/tests/sources.js').write_text('// Список исходников для test.audio (поиск вызовов звука по ID). Пересоздать: python3 tools/gen_sources.py\nexport const SOURCES = ' + json.dumps(files, ensure_ascii=False) + ';\n', encoding='utf-8')
print(len(files), 'files')
