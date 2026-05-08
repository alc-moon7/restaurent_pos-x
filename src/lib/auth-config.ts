export const ADMIN_ROLE = "admin";
export const AUTH_COOKIE_NAME = "pos_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

export function getAdminPin() {
  return process.env.ADMIN_PIN ?? "1234";
}

export function getJwtSecret() {
  return process.env.JWT_SECRET ?? "your-secret-key-change-this";
}
