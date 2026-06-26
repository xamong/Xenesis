const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { XCON } = require('../XCON.js');
const Sketch = require('../xamong-sketch.js');

function toPlain(value) {
    return XCON.toPlainJSONObject(value);
}

function loadActions() {
    const sourcePath = path.resolve(__dirname, '..', 'xamong-actions.js');
    const context = {
        console,
        alert: () => {},
        setTimeout,
        clearTimeout,
        XCON,
        window: {
            XamongPublicProps: null,
            XamongServices: { ServiceManager: { services: () => ({ getService: () => null }) } },
            appHost: null
        }
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
    return context.window.XamongActions;
}

function readDraftFile(fileName) {
    return fs.readFileSync(path.resolve(__dirname, '..', fileName), 'utf8');
}

function extractConstObjectValues(source, objectName) {
    const match = source.match(new RegExp(`const\\s+${objectName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
    if (!match) return [];
    const values = [];
    const valuePattern = /:\s*['"]([^'"]+)['"]/g;
    let valueMatch;
    while ((valueMatch = valuePattern.exec(match[1]))) {
        values.push(valueMatch[1]);
    }
    return values;
}

function uniqueSorted(values) {
    return Array.from(new Set(values)).sort();
}

test('detects and parses XCON/SKETCH into native xamong XCON objects', () => {
    const doc = XCON.deserialize(`
        screen "Sketch Demo" 402x800 bg @surface
          header: panel at 0 0 402 72
            layout row
            padding 16 20
            title: label "Hello SKETCH" at 20 20 220 28

          save: button "저장" at 20 100 160 44
            color @accent
            onClick: toast "저장되었습니다"
    `);

    assert.equal(XCON.detectSyntax('screen 402x800\n  button "OK" at 0 0 80 40'), 'sketch');
    assert.equal(doc.get('type'), 'form');
    assert.equal(doc.get('name'), 'Sketch Demo');
    assert.deepEqual(doc.get('pos'), [0, 0, 402, 800]);
    assert.equal(doc.get('backgroundColor'), '@surface');

    const components = doc.get('components');
    assert.equal(components.get('componentsOrder'), 'header,save');
    assert.equal(components.get('header').get('components').get('title').get('text'), 'Hello SKETCH');

    const save = components.get('save');
    assert.equal(save.get('type'), 'button');
    assert.equal(save.get('label'), '저장');
    assert.equal(save.get('color'), '@accent');
    assert.deepEqual(toPlain(save.get('onClick')), {
        type: 'toast',
        message: '저장되었습니다'
    });
});

test('SKETCH support metadata covers every component type declared in drafts runtime', () => {
    assert.equal(typeof Sketch.getSupportedComponentTypes, 'function');

    const runtimeComponentTypes = uniqueSorted([
        ...extractConstObjectValues(readDraftFile('xamong-ui-components.js'), 'ComponentType'),
        ...extractConstObjectValues(readDraftFile('xamong-ui-components-ext.js'), 'ExtendedComponentType'),
        ...extractConstObjectValues(readDraftFile('xamong-ui-components-advanced.js'), 'AdvancedComponentType'),
        'form',
        'list'
    ]);
    const supportedComponentTypes = uniqueSorted(Sketch.getSupportedComponentTypes());
    const missing = runtimeComponentTypes.filter((type) => !supportedComponentTypes.includes(type));

    assert.deepEqual(missing, []);

    const sketch = [
        'screen "Component Coverage" 390x844',
        ...runtimeComponentTypes.map((type, index) => `  c${index}: ${type} at 0 ${index * 4} 20 4`)
    ].join('\n');
    const parsed = XCON.fromSketch(sketch);
    const components = toPlain(parsed.get('components'));

    runtimeComponentTypes.forEach((type, index) => {
        assert.equal(components[`c${index}`].type, type);
    });
});

test('SKETCH support metadata covers every action and command type declared in drafts runtime', () => {
    assert.equal(typeof Sketch.getSupportedActionTypes, 'function');

    const actionsSource = readDraftFile('xamong-actions.js');
    const runtimeActionTypes = uniqueSorted([
        ...extractConstObjectValues(actionsSource, 'ActionType'),
        ...extractConstObjectValues(actionsSource, 'CommandType')
    ]);
    const supportedActionTypes = uniqueSorted(Sketch.getSupportedActionTypes());
    const missing = runtimeActionTypes.filter((type) => !supportedActionTypes.includes(type));

    assert.deepEqual(missing, []);

    runtimeActionTypes.forEach((type, index) => {
        const doc = XCON.fromSketch(`
            screen "Action ${type}" 390x844
              action${index}: button "Action" at 0 0 120 44
                onClick
                  type "${type}"
        `);
        assert.equal(doc.get('components').get(`action${index}`).get('onClick').get('type'), type);
    });
});

test('SKETCH live editor completion inventory includes every supported component and action type', () => {
    const editorSource = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'xamong-sketch-live-editor.html'), 'utf8');

    assert.match(editorSource, /getSupportedComponentTypes/);
    assert.match(editorSource, /getSupportedActionTypes/);
    assert.match(editorSource, /getActionAliases/);
});

test('parses action blocks and batch action item shorthand', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          submit: button "주문하기" at 24 720 342 52
            onClick
              type batch
              actions
                - toast "주문이 접수되었습니다"
                - activity "completeScreen.xconj"
                - goBack
    `);

    const action = doc.get('components').get('submit').get('onClick');
    assert.equal(action.get('type'), 'batch');
    assert.deepEqual(toPlain(action.get('actions')), [
        { type: 'toast', message: '주문이 접수되었습니다' },
        { type: 'activity', xcon: 'completeScreen.xconj' },
        { type: 'goBack' }
    ]);
});

test('parses compact action headers without a type property line', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          submit: button "주문하기" at 24 720 342 52
            onClick
              batch "queue"
              - toast "주문이 접수되었습니다"
              - activity "completeScreen.xconj"
              - goBack
          refresh: button "새로고침" at 24 656 342 52
            onClick: batch "parallel"
              - get "/api/products"
              - toast "불러오는 중입니다"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('submit').get('onClick')), {
        type: 'batch',
        mode: 'queue',
        actions: [
            { type: 'toast', message: '주문이 접수되었습니다' },
            { type: 'activity', xcon: 'completeScreen.xconj' },
            { type: 'goBack' }
        ]
    });
    assert.deepEqual(toPlain(components.get('refresh').get('onClick')), {
        type: 'batch',
        mode: 'parallel',
        actions: [
            { type: 'callApi', method: 'GET', url: '/api/products' },
            { type: 'toast', message: '불러오는 중입니다' }
        ]
    });
});

