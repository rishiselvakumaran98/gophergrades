# populate_professors_collection.py
import os
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConnectionFailure
from datetime import datetime

# --- CONFIGURATION ---
MONGO_CONNECTION_STRING = os.environ.get("MONGO_CONNECTION_STRING")
MONGO_DB_NAME = "test"
REVIEWS_COLLECTION_NAME = "reviews"
PROFESSORS_COLLECTION_NAME = "professors"

# --- DATABASE CLIENT SETUP ---
mongo_client = None
try:
    mongo_client = MongoClient(MONGO_CONNECTION_STRING)
    db = mongo_client[MONGO_DB_NAME]
    reviews_collection = db[REVIEWS_COLLECTION_NAME]
    professors_collection = db[PROFESSORS_COLLECTION_NAME]
    # Test the connection
    mongo_client.admin.command('ping')
    print("Successfully connected to MongoDB.")
except ConnectionFailure as e:
    print(f"Failed to connect to MongoDB: {e}")
    exit()
except Exception as e:
    print(f"An unexpected error occurred during MongoDB setup: {e}")
    exit()

def aggregate_and_update_professors():
    """
    Reads from the 'reviews' collection, aggregates stats for each professor,
    and upserts the summary data into the 'professors' collection.
    """
    print("Starting professor aggregation process...")

    # Use MongoDB's aggregation pipeline to efficiently calculate stats for all professors at once
    pipeline = [
        {
            # Group all reviews by the professor's RMP ID
            '$group': {
                '_id': '$professorRmpId',
                'name': {'$first': '$professorName'},
                'sqliteId': {'$first': '$professorSqliteId'},
                'avgQuality': {'$avg': '$quality'},
                'avgDifficulty': {'$avg': '$difficulty'},
                'totalReviews': {'$sum': 1}
            }
        }
    ]

    try:
        # Execute the aggregation pipeline
        professor_summaries = list(reviews_collection.aggregate(pipeline))
    except Exception as e:
        print(f"Failed to execute aggregation pipeline: {e}")
        return

    if not professor_summaries:
        print("No reviews found in the source collection to process.")
        return

    print(f"Found {len(professor_summaries)} unique professors to update.")

    # Prepare bulk operations for efficient updating
    bulk_operations = []
    for summary in professor_summaries:
        professor_id = summary['_id']
        
        # Construct the document to be saved
        update_doc = {
            "_id": professor_id,
            "professorSqliteId": summary.get('sqliteId'),
            "name": summary.get('name'),
            "rmpLink": f"https://www.ratemyprofessors.com/professor/{professor_id}",
            "summaryLastUpdated": datetime.utcnow(),
            "summary": {
                "avgQuality": round(summary.get('avgQuality', 0), 2),
                "avgDifficulty": round(summary.get('avgDifficulty', 0), 2),
                "totalReviews": summary.get('totalReviews', 0)
            }
        }

        # Add to the bulk operation list
        # `update_one` with `upsert=True` will create the document if it doesn't exist,
        # or update it if it does.
        bulk_operations.append(
            UpdateOne(
                {"_id": professor_id},
                {"$set": update_doc},
                upsert=True
            )
        )

    # Execute the bulk write operation if there's anything to update
    if bulk_operations:
        print(f"Performing bulk write operation for {len(bulk_operations)} professors...")
        try:
            result = professors_collection.bulk_write(bulk_operations)
            print("Bulk write complete.")
            print(f"  - Documents created: {result.upserted_count}")
            print(f"  - Documents updated: {result.modified_count}")
        except Exception as e:
            print(f"An error occurred during bulk write: {e}")
    else:
        print("No operations to perform.")


if __name__ == "__main__":
    aggregate_and_update_professors()
    if mongo_client:
        mongo_client.close()
    print("\nProfessor summary collection population complete.")