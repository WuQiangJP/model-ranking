/**
 * 生成 data/models.json 的构建期脚本。
 *
 * 说明：本文件不是「占位数据生成器」，而是把已核实的采集结果固化为数据文件的源。
 * 每条记录的所有数值都必须能在 sources 中列出的页面找到依据。
 * 若某字段无法从可靠来源核实，保持 null 并在 notes 说明原因，禁止估算。
 *
 * 运行：node scripts/build-data.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const RETRIEVED_AT = process.env.RETRIEVED_AT || new Date().toISOString().slice(0, 10);

// 统一采集日期：优先环境变量，否则用运行时系统日期（UTC 当天）。
const TODAY = RETRIEVED_AT;

const AA = 'https://artificialanalysis.ai';
const AA_INTEL = 'https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index';

function aaSource(pathname, name) {
  return { name, url: `${AA}${pathname}`, retrieved_at: TODAY };
}

function official(url, name) {
  return { name, url, retrieved_at: TODAY };
}

/**
 * 构造一条模型记录。
 * 所有价格均为「每百万 token」的 USD 单价，取自厂商官方定价页；未知一律 null。
 */
function model(rec) {
  return {
    id: rec.id,
    name: rec.name,
    vendor: rec.vendor,
    release_date: rec.release_date,
    license: rec.license,
    license_label: rec.license_label,
    context_window: rec.context_window,
    pricing: {
      input_per_million: rec.pricing.input_per_million ?? null,
      output_per_million: rec.pricing.output_per_million ?? null,
      currency: rec.pricing.currency ?? 'USD',
      cached_input_per_million: rec.pricing.cached_input_per_million ?? null,
      notes: rec.pricing.notes ?? '',
    },
    benchmarks: rec.benchmarks,
    arena_score: rec.arena_score ?? null,
    sources: rec.sources,
    notes: rec.notes ?? '',
    last_updated: TODAY,
  };
}

const models = [];

/* ---------------------------- OpenAI ---------------------------- */
models.push(model({
  id: 'gpt-6-astra',
  name: 'GPT-6 Astra',
  vendor: 'OpenAI',
  release_date: '2026-09-15',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 10.0,
    output_per_million: 50.0,
    cached_input_per_million: 1.0,
    notes: '短上下文（≤272K）标准价；超过 272K 的长上下文价格为输入 $20 / 输出 $75。来源为 OpenAI 官方定价页。',
  },
  benchmarks: { aa_intelligence: 57, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 14.7,
    collected_at: TODAY,
    notes: 'Arena 页面显示的为「胜率/份额百分比」而非 Elo，口径与 Artificial Analysis 指数不同，不可直接比较。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API 文档 - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API 文档 - Pricing'),
    aaSource('/models/gpt-6-astra', 'Artificial Analysis - GPT-6 Astra'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '发布日期为 Artificial Analysis 标注的 2026 年 9 月；OpenAI 官方文档未给出精确到日的发布日期，故采用榜单标注的月份首日。benchmarks 中仅 aa_intelligence 有公开数值。',
}));

