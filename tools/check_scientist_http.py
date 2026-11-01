"""Check the served SCIENTIST module graph; browser checks cover rendering."""
from urllib.request import urlopen
from urllib.parse import urljoin
import re

base = 'http://127.0.0.1:15455/'
paths = ['tools/scientist_preview.html', 'tools/scientist_preview.js',
         'tools/scientist_checks.js', 'js/models/scientist.js',
         'js/models/human.js', 'js/models/humanAnimator.js',
         'js/models/humanKit.js', 'js/anim/clip.js']
for path in paths:
    url = urljoin(base, path)
    with urlopen(url, timeout=10) as response:
        assert response.status == 200, path
        text = response.read().decode('utf-8')
    for relative in re.findall(r"from\s+['\"](\.[^'\"]+)['\"]", text):
        with urlopen(urljoin(url, relative), timeout=10) as dependency:
            assert dependency.status == 200, relative
    print('PASS', path)
print('PASS: served files and relative module imports. JavaScript runtime was checked separately in browser.')
