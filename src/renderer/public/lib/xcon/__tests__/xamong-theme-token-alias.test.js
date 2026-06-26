const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { XCON } = require('../XCON.js');
const Sketch = require('../xamong-sketch.js');
const PublicProps = require('../xamong-public-props.js');

function toXcon(value) {
    return XCON.fromJSONObject(value);
}

function loadDraftRenderer(options = {}) {
    const window = {
        EDIT_MODE: false,
        XamongPublicProps: PublicProps,
        XCON
    };

    const context = {
        console,
        document: {
            body: {},
            documentElement: {
                setAttribute: () => {}
            },
            createElement: () => {
                let text = '';
                return {
                    set textContent(value) {
                        text = String(value == null ? '' : value);
                    },
                    get innerHTML() {
                        return text.replace(/[&<>"']/g, (char) => ({
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#39;'
                        })[char]);
                    }
                };
            },
            getElementById: () => null,
            querySelector: () => null
        },
        localStorage: {
            getItem: () => null,
            setItem: () => {}
        },
        requestAnimationFrame: () => {},
        setTimeout: () => {},
        clearTimeout: () => {},
        XCON,
        XamongPublicProps: PublicProps,
        window
    };

    context.globalThis = context;
    window.document = context.document;
    window.requestAnimationFrame = context.requestAnimationFrame;
    window.setTimeout = context.setTimeout;
    window.clearTimeout = context.clearTimeout;
    vm.createContext(context);

    const sourcePath = path.resolve(__dirname, '..', 'xamong-ui-components.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    vm.runInContext(source, context, { filename: sourcePath });

    if (options.autoLayout) {
        const alSourcePath = path.resolve(__dirname, '..', 'xamong-ui-components-autolayout.js');
        const alSource = fs.readFileSync(alSourcePath, 'utf8');
        vm.runInContext(alSource, context, { filename: alSourcePath });
    }

    const ui = context.window.XamongUIComponents;
    ui.AL = context.window.XamongUIComponentsAL;
    return ui;
}

test('draft renderer expands @theme aliases in parsed colors and inline styles', () => {
    const ui = loadDraftRenderer();
    const panel = new ui.XaPanel(toXcon({
        type: 'panel',
        pos: [0, 0, 120, 80],
        backgroundColor: '@surface',
        color: '@ink',
        border: {
            visible: true,
            width: 1,
            style: 'solid',
            color: '@border'
        },
        style: 'outline:1px solid @border;box-shadow:0 0 0 1px @accent;'
    }), 'panelToken', null);

    const html = panel.render();

    assert.match(html, /background-color:\s*var\(--surface\)/);
    assert.match(html, /color:\s*var\(--ink\)/);
    assert.match(html, /border:\s*1px solid var\(--border\)/);
    assert.match(html, /outline:1px solid var\(--border\)/);
    assert.match(html, /box-shadow:0 0 0 1px var\(--accent\)/);
});

test('draft panel renderer respects public hidden border and shadow groups', () => {
    const ui = loadDraftRenderer();
    const panel = new ui.XaPanel(toXcon({
        type: 'panel',
        pos: [0, 0, 120, 80],
        backgroundColor: '@surface',
        border: {
            visible: false,
            width: 1,
            style: 'solid',
            color: '@border',
            radius: 10
        },
        shadow: {
            visible: false,
            color: '@shadow',
            opacity: 0.1,
            blur: 8,
            radius: 16
        }
    }), 'panelHiddenChrome', null);

    const html = panel.render();

    assert.match(html, /border:\s*none/);
    assert.match(html, /box-shadow:\s*none/);
    assert.doesNotMatch(html, /box-shadow:\s*0\s+8px\s+16px/);
});

test('draft auto-layout panel renderer respects public hidden shadow groups', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'panel',
        pos: [0, 0, 120, 80],
        backgroundColor: '@surface',
        al: {
            autoHeight: true,
            gap: 0,
            padding: 0
        },
        border: {
            visible: false,
            width: 1,
            style: 'solid',
            color: '@border',
            radius: 10
        },
        shadow: {
            visible: false,
            color: '@shadow',
            opacity: 0.1,
            blur: 8,
            radius: 16
        }
    }), 'panelHiddenChrome');

    assert.match(html, /border:\s*none/);
    assert.match(html, /box-shadow:\s*none/);
    assert.doesNotMatch(html, /box-shadow:\s*0\s+8px\s+16px/);
});

