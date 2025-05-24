from praw import Reddit
import praw
import argparse
import os
import time
from datetime import datetime
from supabase import create_client, Client
from typing import List, Dict, Any
from dotenv import load_dotenv

from praw.models import MoreComments, Submission

# Load environment variables from .env file
load_dotenv()

# Configure the bot to use here
DEFAULT_BOT = "bot1"

def store_in_ingestion_queue(client: Client, source: str, external_id: str, body: str, posted_at: datetime):
    """Store a post or comment in the ingestion queue."""
    data = {
        "source": source,
        "external_id": external_id,
        "body": body,
        "posted_at": posted_at.isoformat(),
        "processed": False
    }
    client.table("ingestion_queue").insert(data).execute()

def process_submission(submission: Submission, client: Client):
    """Process a submission and its comments."""
    # Store the submission
    store_in_ingestion_queue(
        client=client,
        source=submission.url,
        external_id=submission.id,
        body=submission.selftext or submission.title,
        posted_at=datetime.fromtimestamp(submission.created_utc)
    )
    
    # Get and store comments
    submission.comments.replace_more(limit=0)  # Remove MoreComments objects
    comments = submission.comments.list()
    
    # Sort comments by creation time and take the 20 newest
    sorted_comments = sorted(comments, key=lambda x: x.created_utc, reverse=True)[:20]
    
    for comment in sorted_comments:
        store_in_ingestion_queue(
            client=client,
            source=submission.url,
            external_id=comment.id,
            body=comment.body,
            posted_at=datetime.fromtimestamp(comment.created_utc)
        )

def main(url: str, key: str):
    # Setup supabase client
    client: Client = create_client(url, key)

    # Create reddit instance for read only posts
    reddit = Reddit(
        client_id=os.getenv("REDDIT_CLIENT_ID"),
        client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        user_agent=os.getenv("REDDIT_USER_AGENT")
    )

    # Setup CLI arguments
    arg_parser = argparse.ArgumentParser(
        prog="Reddit Scraper", description="CLI to interact with reddit data"
    )

    # Positional Arguments
    arg_parser.add_argument(
        "subreddits", nargs="+", help="List of subreddits to scrape"
    )

    # Parse arguments
    args = arg_parser.parse_args()
    subreddits: list[str] = args.subreddits

    print(f"Starting to monitor subreddits: {', '.join(subreddits)}")
    print("Press Ctrl+C to stop the script")

    try:
        while True:
            for subreddit in subreddits:
                print(f"\nProcessing subreddit: r/{subreddit}")
                submissions = reddit.subreddit(subreddit).new(limit=20)
                
                for submission in submissions:
                    try:
                        process_submission(submission, client)
                    except Exception as e:
                        print(f"Error processing submission {submission.id}: {str(e)}")
            
            print("\nWaiting 5 minutes before next check...")
            time.sleep(1500)  # Sleep for 5 minutes
            
    except KeyboardInterrupt:
        print("\nStopping the script...")

if __name__ == "__main__":
    # Load environment variables
    url: str | None = os.getenv("SUPABASE_URL")
    key: str | None = os.getenv("SUPABASE_KEY")
    reddit_client_id: str | None = os.getenv("REDDIT_CLIENT_ID")
    reddit_client_secret: str | None = os.getenv("REDDIT_CLIENT_SECRET")
    reddit_user_agent: str | None = os.getenv("REDDIT_USER_AGENT")

    # Check that all required environment variables are set
    required_vars = {
        "SUPABASE_URL": url,
        "SUPABASE_KEY": key,
        "REDDIT_CLIENT_ID": reddit_client_id,
        "REDDIT_CLIENT_SECRET": reddit_client_secret,
        "REDDIT_USER_AGENT": reddit_user_agent
    }

    missing_vars = [var for var, value in required_vars.items() if not value]
    
    if missing_vars:
        print("Missing required environment variables:")
        for var in missing_vars:
            print(f"- {var}")
        print("\nPlease ensure these variables are set in your .env file")
        exit(1)

    main(url, key)
