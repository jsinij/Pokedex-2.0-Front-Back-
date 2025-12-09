/**
 * Componente que renderiza la cabecera estilo Game Boy.
 */
export default function GameboyHeader() {
  return (
    <div className="gameboy-header">
      <div className="power-circle" />
      <div className="indicator-lights">
        <div className="light red" />
        <div className="light yellow" />
        <div className="light green" />
      </div>
    </div>
  );
}
