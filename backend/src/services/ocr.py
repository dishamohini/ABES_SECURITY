import sys
import json
import re
import os
import io

# Force UTF-8 encoding for standard output and error to prevent Windows charmap encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_ocr():
    if len(sys.argv) < 2:
        print(json.dumps({"name": "Mock Name", "aadhaarNumber": "123456789012", "success": False, "error": "No image path provided"}))
        return

    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"name": "Mock Name", "aadhaarNumber": "123456789012", "success": False, "error": "Image file does not exist"}))
        return

    try:
        import easyocr
        # Initialize easyocr reader for English
        # Note: running on CPU (gpu=False) for maximum compatibility
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(img_path, detail=0)
        
        text = "\n".join(results)
        
        # 1. Extract ID Number
        # Regex for Aadhaar (12 digits, sometimes separated by spaces)
        aadhaar_match = re.search(r'(\d{4}\s\d{4}\s\d{4}|\d{12})', text)
        # Regex for PAN Card: 5 uppercase letters, 4 digits, 1 uppercase letter
        pan_match = re.search(r'[A-Z]{5}[0-9]{4}[A-Z]{1}', text.upper())
        
        id_no = ""
        if aadhaar_match:
            id_no = re.sub(r'\s|-', '', aadhaar_match.group(1))
        elif pan_match:
            id_no = pan_match.group(0)
        else:
            # Fallback: look for any alphanumeric sequence of length 8 to 16
            words = text.split()
            for word in words:
                clean_word = re.sub(r'[^A-Za-z0-9]', '', word)
                if 8 <= len(clean_word) <= 16 and any(c.isdigit() for c in clean_word):
                    id_no = clean_word
                    break

        # 2. Extract Name
        name = ""
        lines = [line.strip() for line in results if line.strip()]
        for line in lines:
            # Simple heuristic: Look for capitalized names like "John Doe" or "A. K. Sharma"
            if re.match(r'^[A-Z][a-zA-Z.]+(\s+[A-Z][a-zA-Z.]+){1,3}$', line):
                # Avoid common non-name keywords
                if not any(kw in line.upper() for kw in ["GOVERNMENT", "INDIA", "FATHER", "ADDRESS", "INCOME", "TAX", "UNIQUE", "BIRTH", "GENDER", "MALE", "FEMALE", "YEAR"]):
                    name = line
                    break

        if not name:
            name = "Extracted Name"

        print(json.dumps({
            "name": name,
            "aadhaarNumber": id_no if id_no else "N/A",
            "success": True
        }))

    except Exception as e:
        print(json.dumps({
            "name": "Fallback Name",
            "aadhaarNumber": "123456789012",
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    run_ocr()
