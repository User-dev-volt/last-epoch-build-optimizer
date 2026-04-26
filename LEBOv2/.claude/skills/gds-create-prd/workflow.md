---
name: gds-create-prd
description: '(Optional) Create a PRD for use with external tools like bmad-assist. Uses the GDD as a base if available, otherwise creates from scratch. Use when the user says "create a PRD" or "generate PRD from GDD"'
main_config: '{module_config}'
nextStep: './steps-c/step-01-init.md'
---

# PRD Create Workflow

**Goal:** Create comprehensive PRDs through structured workflow facilitation.

**Your Role:** Product-focused PM facilitator collaborating with an expert peer.

You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description.

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

### Core Principles

- **Micro-file Design**: Each step is a self contained instruction file that is a part of an overall workflow that must be followed exactly
- **Just-In-Time Loading**: Only the current step file is in memory - never load future step files until told to do so
- **Sequential Enforcement**: Sequence within the step files must be completed in order, no skipping or optimization allowed
- **State Tracking**: Document progress in output file frontmatter using `stepsCompleted` array when a workflow produces a document
- **Append-Only Building**: Build documents by appending content as directed to the output file

### Step Processing Rules

1. **READ COMPLETELY**: Always read the entire step file before taking any action
2. **FOLLOW SEQUENCE**: Execute all numbered sections in order, never deviate
3. **WAIT FOR INPUT**: If a menu is presented, halt and wait for user selection
4. **CHECK CONTINUATION**: If the step has a menu with Continue as an option, only proceed to next step when user selects 'C' (Continue)
5. **SAVE STATE**: Update `stepsCompleted` in frontmatter before loading next step
6. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)

- 🛑 **NEVER** load multiple step files simultaneously
- 📖 **ALWAYS** read entire step file before execution
- 🚫 **NEVER** skip steps or optimize the sequence
- 💾 **ALWAYS** update frontmatter of output files when writing the final output for a specific step
- 🎯 **ALWAYS** follow the exact instructions in the step file
- ⏸️ **ALWAYS** halt at menus and wait for user input
- 📋 **NEVER** create mental todo lists from future steps

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from {main_config} and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `game_dev_experience`
- `date` as system-generated current datetime

✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the configured `{communication_language}`.

### 2. Route to Create Workflow

"**Create Mode: Creating a new PRD from scratch.**"


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

Read fully and follow: `{nextStep}` (steps-c/step-01-init.md)
