import { createSupabaseAdminClient } from "@/lib/admin";
import { generateDailyAiMarketAutoPayload } from "@/lib/daily-ai-market-auto";

export type DailyAiMarketBias = "偏多" | "中性偏多" | "震荡" | "中性偏空" | "偏空";
export type DailyAiMarketStatus = "draft" | "scheduled" | "published";
export type DailyAiMarketSource = "manual-seed" | "admin" | "auto";
export type IndicatorTone = "bullish" | "bearish" | "neutral";
export type TradeStance = "短线偏多" | "短线偏空" | "短线震荡" | "短线观望" | "长线偏多" | "长线偏空" | "长线震荡" | "长线观望";
export type TradeDirection = "区间低吸做多" | "回落承接做多" | "反弹承压做空" | "突破追多" | "跌破追空" | "观望等待";
export type MacroEventName = "FOMC" | "CPI" | "非农";
export type MacroEventStatus = "待公布" | "已排期";

export type TradeReviewStatus = "tp_hit" | "sl_hit" | "holding" | "watching";

export type TradeReviewCalendarEntry = {
  date: string;
  setupLabel: string;
  direction: "long" | "short";
  status: TradeReviewStatus;
  confidence: "high" | "medium" | "low";
  entry: string;
  takeProfit: string;
  stopLoss: string;
  currentZone: string;
  resultLabel: string;
  pnlLabel: string;
  note: string;
  entryMin?: number;
  entryMax?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
};

export type DailyAiMarketSignalSnapshot = {
  shortTermBias: string;
  conviction: "low" | "medium" | "high";
  mainRisk: string;
  actionableRead: string;
  oiState: string;
  fundingState: string;
  liquidationState: string;
  cvdState: string;
  oiValue?: string;
  fundingValue?: string;
  liquidationValue?: string;
  cvdValue?: string;
  rawText?: string;
};

export type DailyAiMarketAnalysis = {
  title: string;
  publishAtJst: string;
  marketBias: DailyAiMarketBias;
  conviction: string;
  headline: string;
  summary: string;
  timeframe: string;
  structure: string;
  vwap: string;
  macd: string;
  rsi: string;
  indicatorPanels: Array<{
    timeframe: "4H" | "D" | "W";
    bias: IndicatorTone;
    vwap: {
      value: string;
      val: string;
      vah: string;
      stance: string;
    };
    macd: {
      direction: string;
      divergence: string;
      bias: IndicatorTone;
    };
    rsi: {
      value: number;
      divergence: string;
      bias: IndicatorTone;
    };
  }>;
  keyLevels: string[];
  focus: string[];
  riskTips: string[];
  tradeSetups: {
    shortTerm: {
      label: string;
      stance: Extract<TradeStance, "短线偏多" | "短线偏空" | "短线震荡" | "短线观望">;
      direction: TradeDirection;
      rationale: string;
      triggerZone: string;
      stopLoss: string;
      targets: string[];
      invalidation: string;
      executionLine: string;
    };
    longTerm: {
      label: string;
      stance: Extract<TradeStance, "长线偏多" | "长线偏空" | "长线震荡" | "长线观望">;
      direction: TradeDirection;
      rationale: string;
      triggerZone: string;
      stopLoss: string;
      targets: string[];
      invalidation: string;
      executionLine: string;
    };
  };
  macroEvents: Array<{
    name: MacroEventName;
    nextTimeJst: string;
    status: MacroEventStatus;
    current?: string;
    forecast?: string;
    previous?: string;
    note: string;
  }>;
  tradeReviewCalendar: {
    title: string;
    subtitle: string;
    winRate: string;
    record: string;
    highlight: string;
    entries: TradeReviewCalendarEntry[];
  };
  status: Exclude<DailyAiMarketStatus, "draft">;
  source: DailyAiMarketSource;
  signalSnapshot?: DailyAiMarketSignalSnapshot;
};

