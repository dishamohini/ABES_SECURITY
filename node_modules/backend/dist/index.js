"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_1 = require("./middleware/auth.middleware");
// Load environment variables
dotenv_1.default.config();
// Import controllers
const authController = __importStar(require("./controllers/auth.controller"));
const gateController = __importStar(require("./controllers/gate.controller"));
const visitorController = __importStar(require("./controllers/visitor.controller"));
const dashboardController = __importStar(require("./controllers/dashboard.controller"));
const settingsController = __importStar(require("./controllers/settings.controller"));
const directoryController = __importStar(require("./controllers/directory.controller"));
// Import services
const retention_job_1 = require("./services/retention.job");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS and parsing of large payloads (for base64 photos)
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
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
app.use(auth_middleware_1.authenticateToken); // Guard all subsequent routes
app.get('/api/auth/me', authController.getMe);
app.get('/api/auth/directory', authController.searchDirectory);
app.get('/api/gates', gateController.getGates);
// Guard-specific Gate Scanning & Visitor flows
app.post('/api/entry/scan-card', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), gateController.scanCard);
app.post('/api/entry/scan-sticker', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), gateController.scanVehicle);
app.post('/api/visitors/ocr', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), visitorController.runOcr);
app.post('/api/visitors/register', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), visitorController.registerVisitor);
app.post('/api/visitors/check-in', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), visitorController.checkInVisitor);
app.post('/api/visitors/exit-match', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), visitorController.exitMatchVisitor);
// Decrypted biometrics/IDs (requires audit logs logged within controllers)
app.get('/api/visitors/face/:visitorId', visitorController.getFacePhoto);
app.get('/api/visitors/aadhaar/:visitorId', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN', 'DEPT_HEAD']), visitorController.viewAadhaar);
app.get('/api/visitors/request/:id', visitorController.getVisitRequest);
// Approvals
app.get('/api/approvals/pending', (0, auth_middleware_1.requireRoles)(['FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN']), dashboardController.getPendingApprovals);
app.post('/api/approvals/:id/decide', (0, auth_middleware_1.requireRoles)(['FACULTY', 'DEPT_HEAD', 'SECURITY_ADMIN']), dashboardController.decideApproval);
app.post('/api/approvals/:id/guard-override', (0, auth_middleware_1.requireRoles)(['SECURITY_GUARD', 'SECURITY_ADMIN']), dashboardController.guardOverrideApproval);
// Dashboard & Monitoring
app.get('/api/dashboard/live-inside', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN', 'SECURITY_GUARD']), dashboardController.getLiveInside);
app.get('/api/dashboard/logs', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), dashboardController.getLogs);
app.get('/api/dashboard/audit-logs', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), dashboardController.getAuditLogs);
app.get('/api/dashboard/stats', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN', 'SECURITY_GUARD']), dashboardController.getStats);
// Settings
app.get('/api/settings', settingsController.getSettings);
app.post('/api/settings', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), settingsController.updateSettings);
app.post('/api/settings/gates', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), settingsController.addGate);
// Directory Management
app.get('/api/directory/users', directoryController.getDirectoryUsers);
app.post('/api/directory/users', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), directoryController.createDirectoryUser);
app.delete('/api/directory/users/:id', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), directoryController.deleteDirectoryUser);
app.put('/api/directory/users/:id', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), directoryController.updateDirectoryUser);
app.post('/api/directory/users/bulk', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), directoryController.createDirectoryUsersBulk);
app.post('/api/directory/users/bulk-delete', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), directoryController.deleteDirectoryUsersBulk);
// Manually trigger data purging for testing
app.post('/api/settings/trigger-purge', (0, auth_middleware_1.requireRoles)(['SECURITY_ADMIN']), async (req, res) => {
    const purged = await (0, retention_job_1.runDataRetentionPurge)();
    return res.json({ success: true, purgedCount: purged });
});
// Start Server and Retention Scheduler
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Start daily retention check scheduler
    (0, retention_job_1.startRetentionScheduler)();
});
//# sourceMappingURL=index.js.map