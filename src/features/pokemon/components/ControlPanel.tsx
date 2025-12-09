type Props = {
  onClear: () => void;
  onStepUp: () => void;
  onStepDown: () => void;
  onStepLeft: () => void;
  onStepRight: () => void;
  onSubmit: () => void;
  loading?: boolean;
  inputEmpty?: boolean;
};

/**
 * Panel de controles: D-pad y botones A/B.
 */
export default function ControlPanel({
  onClear,
  onStepUp,
  onStepDown,
  onStepLeft,
  onStepRight,
  onSubmit,
  loading = false,
  inputEmpty = true,
}: Props) {
  return (
    <div className="controls">
      <div className="dpad">
        <button
          className="dpad-btn dpad-up"
          aria-label="up"
          onClick={onStepUp}
          disabled={loading}
          title="Random"
        />
        <button
          className="dpad-btn dpad-down"
          aria-label="down"
          onClick={onStepDown}
          disabled={loading}
          title="Clear"
        />
        <button
          className="dpad-btn dpad-left"
          aria-label="left"
          onClick={onStepLeft}
          disabled={loading}
          title="Previous ID"
        />
        <button
          className="dpad-btn dpad-right"
          aria-label="right"
          onClick={onStepRight}
          disabled={loading}
          title="Next ID"
        />
        <div className="dpad-center" />
      </div>

      <div className="action-buttons">
        <button
          className="action-btn btn-b"
          onClick={onClear}
          disabled={loading}
          title="Clear (B)"
        >
          B
        </button>
        <button
          className="action-btn btn-a"
          onClick={onSubmit}
          disabled={loading || inputEmpty}
          title="Search (A)"
        >
          A
        </button>
      </div>
    </div>
  );
}
