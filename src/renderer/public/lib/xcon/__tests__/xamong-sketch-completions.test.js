const assert = require('node:assert/strict');
const test = require('node:test');

const Completions = require('../xamong-sketch-completions.js');

function labelsFor(source, marker = '<|>') {
    const index = source.indexOf(marker);
    assert.notEqual(index, -1, 'test source must include a cursor marker');

    const before = source.slice(0, index);
    const lineNumber = before.split(/\n/).length;
    const column = before.length - before.lastIndexOf('\n');
    const cleanSource = source.slice(0, index) + source.slice(index + marker.length);

    return Completions.getCompletionItems({
        source: cleanSource,
        lineNumber,
        column,
        snippets: {
            screenPhone: 'screen 390x844',
            buttonToast: 'button "Save"'
        },
        sketchApi: {
            getSupportedComponentTypes: () => ['button', 'panel', 'banner', 'list', 'textField'],
            getSupportedActionTypes: () => ['toast', 'batch', 'chain', 'callApi', 'goBack'],
            getActionAliases: () => ({ get: 'callApi', post: 'callApi', runChain: 'chain' }),
            getActionHolderNames: () => ['onClick', 'success', 'failure', 'after']
        }
    }).map((item) => item.label);
}

test('suggests component declarations at screen child positions', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  <|>
`);

    assert(labels.includes('button'));
    assert(labels.includes('panel'));
    assert(labels.includes('banner'));
    assert(!labels.includes('toast'));
    assert(!labels.includes('backgroundColor'));
});

test('suggests component-specific properties inside button and banner blocks', () => {
    const buttonLabels = labelsFor(`
screen "Demo" 390x844
  save: button "저장" at 24 40 160 44
    <|>
`);

    assert(buttonLabels.includes('label'));
    assert(buttonLabels.includes('icon'));
    assert(buttonLabels.includes('onClick'));
    assert(buttonLabels.includes('backgroundColor'));
    assert(!buttonLabels.includes('slides'));

    const bannerLabels = labelsFor(`
screen "Demo" 390x844
  hero: banner at 24 40 320 180
    <|>
`);

    assert(bannerLabels.includes('slides'));
    assert(bannerLabels.includes('indicator'));
    assert(bannerLabels.includes('autoplay'));
    assert(!bannerLabels.includes('placeholder'));
});

test('suggests only font properties inside font blocks', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  title: label "Hello" at 24 40 260 44
    font
      <|>
`);

    assert(labels.includes('family'));
    assert(labels.includes('size'));
    assert(labels.includes('weight'));
    assert(labels.includes('lineHeight'));
    assert(!labels.includes('type'));
    assert(!labels.includes('pos'));
    assert(!labels.includes('backgroundColor'));
    assert(!labels.includes('button'));
    assert(!labels.includes('toast'));
});

test('suggests only object-specific properties inside common object blocks', () => {
    const borderLabels = labelsFor(`
screen "Demo" 390x844
  panel1: panel at 0 0 320 180
    border
      <|>
`);
    assert(borderLabels.includes('visible'));
    assert(borderLabels.includes('width'));
    assert(borderLabels.includes('style'));
    assert(borderLabels.includes('color'));
    assert(borderLabels.includes('radius'));
    assert(!borderLabels.includes('pos'));
    assert(!borderLabels.includes('backgroundColor'));

    const shadowLabels = labelsFor(`
screen "Demo" 390x844
  panel1: panel at 0 0 320 180
    shadow
      <|>
`);
    assert(shadowLabels.includes('visible'));
    assert(shadowLabels.includes('blur'));
    assert(shadowLabels.includes('opacity'));
    assert(shadowLabels.includes('color'));
    assert(!shadowLabels.includes('font'));
    assert(!shadowLabels.includes('onClick'));

    const alLabels = labelsFor(`
screen "Demo" 390x844
  panel1: panel at 0 0 320 180
    al
      <|>
`);
    assert(alLabels.includes('direction'));
    assert(alLabels.includes('gap'));
    assert(alLabels.includes('padding'));
    assert(alLabels.includes('alignItems'));
    assert(alLabels.includes('justifyContent'));
    assert(alLabels.includes('stackClass'));
    assert(!alLabels.includes('type'));
    assert(!alLabels.includes('toast'));
});

test('suggests only nested widget object properties inside component object blocks', () => {
    const iconLabels = labelsFor(`
screen "Demo" 390x844
  save: button "Save" at 24 40 160 44
    icon
      <|>
`);
    assert(iconLabels.includes('name'));
    assert(iconLabels.includes('size'));
    assert(iconLabels.includes('position'));
    assert(!iconLabels.includes('label'));
    assert(!iconLabels.includes('onClick'));

    const autoplayLabels = labelsFor(`
screen "Demo" 390x844
  hero: banner at 24 40 320 180
    autoplay
      <|>
`);
    assert(autoplayLabels.includes('enabled'));
    assert(autoplayLabels.includes('interval'));
    assert(autoplayLabels.includes('loop'));
    assert(autoplayLabels.includes('rolling'));
    assert(!autoplayLabels.includes('slides'));
    assert(!autoplayLabels.includes('button'));
});

test('treats object property names that overlap component names as object contexts when they have no at clause', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  card1: card at 24 40 320 180
    image
      <|>
`);

    assert(labels.includes('src'));
    assert(labels.includes('fit'));
    assert(labels.includes('slideshow'));
    assert(!labels.includes('button'));
    assert(!labels.includes('backgroundColor'));
});

test('suggests action commands inside action holder blocks', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  save: button "저장" at 24 40 160 44
    onClick
      <|>
`);

    assert(labels.includes('toast'));
    assert(labels.includes('get'));
    assert(labels.includes('post'));
    assert(labels.includes('batch'));
    assert(labels.includes('runChain'));
    assert(!labels.includes('button'));
    assert(!labels.includes('backgroundColor'));
});

test('suggests action commands after inline action holder prefixes', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  save: button "저장" at 24 40 160 44
    onClick: <|>
`);

    assert(labels.includes('toast'));
    assert(labels.includes('get'));
    assert(labels.includes('runChain'));
    assert(!labels.includes('backgroundColor'));
});

test('suggests trigger fields and action commands inside trigger blocks', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  trigger "cartChanged" on global.cart render total
    <|>
`);

    assert(labels.includes('dependency'));
    assert(labels.includes('renderTarget'));
    assert(labels.includes('action'));
    assert(labels.includes('toast'));
    assert(labels.includes('batch'));
    assert(!labels.includes('button'));
    assert(!labels.includes('backgroundColor'));
});

test('suggests chain expressions inside XaAction chain blocks', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  save: button "저장" at 24 40 160 44
    onClick: toast "저장되었습니다"
      chain
        <|>
`);

    assert(labels.includes('local.'));
    assert(labels.includes('global.'));
    assert(labels.includes('sender.'));
    assert(labels.includes('args.'));
    assert(!labels.includes('toast'));
    assert(!labels.includes('button'));
});

test('suggests only theme tokens when the current token starts with @', () => {
    const labels = labelsFor(`
screen "Demo" 390x844
  panel1: panel at 0 0 320 180
    backgroundColor @<|>
`);

    assert(labels.includes('@accent'));
    assert(labels.includes('@surface'));
    assert(labels.every((label) => label.startsWith('@')));
});
