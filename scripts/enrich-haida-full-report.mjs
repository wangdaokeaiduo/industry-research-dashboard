import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const reportPath=path.join(root,'data/reports/002311-stock.json')
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
const fmt=(n,d=2)=>Number(n).toFixed(d)
async function api(api_name,params,fields){const b=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(b.code!==0)throw new Error(`${api_name}: ${b.msg}`);return(b.data?.items||[]).map(row=>Object.fromEntries(b.data.fields.map((key,i)=>[key,row[i]])))}

const peers=[['000876.SZ','新希望'],['600438.SH','通威股份'],['002714.SZ','牧原股份']]
const peerRows=[]
for(const [code,name] of peers){
  const [basic,financial]=await Promise.all([
    api('daily_basic',{ts_code:code,start_date:'20260801',end_date:'20260813'},'trade_date,pe_ttm,pb,total_mv'),
    api('fina_indicator',{ts_code:code,start_date:'20260101',end_date:'20260813'},'ann_date,end_date,or_yoy,netprofit_yoy,roe')
  ])
  peerRows.push({code,name,basic:basic[0]||{},financial:financial[0]||{}})
}

const detail=report.technical.technicalDetail,stats=detail.marketStats
const ma=Object.fromEntries(detail.movingAverages.map(x=>[x.period,x.value]))
const vr20=report.technical.volumeAverages.find(x=>x.days===20).ratio
const macd=detail.indicators.find(x=>x.name==='MACD'),kdj=detail.indicators.find(x=>x.name==='KDJ'),rsi=detail.indicators.find(x=>x.name==='RSI')
const close=stats.close,trigger=50.50,invalidation=44.80
const q1Revenue=290.10,q1Profit=8.87,q1Cfo=.24,pe=19.49,pb=2.98
const technicalWeak=close<ma[5]&&close<ma[20]&&close<ma[60]&&close<ma[145]

report.decisionLevel='wait_trigger'
report.tradeDecision={asOf:report.asOf,verdict:'基本面仍有成长性，但技术面处于弱势缩量回撤，暂不左侧接刀',reason:`截至${report.asOf}收盘${fmt(close)}元，价格位于MA5/20/60/145下方，20日成交额比仅${fmt(vr20)}倍，MACD仍为空头；同时2026Q1收入同比增长13.19%，但归母净利润同比下降30.82%，说明饲料份额增长尚未转化为整体利润共振。`,checks:[
  {name:'站回第一阻力',current:`收盘${fmt(close)}元`,threshold:`先收复MA20 ${fmt(ma[20])}元`,status:close>=ma[20]?'met':'unmet'},
  {name:'右侧价格突破',current:`收盘${fmt(close)}元`,threshold:`收盘≥${fmt(trigger)}元`,status:close>=trigger?'met':'unmet'},
  {name:'20日量能',current:`当日/20日均额=${fmt(vr20)}倍`,threshold:'≥1.20倍',status:vr20>=1.2?'met':'unmet'},
  {name:'中长期趋势',current:`MA60/145=${fmt(ma[60])}/${fmt(ma[145])}元`,threshold:'收盘同时站上MA60与MA145',status:close>=ma[60]&&close>=ma[145]?'met':'unmet'},
  {name:'动量止跌',current:`${macd.value}；${kdj.value}`,threshold:'MACD绿柱收窄并出现止跌K线',status:'unmet'},
  {name:'饲料主业增长',current:'2025年饲料总销量3208万吨，同比+21%',threshold:'销量和份额继续增长',status:'met'},
  {name:'利润共振',current:'2026Q1归母净利同比-30.82%',threshold:'饲料增利能覆盖养殖周期拖累',status:'unmet'},
  {name:'审计治理',current:'2021—2025均为标准无保留意见',threshold:'无非标、重大差错或监管否决',status:'met'}]}

