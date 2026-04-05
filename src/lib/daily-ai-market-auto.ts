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

function getDateSeed(date: string) {
  return date.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickByDate<T>(date: string, items: T[]): T {
  return items[getDateSeed(date) % items.length];
}

function createAutoStatusLine(analysisDate: string, publishAtJst: string) {
  const publishTime = publishAtJst.slice(11, 16);
  return `${formatAnalysisDateLabel(analysisDate)} JST ${publishTime} 自动发布版：当日结果由接口重新生成，不再原样复用旧 seed。`;
}

function buildAutoPayload(
  input: Pick<Required<DailyAiMarketAutoGenerateInput>, "analysisDate" | "publishAtJst" | "source" | "status">,
): DailyAiMarketAnalysis {
  const fallback = fallbackDailyAnalysisSeed;
  const dateLabel = formatAnalysisDateLabel(input.analysisDate);
  const publishTime = input.publishAtJst.slice(11, 16);
  const autoStatusLine = createAutoStatusLine(input.analysisDate, input.publishAtJst);

  const biasOptions: DailyAiMarketAnalysis["marketBias"][] = ["偏空", "中性偏空", "震荡", "中性偏多"];
  const convictionOptions = [
    "主结论：先按确认后执行，自动版本只给方向框架，不替代盘中人工判断。",
    "主结论：优先等关键位确认，不在中位追单，自动版本更偏防守型。",
    "主结论：当前自动版本偏向区间处理，未出现新的趋势切换信号前不做激进预判。",
    "主结论：自动发布已刷新，先看确认位与否定位，再决定短线节奏是否切换。",
  ];
  const headlineOptions = [
    `${dateLabel} 自动日更已刷新：当前更适合按确认位执行，不把日更占位稿误读成盘中强信号。`,
    `${dateLabel} 首页日更已切到新版本：核心仍是先看关键位确认，再决定是否跟随延续。`,
    `${dateLabel} 自动版本已生成：当前先按结构框架处理，重点防止中位追单。`,
    `${dateLabel} 自动发布完成：在没有正式盘中补稿前，优先看区间确认与失效条件。`,
  ];
  const summaryOptions = [
    `${autoStatusLine} 当前自动版本更强调风险控制：短线只在确认后动手，长线继续等更大级别方向重新一致。`,
    `${autoStatusLine} 这版自动结果的重点不是给你激进结论，而是把确认位、失效位和执行顺序重新刷成当日版本。`,
    `${autoStatusLine} 当日自动发布已刷新，页面内容不再停留在前一日 seed；但若没有正式补稿，仍应按框架而非喊单去理解。`,
    `${autoStatusLine} 这一版自动稿优先保留执行框架与风险提示，避免首页继续挂着前一天完全不变的内容。`,
  ];
  const structureOptions = [
    `当前自动版本判断为弱趋势内震荡处理，先看区间确认，未出现明确站稳前不把反弹当趋势反转。`,
    `结构上仍以确认位前后的博弈为主，自动版本不提前给趋势翻转结论。`,
    `自动生成结果偏向“区间先行、突破再跟”，大级别方向没有新增确认前不做单边扩展。`,
    `当前结构仍适合分级别处理：短线看承接，长线看是否重新进入压力区后再决定。`,
  ];
  const vwapOptions = [
    `自动版本提示：若价格持续压在 VWAP 下方，先按弱反弹看待；站回并企稳后再谈节奏切换。`,
    `VWAP 当前仍是自动稿中的方向过滤器：压制未解除前，不把局部反抽当趋势修复。`,
    `自动发布版本里，VWAP 继续用来区分“承接延续”与“冲高回落”两种执行路径。`,
    `先看 VWAP 上下的站稳与失守，不在中位凭主观猜测扩仓。`,
  ];
  const macdOptions = [
    `MACD 自动摘要：更偏向观察动能是否延续，而不是提前下趋势切换结论。`,
    `MACD 自动版本维持保守解释：柱体未扩张前，先看确认，不追情绪单。`,
    `当前 MACD 摘要更像节奏过滤器，提醒你先定义失效，再谈方向。`,
    `自动发布结果中，MACD 仍只作为辅助，不独立承担翻多/翻空结论。`,
  ];
  const rsiOptions = [
    `RSI 自动摘要：修复不代表反转，强弱区能否站稳才决定后续节奏。`,
    `RSI 当前在自动版本里仍只用来判断强弱修复，不单独给趋势结论。`,
    `自动稿里的 RSI 提醒是：先看能否进入强势区并站稳，否则反抽仍按弱修复处理。`,
    `RSI 若只是低位回升，优先理解为跌势放缓，而不是方向反转。`,
  ];

  return {
    ...fallback,
    title: `今日 AI 行情分析 · ${dateLabel}`,
    marketBias: pickByDate(input.analysisDate, biasOptions),
    headline: pickByDate(input.analysisDate, headlineOptions),
    summary: pickByDate(`${input.analysisDate}-summary`, summaryOptions),
    conviction: `${pickByDate(`${input.analysisDate}-conviction`, convictionOptions)}（自动发布时间：${dateLabel} ${publishTime} JST）`,
    publishAtJst: input.publishAtJst,
    timeframe: `${fallback.timeframe} 自动版本日期：${dateLabel} / 发布时间：${publishTime} JST。`,
    structure: pickByDate(`${input.analysisDate}-structure`, structureOptions),
    vwap: pickByDate(`${input.analysisDate}-vwap`, vwapOptions),
    macd: pickByDate(`${input.analysisDate}-macd`, macdOptions),
    rsi: pickByDate(`${input.analysisDate}-rsi`, rsiOptions),
    focus: [
      `确认 ${dateLabel} 的正式分析是否已补齐；当前首页已切到新的自动版本。`,
      `优先检查确认位与否定位是否仍成立，不在自动稿基础上直接放大仓位。`,
      `若晚间有正式盘中补稿，应让正式稿覆盖当前自动版本。`,
    ],
    riskTips: [
      `当前页面为 ${dateLabel} 自动生成版本，不等同于人工盘中实时稿。`,
      `自动版本已更新，但仍应先看关键位确认，不在中位追单。`,
      `若宏观事件临近或波动突然放大，优先等待下一根确认K线。`,
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
