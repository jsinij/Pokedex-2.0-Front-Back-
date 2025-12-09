import { useEffect, useState } from 'react';
import { usePokemon } from './usePokemon';

type ModalPokemonData = {
  id?: number;
  name?: string;
  sprite?: string | null;
  types?: string[];
  heightM?: number | null;
  weightKg?: number | null;
  flavorText?: string;
};

/**
 * Hook para manejar los datos de un Pokémon en la modal
 */
export function useModalPokemon(pokemonName: string | null) {
  const [pokemon, setPokemon] = useState<ModalPokemonData | null>(null);
  
  // Hook para traer datos del Pokémon
  const { data, loading, heightM, weightKg } = usePokemon(pokemonName);

  useEffect(() => {
    if (!pokemonName) {
      setPokemon(null);
      return;
    }
    
    if (data) {
      setPokemon({
        id: data.id,
        name: data.name,
        sprite: data.sprite,
        types: data.types,
        heightM: heightM,
        weightKg: weightKg,
        flavorText: data.flavorText,
      });
    }
  }, [data, heightM, weightKg, pokemonName]);

  return { pokemon, loading };
}