test('draft image renderer maps public border and shadow groups to valid CSS', () => {
    const ui = loadDraftRenderer();
    const prevWindow = global.window;
    const prevLocalStorage = global.localStorage;
    global.window = {};
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    try {
        const hiddenChrome = new ui.XaImage(toXcon({
            type: 'image',
            pos: [0, 0, 120, 80],
            src: 'hero.jpg',
            border: {
                visible: 'false',
                radius: '10px'
            },
            shadow: {
                visible: 'false'
            }
        }), 'imageHiddenChrome', null).render();

        assert.doesNotMatch(hiddenChrome, /border:\s*false/);
        assert.doesNotMatch(hiddenChrome, /box-shadow:\s*false/);

        const cssChrome = new ui.XaImage(toXcon({
            type: 'image',
            pos: [0, 0, 120, 80],
            src: 'hero.jpg',
            border: {
                width: 2,
                style: 'solid',
                color: '@border'
            },
            shadow: {
                visible: 'var(--shadow-sm)'
            }
        }), 'imageCssChrome', null).render();

        assert.match(cssChrome, /border:\s*2px solid var\(--border\)/);
        assert.match(cssChrome, /box-shadow:\s*var\(--shadow-sm\)/);
    } finally {
        global.window = prevWindow;
        global.localStorage = prevLocalStorage;
    }
});

test('draft auto-layout text field respects public pill search chrome', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'textField',
        placeholder: '어디로 여행가세요?',
        pos: [0, 0, 520, 48],
        border: {
            visible: 'false',
            radius: '24'
        },
        backgroundColor: '@surface2',
        al: {
            alignSelf: 'stretch',
            width: '100%'
        },
        prefix: {
            icon: 'search'
        }
    }), 'searchField');

    assert.match(html, /class="xa-al-tf-addon-wrap has-prefix"[^>]*style="[^"]*height:\s*100%/);
    assert.match(html, /border:\s*none/);
    assert.match(html, /border-radius:\s*24px/);
    assert.match(html, /box-shadow:\s*none/);
    assert.match(html, /class="xa-al-tf-prefix xa-al-tf-prefix-icon"/);
    assert.match(html, /padding-left:\s*38px/);
});

test('draft auto-layout label maps public valign aliases to fixed box vertical placement', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'label',
        text: '안녕하세요',
        pos: [10, 10, 400, 60],
        backgroundColor: '#00ffff',
        color: '#ffffff',
        font: {
            size: 24,
            weight: 'bold'
        },
        textAlign: 'center',
        textVerticalAlign: 'bottom'
    }), 'labelValign');

    assert.match(html, /width:\s*400px/);
    assert.match(html, /height:\s*60px/);
    assert.match(html, /justify-content:\s*flex-end/);
});

test('draft auto-layout root form preserves intrinsic screen width in shrink-wrap preview hosts', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 480, 600],
        hidenavbar: true,
        backgroundColor: '#FF00FF'
    }), 'root');

    const rootTag = html.slice(0, html.indexOf('data-component-key="root"') + 120);
    assert.match(rootTag, /width:\s*480px/);
    assert.match(rootTag, /max-width:\s*100%/);
    assert.doesNotMatch(rootTag, /width:\s*min\(100%/);
});

