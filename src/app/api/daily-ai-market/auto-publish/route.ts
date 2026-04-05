import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { upsertDailyAiMarketAutoPublish, type DailyAiMarketAutoGenerateInput } from "@/lib/daily-ai-market-auto";

export const dynamic = "force-dynamic";

function readBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function getExpectedToken() {
  const expectedToken = process.env.DAILY_AI_MARKET_CRON_TOKEN?.trim();

  if (!expectedToken) {
    throw new Error("Missing DAILY_AI_MARKET_CRON_TOKEN.");
  }

  return expectedToken;
}

function isAuthorized(request: NextRequest) {
  const expectedToken = getExpectedToken();
  const bearerToken = readBearerToken(request);
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const cronHeader = request.headers.get("x-vercel-cron");

  if (bearerToken === expectedToken || queryToken === expectedToken) {
    return true;
  }

  if (cronHeader === "1" && bearerToken === expectedToken) {
    return true;
  }

  return false;
}

function parseSearchParams(request: NextRequest): DailyAiMarketAutoGenerateInput {
  const analysisDate = request.nextUrl.searchParams.get("analysisDate")?.trim() || undefined;
  const publishAtJst = request.nextUrl.searchParams.get("publishAtJst")?.trim() || undefined;
  const status = request.nextUrl.searchParams.get("status")?.trim();
  const source = request.nextUrl.searchParams.get("source")?.trim();

  return {
    analysisDate,
    publishAtJst,
    status: status === "scheduled" || status === "published" ? status : undefined,
    source: source === "admin" || source === "manual-seed" || source === "auto" ? source : undefined,
  };
}

function parseBody(body: unknown): DailyAiMarketAutoGenerateInput {
  if (!body || typeof body !== "object") {
    return {};
  }

  const candidate = body as Record<string, unknown>;

  return {
    analysisDate: typeof candidate.analysisDate === "string" ? candidate.analysisDate.trim() : undefined,
    publishAtJst: typeof candidate.publishAtJst === "string" ? candidate.publishAtJst.trim() : undefined,
    status: candidate.status === "scheduled" || candidate.status === "published" ? candidate.status : undefined,
    source: candidate.source === "admin" || candidate.source === "manual-seed" || candidate.source === "auto" ? candidate.source : undefined,
  };
}

function mergeInput(base: DailyAiMarketAutoGenerateInput, override: DailyAiMarketAutoGenerateInput): DailyAiMarketAutoGenerateInput {
  return {
    analysisDate: override.analysisDate ?? base.analysisDate,
    publishAtJst: override.publishAtJst ?? base.publishAtJst,
    status: override.status ?? base.status,
    source: override.source ?? base.source,
  };
}

async function handleRequest(request: NextRequest, trigger: "get" | "post") {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const fromQuery = parseSearchParams(request);
  const contentType = request.headers.get("content-type") ?? "";
  const body = trigger === "post" && contentType.includes("application/json") ? await request.json() : null;
  const fromBody = parseBody(body);
  const input = mergeInput(fromQuery, fromBody);
  const result = await upsertDailyAiMarketAutoPublish(input);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/daily-ai-market");
  revalidatePath("/api/daily-ai-market");

  return NextResponse.json({
    ok: true,
    trigger,
    mode: result.mode,
    analysisDate: result.record.analysis_date,
    status: result.record.status,
    source: result.record.source,
    publishAtJst: result.record.publish_at_jst,
    record: result.record,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleRequest(request, "post");
  } catch (error) {
    console.error("/api/daily-ai-market/auto-publish POST error", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "自动发布失败。",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleRequest(request, "get");
  } catch (error) {
    console.error("/api/daily-ai-market/auto-publish GET error", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "自动发布失败。",
      },
      { status: 500 },
    );
  }
}
