const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

// Bug report submission rate limiting
const bugReportLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  5, // limit each IP to 5 bug reports per hour
  'Too many bug reports submitted, please try again later'
);

// File upload rate limiting
const fileUploadLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 file uploads per 15 minutes
  'Too many file uploads, please try again later'
);

// Secure file upload configuration
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ];
  
  // Check MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }
  
  // Additional file extension validation
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file extension'), false);
  }
  
  cb(null, true);
};

// Multer configuration for secure file uploads
const upload = multer({
  dest: 'uploads/temp/', // Temporary upload directory
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/temp/');
    },
    filename: (req, file, cb) => {
      // Generate secure random filename
      const uniqueName = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueName}${extension}`);
    }
  })
});

// Input validation rules
const bugReportValidation = [
  body('category')
    .isIn([
      'visual-glitch', 'stuck-character', 'quest-problem', 
      'crash-freeze', 'text-typo', 'ui-issue', 
      'audio-problem', 'performance-lag', 'other'
    ])
    .withMessage('Invalid bug category'),
  
  body('otherCategory')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .escape()
    .withMessage('Other category must be 1-100 characters'),
  
  body('description')
    .isLength({ min: 10, max: 2000 })
    .trim()
    .escape()
    .withMessage('Description must be 10-2000 characters'),
  
  body('platform')
    .isIn(['pc', 'ios', 'android', 'playstation'])
    .withMessage('Invalid platform'),
  
  body('userAgent')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('User agent too long')
];

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// File validation middleware
const validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(); // No files uploaded, continue
  }
  
  // Additional server-side file validation
  for (const file of req.files) {
    // Check file size again
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File too large',
        filename: file.originalname
      });
    }
    
    // TODO: Implement virus scanning here
    // Example: Use ClamAV or similar antivirus scanner
  }
  
  next();
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /function\s*\(/i
  ];
  
  const checkForSuspiciousContent = (text) => {
    return suspiciousPatterns.some(pattern => pattern.test(text));
  };
  
  // Check request body for suspicious content
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && checkForSuspiciousContent(value)) {
        console.warn(`Suspicious activity detected from IP ${req.ip}: ${key} contains suspicious content`);
        return res.status(400).json({
          error: 'Request blocked due to suspicious content'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  generalLimiter,
  bugReportLimiter,
  fileUploadLimiter,
  upload,
  bugReportValidation,
  securityHeaders,
  corsOptions,
  handleValidationErrors,
  validateFiles,
  suspiciousActivityDetector
}; 