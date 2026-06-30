import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExternalAppNotepadLiveSmokeRequests,
  EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_REQUEST_PATHS,
  formatExternalAppNotepadLiveSmokePlan,
} from './xenesisExternalAppNotepadLiveSmoke.mjs';

test('Notepad external app smoke plan lists the approved app-control sequence', () => {
  const plan = formatExternalAppNotepadLiveSmokePlan();

  for (const path of EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_REQUEST_PATHS) {
    assert.match(plan, new RegExp(path.replace(/\./g, '\\.')));
  }
});

test('Notepad external app smoke uses the registered profile instead of arbitrary executable paths', () => {
  const requests = buildExternalAppNotepadLiveSmokeRequests('C:\\Temp\\xenesis-notepad-smoke.txt');

  assert.deepEqual(
    requests.map((request) => request.path),
    EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_REQUEST_PATHS,
  );
  for (const request of requests) {
    assert.equal(request.approved, true);
    assert.equal(request.args.appId, 'notepad');
    assert.equal(Object.hasOwn(request.args, 'path'), false);
  }
  assert.deepEqual(requests[0].args.placement, { x: 80, y: 80, width: 820, height: 560 });
});
