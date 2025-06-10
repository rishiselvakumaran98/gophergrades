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

# Ollama Configuration
OLLAMA_MODEL = "gemma3:12b"

# Processing Configuration
BATCH_SIZE = 20 # Adjust based on your PC's performance.

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
    """Main function to process reviews and update MongoDB."""
    try:
        mongo_client = pymongo.MongoClient(MONGO_URI)
        db = mongo_client[DB_NAME]
        collection = db[COLLECTION_NAME]
        print("Successfully connected to MongoDB.")
    except errors.ConnectionFailure as e:
        print(f"Could not connect to MongoDB: {e}")
        return

    # Create a query to find documents that haven't been processed yet
    query = {"label": {"$exists": False}}
    total_docs_to_process = collection.count_documents(query)

    if total_docs_to_process == 0:
        print("No new reviews to process. All documents are already updated.")
        return

    print(f"Found {total_docs_to_process} reviews to process.")

    # Process documents in batches
    cursor = collection.find(query).batch_size(BATCH_SIZE)
    
    with tqdm(total=total_docs_to_process, desc="Processing Reviews") as pbar:
        batch = []
        for doc in cursor:
            batch.append(doc)
            if len(batch) >= BATCH_SIZE:
                process_batch(collection, batch)
                pbar.update(len(batch))
                batch = []
        
        # Process the final remaining batch
        if batch:
            process_batch(collection, batch)
            pbar.update(len(batch))

    mongo_client.close()
    print("\nFinished processing all reviews.")


def process_batch(collection, batch):
    """Processes a batch of documents and performs a bulk update."""
    bulk_operations = []
    for doc in batch:
        review_text = doc.get("reviewText")
        doc_id = doc["_id"]

        if not review_text or not review_text.strip():
            continue

        # --- Task 1: Generate the label ---
        label_prompt = LABEL_PROMPT_TEMPLATE.format(review_text=review_text)
        label = call_ollama(label_prompt)

        if label not in ["positive", "negative"]:
            print(f"\nSkipping doc {doc_id} due to invalid label: '{label}'")
            continue

        # --- Task 2: Generate the ReviewQualities tags ---
        tags_prompt = TAGS_PROMPT_TEMPLATE.format(review_text=review_text)
        review_qualities = call_ollama(tags_prompt, is_json=True)

        if not review_qualities:
             print(f"\nSkipping doc {doc_id} due to invalid tags response.")
             continue
        
        bulk_operations.append(
            pymongo.UpdateOne(
                {"_id": doc_id},
                {"$set": {"label": label, "ReviewQualities": review_qualities}}
            )
        )
    
        try:
            collection.bulk_write(bulk_operations, ordered=False)
        except errors.BulkWriteError as bwe:
            print(f"\nBulk write error occurred: {bwe.details}")
            print(f"\nBulk write error occurred: {bwe.details}")


if __name__ == "__main__":
    main()