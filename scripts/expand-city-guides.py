"""Authored editorial additions. Run explicitly; never fetched into publication automatically."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
records={}
def city(slug,overview,sights,foods,areas,arrival,local,outside,routes):
 def pairs(s):return [dict(zip(('name','description'),v.split('|',1))) for v in s.strip().split('\n')]
 records[slug]={'overview':overview,'sights':pairs(sights),'foods':pairs(foods),'areas':pairs(areas),'transport':[{'name':'Arriving','description':arrival},{'name':'Getting around','description':local},{'name':'Beyond the centre','description':outside}],'routes':pairs(routes)}
city('beijing',
'''Beijing rewards a neighbourhood-by-neighbourhood approach. Imperial courtyards occupy enormous blocks; the quieter pleasures are in hutong lanes, lakeside paths and breakfast shops between them. Keep the Great Wall on a separate day and resist crossing the city for every meal.''',
'''Summer Palace|Lakeside paths, painted corridors and palace gardens northwest of the centre. Give this an unhurried half-day; the grounds involve substantial walking.
Jingshan Park|Climb the central hill for a view over the Forbidden City roofs. A useful short stop after the palace, with steps to the viewpoint.
Beihai Park|A lake, white stupa and garden pavilions west of Jingshan. Choose it for a gentler park afternoon rather than another museum.
Shichahai hutongs|Explore the lanes behind the lakes, then pause for tea. These remain residential streets: keep doorways clear and ask before photographing people.
798 Art District|Former industrial buildings now house galleries and design shops. Browse a few exhibitions rather than expecting one single-ticket attraction.''',
'''Peking duck|Order roast duck with pancakes, scallions and sauce; a shared meal makes more sense than a quick solo snack.
Zhajiangmian|Wheat noodles with savoury bean sauce and vegetable toppings. A practical lunch between sights; meat is common in the sauce.
Beijing breakfast|Try sesame flatbreads or jianbing from a busy breakfast shop. Huguosi is a useful area to explore traditional snacks.''',
'''Wangfujing / Dongsi|Convenient for a first visit and eastern old-city sights; choose a hotel near a metro entrance rather than judging only distance on a map.
Gulou / Shichahai|Atmospheric lanes and evening walks, but some courtyard stays have difficult vehicle access and less soundproofing.''',
'''Check whether your flight uses Capital or Daxing airport. Railway departures may use Beijing South, West, Chaoyang or another station: save the exact Chinese station name.''',
'''The metro is useful for long hops; explore one hutong district on foot. Large roads and security queues make short map distances misleading.''',
'''Mutianyu, Badaling and the Ming Tombs are outside central Beijing. Choose one main excursion and confirm the return transfer before departure.''',
'''Old-city day|Build around a confirmed Forbidden City reservation, followed by Jingshan. Leave the late afternoon free for nearby lanes rather than adding the Summer Palace.
Extra days|Give the Temple of Heaven and a neighbourhood meal one day; the Summer Palace another half-day; reserve a separate day for your chosen Great Wall section.''')
city('shanghai',
'''Shanghai is best read at street level before you look down from a tower. Move between the riverfront, tree-lined former concession streets and small local eating places. Pudong and the old city show very different faces; neither needs to be squeezed into a single skyline photograph.''',
'''Yu Garden|A classical garden in the old city, surrounded by a busy bazaar. Separate time inside the garden from shopping and snacks outside.
Shanghai Tower|An elevated view over Pudong and the Huangpu River. Choose a clear day; poor visibility can make a tower visit less rewarding.
Jade Buddha Temple|An active Buddhist temple with sculptural and architectural interest. Keep voices low and follow photography instructions inside halls.
Suzhou Creek|A riverside walk linking industrial heritage and newer cultural spaces. Pick a short section near your accommodation rather than attempting the whole waterfront.
Zhujiajiao|A water-town day trip with canals, bridges and narrow lanes. Leave time for the onward transfer from the metro and a relaxed return.''',
'''Xiaolongbao|Small steamed buns holding hot soup, usually pork-based. Let them cool and take a small bite before drinking the broth.
Shengjianbao|Pan-fried buns with crisp bases and juicy fillings. A filling breakfast or inexpensive lunch rather than a delicate dessert.
Benbang dishes|Shanghai home-style cooking often uses soy sauce and a little sweetness. Try red-braised pork with vegetables and rice as a shared meal.''',
'''People's Square / Jing'an|Central metro connections and a wide hotel range. Check whether the room faces a busy road.
Xuhui / former concession streets|Good for cafes and walking between meals; allow extra travel time for Pudong airport and attractions across the river.''',
'''Pudong and Hongqiao are different airports. Hongqiao railway station connects with the airport complex, but terminal transfers still take time.''',
'''Use the metro for cross-city travel and walk within individual neighbourhoods. A ferry can add a river-level perspective when its route suits your plans.''',
'''Zhujiajiao needs its own half-day or longer. Suzhou and Hangzhou work better as deliberately planned rail excursions than last-minute additions.''',
'''Two contrasting days|Walk the Bund and old city on one day. On another, combine the former concession streets with a museum or gallery chosen for your interests.
An extra day|Choose either a Pudong skyline visit in clear weather or a slower Zhujiajiao excursion. Do not plan both around a tightly timed airport departure.''')
city('guilin',
'''Think of this region as several bases rather than one city. Guilin has urban lakes and caves; Yangshuo has countryside lanes; Xingping has river scenery; Longji is a separate mountain excursion. Where you sleep changes how much of each day you spend in a vehicle.''',
'''Elephant Trunk Hill|The city landmark at the meeting of river and karst scenery. Pair it with a waterfront stroll rather than expecting a remote wilderness experience.
Reed Flute Cave|An illuminated limestone cave near Guilin. A useful weather alternative, with artificial lighting rather than an untouched cave expedition.
Two Rivers and Four Lakes|Lakeside paths and bridges make an easy urban walk. The evening atmosphere differs from the daytime gardens; a cruise is optional.
Longji Rice Terraces|A full-day trip or overnight stay from Guilin. Choose a village base and walking route before arranging transport; terraces change with the agricultural season.
Daxu Ancient Town|Old trading streets beside the Li River outside the centre. Combine a gentle lane walk with riverside time rather than treating it as a major hiking day.''',
'''Guilin rice noodles|A breakfast staple with rice noodles, savoury toppings and pickles. Ask about meat and chilli before mixing everything together.
Yangshuo beer fish|Fish cooked in a beer-based sauce, commonly shared. Confirm fish size and the total price before ordering.
Oil tea|A savoury tea-based preparation associated with local communities. Try it alongside snacks; it is quite different from a pot of plain tea.''',
'''Central Guilin lakes|Practical for an arrival night, urban sightseeing and onward travel; it does not put you in the Yangshuo countryside.
Yangshuo / Yulong River|Town offers more dining choices; countryside stays offer quieter scenery but require planned transfers after dinner.''',
'''Check whether your ticket says Guilin, Guilin North or Guilin West. Yangshuo railway station is near Xingping, not beside Yangshuo town.''',
'''Use walking for the central lakes and vehicles for separated sights. Around Yangshuo, choose short cycling routes suited to your experience and the road conditions.''',
'''Longji and Yangshuo lie in different directions from Guilin. River activities depend on weather and water conditions; keep an alternative land-based day.''',
'''A regional introduction|Use an arrival afternoon for Guilin lakes. Move toward Yangshuo for a countryside day and choose one Li River experience rather than repeating similar cruises.
With more time|Add Xingping at an unhurried pace, or spend a night at Longji. Avoid adding the terraces between two tightly scheduled transport connections.''')
city('chengdu',
'''Chengdu is a city of pauses: tea under trees, a bowl of noodles, then a museum or temple. Its famous excursions spread in several directions, so a comfortable visit balances neighbourhood time with one carefully chosen day trip. The food deserves its own place in the schedule.''',
'''Wuhou Shrine|Courtyards and memorial halls associated with the Three Kingdoms. Pair the visit with nearby Jinli, while keeping time for the historical exhibits.
Jinli Street|A lively, commercial lane of snacks and traditional-style architecture. Visit for atmosphere; compare prices before buying souvenirs.
Du Fu Thatched Cottage|Gardens and buildings commemorating the Tang poet. A quieter cultural afternoon, especially for visitors who prefer parks to shopping streets.
Sanxingdui Museum|A full-day trip to Guanghan for striking ancient bronzes and archaeological displays. Plan the museum reservation and onward transfer together.
Dujiangyan|A full-day trip to the historic irrigation landscape. Bridges and waterworks involve walking; combining it with Qingcheng Mountain makes a much longer day.''',
'''Mapo tofu|Silky tofu in a chilli-and-peppercorn sauce, often containing minced meat. Ask specifically if you need a meat-free version.
Dandan noodles|A small noodle dish with a punchy sauce. Useful for tasting alongside other snacks rather than ordering every dish as a full meal.
Sichuan hotpot|A social meal with ingredients cooked at the table. A divided broth can help a mixed group, but confirm each broth's ingredients.''',
'''Tianfu Square / Chunxi Road|Convenient for metro journeys and a broad hotel choice; larger shopping streets can remain busy late.
Wenshu / Qingyang|Good for temple visits and neighbourhood meals. Pick a stay near transport if you plan several excursions.''',
'''Tianfu and Shuangliu airports are separate. Check the terminal and allow ample time for Tianfu transfers; Chengdu East is a major high-speed rail hub.''',
'''The metro works well between districts. Plan a short taxi or walking connection for places that are not beside a station.''',
'''The panda base, Sanxingdui, Dujiangyan and Leshan are different outings. Reserve one major outlying attraction per day.''',
'''City and pandas|Put the panda visit early in a day, then keep the afternoon flexible. Use a separate city day for Wenshu, People's Park and a leisurely Sichuan meal.
Choose an excursion|Add Sanxingdui for archaeology or Dujiangyan for landscape and engineering. Retain an evening in Chengdu instead of stacking distant stops.''')
city('xian',
'''Xi’an mixes monumental history with lively everyday streets. The walled centre is a useful walking base, but the Terracotta Army and several major museums lie well beyond it. Balance one large archaeological visit with time for noodles, calligraphy streets and the city wall.''',
'''Shaanxi History Museum|An introduction to the region's dynasties through archaeological collections. Build your day around a confirmed reservation and the correct museum location.
Giant Wild Goose Pagoda|A Buddhist landmark south of the old city. Explore the surrounding squares at a different pace from the crowded evening pedestrian streets.
Small Wild Goose Pagoda and Xi'an Museum|A quieter pairing of historic grounds and museum collections. Check which areas are accessible before planning a pagoda climb.
Bell and Drum Towers|Landmarks in the old-city street grid. Seeing the exteriors and surrounding streets may suit a short visit better than entering both.
Huaqing Palace|An excursion in the Lintong area with imperial associations and landscaped grounds. Treat this as additional time near the Terracotta Army, not a quick city-centre stop.''',
'''Roujiamo|Bread filled with chopped meat; pork and beef versions differ. Check the filling rather than assuming every stall serves the same recipe.
Yangrou paomo|Crumbled flatbread in mutton broth. A substantial meal, especially welcome on a cool day.
Liangpi|Cool noodles dressed with vinegar, chilli and other seasonings. Often paired with roujiamo for a simple lunch.''',
'''South Gate / inside the wall|Useful for evening walks and old-city meals. Check walking distance to a metro entrance.
Xiaozhai / pagoda district|Handy for southern museums and newer hotels, but less atmospheric if most evenings will be spent in the old city.''',
'''Xi’an Xianyang airport is outside the city. Xi’an North and the central Xi’an railway station are different; match the station to your ticket.''',
'''The metro links major districts. Walk within the walled centre; wall access points and stairways determine where a walking or cycling visit starts.''',
'''The Terracotta Army requires an out-of-town transfer. Huashan should be a separate mountain day with weather and return travel considered.''',
'''Two history days|Use one day for the Terracotta Army. Spend another around the wall, Great Mosque area and a relaxed noodle meal.
Extend the stay|Choose one major museum and the pagoda district on an extra day. Put Huashan on a separate date instead of adding it after a museum.''')
city('hangzhou',
'''Hangzhou becomes more rewarding as you move away from a checklist of lake viewpoints. Allow time for western shore walks, a tea village and a temple, then explore the canal or old commercial streets. Hills, heat and weekend crowds affect the pace more than distances suggest.''',
'''Hefang Street|A busy old-style shopping street for snacks and small souvenirs. Use nearby lanes to break up the crowds and compare tea prices carefully.
Grand Canal and Gongchen Bridge|Canal-side walking and historic commercial neighbourhoods north of the lake. A different story of Hangzhou from its famous scenery.
Xixi Wetland|Waterways, vegetation and slower walking routes west of the centre. Reserve a half-day and check which walking or boat route your ticket covers.
Leifeng Pagoda|A prominent viewpoint on the south side of West Lake. Choose it for the perspective over the lake rather than as another obligatory tower.
China National Tea Museum|Tea culture and growing traditions near the western hills. Check the branch address and combine it with one nearby tea-growing area.''',
'''Dongpo pork|Rich braised pork, usually shared with rice and vegetables. Order a small portion first if travelling as a couple.
Longjing shrimp|Shrimp associated with the city's famous green tea. A gentler-flavoured alternative to heavily seasoned dishes.
Osmanthus lotus root|Lotus root stuffed with glutinous rice and served sweet. A distinctive local dish to share rather than a savoury side.''',
'''East side of West Lake|Convenient for first visits, dining and city transport, but usually busier than the western shore.
West Lake hills / tea villages|Atmospheric for a slow stay; dining choice and evening transport can be more limited.''',
'''Hangzhou East, Hangzhou station and Hangzhou West serve different rail journeys. Xiaoshan airport is another substantial transfer from the lake.''',
'''Walk selected lake sections rather than the whole perimeter. Use the metro for city districts and buses or taxis for hill-side destinations.''',
'''Tea villages, Lingyin and Xixi are spread out. Keep a flexible hill day for weather and avoid linking all three by repeated cross-city transfers.''',
'''Lake and hills|Spend one day around a chosen West Lake shore and old streets. Give Lingyin and a nearby tea stop another day, allowing for queues and hill roads.
A quieter extension|Explore the Grand Canal or Xixi on an extra day. Pick one landscape and spend time there instead of collecting multiple entrances.''')
city('chongqing',
'''Chongqing is three-dimensional: a street on the map may sit far above the road beside it. Split your visit by peninsula and riverbank, and allow time for lifts, steps and viewpoints. Hotpot and the night riverfront are part of the experience, not rewards squeezed in after sightseeing.''',
'''Three Gorges Museum|A useful introduction to the region and the Yangtze. Pair it with the People's Auditorium exterior nearby.
Ciqikou|A historic riverside district with busy souvenir and snack streets. Seek the quieter side lanes, but expect a commercial visitor area.
Liziba viewpoint|Watch a train pass through a building from the viewing area. A short photo stop rather than a full neighbourhood itinerary.
Eling Park|Hilltop greenery and city views. Allow for slopes and choose clear weather if the panorama is your main reason for visiting.
Wulong karst landscapes|A full-day trip or overnight excursion outside the urban core. Scenic-area transfers and walking take time; do not combine it with Dazu.''',
'''Chongqing hotpot|A strongly flavoured communal meal, often with beef-fat broth. Confirm broth and ingredients if your group has dietary restrictions.
Xiaomian|Small bowls of noodles with chilli and peppercorn seasoning. Ask for a gentler version before the sauce is added.
Suanlafen|Sour-and-spicy noodles, commonly made from sweet-potato starch. Good for a casual snack stop; toppings can include meat.''',
'''Jiefangbei|A convenient first-time base for central sights and food, though traffic and busy streets can slow taxi pickups.
Guanyinqiao|A lively dining and shopping district across the river. Good metro access matters more than straight-line distance to attractions.''',
'''Jiangbei airport, Chongqing North, West and other railway stations are widely separated. Save the exact station and entrance shown on your ticket.''',
'''Use rail transit between districts, then walk shorter routes. A map route may contain many stairs; ask hotels about step-free arrival.''',
'''Dazu and Wulong are separate full-day excursions. For a river cruise, confirm the actual boarding pier rather than navigating to a general waterfront.''',
'''Urban contrasts|Pair the museum and auditorium with Eling or Liziba. Save a separate afternoon and evening for Jiefangbei, the lanes and riverfront lights.
Beyond the city|Choose Dazu for carvings or Wulong for karst scenery. Leave a buffer night before an important onward connection.''')
city('suzhou',
'''Suzhou is more than a quick garden stop from Shanghai. Its best days move slowly between a garden, a canal lane and a noodle shop. Gardens can blur together if you visit too many at once; choose contrasting styles and keep a water-town excursion separate.''',
'''Lingering Garden|A classical garden of framed views, rocks and connected courtyards. An alternative to adding several gardens near the museum in one morning.
Master of the Nets Garden|A compact garden that rewards close attention to proportions and reflections. A good choice when you want an intimate visit.
Tiger Hill|A hilltop pagoda and landscaped historic grounds northwest of the old centre. Expect steps and allow a half-day with travel.
Shantang Street|Canal-side buildings and busy evening lanes. Walk beyond the first crowded stretch to find a less hurried rhythm.
Tongli|A water-town day trip with canals, bridges and garden courtyards. Leave time for the transfer between rail transit and the old town.''',
'''Suzhou-style noodles|Fine noodles in clear or darker broth with separate toppings. Try a bowl early in the day when traditional noodle shops are active.
Squirrel-shaped mandarin fish|A fried whole fish with a sweet-sour sauce, usually best shared by several people.
Seasonal rice cakes|Local pastries and glutinous-rice sweets change through the year. Buy small portions to compare textures and sweetness.''',
'''Guanqian / Pingjiang area|Useful for old-city walks, gardens and food. Some lane-side hotels require a final walk with luggage.
Jinji Lake|More contemporary hotels and waterfront space; expect metro journeys back to the historic centre.''',
'''Suzhou station is convenient for the historic city; Suzhou North is a separate high-speed station. Nearby Shanghai airports require an additional transfer.''',
'''Combine the metro with walking within the old town. Garden entrances can be close on a map but separated by busy streets and queues.''',
'''Tongli and Zhouzhuang are separate water towns. Choose one and avoid trying to pair it with a full old-city garden day.''',
'''Gardens without rushing|Visit the Humble Administrator's Garden and nearby museum if reservations align, then walk Pingjiang Road. Save another garden for the next day.
A different perspective|Combine Tiger Hill and Shantang, or dedicate an extra day to Tongli. Keep time for a canal-side meal.''')
city('zhangjiajie',
'''Zhangjiajie is a collection of scenic areas, not a single mountain entrance. Wulingyuan is the useful base for the sandstone peaks; the urban centre serves Tianmen Mountain. Plan around your accommodation and entrance, and allow spare time when fog obscures the views.''',
'''Yuanjiajie|A plateau of sandstone-pillar viewpoints inside the forest park. Combine it with nearby park transport, not an unrelated city attraction.
Golden Whip Stream|A valley walk beneath tall rock formations. A useful lower-level contrast to the high viewpoints, with walking distance tailored to your energy.
Huangshi Village|A forest-park plateau with panoramic paths. Choose it as an alternative park sector rather than attempting every summit area in a day.
Zhangjiajie Grand Canyon|A separate day trip from the forest park, with canyon walking and the famous glass bridge. Check the exact ticket and activity bundle.
Baofeng Lake|A lake excursion near Wulingyuan with boat-based sightseeing. An option for a gentler half-day, subject to local operations and weather.''',
'''Sanxiaguo|A shared hotpot-style local dish whose meat and offal combination varies. Ask what is included before ordering.
Smoked pork|Preserved pork commonly cooked with vegetables. Rich and salty, so pair a small plate with rice and greens.
Sour vegetables|Pickled vegetables appear in many local dishes. Request chilli separately where possible rather than assuming sour means mild.''',
'''Wulingyuan entrance area|Practical for repeat forest-park days and early starts. Confirm the exact entrance your accommodation serves.
Zhangjiajie city centre|Better for Tianmen Mountain and urban transport connections; it adds a road transfer to forest-park visits.''',
'''Zhangjiajie West railway station and Hehua airport are not at the forest-park gate. Arrange the final transfer to your chosen base.''',
'''Inside the park, walking connects with managed buses and other transport. Cableways and lifts save ascent but do not remove all steps.''',
'''Tianmen Mountain and the Grand Canyon have separate entry systems. Do not treat them as add-ons inside the Wulingyuan park ticket.''',
'''A mountain-focused stay|Use two days for complementary forest-park sectors, keeping one lower valley walk in the mix. Choose the daily order after seeing the forecast.
A separate mountain day|Move or transfer to the city for Tianmen Mountain. Add the Grand Canyon only with another full day, not between departure connections.''')
city('huangshan',
'''Huangshan can mean the city, the mountain or the wider region of Huizhou villages. These are different bases. Decide whether your priority is summit scenery or village architecture, then build transport around that choice; a mountain hotel is a logistical decision as much as a scenic one.''',
'''Xidi|A full-day village excursion when paired carefully with nearby stops. Stone lanes and ancestral buildings offer a different atmosphere from the mountain.
Chengkan|An old Huizhou village with lanes, waterways and traditional buildings. Allow time to explore on foot rather than stopping only for a photograph.
Tangmo|A village excursion for waterside architecture and a slower walk. Check the transfer distance from your chosen base before adding another village.
Huizhou Ancient City|Historic streets and monuments in Shexian. An alternative to the mountain for travellers interested in architecture and regional history.
Xin'an River waterfront|An easy walk in the Tunxi area. Useful on an arrival evening when you do not have time for a mountain transfer.''',
'''Fermented mandarin fish|A strongly aromatic regional speciality, cooked before serving. Try it as a shared dish if your group enjoys bold flavours.
Hairy tofu|Fermented tofu with a distinctive surface, usually cooked at the stall or restaurant. Ask how it will be prepared.
Huangshan sesame pastries|Small baked pastries, often with savoury fillings. Handy for a travel day; check whether the filling contains pork.''',
'''Tunxi|Useful for arrival, old streets and regional transport. It is not at the mountain gate.
Tangkou / mountain hotels|Tangkou serves the southern mountain approach. A summit stay can reduce backtracking but involves carrying essentials up the mountain.''',
'''Huangshan North station and Tunxi airport serve the wider region. Confirm whether your onward transfer ends in Tunxi, Tangkou or a village.''',
'''The mountain uses managed transfers, cableways and walking paths. Expect stairs even when taking a cableway; choose a route suited to the group.''',
'''Group village visits geographically. Do not add Hongcun or Xidi after a demanding summit walk unless you have deliberately allowed another night.''',
'''Mountains first|Transfer to the mountain base, then give the mountain a full day or an overnight stay. Keep the route flexible for visibility and closures.
Village extension|Spend a separate day in Hongcun or Xidi and return to Tunxi for the old street. Avoid changing hotels every night if travelling with heavy luggage.''')
city('dali',
'''Dali combines a compact old town with a very large lake and mountain backdrop. The most satisfying visit chooses a few villages and short lakeside sections instead of attempting a hurried circuit. Bai architecture, food and craft traditions deserve as much time as the scenery.''',
'''Three Pagodas|A landmark complex north of the old town. Give the extensive grounds time rather than treating it only as a roadside photograph.
Cangshan|A mountain outing with cableways and walking routes. Choose your route for weather and fitness; high areas can feel much colder than town.
Zhoucheng|A village known for Bai tie-dye traditions. Look for a workshop explaining the process and clarify charges before joining an activity.
Shuanglang|A lakeside settlement on Erhai's eastern side with cafes and viewpoints. Plan the return transfer instead of assuming it is close to Dali Old Town.
Weishan|A full-day trip south of Dali for historic streets and local food. Best treated as its own excursion, not a stop on a lake circuit.''',
'''Rushan|A local dairy snack served in different ways, including grilled or fried. Check toppings if you prefer savoury to sweet.
Ersi noodles|Rice-based strands served in soup or stir-fried. A useful breakfast or quick lunch with locally varying toppings.
Bai-style fish casserole|A shared fish dish with vegetables and other ingredients. Confirm the recipe and price before ordering.''',
'''Dali Old Town|Convenient for meals and onward excursions; choose side streets if you want quieter nights.
Erhai villages|Good for a slow lakeside stay, but attractions across the lake require transfers and evening dining can be limited.''',
'''Dali railway station is in the modern Xiaguan area, away from the old town. The airport also requires a separate transfer to your accommodation.''',
'''Explore the old town on foot and choose short lake-path walks or rides. Check where bikes are permitted rather than assuming a full lakeside circuit is straightforward.''',
'''Cangshan, eastern Erhai and Weishan are different outings. Shaxi is better considered as an onward stop or overnight excursion.''',
'''Old town and lake|Spend one day in the old town and Three Pagodas area, then another around Xizhou and a nearby lakeside section.
With a third day|Choose a suitable Cangshan route or Weishan's streets and food. Leave enough time to reach the railway station in Xiaguan.''')
city('lijiang',
'''Lijiang works best when you distinguish the busy old-town core from quieter villages and mountain excursions. Canal lanes can be atmospheric early in the day, while Baisha and the foothills offer a different pace. Keep a flexible mountain day rather than scheduling every hour.''',
'''Black Dragon Pool|A landscaped park with mountain views when skies are clear. Pair it with a gentle old-town day rather than relying on a guaranteed reflection photograph.
Shuhe Ancient Town|A second historic settlement with lanes, streams and shops. Spend time beyond the busiest commercial streets.
Mu's Residence|Courtyards associated with Lijiang's former ruling family. A useful introduction to local history within the old-town area.
Yuhu Village|A stone-built village near the mountain foothills. Arrange return transport and respect working homes while walking through the lanes.
Tiger Leaping Gorge|A separate full-day excursion for viewpoints, or a longer stay for trekking. The viewing area and multi-day high trail are very different trips.''',
'''Naxi baba|A local flatbread with sweet or savoury versions. Ask which filling is being served before buying.
Chickpea jelly|A cool or cooked chickpea-starch dish with seasoning. Chilli and other toppings vary from shop to shop.
Preserved pork-rib hotpot|A shared pot featuring cured ribs and vegetables. A substantial evening meal, with a naturally salty broth.''',
'''Dayan Old Town edge|Atmosphere with easier luggage access than the deepest lanes. Check noise from nearby bars.
Shuhe / Baisha|A quieter base for village time, with extra transfers for the city and station.''',
'''Lijiang railway station and Sanyi airport are outside the old-town lanes. Confirm the nearest vehicle drop-off point to your hotel.''',
'''Walk within each historic settlement, then use vehicles between them. Stone paving and steps make wheeled luggage awkward.''',
'''Jade Dragon Snow Mountain and Tiger Leaping Gorge need separate days. Confirm route difficulty and current access before committing to a mountain excursion.''',
'''Town and villages|Start with Dayan and Black Dragon Pool. Spend another day in Baisha or Shuhe with time for a meal and local crafts.
Mountain extension|Reserve a separate weather-dependent day for the snow mountain. Add the gorge only with enough time for the return journey or an overnight stay.''')
city('kunming',
'''Kunming is worth a pause between Yunnan destinations. Lake walks, temples, markets and a strong provincial museum offer an introduction to the region without constant hotel changes. The Stone Forest lies outside the city, so keep it separate from a day of urban exploring.''',
'''Yuantong Temple|An active Buddhist temple near central Kunming. Combine it with Green Lake for a calm walking day.
Western Hills|A hill-and-temple excursion overlooking Dianchi. Allow time for transport, stairs and weather-dependent views.
Dianchi lakeshore|A broad lake setting for a gentle walk. Choose a specific shore or park entrance rather than navigating simply to the lake.
Dounan Flower Market|A working flower-trading area with a different rhythm from a museum. Check visiting arrangements and give traders space.
Golden Temple|A historic temple complex in wooded grounds northeast of the centre. A separate half-day outing if you enjoy architecture and parks.''',
'''Crossing-the-bridge noodles|Rice noodles served with broth and separate ingredients. Follow the restaurant's instructions for adding and cooking the ingredients.
Small-pot rice noodles|A comforting single-bowl meal with local toppings. Check the broth and meat content if you have dietary needs.
Flower cakes|Pastries often filled with rose petals. Buy a small fresh batch and check storage instructions before taking them onward.''',
'''Green Lake / city centre|Good for walking, food and a first short stay. A nearby metro stop makes onward travel easier.
Kunming South station area|Useful for an early train, but distant from many central sights; choose it for logistics rather than atmosphere.''',
'''Changshui airport, Kunming station and Kunming South are separate hubs. Check the departure station before choosing an overnight stop.''',
'''The metro helps with longer urban journeys. Group Green Lake and Yuantong together, and give southern museum or lake visits their own time.''',
'''The Stone Forest requires an onward transfer beyond the city. Jiuxiang is another excursion, not an effortless add-on after a full sightseeing day.''',
'''A city pause|Combine Green Lake and Yuantong, with a noodle lunch. On another day choose the provincial museum or the Western Hills and lake area.
A landscape day|Give the Stone Forest its own day and keep the return evening easy before onward travel to Dali or Lijiang.''')
city('guiyang',
'''Guiyang is a useful introduction to Guizhou, with riverside landmarks, forested hills and a food culture built around sour and spicy flavours. The province is much larger than its capital: waterfalls and village stays need their own travel days rather than being presented as city attractions.''',
'''Guizhou Provincial Museum|A starting point for the province's history and cultural traditions. Pair it with nearby northern-city plans, not a rushed transfer to Qingyan.
Tianhetan|A scenic excursion southwest of the centre with water and cave landscapes. Allow a half-day or longer and check the available routes.
Huaxi Park|A riverside park in the southern district. A gentler outdoor visit that can fit a day based around Huaxi.
Wenchang Pavilion|A historic city landmark suited to a shorter central walk. Combine it with nearby streets rather than travelling across town only for this stop.
Huangguoshu Waterfall|A separate full-day trip or overnight excursion near Anshun. Transfers and scenic-area walking make it unsuitable as a quick Guiyang city stop.''',
'''Sour-soup fish|A shared fish dish with a sour broth associated with Guizhou's wider food traditions. Confirm fish size and price first.
Siwawa|Small wrappers filled with vegetable strips and dipping sauce. Ask about the sauce if avoiding meat or seafood ingredients.
Changwang noodles|A strongly flavoured noodle dish commonly containing intestines and blood curd. Check the toppings before ordering.''',
'''Jiaxiu / central Nanming|Useful for evening walks and local food. Choose a metro connection for longer journeys.
Guanshanhu / Guiyang North|Newer hotels and convenient rail logistics, with more travel to the historic central areas.''',
'''Longdongbao airport and Guiyang North or East railway stations serve different journeys. Confirm the final city transfer before booking a tight connection.''',
'''Use the metro between districts and walking within each area. Hills and larger roads can make a short map distance less convenient than expected.''',
'''Qingyan lies to the south; Huangguoshu and distant village destinations require separate planning. Do not treat all of Guizhou as a day-trip radius.''',
'''Two city days|Pair Qianling Park with central food streets and an evening near Jiaxiu. Give Qingyan a separate outing, optionally with a nearby Huaxi stop.
Extend into Guizhou|Choose Huangguoshu or an overnight village journey as the next leg. Keep time in the schedule for regional transfers.''')
city('xiamen',
'''Xiamen lends itself to days shaped by the coast: a temple, a small district of shops and cafes, then a waterfront walk. Gulangyu is a separate island visit with ferry logistics. The Fujian tulou are much farther inland and deserve their own excursion.''',
'''Hulishan Fortress|A coastal fort with historic artillery. Pair it with a nearby seafront walk instead of another cross-island journey.
Huandao Road coast|Choose a manageable section of shoreline for walking or cycling. The whole coastal road is much longer than a casual stroll.
Zhongshan Road|Covered shopping streets and snack stops near the old centre. Explore side streets and compare prices before buying food gifts.
Jimei School Village|Architecture and waterfront spaces on the mainland side of Xiamen. Give the cross-water journey and walking time a half-day.
Fujian tulou|A full-day trip or overnight excursion to inland earthen-building clusters. Choose one cluster and a realistic transfer plan; they are not in Xiamen city.''',
'''Shacha noodles|Noodles in a rich sauce-based broth with selectable toppings. Peanut and seafood ingredients may be present.
Oyster omelette|Small oysters cooked with egg and starch. Best ordered freshly cooked and shared alongside other dishes.
Peanut soup|A sweet peanut dessert, often eaten warm. A gentle finish to a snack walk around the older shopping streets.''',
'''Zhongshan Road / old centre|Good for food and waterfront walks; confirm the departure terminal for any Gulangyu ferry.
Huandao Road coast|Quieter seaside stays with more space, but extra journeys for city restaurants and rail connections.''',
'''Xiamen and Xiamen North railway stations are different: North is on the mainland. Check the airport and terminal named on your actual flight booking.''',
'''Metro and buses connect districts; walk within coastal neighbourhoods. Gulangyu ferry terminal and passenger arrangements need checking before setting out.''',
'''Tulou clusters require substantial road travel. Do not combine them with Gulangyu on a single day.''',
'''Coast and island|Give Gulangyu a full, unhurried day. Use another for South Putuo, Shapowei and a selected coastal walk.
An extra day|Choose Jimei for architecture or a separately arranged tulou excursion. Leave a buffer before an onward flight.''')
city('guangzhou',
'''Guangzhou is a food city with layers of river trade, clan architecture and modern development. Plan meals as part of the route: morning tea can be the main event. The western old-city districts and the eastern skyline work best on different days.''',
'''Canton Tower|A modern riverfront landmark with optional elevated views. A clear evening is more useful than squeezing it into a cloudy afternoon.
Yuexiu Park|A large urban park with historic landmarks and shaded paths. Choose a short loop if travelling in hot weather.
Museum of the Nanyue King|Archaeological collections that explain an older chapter of the city. Confirm the museum branch associated with the exhibits you want.
Sacred Heart Cathedral|A distinctive stone cathedral in the older city. Respect worship times and any visitor restrictions.
Baiyun Mountain|A hill-and-park outing north of the centre. Allow a half-day or longer and select a route that suits the group's walking ability.''',
'''Dim sum|Small steamed and baked dishes served with tea. Order gradually so the table does not fill with more food than you need.
Wonton noodles|Fine noodles and filled dumplings in broth, often with pork and shrimp. A practical light meal between walks.
Cantonese roast meats|Roast goose, duck and char siu are common options. A rice plate lets a solo traveller try a small portion.''',
'''Liwan / old western centre|Good for traditional food and historic streets. Check hotel condition and walking distance to the metro.
Tianhe / Zhujiang New Town|Modern hotels and transport links, with more commuting to the older neighbourhoods.''',
'''Baiyun airport and Guangzhou South railway station sit outside the old centre. Check the exact station: Guangzhou, East and South are not interchangeable.''',
'''Metro travel is useful between the old centre and newer eastern districts. Walk shorter shaded sections in warm weather.''',
'''Foshan is a separate city visit even when rail links make it accessible. Allow time at both ends of any intercity journey.''',
'''Old and new|Combine Chen Clan Ancestral Hall, Liwan and Shamian on an old-city day. Explore the modern riverfront on a separate afternoon and evening.
Slow the pace|Reserve a morning for tea, then choose a museum or Baiyun Mountain rather than adding multiple distant sights.''')
city('shenzhen',
'''Shenzhen is most interesting as a lived-in modern city: design districts, parks, neighbourhood food and a long coastline. Attractions are widely spread. Decide whether your stay is urban or beach-focused before choosing a hotel, as the eastern coast is a different journey.''',
'''Lianhuashan Park|A central park with a hilltop view over the civic district. Visit in cooler hours and expect a climb to the viewpoint.
Shenzhen Museum|City and regional history in museum settings. Check the branch and exhibition location before travelling.
Window of the World|A theme park of architectural replicas and entertainment. A deliberate family choice, not a substitute for the city's own neighbourhoods.
Dameisha|A beach excursion east of the centre. Allow for traffic, weather and beach-management rules.
Dapeng Fortress|A full-day trip to historic lanes in the eastern peninsula area. Pair only with nearby coastal stops, not central-city sightseeing.''',
'''Cantonese dim sum|An easy introduction to southern Chinese dining. Share several small dishes and tea instead of ordering a large fixed meal.
Hakka-style dishes|Look for stuffed tofu and other Hakka dishes reflecting the region's older communities. Fillings often include meat.
Seafood|Coastal restaurants offer fish and shellfish prepared in several styles. Confirm weight, cooking charge and total price before ordering.''',
'''Futian|A practical base for central parks, museums and transport; choose your station carefully in this large district.
Nanshan / Shekou|Good for western waterfront and dining, but farther from eastern beaches and some rail departures.''',
'''Bao’an airport, Shenzhen North, Futian and Shenzhen railway stations serve different routes. Cross-border journeys require their own document and timing checks.''',
'''Use the metro for urban trips and group sights by district. Long east-west journeys can consume much of an afternoon.''',
'''Dameisha and Dapeng need dedicated coastal time. Avoid an eastern beach trip immediately before a tightly scheduled train or flight.''',
'''Urban introduction|Pair central parks and a museum on one day. Use another for OCT Loft and a Shenzhen Bay walk.
Coastal extension|Add Dapeng or Dameisha as a separate outing. Choose according to whether history or beach time matters more to your group.''')
city('hong-kong',
'''Hong Kong combines compact urban walks with surprisingly spacious coast and country parks. A harbour crossing is part of the experience, but hills and islands deserve their own time. Treat it as a separate travel jurisdiction when planning documents, payment and onward connections.''',
'''Tsim Sha Tsui waterfront|An accessible introduction to the harbour skyline. Combine it with nearby museums or a ferry crossing rather than a long checklist.
Hong Kong Museum of History|Historical context for the city. Check the current exhibitions before choosing how much time to spend.
Nan Lian Garden and Chi Lin Nunnery|A landscaped garden and Buddhist complex in Kowloon. Keep the visit quiet and follow photography guidance.
Lantau and Ngong Ping|A full-day trip for mountain scenery and the Tian Tan Buddha area. Transport choice and weather affect the experience.
Dragon's Back|A separate hiking outing with coastal views. Check weather, route conditions and your group's ability before leaving urban transport behind.''',
'''Dim sum and tea|Choose a few steamed, fried and baked dishes to share. Some restaurants use timed sessions or different ordering systems.
Wonton noodles|A compact meal of noodles and dumplings, commonly containing shrimp and pork. Useful between neighbourhood walks.
Cha chaan teng breakfast|Local cafes serve combinations such as eggs, toast, noodles and milk tea. Menus and ordering conventions vary.''',
'''Tsim Sha Tsui / Jordan|Convenient for Kowloon dining and harbour access; room sizes can be compact.
Sheung Wan / Central|Good for island neighbourhood walks and ferries, with slopes and steps to consider when choosing a hotel.''',
'''The airport, West Kowloon rail terminal and land crossings have distinct onward journeys. Check entry requirements separately from mainland China.''',
'''MTR, buses, trams and ferries suit different journeys. Walking routes on Hong Kong Island may involve steep slopes and stairs.''',
'''Lantau, outlying islands and hiking routes each need time for return transport. Avoid planning the last service as your only way back.''',
'''Harbour and neighbourhoods|Pair Kowloon waterfront time with a Star Ferry crossing. Explore Sheung Wan and Central on another day, adding the Peak in suitable weather.
A greener day|Choose Lantau, an island or a manageable hike. Keep a city alternative if weather makes the outdoor plan unattractive.''')
city('macao',
'''Macao rewards looking beyond the resort complexes. Its compact historic streets, Chinese temples and Portuguese-influenced buildings tell a layered story, while Taipa and Coloane offer different rhythms. Separate travel-document and payment arrangements from any mainland portion of your trip.''',
'''A-Ma Temple|An active temple complex on the peninsula with courtyards and steps. Respect worshippers and explore the surrounding streets slowly.
Mandarin's House|A traditional residential complex offering a more intimate architectural visit than the major public squares.
Guia Fortress|A hilltop historic site with city views. Allow for the ascent and check which interiors are accessible.
Macao Museum|Historical context beside the Monte Fort area. A useful companion to an old-centre walk rather than a separate cross-city trip.
Hac Sa Beach|A quieter coastal outing on Coloane. Choose it for a walk and change of atmosphere; check local conditions before entering the water.''',
'''Portuguese-style egg tarts|Small custard pastries with browned tops. Buy a few fresh rather than carrying a large box through a hot day.
Minchi|A home-style minced-meat dish often served with potatoes, rice and an egg. Recipes vary between restaurants.
Almond cookies|A crumbly local souvenir snack. Compare ingredients, freshness and packaging if taking a box home.''',
'''Historic peninsula|Best for walking between old-centre sights and small restaurants; some streets are steep or narrow.
Taipa / Cotai|More resort-style accommodation and larger complexes, with transport needed for peninsula sightseeing.''',
'''Check whether you arrive by airport, ferry or land crossing. Terminal choice changes the local transfer, and entry rules differ from mainland China.''',
'''Walk compact historic areas and use buses or taxis between the peninsula, Taipa and Coloane. Large resort interiors can add substantial walking.''',
'''An onward Hong Kong or Zhuhai journey requires a separate transport and border plan. Leave time beyond the scheduled ride itself.''',
'''Historic day|Link the central squares and lanes with the museum or Mandarin's House. Keep a separate block for A-Ma Temple and its surroundings.
Island day|Explore Taipa Village, then move to Coloane for a slower afternoon and a meal. Avoid rushing back across districts for every snack.''')
city('nanjing',
'''Nanjing has the scale of a former capital: walls, lakes, museums and wooded hills spread across the city. Choose a historical theme for each day rather than trying to connect all the monuments. Some sites invite reflection, so leave space between them and more recreational stops.''',
'''Confucius Temple and Qinhuai River|A busy riverside district of lanes, food and evening lights. Explore side streets as well as the main visitor route.
Xuanwu Lake|A broad lakeside park beside the city wall. Choose one shore or island loop for a relaxed outdoor break.
Presidential Palace|Historic government buildings and gardens in the centre. Allow time for the exhibitions rather than only photographing the entrance.
Sun Yat-sen Mausoleum|A major monument on Purple Mountain with a substantial stair approach. Check reservation and access arrangements before travelling.
Ming Xiaoling Mausoleum|A wooded historic complex on Purple Mountain. Give the paths and monuments enough walking time; it is not beside every other mountain attraction.''',
'''Salted duck|A signature cold duck dish with a savoury, restrained seasoning. Order a small portion with other dishes.
Duck-blood vermicelli soup|A local soup commonly containing duck blood curd and offal. Check ingredients before ordering.
Tangbao|Soup-filled buns served hot. Let them cool and eat carefully to avoid spilling the broth.''',
'''Xinjiekou|Central transport and plentiful dining, useful for a first visit across several districts.
Qinhuai / Confucius Temple area|Good evening atmosphere, but check noise and vehicle access on pedestrian streets.''',
'''Nanjing South and Nanjing railway stations sit in different parts of the city. Lukou airport requires a separate transfer.''',
'''Use metro journeys between districts and walking inside large historic sites. Purple Mountain still involves local transfers and substantial walking.''',
'''Allow a dedicated day for selected Purple Mountain sites. Do not underestimate the distance between individual entrances.''',
'''City history|Combine a central museum or palace visit with a selected city-wall section. Use another afternoon for Qinhuai streets and dinner.
Wooded monuments|Choose two compatible Purple Mountain sites for an extra day. Adjust the plan if stairs or hot weather would make it demanding.''')
city('luoyang',
'''Luoyang places ancient capitals and Buddhist art alongside a modern city. Longmen is the anchor for many first visits, but museums and old-city food add context. Peony season changes the atmosphere considerably; outside it, the historical sights remain the main reason to stay.''',
'''Lijing Gate and old streets|An old-city gateway and surrounding lanes suited to an evening food walk. Expect a lively commercial area rather than an untouched town.
Sui-Tang Luoyang City National Heritage Park|Reconstructed monuments and archaeological interpretation. Distinguish modern reconstructions from surviving historic remains while exploring.
Guanlin Temple|A temple complex associated with Guan Yu, south of the centre. Can fit a southern-city day if travel time allows.
National Peony Garden|A seasonal flower destination. Choose it for the actual flowering period rather than expecting peonies throughout the year.
Luoyang Ancient Tombs Museum|A specialised museum for burial history and mural traditions. Check current access and allow a separate transfer from central sights.''',
'''Luoyang water banquet|A succession of soup-based and sauced dishes, traditionally shared. A smaller selection may suit a couple better than a full banquet.
Beef or mutton soup|A local breakfast tradition, often served with bread. Ask about portions and seasoning before adding chilli.
Jiangmian|Noodles in a fermented, tangy broth. Try a small bowl if you are unfamiliar with the flavour.''',
'''Old city / Lijing Gate|Useful for evening food and historic streets, with travel needed for Longmen.
Luoyang Longmen station area|Convenient for fast trains and southern sights; less suited to spontaneous old-city evening walks.''',
'''Luoyang Longmen is the main high-speed station for many visitors; central Luoyang station is separate. Check the station name on every ticket.''',
'''Use the metro where it suits your route and vehicles for outlying sites. Longmen involves outdoor walking after arrival.''',
'''Shaolin and Mount Song are separate excursions toward Dengfeng. They should not be squeezed into a full Longmen day.''',
'''Art and context|Give Longmen a generous visit, then keep the evening light. Use another day for Luoyang Museum and the old streets.
A seasonal addition|Choose a peony garden in bloom or a specialist heritage site. Reserve a separate day if continuing toward Shaolin.''')
city('datong',
'''Datong is an excellent base for Buddhist art and northern architecture. The restored old centre is easy to understand on foot, while the cave temples and suspended monastery lie outside it. A successful visit separates these excursions instead of turning every day into a long road circuit.''',
'''Nine Dragon Screen|A colourful glazed architectural screen in the old city. A compact stop that fits naturally into a central walking route.
Shanhua Temple|Historic Buddhist halls and sculpture near the southern old city. A useful contrast with Huayan Temple.
Datong City Wall|A restored wall circuit and viewpoints over the old centre. Choose a section rather than feeling obliged to walk the entire perimeter.
Datong Museum|Regional archaeology and historical context. Check the location and opening arrangements before adding it to an old-city day.
Hengshan|A separate mountain outing near Hunyuan. Combine only with nearby plans and allow for stairs, weather and return travel.''',
'''Knife-cut noodles|Thick wheat noodles shaved into the pot and served with varied toppings. A satisfying, inexpensive main meal.
Yellow-rice cakes|Millet-based cakes, often fried. A rich local snack to share alongside a lighter dish.
Shaomai|Steamed dumplings with pleated tops and regional fillings. Confirm the filling rather than assuming a southern-style recipe.''',
'''Inside the old city|Convenient for temples and evening walks. Confirm the nearest vehicle access point if arriving with luggage.
Datong South area|Useful for an early train, but it adds travel to the old-city sights and restaurants.''',
'''Datong South railway station is outside the historic centre. Yungang airport also requires a city transfer.''',
'''Walk between central temples and use a vehicle for Yungang. Winter weather can make outdoor waits and long walks uncomfortable.''',
'''The Hanging Temple and Hengshan are near Hunyuan, not beside Yungang. Treat the eastern and western excursions as separate days.''',
'''City and caves|Use one day for Huayan, Shanhua and old-city lanes. Give Yungang another generous block with time for the return journey.
Hunyuan extension|Add a separate Hanging Temple outing, with Hengshan only if your timing and walking ability allow.''')
city('pingyao',
'''Pingyao is most rewarding after the day-trip crowds thin out. Its lanes, courtyards and merchant history form a compact whole, while the painted sculpture in temples outside town adds another dimension. Stay long enough to see both the busy streets and quieter residential edges.''',
'''Ancient City Wall|An elevated look over the town's roofscape. Choose an accessible section and allow for steps and exposed weather.
County Government Office|Historic administrative courtyards that help explain how the town functioned. Take time for the sequence of spaces.
Confucian Temple|A quieter complex associated with education and ritual. A contrast to the commercial streets and banking museums.
City God Temple|Traditional halls and decorative details within the old city. Follow local worship and photography guidance.
Zhenguo Temple|A separate excursion outside town for early timber architecture and sculpture. Arrange transport with a clear return plan.''',
'''Pingyao beef|A prepared local beef speciality, often served sliced. Compare portions and packaging if buying it as a gift.
Wantuo|A local starch-based snack cut into pieces and seasoned. Recipes and hot or cold preparations vary.
Shanxi noodles|Try a noodle shape you have not eaten before, with vinegar on the side. Sauces commonly contain meat.''',
'''Old-city courtyard stay|Best for atmosphere and evening walks. Ask about heating, bathroom layout and luggage access.
Outside the walls|Often easier for vehicle access and modern rooms, but less immersive after dinner.''',
'''Pingyao Ancient City high-speed station is outside the old town; Pingyao station is different. Confirm the hotel's pickup or final walking directions.''',
'''Walking is the main way to explore the old centre. Comfortable shoes matter on uneven lanes and courtyard thresholds.''',
'''Shuanglin and Zhenguo temples require transfers outside the walls. Choose a realistic sequence rather than assuming they are neighbouring stops.''',
'''A full old-city day|Mix one banking museum, an administrative or temple complex and a wall section. Leave time to wander after dinner.
A second day|Choose Shuanglin or Zhenguo for sculpture and architecture, then return for a slower meal and any missed courtyards.''')
city('tianjin',
'''Tianjin is a rewarding short city break for river walks, varied architecture and northern snacks. The best route follows neighbourhoods rather than isolated landmarks. Its urban centre and Binhai district are far apart, so decide whether you want a central-city stay or a coastal extension.''',
'''Italian Style Town|A compact district of historic buildings and dining streets. Visit as part of a river walk rather than expecting a large preserved town.
Tianjin Eye|A river-spanning observation wheel and recognisable landmark. The riverside view can be enjoyable without joining the ride.
Tianjin Museum|Regional history and art in the cultural-centre district. A useful indoor alternative to a long architectural walk.
Jingyuan Garden|A historic residence associated with Puyi. A focused visit for travellers interested in the city's modern history.
Porcelain House|A highly decorated building covered with ceramic elements. Choose it for its unusual appearance and check what the interior visit includes.''',
'''Jianbing guozi|A freshly made savoury breakfast crepe with crisp or fried filling. Ask for chilli according to your preference.
Goubuli-style steamed buns|A well-known local bun tradition. Compare menus and portions rather than choosing only by a famous sign.
Fried dough twists|Crunchy mahua pastries sold as snacks and gifts. Check freshness and ingredients before buying a large box.''',
'''Five Great Avenues area|Good for slower architectural walks and cafes, with quieter streets away from major roads.
Hai River / central station area|Convenient for arrivals and river walks; confirm which station your train uses.''',
'''Tianjin station, Tianjin West and Tianjin South are distinct. Binhai airport and Binhai district add separate transfers.''',
'''Walk the central riverfront and use the metro between districts. A bicycle route may be pleasant only where traffic and road conditions suit you.''',
'''Binhai attractions are not central-city stops. Reserve a separate day if heading toward the coast.''',
'''Two easy city days|Pair the river and Italian Style Town on arrival. Spend another day around the Five Great Avenues and a museum or historic residence.
For a shorter visit|Choose architecture or the old commercial streets as your focus, with a relaxed local meal before your train.''')
city('qingdao',
'''Qingdao has several coastal personalities: the old hill streets, leafy villa districts and newer eastern waterfront. Choose a few connected sections rather than attempting the whole shoreline. Sea fog and wind can change the mood quickly, making museums and food useful alternatives.''',
'''St. Michael's Cathedral|A landmark in the old city with a photogenic surrounding square. Respect worship and visitor rules inside.
Signal Hill Park|A compact hill park with views over tiled roofs and the sea. Expect steps and choose a clear day.
May Fourth Square|A modern waterfront landmark in the eastern city. Pair it with nearby coastal paths rather than old-town sights on foot.
Olympic Sailing Centre|Marina views and open waterfront space near the modern centre. Good for a late-afternoon walk when conditions are pleasant.
Laoshan|A full-day mountain excursion outside the city. Choose one scenic sector and confirm transport and walking requirements.''',
'''Seafood|Clams, fish and other seafood appear on many menus. Confirm whether pricing is per portion or by weight.
Qingdao beer|A local brewing tradition encountered in restaurants and the museum. Pair tastings with a meal and arrange transport accordingly.
Seafood dumplings|Dumplings may contain fish, shellfish, pork or mixed fillings. Ask for the exact filling if you have dietary needs.''',
'''Old town / Qingdao station|Best for historic streets and western waterfront walks, though some roads are steep.
May Fourth Square area|Modern hotels and transport connections, with a different atmosphere from the old city.''',
'''Jiaodong airport is well outside the centre. Qingdao and Qingdao North stations serve different journeys.''',
'''Use metro links between the old and new centres, then walk short coastal sections. Hills make some inland shortcuts demanding.''',
'''Laoshan has multiple scenic areas. Choose one entrance and route rather than treating the mountain as a single quick stop.''',
'''Old coast and new coast|Combine Zhanqiao, old streets and Signal Hill on one day. Use another for Badaguan and a selected eastern waterfront section.
A mountain day|Add Laoshan only with a full day and suitable weather. Keep the beer museum as an urban alternative.''')
city('jinan',
'''Jinan is a city to explore through water: springs, canals and lakes link its historic core. The small lanes reward walking slowly, while hills and museums offer contrast. Spring flow and weather vary, so enjoy the surrounding gardens as well as the water itself.''',
'''Black Tiger Spring|A spring and waterside walking area near the old centre. Combine it with adjacent canals instead of making a separate vehicle trip.
Five Dragon Pool|A central park of pools and greenery. A quieter counterpoint to busier landmark spring gardens.
Thousand Buddha Mountain|A hill excursion south of the centre with temples and city views. Allow time for the ascent and weather.
Shandong Museum|Provincial history and art in the eastern city. Check exhibition and reservation arrangements before travelling.
Furong Street|A busy pedestrian food street near the historic core. Browse side lanes too and choose freshly prepared snacks.''',
'''Youxuan|A layered, coiled savoury pastry. Best tried fresh as part of breakfast or a snack stop.
Tianmo|A savoury millet-based soup despite the sweet-sounding name. Ingredients can include vegetables, peanuts and other additions.
Sweet-sour carp|A recognisable Shandong banquet dish, best shared. Ask about portion size before ordering alongside other plates.''',
'''Quancheng Square / old centre|Convenient for springs, lanes and dining, with many sights reachable on foot.
Eastern museum district|Useful for newer hotels and museum visits, but less convenient for repeated old-city walks.''',
'''Jinan, Jinan West and Jinan East are separate railway stations. Yaoqiang airport adds a road or public-transport transfer.''',
'''Walk between the central spring areas, using buses, taxis or rail transit for longer journeys where the route fits.''',
'''Mount Tai is a separate destination requiring its own transport and mountain plan. Do not attach it casually to a full Jinan day.''',
'''Follow the water|Pair Baotu Spring and Five Dragon Pool with the old lanes. Spend another block around Daming Lake and Qushuiting Street.
A different day|Choose Thousand Buddha Mountain in suitable weather or Shandong Museum for an indoor history visit.''')
city('harbin',
'''Harbin changes dramatically with the seasons. Winter brings ice attractions and short, very cold days; warmer months favour river walks and architecture. Plan the ordinary city first, then add seasonal events only after checking their actual dates and operating conditions.''',
'''Sun Island|A large park area across the river, with different summer and winter experiences. Confirm which section or event you intend to visit.
Ice and Snow World|A seasonal winter attraction requiring a dedicated outing. Opening dates and conditions vary; do not assume it exists year-round.
Lao Daowai|Older commercial streets and Chinese-Baroque-style architecture. Explore thoughtfully, distinguishing restored visitor areas from working neighbourhoods.
Heilongjiang Provincial Museum|Regional collections that add context to an architectural city visit. Check current exhibitions and access.
Stalin Park|A riverside promenade near Central Street. A good short walk, adjusted for wind, temperature and river conditions.''',
'''Guobaorou|Crisp pork pieces with a sweet-sour coating. A classic shared plate in northeastern restaurants.
Harbin red sausage|A local smoked-sausage tradition. Check ingredients, storage and customs restrictions before considering it as a take-home gift.
Northeastern dumplings|Generous boiled dumplings with meat or vegetable fillings. Order gradually: portions can be substantial.''',
'''Central Street / Daoli|Convenient for architecture, food and river walks. Check heating and room comfort for winter visits.
Harbin West station area|Practical for an early train, but farther from the historic visitor core.''',
'''Taiping airport, Harbin station and Harbin West have different transfers. Allow extra time in winter weather.''',
'''Use indoor breaks between short walks in cold weather. Metro and taxis help connect districts without long outdoor exposure.''',
'''Ice attractions and Sun Island are across the river from much of the old centre. Confirm event access and return transport before setting out.''',
'''City foundations|Pair Central Street, Saint Sophia and a short river walk. Use another day for a museum and Lao Daowai.
Seasonal extension|Dedicate a separate block to a confirmed winter event, or enjoy Sun Island in warmer weather. Keep the schedule flexible.''')
city('shenyang',
'''Shenyang combines Qing-era landmarks with the story of an industrial metropolis. The imperial palace is compact compared with Beijing, leaving time for neighbourhood food and a museum. Outlying tombs and newer districts are best planned as separate blocks rather than a continuous walking route.''',
'''Marshal Zhang's Mansion|A historic residential complex connected with northeastern modern history. Pair it with nearby old-centre sights.
Fuling Tomb|A Qing imperial tomb in the eastern city. Allow a separate transfer and walking time through the grounds.
Liaoning Provincial Museum|A major provincial collection in the southern city. Check the exhibition programme and reservation process before travelling.
Xita neighbourhood|A district associated with Korean food and commercial life. Visit for a meal and street-level exploring rather than a single monument.
Industrial Museum of China|An introduction to industrial heritage in Tiexi. A different perspective from palaces and imperial tombs.''',
'''Laobian-style dumplings|A local dumpling tradition with varied fillings. Ask about ingredients and order a manageable number of portions.
Guobaorou|Crisp sweet-sour pork common across the northeast. Share it with vegetables or a lighter soup.
Korean-influenced cold noodles|A useful option around Xita, with broth and toppings varying by restaurant. Check whether beef or egg is included.''',
'''Zhongjie / old centre|Convenient for the palace, shopping streets and local meals, but some areas stay busy late.
Taiyuan Street / Shenyang station|Good for transport and hotel choice, with a journey needed to the palace district.''',
'''Taoxian airport, Shenyang and Shenyang North railway stations are separate hubs. Check the exact station before leaving the hotel.''',
'''Metro journeys connect major districts; group nearby sights on foot. Winter conditions can slow transfers and shorten comfortable outdoor visits.''',
'''Fuling and Beiling are different tomb complexes. Pick one if time is limited rather than rushing both between museums.''',
'''Imperial and modern|Pair the palace with Marshal Zhang's Mansion and an old-centre meal. Give Beiling another relaxed block.
An extra day|Choose the provincial museum or Tiexi industrial history according to your interests, with dinner around Xita.''')
city('dalian',
'''Dalian is a coastal city of plazas, hills and long waterfront roads. It suits a slower visit built around sea views and seafood rather than constant attraction entry. Historic central streets, southern coastal paths and distant resort areas need different transport plans.''',
'''Laohutan coast|A coastal district with viewpoints and visitor attractions. Decide whether you want a waterfront walk or a ticketed attraction before travelling.
Bangchuidao|A landscaped coastal area with sea views. Check current public access and choose it for an unhurried outdoor visit.
Donggang waterfront|A modern harbour-side district with broad promenades. Useful for an evening stroll when weather is pleasant.
Russian Style Street|A short historic-style commercial street near the centre. Pair it with nearby city architecture rather than making it a main-day destination.
Jinshitan|A full-day coastal excursion northeast of the centre. Choose a particular beach or geological landscape instead of trying to cover the whole area.''',
'''Seafood|Fish, clams and other shellfish dominate many local menus. Confirm portion, weight and cooking charge before ordering.
Dalian menzi|Pan-fried starch jelly with sauce. A local snack whose dressing often includes sesame and garlic.
Seafood dumplings|Fish and mixed seafood fillings are common, sometimes with pork. Ask what is inside before ordering a large plate.''',
'''Zhongshan Square / central station|Good for architecture, dining and transport, with limited immediate beach access.
Xinghai Square|More waterfront space and newer hotels; travel time increases for old-centre sightseeing.''',
'''Zhoushuizi airport and Dalian or Dalian North railway stations have different city transfers. Confirm your departure hub.''',
'''Use metro or vehicles between coastal districts, then walk a chosen section. Binhai Road is too long to treat as one casual stroll.''',
'''Jinshitan and Lushun are separate excursions in different directions. Select one based on your interests and available time.''',
'''City and coast|Spend a day around Zhongshan Square and the central streets. Use another for Xinghai and a manageable Binhai Road section.
A longer stay|Add Jinshitan for coastal scenery, keeping an indoor alternative if wind or rain changes the plan.''')
city('dunhuang',
'''Dunhuang is an oasis base for Buddhist art and desert landscapes. Its famous sights lie in different directions, and the western excursions involve long road days. Put cave reservations first, then arrange dunes and museums around the weather and the light.''',
'''Mingsha dunes|Sand landscapes adjoining the Crescent Lake area. Choose cooler hours and follow marked visitor routes; climbing sand is physically demanding.
Yumen Pass|A full-day western excursion when linked with suitable nearby heritage stops. Long travel distances matter more than the time at the monument.
Yangguan Pass|A separate desert heritage outing southwest of town. Allow time for interpretation and avoid expecting a large intact ancient fortress.
Yardang National Geopark|A full-day desert excursion with wind-shaped formations. Confirm the organised internal route and return transfer.
Shazhou market area|An evening district for food and souvenir browsing. Compare prices and ask before photographing vendors or craftwork.''',
'''Yellow noodles|A local wheat-noodle tradition, often served with meat or sauce. Ask about the accompanying dish and portion size.
Lamb dishes|Grilled and stewed lamb are common choices. Order vegetables or lighter sides to balance a meat-heavy meal.
Apricot drinks|A sweet local refreshment found around visitor areas. Check ingredients and whether it is freshly prepared or bottled.''',
'''Central Dunhuang / Shazhou|Convenient for meals and excursion pickups, with the widest choice for a short stay.
Crescent Lake area|Atmospheric for dune-focused visits but less convenient for town meals and some departures.''',
'''Dunhuang airport and railway station serve the oasis. Liuyuan is a different, much more distant rail stop; check your ticket carefully.''',
'''Use vehicles between the town, caves and dunes. Save pickup locations offline because sights are spread across open desert areas.''',
'''The western passes and Yardang require a dedicated long day. Avoid planning a same-evening flight after an ambitious desert circuit.''',
'''Art and landscape|Build one day around your Mogao reservation. Use another for the museum and dunes in suitable light and temperature.
Western extension|Add a carefully planned pass-and-desert route only with a spare full day. Keep food, water and return logistics organised.''')
city('lanzhou',
'''Lanzhou follows the Yellow River between hills, making riverside walking a natural introduction. It is also a useful rail hub, but deserves more than a hurried bowl of noodles. The provincial museum provides context for journeys farther along the Silk Road.''',
'''Zhongshan Bridge|A historic river crossing and landmark beside the northern hills. Pair it with a short waterfront walk.
Waterwheel Garden|An introduction to traditional river-powered irrigation devices. A compact stop along a wider riverfront day.
Five Springs Mountain Park|A hillside park with temples and paths south of the centre. Allow for steps and choose a manageable loop.
Zhangye Road|A central pedestrian shopping area with access to nearby food streets. A useful evening stop rather than a major historic attraction.
Bingling Temple|A full-day excursion to Buddhist grottoes near the Liujiaxia area. Boat and road arrangements depend on current operations and conditions.''',
'''Lanzhou beef noodles|Freshly pulled noodles in beef broth, often eaten for breakfast. Choose a noodle width and add chilli to taste.
Shouzhuayangrou|Simply prepared lamb served in pieces. A shared dish best paired with vegetables and bread.
Niangpi|Cool starch noodles with a tangy dressing. Check toppings and chilli before mixing the bowl.''',
'''Central riverfront|Good for bridge and promenade walks, with access to local food streets.
Lanzhou West station area|Useful for an early high-speed train but less atmospheric for a short city visit.''',
'''Zhongchuan airport is far from the centre. Lanzhou and Lanzhou West railway stations are different; match transfers to your actual ticket.''',
'''The city is long and narrow. Combine rail transit or vehicles for east-west travel with walking on selected river sections.''',
'''Bingling Temple requires a separate day with checked transport arrangements. Labrang is better planned as an onward regional stay.''',
'''A river-city pause|Visit the provincial museum, then choose a central river walk. Spend another morning around the bridge and White Pagoda Park.
With more time|Add Bingling Temple if current transfers work, keeping a buffer before onward rail travel.''')
city('xining',
'''Xining brings together provincial museums, markets and living religious communities at the edge of the plateau. Use the city as a place to slow down before longer regional journeys. Qinghai Lake and monasteries outside the centre need their own transport plans.''',
'''Qinghai Tibetan Culture Museum|A specialised introduction to Tibetan cultural and artistic traditions. Check the exhibition location and allow focused viewing time.
Beishan area|A northern hillside religious and historic area. Check which sections are open and expect changes in level.
People's Park|An everyday city park for a gentle walk and a pause between museum visits.
Mojia Street area|A central food-browsing district. Choose busy vendors preparing food to order and compare menus before sitting down.
Qinghai Lake|A full-day trip or longer regional stay. Choose a specific shore and route; the lake is too large for a casual add-on.''',
'''Qinghai yoghurt|A local dairy speciality often served plain with sugar separately. Ask about toppings and storage if buying takeaway.
Niangpi|Cool starch noodles with spicy or tangy seasoning. A common light meal or snack.
Hand-grabbed lamb|Simply prepared lamb in generous portions. Share it with bread and vegetable dishes.''',
'''Central Xining|Convenient for food and urban sightseeing, with more flexibility than staying beside an outlying attraction.
Railway station area|Practical for an early departure, but check street noise and access before booking.''',
'''Caojiabao airport is outside Xining. Xining railway station is the key hub for many onward rail journeys.''',
'''Use buses or taxis for spread-out city sights and walk within central areas. Allow a gentle pace rather than packing the arrival day.''',
'''Kumbum Monastery and Qinghai Lake are different excursions. Check weather, road conditions and current visitor arrangements before a long regional day.''',
'''City context|Start with a museum and a short neighbourhood walk. Give Kumbum a separate outing with time to observe respectfully.
A lake extension|Add a planned Qinghai Lake day or overnight route. Do not schedule an ambitious circuit immediately before a fixed departure.''')
city('urumqi',
'''Ürümqi is a gateway to Xinjiang, but the region is far too large to explore from one hotel. Spend time with museum collections and local food, then choose a specific mountain or onward journey. Confirm current visitor access and transport arrangements for each regional leg.''',
'''People's Park|A central green space for an easy city walk. A useful pause between museums and food stops.
Shuimogou Park|A park district with water and greenery outside the busiest centre. Allow time for the local transfer.
Heavenly Lake|A full-day mountain excursion beyond the city. Weather, managed transport and walking determine how much you can see.
Southern Pastures|A separate countryside outing toward the Tian Shan foothills. Choose a defined destination and return arrangement rather than a vague pasture tour.
Tianshan Grand Canyon|A full-day scenic excursion with mountain landscapes. Check the specific visitor route, access and transport before departure.''',
'''Polo|Rice cooked with carrots and commonly lamb. A substantial meal; ask about meat and portion size.
Lagman|Pulled noodles with a vegetable-and-meat topping. Recipes and spice levels vary between restaurants.
Nang bread|Baked bread in many shapes and textures. Buy small quantities fresh and pair it with a meal rather than treating every type as identical.''',
'''Central museum / park districts|Useful for a city-focused stay and varied transport connections. Confirm accommodation arrangements directly.
Railway station area|Practical for an early onward journey but requires transfers for many central visitor stops.''',
'''Confirm the airport name and terminal on your booking. Ürümqi station and Ürümqi South are separate rail locations.''',
'''Use the metro where it serves your route and vehicles elsewhere. Keep destination names and hotel details saved in Chinese.''',
'''Heavenly Lake, the southern foothills and Turpan are separate journeys. Confirm current access, identification needs and return logistics with providers.''',
'''A measured city start|Give the regional museum a generous visit, then explore a park and local food. Browse the bazaar area on a separate block.
Choose one landscape|Add Heavenly Lake or a southern mountain excursion. Plan farther Xinjiang destinations as new travel legs with their own accommodation.''')
city('changsha',
'''Changsha combines major archaeological collections with a lively evening food culture. Museum reservations, river geography and summer heat shape a good visit. Cross the river deliberately for Yuelu rather than repeatedly commuting between unrelated stops.''',
'''Orange Isle|A long island park in the Xiang River. Choose a realistic walking section and check local access conditions.
Yuelu Mountain|Wooded slopes, historic sites and viewpoints west of the river. Give the paths time and expect climbs.
Tianxin Pavilion|A historic landmark beside a surviving city-wall section. A compact cultural stop near the centre.
Taiping Street|A busy old-style shopping and snack street. Explore it with nearby lanes and expect crowds at popular hours.
Changsha Museum|Regional city history in the northern cultural district. An indoor alternative or complement to Hunan Museum.''',
'''Stinky tofu|Fermented tofu served freshly fried with sauce. Try a small portion first; toppings can be spicy.
Rice noodles|A local breakfast staple with varied meat and vegetable toppings. Specify chilli preferences before the bowl is dressed.
Steamed fish head with chopped chilli|A shared Hunan dish with a strong chilli flavour. Check fish size and price before ordering.''',
'''Wuyi Square area|Convenient for food and nightlife, but request a quiet room if sensitive to late noise.
Yuelu / university side|Good for western-bank sights and a slower stay, with river crossings for central nightlife.''',
'''Huanghua airport and Changsha South high-speed station connect through different transport options. Changsha station is a separate central hub.''',
'''Use metro journeys to cross between districts, then walk local clusters. Riverfront distances are longer than they appear on a simple map.''',
'''Shaoshan is a separate excursion. Do not add it after a full museum-and-mountain day.''',
'''Collections and food|Build a day around Hunan Museum and keep the evening for a relaxed food walk. Avoid rushing multiple museum visits together.
Across the river|Combine Yuelu Academy with a manageable mountain route. Give Orange Isle its own time if walking the longer sections.''')
city('wuhan',
'''Wuhan is a city of rivers and separate urban centres. Hankou streets, Wuchang landmarks and East Lake each deserve a coherent block of time. Breakfast is an essential part of the visit, while repeated cross-river transfers can quietly consume the day.''',
'''Guiyuan Temple|An active Buddhist complex in Hanyang. Allow a quiet visit and respect photography guidance.
Hankou riverfront|Broad riverside public space and historic commercial streets nearby. Choose a section rather than walking the whole embankment.
Jianghan Road|A pedestrian shopping street with historic buildings. Pair it with nearby Hankou lanes and a meal.
Qingchuan Pavilion|A historic riverside site with views toward the Yangtze. A useful Hanyang stop rather than a cross-city detour.
Tanhualin|A compact district of old streets, cafes and cultural spaces in Wuchang. Explore at street level between larger landmarks.''',
'''Hot dry noodles|Noodles coated in sesame-based sauce, commonly eaten for breakfast. Mix thoroughly and ask about chilli and toppings.
Doupi|A layered breakfast dish with glutinous rice and savoury fillings. Meat and egg are common ingredients.
Lotus-root soup|A regional comfort dish, often simmered with pork ribs. Confirm the broth if seeking a vegetarian meal.''',
'''Jianghan Road / Hankou|Good for breakfast, historic streets and evening river walks.
Wuchang / near East Lake|Useful for museums and lake time, with longer journeys to Hankou dining districts.''',
'''Wuhan, Hankou and Wuchang railway stations are different. Tianhe airport is another transfer; always check the exact arrival and departure hub.''',
'''Use metro crossings between major districts. Walk within one riverbank or lake sector instead of zigzagging across the city.''',
'''East Lake is extensive. Select a specific greenway or visitor area and arrange the return route before a long walk.''',
'''Two sides of Wuhan|Use one day for the museum and a selected East Lake section. Spend another around Yellow Crane Tower and Wuchang streets.
A food-focused extension|Start with breakfast in Hankou, then explore Jianghan Road and the riverfront without another cross-river transfer.''')
city('zhengzhou',
'''Zhengzhou is a practical transport hub with important archaeological context of its own. Give the provincial museum time before heading toward the more famous sights around Dengfeng or Luoyang. Those places need dedicated travel blocks rather than being treated as suburbs.''',
'''Shang Dynasty city-wall remains|Earthwork remains that reveal the city's much older past. Best appreciated with historical context rather than as a grand intact wall.
Zhengzhou Museum|Local history and archaeological collections. Check the branch and exhibitions before travelling across the city.
Yellow River Scenic Area|A separate outing north of the centre for river landscapes and monuments. Allow for extensive grounds and local transfers.
Songyang Academy|A full-day Dengfeng excursion when paired with a nearby compatible stop. A historic academy at the foot of Mount Song.
Mount Song|A dedicated mountain day around Dengfeng. Choose a particular route and avoid assuming all entrances are beside Shaolin.''',
'''Huimian|Broad noodles in a rich broth, commonly with lamb. A filling one-bowl introduction to Henan food.
Hulatang|A peppery breakfast soup with varied ingredients. Ask about meat and spice before ordering.
Guotie|Pan-fried dumplings with crisp bases. Fillings vary; order a small plate alongside soup or vegetables.''',
'''Erqi / central station|Convenient for older commercial streets and local food, but traffic can be busy.
Zhengdong / East station|Practical for high-speed rail and newer hotels, with transfers to older central sights.''',
'''Xinzheng airport, Zhengzhou station and Zhengzhou East serve different arrivals. Match your hotel location to the actual rail ticket.''',
'''The metro helps connect urban districts. Museum locations and older archaeological remains are not all in the same walking area.''',
'''Shaolin and Mount Song lie near Dengfeng. Arrange a dedicated excursion or overnight stay with a clear return plan.''',
'''City context|Visit Henan Museum, then choose a central archaeological or neighbourhood walk. Keep time for a noodle meal.
Dengfeng day|Choose Shaolin plus a realistic nearby stop, or a mountain route. Avoid combining a strenuous climb with a rushed evening train.''')
city('fuzhou',
'''Fuzhou offers a slower Fujian city stay of lanes, banyan shade, temples and riverfront neighbourhoods. Its old centre and the districts across the Min River have different atmospheres. The coast, mountains and inland tea country should be planned as separate journeys.''',
'''Fujian Museum|Provincial collections near the West Lake area. A useful introduction before exploring other parts of Fujian.
Gushan|A hill-and-temple excursion east of the centre. Expect steps and leave time for the return journey.
Xichan Temple|An active Buddhist temple with courtyards and architectural details. Keep the visit respectful and unhurried.
Shangxiahang|A restored historic commercial district with lanes and waterside spaces. Pair it with nearby riverfront exploring.
Yu Mountain|A central hill with historic sites and shaded paths. A manageable contrast to the busy old commercial streets.''',
'''Fuzhou fish balls|Fish-paste balls often enclosing a pork filling. Ask about the centre rather than assuming they contain only fish.
Rouyan|Meat-filled dumplings with an unusual thin wrapper made using pork. They are not a vegetarian wonton alternative.
Dingbianhu|A rice-batter soup with varied savoury additions. A good breakfast choice; seafood ingredients may be present.''',
'''Dongjiekou / old centre|Convenient for lanes, food and central sightseeing, with strong transport access.
Yantai Hill / Cangshan|Good for atmospheric streets and cafes, with river crossings for northern-city attractions.''',
'''Changle airport is outside the centre. Fuzhou and Fuzhou South railway stations are separate; check the station on your ticket.''',
'''Use metro journeys between districts and walk selected historic neighbourhoods. Shaded breaks help in hot, humid weather.''',
'''Mount Wuyi and the tulou are separate regional destinations. Do not treat them as quick additions to a city day.''',
'''Historic neighbourhoods|Pair Three Lanes and Seven Alleys with West Lake or the museum. Spend another day around Shangxiahang and Yantai Hill.
A greener extension|Choose Gushan for a dedicated outdoor block, keeping a temple or museum alternative for poor weather.''')
city('quanzhou',
'''Quanzhou is a city of maritime connections and living religious traditions. Temples, a mosque, old trading streets and everyday food sit close together in the historic core. Take time to understand the sites instead of reducing them to a quick photo circuit.''',
'''Tianhou Temple|A temple associated with the sea goddess Mazu and maritime life. Observe worship respectfully and look for the architectural details.
Quanzhou Maritime Museum|Context for the city's trading networks and religious diversity. A strong complement to walking the historic centre.
Qingyuan Mountain|A hill excursion with the famous Laozi stone figure and walking routes. Give it a separate half-day or longer.
Luoyang Bridge|A historic stone bridge north of the centre. A separate transfer makes it better suited to an unhurried extra day.
Guanyue Temple|A busy active temple near the historic core. Visit with consideration for worshippers and avoid blocking ritual spaces.''',
'''Mianxianhu|A fine-noodle soup with selectable additions. Meat, seafood and offal toppings vary between stalls.
Quanzhou zongzi|Glutinous-rice parcels commonly filled with meat and other savoury ingredients. A substantial snack rather than a light bite.
Ginger duck|Duck cooked with plenty of ginger, usually shared. Check the portion size before ordering for a small group.''',
'''West Street / old centre|Best for early and evening walks, but lanes may limit vehicle access and rooms can be noisy.
Fengze|More modern hotels and convenient city transfers, with a journey needed for historic-core wandering.''',
'''Jinjiang airport is outside the old centre. Quanzhou railway stations serve different routes, so use the exact name on your ticket.''',
'''Walk the historic core and use buses or taxis for outlying sights. Build breaks into hot-weather temple and street visits.''',
'''Qingyuan Mountain, Luoyang Bridge and coastal villages are separate outings. Avoid adding all of them to a full old-city day.''',
'''Maritime city|Pair Kaiyuan and West Street, then use another block for Qingjing Mosque, nearby temples and local food.
Beyond the lanes|Choose the Maritime Museum plus a short central walk, or a separate Qingyuan Mountain outing.''')
city('sanya',
'''Sanya is a collection of bays with different hotel styles and transfer distances. Choose your base around how you want to spend most days: accessible city dining, resort time or a quieter beach setting. A good beach holiday leaves room for weather rather than filling every day with attractions.''',
'''Sanya Bay|A long urban coastline suited to evening walks. Choose a section near your base instead of trying to cover the whole bay.
Haitang Bay|A resort-focused coast farther from the urban centre. Good for hotel time; do not assume every stretch is suitable for swimming.
Wuzhizhou Island|A separate island day trip with boat and activity arrangements. Weather can affect access and the experience.
Luhuitou|A hilltop park with views over the city and bays. Choose cooler hours and allow for the uphill approach.
Tianya Haijiao|A coastal landmark park west of the city. Pair it only with nearby plans rather than a cross-city beach circuit.''',
'''Hainan chicken|Simply prepared chicken served with rice or side dishes. Sauces vary and can be served separately.
Coconut chicken hotpot|A shared chicken broth with coconut flavour. Follow the restaurant's cooking instructions before eating ingredients.
Qingbuliang|A sweet dessert with assorted beans, fruit and other toppings, often in coconut milk. Check the ingredients before ordering.''',
'''Dadonghai / urban Sanya|Convenient for restaurants and shorter city transfers, with a busier beach atmosphere.
Yalong Bay / Haitang Bay|Resort-oriented stays with more time spent at the hotel. Check the actual beach conditions and transfer distances.''',
'''Phoenix airport and Sanya railway station require different transfers to each bay. Confirm the hotel's district before judging travel time.''',
'''Use vehicles between bays and walk locally. Moving repeatedly between resort areas can consume much of a day.''',
'''Island trips and western coastal attractions need separate planning. Follow local swimming flags and weather guidance rather than assuming all beaches are equivalent.''',
'''A relaxed first stay|Keep the arrival day at your chosen bay. Add Luhuitou or a city meal on another day without changing beaches repeatedly.
Choose one outing|Select Nanshan, Tianya Haijiao or an island trip according to your interests, and retain a weather-flexible resort day.''')
city('haikou',
'''Haikou is an urban introduction to Hainan, with arcaded streets, neighbourhood breakfast and provincial history. It offers a different experience from Sanya's resort bays. Use it for cultural walks and selected coastal or volcanic excursions rather than expecting every hotel to be a beach retreat.''',
'''Temple of Five Lords|A historic complex linked with officials exiled to Hainan. A compact cultural visit near other southern-city sites.
Qiongtai Academy|A traditional academy in the older Qiongshan area. Pair it with nearby heritage stops rather than a separate cross-city journey.
Haikou volcanic landscape|A full-day or generous half-day excursion southwest of the city. Expect outdoor walking and choose a defined visitor route.
Wanlu Park|A large urban green space near the coast. Useful for a gentle walk in cooler hours.
Hai Rui's Tomb|A historic memorial site associated with the Ming official. A focused stop for visitors interested in Hainan's cultural history.''',
'''Hainan rice noodles|Local rice noodles with savoury toppings and dressing. Seafood and meat additions vary by shop.
Laoba tea|An everyday tea-house tradition with small snacks and bakery items. Sit for a while rather than treating it as takeaway coffee.
Wenchang chicken|A Hainan speciality often served simply with dipping sauces. Ask about portion size and accompaniments.''',
'''Qilou / old centre|Good for arcaded streets and local food, though older buildings may have varied room standards.
Wanlu Park / coastal city area|More contemporary hotels and open space, with transfers needed for old-town meals.''',
'''Meilan airport connects with island rail services. Haikou East and Haikou station are different; the latter is farther west.''',
'''Use walking within the old streets and buses or taxis for spread-out sights. Heat and rain make midday breaks useful.''',
'''The volcanic area and mangrove excursions need dedicated transfers. Sanya is a separate stay or rail journey rather than an urban side trip.''',
'''City introduction|Explore Qilou streets and a tea house, then use another block for Hainan Museum and the Qiongshan heritage area.
Outdoor extension|Choose the volcanic landscape or a coastal park day according to weather. Keep the evening free for local food.''')
city('wuyishan',
'''Wuyishan is about the relationship between river, cliffs and tea. Base yourself for the scenic area rather than assuming the city centre is the attraction. Choose a few complementary routes and leave space for a tea session instead of attempting every climb.''',
'''Dahongpao tea trail|A walking area associated with the famous rock-tea tradition. Use it to understand the landscape as well as taste the tea.
Wuyi Palace|A cultural area near the river and scenic routes. A gentler stop to balance a day with a steep climb.
Water Curtain Cave area|A separate scenic walking sector with cliffs and tea-country surroundings. Check route conditions and allow time for the return connection.
Roaring Tiger Rock|A steep scenic route for walkers comfortable with stairs. Choose it as an alternative climb rather than stacking it after Tianyou.
Yixiantian|A narrow rock passage in the scenic area. Consider crowding, confined space and slippery steps before including it.''',
'''Wuyi rock tea|Locally associated oolong teas vary widely in taste and price. Agree on tasting and purchase terms before a long session.
Smoked goose|A regional speciality with a strong flavour, often served with chilli. Ask about spice level before ordering.
Bamboo-shoot dishes|Seasonal shoots appear in local cooking, often with meat. Confirm the preparation if you prefer a lighter or meat-free dish.''',
'''Sangu resort area|A practical visitor base with restaurants and access toward the scenic entrances.
Wuyishan urban centre|Useful for city services, but adds transfers if every day is focused on the scenic area.''',
'''Check the exact railway station, such as Nanping City or Wuyishan North, and arrange the onward transfer to your base.''',
'''The scenic area combines managed transport and walking. Separate entrances, climbs and raft departure points need a planned sequence.''',
'''Rafting is weather- and operation-dependent. Keep a land-based alternative and confirm the correct departure point and time.''',
'''River and cliffs|Give Tianyou a dedicated walking block. Put the Nine Bend River on a separately confirmed slot rather than rushing between the two.
Tea-country day|Choose one tea-country walk and an unhurried tasting. Add another climb only if weather and energy make it worthwhile.''')
city('jingdezhen',
'''Jingdezhen is most rewarding when you follow the making of porcelain, not just the finished objects. Museums give context; workshops and markets reveal contemporary practice. Leave room in the itinerary for browsing and conversations, and plan packing before buying fragile pieces.''',
'''China Ceramics Museum|A broad introduction to ceramic history and technique. Useful before shopping, so shapes and glazes have more meaning.
Ancient Kiln Folk Customs Museum|Kiln structures and craft interpretation in a dedicated visitor setting. Check which demonstrations are actually scheduled.
Sanbao village|A spread-out ceramics and creative district outside the centre. Plan local transfers and confirm workshop visits in advance.
Yaoli|A full-day village excursion for historic streets and a greener landscape. It requires a separate road journey from central Jingdezhen.
Fuliang Ancient County Office|A heritage outing north of the city that offers context beyond ceramics. Combine only with geographically compatible stops.''',
'''Jiaozi ba|A local snack with a rice-based wrapper and savoury fillings. Ask about meat and chilli before choosing a portion.
Lengfen|Cool starch noodles with seasoning. A simple snack whose chilli level and toppings vary.
Jiangxi-style home cooking|Local meals often feature rice, vegetables and strongly seasoned meat or fish. Request mild preparation early if needed.''',
'''Imperial kiln / central city|Good for museum access and older streets, with a range of small hotels.
Taoxichuan / creative districts|Useful for contemporary ceramics and evening browsing. Check actual market dates rather than assuming stalls operate every night.''',
'''Jingdezhen North station and Luojia airport serve arrivals outside the main museum streets. Confirm your accommodation's exact district.''',
'''Use vehicles between museum and workshop districts, then walk locally. Sanbao is spread out and is not one compact indoor market.''',
'''Yaoli needs its own excursion day. For workshop visits, confirm language, duration, firing and shipping arrangements before paying.''',
'''From history to making|Visit the ceramics museum before the imperial kiln area. Use another day for a confirmed workshop and Taoxichuan browsing.
A third day|Choose Sanbao for contemporary studios or Yaoli for village scenery. Keep time to inspect, pack and document any purchases.''')

raw=json.loads((ROOT/'src/lib/travel/cities.json').read_text())
sources=json.loads((ROOT/'docs/research/city-sources.json').read_text())
assert set(records)=={c['slug'] for c in raw},set(c['slug'] for c in raw)-set(records)
for c in raw:
 g=records[c['slug']]
 g['sources']=[{'label':'TravelChinaGuide · '+p['kind'].title(),'url':p['url']} for p in sources[c['slug']]['pages']]
 if c['slug']=='wuyishan':g['sources']=[{'label':'TravelChinaGuide · Mount Wuyi','url':'https://www.travelchinaguide.com/attraction/fujian/wu-yi-shan.htm'}]
 g['reviewedAt']='2026-09-25'
 g['status']='Editorial planning notes; confirm current access, reservations and transport before booking.'
 assert len(g['sights'])==5 and len(g['foods'])==3 and len(g['areas'])==2
 assert not set(h['name'] for h in c['highlights']) & set(h['name'] for h in g['sights'])
(ROOT/'src/lib/travel/guides.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {len(records)} guides, {sum(len(c["highlights"])+len(records[c["slug"]]["sights"]) for c in raw)} sight entries.')
