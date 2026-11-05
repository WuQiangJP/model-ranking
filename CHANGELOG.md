# CHANGELOG

本文件记录数据数值的变更。按时间倒序排列。

## 2026-11-05

### 初始数据集

建立初始数据集，共 22 个模型，覆盖 9 个厂商。所有数值均来自采集时打开的官方页面或公开榜单原始页面。

新增模型记录：

| 模型 | 厂商 | 主要来源 |
| --- | --- | --- |
| GPT-6 Astra | OpenAI | OpenAI API 文档、Artificial Analysis |
| GPT-6.1 Sol | OpenAI | OpenAI API 文档、Artificial Analysis |
| GPT-6 Luna | OpenAI | OpenAI API 文档、Artificial Analysis |
| Claude Opus 5.5 | Anthropic | Anthropic 文档、Artificial Analysis |
| Claude Sonnet 5.5 | Anthropic | Anthropic 文档、Artificial Analysis |
| Claude Fable 5.1 | Anthropic | Anthropic 文档、Artificial Analysis |
| Claude Haiku 5.5 | Anthropic | Anthropic 文档、Artificial Analysis |
| Gemini 4 Carbon | Google | Google AI 定价页、Artificial Analysis |
| Gemini 4 Argon | Google | Google AI 定价页、Artificial Analysis |
| Gemini 3.8 Flash | Google | Google AI 定价页、Artificial Analysis |
| Llama 4 Scout | Meta | Meta Llama 4 页面、Hugging Face 模型卡 |
| Llama 4 Maverick | Meta | Meta Llama 4 页面、Hugging Face 模型卡 |
| Muse Wonder | Meta | Artificial Analysis |
| Mistral Large 4 | Mistral AI | Mistral 定价页、Artificial Analysis |
| Mistral Large 3 | Mistral AI | Mistral 定价页、Hugging Face 模型卡 |
| Mistral Small 4 | Mistral AI | Mistral 定价页、Artificial Analysis |
| DeepSeek V4.1 Flash 1017 | DeepSeek | DeepSeek 官方定价页、Artificial Analysis |
| DeepSeek V4 Pro 0813 | DeepSeek | DeepSeek 官方定价页、Artificial Analysis |
| GLM-5.3 | Z AI | Mistral 平台代售页、Hugging Face 模型卡 |
| Grok 4.7 | SpaceXAI | SpaceXAI 文档、Artificial Analysis |
| Qwen3-235B-A22B | Alibaba Cloud | Qwen 官方博客、GitHub 仓库 |
| Qwen3-30B-A3B | Alibaba Cloud | Qwen 官方博客、GitHub 仓库 |

### 价格口径说明

- DeepSeek 系列：官方定价页区分高峰与非高峰时段，本数据集统一采用**高峰时段**价格，非高峰价格更低，已在各记录的 `pricing.notes` 中说明。
- Gemini 4 Carbon：官方定价页注明 2026-12-01 起输入降至 $2、输出降至 $10；本记录按采集日有效的 $4 / $20 填写。
- Gemini 3.8 Flash：官方定价页注明 2026-12-31 起价格翻倍；本记录按采集日有效价格填写。
- Grok 4.7：超过 200K 上下文的部分按更高费率计费，未计入本记录的单价。
- Llama 4 Scout / Maverick、Muse Wonder、GLM-5.3：厂商未公布官方 API 单价，价格取自 Artificial Analysis 汇总的托管均价，已在 `pricing.notes` 中说明来源口径。

### 未核实字段

以下字段因未找到可靠公开来源而填 `null`，未做估算：

| 模型 | 未核实字段 |
| --- | --- |
| Qwen3-235B-A22B | 价格、全部基准分 |
| Qwen3-30B-A3B | 价格、全部基准分 |
| Claude Haiku 5.5 | 智能指数 |
| Mistral Large 3 | 智能指数 |
| Llama 4 Scout / Maverick | 智能指数 |
| Muse Wonder | 缓存输入价格、官方许可证文本 |
| 全部模型 | AA-Briefcase Elo（公开页面未给出可读数值） |

## 2026-11-05（验证记录）

### 新增模型流程演示

为验证「新增一条数据记录即可显示」，临时追加测试记录 `test-model-001`（厂商 TestVendor，MIT，上下文 200K）。

- 校验通过（23 个模型）；
- 构建成功后页面显示 23 个模型，厂商筛选出现 TestVendor，详情弹窗正常；
- **验收完成后已撤回**，数据集恢复为 22 个模型，`test-model-001` 不再存在。
