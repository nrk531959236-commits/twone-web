const DEFAULT_LEVEL = "4H";

type BtcAnalysisFallbackInput = {
  userMessage: string;
};

type ParsedIntent = {
  level: string;
  stance: "偏多" | "偏空" | "观望";
  hasPosition: boolean;
  positionSide: "多单" | "空单" | null;
  action: "持有" | "开仓计划" | "复盘" | "主分析";
  risk: "低" | "中" | "高" | null;
  keyLevels: string[];
  summary: string;
  confirmationLead: string;
  invalidationLead: string;
  judgmentLead: string;
  executionPrefix: string;
};

function detectLevel(message: string) {
  const text = message.toUpperCase();

  if (text.includes("15M") || text.includes("15 分") || text.includes("15分钟")) {
    return "15M";
  }

  if (text.includes("1H") || text.includes("1 小时") || text.includes("1小时")) {
    return "1H";
  }

  if (text.includes("4H") || text.includes("4 小时") || text.includes("4小时")) {
    return "4H";
  }

  if (text.includes("1D") || text.includes("日线") || text.includes("DAY")) {
    return "1D";
  }

  return DEFAULT_LEVEL;
}

function detectTask(message: string) {
  const text = message;

  if (/(复盘|亏损|交易记录|止损|执行问题|拿不住|扛单)/.test(text)) {
    return {
      mode: "复盘",
      summary: "这单更像复盘，主体仍按固定模板走，结尾补执行问题。",
    };
  }

  if (/(watchlist|观察列表|山寨|ETH|SOL|alt)/i.test(text)) {
    return {
      mode: "扩展",
      summary: "这是扩展研究需求，但先让 BTC 给方向，别一上来就分散火力。",
    };
  }

  return {
    mode: "主分析",
    summary: "当前按 BTC 主分析入口处理。",
  };
}

function parseKeyLevels(message: string) {
  const matches = message.match(/\d{4,6}(?:\.\d{1,2})?/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 4);
}

function detectIntent(message: string): ParsedIntent {
  const level = detectLevel(message);
  const task = detectTask(message);
  const keyLevels = parseKeyLevels(message);
  const text = message;

  const shortBias = /(做空|空单|偏空|看空|short|逢高空|反弹空)/i.test(text);
  const longBias = /(做多|多单|偏多|看多|long|逢低多|回踩多)/i.test(text);
  const waitBias = /(观望|先等|等待|不确定|看看再说|先看戏)/i.test(text);

  const hasLongPosition = /(持有多单|有多单|拿着多单|多单在手|现货|多仓|抄底单)/i.test(text);
  const hasShortPosition = /(持有空单|有空单|拿着空单|空单在手|空仓在手|空仓单|空头仓位|空仓位|空仓还在|空单还在|空仓持有|空仓中|short from)/i.test(text);
  const hasPosition = hasLongPosition || hasShortPosition;
  const positionSide = hasLongPosition ? "多单" : hasShortPosition ? "空单" : null;

  const action =
    task.mode === "复盘" ? "复盘"
    : /(计划|想做|准备做|打算做|能不能做|怎么做|挂单|入场)/.test(text) ? "开仓计划"
    : hasPosition ? "持有"
    : "主分析";

  const risk =
    /(激进|进攻|大仓|重仓|能扛|高风险)/.test(text) ? "高"
    : /(稳一点|保守|小仓|低风险|别激进)/.test(text) ? "低"
    : /(中等风险|一般风险|正常仓位)/.test(text) ? "中"
    : null;

  const stance: ParsedIntent["stance"] =
    shortBias ? "偏空"
    : longBias ? "偏多"
    : waitBias ? "观望"
    : hasShortPosition ? "偏空"
    : hasLongPosition ? "偏多"
    : "观望";

  const keyLevelSummary =
    keyLevels.length > 0 ? `关键位先盯 ${keyLevels.join(" / ")}。` : "没给死价格，就按结构边界写。";

  const stanceSummary =
    stance === "偏空" ? "意图偏空，先看跌破和反抽受压。"
    : stance === "偏多" ? "意图偏多，先看站回和回踩守住。"
    : "没给明确方向，先等边界。";

  const positionSummary =
    hasPosition
      ? positionSide === "多单"
        ? "这是多单管理。"
        : "这是空单管理。"
      : action === "开仓计划"
        ? "这次是计划单。"
        : "当前按主分析处理。";

  const riskSummary =
    risk === "高" ? "风险偏高，能写进攻，但前提还是确认后上。"
    : risk === "低" ? "风险偏低，确认更硬，否定位更近。"
    : risk === "中" ? "风险中性，按标准确认-失效写。"
    : "没给风险偏好，默认中性偏进攻。";

  const confirmationLead =
    stance === "偏空"
      ? hasPosition && positionSide === "空单"
        ? "先看空单能不能续拿：先破位，再看反抽收不回。"
        : "按空头计划写：先跌破，再反抽不过，才开。"
      : stance === "偏多"
        ? hasPosition && positionSide === "多单"
          ? "先看多单能不能续拿：先站回，再看回踩守住。"
          : "按多头计划写：先站回，再回踩守住，才开。"
        : "先别站队，谁先拿下边界就跟谁。";

  const invalidationLead =
    stance === "偏空"
      ? "按空头失效写：收不住、站回去，就撤。"
      : stance === "偏多"
        ? "按多头失效写：守不住、跌回去，就撤。"
        : "按观望失效写：中段乱扫，不做。";

  const judgmentLead =
    action === "复盘"
      ? "这次不是安慰，是把错点钉死。"
      : hasPosition
        ? positionSide === "多单"
          ? "现在先处理这张多单。"
          : "现在先处理这张空单。"
        : action === "开仓计划"
          ? "现在只写计划，不聊废话。"
          : "现在先给交易判断。";

  const executionPrefix =
    action === "复盘"
      ? "按复盘口径。"
      : hasPosition
        ? positionSide === "多单"
          ? "按持有多单口径。"
          : "按持有空单口径。"
        : action === "开仓计划"
          ? stance === "偏空"
            ? "按计划开空口径。"
            : stance === "偏多"
              ? "按计划开多口径。"
              : "按计划单口径。"
          : stance === "偏空"
            ? "按偏空观察口径。"
            : stance === "偏多"
              ? "按偏多观察口径。"
              : "按观望口径。";

  return {
    level,
    stance,
    hasPosition,
    positionSide,
    action,
    risk,
    keyLevels,
    summary: [stanceSummary, positionSummary, riskSummary, keyLevelSummary, task.summary].join(""),
    confirmationLead,
    invalidationLead,
    judgmentLead,
    executionPrefix,
  };
}

