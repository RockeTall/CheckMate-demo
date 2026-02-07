---
description: Extract Hebrew text from exam images using Gemini Flash 3 (HTR - Handwritten Text Recognition)
---

# Stage 2: Hebrew OCR / HTR (Handwritten Text Recognition)

## Input
- Exam image path or PDF
- Desired output format (JSON or markdown)

## Execution Steps

1. **Load the exam image**
   - Accept .jpg, .png, .pdf formats
   - If PDF, extract individual pages

2. **Data Ingestion**
   - **Student Exam**: Load image(s) from `exam_samples/` or user upload.
   - **Teacher Rubric**:
     - IF `rubric_type` == 'text': Use provided text directly.
     - IF `rubric_type` == 'file': Send image/doc to Gemini Flash 3 (same prompt as below but focused on extracting grading rules) to generate string.

3. **Initialize Gemini Flash 3 for Hebrew text recognition (Student Exam)**
   ```
   PROMPT:
   "**Role:** You are an expert Hebrew OCR and Exam Analyzer.
   **Task:** Analyze the provided exam image(s).
   
   **Scenario Handling:**
   - **Scenario A (On Form):** Locate printed text (Question) and handwritten text (Answer) immediately following it.
   - **Scenario B (Separate Sheet):** Identify the question number in the handwritten text (e.g., '1.', 'שאלה 1') and map it to the questions from the separate exam form image.
   - **Scenario C (Graded Exam):** Distinguish between student handwriting (blue/black) and teacher marks/grades (red/green). Extract the teacher's score if present.
   
   **Handwriting Nuances:**
   - The text is in Hebrew. Pay extreme attention to handwritten characters that look similar (e.g., 'ו'/'ן', 'ש'/'ס').
   - Maintain Right-to-Left logic.
   
   **Output Format (Strict JSON):**
   ```json
   {
     "exam_type": "on_form | separate_sheet | american",
     "segments": [
       {
         "question_number": "Integer or String",
         "question_text": "The printed text of the question...",
         "student_answer_text": "The transcribed handwritten answer...",
         "teacher_notes_detected": "Any text identified as teacher marking...",
         "manual_score_detected": "If a number is written next to a V/X..."
       }
     ]
   }
   ```"
   ```

3. **Parse the extracted data**
   - Create a mapping: question_id → extracted_answer
   - Flag any confidence scores < 70%
   - Note ambiguous handwriting for human review

4. **Generate confidence report**
   - List all text with confidence < 85%
   - Suggest which items need human verification

5. **Output**
   - JSON file with extracted text and confidence scores
   - Human-readable summary highlighting flagged items
   - Decision: Proceed to stage 3, or request human review for low-confidence items?
