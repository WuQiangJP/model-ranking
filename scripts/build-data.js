/**
 * data/models.json を生成するビルド時スクリプト。
 *
 * 本ファイルは「プレースホルダー生成器」ではなく、確認済みの収集結果をデータファイルとして固化するソースである。
 * 各レコードのすべての数値は、sources に列挙されたページで根拠を確認できる必要がある。
 * 信頼できるソースから確認できない項目は null のままとし、notes に理由を記載する。推定は禁止する。
 *
 * 実行：node scripts/build-data.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
// 取得日は日本時間（Asia/Tokyo, UTC+9）を基準にする。toISOString() は UTC のため、
// JST の 00:00〜09:00 に実行すると前日の日付になり、日本ユーザーの取得日と一致しない。
function todayJST() {
  if (process.env.RETRIEVED_AT) return process.env.RETRIEVED_AT;
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
const RETRIEVED_AT = todayJST();

// 取得日を統一する：環境変数を優先し、なければ実行時のシステム日付（Asia/Tokyo 当日）を用いる。
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
 * モデルレコードを1件構築する。
 * 価格はすべて「100万トークンあたり」の USD 単価で、ベンダーの公式価格ページから取得したもの。不明は null。
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
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 10.0,
    output_per_million: 50.0,
    cached_input_per_million: 1.0,
    notes: '短いコンテキスト（272K 以下）の標準価格。272K を超えるロングコンテキストでは入力 $20 / 出力 $75。出典は OpenAI の公式価格ページ。',
  },
  benchmarks: { aa_intelligence: 57, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 14.7,
    collected_at: TODAY,
    notes: 'Arena のページに表示されるのは Elo ではなく「勝率／シェアのパーセンテージ」であり、Artificial Analysis の指数とは測定方法が異なるため、直接比較はできない。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API ドキュメント - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API ドキュメント - Pricing'),
    aaSource('/models/gpt-6-astra', 'Artificial Analysis - GPT-6 Astra'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'リリース日は Artificial Analysis が表示する 2026 年 9 月。OpenAI の公式ドキュメントには日単位のリリース日が記載されていないため、ランキング側の表示に基づき 2026-09-15 を採用した。benchmarks で公開されている数値は aa_intelligence のみ。',
}));

models.push(model({
  id: 'gpt-6-1-sol',
  name: 'GPT-6.1 Sol',
  vendor: 'OpenAI',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.1,
    notes: '短いコンテキストの標準価格。ロングコンテキストでは入力 $4 / 出力 $15。',
  },
  benchmarks: { aa_intelligence: 55, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 12.51,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示であり、Elo ではない。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API ドキュメント - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API ドキュメント - Pricing'),
    aaSource('/models/gpt-6-1-sol', 'Artificial Analysis - GPT-6.1 Sol'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'aa_briefcase_elo は当モデルの公開ページに読み取り可能な数値が記載されていないため、null とした。',
}));

models.push(model({
  id: 'gpt-6-luna',
  name: 'GPT-6 Luna',
  vendor: 'OpenAI',
  release_date: '2026-09-22',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.1,
    output_per_million: 0.5,
    cached_input_per_million: 0.01,
    notes: '短いコンテキストの標準価格。ロングコンテキストでは入力 $0.2 / 出力 $0.75。',
  },
  benchmarks: { aa_intelligence: 28, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 1.89,
    collected_at: TODAY,
    notes: 'Arena の「Max」推論設定から取得。Arena のパーセンテージ表示である。',
  },
  sources: [
    official('https://developers.openai.com/api/docs/models', 'OpenAI API ドキュメント - Models'),
    official('https://developers.openai.com/api/docs/pricing', 'OpenAI API ドキュメント - Pricing'),
    aaSource('/models/gpt-6-luna', 'Artificial Analysis - GPT-6 Luna'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'Arena のページには複数の推論設定（Low / Medium / Max）が存在する。ここでは Max 設定に統一して記録し、arena_score.notes に明記した。',
}));

/* ---------------------------- Anthropic ---------------------------- */
models.push(model({
  id: 'claude-opus-5-5',
  name: 'Claude Opus 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: 0.4,
    notes: 'Anthropic の公式モデルページに記載された標準価格。キャッシュ入力価格は当該ページに記載がないため、ここでは設定しない。',
  },
  benchmarks: { aa_intelligence: 59, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 20.14,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。Max 推論設定に対応。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic ドキュメント - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic ドキュメント - Pricing'),
    aaSource('/models/claude-opus-5-5', 'Artificial Analysis - Claude Opus 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'キャッシュ入力価格は Anthropic の公式モデル概要ページに明示的に記載されていないため、ルールに従い null とし、推定しなかった。',
}));

models.push(model({
  id: 'claude-sonnet-5-5',
  name: 'Claude Sonnet 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.2,
    notes: 'Anthropic の公式モデルページの標準価格。キャッシュ入力価格は同ページの pricing テーブルから取得した。',
  },
  benchmarks: { aa_intelligence: 55, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 15.42,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。Max 推論設定に対応。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic ドキュメント - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic ドキュメント - Pricing'),
    aaSource('/models/claude-sonnet-5-5', 'Artificial Analysis - Claude Sonnet 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: '一部のキャッシュ価格が「From」という形式で示されているため、公式テーブルに記載された下限値を採用した。pricing.notes に記録済み。',
}));

models.push(model({
  id: 'claude-fable-5-1',
  name: 'Claude Fable 5.1',
  vendor: 'Anthropic',
  release_date: '2026-09-01',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 10.0,
    output_per_million: 50.0,
    cached_input_per_million: 1.0,
    notes: 'Anthropic の公式モデルページの標準価格。キャッシュ入力は公式の pricing テーブルによる。',
  },
  benchmarks: { aa_intelligence: 49, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 13.86,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。Max 推論設定に対応。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic ドキュメント - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic ドキュメント - Pricing'),
    aaSource('/models/claude-fable-5-1', 'Artificial Analysis - Claude Fable 5.1'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: '高めの推論コストの位置付け。Arena スコアは同世代の Opus より低いが、これは評価の測定方法の差異であり、品質の優劣を示すものではない。',
}));

models.push(model({
  id: 'claude-haiku-5-5',
  name: 'Claude Haiku 5.5',
  vendor: 'Anthropic',
  release_date: '2026-09-29',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.1,
    output_per_million: 0.5,
    cached_input_per_million: null,
    notes: '公式ページは「From $0.10 / input MTok, From $0.50 / output MTok」と表示しており、ここでは下限を採用した。キャッシュ価格は記載がない。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 0.62,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。High 推論設定に対応。',
  },
  sources: [
    official('https://platform.claude.com/docs/en/models/overview', 'Anthropic ドキュメント - Models overview'),
    official('https://platform.claude.com/docs/en/about-claude/pricing', 'Anthropic ドキュメント - Pricing'),
    aaSource('/models/claude-haiku-5-5', 'Artificial Analysis - Claude Haiku 5.5'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'このモデルの Intelligence Index の数値は Artificial Analysis の公開ランキングに読み取り可能な値として存在しないため、ルールに従い null とし、推定しなかった。',
}));

/* ---------------------------- Google ---------------------------- */
models.push(model({
  id: 'gemini-4-carbon',
  name: 'Gemini 4 Carbon',
  vendor: 'Google',
  release_date: '2026-10-01',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: 0.2,
    notes: 'Google の公式価格ページ：入力 $4 / 出力 $20（2026-12-01 以降は入力 $2 / 出力 $10 に変更。詳細は pricing.notes 以外の備考を参照）。キャッシュ入力 $0.2。',
  },
  benchmarks: { aa_intelligence: 60, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 16.72,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。High 推論設定に対応。',
  },
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models', 'Google AI - Gemini API Models'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-4-carbon', 'Artificial Analysis - Gemini 4 Carbon'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'Google の公式価格ページでは 2026-12-01 以降に入力 $2 / 出力 $10 へ引き下げられることが明記されている。本レコードは取得日の時点で有効な $4 / $20 で記載した。リリース日は Artificial Analysis が表示する 2026 年 10 月の初日を採用した。',
}));

models.push(model({
  id: 'gemini-4-argon',
  name: 'Gemini 4 Argon',
  vendor: 'Google',
  release_date: '2026-09-30',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 10.0,
    cached_input_per_million: 0.1,
    notes: 'Google の公式価格ページ：2026-11-30 までは入力 $2 / 出力 $10、以降は入力 $4 / 出力 $20 に変更。キャッシュ入力 $0.1。',
  },
  benchmarks: { aa_intelligence: 50, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 10.53,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。High 推論設定に対応。',
  },
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models/gemini-4-argon', 'Google AI - Gemini 4 Argon'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-4-argon', 'Artificial Analysis - Gemini 4 Argon'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: '価格は取得日時点で有効なプロモーション価格を適用した。公式ページには今後の価格改定日が明記されている。',
}));

models.push(model({
  id: 'gemini-3-8-flash',
  name: 'Gemini 3.8 Flash',
  vendor: 'Google',
  release_date: '2026-09-15',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.75,
    output_per_million: 3.75,
    cached_input_per_million: 0.075,
    notes: 'Google の公式価格ページ：2026-12-31 までは入力 $0.75 / 出力 $3.75、以降は入力 $1.5 / 出力 $7.5 に変更。キャッシュ入力 $0.075。',
  },
  benchmarks: { aa_intelligence: 31, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://ai.google.dev/gemini-api/docs/models', 'Google AI - Gemini API Models'),
    official('https://ai.google.dev/gemini-api/docs/pricing', 'Google AI - Gemini API Pricing'),
    aaSource('/models/gemini-3-8-flash', 'Artificial Analysis - Gemini 3.8 Flash'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'Arena のランキングにこのモデルの独立した項目が存在しないため、arena_score は null とした。',
}));

/* ---------------------------- Meta ---------------------------- */
models.push(model({
  id: 'llama-4-scout',
  name: 'Llama 4 Scout',
  vendor: 'Meta',
  release_date: '2025-04-05',
  license: 'open-weights-commercial-restricted',
  license_label: 'Llama 4 Community License（オープンウェイト、商用利用に制限あり）',
  context_window: 10000000,
  pricing: {
    input_per_million: 0.18,
    output_per_million: 0.66,
    cached_input_per_million: null,
    notes: 'この価格は Artificial Analysis が集計した第三者ホスティングの平均価格（USD / 1M トークン）であり、Meta の公式 API 料金ではない。Meta は Llama 4 の公式 API 単価を公表していないため、公式価格は設定しない。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: 74.3, livecodebench: 32.8 },
  arena_score: null,
  sources: [
    official('https://www.llama.com/models/llama-4/', 'Meta Llama - Llama 4'),
    official('https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct', 'Hugging Face - Llama 4 Scout モデルカード'),
    aaSource('/models/llama-4-scout', 'Artificial Analysis - Llama 4 Scout'),
  ],
  notes: '公式モデルカードに Intelligence Index のスコアが記載されていないため、aa_intelligence は null。MMLU-Pro と LiveCodeBench は Meta の公式 Llama 4 ページから取得した。',
}));

models.push(model({
  id: 'llama-4-maverick',
  name: 'Llama 4 Maverick',
  vendor: 'Meta',
  release_date: '2025-04-05',
  license: 'open-weights-commercial-restricted',
  license_label: 'Llama 4 Community License（オープンウェイト、商用利用に制限あり）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.25,
    output_per_million: 0.92,
    cached_input_per_million: null,
    notes: '第三者ホスティングの平均価格であり、Meta の公式 API 料金ではない。キャッシュ価格は開示されていない。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: 80.5, livecodebench: 43.4 },
  arena_score: null,
  sources: [
    official('https://www.llama.com/models/llama-4/', 'Meta Llama - Llama 4'),
    official('https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct', 'Hugging Face - Llama 4 Maverick モデルカード'),
    aaSource('/models/llama-4-maverick', 'Artificial Analysis - Llama 4 Maverick'),
  ],
  notes: 'Artificial Analysis のページではこのモデルの Intelligence Index が N/A（未評価）と表示されているため、null とした。',
}));

models.push(model({
  id: 'muse-wonder',
  name: 'Muse Wonder',
  vendor: 'Meta',
  release_date: '2026-10-01',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 1048576,
  pricing: {
    input_per_million: 4.0,
    output_per_million: 20.0,
    cached_input_per_million: null,
    notes: 'Artificial Analysis が集計したホスティング平均価格。Meta はこのモデルの公式 API 単価を公表しておらず、キャッシュ価格も不明。',
  },
  benchmarks: { aa_intelligence: 44, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: {
    board_name: 'LMArena Arena（エージェント部門）',
    score: 9.42,
    collected_at: TODAY,
    notes: 'Arena のパーセンテージ表示。Max 推論設定に対応。',
  },
  sources: [
    aaSource('/models/muse-wonder', 'Artificial Analysis - Muse Wonder'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'このモデルには公式の価格ページと公式技術レポートが存在しない。価格は Artificial Analysis の集計値のみに基づく。キャッシュ価格と公式ライセンスの本文は未確認。',
}));

/* ---------------------------- Mistral ---------------------------- */
models.push(model({
  id: 'mistral-large-4',
  name: 'Mistral Large 4',
  vendor: 'Mistral AI',
  release_date: '2026-10-29',
  license: 'open-weights-commercial-restricted',
  license_label: 'Mistral Ecosystem Open-Weight License（オープンウェイト、商用利用に制限あり）',
  context_window: 1048576,
  pricing: {
    input_per_million: 0.7,
    output_per_million: 2.1,
    cached_input_per_million: 0.07,
    notes: 'Mistral の公式 API 価格ページの標準価格。Batch 価格は標準価格の 50% 割引。',
  },
  benchmarks: { aa_intelligence: 26, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral ドキュメント - API pricing'),
    official('https://docs.mistral.ai/models/overview/', 'Mistral ドキュメント - Models Overview'),
    aaSource('/models/mistral-large-4', 'Artificial Analysis - Mistral Large 4'),
  ],
  notes: 'ライセンスは商用利用に制限のあるオープンウェイトライセンス。Artificial Analysis は「Commercial use is allowed with restrictions」と明記している。',
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
    notes: 'Mistral の公式 API 価格ページの標準価格。Batch 価格は標準価格の 50% 割引。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral ドキュメント - API pricing'),
    official('https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512', 'Hugging Face - Mistral Large 3 モデルカード'),
    aaSource('/models/mistral-large-3', 'Artificial Analysis - Mistral Large 3'),
  ],
  notes: 'Artificial Analysis のページにはこのモデルの Intelligence Index の数値が公開されていないため、null とした。コンテキスト長 256K は Artificial Analysis と第三者の集計で確認したもので、公式 API ドキュメントは 256k とのみ記載している。',
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
    notes: 'Mistral の公式 API 価格ページの標準価格。',
  },
  benchmarks: { aa_intelligence: 4, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral ドキュメント - API pricing'),
    official('https://docs.mistral.ai/models/overview/', 'Mistral ドキュメント - Models Overview'),
    aaSource('/models/mistral-small-4', 'Artificial Analysis - Mistral Small 4'),
  ],
  notes: 'このモデルの Artificial Analysis におけるオープンウェイト同カテゴリの評価サンプルはごく少数（3 モデルのみ）である。スコアは低いものの比較可能性は限定的であり、notes を参照して判断する必要がある。',
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
    notes: 'DeepSeek の公式価格ページ：オフピーク時間帯は入力 $0.15 / 出力 $0.6、ピーク時間帯は入力 $0.3 / 出力 $1.2。キャッシュ命中はオフピーク $0.003、ピーク $0.006。ここではピーク価格（より保守的）を採用した。',
  },
  benchmarks: { aa_intelligence: 33, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://api-docs.deepseek.com/quick_start/pricing/', 'DeepSeek 公式ドキュメント - Models & Pricing'),
    official('https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash', 'Hugging Face - DeepSeek V4.1 Flash モデルカード'),
    aaSource('/models/deepseek-v4-1-flash-1017', 'Artificial Analysis - DeepSeek V4.1 Flash 1017'),
    aaSource('/leaderboards/models', 'Artificial Analysis モデルランキング'),
  ],
  notes: 'リリース日はモデル名の日付表記 1017 と公式ドキュメントの MODEL VERSION フィールドから取得した。価格はピーク時間帯のものを採用し、オフピーク時間帯はより低い。pricing.notes に明記済み。',
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
    notes: 'DeepSeek の公式価格ページ：ピーク時間帯は入力 $1.32 / 出力 $3.96、オフピークは入力 $0.66 / 出力 $1.98。キャッシュ命中はピーク $0.044。',
  },
  benchmarks: { aa_intelligence: 23, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://api-docs.deepseek.com/quick_start/pricing/', 'DeepSeek 公式ドキュメント - Models & Pricing'),
    aaSource('/models/deepseek-v4-pro', 'Artificial Analysis - DeepSeek V4 Pro'),
  ],
  notes: 'Artificial Analysis のページでは「DeepSeek V4 Pro 0813」という表記でこのバージョンを識別している。価格はピーク時間帯のものを採用した。',
}));

/* ---------------------------- Z AI (GLM) ---------------------------- */
models.push(model({
  id: 'glm-5-3',
  name: 'GLM-5.3',
  vendor: 'Z AI',
  release_date: '2026-08-18',
  license: 'open-weights-commercial-restricted',
  license_label: 'GLM-5.3 License（オープンウェイト、商用利用に制限あり）',
  context_window: 1048576,
  pricing: {
    input_per_million: 1.4,
    output_per_million: 4.4,
    cached_input_per_million: 0.14,
    notes: 'Mistral プラットフォームで Z.ai の GLM 5.3 を取り扱う際の標準価格。Z.ai 独自のチャネルでの価格は今回の確認範囲外。',
  },
  benchmarks: { aa_intelligence: 32, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.mistral.ai/inference/pricing', 'Mistral ドキュメント - API pricing（Z.ai GLM 5.3）'),
    official('https://huggingface.co/zai-org/GLM-5.3', 'Hugging Face - GLM-5.3 モデルカード'),
    aaSource('/models/glm-5-3', 'Artificial Analysis - GLM-5.3'),
  ],
  notes: '価格は Mistral プラットフォームでの販売価格であり、Z.ai の直営価格ではない。ライセンスは商用利用に制限のあるオープンウェイトライセンス。',
}));

/* ---------------------------- xAI (Grok) ---------------------------- */
models.push(model({
  id: 'grok-4-7',
  name: 'Grok 4.7',
  vendor: 'xAI',
  release_date: '2026-09-21',
  license: 'proprietary',
  license_label: 'プロプライエタリ（クローズドソース）',
  context_window: 500000,
  pricing: {
    input_per_million: 2.0,
    output_per_million: 6.0,
    cached_input_per_million: 0.5,
    notes: '公式ドキュメントページの標準価格。200K を超えるコンテキストの部分はより高い料金が適用されるため、ここには含めていない。',
  },
  benchmarks: { aa_intelligence: 35, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://docs.x.ai/developers/models', 'xAI ドキュメント - Grok Models & Pricing'),
    official('https://docs.x.ai/developers/models/grok-4.7', 'xAI ドキュメント - Grok 4.7'),
    aaSource('/models/grok-4-7', 'Artificial Analysis - Grok 4.7'),
  ],
  notes: '公式ドキュメントページの最終更新日が 2026-09-21 であるため、これをリリース日とした。ナレッジのカットオフは 2026 年 5 月。',
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
    notes: 'Alibaba Cloud Model Studio の公式ページには今回の確認で当モデルの読み取り可能な単価がなかった。第三者ホスティングの価格は採用しない。ルールに従い null とし、推定は禁止する。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://qwenlm.github.io/blog/qwen3/', 'Qwen 公式ブログ - Qwen3: Think Deeper, Act Faster'),
    official('https://github.com/QwenLM/Qwen3', 'QwenLM/Qwen3 GitHub リポジトリ'),
    official('https://www.alibabacloud.com/help/en/model-studio/models', 'Alibaba Cloud Model Studio - Recommended models'),
  ],
  notes: '公式ブログでは 128K のコンテキスト長と Apache 2.0 が示されている。Qwen3-2507 の更新版ではロングコンテキストが 1M に拡張されているが、本レコードは初期の Qwen3 リリース版に対応する。価格とベンチマークスコアは信頼できる公開ソースが見つからなかったため、null とした。',
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
    notes: '公式には今回の確認で読み取り可能な単価がなく、null とした。',
  },
  benchmarks: { aa_intelligence: null, aa_briefcase_elo: null, mmlu_pro: null, livecodebench: null },
  arena_score: null,
  sources: [
    official('https://qwenlm.github.io/blog/qwen3/', 'Qwen 公式ブログ - Qwen3: Think Deeper, Act Faster'),
    official('https://github.com/QwenLM/Qwen3', 'QwenLM/Qwen3 GitHub リポジトリ'),
  ],
  notes: '公式ブログでは 128K のコンテキスト長と Apache 2.0 が示されている。Intelligence Index の公開数値は存在しない。',
}));

/* ---------------------------- 出力 ---------------------------- */
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

console.log(`生成しました：${dest}`);
console.log(`取得日（retrieved_at / last_updated）：${TODAY}`);
console.log(`モデル数：${models.length}`);
console.log(`ベンチマーク数：${out.benchmarks.length}`);
