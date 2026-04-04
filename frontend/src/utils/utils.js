import { format, formatDistanceToNow } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Normalizes and prefixes an asset path with the backend base URL.
 * Falls back to a default logo if path is missing.
 */
export const getAssetUrl = (path, name) => {
  if (!path) return getInitialsAvatar(name);
  if (path.startsWith('http')) return path;
  if (path.startsWith('data:image')) return path;
  
  // Clean up leading slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Safely formats a date using date-fns, falling back to a default string if invalid.
 */
export const safeFormat = (date, pattern = 'h:mm a') => {
  if (!date) return 'Just now';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    return format(d, pattern);
  } catch (e) {
    return 'Recently';
  }
};

/**
 * Safely formats a distance to now using date-fns.
 */
export const safeDistanceToNow = (date) => {
  if (!date) return 'recently';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return 'recently';
  }
};

/**
 * Returns a high-contrast SVG data URI for a user's initials.
 */
export const getInitialsAvatar = (name = 'User') => {
  const [first, ...rest] = name.split(' ');
  const initials = `${first?.charAt(0) || ''}${rest.length ? rest[rest.length - 1].charAt(0) : ''}`.toUpperCase() || 'SC';
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  const color = colors[initials.charCodeAt(0) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${color}" opacity="0.2"/>
    <text x="50" y="50" dy=".35em" fill="${color}" font-family="Inter,sans-serif" font-weight="900" font-size="40" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
