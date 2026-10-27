import type {Locale} from '@/i18n/locales';

export type MedicalText = {en: string; zh: string};
const text = (en: string, zh: string): MedicalText => ({en, zh});
export const medicalText = (value: MedicalText, locale: Locale) => value[locale === 'zh' ? 'zh' : 'en'];

export const medicalSources = [
  {id: 'cdc', label: text('CDC · preparing for medical care abroad', 'CDC · 跨境就医准备与风险'), url: 'https://wwwnc.cdc.gov/travel/page/medical-tourism', checkedAt: '2026-10-27'},
  {id: 'screening', label: text('US National Cancer Institute · CT, PET/CT and screening', '美国国家癌症研究所 · CT、PET/CT 与筛查'), url: 'https://www.cancer.gov/about-cancer/diagnosis-staging/ct-scans-fact-sheet', checkedAt: '2026-10-27'},
  {id: 'pumch', label: text('Peking Union Medical College Hospital · international patient services', '北京协和医院 · 国际患者服务与预约'), url: 'https://www.pumch.cn/en/medical_care.html', checkedAt: '2026-10-27'},
  {id: 'insurance', label: text('CDC Yellow Book · travel, health and evacuation insurance', 'CDC Yellow Book · 旅行、医疗与转运保险'), url: 'https://www.cdc.gov/yellow-book/hcp/health-care-abroad/travel-insurance.html', checkedAt: '2026-10-27'},
  {id: 'visa', label: text('Chinese Embassy in Iran · visa requirements (this consular district only)', '中国驻伊朗使馆 · 签证材料说明（仅该领区）'), url: 'https://ir.china-embassy.gov.cn/eng/lsfw_1/qzfw/', checkedAt: '2026-10-27'},
  {id: 'customs', label: text('Chinese government · change to health declarations, 2023 notice', '中国政府网 · 2023 年健康申报调整公告'), url: 'https://english.www.gov.cn/news/202310/31/content_WS6540a78ec6d0868f4e8e0d15.html', checkedAt: '2026-10-27'},
  {id: 'emergency', label: text('Beijing municipal government · emergency numbers', '北京市政府 · 紧急求助号码'), url: 'https://english.beijing.gov.cn/travellinginbeijing/quickguideontravelservices/traveltips/202108/t20210811_2466839.html', checkedAt: '2026-10-27'},
] as const;
type SourceId = typeof medicalSources[number]['id'];
type MedicalSection = {
  id: string;
  title: MedicalText;
  intro: MedicalText;
  questions: {id: string; title: MedicalText; body: MedicalText}[];
  actions: MedicalText[];
  sources: SourceId[];
};

