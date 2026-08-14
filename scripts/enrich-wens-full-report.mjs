import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const reportPath=path.join(root,'data/reports/300498-stock.json')
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
const fmt=(n,d=2)=>Number(n).toFixed(d)
async function api(api_name,params,fields){const b=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(b.code!==0)throw new Error(`${api_name}: ${b.msg}`);return(b.data?.items||[]).map(row=>Object.fromEntries(b.data.fields.map((key,i)=>[key,row[i]])))}

const peerDefs=[['002714.SZ','牧原股份','生猪龙头'],['000876.SZ','新希望','饲料+养殖'],['002157.SZ','正邦科技','周期弹性']]
const peers=[]
for(const [code,name,segment] of peerDefs){const [b,f]=await Promise.all([api('daily_basic',{ts_code:code,start_date:'20260801',end_date:'20260813'},'trade_date,pe_ttm,pb,total_mv'),api('fina_indicator',{ts_code:code,start_date:'20260101',end_date:'20260813'},'ann_date,end_date,or_yoy,netprofit_yoy,roe,grossprofit_margin')]);peers.push({code,name,segment,b:b[0]||{},f:f[0]||{}})}

const d=report.technical.technicalDetail,s=d.marketStats,ma=Object.fromEntries(d.movingAverages.map(x=>[x.period,x.value]))
const close=s.close,vr20=report.technical.volumeAverages.find(x=>x.days===20).ratio
const macd=d.indicators.find(x=>x.name==='MACD'),kdj=d.indicators.find(x=>x.name==='KDJ'),rsi=d.indicators.find(x=>x.name==='RSI')
const trigger=14.79,longTrigger=14.91,invalidation=13.30
const annual={revenue:1038.24,profit:52.66,cfo:118.07,revenueYoy:-1.67,profitYoy:-43.25,grossMargin:11.18,debt:49.82}
const q1={revenue:245.31,profit:-10.70,cfo:12.89,revenueYoy:.34,profitYoy:-153.15,grossMargin:2.71,debt:53.14}

report.decisionLevel='wait_trigger'
report.tradeDecision={asOf:report.asOf,verdict:'基本面处于亏损压力期，技术面仅是筑底反弹，当前不左侧介入',reason:`${report.asOf}收盘${fmt(close)}元，虽站上MA5/10/60，但仍低于MA20/90/145，MACD绿柱未消失，20日成交额比仅${fmt(vr20)}倍。2026Q1归母净亏损10.70亿元；6月毛猪销售均价9.62元/公斤，低于二季度综合成本约12元/公斤，猪业务仍处于亏损区。`,checks:[
 {name:'收复短期趋势',current:`收盘${fmt(close)}元；MA20 ${fmt(ma[20])}元`,threshold:'收盘站回MA20',status:close>=ma[20]?'met':'unmet'},
 {name:'右侧价格突破',current:`收盘${fmt(close)}元`,threshold:`收盘≥${fmt(trigger)}元`,status:'unmet'},
 {name:'20日量能',current:`当日/20日均额=${fmt(vr20)}倍`,threshold:'突破时≥1.20倍',status:vr20>=1.2?'met':'unmet'},
 {name:'长期趋势',current:`MA90/145=${fmt(ma[90])}/${fmt(ma[145])}元`,threshold:`收盘≥${fmt(longTrigger)}元并回踩不破`,status:'unmet'},
 {name:'动量确认',current:`${macd.value}；${rsi.value}`,threshold:'MACD金叉且不过热',status:'unmet'},
 {name:'猪业务盈亏平衡',current:'6月售价9.62元/kg；Q2成本约12元/kg',threshold:'月均猪价持续高于全成本',status:'unmet'},
 {name:'现金流韧性',current:'2026Q1经营现金流12.89亿元为正',threshold:'现金流维持为正且负债率不继续上行',status:'partial'},
 {name:'审计治理',current:'2021—2025均标准无保留；2023更换审计机构',threshold:'无非标、重大差错或监管否决',status:'met'}]}

