/**
 * Resolves an image or media path.
 * If the path starts with 'uploads/', it prefixes it with the API base URL.
 * Otherwise, it returns the path as-is (for external URLs or base64).
 */
export const resolveUrl = (path) => {
  if (!path) return '/default-avatar.png'; // Fallback
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  if (path.startsWith('uploads/') || path.startsWith('/uploads/')) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    // In production, this might be a full URL. In dev, it's relative to the proxy.
    return `/${cleanPath}`;
  }
  return path;
};