function buildLevelPlan(level: string) {
  switch (level) {
    case "15M":
      return {
        structure: "15M 只看短节奏：先分清现在是沿单边推进，还是在小箱体里来回甩。没有实时图时，先盯最近两段高低点有没有继续抬高/下压；能连续推进就按延续，不行就按震荡。",
        ob: "15M 的 OB 只看最近一次有效推动前的最后反向K线区。价格第一次回到这个区还给反应，说明短线资金还在；一碰就穿，说明这个区已经废了。",
        poc: "没成交分布数据时，把最近 2-6 小时的震荡中轴当临时 POC。价格站不上中轴，短线别急着追多；跌不破中轴，也别在低位乱追空。",
        oi: "15M 看 OI 主要是看突然扩张。价格冲高但 OI 暴增，要防追涨盘进场后被反杀；价格下压同时 OI 扩张，才更像真砸盘。",
        vwap: "15M 把日内 VWAP 当多空分界。站上并回踩不破，偏多处理；跌破后反抽不过，偏空处理。一直围着 VWAP 打转，就当垃圾时间。",
        cvd: "没 CVD/Delta 时，就看突破K线后续有没有跟单。突破后一两根K线马上没跟随，通常是假动作；跌破后连续收回，也别追空。",
        macd: "15M 的 MACD 只拿来判断节奏加速还是减速，不拿来单独开仓。零轴附近反复缠绕时，优先信价格位置，不信指标。",
        rsi: "15M RSI 只当强弱辅助。强势单边里超买可以继续超买，弱势单边里超卖也能继续超卖，别拿它逆势抄刀。",
        confirmation: "15M 要的是快确认：突破最近小高点后，下一次回踩不破，才追；跌破最近小低点后，反抽收不回，才空。",
        invalidation: "15M 否定位也要快：一旦突破后 2-3 根K线内收不稳、重新跌回原区间，直接当失效处理，别给太多幻想。",
        judgment: "15M 只能做快进快出，不适合脑补大行情。没确认就空仓，确认了再狠狠干，错了立刻撤。",
      };
    case "1H":
      return {
        structure: "1H 先分清是趋势延续、箱体震荡，还是一段下跌/上涨后的反抽反转。没实时图时，先看最近几个小时的高低点有没有延续同方向推进。",
        ob: "1H 的 OB 看最近一次把结构打出来的起涨/起跌前反向区。回踩守住，说明结构没坏；直接跌穿/收回，说明这段结构质量一般。",
        poc: "没 POC 数据时，把最近 1-3 天主震荡区中轴当临时博弈核心。价格长期站在中轴上方，思路优先偏多；长期压在下方，思路优先偏空。",
        oi: "1H 的 OI 更有参考性。涨价配合 OI 稳步上行，才像健康趋势；价格单走但 OI 一直掉，更多像挤仓尾声。",
        vwap: "1H 没实时 VWAP 时，就把均价回收/失守当替代。站上均价并能反复承接，偏多；跌破均价后每次反抽都被压，偏空。",
        cvd: "没 CVD/Delta 时，重点看每次上破/下破后，后续 K 线能不能继续收在突破方向。能延续才算主动资金真进场。",
        macd: "1H 的 MACD 用来判断趋势是否还在推进。零轴上方二次放大，多头更顺；零轴下方继续走弱，空头更顺。背离只代表容易减速，不代表一定反转。",
        rsi: "1H RSI 看强弱分区，不看机械超买超卖。强势能长期待在偏强区，弱势能长期待在偏弱区。",
        confirmation: "1H 确认位要看收线。不是影线插一下，是实体站上关键上沿/前高后，回踩还守住，再跟多；跌破同理。",
        invalidation: "1H 否定位看收回/跌回。突破后一个小时内就收回箱体，或者跌破后很快被拉回，说明这波不够硬，先撤。",
        judgment: "1H 是最适合做方向选择的级别。方向没走出来前别预判；走出来后，别在回踩确认前提前冲。",
      };
    case "1D":
      return {
        structure: "1D 只看大方向：是沿趋势推进，还是处在大箱体中段。没实时数据时，先看日线高低点序列是否还在维持同方向，别被小周期噪音带跑。",
        ob: "1D 的 OB 重点看周内/日线级别推动前的最后反向区。大级别一旦回到这里还能守，趋势通常没死；守不住，后面就别再用强趋势逻辑硬扛。",
        poc: "没日线成交分布时，把近几周主箱体中轴视作临时 POC。日线长期站不回中轴，上方空间先别想太美；长期压不破中轴，下方也别乱看崩。",
        oi: "1D 的 OI 主要判断大资金是否继续加码。日线涨、OI 也稳步增，更像趋势推进；价格高位横住但 OI 明显掉，容易变成高位出清。",
        vwap: "1D 没 VWAP 时，看周/月均价区的得失。站稳均价区，回调更像机会；失守均价区，反弹更像减仓点。",
        cvd: "没 CVD/Delta 时，改看日线突破后的连续性。日线破位后能不能连续 2-3 天按同方向收线，比单日爆量更关键。",
        macd: "1D MACD 只做方向过滤，不做精细进场。零轴上方扩张，多头环境；零轴下方扩张，空头环境。日线级别背离出现后，要开始收缩预期，但不是立刻反手。",
        rsi: "1D RSI 看大级别强弱状态。日线强趋势里，RSI 高位钝化很正常；弱趋势里，低位钝化也很正常。别拿一个超买就当顶部。",
        confirmation: "1D 确认位要慢，但一旦确认，胜率更高。日线收上关键区并次日不被吞没，再考虑顺势拿波段；跌破关键区并连续收弱，同理。",
        invalidation: "1D 否定位看日线实体失守。今天说强，明后天又被全部吞掉，那就不是强，是假动作。",
        judgment: "1D 不追日内噪音，只决定大方向和仓位倾斜。大级别没给明确信号前，仓位就别放大。",
      };
    case "4H":
    default:
      return {
        structure: "4H 是主交易级别。先定这波是趋势延续、箱体整理，还是一段趋势后的反转尝试。没实时图时，先看最近几根 4H 的高低点有没有继续抬高/下压，以及回踩后能不能守住关键区域。",
        ob: "4H 的 OB 优先看把结构真正打出来的那一段起点。价格回踩这个区有承接，说明多头/空头还在控盘；回踩直接穿，说明这段推动质量一般，不值得重仓信。",
        poc: "没成交分布时，把最近 3-7 天主箱体中轴当临时 POC。价格站在中轴上方，交易优先找回踩多；压在中轴下方，优先找反弹空。中轴附近别上头。",
        oi: "4H 的 OI 是判断趋势真假最实用的辅助之一。价格上攻时 OI 同步放大，说明不是空拉；价格下压时 OI 同步放大，说明不是假摔。价格走了但 OI 缩，更多防止尾段追单。",
        vwap: "没实时 VWAP 时，用 4H 均价区替代。回到均价区上方并守住，偏多；回到均价区下方并压住，偏空。反复穿来穿去，就默认还没走完整理。",
        cvd: "没 CVD/Delta 时，就看突破后的跟随K线和回踩力度。真突破，回踩会浅、收回会快；假突破，回踩会深、甚至直接吞没。",
        macd: "4H MACD 只拿来辅助趋势，不拿来替代结构。零轴上方继续扩张，偏强；零轴下方继续发散，偏弱。若价格新高但 MACD 明显跟不上，只代表别乱追，不代表马上反手。",
        rsi: "4H RSI 重点看强弱区驻留。能长期待在强势区，说明趋势环境健康；反弹 RSI 上不去，说明空头环境更重。",
        confirmation: "4H 确认位不是‘感觉差不多’，而是价格拿下关键前高/箱体上沿/均价区后，下一根或下一次回踩还能守住。守住再打，没守住不打。",
        invalidation: "4H 否定位要写死：一旦重新跌回突破前结构里，或失守最近一段确认低点/高点，这个交易计划就失效，不再嘴硬。",
        judgment: "4H 是最适合给主计划的级别。没确认前别抢，中段别追；确认后就按方向狠狠干，失效就认错。",
      };
  }
}

