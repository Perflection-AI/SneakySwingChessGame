const cache = new Map()
const thumbCache = new Map()

function tryImg(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function discoverPhotos(dir) {
  if (cache.has(dir)) return cache.get(dir)
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
  cache.set(dir, photos)
  return photos
}

export async function discoverThumbnails(dir) {
  if (thumbCache.has(dir)) return thumbCache.get(dir)
  const photos = []
  for (let i = 1; i <= 30; i++) {
    let found = null
    for (const ext of ['webp', 'png']) {
      found = await tryImg(`${dir}/P_${i}_t.${ext}`)
      if (found) break
    }
    if (!found) break
    photos.push(found)
  }
  thumbCache.set(dir, photos)
  return photos
}

const PRELOAD_DIRS = [
  '/mock-record/opponents/marcus',
  '/mock-record/opponents/sofia',
  '/mock-record/opponents/david',
  '/mock-record/day-1',
]

let preloaded = false

export function preloadAllPhotos() {
  if (preloaded) return
  preloaded = true
  Promise.all(PRELOAD_DIRS.map(d => discoverPhotos(d)))
  Promise.all(PRELOAD_DIRS.map(d => discoverThumbnails(d)))
}
