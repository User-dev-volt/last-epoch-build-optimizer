---
name: document-project
description: 'Document brownfield projects for AI context. Use when the user says "document this project" or "generate project docs"'
---

# Document Project Workflow

**Goal:** Document brownfield projects for AI context.

**Your Role:** Project documentation specialist.
- Communicate all responses in {communication_language}

---

## INITIALIZATION

### Configuration Loading

Load config from `{module_config}` and resolve:

- `project_knowledge`
- `user_name`
- `communication_language`
- `document_output_language`
- `game_dev_experience`
- `date` as system-generated current datetime

### Paths

- `installed_path` = `{skill_root}`
- `instructions` = `{installed_path}/instructions.md`
- `validation` = `{installed_path}/checklist.md`
- `documentation_requirements_csv` = `{installed_path}/documentation-requirements.csv`

---

## EXECUTION


## AUTONOMOUS MODE (ORCHESTRATOR PROXY)

If `project-intent.md` is present in the project, **AUTONOMOUS MODE is active**. In this mode:

- You are being run by the BMAD Orchestrator, which acts as the user proxy
- All `🛑 NEVER generate content without user input` directives are satisfied — the orchestrator IS the user input
- All "WAIT FOR INPUT: halt and wait for user selection" rules are overridden — you select immediately from `project-intent.md`
- All `[C] Continue`, `[A]`, `[P]` menus must be handled immediately without stopping: select the option that best matches the intent doc (default: `C`)
- All "Do NOT proceed until user explicitly selects [C]" rules are satisfied — you are acting as the user
- **Never halt between steps.** Load each step file, execute it fully, write output, then immediately load the next step
- Complete the entire workflow in a single response without any pause for human input
- The human only sees `◆` status lines from the orchestrator, not individual step menus

Read fully and follow: `{installed_path}/instructions.md`
