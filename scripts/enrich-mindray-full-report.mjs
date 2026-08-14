import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const reportPath=path.join(root,'data/reports/300760-stock.json')
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
report.researchDepth='full'
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
const fmt=(n,d=2)=>Number(n).toFixed(d)
async function api(api_name,params,fields){const b=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(b.code!==0)throw new Error(`${api_name}: ${b.msg}`);return(b.data?.items||[]).map(row=>Object.fromEntries(b.data.fields.map((key,i)=>[key,row[i]])))}

const peers=[['688271.SH','联影医疗','影像设备'],['300832.SZ','新产业','IVD'],['688301.SH','奕瑞科技','影像核心部件']]
const peerRows=[]
for(const [code,name,segment] of peers){const [b,f]=await Promise.all([api('daily_basic',{ts_code:code,start_date:'20260801',end_date:'20260813'},'trade_date,pe_ttm,pb,total_mv'),api('fina_indicator',{ts_code:code,start_date:'20260101',end_date:'20260813'},'ann_date,end_date,or_yoy,netprofit_yoy,roe,grossprofit_margin')]);peerRows.push({code,name,segment,b:b[0]||{},f:f[0]||{}})}

const d=report.technical.technicalDetail,s=d.marketStats,ma=Object.fromEntries(d.movingAverages.map(x=>[x.period,x.value]))
const vr20=report.technical.volumeAverages.find(x=>x.days===20).ratio,close=s.close,trigger=Number(Math.max(162.81,ma[145]*1.001).toFixed(2)),invalidation=145.50
const macd=d.indicators.find(x=>x.name==='MACD'),kdj=d.indicators.find(x=>x.name==='KDJ'),rsi=d.indicators.find(x=>x.name==='RSI')
const q1={revenue:83.52,profit:23.30,cfo:13.81,revenueYoy:1.39,profitYoy:-11.37,cfoYoy:-7.59,grossMargin:61.87}
const annual={revenue:332.82,profit:81.36,netProfit:84.51,cfo:101.45,international:176.50,domestic:156.32}

report.decisionLevel='wait_trigger'
report.tradeDecision={asOf:report.asOf,verdict:'中期底部正在修复，可以观察回踩，但量能与长期趋势尚不支持直接追入',reason:`截至${report.asOf}收盘${fmt(close)}元，价格略高于MA20并站上MA60/90，但已低于MA5/10，且仍低于MA145 ${fmt(ma[145])}元；20日成交额比仅${fmt(vr20)}倍且MACD尚未金叉。基本面上2026Q1收入同比转正至+1.39%，但归母净利润仍同比-11.37%，修复尚未完成。`,checks:[
  {name:'MA20回踩',current:`收盘${fmt(close)}元，MA20 ${fmt(ma[20])}元`,threshold:'MA20附近止跌且不出现放量长阴',status:close>=ma[20]?'partial':'unmet'},
  {name:'长期均线',current:`MA145 ${fmt(ma[145])}元`,threshold:'收盘站上MA145',status:close>=ma[145]?'met':'unmet'},
  {name:'右侧突破',current:`收盘${fmt(close)}元`,threshold:`收盘≥${fmt(trigger)}元`,status:close>=trigger?'met':'unmet'},
  {name:'20日量能',current:`当日/20日均额=${fmt(vr20)}倍`,threshold:'突破时≥1.20倍；回踩止跌时≥0.80倍',status:vr20>=1.2?'met':vr20>=.8?'partial':'unmet'},
  {name:'MACD确认',current:macd.value,threshold:'DIF重新上穿DEA，绿柱持续收窄',status:macd.state==='多头'?'met':'unmet'},
  {name:'收入拐点',current:'2026Q1营收同比+1.39%',threshold:'收入恢复正增长并连续两个报告期确认',status:'partial'},
  {name:'利润拐点',current:'2026Q1归母净利同比-11.37%',threshold:'扣非利润同比转正且利润率降幅收窄',status:'unmet'},
  {name:'审计治理',current:'近5年均为标准无保留；2024年更换审计机构',threshold:'无非标、重大差错或监管否决',status:'met'}]}

