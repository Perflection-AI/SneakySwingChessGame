import { useState, useEffect, useRef } from 'react'

const FRAME_DURATION = 100

// ─── Shared image cache ───
const imageCache = new Map()

function tryImg(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function discoverPhotos(dir) {
  if (imageCache.has(dir)) return imageCache.get(dir)
  const photos = []
  for (let i = 1; i <= 30; i++) {
    let found = null
    for (const ext of ['jpg', 'png']) {
      found = await tryImg(`${dir}/P_${i}.${ext}`)
      if (found) break
    }
    if (!found) break
    photos.push(found)
  }
  imageCache.set(dir, photos)
  return photos
}

export async function precachePlayers(players) {
  const dirs = [...new Set(players.map(p => p.photoDir).filter(Boolean))]
  await Promise.all(dirs.map(d => discoverPhotos(d)))
}

export default function FireAnimation({ player, onComplete }) {
  const [photos, setPhotos] = useState([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [phase, setPhase] = useState('enter') // 'enter' → 'play' → 'exit'
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const dir = player.photoDir
    if (!dir) { onComplete(); return }
    discoverPhotos(dir).then(found => {
      if (!mounted.current) return
      if (found.length === 0) { onComplete(); return }
      setPhotos(found)
      // Brief pause on first frame then start cycling
      setTimeout(() => setPhase('play'), 150)
    })
  }, [player.photoDir, onComplete])

  useEffect(() => {
    return () => { mounted.current = false }
  }, [])

  // Cycle through frames
  useEffect(() => {
    if (phase !== 'play' || photos.length === 0) return
    if (frameIdx >= photos.length) {
      setPhase('exit')
      setTimeout(() => {
        if (mounted.current) onComplete()
      }, 300)
      return
    }
    const t = setTimeout(() => setFrameIdx(f => f + 1), FRAME_DURATION)
    return () => clearTimeout(t)
  }, [frameIdx, photos.length, phase, onComplete])

  if (photos.length === 0) return null

  return (
    <div className="fire-anim">
      <div className={`fire-card fa-${phase}`} style={{ '--player-color': player.color }}>
        <div className="fa-ring">
          <div className="fa-photo-wrapper">
            <img src={photos[Math.min(frameIdx, photos.length - 1)]} alt="" className="fa-photo" />
          </div>
        </div>
        <div className="fa-label" style={{ color: player.color }}>
          <span className="fa-abbr">{player.abbr}</span>
          <span className="fa-name">{player.name}</span>
        </div>
      </div>
    </div>
  )
}
