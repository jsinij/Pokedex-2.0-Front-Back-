/**
 * Hook para obtener datos de un Pokémon específico
 * 
 * Obtiene información completa de PokeAPI o backend:
 * - ID, nombre, tipos
 * - Sprite oficial
 * - Descripción Pokédex (flavor text)
 * - Altura y peso (con conversión de unidades)
 * 
 * Característica: Cachea resultados en memoria para evitar requests repetidas
 * 
 * @module usePokemon
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPokemonBasic, getSpecies } from '../api/pokemonApi';
import type { PokemonBasic } from '../types/pokemon';

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

/**
 * Cache simple en memoria para no repetir llamadas de la misma búsqueda
 * Mapea: (id | nombre_lowercase) → PokemonBasic
 * 
 * Ejemplo:
 * - cache.get('pikachu') → PokemonBasic de Pikachu
 * - cache.get(25) → Mismo PokemonBasic de Pikachu
 * 
 * Se limpia al recargar la página (caché temporal, no persistente)
 */
const cache = new Map<string | number, PokemonBasic>();

// ============================================================================
// TIPOS
// ============================================================================

// PokemonBasic está definido en src/features/pokemon/types/pokemon.ts
// Incluye: id, name, sprite, types[], height, weight, flavorText

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook para obtener datos completos de un Pokémon
 *
 * FLUJO DE BÚSQUEDA:
 * 1. Recibe query (nombre o ID)
 * 2. Valida caché en memoria (si existe, retorna inmediatamente)
 * 3. Si no está en caché:
 *    a. Llama getPokemonBasic(query) → obtiene datos base + tipos
 *    b. Si es Pokémon OFICIAL:
 *       - Llama getSpecies(id) → obtiene flavor text en inglés
 *       - Extrae y limpia descripción
 *    c. Si es Pokémon CUSTOM (del backend):
 *       - Ya vienen con flavor_text_entries
 *       - Se extrae flavor text directamente
 * 4. Mapea a formato PokemonBasic
 * 5. Guarda en caché
 * 6. Retorna datos + estados
 *
 * CARACTERÍSTICAS:
 * - Cachea resultados (misma query = sin request)
 * - Maneja AbortController para cancelar requests al desmontar
 * - Convierte unidades (dm→m, hg→kg)
 * - Soporta tanto Pokémon oficiales como custom
 * - Maneja errores de red y parsing
 *
 * PARÁMETROS:
 * @param query - string (nombre) | number (ID) | null (sin búsqueda)
 *        Ejemplos: 'pikachu', 25, null
 *
 * RETORNO:
 * @returns {object}
 *   - data: PokemonBasic | null - Datos del Pokémon (null si cargando/error)
 *   - loading: boolean - ¿Se está fetching?
 *   - error: string | null - Mensaje de error si falló
 *   - heightM: number | null - Altura en METROS (convertida de dm)
 *   - weightKg: number | null - Peso en KILOGRAMOS (convertida de hg)
 *
 * @example
 * ```ts
 * // En un componente
 * const { data, loading, error, heightM, weightKg } = usePokemon(25);
 *
 * if (loading) return <div>Cargando Pikachu...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!data) return <div>No encontrado</div>;
 *
 * return (
 *   <div>
 *     <h1>{data.name}</h1>
 *     <img src={data.sprite} />
 *     <p>{data.flavorText}</p>
 *     <p>Altura: {heightM}m, Peso: {weightKg}kg</p>
 *   </div>
 * );
 *
 * // Búsqueda por nombre
 * const result2 = usePokemon('bulbasaur');
 *
 * // Búsqueda nula (sin query)
 * const result3 = usePokemon(null); // no hace nada
 * ```
 */
export function usePokemon(query: string | number | null) {
  const [data, setData] = useState<PokemonBasic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query && query !== 0) return;
    const key = typeof query === 'string' ? query.toLowerCase() : query;

    // cache hit
    if (cache.has(key)) {
      setData(cache.get(key)!);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      try {
        console.log('[usePokemon] Fetching:', key);
        const p = await getPokemonBasic(key, ctrl.signal);
        console.log('[usePokemon] Got response:', p);
        
        // Si es un custom pokémon (del backend), no necesita getSpecies
        // Los custom pokémon ya vienen con toda la info necesaria
        if (p.customPokemon) {
          console.log('[usePokemon] Custom pokémon detected');
          const flavorEntry = p.flavor_text_entries?.find(
            (e: any) => e.flavor_text
          );
          const flavor = flavorEntry?.flavor_text ?? 'Custom Pokémon';
          
          const mapped: PokemonBasic = {
            id: p.id,
            name: p.name,
            sprite: p.sprites?.other?.['official-artwork']?.front_default ?? p.sprites?.front_default ?? null,
            types: (p.types ?? []).map((t: any) => typeof t === 'string' ? t : t.type?.name ?? ''),
            height: p.height || 10,
            weight: p.weight || 10,
            flavorText: flavor,
          };

          cache.set(key, mapped);
          setData(mapped);
          return;
        }

        const species = await getSpecies(p.id, ctrl.signal);

        // usamos la entrada en inglés (la más consistente)
        const enEntry = species.flavor_text_entries.find(
          (e: any) => e.language?.name === 'en'
        );
        const flavor = enEntry?.flavor_text?.replace(/\f|\n|\r/g, ' ') ?? '';

        const mapped: PokemonBasic = {
          id: p.id,
          name: p.name,
          sprite:
            p.sprites?.other?.['official-artwork']?.front_default ??
            p.sprites?.front_default ??
            null,
          types: (p.types ?? []).map((t: any) => t.type.name),
          height: p.height, // decímetros
          weight: p.weight, // hectogramos
          flavorText: flavor,
        };

        cache.set(key, mapped);
        setData(mapped);
      } catch (e: any) {
        setError(e?.message ?? 'Error al obtener datos');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [query]);

  // conversiones “amigables”
  const kg = useMemo(() => (data ? data.weight / 10 : null), [data]);
  const m = useMemo(() => (data ? data.height / 10 : null), [data]);

  return { data, loading, error, heightM: m, weightKg: kg };
}
