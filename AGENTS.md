# AGENTS.md — 大模型排行榜项目规范

本文件是本项目 AI Agent 的唯一规范来源。进入项目后先读本文，再读 `README.md`（面向使用者）与 `ROADMAP.md`（进度状态）。

## 项目定位

一个纯静态的「大模型排行榜」站点，面向普通访问者展示主流大模型的排名与对比。数据可由 Agent 定期更新，新增模型只需添加一条数据记录，不改动页面代码。

## 核心目录

| 路径 | 职责 |
| --- | --- |
| `data/models.json` | 模型记录，站点的唯一数据源。页面不写死任何模型信息。 |
| `data/benchmarks.json` | 基准定义（单位、方向、来源），供校验与页面渲染使用。 |
| `data/schema.json` | JSON Schema 2020-12，校验 `data/models.json`。 |
| `src/` | 页面源码：`index.html`、`styles.css`、`app.js`、`core.js`、`vendor/`。 |
| `scripts/` | 校验、构建、预览、新增模型辅助脚本。 |
| `test/` | Node 内置测试，覆盖核心逻辑与校验脚本。 |
| `dist/` | 构建产物，纯静态，可直接部署。不提交到 Git。 |
| `ROADMAP.md` | 项目状态快照，每次影响状态的变更后更新。 |
| `CHANGELOG.md` | 数据数值变更记录。 |

## 命令

```bash
npm install            # 安装依赖（ajv / ajv-formats / eslint，均锁定精确版本）
npm run validate       # 校验数据：schema、id 唯一性、URL、日期、数值范围、密钥扫描
npm test               # 运行测试（node --test）
npm run build          # 校验通过后生成 dist/
npm run serve          # 本地预览（仅开发用，端口 4173）
npm run add-model      # 生成符合 schema 的新模型模板记录
npm run check          # validate + test + build 一次跑完
```

校验失败时 `validate` 与 `build` 都会以非零退出码退出，可用于 CI。

## 数据更新规则（必须遵守）

### 来源要求

数据只能来自权威公开来源，按优先级：

1. 模型厂商官方发布页、官方 API 定价页、官方文档、官方技术报告；
2. 公开榜单的原始页面（如 Artificial Analysis、LMArena）；
3. 开源权重模型的官方模型卡（Hugging Face / ModelScope 官方账号）。

**必须先打开来源页面读取内容，不得凭记忆填写分数、价格、上下文长度或发布日期。** 每条记录的 `sources` 必须指向实际打开并读过的页面，并填写采集日期。

### 缺失值处理

- 找不到可靠来源的字段一律填 `null`，并在 `notes` 中说明原因。
- **不得估算，不得复制未经核实的二手数据。** 第三方聚合站（如各类「价格汇总」站）不作为价格来源。
- 页面会把 `null` 显示为「暂无数据」，不会显示 0 或 NaN。

### 时间与变更

- 每次更新都要刷新该记录的 `last_updated` 与所有 `sources[].retrieved_at`（使用运行时系统日期）。
- 不删除历史来源记录。新增来源时追加，不覆盖。
- 数值发生变化时，在 `CHANGELOG.md` 中记录：日期、模型、字段、旧值、新值、来源 URL。

### 新增基准

如需新增一个基准维度：

1. 在 `data/benchmarks.json` 的 `benchmarks` 数组中追加定义（key、name、unit、direction、higher_is_better、description、source_name、source_url）；
2. 同步更新 `data/models.json` 内嵌的 `benchmarks` 白名单（两处必须一致）；
3. 在模型记录的 `benchmarks` 对象中加入该键；
4. 运行 `npm run validate` 与 `npm run build`。

### 访问限制

来源需要登录或有访问限制时，记录限制并降级处理：

- 在 `notes` 中写明「来源需要登录，未能核实」；
- 相关字段填 `null`；
- **不要绕过访问控制，不要使用他人凭据。**

## 校验规则

`npm run validate` 会检查：

1. `data/models.json` 符合 `data/schema.json`；
2. `id` 全局唯一且符合 `^[a-z0-9]+(?:-[a-z0-9]+)*$`；
3. 模型的 `benchmarks` 键必须存在于 `benchmarks.json` 白名单；
4. `sources[].url` 为合法 http/https 绝对地址；
5. 所有日期为 `YYYY-MM-DD` 且为真实存在的日期；
6. 分数在 `[0, 10000]`，价格非负，上下文长度为正整数；
7. 仓库内不得出现疑似密钥（sk-、AKIA、ghp_、xox、AIza 等模式）。

## 提交规范

- 所有更新通过新分支提交，建议通过 Pull Request 合并，不直接推送到 `main`。
- Commit 信息使用中文，前缀 `data:`（数据更新）、`feat:`、`fix:`、`refactor:`、`docs:`、`chore:`。
- 描述必须说明改了什么、原因和影响，禁止使用「更新数据」这类泛化表述。
- 提交前必须运行 `npm run check` 并通过。
- 仓库中不得出现任何密钥。如更新脚本需要 API Key，只从环境变量读取（见 `README.md`）。

## 工程边界

- 不引入后端服务、数据库或构建期依赖注入。页面只读取静态 JSON。
- 不引入新的前端框架或图表库；图表固定使用 `src/vendor/echarts.min.js`（Apache ECharts 6.1.0，精确版本）。
- 不修改 `data/` 之外的业务逻辑来实现数据展示需求——页面应当是数据驱动的。
- 空值显示、排序、筛选逻辑集中在 `src/core.js`，测试覆盖，不要在 `app.js` 中重复实现。
- 公开站点部署为纯静态产物 `dist/`，不提交构建产物到仓库。

## 验收清单

每次数据更新后确认：

- [ ] `npm run validate` 通过；
- [ ] `npm test` 全部通过；
- [ ] `npm run build` 成功生成 `dist/`；
- [ ] 页面显示「数据最后更新时间」为本次采集日期；
- [ ] 抽查至少 3 条记录的字段与来源页面一致；
- [ ] 新增模型后页面无需改代码即可显示；
- [ ] `CHANGELOG.md` 已记录数值变更；
- [ ] `ROADMAP.md` 状态已更新。
