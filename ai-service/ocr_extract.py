"""
Standalone TrOCR script called directly by Node.js via child_process.
Uses Microsoft's TrOCR (transformer-based OCR) for state-of-the-art handwriting recognition.
Usage: python ocr_extract.py <image_path>
Outputs: JSON to stdout
"""
import sys
import json
import re
import os
import warnings
warnings.filterwarnings("ignore")

# Suppress transformers logging
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TOKENIZERS_PARALLELISM"] = "false"


def preprocess_image(image_path):
    """
    Load and preprocess image for TrOCR.
    Enhances contrast and sharpness for better handwriting recognition.
    """
    from PIL import Image, ImageEnhance, ImageFilter

    img = Image.open(image_path)

    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Auto-resize if image is too small (TrOCR works better with reasonable resolution)
    w, h = img.size
    if max(w, h) < 1000:
        scale = 1000 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Enhance contrast (helps with faded handwriting)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)

    # Sharpen (helps with blurry phone photos)
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)

    return img


def segment_text_lines(image):
    """
    Segment an image into individual text line crops using simple horizontal projection.
    Returns a list of PIL Image crops, one per detected text line.
    """
    import numpy as np

    img_array = np.array(image.convert('L'))  # Convert to grayscale

    # Binarize using Otsu-like threshold
    threshold = img_array.mean()
    binary = (img_array < threshold).astype(np.uint8)

    # Horizontal projection (sum of dark pixels per row)
    h_proj = binary.sum(axis=1)

    # Find text line regions (contiguous rows with ink)
    min_ink = max(h_proj.max() * 0.02, 1)  # Minimum ink to count as a text row
    in_line = False
    lines = []
    start = 0

    for i, val in enumerate(h_proj):
        if val > min_ink and not in_line:
            start = i
            in_line = True
        elif val <= min_ink and in_line:
            if i - start > 10:  # Minimum line height
                lines.append((start, i))
            in_line = False

    if in_line and len(h_proj) - start > 10:
        lines.append((start, len(h_proj)))

    if not lines:
        # Fallback: treat entire image as one line
        return [image]

    # Merge lines that are very close together (likely same line split by gap)
    merged = [lines[0]]
    for start, end in lines[1:]:
        prev_start, prev_end = merged[-1]
        if start - prev_end < 15:  # Gap smaller than 15px = merge
            merged[-1] = (prev_start, end)
        else:
            merged.append((start, end))

    # Crop each line with small vertical padding
    w = image.size[0]
    crops = []
    for start, end in merged:
        pad = 8
        top = max(0, start - pad)
        bottom = min(image.size[1], end + pad)
        crop = image.crop((0, top, w, bottom))
        crops.append(crop)

    return crops


def ensure_dependencies():
    """Check and auto-install required dependencies if missing."""
    import subprocess
    missing = []
    try:
        import PIL
    except ImportError:
        missing.append("Pillow")
    try:
        import numpy
    except ImportError:
        missing.append("numpy")
    try:
        import torch
    except ImportError:
        missing.append("torch")
    try:
        import transformers
    except ImportError:
        missing.append("transformers")

    if missing:
        sys.stderr.write(f"[TrOCR] Missing Python dependencies: {missing}. Auto-installing...\n")
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install",
                "--break-system-packages",
                "Pillow", "numpy", "transformers", "sentencepiece",
                "torch", "--extra-index-url", "https://download.pytorch.org/whl/cpu"
            ])
            sys.stderr.write("[TrOCR] Dependencies installed successfully.\n")
        except Exception as e:
            sys.stderr.write(f"[TrOCR] Auto-install failed: {e}\n")


