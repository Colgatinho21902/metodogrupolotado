"""Apply the reviewed changes to the unchanged, previously deployed static export.

The input is explicit and assertions stop on upstream changes. This does not fetch
or overwrite the producer's website. CONFIRMAR COM O PRODUTOR: use of the brand.
"""
from pathlib import Path
import re, shutil, sys, json
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent
BASE = ROOT / 'source'
assert BASE.is_dir(), 'Original export is required; never reconstruct silently.'
D = ROOT/'dist'
h = (BASE/'dist/index.html').read_text(encoding='utf-8')
m = (BASE/'dist/assets/index-COZobF80.js').read_text(encoding='utf-8')
r = (BASE/'dist/assets/routes-BXh-53cI.js').read_text(encoding='utf-8')

# One external script shared by SSR and the hydrated head; no duplicated inline base.
h,n = re.subn(r'<script>\(function \(\) \{.*?</script>', '<script src="/assets/tracking.js" defer=""></script>', h, count=1, flags=re.S)
assert n == 1
m,n = re.subn(r',Ku=.*?;function qu\(e\)', ',Ku=``;function qu(e)', m, count=1, flags=re.S)
assert n == 1
assert m.count('scripts:[{children:Ku}]') == 1
m=m.replace('scripts:[{children:Ku}]','scripts:[{src:`/assets/tracking.js`,defer:!0}]')
for needle in ['{rel:`preconnect`,href:`https://fonts.googleapis.com`},','{rel:`preconnect`,href:`https://fonts.gstatic.com`,crossOrigin:`anonymous`},','{rel:`preconnect`,href:`https://i.ytimg.com`},','{rel:`dns-prefetch`,href:`https://www.youtube.com`},']:
 assert m.count(needle)==1
 m=m.replace(needle,'')
h=re.sub(r'<link rel="(?:preconnect|dns-prefetch)"[^>]+/>','',h)
# Do not compete with the poster/CSS for bandwidth by preloading hydration bundles.
# The async module remains in HTML; its route is loaded normally when needed.
h=re.sub(r'<link rel="modulepreload"[^>]+/>','',h)
h=h.replace('src="/assets/index-COZobF80.js"','src="/assets/index-COZobF80.js" fetchpriority="low"')
h=h.replace('type:"module",async:!0,src:', 'type:"module",async:!0,fetchPriority:"low",src:')
a=m.index('function Qu(e,t){'); b=m.index('var $u=',a)
m=m[:a]+'function Qu(e,t){return typeof window<`u`&&window.edaCheckout?window.edaCheckout.url():e}'+m[b:]

# All five purchase placements share this component; normal links remain usable
# if measurement is blocked or the optional script fails.
a=r.index('function br('); b=r.index('function xr(',a)
r=r[:a]+'''function br({id:e,label:t=`Quero fazer parte da Escola`}){(0,_.useEffect)(()=>{window.edaCheckout?.refresh()},[]);return(0,W.jsx)(nn,{asChild:!0,variant:`conversion`,size:`conversion`,className:`group h-13 w-full whitespace-normal text-center text-sm font-bold uppercase leading-tight shadow-none hover:shadow-none sm:h-16 sm:text-base`,children:(0,W.jsxs)(`a`,{id:e,href:r,rel:`noreferrer`,children:[t,(0,W.jsx)(x,{className:`size-5 transition-transform group-hover:translate-x-1`,"aria-hidden":`true`})]})})}'''+r[b:]
h=h.replace(' target="_blank"','')

# Mount privacy controls after hydration, outside React-owned children.
needle='let e=Array.from(document.querySelectorAll(`main a[id^="cta-"]`))'
assert r.count(needle)==1
r=r.replace(needle,'window.edaPrivacy?.mount();'+needle)

# Unconfirmed proofs are not displayed. Keep source records for later review.
# CONFIRMAR ORIGEM: every file below requires real provenance and authorization.
proofs=['prova01','prova-02-vendas','prova-03-depoimento','prova-04-promocoes','prova-05-custo-lead','prova-06-mentoria','prova-07-entradas']
for name in proofs:
 r=r.replace('src:`/assets/provas/'+name+'.webp`','/* CONFIRMAR ORIGEM: '+name+' — não exibir sem autorização */src:`/assets/provas/'+name+'.webp`')
needle='(0,W.jsx)(Sr,{title:`Alunos colocando em prática`}),(0,W.jsx)(`div`,{className:`mx-auto max-w-xl`,children:(0,W.jsx)(wr,{})}),'
assert r.count(needle)==1
r=r.replace(needle,'/* CONFIRMAR ORIGEM: provas suspensas até validação pelo afiliado/produtor. */')
a=h.index('<section',h.rfind('</section>',0,h.index('Alunos colocando em prática')))
b=h.index('</section>',a)+len('</section>')
assert 'Alunos colocando em prática' in h[a:b]
disclaimer='Os resultados variam conforme experiência, execução, ofertas, público e investimento. Não há garantia de resultados específicos.'
h=h[:a]+'<section class="mt-8 sm:mt-16"><!-- CONFIRMAR ORIGEM: sete imagens suspensas; nenhuma autorizada foi informada. --><p class="mt-4 text-xs leading-relaxed text-muted-foreground">'+disclaimer+'</p></section>'+h[b:]

