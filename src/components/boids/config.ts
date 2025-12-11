import type { NavItem, ProfileConfig } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'about', title: 'About', icon: '/icons/portfolio_about.png', description: 'Learn more about me' },
  { id: 'projects', title: 'Projects', icon: '/icons/portfolio_projects.png', description: 'View my work' },
  { id: 'timeline', title: 'Timeline', icon: '/icons/portfolio_timeline.png', description: 'My journey' },
  { id: 'home', title: 'Home', icon: '/icons/portfolio_backarrow.png', description: 'Return to start' },
  { id: 'resume', title: 'Resume', icon: '/icons/portfolio_resume.png', description: 'My experience' },
  { id: 'contact', title: 'Contact', icon: '/icons/portfolio_contact.png', description: 'Get in touch' },
];

export const PROFILE_CONFIG: ProfileConfig = {
  imagePath: '/images/profile.jpg',
  name: 'Tristan',
  title: 'Developer',
  fallbackInitial: 'T',
};

