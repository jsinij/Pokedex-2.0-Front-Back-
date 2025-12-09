import { Router, Request, Response } from 'express';
import validator from 'validator';
import { authenticateToken, generateToken } from '../auth';
import {
  getUserByEmail,
  getUserById,
  createUser,
  verifyPassword,
} from '../db';
import { JwtPayload } from '../types';

const router = Router();

// ============================================================================
// AUTENTICACIÓN - REGISTRO E INICIO DE SESIÓN
// ============================================================================

/**
 * POST /api/auth/register
 * REGISTRA un nuevo usuario en el sistema
 *
 * Crea una nueva cuenta y retorna un JWT token para sesión inmediata
 * Validaciones:
 * - Email único (no puede existir en BD)
 * - Email válido (formato RFC 5322)
 * - Username: 3-30 caracteres
 * - Password: 6-100 caracteres (será hasheado con bcrypt en la BD)
 *
 * Autenticación: NO REQUERIDA (endpoint público)
 *
 * Request Body Obligatorio:
 * - username (string, 3-30 caracteres): Nombre de usuario único
 * - email (string): Dirección de correo válida
 * - password (string, 6-100 caracteres): Contraseña en texto plano (será hasheada)
 *
 * @route POST /api/auth/register
 * @status 201 - Usuario registrado exitosamente, token generado
 * @status 400 - Validación fallida (campo faltante, inválido o formato incorrecto)
 * @status 409 - Email ya existe en el sistema
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // POST /api/auth/register
 * // Body:
 * {
 *   username: "trainer_ash",
 *   email: "ash@example.com",
 *   password: "securepass123"
 * }
 * // Response (201):
 * {
 *   message: "Usuario registrado exitosamente",
 *   token: "eyJhbGc...",
 *   user: {
 *     id: "user-uuid-123",
 *     username: "trainer_ash",
 *     email: "ash@example.com",
 *     isAdmin: false,
 *     isFirstAdmin: false
 *   }
 * }
 * ```
 */
