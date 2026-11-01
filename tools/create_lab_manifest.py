"""Create an honest asset manifest template; never overwrite a supplied manifest."""
import json
from pathlib import Path
items = [('spider_specimen','Length',4),('hazard_floor_sign','Height',70),('chair_office','Height',100),('bookcase_archive','Height',200),('cabinet_low','Height',60),('journal','Length',26),('journal_red','Length',24),('desk_lamp','Height',45),('analyzer','Width',30),('monitor_crt','Width',45),('tape_dispenser','Length',15),('clock_wall','Width',35),('pendant_lamp','Width',45),('houseplant','Height',90),('water_bath','Width',30),('timer_clock','Height',12),('spirit_lamp','Height',25)]
p = Path('assets/lab_kit/lab_kit_manifest.json')
if p.exists():
    print('Existing manifest preserved')
else:
    p.parent.mkdir(parents=True, exist_ok=True)
    (p.parent / 'models').mkdir(exist_ok=True)
    models = [dict(id=id, file=f'models/{id}.glb', role=id, nativeSize=None, triangles=None, materials=None, textures=None, animations=None, **{f'target{axis}Cm':size}) for id,axis,size in items]
    p.write_text(json.dumps(dict(pendingAssets=True, models=models), ensure_ascii=False, indent=2), encoding='utf-8')
    print('Created template for 17 missing assets')
