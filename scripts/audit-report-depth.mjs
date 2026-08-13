import {promises as fs} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'data/reports')
const base=['tradeDecision','decisionOverview','weeklyChanges','prosperity','supplyDemand','marketResearch','metrics','industryChain','companyComparison','valuationScenarios','technical','catalysts','executionPlan','bearCase','evidenceQuality'],failures=[]
for(const file of (await fs.readdir(dir)).filter(x=>x.endsWith('.json'))){
  const r=JSON.parse(await fs.readFile(path.join(dir,file),'utf8')),stock=r.reportType==='stock'||r.id?.endsWith('-stock'),required=stock?[...base,'auditRiskHistory']:base
  const missing=required.filter(key=>r[key]==null||(Array.isArray(r[key])&&!r[key].length)),stale=['本次仅作技术研究','基本面需另行完整研究','需完整基本面研究'].filter(text=>JSON.stringify(r).includes(text))
  if(missing.length)failures.push(`${file}: 缺少 ${missing.join(', ')}`)
  if(stale.length)failures.push(`${file}: 残留缩减研究措辞 ${stale.join(', ')}`)
  if((r.technical?.ohlc?.length||0)<250)failures.push(`${file}: 真实OHLC不足250根`)
  if((r.technical?.volumeAverages?.length||0)<6)failures.push(`${file}: 缺少5/10/20/60/90/145六档量能`)
  if((r.tradeDecision?.checks?.length||0)<5)failures.push(`${file}: 实际交易判定条件少于5项`)
}
if(failures.length)throw new Error(`深度报告审计失败：\n${failures.join('\n')}`)
console.log('All reports passed full-depth audit')
