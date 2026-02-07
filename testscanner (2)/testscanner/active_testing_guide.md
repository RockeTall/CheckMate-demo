# Exam Checkmate - Active Testing & Validation Guide

This guide corresponds to "Phase 2: Testing & Validation" from your implementation plan.

## Setup
1. **Ensure API Keys are set**: Check `.agent/config.json`.
2. **Prepare Samples**: Place 5-10 exam images (JPG/PNG/PDF) in the `exam_samples/` folder.
   - Name them clearly: `sample_01.jpg`, `sample_02_messy.jpg`, etc.
   - Include a mix of good handwriting, poor handwriting, and teacher annotations.

## Execution Procedure

Run the following command in Antigravity chat for *each* sample exam:

> "Run the exam checkmate workflow for exam_samples/[FILENAME]"

## Verification Checklist (Per Exam)

For each run, verify the following outputs in `test_results_log.md`:

### 1. Optical Character Recognition (Stage 2)
- [ ] Was Hebrew text extracted correctly?
- [ ] Were confidence scores generated?
- [ ] Did it flag low confidence areas?

### 2. Document Analysis (Stage 3)
- [ ] Were answers correctly mapped to Question IDs?
- [ ] Did it handle non-sequential answers?

### 3. Scoring (Stages 4 & 5)
- [ ] Did Gemini 3 generate a score?
- [ ] Did ChatGPT 5.1 generate a score?
- [ ] Is the Ensemble Score calculated correctly (0.8 * Gem + 0.2 * GPT)?

### 4. Reporting (Stage 6)
- [ ] Is the feedback constructed in Hebrew?
- [ ] Does it sound pedagogical and encouraging?

## Troubleshooting
- **API Errors**: Check `.agent/config.json` keys.
- **Low Confidence Loop**: If the agent stops constantly, adjust `CONFIDENCE_THRESHOLD` in config.