export const medicalSections: MedicalSection[] = [
  {
    id: 'before-you-decide',
    title: text('Decide whether to travel for care', '先判断是否值得为就医出行'),
    intro: text('Start with the clinical need, then compare the whole journey. A lower advertised price or a shorter queue is only one part of the decision.', '先明确医疗需求，再比较整趟出行。宣传中的低价或较短排队时间，只是决策的一部分。'),
    questions: [
      {id: 'why-china', title: text('Why might someone consider care in China?', '为什么有人考虑来中国就医？'), body: text('The supplied articles discuss access to specialists, equipment, self-pay costs and fitting a consultation around an existing China visit. These are reasons to investigate, rather than guarantees. Ask the exact hospital about its ability to assess your case, appointment dates and a written estimate; compare these with options at home.', '原文提到专科资源、设备、自费费用，以及结合既有来华安排就诊等考虑因素。这些是值得询问的问题，不是确定优势。向具体医院确认是否能评估你的病情、可预约日期和书面费用估算，再与居住地的选择比较。')},
      {id: 'savings-waiting', title: text('Will I save money or be seen sooner?', '一定更便宜、一定更快吗？'), body: text('There is no universal saving or waiting time. International/VIP services can have different charges and queues from ordinary clinics. Add flights, accommodation, interpretation, time away from work and possible repeat visits. Ask separately about the consultation date, examination date, report date and any follow-up before deciding.', '没有适用于所有人的节省比例或等待时间。国际部、特需与普通门诊的收费和排期可能不同。应计入机票、住宿、口译、误工及可能的再次就诊，分别确认问诊、检查、出报告和复诊日期，再作决定。')},
      {id: 'urgent-care', title: text('What if the problem is urgent?', '病情紧急，还能等待来华就医吗？'), body: text('Seek local emergency assessment instead of postponing care to arrange an international trip. If already in mainland China and you need an ambulance, call 120; show your exact address to someone who can help you call. Do not wait for a booking agent, an email reply or this website.', '不要为了安排国际旅行而推迟紧急就诊，应在所在地及时求助。若已经在中国大陆，需要救护车可拨打 120；把准确地址出示给能协助拨打的人。不要等待中介、邮件回复或本网站处理。')},
    ],
    actions: [text('Discuss the purpose of the visit and fitness to travel with your treating clinician.', '与目前的接诊医生讨论就医目的及是否适宜旅行。'), text('Confirm the hospital, costs, entry route and follow-up before making non-refundable bookings.', '在购买不可退改的机酒前，确认医院、费用、入境安排和随访。')],
    sources: ['cdc', 'emergency'],
  },
  {
    id: 'care-options', title: text('Understand the care options', '了解项目与适用边界'),
    intro: text('A service being available does not establish that you need it. The right choice depends on an individual assessment and a plan for what happens afterwards.', '医院能开展某个项目，不代表你需要做。选择应基于个人评估，并提前考虑结果出来后如何继续处理。'),
    questions: [
      {id: 'second-opinion', title: text('Can I seek a specialist second opinion or diagnostic test?', '可以来做专科第二意见或诊断检查吗？'), body: text('Ask the hospital whether the relevant specialty can review your records and what additional information it needs. Send a concise clinical question, prior reports and available original images through its official secure channel. A second opinion may differ from the first; arrange how your current clinician will review it before changing treatment.', '先询问医院相关专科是否能审阅病历、还需要哪些资料。通过其官方安全渠道提交清楚的咨询问题、既往报告和可用的原始影像。第二意见可能与原诊断不同；改变治疗前，应安排现接诊医生一起评估。')},
      {id: 'screening-packages', title: text('Should I buy a whole-body scan or cancer-screening package?', '应该购买全身影像或癌症筛查套餐吗？'), body: text('More tests do not automatically mean better prevention. NCI notes that whole-body CT has not been established as effective screening for healthy people and may lead to unnecessary follow-up. CT and PET/CT involve radiation. Ask a qualified clinician which tests are indicated for your symptoms, history and risk; do not use a package as a substitute for that decision.', '检查越多不等于预防效果越好。美国国家癌症研究所指出，全身 CT 尚未被证明是健康人群有效的筛查方法，并可能引出不必要的后续检查。CT 与 PET/CT 涉及辐射。请合格医生结合症状、病史和风险判断检查指征，不要用套餐替代这个决定。')},
      {id: 'dental-aesthetic', title: text('What about implants, cosmetic procedures or a longer treatment course?', '牙科、医美及较长疗程要注意什么？'), body: text('Dental implants and cosmetic procedures require individual assessment, recovery and follow-up; an advertised short stay is not a completion or flight-clearance promise. Ask about staged treatment, materials, revisions and who can manage complications at home. Complex surgery, continuing cancer treatment and reproductive care need specialty-specific assessment, eligibility checks and continuity arrangements, rather than a generic travel template.', '种植牙和医美都需要个人评估、恢复与随访；宣传中的短期停留不代表治疗完成或获准乘机。确认分阶段治疗、耗材、返修，以及回国后谁能处理并发症。复杂手术、持续肿瘤治疗及生殖医疗需要专科评估、准入核实和连续照护安排，不能套用通用旅行模板。')},
    ],
    actions: [text('Ask what each proposed test or procedure is intended to answer, and what alternatives exist.', '逐项询问检查或治疗要解决什么问题，以及有无替代选择。'), text('Get the treatment stages, recovery requirements and follow-up responsibilities in writing.', '书面确认治疗阶段、恢复要求及随访责任。')], sources: ['screening', 'cdc'],
  },
  {
    id: 'hospitals', title: text('Choose a hospital and department', '选择医院、科室与院区'),
    intro: text('Look beyond the hospital name. Confirm the exact service, clinician and location that will handle your visit.', '不要只看医院名称。确认实际接诊的服务部门、医生和地点。'),
    questions: [
      {id: 'grade-3a', title: text('What does “Grade 3A” or 三甲 tell me?', '“三甲 / Grade 3A”意味着什么？'), body: text('三甲 is shorthand for 三级甲等, a hospital classification and assessment designation. It is one item to check, not proof that every specialty suits your case or that English support is available. Verify current registration and claimed assessment status through the hospital and the responsible health authority; accreditation also does not guarantee an individual outcome.', '“三甲”是“三级甲等”的简称，属于医院级别及评审信息。它是核查项目之一，不代表每个专科都适合你的病情，也不保证有英语服务。通过医院及主管卫生部门核实当前登记、评审情况；认证同样不保证个人治疗结果。')},
      {id: 'department-types', title: text('Ordinary outpatient, international/VIP or private care?', '普通门诊、国际 / 特需部和私立医院如何比较？'), body: text('Compare specialist capability, language support, appointment process, charges and insurance arrangements rather than assuming a category is always best. An international or VIP department may offer coordination but you must confirm the actual service. Ordinary clinics may also accept foreign patients; registration and interpretation arrangements vary. Private hospitals still require checks of clinician and facility credentials.', '按专科能力、语言服务、预约流程、收费和保险安排比较，不默认某一类一定最好。国际或特需部门可能提供协调服务，但仍须逐项确认。普通门诊也可能接收外国患者，登记与翻译安排因院而异。私立机构同样需要核查医生及机构资质。')},
      {id: 'official-hospital', title: text('Where can I start with an official hospital channel?', '可以从哪个医院官方渠道开始查询？'), body: text('As one example, Peking Union Medical College Hospital publishes an English international-patient page with booking and care processes. Its insurance links include older dated lists, so verify your exact policy directly. This is a starting point for enquiries, not a ranking, referral, availability check or endorsement of a treatment. Use the source link below and independently confirm the exact campus and department.', '例如，北京协和医院发布了英文国际患者服务页，包含预约和就诊流程。其保险链接含较早日期的名单，因此需要另外确认你的具体保单。这只是查询起点，不是排名、转诊、号源核验或治疗推荐。使用下方官方链接，并独立确认实际院区和科室。')},
    ],
    actions: [text('Confirm the clinician’s specialty, facility credentials, exact campus and foreign-passport registration route.', '确认医生专科、机构资质、实际院区和外国护照登记方式。'), text('Ask whether a professional interpreter, accessible facilities and written reports in your language can be arranged.', '询问能否安排医学口译、无障碍设施及所需语言的书面报告。')], sources: ['pumch', 'cdc'],
  },
  {
    id: 'appointments', title: text('Book and confirm the visit', '预约与书面确认'),
    intro: text('An enquiry is not an appointment. Keep a written record of the agreed department, dates, service and cancellation conditions.', '发出咨询不等于预约成功。保存科室、日期、服务及取消条件的书面记录。'),
    questions: [
      {id: 'booking-steps', title: text('What is a practical booking sequence?', '实际预约可以按什么顺序进行？'), body: text('Start from the hospital’s official website or published contact route. Ask what information it needs for a case review and passport registration. Obtain the proposed assessment or care plan, itemised estimate and written appointment confirmation. Check whether examinations are separately booked, whether a referral is needed, and how to contact the department if you are delayed. Do not send full records through an unverified social account.', '从医院官网或其公布的联系方式开始，询问病例评估和护照登记需要什么资料。取得拟定评估或诊疗方案、分项费用估算和书面预约确认。核对检查是否另约、是否需要转诊，以及迟到时如何联系科室。不要通过未经核实的社交账号发送完整病历。')},
      {id: 'diy-facilitator', title: text('Should I book directly or use a facilitator?', '自己预约，还是找第三方协助？'), body: text('Direct booking gives you direct contact with the hospital; you handle coordination and language arrangements. A facilitator may help with logistics and interpretation but adds fees and requires checks of its role, commissions, cancellation terms and access to your information. Neither route guarantees an appointment or outcome. Verify every hospital confirmation directly, keep medical fees separate from service fees and choose clinical decisions with the treating team.', '直接预约便于与医院直接联系，但需自己协调流程与语言。第三方可能协助交通、口译和沟通，也会增加费用，需要核实角色、佣金、取消条款及资料访问范围。两种方式都不保证号源或疗效。向医院直接核对每项确认，区分医疗费与服务费，临床决定与接诊团队商议。')},
      {id: 'cancelled-appointment', title: text('What if the appointment is cancelled or the scanner is unavailable?', '医生停诊或设备临时不可用怎么办？'), body: text('Contact the hospital through the original official channel. Ask for written confirmation of an alternative clinician/date, revised costs and the deposit refund or transfer rule. Recheck flights, accommodation and permitted stay before accepting. If no suitable replacement is confirmed, keep the visit unconfirmed and postpone or cancel the affected arrangements; do not pay an unverified agent for a “guaranteed” replacement.', '通过原医院官方渠道联系，索取替代医生或日期、费用变化及定金退款或转用规则的书面说明。接受前重新核对机酒和允许停留期。没有合适替代安排时，把就诊保留为未确认，推迟或取消受影响安排；不要向未经核实的中介支付“保证补号”费用。')},
    ],
    actions: [text('Keep your appointment reference, hospital contact, campus address in Chinese and cancellation terms offline.', '离线保存预约编号、医院联系方式、中文院区地址和取消条款。'), text('Before paying, match the payee and service to a confirmation from the hospital or contracted provider.', '付款前，将收款方和服务与医院或签约服务商的确认逐一核对。')], sources: ['pumch', 'cdc'],
  },
  {
    id: 'costs-insurance', title: text('Budget, pay and check insurance', '总预算、付款与保险'),
    intro: text('Compare complete costs in the same currency and for the same scope of care. A package price rarely answers every question.', '按同一币种、同一医疗范围比较完整费用。一个套餐价格往往不能回答全部问题。'),
    questions: [
      {id: 'real-budget', title: text('What should the total budget include?', '完整预算应包含哪些项目？'), body: text('Include consultation, examinations, treatment, anaesthesia, medicines, implants or other materials, reports, translation and follow-up. Add visa/document costs, flights, a companion if needed, accessible transport, accommodation, meals, insurance and possible extra nights or another visit. This guide does not publish current procedure prices: the supplied ranges have no verifiable hospital quotation date or consistent inclusions.', '计入问诊、检查、治疗、麻醉、药物、种植体等耗材、报告、翻译和复诊。再加上签证和证件、机票、必要陪同、无障碍交通、住宿、餐食、保险，以及可能延住或再次赴华的开销。本指南不发布现行项目价格：原文区间缺少可核实的医院报价日期和一致的包含范围。')},
      {id: 'quote-payment', title: text('What needs to be in the quote, and how can I pay?', '报价单要写清什么？医院如何收款？'), body: text('Request the currency, validity, included and excluded items, deposit, cancellation/refund rules and how additional care is authorised. Ask whether English reports, original images, interpretation and later reviews cost extra. Confirm accepted cards, transfer details and limits with the exact hospital; do not assume overseas cards or a mobile wallet will work. Obtain itemised receipts and verify account details independently before a transfer.', '索要币种、有效期、包含与不包含项目、定金、取消退款规则，以及追加诊疗如何获得授权。问清英文报告、原始影像、口译和后续复查是否另收费。向实际医院确认受理银行卡、转账信息和限额，不默认境外卡或移动钱包可用。保留分项票据，转账前独立核实账户。')},
      {id: 'insurance-cover', title: text('Does travel insurance cover planned treatment?', '旅行保险会支付计划中的治疗吗？'), body: text('Do not assume that emergency travel cover pays for a planned procedure. Ask your insurer in writing about the named treatment, pre-existing conditions, complications, extra accommodation, follow-up and medical evacuation. Check pre-authorisation, direct billing versus reimbursement, exclusions and required documents. A hospital’s insurer list is not approval for your particular claim; plan for costs you may need to pay yourself.', '不要把旅行紧急医疗保障当作计划治疗的付款承诺。书面询问保险方是否涵盖具体治疗、既往症、并发症、延住、随访和医疗转运。核对预授权、直付或报销、除外责任及所需材料。医院的保险名单不等于你的理赔获批，应为可能自付的费用作准备。')},
    ],
    actions: [text('Make a line-by-line budget and ask who pays if additional care or a second trip is needed.', '列出逐项预算，确认追加医疗或再次出行由谁承担。'), text('Keep the written quote and the insurer’s case-specific response before paying a deposit.', '支付定金前，保存书面报价及保险方针对本次就医的答复。')], sources: ['insurance', 'pumch'],
  },
  {
    id: 'entry-medicines', title: text('Check entry documents and medicines', '签证、入境与携带药品'),
    intro: text('Entry permission and hospital acceptance are separate checks. Confirm both for your nationality, residence, purpose and expected stay.', '能否入境与医院能否接诊是两项不同的核查。按国籍、居住地、来访目的及预计停留期分别确认。'),
    questions: [
      {id: 'visa-route', title: text('Which visa or visa-free route can I use for treatment?', '就医应申请什么签证，可以免签吗？'), body: text('Ask the Chinese embassy/consulate or visa centre responsible for your place of residence about medical treatment, accompanying relatives and the proposed length of stay. Do not assume tourist visa-free entry covers your medical purpose. The linked embassy example lists medical-treatment documents under S2, but its financial and accompanying-person requirements apply to that district and must not be treated as worldwide rules. Ask the hospital which supporting letter it can issue.', '向居住地所属中国使领馆或签证中心询问就医、陪同亲属和拟停留时长的适用安排，不默认旅游免签涵盖你的就医目的。下方使馆示例在 S2 类别下列出就医材料，但其中资金和陪同人数要求属于该领区，不应推广为全球统一规则。另问医院能开具哪些证明。')},
      {id: 'medicines', title: text('Can I bring my regular medicines?', '日常药物可以带入境吗？'), body: text('Prepare a list with generic names, doses and allergies, copies of prescriptions and medicines in their original packaging. Before departure, ask the relevant Chinese authorities about each medicine, quantity and any controlled-drug permit; check transit-country restrictions too. Keep necessary medicines accessible during travel within carrier rules. Do not stop or change prescribed medicines, fasting or insulin schedules on the basis of this guide; obtain instructions from your clinician.', '准备药品通用名、剂量、过敏清单、处方副本及原包装。出发前向中国有关主管部门核对每种药、数量及管制药品许可，并检查过境国家限制。按承运人规定随身携带必要药品。不要根据本指南自行停药、改药、空腹或调整胰岛素；向接诊医生索要具体指示。')},
      {id: 'health-declaration', title: text('Is the old mandatory health-declaration step still a universal checklist item?', '旧攻略中的“人人填写健康申报”还能照搬吗？'), body: text('No: the government’s 2023 notice removed routine universal health-declaration forms, while retaining reporting for specified infectious symptoms. It is a dated notice, not a live border check. Verify current customs notices and any requirements for your own health situation, medicines and route shortly before travel.', '不能照搬：政府 2023 年公告取消了普遍填报健康申明卡的要求，同时保留特定传染病症状的主动申报要求。这是有日期的公告，不是实时边境核验。临行前再次查看海关通知，并确认个人健康状况、药品和路线的当前要求。')},
    ],
    actions: [text('Ask your responsible consular office about the exact medical purpose and companion arrangements.', '向所属领事机构说明实际就医目的及陪同安排，取得针对性答复。'), text('Confirm medicine and stay requirements before booking; ask early what to do if care takes longer.', '订票前核实携药和停留要求，提前询问治疗延长时如何处理。')], sources: ['visa', 'customs', 'insurance'],
  },
  {
    id: 'travel-preparation', title: text('Prepare the trip without rushing care', '准备行程，为医疗留出余量'),
    intro: text('Work backwards from appointments confirmed by the hospital. Reports, recovery and follow-up need space in the plan.', '从医院实际确认的预约倒推旅行安排，为出报告、恢复和复诊留出时间。'),
    questions: [
      {id: 'preparation-timeline', title: text('What should I arrange before departure?', '出发前按什么阶段准备？'), body: text('Early: discuss the need to travel, gather records and contact the hospital. Before non-refundable purchases: confirm appointments, an estimate, entry documents and insurance. Closer to departure: reconfirm the department, interpreter, preparation instructions and transport. Pack paper and offline digital copies of records, contact details and bookings. These are planning stages, not fixed eight/four/two-week medical deadlines.', '尽早：讨论出行必要性、整理病历、联系医院。购买不可退改项目之前：确认预约、费用估算、入境证件和保险。临近出发：复核科室、口译、检查准备要求及交通。随身准备病历、联系方式、订单的纸质版和离线电子版。这些是准备阶段，不是固定的八 / 四 / 两周医疗时限。')},
      {id: 'stay-length', title: text('Can a scan, check-up or dental visit fit into a few days?', '检查、体检、牙科能在几天内完成吗？'), body: text('Ask for your case-specific sequence: arrival and assessment → required tests or treatment → results review → follow-up and clearance for onward travel. A scan appointment does not confirm the report date, and a dental procedure may be only one treatment stage. Keep accommodation near the correct campus, flexible tickets and room for delays; do not reuse a generic two-, four- or seven-day template as a medical timetable.', '索要针对你本人的流程：抵达与评估 → 必要检查或治疗 → 结果解读 → 随访与后续旅行评估。检查预约不等于报告日期，牙科操作也可能只是一个治疗阶段。住在正确院区附近，选择可改签交通并留出延误余量；不要把通用两天、四天或七天模板当作医疗时间表。')},
      {id: 'sightseeing-flight', title: text('Can I add sightseeing or fly immediately afterwards?', '能顺便旅游，或治疗后马上乘机吗？'), body: text('Ask the treating team about activity, wound care, sedation, escort needs and fitness to fly for your procedure. Long flights and recovery may require a different plan from an ordinary holiday. Keep sightseeing optional until you know the clinical restrictions. The hospital’s discharge decision and an airline’s travel requirements may involve separate checks.', '向接诊团队询问本次项目的活动、伤口护理、镇静、陪同及乘机适宜性要求。长途飞行与恢复期可能需要不同于普通度假的安排。了解临床限制前，将观光保留为可取消选项。医院出院决定与航空公司的乘机要求也可能需要分别核实。')},
    ],
    actions: [text('Save the hospital’s Chinese address, accessible transfer plan and an emergency contact offline.', '离线保存医院中文地址、适合行动能力的交通方案和紧急联系人。'), text('Request individual preparation and return-travel instructions; keep the schedule flexible until confirmed.', '索要个人检查准备与返程指导，确认前保持行程可调整。')], sources: ['cdc', 'insurance'],
  },
  {
    id: 'language-records', title: text('Communicate and get usable records', '沟通、知情同意与报告资料'),
    intro: text('Prepare for the medical conversation, not just reception. Know how you will understand decisions and take the results home.', '不只为前台登记准备语言，更要能理解医疗决定，并把可用结果带回家。'),
    questions: [
      {id: 'interpreter', title: text('Will staff speak English? Can an app interpret?', '一定有英语服务吗，可以只靠翻译软件吗？'), body: text('Confirm the language of the clinician, nursing, consent discussion and reports separately. An English website does not confirm every staff member’s availability. Apps can help with directions; arrange qualified medical interpretation for important history, risks and consent. Prepare a bilingual summary of conditions, prior procedures, current medicines and allergies, and ask staff to check your understanding.', '分别确认医生、护理、知情同意沟通和报告的语言。英文网站不能证明每位工作人员都能提供英语服务。软件可辅助问路，重要病史、风险和知情同意应安排合格医学口译。提前准备疾病、既往操作、当前用药及过敏的双语摘要，并请医护确认你已理解。')},
      {id: 'missing-english-report', title: text('What if an English report or DICOM images cannot be confirmed?', '无法确认英文报告或 DICOM 影像怎么办？'), body: text('Before paying, ask what records are available, in which format and language, when and at what cost. If only Chinese is available, ask your home clinician whether it can be used with a qualified translation and how images should be transferred. Keep copies of the originals. If essential records remain unavailable, discuss another provider or defer the procedure; a download link alone is not proof your doctor can open the files.', '付款前确认可提供哪些资料、格式、语言、时间和费用。若只有中文报告，先问本国医生能否结合合格翻译使用，以及影像应如何传输。保留原文副本。关键资料仍无法提供时，讨论更换机构或暂缓操作；一个下载链接不等于医生能正常打开文件。')},
      {id: 'consent-phrases', title: text('What can I show the care team?', '可以出示给医护哪些沟通短句？'), body: text('“请安排医学口译。” — Please arrange a medical interpreter. “我对以下药物过敏。” — I am allergic to these medicines (show your list). “请写明风险、替代方案和全部费用。” — Please write down the risks, alternatives and full costs. “请给我诊疗摘要和可用的原始影像。” — Please provide my care summary and available original images. Do not sign a document until its meaning and your questions have been addressed.', '“请安排医学口译。” “我对以下药物过敏。”（同时出示药物清单。）“请写明风险、替代方案和全部费用。” “请给我诊疗摘要和可用的原始影像。” 可将这些短句展示给医护。未理解文件含义、疑问尚未得到解答时，不要急于签字。')},
    ],
    actions: [text('Arrange an interpreter and confirm report delivery before the appointment.', '就诊前安排口译，并确认报告交付方式。'), text('Check that your home clinician can read the records and available images; keep original copies.', '确认本国医生能读取病历及可用影像，并保留原文副本。')], sources: ['cdc', 'pumch'],
  },
  {
    id: 'risks-recovery', title: text('Spot risks and handle changes', '识别风险，处理临时变化'),
    intro: text('The useful question is not “is there any risk?” but “who will help, what will change, and who pays if something goes wrong?”', '实用的问题不只是“有无风险”，还包括“出问题后找谁、如何调整、费用由谁承担”。'),
    questions: [
      {id: 'warning-signs', title: text('Which warning signs should make me pause?', '哪些信号值得暂停付款或出行？'), body: text('Pause if a seller guarantees a cure, pressures you into extra tests, will not identify the actual clinician/campus, refuses an itemised quote or wants payment to an unverified personal account. Check claimed credentials independently. Do not assume that an implant brand guarantees worldwide warranty or that another dentist must repair it; ask about model traceability and an actual follow-up agreement.', '承诺包治、强推额外检查、不说明实际医生或院区、拒绝分项报价，或要求向未经核实的私人账户付款时，应先暂停。独立核查对方声称的资质。种植体品牌不等于全球联保，也不代表其他牙医必须维修；确认型号可追溯信息及实际随访协议。')},
      {id: 'price-report-changes', title: text('What if the price changes or results are delayed?', '到院加价或报告延迟时怎么办？'), body: text('Ask for the clinical reason, revised itemised estimate and your options before consenting to additional non-urgent care. Keep written records of quotes and payments. For delayed results, request a delivery date, secure transfer method and a named contact; discuss whether it is appropriate to travel before review. Use the hospital’s published patient-service or complaint route for unresolved issues.', '对非紧急追加诊疗，先问清临床原因、新分项估算和替代选择，再决定是否同意。保存报价和付款记录。报告延误时，索要预计交付日、安全传输方式和具体联系人，并讨论结果解读前是否适宜离开。未解决的问题通过医院公布的患者服务或投诉渠道处理。')},
      {id: 'complications', title: text('What if I feel unwell during recovery or after going home?', '恢复中或回国后身体不适怎么办？'), body: text('Seek timely local medical assessment for unexpected or worsening symptoms; do not wait for a remote response from the original provider. Tell the local team about the procedure abroad and show your records. For an emergency, use the local emergency service. Contact the original hospital and insurer alongside care, and keep invoices and correspondence; reimbursement is subject to the policy.', '出现意外或加重症状时，及时在所在地接受医疗评估，不等待原机构远程回复。向当地医护说明境外诊疗经历并出示资料。紧急情况使用当地急救服务。就诊同时联系原医院及保险方，保留票据和沟通记录；能否报销以保单为准。')},
    ],
    actions: [text('Seek local medical assessment promptly if symptoms worsen; do not wait for a remote reply.', '症状加重时，及时在当地接受医疗评估，不要等待远程回复。'), text('Before treatment, get a named contact for cancellations, record problems and post-care concerns.', '治疗前取得处理取消、资料问题及术后疑问的具体联系人。'), text('If essential safety, language or follow-up arrangements remain unclear, pause and resolve them.', '关键安全、语言或随访安排不清楚时，暂停并先解决。')], sources: ['cdc', 'insurance', 'emergency'],
  },
  {
    id: 'follow-up', title: text('Plan the return and follow-up', '回国后的随访与衔接'),
    intro: text('The visit ends with a handover, not just a flight. Decide who will review the results and manage ongoing care before you leave.', '就医结束需要完成交接，而不只是登机。离开前明确谁解读结果、谁负责后续照护。'),
    questions: [
      {id: 'take-home-records', title: text('What should I take home?', '回国前应拿到哪些资料？'), body: text('Ask for the care or discharge summary, test reports, available original images, prescriptions with generic names and doses, procedure details, relevant implant/material identifiers, itemised receipts and follow-up instructions. Check how to obtain outstanding records securely and whether your contact details work from abroad. Records may need qualified translation; keep both versions.', '索要诊疗或出院摘要、检查报告、可用原始影像、注明通用名及剂量的处方、操作记录、相关种植体或耗材标识、分项收据及随访指导。确认未出齐资料如何安全获取，以及联系方式回国后是否可用。资料可能需要合格翻译，应保留两个版本。')},
      {id: 'local-followup', title: text('Who will provide follow-up at home?', '回国后找谁继续随访？'), body: text('Arrange a suitable home clinician before travelling, rather than assuming they can take over every procedure. Ask what they need to review results and whether they can manage staged dental work or complications. Confirm which questions the China team can answer remotely, any fees and when an in-person review is needed. Budget separately for a second visit if it may be required.', '出行前就安排合适的本国接诊医生，不默认其能接手所有项目。询问解读结果需要哪些资料，是否能处理分阶段牙科治疗或并发症。确认中国团队可远程回答哪些问题、是否收费，以及何时必须面诊。可能需要二次赴华时，单独预留费用。')},
      {id: 'ongoing-decisions', title: text('Do a normal result or discharge documents settle everything?', '结果正常或拿到出院文件，就不需要继续关注了吗？'), body: text('Review the findings, limitations and next steps with the responsible clinician. Do not independently stop existing treatment or assume a normal scan rules out every condition. Keep the agreed follow-up dates and bring any new symptoms to local medical attention. This guide helps organise questions and documents; it does not interpret your results.', '与负责医生讨论检查发现、局限和下一步。不要自行停止现有治疗，也不要把正常影像理解为排除了所有疾病。按约定时间随访，出现新症状及时在当地就诊。本指南帮助整理问题与资料，不负责解读个人结果。')},
    ],
    actions: [text('Check the records and follow-up contact while you can still resolve problems with the hospital.', '趁仍便于与医院沟通时，核对资料完整性和随访联系人。'), text('Schedule the handover to your home clinician and save any planned return-visit requirements.', '安排与本国医生的交接，保存再次就诊的要求和计划。')], sources: ['cdc', 'screening'],
  },
];