report.decisionOverview={items:[
  {label:'产业位置',value:'全球饲料龙头',score:88,comment:'饲料+种苗+动保+养殖服务，2025年外销量2986万吨'},
  {label:'成长质量',value:'收入增、利润降',score:58,comment:'2026Q1营收+13.19%，归母净利-30.82%'},
  {label:'现金流',value:'季节性偏弱',score:52,comment:`2026Q1经营现金流${fmt(q1Cfo)}亿元，需与半年报交叉验证`},
  {label:'估值',value:'中性偏合理',score:66,comment:`PE-TTM ${fmt(pe)}倍，PB ${fmt(pb)}倍，但隐含饲料份额继续提升的预期`},
  {label:'技术位置',value:'弱势缩量回撤',score:36,comment:`收盘${fmt(close)}元，低于六条均线，20日量比${fmt(vr20)}倍`}
],coreConflict:'饲料主业正在用份额和海外扩张穿越周期，但生猪养殖亏损与低毛利饲料结构压制整体利润；股价已对Q1利润下滑做出反应，但尚未出现资金回流。',action:'把公司放入中线观察池，等半年报验证饲料利润和养殖减亏；交易上等价格、量能和MACD三者共振。'}

report.prosperity={level:'主业高景气，整体利润承压',direction:'饲料份额上行 / 养殖周期拖累',directionTone:'warning',score:67,verdict:'公司不是纯生猪股。饲料外销量、海外市场和水产景气支持收入增长，但生猪养殖和产品结构使利润弹性低于销量弹性。',dimensions:[
  {name:'2025饲料销量',value:'3208万吨',change:'同比+21%',tone:'positive'},
  {name:'2025外销量',value:'2986万吨',change:'市占率继续提升',tone:'positive'},
  {name:'2026Q1收入',value:`${fmt(q1Revenue)}亿元`,change:'同比+13.19%',tone:'positive'},
  {name:'2026Q1归母净利',value:`${fmt(q1Profit)}亿元`,change:'同比-30.82%',tone:'negative'}
],driver:'国内饲料份额提升、海外产能与渠道、水产饲料景气、玉米/豆粕/鱼粉原料价差、生猪养殖减亏',improvement:'半年报中饲料外销增速维持两位数，饲料利润率不降，生猪业务亏损收窄，经营现金流同比改善',deterioration:'饲料增量靠低价换量、海外扩张不及预期、鱼粉等原料涨价无法传导，或生猪亏损扩大'}

report.supplyDemand={state:'饲料需求有结构性增长，但供给竞争和养殖周期仍压利润',tone:'warning',direction:'水产和海外向好，生猪端偏弱',conclusion:'普水鱼价与养殖盈利支持水产料需求，规模化养殖推动龙头饲料份额提升；但国内饲料产能充足、价格竞争强，生猪低价又拖累公司养殖业务。',demand:{status:'结构性增长',evidence:'2025年猪料/水产料/禽料外销分别同比+37%/+19%/+16%',change:'龙头份额上升',tone:'positive'},supply:{status:'行业产能充足',evidence:'国内饲料市场竞争激烈，公司依靠规模、配方与服务抢份额',change:'集中度提升',tone:'warning'},inventory:{status:'养殖品种分化',evidence:'生猪供给宽松；普水鱼景气较好；对虾与特水品种差异明显',change:'无法用单一库存指标概括',tone:'warning'},price:{status:'成本加成定价',evidence:'饲料价格受玉米、豆粕、鱼粉与配方替代能力共同影响',change:'原料传导能力是关键',tone:'warning'},profit:{status:'主业稳、养殖拖累',evidence:'2025年饲料行业毛利率9.79%，养殖行业毛利率13.66%且同比下降4.62个百分点',change:'整体利润弱于销量',tone:'negative'},leadingIndicator:'月度饲料外销、水产品价格、猪价、豆粕/鱼粉价差、饲料吨利、海外销量与经营现金流',improvement:'饲料销量增长同时吨利稳定，生猪和对虾养殖亏损收窄，原料涨价能顺畅传导',invalidation:'饲料增量但毛利率继续下行，或生猪/水产养殖损失扩大，说明规模增长没有转化为股东回报。'}

