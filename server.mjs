import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ReportStore } from './lib/report-store.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const dev = process.argv.includes('--dev')
const apiPort = dev ? 4174 : Number(process.env.PORT || 4173)
const clients = new Set()
const store = new ReportStore(path.join(root, 'data/reports'))
await store.scan()
store.watch()

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}

const serveStatic = async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  let target = path.resolve(root, 'dist', relative)
  if (!target.startsWith(path.resolve(root, 'dist'))) return json(response, 403, { error: 'forbidden' })
  try {
    const data = await fs.readFile(target)
    const ext = path.extname(target)
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
    response.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
    response.end(data)
  } catch {
    try {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(await fs.readFile(path.join(root, 'dist/index.html')))
    } catch { json(response, 404, { error: '先运行 npm run build' }) }
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/api/reports') return json(response, 200, store.snapshot())
  if (url.pathname.startsWith('/api/reports/')) {
    const report = store.get(decodeURIComponent(url.pathname.split('/').pop()))
    return report ? json(response, 200, report) : json(response, 404, { error: '报告不存在' })
  }
  if (url.pathname === '/api/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    response.write('event: connected\ndata: {}\n\n')
    clients.add(response)
    request.on('close', () => clients.delete(response))
    return
  }
  if (dev) return json(response, 404, { error: 'Vite 开发服务器负责前端资源' })
  return serveStatic(request, response)
})

store.on('updated', (payload) => {
  const message = `event: reports-updated\ndata: ${JSON.stringify({ count: payload.reports.length, errors: payload.errors.length })}\n\n`
  clients.forEach((client) => client.write(message))
})

const heartbeat = setInterval(() => clients.forEach((client) => client.write(': heartbeat\n\n')), 20000)
server.listen(apiPort, () => console.log(`${dev ? 'API' : '网站'}已启动: http://localhost:${apiPort}`))
const shutdown = () => { clearInterval(heartbeat); store.close(); server.close(() => process.exit(0)) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

if (dev) {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { port: 5173 } })
  await vite.listen()
  vite.printUrls()
}