function buildIntentPlan(intent: ParsedIntent) {
  const keyLevelText = intent.keyLevels.length > 0 ? intent.keyLevels.join(" / ") : "用户没给明确价格";

  if (intent.hasPosition && intent.positionSide === "多单") {
    return {
      structureTail: `重点先围绕手里多单处理，不把它当纯旁观分析。关键位先盯 ${keyLevelText}。`,
      confirmationTail: "执行上只看两步：先看关键位能不能重新站回，再看回踩守不守得住。守住继续拿，不守住先减。",
      invalidationTail: "一旦重新跌回防守位下方，或者反弹高点越走越低，这张多单就降级处理，别硬扛。",
      judgmentTail: "这张多单的重点是保结构，不是赌反转。守住继续抱，失守先收。",
    };
  }

  if (intent.hasPosition && intent.positionSide === "空单") {
    return {
      structureTail: `重点先围绕手里空单处理，不把它当纯方向竞猜。关键位先盯 ${keyLevelText}。`,
      confirmationTail: "执行上只看两步：先看关键位能不能有效跌破，再看反抽收不收得回去。收不回继续抱，收回先减。",
      invalidationTail: "一旦重新站回压制位上方，或者跌破后立刻被整段收回，这张空单直接降级，别再嘴硬。",
      judgmentTail: "这张空单的重点是保利润，不是证明自己看空。压住继续拿，站回就走。",
    };
  }

  if (intent.action === "开仓计划") {
    return {
      structureTail: `这是计划单，不是事后复盘。关键位先围着 ${keyLevelText} 写。`,
      confirmationTail: intent.stance === "偏空"
        ? "执行上先等跌破，再等反抽不过。两个条件少一个，都不开空。"
        : intent.stance === "偏多"
          ? "执行上先等站回，再等回踩守住。两个条件少一个，都不开多。"
          : "执行上只等边界确认。没走出箱体，不开。",
      invalidationTail: "没触发不进，触发后又失守就撤。",
      judgmentTail: "宁可慢一拍，也不死在中段。",
    };
  }

  if (intent.action === "复盘") {
    return {
      structureTail: "这是复盘单，重点看当时为什么会在中段、假突破或失效后还继续扛。",
      confirmationTail: "复盘时把真正该出手的触发条件写死：突破确认、回踩确认、还是跌破反抽失败。没有触发，不该打。",
      invalidationTail: "复盘时把真正该停手的位置写死：哪根收回、哪次回踩失守、哪段结构被吞掉后，这单就该结束。",
      judgmentTail: "复盘不是讲心态，是把下次不该犯的动作直接删掉。",
    };
  }

  return {
    structureTail: intent.keyLevels.length > 0 ? `重点围着 ${keyLevelText} 看结构。` : "没给具体位，就按箱体边界和前高前低处理。",
    confirmationTail: intent.stance === "偏空"
      ? "执行上等跌破关键位，再等反抽不过。没走完这两步，不空。"
      : intent.stance === "偏多"
        ? "执行上等站回关键位，再等回踩守住。没走完这两步，不多。"
        : "执行上只等边界确认。中段来回扫，继续看。",
    invalidationTail: "市场没按剧本走，就撤，不补故事。",
    judgmentTail: "没有持仓时，最大的优势就是能等。确认不到，就继续空仓。",
  };
}

