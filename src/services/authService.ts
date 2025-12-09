// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/** URL base del API backend (desde variable de entorno o default local) */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// TIPOS - RESPUESTAS Y PAYLOADS
// ============================================================================

/**
 * Respuesta estándar del servidor en operaciones de autenticación
 * Incluye token JWT y datos del usuario autenticado
 */
export type AuthResponse = {
  /** Mensaje descriptivo de la operación */
  message: string;
  
  /** JWT token para autenticación posterior (guardado en localStorage) */
  token: string;
  
  /** Información del usuario autenticado */
  user: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    isFirstAdmin: boolean;
  };
};

/**
 * Payload para LOGIN
 * Credenciales mínimas necesarias para iniciar sesión
 */
export type LoginPayload = {
  email: string;
  password: string;
};

/**
 * Payload para REGISTER
 * Extiende LoginPayload con campo adicional de username
 * 
 * @example
 * ```ts
 * const payload: RegisterPayload = {
 *   username: "trainer_ash",
 *   email: "ash@example.com",
 *   password: "securepass123"
 * };
 * ```
 */
export type RegisterPayload = LoginPayload & {
  username: string;
};

// ============================================================================
// FUNCIONES PRINCIPALES - AUTENTICACIÓN
// ============================================================================

/**
 * REGISTRA un nuevo usuario en el backend
 *
 * Pasos:
 * 1. Envía datos de registro (username, email, password) al backend
 * 2. El backend valida, hashea password y crea usuario en BD
 * 3. Backend genera JWT token automáticamente
 * 4. Frontend guarda token en localStorage para sesiones futuras
 *
 * Error Handling:
 * - Si el response no es 200-299, obtiene mensaje de error del backend
 * - Si el error tiene un campo `error`, lo usa; sino mensaje genérico
 * - Lanza Error que debe ser capturado en el componente
 *
 * @param payload - Objeto con {username, email, password}
 * @returns Promise<AuthResponse> - Token y datos del usuario creado
 * @throws Error - Si registro falla (email duplicado, validación, etc)
 *
 * @example
 * ```ts
 * try {
 *   const response = await register({
 *     username: "ash",
 *     email: "ash@example.com",
 *     password: "pass123"
 *   });
 *   console.log("✅ Registrado:", response.user.username);
 *   // Token ya está guardado en localStorage
 * } catch (error) {
 *   console.error("❌ Error:", error.message); // "El email ya está registrado"
 * }
 * ```
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  console.log(`📝 [authService] Registrando usuario: "${payload.username}"`);
  
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error || 'Error al registrar';
    console.error(`   ❌ Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`   ✅ Usuario registrado: "${data.user.username}" (ID=${data.user.id})`);
  
  // Guardar token automáticamente
  saveToken(data.token);
  console.log(`   ✅ Token guardado en localStorage`);
  
  return data;
}

/**
 * INICIA SESIÓN de un usuario existente
 *
 * Pasos:
 * 1. Envía credenciales (email, password) al backend
 * 2. Backend valida contra usuario en BD
 * 3. Si credenciales válidas, genera JWT token
 * 4. Frontend guarda token en localStorage para acceso futuro
 *
 * Seguridad:
 * - Si credenciales incorrectas, backend retorna 401 (sin detallar si email/pass)
 * - Frontend debe capturar error y mostrar mensaje genérico al usuario
 *
 * Error Handling:
 * - Si response no es 200-299, obtiene mensaje de error del backend
 * - Lanza Error que debe ser capturado en el componente
 *
 * @param payload - Objeto con {email, password}
 * @returns Promise<AuthResponse> - Token y datos del usuario
 * @throws Error - Si credenciales son inválidas
 *
 * @example
 * ```ts
 * try {
 *   const response = await login({
 *     email: "ash@example.com",
 *     password: "pass123"
 *   });
 *   console.log("✅ Login exitoso:", response.user.username);
 *   // Token ya está guardado en localStorage
 * } catch (error) {
 *   console.error("❌ Error:", error.message); // "Credenciales inválidas"
 * }
 * ```
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  console.log(`🔐 [authService] Login para: "${payload.email}"`);
  
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error || 'Error al iniciar sesión';
    console.error(`   ❌ Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log(`   ✅ Login exitoso: "${data.user.username}"`);
  
  // Guardar token automáticamente
  saveToken(data.token);
  console.log(`   ✅ Token guardado en localStorage`);
  
  return data;
}

/**
 * OBTIENE información del usuario ACTUALMENTE AUTENTICADO
 *
 * Pasos:
 * 1. Usa token JWT guardado en localStorage
 * 2. Envía request al endpoint /api/auth/me con Bearer token
 * 3. Backend valida token y retorna datos del usuario
 *
 * Casos de Error:
 * - Token no presente → 401 (usuario no autenticado)
 * - Token expirado → 401 (debe hacer login de nuevo)
 * - Token inválido → 401 (token corrupto)
 * - Usuario fue deletado → 404 (usuario no existe en BD)
 *
 * @param token - JWT token (obtenido de localStorage vía getToken())
 * @returns Promise<User> - Objeto usuario con id, username, email, isAdmin, etc
 * @throws Error - Si token inválido/expirado o usuario no existe
 *
 * @example
 * ```ts
 * try {
 *   const token = getToken();
 *   if (token) {
 *     const user = await getCurrentUser(token);
 *     console.log("✅ Usuario actual:", user.username);
 *   }
 * } catch (error) {
 *   console.error("❌ Error:", error.message); // "No autenticado"
 *   // Token es inválido/expirado - usuario debe hacer login de nuevo
 * }
 * ```
 */
