import pymongo
from pymongo import errors
import ollama # <--- Changed from 'requests'
import json
from tqdm import tqdm
import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file


# --- Configuration ---
# MongoDB Connection
MONGO_URI = os.getenv("MONGO_CONNECTION_STRING")
DB_NAME = "test" # <--- IMPORTANT: Change this to your database name
COLLECTION_NAME = "reviews"
OUTPUT_FILENAME = "sample_reviews_with_llm_data.json"

# Ollama Configuration
OLLAMA_MODEL = "gemma3:12b"

# Processing Configuration
SAMPLE_SIZE = 20 # Adjust based on your PC's performance.

# --- Prompts (Unchanged) ---
LABEL_PROMPT_TEMPLATE = """
Analyze the sentiment of the following student review. Respond with only a single word: either "positive" or "negative". Do not provide any explanation or punctuation.

Review: "{review_text}"

"""
TAGS_PROMPT_TEMPLATE = """
Read the following student review and identify its positive and negative qualities.
Generate up to 5 tags for each category. If a category has no relevant tags, provide an empty list.

Review: "{review_text}"

Respond with ONLY a valid JSON object in the following format:
{{"Positive": ["tag1", "tag2"], "Negative": ["tag3", "tag4"]}}
"""

# --- Initialize Ollama Client ---
# The client will automatically connect to http://localhost:11434
try:
    client = ollama.Client()
    # A quick check to see if the model is available
    client.show(OLLAMA_MODEL)
    print(f"Successfully connected to Ollama and found model '{OLLAMA_MODEL}'.")
except Exception as e:
    print(f"Error connecting to Ollama or finding model: {e}")
    print("Please ensure Ollama is running and you have pulled the model.")
    # Exit if we can't connect to our core processor
    exit()


def call_ollama(prompt, is_json=False):
    """Calls the Ollama API using the official library and returns the response."""
    try:
        # Use the ollama.generate function
        response = client.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            stream=False,
            format='json' if is_json else '',
            options={
                "temperature": 0.0,
            }
        )
        
        content = response.get("response", "").strip()

        if is_json:
            # The 'format: json' mode ensures the output is a valid JSON string
            return json.loads(content)
        else:
            return content

    except ollama.ResponseError as e:
        print(f"\nOllama API Error: {e.error}")
        return None
    except json.JSONDecodeError as e:
        print(f"\nError decoding JSON from LLM response: {e}")
        # Return a default error structure
        return {"Positive": [], "Negative": ["Error processing review"]}


def main():
    """Fetches a sample of reviews, processes them with an LLM, and saves to a local JSON file."""
    # Connect to MongoDB
    try:
        mongo_client = pymongo.MongoClient(MONGO_URI)
        db = mongo_client[DB_NAME]
        collection = db[COLLECTION_NAME]
        print("Successfully connected to MongoDB.")
    except errors.ConnectionFailure as e:
        print(f"Could not connect to MongoDB: {e}")
        return

    # Fetch a limited sample of documents
    print(f"Fetching {SAMPLE_SIZE} reviews to process as a sample...")
    cursor = collection.find().limit(SAMPLE_SIZE)
    
    # This list will hold all our results
    results_list = []

    for doc in tqdm(cursor, total=SAMPLE_SIZE, desc="Processing Sample"):
        review_text = doc.get("reviewText")
        if not review_text or not review_text.strip():
            continue

        # --- Generate LLM data ---
        label_prompt = LABEL_PROMPT_TEMPLATE.format(review_text=review_text)
        label = call_ollama(label_prompt)

        tags_prompt = TAGS_PROMPT_TEMPLATE.format(review_text=review_text)
        review_qualities = call_ollama(tags_prompt, is_json=True)
        
        # --- Combine original data with new LLM data ---
        # Handle the MongoDB ObjectId so it can be written to JSON
        doc['_id'] = str(doc['_id'])
        
        # Add the new fields
        doc['llm_generated_label'] = label
        doc['llm_generated_ReviewQualities'] = review_qualities
        
        results_list.append(doc)

    # --- Write the combined data to a local JSON file ---
    try:
        with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
            # Use indent=4 for pretty, human-readable output
            json.dump(results_list, f, indent=4, ensure_ascii=False)
        print(f"\nSuccessfully saved sample output to '{OUTPUT_FILENAME}'")
    except IOError as e:
        print(f"Error writing to file: {e}")

    mongo_client.close()

if __name__ == "__main__":
    main()