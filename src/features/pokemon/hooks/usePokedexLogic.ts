/**
 * Hook de lógica centralizada para la POKÉDEX
 * 
 * Encapsula toda la lógica de la interfaz Game Boy:
 * - Manejo de input (teclado numérico + texto)
 * - Búsqueda de Pokémon por ID o nombre
 * - Validación de rangos (oficial 1-1025, custom 1026-9999)
 * - Estados especiales (Missigno para errores/no encontrado)
 * - Controles navegación (flechas, random, clear)
 * - Conversión de unidades (m, kg)
 * 
 * @module usePokedexLogic
 */

import { useCallback, useEffect, useState } from 'react';
import { usePokemon } from './usePokemon';
import missignoGif from '../../../assets/missigno.gif';

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/** ID máximo para Pokémon OFICIALES de PokeAPI */
const MAX_POKE_ID = 1025;

/** ID máximo para Pokémon CUSTOM (soporte hasta 9999) */
const MAX_CUSTOM_ID = 9999;

/** ID mínimo para cualquier Pokémon */
const MIN_POKE_ID = 1;

/** Mensaje de error para cuando no se encuentra Pokémon (Missigno) */
const NOT_FOUND_MSG =
  'Pokemon no encontrado por favor, consulte un nuevo Pokemon lo más rápido posible...';

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Valida si una cadena es un número entero (incluyendo negativos)
 * Usa regex para validar formato: /^-?\d+$/
 * 
 * @param v - Cadena a validar
 * @returns true si es número entero válido, false en otro caso
 * 
 * @example
 * ```ts
 * isIntegerStr('123')   // true
 * isIntegerStr('-50')   // true
 * isIntegerStr('abc')   // false
 * isIntegerStr('12.5')  // false
 * ```
 */
const isIntegerStr = (v: string) => /^-?\d+$/.test(v.trim());

/**
 * Genera un ID ALEATORIO para Pokémon oficial (1-1025)
 * Usado por botón "Random" y controles de navegación
 * 
 * @returns número entre 1 y 1025 (inclusive)
 * 
 * @example
 * ```ts
 * const randomId = getRandomId(); // Podría retornar 372, 891, etc
 * ```
 */
function getRandomId() {
  return Math.floor(Math.random() * MAX_POKE_ID) + 1;
}

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estado de OVERRIDE para Missigno
 * Se activa cuando hay error o Pokémon no encontrado
 * Reemplaza todos los datos renderizados con Missigno UI
 */
type OverrideState = {
  /** ¿Está el override activo? */
  active: boolean;
  
  /** Nombre a mostrar (siempre "Missigno") */
  name: string;
  
  /** Sprite a mostrar (missigno.gif) */
  sprite: string;
  
  /** Texto de descripción (mensaje de error) */
  flavor: string;
} | null;

/**
 * Retorno completo del hook usePokedexLogic
 * Incluye estados, datos y funciones de control
 */
