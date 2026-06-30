process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  setTimeout(() => process.exit(0), 5000);
});
