"""Run the actual native transport with an empty browser and scripted HTTPS, no network/dependencies."""
from pathlib import Path
import os, subprocess
root=Path(__file__).resolve().parent
java=Path(os.environ.get('JAVA_HOME','C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot'))/'bin'
out=root/'build/school-network-tests';out.mkdir(parents=True,exist_ok=True)
sources=[root/'src/app/folio/preview/Network.java',root/'src/app/folio/preview/SchoolProtocol.java',root/'src/app/folio/preview/SchoolSession.java',root/'tests/SchoolNetworkTest.java',*sorted((root/'tests/network-fixtures').rglob('*.java'))]
compiled=subprocess.run([str(java/'javac.exe'),'--release','8','-encoding','UTF-8','-d',str(out),*map(str,sources)],capture_output=True,text=True,encoding='utf-8',errors='replace')
if compiled.returncode:
    raise RuntimeError('School transport fixture compilation failed: '+compiled.stderr)
result=subprocess.run([str(java/'java.exe'),'-cp',str(out),'app.folio.preview.SchoolNetworkTest'],check=True,capture_output=True,text=True)
if 'PASS 28 offline school network checks' not in result.stdout:
    raise RuntimeError('School transport tests did not return a success receipt: '+result.stderr)
print(result.stdout.strip())
