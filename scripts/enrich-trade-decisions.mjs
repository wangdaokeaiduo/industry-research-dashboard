import {promises as fs} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dir=path.join(root,'data/reports')
const files=(await fs.readdir(dir)).filter(name=>name.endsWith('.json'))

for(const file of files){
  const target=path.join(dir,file)
  const report=JSON.parse(await fs.readFile(target,'utf8'))
  if(report.reportType==='stock'||report.id?.endsWith('-stock'))continue
  const checks=(report.reversalConditions||[]).filter(item=>item?.name&&item?.current&&item?.threshold)
  if(!checks.length)continue
  const technical=checks.find(item=>item.dimension==='技术'||/K线|量价|放量|技术/.test(item.name))
  const fundamental=checks.filter(item=>item!==technical)
  const blocker=fundamental.find(item=>item.status==='unmet')||fundamental.find(item=>item.status==='partial')
  const stage=report.summary?.stage||report.cycle?.current||report.prosperity?.level||report.industry
  let verdict
  if(report.decisionLevel==='data_insufficient')verdict=`${stage}，关键交易数据不足，暂不判断`
  else if(report.decisionLevel==='no_trade')verdict=blocker?`${stage}，但${blocker.name}未达成，当前不交易`:`${stage}，风险条件未解除，当前不交易`
  else if(report.decisionLevel==='trial'||report.decisionLevel==='add')verdict=`${stage}与量价初步共振，${report.decisionLevel==='add'?'可按条件加仓':'可以小仓试错'}`
  else if(technical&&technical.status!=='met')verdict=`${stage}，但${technical.name}未达到交易门槛，当前不交易`
  else if(blocker)verdict=`技术条件已有改善，但${blocker.name}未达成，继续观察`
  else verdict=report.executionPlan?.action||'条件尚未完全确认，继续观察'
  const unmet=checks.filter(item=>item.status!=='met').slice(0,2)
  const reason=`截至${report.asOf}，${checks.filter(item=>item.status==='met').length}/${checks.length}项条件达成。${unmet.length?`主要缺口：${unmet.map(item=>`${item.name}（${item.current}；标准：${item.threshold}）`).join('；')}`:'产业与技术条件均已达到初步标准，仍按失效位控制风险。'}`
  report.tradeDecision={asOf:report.asOf,verdict,reason,checks}
  await fs.writeFile(target,JSON.stringify(report,null,2)+'\n')
}

console.log(`Updated data-driven trade decisions in ${files.length} report files`)