export function buildBtcAnalysisFallback({ userMessage }: BtcAnalysisFallbackInput) {
  const intent = detectIntent(userMessage);
  const levelPlan = buildLevelPlan(intent.level);
  const intentPlan = buildIntentPlan(intent);

  return [
    `级别：${intent.level}`,
    "现价 / 24h高低 / 24h涨跌：当前没接实时，这一栏不编。你补现价和 24h 数据，我直接把计划收紧；现在先按结构做。",
    `结构：${levelPlan.structure}${intentPlan.structureTail}`,
    `OB：${levelPlan.ob}`,
    `POC：${levelPlan.poc}`,
    `OI：${levelPlan.oi}`,
    `VWAP：${levelPlan.vwap}`,
    `CVD / Delta：${levelPlan.cvd}`,
    `MACD：${levelPlan.macd}`,
    `RSI：${levelPlan.rsi}`,
    `确认位：${intent.executionPrefix}${intent.confirmationLead}${levelPlan.confirmation}${intentPlan.confirmationTail}`,
    `否定位：${intent.invalidationLead}${levelPlan.invalidation}${intentPlan.invalidationTail}`,
    `我的判断：${intent.judgmentLead}${intent.summary}${levelPlan.judgment}${intentPlan.judgmentTail}`,
  ].join("\n");
}

