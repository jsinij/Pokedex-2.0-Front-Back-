
type Props = {
  onDigit: (d: number) => void;
  onClear: () => void;
  onSearch: () => void;
};

/**
 * Teclado numérico simple: 0–9 y dos botones (Clear / Search).
 * Usa utilidades de Bootstrap para separar un poco.
 */
export default function Keypad({ onDigit, onClear, onSearch }: Props) {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="keypad">
      {/* Grid 5x2 para los dígitos */}
      <div className="grid d-grid gap-1">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            className="key"
            onClick={() => onDigit(d)}
            aria-label={`digit ${d}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Acciones alineadas al grid */}
      <div
        className="keypad-actions d-grid gap-1"
        style={{ gridTemplateColumns: '1fr 1fr' }}
      >
        <button
          type="button"
          className="key alt"
          onClick={onClear}
          aria-label="clear"
        >
          Clear
        </button>
        <button
          type="button"
          className="key primary"
          onClick={onSearch}
          aria-label="search"
        >
          Search
        </button>
      </div>
    </div>
  );
}