type UsePokedexLogicReturn = {
  // ===== ESTADOS =====
  
  /** Texto que el usuario escribió en el buscador */
  input: string;
  
  /** Setter para cambiar el input manualmente */
  setInput: (value: string) => void;
  
  /** ¿Se está cargando el Pokémon de PokeAPI? */
  loading: boolean;
  
  /** Mensaje de error si algo falló en la búsqueda */
  error: string | null;
  
  /** Datos del Pokémon obtenidos de PokeAPI/backend */
  data: any;
  
  /** Altura en METROS (convertida de decímetros) */
  heightM: number | null;
  
  /** Peso en KILOGRAMOS (convertido de hectogramos) */
  weightKg: number | null;
  
  /** Estado del override de Missigno */
  override: OverrideState;

  // ===== DATOS PARA RENDERIZAR (ya aplican override) =====
  
  /** Nombre a mostrar (Missigno.name si override, si no data.name) */
  renderName: string | undefined;
  
  /** Sprite a mostrar (prioridad: override > data > null) */
  renderSprite: string | null | undefined;
  
  /** Descripción a mostrar (Missigno.flavor si override, si no data.flavorText) */
  renderFlavor: string | undefined;
  
  /** Altura a mostrar (null si Missigno, si no heightM) */
  renderHeight: number | null;
  
  /** Peso a mostrar (null si Missigno, si no weightKg) */
  renderWeight: number | null;
  
  /** Error a mostrar (null si Missigno activo) */
  renderError: string | null;
  
  /** ID del Pokémon a mostrar (undefined si Missigno) */
  renderId: number | undefined;

  // ===== CONTROLES / CALLBACKS =====
  
  /** Agrega un dígito al input (máximo 4 dígitos) */
  onDigit: (d: number) => void;
  
  /** Limpia todo (input, override, query) */
  onClear: () => void;
  
  /** Procesa búsqueda (Enter o botón OK) */
  onSubmit: () => void;
  
  /** Carga un Pokémon aleatorio */
  onRandom: () => void;
  
  /** Navega ±1 en ID (flechas izquierda/derecha) */
  stepId: (delta: number) => void;
  
  /** Desactiva el override de Missigno */
  clearOverride: () => void;
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook centralizado para toda la lógica de la POKÉDEX Game Boy
 *
 * RESPONSABILIDADES:
 * 1. Manejo de input y estado de búsqueda
 * 2. Validación de IDs y nombres
 * 3. Control de Missigno (estado de error/no encontrado)
 * 4. Interfaz con usePokemon() para obtener datos
 * 5. Controles de navegación (random, step, clear)
 * 6. Callback al componente padre cuando cambia el Pokémon
 *
 * CARACTERÍSTICAS:
 * - Soporta búsqueda por ID (1-9999) o nombre
 * - Diferencia entre Pokémon oficiales (1-1025) y custom (1026-9999)
 * - Muestra Missigno cuando hay error o no se encuentra
 * - Convierte unidades (dm→m, hg→kg)
 * - Estados de carga y error integrados
 * - Callback para notificar al padre de cambios
 *
 * @param onChangeTarget - Callback cuando cambia el Pokémon seleccionado
 *                        Recibe: nombre, ID, o undefined si Missigno
 * @returns {UsePokedexLogicReturn} Objeto con todos los estados y controles
 *
 * @example
 * ```ts
 * const pokedex = usePokedexLogic((target) => {
 *   console.log('Pokémon seleccionado:', target);
 *   // target podría ser: 'pikachu', 25, o undefined
 * });
 *
 * // Usar controles
 * pokedex.onDigit(5);  // Agrega '5' al input
 * pokedex.onSubmit();  // Busca Pokémon #5 (Charmeleon)
 * pokedex.stepId(1);   // Va a #6
 * pokedex.onRandom();  // Aleatorio
 *
 * // Renderizar
 * <span>{pokedex.renderName}</span>
 * <img src={pokedex.renderSprite} />
 * ```
 */
export function usePokedexLogic(
  onChangeTarget?: (t: string | number | undefined) => void
): UsePokedexLogicReturn {
  // ===== ESTADOS PRINCIPALES =====
  
  /** Texto que escribió el usuario en el input */
  const [input, setInput] = useState<string>('');
  
  /** Lo que realmente consultamos a la API (número ID o nombre string) */
  const [query, setQuery] = useState<string | number | null>(null);
  
  /** Recuerda si la última búsqueda fue por ID o nombre */
  const [lastKind, setLastKind] = useState<'id' | 'name' | null>(null);

  /** Estado especial para Missigno (reemplaza todos los datos) */
  const [override, setOverride] = useState<OverrideState>(null);

  // Delega obtención de datos a usePokemon
  const { data, loading, error, heightM, weightKg } = usePokemon(query);

  // ===== INICIALIZACIÓN =====
  
  // Al montar el hook: mostrar Chansey como defecto
  useEffect(() => {
    setInput('chansey');
    setQuery('chansey');
    setLastKind('name');
  }, []);

  // ===== FUNCIONES DE CONTROL =====

  /** Desactiva el override de Missigno y permite mostrar datos normales */
  const clearOverride = useCallback(() => setOverride(null), []);

  /** ACTIVA Missigno y detiene todas las requests posteriores */
  const triggerMissigno = useCallback(() => {
    setOverride({
      active: true,
      name: 'Missigno',
      sprite: missignoGif,
      flavor: NOT_FOUND_MSG,
    });
    setQuery(null); // Evita requests innecesarias mientras Missigno está activo
  }, []);

  // ===== EFECTOS SECUNDARIOS =====

  /** Si hay error en búsqueda → mostrar Missigno */
  useEffect(() => {
    if (error && lastKind) {
      console.log('[usePokedexLogic] Error en búsqueda, mostrando Missigno');
      triggerMissigno();
    }
  }, [error, lastKind, triggerMissigno]);

  /** Notificar al padre cuando cambia el Pokémon seleccionado */
  useEffect(() => {
    if (override?.active) {
      // Si Missigno está activo, no mover el panel del padre
      onChangeTarget?.(undefined);
    } else {
      // Priorizar nombre, si no ID
      onChangeTarget?.(data?.name ?? data?.id);
    }
  }, [data?.id, data?.name, override?.active, onChangeTarget]);

  // ===== CALLBACKS - ENTRADA NUMÉRICA =====

  /**
   * Agrega un dígito al input (máximo 4 caracteres)
   * Usado por teclado numérico de la Game Boy
   */
  const onDigit = useCallback(
    (d: number) => setInput((prev) => (prev + d).slice(0, 4)),
    []
  );

  /**
   * Limpia todo: input, override, query
   * Usado por botón "CLEAR" de la Pokédex
   */
  const onClear = useCallback(() => {
    setInput('');
    setLastKind(null);
    clearOverride();
  }, [clearOverride]);

  // ===== CALLBACKS - BÚSQUEDA =====

  /**
   * Procesa la BÚSQUEDA cuando usuario presiona Enter o OK
   * 
   * Lógica:
   * 1. Si input vacío → no hacer nada
   * 2. Si es número → búsqueda por ID (validar rango 1-9999)
   * 3. Si es texto → búsqueda por nombre (lowercase)
   * 4. Si fuera de rango → mostrar Missigno
   */
  const onSubmit = useCallback(() => {
    const raw = input.trim();
    if (!raw) return;

    // RAMA 1: INPUT ES NÚMERO (ID)
    if (isIntegerStr(raw)) {
      const n = parseInt(raw, 10);
      setLastKind('id');
      
      // Validar rango: 1-9999 (permite custom)
      // Menor a 1 o mayor a 9999 → Missigno
      if (n < MIN_POKE_ID || n > MAX_CUSTOM_ID) {
        triggerMissigno();
        return;
      }
      
      clearOverride();
      setQuery(n);
      return;
    }

    // RAMA 2: INPUT ES TEXTO (NOMBRE)
    setLastKind('name');
    clearOverride();
    setQuery(raw.toLowerCase());
  }, [input, triggerMissigno, clearOverride]);

  /**
   * Carga un Pokémon ALEATORIO (oficial)
   * Genera ID random entre 1-1025
   * Usado por botón "Random" o flecha arriba en navegación
   */
  const onRandom = useCallback(() => {
    clearOverride();
    setLastKind('id');
    const id = getRandomId();
    setInput(String(id));
    setQuery(id);
  }, [clearOverride]);

  // ===== CALLBACKS - NAVEGACIÓN =====

  /**
   * Navega ±1 en ID (flechas izquierda/derecha)
   * Solo funciona si el input actual es numérico
   * 
   * Flujo:
   * 1. Si input no es número → ignora
   * 2. Si es número → suma/resta delta
   * 3. Valida nuevo rango (1-9999)
   * 4. Si fuera de rango → Missigno
   * 5. Si en rango → busca ese ID
   */
  const stepId = useCallback(
    (delta: number) => {
      if (!isIntegerStr(input)) return;
      
      const next = parseInt(input, 10) + delta;
      setLastKind('id');
      
      // Validar rango: 1-9999
      if (next < MIN_POKE_ID || next > MAX_CUSTOM_ID) {
        triggerMissigno();
        setInput(String(next)); // Mostrar valor fuera de rango en display
        return;
      }
      
      clearOverride();
      setInput(String(next));
      setQuery(next);
    },
    [input, triggerMissigno, clearOverride]
  );

  // ===== DATOS PARA RENDERIZAR =====
  // (Aplican lógica de prioridad: Missigno override > datos normales)

  const renderName = override?.active ? override.name : data?.name;
  const renderSprite = override?.active ? override.sprite : data?.sprite ?? null;
  const renderFlavor = override?.active ? override.flavor : data?.flavorText;
  const renderHeight = override?.active ? null : heightM;
  const renderWeight = override?.active ? null : weightKg;
  const renderError = override?.active ? null : error ?? null;
  const renderId = override?.active ? undefined : data?.id;

  // ===== RETORNO =====

  return {
    input,
    setInput,
    loading,
    error,
    data,
    heightM,
    weightKg,
    override,
    renderName,
    renderSprite,
    renderFlavor,
    renderHeight,
    renderWeight,
    renderError,
    renderId,
    onDigit,
    onClear,
    onSubmit,
    onRandom,
    stepId,
    clearOverride,
  };
}
