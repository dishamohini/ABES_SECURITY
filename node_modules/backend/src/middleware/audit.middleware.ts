import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth.middleware';

const prisma = new PrismaClient();

export interface AuditDetails {
  action: string;
  targetRecord: string; // E.g., "Visitor:uuid"
  details?: string;
}

/**
 * Utility to write logs directly to the AuditLog database table.
 */
export async function createAuditLog(
  actorId: string | null,
  action: string,
  targetRecord: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetRecord,
        details,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