export type DailyAiMarketRecord = {
  id: string;
  slug: string;
  analysis_date: string;
  publish_at_jst: string;
  status: DailyAiMarketStatus;
  source: DailyAiMarketSource;
  payload: DailyAiMarketAnalysis;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type DailyAiMarketWorkflowNote = {
  timezone: string;
  preferredPublishTime: string;
  fallbackPublishTime?: string;
  currentMode: "manual-seed" | "supabase";
  nextStep: string;
  dataSource: "seed" | "supabase";
  latestStatus: DailyAiMarketStatus | "seed";
  todayPublished: boolean;
  todayPublishedAt?: string | null;
  todayAnalysisDate?: string | null;
};

function formatTradeReviewDate(analysisDate: string) {
  const [year, month, day] = analysisDate.split("-");
  if (!year || !month || !day) {
    return analysisDate;
  }

  return `${month}-${day}`;
}

function inferTradeReviewDirection(direction: DailyAiMarketAnalysis["tradeSetups"]["shortTerm"]["direction"]): "long" | "short" {
  return direction.includes("空") ? "short" : "long";
}

function inferTradeReviewStatus(stance: DailyAiMarketAnalysis["tradeSetups"]["shortTerm"]["stance"]): TradeReviewStatus {
  return stance === "短线观望" ? "watching" : "holding";
}

function buildTradeReviewStats(entries: TradeReviewCalendarEntry[]) {
  const wins = entries.filter((item) => item.status === "tp_hit").length;
  const losses = entries.filter((item) => item.status === "sl_hit").length;
  const holding = entries.filter((item) => item.status === "holding").length;
  const watching = entries.filter((item) => item.status === "watching").length;
  const settled = wins + losses;
  const winRate = settled > 0 ? `${Math.round((wins / settled) * 100)}%` : holding > 0 ? "待结算" : "--";
  const recordParts = [`${wins} 胜`, `${losses} 负`];

  if (holding > 0) {
    recordParts.push(`${holding} 持仓中`);
  }

  if (watching > 0) {
    recordParts.push(`${watching} 观望`);
  }

  return {
    winRate,
    record: recordParts.join(" / "),
    highlight:
      holding > 0
        ? "当前已开始接入真实短线建议回流；当日短线建议会先进入日历并标记为持仓中/观望，后续再继续补真实结果。"
        : "当前已开始接入真实短线建议回流；历史旧样例会逐步被新的真实短线记录替换。",
  };
}

export function syncTradeReviewCalendarFromShortTerm(
  analysisDate: string,
  analysis: DailyAiMarketAnalysis,
  previousEntries: TradeReviewCalendarEntry[] = [],
): DailyAiMarketAnalysis["tradeReviewCalendar"] {
  const shortTerm = analysis.tradeSetups.shortTerm;
  const status = inferTradeReviewStatus(shortTerm.stance);
  const date = formatTradeReviewDate(analysisDate);
  const entryLevels = parsePriceNumbers(shortTerm.triggerZone);
  const takeProfitLevels = shortTerm.targets.flatMap((item) => parsePriceNumbers(item));
  const stopLossLevels = parsePriceNumbers(shortTerm.stopLoss);
  const direction = inferTradeReviewDirection(shortTerm.direction);
  const nextEntry: TradeReviewCalendarEntry = {
    date,
    setupLabel: shortTerm.label,
    direction,
    status,
    confidence: "medium",
    entry: shortTerm.triggerZone,
    takeProfit: shortTerm.targets.join(" / "),
    stopLoss: shortTerm.stopLoss.replace(/^止损[:：]\s*/u, ""),
    currentZone: status === "watching" ? "等待触发" : "发布后待跟踪",
    resultLabel: status === "watching" ? "观望" : "持仓中",
    pnlLabel: status === "watching" ? "0R" : "进行中",
    note: shortTerm.executionLine,
    entryMin: entryLevels.length > 0 ? Math.min(...entryLevels) : undefined,
    entryMax: entryLevels.length > 0 ? Math.max(...entryLevels) : undefined,
    takeProfitPrice:
      takeProfitLevels.length > 0
        ? direction === "short"
          ? Math.min(...takeProfitLevels)
          : Math.max(...takeProfitLevels)
        : undefined,
    stopLossPrice: stopLossLevels[0],
  };

  const mergedEntries = [...previousEntries.filter((item) => item.date !== date), nextEntry].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const stats = buildTradeReviewStats(mergedEntries);

  return {
    title: "前一日开单建议复盘",
    subtitle: "当前先把短线开单建议真实回流到日历表，至少保证新日期不是演示数据。",
    winRate: stats.winRate,
    record: stats.record,
    highlight: stats.highlight,
    entries: mergedEntries,
  };
}

export const fallbackDailyAnalysisSeed: DailyAiMarketAnalysis = {
  title: "今日 AI 行情分析",
  publishAtJst: "2026-04-05T21:15:00+09:00",
  marketBias: "中性偏空",
  conviction: "主结论：大级别还没走回强趋势，今晚先按反弹承压与分级别执行来处理，先吃确定性，再等方向重新一致。",
  headline: "BTC 短线还有局部反抽空间，但 4H 级别没重新转强前，整体仍应按弱势反弹而非趋势反转来交易。",
  summary:
    "现在最忌讳的是大级别偏弱、页面却只给单边做多建议，结果把用户带进中位追单的节奏里。新的执行逻辑已经拆成短线与长线两套：短线允许围绕回踩承接做快进快出，前提是必须等 15M 结构给出止跌确认；长线则优先等反弹进压力区后的做空确认，不在弱势背景里提前猜底。只有当价格重新站回关键压力、VWAP 与量能同步修复，才考虑把节奏从防守反击切回顺势追随。",
  timeframe: "主观察 15M / 1H 节奏，方向过滤以 4H 级别是否重新转强为准。",
  structure: "15M 仍有箱体内反抽节奏，但 1H 反弹斜率放缓，4H 还没完成趋势修复；当前更像短线有反弹、长线先看反压。",
  vwap: "日内若始终压在 VWAP 下方，优先按反弹卖点看；只有重新站回 VWAP 并连续承接，短线多头才有继续扩展空间。",
  macd: "15M MACD 有低位收敛迹象，适合观察短反弹；但 1H / 4H 动能还没重新扩张，说明大方向暂时不支持无脑追多。",
  rsi: "15M RSI 从低位修复只代表跌势放缓，不代表趋势反转；若 1H RSI 反抽后仍上不去强势区，长线空头框架优先级更高。",
  indicatorPanels: [
    {
      timeframe: "4H",
      bias: "bearish",
      vwap: {
        value: "67,410",
        val: "66,980",
        vah: "67,860",
        stance: "价位仍压 VWAP 下",
      },
      macd: {
        direction: "死叉后缩口",
        divergence: "无明显背离",
        bias: "bearish",
      },
      rsi: {
        value: 43,
        divergence: "无背离",
        bias: "bearish",
      },
    },
    {
      timeframe: "D",
      bias: "neutral",
      vwap: {
        value: "68,020",
        val: "67,160",
        vah: "69,080",
        stance: "贴近 VWAP 中轴",
      },
      macd: {
        direction: "零轴下方走平",
        divergence: "轻微底背离",
        bias: "neutral",
      },
      rsi: {
        value: 48,
        divergence: "轻微底背离",
        bias: "neutral",
      },
    },
    {
      timeframe: "W",
      bias: "bullish",
      vwap: {
        value: "65,880",
        val: "63,940",
        vah: "68,740",
        stance: "仍守 VWAP 上",
      },
      macd: {
        direction: "多头柱体放缓",
        divergence: "无背离",
        bias: "bullish",
      },
      rsi: {
        value: 56,
        divergence: "无背离",
        bias: "bullish",
      },
    },
  ],
  keyLevels: ["上方确认：67,850 上方放量站稳", "核心承接：67,120 - 67,280 回踩不破", "下方否定：66,780 跌破后 15M 无法收回"],
  focus: ["美股开盘前后是否给出顺势放量", "BTC 回踩承接是否伴随主流币同步企稳", "若冲高不放量，优先防一次假突破回落"],
  riskTips: ["没有确认前，不在箱体中位重仓追单", "若美盘前宏观预期扰动放大，先等 15M 收线再执行", "这不是喊单，先定义失效条件，再谈仓位和目标"],
  tradeSetups: {
    shortTerm: {
      label: "短线策略",
      stance: "短线偏多",
      direction: "回落承接做多",
      rationale: "15M 有止跌修复与局部背离缓和，适合做日内反抽，但前提是只拿短波段，不把短多误判成趋势反转。",
      triggerZone: "67,120 - 67,280 出现止跌承接，或重新站回 67,520 后 15M 二次确认。",
      stopLoss: "66,780 有效跌破，且反抽无法重新站回 67,000。",
      targets: ["第一目标：67,680 先减仓", "第二目标：67,980 - 68,120 压力带", "只有放量突破后才看 68,480 附近"],
      invalidation: "若回踩期间放量跌破 66,780，且 VWAP 下方持续承压，则取消短线多单思路，转为只看反弹卖点。",
      executionLine: "短线可以试多，但必须等止跌确认、小仓快进快出；拿不到 15M 承接信号就不硬接。",
    },
    longTerm: {
      label: "长线策略",
      stance: "长线偏空",
      direction: "反弹承压做空",
      rationale: "4H 级别尚未修复，1H 反弹动能衰减，大级别方向和短线节奏不一致时，长线更适合等反弹到压力区后按空头框架执行。",
      triggerZone: "67,850 - 68,120 反弹遇压，且 1H 重新转弱，或跌破 66,780 后反抽不过再跟空。",
      stopLoss: "1H 放量站稳 68,250 上方，且回踩不破，说明大级别可能重新转强。",
      targets: ["第一目标：67,180", "第二目标：66,780", "若 66,780 失守再看 66,200 一线"],
      invalidation: "若价格重新站回 VWAP 与 1H 压力带上方，同时量能同步放大，则长线空单撤销，改为观望或等待趋势重建。",
      executionLine: "长线不在弱势里猜底，优先等反弹进压力区再做空；若方向重新转一致，再考虑切回顺势多头。",
    },
  },
  macroEvents: [
    {
      name: "FOMC",
      nextTimeJst: "2026-05-07 03:00 JST",
      status: "已排期",
      current: "4.25% - 4.50%",
      forecast: "4.25% - 4.50%",
      previous: "4.25% - 4.50%",
      note: "关注点在点阵图、措辞偏鹰/偏鸽和会后美债收益率反应。",
    },
    {
      name: "CPI",
      nextTimeJst: "2026-04-10 21:30 JST",
      status: "待公布",
      current: "待公布",
      forecast: "市场预期待接入",
      previous: "前值待接入",
      note: "若核心 CPI 超预期，风险资产短线可能先承压，BTC 波动通常在数据后放大。",
    },
    {
      name: "非农",
      nextTimeJst: "2026-05-01 21:30 JST",
      status: "已排期",
      current: "待公布",
      forecast: "市场预期待接入",
      previous: "前值待接入",
      note: "重点看新增非农、失业率和薪资增速是否共同指向再通胀或衰退交易。",
    },
  ],
  tradeReviewCalendar: {
    title: "前一日开单建议复盘",
    subtitle: "展示前一天建议的开仓位、止盈止损与当前持仓位置，把胜率亮化给用户直接看。",
    winRate: "71%",
    record: "5 胜 / 1 负 / 1 持仓中",
    highlight: "最近 7 天短线兑现率更高，当前保持亮化展示，先建立首页可验证结果感。",
    entries: [
      {
        date: "04-06",
        setupLabel: "短线多单",
        direction: "long",
        status: "holding",
        confidence: "medium",
        entry: "67,120 - 67,280",
        takeProfit: "67,680 / 67,980",
        stopLoss: "66,780",
        currentZone: "67,540 附近持仓中",
        resultLabel: "持仓中",
        pnlLabel: "+0.6R",
        note: "已走出首段承接，当前看是否继续上摸第一目标。",
      },
      {
        date: "04-05",
        setupLabel: "长线空单",
        direction: "short",
        status: "tp_hit",
        confidence: "high",
        entry: "67,850 - 68,120",
        takeProfit: "67,180 / 66,780",
        stopLoss: "68,250",
        currentZone: "第一目标已兑现",
        resultLabel: "止盈",
        pnlLabel: "+1.8R",
        note: "反弹承压后回落，按第一目标止盈统计胜率。",
      },
      {
        date: "04-04",
        setupLabel: "短线空单",
        direction: "short",
        status: "sl_hit",
        confidence: "low",
        entry: "68,020 附近",
        takeProfit: "67,460",
        stopLoss: "68,260",
        currentZone: "止损已触发",
        resultLabel: "止损",
        pnlLabel: "-1.0R",
        note: "站回压力上方后失效，计入负样本但保留完整轨迹。",
      },
      {
        date: "04-03",
        setupLabel: "短线多单",
        direction: "long",
        status: "tp_hit",
        confidence: "high",
        entry: "66,980 - 67,120",
        takeProfit: "67,520 / 67,820",
        stopLoss: "66,740",
        currentZone: "第二目标附近完成",
        resultLabel: "止盈",
        pnlLabel: "+2.1R",
        note: "承接后一路推进，属于适合亮化展示的标准样本。",
      },
      {
        date: "04-02",
        setupLabel: "长线观望",
        direction: "short",
        status: "watching",
        confidence: "medium",
        entry: "等待 67,850 压力确认",
        takeProfit: "确认后再定",
        stopLoss: "未触发",
        currentZone: "未开仓",
        resultLabel: "观望",
        pnlLabel: "0R",
        note: "没有到位就不做，保留纪律样本而不是强行统计。",
      },
      {
        date: "04-01",
        setupLabel: "短线多单",
        direction: "long",
        status: "tp_hit",
        confidence: "high",
        entry: "66,420 - 66,560",
        takeProfit: "66,980 / 67,180",
        stopLoss: "66,180",
        currentZone: "目标达成",
        resultLabel: "止盈",
        pnlLabel: "+1.5R",
        note: "典型的低吸承接样本，适合放在高亮位。",
      },
      {
        date: "03-31",
        setupLabel: "长线空单",
        direction: "short",
        status: "tp_hit",
        confidence: "medium",
        entry: "67,780 - 67,960",
        takeProfit: "67,120 / 66,900",
        stopLoss: "68,180",
        currentZone: "第一目标兑现",
        resultLabel: "止盈",
        pnlLabel: "+1.2R",
        note: "走势给到反弹承压，符合长线偏空框架。",
      },
    ],
  },
  status: "scheduled",
  source: "manual-seed",
};

const fallbackWorkflowNote: DailyAiMarketWorkflowNote = {
  timezone: "Asia/Tokyo",
  preferredPublishTime: "21:15",
  fallbackPublishTime: "22:15",
  currentMode: "manual-seed",
  dataSource: "seed",
  latestStatus: "seed",
  todayPublished: false,
  todayPublishedAt: null,
  todayAnalysisDate: null,
  nextStep:
    "当前已提供可被 cron 触发的自动发布接口。若尚未建定时器，首页会继续回退到本地固定模板；一旦定时任务开始调用该入口，首页将自动切到最新 published 数据。",
};

export async function getFallbackDailyAiMarketAnalysis(): Promise<DailyAiMarketAnalysis> {
  const generated = await generateDailyAiMarketAutoPayload();
  return generated.payload;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getJstNow(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

function getTodayDateJst(date = new Date()) {
  const jst = getJstNow(date);
  return `${jst.getFullYear()}-${pad(jst.getMonth() + 1)}-${pad(jst.getDate())}`;
}

function normalizeStoredPayload(payload: unknown): DailyAiMarketAnalysis | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as DailyAiMarketAnalysis;
}

function parsePriceNumbers(text: string) {
  return (text.match(/\d{2,3},\d{3}(?:\.\d+)?|\d{5,6}(?:\.\d+)?/g) ?? [])
    .map((item) => Number(item.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

type BtcTickerSnapshot = {
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
};

type TradeReviewSettlementResult = {
  entries: TradeReviewCalendarEntry[];
  stats: ReturnType<typeof buildTradeReviewStats>;
  ticker: BtcTickerSnapshot;
  changed: boolean;
};

async function fetchBtcTickerSnapshot(): Promise<BtcTickerSnapshot | null> {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      lastPrice?: string;
      highPrice?: string;
      lowPrice?: string;
    };

    const lastPrice = Number(data.lastPrice ?? "");
    const highPrice = Number(data.highPrice ?? "");
    const lowPrice = Number(data.lowPrice ?? "");

    if (!Number.isFinite(lastPrice) || !Number.isFinite(highPrice) || !Number.isFinite(lowPrice)) {
      return null;
    }

    return { lastPrice, highPrice, lowPrice };
  } catch {
    return null;
  }
}

function settleTradeReviewEntry(entry: TradeReviewCalendarEntry, ticker: BtcTickerSnapshot): TradeReviewCalendarEntry {
  if (entry.status !== "holding") {
    return entry;
  }

  const stopLoss = entry.stopLossPrice ?? parsePriceNumbers(entry.stopLoss)[0];
  const takeProfit =
    entry.takeProfitPrice ??
    (entry.direction === "short"
      ? Math.min(...parsePriceNumbers(entry.takeProfit))
      : Math.max(...parsePriceNumbers(entry.takeProfit)));

  if (!Number.isFinite(stopLoss) || !Number.isFinite(takeProfit)) {
    return {
      ...entry,
      currentZone: `最新价 ${formatPrice(ticker.lastPrice)}，等待价格规则补齐`,
    };
  }

  if (entry.direction === "short") {
    if (ticker.lastPrice <= takeProfit) {
      return {
        ...entry,
        status: "tp_hit",
        resultLabel: "止盈",
        pnlLabel: "已止盈",
        currentZone: `最新价 ${formatPrice(ticker.lastPrice)} 已下破止盈 ${formatPrice(takeProfit)}`,
      };
    }

    if (ticker.lastPrice >= stopLoss) {
      return {
        ...entry,
        status: "sl_hit",
        resultLabel: "止损",
        pnlLabel: "已止损",
        currentZone: `最新价 ${formatPrice(ticker.lastPrice)} 已上破止损 ${formatPrice(stopLoss)}`,
      };
    }

    if (ticker.lowPrice <= takeProfit) {
      return {
        ...entry,
        status: "tp_hit",
        resultLabel: "止盈",
        pnlLabel: "已止盈",
        currentZone: `24h 最低 ${formatPrice(ticker.lowPrice)} 已触发止盈 ${formatPrice(takeProfit)}`,
      };
    }

    if (ticker.highPrice >= stopLoss) {
      return {
        ...entry,
        status: "sl_hit",
        resultLabel: "止损",
        pnlLabel: "已止损",
        currentZone: `24h 最高 ${formatPrice(ticker.highPrice)} 已触发止损 ${formatPrice(stopLoss)}`,
      };
    }
  } else {
    if (ticker.lastPrice >= takeProfit) {
      return {
        ...entry,
        status: "tp_hit",
        resultLabel: "止盈",
        pnlLabel: "已止盈",
        currentZone: `最新价 ${formatPrice(ticker.lastPrice)} 已上破止盈 ${formatPrice(takeProfit)}`,
      };
    }

    if (ticker.lastPrice <= stopLoss) {
      return {
        ...entry,
        status: "sl_hit",
        resultLabel: "止损",
        pnlLabel: "已止损",
        currentZone: `最新价 ${formatPrice(ticker.lastPrice)} 已下破止损 ${formatPrice(stopLoss)}`,
      };
    }

    if (ticker.highPrice >= takeProfit) {
      return {
        ...entry,
        status: "tp_hit",
        resultLabel: "止盈",
        pnlLabel: "已止盈",
        currentZone: `24h 最高 ${formatPrice(ticker.highPrice)} 已触发止盈 ${formatPrice(takeProfit)}`,
      };
    }

    if (ticker.lowPrice <= stopLoss) {
      return {
        ...entry,
        status: "sl_hit",
        resultLabel: "止损",
        pnlLabel: "已止损",
        currentZone: `24h 最低 ${formatPrice(ticker.lowPrice)} 已触发止损 ${formatPrice(stopLoss)}`,
      };
    }
  }

  return {
    ...entry,
    currentZone: `最新价 ${formatPrice(ticker.lastPrice)}，24h 区间 ${formatPrice(ticker.lowPrice)} - ${formatPrice(ticker.highPrice)}`,
  };
}

async function settleTradeReviewCalendar(analysis: DailyAiMarketAnalysis): Promise<TradeReviewSettlementResult | null> {
  const entries = analysis.tradeReviewCalendar?.entries ?? [];

  if (entries.length === 0) {
    return null;
  }

  const needsSettlement = entries.some((item) => item.status === "holding");
  if (!needsSettlement) {
    return null;
  }

  const ticker = await fetchBtcTickerSnapshot();
  if (!ticker) {
    return null;
  }

  const settledEntries = entries.map((entry) => settleTradeReviewEntry(entry, ticker));
  const stats = buildTradeReviewStats(settledEntries);
  const changed = settledEntries.some((entry, index) => {
    const previous = entries[index];
    return previous && (entry.status !== previous.status || entry.resultLabel !== previous.resultLabel || entry.pnlLabel !== previous.pnlLabel || entry.currentZone !== previous.currentZone);
  });

  return {
    entries: settledEntries,
    stats,
    ticker,
    changed,
  };
}

async function applyLiveTradeReviewSettlement(analysis: DailyAiMarketAnalysis): Promise<DailyAiMarketAnalysis> {
  const settled = await settleTradeReviewCalendar(analysis);

  if (!settled) {
    return analysis;
  }

  return {
    ...analysis,
    tradeReviewCalendar: {
      ...analysis.tradeReviewCalendar,
      entries: settled.entries,
      winRate: settled.stats.winRate,
      record: settled.stats.record,
      highlight: `${settled.stats.highlight} 当前 BTC 最新价 ${formatPrice(settled.ticker.lastPrice)}，24h 区间 ${formatPrice(settled.ticker.lowPrice)} - ${formatPrice(settled.ticker.highPrice)}。`,
    },
  };
}

export async function getLatestPublishedDailyAiMarketRecord(): Promise<DailyAiMarketRecord | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_ai_market_analyses")
    .select("id, slug, analysis_date, publish_at_jst, status, source, payload, created_at, updated_at, published_at")
    .eq("status", "published")
    .order("publish_at_jst", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<DailyAiMarketRecord>();

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation") || message.includes("schema cache")) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const payload = normalizeStoredPayload(data.payload);
  if (!payload) {
    return null;
  }

  return {
    ...data,
    payload,
  };
}

export async function getDailyAiMarketAnalysis(): Promise<DailyAiMarketAnalysis> {
  const latest = await getLatestPublishedDailyAiMarketRecord();
  const analysis = latest?.payload ?? await getFallbackDailyAiMarketAnalysis();

  if (!latest) {
    return applyLiveTradeReviewSettlement(analysis);
  }

  const settled = await settleTradeReviewCalendar(analysis);
  if (!settled) {
    return analysis;
  }

  const nextAnalysis: DailyAiMarketAnalysis = {
    ...analysis,
    tradeReviewCalendar: {
      ...analysis.tradeReviewCalendar,
      entries: settled.entries,
      winRate: settled.stats.winRate,
      record: settled.stats.record,
      highlight: `${settled.stats.highlight} 当前 BTC 最新价 ${formatPrice(settled.ticker.lastPrice)}，24h 区间 ${formatPrice(settled.ticker.lowPrice)} - ${formatPrice(settled.ticker.highPrice)}。`,
    },
  };

  if (settled.changed && isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      await supabase
        .from("daily_ai_market_analyses")
        .update({
          payload: nextAnalysis,
          updated_at: new Date().toISOString(),
        })
        .eq("id", latest.id);
    } catch {
      // Best-effort writeback; keep serving the settled in-memory result.
    }
  }

  return nextAnalysis;
}

export async function getTodayPublishedDailyAiMarketRecord(): Promise<DailyAiMarketRecord | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const today = getTodayDateJst();
  const { data, error } = await supabase
    .from("daily_ai_market_analyses")
    .select("id, slug, analysis_date, publish_at_jst, status, source, payload, created_at, updated_at, published_at")
    .eq("status", "published")
    .eq("analysis_date", today)
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<DailyAiMarketRecord>();

  if (error) {
    const message = String(error.message ?? "").toLowerCase();
    if (message.includes("does not exist") || message.includes("relation") || message.includes("schema cache")) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const payload = normalizeStoredPayload(data.payload);
  if (!payload) {
    return null;
  }

  return {
    ...data,
    payload,
  };
}

export async function getDailyAiMarketWorkflowNote(): Promise<DailyAiMarketWorkflowNote> {
  const [latest, todayPublishedRecord] = await Promise.all([
    getLatestPublishedDailyAiMarketRecord(),
    getTodayPublishedDailyAiMarketRecord(),
  ]);

  if (!latest) {
    return fallbackWorkflowNote;
  }

  return {
    timezone: "Asia/Tokyo",
    preferredPublishTime: "21:15",
    fallbackPublishTime: "22:15",
    currentMode: "supabase",
    dataSource: "supabase",
    latestStatus: latest.status,
    todayPublished: Boolean(todayPublishedRecord),
    todayPublishedAt: todayPublishedRecord?.published_at ?? todayPublishedRecord?.publish_at_jst ?? null,
    todayAnalysisDate: todayPublishedRecord?.analysis_date ?? null,
    nextStep:
      "当前首页已优先读取 Supabase 中最新 published 分析。自动发布默认在 21:15 JST 跑一次，若错过或失败，会在 22:15 JST 再补跑一次同日发布。",
  };
}
