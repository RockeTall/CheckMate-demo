# Implementation Plan - Exam Checkmate

This plan outlines the creation of the Exam Checkmate autonomous exam evaluation system within the Google Antigravity environment.

## User Review Required
> [!IMPORTANT]
> This implementation sets up the *agentic workflow* layer. It requires valid API keys for Gemini Flash 3 and ChatGPT 5.1 to fully function in a live environment. The `config.json` will need to be populated with real keys by the user.

## Proposed Changes

### Configuration
#### [NEW] [.agent/rules](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/rules)
- Implement the "Master System Prompt" to define the agent's role, operating principles, and methodology.

#### [NEW] [.agent/config.json](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/config.json)
- Store configuration variables: Model names, ensemble weights, confidence thresholds, and output formats.

### Workflows
#### [NEW] [.agent/workflows/exam_checkmate_main.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/exam_checkmate_main.md)
- The primary orchestrator workflow that triggers the subsequent stages.

#### [NEW] [.agent/workflows/stage_2_hebrew_ocr.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_2_hebrew_ocr.md)
- **Exam OCR**: Extract text from student exam images.
- **Rubric OCR**: New capability to process teacher uploaded rubric files (Image/Docx) using Gemini Flash.

#### [NEW] [.agent/workflows/stage_3_document_analysis.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_3_document_analysis.md)
- Workflow for mapping answers to questions, handling non-sequential answers.

#### [MODIFY] [.agent/workflows/stage_4_dual_model_scoring.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_4_dual_model_scoring.md)
- **Refactor**: Renamed to `stage_4_gemini_scoring.md`.
- **Change**: Remove ChatGPT 5.1 step.
- **New Logic**: Use Gemini 3 Pro for primary scoring. Optional: Use a second pass with higher temperature if "Self-Correction" is needed.

#### [NEW] [.agent/workflows/stage_6_report_generation.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_6_report_generation.md)
- Workflow to generate the final structured feedback report.

### Advanced Features & Refinements (Phase 5)
#### [MODIFY] [.agent/workflows/stage_4_dual_model_scoring.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_4_dual_model_scoring.md)
- **Cascading Error Rule**: Add specific prompting to prevent double-penalizing students for initial errors that propagate correctly.

#### [MODIFY] [.agent/workflows/stage_5_ensemble_aggregation.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_5_ensemble_aggregation.md)
- **Adaptive Confidence**: Implement tiered thresholds (Easy=70%, Hard=50%) based on question difficulty.

#### [MODIFY] [.agent/workflows/stage_2_hebrew_ocr.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_2_hebrew_ocr.md)
- **Hebrew Optimization**: Add specific instructions for ambiguous characters (ש/ס) and context-aware HTR.

#### [MODIFY] [.agent/workflows/stage_3_document_analysis.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/stage_3_document_analysis.md)
- **Logic Upgrade**: Enhance handling of non-sequential answers and teacher annotation filtering.

### Analytics & Monitoring (Phase 6)
#### [NEW] [.agent/workflows/comparative_analysis.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/comparative_analysis.md)
- **Cohort Analysis**: Workflow to aggregate results from multiple exams, calculating average scores, distribution curves, and identifying common error patterns.
#### [NEW] [.agent/workflows/comparative_analysis.md](file:///C:/Users/Admin/.gemini/antigravity/testscanner/.agent/workflows/comparative_analysis.md)
- **Cohort Analysis**: Workflow to aggregate results from multiple exams, calculating average scores, distribution curves, and identifying common error patterns.

### Frontend Development (Phase 7)
#### [NEW] [frontend/](file:///C:/Users/Admin/.gemini/antigravity/testscanner/frontend/)
- **Technology Stack**: React (Vite) + Tailwind CSS.
- **Key Components**:
  - `GradingResultsPage.jsx`: Displays final scores, confidence, and question breakdown in RTL.
  - `ExamUploader.jsx`: Drag-and-drop for Exam Files. **Includes Tab/Toggle for Rubric: "Upload File" vs "Manual Text".**
  - `DashboardLayout.jsx`: Main navigation and layout shell.

### Backend Verification Service (Phase 8)
#### [NEW] [backend/](file:///C:/Users/Admin/.gemini/antigravity/testscanner/backend/)
- **Technology Stack**: Node.js + Express.
- **Purpose**: Translates the agentic workflows into executable code reachable by the Frontend.
- **Key Endpoints**:
  - `POST /api/grade`: Handles file upload, calls Gemini/ChatGPT APIs, runs ensemble logic, and returns the result JSON.

## Verification Plan

### Automated Verification
- Verify that all `.md` files exist in `.agent/workflows/`.
- Verify `.agent/rules` and `.agent/config.json` are created.

### Manual Verification
- Review the content of the workflow files to ensure they match the user's detailed specification.
- (Future Step) User would trigger a test run via chat: "Process exam for [Student]..."
