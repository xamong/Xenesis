const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const Sketch = require('../xamong-sketch.js');

const toolPath = path.resolve(__dirname, '..', '..', '..', 'xamong-xcon-to-sketch.cjs');

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'xamong-xcon-to-sketch-'));
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

test('converts one xamong XCON JSON file into a side-by-side XCON/SKETCH file', async () => {
    const { convertPath } = require(toolPath);
    const dir = makeTempDir();
    const input = path.join(dir, 'home.xconj');

    writeJson(input, {
        type: 'form',
        title: 'Home',
        pos: [0, 0, 390, 844],
        components: {
            componentsOrder: 'cta',
            cta: {
                type: 'button',
                label: '시작하기',
                pos: [24, 120, 160, 44],
                onClick: { type: 'toast', message: '시작합니다' }
            }
        }
    });

    const result = await convertPath(input, { force: true });
    assert.equal(result.converted.length, 1);

    const output = path.join(dir, 'home.xcon.sketch');
    const sketch = fs.readFileSync(output, 'utf8');
    assert.match(sketch, /screen 390x844/);
    assert.match(sketch, /title "Home"/);
    assert.match(sketch, /cta: button "시작하기" at 24 120 160 44/);

    const parsed = Sketch.fromSketch(sketch);
    assert.equal(parsed.get('title'), 'Home');
    assert.equal(parsed.get('components').get('cta').get('label'), '시작하기');
});

test('normalizes a root panel into a screen sized from auto-layout children', async () => {
    const { convertPath } = require(toolPath);
    const dir = makeTempDir();
    const input = path.join(dir, 'panel-root.xcon.json');

    writeJson(input, {
        type: 'panel',
        pos: '0,0,560,32',
        al: {
            autoHeight: 'true',
            gap: '10px',
            padding: '14px 16px'
        },
        components: {
            componentsOrder: 'title,body,footer',
            title: { type: 'label', text: 'Title', pos: '0,0,560,28' },
            body: { type: 'panel', pos: '0,0,560,120' },
            footer: { type: 'button', label: 'OK', pos: '0,0,120,44' }
        }
    });

    await convertPath(input, { force: true });

    const sketch = fs.readFileSync(path.join(dir, 'panel-root.xcon.sketch'), 'utf8');
    assert.match(sketch, /^screen 560x240/m);
    assert.match(sketch, /title: label "Title" at 0 0 560 28/);
    assert.match(sketch, /footer: button "OK" at 0 0 120 44/);
});

test('converts a folder recursively while preserving relative paths under an output directory', async () => {
    const { convertPath } = require(toolPath);
    const dir = makeTempDir();
    const inputDir = path.join(dir, 'screens');
    const outputDir = path.join(dir, 'sketches');

    writeJson(path.join(inputDir, 'home.xconj'), {
        type: 'form',
        title: 'Home',
        pos: [0, 0, 390, 844]
    });
    writeJson(path.join(inputDir, 'nested', 'detail.xcon.json'), {
        type: 'form',
        title: 'Detail',
        pos: [0, 0, 402, 800]
    });
    fs.writeFileSync(path.join(inputDir, 'note.txt'), 'ignore me', 'utf8');

    const result = await convertPath(inputDir, { out: outputDir, recursive: true, force: true });

    assert.equal(result.converted.length, 2);
    assert.equal(result.skipped.length, 1);
    assert(fs.existsSync(path.join(outputDir, 'home.xcon.sketch')));
    assert(fs.existsSync(path.join(outputDir, 'nested', 'detail.xcon.sketch')));

    const detail = fs.readFileSync(path.join(outputDir, 'nested', 'detail.xcon.sketch'), 'utf8');
    assert.match(detail, /screen 402x800/);
    assert.match(detail, /title "Detail"/);
});

test('refuses to overwrite an existing sketch file unless force is enabled', async () => {
    const { convertPath } = require(toolPath);
    const dir = makeTempDir();
    const input = path.join(dir, 'home.xconj');
    const output = path.join(dir, 'home.xcon.sketch');

    writeJson(input, {
        type: 'form',
        title: 'Home',
        pos: [0, 0, 390, 844]
    });
    fs.writeFileSync(output, 'existing', 'utf8');

    await assert.rejects(
        () => convertPath(input),
        /Output already exists/
    );

    await convertPath(input, { force: true });
    assert.notEqual(fs.readFileSync(output, 'utf8'), 'existing');
});

test('writes a single file into an existing output directory when --out points to a directory', async () => {
    const { convertPath } = require(toolPath);
    const dir = makeTempDir();
    const input = path.join(dir, 'home.xconj');
    const outputDir = path.join(dir, 'converted');

    writeJson(input, {
        type: 'form',
        title: 'Home',
        pos: [0, 0, 390, 844]
    });
    fs.mkdirSync(outputDir, { recursive: true });

    const result = await convertPath(input, { out: outputDir, force: true });
    assert.equal(result.converted.length, 1);
    assert(fs.existsSync(path.join(outputDir, 'home.xcon.sketch')));
});