report.decisionOverview={items:[
 {label:'产业位置',value:'猪鸡双主业龙头',score:88,comment:'公司+农户模式，2025年生猪出栄4047.69万头'},
 {label:'行业景气',value:'供给宽松、价格低迷',score:25,comment:'6月公司毛猪均价9.62元/kg，显著低于成本'},
 {label:'成本竞争力',value:'持续改善',score:75,comment:'Q2肉猪综合成本约12元/kg，较过去周期下降'},
 {label:'财务韧性',value:'现金流正、负债上行',score:58,comment:'Q1经营现金流12.89亿，负债率53.14%'},
 {label:'技术位置',value:'底部修复未确认',score:44,comment:`低于MA20/90/145，20日量比${fmt(vr20)}倍`}
],coreConflict:'温氏的规模、养殖效率和猪鸡双轮给予其穿越周期的能力，但当前生猪售价显著低于完全成本，出栏增长会放大亏损而非利润。股价是否值得交易，关键看“价格-成本差”而不是只看出栏量。',action:`现阶段只放入猪周期右侧观察池。先等收复MA20 ${fmt(ma[20])}元；真正介入需放量突破${fmt(trigger)}元，并同时看到猪价与成本差改善。`}

report.prosperity={level:'猪周期处于低价亏损与政策去产能阶段',direction:'成本改善 / 售价仍恶化',directionTone:'negative',score:31,verdict:'现在不是盈利反转已确认，而是行业亏损逼迫产能去化的早期。温氏靠降成本缩小亏损，但猪价还没有回到盈亏平衡线。',dimensions:[
 {name:'2025营业收入',value:'1038.24亿元',change:'同比-1.67%',tone:'warning'},
 {name:'2025归母净利',value:'52.66亿元',change:'同比-43.25%',tone:'negative'},
 {name:'2026Q1归母净利',value:'-10.70亿元',change:'同比-153.15%',tone:'negative'},
 {name:'2026年6月毛猪均价',value:'9.62元/kg',change:'同比-33.15%',tone:'negative'},
 {name:'2026Q2肉猪成本',value:'约12元/kg',change:'成本降至历史较好水平',tone:'positive'}
],driver:'能繁母猪和新生仔猪、肥猪出栏量、二次育肥、屠宰量、猪肉消费、饲料成本、公司PSY与完全成本、黄羽鸡价格',improvement:'能繁母猪和仔猪供给连续下降，猪价收复12元/kg以上，温氏成本降至11.6元/kg左右，销售现金流与毛利率同步改善',deterioration:'猪价长期低于现金成本，出栏增长导致亏损扩大，负债率继续上升，或疫病/饲料价格破坏降本成果'}

report.supplyDemand={state:'生猪供给仍显著过剩，亏损正在推动去产能',tone:'negative',direction:'同步恶化、领先指标开始改善',conclusion:'6月温氏毛猪售价仅9.62元/kg，远低于约12元/kg完全成本，说明当期供需仍差。投资逻辑在于亏损促使能繁母猪去化，但从母猪减少到商品猪供给收缩存在10个月左右滞后。',demand:{status:'季节性偏弱',evidence:'夏季消费偏淡，6月毛猪价格环比仍下降0.82%',change:'待中秋国庆和腌腊季验证',tone:'warning'},supply:{status:'宽松',evidence:'月度出栏与屠宰供给足，头部企业出栏量仍高',change:'政策引导控产能，亏损压力将逐步传导到母猪端',tone:'negative'},inventory:{status:'生物性在产库存偏高',evidence:'能繁母猪、仔猪与肥猪之间存在时滞，单月去化不等于当期减供',change:'需连续数月减少才能确认',tone:'warning'},price:{status:'低于行业盈亏平衡',evidence:'温氏6月毛猪均价9.62元/kg，Q2成本约12元/kg',change:'每公斤价格-成本差约-2.38元，未计重量结构差异',tone:'negative'},profit:{status:'猪业务亏损，鸡业务提供部分对冲',evidence:'2026Q1归母净亏损10.70亿元，但经营现金流仍为正',change:'降成本可缩小亏损，不能代替猪价修复',tone:'negative'},leadingIndicator:'能繁母猪环比、7公斤仔猪价格、屠宰量/均重、冻品库存、猪料销量、温氏月度猪价与成本差、PSY和经营现釔1',improvement:'能繁母猪环比连降至正常保有量以下，仔猪价格止跌、标肥价差转强，温氏售价收复成本线且现金流改善',invalidation:'二育和压栏再度推高体重，猪价继续低于现金成本，能繁母猪不降反升，或公司负债率显著上行。'}

report.summary={stage:'猪周期亏损去产能早期，股价低位筑底',rating:'长期有周期反转弹性，当前不具备盈利与技术共振',confidence:'中高',conclusion:`温氏的成本与规模使它有能力熬过低谷，但没有证据说明猪价已反转。股价${fmt(close)}元只是低位反弹，在突破${fmt(trigger)}元且猪价-成本差改善前，不定义为可介入。`,evidence:['2026Q1归母净亏损10.70亿元，毛利率仅2.71%','6月毛猪均价9.62元/kg，低于Q2成本约12元/kg','收盘低于MA20/90/145，MACD空头，20日量比仅1.05倍']}

