"""Verify release metadata, signature continuity and exact packaged web sources."""
from pathlib import Path
import hashlib,json,os,re,subprocess,zipfile
from release_assets import web_sources, validate_entry, release_identity

root=Path(__file__).resolve().parent
web=root.parent/'folio-prototype'
sdk=Path(os.environ.get('ANDROID_HOME',Path.home()/'AppData/Local/Android/Sdk'))/'build-tools/34.0.0'
version,version_code,package=release_identity(root)
apk=root/f'dist/folio-{version}.apk'
def output(*args):
    return subprocess.check_output([str(a) for a in args],cwd=root).decode('utf-8',errors='replace')
# aapt's legacy ZIP reader needs an ASCII archive argument on Windows.
badging=output(sdk/'aapt.exe','dump','badging',apk.relative_to(root))
for expected in [f"name='{package}'",f"versionCode='{version_code}'",f"versionName='{version}'","sdkVersion:'28'","targetSdkVersion:'34'"]:
    if expected not in badging:raise RuntimeError('Missing APK metadata: '+expected)
manifest=output(sdk/'aapt.exe','dump','xmltree',apk.relative_to(root),'AndroidManifest.xml')
if not re.search(r'screenOrientation.*=\(type 0x10\)0x1',manifest):raise RuntimeError('APK is not portrait locked')
signatures=output(sdk/'apksigner.bat','verify','--verbose','--print-certs',apk)
cert=re.search(r'certificate SHA-256 digest: ([a-f0-9]+)',signatures).group(1)
older=root/'dist/folio-0.6-test.apk'
if older.exists():
    previous=re.search(r'certificate SHA-256 digest: ([a-f0-9]+)',output(sdk/'apksigner.bat','verify','--print-certs',older)).group(1)
    if previous!=cert:raise RuntimeError('Existing APK has a different signing certificate')
sources=web_sources(web);validate_entry(web,sources)
with zipfile.ZipFile(apk) as bundle:
    for path in sources:
        if bundle.read('assets/www/'+path.relative_to(web).as_posix())!=path.read_bytes():raise RuntimeError('Packaged file differs: '+path.name)
    forbidden=[n for n in bundle.namelist() if n.startswith('assets/www/qa/') or n.endswith(('.cjs','.jks')) or 'fixture' in n.lower() or n.startswith('assets/www/design-lab/') and n.endswith('.html')]
    if forbidden:raise RuntimeError('Test/private files in APK: '+str(forbidden))
report={'version':version,'versionCode':version_code,'package':package,'minSdk':28,'targetSdk':34,'portrait':True,'signatureVerified':True,'certificateSha256':cert,'sameCertificateAs06':older.exists(),'matchedWebFiles':len(sources),'noFixturesOrPrivateKeys':True,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()}
(root/f'dist/verification-{version}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