export const medicalOriginals = [
  {title: text('Why consider medical travel to China? Cost, waiting time and technology', '为什么越来越多外国人选择来中国医疗旅游？三大核心优势'), sections: ['before-you-decide', 'care-options']},
  {title: text('Who should consider medical travel, and who should not?', '赴华医疗旅游，哪些项目适合你？哪些应当避开？'), sections: ['care-options', 'follow-up']},
  {title: text('How to choose hospitals: Grade 3A explained', '怎么挑选靠谱医院：中国三甲体系详解'), sections: ['hospitals', 'appointments']},
  {title: text('Full cost breakdown: medical and travel expenses', '赴华医疗旅游全成本解析：医疗价格与出行预算'), sections: ['costs-insurance']},
  {title: text('Itinerary, preparation and language guide', '赴华医疗旅游：行程规划、出行清单、语言障碍解决方案'), sections: ['entry-medicines', 'travel-preparation', 'language-records', 'follow-up']},
  {title: text('Risks and appointments: DIY versus facilitation', '赴华医疗旅游风险清单与预约方式：DIY 与第三方协助'), sections: ['appointments', 'risks-recovery']},
];

export const medicalPreparation = [
  text('A clinician has assessed the purpose of care and whether travel is appropriate.', '与医生讨论就医目的，并评估是否适宜旅行。'),
  text('The hospital has confirmed the department, campus, dates and language support in writing.', '医院已书面确认科室、院区、日期及语言支持。'),
  text('You have an itemised estimate and a response from your insurer for this visit.', '已取得分项费用估算，以及保险方针对本次就医的答复。'),
  text('Entry documents, medicines, report delivery and follow-up have been checked.', '已核对入境证件、药品、报告交付与后续随访。'),
];

export const medicalBudget = [
  {item: text('Medical care', '医疗项目'), ask: text('Consultations, examinations, treatment, anaesthesia, medicines and materials: what is included?', '问诊、检查、治疗、麻醉、药物和耗材：哪些已包含？')},
  {item: text('Communication & records', '沟通与资料'), ask: text('Are interpretation, English reports, image copies and translation charged separately?', '口译、英文报告、影像副本和翻译是否另收费？')},
  {item: text('Travel & accommodation', '旅行与住宿'), ask: text('Allow for documents, flights, local transport, meals, a companion and extra nights.', '计入证件、机票、当地交通、餐食、陪同和延住。')},
  {item: text('Follow-up & repeat visits', '随访与再次就诊'), ask: text('Who provides reviews, adjustments or staged treatment, and what would another trip cost?', '谁负责复查、调整或分阶段治疗，再次出行要花多少？')},
  {item: text('Changes & complications', '变化与并发症'), ask: text('Check cancellation fees, additional care, evacuation and the amount you may need to pay yourself.', '核对取消费用、追加医疗、转运，以及可能需要自付的金额。')},
];
