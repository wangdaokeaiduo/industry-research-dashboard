import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const inputDir = path.join(root, 'data/reports')
const outputDir = path.join(root, 'docs/reports')
await mkdir(outputDir, { recursive: true })

const safe = value => value ?? '—'
const table = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(()=>'---').join(' | ')} |`,
  ...rows.map(row=>`| ${row.map(cell=>String(safe(cell)).replaceAll('|','/')).join(' | ')} |`)
].join('\n')

function render(report) {
  const d = report.decisionOverview || {}
  const weekly = report.weeklyChanges || {}
  const decisionNames={no_trade:'现在不适合交易',data_insufficient:'关键数据不足，暂不判断',wait_trigger:'等待触发，现在不追',trial:'可以小仓试错',add:'可以条件性加仓'}
  const out = [`# ${report.industry}投资研究报告`, '', `> 数据截止：${report.asOf}｜文档更新：${report.updatedAt}｜不构成投资建议`, '',`## 0. 是否可以交易`,'',`**${safe(decisionNames[report.decisionLevel]||report.executionPlan?.action)}**`,'',`- 当前动作：${safe(report.executionPlan?.action)}`,`- 触发条件：${safe(report.executionPlan?.trigger)}`,`- 退出条件：${safe(report.executionPlan?.priceInvalidation)}`,'']
  if(report.dataGaps?.length) out.push('**已知数据边界（不等于整份报告数据不足）**','',...report.dataGaps.map(x=>`- ${x}`),'')
  out.push('## 1. 投资决策总览','')
  if (d.items?.length) out.push(table(['维度','判断','评分','核心证据'],d.items.map(x=>[x.label,x.value,x.score,x.comment])),'')
  out.push(`**核心矛盾：** ${safe(d.coreConflict)}`,'',`**当前动作：** ${safe(d.action)}`,'')
  out.push('## 2. 与上周相比','',`**${safe(weekly.title)}**：${safe(weekly.summary)}`,'')
  if (weekly.items?.length) out.push(table(['指标','上期','本期','变化','影响'],weekly.items.map(x=>[x.label,x.before,x.current,x.change,x.impact])),'')
  out.push('## 3. 行业景气度','',`- 景气等级：${safe(report.prosperity?.level)}` ,`- 变化方向：${safe(report.prosperity?.direction)}` ,`- 景气评分：${safe(report.prosperity?.score)}/100` ,`- 判断：${safe(report.prosperity?.verdict)}`,'')
  const supply=report.supplyDemand||{}
  out.push('## 4. 供需关系','',`- 供需状态：${safe(supply.state)}`,`- 变化方向：${safe(supply.direction)}`,`- 综合判断：${safe(supply.conclusion)}`,'')
  out.push(table(['维度','状态','真实证据','变化'],[['需求',supply.demand?.status,supply.demand?.evidence,supply.demand?.change],['供给',supply.supply?.status,supply.supply?.evidence,supply.supply?.change],['库存',supply.inventory?.status,supply.inventory?.evidence,supply.inventory?.change],['价格',supply.price?.status,supply.price?.evidence,supply.price?.change],['利润',supply.profit?.status,supply.profit?.evidence,supply.profit?.change]]),'',`- 领先指标：${safe(supply.leadingIndicator)}`,`- 改善条件：${safe(supply.improvement)}`,`- 证伪条件：${safe(supply.invalidation)}`,'')
  const research=report.marketResearch||{}
  out.push('## 5. 行业研报与行业温度','',`- 数据状态：${safe(research.statusNote)}`,`- 统计口径：${safe(research.reportScope)}`,`- 统计期：${safe(research.period)}`,`- 行业研报：${safe(research.reportCount)}份 / ${safe(research.institutionCount)}家机构`,`- 个股盈利预测汇总样本：${safe(research.companyForecastSampleCount)}条`,`- 行业共识：${safe(research.consensus)}`,`- 预期变化：${safe(research.revisionTrend)}`,'')
  if(research.commonViews?.length) out.push('**共同观点**','',...research.commonViews.map(x=>`- ${x}`),'')
  if(research.disagreements?.length) out.push('**核心分歧**','',...research.disagreements.map(x=>`- ${x}`),'')
  if(research.synthesis){const s=research.synthesis;out.push('### 研报共性与不同点','',`- 证据等级：${safe(s.confidence)}（${safe(s.evidenceNote)}）`,`- 综合判断：${safe(s.verdict)}`,'');if(s.commonPoints?.length)out.push('**共性**','',...s.commonPoints.map(x=>`- **${x.point}**：${x.reason}（${x.support}）`),'');if(s.differences?.length)out.push('**不同点**','',...s.differences.map(x=>`- **${x.topic}**：${x.views}；投资含义：${x.investmentMeaning}`),'');out.push(`**整合后的新判断：** ${safe(s.integratedView)}`,'',`**验证方法：** ${safe(s.validation)}`,'')}
  out.push(`**综合研判：** ${safe(research.integratedConclusion)}`,'',`**事实核验：** ${safe(research.evidenceCheck)}`,'')
  if(research.freeSources?.length) out.push('**免费公开来源**','',...research.freeSources.map(x=>`- [${x.name}](${x.url})（${x.typeLabel}）：${x.description}`),'')
  if(research.topReports?.length) out.push(table(['日期','机构','行业研报标题','类型'],research.topReports.map(x=>[x.date,x.institution,x.url?`[${x.title}](${x.url})`:x.title,x.type||'行业研究'])),'')
  out.push('## 6. 执行摘要','',safe(report.summary?.conclusion),'',...(report.summary?.evidence||[]).map(x=>`- ${x}`),'')
  out.push('## 7. 反转条件','')
  if (report.reversalConditions?.length) out.push(table(['条件','维度','当前','阈值','状态'],report.reversalConditions.map(x=>[x.name,x.dimension,x.current,x.threshold,x.status])),'')
  if(report.auditRiskHistory?.items?.length){const a=report.auditRiskHistory;out.push('### 近5年财报审计风险','',`- 综合风险：${safe(a.overallRisk)}`,`- 总结：${safe(a.summary)}`,`- 风险解除条件：${safe(a.watch)}`,'',table(['年度','审计意见','风险','审计机构','签字会计师','审计费','变化与主要问题'],a.items.map(x=>[x.year,x.opinion,x.riskLabel,x.agency,x.signers,Number.isFinite(x.fee)?`${x.fee.toFixed(0)}万元`:'未披露',`${x.change}；${x.issue}`])),'')}
  out.push('## 8. 公司分层','')
  if (report.companyComparison?.length) out.push(table(['分层','公司','代码','驱动','估值观察','风险'],report.companyComparison.map(x=>[x.tier,x.company,x.ticker,x.driver,x.valuation,x.risk])),'')
  out.push('## 9. 盈利与估值情景','')
  if (report.valuationScenarios?.length) out.push(table(['情景','权重','假设','估值方法','验证信号'],report.valuationScenarios.map(x=>[x.name,x.weight,x.assumption,x.valuation,x.signal])),'')
  out.push('## 10. 技术面与交易条件','',`- 趋势：${safe(report.technical?.trend)}`,`- 量能：${safe(report.technical?.volume)}`,`- 波浪：${safe(report.technical?.wave)}`,`- 斐波那契：${safe(report.technical?.fibonacci)}`,`- 缠论：${safe(report.technical?.chan)}`,`- 触发：${safe(report.technical?.trigger)}`,`- 失效：${safe(report.technical?.invalidation)}`,'')
  out.push('## 11. 催化剂日历','')
  if (report.catalysts?.length) out.push(table(['日期','事件','预期','状态'],report.catalysts.map(x=>[x.date,x.event,x.expectation,x.statusLabel])),'')
  const e=report.executionPlan||{}
  out.push('## 12. 执行与风控','',`- 当前动作：${safe(e.action)}`,`- 首次触发：${safe(e.trigger)}`,`- 加仓确认：${safe(e.add)}`,`- 价格失效：${safe(e.priceInvalidation)}`,`- 基本面失效：${safe(e.fundamentalInvalidation)}`,`- 下次复核：${safe(e.nextReview)}`,'')
  out.push('## 13. 空头辩护与证据质量','',...(report.bearCase||[]).map(x=>`- ${x}`),'')
  if (report.evidenceQuality?.length) out.push(table(['等级','证据','说明'],report.evidenceQuality.map(x=>[x.grade,x.label,x.note])),'')
  out.push('## 14. 来源','',...(report.sources||[]).map((x,i)=>`${i+1}. ${x}`),'')
  return out.join('\n')
}

const files = (await readdir(inputDir)).filter(name=>name.endsWith('.json'))
for (const file of files) {
  const report = JSON.parse(await readFile(path.join(inputDir,file),'utf8'))
  await writeFile(path.join(outputDir,`${report.id}.md`),render(report),'utf8')
}
console.log(`Generated ${files.length} reports in ${outputDir}`)
