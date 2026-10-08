import json,re,time,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from html.parser import HTMLParser
class Parse(HTMLParser):
 def __init__(self):super().__init__();self.text=[];self.links=[];self.current=None;self.skip=0
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in ['script','style']:self.skip+=1
  if t=='a':self.current=[a.get('href',''),'']
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
  if t=='a' and self.current:self.links.append(self.current);self.current=None
 def handle_data(self,d):
  if self.skip:return
  d=' '.join(d.split())
  if d:self.text.append(d)
  if self.current:self.current[1]+=' '+d
base='https://www.travelchinaguide.com'
def fetch(url):
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ChinaTravelAgent editorial research)'})
   with urllib.request.urlopen(req,timeout=25) as f:raw=f.read().decode('utf-8','replace');actual=f.url
   p=Parse();p.feed(raw);return p,actual
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+2)
index,_=fetch(base+'/cityguides/')
links={t.strip().lower():urllib.parse.urljoin(base,u) for u,t in index.links}
extra={'datong':'/cityguides/datong.htm','quanzhou':'/cityguides/fujian/quanzhou/','wuyishan':'/cityguides/fujian/wuyishan/','jingdezhen':'/cityguides/jiangxi/jingdezhen/'}
cities=json.load(open('src/lib/travel/cities.json'));dest=Path('docs/research/city-sources.json');existing=json.loads(dest.read_text()) if dest.exists() else {}
def research(c):
 slug=c['slug'];key=c['name'].lower().replace('’',"'");key='macau' if slug=='macao' else key
 url=links.get(key,base+extra.get(slug,'/cityguides/'+slug+'.htm'))
 result={'city':c['name'],'pages':[],'errors':[],'accessed':'2026-09-25'}
 try:
  main,actual=fetch(url);result['pages'].append({'kind':'overview','url':actual,'text':'\n'.join(main.text),'links':main.links})
  for kind,terms in [('attractions',['attractions']),('food',['dining']),('transport',['transportation'])]:
   candidate=next((urllib.parse.urljoin(actual,u) for u,t in main.links if t.strip().lower() in terms),None)
   if candidate:
    try:
     p,a=fetch(candidate);result['pages'].append({'kind':kind,'url':a,'text':'\n'.join(p.text),'links':p.links})
    except Exception as e:result['errors'].append(kind+': '+str(e))
 except Exception as e:result['errors'].append(str(e))
 print(slug,len(result['pages']),'pages',result['errors'],flush=True);return slug,result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for slug,result in pool.map(research,[c for c in cities if c['slug'] not in existing or not existing[c['slug']]['pages']]):
  existing[slug]=result;dest.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+'\n')
print('Cities researched',len(existing))