report.summary={stage:'饲料份额扩张、股价回撤阶段',rating:'中线有研究价值，短线尚不具备介入条件',confidence:'中高',conclusion:`海大集团的长逻辑在“饲料份额提升+海外复制”，而非单纯博猪周期。但截至${report.asOf}，收盘${fmt(close)}元跌破MA5/20/60/145，MACD空头且成交额只有20日均额${fmt(vr20)}倍，不宜左侧猜底。`,evidence:['2025年饲料总销量3208万吨、同比+21%，饲料份额逻辑仍强','2026Q1收入+13.19%但归母净利-30.82%，增收未增利','技术面六条均线全部未收复，20日量比0.56倍，底部还没有得到量价确认']}

detail.headline='跌破中短期均线后的缩量寻底，超卖不等于见底'
detail.plainConclusion=`现在不抢反弹。左侧方案需在${fmt(invalidation)}—${fmt(close)}元区间出现止跌K线，且收盘重新站上MA5 ${fmt(ma[5])}元、成交额恢复至20日均额0.8倍以上；更稳健的右侧方案是收复MA20 ${fmt(ma[20])}元后，放量突破${fmt(trigger)}元。`
detail.signals={bull:['KDJ-J约1.89，已进入超卖区，存在技术反抽需求','收盘接近BOLL下轨45.40元和近20日结构低点','基本面饲料份额与收入仍在增长'],risk:['价格低于MA5、MA10、MA20、MA60、MA90、MA145，趋势尚未翻多',`20日成交额比仅${fmt(vr20)}倍，资金没有明显回流`,'MACD DIF低于DEA且绿柱仍存在，KDJ超卖可能继续钝化','2026Q1利润下滑，半年报前存在业绩预期差']}
report.technical.rating='弱势缩量寻底，暂不左侧介入'
report.technical.wave=`主计数：2025年高点${fmt(Math.max(...report.technical.ohlc.slice(-250).map(x=>x.high)))}元后运行中期ABC调整，当前处于C浪后段/寻底段；备选计数：仍是下降通道的中继，跌破${fmt(invalidation)}元则备选计数占优。`
report.technical.chan=`日线近20日重叠区间约${fmt(Math.max(...report.technical.ohlc.slice(-20).map(x=>x.low)))}—${fmt(Math.min(...report.technical.ohlc.slice(-20).map(x=>x.high)))}元（仅作粗略中枢代理，无30分钟笔段数据）。当前位于区间下沿，先收复MA20，再放量突破${fmt(trigger)}元才是日线三买候选；跌破${fmt(invalidation)}元取消。`
report.technical.trigger=`左侧：${fmt(invalidation)}—${fmt(close)}元止跌，收盘站回MA5 ${fmt(ma[5])}元且成交额≥0.8倍20日均额；右侧：先收复MA20 ${fmt(ma[20])}元，再收盘突破${fmt(trigger)}元且成交额≥1.2倍20日均额`
report.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或半年报显示饲料增量不增利且养殖亏损扩大`
report.technical.riskReward='未触发介入点，暂不计算'
report.executionPlan={action:'现在不介入；只列入中线观察池',trigger:report.technical.trigger,add:`右侧突破${fmt(trigger)}元后回踩不破，且半年报显示饲料主业利润、经营现金流改善，再考虑增加风险暴露`,priceInvalidation:`收盘跌破${fmt(invalidation)}元；若尚未介入则取消左侧计划，重新等待底部`,fundamentalInvalidation:'饲料外销增速明显降档、饲料毛利率持续下滑、生猪/水产养殖亏损扩大，或经营现金流明显弱于利润',nextReview:'2026-08-25半年报披露日，或价格收复MA20后'}

report.companyComparison=[{tier:'研究对象',tone:'warning',company:'海大集团',ticker:'002311.SZ',driver:'饲料份额、水产与海外扩张',valuation:`PE-TTM ${fmt(pe)}倍；PB ${fmt(pb)}倍`,risk:'养殖周期拖累、饲料增量不增利'},...peerRows.map((x,i)=>({tier:i===0?'饲料+养殖可比':i===1?'水产饲料可比':'养殖周期参照',tone:'neutral',company:x.name,ticker:x.code,driver:`最新收入/净利同比${Number.isFinite(x.financial.or_yoy)?fmt(x.financial.or_yoy):'—'}%/${Number.isFinite(x.financial.netprofit_yoy)?fmt(x.financial.netprofit_yoy):'—'}%`,valuation:`PE-TTM ${Number.isFinite(x.basic.pe_ttm)?fmt(x.basic.pe_ttm):'不适用'}倍；PB ${Number.isFinite(x.basic.pb)?fmt(x.basic.pb):'—'}倍`,risk:i===0?'高负债与养殖波动':i===1?'饲料与光伏业务混合导致估值可比性弱':'猪价和养殖成本周期'}))]

const impliedEps=close/pe
report.valuationScenarios=[
  {name:'乐观',weight:'25%',assumption:'饲料销量继续两位数增长，海外提速，养殖减亏',valuation:`目前股价隐含TTM EPS约${fmt(impliedEps)}元；若盈利恢复且PE稳定，估值由业绩消化`,signal:'饲料吨利稳定、养殖亏损收窄、现金流改善'},
  {name:'基准',weight:'50%',assumption:'饲料份额继续上升，但养殖和低毛利结构抵消部分增长',valuation:`PE-TTM ${fmt(pe)}倍属中性，需用半年报证明利润底而非只看销量`,signal:'收入继续增长，净利下降幅度收窄'},
  {name:'悲观',weight:'25%',assumption:'饲料价格竞争加剧，原料传导受阻，养殖亏损扩大',valuation:'利润预期下修与PE压缩同时发生',signal:`半年报不及预期且股价跌破${fmt(invalidation)}元`}
]

report.marketResearch={fullTextStatus:'available',statusNote:'已接入公司年报、一季报、业绩说明会与近期机构调研原文/公开摘要',period:'2026-04-28—2026-07-13',reportCount:5,institutionCount:4,companyForecastSampleCount:2,reportScope:'海大集团公告、投资者关系记录与公开机构研究；不以目标价作为结论',consensus:'饲料份额与海外扩张是共识，养殖业务是主要分歧',revisionTrend:'市场从关注销量增长转向检验饲料吨利、鱼粉成本与养殖减亏',synthesis:{verdict:'公司具备穿越单一养殖周期的竞争力，但下一阶段估值扩张必须从“销量证据”升级为“利润与现金流证据”。',confidence:'公告/原文+公开研报摘要 · 中高置信度',confidenceTone:'warning',evidenceNote:'年报和季报用于核对数据，机构调研用于理解经营变量，分析师研报只作预期参照。',commonPoints:[{point:'饲料份额提升是最确定的增长主线',reason:'2025年总销量增长21%，猪料、水产料、禽料均实现增长。',support:'年报+业绩说明会+机构研报'},{point:'海外是第二增长曲线',reason:'公司持续强调东南亚本地化产能、种苗和饲料服务体系。',support:'2026年多次投资者关系记录'},{point:'养殖业务降低利润稳定性',reason:'2025年生猪养殖利润明显下降，2026Q1整体净利下滑。',support:'2025年报+2026一季报'}],differences:[{topic:'生猪养殖的战略价值',views:'公司强调轻资产模式、服务和能力积累；市场担心养殖亏损抵消饲料增长。',investmentMeaning:'不能只用饲料龙头PE估值，应对养殖波动给出折价。'},{topic:'原料成本传导',views:'公司认为配方数据库和原料替代技术能缓冲波动；投资者仍需验证鱼粉等涨价时的实际吨利。',investmentMeaning:'半年报毛利率与吨利比销量增速更关键。'}],integratedView:'长期看，海大是“管理和研发驱动的饲料平台”；中期看，需等养殖拖累减弱和海外利润兑现；交易上，当前股价与量能尚未支持提前买入。',validation:'2026-08-25检查半年报饲料销量、饲料毛利率、养殖分部利润、海外收入和经营现金流；每日检查MA20与20日量比。'},integratedConclusion:'基本面值得长期跟踪，但技术面和利润质量尚未形成介入共振。',evidenceCheck:'已用年报、季报、调研纪要、Tushare财务及真实OHLCV交叉验证。',topReports:[
  {date:'2026-07-13',institution:'海大集团/机构调研',title:'水产料结构、鱼粉价格、生猪业务及海外扩产',type:'调研纪要',url:'https://finance.sina.com.cn/stock/aigc/jgdy/2026-07-13/doc-inihrhfi4262588.shtml'},
  {date:'2026-05-06',institution:'海大集团',title:'2026年4月30日业绩说明会记录',type:'公司原文',url:'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?CompanyCode=80133880&gather=1&id=12297917'},
  {date:'2026-04-28',institution:'海大集团',title:'2025年年度报告',type:'定期报告',url:'https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12218563&stockid=002311'},
  {date:'2026-04-28',institution:'海大集团',title:'2026年第一季度报告',type:'定期报告',url:'https://app.cnstock.com/zzb/zgzqb/html/2026-04/28/nw.D110000zgzqb_20260428_3-B611.htm'},
  {date:'2026-04-30',institution:'公开机构研究',title:'2025年报及2026Q1：饲料增长与养殖拖累',type:'研报摘要',url:'https://stock.finance.sina.com.cn/stock/go.php/vReport_Show/kind/search/rptid/830849304626/index.phtml'}],freeSources:[]}

report.catalysts=[{date:'2026-08-25',event:'2026年半年报预约披露',expectation:'核心验证饲料销量、吨利、养殖减亏、海外增长和经营现金流',status:'pending',statusLabel:'交易所预约日'},{date:'2026-07-13',event:'水产料、鱼粉价格与海外扩产机构调研',expectation:'已披露经营变量，等待半年报数据兑现',status:'confirmed',statusLabel:'已披露'},{date:'持续跟踪',event:'普水鱼、对虾、猪价及饲料原料价差',expectation:'周度验证下游养殖盈利和饲料需求',status:'pending',statusLabel:'高频跟踪'}]
report.bearCase=['饲料增量主要来自低价抢份额，吨利和ROE未同步提升','生猪与水产养殖具有生物资产、疫病和价格三重波动，可持续抵消饲料主业增长','股价已跌破六条均线且缩量，超卖反弹可能只是下跌中继，半年报不及预期会引发二次下杀']
report.evidenceQuality=[{grade:'A',label:'行情与估值',note:`Tushare前复权OHLCV/daily_basic，截至${report.asOf}`},{grade:'A',label:'财务与审计',note:'2025年报、2026Q1、Tushare财务三表及fina_audit'},{grade:'A/B',label:'经营与行业',note:'公司投资者关系记录与公开研报摘要'},{grade:'C',label:'筹码分布',note:'未取得可验证接口，页面明确显示数据不足'}]
report.dataGaps=['筹码集中度、获利比例与平均持仓成本无可验证接口，不做伪数据','无30分钟分笔数据，缠论仅做日线粗略中枢代理，不声称精确三买','半年报尚未披露，饲料吨利、养殖减亏和海外利润贡献仍待验证']
report.metrics=[{label:'2025饲料总销量',value:'3208',unit:'万吨',change:'同比+21%',direction:'up',series:[2652,3208]},{label:'2026Q1营收',value:fmt(q1Revenue),unit:'亿元',change:'同比+13.19%',direction:'up',series:[q1Revenue]},{label:'2026Q1归母净利',value:fmt(q1Profit),unit:'亿元',change:'同比-30.82%',direction:'down',series:[q1Profit]},{label:'PE-TTM',value:fmt(pe),unit:'倍',change:`PB ${fmt(pb)}倍`,direction:'flat',series:[pe]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'显著缩量',direction:'down',series:report.technical.volumeAverages.map(x=>x.ratio)}]
report.sources=[
  `Tushare Pro daily/adj_factor/daily_basic/fina_indicator/财务三表/fina_audit，${report.asOf}提取`,
  '海大集团2025年年报：https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12218563&stockid=002311',
  '海大集团2026年一季报：https://app.cnstock.com/zzb/zgzqb/html/2026-04/28/nw.D110000zgzqb_20260428_3-B611.htm',
  '海大集团2026年4月30日业绩说明会：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?CompanyCode=80133880&gather=1&id=12297917',
  '海大集团2026年7月机构调研：https://finance.sina.com.cn/stock/aigc/jgdy/2026-07-13/doc-inihrhfi4262588.shtml'
]

await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({id:report.id,close,ma20:ma[20],trigger,invalidation,vr20,pe,pb,peers:peerRows.map(x=>x.name)},null,2))
