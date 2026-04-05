import { createSupabaseAdminClient } from "@/lib/admin";
import { fallbackDailyAnalysisSeed, type DailyAiMarketAnalysis, type DailyAiMarketRecord } from "@/lib/daily-ai-market";

export type DailyAiMarketAutoGenerateInput = {
  analysisDate?: string;
  publishAtJst?: string;
  source?: "auto" | "admin" | "manual-seed";
  status?: "scheduled" | "published";
  forceRepublish?: boolean;
};

export type DailyAiMarketAutoPublishResult = {
  record: DailyAiMarketRecord;
  mode: "created" | "updated";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateJst(date = new Date()) {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}`;
}

function buildPublishAtJst(date: string, time = "21:15") {
  return `${date}T${time}:00+09:00`;
}

function getJstNow(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function hasReachedJstTime(time: string, now = new Date()) {
  const jst = getJstNow(now);
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return false;
  }

  return jst.getHours() > hour || (jst.getHours() === hour && jst.getMinutes() >= minute);
}

function createSlug(date: string) {
  return `daily-ai-market-${date}`;
}

function formatAnalysisDateLabel(date: string) {
  return date.replace(/-/g, ".");
}

function createAutoStatusLine(analysisDate: string, publishAtJst: string) {
  const publishTime = publishAtJst.slice(11, 16);
  return `${formatAnalysisDateLabel(analysisDate)} JST ${publishTime} 自动发布占位版：若正式行情稿缺席，首页仍会切到当日版本，避免继续显示前一天完全相同的内容。`;
}

function buildAutoPayload(
  input: Pick<Required<DailyAiMarketAutoGenerateInput>, "analysisDate" | "publishAtJst" | "source" | "status">,
): DailyAiMarketAnalysis {
  const fallback = fallbackDailyAnalysisSeed;
  const dateLabel = formatAnalysisDateLabel(input.analysisDate);
  const publishTime = input.publishAtJst.slice(11, 16);
  const autoStatusLine = createAutoStatusLine(input.analysisDate, input.publishAtJst);

  return {
    ...fallback,
    title: `今日 AI 行情分析 · ${dateLabel}`,
    headline: `${dateLabel} BTC 日更占位已自动刷新：当前仍沿用 fallback 框架，但当天文案与发布时间已切换。`,
    summary: `${autoStatusLine} 当前结论仍沿用保守 fallback 框架：短线继续看确认后执行，长线继续等大级别重新一致，不把自动补位误当成新的实时盘中观点。`,
    conviction: `${fallback.conviction}（自动发布时间：${dateLabel} ${publishTime} JST）`,
    publishAtJst: input.publishAtJst,
    timeframe: `${fallback.timeframe} 自动版本日期：${dateLabel} / 发布时间：${publishTime} JST。`,
    structure: `${fallback.structure} 当前为 ${dateLabel} 自动占位发布版本，未接入新的实盘结构前，不应视作新增方向切换信号。`,
    vwap: `${fallback.vwap} 当前自动版本生成时间：${publishTime} JST。`,
    macd: `${fallback.macd} 当前自动版本生成时间：${publishTime} JST。`,
    rsi: `${fallback.rsi} 当前自动版本生成时间：${publishTime} JST。`,
    focus: [
      `确认 ${dateLabel} 正式分析是否已补齐，避免首页长期停留在自动占位版本。`,
      ...fallback.focus.slice(0, 2),
    ],
    riskTips: [
      `当前页面为 ${dateLabel} 自动补位发布版本，不代表新的实时盘中数据已更新。`,
      ...fallback.riskTips.slice(0, 2),
    ],
    status: input.status,
    source: input.source,
  };
}

export function generateDailyAiMarketAutoPayload(input: DailyAiMarketAutoGenerateInput = {}) {
  const analysisDate = input.analysisDate ?? formatDateJst();
  const publishAtJst = input.publishAtJst ?? buildPublishAtJst(analysisDate);
  const source = input.source ?? "auto";
  const status = input.status ?? "published";

  return {
    analysisDate,
    publishAtJst,
    source,
    status,
    slug: createSlug(analysisDate),
    payload: buildAutoPayload({
      analysisDate,
      publishAtJst,
      source,
      status,
    }),
  };
}

export async function upsertDailyAiMarketAutoPublish(input: DailyAiMarketAutoGenerateInput = {}): Promise<DailyAiMarketAutoPublishResult> {
  const generated = generateDailyAiMarketAutoPayload(input);
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("daily_ai_market_analyses")
    .select("id, status, published_at")
    .eq("analysis_date", generated.analysisDate)
    .maybeSingle<{ id: string; status: "scheduled" | "published" | "draft"; published_at: string | null }>();

  if (existingError) {
    throw existingError;
  }

  const fallbackWindowReached = hasReachedJstTime("22:15");
  const shouldForceRepublish = input.forceRepublish ?? (generated.status === "published" && fallbackWindowReached && existing?.status !== "published");

  const nextStatus = shouldForceRepublish ? "published" : generated.status;
  const nextPublishedAt = nextStatus === "published" ? now : null;

  const { data, error } = await supabase
    .from("daily_ai_market_analyses")
    .upsert(
      {
        slug: generated.slug,
        analysis_date: generated.analysisDate,
        publish_at_jst: generated.publishAtJst,
        status: nextStatus,
        source: generated.source,
        payload: {
          ...generated.payload,
          status: nextStatus,
        },
        published_at: nextPublishedAt,
        updated_at: now,
      },
      {
        onConflict: "analysis_date",
      },
    )
    .select("id, slug, analysis_date, publish_at_jst, status, source, payload, created_at, updated_at, published_at")
    .single<DailyAiMarketRecord>();

  if (error) {
    throw error;
  }

  return {
    record: data,
    mode: existing ? "updated" : "created",
  };
}
