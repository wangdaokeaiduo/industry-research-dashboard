import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const reportPath=path.join(root,'data/reports/600809-stock.json')
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
const fmt=(n,d=2)=>Number(n).toFixed(d)
async function api(api_name,params,fields){const b=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(b.code!==0)throw new Error(`${api_name}: ${b.msg}`);return(b.data?.items||[]).map(row=>Object.fromEntries(b.data.fields.map((key,i)=>[key,row[i]])))}

const peerDefs=[['600519.SH','贵州茅台','高端白酒'],['000858.SZ','五粮液','浓香龙头'],['000568.SZ','泸州老窖','浓香高端'],['000596.SZ','古井贡酒','区域龙头']]
const peers=[]
for(const [code,name,segment] of peerDefs){const [b,f]=await Promise.all([api('daily_basic',{ts_code:code,start_date:'20260801',end_date:'20260813'},'trade_date,pe_ttm,pb,total_mv'),api('fina_indicator',{ts_code:code,start_date:'20260101',end_date:'20260814'},'ann_date,end_date,or_yoy,netprofit_yoy,roe,grossprofit_margin')]);peers.push({code,name,segment,b:b[0]||{},f:f[0]||{}})}

const d=report.technical.technicalDetail,s=d.marketStats,ma=Object.fromEntries(d.movingAverages.map(x=>[x.period,x.value]))
const close=s.close,vr20=report.technical.volumeAverages.find(x=>x.days===20).ratio
const macd=d.indicators.find(x=>x.name==='MACD'),kdj=d.indicators.find(x=>x.name==='KDJ'),rsi=d.indicators.find(x=>x.name==='RSI')
const trigger=130.10,longTrigger=Number((ma[145]*1.003).toFixed(2)),invalidation=110.50
const annual={revenue:387.18,profit:122.46,cfo:90.14,revenueYoy:7.52,profitYoy:0.03,cfoYoy:-25.95}
const q1={revenue:149.23,profit:53.83,cfo:82.54,revenueYoy:-9.68,profitYoy:-19.03}

report.decisionLevel='wait_trigger'
report.tradeDecision={asOf:report.asOf,verdict:'可以进入右侧观察区，但不在布林上轨附近追价',reason:`${report.asOf}收盘${fmt(close)}元，已站上MA20/60/90，MACD微弱多头且当日成交额为20日均额${fmt(vr20)}倍；但价格仍低于MA145 ${fmt(ma[145])}元，且临近BOLL上轨129.21元。2026Q1营收/归母净利同比-9.68%/-19.03%，基本面尚未确认反转。`,checks:[
 {name:'区间突破',current:`收盘${fmt(close)}元`,threshold:`收盘≥${fmt(trigger)}元`,status:'unmet'},
 {name:'突破量能',current:`当日/20日均额=${fmt(vr20)}倍`,threshold:'突破日≥1.20倍，且次日不跌回',status:vr20>=1.2?'met':'unmet'},
 {name:'中期趋势',current:`MA20/60/90=${fmt(ma[20])}/${fmt(ma[60])}/${fmt(ma[90])}元`,threshold:'收盘站上三条均线',status:close>=Math.max(ma[20],ma[60],ma[90])?'met':'unmet'},
 {name:'长期反转',current:`MA145 ${fmt(ma[145])}元`,threshold:`收盘≥${fmt(longTrigger)}元并回踩不破`,status:'unmet'},
 {name:'短线过热',current:`${rsi.value}；${kdj.value}`,threshold:'RSI6<80、J<95、MA5乖离<10%',status:'met'},
 {name:'盈利拐点',current:'2026Q1收入/净利-9.68%/-19.03%',threshold:'收入与扣非利润连续两个报告期改善',status:'unmet'},
 {name:'现金流',current:'2026Q1经营现金流82.54亿元',threshold:'现金流覆盖利润，同时合同负债不恶化',status:'met'},
 {name:'审计治理',current:'2021—2025均标准无保留；2024更换审计机构',threshold:'无非标、重大差错或监管风险',status:'met'}]}

