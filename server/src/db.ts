import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// ============================================================================
// CONFIGURACIÓN Y INICIALIZACIÓN
// ============================================================================

const prisma = new PrismaClient();

/** Número de rondas para hash de contraseñas con bcrypt */
const BCRYPT_ROUNDS = 10;

/** Credenciales del primer administrador del sistema */
const FIRST_ADMIN_EMAIL = 'juan@unal.edu.co';
const FIRST_ADMIN_PASSWORD = '12345';

// ============================================================================
// FUNCIONES DE UTILIDAD - AUTENTICACIÓN Y CONTRASEÑAS
// ============================================================================

/**
 * Genera un hash seguro de una contraseña usando bcrypt
 * @param password - Contraseña en texto plano
 * @returns Promise con el hash de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifica si una contraseña coincide con su hash
 * @param password - Contraseña en texto plano a verificar
 * @param hash - Hash almacenado en la BD
 * @returns Promise<boolean> true si coinciden, false en caso contrario
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// FUNCIONES DE USUARIOS - BÚSQUEDA Y GESTIÓN
// ============================================================================

/**
 * Busca un usuario por su email
 * @param email - Email del usuario a buscar
 * @returns Promise con los datos del usuario o null si no existe
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Busca un usuario por su ID
 * @param id - ID único del usuario
 * @returns Promise con los datos del usuario o null si no existe
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Crea un nuevo usuario en la base de datos
 * @param username - Nombre de usuario
 * @param email - Email del usuario (debe ser único)
 * @param password - Contraseña en texto plano (será hasheada)
 * @returns Promise con el nuevo usuario creado
 */
export async function createUser(
  username: string,
  email: string,
  password: string
) {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      isAdmin: false,
      isFirstAdmin: false,
    },
  });
}

/**
 * Obtiene la lista de todos los usuarios del sistema
 * NOTA: Las contraseñas NO se incluyen por seguridad
 * @returns Promise con array de usuarios sin información sensible
 */
export async function getAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isAdmin: true,
      isFirstAdmin: true,
      createdAt: true,
    },
  });
  return users;
}

/**
 * Promueve un usuario regular a administrador
 * @param userId - ID del usuario a promover
 * @returns Promise con el usuario actualizado
 * @throws Error si el usuario no existe
 */
export async function promoteUserToAdmin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { isAdmin: true },
  });
}

/**
 * Degrada un administrador a usuario regular
 * NOTA: No permite degradar al primer admin del sistema
 * @param userId - ID del usuario a degradar
 * @returns Promise con el usuario actualizado o null si es el primer admin
 */
export async function demoteAdminToUser(userId: string) {
  const user = await getUserById(userId);

  // Protección: no permitir degradar al primer administrador
  if (user?.isFirstAdmin) {
    console.warn(
      `⚠️ Intento de degradar al primer admin. Operación rechazada.`
    );
    return null;
  }

  return prisma.user.update({
    where: { id: userId },
    data: { isAdmin: false },
  });
}

// ============================================================================
// FUNCIONES DE POKÉMON PERSONALIZADOS - CREACIÓN Y CONSULTA
// ============================================================================

/**
 * Crea un nuevo Pokémon personalizado en la base de datos
 * @param name - Nombre del Pokémon
 * @param types - Array de tipos (1-2 elementos)
 * @param sprite - URL o base64 de la imagen del Pokémon
 * @param description - Descripción del Pokémon
 * @param evolutions - Array opcional con nombres de evoluciones
 * @param createdBy - ID del usuario que lo creó
 * @param height - Altura del Pokémon (opcional)
 * @param weight - Peso del Pokémon (opcional)
 * @returns Promise con el Pokémon creado (datos formateados)
 */
export async function createCustomPokemon(
  name: string,
  types: string[],
  sprite: string,
  description: string,
  evolutions: string[] | undefined,
  createdBy: string,
  height?: number,
  weight?: number
) {
  // Crear el Pokémon en la BD
  const pokemon = await prisma.customPokemon.create({
    data: {
      name,
      types: types.join(','), // Guardar como string separado por comas
      sprite,
      description,
      evolutions: evolutions ? JSON.stringify(evolutions) : null, // Serializar array como JSON
      createdBy,
      height,
      weight,
    },
  });

  // Log para debugging
  console.log(
    `✅ [db] Pokémon custom creado: ${name} (ID: ${pokemon.id}) por usuario: ${createdBy}`
  );

  // Retornar con datos formateados (deserializar)
  return {
    ...pokemon,
    types: pokemon.types.split(','),
    evolutions: pokemon.evolutions ? JSON.parse(pokemon.evolutions) : [],
  };
}

