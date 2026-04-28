import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// Placeholder: Register credential hash on blockchain
const registerOnBlockchain = async (userData) => {
  try {
    // Replace with real blockchain API call when ready
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
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.',
  },
});

// ── Validation Rules ───────────────────────────────────────────────
const registerValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('username').trim().notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('nationality').isIn(['Indian', 'Foreign']).withMessage('Nationality must be Indian or Foreign'),
  body('emergencyContact.name').trim().notEmpty().withMessage('Emergency contact name is required'),
  body('emergencyContact.number').trim().notEmpty().withMessage('Emergency contact number is required')
    .matches(/^[+]?[\d\s\-()]{7,15}$/).withMessage('Enter a valid emergency contact number'),
  body('emergencyContact.relation').trim().notEmpty().withMessage('Emergency contact relation is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  body('consentLocationTracking').equals('true').withMessage('Location tracking consent is required'),
  body('consentBlockchainStorage').equals('true').withMessage('Blockchain storage consent is required'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── POST /api/auth/register ────────────────────────────────────────
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
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

    // Nationality-specific validation
    if (nationality === 'Indian') {
      if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
        return res.status(400).json({ success: false, message: 'Valid 12-digit Aadhaar number is required for Indian nationals.' });
      }
      if (!digitalTouristId) {
        return res.status(400).json({ success: false, message: 'Digital Tourist ID is required for Indian nationals.' });
      }
    }

    if (nationality === 'Foreign') {
      if (!passportNumber || !/^[A-Z]{1,2}[0-9]{6,7}$/.test(passportNumber.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Valid passport number is required for foreign nationals.' });
      }
      if (!phoneNumber || !/^[+]?[\d\s\-()]{7,15}$/.test(phoneNumber)) {
        return res.status(400).json({ success: false, message: 'Valid phone number is required for foreign nationals.' });
      }
      if (!currentLocation || !destinationLocation) {
        return res.status(400).json({ success: false, message: 'Current and destination location are required for foreign nationals.' });
      }
    }

    // Duplicate check
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(409).json({ success: false, message: `${field} already registered.` });
    }

    // Build user object
    const userData = {
      fullName, username, email, nationality,
      emergencyContact, password,
      consentLocationTracking: consentLocationTracking === true || consentLocationTracking === 'true',
      consentBlockchainStorage: consentBlockchainStorage === true || consentBlockchainStorage === 'true',
    };

    if (nationality === 'Indian') {
      userData.aadhaarNumber = aadhaarNumber;
      userData.digitalTouristId = digitalTouristId;
    } else {
      userData.passportNumber = passportNumber.toUpperCase();
      userData.currentLocation = currentLocation;
      userData.destinationLocation = destinationLocation;
      userData.phoneNumber = phoneNumber;
      if (alternativePhoneNumber) userData.alternativePhoneNumber = alternativePhoneNumber;
    }

    const user = await User.create(userData);

    // Blockchain integration (placeholder)
    const blockchain = await registerOnBlockchain({ userId: user._id, email });
    user.blockchainTxHash = blockchain.txHash;
    user.blockchainVerified = blockchain.verified;
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
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
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    if (user.isLocked()) {
      return res.status(423).json({ success: false, message: 'Account temporarily locked due to too many failed attempts. Try again later.' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Reset on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
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
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
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