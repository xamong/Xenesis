const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { XCON } = require('../XCON.js');
const PublicProps = require('../xamong-public-props.js');

function toXcon(value) {
    return XCON.fromJSONObject(value);
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

test('reads public color and nested font props from XCON data', () => {
    const data = toXcon({
        backgroundColor: '#112233',
        backgroundImage: 'hero.png',
        color: 'rgba(1, 2, 3, 0.5)',
        font: {
            family: 'Inter',
            size: 18,
            weight: 700,
            italic: true,
            underline: true,
            autoFit: true
        },
        textVerticalAlign: 'bottom'
    });

    assert.equal(PublicProps.read(data, 'bgColor'), '#112233');
    assert.equal(PublicProps.read(data, 'bgImage'), 'hero.png');
    assert.equal(PublicProps.read(data, 'fgColor'), 'rgba(1, 2, 3, 0.5)');
    assert.equal(PublicProps.read(data, 'font'), 'Inter');
    assert.equal(PublicProps.read(data, 'fontSize'), 18);
    assert.equal(PublicProps.read(data, 'fontWeight'), 700);
    assert.equal(PublicProps.read(data, 'italic'), true);
    assert.equal(PublicProps.read(data, 'underline'), true);
    assert.equal(PublicProps.read(data, 'autoAdjustFontSize'), true);
    assert.equal(PublicProps.read(data, 'textVAlign'), 'bottom');
});

test('expands theme token aliases in colors and style values', () => {
    assert.equal(PublicProps.normalizeColor('@border'), 'var(--border)');
    assert.equal(PublicProps.normalizeColor('@surface2'), 'var(--surface2)');
    assert.equal(
        PublicProps.expandThemeTokenAliases('color:@ink;border:1px solid @border;box-shadow:0 0 0 1px @accent;'),
        'color:var(--ink);border:1px solid var(--border);box-shadow:0 0 0 1px var(--accent);'
    );
});

test('normalizes public array and object layout values', () => {
    assert.deepEqual(PublicProps.normalizeRect([10, 20, 300, 40]), {
        x: 10,
        y: 20,
        width: 300,
        height: 40
    });

    assert.deepEqual(PublicProps.normalizeRect({ x: 8, y: 12, width: 240, height: 56 }), {
        x: 8,
        y: 12,
        width: 240,
        height: 56
    });

    assert.deepEqual(PublicProps.normalizeSpacing([6, 12]), {
        top: 6,
        right: 12,
        bottom: 6,
        left: 12
    });
});

test('migrates layout sizes and spacing to JSON-native values', () => {
    const root = toXcon({
        type: 'xForm',
        pos: '0,0,402,800',
        contentSize: '402,1200',
        padding: '16,24',
        margin: '8,16,8,0',
        visible: 'false'
    });

    PublicProps.migrateXCON(root);

    assert.equal(root.get('type'), 'form');
    assert.deepEqual(root.get('pos'), [0, 0, 402, 800]);
    assert.deepEqual(root.get('contentSize'), [402, 1200]);
    assert.deepEqual(root.get('padding'), [16, 24]);
    assert.deepEqual(root.get('margin'), [8, 16, 8, 0]);
    assert.equal(root.get('visible'), false);
});

test('migrates common props for every component type declared in drafts runtime', () => {
    const runtimeComponentTypes = Array.from(new Set([
        ...extractConstObjectValues(readDraftFile('xamong-ui-components.js'), 'ComponentType'),
        ...extractConstObjectValues(readDraftFile('xamong-ui-components-ext.js'), 'ExtendedComponentType'),
        ...extractConstObjectValues(readDraftFile('xamong-ui-components-advanced.js'), 'AdvancedComponentType'),
        'form',
        'list'
    ]));

    for (const type of runtimeComponentTypes) {
        const node = toXcon({
            type,
            pos: '1,2,3,4',
            visible: 'false',
            bgColor: '@surface'
        });

        PublicProps.migrateXCON(node);

        assert.deepEqual(node.get('pos'), [1, 2, 3, 4], `${type} should migrate pos`);
        assert.equal(node.get('visible'), false, `${type} should migrate booleans`);
        if (type === 'shape') {
            assert.equal(node.get('background').get('color'), '@surface', `${type} should migrate bgColor to background.color`);
        } else {
            assert.equal(PublicProps.read(node, 'bgColor'), '@surface', `${type} should migrate bgColor`);
        }
    }
});

test('serializes plain object arrays without losing custom component item data', () => {
    const rail = new XCON();
    rail.add('type', 'myIconRail');
    rail.add('items', [
        { id: 'button', name: 'Button', icon: '▢' },
        { id: 'textInput', name: 'TextInput', icon: 'T' }
    ]);

    const json = rail.toJSON(true);
    const obj = JSON.parse(json);

    assert.deepEqual(obj.items, [
        { id: 'button', name: 'Button', icon: '▢' },
        { id: 'textInput', name: 'TextInput', icon: 'T' }
    ]);
    assert.doesNotMatch(json, /\[object Object\]/);
});

test('maps public component types to draft renderer classes', () => {
    assert.equal(PublicProps.normalizeComponentType('form'), 'xForm');
    assert.equal(PublicProps.normalizeComponentType('list'), 'xList');
    assert.equal(PublicProps.normalizeComponentType('textField'), 'textField');
});

test('reads grouped border, shadow, media, and banner props', () => {
    const data = toXcon({
        border: {
            width: 2,
            style: 'dashed',
            color: '#445566',
            radius: 12
        },
        shadow: {
            color: '#000000',
            opacity: 0.24,
            blur: 10,
            radius: 20
        },
        src: 'media/clip.mp4',
        slides: [{ src: 'one.png' }],
        autoplay: {
            enabled: true,
            interval: 2500
        },
        indicator: {
            visible: false,
            color: '#ff00aa'
        }
    });

    assert.equal(PublicProps.read(data, 'borderWidth'), 2);
    assert.equal(PublicProps.read(data, 'borderStyle'), 'dashed');
    assert.equal(PublicProps.read(data, 'borderColor'), '#445566');
    assert.equal(PublicProps.read(data, 'round'), 12);
    assert.equal(PublicProps.read(data, 'shadowColor'), '#000000');
    assert.equal(PublicProps.read(data, 'shadowOpacity'), 0.24);
    assert.equal(PublicProps.read(data, 'shadowBlur'), 10);
    assert.equal(PublicProps.read(data, 'shadowRadius'), 20);
    assert.equal(PublicProps.read(data, 'url'), 'media/clip.mp4');
    const slides = PublicProps.read(data, 'views');
    assert.equal(slides.length, 1);
    assert.equal(slides[0].get('src'), 'one.png');
    assert.equal(PublicProps.read(data, 'autoScroll'), true);
    assert.equal(PublicProps.read(data, 'duration'), 2500);
    assert.equal(PublicProps.read(data, 'indicator'), false);
    assert.equal(PublicProps.read(data, 'indicatorColor'), '#ff00aa');
});

test('reads grouped border and shadow visibility flags as renderer booleans', () => {
    const hidden = toXcon({
        border: {
            visible: 'false',
            width: 1,
            color: '@border',
            radius: 10
        },
        shadow: {
            visible: 'false',
            color: '@shadow',
            opacity: 0.12,
            blur: 8,
            radius: 16
        }
    });

    assert.equal(PublicProps.read(hidden, 'border', false), false);
    assert.equal(PublicProps.read(hidden, 'shadow', false), false);

    const visible = toXcon({
        border: {
            visible: true,
            width: 1,
            color: '@border',
            radius: 10
        },
        shadow: {
            visible: true,
            color: '@shadow',
            opacity: 0.12,
            blur: 8,
            radius: 16
        }
    });

    assert.equal(PublicProps.read(visible, 'border', false), true);
    assert.equal(PublicProps.read(visible, 'shadow', false), true);

    const sideBorder = toXcon({
        borderTop: {
            visible: true,
            color: '@border'
        }
    });
    assert.equal(PublicProps.read(sideBorder, 'borderTop'), 1);
});

test('maps image border and shadow groups to CSS values when needed', () => {
    const image = toXcon({
        type: 'image',
        border: {
            width: 2,
            style: 'solid',
            color: '@border'
        },
        shadow: {
            visible: 'var(--shadow-sm)'
        }
    });

    assert.equal(PublicProps.read(image, 'border', ''), '2px solid var(--border)');
    assert.equal(PublicProps.read(image, 'shadow', ''), 'var(--shadow-sm)');
});

test('maps public text field, checkbox, radio, and image props to renderer reads', () => {
    const textField = toXcon({
        type: 'textField',
        inputType: 'password',
        bind: 'data.email',
        prefix: { icon: 'search', text: 'https://' },
        suffix: { icon: 'check', text: 'KRW', clear: true },
        trailingButton: 'Apply'
    });
    assert.equal(PublicProps.read(textField, 'mode'), 'password');
    assert.equal(PublicProps.read(textField, 'secureTextEntry'), true);
    assert.equal(PublicProps.read(textField, 'binding'), 'data.email');
    assert.equal(PublicProps.read(textField, 'prefixIcon'), 'search');
    assert.equal(PublicProps.read(textField, 'prefixText'), 'https://');
    assert.equal(PublicProps.read(textField, 'suffixIcon'), 'check');
    assert.equal(PublicProps.read(textField, 'suffixText'), 'KRW');
    assert.equal(PublicProps.read(textField, 'clearButton'), true);
    assert.equal(PublicProps.read(textField, 'postButton'), 'Apply');

    const simpleTextField = toXcon({
        type: 'textField',
        leftIcon: { name: 'search' },
        rightIcon: { name: 'check' }
    });
    assert.equal(PublicProps.read(simpleTextField, 'prefixIcon'), 'search');
    assert.equal(PublicProps.read(simpleTextField, 'suffixIcon'), 'check');

    const checkbox = toXcon({
        type: 'checkbox',
        value: 'indeterminate',
        icons: {
            checked: 'checked.png',
            unchecked: 'unchecked.png',
            indeterminate: 'mixed.png',
            disabled: 'disabled.png'
        },
        variant: 'terms',
        appearance: 'green'
    });
    assert.equal(PublicProps.read(checkbox, 'checked'), false);
    assert.equal(PublicProps.read(checkbox, 'state'), 'indeterminate');
    assert.equal(PublicProps.read(checkbox, 'indeterminate'), true);
    assert.equal(PublicProps.read(checkbox, 'checkedImage'), 'checked.png');
    assert.equal(PublicProps.read(checkbox, 'uncheckedImage'), 'unchecked.png');
    assert.equal(PublicProps.read(checkbox, 'indeterminateImage'), 'mixed.png');
    assert.equal(PublicProps.read(checkbox, 'disabledImage'), 'disabled.png');
    assert.equal(PublicProps.read(checkbox, 'checkboxVariant'), 'terms');
    assert.equal(PublicProps.read(checkbox, 'checkboxAppearance'), 'green');

    const radio = toXcon({
        type: 'radioButton',
        group: 'shipping',
        variant: 'segment'
    });
    assert.equal(PublicProps.read(radio, 'groupName'), 'shipping');
    assert.equal(PublicProps.read(radio, 'radioVariant'), 'segment');

    const image = toXcon({
        type: 'image',
        src: 'photo.jpg',
        objectFit: 'fill',
        objectPosition: 'top left',
        fallback: 'fallback.jpg',
        slideshow: {
            enabled: true,
            images: ['a.jpg', 'b.jpg'],
            duration: 4000,
            mode: 'loop'
        }
    });
    assert.equal(PublicProps.read(image, 'image'), 'photo.jpg');
    assert.equal(PublicProps.read(image, 'fit'), 'stretch');
    assert.equal(PublicProps.read(image, 'imageAlign'), 'topleft');
    assert.equal(PublicProps.read(image, 'fallbackImage'), 'fallback.jpg');
    assert.equal(PublicProps.read(image, 'animation'), true);
    assert.deepEqual(PublicProps.read(image, 'images'), ['a.jpg', 'b.jpg']);
    assert.equal(PublicProps.read(image, 'duration'), 4000);
    assert.equal(PublicProps.read(image, 'animationMode'), 'loop');
});

test('maps public list layout props to draft list renderer reads', () => {
    const cell = {
        itemSize: {
            height: 72,
            width: 180
        }
    };
    const data = toXcon({
        direction: 'horizontal',
        offset: [12, 24],
        itemSize: {
            height: 64,
            width: 160
        },
        separator: {
            style: 'none',
            color: '#dddddd',
            size: 4
        },
        selection: {
            style: 'highlight',
            color: '#ffeeaa'
        },
        templates: {
            cell,
            placeholder: 'emptyLayout',
            selector: '{{item.kind}}'
        }
    });

    assert.equal(PublicProps.read(data, 'orientation'), 'horizontal');
    assert.equal(PublicProps.read(data, 'offsetX'), 12);
    assert.equal(PublicProps.read(data, 'offsetY'), 24);
    assert.equal(PublicProps.read(data, 'rowHeight'), 64);
    assert.equal(PublicProps.read(data, 'rowWidth'), 160);
    assert.equal(PublicProps.read(data, 'separatorStyle'), 'none');
    assert.equal(PublicProps.read(data, 'separatorColor'), '#dddddd');
    assert.equal(PublicProps.read(data, 'separatorHeight'), 4);
    assert.equal(PublicProps.read(data, 'separatorWidth'), 4);
    assert.equal(PublicProps.read(data, 'selectionStyle'), 'highlight');
    assert.equal(PublicProps.read(data, 'selectionColor'), '#ffeeaa');
    const cellLayout = PublicProps.read(data, 'cellLayout');
    assert.equal(cellLayout.get('itemSize').get('height'), 72);
    assert.equal(cellLayout.get('itemSize').get('width'), 180);
    assert.equal(PublicProps.read(data, 'dummyLayout'), 'emptyLayout');
    assert.equal(PublicProps.read(data, 'layoutSelector'), '{{item.kind}}');
});

test('maps public media, icon, state, and extended label props', () => {
    const data = toXcon({
        color: '#ffffff',
        label: 'Save',
        labels: {
            on: 'Active',
            off: 'Inactive'
        },
        icon: {
            name: 'check',
            library: 'lucide'
        },
        image: {
            src: 'button.png',
            fit: 'cover'
        },
        states: {
            pressed: { src: 'pressed.png' },
            hover: { src: 'hover.png' },
            disabled: { src: 'disabled.png' }
        }
    });

    assert.equal(PublicProps.read(data, 'textColor'), '#ffffff');
    assert.equal(PublicProps.read(data, 'sliderLabel'), 'Save');
    assert.equal(PublicProps.read(data, 'progressLabel'), 'Save');
    assert.equal(PublicProps.read(data, 'onText'), 'Active');
    assert.equal(PublicProps.read(data, 'offText'), 'Inactive');
    assert.equal(PublicProps.read(data, 'icon'), 'check');
    assert.equal(PublicProps.read(data, 'iconLibrary'), 'lucide');
    assert.equal(PublicProps.read(data, 'image'), 'button.png');
    assert.equal(PublicProps.read(data, 'fit'), 'cover');
    assert.equal(PublicProps.read(data, 'pressedImage'), 'pressed.png');
    assert.equal(PublicProps.read(data, 'rolloverImage'), 'hover.png');
    assert.equal(PublicProps.read(data, 'disabledImage'), 'disabled.png');
});

test('maps public extended component aliases to existing renderers', () => {
    const password = toXcon({ type: 'passwordField', toggleLabel: 'Show password' });
    assert.equal(PublicProps.read(password, 'toggleAriaLabel'), 'Show password');

    const textView = toXcon({ type: 'textView', lineNumbers: true });
    assert.equal(PublicProps.read(textView, 'lineNum'), true);

    const slider = toXcon({ type: 'slider', label: 'Brightness', ticks: true, showLabels: true });
    assert.equal(PublicProps.read(slider, 'sliderLabel'), 'Brightness');
    assert.equal(PublicProps.read(slider, 'showTicks'), true);
    assert.equal(PublicProps.read(slider, 'showSliderLabels'), true);

    const select = toXcon({ type: 'select', variant: 'custom' });
    assert.equal(PublicProps.read(select, 'selectVariant'), 'custom');

    const sw = toXcon({ type: 'switch', title: 'Dark mode', subtitle: 'Use dark theme', labels: { on: 'On', off: 'Off' } });
    assert.equal(PublicProps.read(sw, 'switchTitle'), 'Dark mode');
    assert.equal(PublicProps.read(sw, 'switchSubtitle'), 'Use dark theme');
    assert.equal(PublicProps.read(sw, 'onText'), 'On');
    assert.equal(PublicProps.read(sw, 'offText'), 'Off');

    const progress = toXcon({ type: 'progressBar', label: 'Upload', variant: 'default' });
    assert.equal(PublicProps.read(progress, 'progressLabel'), 'Upload');
    assert.equal(PublicProps.read(progress, 'progressFillVariant'), 'a');

    const spinner = toXcon({ type: 'spinner', variant: 'pulse' });
    assert.equal(PublicProps.read(spinner, 'spinnerType'), 'grow');

    const tabs = toXcon({
        type: 'tabs',
        items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
        activeId: 'b',
        position: 'bottom',
        tabsLayout: 'full'
    });
    assert.equal(PublicProps.read(tabs, 'activeTab'), 1);
    assert.equal(PublicProps.read(tabs, 'tabPosition'), 'bottom');
    assert.equal(PublicProps.read(tabs, 'headerLayout'), 'full');

    const icon = toXcon({ type: 'icon', weight: 1.5 });
    assert.equal(PublicProps.read(icon, 'strokeWidth'), 1.5);

    const alert = toXcon({ type: 'alert', severity: 'warning' });
    assert.equal(PublicProps.read(alert, 'alertType'), 'warning');

    const modal = toXcon({ type: 'modal', text: 'Body', backdropClose: false });
    assert.equal(PublicProps.read(modal, 'content'), 'Body');
    assert.equal(PublicProps.read(modal, 'closeOnBackdrop'), false);

    const stack = toXcon({ type: 'stack', direction: 'column', gap: 12 });
    assert.equal(PublicProps.read(stack, 'direction'), 'vertical');
    assert.equal(PublicProps.read(stack, 'spacing'), 12);

    const accordion = toXcon({
        type: 'accordion',
        items: [{ id: 'intro', title: 'Intro' }, { id: 'api', title: 'API' }],
        defaultOpen: ['api']
    });
    assert.deepEqual(PublicProps.read(accordion, 'defaultOpen'), [1]);
});

test('maps public shape groups to the current shape renderer reads', () => {
    const shape = toXcon({
        type: 'shape',
        text: '<b>Hello</b>',
        renderHtml: true,
        font: {
            family: 'Inter',
            size: '16px',
            decoration: 'underline',
            lineHeight: 1.5,
            letterSpacing: '0.02em'
        },
        background: {
            color: '#ffffff',
            gradient: 'linear-gradient(red, blue)',
            pattern: 'grid'
        },
        image: {
            src: 'hero.jpg',
            mode: 'background',
            fit: 'cover',
            position: 'center',
            filter: { blur: 2 },
            slideshow: { enabled: true, images: ['1.jpg'], duration: '3s', mode: 'infinite' }
        },
        effects: {
            opacity: 0.8,
            boxShadow: '0 2px 8px #000',
            filter: { grayscale: 1 }
        },
        transform: {
            rotate: '15deg',
            scale: 1.2,
            translateX: '10px'
        }
    });

    assert.equal(PublicProps.read(shape, 'html'), '<b>Hello</b>');
    assert.equal(PublicProps.read(shape, 'font'), 'Inter');
    assert.equal(PublicProps.read(shape, 'fontSize'), '16px');
    assert.equal(PublicProps.read(shape, 'textDecoration'), 'underline');
    assert.equal(PublicProps.read(shape, 'lineHeight'), 1.5);
    assert.equal(PublicProps.read(shape, 'letterSpacing'), '0.02em');
    assert.equal(PublicProps.read(shape, 'backgroundColor'), '#ffffff');
    assert.equal(PublicProps.read(shape, 'backgroundGradient'), 'linear-gradient(red, blue)');
    assert.equal(PublicProps.read(shape, 'backgroundPattern'), 'grid');
    assert.equal(PublicProps.read(shape, 'image'), 'hero.jpg');
    assert.equal(PublicProps.read(shape, 'imageMode'), 'background');
    assert.equal(PublicProps.read(shape, 'imageFit'), 'cover');
    assert.equal(PublicProps.read(shape, 'imageBlur'), 2);
    assert.equal(PublicProps.read(shape, 'imageAnimation'), true);
    assert.deepEqual(PublicProps.read(shape, 'images'), ['1.jpg']);
    assert.equal(PublicProps.read(shape, 'animationDuration'), '3s');
    assert.equal(PublicProps.read(shape, 'opacity'), 0.8);
    assert.equal(PublicProps.read(shape, 'boxShadow'), '0 2px 8px #000');
    assert.equal(PublicProps.read(shape, 'grayscale'), 1);
    assert.equal(PublicProps.read(shape, 'transform', ''), '');
    assert.equal(PublicProps.read(shape, 'rotate'), '15deg');
    assert.equal(PublicProps.read(shape, 'scale'), 1.2);
    assert.equal(PublicProps.read(shape, 'translateX'), '10px');
});

test('allows border radius without forcing a visible border', () => {
    const data = toXcon({
        border: {
            visible: false,
            radius: 8
        }
    });

    assert.equal(PublicProps.read(data, 'border'), false);
    assert.equal(PublicProps.read(data, 'round'), 8);
});

test('maps public button layout props to AL renderer reads', () => {
    const data = toXcon({
        appearance: 'link',
        segment: 'first',
        split: 'main',
        layout: 'column',
        layoutGap: '4px'
    });

    assert.equal(PublicProps.read(data, 'buttonAppearance'), 'link');
    assert.equal(PublicProps.read(data, 'alButtonSegment'), 'first');
    assert.equal(PublicProps.read(data, 'alButtonSplit'), 'main');
    assert.equal(PublicProps.read(data, 'alButtonLayout'), 'column');
    assert.equal(PublicProps.read(data, 'alButtonLayoutGap'), '4px');
});

test('migrates legacy XCON component props into public schema', () => {
    const root = toXcon({
        type: 'xForm',
        pos: '0,0,320,480',
        bgColor: '#ffffff',
        bgImage: 'page-bg.png',
        components: {
            cta: {
                type: 'button',
                text: 'Start',
                fgColor: '#ffffff',
                bgColor: '#111111',
                fontSize: 14,
                fontWeight: '700',
                round: 8,
                border: false
            },
            list: {
                type: 'xList',
                rowHeight: 64,
                rowWidth: 180,
                orientation: 'horizontal',
                offsetX: 6,
                offsetY: 12,
                separatorHeight: 2,
                cellLayout: {
                    rowHeight: 88,
                    rowWidth: 220,
                    title: {
                        type: 'label',
                        text: 'Row'
                    }
                }
            },
            hero: {
                type: 'banner',
                views: [{ type: 'label', text: 'One' }],
                autoScroll: true,
                duration: 3000,
                indicatorColor: '#ffffff'
            }
        }
    });

    PublicProps.migrateXCON(root);

    assert.equal(root.get('type'), 'form');
    assert.deepEqual(root.get('pos'), [0, 0, 320, 480]);
    assert.equal(root.get('backgroundColor'), '#ffffff');
    assert.equal(root.get('backgroundImage'), 'page-bg.png');
    assert.equal(root.contains('bgColor'), false);
    assert.equal(root.contains('bgImage'), false);

    const cta = root.get('components').get('cta');
    assert.equal(cta.get('label'), 'Start');
    assert.equal(cta.get('color'), '#ffffff');
    assert.equal(cta.get('backgroundColor'), '#111111');
    assert.equal(cta.get('font').get('size'), 14);
    assert.equal(cta.get('font').get('weight'), '700');
    assert.equal(cta.get('border').get('visible'), false);
    assert.equal(cta.get('border').get('radius'), 8);

    const list = root.get('components').get('list');
    assert.equal(list.get('type'), 'list');
    assert.equal(list.get('direction'), 'horizontal');
    assert.deepEqual(list.get('offset'), [6, 12]);
    assert.equal(list.get('itemSize').get('height'), 64);
    assert.equal(list.get('itemSize').get('width'), 180);
    assert.equal(list.get('separator').get('size'), 2);
    assert.equal(list.get('templates').get('cell').get('itemSize').get('height'), 88);
    assert.equal(list.get('templates').get('cell').get('itemSize').get('width'), 220);

    const hero = root.get('components').get('hero');
    assert.equal(hero.get('slides').length, 1);
    assert.equal(hero.get('autoplay').get('enabled'), true);
    assert.equal(hero.get('autoplay').get('interval'), 3000);
    assert.equal(hero.get('indicator').get('color'), '#ffffff');
});

test('migrates all documented legacy component groups to public schema', () => {
    const root = toXcon({
        type: 'xForm',
        hidenavbar: true,
        onLoad: 'legacyAction',
        components: {
            field: {
                type: 'textField',
                text: 'abc',
                binding: 'user.name',
                mode: 'email',
                secureTextEntry: true,
                clearButton: true,
                prefixIcon: 'search',
                suffixText: 'KRW',
                postButton: 'Apply'
            },
            cb: {
                type: 'checkbox',
                text: 'Agree',
                checked: true,
                checkedImage: 'checked.png',
                uncheckedImage: 'unchecked.png',
                indeterminateImage: 'mixed.png',
                disabledImage: 'disabled.png',
                checkboxVariant: 'terms',
                checkboxAppearance: 'green',
                onChange: 'ignore'
            },
            rb: {
                type: 'radioButton',
                text: 'A',
                groupName: 'plan',
                radioVariant: 'segment',
                checkedImage: 'checked.png'
            },
            image: {
                type: 'image',
                image: 'old.jpg',
                fit: 'stretch',
                imageAlign: 'topright',
                images: ['a.jpg'],
                animation: true,
                duration: 2500,
                animationMode: 'loop',
                fallbackImage: 'fallback.jpg',
                borderRadius: 12
            },
            shape: {
                type: 'shape',
                html: '<strong>Hi</strong>',
                backgroundGradient: 'linear-gradient(red, blue)',
                imageMode: 'overlay',
                imageFit: 'cover',
                imageFilter: 'blur(2px)',
                imageAnimation: true,
                images: ['s1.png'],
                boxShadow: '0 1px 2px #000',
                opacity: 0.5,
                blur: 3,
                rotate: '5deg',
                scale: 1.1
            },
            banner: {
                type: 'banner',
                orientation: 'vertical',
                indicator: true,
                indicatorColor: '#fff',
                autoScroll: true,
                duration: 5000,
                loop: false,
                rolling: true,
                bannerChrome: 'landing',
                views: []
            },
            frame: {
                type: 'frame',
                xcon: 'child.xcon',
                parameter: { id: 1 },
                onShowEffect: 'fade'
            },
            select: {
                type: 'select',
                nativeLabel: 'Native',
                customLabel: 'Custom',
                customPlaceholder: 'Pick one',
                customValue: 'a',
                customOptions: [{ value: 'a', label: 'A' }],
                selectVariant: 'custom'
            },
            tabs: {
                type: 'tabs',
                tabs: [{ id: 'one', label: 'One' }],
                activeTab: 0,
                headerLayout: 'full',
                tabPosition: 'bottom'
            },
            accordion: {
                type: 'accordion',
                items: [{ id: 'one', title: 'One' }],
                defaultOpen: [0]
            },
            icon: {
                type: 'icon',
                strokeWidth: 1.5,
                round: 6
            },
            stack: {
                type: 'stack',
                direction: 'vertical',
                spacing: '10px'
            },
            rating: {
                type: 'rating',
                icon: '*',
                emptyIcon: '-'
            },
            modal: {
                type: 'modal',
                content: 'Body',
                closeOnBackdrop: false
            }
        }
    });

    PublicProps.migrateXCON(root);

    assert.equal(root.contains('hidenavbar'), false);
    assert.equal(root.contains('onLoad'), false);

    const components = root.get('components');
    const field = components.get('field');
    assert.equal(field.get('value'), 'abc');
    assert.equal(field.get('bind'), 'user.name');
    assert.equal(field.get('inputType'), 'password');
    assert.equal(field.get('suffix').get('clear'), true);
    assert.equal(field.get('prefix').get('icon'), 'search');
    assert.equal(field.get('suffix').get('text'), 'KRW');
    assert.equal(field.get('trailingButton'), 'Apply');

    const cb = components.get('cb');
    assert.equal(cb.get('label'), 'Agree');
    assert.equal(cb.get('value'), 'checked');
    assert.equal(cb.get('icons').get('checked'), 'checked.png');
    assert.equal(cb.get('icons').get('unchecked'), 'unchecked.png');
    assert.equal(cb.get('icons').get('indeterminate'), 'mixed.png');
    assert.equal(cb.get('icons').get('disabled'), 'disabled.png');
    assert.equal(cb.get('variant'), 'terms');
    assert.equal(cb.get('appearance'), 'green');
    assert.equal(cb.contains('onChange'), false);

    const rb = components.get('rb');
    assert.equal(rb.get('label'), 'A');
    assert.equal(rb.get('group'), 'plan');
    assert.equal(rb.get('variant'), 'segment');
    assert.equal(rb.get('icons').get('checked'), 'checked.png');

    const image = components.get('image');
    assert.equal(image.get('src'), 'old.jpg');
    assert.equal(image.get('objectFit'), 'fill');
    assert.equal(image.get('objectPosition'), 'top right');
    assert.equal(image.get('slideshow').get('enabled'), true);
    assert.deepEqual(image.get('slideshow').get('images'), ['a.jpg']);
    assert.equal(image.get('slideshow').get('duration'), 2500);
    assert.equal(image.get('fallback'), 'fallback.jpg');
    assert.equal(image.get('border').get('radius'), 12);

    const shape = components.get('shape');
    assert.equal(shape.get('text'), '<strong>Hi</strong>');
    assert.equal(shape.get('renderHtml'), true);
    assert.equal(shape.get('background').get('gradient'), 'linear-gradient(red, blue)');
    assert.equal(shape.get('image').get('mode'), 'overlay');
    assert.equal(shape.get('image').get('filter').get('css'), 'blur(2px)');
    assert.equal(shape.get('image').get('slideshow').get('enabled'), true);
    assert.equal(shape.get('effects').get('boxShadow'), '0 1px 2px #000');
    assert.equal(shape.get('effects').get('opacity'), 0.5);
    assert.equal(shape.get('effects').get('filter').get('blur'), 3);
    assert.equal(shape.get('transform').get('rotate'), '5deg');
    assert.equal(shape.get('transform').get('scale'), 1.1);

    const banner = components.get('banner');
    assert.equal(banner.get('direction'), 'vertical');
    assert.equal(banner.get('indicator').get('show'), true);
    assert.equal(banner.get('autoplay').get('enabled'), true);
    assert.equal(banner.get('autoplay').get('interval'), 5000);
    assert.equal(banner.get('autoplay').get('loop'), false);
    assert.equal(banner.get('autoplay').get('rolling'), true);
    assert.equal(banner.get('variant'), 'landing');
    assert.equal(banner.contains('views'), false);

    const frame = components.get('frame');
    assert.equal(frame.get('src'), 'child.xcon');
    assert.equal(frame.get('params').get('id'), 1);
    assert.equal(frame.contains('onShowEffect'), false);

    const select = components.get('select');
    assert.equal(select.get('placeholder'), 'Pick one');
    assert.equal(select.get('value'), 'a');
    assert.equal(select.get('options')[0].get('label'), 'A');
    assert.equal(select.get('variant'), 'custom');
    assert.equal(select.contains('nativeLabel'), false);

    const tabs = components.get('tabs');
    assert.equal(tabs.get('items')[0].get('id'), 'one');
    assert.equal(tabs.get('activeIndex'), 0);
    assert.equal(tabs.get('tabsLayout'), 'full');
    assert.equal(tabs.get('position'), 'bottom');

    const accordion = components.get('accordion');
    assert.deepEqual(accordion.get('defaultOpen'), ['one']);

    const icon = components.get('icon');
    assert.equal(icon.get('weight'), 1.5);
    assert.equal(icon.get('borderRadius'), 6);

    const stack = components.get('stack');
    assert.equal(stack.get('direction'), 'column');
    assert.equal(stack.get('gap'), '10px');

    const rating = components.get('rating');
    assert.equal(rating.get('icons').get('filled'), '*');
    assert.equal(rating.get('icons').get('empty'), '-');

    const modal = components.get('modal');
    assert.equal(modal.get('text'), 'Body');
    assert.equal(modal.get('backdropClose'), false);
});

test('removes executable action references while migrating draft XCON to public schema', () => {
    const root = toXcon({
        type: 'xForm',
        actions: {
            save: { type: 'httpRequest', url: '/api/save' }
        },
        database: {
            Product: { fields: {} }
        },
        components: {
            list: {
                type: 'xList',
                actionRef: 'loadRows',
                dataSourceRef: 'internalProducts',
                backend: {
                    method: 'GET',
                    path: '/api/products'
                }
            },
            cta: {
                type: 'button',
                onClick_ref: 'save',
                onClickRef: 'saveAgain',
                onClick: 'legacyAction',
                triggers: [{ type: 'click' }],
                text: 'Save'
            }
        }
    });

    PublicProps.migrateXCON(root);

    assert.equal(root.contains('actions'), false);
    assert.equal(root.contains('database'), false);
    const list = root.get('components').get('list');
    assert.equal(list.contains('actionRef'), false);
    assert.equal(list.contains('dataSourceRef'), false);
    assert.equal(list.contains('backend'), false);

    const cta = root.get('components').get('cta');
    assert.equal(cta.get('label'), 'Save');
    assert.equal(cta.contains('onClick_ref'), false);
    assert.equal(cta.contains('onClickRef'), false);
    assert.equal(cta.contains('onClick'), false);
    assert.equal(cta.contains('triggers'), false);
});