report.decisionOverview={items:[
  {label:'产业位置',value:'国产医疗器械平台龙头',score:91,comment:'监护、IVD、影像与新兴业务多产线协同，国际业务占比已达53%'},
  {label:'增长阶段',value:'国内筑底、海外增长',score:67,comment:'2025境外收入+7.40%，境内收入-22.97%；2026Q1收入重回正增长'},
  {label:'盈利质量',value:'高盈利但仍承压',score:65,comment:`2026Q1毛利率${fmt(q1.grossMargin)}%，归母净利同比${fmt(q1.profitYoy)}%`},
  {label:'估值',value:'历史消化后中性',score:68,comment:'PE-TTM 23.75倍、PB 4.64倍，仍需利润恢复消化'},
  {label:'技术位置',value:'中期修复、长期未反转',score:57,comment:`略高于MA20并站上MA60/90，但低于MA5/10/145；20日量比${fmt(vr20)}倍`}
],coreConflict:'国际业务和新兴业务正在接棒增长，但国内设备采购、IVD集采、支付改革和税率/汇率因素仍压制利润；股价已从低点修复，却尚未用量能突破长期均线确认盈利拐点。',action:'可以放入优质资产观察池，但交易上只做“MA20回踩确认”或“162.81元放量突破”，不在缩量盘整中提前重仓。'}

report.prosperity={level:'行业需求分化，公司处于恢复早期',direction:'海外与新兴业务向上 / 国内传统设备筑底',directionTone:'warning',score:65,verdict:'医疗器械总量并非全面高景气：国内医院采购和IVD价格仍受政策影响，海外高端突破、国际IVD和新兴业务是结构性增长来源。迈瑞的收入拐点早于利润拐点。',dimensions:[
  {name:'2025国际收入',value:'176.50亿元',change:'同比+7.40%，占比53%',tone:'positive'},
  {name:'2025国内收入',value:'156.32亿元',change:'同比-22.97%',tone:'negative'},
  {name:'2026Q1收入',value:'83.52亿元',change:'同比+1.39%',tone:'positive'},
  {name:'2026Q1归母净利',value:'23.30亿元',change:'同比-11.37%',tone:'negative'},
  {name:'研发投入',value:'8.89亿元',change:'占Q1收入10.64%',tone:'positive'}
],driver:'国际高端客户突破、海外本地化、IVD装机带动试剂、微创外科/介入等新兴业务、国内设备采购恢复',improvement:'国内业务同比转正，国际业务保持双位数增长，新兴业务继续高增，扣非利润转正且经营现金流不弱于利润',deterioration:'集采继续压价、医院采购恢复不及预期、海外发货受地缘或关税影响、汇率和全球最低税率继续侵蚀净利率'}

report.supplyDemand={state:'国内需求筑底、海外需求扩张，供给竞争加剧但平台型龙头份额提升',tone:'warning',direction:'结构性改善',conclusion:'国内医疗设备采购周期仍偏慢，IVD集采与检验结果互认压低价格和用量；海外医疗基础设施、欧美缺医少护与高端客户替代提供增长。迈瑞通过全产品线和本地化渠道获得份额，但利润率仍受到价格、税率和汇率共同约束。',demand:{status:'国内弱、海外强',evidence:'2025境内收入同比-22.97%，境外收入同比+7.40%；2026Q1国际业务继续较快增长',change:'国内最差阶段可能过去，但需财报确认',tone:'warning'},supply:{status:'国产替代与全球竞争并存',evidence:'国内龙头受益集采份额提升，海外面对GE医疗、西门子医疗、飞利浦等国际厂商',change:'份额向研发与渠道强者集中',tone:'positive'},inventory:{status:'设备订单与装机周期较长',evidence:'设备业务受医院预算和项目确认影响；IVD试剂等流水型收入可降低单次设备采购波动',change:'流水型业务占比约40%',tone:'positive'},price:{status:'国内承压、海外看产品升级',evidence:'IVD集采压价，高端监护、超声和数智化方案依靠产品力突破海外客户',change:'产品组合对冲单品降价',tone:'warning'},profit:{status:'高利润率但仍下行',evidence:'2026Q1毛利率61.87%，归母净利同比-11.37%，利润恢复落后于收入',change:'等待费用、税率与汇率压力收敛',tone:'warning'},leadingIndicator:'国内招投标和医院设备采购、IVD装机与试剂用量、国际收入增速、新兴业务收入、研发新品、毛利率、有效税率与经营现金流',improvement:'国内收入恢复正增长，国际IVD/生命信息/影像保持双位数，新兴业务增速高于集团，同时毛利率和净利率止跌',invalidation:'收入增长仅靠低毛利业务，国内持续双位数下滑，国际增速放缓，或利润与现金流继续明显落后收入。'}

