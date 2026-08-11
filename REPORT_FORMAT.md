# 报告投递格式

生成软件只需把 UTF-8 JSON 文件写入 `data/reports/`。网站会在文件创建或修改后自动刷新，不需要调用网页接口。

最稳妥的写入方式是先写入同目录临时文件，内容完整后再原子重命名为 `.json`，避免网站在文件尚未写完时读取。文件名可以自定义；报告唯一性由 JSON 内的 `id` 决定。

完整字段定义见 `data/report.schema.json`，可复制 `data/reports/pig-cycle.json` 作为模板。必填字段：

```json
{
  "id": "industry-id",
  "industry": "行业名称",
  "category": "cycle",
  "asOf": "2026-08-11",
  "updatedAt": "2026-08-11T12:00:00+08:00",
  "summary": {},
  "cycle": {},
  "reversalConditions": []
}
```

`category` 可取 `cycle`、`growth` 或 `mixed`。其他模块均可选；缺失模块不会显示。损坏文件会在页面右下角提示，但不会影响其他有效报告。

本地运行：

```bash
npm install
npm run dev
```

开发网址为 `http://localhost:5173`。生产运行：

```bash
npm run build
npm start
```

生产网址为 `http://localhost:4173`。
