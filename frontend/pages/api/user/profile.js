// pages/api/user/profile.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]'; // Adjust if your file name is different
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
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();
  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const profile = await Profile.findOne({ userId });
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
      // Now we can cleanly await the form parsing
      const { fields, files } = await parseForm(req);

      // Safely access profileData
      let profileData;

      if (fields.profileData) {
        const dataField = Array.isArray(fields.profileData) ? fields.profileData[0] : fields.profileData;
        profileData = JSON.parse(dataField);
      } else {
        return res.status(400).json({ error: 'Profile data is missing.' });
      }

      // --- ADD THESE LOGS ---
      console.log("3. [BACKEND] Parsed profileData object:", profileData);

      // This is the most important log. We see what we are sending to the DB.
      console.log(`4. [BACKEND] Attempting to find and update profile for userId: ${userId}`);
      

      // Update profile in MongoDB
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId: userId },
        { $set: profileData },
        { new: true, upsert: true, runValidators: true }
      );

      // Process the uploaded PDF if it exists
      const apasReportFile = Array.isArray(files.apasReport) ? files.apasReport[0] : files.apasReport;
      if (apasReportFile) {
        console.log(`Processing uploaded file: ${apasReportFile.originalFilename}`);
        const dataBuffer = fs.readFileSync(apasReportFile.filepath);
        const pdfData = await pdf(dataBuffer);
        console.log("Extracted Text (first 500 chars):", pdfData.text.substring(0, 500));
        // TODO: Trigger your analysis and embedding logic here
      }

      // This log tells us what the DB returned AFTER the update.
      console.log("5. [BACKEND] Profile after findOneAndUpdate:", updatedProfile);

      // (Your PDF processing logic would go here)


      // If everything is successful, send the final response
      return res.status(200).json({ success: true, profile: updatedProfile });

    } catch (error) {
      console.error("Error processing PUT request:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}