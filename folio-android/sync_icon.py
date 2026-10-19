"""Regenerate matching Android vectors and the Web SVG from branding/launcher.json."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
spec=json.loads((ROOT/'branding/launcher.json').read_text())
paths=spec['paths'];bg=spec['background']
vector=lambda items: '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'+''.join('  <path android:fillColor="'+p['fill']+'" android:pathData="'+p['d']+'"/>\n' for p in items)+'</vector>\n'
(ROOT/'res/drawable/ic_launcher.xml').write_text(vector([{'fill':bg,'d':'M0,0H108V108H0Z'},*paths]),encoding='utf-8')
(ROOT/'res/drawable/ic_launcher_foreground.xml').write_text(vector(paths),encoding='utf-8')
for folder in ['mipmap-anydpi-v26','values']:(ROOT/'res'/folder).mkdir(exist_ok=True)
(ROOT/'res/values/launcher_colors.xml').write_text('<resources><color name="launcher_background">'+bg+'</color></resources>\n',encoding='utf-8')
(ROOT/'res/mipmap-anydpi-v26/ic_launcher.xml').write_text('<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>\n',encoding='utf-8')
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><path fill="'+bg+'" d="M0 0h108v108H0z"/>'+''.join('<path fill="'+p['fill']+'" d="'+p['d']+'"/>' for p in paths)+'</svg>\n'
(ROOT.parent/'folio-prototype/assets/folio-icon.svg').write_text(svg,encoding='utf-8')
