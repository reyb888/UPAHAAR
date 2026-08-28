import easyocr
import re
import io
from PIL import Image

# Initialize the EasyOCR reader once at module level (downloads model on first run, ~100MB)
# Supports English + Hindi for Indian prescriptions
reader = easyocr.Reader(['en'], gpu=False)


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Uses EasyOCR (deep learning CRAFT + ResNet/LSTM) to extract text from an image.
    Returns the full raw OCR text with line breaks preserved.
    """
    results = reader.readtext(image_bytes, detail=0, paragraph=True)
    return "\n".join(results)


def parse_prescription_fields(raw_text: str) -> dict:
    """
    Heuristic parser to extract structured prescription data from raw OCR text.
    Returns a dict with summary, medicines list, and raw_text.
    """
    if not raw_text or not raw_text.strip():
        return {
            "summary": "No readable text found in the prescription image.",
            "medicines": [],
            "raw_text": raw_text or ""
        }

    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

    doctor_name = ""
    diagnosis = ""
    medicines = []

    dosage_pattern = re.compile(
        r'\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|tablet|capsule|caps|syrup|pills|puff|drops|units?|iu)\b',
        re.IGNORECASE
    )

    for line in lines:
        # Extract Doctor Name
        if not doctor_name:
            doc_match = re.search(r'(?:Dr\.?|Doctor:?|Physician:?)\s*([A-Za-z\s\.\-]+)', line, re.IGNORECASE)
            if doc_match:
                name = doc_match.group(1).strip()
                if name.lower() not in ("name", "") and len(name) > 2:
                    doctor_name = f"Dr. {name}"

        # Extract Diagnosis
        if not diagnosis:
            diag_match = re.search(r'(?:Diagnosis|Diag|Dx|Symptoms?|Indication|Complaint):?\s*(.+)', line, re.IGNORECASE)
            if diag_match:
                diagnosis = diag_match.group(1).strip()

        # Extract Medicines (lines containing dosage patterns)
        if dosage_pattern.search(line):
            lower = line.lower()
            skip_keywords = ["doctor", "patient", "address", "phone", "hospital", "clinic", "date:", "reg"]
            if any(kw in lower for kw in skip_keywords):
                continue

            frequency = "Once daily"
            freq_match = re.search(
                r'\b(morning|night|afternoon|evening|twice daily|thrice daily|once daily|daily|'
                r'BID|TID|QID|OD|BD|HS|SOS|PRN|1-0-1|1-1-1|1-0-0|0-0-1|0-1-0|1-1-1-1)\b',
                line, re.IGNORECASE
            )
            if freq_match:
                frequency = freq_match.group(1)

            duration = "As directed"
            dur_match = re.search(r'\b(\d+\s*(?:day|week|month|year)s?)\b', line, re.IGNORECASE)
            if dur_match:
                duration = dur_match.group(1)

            name_part = line
            if freq_match:
                name_part = name_part.replace(freq_match.group(0), "")
            if dur_match:
                name_part = name_part.replace(dur_match.group(0), "")
            name_part = re.sub(r'^[-\s.,]+|[-\s.,]+$', '', name_part).strip()
            if len(name_part) < 3:
                name_part = line

            medicines.append({
                "name": name_part,
                "frequency": frequency.capitalize(),
                "duration": duration
            })

    # Fallback diagnosis detection
    if not diagnosis:
        conditions = [
            "cough", "fever", "cold", "flu", "bronchitis", "hypertension",
            "diabetes", "infection", "headache", "pain", "allergy", "asthma",
            "diarrhea", "nausea", "vomiting", "anxiety", "depression"
        ]
        for cond in conditions:
            if cond in raw_text.lower():
                diagnosis = cond.capitalize()
                break

    # Build summary
    parts = []
    if doctor_name:
        parts.append(f"Prescription from {doctor_name}")
    if diagnosis:
        parts.append(f"diagnosis: {diagnosis}")
    if medicines:
        parts.append(f"{len(medicines)} medicine(s) identified")

    summary = ". ".join(parts) + "." if parts else "Prescription document processed."

    return {
        "summary": summary,
        "medicines": medicines,
        "raw_text": raw_text
    }


def extract_prescription_data(image_bytes: bytes, filename: str = "") -> dict:
    """
    Full pipeline: EasyOCR text extraction → heuristic parsing → structured JSON.
    """
    print(f"[EasyOCR] Processing file: {filename} ({len(image_bytes)} bytes)")
    raw_text = extract_text_from_image(image_bytes)
    print(f"[EasyOCR] Extracted {len(raw_text)} characters of text")
    result = parse_prescription_fields(raw_text)
    return result
