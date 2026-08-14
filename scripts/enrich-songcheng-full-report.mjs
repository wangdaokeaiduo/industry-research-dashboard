import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const reportPath=path.join(root,'data/reports/300144-stock.json')
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
const fmt=(n,d=2)=>Number(n).toFixed(d)
async function api(api_name,params,fields){const b=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(b.code!==0)throw new Error(`${api_name}: ${b.msg}`);return(b.data?.items||[]).map(row=>Object.fromEntries(b.data.fields.map((key,i)=>[key,row[i]])))}

const peerDefs=[['603099.SH','长白山','景区成长'],['000888.SZ','峨眉山A','资源型景区'],['002159.SZ','三特索道','景区运营']]
const peers=[]
for(const [code,name,segment] of peerDefs){const [b,f]=await Promise.all([api('daily_basic',{ts_code:code,start_date:'20260801',end_date:'20260814'},'trade_date,pe_ttm,pb,total_mv'),api('fina_indicator',{ts_code:code,start_date:'20260101',end_date:'20260814'},'ann_date,end_date,or_yoy,netprofit_yoy,roe,grossprofit_margin')]);peers.push({code,name,segment,b:b[0]||{},f:f[0]||{}})}

const d=report.technical.technicalDetail,s=d.marketStats,ma=Object.fromEntries(d.movingAverages.map(x=>[x.period,x.value]))
const vr20=report.technical.volumeAverages.find(x=>x.days===20).ratio,close=s.close,invalidation=5.82,trialTrigger=Number(Math.max(6.45,ma[90]*1.003).toFixed(2)),addTrigger=Number((ma[145]*1.003).toFixed(2))
const macd=d.indicators.find(x=>x.name==='MACD'),kdj=d.indicators.find(x=>x.name==='KDJ'),rsi=d.indicators.find(x=>x.name==='RSI')
const q1={revenue:5.34,profit:2.11,cfo:1.87,revenueYoy:-5.29,profitYoy:-15.06,grossMargin:64.86,debt:12.82}
const annual={revenue:22.58,profit:8.18,deducted:7.85,cfo:15.46,revenueYoy:-6.61,profitYoy:-22.03}

report.decisionLevel='wait_trigger'
report.tradeDecision={asOf:report.asOf,verdict:'长线下降后的横盘筑底尚未完成；现金流很好，但盈利和量价均未转强，暂不直接介入',reason:`截至${report.asOf}收盘${fmt(close)}元，价格低于MA5/10/20/60/90/145，20日成交额比仅${fmt(vr20)}倍；MACD虽略高于信号线，但柱体接近零，尚不足以确认趋势反转。2026Q1营收和归母净利分别同比下降5.29%和15.06%，客流改善尚未转化为盈利拐点。`,checks:[
  {name:'短期均线收复',current:`收盘${fmt(close)}元；MA20/60=${fmt(ma[20])}/${fmt(ma[60])}元`,threshold:'收盘同时站上MA20和MA60',status:close>=ma[20]&&close>=ma[60]?'met':'unmet'},
  {name:'第一右侧突破',current:`收盘${fmt(close)}元`,threshold:`收盘≥${fmt(trialTrigger)}元（覆盖区间上沿与MA90）`,status:close>=trialTrigger?'met':'unmet'},
  {name:'长期反转',current:`MA145 ${fmt(ma[145])}元`,threshold:`收盘≥${fmt(addTrigger)}元`,status:close>=addTrigger?'met':'unmet'},
  {name:'20日量能',current:`当日/20日均额=${fmt(vr20)}倍`,threshold:'突破时≥1.20倍；止跌时≥0.80倍',status:vr20>=1.2?'met':vr20>=.8?'partial':'unmet'},
  {name:'动量确认',current:`${macd.value}；${kdj.value}`,threshold:'MACD红柱扩张且KDJ低位金叉',status:macd.state==='多头'?'partial':'unmet'},
  {name:'盈利拐点',current:'2026Q1收入/净利同比-5.29%/-15.06%',threshold:'收入与扣非利润至少连续两个报告期改善',status:'unmet'},
  {name:'现金流质量',current:'2025经营现金流15.46亿元，明显高于净利润8.18亿元',threshold:'经营现金流持续覆盖净利润和维护性资本开支',status:'met'},
  {name:'审计治理',current:'2022保留意见已追溯更正，2023—2025均标准无保留',threshold:'无新非标、重大差错或监管处罚',status:'partial'}]}

