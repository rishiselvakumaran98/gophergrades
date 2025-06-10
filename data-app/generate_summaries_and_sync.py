# generate_summaries_and_sync.py

import os
import json
import time
import random
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from datetime import datetime
import ollama

# --- CONFIGURATION ---
MONGO_CONNECTION_STRING = os.environ.get("MONGO_CONNECTION_STRING")
MONGO_DB_NAME = "test" # Or "test"
PROFESSORS_COLLECTION_NAME = "professors"
REVIEWS_COLLECTION_NAME = "reviews"

# QDRANT CLOUD - Get these from your Qdrant Cloud dashboard
QDRANT_URL = os.environ.get("QDRANT_URL", "your_qdrant_cluster_url_goes_here")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "your_qdrant_api_key_goes_here")
QDRANT_COLLECTION_NAME = "professor_reviews"

VECTOR_SIZE = 384 # From the 'all-MiniLM-L6-v2' model

# --- CLIENT AND MODEL INITIALIZATION ---
print("Initializing clients and loading embedding model...")
try:
    mongo_client = MongoClient(MONGO_CONNECTION_STRING)
    db = mongo_client[MONGO_DB_NAME]
    reviews_collection = db[REVIEWS_COLLECTION_NAME]
    professors_collection = db[PROFESSORS_COLLECTION_NAME]
    
    qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    ollama_client = ollama.Client()
    # A quick check to make sure the model is available
    ollama_client.show("llama3:8b") 
    print("Ollama AI client initialized and connected.")
    
    EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    print("All clients and models initialized successfully.")
except Exception as e:
    print(f"Initialization failed: {e}")
    exit()

def setup_qdrant_collection():
    """Ensures the Qdrant collection exists with the correct multi-vector configuration."""
    try:
        qdrant_client.recreate_collection(
            collection_name=QDRANT_COLLECTION_NAME,
            vectors_config={
                "reviewText": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
                "tags": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
                "qualityDifficulty": models.VectorParams(size=VECTOR_SIZE, distance=models.Distance.COSINE),
            },
        )
        print(f"Qdrant collection '{QDRANT_COLLECTION_NAME}' created/re-created successfully.")
    except Exception as e:
        print(f"Could not create Qdrant collection (it may already exist with a different config): {e}")

def create_prompt_for_professor(professor_name, reviews):
    """Constructs a detailed prompt for the LLM based on a professor's reviews."""
    if len(reviews) < 3: # Require a minimum number of reviews for a good summary
        return None

    # Aggregate stats and tags from the provided reviews
    total_quality = sum(r['quality'] for r in reviews if r.get('quality') is not None)
    avg_quality = total_quality / len(reviews) if len(reviews) > 0 else 0

    total_difficulty = sum(r['difficulty'] for r in reviews if r.get('difficulty') is not None)
    avg_difficulty = total_difficulty / len(reviews) if len(reviews) > 0 else 0
    
    all_tags = [tag for r in reviews for tag in r.get('tags', [])]
    tag_counts = {tag: all_tags.count(tag) for tag in set(all_tags)}
    most_common_tags = [tag for tag, count in sorted(tag_counts.items(), key=lambda item: item[1], reverse=True)[:5]]
    
    # Take a representative sample of reviews to keep the prompt from getting too long
    sample_reviews = random.sample(reviews, min(len(reviews), 15))
    review_texts_sample = [f'- "{r["reviewText"]}"' for r in sample_reviews if r.get("reviewText")]

    prompt = f"""
    You are an expert data analyst. Your task is to analyze student feedback about a university professor and generate a neutral, balanced, and concise summary. Your response MUST be a single, valid JSON object and nothing else.

    CONTEXT:
    Here is the aggregated data for Professor {professor_name}:

    Overall Statistics:
    - Average Quality Rating: {avg_quality:.1f} / 5.0
    - Average Difficulty Rating: {avg_difficulty:.1f} / 5.0
    - Total Reviews Analyzed: {len(reviews)}
    - Most Common Student-Provided Tags: {most_common_tags}

    A Representative Sample of Student Reviews:
    {chr(10).join(review_texts_sample)}

    YOUR TASK:
    Based ONLY on the context provided, perform two tasks and provide the output in the specified JSON format.

    1. "summary": Write a concise, impartial one-paragraph summary (3-4 sentences) describing the professor's teaching style, workload, and student sentiment.
    2. "qualities": Identify and list up to 8 distinct, characteristic "quality points" that students frequently mention. These should be short, actionable phrases (1-3 words each). Categorize them into "pros" and "cons" from a typical student's perspective.

    REQUIRED JSON OUTPUT FORMAT:
    {{
      "summary": "A concise, well-written paragraph summarizing the professor based on the provided data.",
      "qualities": {{
        "pros": ["Example: Engaging Lecturer", "Example: Gives Great Feedback"],
        "cons": ["Example: Tough Grader", "Example: Lots of Homework"]
      }}
    }}
    """
    return prompt

def process_and_summarize_all_professors():
    """Main function to iterate through professors, generate summaries, and save them."""
    
    # Get all professors from our professors collection
    all_professors = list(professors_collection.find({}, {"name": 1}))
    print(f"\nFound {len(all_professors)} professors to process.")

    for prof_summary in all_professors:
        prof_id = prof_summary['_id']
        prof_name = prof_summary['name']

        print(f"\n--- Processing Professor: {prof_name} (ID: {prof_id}) ---")

        # 1. Fetch all reviews for this professor from the reviews collection
        reviews = list(reviews_collection.find({"professorRmpId": prof_id}))

        if not reviews:
            print("  -> No reviews found in the database. Skipping.")
            continue
        
        # 2. Create the prompt
        prompt = create_prompt_for_professor(prof_name, reviews)
        if not prompt:
            print(f"  -> Not enough reviews to generate a summary for {prof_name}. Skipping.")
            continue
            
        # 3. Call the local LLM via Ollama
        print(f"  -> Sending prompt for {prof_name} to local Ollama (gemma3:12b)...")
        try:
            response = ollama_client.chat(
                model='gemma3:12b',
                messages=[{'role': 'user', 'content': prompt}],
                format='json',
                options={'temperature': 0.2}
            )
            
            response_content = response['message']['content']
            ai_data = json.loads(response_content)
            
            # 4. Save the result back to the professor's document in MongoDB
            update_result = professors_collection.update_one(
                {"_id": prof_id},
                {
                    "$set": {
                        "aiSummary": ai_data.get("summary"),
                        "aiQualities": ai_data.get("qualities"),
                        "summaryLastGenerated": datetime.utcnow()
                    }
                }
            )
            
            if update_result.modified_count > 0 or update_result.upserted_id is not None:
                print(f"  -> Successfully generated and saved summary for {prof_name}.")
            else:
                print(f"  -> Generated summary, but failed to update document for {prof_name}.")

        except Exception as e:
            print(f"  -> ERROR: An error occurred while processing {prof_name}: {e}")
        
        # Optional: Add a small delay between professors
        time.sleep(1)


if __name__ == "__main__":
    process_and_summarize_all_professors()
    if mongo_client:
        mongo_client.close()
    print("\n--- AI summary generation process complete. ---")