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
  status: Exclude<DailyAiMarketStatus, "draft">;
  source: DailyAiMarketSource;
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
  currentMode: "manual-seed" | "supabase";
  nextStep: string;
  dataSource: "seed" | "supabase";
  latestStatus: DailyAiMarketStatus | "seed";
};

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
  status: "scheduled",
  source: "manual-seed",
};

const fallbackWorkflowNote: DailyAiMarketWorkflowNote = {
  timezone: "Asia/Tokyo",
  preferredPublishTime: "21:15",
  currentMode: "manual-seed",
  dataSource: "seed",
  latestStatus: "seed",
  nextStep:
    "当前已提供可被 cron 触发的自动发布接口。若尚未建定时器，首页会继续回退到本地固定模板；一旦定时任务开始调用该入口，首页将自动切到最新 published 数据。",
};

export function getFallbackDailyAiMarketAnalysis(): DailyAiMarketAnalysis {
  return generateDailyAiMarketAutoPayload().payload;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function normalizeStoredPayload(payload: unknown): DailyAiMarketAnalysis | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as DailyAiMarketAnalysis;
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
  return latest?.payload ?? getFallbackDailyAiMarketAnalysis();
}

export async function getDailyAiMarketWorkflowNote(): Promise<DailyAiMarketWorkflowNote> {
  const latest = await getLatestPublishedDailyAiMarketRecord();

  if (!latest) {
    return fallbackWorkflowNote;
  }

  return {
    timezone: "Asia/Tokyo",
    preferredPublishTime: "21:15",
    currentMode: "supabase",
    dataSource: "supabase",
    latestStatus: latest.status,
    nextStep:
      "当前首页已优先读取 Supabase 中最新 published 分析。要变成真正每日自动更新，只差把生成脚本接进 cron / 定时任务，在每天 21:15 JST 前自动写入并发布。",
  };
}
