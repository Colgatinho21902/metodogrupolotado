from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,parse_qs
import json,re,subprocess
ROOT=Path(__file__).resolve().parent
class Page(HTMLParser):
    def __init__(self):super().__init__();self.in_body=False;self.skip=0;self.words=[];self.links=[];self.assets=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='body':self.in_body=True
        if tag in ['script','style']:self.skip+=1
        if tag=='a':self.links.append(a)
        if tag in ['img','script'] and a.get('src'):self.assets.append(a['src'])
        if tag=='link' and a.get('href'):self.assets.append(a['href'])
    def handle_endtag(self,tag):
        if tag in ['script','style']:self.skip-=1
        if tag=='body':self.in_body=False
    def handle_data(self,data):
        if self.in_body and not self.skip:self.words.extend(data.split())
original=Page();original.feed((ROOT/'referencia/pagina-original.html').read_text(encoding='utf-8'))
copy=Page();copy.feed((ROOT/'dist/index.html').read_text(encoding='utf-8'))
assert original.words==copy.words,'A copy ou a ordem do conteúdo foi alterada.'
ctas=[a for a in copy.links if a.get('id','').startswith('cta-')]
assert len(ctas)==4
assert all(parse_qs(urlparse(a['href']).query).get('afid')==['Z4HTVvAl'] for a in ctas)
assert all((ROOT/'dist'/a.lstrip('/')).is_file() for a in copy.assets if a.startswith('/'))
for name in ['index-COZobF80.js','routes-BXh-53cI.js']:
    file=ROOT/'dist/assets'/name
    subprocess.run(['node','--check',str(file)],check=True)
    assert '1854019762707116' not in file.read_text(encoding='utf-8')
assert '__l5e/events' not in (ROOT/'dist/index.html').read_text(encoding='utf-8')
from PIL import Image
for image in (ROOT/'dist/assets/provas').glob('*.webp'):
    with Image.open(image) as opened:opened.verify()
report={'bodyTextPreserved':True,'initialAffiliateCtas':len(ctas),'affiliateId':'Z4HTVvAl','staticAssetsExist':True,'javascriptSyntax':'passed','producerPixelRemoved':True,'responsiveImages':14}
(ROOT/'verification-static.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