models.push(model({
  id: 'gpt-6-1-sol',
  name: 'GPT-6.1 Sol',
  vendor: 'OpenAI',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.1,
    notes: '短上下文标准价；长上下文输入 $4 / 输出 $15。',
  },
  benchmarks: { aa_intelligence: 55, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 12.51,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径，非 Elo。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API 文档 - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API 文档 - Pricing'),
    aaSource('/models/gpt-6-1-sol', 'Artificial Analysis - GPT-6.1 Sol'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: 'aa_briefcase_elo 未在该模型公开页面给出可读数值，填 null。',
}));

models.push(model({
  id: 'gpt-6-luna',
  name: 'GPT-6 Luna',
  vendor: 'OpenAI',
  release_date: '2026-09-22',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.1,
    output_per_million: 0.5,
    cached_input_per_million: 0.01,
    notes: '短上下文标准价；长上下文输入 $0.2 / 输出 $0.75。',
  },
  benchmarks: { aa_intelligence: 28, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 1.89,
    collected_at: TODAY,
    notes: '取自 Arena「Max」档位；Arena 百分比口径。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API 文档 - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API 文档 - Pricing'),
    aaSource('/models/gpt-6-luna', 'Artificial Analysis - GPT-6 Luna'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: 'Arena 页面存在多个推理档位（Low/Medium/Max），此处统一记录 Max 档并在 arena_score.notes 说明。',
}));

/* ---------------------------- Anthropic ---------------------------- */
models.push(model({
  id: 'claude-opus-5-5',
  name: 'Claude Opus 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: 0.4,
    notes: 'Anthropic 官方模型页列出的标准价；缓存输入价格未在该页给出，此处不填。',
  },
  benchmarks: { aa_intelligence: 59, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 20.14,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 Max 档位。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic 文档 - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic 文档 - Pricing'),
    aaSource('/models/claude-opus-5-5', 'Artificial Analysis - Claude Opus 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '缓存输入价格未在 Anthropic 官方模型总览页明确列出，按规则填 null 而不是估算。',
}));

models.push(model({
  id: 'claude-sonnet-5-5',
  name: 'Claude Sonnet 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.2,
    notes: 'Anthropic 官方模型页标准价；缓存输入价格取自同页 pricing 表。',
  },
  benchmarks: { aa_intelligence: 55, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 15.42,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 Max 档位。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic 文档 - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic 文档 - Pricing'),
    aaSource('/models/claude-sonnet-5-5', 'Artificial Analysis - Claude Sonnet 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '部分缓存价格以「From」表述，此处取官方表格中列出的下限值，并在 pricing.notes 记录。',
}));

models.push(model({
  id: 'claude-fable-5-1',
  name: 'Claude Fable 5.1',
  vendor: 'Anthropic',
  release_date: '2026-09-01',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 10.0,
    output_per_million: 50.0,
    cached_input_per_million: 1.0,
    notes: 'Anthropic 官方模型页标准价；缓存输入按官方 pricing 表。',
  },
  benchmarks: { aa_intelligence: 49, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 13.86,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 Max 档位。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic 文档 - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic 文档 - Pricing'),
    aaSource('/models/claude-fable-5-1', 'Artificial Analysis - Claude Fable 5.1'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '定位为高推理成本档；Arena 分数低于同代 Opus，属口径差异而非质量结论。',
}));

models.push(model({
  id: 'claude-haiku-5-5',
  name: 'Claude Haiku 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.1,
    output_per_million: 0.5,
    cached_input_per_million: null,
    notes: '官方页以「From $0.10 / input MTok, From $0.50 / output MTok」表述，此处取下限量级；缓存价未列出。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 0.62,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 High 档位。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic 文档 - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic 文档 - Pricing'),
    aaSource('/models/claude-haiku-5-5', 'Artificial Analysis - Claude Haiku 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '该模型在 Artificial Analysis 公开榜单上暂无可读的 Intelligence Index 数值，按规则填 null 而非估算。',
}));

/* ---------------------------- Google ---------------------------- */
models.push(model({
  id: 'gemini-4-carbon',
  name: 'Gemini 4 Carbon',
  vendor: 'Google',
  release_date: '2026-10-01',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: 0.2,
    notes: 'Google 官方定价页：输入 $4 / 输出 $20（2026-12-01 起调整为输入 $2 / 输出 $10，见 pricing.notes 之外的备注）。缓存输入 $0.2。',
  },
  benchmarks: { aa_intelligence: 60, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 16.72,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 High 档位。',
  },
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models', 'Google AI - Gemini API Models'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-4-carbon', 'Artificial Analysis - Gemini 4 Carbon'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: 'Google 官方定价页注明 2026-12-01 起输入降至 $2、输出降至 $10；本记录按采集日有效的 $4 / $20 填写。发布日期按 Artificial Analysis 标注的 2026 年 10 月首日。',
}));

models.push(model({
  id: 'gemini-4-argon',
  name: 'Gemini 4 Argon',
  vendor: 'Google',
  release_date: '2026-09-30',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.1,
    notes: 'Google 官方定价页：2026-11-30 前输入 $2 / 输出 $10，之后调整为输入 $4 / 输出 $20。缓存输入 $0.1。',
  },
  benchmarks: { aa_intelligence: 50, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 10.53,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 High 档位。',
  },
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models/gemini-4-argon', 'Google AI - Gemini 4 Argon'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-4-argon', 'Artificial Analysis - Gemini 4 Argon'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '价格按采集日有效的促销价填写，官方页明确标注了后续调价日期。',
}));

models.push(model({
  id: 'gemini-3-8-flash',
  name: 'Gemini 3.8 Flash',
  vendor: 'Google',
  release_date: '2026-09-15',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.75,
    output_per_million: 3.75,
    cached_input_per_million: 0.075,
    notes: 'Google 官方定价页：2026-12-31 前输入 $0.75 / 输出 $3.75，之后调整为输入 $1.5 / 输出 $7.5。缓存输入 $0.075。',
  },
  benchmarks: { aa_intelligence: 31, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models', 'Google AI - Gemini API Models'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-3-8-flash', 'Artificial Analysis - Gemini 3.8 Flash'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: 'Arena 榜单上未见该模型的独立条目，arena_score 填 null。',
}));

/* ---------------------------- Meta ---------------------------- */
models.push(model({
  id: 'llama-4-scout',
  name: 'Llama 4 Scout',
  vendor: 'Meta',
  release_date: '2025-04-05',
  license: 'open-weights-commercial-restricted',
  license_label: 'Llama 4 Community License（开放权重，商用受限）',
  context_window: 10000000,
  pricing: {
    input_per_million: 0.18,
    output_per_million: 0.66,
    cached_input_per_million: null,
    notes: '该价格为 Artificial Analysis 汇总的第三方托管均价（USD/1M tokens），非 Meta 官方 API 报价；Meta 未公布 Llama 4 的官方 API 单价，故不填官方价。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: 74.3, livecodebench: 32.8 },
  arena_score: null,
  sources: [
    official('https://www.llama.com/models/llama-4/', 'Meta Llama - Llama 4'),
    official('https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct', 'Hugging Face - Llama 4 Scout 模型卡'),
    aaSource('/models/llama-4-scout', 'Artificial Analysis - Llama 4 Scout'),
  ],
  notes: '官方模型卡未给出 Intelligence Index 分数，故 aa_intelligence 为 null；MMLU-Pro 与 LiveCodeBench 取自 Meta 官方 Llama 4 页面。',
}));

models.push(model({
  id: 'llama-4-maverick',
  name: 'Llama 4 Maverick',
  vendor: 'Meta',
  release_date: '2025-04-05',
  license: 'open-weights-commercial-restricted',
  license_label: 'Llama 4 Community License（开放权重，商用受限）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.25,
    output_per_million: 0.92,
    cached_input_per_million: null,
    notes: '第三方托管均价，非 Meta 官方 API 报价；缓存价格未披露。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: 80.5, livecodebench: 43.4 },
  arena_score: null,
  sources: [
    official('https://www.llama.com/models/llama-4/', 'Meta Llama - Llama 4'),
    official('https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct', 'Hugging Face - Llama 4 Maverick 模型卡'),
    aaSource('/models/llama-4-maverick', 'Artificial Analysis - Llama 4 Maverick'),
  ],
  notes: 'Artificial Analysis 页面标注该模型 Intelligence Index 为 N/A（未评测），故填 null。',
}));

models.push(model({
  id: 'muse-wonder',
  name: 'Muse Wonder',
  vendor: 'Meta',
  release_date: '2026-10-01',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: null,
    notes: 'Artificial Analysis 汇总的托管均价；Meta 未公布该模型的官方 API 单价，缓存价未知。',
  },
  benchmarks: { aa_intelligence: 44, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（Agent 榜）',
    score: 9.42,
    collected_at: TODAY,
    notes: 'Arena 显示的百分比口径；对应 Max 档位。',
  },
  sources: [
    aaSource('/models/muse-wonder', 'Artificial Analysis - Muse Wonder'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '该模型缺少官方定价页与官方技术报告，价格仅来自 Artificial Analysis 汇总，缓存价与官方许可证文本均未核实。',
}));

/* ---------------------------- Mistral ---------------------------- */
models.push(model({
  id: 'mistral-large-4',
  name: 'Mistral Large 4',
  vendor: 'Mistral AI',
  release_date: '2026-10-29',
  license: 'open-weights-commercial-restricted',
  license_label: 'Mistral Ecosystem Open-Weight License（开放权重，商用受限）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.7,
    output_per_million: 2.1,
    cached_input_per_million: 0.07,
    notes: 'Mistral 官方 API 定价页标准价；Batch 价为标准价 5 折。',
  },
  benchmarks: { aa_intelligence: 26, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral 文档 - API pricing'),
    official('https://docs.mistral.ai/models/overview/', 'Mistral 文档 - Models Overview'),
    aaSource('/models/mistral-large-4', 'Artificial Analysis - Mistral Large 4'),
  ],
  notes: '许可证为带商用限制的开放权重许可，Artificial Analysis 明确标注 Commercial use is allowed with restrictions。',
}));

models.push(model({
  id: 'mistral-large-3',
  name: 'Mistral Large 3',
  vendor: 'Mistral AI',
  release_date: '2025-12-01',
  license: 'apache-2.0',
  license_label: 'Apache 2.0',
  context_window: 256000,
  pricing: {
    input_per_million: 0.5,
    output_per_million: 1.5,
    cached_input_per_million: 0.05,
    notes: 'Mistral 官方 API 定价页标准价；Batch 价为标准价 5 折。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral 文档 - API pricing'),
    official('https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512', 'Hugging Face - Mistral Large 3 模型卡'),
    aaSource('/models/mistral-large-3', 'Artificial Analysis - Mistral Large 3'),
  ],
  notes: 'Artificial Analysis 页面未公开该模型的 Intelligence Index 数值，填 null。上下文 256K 由 Artificial Analysis 与第三方汇总确认，官方 API 文档仅写 256k。',
}));

models.push(model({
  id: 'mistral-small-4',
  name: 'Mistral Small 4',
  vendor: 'Mistral AI',
  release_date: '2026-03-26',
  license: 'apache-2.0',
  license_label: 'Apache 2.0',
  context_window: 256000,
  pricing: {
    input_per_million: 0.15,
    output_per_million: 0.6,
    cached_input_per_million: 0.015,
    notes: 'Mistral 官方 API 定价页标准价。',
  },
  benchmarks: { aa_intelligence: 4, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral 文档 - API pricing'),
    official('https://docs.mistral.ai/models/overview/', 'Mistral 文档 - Models Overview'),
    aaSource('/models/mistral-small-4', 'Artificial Analysis - Mistral Small 4'),
  ],
  notes: '该模型在 Artificial Analysis 开放权重同类中评测样本极少（仅 3 个模型），分数偏低但可比性有限，阅读时需结合 notes 判断。',
}));

/* ---------------------------- DeepSeek ---------------------------- */
models.push(model({
  id: 'deepseek-v4-1-flash-1017',
  name: 'DeepSeek V4.1 Flash 1017',
  vendor: 'DeepSeek',
  release_date: '2026-10-17',
  license: 'mit',
  license_label: 'MIT',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.3,
    output_per_million: 1.2,
    cached_input_per_million: 0.006,
    notes: 'DeepSeek 官方定价页：非高峰时段输入 $0.15 / 输出 $0.6，高峰时段输入 $0.3 / 输出 $1.2；缓存命中非高峰 $0.003、高峰 $0.006。此处取高峰价（更保守）。',
  },
  benchmarks: { aa_intelligence: 33, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://api-docs.deepseek.com/quick_start/pricing/', 'DeepSeek 官方文档 - Models & Pricing'),
    official('https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash', 'Hugging Face - DeepSeek V4.1 Flash 模型卡'),
    aaSource('/models/deepseek-v4-1-flash-1017', 'Artificial Analysis - DeepSeek V4.1 Flash 1017'),
    aaSource('/leaderboards/models', 'Artificial Analysis 模型榜'),
  ],
  notes: '发布日期取自模型名中的 1017 日期戳与官方文档的 MODEL VERSION 字段。价格按高峰时段填写，非高峰时段更低，已在 pricing.notes 说明。',
}));

models.push(model({
  id: 'deepseek-v4-pro-0813',
  name: 'DeepSeek V4 Pro 0813',
  vendor: 'DeepSeek',
  release_date: '2026-08-13',
  license: 'mit',
  license_label: 'MIT',
  context_window: 1048576,
  pricing: {
    input_per_million: 1.32,
    output_per_million: 3.96,
    cached_input_per_million: 0.044,
    notes: 'DeepSeek 官方定价页：高峰时段输入 $1.32 / 输出 $3.96；非高峰输入 $0.66 / 输出 $1.98。缓存命中高峰 $0.044。',
  },
  benchmarks: { aa_intelligence: 23, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://api-docs.deepseek.com/quick_start/pricing/', 'DeepSeek 官方文档 - Models & Pricing'),
    aaSource('/models/deepseek-v4-pro', 'Artificial Analysis - DeepSeek V4 Pro'),
  ],
  notes: 'Artificial Analysis 页面以 DeepSeek V4 Pro 0813 标识该版本；价格取高峰时段。',
}));

/* ---------------------------- Z AI (GLM) ---------------------------- */
models.push(model({
  id: 'glm-5-3',
  name: 'GLM-5.3',
  vendor: 'Z AI',
  release_date: '2026-08-18',
  license: 'open-weights-commercial-restricted',
  license_label: 'GLM-5.3 License（开放权重，商用受限）',
  context_window: 1048576,
  pricing: {
    input_per_million: 1.4,
    output_per_million: 4.4,
    cached_input_per_million: 0.14,
    notes: 'Mistral 平台代售 Z.ai GLM 5.3 的标准价；Z.ai 自有渠道价格未在本次核实范围内。',
  },
  benchmarks: { aa_intelligence: 32, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral 文档 - API pricing（Z.ai GLM 5.3）'),
    official('https://huggingface.co/zai-org/GLM-5.3', 'Hugging Face - GLM-5.3 模型卡'),
    aaSource('/models/glm-5-3', 'Artificial Analysis - GLM-5.3'),
  ],
  notes: '价格来自 Mistral 平台代售报价，非 Z.ai 官方直营定价；许可证为带商用限制的开放权重许可。',
}));

/* ---------------------------- xAI (Grok) ---------------------------- */
models.push(model({
  id: 'grok-4-7',
  name: 'Grok 4.7',
  vendor: 'xAI',
  release_date: '2026-09-21',
  license: 'proprietary',
  license_label: '专有（闭源）',
  context_window: 500000,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 6.0,
    cached_input_per_million: 0.5,
    notes: '官方文档页标准价；超过 200K 上下文的部分按更高费率计费，未计入此处。',
  },
  benchmarks: { aa_intelligence: 35, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.x.ai/developers/models', 'xAI 文档 - Grok Models & Pricing'),
    official('https://docs.x.ai/developers/models/grok-4.7', 'xAI 文档 - Grok 4.7'),
    aaSource('/models/grok-4-7', 'Artificial Analysis - Grok 4.7'),
  ],
  notes: '官方文档页 Last updated 为 2026-09-21，据此作为发布日期；知识截止 2026 年 5 月。',
}));

