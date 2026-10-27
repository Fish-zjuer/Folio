"""Copy the reviewable source snapshot from a local Folio workspace (no credentials or builds)."""
from pathlib import Path
import argparse, shutil, json
p=argparse.ArgumentParser();p.add_argument('--source-parent',type=Path,required=True)
p.add_argument('--include-flutter',action='store_true',help='Explicitly include the separate experimental migration sources')
args=p.parse_args()
source=args.source_parent.resolve();target=Path(__file__).resolve().parents[1]
if source==target:raise SystemExit('Choose the workspace containing the original source directories')
files=[]
web=source/'folio-prototype';native=source/'folio-android'
for path in web.iterdir():
 if path.is_file() and path.suffix in {'.html','.css','.js','.cjs','.md'} and path.name not in {'AGENTS.md','README.md','VALIDATION.md'}:files.append(path)
for folder in ['assets','widgets','design-lab','qa']:
 for path in (web/folder).rglob('*'):
  if path.is_file() and path.suffix in {'.html','.css','.js','.cjs','.mjs','.svg','.woff2','.txt','.md','.ts'}:files.append(path)
for name in ['offline-sync-report.json','learning-library-report.json','relationships-node-report.json','relationships-app-report.json','relationship-network-radial-report.json','relationships-native-csp-report.json','relationship-capacity-report.json','relationship-bottom-swipe-report.json','post-101-report.json','panels-day-report.json','account-entry-report.json','confirmation-card-report.json','time-confirmation-report.json','time-confirmation-node-report.json','homework-default-report.json','v101-update-node-report.json','inbox-drag-report.json','inbox-issues-node-report.json']:
 if (web/'qa'/name).is_file():files.append(web/'qa'/name)
for folder in ['src','res','tests','branding']:
 files.extend(path for path in (native/folder).rglob('*') if path.is_file())
files.extend(native.glob('*.py'));files.extend([native/'AndroidManifest.xml',native/'LICENSE'])
files.extend(native.glob('RELEASE-*.md'))
for name in ['APP-INTEGRATION.md','ROADMAP.md','README.md']:
 files.append(native/name)
for name in ['NEXT-STAGE-20261022.md','ELYCHRON-REVIEW.md']:
 files.append(native/name)
# Independent UIKit/WKWebView validation; generated assets are copied only by CI.
ios=source/'folio-ios'
if ios.is_dir():
 for path in ios.rglob('*'):
  rel=path.relative_to(ios)
  if not path.is_file() or any(part in {'Generated','Build','BuildDevice','Reports','__pycache__','xcuserdata'} for part in rel.parts):continue
  if path.suffix in {'.swift','.js','.py','.pbxproj','.xcscheme','.plist','.md','.yml'} or path.name=='.gitignore':files.append(path)
 workflow=ios/'ci/ios-webview.yml'
 destination=target/'.github/workflows/ios-webview.yml';destination.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(workflow,destination)

# Flutter migration: copy reviewable project sources only. Never import the SDK,
# pub cache, local paths, generated build state, signing files, or reference repos.
cross=source/'folio-cross-platform'
if args.include_flutter and cross.is_dir():
 skipped={'.git','.dart_tool','.idea','.gradle','.symlinks','ephemeral','build','dist','node_modules','Pods'}
 generated={'local.properties','key.properties','Generated.xcconfig','flutter_export_environment.sh','.flutter-plugins-dependencies','GeneratedPluginRegistrant.java'}
 roots={'lib','test','tool','assets','android','ios','web','windows','macos','linux'}
 allowed={'.dart','.yaml','.lock','.md','.svg','.png','.ico','.xml','.kt','.kts','.java','.gradle','.properties','.xcconfig','.plist','.entitlements','.pbxproj','.xcscheme','.xcworkspacedata','.xcsettings','.cmake','.cpp','.h','.cc','.c','.rc','.manifest','.txt','.html','.js','.json','.sh','.bat','.ps1','.mjs','.py','.ttf'}
 for path in cross.rglob('*'):
  rel=path.relative_to(cross)
  if not path.is_file() or any(part in skipped for part in rel.parts) or path.name in generated:continue
  if len(rel.parts)==1 and path.name in {'pubspec.yaml','pubspec.lock','analysis_options.yaml','README.md','MIGRATION.md','BACKEND-CONTRACT.md','VALIDATION.md','STARTUP-REPAIR.md','NATIVE-BACKEND-PROVENANCE.json','LICENSE','.metadata','.gitignore'}:files.append(path)
  elif rel.parts[0] in roots and (path.suffix in allowed or path.name in {'CMakeLists.txt','gradlew','.gitignore','gradle-wrapper.jar'}):files.append(path)
for path in sorted(set(files)):
 relative=path.relative_to(source)
 if any(part in {'.git','__pycache__','signing','build','dist','node_modules'} for part in relative.parts):raise SystemExit('Unexpected file category')
 if path.suffix.lower() in {'.jks','.keystore','.pem','.key','.apk','.zip'}:raise SystemExit('Unexpected private or binary artifact')
 destination=target/relative;destination.parent.mkdir(parents=True,exist_ok=True)
 if destination.is_file() and destination.read_bytes()==path.read_bytes():continue
 if destination.exists():destination.chmod(0o666)
 shutil.copy2(path,destination)
print(json.dumps({'copied':len(set(files)),'sourceFolders':['folio-prototype','folio-android']+(['folio-cross-platform'] if args.include_flutter else []),'keysAndUserDataIncluded':False}))
