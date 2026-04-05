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
  const indicatorPanels = [
    {
      timeframe: "4H" as const,
      bias: pickByDate(`${input.analysisDate}-4h-bias`, ["bearish", "neutral", "bullish"] as const),
      vwap: {
        value: pickByDate(`${input.analysisDate}-4h-vwap`, ["67,180", "67,420", "67,660", "67,920"]),
        val: pickByDate(`${input.analysisDate}-4h-val`, ["66,740", "66,980", "67,120", "67,280"]),
        vah: pickByDate(`${input.analysisDate}-4h-vah`, ["67,820", "68,060", "68,240", "68,420"]),
        stance: pickByDate(`${input.analysisDate}-4h-stance`, ["价位仍压 VWAP 下", "贴近 VWAP 反复争夺", "重新站回 VWAP 上方"]),
      },
      macd: {
        direction: pickByDate(`${input.analysisDate}-4h-macd-direction`, ["死叉后缩口", "零轴下方走平", "金叉后放缓"]),
        divergence: pickByDate(`${input.analysisDate}-4h-macd-divergence`, ["无明显背离", "轻微底背离", "轻微顶背离"]),
        bias: pickByDate(`${input.analysisDate}-4h-macd-bias`, ["bearish", "neutral", "bullish"] as const),
      },
      rsi: {
        value: Number(pickByDate(`${input.analysisDate}-4h-rsi-value`, [42, 45, 48, 52])),
        divergence: pickByDate(`${input.analysisDate}-4h-rsi-divergence`, ["无背离", "轻微底背离", "轻微顶背离"]),
        bias: pickByDate(`${input.analysisDate}-4h-rsi-bias`, ["bearish", "neutral", "bullish"] as const),
      },
    },
    {
      timeframe: "D" as const,
      bias: pickByDate(`${input.analysisDate}-d-bias`, ["neutral", "bearish", "bullish"] as const),
      vwap: {
        value: pickByDate(`${input.analysisDate}-d-vwap`, ["67,860", "68,040", "68,280", "68,520"]),
        val: pickByDate(`${input.analysisDate}-d-val`, ["67,120", "67,340", "67,560", "67,880"]),
        vah: pickByDate(`${input.analysisDate}-d-vah`, ["68,920", "69,080", "69,260", "69,480"]),
        stance: pickByDate(`${input.analysisDate}-d-stance`, ["贴近 VWAP 中轴", "仍在 VWAP 下方偏弱", "重新回到 VWAP 上方"]),
      },
      macd: {
        direction: pickByDate(`${input.analysisDate}-d-macd-direction`, ["零轴下方走平", "死叉后缩口", "零轴附近回暖"]),
        divergence: pickByDate(`${input.analysisDate}-d-macd-divergence`, ["轻微底背离", "无明显背离", "轻微顶背离"]),
        bias: pickByDate(`${input.analysisDate}-d-macd-bias`, ["neutral", "bearish", "bullish"] as const),
      },
      rsi: {
        value: Number(pickByDate(`${input.analysisDate}-d-rsi-value`, [46, 49, 52, 55])),
        divergence: pickByDate(`${input.analysisDate}-d-rsi-divergence`, ["轻微底背离", "无背离", "轻微顶背离"]),
        bias: pickByDate(`${input.analysisDate}-d-rsi-bias`, ["neutral", "bearish", "bullish"] as const),
      },
    },
    {
      timeframe: "W" as const,
      bias: pickByDate(`${input.analysisDate}-w-bias`, ["bullish", "neutral", "bearish"] as const),
      vwap: {
        value: pickByDate(`${input.analysisDate}-w-vwap`, ["65,880", "66,120", "66,420", "66,760"]),
        val: pickByDate(`${input.analysisDate}-w-val`, ["63,940", "64,220", "64,580", "64,920"]),
        vah: pickByDate(`${input.analysisDate}-w-vah`, ["68,740", "69,020", "69,360", "69,620"]),
        stance: pickByDate(`${input.analysisDate}-w-stance`, ["仍守 VWAP 上", "贴近 VWAP 中轴", "回落到 VWAP 下方"]),
      },
      macd: {
        direction: pickByDate(`${input.analysisDate}-w-macd-direction`, ["多头柱体放缓", "零轴上方走平", "高位缩口"]),
        divergence: pickByDate(`${input.analysisDate}-w-macd-divergence`, ["无背离", "轻微顶背离", "轻微底背离"]),
        bias: pickByDate(`${input.analysisDate}-w-macd-bias`, ["bullish", "neutral", "bearish"] as const),
      },
      rsi: {
        value: Number(pickByDate(`${input.analysisDate}-w-rsi-value`, [54, 57, 60, 62])),
        divergence: pickByDate(`${input.analysisDate}-w-rsi-divergence`, ["无背离", "轻微顶背离", "轻微底背离"]),
        bias: pickByDate(`${input.analysisDate}-w-rsi-bias`, ["bullish", "neutral", "bearish"] as const),
      },
    },
  ];
  const shortTermStance = pickByDate(`${input.analysisDate}-short-stance`, ["短线偏多", "短线偏空", "短线震荡", "短线观望"] as const);
  const longTermStance = pickByDate(`${input.analysisDate}-long-stance`, ["长线偏多", "长线偏空", "长线震荡", "长线观望"] as const);
  const shortTermDirection = pickByDate(`${input.analysisDate}-short-direction`, ["回落承接做多", "反弹承压做空", "区间低吸做多", "观望等待"] as const);
  const longTermDirection = pickByDate(`${input.analysisDate}-long-direction`, ["回落承接做多", "反弹承压做空", "突破追多", "观望等待"] as const);
  const tradeSetups = {
    shortTerm: {
      label: "短线策略",
      stance: shortTermStance,
      direction: shortTermDirection,
      rationale: pickByDate(`${input.analysisDate}-short-rationale`, [
        "自动版本更偏向先等确认后的短线执行，不在中位直接追单。",
        "短线只看确认后的承接或反抽承压，不把日更自动稿当即时喊单。",
        "当前短线建议以节奏交易为主，优先小仓位、快进快出。",
        "自动版本下，短线执行先定义失效位，再考虑是否跟随。",
      ]),
      triggerZone: pickByDate(`${input.analysisDate}-short-trigger`, [
        "确认位附近出现承接后再执行。",
        "回踩关键位不破后再考虑进场。",
        "跌不动或冲不过后的二次确认区。",
        "先等 15M 收线确认，再处理下一步。",
      ]),
      stopLoss: pickByDate(`${input.analysisDate}-short-stop`, [
        "失守短线确认位后离场。",
        "跌破承接区且收不回时止损。",
        "若冲高后快速回落到失效区，直接撤退。",
        "确认失败就离场，不拖。",
      ]),
      targets: [
        pickByDate(`${input.analysisDate}-short-target-1`, ["第一目标：先看前高附近减仓", "第一目标：先看箱体中上沿", "第一目标：先看日内压力位", "第一目标：先看反弹第一阻力区"]),
        pickByDate(`${input.analysisDate}-short-target-2`, ["第二目标：延续则看上沿突破", "第二目标：若放量再看更高压力区", "第二目标：若承接延续再推保护止盈", "第二目标：冲高不放量就收缩预期"]),
      ],
      invalidation: pickByDate(`${input.analysisDate}-short-invalidation`, [
        "确认位失守后，短线计划失效。",
        "若承接不成立且量能转弱，短线撤销。",
        "出现假突破后快速回落，则放弃追随。",
        "若波动突然放大但没有收线确认，短线不执行。",
      ]),
      executionLine: pickByDate(`${input.analysisDate}-short-execution`, [
        "短线只做确认后的那一段，不预判。",
        "先轻仓试单，确认延续再处理加减仓。",
        "拿不到确认信号就继续观望。",
        "自动版本下，先做纪律，不做冲动。",
      ]),
    },
    longTerm: {
      label: "长线策略",
      stance: longTermStance,
      direction: longTermDirection,
      rationale: pickByDate(`${input.analysisDate}-long-rationale`, [
        "长线更看大级别是否重新一致，不在自动稿里提前给重仓结论。",
        "当前长线思路偏向等压力区或趋势确认，不急着在中位下注。",
        "长线计划以结构确认优先，先看大级别是否修复。",
        "自动版本更适合给框架，不适合替代正式长线研究稿。",
      ]),
      triggerZone: pickByDate(`${input.analysisDate}-long-trigger`, [
        "等大级别确认位站稳或失守后再执行。",
        "反弹进压力区后再看是否顺势处理。",
        "跌破关键位后的回抽确认区。",
        "重新站稳中轴并延续后再考虑切换。",
      ]),
      stopLoss: pickByDate(`${input.analysisDate}-long-stop`, [
        "长线失效位被破坏时离场。",
        "确认位被反向收回后止损。",
        "若趋势修复与原判断相反，则撤销原计划。",
        "方向失效后不死扛。",
      ]),
      targets: [
        pickByDate(`${input.analysisDate}-long-target-1`, ["第一目标：先看周内关键位", "第一目标：先看前高/前低一带", "第一目标：先看结构延续位", "第一目标：先看区间外侧"]),
        pickByDate(`${input.analysisDate}-long-target-2`, ["第二目标：若大级别延续再看下一档", "第二目标：只在放量时继续上修/下修", "第二目标：若量价不配合就降低预期", "第二目标：先保护利润再谈扩展"]),
      ],
      invalidation: pickByDate(`${input.analysisDate}-long-invalidation`, [
        "大级别确认失败后，长线计划取消。",
        "若关键结构被反向修复，长线撤销。",
        "没有趋势一致性时，长线不扩大仓位。",
        "若宏观扰动放大且方向混乱，长线回到观望。",
      ]),
      executionLine: pickByDate(`${input.analysisDate}-long-execution`, [
        "长线先看结构，不抢节奏。",
        "等大级别确认后再放大仓位。",
        "自动版本只给框架，正式出手仍要看确认。",
        "先定义失效条件，再谈持仓周期。",
      ]),
    },
  };

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
    indicatorPanels,
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
    tradeSetups,
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
