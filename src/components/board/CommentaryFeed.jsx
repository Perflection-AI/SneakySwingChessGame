import { useRef, useEffect } from 'react'

export default function CommentaryFeed({ commentary, maxLines }) {
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [commentary])

  if (!commentary || commentary.length === 0) return null

  const entries = commentary || []
  const reversed = [...entries].reverse()
  const visible = maxLines ? reversed.slice(0, maxLines) : reversed
  const oldThreshold = maxLines ? 0 : entries.length - 6

  return (
    <div className={`commentary-feed${maxLines ? ' commentary-feed-compact' : ''}`} ref={feedRef}>
      {visible.map((c, i) => {
        const isOld = !maxLines && i >= oldThreshold
        return (
          <div key={c.id} className={`commentary-line${isOld ? ' commentary-old' : ''}`}>
            {c.stroke > 0 && <span className="commentary-stroke">#{c.stroke}</span>}
            <span className="commentary-text">{c.text}</span>
          </div>
        )
      })}
    </div>
  )
}
