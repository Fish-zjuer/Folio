"""Single asset policy shared by build and verification. Experimental HTML is not an app runtime."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import xml.etree.ElementTree as ET

RUNTIME_ART = ("focus-core.js", "focus-building-core.js", "focus-building-art.js", "daily-pressure-core.js")

def release_identity(root):
    """Use the manifest as the single release identity for build, verify and source ZIP."""
    manifest = ET.parse(root/"AndroidManifest.xml").getroot()
    namespace = "{http://schemas.android.com/apk/res/android}"
    name = manifest.attrib[namespace+"versionName"]
    if not re.fullmatch(r"[0-9A-Za-z][0-9A-Za-z._-]*", name):
        raise RuntimeError("Unsafe release filename")
    return name, int(manifest.attrib[namespace+"versionCode"]), manifest.attrib["package"]

def web_sources(web):
    files = [web/"index.html", web/"relationship-view.html", *web.glob("*.js"), *web.glob("*.css")]
    files.extend(web/"design-lab"/name for name in RUNTIME_ART)
    for directory, extensions in [("assets", {".woff2", ".svg", ".txt"}), ("widgets", {".js", ".css", ".svg", ".woff2"})]:
        files.extend(p for p in (web/directory).rglob("*") if p.is_file() and p.suffix in extensions)
    for p in files:
        if not p.resolve().is_relative_to(web.resolve()):
            raise RuntimeError("Asset escapes web source directory")
        if not p.is_file():
            raise RuntimeError("Missing runtime asset: " + str(p))
    return sorted(set(files))

def validate_entry(web, files):
    included = {p.relative_to(web).as_posix() for p in files}
    class Dependencies(HTMLParser):
        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            ref = a.get("src") if tag == "script" else a.get("href") if tag == "link" and a.get("rel") == "stylesheet" else None
            if not ref: return
            u = urlsplit(ref)
            name = unquote(u.path)
            if u.scheme or u.netloc or name.startswith("/") or ".." in Path(name).parts or name not in included:
                raise RuntimeError("Entrypoint dependency is not packaged locally: " + ref)
    for entry in [web/"index.html", web/"relationship-view.html"]:
        Dependencies().feed(entry.read_text(encoding="utf-8"))

