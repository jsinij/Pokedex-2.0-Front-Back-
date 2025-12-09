import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from './types';

// Validar que JWT_SECRET esté configurado
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: JWT_SECRET is not properly configured!');
  console.warn('   Set JWT_SECRET in your .env file before deploying to production');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generar JWT token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verificar y decodificar JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET!) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware de autenticación
 */
export function authenticateToken(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  req.user = user;
  next();
}

/**
 * Middleware para requerir que sea administrador
 */
export function requireAdmin(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Se requiere permisos de administrador' });
  }

  next();
}

/**
 * Middleware para requerir que sea el primer administrador
 */
export function requireFirstAdmin(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  // TODO: Necesitaremos pasar isFirstAdmin en el JWT
  // Por ahora, asumimos que lo verificamos desde la BD
  next();
}
