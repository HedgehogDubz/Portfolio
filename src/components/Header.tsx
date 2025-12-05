import React from 'react';
import './Header.css';
import hedgehogIcon from '../assets/images/HedgehogIcon.png';
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
          <img src={hedgehogIcon} alt="Hedgehog" className="hedgehog-icon" />
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