report.decisionOverview={items:[
  {label:'产业位置',value:'现场演艺龙头',score:84,comment:'千古情IP、景区运营与跨区域复制形成差异化'},
  {label:'盈利趋势',value:'收入利润仍下降',score:42,comment:'2026Q1收入-5.29%，归母净利-15.06%'},
  {label:'现金流与资产负债',value:'优秀',score:88,comment:'2025经营现金流15.46亿元，2026Q1负债率12.82%'},
  {label:'估值',value:'中性',score:63,comment:'PE-TTM 20.40倍、PB 2.03倍，需以客流和利润恢复消化'},
  {label:'技术位置',value:'低位筑底未确认',score:38,comment:`收盘${fmt(close)}元低于六条均线，20日量比${fmt(vr20)}倍`}
],coreConflict:'公司拥有轻负债、强现金流和成熟IP，但存量景区客流分化、营销费用和新项目爬坡使利润承压；低估值不能代替盈利拐点，青岛项目和旺季客流也必须用量价及财报验证。',action:'目前只进入观察池。左侧需5.95—6.15元形成止跌并收复MA20/60；右侧需放量突破6.56元，长期加仓要等7.10元附近MA145被有效收复。'}

report.prosperity={level:'文旅需求有韧性，公司经营分化且盈利承压',direction:'旺季客流与新项目向上 / 存量景区利润恢复偏慢',directionTone:'warning',score:58,verdict:'旅游总客流不等于宋城利润。公司不同景区表现分化，杭州较稳、上海和西安增长，张家界、广东、丽江、三亚承压；现金流健康，但收入和利润仍在下降。',dimensions:[
  {name:'2025营业收入',value:'22.58亿元',change:'同比-6.61%',tone:'negative'},
  {name:'2025归母净利润',value:'8.18亿元',change:'同比-22.03%',tone:'negative'},
  {name:'2025经营现金流',value:'15.46亿元',change:'同比+6.96%',tone:'positive'},
  {name:'2026Q1收入',value:'5.34亿元',change:'同比-5.29%',tone:'negative'},
  {name:'2026Q1归母净利',value:'2.11亿元',change:'同比-15.06%',tone:'negative'}
],driver:'全国旅游客流、节假日结构、千古情演出场次与上座率、票价和二消、内容更新、营销投放效率、青岛项目爬坡',improvement:'暑期核心景区客流和演出场次增长，杭州稳健、弱势项目减亏，青岛项目贡献增量，销售费用率下降且经营现金流继续强于利润',deterioration:'客流增长但客单价和利润率下降，营销投放无法转化，弱势景区继续拖累，青岛项目爬坡不及预期'}

