import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { MESSAGES } from '../utils/constants';

const Container = styled.div`
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: fadeIn 0.6s ease-out;
`;

const SuccessCard = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing['3xl']};
  box-shadow: ${theme.shadows.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing['2xl']};
  }
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, ${theme.colors.success} 0%, #00a76f 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${theme.spacing.xl};
  font-size: ${theme.typography.fontSize['2xl']};
  color: white;
  animation: scaleIn 0.5s ease-out 0.2s both;
  
  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }
`;

const Title = styled.h1`
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.typography.fontSize['3xl']};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize['2xl']};
  }
`;

const Message = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  line-height: ${theme.typography.lineHeight.relaxed};
  margin-bottom: ${theme.spacing['2xl']};
  color: ${theme.colors.textSecondary};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize.base};
  }
`;

const ReferenceSection = styled.div`
  background: ${theme.colors.background};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing['2xl']};
`;

const ReferenceLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textMuted};
  margin-bottom: ${theme.spacing.xs};
`;

const ReferenceId = styled.div`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary};
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  letter-spacing: 1px;
`;

const ReportSummary = styled.div`
  text-align: left;
  background: ${theme.colors.surfaceLight};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing['2xl']};
`;

const SummaryTitle = styled.h3`
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.typography.fontSize.lg};
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.sm};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SummaryLabel = styled.span`
  color: ${theme.colors.textMuted};
`;

const SummaryValue = styled.span`
  color: ${theme.colors.textSecondary};
  font-weight: ${theme.typography.fontWeight.medium};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  
  @media (max-width: ${theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%);
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.lg};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.md};
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: ${theme.colors.textSecondary};
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.medium};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }
`;

const AdditionalInfo = styled.div`
  margin-top: ${theme.spacing['2xl']};
  padding-top: ${theme.spacing.xl};
  border-top: 1px solid ${theme.colors.border};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textMuted};
  line-height: ${theme.typography.lineHeight.relaxed};
`;

function ConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from navigation state
  const { referenceId, category, platform } = location.state || {};

  const handleReportAnother = () => {
    navigate('/report');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // Fallback if accessed directly without state
  if (!referenceId) {
    return (
      <Container className="fade-in">
        <SuccessCard>
          <Title>Thank You!</Title>
          <Message>
            Your bug report has been submitted successfully. Thank you for helping improve Wuthering Waves!
          </Message>
          <ActionButtons>
            <PrimaryButton onClick={handleReportAnother}>
              Report Another Bug
            </PrimaryButton>
            <SecondaryButton onClick={handleBackToHome}>
              Back to Home
            </SecondaryButton>
          </ActionButtons>
        </SuccessCard>
      </Container>
    );
  }

  return (
    <Container className="fade-in">
      <SuccessCard>
        <SuccessIcon>✓</SuccessIcon>
        
        <Title>Bug Report Submitted!</Title>
        
        <Message>
          {MESSAGES.success.submission}
        </Message>

        <ReferenceSection>
          <ReferenceLabel>Reference ID</ReferenceLabel>
          <ReferenceId>{referenceId}</ReferenceId>
        </ReferenceSection>

        {(category || platform) && (
          <ReportSummary>
            <SummaryTitle>Report Summary</SummaryTitle>
            {category && (
              <SummaryItem>
                <SummaryLabel>Category:</SummaryLabel>
                <SummaryValue>{category}</SummaryValue>
              </SummaryItem>
            )}
            {platform && (
              <SummaryItem>
                <SummaryLabel>Platform:</SummaryLabel>
                <SummaryValue>{platform}</SummaryValue>
              </SummaryItem>
            )}
            <SummaryItem>
              <SummaryLabel>Submitted:</SummaryLabel>
              <SummaryValue>{new Date().toLocaleDateString()}</SummaryValue>
            </SummaryItem>
          </ReportSummary>
        )}

        <ActionButtons>
          <PrimaryButton onClick={handleReportAnother}>
            Report Another Bug
          </PrimaryButton>
          <SecondaryButton onClick={handleBackToHome}>
            Back to Home
          </SecondaryButton>
        </ActionButtons>

        <AdditionalInfo>
          <p>
            <strong>What happens next?</strong><br />
            Our development team will review your report and investigate the issue. 
            Keep your reference ID for future correspondence. 
            We appreciate your contribution to making Wuthering Waves better!
          </p>
        </AdditionalInfo>
      </SuccessCard>
    </Container>
  );
}

export default ConfirmationPage; 