d.headline=`11.54元低点后的筑底反弹，${fmt(trigger)}—${fmt(longTrigger)}元是中长期反转关口`
d.plainConclusion=`现在不买。左侧仅在13.30—13.55元出现缩量止跌、次日收盘重回MA5且成交额≥0.8倍20日均额时才能观察性试错；稳健方案要等收盘突破${fmt(trigger)}元、量能≥1.2倍，且猪价与成本差改善。收盘跌破${fmt(invalidation)}元取消试错。`
d.structure=[{stage:'下降去估值',period:'近250日',range:'19.55—11.54元',feature:'猪价与盈利下滑，长期均线下压'},{stage:'筑底反弹',period:'近60日',range:'11.54—14.72元',feature:'低点抬高，但反弹未突破MA145'},{stage:'区间整理',period:'近20日',range:'13.32—14.72元',feature:`价格稍低于MA20，成交额仅${fmt(vr20)}倍20日均额`},{stage:'反转确认',period:'待触发',range:`${fmt(trigger)}—${fmt(longTrigger)}元`,feature:'区间上沿与MA145共振，需放量收复并回踩不破'}]
d.signals={bull:['11.54元低点后低点抬高，股价已重回MA60上方','MA5与MA10附近粘合，短线无明显过热','KDJ-J 53.65向上，有弱修复迹象','公司肉猪成本已降至约12元/kg，行业去产能时具有存活优势'],risk:['收盘仍低于MA20、MA90和MA145，中长期均线系统未翻多',`20日成交额比${fmt(vr20)}倍，不足以验证突破`,'MACD DIF 0.07低于DEA 0.11，绿柱未消失','猪价显著低于完全成本，出栏增长暂时会扩大亏损']}
report.technical.rating='底部修复但中长期反转未确认'
report.technical.wave=`主计数：19.55元以来的ABC调整在11.54元形成C浪低点，当前是修复浪中的二次整理；收盘突破${fmt(longTrigger)}元才可升级为中期推动浪。备选计数：当前仅是长期下跌趋势中的B浪反弹，跌破${fmt(invalidation)}元后备选占优。`
report.technical.chan=`日线近20日重叠区间约${fmt(Math.max(...report.technical.ohlc.slice(-20).map(x=>x.low)))}—${fmt(Math.min(...report.technical.ohlc.slice(-20).map(x=>x.high)))}元（缺少30分钟笔段，仅作中枢代理）。放量突破${fmt(trigger)}元并回踩不破可视为三买候选；收盘跌破${fmt(invalidation)}元失效。`
report.technical.trigger=`左侧：13.30—13.55元缩量止跌，次日收盘重回MA5且成交额≥0.8倍20日均额；右侧：收盘突破${fmt(trigger)}元且成交额≥1.2倍20日均额，同时猪价-成本差改善；加仓：收盘突破${fmt(longTrigger)}元并回踩不破`
report.technical.invalidation=`收盘跌破${fmt(invalidation)}元，或半年报亏损超预期且负债率继续上升`
report.technical.riskReward=`左侧按13.55/${fmt(invalidation)}元计算价格风险约${fmt((13.55/invalidation-1)*100)}%，但基本面未确认；右侧必须同时满足价格、量能和猪价-成本差。`

report.executionPlan={action:'现在不介入；等技术和猪周期领先指标共振',trigger:report.technical.trigger,add:`突破${fmt(longTrigger)}元后回踩不破，且半年报/月度经营确认猪价-成本差、现金流和负债率改善，再考虑增加风险暴露`,priceInvalidation:`收盘跌破${fmt(invalidation)}元取消本轮筑底试错`,fundamentalInvalidation:'猪价长期低于现金成本，出栏增长但亏损扩大，负债率持续上升，或疫病导致成本反弹',nextReview:`2026-08-26半年报预约披露日，或收盘突破${fmt(trigger)}元后`}

