// models/Program.js
import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  // --- This is the key change ---
  // We are telling Mongoose that our primary key, `_id`, will be a String
  // provided by the API, not a MongoDB ObjectId.
  _id: {
    type: String,
    required: true,
  },
  
  // You can still define other key fields for clarity and future use
  name: { type: String, required: true, trim: true },
  code: { type: String },
  campus: { type: String },
  type: { type: String },
  catalogDescription: { type: String },

}, {
  // --- And here's the second part of the fix ---
  // `strict: false` continues to save all other fields from the API.
  strict: false,
  // `timestamps: true` adds `createdAt` and `updatedAt`.
  timestamps: true,
});

// Create a text index on the name and description for efficient searching
programSchema.index({ name: 'text', catalogDescription: 'text' });

const Program = mongoose.models.Program || mongoose.model('Program', programSchema);

export default Program;