report.supplyDemand={state:'旅游需求稳定但演艺供给竞争加剧，项目和区域高度分化',tone:'warning',direction:'旺季改善、盈利传导待确认',conclusion:'居民短途与休闲旅游需求仍在，但主题乐园、地方演艺、沉浸式项目和线上内容共同争夺游客时间。宋城依靠IP和演艺密度获取流量，真正稀缺的是可持续上座率、客单价和跨区域复制效率。',demand:{status:'总量有韧性、项目分化',evidence:'2025上海/西安/九寨/桂林收入增长，张家界/广东/丽江/三亚下降',change:'节假日和暑期是主要验证窗口',tone:'warning'},supply:{status:'同质化竞争增加',evidence:'地方文旅项目、主题乐园和沉浸式演出持续增加，内容更新速度决定吸引力',change:'头部IP和运营效率更重要',tone:'warning'},inventory:{status:'固定产能、座位时段库存不可储存',evidence:'演出空座和低利用率无法递延，旺季排期与上座率直接决定利润弹性',change:'通过多剧目和外场活动提高利用率',tone:'warning'},price:{status:'票价稳定性取决于内容和渠道',evidence:'营销折扣、联票和渠道结构可能带来客流增长但压低客单价',change:'需同时观察客流与客单价',tone:'warning'},profit:{status:'现金流强、利润率承压',evidence:'2025经营现金流15.46亿元高于归母净利8.18亿元，但归母净利同比下降22.03%',change:'折旧摊销与预收模式支持现金流，不能掩盖利润下滑',tone:'warning'},leadingIndicator:'各景区演出场次、上座率、客流、客单价、销售费用率、合同负债、青岛项目开业爬坡和节假日高频经营数据',improvement:'核心景区场次和上座率共同提升，弱势项目减亏，新项目贡献收入，客单价稳定且销售费用率下降',invalidation:'仅客流增长而客单价、毛利率和净利润继续下降，或新项目增加折旧营销负担却未形成现金回报。'}

report.summary={stage:'长期下降后的低位横盘筑底',rating:'基本面有底、技术面未确认，等待明确触发',confidence:'中高',conclusion:`宋城演艺具备低负债和强现金流，但截至${report.asOf}，股价${fmt(close)}元仍低于全部六条均线，盈利也未转正增长。当前是底部观察区，不是已经确认的反转。`,evidence:['2025经营现金流15.46亿元显著高于归母净利8.18亿元，财务安全垫较强','2026Q1收入和归母净利仍同比下降5.29%和15.06%，盈利拐点尚未出现',`价格低于MA5/20/60/90/145，20日成交额比仅${fmt(vr20)}倍，主动买盘不足`]}

