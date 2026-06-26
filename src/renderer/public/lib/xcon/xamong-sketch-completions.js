(function (root, factory) {
    const api = factory();

    if (root) {
        root.XamongSketchCompletions = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    const DEFAULT_COMPONENT_TYPES = [
        'panel', 'label', 'button', 'textField', 'image', 'banner', 'list', 'shape',
        'checkbox', 'radioButton', 'searchBar', 'imagePicker', 'filePicker',
        'colorPicker', 'datePicker', 'timePicker'
    ];

    const DEFAULT_ACTION_TYPES = [
        'toast', 'alert', 'activity', 'goBack', 'goHome', 'makeRoot', 'batch',
        'callApi', 'get', 'post', 'put', 'patch', 'delete', 'runChain', 'chainAction'
    ];

    const DEFAULT_ACTION_HOLDERS = [
        'onClick', 'onCreate', 'onLoad', 'onResume', 'onPause', 'onUnload',
        'action', 'cellAction', 'success', 'failure', 'after'
    ];

    const THEME_TOKENS = [
        '@accent', '@bg', '@surface', '@surface2', '@ink', '@ink-2', '@ink-3',
        '@border', '@border2'
    ];

    const CHAIN_PREFIXES = [
        'local.', 'global.', 'self.', 'parent.', 'sender.', 'args.', 'item.',
        'record.', 'storage.', 'app.', 'config.', 'map.', 'style.', 'device.',
        'current.', 'session.'
    ];

    const COMMON_PROPS = [
        'type', 'pos', 'visible', 'backgroundColor', 'color', 'font', 'border',
        'shadow', 'al', 'style', 'scroll', 'direction', 'width', 'height',
        'title', 'name'
    ];

    const OBJECT_PROPS = {
        al: [
            'direction', 'gap', 'padding', 'alignItems', 'justifyContent',
            'alignSelf', 'flex', 'width', 'height', 'minWidth', 'maxWidth',
            'minHeight', 'maxHeight', 'autoHeight', 'stackClass', 'overflow',
            'wrap', 'layerZ', 'layerPointerEvents'
        ],
        autoplay: ['enabled', 'interval', 'loop', 'rolling'],
        background: [
            'color', 'image', 'gradient', 'gradientType', 'gradientDirection',
            'gradientColors', 'gradientStops', 'pattern', 'patternSize',
            'patternColor', 'patternOpacity'
        ],
        border: [
            'visible', 'width', 'style', 'color', 'radius', 'left', 'top',
            'right', 'bottom', 'topLeftRadius', 'topRightRadius',
            'bottomLeftRadius', 'bottomRightRadius', 'image', 'imageSource',
            'imageSlice', 'imageRepeat'
        ],
        body: [],
        camera: ['x', 'y', 'z', 'target', 'fov', 'near', 'far'],
        controls: ['enabled', 'zoom', 'pan', 'rotate'],
        effects: [
            'opacity', 'blendMode', 'boxShadow', 'dropShadow', 'innerShadow',
            'glow', 'glowColor', 'glowIntensity', 'filter'
        ],
        font: [
            'family', 'size', 'weight', 'style', 'bold', 'italic', 'underline',
            'strikethrough', 'decoration', 'lineHeight', 'letterSpacing',
            'autoFit'
        ],
        header: [],
        headers: [],
        icon: ['name', 'library', 'size', 'position', 'color'],
        icons: ['left', 'right', 'leading', 'trailing', 'prefix', 'suffix', 'search', 'clear'],
        image: [
            'src', 'alt', 'mode', 'fit', 'position', 'repeat', 'size',
            'opacity', 'blendMode', 'filter', 'slideshow'
        ],
        indicator: ['show', 'color', 'activeColor', 'inactiveColor', 'position', 'size'],
        itemSize: ['width', 'height'],
        labels: ['left', 'right', 'min', 'max', 'start', 'end', 'empty', 'loading', 'error'],
        modules: [],
        navigation: ['target', 'url', 'params', 'transition'],
        offset: ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'],
        parameter: [],
        params: [],
        payload: [],
        prefix: ['icon', 'text', 'width', 'color'],
        query: [],
        selection: ['enabled', 'mode', 'selectedIndex', 'selectedId', 'selectedIds', 'color', 'backgroundColor'],
        separator: ['color', 'size', 'width', 'height'],
        shadow: ['visible', 'x', 'y', 'blur', 'spread', 'radius', 'color', 'opacity', 'css'],
        slideshow: ['enabled', 'images', 'duration', 'mode'],
        states: ['normal', 'hover', 'active', 'disabled', 'loading', 'selected', 'error', 'success'],
        suffix: ['icon', 'text', 'width', 'color'],
        templates: ['cell', 'placeholder', 'selector'],
        transform: ['rotate', 'scale', 'scaleX', 'scaleY', 'translateX', 'translateY'],
        transition: ['type', 'duration', 'easing'],
        when: [],
        xcon: []
    };

    const COMPONENT_PROPS = {
        form: ['title', 'triggers', 'onCreate', 'onLoad', 'onResume', 'onPause', 'onUnload'],
        panel: ['components', 'componentsOrder', 'gap', 'padding'],
        button: ['label', 'icon', 'layout', 'title', 'onClick'],
        label: ['text', 'labelPadding', 'textAlign', 'verticalAlign', 'whiteSpace', 'renderHtml'],
        textField: ['placeholder', 'value', 'prefix', 'suffix', 'keyboardType', 'onBeginEdit', 'onEndEdit'],
        searchBar: ['placeholder', 'value', 'prefix', 'suffix', 'onBeginEdit', 'onEndEdit'],
        image: ['src', 'objectFit', 'overlayTag', 'overlayTitle', 'overlaySub', 'overlayCta'],
        banner: ['slides', 'indicator', 'autoplay', 'bannerHeight', 'direction'],
        list: ['dataTemplate', 'templates', 'itemSize', 'separator', 'direction', 'cellAction'],
        shape: ['shape', 'text', 'renderHtml', 'textAlign', 'verticalAlign'],
        checkbox: ['label', 'checked', 'onClick'],
        radioButton: ['label', 'checked', 'group', 'onClick'],
        switch: ['checked', 'onClick'],
        slider: ['value', 'min', 'max', 'step'],
        progressBar: ['value', 'min', 'max'],
        tabs: ['items', 'selectedIndex', 'onClick'],
        carousel: ['slides', 'indicator', 'autoplay'],
        card: ['title', 'subtitle', 'image', 'onClick'],
        avatar: ['src', 'text', 'size'],
        badge: ['text', 'variant'],
        alert: ['title', 'message', 'variant'],
        modal: ['title', 'open', 'onClose'],
        webView: ['url', 'src'],
        videoView: ['src', 'poster', 'autoplay'],
        map: ['latitude', 'longitude', 'markers'],
        chart: ['data', 'chartType', 'series'],
        dataTable: ['data', 'columns', 'rowAction'],
        mediaPlayer: ['src', 'poster', 'controls'],
        threeDViewer: ['src', 'camera', 'controls']
    };

    const ACTION_PROPS = [
        'actions', 'success', 'failure', 'after', 'chain', 'target', 'message',
        'title', 'url', 'method', 'payload', 'body', 'params', 'query', 'header',
        'parameter', 'duration', 'xcon', 'navigation', 'transition', 'statements'
    ];

    const ACTION_SHORTCUTS = [
        'toast', 'alert', 'activity', 'go', 'back', 'home', 'root', 'wait', 'do',
        'batch', 'get', 'post', 'put', 'patch', 'delete', 'del', 'callApi',
        'runChain', 'chainAction', 'log', 'sleep', 'saveData', 'start', 'stop',
        'timeline', 'imagePicker', 'filePicker', 'colorPicker', 'datePicker'
    ];

    const TRIGGER_PROPS = [
        'trigger', 'triggers', 'event', 'dependency', 'render', 'renderTarget',
        'on', 'action'
    ];

    function getCompletionItems(options) {
        const opts = options || {};
        const inventory = buildInventory(opts);
        const context = detectContext(opts.source || '', opts.lineNumber || 1, opts.column || 1, inventory);
        const candidates = candidatesForContext(context, inventory, opts.snippets || {});
        return filterAndMapCandidates(candidates, context.token);
    }

    function buildInventory(options) {
        const sketchApi = options.sketchApi || (typeof window !== 'undefined' ? window.XamongSketch : null) || {};
        const actionAliases = safeObject(sketchApi.getActionAliases && sketchApi.getActionAliases());

        return {
            componentTypes: unique(DEFAULT_COMPONENT_TYPES.concat(safeArray(sketchApi.getSupportedComponentTypes && sketchApi.getSupportedComponentTypes()))),
            actionTypes: unique(DEFAULT_ACTION_TYPES.concat(safeArray(sketchApi.getSupportedActionTypes && sketchApi.getSupportedActionTypes()))),
            actionAliases: Object.keys(actionAliases),
            actionHolders: unique(DEFAULT_ACTION_HOLDERS.concat(safeArray(sketchApi.getActionHolderNames && sketchApi.getActionHolderNames()))),
            themeTokens: THEME_TOKENS.slice()
        };
    }

    function detectContext(source, lineNumber, column, inventory) {
        const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
        const currentLine = lines[lineNumber - 1] || '';
        const before = currentLine.slice(0, Math.max(0, column - 1));
        const tokenMatch = before.match(/[@A-Za-z0-9_.-]*$/);
        const token = tokenMatch ? tokenMatch[0] : '';
        const indent = leadingSpaces(currentLine);
        const ancestors = collectAncestors(lines, lineNumber, indent, inventory);
        const nearest = ancestors[ancestors.length - 1] || null;

        if (token.charAt(0) === '@') {
            return { kind: 'themeToken', token, indent, ancestors, nearest };
        }

        if (!hasScreenBefore(lines, lineNumber)) {
            return { kind: 'root', token, indent, ancestors, nearest };
        }

        if (isCurrentLineActionPrefix(before, inventory)) {
            return { kind: 'action', token, indent, ancestors, nearest };
        }

        const controlAncestor = findNearest(ancestors, (item) => {
            return item.kind === 'chainBlock' ||
                item.kind === 'chainAction' ||
                item.kind === 'actionHolder' ||
                item.kind === 'batchAction' ||
                item.kind === 'trigger' ||
                item.kind === 'objectProperty';
        });

        if (controlAncestor) {
            if (controlAncestor.kind === 'chainBlock' || controlAncestor.kind === 'chainAction') {
                return { kind: 'chain', token, indent, ancestors, nearest };
            }
            if (controlAncestor.kind === 'objectProperty') {
                return {
                    kind: 'objectProperty',
                    propertyName: controlAncestor.propertyName,
                    token,
                    indent,
                    ancestors,
                    nearest
                };
            }
            if (controlAncestor.kind === 'trigger') {
                return { kind: 'trigger', token, indent, ancestors, nearest };
            }
            return { kind: 'action', token, indent, ancestors, nearest };
        }

        if (nearest && nearest.kind === 'component') {
            return { kind: 'componentProperty', componentType: nearest.componentType, token, indent, ancestors, nearest };
        }

        return { kind: 'componentDeclaration', token, indent, ancestors, nearest };
    }

    function collectAncestors(lines, lineNumber, currentIndent, inventory) {
        const ancestors = [];
        let maxIndent = currentIndent;

        for (let index = lineNumber - 2; index >= 0; index -= 1) {
            const raw = lines[index] || '';
            const text = raw.trim();
            if (!text) continue;

            const indent = leadingSpaces(raw);
            if (indent >= maxIndent) continue;

            const block = classifyLine(text, inventory);
            if (block) {
                ancestors.unshift({ ...block, indent, text });
                maxIndent = indent;
            }
        }

        return ancestors;
    }

    function classifyLine(text, inventory) {
        if (/^screen(?:\s|$)/.test(text)) return { kind: 'screen' };
        if (text === 'chain') return { kind: 'chainBlock' };
        if (/^(runChain|chainAction)(?:\s|$)/.test(text)) return { kind: 'chainAction' };
        if (/^batch(?:\s|$)/.test(text)) return { kind: 'batchAction' };
        if (/^trigger\s+/.test(text)) return { kind: 'trigger' };

        const firstWord = text.split(/\s+/)[0].replace(/:$/, '');
        if (inventory.actionHolders.indexOf(firstWord) !== -1 || /^on[A-Z]/.test(firstWord)) {
            return { kind: 'actionHolder', holder: firstWord };
        }

        const component = parseComponentDeclaration(text, inventory.componentTypes);
        if (component) return { kind: 'component', componentType: component.type, name: component.name };

        if (Object.prototype.hasOwnProperty.call(OBJECT_PROPS, firstWord) && tokenizeSimple(text).length === 1) {
            return { kind: 'objectProperty', propertyName: firstWord };
        }

        return null;
    }

    function isCurrentLineActionPrefix(before, inventory) {
        const text = String(before || '').trimStart();
        const match = text.match(/^([A-Za-z_][\w-]*)(?::|\s*:|\s+)\s*(?:[@A-Za-z0-9_.-]*)?$/);
        if (!match) return false;
        const key = match[1];
        return inventory.actionHolders.indexOf(key) !== -1 || /^on[A-Z]/.test(key);
    }

    function parseComponentDeclaration(text, componentTypes) {
        const match = text.match(/^(?:(?<name>[A-Za-z_][\w-]*)\s*:\s*)?(?<type>[A-Za-z_][\w-]*)(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/);
        if (!match || !match.groups) return null;
        const type = match.groups.type;
        if (componentTypes.indexOf(type) === -1) return null;
        return { name: match.groups.name || null, type };
    }

    function tokenizeSimple(text) {
        const matches = String(text || '').match(/"[^"]*"|'[^']*'|\S+/g);
        return matches || [];
    }

    function candidatesForContext(context, inventory, snippets) {
        if (context.kind === 'themeToken') {
            return inventory.themeTokens.map((label) => item(label, 'theme token', 'token'));
        }

        if (context.kind === 'root') {
            return ['screen'].map((label) => item(label, 'root declaration', 'keyword'));
        }

        if (context.kind === 'componentDeclaration') {
            return inventory.componentTypes.map((label) => item(label, 'component', 'component'))
                .concat(snippetItems(snippets));
        }

        if (context.kind === 'componentProperty') {
            return unique(COMMON_PROPS
                .concat(COMPONENT_PROPS[context.componentType] || [])
                .concat(inventory.actionHolders)
                .concat(TRIGGER_PROPS)
                .concat(inventory.themeTokens))
                .map((label) => item(label, completionDetail(label, 'property'), label.charAt(0) === '@' ? 'token' : 'property'));
        }

        if (context.kind === 'objectProperty') {
            return unique(OBJECT_PROPS[context.propertyName] || [])
                .map((label) => item(label, `${context.propertyName} property`, 'property'));
        }

        if (context.kind === 'trigger') {
            return unique(TRIGGER_PROPS
                .concat(ACTION_SHORTCUTS)
                .concat(inventory.actionTypes)
                .concat(inventory.actionAliases)
                .concat(inventory.themeTokens))
                .map((label) => item(label, completionDetail(label, 'trigger'), label.charAt(0) === '@' ? 'token' : 'action'));
        }

        if (context.kind === 'action') {
            return unique(ACTION_SHORTCUTS
                .concat(inventory.actionTypes)
                .concat(inventory.actionAliases)
                .concat(ACTION_PROPS)
                .concat(inventory.themeTokens))
                .map((label) => item(label, completionDetail(label, 'action'), label.charAt(0) === '@' ? 'token' : 'action'));
        }

        if (context.kind === 'chain') {
            return CHAIN_PREFIXES
                .concat([
                    'local.value = ',
                    'global.state = ',
                    'sender.value',
                    'args.value',
                    'item.id'
                ])
                .map((label) => item(label, 'xamong chain expression', 'chain'));
        }

        return [];
    }

    function filterAndMapCandidates(candidates, token) {
        const rawToken = token || '';
        const tokenIsTheme = rawToken.charAt(0) === '@';
        const normalized = tokenIsTheme ? rawToken.slice(1).toLowerCase() : rawToken.toLowerCase();

        return uniqueByLabel(candidates)
            .filter((candidate) => {
                if (tokenIsTheme && candidate.label.charAt(0) !== '@') return false;
                if (!normalized) return true;
                const label = candidate.label.charAt(0) === '@' ? candidate.label.slice(1) : candidate.label;
                const lower = label.toLowerCase();
                return lower.indexOf(normalized) === 0 || lower.indexOf(normalized) > -1;
            })
            .slice(0, 80);
    }

    function snippetItems(snippets) {
        return Object.keys(snippets || {}).map((label) => ({
            label,
            detail: 'snippet',
            insertText: snippets[label],
            kind: 'snippet'
        }));
    }

    function item(label, detail, kind) {
        return { label, detail, insertText: label, kind };
    }

    function completionDetail(label, fallback) {
        if (label.charAt(0) === '@') return 'theme token';
        return fallback;
    }

    function hasScreenBefore(lines, lineNumber) {
        for (let index = 0; index < lineNumber; index += 1) {
            if (/^\s*screen(?:\s|$)/.test(lines[index] || '')) return true;
        }
        return false;
    }

    function leadingSpaces(value) {
        const match = String(value || '').match(/^ */);
        return match ? match[0].length : 0;
    }

    function findNearest(items, predicate) {
        for (let index = items.length - 1; index >= 0; index -= 1) {
            if (predicate(items[index])) return items[index];
        }
        return null;
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function safeObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }

    function unique(values) {
        return Array.from(new Set(values.filter(Boolean)));
    }

    function uniqueByLabel(items) {
        const seen = new Set();
        const output = [];
        items.forEach((candidate) => {
            if (!candidate || !candidate.label || seen.has(candidate.label)) return;
            seen.add(candidate.label);
            output.push(candidate);
        });
        return output;
    }

    return {
        getCompletionItems,
        detectContext,
        buildInventory
    };
});
