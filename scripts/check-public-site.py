from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,urljoin
from collections import Counter,defaultdict
import xml.etree.ElementTree as ET
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];BASE='https://www.goldenbrickc.com/'
files=subprocess.check_output(['rg','--files','-g','*.html','-g','!client/**','-g','!staff/**','-g','!estimate/**','-g','!node_modules/**','-g','!tmp/**','-g','!output/**','-g','!functions/**'],cwd=ROOT,text=True).splitlines()
class Doc(HTMLParser):
 def __init__(self,s):
  super().__init__(convert_charrefs=True);self.ids=[];self.h1=[];self.title=[];self.meta=[];self.canon=[];self.refs=[];self.text=[];self.paras=[];self.schema=[];self.depth=0;self.ignore=0;self.capture=[];self.block=[];self.ld=False;self.ldtext=[];self.feed(s)
 def handle_starttag(self,t,a):
  d=dict(a);line=self.getpos()[0]
  if d.get('id'):self.ids.append(d['id'])
  if t=='main':self.depth+=1
  if t in ['script','style','nav','footer']:self.ignore+=1
  if t in ['h1','title']:self.capture.append(t)
  if t=='p' and self.depth and not self.ignore:self.block=[]
  if t=='meta':self.meta.append(d)
  if t=='link' and d.get('rel')=='canonical':self.canon.append(d.get('href',''))
  if t in ['a','img','script','link','source']:
   k='href' if t in ['a','link'] else 'src'
   if d.get(k):self.refs.append((t,k,d[k],line))
   if d.get('srcset'):
    for part in d['srcset'].split(','):self.refs.append((t,'srcset',part.strip().split()[0],line))
  if t=='img' and 'alt' not in d:self.refs.append(('img','missing-alt',d.get('src',''),line))
  if t=='script' and d.get('type')=='application/ld+json':self.ld=True;self.ldtext=[]
 def handle_endtag(self,t):
  if t in ['h1','title'] and t in self.capture:self.capture.remove(t)
  if t=='main':self.depth-=1
  if t in ['script','style','nav','footer']:self.ignore=max(0,self.ignore-1)
  if t=='p' and self.depth and not self.ignore:
   v=' '.join(' '.join(self.block).split());self.paras.append(v);self.block=[]
  if t=='script' and self.ld:self.schema.append(''.join(self.ldtext));self.ld=False
 def handle_data(self,x):
  if self.ld:self.ldtext.append(x)
  if 'h1' in self.capture:self.h1.append(x.strip())
  if 'title' in self.capture:self.title.append(x.strip())
  if self.depth and not self.ignore:self.text.append(x.strip());self.block.append(x.strip())
docs={f:Doc((ROOT/f).read_text()) for f in files};sitemap=[x.text for x in ET.parse(ROOT/'sitemap.xml').getroot().findall('{*}url/{*}loc')]
def relpath(url,src='index.html'):
 u=urlsplit(url)
 if u.scheme and u.scheme not in ('http','https'):return None
 if u.netloc and u.netloc not in ('www.goldenbrickc.com','goldenbrickc.com'):return None
 if not u.path:return src
 p=Path(unquote(u.path).lstrip('/')) if u.path.startswith('/') else Path(src).parent/unquote(u.path)
 if str(p)=='.':p=Path('index.html')
 elif u.path.endswith('/') or (ROOT/p).is_dir():p=p/'index.html'
 return str(p)
issues=[];titles=defaultdict(list);descs=defaultdict(list);canons=defaultdict(list);texts={};flags=[];paragraphs=defaultdict(list)
for f,d in docs.items():
 s=(ROOT/f).read_text();texts[f]=' '.join(x for x in d.text if x)
 desc=[m['content'] for m in d.meta if m.get('name')=='description' and 'content'in m];robots=[m.get('content','') for m in d.meta if m.get('name')=='robots']
 title=' '.join(d.title);titles[title].append(f)
 for desc1 in desc:descs[desc1].append(f)
 for c in d.canon:canons[c].append(f)
 if len(re.findall(r'<h1(?:\s|>)',s))!=1:issues.append([f,'H1 count',len(re.findall(r'<h1(?:\s|>)',s))])
 if not title:issues.append([f,'missing title'])
 if len(desc)!=1:issues.append([f,'description count',len(desc)])
 if len(d.canon)!=1 and f!='404.html':issues.append([f,'canonical count',len(d.canon)])
 for i,n in Counter(d.ids).items():
  if n>1:issues.append([f,'duplicate ID',i,n])
 for c in d.canon:
  if relpath(c)!=f:issues.append([f,'canonical points elsewhere',c])
  if f!='404.html' and c not in sitemap:issues.append([f,'canonical absent sitemap',c])
 if f!='404.html' and any('noindex'in r for r in robots):issues.append([f,'public noindex',robots])
 for t,k,url,line in d.refs:
  if k=='missing-alt':issues.append([f,'missing alt',url,line]);continue
  p=relpath(url,f)
  if not p:continue
  if p in ('client/login','client/login/index.html','staff/login','staff/login/index.html','estimate/index.html'):continue
  if not (ROOT/p).exists():issues.append([f,'missing local '+t,url,line]);continue
  frag=unquote(urlsplit(url).fragment)
  if frag and p in docs and frag not in docs[p].ids:issues.append([f,'missing fragment',url,line])
 for url in re.findall(r'url\([\'"]?([^\)\'"\s]+)',s):
  p=relpath(url,f)
  if p and not (ROOT/p).exists():issues.append([f,'missing CSS image',url])
 for m in d.meta:
  if m.get('property')=='og:image' or m.get('name')=='twitter:image':
   p=relpath(m.get('content',''),f)
   if p and not (ROOT/p).exists():issues.append([f,'missing social image',m.get('content')])
 seenids=[]
 for block in d.schema:
  try:obj=json.loads(block)
  except Exception as e:issues.append([f,'invalid JSON-LD',str(e)]);continue
  for ob in obj.get('@graph',[obj]):
   if ob.get('@id'):seenids.append(ob['@id'])
 for i,n in Counter(seenids).items():
  if n>1:issues.append([f,'duplicate schema ID declaration',i,n])
 for p in d.paras:
  if len(p.split())>=22:paragraphs[p].append(f)
 for phrase in ['execution','clearer','stronger','path','proof','real project','more than','not just','keep researching','scope discipline','authority guide','placeholder','lorem','TODO','reposition','readiness','aligned','pressure-test','value story','delivery rhythm','serious project','better questions','jobsite speed']:
  for m in re.finditer(re.escape(phrase),texts[f],re.I):flags.append([f,phrase,texts[f][max(0,m.start()-100):m.end()+170]])
for u in sitemap:
 f=relpath(u)
 if f not in docs:issues.append(['sitemap.xml','missing public destination',u])
for kind,vals in [('title',titles),('description',descs),('canonical',canons)]:
 for v,fs in vals.items():
  if len(fs)>1:issues.append(['sitewide','duplicate '+kind,fs,v])
report={'pages':len(docs),'sitemap_urls':len(sitemap),'issues':issues,'wording_candidates':flags,'repeated_main_paragraphs':{p:fs for p,fs in paragraphs.items() if len(set(fs))>1},'page_meta':{f:{'title':' '.join(d.title),'canonical':d.canon,'description':[m.get('content')for m in d.meta if m.get('name')=='description']}for f,d in docs.items()}}
print(json.dumps({'pages':len(docs),'sitemap_urls':len(sitemap),'issues':issues},indent=2))
sys.exit(1 if issues else 0)
