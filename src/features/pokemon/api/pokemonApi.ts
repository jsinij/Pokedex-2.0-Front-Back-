// ============================================================================
// CONFIGURACIÓN - URLs BASE
// ============================================================================

/** URL base de PokeAPI (API pública oficial de Pokémon) */
const BASE = 'https://pokeapi.co/api/v2';

/** URL base del backend propio (para Pokémon personalizados) */
const BACKEND_BASE = '/api';

// ============================================================================
// FUNCIONES AUXILIARES - REQUESTS HTTP
// ============================================================================

/**
 * Realiza petición genérica a PokeAPI
 * Maneja errores HTTP y parsing de JSON
 *
 * @param path - Ruta relativa de PokeAPI (ej: '/pokemon/pikachu')
 * @param signal - AbortSignal para cancelar peticiones
 * @returns Promise con el JSON parseado de tipo T
 * @throws Error si la respuesta no es OK
 */
async function http<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    throw new Error(`❌ PokeAPI Error HTTP ${res.status} en ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Realiza petición al backend propio
 * Maneja errores HTTP y parsing de JSON
 *
 * @param path - Ruta relativa del backend (ej: '/pokemon/custom')
 * @param signal - AbortSignal para cancelar peticiones
 * @returns Promise con el JSON parseado de tipo T
 * @throws Error si la respuesta no es OK
 */
async function backendHttp<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BACKEND_BASE}${path}`, { signal });
  if (!res.ok) {
    throw new Error(
      `❌ Backend Error HTTP ${res.status} en ${path}`
    );
  }
  return res.json() as Promise<T>;
}

// ============================================================================
// FUNCIONES PRINCIPALES - BÚSQUEDA DE POKÉMON
// ============================================================================

/**
 * Obtiene información de la especie de un Pokémon
 * SOLO para Pokémon oficiales de PokeAPI
 *
 * @param nameOrId - Nombre o ID del Pokémon
 * @param signal - AbortSignal para cancelar
 * @returns Promise con información de especie (cadena evolutiva, etc.)
 * @throws Error si el Pokémon no existe en PokeAPI
 *
 * @example
 * ```ts
 * const species = await getSpecies('pikachu');
 * console.log(species.evolution_chain.url); // URL de la cadena evolutiva
 * ```
 */
export async function getSpecies(
  nameOrId: string | number,
  signal?: AbortSignal
) {
  return http<any>(
    `/pokemon-species/${String(nameOrId).toLowerCase()}`,
    signal
  );
}

/**
 * Obtiene TODOS los Pokémon personalizados del backend
 * Fallback: retorna array vacío si falla
 *
 * @param signal - AbortSignal para cancelar
 * @returns Promise con array de Pokémon personalizados
 *
 * @example
 * ```ts
 * const customPokemons = await getAllCustomPokemons();
 * console.log(`Total: ${customPokemons.length}`);
 * ```
 */
export async function getAllCustomPokemons(
  signal?: AbortSignal
): Promise<any[]> {
  try {
    const pokemons = await backendHttp<any[]>('/pokemon/custom', signal);
    console.log(`📊 [pokemonApi] ${pokemons.length} Pokémon custom obtenidos`);
    return pokemons;
  } catch (error) {
    console.warn('[pokemonApi] Error obteniendo Pokémon custom, retornando []', error);
    return [];
  }
}

/**
 * Busca un Pokémon por nombre o ID
 * Intenta primero PokeAPI (oficial), luego backend (personalizado)
 *
 * Flujo de búsqueda:
 * 1. Busca en PokeAPI por nombre/ID
 * 2. Si no existe, busca en backend (custom Pokémon)
 * 3. Si existe custom, transforma a formato PokeAPI para consistencia
 * 4. Si no existe en ninguno, lanza error para mostrar Missigno
 *
 * @param nameOrId - Nombre o ID del Pokémon
 * @param signal - AbortSignal para cancelar
 * @returns Promise con datos del Pokémon en formato PokeAPI
 * @throws Error si no existe en ninguna fuente
 *
 * @example
 * ```ts
 * // Buscar Pokémon oficial
 * const pikachu = await getPokemonBasic('pikachu');
 *
 * // Buscar Pokémon personalizado
 * const yuli = await getPokemonBasic('yuli');
 * console.log(yuli.customPokemon); // true
 * ```
 */
