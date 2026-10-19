"""Build with the installed Android SDK/JDK; no Flutter, Gradle, npm, or remote build service."""
from pathlib import Path
import datetime, hashlib, json, os, shutil, subprocess, zipfile
from release_assets import web_sources, validate_entry, release_identity

ROOT = Path(__file__).resolve().parent
SDK = Path(os.environ.get("ANDROID_HOME", Path.home()/"AppData/Local/Android/Sdk"))
JAVA = Path(os.environ.get("JAVA_HOME", "C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot"))/"bin"
TOOLS = SDK/"build-tools/34.0.0"
ANDROID = SDK/"platforms/android-34/android.jar"
WEB = ROOT.parent/"folio-prototype"
WORK = ROOT/"build"/datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
DIST = ROOT/"dist"

def run(*args):
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT)

def main():
    version,version_code,package=release_identity(ROOT)
    apk=DIST/f"folio-{version}.apk"
    if apk.exists():
        raise RuntimeError("Release APK already exists; choose a new version before building: "+str(apk))
    key=ROOT/"signing/folio-test.jks"
    if not key.is_file():
        raise RuntimeError("Original signing/folio-test.jks is required. No replacement key will be generated.")
    sources=web_sources(WEB);validate_entry(WEB,sources)
    WORK.mkdir(parents=True,exist_ok=True)
    # Keep javac's ZIP filesystem canonicalization inside this build workspace.
    android=WORK/"android.jar";shutil.copy2(ANDROID,android)
    assets=WORK/"assets/www";assets.mkdir(parents=True)
    for path in sources:
        target=assets/path.relative_to(WEB);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
    classes=WORK/"classes";classes.mkdir();dex=WORK/"dex";dex.mkdir()
    run(JAVA/"javac.exe","--release","8","-encoding","UTF-8","-classpath",android,"-d",classes,*sorted((ROOT/"src").rglob("*.java")))
    jar=WORK/"classes.jar"
    with zipfile.ZipFile(jar,"w",zipfile.ZIP_DEFLATED) as out:
        for path in classes.rglob("*.class"):out.write(path,path.relative_to(classes).as_posix())
    run(TOOLS/"d8.bat","--lib",android,"--min-api","28","--output",dex,jar)
    raw=WORK/"unsigned.apk"
    # Legacy aapt's ZIP reader requires the ASCII SDK path on Windows.
    run(TOOLS/"aapt.exe","package","-f","-M",ROOT/"AndroidManifest.xml","-S",ROOT/"res","-A",WORK/"assets","-I",ANDROID,"-F",raw)
    with zipfile.ZipFile(raw,"a",zipfile.ZIP_DEFLATED) as out:
        for path in dex.glob("*.dex"):out.write(path,path.name)
    aligned=WORK/"aligned.apk";run(TOOLS/"zipalign.exe","-f","4",raw,aligned)
    DIST.mkdir(exist_ok=True)
    run(TOOLS/"apksigner.bat","sign","--ks",key,"--ks-key-alias","folio-test","--ks-pass","pass:android","--key-pass","pass:android","--out",apk,aligned)
    run(TOOLS/"apksigner.bat","verify","--verbose",apk)
    report={"apk":apk.name,"version":version,"versionCode":version_code,"bytes":apk.stat().st_size,"sha256":hashlib.sha256(apk.read_bytes()).hexdigest(),"builtAt":datetime.datetime.now().isoformat(),"minAndroid":9,"package":package}
    (DIST/f"build-{version}.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=="__main__":main()
