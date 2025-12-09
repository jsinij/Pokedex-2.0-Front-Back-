import { useEffect, useRef, useState } from 'react';
import { getSpecies, getPokemonBasic } from '../api/pokemonApi';

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

/**
 * Detalles de la condición de evolución
 * Describe cómo/cuándo un Pokémon evoluciona a otro
 */
export type EvoDetail = {
  trigger?: string; // Tipo de trigger (level-up, item, trade, etc)
  min_level?: number | null; // Nivel mínimo requerido
  item?: string | null; // Item necesario para la evolución
  held_item?: string | null; // Item que debe sostener
  time_of_day?: string | null; // Hora del día requerida
  known_move?: string | null; // Movimiento que debe conocer
  happiness?: number | null; // Nivel mínimo de amistad
  other?: string | null; // Otras condiciones combinadas
};

/**
 * Representa una etapa en la cadena evolutiva
 * Estructura recursiva: cada etapa puede tener múltiples evoluciones (children)
 */
export type EvoStage = {
  name: string; // Nombre del Pokémon
  sprite: string | null; // URL del sprite/imagen
  detailsFromPrev?: EvoDetail | null; // Detalles de evolución del Pokémon anterior
  children: EvoStage[]; // Evoluciones directas de este Pokémon
};

// ============================================================================
// FUNCIONES AUXILIARES - MAPEO Y ENRIQUECIMIENTO DE DATOS
// ============================================================================

/**
 * Convierte los detalles de evolución de la API en un formato más legible
 * Extrae y formatea información como triggers, niveles, items, etc.
 * @param raw - Objeto de detalles de evolución de PokeAPI
 * @returns EvoDetail formateado y más legible
 */
function mapDetails(raw: any): EvoDetail {
  if (!raw) return {};

  return {
    trigger: raw.trigger?.name ?? undefined,
    min_level: raw.min_level ?? null,
    item: raw.item?.name ?? null,
    held_item: raw.held_item?.name ?? null,
    time_of_day: raw.time_of_day || null,
    known_move: raw.known_move?.name ?? null,
    happiness: raw.min_happiness ?? null,
    other: [
      raw.location?.name,
      raw.gender != null ? `gender:${raw.gender}` : null,
      raw.needs_overworld_rain ? 'rain' : null,
      raw.turn_upside_down ? 'upside-down' : null,
      raw.min_beauty != null ? `beauty:${raw.min_beauty}` : null,
    ]
      .filter(Boolean)
      .join(', ') || null,
  };
}

/**
 * Obtiene el sprite/imagen de un Pokémon por su nombre
 * Busca el artwork oficial, fallback a sprite normal si no existe
 * @param name - Nombre del Pokémon
 * @param signal - AbortSignal para cancelar peticiones
 * @returns URL del sprite o null si falla
 */
async function enrichWithSprite(
  name: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const pokemonData = await getPokemonBasic(name, signal);

    // Intentar obtener el artwork oficial primero
    const sprite =
      pokemonData.sprites?.other?.['official-artwork']?.front_default ??
      pokemonData.sprites?.front_default ??
      null;

    // Validar que el sprite no sea un string vacío
    return sprite && sprite.trim().length > 0 ? sprite : null;
  } catch {
    // Retornar null silenciosamente si el Pokémon no existe
    console.warn(
      `[useEvolutionChain] No se pudo obtener sprite para: ${name}`
    );
    return null;
  }
}

/**
 * Construye recursivamente el árbol de evolución desde un nodo dado
 * Procesa la estructura de cadena de PokeAPI y enriquece con sprites
 * @param node - Nodo de cadena evolutiva de PokeAPI
 * @param signal - AbortSignal para cancelar peticiones
 * @returns Promise con la etapa formateada y sus evoluciones
 */
async function buildStage(
  node: any,
  signal?: AbortSignal
): Promise<EvoStage> {
  const name: string = node?.species?.name;

  // Obtener sprite del Pokémon actual
  const sprite = await enrichWithSprite(name, signal);

  // Procesar todas las evoluciones directas
  const branches = Array.isArray(node?.evolves_to) ? node.evolves_to : [];
  const children: EvoStage[] = await Promise.all(
    branches.map(async (b: any) => {
      // Extraer detalles de la evolución si existen
      const details =
        Array.isArray(b.evolution_details) && b.evolution_details[0]
          ? mapDetails(b.evolution_details[0])
          : null;

      // Construir la evolución recursivamente
      const child = await buildStage(b, signal);
      child.detailsFromPrev = details;
      return child;
    })
  );

  return { name, sprite, detailsFromPrev: null, children };
}

