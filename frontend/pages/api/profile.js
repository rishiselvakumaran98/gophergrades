// pages/api/profile.js
import { createClient } from '@supabase/supabase-js';
import dbConnect from '../../lib/mongoose';
import Profile from '../../models/Profile';

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // 2. Verify the token using Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  await dbConnect();
  const userId = user.id;

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
      const profileData = req.body;
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId: userId },
        { $set: profileData },
        { new: true, runValidators: true }
      );

      if (!updatedProfile) {
        return res.status(404).json({ error: 'Profile not found.' });
      }
      return res.status(200).json({ success: true, profile: updatedProfile });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}