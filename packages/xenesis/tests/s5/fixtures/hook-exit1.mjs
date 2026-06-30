process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  process.exit(1);
});
