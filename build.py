from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
import urllib.request, json, re, sys, hashlib

ROOT=Path(__file__).resolve().parent
DIST=ROOT/'dist';CACHE=ROOT/'referencia';DIST.mkdir(exist_ok=True);CACHE.mkdir(exist_ok=True)
CONFIG=json.loads((ROOT/'config.json').read_text(encoding='utf-8'))
ORIGIN='https://escoladeafiliados.online'
CHECKOUT=CONFIG['checkoutUrl']
assert urlparse(CHECKOUT).hostname=='pay.kiwify.com.br' and 'afid=' in CHECKOUT
def download(url):
    filename=CACHE/(hashlib.sha256(url.encode()).hexdigest()+Path(urlparse(url).path).suffix)
    if not filename.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'})
        with urllib.request.urlopen(request,timeout=35) as response: data=response.read()
        filename.write_bytes(data)
    return filename.read_bytes()
html=(CACHE/'pagina-original.html').read_text(encoding='utf-8') if (CACHE/'pagina-original.html').exists() else download(ORIGIN+'/').decode('utf-8')
(CACHE/'pagina-original.html').write_text(html,encoding='utf-8')
class Assets(HTMLParser):
    def __init__(self):super().__init__();self.urls=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='img' and a.get('src'):self.urls.append(a['src'])
        if tag=='link' and a.get('rel') in ['stylesheet','modulepreload','icon']:self.urls.append(a['href'])
        if tag=='meta' and a.get('property')=='og:image':self.urls.append(a['content'])
assets=Assets();assets.feed(html)
mapping={};payloads={};font_url=None
for url in dict.fromkeys(assets.urls):
    absolute=urljoin(ORIGIN,url)
    if 'fonts.googleapis.com' in absolute:font_url=absolute;continue
    if absolute.startswith(ORIGIN):target=urlparse(absolute).path
    elif 'i.ytimg.com' in absolute:target='/assets/video-poster.jpg'
    else:target='/assets/capa-social'+(Path(urlparse(absolute).path).suffix or '.png')
    mapping[url]=target;mapping[absolute]=target;payloads[absolute]=target
for url in ['https://i.ytimg.com/vi/wtEw2U25AR4/hqdefault.jpg']:
    mapping[url]='/assets/video-poster.jpg';payloads[url]='/assets/video-poster.jpg'
def save_asset(pair):
    url,target=pair;data=download(url);dest=DIST/target.lstrip('/');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);return target
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(save_asset,payloads.items()))

# Keep the original rendered page and its production components. Only ownership,
# asset delivery and mobile behavior are changed below.
jsfiles=[DIST/'assets/index-COZobF80.js',DIST/'assets/routes-BXh-53cI.js']
if not all(p.exists() for p in jsfiles):raise RuntimeError('A publicação original mudou. Revise os nomes dos módulos antes de reconstruir.')

# Local fonts avoid a Google Fonts CSS round trip while keeping the same families.
if font_url:
    css=download(font_url).decode('utf-8')
    font_links=list(dict.fromkeys(re.findall(r'url\((https://[^)]+)\)',css)))
    for url in font_links:
        target='/assets/fonts/'+Path(urlparse(url).path).name
        save_asset((url,target));css=css.replace(url,target)
    (DIST/'assets/fonts/fonts.css').write_text(css,encoding='utf-8')
    mapping[font_url]='/assets/fonts/fonts.css'

# Re-encode existing proof images without generating, retouching or changing them.
sys.path.insert(0,str(ROOT.parent/'.tools/image-opt'))
from PIL import Image
image_stats=[]
for url,target in list(payloads.items()):
    if '/__l5e/assets-v1/' not in target:continue
    original=DIST/target.lstrip('/');image=Image.open(original).convert('RGB')
    stem=Path(target).stem;outdir=DIST/'assets/provas';outdir.mkdir(exist_ok=True)
    for width,suffix in [(960,''),(480,'-480')]:
        resized=image.copy();resized.thumbnail((width,10000),Image.Resampling.LANCZOS)
        resized.save(outdir/(stem+suffix+'.webp'),'WEBP',quality=88,method=6)
    optimized='/assets/provas/'+stem+'.webp'
    mapping[target]=optimized;mapping[url]=optimized
    image_stats.append({'file':stem,'originalBytes':original.stat().st_size,'webp960Bytes':(outdir/(stem+'.webp')).stat().st_size,'webp480Bytes':(outdir/(stem+'-480.webp')).stat().st_size})
    # The source JPG stays in the private build cache rather than the deploy output.
    original.unlink()

