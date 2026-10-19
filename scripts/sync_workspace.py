"""Copy the reviewable source snapshot from a local Folio workspace (no credentials or builds)."""
from pathlib import Path
import argparse, shutil, json
p=argparse.ArgumentParser();p.add_argument('--source-parent',type=Path,required=True);args=p.parse_args()
source=args.source_parent.resolve();target=Path(__file__).resolve().parents[1]
if source==target:raise SystemExit('Choose the workspace containing the original source directories')
files=[]
web=source/'folio-prototype';native=source/'folio-android'
for path in web.iterdir():
 if path.is_file() and path.suffix in {'.html','.css','.js','.cjs','.md'} and path.name not in {'AGENTS.md','README.md','VALIDATION.md'}:files.append(path)
for folder in ['assets','widgets','design-lab','qa']:
 for path in (web/folder).rglob('*'):
  if path.is_file() and path.suffix in {'.html','.css','.js','.cjs','.svg','.woff2','.txt','.md','.ts'}:files.append(path)
for folder in ['src','res','tests','branding']:
 files.extend(path for path in (native/folder).rglob('*') if path.is_file())
files.extend(native.glob('*.py'));files.extend([native/'AndroidManifest.xml',native/'LICENSE'])
for name in ['APP-INTEGRATION.md','RELEASE-0.7.md','RELEASE-0.8.md','RELEASE-0.9.md','ROADMAP.md']:
 files.append(native/name)
for path in sorted(set(files)):
 relative=path.relative_to(source)
 if any(part in {'.git','__pycache__','signing','build','dist','node_modules'} for part in relative.parts):raise SystemExit('Unexpected file category')
 if path.suffix.lower() in {'.jks','.keystore','.pem','.key','.apk','.zip'}:raise SystemExit('Unexpected private or binary artifact')
 destination=target/relative;destination.parent.mkdir(parents=True,exist_ok=True)
 if destination.is_file() and destination.read_bytes()==path.read_bytes():continue
 if destination.exists():destination.chmod(0o666)
 shutil.copy2(path,destination)
print(json.dumps({'copied':len(set(files)),'sourceFolders':['folio-prototype','folio-android'],'keysAndUserDataIncluded':False}))
