"""Copy the canonical runtime verbatim; fixtures are opt-in and never source edits."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, shutil

ROOT = Path(__file__).resolve().parents[1]
PARENT = ROOT.parent

def prepare(qa=False):
    spec = importlib.util.spec_from_file_location('folio_asset_policy', PARENT/'folio-android/release_assets.py')
    policy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(policy)
    source = PARENT/'folio-prototype'
    files = policy.web_sources(source)
    policy.validate_entry(source, files)
    destination = ROOT/'Generated/WebAssets'
    destination.mkdir(parents=True, exist_ok=True)
    expected = {}
    for file in files:
        relative = file.relative_to(source)
        target = destination/relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
        expected[relative.as_posix()] = digest
    # Fail on stale extra runtime files, rather than packaging an old experiment.
    actual = {p.relative_to(destination).as_posix() for p in destination.rglob('*') if p.is_file()}
    if actual != set(expected): raise RuntimeError('Stale generated resources; use a fresh Generated directory')
    fixture = ROOT/'Generated/QA'
    fixture.mkdir(parents=True, exist_ok=True)
    if qa:
        shutil.copy2(source/'qa/native-fixture.js', fixture/'native-fixture.js')
        for name in ['qa-seed.js', 'qa-tests.js']: shutil.copy2(ROOT/'ci'/name, fixture/name)
    elif any(fixture.iterdir()):
        raise RuntimeError('QA resources present in non-QA build; use a fresh Generated directory')
    report = {'files': expected, 'count': len(expected), 'source': 'folio-prototype', 'verbatim': True,
              'simulatorFixtures': qa, 'commit': os.environ.get('GITHUB_SHA', '')}
    (ROOT/'Generated/web-assets-manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'verbatimFiles': len(expected), 'simulatorFixtures': qa}))
    return report

def verify_app(app):
    report = json.loads((ROOT/'Generated/web-assets-manifest.json').read_text(encoding='utf-8'))
    directory = Path(app)/'WebAssets'
    actual = {p.relative_to(directory).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in directory.rglob('*') if p.is_file()}
    if actual != report['files']: raise RuntimeError('Built iOS resources differ from original web resources')
    print(json.dumps({'packagedFiles': len(actual), 'verbatim': True}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--qa', action='store_true')
    parser.add_argument('--verify-app', type=Path)
    args = parser.parse_args()
    verify_app(args.verify_app) if args.verify_app else prepare(args.qa)
