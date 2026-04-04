import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/assistant/types";

function isMissingAuthSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AuthSessionMissingError" || /auth session missing/i.test(error.message);
}

const MAX_HISTORY_MESSAGES = 40;

export type AssistantSessionRow = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type AssistantMessageRow = {
  id?: string | number | null;
  user_id?: string | null;
  session_id: string;
  role: ChatMessage["role"];
  title?: string | null;
  content: string;
  created_at: string;
};

function getDefaultAssistantTitle() {
  return "Twone AI Assistant";
}

function buildSessionTitleFromFirstMessage(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "新对话";
  }

  return normalized.slice(0, 48);
}

function buildMessageTitle(row: Pick<AssistantMessageRow, "role" | "title">): string {
  if (typeof row.title === "string" && row.title.trim()) {
    return row.title;
  }

  return row.role === "assistant" ? getDefaultAssistantTitle() : "Member";
}

function mapMessageRowToChatMessage(row: AssistantMessageRow, index: number): ChatMessage {
  return {
    id: row.id != null ? String(row.id) : `${row.role}-${row.created_at}-${index}`,
    role: row.role,
    title: buildMessageTitle(row),
    content: row.content,
    createdAt: row.created_at,
  };
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !isMissingAuthSessionError(error)) {
    throw error;
  }

  return { supabase, user };
}

async function getLatestSessionForUser(user: User) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assistant_sessions")
    .select("id, user_id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<AssistantSessionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAssistantConversation() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return {
      session: null,
      messages: [] as ChatMessage[],
    };
  }

  const session = await getLatestSessionForUser(user);

  if (!session) {
    return {
      session: null,
      messages: [] as ChatMessage[],
    };
  }

  let rows: AssistantMessageRow[] | null = null;

  const primaryQuery = await supabase
    .from("assistant_messages")
    .select("id, session_id, role, title, content, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (primaryQuery.error) {
    const missingTitleColumn = /title/i.test(primaryQuery.error.message ?? "");

    if (!missingTitleColumn) {
      throw primaryQuery.error;
    }

    const fallbackQuery = await supabase
      .from("assistant_messages")
      .select("id, session_id, role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    if (fallbackQuery.error) {
      throw fallbackQuery.error;
    }

    rows = (fallbackQuery.data ?? []) as AssistantMessageRow[];
  } else {
    rows = (primaryQuery.data ?? []) as AssistantMessageRow[];
  }

  return {
    session,
    messages: (rows ?? []).map((row, index) => mapMessageRowToChatMessage(row, index)),
  };
}

export async function ensureAssistantSession(userId: string, firstUserMessage?: string) {
  const supabase = await createSupabaseServerClient();
  const existing = await getLatestSessionForUser({ id: userId } as User);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("assistant_sessions")
    .insert({
      user_id: userId,
      title: buildSessionTitleFromFirstMessage(firstUserMessage ?? ""),
    })
    .select("id, user_id, title, created_at, updated_at")
    .single<AssistantSessionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function appendAssistantConversationMessages(params: {
  userId: string;
  sessionId?: string | null;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}) {
  const supabase = await createSupabaseServerClient();
  const session = params.sessionId
    ? ({ id: params.sessionId } as AssistantSessionRow)
    : await ensureAssistantSession(params.userId, params.userMessage.content);

  const rows = [params.userMessage, params.assistantMessage].map((message) => ({
    user_id: params.userId,
    session_id: session.id,
    role: message.role,
    title: message.title,
    content: message.content,
    created_at: message.createdAt,
  }));

  const { error: insertError } = await supabase.from("assistant_messages").insert(rows);

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from("assistant_sessions")
    .update({
      updated_at: params.assistantMessage.createdAt,
      title: params.userMessage.content ? buildSessionTitleFromFirstMessage(params.userMessage.content) : undefined,
    })
    .eq("id", session.id)
    .eq("user_id", params.userId);

  if (updateError) {
    throw updateError;
  }

  return session.id;
}
