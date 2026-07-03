"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectoryUsers = getDirectoryUsers;
exports.createDirectoryUser = createDirectoryUser;
exports.deleteDirectoryUser = deleteDirectoryUser;
exports.createDirectoryUsersBulk = createDirectoryUsersBulk;
exports.deleteDirectoryUsersBulk = deleteDirectoryUsersBulk;
exports.updateDirectoryUser = updateDirectoryUser;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const audit_middleware_1 = require("../middleware/audit.middleware");
const prisma = new client_1.PrismaClient();
/**
 * List all users in the directory
 */
async function getDirectoryUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                phone: true,
                extensionNumber: true,
                department: true,
                post: true,
                role: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(users);
    }
    catch (error) {
        console.error('Fetch directory users error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Create a new user in the directory
 */
async function createDirectoryUser(req, res) {
    const { employeeCode, name, email, phone, extensionNumber, department, // 'Faculty', 'Staff', 'Admin', 'Accounts', 'HR'
    post, role // 'SECURITY_GUARD', 'FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN'
     } = req.body;
    if (!employeeCode || !name || !email || !department) {
        return res.status(400).json({ error: 'Employee Code, Name, Email, and Department are required.' });
    }
    // Restrict to Security Admin
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    try {
        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        if (existingEmail) {
            return res.status(400).json({ error: 'User with this Email already exists.' });
        }
        // Check if employeeCode already exists
        const existingCode = await prisma.user.findUnique({
            where: { employeeCode }
        });
        if (existingCode) {
            return res.status(400).json({ error: 'User with this Employee Code already exists.' });
        }
        // Hash default password 'abes123'
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash('abes123', salt);
        // Normalize role string
        const systemRole = normalizeRole(role, department);
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                passwordHash,
                name,
                phone: phone || null,
                employeeCode,
                extensionNumber: extensionNumber || null,
                department,
                post: post || null,
                role: systemRole,
                status: 'ACTIVE',
            }
        });
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'CREATE_DIRECTORY_USER', `User:${newUser.id}`, `Created directory user: ${name} (${employeeCode}), Department: ${department}`);
        return res.status(201).json({
            success: true,
            message: `User ${name} created successfully with default password: abes123`,
            user: {
                id: newUser.id,
                name: newUser.name,
                employeeCode: newUser.employeeCode,
                email: newUser.email,
                department: newUser.department,
                post: newUser.post
            }
        });
    }
    catch (error) {
        console.error('Create directory user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Delete a user from the directory
 */
async function deleteDirectoryUser(req, res) {
    const { id } = req.params;
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    // Prevent deleting oneself
    if (req.user.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'User not found in directory.' });
        }
        await prisma.user.delete({ where: { id } });
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'DELETE_DIRECTORY_USER', `User:${id}`, `Deleted directory user: ${user.name} (${user.employeeCode})`);
        return res.json({ success: true, message: `User ${user.name} removed from directory.` });
    }
    catch (error) {
        console.error('Delete directory user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Bulk Import Users into the directory
 */
async function createDirectoryUsersBulk(req, res) {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Payload must contain a list of users.' });
    }
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash('abes123', salt);
        let importedCount = 0;
        let skippedCount = 0;
        const skippedRecords = [];
        for (const u of users) {
            const code = String(u.employeeCode || '').trim();
            const emailStr = String(u.email || '').trim().toLowerCase();
            const nameStr = String(u.name || '').trim();
            const departmentStr = String(u.department || '').trim();
            const phoneStr = u.phone ? String(u.phone).trim() : null;
            const extStr = u.extensionNumber ? String(u.extensionNumber).trim() : null;
            const postStr = u.post ? String(u.post).trim() : null;
            if (!code || !emailStr || !nameStr || !departmentStr) {
                skippedCount++;
                skippedRecords.push(`${nameStr || 'Unknown'} (Missing required fields)`);
                continue;
            }
            const existingEmail = await prisma.user.findUnique({
                where: { email: emailStr }
            });
            const existingCode = await prisma.user.findUnique({
                where: { employeeCode: code }
            });
            if (existingEmail || existingCode) {
                skippedCount++;
                skippedRecords.push(`${nameStr} (${code}) [Duplicate code/email]`);
                continue;
            }
            const systemRole = normalizeRole(u.role, departmentStr);
            await prisma.user.create({
                data: {
                    email: emailStr,
                    passwordHash,
                    name: nameStr,
                    phone: phoneStr,
                    employeeCode: code,
                    extensionNumber: extStr,
                    department: departmentStr,
                    post: postStr,
                    role: systemRole,
                    status: 'ACTIVE',
                }
            });
            importedCount++;
        }
        if (importedCount > 0) {
            await (0, audit_middleware_1.createAuditLog)(req.user.id, 'BULK_IMPORT_DIRECTORY_USERS', 'User:Bulk', `Successfully imported ${importedCount} users. Skipped ${skippedCount} records.`);
        }
        return res.status(201).json({
            success: true,
            message: `Bulk import completed. Successfully imported ${importedCount} users. Skipped ${skippedCount} duplicate/invalid records.`,
            importedCount,
            skippedCount,
            skippedRecords,
        });
    }
    catch (error) {
        console.error('Bulk import error:', error);
        return res.status(500).json({ error: 'Internal server error during bulk import.' });
    }
}
/**
 * Normalizes user-friendly role inputs (like 'Admin', 'Guard', 'HOD') to the database system roles
 */
