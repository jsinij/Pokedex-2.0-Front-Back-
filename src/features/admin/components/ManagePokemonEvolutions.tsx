import { useState, useEffect } from 'react';
import { getAllCustomPokemons, updateCustomPokemonEvolutions } from '../../../services/pokemonService';
import type { CustomPokemon } from '../../../services/pokemonService';
import './manage-evolutions.css';

export default function ManagePokemonEvolutions() {
  const [pokemons, setPokemons] = useState<CustomPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);
  const [evolutions, setEvolutions] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // Cargar pokémons al montarse el componente
  useEffect(() => {
    loadPokemons();
  }, []);

  const loadPokemons = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomPokemons();
      setPokemons(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pokémons');
    } finally {
      setLoading(false);
    }
  };

  // Cuando se selecciona un pokémon, cargar sus evoluciones
  const handleSelectPokemon = (id: number) => {
    setSelectedPokemonId(id);
    const selected = pokemons.find(p => p.id === id);
    if (selected) {
      setEvolutions(selected.evolutions || []);
    }
  };

  // Agregar una nueva evolución
  const handleAddEvolution = () => {
    setEvolutions([...evolutions, '']);
  };

  // Actualizar una evolución
  const handleUpdateEvolution = (index: number, value: string) => {
    const updated = [...evolutions];
    updated[index] = value;
    setEvolutions(updated);
  };

  // Remover una evolución
  const handleRemoveEvolution = (index: number) => {
    setEvolutions(evolutions.filter((_, i) => i !== index));
  };

  // Guardar los cambios
  const handleSave = async () => {
    if (!selectedPokemonId) return;

    try {
      setUpdating(true);
      setError(null);
      
      // Filtrar evoluciones vacías
      const validEvolutions = evolutions.filter(e => e.trim().length > 0);
      
      await updateCustomPokemonEvolutions(selectedPokemonId, validEvolutions);
      
      // Recargar pokémons
      await loadPokemons();
      setSelectedPokemonId(null);
      setEvolutions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar pokémon');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando pokémons...</div>;
  }

  return (
    <div className="manage-evolutions">
      <h3>Gestionar Cadenas de Evolución</h3>
      
      {error && <div className="error-message">⚠ {error}</div>}

      <div className="evolutions-container">
        <div className="pokemons-list">
          <h4>Pokémons Personalizados</h4>
          <div className="pokemon-buttons">
            {pokemons.map(pokemon => (
              <button
                key={pokemon.id}
                className={`pokemon-btn ${selectedPokemonId === pokemon.id ? 'active' : ''}`}
                onClick={() => handleSelectPokemon(pokemon.id)}
                title={`ID: ${pokemon.id}`}
              >
                {pokemon.name} (#{pokemon.id})
              </button>
            ))}
          </div>
        </div>

        {selectedPokemonId && (
          <div className="evolution-editor">
            <h4>Evoluciones de {pokemons.find(p => p.id === selectedPokemonId)?.name}</h4>
            
            <div className="evolutions-list">
              {evolutions.length === 0 ? (
                <p className="no-evolutions">Este pokémon no tiene evoluciones asignadas</p>
              ) : (
                evolutions.map((evo, index) => (
                  <div key={index} className="evolution-input-group">
                    <input
                      type="text"
                      value={evo}
                      onChange={(e) => handleUpdateEvolution(index, e.target.value)}
                      placeholder="Nombre o ID del pokémon evolucionado"
                      className="evolution-input"
                    />
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveEvolution(index)}
                      title="Remover evolución"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="evolution-actions">
              <button
                type="button"
                className="btn-add-evolution"
                onClick={handleAddEvolution}
              >
                + Agregar Evolución
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSave}
                disabled={updating}
              >
                {updating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
