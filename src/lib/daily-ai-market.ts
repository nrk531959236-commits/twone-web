export type DailyAiMarketAnalysis = {
  title: string;
  publishAtJst: string;
  marketBias: "偏多" | "中性偏多" | "震荡" | "中性偏空" | "偏空";
  conviction: string;
  headline: string;
  summary: string;
  timeframe: string;
  structure: string;
  vwap: string;
  macd: string;
  rsi: string;
  keyLevels: string[];
  focus: string[];
  riskTips: string[];
  tradeSetups: {
    shortTerm: {
      label: string;
      direction: "区间低吸做多" | "回落承接做多" | "反弹承压做空" | "突破追多" | "跌破追空";
      triggerZone: string;
      stopLoss: string;
      targets: string[];
      invalidation: string;
      executionLine: string;
    };
    longTerm: {
      label: string;
      direction: "区间低吸做多" | "回落承接做多" | "反弹承压做空" | "突破追多" | "跌破追空";
      triggerZone: string;
      stopLoss: string;
      targets: string[];
      invalidation: string;
      executionLine: string;
    };
  };
  macroEvents: Array<{
    name: "FOMC" | "CPI" | "非农";
    nextTimeJst: string;
    status: "待公布" | "已排期";
    current?: string;
    forecast?: string;
    previous?: string;
    note: string;
  }>;
  status: "scheduled" | "published";
  source: "manual-seed" | "admin" | "auto";
};

const fallbackDailyAnalysis: DailyAiMarketAnalysis = {
  title: "今日 AI 行情分析",
  publishAtJst: "2026-04-05T21:15:00+09:00",
  marketBias: "中性偏多",
  conviction: "主结论：今晚更偏回踩承接，不追中间价突破。",
  headline: "BTC 维持高位震荡偏强，真正的机会在回踩确认后的二次进攻。",
  summary:
    "当前市场还没有走成趋势单边，最优解不是提前幻想单边加速，而是等美股开盘前后给出结构确认。大级别暂未转空，但短线中间位盈亏比一般，执行上优先做回踩承接与确认后加仓。",
  timeframe: "主观察 15M / 1H，执行参考 4H 结构不破。",
  structure: "1H 延续高低点抬升，15M 进入高位箱体整理，若回踩不破 VWAP 与前低，结构仍偏强。",
  vwap: "价格若持续运行在日内 VWAP 上方，说明多头承接仍在；跌破后需等重新站回再考虑追随。",
  macd: "15M MACD 缩量靠近零轴，等待二次金叉确认；1H MACD 仍在多头区但动能放缓。",
  rsi: "15M RSI 回落至 52-58 更健康，若直接冲上 70 上方容易进入短线透支区。",
  keyLevels: ["上方确认：67,850 上方放量站稳", "核心承接：67,120 - 67,280 回踩不破", "下方否定：66,780 跌破后 15M 无法收回"],
  focus: ["美股开盘前后是否给出顺势放量", "BTC 回踩承接是否伴随主流币同步企稳", "若冲高不放量，优先防一次假突破回落"],
  riskTips: ["没有确认前，不在箱体中位重仓追单", "若美盘前宏观预期扰动放大，先等 15M 收线再执行", "这不是喊单，先定义失效条件，再谈仓位和目标"],
  tradeSetups: {
    shortTerm: {
      label: "短线策略",
      direction: "回落承接做多",
      triggerZone: "67,120 - 67,280 出现止跌承接，或 67,520 重新站回后 15M 二次确认。",
      stopLoss: "66,780 有效跌破，且反抽无法重新站回 67,000。",
      targets: ["第一目标：67,680 先减仓", "第二目标：67,980 - 68,120 压力带", "放量突破后看 68,480 附近"],
      invalidation: "若回踩期间放量跌破 66,780 且 VWAP 下方持续承压，则取消短线多单思路。",
      executionLine: "先等回踩止跌信号，再小仓试单；拿到 15M 确认后再加，不抢第一根。",
    },
    longTerm: {
      label: "长线策略",
      direction: "突破追多",
      triggerZone: "1H 放量突破 67,850 并站稳，回踩不破后再考虑顺势布局。",
      stopLoss: "1H 收回箱体内部，且 67,450 下方持续滞留。",
      targets: ["第一目标：68,600", "第二目标：69,200", "趋势延续再看 69,850 一线"],
      invalidation: "如果突破后量能衰减，且 1H 再次跌回 67,450 下方，则视为假突破，不做趋势追随。",
      executionLine: "长线不抄中间位，只做放量突破后的回踩确认，宁可慢一拍，也不要追在假动作上。",
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

export function getDailyAiMarketAnalysis(): DailyAiMarketAnalysis {
  return fallbackDailyAnalysis;
}

export function getDailyAiMarketWorkflowNote() {
  return {
    timezone: "Asia/Tokyo",
    preferredPublishTime: "21:15",
    currentMode: "manual-seed",
    nextStep:
      "后续可接后台发布或定时脚本，在 21:15 JST 前写入数据库/接口，再由首页自动读取最新一条。当前首页中的开单建议和宏观事件时间卡也都来自同一份本地 seed 数据。",
  };
}
