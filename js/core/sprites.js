// Shared sprite cache to avoid repeated Image() requests.
const CACHE = new Map();

export function getSprite(src) {
  if (!src) return { img: null, loaded: false };
  const cached = CACHE.get(src);
  if (cached) return cached;

  const img = new Image();
  const ref = { img, loaded: false };
  img.onload = () => { ref.loaded = true; };
  img.onerror = () => { ref.loaded = false; };
  img.src = src;
  CACHE.set(src, ref);
  return ref;
}
