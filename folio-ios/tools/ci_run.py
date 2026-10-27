"""Run the actual app on an Apple iPhone simulator and collect inspectable evidence."""
from pathlib import Path
import argparse, json, os, plistlib, shutil, subprocess, sys, time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser();parser.add_argument('--size', choices=['compact','regular'], required=True)
args = parser.parse_args()
out = ROOT/'Reports'/args.size;out.mkdir(parents=True, exist_ok=True)

def run(*command, timeout=120):
    result = subprocess.run(command, cwd=ROOT, timeout=timeout, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    text = result.stdout.decode('utf-8', errors='replace')
    with (out/'commands.log').open('a',encoding='utf-8') as log: log.write(' '.join(command)+'\n'+text+'\n')
    if result.returncode:
        print(text,flush=True)
        raise subprocess.CalledProcessError(result.returncode,command,output=result.stdout)
    return text

def logged(name, command, timeout=900):
    print(name, flush=True)
    with (out/(name+'.log')).open('w', encoding='utf-8') as log:
        result = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=timeout)
    if result.returncode: print((out/(name+'.log')).read_text(encoding='utf-8')[-18000:], flush=True)
    return result.returncode

run(sys.executable, 'tools/prepare_assets.py', '--qa')
run(sys.executable, 'tools/generate_project.py')
(out/'xcode.txt').write_text(run('xcodebuild', '-version'), encoding='utf-8')
catalog = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json'))['devices']
sdk=run('xcrun','--sdk','iphonesimulator','--show-sdk-version').strip()
choices=[]
for runtime, devices in catalog.items():
    if '.iOS-' not in runtime: continue
    for device in devices:
        if device.get('isAvailable') and device['name'].startswith('iPhone'):
            choices.append({**device,'runtime':runtime})
if not choices: raise RuntimeError('No installed iPhone simulator; inspect runner/Xcode configuration')
# The VM can contain runtimes installed by several Xcodes. Use the selected
# Xcode's SDK/runtime pair, rather than blindly choosing the largest OS number.
matched=[d for d in choices if d['runtime'].split('.iOS-')[-1].replace('-','.')==sdk]
if matched:choices=matched
preferences = ['iPhone SE (3rd generation)','iPhone 16e','iPhone 16','iPhone 15'] if args.size=='compact' else ['iPhone 16 Pro','iPhone 17 Pro','iPhone 16 Pro Max','iPhone 15 Pro']
device=None
for name in preferences:
    matches=[d for d in choices if d['name']==name]
    if matches:
        device=sorted(matches,key=lambda d:d['runtime'],reverse=True)[0];break
if device is None: device=sorted(choices,key=lambda d:(d['runtime'],d['name']),reverse=True)[0]
device_id=device['udid'];(out/'device.json').write_text(json.dumps(device,indent=2),encoding='utf-8')
print('Simulator:',device['name'],device['runtime'],flush=True)
base=['xcodebuild','-project','Folio.xcodeproj','-scheme','Folio','-configuration','Debug','-destination','platform=iOS Simulator,id='+device_id,'-derivedDataPath','Build','CODE_SIGNING_ALLOWED=YES','CODE_SIGN_IDENTITY=-','CODE_SIGNING_REQUIRED=NO','CODE_SIGN_STYLE=Manual','DEVELOPMENT_TEAM=']
# Xcode 16.4 / iOS 18.5 has a documented Swift WebKit overlay loader defect.
# Use Apple's minimum-deployment workaround only for this simulator validation.
# https://developer.apple.com/forums/thread/785964
if sdk == '18.5':
    base += ['IPHONEOS_DEPLOYMENT_TARGET=18.4']
    (out/'simulator-workaround.txt').write_text('iOS18.5 WebKit overlay loader workaround: build validation target at18.4. iOS17 compatibility remains unverified.\n',encoding='utf-8')
code=logged('build',base+['build-for-testing'])
if code: raise SystemExit(code)
app=ROOT/'Build/Build/Products/Debug-iphonesimulator/Folio.app'
with (app/'Info.plist').open('rb') as stream:info=plistlib.load(stream)
(out/'app-info.json').write_text(json.dumps(info,indent=2,default=str),encoding='utf-8')
print('App metadata:',json.dumps({k:info.get(k) for k in ['CFBundleIdentifier','CFBundleExecutable','CFBundlePackageType','CFBundleSupportedPlatforms']}),flush=True)
assert info.get('CFBundleIdentifier')=='app.folio.ios.validation'
assert (app/info['CFBundleExecutable']).is_file()
assert not (app/'Resources').exists(), 'Reserved Resources directory confuses CFBundle layout detection'
run(sys.executable,'tools/prepare_assets.py','--verify-app',str(app))
shutil.copy2(ROOT/'Generated/web-assets-manifest.json',out/'web-assets-manifest.json')
if device['state']!='Booted':run('xcrun','simctl','boot',device_id)
run('xcrun','simctl','bootstatus',device_id,'-b',timeout=300)
run('xcrun','simctl','status_bar',device_id,'override','--time','9:41','--batteryState','charged','--batteryLevel','100')
run('xcrun','simctl','install',device_id,str(app))
run('codesign','--verify','--deep',str(app))
# XCUITest owns app launch. A separate cold simctl launch can hang on shared
# runners and adds no coverage beyond the real UI test's required launch.
video=subprocess.Popen(['xcrun','simctl','io',device_id,'recordVideo','--codec=h264',str(out/'simulator.mp4')],stdout=subprocess.DEVNULL,stderr=(out/'video.log').open('w'))
try:
    code=logged('ui-tests',base+['-parallel-testing-enabled','NO','-resultBundlePath',str(out/'Folio.xcresult'),'test-without-building'])
finally:
    video.send_signal(2)
    try:video.wait(timeout=30)
    except subprocess.TimeoutExpired:video.terminate()
    try:run('xcrun','simctl','io',device_id,'screenshot',str(out/'native-final.png'),timeout=30)
    except (subprocess.CalledProcessError,subprocess.TimeoutExpired):pass
    try:
        container=Path(run('xcrun','simctl','get_app_container',device_id,'app.folio.ios.validation','data').strip())
        if (container/'Documents/FolioQA').is_dir():shutil.copytree(container/'Documents/FolioQA',out/'screens',dirs_exist_ok=True)
    except subprocess.CalledProcessError:pass
    if (out/'Folio.xcresult').is_dir():
        exported=logged('export-attachments',['xcrun','xcresulttool','export','attachments','--path',str(out/'Folio.xcresult'),'--output-path',str(out/'attachments')],timeout=120)
        if exported: print('Full screenshots remain in Folio.xcresult',flush=True)
    for crash in (Path.home()/'Library/Logs/DiagnosticReports').glob('Folio*.ips'):
        (out/'crashes').mkdir(exist_ok=True);shutil.copy2(crash,out/'crashes'/crash.name)
        print('Native crash:',crash.read_text(encoding='utf-8',errors='replace')[:12000],flush=True)
report_path=out/'screens/report.json'
report=json.loads(report_path.read_text(encoding='utf-8')) if report_path.is_file() else {}
result={'passed':code==0 and report.get('passed') is True,'uiTestExitCode':code,'webChecks':len(report.get('checks',[])),
        'screenshots':len(report.get('screenshots',[])),'device':device['name'],'runtime':device['runtime'],
        'simulator':True,'fixtureData':True,'commit':os.environ.get('GITHUB_SHA','')}
(out/'ci-result.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)
if report.get('error'):print('Web validation failure:',report['error'],flush=True)
if not result['passed']:raise SystemExit(code or 1)
