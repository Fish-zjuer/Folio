"""Offline CAS protocol tests using the installed JDK, without Android or network access."""
from pathlib import Path
import os, subprocess

root=Path(__file__).resolve().parent
java=Path(os.environ.get('JAVA_HOME','C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot'))/'bin'
out=root/'build/native-tests'
out.mkdir(parents=True,exist_ok=True)
subprocess.run([str(java/'javac.exe'),'--release','8','-encoding','UTF-8','-d',str(out),str(root/'src/app/folio/preview/SchoolProtocol.java'),str(root/'tests/SchoolProtocolTest.java')],check=True)
result=subprocess.run([str(java/'java.exe'),'-cp',str(out),'app.folio.preview.SchoolProtocolTest'],check=True,capture_output=True,text=True)
if 'PASS 20 offline native school protocol checks' not in result.stdout:
    raise RuntimeError('Native protocol checks did not return a success receipt: '+result.stderr)
print(result.stdout.strip())
