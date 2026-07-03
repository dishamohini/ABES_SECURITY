"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingApprovals = getPendingApprovals;
exports.decideApproval = decideApproval;
exports.guardOverrideApproval = guardOverrideApproval;
exports.getLiveInside = getLiveInside;
exports.getLogs = getLogs;
exports.getAuditLogs = getAuditLogs;
exports.getStats = getStats;
const client_1 = require("@prisma/client");
const audit_middleware_1 = require("../middleware/audit.middleware");
const prisma = new client_1.PrismaClient();
/**
 * List pending approvals for the authenticated faculty/HOD
 */
async function getPendingApprovals(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const queryConditions = {
            status: 'PENDING',
        };
        // Faculty / HOD can only see requests assigned to them.
        // Admin can see all pending requests.
        if (req.user.role !== 'SECURITY_ADMIN') {
            queryConditions.approverId = req.user.id;
        }
        const requests = await prisma.visitRequest.findMany({
            where: queryConditions,
            include: {
                visitor: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        aadhaarNumberMasked: true,
                        createdAt: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        name: true,
                        department: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(requests);
    }
    catch (error) {
        console.error('Fetch pending approvals error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Approve or Reject a Visit Request
 */
async function decideApproval(req, res) {
    const { id } = req.params;
    const { decision, message } = req.body; // decision: APPROVED or REJECTED
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Valid decision (APPROVED/REJECTED) is required' });
    }
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const request = await prisma.visitRequest.findUnique({
            where: { id },
            include: { visitor: true },
        });
        if (!request) {
            return res.status(404).json({ error: 'Visit request not found' });
        }
        // Role check: Only assigned approver or admin can decide
        if (req.user.role !== 'SECURITY_ADMIN' && request.approverId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You are not the assigned approver for this request' });
        }
        const updatedStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
        const updatedRequest = await prisma.visitRequest.update({
            where: { id },
            data: {
                status: updatedStatus,
                approvedAt: decision === 'APPROVED' ? new Date() : null,
                approvalMessage: decision === 'APPROVED' ? message : null,
                rejectionReason: decision === 'REJECTED' ? message : null,
                allowedById: decision === 'APPROVED' ? req.user.id : null,
                allowedByRole: decision === 'APPROVED' ? req.user.role : null,
                allowedByName: decision === 'APPROVED' ? req.user.name : null,
            },
        });
        // Write audit log
        await (0, audit_middleware_1.createAuditLog)(req.user.id, `VISITOR_DECISION_${decision}`, `Visitor:${request.visitorId}`, `Decision: ${decision}. Approver: ${req.user.name}. Note: ${message || ''}`);
        return res.json({
            success: true,
            status: updatedRequest.status,
            message: `Request has been ${decision.toLowerCase()} successfully.`,
        });
    }
    catch (error) {
        console.error('Decide approval error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Guard Override (Verbal Approval on Call)
 */
async function guardOverrideApproval(req, res) {
    const { id } = req.params;
    const { message } = req.body; // e.g., "Faculty Dr. Verma approved verbally on call"
    if (req.user?.role !== 'SECURITY_GUARD' && req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Guard or Admin access required' });
    }
    try {
        const request = await prisma.visitRequest.findUnique({
            where: { id },
            include: { visitor: true, approver: true }
        });
        if (!request) {
            return res.status(404).json({ error: 'Visit request not found' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: `Cannot override. Visit status is ${request.status}` });
        }
        const hostName = request.approver ? request.approver.name : 'Concerned Person';
        const finalMessage = message || `Verbal phone approval confirmed with ${hostName}`;
        // Update VisitRequest to APPROVED with Guard tracking details
        const updatedRequest = await prisma.visitRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvalMessage: `[Guard Override] ${finalMessage}`,
                allowedById: req.user.id,
                allowedByRole: req.user.role,
                allowedByName: req.user.name
            }
        });
        // Write audit log
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'VISITOR_GUARD_OVERRIDE', `Visitor:${request.visitorId}`, `Guard override verbal approval. Guard: ${req.user.name}. Note: ${finalMessage}`);
        return res.json({
            success: true,
            status: updatedRequest.status,
            message: `Guard override verbal approval logged successfully. Visitor is approved for entry.`
        });
    }
    catch (error) {
        console.error('Guard override approval error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Live Campus Inside Feed
 */
async function getLiveInside(req, res) {
    try {
        // 1. Fetch system settings for max duration comparison
        const settings = await prisma.systemSettings.findFirst({ where: { id: 1 } });
        const maxInsideMinutes = settings?.maxInsideDurationMinutes || 720; // 12 hrs
        // 2. Fetch active entries
        const allLogs = await prisma.entryLog.findMany({
            orderBy: { timestamp: 'desc' },
            include: {
                user: { select: { id: true, name: true, role: true, department: true, photoUrl: true } },
                vehicle: { select: { id: true, plateNumber: true, vehicleType: true, owner: { select: { name: true } } } },
                visitor: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        visits: {
                            where: { exitTime: null },
                            select: {
                                allowedByName: true,
                                allowedByRole: true,
                                approver: { select: { name: true } }
                            }
                        }
                    }
                },
                gate: true,
                guard: { select: { name: true } },
            },
        });
        // Process to find current status
        const processedUsers = new Map();
        const processedVehicles = new Map();
        const processedVisitors = new Map();
        const now = new Date().getTime();
        for (const log of allLogs) {
            if (log.userId) {
                if (!processedUsers.has(log.userId)) {
                    processedUsers.set(log.userId, log);
                }
            }
            else if (log.vehicleId) {
                if (!processedVehicles.has(log.vehicleId)) {
                    processedVehicles.set(log.vehicleId, log);
                }
            }
            else if (log.visitorId) {
                if (!processedVisitors.has(log.visitorId)) {
                    processedVisitors.set(log.visitorId, log);
                }
            }
        }
        const insideCampusList = [];
        // Filter those whose latest log is IN
        processedUsers.forEach((log) => {
            if (log.direction === 'IN' && log.user) {
                const timeInsideMs = now - new Date(log.timestamp).getTime();
                const durationMinutes = Math.round(timeInsideMs / (1000 * 60));
                insideCampusList.push({
                    type: 'CARDHOLDER',
                    id: log.user.id,
                    name: log.user.name,
                    role: log.user.role,
                    subDetails: log.user.department || 'N/A',
                    photoUrl: log.user.photoUrl,
                    gate: log.gate.name,
                    entryTime: log.timestamp,
                    durationMinutes,
                    overstayAlert: durationMinutes > maxInsideMinutes,
                });
            }
        });
        processedVehicles.forEach((log) => {
            if (log.direction === 'IN' && log.vehicle) {
                const timeInsideMs = now - new Date(log.timestamp).getTime();
                const durationMinutes = Math.round(timeInsideMs / (1000 * 60));
                insideCampusList.push({
                    type: 'VEHICLE',
                    id: log.vehicle.id,
                    name: log.vehicle.plateNumber,
                    role: log.vehicle.vehicleType,
                    subDetails: log.vehicle.owner ? `Owner: ${log.vehicle.owner.name}` : 'Visitor / Delivery',
                    gate: log.gate.name,
                    entryTime: log.timestamp,
                    durationMinutes,
                    overstayAlert: durationMinutes > maxInsideMinutes,
                });
            }
        });
        processedVisitors.forEach((log) => {
            if (log.direction === 'IN' && log.visitor) {
                const timeInsideMs = now - new Date(log.timestamp).getTime();
                const durationMinutes = Math.round(timeInsideMs / (1000 * 60));
                const activeVisit = log.visitor.visits?.[0];
                const hostName = activeVisit?.approver?.name || 'N/A';
                const allowedBy = activeVisit?.allowedByName
                    ? `${activeVisit.allowedByName} (${activeVisit.allowedByRole})`
                    : 'System';
                insideCampusList.push({
                    type: 'VISITOR',
                    id: log.visitor.id,
                    name: log.visitor.name,
                    role: 'VISITOR',
                    subDetails: `Phone: ${log.visitor.phone} | Host: ${hostName} | Allowed By: ${allowedBy}`,
                    gate: log.gate.name,
                    entryTime: log.timestamp,
                    durationMinutes,
                    overstayAlert: durationMinutes > maxInsideMinutes,
                });
            }
        });
        // Sort by entry time
        insideCampusList.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
        return res.json(insideCampusList);
    }
    catch (error) {
        console.error('Fetch live inside error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get EntryLogs with filters
 */
async function getLogs(req, res) {
    const { gateId, type, direction, startDate, endDate, search } = req.query;
    try {
        const whereClause = {};
        if (gateId) {
            whereClause.gateId = String(gateId);
        }
        if (direction) {
            whereClause.direction = direction;
        }
        if (startDate || endDate) {
            whereClause.timestamp = {};
            if (startDate) {
                whereClause.timestamp.gte = new Date(String(startDate));
            }
            if (endDate) {
                whereClause.timestamp.lte = new Date(String(endDate));
            }
        }
        // Filters for "type"
        if (type === 'CARDHOLDER') {
            whereClause.userId = { not: null };
        }
        else if (type === 'VEHICLE') {
            whereClause.vehicleId = { not: null };
        }
        else if (type === 'VISITOR') {
            whereClause.visitorId = { not: null };
        }
        // Base query
        let logs = await prisma.entryLog.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true, role: true, department: true, idCardNumber: true } },
                vehicle: { select: { plateNumber: true, vehicleType: true, stickerNumber: true } },
                visitor: {
                    select: {
                        name: true,
                        phone: true,
                        aadhaarNumberMasked: true,
                        visits: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                allowedByName: true,
                                allowedByRole: true,
                                approver: { select: { name: true } }
                            }
                        }
                    }
                },
                gate: true,
                guard: { select: { name: true } },
            },
            orderBy: { timestamp: 'desc' },
        });
        // Apply text search filter
        if (search) {
            const searchStr = String(search).toLowerCase();
            logs = logs.filter((log) => {
                const uMatch = log.user?.name.toLowerCase().includes(searchStr) || log.user?.idCardNumber?.toLowerCase().includes(searchStr);
                const vMatch = log.vehicle?.plateNumber.toLowerCase().includes(searchStr) || log.vehicle?.stickerNumber.toLowerCase().includes(searchStr);
                const visMatch = log.visitor?.name.toLowerCase().includes(searchStr) || log.visitor?.phone.includes(searchStr);
                return uMatch || vMatch || visMatch || log.gate.name.toLowerCase().includes(searchStr);
            });
        }
        return res.json(logs);
    }
    catch (error) {
        console.error('Fetch logs error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get AuditLogs (Admin only)
 */
async function getAuditLogs(req, res) {
    // Guard check
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Access restricted to Security Admin' });
    }
    try {
        const auditLogs = await prisma.auditLog.findMany({
            include: {
                actor: { select: { name: true, role: true, email: true } },
            },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        return res.json(auditLogs);
    }
    catch (error) {
        console.error('Fetch audit logs error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get System Dashboard Statistics
 */
async function getStats(req, res) {
    try {
        const totalUsers = await prisma.user.count({ where: { role: { not: 'SECURITY_GUARD' } } });
        const totalActiveStickers = await prisma.vehicle.count({ where: { status: 'ACTIVE' } });
        // Calculate pending requests count
        const pendingRequests = await prisma.visitRequest.count({ where: { status: 'PENDING' } });
        // Live count inside campus
        const allLogs = await prisma.entryLog.findMany({
            orderBy: { timestamp: 'desc' },
        });
        const uniqueUsers = new Set();
        const uniqueVehicles = new Set();
        const uniqueVisitors = new Set();
        const usersIn = new Set();
        const vehiclesIn = new Set();
        const visitorsIn = new Set();
        for (const log of allLogs) {
            if (log.userId && !uniqueUsers.has(log.userId)) {
                uniqueUsers.add(log.userId);
                if (log.direction === 'IN')
                    usersIn.add(log.userId);
            }
            if (log.vehicleId && !uniqueVehicles.has(log.vehicleId)) {
                uniqueVehicles.add(log.vehicleId);
                if (log.direction === 'IN')
                    vehiclesIn.add(log.vehicleId);
            }
            if (log.visitorId && !uniqueVisitors.has(log.visitorId)) {
                uniqueVisitors.add(log.visitorId);
                if (log.direction === 'IN')
                    visitorsIn.add(log.visitorId);
            }
        }
        return res.json({
            registeredUsers: totalUsers,
            activeStickers: totalActiveStickers,
            pendingApprovals: pendingRequests,
            insideCampus: {
                users: usersIn.size,
                vehicles: vehiclesIn.size,
                visitors: visitorsIn.size,
                total: usersIn.size + vehiclesIn.size + visitorsIn.size,
            },
        });
    }
    catch (error) {
        console.error('Fetch stats error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=dashboard.controller.js.map