import os
import numpy as np
import json
import time
import math
import concurrent.futures
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from sklearn.cluster import KMeans
from dotenv import load_dotenv
import tqdm # Use the notebook-friendly version of tqdm
import ollama

# --- 1. Configuration ---
print("Loading configuration...")
load_dotenv()
MONGO_URI = os.environ.get("MONGO_CONNECTION_STRING")
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

MONGO_DB_NAME = "test"
PROFESSORS_COLLECTION = "professors"
QDRANT_REVIEWS_COLLECTION = "professor_reviews"

# --- Hyperparameters ---
LOCAL_MODEL_NAME = "deepseek-r1:14b"
NUM_CLUSTERS = 6
PROFESSOR_BATCH_SIZE = 10
MAX_WORKERS = 1 # Adjust based on your GPU's ability to handle concurrent requests
print("Configuration loaded.")

# --- 2. LLM & Parsing Helper Functions ---

def extract_clean_summary(raw_output: str) -> str:
    """Parses the raw LLM output to extract the clean summary."""
    processed_text = raw_output
    if "</think>" in processed_text:
        processed_text = processed_text.split("</think>")[-1]
    if "---" in processed_text:
        processed_text = processed_text.split("---")[0]
    return processed_text.strip()

def summarize_reviews_for_theme(client, model_name, reviews, theme_description):
    """Uses the provided Ollama client to create a summary for a theme."""
    review_texts = "\n- ".join(reviews)
    prompt = f"""
    The following are student reviews for a professor that all discuss a similar theme: '{theme_description}'.
    Summarize the main point of these reviews in one or two concise sentences.
    
    Reviews:
    - {review_texts}
    
    Concise Summary:
    """
    try:
        response = client.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes student feedback."},
                {"role": "user", "content": prompt}
            ],
            options={'temperature': 0.3},
        )
        return extract_clean_summary(response['message']['content'])
    except Exception as e:
        print(f"Error during theme summary: {e}")
        return None

def create_final_summary_and_tags(client, model_name, themed_summaries, professor_name, department):
    """Generates a summary and tags using the provided Ollama client."""
    summaries_text = "\n- ".join(themed_summaries)
    prompt = f"""
        Act as a helpful academic advisor writing a brief, insightful summary for a course catalog about Professor {professor_name} from the {department} department.
        Based on the key themes provided below, please perform two tasks:

        TASK 1: Write a Summary
        - Weave the points together into a smooth, narrative paragraph.
        - Adopt a professional, yet approachable and slightly informal tone.
        - Mention Professor {professor_name} by name to make it more personal and less robotic.
        - When mentioning strengths or weaknesses, be specific. For example, instead of saying 'the professor has clarity in some areas,' use the provided themes to specify what those areas are (e.g., 'excels at explaining metabolic pathways but can be unclear about project deadlines').
        Advisor's Summary of Professor {professor_name}:

        TASK 2: Generate Tags
        - After writing the summary, generate a list of 4-5 short, descriptive tags (2-4 words each) that quickly summarize the professor's main characteristics.

        INSTRUCTIONS FOR OUTPUT:
        Provide the final output in a single, valid JSON object with exactly two keys: "summary" (containing the string from TASK 1) and "tags" (containing a list of strings from TASK 2).

        Key Themes from Reviews:
        - {summaries_text}

        JSON Output:
    """
    try:
        response = client.chat(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are an academic advisor who provides structured JSON output containing a summary and tags."},
                {"role": "user", "content": prompt}
            ],
            format='json',
            options={'temperature': 0.65}
        )
        data = json.loads(response['message']['content'])
        return data if "summary" in data and "tags" in data else {"summary": str(data), "tags": []}
    except Exception as e:
        print(f"Error during final summary generation: {e}")
        return {"summary": "AI summary could not be generated at this time.", "tags": []}

