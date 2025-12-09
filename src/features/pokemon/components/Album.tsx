import { useMemo, useState, useEffect } from 'react';
import { useAlbumPage } from '../hooks/useAlbumPage';
import { useModalPokemon } from '../hooks/useModalPokemon';
import { getAllCustomPokemons } from '../api/pokemonApi';
import TypeBadge from './TypeBadge';
import PokedexModal from './PokedexModal';

// Total de pokémon oficiales en la Pokédex
const OFFICIAL_TOTAL = 1025;

// 3x3 cartas por página
const PAGE_SIZE = 9;

type Props = {
  // Prop no utilizada ahora, pero se puede mantener para futura extensión
};

export default function Album({}: Props) {
  // Página actual (empieza en 1 porque es más "humano" para mostrar)
  const [page, setPage] = useState(1);
  // Pokémon seleccionado para la modal
  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  // Total dinámico que incluye custom pokémon
  const [total, setTotal] = useState(OFFICIAL_TOTAL);
  
  // Hook para traer datos del Pokémon seleccionado
  const { pokemon: modalPokemon, loading: modalLoading } = useModalPokemon(selectedPokemon);
  
  // Cargar total de pokémon (oficial + custom)
  useEffect(() => {
    let isMounted = true;
    getAllCustomPokemons()
      .then(custom => {
        if (isMounted) {
          setTotal(OFFICIAL_TOTAL + custom.length);
        }
      })
      .catch(() => {
        // Si falla, usar solo el total oficial
        if (isMounted) {
          setTotal(OFFICIAL_TOTAL);
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Cantidad total de páginas que vamos a recorrer
  const TOTAL_PAGES = Math.ceil(total / PAGE_SIZE);

  // De aquí sale desde qué índice pedir en la API
  const offset = (page - 1) * PAGE_SIZE;

  // Hook que trae la “página” del álbum (nombres, tipos y sprites)
  const { items, loading, error } = useAlbumPage(offset, PAGE_SIZE);

  // Habilitamos/deshabilitamos las flechas según la página actual
  const canPrev = page > 1;
  const canNext = page < TOTAL_PAGES;

  // Handlers simples para navegar
  const prev = () => canPrev && setPage((p) => p - 1);
  const next = () => canNext && setPage((p) => p + 1);

  // En la última página puede venir menos de 9 pokes.
  // Con esto “rellenamos” con nulls para completar el grid 3x3
  const paddedItems = useMemo(() => {
    const arr = items ?? [];
    const extra = PAGE_SIZE - arr.length;
    return extra > 0
      ? [...arr, ...Array.from({ length: extra }, () => null)]
      : arr;
  }, [items]);

  return (
    <div className="album-container">
      {/* Header con flechas y título. Nada raro aquí. */}
      <div className="album-header">
        <button
          className="album-arrow"
          onClick={prev}
          disabled={!canPrev}
          aria-label="Página anterior"
        >
          ◀
        </button>

        <div className="album-title">Álbum Pokédex</div>

        <button
          className="album-arrow"
          onClick={next}
          disabled={!canNext}
          aria-label="Página siguiente"
        >
          ▶
        </button>
      </div>

      {/* Indicador de “Página X / Y” para ubicar al usuario */}
      <div className="album-subtitle">
        Página {page} / {TOTAL_PAGES}
      </div>

      {/* La grilla 3x3 (definida en CSS). Muestra estados de carga/err */}
      <div className="album-grid">
        {loading && <div className="album-loading">Cargando…</div>}
        {error && <div className="album-error">⚠ {error}</div>}

        {/* Cuando hay datos, pintamos cada carta.
            Si un slot es null (padded), renderizamos una carta vacía
            para mantener la cuadrícula bonita. */}
        {!loading &&
          !error &&
          paddedItems.map((it, idx) =>
            it ? (
              <div 
                className="album-card" 
                key={it.name}
                onClick={() => setSelectedPokemon(it.name)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedPokemon(it.name);
                  }
                }}
              >
                {/* Sprite grandecito. Si no hay, un placeholder gris. */}
                {it.sprite ? (
                  <img className="album-sprite" src={it.sprite} alt={it.name} />
                ) : (
                  <div className="album-sprite placeholder" />
                )}

                {/* Nombre en mayúsculas por estilo “retro” */}
                <div className="album-name">{it.name}</div>

                {/* Badges de tipos (usa el mismo componente que en la pokédex) */}
                <div className="album-types">
                  {it.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
              </div>
            ) : (
              // Slot vacío para completar las 9 cartas
              <div className="album-card empty" key={`empty-${idx}`} />
            )
          )}
      </div>

      {/* Modal de Pokédex secundaria */}
      <PokedexModal
        pokemon={modalPokemon}
        loading={modalLoading}
        onClose={() => setSelectedPokemon(null)}
      />
    </div>
  );
}