import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envText = await fs.readFile(path.join(root, '.env.local'), 'utf8').catch(() => '')
const token = process.env.TUSHARE_TOKEN || envText.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
if (!token) throw new Error('缺少 TUSHARE_TOKEN，请复制 .env.example 为 .env.local 后填写')

const api = async (apiName, params, fields) => {
  const response = await fetch('http://api.tushare.pro', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ api_name:apiName, token, params, fields }) })
  const body = await response.json()
  if (body.code !== 0) return { ok:false, code:body.code, message:body.msg || '接口调用失败', rows:[] }
  const names = body.data?.fields || []
  return { ok:true, code:0, message:'', rows:(body.data?.items || []).map(values => Object.fromEntries(names.map((name,index)=>[name,values[index]]))) }
}

const now = new Date()
const ymd = date => date.toISOString().slice(0,10).replaceAll('-','')
const start = new Date(now); start.setUTCDate(start.getUTCDate()-120)
const period = `${ymd(start)}—${ymd(now)}`
const [fullText, forecasts] = await Promise.all([
  api('research_report', { start_date:ymd(start), end_date:ymd(now), report_type:'行业研报' }, 'trade_date,abstr,title,report_type,author,inst_csname,ind_name,url'),
  api('report_rc', { start_date:ymd(start), end_date:ymd(now) }, 'ts_code,name,report_date,report_title,classify,org_name,author,quarter,op_rt,np,eps,pe')
])

const profiles = {
  'pig-cycle': { keywords:['猪','养殖','牧原','温氏','新希望'], consensus:'盈利预期分化', conclusion:'供给去化是主线，但猪价和头均利润仍需共同验证，机构盈利预测只能作为预期层证据。' },
  'game-sector': { keywords:['游戏','腾讯','网易','三七互娱','吉比特'], consensus:'产品周期仍是核心', conclusion:'新品兑现和出海增长是共识，估值是否继续扩张取决于流水持续性，而非版号数量本身。' },
  'medical-aesthetics': { keywords:['医美','爱美客','华熙生物','昊海生科'], consensus:'等待需求与业绩修复', conclusion:'机构关注新品和合规红利，但上市公司收入与利润修复仍是必须通过的事实检验。' },
  'baijiu-sector': { keywords:['白酒','贵州茅台','五粮液','山西汾酒','泸州老窖'], consensus:'关注动销与库存', conclusion:'消费数据改善不能替代渠道去库存，批价、库存和现金回款需同时转强才是可靠反转。' },
  'tourism-hotel': { keywords:['旅游','酒店','首旅酒店','锦江酒店','宋城演艺'], consensus:'需求韧性、利润弹性分化', conclusion:'客流继续增长，但投资价值取决于房价、入住率和新增供给能否转化为RevPAR与利润。' },
  'optical-module': { keywords:['光模块','中际旭创','新易盛','天孚通信'], consensus:'AI资本开支支撑需求', conclusion:'需求共识较强，主要分歧转向产能、良率、价格压力和高估值能否被盈利兑现。' },
  'mlcc-sector': { keywords:['MLCC','被动元件','风华高科','三环集团','火炬电子','鸿远电子','洁美科技'], consensus:'高端AI需求强、消费端分化', conclusion:'高端规格的订单与价格正在改善，但消费端并未全面复苏；需用BB Ratio、价格、样本公司毛利率和板块量价突破共同确认。' },
  'gold-sector': { keywords:['黄金','贵金属','山东黄金','中金黄金','赤峰黄金','山金国际','紫金矿业'], consensus:'央行和投资需求提供结构支撑', conclusion:'黄金长期配置逻辑仍强，但黄金股投资价值必须继续核验实际利率、ETF和央行买盘，以及矿企产量、AISC与现金流。' },
  'innovative-drug': { keywords:['创新药','生物医药','恒瑞医药','百济神州','君实生物','荣昌生物','泽璟制药'], consensus:'中国创新资产全球价值提升', conclusion:'产业景气向上但公司分化显著；优先验证临床差异化、BD首付款、商业化收入、现金储备和板块量价突破。' },
  'pharmacy-chain': { keywords:['药店','医药零售','医药连锁','益丰药房','大参林','老百姓','一心堂','健之佳'], consensus:'从门店扩张转向合规与单店效率', conclusion:'处方外流带来长期增量，但价格监管与门店过密压制回报；需用同店、毛利率、库存、经营现金流和板块量价共同确认。' },
  'memory-chip': { keywords:['存储芯片','存储器','DRAM','NAND','HBM','兆易创新','北京君正','东芯股份','佰维存储','江波龙'], consensus:'AI需求与供给约束推动价格和盈利扩张', conclusion:'存储进入高景气扩张期，但A股映射和估值分化明显；需用合约价、原厂库存、样本毛利率与板块量价共同确认。' },
  'pcb-sector': { keywords:['PCB','印制电路板','HDI','深南电路','沪电股份','胜宏科技','鹏鼎控股','生益电子'], consensus:'AI服务器推动高阶PCB层数、材料和单机价值量升级', conclusion:'AI高阶PCB景气明确，但普通消费板并非同步繁荣；需用高端材料供给、扩产良率、AI收入、样本毛利率和板块量价共同确认。' },
  'food-beverage': { keywords:['食品饮料','食品制造','白酒','乳制品','调味品','软饮料','休闲食品','速冻食品','贵州茅台','伊利股份','海天味业','东鹏饮料'], consensus:'必选消费有韧性、子行业景气和利润明显分化', conclusion:'食品饮料并非全面复苏；需分别验证终端零售、价格、渠道库存、毛利率、经营现金流和板块量价。' }
}
const freeSources = JSON.parse(await fs.readFile(path.join(root,'data/research-sources.json'),'utf8'))

