"""Phone usage arithmetic, without an Android device, permission grant, or private events."""
from pathlib import Path
import os,subprocess
root=Path(__file__).resolve().parent
java=Path(os.environ.get('JAVA_HOME','C:/Program Files/Microsoft/jdk-17.0.18.8-hotspot'))/'bin'
out=root/'build/usage-tests';out.mkdir(parents=True,exist_ok=True)
subprocess.run([str(java/'javac.exe'),'--release','8','-encoding','UTF-8','-d',str(out),str(root/'src/app/folio/preview/UsageTimeline.java'),str(root/'tests/UsageTimelineTest.java')],check=True)
subprocess.run([str(java/'java.exe'),'-cp',str(out),'app.folio.preview.UsageTimelineTest'],check=True)
