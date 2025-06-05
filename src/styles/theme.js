export const theme = {
  colors: {
    // Primary brand colors inspired by Wuthering Waves
    primary: '#4A9EFF', // Bright blue for CTAs
    primaryDark: '#2E7BD6',
    primaryLight: '#6BB2FF',
    
    // Secondary colors
    secondary: '#9D4EDD', // Purple accent
    secondaryDark: '#7B2CBF',
    
    // Background colors
    background: '#0F0F23', // Very dark blue-black
    surface: '#1A1A2E', // Dark blue-gray
    surfaceLight: '#25253B',
    
    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#B8B8C8',
    textMuted: '#8B8B9A',
    
    // Status colors
    success: '#00D084',
    error: '#FF4757',
    warning: '#FFD93D',
    
    // Border colors
    border: '#2A2A3E',
    borderLight: '#3A3A4E',
    
    // Overlay colors
    overlay: 'rgba(15, 15, 35, 0.8)',
  },
  
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.2)',
    md: '0 4px 8px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.2)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.25)',
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
}; 