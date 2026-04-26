---
name: generate-project-context
description: 'Generate AI-optimized project context file. Use when the user says "lets create project context for game dev"'
---

# Generate Project Context Workflow

**Goal:** Create a concise, optimized `project-context.md` file containing critical rules, patterns, and guidelines that AI agents must follow when implementing game code. This file focuses on unobvious details that LLMs need to be reminded of.

**Your Role:** You are a technical facilitator working with a peer to capture the essential implementation rules that will ensure consistent, high-quality game code generation across all AI agents working on the project.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Focus on lean, LLM-optimized content generation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{module_config}` and resolve:

- `project_name`, `output_folder`, `user_name`
- `communication_language`, `document_output_language`, `game_dev_experience`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{skill_root}`
- `template_path` = `{installed_path}/project-context-template.md`
- `output_file` = `{output_folder}/project-context.md`

---


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

## EXECUTION

Load and execute `steps/step-01-discover.md` to begin the workflow.

**Note:** Input document discovery and initialization protocols are handled in step-01-discover.md.
