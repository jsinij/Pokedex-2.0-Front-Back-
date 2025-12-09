/** Lo que usa la UI para pintar un Pokémon concreto. */
export type PokemonBasic = {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
  height: number; // decímetros (PokeAPI)
  weight: number; // hectogramos (PokeAPI)
  flavorText?: string;
  customPokemon?: boolean; // Indica si es un Pokémon personalizado del backend
};

/** (Reservado si luego listas muchos Pokémon). */
export type PokeListResp = {
  results: { name: string; url: string }[];
  next: string | null;
};