# --- 3. Worker Function for a Single Professor ---
def generate_summary_for_professor(professor_doc, config):
    """Complete end-to-end summary generation process for a single professor document."""
    # Create new, thread-safe client instances using the passed config
    qdrant_client = QdrantClient(url=config['QDRANT_URL'], api_key=config['QDRANT_API_KEY'])
    mongo_client = MongoClient(config['MONGO_URI'])
    db = mongo_client[config['MONGO_DB_NAME']]
    professors_collection = db[config['PROFESSORS_COLLECTION']]
    
    # Get the shared Ollama client and other parameters from the config
    ollama_client = config['ollama_client']
    model_name = config['LOCAL_MODEL_NAME']
    num_clusters = config['NUM_CLUSTERS']
    
    prof_id = professor_doc.get("_id")
    prof_name = professor_doc.get("name")
    prof_dept = professor_doc.get("department", "their department")

    try:
        review_points, _ = qdrant_client.scroll(
            collection_name=config['QDRANT_REVIEWS_COLLECTION'],
            scroll_filter=models.Filter(must=[models.FieldCondition(key="professor_id", match=models.MatchValue(value=prof_id))]),
            limit=500, with_payload=True, with_vectors=["review"]
        )
        
        valid_points = [p for p in review_points if p.vector and isinstance(p.vector.get('review'), list) and p.vector.get('review')]
        
        if len(valid_points) < num_clusters:
            return f"Skipped (Not enough valid reviews: {len(valid_points)})"

        vectors = np.array([point.vector['review'] for point in valid_points])
        kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init='auto').fit(vectors)
        
        clustered_reviews = {i: [] for i in range(num_clusters)}
        for i, point in enumerate(valid_points):
            cluster_id = kmeans.labels_[i]
            if point.payload and 'review_text' in point.payload:
                clustered_reviews[cluster_id].append(point.payload['review_text'])

        themed_summaries = [summary for i in range(num_clusters) if clustered_reviews[i] and (summary := summarize_reviews_for_theme(ollama_client, model_name, clustered_reviews[i], f"Theme {i+1}"))]

        if not themed_summaries:
            return "Skipped (Could not generate themes)"
        
        summary_data = create_final_summary_and_tags(ollama_client, model_name, themed_summaries, prof_name, prof_dept)
        
        professors_collection.update_one(
            {"_id": prof_id},
            {"$set": {
                "aiSummary": summary_data.get("summary"),
                "aiSummaryTags": summary_data.get("tags"),
                "summaryLastUpdated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
            }}
        )
        return "Success"
    except Exception as e:
        return f"Failed ({type(e).__name__}: {e})"
    finally:
        mongo_client.close()

# --- 4. Main Agent Logic ---
def main():
    print("Initializing Ollama Client...")
    # Create the expensive Ollama client once
    ollama_client = ollama.Client()
    ollama_client.show(LOCAL_MODEL_NAME) # Check that the model is available
    print("Ollama client initialized.")
    
    # Bundle all configuration into a single dictionary to pass to workers
    config = {
        'MONGO_URI': MONGO_URI, 'QDRANT_URL': QDRANT_URL, 'QDRANT_API_KEY': QDRANT_API_KEY,
        'MONGO_DB_NAME': MONGO_DB_NAME, 'PROFESSORS_COLLECTION': PROFESSORS_COLLECTION,
        'QDRANT_REVIEWS_COLLECTION': QDRANT_REVIEWS_COLLECTION,
        'ollama_client': ollama_client,
        'LOCAL_MODEL_NAME': LOCAL_MODEL_NAME,
        'NUM_CLUSTERS': NUM_CLUSTERS,
    }

    mongo_client_main = MongoClient(MONGO_URI)
    db_main = mongo_client_main[MONGO_DB_NAME]
    professors_collection_main = db_main[PROFESSORS_COLLECTION]

    page_number = 0
    while True:
        query = {"aiSummary": {"$exists": False}}
        skip_amount = page_number * PROFESSOR_BATCH_SIZE
        professors_to_process = list(professors_collection_main.find(query).skip(skip_amount).limit(PROFESSOR_BATCH_SIZE))

        if not professors_to_process:
            print("\n--- No more professors to process. All summaries are up to date. ---")
            break
        
        print(f"\n--- Processing Professor Batch #{page_number + 1} ({len(professors_to_process)} professors) ---")

        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_prof = {executor.submit(generate_summary_for_professor, prof, config): prof.get("name") for prof in professors_to_process}
            
            for future in tqdm(concurrent.futures.as_completed(future_to_prof), total=len(professors_to_process), desc="Processing Batch"):
                prof_name = future_to_prof[future]
                try:
                    result = future.result()
                    if result != "Success":
                        print(f"\n  - {prof_name}: {result}")
                except Exception as exc:
                    print(f"\n  - {prof_name} generated an exception: {exc}")

        page_number += 1

    mongo_client_main.close()

# --- Run Script ---
if __name__ == "__main__":
    main()
