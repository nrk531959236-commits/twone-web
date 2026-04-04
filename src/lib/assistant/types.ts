export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  title: string;
  content: string;
  createdAt: string;
};

export type AssistantSession = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantQuotaView = {
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  currentPeriod: string;
  quotaMessage: string;
};

export type AssistantReplyParams = {
  message: string;
  history: ChatMessage[];
  sessionId?: string | null;
};

export type AssistantReplyResult = {
  message: ChatMessage;
  quota?: AssistantQuotaView;
  sessionId?: string | null;
};
