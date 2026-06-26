---
name: project-reviewer
description: Review a software project from an agent-friendly perspective. Use when Xenesis should summarize project structure, identify main capabilities, explain how the system works, and suggest the next practical implementation step without focusing on broad code criticism.
---

# Project Reviewer

Use this skill when the user asks Xenesis to understand a project before changing it.

## Workflow

1. Inspect the project entry points, package scripts, configuration files, and top-level source folders.
2. Summarize what the project does in functional terms before mentioning implementation details.
3. Identify the main runtime flows: CLI/API entry, provider/model path, tool execution path, extension loading, and persistence path.
4. Call out only issues that directly affect the user's next requested step.
5. End with a short next-step recommendation that can be executed immediately.

## Output Shape

Prefer this structure:

- Purpose
- Main Capabilities
- Runtime Flow
- Extension Points
- Suggested Next Step

Keep the response concise. Avoid long inventories of every file unless the user explicitly asks for a full audit.