test('parses valueless object properties as empty objects', () => {
    const doc = XCON.fromSketch(`
        screen "Empty Object Props" 390x844
          heroText: label "설명" at 22 52 224 40
            al
            border
              visible false
          heroAction: button "동네 둘러보기" at 248 78 92 34
            al
            onClick: toast "이동합니다"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('heroText').get('al')), {});
    assert.deepEqual(toPlain(components.get('heroText').get('border')), { visible: false });
    assert.deepEqual(toPlain(components.get('heroAction').get('al')), {});
    assert.equal(components.get('heroAction').get('onClick').get('type'), 'toast');

    const fromJson = XCON.fromJSONObject({
        type: 'form',
        pos: [0, 0, 390, 844],
        components: {
            componentsOrder: 'text',
            text: {
                type: 'label',
                pos: '22,52,224,40',
                al: {},
                text: '설명'
            }
        }
    });
    const roundTrip = XCON.fromSketch(XCON.toSketch(fromJson));
    assert.deepEqual(toPlain(roundTrip.get('components').get('text').get('al')), {});
});

test('parses legacy boolean border and shadow property shorthands', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          card: panel at 20 40 320 180
            border "true"
            shadow "false"
    `);

    const card = toPlain(doc.get('components').get('card'));
    assert.deepEqual(card.border, { visible: true });
    assert.deepEqual(card.shadow, { visible: false });
});