report.decisionOverview={items:[
 {label:'行业景气',value:'深度去库存',score:38,comment:'白酒仍面临价格倒挂、库存和终端需求压力'},
 {label:'公司竞争力',value:'清香龙头',score:86,comment:'全国化与青花系列构成中长期优势'},
 {label:'盈利趋势',value:'明显承压',score:37,comment:'2026Q1营收-9.68%、归母净利-19.03%'},
 {label:'估值',value:'历史消化后中性',score:68,comment:'PE-TTM 14.06倍、PB 3.43倍，但需盈利稳住才能形成安全垫'},
 {label:'技术位置',value:'中期修复',score:65,comment:`站上MA20/60/90，但未收复MA145 ${fmt(ma[145])}元`}
],coreConflict:'汾酒的品牌、清香品类与全国化能力没有消失，但白酒行业正在用控货、降速和利润承压换取渠道健康。股价修复已领先业绩，需要终端动销与报表一起验证。',action:`不追126.55元当日大阳线。左侧只看120—122元回踩缩量止跌；右侧等${fmt(trigger)}元放量突破，稳健加仓要等${fmt(longTrigger)}元长期均线确认。`}

report.prosperity={level:'白酒行业仍在深度调整，汾酒从高增长转入渠道与增长质量阶段',direction:'股价修复 / 业绩和动销待验证',directionTone:'warning',score:43,verdict:'当前不是白酒全面复苏，而是头部品牌分化与主动去库存。汾酒2025年收入仍增长7.52%，但利润几乎零增长；2026Q1收入利润双降，说明报表拐点未出现。',dimensions:[
 {name:'2025营业收入',value:'387.18亿元',change:'同比+7.52%',tone:'positive'},
 {name:'2025归母净利',value:'122.46亿元',change:'同比+0.03%',tone:'warning'},
 {name:'2025经营现金流',value:'90.14亿元',change:'同比-25.95%',tone:'negative'},
 {name:'2026Q1营收',value:'149.23亿元',change:'同比-9.68%',tone:'negative'},
 {name:'2026Q1归母净利',value:'53.83亿元',change:'同比-19.03%',tone:'negative'}
],driver:'青花系列终端开瓶、批价与费用投放，省外市场增长，渠道库存，合同负债、销售收现和经营现釔1',improvement:'渠道库存月数下降，青花系列批价和开瓶企稳，省外动销恢复，营收、扣非利润与现金流连续两期改善',deterioration:'批价继续下移、价格倒挂加剧，合同负债和收现恶化，为保增长加大费用或压货'}

report.supplyDemand={state:'供给降速仍慢于需求修复，渠道以去库存为主',tone:'warning',direction:'局部稳定，未全面反转',conclusion:'白酒没有物理稀缺，核心约束是终端需求、价格信心和渠道资金。汾酒的优势是清香品类和品牌势能，但仍不能越过行业去库存周期。',demand:{status:'商务宴宴和大众消费分化',evidence:'行业调研显示量价利承压；2026Q1汾酒收入同比-9.68%',change:'节庆需求能带来阶段性补库，但持续性要看开瓶',tone:'warning'},supply:{status:'酒企主动控货与保价',evidence:'行业进入缩量、分化和渠道修复阶段',change:'供给纪律好于追求报表增速',tone:'warning'},inventory:{status:'高频核心变量',evidence:'目前无公开稳定API验证汾酒实时渠道库存月数，不用未核验传闻代替',change:'需通过公司调研、批发价和终端开瓶交叉验证',tone:'warning'},price:{status:'倒挂压力尚未系统性消失',evidence:'行业中期调研将价格与库存列为核心矛盾',change:'青花系列批价是汾酒领先指标',tone:'warning'},profit:{status:'收入降速、利润弹性更弱',evidence:'2025净利仅+0.03%，2026Q1净利-19.03%',change:'需观察毛利率、销售费用和现金流',tone:'negative'},leadingIndicator:'青花系列批价/开瓶、渠道库存月数、省外增长、合同负债、销售收现、经营现釔1、毛销差',improvement:'批价稳定+库存下降+开瓶恢复，并在财报中表现为合同负债、收现和扣非利润改善',invalidation:'批价继续下移、渠道库存不降、经销商回款承压，且利润降幅持续大于收入。'}

report.summary={stage:'行业去库存、公司业绩筑底、股价中期修复',rating:'有长期研究价值，交易上等突破或回踩',confidence:'中高',conclusion:`汾酒不是基本面破坏型公司，但当前也不是业绩反转已确认。${fmt(close)}元已收复中期均线，但布林上轨和MA145仍在上方；把它定义为“右侧候选”比“立即买入”更准确。`,evidence:['2025收入+7.52%而净利仅+0.03%，2026Q1收入/净利-9.68%/-19.03%','收盘站上MA20/60/90，MACD翻红，但仍低于MA145','当日成交额为20日均额1.25倍，已有量能，尚差价格确认']}

