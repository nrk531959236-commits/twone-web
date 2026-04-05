export type DailyAiMarketAnalysis = {
  title: string;
  publishAtJst: string;
  marketBias: "偏多" | "中性偏多" | "震荡" | "中性偏空" | "偏空";
  summary: string;
  keyLevels: string[];
  focus: string[];
  riskTips: string[];
  status: "scheduled" | "published";
  source: "manual-seed" | "admin" | "auto";
};

const fallbackDailyAnalysis: DailyAiMarketAnalysis = {
  title: "今晚 AI 行情分析",
  publishAtJst: "2026-04-05T21:15:00+09:00",
  marketBias: "震荡",
  summary:
    "当前先以 BTC 主导的区间博弈思路处理：大级别没有完全破坏，但短线追单胜率一般，更适合等关键位确认后再做方向选择。首页先展示固定时段的 AI 观点，减少用户一上来就到处问杂问题。",
  keyLevels: ["上方确认：BTC 关键压力位上破并站稳", "下方否定：跌破日内关键支撑后转弱", "中间处理：区间内部以快进快出为主"],
  focus: ["BTC 4H 结构是否延续", "主流币相对强弱切换", "晚间美盘时段波动放大风险"],
  riskTips: ["没有确认前，别在中间价位重仓追突破", "如果成交量跟不上，假突破概率会明显提高", "这不是喊单，优先定义失效条件再行动"],
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
      "后续可接后台发布或定时脚本，在 21:15 JST 前写入数据库/接口，再由首页自动读取最新一条。",
  };
}
