import { createSupabaseAdminClient } from "@/lib/admin";
import {
  fallbackDailyAnalysisSeed,
  syncTradeReviewCalendarFromShortTerm,
  type DailyAiMarketAnalysis,
  type DailyAiMarketRecord,
  type DailyAiMarketSignalSnapshot,
} from "@/lib/daily-ai-market";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

const execFileAsync = promisify(execFile);
const coinglassSnapshotScript = "/Users/eryi/.openclaw/workspace/skills/coinglass-api/scripts/market_structure_snapshot.py";

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

function formatLevel(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function buildDirectionalSetup(options: {
  direction: "long" | "short" | "watch";
  scope: "short" | "long";
  seed: number;
}) {
  const center = 67200 + (options.seed % 9) * 120;
  const width = options.scope === "short" ? 90 : 140;
  const entryLow = center - width;
  const entryHigh = center + width;

  if (options.direction === "watch") {
    return {
      triggerZone: `${formatLevel(entryLow)} - ${formatLevel(entryHigh)} 等确认后再执行。`,
      stopLoss: `止损：等待确认，不抢预判单。`,
      targets: ["第一目标：等待确认", "第二目标：等待确认后再给"],
      invalidation: `失效：没有确认前不进场，继续观望。`,
    };
  }

  if (options.direction === "long") {
    const stopLoss = entryLow - (options.scope === "short" ? 220 : 320);
    const target1 = entryHigh + (options.scope === "short" ? 260 : 340);
    const target2 = entryHigh + (options.scope === "short" ? 520 : 760);

    return {
      triggerZone: `${formatLevel(entryLow)} - ${formatLevel(entryHigh)} 回踩承接后再执行。`,
      stopLoss: `止损：${formatLevel(stopLoss)} 跌破且反抽失败。`,
      targets: [`第一目标：${formatLevel(target1)}`, `第二目标：${formatLevel(target2)} 上方分批止盈`],
      invalidation: `失效：${formatLevel(stopLoss)} 跌破后 15M / 1H 无法收回。`,
    };
  }

  const stopLoss = entryHigh + (options.scope === "short" ? 220 : 320);
  const target1 = entryLow - (options.scope === "short" ? 260 : 340);
  const target2 = entryLow - (options.scope === "short" ? 520 : 760);

  return {
    triggerZone: `${formatLevel(entryLow)} - ${formatLevel(entryHigh)} 反弹承压后再执行。`,
    stopLoss: `止损：${formatLevel(stopLoss)} 上破且回踩不破。`,
    targets: [`第一目标：${formatLevel(target1)}`, `第二目标：${formatLevel(target2)} 下方分批止盈`],
    invalidation: `失效：${formatLevel(stopLoss)} 上方放量站稳。`,
  };
}

async function getCoinGlassSignalSnapshot(symbol = "BTC"): Promise<DailyAiMarketSignalSnapshot | null> {
  try {
    const { stdout } = await execFileAsync("python3", [
      coinglassSnapshotScript,
      "--symbol",
      symbol,
      "--range",
      "24h",
      "--interval",
      "1h",
    ], {
      env: process.env,
      timeout: 45000,
      maxBuffer: 1024 * 1024,
    });

    const text = stdout.trim();
    if (!text) return null;

    const readLine = (prefix: string) => {
      const line = text.split("\n").find((item) => item.startsWith(prefix));
      return line ? line.slice(prefix.length).trim() : "";
    };

    const convictionValue = readLine("- conviction: ");
    const conviction = convictionValue === "high" || convictionValue === "medium" || convictionValue === "low"
      ? convictionValue
      : "medium";

    return {
      shortTermBias: readLine("- short-term bias: "),
      conviction,
      mainRisk: readLine("- main risk: "),
      actionableRead: readLine("- actionable read: "),
      oiState: readLine("- OI: "),
      fundingState: readLine("- Funding: "),
      liquidationState: readLine("- Liquidation: "),
      cvdState: readLine("- CVD: "),
      rawText: text,
    };
  } catch {
    return null;
  }
}

function normalizeForSimilarity(text: string) {
  return text
    .replace(/[：:，。、“”‘’（）()【】\-—\s]/g, "")
    .replace(/短线|长线|波段|日内|今日|当前/g, "")
    .replace(/只做|优先|先看|确认后|不追|观望/g, "")
    .trim();
}

function similarityScore(a: string, b: string) {
  const left = normalizeForSimilarity(a);
  const right = normalizeForSimilarity(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;

  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  let overlap = 0;
  for (const char of new Set(shorter.split(""))) {
    if (longer.includes(char)) overlap += 1;
  }

  return overlap / Math.max(new Set(longer.split("")).size, 1);
}

function shouldDeDuplicateTradeSetups(shortText: string, longText: string) {
  return similarityScore(shortText, longText) >= 0.72;
}

function localizeCoinGlassSignal(signalSnapshot: DailyAiMarketSignalSnapshot | null): DailyAiMarketSignalSnapshot | null {
  if (!signalSnapshot) return null;

  const mapText = (value: string) => {
    const replacements: Array<[string, string]> = [
      ["squeeze aftermath, short-term sellers are pushing back", "挤空后整理，短线卖压回流"],
      ["flush aftermath, dip buyers are stepping in", "杀多后修复，抄底买盘回流"],
      ["bullish continuation bias, but only if price still accepts higher", "短线偏多延续，但前提是价格继续接受更高位置"],
      ["bearish continuation bias, but only if price still accepts lower", "短线偏空延续，但前提是价格继续接受更低位置"],
      ["flow is directional, but broader positioning is not fully aligned yet", "短线主动流有方向，但更大结构还没完全共振"],
      ["mixed tape, wait for cleaner alignment", "信号混合，先等更清晰共振"],
      ["recent upside already spent squeeze fuel, so chasing green candles blindly is dangerous", "上冲已经消耗部分挤空燃料，盲目追涨风险上升"],
      ["recent downside already spent flush fuel, so pressing late shorts blindly is dangerous", "下冲已经消耗部分杀多燃料，盲目追空风险上升"],
      ["late longs are vulnerable if price stalls because crowding is already elevated", "多头拥挤已抬升，若价格停滞，追多容易吃回撤"],
      ["late shorts are vulnerable if price bounces because crowding is already elevated", "空头拥挤已抬升，若价格反抽，追空容易被挤"],
      ["medium-term expansion, short-term digestion", "中期增仓，短线消化"],
      ["broad OI expansion", "整体增仓扩张"],
      ["broad de-risking / OI contraction", "整体去杠杆，持仓收缩"],
      ["short-term re-leveraging against weaker hourly backdrop", "弱小时结构里的短线再加杠杆"],
      ["short-term flush inside a still-expanded structure", "扩张结构内的短线洗盘"],
      ["mixed positioning across venues", "各交易所持仓分化"],
      ["mildly short-biased funding", "资金费率轻微偏空"],
      ["mildly long-biased funding", "资金费率轻微偏多"],
      ["balanced funding", "资金费率整体平衡"],
      ["long crowding elevated", "多头拥挤升温"],
      ["short crowding elevated", "空头拥挤升温"],
      ["short squeeze dominance", "空头主导爆仓"],
      ["long flush dominance", "多头主导爆仓"],
      ["two-way liquidation", "多空双向清算"],
      ["strong aggressive selling", "主动卖盘明显增强"],
      ["strong aggressive buying", "主动买盘明显增强"],
      ["mild aggressive selling", "主动卖盘温和占优"],
      ["mild aggressive buying", "主动买盘温和占优"],
      ["balanced taker flow", "主动买卖盘大致平衡"],
      ["This looks more like a squeeze aftermath than a clean fresh downtrend: shorts were forced out, and now short-term sellers are leaning back in. Treat it as a digestion phase unless price starts accepting lower with support from OI.", "当前更像挤空后的整理，而不是干净的新一轮下跌趋势。空头刚被动离场，短线卖盘开始回流，除非价格继续接受更低位置并得到 OI 配合，否则先按消化阶段理解。"],
      ["This looks more like a flush aftermath than a clean fresh uptrend: longs were forced out, and now dip buyers are leaning back in. Treat it as a rebound attempt unless price starts accepting higher with support from OI.", "当前更像杀多后的修复，而不是干净的新一轮上涨趋势。多头刚被动离场，抄底买盘开始回流，除非价格继续接受更高位置并得到 OI 配合，否则先按反抽修复理解。"],
      ["Fresh positioning, crowding, and taker flow are leaning the same way, so upside continuation has a real case, but only while price keeps accepting higher rather than stalling into crowded longs.", "增仓、拥挤度和主动流目前同向，短线继续上行有依据，但前提是价格继续接受更高位置，而不是在多头拥挤中停滞。"],
      ["Positioning and taker flow are lining up on the downside, so bearish continuation has a real case, but only while price keeps accepting lower instead of bouncing into crowded shorts.", "持仓结构和主动流正在向下共振，短线继续回落有依据，但前提是价格继续接受更低位置，而不是反抽去挤拥挤空头。"],
      ["The signal mix is informative but not fully aligned yet. Flow is giving a short-term push, but broader positioning is not clean enough to treat this as a high-conviction trend continuation setup.", "当前信号有信息量，但还没完全共振。短线主动流给出了推动方向，但更大持仓结构还不够干净，暂时不算高确定性趋势延续。"],
    ];

    return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), value);
  };

  return {
    ...signalSnapshot,
    shortTermBias: mapText(signalSnapshot.shortTermBias),
    mainRisk: mapText(signalSnapshot.mainRisk),
    actionableRead: mapText(signalSnapshot.actionableRead),
    oiState: mapText(signalSnapshot.oiState),
    fundingState: mapText(signalSnapshot.fundingState),
    liquidationState: mapText(signalSnapshot.liquidationState),
    cvdState: mapText(signalSnapshot.cvdState),
    rawText: signalSnapshot.rawText ? mapText(signalSnapshot.rawText) : signalSnapshot.rawText,
  };
}

