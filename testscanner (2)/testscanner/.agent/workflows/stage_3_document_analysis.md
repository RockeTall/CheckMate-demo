---
description: Map extracted answers to specific questions and handle document structure.
---

# Stage 3: Document Segmentation & Alignment

## Input
- Extracted Text JSON (from Stage 2)
- Question Metadata (from Teacher's Key - optional but helpful)

## Execution Steps

1. **Identify Question Boundaries**
   - Locate question numbers (1, 2, 3...) or labels (שאלה 1).
   - Determine start and end of each question block.

2. **Map Student Answers**
   - Associate text found *after* a question (and before the next) as the answer.
   - **Non-Sequential Handling**:
     - If text explicitly says "Answer to Q3", map to Q3 regardless of position.
     - Use cosine similarity if unlabeled: Compare answer text content to question keywords.
     - **Constraint**: Only assign if similarity score > 0.7. If lower, flag as "Unmapped / Ambiguous".

3. **Separate Teacher Annotations**
   - Filter out text classified as "annotation" in Stage 2.
   - **Criteria for Annotation**:
     * Different handwriting style (e.g., cursive vs block, or cleaner script)
     * Different ink color (Red/Green vs Blue/Black)
     * Located in margins or usually circled
     * Contains grade marks (V, X, numbers)
   - Store these separately as "Teacher Notes" (do not grade these).

4. **Verify Completeness**
   - Check if every question has a mapped answer.
   - Flag "Missing Answer" if no text found for a question slot.

5. **Output**
   - Structured JSON:
     ```json
     {
       "mapped_answers": [
         {"question_id": 1, "student_text": "...", "is_missing": false},
         {"question_id": 2, "student_text": "...", "is_missing": false}
       ],
       "unmapped_text": ["..."]
     }
     ```
