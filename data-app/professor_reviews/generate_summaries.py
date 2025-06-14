import os
import numpy as np
from pymongo import MongoClient
from qdrant_client import QdrantClient, models
from sklearn.cluster import KMeans
from dotenv import load_dotenv
import time
import ollama

# --- 1. Configuration ---
load_dotenv()
MONGO_URI = os.environ.get("MONGO_CONNECTION_STRING")
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

MONGO_DB_NAME = "test"
PROFESSORS_COLLECTION = "professors"
QDRANT_REVIEWS_COLLECTION = "professor_reviews"

local_llm_client = ollama.Client()
# A quick check to make sure the model is available
local_llm_client.show("deepseek-r1:14b")
LOCAL_MODEL_NAME = "deepseek-r1:14b"  # Change this to your local model name if different
print("Ollama AI client initialized and connected.")

# --- Hyperparameters for the Agent ---
# The number of distinct themes you want to find in the reviews. 5-7 is often a good start.
NUM_CLUSTERS = 6 

PROFESSOR_BATCH_SIZE = 10

# --- 2. LLM Helper Functions ---

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
    
    # THE FIX: A more sophisticated, context-aware prompt
    prompt = f"""
    Act as a helpful academic advisor writing a brief, insightful summary for a course catalog about Professor {professor_name} from the {department} department.
    Your goal is to give students a realistic and fair picture of what to expect, based on the following key points from past student reviews.

    Please follow these guidelines:
    - Weave the points together into a smooth, narrative paragraph.
    - Adopt a professional, yet approachable and slightly informal tone.
    - Mention Professor {professor_name} by name to make it more personal and less robotic.
    - When mentioning strengths or weaknesses, be specific. For example, instead of saying 'the professor has clarity in some areas,' use the provided themes to specify what those areas are (e.g., 'excels at explaining metabolic pathways but can be unclear about project deadlines').

    Key Themes from Reviews:
    - {summaries_text}

    Advisor's Summary of Professor {professor_name}:
    """
    try:
        response = local_llm_client.chat(
            model=LOCAL_MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are an academic advisor who writes insightful and balanced summaries about professors for students."},
                {"role": "user", "content": prompt}
            ],
            options={'temperature': 0.65} # Higher temp for more natural, less repetitive language
        )
        raw_output = response['message']['content']
        # The raw output is now parsed by the improved function
        return extract_clean_summary(raw_output)
    except Exception as e:
        print(f"Error creating final summary with local LLM: {e}")
        return "AI summary could not be generated at this time."


# --- 3. Main Agent Logic ---
def process_professors():
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client[MONGO_DB_NAME]
    professors_collection = db[PROFESSORS_COLLECTION]
    
    qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    page_number = 0
    
    while True:
        print(f"\n--- Processing Professor Batch #{page_number + 1} ---")
        
        # Define the query to find professors that need an AI summary
        query = {"aiSummary": {"$exists": False}}
        
        # THE FIX: Fetch only a small batch of professors in each loop iteration
        skip_amount = page_number * PROFESSOR_BATCH_SIZE
        
        professors_to_process = list(
            professors_collection.find(query)
            .skip(skip_amount)
            .limit(PROFESSOR_BATCH_SIZE)
        )

        # If the batch is empty, it means we've processed all professors
        if not professors_to_process:
            print("\n--- No more professors to process. All summaries are up to date. ---")
            break

        # Process each professor found in the current batch
        for professor in professors_to_process:
            prof_id = professor.get("_id")
            prof_name = professor.get("name")
            prof_name = professor.get("name")
            prof_dept = professor.get("department", "their department") # Provide a fallback
            print(f"\n--- Analyzing Professor: {prof_name} (ID: {prof_id}) ---")

            # 1. Fetch all reviews for this professor from Qdrant
            try:
                review_points, _ = qdrant_client.scroll(
                    collection_name=QDRANT_REVIEWS_COLLECTION,
                    scroll_filter=models.Filter(must=[
                        models.FieldCondition(key="professor_id", match=models.MatchValue(value=prof_id))
                    ]),
                    limit=500,
                    with_payload=True,
                    with_vectors=["review"]
                )
            except Exception as e:
                print(f"  > Could not fetch reviews from Qdrant: {e}")
                continue # Skip to the next professor in the batch

            if len(review_points) < NUM_CLUSTERS:
                print(f"  > Not enough reviews ({len(review_points)}) to generate a summary. Skipping.")
                continue
            
            # --- The rest of your logic for clustering, summarizing, and updating remains the same ---

            print(f"  > Found {len(review_points)} reviews. Clustering into {NUM_CLUSTERS} themes...")
            vectors = np.array([point.vector['review'] for point in review_points]) # type: ignore
            kmeans = KMeans(n_clusters=NUM_CLUSTERS, random_state=42, n_init='auto').fit(vectors)
            
            clustered_reviews = {i: [] for i in range(NUM_CLUSTERS)}
            for i, point in enumerate(review_points):
                cluster_id = kmeans.labels_[i]
                clustered_reviews[cluster_id].append(point.payload['review_text']) # type: ignore

            themed_summaries = []
            print("  > Summarizing themes...")
            for i in range(NUM_CLUSTERS):
                if clustered_reviews[i]:
                    summary = summarize_reviews_for_theme(clustered_reviews[i], f"Theme {i+1}")
                    if summary:
                        themed_summaries.append(summary)

            if not themed_summaries:
                print("  > Could not generate any themed summaries. Skipping.")
                continue
            
            print("  > Generating final holistic summary...")
            final_summary = create_final_holistic_summary(themed_summaries, prof_name, prof_dept)
            # with open(f"professor_summaries/{prof_id}_summary.txt", "w") as f:
            #     f.write(final_summary)
            # print(f"  > Final summary for {prof_name}:\n{final_summary}\n")
            
            
            # Update the professor's document in MongoDB
            professors_collection.update_one(
                {"_id": prof_id},
                {"$set": {
                    "aiSummary": final_summary,
                    "summaryLastUpdated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
                }}
            )
            print(f"  > Successfully updated MongoDB for {prof_name}.")

        # Go to the next page in the next iteration of the while loop
        page_number += 1

    mongo_client.close()

if __name__ == "__main__":
    process_professors()