import re
import io
import os
import warnings
warnings.filterwarnings("ignore")

os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from PIL import Image, ImageEnhance
import numpy as np
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

_model_name = os.environ.get("TROCR_MODEL", "microsoft/trocr-base-handwritten")
processor = None
model = None

def get_ocr_model():
    global processor, model
    if processor is None or model is None:
        print("[TrOCR] Loading model and processor...")
        processor = TrOCRProcessor.from_pretrained(_model_name, use_fast=False)
        model = VisionEncoderDecoderModel.from_pretrained(_model_name)
    return processor, model


def preprocess_image_bytes(image_bytes: bytes) -> Image.Image:
    """
    Enhance image quality for better OCR on handwritten prescriptions.
    """
    img = Image.open(io.BytesIO(image_bytes))

    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Auto-resize if image is too small
    w, h = img.size
    if max(w, h) < 1000:
        scale = 1000 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Enhance contrast (helps with faded handwriting)
    img = ImageEnhance.Contrast(img).enhance(1.5)

    # Sharpen (helps with blurry phone photos)
    img = ImageEnhance.Sharpness(img).enhance(2.0)

    return img


def segment_text_lines(image: Image.Image) -> list:
    """
    Segment an image into individual text line crops using horizontal projection.
    Returns a list of PIL Image crops, one per detected text line.
    """
    img_array = np.array(image.convert('L'))

    # Binarize
    threshold = img_array.mean()
    binary = (img_array < threshold).astype(np.uint8)

    # Horizontal projection
    h_proj = binary.sum(axis=1)

    min_ink = max(h_proj.max() * 0.02, 1)
    in_line = False
    lines = []
    start = 0

    for i, val in enumerate(h_proj):
        if val > min_ink and not in_line:
            start = i
            in_line = True
        elif val <= min_ink and in_line:
            if i - start > 10:
                lines.append((start, i))
            in_line = False

    if in_line and len(h_proj) - start > 10:
        lines.append((start, len(h_proj)))

    if not lines:
        return [image]

    # Merge close lines
    merged = [lines[0]]
    for start, end in lines[1:]:
        prev_start, prev_end = merged[-1]
        if start - prev_end < 15:
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))

    w = image.size[0]
    crops = []
    for start, end in merged:
        pad = 8
        top = max(0, start - pad)
        bottom = min(image.size[1], end + pad)
        crop = image.crop((0, top, w, bottom))
        crops.append(crop)

    return crops


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Uses TrOCR (trocr-large-handwritten) to extract text from an image.
    Returns the full raw OCR text with line breaks preserved.
    """
    try:
        img = preprocess_image_bytes(image_bytes)
    except Exception:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')

    # Segment into text lines
    line_crops = segment_text_lines(img)

    proc, mod = get_ocr_model()

    recognized_lines = []
    for crop in line_crops:
        pixel_values = proc(images=crop, return_tensors="pt").pixel_values

        generated_ids = mod.generate(
            pixel_values,
            max_new_tokens=256,
            num_beams=5,
            early_stopping=True
        )

        text = proc.batch_decode(generated_ids, skip_special_tokens=True)[0]
        text = text.strip()
        if text:
            recognized_lines.append(text)

    return "\n".join(recognized_lines)


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
            doc_match = re.search(r'(?:Dr\.?|Doctor:?|Physician:?)\s*([A-Za-z\s.\-]+)', line, re.IGNORECASE)
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
    Full pipeline: TrOCR handwriting extraction → heuristic parsing → structured JSON.
    """
    print(f"[TrOCR] Processing file: {filename} ({len(image_bytes)} bytes)")
    raw_text = extract_text_from_image(image_bytes)
    print(f"[TrOCR] Extracted {len(raw_text)} characters of text")
    result = parse_prescription_fields(raw_text)
    return result