def replace_assets(text):
    for old,new in sorted(mapping.items(),key=lambda p:-len(p[0])):
        if old!=new:text=text.replace(old,new).replace(old.replace('&','&amp;'),new)
    return text
html=replace_assets(html)
for file in jsfiles:file.write_text(replace_assets(file.read_text(encoding='utf-8')).replace('https://pay.kiwify.com.br/povy39E',CHECKOUT),encoding='utf-8')

main=jsfiles[0].read_text(encoding='utf-8')
main,n=re.subn(r'Ku=`!function\(f,b,e,v,n,t,s\).*?`;function qu', 'Ku=``;function qu',main,flags=re.S)
assert n==1,'Inicialização do Pixel original não localizada.'
jsfiles[0].write_text(main,encoding='utf-8')

route=jsfiles[1].read_text(encoding='utf-8')
start=route.index('function Cr(){');effect=route.index('return(0,_.useEffect)',start)
end=route.index('(0,W.jsx)(`div`,{ref:e',effect)
route=route[:effect]+'return'+route[end:]
route=route.replace('n&&!document.hidden&&e.scrollNext()','n&&!document.hidden&&!window.matchMedia(`(prefers-reduced-motion: reduce)`).matches&&e.scrollNext()')
old='src:e.src,alt:e.alt,loading:`lazy`'
new='src:e.src,srcSet:`${e.src.replace(`.webp`,`-480.webp`)} 480w, ${e.src} 960w`,sizes:`(max-width: 639px) calc(100vw - 40px), 960px`,alt:e.alt,loading:`lazy`'
assert route.count(old)==1
route=route.replace(old,new)
jsfiles[1].write_text(route,encoding='utf-8')

html=re.sub(r'<script\b[^>]*src="(?:/~flock\.js|/__l5e/events\.[^"]+)"[^>]*>.*?</script>','',html,flags=re.S)
html,n=re.subn(r'<script>!function\(f,b,e,v,n,t,s\).*?</script>','<script></script>',html,flags=re.S)
assert n==1
html=html.replace('https://pay.kiwify.com.br/povy39E',CHECKOUT.replace('&','&amp;'))
def responsive_img(match):
    tag=match.group(0);src=re.search(r'src="([^"]+\.webp)"',tag)
    if src and '/assets/provas/' in src[1]:tag=tag.replace(' loading=',f' srcset="{src[1].replace(".webp","-480.webp")} 480w, {src[1]} 960w" sizes="(max-width: 639px) calc(100vw - 40px), 960px" loading=')
    return tag
html=re.sub(r'<img\b[^>]*>',responsive_img,html)
# Additive mobile corrections; original copy, branding, section order and classes remain.
(DIST/'assets/mobile.css').write_text('@media(max-width:639px){button.rounded-full{min-inline-size:44px;min-block-size:44px}a[id^="cta-"]{touch-action:manipulation}summary{touch-action:manipulation}}\n@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}\n',encoding='utf-8')
style=DIST/'assets/styles-BoGvWR9h.css'
style.write_text(style.read_text(encoding='utf-8')+'\n'+(DIST/'assets/mobile.css').read_text(encoding='utf-8'),encoding='utf-8')
(DIST/'index.html').write_text(html,encoding='utf-8')
(ROOT/'asset-report.json').write_text(json.dumps(image_stats,indent=2),encoding='utf-8')
print(json.dumps({'checkout':CHECKOUT,'images':len(image_stats),'beforeBytes':sum(i['originalBytes'] for i in image_stats),'webp960Bytes':sum(i['webp960Bytes'] for i in image_stats),'webp480Bytes':sum(i['webp480Bytes'] for i in image_stats),'htmlBytes':len(html.encode()),'files':len(list(DIST.rglob('*')))},ensure_ascii=True))
