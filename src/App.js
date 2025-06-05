import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from './styles/theme';
import LandingPage from './components/LandingPage';
import BugReportForm from './components/BugReportForm';
import ConfirmationPage from './components/ConfirmationPage';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.surface} 100%);
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.md};
  }
`;

function App() {
  return (
    <AppContainer>
      <MainContent>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<BugReportForm />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
        </Routes>
      </MainContent>
    </AppContainer>
  );
}

export default App; 