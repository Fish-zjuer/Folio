"""Run the actual app on an Apple iPhone simulator and collect inspectable evidence."""
from pathlib import Path
import argparse, json, os, shutil, subprocess, sys, time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser();parser.add_argument('--size', choices=['compact','regular'], required=True)
args = parser.parse_args()
out = ROOT/'Reports'/args.size;out.mkdir(parents=True, exist_ok=True)

def run(*command, timeout=120):
    return subprocess.check_output(command, cwd=ROOT, timeout=timeout, stderr=subprocess.STDOUT).decode('utf-8', errors='replace')

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
choices=[]
for runtime, devices in catalog.items():
    if '.iOS-' not in runtime: continue
    for device in devices:
        if device.get('isAvailable') and device['name'].startswith('iPhone'):
            choices.append({**device,'runtime':runtime})
if not choices: raise RuntimeError('No installed iPhone simulator; inspect runner/Xcode configuration')
preferences = ['iPhone SE (3rd generation)','iPhone 16e','iPhone 16','iPhone 15'] if args.size=='compact' else ['iPhone 16 Pro','iPhone 17 Pro','iPhone 16 Pro Max','iPhone 15 Pro']
device=None
for name in preferences:
    matches=[d for d in choices if d['name']==name]
    if matches:
        device=sorted(matches,key=lambda d:d['runtime'],reverse=True)[0];break
if device is None: device=sorted(choices,key=lambda d:(d['runtime'],d['name']),reverse=True)[0]
device_id=device['udid'];(out/'device.json').write_text(json.dumps(device,indent=2),encoding='utf-8')
print('Simulator:',device['name'],device['runtime'],flush=True)
if device['state']!='Booted':run('xcrun','simctl','boot',device_id)
run('xcrun','simctl','bootstatus',device_id,'-b',timeout=300)
run('xcrun','simctl','status_bar',device_id,'override','--time','9:41','--batteryState','charged','--batteryLevel','100')
base=['xcodebuild','-project','Folio.xcodeproj','-scheme','Folio','-configuration','Debug','-destination','platform=iOS Simulator,id='+device_id,'-derivedDataPath','Build','CODE_SIGNING_ALLOWED=NO']
code=logged('build',base+['build-for-testing'])
if code: raise SystemExit(code)
app=ROOT/'Build/Build/Products/Debug-iphonesimulator/Folio.app'
run(sys.executable,'tools/prepare_assets.py','--verify-app',str(app))
shutil.copy2(ROOT/'Generated/web-assets-manifest.json',out/'web-assets-manifest.json')
video=subprocess.Popen(['xcrun','simctl','io',device_id,'recordVideo','--codec=h264',str(out/'simulator.mp4')],stdout=subprocess.DEVNULL,stderr=(out/'video.log').open('w'))
try:
    code=logged('ui-tests',base+['-parallel-testing-enabled','NO','-resultBundlePath',str(out/'Folio.xcresult'),'test-without-building'])
finally:
    video.send_signal(2)
    try:video.wait(timeout=30)
    except subprocess.TimeoutExpired:video.terminate()
    try:
        container=Path(run('xcrun','simctl','get_app_container',device_id,'app.folio.ios.validation','data').strip())
        if (container/'Documents/FolioQA').is_dir():shutil.copytree(container/'Documents/FolioQA',out/'screens',dirs_exist_ok=True)
    except subprocess.CalledProcessError:pass
    if (out/'Folio.xcresult').is_dir():
        exported=logged('export-attachments',['xcrun','xcresulttool','export','attachments','--path',str(out/'Folio.xcresult'),'--output-path',str(out/'attachments')],timeout=120)
        if exported: print('Full screenshots remain in Folio.xcresult',flush=True)
report_path=out/'screens/report.json'
report=json.loads(report_path.read_text(encoding='utf-8')) if report_path.is_file() else {}
result={'passed':code==0 and report.get('passed') is True,'uiTestExitCode':code,'webChecks':len(report.get('checks',[])),
        'screenshots':len(report.get('screenshots',[])),'device':device['name'],'runtime':device['runtime'],
        'simulator':True,'fixtureData':True,'commit':os.environ.get('GITHUB_SHA','')}
(out/'ci-result.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)
if not result['passed']:raise SystemExit(code or 1)
