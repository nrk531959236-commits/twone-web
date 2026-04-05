"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess, createSupabaseAdminClient } from "@/lib/admin";
import { getFallbackDailyAiMarketAnalysis, type DailyAiMarketAnalysis, type DailyAiMarketSource, type DailyAiMarketStatus } from "@/lib/daily-ai-market";

function ensureAdmin(access: Awaited<ReturnType<typeof getAdminAccess>>) {
  if (!access.user || !access.isAdmin) {
    throw new Error("无权限执行后台操作。");
  }
}

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toMultilineList(value: FormDataEntryValue | null, fallback: string[] = []) {
  const text = toText(value);
  if (!text) {
    return fallback;
  }

  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  const text = toText(value);
  if (!text) {
    return fallback;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoFromLocalJst(value: string) {
  if (!value) {
    throw new Error("缺少发布时间。请填写 JST 时间。");
  }

  return `${value}:00+09:00`;
}

function createSlug(date: string) {
  return `daily-ai-market-${date}`;
}

function buildAnalysisFromForm(formData: FormData, fallback: DailyAiMarketAnalysis): DailyAiMarketAnalysis {
  const status = (toText(formData.get("status")) || fallback.status) as Exclude<DailyAiMarketStatus, "draft">;
  const source = (toText(formData.get("source")) || "admin") as DailyAiMarketSource;

  return {
    title: toText(formData.get("title")) || fallback.title,
    publishAtJst: toIsoFromLocalJst(toText(formData.get("publishAtJst"))),
    marketBias: (toText(formData.get("marketBias")) || fallback.marketBias) as DailyAiMarketAnalysis["marketBias"],
    conviction: toText(formData.get("conviction")) || fallback.conviction,
    headline: toText(formData.get("headline")) || fallback.headline,
    summary: toText(formData.get("summary")) || fallback.summary,
    timeframe: toText(formData.get("timeframe")) || fallback.timeframe,
    structure: toText(formData.get("structure")) || fallback.structure,
    vwap: toText(formData.get("vwap")) || fallback.vwap,
    macd: toText(formData.get("macd")) || fallback.macd,
    rsi: toText(formData.get("rsi")) || fallback.rsi,
    indicatorPanels: [0, 1, 2].map((index) => {
      const base = fallback.indicatorPanels[index];
      return {
        timeframe: (toText(formData.get(`indicator_${index}_timeframe`)) || base.timeframe) as (typeof base)["timeframe"],
        bias: (toText(formData.get(`indicator_${index}_bias`)) || base.bias) as (typeof base)["bias"],
        vwap: {
          value: toText(formData.get(`indicator_${index}_vwap_value`)) || base.vwap.value,
          val: toText(formData.get(`indicator_${index}_vwap_val`)) || base.vwap.val,
          vah: toText(formData.get(`indicator_${index}_vwap_vah`)) || base.vwap.vah,
          stance: toText(formData.get(`indicator_${index}_vwap_stance`)) || base.vwap.stance,
        },
        macd: {
          direction: toText(formData.get(`indicator_${index}_macd_direction`)) || base.macd.direction,
          divergence: toText(formData.get(`indicator_${index}_macd_divergence`)) || base.macd.divergence,
          bias: (toText(formData.get(`indicator_${index}_macd_bias`)) || base.macd.bias) as (typeof base.macd)["bias"],
        },
        rsi: {
          value: toNumber(formData.get(`indicator_${index}_rsi_value`), base.rsi.value),
          divergence: toText(formData.get(`indicator_${index}_rsi_divergence`)) || base.rsi.divergence,
          bias: (toText(formData.get(`indicator_${index}_rsi_bias`)) || base.rsi.bias) as (typeof base.rsi)["bias"],
        },
      };
    }),
    keyLevels: toMultilineList(formData.get("keyLevels"), fallback.keyLevels),
    focus: toMultilineList(formData.get("focus"), fallback.focus),
    riskTips: toMultilineList(formData.get("riskTips"), fallback.riskTips),
    tradeSetups: {
      shortTerm: {
        label: toText(formData.get("short_label")) || fallback.tradeSetups.shortTerm.label,
        stance: (toText(formData.get("short_stance")) || fallback.tradeSetups.shortTerm.stance) as typeof fallback.tradeSetups.shortTerm.stance,
        direction: (toText(formData.get("short_direction")) || fallback.tradeSetups.shortTerm.direction) as typeof fallback.tradeSetups.shortTerm.direction,
        rationale: toText(formData.get("short_rationale")) || fallback.tradeSetups.shortTerm.rationale,
        triggerZone: toText(formData.get("short_triggerZone")) || fallback.tradeSetups.shortTerm.triggerZone,
        stopLoss: toText(formData.get("short_stopLoss")) || fallback.tradeSetups.shortTerm.stopLoss,
        targets: toMultilineList(formData.get("short_targets"), fallback.tradeSetups.shortTerm.targets),
        invalidation: toText(formData.get("short_invalidation")) || fallback.tradeSetups.shortTerm.invalidation,
        executionLine: toText(formData.get("short_executionLine")) || fallback.tradeSetups.shortTerm.executionLine,
      },
      longTerm: {
        label: toText(formData.get("long_label")) || fallback.tradeSetups.longTerm.label,
        stance: (toText(formData.get("long_stance")) || fallback.tradeSetups.longTerm.stance) as typeof fallback.tradeSetups.longTerm.stance,
        direction: (toText(formData.get("long_direction")) || fallback.tradeSetups.longTerm.direction) as typeof fallback.tradeSetups.longTerm.direction,
        rationale: toText(formData.get("long_rationale")) || fallback.tradeSetups.longTerm.rationale,
        triggerZone: toText(formData.get("long_triggerZone")) || fallback.tradeSetups.longTerm.triggerZone,
        stopLoss: toText(formData.get("long_stopLoss")) || fallback.tradeSetups.longTerm.stopLoss,
        targets: toMultilineList(formData.get("long_targets"), fallback.tradeSetups.longTerm.targets),
        invalidation: toText(formData.get("long_invalidation")) || fallback.tradeSetups.longTerm.invalidation,
        executionLine: toText(formData.get("long_executionLine")) || fallback.tradeSetups.longTerm.executionLine,
      },
    },
    macroEvents: [0, 1, 2].map((index) => {
      const base = fallback.macroEvents[index];
      return {
        name: (toText(formData.get(`event_${index}_name`)) || base.name) as typeof base.name,
        nextTimeJst: toText(formData.get(`event_${index}_nextTimeJst`)) || base.nextTimeJst,
        status: (toText(formData.get(`event_${index}_status`)) || base.status) as typeof base.status,
        current: toText(formData.get(`event_${index}_current`)) || base.current,
        forecast: toText(formData.get(`event_${index}_forecast`)) || base.forecast,
        previous: toText(formData.get(`event_${index}_previous`)) || base.previous,
        note: toText(formData.get(`event_${index}_note`)) || base.note,
      };
    }),
    tradeReviewCalendar: fallback.tradeReviewCalendar,
    status,
    source,
  };
}

export async function upsertDailyAiMarketAction(formData: FormData) {
  const access = await getAdminAccess();
  ensureAdmin(access);

  const fallback = getFallbackDailyAiMarketAnalysis();
  const analysisDate = toText(formData.get("analysisDate"));
  const status = (toText(formData.get("status")) || "published") as DailyAiMarketStatus;
  const source = (toText(formData.get("source")) || "admin") as DailyAiMarketSource;

  if (!analysisDate) {
    throw new Error("缺少 analysisDate。请填写分析日期。");
  }

  const payload = buildAnalysisFromForm(formData, fallback);
  const publishAtJst = payload.publishAtJst;
  const now = new Date().toISOString();
  const publishedAt = status === "published" ? now : null;
  const slug = createSlug(analysisDate);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("daily_ai_market_analyses").upsert(
    {
      slug,
      analysis_date: analysisDate,
      publish_at_jst: publishAtJst,
      status,
      source,
      payload,
      published_at: publishedAt,
      updated_at: now,
    },
    { onConflict: "analysis_date" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/daily-ai-market");
  revalidatePath("/api/daily-ai-market");

  const actionText = status === "published" ? "已发布" : "已保存";
  redirect(`/admin/daily-ai-market?type=success&message=${encodeURIComponent(`${actionText} ${analysisDate} 的每日 AI 行情分析。`)}`);
}
