"""Atomic record replacement and chunked binary file export; no Android or network."""
from pathlib import Path
import os,subprocess,re
root=Path(__file__).resolve().parent
java=Path(os.environ.get('JAVA_HOME','C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot'))/'bin'
out=root/'build/offline-sync-tests';out.mkdir(parents=True,exist_ok=True)
sources=[root/'src/app/folio/preview/RecordRepository.java',root/'src/app/folio/preview/OfflineTransfer.java',root/'tests/OfflineSyncTest.java',*sorted((root/'tests/network-fixtures/org/json').glob('*.java'))]
subprocess.run([str(java/'javac.exe'),'--release','8','-encoding','UTF-8','-d',str(out),*map(str,sources)],check=True)
result=subprocess.run([str(java/'java.exe'),'-cp',str(out),'app.folio.preview.OfflineSyncTest',str(out/'staging')],check=True,capture_output=True,text=True)
if not re.search(r'PASS \d+ offline sync repository/transfer checks',result.stdout):raise RuntimeError(result.stdout+result.stderr)
print(result.stdout.strip())
