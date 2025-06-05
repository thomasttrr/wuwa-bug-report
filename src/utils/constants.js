export const BUG_CATEGORIES = [
  { value: 'visual-glitch', label: 'Visual Glitch (Graphics Issue)' },
  { value: 'stuck-character', label: 'Stuck Character/NPC' },
  { value: 'quest-problem', label: 'Quest Problem' },
  { value: 'crash-freeze', label: 'Crash/Freeze' },
  { value: 'text-typo', label: 'Text/Typo Error' },
  { value: 'ui-issue', label: 'UI Issue (Menus, HUD)' },
  { value: 'audio-problem', label: 'Audio Problem' },
  { value: 'performance-lag', label: 'Performance Lag' },
  { value: 'other', label: 'Other' },
];

export const PLATFORMS = [
  { value: 'pc', label: 'PC' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'playstation', label: 'PlayStation' },
];

export const ACCEPTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  videos: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export const FORM_VALIDATION = {
  description: {
    minLength: 10,
    maxLength: 2000,
  },
  category: {
    required: true,
  },
  platform: {
    required: true,
  },
};

export const MESSAGES = {
  success: {
    submission: 'Thank you for helping make Wuthering Waves better! Your report has been received.',
    fileUpload: 'File uploaded successfully!',
  },
  error: {
    generic: 'Something went wrong. Please try again.',
    fileSize: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    fileType: 'Please upload only images (JPG, PNG, WebP, GIF) or videos (MP4, WebM, MOV, AVI).',
    descriptionTooShort: `Description must be at least ${FORM_VALIDATION.description.minLength} characters.`,
    descriptionTooLong: `Description must be less than ${FORM_VALIDATION.description.maxLength} characters.`,
    categoryRequired: 'Please select a bug category.',
    platformRequired: 'Please select your platform.',
    networkError: 'Network error occurred. Please check your connection and try again.',
  },
  placeholders: {
    description: 'Please provide details: What were you doing? What happened? What did you expect? Include any relevant game information like character, location, or quest name.',
    otherCategory: 'Please specify the type of bug you encountered...',
  },
}; 