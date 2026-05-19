import { useRef, useEffect } from 'react'

export default function CommentaryFeed({ commentary }) {
  const feedRef = useRef(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [commentary])

  if (!commentary || commentary.length === 0) return null

  return (
    <div className="commentary-feed" ref={feedRef}>
      {commentary.map((c, i) => {
        const isOld = i < commentary.length - 6
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
