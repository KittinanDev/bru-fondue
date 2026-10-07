export const activeJobStatuses = ["IN_PROGRESS", "WAITING_PARTS"];
export function isClosedTicket(status: string) {
  return status === "COMPLETED" || status === "REJECTED" || status === "CANCELLED";
}
export function canUpdateJob(from: string, to: string) {
  return activeJobStatuses.includes(from) && [...activeJobStatuses, "COMPLETED"].includes(to);
}
