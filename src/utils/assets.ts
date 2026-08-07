export function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (/^(?:https?:|data:|blob:)/i.test(url)) return url
  return `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`
}
