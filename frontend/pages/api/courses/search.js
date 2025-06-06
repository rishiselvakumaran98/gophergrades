// pages/api/courses/search.js
import { getSearch } from '../../../lib/db';

export default async function handler(req, res) {
  // 1. Get the user's typed query from the request URL
  const searchQuery = req.query.q || "";

  // 2. Don't search if the query is too short
  if (searchQuery.length < 2) {
    return res.status(200).json([]); // Return an empty array
  }

  try {
    const searchResults = await getSearch(searchQuery);

    // Format the data for react-select: { value: '...', label: '...' }
    const formattedCourses = searchResults.classes.map((course) => ({
      value: course.class_name,
      label: `${course.class_name}: ${course.class_desc}`,
    }));
    
    res.status(200).json(formattedCourses);
  } catch (error) {
    console.error("Failed to fetch course codes:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}