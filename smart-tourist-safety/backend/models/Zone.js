import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
    },
    radius: {
      type: Number,
      default: 250, // radius in meters
      min: [50, 'Radius must be at least 50 meters'],
      max: [5000, 'Radius cannot exceed 5000 meters'],
    },
    description: {
      type: String,
      required: [true, 'Description of the danger zone is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: '',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Zone', ZoneSchema);
