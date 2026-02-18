import zipfile
import re
import os
import sys

# Ensure UTF-8 output for the console
sys.stdout = open('ppt_analysis.txt', 'w', encoding='utf-8')

ppt_path = "Westside Weekly Report - TEMPLATE.pptx"

print(f"--- ANALYZING PPT: {ppt_path} ---\n")

try:
    with zipfile.ZipFile(ppt_path, 'r') as z:
        # Ppts store slides in ppt/slides/slideX.xml
        slides = [f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')]
        # Sort by slide number
        slides.sort(key=lambda x: int(re.search(r'slide(\d+)', x).group(1)))

        for i, slide in enumerate(slides):
            print(f"--- SLIDE {i+1} ---")
            content = z.read(slide).decode('utf-8')
            # remove xml tags to get text. 
            # Text is usually in <a:t>...</a:t>
            texts = re.findall(r'<a:t>(.*?)</a:t>', content)
            
            clean_texts = []
            for t in texts:
                # Basic cleaning
                t = t.strip()
                if t and t not in clean_texts: # dedup slightly
                    clean_texts.append(t)
            
            for t in clean_texts:
                print(f"- {t}")
            print("\n")

except Exception as e:
    print(f"Error reading PPT: {e}")

sys.stdout.close()