def run_ocr(image_path):
    """
    Run TrOCR on the image for handwriting recognition.
    Uses Microsoft's trocr-base-handwritten model for balance of speed, low RAM, and accuracy.
    """
    ensure_dependencies()
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel

    # Load preprocessed image
    image = preprocess_image(image_path)

    # Use trocr-base-handwritten by default (350MB model, fits easily in cloud server RAM)
    model_name = os.environ.get("TROCR_MODEL", "microsoft/trocr-base-handwritten")
    sys.stderr.write(f"[TrOCR] Loading model: {model_name}...\n")

    try:
        processor = TrOCRProcessor.from_pretrained(model_name, use_fast=False)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
    except Exception as model_err:
        sys.stderr.write(f"[TrOCR] Failed to load {model_name}, trying trocr-small-handwritten fallback...\n")
        model_name = "microsoft/trocr-small-handwritten"
        processor = TrOCRProcessor.from_pretrained(model_name, use_fast=False)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)

    # Segment image into text lines
    line_crops = segment_text_lines(image)

    recognized_lines = []
    for crop in line_crops:
        # Process each line through TrOCR
        pixel_values = processor(images=crop, return_tensors="pt").pixel_values

        # Generate text with beam search for better accuracy
        generated_ids = model.generate(
            pixel_values,
            max_new_tokens=256,
            num_beams=3,
            early_stopping=True
        )

        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        text = text.strip()
        if text:
            recognized_lines.append(text)

    return "\n".join(recognized_lines)


def parse_prescription(raw_text):
    """Heuristic parser to extract structured prescription data from raw OCR text."""
    if not raw_text or not raw_text.strip():
        return {"summary": "No readable text found.", "medicines": [], "raw_text": ""}

    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    doctor_name = ""
    diagnosis = ""
    medicines = []

    dosage_re = re.compile(
        r'\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|tablet|capsule|caps|syrup|pills|puff|drops|units?|iu)\b', re.I
    )

    for line in lines:
        if not doctor_name:
            m = re.search(r'(?:Dr\.?|Doctor:?|Physician:?)\s*([A-Za-z\s.\-]+)', line, re.I)
            if m and m.group(1).strip().lower() not in ("name", "") and len(m.group(1).strip()) > 2:
                doctor_name = "Dr. " + m.group(1).strip()

        if not diagnosis:
            m = re.search(r'(?:Diagnosis|Diag|Dx|Symptoms?|Indication|Complaint):?\s*(.+)', line, re.I)
            if m:
                diagnosis = m.group(1).strip()

        if dosage_re.search(line):
            low = line.lower()
            if any(kw in low for kw in ["doctor", "patient", "address", "phone", "hospital", "clinic", "date:", "reg"]):
                continue
            freq = "Once daily"
            fm = re.search(
                r'\b(morning|night|afternoon|evening|twice daily|thrice daily|once daily|daily|BID|TID|QID|OD|BD|HS|SOS|PRN|1-0-1|1-1-1|1-0-0|0-0-1|0-1-0)\b',
                line, re.I
            )
            if fm:
                freq = fm.group(1)
            dur = "As directed"
            dm = re.search(r'\b(\d+\s*(?:day|week|month|year)s?)\b', line, re.I)
            if dm:
                dur = dm.group(1)
            name_part = line
            if fm: name_part = name_part.replace(fm.group(0), "")
            if dm: name_part = name_part.replace(dm.group(0), "")
            name_part = re.sub(r'^[-\s.,]+|[-\s.,]+$', '', name_part).strip()
            if len(name_part) < 3:
                name_part = line
            medicines.append({"name": name_part, "frequency": freq.capitalize(), "duration": dur})

    if not diagnosis:
        for cond in ["cough","fever","cold","flu","bronchitis","hypertension","diabetes","infection","headache","pain","allergy","asthma"]:
            if cond in raw_text.lower():
                diagnosis = cond.capitalize()
                break

    parts = []
    if doctor_name: parts.append(f"Prescription from {doctor_name}")
    if diagnosis: parts.append(f"diagnosis: {diagnosis}")
    if medicines: parts.append(f"{len(medicines)} medicine(s) identified")
    summary = ". ".join(parts) + "." if parts else "Prescription document processed."

    return {"summary": summary, "medicines": medicines, "raw_text": raw_text}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    try:
        raw_text = run_ocr(image_path)
        result = parse_prescription(raw_text)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
