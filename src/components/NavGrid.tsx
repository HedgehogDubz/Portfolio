import React, { useEffect, useRef } from 'react';
import { NAV_ITEMS, PROFILE_CONFIG } from './boids/config';

interface NavGridProps {
  visible: boolean;
  onNavClick: (itemId: string) => void;
}

const NavGrid: React.FC<NavGridProps> = ({ visible, onNavClick }) => {
  const navBgCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = navBgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCheckerboard = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const tileSize = 40;
      const cols = Math.ceil(width / tileSize);
      const rows = Math.ceil(height / tileSize);

      const color1 = '#0a0808';
      const color2 = '#1a0a0a';

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isEven = (row + col) % 2 === 0;
          ctx.fillStyle = isEven ? color1 : color2;
          ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
      }
    };

    drawCheckerboard();

    const handleResize = () => drawCheckerboard();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [visible]);

  return (
    <div className={`nav-grid-container ${visible ? 'visible' : ''}`}>
      <canvas ref={navBgCanvasRef} className="nav-bg-canvas" />

      <div className="nav-content-wrapper">
        <div
          className="profile-card"
          style={{ '--item-index': 0 } as React.CSSProperties}
        >
          <div className="profile-image-wrapper">
            <img
              src={PROFILE_CONFIG.imagePath}
              alt={`${PROFILE_CONFIG.name}'s profile`}
              className="profile-image"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233d3934" width="100" height="100"/><text x="50" y="60" text-anchor="middle" fill="%23E8D4A0" font-size="50" font-family="monospace">${PROFILE_CONFIG.fallbackInitial}</text></svg>`;
              }}
            />
          </div>
          <div className="profile-info">
            <span className="profile-name">{PROFILE_CONFIG.name}</span>
            <span className="profile-title">{PROFILE_CONFIG.title}</span>
          </div>
        </div>

        <div className="nav-grid">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.id}
              className="nav-grid-item"
              style={{ '--item-index': index } as React.CSSProperties}
              onClick={() => onNavClick(item.id)}
              aria-label={item.description || item.title}
            >
              <div className="nav-icon-wrapper">
                <img
                  src={item.icon}
                  alt={item.title}
                  className="nav-icon-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%233d3934" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23E8D4A0" font-size="40">${item.title.charAt(0)}</text></svg>`;
                  }}
                />
              </div>
              <span className="nav-icon-title">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavGrid;

