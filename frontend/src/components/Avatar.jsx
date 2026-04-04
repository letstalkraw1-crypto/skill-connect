import React, { useState, useEffect } from 'react';
import { getAssetUrl, getInitialsAvatar } from '../utils/utils';

/**
 * Avatar component that handles broken image URLs by falling back to auto-generated initials.
 * @param {string} src - The image URL or path.
 * @param {string} name - The user's name for initials generation.
 * @param {string} size - Tailwind height/width value (e.g. "10").
 * @param {string} className - Optional extra classes for the container.
 * @param {string} imgClassName - Optional extra classes for the img tag.
 * @param {string} loading - Image loading strategy ("lazy" or "eager").
 */
const Avatar = ({ src, name = 'User', size = '10', className = '', imgClassName = '', loading = 'lazy' }) => {
  const [imgSrc, setImgSrc] = useState(getAssetUrl(src, name));
  const [hasError, setHasError] = useState(false);

  // Update image source if props change
  useEffect(() => {
    setImgSrc(getAssetUrl(src, name));
    setHasError(false);
  }, [src, name]);

  const handleError = () => {
    // Only try falling back once to avoid infinite loops if initials also fail (unlikely)
    if (!hasError) {
      setImgSrc(getInitialsAvatar(name));
      setHasError(true);
    }
  };

  // Common sizes to ensure tailwind picks them up if using JIT
  const sizeClasses = {
    '4': 'h-4 w-4',
    '6': 'h-6 w-6',
    '8': 'h-8 w-8',
    '10': 'h-10 w-10',
    '12': 'h-12 w-12',
    '14': 'h-14 w-14',
    '16': 'h-16 w-16',
    '20': 'h-20 w-20',
    '32': 'h-32 w-32',
    '40': 'h-40 w-40'
  };

  const currentSizeClass = sizeClasses[size] || '';
  const inlineStyle = !currentSizeClass ? { height: `${size * 0.25}rem`, width: `${size * 0.25}rem` } : {};

  return (
    <div 
      className={`flex-shrink-0 rounded-xl overflow-hidden bg-accent border border-border/50 ${currentSizeClass} ${className}`}
      style={inlineStyle}
    >
      <img
        src={imgSrc}
        alt={name}
        loading={loading}
        className={`h-full w-full object-cover transition-opacity duration-300 ${imgClassName} ${hasError ? 'opacity-90' : 'opacity-100'}`}
        onError={handleError}
      />
    </div>
  );
};

export default Avatar;
