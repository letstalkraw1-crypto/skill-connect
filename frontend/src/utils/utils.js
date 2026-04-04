import { format, formatDistanceToNow } from 'date-fns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Normalizes and prefixes an asset path with the backend base URL.
 * Falls back to a default logo if path is missing.
 */
export const getAssetUrl = (path) => {
  if (!path) return '/logo.png';
  if (path.startsWith('http')) return path;
  
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
