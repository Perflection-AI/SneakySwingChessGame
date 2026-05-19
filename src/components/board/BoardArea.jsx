import { forwardRef } from 'react'
import appConfig from '../../appConfig'

const BoardArea = forwardRef(function BoardArea({ zoom, pan, aspectRatio, fullscreen, onClick, children }, boardRef) {
  const map = appConfig.map
  const hasMap = !!(map?.imageUrl && map.imageWidth && map.imageHeight)
  const ar = aspectRatio || 1
  const style = {
    '--zoom': zoom,
    aspectRatio: `${ar} / 1`,
    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
  }
  return (
    <div
      className={`board-area${zoom > 1 ? ' zoomed' : ''}${fullscreen ? ' board-area-fullscreen' : ''}`}
      ref={boardRef}
      style={style}
      onClick={onClick}
      onWheel={undefined}
    >
      {hasMap && (
        <img
          src={map.imageUrl}
          className="board-map-img"
          draggable={false}
          alt=""
        />
      )}
      {children}
    </div>
  )
})

export default BoardArea
