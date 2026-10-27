"""Create an offline review page from downloaded simulator artifacts."""
from pathlib import Path
import argparse, html, json

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path, help='Directory containing ios-webview-compact/regular artifacts')
args = parser.parse_args()
root = args.directory.resolve()
titles = {'home':'首页','workbench':'工作台','calendar':'日程','timetable':'课表','courses':'课程',
          'exams':'考试','grades':'成绩','relationships':'关系网','settings':'设置','confirmation':'待确认修改'}
cards = []; summaries = []
def add_image(image, caption, theme, size):
    relative = html.escape(image.relative_to(root).as_posix(), quote=True)
    caption = html.escape(caption)
    cards.append(f'<figure data-theme="{theme}" data-size="{size}"><a href="{relative}" target="_blank"><img loading="lazy" src="{relative}" alt="{caption}"></a><figcaption>{caption}</figcaption></figure>')

for size in ['compact', 'regular']:
    folder = root/('ios-webview-'+size)
    if not folder.is_dir(): folder = root/size
    if not (folder/'ci-result.json').is_file(): continue
    meta = json.loads((folder/'ci-result.json').read_text(encoding='utf-8'))
    status = '通过' if meta['passed'] else '未通过'
    details = html.escape(folder.relative_to(root).as_posix(), quote=True)
    summaries.append(f'<p><strong>{html.escape(meta["device"])} · {status}</strong> · 网页检查 {meta["webChecks"]} 项 · {html.escape(meta["runtime"])} · <a href="{details}/ci-result.json">整体结果</a> · <a href="{details}/screens/report.json">网页检查详情</a></p>')
    for image in sorted((folder/'screens').glob('*.png')):
        theme, _, page = image.stem.partition('-')
        label = titles.get(page, page)
        add_image(image, f'{meta["device"]} · {"深色" if theme=="dark" else "浅色"} · {label}', theme, size)
    manifest = folder/'attachments/manifest.json'
    input_titles = {'01-home-full-device':'首页 · 系统安全区',
                    '02-workbench-after-real-swipe':'真实滑动后 · 工作台',
                    '03-keyboard-full-device':'真实输入 · 系统键盘',
                    '04-menu-real-tap':'真实点击 · 功能菜单'}
    if manifest.is_file():
        attachments = [a for group in json.loads(manifest.read_text(encoding='utf-8')) for a in group['attachments']]
        for prefix, label in input_titles.items():
            for attachment in attachments:
                if not attachment.get('suggestedHumanReadableName', '').startswith(prefix): continue
                image = folder/'attachments'/attachment['exportedFileName']
                if image.is_file() and image.suffix=='.png':
                    add_image(image, f'{meta["device"]} · {label}', 'input', size)
page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Folio · iOS 原网页验收</title><style>
body{margin:0;padding:28px;background:#f3f1ed;color:#242521;font:15px/1.6 system-ui}header{max-width:1100px;margin:auto}h1{font-size:28px;line-height:1.3}p{color:#65645e}nav{display:flex;gap:8px;margin:24px 0;flex-wrap:wrap}button{border:1px solid #dedbd4;border-radius:12px;background:#fff;padding:9px 16px;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px;max-width:1400px;margin:auto}figure{margin:0;padding:12px;background:#fff;border:1px solid #e2dfd8;border-radius:18px}img{display:block;width:100%;height:auto;border-radius:10px;background:#eceae5}figcaption{margin:12px 2px 2px;font-size:13px;color:#666}a{color:inherit}figure[hidden]{display:none}</style>
<header><h1>iOS 原网页 · 模拟器验收</h1><p>真实 iOS WKWebView 截图；使用虚构测试数据。沿用现有网页资源，没有重新绘制页面。点击图片可查看原图。</p>
<p>本轮验证界面和基础交互。学校真实登录、原生通知、性能和 TestFlight 分发仍待后续接入与真机验收。</p>'''
page += ''.join(summaries)
page += '''<nav><button onclick="filter('all')">全部</button><button onclick="filter('light')">浅色</button><button onclick="filter('dark')">深色</button><button onclick="filter('input')">真实键盘与手势</button><button onclick="filter('compact')">紧凑尺寸</button><button onclick="filter('regular')">常规尺寸</button></nav></header><main>'''
page += ''.join(cards)
page += '''</main><script>function filter(value){document.querySelectorAll('figure').forEach(e=>e.hidden=value!=='all'&&e.dataset.theme!==value&&e.dataset.size!==value)}</script></html>'''
(root/'index.html').write_text(page, encoding='utf-8')
print(json.dumps({'gallery': str(root/'index.html'), 'screenshots': len(cards)}))
