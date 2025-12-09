import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../auth';
import {
  getAllUsers,
  getUserById,
  promoteUserToAdmin,
  demoteAdminToUser,
} from '../db';
import { JwtPayload } from '../types';

const router = Router();

// ============================================================================
// GESTIÓN DE USUARIOS - LECTURA
// ============================================================================

/**
 * GET /api/users
 * Obtiene la LISTA COMPLETA de TODOS los usuarios en el sistema
 *
 * Solo administradores pueden ver la lista completa
 * Retorna array con información de todos los usuarios
 *
 * Autenticación: REQUERIDA + ADMIN
 *
 * @route GET /api/users
 * @header Authorization - JWT token de usuario admin: `Bearer <token>`
 * @returns {User[]} Array de objetos usuario con campos:
 *   - id: UUID del usuario
 *   - username: Nombre de usuario
 *   - email: Correo electrónico
 *   - isAdmin: ¿Es administrador?
 *   - isFirstAdmin: ¿Es el primer admin (especial)?
 *   - createdAt: Timestamp de creación
 *
 * @status 200 - Lista obtenida exitosamente
 * @status 401 - Token no presente, inválido o expirado
 * @status 403 - Usuario no es administrador
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // GET /api/users
 * // Headers: Authorization: Bearer <admin-token>
 * // Response (200):
 * [
 *   {
 *     id: "user-1",
 *     username: "trainer_ash",
 *     email: "ash@example.com",
 *     isAdmin: true,
 *     isFirstAdmin: true,
 *     createdAt: "2025-12-09T10:30:00Z"
 *   },
 *   {
 *     id: "user-2",
 *     username: "trainer_misty",
 *     email: "misty@example.com",
 *     isAdmin: false,
 *     isFirstAdmin: false,
 *     createdAt: "2025-12-09T11:00:00Z"
 *   }
 * ]
 * ```
 */
