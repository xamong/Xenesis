# XCON Workflow Runner Extension

Internal Xenesis Desk extension for running XCON Workflow SKETCH documents locally.

It provides:

- Workflow SKETCH editing
- Fixture JSON editing
- Local action execution
- Queue and scheduler event replay
- Trace, execution event, host update, and final context inspection
- Diagram JSON sample conversion to Workflow SKETCH

This extension is intentionally internal and optional. If the
`extensions/xenesis-desk.workflow-runner` and
`src/renderer/extensions/xenesis-desk.workflow-runner` folders are excluded, XD
Desk runs without the workflow runner feature.
