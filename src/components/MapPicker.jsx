import { useState, useEffect } from 'react'
import './MapPicker.css'

const MAP_NAMES = { map_1: "CMU Campus", map_2: "The White House", map_3: "World", map_4: "Strait of Hormuz" }

function MapCard({ map, isSelected, isDimmed, onToggle }) {
  const holes = map.pointCount - 1
  const label = MAP_NAMES[map.id] || map.id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div
      className={`mp-card${isSelected ? ' mp-card-selected' : ''}${isDimmed ? ' mp-card-dimmed' : ''}`}
      onClick={() => onToggle(map.id)}
    >
      <div className="mp-card-preview">
        <img
          className="mp-card-img"
          src={`/map/${map.id}/map.png`}
          alt={label}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div className="mp-card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
      </div>
      <div className="mp-card-info">
        <span className="mp-card-name">{label}</span>
        <span className="mp-card-holes">{holes} holes</span>
      </div>
      <div className={`mp-card-check${isSelected ? ' mp-card-check-on' : ''}`}>
        {isSelected ? '✓' : ''}
      </div>
    </div>
  )
}

export default function MapPicker({ discoveredMaps, selectedMapIds, onToggleMap, onConfirm, onSkip, loading }) {
  const hasMaps = discoveredMaps.length > 0
  const hasSelection = selectedMapIds.length > 0

  return (
    <div className="mp-container">
      <div className="mp-header">
        <h2 className="mp-title">Select Course</h2>
        <span className="mp-subtitle">Choose a course map, or skip for random holes</span>
      </div>

      <div className="mp-grid">
        {loading ? (
          <div className="mp-empty">
            <span className="mp-empty-text">Discovering courses...</span>
          </div>
        ) : !hasMaps ? (
          <div className="mp-empty">
            <span className="mp-empty-text">No course maps found</span>
            <span className="mp-empty-sub">Add maps to /public/map/ to see them here</span>
          </div>
        ) : (
          discoveredMaps.map(m => (
            <MapCard
              key={m.id}
              map={m}
              isSelected={selectedMapIds.includes(m.id)}
              isDimmed={hasSelection && !selectedMapIds.includes(m.id)}
              onToggle={onToggleMap}
            />
          ))
        )}
      </div>

      <div className="mp-footer">
        <button className="mp-skip-btn" onClick={onSkip}>
          Skip
        </button>
        <button
          className="mp-start-btn"
          disabled={!hasSelection}
          onClick={onConfirm}
        >
          {hasSelection ? 'Go Next' : 'Select a Course'}
        </button>
      </div>
    </div>
  )
}
