import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../middleware/tenant.middleware";

/**
 * Managers are branch-scoped. If the requesting user is a manager, enforce
 * that they can only access data for their own branch.
 * Owners and other roles are unrestricted.
 */
export function assertBranchAccess(
  req: AuthenticatedRequest,
  targetBranchId: string | null | undefined,
): void {
  if (req.userRole !== "manager") return;
  if (!req.branchId) return; // manager with no branch set — unrestricted (edge case)
  if (targetBranchId && targetBranchId !== req.branchId) {
    throw new ForbiddenException("Managers can only access their own branch");
  }
}

/**
 * For list queries: if requester is a manager, override branchId filter
 * with their own so they can't supply a different branchId in the query.
 */
export function resolveBranchFilter(req: AuthenticatedRequest, requested?: string): string | undefined {
  if (req.userRole === "manager" && req.branchId) {
    return req.branchId; // always override with their branch
  }
  return requested;
}
