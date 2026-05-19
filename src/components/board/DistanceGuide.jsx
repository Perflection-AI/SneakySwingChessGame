export default function DistanceGuide({ activePos, holePos, isClutch, clutchRadius }) {
  return (
    <svg className="distance-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        x1={activePos.x} y1={activePos.y}
        x2={holePos.x} y2={holePos.y}
        stroke={isClutch ? '#719342' : '#CDCDCD'}
        strokeWidth="0.15"
        strokeDasharray="0.8,0.5"
        opacity={0.4}
      />
      <circle
        cx={holePos.x} cy={holePos.y}
        r={clutchRadius}
        fill={isClutch ? 'rgba(113,147,65,0.06)' : 'none'}
        stroke={isClutch ? '#719342' : '#CDCDCD'}
        strokeWidth="0.12"
        strokeDasharray="0.5,0.5"
        opacity={isClutch ? 0.5 : 0.25}
      />
    </svg>
  )
}
