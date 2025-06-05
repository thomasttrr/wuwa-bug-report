const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Simple in-memory session store (use Redis in production)
class SessionStore {
  constructor() {
    this.sessions = new Map();
    this.userSessions = new Map(); // Track sessions per user
    this.submissionCounts = new Map(); // Track submissions per session
    
    // Cleanup expired sessions every 30 minutes
    setInterval(() => this.cleanupExpiredSessions(), 30 * 60 * 1000);
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  createSession(fingerprint, ip) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      fingerprint,
      ip,
      createdAt: new Date(),
      lastActivity: new Date(),
      submissionCount: 0,
      isBlacklisted: false,
      riskScore: 0
    };

    this.sessions.set(sessionId, session);
    
    // Track sessions by fingerprint for rate limiting
    if (!this.userSessions.has(fingerprint)) {
      this.userSessions.set(fingerprint, new Set());
    }
    this.userSessions.get(fingerprint).add(sessionId);

    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  incrementSubmissionCount(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.submissionCount++;
      session.lastActivity = new Date();
      
      // Increase risk score for high submission counts
      if (session.submissionCount > 3) {
        session.riskScore += 10;
      }
      
      return session;
    }
    return null;
  }

  blacklistSession(sessionId, reason) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isBlacklisted = true;
      session.blacklistReason = reason;
      session.blacklistedAt = new Date();
      console.warn(`Session ${sessionId} blacklisted: ${reason}`);
    }
  }

  getSessionsByFingerprint(fingerprint) {
    const sessionIds = this.userSessions.get(fingerprint) || new Set();
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter(session => session !== undefined);
  }

  cleanupExpiredSessions() {
    const now = new Date();
    const expireTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > expireTime) {
        this.sessions.delete(sessionId);
        
        // Remove from user sessions
        const userSessions = this.userSessions.get(session.fingerprint);
        if (userSessions) {
          userSessions.delete(sessionId);
          if (userSessions.size === 0) {
            this.userSessions.delete(session.fingerprint);
          }
        }
      }
    }
  }

  // Get statistics for monitoring
  getStats() {
    const now = new Date();
    const activeThreshold = 60 * 60 * 1000; // 1 hour
    
    let activeSessions = 0;
    let blacklistedSessions = 0;
    let highRiskSessions = 0;

    for (const session of this.sessions.values()) {
      if (now - session.lastActivity < activeThreshold) {
        activeSessions++;
      }
      if (session.isBlacklisted) {
        blacklistedSessions++;
      }
      if (session.riskScore > 50) {
        highRiskSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      blacklistedSessions,
      highRiskSessions,
      uniqueUsers: this.userSessions.size
    };
  }
}

const sessionStore = new SessionStore();

// Generate client fingerprint from request
const generateFingerprint = (req) => {
  const components = [
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.ip,
    req.get('X-Client-Version') || ''
  ];
  
  return crypto.createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
};

// Create or retrieve session
const createOrGetSession = (req, res, next) => {
  try {
    let sessionId = req.cookies?.sessionId;
    let session = null;

    if (sessionId) {
      session = sessionStore.getSession(sessionId);
    }

    if (!session) {
      // Create new session
      const fingerprint = generateFingerprint(req);
      session = sessionStore.createSession(fingerprint, req.ip);
      sessionId = session.id;

      // Set secure session cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    } else {
      // Update activity
      sessionStore.updateSessionActivity(sessionId);
    }

    // Check if session is blacklisted
    if (session.isBlacklisted) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your session has been blocked due to suspicious activity'
      });
    }

    req.session = session;
    next();
  } catch (error) {
    console.error('Session management error:', error);
    res.status(500).json({
      error: 'Session error',
      message: 'Unable to manage session'
    });
  }
};

// Enhanced rate limiting per session
const sessionBasedRateLimit = (windowMs, maxRequests, maxPerFingerprint = null) => {
  return (req, res, next) => {
    const session = req.session;
    if (!session) {
      return res.status(401).json({ error: 'No valid session' });
    }

    // Check session-based rate limiting
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get all sessions for this fingerprint
    const fingerprintSessions = sessionStore.getSessionsByFingerprint(session.fingerprint);
    
    // Count recent requests across all sessions for this user
    const recentRequests = fingerprintSessions.reduce((count, s) => {
      return count + (s.submissionCount || 0);
    }, 0);

    // Check per-fingerprint limit
    if (maxPerFingerprint && recentRequests >= maxPerFingerprint) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests from this device/browser'
      });
    }

    // Check individual session limit
    if (session.submissionCount >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests in this session'
      });
    }

    next();
  };
};

// Abuse detection middleware
const abuseDetection = (req, res, next) => {
  const session = req.session;
  if (!session) {
    return next();
  }

  // Analyze for abuse patterns
  let riskScore = session.riskScore || 0;
  
  // Check submission frequency
  if (session.submissionCount > 5) {
    riskScore += 20;
  }

  // Check for suspicious content patterns
  if (req.body) {
    const suspiciousPatterns = [
      /test\s*test/i,
      /^.{0,10}$/,  // Very short descriptions
      /(.)\1{10,}/, // Repeated characters
      /lorem ipsum/i
    ];

    const description = req.body.description || '';
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(description));
    
    if (isSuspicious) {
      riskScore += 15;
    }
  }

  // Update risk score
  session.riskScore = riskScore;

  // Block high-risk sessions
  if (riskScore > 100) {
    sessionStore.blacklistSession(session.id, 'High risk score detected');
    return res.status(403).json({
      error: 'Access denied',
      message: 'Suspicious activity detected'
    });
  }

  // Log medium risk sessions
  if (riskScore > 50) {
    console.warn(`Medium risk session detected: ${session.id}, score: ${riskScore}`);
  }

  next();
};

// Track bug report submission
const trackSubmission = (req, res, next) => {
  if (req.session) {
    sessionStore.incrementSubmissionCount(req.session.id);
  }
  next();
};

// Admin authentication (simple implementation)
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Admin token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

// Generate admin token (for development)
const generateAdminToken = () => {
  return jwt.sign(
    { role: 'admin', id: 'admin-user' },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '24h' }
  );
};

// Get session statistics (admin only)
const getSessionStats = (req, res) => {
  try {
    const stats = sessionStore.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get session statistics',
      message: error.message
    });
  }
};

module.exports = {
  createOrGetSession,
  sessionBasedRateLimit,
  abuseDetection,
  trackSubmission,
  adminAuth,
  generateAdminToken,
  getSessionStats,
  sessionStore
}; 