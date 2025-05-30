// pages/api/seed-programs.js
import dbConnect from '../../lib/mongoose';
import Program from '../../models/Program';

// THIS IS THE NEW, CORRECT API ENDPOINT
const COURSE_DOG_API_URL = 'https://app.coursedog.com/api/v1/cm/umn_umntc_peoplesoft/programs/search/%24filters?catalogId=QEPaNgPjyzEkVlRYv42S&skip=0&limit=1000&sortBy=catalogDisplayName%2CtranscriptDescription%2ClongName%2Cname&effectiveDatesRange=2025-09-02%2C2032-12-15&columns=name%2Ctype%2CdegreeDesignation%2Ccontacts%2ClongName%2CcatalogDisplayName%2CtranscriptDescription%2CcatalogDescription%2CcatalogImageUrl%2CcipCode%2Ccampus%2Clevel';

// This is the JSON data payload to send with the request
const requestPayload = {
  "condition": "AND",
  "filters": [{
    "condition": "and",
    "filters": [{
      "id": "cdProgramDisplayCatalog-program",
      "name": "cdProgramDisplayCatalog",
      "inputType": "boolean",
      "group": "program",
      "type": "isNot",
      "value": false,
      "customField": true
    }, {
      "id": "cdProgramStatus-program",
      "name": "cdProgramStatus",
      "inputType": "select",
      "group": "program",
      "type": "isNot",
      "value": "Discontinued",
      "customField": true
    }]
  }]
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    console.log("Fetching data from the correct CourseDog API Endpoint...");
    
    // This fetch call now perfectly matches your cURL command
    const apiResponse = await fetch(COURSE_DOG_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://umtc.catalog.prod.coursedog.com',
        'Referer': 'https://umtc.catalog.prod.coursedog.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'X-Requested-With': 'catalog'
        // Add any other headers from the cURL if needed, but these are the key ones
      },
      body: JSON.stringify(requestPayload),
    });

    const contentType = apiResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await apiResponse.text();
      console.error("API did not return JSON. Response:", errorText);
      throw new Error(`Expected JSON response but got ${contentType}.`);
    }

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error("CourseDog API returned an error:", errorData);
      throw new Error(`CourseDog API responded with status ${apiResponse.status}.`);
    }
    
    const responseData = await apiResponse.json();
    // IMPORTANT: The actual program data is inside the 'data' property
    const programs = responseData.data;

    if (!programs || programs.length === 0) {
      throw new Error("No programs found in API response data.");
    }

    console.log(`Found ${programs.length} programs. Preparing for database.`);

    const formattedPrograms = programs.map(p => {
      return {
        ...p, // Keep all the original fields from the program object
        _id: p.id // Explicitly set the `_id` to the value from the `id` field
      };
    });

    console.log("Deleting old programs from DB...");
    await Program.deleteMany({});

    console.log("Inserting new programs into DB...");
    await Program.insertMany(formattedPrograms);

    res.status(200).json({ success: true, message: `Successfully seeded ${programs.length} programs.` });

  } catch (error) {
    console.error("Seeding script failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}