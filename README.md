# Meta Analytics Engine

A sophisticated, CSV-driven analytics system for Facebook and Instagram content reporting.

## Features
- **Strict Pipeline Separation**: Dedicated upload zones for Posts (FB/IG) and Stories (IG) to ensure data integrity.
- **Automated Normalization**: Handles inconsistent column names, number formatting, and deduplication (based on Post ID).
- **Custom Metrics**:
  - **Engagement Rate (Reach)**: `(Likes + Comments + Shares) / Reach`
  - **Engagement Rate (Views)**: `(Likes + Comments + Shares) / Views` (Crucial for Video focus)
  - **Stories**: Tracking of Views, Exits, Taps, and Link Clicks.
- **Reporting**: Weekly/Monthly aggregation with "Best Performing" post detection.
- **Export**: One-click JSON and CSV export for easy integration with Google Sheets/Excel.

## Usage Guide

1. **Start the System**
   - **Backend**: `cd backend && uvicorn main:app --reload`
   - **Frontend**: `cd frontend && npm run dev`
   - Open browser to: `http://localhost:5173`

2. **Upload Data**
   - **Pipeline A (Posts)**: Drag & Drop `facebook.csv` and `instagram.csv`.
   - **Pipeline B (Stories)**: Drag & Drop `instagram_stories.csv`.
   - *Note: The system auto-deduplicates if you upload overlapping time ranges.*

3. **Generate Report**
   - Select your Start and End date.
   - Click "Generate Report".

4. **Export**
   - Click "Export CSV" to get a file ready for your weekly reporting sheets.

## Technical Architecture
- **Backend**: Python (FastAPI) + Pandas for high-performance data processing.
- **Frontend**: React + TailwindCSS + Lucide Icons for a premium, dark-mode interface.
- **Security**: Data is processed locally/in-memory for the session (Privacy First).

## Assumptions / Logic
- **Views**: Facebook 'Views' are treated as Impressions.
- **Engagement Total**: Includes Saves (IG).
- **Engagement Rate**: Excludes Saves (Pure interaction rate).
- **Stories**: Manually filtered from Post uploads if detected, but primarily relies on strict user upload pipelines.