d.headline=`98.64元低点后的中期修复，${fmt(trigger)}元与MA145是两道确认关口`
d.plainConclusion=`今天不追。左侧：120—122元附近缩量回踩，收盘重回123元且成交额≥0.8倍20日均额；右侧：收盘突破${fmt(trigger)}元、成交额≥1.2倍20日均额，次日不跌回。收盘跌破${fmt(invalidation)}元则本轮修复失效。`
d.structure=[{stage:'长期下行',period:'近250日',range:'202.25—98.64元',feature:'估值与业绩增速双重消化，MA145仍向下'},{stage:'筑底反弹',period:'近90日',range:'98.64—130.09元',feature:'重心抬高，已站上MA20/60/90'},{stage:'当前冲关',period:'近20日',range:`111.62—${fmt(trigger)}元`,feature:`BOLL上轨129.21元与区间上沿重合，当日量比${fmt(vr20)}倍`},{stage:'长期反转确认',period:'待触发',range:`${fmt(trigger)}—${fmt(longTrigger)}元`,feature:'先突破区间上沿，再收复MA145并回踩不破'}]
d.signals={bull:['收盘站上MA5、10、20、60、90，短中期结构转强',`当日成交额18.94亿元，为20日均额${fmt(vr20)}倍`,'MACD DIF 3.05高于DEA 2.97，红柱刚扩张','PE-TTM约14.06倍，长期估值压力较高位已明显释放'],risk:[`收盘仍低于MA145 ${fmt(ma[145])}元，长期趋势尚未扭转`,'RSI6 71.11且价格贴近BOLL上轨，追高容易遭遇回踩','2026Q1利润降幅大于收入，报表与股价存在时间差','实时渠道库存、青花批价和开瓶数无稳定公开API，不能把数据缺口当成利好']}
report.technical.rating='中期修复进入冲关区，等确认不追高'
report.technical.wave=`主计数：202.25元以来的中期ABC调整在98.64元形成C浪低点，当前运行修复浪；突破${fmt(trigger)}元为走强，收复${fmt(longTrigger)}元才升级为中期推动浪。备选计数：仅为长期下降中的B浪反弹，跌破${fmt(invalidation)}元则备选占优。`
report.technical.chan=`日线近20日重叠区间约${fmt(Math.max(...report.technical.ohlc.slice(-20).map(x=>x.low)))}—${fmt(Math.min(...report.technical.ohlc.slice(-20).map(x=>x.high)))}元（缺少30分钟笔段，仅作中枢代理）。放量突破${fmt(trigger)}元并回踩不破是三买候选；跌破${fmt(invalidation)}元失效。`
report.technical.trigger=`左侧：120—122元回踩缩量止跌，次日收盘≥123元且成交额≥0.8倍20日均额；右侧：收盘突破${fmt(trigger)}元且成交额≥1.2倍20日均额，次日不跌回；加仓：突破${fmt(longTrigger)}元并回踩不破`
report.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或半年报收入与扣非利润降幅同时扩大`
report.technical.riskReward=`左侧按123/${fmt(invalidation)}元计算风险约${fmt((123/invalidation-1)*100)}%，首个目标${fmt(longTrigger)}元，盈亏比一般；右侧必须靠量能提高胜率。`

report.executionPlan={action:'不追当日大阳线；选择MA20回踩确认或区间放量突破之一',trigger:report.technical.trigger,add:`收盘突破${fmt(longTrigger)}元并回踩不破；同时半年报显示收入、扣非利润和现金流降幅收窄，再考虑提高仓位`,priceInvalidation:`收盘跌破${fmt(invalidation)}元取消本轮修复交易`,fundamentalInvalidation:'渠道库存和价格倒挂继续恶化，合同负债、销售收现与扣非利润同步走弱',nextReview:`2026-08-31半年报预约披露日，或收盘突破${fmt(trigger)}元后`}

report.companyComparison=[{tier:'研究对象',tone:'warning',company:'山西汾酒',ticker:'600809.SH',driver:'清香品类、青花系列和全国化',valuation:'PE-TTM 14.06倍；PB 3.43倍',risk:'行业去库存、价格倒挂与增速降档'},...peers.map(x=>({tier:x.segment,tone:'neutral',company:x.name,ticker:x.code,driver:`最新收入/净利同比${Number.isFinite(x.f.or_yoy)?fmt(x.f.or_yoy):'—'}%/${Number.isFinite(x.f.netprofit_yoy)?fmt(x.f.netprofit_yoy):'—'}%`,valuation:`PE-TTM ${Number.isFinite(x.b.pe_ttm)?fmt(x.b.pe_ttm):'不适用'}倍；PB ${Number.isFinite(x.b.pb)?fmt(x.b.pb):'—'}倍`,risk:'批价、库存、终端动销与估值波动'}))]
report.valuationScenarios=[{name:'乐观',weight:'25%',assumption:'青花批价稳定、库存下降，收入利润恢复正增长',valuation:'低两位数PE可获得盈利与估值双修复',signal:'连续两期收入、扣非净利和收现共振'},{name:'基准',weight:'50%',assumption:'行业慢去库存，汾酒收入稳定但利润率仍有压力',valuation:'PE-TTM 14.06倍处于质量溢价与低增长之间的中性定价',signal:'半年报降幅收窄，批价与库存不再恶化'},{name:'悲观',weight:'25%',assumption:'需求偏弱、倒挂延续，费用投放无法换取动销',valuation:'盈利预测下修并触发估值再压缩',signal:`半年报低于预期且股价跌破${fmt(invalidation)}元`}]

report.marketResearch={fullTextStatus:'available',statusNote:'已接入2025年报、2026Q1、白酒行业中期调研与公开机构点评',period:'2026-04-23—2026-06',reportCount:5,institutionCount:4,companyForecastSampleCount:2,reportScope:'公司定期报告、行业协会/KPMG和公开机构研究；不使用目标价代替判断',consensus:'汾酒长期品牌与全国化能力仍在，当前核心任务是去库存、稳批价和提高增长质量',revisionTrend:'市场从高增长叙事转向终端动销、渠道健康和现金流验证',synthesis:{verdict:'长期逻辑未破坏，但业绩与行业库存周期未确认见底；技术修复先于基本面。',confidence:'年报/季报原文+行业专题+真实行情 · 中高置信度',confidenceTone:'warning',evidenceNote:'公司报告用于核对报表，行业研究用于判断库存与价格周期，机构点评只用于观察预期差。',commonPoints:[{point:'品牌和清香品类仍是长期核心',reason:'汾酒已形成青花系列和全国化渠道能力。',support:'年报+公开机构研究'},{point:'行业优先去库存而不是追增速',reason:'价格倒挂、库存和终端需求是当前核心矛盾。',support:'中国酒业协会/KPMG中期调研'},{point:'利润恢复慢于收入',reason:'2025净利几乎零增长，2026Q1利润降幅大于收入。',support:'2025年报+2026Q1'}],differences:[{topic:'行业见底时点',views:'乐观观点认为政策与大众需求带来局部稳定；谨慎观点更关注库存、批价和开瓶数。',investmentMeaning:'不能用单一零售数据代替白酒动销。'},{topic:'低估值是否足够',views:'多头强调品牌资产和长期回报；谨慎方认为盈利下修会推高动态估值。',investmentMeaning:'低PE是观察条件，不是无条件买点。'}],integratedView:`长期看汾酒仍是值得跟踪的清香白酒龙头；中期看处于行业去库存和业绩筑底期；短期看${fmt(trigger)}元突破与${fmt(longTrigger)}元长期均线是两道门槛。`,validation:'半年报核对收入、扣非利润、现金流、合同负债和库存；高频核对青花批价、开瓶和渠道库存。'},integratedConclusion:'基本面是“优质公司遇到行业下行周期”，技术面是“中期修复待长期确认”。',evidenceCheck:'2025年报、2026Q1、Tushare财务估值、875根真实前复权OHLCV与行业专题已交叉验证。',topReports:[
 {date:'2026-04-23',institution:'山西汾酒/上交所',title:'2025年年度报告',type:'定期报告',url:'https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12153884&stockid=600809'},
 {date:'2026-04',institution:'山西汾酒',title:'2026年第一季度报告',type:'定期报告',url:'https://money.finance.sina.com.cn/corp/go.php/vCB_Bulletin/stockid/600809/page_type/yjdbg.phtml'},
 {date:'2026-06',institution:'中国酒业协会/KPMG',title:'2026中国白酒市场中期研究报告',type:'行业研究',url:'https://assets.kpmg.com/content/dam/kpmgsites/cn/pdf/zh/2026/06/2026-chinese-baijiu-market-mid-term-research-report.pdf.coredownload.inline.pdf'},
 {date:'2026-05-11',institution:'公开机构研究',title:'山西汾酒2025年报与2026Q1点评',type:'研报摘要',url:'https://pdf.dfcfw.com/pdf/H3_AP202605111822142471_1.pdf?1778490520000.pdf='},
 {date:'2026-04-30',institution:'公开机构研究',title:'白酒周期与汾酒经营质量跟踪',type:'研报摘要',url:'https://pdf.dfcfw.com/pdf/H3_AP202604301821799105_1.pdf?1777537654000.pdf='}
],freeSources:[]}

report.catalysts=[{date:'2026-08-31',event:'2026年半年报预约披露',expectation:'验证收入、扣非利润、合同负债、库存与经营现釔',status:'pending',statusLabel:'交易所预约日'},{date:'2026年中秋/国庆备货期',event:'白酒旺季动销和渠道回款验证',expectation:'跟踪青花批价、开瓶、库存月数和经销商回款',status:'pending',statusLabel:'产业验证窗口'},{date:'持续跟踪',event:'白酒行业控货、保价与需求政策',expectation:'观察价格倒挂和社会库存是否收窄',status:'pending',statusLabel:'高频跟踪'}]
report.bearCase=['白酒去库存时间超预期，青花系列批价和开瓶继续走弱','公司为保收入加大渠道投放，导致利润与现金流持续弱于收入','股价无法突破MA145，并在业绩下修后跌破110.50元，证明当前仅是熊市反弹']
report.evidenceQuality=[{grade:'A',label:'行情、财务与估值',note:`Tushare前复权OHLCV、三张报表、财务指标与daily_basic，截至${report.asOf}`},{grade:'A',label:'公司报表',note:'2025年报与2026Q1公开披露'},{grade:'B',label:'行业景气与市场预期',note:'中国酒业协会/KPMG中期研究与公开机构点评'},{grade:'C',label:'高频渠道与次级别缠论',note:'无稳定实时库存/批价/开瓶API，且缺少30分钟笔段，明确标注边界'}]
report.dataGaps=['青花系列实时批价、开瓶和渠道库存月数没有稳定可验证公开API，不展示未核实数字','缺少30分钟完整笔段，缠论仅使用日线重叠区间作中枢代理','2026半年报尚未披露，业绩降幅是否见底无法提前确认']
report.metrics=[{label:'2025营业收入',value:'387.18',unit:'亿元',change:'同比+7.52%',direction:'up',series:[387.18]},{label:'2025归母净利',value:'122.46',unit:'亿元',change:'同比+0.03%',direction:'flat',series:[122.46]},{label:'2026Q1营业收入',value:'149.23',unit:'亿元',change:'同比-9.68%',direction:'down',series:[149.23]},{label:'2026Q1归母净利',value:'53.83',unit:'亿元',change:'同比-19.03%',direction:'down',series:[53.83]},{label:'PE-TTM',value:'14.06',unit:'倍',change:'PB 3.43倍',direction:'flat',series:[14.06]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'放量冲关',direction:'up',series:report.technical.volumeAverages.map(x=>x.ratio)}]
report.sources=[`Tushare Pro daily/adj_factor/daily_basic/fina_indicator/财务三表/fina_audit，${report.asOf}提取`,'山西汾酒2025年年报：https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12153884&stockid=600809','山西汾酒2026年一季报索引：https://money.finance.sina.com.cn/corp/go.php/vCB_Bulletin/stockid/600809/page_type/yjdbg.phtml','中国酒业协会/KPMG 2026白酒市场中期研究：https://assets.kpmg.com/content/dam/kpmgsites/cn/pdf/zh/2026/06/2026-chinese-baijiu-market-mid-term-research-report.pdf.coredownload.inline.pdf']

await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({id:report.id,close,ma20:ma[20],ma145:ma[145],trigger,longTrigger,invalidation,vr20,peers:peers.map(x=>x.name)},null,2))
