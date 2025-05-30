// models/Profile.js
import mongoose, { Schema, model, models } from 'mongoose';

const profileSchema = new Schema({
  // Link to the user document in the 'users' collection
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  // --- ADDED/UPDATED FIELDS ---
  degreeType: {
    type: String,
    default: '',
  },
  majors: {
    type: [String],
    default: [],
  },
  interests: {
    type: [String],
    default: [],
  },
  careerGoal: {
    type: String,
    default: '',
  },
  semesters: {
    type: Object, // Allows for a nested object like { "Fall 2024": [...] }
    default: {},
  },
  // --- END OF ADDED/UPDATED FIELDS ---

  // Note: These fields below are in your original schema but not being sent from the form.
  // You can keep them for future use or remove them for cleanliness.
  minors: {
    type: [String],
    default: [],
  },
  currentGPA: {
    type: Number,
    default: null,
  },
});

// Avoid model re-compilation
const Profile = models.Profile || model('Profile', profileSchema);
export default Profile;