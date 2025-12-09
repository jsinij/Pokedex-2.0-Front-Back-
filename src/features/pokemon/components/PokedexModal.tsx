import TypeBadge from './TypeBadge';
import './pokedex-modal.css';

// Importar fondos de tipos
import fondoDefault from '../../../assets/fondo.png';
import fondoAgua from '../../../assets/agua.png';
import fondoFuego from '../../../assets/fuego.png';
import fondoPlanta from '../../../assets/planta.png';
import fondoElectrico from '../../../assets/electrico.png';
import fondoHielo from '../../../assets/hielo.png';
import fondoLucha from '../../../assets/lucha.png';
import fondoVeneno from '../../../assets/veneno.png';
import fondoTierra from '../../../assets/tierra.png';
import fondoPsiquico from '../../../assets/psiquico.png';
import fondoBicho from '../../../assets/bicho.png';
import fondoRoca from '../../../assets/roca.png';
import fondoFantasma from '../../../assets/fantasma.png';
import fondoDragon from '../../../assets/dragon.png';
import fondoOscuro from '../../../assets/siniestro.png';
import fondoAcero from '../../../assets/acero.png';
import fondoHada from '../../../assets/hada.png';
import fondoNormal from '../../../assets/normal.png';

type Props = {
  pokemon: {
    id?: number;
    name?: string;
    sprite?: string | null;
    types?: string[];
    heightM?: number | null;
    weightKg?: number | null;
    flavorText?: string;
  } | null;
  loading?: boolean;
  onClose: () => void;
};

/**
 * Pokédex secundaria modal: vista compacta y horizontal de un Pokémon
 * Se muestra encima del álbum en tema retro azul
 */
export default function PokedexModal({ pokemon, loading, onClose }: Props) {
  if (!pokemon) return null;

  // Mapa de fondos por tipo
  // Los tipos de la API vienen en inglés: fire, water, grass, electric, ice, fighting, poison, ground, flying, psychic, bug, rock, ghost, dragon, dark, steel, fairy, normal
  const fondosPorTipo: Record<string, string> = {
    water: fondoAgua,
    fire: fondoFuego,
    grass: fondoPlanta,
    electric: fondoElectrico,
    ice: fondoHielo,
    fighting: fondoLucha,
    poison: fondoVeneno,
    ground: fondoTierra,
    flying: fondoDefault, // sin fondo especial, usa default
    psychic: fondoPsiquico,
    bug: fondoBicho,
    rock: fondoRoca,
    ghost: fondoFantasma,
    dragon: fondoDragon,
    dark: fondoOscuro,
    steel: fondoAcero,
    fairy: fondoHada,
    normal: fondoNormal,
  };

  // Obtener el primer tipo para el fondo
  const primaryType = pokemon.types?.[0];
  const displayBackground = primaryType && fondosPorTipo[primaryType]
    ? fondosPorTipo[primaryType]
    : fondoDefault;

  return (
    <div className="pokedex-modal-overlay" onClick={onClose}>
      <div 
        className="pokedex-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón X para cerrar */}
        <button 
          type="button"
          className="pokedex-modal-close" 
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Contenedor horizontal */}
        <div className="pokedex-modal-content">
          {/* Lado izquierdo: sprite */}
          <div className="pokedex-modal-left">
            <div 
              className="pokedex-modal-display"
              style={{
                backgroundImage: `url(${displayBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {loading ? (
                <div className="loading">Cargando…</div>
              ) : pokemon.sprite ? (
                <img 
                  src={pokemon.sprite} 
                  alt={pokemon.name} 
                  className="pokedex-modal-sprite"
                />
              ) : (
                <div className="placeholder" />
              )}
            </div>
          </div>

          {/* Lado derecho: información */}
          <div className="pokedex-modal-right">
            {/* Nombre e ID */}
            <div className="pokedex-modal-header">
              <h2 className="pokedex-modal-name">
                {pokemon.name}
                {pokemon.id && (
                  <span className="pokedex-modal-id">
                    #{String(pokemon.id).padStart(3, '0')}
                  </span>
                )}
              </h2>
            </div>

            {/* Tipos */}
            {pokemon.types && pokemon.types.length > 0 && (
              <div className="pokedex-modal-types">
                {pokemon.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}

            {/* Descripción */}
            {pokemon.flavorText && (
              <div className="pokedex-modal-flavor">
                <p>{pokemon.flavorText}</p>
              </div>
            )}

            {/* Stats básicos */}
            <div className="pokedex-modal-stats">
              {pokemon.heightM !== null && pokemon.heightM !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Altura:</span>
                  <span className="stat-value">{pokemon.heightM} m</span>
                </div>
              )}
              {pokemon.weightKg !== null && pokemon.weightKg !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Peso:</span>
                  <span className="stat-value">{pokemon.weightKg} kg</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
