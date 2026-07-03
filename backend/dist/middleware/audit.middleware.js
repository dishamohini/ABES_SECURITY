"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Utility to write logs directly to the AuditLog database table.
 */
async function createAuditLog(actorId, action, targetRecord, details, ipAddress) {
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
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
//# sourceMappingURL=audit.middleware.js.map