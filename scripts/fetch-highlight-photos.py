import json,urllib.request,urllib.parse,re,time
from pathlib import Path
pairs=[('sight-mutianyu','Mutianyu'),('sight-temple-of-heaven','Temple of Heaven'),('sight-shanghai-museum','Shanghai Museum'),('sight-yulong-river','Yulong River')]
headers={'User-Agent':'ChinaTravelAgentTravelReference/1.0 (editorial reference; attribution retained)'}
def get(url):
 for a in range(4):
  try:return urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25).read()
  except Exception:
   if a==3:raise
   time.sleep(2+a*3)
for slug,title in pairs:
 try:
  q=urllib.parse.urlencode({'action':'query','titles':title,'prop':'pageimages','format':'json','pithumbsize':1440});p=next(iter(json.loads(get('https://en.wikipedia.org/w/api.php?'+q))['query']['pages'].values()));name=p['pageimage'];q=urllib.parse.urlencode({'action':'query','titles':'File:'+name,'prop':'imageinfo','iiprop':'url|extmetadata','format':'json'});ii=next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?'+q))['query']['pages'].values()))['imageinfo'][0];m=ii['extmetadata'];clean=lambda k:re.sub('<[^>]+>','',m.get(k,{}).get('value','')).strip();license=clean('LicenseShortName');assert any(x in license.lower() for x in ['cc','public domain']);Path('public/travel/'+slug+'.jpg').write_bytes(get(p['thumbnail']['source']));out={'slug':slug,'file':'/travel/'+slug+'.jpg','title':name,'author':clean('Artist'),'license':license,'licenseUrl':clean('LicenseUrl'),'source':ii['descriptionurl'],'description':clean('ImageDescription'),'width':p['thumbnail']['width'],'height':p['thumbnail']['height']};Path('public/travel/'+slug+'.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(slug,flush=True)
 except Exception as e:print('FAILED',slug,str(e),flush=True)
 time.sleep(1)
photos=[json.loads(p.read_text()) for p in Path('public/travel').glob('*.json')];Path('src/lib/travel/photos.json').write_text(json.dumps(sorted(photos,key=lambda x:x['slug']),ensure_ascii=False,indent=2)+'\n')
