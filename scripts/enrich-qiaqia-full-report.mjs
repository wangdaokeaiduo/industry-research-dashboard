import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const p=path.join(root,'data/reports/002557-stock.json')
const r=JSON.parse(await fs.readFile(p,'utf8'))
const d=r.technical.technicalDetail,s=d.marketStats
const ma=Object.fromEntries(d.movingAverages.map(x=>[x.period,x.value]))
const vr20=r.technical.volumeAverages.find(x=>x.days===20).ratio
const macd=d.indicators.find(x=>x.name==='MACD'),kdj=d.indicators.find(x=>x.name==='KDJ'),rsi=d.indicators.find(x=>x.name==='RSI')
const close=s.close, trigger=21.21, invalidation=18.54
const fmt=(x,n=2)=>Number(x).toFixed(n)

r.researchDepth='full'
r.decisionLevel='wait_trigger'
r.tradeDecision={asOf:r.asOf,verdict:'业绩拐点已出现，但股价仍在六条均线下方；适合等待趋势确认，不适合仅因为低估直接左侧重仓',reason:`2026H1预告归母净利2.40—2.65亿元、同比+170.75%—+198.96%，但截至${r.asOf}收盘${fmt(close)}元仍低于MA5/10/20/60/90/145，20日成交额比只有${fmt(vr20)}倍，MACD仍为空头。这是“基本面领先、价格未确认”的预期差。`,checks:[
 {name:'盈利拐点',current:'2026H1预告归母净利2.40—2.65亿元，同比+170.75%—198.96%',threshold:'半年报实际值落在预告区间且毛利率改善',status:'partial'},
 {name:'隐含Q2',current:'预计归母净利0.72—0.97亿元（H1减Q1计算）',threshold:'Q2扣非利润和现金流同向恢复',status:'partial'},
 {name:'价格结构',current:`收盘${fmt(close)}元，MA20 ${fmt(ma[20])}元、MA145 ${fmt(ma[145])}元`,threshold:`先站回MA20，右侧需收盘突破${fmt(trigger)}元`,status:'unmet'},
 {name:'20日量能',current:`${fmt(vr20)}倍`,threshold:'突破时≥1.20倍',status:'unmet'},
 {name:'MACD',current:macd.value,threshold:'DIF上穿DEA且红柱扩大',status:'unmet'},
 {name:'超卖修复',current:`${kdj.value}；${rsi.value}`,threshold:'超卖后收盘重新站上MA5，不把超卖单独当买点',status:'partial'},
 {name:'现金流',current:'2026Q1经营现金0.42亿元，同比-76.44%',threshold:'H1经营现金流与利润同向改善',status:'unmet'},
 {name:'审计治理',current:'2021—2025年均为标准无保留意见，事务所无异常变更',threshold:'无非标、重大差错或监管风险',status:'met'}]}

r.decisionOverview={items:[
 {label:'产业位置',value:'瓜子龙头+坚果第二曲线',score:82,comment:'品牌、全国渠道和原料采购是核心壁垒'},
 {label:'盈利趋势',value:'成本下行驱动强修复',score:78,comment:'H1预增170.75%—198.96%，主因销售增加与葵花籽成本下降'},
 {label:'现金质量',value:'尚待半年报确认',score:52,comment:'Q1经营现金流同比-76.44%，应收同比上升'},
 {label:'估值',value:'中性偏低',score:70,comment:'PE-TTM约23.92倍、PB约1.80倍，需用H1落地验证前瞻盈利'},
 {label:'技术位置',value:'全均线下方的超卖区',score:39,comment:`收盘低于六条均线，MACD空头，20日量比${fmt(vr20)}倍`}
],coreConflict:'葵花籽成本下降和春节销售带来利润强反弹，但市场担心低基数效应、现金流背离及成本红利的持续性。',action:`不在${fmt(close)}元附近猜底；等站回MA20 ${fmt(ma[20])}元或放量突破${fmt(trigger)}元。`}

r.summary={stage:'基本面反转初步确认，技术面仍在寻底',rating:'值得跟踪，但交易需等待价格和量能确认',confidence:'中高',conclusion:`2026H1利润预增强于股价表现，存在预期差；但${fmt(close)}元低于全部核心均线，弱势未被破坏前只能观察。`,evidence:['H1归母净利预计2.40—2.65亿元，同比+170.75%—198.96%','Q1毛利率25.10%，较上年同期显著修复；但经营现金流下降76.44%','收盘低于MA5/10/20/60/90/145，量能与MACD都未确认反转']}

