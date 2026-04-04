const AUTH_ERROR_FALLBACK = "登录失败，请稍后重试。";

function normalizeMessage(message: string) {
  return message.trim().toLowerCase();
}

export function getReadableAuthErrorMessage(rawMessage: string | null | undefined) {
  const message = (rawMessage ?? "").trim();

  if (!message) {
    return AUTH_ERROR_FALLBACK;
  }

  const normalized = normalizeMessage(message);

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("security purposes")
  ) {
    return "发送过于频繁，请稍后再试。";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("otp_expired") ||
    normalized.includes("flow state expired")
  ) {
    return "登录链接已过期，请重新获取。";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("otp") ||
    normalized.includes("token") ||
    normalized.includes("code verifier") ||
    normalized.includes("flow state not found")
  ) {
    return "登录链接无效，请重新获取。";
  }

  if (normalized.includes("user not found")) {
    return "未找到对应账号，请确认邮箱后重试。";
  }

  if (normalized.includes("email not confirmed")) {
    return "邮箱尚未确认，请先完成邮箱验证。";
  }

  if (normalized.includes("signup is disabled")) {
    return "当前暂不支持该登录方式。";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "网络连接异常，请稍后重试。";
  }

  return AUTH_ERROR_FALLBACK;
}

export function getAuthCallbackErrorMessage(authError: string | null | undefined) {
  if (!authError) {
    return null;
  }

  if (authError === "missing_code") {
    return "登录信息不完整，请重新获取登录链接。";
  }

  return getReadableAuthErrorMessage(authError);
}
