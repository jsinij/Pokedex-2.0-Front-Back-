import TypeBadge from './TypeBadge';

type Props = {
  name?: string;
  types?: string[];
  heightM?: number | null;
  weightKg?: number | null;
  flavor?: string | undefined;
  error?: string | null;
};

const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '');

/**
 * Panel informativo: nombre + tipos + altura/peso + descripción.
 * Si llega un error, lo muestra en un panel rojo arriba.
 */
export default function PanelInfo({
  name,
  types,
  heightM,
  weightKg,
  flavor,
  error,
}: Props) {
  if (error) {
    return (
      <div className="panel error" role="alert">
        ⚠ {error}
      </div>
    );
  }

  const heightText =
    heightM == null || Number.isNaN(heightM)
      ? '???'
      : `${heightM.toFixed(1)} m`;
  const weightText =
    weightKg == null || Number.isNaN(weightKg)
      ? '???'
      : `${weightKg.toFixed(1)} kg`;

  return (
    <div className="panel">
      <div className="name-row">
        <strong className="name">{cap(name)}</strong>
        <div className="types">
          {types?.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div className="stats">
        <span>Height: {heightText}</span>
        <span>Weight: {weightText}</span>
      </div>

      <textarea
        className="flavor"
        readOnly
        value={flavor ?? ''}
        aria-label="Pokédex entry"
      />
    </div>
  );
}
