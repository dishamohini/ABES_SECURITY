import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, Role } from '../middleware/auth.middleware';
import { createAuditLog } from '../middleware/audit.middleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforabesgatekeymanagement123';

/**
 * User Login
 */
export async function login(req: AuthenticatedRequest, res: Response) {
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

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

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
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current profile
 */
export async function getMe(req: AuthenticatedRequest, res: Response) {
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
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Search user directory (used by guards to find faculty hosts)
 */
export async function searchDirectory(req: AuthenticatedRequest, res: Response) {
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
  } catch (error) {
    console.error('Directory search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Change User Password from Login Page
 */
export async function changePassword(req: AuthenticatedRequest, res: Response) {
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
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Write audit log
    await createAuditLog(
      user.id,
      'PASSWORD_CHANGED',
      `User:${user.id}`,
      `User changed password from login page.`
    );

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Internal server error during password update' });
  }
}