test('parses multiline JSON properties used by banner slides and list data templates', () => {
    const doc = XCON.fromSketch(`
        screen "Travel Home" 402x812 bg @surface
          hero: banner at 20 150 362 220
            slides [
              {
                "type": "image",
                "src": "stay-hero.jpg",
                "overlayTitle": "Hidden stays"
              },
              {
                "type": "image",
                "src": "stay-cabin.jpg",
                "overlayTitle": "Mountain week"
              }
            ]
          recentList: list at 20 492 362 172
            dataTemplate {
              "type": "template",
              "template": {
                "tabledata": [
                  { "title": "감성 스튜디오", "line": "서울  89,000/박", "image": "stay-studio.jpg" },
                  { "title": "산장 뷰 하우스", "line": "강원  210,000/박", "image": "stay-cabin.jpg" }
                ]
              }
            }
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('hero').get('slides')), [
        { type: 'image', src: 'stay-hero.jpg', overlayTitle: 'Hidden stays' },
        { type: 'image', src: 'stay-cabin.jpg', overlayTitle: 'Mountain week' }
    ]);
    assert.deepEqual(toPlain(components.get('recentList').get('dataTemplate')), {
        type: 'template',
        template: {
            tabledata: [
                { title: '감성 스튜디오', line: '서울  89,000/박', image: 'stay-studio.jpg' },
                { title: '산장 뷰 하우스', line: '강원  210,000/박', image: 'stay-cabin.jpg' }
            ]
        }
    });
});

test('parses HTTP verb action shortcuts and payload aliases', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          load: button "불러오기" at 24 40 160 44
            onClick: get "/api/products"
          submit: button "전송" at 24 96 160 44
            onClick
              post "/api/orders" payload {"name":"americano","qty":2}
              success: toast "주문 완료"
              failure: alert "실패" "다시 시도해주세요"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('load').get('onClick')), {
        type: 'callApi',
        method: 'GET',
        url: '/api/products'
    });
    assert.deepEqual(toPlain(components.get('submit').get('onClick')), {
        type: 'callApi',
        method: 'POST',
        url: '/api/orders',
        parameter: { name: 'americano', qty: 2 },
        success: { type: 'toast', message: '주문 완료' },
        failure: { type: 'alert', title: '실패', message: '다시 시도해주세요' }
    });
});

test('parses default queue batch and implicit batches from repeated action lines', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          quick: button "빠른 실행" at 24 40 160 44
            onClick: batch
              - toast "시작합니다"
              - go "complete.xconj"
          flow: button "흐름 실행" at 24 96 160 44
            onClick
              toast "처리를 시작합니다"
              post "/api/orders" payload {"qty":2}
              go "complete.xconj"
          guarded: button "저장" at 24 152 160 44
            onClick
              post "/api/save" payload {"id":1}
              success: toast "저장되었습니다"
              failure: alert "실패" "다시 시도해주세요"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('quick').get('onClick')), {
        type: 'batch',
        actions: [
            { type: 'toast', message: '시작합니다' },
            { type: 'activity', xcon: 'complete.xconj' }
        ]
    });
    assert.deepEqual(toPlain(components.get('flow').get('onClick')), {
        type: 'batch',
        actions: [
            { type: 'toast', message: '처리를 시작합니다' },
            { type: 'callApi', method: 'POST', url: '/api/orders', parameter: { qty: 2 } },
            { type: 'activity', xcon: 'complete.xconj' }
        ]
    });
    assert.deepEqual(toPlain(components.get('guarded').get('onClick')), {
        type: 'callApi',
        method: 'POST',
        url: '/api/save',
        parameter: { id: 1 },
        success: { type: 'toast', message: '저장되었습니다' },
        failure: { type: 'alert', title: '실패', message: '다시 시도해주세요' }
    });
});

test('parses XaForm lifecycle actions and trigger declarations', () => {
    const doc = XCON.fromSketch(`
        screen "Reactive Form" 390x844 hidenavbar true scroll vertical
          onCreate: toast "created"
          onLoad
            wait 250
            toast "loaded"
          onPause: log "paused"
          trigger reloadProducts on global.filters.query event change render productList
            post "/api/products" query {"q":"{{event.value}}"}
            success: toast "상품을 갱신했습니다"
            failure: alert "갱신 실패" "다시 시도해주세요"
          productList: list at 0 96 390 640
    `);

    assert.equal(doc.get('title'), undefined);
    assert.equal(doc.get('name'), 'Reactive Form');
    assert.equal(doc.get('hidenavbar'), true);
    assert.equal(doc.get('scroll'), 'vertical');
    assert.deepEqual(toPlain(doc.get('onCreate')), {
        type: 'toast',
        message: 'created'
    });
    assert.deepEqual(toPlain(doc.get('onLoad')), {
        type: 'batch',
        actions: [
            { type: 'sleep', duration: 250 },
            { type: 'toast', message: 'loaded' }
        ]
    });
    assert.deepEqual(toPlain(doc.get('onPause')), {
        type: 'log',
        message: 'paused'
    });
    assert.deepEqual(toPlain(doc.get('triggers')), {
        reloadProducts: {
            dependency: ['global.filters.query'],
            event: 'change',
            render: true,
            renderTarget: ['productList'],
            action: {
                type: 'callApi',
                method: 'POST',
                url: '/api/products',
                parameter: { q: '{{event.value}}' },
                success: { type: 'toast', message: '상품을 갱신했습니다' },
                failure: { type: 'alert', title: '갱신 실패', message: '다시 시도해주세요' }
            }
        }
    });
});

test('parses XaAction chain statements from SKETCH action blocks', () => {
    const doc = XCON.fromSketch(`
        screen "Chain Demo" 390x844
          save: button "저장" at 24 40 160 44
            onClick: toast "저장되었습니다"
              chain
                local.form.status = "saved"
                global.audit._push("save")
          logClick: button "로그" at 24 96 160 44
            onClick: log "clicked" chain "local.clicks = local.clicks + 1"
          sync: button "동기화" at 24 152 160 44
            onClick
              post "/api/sync" payload {"id":"{{sender.id}}"}
              chain
                local.lastSync = event.timestamp
                global.syncState = "done"
          trigger syncOnUser on global.user.id event change render true
            post "/api/sync-user" payload {"id":"{{event.value}}"}
            chain
              local.lastUserSync = event.timestamp
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('save').get('onClick')), {
        type: 'toast',
        message: '저장되었습니다',
        chain: [
            'local.form.status = "saved"',
            'global.audit._push("save")'
        ]
    });
    assert.deepEqual(toPlain(components.get('logClick').get('onClick')), {
        type: 'log',
        message: 'clicked',
        chain: ['local.clicks = local.clicks + 1']
    });
    assert.deepEqual(toPlain(components.get('sync').get('onClick')), {
        type: 'callApi',
        method: 'POST',
        url: '/api/sync',
        parameter: { id: '{{sender.id}}' },
        chain: [
            'local.lastSync = event.timestamp',
            'global.syncState = "done"'
        ]
    });
    assert.deepEqual(toPlain(doc.get('triggers').get('syncOnUser').get('action')), {
        type: 'callApi',
        method: 'POST',
        url: '/api/sync-user',
        parameter: { id: '{{event.value}}' },
        chain: ['local.lastUserSync = event.timestamp']
    });
});

