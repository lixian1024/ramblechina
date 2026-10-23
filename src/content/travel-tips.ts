import type {Locale} from '@/i18n/locales';

type Copy = {en: string; zh: string};
type Section = {id: string; title: Copy; body: Copy; sources: string[]};
export type TravelTip = {
  slug: string; checkedAt: string; title: Copy; description: Copy; intro: Copy;
  prepare: Copy[]; steps: Section[]; problems: Section[]; limitations: Copy;
  planning: Copy;
  sources: {id: string; label: Copy; url: string}[];
};
const text = (en: string, zh: string): Copy => ({en, zh});

export const travelTips: TravelTip[] = [
  {
    slug: 'forbidden-city-tickets', checkedAt: '2026-10-23',
    title: text('How to book Forbidden City tickets with a foreign passport', '持外国护照，怎样预约故宫门票？'),
    description: text('Find the official booking channel, prepare passport details and plan around a confirmed Palace Museum reservation, with a fallback when tickets are unavailable.', '找到故宫官方订票入口，备好护照信息，按已确认的预约安排行程；无票或订票失败时，也有下一步。'),
    intro: text('Put the reservation before the route. A day in Beijing can look sensible on a map and still fail at the museum gate. Use this checklist before treating the Forbidden City as a confirmed stop.', '先确认预约，再安排路线。地图上顺路的一天，也可能因为没有门票而无法执行。把故宫写成“已确认”的行程前，先完成下面的检查。'),
    prepare: [text('The original passport each visitor will carry, and its exact details.', '每位游客旅行时使用的护照原件及准确资料。'), text('Two possible visit dates and access to your booking account and email.', '两个可选参观日，以及能正常使用的订票账户和邮箱。'), text('An offline place to save the order and your chosen entrance.', '能离线保存订单和入口位置的文件夹。')],
    steps: [
      {id: 'channel', title: text('Start from the museum’s own website', '从故宫官网进入订票'), body: text('Open the official Visit page and follow “Book Tickets”; it links to bookingticket.dpm.org.cn. The museum also lists its official WeChat mini program. Avoid search advertisements promising guaranteed or special access.', '打开故宫官方 Visit 页面，点击“Book Tickets”，会进入 bookingticket.dpm.org.cn。官方也提供“故宫博物院”微信小程序。不要把搜索广告中的“保票”或“特殊通道”当成官方渠道。'), sources: ['visit', 'ticket-rules']},
      {id: 'date', title: text('Choose a date you can actually reserve', '核对能预约的日期'), body: text('The published rule opens reservations at 20:00 Beijing time seven days before the visit; there are no same-day sales. Mondays are normally closed, with statutory-holiday exceptions. Recheck the live calendar and closure notices before setting an alarm in your own time zone.', '官方公布的规则是参观前七日北京时间20:00开始预约，不售当日票；通常周一闭馆，法定节假日除外。设置当地时区提醒前，重新查看预约日历和闭馆公告。'), sources: ['ticket-rules']},
      {id: 'identity', title: text('Book for the people and documents travelling', '按实际游客和护照填写'), body: text('Foreign visitors need passport numbers for online booking. Check every visitor’s details, date, time slot and any separately ticketed galleries before confirming. Save the successful order; an open payment screen is not evidence that you have a ticket.', '外国游客网上订票需要提供护照号码。提交前逐人核对资料、日期、时段，以及是否选择另售票的展馆。保存成功订单；停留在付款页面，并不表示门票已订妥。'), sources: ['visit']},
      {id: 'arrival', title: text('Plan arrival at 午门, not the nearest palace wall', '按午门入口规划抵达路线'), body: text('Bring the original valid document used to book and enter at the Meridian Gate (午门), the south gate. Save that Chinese gate name. Leave room in your day for access checks, walking and rest; do not use the final-entry time as your target arrival.', '携带订票时使用的有效证件原件，从南门午门检票入院，离线保存“午门”这个名称。为安检、步行和休息留出余量，不要把停止入馆时间当作计划抵达时间。'), sources: ['ticket-rules']},
    ],
    problems: [
      {id: 'sold-out', title: text('No tickets for your date?', '当天没票怎么办？'), body: text('Keep the stop unconfirmed and check another date in the official calendar. Do not travel to the gate expecting same-day sales. Ask the planner to remove or move the stop while keeping your other confirmed arrangements.', '把这一站保留为“未确认”，在官方日历查看其他日期。不要到门口碰运气买当日票。可要求规划工具移除或移动故宫，同时保留其他已确认安排。'), sources: ['ticket-rules']},
      {id: 'booking-fails', title: text('Passport form or checkout fails?', '护照资料或付款环节失败？'), body: text('Check whether an order already exists before trying again. For unresolved ticketing questions, the museum publishes bookingticket@dpm.org.cn. Use its official support channel; a support request does not reserve a place. If cancelling, check the current rules in the original booking channel.', '重试前先检查是否已有订单。仍无法解决时，故宫公布的票务咨询邮箱是 bookingticket@dpm.org.cn，请通过官方渠道求助；发出咨询不代表已占用名额。需要取消时，在原订票渠道核对当前退订规则。'), sources: ['visit', 'ticket-rules']},
    ],
    limitations: text('We checked the public pages below, not a logged-in purchase or live inventory. Exhibitions, access arrangements and booking interfaces can change. Confirm the actual date, slot, eligibility and current notices with the museum; this guide and a generated itinerary do not reserve admission.', '本次核对的是下列公开页面，没有登录购票，也没有验证实时余票。展览、通行安排和订票界面可能变化。请向故宫确认实际日期、时段、资格和最新公告；本指南及生成的行程都不代替门票预约。'),
    planning: text('Tell the planner your confirmed visit date and slot, or say that tickets are still unconfirmed. Add walking limits and rest needs. It can help rearrange the day; it cannot secure tickets. The guest trial covers Shanghai; sign in for a Beijing plan.', '向规划工具说明已确认的参观日期和时段，或明确“门票尚未确认”，并补充步行限制和休息需求。工具可以协助调整当天安排，但不能获得门票。访客试用范围为上海；规划北京行程需登录。'),
    sources: [
      {id: 'visit', label: text('Palace Museum · official Visit page and booking link', '故宫博物院 · 官方参观页及订票入口'), url: 'https://intl.dpm.org.cn/visit.html'},
      {id: 'ticket-rules', label: text('Palace Museum · ticket and entry rules', '故宫博物院 · 订票及检票规则'), url: 'https://young.dpm.org.cn/en/category/279'},
    ],
  },
  {
    slug: 'china-train-tickets-passport', checkedAt: '2026-10-23',
    title: text('How to book China train tickets with a foreign passport', '持外国护照，怎样购买中国火车票？'),
    description: text('Use official 12306 channels, check passport verification and the exact station, and keep a practical fallback if registration or booking fails.', '使用12306官方渠道，核对护照核验状态及具体车站；注册、购票失败时，知道如何继续处理。'),
    intro: text('A train search result is not a ticket, and a city name is not a station. Resolve the passport and station details before building a tightly timed arrival day around a train you have not booked.', '查到车次不等于买到了票，城市名称也不等于车站名称。先处理护照核验和站名，再围绕尚未购票的列车安排紧凑的抵达日。'),
    prepare: [text('Your valid original foreign passport, its expiry date and an email you can access.', '有效外国护照原件、有效期，以及能正常接收邮件的邮箱。'), text('The exact departure and arrival stations, travel date and a second workable option.', '准确的出发站、到达站、乘车日期及第二个可行选择。'), text('Enough flexibility to resolve verification before the travel day.', '在乘车日前留出处理身份核验问题的余地。')],
    steps: [
      {id: 'register', title: text('Use the official English registration page', '使用官方英文注册页'), body: text('Start at www.12306.cn/en/ and choose Register. The English form currently accepts foreign passports and asks for name, passport number and expiry, birth date, nationality, gender and email. Follow its passport-name instructions rather than shortening your name to fit a guess.', '从 www.12306.cn/en/ 进入，选择 Register。英文表单目前接受外国护照，填写姓名、护照号码和有效期、生日、国籍、性别及邮箱。按页面的护照姓名规则填写，不要凭猜测缩写姓名。'), sources: ['registration']},
      {id: 'verify', title: text('Resolve identity checks before relying on a booking', '先确认身份核验状态'), body: text('Check the account and passenger verification prompts. China Railway’s Chinese identity notice says foreign-passport users can upload document photos online; unresolved checks can be handled at a station ticket counter with the original document. Do not assume a newly registered account is ready to buy.', '查看账户和乘车人的核验提示。铁路中文身份核验须知说明，外国护照用户可网上上传证件照片核验；无法解决时，可持证件原件到车站售票窗口办理。不要把注册成功等同于已经具备购票条件。'), sources: ['verification']},
      {id: 'search', title: text('Search the full station names', '按完整站名查车次'), body: text('Enter the date and both stations, then compare the departure time, arrival time and seat class. Keep station names in Chinese with your hotel address. As a planning precaution, allow separately for the trip to the station and the trip from your destination station; the train duration covers neither.', '输入日期和两端车站，核对出发时间、到达时间及席别。把中文站名和酒店地址一起保存。规划时另算前往出发站、从到达站去酒店的时间；列车运行时间不包含这两段。'), sources: ['faq']},
      {id: 'confirm', title: text('Confirm the order, then save the useful details', '确认订单后保存关键资料'), body: text('Follow the payment options actually offered to your account and check the final order status before retrying. Save the train number, date, both stations, departure time, carriage and seat. Use the official order tools for changes or refunds and check the terms shown for that ticket.', '按账户实际显示的支付选项操作，重试前先看最终订单状态。保存车次、日期、两端站名、出发时间、车厢和座位。需要改签或退票时使用官方订单工具，并查看该车票当时显示的条件。'), sources: ['faq']},
      {id: 'board', title: text('Take the document you booked with', '携带购票时使用的证件'), body: text('For an e-ticket, keep the booking information and show the valid ID used to buy it for station and train checks. An itinerary sheet is not a boarding credential. If a gate cannot read your passport, ask staff where to complete the check; allow extra time for queues and security.', '电子客票须保留购票信息，并在进出站和乘车查验时出示购票所用有效证件。行程信息提示不等于乘车凭证。闸机无法读取护照时，请工作人员指引核验位置，并为排队和安检留出余量。'), sources: ['faq']},
    ],
    problems: [
      {id: 'verification-fails', title: text('Verification or name entry is stuck?', '核验或姓名输入卡住？'), body: text('Follow the current account prompt and use the station-counter route with the original passport if it remains unresolved. The English FAQ and Chinese identity notice use different verification-status wording; do not treat an English status label alone as permission to buy. We have not tested verification turnaround for your document.', '按当前账户提示处理，仍未解决时持护照原件到车站窗口办理。英文FAQ和中文核验须知的状态措辞存在差异，不能只凭英文状态标签判断一定可以买票。本次未测试你的证件所需的核验时长。'), sources: ['faq', 'verification']},
      {id: 'no-train', title: text('No train or no confirmed seat?', '没查到车，或没有确认席位？'), body: text('Check the date and exact stations in the official search, then try another time or date. Do not infer that a missing result means the route never runs, or that a pending request guarantees a seat. Keep the transfer provisional and ask the planner to leave the arrival day flexible.', '先在官方查询中核对日期和具体站名，再尝试其他时段或日期。没有结果不代表这条线路永远不开；待处理请求也不保证有席位。把交通保留为未确认，并让规划工具为抵达日保留弹性。'), sources: []},
    ],
    limitations: text('This covers ordinary domestic planning with a foreign passport, not every identity document or international train. We checked public forms and rules, not a purchase, card acceptance, live seats or verification speed. The live account prompts and station instructions control; check current sale availability and change/refund terms for your exact ticket.', '本文面向持外国护照的普通境内铁路出行，不覆盖所有证件或国际列车。本次核对公开表单和规则，没有实际购票，也未验证银行卡受理、实时席位及核验速度。以当前账户提示和车站要求为准，逐票核对起售情况、改签及退票条件。'),
    planning: text('Give the planner the booked stations and times, or explicitly say the train is unbooked. Ask it to allow for station transfers, luggage and rest rather than filling the arrival day with fixed reservations. The guest trial covers Shanghai; sign in for a multi-city plan.', '把已购票的车站和时刻告诉规划工具；没买票时明确说明。要求预留车站接驳、行李和休息时间，避免在抵达日堆满固定预约。访客试用范围为上海；多城市行程需登录规划。'),
    sources: [
      {id: 'registration', label: text('China Railway 12306 · English registration form', '中国铁路12306 · 英文注册表单'), url: 'https://www.12306.cn/en/register.html'},
      {id: 'faq', label: text('China Railway 12306 · English ticketing FAQ', '中国铁路12306 · 英文购票FAQ'), url: 'https://www.12306.cn/en/faq.html?item=0'},
      {id: 'verification', label: text('China Railway 12306 · sales rules and identity-verification notice (Chinese)', '中国铁路12306 · 售票规则及身份核验须知'), url: 'https://kyfw.12306.cn/otn/gonggao/saleTicketMeans.html?linktypeid=means1'},
    ],
  },
];

export function findTravelTip(slug: string) {return travelTips.find(guide => guide.slug === slug);}
export function travelTipView(guide: TravelTip, locale: Locale) {
  const language = locale === 'zh' ? 'zh' : 'en';
  const section = (item: Section) => ({id: item.id, title: item.title[language], body: item.body[language], sources: item.sources});
  return {
    title: guide.title[language], description: guide.description[language], intro: guide.intro[language],
    prepare: guide.prepare.map(item => item[language]), steps: guide.steps.map(section), problems: guide.problems.map(section),
    limitations: guide.limitations[language], planning: guide.planning[language],
    sources: guide.sources.map(source => ({...source, label: source.label[language]})),
  };
}
