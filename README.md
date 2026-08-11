# 周期信号 · 行业研究终端

一个面向 A 股行业研究的本地可视化网站。报告以 JSON 文件保存，网站自动读取并动态展示行业景气度、供需关系、周期位置、反转条件、公司比较、估值、研报共识和技术面交易计划。

项目默认附带猪周期、游戏、医美、白酒、旅游酒店、光模块和 MLCC 七份示例研究报告。报告仅用于研究与信息展示，不构成投资建议。

## 主要功能

- 最前方直接展示是否具备交易条件、触发价格、量能要求、加仓条件和失效位
- 行业景气度、周期阶段与反转条件跟踪
- 供给、需求、库存、价格和利润的交叉验证
- 代表公司财务、估值和产业链暴露比较
- 真实前复权 OHLCV 行情与板块等权篮子
- 5、10、20、60、90、145 日均线及量能分析
- K 线悬停价格、最近 50 个交易日窗口和左侧拖动缩放
- 波浪理论、斐波那契、缠论及通俗技术面解读
- 行业研报共性、差异和整合结论
- 监控 `data/reports/`，JSON 更新后网页自动刷新

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 可选：Python 3.10+（仅运行部分行业报告生成脚本时需要）
- 可选：Tushare Pro Token（仅更新真实行情、财务和研报数据时需要）

## 安装依赖

```bash
git clone https://github.com/wangdaokeaiduo/industry-research-dashboard.git
cd industry-research-dashboard
npm install
```

无需 Tushare Token 也可以直接打开仓库内已有的报告。

## 启动网站

开发模式：

```bash
npm run dev
```

打开 `http://localhost:5173`。

生产模式：

```bash
npm run build
npm start
```

打开 `http://localhost:4173`。

## 配置真实数据更新

复制环境变量模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```dotenv
TUSHARE_TOKEN=你的_Tushare_Pro_Token
```

`.env.local` 已被 Git 忽略，不会上传到仓库。请勿把真实 Token 写入源码或提交记录。

常用数据命令：

```bash
# 同步可用的行业研报与盈利预测
npm run research:sync

# 重新生成光模块报告
npm run report:optical

# 重新生成 MLCC 报告
npm run report:mlcc

# 把全部 JSON 报告同步生成为 Markdown
npm run reports:docs
```

不同 Tushare 接口存在积分、权限和调用频率要求。接口不可用时，程序会尽量保留上一次有效数据；报告中也应明确标注数据缺口。

## 安装行业研究 Skill

仓库同时包含符合 Codex Skill 目录规范的 [`industry-cycle-trading-research`](skills/industry-cycle-trading-research/SKILL.md)：

```text
skills/industry-cycle-trading-research/
├── SKILL.md
├── agents/openai.yaml
├── references/
└── scripts/analyze_ohlcv.py
```

安装到个人 Codex Skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R skills/industry-cycle-trading-research ~/.codex/skills/
```

重新打开 Codex 任务后，可以明确调用：

```text
使用 $industry-cycle-trading-research 调研 MLCC 板块，并生成网站兼容的完整行业报告。
```

该 Skill 强制要求真实可追溯数据、行业景气判断、供需证据链、反转条件、行业研报共性与分歧、真实 OHLCV、多周期技术分析，以及明确的触发位、量能条件和失效位。

## 导入自己的行业报告

把 UTF-8 JSON 文件放入 `data/reports/` 即可，运行中的网站会自动加载。最小结构：

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

完整字段参见 [`data/report.schema.json`](data/report.schema.json)，写入规范参见 [`REPORT_FORMAT.md`](REPORT_FORMAT.md)。推荐先写临时文件，完成后再原子重命名为 `.json`，避免网站读取到未写完的数据。

## 测试与构建

```bash
npm test
npm run build
```

## 项目结构

```text
src/                  React 页面、交互式 K 线与样式
data/reports/         网站直接读取的行业 JSON 报告
docs/reports/         自动生成的 Markdown 报告
scripts/              数据同步和行业报告生成脚本
lib/                  报告读取、校验与热更新逻辑
tests/                Node 测试
assets/design/        页面设计稿与视觉验证截图
server.mjs            本地 API、静态站点和报告监听服务
```

## 数据口径与免责声明

- 行情和财务数据需核对数据源、复权方式、截至日期及样本成分。
- 板块篮子可能包含产业链公司，不等同于交易所正式行业指数。
- 技术分析是概率判断，触发位与失效位不能保证收益。
- 公开研报摘要不能替代原始研报全文和公司公告。
- 本项目不构成证券投资咨询、收益承诺或买卖建议，使用者应独立决策并承担风险。

## License

当前仓库未附加开源许可证。代码公开可见不等于自动授予复制、修改或商业使用权；如需复用，请先联系仓库所有者。
