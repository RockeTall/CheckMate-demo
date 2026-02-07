---
description: Independent scoring by Gemini 3 and ChatGPT 5.1
---

# Stage 4: Dual Model Scoring

## Input
- Extracted exam text (from stage 2/3)
- Teacher's answer key
- Teacher's rubric/grading criteria
- Any special deduction rules

## Execution Steps

1. **Prepare the teacher's rubric in structured format**
   ```
   For each question:
   - Points possible
   - Full credit criteria
   - Partial credit criteria (if applicable)
   - Deduction rules (e.g., -10% for arithmetic error if logic correct)
   - Emphasis areas for evaluation
   ```

2. **Send to Gemini 3 Pro Preview (Config: `GEMINI_SCORING_MODEL`) for independent scoring**
   ```
   PROMPT: "You are an expert educator grading a Hebrew language exam.
   
   **Input Data:**
   - **Student Answer:** [INSERT STUDENT_ANSWER_TEXT]
   - **Teacher Rubric:** [INSERT TEACHER_RUBRIC]
   
   **Instructions:**
   1. **Check for 'Carry Forward Errors' (טעות נגררת):**
      - If the student made a calculation error in step A but used the result correctly in step B, deduct points ONLY for A.
      - Do not penalize the downstream steps.
   
   2. **Provide Feedback in Hebrew:**
      - What was wrong?
      - What is the correct answer?
      - Provide an encouraging remark.
   
   3. **Scoring:**
      - Return a numeric score (0-100) for this specific question.
   
   **Output JSON:**
   {
     "question_number": [ID],
     "score": [0-100],
     "feedback_hebrew": "...",
     "carry_forward_error_detected": boolean
   }"
   ```

3. **Send to ChatGPT 5.1 for independent scoring**
   - Use identical prompt as Gemini 3
   - Store results separately for ensemble comparison

4. **Compare outputs**
   - Calculate score difference between models
   - Flag if difference > 15%
   - Identify questions where models disagree
   - Note which model's reasoning is more sound

5. **Generate confidence matrix**
   - For each question: (Gemini score, ChatGPT score, model confidence)
   - Document areas of agreement vs. disagreement

6. **Output**
   - Gemini 3 scoring results (JSON)
   - ChatGPT 5.1 scoring results (JSON)
   - Comparison matrix
   - Flags for significant disagreements
