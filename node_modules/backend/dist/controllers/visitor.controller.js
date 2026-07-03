"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOcr = runOcr;
exports.registerVisitor = registerVisitor;
exports.getVisitRequest = getVisitRequest;
exports.checkInVisitor = checkInVisitor;
exports.getFacePhoto = getFacePhoto;
exports.viewAadhaar = viewAadhaar;
exports.exitMatchVisitor = exitMatchVisitor;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const encryption_service_1 = require("../services/encryption.service");
const ocr_service_1 = require("../services/ocr.service");
const face_service_1 = require("../services/face.service");
const audit_middleware_1 = require("../middleware/audit.middleware");
const prisma = new client_1.PrismaClient();
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/faces');
// Ensure upload directory exists
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
/**
 * Helper to parse Base64 image string to Buffer
 */
function base64ToBuffer(base64Str) {
    // Check if it has a prefix like "data:image/jpeg;base64,"
    const cleanBase64 = base64Str.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(cleanBase64, 'base64');
}
/**
 * Aadhaar OCR OCR Extraction Endpoint
 */
async function runOcr(req, res) {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 image string is required' });
    }
    try {
        const buffer = base64ToBuffer(imageBase64);
        const result = await (0, ocr_service_1.extractAadhaarDetails)(buffer);
        // Mask the Aadhaar number in response if needed, but for the confirmation screen
        // the user requires the unmasked number to verify/correct.
        await (0, audit_middleware_1.createAuditLog)(req.user?.id || null, 'OCR_AADHAAR_EXTRACTION', 'Visitor:Temp', `Extracted name: ${result.name}`);
        return res.json(result);
    }
    catch (error) {
        console.error('OCR Controller error:', error);
        return res.status(500).json({ error: 'Internal server error during OCR' });
    }
}
/**
 * Register a New Visitor & Create a Visit Request (PENDING)
 */
