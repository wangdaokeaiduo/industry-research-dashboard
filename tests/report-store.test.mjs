import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ReportStore, validateReport } from '../lib/report-store.mjs'

const valid = {
  id: 'test-industry', industry: '测试行业', category: 'cycle', asOf: '2026-08-11',
  updatedAt: '2026-08-11T00:00:00Z', summary: { stage: '磨底' },
  cycle: { current: '磨底', stages: ['下行', '磨底'] }, reversalConditions: []
}

test('validates required report fields', () => {
  assert.deepEqual(validateReport(valid), [])
  assert.ok(validateReport({ id: 'Bad ID' }).length > 1)
})

test('loads valid reports and isolates invalid JSON', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'report-store-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  await fs.writeFile(path.join(directory, 'valid.json'), JSON.stringify(valid))
  await fs.writeFile(path.join(directory, 'broken.json'), '{ nope')
  const store = new ReportStore(directory)
  const snapshot = await store.scan()
  assert.equal(snapshot.reports.length, 1)
  assert.equal(snapshot.reports[0].industry, '测试行业')
  assert.equal(snapshot.errors.length, 1)
  assert.equal(snapshot.errors[0].file, 'broken.json')
})

test('reloads a changed report from disk', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'report-store-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const target = path.join(directory, 'report.json')
  await fs.writeFile(target, JSON.stringify(valid))
  const store = new ReportStore(directory)
  await store.scan()
  await fs.writeFile(target, JSON.stringify({ ...valid, summary: { stage: '复苏' } }))
  await store.scan()
  assert.equal(store.get(valid.id).summary.stage, '复苏')
})