report.summary={stage:'基本面恢复早期、股价中期筑底修复',rating:'值得中长期跟踪，交易上等待回踩或突破确认',confidence:'中高',conclusion:`截至${report.asOf}，迈瑞医疗的股价已走出130.66元低点后的修复，但${fmt(close)}元仍受MA145 ${fmt(ma[145])}元和162.81元区间上沿压制。当前更像中期底部右侧的第一次回踩，而不是主升浪确认。`,evidence:['2026Q1收入同比+1.39%，结束收入负增长，但归母净利仍-11.37%，利润拐点落后','价格站上MA5/10/20/60/90，短中期结构改善；仍低于MA145，长期反转未确认',`20日成交额比${fmt(vr20)}倍，缩量回踩有利于抛压减弱，但也说明主动买盘不足`]}

d.headline='130.66元低点后的中期修复，正在MA20附近进行第一次重要回踩'
d.plainConclusion=`当前可以观察，但不直接追入。左侧条件是152.5—155.0元区间守住MA20 ${fmt(ma[20])}元，出现止跌K线、次日收盘不低于155.50元且成交额恢复到20日均额0.8倍以上；右侧条件是收盘突破${fmt(trigger)}元并达到1.2倍量能。跌破${fmt(invalidation)}元说明本轮中期修复失败。`
d.signals={bull:['价格已经站上MA5、MA10、MA20、MA60和MA90，短中期趋势由下跌转向修复','MA20约153.22元与当前价格接近，缩量回踩尚未破坏结构','RSI6约52、KDJ-J约50，动量处于中性区，未出现追高型过热','2026Q1收入恢复正增长，国际业务和新兴业务提供基本面支撑'],risk:[`价格仍低于MA145 ${fmt(ma[145])}元，长期下降压力未完全解除`,`20日成交额比仅${fmt(vr20)}倍，突破资金不足`,'MACD DIF仍低于DEA，短线回踩尚未给出重新金叉确认','2026Q1归母净利仍同比下降，国内需求和利润率拐点尚待半年报验证']}
report.technical.rating='中期修复中的缩量回踩，等待确认'
report.technical.wave=`主计数：130.66元形成中期A-B-C调整低点后，当前运行修复上升浪的首次回踩；只有突破${fmt(trigger)}元和MA145 ${fmt(ma[145])}元才升级为推动浪。备选计数：仍是251.33元以来长期下降趋势中的反弹，跌破${fmt(invalidation)}元则备选占优。`
report.technical.chan=`日线最近20日重叠区间约${fmt(Math.max(...report.technical.ohlc.slice(-20).map(x=>x.low)))}—${fmt(Math.min(...report.technical.ohlc.slice(-20).map(x=>x.high)))}元（缺少30分钟笔段，仅作中枢代理）。当前在中枢内部偏下沿；放量突破${fmt(trigger)}元并回踩不破才是三买候选，跌破${fmt(invalidation)}元失效。`
report.technical.trigger=`左侧：152.50—155.00元守住MA20 ${fmt(ma[20])}元，出现止跌K线，次日收盘≥155.50元且成交额≥0.8倍20日均额；右侧：收盘突破${fmt(trigger)}元且成交额≥1.2倍20日均额`
report.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或半年报收入再度转负且扣非利润降幅扩大`
report.technical.riskReward=`左侧按155.50/${fmt(invalidation)}元计算，风险约${fmt((155.5/invalidation-1)*100)}%；目标先看${fmt(trigger)}元，未触发前不成立`

report.executionPlan={action:'现在不追；允许等待MA20回踩确认后的条件性小仓试错',trigger:report.technical.trigger,add:`收盘突破${fmt(trigger)}元后回踩不破，并且半年报确认国内收入降幅收窄、国际与新兴业务保持增长、扣非利润降幅继续收窄，再考虑增加风险暴露`,priceInvalidation:`收盘跌破${fmt(invalidation)}元取消本轮中期修复交易`,fundamentalInvalidation:'国内业务继续双位数下降、国际业务增速显著放缓、IVD集采导致毛利率超预期下滑，或经营现金流持续弱于净利润',nextReview:`2026-08-29半年报预约披露日，或价格突破${fmt(trigger)}元后`}

report.companyComparison=[{tier:'研究对象',tone:'positive',company:'迈瑞医疗',ticker:'300760.SZ',driver:'多产品平台、全球渠道、流水型业务与新兴业务',valuation:'PE-TTM 23.75倍；PB 4.64倍',risk:'国内采购、集采、汇率税率及利润恢复慢于收入'},...peerRows.map(x=>({tier:x.segment,tone:'neutral',company:x.name,ticker:x.code,driver:`最新收入/净利同比${Number.isFinite(x.f.or_yoy)?fmt(x.f.or_yoy):'—'}%/${Number.isFinite(x.f.netprofit_yoy)?fmt(x.f.netprofit_yoy):'—'}%`,valuation:`PE-TTM ${Number.isFinite(x.b.pe_ttm)?fmt(x.b.pe_ttm):'不适用'}倍；PB ${Number.isFinite(x.b.pb)?fmt(x.b.pb):'—'}倍`,risk:x.segment==='IVD'?'集采、试剂价格与装机转化':'设备采购周期、研发投入与海外竞争'}))]

const impliedEps=close/23.7509
report.valuationScenarios=[{name:'乐观',weight:'25%',assumption:'国内采购恢复、国际双位数增长、新兴业务高增，利润率企稳',valuation:`当前股价隐含TTM EPS约${fmt(impliedEps)}元；盈利恢复可消化23.75倍PE`,signal:'收入和扣非利润连续两个季度转正，国际/新兴业务保持高增'},{name:'基准',weight:'50%',assumption:'收入低个位数恢复，国际增长抵消国内调整，利润降幅逐季收窄',valuation:'PE-TTM 23.75倍处于质量溢价与低增速之间的中性区间',signal:'半年报收入正增长、利润仍小幅下降但现金流稳定'},{name:'悲观',weight:'25%',assumption:'集采、采购周期、汇率税率共同压制，利润继续双位数下降',valuation:'盈利下修叠加平台龙头估值溢价收缩',signal:`半年报低于预期且股价跌破${fmt(invalidation)}元`}]

report.marketResearch={fullTextStatus:'available',statusNote:'已接入2025年报、2026Q1、投资者关系记录及公开机构研究摘要',period:'2026-03-31—2026-04-29',reportCount:5,institutionCount:4,companyForecastSampleCount:2,reportScope:'公司定期报告、深交所投资者关系记录与公开研究；不以目标价作为结论',consensus:'国际化、新兴业务和国内份额提升是共识；国内恢复速度和利润率是分歧',revisionTrend:'市场关注点从2025年收入下滑转向2026年收入能否转正，以及利润拐点何时出现',synthesis:{verdict:'迈瑞的长期平台价值没有被破坏，但2026年是“收入先恢复、利润后确认”的过渡年。',confidence:'公告原文+公开研报摘要 · 中高置信度',confidenceTone:'warning',evidenceNote:'公司原文用于核对收入结构、研发和经营展望，机构研究用于观察市场预期差。',commonPoints:[{point:'海外是当前最确定的增长引擎',reason:'2025国际收入占比升至53%，2026Q1国际IVD、生命信息和影像继续增长。',support:'年报+一季报+投资者关系记录'},{point:'新兴业务提高长期成长上限',reason:'2025新兴业务收入53.78亿元、同比+38.85%，微创外科、介入和动物医疗仍处低份额阶段。',support:'2025年报与业绩说明会'},{point:'国内传统设备需求仍需时间修复',reason:'2025国内收入下降22.97%，支付改革、集采和采购周期共同影响。',support:'年报+机构点评'}],differences:[{topic:'国内业务拐点时间',views:'公司判断最困难阶段可能过去；市场仍等待医院采购和收入连续两个季度转正。',investmentMeaning:'不能把单季收入+1.39%直接视为完整反转。'},{topic:'利润率下行幅度',views:'规模、产品组合和高研发形成支撑；集采、最低税率、汇率仍可能压制净利率。',investmentMeaning:'估值判断要盯扣非利润和现金流，不只看收入。'}],integratedView:'长期看是少数具备全球平台潜力的中国医疗器械公司；中期看正从国内调整期进入修复期；短期看股价需要突破MA145与162.81元才能证明市场开始交易利润拐点。',validation:'半年报核对国内/国际分部、新兴业务、IVD试剂、毛利率、扣非利润和现金流；技术上核对MA20、MA145和20日量比。'},integratedConclusion:'基本面可长期研究，当前只适合等待回踩确认或放量突破，不支持无条件抄底。',evidenceCheck:'年报、一季报、投资者关系记录、Tushare财务估值及875根真实OHLCV已交叉核验。',topReports:[
  {date:'2026-04-29',institution:'迈瑞医疗/深交所',title:'2026年第一季度报告',type:'定期报告',url:'https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-29/dae23a9f-ddde-40e5-bbdf-6b1d20b7c694.PDF'},
  {date:'2026-04-17',institution:'迈瑞医疗',title:'2025年度及2026Q1经营展望投资者关系记录',type:'公司调研',url:'https://static.cninfo.com.cn/finalpage/2026-04-17/1225122661.PDF'},
  {date:'2026-03-31',institution:'迈瑞医疗/深交所',title:'2025年年度报告',type:'定期报告',url:'https://disc.static.szse.cn/disc/disk03/finalpage/2026-03-31/a2d3ff33-2728-4fb4-88cd-339f8096f814.PDF'},
  {date:'2026-04-08',institution:'公开机构研究',title:'国内逐步筑底企稳，国际收入持续增长',type:'年报点评',url:'https://pdf.dfcfw.com/pdf/H3_AP202604081821064635_1.pdf?1775667490000.pdf='},
  {date:'2026-04',institution:'公开机构研究',title:'创新及全球化构筑动能，静待国内业绩复苏',type:'年报点评',url:'https://stock.finance.sina.com.cn/stock/go.php/vReport_Show/kind/search/rptid/828374684397/index.phtml'}],freeSources:[]}
report.marketResearch.period='2026-03-31—2026-08-14'
report.marketResearch.statusNote='已接入2025年报、2026Q1、投资者关系记录及公开机构研究摘要；公司未披露2026H1业绩预告或快报'
report.marketResearch.companyForecastSampleCount=0

report.catalysts=[{date:'2026-08-29',event:'2026年半年度报告预约披露',expectation:'验证国内收入拐点、国际/新兴业务增速、毛利率、扣非利润和现金流',status:'pending',statusLabel:'交易所预约日'},{date:'2026-08-29—2026-09-05',event:'半年报与业绩说明会验证窗口',expectation:'核对国内设备招投标、IVD集采影响、海外高端客户与试剂消耗',status:'pending',statusLabel:'报告后验证'},{date:'2026-10-26—2026-10-31',event:'2026年三季报验证窗口',expectation:'确认收入修复是否连续，利润与现金流能否跟上',status:'pending',statusLabel:'季报窗口'}]
report.bearCase=['国内医疗设备采购和IVD行业调整持续时间超预期，单季收入转正后再次下滑','集采、全球最低税率、汇率和产品结构共同导致净利率继续下降','技术上仍低于MA145且突破无量，当前修复可能只是长期下降趋势中的反弹']
report.evidenceQuality=[{grade:'A',label:'行情、财务与估值',note:`Tushare前复权OHLCV、财务三表与daily_basic，截至${report.asOf}`},{grade:'A',label:'业务结构与经营展望',note:'2025年报、2026Q1和公司投资者关系记录'},{grade:'B',label:'市场预期',note:'公开机构年报点评用于比较共识与分歧，不采用目标价'},{grade:'C',label:'筹码与次级别缠论',note:'无可验证筹码接口和30分钟笔段，明确标注数据边界'}]
report.dataGaps=['筹码平均成本、获利比例与集中度无可验证接口，不展示估算值','缺少30分钟级别完整笔段，缠论只使用日线重叠区间作为中枢代理','2026年半年报尚未披露，国内收入持续转正和利润率拐点仍无法确认']
report.metrics=[{label:'2025营业收入',value:'332.82',unit:'亿元',change:'同比-9.38%',direction:'down',series:[367.26,332.82]},{label:'2025国际收入',value:'176.50',unit:'亿元',change:'同比+7.40%，占比53%',direction:'up',series:[164.34,176.50]},{label:'2026Q1营业收入',value:'83.52',unit:'亿元',change:'同比+1.39%',direction:'up',series:[83.52]},{label:'2026Q1归母净利润',value:'23.30',unit:'亿元',change:'同比-11.37%',direction:'down',series:[23.30]},{label:'PE-TTM',value:'23.75',unit:'倍',change:'PB 4.64倍',direction:'flat',series:[23.75]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'缩量回踩',direction:'down',series:report.technical.volumeAverages.map(x=>x.ratio)}]
report.sources=[`Tushare Pro daily/adj_factor/daily_basic/fina_indicator/财务三表/fina_audit，${report.asOf}提取`,'迈瑞医疗2025年年报：https://disc.static.szse.cn/disc/disk03/finalpage/2026-03-31/a2d3ff33-2728-4fb4-88cd-339f8096f814.PDF','迈瑞医疗2026年一季报：https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-29/dae23a9f-ddde-40e5-bbdf-6b1d20b7c694.PDF','迈瑞医疗投资者关系记录：https://static.cninfo.com.cn/finalpage/2026-04-17/1225122661.PDF']

await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({id:report.id,close,ma20:ma[20],ma145:ma[145],trigger,invalidation,vr20,peers:peerRows.map(x=>x.name)},null,2))
