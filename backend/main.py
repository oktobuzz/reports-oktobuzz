from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import uvicorn
import pandas as pd
import io
import requests
from datetime import datetime
from engine import AnalyticsEngine

app = FastAPI(title="Meta Insights Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AnalyticsEngine()

# Separate storage for each platform
FACEBOOK_DF = pd.DataFrame()
INSTAGRAM_DF = pd.DataFrame()
STORIES_DF = pd.DataFrame()

@app.get("/")
def read_root():
    return {"status": "System Operational"}

@app.post("/upload/facebook")
async def upload_facebook(files: List[UploadFile] = File(...)):
    """Upload Facebook Posts CSV."""
    global FACEBOOK_DF
    
    dfs = []
    if not FACEBOOK_DF.empty:
        dfs.append(FACEBOOK_DF)

    for file in files:
        content = await file.read()
        try:
            df = engine.process_facebook_posts(content, file.filename)
            dfs.append(df)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing {file.filename}: {str(e)}")
            
    if dfs:
        combined = pd.concat(dfs)
        if 'post_id' in combined.columns:
            FACEBOOK_DF = combined.drop_duplicates(subset=['post_id'], keep='last')
        else:
            FACEBOOK_DF = combined
            
    return {"message": "Facebook posts processed", "total_records": len(FACEBOOK_DF)}

@app.post("/upload/instagram")
async def upload_instagram(files: List[UploadFile] = File(...)):
    """Upload Instagram Posts CSV."""
    global INSTAGRAM_DF
    
    dfs = []
    if not INSTAGRAM_DF.empty:
        dfs.append(INSTAGRAM_DF)

    for file in files:
        content = await file.read()
        try:
            df = engine.process_instagram_posts(content, file.filename)
            dfs.append(df)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing {file.filename}: {str(e)}")
            
    if dfs:
        combined = pd.concat(dfs)
        if 'post_id' in combined.columns:
            INSTAGRAM_DF = combined.drop_duplicates(subset=['post_id'], keep='last')
        else:
            INSTAGRAM_DF = combined
            
    return {"message": "Instagram posts processed", "total_records": len(INSTAGRAM_DF)}

@app.post("/upload/stories")
async def upload_stories(files: List[UploadFile] = File(...)):
    """Upload Instagram Stories CSV."""
    global STORIES_DF
    
    dfs = []
    if not STORIES_DF.empty:
        dfs.append(STORIES_DF)

    for file in files:
        content = await file.read()
        try:
            df = engine.process_stories_upload(content, file.filename)
            dfs.append(df)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing {file.filename}: {str(e)}")
            
    if dfs:
        combined = pd.concat(dfs)
        if 'post_id' in combined.columns:
            STORIES_DF = combined.drop_duplicates(subset=['post_id'], keep='last')
        else:
            STORIES_DF = combined
            
    return {"message": "Stories processed", "total_records": len(STORIES_DF)}

@app.post("/clear")
def clear_data():
    global FACEBOOK_DF, INSTAGRAM_DF, STORIES_DF
    FACEBOOK_DF = pd.DataFrame()
    INSTAGRAM_DF = pd.DataFrame()
    STORIES_DF = pd.DataFrame()
    return {"message": "All data cleared"}

@app.get("/report")
def get_report(start_date: str = Query(...), end_date: str = Query(...)):
    """Get report with SEPARATE Facebook and Instagram data."""
    global FACEBOOK_DF, INSTAGRAM_DF, STORIES_DF
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        end = end.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    report = engine.generate_report(FACEBOOK_DF, INSTAGRAM_DF, STORIES_DF, start, end)
    return report

@app.post("/sync-sheet")
async def sync_sheet(payload: Dict[str, Any]):
    script_url = payload.get('script_url')
    if not script_url:
        raise HTTPException(status_code=400, detail="Missing 'script_url' in payload")
        
    try:
        print(f"--- STARTING SYNC ---")
        print(f"Target URL: {script_url}")
        print(f"Payload Size: {len(str(payload))} chars")

        # Set a 60-second timeout to prevent hanging
        # ALLOW REDIRECTS = TRUE (Default) but let's see if we get a 302
        response = requests.post(script_url, json=payload, timeout=60)
        
        print(f"Response Code: {response.status_code}")
        if response.history:
            print("Redirect History:")
            for resp in response.history:
                print(f" - {resp.status_code} : {resp.url}")
        
        print(f"Final Response Preview: {response.text[:200]}")

        # Check if response is valid JSON
        try:
            return response.json()
        except ValueError:
            # If Google returns HTML (Sign-in page? Error page?), show it.
            error_msg = f"Google Script returned Invalid JSON. Code: {response.status_code}. Content: {response.text[:500]}..."
            print(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
            
    except requests.exceptions.Timeout:
        msg = "Request to Google Timed Out (60s). The script might be running but taking too long."
        print(msg)
        raise HTTPException(status_code=504, detail=msg)
        
    except Exception as e:
        print(f"FATAL SYNC ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync Failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
