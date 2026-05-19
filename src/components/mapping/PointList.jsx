import './PointList.css'

export default function PointList({ points, selectedId, onSelect, onDelete, onReorder }) {
  if (points.length === 0) return null

  return (
    <div className="map-point-list">
      {points.map((p, i) => (
        <div
          key={p.id}
          className={`map-pl-row${selectedId === p.id ? ' map-pl-row-selected' : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <span className="map-pl-idx">{i + 1}</span>
          <span className="map-pl-coords">
            <span className="map-pl-uv">UV({p.uv.u.toFixed(3)}, {p.uv.v.toFixed(3)})</span>
            <span className="map-pl-px">px({Math.round(p.px.x)}, {Math.round(p.px.y)})</span>
          </span>
          <div className="map-pl-actions">
            <button
              className="map-pl-action-btn"
              disabled={i === 0}
              onClick={(e) => { e.stopPropagation(); onReorder(p.id, -1) }}
              title="Move up"
            >&#9650;</button>
            <button
              className="map-pl-action-btn"
              disabled={i === points.length - 1}
              onClick={(e) => { e.stopPropagation(); onReorder(p.id, 1) }}
              title="Move down"
            >&#9660;</button>
            <button
              className="map-pl-action-btn map-pl-action-del"
              onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
              title="Delete"
            >&#10005;</button>
          </div>
        </div>
      ))}
    </div>
  )
}
