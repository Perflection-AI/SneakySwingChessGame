export default function GameControls({ primaryStatus, onStart, onPause, onReset }) {
  return (
    <div className="board-controls">
      {primaryStatus !== 'run' && (
        <button className="control-btn control-start" onClick={primaryStatus === 'pause' ? onPause : onStart}>
          {primaryStatus === 'pause' ? 'Resume' : 'Start'}
        </button>
      )}
      {primaryStatus === 'run' && (
        <button className="control-btn control-pause" onClick={onPause}>Pause</button>
      )}
      {primaryStatus !== 'off' && (
        <button className="control-btn control-stop" onClick={onReset}>Reset</button>
      )}
    </div>
  )
}