r.prosperity={level:'企业盈利高景气修复，行业需求仍是结构性',direction:'向上',directionTone:'positive',score:73,verdict:'盈利改善主要来自销量增加和葵花籽成本下降，坚果与新渠道决定增长持续性。',dimensions:[{name:'2026Q1收入',value:'22.22亿元',change:'同比+41.46%',tone:'positive'},{name:'2026Q1归母净利',value:'1.68亿元',change:'同比+117.82%',tone:'positive'},{name:'2026H1预告',value:'2.40—2.65亿元',change:'同比+170.75%—198.96%',tone:'positive'},{name:'Q1经营现金流',value:'0.42亿元',change:'同比-76.44%',tone:'negative'}],driver:'葵花籽采购成本、节庆销量、经销商库存、坚果品类增长、礼盒与电商/零食量贩渠道',improvement:'H1收入与扣非利润高增，毛利率继续回升，经营现金流转强',deterioration:'瓜子终端需求疲弱、坚果增速不足、原料重新涨价或渠道库存积压'}

r.supplyDemand={state:'葵花籽原料成本回落，库存与节日需求决定利润弹性',tone:'positive',direction:'利润环比改善',conclusion:'供给端的葵花籽成本下降是当前最大利好，需求端则需从节日销售扩散到日常消费、坚果和新渠道；否则H1高增可能只是低基数叠加成本红利。',demand:{status:'修复中',evidence:'2026Q1收入同比+41.46%，但具有春节时点和低基数影响',change:'等待H1瓜子/坚果/其他分品类确认',tone:'warning'},supply:{status:'原料供给改善',evidence:'公司明确披露葵花籽采购成本下降',change:'成本红利进入利润表',tone:'positive'},inventory:{status:'季节性高位',evidence:'2026Q1末存货15.65亿元，较2025年末19.33亿元回落，仍需核对周转和经销商库存',change:'公司表内存货去化',tone:'warning'},price:{status:'价格稳定性待验证',evidence:'利润改善公告主因是销售增加和原料下降，未披露大幅提价贡献',change:'不把毛利改善全部归因于定价权',tone:'neutral'},profit:{status:'强修复',evidence:'H1归母净利预增170.75%—198.96%',change:'关注成本红利可持续性和现金转化',tone:'positive'},leadingIndicator:'葵花籽收购价、销售吨价、经销商库存、坚果收入、毛利率、存货周转和经营现金流',improvement:'原料价格稳定、H1销售增长不只来自春节错期，坚果与新渠道增长，现金流跟上利润',invalidation:'原料反弹、毛利率再度下滑、库存或应收上升且现金流持续弱于利润。'}

