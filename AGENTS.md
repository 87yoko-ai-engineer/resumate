<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:resumate-v2-refactor-rules -->
# ResuMate v2 Refactor Rules

Before modifying this app, read `RESUMATE_V2_REFACTOR_PLAN.md` in the repository root.

This is an existing app refactor, not a rewrite. Preserve the current app and improve it in phases according to the plan.

Always work on a dedicated branch before making refactor changes. Use the `codex/` branch prefix unless the user specifies another branch name.

Default implementation sequence:

1. Start with Phase 1 only.
2. For Phase 1, organize the UI so it clearly shows:
   - `① 求人情報を貼り付け`
   - `② 履歴書作成（画像添付・音声入力・直接入力）`
3. In Phase 1, prioritize UI organization and preserving existing behavior.
4. Do not implement the full AI logic, OCR/image/PDF parsing, or production-grade upload extraction during Phase 1 unless the user explicitly asks.
5. After each phase, verify behavior, confirm the current branch, review `.gitignore`, consider security/privacy impact, then commit and push only the intended phase changes.
6. Continue Phase 2 and later phases only after Phase 1 has been verified and the user asks to proceed.
<!-- END:resumate-v2-refactor-rules -->
