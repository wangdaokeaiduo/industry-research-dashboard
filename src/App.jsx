import { useEffect, useMemo, useState } from 'react'

const categoryName = { cycle: '周期', growth: '成长', mixed: '混合' }
const isStockReport = report => report?.reportType === 'stock' || report?.id?.endsWith('-stock')
const statusMeta = {
  met: ['已达成', 'positive'], partial: ['部分达成', 'warning'],
  unmet: ['未达成', 'negative'], unknown: ['待验证', 'muted']
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    pulse: <path d="M3 12h4l2.2-6 4.1 12 2.1-6H21"/>,
    refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <><path d="M5 12h14"/><path d="m15 8 4 4-4 4"/></>,
    alert: <><path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5M12 17h.01"/></>
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Sparkline({ values = [], direction }) {
  if (!values.length) return null
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1
  const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 86},${27 - ((v - min) / span) * 22}`).join(' ')
  return <svg viewBox="0 0 86 30" className={`spark ${direction}`} preserveAspectRatio="none"><polyline points={points}/></svg>
}

function PriceChart({ prices = [], volumes = [], ohlc = [], levels = [] }) {
  const defaultWindow = Math.min(50, prices.length)
  const minWindow = Math.min(10, prices.length)
  const [start, setStart] = useState(Math.max(0, prices.length-defaultWindow))
  const [end, setEnd] = useState(prices.length)
  const [hoverIndex, setHoverIndex] = useState(null)
  useEffect(() => { setStart(Math.max(0,prices.length-defaultWindow)); setEnd(prices.length) }, [prices.length, defaultWindow])
  if (!prices.length) return <div className="empty">暂无行情序列</div>
  const periods = [5, 10, 20, 60, 90, 145]
  const colors = {5:'#e85d3f',10:'#d99a2b',20:'#8c63c7',60:'#2f80c9',90:'#25a59a',145:'#586473'}
  const visiblePrices = prices.slice(start, end)
  const visibleVolumes = volumes.slice(start, end)
  const hasRealOhlc = ohlc.length === prices.length && ohlc.every(item=>['open','high','low','close'].every(key=>Number.isFinite(item?.[key])))
  const visibleOhlc = hasRealOhlc ? ohlc.slice(start,end) : []
  const averages = Object.fromEntries(periods.map(period => [period, prices.map((_, index) => index < period - 1 ? null : prices.slice(index-period+1,index+1).reduce((sum,value)=>sum+value,0)/period)]))
  const visibleAverages = Object.fromEntries(periods.map(period => [period, averages[period].slice(start,end)]))
  const visibleLevels = levels.filter(item=>Number.isFinite(item.value))
  const scaleValues = [...visiblePrices,...Object.values(visibleAverages).flat().filter(Number.isFinite),...visibleLevels.map(item=>item.value)]
  const min = Math.min(...scaleValues) * .98, max = Math.max(...scaleValues) * 1.02, span = max - min || 1
  const width = 720, plotWidth = 650, chartHeight = 170, step = plotWidth / visiblePrices.length
  const y = (v) => 12 + (max - v) / span * (chartHeight - 24)
  const maxVol = Math.max(...visibleVolumes, 1)
  const path = (values) => values.map((value,index)=>value==null?null:`${index*step+step/2},${y(value)}`).filter(Boolean).join(' ')
  const hoverBar = hoverIndex == null ? null : visibleOhlc[hoverIndex]
  const hoverClose = hoverIndex == null ? null : visiblePrices[hoverIndex]
  const sourceIndex = hoverIndex == null ? null : start + hoverIndex
  const previousClose = sourceIndex == null ? null : prices[sourceIndex-1]
  const change = Number.isFinite(previousClose) && previousClose ? (hoverClose/previousClose-1)*100 : null
  const hoverX = hoverIndex == null ? null : hoverIndex*step+step/2
  const moveHover = event => { const rect=event.currentTarget.getBoundingClientRect(); const svgX=(event.clientX-rect.left)/rect.width*width; if(svgX<0||svgX>plotWidth)return setHoverIndex(null); setHoverIndex(Math.max(0,Math.min(visiblePrices.length-1,Math.floor(svgX/step)))) }
  return <div className="chart-window"><div className="chart-stage"><svg className="price-chart" data-visible-count={visiblePrices.length} viewBox={`0 0 ${width} 230`} preserveAspectRatio="none" role="img" aria-label={`当前显示第${start+1}至${start+visiblePrices.length}个交易日，含MA5、MA10、MA20、MA60、MA90、MA145均线`} onPointerMove={moveHover} onPointerDown={moveHover} onPointerLeave={()=>setHoverIndex(null)}>
    {[0,1,2,3].map(i => {const tick=max-(span*i/3);return <g key={i}><line x1="0" x2={plotWidth} y1={20+i*46} y2={20+i*46} className="gridline"/><text x={plotWidth+9} y={24+i*46} className="price-axis-label">{tick.toFixed(2)}</text></g>}) }
    {visibleLevels.map(item=><g key={`${item.label}-${item.value}`} className={`key-level ${item.tone}`}><line x1="0" x2={plotWidth} y1={y(item.value)} y2={y(item.value)}/><rect x={plotWidth-94} y={y(item.value)-10} width="94" height="19"/><text x={plotWidth-6} y={y(item.value)+4} textAnchor="end">{item.label} {item.value.toFixed(2)}</text></g>)}
    {hasRealOhlc ? visibleOhlc.map((bar, i) => {
      const up=bar.close>=bar.open,cx=i*step+step/2,bodyY=Math.min(y(bar.open),y(bar.close)),h=Math.max(2,Math.abs(y(bar.open)-y(bar.close)))
      return <g key={i} className={up?'candle up':'candle down'}><line x1={cx} x2={cx} y1={y(bar.high)} y2={y(bar.low)}/><rect x={cx-Math.min(step*.24,7)} y={bodyY} width={Math.min(step*.48,14)} height={h}/></g>
    }) : <polyline className="close-line" points={path(visiblePrices)}/>}
    {periods.map(period=><polyline key={period} points={path(visibleAverages[period])} className="ma-line" style={{stroke:colors[period]}}/>) }
    {visibleVolumes.map((v, i) => { const sourceIndex=start+i; return <rect key={i} x={i*step+step*.18} y={225-(v/maxVol)*38} width={step*.64} height={(v/maxVol)*38} className={prices[sourceIndex] >= (prices[sourceIndex-1] ?? prices[sourceIndex]) ? 'volume up' : 'volume down'}/> }) }
    {hoverIndex!=null&&<g className="chart-crosshair"><line x1={hoverX} x2={hoverX} y1="10" y2="225"/><line x1="0" x2={plotWidth} y1={y(hoverClose)} y2={y(hoverClose)}/><circle cx={hoverX} cy={y(hoverClose)} r="4"/></g>}
  </svg>{hoverIndex!=null&&<div className={`chart-tooltip ${hoverX>plotWidth*.62?'left':''}`} style={{left:`${hoverX/width*100}%`,top:`${Math.max(4,y(hoverClose)/230*100)}%`}} role="status"><strong>{hoverBar?.date || `第 ${sourceIndex+1} 个交易日`}</strong>{hoverBar?<><span>开盘 <b>{hoverBar.open.toFixed(2)}</b></span><span>最高 <b>{hoverBar.high.toFixed(2)}</b></span><span>最低 <b>{hoverBar.low.toFixed(2)}</b></span><span>收盘 <b>{hoverBar.close.toFixed(2)}</b></span></>:<span>收盘 <b>{hoverClose.toFixed(2)}</b></span>}<span>涨跌 <b className={change>=0?'up':'down'}>{Number.isFinite(change)?`${change>=0?'+':''}${change.toFixed(2)}%`:'—'}</b></span><span>成交量 <b>{Number.isFinite(visibleVolumes[hoverIndex])?visibleVolumes[hoverIndex].toFixed(2):'—'}</b></span></div>}</div><div className="chart-scrubber"><button onClick={()=>setStart(value=>Math.max(0,value-50))} disabled={!start}>← 扩大50日</button><div className="zoom-range" style={{'--zoom-left':`${start/Math.max(prices.length,1)*100}%`,'--zoom-right':`${100-end/Math.max(prices.length,1)*100}%`}}><div className="zoom-selection"/><input className="zoom-start" type="range" min="0" max={Math.max(0,end-minWindow)} value={start} onChange={event=>setStart(Math.min(Number(event.target.value),end-minWindow))} aria-label="左侧缩放手柄"/><input className="zoom-end" type="range" min={Math.min(prices.length,start+minWindow)} max={prices.length} value={end} onChange={event=>setEnd(Math.max(Number(event.target.value),start+minWindow))} aria-label="右侧缩放手柄"/></div><button onClick={()=>{setStart(Math.max(0,prices.length-defaultWindow));setEnd(prices.length)}} disabled={end===prices.length&&visiblePrices.length===defaultWindow}>最新50日</button><output>第 {start+1}–{end} / {prices.length} · {visiblePrices.length}日</output></div></div>
}

function Sidebar({ reports, selected, onSelect, query, setQuery, filter, setFilter, reportType, onTypeChange }) {
  const filtered = reports.filter(r => (reportType === 'stock' ? isStockReport(r) : !isStockReport(r)) && (filter === 'all' || r.category === filter) && r.industry.toLowerCase().includes(query.toLowerCase()))
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><Icon name="pulse" size={21}/></span><span>周期信号</span></div>
    <div className="research-tabs" role="tablist" aria-label="研究类型">
      <button role="tab" aria-selected={reportType==='sector'} className={reportType==='sector'?'active':''} onClick={()=>onTypeChange('sector')}>板块研究</button>
      <button role="tab" aria-selected={reportType==='stock'} className={reportType==='stock'?'active':''} onClick={()=>onTypeChange('stock')}>个股研究</button>
    </div>
    <label className="search"><Icon name="search" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={reportType==='stock'?'搜索个股或代码':'搜索行业报告'}/><kbd>⌘K</kbd></label>
    {reportType==='sector'&&<div className="filters" role="tablist">
      {[['all','全部'],['cycle','周期'],['growth','成长']].map(([key,label]) => <button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}
    </div>}
    <div className="report-label"><span>{reportType==='stock'?'个股报告':'板块报告'}</span><span>{filtered.length}</span></div>
    <nav className="report-list">
      {filtered.map(report => <button key={report.id} className={`report-row ${selected===report.id?'selected':''}`} onClick={()=>onSelect(report.id)}>
        <span className={`report-symbol ${report.category}`}>{report.industry.slice(0,1)}</span>
        <span className="report-copy"><strong>{report.industry}</strong><small>{report.asOf} · {isStockReport(report)?'个股':categoryName[report.category]}</small></span>
        <Icon name="chevron" size={16}/>
      </button>)}
      {!filtered.length && <p className="side-empty">没有匹配的报告</p>}
    </nav>
    <div className="sidebar-foot"><span className="sync-dot"/>监听 data/reports/</div>
  </aside>
}

function Section({ id, title, action, children, className='' }) {
  return <section id={id} className={`section ${className}`}><div className="section-heading"><h2>{title}</h2>{action && <span>{action}</span>}</div>{children}</section>
}

function CycleTrack({ cycle }) {
  const current = cycle?.current
  return <div className="cycle-track">{cycle?.stages?.map((stage, index) => <div key={stage} className={`cycle-step ${stage===current?'current':''}`}><span>{index+1}</span><strong>{stage}</strong></div>)}</div>
}

function Executive({ summary }) {
  return <div className="executive-grid">
    <div className="executive-copy"><p className="conclusion"><b>本周结论：</b>{summary?.conclusion}</p><div className="evidence-list">{summary?.evidence?.map((item,i)=><span key={item}><b>0{i+1}</b>{item}</span>)}</div></div>
    <div className="rating-block"><div><small>周期阶段</small><strong>{summary?.stage}</strong></div><div><small>左侧评级</small><strong>{summary?.rating}</strong></div><div><small>信心等级</small><strong>{summary?.confidence}</strong></div></div>
  </div>
}

function Prosperity({ data={}, label='行业景气度' }) {
  const score = Math.max(0, Math.min(100, Number(data.score) || 0))
  return <div className="prosperity-card"><div className="prosperity-verdict"><small>{label}</small><strong>{data.level || '待判断'}</strong><span className={`prosperity-direction ${data.directionTone || 'neutral'}`}>{data.direction || '方向待验证'}</span><div className="prosperity-score"><i style={{width:`${score}%`}}/><b>{score}<em>/100</em></b></div><p>{data.verdict}</p></div><div className="prosperity-signals">{data.dimensions?.map(item=><div key={item.name}><span>{item.name}</span><strong>{item.value}</strong><small className={item.tone || 'neutral'}>{item.change}</small></div>)}</div><div className="prosperity-watch"><div><small>核心驱动</small><p>{data.driver}</p></div><div><small>进一步改善需要</small><p>{data.improvement}</p></div><div><small>恶化信号</small><p>{data.deterioration}</p></div></div></div>
}

function SupplyDemand({ data={} }) {
  const dimensions = ['demand','supply','inventory','price','profit']
  const labels = { demand:'需求', supply:'供给', inventory:'库存', price:'价格', profit:'利润' }
  return <div className="supply-demand">
    <div className={`supply-verdict ${data.tone||'warning'}`}><div><small>供需结论</small><strong>{data.state||'待验证'}</strong></div><p>{data.conclusion}</p><span>{data.direction||'方向待确认'}</span></div>
    <div className="supply-dimensions">{dimensions.map(key=>{const item=data[key]||{};return <div key={key}><small>{labels[key]}</small><strong>{item.status||'待补充'}</strong><p>{item.evidence||'尚无足够数据'}</p><em className={item.tone||'muted'}>{item.change||'—'}</em></div>})}</div>
    <div className="supply-watch"><div><small>领先指标</small><p>{data.leadingIndicator}</p></div><div><small>改善条件</small><p>{data.improvement}</p></div><div><small>证伪条件</small><p>{data.invalidation}</p></div></div>
  </div>
}

function MarketResearch({ data={}, stock=false }) {
  const status = data.fullTextStatus === 'available' ? '完整研报已接入' : data.fullTextStatus === 'permission_required' ? '完整研报权限未开通' : '研报数据待连接'
  return <div className="market-research">
    <div className="research-summary"><div><small>{stock?'公告消息连接':'行业研报连接'}</small><strong>{status}</strong><span>{data.statusNote}</span></div><div><small>{stock?'公告与事件覆盖':'行业研报覆盖'}</small><strong>{data.reportCount ?? 0}<em>份</em></strong><span>{data.institutionCount ?? 0} 家机构 · {data.period||'—'}</span></div><div><small>{stock?'消息面判断':'行业温度'}</small><strong>{data.consensus||'样本不足'}</strong><span>{data.revisionTrend||'尚未形成可验证趋势'}</span></div></div>
    {data.reportScope&&<div className="research-scope"><b>统计口径</b><span>{data.reportScope}</span>{Number.isFinite(data.companyForecastSampleCount)&&<em>个股盈利预测仅汇总：{data.companyForecastSampleCount}条</em>}</div>}
    {data.synthesis&&<ReportSynthesis data={data.synthesis}/>} 
    {!data.synthesis&&(data.commonViews?.length||data.disagreements?.length)&&<div className="research-views"><div><h3>共同观点</h3>{data.commonViews?.map((item,i)=><p key={item}><b>0{i+1}</b>{item}</p>)}</div><div><h3>核心分歧</h3>{data.disagreements?.map((item,i)=><p key={item}><b>0{i+1}</b>{item}</p>)}</div></div>}
    {data.integratedConclusion&&<div className="integrated-conclusion"><small>综合研判</small><strong>{data.integratedConclusion}</strong><p>{data.evidenceCheck}</p></div>}
    {data.freeSources?.length>0&&<div className="free-source-panel"><div className="free-source-head"><div><small>免费公开来源</small><strong>合法入口与事实核验库</strong></div><span>只收录原文链接，不绕过付费墙</span></div><div className="free-source-grid">{data.freeSources.map(source=><a key={source.name} href={source.url} target="_blank" rel="noreferrer"><span className={`source-type ${source.type}`}>{source.typeLabel}</span><strong>{source.name}</strong><p>{source.description}</p><small>{source.coverage}</small></a>)}</div></div>}
    {data.topReports?.length>0&&<div className="research-list"><div className="research-list-head"><span>日期 / 机构</span><span>{stock?'公告 / 消息标题':'行业研报标题'}</span><span>类型</span></div>{data.topReports.map((item,i)=><a key={`${item.date}-${item.title}-${i}`} href={item.url||undefined} target={item.url?'_blank':undefined} rel="noreferrer"><span>{item.date}<small>{item.institution}</small></span><strong>{item.title}</strong><em>{item.type||(stock?'公告消息':'行业研究')}</em></a>)}</div>}
  </div>
}

function ReportSynthesis({ data={} }) {
  return <div className="report-synthesis"><div className="synthesis-head"><div><small>研报综合</small><strong>{data.verdict||'样本不足'}</strong></div><span className={`synthesis-confidence ${data.confidenceTone||'warning'}`}>{data.confidence||'低置信度'}</span><p>{data.evidenceNote}</p></div><div className="synthesis-columns"><div><h3>共性：机构共同关注什么</h3>{data.commonPoints?.length?data.commonPoints.map((item,i)=><article key={`${item.point}-${i}`}><b>0{i+1}</b><div><strong>{item.point}</strong><p>{item.reason}</p><small>{item.support}</small></div></article>):<p className="synthesis-empty">样本不足，不能形成跨机构共性。</p>}</div><div><h3>不同点：机构判断差在哪里</h3>{data.differences?.length?data.differences.map((item,i)=><article key={`${item.topic}-${i}`}><b>0{i+1}</b><div><strong>{item.topic}</strong><p>{item.views}</p><small>{item.investmentMeaning}</small></div></article>):<p className="synthesis-empty">样本不足，无法比较机构分歧。</p>}</div></div><div className="synthesis-conclusion"><small>整合后的新判断</small><strong>{data.integratedView}</strong><p>{data.validation}</p></div></div>
}

function DecisionOverview({ data={} }) {
  return <div className="decision-overview"><div className="decision-grid">{data.items?.map(item=><div key={item.label}><small>{item.label}</small><strong>{item.value}</strong>{Number.isFinite(item.score)&&<span><i style={{width:`${item.score}%`}}/></span>}<p>{item.comment}</p></div>)}</div><div className="core-conflict"><small>当前核心矛盾</small><strong>{data.coreConflict}</strong><p>{data.action}</p></div></div>
}

function TradeDecision({ report }) {
  const stock = isStockReport(report)
  const action = report.executionPlan?.action || report.technical?.rating || report.summary?.rating || '观察'
  const explicit = {
    no_trade: [stock?'现在不适合介入':'现在不适合交易','negative','先回避'],
    data_insufficient: ['关键数据不足，暂不判断','negative','补齐数据'],
    wait_trigger: ['等待触发，现在不追','warning','条件观察'],
    trial: ['可以小仓试错','positive','小仓试错'],
    add: ['可以条件性加仓','positive','条件加仓']
  }[report.decisionLevel]
  const normalized = action.toLowerCase()
  const fallbackTone = normalized.includes('不适合') || normalized.includes('降低') ? 'negative' : normalized.startsWith('条件性加仓') || normalized.startsWith('试仓') ? 'positive' : 'warning'
  const [verdict,tone,badge] = explicit || [fallbackTone === 'negative' ? (stock?'现在不适合介入':'现在不适合交易') : fallbackTone === 'positive' ? (stock?'可以介入，但必须按条件执行':'可以交易，但必须按条件执行') : '等待触发，现在不追',fallbackTone,action]
  const reasons = [report.decisionOverview?.coreConflict, ...(report.summary?.evidence || []).slice(0, 2)].filter(Boolean)
  const invalidation = [report.executionPlan?.priceInvalidation, report.executionPlan?.fundamentalInvalidation].filter(Boolean).join('；')
  const technicalDecision = [report.technical?.rating,report.technical?.trend,report.technical?.volume].filter(Boolean).join('；')
  return <div className={`trade-decision-card ${tone}`}>
    <div className="trade-decision-verdict"><small>直接结论</small><strong>{verdict}</strong><span>{badge} · {action}</span><div className="verdict-trigger"><b>触发什么</b><p>{report.executionPlan?.trigger||report.technical?.trigger||'报告尚未给出可复核的触发条件'}</p></div></div>
    <div className="trade-decision-reasons"><small>为什么</small>{reasons.map((reason,index)=><p key={`${reason}-${index}`}><b>0{index+1}</b>{reason}</p>)}</div>
    <div className="trade-decision-steps"><small>怎么操作</small><ol>
      <li><b>现在</b><span>{report.executionPlan?.action || report.decisionOverview?.action || '保持观察'}</span></li>
      <li><b>触发后</b><span>{report.executionPlan?.trigger || report.technical?.trigger || '等待报告给出明确触发条件'}</span></li>
      <li><b>再加仓</b><span>{report.executionPlan?.add || '只有基本面和技术面继续确认时，才考虑增加暴露'}</span></li>
      <li><b>立即退出</b><span>{invalidation || report.technical?.invalidation || '触发价格或基本面失效条件时停止交易'}</span></li>
    </ol></div>
    <div className="trade-technical-basis"><small>K线怎样判断</small><strong>{report.technical?.rating||'技术状态待验证'}</strong><p>{technicalDecision||'缺少真实OHLCV，不能根据K线下结论。'}</p><span><b>价格认错位</b>{report.executionPlan?.priceInvalidation||report.technical?.invalidation||'待确认'}</span></div>
  </div>
}

function DataGaps({ items=[] }) {
  if(!items.length) return null
  return <div className="data-gap-note"><strong>已知数据边界</strong><p>以下项目尚不能直接验证，但不等于整份报告数据不足：</p><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></div>
}

function WeeklyChanges({ data={} }) {
  return <div className="weekly-changes"><div className="change-summary"><strong>{data.title || '本周变化'}</strong><p>{data.summary}</p></div>{data.items?.length>0&&<div className="table-wrap"><table><thead><tr><th>指标</th><th>上期</th><th>本期</th><th>变化</th><th>影响</th></tr></thead><tbody>{data.items.map(item=><tr key={item.label}><td><strong>{item.label}</strong></td><td>{item.before}</td><td>{item.current}</td><td className={`trend ${item.direction}`}>{item.change}</td><td>{item.impact}</td></tr>)}</tbody></table></div>}</div>
}

function CompanyComparison({ items=[] }) {
  return <div className="table-wrap"><table><thead><tr><th>分层</th><th>公司</th><th>核心暴露/驱动</th><th>财务与估值观察</th><th>最大风险</th></tr></thead><tbody>{items.map(item=><tr key={item.company}><td><span className={`company-tier ${item.tone||''}`}>{item.tier}</span></td><td><strong>{item.company}</strong><small className="ticker">{item.ticker}</small></td><td>{item.driver}</td><td>{item.valuation}</td><td>{item.risk}</td></tr>)}</tbody></table></div>
}

function ValuationScenarios({ items=[] }) {
  return <div className="valuation-grid">{items.map(item=><div key={item.name}><strong>{item.name}<em>{item.weight}</em></strong><p>{item.assumption}</p><dl><dt>估值方法/区间</dt><dd>{item.valuation}</dd><dt>验证信号</dt><dd>{item.signal}</dd></dl></div>)}</div>
}

function DecisionActions({ catalysts=[], execution={}, bearCase=[], evidence=[] }) {
  return <div className="action-system"><div className="catalyst-list"><h3>催化剂日历</h3>{catalysts.map(item=><div key={`${item.date}-${item.event}`}><time>{item.date}</time><p><strong>{item.event}</strong><span>{item.expectation}</span></p><em className={item.status}>{item.statusLabel||'待验证'}</em></div>)}</div><div className="execution-card"><small>当前动作</small><strong>{execution.action}</strong>{[['首次触发',execution.trigger],['加仓确认',execution.add],['价格失效',execution.priceInvalidation],['基本面失效',execution.fundamentalInvalidation],['下次复核',execution.nextReview]].map(([k,v])=><div key={k}><b>{k}</b><span>{v}</span></div>)}</div><div className="bear-evidence"><div><h3>空头辩护</h3>{bearCase.map((item,i)=><p key={item}><b>0{i+1}</b>{item}</p>)}</div><div><h3>证据质量</h3>{evidence.map(item=><p key={item.label}><b className={`grade grade-${item.grade}`}>{item.grade}</b><span>{item.label}</span><small>{item.note}</small></p>)}</div></div></div>
}

function Conditions({ items=[] }) {
  return <div className="table-wrap"><table><thead><tr><th>反转条件</th><th>维度</th><th>当前状态</th><th>阈值 / 标准</th><th>达成情况</th><th>趋势</th></tr></thead><tbody>
    {items.map((item,i)=>{const meta=statusMeta[item.status]||statusMeta.unknown;return <tr key={`${item.name}-${i}`}><td><strong>{item.name}</strong></td><td>{item.dimension}</td><td>{item.current}</td><td>{item.threshold}</td><td><span className={`status ${meta[1]}`}>{meta[0]}</span></td><td className={`trend ${item.trend}`}>{item.trend==='up'?'↑':item.trend==='down'?'↓':'—'}</td></tr>})}
  </tbody></table></div>
}

function Metrics({ items=[] }) {
  return <div className="metrics-strip">{items.map(item=><div className="metric" key={item.label}><div><small>{item.label} · {item.unit}</small><strong>{item.value}</strong><span className={item.direction}>{item.change}</span></div><Sparkline values={item.series} direction={item.direction}/></div>)}</div>
}

function Chain({ items=[] }) {
  return <div className="chain">{items.map((item,i)=><div className="chain-wrap" key={item.stage}><div className="chain-node"><div><small>{item.stage}</small><strong>{item.title}</strong></div><ul>{item.items.map(x=><li key={x}>{x}</li>)}</ul></div>{i<items.length-1&&<span className="chain-arrow"><Icon name="arrow" size={25}/></span>}</div>)}</div>
}

const volumePeriods = [5, 10, 20, 60, 90, 145]

function VolumeMatrix({ data={} }) {
  const latest = data.volumes?.at(-1)
  const rows = volumePeriods.map(days => {
    const supplied = data.volumeAverages?.find(item => item.days === days)
    if (supplied) return supplied
    if (!Number.isFinite(latest) || (data.volumes?.length || 0) < days) return { days }
    const sample = data.volumes.slice(-days)
    const average = sample.reduce((sum, value) => sum + value, 0) / days
    return { days, average, ratio: latest / average }
  })
  return <div className="volume-matrix"><div className="volume-matrix-head"><strong>多周期量能</strong><span>当日量 ÷ N日均量</span></div><div className="volume-periods">{rows.map(item => {
    const ready = Number.isFinite(item.average) && Number.isFinite(item.ratio)
    const tone = !ready ? 'muted' : item.ratio >= 1.2 ? 'strong' : item.ratio < .8 ? 'weak' : 'normal'
    return <div className={`volume-period ${tone}`} key={item.days}><small>{item.days}日均量</small><strong>{ready ? item.average.toFixed(2) : '—'}</strong><span>{ready ? `${item.ratio.toFixed(2)}倍` : '样本不足'}</span></div>
  })}</div><p className="volume-note">口径：{data.volumeUnit || '报告所用成交量单位'}；红色≥1.20倍为显著放量，绿色&lt;0.80倍为显著缩量。</p></div>
}

function PlainTechnicalReadout({ data={} }) {
  const prices=data.prices||[], last=prices.at(-1)
  const average=days=>prices.length>=days?prices.slice(-days).reduce((sum,value)=>sum+value,0)/days:null
  const ma20=average(20), ma60=average(60), ma145=average(145)
  const rating=String(data.rating||'观察'), suppliedVolume20=data.volumeAverages?.find(item=>item.days===20)?.ratio
  const volume20=Number.isFinite(suppliedVolume20)?suppliedVolume20:(data.volumes?.length>=20&&Number.isFinite(data.volumes.at(-1))?data.volumes.at(-1)/(data.volumes.slice(-20).reduce((sum,value)=>sum+value,0)/20):null)
  const structure = !Number.isFinite(last)||!Number.isFinite(ma60) ? '价格数据不足，先不要仅凭图形操作。'
    : last>ma20&&last>ma60&&last>ma145 ? '短线、中期和长期趋势都偏强，但仍要等回踩确认，避免追在情绪高点。'
    : last>ma20&&last>ma60 ? '短线已经回暖，但长期趋势还没有真正转强，现在更像反弹修复。'
    : last<ma20&&last<ma60 ? '短线和中期都偏弱，价格还没有走出可靠底部。' : '价格正在方向选择阶段，暂时没有形成一致趋势。'
  const action = rating.includes('不适合') ? '先不参与，也不要因为跌得多就抄底。'
    : rating.includes('条件性加仓') ? '已有趋势基础，可以按条件分批增加，但不能一次性重仓。'
    : rating.startsWith('试仓') ? '可以用小规模风险预算试错，确认后再增加。' : '放进观察池即可，不追涨、不重仓，等条件出现再行动。'
  const volume = !Number.isFinite(volume20) ? '量能样本不足，无法确认资金态度。' : volume20>=1.2 ? `当前量能约为20日均量的${volume20.toFixed(2)}倍，资金参与度明显增强。` : volume20<.8 ? `当前量能只有20日均量的${volume20.toFixed(2)}倍，买盘确认不足。` : `当前量能约为20日均量的${volume20.toFixed(2)}倍，属于普通水平，尚未形成强确认。`
  return <div className="plain-tech"><div className="plain-tech-lead"><small>一句话结论</small><strong>{rating}</strong><p>{action}</p></div><div><small>现在是什么状态</small><p>{structure}</p></div><div><small>资金有没有进场</small><p>{volume}</p></div><div><small>什么时候可以做</small><p>{data.trigger||'等待价格与量能共同确认。'}</p></div><div><small>什么情况说明看错</small><p>{data.invalidation||'跌破关键支撑或基本面继续恶化。'}</p></div></div>
}

function StockTechnicalDetail({ data={} }) {
  const detail=data.technicalDetail
  if(!detail)return null
  const stats=detail.marketStats||{},chip=detail.chip||{}
  return <div className="stock-technical-detail">
    <div className="stock-tech-head"><div><small>个股技术面总览</small><strong>{detail.headline}</strong><p>{detail.plainConclusion}</p></div><div className="stock-market-stats"><span><small>收盘</small><b>{Number.isFinite(stats.close)?stats.close.toFixed(2):'—'}</b></span><span><small>涨跌幅</small><b className={stats.changePct>=0?'positive':'negative'}>{Number.isFinite(stats.changePct)?`${stats.changePct>=0?'+':''}${stats.changePct.toFixed(2)}%`:'—'}</b></span><span><small>换手率</small><b>{Number.isFinite(stats.turnoverRate)?`${stats.turnoverRate.toFixed(2)}%`:'—'}</b></span><span><small>量比</small><b>{Number.isFinite(stats.volumeRatio)?stats.volumeRatio.toFixed(2):'—'}</b></span></div></div>
    <div className="stock-tech-block"><h3>一、趋势结构</h3><div className="structure-table"><div className="structure-row head"><span>阶段</span><span>时间</span><span>价格区间</span><span>形态特征</span></div>{detail.structure?.map(item=><div className="structure-row" key={`${item.stage}-${item.period}`}><strong>{item.stage}</strong><span>{item.period}</span><b>{item.range}</b><p>{item.feature}</p></div>)}</div></div>
    <div className="stock-tech-block"><h3>二、均线系统</h3><div className="ma-cards">{detail.movingAverages?.map(item=><div key={item.period} className={item.bias>=0?'above':'below'}><small>MA{item.period}</small><strong>{item.value.toFixed(2)}</strong><span>{item.relation}</span><em>乖离 {item.bias>=0?'+':''}{item.bias.toFixed(2)}%</em></div>)}</div></div>
    <div className="stock-tech-block"><h3>三、核心指标</h3><div className="indicator-grid">{detail.indicators?.map(item=><article key={item.name} className={item.tone||'neutral'}><div><strong>{item.name}</strong><span>{item.state}</span></div><b>{item.value}</b><p>{item.interpretation}</p></article>)}</div></div>
    <div className="stock-tech-block"><h3>四、筹码与数据边界</h3><div className={`chip-panel ${chip.status==='data_insufficient'?'missing':''}`}><div><small>平均成本</small><strong>{Number.isFinite(chip.averageCost)?chip.averageCost.toFixed(2):'数据不足'}</strong></div><div><small>获利比例</small><strong>{Number.isFinite(chip.winnerRate)?`${chip.winnerRate.toFixed(2)}%`:'数据不足'}</strong></div><div><small>90%集中度</small><strong>{Number.isFinite(chip.concentration90)?chip.concentration90.toFixed(2):'数据不足'}</strong></div><p>{chip.note}</p></div></div>
    <div className="stock-tech-block signal-block"><h3>五、多空信号与直白结论</h3><div><section><strong>多头信号</strong>{detail.signals?.bull?.map((item,i)=><p key={item}><b>0{i+1}</b>{item}</p>)}</section><section><strong>风险信号</strong>{detail.signals?.risk?.map((item,i)=><p key={item}><b>0{i+1}</b>{item}</p>)}</section></div></div>
  </div>
}

function Technical({ data={} }) {
  const levelFrom = (text, words) => { for (const word of words) { const match=text?.match(new RegExp(`${word}[^0-9]*(\\d+(?:\\.\\d+)?)`)); if (match) return Number(match[1]) } }
  const levels = [{label:'触发位',value:levelFrom(data.trigger,['突破','站上','等待']),tone:'trigger'},{label:'失效位',value:levelFrom(data.invalidation,['跌破','失效']),tone:'invalidation'}]
  return <><StockTechnicalDetail data={data}/><PlainTechnicalReadout data={data}/><div className="technical-grid"><div className="chart-panel"><div className="chart-toolbar"><div><strong>{data.instrument}</strong><span>{data.timeframe}{data.ohlc?.length?'':' · 收盘线'}</span></div><div className="ma-legend">{[[5,'#e85d3f'],[10,'#d99a2b'],[20,'#8c63c7'],[60,'#2f80c9'],[90,'#25a59a'],[145,'#586473']].map(([period,color])=><span key={period} style={{color}}><i/>MA{period}</span>)}</div></div><PriceChart prices={data.prices} volumes={data.volumes} ohlc={data.ohlc} levels={levels}/></div>
    <div className="tech-analysis"><div className="trade-rating"><small>左侧交易评级</small><strong>{data.rating}</strong><span>风险收益比 {data.riskReward}</span></div><dl>
      {[['趋势',data.trend],['量能',data.volume],['波浪',data.wave],['斐波那契',data.fibonacci],['缠论',data.chan]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl><div className="trade-level"><span><small>触发条件</small>{data.trigger}</span><span><small>失效条件</small>{data.invalidation}</span></div></div></div><VolumeMatrix data={data}/></>
}

function Scenarios({ scenarios=[], risks=[] }) {
  return <div className="scenario-risk"><div className="scenario-list">{scenarios.map(s=><div key={s.name}><strong>{s.name}<em>{s.weight}</em></strong><p>{s.assumption}</p><small>{s.signal}</small></div>)}</div><div className="risk-list"><h3>主要风险</h3>{risks.map((risk,i)=><div key={risk}><span>0{i+1}</span><p>{risk}</p></div>)}</div></div>
}

const articleLinks = [
  ['trade','交易结论'],['decision','决策总览'],['weekly','本周变化'],['prosperity','景气度'],['supply','供需关系'],['research','市场研报'],['summary','摘要'],['cycle','周期阶段'],['conditions','反转条件'],['metrics','真实数据'],
  ['chain','产业链'],['companies','公司筛选'],['valuation','估值情景'],['technical','技术面'],['actions','执行风控'],['scenarios','情景风险']
]

function ArticleNav({ readingLarge, setReadingLarge }) {
  return <aside className="article-nav"><strong>目录</strong><nav>{articleLinks.map(([id,label],index)=><a key={id} href={`#${id}`}><span>{index+1}</span>{label}</a>)}</nav><div className="reading-controls"><small>阅读字号</small><button className={!readingLarge?'active':''} onClick={()=>setReadingLarge(false)} aria-label="标准字号">A</button><button className={readingLarge?'active':''} onClick={()=>setReadingLarge(true)} aria-label="大字号">A+</button></div></aside>
}

