import { EventEmitter } from 'node:events'
import { promises as fs, watch as fsWatch } from 'node:fs'
import path from 'node:path'

const required = ['id', 'industry', 'category', 'asOf', 'updatedAt', 'summary', 'cycle', 'reversalConditions']

export function validateReport(report) {
  const errors = []
  if (!report || typeof report !== 'object' || Array.isArray(report)) return ['报告必须是 JSON 对象']
  for (const key of required) if (!(key in report)) errors.push(`缺少必填字段: ${key}`)
  if (report.id && !/^[a-z0-9-]+$/.test(report.id)) errors.push('id 只能包含小写字母、数字和连字符')
  if (report.category && !['cycle', 'growth', 'mixed'].includes(report.category)) errors.push('category 必须为 cycle、growth 或 mixed')
  if (report.decisionLevel && !['no_trade','data_insufficient','wait_trigger','trial','add'].includes(report.decisionLevel)) errors.push('decisionLevel 不是有效交易等级')
  if (report.reversalConditions && !Array.isArray(report.reversalConditions)) errors.push('reversalConditions 必须是数组')
  if (report.metrics && !Array.isArray(report.metrics)) errors.push('metrics 必须是数组')
  if (report.supplyDemand && typeof report.supplyDemand !== 'object') errors.push('supplyDemand 必须是对象')
  if (report.marketResearch && typeof report.marketResearch !== 'object') errors.push('marketResearch 必须是对象')
  return errors
}

export class ReportStore extends EventEmitter {
  constructor(directory) {
    super()
    this.directory = directory
    this.reports = new Map()
    this.errors = []
    this.watcher = null
    this.timer = null
  }

  async scan() {
    await fs.mkdir(this.directory, { recursive: true })
    const files = (await fs.readdir(this.directory)).filter((file) => file.endsWith('.json'))
    const next = new Map()
    const errors = []
    for (const file of files) {
      try {
        const parsed = JSON.parse(await fs.readFile(path.join(this.directory, file), 'utf8'))
        const validation = validateReport(parsed)
        if (validation.length) throw new Error(validation.join('；'))
        next.set(parsed.id, { ...parsed, _file: file })
      } catch (error) {
        errors.push({ file, message: error.message })
      }
    }
    this.reports = next
    this.errors = errors
    this.emit('updated', this.snapshot())
    return this.snapshot()
  }

  snapshot() {
    const reports = [...this.reports.values()]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(({ _file, ...report }) => report)
    return { reports, errors: this.errors }
  }

  get(id) {
    const report = this.reports.get(id)
    if (!report) return null
    const { _file, ...clean } = report
    return clean
  }

  watch() {
    if (this.watcher) return
    this.watcher = fsWatch(this.directory, () => {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.scan().catch((error) => this.emit('error', error)), 120)
    })
  }

  close() {
    clearTimeout(this.timer)
    this.watcher?.close()
    this.watcher = null
  }
}
