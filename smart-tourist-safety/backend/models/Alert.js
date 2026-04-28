import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['Pending', 'Acknowledged', 'Resolved'],
      default: 'Pending',
    },
    notifiedAuthorities: {
      type: Boolean,
      default: false,
    },
    notifiedContacts: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Alert', AlertSchema);
