import { NextResponse } from "next/server";
import { getFirstActivationContextByEmail } from "@/lib/first-activation";
import { normalizeEmail } from "@/lib/password-setup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email ?? "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ activation: { status: "none" } });
    }

    const activation = await getFirstActivationContextByEmail(email);
    return NextResponse.json({ activation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "激活状态检查失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
