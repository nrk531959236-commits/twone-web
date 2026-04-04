import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/auth";
import { ensureMembershipForUser } from "@/lib/membership";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/assistant";
  }

  if (next.startsWith("//")) {
    return "/assistant";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const redirectUrl = new URL(next, getSiteUrl());

  if (!code) {
    redirectUrl.searchParams.set("authError", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.searchParams.set("authError", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureMembershipForUser(user);
  }

  return NextResponse.redirect(redirectUrl);
}
