"""Build a real arm64 iPhone archive and a clearly labelled unsigned IPA on macOS."""
from pathlib import Path
import hashlib, json, os, plistlib, shutil, subprocess, sys, zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Reports/device';OUT.mkdir(parents=True,exist_ok=True)
def run(*command, timeout=900, cwd=ROOT):
    result=subprocess.run(command,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
    text=result.stdout.decode('utf-8',errors='replace')
    with (OUT/'build.log').open('a',encoding='utf-8') as log:log.write(' '.join(command)+'\n'+text+'\n')
    if result.returncode:print(text[-22000:]);raise subprocess.CalledProcessError(result.returncode,command)
    return text

run(sys.executable,'tools/prepare_assets.py')
run('swift','tools/render_icon.swift')
run(sys.executable,'tools/generate_project.py')
archive=OUT/'Folio.xcarchive'
run('xcodebuild','-project','Folio.xcodeproj','-scheme','Folio','-configuration','Release',
    '-destination','generic/platform=iOS','-archivePath',str(archive),'-derivedDataPath','BuildDevice',
    'CODE_SIGNING_ALLOWED=NO','CODE_SIGNING_REQUIRED=NO','DEVELOPMENT_TEAM=','archive')
app=archive/'Products/Applications/Folio.app'
info=plistlib.loads((app/'Info.plist').read_bytes());executable=app/info['CFBundleExecutable']
assert info['CFBundleSupportedPlatforms']==['iPhoneOS'], 'Simulator products are not device packages'
arch=run('lipo','-archs',str(executable)).strip();assert arch=='arm64',arch
platform=run('xcrun','vtool','-show-build',str(executable));assert 'platform IOS' in platform and 'IOSSIMULATOR' not in platform
run(sys.executable,'tools/prepare_assets.py','--verify-app',str(app))
assert not list((app/'QA').rglob('*.js')), 'Simulator fixture accidentally included'
assert not (app/'embedded.mobileprovision').exists(), 'Unsigned package must not claim a provisioning profile'
strings=run('strings',str(executable))
for marker in ['fixture-sso','__folioIOSQAInjected','FolioNativeQA-','FixtureURLProtocol']:
    assert marker not in strings, 'Debug-only test code leaked: '+marker
stage=OUT/'package';stage.mkdir(exist_ok=False);payload=stage/'Payload';payload.mkdir()
shutil.copytree(app,payload/'Folio.app',symlinks=True)
name=f'folio-ios-{info["CFBundleShortVersionString"]}-build.{info["CFBundleVersion"]}-unsigned.ipa'
ipa=OUT/name
run('/usr/bin/zip','-q','-r','-y',str(ipa),'Payload',cwd=stage)
with zipfile.ZipFile(ipa) as z:
    assert z.testzip() is None
    assert plistlib.loads(z.read('Payload/Folio.app/Info.plist'))['CFBundleSupportedPlatforms']==['iPhoneOS']
digest=hashlib.sha256(ipa.read_bytes()).hexdigest()
(OUT/(name+'.sha256')).write_text(digest+'  '+name+'\n',encoding='utf-8')
report={'platform':'iPhoneOS','architecture':arch,'signed':False,'directlyInstallable':False,
        'requiresSigning':True,'simulatorFixtures':False,'verbatimWebFiles':155,
        'bundleIdentifier':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],
        'minimumOSVersion':info['MinimumOSVersion'],'commit':os.environ.get('GITHUB_SHA',''),'file':name,
        'size':ipa.stat().st_size,'sha256':digest,'nativeFunctions':'school/account/provider/records/files/reminders implemented; real-device testing pending'}
(OUT/'device-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
shutil.copy2(ROOT/'Generated/web-assets-manifest.json',OUT/'web-assets-manifest.json')
shutil.copy2(ROOT/'DEVICE-TESTING.md',OUT/'DEVICE-TESTING.md')
print(json.dumps(report))