router.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    console.log(`📝 [auth] POST register - Registrando usuario: "${username}" (${email})`);

    // VALIDACIÓN 1: Campos obligatorios presentes
    if (!username || !email || !password) {
      console.warn('   ⚠️  Campos obligatorios faltantes:', { username: !!username, email: !!email, password: !!password });
      return res.status(400).json({
        error: 'Username, email y password son requeridos',
      });
    }

    // VALIDACIÓN 2: EMAIL (formato válido)
    if (!validator.isEmail(email)) {
      console.warn(`   ⚠️  Email inválido: "${email}"`);
      return res.status(400).json({
        error: 'Email inválido (debe ser formato válido)',
      });
    }

    // VALIDACIÓN 3: USERNAME (3-30 caracteres)
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      console.warn(`   ⚠️  Username inválido: "${username}" (length: ${username?.length})`);
      return res.status(400).json({
        error: 'Username debe tener entre 3 y 30 caracteres',
      });
    }

    // VALIDACIÓN 4: PASSWORD - Mínimo 6 caracteres
    if (typeof password !== 'string' || password.length < 6) {
      console.warn(`   ⚠️  Password muy corto: ${password?.length} caracteres (mín 6)`);
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres',
      });
    }

    // VALIDACIÓN 5: PASSWORD - Máximo 100 caracteres
    if (password.length > 100) {
      console.warn(`   ⚠️  Password muy largo: ${password.length} caracteres (máx 100)`);
      return res.status(400).json({
        error: 'La contraseña no puede exceder 100 caracteres',
      });
    }

    // VALIDACIÓN 6: EMAIL único (no existe en BD)
    console.log(`   → Verificando unicidad del email...`);
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      console.warn(`   ⚠️  Email ya registrado: "${email}"`);
      return res.status(409).json({ 
        error: 'El email ya está registrado',
        details: 'Usa un email diferente o intenta iniciar sesión'
      });
    }

    // ✅ TODAS LAS VALIDACIONES PASARON - CREAR USUARIO
    console.log(`   ✅ Validaciones OK. Creando usuario en BD...`);
    const user = await createUser(username, email, password);
    console.log(`   ✅ Usuario creado: ID=${user.id}, username="${user.username}"`);

    // GENERAR JWT TOKEN para acceso inmediato
    console.log(`   → Generando JWT token...`);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    console.log(`   ✅ Registro exitoso. Token generado.`);
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isFirstAdmin: user.isFirstAdmin,
      },
    });
  } catch (error) {
    console.error('   ❌ Error en registro:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/auth/login
 * INICIA SESIÓN de un usuario existente
 *
 * Valida credenciales (email + password) y retorna un JWT token para acceso
 * Si las credenciales son inválidas, retorna 401 (DELIBERADAMENTE vago
 * para no revelar si el email existe o la password es incorrecta)
 *
 * Autenticación: NO REQUERIDA (endpoint público)
 *
 * Request Body Obligatorio:
 * - email (string): Dirección de correo registrada
 * - password (string): Contraseña en texto plano
 *
 * @route POST /api/auth/login
 * @status 200 - Sesión iniciada, token generado
 * @status 400 - Validación fallida (email o password faltantes)
 * @status 401 - Credenciales inválidas (email no existe O password incorrecta)
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // POST /api/auth/login
 * // Body:
 * {
 *   email: "ash@example.com",
 *   password: "securepass123"
 * }
 * // Response (200):
 * {
 *   message: "Sesión iniciada exitosamente",
 *   token: "eyJhbGc...",
 *   user: {
 *     id: "user-uuid-123",
 *     username: "trainer_ash",
 *     email: "ash@example.com",
 *     isAdmin: false,
 *     isFirstAdmin: false
 *   }
 * }
 *
 * // Response (401):
 * {
 *   error: "Credenciales inválidas"
 * }
 * ```
 */
router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 [auth] POST login - Intentando login: ${email}`);

    // VALIDACIÓN 1: Campos obligatorios presentes
    if (!email || !password) {
      console.warn('   ⚠️  Campos obligatorios faltantes:', { email: !!email, password: !!password });
      return res.status(400).json({
        error: 'Email y password son requeridos',
      });
    }

    // VALIDACIÓN 2: EMAIL (formato válido)
    if (!validator.isEmail(email)) {
      console.warn(`   ⚠️  Email inválido: "${email}"`);
      return res.status(400).json({
        error: 'Email inválido (debe ser formato válido)',
      });
    }

    // PASO 1: Buscar usuario por email
    console.log(`   → Buscando usuario en BD...`);
    const user = await getUserByEmail(email);
    if (!user) {
      console.warn(`   ⚠️  Email no encontrado: "${email}"`);
      // NO REVELAR que el email no existe (seguridad)
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // PASO 2: Verificar contraseña (bcrypt comparison)
    console.log(`   → Verificando contraseña para usuario "${user.username}"...`);
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      console.warn(`   ⚠️  Contraseña incorrecta para usuario "${user.username}"`);
      // NO REVELAR que la contraseña es incorrecta (seguridad)
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // ✅ CREDENCIALES VÁLIDAS - GENERAR TOKEN
    console.log(`   ✅ Credenciales válidas. Usuario: "${user.username}"`);
    const token = generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    console.log(`   ✅ Login exitoso. Token generado.`);
    res.json({
      message: 'Sesión iniciada exitosamente',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isFirstAdmin: user.isFirstAdmin,
      },
    });
  } catch (error) {
    console.error('   ❌ Error en login:', error);
    res.status(500).json({ 
      error: 'Error al iniciar sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// ============================================================================
// AUTENTICACIÓN - INFORMACIÓN DEL USUARIO
// ============================================================================

/**
 * GET /api/auth/me
 * Obtiene la información del USUARIO AUTENTICADO
 *
 * REQUIERE un JWT token válido en el header Authorization
 * Retorna los datos del usuario actual basado en el token
 *
 * Token debe estar en header: `Authorization: Bearer <token>`
 * El token es validado por el middleware `authenticateToken`
 *
 * Autenticación: REQUERIDA (token JWT en header)
 *
 * @route GET /api/auth/me
 * @header Authorization - JWT token: `Bearer <token>`
 * @status 200 - Usuario encontrado y retornado
 * @status 401 - Token no presente, inválido o expirado
 * @status 404 - Usuario (del token) no existe en BD
 * @status 500 - Error de base de datos
 *
 * @returns {object} Información completa del usuario
 * - id: UUID del usuario
 * - username: Nombre de usuario
 * - email: Correo electrónico
 * - isAdmin: ¿Es administrador?
 * - isFirstAdmin: ¿Es el primer admin (especial)?
 * - createdAt: Timestamp de creación
 *
 * @example
 * ```ts
 * // GET /api/auth/me
 * // Headers: Authorization: Bearer eyJhbGc...
 * // Response (200):
 * {
 *   id: "user-uuid-123",
 *   username: "trainer_ash",
 *   email: "ash@example.com",
 *   isAdmin: true,
 *   isFirstAdmin: true,
 *   createdAt: "2025-12-09T10:30:00Z"
 * }
 * ```
 */
router.get(
  '/api/auth/me',
  authenticateToken,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      console.log(`ℹ️  [auth] GET me - Obteniendo info del usuario autenticado`);

      // VALIDACIÓN: Usuario existe en token
      if (!req.user) {
        console.warn('   ⚠️  Usuario no en token (should not happen, middleware falló?)');
        return res.status(401).json({ error: 'No autenticado' });
      }

      // BÚSQUEDA: Obtener usuario de BD usando ID del token
      console.log(`   → Buscando usuario en BD: ID=${req.user.userId}`);
      const user = await getUserById(req.user.userId);
      if (!user) {
        console.warn(`   ⚠️  Usuario no encontrado en BD: ${req.user.userId}`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      console.log(`   ✅ Usuario encontrado: "${user.username}" (isAdmin: ${user.isAdmin})`);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isFirstAdmin: user.isFirstAdmin,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('   ❌ Error al obtener usuario:', error);
      res.status(500).json({ 
        error: 'Error al obtener información del usuario',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
