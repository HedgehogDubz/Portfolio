import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <button className="hedgehog-button" aria-label="Hedgehog menu">
          <svg
            className="hedgehog-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hedgehog icon - simplified cute hedgehog */}
            <circle cx="12" cy="12" r="8" fill="#8B4513" />
            {/* Spikes */}
            <path d="M12 4 L13 6 L12 8" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 5 L8.5 7 L8 9" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 5 L15.5 7 L16 9" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 8 L6.5 10 L6 12" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M18 8 L17.5 10 L18 12" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 12 L5.5 14 L5 16" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M19 12 L18.5 14 L19 16" stroke="#654321" strokeWidth="1.5" strokeLinecap="round" />
            {/* Face */}
            <circle cx="10" cy="11" r="1" fill="#000" />
            <circle cx="14" cy="11" r="1" fill="#000" />
            <path d="M10 14 Q12 15 14 14" stroke="#000" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* Nose */}
            <circle cx="12" cy="13" r="0.8" fill="#000" />
          </svg>
        </button>

        <nav className="header-nav">
          <button className="nav-link" onClick={() => scrollToSection('about')}>
            About
          </button>
          <button className="nav-link" onClick={() => scrollToSection('projects')}>
            Projects
          </button>
          <button className="nav-link" onClick={() => scrollToSection('contact')}>
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

