import { useState } from 'react';
import { createCustomPokemon } from '../../../services/pokemonService';
import './add-pokemon-form.css';

// Colores de tipos (copiados de type.css)
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  normal: { bg: '#a8a77a', text: '#111' },
  fire: { bg: '#ee8130', text: '#fff' },
  water: { bg: '#6390f0', text: '#fff' },
  electric: { bg: '#f7d02c', text: '#111' },
  grass: { bg: '#7ac74c', text: '#111' },
  ice: { bg: '#96d9d6', text: '#111' },
  fighting: { bg: '#c22e28', text: '#fff' },
  poison: { bg: '#a33ea1', text: '#fff' },
  ground: { bg: '#e2bf65', text: '#111' },
  flying: { bg: '#a98ff3', text: '#fff' },
  psychic: { bg: '#f95587', text: '#fff' },
  bug: { bg: '#a6b91a', text: '#111' },
  rock: { bg: '#b6a136', text: '#111' },
  ghost: { bg: '#735797', text: '#fff' },
  dragon: { bg: '#6f35fc', text: '#fff' },
  dark: { bg: '#705746', text: '#fff' },
  steel: { bg: '#b7b7ce', text: '#111' },
  fairy: { bg: '#d685ad', text: '#fff' },
};

type Props = {
  onSubmit?: (data: PokemonFormData) => void;
  onSuccess?: () => void;
  isLoading?: boolean;
};

export type PokemonFormData = {
  name: string;
  types: string[];
  imageUrl: string;
  description: string;
  height?: number;
  weight?: number;
  evolutions?: string[]; // nombres o IDs de Pokémon a los que evoluciona
};

const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
  'steel', 'fairy'
];

export default function AddPokemonForm({ onSubmit, onSuccess, isLoading: isLoadingProp = false }: Props) {
  const [formData, setFormData] = useState<PokemonFormData>({
    name: '',
    types: [],
    imageUrl: '',
    description: '',
    height: undefined,
    weight: undefined,
    evolutions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convertir archivo a base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, imageUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, imageUrl: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({ ...formData, description: e.target.value });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) * 10 : undefined;
    setFormData({ ...formData, height: value });
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) * 10 : undefined;
    setFormData({ ...formData, weight: value });
  };

  const handleTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const handleEvolutionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const values = e.target.value
      .split(',')
      .map(v => v.trim())
      .filter(v => v);
    setFormData({ ...formData, evolutions: values });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!formData.name.trim()) {
      setError('Por favor ingresa el nombre del Pokémon');
      return;
    }

    if (formData.types.length === 0) {
      setError('Por favor selecciona al menos un tipo');
      return;
    }

    if (!formData.imageUrl.trim()) {
      setError('Por favor ingresa una URL de imagen válida');
      return;
    }

    if (!formData.description.trim()) {
      setError('Por favor ingresa una descripción');
      return;
    }

    try {
      setIsLoading(true);
      
      // Llamar al servicio para crear el Pokémon
      const result = await createCustomPokemon({
        name: formData.name,
        types: formData.types,
        sprite: formData.imageUrl,
        description: formData.description,
        height: formData.height,
        weight: formData.weight,
        evolutions: formData.evolutions?.filter(e => e.length > 0),
      });

      // Mostrar mensaje de éxito
      setSuccess(`¡Pokémon "${formData.name}" registrado exitosamente con ID #${result.id}!`);

      // Limpiar formulario
      setFormData({
        name: '',
        types: [],
        imageUrl: '',
        description: '',
        height: undefined,
        weight: undefined,
        evolutions: [],
      });

      // Llamar callback si existe
      if (onSubmit) {
        onSubmit(formData);
      }

      // Notificar éxito
      if (onSuccess) {
        onSuccess();
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el Pokémon');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pokemon-form">
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      <div className="form-group">
        <label htmlFor="pokemon-name" className="form-label">
          Nombre del Pokémon *
        </label>
        <input
          type="text"
          id="pokemon-name"
          className="form-input"
          placeholder="ej. Pikachu"
          value={formData.name}
          onChange={handleNameChange}
          required
        />
      </div>

      {/* Tipos */}
      <div className="form-group">
        <label className="form-label">Tipo(s) *</label>
        <div className="type-selector">
          {POKEMON_TYPES.map(type => {
            const colors = TYPE_COLORS[type];
            const isSelected = formData.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                className={`type-btn ${isSelected ? 'selected' : ''}`}
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  opacity: isSelected ? 1 : 0.7,
                  border: isSelected ? '3px solid #ffd700' : '2px solid rgba(0,0,0,0.2)',
                }}
                onClick={() => handleTypeToggle(type)}
                title={`${type} ${isSelected ? '✓' : ''}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Imagen */}
      <div className="form-group">
        <label className="form-label">Imagen del Pokémon *</label>
        
        {/* Opción 1: Subir archivo local */}
        <div className="image-upload">
          <label htmlFor="pokemon-image-file" className="file-input-label">
            📁 Subir Imagen Local
          </label>
          <input
            type="file"
            id="pokemon-image-file"
            className="file-input"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        {/* O */}
        <div className="form-divider">O</div>

        {/* Opción 2: URL de imagen */}
        <input
          type="url"
          id="pokemon-image-url"
          className="form-input"
          placeholder="https://ejemplo.com/imagen.png"
          value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
          onChange={handleImageUrlChange}
        />
        
        {formData.imageUrl && (
          <div className="image-preview">
            <img src={formData.imageUrl} alt="preview" />
          </div>
        )}
      </div>

      {/* Descripción */}
      <div className="form-group">
        <label htmlFor="pokemon-description" className="form-label">
          Descripción *
        </label>
        <textarea
          id="pokemon-description"
          className="form-textarea"
          placeholder="Descripción del Pokémon..."
          value={formData.description}
          onChange={handleDescriptionChange}
          rows={4}
          required
        />
      </div>

      {/* Altura y Peso */}
      <div className="form-group">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="pokemon-height" className="form-label">
              Altura (m - metros)      
            </label>
            <input
              type="number"
              id="pokemon-height"
              className="form-input"
              placeholder="ej. 1.7"
              value={formData.height ? (formData.height / 10) : ''}
              onChange={handleHeightChange}
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <label htmlFor="pokemon-weight" className="form-label">
              Peso (kg - kilogramos)
            </label>
            <input
              type="number"
              id="pokemon-weight"
              className="form-input"
              placeholder="ej. 90"
              value={formData.weight ? (formData.weight / 10) : ''}
              onChange={handleWeightChange}
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Evoluciones (opcional) */}
      <div className="form-group">
        <label htmlFor="pokemon-evolutions" className="form-label">
          Evoluciones (opcional, separadas por comas)
        </label>
        <input
          type="text"
          id="pokemon-evolutions"
          className="form-input"
          placeholder="ej. Charmeleon, Charizard"
          value={formData.evolutions?.join(', ') || ''}
          onChange={handleEvolutionsChange}
        />
        <small className="form-help">
          Ingresa los nombres o IDs de los Pokémon a los que evoluciona, separados por comas.
        </small>
      </div>

      {/* Botón de envío */}
      <button 
        type="submit" 
        className="admin-submit-btn"
        disabled={isLoading || isLoadingProp}
      >
        {isLoading || isLoadingProp ? 'Ingresando...' : 'Ingresar Pokémon'}
      </button>
    </form>
  );
}
