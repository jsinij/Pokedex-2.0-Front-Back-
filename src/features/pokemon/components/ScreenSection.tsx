import Display from './Display';

type Props = {
  id?: number;
  name?: string;
  sprite?: string | null;
  loading?: boolean;
  variant?: 'default' | 'missigno';
  backgroundImage?: string;
};

/**
 * Sección de la pantalla con el display y botones decorativos.
 */
export default function ScreenSection({
  id,
  name,
  sprite,
  loading,
  variant = 'default',
  backgroundImage,
}: Props) {
  return (
    <div className="screen-container">
      <Display
        id={id}
        name={name}
        sprite={sprite}
        loading={loading}
        variant={variant}
        backgroundImage={backgroundImage}
      />

      {/* dos botones decorativos bajo la pantalla */}
      <div className="screen-buttons">
        <button className="screen-btn" aria-label="screen button 1" />
        <button className="screen-btn" aria-label="screen button 2" />
      </div>

      {/* "parlante" decorativo */}
      <div className="speaker">
        <div className="speaker-line" />
        <div className="speaker-line" />
        <div className="speaker-line" />
        <div className="speaker-line" />
      </div>
    </div>
  );
}
