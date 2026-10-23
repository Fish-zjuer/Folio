"""Create the corresponding source bundle without signing keys, builds or user data."""
from pathlib import Path
import zipfile
import hashlib
import json
from release_assets import release_identity

root=Path(__file__).resolve().parent
web=root.parent/'folio-prototype'
version,_,_=release_identity(root)
target=root/f'dist/folio-{version}-source.zip'
if target.exists():
    raise RuntimeError('Source release already exists: '+str(target))
internal_docs={'TEAM-STATE.md','USER-FEEDBACK-0.6.md','START-HERE.md'}
files=[root/'AndroidManifest.xml',*root.glob('*.py'),*(p for p in root.glob('*.md') if p.name not in internal_docs),root/'LICENSE']
evidence=['verification.json','build.json','app-integration-node.tap','app-integration-browser.txt','review05-mobile-692.txt','review05-range-keyboard.txt','feedback-06-node.tap','feedback-06-browser.txt','sdk-06-browser.txt']
evidence.extend([f'verification-{version}.json',f'build-{version}.json','home-week-verification.json',f'apk-size-{version}.json',f'live-services-{version}.json'])
files.extend(root/'dist'/name for name in evidence if (root/'dist'/name).is_file())
for folder in [root/'src',root/'res',root/'tests',root/'branding']:
    files.extend(p for p in folder.rglob('*') if p.is_file())
files.extend(p for p in web.iterdir() if p.is_file() and p.suffix in {'.html','.css','.js','.cjs','.md'})
for folder in [web/'assets',web/'qa',web/'design-lab',web/'widgets']:
    files.extend(p for p in folder.rglob('*') if p.is_file() and p.suffix in {'.html','.js','.css','.svg','.txt','.woff2','.md','.ts','.cjs','.mjs'})
files.extend(web/'qa'/name for name in ['offline-sync-report.json','learning-library-report.json','relationships-node-report.json','relationships-app-report.json','relationship-network-radial-report.json','relationships-native-csp-report.json','relationship-capacity-report.json','relationship-bottom-swipe-report.json'] if (web/'qa'/name).is_file())
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(p for p in set(files) if p.is_file()):
        archive.write(path,path.relative_to(root.parent).as_posix())
with zipfile.ZipFile(target) as archive:
    bad=archive.testzip()
    if bad: raise RuntimeError('Archive CRC failure: '+bad)
    if any(Path(name).suffix.lower() in {'.jks','.keystore','.pem','.key'} for name in archive.namelist()):
        raise RuntimeError('Private key in source bundle')
    count=len(archive.namelist())
digest=hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.zip.sha256').write_text(digest+'  '+target.name+'\n',encoding='utf-8')
print(json.dumps({'path':str(target),'files':count,'bytes':target.stat().st_size,'sha256':digest,'crcVerified':True},ensure_ascii=True))
