export function workspaceForRole(role: string): string {
  if (role === "ADMIN" || role === "SUPERADMIN") return "/admin/tickets";
  if (role === "TECHNICIAN") return "/technician/jobs";
  return "/my-tickets";
}
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/(?:profile|report|notifications|my-tickets|technician\/(?:jobs|history)|admin\/(?:tickets|dashboard|settings|users|reports\/pdf)|tickets\/[a-zA-Z0-9-]+)$/.test(value) ? value : null;
}
