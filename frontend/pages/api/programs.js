// pages/api/programs.js
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongoose';
import Program from '../../models/Program';

export default async function handler(req, res) {
  await dbConnect();
  
  try {
    const searchQuery = req.query.q || ''; // Allow searching via query parameter
    
    const programs = await Program.find({
      // Use a regex for case-insensitive "contains" search
      name: { $regex: searchQuery, $options: 'i' } 
    })

    // Format for react-select
    const formattedForSelect = programs.map(p => ({
      value: p._id, // Use the unique DB id as the value
      label: p.name
    }));

    res.status(200).json({ programs: formattedForSelect });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}