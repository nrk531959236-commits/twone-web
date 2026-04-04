import type { AssistantReplyParams, ChatMessage } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStructuredReply(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("btc") || normalized.includes("eth") || normalized.includes("结构")) {
    return [
      "先给你一个可执行的判断框架：",
      "1. 先看高一层级趋势是否仍然维持更高高点 / 更高低点，别在局部反弹里误判反转。",
      "2. 再看当前反弹是否伴随成交量和关键位回收；如果只是快速抽回但站不稳，诱多概率会明显提高。",
      "3. 交易上优先定义 invalidation，别先想赚多少，先想错了怎么退。",
      "如果你下一步接入真实行情源，这里可以继续叠加实时价格、关键支撑阻力和风险回报比。",
    ].join("\n");
  }

  if (normalized.includes("复盘") || normalized.includes("亏损") || normalized.includes("交易")) {
    return [
      "这笔交易建议按四段拆：",
      "1. 入场逻辑：当时依据的是结构、情绪还是预判？",
      "2. 风控设置：止损是否在入场前就定义好，还是亏损后才临时处理？",
      "3. 执行偏差：有没有追单、扛单、加仓失控、提前止盈？",
      "4. 可复用结论：以后遇到同类 setup，保留什么、删除什么。",
      "后续接真 AI 时，这里很适合输出固定格式复盘卡片并落库。",
    ].join("\n");
  }

  if (normalized.includes("watchlist") || normalized.includes("盯") || normalized.includes("列表")) {
    return [
      "今天的 watchlist 可以先按这三层筛：",
      "1. 主流币：BTC / ETH，负责给方向和风险偏好定调。",
      "2. 强势板块：只看有成交、有叙事、有相对强度的赛道。",
      "3. 个币触发器：只留下接近关键位、即将突破或即将失守的标的。",
      "这样不会把精力浪费在 20 个没到位置的票上。",
    ].join("\n");
  }

  return [
    "收到。当前版本先用本地 mock 打通交互，但我会尽量按真实助手的方式回答。",
    "你可以继续给我更具体的上下文，比如：周期、标的、你的持仓方向、风险承受范围、或者你想得到的是观点、计划还是复盘。",
    "后续接入真实模型后，这一层可以直接替换成 API 调用，不需要重写页面交互。",
  ].join("\n");
}

export async function createAssistantReply({ message, history }: AssistantReplyParams): Promise<ChatMessage> {
  await delay(900 + Math.round(Math.random() * 500));

  if (message.toLowerCase().includes("error") || message.toLowerCase().includes("报错")) {
    throw new Error("模拟回复失败：当前会话服务波动，请重新发送一次。");
  }

  const reply = buildStructuredReply(message);

  return {
    id: `assistant-${Date.now()}-${history.length}`,
    role: "assistant",
    title: "Twone AI Assistant",
    content: reply,
    createdAt: new Date().toISOString(),
  };
}
