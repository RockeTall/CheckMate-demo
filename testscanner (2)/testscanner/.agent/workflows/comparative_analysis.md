---
description: Cohort Analysis - Aggregate results from multiple exams to identify trends.
---

# Comparative Analysis & Cohort Monitoring

## Input
- Directory of Exam Result JSONs (e.g., `.agent/outputs/*.json`)
- (Optional) specific exam IDs to include

## Execution Steps

1. **Load Exam Data**
   - Iterate through all available `stage_5_output_*.json` files.
   - Extract: Total Score, Question Scores, and Feedback Tags.

2. **Calculate Aggregate Metrics**
   - **Average Score**: Mean of all total scores.
   - **Median Score**: Median value to identify outliers.
   - **Pass/Fail Rate**: Percentage > 60% (or teacher defined threshold).

3. **Question-Level Analysis**
   - For each Question ID (e.g., Q1, Q2):
     * Average score for this specific question.
     * "Difficulty Index": (MAX_POINTS - AVG_SCORE) / MAX_POINTS.
     * Identify questions with lowest average performance.

4. **Common Error Detection**
   - Aggregation of "Feedback Tags" or error keywords from Stage 6 reports (if available).
   - Identify recurring themes (e.g., "Partial credit", "Calculation error").

5. **Generate Output Report**
   - `cohort_analysis_report.json`: Raw statistical data.
   - `cohort_summary.md`: Teacher-friendly summary.
     ```markdown
     # Cohort Analysis Report
     **Date:** [TODAY]
     **Exams Processed:** [N]
     **Class Average:** [X.X]%

     ## Difficulty Hotspots
     - **Question [ID]**: Avg Score [Y]%. [Common Error Note]
     
     ## Score Distribution
     - 90-100: [N] students
     - 80-89: [N] students
     ...
     ```

## Output
- JSON and Markdown analysis reports.
