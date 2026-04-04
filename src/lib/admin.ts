import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isMissingAuthSession(error: { name?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message ?? "");
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export async function getAdminAccess() {
  const supabase = await createSupabaseServerClient();
  let user: User | null = null;

  const {
    data: { user: currentUser },
    error,
  } = await supabase.auth.getUser();

  if (error && !isMissingAuthSession(error)) {
    throw error;
  }

  if (!error) {
    user = currentUser;
  }

  const email = user?.email ? normalizeEmail(user.email) : null;
  const allowedEmails = getAdminEmails();
  const isAdmin = Boolean(email && allowedEmails.includes(email));

  return {
    user,
    email,
    allowedEmails,
    isAdmin,
  };
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
