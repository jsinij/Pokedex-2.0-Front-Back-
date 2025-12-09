import './type.css';

/** Chip de tipo: solo muestra el nombre capitalizado y aplica el color. */
const cap = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);

export default function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`type-badge type-${type}`} title={cap(type)}>
      {cap(type)}
    </span>
  );
}
