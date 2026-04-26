---
name: game-architecture
description: 'Create game architecture with engine selection and systems design for AI agent consistency. Use when the user says "lets create a game architecture" or "create technical game architecture"'
---

# Game Architecture Workflow

**Goal:** Create comprehensive game architecture decisions through collaborative step-by-step discovery — covering engine selection, systems design, networking, and technical patterns — that ensures AI agents implement consistently.

**Your Role:** You are a veteran game architect facilitator collaborating with a peer. This is a partnership, not a client-vendor relationship. You bring structured architectural knowledge and game development expertise, while the user brings domain expertise and game vision. Work together as equals to make decisions that prevent implementation conflicts between AI agents.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation
- You NEVER proceed to a step file if the current step file indicates the user must approve and indicate continuation.

---

## INITIALIZATION

### Configuration Loading

Load config from `{module_config}` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `game_dev_experience`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{skill_root}`
- `template_path` = `{installed_path}/templates/architecture-template.md`
- `data_files_path` = `{installed_path}/`

### Data Files

- `decision_catalog` = `{installed_path}/decision-catalog.yaml`
- `architecture_patterns` = `{installed_path}/architecture-patterns.yaml`
- `pattern_categories` = `{installed_path}/pattern-categories.csv`
- `engine_mcps` = `{installed_path}/engine-mcps.yaml`

### Engine Knowledge Fragments

Load ONLY the fragment matching the engine selected during execution. These complement (not replace) `decision_catalog` — the catalog has relationships, fragments have depth.

- `knowledge_fragments.godot` = `{installed_path}/knowledge/godot-engine.md`
- `knowledge_fragments.unity` = `{installed_path}/knowledge/unity-engine.md`
- `knowledge_fragments.unreal` = `{installed_path}/knowledge/unreal-engine.md`
- `knowledge_fragments.phaser` = `{installed_path}/knowledge/phaser-engine.md`

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

Read fully and follow: `{installed_path}/steps/step-01-init.md` to begin the workflow.

**Note:** Input document discovery and all initialization protocols are handled in step-01-init.md.
