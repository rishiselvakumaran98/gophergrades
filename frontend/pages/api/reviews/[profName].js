import { getProfessorReviews } from "../../../lib/mongodb";

export default async function handler(req, res) {
  const { profName, page } = req.query;

  if (req.method === 'GET') {
    if (!profName) {
      return res.status(400).json({ error: 'Professor name is required' });
    }

    try {
      // Parse page number, default to 1 if not provided or invalid
      const pageNum = parseInt(page, 10) || 1;
      const reviewsData = await getProfessorReviews(profName, pageNum);

      if (reviewsData && reviewsData.reviews.length > 0) {
        return res.status(200).json(reviewsData);
      } else {
        // It's okay if there are no more reviews, just return an empty array
        return res.status(200).json({ reviews: [], currentPage: pageNum, totalPages: pageNum, totalReviews: 0 });
      }
    } catch (error) {
      console.error("API Error fetching reviews:", error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    // Only allow GET requests for this endpoint
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
