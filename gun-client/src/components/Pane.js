import React, { useState, useRef, useEffect } from 'react';
import { paneConfig } from '../paneConfig';

function Pane({ title, children, isMaximized, onMaximize, onClose, onMinimize, onFocus, zIndex, type, savedSize, onSizeChange, initialPosition, onPositionChange, isActive }) {
  const paneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitialized = useRef(false);

  const config = paneConfig[type] || {};
  const defaultSize = config.defaultSize || (type === 'conversation' ? { width: 450, height: 400 } : { width: 450, height: 500 });
  const minSize = config.minSize || (type === 'conversation' ? { width: 450, height: 350 } : { width: 250, height: 200 });

  const [size, setSize] = useState(savedSize || defaultSize);
  const [position, setPosition] = useState(initialPosition || { left: 100, top: 50 });

  useEffect(() => {
    if (savedSize) {
      setSize(savedSize);
    }
  }, [savedSize]);

  useEffect(() => {
    if (!hasInitialized.current && initialPosition) {
      setPosition(initialPosition);
      hasInitialized.current = true;
    }
  }, [initialPosition]);

  useEffect(() => () => {
    hasInitialized.current = false;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxLeft = Math.max(0, window.innerWidth - 100);
        const maxTop = Math.max(0, window.innerHeight - 100);
        const newLeft = Math.min(prev.left, maxLeft);
        const newTop = Math.min(prev.top, maxTop);
        if (newLeft !== prev.left || newTop !== prev.top) {
          const clamped = { left: Math.max(0, newLeft), top: Math.max(0, newTop) };
          if (onPositionChange) onPositionChange(clamped);
          return clamped;
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onPositionChange]);

  const handleMouseDown = (e) => {
    if (onFocus) onFocus();
    if (e.target.closest('.pane-controls')) return;

    if (e.detail === 2) {
      onMaximize();
      return;
    }

    if (isMaximized) return;

    const pane = paneRef.current;
    const rect = pane.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (moveEvent) => {
      setIsDragging(true);
      let newX = moveEvent.clientX - offsetX;
      let newY = moveEvent.clientY - offsetY;
      if (newY < 0) newY = 0;

      const newPosition = { left: newX, top: newY };
      setPosition(newPosition);

      pane.style.left = `${newX}px`;
      pane.style.top = `${newY}px`;
      pane.style.transform = 'none';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onPositionChange) {
        const frameRect = pane.getBoundingClientRect();
        onPositionChange({ left: frameRect.left, top: frameRect.top });
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startResizing = (direction) => (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();
    const startWidth = size.width;
    const startHeight = size.height;
    const startX = mouseDownEvent.pageX;
    const startY = mouseDownEvent.pageY;

    const onMouseMove = (mouseMoveEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;
      if (direction.includes('e')) newWidth = Math.max(minSize.width, startWidth + (mouseMoveEvent.pageX - startX));
      if (direction.includes('s')) newHeight = Math.max(minSize.height, startHeight + (mouseMoveEvent.pageY - startY));
      const newSize = { width: newWidth, height: newHeight };
      setSize(newSize);
      if (onSizeChange) onSizeChange(newSize);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const isInactive = isActive === false;

  return (
    <div
      ref={paneRef}
      className={`pane-frame type-${type} ${isMaximized ? 'pane-frame--maximized' : ''} ${isDragging ? 'pane-frame--dragging' : ''}`}
      data-active={isInactive ? 'false' : 'true'}
      data-window-state={isMaximized ? 'maximized' : 'normal'}
      style={{
        left: isMaximized ? 0 : position.left,
        top: isMaximized ? 0 : position.top,
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? 'calc(100vh - 30px)' : size.height,
        zIndex,
        position: isMaximized ? 'fixed' : 'absolute',
        transform: 'none'
      }}
      onMouseDown={() => onFocus && onFocus()}
    >
      <div className="pane-inner-container">
        <div
          className={`pane-header ${isInactive ? 'pane-header--inactive' : ''}`}
          data-active={isInactive ? 'false' : 'true'}
          onMouseDown={handleMouseDown}
        >
          <div className="pane-title-section">
            <span className="pane-icon" aria-hidden="true" />
            <span className="pane-title">{title}</span>
          </div>
          <div className="pane-controls">
            <button
              type="button"
              className="pane-btn pane-btn--minimize"
              data-active={isInactive ? 'false' : 'true'}
              onClick={onMinimize}
              aria-label="Minimaliseren"
              title="Minimaliseren"
            >
              <span className="pane-btn-glyph pane-btn-glyph--minimize" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="pane-btn pane-btn--maximize"
              data-active={isInactive ? 'false' : 'true'}
              data-maximized={isMaximized ? 'true' : 'false'}
              onClick={onMaximize}
              aria-label={isMaximized ? 'Herstellen' : 'Maximaliseren'}
              title={isMaximized ? 'Herstellen' : 'Maximaliseren'}
            >
              <span
                className={`pane-btn-glyph ${isMaximized ? 'pane-btn-glyph--restore' : 'pane-btn-glyph--maximize'}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="pane-btn pane-btn--close"
              data-active={isInactive ? 'false' : 'true'}
              onClick={onClose}
              aria-label="Sluiten"
              title="Sluiten"
            >
              <span className="pane-btn-glyph pane-btn-glyph--close" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="pane-content">{children}</div>
      </div>
      {!isMaximized && type !== 'login' && (
        <>
          <div className="resizer-e" onMouseDown={startResizing('e')} />
          <div className="resizer-s" onMouseDown={startResizing('s')} />
          <div className="resizer-se" onMouseDown={startResizing('se')} />
        </>
      )}
    </div>
  );
}

export default Pane;
