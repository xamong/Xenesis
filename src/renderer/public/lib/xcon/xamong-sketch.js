/**
 * XCON/SKETCH support for the legacy xamong runtime.
 *
 * This file patches XCON with:
 * - XCON.fromSketch(source)
 * - XCON.toSketch(xcon)
 * - XCON.detectSyntax(source)
 * - XCON.deserialize(source) with JSON/XML/TAGLESS/SKETCH auto detection
 *
 * It intentionally has no module imports in the browser build. In Node tests it
 * falls back to require('./XCON.js').
 */
(function (root, factory) {
    let XCONClass = root && root.XCON;

    if (!XCONClass && typeof require === 'function') {
        try {
            XCONClass = require('./XCON.js').XCON;
        } catch (_error) {
            XCONClass = null;
        }
    }

    const api = factory(XCONClass);

    if (root) {
        root.XamongSketch = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function (XCON) {
    'use strict';

    const quotedTokenPrefix = '\u0000quoted:';

    const actionAliases = {
        back: 'goBack',
        home: 'goHome',
        gogoBack: 'gogoBack',
        goBackAndRefresh: 'goBackAndRefreah',
        go: 'activity',
        root: 'makeRoot',
        wait: 'sleep',
        do: 'callAction',
        save: 'saveData',
        set: 'saveData',
        data: 'saveData',
        runChain: 'chain',
        chainAction: 'chain'
    };

    const httpActionMethods = {
        get: 'GET',
        post: 'POST',
        put: 'PUT',
        patch: 'PATCH',
        delete: 'DELETE',
        del: 'DELETE'
    };

    const actionTypes = new Set([
        'null',
        'none',
        'log',
        'custom',
        'callAction',
        'sleep',
        'batch',
        'condition',
        'select',
        'loop',
        'formula',
        'chain',
        'script',
        'callApi',
        'async',
        'try',
        'activity',
        'query',
        'loadTable',
        'saveTable',
        'saveData',
        'sendEmail',
        'sendSms',
        'sendPush',
        'alert',
        'toast',
        'makeRoot',
        'goHome',
        'goBack',
        'gogoBack',
        'createComponents',
        'transition',
        'datePicker',
        'imagePicker',
        'colorPicker',
        'filePicker',
        'sound',
        'launch',
        'event',
        'launchweb',
        'launchmap',
        'launchmail',
        'launchsms',
        'launchtel',
        'refresh',
        'setTitle',
        'setPrompt',
        'reloadForm',
        'goBackAndRefreah',
        'reloadData',
        'selectRow',
        'setEnabled',
        'setValues',
        'stopAction',
        'deleteRows',
        'setFocus',
        'timeline',
        'start',
        'stop',
        'setObjectValues',
        'setNewData',
        'addNewBlock',
        'easySelect',
        'addNewRow',
        'ensureVisible',
        'updateRows',
        'mediaControl',
        'saveFile',
        'openFile'
    ]);

    const componentTypes = new Set([
        'form',
        'list',
        'xForm',
        'xList',
        'label',
        'textField',
        'button',
        'panel',
        'checkbox',
        'radioButton',
        'image',
        'textView',
        'videoView',
        'webView',
        'banner',
        'frame',
        'import',
        'shape',
        'passwordField',
        'textarea',
        'select',
        'slider',
        'switch',
        'colorPicker',
        'datePicker',
        'timePicker',
        'filePicker',
        'imagePicker',
        'rating',
        'progressBar',
        'spinner',
        'badge',
        'avatar',
        'icon',
        'divider',
        'alert',
        'tooltip',
        'modal',
        'tabs',
        'accordion',
        'grid',
        'flexBox',
        'stack',
        'spacer',
        'card',
        'searchBar',
        'treeView',
        'carousel',
        'gallery',
        'qrCode',
        'barcode',
        'signaturePad',
        'chart',
        'codeEditor',
        'richEditor',
        'dataViz',
        'flipbook',
        'networkDiagram',
        'map',
        'calendar',
        'fileUpload',
        'dataTable',
        'mediaPlayer',
        'threeDViewer'
    ]);

    const actionHolderNames = new Set([
        'action',
        'cellAction',
        'onClick',
        'onBeginEdit',
        'onEndEdit',
        'onTextChanged',
        'onEnter',
        'onKeyDown',
        'onKeyUp',
        'onCheckedChanged',
        'success',
        'failure',
        'after',
        'try',
        'catch'
    ]);

    const valuelessArrayPropertyNames = new Set(['chain', 'actions', 'success', 'failure', 'after']);
    const booleanPropertyNames = new Set([
        'active', 'alpha', 'autoCenter', 'autoHeight', 'autoUpload', 'autoplay',
        'backdropClose', 'border', 'checked', 'controls', 'disabled',
        'dismissible', 'editable', 'enabled', 'expanded', 'gradients', 'hidden',
        'interactive', 'loop', 'multiple', 'muted', 'pending', 'readOnly',
        'readonly', 'renderHtml', 'required', 'responsive', 'rolling', 'selectable',
        'shadow', 'show', 'showArrows', 'showCaption', 'showCharCount',
        'showClearButton', 'showCloseButton', 'showDots', 'showHex', 'showIcon',
        'showIcons', 'showLabels', 'showPreview', 'showSaveButton',
        'showSearchButton', 'showStrength', 'showText', 'showThumbnails',
        'showToggle', 'showValue', 'ticks', 'underline', 'visible', 'weekends'
    ]);
    const numericPropertyNames = new Set([
        'acceleration', 'alpha', 'blur', 'borderBottom', 'borderLeft',
        'borderRight', 'borderTop', 'borderWidth', 'bottom', 'bottomLeftRadius',
        'bottomRightRadius', 'charge', 'cols', 'columns', 'delay', 'duration',
        'elevation', 'fontSize', 'fontWeight', 'friction', 'gap', 'gravity',
        'height', 'iconSize', 'interval', 'itemGap', 'labelFontSize', 'latitude',
        'layerZ', 'left', 'letterSpacing', 'lineHeight', 'linkDistance',
        'longitude', 'max', 'maxFiles', 'maxFileSize', 'maxHeight', 'maxLength',
        'maxLines', 'maxSize', 'maxWidth', 'min', 'minHeight', 'minLength',
        'minWidth', 'nodeRadius', 'opacity', 'pageHeight', 'pageWidth',
        'patternOpacity', 'patternSize', 'penWidth', 'quality', 'radius',
        'railWidth', 'right', 'rotation', 'round', 'rows', 'scale', 'scaleX',
        'scaleY', 'separatorHeight', 'separatorWidth', 'shadowBlur',
        'shadowOpacity', 'shadowRadius', 'size', 'spread', 'step', 'top',
        'topLeftRadius', 'topRightRadius', 'translateX', 'translateY', 'value',
        'weight', 'width', 'x', 'y', 'z', 'zIndex', 'zoom'
    ]);
    const themeVarPattern = /^var\(--([A-Za-z0-9_-]+)\)$/;

    class SketchParseError extends SyntaxError {
        constructor(message, line, column = 1) {
            super(`XCON/SKETCH parse error at line ${line}: ${message}`);
            this.name = 'SketchParseError';
            this.line = line;
            this.column = column;
        }
    }

    function requireXCON() {
        if (!XCON) {
            throw new Error('XCON/SKETCH requires XCON.js to be loaded first.');
        }
        return XCON;
    }

    function parseXconSketch(source) {
        return fromSketch(source);
    }

    function fromSketch(source) {
        const lines = preprocessLines(String(source || ''));
        const root = parseRoot(lines);
        return requireXCON().fromJSONObject(root);
    }

    function fromSketchLenient(source, options = {}) {
        const activeLines = String(source || '').replace(/\r\n/g, '\n').split('\n').map((text, index) => ({
            text,
            originalNumber: index + 1
        }));
        const errors = [];
        const maxRecoveries = options.maxRecoveries || Math.max(8, activeLines.length);

        for (let attempt = 0; attempt <= maxRecoveries; attempt += 1) {
            const currentSource = activeLines.map((line) => line.text).join('\n');
            try {
                return { document: fromSketch(currentSource), errors };
            } catch (error) {
                if (!(error instanceof SketchParseError)) throw error;
                const lineIndex = error.line - 1;
                const activeLine = activeLines[lineIndex];
                if (!activeLine) throw error;

                errors.push({
                    line: activeLine.originalNumber,
                    column: error.column || 1,
                    message: rewriteErrorLine(error.message, error.line, activeLine.originalNumber),
                    source: String(activeLine.text || '').trim()
                });

                activeLines.splice(lineIndex, removableSketchBlockLineCount(activeLines, lineIndex));
                if (activeLines.length === 0) throw error;
            }
        }

        throw new SketchParseError(`Could not recover after ${maxRecoveries} SKETCH parse error(s).`, 1);
    }

    function rewriteErrorLine(message, currentLine, originalLine) {
        return String(message || '').replace(`line ${currentLine}:`, `line ${originalLine}:`);
    }

    function removableSketchBlockLineCount(lines, startIndex) {
        const start = lines[startIndex];
        if (!start) return 1;
        const baseIndent = leadingSpaceCount(start.text);
        let count = 1;

        for (let index = startIndex + 1; index < lines.length; index += 1) {
            const text = lines[index].text;
            if (!String(text || '').trim()) {
                count += 1;
                continue;
            }
            if (leadingSpaceCount(text) <= baseIndent) break;
            count += 1;
        }

        return count;
    }

    function leadingSpaceCount(text) {
        return String(text || '').length - String(text || '').trimStart().length;
    }

    function toSketch(document, options = {}) {
        const plain = toPlain(document);
        const lines = [];
        const indent = options.pretty === false ? '' : '  ';
        const pos = rectParts(plain.pos);
        const label = typeof plain.name === 'string' && plain.name ? ` ${formatSketchScalar(plain.name)}` : '';

        lines.push(`screen${label} ${pos[2]}x${pos[3]}`);
        Object.keys(plain).forEach((key) => {
            if (key === 'type' || key === 'name' || key === 'pos' || key === 'components') return;
            if (key === 'triggers') {
                writeSketchTriggers(lines, indent, plain[key]);
                return;
            }
            writeSketchProperty(lines, indent, key, plain[key]);
        });

        writeSketchComponents(lines, plain.components, indent);
        return lines.join('\n');
    }

    function parseBySyntax(input, syntax) {
        const xcon = requireXCON();
        if (syntax === 'json') return xcon.fromJSON(input);
        if (syntax === 'xml') return xcon.fromXml(input);
        if (syntax === 'sketch') return fromSketch(input);
        return xcon.fromTagless(input);
    }

    function serializeBySyntax(input, syntax, pretty = true) {
        const xcon = requireXCON();
        if (syntax === 'json') return xcon.toJSON(input, pretty);
        if (syntax === 'xml') return typeof input.toXML === 'function' ? input.toXML() : xcon.serialize(input, false);
        if (syntax === 'tagless') return xcon.toTagless(input);
        return toSketch(input, { pretty });
    }

    function convert(input, from, to) {
        return serializeBySyntax(parseBySyntax(input, from), to, true);
    }

    function detectXconSyntax(input) {
        const trimmed = String(input || '').trim();
        if (!trimmed) return 'tagless';
        if (trimmed.startsWith('<')) return 'xml';
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
        if (looksLikeSketch(trimmed)) return 'sketch';
        return 'tagless';
    }

    function deserialize(input) {
        const trimmed = String(input || '').trim();
        if (!trimmed) return null;

        const syntax = detectXconSyntax(trimmed);
        if (syntax === 'sketch') return fromSketch(trimmed);
        if (syntax === 'json') return requireXCON().fromJSON(trimmed);
        if (syntax === 'xml') return requireXCON().fromXml(trimmed);
        return originalDeserialize ? originalDeserialize(trimmed) : requireXCON().fromTagless(trimmed);
    }

    function getSupportedComponentTypes() {
        return Array.from(componentTypes).sort();
    }

    function getSupportedActionTypes() {
        return Array.from(actionTypes).sort();
    }

    function getActionAliases() {
        return { ...actionAliases };
    }

    function getActionHolderNames() {
        return Array.from(actionHolderNames).sort();
    }

    function parseRoot(lines) {
        if (lines.length === 0) throw new SketchParseError('Expected screen declaration.', 1);

        const root = {
            type: 'form',
            pos: [0, 0, 360, 220]
        };
        const components = [];
        const stack = [{ kind: 'root', indent: -1, target: root, children: components }];
        const counts = new Map();
        let hasScreen = false;

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];

            if (line.text.startsWith('screen ')) {
                if (line.indent !== 0) throw new SketchParseError('Screen declaration must not be indented.', line.number);
                Object.assign(root, parseScreen(line));
                hasScreen = true;
                continue;
            }

            if (!hasScreen) throw new SketchParseError('Expected root screen declaration.', line.number);

            while (line.indent <= stack[stack.length - 1].indent) stack.pop();
            const parent = stack[stack.length - 1];

            if (line.text.startsWith('- ')) {
                if (parent.kind === 'chain') {
                    parent.items.push(parseChainStatement(line.text.slice(2).trim(), line));
                    continue;
                }
                if (parent.kind === 'chainAction') {
                    parent.items.push(parseChainStatement(line.text.slice(2).trim(), line));
                    continue;
                }
                if (parent.kind !== 'array') {
                    if (canAcceptImplicitActionItem(parent)) {
                        parent.target.actions = parent.target.actions || [];
                        parent.target.actions.push(parseActionArrayItem(line.text.slice(2).trim(), line));
                        continue;
                    }
                    throw new SketchParseError('Array item must be indented under an array property.', line.number);
                }
                parent.items.push(parseArrayItem(parent.key, line.text.slice(2).trim(), line));
                continue;
            }

            if (parent.kind === 'chain') {
                parent.items.push(parseChainStatement(line.text, line));
                continue;
            }

            if (parent.kind === 'chainAction') {
                parent.items.push(parseChainStatement(line.text, line));
                continue;
            }

            if (parent.kind === 'array') {
                throw new SketchParseError('Array items must start with "- ".', line.number);
            }

            const target = parent.kind === 'component' ? parent.component.props : parent.target;

            if (parent.kind === 'trigger') {
                if (isChainBlockProperty(line, lines[index + 1]) && parent.target.action) {
                    stack.push(createChainBlockProperty(parent.target.action, line));
                    continue;
                }
                const triggerAction = appendTriggerActionCommand(parent, line);
                if (triggerAction) {
                    if (canPushChainAction(triggerAction, line, lines[index + 1])) {
                        stack.push(createChainActionBlock(triggerAction, line));
                    }
                    continue;
                }
                if (isBlockProperty(line, lines[index + 1])) {
                    stack.push(createBlockProperty(parent.target, line, lines[index + 1]));
                    continue;
                }
                applyObjectProperty(parent.target, line);
                continue;
            }

            const shorthand = applyActionShorthand(target, line);
            if (shorthand) {
                if (canPushChainAction(shorthand.action, line, lines[index + 1])) {
                    stack.push(createChainActionBlock(shorthand.action, line));
                } else if (canPushActionObject(shorthand, line, lines[index + 1])) {
                    stack.push({ kind: 'object', indent: line.indent, key: shorthand.key, target: shorthand.action });
                }
                continue;
            }

            const triggerDeclaration = parseTriggerDeclaration(line);
            if (triggerDeclaration) {
                attachTriggerDeclaration(target, triggerDeclaration);
                stack.push({ kind: 'trigger', indent: line.indent, target: triggerDeclaration.trigger });
                continue;
            }

            if (isComponentDeclaration(line.text)) {
                if (parent.kind !== 'root' && parent.kind !== 'component') {
                    throw new SketchParseError('Components must be declared under a screen or component.', line.number);
                }

                const component = parseComponent(line, counts);
                parent.children.push(component);
                stack.push({ kind: 'component', indent: line.indent, component, children: component.children });
                continue;
            }

            if (parent.kind === 'object') {
                const consumedJsonPropertyIndex = consumeJsonProperty(parent.target, lines, index);
                if (consumedJsonPropertyIndex !== null) {
                    index = consumedJsonPropertyIndex;
                    continue;
                }
                if (isChainBlockProperty(line, lines[index + 1])) {
                    stack.push(createChainBlockProperty(parent.target, line));
                    continue;
                }
                const implicitAction = appendImplicitActionCommand(parent, line);
                if (implicitAction) {
                    if (canPushChainAction(implicitAction, line, lines[index + 1])) {
                        stack.push(createChainActionBlock(implicitAction, line));
                    }
                    continue;
                }
                const commandAction = applyActionCommandHeader(parent, line);
                if (commandAction) {
                    if (canPushChainAction(commandAction, line, lines[index + 1])) {
                        stack.push(createChainActionBlock(commandAction, line));
                    }
                    continue;
                }
                if (isBlockProperty(line, lines[index + 1])) {
                    stack.push(createBlockProperty(parent.target, line, lines[index + 1]));
                    continue;
                }
                applyObjectProperty(parent.target, line);
                continue;
            }

            if (isBlockProperty(line, lines[index + 1])) {
                stack.push(createBlockProperty(target, line, lines[index + 1]));
                continue;
            }

            const consumedJsonPropertyIndex = consumeJsonProperty(target, lines, index);
            if (consumedJsonPropertyIndex !== null) {
                index = consumedJsonPropertyIndex;
                continue;
            }

            applyProperty(target, line);
        }

        if (!hasScreen) throw new SketchParseError('Expected screen declaration.', lines[0] ? lines[0].number : 1);
        if (components.length > 0) root.components = emitComponents(components);
        return root;
    }

    function preprocessLines(source) {
        const rawLines = source.replace(/\r\n/g, '\n').split('\n');
        for (let index = 0; index < rawLines.length; index += 1) {
            if (rawLines[index].includes('\t')) {
                throw new SketchParseError('Tabs are not supported for indentation. Use spaces.', index + 1);
            }
        }

        const contentLines = rawLines.filter((raw) => stripComment(raw).trim());
        const commonIndent = contentLines.length === 0
            ? 0
            : Math.min(...contentLines.map((raw) => raw.length - raw.trimStart().length));

        return rawLines
            .map((raw, index) => {
                if (raw.includes('\t')) {
                    throw new SketchParseError('Tabs are not supported for indentation. Use spaces.', index + 1);
                }

                const dedented = raw.slice(commonIndent);
                const withoutComment = stripComment(dedented);
                const text = withoutComment.trim();
                if (!text) return null;

                return {
                    number: index + 1,
                    indent: withoutComment.length - withoutComment.trimStart().length,
                    text
                };
            })
            .filter(Boolean);
    }

    function stripComment(raw) {
        let quoted = false;
        for (let index = 0; index < raw.length - 1; index += 1) {
            const char = raw[index];
            if (char === '"' && raw[index - 1] !== '\\') {
                quoted = !quoted;
                continue;
            }
            if (!quoted && char === '/' && raw[index + 1] === '/' && (index === 0 || /\s/.test(raw[index - 1]))) {
                return raw.slice(0, index);
            }
        }
        return raw;
    }

    function parseScreen(line) {
        const tokens = tokenize(line.text);
        if (tokens.shift() !== 'screen') throw new SketchParseError('Expected screen declaration.', line.number);

        const root = { type: 'form' };
        if (tokens.length === 0) throw new SketchParseError('Expected screen size like 390x844.', line.number);

        if (tokens[0] && !isSizeToken(tokens[0])) {
            root.name = parseStringToken(tokens.shift(), line);
        }

        const size = tokens.shift();
        if (!size) throw new SketchParseError('Expected screen size like 390x844.', line.number);

        const dimensions = parseDimensions(size);
        if (!dimensions) throw new SketchParseError('Expected screen size like 390x844.', line.number);
        root.pos = [0, 0, dimensions[0], dimensions[1]];

        applyInlineProps(root, tokens, line);
        return root;
    }

    function isComponentDeclaration(text) {
        return (
            /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(text) ||
            /^[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(text)
        );
    }

    function parseComponent(line, counts) {
        const tokens = tokenize(line.text);
        const first = tokens.shift();
        if (!first) throw new SketchParseError('Expected component declaration.', line.number);

        let name;
        let type;
        if (tokens[0] === ':') {
            name = first;
            tokens.shift();
            const explicitType = tokens.shift();
            if (!explicitType) throw new SketchParseError('Expected component type after name.', line.number);
            type = explicitType;
        } else {
            type = first;
            name = nextComponentName(type, counts);
        }

        const props = { type, name };
        const text = tokens[0] && tokens[0] !== 'at' ? parseStringToken(tokens.shift(), line) : undefined;
        Object.assign(props, primaryText(type, text));

        if (tokens.shift() !== 'at') throw new SketchParseError('Expected component layout: at x y width height.', line.number);
        props.pos = parsePosition(tokens, line);
        applyInlineProps(props, tokens, line);

        return { name, props, children: [] };
    }

    function parsePosition(tokens, line) {
        const first = tokens.shift();
        if (!first) throw new SketchParseError('Expected position after at.', line.number);

        const pos = parseNumberListToken(first, line);
        while (pos.length < 4 && tokens[0] && isNumberToken(tokens[0])) {
            pos.push(parseNumber(tokens.shift(), line));
        }
        return pos;
    }

    function applyInlineProps(target, tokens, line) {
        let index = 0;
        while (index < tokens.length) {
            const key = normalizePropName(tokens[index]);
            const value = tokens[index + 1];
            if (!key || value === undefined) throw new SketchParseError('Expected inline property name and value.', line.number);

            if (key === 'size') {
                target.size = parseSizeValue(value, line);
            } else {
                target[key] = parseScalar(value, line);
            }
            index += 2;
        }
    }

    function applyProperty(props, line) {
        const tokens = tokenize(line.text);
        const rawKey = tokens[0];
        const key = normalizePropName(rawKey);
        const values = tokens.slice(1);
        if (!key) throw new SketchParseError('Property requires a name.', line.number);
        if (values.length === 0) {
            applyValuelessProperty(props, key);
            return;
        }

        if (rawKey === 'bg') props.backgroundColor = required(values, line, 'bg requires a color.');
        else if (key === 'color') props.color = required(values, line, 'color requires a value.');
        else if (key === 'font') props.font = parseFont(values, line);
        else if (key === 'align') props.textAlign = required(values, line, 'align requires a value.');
        else if (key === 'valign') props.textVerticalAlign = required(values, line, 'valign requires a value.');
        else if (key === 'radius') mergeObject(props, 'border', { radius: parseNumber(required(values, line, 'radius requires a number.'), line) });
        else if (key === 'border') mergeObject(props, 'border', parseBorder(values, line));
        else if (key === 'shadow') props.shadow = parseShadow(values, line);
        else if (key === 'gap') mergeObject(props, 'al', { gap: parseScalar(required(values, line, 'gap requires a value.'), line) });
        else if (key === 'padding') mergeObject(props, 'al', { padding: parseSpacing(values, line) });
        else if (key === 'layout') {
            const layout = required(values, line, 'layout requires a value.');
            if (props.type === 'button') props.layout = layout;
            else mergeObject(props, 'al', { direction: layout });
        }
        else if (key === 'scroll') props.scroll = required(values, line, 'scroll requires a mode.');
        else props[key] = values.length === 1 ? parseScalar(values[0], line) : values.map((value) => parseScalar(value, line));
    }

    function applyObjectProperty(target, line) {
        if (applyActionShorthand(target, line)) return;

        const tokens = tokenize(line.text);
        const key = normalizePropName(tokens[0]);
        if (!key) throw new SketchParseError('Object property requires a name.', line.number);
        if (tokens.length < 2) {
            applyValuelessProperty(target, key);
            return;
        }
        target[key] = tokens.length === 2 ? parseScalar(tokens[1], line) : tokens.slice(1).map((value) => parseScalar(value, line)).join(' ');
    }

    function consumeJsonProperty(target, lines, index) {
        const start = parseJsonPropertyStart(lines[index]);
        if (!start) return null;

        const fragments = [start.value];
        let endIndex = index;
        while (!isCompleteJsonValue(fragments.join('\n'))) {
            endIndex += 1;
            const next = lines[endIndex];
            if (!next) {
                throw new SketchParseError(`Unterminated JSON value for "${start.key}".`, lines[index].number);
            }
            fragments.push(next.text);
        }

        const json = fragments.join('\n');
        try {
            target[normalizePropName(start.key)] = JSON.parse(json);
        } catch (_error) {
            throw new SketchParseError(`Invalid JSON value for "${start.key}".`, lines[index].number);
        }
        return endIndex;
    }

    function parseJsonPropertyStart(line) {
        const match = line.text.match(/^([A-Za-z_][\w-]*)\s+([\s\S]+)$/);
        if (!match) return null;

        const value = match[2].trim();
        if (!value.startsWith('{') && !value.startsWith('[')) return null;
        return { key: match[1], value };
    }

    function isCompleteJsonValue(value) {
        let depth = 0;
        let quoted = false;
        let escaped = false;

        for (const char of value) {
            if (quoted) {
                if (escaped) {
                    escaped = false;
                } else if (char === '\\') {
                    escaped = true;
                } else if (char === '"') {
                    quoted = false;
                }
                continue;
            }

            if (char === '"') {
                quoted = true;
            } else if (char === '{' || char === '[') {
                depth += 1;
            } else if (char === '}' || char === ']') {
                depth -= 1;
            }
        }

        return depth === 0 && !quoted;
    }

    function applyValuelessProperty(target, key) {
        target[key] = valuelessArrayPropertyNames.has(key) ? [] : {};
    }

    function parseTriggerDeclaration(line) {
        const tokens = tokenize(line.text);
        if (tokens[0] !== 'trigger') return null;
        if (tokens.length < 2) throw new SketchParseError('Trigger declaration requires a name.', line.number);

        const name = parseStringToken(tokens[1], line);
        const trigger = {};
        let index = 2;
        while (index < tokens.length) {
            const key = normalizePropName(tokens[index]);
            const value = tokens[index + 1];
            if (!key || value === undefined) {
                throw new SketchParseError('Trigger option requires a name and value.', line.number);
            }

            if (key === 'on' || key === 'watch' || key === 'dependency') {
                trigger.dependency = parseTriggerList(value, line);
            } else if (key === 'event') {
                trigger.event = parseStringToken(value, line);
            } else if (key === 'render') {
                const parsed = parseScalar(value, line);
                if (typeof parsed === 'boolean') {
                    trigger.render = parsed;
                } else {
                    trigger.render = true;
                    trigger.renderTarget = parseTriggerList(value, line);
                }
            } else if (key === 'renderTarget') {
                trigger.render = trigger.render !== false;
                trigger.renderTarget = parseTriggerList(value, line);
            } else {
                trigger[key] = parseScalar(value, line);
            }
            index += 2;
        }

        return { name, trigger };
    }

    function attachTriggerDeclaration(target, declaration) {
        if (!isRecord(target.triggers)) target.triggers = {};
        target.triggers[declaration.name] = declaration.trigger;
    }

    function isBlockProperty(line, next) {
        return tokenize(line.text).length === 1 && Boolean(next && next.indent > line.indent);
    }

    function createBlockProperty(props, line, next) {
        const key = normalizePropName(line.text);
        if (!next) throw new SketchParseError('Block property requires indented content.', line.number);
        if (key === 'chain') {
            return createChainBlockProperty(props, line);
        }
        if (next.text.startsWith('- ')) {
            const items = [];
            props[key] = items;
            return { kind: 'array', indent: line.indent, key, items };
        }

        const target = {};
        props[key] = target;
        return { kind: 'object', indent: line.indent, key, target };
    }

    function isChainBlockProperty(line, next) {
        return normalizePropName(line.text) === 'chain' && tokenize(line.text).length === 1 && Boolean(next && next.indent > line.indent);
    }

    function createChainBlockProperty(props, line) {
        const items = [];
        props.chain = items;
        return { kind: 'chain', indent: line.indent, key: 'chain', items };
    }

    function parseChainStatement(value, line) {
        const tokens = tokenize(value);
        if (tokens.length === 1 && (tokens[0].startsWith(quotedTokenPrefix) || isJsonToken(tokens[0]))) {
            const parsed = parseScalar(tokens[0], line);
            return parsed == null ? '' : String(parsed);
        }
        return value;
    }

    function required(values, line, message) {
        if (!values[0]) throw new SketchParseError(message, line.number);
        return parseStringToken(values[0], line);
    }

    function parseFont(values, line) {
        if (values.length < 1) throw new SketchParseError('font requires at least a size.', line.number);
        if (values.length === 1) return { size: parseScalar(values[0], line) };
        if (isNumberToken(values[0])) return { size: parseNumber(values[0], line), weight: parseScalar(values[1], line) };
        return {
            family: parseStringToken(values[0], line),
            size: parseScalar(values[1], line),
            ...(values[2] ? { weight: parseScalar(values[2], line) } : {})
        };
    }

    function parseBorder(values, line) {
        if (values.length < 1) throw new SketchParseError('border requires width.', line.number);
        const visible = parseBooleanLike(values[0], line);
        if (values.length === 1 && visible !== null) return { visible };
        return {
            width: parseNumber(values[0], line),
            ...(values[1] ? { color: parseStringToken(values[1], line) } : {}),
            ...(values[2] ? { radius: parseNumber(values[2], line) } : {})
        };
    }

    function parseShadow(values, line) {
        const visible = parseBooleanLike(values[0], line);
        if (values.length === 1 && visible !== null) return { visible };
        if (values.length < 4) throw new SketchParseError('shadow requires x y blur opacity.', line.number);
        return {
            x: parseNumber(values[0], line),
            y: parseNumber(values[1], line),
            blur: parseNumber(values[2], line),
            opacity: parseNumber(values[3], line)
        };
    }

    function parseBooleanLike(value, line) {
        const parsed = parseScalar(value, line);
        if (typeof parsed === 'boolean') return parsed;
        if (parsed === 'true') return true;
        if (parsed === 'false') return false;
        return null;
    }

    function parseSpacing(values, line) {
        if (values.length === 0) throw new SketchParseError('spacing requires at least one value.', line.number);
        if (values.length === 1) return parseScalar(values[0], line);
        return values.map((value) => parseNumber(value, line));
    }

    function parseTriggerList(value, line) {
        const parsed = parseScalar(value, line);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item));
        if (parsed === null || parsed === undefined) return [];
        return String(parsed)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function parseArrayItem(key, value, line) {
        if (isActionArrayKey(key)) {
            return parseActionArrayItem(value, line);
        }
        return parseScalar(value, line);
    }

    function parseActionArrayItem(value, line) {
        const action = parseActionCommandText(value, line);
        if (action) return action;
        return parseScalar(value, line);
    }

    function applyActionShorthand(target, line) {
        const tokens = tokenize(line.text);
        if (tokens.length < 2) return false;

        const key = normalizePropName(tokens[0]);
        let offset = 1;
        if (tokens[1] === ':') offset = 2;
        if (!isActionHolderName(key) || tokens.length <= offset) return false;

        const action = tokens.length === offset + 1 && isJsonToken(tokens[offset])
            ? parseScalar(tokens[offset], line)
            : parseActionCommandTokens(tokens.slice(offset), line);

        if (!action) return false;
        target[key] = action;
        return { key, action };
    }

    function applyActionCommandHeader(parent, line) {
        if (!parent || parent.kind !== 'object' || !isActionHolderName(parent.key)) return false;
        if (parent.target && parent.target.type) return false;

        const action = parseActionCommandText(line.text, line);
        if (!action || typeof action !== 'object' || Array.isArray(action)) return false;
        Object.assign(parent.target, action);
        return parent.target;
    }

    function canPushActionObject(shorthand, line, next) {
        return (
            shorthand &&
            shorthand.action &&
            typeof shorthand.action === 'object' &&
            !Array.isArray(shorthand.action) &&
            next &&
            next.indent > line.indent
        );
    }

    function canPushChainAction(action, line, next) {
        return (
            action &&
            action.type === 'chain' &&
            next &&
            next.indent > line.indent
        );
    }

    function createChainActionBlock(action, line) {
        if (!Array.isArray(action.statements)) action.statements = [];
        return { kind: 'chainAction', indent: line.indent, target: action, items: action.statements };
    }

    function canAcceptImplicitActionItem(parent) {
        return (
            parent &&
            parent.kind === 'object' &&
            isActionHolderName(parent.key) &&
            parent.target &&
            parent.target.type === 'batch'
        );
    }

    function appendImplicitActionCommand(parent, line) {
        if (
            !parent ||
            parent.kind !== 'object' ||
            !isActionHolderName(parent.key) ||
            !parent.target ||
            !parent.target.type
        ) {
            return false;
        }

        const action = parseActionCommandText(line.text, line);
        if (!action || typeof action !== 'object' || Array.isArray(action)) return false;

        if (parent.target.type === 'batch') {
            parent.target.actions = parent.target.actions || [];
            parent.target.actions.push(action);
            return action;
        }

        const firstAction = {};
        Object.keys(parent.target).forEach((key) => {
            firstAction[key] = parent.target[key];
            delete parent.target[key];
        });
        parent.target.type = 'batch';
        parent.target.actions = [firstAction, action];
        return action;
    }

    function appendTriggerActionCommand(parent, line) {
        if (!parent || parent.kind !== 'trigger' || !parent.target) return false;

        if (parent.target.action && applyActionContinuation(parent.target.action, line)) {
            return true;
        }

        const action = parseActionCommandText(line.text, line);
        if (!action || typeof action !== 'object' || Array.isArray(action)) return false;

        const current = parent.target.action;
        if (!current) {
            parent.target.action = action;
            return action;
        }

        if (current.type === 'batch') {
            current.actions = current.actions || [];
            current.actions.push(action);
            return action;
        }

        parent.target.action = {
            type: 'batch',
            actions: [current, action]
        };
        return action;
    }

    function applyActionContinuation(target, line) {
        const tokens = tokenize(line.text);
        if (tokens.length < 2) return false;

        let key = normalizePropName(tokens[0]);
        let offset = 1;
        if (key.endsWith(':')) {
            key = key.slice(0, -1);
        } else if (tokens[1] === ':') {
            offset = 2;
        }

        if (!isActionHolderName(key) || tokens.length <= offset) return false;

        const action = tokens.length === offset + 1 && isJsonToken(tokens[offset])
            ? parseScalar(tokens[offset], line)
            : parseActionCommandTokens(tokens.slice(offset), line);

        if (!action) return false;
        target[key] = action;
        return true;
    }

    function parseActionCommandText(text, line) {
        return parseActionCommandTokens(tokenize(text), line);
    }

    function parseActionCommandTokens(tokens, line) {
        if (!tokens.length) return null;

        const requestedType = parseStringToken(tokens[0], line);
        const httpMethod = httpActionMethods[String(requestedType).toLowerCase()];
        const type = httpMethod ? 'callApi' : actionAliases[requestedType] || requestedType;
        if (!actionTypes.has(type)) return null;

        const action = { type };
        if (httpMethod) action.method = httpMethod;
        let index = 1;
        index = applyPrimaryActionArgument(action, tokens, index, line);
        applyActionKeyValues(action, tokens, index, line);
        return action;
    }

    function applyPrimaryActionArgument(action, tokens, index, line) {
        if (index >= tokens.length) return index;

        const first = parseScalar(tokens[index], line);
        if (action.type !== 'toast' && action.type !== 'log' && action.type !== 'alert' && looksLikeKeyValueRemainder(tokens, index)) {
            return index;
        }
        switch (action.type) {
            case 'batch':
                action.mode = first;
                return index + 1;
            case 'toast':
            case 'log':
                action.message = first;
                return index + 1;
            case 'alert':
                if (tokens[index + 1] && !looksLikeKeyValueRemainder(tokens, index + 1)) {
                    action.title = first;
                    action.message = parseScalar(tokens[index + 1], line);
                    return index + 2;
                }
                action.message = first;
                return index + 1;
            case 'activity':
            case 'makeRoot':
                action.xcon = first;
                return index + 1;
            case 'callApi':
                action.url = first;
                return index + 1;
            case 'chain':
                action.statements = [String(first)];
                return index + 1;
            case 'callAction':
                action.action = first;
                return index + 1;
            case 'sleep':
                action.duration = first;
                return index + 1;
            case 'sound':
                action.src = first;
                return index + 1;
            case 'launch':
            case 'launchweb':
            case 'launchmap':
            case 'launchmail':
            case 'launchsms':
            case 'launchtel':
                action.url = first;
                return index + 1;
            case 'start':
            case 'stop':
            case 'timeline':
            case 'mediaControl':
            case 'datePicker':
            case 'imagePicker':
            case 'colorPicker':
            case 'filePicker':
            case 'ensureVisible':
            case 'updateRows':
            case 'setObjectValues':
            case 'setNewData':
            case 'addNewBlock':
            case 'easySelect':
            case 'addNewRow':
                action.target = first;
                return index + 1;
            default:
                return index;
        }
    }

    function applyActionKeyValues(action, tokens, index, line) {
        while (index < tokens.length) {
            const key = normalizeActionPropertyName(action, normalizePropName(tokens[index]));
            const value = tokens[index + 1];
            if (!key || value === undefined) {
                throw new SketchParseError('Expected action property name and value.', line.number);
            }
            action[key] = normalizeActionPropertyValue(action, key, parseScalar(value, line));
            index += 2;
        }
    }

    function normalizeActionPropertyName(action, key) {
        if (!action || action.type !== 'callApi') return key;
        if (key === 'payload' || key === 'body' || key === 'params' || key === 'query') return 'parameter';
        if (key === 'headers') return 'header';
        return key;
    }

    function normalizeActionPropertyValue(action, key, value) {
        if (key === 'chain') {
            if (Array.isArray(value)) return value.map((item) => String(item));
            if (value === null || value === undefined) return [];
            return [String(value)];
        }
        if (action && action.type === 'chain' && key === 'statements') {
            if (Array.isArray(value)) return value.map((item) => String(item));
            if (value === null || value === undefined) return [];
            return [String(value)];
        }
        if (action && action.type === 'callApi' && key === 'method' && value != null) {
            return String(value).toUpperCase();
        }
        return value;
    }

    function looksLikeKeyValueRemainder(tokens, index) {
        return tokens.length - index >= 2 && /^[A-Za-z_][\w-]*$/.test(tokens[index]);
    }

    function isActionHolderName(key) {
        return actionHolderNames.has(key) || /^on[A-Z]/.test(key);
    }

    function isActionArrayKey(key) {
        return key === 'actions' || key === 'success' || key === 'failure' || key === 'after';
    }

    function parseScalar(value, line) {
        if (value.startsWith(quotedTokenPrefix)) return value.slice(quotedTokenPrefix.length);
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (isNumberToken(value)) return Number(value);
        if (isNumberListToken(value)) return value.split(',').map(Number);
        if (isSizeToken(value)) return parseDimensions(value);
        if (isJsonToken(value)) {
            try {
                return JSON.parse(value);
            } catch (_error) {
                throw new SketchParseError(`Invalid JSON value "${value}".`, line.number);
            }
        }
        return value;
    }

    function parseStringToken(value, line) {
        const parsed = parseScalar(value, line);
        return parsed === null ? 'null' : String(parsed);
    }

    function parseSizeValue(value, line) {
        if (isSizeToken(value)) return parseDimensions(value);
        return parseScalar(value, line);
    }

    function parseNumberListToken(value, line) {
        if (isNumberListToken(value)) return value.split(',').map(Number);
        if (isNumberToken(value)) return [Number(value)];
        throw new SketchParseError('Expected numeric position.', line.number);
    }

    function parseNumber(value, line) {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new SketchParseError(`Expected number but received "${value}".`, line.number);
        return number;
    }

    function isNumberToken(value) {
        return /^-?(?:\d+|\d*\.\d+)$/.test(value);
    }

    function isNumberListToken(value) {
        return /^-?(?:\d+|\d*\.\d+),-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+))*$/.test(value);
    }

    function isSizeToken(value) {
        return /^-?(?:\d+|\d*\.\d+)x-?(?:\d+|\d*\.\d+)$/i.test(value);
    }

    function isSafeDimensionToken(value) {
        return /^-?(?:\d+|\d*\.\d+)(?:px|%|vh|vw|vmin|vmax|rem|em)?$/i.test(value);
    }

    function isJsonToken(value) {
        return (value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'));
    }

    function parseDimensions(value) {
        const match = value.match(/^(-?(?:\d+|\d*\.\d+))x(-?(?:\d+|\d*\.\d+))$/i);
        if (!match) return null;
        return [Number(match[1]), Number(match[2])];
    }

    function normalizePropName(key) {
        if (key === 'bg') return 'backgroundColor';
        return key;
    }

    function nextComponentName(type, counts) {
        const count = (counts.get(type) || 0) + 1;
        counts.set(type, count);
        return `${type}${count}`;
    }

    function primaryText(type, text) {
        if (text === undefined) return {};
        if (type === 'button') return { label: text };
        if (type === 'textField' || type === 'searchBar') return { placeholder: text };
        if (type === 'label' || type === 'textView' || type === 'shape') return { text };
        return { text };
    }

    function writeSketchComponents(lines, components, indent) {
        if (!isRecord(components)) return;

        orderedComponentKeys(components).forEach((key) => {
            const component = components[key];
            if (!isRecord(component)) return;
            writeSketchComponent(lines, key, component, indent);
        });
    }

    function writeSketchComponent(lines, name, component, indent) {
        const type = typeof component.type === 'string' ? component.type : 'panel';
        const pos = rectParts(component.pos);
        const primaryKey = primaryTextProperty(type, component);
        const primaryValue = primaryKey ? component[primaryKey] : undefined;
        const primary = typeof primaryValue === 'string' && primaryValue ? ` ${formatSketchScalar(primaryValue)}` : '';

        lines.push(`${indent}${name}: ${type}${primary} at ${pos.join(' ')}`);
        Object.keys(component).forEach((key) => {
            const value = component[key];
            if (key === 'type' || key === 'pos' || key === 'components') return;
            if (key === 'name' && value === name) return;
            if (key === primaryKey) return;
            if (key === 'triggers') {
                writeSketchTriggers(lines, `${indent}  `, value);
                return;
            }
            writeSketchProperty(lines, `${indent}  `, key, value);
        });

        writeSketchComponents(lines, component.components, `${indent}  `);
    }

    function writeSketchProperty(lines, indent, key, value) {
        if (key === 'chain' && Array.isArray(value)) {
            lines.push(`${indent}chain`);
            value.forEach((item) => {
                lines.push(`${indent}  - ${formatSketchPropertyScalar(key, item)}`);
            });
            return;
        }

        if (isRecord(value)) {
            if (isSimpleObject(value)) {
                lines.push(`${indent}${key}`);
                Object.keys(value).forEach((childKey) => {
                    writeSketchProperty(lines, `${indent}  `, childKey, value[childKey]);
                });
                return;
            }

            lines.push(`${indent}${key} ${JSON.stringify(value)}`);
            return;
        }

        if (Array.isArray(value)) {
            if (value.every((item) => !isRecord(item) && !Array.isArray(item))) {
                lines.push(`${indent}${key}`);
                value.forEach((item) => {
                    lines.push(`${indent}  - ${formatSketchPropertyScalar(key, item)}`);
                });
                return;
            }

            lines.push(`${indent}${key} ${JSON.stringify(value)}`);
            return;
        }

        lines.push(`${indent}${key} ${formatSketchPropertyScalar(key, value)}`);
    }

    function writeSketchTriggers(lines, indent, triggers) {
        if (!isRecord(triggers)) {
            writeSketchProperty(lines, indent, 'triggers', triggers);
            return;
        }

        Object.keys(triggers).forEach((triggerName) => {
            const trigger = triggers[triggerName];
            if (!isRecord(trigger)) {
                writeSketchProperty(lines, indent, triggerName, trigger);
                return;
            }

            const parts = [`${indent}trigger ${formatSketchInlineToken(triggerName)}`];
            const dependencies = normalizeListValue(trigger.dependency);
            const renderTargets = normalizeListValue(trigger.renderTarget);

            if (dependencies.length > 0) {
                parts.push(`on ${formatSketchInlineList(dependencies)}`);
            }
            if (trigger.event !== undefined) {
                parts.push(`event ${formatSketchInlineToken(trigger.event)}`);
            }
            if (renderTargets.length > 0) {
                parts.push(`render ${formatSketchInlineList(renderTargets)}`);
            } else if (trigger.render !== undefined) {
                parts.push(`render ${formatSketchInlineToken(trigger.render)}`);
            }

            lines.push(parts.join(' '));

            Object.keys(trigger).forEach((key) => {
                if (key === 'dependency' || key === 'event' || key === 'render' || key === 'renderTarget' || key === 'action') return;
                writeSketchProperty(lines, `${indent}  `, key, trigger[key]);
            });

            if (trigger.action !== undefined) {
                writeSketchProperty(lines, `${indent}  `, 'action', trigger.action);
            }
        });
    }

    function orderedComponentKeys(components) {
        const ordered = [];
        const seen = new Set();
        if (typeof components.componentsOrder === 'string') {
            components.componentsOrder.split(',').map((item) => item.trim()).filter(Boolean).forEach((key) => {
                if (isRecord(components[key]) && !seen.has(key)) {
                    ordered.push(key);
                    seen.add(key);
                }
            });
        }

        Object.keys(components).forEach((key) => {
            if (key !== 'componentsOrder' && isRecord(components[key]) && !seen.has(key)) {
                ordered.push(key);
                seen.add(key);
            }
        });

        return ordered;
    }

    function primaryTextProperty(type, component) {
        if (type === 'button' && typeof component.label === 'string') return 'label';
        if ((type === 'textField' || type === 'searchBar') && typeof component.placeholder === 'string') return 'placeholder';
        if ((type === 'label' || type === 'textView' || type === 'shape') && typeof component.text === 'string') return 'text';
        return null;
    }

    function rectParts(value) {
        if (Array.isArray(value) && value.length >= 4) {
            const parts = value.slice(0, 4).map((item) => (typeof item === 'number' && Number.isFinite(item) ? item : Number(item)));
            if (parts.every((item) => Number.isFinite(item))) return parts;
        }

        if (typeof value === 'string') {
            const parts = value.split(',').map((item) => Number(item.trim()));
            if (parts.length >= 4 && parts.slice(0, 4).every((item) => Number.isFinite(item))) {
                return parts.slice(0, 4);
            }
        }

        return [0, 0, 0, 0];
    }

    function isSimpleObject(object) {
        return Object.keys(object).every((key) => {
            const value = object[key];
            return value === null ||
                (!isRecord(value) && !Array.isArray(value)) ||
                (Array.isArray(value) && value.every((item) => item === null || (!isRecord(item) && !Array.isArray(item))));
        });
    }

    function formatSketchScalar(value) {
        if (value === null) return 'null';
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'string') return JSON.stringify(value);
        return JSON.stringify(value);
    }

    function formatSketchPropertyScalar(key, value) {
        if (typeof value !== 'string') return formatSketchScalar(value);

        const trimmed = value.trim();
        const themeToken = themeVarToToken(trimmed);
        if (themeToken) return themeToken;

        const lower = trimmed.toLowerCase();
        if (booleanPropertyNames.has(key) && (lower === 'true' || lower === 'false')) {
            return lower;
        }

        if (numericPropertyNames.has(key) && isNumberToken(trimmed)) {
            return String(Number(trimmed));
        }

        if ((numericPropertyNames.has(key) || key === 'padding' || key === 'margin') && isSafeDimensionToken(trimmed)) {
            return trimmed;
        }

        return formatSketchScalar(value);
    }

    function themeVarToToken(value) {
        const match = String(value || '').trim().match(themeVarPattern);
        return match ? `@${match[1]}` : null;
    }

    function formatSketchInlineToken(value) {
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value === 'string' && /^[A-Za-z0-9_@.$~/:-]+$/.test(value)) return value;
        return formatSketchScalar(value);
    }

    function formatSketchInlineList(value) {
        return normalizeListValue(value).map((item) => formatSketchInlineToken(item)).join(',');
    }

    function normalizeListValue(value) {
        if (Array.isArray(value)) return value;
        if (value === null || value === undefined) return [];
        return [value];
    }

    function emitComponents(components) {
        const output = {
            componentsOrder: components.map((component) => component.name).join(',')
        };

        components.forEach((component) => {
            if (component.children.length > 0) component.props.components = emitComponents(component.children);
            output[component.name] = component.props;
        });
        return output;
    }

    function mergeObject(target, key, patch) {
        const current = target[key];
        target[key] = { ...(isRecord(current) ? current : {}), ...patch };
    }

    function isRecord(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !isXCONObject(value);
    }

    function isXCONObject(value) {
        return Boolean(value) &&
            typeof value === 'object' &&
            typeof value.get === 'function' &&
            typeof value.set === 'function' &&
            typeof value[Symbol.iterator] === 'function';
    }

    function toPlain(value) {
        if (XCON && typeof XCON.toPlainJSONObject === 'function') {
            return XCON.toPlainJSONObject(value);
        }
        if (isXCONObject(value)) {
            const result = {};
            for (const { key, value: child } of value) {
                result[key] = toPlain(child);
            }
            return result;
        }
        if (Array.isArray(value)) return value.map((item) => toPlain(item));
        if (isRecord(value)) {
            const result = {};
            Object.keys(value).forEach((key) => {
                result[key] = toPlain(value[key]);
            });
            return result;
        }
        return value;
    }

    function looksLikeSketch(source) {
        const firstLine = source.split(/\r?\n/).find((line) => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//');
        }) || '';
        const trimmed = firstLine.trim();

        return (
            trimmed.startsWith('screen ') ||
            /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(trimmed)
        );
    }

    function tokenize(input) {
        const tokens = [];
        let current = '';
        let quoted = false;
        let escaped = false;

        const push = () => {
            if (current.length === 0) return;
            tokens.push(current);
            current = '';
        };

        const pushQuoted = () => {
            tokens.push(`${quotedTokenPrefix}${current}`);
            current = '';
        };

        for (let index = 0; index < input.length; index += 1) {
            const char = input[index];

            if (quoted) {
                if (escaped) {
                    if (char === 'n') current += '\n';
                    else if (char === 'r') current += '\r';
                    else if (char === 't') current += '\t';
                    else current += char;
                    escaped = false;
                    continue;
                }
                if (char === '\\') {
                    escaped = true;
                    continue;
                }
                if (char === '"') {
                    quoted = false;
                    pushQuoted();
                    continue;
                }
                current += char;
                continue;
            }

            if (char === '"') {
                push();
                quoted = true;
                continue;
            }

            if (char === '{' || char === '[') {
                push();
                const jsonToken = readJsonToken(input, index);
                if (jsonToken) {
                    tokens.push(jsonToken.token);
                    index = jsonToken.end;
                    continue;
                }
            }

            if (/\s/.test(char)) {
                push();
                continue;
            }

            if (char === ':' && /^[A-Za-z_][\w-]*$/.test(current) && input[index + 1] !== '/') {
                push();
                tokens.push(':');
                continue;
            }

            current += char;
        }

        push();
        return tokens;
    }

    function readJsonToken(input, start) {
        const opener = input[start];
        if (opener !== '{' && opener !== '[') return null;

        let depth = 0;
        let quoted = false;
        let escaped = false;

        for (let index = start; index < input.length; index += 1) {
            const char = input[index];

            if (quoted) {
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char === '\\') {
                    escaped = true;
                    continue;
                }
                if (char === '"') quoted = false;
                continue;
            }

            if (char === '"') {
                quoted = true;
                continue;
            }
            if (char === '{' || char === '[') {
                depth += 1;
                continue;
            }
            if (char === '}' || char === ']') {
                depth -= 1;
                if (depth === 0) return { token: input.slice(start, index + 1), end: index };
            }
        }

        return null;
    }

    const originalDeserialize = XCON && XCON.deserialize ? XCON.deserialize.bind(XCON) : null;

    function patchXCON() {
        if (!XCON) return;

        XCON.SketchParseError = SketchParseError;
        XCON.parseXconSketch = parseXconSketch;
        XCON.fromSketch = fromSketch;
        XCON.fromSketchLenient = fromSketchLenient;
        XCON.toSketch = toSketch;
        XCON.detectSyntax = detectXconSyntax;
        XCON.parseBySyntax = parseBySyntax;
        XCON.serializeBySyntax = serializeBySyntax;
        XCON.convert = convert;
        XCON.deserialize = deserialize;

        if (!XCON.prototype.toSketch) {
            XCON.prototype.toSketch = function (options) {
                return toSketch(this, options);
            };
        }
    }

    patchXCON();

    return {
        SketchParseError,
        parseXconSketch,
        fromSketch,
        fromSketchLenient,
        toSketch,
        detectXconSyntax,
        parseBySyntax,
        serializeBySyntax,
        convert,
        deserialize,
        getSupportedComponentTypes,
        getSupportedActionTypes,
        getActionAliases,
        getActionHolderNames,
        patchXCON
    };
});
