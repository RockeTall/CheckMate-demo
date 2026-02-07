# 🛑 CRITICAL AGENT HANDOFF INSTRUCTIONS 🛑
**READ THIS FIRST**

This project has been migrated and refactored. Follow these rules STRICTLY.

## 1. Architecture: GEMINI ONLY
- **ChatGPT / OpenAI has been completely REMOVED.**
- Do NOT suggest re-integrating it.
- Do NOT look for `CHATGPT_API_KEY` or `openai` package.

## 2. Model Configuration (MANDATORY)
You MUST use the **Gemini 3 Preview** models for all operations. 
The code is currently hardcoded and configured for these specific versions:

| Task | Model ID |
| :--- | :--- |
| **OCR / HTR** | `gemini-3-flash-preview` |
| **Grading / Scoring** | `gemini-3-pro-preview` |

**DO NOT REVERT** to `gemini-2.0-flash-exp` or `gemini-1.5-pro`.

## 3. Project Status
- **Backend**: Node.js/Express (Running).
- **Frontend**: React/Tailwind (Running).
- **Workflows**: located in `.agent/workflows/`. Files like `stage_4_dual_model_scoring.md` have been refactored to be Gemini-only despite the filename (or should be treated as such).

## 4. Immediate Next Step
- If the user asks you to run code, verify `gemini-3` models are being used in `.env`.
