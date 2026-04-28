import express from 'express';
import { body, validationResult } from 'express-validator';
import Zone from '../models/Zone.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/zones ──────────────────────────────────────────────────
// Fetch all active danger zones
router.get('/', async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true })
      .populate('reportedBy', 'fullName username')
      .sort('-createdAt');
      
    res.json({
      success: true,
      count: zones.length,
      data: zones,
    });
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── Validation Rules ───────────────────────────────────────────────
const zoneValidation = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

// ── POST /api/zones ────────────────────────────────────────────────
// Report a new danger zone (Protected route)
router.post('/', protect, zoneValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { lat, lng, description, comment, radius } = req.body;

    const zone = await Zone.create({
      location: { lat, lng },
      description,
      comment: comment || description,
      radius: radius || 250,
      reportedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: zone,
    });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── PUT /api/zones/:id ─────────────────────────────────────────────
// Update a zone's comment/description (Protected route)
router.put('/:id', protect, async (req, res) => {
  try {
    const { comment, description } = req.body;
    const updateFields = {};
    if (comment !== undefined) updateFields.comment = comment;
    if (description !== undefined) updateFields.description = description;

    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, data: zone });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── DELETE /api/zones/:id ──────────────────────────────────────────
// Soft-delete a zone by setting isActive to false (Protected route)
router.delete('/:id', protect, async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
