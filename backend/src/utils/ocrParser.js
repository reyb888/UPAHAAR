/**
 * Heuristic parser to extract structured prescription data from raw OCR text.
 * Runs completely locally and offline.
 */

export function parsePrescriptionText(rawText) {
    if (!rawText) {
        return {
            summary: "No prescription text found.",
            medicines: []
        };
    }

    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let doctorName = "";
    let diagnosis = "";
    const medicines = [];

    // Common medicine terms and dosage pattern
    const dosageRegex = /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|capsule|tablet|caps|syrup|pills|puff)\b/i;
    
    // Pattern to clean up medicine names (remove trailing hyphens, dots, spaces)
    const cleanupRegex = /^[-\s\.\,]+|[-\s\.\,]+$/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Extract Doctor Name
        if (!doctorName) {
            const docMatch = line.match(/(?:Dr\.|Doctor:?|Physician:?)\s*([A-Za-z\s\.\-]+)/i);
            if (docMatch && docMatch[1]) {
                const name = docMatch[1].trim();
                // Avoid matching titles like "Doctor Name" itself
                if (name.toLowerCase() !== "name" && name.length > 2) {
                    doctorName = "Dr. " + name;
                }
            }
        }

        // 2. Extract Diagnosis
        if (!diagnosis) {
            const diagMatch = line.match(/(?:Diagnosis|Diag|Dx|Symptoms|Indication):?\s*(.+)/i);
            if (diagMatch && diagMatch[1]) {
                diagnosis = diagMatch[1].trim();
            }
        }

        // 3. Extract Medicines (look for lines containing dosages/medicines)
        if (dosageRegex.test(line)) {
            // Avoid matching headers, contact info, patient info, or doctors
            const lowercaseLine = line.toLowerCase();
            if (
                !lowercaseLine.includes("doctor") &&
                !lowercaseLine.includes("patient") &&
                !lowercaseLine.includes("address") &&
                !lowercaseLine.includes("phone") &&
                !lowercaseLine.includes("hospital") &&
                !lowercaseLine.includes("clinic") &&
                !lowercaseLine.includes("date:")
            ) {
                // Try to find frequency
                let frequency = "Once daily";
                const freqMatch = line.match(/\b(morning|night|afternoon|twice daily|thrice daily|once daily|daily|BID|TID|QID|OD|1-0-1|1-1-1|1-0-0|0-0-1|1-1-1-1)\b/i);
                if (freqMatch) {
                    frequency = freqMatch[1];
                }

                // Try to find duration
                let duration = "As directed";
                const durMatch = line.match(/\b(\d+\s*(?:day|week|month|year)s?)\b/i);
                if (durMatch) {
                    duration = durMatch[1];
                }

                // Isolate medicine name (remove frequency and duration parts from name if possible)
                let namePart = line;
                if (freqMatch) namePart = namePart.replace(freqMatch[0], "");
                if (durMatch) namePart = namePart.replace(durMatch[0], "");
                
                // Clean up separators
                namePart = namePart.replace(cleanupRegex, "").trim();
                if (namePart.length < 3) {
                    namePart = line; // fallback to full line if name part is too small
                }

                medicines.push({
                    name: namePart,
                    frequency: frequency.charAt(0).toUpperCase() + frequency.slice(1),
                    duration: duration
                });
            }
        }
    }

    // Heuristics to build final summary if fields are missing
    if (!diagnosis) {
        // Look for common medical condition keywords in raw text as fallback
        const conditions = ["cough", "fever", "cold", "flu", "bronchitis", "hypertension", "diabetes", "infection", "headache"];
        for (const cond of conditions) {
            if (rawText.toLowerCase().includes(cond)) {
                diagnosis = cond.charAt(0).toUpperCase() + cond.slice(1);
                break;
            }
        }
    }

    let summary = "";
    if (diagnosis && doctorName) {
        summary = `Prescription from ${doctorName} with diagnosis: ${diagnosis}.`;
    } else if (doctorName) {
        summary = `Prescription from ${doctorName}.`;
    } else if (diagnosis) {
        summary = `Prescription for condition: ${diagnosis}.`;
    } else {
        summary = "Prescription document uploaded successfully.";
    }

    return {
        summary: summary,
        medicines: medicines
    };
}
