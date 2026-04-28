import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    // ── Basic Details ──────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    nationality: {
      type: String,
      required: [true, 'Nationality is required'],
      enum: ['Indian', 'Foreign'],
    },

    // ── Indian-specific Fields ─────────────────────────────────────
    aadhaarNumber: {
      type: String,
      trim: true,
      match: [/^\d{12}$/, 'Aadhaar must be a 12-digit number'],
    },
    digitalTouristId: {
      type: String,
      trim: true,
    },

    // ── Foreign Tourist Fields ─────────────────────────────────────
    passportNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    currentLocation: {
      type: String,
      trim: true,
    },
    destinationLocation: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    alternativePhoneNumber: {
      type: String,
      trim: true,
    },

    // ── Emergency Contact ──────────────────────────────────────────
    emergencyContact: {
      name: {
        type: String,
        required: [true, 'Emergency contact name is required'],
        trim: true,
      },
      number: {
        type: String,
        required: [true, 'Emergency contact number is required'],
        trim: true,
      },
      relation: {
        type: String,
        required: [true, 'Emergency contact relation is required'],
        trim: true,
      },
    },

    // ── Account Security ───────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    // ── Consent Fields ─────────────────────────────────────────────
    consentLocationTracking: {
      type: Boolean,
      required: [true, 'Location tracking consent is required'],
      default: false,
    },
    consentBlockchainStorage: {
      type: Boolean,
      required: [true, 'Blockchain storage consent is required'],
      default: false,
    },

    // ── Blockchain Integration Placeholder ─────────────────────────
    blockchainTxHash: {
      type: String,
      default: null,
    },
    blockchainVerified: {
      type: Boolean,
      default: false,
    },

    // ── Meta ───────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Pre-save: Hash password ────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Method: Compare passwords ──────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Method: Check if account is locked ────────────────────────────
UserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

export default mongoose.model('User', UserSchema);