test('draft xcon-viewer harness renders documents with the canonical root key', () => {
    const viewerPath = path.resolve(__dirname, '..', '..', '..', 'xcon-viewer.html');
    const viewerHtml = fs.readFileSync(viewerPath, 'utf8');

    assert.match(viewerHtml, /renderComponent\(tree,\s*'root',\s*null\)/);
    assert.doesNotMatch(viewerHtml, /renderComponent\(tree,\s*'xvRoot'/);
});

test('public SKETCH live editor fit mode uses scaled layout bounds without preview scrollbars', () => {
    const editorPath = path.resolve(__dirname, '..', '..', '..', 'xcon-sketch-public-live-editor.html');
    const html = fs.readFileSync(editorPath, 'utf8');

    assert.match(html, /\.preview-body\s*\{[\s\S]*overflow:\s*hidden/);
    assert.match(html, /\.preview-body\.is-original\s*\{\s*overflow:\s*auto;\s*\}/);
    assert.match(html, /previewCanvas\.style\.width\s*=\s*`\$\{Math\.ceil\(width \* scale\)\}px`/);
    assert.match(html, /previewCanvas\.style\.height\s*=\s*`\$\{Math\.ceil\(height \* scale\)\}px`/);
    assert.match(html, /appContent\.style\.transform\s*=\s*`scale\(\$\{scale\}\)`/);
    assert.doesNotMatch(html, /previewCanvas\.style\.transform\s*=\s*`scale/);
});

test('draft sketch font block align and valign render as label box alignment', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const tree = PublicProps.migrateXCON(Sketch.fromSketch(`
screen 480x600
  bg #FF00FF
  label1: label "안녕하세요" at 10 10 400 80
    bg #00FFFF
    color #FFFFFF
    font
      size 24
      weight "bold"
      align center
      valign bottom
`));
    const html = ui.AL.renderComponent(tree, 'root');
    const keyIndex = html.indexOf('data-component-key="root~label1"');
    const start = html.lastIndexOf('<', keyIndex);
    const end = html.indexOf('>', keyIndex);
    const labelTag = html.slice(start, end + 1);

    assert.match(labelTag, /width:\s*400px/);
    assert.match(labelTag, /height:\s*80px/);
    assert.match(labelTag, /justify-content:\s*flex-end/);
    assert.match(html, /text-align:\s*center/);
});

test('draft auto-layout coordinate form does not leak coordinate mode into nested auto-layout panels', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 402, 800],
        hidenavbar: true,
        components: {
            header: {
                type: 'panel',
                pos: [0, 0, 402, 86],
                al: {
                    direction: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 20px'
                },
                components: {
                    logo: {
                        type: 'label',
                        text: 'airbnb',
                        pos: [0, 0, 120, 28],
                        color: '@accent',
                        font: {
                            size: 18,
                            weight: 800
                        }
                    },
                    menu: {
                        type: 'button',
                        label: '',
                        pos: [0, 0, 42, 42],
                        icon: {
                            name: 'menu'
                        }
                    },
                    componentsOrder: 'logo,menu'
                }
            },
            componentsOrder: 'header'
        }
    }), 'root');

    const tagForKey = (key) => {
        const keyIndex = html.indexOf(`data-component-key="${key}"`);
        if (keyIndex < 0) return '';
        const start = html.lastIndexOf('<', keyIndex);
        const end = html.indexOf('>', keyIndex);
        return html.slice(start, end + 1);
    };
    const headerTag = tagForKey('root~header');
    const logoTag = tagForKey('root~header~logo');
    const menuTag = tagForKey('root~header~menu');

    assert.match(headerTag, /position:\s*absolute/);
    assert.doesNotMatch(logoTag, /position:\s*absolute/);
    assert.doesNotMatch(menuTag, /position:\s*absolute/);
});

test('draft auto-layout row panels preserve plain child label width', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 402, 812],
        hidenavbar: true,
        components: {
            header: {
                type: 'panel',
                pos: [0, 0, 402, 80],
                al: {
                    direction: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px'
                },
                components: {
                    brand: {
                        type: 'label',
                        text: 'travel',
                        pos: [0, 0, 160, 32],
                        color: '@accent',
                        font: {
                            size: 20,
                            weight: 800
                        }
                    },
                    menu: {
                        type: 'button',
                        label: '',
                        pos: [0, 0, 42, 42],
                        icon: {
                            name: 'menu'
                        }
                    },
                    componentsOrder: 'brand,menu'
                }
            },
            componentsOrder: 'header'
        }
    }), 'root');

    const tagForKey = (key) => {
        const keyIndex = html.indexOf(`data-component-key="${key}"`);
        if (keyIndex < 0) return '';
        const start = html.lastIndexOf('<', keyIndex);
        const end = html.indexOf('>', keyIndex);
        return html.slice(start, end + 1);
    };
    const brandTag = tagForKey('root~header~brand');
    const brandWithoutMaxWidth = brandTag.replace(/max-width:\s*100%;?/gi, '');

    assert.match(brandTag, /width:\s*160px/);
    assert.doesNotMatch(brandWithoutMaxWidth, /width:\s*100%/);
    assert.match(brandTag, /flex:\s*0 0 auto/);
});

test('draft auto-layout coordinate form preserves absolute banner geometry', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 402, 812],
        hidenavbar: true,
        components: {
            hero: {
                type: 'banner',
                pos: [20, 150, 362, 220],
                bannerHeight: '220px',
                border: { radius: 20 },
                slides: [
                    {
                        type: 'label',
                        text: 'NEW'
                    }
                ]
            },
            componentsOrder: 'hero'
        }
    }), 'root');

    const keyIndex = html.indexOf('data-component-key="root~hero"');
    const start = html.lastIndexOf('<', keyIndex);
    const end = html.indexOf('>', keyIndex);
    const heroTag = html.slice(start, end + 1);

    assert.match(heroTag, /position:\s*absolute/);
    assert.doesNotMatch(heroTag, /position:\s*relative/);
    assert.match(heroTag, /left:\s*20px/);
    assert.match(heroTag, /top:\s*150px/);
    assert.match(heroTag, /width:\s*362px/);
    assert.match(heroTag, /height:\s*220px/);
    assert.doesNotMatch(heroTag, /width:\s*100%/);
});

test('draft auto-layout coordinate form preserves absolute list geometry', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const list = ui.AL.ComponentFactoryAL.createFromXCON(toXcon({
        type: 'list',
        pos: [20, 492, 362, 172],
        direction: 'horizontal',
        itemSize: {
            width: 156,
            height: 172
        },
        separator: {
            size: 12
        }
    }), 'root~recentList', null);
    list._xconParentCoordinateLayout = true;
    const listTag = `<div style="${list.getBaseStyle()}">`;

    assert.match(listTag, /position:\s*absolute/);
    assert.match(listTag, /left:\s*20px/);
    assert.match(listTag, /top:\s*492px/);
    assert.match(listTag, /width:\s*362px/);
    assert.match(listTag, /height:\s*172px/);
    assert.doesNotMatch(listTag, /width:\s*100%/);
});

test('draft auto-layout flow keeps coordinate child panel box size like public rendering', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 402, 812],
        hidenavbar: true,
        components: {
            content: {
                type: 'panel',
                pos: [0, 96, 402, 644],
                al: {
                    direction: 'column',
                    gap: 16,
                    padding: '16px 20px 24px'
                },
                components: {
                    hero: {
                        type: 'panel',
                        pos: [0, 0, 362, 156],
                        backgroundColor: '@accent',
                        border: {
                            visible: false,
                            radius: 24
                        },
                        components: {
                            heroTitle: {
                                type: 'label',
                                text: '퇴근 전에 필요한 장보기',
                                pos: [24, 24, 220, 56],
                                color: '#FFFFFF'
                            },
                            componentsOrder: 'heroTitle'
                        }
                    },
                    quickActions: {
                        type: 'panel',
                        pos: [0, 0, 362, 94],
                        al: {
                            direction: 'row',
                            gap: 10,
                            padding: 14
                        }
                    },
                    componentsOrder: 'hero,quickActions'
                }
            },
            componentsOrder: 'content'
        }
    }), 'root');

    const tagForKey = (key) => {
        const keyIndex = html.indexOf(`data-component-key="${key}"`);
        if (keyIndex < 0) return '';
        const start = html.lastIndexOf('<', keyIndex);
        const end = html.indexOf('>', keyIndex);
        return html.slice(start, end + 1);
    };
    const heroTag = tagForKey('root~content~hero');
    const titleTag = tagForKey('root~content~hero~heroTitle');

    assert.match(heroTag, /width:\s*362px/);
    assert.match(heroTag, /height:\s*156px/);
    assert.doesNotMatch(heroTag, /(?:^|;)\s*height:\s*auto/);
    assert.match(titleTag, /position:\s*absolute/);
});

test('draft list model reads public list aliases used by the public renderer', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const list = new ui.XaList(toXcon({
        type: 'list',
        pos: [20, 492, 362, 172],
        direction: 'horizontal',
        itemSize: { width: 156, height: 172 },
        separator: { size: 12 },
        cellTemplate: {
            title: {
                type: 'label',
                text: '{{item.title}}',
                pos: [10, 12, 136, 24],
                font: { size: 15, weight: 700 }
            },
            line: {
                type: 'label',
                text: '{{item.line}}',
                pos: [10, 42, 136, 24],
                font: { size: 12 }
            },
            itemSize: { width: 156, height: 172 }
        }
    }), 'recentList', null);

    assert.equal(list.orientation, 'horizontal');
    assert.equal(list.rowWidth, 156);
    assert.equal(list.rowHeight, 172);
    assert.equal(list.separatorWidth, 12);
    assert.equal(list.separatorHeight, 12);
    assert.ok(list.cellLayout);
    assert.equal(list.getLayoutProperty(list.cellLayout, 'rowWidth'), 156);
    assert.equal(list.getLayoutProperty(list.cellLayout, 'rowHeight'), 172);
});

test('draft auto-layout bottom navigation preserves five fixed-width row buttons', () => {
    const ui = loadDraftRenderer({ autoLayout: true });
    const html = ui.AL.renderComponent(toXcon({
        type: 'form',
        pos: [0, 0, 402, 812],
        hidenavbar: true,
        components: {
            bottomNav: {
                type: 'panel',
                pos: [0, 740, 402, 72],
                al: {
                    direction: 'row',
                    justifyContent: 'space-around',
                    alignItems: 'center'
                },
                components: {
                    componentsOrder: 'tabHome,tabSearch,tabCart,tabTrack,tabMore',
                    tabHome: { type: 'button', label: '홈', pos: [0, 0, 60, 44], backgroundColor: 'transparent' },
                    tabSearch: { type: 'button', label: '검색', pos: [0, 0, 60, 44], backgroundColor: 'transparent' },
                    tabCart: { type: 'button', label: '장바구니', pos: [0, 0, 70, 44], backgroundColor: 'transparent' },
                    tabTrack: { type: 'button', label: '배송', pos: [0, 0, 60, 44], backgroundColor: 'transparent' },
                    tabMore: { type: 'button', label: '혜택', pos: [0, 0, 60, 44], backgroundColor: 'transparent' }
                }
            },
            componentsOrder: 'bottomNav'
        }
    }), 'root');

    const tagForKey = (key) => {
        const marker = `data-component-key="root~bottomNav~${key}"`;
        const index = html.indexOf(marker);
        assert.notEqual(index, -1, `${key} should be rendered`);
        const start = html.lastIndexOf('<button', index);
        const end = html.indexOf('>', index);
        return html.slice(start, end + 1);
    };

    for (const key of ['tabHome', 'tabSearch', 'tabCart', 'tabTrack', 'tabMore']) {
        const tag = tagForKey(key);
        assert.doesNotMatch(tag, /width:\s*auto/);
        assert.match(tag, /flex:\s*0 0 auto/);
    }
    assert.match(tagForKey('tabCart'), /width:\s*70px/);
    assert.match(tagForKey('tabMore'), /width:\s*60px/);
});

test('shape renderer expands @theme aliases in generated style blocks', () => {
    const ui = loadDraftRenderer();
    const shape = new ui.XaShape(toXcon({
        type: 'shape',
        pos: [0, 0, 120, 40],
        backgroundColor: '@surface2',
        border: {
            visible: true,
            width: 2,
            style: 'solid',
            color: '@border2'
        },
        boxShadow: '0 2px 8px @shadow'
    }), 'shapeToken', null);

    const html = shape.render();

    assert.match(html, /background-color:\s*var\(--surface2\)/);
    assert.match(html, /border:\s*2px solid var\(--border2\)/);
    assert.match(html, /box-shadow:\s*0 2px 8px var\(--shadow\)/);
});
