const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const winston = require('winston');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const {
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
} = require('./middleware/security');

const { enhancedFileValidation } = require('./middleware/fileValidation');
const { 
  createOrGetSession,
  sessionBasedRateLimit,
  abuseDetection,
  trackSubmission,
  adminAuth,
  generateAdminToken,
  getSessionStats
} = require('./middleware/auth');
const { secureStorage } = require('./database/secureStorage');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Winston logger for security events
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'wuwa-bug-reporter' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(cookieParser()); // Add cookie parser for session management
app.use(generalLimiter);

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    // Store raw body for integrity verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Ensure upload directories exist
const ensureUploadDirs = async () => {
  const dirs = ['uploads/temp', 'uploads/processed', 'logs'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create directory ${dir}:`, error);
    }
  }
};

// Enhanced file processing with virus scanning simulation
const processUploadedFiles = async (files) => {
  const processedFiles = [];
  
  for (const file of files) {
    try {
      // In production, implement actual virus scanning here
      // Example: await scanFileWithClamAV(file.path);
      
      // Move file to processed directory with secure name
      const secureFileName = file.secureFilename || 
        crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
      const processedPath = path.join('uploads/processed', secureFileName);
      
      await fs.rename(file.path, processedPath);
      
      processedFiles.push({
        originalName: file.originalname,
        storedName: secureFileName,
        mimeType: file.mimetype,
        size: file.size,
        uploadDate: new Date().toISOString(),
        validationResult: file.validationResult
      });
      
      logger.info(`File processed: ${file.originalname} -> ${secureFileName}`);
    } catch (error) {
      logger.error(`File processing failed for ${file.originalname}:`, error);
      // Clean up failed file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error(`Failed to clean up file ${file.path}:`, unlinkError);
      }
    }
  }
  
  return processedFiles;
};

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: 'enhanced'
  });
});

// Session status endpoint
app.get('/api/session', createOrGetSession, (req, res) => {
  res.json({
    sessionId: req.session.id,
    submissionCount: req.session.submissionCount,
    riskScore: req.session.riskScore,
    isBlacklisted: req.session.isBlacklisted
  });
});

// Enhanced bug report submission endpoint
app.post('/api/bug-reports', 
  createOrGetSession,                           // Session management
  sessionBasedRateLimit(60 * 60 * 1000, 3, 5), // 3 per hour per session, 5 per device total
  fileUploadLimiter,
  upload.array('files', 5),
  enhancedFileValidation,                       // Enhanced file validation
  suspiciousActivityDetector,
  abuseDetection,                               // Abuse detection
  bugReportValidation,
  handleValidationErrors,
  trackSubmission,                              // Track submission in session
  async (req, res) => {
    try {
      const { category, otherCategory, description, platform } = req.body;
      
      // Process uploaded files with enhanced validation
      const processedFiles = req.files ? await processUploadedFiles(req.files) : [];
      
      // Prepare data for secure storage
      const reportData = {
        category: category === 'other' ? otherCategory : category,
        otherCategory: category === 'other' ? otherCategory : null,
        description,
        platform,
        files: processedFiles,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        fingerprint: req.get('X-Client-Version') || 'unknown'
      };

      // Save bug report using secure storage
      const reportId = await secureStorage.saveBugReport(reportData, req.session.id);

      logger.info(`Bug report submitted successfully: ${reportId}`, {
        ip: req.ip,
        category: category,
        platform: platform,
        fileCount: processedFiles.length,
        sessionId: req.session.id
      });

      res.status(201).json({
        success: true,
        reportId,
        message: 'Bug report submitted successfully',
        filesProcessed: processedFiles.length,
        submissionCount: req.session.submissionCount
      });

    } catch (error) {
      logger.error('Bug report submission failed:', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        sessionId: req.session?.id
      });
      
      res.status(500).json({
        error: 'Failed to submit bug report',
        message: 'Please try again later'
      });
    }
  }
);

// Report status endpoint (enhanced with security)
app.get('/api/bug-reports/:reportId/status', 
  createOrGetSession,
  generalLimiter,
  (req, res) => {
    const { reportId } = req.params;
    
    // Basic validation
    if (!/^WUWA-[A-Z0-9\-]+$/.test(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID format' });
    }
    
    // Get report from secure storage
    secureStorage.getBugReport(reportId)
      .then(report => {
        if (!report) {
          return res.status(404).json({ error: 'Report not found' });
        }
        
        res.json(report);
      })
      .catch(error => {
        logger.error('Failed to retrieve report status:', error);
        res.status(500).json({ error: 'Failed to retrieve report status' });
      });
  }
);

// Admin endpoints (require authentication)

// Generate admin token (development only)
app.post('/api/admin/token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const token = generateAdminToken();
  res.json({ token });
});

// Get session statistics
app.get('/api/admin/sessions', adminAuth, getSessionStats);

// Get storage statistics
app.get('/api/admin/statistics', adminAuth, (req, res) => {
  try {
    const stats = secureStorage.getStatistics();
    res.json({
      success: true,
      storage: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// Create backup
app.post('/api/admin/backup', adminAuth, async (req, res) => {
  try {
    const backupPath = await secureStorage.createBackup();
    res.json({
      success: true,
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Backup failed',
      message: error.message
    });
  }
});

// Update report status
app.patch('/api/admin/reports/:reportId', adminAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in-review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updatedReport = await secureStorage.updateReportStatus(
      reportId, 
      status, 
      req.admin.id
    );
    
    res.json({
      success: true,
      report: updatedReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update report status',
      message: error.message
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    sessionId: req.session?.id
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await ensureUploadDirs();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🛡️  Enhanced security measures active:`);
      console.log(`   ✅ File upload validation with magic number verification`);
      console.log(`   ✅ Session-based authentication and tracking`);
      console.log(`   ✅ Encrypted storage with audit logging`);
      console.log(`   ✅ Advanced abuse detection and rate limiting`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔧 Admin token endpoint: POST /api/admin/token`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 