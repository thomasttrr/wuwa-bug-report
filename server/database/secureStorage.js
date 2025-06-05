const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SecureStorage {
  constructor() {
    this.dataDir = process.env.DATA_DIR || './data';
    this.encryptionKey = this.getEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.reports = new Map();
    this.auditLog = [];
    
    this.init();
  }

  async init() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'reports'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'audit'), { recursive: true });
      
      // Load existing data
      await this.loadReports();
      await this.loadAuditLog();
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      throw error;
    }
  }

  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
      console.warn('Using default encryption key - CHANGE IN PRODUCTION!');
      return crypto.scryptSync('default-key', 'salt', 32);
    }
    return Buffer.from(key, 'hex');
  }

  // Encrypt sensitive data (simplified for compatibility)
  encrypt(text) {
    if (!text) return null;
    
    // Simple XOR encryption for demo (use proper encryption in production)
    const key = this.encryptionKey.toString('hex');
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    
    return {
      encrypted: Buffer.from(encrypted).toString('base64'),
      method: 'xor-demo'
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    try {
      const key = this.encryptionKey.toString('hex');
      const encrypted = Buffer.from(encryptedData.encrypted, 'base64').toString();
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Hash IP for privacy
  hashIP(ip) {
    const salt = process.env.IP_SALT || 'default-salt';
    return crypto.createHash('sha256').update(ip + salt).digest('hex');
  }

  // Generate secure report ID
  generateReportId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `WUWA-${timestamp}-${random}`;
  }

  // Validate report data
  validateReportData(data) {
    const errors = [];

    // Required fields
    if (!data.category) errors.push('Category is required');
    if (!data.description) errors.push('Description is required');
    if (!data.platform) errors.push('Platform is required');

    // Data type validation
    if (typeof data.description !== 'string') errors.push('Description must be string');
    if (data.description.length < 10) errors.push('Description too short');
    if (data.description.length > 2000) errors.push('Description too long');

    // Category validation
    const validCategories = [
      'visual-glitch', 'stuck-character', 'quest-problem',
      'crash-freeze', 'text-typo', 'ui-issue',
      'audio-problem', 'performance-lag', 'other'
    ];
    if (!validCategories.includes(data.category) && !data.otherCategory) {
      errors.push('Invalid category');
    }

    // Platform validation
    const validPlatforms = ['pc', 'ios', 'android', 'playstation'];
    if (!validPlatforms.includes(data.platform)) {
      errors.push('Invalid platform');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Create audit log entry
  createAuditEntry(action, reportId, sessionId, details = {}) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      reportId,
      sessionId,
      details,
      hash: null
    };

    // Create integrity hash
    const dataToHash = JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      reportId: entry.reportId,
      sessionId: entry.sessionId
    });
    entry.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    return entry;
  }

  // Save bug report securely
  async saveBugReport(reportData, sessionId) {
    try {
      // Validate input data
      const validation = this.validateReportData(reportData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const reportId = this.generateReportId();
      
      // Prepare secure report object
      const secureReport = {
        id: reportId,
        category: reportData.category,
        otherCategory: reportData.otherCategory || null,
        description: this.encrypt(reportData.description), // Encrypt sensitive data
        platform: reportData.platform,
        files: reportData.files || [],
        metadata: {
          ipHash: this.hashIP(reportData.ip),
          userAgent: this.encrypt(reportData.userAgent || ''),
          sessionId: sessionId,
          fingerprint: this.hashIP(reportData.fingerprint || ''),
          timestamp: new Date().toISOString(),
          status: 'pending'
        },
        integrity: null
      };

      // Create integrity hash
      const integrityData = JSON.stringify({
        id: secureReport.id,
        category: secureReport.category,
        platform: secureReport.platform,
        timestamp: secureReport.metadata.timestamp
      });
      secureReport.integrity = crypto.createHash('sha256').update(integrityData).digest('hex');

      // Store in memory
      this.reports.set(reportId, secureReport);

      // Persist to disk
      await this.persistReport(secureReport);

      // Create audit log entry
      const auditEntry = this.createAuditEntry('CREATE_REPORT', reportId, sessionId, {
        category: reportData.category,
        platform: reportData.platform,
        hasFiles: (reportData.files || []).length > 0
      });
      this.auditLog.push(auditEntry);
      await this.persistAuditEntry(auditEntry);

      console.log(`Bug report saved securely: ${reportId}`);
      return reportId;

    } catch (error) {
      console.error('Failed to save bug report:', error);
      throw error;
    }
  }

  // Retrieve bug report
  async getBugReport(reportId, includeDecrypted = false) {
    const report = this.reports.get(reportId);
    if (!report) {
      return null;
    }

    // Verify integrity
    const integrityData = JSON.stringify({
      id: report.id,
      category: report.category,
      platform: report.platform,
      timestamp: report.metadata.timestamp
    });
    const expectedHash = crypto.createHash('sha256').update(integrityData).digest('hex');
    
    if (report.integrity !== expectedHash) {
      console.error(`Integrity check failed for report ${reportId}`);
      return null;
    }

    if (includeDecrypted) {
      return {
        ...report,
        description: this.decrypt(report.description),
        metadata: {
          ...report.metadata,
          userAgent: this.decrypt(report.metadata.userAgent)
        }
      };
    }

    // Return safe version without decrypted data
    return {
      id: report.id,
      category: report.category,
      platform: report.platform,
      status: report.metadata.status,
      timestamp: report.metadata.timestamp,
      hasFiles: (report.files || []).length > 0
    };
  }

  // Update report status
  async updateReportStatus(reportId, status, adminId) {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const oldStatus = report.metadata.status;
    report.metadata.status = status;
    report.metadata.lastUpdated = new Date().toISOString();
    report.metadata.updatedBy = adminId;

    // Update integrity hash
    const integrityData = JSON.stringify({
      id: report.id,
      category: report.category,
      platform: report.platform,
      timestamp: report.metadata.timestamp
    });
    report.integrity = crypto.createHash('sha256').update(integrityData).digest('hex');

    // Persist changes
    await this.persistReport(report);

    // Audit log
    const auditEntry = this.createAuditEntry('UPDATE_STATUS', reportId, null, {
      oldStatus,
      newStatus: status,
      adminId
    });
    this.auditLog.push(auditEntry);
    await this.persistAuditEntry(auditEntry);

    return report;
  }

  // Persist report to disk
  async persistReport(report) {
    const filename = `${report.id}.json`;
    const filepath = path.join(this.dataDir, 'reports', filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(report, null, 2), {
        mode: 0o600 // Restrict file permissions
      });
    } catch (error) {
      console.error(`Failed to persist report ${report.id}:`, error);
      throw error;
    }
  }

  // Persist audit entry
  async persistAuditEntry(entry) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `audit-${date}.jsonl`;
    const filepath = path.join(this.dataDir, 'audit', filename);
    
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(filepath, line, {
        mode: 0o600
      });
    } catch (error) {
      console.error('Failed to persist audit entry:', error);
    }
  }

  // Load reports from disk
  async loadReports() {
    try {
      const reportsDir = path.join(this.dataDir, 'reports');
      const files = await fs.readdir(reportsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(reportsDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const report = JSON.parse(data);
          this.reports.set(report.id, report);
        }
      }
      
      console.log(`Loaded ${this.reports.size} reports from disk`);
    } catch (error) {
      console.log('No existing reports found or failed to load');
    }
  }

  // Load audit log
  async loadAuditLog() {
    try {
      const auditDir = path.join(this.dataDir, 'audit');
      const files = await fs.readdir(auditDir);
      
      for (const file of files) {
        if (file.startsWith('audit-') && file.endsWith('.jsonl')) {
          const filepath = path.join(auditDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const lines = data.trim().split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              this.auditLog.push(JSON.parse(line));
            }
          }
        }
      }
      
      console.log(`Loaded ${this.auditLog.length} audit entries`);
    } catch (error) {
      console.log('No existing audit log found');
    }
  }

  // Get statistics
  getStatistics() {
    const stats = {
      totalReports: this.reports.size,
      reportsByCategory: {},
      reportsByPlatform: {},
      reportsByStatus: {},
      recentReports: 0
    };

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const report of this.reports.values()) {
      // Count by category
      stats.reportsByCategory[report.category] = 
        (stats.reportsByCategory[report.category] || 0) + 1;

      // Count by platform
      stats.reportsByPlatform[report.platform] = 
        (stats.reportsByPlatform[report.platform] || 0) + 1;

      // Count by status
      stats.reportsByStatus[report.metadata.status] = 
        (stats.reportsByStatus[report.metadata.status] || 0) + 1;

      // Count recent reports
      if (new Date(report.metadata.timestamp) > oneWeekAgo) {
        stats.recentReports++;
      }
    }

    return stats;
  }

  // Backup data
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.dataDir, 'backups', timestamp);
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // Backup reports
      const reportsBackup = Array.from(this.reports.values());
      await fs.writeFile(
        path.join(backupDir, 'reports.json'),
        JSON.stringify(reportsBackup, null, 2)
      );

      // Backup audit log
      await fs.writeFile(
        path.join(backupDir, 'audit.json'),
        JSON.stringify(this.auditLog, null, 2)
      );

      console.log(`Backup created: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const secureStorage = new SecureStorage();

module.exports = {
  secureStorage,
  SecureStorage
}; 