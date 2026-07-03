import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, Role } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export type Direction = 'IN' | 'OUT';

/**
 * List all gates
 */
export async function getGates(req: AuthenticatedRequest, res: Response) {
  try {
    const gates = await prisma.gate.findMany();
    return res.json(gates);
  } catch (error) {
    console.error('Fetch gates error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Scan Cardholder QR/Barcode or Manual Lookup
 */
export async function scanCard(req: AuthenticatedRequest, res: Response) {
  const { idCardNumber, gateId } = req.body;
  const guardId = req.user?.id;

  if (!idCardNumber || !gateId) {
    return res.status(400).json({ error: 'idCardNumber and gateId are required' });
  }

  if (!guardId) {
    return res.status(401).json({ error: 'Guard authenticated credentials missing' });
  }

  try {
    // 1. Fetch user (cardholder)
    const cardholder = await prisma.user.findUnique({
      where: { idCardNumber },
    });

    if (!cardholder) {
      return res.status(404).json({ error: 'Cardholder not found in directory' });
    }

    // 2. Validate flags/status
    if (cardholder.status === 'SUSPENDED' || cardholder.status === 'BLOCKLISTED') {
      return res.status(403).json({
        blocked: true,
        name: cardholder.name,
        role: cardholder.role,
        department: cardholder.department,
        message: `Entry Denied! Cardholder status is ${cardholder.status}.`,
      });
    }

    // 3. Find latest EntryLog to determine direction (IN/OUT)
    const latestLog = await prisma.entryLog.findFirst({
      where: { userId: cardholder.id },
      orderBy: { timestamp: 'desc' },
    });

    // Fetch settings for max inside duration check
    const settings = await prisma.systemSettings.findFirst({ where: { id: 1 } });
    const maxInsideMinutes = settings?.maxInsideDurationMinutes || 720; // 12 hours default

    let direction: Direction = 'IN';
    let overstayed = false;
    let timeInsideMinutes = 0;

    if (latestLog && latestLog.direction === 'IN') {
      // User is already marked inside, so this scan means they are EXITING
      direction = 'OUT';
      
      // Calculate time spent inside
      const entryTime = new Date(latestLog.timestamp).getTime();
      const exitTime = Date.now();
      timeInsideMinutes = Math.round((exitTime - entryTime) / (1000 * 60));
      
      if (timeInsideMinutes > maxInsideMinutes) {
        overstayed = true;
      }
    }

    // 4. Create Entry Log
    const newLog = await prisma.entryLog.create({
      data: {
        direction,
        userId: cardholder.id,
        gateId,
        guardId,
      },
      include: {
        gate: true,
        guard: { select: { name: true } },
      },
    });

    return res.json({
      success: true,
      cardholder: {
        id: cardholder.id,
        name: cardholder.name,
        role: cardholder.role,
        department: cardholder.department,
        photoUrl: cardholder.photoUrl,
      },
      direction,
      timestamp: newLog.timestamp,
      gate: newLog.gate.name,
      guard: newLog.guard.name,
      overstayAlert: overstayed,
      durationMinutes: direction === 'OUT' ? timeInsideMinutes : null,
      message: direction === 'IN' 
        ? `${cardholder.name} marked IN.` 
        : `${cardholder.name} marked OUT.${overstayed ? ' WARNING: Max stay exceeded!' : ''}`,
    });
  } catch (error) {
    console.error('Scan card error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Scan Vehicle Sticker or Manual Entry
 */
export async function scanVehicle(req: AuthenticatedRequest, res: Response) {
  const { stickerNumber, gateId, capturePlate } = req.body;
  const guardId = req.user?.id;

  if (!stickerNumber || !gateId) {
    return res.status(400).json({ error: 'stickerNumber and gateId are required' });
  }

  if (!guardId) {
    return res.status(401).json({ error: 'Guard credentials missing' });
  }

  try {
    // 1. Fetch vehicle and owner
    const vehicle = await prisma.vehicle.findUnique({
      where: { stickerNumber },
      include: { owner: true },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle sticker not registered' });
    }

    // 2. Validate sticker status
    if (vehicle.status !== 'ACTIVE') {
      return res.status(403).json({
        blocked: true,
        plateNumber: vehicle.plateNumber,
        type: vehicle.vehicleType,
        message: `Sticker status is ${vehicle.status}. Vehicle access is blocked!`,
      });
    }

    // 3. Validate owner flags (if linked to owner)
    if (vehicle.owner && (vehicle.owner.status === 'SUSPENDED' || vehicle.owner.status === 'BLOCKLISTED')) {
      return res.status(403).json({
        blocked: true,
        plateNumber: vehicle.plateNumber,
        owner: vehicle.owner.name,
        message: `Vehicle owner is ${vehicle.owner.status}. Access blocked!`,
      });
    }

    // Optional license plate mismatch alert
    let plateMismatch = false;
    if (capturePlate && capturePlate !== vehicle.plateNumber) {
      plateMismatch = true;
    }

    // 4. Determine direction
    const latestLog = await prisma.entryLog.findFirst({
      where: { vehicleId: vehicle.id },
      orderBy: { timestamp: 'desc' },
    });

    let direction: Direction = 'IN';
    if (latestLog && latestLog.direction === 'IN') {
      direction = 'OUT';
    }

    // 5. Create entry log
    const newLog = await prisma.entryLog.create({
      data: {
        direction,
        vehicleId: vehicle.id,
        gateId,
        guardId,
      },
      include: {
        gate: true,
        guard: { select: { name: true } },
      },
    });

    return res.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        stickerNumber: vehicle.stickerNumber,
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        owner: vehicle.owner ? {
          name: vehicle.owner.name,
          role: vehicle.owner.role,
          department: vehicle.owner.department,
        } : null,
      },
      direction,
      timestamp: newLog.timestamp,
      gate: newLog.gate.name,
      guard: newLog.guard.name,
      plateMismatchAlert: plateMismatch,
      message: direction === 'IN' 
        ? `Vehicle ${vehicle.plateNumber} marked IN.` 
        : `Vehicle ${vehicle.plateNumber} marked OUT.`,
    });
  } catch (error) {
    console.error('Scan vehicle error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
