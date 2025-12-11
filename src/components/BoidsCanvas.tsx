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
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [displayedPrompt, setDisplayedPrompt] = useState('');

  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseActiveRef = useRef<boolean>(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Typewriter effect
  useEffect(() => {
    const greetingText = "Hi! I'm";
    const nameText = "Tristan Winata";
    const promptText = "> Click or Scroll to continue";

    setDisplayedGreeting(greetingText);
    setDisplayedName(nameText);
    setShowContinuePrompt(true);
    setDisplayedPrompt(">");

    setTimeout(() => {
      let promptIndex = 1;
      const promptInterval = setInterval(() => {
        if (promptIndex <= promptText.length) {
          setDisplayedPrompt(promptText.slice(0, promptIndex));
          promptIndex++;
        } else {
          clearInterval(promptInterval);
        }
      }, 50);
    }, 1000);
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

      const retroWindow = document.querySelector('.retro-window');
      if (retroWindow) {
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
        onClick={triggerFadeOut}
        style={{ cursor: isFadedOut ? 'default' : 'pointer' }}
      >
        <Header />
        <canvas ref={canvasRef} className="boids-canvas" />

        <div className="retro-window">
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
            {showContinuePrompt && (
              <div className="terminal-line continue-prompt">
                <span className="terminal-continue">
                  {displayedPrompt}
                  <span className="blinking-cursor">_</span>
                </span>
              </div>
            )}
          </div>
        </div>


      </div>

      <NavGrid visible={showNavGrid} onNavClick={handleNavClick} />
    </>
  );
};

export default BoidsCanvas;
