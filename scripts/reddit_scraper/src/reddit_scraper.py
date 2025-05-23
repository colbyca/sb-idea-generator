from praw import Reddit
import argparse
import os
from supabase import create_client, Client

from praw.models import MoreComments, Submission

# Configure the bot to use here
DEFAULT_BOT = "bot1"


def main(url: str, key: str):
    # Setup supabase client
    client: Client = create_client(url, key)
    client.table("ingestion_queue").insert(
        {"source": "test", "external_id": "python", "body": "test"}
    ).execute()

    return

    # Create reddit instance for read only posts
    reddit = Reddit(DEFAULT_BOT)

    # Setup CLI arguments
    arg_parser = argparse.ArgumentParser(
        prog="Reddit Scraper", description="CLI to interact with reddit data"
    )

    # Positional Arguments
    arg_parser.add_argument(
        "subreddits", nargs="+", help="List of subreddits to scrape"
    )

    # Optional Arguments
    arg_parser.add_argument(
        "--submission_filter",
        choices=["hot", "gilded", "new", "rising", "top", "controversial"],
        help="Filter to use on submission types (default: hot)",
        default="hot",
    )

    # Parse arguments
    args = arg_parser.parse_args()
    # Grabs the list of subreddits to check
    subreddits: list[str] = args.subreddits
    # Get the submission fitler
    submission_filter: str = args.submission_filter

    # Prints the top 10
    for subreddit in subreddits:
        submissions = _get_submissions(reddit, subreddit, submission_filter)


def _get_submissions(reddit: Reddit, subreddit: str, submission_filter: str):
    """Grabs a list of submissions given a subreddit."""
    # Grab the sumbission given the filter type
    submissions = []
    match submission_filter:
        case "hot":
            submissions = reddit.subreddit(subreddit).hot(limit=10)
        case "gilded":
            submissions = reddit.subreddit(subreddit).gilded(limit=10)
        case "new":
            submissions = reddit.subreddit(subreddit).new(limit=10)
        case "rising":
            submissions = reddit.subreddit(subreddit).rising(limit=10)
        case "top":
            submissions = reddit.subreddit(subreddit).top(limit=10)
        case "controversial":
            submissions = reddit.subreddit(subreddit).controversial(limit=10)
    # Returns the list of submissions for a given subreddit
    return submissions


if __name__ == "__main__":
    url: str | None = os.environ.get("SUPABASE_URL")
    key: str | None = os.environ.get("SUPABASE_KEY")

    # Check that the url and key are set
    if url and key:
        main(url, key)
    else:
        print("Please set your SUPABASE URL and SUPABASE KEY as env variables")
