import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
import io

# --- CONFIGURATION & MAPPINGS ---

FB_POST_COLS = {
    'Post ID': 'post_id',
    'Publish time': 'publish_time',
    'Description': 'description',
    'Permalink': 'permalink',
    'Post type': 'post_type',
    'Reach': 'reach',
    'Views': 'views',
    'Reactions': 'likes',
    'Comments': 'comments',
    'Shares': 'shares'
}

IG_POST_COLS = {
    'Post ID': 'post_id',
    'Publish time': 'publish_time',
    'Description': 'description',
    'Permalink': 'permalink',
    'Post type': 'post_type',
    'Reach': 'reach',
    'Views': 'views',
    'Likes': 'likes',
    'Comments': 'comments',
    'Shares': 'shares',
    'Saves': 'saves',
    'Follows': 'follows'
}

IG_STORY_COLS = {
    'Post ID': 'post_id',
    'Publish time': 'publish_time',
    'Permalink': 'permalink',
    'Reach': 'reach',
    'Views': 'views',
    'Likes': 'likes',
    'Shares': 'shares',
    'Replies': 'replies',
    'Link clicks': 'link_clicks',
    'Navigation': 'navigation',
    'Profile visits': 'profile_visits',
    'Sticker taps': 'sticker_taps',
    'Follows': 'follows'
}

