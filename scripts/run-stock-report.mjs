import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const {STOCK_CODE:code,STOCK_ID:id}=process.env
if(!code||!id) throw new Error('STOCK_CODE and STOCK_ID are required')
const env=await fs.readFile(path.join(root,'.env.local'),'utf8').catch(()=> '')
const token=process.env.TUSHARE_TOKEN||env.match(/^TUSHARE_TOKEN=(.+)$/m)?.[1]?.trim()
if(!token) throw new Error('TUSHARE_TOKEN is required')
const api=async(api_name,params,fields)=>{const body=await fetch('http://api.tushare.pro',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({api_name,token,params,fields})}).then(r=>r.json());if(body.code!==0)throw new Error(`${api_name}: ${body.msg}`);return {fields:body.data?.fields||[],items:body.data?.items||[]}}
const end=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}).replaceAll('-','')
const start=String(Number(end.slice(0,4))-1)+end.slice(4)
const probes=await Promise.all([
  api('daily',{ts_code:code,start_date:start,end_date:end},'trade_date,open,high,low,close,vol,amount'),
  api('income',{ts_code:code,start_date:String(Number(end.slice(0,4))-2)+'0101',end_date:end},'ann_date,end_date,total_revenue,n_income_attr_p'),
  api('forecast',{ts_code:code,start_date:String(Number(end.slice(0,4))-1)+'0101',end_date:end},'ann_date,end_date,type,p_change_min,p_change_max'),
  api('express',{ts_code:code,start_date:String(Number(end.slice(0,4))-1)+'0101',end_date:end},'ann_date,end_date,revenue,n_income')
])
const newest=p=>p.items.slice().sort((a,b)=>String(b[0]).localeCompare(String(a[0])))[0]||null
const input={code,latestDaily:newest(probes[0]),latestIncome:newest(probes[1]),latestForecast:newest(probes[2]),latestExpress:newest(probes[3]),pipelineVersion:2}
const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex')
const reportPath=path.join(root,`data/reports/${id}-stock.json`)
const existing=JSON.parse(await fs.readFile(reportPath,'utf8').catch(()=> 'null'))
if(process.env.FORCE_REPORT!=='1'&&existing?.generationFingerprint===fingerprint&&existing?.researchDepth==='full'){
  console.log(JSON.stringify({status:'skipped_duplicate',id,asOf:existing.asOf,researchDepth:existing.researchDepth,fingerprint:fingerprint.slice(0,12)},null,2))
  process.exit(0)
}
const scripts=['scripts/build-yixintang-report.mjs','scripts/enrich-stock-full-report.mjs',...process.argv.slice(2)]
for(const script of scripts){const run=spawnSync(process.execPath,[script],{cwd:root,env:process.env,stdio:'inherit'});if(run.status!==0)process.exit(run.status||1)}
const docs=spawnSync('npm',['run','reports:docs'],{cwd:root,env:process.env,stdio:'inherit'});if(docs.status!==0)process.exit(docs.status||1)
const report=JSON.parse(await fs.readFile(reportPath,'utf8'))
report.generationFingerprint=fingerprint
report.generationInputs=input
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:'generated',id,asOf:report.asOf,fingerprint:fingerprint.slice(0,12)},null,2))
