import { useState, useRef } from 'react';

/**
 * Custom hook for handling swipe gestures
 * @param {Function} onSwipeLeft - Callback for left swipe
 * @param {Function} onSwipeRight - Callback for right swipe
 * @param {number} threshold - Minimum distance for swipe (default: 50px)
 * @returns {Object} Touch event handlers
 */
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const touchStartRef = useRef(null);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const onTouchMove = (e) => {
    const touch = e.targetTouches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const touchEndData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = touchEndData.x - touchStartRef.current.x;
    const deltaY = touchEndData.y - touchStartRef.current.y;
    const deltaTime = touchEndData.time - touchStartRef.current.time;

    // Check if it's a valid swipe (horizontal movement > vertical movement)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isQuickSwipe = deltaTime < 500; // Less than 500ms
    const isLongEnough = Math.abs(deltaX) > threshold;

    if (isHorizontalSwipe && isQuickSwipe && isLongEnough) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }

    // Reset
    setTouchStart(null);
    setTouchEnd(null);
    touchStartRef.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

/**
 * Custom hook for handling long press gestures
 * @param {Function} onLongPress - Callback for long press
 * @param {number} delay - Long press delay in ms (default: 500ms)
 * @returns {Object} Touch event handlers
 */
export const useLongPress = (onLongPress, delay = 500) => {
  const timeoutRef = useRef(null);
  const isLongPress = useRef(false);

  const start = (e) => {
    isLongPress.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress?.(e);
    }, delay);
  };

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clickHandler = (e) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onClick: clickHandler
  };
};

export default useSwipeGesture;