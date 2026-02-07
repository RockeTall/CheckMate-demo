---
description: Generate comprehensive feedback report
---

# Stage 6: Report Generation and Feedback

## Input
- All previous stage outputs
- Ensemble scores
- Model reasoning and feedback
- Student and exam identifiers

## Execution Steps

1. **Generate question-by-question feedback**
   For each question:
   ```
   QUESTION [N]: [Full Question Text including preamble/context + specific instruction]
   
   STUDENT'S ANSWER: [extracted answer]
   
   CORRECT ANSWER: [teacher's answer key]
   
   SCORE: X / Y points
   
   FEEDBACK: [Analysis]
   
   AREAS FOR IMPROVEMENT (If score < 100):
   [Specific reason for deduction from the scoring model]
   
   HOW TO IMPROVE:
   [Pedagogical feedback]
   
   WHAT YOU DID WELL:
   [Positive reinforcement if applicable]
   ```

2. **Generate overall feedback summary**
   ```
   EXAM SUMMARY
   ============
   Total Score: X / 100
   Performance Level: [Excellent | Good | Satisfactory | Needs Improvement]
   
   STRENGTHS:
   - [Area 1 where student excelled]
   - [Area 2]
   
   AREAS FOR GROWTH:
   - [Concept/skill to focus on]
   - [Common error pattern]
   
   NEXT STEPS:
   [Specific recommendations for improvement]
   ```

3. **Format output**
   - JSON for machine processing
   - HTML for teacher/student display
   - Markdown for easy sharing

4. **Flag items requiring human attention**
   - Questions with confidence < 70%
   - Significant model disagreements
   - Illegible handwriting
   - Ambiguous question responses

5. **Output deliverables**
   - Student-facing report (encouraging tone, clear feedback)
   - Teacher-facing report (includes confidence scores, model reasoning)
   - Raw data export (all intermediate scores and reasoning)
