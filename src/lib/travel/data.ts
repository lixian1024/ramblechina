import raw from './cities.json';
import photos from './photos.json';
import guides from './guides.json';
type Guide = typeof guides[keyof typeof guides];
export type Sight = { name: string; description: string; scope: 'City & local area' | 'Dedicated outing' };
export type City = Omit<typeof raw[number], 'highlights'> & { highlights: Sight[]; guide: Guide };
const excursions = new Set([
 'Mutianyu Great Wall','Zhujiajiao','Li River','Yulong River','Xingping','Longji Rice Terraces',
 'Sanxingdui Museum','Dujiangyan','Terracotta Army','Huaqing Palace','Dazu Rock Carvings','Wulong karst landscapes',
 'Tongli','Tianmen Mountain','Zhangjiajie Grand Canyon','Yellow Mountain','Hongcun','Xidi','Chengkan','Tangmo','Huizhou Ancient City',
 'Cangshan','Shuanglang','Weishan','Jade Dragon Snow Mountain','Tiger Leaping Gorge','Stone Forest','Western Hills',
 'Qingyan Ancient Town','Tianhetan','Huangguoshu Waterfall','Gulangyu','Fujian tulou','Baiyun Mountain','Dameisha','Dapeng Fortress',
 'Lantau and Ngong Ping',"Dragon's Back",'Qingyuan Mountain','Luoyang Bridge','Longmen Grottoes','White Horse Temple',
 'Yungang Grottoes','Hanging Temple','Hengshan','Shuanglin Temple','Zhenguo Temple','Laoshan','Jinshitan',
 'Mogao Caves','Yumen Pass','Yangguan Pass','Yardang National Geopark','Bingling Temple','Kumbum Monastery','Qinghai Lake',
 'Heavenly Lake','Southern Pastures','Tianshan Grand Canyon','Shaolin Temple','Songyang Academy','Mount Song','Gushan',
 'Wuzhizhou Island','Nanshan','Haikou volcanic landscape','Yaoli','Nine Bend River','Tianyou Peak','Roaring Tiger Rock',
]);
export const cities: City[] = raw.map(c => {
 const guide = guides[c.slug as keyof typeof guides];
 return { ...c, description: guide.overview, guide,
  highlights: [...c.highlights, ...guide.sights].map(h => ({ ...h,
   scope: excursions.has(h.name) ? 'Dedicated outing' as const : 'City & local area' as const,
  })),
 };
});
export const regions = ['All', 'North', 'East', 'South', 'Southwest', 'Northwest', 'Northeast', 'Central'];
export const photoFor = (slug: string) => photos.find(p => p.slug === slug);
export const findCity = (slug: string) => cities.find(c => c.slug === slug);

const sightImages:Record<string,string>={
  "Mutianyu Great Wall": "sight-mutianyu",
  "Temple of Heaven": "sight-temple-of-heaven",
  "Shanghai Museum": "sight-shanghai-museum",
  "Yulong River": "sight-yulong-river",
  "Giant Wild Goose Pagoda": "sight-giant-wild-goose-pagoda",
  "Leifeng Pagoda": "sight-leifeng-pagoda",
  "Ciqikou": "sight-ciqikou",
  "Lingering Garden": "sight-lingering-garden",
  "Tianzi Mountain": "sight-tianzi-mountain",
  "Xidi": "sight-xidi",
  "Three Pagodas": "sight-three-pagodas",
  "Black Dragon Pool": "sight-black-dragon-pool",
  "Yuantong Temple": "sight-yuantong-temple",
  "Qingyan Ancient Town": "sight-qingyan",
  "Canton Tower": "sight-canton-tower",
  "Lianhuashan Park": "sight-lianhuashan",
  "Nan Lian Garden and Chi Lin Nunnery": "sight-nan-lian-garden",
  "A-Ma Temple": "sight-a-ma-temple",
  "Ming Xiaoling Mausoleum": "sight-ming-xiaoling",
  "Zhenguo Temple": "sight-zhenguo-temple",
  "Tianjin Eye": "sight-tianjin-eye",
  "St. Michael's Cathedral": "sight-qingdao-cathedral",
  "Thousand Buddha Mountain": "sight-thousand-buddha-mountain",
  "Zhongshan Bridge": "sight-zhongshan-bridge",
  "Heavenly Lake": "sight-heavenly-lake",
  "Orange Isle": "sight-orange-isle",
  "Guiyuan Temple": "sight-guiyuan-temple",
  "Luoyang Bridge": "sight-luoyang-bridge",
  "Temple of Five Lords": "sight-five-lords",
  "Nine Bend River": "sight-nine-bend-river",
};
export function visualForDay(city:City,title:string){const slug=sightImages[title];const photo=slug?photoFor(slug):undefined;return photo?{...city,slug,image:photo.file}:city;}