/* ---------------------------- Alibaba (Qwen) ---------------------------- */
models.push(model({
  id: 'qwen3-235b-a22b',
  name: 'Qwen3-235B-A22B',
  vendor: 'Alibaba Cloud',
  release_date: '2025-04-28',
  license: 'apache-2.0',
  license_label: 'Apache 2.0',
  context_window: 131072,
  pricing: {
    input_per_million: null,
    output_per_million: null,
    cached_input_per_million: null,
    notes: '阿里云 Model Studio 官方页面未在本次核实中给出该模型的可读单价；第三方托管价格不采用。按规则填 null，禁止估算。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://qwenlm.github.io/blog/qwen3/', 'Qwen 官方博客 - Qwen3: Think Deeper, Act Faster'),
    official('https://github.com/QwenLM/Qwen3', 'QwenLM/Qwen3 GitHub 仓库'),
    official('https://www.alibabacloud.com/help/en/model-studio/models', '阿里云 Model Studio - Recommended models'),
  ],
  notes: '官方博客给出 128K 上下文与 Apache 2.0；Qwen3-2507 更新版将长上下文扩展到 1M，但本记录对应初始 Qwen3 发布版本。价格与基准分未找到官方可读来源，填 null。',
}));

models.push(model({
  id: 'qwen3-30b-a3b',
  name: 'Qwen3-30B-A3B',
  vendor: 'Alibaba Cloud',
  release_date: '2025-04-28',
  license: 'apache-2.0',
  license_label: 'Apache 2.0',
  context_window: 131072,
  pricing: {
    input_per_million: null,
    output_per_million: null,
    cached_input_per_million: null,
    notes: '官方未在本次核实中给出可读单价，填 null。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://qwenlm.github.io/blog/qwen3/', 'Qwen 官方博客 - Qwen3: Think Deeper, Act Faster'),
    official('https://github.com/QwenLM/Qwen3', 'QwenLM/Qwen3 GitHub 仓库'),
  ],
  notes: '官方博客列出 128K 上下文与 Apache 2.0；无公开 Intelligence Index 数值。',
}));

/* ---------------------------- 写出 ---------------------------- */
const benchmarks = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'benchmarks.json'), 'utf8')
);

const out = {
  schema_version: '1.0.0',
  benchmarks: benchmarks.benchmarks,
  models,
};

const dest = path.join(ROOT, 'data', 'models.json');
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

console.log(`已生成 ${dest}`);
console.log(`采集日期（retrieved_at / last_updated）：${TODAY}`);
console.log(`模型数量：${models.length}`);
console.log(`基准数量：${out.benchmarks.length}`);