function ReportView({ report, readingLarge, setReadingLarge }) {
  if (!report) return <main className="loading-screen">正在读取报告…</main>
  const stock=isStockReport(report)
  return <main className={`main ${readingLarge?'reading-large':''}`}>
    <header className="topbar"><div><h1>{report.industry}</h1><span className={`category-tag ${report.category}`}>{categoryName[report.category]}</span></div><div className="report-meta"><span>数据截止 <strong>{report.asOf}</strong></span><span>最后更新 <strong>{new Date(report.updatedAt).toLocaleString('zh-CN',{hour12:false})}</strong></span></div></header>
    <div className="report-layout"><div className="content">
      <Section id="trade" title={stock?'是否可以介入':'是否可以交易'} action="结论 · 理由 · 操作"><TradeDecision report={report}/></Section>
      <DataGaps items={report.dataGaps}/>
      {report.decisionOverview&&<Section id="decision" title="投资决策总览" action="产业 · 估值 · 技术 · 执行"><DecisionOverview data={report.decisionOverview}/></Section>}
      {report.weeklyChanges&&<Section id="weekly" title="与上周相比" action={report.weeklyChanges.period}><WeeklyChanges data={report.weeklyChanges}/></Section>}
      <Section id="prosperity" title={stock?'公司基本面状态':'行业景气度'} action="报告第一判断"><Prosperity data={report.prosperity} label={stock?'公司状态':'行业景气度'}/></Section>
      {report.supplyDemand&&<Section id="supply" title="供需关系" action="需求 · 供给 · 库存 · 价格 · 利润"><SupplyDemand data={report.supplyDemand}/></Section>}
      {report.marketResearch&&<Section id="research" title={stock?'公告、监管与消息面':'行业研报与行业温度'} action={stock?'事实 · 影响 · 预期差':'行业共识 · 分歧 · 盈利预期'}><MarketResearch data={report.marketResearch} stock={stock}/></Section>}
      <Section id="summary" title="执行摘要"><Executive summary={report.summary}/></Section>
      <Section id="cycle" title="周期阶段" action={`当前 · ${report.cycle?.current}`}><CycleTrack cycle={report.cycle}/></Section>
      <Section id="conditions" title="反转条件" action={`${report.reversalConditions?.length||0} 项监测`}><Conditions items={report.reversalConditions}/></Section>
      {report.metrics?.length>0&&<Section id="metrics" title="真实数据" action={`截至 ${report.asOf}`}><Metrics items={report.metrics}/></Section>}
      {report.industryChain?.length>0&&<Section id="chain" title="产业链"><Chain items={report.industryChain}/></Section>}
      {report.companyComparison?.length>0&&<Section id="companies" title={stock?'同行估值与经营比较':'公司横向比较'} action="分层而非无条件荐股"><CompanyComparison items={report.companyComparison}/></Section>}
      {report.valuationScenarios?.length>0&&<Section id="valuation" title="盈利与估值情景" action="假设公开可验证"><ValuationScenarios items={report.valuationScenarios}/></Section>}
      {report.technical&&<Section id="technical" title="技术面"><Technical data={report.technical}/></Section>}
      {(report.catalysts?.length||report.executionPlan||report.bearCase?.length)&&<Section id="actions" title="催化剂、执行与风控"><DecisionActions catalysts={report.catalysts} execution={report.executionPlan} bearCase={report.bearCase} evidence={report.evidenceQuality}/></Section>}
      {(report.scenarios?.length||report.risks?.length)&&<Section id="scenarios" title="情景推演与风险"><Scenarios scenarios={report.scenarios} risks={report.risks}/></Section>}
      {report.sources?.length>0&&<footer className="sources"><strong>数据说明</strong>{report.sources.map((s,i)=><span key={i}>{s}</span>)}</footer>}
    </div><ArticleNav readingLarge={readingLarge} setReadingLarge={setReadingLarge}/>
    </div>
  </main>
}

