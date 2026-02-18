import pandas as pd
import glob
import sys

# Ensure UTF-8 output
sys.stdout = open('debug_output.txt', 'w', encoding='utf-8')

print("--- DEBUGGING REACH VALUES ---")

try:
    # 1. FACEBOOK
    fb_files = glob.glob('facebook*.csv')
    if fb_files:
        print(f"\nProcessing {fb_files[0]}")
        try:
            df = pd.read_csv(fb_files[0], encoding='utf-8')
        except:
            df = pd.read_csv(fb_files[0], encoding='latin1')
            
        print(f"Columns: {list(df.columns)}")
        
        if 'Reach' in df.columns:
            # Clean numeric
            df['Reach_Clean'] = pd.to_numeric(df['Reach'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
            
            # Show Bottom 5
            print("\nBOTTOM 5 REACH (FB):")
            bottom = df.sort_values('Reach_Clean')[['Date', 'Description', 'Reach', 'Reach_Clean']].head(5)
            # Print row by row to ensure full text
            for idx, row in bottom.iterrows():
                print(f"Row {idx}: Reach={row['Reach_Clean']} | Desc={str(row['Description'])[:50]}...")
    
    # 2. INSTAGRAM
    ig_files = glob.glob('instagarm.csv') 
    if ig_files:
        print(f"\nProcessing {ig_files[0]}")
        try:
            df = pd.read_csv(ig_files[0], encoding='utf-8')
        except:
            df = pd.read_csv(ig_files[0], encoding='latin1')
            
        print(f"Columns: {list(df.columns)}")

        if 'Reach' in df.columns:
            # Clean numeric
            df['Reach_Clean'] = pd.to_numeric(df['Reach'].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
            
            # Show Bottom 5
            print("\nBOTTOM 5 REACH (IG):")
            bottom = df.sort_values('Reach_Clean')[['Date', 'Description', 'Reach', 'Reach_Clean']].head(5)
            for idx, row in bottom.iterrows():
                print(f"Row {idx}: Reach={row['Reach_Clean']} | Desc={str(row['Description'])[:80]}...")

except Exception as e:
    print(f"ERROR: {e}")

sys.stdout.close()