d.headline='5.59元低点后的低位横盘，MACD微弱转正但均线系统仍为空头'
d.structure=[{stage:'下降末段',period:'近250交易日',range:'9.58—5.59元',feature:'长期重心下移，MA145仍向下形成主要反压'},{stage:'底部横盘',period:'最近60交易日',range:`5.82—${fmt(trialTrigger)}元`,feature:'股价围绕MA20/60反复，成交额缩减，尚未完成放量离开'},{stage:'当前回落',period:'最近5交易日',range:`${fmt(close)}元附近`,feature:`价格略低于MA20 ${fmt(ma[20])}元和MA60 ${fmt(ma[60])}元，KDJ超卖但量能仅${fmt(vr20)}倍20日均额`},{stage:'反转确认',period:'待触发',range:`${fmt(trialTrigger)}—${fmt(addTrigger)}元`,feature:`先放量突破${fmt(trialTrigger)}元，再收复MA145对应的${fmt(addTrigger)}元，才能从筑底升级为中期反转`}]
d.plainConclusion=`当前不直接买。左侧需在5.95—6.15元止跌，重新站上MA20 ${fmt(ma[20])}元与MA60 ${fmt(ma[60])}元，次日收盘≥6.20元且成交额≥0.8倍20日均额；右侧需收盘突破${fmt(trialTrigger)}元且成交额≥1.2倍20日均额。跌破${fmt(invalidation)}元则筑底失败。`
d.signals={bull:['股价距离近250日低点5.59元不远，估值和绝对位置已明显回落','MACD DIF略高于DEA，绿柱已消失，但动能仍很弱','KDJ-J约8，进入超卖区，具备技术反抽条件','公司负债率低、经营现金流强，为估值提供基本面安全垫'],risk:['价格仍低于MA5、MA10、MA20、MA60、MA90和MA145，均线空头结构未扭转',`20日成交额比仅${fmt(vr20)}倍，尚未看到增量资金确认`,'MACD柱体接近零，可能再次死叉；KDJ超卖也可能继续钝化','2026Q1收入和利润继续下降，旺季及青岛项目兑现存在预期差']}
report.technical.rating='低位筑底但未确认，不直接介入'
report.technical.wave=`主计数：9.58元以来的ABC调整已进入C浪后段，5.59—5.82元为潜在中期低点区；突破${fmt(trialTrigger)}元后可视为修复浪启动。备选计数：当前仅为下降趋势中的横盘中继，跌破${fmt(invalidation)}元则备选占优。`
report.technical.chan=`日线最近20日重叠区间约${fmt(Math.max(...report.technical.ohlc.slice(-20).map(x=>x.low)))}—${fmt(Math.min(...report.technical.ohlc.slice(-20).map(x=>x.high)))}元（缺少30分钟笔段，仅作中枢代理）。当前在中枢偏下沿；突破${fmt(trialTrigger)}元并回踩不破才是三买候选，收盘跌破${fmt(invalidation)}元失效。`
report.technical.trigger=`左侧：5.95—6.15元止跌并收复MA20/60，次日收盘≥6.20元且成交额≥0.8倍20日均额；右侧：收盘突破${fmt(trialTrigger)}元且成交额≥1.2倍20日均额；长期加仓：收盘突破${fmt(addTrigger)}元并回踩不破`
report.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或半年报收入/扣非利润降幅扩大且青岛项目爬坡不及预期`
report.technical.riskReward=`左侧按6.20/${fmt(invalidation)}元计算风险约${fmt((6.2/invalidation-1)*100)}%；第一目标${fmt(trialTrigger)}元，风险收益偏低，必须等量价确认`

report.executionPlan={action:'现在不介入；只观察5.95—6.15元区域能否形成有效底部',trigger:report.technical.trigger,add:`突破${fmt(trialTrigger)}元后回踩不破，半年报确认核心景区经营改善、销售费用效率提升；进一步突破${fmt(addTrigger)}元再考虑增加风险暴露`,priceInvalidation:`收盘跌破${fmt(invalidation)}元取消本轮筑底交易`,fundamentalInvalidation:'客流增长但客单价和利润率继续下降、弱势景区亏损扩大、青岛项目爬坡不及预期，或再次出现重大财报差错/非标审计',nextReview:`2026-08-22半年报预约披露日，或收盘突破${fmt(trialTrigger)}元后`}

report.auditRiskHistory.overallRisk='中等风险（历史非标已处置，仍需观察）'
report.auditRiskHistory.tone='warning'
report.auditRiskHistory.summary='2022年因花房集团长期股权投资及相关收益无法取得充分审计证据而被出具保留意见；公司在2023年报中追溯更正并披露影响已消除，2023—2025连续三年标准无保留。2025年监管警示说明历史差错治理仍应持续关注。'
report.auditRiskHistory.watch='继续核对花房集团相关长期股权投资、投资收益和历史差错更正；若再出现非标意见、重大追溯调整或监管措施，则触发治理降级。'
report.auditRiskHistory.items=report.auditRiskHistory.items.map(item=>item.year==='2022'?{...item,issue:'花房集团相关长期股权投资、投资收益等无法取得充分适当审计证据，形成保留意见；2023年报追溯更正并由新审计机构出具影响消除专项说明。'}:item.year==='2023'?{...item,change:'由立信变更为中喜；监管曾关注变更原因',issue:'标准无保留；同时完成2022年非标事项影响消除、前期差错更正和相关报表追溯重述。'}:item)

report.companyComparison=[{tier:'研究对象',tone:'warning',company:'宋城演艺',ticker:'300144.SZ',driver:'现场演艺IP、存量景区运营和跨区域复制',valuation:'PE-TTM 20.40倍；PB 2.03倍',risk:'客流转化、营销效率、新项目爬坡及历史治理'},...peers.map(x=>({tier:x.segment,tone:'neutral',company:x.name,ticker:x.code,driver:`最新收入/净利同比${Number.isFinite(x.f.or_yoy)?fmt(x.f.or_yoy):'—'}%/${Number.isFinite(x.f.netprofit_yoy)?fmt(x.f.netprofit_yoy):'—'}%`,valuation:`PE-TTM ${Number.isFinite(x.b.pe_ttm)?fmt(x.b.pe_ttm):'不适用'}倍；PB ${Number.isFinite(x.b.pb)?fmt(x.b.pb):'—'}倍`,risk:'客流、天气、季节性、项目扩容和估值波动'}))]

const eps=close/20.3977
report.valuationScenarios=[{name:'乐观',weight:'25%',assumption:'暑期客流和客单价共振，弱势景区减亏，青岛项目顺利爬坡',valuation:`当前股价隐含TTM EPS约${fmt(eps)}元；盈利恢复可消化20.40倍PE`,signal:'收入和扣非利润转正，销售费用率下降，经营现金流继续强'},{name:'基准',weight:'50%',assumption:'核心景区稳健、新项目贡献有限，利润降幅逐季收窄',valuation:'PE-TTM 20.40倍对应成熟景区现金流与有限增长的中性定价',signal:'收入接近持平、利润小幅下降、现金流保持高覆盖'},{name:'悲观',weight:'25%',assumption:'客流或客单价承压，弱势景区和新项目折旧营销拖累',valuation:'盈利下修叠加治理折价与估值压缩',signal:`半年报低于预期且股价跌破${fmt(invalidation)}元`}]

report.marketResearch={fullTextStatus:'available',statusNote:'已接入2025年报、2026Q1公开数据、公司投资者交流及公开机构研究摘要',period:'2026-04-23—2026-05-18',reportCount:5,institutionCount:4,companyForecastSampleCount:2,reportScope:'公司公告、投资者关系记录与公开研究；不使用目标价替代判断',consensus:'强现金流和IP壁垒是共识，客流转化、青岛爬坡和利润恢复速度是分歧',revisionTrend:'市场关注从旅游客流总量转向单景区经营、营销效率和新项目回报',synthesis:{verdict:'宋城的资产负债和现金流为底部提供支撑，但下一轮估值修复必须来自利润增长而不是单纯旺季题材。',confidence:'公告原文+公开研报摘要 · 中高置信度',confidenceTone:'warning',evidenceNote:'年报用于核对分景区和现金流，投资者交流用于识别项目与运营变量，机构研究只用于观察预期。',commonPoints:[{point:'现金流和低负债是最强安全垫',reason:'2025经营现金流15.46亿元显著高于归母净利，负债率低。',support:'年报+投资者交流'},{point:'存量项目分化，内容和营销决定客流转化',reason:'上海、西安等增长，张家界、广东、丽江、三亚承压。',support:'2025年报+机构点评'},{point:'新项目与旺季是主要催化',reason:'青岛项目、内容焕新和暑期客流可能带来增量。',support:'投资者关系记录'}],differences:[{topic:'利润何时恢复',views:'乐观观点认为营销优化和旺季可推动改善；谨慎观点认为弱势景区、费用和新项目爬坡仍会拖累。',investmentMeaning:'需要半年报收入、销售费用率和扣非利润共同确认。'},{topic:'低估值是否足够',views:'现金流和净资产提供支撑；但长期均线空头和盈利下滑意味着估值可能长期低位。',investmentMeaning:'估值只能决定观察价值，不能代替量价触发。'}],integratedView:'长期看宋城仍是稀缺现场演艺平台；中期看盈利处于筑底期；短期看6.56元放量突破才是资金开始交易旺季和项目改善的信号，7.10元附近才是长期反转确认。',validation:'半年报核对分景区收入、客流/场次、销售费用率、扣非利润和现金流；技术上核对MA20/60、MA90、MA145与六档量能。'},integratedConclusion:'基本面有安全垫，但盈利和技术趋势未反转；当前不直接抄底。',evidenceCheck:'年报、投资者交流、审计更正说明、Tushare财务估值与875根真实OHLCV已交叉验证。',topReports:[
  {date:'2026-05-13',institution:'宋城演艺',title:'投资者关系活动记录：景区运营、AI应用与内容焕新',type:'公司交流',url:'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12318442&stockid=300144'},
  {date:'2026-04-24',institution:'宋城演艺/深交所',title:'2025年年度报告',type:'定期报告',url:'https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-24/e7a27e5e-b38f-41c9-89d6-71bc434c9698.PDF'},
  {date:'2026-04-23',institution:'宋城演艺',title:'2025年经营回顾与2026年展望投资者交流',type:'公司交流',url:'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12175094&stockid=300144'},
  {date:'2026-05-18',institution:'公开机构研究',title:'股东回报提升，2026Q1营销优化初见成效',type:'研报摘要',url:'https://www.nxny.com/report/view_6297160.html'},
  {date:'2024-04-26',institution:'宋城演艺',title:'2022年度保留意见涉及事项影响已消除专项说明',type:'治理核验',url:'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=10090003&stockid=300144'}],freeSources:[]}

report.catalysts=[{date:'2026-08-22',event:'2026年半年度报告预约披露',expectation:'验证暑期前经营、分景区收入、销售费用率、扣非利润和现金流',status:'pending',statusLabel:'交易所预约日'},{date:'2026年暑期',event:'全国景区暑期旺季与内容焕新',expectation:'观察演出场次、上座率、客流和客单价是否共振',status:'pending',statusLabel:'季节性窗口'},{date:'2026年',event:'青岛项目开业及爬坡',expectation:'具体开业与经营数据以公司正式公告为准，不把旧调研计划日期当成已发生事实',status:'pending',statusLabel:'待确认'}]
report.bearCase=['旅游客流增长无法转化为客单价和利润，销售费用率持续上升','弱势存量景区与青岛新项目爬坡增加折旧和运营负担','2022非标与历史会计差错虽已处置，但监管警示和审计机构变更提高治理折价；技术上六条均线仍为空头']
report.evidenceQuality=[{grade:'A',label:'行情、财务与估值',note:`Tushare前复权OHLCV、财务三表和daily_basic，截至${report.asOf}`},{grade:'A',label:'经营与治理',note:'2025年报、投资者关系记录、非标事项影响消除及差错更正说明'},{grade:'B',label:'市场预期',note:'公开机构研究摘要用于共识与分歧，不采用目标价'},{grade:'C',label:'筹码与次级别缠论',note:'无可验证筹码接口与30分钟笔段，明确显示数据边界'}]
report.dataGaps=['筹码平均成本、获利比例和集中度无可验证接口，不展示估算值','缺少30分钟级别笔段，缠论只使用日线重叠区间作为中枢代理','青岛项目具体开业日和实际经营贡献尚未由本次取得的最新正式公告确认','2026半年报尚未披露，旺季经营和利润拐点仍无法验证']
report.metrics=[{label:'2025营业收入',value:'22.58',unit:'亿元',change:'同比-6.61%',direction:'down',series:[24.18,22.58]},{label:'2025归母净利润',value:'8.18',unit:'亿元',change:'同比-22.03%',direction:'down',series:[10.49,8.18]},{label:'2025经营现金流',value:'15.46',unit:'亿元',change:'同比+6.96%',direction:'up',series:[14.45,15.46]},{label:'2026Q1营业收入',value:'5.34',unit:'亿元',change:'同比-5.29%',direction:'down',series:[5.34]},{label:'PE-TTM',value:'20.40',unit:'倍',change:'PB 2.03倍',direction:'flat',series:[20.40]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'量能不足',direction:'down',series:report.technical.volumeAverages.map(x=>x.ratio)}]
report.sources=[`Tushare Pro daily/adj_factor/daily_basic/fina_indicator/财务三表/fina_audit，${report.asOf}提取`,'宋城演艺2025年报：https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-24/e7a27e5e-b38f-41c9-89d6-71bc434c9698.PDF','宋城演艺2026年4月23日投资者交流：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12175094&stockid=300144','宋城演艺2022非标事项影响消除说明：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=10090003&stockid=300144','2025年历史会计差错监管警示信息：https://www.nbd.com.cn/articles/2025-06-19/3914680.html']

await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({id:report.id,close,ma20:ma[20],ma60:ma[60],ma90:ma[90],ma145:ma[145],trialTrigger,addTrigger,invalidation,vr20,peers:peers.map(x=>x.name)},null,2))