function normalizeRole(roleStr, departmentStr) {
    const clean = String(roleStr || '').toLowerCase().trim();
    if (clean.includes('admin'))
        return 'SECURITY_ADMIN';
    if (clean.includes('guard') || clean.includes('security') || clean.includes('police'))
        return 'SECURITY_GUARD';
    if (clean.includes('hod') || clean.includes('head') || clean.includes('approver') || clean.includes('director') || clean.includes('dean'))
        return 'DEPT_HEAD';
    if (clean.includes('faculty') || clean.includes('staff') || clean.includes('teacher') || clean.includes('professor') || clean.includes('employee') || clean.includes('hr'))
        return 'FACULTY';
    // Fallback defaults
    if (departmentStr.toLowerCase() === 'staff')
        return 'SECURITY_GUARD';
    return 'FACULTY';
}
/**
 * Bulk Delete Users from the directory
 */
async function deleteDirectoryUsersBulk(req, res) {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Payload must contain a list of user IDs to delete.' });
    }
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    const activeAdminId = req.user.id;
    const idsToDelete = ids.filter(id => id !== activeAdminId);
    if (idsToDelete.length === 0) {
        return res.status(400).json({ error: 'No valid user IDs specified for deletion (cannot delete yourself).' });
    }
    try {
        const result = await prisma.user.deleteMany({
            where: {
                id: { in: idsToDelete }
            }
        });
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'BULK_DELETE_DIRECTORY_USERS', 'User:Bulk', `Bulk deleted ${result.count} users from the directory.`);
        return res.json({
            success: true,
            message: `Successfully removed ${result.count} users from the directory.`,
            deletedCount: result.count
        });
    }
    catch (error) {
        console.error('Bulk delete directory users error:', error);
        return res.status(500).json({ error: 'Internal server error during bulk deletion.' });
    }
}
/**
 * Update a user in the directory
 */
async function updateDirectoryUser(req, res) {
    const { id } = req.params;
    const { name, email, phone, extensionNumber, department, post, role } = req.body;
    if (req.user?.role !== 'SECURITY_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    if (!name || !email || !department) {
        return res.status(400).json({ error: 'Name, Email, and Department are required.' });
    }
    try {
        const userToUpdate = await prisma.user.findUnique({ where: { id } });
        if (!userToUpdate) {
            return res.status(404).json({ error: 'User not found in directory.' });
        }
        const existingEmail = await prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                id: { not: id }
            }
        });
        if (existingEmail) {
            return res.status(400).json({ error: 'Another user with this Email already exists.' });
        }
        const systemRole = normalizeRole(role, department);
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                name,
                email: email.toLowerCase(),
                phone: phone || null,
                extensionNumber: extensionNumber || null,
                department,
                post: post || null,
                role: systemRole,
            }
        });
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'UPDATE_DIRECTORY_USER', `User:${id}`, `Updated directory user: ${name} (${updatedUser.employeeCode}), Department: ${department}`);
        return res.json({
            success: true,
            message: `User ${name} updated successfully.`,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                employeeCode: updatedUser.employeeCode,
                email: updatedUser.email,
                department: updatedUser.department,
                post: updatedUser.post
            }
        });
    }
    catch (error) {
        console.error('Update directory user error:', error);
        return res.status(500).json({ error: 'Internal server error during user update.' });
    }
}
//# sourceMappingURL=directory.controller.js.map