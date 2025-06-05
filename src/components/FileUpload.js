import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE, MESSAGES } from '../utils/constants';

const UploadContainer = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.textPrimary};
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.isDragOver ? theme.colors.primary : theme.colors.border};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.isDragOver ? 'rgba(74, 158, 255, 0.05)' : theme.colors.surface};
  
  &:hover {
    border-color: ${theme.colors.primary};
    background: rgba(74, 158, 255, 0.03);
  }
`;

const DropZoneContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const UploadIcon = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  color: ${theme.colors.textMuted};
`;

const UploadText = styled.p`
  color: ${theme.colors.textSecondary};
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  
  strong {
    color: ${theme.colors.primary};
  }
`;

const FileTypeHint = styled.p`
  color: ${theme.colors.textMuted};
  font-size: ${theme.typography.fontSize.xs};
  margin: ${theme.spacing.xs} 0 0 0;
`;

const HiddenInput = styled.input`
  display: none;
`;

const FileList = styled.div`
  margin-top: ${theme.spacing.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.md};
`;

const FilePreview = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: ${theme.colors.surfaceLight};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm};
  max-width: 300px;
`;

const FileIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.typography.fontSize.sm};
  flex-shrink: 0;
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.textPrimary};
  word-break: break-all;
  margin-bottom: 2px;
`;

const FileSize = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.textMuted};
`;

const RemoveButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${theme.colors.error};
  color: white;
  font-size: ${theme.typography.fontSize.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e63946;
  }
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

function FileUpload({ files, onFilesChange, error }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const allAcceptedTypes = [...ACCEPTED_FILE_TYPES.images, ...ACCEPTED_FILE_TYPES.videos];
    
    if (!allAcceptedTypes.includes(file.type)) {
      return MESSAGES.error.fileType;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return MESSAGES.error.fileSize;
    }
    
    return null;
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    const validFiles = [];
    const errors = [];

    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      // You could show these errors in a toast or alert
      console.error('File validation errors:', errors);
      return;
    }

    const updatedFiles = [...files, ...validFiles];
    onFilesChange(updatedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = e.target.files;
    handleFiles(selectedFiles);
    
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    onFilesChange(updatedFiles);
  };

  const getFileIcon = (file) => {
    if (ACCEPTED_FILE_TYPES.images.includes(file.type)) {
      return '🖼️';
    } else if (ACCEPTED_FILE_TYPES.videos.includes(file.type)) {
      return '🎥';
    }
    return '📄';
  };

  return (
    <UploadContainer>
      <Label>Upload Screenshot/Video (Optional but Recommended)</Label>
      
      <DropZone
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <DropZoneContent>
          <UploadIcon>📎</UploadIcon>
          <UploadText>
            <strong>Click to browse</strong> or drag and drop files here
          </UploadText>
          <FileTypeHint>
            Accepted: Images (JPG, PNG, WebP, GIF) and Videos (MP4, WebM, MOV, AVI) • Max {MAX_FILE_SIZE / (1024 * 1024)}MB per file
          </FileTypeHint>
        </DropZoneContent>
      </DropZone>

      <HiddenInput
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ACCEPTED_FILE_TYPES.images, ...ACCEPTED_FILE_TYPES.videos].join(',')}
        onChange={handleFileInputChange}
      />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {files.length > 0 && (
        <FileList>
          {files.map((file, index) => (
            <FilePreview key={`${file.name}-${index}`}>
              <FileIcon>{getFileIcon(file)}</FileIcon>
              <FileInfo>
                <FileName>{file.name}</FileName>
                <FileSize>{formatFileSize(file.size)}</FileSize>
              </FileInfo>
              <RemoveButton onClick={() => removeFile(index)}>
                ×
              </RemoveButton>
            </FilePreview>
          ))}
        </FileList>
      )}
    </UploadContainer>
  );
}

export default FileUpload; 