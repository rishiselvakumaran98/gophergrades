// lib/mongodb.js
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Fetches the AI summary and tags for a given professor from MongoDB.
 * @param {string} profName - The name of the professor to look up.
 * @returns {Promise<Object|null>} An object containing aiSummary and aiSummaryTags, or null if not found.
 */
export async function getProfessorSummary(profName) {
  try {
    const client = await clientPromise;
    const db = client.db("test"); // Use your database name
    const nameRegex = new RegExp(`^${profName.trim()}$`, "i");

    // Remove the projection to fetch the entire document
    const professor = await db.collection('professors').findOne({ name: nameRegex });

    if (professor) {
      // Safely access nested summary object
      const summaryData = professor.summary || {};

      // Return a structured object with default null values
      return {
        name: professor.name || null,
        department: professor.department || null,
        rmpLink: professor.rmpLink || null,
        summaryLastUpdated: professor.summaryLastUpdated || null,
        avgQuality: summaryData.avgQuality || null,
        avgDifficulty: summaryData.avgDifficulty || null,
        totalReviews: summaryData.totalReviews || null,
        aiSummary: professor.aiSummary || null,
        aiSummaryTags: professor.aiSummaryTags || [], // Default to empty array for tags
      };
    }
    
    return null;

  } catch (e) {
    console.error("Error fetching from MongoDB", e);
    return null;
  }
}

/**
 * Fetches paginated reviews for a given professor.
 * @param {string} profName - The name of the professor.
 * @param {number} page - The page number to fetch.
 * @returns {Promise<Object|null>} An object with reviews and pagination data.
 */
export async function getProfessorReviews(profName, page = 1) {
  if (!profName) return null;

  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  try {
    const client = await clientPromise;
    const db = client.db("test");
    const nameRegex = new RegExp(`^${profName.trim()}$`, "i");

    const reviewsCollection = db.collection("reviews");
    await reviewsCollection.createIndex({ "professorName": 1 });

    const totalReviews = await reviewsCollection.countDocuments({ professorName: nameRegex });
    if (totalReviews === 0) return null;

    const reviews = await reviewsCollection
      .find({ professorName: nameRegex })
      .sort({ date: -1 }) // Sort by most recent date
      .skip(skip)
      .limit(pageSize)
      .toArray();

    // Sanitize the data for Next.js serialization
    const sanitizedReviews = reviews.map(review => ({
      ...review,
      _id: review._id.toString(), // Convert ObjectId to string
      date: new Date(review.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
    }));

    return {
      reviews: sanitizedReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / pageSize),
      totalReviews,
    };
  } catch (e) {
    console.error("Error fetching reviews from MongoDB", e);
    return null;
  }
}

export default clientPromise;