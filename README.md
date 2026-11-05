# 大模型排行榜

一个纯静态的大模型对比站点：数据驱动、可公开访问、可由 Agent 定期更新。

## 快速开始

```bash
npm install
npm run check     # 校验 + 测试 + 构建
npm run serve     # 本地预览 http://localhost:4173/
```

打开 `http://localhost:4173/` 即可查看站点。

## 功能

- **排行榜总表**：按综合分、单项基准、价格、上下文长度、发布日期、名称排序；按厂商与开源/闭源筛选；关键词搜索。
- **可视化**：基准分数横向条形图（可切换基准）、价格与性能散点图（悬停显示模型名）、开源/闭源占比图。
- **详情视图**：点击「查看详情」或按 Enter 打开弹窗，展示全部字段与来源链接。
- **可访问性**：移动端适配、WCAG AA 对比度、图表提供文字替代表格、全部交互支持键盘（Tab / Enter / Escape）。
- **空值处理**：未核实字段一律显示「暂无数据」，不显示 0 或 NaN。

## 项目结构

```
data/
  models.json        模型记录（唯一数据源）
  benchmarks.json    基准定义（单位与方向）
  schema.json        JSON Schema
src/
  index.html         页面结构
  styles.css         样式（高对比配色）
  app.js             页面逻辑
  core.js            排序/筛选/空值显示（浏览器与测试共用）
  vendor/echarts.min.js
scripts/
  validate.js        数据校验
  build.js           构建 dist/
  serve.js           本地预览服务器
  add-model.js       新增模型模板
test/                核心逻辑与校验脚本测试
dist/                构建产物（不提交）
```

## 技术栈与版本

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20 | 校验、测试与构建脚本运行环境 |
| Apache ECharts | 6.1.0 | 图表库，本地 vendored，精确版本 |
| ajv | 8.20.0 | JSON Schema 校验 |
| ajv-formats | 3.0.1 | 日期与 URI 格式校验 |
| eslint | 10.14.0 | 代码检查 |

所有依赖均锁定精确版本，不使用开放区间。构建期无需网络：ECharts 已 vendored 到 `src/vendor/`。

## 更新数据

**新增模型只需在 `data/models.json` 的 `models` 数组中追加一条记录，不需要改动任何页面代码。**

快速生成模板：

```bash
node scripts/add-model.js --id my-model --name "My Model" \
  --vendor "MyVendor" --release-date 2026-01-01 --license proprietary --context 1000000
```

模板会把未核实的字段留为 `null`，随后需要打开官方页面填写真实值与来源。

更新流程与来源要求详见 `AGENTS.md`，要点：

1. 数据只能来自厂商官方页面或公开榜单原始页面，必须先打开页面核实；
2. 找不到可靠来源的字段填 `null` 并在 `notes` 说明，不得估算；
3. 刷新 `retrieved_at` 与 `last_updated`；
4. 数值变化记录到 `CHANGELOG.md`；
5. 运行 `npm run check` 通过后，在新分支提交并开 Pull Request。

## 部署

### GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`，推送后在 GitHub 仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源即可自动部署。工作流会在 `main` 分支推送时执行 `npm run check` 并发布 `dist/`。

### 手动部署

```bash
npm run build
# 将 dist/ 目录上传到任意静态托管（Netlify / Vercel / Nginx / 对象存储）
```

`dist/` 是纯静态产物，不依赖任何服务端运行时。

### 本地静态服务

```bash
npm run build && npm run serve
```

## 数据来源

所有数据的来源链接都记录在每条模型记录的 `sources` 字段中，可在页面详情弹窗查看。主要来源包括：

- 各厂商官方模型页与 API 定价页（OpenAI、Anthropic、Google、Meta、Mistral AI、DeepSeek、Alibaba Cloud、xAI、Z AI）；
- Artificial Analysis 的 Intelligence Index 与模型页面；
- LMArena 公开榜单；
- 开源权重模型的官方 Hugging Face 模型卡。

页面底部「数据来源说明」与每条记录的详情弹窗都列出来源 URL 与采集日期。数据可能存在延迟，以采集时页面显示为准。

## 环境变量

本项目的更新流程不需要任何 API Key。`serve.js` 支持以下可选变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | 本地预览端口 |
| `RETRIEVED_AT` | 运行时系统日期 | 覆盖 `build-data.js` 写入的采集日期 |

如未来引入需要凭据的抓取脚本，只允许从环境变量读取，不得写入仓库。

## 脚本

| 命令 | 作用 |
| --- | --- |
| `npm run validate` | 校验 schema、id 唯一性、URL、日期、数值范围与密钥 |
| `npm test` | 运行核心逻辑与校验脚本测试 |
| `npm run build` | 校验后生成 `dist/` |
| `npm run serve` | 本地预览（端口 4173） |
| `npm run add-model` | 生成符合 schema 的新模型模板 |
| `npm run check` | validate + test + build |

## 许可与限制

页面数据按各来源的公开条款使用。本站为纯静态站点，不收集访问者信息，不设置 Cookie。
