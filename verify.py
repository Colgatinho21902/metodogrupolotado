from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,parse_qs
import subprocess,re
R=Path(__file__).resolve().parent
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.assets=[];self.text=[];self.skip=0
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t in ['script','style']:self.skip+=1
  if t=='a':self.links.append(a)
  if t in ['img','script'] and a.get('src'):self.assets.append(a['src'])
  if t=='link' and a.get('href'):self.assets.append(a['href'])
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip-=1
 def handle_data(self,d):
  if not self.skip:self.text.extend(d.split())
def strip_changed(h):
 h=re.sub(r'<footer\b.*?</footer>','',h,flags=re.S)
 a=h.find('Alunos colocando em prática')
 if a>=0:
  start=h.rfind('<section',0,a);end=h.index('</section>',a)+10
  warning='Os resultados variam conforme experiência, execução, ofertas, público e investimento. Não há garantia de resultados específicos.'
  h=h[:start]+'<p>'+warning+'</p>'+h[end:]
 return h
before=Page();after=Page()
before.feed(strip_changed((R/'source/dist/index.html').read_text(encoding='utf-8')))
h=(R/'dist/index.html').read_text(encoding='utf-8');after.feed(strip_changed(h))
assert before.text==after.text,'Unapproved sales copy change'
ctas=[a for a in after.links if a.get('id','').startswith('cta-')]
assert len(ctas)==4
assert all(a['href']=='https://pay.kiwify.com.br/povy39E?afid=Z4HTVvAl' for a in ctas)
assert h.count('src="/assets/tracking.js"')==1 and 'fbevents.js' not in h
assert '/assets/provas/' not in h
assert all((R/'dist'/a.lstrip('/')).exists() for a in after.assets if a.startswith('/'))
assert all((R/'dist'/p).exists() for p in ['privacidade.html','termos.html'])
for p in ['dist/assets/index-COZobF80.js','dist/assets/routes-BXh-53cI.js','dist/assets/tracking.js','api/meta.js']:
 subprocess.run(['node','--check',str(R/p)],check=True)
assert (R/'tracking/browser.js').read_bytes()==(R/'dist/assets/tracking.js').read_bytes()
print('Passed: sales copy preserved; exact affiliate links; one tracker; no unconfirmed proof images; legal pages and assets exist; JS syntax valid.')