router.get(
  '/api/users',
  authenticateToken,
  requireAdmin,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      console.log(`📋 [users] GET / - Obteniendo lista de TODOS los usuarios`);
      const users = await getAllUsers();
      console.log(`   ✅ Total: ${users.length} usuarios encontrados`);
      res.json(users);
    } catch (error) {
      console.error(`   ❌ Error al obtener usuarios:`, error);
      res.status(500).json({ 
        error: 'Error al obtener usuarios',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Obtiene información de un usuario ESPECÍFICO
 *
 * Reglas de acceso:
 * - Si el usuario solicita SU PROPIA información → acceso permitido
 * - Si es ADMIN → puede ver a cualquier usuario
 * - Si es usuario regular viendo a OTRO usuario → acceso denegado (403)
 *
 * Autenticación: REQUERIDA (token JWT)
 * Autorización: Usuario propio O es administrador
 *
 * @route GET /api/users/:id
 * @param id - UUID del usuario a obtener
 * @header Authorization - JWT token: `Bearer <token>`
 * @returns {User} Objeto usuario con campos:
 *   - id: UUID
 *   - username: Nombre de usuario
 *   - email: Correo electrónico
 *   - isAdmin: ¿Es administrador?
 *   - isFirstAdmin: ¿Es el primer admin?
 *   - createdAt: Timestamp de creación
 *
 * @status 200 - Usuario encontrado y retornado
 * @status 401 - Token no presente, inválido o expirado
 * @status 403 - Usuario intenta ver información de otro usuario (sin ser admin)
 * @status 404 - Usuario no existe
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // GET /api/users/user-123
 * // Headers: Authorization: Bearer <token>
 * // Response (200):
 * {
 *   id: "user-123",
 *   username: "trainer_ash",
 *   email: "ash@example.com",
 *   isAdmin: true,
 *   isFirstAdmin: true,
 *   createdAt: "2025-12-09T10:30:00Z"
 * }
 *
 * // Response (403) - si user regular intenta ver otro usuario:
 * {
 *   error: "No tienes permisos para ver este usuario"
 * }
 * ```
 */
router.get(
  '/api/users/:id',
  authenticateToken,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      const targetId = req.params.id;
      console.log(`👤 [users] GET /:${targetId} - Obteniendo información del usuario`);

      // BÚSQUEDA: Usuario existe
      console.log(`   → Buscando usuario en BD...`);
      const user = await getUserById(targetId);
      if (!user) {
        console.warn(`   ⚠️  Usuario no encontrado: ${targetId}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // AUTORIZACIÓN: Verificar permisos de acceso
      const isSelfRequest = req.user?.userId === targetId;
      const isAdmin = req.user?.isAdmin;

      if (!isSelfRequest && !isAdmin) {
        console.warn(
          `   ⚠️  Acceso denegado: usuario ${req.user?.userId} intenta ver usuario ${targetId} (sin ser admin)`
        );
        return res.status(403).json({ error: 'No tienes permisos para ver este usuario' });
      }

      console.log(
        `   ✅ Usuario encontrado: "${user.username}" (admin: ${user.isAdmin})`
      );
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isFirstAdmin: user.isFirstAdmin,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error(`   ❌ Error al obtener usuario:`, error);
      res.status(500).json({ 
        error: 'Error al obtener usuario',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

// ============================================================================
// GESTIÓN DE USUARIOS - ACTUALIZACIÓN (ROLES)
// ============================================================================

/**
 * PATCH /api/users/:id/promote
 * PROMOCIONA un usuario regular a ADMINISTRADOR
 *
 * Convierte un usuario normal en usuario con permisos administrativos
 * Solo administradores pueden hacer promociones
 * Un usuario ya admin no puede ser promovido de nuevo
 *
 * Autenticación: REQUERIDA + ADMIN
 *
 * @route PATCH /api/users/:id/promote
 * @param id - UUID del usuario a promover
 * @header Authorization - JWT token de admin: `Bearer <token>`
 * @status 200 - Usuario promovido exitosamente
 * @status 400 - Usuario ya es admin
 * @status 401 - Token no presente, inválido o expirado
 * @status 403 - Usuario no es administrador
 * @status 404 - Usuario no existe
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // PATCH /api/users/user-123/promote
 * // Headers: Authorization: Bearer <admin-token>
 * // Response (200):
 * {
 *   message: "Usuario promovido a administrador",
 *   user: {
 *     id: "user-123",
 *     username: "trainer_misty",
 *     email: "misty@example.com",
 *     isAdmin: true
 *   }
 * }
 *
 * // Response (400) - si ya es admin:
 * {
 *   error: "El usuario ya es administrador"
 * }
 * ```
 */
router.patch(
  '/api/users/:id/promote',
  authenticateToken,
  requireAdmin,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      const targetId = req.params.id;
      console.log(`⬆️  [users] PATCH /:${targetId}/promote - Promoviendo a admin`);

      // BÚSQUEDA: Usuario existe
      console.log(`   → Buscando usuario en BD...`);
      const targetUser = await getUserById(targetId);
      if (!targetUser) {
        console.warn(`   ⚠️  Usuario no encontrado: ${targetId}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // VALIDACIÓN: Usuario no es ya admin
      if (targetUser.isAdmin) {
        console.warn(`   ⚠️  Usuario ya es admin: "${targetUser.username}"`);
        return res.status(400).json({ error: 'El usuario ya es administrador' });
      }

      // ✅ VALIDACIONES PASADAS - PROMOVER
      console.log(`   → Promoviendo "${targetUser.username}" a admin...`);
      const promotedUser = await promoteUserToAdmin(targetId);
      console.log(`   ✅ Usuario promovido exitosamente a admin`);

      res.json({
        message: 'Usuario promovido a administrador',
        user: {
          id: promotedUser.id,
          username: promotedUser.username,
          email: promotedUser.email,
          isAdmin: promotedUser.isAdmin,
        },
      });
    } catch (error) {
      console.error(`   ❌ Error al promover usuario:`, error);
      res.status(500).json({ 
        error: 'Error al promover usuario',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

/**
 * PATCH /api/users/:id/demote
 * DEGRADA un usuario de ADMINISTRADOR a usuario REGULAR
 *
 * Revoca permisos administrativos de un usuario
 * PROTECCIÓN: No se puede degradar al PRIMER ADMIN (creador)
 * Solo administradores pueden hacer degradaciones
 * Un usuario regular no puede ser degradado de nuevo
 *
 * Autenticación: REQUERIDA + ADMIN
 *
 * LIMITACIÓN ESPECIAL:
 * - El primer admin (isFirstAdmin=true) NO PUEDE SER DEGRADADO
 * - Esto evita que nadie quede sin admin en el sistema
 *
 * @route PATCH /api/users/:id/demote
 * @param id - UUID del usuario a degradar
 * @header Authorization - JWT token de admin: `Bearer <token>`
 * @status 200 - Usuario degradado exitosamente
 * @status 400 - Usuario no es admin
 * @status 401 - Token no presente, inválido o expirado
 * @status 403 - Usuario intenta degradar al primer admin
 * @status 404 - Usuario no existe
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // PATCH /api/users/user-123/demote
 * // Headers: Authorization: Bearer <admin-token>
 * // Response (200):
 * {
 *   message: "Usuario degradado a usuario regular",
 *   user: {
 *     id: "user-123",
 *     username: "trainer_misty",
 *     email: "misty@example.com",
 *     isAdmin: false
 *   }
 * }
 *
 * // Response (403) - si es el primer admin:
 * {
 *   error: "No se puede degradar al primer administrador"
 * }
 *
 * // Response (400) - si no es admin:
 * {
 *   error: "El usuario no es administrador"
 * }
 * ```
 */
router.patch(
  '/api/users/:id/demote',
  authenticateToken,
  requireAdmin,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      const targetId = req.params.id;
      console.log(`⬇️  [users] PATCH /:${targetId}/demote - Degradando de admin`);

      // BÚSQUEDA: Usuario existe
      console.log(`   → Buscando usuario en BD...`);
      const targetUser = await getUserById(targetId);
      if (!targetUser) {
        console.warn(`   ⚠️  Usuario no encontrado: ${targetId}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // VALIDACIÓN 1: Usuario es admin
      if (!targetUser.isAdmin) {
        console.warn(`   ⚠️  Usuario no es admin: "${targetUser.username}"`);
        return res.status(400).json({ error: 'El usuario no es administrador' });
      }

      // VALIDACIÓN 2: PROTECCIÓN - No puede ser el primer admin
      if (targetUser.isFirstAdmin) {
        console.warn(`   ⚠️  Intento de degradar al PRIMER ADMIN: "${targetUser.username}"`);
        return res.status(403).json({
          error: 'No se puede degradar al primer administrador',
          reason: 'El primer admin es protegido del sistema'
        });
      }

      // ✅ VALIDACIONES PASADAS - DEGRADAR
      console.log(`   → Degradando "${targetUser.username}" a usuario regular...`);
      const demotedUser = await demoteAdminToUser(targetId);

      if (!demotedUser) {
        console.warn(`   ⚠️  Error degradando usuario (null response)`);
        return res.status(400).json({ error: 'No se puede degradar a este usuario' });
      }

      console.log(`   ✅ Usuario degradado exitosamente a usuario regular`);
      res.json({
        message: 'Usuario degradado a usuario regular',
        user: {
          id: demotedUser.id,
          username: demotedUser.username,
          email: demotedUser.email,
          isAdmin: demotedUser.isAdmin,
        },
      });
    } catch (error) {
      console.error(`   ❌ Error al degradar usuario:`, error);
      res.status(500).json({ 
        error: 'Error al degradar usuario',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
