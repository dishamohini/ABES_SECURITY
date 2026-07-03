"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getMe = getMe;
exports.searchDirectory = searchDirectory;
exports.changePassword = changePassword;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const audit_middleware_1 = require("../middleware/audit.middleware");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforabesgatekeymanagement123';
/**
 * User Login
 */
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: `Account is ${user.status}. Please contact the administrator.` });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get current profile
 */
async function getMe(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                idCardNumber: true,
                photoUrl: true,
                status: true,
                department: true,
                phone: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(user);
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Search user directory (used by guards to find faculty hosts)
 */
async function searchDirectory(req, res) {
    const { query } = req.query;
    try {
        const users = await prisma.user.findMany({
            where: {
                role: {
                    in: ['FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN'],
                },
                status: 'ACTIVE',
                OR: [
                    { name: { contains: String(query || '') } },
                    { department: { contains: String(query || '') } },
                ],
            },
            select: {
                id: true,
                name: true,
                role: true,
                department: true,
                email: true,
            },
            take: 10,
        });
        return res.json(users);
    }
    catch (error) {
        console.error('Directory search error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Change User Password from Login Page
 */
async function changePassword(req, res) {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Email, current password, and new password are required' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found in directory' });
        }
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is suspended or inactive.' });
        }
        // Verify current password
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid current password' });
        }
        // Hash new password
        const salt = await bcryptjs_1.default.genSalt(10);
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, salt);
        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash },
        });
        // Write audit log
        await (0, audit_middleware_1.createAuditLog)(user.id, 'PASSWORD_CHANGED', `User:${user.id}`, `User changed password from login page.`);
        return res.json({
            success: true,
            message: 'Password updated successfully. You can now log in with your new password.',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Internal server error during password update' });
    }
}
//# sourceMappingURL=auth.controller.js.map