import { useCallback } from 'react';

type Props = {
  input: string;
  placeholder: string;
  loading?: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onRandom: () => void;
  onInputClear: () => void;
};

/**
 * Sección de búsqueda con input, botón OK y botón Random.
 */
export default function SearchSection({
  input,
  placeholder,
  loading = false,
  onInputChange,
  onSubmit,
  onRandom,
  onInputClear,
}: Props) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      // si es solo dígitos y signo, recortamos a 5 chars, si no, dejamos tal cual
      if (/^-?\d*$/.test(v)) onInputChange(v.slice(0, 5));
      else onInputChange(v);
      // si estaba en modo Missigno, lo desactivamos al escribir
      onInputClear();
    },
    [onInputChange, onInputClear]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="search" onSubmit={handleSubmit}>
      <input
        className="search-input"
        value={input}
        onChange={handleInputChange}
        placeholder={placeholder}
        aria-label="pokemon input"
        disabled={loading}
      />
      <button
        className="ok-btn"
        type="submit"
        disabled={loading || !input.trim()}
      >
        OK
      </button>
      <button
        className="random-btn"
        type="button"
        onClick={onRandom}
        disabled={loading}
      >
        RND
      </button>
    </form>
  );
}
