import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'SECURITY_GUARD' | 'FACULTY' | 'DEPT_HEAD' | 'SECURITY_ADMIN';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforabesgatekeymanagement123';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

/**
 * Middleware to verify JWT token and inject user object.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Support token passed via query parameter (useful for standard HTML media tags like <img>)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as Role,
      name: decoded.name
    };
    next();
  });
}

/**
 * Middleware to restrict access by role.
 */
export function requireRoles(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
}
