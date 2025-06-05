import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';

const Container = styled.div`
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: fadeIn 0.6s ease-out;
`;

const Title = styled.h1`
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryLight} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: ${theme.spacing.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize['2xl']};
    margin-bottom: ${theme.spacing.md};
  }
`;

const Description = styled.div`
  margin-bottom: ${theme.spacing['2xl']};
  
  p {
    font-size: ${theme.typography.fontSize.lg};
    line-height: ${theme.typography.lineHeight.relaxed};
    margin-bottom: ${theme.spacing.lg};
    
    @media (max-width: ${theme.breakpoints.sm}) {
      font-size: ${theme.typography.fontSize.base};
      margin-bottom: ${theme.spacing.md};
    }
  }
`;

const CTAButton = styled.button`
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  padding: ${theme.spacing.lg} ${theme.spacing['2xl']};
  border-radius: ${theme.borderRadius.xl};
  box-shadow: ${theme.shadows.lg};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.xl};
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize.base};
    padding: ${theme.spacing.md} ${theme.spacing.xl};
  }
`;

const FeatureList = styled.div`
  margin-top: ${theme.spacing['2xl']};
  padding-top: ${theme.spacing.xl};
  border-top: 1px solid ${theme.colors.border};
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textMuted};
  
  &::before {
    content: '✓';
    color: ${theme.colors.success};
    font-weight: ${theme.typography.fontWeight.bold};
    margin-right: ${theme.spacing.sm};
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize.xs};
  }
`;

function LandingPage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/report');
  };

  return (
    <Container className="fade-in">
      <Title>Report a Wuthering Waves Bug</Title>
      
      <Description>
        <p>
          Help us improve Wuthering Waves! Use this form to report any bugs you encounter. 
          Your feedback helps us make the game better for everyone.
        </p>
        <p>
          Please be as detailed as possible so our developers can investigate and fix the issue quickly.
        </p>
      </Description>
      
      <CTAButton onClick={handleGetStarted}>
        Report a Bug Now
      </CTAButton>
      
      <FeatureList>
        <FeatureItem>Quick and easy bug reporting process</FeatureItem>
        <FeatureItem>Upload screenshots or videos to help describe the issue</FeatureItem>
        <FeatureItem>Choose from clear bug categories</FeatureItem>
        <FeatureItem>Your reports help improve the game for all players</FeatureItem>
      </FeatureList>
    </Container>
  );
}

export default LandingPage; 