import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { createAuditLog } from '../middleware/audit.middleware';

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(__dirname, '../../uploads/faces');

/**
 * Runs the visitor biometric data purging job based on system settings.
 * Removes encrypted face photo file, scrubs keys/Aadhaar, and flags record as purged.
 */
export async function runDataRetentionPurge(): Promise<number> {
  console.log('[Retention Job] Running visitor data retention scrubbing...');
  
  try {
    // 1. Fetch data retention settings
    const settings = await prisma.systemSettings.findFirst({ where: { id: 1 } });
    const retentionDays = settings?.dataRetentionDays || 90;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`[Retention Job] Scrubbing records created before ${cutoffDate.toISOString()} (${retentionDays} days retention)`);

    // 2. Query visitors matching cutoff date that are not purged yet
    const visitorsToPurge = await prisma.visitor.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        purgedAt: null,
        // Ensure they don't have any ongoing active visits inside campus
        visits: {
          none: {
            status: { in: ['PENDING', 'APPROVED'] }
          }
        }
      },
      include: {
        visits: true
      }
    });

    console.log(`[Retention Job] Found ${visitorsToPurge.length} visitors to scrub.`);
    let purgeCount = 0;

    for (const visitor of visitorsToPurge) {
      // a. Delete face image from disk
      if (visitor.facePhotoRef && visitor.facePhotoRef !== 'PURGED') {
        const photoPath = path.join(UPLOAD_DIR, visitor.facePhotoRef);
        if (fs.existsSync(photoPath)) {
          try {
            fs.unlinkSync(photoPath);
            console.log(`[Retention Job] Deleted biometric file: ${photoPath}`);
          } catch (err) {
            console.error(`[Retention Job] Error deleting file ${photoPath}:`, err);
          }
        }
      }

      // b. Update database record (Scrub sensitive details)
      await prisma.visitor.update({
        where: { id: visitor.id },
        data: {
          facePhotoRef: 'PURGED',
          facePhotoKeyEncrypted: 'PURGED',
          aadhaarNumberEncrypted: 'PURGED',
          purgedAt: new Date(),
        }
      });

      // c. Log the purge event to the AuditLog (System Actor)
      await createAuditLog(
        null, // System Actor
        'RETENTION_POLICY_PURGE_BIOMETRICS',
        `Visitor:${visitor.id}`,
        `Scrubbed Aadhaar and face biometric data automatically after exceeding ${retentionDays} days retention.`
      );

      purgeCount++;
    }

    console.log(`[Retention Job] Successfully scrubbed ${purgeCount} records.`);
    return purgeCount;
  } catch (error) {
    console.error('[Retention Job] Error during retention purge execution:', error);
    return 0;
  }
}

/**
 * Starts the periodic cron-like interval to run the retention job daily
 */
export function startRetentionScheduler(intervalMs: number = 24 * 60 * 60 * 1000) {
  // Run once immediately on startup
  setTimeout(() => {
    runDataRetentionPurge();
  }, 5000);

  // Set interval
  setInterval(() => {
    runDataRetentionPurge();
  }, intervalMs);
}