export default function App() {
  const [reports,setReports]=useState([]), [errors,setErrors]=useState([]), [selected,setSelected]=useState('')
  const [query,setQuery]=useState(''), [filter,setFilter]=useState('all'), [reportType,setReportType]=useState('sector'), [online,setOnline]=useState(false), [updated,setUpdated]=useState(0)
  const [readingLarge,setReadingLarge]=useState(()=>localStorage.getItem('reading-size')==='large')
  const load = async () => { const res=await fetch('/api/reports'); const data=await res.json(), next=data.reports||[]; setReports(next); setErrors(data.errors||[]); setSelected(value=>next.some(r=>r.id===value)?value:(next.find(r=>!isStockReport(r))?.id||next[0]?.id||'')); setUpdated(Date.now()) }
  useEffect(()=>{ load().catch(()=>setOnline(false)); const events=new EventSource('/api/events'); events.addEventListener('connected',()=>setOnline(true)); events.addEventListener('reports-updated',()=>load()); events.onerror=()=>setOnline(false); return()=>events.close() },[])
  const report=useMemo(()=>reports.find(r=>r.id===selected),[reports,selected])
  const changeReportType=type=>{setReportType(type);setFilter('all');setQuery('');setSelected(reports.find(r=>type==='stock'?isStockReport(r):!isStockReport(r))?.id||'')}
  useEffect(()=>{localStorage.setItem('reading-size',readingLarge?'large':'standard')},[readingLarge])
  return <div className="app-shell"><Sidebar reports={reports} selected={selected} onSelect={setSelected} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} reportType={reportType} onTypeChange={changeReportType}/><ReportView key={report?.id||'loading'} report={report} readingLarge={readingLarge} setReadingLarge={setReadingLarge}/><div className={`live-status ${online?'online':''}`}><span/>{online?'实时同步':'正在重连'}<small>{updated?new Date(updated).toLocaleTimeString('zh-CN',{hour12:false}):''}</small></div>{errors.length>0&&<div className="error-toast"><Icon name="alert"/><div><strong>{errors.length} 个报告未载入</strong><span>{errors[0].file} · {errors[0].message}</span></div></div>}</div>
}
