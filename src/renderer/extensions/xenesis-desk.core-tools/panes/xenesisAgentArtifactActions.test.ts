import assert from 'node:assert/strict';
import test from 'node:test';

import { hasRenderableXconArtifact, shouldAutoOpenXenesisArtifactInGowoori } from './xenesisAgentArtifactActions';

test('detects renderable XCON artifacts in assistant messages', () => {
  assert.equal(hasRenderableXconArtifact('plain answer'), false);
  assert.equal(hasRenderableXconArtifact('```text\nscreen "Bad" 100x80\n```'), false);
  assert.equal(hasRenderableXconArtifact('```xcon-sketch\nscreen "Card" 320x180 bg #fff\n```'), true);
  assert.equal(hasRenderableXconArtifact('before\n```sketch\nscreen "Card" 320x180 bg #fff\n```\nafter'), true);
});

test('only auto-opens Gowoori for explicit artifact or overlay viewing requests', () => {
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('xcon으로 보여줘'), false);
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('/artifact 오늘 월드컵 결과를 카드로 보여줘'), false);
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('차트가 있는 보고서 만들어줘'), false);
  assert.equal(
    shouldAutoOpenXenesisArtifactInGowoori('GowooriChat을 직접 사용하지 말고 Xenesis Agent 응답으로 보여줘'),
    false,
  );

  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('거울이로 크게 보여줘'), true);
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('Gowoori artifact pane에 열어줘'), true);
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('오버레이로 바로 보여줘'), true);
  assert.equal(shouldAutoOpenXenesisArtifactInGowoori('아티팩트 창으로 열어줘'), true);
});
