import './MappingToolbar.css'

export default function MappingToolbar({ hasImage, hasPoints, onOpenImage, onOpenJSON, onSave, onClear }) {
  return (
    <div className="map-toolbar">
      <button className="map-toolbar-btn" onClick={onOpenImage}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
        </svg>
        Image
      </button>
      <button className="map-toolbar-btn" onClick={onOpenJSON}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
        </svg>
        Load
      </button>
      <button className="map-toolbar-btn" disabled={!hasPoints} onClick={onSave}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
        </svg>
        Save
      </button>
      <button className="map-toolbar-btn map-toolbar-btn-danger" disabled={!hasPoints} onClick={onClear}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        </svg>
        Clear
      </button>
    </div>
  )
}
