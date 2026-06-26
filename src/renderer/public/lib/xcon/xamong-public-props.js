/**
 * Public XCON property reader.
 *
 * The draft renderer still has older internal field names in a few classes.
 * This module defines the public authoring surface and translates those public
 * names into the internal reads while the implementation is being ported.
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.XamongPublicProps = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const MISSING = Symbol('missing');

    const componentTypeAliases = {
        form: 'xForm',
        list: 'xList'
    };

    const themeTokenAliasPattern = /(^|[\s(:,])@([A-Za-z_][\w-]*)(?=$|[\s),;])/g;

    const propAliases = {
        backgroundColor: ['background.color'],
        backgroundImage: ['background.image'],
        bgColor: ['backgroundColor'],
        bgImage: ['backgroundImage', 'background.image'],
        fgColor: ['color'],
        textColor: ['color'],
        textAlign: ['font.align'],
        textVerticalAlign: ['font.valign', 'font.verticalAlign'],
        textVAlign: ['textVerticalAlign'],
        verticalAlign: ['textVerticalAlign'],
        truncate: ['overflow'],
        truncateLength: ['overflowLength'],
        lineNum: ['lineNumbers'],
        textDecoration: ['font.decoration'],
        lineHeight: ['font.lineHeight'],
        letterSpacing: ['font.letterSpacing'],

        font: ['font.family'],
        fontSize: ['font.size'],
        fontWeight: ['font.weight'],
        fontStyle: ['font.style'],
        bold: ['font.bold'],
        italic: ['font.italic'],
        underline: ['font.underline'],
        strikethrough: ['font.strikethrough'],
        autoAdjustFontSize: ['font.autoFit'],

        binding: ['bind'],
        mode: ['inputType'],
        secureTextEntry: ['inputType'],
        clearButton: ['suffix.clear'],
        prefixIcon: ['prefix.icon', 'leftIcon.name', 'leftIcon'],
        prefixText: ['prefix.text'],
        suffixIcon: ['suffix.icon', 'rightIcon.name', 'rightIcon'],
        suffixText: ['suffix.text'],
        postButton: ['trailingButton'],
        html: ['renderHtml'],
        orientation: ['direction'],
        scroll: ['overflow'],
        scrollbarVisible: ['scrollbar'],

        round: ['border.radius', 'radius', 'borderRadius'],
        borderWidth: ['border.width'],
        borderStyle: ['border.style'],
        borderColor: ['border.color'],
        borderRadius: ['border.radius', 'radius'],
        borderLeft: ['border.left', 'border.left.width'],
        borderTop: ['border.top', 'border.top.width'],
        borderRight: ['border.right', 'border.right.width'],
        borderBottom: ['border.bottom', 'border.bottom.width'],
        borderTopLeftRadius: ['border.topLeftRadius'],
        borderTopRightRadius: ['border.topRightRadius'],
        borderBottomLeftRadius: ['border.bottomLeftRadius'],
        borderBottomRightRadius: ['border.bottomRightRadius'],
        borderImage: ['border.image'],
        borderImageSource: ['border.imageSource'],
        borderImageSlice: ['border.imageSlice'],
        borderImageRepeat: ['border.imageRepeat'],

        shadowColor: ['shadow.color'],
        shadowOpacity: ['shadow.opacity'],
        shadowBlur: ['shadow.blur'],
        shadowRadius: ['shadow.spread', 'shadow.radius'],
        boxShadow: ['effects.boxShadow', 'shadow.css'],
        dropShadow: ['effects.dropShadow'],
        innerShadow: ['effects.innerShadow'],
        glow: ['effects.glow'],
        glowColor: ['effects.glowColor'],
        glowIntensity: ['effects.glowIntensity'],
        opacity: ['effects.opacity'],
        blendMode: ['effects.blendMode'],
        filter: ['effects.filter.css'],
        blur: ['effects.filter.blur'],
        brightness: ['effects.filter.brightness'],
        contrast: ['effects.filter.contrast'],
        saturate: ['effects.filter.saturate'],
        hueRotate: ['effects.filter.hueRotate'],
        invert: ['effects.filter.invert'],
        sepia: ['effects.filter.sepia'],
        grayscale: ['effects.filter.grayscale'],

        image: ['image.src', 'src'],
        fit: ['objectFit', 'image.fit'],
        imageFit: ['image.fit', 'objectFit'],
        imageAlign: ['objectPosition'],
        imagePosition: ['image.position', 'objectPosition'],
        imageRepeat: ['image.repeat'],
        imageSize: ['image.size'],
        imageMode: ['image.mode'],
        imageOpacity: ['image.opacity'],
        imageBlendMode: ['image.blendMode'],
        imageFilter: ['image.filter.css'],
        imageBlur: ['image.filter.blur'],
        imageBrightness: ['image.filter.brightness'],
        imageContrast: ['image.filter.contrast'],
        imageSaturate: ['image.filter.saturate'],
        imageHueRotate: ['image.filter.hueRotate'],
        images: ['slideshow.images', 'image.slideshow.images'],
        imageAnimation: ['image.slideshow.enabled'],
        animationDuration: ['slideshow.duration', 'image.slideshow.duration'],
        animationMode: ['slideshow.mode', 'image.slideshow.mode'],
        fallbackImage: ['fallback.src', 'fallback'],
        iconLibrary: ['icon.library'],
        pressedImage: ['states.pressed.src'],
        rolloverImage: ['states.hover.src'],
        disabledImage: ['states.disabled.src', 'icons.disabled'],
        checkedImage: ['icons.checked'],
        uncheckedImage: ['icons.unchecked'],
        indeterminateImage: ['icons.indeterminate'],

        url: ['src'],
        htmlBody: ['html'],
        xcon: ['src'],
        parameter: ['params'],

        views: ['slides'],
        autoScroll: ['autoplay.enabled'],
        autoPlay: ['autoplay.enabled'],
        duration: ['autoplay.interval', 'slideshow.duration'],
        interval: ['autoplay.interval'],
        loop: ['autoplay.loop'],
        rolling: ['autoplay.rolling'],
        indicatorColor: ['indicator.color'],
        bannerChrome: ['variant'],
        bannerVariant: ['variant'],

        buttonAppearance: ['appearance'],
        alButtonSegment: ['segment'],
        alButtonSplit: ['split'],
        alButtonLayout: ['layout'],
        alButtonLayoutGap: ['layoutGap'],
        sliderLabel: ['label'],
        progressLabel: ['label'],
        switchTitle: ['title'],
        switchSubtitle: ['subtitle'],
        onText: ['labels.on'],
        offText: ['labels.off'],
        showTicks: ['ticks'],
        showSliderLabels: ['showLabels'],
        progressFillVariant: ['variant'],
        spinnerType: ['variant'],
        alertType: ['severity'],
        content: ['text', 'body'],
        closeOnBackdrop: ['backdropClose'],
        toggleAriaLabel: ['toggleLabel'],
        selectVariant: ['variant'],
        tabs: ['items'],
        activeTab: ['activeIndex'],
        tabPosition: ['position'],
        headerLayout: ['tabsLayout'],
        groupName: ['group'],
        checkboxVariant: ['variant'],
        checkboxAppearance: ['appearance'],
        radioVariant: ['variant'],
        strokeWidth: ['weight'],
        spacing: ['gap'],

        rowHeight: ['itemSize.height'],
        rowWidth: ['itemSize.width'],
        offsetX: ['offset.x', 'offset.0'],
        offsetY: ['offset.y', 'offset.1'],
        separatorStyle: ['separator.style'],
        separatorColor: ['separator.color'],
        separatorHeight: ['separator.height', 'separator.size'],
        separatorWidth: ['separator.width', 'separator.size'],
        selectionStyle: ['selection.style'],
        selectionColor: ['selection.color'],
        cellLayout: ['templates.cell', 'cellTemplate'],
        cellTemplate: ['templates.cell', 'cellLayout'],
        dummyLayout: ['templates.placeholder'],
        layoutSelector: ['templates.selector'],

        backgroundGradient: ['background.gradient'],
        gradientType: ['background.gradientType'],
        gradientDirection: ['background.gradientDirection'],
        gradientColors: ['background.gradientColors'],
        gradientStops: ['background.gradientStops'],
        backgroundPattern: ['background.pattern'],
        patternSize: ['background.patternSize'],
        patternColor: ['background.patternColor'],
        patternOpacity: ['background.patternOpacity'],

        rotate: ['transform.rotate'],
        scale: ['transform.scale'],
        scaleX: ['transform.scaleX'],
        scaleY: ['transform.scaleY'],
        translateX: ['transform.translateX'],
        translateY: ['transform.translateY']
    };

    function isObject(value) {
        return value !== null && typeof value === 'object';
    }

    function isXconLike(value) {
        return isObject(value) && typeof value.get === 'function';
    }

    function hasKey(source, key) {
        if (!isObject(source)) return false;
        if (typeof source.contains === 'function') return source.contains(key);
        return Object.prototype.hasOwnProperty.call(source, key);
    }

    function getKey(source, key) {
        if (!isObject(source)) return MISSING;
        if (typeof source.get === 'function') {
            return hasKey(source, key) ? source.get(key) : MISSING;
        }
        return hasKey(source, key) ? source[key] : MISSING;
    }

    function readPath(source, path) {
        const parts = String(path).split('.');
        let current = source;

        for (const part of parts) {
            const value = getKey(current, part);
            if (value === MISSING) return MISSING;
            current = value;
        }

        return current;
    }

    function readAny(source, paths) {
        for (const path of paths) {
            const value = readPath(source, path);
            if (value !== MISSING && value !== undefined && value !== null) return value;
        }
        return MISSING;
    }

    function read(source, key, defaultValue = null) {
        const direct = readPath(source, key);
        if (direct !== MISSING && direct !== undefined && direct !== null) {
            return normalizeSpecialValue(source, key, direct, defaultValue);
        }

        if (key === 'fit') {
            const publicFit = readAny(source, ['objectFit', 'image.fit']);
            if (publicFit !== MISSING) return publicObjectFitToRendererFit(publicFit);
        }

        if (key === 'imageAlign') {
            const publicPosition = readAny(source, ['objectPosition', 'image.position']);
            if (publicPosition !== MISSING) return publicObjectPositionToRendererAlign(publicPosition);
        }

        const aliases = propAliases[key] || [];
        const aliased = readAny(source, aliases);
        if (aliased !== MISSING) {
            return normalizeSpecialValue(source, key, aliased, defaultValue);
        }

        if (key === 'autoScroll') {
            const autoplay = readPath(source, 'autoplay');
            if (typeof autoplay === 'boolean') return autoplay;
        }

        if (key === 'animation' && sourceComponentType(source) === 'image') {
            const enabled = readPath(source, 'slideshow.enabled');
            if (enabled !== MISSING) return enabled;
        }

        if (key === 'checked' && sourceComponentType(source) === 'checkbox') {
            const value = readPath(source, 'value');
            if (value !== MISSING) return String(value) === 'checked';
        }

        if (key === 'state' && sourceComponentType(source) === 'checkbox') {
            const value = readPath(source, 'value');
            if (value !== MISSING) return value;
        }

        if (key === 'indeterminate' && sourceComponentType(source) === 'checkbox') {
            const value = readPath(source, 'value');
            if (value !== MISSING) return String(value) === 'indeterminate';
        }

        if (key === 'activeTab') {
            const activeId = readPath(source, 'activeId');
            const items = readPath(source, 'items');
            const index = findIndexById(items, activeId);
            if (index >= 0) return index;
        }

        if (key === 'duration') {
            const interval = readAny(source, ['autoplay.interval', 'interval']);
            if (interval !== MISSING) return interval;
        }

        if (key === 'indicator') {
            const visible = readAny(source, ['indicator.visible', 'indicator.show']);
            if (visible !== MISSING) return visible;
        }

        return defaultValue;
    }

    function normalizeSpecialValue(source, key, value, defaultValue) {
        const type = sourceComponentType(source);

        if (key === 'font' && isObject(value)) {
            const family = readPath(value, 'family');
            return family !== MISSING ? family : defaultValue;
        }

        if (key === 'border' && isObject(value)) {
            const visible = readAny(source, ['border.visible', 'border.show']);
            if (visible !== MISSING) return normalizeVisibilityFlag(visible, visible);

            const hasStroke =
                readAny(source, ['border.width', 'border.style', 'border.color']) !== MISSING;
            if (hasStroke) {
                return type === 'image' ? borderGroupToCss(source) : true;
            }
            return false;
        }

        if (/^border(Top|Right|Bottom|Left)$/.test(key) && isObject(value) && !Array.isArray(value)) {
            const visible = readAny(value, ['visible', 'show', 'enabled']);
            if (visible !== MISSING && normalizeVisibilityFlag(visible, visible) === false) return 0;
            const width = readPath(value, 'width');
            if (width !== MISSING) return width;
            return visible !== MISSING ? 1 : defaultValue;
        }

        if (key === 'shadow' && isObject(value) && !Array.isArray(value)) {
            const css = readAny(source, ['shadow.css', 'effects.boxShadow']);
            if (css !== MISSING) return expandThemeTokenAliases(css);

            const visible = readAny(source, ['shadow.visible', 'shadow.show', 'shadow.enabled']);
            if (visible !== MISSING) {
                return normalizeVisibilityFlag(visible, visible);
            }

            const hasEffect =
                readAny(source, ['shadow.color', 'shadow.opacity', 'shadow.blur', 'shadow.spread', 'shadow.radius']) !== MISSING;
            return hasEffect ? true : defaultValue;
        }

        if (key === 'indicator' && isObject(value) && !Array.isArray(value)) {
            const visible = readAny(source, ['indicator.visible', 'indicator.show']);
            return visible !== MISSING ? visible : defaultValue;
        }

        if (key === 'icon' && isObject(value) && !Array.isArray(value)) {
            const name = readPath(value, 'name');
            return name !== MISSING ? name : defaultValue;
        }

        if (key === 'image' && isObject(value) && !Array.isArray(value)) {
            const src = readPath(value, 'src');
            return src !== MISSING ? src : defaultValue;
        }

        if (key === 'scroll' && type === 'textView') {
            return normalizeTextViewScroll(value);
        }

        if (key === 'scrollbarVisible') {
            return normalizeScrollbarVisible(value);
        }

        if (key === 'secureTextEntry') {
            return String(value).toLowerCase() === 'password';
        }

        if (key === 'direction' && type === 'stack') {
            return normalizeStackDirectionForRenderer(value);
        }

        if (key === 'progressFillVariant') {
            return normalizeProgressVariantForRenderer(value);
        }

        if (key === 'defaultOpen' && type === 'accordion') {
            return accordionDefaultOpenToRenderer(source, value);
        }

        if (key === 'spinnerType') {
            return normalizeSpinnerVariantForRenderer(value);
        }

        if (key === 'html' && type === 'shape') {
            const renderHtml = readPath(source, 'renderHtml');
            if (renderHtml === true || renderHtml === 'true') {
                const text = readPath(source, 'text');
                return text !== MISSING ? text : defaultValue;
            }
            return defaultValue;
        }

        if (key === 'transform' && isObject(value) && !Array.isArray(value)) {
            return defaultValue;
        }

        if (key === 'type') return normalizeComponentType(value);

        return value;
    }

    function sourceComponentType(source) {
        const raw = readPath(source, 'type');
        return raw === MISSING ? '' : toPublicComponentType(raw);
    }

    function findIndexById(items, activeId) {
        if (activeId === MISSING || activeId === undefined || activeId === null) return -1;
        const list = Array.isArray(items)
            ? items
            : isXconLike(items) && Array.isArray(items.valueList)
                ? items.valueList
                : [];
        return list.findIndex((item) => {
            const id = isObject(item) ? readPath(item, 'id') : MISSING;
            return id !== MISSING && String(id) === String(activeId);
        });
    }

    function toArray(value) {
        if (Array.isArray(value)) return value;
        if (isXconLike(value) && Array.isArray(value.valueList)) return value.valueList;
        return [];
    }

    function accordionDefaultOpenToRenderer(source, value) {
        const list = toArray(value);
        if (list.every((item) => typeof item === 'number')) return value;
        const items = toArray(readPath(source, 'items'));
        return list
            .map((id) => items.findIndex((item) => {
                const itemId = isObject(item) ? readPath(item, 'id') : MISSING;
                return itemId !== MISSING && String(itemId) === String(id);
            }))
            .filter((index) => index >= 0);
    }

    function accordionDefaultOpenToPublic(node, value) {
        const list = toArray(value);
        if (!list.every((item) => typeof item === 'number')) return value;
        const items = toArray(nodeValue(node, 'items'));
        const ids = list
            .map((index) => {
                const item = items[index];
                const id = isObject(item) ? readPath(item, 'id') : MISSING;
                return id === MISSING ? null : id;
            })
            .filter((id) => id !== null);
        return ids.length > 0 ? ids : value;
    }

    function toNumber(value, fallback) {
        if (value === undefined || value === null || value === '') return fallback;
        const next = Number(value);
        return Number.isFinite(next) ? next : fallback;
    }

    function toParts(value) {
        if (Array.isArray(value)) return value;
        if (isXconLike(value) && Array.isArray(value.valueList)) return value.valueList;
        if (typeof value === 'string') {
            return value
                .trim()
                .split(/[,\s]+/)
                .filter(Boolean);
        }
        return [];
    }

    function normalizeRect(value, fallback) {
        const base = fallback || { x: 0, y: 0, width: 100, height: 30 };

        if (isObject(value) && !Array.isArray(value) && !isXconLike(value)) {
            return {
                x: toNumber(value.x, base.x),
                y: toNumber(value.y, base.y),
                width: toNumber(value.width != null ? value.width : value.w, base.width),
                height: toNumber(value.height != null ? value.height : value.h, base.height)
            };
        }

        if (isXconLike(value)) {
            const x = readAny(value, ['x']);
            const y = readAny(value, ['y']);
            const width = readAny(value, ['width', 'w']);
            const height = readAny(value, ['height', 'h']);
            if (x !== MISSING || y !== MISSING || width !== MISSING || height !== MISSING) {
                return {
                    x: toNumber(x === MISSING ? undefined : x, base.x),
                    y: toNumber(y === MISSING ? undefined : y, base.y),
                    width: toNumber(width === MISSING ? undefined : width, base.width),
                    height: toNumber(height === MISSING ? undefined : height, base.height)
                };
            }
        }

        const parts = toParts(value);
        return {
            x: toNumber(parts[0], base.x),
            y: toNumber(parts[1], base.y),
            width: toNumber(parts[2], base.width),
            height: toNumber(parts[3], base.height)
        };
    }

    function normalizeSpacing(value) {
        const parts = toParts(value).map((part) => toNumber(part, 0));

        if (typeof value === 'number') {
            return { top: value, right: value, bottom: value, left: value };
        }

        if (parts.length === 1) {
            return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
        }

        if (parts.length === 2) {
            return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
        }

        if (parts.length === 3) {
            return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
        }

        if (parts.length >= 4) {
            return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
        }

        return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    function normalizeSize(value) {
        if (isObject(value) && !Array.isArray(value)) {
            const width = readPath(value, 'width');
            const height = readPath(value, 'height');
            return {
                width: width === MISSING ? undefined : toNumber(width, undefined),
                height: height === MISSING ? undefined : toNumber(height, undefined)
            };
        }

        const parts = toParts(value);
        return {
            width: parts.length > 0 ? toNumber(parts[0], undefined) : undefined,
            height: parts.length > 1 ? toNumber(parts[1], undefined) : undefined
        };
    }

    function expandThemeTokenAliases(value) {
        if (value === undefined || value === null) return value;
        return String(value).replace(themeTokenAliasPattern, (_match, prefix, token) => `${prefix}var(--${token})`);
    }

    function normalizeColor(color, alpha = null) {
        if (!color) return null;

        const raw = String(color).trim();
        const themed = expandThemeTokenAliases(raw);
        if (themed !== raw) return themed;

        if (
            raw.startsWith('#') ||
            raw.startsWith('rgb(') ||
            raw.startsWith('rgba(') ||
            raw.startsWith('hsl(') ||
            raw.startsWith('hsla(') ||
            raw.startsWith('var(') ||
            raw === 'transparent' ||
            /^[a-zA-Z]+$/.test(raw)
        ) {
            return raw;
        }

        const parts = raw.split(',').map((part) => Number(part.trim()));
        if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
            const nextAlpha = alpha !== null ? alpha : (Number.isFinite(parts[3]) ? parts[3] / 255 : 1);
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${nextAlpha})`;
        }

        return raw;
    }

    function normalizeObjectFit(value, fromLegacy = true) {
        const raw = String(value || '').trim();
        if (!raw) return raw;
        const lower = raw.toLowerCase();
        if (!fromLegacy) return lower;
        const legacyMap = {
            auto: 'contain',
            stretch: 'fill',
            fit: 'contain',
            fill: 'cover',
            zoom: 'cover',
            none: 'none',
            center: 'none',
            tile: 'none',
            contain: 'contain',
            cover: 'cover',
            'scale-down': 'scale-down'
        };
        return legacyMap[lower] || raw;
    }

    function normalizeObjectPosition(value, fromLegacy = true) {
        const raw = String(value || '').trim();
        if (!raw) return raw;
        if (!fromLegacy) return raw;
        const legacyMap = {
            topleft: 'top left',
            topcenter: 'top center',
            topright: 'top right',
            middleleft: 'center left',
            middlecenter: 'center',
            middleright: 'center right',
            bottomleft: 'bottom left',
            bottomcenter: 'bottom center',
            bottomright: 'bottom right',
            center: 'center'
        };
        return legacyMap[raw.toLowerCase()] || raw;
    }

    function publicObjectFitToRendererFit(value) {
        const raw = String(value || '').trim().toLowerCase();
        const map = {
            fill: 'stretch',
            contain: 'contain',
            cover: 'cover',
            none: 'none',
            'scale-down': 'scale-down'
        };
        return map[raw] || value;
    }

    function publicObjectPositionToRendererAlign(value) {
        const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const map = {
            'top left': 'topleft',
            'top center': 'topcenter',
            'top right': 'topright',
            'center left': 'middleleft',
            center: 'center',
            'center center': 'middlecenter',
            'center right': 'middleright',
            'bottom left': 'bottomleft',
            'bottom center': 'bottomcenter',
            'bottom right': 'bottomright'
        };
        return map[raw] || value;
    }

    function normalizeTextViewScroll(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'auto' || raw === 'scroll') return 'vertical';
        if (raw === 'hidden' || raw === 'clip') return 'none';
        return value;
    }

    function normalizeScrollbarVisible(value) {
        if (typeof value === 'boolean') return value;
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'hidden' || raw === 'none' || raw === 'false') return false;
        if (raw === 'auto' || raw === 'visible' || raw === 'true') return true;
        return false;
    }

    function normalizeVisibilityFlag(value, fallback = value) {
        if (typeof value === 'boolean') return value;
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off' || raw === 'none' || raw === 'hidden') {
            return false;
        }
        if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on' || raw === 'visible' || raw === 'show') {
            return true;
        }
        return fallback;
    }

    function normalizeCssLength(value, fallback = '0') {
        if (value === undefined || value === null || value === '') return fallback;
        if (typeof value === 'number') return `${value}px`;
        const raw = String(value).trim();
        if (/^-?\d+(?:\.\d+)?$/.test(raw)) return `${raw}px`;
        return raw;
    }

    function borderGroupToCss(source) {
        const width = readAny(source, ['border.width']);
        const style = readAny(source, ['border.style']);
        const color = readAny(source, ['border.color']);
        return `${normalizeCssLength(width === MISSING ? 1 : width, '1px')} ${style === MISSING ? 'solid' : style} ${color === MISSING ? 'currentColor' : normalizeColor(color)}`;
    }

    function normalizeStackDirectionForRenderer(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'column' || raw === 'vertical') return 'vertical';
        if (raw === 'row' || raw === 'horizontal') return 'horizontal';
        return value;
    }

    function normalizeStackDirectionForPublic(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'vertical') return 'column';
        if (raw === 'horizontal') return 'row';
        return value;
    }

    function normalizeProgressVariantForRenderer(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'default') return 'a';
        return value;
    }

    function normalizeProgressVariantForPublic(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'a') return 'default';
        return value;
    }

    function normalizeSpinnerVariantForRenderer(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (raw === 'border') return 'border';
        if (raw === 'ring') return 'border';
        if (raw === 'pulse') return 'grow';
        return value;
    }

    function normalizeComponentType(type) {
        const raw = String(type || '').trim();
        return componentTypeAliases[raw] || raw;
    }

    function toPublicComponentType(type) {
        const raw = String(type || '').trim();
        if (raw === 'xForm') return 'form';
        if (raw === 'xList') return 'list';
        return raw;
    }

    function createXconLike(host) {
        if (host && typeof host.constructor === 'function') {
            return new host.constructor();
        }
        return {};
    }

    function setNodeValue(node, key, value) {
        if (isXconLike(node) && typeof node.set === 'function') node.set(key, value);
        else if (isObject(node)) node[key] = value;
    }

    function removeNodeValue(node, key) {
        if (isXconLike(node) && typeof node.remove === 'function') node.remove(key);
        else if (isObject(node)) delete node[key];
    }

    function nodeContains(node, key) {
        return hasKey(node, key);
    }

    function nodeValue(node, key) {
        const value = getKey(node, key);
        return value === MISSING ? undefined : value;
    }

    function moveNodeValue(node, from, to) {
        if (!nodeContains(node, from) || nodeContains(node, to)) return;
        setNodeValue(node, to, nodeValue(node, from));
        removeNodeValue(node, from);
    }

    function moveNodeValueToGroup(node, from, group, to) {
        if (!nodeContains(node, from) || nodeContains(group, to)) return;
        setGroupValue(group, to, nodeValue(node, from));
        removeNodeValue(node, from);
    }

    function setGroupValue(group, key, value) {
        if (value === undefined || value === null) return;
        setNodeValue(group, key, value);
    }

    function groupCount(group) {
        if (!group) return 0;
        if (typeof group.count === 'number') return group.count;
        return Object.keys(group).length;
    }

    function getOrCreateGroup(node, key) {
        const current = nodeValue(node, key);
        if (isObject(current) && typeof current !== 'string' && !Array.isArray(current)) {
            return current;
        }
        return createXconLike(node);
    }

    function parseRectValue(value) {
        if (typeof value !== 'string') return value;
        const parts = value.split(',').map((part) => Number(part.trim()));
        return parts.length === 4 && parts.every(Number.isFinite) ? parts : value;
    }

    function parseSizeValue(value) {
        if (typeof value !== 'string') return value;
        const parts = value.split(',').map((part) => Number(part.trim()));
        return parts.length === 2 && parts.every(Number.isFinite) ? parts : value;
    }

    function parseSpacingValue(value) {
        if (typeof value !== 'string') return value;
        if (!value.includes(',')) {
            const numeric = Number(value.trim());
            return Number.isFinite(numeric) ? numeric : value;
        }
        const parts = value.split(',').map((part) => Number(part.trim()));
        return (parts.length === 2 || parts.length === 4) && parts.every(Number.isFinite) ? parts : value;
    }

    function nodeEntries(node) {
        if (!isObject(node)) return [];
        if (isXconLike(node) && typeof node[Symbol.iterator] === 'function') {
            return Array.from(node);
        }
        return Object.keys(node).map((key) => ({ key, value: node[key] }));
    }

    function hasComponentChild(node) {
        return nodeEntries(node).some(({ value }) => {
            return isObject(value) && nodeContains(value, 'type');
        });
    }

    function migrateItemSize(node) {
        const itemSize = getOrCreateGroup(node, 'itemSize');
        moveNodeValueToGroup(node, 'rowHeight', itemSize, 'height');
        moveNodeValueToGroup(node, 'rowWidth', itemSize, 'width');
        if (groupCount(itemSize) > 0) setNodeValue(node, 'itemSize', itemSize);
    }

    function removeViewerOnlyProps(node) {
        [
            'hidenavbar', 'hidebackbtn', 'modal', 'closable', 'triggers', 'actions',
            'actionRef', 'dataSourceRef', 'backend', 'database', 'auth', 'storage', 'server',
            'requestPayload', 'successResult', 'failureCases', 'requiredPermission',
            'validStatuses', 'serverDerived', 'onClick_ref', 'onClickRef',
            'onCreate', 'onLoad', 'onUnload', 'onShowEffect', 'onHideEffect',
            'onPause', 'onResume', 'onClick', 'onTextChanged', 'onBeginEdit',
            'onEndEdit', 'onKeyDown', 'onKeyUp', 'onMaxLength', 'onEnter',
            'onCheckedChanged', 'onChange', 'onChecked', 'onUnchecked',
            'onIndeterminate', 'cellAction', 'dummyAction', 'onRowSelected',
            'onRowUnSelected', 'onScrollStart', 'onScrollEnd',
            'easySelect', 'easySelectAction', 'deleteAction',
            'itemEventPropagation', 'allowCellEvents'
        ].forEach((key) => removeNodeValue(node, key));

        nodeEntries(node)
            .map(({ key }) => key)
            .filter((key) => /_ref$/i.test(key) || /ActionRef$/i.test(key))
            .forEach((key) => removeNodeValue(node, key));
    }

    function toPublicBoolean(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    }

    function normalizeBooleanProps(node) {
        [
            'enabled', 'visible', 'readonly', 'required', 'multiple', 'controls',
            'autoplay', 'loop', 'muted', 'animated', 'showValue', 'ticks',
            'showText', 'showIcon', 'showCloseButton', 'backdropClose',
            'dismissible', 'showToggle', 'showStrength', 'showCharCount',
            'showPreview', 'showHex', 'showTicks', 'checked'
        ].forEach((key) => {
            if (nodeContains(node, key)) setNodeValue(node, key, toPublicBoolean(nodeValue(node, key)));
        });
    }

    function migrateXCON(node) {
        if (Array.isArray(node)) {
            node.forEach(migrateXCON);
            return node;
        }

        if (!isObject(node)) return node;

        if (isXconLike(node) && typeof node[Symbol.iterator] === 'function') {
            const entries = Array.from(node);
            for (const entry of entries) migrateXCON(entry.value);
        } else {
            for (const key of Object.keys(node)) migrateXCON(node[key]);
        }

        const rawType = nodeValue(node, 'type');
        const type = rawType ? toPublicComponentType(rawType) : rawType;
        if (type && type !== rawType) setNodeValue(node, 'type', type);

        const componentTypes = {
            form: true,
            list: true,
            label: true,
            button: true,
            textField: true,
            textView: true,
            panel: true,
            checkbox: true,
            radioButton: true,
            image: true,
            videoView: true,
            webView: true,
            banner: true,
            frame: true,
            import: true,
            shape: true,
            passwordField: true,
            textarea: true,
            select: true,
            slider: true,
            switch: true,
            progressBar: true,
            spinner: true,
            badge: true,
            avatar: true,
            icon: true,
            divider: true,
            alert: true,
            tooltip: true,
            modal: true,
            tabs: true,
            accordion: true,
            grid: true,
            flexBox: true,
            stack: true,
            spacer: true,
            card: true,
            colorPicker: true,
            datePicker: true,
            timePicker: true,
            filePicker: true,
            imagePicker: true,
            rating: true,
            searchBar: true,
            treeView: true,
            carousel: true,
            gallery: true,
            qrCode: true,
            barcode: true,
            signaturePad: true,
            chart: true,
            codeEditor: true,
            richEditor: true,
            dataViz: true,
            flipbook: true,
            networkDiagram: true,
            map: true,
            calendar: true,
            fileUpload: true,
            dataTable: true,
            mediaPlayer: true,
            threeDViewer: true
        };
        if (!componentTypes[type]) {
            if (hasComponentChild(node) && (nodeContains(node, 'rowHeight') || nodeContains(node, 'rowWidth'))) {
                migrateItemSize(node);
            }
            return node;
        }

        removeViewerOnlyProps(node);
        normalizeBooleanProps(node);

        if (nodeContains(node, 'pos')) setNodeValue(node, 'pos', parseRectValue(nodeValue(node, 'pos')));
        if (nodeContains(node, 'contentSize')) setNodeValue(node, 'contentSize', parseSizeValue(nodeValue(node, 'contentSize')));
        if (nodeContains(node, 'padding')) setNodeValue(node, 'padding', parseSpacingValue(nodeValue(node, 'padding')));
        if (nodeContains(node, 'margin')) setNodeValue(node, 'margin', parseSpacingValue(nodeValue(node, 'margin')));

        moveNodeValue(node, 'bgColor', 'backgroundColor');
        moveNodeValue(node, 'bgImage', 'backgroundImage');
        moveNodeValue(node, 'fgColor', 'color');
        moveNodeValue(node, 'textColor', 'color');
        moveNodeValue(node, 'binding', 'bind');
        moveNodeValue(node, 'mode', 'inputType');
        if (nodeValue(node, 'secureTextEntry') === true || nodeValue(node, 'secureTextEntry') === 'true') {
            setNodeValue(node, 'inputType', 'password');
            removeNodeValue(node, 'secureTextEntry');
        }
        moveNodeValue(node, 'textVAlign', 'textVerticalAlign');
        moveNodeValue(node, 'truncate', 'overflow');
        moveNodeValue(node, 'truncateLength', 'overflowLength');
        if (nodeContains(node, 'fit') && !nodeContains(node, 'objectFit')) {
            const legacyFit = nodeValue(node, 'fit');
            setNodeValue(node, 'objectFit', normalizeObjectFit(legacyFit, true));
            if (String(legacyFit || '').toLowerCase() === 'center' && !nodeContains(node, 'objectPosition')) {
                setNodeValue(node, 'objectPosition', 'center');
            }
            removeNodeValue(node, 'fit');
        }
        if (nodeContains(node, 'imageAlign') && !nodeContains(node, 'objectPosition')) {
            setNodeValue(node, 'objectPosition', normalizeObjectPosition(nodeValue(node, 'imageAlign'), true));
            removeNodeValue(node, 'imageAlign');
        }
        moveNodeValue(node, 'buttonAppearance', 'appearance');
        moveNodeValue(node, 'alButtonSegment', 'segment');
        moveNodeValue(node, 'alButtonSplit', 'split');
        moveNodeValue(node, 'alButtonLayout', 'layout');
        moveNodeValue(node, 'alButtonLayoutGap', 'layoutGap');
        moveNodeValue(node, 'sliderLabel', 'label');
        moveNodeValue(node, 'progressLabel', 'label');
        moveNodeValue(node, 'switchTitle', 'title');
        moveNodeValue(node, 'switchSubtitle', 'subtitle');
        moveNodeValue(node, 'showTicks', 'ticks');
        moveNodeValue(node, 'showSliderLabels', 'showLabels');
        moveNodeValue(node, 'alertType', 'severity');
        moveNodeValue(node, 'closeOnBackdrop', 'backdropClose');
        moveNodeValue(node, 'toggleAriaLabel', 'toggleLabel');
        moveNodeValue(node, 'selectVariant', 'variant');
        moveNodeValue(node, 'groupName', 'group');
        moveNodeValue(node, 'headerLayout', 'tabsLayout');
        moveNodeValue(node, 'tabPosition', 'position');
        moveNodeValue(node, 'tabs', 'items');
        moveNodeValue(node, 'activeTab', 'activeIndex');
        moveNodeValue(node, 'parameter', 'params');
        moveNodeValue(node, 'spacing', 'gap');

        const labels = getOrCreateGroup(node, 'labels');
        moveNodeValueToGroup(node, 'onText', labels, 'on');
        moveNodeValueToGroup(node, 'offText', labels, 'off');
        if (groupCount(labels) > 0) setNodeValue(node, 'labels', labels);

        if (type !== 'rating') {
            const icon = getOrCreateGroup(node, 'icon');
            if (typeof nodeValue(node, 'icon') === 'string') {
                setGroupValue(icon, 'name', nodeValue(node, 'icon'));
                removeNodeValue(node, 'icon');
            }
            moveNodeValueToGroup(node, 'iconLibrary', icon, 'library');
            if (groupCount(icon) > 0) setNodeValue(node, 'icon', icon);
        }

        const prefix = getOrCreateGroup(node, 'prefix');
        moveNodeValueToGroup(node, 'prefixIcon', prefix, 'icon');
        moveNodeValueToGroup(node, 'prefixText', prefix, 'text');
        if (groupCount(prefix) > 0) setNodeValue(node, 'prefix', prefix);

        const suffix = getOrCreateGroup(node, 'suffix');
        moveNodeValueToGroup(node, 'suffixIcon', suffix, 'icon');
        moveNodeValueToGroup(node, 'suffixText', suffix, 'text');
        moveNodeValueToGroup(node, 'clearButton', suffix, 'clear');
        if (groupCount(suffix) > 0) setNodeValue(node, 'suffix', suffix);

        moveNodeValue(node, 'postButton', 'trailingButton');

        const font = getOrCreateGroup(node, 'font');
        const currentFont = nodeValue(node, 'font');
        if (typeof currentFont === 'string') setGroupValue(font, 'family', currentFont);
        if (!nodeContains(node, 'textAlign') && nodeContains(font, 'align')) {
            setNodeValue(node, 'textAlign', nodeValue(font, 'align'));
            removeNodeValue(font, 'align');
        }
        if (!nodeContains(node, 'textVerticalAlign') && nodeContains(font, 'valign')) {
            setNodeValue(node, 'textVerticalAlign', nodeValue(font, 'valign'));
            removeNodeValue(font, 'valign');
        }
        if (!nodeContains(node, 'textVerticalAlign') && nodeContains(font, 'verticalAlign')) {
            setNodeValue(node, 'textVerticalAlign', nodeValue(font, 'verticalAlign'));
            removeNodeValue(font, 'verticalAlign');
        }
        setGroupValue(font, 'size', nodeValue(node, 'fontSize'));
        setGroupValue(font, 'weight', nodeValue(node, 'fontWeight'));
        setGroupValue(font, 'style', nodeValue(node, 'fontStyle'));
        setGroupValue(font, 'decoration', nodeValue(node, 'textDecoration'));
        setGroupValue(font, 'lineHeight', nodeValue(node, 'lineHeight'));
        setGroupValue(font, 'letterSpacing', nodeValue(node, 'letterSpacing'));
        setGroupValue(font, 'bold', nodeValue(node, 'bold'));
        setGroupValue(font, 'italic', nodeValue(node, 'italic'));
        setGroupValue(font, 'underline', nodeValue(node, 'underline'));
        setGroupValue(font, 'strikethrough', nodeValue(node, 'strikethrough'));
        setGroupValue(font, 'autoFit', nodeValue(node, 'autoAdjustFontSize'));
        ['fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'lineHeight', 'letterSpacing', 'bold', 'italic', 'underline', 'strikethrough', 'autoAdjustFontSize'].forEach((key) => removeNodeValue(node, key));
        if (groupCount(font) > 0) setNodeValue(node, 'font', font);

        const border = getOrCreateGroup(node, 'border');
        const currentBorder = nodeValue(node, 'border');
        if (currentBorder !== undefined && (typeof currentBorder !== 'object' || currentBorder === null)) {
            setGroupValue(border, 'visible', currentBorder);
        }
        setGroupValue(border, 'width', nodeValue(node, 'borderWidth'));
        setGroupValue(border, 'style', nodeValue(node, 'borderStyle'));
        setGroupValue(border, 'color', nodeValue(node, 'borderColor'));
        setGroupValue(border, 'radius', nodeValue(node, 'borderRadius'));
        setGroupValue(border, 'radius', nodeValue(node, 'round'));
        setGroupValue(border, 'top', nodeValue(node, 'borderTop'));
        setGroupValue(border, 'right', nodeValue(node, 'borderRight'));
        setGroupValue(border, 'bottom', nodeValue(node, 'borderBottom'));
        setGroupValue(border, 'left', nodeValue(node, 'borderLeft'));
        setGroupValue(border, 'topLeftRadius', nodeValue(node, 'borderTopLeftRadius'));
        setGroupValue(border, 'topRightRadius', nodeValue(node, 'borderTopRightRadius'));
        setGroupValue(border, 'bottomLeftRadius', nodeValue(node, 'borderBottomLeftRadius'));
        setGroupValue(border, 'bottomRightRadius', nodeValue(node, 'borderBottomRightRadius'));
        setGroupValue(border, 'image', nodeValue(node, 'borderImage'));
        setGroupValue(border, 'imageSource', nodeValue(node, 'borderImageSource'));
        setGroupValue(border, 'imageSlice', nodeValue(node, 'borderImageSlice'));
        setGroupValue(border, 'imageRepeat', nodeValue(node, 'borderImageRepeat'));
        ['borderWidth', 'borderStyle', 'borderColor', 'borderRadius', 'round',
            'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
            'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
            'borderImage', 'borderImageSource', 'borderImageSlice', 'borderImageRepeat'].forEach((key) => removeNodeValue(node, key));
        if (groupCount(border) > 0) setNodeValue(node, 'border', border);

        const shadow = getOrCreateGroup(node, 'shadow');
        const currentShadow = nodeValue(node, 'shadow');
        if (currentShadow !== undefined && (typeof currentShadow !== 'object' || currentShadow === null)) {
            setGroupValue(shadow, 'visible', currentShadow);
        }
        setGroupValue(shadow, 'color', nodeValue(node, 'shadowColor'));
        setGroupValue(shadow, 'opacity', nodeValue(node, 'shadowOpacity'));
        setGroupValue(shadow, 'blur', nodeValue(node, 'shadowBlur'));
        setGroupValue(shadow, 'spread', nodeValue(node, 'shadowRadius'));
        ['shadowColor', 'shadowOpacity', 'shadowBlur', 'shadowRadius'].forEach((key) => removeNodeValue(node, key));
        if (groupCount(shadow) > 0) setNodeValue(node, 'shadow', shadow);

        if (type === 'button') moveNodeValue(node, 'text', 'label');
        if (type === 'button') {
            const states = getOrCreateGroup(node, 'states');
            const pressed = getOrCreateGroup(states, 'pressed');
            const hover = getOrCreateGroup(states, 'hover');
            const disabled = getOrCreateGroup(states, 'disabled');
            moveNodeValueToGroup(node, 'pressedImage', pressed, 'src');
            moveNodeValueToGroup(node, 'rolloverImage', hover, 'src');
            moveNodeValueToGroup(node, 'disabledImage', disabled, 'src');
            if (groupCount(pressed) > 0) setNodeValue(states, 'pressed', pressed);
            if (groupCount(hover) > 0) setNodeValue(states, 'hover', hover);
            if (groupCount(disabled) > 0) setNodeValue(states, 'disabled', disabled);
            if (groupCount(states) > 0) setNodeValue(node, 'states', states);
        }
        if (type === 'checkbox' || type === 'radioButton') {
            moveNodeValue(node, 'text', 'label');
            const icons = getOrCreateGroup(node, 'icons');
            moveNodeValueToGroup(node, 'checkedImage', icons, 'checked');
            moveNodeValueToGroup(node, 'uncheckedImage', icons, 'unchecked');
            moveNodeValueToGroup(node, 'indeterminateImage', icons, 'indeterminate');
            moveNodeValueToGroup(node, 'disabledImage', icons, 'disabled');
            if (groupCount(icons) > 0) setNodeValue(node, 'icons', icons);
        }
        if (type === 'checkbox') {
            if (!nodeContains(node, 'value')) {
                const state = nodeValue(node, 'state');
                const checked = nodeValue(node, 'checked');
                if (state === 'indeterminate') setNodeValue(node, 'value', 'indeterminate');
                else if (state === 'checked' || checked === true || checked === 'true') setNodeValue(node, 'value', 'checked');
                else if (state !== undefined || checked !== undefined) setNodeValue(node, 'value', 'unchecked');
            }
            removeNodeValue(node, 'checked');
            removeNodeValue(node, 'state');
            moveNodeValue(node, 'checkboxVariant', 'variant');
            moveNodeValue(node, 'checkboxAppearance', 'appearance');
        }
        if (type === 'radioButton') {
            removeNodeValue(node, 'state');
            moveNodeValue(node, 'radioVariant', 'variant');
        }
        if (type === 'textField') moveNodeValue(node, 'text', 'value');
        if (type === 'textField') {
            if (nodeValue(node, 'inputType') === 'password') removeNodeValue(node, 'secureTextEntry');
        }
        if (type === 'textView') moveNodeValue(node, 'html', 'renderHtml');
        if (type === 'textView') {
            moveNodeValue(node, 'lineNum', 'lineNumbers');
            if (nodeContains(node, 'scroll') && !nodeContains(node, 'overflow')) {
                const scroll = String(nodeValue(node, 'scroll') || '').toLowerCase();
                setNodeValue(node, 'overflow', scroll === 'none' ? 'hidden' : 'auto');
                removeNodeValue(node, 'scroll');
            }
            setNodeValue(node, 'editable', false);
        }
        if (type === 'image') moveNodeValue(node, 'image', 'src');
        if (type === 'image') {
            const slideshow = getOrCreateGroup(node, 'slideshow');
            moveNodeValueToGroup(node, 'images', slideshow, 'images');
            moveNodeValueToGroup(node, 'animation', slideshow, 'enabled');
            moveNodeValueToGroup(node, 'duration', slideshow, 'duration');
            moveNodeValueToGroup(node, 'animationMode', slideshow, 'mode');
            if (groupCount(slideshow) > 0) setNodeValue(node, 'slideshow', slideshow);
            moveNodeValue(node, 'fallbackImage', 'fallback');
        }
        if (type === 'videoView' || type === 'webView' || type === 'frame') moveNodeValue(node, 'url', 'src');
        if (type === 'frame' || type === 'import') moveNodeValue(node, 'xcon', 'src');
        if (type === 'webView') moveNodeValue(node, 'htmlBody', 'html');
        if (type === 'shape') moveNodeValue(node, 'content', 'text');
        if (type === 'shape') {
            if (nodeContains(node, 'html')) {
                if (!nodeContains(node, 'text')) setNodeValue(node, 'text', nodeValue(node, 'html'));
                setNodeValue(node, 'renderHtml', true);
                removeNodeValue(node, 'html');
            }

            const image = getOrCreateGroup(node, 'image');
            const currentImage = nodeValue(node, 'image');
            if (nodeContains(node, 'image') && (!isObject(currentImage) || Array.isArray(currentImage))) {
                setGroupValue(image, 'src', currentImage);
                removeNodeValue(node, 'image');
            }
            moveNodeValueToGroup(node, 'src', image, 'src');
            moveNodeValueToGroup(node, 'backgroundImage', image, 'src');
            moveNodeValueToGroup(node, 'imageMode', image, 'mode');
            moveNodeValueToGroup(node, 'imageFit', image, 'fit');
            moveNodeValueToGroup(node, 'objectFit', image, 'fit');
            moveNodeValueToGroup(node, 'imagePosition', image, 'position');
            moveNodeValueToGroup(node, 'objectPosition', image, 'position');
            moveNodeValueToGroup(node, 'imageRepeat', image, 'repeat');
            moveNodeValueToGroup(node, 'imageSize', image, 'size');
            moveNodeValueToGroup(node, 'imageOpacity', image, 'opacity');
            moveNodeValueToGroup(node, 'imageBlendMode', image, 'blendMode');

            const imageFilter = getOrCreateGroup(image, 'filter');
            moveNodeValueToGroup(node, 'imageFilter', imageFilter, 'css');
            moveNodeValueToGroup(node, 'imageBlur', imageFilter, 'blur');
            moveNodeValueToGroup(node, 'imageBrightness', imageFilter, 'brightness');
            moveNodeValueToGroup(node, 'imageContrast', imageFilter, 'contrast');
            moveNodeValueToGroup(node, 'imageSaturate', imageFilter, 'saturate');
            moveNodeValueToGroup(node, 'imageHueRotate', imageFilter, 'hueRotate');
            if (groupCount(imageFilter) > 0) setNodeValue(image, 'filter', imageFilter);

            const imageSlideshow = getOrCreateGroup(image, 'slideshow');
            moveNodeValueToGroup(node, 'images', imageSlideshow, 'images');
            moveNodeValueToGroup(node, 'imageAnimation', imageSlideshow, 'enabled');
            moveNodeValueToGroup(node, 'animationDuration', imageSlideshow, 'duration');
            moveNodeValueToGroup(node, 'animationMode', imageSlideshow, 'mode');
            if (groupCount(imageSlideshow) > 0) setNodeValue(image, 'slideshow', imageSlideshow);
            if (groupCount(image) > 0) setNodeValue(node, 'image', image);

            const background = getOrCreateGroup(node, 'background');
            moveNodeValueToGroup(node, 'backgroundColor', background, 'color');
            moveNodeValueToGroup(node, 'backgroundGradient', background, 'gradient');
            moveNodeValueToGroup(node, 'gradientType', background, 'gradientType');
            moveNodeValueToGroup(node, 'gradientDirection', background, 'gradientDirection');
            moveNodeValueToGroup(node, 'gradientColors', background, 'gradientColors');
            moveNodeValueToGroup(node, 'gradientStops', background, 'gradientStops');
            moveNodeValueToGroup(node, 'backgroundPattern', background, 'pattern');
            moveNodeValueToGroup(node, 'patternSize', background, 'patternSize');
            moveNodeValueToGroup(node, 'patternColor', background, 'patternColor');
            moveNodeValueToGroup(node, 'patternOpacity', background, 'patternOpacity');
            if (groupCount(background) > 0) setNodeValue(node, 'background', background);

            const effects = getOrCreateGroup(node, 'effects');
            moveNodeValueToGroup(node, 'boxShadow', effects, 'boxShadow');
            moveNodeValueToGroup(node, 'dropShadow', effects, 'dropShadow');
            moveNodeValueToGroup(node, 'innerShadow', effects, 'innerShadow');
            moveNodeValueToGroup(node, 'glow', effects, 'glow');
            moveNodeValueToGroup(node, 'glowColor', effects, 'glowColor');
            moveNodeValueToGroup(node, 'glowIntensity', effects, 'glowIntensity');
            moveNodeValueToGroup(node, 'opacity', effects, 'opacity');
            moveNodeValueToGroup(node, 'blendMode', effects, 'blendMode');

            const effectFilter = getOrCreateGroup(effects, 'filter');
            moveNodeValueToGroup(node, 'filter', effectFilter, 'css');
            moveNodeValueToGroup(node, 'blur', effectFilter, 'blur');
            moveNodeValueToGroup(node, 'brightness', effectFilter, 'brightness');
            moveNodeValueToGroup(node, 'contrast', effectFilter, 'contrast');
            moveNodeValueToGroup(node, 'saturate', effectFilter, 'saturate');
            moveNodeValueToGroup(node, 'hueRotate', effectFilter, 'hueRotate');
            moveNodeValueToGroup(node, 'invert', effectFilter, 'invert');
            moveNodeValueToGroup(node, 'sepia', effectFilter, 'sepia');
            moveNodeValueToGroup(node, 'grayscale', effectFilter, 'grayscale');
            if (groupCount(effectFilter) > 0) setNodeValue(effects, 'filter', effectFilter);
            if (groupCount(effects) > 0) setNodeValue(node, 'effects', effects);

            const transform = getOrCreateGroup(node, 'transform');
            moveNodeValueToGroup(node, 'rotate', transform, 'rotate');
            moveNodeValueToGroup(node, 'scale', transform, 'scale');
            moveNodeValueToGroup(node, 'scaleX', transform, 'scaleX');
            moveNodeValueToGroup(node, 'scaleY', transform, 'scaleY');
            moveNodeValueToGroup(node, 'translateX', transform, 'translateX');
            moveNodeValueToGroup(node, 'translateY', transform, 'translateY');
            if (groupCount(transform) > 0) setNodeValue(node, 'transform', transform);
        }
        if (type === 'frame') moveNodeValue(node, 'parameter', 'params');
        if (type === 'panel') {
            if (nodeContains(node, 'scrollbarVisible') && !nodeContains(node, 'scrollbar')) {
                setNodeValue(node, 'scrollbar', normalizeScrollbarVisible(nodeValue(node, 'scrollbarVisible')) ? 'auto' : 'hidden');
            }
            removeNodeValue(node, 'scrollbarVisible');
        }
        if (type === 'passwordField') moveNodeValue(node, 'toggleAriaLabel', 'toggleLabel');
        if (type === 'textarea') {
            if (nodeValue(node, 'rows') === 0 || nodeValue(node, 'rows') === '0') setNodeValue(node, 'rows', null);
        }
        if (type === 'select') {
            if (!nodeContains(node, 'options') && nodeContains(node, 'customOptions')) {
                setNodeValue(node, 'options', nodeValue(node, 'customOptions'));
            }
            if (!nodeContains(node, 'value') && nodeContains(node, 'customValue')) {
                setNodeValue(node, 'value', nodeValue(node, 'customValue'));
            }
            if (!nodeContains(node, 'placeholder')) {
                if (nodeContains(node, 'customPlaceholder')) setNodeValue(node, 'placeholder', nodeValue(node, 'customPlaceholder'));
                else if (nodeContains(node, 'nativePlaceholder')) setNodeValue(node, 'placeholder', nodeValue(node, 'nativePlaceholder'));
            }
            ['nativeLabel', 'customLabel', 'nativePlaceholder', 'customPlaceholder', 'customValue', 'customOptions'].forEach((key) => removeNodeValue(node, key));
        }
        if (type === 'slider') moveNodeValue(node, 'showTicks', 'ticks');
        if (type === 'switch') {
            moveNodeValue(node, 'switchTitle', 'title');
            moveNodeValue(node, 'switchSubtitle', 'subtitle');
        }
        if (type === 'progressBar') {
            if (nodeContains(node, 'progressFillVariant') && !nodeContains(node, 'variant')) {
                setNodeValue(node, 'variant', normalizeProgressVariantForPublic(nodeValue(node, 'progressFillVariant')));
                removeNodeValue(node, 'progressFillVariant');
            }
        }
        if (type === 'spinner') moveNodeValue(node, 'spinnerType', 'variant');
        if (type === 'tabs') {
            moveNodeValue(node, 'tabs', 'items');
            moveNodeValue(node, 'activeTab', 'activeIndex');
            moveNodeValue(node, 'headerLayout', 'tabsLayout');
            moveNodeValue(node, 'tabPosition', 'position');
        }
        if (type === 'accordion' && nodeContains(node, 'defaultOpen')) {
            setNodeValue(node, 'defaultOpen', accordionDefaultOpenToPublic(node, nodeValue(node, 'defaultOpen')));
        }
        if (type === 'icon') {
            moveNodeValue(node, 'strokeWidth', 'weight');
            const iconBorder = nodeValue(node, 'border');
            if (isObject(iconBorder) && nodeContains(iconBorder, 'radius') && groupCount(iconBorder) === 1) {
                setNodeValue(node, 'borderRadius', nodeValue(iconBorder, 'radius'));
                removeNodeValue(node, 'border');
            }
        }
        if (type === 'list') {
            const listBorder = nodeValue(node, 'border');
            if (isObject(listBorder) && nodeContains(listBorder, 'radius') && groupCount(listBorder) === 1) {
                setNodeValue(node, 'borderRadius', nodeValue(listBorder, 'radius'));
                removeNodeValue(node, 'border');
            }
        }
        if (type === 'card') moveNodeValue(node, 'content', 'text');
        if (type === 'stack') {
            if (nodeContains(node, 'direction')) setNodeValue(node, 'direction', normalizeStackDirectionForPublic(nodeValue(node, 'direction')));
            moveNodeValue(node, 'spacing', 'gap');
        }
        if (type === 'spacer') removeNodeValue(node, 'direction');
        if (type === 'rating') {
            const icons = getOrCreateGroup(node, 'icons');
            moveNodeValueToGroup(node, 'icon', icons, 'filled');
            moveNodeValueToGroup(node, 'emptyIcon', icons, 'empty');
            if (groupCount(icons) > 0) setNodeValue(node, 'icons', icons);
        }
        if (type === 'modal') {
            moveNodeValue(node, 'content', 'text');
            moveNodeValue(node, 'closeOnBackdrop', 'backdropClose');
        }

        if (type === 'list') {
            moveNodeValue(node, 'orientation', 'direction');
            migrateItemSize(node);
            if (!nodeContains(node, 'offset') && (nodeContains(node, 'offsetX') || nodeContains(node, 'offsetY'))) {
                setNodeValue(node, 'offset', [
                    toNumber(nodeValue(node, 'offsetX'), 0),
                    toNumber(nodeValue(node, 'offsetY'), 0)
                ]);
            }
            removeNodeValue(node, 'offsetX');
            removeNodeValue(node, 'offsetY');

            const separator = getOrCreateGroup(node, 'separator');
            setGroupValue(separator, 'style', nodeValue(node, 'separatorStyle'));
            setGroupValue(separator, 'color', nodeValue(node, 'separatorColor'));
            setGroupValue(separator, 'size', nodeValue(node, 'separatorHeight'));
            setGroupValue(separator, 'size', nodeValue(node, 'separatorWidth'));
            ['separatorStyle', 'separatorColor', 'separatorHeight', 'separatorWidth'].forEach((key) => removeNodeValue(node, key));
            if (groupCount(separator) > 0) setNodeValue(node, 'separator', separator);

            const selection = getOrCreateGroup(node, 'selection');
            setGroupValue(selection, 'style', nodeValue(node, 'selectionStyle'));
            setGroupValue(selection, 'color', nodeValue(node, 'selectionColor'));
            ['selectionStyle', 'selectionColor'].forEach((key) => removeNodeValue(node, key));
            if (groupCount(selection) > 0) setNodeValue(node, 'selection', selection);

            const templates = getOrCreateGroup(node, 'templates');
            moveNodeValueToGroup(node, 'cellLayout', templates, 'cell');
            moveNodeValueToGroup(node, 'dummyLayout', templates, 'placeholder');
            moveNodeValueToGroup(node, 'layoutSelector', templates, 'selector');
            if (groupCount(templates) > 0) setNodeValue(node, 'templates', templates);
        }

        if (type === 'banner') {
            moveNodeValue(node, 'orientation', 'direction');
            moveNodeValue(node, 'views', 'slides');
            moveNodeValue(node, 'bannerChrome', 'variant');
            moveNodeValue(node, 'bannerVariant', 'variant');

            const autoplay = getOrCreateGroup(node, 'autoplay');
            setGroupValue(autoplay, 'enabled', nodeValue(node, 'autoScroll'));
            setGroupValue(autoplay, 'interval', nodeValue(node, 'duration'));
            setGroupValue(autoplay, 'loop', nodeValue(node, 'loop'));
            setGroupValue(autoplay, 'rolling', nodeValue(node, 'rolling'));
            ['autoScroll', 'duration', 'loop', 'rolling'].forEach((key) => removeNodeValue(node, key));
            if (groupCount(autoplay) > 0) setNodeValue(node, 'autoplay', autoplay);

            const indicator = getOrCreateGroup(node, 'indicator');
            const currentIndicator = nodeValue(node, 'indicator');
            if (currentIndicator !== undefined && (typeof currentIndicator !== 'object' || currentIndicator === null)) {
                setGroupValue(indicator, 'show', currentIndicator);
            }
            setGroupValue(indicator, 'color', nodeValue(node, 'indicatorColor'));
            removeNodeValue(node, 'indicatorColor');
            if (groupCount(indicator) > 0) setNodeValue(node, 'indicator', indicator);
        }

        return node;
    }

    return {
        MISSING,
        read,
        readPath,
        hasKey,
        normalizeColor,
        expandThemeTokenAliases,
        normalizeComponentType,
        toPublicComponentType,
        normalizeRect,
        normalizeSize,
        normalizeSpacing,
        migrateXCON
    };
});
