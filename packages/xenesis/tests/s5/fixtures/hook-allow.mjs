process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
});
