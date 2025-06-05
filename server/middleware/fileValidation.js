const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Magic numbers for file type validation
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],        // JPEG
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1]  // JPEG/EXIF
  ],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // WEBP (RIFF header)
  // Videos
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]  // MP4
  ],
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]] // WebM
};

// Dangerous file signatures to block
const DANGEROUS_SIGNATURES = [
  [0x4D, 0x5A],                           // PE/EXE files
  [0x50, 0x4B, 0x03, 0x04],              // ZIP files (could contain malware)
  [0x7F, 0x45, 0x4C, 0x46],              // ELF executables
  [0xCA, 0xFE, 0xBA, 0xBE],              // Java class files
  [0x25, 0x50, 0x44, 0x46],              // PDF files (can contain scripts)
  [0xD0, 0xCF, 0x11, 0xE0]               // MS Office files
];

class AdvancedFileValidator {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
  }

  // Read file magic numbers
  async readFileSignature(filePath, bytes = 16) {
    try {
      const buffer = Buffer.alloc(bytes);
      const fd = await fs.open(filePath, 'r');
      await fd.read(buffer, 0, bytes, 0);
      await fd.close();
      return Array.from(buffer);
    } catch (error) {
      throw new Error('Unable to read file signature');
    }
  }

  // Validate file signature matches MIME type
  validateFileSignature(signature, mimeType) {
    const expectedSignatures = FILE_SIGNATURES[mimeType];
    if (!expectedSignatures) {
      return false;
    }

    return expectedSignatures.some(expected => 
      expected.every((byte, index) => signature[index] === byte)
    );
  }

  // Check for dangerous file signatures
  isDangerous(signature) {
    return DANGEROUS_SIGNATURES.some(dangerous =>
      dangerous.every((byte, index) => signature[index] === byte)
    );
  }

  // Enhanced file validation
  async validateFile(file) {
    const errors = [];
    
    try {
      // 1. Basic validations
      if (!this.allowedTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} not allowed`);
      }

      if (file.size > this.maxFileSize) {
        errors.push(`File size ${file.size} exceeds limit of ${this.maxFileSize} bytes`);
      }

      // 2. File extension validation
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        errors.push(`File extension ${fileExt} not allowed`);
      }

      // 3. Magic number validation
      const signature = await this.readFileSignature(file.path);
      
      // Check for dangerous signatures
      if (this.isDangerous(signature)) {
        errors.push('File contains dangerous executable signature');
      }

      // Validate signature matches declared MIME type
      if (!this.validateFileSignature(signature, file.mimetype)) {
        errors.push(`File signature does not match declared type ${file.mimetype}`);
      }

      // 4. Additional content validation for images
      if (file.mimetype.startsWith('image/')) {
        await this.validateImageFile(file);
      }

      // 5. Filename validation
      const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
      if (dangerousChars.test(file.originalname)) {
        errors.push('Filename contains dangerous characters');
      }

      if (file.originalname.length > 255) {
        errors.push('Filename too long');
      }

      // 6. Check for embedded scripts in file
      await this.scanForEmbeddedThreats(file);

      return {
        isValid: errors.length === 0,
        errors,
        signature: signature.slice(0, 8) // First 8 bytes for logging
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        signature: null
      };
    }
  }

  // Validate image files more thoroughly
  async validateImageFile(file) {
    try {
      const buffer = await fs.readFile(file.path);
      const content = buffer.toString('ascii');
      
      // Check for embedded scripts in image metadata
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i
      ];

      const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
        pattern.test(content)
      );

      if (hasSuspiciousContent) {
        throw new Error('Image contains suspicious embedded content');
      }

    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  // Scan for embedded threats (simplified virus scan)
  async scanForEmbeddedThreats(file) {
    try {
      const buffer = await fs.readFile(file.path);
      
      // Simple threat patterns (in production, use proper antivirus)
      const threatPatterns = [
        Buffer.from('eval('),
        Buffer.from('<script'),
        Buffer.from('javascript:'),
        Buffer.from('cmd.exe'),
        Buffer.from('powershell'),
        Buffer.from('/bin/sh'),
        Buffer.from('bash'),
        Buffer.from('%SystemRoot%')
      ];

      for (const pattern of threatPatterns) {
        if (buffer.includes(pattern)) {
          throw new Error(`File contains suspicious pattern: ${pattern.toString()}`);
        }
      }

    } catch (error) {
      throw new Error(`Threat scan failed: ${error.message}`);
    }
  }

  // Generate secure filename
  generateSecureFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}_${random}${ext}`;
  }
}

// Middleware for enhanced file validation
const enhancedFileValidation = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const validator = new AdvancedFileValidator();
  const validationResults = [];

  try {
    // Validate each uploaded file
    for (const file of req.files) {
      const result = await validator.validateFile(file);
      validationResults.push({
        filename: file.originalname,
        ...result
      });

      // If any file is invalid, reject the entire request
      if (!result.isValid) {
        // Clean up all uploaded files
        for (const f of req.files) {
          try {
            await fs.unlink(f.path);
          } catch (unlinkError) {
            console.error('Failed to cleanup file:', unlinkError);
          }
        }

        return res.status(400).json({
          error: 'File validation failed',
          details: validationResults.filter(r => !r.isValid)
        });
      }
    }

    // All files valid, generate secure filenames
    for (const file of req.files) {
      file.secureFilename = validator.generateSecureFilename(file.originalname);
    }

    req.fileValidationResults = validationResults;
    next();

  } catch (error) {
    console.error('File validation error:', error);
    
    // Clean up files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Failed to cleanup file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      error: 'File validation failed',
      message: 'Unable to process uploaded files'
    });
  }
};

module.exports = {
  enhancedFileValidation,
  AdvancedFileValidator
}; 