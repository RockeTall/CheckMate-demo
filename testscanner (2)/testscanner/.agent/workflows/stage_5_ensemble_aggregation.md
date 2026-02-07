---
description: Combine Gemini and ChatGPT scores using 80/20 weighting
---

# Stage 5: Ensemble Score Aggregation

## Input
- Gemini 3 scores for all questions
- ChatGPT 5.1 scores for all questions
- Confidence scores from both models
- Teacher's answer key

## Execution Steps

1. **Apply weighting formula**
   ```
   For each question:
   ensemble_score = (gemini_score × 0.8) + (chatgpt_score × 0.2)
   
   Total exam score = SUM(ensemble_scores)
   
   Confidence for ensemble = MIN(gemini_confidence, chatgpt_confidence)
   ```

2. **Quality checks**
   - Verify all scores are within valid range
   - Check if ensemble score aligns with both models
   - Flag if confidence drops below 70%
   - Validate total points do not exceed possible points

3. **Handle disagreements**
   - If |gemini_score - chatgpt_score| > 15:
     * Flag for human review
     * Include both models' reasoning in final report
     * Do NOT automatically split the difference
   
   - **Adaptive Confidence Thresholding**:
     * **Easy Questions**: If confidence > 70%, accept automatically.
     * **Medium Difficulty**: If confidence 60-70%, mark for "Teacher Review".
     * **Hard Questions**: If confidence < 60%, ALWAYS flag for review.


4. **Calculate final metrics**
   - Total points earned
   - Percentage score
   - Grade equivalent (if teacher specifies grade scale)
   - Confidence for final score

5. **Output**
   - Detailed breakdown by question (ensemble score, contributing models)
   - Final exam score with confidence interval
   - List of questions requiring teacher review
   - Explanation of any flagged discrepancies
