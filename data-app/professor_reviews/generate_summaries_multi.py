import os
import numpy as np
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from sklearn.cluster import KMeans
from dotenv import load_dotenv
import time
import ollama
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

# --- 1. Configuration ---
load_dotenv()
MONGO_URI = os.environ.get("MONGO_CONNECTION_STRING")
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

MONGO_DB_NAME = "test"
PROFESSORS_COLLECTION = "professors"
QDRANT_REVIEWS_COLLECTION = "professor_reviews"

# --- Hyperparameters for the Agent ---
NUM_CLUSTERS = 6
PROFESSOR_BATCH_SIZE = 10  # This is now the size of the batch for tqdm
MAX_PROFESSOR_WORKERS = 4 # Number of professors to process in parallel
MAX_THEME_WORKERS = 6     # Number of themes to summarize in parallel for a single professor

# Initialize a single Ollama client to be shared across threads
# Ollama's client is generally thread-safe.
local_llm_client = ollama.Client()
try:
    local_llm_client.show("deepseek-r1:14b")
    LOCAL_MODEL_NAME = "deepseek-r1:14b"
    print("Ollama AI client initialized and connected.")
except Exception as e:
    print(f"Error connecting to Ollama: {e}")
    exit()

# --- 2. LLM Helper Functions (Mostly Unchanged) ---

def extract_clean_summary(raw_output: str) -> str:
    """
    Parses the raw LLM output to extract the clean summary.
    It handles <think> blocks and --- separators for explanations.
    """
    # Start with the full raw output
    processed_text = raw_output
    
    # 1. If <think> blocks exist, take the content after the last one.
    if "</think>" in processed_text:
        processed_text = processed_text.split("</think>")[-1]

    # 2. THE FIX: If a "---" separator exists, take the content before it.
    if "---" in processed_text:
        processed_text = processed_text.split("---")[0]
        
    # 3. Return the cleaned, stripped text.
    return processed_text.strip()

def summarize_reviews_for_theme(reviews, theme_description):
    """Uses the LOCAL LLM to create a summary for a specific group of reviews."""
    review_texts = "\n- ".join(reviews)
    
    prompt = f"""
    The following are student reviews for a professor that all discuss a similar theme: '{theme_description}'.
    Summarize the main point of these reviews in one or two concise sentences.
    
    Reviews:
    - {review_texts}
    
    Concise Summary:
    """
    try:
        # THE FIX: Use the local client and model name
        response = local_llm_client.chat( # type: ignore
            model=LOCAL_MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes student feedback."},
                {"role": "user", "content": prompt}
            ],
            options={'temperature': 0.3},
        )
        raw_output = response['message']['content']
        # The raw output is now parsed by the improved function
        return extract_clean_summary(raw_output)
    except Exception as e:
        print(f"Error summarizing theme with local LLM: {e}")
        return None
    

def create_final_holistic_summary(themed_summaries, professor_name, department):
    """
    Combines themes into a final summary using an advanced, context-aware prompt.
    """
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
        response = local_llm_client.chat(
            model=LOCAL_MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are an academic advisor who writes insightful and balanced summaries about professors for students."},
                {"role": "user", "content": prompt}
            ],
            options={'temperature': 0.65}
        )
        raw_output = response['message']['content']

        if not raw_output:
            return {"summary": "AI summary could not be generated at this time.", "tags": []}

        # --- Start of the fix ---
        # 1. Remove the <think> block first
        if "</think>" in raw_output:
            raw_output = raw_output.split("</think>")[-1]

        # 2. Clean up potential markdown formatting around the JSON
        clean_json_str = raw_output.strip().replace("```json", "").replace("```", "").strip()
        # --- End of the fix ---

        try:
            data = json.loads(clean_json_str)
            # Basic validation to ensure we have the expected structure
            if isinstance(data, dict) and "summary" in data and "tags" in data:
                 return data
            else:
                 # If parsing succeeds but the structure is wrong, return the cleaned string
                 return {"summary": clean_json_str, "tags": []}
        except (json.JSONDecodeError, TypeError):
             # If JSON parsing fails, return the cleaned output for debugging
            return {"summary": clean_json_str, "tags": []}

    except Exception as e:
        print(f"Error creating final summary with local LLM: {e}")
        return {"summary": "AI summary could not be generated due to an error.", "tags": []}  


