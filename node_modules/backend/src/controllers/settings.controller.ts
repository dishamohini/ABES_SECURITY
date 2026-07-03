import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, Role } from '../middleware/auth.middleware';
import { createAuditLog } from '../middleware/audit.middleware';

const prisma = new PrismaClient();

/**
 * Get current system settings
 */
export async function getSettings(req: AuthenticatedRequest, res: Response) {
  try {
    let settings = await prisma.systemSettings.findFirst({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 1,
          dataRetentionDays: 90,
          maxInsideDurationMinutes: 720,
        },
      });
    }
    return res.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update system settings (Admin only)
 */
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'SECURITY_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { dataRetentionDays, maxInsideDurationMinutes } = req.body;

  try {
    const updated = await prisma.systemSettings.update({
      where: { id: 1 },
      data: {
        dataRetentionDays: dataRetentionDays ? Number(dataRetentionDays) : undefined,
        maxInsideDurationMinutes: maxInsideDurationMinutes ? Number(maxInsideDurationMinutes) : undefined,
      },
    });

    await createAuditLog(
      req.user!.id,
      'UPDATE_SYSTEM_SETTINGS',
      'SystemSettings:1',
      `Updated retention: ${updated.dataRetentionDays} days, Max inside: ${updated.maxInsideDurationMinutes} mins`
    );

    return res.json(updated);
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Add a new gate (Admin only)
 */
export async function addGate(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'SECURITY_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  const { name, location } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Gate name is required' });
  }

  try {
    const existing = await prisma.gate.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: `Gate with name "${name}" already exists.` });
    }

    const gate = await prisma.gate.create({
      data: {
        name,
        location: location || null,
      },
    });

    await createAuditLog(
      req.user!.id,
      'CREATE_GATE',
      `Gate:${gate.id}`,
      `Created new gate: ${name}`
    );

    return res.status(201).json(gate);
  } catch (error) {
    console.error('Create gate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
