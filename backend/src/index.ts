import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken, requireRoles, Role } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

// Import controllers
import * as authController from './controllers/auth.controller';
import * as gateController from './controllers/gate.controller';
import * as visitorController from './controllers/visitor.controller';
import * as dashboardController from './controllers/dashboard.controller';
import * as settingsController from './controllers/settings.controller';
import * as directoryController from './controllers/directory.controller';

// Import services
import { startRetentionScheduler, runDataRetentionPurge } from './services/retention.job';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and parsing of large payloads (for base64 photos)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Print requests for local development
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
app.post('/api/auth/login', authController.login);
app.post('/api/auth/change-password', authController.changePassword);

// ==========================================
// 2. AUTHENTICATED ROUTES
// ==========================================
app.use(authenticateToken); // Guard all subsequent routes

app.get('/api/auth/me', authController.getMe);
app.get('/api/auth/directory', authController.searchDirectory);
app.get('/api/gates', gateController.getGates);

// Guard-specific Gate Scanning & Visitor flows
app.post(
  '/api/entry/scan-card',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  gateController.scanCard
);
app.post(
  '/api/entry/scan-sticker',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  gateController.scanVehicle
);

app.post(
  '/api/visitors/ocr',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  visitorController.runOcr
);
app.post(
  '/api/visitors/register',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  visitorController.registerVisitor
);
app.post(
  '/api/visitors/check-in',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  visitorController.checkInVisitor
);
app.post(
  '/api/visitors/exit-match',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  visitorController.exitMatchVisitor
);

// Decrypted biometrics/IDs (requires audit logs logged within controllers)
app.get('/api/visitors/face/:visitorId', visitorController.getFacePhoto);
app.get(
  '/api/visitors/aadhaar/:visitorId',
  requireRoles(['SECURITY_ADMIN', 'DEPT_HEAD']),
  visitorController.viewAadhaar
);
app.get('/api/visitors/request/:id', visitorController.getVisitRequest);

// Approvals
app.get(
  '/api/approvals/pending',
  requireRoles(['FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN']),
  dashboardController.getPendingApprovals
);
app.post(
  '/api/approvals/:id/decide',
  requireRoles(['FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN']),
  dashboardController.decideApproval
);
app.post(
  '/api/approvals/:id/guard-override',
  requireRoles(['SECURITY_GUARD', 'SECURITY_ADMIN']),
  dashboardController.guardOverrideApproval
);

// Dashboard & Monitoring
app.get(
  '/api/dashboard/live-inside',
  requireRoles(['SECURITY_ADMIN', 'SECURITY_GUARD']),
  dashboardController.getLiveInside
);
app.get(
  '/api/dashboard/logs',
  requireRoles(['SECURITY_ADMIN']),
  dashboardController.getLogs
);
app.get(
  '/api/dashboard/audit-logs',
  requireRoles(['SECURITY_ADMIN']),
  dashboardController.getAuditLogs
);
app.get(
  '/api/dashboard/stats',
  requireRoles(['SECURITY_ADMIN', 'SECURITY_GUARD']),
  dashboardController.getStats
);

// Settings
app.get('/api/settings', settingsController.getSettings);
app.post(
  '/api/settings',
  requireRoles(['SECURITY_ADMIN']),
  settingsController.updateSettings
);
app.post(
  '/api/settings/gates',
  requireRoles(['SECURITY_ADMIN']),
  settingsController.addGate
);

// Directory Management
app.get(
  '/api/directory/users',
  directoryController.getDirectoryUsers
);
app.post(
  '/api/directory/users',
  requireRoles(['SECURITY_ADMIN']),
  directoryController.createDirectoryUser
);
app.delete(
  '/api/directory/users/:id',
  requireRoles(['SECURITY_ADMIN']),
  directoryController.deleteDirectoryUser
);
app.put(
  '/api/directory/users/:id',
  requireRoles(['SECURITY_ADMIN']),
  directoryController.updateDirectoryUser
);
app.post(
  '/api/directory/users/bulk',
  requireRoles(['SECURITY_ADMIN']),
  directoryController.createDirectoryUsersBulk
);
app.post(
  '/api/directory/users/bulk-delete',
  requireRoles(['SECURITY_ADMIN']),
  directoryController.deleteDirectoryUsersBulk
);

// Manually trigger data purging for testing
app.post(
  '/api/settings/trigger-purge',
  requireRoles(['SECURITY_ADMIN']),
  async (req, res) => {
    const purged = await runDataRetentionPurge();
    return res.json({ success: true, purgedCount: purged });
  }
);

// Start Server and Retention Scheduler
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Start daily retention check scheduler
  startRetentionScheduler();
});