report.companyComparison=[{tier:'研究对象',tone:'warning',company:'温氏股份',ticker:'300498.SZ',driver:'公司+农户、猪鸡双主业、成本改善',valuation:'PE-TTM 42.06倍；PB 2.32倍',risk:'猪价低于成本、盈利波动和负债上行'},...peers.map(x=>({tier:x.segment,tone:'neutral',company:x.name,ticker:x.code,driver:`最新收入/净利同比${Number.isFinite(x.f.or_yoy)?fmt(x.f.or_yoy):'—'}%/${Number.isFinite(x.f.netprofit_yoy)?fmt(x.f.netprofit_yoy):'—'}%`,valuation:`PE-TTM ${Number.isFinite(x.b.pe_ttm)?fmt(x.b.pe_ttm):'不适用'}倍；PB ${Number.isFinite(x.b.pb)?fmt(x.b.pb):'—'}倍`,risk:'猪价、养殖成本、疫病与资产负债表'}))]
report.valuationScenarios=[{name:'乐观',weight:'25%',assumption:'产能去化传导至猪价回升，成本继续降低，鸡业务保持盈利',valuation:'盈利从周期底部快速恢复，PE失真，应结合正常化利润和PB观察',signal:'猪价连续高于成本，季度净利和现金流转正'},{name:'基准',weight:'50%',assumption:'猪价低位震荡，降成本缩小亏损，鸡业务对冲',valuation:'PE-TTM 42.06倍受周期低利润扭曲；PB 2.32倍已隐含部分周期修复预期',signal:'半年报亏损可控，成本继续下降，负债率稳定'},{name:'悲观',weight:'25%',assumption:'产能去化慢，猪价持续低于成本，出栏增长放大亏损',valuation:'净资产受亏损与负债上升侵蚀，PB中枢下移',signal:`半年报低于预期且股价跌破${fmt(invalidation)}元`}]

report.marketResearch={fullTextStatus:'available',statusNote:'已接入2025年报、2026Q1、6月销售简报、7月机构调研及农业农村部高频数据',period:'2026-04-22—2026-07-23',reportCount:6,institutionCount:5,companyForecastSampleCount:2,reportScope:'公司公告/调研、农业农村部、评级机构与公开研报；不以目标价代替周期验证',consensus:'温氏的成本与现金流能力强于行业平均；当前主要矛盾是猪价跌破完全成本',revisionTrend:'市场关注已从出栏增长转向成本、负债率和产能去化速度',synthesis:{verdict:'温氏是周期低谷中的相对优质供给方，但相对优势不等于绝对盈利；需要等行业去产能传导。',confidence:'公告原文+官方行业数据+真实行情 · 中高置信度',confidenceTone:'warning',evidenceNote:'销售简报用于核对价格与出栏，机构调研用于核对成本，官方数据用于判断产能与需求。',commonPoints:[{point:'降成本是最确定的公司阿尔法',reason:'Q2肉猪综合成本约12元/kg，生产成绩持续改善。',support:'公司7月投资者关系记录'},{point:'当期猪价仍不支持盈利',reason:'6月毛猪均价9.62元/kg，显著低于完全成本。',support:'6月主产品销售简报+公司调研'},{point:'现金流和融资能力提供抗周期安全垫',reason:'2025经营现金流118.07亿，2026Q1在亏损下仍为正。',support:'2025年报+2026Q1'}],differences:[{topic:'周期底部时点',views:'乐观观点强调政策控产能和亏损去化；谨慎观点强调母猪到商品猪存在长滞后。',investmentMeaning:'应该交易“数据确认”，而不是只交易政策新闻。'},{topic:'估值是否便宜',views:'多头用正常化利润看低估；空头认为PB 2.32倍已含反转预期，负债率上升会侵蚀净资产安全边际。',investmentMeaning:'周期底部不适合单看PE，应结合PB、正常化利润与资产负债表。'}],integratedView:`长期看温氏是猪鸡养殖龙头，成本改善会在猪价回升时放大利润弹性；中期看仍处亏损去产能期；短期看${fmt(trigger)}—${fmt(longTrigger)}元是资金是否开始交易反转的关口。`,validation:'每月核对出栏、猪价、成本与销售收入；8月26日核对半年报毛利率、现金流和负债率；技术上核对MA20/90/145与20日量比。'},integratedConclusion:'相对优质，但盈利和技术反转都未确认；当前不足以建立高确信度仓位。',evidenceCheck:'2025年报、2026Q1、6月销售简报、7月调研、Tushare财务估值与875根真实前复权OHLCV已交叉验证。',topReports:[
 {date:'2026-07-23',institution:'温氏股份',title:'2026年7月21日投资者关系活动记录',type:'公司调研',url:'https://data.eastmoney.com/stockcalendar/300498.html'},
 {date:'2026-07-13',institution:'温氏股份',title:'肉猪/肉鸡成本、生产目标与资金安排',type:'公司调研',url:'https://finance.sina.com.cn/stock/aigc/jgdy/2026-07-14/doc-inihtrnc7313359.shtml'},
 {date:'2026-07-07',institution:'温氏股份',title:'2026年6月主产品销售情况简报',type:'月度经营',url:'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12434861&stockid=300498'},
 {date:'2026-04-22',institution:'温氏股份/深交所',title:'2025年年度报告',type:'定期报告',url:'https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-22/7310fe51-f6a8-41df-ae40-276dcc413921.PDF'},
 {date:'2026-04-22',institution:'温氏股份',title:'2026年第一季度报告',type:'定期报告',url:'https://www.wens.com.cn/Investor/index.aspx'},
 {date:'2026-07',institution:'农业农村部',title:'畜牧业监测预警与周度价格数据',type:'官方行业数据',url:'https://xmsyj.moa.gov.cn/jcyj/'}
],freeSources:[]}

