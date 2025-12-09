import { useEffect, useRef, useState } from 'react';
import { listPokemon, getPokemonBasic } from '../api/pokemonApi';

type AlbumItem = {
  name: string; // nombre del pokémon
  types: string[]; // tipos en texto plano (e.g. ['fire', 'flying'])
  sprite: string | null; // URL del sprite o null si no hay
};

// Cache básica en memoria para no volver a pedir lo mismo página tras página
const itemCache = new Map<string, AlbumItem>();

/**
 * Hook que trae una “página” del álbum.
 * - Usa `listPokemon` para saber qué nombres tocan en el rango (offset/limit)
 * - Por cada nombre pide el detalle básico (sprite + tipos)
 * - Aplica cache para acelerar cuando se repite
 */
export function useAlbumPage(offset: number, limit: number) {
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null); // para cancelar si cambia la página rápido

  useEffect(() => {
    setLoading(true);
    setError(null);

    // si llega otra página antes de terminar, cancelamos esta
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      try {
        // 1) traemos la lista de nombres para esta “página”
        const list = await listPokemon(offset, limit, ctrl.signal);

        // 2) para cada nombre pedimos el detalle (con cache)
        const results = await Promise.all(
          list.map(async (entry: { name: string }) => {
            const key = entry.name.toLowerCase();

            // si ya lo tenemos en cache, devolvemos eso
            if (itemCache.has(key)) return itemCache.get(key)!;

            // si no, pedimos el "basic"
            const p = await getPokemonBasic(key, ctrl.signal);

            // normalizamos tipos y sprite
            // Los custom pokémon vienen con tipos como {type:{name:string}}[] después de getPokemonBasic
            const types = (p.types ?? []).map((t: any) => 
              typeof t === 'string' ? t : t?.type?.name ?? ''
            ).filter((t: string) => t !== '');
            
            const sprite =
              p.sprites?.other?.['official-artwork']?.front_default ??
              p.sprites?.front_default ??
              p.sprite ?? // para custom pokémon
              null;

            const mapped: AlbumItem = { name: key, types, sprite };
            itemCache.set(key, mapped); // guardamos en cache
            return mapped;
          })
        );

        setItems(results);
      } catch (e: any) {
        // si la petición fue cancelada, no hacemos nada
        if (e?.name === 'AbortError') return;

        // cualquier otro error lo mostramos y limpiamos items
        setError(e?.message ?? 'Error cargando álbum');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();

    // cleanup: cancelamos si el componente se desmonta o cambian offset/limit
    return () => ctrl.abort();
  }, [offset, limit]);

  return { items, loading, error };
}
