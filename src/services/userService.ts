import { getToken } from './authService';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/** URL base del API backend (desde variable de entorno o default local) */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estructura de datos de un Usuario en el sistema
 * 
 * @property id - UUID único del usuario
 * @property username - Nombre de usuario (3-30 caracteres)
 * @property email - Correo electrónico (único en el sistema)
 * @property isAdmin - ¿Es administrador? (puede gestionar Pokémon y usuarios)
 * @property isFirstAdmin - ¿Es el primer admin creado? (no puede ser degradado)
 * @property createdAt - Timestamp de creación (ISO 8601)
 */
export type User = {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isFirstAdmin: boolean;
  createdAt?: string;
};

// ============================================================================
// FUNCIONES PRINCIPALES - LECTURA DE USUARIOS
// ============================================================================

/**
 * OBTIENE la lista COMPLETA de TODOS los usuarios en el sistema
 *
 * SOLO ADMINISTRADORES pueden acceder a esta función
 * El backend rechaza si no tienes permisos admin
 *
 * Pasos:
 * 1. Obtiene token de localStorage
 * 2. Valida que token existe (si no, lanza error)
 * 3. Envía GET /api/users con Bearer token
 * 4. Backend valida token y permisos admin
 * 5. Retorna array con TODOS los usuarios
 *
 * Error Handling:
 * - No token → Error: "No hay token de autenticación"
 * - No admin → Backend retorna 403 (acceso denegado)
 * - Error servidor → Usa mensaje del backend o genérico
 *
 * @returns Promise<User[]> - Array de TODOS los usuarios del sistema
 * @throws Error - Si no autenticado, no admin, o error servidor
 *
 * @example
 * ```ts
 * try {
 *   const users = await getAllUsers();
 *   console.log(`✅ ${users.length} usuarios encontrados`);
 *   users.forEach(u => {
 *     console.log(`- ${u.username} (admin: ${u.isAdmin})`);
 *   });
 * } catch (error) {
 *   console.error("❌ Error:", error.message);
 *   // Posibles: "No hay token", o error desde backend
 * }
 * ```
 */
