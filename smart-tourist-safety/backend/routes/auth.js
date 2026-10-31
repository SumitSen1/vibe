import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'tourist_safety_secret_jwt_key_fallback';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id }, secret, { expiresIn });
};

// Placeholder: Register credential hash on blockchain
const registerOnBlockchain = async (userData) => {
  try {
    console.log('[Blockchain] Registering user credential hash...');
    const fakeTxHash =
      '0x' +
      Math.random().toString(16).substring(2) +
      Math.random().toString(16).substring(2);
    return { txHash: fakeTxHash, verified: true };
  } catch {
    return { txHash: null, verified: false };
  }
};

// ── Rate Limiters ──────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.',
  },
});

// ── Validation Rules ───────────────────────────────────────────────
const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('nationality')
    .isIn(['Indian', 'Foreign']).withMessage('Nationality must be Indian or Foreign'),
  body('emergencyContact.name')
    .trim()
    .notEmpty().withMessage('Emergency contact name is required'),
  body('emergencyContact.number')
    .trim()
    .notEmpty().withMessage('Emergency contact number is required')
    .matches(/^[+]?[\d\s\-()]{7,15}$/).withMessage('Enter a valid emergency contact number'),
  body('emergencyContact.relation')
    .trim()
    .notEmpty().withMessage('Emergency contact relation is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('consentLocationTracking').custom((value) => {
    if (value === true || value === 'true') return true;
    throw new Error('Location tracking consent is required');
  }),
  body('consentBlockchainStorage').custom((value) => {
    if (value === true || value === 'true') return true;
    throw new Error('Blockchain storage consent is required');
  }),
];

const loginValidation = [
  body().custom((value, { req }) => {
    const id = req.body.username || req.body.email || req.body.identifier;
    if (!id || !String(id).trim()) {
      throw new Error('Username or email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── POST /api/auth/register ────────────────────────────────────────
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  // Check database readiness
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please try again shortly.',
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const {
      fullName, username, email, nationality,
      aadhaarNumber, digitalTouristId,
      passportNumber, currentLocation, destinationLocation,
      phoneNumber, alternativePhoneNumber,
      emergencyContact, password,
      consentLocationTracking, consentBlockchainStorage,
    } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim().toLowerCase();

    // Nationality-specific validation
    if (nationality === 'Indian') {
      if (!aadhaarNumber || !/^\d{12}$/.test(String(aadhaarNumber).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid 12-digit Aadhaar number is required for Indian nationals.',
        });
      }
      if (!digitalTouristId || !String(digitalTouristId).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Digital Tourist ID is required for Indian nationals.',
        });
      }
    }

    if (nationality === 'Foreign') {
      if (!passportNumber || !/^[A-Za-z0-9]{6,12}$/.test(String(passportNumber).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid passport number (6-12 characters) is required for foreign nationals.',
        });
      }
      if (!phoneNumber || !/^[+]?[\d\s\-()]{7,15}$/.test(String(phoneNumber).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Valid phone number is required for foreign nationals.',
        });
      }
      if (!currentLocation || !destinationLocation) {
        return res.status(400).json({
          success: false,
          message: 'Current and destination locations are required for foreign nationals.',
        });
      }
    }

    // Duplicate check across MongoDB
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { username: normalizedUsername },
      ],
    });

    if (existingUser) {
      const isEmailMatch = existingUser.email.toLowerCase() === normalizedEmail;
      const field = isEmailMatch ? 'Email' : 'Username';
      return res.status(409).json({
        success: false,
        message: `${field} is already registered. Please use another or sign in.`,
      });
    }

    // Blockchain integration placeholder
    const blockchain = await registerOnBlockchain({ email: normalizedEmail });

    // Build user object for atomic creation
    const userData = {
      fullName: String(fullName).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      nationality,
      emergencyContact,
      password,
      consentLocationTracking: consentLocationTracking === true || consentLocationTracking === 'true',
      consentBlockchainStorage: consentBlockchainStorage === true || consentBlockchainStorage === 'true',
      blockchainTxHash: blockchain.txHash,
      blockchainVerified: blockchain.verified,
    };

    if (nationality === 'Indian') {
      userData.aadhaarNumber = String(aadhaarNumber).trim();
      userData.digitalTouristId = String(digitalTouristId).trim();
    } else {
      userData.passportNumber = String(passportNumber).trim().toUpperCase();
      userData.currentLocation = String(currentLocation).trim();
      userData.destinationLocation = String(destinationLocation).trim();
      userData.phoneNumber = String(phoneNumber).trim();
      if (alternativePhoneNumber) userData.alternativePhoneNumber = String(alternativePhoneNumber).trim();
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Smart Tourist Safety System.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        nationality: user.nationality,
        blockchainVerified: user.blockchainVerified,
        blockchainTxHash: user.blockchainTxHash,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'User';
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already registered.`,
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' • ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
    });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  // Check database readiness
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please try again shortly.',
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  try {
    const rawIdentifier = req.body.username || req.body.email || req.body.identifier;
    const identifier = String(rawIdentifier).trim().toLowerCase();
    const { password } = req.body;

    // Search by username OR email (case-insensitive)
    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.',
      });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts. Try again later.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }
      await user.save();
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.',
      });
    }

    // Reset attempts on successful authentication
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        nationality: user.nationality,
        blockchainVerified: user.blockchainVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── POST /api/auth/logout ──────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
