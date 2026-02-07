---
description: Orchestrates the entire Exam Checkmate grading pipeline.
---

# Exam Checkmate - Main Orchestration Workflow

## Input
- Exam Document (Image/PDF)
- Student ID / Name
- Teacher's Answer Key & Rubric

## Workflow Stages

1. **Initialize Execution**
   - Log input parameters
   - Set up unique execution ID

2. **Stage 2: Hebrew OCR & Text Extraction**
   - Run workflow: `stage_2_hebrew_ocr.md`
   - Input: Exam Document
   - Validate output: Ensure text extracted and confidence scores present.

3. **Stage 3: Document Segmentation & Analysis**
   - Run workflow: `stage_3_document_analysis.md`
   - Input: Extracted Text (from Stage 2)
   - Validate output: Ensure answers are mapped to questions.

4. **Stage 4: Dual Model Scoring (Independent)**
   - Run workflow: `stage_4_dual_model_scoring.md`
   - Input: Mapped Answers (from Stage 3), Answer Key, Rubric
   - Validate output: Ensure both Gemini and ChatGPT have generated scores.

5. **Stage 5: Ensemble Aggregation**
   - Run workflow: `stage_5_ensemble_aggregation.md`
   - Input: Gemini Scores, ChatGPT Scores (from Stage 4)
   - Validate output: Ensure final weighted scores and confidence metrics calculated.

6. **Stage 6: Report Generation**
   - Run workflow: `stage_6_report_generation.md`
   - Input: Aggregated Scores (from Stage 5)
   - Output: Final JSON/HTML Report

## Error Handling
- If any stage fails, halt execution and alert user.
- If confidence drops below threshold at any point, pause for "Human in the Loop" review.