async function registerVisitor(req, res) {
    const { name, phone, consentAccepted, purposeCategory, purposeDetails, hostUserId, // optional (for MEETING)
    facePhotoBase64, aadhaarNumber, gateId } = req.body;
    const guardId = req.user?.id;
    if (!name || !phone || !consentAccepted || !purposeCategory || !facePhotoBase64 || !aadhaarNumber || !gateId) {
        return res.status(400).json({ error: 'All fields including consent, face photo, and Aadhaar are required' });
    }
    if (!guardId) {
        return res.status(401).json({ error: 'Guard credentials required' });
    }
    try {
        // 1. Process and encrypt Aadhaar
        const aadhaarEncrypted = (0, encryption_service_1.encrypt)(aadhaarNumber);
        const aadhaarMasked = (0, encryption_service_1.maskAadhaar)(aadhaarNumber);
        // 2. Encrypt and save face photo
        const photoBuffer = base64ToBuffer(facePhotoBase64);
        const encryptedPhoto = (0, encryption_service_1.encryptBuffer)(photoBuffer);
        const photoFileName = `${Date.now()}_visitor_face.enc`;
        const photoFilePath = path_1.default.join(UPLOAD_DIR, photoFileName);
        fs_1.default.writeFileSync(photoFilePath, encryptedPhoto.data);
        // 3. Create the Visitor record
        const visitor = await prisma.visitor.create({
            data: {
                name,
                phone,
                consentAccepted: true,
                consentTimestamp: new Date(),
                facePhotoRef: photoFileName,
                // Save the metadata to decrypt the file later
                facePhotoKeyEncrypted: `${encryptedPhoto.iv}:${encryptedPhoto.authTag}`,
                aadhaarNumberEncrypted: aadhaarEncrypted,
                aadhaarNumberMasked: aadhaarMasked,
            },
        });
        // 4. Find Approver based on routing rules
        let approverId = null;
        if (purposeCategory === 'ADMISSION') {
            const adminHead = await prisma.user.findFirst({
                where: { role: 'DEPT_HEAD', department: { contains: 'Admissions' } }
            });
            approverId = adminHead?.id || null;
        }
        else if (purposeCategory === 'MEETING') {
            approverId = hostUserId || null;
        }
        else if (purposeCategory === 'DELIVERY' || purposeCategory === 'VENDOR') {
            const admin = await prisma.user.findFirst({ where: { role: 'SECURITY_ADMIN' } });
            approverId = admin?.id || null;
        }
        else { // EVENT or OTHER
            const admin = await prisma.user.findFirst({ where: { role: 'SECURITY_ADMIN' } });
            approverId = admin?.id || null;
        }
        // Default fallback to any security admin if no approver is resolved
        if (!approverId) {
            const admin = await prisma.user.findFirst({ where: { role: 'SECURITY_ADMIN' } });
            approverId = admin?.id || null;
        }
        // 5. Create VisitRequest (PENDING)
        const request = await prisma.visitRequest.create({
            data: {
                visitorId: visitor.id,
                purposeCategory,
                purposeDetails,
                approverId,
                status: 'PENDING',
            },
            include: {
                visitor: true,
                approver: { select: { id: true, name: true, department: true, phone: true, extensionNumber: true, post: true } }
            }
        });
        // 6. Log Audits
        await (0, audit_middleware_1.createAuditLog)(guardId, 'REGISTER_VISITOR', `Visitor:${visitor.id}`, `Created visit request for ${name}. Purpose: ${purposeCategory}`);
        return res.status(201).json({
            success: true,
            request: {
                id: request.id,
                visitorId: visitor.id,
                name: visitor.name,
                phone: visitor.phone,
                maskedAadhaar: visitor.aadhaarNumberMasked,
                purposeCategory: request.purposeCategory,
                purposeDetails: request.purposeDetails,
                status: request.status,
                approver: request.approver,
                createdAt: request.createdAt,
            }
        });
    }
    catch (error) {
        console.error('Register visitor error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Fetch Visit Request Status (used for polling or details)
 */
async function getVisitRequest(req, res) {
    const { id } = req.params;
    try {
        const request = await prisma.visitRequest.findUnique({
            where: { id },
            include: {
                visitor: true,
                approver: { select: { id: true, name: true, department: true, role: true, phone: true, extensionNumber: true, post: true } }
            }
        });
        if (!request) {
            return res.status(404).json({ error: 'Visit request not found' });
        }
        // RBAC: Faculty can only see requests assigned to them
        if (req.user?.role === 'FACULTY' || req.user?.role === 'DEPT_HEAD') {
            if (request.approverId !== req.user.id) {
                return res.status(403).json({ error: 'Forbidden: Request not assigned to you' });
            }
        }
        // Mask Aadhaar display
        const result = {
            ...request,
            visitor: {
                ...request.visitor,
                aadhaarNumberEncrypted: undefined, // Hidden
            }
        };
        return res.json(result);
    }
    catch (error) {
        console.error('Fetch request error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Check In Visitor (after approval is complete)
 */
async function checkInVisitor(req, res) {
    const { requestId, gateId } = req.body;
    const guardId = req.user?.id;
    if (!requestId || !gateId) {
        return res.status(400).json({ error: 'requestId and gateId are required' });
    }
    if (!guardId) {
        return res.status(401).json({ error: 'Guard credentials required' });
    }
    try {
        const request = await prisma.visitRequest.findUnique({
            where: { id: requestId },
            include: { visitor: true }
        });
        if (!request) {
            return res.status(404).json({ error: 'Visit request not found' });
        }
        if (request.status !== 'APPROVED') {
            return res.status(400).json({ error: `Cannot check in. Visit status is ${request.status}` });
        }
        const now = new Date();
        // 1. Update VisitRequest
        await prisma.visitRequest.update({
            where: { id: requestId },
            data: {
                entryTime: now,
            }
        });
        // 2. Log Entry
        await prisma.entryLog.create({
            data: {
                direction: 'IN',
                visitorId: request.visitorId,
                gateId,
                guardId,
            }
        });
        // 3. Log Audit
        await (0, audit_middleware_1.createAuditLog)(guardId, 'VISITOR_CHECK_IN', `Visitor:${request.visitorId}`, `Logged entry at gate. Request ID: ${requestId}`);
        return res.json({
            success: true,
            message: `Visitor ${request.visitor.name} successfully checked IN.`,
            entryTime: now
        });
    }
    catch (error) {
        console.error('Check in visitor error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Serve Biometric Face Photo (decrypts photo on the fly, logs to AuditLog)
 */
async function getFacePhoto(req, res) {
    const { visitorId } = req.params;
    try {
        const visitor = await prisma.visitor.findUnique({
            where: { id: visitorId }
        });
        if (!visitor || !visitor.facePhotoRef) {
            return res.status(404).json({ error: 'Face photo not found' });
        }
        const photoPath = path_1.default.join(UPLOAD_DIR, visitor.facePhotoRef);
        if (!fs_1.default.existsSync(photoPath)) {
            return res.status(404).json({ error: 'Biometric file not found on disk' });
        }
        // Audit log the view event (Critical requirement)
        await (0, audit_middleware_1.createAuditLog)(req.user?.id || null, 'VIEW_BIOMETRIC_FACE_PHOTO', `Visitor:${visitorId}`, `Accessed biometric face image`);
        // Read encrypted file
        const encryptedBuffer = fs_1.default.readFileSync(photoPath);
        const [ivHex, authTagHex] = visitor.facePhotoKeyEncrypted.split(':');
        // Decrypt on the fly
        const decryptedBuffer = (0, encryption_service_1.decryptBuffer)(encryptedBuffer, ivHex, authTagHex);
        res.contentType('image/jpeg');
        return res.send(decryptedBuffer);
    }
    catch (error) {
        console.error('Serve face photo error:', error);
        return res.status(500).json({ error: 'Internal server error decrypting photo' });
    }
}
/**
 * Decrypt Aadhaar for authorized staff/admins (logs audit log)
 */
async function viewAadhaar(req, res) {
    const { visitorId } = req.params;
    // Only Security Admin or DEPT_HEAD can view raw Aadhaar
    if (req.user?.role !== 'SECURITY_ADMIN' && req.user?.role !== 'DEPT_HEAD') {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions to view raw Aadhaar' });
    }
    try {
        const visitor = await prisma.visitor.findUnique({
            where: { id: visitorId }
        });
        if (!visitor || !visitor.aadhaarNumberEncrypted) {
            return res.status(404).json({ error: 'Visitor record not found' });
        }
        // Decrypt Aadhaar
        const decryptedAadhaar = (0, encryption_service_1.decrypt)(visitor.aadhaarNumberEncrypted);
        // Audit log the view event (Critical requirement)
        await (0, audit_middleware_1.createAuditLog)(req.user.id, 'VIEW_RAW_AADHAAR_NUMBER', `Visitor:${visitorId}`, `Viewed decrypted Aadhaar number`);
        return res.json({
            visitorId: visitor.id,
            name: visitor.name,
            aadhaarNumber: decryptedAadhaar
        });
    }
    catch (error) {
        console.error('View Aadhaar error:', error);
        return res.status(500).json({ error: 'Internal server error decrypting Aadhaar' });
    }
}
/**
 * Exit Scanning and Face Match
 */
async function exitMatchVisitor(req, res) {
    const { visitorId, exitPhotoBase64, gateId } = req.body;
    const guardId = req.user?.id;
    if (!visitorId || !exitPhotoBase64 || !gateId) {
        return res.status(400).json({ error: 'visitorId, exitPhotoBase64, and gateId are required' });
    }
    if (!guardId) {
        return res.status(401).json({ error: 'Guard credentials required' });
    }
    try {
        // 1. Fetch active visit request (status PENDING or APPROVED, not completed)
        const activeVisit = await prisma.visitRequest.findFirst({
            where: {
                visitorId,
                status: { in: ['APPROVED', 'PENDING'] },
                entryTime: { not: null },
                exitTime: null
            },
            include: { visitor: true }
        });
        if (!activeVisit) {
            return res.status(404).json({ error: 'No active inside visit request found for this visitor' });
        }
        // 2. Fetch original face photo and decrypt it
        const originalPhotoPath = path_1.default.join(UPLOAD_DIR, activeVisit.visitor.facePhotoRef);
        if (!fs_1.default.existsSync(originalPhotoPath)) {
            return res.status(404).json({ error: 'Original face biometric not found on server' });
        }
        const encryptedOrigBuffer = fs_1.default.readFileSync(originalPhotoPath);
        const [ivHex, authTagHex] = activeVisit.visitor.facePhotoKeyEncrypted.split(':');
        const originalBuffer = (0, encryption_service_1.decryptBuffer)(encryptedOrigBuffer, ivHex, authTagHex);
        // Decode exit photo base64
        const exitBuffer = base64ToBuffer(exitPhotoBase64);
        // 3. Run Face-Match comparison
        const matchResult = await face_service_1.faceRecognitionService.compareFaces(originalBuffer, exitBuffer);
        // Log the face comparison event in audit
        await (0, audit_middleware_1.createAuditLog)(guardId, 'VISITOR_EXIT_FACE_MATCH', `Visitor:${visitorId}`, `Exit face comparison score: ${matchResult.confidence}%, isMatch: ${matchResult.isMatch}`);
        if (!matchResult.isMatch) {
            return res.status(400).json({
                success: false,
                confidence: matchResult.confidence,
                message: `Face verification failed (Confidence: ${matchResult.confidence}%). Photo mismatch detected!`
            });
        }
        const now = new Date();
        // 4. Update VisitRequest to COMPLETED
        await prisma.visitRequest.update({
            where: { id: activeVisit.id },
            data: {
                status: 'COMPLETED',
                exitTime: now,
                exitFaceMatchScore: matchResult.confidence
            }
        });
        // 5. Create EntryLog (OUT)
        await prisma.entryLog.create({
            data: {
                direction: 'OUT',
                visitorId,
                gateId,
                guardId
            }
        });
        // 6. Log successful check-out audit
        await (0, audit_middleware_1.createAuditLog)(guardId, 'VISITOR_CHECK_OUT', `Visitor:${visitorId}`, `Checked out visitor successfully with face match (${matchResult.confidence}%)`);
        return res.json({
            success: true,
            confidence: matchResult.confidence,
            message: `Face Match successful (${matchResult.confidence}%). Visitor ${activeVisit.visitor.name} marked OUT.`,
            exitTime: now
        });
    }
    catch (error) {
        console.error('Exit scan error:', error);
        return res.status(500).json({ error: 'Internal server error processing exit match' });
    }
}
//# sourceMappingURL=visitor.controller.js.map