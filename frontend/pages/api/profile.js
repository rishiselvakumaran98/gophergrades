// pages/api/profile.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]'; // Adjust if your file name is different
import dbConnect from '../../../lib/mongoose';
import Profile from '../../../models/Profile';

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