export type DailyAiMarketAnalysis = {
  title: string;
  publishAtJst: string;
  marketBias: "偏多" | "中性偏多" | "震荡" | "中性偏空" | "偏空";
  summary: string;
  keyLevels: string[];
  focus: string[];
  riskTips: string[];
  tradeSetup: {
    direction: "区间低吸做多" | "回落承接做多" | "反弹承压做空" | "突破追多" | "跌破追空";
    triggerZone: string;
    stopLoss: string;
    targets: string[];
    invalidation: string;
    executionLine: string;
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
  title: "今晚 AI 行情分析",
  publishAtJst: "2026-04-05T21:15:00+09:00",
  marketBias: "震荡",
  summary:
    "当前先以 BTC 主导的区间博弈思路处理：大级别没有完全破坏，但短线追单胜率一般，更适合等关键位确认后再做方向选择。首页先展示固定时段的 AI 观点，减少用户一上来就到处问杂问题。",
  keyLevels: ["上方确认：BTC 关键压力位上破并站稳", "下方否定：跌破日内关键支撑后转弱", "中间处理：区间内部以快进快出为主"],
  focus: ["BTC 4H 结构是否延续", "主流币相对强弱切换", "晚间美盘时段波动放大风险"],
  riskTips: ["没有确认前，别在中间价位重仓追突破", "如果成交量跟不上，假突破概率会明显提高", "这不是喊单，优先定义失效条件再行动"],
  tradeSetup: {
    direction: "区间低吸做多",
    triggerZone: "BTC 回踩 66,800 - 67,200 区间出现止跌承接，或 67,350 上方重新收回并站稳 15M 结构",
    stopLoss: "有效跌破 66,380，且 15M 收线无法重新站回",
    targets: ["第一目标：68,000 附近先减仓", "第二目标：68,450 - 68,700 压力带", "若放量突破，再看 69,200 一线"],
    invalidation: "如果美盘前后直接放量跌破 66,380，且反抽不回区间，就放弃低吸多单思路",
    executionLine: "只在触发区间做，先小仓试单，拿到结构确认再加，不在中间价追单。",
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
