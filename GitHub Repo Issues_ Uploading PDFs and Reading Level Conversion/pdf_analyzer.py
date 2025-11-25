import os
import sys
import textstat
from pypdf import PdfReader

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error extracting text: {e}"

def analyze_reading_level(text):
    """Analyzes the reading level of the given text."""
    if not text or "Error extracting text" in text:
        return {
            "error": "Could not analyze text. Extraction failed or text is empty."
        }

    # Calculate various readability scores
    flesch_reading_ease = textstat.flesch_reading_ease(text)
    flesch_kincaid_grade = textstat.flesch_kincaid_grade(text)
    gunning_fog = textstat.gunning_fog(text)
    smog_index = textstat.smog_index(text)
    coleman_liau_index = textstat.coleman_liau_index(text)
    automated_readability_index = textstat.automated_readability_index(text)

    # Determine the overall grade level based on Flesch-Kincaid
    grade_level = textstat.text_standard(text, float_output=True)

    return {
        "flesch_reading_ease": flesch_reading_ease,
        "flesch_kincaid_grade": flesch_kincaid_grade,
        "gunning_fog_index": gunning_fog,
        "smog_index": smog_index,
        "coleman_liau_index": coleman_liau_index,
        "automated_readability_index": automated_readability_index,
        "estimated_grade_level": grade_level
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 pdf_analyzer.py <path_to_pdf_file>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        sys.exit(1)

    print(f"--- Analyzing PDF: {pdf_path} ---")

    # 1. Extract Text
    extracted_text = extract_text_from_pdf(pdf_path)
    if "Error extracting text" in extracted_text:
        print(extracted_text)
        sys.exit(1)

    print(f"Successfully extracted {len(extracted_text.split())} words.")

    # 2. Analyze Reading Level
    analysis_results = analyze_reading_level(extracted_text)

    print("\n--- Readability Analysis Results ---")
    for key, value in analysis_results.items():
        print(f"{key.replace('_', ' ').title()}: {value}")

    # 3. Provide the extracted text for further use (e.g., simplification)
    # This is where the LLM adaptation would happen in the full app.
    # For this demo, we just save the text.
    output_path = pdf_path.replace(".pdf", "_extracted.txt")
    with open(output_path, "w") as f:
        f.write(extracted_text)
    print(f"\nExtracted text saved to: {output_path}")

if __name__ == "__main__":
    main()
