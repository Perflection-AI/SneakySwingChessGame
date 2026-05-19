const OUTCOME_LABELS = {
  miracle: 'MIRACLE!',
  holed: 'HOLED!',
  pinseeker: 'PIN SEEKER!',
}

function formatOutcome(outcome) {
  return OUTCOME_LABELS[outcome] || (outcome ? outcome.toUpperCase() : '')
}

export default function BroadcastTicker({ holeNumber, currentPar, activePlayer, lastOutcome }) {
  return (
    <div className="broadcast-ticker">
      <span className="bp-live"><span className="bp-live-dot" />LIVE</span>
      <span className="bp-sep" />
      <span className="bp-info">Hole {holeNumber}<span className="bp-dim">/18</span> · Par {currentPar}</span>
      <span className="bp-sep" />
      <span className="bp-active">
        <span className="bp-active-dot" style={{ background: activePlayer.color }} />
        {activePlayer.name.split(' ')[0]}
      </span>
      {lastOutcome && (
        <span className={`bp-outcome bp-out-${lastOutcome}`}>
          {formatOutcome(lastOutcome)}
        </span>
      )}
    </div>
  )
}
