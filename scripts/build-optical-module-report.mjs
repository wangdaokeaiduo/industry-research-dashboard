import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const env=await fs.readFile(path.join(root,'.env.local'),'utf8')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
if(!token) throw new Error('缺少 TUSHARE_TOKEN')
const members=[['300308.SZ','中际旭创'],['300502.SZ','新易盛'],['300394.SZ','天孚通信'],['002281.SZ','光迅科技'],['300570.SZ','太辰光']]

async function api(api_name,params,fields){
  const body=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json())
  if(body.code!==0) throw new Error(`${api_name}: ${body.msg}`)
  const names=body.data?.fields||[]
  return (body.data?.items||[]).map(values=>Object.fromEntries(names.map((name,i)=>[name,values[i]])))
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length
const median=a=>{const x=[...a].sort((m,n)=>m-n);return x.length?(x[Math.floor((x.length-1)/2)]+x[Math.ceil((x.length-1)/2)])/2:null}
const fmt=(n,d=2)=>Number(n).toFixed(d)
const start='20240101', end='20260811'
const daily=Object.fromEntries(await Promise.all(members.map(async([code])=>{
  const [raw,factors]=await Promise.all([api('daily',{ts_code:code,start_date:start,end_date:end},'ts_code,trade_date,open,high,low,close,pre_close,pct_chg,vol,amount'),api('adj_factor',{ts_code:code,start_date:start,end_date:end},'ts_code,trade_date,adj_factor')])
  const factorMap=new Map(factors.map(x=>[x.trade_date,x.adj_factor])),latestFactor=factors[0]?.adj_factor||1
  const adjusted=raw.map(row=>{const ratio=(factorMap.get(row.trade_date)||latestFactor)/latestFactor;return {...row,open:row.open*ratio,high:row.high*ratio,low:row.low*ratio,close:row.close*ratio,pre_close:row.pre_close*ratio}})
  return [code,adjusted.reverse()]
})))
const common=[...new Set(daily[members[0][0]].map(x=>x.trade_date))].filter(date=>members.every(([code])=>daily[code].some(x=>x.trade_date===date))).sort()
const byCode=Object.fromEntries(members.map(([code])=>[code,new Map(daily[code].map(x=>[x.trade_date,x]))]))
const base=Object.fromEntries(members.map(([code])=>[code,byCode[code].get(common[0]).close]))
const ohlc=common.map(date=>{
  const rows=members.map(([code])=>byCode[code].get(date)); const norm=(row,key,code)=>row[key]/base[code]*100
  return {date,open:mean(rows.map((row,i)=>norm(row,'open',members[i][0]))),high:mean(rows.map((row,i)=>norm(row,'high',members[i][0]))),low:mean(rows.map((row,i)=>norm(row,'low',members[i][0]))),close:mean(rows.map((row,i)=>norm(row,'close',members[i][0]))),volume:rows.reduce((s,x)=>s+x.amount,0)/10000}
})
const prices=ohlc.map(x=>x.close), volumes=ohlc.map(x=>x.volume), latest=ohlc.at(-1)
const avg=n=>mean(prices.slice(-n)), ma20=avg(20),ma60=avg(60),ma90=avg(90),ma145=avg(145)
const volume20=mean(volumes.slice(-20)), volumeRatio=latest.volume/volume20
const recentBreakout=Math.max(...ohlc.slice(-6,-1).map(x=>x.high)), recentLow=Math.min(...ohlc.slice(-20).map(x=>x.low))
const high250=Math.max(...ohlc.slice(-250).map(x=>x.high)),low250=Math.min(...ohlc.slice(-250).map(x=>x.low)),fib382=high250-(high250-low250)*.382,fib50=(high250+low250)/2,fib618=high250-(high250-low250)*.618
const basics=await Promise.all(members.map(async([code,name])=>({name,code,...(await api('daily_basic',{ts_code:code,trade_date:latest.date},'ts_code,trade_date,close,turnover_rate,pe_ttm,pb,total_mv,circ_mv'))[0]})))
const financials=await Promise.all(members.map(async([code,name])=>({name,code,...(await api('fina_indicator',{ts_code:code,start_date:'20250101',end_date:end},'ts_code,ann_date,end_date,roe,grossprofit_margin,netprofit_margin,or_yoy,netprofit_yoy,ocf_to_or'))[0]})))
const forecasts=await api('report_rc',{start_date:'20260501',end_date:end},'ts_code,name,report_date,report_title,classify,org_name,quarter,op_rt,np,eps,pe').catch(()=>[])
const selectedForecasts=forecasts.filter(x=>members.some(([code])=>code===x.ts_code))
const pes=basics.map(x=>x.pe_ttm).filter(x=>Number.isFinite(x)&&x>0), medianPe=median(pes)
const revenueMedian=median(financials.map(x=>x.or_yoy).filter(Number.isFinite)),profitMedian=median(financials.map(x=>x.netprofit_yoy).filter(Number.isFinite)),marginMedian=median(financials.map(x=>x.grossprofit_margin).filter(Number.isFinite))
const aboveLong=latest.close>ma60&&latest.close>ma145, stretched=latest.close>ma20*1.1, decisionLevel=aboveLong&&!stretched?'trial':'wait_trigger'
const trigger=Number((Math.max(recentBreakout,ma20)*1.005).toFixed(2)), invalidation=Number((Math.min(ma60,recentLow)*.985).toFixed(2))
const old=JSON.parse(await fs.readFile(path.join(root,'data/reports/optical-module.json'),'utf8'))
const report={...old,asOf:`${latest.date.slice(0,4)}-${latest.date.slice(4,6)}-${latest.date.slice(6)}`,updatedAt:new Date().toISOString(),decisionLevel,
  dataGaps:['800G/1.6T全行业出货量缺少统一官方口径','客户订单金额多为商业秘密，使用财报、盈利预测与存货周转交叉验证'],
  decisionOverview:{items:[{label:'产业价值',value:'高',score:88,comment:'微软与Alphabet继续大幅增加AI基础设施资本开支'},{label:'商业质量',value:'较高',score:78,comment:`样本2026Q1毛利率中位数${fmt(marginMedian)}%`},{label:'估值吸引力',value:medianPe>60?'偏低':'中等',score:medianPe>60?38:55,comment:`5股PE-TTM中位数${fmt(medianPe)}倍`},{label:'技术位置',value:aboveLong?'中长期偏强':'等待修复',score:aboveLong?68:45,comment:`篮子${fmt(latest.close)}，MA60 ${fmt(ma60)}，MA145 ${fmt(ma145)}`},{label:'综合评级',value:decisionLevel==='trial'?'小仓试错':'等待触发',score:decisionLevel==='trial'?64:52,comment:'产业强与估值偏贵并存'}],coreConflict:`AI资本开支与样本盈利高速增长真实存在，但PE-TTM中位数${fmt(medianPe)}倍，市场已计入较高增长预期。`,action:decisionLevel==='trial'?'只允许小仓分批试错，不追涨':'等待价格重新站稳关键均线并放量确认'},
  weeklyChanges:{period:'真实数据重建',title:'已删除全部演示数据',summary:`使用${members.map(x=>x[1]).join('、')}构建真实5股等权篮子；行情截至${latest.date}。`,items:[]},
  prosperity:{level:'高景气',direction:'继续扩张但预期较高',directionTone:'positive',score:82,verdict:`微软预计2026年资本开支约1900亿美元，Alphabet预计1750–1850亿美元；样本2026Q1收入同比增速中位数${fmt(revenueMedian)}%、净利润同比增速中位数${fmt(profitMedian)}%，需求与盈利仍在兑现。`,dimensions:[{name:'需求',value:'强',change:'海外云厂商资本开支扩张',tone:'positive'},{name:'盈利',value:'高增长',change:`样本净利增速中位数${fmt(profitMedian)}%`,tone:'positive'},{name:'估值',value:'偏贵',change:`PE中位数${fmt(medianPe)}倍`,tone:'warning'},{name:'技术',value:aboveLong?'中长期偏强':'尚未确认',change:`量比${fmt(volumeRatio)}倍`,tone:aboveLong?'positive':'warning'}],driver:'AI数据中心扩容、800G向1.6T升级及网络带宽需求。',improvement:'云厂商资本开支继续上修，样本收入、利润和经营现金流共同增长。',deterioration:'资本开支下修、订单/存货背离、毛利率下降或估值继续扩张而盈利不再上修。'},
  summary:{stage:'景气扩张—估值消化',rating:decisionLevel==='trial'?'小仓试错':'等待触发',confidence:'中高',conclusion:`光模块产业景气有真实数据支撑，但不是无条件追涨。5股等权篮子收于${fmt(latest.close)}，MA20/60/145为${fmt(ma20)}/${fmt(ma60)}/${fmt(ma145)}，当日成交额为20日均值${fmt(volumeRatio)}倍。当前按明确价格触发和失效执行。`,evidence:[`微软预计2026年资本开支约1900亿美元`,`Alphabet预计2026年资本开支1750–1850亿美元`,`样本2026Q1净利润同比增速中位数${fmt(profitMedian)}%`]},
  reversalConditions:[{name:'海外AI资本开支持续扩张',dimension:'需求',current:'微软约1900亿美元；Alphabet 1750–1850亿美元',threshold:'年度指引维持增长',status:'met',trend:'up',source:'微软与Alphabet投资者关系官网'},{name:'样本收入继续增长',dimension:'盈利',current:`2026Q1收入同比中位数${fmt(revenueMedian)}%`,threshold:'多数样本保持正增长',status:revenueMedian>0?'met':'unmet',trend:revenueMedian>0?'up':'down',source:'Tushare fina_indicator / 公司定期报告'},{name:'样本利润兑现',dimension:'盈利',current:`2026Q1净利润同比中位数${fmt(profitMedian)}%`,threshold:'利润增速不低于收入增速',status:profitMedian>=revenueMedian?'met':'partial',trend:'up',source:'Tushare fina_indicator / 公司定期报告'},{name:'估值由盈利消化',dimension:'估值',current:`PE-TTM中位数${fmt(medianPe)}倍`,threshold:'盈利上修且PE不继续扩张',status:medianPe>60?'partial':'met',trend:'flat',source:'Tushare daily_basic'},{name:'价格与量能确认',dimension:'技术',current:`篮子${fmt(latest.close)}；MA20 ${fmt(ma20)}；量比${fmt(volumeRatio)}`,threshold:`放量站上${fmt(trigger)}`,status:latest.close>=trigger&&volumeRatio>=1.2?'met':'partial',trend:aboveLong?'up':'flat',source:'Tushare daily，5股等权篮子'}],
  metrics:[{label:'微软2026 CapEx指引',value:'1900',unit:'亿美元',change:'官方公司指引',direction:'up',series:[1900]},{label:'Alphabet 2026 CapEx',value:'1750–1850',unit:'亿美元',change:'官方公司指引',direction:'up',series:[1750,1850]},{label:'样本收入增速中位数',value:fmt(revenueMedian),unit:'%/2026Q1',change:'5股样本',direction:revenueMedian>=0?'up':'down',series:financials.map(x=>x.or_yoy)},{label:'样本净利增速中位数',value:fmt(profitMedian),unit:'%/2026Q1',change:'5股样本',direction:profitMedian>=0?'up':'down',series:financials.map(x=>x.netprofit_yoy)},{label:'PE-TTM中位数',value:fmt(medianPe),unit:'倍',change:`截至${latest.date}`,direction:medianPe>60?'down':'up',series:pes},{label:'等权篮子',value:fmt(latest.close),unit:'点',change:`量比${fmt(volumeRatio)}倍`,direction:latest.close>=ma20?'up':'down',series:prices.slice(-20)}],
  companyComparison:members.map(([code,name])=>{const b=basics.find(x=>x.code===code),f=financials.find(x=>x.code===code);return {tier:name==='中际旭创'||name==='新易盛'?'核心配置':'弹性观察',tone:name==='中际旭创'||name==='新易盛'?'positive':'warning',company:name,ticker:code,driver:`2026Q1营收同比${fmt(f.or_yoy)}%，净利同比${fmt(f.netprofit_yoy)}%`,valuation:`PE-TTM ${fmt(b.pe_ttm)}倍；毛利率${fmt(f.grossprofit_margin)}%`,risk:'客户集中、产品降价、扩产与技术迭代风险'}}),
  valuationScenarios:[{name:'乐观',weight:'25%',assumption:'资本开支持续上修，1.6T放量且毛利率稳定',valuation:'盈利增速消化当前高PE',signal:'盈利预测连续上修'},{name:'基准',weight:'50%',assumption:'需求增长延续但估值震荡消化',valuation:`PE围绕样本中位数${fmt(medianPe)}倍波动`,signal:'收入利润保持增长'},{name:'悲观',weight:'25%',assumption:'资本开支或订单下修、供给释放压低毛利率',valuation:'盈利与估值双杀',signal:'存货上升、毛利率下降'}],
  technical:{instrument:'光模块5股等权篮子（中际旭创/新易盛/天孚通信/光迅科技/太辰光）',timeframe:`日线 · 前复权等权标准化指数 · ${ohlc.length}日`,trend:`收盘${fmt(latest.close)}；MA20/60/90/145=${fmt(ma20)}/${fmt(ma60)}/${fmt(ma90)}/${fmt(ma145)}，${aboveLong?'中长期趋势仍偏强':'尚未形成中长期共振'}`,volume:`当日成交额${fmt(latest.volume)}百万元，为20日均额${fmt(volumeRatio)}倍`,wave:'主计数：中期推动浪后的高位整理；备选计数：若跌破失效位，则转为更大级别调整。波浪划分为主观方案。',fibonacci:`近250日高低点${fmt(high250)}/${fmt(low250)}；回撤0.382/0.5/0.618对应${fmt(fib382)}/${fmt(fib50)}/${fmt(fib618)}`,chan:`日线观察最近20日中枢；放量突破${fmt(trigger)}视为三买候选，跌破${fmt(invalidation)}则结构失效。`,rating:decisionLevel==='trial'?'小仓试错':'等待触发',riskReward:`${fmt((trigger-latest.close)/(latest.close-invalidation||1),1)} : 1（触发距离/失效距离）`,trigger:`放量突破${fmt(trigger)}，成交额至少达到20日均额1.2倍`,invalidation:`收盘跌破${fmt(invalidation)}`,prices,volumes,ohlc:ohlc.map(x=>({date:x.date,open:x.open,high:x.high,low:x.low,close:x.close})),volumeUnit:'百万元（5股成交额合计）'},
  executionPlan:{action:decisionLevel==='trial'?'可以小仓试错；禁止追高':'等待价格与量能触发',trigger:`放量突破${fmt(trigger)}，且成交额≥20日均额1.2倍`,add:`突破后回踩${fmt(trigger)}附近不破，且盈利预测未下修`,priceInvalidation:`收盘跌破${fmt(invalidation)}`,fundamentalInvalidation:'云厂商资本开支下修，或多数样本收入/利润/毛利率连续恶化',nextReview:'下一个交易周及公司中报披露后'},
  evidenceQuality:[{grade:'A',label:'A股行情与估值',note:'Tushare交易所行情和daily_basic，截至'+latest.date},{grade:'A',label:'云厂商资本开支',note:'Microsoft、Alphabet投资者关系官网'},{grade:'B',label:'样本财务指标',note:'Tushare财务指标并以公司定期报告为底层来源'},{grade:'B',label:'券商盈利预测',note:`近120日匹配${selectedForecasts.length}条预测记录；完整研报权限未开通`}],
  supplyDemand:{state:'需求强、供给瓶颈逐步缓解',tone:'positive',direction:'高景气但估值敏感',conclusion:'云厂商资本开支证明需求仍强；供给侧缺少统一产能口径，因此以样本毛利率、存货和盈利预测验证供需紧张是否转化为利润。',demand:{status:'强',evidence:'微软2026年CapEx约1900亿美元，Alphabet 1750–1850亿美元。',change:'继续扩张',tone:'positive'},supply:{status:'高端环节仍受约束',evidence:'行业缺少统一官方产能口径，不能用名义扩产直接判断有效供给。',change:'逐步释放',tone:'warning'},inventory:{status:'公司间分化',evidence:'需要逐季比较存货、合同负债与收入增速。',change:'中报继续核验',tone:'warning'},price:{status:'结构性支撑',evidence:'高速率代际升级支撑产品结构，成熟产品仍有年降压力。',change:'ASP口径待公司披露',tone:'warning'},profit:{status:'快速增长',evidence:`样本2026Q1净利同比增速中位数${fmt(profitMedian)}%。`,change:'真实兑现',tone:'positive'},leadingIndicator:'微软、Alphabet、Meta资本开支；样本存货、合同负债、毛利率和盈利预测。',improvement:'资本开支继续上修且多数样本毛利率、现金流和盈利预测同步改善。',invalidation:'资本开支下修、订单取消、存货显著快于收入增长或毛利率连续下降。'},
  sources:['Tushare Pro daily/adj_factor/daily_basic/fina_indicator/report_rc，行情采用前复权，数据提取日2026-08-11','Microsoft FY2026 Q3 Earnings Conference Call：https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3','Alphabet 2025 Q4 Earnings Call（含2026 CapEx指引）：https://abc.xyz/investor/events/event-details/2026/2025-Q4-Earnings-Call-2026-Dr_C033hS6/default.aspx','NVIDIA FY2027 Q1 Results：https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-First-Quarter-Fiscal-2027/default.aspx']}
await fs.writeFile(path.join(root,'data/reports/optical-module.json'),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({asOf:report.asOf,days:ohlc.length,decisionLevel,close:fmt(latest.close),trigger:fmt(trigger),invalidation:fmt(invalidation),medianPe:fmt(medianPe),revenueMedian:fmt(revenueMedian),profitMedian:fmt(profitMedian)},null,2))
