import sys
import os
import pandas as pd
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from engine import AnalyticsEngine

def test_engine():
    print("Initializing Analytics Engine...")
    engine = AnalyticsEngine()
    
    # Paths to your local files
    fb_path = "facebook.csv"
    ig_path = "instagarm.csv" 
    story_path = "instagarm story.csv"

    print(f"Loading files from: {os.getcwd()}")
    
    # 1. Test Post Processing
    print("\n--- Testing POST Processing ---")
    posts_dfs = []
    
    try:
        with open(fb_path, 'rb') as f:
            print(f"Processing {fb_path}...")
            fb_df = engine.process_posts_upload(f.read(), "facebook.csv")
            print(f" > FB Rows: {len(fb_df)}")
            print(f" > FB Columns: {list(fb_df.columns)}")
            posts_dfs.append(fb_df)
    except Exception as e:
        print(f"Error FB: {e}")

    try:
        with open(ig_path, 'rb') as f:
            print(f"Processing {ig_path}...")
            ig_df = engine.process_posts_upload(f.read(), "instagram.csv")
            print(f" > IG Rows: {len(ig_df)}")
            print(f" > IG Columns: {list(ig_df.columns)}")
            posts_dfs.append(ig_df)
    except Exception as e:
        print(f"Error IG: {e}")

    if posts_dfs:
        all_posts = pd.concat(posts_dfs)
        # Global Dedup
        all_posts = all_posts.drop_duplicates(subset=['post_id'], keep='last')
        print(f" > Total Unique Posts: {len(all_posts)}")
    else:
        all_posts = pd.DataFrame()

    # 2. Test Story Processing
    print("\n--- Testing STORY Processing ---")
    stories_df = pd.DataFrame()
    try:
        with open(story_path, 'rb') as f:
            print(f"Processing {story_path}...")
            stories_df = engine.process_stories_upload(f.read(), "story.csv")
            print(f" > Story Rows: {len(stories_df)}")
            print(f" > Story Columns: {list(stories_df.columns)}")
    except Exception as e:
        print(f"Error Story: {e}")

    # 3. Test Report Generation
    print("\n--- Testing Report Calculation ---")
    # Date Range from CSV data (Jan 28 2026 to Feb 03 2026 based on inspection)
    start_date = datetime(2026, 1, 28)
    end_date = datetime(2026, 2, 4)
    
    report = engine.generate_report(all_posts, stories_df, start_date, end_date)
    
    print("\n=== GENERATED REPORT SUMMARY ===")
    print(f"Period: {report['period']['start']} to {report['period']['end']}")
    
    print("\n[POSTS KPI]")
    stats = report['posts']['stats']
    print(f"Total Posts: {stats['total_posts']}")
    print(f"Total Reach: {stats['total_reach']}")
    print(f"Total Engagement: {stats['total_engagement']}")
    print(f"Avg Engagement Rate (Reach): {stats['avg_engagement_rate_reach']:.2%}")
    print(f"Avg Engagement Rate (Views): {stats['avg_engagement_rate_views']:.2%}")
    
    print("\n[STORIES KPI]")
    s_stats = report['stories']['stats']
    print(f"Total Stories: {s_stats['total_stories']}")
    print(f"Total Reach: {s_stats['total_reach']}")
    print(f"Avg Views: {s_stats['avg_views_per_story']:.0f}")
    
    print("\n[RANKINGS]")
    ranks = report['posts']['rankings']
    if ranks.get('best_reach'):
        print(f"Best Reach: {ranks['best_reach']['val']} (ID: {ranks['best_reach']['post_id']})")
    
    print("\nDone.")

if __name__ == "__main__":
    test_engine()