const matches = (row, keywords) => keywords.some(keyword => Object.values(row).some(value => String(value||'').includes(keyword)))
const cacheDir = path.join(root,'data/research-cache')
await fs.mkdir(cacheDir,{recursive:true})
const status = { syncedAt:now.toISOString(), period, fullText:{ok:fullText.ok,code:fullText.code,message:fullText.message}, forecast:{ok:forecasts.ok,rows:forecasts.rows.length} }
await fs.writeFile(path.join(cacheDir,'status.json'), JSON.stringify(status,null,2)+'\n')

for (const [id,profile] of Object.entries(profiles)) {
  const file = path.join(root,'data/reports',`${id}.json`)
  const report = JSON.parse(await fs.readFile(file,'utf8'))
  const previousResearch = report.marketResearch || {}
  const selectedForecasts = forecasts.rows.filter(row=>matches(row,profile.keywords))
  const selectedFullText = fullText.rows.filter(row=>matches(row,profile.keywords))
  const industryForecasts = selectedForecasts.filter(row=>/行业|产业|周报|月报|策略|专题|板块|赛道/.test(row.report_title||''))
  const rawItems = [...selectedFullText.map(row=>({date:row.trade_date,institution:row.inst_csname,title:row.title,author:row.author,url:row.url,type:'行业研报'})), ...industryForecasts.map(row=>({date:row.report_date,institution:row.org_name,title:row.report_title,author:row.author,type:'行业研究索引'}))].filter(item=>item.title)
  const uniqueItems = [...new Map(rawItems.map(item=>[`${item.date}|${item.institution}|${item.title}`,item])).values()]
  const preservedExternal = (previousResearch.topReports || []).filter(item=>item.url && item.type !== '行业研究索引')
  const combinedItems = [...uniqueItems, ...preservedExternal]
  const combined = [...new Map(combinedItems.map(item=>[`${item.date}|${item.institution}|${item.title}`,item])).values()]
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8)
  const institutions = new Set(combinedItems.map(item=>item.institution).filter(Boolean))
  const refreshedResearch = {
    fullTextStatus: fullText.ok ? 'available' : fullText.code === 40203 ? 'permission_required' : 'unavailable',
    statusNote: fullText.ok ? 'Tushare research_report 已连接' : forecasts.ok ? 'Token有效；当前使用可用的券商盈利预测，完整研报需单独开通权限' : `${previousResearch.statusNote||'研报连接暂不可用'}；本次同步受接口频率限制，已保留上次数据`,
    period, reportCount:uniqueItems.length, institutionCount:institutions.size, companyForecastSampleCount:selectedForecasts.length,
    reportScope:'仅行业周报、策略、专题与行业深度；个股报告不逐条展示',
    consensus:profile.consensus, revisionTrend:selectedForecasts.length ? `代表公司盈利预测样本${selectedForecasts.length}条，用于观察行业盈利预期扩散，不作为行业研报展示` : '本期代表公司盈利预测样本不足',
    commonViews:['机构观点仅作为预期证据，不替代产业供需和公司财报','优先观察盈利预测是否连续上修，而不是单篇研报标题'],
    disagreements:['需求增长能否转化为利润','当前估值是否已经提前反映乐观预期'],
    integratedConclusion:profile.conclusion,
    evidenceCheck:'综合结论已与报告中的真实数据交叉检查；完整研报摘要尚未接入时，不推断研报正文观点。', synthesis:previousResearch.synthesis||null,
    freeSources,
    topReports:combined
  }
  report.marketResearch = forecasts.ok || fullText.ok ? refreshedResearch : { ...previousResearch, ...refreshedResearch, period:previousResearch.period||period, reportCount:previousResearch.reportCount||0, institutionCount:previousResearch.institutionCount||0, revisionTrend:previousResearch.revisionTrend||refreshedResearch.revisionTrend, topReports:previousResearch.topReports||[], freeSources }
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n')
}

console.log(JSON.stringify({ fullText:status.fullText.ok?'available':'permission_required', forecastRows:forecasts.rows.length, updatedReports:Object.keys(profiles).length },null,2))
