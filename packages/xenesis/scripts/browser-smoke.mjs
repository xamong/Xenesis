// Real-browser smoke check. Requires: npx playwright install chromium
import { PlaywrightBrowserDriver } from "../dist/tools/browserDriver.js";

const driver = new PlaywrightBrowserDriver({ headless: true });

try {
  const snapshot = await driver.goto("https://example.com");
  if (!snapshot.title.toLowerCase().includes("example")) {
    throw new Error(`Unexpected title: ${snapshot.title}`);
  }
  if (snapshot.elements.length === 0) {
    throw new Error("Expected at least one interactive element on example.com");
  }
  console.log(`browser smoke: ok (title="${snapshot.title}", elements=${snapshot.elements.length})`);
} finally {
  await driver.close();
}
