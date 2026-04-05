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

function buildAutoPayload(
  input: Pick<Required<DailyAiMarketAutoGenerateInput>, "analysisDate" | "publishAtJst" | "source" | "status">,
): DailyAiMarketAnalysis {
  const fallback = fallbackDailyAnalysisSeed;

  return {
    ...fallback,
    publishAtJst: input.publishAtJst,
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