export const BTC_ANALYSIS_SYSTEM_PROMPT = [
  "你是 Twone 的 BTC 优先交易分析助手，不是泛聊天机器人。",
  "默认使用中文，语气冷静、直接、偏进攻型，像交易员，不像客服，不要套话，不要鸡汤。",
  "你的首要任务是给出 BTC 分析，不主动把重心转去登录、会员、审核、后台、产品介绍。",
  "除非用户明确指定别的标的，否则默认分析 BTC；即使用户问 ETH/山寨/watchlist，也先给 BTC 主判断，再补一句是否需要扩展。",
  "优先把开放闲聊收束成固定分析任务：级别分析、日内计划、关键位确认/否定、仓位风控、交易复盘。",
  "输出必须固定按这个顺序：级别、现价 / 24h高低 / 24h涨跌、结构、OB、POC、OI、VWAP、CVD / Delta、MACD、RSI、确认位、否定位、我的判断。不要跳字段。",
  "保持 BTC-first 和固定级别模式，优先围绕 15M / 1H / 4H / 1D 输出。",
  "先解析用户意图，再写分析。必须识别并利用这些信息：方向偏好（做多/做空/观望）、是否已有持仓、是持仓管理还是开仓计划、用户给出的关键位、用户风险承受度、是否在复盘。",
  "确认位 / 否定位 / 我的判断 三栏必须明显反映用户意图，不能只给通用模板话术。比如用户说自己有空单，就按空单管理逻辑写；用户说准备做多，就按多单计划逻辑写。",
  "判断要更明确，少废话。可以给偏多、偏空、先等，不要长篇两边都说；句子尽量短、尽量硬，像交易员下口令。",
  "缺数据时必须诚实标注当前无实时数据/未接入，然后在每一栏给出可执行 fallback。不要只写‘缺失’。没有实时数据时，也要尽量写成像实盘脑子的交易计划：先看什么、再等什么、触发后怎么做、失效后怎么撤。",
  "确认位和否定位要写成执行语句，不要写成说明文。优先使用‘先…再…才…’、‘一旦…就…’、‘没…就不…’这种硬口径。",
  "我的判断必须像最终结论，冷静、直接、偏进攻型，但不能绝对化。先给结论，再补一句原因；最好能直接落到持有、等、开、撤。",
  "少官话，少解释自己，少提示工程限制。只在必要处一句话说清当前没有实时数据。",
  "不要使用 JSON、Markdown 表格、项目符号列表外的复杂格式，也不要写长篇免责声明。直接分行输出。",
  "如果用户要复盘，仍映射到同一模板；最后只补一句执行问题，不要把主体写成情绪安慰。",
  "如果有实时数据，只填你真正有把握的字段；没有就明确说没有。绝不编造价格、指标、持仓、新闻或链上数据。",
  "下面是风格样本，模仿它的力度和收束感，不要照抄价格。",
  "样本1（持有空单）：用户：我 69500 的空单还拿着，4H 怎么看，要不要继续抱？ 助手：确认位：先看 4H 低点能不能继续下破；破了以后反抽还收不回，这张空单继续抱。没破前，不加。 否定位：一旦 4H 重新站回最近压制上方，或者跌破段被整根收回，先减，再看。 我的判断：这不是找新空点，是保利润。压得住就拿，站回就收。",
  "样本2（持有多单）：用户：我手里有多单，成本 68200，1H 要不要继续拿？ 助手：确认位：先看 1H 能不能重新站回最近失守位；站回后回踩还守住，这张多单继续拿。没站回前，不加。 否定位：一旦再次跌回防守位下方，或者反弹高点继续下移，先减，不硬扛。 我的判断：先守结构，不赌信仰。守住拿，失守收。",
  "样本3（观望）：用户：现在有点纠结，4H 先观望还是能上？ 助手：确认位：谁先拿下边界就跟谁。上破后回踩守住，再跟多；下破后反抽不过，再跟空。 否定位：还在箱体中段来回扫，就当没信号，不下手。 我的判断：先等。中段最容易两边挨打。",
  "样本4（计划开仓）：用户：准备开仓，偏多，给我一个 1H 计划，关键位先看 70800。 助手：确认位：先站回 70800，再等 1H 回踩不破，两个条件都到才开多。 否定位：一旦站回后又跌回 70800 下方，这个多头计划直接作废。 我的判断：可以做多，但只能做确认后的那一下。提前埋伏，不值。",
  "样本5（复盘追单）：用户：我昨天追空被拉爆了，帮我复盘。 助手：确认位：当时真正能空的位置，不是情绪上头那一根，而是跌破后反抽不过的那一下。没走出这一步，不该追。 否定位：一旦价格快速收回跌破段，空头逻辑当场失效，这单就该停。 我的判断：你不是方向错，是位置错。下次没确认，不追。",
  "样本6（持有空单，带关键位）：用户：我有空单，4H 盯 70300 和 69500，怎么管？ 助手：确认位：先看 69500 能不能有效跌破；破了以后反抽还过不去，空单继续拿。 否定位：一旦 4H 重新站回 70300 上方，这段空头先撤，不扛。 我的判断：现在先管仓位，不找观点。破 69500 续拿，回 70300 上方就收。",
  "样本7（持有多单，偏防守）：用户：我有多单，但不想回吐太多利润，4H 给我一句话。 助手：确认位：先看最近支撑能不能守住；守住再拿，失守不拖。 否定位：一旦 4H 跌回最近确认低点下方，这张多单直接降级，先收。 我的判断：先保利润。守住留，失守走。",
  "样本8（观望等方向）：用户：没仓位，感觉快变盘了，15M 怎么做？ 助手：确认位：先破最近小箱体上沿再回踩守住，才追多；先破下沿再反抽不过，才追空。 否定位：还在小箱体里来回穿，就继续等。 我的判断：现在不是猜方向的时候，是等触发的时候。",
  "样本9（计划开空）：用户：准备开空，1H 给计划。 助手：确认位：先跌破关键支撑，再等 1H 反抽收不回，两个条件都到才开空。 否定位：一旦跌破后又被整段收回，这个空头计划作废。 我的判断：能空，但只能空确认后的那一下。没确认，不出手。",
  "样本10（复盘追多）：用户：我昨天追多追在最高点，帮我复盘。 助手：确认位：当时真正能多的位置，不是拉升末端那一根，而是站回关键位后第一次回踩守住。没走出这一步，不该追。 否定位：一旦站回后的回踩失守，多头逻辑就没了，这单就该停。 我的判断：不是看多错，是追得太晚。下次没确认，不追。",
].join("\n");
