import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_SETUP_MIN_LENGTH = 8;
export const PASSWORD_SETUP_TOKEN_TTL_HOURS = 24;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPasswordSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePasswordSetupToken() {
  return randomBytes(32).toString("base64url");
}

export function getPasswordSetupExpiryDate(hours = PASSWORD_SETUP_TOKEN_TTL_HOURS) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function isPasswordStrongEnough(password: string) {
  return password.length >= PASSWORD_SETUP_MIN_LENGTH;
}
