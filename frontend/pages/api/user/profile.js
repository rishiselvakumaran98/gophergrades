// pages/api/user/profile.js
import { createClient } from '@supabase/supabase-js';
import dbConnect from '../../../lib/mongoose';
import Profile from '../../../models/Profile';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';

// Disable Next.js's default body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

const convertTerm = (termCode) => {
  if (!termCode || typeof termCode !== 'string') return 'Unknown Term';
  const cleanedTermCode = termCode.replace(/\s+/g, ''); // Remove all spaces first, e.g., "F 19" -> "F19"
  const seasonMatch = cleanedTermCode.match(/^[A-Z]{1,2}/);
  const yearMatch = cleanedTermCode.match(/\d{2}$/);

  if (!seasonMatch || !yearMatch) return termCode; // Return original if format is unexpected

  const season = seasonMatch[0];
  const year = yearMatch[0];
  const fullYear = `20${year}`;

  switch (season) {
    case 'F': return `Fall ${fullYear}`;
    case 'SP': return `Spring ${fullYear}`;
    case 'SI': return `Summer ${fullYear}`; // Assuming SI for Summer
    default: return `${season} ${fullYear}`; // Fallback for other season codes
  }
};

const parseApasText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    console.log("[parseApasText] Received null, undefined, or empty text. Skipping parsing.");
    return {semesters: {}, transferCourses: []};
  }
  const semesters = {};
  const transferCourses = [];
  const courseRegex = /^(?<term>[A-Z]{1,2}\s?\d{2})(?<course>1[A-Z]{2,4}\d{3,4}[A-Z]?)(?<credit>\d\.\d)(?<grade>T\d{1,2}|N\d{1,2}|S[N]?|AF|IP|NG|W|V|[A-Z][\+\-]|[A-Z])(?<title>.*)/gm;
  
  let match;
  while ((match = courseRegex.exec(text)) !== null) {
    if (match.index === courseRegex.lastIndex) { // Avoid infinite loops with zero-width matches
        courseRegex.lastIndex++;
    }
    
    if (match.groups) {
      const { term, course, credit, grade, title } = match.groups;
      
      // Improved course code cleaning:
      // Removes the leading '1', then inserts a space between dept and number.
      // e.g., "1CSCI1133" -> "CSCI 1133", "1CSCI3081W" -> "CSCI 3081W"
      const courseCodeOnly = course.substring(1); // Remove leading '1'
      const deptMatch = courseCodeOnly.match(/^[A-Z]+/); // Get all leading letters
      const numSuffixMatch = courseCodeOnly.match(/\d+[A-Z]*$/); // Get numbers and any trailing letters

      let cleanedCourse = courseCodeOnly; // Fallback
      if (deptMatch && numSuffixMatch) {
          cleanedCourse = `${deptMatch[0]} ${numSuffixMatch[0]}`;
      }

      const courseObject = {
        course: cleanedCourse,
        credit: parseFloat(credit),
        grade: grade.trim(),
        title: title.trim(),
      };

      const semesterName = convertTerm(term);

      // console.log(`[parseApasText] Term: "${term}", Course: "${course}", Cleaned Course: "${cleanedCourse}", Credit: "${credit}", Grade: "${grade.trim()}", Title: "${title.trim()}", Semester: "${semesterName}"`);

      if (!semesters[semesterName]) {
        semesters[semesterName] = [];
      }
      // Check for duplicates based on cleaned course name AND title to handle retakes if titles differ
      if (courseObject.grade.startsWith('T') || courseObject.grade.startsWith('N')) { // Assuming 'N' grades are also transfer/non-standard for semester grouping
        if (!transferCourses.some(c => c.course === courseObject.course && c.grade === courseObject.grade)) { // More robust duplicate check
          transferCourses.push(courseObject);
        }
      } else {
        const semesterName = convertTerm(term);
        if (!semesters[semesterName]) {
          semesters[semesterName] = [];
        }
        if (!semesters[semesterName].some(c => c.course === courseObject.course  && c.grade === courseObject.grade)) { // More robust duplicate check
          semesters[semesterName].push(courseObject);
        }
      }
    }
  }
  if (Object.keys(semesters).length === 0 && transferCourses.length === 0) {
    console.warn("[parseApasText] No courses were extracted. Review regex against the full PDF text output if issues persist.");
  }
  return { semesters, transferCourses };
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => { resolve(JSON.parse(data || '{}')); });
    });

    const { session } = body;
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { user } = session;
    const isUmn = user.email.endsWith('@umn.edu');
    try {
        await Profile.findOneAndUpdate(
            { userId: user.id }, // Use the Supabase user ID as the unique identifier
            { 
              $set: {
                email: user.email,
                name: user.user_metadata?.full_name,
                isUmn,
              },
              $setOnInsert: { // Only set these for new users
                semesters: {},
                transferCourses: [],
              }
            },
            { new: true, upsert: true, runValidators: true }
        );
        return res.status(200).json({ success: true, message: "Profile created/updated." });
    } catch (error) {
        console.error("Error in POST /api/user/profile:", error);
        return res.status(500).json({ success: false, error: 'Database error on profile creation.' });
    }
  }

  // 1. Get the JWT from the Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  // 2. Verify the token with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // --- At this point, the user is authenticated ---

  if (req.method === 'GET') {
    try {
      const profile = await Profile.findOne({ userId: user.id });
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      return res.status(200).json({ profile });
    } catch (error) {
      return res.status(500).json({ error: 'Database error.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { fields, files } = await parseForm(req);
      let profileData = JSON.parse(Array.isArray(fields.profileData) ? fields.profileData[0] : fields.profileData);
      
      const apasReportFile = Array.isArray(files.apasReport) ? files.apasReport[0] : files.apasReport;
      
      if (apasReportFile) {
        const dataBuffer = fs.readFileSync(apasReportFile.filepath);
        const pdfData = await pdf(dataBuffer);
        
        // Parse the PDF text to get structured semester data
        const { semesters: parsedSemesters, transferCourses: parsedTransferCourses } = parseApasText(pdfData.text);

        // Merge parsed data with any existing manual entries
        profileData.semesters = { ...profileData.semesters, ...parsedSemesters };

        const existingTransferCourses = profileData.transferCourses || [];
        const combinedTransferCourses = [...existingTransferCourses];
        parsedTransferCourses.forEach(newCourse => {
            if (!combinedTransferCourses.some(c => c.course === newCourse.course)) {
                combinedTransferCourses.push(newCourse);
            }
        });
        profileData.transferCourses = combinedTransferCourses;
      }

      const filteredSemesters = {};
      for (const semesterName in profileData.semesters) {
        // Only keep the semester if its course list is not empty
        if (profileData.semesters[semesterName] && profileData.semesters[semesterName].length > 0) {
          filteredSemesters[semesterName] = profileData.semesters[semesterName];
        }
      }
      profileData.semesters = filteredSemesters;

      console.log("[BACKEND] Attempting to save this data to DB:", profileData);

      const updatedProfile = await Profile.findOneAndUpdate(
        { userId: user.id }, 
        { $set: profileData },
        { new: true, upsert: true, runValidators: true }
      );

      return res.status(200).json({ success: true, profile: updatedProfile });

    } catch (error) {
      console.error("Error processing PUT request:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}