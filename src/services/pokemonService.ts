import { getToken } from './authService';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * URL base de la API del backend
 * Se obtiene de variables de entorno o usa localhost por defecto
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

/**
 * Datos de un Pokémon personalizado almacenado en la BD
 */
export type CustomPokemon = {
  id: number; // ID único del Pokémon (autoincremento desde 1026)
  name: string; // Nombre del Pokémon
  types: string[]; // Array de tipos (1-2 elementos)
  sprite: string; // URL o base64 de la imagen
  description: string; // Descripción del Pokémon
  height?: number; // Altura en decímetros
  weight?: number; // Peso en hectogramos
  evolutions?: string[]; // Nombres de Pokémon a los que evoluciona
  createdBy: string; // ID del usuario que lo creó
  createdAt: string; // Fecha de creación ISO
};

/**
 * Payload para crear un nuevo Pokémon personalizado
 */
export type CreatePokemonPayload = {
  name: string; // Nombre del nuevo Pokémon
  types: string[]; // Tipos (1-2 elementos)
  sprite: string; // URL o base64 de imagen
  description: string; // Descripción
  height?: number; // Altura opcional
  weight?: number; // Peso opcional
  evolutions?: string[]; // Evoluciones opcionales
};

// ============================================================================
// FUNCIONES DE POKÉMON - CREACIÓN
// ============================================================================

/**
 * Crea un nuevo Pokémon personalizado en la BD
 *
 * NOTA: Solo administradores pueden crear Pokémon
 * Requiere token JWT válido
 *
 * @param payload - Datos del nuevo Pokémon
 * @returns Promise con el Pokémon creado
 * @throws Error si falla la creación o no tiene permisos
 *
 * @example
 * ```ts
 * const pokemon = await createCustomPokemon({
 *   name: 'Yuli',
 *   types: ['fire'],
 *   sprite: 'https://...',
 *   description: 'Mi Pokémon',
 * });
 * ```
 */
export async function createCustomPokemon(
  payload: CreatePokemonPayload
): Promise<CustomPokemon> {
  // Verificar que el usuario tiene token de autenticación
  const token = getToken();
  if (!token) {
    throw new Error('Se requiere autenticación para crear un Pokémon');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/pokemon/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      // Construir mensaje de error detallado
      const message = error.details
        ? `${error.error}: ${error.details}`
        : error.error || 'Error al crear Pokémon personalizado';
      throw new Error(message);
    }

    const data = await response.json();
    console.log(`✅ Pokémon creado: ${data.pokemon.name} (ID: ${data.pokemon.id})`);
    return data.pokemon;
  } catch (error) {
    console.error('[pokemonService] Error creando Pokémon:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE POKÉMON - LECTURA / BÚSQUEDA
// ============================================================================

/**
 * Obtiene TODOS los Pokémon personalizados del sistema
 *
 * @returns Promise con array de todos los Pokémon custom
 * @throws Error si la solicitud falla
 */
export async function getAllCustomPokemons(): Promise<CustomPokemon[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pokemon/custom`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('No se pudieron obtener los Pokémon personalizados');
    }

    const pokemons = await response.json();
    console.log(`📊 Pokémon personalizados encontrados: ${pokemons.length}`);
    return pokemons;
  } catch (error) {
    console.error('[pokemonService] Error obteniendo Pokémon:', error);
    throw error;
  }
}

/**
 * Busca un Pokémon personalizado específico por ID
 *
 * @param id - ID del Pokémon (debe ser >= 1026)
 * @returns Promise con los datos del Pokémon
 * @throws Error si el Pokémon no existe
 *
 * @example
 * ```ts
 * const pokemon = await getCustomPokemonById(1026);
 * console.log(pokemon.name); // "Yuli"
 * ```
 */
export async function getCustomPokemonById(
  id: number
): Promise<CustomPokemon> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pokemon/custom/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Pokémon con ID ${id} no encontrado (${response.status})`
      );
    }

    const pokemon = await response.json();
    console.log(`🔍 Pokémon encontrado: ${pokemon.name}`);
    return pokemon;
  } catch (error) {
    console.error(`[pokemonService] Error obteniendo Pokémon ${id}:`, error);
    throw error;
  }
}

/**
 * Obtiene todos los Pokémon creados por un usuario específico
 *
 * @param userId - ID único del usuario
 * @returns Promise con array de Pokémon del usuario
 * @throws Error si la solicitud falla
 *
 * @example
 * ```ts
 * const userPokemons = await getCustomPokemonsByUser('user-123');
 * ```
 */
export async function getCustomPokemonsByUser(
  userId: string
): Promise<CustomPokemon[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/pokemon/custom/user/${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `No se pudieron obtener Pokémon del usuario ${userId}`
      );
    }

    const pokemons = await response.json();
    console.log(
      `👤 Pokémon del usuario ${userId}: ${pokemons.length} encontrados`
    );
    return pokemons;
  } catch (error) {
    console.error(
      `[pokemonService] Error obteniendo Pokémon del usuario ${userId}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE POKÉMON - ACTUALIZACIÓN
// ============================================================================

/**
 * Actualiza las evoluciones de un Pokémon personalizado
 *
 * NOTA: Solo administradores pueden actualizar
 * Requiere token JWT válido
 *
 * @param idOrName - ID o nombre del Pokémon a actualizar
 * @param evolutions - Nuevo array de nombres de evoluciones
 * @returns Promise con el Pokémon actualizado
 * @throws Error si no tiene permisos o el Pokémon no existe
 *
 * @example
 * ```ts
 * const updated = await updateCustomPokemonEvolutions('Yuli3', ['Yuli4']);
 * ```
 */
export async function updateCustomPokemonEvolutions(
  idOrName: number | string,
  evolutions: string[]
): Promise<CustomPokemon> {
  // Verificar autenticación
  const token = getToken();
  if (!token) {
    throw new Error('Se requiere autenticación para actualizar un Pokémon');
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/pokemon/custom/${idOrName}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ evolutions }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Construir mensaje de error detallado
      const message = error.details
        ? `${error.error}: ${error.details}`
        : error.error || 'Error al actualizar Pokémon';
      throw new Error(message);
    }

    const data = await response.json();
    console.log(
      `✅ Evoluciones actualizadas: ${idOrName} → ${evolutions.join(', ')}`
    );
    return data.pokemon;
  } catch (error) {
    console.error(
      `[pokemonService] Error actualizando evoluciones de ${idOrName}:`,
      error
    );
    throw error;
  }
}