/**
 * Obtiene todos los Pokémon personalizados del sistema
 * @returns Promise con array de todos los Pokémon custom
 */
export async function getAllCustomPokemons() {
  const pokemons = await prisma.customPokemon.findMany();

  // Formatear datos: deserializar tipos y evoluciones
  return pokemons.map((p) => ({
    ...p,
    types: p.types.split(','),
    evolutions: p.evolutions ? JSON.parse(p.evolutions) : [],
  }));
}

/**
 * Busca un Pokémon personalizado específico por ID
 * @param id - ID del Pokémon custom
 * @returns Promise con los datos del Pokémon o null si no existe
 */
export async function getCustomPokemonById(id: number) {
  const pokemon = await prisma.customPokemon.findUnique({
    where: { id },
  });

  if (!pokemon) return null;

  // Formatear datos: deserializar tipos y evoluciones
  return {
    ...pokemon,
    types: pokemon.types.split(','),
    evolutions: pokemon.evolutions ? JSON.parse(pokemon.evolutions) : [],
  };
}

/**
 * Obtiene todos los Pokémon creados por un usuario específico
 * @param userId - ID del usuario creador
 * @returns Promise con array de Pokémon del usuario
 */
export async function getCustomPokemonsByUser(userId: string) {
  const pokemons = await prisma.customPokemon.findMany({
    where: { createdBy: userId },
  });

  // Formatear datos: deserializar tipos y evoluciones
  return pokemons.map((p) => ({
    ...p,
    types: p.types.split(','),
    evolutions: p.evolutions ? JSON.parse(p.evolutions) : [],
  }));
}

/**
 * Actualiza las evoluciones de un Pokémon personalizado
 * @param pokemonId - ID del Pokémon a actualizar
 * @param evolutions - Nuevo array de evoluciones (nombres de Pokémon)
 * @returns Promise con el Pokémon actualizado
 * @throws Error si el Pokémon no existe
 */
export async function updateCustomPokemonEvolutions(
  pokemonId: number,
  evolutions: string[]
) {
  // Verificar que el Pokémon existe
  const pokemon = await prisma.customPokemon.findUnique({
    where: { id: pokemonId },
  });

  if (!pokemon) {
    throw new Error(`Pokémon con ID ${pokemonId} no encontrado en la BD`);
  }

  // Actualizar el campo de evoluciones
  const updated = await prisma.customPokemon.update({
    where: { id: pokemonId },
    data: {
      evolutions: JSON.stringify(evolutions),
    },
  });

  // Log para debugging
  console.log(
    `✅ [db] Evoluciones actualizadas para ${pokemon.name}: ${evolutions.join(', ')}`
  );

  // Retornar con datos formateados
  return {
    ...updated,
    types: updated.types.split(','),
    evolutions: updated.evolutions ? JSON.parse(updated.evolutions) : [],
  };
}

// ============================================================================
// FUNCIONES DE INICIALIZACIÓN DEL SISTEMA
// ============================================================================

/**
 * Inicializa la base de datos con datos por defecto
 * Crea el primer administrador si no existe
 * @returns Promise con el usuario administrador
 */
export async function initializeDatabase() {
  try {
    // Verificar si el primer admin ya existe
    const adminExists = await getUserByEmail(FIRST_ADMIN_EMAIL);

    if (!adminExists) {
      // Crear el primer administrador
      const firstAdmin = await prisma.user.create({
        data: {
          username: 'juan',
          email: FIRST_ADMIN_EMAIL,
          password: await hashPassword(FIRST_ADMIN_PASSWORD),
          isAdmin: true,
          isFirstAdmin: true,
        },
      });

      console.log('✅ Primer administrador creado exitosamente:');
      console.log(`   📧 Email: ${FIRST_ADMIN_EMAIL}`);
      console.log(`   🔑 Contraseña: ${FIRST_ADMIN_PASSWORD}`);
      console.log(
        '   ⚠️  IMPORTANTE: Cambia esta contraseña en ambiente de producción'
      );

      return firstAdmin;
    } else {
      console.log('✅ El primer administrador ya existe en la BD');
      return adminExists;
    }
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE LIMPIEZA Y DESCONEXIÓN
// ============================================================================

/**
 * Desconecta Prisma Client de la base de datos
 * Debe llamarse al terminar la aplicación
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

// ============================================================================
// EXPORTAR INSTANCIA DE PRISMA
// ============================================================================

/**
 * Instancia de Prisma Client para uso directo si es necesario
 * NOTA: Preferir usar las funciones exportadas arriba
 */
export default prisma;
