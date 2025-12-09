import { useMemo } from 'react';
// Importar el hook de lógica de la Pokédex
import { usePokedexLogic } from '../hooks/usePokedexLogic';
import GameboyHeader from './GameboyHeader';
import ScreenSection from './ScreenSection';
import ControlPanel from './ControlPanel';
import SearchSection from './SearchSection';
import Keypad from './Keypad';
import PanelInfo from './PanelInfo';

// Importar fondos de tipos
import fondoDefault from '../../../assets/fondo.png';
import fondoMissigno from '../../../assets/missigno-fondo.gif';
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
  /** Avisa al padre cuál es el Pokémon actual (para el panel de evolución externo). */
  onChangeTarget?: (t: string | number | undefined) => void;
};

/**
 * Pokédex "grande": componente orquestador que ensambla todos los sub-componentes.
 * La lógica está centralizada en el hook `usePokedexLogic`.
 */
export default function Pokedex({ onChangeTarget }: Props) {
  const {
    input,
    setInput,
    loading,
    override,
    renderName,
    renderSprite,
    renderFlavor,
    renderHeight,
    renderWeight,
    renderError,
    renderId,
    data,
    onDigit,
    onClear,
    onSubmit,
    onRandom,
    stepId,
    clearOverride,
  } = usePokedexLogic(onChangeTarget);

  // Obtener el primer tipo para el fondo (solo para el Display)
  const primaryType = data?.types?.[0];
  
  // Mapa de fondos por tipo (para el Display interno)
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

  // placeholder estático
  const placeholder = useMemo(() => 'Name or ID', []);

  // Calcular el fondo dinámico para el Display
  const backgroundImage = override?.active
    ? fondoMissigno
    : primaryType
      ? fondosPorTipo[primaryType] || fondoDefault
      : fondoDefault;

  return (
    <div className="pokedex">
      {/* Columna izquierda: cabecera + pantalla + controles */}
      <div className="pokedex-left">
        <GameboyHeader />

        <div className="divider" />

        <ScreenSection
          id={renderId}
          name={renderName ?? undefined}
          sprite={renderSprite}
          loading={loading}
          variant={override?.active ? 'missigno' : 'default'}
          backgroundImage={backgroundImage}
        />

        <ControlPanel
          onClear={onClear}
          onStepUp={onRandom}
          onStepDown={onClear}
          onStepLeft={() => stepId(-1)}
          onStepRight={() => stepId(+1)}
          onSubmit={onSubmit}
          loading={loading}
          inputEmpty={!input.trim()}
        />
      </div>

      {/* Columna derecha: panel de info + buscador + keypad */}
      <div className="pokedex-right">
        <div className="info-section">
          <PanelInfo
            name={renderName ?? undefined}
            types={override?.active ? [] : data?.types}
            heightM={renderHeight}
            weightKg={renderWeight}
            flavor={renderFlavor}
            error={renderError}
          />
        </div>

        <SearchSection
          input={input}
          placeholder={placeholder}
          loading={loading}
          onInputChange={setInput}
          onSubmit={onSubmit}
          onRandom={onRandom}
          onInputClear={clearOverride}
        />

        <Keypad onDigit={onDigit} onClear={onClear} onSearch={onSubmit} />
      </div>
    </div>
  );
}
