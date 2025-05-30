// models/UserSession.js
import mongoose, { Schema, model, models } from 'mongoose';

const userSessionSchema = new Schema({
  // Link to the user document
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  domain: {
    type: String,
    enum: ['umn', 'non-umn'], // Enforce specific values
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  // Mongoose automatically adds `createdAt` and `updatedAt` fields
  timestamps: true,
});

const UserSession = models.UserSession || model('UserSession', userSessionSchema);
export default UserSession;