# --- 3. Main Processing Logic ---

def process_single_professor(professor_doc):
    """
    Encapsulated logic to process one professor.
    This function is designed to be called by a thread.
    """
    prof_id = professor_doc.get("_id")
    prof_name = professor_doc.get("name", "Unknown Professor")
    prof_dept = professor_doc.get("department", "their department")

    # Each thread should get its own client instances
    qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[MONGO_DB_NAME]
    professors_collection = db[PROFESSORS_COLLECTION]

    try:
        review_points, _ = qdrant_client.scroll(
            collection_name=QDRANT_REVIEWS_COLLECTION,
            scroll_filter=models.Filter(must=[
                models.FieldCondition(key="professor_id", match=models.MatchValue(value=str(prof_id)))
            ]),
            limit=500,
            with_payload=True,
            with_vectors=["review"]
        )
    except Exception:
        return f"Failed to fetch reviews for {prof_name}"

    if len(review_points) < NUM_CLUSTERS:
        return f"Skipped {prof_name}: Not enough reviews ({len(review_points)})"

    # --- Clustering ---
    vectors = np.array([point.vector['review'] for point in review_points])
    kmeans = KMeans(n_clusters=NUM_CLUSTERS, random_state=42, n_init='auto').fit(vectors)
    clustered_reviews = {i: [] for i in range(NUM_CLUSTERS)}
    for i, point in enumerate(review_points):
        cluster_id = kmeans.labels_[i]
        clustered_reviews[cluster_id].append(point.payload['review_text'])

    # --- Parallel Summarization of Themes ---
    themed_summaries = []
    with ThreadPoolExecutor(max_workers=MAX_THEME_WORKERS) as executor:
        future_to_theme = {
            executor.submit(summarize_reviews_for_theme, reviews, f"Theme {i+1}"): i
            for i, reviews in clustered_reviews.items() if reviews
        }
        for future in as_completed(future_to_theme):
            summary = future.result()
            if summary:
                themed_summaries.append(summary)

    if not themed_summaries:
        return f"Skipped {prof_name}: Could not generate themed summaries."

    # --- Final Summary Generation ---
    summary_data = create_final_holistic_summary(themed_summaries, prof_name, prof_dept)

    # --- Update MongoDB ---
    try:
        professors_collection.update_one(
            {"_id": prof_id},
            {"$set": {
                "aiSummary": summary_data.get("summary"),
                "aiSummaryTags": summary_data.get("tags"),
                "summaryLastUpdated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
            }}
        )
        mongo_client.close()
        return f"Successfully updated {prof_name}"
    except Exception as e:
        mongo_client.close()
        return f"Failed to update MongoDB for {prof_name}: {e}"


def run_processing_pipeline():
    """
    Main pipeline to fetch professors and process them in parallel.
    """
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[MONGO_DB_NAME]
    professors_collection = db[PROFESSORS_COLLECTION]
    
    page_number = 0
    while True:
        # Fetch a batch of professors that need processing
        query = {"aiSummary": {"$exists": False}}
        skip_amount = page_number * PROFESSOR_BATCH_SIZE
        
        # We fetch one batch at a time, but process its contents in parallel
        professors_to_process = list(
            professors_collection.find(query)
            .limit(PROFESSOR_BATCH_SIZE)
        )

        if not professors_to_process:
            print("\n--- No more professors to process. All summaries are up to date. ---")
            break
            
        print(f"\n--- Processing a batch of {len(professors_to_process)} professors ---")

        # Process the batch in parallel using a ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=MAX_PROFESSOR_WORKERS) as executor:
            # Create a future for each professor in the batch
            future_to_prof = {executor.submit(process_single_professor, prof): prof for prof in professors_to_process}
            
            # Use tqdm to create a progress bar for the batch
            progress_bar = tqdm(as_completed(future_to_prof), total=len(professors_to_process), desc="Summarizing Professors")
            
            for future in progress_bar:
                result = future.result()
                # You can update the progress bar description with the result
                progress_bar.set_postfix_str(result)

        # The 'while True' loop is now just for fetching new batches, 
        # so we don't need the page_number increment anymore unless we re-introduce skipping.
        # If your collection is very large, you might re-add the .skip() functionality.

    mongo_client.close()


if __name__ == "__main__":
    run_processing_pipeline()