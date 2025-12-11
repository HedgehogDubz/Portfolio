import React, { useEffect, useRef, useState } from 'react';
import './BoidsCanvas.css';
import Header from './Header';
import NavGrid from './NavGrid';
import { useFloatingPoints } from './floating/FloatingPointsSimulation';

const BoidsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef<boolean>(false);
  const [isFadedOut, setIsFadedOut] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [, setActiveSection] = useState<string | null>(null);

  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const [displayedName, setDisplayedName] = useState('');

  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Set greeting text immediately
  useEffect(() => {
    const greetingText = "Hi! I'm";
    const nameText = "Tristan Winata";

    setDisplayedGreeting(greetingText);
    setDisplayedName(nameText);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isInExclusionZone = (x: number, y: number): boolean => {
      const header = document.querySelector('.header');
      if (header) {
        const headerRect = header.getBoundingClientRect();
        if (x >= headerRect.left && x <= headerRect.right &&
            y >= headerRect.top && y <= headerRect.bottom) {
          return true;
        }
      }

      // Check all retro windows (portrait, welcome, continue)
      const retroWindows = document.querySelectorAll('.retro-window');
      for (const retroWindow of retroWindows) {
        const windowRect = retroWindow.getBoundingClientRect();
        if (x >= windowRect.left && x <= windowRect.right &&
            y >= windowRect.top && y <= windowRect.bottom) {
          return true;
        }
      }

      const attribution = document.querySelector('.attribution-link');
      if (attribution) {
        const attrRect = attribution.getBoundingClientRect();
        if (x >= attrRect.left && x <= attrRect.right &&
            y >= attrRect.top && y <= attrRect.bottom) {
          return true;
        }
      }

      return false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isFadedOut) {
        isMouseActiveRef.current = false;
        mousePositionRef.current = null;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isInExclusionZone(e.clientX, e.clientY)) {
        isMouseActiveRef.current = false;
        mousePositionRef.current = null;
      } else {
        isMouseActiveRef.current = true;
        mousePositionRef.current = { x, y };
      }
    };

    const handleMouseLeave = () => {
      isMouseActiveRef.current = false;
      mousePositionRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isFadedOut]);

  // Floating points animation
  useFloatingPoints({
    canvasRef,
    isPausedRef,
    mousePositionRef,
    isMouseActiveRef,
  });

  const triggerFadeOut = () => {
    if (!isFadedOut) {
      setIsFadedOut(true);
      setShowNavGrid(true);
      setTimeout(() => setIsPaused(true), 300);
    }
  };

  const returnToHome = () => {
    setIsPaused(false);
    setIsFadedOut(false);
    setActiveSection(null);
    setTimeout(() => setShowNavGrid(false), 400);
  };

  const handleNavClick = (itemId: string) => {
    if (itemId === 'home') {
      returnToHome();
    } else {
      setActiveSection(itemId);
      console.log(`Navigate to: ${itemId}`);
    }
  };

  return (
    <>
      <div className="crt-monitor-frame">
        <div className="bevel-top"></div>
        <div className="bevel-bottom"></div>
        <div className="inner-bevel-frame">
          <div className="inner-bevel-top"></div>
          <div className="inner-bevel-bottom"></div>
        </div>
        <div className="crt-brand-label">Porky Device 088</div>
      </div>

      <div
        ref={containerRef}
        className={`boids-container ${isFadedOut ? 'faded-out' : ''}`}
      >
        <Header />
        <canvas ref={canvasRef} className="boids-canvas" />

        {/* Windows container for layout */}
        <div className="windows-container">
          {/* Left column: Welcome + Continue */}
          <div className="windows-column">
            {/* Welcome Window */}
            <div className="retro-window welcome-window">
              <div className="window-title-bar">
                <div className="window-title">WELCOME.SYS</div>
                <div className="window-controls">
                  <div className="window-button minimize">_</div>
                  <div className="window-button maximize">□</div>
                  <div className="window-button close">×</div>
                </div>
              </div>
              <div className="window-content">
                <div className="terminal-line">
                  <span className="header-greeting">{displayedGreeting}</span>
                </div>
                <div className="terminal-line">
                  <span className="header-name">{displayedName}</span>
                </div>
                <div className="terminal-line continue-prompt">
                  <span className="prompt-text">Press continue to proceed...</span>
                </div>
              </div>
            </div>

            {/* Continue Button Window */}
            <div className="retro-window continue-window">
              <div className="window-title-bar">
                <div className="window-title">CONTINUE.EXE</div>
                <div className="window-controls">
                  <div className="window-button minimize">_</div>
                  <div className="window-button maximize">□</div>
                  <div className="window-button close">×</div>
                </div>
              </div>
              <div className="window-content continue-content">
                <button
                  className="retro-continue-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFadeOut();
                  }}
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>

          {/* Portrait Window */}
          <div className="retro-window portrait-window">
            <div className="window-title-bar">
              <div className="window-title">PORTRAIT.JPG</div>
              <div className="window-controls">
                <div className="window-button minimize">_</div>
                <div className="window-button maximize">□</div>
                <div className="window-button close">×</div>
              </div>
            </div>
            <div className="window-content portrait-content">
              <img src="/portrait.jpg" alt="Portrait" className="portrait-image" />
            </div>
          </div>
        </div>
      </div>

      <NavGrid visible={showNavGrid} onNavClick={handleNavClick} />
    </>
  );
};

export default BoidsCanvas;