class AnalyticsEngine:
    def __init__(self):
        pass

    def _clean_numeric(self, series: pd.Series) -> pd.Series:
        return pd.to_numeric(series.astype(str).str.replace(',', ''), errors='coerce').fillna(0)

    def _parse_date(self, series: pd.Series) -> pd.Series:
        return pd.to_datetime(series, format='%m/%d/%Y %H:%M', errors='coerce')

    def process_facebook_posts(self, file_contents: bytes, filename: str) -> pd.DataFrame:
        """Process Facebook Posts CSV."""
        try:
            df = pd.read_csv(io.BytesIO(file_contents))
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

        mapping = FB_POST_COLS
        available_cols = [c for c in mapping.keys() if c in df.columns]
        df = df[available_cols].copy()
        df = df.rename(columns=mapping)
        df['platform'] = 'Facebook'
        
        # Ensure all required numeric cols exist
        required_nums = ['reach', 'views', 'likes', 'comments', 'shares', 'saves', 'follows']
        for col in required_nums:
            if col not in df.columns:
                df[col] = 0
            else:
                df[col] = self._clean_numeric(df[col])

        if 'publish_time' in df.columns:
            df['publish_time'] = self._parse_date(df['publish_time'])

        if 'post_id' in df.columns:
            df['post_id'] = df['post_id'].astype(str)
            df = df.drop_duplicates(subset=['post_id'], keep='last')

        # Metrics
        df['total_engagement'] = df['likes'] + df['comments'] + df['shares'] + df['saves']
        df['rate_numerator'] = df['likes'] + df['comments'] + df['shares'] + df['saves']
        df['engagement_rate_reach'] = df.apply(
            lambda x: (x['rate_numerator'] / x['reach']) if x['reach'] > 0 else 0, axis=1
        )
        df['engagement_rate_views'] = df.apply(
            lambda x: (x['rate_numerator'] / x['views']) if x['views'] > 0 else 0, axis=1
        )

        return df

    def process_instagram_posts(self, file_contents: bytes, filename: str) -> pd.DataFrame:
        """Process Instagram Posts CSV."""
        try:
            df = pd.read_csv(io.BytesIO(file_contents))
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

        mapping = IG_POST_COLS
        available_cols = [c for c in mapping.keys() if c in df.columns]
        df = df[available_cols].copy()
        df = df.rename(columns=mapping)
        df['platform'] = 'Instagram'

        # Ensure all required numeric cols exist
        required_nums = ['reach', 'views', 'likes', 'comments', 'shares', 'saves', 'follows']
        for col in required_nums:
            if col not in df.columns:
                df[col] = 0
            else:
                df[col] = self._clean_numeric(df[col])

        if 'publish_time' in df.columns:
            df['publish_time'] = self._parse_date(df['publish_time'])

        if 'post_id' in df.columns:
            df['post_id'] = df['post_id'].astype(str)
            df = df.drop_duplicates(subset=['post_id'], keep='last')

        # Metrics
        df['total_engagement'] = df['likes'] + df['comments'] + df['shares'] + df['saves']
        df['rate_numerator'] = df['likes'] + df['comments'] + df['shares'] + df['saves']
        df['engagement_rate_reach'] = df.apply(
            lambda x: (x['rate_numerator'] / x['reach']) if x['reach'] > 0 else 0, axis=1
        )
        df['engagement_rate_views'] = df.apply(
            lambda x: (x['rate_numerator'] / x['views']) if x['views'] > 0 else 0, axis=1
        )

        return df

    def process_stories_upload(self, file_contents: bytes, filename: str) -> pd.DataFrame:
        """Process Instagram Stories CSV."""
        try:
            df = pd.read_csv(io.BytesIO(file_contents))
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

        mapping = IG_STORY_COLS
        available_cols = [c for c in mapping.keys() if c in df.columns]
        df = df[available_cols].copy()
        df = df.rename(columns=mapping)
        df['platform'] = 'Instagram Story'

        numeric_cols = ['reach', 'views', 'likes', 'shares', 'replies', 'link_clicks', 'navigation', 'profile_visits', 'sticker_taps', 'follows']
        for col in numeric_cols:
            if col not in df.columns:
                df[col] = 0
            else:
                df[col] = self._clean_numeric(df[col])
        
        if 'publish_time' in df.columns:
            df['publish_time'] = self._parse_date(df['publish_time'])

        if 'post_id' in df.columns:
            df['post_id'] = df['post_id'].astype(str)
            df = df.drop_duplicates(subset=['post_id'], keep='last')
        
        return df

    def _get_platform_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate stats for a single platform DataFrame."""
        if df.empty:
            return {
                "total_posts": 0,
                "total_reach": 0,
                "total_views": 0,
                "total_engagement": 0,
                "avg_engagement_rate_reach": 0.0,
                "avg_engagement_rate_views": 0.0,
                "total_follows": 0
            }
        
        # Robust summation
        def safe_sum(col_name: str) -> int:
            if col_name in df.columns:
                return int(df[col_name].sum())
            return 0

        total_posts = int(len(df))
        total_reach = safe_sum('reach')
        total_views = safe_sum('views')
        total_engagement = safe_sum('total_engagement')
        total_follows = safe_sum('follows')
        
        # Strict Formula: (Total Engagement / Total Reach)
        avg_eng_rate_reach = (total_engagement / total_reach) if total_reach > 0 else 0.0
        avg_eng_rate_view = (total_engagement / total_views) if total_views > 0 else 0.0

        return {
            "total_posts": total_posts,
            "total_reach": total_reach,
            "total_views": total_views,
            "total_engagement": total_engagement,
            "avg_engagement_rate_reach": avg_eng_rate_reach,
            "avg_engagement_rate_views": avg_eng_rate_view,
            "total_follows": total_follows
        }

    def _get_rankings(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get best and worst performers."""
        if df.empty:
            return {
                "best_reach": None,
                "least_reach": None,
                "best_engagement": None,
                "least_engagement": None
            }

        def row_to_dict(row):
            return {
                "post_id": row['post_id'],
                "platform": row['platform'],
                "reach": int(row['reach']),
                "views": int(row['views']),
                "likes": int(row['likes']),
                "comments": int(row['comments']),
                "shares": int(row['shares']),
                "saves": int(row.get('saves', 0)),
                "total_engagement": int(row['total_engagement']),
                "permalink": row.get('permalink', ''),
                "description": str(row.get('description', ''))[:80] if pd.notna(row.get('description')) else "",
                "publish_time": row['publish_time'].strftime('%Y-%m-%d %H:%M') if pd.notna(row.get('publish_time')) else ''
            }

        # Sort by reach
        if 'reach' in df.columns:
            valid_reach_df = df[df['reach'] > 0]
            by_reach = df.sort_values('reach', ascending=False)
            best_reach = row_to_dict(by_reach.iloc[0]) if len(by_reach) > 0 else None
            
            if not valid_reach_df.empty:
                by_reach_valid = valid_reach_df.sort_values('reach', ascending=True)
                least_reach = row_to_dict(by_reach_valid.iloc[0])
            else:
                least_reach = row_to_dict(by_reach.iloc[-1]) if len(by_reach) > 0 else None
        else:
            best_reach = None
            least_reach = None

        # Sort by engagement
        if 'total_engagement' in df.columns:
            by_engagement = df.sort_values('total_engagement', ascending=False)
            best_engagement = row_to_dict(by_engagement.iloc[0]) if len(by_engagement) > 0 else None
            least_engagement = row_to_dict(by_engagement.iloc[-1]) if len(by_engagement) > 0 else None
        else:
            best_engagement = None
            least_engagement = None

        return {
            "best_reach": best_reach,
            "least_reach": least_reach,
            "best_engagement": best_engagement,
            "least_engagement": least_engagement
        }

    def _df_to_post_list(self, df: pd.DataFrame) -> List[Dict]:
        """Convert DataFrame to list of post dicts for the table."""
        posts = []
        for _, row in df.iterrows():
            posts.append({
                "post_id": row['post_id'],
                "publish_time": row['publish_time'].strftime('%Y-%m-%d %H:%M') if pd.notna(row['publish_time']) else '',
                "post_type": row.get('post_type', ''),
                "reach": int(row['reach']),
                "views": int(row['views']),
                "likes": int(row['likes']),
                "comments": int(row['comments']),
                "shares": int(row['shares']),
                "saves": int(row.get('saves', 0)),
                "follows": int(row.get('follows', 0)),
                "total_engagement": int(row['total_engagement']),
                "engagement_rate": float(row.get('engagement_rate_reach', 0)),
                "permalink": row.get('permalink', ''),
                "description": str(row.get('description', ''))[:50] if pd.notna(row.get('description')) else ""
            })
        return posts

    def _story_df_to_list(self, df: pd.DataFrame) -> List[Dict]:
        """Convert Story DataFrame to list."""
        stories = []
        for _, row in df.iterrows():
            stories.append({
                "post_id": row['post_id'],
                "publish_time": row['publish_time'].strftime('%Y-%m-%d %H:%M') if pd.notna(row['publish_time']) else '',
                "reach": int(row['reach']),
                "views": int(row['views']),
                "likes": int(row.get('likes', 0)),
                "shares": int(row.get('shares', 0)),
                "replies": int(row.get('replies', 0)),
                "link_clicks": int(row.get('link_clicks', 0)),
                "profile_visits": int(row.get('profile_visits', 0)),
                "follows": int(row.get('follows', 0)),
                "sticker_taps": int(row.get('sticker_taps', 0)),
                "permalink": row.get('permalink', '')
            })
        return stories

    def _calculate_split_particulars(self, fb_df: pd.DataFrame, ig_df: pd.DataFrame, stories_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculate 'Particulars' SEPARATELY for Facebook and Instagram.
        """
        def safe_sum(df, col):
            if df.empty or col not in df.columns: return 0
            return int(df[col].sum())

        # ------------------------------------------
        # 1. INSTAGRAM (Posts + Stories)
        # ------------------------------------------
        ig_posts_reach = safe_sum(ig_df, 'reach')
        story_reach = safe_sum(stories_df, 'reach')
        ig_total_reach = ig_posts_reach + story_reach
        
        ig_total_views = safe_sum(ig_df, 'views')

        # Interactions w/o Views
        ig_post_interactions = (
           safe_sum(ig_df, 'likes') + safe_sum(ig_df, 'comments') + 
           safe_sum(ig_df, 'shares') + safe_sum(ig_df, 'saves')
        )
        story_interactions = (
            safe_sum(stories_df, 'likes') + safe_sum(stories_df, 'shares') + 
            safe_sum(stories_df, 'replies') + safe_sum(stories_df, 'link_clicks') +
            safe_sum(stories_df, 'profile_visits') + safe_sum(stories_df, 'sticker_taps')
        )
        ig_interactions_only = ig_post_interactions + story_interactions

        # Total Engagement (Interactions + Views)
        ig_total_engagement = ig_interactions_only + ig_total_views

        if ig_total_reach > 0:
            ig_eng_rate_with_views = (ig_total_engagement / ig_total_reach) * 100
            ig_eng_rate_wo_views = (ig_interactions_only / ig_total_reach) * 100
            ig_video_view_rate = (ig_total_views / ig_total_reach) * 100
        else:
            ig_eng_rate_with_views = ig_eng_rate_wo_views = ig_video_view_rate = 0.0

        ig_count = len(ig_df)
        ig_avg_interaction = (ig_interactions_only / ig_count) if ig_count > 0 else 0.0

        # ------------------------------------------
        # 2. FACEBOOK (Posts Only)
        # ------------------------------------------
        fb_total_reach = safe_sum(fb_df, 'reach')
        fb_total_views = safe_sum(fb_df, 'views')
        
        fb_interactions_only = (
            safe_sum(fb_df, 'likes') + safe_sum(fb_df, 'comments') + 
            safe_sum(fb_df, 'shares') + safe_sum(fb_df, 'saves')
        )

        fb_total_engagement = fb_interactions_only + fb_total_views

        if fb_total_reach > 0:
            fb_eng_rate_with_views = (fb_total_engagement / fb_total_reach) * 100
            fb_eng_rate_wo_views = (fb_interactions_only / fb_total_reach) * 100
            fb_video_view_rate = (fb_total_views / fb_total_reach) * 100
        else:
            fb_eng_rate_with_views = fb_eng_rate_wo_views = fb_video_view_rate = 0.0

        fb_count = len(fb_df)
        fb_avg_interaction = (fb_interactions_only / fb_count) if fb_count > 0 else 0.0

        return {
            "instagram": {
                "total_reach": ig_total_reach,
                "total_engagement": ig_total_engagement,
                "total_views": ig_total_views,
                "interactions_wo_views": ig_interactions_only,
                "eng_rate_with_views": ig_eng_rate_with_views,
                "eng_rate_wo_views": ig_eng_rate_wo_views,
                "video_view_rate": ig_video_view_rate,
                "average_interaction": ig_avg_interaction
            },
            "facebook": {
                "total_reach": fb_total_reach,
                "total_engagement": fb_total_engagement,
                "total_views": fb_total_views,
                "interactions_wo_views": fb_interactions_only,
                "eng_rate_with_views": fb_eng_rate_with_views,
                "eng_rate_wo_views": fb_eng_rate_wo_views,
                "video_view_rate": fb_video_view_rate,
                "average_interaction": fb_avg_interaction
            }
        }

    def generate_report(self, fb_df: pd.DataFrame, ig_df: pd.DataFrame, stories_df: pd.DataFrame, 
                       start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Generate the final JSON report with SEPARATE + AGGREGATED platform data."""
        
        # Filter Dates
        def filter_date(df):
            if not df.empty and 'publish_time' in df.columns:
                mask = (df['publish_time'] >= start_date) & (df['publish_time'] <= end_date)
                return df.loc[mask].copy()
            return pd.DataFrame()

        fb_filtered = filter_date(fb_df)
        ig_filtered = filter_date(ig_df)
        s_filtered = filter_date(stories_df)

        # SPLIT STATS
        split_particulars = self._calculate_split_particulars(fb_filtered, ig_filtered, s_filtered)

        # FACEBOOK Section
        fb_stats = self._get_platform_stats(fb_filtered)
        fb_rankings = self._get_rankings(fb_filtered)
        fb_posts = self._df_to_post_list(fb_filtered)

        # INSTAGRAM Section
        ig_stats = self._get_platform_stats(ig_filtered)
        ig_rankings = self._get_rankings(ig_filtered)
        ig_posts = self._df_to_post_list(ig_filtered)

        # STORIES Section
        def safe_sum(df, col):
            if df.empty or col not in df.columns: return 0
            return int(df[col].sum())

        s_views = safe_sum(s_filtered, 'views')
        s_count = len(s_filtered)
        
        story_stats = {
            "total_stories": int(s_count),
            "total_reach": safe_sum(s_filtered, 'reach'),
            "total_views": s_views,
            "avg_views_per_story": float(s_views / s_count) if s_count > 0 else 0.0,
            "total_link_clicks": safe_sum(s_filtered, 'link_clicks'),
            "total_replies": safe_sum(s_filtered, 'replies'),
            "total_profile_visits": safe_sum(s_filtered, 'profile_visits'),
            "total_follows": safe_sum(s_filtered, 'follows')
        }
        story_list = self._story_df_to_list(s_filtered)

        return {
            "period": {
                "start": start_date.strftime('%Y-%m-%d'),
                "end": end_date.strftime('%Y-%m-%d')
            },
            "aggregated": split_particulars,  # Using 'aggregated' key for now, containing {instagram:..., facebook:...}
            "facebook": {
                "stats": fb_stats,
                "rankings": fb_rankings,
                "posts": fb_posts
            },
            "instagram": {
                "stats": ig_stats,
                "rankings": ig_rankings,
                "posts": ig_posts
            },
            "stories": {
                "stats": story_stats,
                "data": story_list
            }
        }
