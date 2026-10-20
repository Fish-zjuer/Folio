/* Literal, reviewed v2/v4 HTML+CSS and static initialization from user-supplied prototypes.
 * Inert visual templates are cloned; live bindings never execute their demo interactions. */
(()=>{'use strict';const templates={},styles=".study-source-v2{--bg:#FAF8F5;--ink:#2A2622;--terra:#A56A4D;--ochre:#C9A26E;--sage:#9DA98F;--teal:#7E9E9A;--dusk:#8886B0;\n--serif:\"Noto Serif SC\",\"Source Han Serif SC\",\"Songti SC\",\"STSong\",Georgia,serif}.study-source-v2 *{box-sizing:border-box;margin:0}.study-source-v2 .card{aspect-ratio:1;border-radius:28px;padding:18px;position:relative;container-type:inline-size;display:flex;flex-direction:column;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(90,70,40,.05)}.study-source-v2 .a{background:#F2EADF}.study-source-v2 .b{background:#E1E6DD}.study-source-v2 .c{background:#EAE2D6}.study-source-v2 .d{background:#DEE6E2}.study-source-v2 svg{display:block;width:100%}.study-source-v2 button{all:unset;cursor:pointer;-webkit-tap-highlight-color:transparent}.study-source-v2 :focus-visible{outline:2px solid var(--teal);outline-offset:3px;border-radius:12px}.study-source-v2 .g{display:grid;gap:3cqw;position:relative}.study-source-v2 .g i{aspect-ratio:1;border-radius:26%;position:relative;transition:background .45s,opacity .45s}.study-source-v2 .g svg{position:absolute;inset:0;height:100%;pointer-events:none}.study-source-v2 .hd::before,.study-source-v2 .hd::after{content:\"\";position:absolute;top:28%;width:19%;height:19%;border-radius:50%;background:#FAF8F5}.study-source-v2 .hd::before{left:24%}.study-source-v2 .hd::after{right:24%}.study-source-v2 [data-ref=pomo]{cursor:pointer}.study-source-v2 [data-ref=pomo] .g{grid-template-columns:repeat(5,1fr)}.study-source-v2 [data-ref=day] .g{grid-template-columns:repeat(4,1fr)}.study-source-v2 .hg{display:grid;grid-template-columns:repeat(7,10.4cqw);grid-auto-rows:10.4cqw;gap:2.4cqw;justify-content:center;position:relative;margin:auto}.study-source-v2 .hg i{border-radius:26%;transition:background .4s}.study-source-v2 .hg::before,.study-source-v2 .hg::after{content:\"\";position:absolute;left:-3cqw;right:-3cqw;height:1.4cqw;border-radius:1cqw;background:#BCAC94}.study-source-v2 .hg::before{top:-3.4cqw}.study-source-v2 .hg::after{bottom:-3.4cqw}.study-source-v2 .grain{animation:study-ref-fall 1.8s ease-in-out infinite}@keyframes study-ref-fall{0%,100%{opacity:.15}50%{opacity:1}}.study-source-v2 .leaf{opacity:0;transform:scale(.3);transform-box:fill-box;transform-origin:50% 100%;transition:opacity .5s,transform .6s cubic-bezier(.3,1.4,.5,1)}.study-source-v2 .leaf.on{opacity:1;transform:none}.study-source-v2 .tri{display:grid;grid-template-columns:repeat(3,1fr);gap:3cqw;margin-top:3cqw}.study-source-v2 .tri button{aspect-ratio:1;border-radius:28%;background:rgba(94,128,124,.17);transition:background .3s,transform .2s;position:relative}.study-source-v2 .tri button:active{transform:scale(.93)}.study-source-v2 .tri button.on{background:var(--teal)}.study-source-v2 .tri button.on::after{content:\"\";position:absolute;inset:34%;border-radius:50%;background:rgba(255,255,255,.55)}.study-source-v2 .num{font-family:var(--serif);font-weight:700;font-size:31px;line-height:1;color:#6B5A4A}.study-source-v2 .st{display:flex;align-items:flex-end;gap:2cqw;height:46cqw;position:relative;margin:auto 0 5cqw}.study-source-v2 .st i{flex:1;border-radius:22% 22% 14% 14%}.study-source-v2 .st::after{content:\"\";position:absolute;left:90%;bottom:-4.6cqw;transform:translateX(-50%);border:2.6cqw solid transparent;border-bottom:3.6cqw solid var(--terra);border-top:0}.study-source-v2 .rv{display:flex;gap:2.4cqw;margin-top:4cqw}.study-source-v2 .rv i{flex:1;aspect-ratio:1;border-radius:26%;background:var(--terra)}.study-source-v2 .rv i:nth-child(n+4){opacity:.4}@media (prefers-reduced-motion:reduce){.study-source-v2 *{transition:none!important;animation:none!important}}\n.study-source-v4{--bg:#FAF8F5;--terra:#A56A4D;--ochre:#C9A26E;--sage:#9DA98F;--teal:#7E9E9A;--dusk:#8886B0}.study-source-v4 *{box-sizing:border-box;margin:0}.study-source-v4 .card{aspect-ratio:1;border-radius:28px;padding:18px;position:relative;container-type:inline-size;display:flex;flex-direction:column;justify-content:center;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(90,70,40,.05)}.study-source-v4 .a{background:#F2EADF}.study-source-v4 .b{background:#E1E6DD}.study-source-v4 .c{background:#EAE2D6}.study-source-v4 .d{background:#DEE6E2}.study-source-v4 svg{display:block;width:100%}.study-source-v4 .tap{cursor:pointer;-webkit-tap-highlight-color:transparent}.study-source-v4 .g{display:grid;gap:3cqw;position:relative}.study-source-v4 .g i{aspect-ratio:1;border-radius:26%;position:relative;transition:background .4s}.study-source-v4 .hd::before,.study-source-v4 .hd::after{content:\"\";position:absolute;top:28%;width:19%;height:19%;border-radius:50%;background:#FAF8F5}.study-source-v4 .hd::before{left:24%}.study-source-v4 .hd::after{right:24%}.study-source-v4 [data-ref=streak]{grid-template-columns:repeat(5,1fr)}.study-source-v4 [data-ref=mz]{grid-template-columns:repeat(4,1fr)}.study-source-v4 [data-ref=mz] i{cursor:pointer}.study-source-v4 [data-ref=mz] i[data-l=\"0\"]::after{content:\"\";position:absolute;inset:36%;border-radius:50%;background:var(--terra)}.study-source-v4 [data-ref=wk]{grid-template-columns:repeat(7,1fr);gap:2.4cqw}.study-source-v4 .ghost{animation:study-ref-blink 1.8s ease-in-out infinite}@keyframes study-ref-blink{50%{opacity:.25}}.study-source-v4 [data-ref=dm] g{transition:transform .55s cubic-bezier(.5,0,.8,.6)}.study-source-v4 .fan{position:relative;height:88cqw}.study-source-v4 .fan i{position:absolute;left:50%;bottom:0;width:44cqw;height:64cqw;margin-left:-22cqw;border-radius:5cqw;transform-origin:50% 125%;transition:transform .55s cubic-bezier(.3,1.25,.5,1);box-shadow:0 0 0 1.5px rgba(250,248,245,.7)}.study-source-v4 .fan i::before{content:\"\";position:absolute;left:14%;top:11%;width:22%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.55)}.study-source-v4 .dd{position:absolute;pointer-events:none}@media (prefers-reduced-motion:reduce){.study-source-v4 *{transition:none!important;animation:none!important}}";
 const installed=new WeakSet();function install(owner){if(installed.has(owner))return;const style=owner.createElement('style');style.textContent=styles;owner.head.append(style);installed.add(owner);}install(document);
function build_v2(){const container=document.createElement('div');container.innerHTML="\n\n <!-- 专注：蜷缩的蛇，一格一分钟，吃到苹果就是一个番茄 -->\n <article class=\"card a\" id=\"pomo\" role=\"button\" tabindex=\"0\" aria-label=\"番茄钟：蛇向中心的苹果前进，轻点开始或暂停\">\n  <div class=\"g\" id=\"snake\"></div>\n </article>\n\n <!-- 今日：蛇形的 16 个小时，红色蛇头是现在 -->\n <article class=\"card b\" id=\"day\" aria-label=\"今日时间轴：红色蛇头是现在，紫色方块是课，赭色是晚间安排，白色是空闲\">\n  <div class=\"g\" id=\"hours\"><svg viewBox=\"0 0 4 4\"><path d=\"M.5 .5H3.5V1.5H.5V2.5H3.5V3.5H.5\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".7\" stroke-width=\".07\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></div>\n </article>\n\n <!-- 倒计时：沙漏，上面的沙是剩下的日子 -->\n <article class=\"card c\" aria-label=\"期末倒计时：沙漏，上半部分的沙是剩余的日子\">\n  <div class=\"hg\" id=\"hg\"></div>\n </article>\n\n <!-- 待办：完成一件，长一片叶子 -->\n <article class=\"card d\" aria-label=\"今日三件事：每完成一件，小芽长出一片叶子\">\n  <svg viewBox=\"0 0 60 60\" style=\"flex:1;min-height:0\">\n   <path d=\"M30 58V6\" stroke=\"#7E9E9A\" stroke-width=\"2.6\" stroke-linecap=\"round\" fill=\"none\"/>\n   <path class=\"leaf\" d=\"M30 46C17 46 11 38 11 31C22 31 30 35 30 46Z\" fill=\"#9DB8B0\"/>\n   <path class=\"leaf\" d=\"M30 34C43 34 49 26 49 19C38 19 30 23 30 34Z\" fill=\"#86A9A3\"/>\n   <path class=\"leaf\" d=\"M30 21C23 15 23 8 30 2C37 8 37 15 30 21Z\" fill=\"#6F9A94\"/>\n  </svg>\n  <div class=\"tri\" id=\"tri\"><button class=\"on\" aria-label=\"任务一\"></button><button aria-label=\"任务二\"></button><button aria-label=\"任务三\"></button></div>\n </article>\n\n <!-- 复习：每次复习，间隔拉得更长；空心点是今天 -->\n <article class=\"card b\" aria-label=\"复习：遗忘曲线，每次复习间隔更长；下方方块是今日待复习卡片数\">\n  <svg viewBox=\"0 0 150 62\">\n   <line x1=\"4\" y1=\"54\" x2=\"148\" y2=\"54\" stroke=\"#C3CBBB\" stroke-width=\"1.4\"/>\n   <path d=\"M44 46V10M82 35V10M124 26V10\" stroke=\"#C9A26E\" stroke-width=\"1.3\" stroke-dasharray=\"2 3.5\" fill=\"none\"/>\n   <g fill=\"none\" stroke-linecap=\"round\" stroke=\"#A56A4D\" stroke-width=\"2.4\">\n    <path d=\"M6 10C16 34 28 42 44 46M44 10C54 26 66 32 82 35M82 10C92 20 106 24 124 26\"/>\n    <path d=\"M124 10C130 14 140 16 148 17\" stroke-dasharray=\"1 5\" opacity=\".5\"/>\n   </g>\n   <g fill=\"#A56A4D\"><circle cx=\"6\" cy=\"10\" r=\"3.2\"/><circle cx=\"44\" cy=\"10\" r=\"3.2\"/><circle cx=\"82\" cy=\"10\" r=\"3.2\"/></g>\n   <circle cx=\"124\" cy=\"10\" r=\"3.2\" fill=\"#E1E6DD\" stroke=\"#A56A4D\" stroke-width=\"1.7\"/>\n  </svg>\n  <div class=\"rv\"><i></i><i></i><i></i><i></i><i></i><i></i></div>\n </article>\n\n <!-- 绩点：一级一级往上走，红色小三角是目标 -->\n <article class=\"card a\" aria-label=\"绩点预估 4.18，台阶是已爬升的高度，红色三角是目标 4.5\">\n  <b class=\"num\">4.18</b>\n  <div class=\"st\" id=\"st\"></div>\n </article>\n\n <!-- DDL：从今天出发的跑道，越近的方块越大越红 -->\n <article class=\"card d\" aria-label=\"截止日期跑道：左端黑点是今天，方块越近越大越红，竖线是每周刻度\">\n  <svg viewBox=\"0 0 150 100\">\n   <path d=\"M52.7 66V78M97.4 66V78M142 66V78\" stroke=\"#B3BFB8\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>\n   <line x1=\"8\" y1=\"72\" x2=\"142\" y2=\"72\" stroke=\"#B3BFB8\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>\n   <g stroke-width=\"1.8\" stroke-linecap=\"round\">\n    <path d=\"M14.4 43V72\" stroke=\"#A56A4D\"/><path d=\"M27.1 41V72\" stroke=\"#C9A26E\"/><path d=\"M65.4 39V72\" stroke=\"#9DA98F\"/><path d=\"M142 37V72\" stroke=\"#7E9E9A\"/>\n   </g>\n   <rect x=\"7.9\" y=\"30\" width=\"13\" height=\"13\" rx=\"3.6\" fill=\"#A56A4D\"/>\n   <rect x=\"21.6\" y=\"30\" width=\"11\" height=\"11\" rx=\"3.2\" fill=\"#C9A26E\"/>\n   <rect x=\"60.4\" y=\"30\" width=\"10\" height=\"9\" rx=\"3\" fill=\"#9DA98F\"/>\n   <rect x=\"137.5\" y=\"30\" width=\"9\" height=\"7\" rx=\"2.6\" fill=\"#7E9E9A\"/>\n   <circle cx=\"8\" cy=\"72\" r=\"4.6\" fill=\"#5E4B3C\"/>\n  </svg>\n </article>\n\n <!-- 课程：书脊的高度是课程，涂色的高度是进度 -->\n <article class=\"card c\" aria-label=\"课程进度：每本书脊是一门课，涂色高度是学习进度\">\n  <svg viewBox=\"0 0 140 100\" id=\"sp\"><line x1=\"2\" y1=\"90\" x2=\"138\" y2=\"90\" stroke=\"#BCAC94\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>\n </article>\n\n";const requestAnimationFrame=fn=>fn();

const $=id=>container.querySelector('[id="'+id+'"]'),mk=(p,s)=>{const e=document.createElement('i');if(s)Object.assign(e.style,s);p.appendChild(e);return e};

/* 蛇 */
const spiral=n=>{const o=[];let t=0,b=n-1,l=0,r=n-1;while(t<=b&&l<=r){for(let c=l;c<=r;c++)o.push([t,c]);t++;for(let y=t;y<=b;y++)o.push([y,r]);r--;if(t<=b){for(let c=r;c>=l;c--)o.push([b,c]);b--}if(l<=r){for(let y=b;y>=t;y--)o.push([y,l]);l++}}return o};
const path=spiral(5),cells=Array.from({length:25},()=>mk($('snake'))),LAST=24;
let head=17,timer=null;
function paint(){path.forEach(([r,c],k)=>{const e=cells[r*5+c];e.className='';e.style.borderRadius='';
 if(k===head){e.style.background='#4E3426';e.style.opacity=1;e.className='hd'}
 else if(k===LAST){e.style.background='#D6A04C';e.style.opacity=1;e.style.borderRadius='50%'}
 else if(k<head&&k>head-8){e.style.background='#A56A4D';e.style.opacity=(.35+.55*(k-(head-8))/7).toFixed(2)}
 else if(k<head){e.style.background='#A56A4D';e.style.opacity=.16}
 else{e.style.background='#A56A4D';e.style.opacity=.09}})}
paint();
/* 一天 */
const cls={8:'p',9:'p',14:'d',15:'d',19:'o',20:'o'};
for(let h=7;h<=22;h++){const k=h-7;let r=k>>2,c=k%4;if(r%2)c=3-c;
 const e=mk($('hours'),{gridRow:r+1,gridColumn:c+1});const t=cls[h];
 if(h===9){e.style.background='#A56A4D';e.className='hd'}
 else if(h<9)e.style.background=t?'rgba(136,134,176,.42)':'rgba(120,140,115,.2)';
 else e.style.background=t==='d'?'#8886B0':t==='o'?'#C9A26E':'rgba(255,255,255,.6)'}

/* 沙漏 */
const W=[7,5,3,1,1,3,5,7],hg=$('hg'),tp=[],bot=[],K=10;
W.forEach((w,r)=>{for(let j=0;j<w;j++){const e=mk(hg,{gridRow:r+1,gridColumn:(7-w)/2+j+1,background:'rgba(165,106,77,.1)'});(r<4?tp:bot).push([r,j,e])}});
tp.sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,K).forEach(x=>x[2].style.background='#C9A26E');
bot.sort((a,b)=>b[0]-a[0]||a[1]-b[1]).slice(0,16-K).forEach(x=>x[2].style.background='#A56A4D');
bot.find(x=>x[0]===4)[2].classList.add('grain');
bot.find(x=>x[0]===4)[2].style.background='#C9A26E';

/* 待办 → 叶子 */
const bs=[...$('tri').children],lv=container.querySelectorAll('.leaf');
const sync=()=>{const n=bs.filter(b=>b.classList.contains('on')).length;lv.forEach((l,i)=>l.classList.toggle('on',i<n))};
bs.forEach(b=>b.onclick=()=>{b.classList.toggle('on');sync()});sync();

/* 绩点台阶：10 级，每级 0.5 */
for(let i=0;i<10;i++){const f=Math.min(Math.max(4.18/.5-i,0),1);
 mk($('st'),{height:(32+i*7.5)+'%',background:f>=1?'#7E9E9A':f>0?`linear-gradient(90deg,#7E9E9A ${f*100}%,rgba(126,158,154,.22) ${f*100}%)`:'rgba(126,158,154,.22)'})}

/* 书脊 */
const NS='http://www.w3.org/2000/svg',sp=$('sp');
[[8,72,40,'#8886B0'],[28,58,30,'#C9A26E'],[48,78,62,'#A56A4D'],[68,64,18,'#9DA98F'],[88,52,44,'#7E9E9A'],[108,52,12,'#8886B0']].forEach(([x,h,f,c],i)=>{
 const g=document.createElementNS(NS,'g');if(i===5)g.setAttribute('transform','rotate(15 108 90)');
 const R=(y,hh,o)=>{const r=document.createElementNS(NS,'rect');r.setAttribute('x',x);r.setAttribute('y',y);r.setAttribute('width',15);r.setAttribute('height',hh);r.setAttribute('rx',3.4);r.setAttribute('fill',c);if(o)r.setAttribute('opacity',o);g.appendChild(r)};
 const ff=Math.min(f,h);R(88-h,h,.2);R(88-ff,ff);sp.appendChild(g)});

for(const n of container.querySelectorAll('*')){n.onclick=null;n.onkeydown=null;n.removeAttribute('tabindex');n.removeAttribute('role');if(n.id){n.dataset.ref=n.id;n.removeAttribute('id');}}return Array.from(container.children).filter(n=>n.classList.contains('card'));}
function build_v4(){const container=document.createElement('div');container.innerHTML="\n\n <!-- 连胜：蛇每天长一节，苹果是明天 -->\n <article class=\"card d\" aria-label=\"连续学习：蛇每天长一节，金苹果是明天\">\n  <div class=\"g\" id=\"streak\"></div>\n </article>\n\n <!-- 三环：专注、待办、复习 -->\n <article class=\"card a\" aria-label=\"今日三环：陶色专注、青色待办、赭色复习\">\n  <svg viewBox=\"0 0 100 100\" id=\"rg\"><circle cx=\"50\" cy=\"50\" r=\"4.2\" fill=\"#5E4B3C\"/></svg>\n </article>\n\n <!-- 多米诺：一块一门考试，轻点推倒下一块 -->\n <article class=\"card c tap\" id=\"dmc\" aria-label=\"考试多米诺：每块是一门考试，倒下的是考完的，轻点推倒下一块\">\n  <svg viewBox=\"0 0 150 100\" id=\"dm\"><line x1=\"2\" y1=\"89\" x2=\"148\" y2=\"89\" stroke=\"#BCAC94\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n   <g fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\">\n    <path stroke=\"#9DA98F\" d=\"M12 32a5 5 0 0 1 0-10a7 7 0 0 1 13-2a6 6 0 0 1 9 5a4.5 4.5 0 0 1 0 7z\"/>\n    <path stroke=\"#8886B0\" d=\"M112 20L140 8L131 34L123 25ZM140 8L123 25\"/>\n    <path stroke=\"#C9A26E\" stroke-dasharray=\"1.5 4.5\" d=\"M50 38C70 40 92 32 108 22\"/>\n    <path stroke=\"#BCAC94\" stroke-width=\"1.4\" d=\"M12 95h7M32 95h3M56 95h9M82 95h4M106 95h9M130 95h6\"/>\n   </g>\n   <path fill=\"#C9A26E\" fill-opacity=\".85\" d=\"M84 6Q84 12 90 12Q84 12 84 18Q84 12 78 12Q84 12 84 6Z\"/>\n  </svg>\n </article>\n\n <!-- 四象限：越靠右上越要紧，圆点越大越费时 -->\n <article class=\"card b\" aria-label=\"优先级四象限：越靠右上越急且重要，圆点越大越费时间\">\n  <svg viewBox=\"0 0 100 100\">\n   <rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" rx=\"9\" fill=\"#C9A26E\" fill-opacity=\".2\"/>\n   <rect x=\"52\" y=\"0\" width=\"48\" height=\"48\" rx=\"9\" fill=\"#A56A4D\" fill-opacity=\".2\"/>\n   <rect x=\"0\" y=\"52\" width=\"48\" height=\"48\" rx=\"9\" fill=\"#5E4B3C\" fill-opacity=\".05\"/>\n   <rect x=\"52\" y=\"52\" width=\"48\" height=\"48\" rx=\"9\" fill=\"#9DA98F\" fill-opacity=\".3\"/>\n   <circle cx=\"76\" cy=\"22\" r=\"9\" fill=\"#A56A4D\"/><circle cx=\"62\" cy=\"38\" r=\"5.5\" fill=\"#8886B0\"/>\n   <circle cx=\"24\" cy=\"28\" r=\"7\" fill=\"#C9A26E\"/><circle cx=\"80\" cy=\"74\" r=\"4.5\" fill=\"#9DA98F\"/><circle cx=\"26\" cy=\"76\" r=\"5.5\" fill=\"#7E9E9A\"/>\n  </svg>\n </article>\n\n <!-- 周积木：近七天，一块一小时，颜色是科目，虚线块是今天下一块 -->\n <article class=\"card a\" aria-label=\"近七天学习积木：一块一小时，颜色是科目，虚线是今天的下一块\">\n  <div class=\"g\" id=\"wk\"></div>\n </article>\n\n <!-- 月相：中间是昨夜睡眠，圆点是一周的夜晚 -->\n <article class=\"card d\" aria-label=\"睡眠：月亮越圆睡得越足，周围七点是最近七夜，外圈是今晚\">\n  <svg viewBox=\"0 0 100 100\" id=\"mn\">\n   <circle cx=\"50\" cy=\"50\" r=\"25\" fill=\"#8886B0\" fill-opacity=\".2\"/>\n   <path transform=\"translate(50 50) rotate(-20)\" d=\"M0 -25A25 25 0 0 1 0 25A10 25 0 0 1 0 -25Z\" fill=\"#8886B0\"/>\n  </svg>\n </article>\n\n <!-- 掌握度：每格一章，越深越熟，红点是还没碰的，轻点加深 -->\n <article class=\"card b\" aria-label=\"章节掌握度：每格一章，越深越熟，红点是还没学的，轻点加深\">\n  <div class=\"g\" id=\"mz\"></div>\n </article>\n\n <!-- 闪卡：轻点翻到下一张 -->\n <article class=\"card c tap\" aria-label=\"闪卡：轻点，最上面的一张翻到最后\">\n  <svg class=\"dd\" style=\"left:14px;top:14px;width:21cqw\" viewBox=\"0 0 30 30\" fill=\"none\" stroke=\"#C9A26E\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 4a7.5 7.5 0 0 0-4.5 13.5v3h9v-3A7.5 7.5 0 0 0 15 4zM11.5 24h7M12.5 27.5h5M3 10l2.2 1.2M27 10l-2.2 1.2M1.5 17.5H4.5M28.5 17.5H25.5\"/></svg>\n  <svg class=\"dd\" style=\"right:16px;top:16px;width:12cqw\" viewBox=\"0 0 30 30\"><path fill=\"#8886B0\" fill-opacity=\".8\" d=\"M15 3Q15 15 27 15Q15 15 15 27Q15 15 3 15Q15 15 15 3Z\"/></svg>\n  <div class=\"fan\" id=\"fan\"></div>\n </article>\n\n <!-- 登山：一天一级台阶，小方块是你，旗是考试 -->\n <article class=\"card c\" aria-label=\"期末登山：一天一级台阶，小方块是你，旗子是考试，三段是三周\">\n  <svg viewBox=\"0 0 150 100\" id=\"cb\">\n   <g fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\">\n    <g stroke=\"#C9A26E\"><circle cx=\"24\" cy=\"20\" r=\"7\"/><path d=\"M24 6.5v3M24 30.5v3M10.5 20h3M34.5 20h3M14.5 10.5l2 2M31.5 27.5l2 2M33.5 10.5l-2 2M16.5 27.5l-2 2\"/></g>\n    <path stroke=\"#9DA98F\" d=\"M5 80L20 56L29 68L44 42L59 72\"/><path stroke=\"#9DA98F\" d=\"M39 50l5 3.5l4-3\"/>\n    <path stroke=\"#B3A58E\" d=\"M52 40a6 6 0 0 1-1-11.9a9 9 0 0 1 17-2.6a7.5 7.5 0 0 1 12.6 4.5a5 5 0 0 1-1.6 10z\"/>\n    <path stroke=\"#6B5A4A\" stroke-opacity=\".55\" d=\"M96 13q3-4 6 0q3-4 6 0M112 22q2.5-3 5 0q2.5-3 5 0\"/>\n   </g>\n  </svg>\n </article>\n\n <!-- 拼图：大作业，漂着的那块是下一步 -->\n <article class=\"card d\" aria-label=\"大作业拼图：青色是完成的部分，赭色悬着的是下一步，虚线是还没做的\">\n  <svg viewBox=\"0 0 100 100\" id=\"pz\"></svg>\n </article>\n\n";const requestAnimationFrame=fn=>fn();

const $=id=>container.querySelector('[id="'+id+'"]');
const E=(t,a,p)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const mk=(p,s,c)=>{const e=document.createElement('i');s&&Object.assign(e.style,s);c&&(e.className=c);p.appendChild(e);return e};

/* 连胜蛇：蛇形走位，12 天 + 苹果 */
const sk=$('streak'),cs=Array.from({length:25},()=>mk(sk));
for(let k=0;k<25;k++){let r=k/5|0,c=k%5;if(r%2)c=4-c;const e=cs[r*5+c];
 if(k===12){e.className='hd';e.style.background='#3F5B57'}
 else if(k===13)Object.assign(e.style,{background:'#D6A04C',borderRadius:'50%',transform:'scale(.8)'});
 else if(k<12){e.style.background='#7E9E9A';e.style.opacity=(.25+.65*k/11).toFixed(2)}
 else e.style.background='rgba(94,128,124,.1)'}

/* 三环 */
const rg=$('rg');
[[40,'#A56A4D',.72],[30,'#7E9E9A',.6],[20,'#C9A26E',.45]].forEach(([r,c,f],i)=>{const C=2*Math.PI*r;
 E('circle',{cx:50,cy:50,r,fill:'none',stroke:c,'stroke-opacity':.2,'stroke-width':7},rg);
 const a=E('circle',{cx:50,cy:50,r,fill:'none',stroke:c,'stroke-width':7,'stroke-linecap':'round','stroke-dasharray':C,'stroke-dashoffset':C,transform:'rotate(-90 50 50)'},rg);
 a.style.transition='stroke-dashoffset 1.4s cubic-bezier(.3,.8,.3,1) '+i*.15+'s';
 requestAnimationFrame(()=>requestAnimationFrame(()=>a.style.strokeDashoffset=C*(1-f)))});

/* 多米诺 */
const dm=$('dm'),dc=['#8886B0','#C9A26E','#A56A4D','#9DA98F','#7E9E9A','#8886B0'],ds=[];let fall=2;
dc.forEach((c,i)=>{const g=E('g',{},dm);E('rect',{x:8+i*23,y:44,width:13,height:44,rx:3.5,fill:c},g);
 E('circle',{cx:14.5+i*23,cy:60,r:1.9,fill:'#fff','fill-opacity':.7},g);E('circle',{cx:14.5+i*23,cy:72,r:1.9,fill:'#fff','fill-opacity':.7},g);
 g.style.transformOrigin=(21+i*23)+'px 88px';ds.push(g)});
const tip=()=>ds.forEach((g,i)=>g.style.transform=`rotate(${i<fall?(76+i*1.5):0}deg)`);
$('dmc').onclick=()=>{fall=fall>=6?0:fall+1;tip()};tip();

/* 周积木 */
const wk=$('wk'),H=[3,2,5,1,6,4,2],pc=['#8886B0','#C9A26E','#A56A4D','#9DA98F','#7E9E9A'];
for(let r=0;r<7;r++)for(let d=0;d<7;d++){const h=6-r;let s,c='';
 if(h<H[d])s={background:pc[(d*2+h)%5]};
 else if(d===6&&h===H[d]){s={border:'1.6px dashed #A56A4D',background:'transparent'};c='ghost'}
 else s={background:h===0?'rgba(165,106,77,.15)':'rgba(165,106,77,.06)'};
 mk(wk,s,c)}

/* 月相 + 七夜 */
const mn=$('mn');[1,1,0,1,1,0,2].forEach((v,i)=>{const a=(-90+i*360/7)*Math.PI/180,x=50+43*Math.cos(a),y=50+43*Math.sin(a);
 v===2?E('circle',{cx:x,cy:y,r:4.6,fill:'none',stroke:'#A56A4D','stroke-width':1.8},mn):E('circle',{cx:x,cy:y,r:3.8,fill:'#8886B0','fill-opacity':v?1:.28},mn)});

/* 掌握度 */
const L=[4,3,3,2,3,4,1,2,2,1,0,3,4,2,1,0],mz=$('mz');
const pt=(e,l)=>{e.style.background=l===4?'#6F9A94':`rgba(126,158,154,${(.14+.2*l).toFixed(2)})`;e.dataset.l=l};
L.forEach((l,i)=>{const e=mk(mz);pt(e,l);e.onclick=()=>{L[i]=(L[i]+1)%5;pt(e,L[i])}});

/* 闪卡扇 */
const fan=$('fan'),fi=['#8886B0','#C9A26E','#A56A4D','#9DA98F','#7E9E9A'].map(c=>mk(fan,{background:c}));let ord=[0,1,2,3,4];
const lay=()=>ord.forEach((ci,p)=>{fi[ci].style.transform=`rotate(${(p-2)*15}deg)`;fi[ci].style.zIndex=p});
fan.parentNode.onclick=()=>{ord.unshift(ord.pop());lay()};lay();

/* 登山 */
const cb=$('cb');
for(let k=0;k<21;k++){const h=(k+1)*3,w=k/7|0;
 E('rect',{x:8+k*6,y:90-h,width:5.2,height:h,rx:1.2,fill:k<=5?'#A56A4D':'#7E9E9A','fill-opacity':k<=5?(.4+.1*k).toFixed(2):[.2,.3,.42][w]},cb)}
E('rect',{x:37.5,y:64,width:7,height:7,rx:2,fill:'#4E3426'},cb);
E('circle',{cx:39.8,cy:66.4,r:.9,fill:'#FAF8F5'},cb);E('circle',{cx:42.6,cy:66.4,r:.9,fill:'#FAF8F5'},cb);
E('path',{d:'M130.5 27V6',stroke:'#6B5A4A','stroke-width':1.6,'stroke-linecap':'round'},cb);
E('path',{d:'M130.5 6L145 11.5L130.5 17Z',fill:'#C9A26E'},cb);

/* 拼图 */
const pz=$('pz');
for(let i=0;i<9;i++){const x=5+(i%3)*31,y=5+(i/3|0)*31;
 if(i<5)E('rect',{x,y,width:28,height:28,rx:6,fill:'#7E9E9A','fill-opacity':[.3,.45,.6,.5,.75][i]},pz);
 else E('rect',{x,y,width:28,height:28,rx:6,fill:'none',stroke:'#7E9E9A','stroke-opacity':.5,'stroke-width':1.5,'stroke-dasharray':'3 4'},pz)}
E('rect',{x:70,y:30,width:28,height:28,rx:6,fill:'#C9A26E',stroke:'#DEE6E2','stroke-width':2.5,transform:'rotate(9 84 44)'},pz);
const star=(p,x,y,s,c)=>E('path',{d:`M${x} ${y-s}Q${x} ${y} ${x+s} ${y}Q${x} ${y} ${x} ${y+s}Q${x} ${y} ${x-s} ${y}Q${x} ${y} ${x} ${y-s}Z`,fill:c,'fill-opacity':.85},p);
[[9,10,5.5],[91,91,4.5],[91,12,3]].forEach(([x,y,s])=>star(rg,x,y,s,'#C9A26E'));
[[9,12,5],[91,89,5],[91,11,3],[10,89,3]].forEach(([x,y,s])=>star(mn,x,y,s,'#8886B0'));

for(const n of container.querySelectorAll('*')){n.onclick=null;n.onkeydown=null;n.removeAttribute('tabindex');n.removeAttribute('role');if(n.id){n.dataset.ref=n.id;n.removeAttribute('id');}}return Array.from(container.children).filter(n=>n.classList.contains('card'));}
templates.v2=build_v2();templates.v4=build_v4();
const ids={v2:['focus','agenda','hourglass','plant','curve','stairs','deadline','books'],v4:['streak','rings','domino','quadrant','week','moons','mosaic','fan','mountain','puzzle']};
window.FolioStudySingleReference=Object.freeze({create(id,owner=document){install(owner);const version=ids.v2.includes(id)?'v2':'v4',index=ids[version].indexOf(id);if(index<0)throw Error('Unknown reference');const root=owner.createElement('div');root.className='study-single-ref study-source-'+version;const card=templates[version][index].cloneNode(true);card.style.background='transparent';root.append(card);root.inert=true;root.setAttribute('aria-hidden','true');return root;}});
})();