report.catalysts=[{date:'2026-08-26',event:'2026年半年报预约披露',expectation:'核对猪鸡分部盈利、完全成本、现金流、存货与负债率',status:'pending',statusLabel:'交易所预约日'},{date:'2026年8月上旬',event:'2026年7月主产品销售简报',expectation:'计算毛猪均价、销量、销售收入与成本差的月度变化；以正式公告为准',status:'pending',statusLabel:'待公告验证'},{date:'2026年中秋/国庆消费窗口',event:'猪肉与黄羽鸡旺季需求',expectation:'验证猪价、鸡价、屠宰量和库存去化',status:'pending',statusLabel:'季节性窗口'}]
report.bearCase=['供给去化传导慢，猪价长期低于温氏完全成本，出栏增长反而扩大亏损','负债率从2025年49.82%升至2026Q1的53.14%，若现金流转弱，周期安全垫会收窄','股价仍低于MA20/90/145，MACD空头且突破量能不足，当前可能只是长期下跌中的反弹']
report.evidenceQuality=[{grade:'A',label:'行情、财务与估值',note:`Tushare前复权OHLCV、三张表、fina_indicator、daily_basic和fina_audit，截至${report.asOf}`},{grade:'A',label:'销售与经营',note:'公司年报、季报、月度销售简报和投资者关系记录'},{grade:'A/B',label:'行业供需',note:'农业农村部监测预警与公开评级/研究资料'},{grade:'C',label:'筹码与次级别缠论',note:'无可验证筹码接口和30分钟笔段，页面明确标注数据边界'}]
report.dataGaps=['筹码平均成本、获利比例和集中度无可验证接口，不展示估算值','缺少30分钟完整笔段，缠论仅以日线重叠区间作中枢代理','2026年半年报未披露；7月销售简报的正式公告链接待验证，不用推测值填充']
report.metrics=[{label:'2025营业收入',value:'1038.24',unit:'亿元',change:'同比-1.67%',direction:'down',series:[1038.24]},{label:'2025归母净利',value:'52.66',unit:'亿元',change:'同比-43.25%',direction:'down',series:[52.66]},{label:'2026Q1归母净利',value:'-10.70',unit:'亿元',change:'同比-153.15%',direction:'down',series:[-10.70]},{label:'6月毛猪售价',value:'9.62',unit:'元/kg',change:'同比-33.15%',direction:'down',series:[12.75,11.62,10.11,9.27,9.70,9.62]},{label:'Q2肉猪成本',value:'12.00',unit:'元/kg',change:'约数；公司调研口径',direction:'down',series:[12]},{label:'20日成交额比',value:fmt(vr20),unit:'倍',change:'无显著放量',direction:'flat',series:report.technical.volumeAverages.map(x=>x.ratio)}]
report.sources=[`Tushare Pro daily/adj_factor/daily_basic/fina_indicator/财务三表/fina_audit，${report.asOf}提取`,'温氏股份2025年年报：https://disc.static.szse.cn/disc/disk03/finalpage/2026-04-22/7310fe51-f6a8-41df-ae40-276dcc413921.PDF','温氏股份2026年6月主产品销售简报：https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12434861&stockid=300498','温氏股份2026年7月机构调研：https://finance.sina.com.cn/stock/aigc/jgdy/2026-07-14/doc-inihtrnc7313359.shtml','农业农村部畜牧业监测预警：https://xmsyj.moa.gov.cn/jcyj/']

await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({id:report.id,close,ma20:ma[20],ma90:ma[90],ma145:ma[145],trigger,longTrigger,invalidation,vr20,peers:peers.map(x=>x.name)},null,2))
