export interface ActingUser {
  id: string;
  role: string;
}

export interface TicketAccess {
  reporterId: string;
  // Callers load only the most recent assignment, using latestAssignmentOrder.
  assignments: { technicianId: string }[];
}

export const latestAssignmentOrder = [
  { assignedAt: "desc" as const },
  { id: "desc" as const },
];

export function isAdmin(user: ActingUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "SUPERADMIN";
}

export function canReportTicket(user: ActingUser | null): boolean {
  return user?.role === "STUDENT" || user?.role === "STAFF";
}

export function canManageTicket(user: ActingUser | null, ticket: TicketAccess): boolean {
  return isAdmin(user) || (
    user?.role === "TECHNICIAN" &&
    ticket.assignments[0]?.technicianId === user.id
  );
}

export function canEvaluateTicket(user: ActingUser | null, ticket: TicketAccess): boolean {
  return canReportTicket(user) && user?.id === ticket.reporterId;
}

export function canViewTicket(user: ActingUser | null, ticket: TicketAccess): boolean {
  return canEvaluateTicket(user, ticket) || canManageTicket(user, ticket);
}