export async function getAllUsers(): Promise<User[]> {
  console.log(`📋 [userService] Obteniendo lista de TODOS los usuarios...`);
  
  const token = getToken();
  if (!token) {
    console.warn('   ⚠️  No hay token de autenticación');
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error || 'Error al obtener usuarios';
    console.error(`   ❌ Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const users = await response.json();
  console.log(`   ✅ ${users.length} usuarios obtenidos`);
  return users;
}

/**
 * OBTIENE información de un usuario ESPECÍFICO por ID
 *
 * Reglas de Acceso:
 * - Si solicitas TU PROPIA información → siempre permitido
 * - Si eres ADMIN → puedes ver a cualquier usuario
 * - Si eres usuario regular viendo a OTRO → acceso denegado (403)
 *
 * Pasos:
 * 1. Obtiene token de localStorage
 * 2. Valida que token existe (si no, lanza error)
 * 3. Envía GET /api/users/:id con Bearer token
 * 4. Backend valida token y permisos de acceso
 * 5. Retorna datos del usuario (si acceso permitido)
 *
 * @param userId - UUID del usuario a obtener
 * @returns Promise<User> - Datos del usuario solicitado
 * @throws Error - Si no autenticado, sin permisos, o usuario no existe
 *
 * @example
 * ```ts
 * // Obtener información propia (siempre funciona)
 * const myUser = await getUserById("my-user-id");
 * console.log(`✅ Mi info: ${myUser.username}`);
 *
 * // Como admin, obtener otro usuario
 * const otherUser = await getUserById("other-user-id");
 * console.log(`✅ Otro usuario: ${otherUser.username}`);
 *
 * // Como usuario regular, intenta ver otro usuario
 * try {
 *   await getUserById("other-user-id");
 * } catch (error) {
 *   console.error("❌ No tienes permisos para ver este usuario");
 * }
 * ```
 */
export async function getUserById(userId: string): Promise<User> {
  console.log(`👤 [userService] Obteniendo usuario: ${userId}`);
  
  const token = getToken();
  if (!token) {
    console.warn('   ⚠️  No hay token de autenticación');
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error || 'Error al obtener usuario';
    console.error(`   ❌ Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const user = await response.json();
  console.log(`   ✅ Usuario obtenido: "${user.username}" (admin: ${user.isAdmin})`);
  return user;
}

// ============================================================================
// FUNCIONES PRINCIPALES - GESTIÓN DE ROLES (ADMIN ONLY)
// ============================================================================

/**
 * PROMOCIONA un usuario regular a ADMINISTRADOR
 *
 * SOLO ADMINISTRADORES pueden hacer promociones
 * Un usuario ya admin NO puede ser promovido de nuevo (error 400)
 *
 * Pasos:
 * 1. Obtiene token de localStorage (debe ser de admin)
 * 2. Envía PATCH /api/users/:id/promote con Bearer token
 * 3. Backend valida que eres admin
 * 4. Backend convierte usuario a admin en BD
 * 5. Retorna datos actualizados del usuario
 *
 * Error Handling:
 * - No token → Error: "No hay token de autenticación"
 * - No admin → Backend retorna 403 (acceso denegado)
 * - Ya es admin → Backend retorna 400 (ya es administrador)
 * - Usuario no existe → Backend retorna 404
 *
 * @param userId - UUID del usuario a promover
 * @returns Promise<{message: string, user: User}> - Confirmación y datos actualizados
 * @throws Error - Si no autenticado, no admin, o error en operación
 *
 * @example
 * ```ts
 * try {
 *   const result = await promoteUserToAdmin("user-123");
 *   console.log("✅", result.message);
 *   console.log(`   Usuario ahora es admin: ${result.user.isAdmin}`);
 * } catch (error) {
 *   console.error("❌ Error:", error.message);
 *   // Posibles: "El usuario ya es administrador", "Usuario no encontrado", etc
 * }
 * ```
 */
export async function promoteUserToAdmin(userId: string) {
  console.log(`⬆️  [userService] Promoviendo usuario a admin: ${userId}`);
  
  const token = getToken();
  if (!token) {
    console.warn('   ⚠️  No hay token de autenticación');
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/promote`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error || 'Error al promover usuario';
    console.error(`   ❌ Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = await response.json();
  console.log(`   ✅ Usuario promovido a admin: "${result.user.username}"`);
  return result;
}

/**
 * DEGRADA un ADMINISTRADOR a usuario REGULAR
 *
 * SOLO ADMINISTRADORES pueden hacer degradaciones
 * PROTECCIÓN: El PRIMER ADMIN NO PUEDE SER DEGRADADO (isFirstAdmin=true)
 *
 * Pasos:
 * 1. Obtiene token de localStorage (debe ser de admin)
 * 2. Envía PATCH /api/users/:id/demote con Bearer token
 * 3. Backend valida que eres admin
 * 4. Backend verifica que NO es el primer admin
 * 5. Backend convierte admin a usuario regular en BD
 * 6. Retorna datos actualizados del usuario
 *
 * Restricciones:
 * - NO puede degradar al primer admin (isFirstAdmin=true)
 * - No puede degradar a usuario que NO es admin
 * - Solo admins pueden ejecutar esta función
 *
 * Error Handling:
 * - No token → Error: "No hay token de autenticación"
 * - No admin → Backend retorna 403 (acceso denegado)
 * - Es primer admin → Backend retorna 403 (protegido del sistema)
 * - No es admin → Backend retorna 400 (no es administrador)
 * - Usuario no existe → Backend retorna 404
 *
 * @param userId - UUID del usuario a degradar
 * @returns Promise<{message: string, user: User}> - Confirmación y datos actualizados
 * @throws Error - Si no autenticado, no admin, o error en operación
 *
 * @example
 * ```ts
 * try {
 *   const result = await demoteAdminToUser("user-123");
 *   console.log("✅", result.message);
 *   console.log(`   Usuario ahora NO es admin: ${!result.user.isAdmin}`);
 * } catch (error) {
 *   console.error("❌ Error:", error.message);
 *   // Posibles: "No se puede degradar al primer administrador", etc
 * }
 * ```
 */
export async function demoteAdminToUser(userId: string) {
  console.log(`⬇️  [userService] Degradando usuario de admin: ${userId}`);
  
  const token = getToken();
  if (!token) {
    console.warn('   ⚠️  No hay token de autenticación');
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/demote`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error || 'Error al degradar usuario';
    console.error(`   ❌ Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const result = await response.json();
  console.log(`   ✅ Usuario degradado a regular: "${result.user.username}"`);
  return result;
}
