// Secure API client for bug reporting
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class SecureApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 30000; // 30 seconds
  }

  // Create secure request headers
  getHeaders(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Version': '1.0.0'
    };

    if (includeAuth) {
      const token = sessionStorage.getItem('auth-token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Secure fetch wrapper with timeout and error handling
  async secureRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Include cookies for CSRF protection
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      
      throw error;
    }
  }

  // Submit bug report with file upload
  async submitBugReport(formData, files = []) {
    try {
      // Validate input data
      this.validateBugReportData(formData);

      const form = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          form.append(key, formData[key]);
        }
      });

      // Add files
      files.forEach((file, index) => {
        form.append('files', file);
      });

      // Add security metadata
      form.append('userAgent', navigator.userAgent);
      form.append('timestamp', Date.now().toString());
      form.append('clientFingerprint', this.generateClientFingerprint());

      const response = await fetch(`${this.baseURL}/bug-reports`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-Client-Version': '1.0.0'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit bug report');
      }

      return await response.json();
    } catch (error) {
      console.error('Bug report submission failed:', error);
      throw error;
    }
  }

  // Validate bug report data
  validateBugReportData(data) {
    const required = ['category', 'description', 'platform'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate description length
    if (data.description.length < 10 || data.description.length > 2000) {
      throw new Error('Description must be between 10 and 2000 characters');
    }

    // Validate category
    const validCategories = [
      'visual-glitch', 'stuck-character', 'quest-problem',
      'crash-freeze', 'text-typo', 'ui-issue', 
      'audio-problem', 'performance-lag', 'other'
    ];
    
    if (!validCategories.includes(data.category)) {
      throw new Error('Invalid bug category');
    }

    // Validate platform
    const validPlatforms = ['pc', 'ios', 'android', 'playstation'];
    if (!validPlatforms.includes(data.platform)) {
      throw new Error('Invalid platform');
    }

    // Check for suspicious content
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(data.description) || 
      (data.otherCategory && pattern.test(data.otherCategory))
    );

    if (isSuspicious) {
      throw new Error('Content contains potentially harmful code');
    }
  }

  // Generate client fingerprint for security tracking
  generateClientFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Client fingerprint', 2, 2);
    
    const fingerprint = {
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      canvas: canvas.toDataURL().slice(-32) // Last 32 chars of canvas fingerprint
    };

    return btoa(JSON.stringify(fingerprint));
  }

  // Check report status
  async getReportStatus(reportId) {
    if (!reportId || !/^WUWA-[A-Z0-9]+$/.test(reportId)) {
      throw new Error('Invalid report ID format');
    }

    return await this.secureRequest(`/bug-reports/${reportId}/status`);
  }

  // Health check
  async healthCheck() {
    return await this.secureRequest('/health');
  }
}

// Create singleton instance
const apiClient = new SecureApiClient();

export default apiClient; 