const OUTCOME_LABELS = {
  miracle: 'MIRACLE!',
  holed: 'HOLED!',
  pinseeker: 'PIN SEEKER!',
}

function formatOutcome(outcome) {
  return OUTCOME_LABELS[outcome] || (outcome ? outcome.toUpperCase() : '')
}

export default function ShotBanner({ outcome, shotCount }) {
  return (
    <div key={shotCount} className={`shot-banner shot-${outcome}`}>
      {formatOutcome(outcome)}
    </div>
  )
}
