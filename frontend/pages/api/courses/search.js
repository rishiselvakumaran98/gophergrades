// pages/api/courses/search.js
import { getEveryClassCode } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    const courses = await getEveryClassCode();

    // Format the data for react-select: { value: '...', label: '...' }
    const formattedCourses = courses.map(course => ({
      value: `${course.dept_abbr} ${course.course_num}`,
      label: `${course.dept_abbr} ${course.course_num}: ${course.class_desc}`
    }));
    
    res.status(200).json(formattedCourses);
  } catch (error) {
    console.error("Failed to fetch course codes:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}