export async function getCurrentUser(token: string) {
  console.log(`👤 [authService] Obteniendo usuario actual...`);
  
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorMsg = !response.ok ? `HTTP ${response.status}` : 'Error desconocido';
    console.error(`   ❌ Error: ${errorMsg}`);
    throw new Error('Error al obtener usuario');
  }

  const user = await response.json();
  console.log(`   ✅ Usuario obtenido: "${user.username}" (isAdmin: ${user.isAdmin})`);
  
  return user;
}

// ============================================================================
// FUNCIONES AUXILIARES - GESTIÓN DEL TOKEN
// ============================================================================

/**
 * GUARDA el JWT token en localStorage
 *
 * El token se almacena bajo la clave 'authToken'
 * Se usa automáticamente al hacer login/register
 * También puede usarse manualmente si se obtiene un token de otra fuente
 *
 * Almacenamiento: browser localStorage (persiste entre navegaciones)
 *
 * @param token - JWT token string para guardar
 * @returns void
 *
 * @example
 * ```ts
 * saveToken("eyJhbGciOiJIUzI1NiIs..."); // Guarda token manualmente
 * ```
 */
export function saveToken(token: string): void {
  localStorage.setItem('authToken', token);
  console.log(`💾 [authService] Token guardado en localStorage`);
}

/**
 * OBTIENE el JWT token de localStorage
 *
 * Retorna el token si existe, o null si no hay sesión activa
 * Se usa para incluir en headers de requests autenticados
 *
 * @returns string | null - Token si existe, null si no hay sesión
 *
 * @example
 * ```ts
 * const token = getToken();
 * if (token) {
 *   // Usuario está autenticado
 *   const user = await getCurrentUser(token);
 * } else {
 *   // Usuario NO está autenticado
 *   console.log("Debes hacer login");
 * }
 * ```
 */
export function getToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * ELIMINA el JWT token de localStorage
 *
 * Se usa al hacer LOGOUT para cerrar sesión
 * Después de esto, getToken() retornará null
 * Usuario deberá hacer login de nuevo para autenticarse
 *
 * @returns void
 *
 * @example
 * ```ts
 * // En logout
 * removeToken();
 * // Ahora getToken() retorna null
 * // Usuario deberá hacer login de nuevo
 * ```
 */
export function removeToken(): void {
  localStorage.removeItem('authToken');
  console.log(`🗑️  [authService] Token removido de localStorage (logout)`);
}

/**
 * VERIFICA si hay una sesión autenticada activa
 *
 * Retorna true si existe un token en localStorage, false si no
 * NO valida el token contra el backend (solo verifica presencia local)
 *
 * Uso: Mostrar/ocultar componentes basados en autenticación
 *
 * IMPORTANTE:
 * - Retorna true SI existe token (pero podría estar expirado)
 * - Para validar realmente, usar getCurrentUser(token) que verifica con backend
 *
 * @returns boolean - true si token existe, false si no
 *
 * @example
 * ```ts
 * if (isAuthenticated()) {
 *   // Mostrar UI para usuarios logueados
 * } else {
 *   // Mostrar login/register
 * }
 * ```
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  const authenticated = !!token;
  console.log(`🔍 [authService] isAuthenticated: ${authenticated}`);
  return authenticated;
}
