import express from 'express';
import { body, validationResult } from 'express-validator';
import Alert from '../models/Alert.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/alerts ────────────────────────────────────────────────
// Fetch alerts for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user.id })
      .sort('-createdAt');
      
    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── Validation Rules ───────────────────────────────────────────────
const alertValidation = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
];

// ── POST /api/alerts ───────────────────────────────────────────────
// Trigger an SOS Alert (Protected route)
router.post('/', protect, alertValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { lat, lng } = req.body;

    const alert = await Alert.create({
      user: req.user.id,
      location: { lat, lng },
    });

    // In a real application, here we would:
    // 1. Dispatch WebSocket events to an Admin/Police dashboard.
    // 2. Trigger an SMS/Email service (e.g. Twilio/SendGrid) to notify Emergency Contacts.
    console.log(`🚨 SOS ALERT TRIGGERED by User ID: ${req.user.id} at [${lat}, ${lng}]`);
    
    // Simulate async notification dispatch
    setTimeout(async () => {
      alert.notifiedAuthorities = true;
      alert.notifiedContacts = true;
      await alert.save();
      console.log(`✅ Notifications sent for Alert ID: ${alert._id}`);
    }, 2000);

    res.status(201).json({
      success: true,
      message: 'SOS Alert dispatched to authorities and emergency contacts.',
      data: alert,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
