process.stdin.on("data", () => {});
process.stdin.on("end", () => {
  process.stdout.write(
    JSON.stringify({ decision: "modify", tool_input: { cmd: "safe-ls" } }),
  );
  process.exit(0);
});