notice='Página de divulgação de afiliado independente. Podemos receber comissão pela compra realizada pelo nosso link. A compra é feita no checkout da Kiwify, em nome do produtor.'
old='(0,W.jsxs)(`footer`,{className:`border-t border-edge py-8 text-center text-xs text-muted-foreground`,children:[`© `,new Date().getFullYear(),` `,o]})'
new='''/* CONFIRMAR COM O PRODUTOR: autorização de uso da marca Escola de Afiliados Elite. */(0,W.jsxs)(`footer`,{className:`eda-footer border-t border-edge py-8 text-center text-xs text-muted-foreground`,children:[(0,W.jsx)(`p`,{children:NOTICE}),(0,W.jsxs)(`nav`,{"aria-label":`Informações legais`,children:[(0,W.jsx)(`a`,{href:`/privacidade.html`,children:`Política de Privacidade`}),(0,W.jsx)(`a`,{href:`/termos.html`,children:`Termos de Uso`}),(0,W.jsx)(`button`,{type:`button`,onClick:()=>window.edaPrivacy?.open(),children:`Preferências de cookies`})]})]})'''.replace('NOTICE','`'+notice+'`')
assert r.count(old)==1
r=r.replace(old,new)
h,n=re.subn(r'<footer\b.*?</footer>','<!-- CONFIRMAR COM O PRODUTOR: autorização de uso da marca. --><footer class="eda-footer border-t border-edge py-8 text-center text-xs text-muted-foreground"><p>'+notice+'</p><nav aria-label="Informações legais"><a href="/privacidade.html">Política de Privacidade</a><a href="/termos.html">Termos de Uso</a><button type="button">Preferências de cookies</button></nav></footer>',h,count=1,flags=re.S)
assert n==1

# Convert the existing, unchanged poster; no generated/replaced promotional image.
sys.path.insert(0,str(ROOT.parent/'.tools/image-opt'))
from PIL import Image
with Image.open(BASE/'dist/assets/video-poster.jpg') as im: im.convert('RGB').save(D/'assets/video-poster.webp','WEBP',quality=75,method=6)
for old,new in [('video-poster.jpg','video-poster.webp')]:
 h=h.replace(old,new); r=r.replace(old,new); m=m.replace(old,new)

css=(BASE/'dist/assets/styles-BoGvWR9h.css').read_text(encoding='utf-8')
css+='''
/* Affiliate audit: tap targets, safe areas and non-overlapping privacy controls. */
a[id^="cta-"]{min-height:48px;overflow-wrap:anywhere}
.eda-footer{padding-inline:20px}.eda-footer>p{max-width:680px;margin:0 auto;line-height:1.7}
.eda-footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 20px;margin-top:12px}
.eda-footer a,.eda-footer button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;text-decoration:underline}
#eda-cookie-dialog{color:#f5f7ff;background:#101a2e;border:1px solid #566079;border-radius:16px;padding:24px;width:min(440px,calc(100% - 32px));max-height:calc(100dvh - 32px);overflow:auto;margin:auto;box-shadow:0 16px 60px #0008}
#eda-cookie-dialog::backdrop{background:#030817a8}#eda-cookie-dialog h2{font-size:20px;font-weight:700;margin-bottom:12px}
#eda-cookie-dialog p{font-size:15px;line-height:1.6;margin-bottom:12px}#eda-cookie-dialog a{text-decoration:underline}
.eda-cookie-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}.eda-cookie-actions button{min-height:48px;border:1px solid #718096;border-radius:8px;padding:10px;font-weight:700}
.eda-cookie-actions button[data-choice="accepted"]{background:#087d3c;color:#fff}
@media(max-width:359px){.eda-cookie-actions{grid-template-columns:1fr}}
'''
# Inline the existing stylesheet and font declarations so the first render does
# not wait for two additional CSS requests on 4G. Keep the hydrated head identical.
critical=css+'\n'+(D/'assets/fonts/fonts.css').read_text(encoding='utf-8')
assert '</style' not in critical
h=re.sub(r'<link rel="stylesheet"[^>]+/>','',h)
h=h.replace('</head>','<style data-eda-critical="">'+critical+'</style></head>')
for needle in ['{rel:`stylesheet`,href:Fu},','{rel:`stylesheet`,href:`/assets/fonts/fonts.css`},']:
 assert m.count(needle)==1
 m=m.replace(needle,'')
needle='(0,V.jsx)(`head`,{children:(0,V.jsx)(jl,{})})'
assert m.count(needle)==1
m=m.replace(needle,'(0,V.jsxs)(`head`,{children:[(0,V.jsx)(jl,{}),(0,V.jsx)(`style`,{"data-eda-critical":``,children:'+json.dumps(critical,ensure_ascii=False)+'})]})')
(D/'index.html').write_text(h,encoding='utf-8')
(D/'assets/index-COZobF80.js').write_text(m,encoding='utf-8')
(D/'assets/routes-BXh-53cI.js').write_text(r,encoding='utf-8')
(D/'assets/styles-BoGvWR9h.css').write_text(css,encoding='utf-8')
shutil.copyfile(ROOT/'tracking/browser.js',D/'assets/tracking.js')
print('Audit patch applied; original source and production unchanged.')