export async function getPokemonBasic(
  nameOrId: string | number,
  signal?: AbortSignal
) {
  const searchParam = String(nameOrId).toLowerCase();
  console.log(`🔍 [pokemonApi] Buscando: "${searchParam}"`);

  // PASO 1: Intentar obtener de PokeAPI (Pokémon oficial)
  try {
    console.log('   → Buscando en PokeAPI...');
    const pokeApiPokemon = await http<any>(
      `/pokemon/${searchParam}`,
      signal
    );
    console.log(
      `   ✅ Encontrado en PokeAPI: ${pokeApiPokemon.name} (oficial)`
    );
    return pokeApiPokemon;
  } catch {
    console.log('   ℹ️  No encontrado en PokeAPI');

    // PASO 2: Intentar obtener del backend (Pokémon personalizado)
    try {
      console.log('   → Buscando en backend (custom)...');
      const customPokemon = await backendHttp<any>(
        `/pokemon/custom/${searchParam}`,
        signal
      );
      console.log(
        `   ✅ Encontrado en backend: ${customPokemon.name} (personalizado)`
      );

      // PASO 3: Transformar a formato PokeAPI para consistencia en el frontend
      return {
        id: customPokemon.id,
        name: customPokemon.name,
        sprites: {
          other: {
            'official-artwork': {
              front_default:
                customPokemon.sprite || customPokemon.image,
            },
          },
          front_default: customPokemon.sprite || customPokemon.image,
        },
        types: (customPokemon.types || []).map((type: string) => ({
          type: { name: type },
        })),
        height: customPokemon.height || 10,
        weight: customPokemon.weight || 10,
        flavor_text_entries: customPokemon.description
          ? [{ flavor_text: customPokemon.description }]
          : [],
        evolution_chain: {
          chain:
            customPokemon.evolutions &&
            customPokemon.evolutions.length > 0
              ? {
                  evolves_to: customPokemon.evolutions.map(
                    (evo: string) => ({
                      species: { name: evo },
                    })
                  ),
                }
              : { evolves_to: [] },
        },
        customPokemon: true, // Bandera para diferenciar custom
      };
    } catch (err) {
      // PASO 4: No encontrado en ningún lado
      console.error(
        `   ❌ No encontrado en ninguna fuente: "${searchParam}"`,
        err
      );
      throw new Error(`Pokémon "${searchParam}" no encontrado`);
    }
  }
}

// ============================================================================
// FUNCIONES PRINCIPALES - LISTADO Y PAGINACIÓN
// ============================================================================

/**
 * Lista Pokémon para el álbum con soporte de paginación
 *
 * Combina Pokémon oficiales (PokeAPI) + personalizados (backend)
 * Primero muestra custom, luego oficiales
 *
 * Estrategia:
 * 1. Obtener todos los Pokémon custom
 * 2. Obtener página de PokeAPI
 * 3. Combinar ambas listas
 * 4. Aplicar paginación al total combinado
 * 5. Si falla, fallback a solo PokeAPI
 *
 * @param offset - Número de elementos a saltar
 * @param limit - Número máximo de elementos a retornar
 * @param signal - AbortSignal para cancelar
 * @returns Promise con array de {name: string} paginados
 *
 * @example
 * ```ts
 * // Obtener primeros 20 Pokémon (custom + oficiales)
 * const pokemons = await listPokemon(0, 20);
 * // Resultado: [Yuli, Yuli2, Yuli3, Bulbasaur, ...]
 * ```
 */
export async function listPokemon(
  offset: number,
  limit: number,
  signal?: AbortSignal
) {
  try {
    console.log(
      `📄 [pokemonApi] Listando: offset=${offset}, limit=${limit}`
    );

    // Obtener todos los Pokémon personalizados
    const customPokemons = await getAllCustomPokemons(signal);

    // Obtener página de PokeAPI
    const pokeapiData = await http<any>(
      `/pokemon?offset=${offset}&limit=${limit}`,
      signal
    );

    // Formatear custom Pokémon
    const customResults = customPokemons.map((p: any) => ({
      name: p.name.toLowerCase(),
    }));

    // Formatear Pokémon de PokeAPI
    const pokeapiResults = (pokeapiData?.results ?? []).map(
      (r: any) => ({
        name: r.name,
      })
    );

    // Combinar: custom primero, luego oficiales
    const allResults = [...customResults, ...pokeapiResults];

    // Aplicar paginación al total combinado
    const paginatedResults = allResults.slice(offset, offset + limit);

    console.log(
      `   ℹ️  Total: ${allResults.length} (custom: ${customResults.length}, oficial: ${pokeapiResults.length})`
    );
    console.log(`   ℹ️  Retornando: ${paginatedResults.length} elementos`);

    return paginatedResults;
  } catch (err) {
    console.error(
      '[pokemonApi] Error en listPokemon, fallback a PokeAPI:',
      err
    );

    // Fallback: si falla, retornar solo PokeAPI
    try {
      const fallbackData = await http<any>(
        `/pokemon?offset=${offset}&limit=${limit}`,
        signal
      );
      console.log('   ✅ Usando fallback (solo PokeAPI)');
      return (fallbackData?.results ?? []).map((r: any) => ({
        name: r.name,
      }));
    } catch (fallbackErr) {
      console.error('[pokemonApi] Fallback también falló:', fallbackErr);
      return [];
    }
  }
}