test('serializes XaAction chain statements as SKETCH chain blocks', () => {
    const doc = XCON.fromJSONObject({
        type: 'form',
        name: 'Chain Demo',
        pos: [0, 0, 390, 844],
        components: {
            componentsOrder: 'save',
            save: {
                type: 'button',
                name: 'save',
                label: '저장',
                pos: [24, 40, 160, 44],
                onClick: {
                    type: 'toast',
                    message: '저장되었습니다',
                    chain: [
                        'local.form.status = "saved"',
                        'global.audit._push("save")'
                    ]
                }
            }
        }
    });

    const sketch = XCON.toSketch(doc);
    const parsed = XCON.fromSketch(sketch);

    assert.match(sketch, /chain\n\s+- "local\.form\.status = \\"saved\\""/);
    assert.match(sketch, /global\.audit\._push/);
    assert.deepEqual(toPlain(parsed), toPlain(doc));
});

test('distinguishes XaAction pre-chain from standalone ChainAction statements', () => {
    const doc = XCON.fromSketch(`
        screen "Chain Distinction" 390x844
          pre: button "선행 체인" at 24 40 160 44
            onClick: toast "저장되었습니다"
              chain
                local.beforeToast = "yes"
          inline: button "인라인 체인 액션" at 24 96 160 44
            onClick: runChain "local.inlineStep = \\"ready\\""
          flow: button "순서 체인" at 24 152 160 44
            onClick: batch
              - toast "before"
              - runChain "local.middleStep = \\"ready\\""
              - toast "after"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('pre').get('onClick')), {
        type: 'toast',
        message: '저장되었습니다',
        chain: ['local.beforeToast = "yes"']
    });
    assert.deepEqual(toPlain(components.get('inline').get('onClick')), {
        type: 'chain',
        statements: ['local.inlineStep = "ready"']
    });
    assert.deepEqual(toPlain(components.get('flow').get('onClick')), {
        type: 'batch',
        actions: [
            { type: 'toast', message: 'before' },
            { type: 'chain', statements: ['local.middleStep = "ready"'] },
            { type: 'toast', message: 'after' }
        ]
    });
});

test('parses block-style standalone ChainAction in implicit action sequences', () => {
    const doc = XCON.fromSketch(`
        screen "Chain Block" 390x844
          save: button "저장" at 24 40 160 44
            onClick
              runChain
                local.step = "prepare"
                global.audit._push("prepare")
              toast "완료"
          trigger syncOnUser on global.user.id event change render true
            runChain
              local.triggerStep = event.timestamp
            toast "동기화 완료"
    `);

    const buttonAction = doc.get('components').get('save').get('onClick');
    const triggerAction = doc.get('triggers').get('syncOnUser').get('action');

    assert.deepEqual(toPlain(buttonAction), {
        type: 'batch',
        actions: [
            {
                type: 'chain',
                statements: [
                    'local.step = "prepare"',
                    'global.audit._push("prepare")'
                ]
            },
            { type: 'toast', message: '완료' }
        ]
    });
    assert.deepEqual(toPlain(triggerAction), {
        type: 'batch',
        actions: [
            {
                type: 'chain',
                statements: ['local.triggerStep = event.timestamp']
            },
            { type: 'toast', message: '동기화 완료' }
        ]
    });
});

test('serializes XaForm triggers into readable SKETCH trigger declarations', () => {
    const doc = XCON.fromJSONObject({
        type: 'form',
        name: 'Reactive Form',
        pos: [0, 0, 390, 844],
        triggers: {
            reloadProducts: {
                event: 'change',
                dependency: ['global.filters.query'],
                render: true,
                renderTarget: ['productList'],
                action: {
                    type: 'toast',
                    message: '상품을 갱신했습니다'
                }
            }
        },
        components: {
            componentsOrder: 'productList',
            productList: {
                type: 'list',
                name: 'productList',
                pos: [0, 96, 390, 640]
            }
        }
    });

    const sketch = XCON.toSketch(doc);
    const parsed = XCON.fromSketch(sketch);

    assert.match(sketch, /trigger reloadProducts on global\.filters\.query event change render productList/);
    assert.match(sketch, /action/);
    assert.match(sketch, /type "toast"/);
    assert.deepEqual(toPlain(parsed), toPlain(doc));
});

test('keeps declared communication picker and launch action names available in SKETCH', () => {
    const doc = XCON.fromSketch(`
        screen 390x844
          email: button "메일" at 24 40 120 44
            onClick: sendEmail to "help@example.com" subject "문의"
          image: button "이미지" at 24 92 120 44
            onClick: imagePicker target "profileImage"
          open: button "열기" at 24 144 120 44
            onClick: launch "https://example.com"
    `);

    const components = doc.get('components');
    assert.deepEqual(toPlain(components.get('email').get('onClick')), {
        type: 'sendEmail',
        to: 'help@example.com',
        subject: '문의'
    });
    assert.deepEqual(toPlain(components.get('image').get('onClick')), {
        type: 'imagePicker',
        target: 'profileImage'
    });
    assert.deepEqual(toPlain(components.get('open').get('onClick')), {
        type: 'launch',
        url: 'https://example.com'
    });
});

test('serializes xamong XCON back to SKETCH without losing components or actions', () => {
    const doc = XCON.fromJSONObject({
        type: 'form',
        title: 'AirBnB - Main',
        pos: [0, 0, 402, 800],
        components: {
            componentsOrder: 'cta',
            cta: {
                type: 'button',
                name: 'cta',
                label: '맞춤 추천 받기',
                pos: [20, 360, 180, 42],
                onClick: {
                    type: 'toast',
                    message: '추천을 불러옵니다'
                }
            }
        }
    });

    const sketch = XCON.toSketch(doc);
    const parsed = XCON.fromSketch(sketch);

    assert.match(sketch, /screen 402x800/);
    assert.match(sketch, /title "AirBnB - Main"/);
    assert.match(sketch, /cta: button "맞춤 추천 받기" at 20 360 180 42/);
    assert.deepEqual(toPlain(parsed), toPlain(doc));
});

test('serializes legacy string booleans and numeric props as typed SKETCH values', () => {
    const doc = XCON.fromJSONObject({
        type: 'form',
        pos: [0, 0, 390, 844],
        border: 'true',
        shadow: 'false',
        borderWidth: '1',
        shadowOpacity: '0.08',
        components: {
            componentsOrder: 'title',
            title: {
                type: 'label',
                text: 'Typed values',
                pos: '20,40,240,28',
                fontSize: '12',
                fontWeight: '600',
                renderHtml: 'false',
                color: 'var(--ink)'
            }
        }
    });

    const sketch = XCON.toSketch(doc);
    assert.match(sketch, /^  border true$/m);
    assert.match(sketch, /^  shadow false$/m);
    assert.match(sketch, /^  borderWidth 1$/m);
    assert.match(sketch, /^  shadowOpacity 0.08$/m);
    assert.match(sketch, /^    fontSize 12$/m);
    assert.match(sketch, /^    fontWeight 600$/m);
    assert.match(sketch, /^    renderHtml false$/m);
    assert.match(sketch, /^    color @ink$/m);
    assert.doesNotMatch(sketch, /border "true"/);
    assert.doesNotMatch(sketch, /shadow "false"/);

    const parsed = XCON.fromSketch(sketch);
    const plain = toPlain(parsed);
    assert.deepEqual(plain.border, { visible: true });
    assert.deepEqual(plain.shadow, { visible: false });
    assert.equal(plain.borderWidth, 1);
    assert.equal(plain.components.title.fontSize, 12);
    assert.equal(plain.components.title.renderHtml, false);
    assert.equal(plain.components.title.color, '@ink');
});

test('xamong actions created from SKETCH action objects use the existing ActionFactory', () => {
    const actions = loadActions();
    const doc = Sketch.fromSketch(`
        screen 390x844
          save: button "저장" at 24 40 120 44
            onClick: toast "저장되었습니다"
          player: panel at 0 100 390 200
            onClick: start "heroBanner"
    `);

    const components = doc.get('components');
    const toast = actions.ActionFactory.createFromXCON(components.get('save').get('onClick'), {});
    const start = actions.ActionFactory.createFromXCON(components.get('player').get('onClick'), {});

    assert.equal(toast.constructor.name, 'ToastAction');
    assert.equal(toast.message, '저장되었습니다');
    assert.equal(start.constructor.name, 'StartEventAction');
    assert.equal(start.target, 'heroBanner');
});
