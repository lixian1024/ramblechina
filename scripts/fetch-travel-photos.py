import urllib.request,urllib.parse,json,time,concurrent.futures,re
from pathlib import Path
cities=json.loads(Path('src/lib/travel/cities.json').read_text())
headers={'User-Agent':'ChinaTravelAgentTravelReference/1.0 (editorial travel guide; Wikimedia image attribution retained)'}
def get(url):
 for attempt in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as r:return r.read()
  except Exception:
   if attempt==3:raise
   time.sleep(2+attempt*3)
def item(c):
 path=Path('public')/c['image'].lstrip('/')
 meta=Path('public/travel')/(c['slug']+'.json')
 if path.exists() and meta.exists():return json.loads(meta.read_text())
 q=urllib.parse.urlencode({'action':'query','titles':c['wiki'],'prop':'pageimages','format':'json','pithumbsize':1440})
 pages=json.loads(get('https://en.wikipedia.org/w/api.php?'+q))['query']['pages']
 p=next(iter(pages.values()))
 filename=p['pageimage'];url=p['thumbnail']['source']
 time.sleep(1)
 q=urllib.parse.urlencode({'action':'query','titles':'File:'+filename,'prop':'imageinfo','iiprop':'extmetadata|url','format':'json'})
 ip=next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?'+q))['query']['pages'].values()))
 info=ip['imageinfo'][0];m=info.get('extmetadata',{})
 clean=lambda k:re.sub('<[^>]+>','',m.get(k,{}).get('value','')).strip()
 license=clean('LicenseShortName')
 if not any(x in license.lower() for x in ['cc','public domain','pd','cc0']):raise ValueError('Unapproved license '+license)
 path.write_bytes(get(url))
 result={'slug':c['slug'],'file':c['image'],'title':filename,'author':clean('Artist'),'license':license,'licenseUrl':clean('LicenseUrl'),'source':info.get('descriptionurl'),'description':clean('ImageDescription'),'width':p['thumbnail']['width'],'height':p['thumbnail']['height']}
 meta.write_text(json.dumps(result,ensure_ascii=False,indent=2));print(c['slug'],license,flush=True);return result
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
 futures={ex.submit(item,c):c for c in cities}
 for f in concurrent.futures.as_completed(futures):
  try:out.append(f.result())
  except Exception as e:print('FAILED',futures[f]['slug'],str(e),flush=True)
all_photos=[json.loads(p.read_text()) for p in Path('public/travel').glob('*.json')]
Path('src/lib/travel/photos.json').write_text(json.dumps(sorted(all_photos,key=lambda x:x['slug']),ensure_ascii=False,indent=2)+'\n')
print('Total images',len(out))