d.headline='业绩预增与全均线空头的背离：股价正在布林下轨附近寻底'
d.plainConclusion=`通俗讲：业绩变好了，但资金还没有用价格投票。${fmt(close)}元低于六条均线，KDJ-J ${kdj.value.match(/J ([\d.-]+)/)?.[1]??'—'}已偏超卖，但超卖不等于见底。左侧至少等收盘重新站上MA20 ${fmt(ma[20])}元、次日不跌回且量能恢复至0.9倍20日均额；右侧等收盘突破${fmt(trigger)}元且放量至1.2倍。收盘跌破${fmt(invalidation)}元则寻底失败。`
d.signals={bull:['2026H1归母净利预增170.75%—198.96%，基本面领先改善','价格接近BOLL下轨18.60元，RSI6约26、KDJ-J约8.67，抛压已进入超卖区','当日成交额只有20日均额0.81倍，下跌未出现恐慌型爆量'],risk:['收盘低于MA5/10/20/60/90/145，均线系统没有转多','MACD在零轴附近死叉，未出现底背离后的确认金叉','Q1经营现金流同比-76.44%，业绩修复的现金含量需等H1确认']}
r.technical.rating='基本面先行改善，技术面仍待筑底确认'
r.technical.wave=`主计数：21.21元以来运行C浪下探，18.54—18.60元是本轮调整的首个防守区；重新站上${fmt(ma[20])}元才能转入反弹浪。备选计数：尚在2022年高点以来的长期下行趋势内，跌破${fmt(invalidation)}元则备选占优。`
r.technical.fibonacci='以近期18.54—21.21元波段为锚，向上0.382/0.5/0.618修复位约19.56/19.88/20.19元；21.21元为整段收复和右侧突破位。'
r.technical.chan=`日线最近20日价格重叠中枢约19.48—20.06元（无30分钟完整笔段，仅作日线代理）。当前低于中枢下沿，站回下沿是一买后反弹候选；放量突破${fmt(trigger)}元并回踩不破才是三买候选。`
r.technical.trigger=`左侧：收盘站上MA20 ${fmt(ma[20])}元，次日不跌回且成交额≥0.9倍20日均额；右侧：收盘突破${fmt(trigger)}元且成交额≥1.2倍20日均额`
r.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或H1实际净利低于预告下限且经营现金流继续显著弱于利润`
r.technical.riskReward=`若按MA20上方约19.70元试错、${fmt(invalidation)}元失效，价格风险约${fmt((19.70/invalidation-1)*100)}%；首个目标${fmt(trigger)}元，未触发前不成立。`

r.executionPlan={action:'现在不猜底；将洽洽食品放入“业绩拐点、价格待确认”观察池',trigger:r.technical.trigger,add:`突破${fmt(trigger)}元后回踩不破，且8月25日半年报确认净利落在预告区间、毛利率改善、经营现金流修复，再评估加仓`,priceInvalidation:`收盘跌破${fmt(invalidation)}元`,fundamentalInvalidation:'H1低于预告下限，或原料成本反弹导致毛利率再次下滑，或应收/库存上升伴随经营现金流恶化',nextReview:'2026-08-25半年报预约披露日，或价格先突破21.21元时'}

r.valuationScenarios=[{name:'乐观',weight:'25%',assumption:'成本红利持续，瓜子销量恢复，坚果和新渠道高增，现金流跟上',valuation:'前瞻盈利上修可消化当前PE-TTM约23.92倍',signal:'H1收入/扣非利润强增，毛利率和现金流同时改善'},{name:'基准',weight:'50%',assumption:'H1预告兑现，但Q1的春节时点效应使下半年增速正常化',valuation:'PE-TTM 23.92倍属合理区间，需继续的利润恢复支撑',signal:'H1落在预告中值，毛利改善但现金流只温和恢复'},{name:'悲观',weight:'25%',assumption:'高增主要由低基数和原料成本驱动，需求与现金转化弱',valuation:'盈利预期下修并压缩估值溢价',signal:`H1低于预告下限或股价跌破${fmt(invalidation)}元`}]
r.companyComparison=[{tier:'研究对象',tone:'warning',company:'洽洽食品',ticker:'002557.SZ',driver:'瓜子核心品类、坚果第二曲线、原料成本与全渠道',valuation:'PE-TTM约23.92倍；PB约1.80倍',risk:'品类集中、原料波动、现金流转化'},{tier:'休闲食品渠道',tone:'neutral',company:'三只松鼠',ticker:'300783.SZ',driver:'电商与线下分销、坚果品类',valuation:'以最新定期报告和daily_basic复核',risk:'渠道费用与供应链效率'},{tier:'魔芋零食',tone:'neutral',company:'卫龙美味',ticker:'9985.HK',driver:'大单品、休闲食品渠道',valuation:'港股口径需单独复核',risk:'单品依赖和估值波动'},{tier:'烘焙零食',tone:'neutral',company:'盐津铺子',ticker:'002847.SZ',driver:'产品创新、量贩零食渠道',valuation:'以最新定期报告和daily_basic复核',risk:'高增速持续性和渠道结构'}]
r.marketResearch={fullTextStatus:'partial',statusNote:'以公司年报、Q1、H1业绩预告和公开机构摘要交叉核验；未取得所有付费研报全文',period:'2026-04-21—2026-08-14',reportCount:4,institutionCount:3,companyForecastSampleCount:1,reportScope:'公司公告与公开行业/公司研究',consensus:'葵花籽成本下降、低基数和销售恢复使2026利润高增',revisionTrend:'7月14日H1预告把盈利修复从“预期”升级为“公告区间”，但股价未趋势化',synthesis:{verdict:'业绩拐点的可信度明显上升，但估值能否扩张取决于增长从成本端扩散到需求端。',confidence:'A级公告为主 · 中高置信度',confidenceTone:'warning',evidenceNote:'预告未经审计，最终数字与分品类细节待半年报。',commonPoints:[{point:'原料成本下降是利润修复主因',reason:'公司在H1预告中明确披露葵花籽采购成本下降。',support:'2026H1业绩预告'},{point:'销售恢复已经出现',reason:'Q1收入同比+41.46%，H1预告继续强调销售增加。',support:'2026Q1+H1预告'},{point:'瓜子外的第二曲线决定长期估值',reason:'单靠原料周期只能带来利润弹性，坚果和新渠道决定增长上限。',support:'2025年报与行业研究'}],differences:[{topic:'H1高增的持续性',views:'乐观观点强调成本回落和渠道修复；谨慎观点强调低基数、春节错期与现金流背离。',investmentMeaning:'半年报必须同时看收入、毛利率、现金流和库存，不能只看净利润。'},{topic:'估值中枢',views:'品牌稳定性支撑估值；增长不足与原料周期性限制溢价。',investmentMeaning:'需等盈利连续性确认，不直接用Q1高增线性外推。'}],integratedView:'公司已走出2025年成本压力最大阶段，但股价仍在定价修复能否持续。基本面是领先指标，21.21元放量突破是价格确认。',validation:'8月25日半年报核对分品类收入、毛利率、存货、应收和经营现金流。'},integratedConclusion:'中长期研究价值上升，短期交易价值尚未由量价确认。',evidenceCheck:'已核对公司年报、Q1和H1业绩预告；真实前复权OHLCV与财务接口交叉验证。',topReports:[{date:'2026-07-14',institution:'洽洽食品/深交所',title:'2026年半年度业绩预告',type:'业绩预告',url:'https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12442854&stockid=002557'},{date:'2026-04-21',institution:'洽洽食品/巨潮资讯',title:'2026年第一季度报告',type:'定期报告',url:'https://static.cninfo.com.cn/finalpage/2026-04-21/1225132053.PDF'},{date:'2026-04-21',institution:'洽洽食品/巨潮资讯',title:'2025年年度报告',type:'定期报告',url:'https://static.cninfo.com.cn/finalpage/2026-04-21/1225132043.PDF'}],freeSources:[]}
r.catalysts=[{date:'2026-08-25',event:'2026年半年报预约披露',expectation:'确认H1净利落点、分品类收入、毛利率、存货和经营现金流',status:'pending',statusLabel:'交易所预约日'},{date:'2026-08-25—2026-09-01',event:'半年报业绩说明与渠道验证窗口',expectation:'核对瓜子/坚果销量、原料成本和经销商库存',status:'pending',statusLabel:'报告后验证'},{date:'2026-10-20—2026-10-31',event:'2026年三季报窗口',expectation:'验证H1高增能否延续至非春节季度',status:'pending',statusLabel:'季报窗口'}]
r.bearCase=['2026H1高增大部分来自2025低基数和葵花籽成本下降，可能不是需求端的持续高增','Q1经营现金流下降76.44%，应收增长，利润的现金含量仍需验证','股价低于六条核心均线且MACD空头，说明市场对盈利持续性还没有形成共识']
r.evidenceQuality=[{grade:'A',label:'业绩预告与财务',note:'2026H1预告、2026Q1、2025年报及Tushare财务三表'},{grade:'A',label:'行情与估值',note:`Tushare前复权OHLCV与daily_basic，截至${r.asOf}`},{grade:'B',label:'供需与渠道',note:'公司公告可确认原料成本下降；经销商库存和分渠道动销待H1全文'},{grade:'C',label:'筹码与次级别缠论',note:'无真实筹码接口和30分钟完整笔段，不生成伪精确值'}]
r.dataGaps=['无可验证的筹码平均成本、获利比例与集中度接口，因此不展示估算筹码','2026H1尚未披露正式报告，分品类收入、毛利率和经营现金流只能等待8月25日验证','经销商终端库存无月度公开系列，表内存货不等于渠道库存','无30分钟级别完整笔段，缠论仅使用日线重叠中枢代理']
r.metrics=[{label:'2026H1预告归母净利',value:'2.40—2.65',unit:'亿元',change:'同比+170.75%—198.96%',direction:'up',series:[0.886,2.4,2.65]},{label:'隐含2026Q2归母净利',value:'0.72—0.97',unit:'亿元',change:'H1预告减Q1计算',direction:'up',series:[0.72,0.97]},{label:'2026Q1营收',value:'22.22',unit:'亿元',change:'同比+41.46%',direction:'up',series:[15.71,22.22]},{label:'2026Q1经营现金流',value:'0.42',unit:'亿元',change:'同比-76.44%',direction:'down',series:[1.78,0.42]},{label:'PE-TTM',value:'23.92',unit:'倍',change:'PB 1.80倍',direction:'flat',series:[23.92]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'缩量弱势',direction:'down',series:r.technical.volumeAverages.map(x=>x.ratio)}]
r.sources=[`Tushare Pro daily/adj_factor/daily_basic/forecast/fina_indicator/财务三表/fina_audit，${r.asOf}提取`,'洽洽食品2026年半年度业绩预告：https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12442854&stockid=002557','洽洽食品2026年一季报：https://static.cninfo.com.cn/finalpage/2026-04-21/1225132053.PDF','洽洽食品2025年报：https://static.cninfo.com.cn/finalpage/2026-04-21/1225132043.PDF']

await fs.writeFile(p,JSON.stringify(r,null,2)+'\n')
console.log(JSON.stringify({id:r.id,asOf:r.asOf,close,trigger,invalidation,vr20,depth:r.researchDepth},null,2))
