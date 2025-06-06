// models/Profile.js
import mongoose, { Schema, model, models } from 'mongoose';

const profileSchema = new Schema({
  _id: { type: String, required: true }, // From API
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  
  // --- Academic Tab ---
  degreeType: { type: String, default: '' },
  majors: { type: [String], default: [] }, // Existing, from selectedPrograms
  semesters: { type: Object, default: {} }, // Existing, for Completed Courses & Grades
  currentCourses: { type: [String], default: [] }, // New: List of course names or codes
  learningStyle: { type: String, default: '' }, // New: e.g., "Exams", "Projects", "Group Work"
  academicGoals: { type: [String], default: [] }, // New: Array of goals
  areasOfDifficulty: { type: [String], default: [] }, // New: Array of difficult subjects/topics

  // --- Interests & Goals Tab ---
  careerGoal: { type: String, default: '' }, // Existing
  academicInterests: { type: [String], default: [] }, // Renamed from 'interests' for clarity
  extracurricularActivities: { type: [String], default: [] }, // New
  researchInterests: { type: [String], default: [] }, // New
  skills: { type: [String], default: [] }, // New: e.g., programming languages, software

  // --- Preferences Tab ---
  classRoomSizePreference: { type: [String], default: [] }, // New: e.g., "Small", "Medium", "Large"
  classroomPreferences: { type: [String], default: [] }, // New:  e.g "Hybrid", "Online", "In-Person"

  // --- University Specific Tab ---
  campusInvolvement: { type: [String], default: [] }, // New: e.g., "Student Government", "Clubs"
  academicSupportServices: { type: [String], default: [] }, // New: e.g., "Tutoring", "Advising"
  
  transferCourses: {
    type: [Object], // An array of course objects
    default: [],
  },

}, {
  strict: false, // Keeps allowing other fields if any are missed, but better to define all
  timestamps: true,
});

const Profile = mongoose.models.Profile || model('Profile', profileSchema);
export default Profile;