/**
 * Hook que, dado un nombre o id, trae la cadena evolutiva completa (con sprites).
 * Maneja aborts para evitar “fugas” al cambiar rápido de Pokémon.
 */

// ============================================================================
// HOOK PRINCIPAL - CADENA EVOLUTIVA
// ============================================================================

/**
 * Hook para obtener la cadena evolutiva completa de un Pokémon
 *
 * Busca tanto Pokémon oficiales (PokeAPI) como personalizados (backend)
 * Maneja el ciclo de vida de peticiones, incluyendo cancelación si el
 * componente se desmonta o el Pokémon cambia rápidamente
 *
 * @param nameOrId - Nombre o ID del Pokémon (puede ser null/undefined)
 * @returns { data, loading, error }
 *   - data: EvoStage raíz con toda la cadena o null
 *   - loading: true mientras se obtienen datos
 *   - error: mensaje de error o null si es exitoso
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useEvolutionChain('pikachu');
 * if (loading) return <p>Cargando...</p>;
 * if (error) return <p>Error: {error}</p>;
 * return <EvolutionDisplay data={data} />;
 * ```
 */
export function useEvolutionChain(
  nameOrId: string | number | undefined | null
) {
  // Estado del hook
  const [data, setData] = useState<EvoStage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Si no hay Pokémon a buscar, resetear estado
    if (!nameOrId) {
      setData(null);
      setError(null);
      return;
    }

    // Preparar para nueva búsqueda
    setError(null);

    // Cancelar peticiones anteriores (si hay)
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      try {
        // Paso 1: Obtener datos básicos del Pokémon
        const pokemonData = await getPokemonBasic(nameOrId, ctrl.signal);

        // Paso 2: Determinar si es un Pokémon personalizado u oficial
        if (pokemonData.customPokemon) {
          // === FLUJO PARA POKÉMON PERSONALIZADOS ===
          console.log(
            '[useEvolutionChain] Pokémon personalizado detectado, construyendo cadena simple'
          );

          // Obtener evoluciones desde la respuesta personalizada
          const evolutions =
            pokemonData.evolution_chain?.chain?.evolves_to || [];

          // Enriquecer cada evolución con su sprite
          const enrichedChildren = await Promise.all(
            evolutions.map(async (evo: any) => {
              const evolName = evo.species?.name || evo;
              const sprite = await enrichWithSprite(evolName, ctrl.signal);

              return {
                name: evolName,
                sprite,
                detailsFromPrev: null,
                children: [],
              };
            })
          );

          // Construir nodo raíz
          const root: EvoStage = {
            name: pokemonData.name,
            sprite:
              pokemonData.sprites?.other?.['official-artwork']?.front_default ??
              pokemonData.sprites?.front_default ??
              null,
            detailsFromPrev: null,
            children: enrichedChildren,
          };

          setData(root);
          return;
        }

        // === FLUJO PARA POKÉMON OFICIALES ===
        console.log('[useEvolutionChain] Pokémon oficial detectado');

        // Obtener información de especie (necesaria para cadena evolutiva)
        const species = await getSpecies(nameOrId, ctrl.signal);
        const chainUrl: string | undefined = species?.evolution_chain?.url;

        if (!chainUrl) {
          throw new Error('Este Pokémon no tiene cadena evolutiva registrada');
        }

        // Obtener cadena evolutiva completa
        const chainResponse = await fetch(chainUrl, { signal: ctrl.signal });
        if (!chainResponse.ok) {
          throw new Error(`Error HTTP ${chainResponse.status} obteniendo cadena`);
        }

        const chain = await chainResponse.json();

        // Construir árbol recursivamente
        const root = await buildStage(chain.chain, ctrl.signal);
        setData(root);
      } catch (e: any) {
        // Ignorar errores de abortError (cambio rápido de Pokémon)
        if (e?.name === 'AbortError') {
          console.log('[useEvolutionChain] Búsqueda cancelada (Pokémon cambió)');
          return;
        }

        // Mostrar otros errores
        const errorMsg =
          e?.message ?? 'Error desconocido al obtener cadena evolutiva';
        console.error('[useEvolutionChain] Error:', errorMsg);
        setError(errorMsg);
        setData(null);
      } finally {
        setLoading(false);
      }
    })();

    // Cleanup: cancelar si el componente se desmonta
    return () => ctrl.abort();
  }, [nameOrId]);

  return { data, loading, error };
}
