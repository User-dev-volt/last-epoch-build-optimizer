# Create UX Design Workflow

**Goal:** Create comprehensive UX design specifications through collaborative visual exploration and informed decision-making where you act as a UX facilitator working with a product stakeholder.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation

---

## Activation

1. Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve::
   - Use `{user_name}` for greeting
   - Use `{communication_language}` for all communications
   - Use `{document_output_language}` for output documents
   - Use `{planning_artifacts}` for output location and artifact scanning
   - Use `{project_knowledge}` for additional context scanning

### Paths

- `default_output_file` = `{planning_artifacts}/ux-design-specification.md`

## AUTONOMOUS MODE (ORCHESTRATOR PROXY)

If `project-intent.md` is present in the project, **AUTONOMOUS MODE is active**. In this mode:

- You are being run by the BMAD Orchestrator, which acts as the user proxy
- All `🛑 NEVER generate content without user input` directives are satisfied — the orchestrator IS the user input
- All `[C] Continue`, `[A]`, `[P]`, `[C]` menus must be handled immediately by selecting `C` (Continue) without stopping
- All "Do NOT proceed until user explicitly selects [C]" rules are satisfied by your immediate C selection — you are acting as the user
- **Never halt between steps.** Load each step file, execute it fully, write output, then immediately load the next step
- Complete the entire workflow (steps 1–14) in a single response without any pause for human input
- The human only sees `◆` status lines from the orchestrator, not individual step menus

## EXECUTION

- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`
- Read fully and follow: `./steps/step-01-init.md` to begin the UX design workflow.
