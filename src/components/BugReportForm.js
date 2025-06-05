import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { BUG_CATEGORIES, PLATFORMS, FORM_VALIDATION, MESSAGES } from '../utils/constants';
import FileUpload from './FileUpload';
import apiClient from '../utils/api';

const Container = styled.div`
  max-width: 700px;
  width: 100%;
  animation: fadeIn 0.6s ease-out;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing['2xl']};
`;

const Title = styled.h2`
  color: ${theme.colors.textPrimary};
  margin-bottom: ${theme.spacing.md};
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  color: ${theme.colors.primary};
  background: none;
  border: none;
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing.lg};
  transition: color 0.2s ease;
  
  &:hover {
    color: ${theme.colors.primaryLight};
  }
`;

const Form = styled.form`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing['2xl']};
  box-shadow: ${theme.shadows.lg};
  
  @media (max-width: ${theme.breakpoints.sm}) {
    padding: ${theme.spacing.xl};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.textPrimary};
  
  span {
    color: ${theme.colors.error};
    margin-left: 2px;
  }
`;

const Select = styled.select`
  width: 100%;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
`;

const TextArea = styled.textarea`
  width: 100%;
  font-family: inherit;
  resize: vertical;
  min-height: 150px;
`;

const OtherInput = styled.input`
  width: 100%;
  margin-top: ${theme.spacing.sm};
`;

const CharacterCount = styled.div`
  text-align: right;
  font-size: ${theme.typography.fontSize.xs};
  color: ${props => 
    props.count > FORM_VALIDATION.description.maxLength ? theme.colors.error : theme.colors.textMuted};
  margin-top: ${theme.spacing.xs};
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

const SubmitButton = styled.button`
  width: 100%;
  background: linear-gradient(135deg, ${theme.colors.success} 0%, #00a76f 100%);
  color: ${theme.colors.textPrimary};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.lg};
  }
  
  &:disabled {
    background: ${theme.colors.textMuted};
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: ${theme.typography.fontSize.base};
    padding: ${theme.spacing.md};
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: ${theme.spacing.sm};
`;

const SecurityNotice = styled.div`
  background: ${theme.colors.surfaceLight};
  border: 1px solid ${theme.colors.borderLight};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textMuted};
  
  strong {
    color: ${theme.colors.textSecondary};
  }
`;

function BugReportForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    otherCategory: '',
    description: '',
    platform: '',
    files: [],
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Category validation
    if (!formData.category) {
      newErrors.category = MESSAGES.error.categoryRequired;
    }

    // Other category validation
    if (formData.category === 'other' && !formData.otherCategory.trim()) {
      newErrors.otherCategory = 'Please specify the type of bug.';
    }

    // Description validation
    if (formData.description.length < FORM_VALIDATION.description.minLength) {
      newErrors.description = MESSAGES.error.descriptionTooShort;
    }

    if (formData.description.length > FORM_VALIDATION.description.maxLength) {
      newErrors.description = MESSAGES.error.descriptionTooLong;
    }

    // Platform validation
    if (!formData.platform) {
      newErrors.platform = MESSAGES.error.platformRequired;
    }

    // Additional security validation
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(formData.description) || 
      (formData.otherCategory && pattern.test(formData.otherCategory))
    );

    if (isSuspicious) {
      newErrors.security = 'Your input contains potentially harmful content. Please remove any code or scripts.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare submission data
      const submissionData = {
        category: formData.category,
        description: formData.description,
        platform: formData.platform
      };

      // Add other category if selected
      if (formData.category === 'other') {
        submissionData.otherCategory = formData.otherCategory;
      }

      // Submit via secure API
      const response = await apiClient.submitBugReport(submissionData, formData.files);
      
      // Navigate to confirmation page with the reference ID
      navigate('/confirmation', { 
        state: { 
          referenceId: response.reportId,
          category: formData.category === 'other' ? formData.otherCategory : 
                    BUG_CATEGORIES.find(cat => cat.value === formData.category)?.label,
          platform: PLATFORMS.find(plat => plat.value === formData.platform)?.label,
          filesProcessed: response.filesProcessed || 0
        } 
      });

    } catch (error) {
      console.error('Bug report submission failed:', error);
      
      // Handle specific error types
      if (error.message.includes('rate limit') || error.message.includes('Too many')) {
        setErrors({ submit: 'You have submitted too many reports recently. Please wait before submitting another.' });
      } else if (error.message.includes('timeout')) {
        setErrors({ submit: 'Request timed out. Please check your connection and try again.' });
      } else if (error.message.includes('harmful') || error.message.includes('suspicious')) {
        setErrors({ submit: 'Your submission contains content that was flagged by our security system. Please review your input.' });
      } else {
        setErrors({ submit: error.message || MESSAGES.error.networkError });
      }
      
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear security error when user modifies input
    if (errors.security && (field === 'description' || field === 'otherCategory')) {
      setErrors(prev => ({ ...prev, security: '' }));
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <Container className="fade-in">
      <BackLink onClick={handleBack}>
        ← Back to Home
      </BackLink>
      
      <Header>
        <Title>Submit Bug Report</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        <SecurityNotice>
          <strong>Security Notice:</strong> All submissions are monitored for security. 
          Please do not include personal information, passwords, or executable code in your report.
        </SecurityNotice>

        <FormGroup>
          <Label htmlFor="category">
            Bug Category <span>*</span>
          </Label>
          <Select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            <option value="">Select a category...</option>
            {BUG_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </Select>
          {errors.category && <ErrorMessage>{errors.category}</ErrorMessage>}
          
          {formData.category === 'other' && (
            <>
              <OtherInput
                type="text"
                placeholder={MESSAGES.placeholders.otherCategory}
                value={formData.otherCategory}
                onChange={(e) => handleInputChange('otherCategory', e.target.value)}
              />
              {errors.otherCategory && <ErrorMessage>{errors.otherCategory}</ErrorMessage>}
            </>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">
            Describe the Bug <span>*</span>
          </Label>
          <TextArea
            id="description"
            placeholder={MESSAGES.placeholders.description}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
          <CharacterCount count={formData.description.length}>
            {formData.description.length} / {FORM_VALIDATION.description.maxLength}
          </CharacterCount>
          {errors.description && <ErrorMessage>{errors.description}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="platform">
            Platform <span>*</span>
          </Label>
          <Select
            id="platform"
            value={formData.platform}
            onChange={(e) => handleInputChange('platform', e.target.value)}
          >
            <option value="">Select your platform...</option>
            {PLATFORMS.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </Select>
          {errors.platform && <ErrorMessage>{errors.platform}</ErrorMessage>}
        </FormGroup>

        <FileUpload
          files={formData.files}
          onFilesChange={(files) => handleInputChange('files', files)}
          error={errors.files}
        />

        {errors.security && <ErrorMessage>{errors.security}</ErrorMessage>}
        {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

        <SubmitButton type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoadingSpinner />}
          {isSubmitting ? 'Submitting Report...' : 'Submit Bug Report'}
        </SubmitButton>
      </Form>
    </Container>
  );
}

export default BugReportForm; 