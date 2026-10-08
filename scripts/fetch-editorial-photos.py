"""Fetch CC/PD destination photos from Wikimedia, retaining exact per-image credits."""
import json,re,time,urllib.parse,urllib.request
from pathlib import Path
pairs={
 'sight-summer-palace':'Summer Palace','sight-beihai-park':'Beihai Park','sight-798-art-zone':'798 Art Zone',
 'sight-yu-garden':'Yu Garden','sight-shanghai-tower':'Shanghai Tower','sight-zhujiajiao':'Zhujiajiao',
 'sight-wukang-road':'Wukang Road','sight-suzhou-creek':'Suzhou Creek','sight-jade-buddha-temple':'Jade Buddha Temple',
 'sight-terracotta-army':'Terracotta Army','sight-xian-city-wall':"Fortifications of Xi'an",'sight-great-mosque-xian':"Great Mosque of Xi'an",'sight-shaanxi-history-museum':'Shaanxi History Museum','sight-small-wild-goose-pagoda':'Small Wild Goose Pagoda'}
headers={'User-Agent':'ChinaTravelAgentTravelReference/1.0 (editorial travel guide; Wikimedia credit retained)'}
def get(url):
 for attempt in range(3):
  try:return urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25).read()
  except Exception:
   if attempt==2:raise
   time.sleep(2+attempt*2)
def query(host,params):return json.loads(get(host+'?'+urllib.parse.urlencode(params)))
clean=lambda x:re.sub('<[^>]+>','',x or '').strip()
for slug,title in pairs.items():
 try:
  target=Path('public/travel/'+slug+'.jpg')
  if target.exists():continue
  pages=query('https://en.wikipedia.org/w/api.php',{'action':'query','titles':title,'prop':'pageimages','format':'json','pithumbsize':1280})['query']['pages'];page=next(iter(pages.values()));image=page['pageimage']
  pages=query('https://commons.wikimedia.org/w/api.php',{'action':'query','titles':'File:'+image,'prop':'imageinfo','iiprop':'url|extmetadata','format':'json'})['query']['pages'];info=next(iter(pages.values()))['imageinfo'][0];meta=info['extmetadata'];value=lambda key:clean(meta.get(key,{}).get('value',''))
  license=value('LicenseShortName');assert any(x in license.lower() for x in ('cc','public domain')),license
  url=page['thumbnail']['source'];content=get(url);assert content.startswith(b'\xff\xd8\xff'), 'not JPEG'
  record={'slug':slug,'file':'/travel/'+slug+'.jpg','title':image,'author':value('Artist'),'license':license,'licenseUrl':value('LicenseUrl'),'source':info['descriptionurl'],'description':value('ImageDescription'),'width':page['thumbnail']['width'],'height':page['thumbnail']['height']}
  target.write_bytes(content);Path('public/travel/'+slug+'.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print('added',slug,license,flush=True)
 except Exception as exc:print('skipped',slug,str(exc)[:120],flush=True)
 time.sleep(.3)
photos=[json.loads(p.read_text()) for p in Path('public/travel').glob('*.json')]
Path('src/lib/travel/photos.json').write_text(json.dumps(sorted(photos,key=lambda x:x['slug']),ensure_ascii=False,indent=2)+'\n')