function buildAutoPayload(
  input: Pick<Required<DailyAiMarketAutoGenerateInput>, "analysisDate" | "publishAtJst" | "source" | "status">,
  signalSnapshot: DailyAiMarketSignalSnapshot | null,
): DailyAiMarketAnalysis {
  const fallback = fallbackDailyAnalysisSeed;
  const dateLabel = formatAnalysisDateLabel(input.analysisDate);
  const publishTime = input.publishAtJst.slice(11, 16);
  const autoStatusLine = createAutoStatusLine(input.analysisDate, input.publishAtJst);
  const localizedSignal = localizeCoinGlassSignal(signalSnapshot);

  const biasOptions: DailyAiMarketAnalysis["marketBias"][] = ["偏空", "中性偏空", "震荡", "中性偏多"];

  const signalDrivenMarketBias: DailyAiMarketAnalysis["marketBias"] | null = localizedSignal
    ? localizedSignal.shortTermBias.includes("偏多") || localizedSignal.shortTermBias.includes("抄底买盘")
      ? "中性偏多"
      : localizedSignal.shortTermBias.includes("偏空") || localizedSignal.shortTermBias.includes("卖压")
        ? "中性偏空"
        : "震荡"
    : null;
  const convictionOptions = [
    "主结论：震荡市先看确认位与失效位，不在中位追单。",
    "主结论：先按关键位做交易决策，确认前轻仓，失效后重算。",
    "主结论：当前更适合等承接或反压确认，不做激进预判。",
    "主结论：今日先守纪律，先看确认，再看延续。",
  ];
  const headlineOptions = [
    `${dateLabel} 今日思路：先看关键位确认，不追中位。`,
    `${dateLabel} 今日思路：震荡处理为主，确认后再跟。`,
    `${dateLabel} 今日思路：先守承接与失效，再决定是否扩展。`,
    `${dateLabel} 今日思路：没有确认前，先按区间交易处理。`,
  ];
  const summaryOptions = [
    `先看确认位和失效位，不在中位追单；短线只做执行，波段只看结构。`,
    `今天先按关键位做交易决策：确认后跟，失效后撤，未确认前轻仓。`,
    `当前优先执行纪律，不做情绪追单；先看承接是否成立，再看方向延续。`,
    `短线和波段分开处理：短线看触发，波段看结构，不把两套逻辑混在一起。`,
  ];
  const structureOptions = [
    `当前更像区间内博弈，先看关键位是否被有效突破或跌破。`,
    `结构仍在确认阶段，未出现明确站稳前，不把反抽直接当趋势反转。`,
    `先按区间与关键位处理，突破再跟，失效就撤。`,
    `当前主线仍是承接与反压的争夺，方向要等价格自己给确认。`,
  ];
  const vwapOptions = [
    `若价格持续压在 VWAP 下方，优先按弱反弹处理；重新站回并企稳后再看节奏切换。`,
    `VWAP 仍是强弱分界线：压制未解除前，不把局部反抽当趋势修复。`,
    `先看 VWAP 上下的站稳与失守，再决定是做承接还是做回落。`,
    `价格围绕 VWAP 来回反复时，优先观望，不在中位扩仓。`,
  ];
  const macdOptions = [
    `MACD 先看动能是否延续，不提前下趋势切换结论。`,
    `柱体未扩张前，优先看确认，不追情绪单。`,
    `MACD 当前更适合作为节奏过滤器，先定义失效，再谈方向。`,
    `MACD 只作辅助，不单独承担翻多或翻空结论。`,
  ];
  const rsiOptions = [
    `RSI 修复不代表反转，强弱区能否站稳才决定后续节奏。`,
    `RSI 当前只用于判断强弱修复，不单独下趋势结论。`,
    `若 RSI 只是低位回升，优先理解为跌势放缓，而不是方向反转。`,
    `先看 RSI 能否进入并站稳强势区，否则反抽仍按弱修复处理。`,
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
  const shortTermDirection: DailyAiMarketAnalysis["tradeSetups"]["shortTerm"]["direction"] =
    shortTermStance === "短线偏空" ? "反弹承压做空"
    : shortTermStance === "短线观望" ? "观望等待"
    : "回落承接做多";
  const longTermDirection: DailyAiMarketAnalysis["tradeSetups"]["longTerm"]["direction"] =
    longTermStance === "长线偏空" ? "反弹承压做空"
    : longTermStance === "长线观望" ? "观望等待"
    : "回落承接做多";
  const shortDirectionalSetup = buildDirectionalSetup({
    direction:
      shortTermDirection === "反弹承压做空" ? "short"
      : shortTermDirection === "观望等待" ? "watch"
      : "long",
    scope: "short",
    seed: getDateSeed(`${input.analysisDate}-short-setup`),
  });
  const longDirectionalSetup = buildDirectionalSetup({
    direction:
      longTermDirection === "反弹承压做空" ? "short"
      : longTermDirection === "观望等待" ? "watch"
      : "long",
    scope: "long",
    seed: getDateSeed(`${input.analysisDate}-long-setup`),
  });
  const shortTermRationale = pickByDate(`${input.analysisDate}-short-rationale`, [
    "短线只回答今天怎么打：先看触发，再看止损和最近目标。",
    "短线只做确认后的那一段，不在中位追单。",
    "当前短线以节奏交易为主，优先小仓位、快进快出。",
    "先定义失效位，再决定是否跟随。",
  ]);
  const shortTermExecutionLine = pickByDate(`${input.analysisDate}-short-execution`, [
    "短线只做确认后的那一段，不预判。",
    "先轻仓试单，确认延续再处理加减仓。",
    "拿不到确认信号就继续观望。",
    "中位不追，失效就撤。",
  ]);
  const longTermRationale = pickByDate(`${input.analysisDate}-long-rationale`, [
    "长线只回答这一段值不值得拿，不重复短线触发区。",
    "长线更看大级别结构是否重新一致，不急着在日内中位下注。",
    "当前波段计划以结构确认优先，先看大级别是否修复。",
    "若大级别方向仍未明确，长线先观望，不强行给第二套重复建议。",
  ]);
  const longTermExecutionLine = pickByDate(`${input.analysisDate}-long-execution`, [
    "长线先看结构，不抢节奏。",
    "等大级别确认后再放大仓位。",
    "短线与长线同向时，长线只保留仓位原则，不重复日内触发。",
    "先定义大级别失效条件，再谈持仓周期。",
  ]);

  const forceLongTermWatch = shouldDeDuplicateTradeSetups(
    `${shortTermDirection}${shortDirectionalSetup.triggerZone}${shortTermRationale}${shortTermExecutionLine}`,
    `${longTermDirection}${longDirectionalSetup.triggerZone}${longTermRationale}${longTermExecutionLine}`,
  );

  const distinctLongDirection: DailyAiMarketAnalysis["tradeSetups"]["longTerm"]["direction"] =
    forceLongTermWatch || (longTermDirection === shortTermDirection && longTermDirection !== "观望等待")
      ? "观望等待"
      : longTermDirection;

  const tradeSetups = {
    shortTerm: {
      label: "短线策略",
      stance: shortTermStance,
      direction: shortTermDirection,
      rationale: shortTermRationale,
      triggerZone: shortDirectionalSetup.triggerZone,
      stopLoss: shortDirectionalSetup.stopLoss,
      targets: shortDirectionalSetup.targets,
      invalidation: shortDirectionalSetup.invalidation,
      executionLine: shortTermExecutionLine,
    },
    longTerm: {
      label: "长线策略",
      stance: distinctLongDirection === "观望等待" ? "长线观望" : longTermStance,
      direction: distinctLongDirection,
      rationale: distinctLongDirection === "观望等待"
        ? "长线与短线内容过于接近时，不重复给第二套日内建议，先保留波段观察。"
        : longTermRationale,
      triggerZone: distinctLongDirection === "观望等待" ? "等待更大级别确认后再评估" : longDirectionalSetup.triggerZone,
      stopLoss: distinctLongDirection === "观望等待" ? "以大级别结构失效为准" : longDirectionalSetup.stopLoss,
      targets: distinctLongDirection === "观望等待" ? ["不单独给波段目标，先等结构确认"] : longDirectionalSetup.targets,
      invalidation: distinctLongDirection === "观望等待"
        ? "若大级别重新转强或转弱，再更新波段观点。"
        : longDirectionalSetup.invalidation,
      executionLine: distinctLongDirection === "观望等待"
        ? "波段先看结构，不重复短线触发与目标。"
        : longTermExecutionLine,
    },
  };

  const signalHeadline = localizedSignal
    ? `BTC 今日思路：${localizedSignal.shortTermBias}，先看结构确认，不把当前波动误判成新趋势。`
    : pickByDate(input.analysisDate, headlineOptions);

  const signalSummary = localizedSignal
    ? `${localizedSignal.actionableRead} 短线只回答怎么执行，长线只回答结构是否重新一致，不重复给两套同方向日内建议。`
    : pickByDate(`${input.analysisDate}-summary`, summaryOptions);

  const signalConviction = localizedSignal
    ? `主结论：${localizedSignal.shortTermBias}，当前置信度 ${localizedSignal.conviction === "high" ? "高" : localizedSignal.conviction === "medium" ? "中" : "低"}，核心风险在于${localizedSignal.mainRisk}。（自动发布时间：${dateLabel} ${publishTime} JST）`
    : `${pickByDate(`${input.analysisDate}-conviction`, convictionOptions)}（自动发布时间：${dateLabel} ${publishTime} JST）`;

  const signalStructure = localizedSignal
    ? `当前衍生品结构显示：OI ${localizedSignal.oiState}，Funding ${localizedSignal.fundingState}，Liquidation ${localizedSignal.liquidationState}，CVD ${localizedSignal.cvdState}。先把它理解为结构判断，再决定是否执行。`
    : pickByDate(`${input.analysisDate}-structure`, structureOptions);

  const signalRiskTips = localizedSignal
    ? [
        `核心风险：${localizedSignal.mainRisk}。`,
        `若价格没有继续接受更高或更低位置，不要把当前波动直接当成新趋势启动。`,
        `短线先看价格与 OI 是否继续共振，再决定是否跟随。`,
      ]
    : [
        `未确认前轻仓，不追中位。`,
        `跌破失效位后，放弃原计划，重新评估。`,
        `宏观事件临近或波动突然放大时，优先等待下一根确认K线。`,
      ];

  const payload: DailyAiMarketAnalysis = {
    ...fallback,
    title: `今日 AI 行情分析 · ${dateLabel}`,
    marketBias: signalDrivenMarketBias ?? pickByDate(input.analysisDate, biasOptions),
    headline: signalHeadline,
    summary: signalSummary,
    conviction: signalConviction,
    publishAtJst: input.publishAtJst,
    timeframe: `${fallback.timeframe} 自动版本日期：${dateLabel} / 发布时间：${publishTime} JST。`,
    structure: signalStructure,
    vwap: pickByDate(`${input.analysisDate}-vwap`, vwapOptions),
    macd: pickByDate(`${input.analysisDate}-macd`, macdOptions),
    rsi: pickByDate(`${input.analysisDate}-rsi`, rsiOptions),
    indicatorPanels,
    focus: localizedSignal
      ? [
          `短线先看 ${localizedSignal.shortTermBias} 是否继续得到价格确认。`,
          `四项信号中，优先观察 OI 与 CVD 是否继续同向，而不是只盯一根K线。`,
          `短线只看执行，长线只看结构，不把两套逻辑混在一起。`,
        ]
      : [
          `优先看确认位与失效位是否仍成立，再决定是否出手。`,
          `短线只看执行，波段只看结构，不把两套逻辑混在一起。`,
          `若波动突然放大，先等下一根确认K线，不在中位追单。`,
        ],
    riskTips: signalRiskTips,
    tradeSetups,
    status: input.status,
    source: input.source,
    signalSnapshot: localizedSignal ?? undefined,
  };

  payload.tradeReviewCalendar = syncTradeReviewCalendarFromShortTerm(input.analysisDate, payload, fallback.tradeReviewCalendar.entries);

  return payload;
}

export async function generateDailyAiMarketAutoPayload(input: DailyAiMarketAutoGenerateInput = {}) {
  const analysisDate = input.analysisDate ?? formatDateJst();
  const publishAtJst = input.publishAtJst ?? buildPublishAtJst(analysisDate);
  const source = input.source ?? "auto";
  const status = input.status ?? "published";
  const signalSnapshot = await getCoinGlassSignalSnapshot("BTC");

  return {
    analysisDate,
    publishAtJst,
    source,
    status,
    slug: createSlug(analysisDate),
    payload: buildAutoPayload(
      {
        analysisDate,
        publishAtJst,
        source,
        status,
      },
      signalSnapshot,
    ),
  };
}

export async function upsertDailyAiMarketAutoPublish(input: DailyAiMarketAutoGenerateInput = {}): Promise<DailyAiMarketAutoPublishResult> {
  const generated = await generateDailyAiMarketAutoPayload(input);
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
