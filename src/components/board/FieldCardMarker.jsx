export default function FieldCardMarker({ fc, ydToPct, acquireRadiusYd }) {
  const radiusPct = acquireRadiusYd * ydToPct

  if (fc.acquired) {
    return (
      <div
        className="field-card field-card--acquired"
        style={{ left: `${fc.x}%`, top: `${fc.y}%` }}
      >
        <div className="field-card-acquire-ring" />
      </div>
    )
  }

  return (
    <div
      className="field-card"
      style={{ left: `${fc.x}%`, top: `${fc.y}%` }}
    >
      <div
        className="field-card-radius"
        style={{
          width: `${radiusPct * 2}%`,
          height: `${radiusPct * 2}%`,
        }}
      />
      <div className="field-card-question">?</div>
    </div>
  )
}
