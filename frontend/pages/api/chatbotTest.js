export default function handler(req, res) {
  const { query } = req.body;
  // This is a sample test API. Replace with real LLM integration.
  res.status(200).json({ reply: `Test response for: "${query}"` });
}