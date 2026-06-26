let s = "";
process.stdin.on("data", (d) => {
  s += d;
});
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({ decision: "block", reason: "blocked by fixture" }));
  process.exit(0);
});
