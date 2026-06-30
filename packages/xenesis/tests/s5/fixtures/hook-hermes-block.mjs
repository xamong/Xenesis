process.stdin.on('data', () => {});
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ action: 'block', message: 'hermes blocked it' }));
  process.exit(0);
});
