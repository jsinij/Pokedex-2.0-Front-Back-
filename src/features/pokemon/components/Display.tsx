import bg from '../../../assets/fondo.png';

type Props = {
  id?: number; // # en la Pokédex (opcional)
  name?: string; // nombre del pokémon (opcional)
  sprite?: string | null; // URL del sprite (puede venir null)
  loading?: boolean; // bandera de carga
  variant?: 'default' | 'missigno'; // 'missigno' solo ajusta tamaño del sprite
  backgroundImage?: string; // fondo dinámico por tipo
};

/**
 * Componente de la “pantalla” de la Pokédex.
 * - Pone una textura de fondo.
 * - Si está cargando: muestra “Loading…”.
 * - Si hay sprite: lo renderiza.
 * - Si no hay sprite: enseña un bloque placeholder.
 * - En la esquina inferior muestra el #id con formato #001, #023, etc.
 */
export default function Display({
  id,
  name,
  sprite,
  loading,
  variant = 'default',
  backgroundImage,
}: Props) {
  // Usar el fondo dinámico si viene, sino usar el por defecto
  const bgUrl = backgroundImage || bg;

  return (
    // Fondo de la pantalla: usamos la textura fija que ya tienes en assets
    <div className="display" style={{ backgroundImage: `url(${bgUrl})` }}>
      {loading ? (
        // Estado de carga sencillo
        <div className="loading">Loading…</div>
      ) : sprite ? (
        // Sprite oficial si existe; con 'missigno' lo hacemos más grande
        <img
          src={sprite}
          alt={name ?? 'pokemon'} // por si no hay nombre
          className={`sprite ${
            variant === 'missigno' ? 'sprite-missigno' : ''
          }`}
        />
      ) : (
        // Si no hay sprite, dejamos un cuadro gris para no romper el layout
        <div className="placeholder" />
      )}

      {/* Etiqueta con el ID formateado; si no viene, no mostramos nada */}
      {id ? (
        <span className="id-tag">#{String(id).padStart(3, '0')}</span>
      ) : null}
    </div>
  );
}
