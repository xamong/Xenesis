/**
 * XamongCode UI Components Extension System - JavaScript Implementation
 * 자몽 UI 컴포넌트 시스템의 확장 컴포넌트 구현
 * 기존 xamong-ui-components.js와 호환되는 추가 컴포넌트들
 */

// =============================================================================
// Extended Component Types (확장 컴포넌트 타입)
// =============================================================================
const ExtendedComponentType = {
    // 입력 컴포넌트
    PASSWORD_FIELD: 'passwordField',
    TEXTAREA: 'textarea',
    SELECT: 'select',
    SLIDER: 'slider',
    SWITCH: 'switch',
    COLOR_PICKER: 'colorPicker',
    DATE_PICKER: 'datePicker',
    TIME_PICKER: 'timePicker',
    FILE_PICKER: 'filePicker',
    IMAGE_PICKER: 'imagePicker',
    RATING: 'rating',
    
    // 표시 컴포넌트
    PROGRESS_BAR: 'progressBar',
    SPINNER: 'spinner',
    BADGE: 'badge',
    AVATAR: 'avatar',
    ICON: 'icon',
    DIVIDER: 'divider',
    CARD: 'card',
    ALERT: 'alert',
    TOOLTIP: 'tooltip',
    MODAL: 'modal',
    
    // 레이아웃 컴포넌트
    TABS: 'tabs',
    ACCORDION: 'accordion',
    GRID: 'grid',
    FLEX_BOX: 'flexBox',
    STACK: 'stack',
    SPACER: 'spacer',
    
    SEARCH_BAR: 'searchBar',

    // 고급 컴포넌트
    //CHART: 'chart',
    //MAP: 'map',
    //CALENDAR: 'calendar',
    //DATA_TABLE: 'dataTable',
    TREE_VIEW: 'treeView',
    CAROUSEL: 'carousel',
    
    GALLERY: 'gallery',
    QR_CODE: 'qrCode',
    BARCODE: 'barcode',
    SIGNATURE_PAD: 'signaturePad'
};

// =============================================================================
// Input Components (입력 컴포넌트)
// =============================================================================

/** XML/문자열에서 불리언 읽기 (passwordField showToggle, showStrength 등) */
function xaCoerceBool(value, defaultValue) {
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0) return false;
    return defaultValue;
}

/** component-showcase-basic-autolayout — extVariant: showcase 시 ext.html 마크업·동작 정렬 */
function xaExtIsShowcase(comp) {
    return !!(comp && comp.getValue && String(comp.getValue('extVariant', '') || '').toLowerCase() === 'showcase');
}

/** component-showcase-ext.html #22 — grid pill → grid-template-columns */
function xaExtInitGridShowcase(root, suffix) {
    if (!root || !suffix) return;
    const canvas = root.querySelector('#gridCanvas_' + suffix);
    if (!canvas) return;
    root.querySelectorAll('.grid-demo__controls .grid-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            root.querySelectorAll('.grid-demo__controls .grid-pill').forEach(function (p) {
                p.classList.remove('active');
            });
            pill.classList.add('active');
            const cols = pill.getAttribute('data-cols');
            canvas.style.gridTemplateColumns =
                cols === 'auto' ? 'repeat(auto-fill, minmax(80px, 1fr))' : 'repeat(' + cols + ', 1fr)';
        });
    });
}

/** component-showcase-ext.html #23 — flex justify / align */
function xaExtInitFlexShowcase(root, suffix) {
    if (!root || !suffix) return;
    const canvas = root.querySelector('#flexCanvas_' + suffix);
    const justify = root.querySelector('#flexJustify_' + suffix);
    const align = root.querySelector('#flexAlign_' + suffix);
    if (!canvas || !justify || !align) return;
    function update() {
        canvas.style.justifyContent = justify.value;
        canvas.style.alignItems = align.value;
    }
    justify.addEventListener('change', update);
    align.addEventListener('change', update);
    update();
}

/** component-showcase-ext.html #28 — modal open / close / backdrop */
function xaExtInitModalShowcase(root, suffix) {
    if (!root || !suffix) return;
    const backdrop = root.querySelector('#modalBackdrop_' + suffix);
    const openBtn = root.querySelector('#openModal_' + suffix);
    const closeBtn = root.querySelector('#closeModal_' + suffix);
    const cancelBtn = root.querySelector('#cancelModal_' + suffix);
    if (!backdrop) return;
    function open() {
        backdrop.classList.add('open');
    }
    function close() {
        backdrop.classList.remove('open');
    }
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) close();
    });
}

/** component-showcase-ext.html #29 — search field, results, clear (scoped) */
const XA_EXT_SHOWCASE_SEARCH_ITEMS = [
    { icon: '🔒', label: 'Password Field', type: 'Form' },
    { icon: '📄', label: 'Textarea', type: 'Form' },
    { icon: '🎚️', label: 'Slider', type: 'Form' },
    { icon: '🔘', label: 'Switch', type: 'Form' },
    { icon: '📈', label: 'Progress Bar', type: 'Feedback' },
    { icon: '👤', label: 'Avatar', type: 'Display' },
    { icon: '🃏', label: 'Card', type: 'Display' },
    { icon: '🎨', label: 'Color Picker', type: 'Picker' },
    { icon: '📅', label: 'Date Picker', type: 'Picker' },
    { icon: '🌳', label: 'Tree View', type: 'Navigation' },
    { icon: '🖼️', label: 'Gallery', type: 'Media' }
];

function xaExtSearchShowcaseRecentHtml() {
    return (
        '<div class="search-recent-label">Recent</div>' +
        '<div class="search-result-item"><span class="icon">🔒</span><span class="label">Password Field</span><span class="type">Form</span></div>' +
        '<div class="search-result-item"><span class="icon">📅</span><span class="label">Date Picker</span><span class="type">Picker</span></div>' +
        '<div class="search-divider"></div>'
    );
}

function xaExtInitSearchBarShowcase(root, suffix) {
    if (!root || !suffix) return;
    const searchOuter = root.querySelector('#searchOuter_' + suffix);
    const searchField = root.querySelector('#searchField_' + suffix);
    const searchResults = root.querySelector('#searchResults_' + suffix);
    const searchClear = root.querySelector('#searchClear_' + suffix);
    if (!searchOuter || !searchField || !searchResults || !searchClear) return;
    const items = XA_EXT_SHOWCASE_SEARCH_ITEMS;
    const recentHtml = xaExtSearchShowcaseRecentHtml();

    function onInput() {
        const q = searchField.value.trim().toLowerCase();
        searchClear.classList.toggle('show', q.length > 0);
        if (!q) {
            searchResults.classList.remove('show');
            return;
        }
        const matches = items.filter(function (i) {
            return i.label.toLowerCase().includes(q);
        });
        if (!matches.length) {
            searchResults.classList.remove('show');
            return;
        }
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(esc, 'gi');
        searchResults.innerHTML = matches
            .map(function (m) {
                const hl = m.label.replace(re, function (s) {
                    return '<mark>' + s + '</mark>';
                });
                return (
                    '<div class="search-result-item"><span class="icon">' +
                    m.icon +
                    '</span><span class="label">' +
                    hl +
                    '</span><span class="type">' +
                    m.type +
                    '</span></div>'
                );
            })
            .join('');
        searchResults.classList.add('show');
    }

    searchField.addEventListener('input', onInput);
    searchField.addEventListener('focus', function () {
        if (!searchField.value) searchResults.classList.add('show');
    });
    document.addEventListener('click', function (e) {
        if (!searchOuter.contains(e.target)) searchResults.classList.remove('show');
    });
    searchClear.addEventListener('click', function () {
        searchField.value = '';
        searchClear.classList.remove('show');
        searchResults.innerHTML = recentHtml;
        searchResults.classList.add('show');
    });
}

/** component-showcase-ext.html #30 — gallery → lightbox */
function xaExtInitGalleryShowcase(root, suffix) {
    if (!root || !suffix) return;
    const grid = root.querySelector('#galleryGrid_' + suffix);
    const lightbox = root.querySelector('#lightbox_' + suffix);
    const lightboxImg = root.querySelector('#lightboxImg_' + suffix);
    const lightboxClose = root.querySelector('#lightboxClose_' + suffix);
    if (!grid || !lightbox || !lightboxImg) return;
    grid.querySelectorAll('.gallery-item').forEach(function (item) {
        item.addEventListener('click', function () {
            const img = item.querySelector('img');
            if (!img) return;
            lightboxImg.src = img.src.replace('w=400', 'w=1200');
            lightbox.classList.add('open');
        });
    });
    if (lightboxClose) {
        lightboxClose.addEventListener('click', function () {
            lightbox.classList.remove('open');
        });
    }
    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) lightbox.classList.remove('open');
    });
}

/** component-showcase-ext.html #31 — canvas pseudo-QR */
function xaExtDrawQRShowcase(canvas, text) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const SIZE = 180;
    const CELL = 6;
    const MARGIN = 2;
    const cols = Math.floor((SIZE - MARGIN * 2) / CELL);
    const t = text != null ? String(text) : 'https://xamong.com';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#000000';
    let seed = t.split('').reduce(function (a, c) {
        return a * 31 + c.charCodeAt(0);
    }, 0) >>> 0;
    function rand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    }
    function drawFinder(x, y) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, CELL * 7, CELL * 7);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + CELL, y + CELL, CELL * 5, CELL * 5);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + CELL * 2, y + CELL * 2, CELL * 3, CELL * 3);
    }
    const off = MARGIN * CELL;
    drawFinder(off, off);
    drawFinder(SIZE - off - CELL * 7, off);
    drawFinder(off, SIZE - off - CELL * 7);
    for (let r = 0; r < cols; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r < 8 && c < 8) || (r < 8 && c >= cols - 8) || (r >= cols - 8 && c < 8)) continue;
            if (rand() > 0.5) {
                ctx.fillStyle = '#000';
                ctx.fillRect(MARGIN * CELL + c * CELL, MARGIN * CELL + r * CELL, CELL - 1, CELL - 1);
            }
        }
    }
}

/** component-showcase-ext.html #32 */
function xaExtDrawBarcodeShowcase(canvas, textEl, val) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const code = (val + '').replace(/\D/g, '').substring(0, 13).padStart(13, '0');
    if (textEl) textEl.textContent = code.split('').join(' ');
    const enc = {
        0: '0001101',
        1: '0011001',
        2: '0010011',
        3: '0111101',
        4: '0100011',
        5: '0110001',
        6: '0101111',
        7: '0111011',
        8: '0110111',
        9: '0001011'
    };
    const rEnc = {
        0: '1110010',
        1: '1100110',
        2: '1101100',
        3: '1000010',
        4: '1011100',
        5: '1001110',
        6: '1010000',
        7: '1000100',
        8: '1001000',
        9: '1110100'
    };
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += enc[+code[i]];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += rEnc[+code[i]];
    bits += '101';
    const barW = (W - 20) / bits.length;
    ctx.fillStyle = '#000';
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') ctx.fillRect(10 + i * barW, 4, barW + 0.5, H - 12);
    }
}

/** component-showcase-ext.html #33 */
function xaExtInitSignaturePadShowcase(root, suffix) {
    if (!root || !suffix) return;
    const canvas = root.querySelector('#sigCanvas_' + suffix);
    const hint = root.querySelector('#sigHint_' + suffix);
    const sizeEl = root.querySelector('#sigSize_' + suffix);
    const clearBtn = root.querySelector('#sigClear_' + suffix);
    const saveBtn = root.querySelector('#sigSave_' + suffix);
    const colorRow = root.querySelector('#sigColors_' + suffix);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let color = '#F0EEF8';
    let size = 2;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.putImageData(data, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    resize();
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', resize);
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return [src.clientX - rect.left, src.clientY - rect.top];
    }

    function start(e) {
        e.preventDefault();
        drawing = true;
        const p = getPos(e);
        lastX = p[0];
        lastY = p[1];
        canvas.classList.add('drawing');
        if (hint) hint.style.display = 'none';
    }
    function move(e) {
        if (!drawing) return;
        e.preventDefault();
        const p = getPos(e);
        const x = p[0];
        const y = p[1];
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
    }
    function end() {
        drawing = false;
        canvas.classList.remove('drawing');
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (hint) hint.style.display = '';
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            const link = document.createElement('a');
            link.download = 'signature.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }
    if (colorRow) {
        colorRow.querySelectorAll('.sig-color-dot').forEach(function (dot) {
            dot.addEventListener('click', function () {
                colorRow.querySelectorAll('.sig-color-dot').forEach(function (d) {
                    d.classList.remove('selected');
                });
                dot.classList.add('selected');
                color = dot.getAttribute('data-color') || color;
            });
        });
    }
    if (sizeEl) {
        sizeEl.addEventListener('input', function () {
            size = +sizeEl.value;
        });
    }
}

/** component-showcase-ext.html #21 — accordion item toggle (showcase onclick) */
function xaExtToggleAccordionItem(id) {
    const item = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (!item) return;
    const body = item.querySelector('.accordion-body');
    const trigger = item.querySelector('.accordion-trigger');
    if (!body || !trigger) return;
    const isOpen = item.classList.contains('open');
    if (isOpen) {
        item.classList.remove('open');
        trigger.classList.remove('expanded');
        body.style.maxHeight = '0';
    } else {
        item.classList.add('open');
        trigger.classList.add('expanded');
        body.style.maxHeight = body.scrollHeight + 'px';
    }
}

/** component-showcase-ext.html #12 — hue slider → hex (same as page script hslToHex) */
function xaExtColorPickerHslToHex(h, s, l) {
    let ss = s / 100;
    let ll = l / 100;
    const a = ss * Math.min(ll, 1 - ll);
    const f = function (n) {
        const k = (n + h / 30) % 12;
        const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
}

/** component-showcase-ext.html #13 */
function xaExtInitDatePickerShowcase(root, suffix) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let cur = new Date();
    let selected = null;
    const monthLabel = root.querySelector('#dpMonthLabel_' + suffix);
    const body = root.querySelector('#dpBody_' + suffix);
    const prevBtn = root.querySelector('#dpPrev_' + suffix);
    const nextBtn = root.querySelector('#dpNext_' + suffix);
    if (!monthLabel || !body || !prevBtn || !nextBtn) return;
    function render() {
        monthLabel.textContent = months[cur.getMonth()] + ' ' + cur.getFullYear();
        body.innerHTML = '';
        const first = new Date(cur.getFullYear(), cur.getMonth(), 1).getDay();
        const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
        const today = new Date();
        let row = document.createElement('tr');
        let count = 0;
        for (let i = 0; i < first; i++) {
            const prevDate = new Date(cur.getFullYear(), cur.getMonth(), -first + i + 1);
            const td = document.createElement('td');
            const d = document.createElement('div');
            d.className = 'date-day other-month';
            d.textContent = prevDate.getDate();
            td.appendChild(d);
            row.appendChild(td);
            count++;
        }
        for (let day = 1; day <= days; day++) {
            const td = document.createElement('td');
            const div = document.createElement('div');
            div.className = 'date-day';
            div.textContent = String(day);
            if (day === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear()) div.classList.add('today');
            if (selected && day === selected.getDate() && cur.getMonth() === selected.getMonth() && cur.getFullYear() === selected.getFullYear()) div.classList.add('selected');
            (function (dNum) {
                div.addEventListener('click', function () {
                    selected = new Date(cur.getFullYear(), cur.getMonth(), dNum);
                    render();
                });
            })(day);
            td.appendChild(div);
            row.appendChild(td);
            count++;
            if (count % 7 === 0) {
                body.appendChild(row);
                row = document.createElement('tr');
            }
        }
        if (count % 7 !== 0) {
            while (count % 7 !== 0) {
                row.appendChild(document.createElement('td'));
                count++;
            }
            body.appendChild(row);
        }
    }
    prevBtn.addEventListener('click', function () {
        cur.setMonth(cur.getMonth() - 1);
        render();
    });
    nextBtn.addEventListener('click', function () {
        cur.setMonth(cur.getMonth() + 1);
        render();
    });
    render();
}

/** component-showcase-ext.html #14 */
function xaExtInitTimePickerShowcase(root, suffix) {
    const hourList = root.querySelector('#tpHourList_' + suffix);
    const minList = root.querySelector('#tpMinList_' + suffix);
    const tpHour = root.querySelector('#tpHour_' + suffix);
    const tpMin = root.querySelector('#tpMin_' + suffix);
    const tpAmpm = root.querySelector('#tpAmpm_' + suffix);
    const tpAmpmList = root.querySelector('#tpAmpmList_' + suffix);
    if (!hourList || !minList || !tpHour || !tpMin || !tpAmpm || !tpAmpmList) return;
    let selH = 9;
    let selM = 30;
    let selAP = 'AM';
    for (let i = 1; i <= 12; i++) {
        const el = document.createElement('div');
        el.className = 'time-picker__item' + (i === selH ? ' selected' : '');
        el.textContent = String(i).padStart(2, '0');
        el.setAttribute('data-v', String(i));
        (function (hour) {
            el.addEventListener('click', function () {
                selH = hour;
                hourList.querySelectorAll('.time-picker__item').forEach(function (e) { e.classList.remove('selected'); });
                el.classList.add('selected');
                tpHour.textContent = String(hour).padStart(2, '0');
            });
        })(i);
        hourList.appendChild(el);
    }
    for (let i = 0; i < 60; i += 5) {
        const el = document.createElement('div');
        el.className = 'time-picker__item' + (i === selM ? ' selected' : '');
        el.textContent = String(i).padStart(2, '0');
        el.setAttribute('data-v', String(i));
        (function (min) {
            el.addEventListener('click', function () {
                selM = min;
                minList.querySelectorAll('.time-picker__item').forEach(function (e) { e.classList.remove('selected'); });
                el.classList.add('selected');
                tpMin.textContent = String(min).padStart(2, '0');
            });
        })(i);
        minList.appendChild(el);
    }
    tpAmpmList.querySelectorAll('.time-picker__item').forEach(function (el) {
        el.addEventListener('click', function () {
            selAP = el.getAttribute('data-v') || 'AM';
            tpAmpmList.querySelectorAll('.time-picker__item').forEach(function (e) { e.classList.remove('selected'); });
            el.classList.add('selected');
            tpAmpm.textContent = selAP;
        });
    });
}

/** component-showcase-ext.html #15 */
function xaExtInitFilePickerShowcase(root, suffix) {
    const fileDropzone = root.querySelector('#fileDropzone_' + suffix);
    const fileInput = root.querySelector('#fileInput_' + suffix);
    const fileList = root.querySelector('#fileList_' + suffix);
    if (!fileDropzone || !fileInput || !fileList) return;
    const icons = { pdf: '📄', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', mp4: '🎬', zip: '🗜️', default: '📁' };
    function addFiles(files) {
        Array.prototype.slice.call(files).forEach(function (f) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            const icon = icons[ext] || icons.default;
            const size = f.size > 1024 * 1024 ? (f.size / 1024 / 1024).toFixed(1) + ' MB' : (f.size / 1024).toFixed(0) + ' KB';
            const item = document.createElement('div');
            item.className = 'file-item';
            const nameEl = document.createElement('div');
            nameEl.className = 'file-item__name';
            nameEl.textContent = f.name;
            const sizeEl = document.createElement('div');
            sizeEl.className = 'file-item__size';
            sizeEl.textContent = size;
            const info = document.createElement('div');
            info.className = 'file-item__info';
            info.appendChild(nameEl);
            info.appendChild(sizeEl);
            const iconSpan = document.createElement('span');
            iconSpan.className = 'file-item__icon';
            iconSpan.textContent = icon;
            const rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'file-item__rm';
            rm.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            rm.addEventListener('click', function () { item.remove(); });
            item.appendChild(iconSpan);
            item.appendChild(info);
            item.appendChild(rm);
            fileList.appendChild(item);
        });
    }
    fileDropzone.addEventListener('dragover', function (e) { e.preventDefault(); fileDropzone.classList.add('drag-over'); });
    fileDropzone.addEventListener('dragleave', function () { fileDropzone.classList.remove('drag-over'); });
    fileDropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        fileDropzone.classList.remove('drag-over');
        addFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); });
}

/** component-showcase-ext.html #16 */
function xaExtInitImagePickerShowcase(root, suffix) {
    const imageInput = root.querySelector('#imageInput_' + suffix);
    const imagePreview = root.querySelector('#imagePreview_' + suffix);
    const imageDropzone = root.querySelector('#imageDropzone_' + suffix);
    const placeholder = imageDropzone ? imageDropzone.querySelector('.image-dropzone__placeholder') : null;
    const imageThumbs = root.querySelector('#imageThumbs_' + suffix);
    if (!imageInput || !imagePreview || !imageThumbs) return;
    imageInput.addEventListener('change', function () {
        if (!imageInput.files || !imageInput.files[0]) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(imageInput.files[0]);
    });
    imageThumbs.querySelectorAll('.img-thumb').forEach(function (th) {
        th.addEventListener('click', function () {
            imageThumbs.querySelectorAll('.img-thumb').forEach(function (t) { t.classList.remove('active'); });
            th.classList.add('active');
        });
    });
}

function xaExtInitFRange(el, valueElId) {
    if (!el) return;
    const update = () => {
        const min = Number(el.min) || 0;
        const max = Number(el.max) || 100;
        const v = Number(el.value);
        const pct = max === min ? 0 : (((v - min) / (max - min)) * 100).toFixed(1);
        el.style.setProperty('--fill', pct + '%');
        if (valueElId) {
            const disp = document.getElementById(valueElId);
            if (disp) disp.textContent = el.value;
        }
    };
    el.addEventListener('input', update);
    update();
}

/** component-showcase-ext.html #26 — 동일 트리 데이터·동작 */
const XA_EXT_SHOWCASE_TREE_DATA = [
    { id: 1, label: 'src', icon: '📁', children: [
        { id: 2, label: 'components', icon: '📁', children: [
            { id: 3, label: 'Button.tsx', icon: '📄' },
            { id: 4, label: 'Input.tsx', icon: '📄' },
            { id: 5, label: 'Modal.tsx', icon: '📄' }
        ]},
        { id: 6, label: 'pages', icon: '📁', children: [
            { id: 7, label: 'index.tsx', icon: '📄' },
            { id: 8, label: 'about.tsx', icon: '📄' }
        ]},
        { id: 9, label: 'utils', icon: '📁', children: [
            { id: 10, label: 'helpers.ts', icon: '📄' }
        ]}
    ]},
    { id: 11, label: 'public', icon: '📁', children: [
        { id: 12, label: 'favicon.ico', icon: '🖼️' }
    ]},
    { id: 13, label: 'package.json', icon: '📄' },
    { id: 14, label: 'tsconfig.json', icon: '📄' }
];

/**
 * component-showcase-ext.html #26 과 동일한 마크업(.tree-node / .tree-row / .tree-children).
 * @param {boolean|Set<string>|null} expandedOpt — true: 전부 펼침(showcase); Set: 해당 path만 펼침
 */
function xaExtBuildFileTree(containerEl, nodes, expandedOpt) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const treeRoot = containerEl;
    const allExpanded = expandedOpt === true;
    const pathSet = expandedOpt instanceof Set ? expandedOpt : null;

    function buildTree(nodeList, parent, pathPrefix) {
        (nodeList || []).forEach((node, index) => {
            const path = pathPrefix === '' ? String(index) : pathPrefix + '.' + index;
            const wrap = document.createElement('div');
            wrap.className = 'tree-node';
            const row = document.createElement('div');
            const hasCh = node.children && node.children.length > 0;
            let startOpen = false;
            if (hasCh) {
                if (allExpanded) startOpen = true;
                else if (pathSet) startOpen = pathSet.has(path);
                else startOpen = false;
            }
            row.className = 'tree-row' + (hasCh ? (startOpen ? ' has-children expanded' : ' has-children') : '');
            row.innerHTML =
                '<svg class="tree-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>' +
                '<span class="tree-icon">' + (node.icon || '') + '</span>' +
                '<span class="tree-label">' + String(node.label || '').replace(/</g, '&lt;') + '</span>';
            wrap.appendChild(row);
            let children = null;
            if (hasCh) {
                children = document.createElement('div');
                children.className = 'tree-children' + (startOpen ? '' : ' collapsed');
                buildTree(node.children, children, path);
                wrap.appendChild(children);
            }
            row.addEventListener('click', () => {
                if (hasCh && children) {
                    const open = row.classList.contains('expanded');
                    row.classList.toggle('expanded', !open);
                    children.classList.toggle('collapsed', open);
                }
                treeRoot.querySelectorAll('.tree-row').forEach((r) => r.classList.remove('selected'));
                row.classList.add('selected');
            });
            parent.appendChild(wrap);
        });
    }
    buildTree(nodes || [], containerEl, '');
}

function xaExtBuildShowcaseTree(containerEl) {
    xaExtBuildFileTree(containerEl, XA_EXT_SHOWCASE_TREE_DATA, true);
}

// 비밀번호 입력 필드 (component-showcase-ext.html #01 · f-label / pw-wrap / pw-strength 정렬)
class XaPasswordField extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.placeholder = this.getValue('placeholder', '비밀번호를 입력하세요');
        this.label = this.getValue('label', '');
        this.value = this.getValue('value', '');
        this.showToggle = xaCoerceBool(this.getValue('showToggle', true), true);
        this.showStrength = xaCoerceBool(this.getValue('showStrength', true), true);
        this.toggleAriaLabel = this.getValue('toggleAriaLabel', '비밀번호 표시');
        this.minLength = this.getValue('minLength', 0);
        this.maxLength = this.getValue('maxLength', 100);
        this.pattern = this.getValue('pattern');
        this.required = this.getValue('required', false);
    }

    render() {
        const labelHtml = this.label
            ? `<label class="f-label" for="${this.key}">${this.escapeHtml(this.label)}</label>`
            : '';

        const toggleButton = this.showToggle ? `
            <button type="button" class="pw-toggle" onclick="togglePassword('${this.key}')"
                    aria-label="${this.escapeHtml(this.toggleAriaLabel)}">
                <svg id="${this.key}~eyeIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
        ` : '';

        const strengthBlock = this.showStrength ? `
            <div class="pw-strength" id="${this.key}~pwStrength">
                <div class="pw-strength__bar"></div>
                <div class="pw-strength__bar"></div>
                <div class="pw-strength__bar"></div>
                <div class="pw-strength__bar"></div>
            </div>
            <p class="f-hint" id="${this.key}~pwHint"></p>
        ` : '';

        const content = `
            <div style="${this.getBaseStyle()}" data-component="passwordField" data-component-key="${this.key}" data-key="${this.key}">
                ${labelHtml}
                <div class="pw-wrap">
                    <input class="f-input" type="password" id="${this.key}"
                           placeholder="${this.escapeHtml(this.placeholder)}"
                           value="${this.escapeHtml(this.value)}"
                           ${this.minLength ? `minlength="${this.minLength}"` : ''}
                           ${this.maxLength ? `maxlength="${this.maxLength}"` : ''}
                           ${this.pattern ? `pattern="${this.pattern}"` : ''}
                           ${this.required ? 'required' : ''}
                           ${this.enabled ? '' : 'disabled'}
                           ${this.getClickHandler()}
                           style="width: 100%; box-sizing: border-box;">
                    ${toggleButton}
                </div>
                ${strengthBlock}
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!this.showStrength) return;
        const input = document.getElementById(this.key);
        const pwStrength = document.getElementById(`${this.key}~pwStrength`);
        const pwHint = document.getElementById(`${this.key}~pwHint`);
        if (!input || !pwStrength || !pwHint) return;

        const levels = ['', 'weak', 'medium', 'strong', 'strong'];
        const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
        const sync = () => {
            const val = input.value || '';
            let s = 0;
            if (val.length >= 8) s++;
            if (/[A-Z]/.test(val)) s++;
            if (/[0-9]/.test(val)) s++;
            if (/[^A-Za-z0-9]/.test(val)) s++;
            const bars = pwStrength.querySelectorAll('.pw-strength__bar');
            bars.forEach((b, i) => {
                b.className = 'pw-strength__bar';
                if (i < s) b.classList.add(levels[s]);
            });
            pwHint.textContent = val ? `Strength: ${labels[s]}` : '';
        };
        input.addEventListener('input', sync);
        sync();
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 텍스트 영역 (component-showcase-ext.html #02 · f-label / f-textarea / textarea-footer)
class XaTextarea extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.placeholder = this.getValue('placeholder', '내용을 입력하세요');
        this.label = this.getValue('label', '');
        this.value = this.getValue('value', '');
        this.rows = this.getValue('rows', 0);
        const rawCols = this.getValue('cols', 0);
        this.cols = typeof rawCols === 'number' ? rawCols : parseInt(String(rawCols || 0), 10) || 0;
        const rawMax = this.getValue('maxLength', 0);
        const ml = typeof rawMax === 'number' ? rawMax : parseInt(String(rawMax || 0), 10) || 0;
        this.maxLength = ml;
        this.resize = this.getValue('resize', 'vertical');
        this.required = this.getValue('required', false);
        this.showCharCount = ml > 0
            ? xaCoerceBool(this.getValue('showCharCount', true), true)
            : false;
    }

    render() {
        const labelHtml = this.label
            ? `<label class="f-label" for="${this.key}">${this.escapeHtml(this.label)}</label>`
            : '';
        const rowsAttr = this.rows && Number(this.rows) > 0 ? `rows="${this.rows}"` : '';
        const colsAttr = this.cols > 0 ? `cols="${this.cols}"` : '';
        const maxAttr = this.maxLength > 0 ? `maxlength="${this.maxLength}"` : '';
        const footerHtml = this.showCharCount && this.maxLength > 0
            ? `<div class="textarea-footer"><span id="${this.key}~taCount">0</span>/${this.maxLength}</div>`
            : '';

        const content = `
            <div style="${this.getBaseStyle()}" data-component="textarea" data-component-key="${this.key}" data-key="${this.key}">
                ${labelHtml}
                <textarea class="f-textarea" id="${this.key}"
                          placeholder="${this.escapeHtml(this.placeholder)}"
                          ${rowsAttr}
                          ${colsAttr}
                          ${maxAttr}
                          ${this.required ? 'required' : ''}
                          ${this.enabled ? '' : 'disabled'}
                          ${this.getClickHandler()}
                          style="width: 100%; box-sizing: border-box; resize: ${this.resize};">${this.escapeHtml(this.value)}</textarea>
                ${footerHtml}
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        const ta = document.getElementById(this.key);
        if (!ta) return;

        if (this.showCharCount && this.maxLength > 0) {
            const cnt = document.getElementById(`${this.key}~taCount`);
            const sync = () => {
                if (cnt) cnt.textContent = String((ta.value || '').length);
                const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
                if (typeof reflow === 'function') reflow(ta);
            };
            ta.addEventListener('input', sync);
            sync();
        }

        if (typeof ResizeObserver === 'undefined') return;
        if (this._xaTaResizeObs) {
            try { this._xaTaResizeObs.disconnect(); } catch (e) { /* ignore */ }
        }
        const ro = new ResizeObserver(() => {
            const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
            if (typeof reflow === 'function') reflow(ta);
        });
        ro.observe(ta);
        this._xaTaResizeObs = ro;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

/** component-showcase-ext.html #03 커스텀 셀렉트 — 문서 클릭 시 열린 드롭다운 닫기 (한 번만 등록) */
let _xaCsDocClickBound = false;
function xaEnsureCustomSelectDocClose() {
    if (_xaCsDocClickBound || typeof document === 'undefined') return;
    _xaCsDocClickBound = true;
    document.addEventListener('click', function (e) {
        if (!e || !e.target) return;
        document.querySelectorAll('.custom-select.open').forEach(function (root) {
            if (!root.contains(e.target)) root.classList.remove('open');
        });
    });
}

/** showcase 전용 커스텀 드롭다운 이벤트 (트리거·옵션) */
function xaBindShowcaseCustomSelect(componentKey) {
    xaEnsureCustomSelectDocClose();
    const root = document.getElementById(`${componentKey}~customRoot`);
    const trigger = document.getElementById(`${componentKey}~csTrigger`);
    if (!root || !trigger || root.getAttribute('data-xa-cs-init') === '1') return;
    root.setAttribute('data-xa-cs-init', '1');
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        root.classList.toggle('open');
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    });
    root.querySelectorAll('.custom-select__opt').forEach(function (opt) {
        opt.addEventListener('click', function (e) {
            e.stopPropagation();
            const span = document.getElementById(`${componentKey}~csValue`);
            if (span) span.textContent = opt.textContent;
            root.querySelectorAll('.custom-select__opt').forEach(function (o) {
                o.classList.remove('selected');
            });
            opt.classList.add('selected');
            root.classList.remove('open');
            const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
            if (typeof reflow === 'function') reflow(root);
        });
    });
}

function xaSelectDefaultShowcaseCustomOptions() {
    return [
        { value: 'designer', text: '🎨 Designer' },
        { value: 'dev', text: '💻 Developer' },
        { value: 'pm', text: '📋 Product Manager' },
        { value: 'data', text: '📊 Data Analyst' },
        { value: 'devops', text: '⚙️ DevOps' }
    ];
}

function xaSelectSlugFromLabel(label, index) {
    const t = String(label || '').trim();
    const map = {
        react: 'react',
        vue: 'vue',
        svelte: 'svelte',
        solidjs: 'solid',
        solid: 'solid',
        angular: 'angular'
    };
    const low = t.toLowerCase().replace(/\s+/g, '');
    if (map[low] != null) return map[low];
    if (map[t.toLowerCase()]) return map[t.toLowerCase()];
    const slug = t
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 32);
    return slug || 'opt' + index;
}

// 선택 박스
class XaSelect extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.options = this.getValue('options', []);
        this.multiple = this.getValue('multiple', false);
        this.size = this.getValue('size', 1);
        this.required = this.getValue('required', false);
        this.placeholder = this.getValue('placeholder', '선택하세요');
        this.value = this.getValue('value', '');
        this.selectVariant = String(this.getValue('selectVariant', '') || '').toLowerCase();
        this.nativeLabel = this.getValue('nativeLabel', 'Native Select');
        this.customLabel = this.getValue('customLabel', 'Custom Select');
        this.nativePlaceholder = this.getValue('nativePlaceholder', 'Choose framework…');
        this.customPlaceholder = this.getValue('customPlaceholder', 'Select a role…');
        this.customValue = this.getValue('customValue', '');
        this.customOptions = this.getValue('customOptions', null);
    }

    _getOptionValue(option) {
        if (typeof option === 'string') return option;
        if (option && option.name && option.name === 'XCON') return option.get('value');
        if (option && typeof option === 'object') return option.value || option.key;
        return '';
    }

    _showcaseNativeRows() {
        const o = this.options;
        if (o && o.length) {
            return o.map((opt, i) => {
                if (typeof opt === 'string') {
                    return { value: xaSelectSlugFromLabel(opt, i), text: opt };
                }
                if (opt && opt.name === 'XCON') {
                    return {
                        value: String(opt.get('value') != null ? opt.get('value') : xaSelectSlugFromLabel(opt.get('text'), i)),
                        text: String(opt.get('text') != null ? opt.get('text') : opt.get('value'))
                    };
                }
                if (opt && typeof opt === 'object') {
                    const v = opt.value != null ? String(opt.value) : opt.key != null ? String(opt.key) : xaSelectSlugFromLabel(opt.text || opt.label, i);
                    const t = opt.text != null ? String(opt.text) : opt.label != null ? String(opt.label) : String(v);
                    return { value: v, text: t };
                }
                return { value: 'opt' + i, text: '?' };
            });
        }
        return [
            { value: 'react', text: 'React' },
            { value: 'vue', text: 'Vue' },
            { value: 'svelte', text: 'Svelte' },
            { value: 'solid', text: 'SolidJS' }
        ];
    }

    _showcaseCustomRows() {
        const raw = this.customOptions;
        if (raw && Array.isArray(raw) && raw.length) {
            return raw.map((opt, i) => {
                if (typeof opt === 'string') return { value: xaSelectSlugFromLabel(opt, i), text: opt };
                if (opt && typeof opt === 'object') {
                    const v = opt.value != null ? String(opt.value) : String(opt.key != null ? opt.key : 'c' + i);
                    const t = opt.text != null ? String(opt.text) : opt.label != null ? String(opt.label) : v;
                    return { value: v, text: t };
                }
                return { value: 'c' + i, text: '?' };
            });
        }
        return xaSelectDefaultShowcaseCustomOptions();
    }

    _renderShowcase() {
        const nativeRows = this._showcaseNativeRows();
        const customRows = this._showcaseCustomRows();
        const hasNative = this.value !== '' && this.value != null;
        const nativeHtml = nativeRows
            .map((r) => {
                const sel = String(this.value) === String(r.value) ? 'selected' : '';
                return `<option value="${this.escapeHtml(r.value)}" ${sel}>${this.escapeHtml(r.text)}</option>`;
            })
            .join('');
        const placeholderSelected = !hasNative ? 'selected' : '';
        const customRowsHtml = customRows
            .map((r) => {
                const sel = String(this.customValue) === String(r.value) ? ' selected' : '';
                return `<div class="custom-select__opt${sel}" data-val="${this.escapeHtml(r.value)}">${this.escapeHtml(r.text)}</div>`;
            })
            .join('');
        const initialCustom = customRows.find((r) => String(r.value) === String(this.customValue));
        const displayCustom = initialCustom ? initialCustom.text : this.customPlaceholder;

        const arrowSvg =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
        const chevronSvg =
            '<svg width="14" height="14" viewBox="0 0 24 24" style="stroke:var(--ink-3);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

        return `
            <div class="xa-ext-select-host xa-ext-select-host--showcase" style="${this.getBaseStyle()};" data-component="select" data-component-key="${this.key}" data-key="${this.key}" data-select-variant="showcase" data-ext-showcase="1">
                <label class="f-label" for="${this.key}~native">${this.escapeHtml(this.nativeLabel)}</label>
                <div class="f-select-wrap" style="margin-bottom:14px">
                    <select class="f-select" id="${this.key}~native"
                        ${this.required ? 'required' : ''}
                        ${this.enabled ? '' : 'disabled'}
                        ${this.getClickHandler()}>
                        <option value="" disabled ${placeholderSelected}>${this.escapeHtml(this.nativePlaceholder)}</option>
                        ${nativeHtml}
                    </select>
                    <span class="f-select-arrow">${arrowSvg}</span>
                </div>
                <label class="f-label">${this.escapeHtml(this.customLabel)}</label>
                <div class="custom-select" id="${this.key}~customRoot">
                    <div class="custom-select__trigger" id="${this.key}~csTrigger" role="button" tabindex="0">
                        <span id="${this.key}~csValue">${this.escapeHtml(displayCustom)}</span>
                        ${chevronSvg}
                    </div>
                    <div class="custom-select__dropdown" id="${this.key}~csDropdown">
                        ${customRowsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        if (this.selectVariant === 'showcase') {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }

        const getOptionValue = (option) => this._getOptionValue(option);

        const isSelected = (optionValue) => {
            if (!this.value || this.value === '') {
                return false;
            }
            const optValue = String(optionValue);
            if (this.multiple) {
                if (Array.isArray(this.value)) {
                    return this.value.map((v) => String(v)).includes(optValue);
                }
                const values = String(this.value)
                    .split(',')
                    .map((v) => v.trim());
                return values.includes(optValue);
            }
            return String(this.value) === optValue;
        };

        const shouldSelectPlaceholder = !this.multiple && this.placeholder && (!this.value || this.value === '');

        const optionsHtml = this.options
            .map((option) => {
                const optionValue = getOptionValue(option);
                const selected = isSelected(optionValue) ? 'selected' : '';

                if (typeof option === 'string') {
                    return `<option value="${this.escapeHtml(option)}" ${selected}>${this.escapeHtml(option)}</option>`;
                }
                if (option && option.name && option.name === 'XCON') {
                    return `<option value="${this.escapeHtml(option.get('value'))}" ${selected}>${this.escapeHtml(option.get('text'))}</option>`;
                }
                if (option && typeof option === 'object') {
                    return `<option value="${this.escapeHtml(option.value || option.key)}" ${selected}>${this.escapeHtml(option.text || option.label || option.value)}</option>`;
                }
                return '';
            })
            .join('');

        const arrowSvg =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
        const lbl = this.nativeLabel != null ? String(this.nativeLabel).trim() : '';
        const labelBlock = lbl
            ? `<label class="f-label" for="${this.key}">${this.escapeHtml(lbl)}</label>`
            : '';
        const content = `
            <div class="xa-ext-select-host xa-ext-select-host--single" style="${this.getBaseStyle()};" data-component="select" data-component-key="${this.key}" data-key="${this.key}">
                ${labelBlock}
                <div class="f-select-wrap">
                    <select class="f-select" id="${this.key}"
                        ${this.multiple ? 'multiple' : ''}
                        ${this.size > 1 ? `size="${this.size}"` : ''}
                        ${this.required ? 'required' : ''}
                        ${this.enabled ? '' : 'disabled'}
                        ${this.getClickHandler()}>
                        ${shouldSelectPlaceholder ? `<option value="" disabled selected>${this.escapeHtml(this.placeholder)}</option>` : ''}
                        ${optionsHtml}
                    </select>
                    <span class="f-select-arrow">${arrowSvg}</span>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (this.selectVariant === 'showcase') {
            xaBindShowcaseCustomSelect(this.key);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function (match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 슬라이더
class XaSlider extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.min = this.getValue('min', 0);
        this.max = this.getValue('max', 100);
        this.step = this.getValue('step', 1);
        this.value = this.getValue('value', 50);
        this.showValue = this.getValue('showValue', true);
        this.showTicks = this.getValue('showTicks', false);
        /** 상단 라벨 (component-showcase-ext #04 · .f-label) */
        this.sliderLabel = this.getValue('sliderLabel', this.getValue('label', ''));
        /** 하단 min / 중앙 / max 눈금 문구 */
        this.showSliderLabels = xaCoerceBool(this.getValue('showSliderLabels', true), true);
    }

    _sliderFillPct() {
        const min = Number(this.min);
        const max = Number(this.max);
        const v = Number(this.value);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return '0';
        const clamped = Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
        return (((clamped - min) / (max - min)) * 100).toFixed(1);
    }

    _renderShowcase() {
        const k = this.key;
        const v = this.value;
        const vol = Math.min(this.max, Math.max(this.min, v + 3));
        const op = Math.min(this.max, Math.max(this.min, v + 18));
        return `
            <div class="xa-ext-slider-host xa-ext-slider-host--showcase" style="${this.getBaseStyle()};" data-component="slider" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="slider-value" id="${k}~sv">${v}</div>
                <div class="slider-wrap">
                    <input class="f-range" id="${k}~rng" type="range" min="${this.min}" max="${this.max}" step="${this.step}" value="${v}"
                        ${this.enabled ? '' : 'disabled'} ${this.getClickHandler()}
                        oninput="updateSliderValue('${k}', this.value)">
                </div>
                <div class="slider-labels"><span>${this.min}</span><span>${Math.round((Number(this.min) + Number(this.max)) / 2)}</span><span>${this.max}</span></div>
                <div style="margin-top:16px">
                    <label class="f-label">Volume</label>
                    <div class="slider-wrap">
                        <input class="f-range" id="${k}~vol" type="range" min="${this.min}" max="${this.max}" step="${this.step}" value="${vol}" style="--fill:${((vol - this.min) / (this.max - this.min) * 100).toFixed(1)}%">
                    </div>
                </div>
                <div style="margin-top:14px">
                    <label class="f-label">Opacity</label>
                    <div class="slider-wrap">
                        <input class="f-range" id="${k}~op" type="range" min="${this.min}" max="${this.max}" step="${this.step}" value="${op}" style="--fill:${((op - this.min) / (this.max - this.min) * 100).toFixed(1)}%">
                    </div>
                </div>
            </div>`;
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const k = this.key;
        const min = this.min;
        const max = this.max;
        const step = this.step;
        const v = this.value;
        const fill = this._sliderFillPct();
        const showVal = xaCoerceBool(this.showValue, true);
        const showEdge = xaCoerceBool(this.showSliderLabels, true);
        const lbl = this.sliderLabel != null ? String(this.sliderLabel).trim() : '';
        const labelBlock = lbl ? `<label class="f-label">${this.escapeHtml(lbl)}</label>` : '';
        const valueBlock = showVal ? `<div class="slider-value" id="${k}~sv">${this.escapeHtml(String(v))}</div>` : '';
        const edgeBlock = showEdge
            ? `<div class="slider-labels"><span>${min}</span><span>${Math.round((Number(min) + Number(max)) / 2)}</span><span>${max}</span></div>`
            : '';

        const content = `
            <div class="xa-ext-slider-host xa-ext-slider-host--single" style="${this.getBaseStyle()};" data-component="slider" data-component-key="${k}" data-key="${k}">
                ${labelBlock}
                ${valueBlock}
                <div class="slider-wrap">
                    <input class="f-range" id="${k}~rng" type="range" min="${min}" max="${max}" step="${step}" value="${v}"
                        style="--fill:${fill}%"
                        ${this.enabled ? '' : 'disabled'}
                        ${this.getClickHandler()}
                        oninput="updateSliderValue('${k}', this.value)">
                </div>
                ${edgeBlock}
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        const k = this.key;
        if (xaExtIsShowcase(this)) {
            xaExtInitFRange(document.getElementById(k + '~rng'), k + '~sv');
            xaExtInitFRange(document.getElementById(k + '~vol'), null);
            xaExtInitFRange(document.getElementById(k + '~op'), null);
        } else {
            const rng = document.getElementById(k + '~rng');
            if (rng) xaExtInitFRange(rng, this.showValue ? k + '~sv' : null);
        }
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-key="' + String(k).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 스위치
class XaSwitch extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.checked = this.getValue('checked', false);
        this.onText = this.getValue('onText', 'ON');
        this.offText = this.getValue('offText', 'OFF');
        this.size = this.getValue('size', 'medium'); // small, medium, large
        /** 단일 행: 왼쪽 제목·부제 (component-showcase-ext #05 와 동일 .switch-info) */
        this.switchTitle = this.getValue('switchTitle', this.getValue('title', ''));
        this.switchSubtitle = this.getValue('switchSubtitle', this.getValue('subtitle', ''));
    }

    static normalizeSizeClass(size) {
        const s = String(size || 'medium').toLowerCase();
        if (s === 'small' || s === 'sm') return 'switch--sm';
        if (s === 'large' || s === 'lg') return 'switch--lg';
        return 'switch--md';
    }

    /** component-showcase-ext.html #05 — switch-row + .switch__track */
    _renderShowcase() {
        const k = this.key;
        const sz = XaSwitch.normalizeSizeClass(this.size);
        const row = (idSuffix, title, sub, checked) => `
            <div class="switch-row">
                <div class="switch-info"><p>${this.escapeHtml(title)}</p><small>${this.escapeHtml(sub)}</small></div>
                <label class="switch ${sz}">
                    <input type="checkbox" id="${k}~${idSuffix}" role="switch" aria-checked="${checked ? 'true' : 'false'}" ${checked ? 'checked' : ''} ${this.enabled ? '' : 'disabled'} ${this.getClickHandler()}>
                    <span class="switch__track"></span>
                </label>
            </div>`;
        return `
            <div class="xa-ext-switch-host xa-ext-switch-host--showcase" style="${this.getBaseStyle()};" data-component="switch" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                ${row('sw1', 'Dark Mode', 'Use dark color scheme', true)}
                ${row('sw2', 'Notifications', 'Receive push notifications', false)}
                ${row('sw3', 'Auto-save', 'Save changes automatically', true)}
                ${row('sw4', 'Analytics', 'Share anonymous usage data', false)}
            </div>`;
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const sz = XaSwitch.normalizeSizeClass(this.size);
        const checkedAttr = this.checked ? 'checked' : '';
        const title = this.switchTitle != null ? String(this.switchTitle) : '';
        const sub = this.switchSubtitle != null ? String(this.switchSubtitle) : '';
        const hasInfo = title.trim() !== '' || sub.trim() !== '';
        const ariaLabel = this.escapeHtml(this.checked ? this.onText : this.offText);
        const infoBlock = hasInfo
            ? `<div class="switch-info"><p>${this.escapeHtml(title)}</p>${sub.trim() !== '' ? `<small>${this.escapeHtml(sub)}</small>` : ''}</div>`
            : '';
        const rowClass = hasInfo ? 'switch-row' : 'switch-row switch-row--control-only';

        const content = `
            <div class="xa-ext-switch-host xa-ext-switch-host--single" style="${this.getBaseStyle()};" data-component="switch" data-component-key="${this.key}" data-key="${this.key}">
                <div class="${rowClass}">
                    ${infoBlock}
                    <label class="switch ${sz}">
                        <input type="checkbox" id="${this.key}" role="switch" aria-checked="${this.checked ? 'true' : 'false'}" aria-label="${ariaLabel}" ${checkedAttr} ${this.enabled ? '' : 'disabled'} ${this.getClickHandler()}>
                        <span class="switch__track"></span>
                    </label>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// =============================================================================
// Display Components (표시 컴포넌트)
// =============================================================================

// 진행률 표시줄
class XaProgressBar extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.value = this.getValue('value', 0);
        this.max = this.getValue('max', 100);
        this.showText = this.getValue('showText', true);
        this.animated = this.getValue('animated', false);
        this.color = this.getValue('color', '#007bff');
        this.backgroundColor = this.getValue('backgroundColor', '#e9ecef');
        /** 단일 바: 왼쪽 라벨 (showText true일 때) — 쇼케이스 Design/Development… 와 동일 행 레이아웃 */
        this.progressLabel = this.getValue('progressLabel', this.getValue('label', 'Progress'));
        /** 단일 바: progress-fill--a|b|c|d (테마 프리셋; color 인라인이 우선) */
        this.progressFillVariant = this.getValue('progressFillVariant', 'a');
    }

    static normalizeFillVariant(raw) {
        const v = String(raw || 'a').toLowerCase().trim();
        if (v === 'a' || v === 'b' || v === 'c' || v === 'd') return v;
        return 'a';
    }

    _progressPct() {
        const max = Number(this.max);
        const v = Number(this.value);
        const m = !Number.isFinite(max) || max === 0 ? 100 : max;
        const x = !Number.isFinite(v) ? 0 : v;
        return Math.max(0, Math.min(100, Math.round((x / m) * 100)));
    }

    _trackStripeClass() {
        return this.animated ? ' xa-ext-progress-stripes' : '';
    }

    _fillStyleAttr() {
        const raw = this.getValue('color', '#007bff');
        const s = String(raw).trim();
        if (s === '' || s.toLowerCase() === '#007bff') return '';
        return `background:${this.parseColor(raw)};`;
    }

    _trackStyleAttr() {
        const raw = this.getValue('backgroundColor', '#e9ecef');
        const s = String(raw).trim();
        if (s === '' || s.toLowerCase() === '#e9ecef') return '';
        return `background:${this.parseColor(raw)};`;
    }

    /** component-showcase-ext.html #06 — progress-item × 4 */
    _renderShowcase() {
        const k = this.key;
        const trackExtra = this._trackStripeClass();
        const rows = [
            { label: 'Design', pct: 87, cls: 'a' },
            { label: 'Development', pct: 64, cls: 'b' },
            { label: 'Testing', pct: 42, cls: 'c' },
            { label: 'Deploy', pct: 18, cls: 'd' }
        ];
        const bars = rows
            .map(
                (r) => `
            <div class="progress-item">
                <div class="progress-label"><span>${this.escapeHtml(r.label)}</span><span>${r.pct}%</span></div>
                <div class="progress-track${trackExtra}"><div class="progress-fill progress-fill--${r.cls}" style="width:${r.pct}%"></div></div>
            </div>`
            )
            .join('');
        return `
            <div class="xa-ext-progress-host xa-ext-progress-host--showcase" style="${this.getBaseStyle()};" data-component="progressBar" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                ${bars}
            </div>`;
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const pct = this._progressPct();
        const trackExtra = this._trackStripeClass();
        const fillV = XaProgressBar.normalizeFillVariant(this.progressFillVariant);
        const showLabel = xaCoerceBool(this.showText, true);
        const labelText = this.progressLabel != null ? String(this.progressLabel) : 'Progress';
        const fillExtra = this._fillStyleAttr();
        const trackExtraStyle = this._trackStyleAttr();
        const labelRow = showLabel
            ? `<div class="progress-label"><span>${this.escapeHtml(labelText)}</span><span>${pct}%</span></div>`
            : '';

        const content = `
            <div class="xa-ext-progress-host xa-ext-progress-host--single" style="${this.getBaseStyle()};" data-component="progressBar" data-component-key="${this.key}" data-key="${this.key}">
                <div class="progress-item">
                    ${labelRow}
                    <div class="progress-track${trackExtra}"${trackExtraStyle ? ` style="${trackExtraStyle}"` : ''}>
                        <div class="progress-fill progress-fill--${fillV}" style="width:${pct}%;${fillExtra}"></div>
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function (match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 스피너
class XaSpinner extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.size = this.getValue('size', 'medium'); // small, medium, large
        this.color = this.getValue('color', '0,123,255,255');
        /** spinnerType: ring(=border), dots, pulse(=grow), bars — 쇼케이스 행과 동일 마크업·테마 CSS */
        this.type = this.getValue('spinnerType', 'border');
    }

    static normalizeSpinKind(spinnerType) {
        const t = String(spinnerType || 'border').toLowerCase().trim();
        if (t === 'border' || t === 'ring') return 'ring';
        if (t === 'grow' || t === 'pulse') return 'pulse';
        if (t === 'dots') return 'dots';
        if (t === 'bars') return 'bars';
        return 'ring';
    }

    _getSpinCssRgbTuple() {
        const c = this.color;
        if (c != null && String(c).trim().startsWith('#')) {
            let hex = String(c).trim().slice(1);
            if (hex.length === 3) {
                hex = hex
                    .split('')
                    .map((ch) => ch + ch)
                    .join('');
            }
            const n = parseInt(hex, 16);
            if (!Number.isNaN(n)) {
                const r = (n >> 16) & 255;
                const g = (n >> 8) & 255;
                const b = n & 255;
                return `${r}, ${g}, ${b}`;
            }
        }
        const parts = (c || '').toString().split(',').map((p) => parseInt(p.trim(), 10) || 0);
        if (parts.length >= 3) return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
        return '0, 123, 255';
    }

    _ringClassForSize() {
        const s = String(this.size || 'medium').toLowerCase();
        if (s === 'small') return 'sp-ring sp-ring--sm';
        if (s === 'large') return 'sp-ring sp-ring--lg';
        return 'sp-ring sp-ring--md';
    }

    _scaleClassForSize() {
        const s = String(this.size || 'medium').toLowerCase();
        if (s === 'small') return 'xa-ext-spin-scale--sm';
        if (s === 'large') return 'xa-ext-spin-scale--lg';
        return 'xa-ext-spin-scale--md';
    }

    _renderSpinGraphic(kind) {
        switch (kind) {
            case 'dots':
                return `<div class="sp-dots ${this._scaleClassForSize()}" role="status" aria-hidden="true"><span></span><span></span><span></span></div>`;
            case 'pulse':
                return `<div class="sp-pulse ${this._scaleClassForSize()}" role="status" aria-hidden="true"></div>`;
            case 'bars':
                return `<div class="sp-bars ${this._scaleClassForSize()}" role="status" aria-hidden="true"><span></span><span></span><span></span><span></span></div>`;
            case 'ring':
            default:
                return `<div class="${this._ringClassForSize()}" role="status" aria-hidden="true"></div>`;
        }
    }

    /** component-showcase-ext.html #07 — spinners-row (sm/md/lg/dots/pulse/bars) */
    _renderShowcase() {
        const k = this.key;
        const rgb = this._getSpinCssRgbTuple();
        return `
            <div style="${this.getBaseStyle()};--xa-spin-rgb:${rgb};" data-component="spinner" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="spinners-row">
                    <div class="spinner-item">
                        <div class="sp-ring sp-ring--sm"></div>
                        <span class="spinner-label">sm</span>
                    </div>
                    <div class="spinner-item">
                        <div class="sp-ring sp-ring--md"></div>
                        <span class="spinner-label">md</span>
                    </div>
                    <div class="spinner-item">
                        <div class="sp-ring sp-ring--lg"></div>
                        <span class="spinner-label">lg</span>
                    </div>
                    <div class="spinner-item">
                        <div class="sp-dots xa-ext-spin-scale--md"><span></span><span></span><span></span></div>
                        <span class="spinner-label">dots</span>
                    </div>
                    <div class="spinner-item">
                        <div class="sp-pulse xa-ext-spin-scale--md"></div>
                        <span class="spinner-label">pulse</span>
                    </div>
                    <div class="spinner-item">
                        <div class="sp-bars xa-ext-spin-scale--md"><span></span><span></span><span></span><span></span></div>
                        <span class="spinner-label">bars</span>
                    </div>
                </div>
            </div>`;
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const kind = XaSpinner.normalizeSpinKind(this.type);
        const rgb = this._getSpinCssRgbTuple();
        const graphic = this._renderSpinGraphic(kind);
        const content = `
            <div class="xa-ext-spinner-host" style="${this.getBaseStyle()};--xa-spin-rgb:${rgb};display:flex;align-items:center;justify-content:center;"
                 data-component="spinner" data-component-key="${this.key}" data-key="${this.key}"
                 data-xa-spin-kind="${kind}">
                ${graphic}
                <span class="sr-only">Loading</span>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector(
            '[data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]'
        );
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 배지
class XaBadge extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', '');
        this.color = this.getValue('color', '#dc3545');
        this.backgroundColor = this.getValue('backgroundColor', '#dc3545');
        this.variant = this.getValue('variant', 'filled'); // filled, outline, dot
        this.size = this.getValue('size', 'medium'); // small, medium, large
    }

    /** component-showcase-ext.html #08 — badges-row + 알림 카운트 */
    _renderShowcase() {
        const k = this.key;
        const bellSvg =
            '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
        const chatSvg =
            '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        const mailSvg =
            '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
        return `
            <div class="xa-ext-badge-host xa-ext-badge-host--showcase" style="${this.getBaseStyle()};" data-component="badge" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="badges-row" style="margin-bottom:12px">
                    <span class="bdg bdg-purple">Purple</span>
                    <span class="bdg bdg-green">Active</span>
                    <span class="bdg bdg-red">Error</span>
                    <span class="bdg bdg-yellow">Warning</span>
                    <span class="bdg bdg-blue">Info</span>
                    <span class="bdg bdg-outline">Default</span>
                </div>
                <div class="badges-row" style="margin-bottom:16px">
                    <span class="bdg bdg-green bdg--dot">Online</span>
                    <span class="bdg bdg-yellow bdg--dot">Away</span>
                    <span class="bdg bdg-red bdg--dot">Busy</span>
                    <span class="bdg bdg-outline bdg--dot">Offline</span>
                </div>
                <div class="badges-row">
                    <div class="notif-badge-wrap">
                        <button type="button" class="notif-icon-btn" aria-label="Notifications">${bellSvg}</button>
                        <span class="notif-count">3</span>
                    </div>
                    <div class="notif-badge-wrap">
                        <button type="button" class="notif-icon-btn" aria-label="Messages">${chatSvg}</button>
                        <span class="notif-count">12</span>
                    </div>
                    <div class="notif-badge-wrap">
                        <button type="button" class="notif-icon-btn" aria-label="Mail">${mailSvg}</button>
                        <span class="notif-count">99+</span>
                    </div>
                </div>
            </div>`;
    }
    
    /** 단일 뱃지 — showcase 와 동일 .bdg 계열 */
    _bdgClassesAndStyle() {
        const v = String(this.variant || 'filled').toLowerCase();
        const size = String(this.size || 'medium').toLowerCase();
        const extra =
            size === 'small' ? ' font-size:10px;padding:2px 8px;' : size === 'large' ? ' font-size:13px;padding:5px 12px;' : '';
        if (v === 'outline') {
            return { cls: 'bdg bdg-outline', style: extra + (this.color ? `color:${this.color};border-color:${this.color};` : '') };
        }
        if (v === 'dot') {
            return { cls: 'bdg bdg-green bdg--dot', style: extra };
        }
        const bg = String(this.backgroundColor || '').trim();
        const col = String(this.color || '').trim();
        if (bg && bg !== '#dc3545') {
            return {
                cls: 'bdg',
                style: extra + `background:${this.parseColor(bg)};color:#fff;border:1px solid transparent;`
            };
        }
        if (col && col !== '#dc3545') {
            return { cls: 'bdg bdg-outline', style: extra + `color:${this.parseColor(col)};border-color:${this.parseColor(col)};` };
        }
        return { cls: 'bdg bdg-red', style: extra };
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const { cls, style } = this._bdgClassesAndStyle();
        const content = `
            <div class="xa-ext-badge-host xa-ext-badge-host--single" style="${this.getBaseStyle()};" data-component="badge" data-component-key="${this.key}" data-key="${this.key}">
                <span class="${cls}" style="${style}" ${this.getClickHandler()}>
                    ${this.variant === 'dot' ? '' : this.escapeHtml(this.text)}
                </span>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(content);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 아바타
class XaAvatar extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.src = this.getValue('src', '');
        this.alt = this.getValue('alt', '');
        this.initials = this.getValue('initials', '');
        this.size = this.getValue('size', 'medium'); // small, medium, large
        this.shape = this.getValue('shape', 'circle'); // circle, square, rounded
        this.backgroundColor = this.getValue('backgroundColor', '#6c757d');
        this.textColor = this.getValue('textColor', 'white');
    }

    /** component-showcase-ext.html #09 — avatars-row + av-group */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-avatar-host xa-ext-avatar-host--showcase" style="${this.getBaseStyle()};" data-component="avatar" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="avatars-row" style="margin-bottom:16px">
                    <div class="av">
                        <img class="av__img av__img--xl" src="https://i.pravatar.cc/72?img=47" alt="User">
                        <span class="av__status av__status--online"></span>
                    </div>
                    <div class="av">
                        <img class="av__img av__img--lg" src="https://i.pravatar.cc/56?img=12" alt="User">
                        <span class="av__status av__status--away"></span>
                    </div>
                    <div class="av">
                        <img class="av__img av__img--md" src="https://i.pravatar.cc/40?img=32" alt="User">
                        <span class="av__status av__status--offline"></span>
                    </div>
                    <div class="av">
                        <div class="av__initials av__initials--md" style="background:linear-gradient(135deg,#7C6AF7,#A594FF)">DK</div>
                    </div>
                    <div class="av">
                        <div class="av__initials av__initials--sm" style="background:linear-gradient(135deg,#34D399,#6EE7B7)">JL</div>
                    </div>
                </div>
                <div class="av-group">
                    <div class="av"><img class="av__img av__img--md" src="https://i.pravatar.cc/40?img=1" alt=""></div>
                    <div class="av"><img class="av__img av__img--md" src="https://i.pravatar.cc/40?img=2" alt=""></div>
                    <div class="av"><img class="av__img av__img--md" src="https://i.pravatar.cc/40?img=3" alt=""></div>
                    <div class="av"><img class="av__img av__img--md" src="https://i.pravatar.cc/40?img=4" alt=""></div>
                    <div class="av">
                        <div class="av__initials av__initials--md" style="background:var(--surface2);border:2px solid var(--surface);font-size:11px;color:var(--ink-2)">+8</div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const imgCls =
            this.size === 'small' ? 'av__img av__img--sm' : this.size === 'large' ? 'av__img av__img--lg' : 'av__img av__img--md';
        const iniCls =
            this.size === 'small' ? 'av__initials av__initials--sm' : this.size === 'large' ? 'av__initials av__initials--lg' : 'av__initials av__initials--md';

        let borderRadius = '50%';
        switch (this.shape) {
            case 'square':
                borderRadius = '0';
                break;
            case 'rounded':
                borderRadius = '8px';
                break;
        }

        let inner = '';
        if (this.src) {
            inner = `<img class="${imgCls}" src="${this.src}" alt="${this.escapeHtml(this.alt)}" style="border-radius:${borderRadius}">`;
        } else if (this.initials) {
            inner = `<div class="${iniCls}" style="background:${this.backgroundColor};color:${this.textColor};border-radius:${borderRadius}">${this.escapeHtml(this.initials)}</div>`;
        } else {
            inner = `<div class="${iniCls}" style="background:${this.backgroundColor};color:${this.textColor};border-radius:${borderRadius}">👤</div>`;
        }

        const html = `
            <div class="xa-ext-avatar-host xa-ext-avatar-host--single" style="${this.getBaseStyle()};" data-component="avatar" data-component-key="${this.key}" data-key="${this.key}">
                <div class="av" ${this.getClickHandler()}>
                    ${inner}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// =============================================================================
// Layout Components (레이아웃 컴포넌트)
// =============================================================================

// 탭
class XaTabs extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.tabs = this.getValue('tabs', []);
        this.activeTab = this.getValue('activeTab', 0);
        this.tabPosition = this.getValue('tabPosition', 'top'); // top, bottom, left, right
        this.variant = this.getValue('variant', 'default'); // default, pills, underline
        this.headerLayout = this.getValue('headerLayout', 'auto'); // auto: 내용 크기/왼쪽정렬, full: 균등 꽉참, center: 가운데정렬, end: 오른쪽정렬
    }
    
/*
<xcon>
    <x>
        <n>type</n><o>tabs</o>
        <n>pos</n><o>10,10,350,150</o>
        <n>activeTab</n><o>0</o>
        <n>variant</n><o>default</o>
        <n>tabs</n>
        <c>
            <x>
                <n>title</n><o>첫 번째 탭</o>
                <n>content</n><o>첫 번째 탭의 내용입니다.</o>
            </x>
            <x>
                <n>title</n><o>두 번째 탭</o>
                <n>content</n>
                <x>
                    <n>type</n><o>panel</o>
                    <n>pos</n><o>0,0,350,150</o>
                    <n>bgColor</n><o>16,185,129,255</o>
                    <n>components</n>
                    <x>
                        <n>titleLabel</n>
                        <x>
                            <n>type</n><o>label</o>
                            <n>pos</n><o>20,20,310,30</o>
                            <n>text</n><o>🚀 두 번째 패널</o>
                            <n>fontSize</n><o>18</o>
                            <n>fontWeight</n><o>bold</o>
                            <n>fgColor</n><o>255,255,255,255</o>
                        </x>
                        <n>actionBtn</n>
                        <x>
                            <n>type</n><o>button</o>
                            <n>pos</n><o>20,60,100,30</o>
                            <n>text</n><o>클릭하세요</o>
                            <n>bgColor</n><o>255,255,255,255</o>
                            <n>fgColor</n><o>16,185,129,255</o>
                        </x>
                    </x>
                </x>
            </x>
            <x>
                <n>title</n><o>세 번째 탭</o>
                <n>content</n><o>세 번째 탭의 내용입니다.</o>
            </x>
        </c>
    </x>
</xcon>
*/

    /** component-showcase-ext.html #10 — underline nav + pill nav */
    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'tabs').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const ids = {
            tabsNav: 'tabsNav_' + s,
            t1: 't1_' + s,
            t2: 't2_' + s,
            t3: 't3_' + s,
            pillTabsNav: 'pillTabsNav_' + s,
            p1: 'p1_' + s,
            p2: 'p2_' + s,
            p3: 'p3_' + s
        };
        const k = this.key;
        return `
            <div class="xa-ext-tabs-host xa-ext-tabs-host--showcase" style="${this.getBaseStyle()};" data-component="tabs" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="tabs-wrap">
                    <div class="tabs-nav" id="${ids.tabsNav}">
                        <button type="button" class="tab-btn active" data-tab="${ids.t1}">Overview</button>
                        <button type="button" class="tab-btn" data-tab="${ids.t2}">Analytics</button>
                        <button type="button" class="tab-btn" data-tab="${ids.t3}">Settings</button>
                    </div>
                    <div class="tab-content active" id="${ids.t1}"><div class="tab-panel-inner">Project overview with key metrics and milestones. Track progress across all workstreams and identify blockers early.</div></div>
                    <div class="tab-content" id="${ids.t2}"><div class="tab-panel-inner">Deep-dive analytics with custom reports, conversion funnels, and retention cohorts. Export to CSV at any time.</div></div>
                    <div class="tab-content" id="${ids.t3}"><div class="tab-panel-inner">Configure integrations, manage team permissions, set notification rules, and customize your workspace theme.</div></div>
                </div>
                <div style="margin-top:20px">
                    <div class="tabs-nav tabs-nav--pill" id="${ids.pillTabsNav}">
                        <button type="button" class="tab-btn active" data-tab="${ids.p1}">All</button>
                        <button type="button" class="tab-btn" data-tab="${ids.p2}">Active</button>
                        <button type="button" class="tab-btn" data-tab="${ids.p3}">Archived</button>
                    </div>
                    <div class="tab-content active" id="${ids.p1}"><div class="tab-panel-inner">Showing all 42 items.</div></div>
                    <div class="tab-content" id="${ids.p2}"><div class="tab-panel-inner">Showing 28 active items.</div></div>
                    <div class="tab-content" id="${ids.p3}"><div class="tab-panel-inner">Showing 14 archived items.</div></div>
                </div>
            </div>`;
    }

    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const v = this.variant || 'default';
        const layout = this.headerLayout || 'auto';
        const pos = this.tabPosition || 'top';

        const isVertical = (pos === 'left' || pos === 'right');
        const containerDir = pos === 'top' ? 'column' : pos === 'bottom' ? 'column-reverse' : pos === 'left' ? 'row' : 'row-reverse';
        const headerFlexDir = isVertical ? 'column' : 'row';
        const headerBorder = {
            top: 'border-bottom: 1px solid #ddd;',
            bottom: 'border-top: 1px solid #ddd;',
            left: 'border-right: 1px solid #ddd;',
            right: 'border-left: 1px solid #ddd;'
        }[pos] || '';
        const headerBorderUnderline = {
            top: 'border-bottom: 1px solid #e5e7eb;',
            bottom: 'border-top: 1px solid #e5e7eb;',
            left: 'border-right: 1px solid #e5e7eb;',
            right: 'border-left: 1px solid #e5e7eb;'
        }[pos] || '';
        const headerContainerStyle = {
            default: `display: flex; flex-direction: ${headerFlexDir}; flex-shrink: 0; ${headerBorder} ${isVertical ? 'width: auto; min-width: 100px;' : 'width: 100%;'}`,
            pills: `display: flex; flex-direction: ${headerFlexDir}; flex-shrink: 0; gap: 4px; ${isVertical ? 'width: auto; min-width: 100px;' : 'width: 100%;'}`,
            underline: `display: flex; flex-direction: ${headerFlexDir}; flex-shrink: 0; ${headerBorderUnderline} ${isVertical ? 'width: auto; min-width: 100px;' : 'width: 100%;'}`
        }[v] || headerContainerStyle.default;
        const headerContainerStyleWithLayout = headerContainerStyle +
            (layout === 'center' ? ' justify-content: center;' : layout === 'end' ? ' justify-content: flex-end;' : '');

        const radiusByPos = {
            top: '4px 4px 0 0',
            bottom: '0 0 4px 4px',
            left: '4px 0 0 4px',
            right: '0 4px 4px 0'
        }[pos] || '4px 4px 0 0';
        const marginByPos = {
            top: 'margin-bottom: -1px;',
            bottom: 'margin-top: -1px;',
            left: 'margin-right: -1px;',
            right: 'margin-left: -1px;'
        }[pos] || '';
        const getTabHeaderStyle = (isActive) => {
            const base = 'padding: 8px 16px; cursor: pointer;';
            const display = layout === 'full'
                ? (isVertical ? 'flex: 1; min-height: 0; text-align: center;' : 'flex: 1; min-width: 0; text-align: center;')
                : (isVertical ? 'display: block;' : 'display: inline-block;');
            if (v === 'default') {
                return base + ' ' + display + ` border: 1px solid #ddd; ${marginByPos}
                    background-color: ${isActive ? '#007bff' : '#f8f9fa'}; 
                    color: ${isActive ? 'white' : '#333'}; border-radius: ${radiusByPos};`;
            }
            if (v === 'pills') {
                return base + ' ' + display + ` border: none; border-radius: 20px;
                    background-color: ${isActive ? '#007bff' : '#e9ecef'}; 
                    color: ${isActive ? 'white' : '#495057'};`;
            }
            if (v === 'underline') {
                const underlineSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[pos] || 'bottom';
                return base + ' ' + display + ` border: none; border-${underlineSide}: 2px solid ${isActive ? '#007bff' : 'transparent'};
                    background-color: transparent; color: ${isActive ? '#007bff' : '#6b7280'};
                    ${marginByPos} border-radius: 0;`;
            }
            return base + ' ' + display + ` border: 1px solid #ddd; background-color: ${isActive ? '#007bff' : '#f8f9fa'}; color: ${isActive ? 'white' : '#333'}; border-radius: ${radiusByPos};`;
        };

        const tabsHtml = this.tabs.map((tab, index) => {
            const isActive = index === this.activeTab;
            const activeClass = isActive ? 'active' : '';
            const tabStyle = getTabHeaderStyle(isActive);
            return `
                <div class="tab-header tab-header-${v} tab-header-layout-${layout} ${activeClass}" 
                     onclick="switchXaTabs('${this.key}', ${index})"
                     style="${tabStyle}">
                    ${this.escapeHtml(XCON.isXCONObject(tab) ? tab.get('title') : (tab.title || `Tab ${index + 1}`))}
                </div>
            `;
        }).join('');
        
        const contentHtml = this.tabs.map((tab, index) => {
            const isActive = index === this.activeTab;
            const display = isActive ? 'block' : 'none';
            
            const content = XCON.isXCONObject(tab) ? tab.get('content') : (tab.content || '');
            const isXCONContent = XCON.isXCONObject(content);
            const contentBorderNone = { top: 'border-top: none;', bottom: 'border-bottom: none;', left: 'border-left: none;', right: 'border-right: none;' }[pos] || 'border-top: none;';
            const paneStyle = [
                `display: ${display}`,
                'position: absolute',
                'top: 0', 'left: 0', 'right: 0', 'bottom: 0',
                'padding: 16px',
                'border: 1px solid #ddd',
                contentBorderNone,
                'background-color: white',
                'overflow: auto',
                'box-sizing: border-box'
            ].join('; ');
            const paneStyleSimple = [
                `display: ${display}`,
                'padding: 16px',
                'border: 1px solid #ddd',
                contentBorderNone,
                'background-color: white'
            ].join('; ');

            if (isXCONContent) {
                const tabComponent = ComponentFactory.createFromXCON(content, `tabContent_${index}`, this.owner);

                if (tabComponent) {
                    return `
                        <div class="tab-content" id="${this.key}~content~${index}" 
                            style="${paneStyle}">
                            <div class="tab-content-inner" style="position: relative; width: 100%; height: 100%; min-height: 0;">
                                ${tabComponent.render()}
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="tab-content" id="${this.key}~content~${index}" 
                            style="${paneStyleSimple}">
                            ${this.escapeHtml(content)}
                        </div>
                    `;
                }
            } else {
                return `
                    <div class="tab-content" id="${this.key}~content~${index}" 
                        style="${paneStyleSimple}">
                        ${this.escapeHtml(content)}
                    </div>
                `;
            }
        }).join('');
        
        const html = `
            <div class="xa-ext-tabs-host xa-ext-tabs-host--single" style="${this.getBaseStyle()};" data-component="tabs" data-component-key="${this.key}" data-key="${this.key}" data-tabs-variant="${v}" data-tabs-position="${pos}">
                <div class="tabs-container tabs-position-${pos}" style="display: flex; flex-direction: ${containerDir}; width: 100%; height: 100%; overflow: hidden;">
                    <div class="tabs-header tabs-header-${v} tabs-header-layout-${layout}" style="${headerContainerStyleWithLayout}">
                        ${tabsHtml}
                    </div>
                    <div class="tabs-content" style="flex: 1; min-width: 0; min-height: 0; position: relative; overflow: hidden;">
                        ${contentHtml}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="tabs"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-tabs-showcase-init')) return;
        root.setAttribute('data-xa-ext-tabs-showcase-init', '1');
        root.querySelectorAll('.tabs-nav').forEach(function (nav) {
            const scope = nav.parentElement;
            if (!scope) return;
            nav.querySelectorAll('.tab-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const id = btn.getAttribute('data-tab');
                    nav.querySelectorAll('.tab-btn').forEach(function (b) {
                        b.classList.toggle('active', b === btn);
                    });
                    scope.querySelectorAll('.tab-content').forEach(function (c) {
                        c.classList.toggle('active', c.id === id);
                    });
                });
            });
        });
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 컬러 피커
class XaColorPicker extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.value = this.getValue('value', '#000000');
        this.showPreview = this.getValue('showPreview', true);
        this.showHex = this.getValue('showHex', true);
        this.alpha = this.getValue('alpha', false);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'colorPicker').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #12 — preview, hue range, hex row, swatches */
    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-color-picker-host xa-ext-color-picker-host--showcase" style="${this.getBaseStyle()};" data-component="colorPicker" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="color-picker-wrap">
                    <div class="color-preview" id="colorPreview_${s}" style="background:#7C6AF7"></div>
                    <input type="range" class="color-spectrum" id="colorHue_${s}"
                        style="background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"
                        min="0" max="360" value="258">
                    <div class="color-hex-row">
                        <div class="color-hex-dot" id="colorHexDot_${s}" style="background:#7C6AF7"></div>
                        <input type="text" id="colorHexInput_${s}" value="#7C6AF7">
                    </div>
                    <div class="color-swatches" id="colorSwatches_${s}">
                        <div class="color-swatch selected" style="background:#7C6AF7" data-hex="#7C6AF7"></div>
                        <div class="color-swatch" style="background:#34D399" data-hex="#34D399"></div>
                        <div class="color-swatch" style="background:#F87171" data-hex="#F87171"></div>
                        <div class="color-swatch" style="background:#FBBF24" data-hex="#FBBF24"></div>
                        <div class="color-swatch" style="background:#60A5FA" data-hex="#60A5FA"></div>
                        <div class="color-swatch" style="background:#F472B6" data-hex="#F472B6"></div>
                        <div class="color-swatch" style="background:#A78BFA" data-hex="#A78BFA"></div>
                        <div class="color-swatch" style="background:#2DD4BF" data-hex="#2DD4BF"></div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const previewBlock = this.showPreview
            ? `<div class="color-preview" id="${this.key}~preview" style="background:${this.value}"></div>`
            : '';
        const hexBlock = this.showHex
            ? `<input type="text" class="f-input" id="${this.key}~hex" value="${this.value}" onchange="updateColorFromHex('${this.key}', this.value)">`
            : '';
        const dotBlock = this.showPreview ? `<div class="color-hex-dot" style="background:${this.value}"></div>` : '';

        const html = `
            <div class="xa-ext-color-picker-host xa-ext-color-picker-host--single" style="${this.getBaseStyle()};" data-component="colorPicker" data-component-key="${this.key}" data-key="${this.key}">
                <div class="color-picker-wrap">
                    ${previewBlock}
                    <div class="color-hex-row">
                        ${dotBlock}
                        <input type="color" id="${this.key}" value="${this.value}"
                            ${this.getClickHandler()}
                            onchange="updateColorPreview('${this.key}', this.value)"
                            style="width:48px;height:36px;padding:0;border:1px solid var(--border2);border-radius:8px;cursor:pointer;background:var(--surface2);">
                        ${hexBlock}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="colorPicker"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-colorpicker-init')) return;
        root.setAttribute('data-xa-ext-colorpicker-init', '1');
        const s = this._showcaseIdSuffix();
        const hueSlider = root.querySelector('#colorHue_' + s);
        const colorPreview = root.querySelector('#colorPreview_' + s);
        const colorHexDot = root.querySelector('#colorHexDot_' + s);
        const colorHexInput = root.querySelector('#colorHexInput_' + s);
        if (!hueSlider || !colorPreview || !colorHexDot || !colorHexInput) return;
        hueSlider.addEventListener('input', function () {
            const hex = xaExtColorPickerHslToHex(+hueSlider.value, 70, 60);
            colorPreview.style.background = hex;
            colorHexDot.style.background = hex;
            colorHexInput.value = hex;
        });
        root.querySelectorAll('.color-swatch').forEach(function (sw) {
            sw.addEventListener('click', function () {
                root.querySelectorAll('.color-swatch').forEach(function (x) {
                    x.classList.remove('selected');
                });
                sw.classList.add('selected');
                const hex = sw.getAttribute('data-hex');
                if (!hex) return;
                colorPreview.style.background = hex;
                colorHexDot.style.background = hex;
                colorHexInput.value = hex;
            });
        });
        colorHexInput.addEventListener('input', function () {
            const v = colorHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                colorPreview.style.background = v;
                colorHexDot.style.background = v;
            }
        });
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    }
}

// 날짜 피커
class XaDatePicker extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.value = this.getValue('value', '');
        this.min = this.getValue('min', '');
        this.max = this.getValue('max', '');
        this.required = this.getValue('required', false);
        this.showIcon = this.getValue('showIcon', true);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'datePicker').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #13 */
    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-date-picker-host xa-ext-date-picker-host--showcase" style="${this.getBaseStyle()};" data-component="datePicker" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="date-picker" id="datePicker_${s}">
                    <div class="date-picker__header">
                        <button type="button" class="date-picker__nav" id="dpPrev_${s}"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
                        <span class="date-picker__month" id="dpMonthLabel_${s}"></span>
                        <button type="button" class="date-picker__nav" id="dpNext_${s}"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
                    </div>
                    <table class="date-picker__grid">
                        <thead><tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr></thead>
                        <tbody id="dpBody_${s}"></tbody>
                    </table>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const iconHtml = this.showIcon ? `
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); 
                         pointer-events: none; color: #666;">📅</span>
        ` : '';
        
        const html = `
            <div class="xa-ext-date-picker-host xa-ext-date-picker-host--single" style="${this.getBaseStyle()};" data-component="datePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div style="position: relative;">
                    <input type="date" id="${this.key}" value="${this.value}"
                           ${this.min ? `min="${this.min}"` : ''}
                           ${this.max ? `max="${this.max}"` : ''}
                           ${this.required ? 'required' : ''}
                           ${this.getClickHandler()}
                           style="width: 100%; height: 100%; padding: 8px; border: 1px solid #ccc; 
                                  border-radius: 4px; box-sizing: border-box; padding-right: 40px;">
                    ${iconHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="datePicker"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-dp-init')) return;
        root.setAttribute('data-xa-ext-dp-init', '1');
        xaExtInitDatePickerShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    }
}

// 시간 피커
class XaTimePicker extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.value = this.getValue('value', '');
        this.min = this.getValue('min', '');
        this.max = this.getValue('max', '');
        this.step = this.getValue('step', '');
        this.required = this.getValue('required', false);
        this.showIcon = this.getValue('showIcon', true);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'timePicker').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #14 */
    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-time-picker-host xa-ext-time-picker-host--showcase" style="${this.getBaseStyle()};" data-component="timePicker" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="time-picker">
                    <div class="time-picker__display">
                        <span class="time-picker__time"><span id="tpHour_${s}">09</span>:<span id="tpMin_${s}">30</span></span>
                        <span class="time-picker__ampm" id="tpAmpm_${s}">AM</span>
                    </div>
                    <div class="time-picker__cols">
                        <div class="time-picker__col">
                            <div class="time-picker__col-label">Hour</div>
                            <div class="time-picker__scroll" id="tpHourList_${s}"></div>
                        </div>
                        <div class="time-picker__col">
                            <div class="time-picker__col-label">Min</div>
                            <div class="time-picker__scroll" id="tpMinList_${s}"></div>
                        </div>
                        <div class="time-picker__col">
                            <div class="time-picker__col-label">AM/PM</div>
                            <div class="time-picker__scroll" id="tpAmpmList_${s}">
                                <div class="time-picker__item selected" data-v="AM">AM</div>
                                <div class="time-picker__item" data-v="PM">PM</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const iconHtml = this.showIcon ? `
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); 
                         pointer-events: none; color: #666;">🕐</span>
        ` : '';
        
        const html = `
            <div class="xa-ext-time-picker-host xa-ext-time-picker-host--single" style="${this.getBaseStyle()};" data-component="timePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div style="position: relative;">
                    <input type="time" id="${this.key}" value="${this.value}"
                           ${this.min ? `min="${this.min}"` : ''}
                           ${this.max ? `max="${this.max}"` : ''}
                           ${this.step ? `step="${this.step}"` : ''}
                           ${this.required ? 'required' : ''}
                           ${this.getClickHandler()}
                           style="width: 100%; height: 100%; padding: 8px; border: 1px solid #ccc; 
                                  border-radius: 4px; box-sizing: border-box; padding-right: 40px;">
                    ${iconHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="timePicker"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-tp-init')) return;
        root.setAttribute('data-xa-ext-tp-init', '1');
        xaExtInitTimePickerShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    }
}

// 파일 피커
class XaFilePicker extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.accept = this.getValue('accept', '');
        this.multiple = this.getValue('multiple', false);
        this.required = this.getValue('required', false);
        this.showPreview = this.getValue('showPreview', true);
        this.maxSize = this.getValue('maxSize', 0); // bytes
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'filePicker').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #15 */
    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-file-picker-host xa-ext-file-picker-host--showcase" style="${this.getBaseStyle()};" data-component="filePicker" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="file-dropzone" id="fileDropzone_${s}">
                    <input type="file" multiple id="fileInput_${s}">
                    <div class="file-dropzone__icon">📂</div>
                    <p class="file-dropzone__text">Drop files or <strong>browse</strong></p>
                    <p class="file-dropzone__hint">PDF, PNG, JPG up to 10MB</p>
                </div>
                <div class="file-list" id="fileList_${s}">
                    <div class="file-item">
                        <span class="file-item__icon">📄</span>
                        <div class="file-item__info"><div class="file-item__name">design-specs.pdf</div><div class="file-item__size">2.4 MB</div></div>
                        <button type="button" class="file-item__rm"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                    <div class="file-item">
                        <span class="file-item__icon">🖼️</span>
                        <div class="file-item__info"><div class="file-item__name">hero-image.png</div><div class="file-item__size">1.1 MB</div></div>
                        <button type="button" class="file-item__rm"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const previewHtml = this.showPreview ? `
            <div id="${this.key}~preview" class="file-preview" 
                 style="margin-top: 8px; padding: 8px; border: 1px dashed #ccc; 
                        border-radius: 4px; min-height: 40px; display: none;">
                <div class="preview-content"></div>
            </div>
        ` : '';
        
        const html = `
            <div class="xa-ext-file-picker-host xa-ext-file-picker-host--single" style="${this.getBaseStyle()};" data-component="filePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div class="file-dropzone" id="${this.key}~dz">
                    <input type="file" id="${this.key}"
                           ${this.accept ? `accept="${this.accept}"` : ''}
                           ${this.multiple ? 'multiple' : ''}
                           ${this.required ? 'required' : ''}
                           ${this.getClickHandler()}
                           onchange="handleFileSelect('${this.key}', this.files)">
                    <div class="file-dropzone__icon">📁</div>
                    <p class="file-dropzone__text">파일을 선택하거나 <strong>드래그</strong></p>
                    <p class="file-dropzone__hint">${this.accept ? this.escapeHtml(this.accept) : '모든 형식'}</p>
                </div>
                ${previewHtml}
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="filePicker"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-fp-init')) return;
        root.setAttribute('data-xa-ext-fp-init', '1');
        xaExtInitFilePickerShowcase(root, this._showcaseIdSuffix());
        root.querySelectorAll('.file-item__rm').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const item = btn.closest('.file-item');
                if (item) item.remove();
            });
        });
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    }
}

// 이미지 피커
class XaImagePicker extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.accept = this.getValue('accept', 'image/*');
        this.multiple = this.getValue('multiple', false);
        this.required = this.getValue('required', false);
        this.showPreview = this.getValue('showPreview', true);
        this.maxSize = this.getValue('maxSize', 5242880); // 5MB default
        this.maxWidth = this.getValue('maxWidth', 800);
        this.maxHeight = this.getValue('maxHeight', 600);
        this.quality = this.getValue('quality', 0.8);
        this.allowCrop = this.getValue('allowCrop', false);
        this.previewSize = this.getValue('previewSize', 'medium'); // small, medium, large
        this.previewPosition = this.getValue('previewPosition', 'bottom'); // bottom, right
        this.alt = this.getValue('alt', ''); // 대체 텍스트 (작은 크기일 때 툴팁으로 사용)
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'imagePicker').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #16 */
    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-image-picker-host xa-ext-image-picker-host--showcase" style="${this.getBaseStyle()};" data-component="imagePicker" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="image-dropzone" id="imageDropzone_${s}">
                    <input type="file" accept="image/*" id="imageInput_${s}">
                    <div class="image-dropzone__placeholder">
                        <div class="image-dropzone__icon">🖼️</div>
                        <p class="image-dropzone__text">Click or drag image</p>
                    </div>
                    <img class="image-dropzone__preview" id="imagePreview_${s}" alt="">
                </div>
                <div class="image-thumbnails" id="imageThumbs_${s}">
                    <img class="img-thumb active" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&q=60" alt="">
                    <img class="img-thumb" src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&q=60" alt="">
                    <img class="img-thumb" src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=120&q=60" alt="">
                    <img class="img-thumb" src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=120&q=60" alt="">
                    <img class="img-thumb" src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=120&q=60" alt="">
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const sizeMap = {
            small: { width: '80px', height: '80px' },
            medium: { width: '120px', height: '120px' },
            large: { width: '200px', height: '200px' }
        };
        const previewSize = sizeMap[this.previewSize] || sizeMap.medium;
        
        // 컴포넌트 크기 분석 (pos에서 width, height 추출)
        const pos = this.parsedPos;
        const componentWidth = pos.width || 300;
        const componentHeight = pos.height || 120;
        
        // 반응형 임계값 설정 (우측 미리보기를 고려하여 조정)
        const isCompact = componentWidth < 150 || componentHeight < 80;
        const isSmall = (this.previewPosition === 'right') ? 
                        (componentWidth < 400 || componentHeight < 100) :  // 우측 미리보기는 더 큰 공간 필요
                        (componentWidth < 250 || componentHeight < 100);   // 하단 미리보기는 기존 기준
        
        // 작은 크기일 때 간단한 UI 렌더링
        if (isCompact) {
            return this.renderCompactUI();
        }
        
        // 중간 크기일 때 간소화된 UI (previewPosition 존중)
        if (isSmall) {
            return this.renderSimplifiedUI();
        }
        
        // 기본 크기일 때 전체 UI
        const html = this.renderFullUI();

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    // 매우 작은 크기용 컴팩트 UI
    renderCompactUI() {
        const tooltipText = this.alt || (this.multiple ? '이미지들 선택' : '이미지 선택');
        
        // 피커 영역
        const pickerArea = `
            <div class="picker-area" style="flex-shrink: 0;">
                <label for="${this.key}" style="display: block; cursor: pointer; height: 100%;">
                    <div style="padding: 8px; border: 1px solid #28a745; border-radius: 4px; 
                                text-align: center; background-color: #f8fff9; transition: all 0.3s ease;
                                height: 100%; display: flex; align-items: center; justify-content: center;
                                box-sizing: border-box; min-width: 40px;"
                         onmouseover="this.style.backgroundColor='#e6ffed'; this.style.borderColor='#20c997'"
                         onmouseout="this.style.backgroundColor='#f8fff9'; this.style.borderColor='#28a745'"
                         title="${this.escapeHtml(tooltipText)}">
                        <span style="font-size: 18px; color: #28a745;">🖼️</span>
                    </div>
                </label>
                <input type="file" id="${this.key}" 
                       accept="${this.accept}"
                       ${this.multiple ? 'multiple' : ''}
                       ${this.required ? 'required' : ''}
                       ${this.getClickHandler()}
                       onchange="handleImageSelect('${this.key}', this.files)"
                       style="display: none;">
            </div>
        `;
        
        // 미리보기 영역
        const previewArea = this.showPreview ? `
            <div id="${this.key}~preview" class="image-preview" 
                 style="display: none; ${this.previewPosition === 'right' ? 
                        'margin-left: 8px; flex: 1; min-width: 0;' : 
                        'position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: white; border: 1px solid #ddd; border-radius: 4px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);'}">
                <div class="preview-header" style="margin-bottom: 4px; font-size: 10px; font-weight: 500; color: #333; 
                                                  ${this.previewPosition === 'right' ? '' : 'display: none;'}">
                    선택됨
                </div>
                <div class="preview-container" 
                     style="display: flex; flex-wrap: wrap; gap: 2px; 
                            ${this.previewPosition === 'right' ? 'max-height: 120px; overflow-y: auto; flex-direction: column;' : ''}"></div>
            </div>
        ` : '';
        
        // 레이아웃 결정
        const containerStyle = this.previewPosition === 'right' 
            ? 'display: flex; align-items: stretch; position: relative;' 
            : 'display: block; position: relative;';
        
        const html = `
            <div style="${this.getBaseStyle()}" data-component="imagePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div class="image-picker-container" style="${containerStyle}">
                    ${pickerArea}
                    ${previewArea}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    // 작은 크기용 간소화된 UI
    renderSimplifiedUI() {
        const tooltipText = this.alt || (this.multiple ? '이미지들을 선택하세요' : '이미지를 선택하세요');
        
        // 피커 영역
        const pickerArea = `
            <div class="picker-area" style="flex-shrink: 0;">
                <label for="${this.key}" style="display: block; cursor: pointer;">
                    <div style="padding: 12px; border: 2px dashed #28a745; border-radius: 6px; 
                                text-align: center; background-color: #f8fff9; transition: all 0.3s ease;
                                min-width: 200px;"
                         onmouseover="this.style.backgroundColor='#e6ffed'; this.style.borderColor='#20c997'"
                         onmouseout="this.style.backgroundColor='#f8fff9'; this.style.borderColor='#28a745'"
                         title="${this.escapeHtml(tooltipText)}">
                        <span style="font-size: 24px; display: block; margin-bottom: 4px;">🖼️</span>
                        <span style="font-size: 12px; color: #28a745; font-weight: 500;">
                            ${this.multiple ? '이미지들 선택' : '이미지 선택'}
                        </span>
                    </div>
                </label>
                <input type="file" id="${this.key}" 
                       accept="${this.accept}"
                       ${this.multiple ? 'multiple' : ''}
                       ${this.required ? 'required' : ''}
                       ${this.getClickHandler()}
                       onchange="handleImageSelect('${this.key}', this.files)"
                       style="display: none;">
            </div>
        `;
        
        // 미리보기 영역
        const previewArea = this.showPreview ? `
            <div id="${this.key}~preview" class="image-preview" 
                 style="display: none; ${this.previewPosition === 'right' ? 'margin-left: 12px; flex: 1;' : 'margin-top: 8px; width: 100%;'}">
                <div class="preview-header" style="margin-bottom: 6px; font-size: 12px; font-weight: 500; color: #333;">
                    선택된 이미지
                </div>
                <div class="preview-container" 
                     style="display: flex; flex-wrap: wrap; gap: 4px; 
                            ${this.previewPosition === 'right' ? 'max-height: 200px; overflow-y: auto;' : ''}"></div>
            </div>
        ` : '';
        
        // 레이아웃 결정
        const containerStyle = this.previewPosition === 'right' 
            ? 'display: flex; align-items: flex-start;' 
            : 'display: block;';
        
        const html = `
            <div style="${this.getBaseStyle()}" data-component="imagePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div class="image-picker-container" style="${containerStyle}">
                    ${pickerArea}
                    ${previewArea}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    // 기본 크기용 전체 UI
    renderFullUI() {
        // 피커 영역
        const pickerArea = `
            <div class="picker-area" style="flex-shrink: 0;">
                <label for="${this.key}" style="display: block; cursor: pointer;">
                    <div style="padding: 16px; border: 2px dashed #28a745; border-radius: 8px; 
                                text-align: center; background-color: #f8fff9; transition: all 0.3s ease;
                                min-width: 280px;"
                         onmouseover="this.style.backgroundColor='#e6ffed'; this.style.borderColor='#20c997'"
                         onmouseout="this.style.backgroundColor='#f8fff9'; this.style.borderColor='#28a745'"
                         ${this.alt ? `title="${this.escapeHtml(this.alt)}"` : ''}>
                        <span style="font-size: 32px; display: block; margin-bottom: 8px;">🖼️</span>
                        <span style="font-size: 14px; color: #28a745; font-weight: 500;">
                            ${this.multiple ? '이미지들을 선택하거나 드래그하세요' : '이미지를 선택하거나 드래그하세요'}
                        </span>
                        <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">
                            지원 형식: JPG, PNG, GIF, WebP
                            ${this.maxSize ? ` | 최대 크기: ${this.formatFileSize(this.maxSize)}` : ''}
                        </div>
                    </div>
                </label>
                <input type="file" id="${this.key}" 
                       accept="${this.accept}"
                       ${this.multiple ? 'multiple' : ''}
                       ${this.required ? 'required' : ''}
                       ${this.getClickHandler()}
                       onchange="handleImageSelect('${this.key}', this.files)"
                       style="display: none;">
            </div>
        `;
        
        // 미리보기 영역
        const previewArea = this.showPreview ? `
            <div id="${this.key}~preview" class="image-preview" 
                 style="display: none; ${this.previewPosition === 'right' ? 'margin-left: 16px; flex: 1;' : 'margin-top: 12px; width: 100%;'}">
                <div class="preview-header" style="margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #333;">
                    선택된 이미지
                </div>
                <div class="preview-container" 
                     style="display: flex; flex-wrap: wrap; gap: 8px; 
                            ${this.previewPosition === 'right' ? 'max-height: 300px; overflow-y: auto;' : ''}"></div>
            </div>
        ` : '';
        
        // 레이아웃 결정
        const containerStyle = this.previewPosition === 'right' 
            ? 'display: flex; align-items: flex-start;' 
            : 'display: block;';
        
        const html = `
            <div style="${this.getBaseStyle()}" data-component="imagePicker" data-component-key="${this.key}" data-key="${this.key}">
                <div class="image-picker-container" style="${containerStyle}">
                    ${pickerArea}
                    ${previewArea}
                    ${this.allowCrop ? `
                        <div id="${this.key}~crop~modal" class="crop-modal" style="display: none; position: fixed; 
                                                                                top: 0; left: 0; width: 100%; height: 100%; 
                                                                                background: rgba(0,0,0,0.8); z-index: 1000;">
                            <div class="crop-container" style="position: absolute; top: 50%; left: 50%; 
                                                              transform: translate(-50%, -50%); background: white; 
                                                              padding: 20px; border-radius: 8px; max-width: 90%; max-height: 90%;">
                                <div class="crop-header" style="margin-bottom: 16px; text-align: center;">
                                    <h3 style="margin: 0; color: #333;">이미지 자르기</h3>
                                </div>
                                <div class="crop-canvas-container" style="text-align: center; margin-bottom: 16px;">
                                    <canvas id="${this.key}_crop_canvas" style="max-width: 100%; max-height: 400px; border: 1px solid #ddd;"></canvas>
                                </div>
                                <div class="crop-controls" style="text-align: center;">
                                    <button onclick="applyCrop('${this.key}')" style="margin-right: 8px; padding: 8px 16px; 
                                                                                   background: #28a745; color: white; border: none; 
                                                                                   border-radius: 4px; cursor: pointer;">적용</button>
                                    <button onclick="cancelCrop('${this.key}')" style="padding: 8px 16px; background: #6c757d; 
                                                                                     color: white; border: none; border-radius: 4px; 
                                                                                     cursor: pointer;">취소</button>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="imagePicker"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-ip-init')) return;
        root.setAttribute('data-xa-ext-ip-init', '1');
        xaExtInitImagePickerShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function') reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 평점
class XaRating extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.value = this.getValue('value', 0);
        this.max = this.getValue('max', 5);
        this.readonly = this.getValue('readonly', false);
        this.icon = this.getValue('icon', '⭐');
        this.emptyIcon = this.getValue('emptyIcon', '☆');
        this.size = this.getValue('size', 'medium'); // small, medium, large
        this.showValue = this.getValue('showValue', false);
    }

    /** component-showcase-ext.html #17 — stars + hearts + read-only row */
    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'rating').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const k = this.key;
        return `
            <div class="xa-ext-rating-host xa-ext-rating-host--showcase" style="${this.getBaseStyle()};" data-component="rating" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="rating-wrap">
                    <div class="rating-row">
                        <span class="rating-row__label">Stars</span>
                        <div class="stars-input" id="starsInput_${s}">
                            <label data-v="1">★</label><label data-v="2">★</label><label data-v="3">★</label><label data-v="4">★</label><label data-v="5">★</label>
                        </div>
                        <span class="rating-score" id="starsScore_${s}">—</span>
                    </div>
                    <div class="rating-row">
                        <span class="rating-row__label">Hearts</span>
                        <div class="hearts-input" id="heartsInput_${s}">
                            <label data-v="1">♥</label><label data-v="2">♥</label><label data-v="3">♥</label><label data-v="4">♥</label><label data-v="5">♥</label>
                        </div>
                        <span class="rating-score" id="heartsScore_${s}">—</span>
                    </div>
                    <div class="rating-row" style="flex-direction:column;align-items:flex-start;gap:6px">
                        <span class="f-label">Read-only · 4.3</span>
                        <div style="display:flex;gap:3px">
                            <span style="color:var(--yellow)">★★★★</span><span style="color:var(--border2)">★</span>
                            <span style="font-size:12px;color:var(--ink-3);margin-left:6px">(1,284 reviews)</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const sizeMap = { small: '16px', medium: '24px', large: '32px' };
        const iconSize = sizeMap[this.size] || '24px';
        
        let starsHtml = '';
        for (let i = 1; i <= this.max; i++) {
            const filled = i <= this.value;
            const icon = filled ? this.icon : this.emptyIcon;
            const clickHandler = this.readonly ? '' : `onclick="setRating('${this.key}', ${i})"`;
            const cursor = this.readonly ? 'default' : 'pointer';
            
            starsHtml += `
                <span class="rating-star" data-rating="${i}" ${clickHandler}
                      style="font-size: ${iconSize}; cursor: ${cursor}; color: ${filled ? '#ffc107' : '#e9ecef'}; 
                             transition: color 0.2s ease;"
                      onmouseover="${this.readonly ? '' : `highlightRating('${this.key}', ${i})`}"
                      onmouseout="${this.readonly ? '' : `resetRating('${this.key}')`}">
                    ${icon}
                </span>
            `;
        }
        
        const valueDisplay = this.showValue
            ? `<span class="rating-score">${this.escapeHtml(String(this.value))}/${this.max}</span>`
            : '';

        const html = `
            <div class="xa-ext-rating-host xa-ext-rating-host--single" style="${this.getBaseStyle()};" data-component="rating" data-component-key="${this.key}" data-key="${this.key}">
                <div class="rating-wrap">
                    <div class="rating-row">
                        <span class="rating-row__label">Rating</span>
                        <div class="rating-stars" data-value="${this.value}" style="display:flex;align-items:center;gap:2px;">
                            ${starsHtml}
                        </div>
                        ${valueDisplay}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="rating"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-rating-showcase-init')) return;
        root.setAttribute('data-xa-ext-rating-showcase-init', '1');
        const s = this._showcaseIdSuffix();
        const bindGroup = function (containerId, scoreId) {
            const container = root.querySelector('#' + containerId);
            const score = root.querySelector('#' + scoreId);
            if (!container || !score) return;
            const labels = container.querySelectorAll('label');
            let current = 0;
            labels.forEach(function (lbl, i) {
                lbl.addEventListener('mouseover', function () {
                    labels.forEach(function (l, j) {
                        l.classList.toggle('active', j <= i);
                    });
                });
                lbl.addEventListener('mouseout', function () {
                    labels.forEach(function (l, j) {
                        l.classList.toggle('active', j < current);
                    });
                });
                lbl.addEventListener('click', function () {
                    current = i + 1;
                    score.textContent = current + '.0';
                });
            });
        };
        bindGroup('starsInput_' + s, 'starsScore_' + s);
        bindGroup('heartsInput_' + s, 'heartsScore_' + s);
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 아이콘
class XaIcon extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.name = this.getValue('name', '❓');
        this.library = this.getValue('library', 'emoji'); // emoji, lucide, feather, heroicons, fontawesome, bootstrap, material, tabler
        this.size = this.getValue('size', '24');
        this.color = this.getValue('color', '0,0,0,255');
        this.rotation = this.getValue('rotation', 0);
        this.strokeWidth = this.getValue('strokeWidth', 2); // for lucide/feather

        this.round = this.getValue('round', '0');
    }

    /** component-showcase-ext.html #18 — icon grid + size ladder */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-icon-host xa-ext-icon-host--showcase" style="${this.getBaseStyle()};" data-component="icon" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="icon-grid">
                    <div class="icon-item" title="Home"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                    <div class="icon-item" title="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                    <div class="icon-item" title="Bell"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                    <div class="icon-item" title="Settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
                    <div class="icon-item" title="User"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                    <div class="icon-item" title="Mail"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                    <div class="icon-item" title="Star"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                    <div class="icon-item" title="Heart"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
                    <div class="icon-item" title="Download"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
                    <div class="icon-item" title="Plus"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                    <div class="icon-item" title="Trash"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></div>
                    <div class="icon-item" title="Edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
                </div>
                <div class="icon-sizes">
                    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    <svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                    <svg width="36" height="36" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const iconSize = parseInt(this.size) || 24;
        
        let transform = '';
        if (this.rotation !== 0) {
            transform += `rotate(${this.rotation}deg)`;
        }
        
        let iconHtml = '';
        
        switch (this.library) {
            case 'lucide':
            case 'lucide-react-native':
                // Promise를 사용하여 동기화 - await는 호출하는 곳에서 처리
                const lucidePromise = this.renderLucideIcon(iconSize);
                if (lucidePromise instanceof Promise) {
                    // Promise인 경우 기본값 반환하고 비동기로 처리
                    iconHtml = ''; //`<span style="font-size: ${iconSize}px;">❓</span>`;
                    lucidePromise.then(loadedSvg => {
                        // 로드된 SVG를 DOM에 적용 (innerHTML 대신 직접 업데이트)
                        // 단, 현재 표시된 내용이 기본값(? 또는 빈 값)일 때만 업데이트
                        this.updateInnerHTML(loadedSvg);
                    }).catch(err => {
                        console.warn(`아이콘 로드 실패: ${this.name}`, err);
                        this.updateInnerHTML(`<span style="font-size: ${iconSize}px;">❓</span>`);
                    });
                } else {
                    iconHtml = lucidePromise;
                }
                break;
            case 'feather':
                iconHtml = this.renderFeatherIcon(iconSize);
                break;
            case 'heroicons':
                iconHtml = this.renderHeroIcon(iconSize);
                break;
            case 'fontawesome':
                iconHtml = this.renderFontAwesomeIcon(iconSize);
                break;
            case 'bootstrap':
                iconHtml = this.renderBootstrapIcon(iconSize);
                break;
            case 'material':
                iconHtml = this.renderMaterialIcon(iconSize);
                break;
            case 'tabler':
                iconHtml = this.renderTablerIcon(iconSize);
                break;
            case 'emoji':
            default:
                iconHtml = `<span style="font-size: ${iconSize}px; line-height: 1;">${this.name}</span>`;
                break;
        }
        
        let style = this.getBaseStyle();
        style += `
            border-radius: ${this.round}px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const html = `
            <div class="xa-ext-icon-host xa-ext-icon-host--single" style="${style}" data-component="icon" data-component-key="${this.key}" data-key="${this.key}">
                <div class="icon-item" ${this.getClickHandler()}>
                    <div class="icon-container" style="color: ${this.parseColor(this.color)}; 
                                                       display: inline-flex; align-items: center; justify-content: center;
                                                       width: ${iconSize}px; height: ${iconSize}px;
                                                       ${transform ? `transform: ${transform};` : ''}">
                        ${iconHtml}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="icon"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    updateInnerHTML(html) {
        if (this.element) {
            const iconContainer = this.element.querySelector('.icon-container');
            if (iconContainer) {
                const currentContent = iconContainer.innerHTML.trim();
                // 현재 내용이 기본값(? 또는 빈 값)이거나 SVG가 아닐 때만 업데이트
                const isPlaceholder = !currentContent || 
                                     currentContent.includes('❓') || 
                                     currentContent.includes('<span') ||
                                     !currentContent.includes('<svg');
                if (isPlaceholder) {
                    iconContainer.innerHTML = html;
                }
            }
        }
    }

    renderLucideIcon(size) {
        // Lucide 아이콘 SVG 렌더링 (확장된 아이콘 세트)
        const iconMap = {
            'home': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
            'user': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            'heart': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/></svg>`,
            'star': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/></svg>`,
            'mail': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/></svg>`,
            'phone': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
            'settings': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
            'search': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
            'plus': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
            'minus': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`,
            'x': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
            'check': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`,
            'arrow-right': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
            'arrow-left': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l-7-7 7-7"/><path d="M19 12H5"/></svg>`,
            'arrow-up': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
            'arrow-down': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
            'download': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
            'upload': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
            'edit': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
            'trash': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
            'calendar': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
            'clock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
            // 추가 아이콘들
            'menu': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
            'bell': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="m13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
            'lock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
            'unlock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
            'eye': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
            'eye-off': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
            'share': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>`,
            'copy': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
            'bookmark': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
            'folder': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
            'file': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
            'image': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
            'music': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
            'video': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
            'wifi': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>`,
            'battery': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>`
        };
        
        const iconName = this.name.toLowerCase();
        let svgString = iconMap[iconName];
        
        // iconMap에 있으면 즉시 반환
        if (svgString) {
            return svgString;
        }
        
        // iconMap에 없으면 Promise를 반환하여 비동기로 로드
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(`https://ai.xamong.com/icons/lucide/${iconName}.svg`);
                if (response.ok) {
                    let loadedSvg = await response.text();
                    if (loadedSvg) {
                        // size와 strokeWidth 치환 (정규식 사용)
                        loadedSvg = loadedSvg.replace(/\$\{size\}/g, `${size}`)
                                             .replace(/\$\{this\.strokeWidth\}/g, `${this.strokeWidth}`);
                        resolve(loadedSvg);
                    } else {
                        reject(new Error(`아이콘 내용이 비어있음: ${iconName}`));
                    }
                } else {
                    reject(new Error(`아이콘 로드 실패: ${iconName} (HTTP ${response.status})`));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    renderFeatherIcon(size) {
        // Feather 아이콘은 Lucide와 유사하지만 더 간단한 스타일
        return this.renderLucideIcon(size);
    }
    
    renderHeroIcon(size) {
        // Heroicons 아이콘 SVG 렌더링 (outline 스타일)
        const iconMap = {
            'home': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`,
            'user': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>`,
            'heart': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>`,
            'star': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>`,
            'envelope': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>`,
            'phone': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>`,
            'cog': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`,
            
            // 추가 아이콘들 - 검색 및 기본 액션
            'magnifying-glass': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>`,
            'plus': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
            'minus': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" /></svg>`,
            'x-mark': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
            'check': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`,
            
            // 화살표 아이콘들
            'arrow-right': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>`,
            'arrow-left': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>`,
            'arrow-up': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>`,
            'arrow-down': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>`,
            'chevron-right': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>`,
            'chevron-left': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>`,
            'chevron-up': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>`,
            'chevron-down': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>`,
            
            // 파일 및 폴더 아이콘들
            'folder': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25H13.19a1.5 1.5 0 0 1-1.06-.44Z" /></svg>`,
            'folder-open': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" /></svg>`,
            'document': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
            'document-text': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
            
            // 미디어 아이콘들
            'photo': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 9.75 22.5 5.25M6.75 17.25h.008v.008H6.75V17.25Z" /></svg>`,
            'play': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>`,
            'pause': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>`,
            'stop': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>`,
            'video-camera': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>`,
            'musical-note': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" /></svg>`,
            
            // 액션 아이콘들
            'pencil': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>`,
            'trash': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`,
            'archive-box': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>`,
            'arrow-down-tray': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>`,
            'arrow-up-tray': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>`,
            'share': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" /></svg>`,
            
            // 상태 및 알림 아이콘들
            'bell': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>`,
            'bell-slash': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a23.856 23.856 0 0 1-5.455-1.31 8.964 8.964 0 0 0 2.3-5.542m3.155 6.852a3 3 0 0 0 5.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 0 0 3.536-1.003A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53" /></svg>`,
            'exclamation-triangle': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>`,
            'information-circle': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`,
            'check-circle': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            'x-circle': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            
            // 보안 및 설정 아이콘들
            'lock-closed': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>`,
            'lock-open': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>`,
            'key': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>`,
            'shield-check': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>`,
            'eye': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`,
            'eye-slash': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 1-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`,
            
            // 날짜 및 시간 아이콘들
            'calendar-days': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>`,
            'clock': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            
            // 네트워킹 및 연결 아이콘들
            'wifi': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" /></svg>`,
            'signal': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>`,
            'link': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>`,
            'globe-alt': `<svg width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>`
        };
        
        return iconMap[this.name.toLowerCase()] || `<span style="font-size: ${size}px;">❓</span>`;
    }
    
    renderFontAwesomeIcon(size) {
        // FontAwesome 아이콘 클래스 기반 렌더링
        const iconClass = this.name.startsWith('fa-') ? this.name : `fa-${this.name}`;
        return `<i class="fas ${iconClass}" style="font-size: ${size}px;"></i>`;
    }
    
    renderBootstrapIcon(size) {
        // Bootstrap Icons SVG 렌더링
        const iconMap = {
            'house': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5ZM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5 5 5Z"/></svg>`,
            'person': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z"/></svg>`,
            'heart': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/></svg>`,
            'star': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`,
            'envelope': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/></svg>`,
            'telephone': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>`,
            'gear': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>`,
            'search': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>`,
            'plus': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>`,
            'dash': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>`,
            'x': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`,
            'check': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>`,
            'arrow-right': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L12.293 8.5H1.5A.5.5 0 0 1 1 8z"/></svg>`,
            'arrow-left': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>`,
            'arrow-up': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg>`,
            'arrow-down': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/></svg>`,
            'download': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>`,
            'upload': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>`,
            'pencil': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L14.5 5.207l-8 8A.5.5 0 0 1 6.146 13.5L5.5 14.5a.5.5 0 0 1-.708-.708L5.207 13.146l8-8L12.146.146zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10.5a.5.5 0 0 0 .5.5h.793L12.793 5.5z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg>`,
            'trash': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`,
            'calendar': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>`,
            'clock': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>`,
            'bell': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/></svg>`,
            'shield': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/></svg>`,
            'wifi': `<svg width="${size}" height="${size}" fill="currentColor" viewBox="0 0 16 16"><path d="M15.384 6.115a.485.485 0 0 0-.047-.736A12.444 12.444 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.518.518 0 0 0 .668.05A11.448 11.448 0 0 1 8 4c2.507 0 4.827.802 6.716 2.164.205.148.49.13.668-.049z"/><path d="M13.229 8.271a.482.482 0 0 0-.063-.745A9.455 9.455 0 0 0 8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065A8.46 8.46 0 0 1 8 7a8.46 8.46 0 0 1 4.576 1.336c.206.132.48.108.653-.065zm-2.183 2.183c.226-.226.185-.605-.1-.75A6.473 6.473 0 0 0 8 9c-1.06 0-2.062.254-2.946.704-.285.145-.326.524-.1.75l.015.015c.16.16.407.19.611.09A5.478 5.478 0 0 1 8 10c.868 0 1.69.201 2.42.56.203.1.45.07.61-.091l.016-.015zM9.06 12.44c.196-.196.198-.52-.04-.66A1.99 1.99 0 0 0 8 11.5a1.99 1.99 0 0 0-1.02.28c-.238.14-.236.464-.04.66l.706.706a.5.5 0 0 0 .708 0l.707-.707z"/></svg>`
        };
        
        return iconMap[this.name.toLowerCase()] || `<span style="font-size: ${size}px;">❓</span>`;
    }
    
    renderMaterialIcon(size) {
        // Material Icons 렌더링 (Google Material Design)
        const iconMap = {
            'home': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
            'person': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
            'favorite': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
            'star': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
            'mail': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
            'phone': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`,
            'settings': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`,
            'search': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
            'add': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`,
            'remove': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>`,
            'close': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            'check': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
            'arrow_forward': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`,
            'arrow_back': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`,
            'arrow_upward': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/></svg>`,
            'arrow_downward': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.59-5.58L4 12l8 8 8-8z"/></svg>`,
            'download': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
            'upload': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`,
            'edit': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
            'delete': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
            'calendar_today': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>`,
            'access_time': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
            'notifications': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`,
            'lock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`,
            'visibility': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
            'share': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>`,
            'folder': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
            'image': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
            'music_note': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
            'videocam': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>`,
            'wifi': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>`
        };
        
        return iconMap[this.name.toLowerCase()] || `<span style="font-size: ${size}px;">❓</span>`;
    }
    
    renderTablerIcon(size) {
        // Tabler Icons SVG 렌더링 (깔끔한 outline 스타일)
        const iconMap = {
            'home': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/></svg>`,
            'user': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/></svg>`,
            'heart': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.566"/></svg>`,
            'star': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>`,
            'mail': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z"/><path d="M3 7l9 6l9 -6"/></svg>`,
            'phone': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/></svg>`,
            'settings': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/></svg>`,
            'search': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/></svg>`,
            'plus': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14"/><path d="M5 12l14 0"/></svg>`,
            'minus': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14 0"/></svg>`,
            'x': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>`,
            'check': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5l10 -10"/></svg>`,
            'arrow-right': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/></svg>`,
            'arrow-left': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/></svg>`,
            'arrow-up': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14"/><path d="M18 11l-6 -6"/><path d="M6 11l6 -6"/></svg>`,
            'arrow-down': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5l0 14"/><path d="M18 13l-6 6"/><path d="M6 13l6 6"/></svg>`,
            'download': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/></svg>`,
            'upload': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 9l5 -5l5 5"/><path d="M12 16l0 -12"/></svg>`,
            'edit': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/><path d="M16 5l3 3"/></svg>`,
            'trash': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>`,
            'calendar': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/></svg>`,
            'clock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>`,
            'bell': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/></svg>`,
            'lock': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/></svg>`,
            'eye': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>`,
            'share': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.7 10.7l6.6 -3.4"/><path d="M8.7 13.3l6.6 3.4"/></svg>`,
            'folder': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"/></svg>`,
            'photo': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/></svg>`,
            'music': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/><path d="M9 17v-13h10v13"/><path d="M9 8h10"/></svg>`,
            'video': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z"/><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/></svg>`,
            'wifi': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18l.01 0"/><path d="M9.172 15.172a4 4 0 0 1 5.656 0"/><path d="M6.343 12.343a8 8 0 0 1 11.314 0"/><path d="M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0"/></svg>`
        };
        
        return iconMap[this.name.toLowerCase()] || `<span style="font-size: ${size}px;">❓</span>`;
    }
    
    // 각 아이콘 라이브러리별 아이콘 목록
    static get iconLibraries() {
        return {
            emoji: [
                '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
                '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
                '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
                '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
                '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
                '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
                '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
                '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
                '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
                '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
                '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
                '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
                '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
                '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓',
                '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
                '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
                '➿', '🌀', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐',
                '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚',
                '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤',
                '🕥', '🕦', '🕧', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢',
                '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒',
                '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾',
                '🎌', '🏞️', '🌅', '🌄', '🌠', '🎆', '🎇', '🌇', '🌆', '🏙️',
                '🌃', '🌌', '🌉', '🌁', '⭐', '🌟', '💫', '✨', '☄️', '☀️',
                '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️',
                '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌈', '☔', '💧', '💦',
                '🌊', '🔥', '💥', '⚡', '⭐', '🌟', '💫', '✨', '☄️', '🌍',
                '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭', '🏔️', '⛰️', '🌋', '🗻',
                '🏕️', '🏖️', '🏜️', '🏝️', '🏞️'
            ],
            
            lucide: [
                'home', 'user', 'heart', 'star', 'mail', 'phone', 'settings', 'search',
                'plus', 'minus', 'x', 'check', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
                'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down', 'folder', 'file',
                'image', 'video', 'music', 'camera', 'mic', 'speaker', 'volume-2', 'volume-x',
                'play', 'pause', 'stop', 'skip-forward', 'skip-back', 'repeat', 'shuffle',
                'edit', 'trash-2', 'copy', 'cut', 'paste', 'save', 'download', 'upload',
                'share', 'link', 'external-link', 'bookmark', 'tag', 'flag', 'calendar',
                'clock', 'timer', 'stopwatch', 'alarm-clock', 'bell', 'bell-off', 'message-circle',
                'message-square', 'inbox', 'send', 'reply', 'forward', 'archive', 'trash',
                'star', 'heart', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'meh',
                'eye', 'eye-off', 'lock', 'unlock', 'key', 'shield', 'shield-check',
                'user-plus', 'user-minus', 'user-check', 'user-x', 'users', 'team',
                'map-pin', 'navigation', 'compass', 'globe', 'wifi', 'wifi-off', 'bluetooth',
                'battery', 'battery-low', 'power', 'power-off', 'zap', 'sun', 'moon',
                'cloud', 'cloud-rain', 'cloud-snow', 'umbrella', 'wind', 'thermometer',
                'activity', 'trending-up', 'trending-down', 'bar-chart', 'pie-chart', 'line-chart',
                'layers', 'layout', 'grid', 'list', 'menu', 'more-horizontal', 'more-vertical',
                'filter', 'sort-asc', 'sort-desc', 'refresh-cw', 'rotate-ccw', 'rotate-cw',
                'maximize', 'minimize', 'zoom-in', 'zoom-out', 'move', 'crop', 'scissors',
                'paperclip', 'printer', 'monitor', 'smartphone', 'tablet', 'laptop',
                'server', 'database', 'hard-drive', 'cpu', 'memory-stick', 'usb',
                'credit-card', 'dollar-sign', 'shopping-cart', 'shopping-bag', 'gift',
                'package', 'truck', 'plane', 'car', 'bike', 'bus', 'train',
                'map', 'navigation-2', 'anchor', 'award', 'target', 'crosshair',
                'help-circle', 'info', 'alert-circle', 'alert-triangle', 'check-circle',
                'x-circle', 'slash', 'hash', 'at-sign', 'percent', 'divide',
                'equals', 'minus-circle', 'plus-circle', 'corner-down-left', 'corner-down-right',
                'corner-up-left', 'corner-up-right', 'corner-left-down', 'corner-left-up',
                'corner-right-down', 'corner-right-up', 'move-diagonal', 'move-diagonal-2',
                'airplay', 'cast', 'radio', 'tv', 'monitor-speaker', 'headphones',
                'mic-off', 'volume', 'volume-1', 'rss', 'podcast', 'radio'
            ],
            
            feather: [
                'activity', 'airplay', 'alert-circle', 'alert-octagon', 'alert-triangle', 'align-center',
                'align-justify', 'align-left', 'align-right', 'anchor', 'aperture', 'archive',
                'arrow-down', 'arrow-down-circle', 'arrow-down-left', 'arrow-down-right', 'arrow-left',
                'arrow-left-circle', 'arrow-right', 'arrow-right-circle', 'arrow-up', 'arrow-up-circle',
                'arrow-up-left', 'arrow-up-right', 'at-sign', 'award', 'bar-chart', 'bar-chart-2',
                'battery', 'battery-charging', 'bell', 'bell-off', 'bluetooth', 'bold',
                'book', 'book-open', 'bookmark', 'box', 'briefcase', 'calendar',
                'camera', 'camera-off', 'cast', 'check', 'check-circle', 'check-square',
                'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chevrons-down', 'chevrons-left',
                'chevrons-right', 'chevrons-up', 'chrome', 'circle', 'clipboard', 'clock',
                'cloud', 'cloud-drizzle', 'cloud-lightning', 'cloud-off', 'cloud-rain', 'cloud-snow',
                'code', 'codepen', 'codesandbox', 'coffee', 'columns', 'command',
                'compass', 'copy', 'corner-down-left', 'corner-down-right', 'corner-left-down', 'corner-left-up',
                'corner-right-down', 'corner-right-up', 'corner-up-left', 'corner-up-right', 'cpu', 'credit-card',
                'crop', 'crosshair', 'database', 'delete', 'disc', 'divide',
                'divide-circle', 'divide-square', 'dollar-sign', 'download', 'download-cloud', 'dribbble',
                'droplet', 'edit', 'edit-2', 'edit-3', 'external-link', 'eye',
                'eye-off', 'facebook', 'fast-forward', 'feather', 'figma', 'file',
                'file-minus', 'file-plus', 'file-text', 'film', 'filter', 'flag',
                'folder', 'folder-minus', 'folder-plus', 'framer', 'frown', 'gift',
                'git-branch', 'git-commit', 'git-merge', 'git-pull-request', 'github', 'gitlab',
                'globe', 'grid', 'hard-drive', 'hash', 'headphones', 'heart',
                'help-circle', 'hexagon', 'home', 'image', 'inbox', 'info',
                'instagram', 'italic', 'key', 'layers', 'layout', 'life-buoy',
                'link', 'link-2', 'linkedin', 'list', 'loader', 'lock',
                'log-in', 'log-out', 'mail', 'map', 'map-pin', 'maximize',
                'maximize-2', 'meh', 'menu', 'message-circle', 'message-square', 'mic',
                'mic-off', 'minimize', 'minimize-2', 'minus', 'minus-circle', 'minus-square',
                'monitor', 'moon', 'more-horizontal', 'more-vertical', 'mouse-pointer', 'move',
                'music', 'navigation', 'navigation-2', 'octagon', 'package', 'paperclip',
                'pause', 'pause-circle', 'pen-tool', 'percent', 'phone', 'phone-call',
                'phone-forwarded', 'phone-incoming', 'phone-missed', 'phone-off', 'phone-outgoing', 'pie-chart',
                'play', 'play-circle', 'plus', 'plus-circle', 'plus-square', 'pocket',
                'power', 'printer', 'radio', 'refresh-ccw', 'refresh-cw', 'repeat',
                'rewind', 'rotate-ccw', 'rotate-cw', 'rss', 'save', 'scissors',
                'search', 'send', 'server', 'settings', 'share', 'share-2',
                'shield', 'shield-off', 'shopping-bag', 'shopping-cart', 'shuffle', 'sidebar',
                'skip-back', 'skip-forward', 'slack', 'slash', 'sliders', 'smartphone',
                'smile', 'speaker', 'square', 'star', 'stop-circle', 'sun',
                'sunrise', 'sunset', 'tablet', 'tag', 'target', 'terminal',
                'thermometer', 'thumbs-down', 'thumbs-up', 'toggle-left', 'toggle-right', 'tool',
                'trash', 'trash-2', 'triangle', 'truck', 'tv', 'twitch',
                'twitter', 'type', 'umbrella', 'underline', 'unlock', 'upload',
                'upload-cloud', 'user', 'user-check', 'user-minus', 'user-plus', 'user-x',
                'users', 'video', 'video-off', 'voicemail', 'volume', 'volume-1',
                'volume-2', 'volume-x', 'watch', 'wifi', 'wifi-off', 'wind',
                'x', 'x-circle', 'x-octagon', 'x-square', 'youtube', 'zap',
                'zap-off', 'zoom-in', 'zoom-out'
            ],
            
            heroicons: [
                'home', 'user', 'heart', 'star', 'envelope', 'phone', 'cog',
                'magnifying-glass', 'plus', 'minus', 'x-mark', 'check',
                'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
                'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
                'folder', 'folder-open', 'document', 'document-text',
                'photo', 'play', 'pause', 'stop', 'video-camera', 'musical-note',
                'pencil', 'trash', 'archive-box', 'arrow-down-tray', 'arrow-up-tray', 'share',
                'bell', 'bell-slash', 'exclamation-triangle', 'information-circle', 'check-circle', 'x-circle',
                'lock-closed', 'lock-open', 'key', 'shield-check', 'eye', 'eye-slash',
                'calendar-days', 'clock', 'wifi', 'signal', 'link', 'globe-alt'
            ],
            
            fontawesome: [
                'home', 'user', 'heart', 'star', 'envelope', 'phone', 'cog',
                'search', 'plus', 'minus', 'times', 'check',
                'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
                'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
                'folder', 'folder-open', 'file', 'file-alt',
                'image', 'play', 'pause', 'stop', 'video', 'music',
                'edit', 'trash', 'archive', 'download', 'upload', 'share',
                'bell', 'exclamation-triangle', 'info-circle', 'check-circle', 'times-circle',
                'lock', 'unlock', 'key', 'shield-alt', 'eye', 'eye-slash',
                'calendar', 'clock', 'wifi', 'signal', 'link', 'globe',
                'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github',
                'google', 'apple', 'microsoft', 'amazon', 'spotify', 'slack',
                'shopping-cart', 'credit-card', 'money-bill', 'coins', 'wallet', 'receipt',
                'car', 'plane', 'train', 'bus', 'bicycle', 'motorcycle',
                'map', 'map-marker', 'compass', 'route', 'location-arrow', 'crosshairs',
                'camera', 'photo', 'film', 'microphone', 'headphones', 'volume-up',
                'book', 'bookmark', 'graduation-cap', 'school', 'university', 'pencil-alt',
                'tools', 'wrench', 'hammer', 'screwdriver', 'paint-brush', 'palette',
                'gamepad', 'dice', 'chess', 'puzzle-piece', 'trophy', 'medal',
                'fire', 'bolt', 'snowflake', 'sun', 'moon', 'cloud'
            ],
            
            bootstrap: [
                'house', 'person', 'heart', 'star', 'envelope', 'telephone', 'gear',
                'search', 'plus', 'dash', 'x', 'check',
                'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
                'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
                'folder', 'folder2-open', 'file-earmark', 'file-text',
                'image', 'play', 'pause', 'stop', 'camera-video', 'music-note',
                'pencil', 'trash', 'archive', 'download', 'upload', 'share',
                'bell', 'exclamation-triangle', 'info-circle', 'check-circle', 'x-circle',
                'lock', 'unlock', 'key', 'shield-check', 'eye', 'eye-slash',
                'calendar', 'clock', 'wifi', 'reception-4', 'link', 'globe',
                'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github',
                'google', 'apple', 'microsoft', 'amazon', 'spotify', 'slack',
                'cart', 'credit-card', 'currency-dollar', 'coin', 'wallet2', 'receipt',
                'car-front', 'airplane', 'train-front', 'bus-front', 'bicycle', 'scooter',
                'map', 'geo-alt', 'compass', 'signpost', 'cursor', 'bullseye',
                'camera', 'image-alt', 'film', 'mic', 'headphones', 'volume-up',
                'book', 'bookmark', 'mortarboard', 'building', 'bank', 'pencil-square',
                'tools', 'wrench', 'hammer', 'screwdriver', 'brush', 'palette',
                'controller', 'dice-1', 'suit-spade', 'puzzle', 'trophy', 'award',
                'fire', 'lightning', 'snow', 'sun', 'moon', 'cloud'
            ],
            
            material: [
                'home', 'person', 'favorite', 'star', 'mail', 'phone', 'settings',
                'search', 'add', 'remove', 'close', 'check',
                'arrow_forward', 'arrow_back', 'arrow_upward', 'arrow_downward',
                'chevron_right', 'chevron_left', 'keyboard_arrow_up', 'keyboard_arrow_down',
                'folder', 'folder_open', 'description', 'article',
                'image', 'play_arrow', 'pause', 'stop', 'videocam', 'music_note',
                'edit', 'delete', 'archive', 'download', 'upload', 'share',
                'notifications', 'warning', 'info', 'check_circle', 'cancel',
                'lock', 'lock_open', 'vpn_key', 'security', 'visibility', 'visibility_off',
                'event', 'access_time', 'wifi', 'signal_cellular_4_bar', 'link', 'public',
                'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github',
                'google', 'apple', 'microsoft', 'amazon', 'spotify', 'slack',
                'shopping_cart', 'credit_card', 'attach_money', 'monetization_on', 'account_balance_wallet', 'receipt',
                'directions_car', 'flight', 'train', 'directions_bus', 'directions_bike', 'motorcycle',
                'map', 'place', 'explore', 'directions', 'my_location', 'gps_fixed',
                'camera_alt', 'photo', 'movie', 'mic', 'headset', 'volume_up',
                'menu_book', 'bookmark', 'school', 'business', 'account_balance', 'create',
                'build', 'construction', 'handyman', 'engineering', 'brush', 'palette',
                'sports_esports', 'casino', 'style', 'extension', 'emoji_events', 'military_tech',
                'whatshot', 'flash_on', 'ac_unit', 'wb_sunny', 'brightness_3', 'cloud'
            ],
            
            tabler: [
                'home', 'user', 'heart', 'star', 'mail', 'phone', 'settings',
                'search', 'plus', 'minus', 'x', 'check',
                'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
                'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
                'folder', 'folder-open', 'file', 'file-text',
                'photo', 'player-play', 'player-pause', 'player-stop', 'video', 'music',
                'edit', 'trash', 'archive', 'download', 'upload', 'share',
                'bell', 'alert-triangle', 'info-circle', 'circle-check', 'circle-x',
                'lock', 'lock-open', 'key', 'shield-check', 'eye', 'eye-off',
                'calendar', 'clock', 'wifi', 'signal-4g', 'link', 'world',
                'brand-facebook', 'brand-twitter', 'brand-instagram', 'brand-linkedin', 'brand-youtube', 'brand-github',
                'brand-google', 'brand-apple', 'brand-windows', 'brand-amazon', 'brand-spotify', 'brand-slack',
                'shopping-cart', 'credit-card', 'currency-dollar', 'coin', 'wallet', 'receipt',
                'car', 'plane', 'train', 'bus', 'bike', 'motorbike',
                'map', 'map-pin', 'compass', 'route', 'current-location', 'target',
                'camera', 'photo', 'movie', 'microphone', 'headphones', 'volume',
                'book', 'bookmark', 'school', 'building', 'building-bank', 'pencil',
                'tools', 'tool', 'hammer', 'screwdriver', 'brush', 'palette',
                'device-gamepad', 'dice', 'cards', 'puzzle', 'trophy', 'award',
                'flame', 'bolt', 'snowflake', 'sun', 'moon', 'cloud'
            ]
        };
    }
}

// 구분선
class XaDivider extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.orientation = this.getValue('orientation', 'horizontal'); // horizontal, vertical
        this.variant = this.getValue('variant', 'solid'); // solid, dashed, dotted
        this.color = this.getValue('color', '#e9ecef');
        this.thickness = this.getValue('thickness', '1px');
        this.text = this.getValue('text', '');
        this.textPosition = this.getValue('textPosition', 'center'); // left, center, right
    }

    /** component-showcase-ext.html #19 — default / thick / dashed / gradient / label */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-divider-host xa-ext-divider-host--showcase" style="${this.getBaseStyle()};" data-component="divider" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <p style="font-size:13px;color:var(--ink-2)">Default</p>
                <div class="divider"></div>
                <p style="font-size:13px;color:var(--ink-2)">Thick</p>
                <div class="divider--thick"></div>
                <p style="font-size:13px;color:var(--ink-2)">Dashed</p>
                <div class="divider--dashed"></div>
                <p style="font-size:13px;color:var(--ink-2)">Gradient</p>
                <div class="divider--gradient"></div>
                <p style="font-size:13px;color:var(--ink-2)">With label</p>
                <div class="divider--label"><span>OR</span></div>
                <p style="font-size:13px;color:var(--ink-2)">Content below</p>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        let dividerStyle = '';
        let containerStyle = '';
        
        if (this.orientation === 'horizontal') {
            dividerStyle = `
                width: 100%; height: ${this.thickness}; 
                border-top: ${this.thickness} ${this.variant} ${this.color};
            `;
            containerStyle = 'display: flex; align-items: center;';
        } else {
            dividerStyle = `
                width: ${this.thickness}; height: 100%; 
                border-left: ${this.thickness} ${this.variant} ${this.color};
            `;
            containerStyle = 'display: flex; justify-content: center; height: 100%;';
        }
        
        if (this.text && this.orientation === 'horizontal') {
            const textAlign = this.textPosition === 'left' ? 'flex-start' : 
                             this.textPosition === 'right' ? 'flex-end' : 'center';
            
            const html = `
                <div class="xa-ext-divider-host xa-ext-divider-host--single" style="${this.getBaseStyle()};" data-component="divider" data-component-key="${this.key}" data-key="${this.key}">
                    <div style="display: flex; align-items: center; justify-content: ${textAlign};">
                        <div style="flex: 1; height: ${this.thickness}; 
                                    border-top: ${this.thickness} ${this.variant} ${this.color};"></div>
                        <span style="padding: 0 12px; font-size: 14px; color: var(--ink-2);">
                            ${this.escapeHtml(this.text)}
                        </span>
                        <div style="flex: 1; height: ${this.thickness}; 
                                    border-top: ${this.thickness} ${this.variant} ${this.color};"></div>
                    </div>
                </div>
            `;

            this._initializeElement();

            return this.doPolymorph(html);
        }
        
        const html = `
            <div class="xa-ext-divider-host xa-ext-divider-host--single" style="${this.getBaseStyle()};" data-component="divider" data-component-key="${this.key}" data-key="${this.key}">
                <div style="${containerStyle}">
                    <div style="${dividerStyle}" ${this.getClickHandler()}></div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="divider"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 알림
class XaAlert extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.title = this.getValue('title', '');
        this.message = this.getValue('message', '');
        this.type = this.getValue('alertType', 'info'); // success, info, warning, error
        this.dismissible = this.getValue('dismissible', false);
        this.showIcon = this.getValue('showIcon', true);
    }

    /** component-showcase-ext.html #20 — alert × 4 + 닫기 */
    _renderShowcase() {
        const k = this.key;
        const closeSvg =
            '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        const block = (cls, icon, title, text) => `
            <div class="alert ${cls}">
                <span class="alert__icon">${icon}</span>
                <div class="alert__body"><div class="alert__title">${this.escapeHtml(title)}</div><div class="alert__text">${this.escapeHtml(text)}</div></div>
                <button type="button" class="alert__close" aria-label="Close" onclick="this.closest('.alert').remove()">${closeSvg}</button>
            </div>`;
        return `
            <div class="xa-ext-alert-host xa-ext-alert-host--showcase" style="${this.getBaseStyle()};" data-component="alert" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                ${block('alert--info', 'ℹ️', 'Information', 'Your session will expire in 30 minutes. Save your work.')}
                ${block('alert--success', '✅', 'Success', 'Changes saved successfully to the cloud.')}
                ${block('alert--warning', '⚠️', 'Warning', 'Disk usage at 82%. Consider cleaning up old files.')}
                ${block('alert--error', '🚨', 'Error', 'Failed to connect to server. Check your network.')}
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const content = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(content);
        }
        const typeCls = {
            success: 'alert--success',
            info: 'alert--info',
            warning: 'alert--warning',
            error: 'alert--error'
        };
        const cls = typeCls[this.type] || typeCls.info;
        const iconMap = {
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '🚨'
        };
        const ic = iconMap[this.type] || iconMap.info;
        const iconHtml = this.showIcon ? `<span class="alert__icon">${ic}</span>` : '';
        const titleHtml = this.title ? `<div class="alert__title">${this.escapeHtml(this.title)}</div>` : '';
        const dismissButton = this.dismissible
            ? `<button type="button" class="alert__close" onclick="dismissAlert('${this.key}')" aria-label="Close">×</button>`
            : '';

        const html = `
            <div class="xa-ext-alert-host xa-ext-alert-host--single" style="${this.getBaseStyle()};" data-component="alert" data-component-key="${this.key}" data-key="${this.key}">
                <div class="alert ${cls}" style="position:relative;" ${this.getClickHandler()}>
                    ${iconHtml}
                    <div class="alert__body">
                        ${titleHtml}
                        <div class="alert__text">${this.escapeHtml(this.message)}</div>
                    </div>
                    ${dismissButton}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 카드
class XaCard extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.title = this.getValue('title', '');
        this.subtitle = this.getValue('subtitle', '');
        this.content = this.getValue('content', '');
        this.image = this.getValue('image', '');
        this.shadow = this.getValue('shadow', true);
        this.border = this.getValue('border', true);
        this.padding = this.getValue('padding', '16px');
    }

    /** component-showcase-ext.html #11 — ui-card + footer badge + CTA */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-card-host xa-ext-card-host--showcase" style="${this.getBaseStyle()};" data-component="card" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="ui-card">
                    <img class="ui-card__img" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80" alt="Card image">
                    <div class="ui-card__body">
                        <h3 class="ui-card__title">Generative Interfaces</h3>
                        <p class="ui-card__text">Exploring the intersection of AI and design — how machine-generated content reshapes product experiences.</p>
                        <div class="ui-card__footer">
                            <span class="bdg bdg-purple">Design</span>
                            <button type="button" class="btn-sm btn-primary">Read More</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const shadowStyle = this.shadow ? 'box-shadow: 0 2px 4px rgba(0,0,0,0.1);' : '';
        const borderStyle = this.border ? 'border: 1px solid #ddd;' : '';
        
        const imageHtml = this.image ? `
            <div class="card-image" style="width: 100%; height: 200px; overflow: hidden;">
                <img src="${this.image}" alt="" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        ` : '';
        
        const titleHtml = this.title ? `
            <h3 class="card-title" style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">
                ${this.escapeHtml(this.title)}
            </h3>
        ` : '';
        
        const subtitleHtml = this.subtitle ? `
            <p class="card-subtitle" style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
                ${this.escapeHtml(this.subtitle)}
            </p>
        ` : '';
        
        const contentHtml = this.content ? `
            <div class="card-content" style="font-size: 14px; line-height: 1.5;">
                ${this.escapeHtml(this.content)}
            </div>
        ` : '';
        
        // 내용이 없어도 pos 크기를 유지하도록 수정
        const html = `
            <div class="xa-ext-card-host xa-ext-card-host--single" style="${this.getBaseStyle()};" data-component="card" data-component-key="${this.key}" data-key="${this.key}">
                <div class="card" style="background-color: white; border-radius: 8px; overflow: hidden; 
                                        width: 100%; height: 100%; display: flex; flex-direction: column;
                                        ${shadowStyle} ${borderStyle}" ${this.getClickHandler()}>
                    ${imageHtml}
                    <div class="card-body" style="padding: ${this.padding}; flex: 1; display: flex; flex-direction: column; justify-content: center;">
                        ${titleHtml}
                        ${subtitleHtml}
                        ${contentHtml}
                        ${!this.title && !this.subtitle && !this.content && !this.image ? '<div style="color: #ccc; text-align: center; font-style: italic;"></div>' : ''}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="card"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 아코디언
class XaAccordion extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.items = this.getValue('items', []);
        this.multiple = this.getValue('multiple', false);
        this.defaultOpen = this.getValue('defaultOpen', []);
    }

    /** component-showcase-ext.html #21 — 3 items, first open */
    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'accordion').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _renderShowcase() {
        const s = this._showcaseIdSuffix();
        const a1 = 'acc1_' + s;
        const a2 = 'acc2_' + s;
        const a3 = 'acc3_' + s;
        const k = this.key;
        return `
            <div class="xa-ext-accordion-host xa-ext-accordion-host--showcase" style="${this.getBaseStyle()};" data-component="accordion" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="accordion-item open" id="${a1}">
                    <button type="button" class="accordion-trigger has-children expanded" onclick="xaExtToggleAccordionItem('${a1}')">
                        What is a design system?
                        <svg class="accordion-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="accordion-body" style="max-height:200px">
                        <div class="accordion-body-inner">A design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications.</div>
                    </div>
                </div>
                <div class="accordion-item" id="${a2}">
                    <button type="button" class="accordion-trigger has-children" onclick="xaExtToggleAccordionItem('${a2}')">
                        How to handle component states?
                        <svg class="accordion-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="accordion-body">
                        <div class="accordion-body-inner">Components can exist in multiple states: default, hover, focus, active, disabled, loading, and error. Each state should be visually distinct.</div>
                    </div>
                </div>
                <div class="accordion-item" id="${a3}">
                    <button type="button" class="accordion-trigger has-children" onclick="xaExtToggleAccordionItem('${a3}')">
                        Accessibility best practices
                        <svg class="accordion-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="accordion-body">
                        <div class="accordion-body-inner">Ensure sufficient color contrast, provide keyboard navigation, use semantic HTML elements, and include ARIA labels where needed.</div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const itemsHtml = this.items.map((item, index) => {
            const isOpen = this.defaultOpen.includes(index);
            const contentDisplay = isOpen ? 'block' : 'none';
            const arrowRotation = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
            
            return `
                <div class="accordion-item" style="border: 1px solid #e9ecef; border-bottom: none; 
                                                   ${index === this.items.length - 1 ? 'border-bottom: 1px solid #e9ecef;' : ''}">
                    <div class="accordion-header" 
                         onclick="toggleAccordion('${this.key}', ${index}, ${this.multiple})"
                         style="padding: 12px 16px; background-color: #f8f9fa; cursor: pointer; 
                                display: flex; justify-content: space-between; align-items: center;
                                border-bottom: 1px solid #e9ecef;">
                        <span style="font-weight: 500;">${this.escapeHtml(item.title || `Item ${index + 1}`)}</span>
                        <span class="accordion-arrow" style="transition: transform 0.3s ease; 
                                                           transform: ${arrowRotation};">▶</span>
                    </div>
                    <div class="accordion-content" id="${this.key}~content~${index}" 
                         style="display: ${contentDisplay}; padding: 16px; background-color: white;">
                        ${this.escapeHtml(item.content || '')}
                    </div>
                </div>
            `;
        }).join('');
        
        const html = `
            <div class="xa-ext-accordion-host xa-ext-accordion-host--single" style="${this.getBaseStyle()};" data-component="accordion" data-component-key="${this.key}" data-key="${this.key}">
                <div class="accordion-container" style="border-radius: 4px; overflow: hidden;">
                    ${itemsHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="accordion"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 그리드
class XaGrid extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.columns = this.getValue('columns', 3);
        this.gap = this.getValue('gap', '16px');
        this.items = this.getValue('items', []);
        this.responsive = this.getValue('responsive', true);
    }

    /** component-showcase-ext.html #22 */
    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'grid').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-grid-host xa-ext-grid-host--showcase" style="${this.getBaseStyle()};" data-component="grid" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="grid-demo">
                    <div class="grid-demo__controls">
                        <button type="button" class="grid-pill active" data-cols="2">2 cols</button>
                        <button type="button" class="grid-pill" data-cols="3">3 cols</button>
                        <button type="button" class="grid-pill" data-cols="4">4 cols</button>
                        <button type="button" class="grid-pill" data-cols="auto">Auto</button>
                    </div>
                    <div class="grid-canvas" id="gridCanvas_${s}" style="grid-template-columns:repeat(2,1fr)">
                        <div class="grid-cell">01</div><div class="grid-cell">02</div>
                        <div class="grid-cell">03</div><div class="grid-cell">04</div>
                        <div class="grid-cell">05</div><div class="grid-cell">06</div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const responsiveStyle = this.responsive ? `
            @media (max-width: 768px) {
                .grid-container { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 480px) {
                .grid-container { grid-template-columns: 1fr !important; }
            }
        ` : '';
        
        const itemsHtml = this.items.map((item, index) => `
            <div class="grid-item" style="padding: 8px; border: 1px solid #e9ecef; 
                                         border-radius: 4px; background-color: white;">
                ${this.escapeHtml(item.content || `Item ${index + 1}`)}
            </div>
        `).join('');
        
        const html = `
            <div class="xa-ext-grid-host xa-ext-grid-host--single" style="${this.getBaseStyle()};" data-component="grid" data-component-key="${this.key}" data-key="${this.key}">
                <div class="grid-container" style="display: grid; 
                                                  grid-template-columns: repeat(${this.columns}, 1fr); 
                                                  gap: ${this.gap};">
                    ${itemsHtml}
                </div>
                <style>${responsiveStyle}</style>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="grid"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-grid-showcase-init')) return;
        root.setAttribute('data-xa-ext-grid-showcase-init', '1');
        xaExtInitGridShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 플렉스 박스
class XaFlexBox extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.direction = this.getValue('direction', 'row'); // row, column, row-reverse, column-reverse
        this.justify = this.getValue('justify', 'flex-start'); // flex-start, center, flex-end, space-between, space-around, space-evenly
        this.align = this.getValue('align', 'stretch'); // stretch, flex-start, center, flex-end, baseline
        this.wrap = this.getValue('wrap', 'nowrap'); // nowrap, wrap, wrap-reverse
        this.gap = this.getValue('gap', '8px');
        this.items = this.getValue('items', []);
    }

    /** component-showcase-ext.html #23 */
    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'flexBox').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-flexbox-host xa-ext-flexbox-host--showcase" style="${this.getBaseStyle()};" data-component="flexBox" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="flex-controls">
                    <div class="flex-ctrl-group">
                        <label for="flexJustify_${s}">justify-content</label>
                        <select id="flexJustify_${s}">
                            <option value="flex-start">flex-start</option>
                            <option value="center">center</option>
                            <option value="flex-end">flex-end</option>
                            <option value="space-between">space-between</option>
                            <option value="space-around">space-around</option>
                        </select>
                    </div>
                    <div class="flex-ctrl-group">
                        <label for="flexAlign_${s}">align-items</label>
                        <select id="flexAlign_${s}">
                            <option value="flex-start">flex-start</option>
                            <option value="center" selected>center</option>
                            <option value="flex-end">flex-end</option>
                            <option value="stretch">stretch</option>
                        </select>
                    </div>
                </div>
                <div class="flex-canvas" id="flexCanvas_${s}">
                    <div class="flex-box">Box A</div>
                    <div class="flex-box">Box B longer</div>
                    <div class="flex-box">C</div>
                    <div class="flex-box">Box D</div>
                    <div class="flex-box">E</div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const itemsHtml = this.items.map((item, index) => {
            const flex = item.flex || '0 1 auto';
            const order = item.order || 0;
            const alignSelf = item.alignSelf || 'auto';
            
            return `
                <div class="flex-item" style="flex: ${flex}; order: ${order}; align-self: ${alignSelf}; 
                                            padding: 8px; border: 1px solid #e9ecef; 
                                            border-radius: 4px; background-color: white;">
                    ${this.escapeHtml(item.content || `Item ${index + 1}`)}
                </div>
            `;
        }).join('');
        
        const html = `
            <div class="xa-ext-flexbox-host xa-ext-flexbox-host--single" style="${this.getBaseStyle()};" data-component="flexBox" data-component-key="${this.key}" data-key="${this.key}">
                <div class="flex-container" style="display: flex; 
                                                  flex-direction: ${this.direction}; 
                                                  justify-content: ${this.justify}; 
                                                  align-items: ${this.align}; 
                                                  flex-wrap: ${this.wrap}; 
                                                  gap: ${this.gap};">
                    ${itemsHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="flexBox"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-flexbox-showcase-init')) return;
        root.setAttribute('data-xa-ext-flexbox-showcase-init', '1');
        xaExtInitFlexShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 스택
class XaStack extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.direction = this.getValue('direction', 'vertical'); // vertical, horizontal
        this.spacing = this.getValue('spacing', '8px');
        this.align = this.getValue('align', 'stretch'); // stretch, start, center, end
        this.items = this.getValue('items', []);
    }

    /** component-showcase-ext.html #24 */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-stack-host xa-ext-stack-host--showcase" style="${this.getBaseStyle()};" data-component="stack" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="stack-demo">
                    <div style="flex:1">
                        <div class="stack-label">Vertical Stack</div>
                        <div class="stack-v">
                            <div class="stack-item">Item 1</div>
                            <div class="stack-item">Item 2</div>
                            <div class="stack-item">Item 3</div>
                            <div class="stack-item">Item 4</div>
                        </div>
                    </div>
                    <div style="flex:1">
                        <div class="stack-label">Horizontal Stack</div>
                        <div class="stack-h">
                            <div class="stack-item">A</div>
                            <div class="stack-item">B</div>
                            <div class="stack-item">C</div>
                            <div class="stack-item">D</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const flexDirection = this.direction === 'vertical' ? 'column' : 'row';
        const alignItems = this.align === 'start' ? 'flex-start' : 
                          this.align === 'end' ? 'flex-end' : 
                          this.align === 'center' ? 'center' : 'stretch';
        
        const itemsHtml = this.items.map((item, index) => `
            <div class="stack-item" style="padding: 8px; border: 1px solid #e9ecef; 
                                          border-radius: 4px; background-color: white;">
                ${this.escapeHtml(item.content || `Item ${index + 1}`)}
            </div>
        `).join('');
        
        const html = `
            <div class="xa-ext-stack-host xa-ext-stack-host--single" style="${this.getBaseStyle()};" data-component="stack" data-component-key="${this.key}" data-key="${this.key}">
                <div class="stack-container" style="display: flex; 
                                                   flex-direction: ${flexDirection}; 
                                                   align-items: ${alignItems}; 
                                                   gap: ${this.spacing};">
                    ${itemsHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="stack"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 스페이서
class XaSpacer extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.size = this.getValue('size', '16px');
        this.direction = this.getValue('direction', 'vertical'); // vertical, horizontal
    }

    /** component-showcase-ext.html #25 */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-spacer-host xa-ext-spacer-host--showcase" style="${this.getBaseStyle()};" data-component="spacer" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="spacer-item">
                    <div class="spacer-box">Block A</div>
                    <div class="spacer-visual" style="height:8px"><span>8px</span></div>
                    <div class="spacer-box">Block B</div>
                    <div class="spacer-visual" style="height:16px"><span>16px</span></div>
                    <div class="spacer-box">Block C</div>
                    <div class="spacer-visual" style="height:32px"><span>32px</span></div>
                    <div class="spacer-box">Block D</div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const style = this.direction === 'vertical' ? 
                     `height: ${this.size}; width: 100%;` : 
                     `width: ${this.size}; height: 100%;`;
        
        const html = `
            <div class="xa-ext-spacer-host xa-ext-spacer-host--single" style="${this.getBaseStyle()};" data-component="spacer" data-component-key="${this.key}" data-key="${this.key}">
                <div class="spacer" style="${style}"></div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="spacer"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 트리 뷰 — DOM 트리(xaExtBuildFileTree)로 렌더, expandedNodes는 path 문자열 Set
class XaTreeView extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.data = this.getValue('data', []);
        this.expandedNodes = this.getValue('expandedNodes', []);
        this.showIcons = this.getValue('showIcons', true);
        this.selectable = this.getValue('selectable', true);
    }

    _expandedSet() {
        const raw = this.expandedNodes;
        const a = Array.isArray(raw) ? raw : [];
        return new Set(a.map((x) => String(x)));
    }

    _normalizeTreeNodes(list) {
        if (!Array.isArray(list)) return [];
        const mapOne = (n) => {
            if (!n || typeof n !== 'object') return null;
            const label = n.label != null ? String(n.label) : n.name != null ? String(n.name) : 'Node';
            const icon = this.showIcons
                ? n.icon != null
                    ? String(n.icon)
                    : n.children && n.children.length
                        ? '📁'
                        : '📄'
                : '';
            const rawCh = n.children;
            let children = [];
            if (Array.isArray(rawCh)) children = rawCh.map(mapOne).filter(Boolean);
            return { label, icon: icon || undefined, children: children.length ? children : undefined };
        };
        return list.map(mapOne).filter(Boolean);
    }

    /** component-showcase-ext.html #26 — bare .tree mount (xaExtBuildShowcaseTree) */
    render() {
        const k = this.key;
        if (xaExtIsShowcase(this)) {
            const html = `
            <div class="xa-ext-treeview-host xa-ext-treeview-host--showcase" style="${this.getBaseStyle()};" data-component="treeView" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="tree" id="${k}~treeMount"></div>
            </div>`;
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const html = `
            <div class="xa-ext-treeview-host xa-ext-treeview-host--single" style="${this.getBaseStyle()};" data-component="treeView" data-component-key="${k}" data-key="${k}">
                <div class="tree-container" style="border: 1px solid var(--border, #e9ecef); border-radius: 4px;
                    background-color: var(--surface, white); overflow-y: auto; max-height: 280px;">
                    <div class="tree" id="${k}~treeMount"></div>
                </div>
            </div>`;
        this._initializeElement();
        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        const el = document.getElementById(this.key + '~treeMount');
        if (!el) return;
        if (xaExtIsShowcase(this)) {
            xaExtBuildShowcaseTree(el);
        } else {
            const nodes = this._normalizeTreeNodes(this.data);
            xaExtBuildFileTree(el, nodes, this._expandedSet());
        }
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="treeView"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// 캐러셀 — items 항목이 XCON 객체(type/image, src)일 때는 .get('src')로 읽어야 함(JSON 배열 → fromJSONObject 후 XCON[])
function xaCarouselIsXconObject(obj) {
    return typeof XCON !== 'undefined' && XCON.isXCONObject && XCON.isXCONObject(obj);
}

function xaCarouselGetField(entry, key) {
    if (entry == null) return '';
    if (xaCarouselIsXconObject(entry)) {
        if (typeof entry.contains === 'function' && entry.contains(key)) {
            const v = entry.get(key);
            if (v === null || v === undefined) return '';
            return String(v);
        }
        return '';
    }
    const v = entry[key];
    if (v === null || v === undefined) return '';
    return String(v);
}

function xaCarouselPickMediaUrl(entry) {
    const keys = ['image', 'src', 'url', 'uri', 'path'];
    for (let i = 0; i < keys.length; i++) {
        const v = xaCarouselGetField(entry, keys[i]);
        if (v) return v;
    }
    return '';
}

function xaCarouselNormalizeItemsRaw(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    if (xaCarouselIsXconObject(raw) && Array.isArray(raw.valueList) && raw.valueList.length > 0) {
        const allNumericKeys = raw.nameList && raw.nameList.length > 0 &&
            raw.nameList.every((k) => /^\d+$/.test(String(k)));
        if (allNumericKeys) {
            return [...raw.valueList];
        }
    }
    return [];
}

// 캐러셀
class XaCarousel extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        const raw = xaCarouselNormalizeItemsRaw(this.getValue('items', []));
        this.items = [];
        for (const entry of raw) {
            if (entry == null) continue;
            if (typeof entry === 'string') {
                this.items.push({ image: entry, title: '', description: '', alt: '' });
                continue;
            }
            if (typeof entry === 'object') {
                const img = xaCarouselPickMediaUrl(entry);
                const title = xaCarouselGetField(entry, 'title');
                const description = xaCarouselGetField(entry, 'description');
                const alt = xaCarouselGetField(entry, 'alt') || title;
                this.items.push({ image: img, title, description, alt });
            }
        }
        this.autoPlay = Boolean(this.getValue('autoPlay', false));
        this.interval = Number(this.getValue('interval', 3000)) || 3000;
        this.showDots = this.getValue('showDots', true);
        this.showArrows = this.getValue('showArrows', true);
    }

    render() {
        const emptyHtml = `
            <div class="carousel-item" style="display: block; text-align: center; padding: 24px; color: #888;">
                슬라이드가 없습니다. <code style="font-size: 12px;">items</code> 배열을 설정하세요.
            </div>`;

        const itemsHtml = this.items.length === 0 ? emptyHtml : this.items.map((item, index) => {
            const display = index === 0 ? 'block' : 'none';
            const imgSrc = (item.image || '').replace(/"/g, '&quot;');
            const imgAlt = (item.alt || '').replace(/"/g, '&quot;');
            return `
                <div class="carousel-item" data-carousel-item-index="${index}" style="display: ${display}; text-align: center; width: 100%; box-sizing: border-box;">
                    ${item.image ? `<img src="${imgSrc}" alt="${imgAlt}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle;">` : ''}
                    ${item.title ? `<h3 style="margin: 8px 0;">${this.escapeHtml(item.title)}</h3>` : ''}
                    ${item.description ? `<p style="margin: 8px 0;">${this.escapeHtml(item.description)}</p>` : ''}
                </div>
            `;
        }).join('');

        const dotsHtml = this.showDots && this.items.length > 0 ? `
            <div class="carousel-dots" style="text-align: center; margin-top: 16px;">
                ${this.items.map((_, index) => `
                    <span class="carousel-dot" role="button" tabindex="0"
                          onclick="window.goToSlide&&window.goToSlide('${this.key}', ${index})"
                          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.goToSlide&&window.goToSlide('${this.key}', ${index});}"
                          style="display: inline-block; width: 12px; height: 12px; border-radius: 50%;
                                 margin: 0 4px; cursor: pointer;
                                 background-color: ${index === 0 ? '#007bff' : '#ccc'};"></span>
                `).join('')}
            </div>
        ` : '';

        const arrowsHtml = this.showArrows && this.items.length > 0 ? `
            <button type="button" class="carousel-prev" aria-label="이전"
                    onclick="window.previousSlide&&window.previousSlide('${this.key}')"
                    style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
                           background: rgba(0,0,0,0.5); color: white; border: none;
                           border-radius: 50%; width: 40px; height: 40px; cursor: pointer; z-index: 2;">‹</button>
            <button type="button" class="carousel-next" aria-label="다음"
                    onclick="window.nextSlide&&window.nextSlide('${this.key}')"
                    style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                           background: rgba(0,0,0,0.5); color: white; border: none;
                           border-radius: 50%; width: 40px; height: 40px; cursor: pointer; z-index: 2;">›</button>
        ` : '';

        const html = `
            <div style="${this.getBaseStyle()}" data-component="carousel" data-component-key="${this.key}" data-key="${this.key}"
                 data-carousel-autoplay="${this.autoPlay}" data-carousel-interval="${this.interval}">
                <div class="carousel-container" style="position: relative; border: 1px solid #e9ecef;
                                                      border-radius: 4px; overflow: hidden; background-color: white;
                                                      height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                    <div class="carousel-content" style="flex: 1; min-height: 0; padding: 8px; box-sizing: border-box;
                                                          display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${itemsHtml}
                    </div>
                    ${arrowsHtml}
                    ${dotsHtml}
                </div>
            </div>
        `;

        this._initializeElement();
        const out = this.doPolymorph(html);
        const mountKey = this.key;
        setTimeout(() => {
            if (typeof initCarouselInstance === 'function') initCarouselInstance(mountKey);
        }, 50);
        return out;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }
}

// =============================================================================
// Modal & Overlay Components (모달 및 오버레이 컴포넌트)
// =============================================================================

// 툴팁 컴포넌트
class XaTooltip extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', '툴팁 텍스트');
        this.position = this.getValue('position', 'top'); // top, bottom, left, right
        this.trigger = this.getValue('trigger', 'hover'); // hover, click
        this.delay = this.getValue('delay', 0);
        this.arrow = this.getValue('arrow', true);
        this.theme = this.getValue('theme', 'dark'); // dark, light
    }

    /** component-showcase-ext.html #27 — top / bottom / right hover bubbles */
    _renderShowcase() {
        const k = this.key;
        return `
            <div class="xa-ext-tooltip-host xa-ext-tooltip-host--showcase" style="${this.getBaseStyle()};" data-component="tooltip" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <p style="font-size:12px;color:var(--ink-3);margin-bottom:16px">Hover over each button:</p>
                <div class="tooltip-demo">
                    <div class="tooltip-wrap tip-top">
                        <div class="tooltip-target">Top</div>
                        <div class="tooltip-bubble">Tooltip on top ↑</div>
                    </div>
                    <div class="tooltip-wrap tip-bottom">
                        <div class="tooltip-target">Bottom</div>
                        <div class="tooltip-bubble">Tooltip below ↓</div>
                    </div>
                    <div class="tooltip-wrap tip-right">
                        <div class="tooltip-target">Right →</div>
                        <div class="tooltip-bubble">Tooltip on right</div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const tooltipId = `${this.key}_tooltip`;
        const arrowHtml = this.arrow ? '<div class="tooltip-arrow"></div>' : '';
        
        const html = `
            <div class="xa-ext-tooltip-host xa-ext-tooltip-host--single" style="${this.getBaseStyle()};" data-component="tooltip" data-component-key="${this.key}" data-key="${this.key}">
                <div class="tooltip-trigger" 
                     ${this.trigger === 'hover' ? 
                       `onmouseenter="showTooltip('${this.key}', ${this.delay})" 
                        onmouseleave="hideTooltip('${this.key}')"` : 
                       `onclick="toggleTooltip('${this.key}')"`}>
                    ${this.text}
                </div>
                <div id="${tooltipId}" class="tooltip tooltip-${this.theme} tooltip-${this.position}" 
                     style="position: absolute; display: none; z-index: 13100; padding: 8px 12px; 
                            border-radius: 4px; font-size: 14px; white-space: nowrap; pointer-events: none;
                            ${this.theme === 'dark' ? 
                              'background-color: rgba(0,0,0,0.8); color: white;' : 
                              'background-color: white; color: #333; border: 1px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'}">
                    ${this.text}
                    ${arrowHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        const root = document.querySelector('[data-component="tooltip"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 모달 컴포넌트
class XaModal extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.title = this.getValue('title', '모달 제목');
        this.content = this.getValue('content', '모달 내용');
        this.showCloseButton = this.getValue('showCloseButton', true);
        this.closeOnBackdrop = this.getValue('closeOnBackdrop', true);
        this.size = this.getValue('size', 'medium'); // small, medium, large, fullscreen
        this.animation = this.getValue('animation', 'fade'); // fade, slide, zoom
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'modal').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #28 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-modal-host xa-ext-modal-host--showcase" style="${this.getBaseStyle()};" data-component="modal" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <p style="font-size:12px;color:var(--ink-2);margin-bottom:16px">Layered dialog with backdrop blur, animation, and focus management.</p>
                <button type="button" class="modal-trigger-btn" id="openModal_${s}">Open Modal</button>
                <div class="modal-backdrop" id="modalBackdrop_${s}">
                    <div class="modal-box">
                        <div class="modal-header">
                            <h3>Confirm Action</h3>
                            <button type="button" class="modal-close" id="closeModal_${s}" aria-label="Close"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to permanently delete this project? This action cannot be undone and all associated data will be lost.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-sm btn-ghost" id="cancelModal_${s}">Cancel</button>
                            <button type="button" class="btn-sm btn-primary">Delete Project</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const modalId = `${this.key}_modal`;
        const closeButtonHtml = this.showCloseButton ? `
            <button class="modal-close" onclick="closeModal('${this.key}')" 
                    style="position: absolute; top: 16px; right: 16px; background: none; 
                           border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
        ` : '';
        
        let modalWidth = '500px';
        if (this.size === 'small') modalWidth = '300px';
        else if (this.size === 'large') modalWidth = '800px';
        else if (this.size === 'fullscreen') modalWidth = '95vw';
        
        const html = `
            <div class="xa-ext-modal-host xa-ext-modal-host--single" style="${this.getBaseStyle()};" data-component="modal" data-component-key="${this.key}" data-key="${this.key}">
                <button onclick="openModal('${this.key}')" 
                        style="padding: 8px 16px; background-color: #007bff; color: white; 
                               border: none; border-radius: 4px; cursor: pointer;">
                    모달 열기
                </button>
                
                <div id="${modalId}" class="modal-overlay" 
                     style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background-color: rgba(0,0,0,0.5); display: none; z-index: 1000; 
                            align-items: center; justify-content: center;"
                     ${this.closeOnBackdrop ? `onclick="closeModalOnBackdrop(event, '${this.key}')"` : ''}>
                    <div class="modal-content modal-${this.animation}" 
                         style="background: white; border-radius: 8px; padding: 24px; 
                                width: ${modalWidth}; max-height: 90vh; overflow-y: auto; 
                                position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);"
                         onclick="event.stopPropagation()">
                        ${closeButtonHtml}
                        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 20px;">${this.escapeHtml(this.title)}</h3>
                        <div class="modal-body" style="color: #666; line-height: 1.6;">
                            ${this.escapeHtml(this.content)}
                        </div>
                        <div class="modal-footer" style="margin-top: 24px; text-align: right;">
                            <button onclick="closeModal('${this.key}')" 
                                    style="padding: 8px 16px; background-color: #6c757d; color: white; 
                                           border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="modal"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-modal-showcase-init')) return;
        root.setAttribute('data-xa-ext-modal-showcase-init', '1');
        xaExtInitModalShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 검색바 컴포넌트
class XaSearchBar extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.placeholder = this.getValue('placeholder', '검색어를 입력하세요');
        this.showSearchButton = this.getValue('showSearchButton', true);
        this.showClearButton = this.getValue('showClearButton', true);
        this.searchIcon = this.getValue('searchIcon', '🔍');
        this.clearIcon = this.getValue('clearIcon', '×');
        this.debounceDelay = this.getValue('debounceDelay', 300);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'searchBar').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #29 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        const recent = xaExtSearchShowcaseRecentHtml();
        return `
            <div class="xa-ext-search-bar-host xa-ext-search-bar-host--showcase" style="${this.getBaseStyle()};" data-component="searchBar" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="search-outer" id="searchOuter_${s}">
                    <div class="search-input-wrap">
                        <span class="search-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                        <input class="search-field" id="searchField_${s}" type="search" autocomplete="off" placeholder="Search components…">
                        <button type="button" class="search-clear" id="searchClear_${s}" aria-label="Clear"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        <span class="search-kbd">⌘K</span>
                    </div>
                    <div class="search-results" id="searchResults_${s}">
                        ${recent}
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const searchButtonHtml = this.showSearchButton ? `
            <button class="search-button" onclick="performSearch('${this.key}')" 
                    style="position: absolute; right: ${this.showClearButton ? '40px' : '8px'}; 
                           top: 50%; transform: translateY(-50%); background: none; border: none; 
                           cursor: pointer; font-size: 16px; color: #666;">
                ${this.searchIcon}
            </button>
        ` : '';
        
        const clearButtonHtml = this.showClearButton ? `
            <button class="clear-button" onclick="clearSearch('${this.key}')" 
                    style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); 
                           background: none; border: none; cursor: pointer; font-size: 18px; 
                           color: #999; display: none;">
                ${this.clearIcon}
            </button>
        ` : '';
        
        const html = `
            <div class="xa-ext-search-bar-host xa-ext-search-bar-host--single" style="${this.getBaseStyle()};" data-component="searchBar" data-component-key="${this.key}" data-key="${this.key}">
                <div class="search-container" style="position: relative; width: 100%; height: 100%;">
                    <input type="text" id="${this.key}_input" 
                           placeholder="${this.escapeHtml(this.placeholder)}"
                           oninput="handleSearchInput('${this.key}', this.value, ${this.debounceDelay})"
                           onkeypress="handleSearchKeypress(event, '${this.key}')"
                           ${this.getClickHandler()}
                           style="width: 100%; height: 100%; border: 1px solid #ccc; border-radius: 4px; 
                                  padding: 8px 12px; padding-right: ${this.showSearchButton && this.showClearButton ? '80px' : 
                                                                   this.showSearchButton || this.showClearButton ? '40px' : '12px'}; 
                                  box-sizing: border-box; font-size: 14px;">
                    ${searchButtonHtml}
                    ${clearButtonHtml}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="searchBar"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-searchbar-showcase-init')) return;
        root.setAttribute('data-xa-ext-searchbar-showcase-init', '1');
        xaExtInitSearchBarShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 갤러리 컴포넌트
class XaGallery extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.images = this.getValue('images', []);
        this.columns = this.getValue('columns', 3);
        this.gap = this.getValue('gap', 8);
        this.showThumbnails = this.getValue('showThumbnails', true);
        this.allowZoom = this.getValue('allowZoom', true);
        this.showCaption = this.getValue('showCaption', true);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'gallery').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #30 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        const overlaySvg =
            '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
        const urls = [
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=70',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=70',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70',
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70'
        ];
        const items = urls
            .map(function (src) {
                return (
                    '<div class="gallery-item"><img src="' +
                    src +
                    '" alt=""><div class="gallery-item__overlay">' +
                    overlaySvg +
                    '</div></div>'
                );
            })
            .join('');
        return `
            <div class="xa-ext-gallery-host xa-ext-gallery-host--showcase" style="${this.getBaseStyle()};" data-component="gallery" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="gallery-grid" id="galleryGrid_${s}">
                    ${items}
                </div>
                <div class="lightbox" id="lightbox_${s}">
                    <img id="lightboxImg_${s}" src="" alt="">
                    <button type="button" class="lightbox-close" id="lightboxClose_${s}" aria-label="Close"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const imagesHtml = this.images.map((image, index) => {
            const caption = image.caption || image.alt || `이미지 ${index + 1}`;
            return `
                <div class="gallery-item" 
                     style="position: relative; cursor: pointer; border-radius: 4px; 
                            overflow: hidden; background: #f8f9fa;"
                     onclick="openGalleryModal('${this.key}', ${index})">
                    <img src="${image.src || image}" 
                         alt="${this.escapeHtml(caption)}"
                         style="width: 100%; height: 200px; object-fit: cover; display: block;">
                    ${this.showCaption ? `
                        <div class="gallery-caption" 
                             style="position: absolute; bottom: 0; left: 0; right: 0; 
                                    background: linear-gradient(transparent, rgba(0,0,0,0.7)); 
                                    color: white; padding: 16px 12px 8px; font-size: 14px;">
                            ${this.escapeHtml(caption)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        const html = `
            <div class="xa-ext-gallery-host xa-ext-gallery-host--single" style="${this.getBaseStyle()};" data-component="gallery" data-component-key="${this.key}" data-key="${this.key}">
                <div class="gallery-grid" 
                     style="display: grid; grid-template-columns: repeat(${this.columns}, 1fr); 
                            gap: ${this.gap}px; width: 100%; height: 100%;">
                    ${imagesHtml}
                </div>
                
                <!-- 갤러리 모달 -->
                <div id="${this.key}_gallery_modal" class="gallery-modal" 
                     style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.9); display: none; z-index: 1000; 
                            align-items: center; justify-content: center;"
                     onclick="closeGalleryModal('${this.key}')">
                    <div class="gallery-modal-content" style="position: relative; max-width: 90vw; max-height: 90vh;">
                        <img id="${this.key}_modal_image" 
                             style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        <button onclick="closeGalleryModal('${this.key}')" 
                                style="position: absolute; top: -40px; right: 0; background: none; 
                                       border: none; color: white; font-size: 30px; cursor: pointer;">×</button>
                        <button onclick="previousGalleryImage('${this.key}')" 
                                style="position: absolute; left: -60px; top: 50%; transform: translateY(-50%); 
                                       background: rgba(255,255,255,0.2); border: none; color: white; 
                                       font-size: 24px; padding: 12px; border-radius: 50%; cursor: pointer;">‹</button>
                        <button onclick="nextGalleryImage('${this.key}')" 
                                style="position: absolute; right: -60px; top: 50%; transform: translateY(-50%); 
                                       background: rgba(255,255,255,0.2); border: none; color: white; 
                                       font-size: 24px; padding: 12px; border-radius: 50%; cursor: pointer;">›</button>
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="gallery"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-gallery-showcase-init')) return;
        root.setAttribute('data-xa-ext-gallery-showcase-init', '1');
        xaExtInitGalleryShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// QR 코드 컴포넌트
class XaQrCode extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', 'https://example.com');
        this.size = this.getValue('size', 200);
        this.errorCorrectionLevel = this.getValue('errorCorrectionLevel', 'M'); // L, M, Q, H
        this.foregroundColor = this.getValue('foregroundColor', '#000000');
        this.backgroundColor = this.getValue('backgroundColor', '#FFFFFF');
        this.showText = this.getValue('showText', true);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'qrCode').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #31 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-qr-code-host xa-ext-qr-code-host--showcase" style="${this.getBaseStyle()};" data-component="qrCode" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="qr-wrap">
                    <canvas class="qr-canvas" id="qrCanvas_${s}" width="180" height="180"></canvas>
                    <div class="qr-input-row">
                        <input class="f-input" id="qrInput_${s}" value="https://xamong.com" style="font-size:12px">
                        <button type="button" class="qr-gen-btn" id="qrBtn_${s}">Generate</button>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const text = String(this.text || '');
        const size = Math.max(64, Math.min(512, Number(this.size) || 200));
        const ecc = (this.errorCorrectionLevel || 'M').toUpperCase();
        const fg = (this.foregroundColor || '#000000').replace(/^#/, '');
        const bg = (this.backgroundColor || '#FFFFFF').replace(/^#/, '');
        const qrOpts = { key: this.key, text: text, size: size, ecc: ecc, fg: fg, bg: bg };
        const qrOptsAttr = JSON.stringify(qrOpts).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = `
            <div class="xa-ext-qr-code-host xa-ext-qr-code-host--single" style="${this.getBaseStyle()};" data-component="qrCode" data-component-key="${this.key}" data-key="${this.key}" data-qr-opts="${qrOptsAttr}">
                <div class="qr-code-container" style="text-align: center; padding: 16px;">
                    <div id="${this.key}_qr" style="display: inline-block; margin-bottom: 8px;"></div>
                    ${this.showText ? `
                        <div class="qr-text" style="font-size: 12px; color: #666; word-break: break-all;">
                            ${this.escapeHtml(this.text)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="qrCode"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-qrcode-showcase-init')) return;
        root.setAttribute('data-xa-ext-qrcode-showcase-init', '1');
        const s = this._showcaseIdSuffix();
        const canvas = root.querySelector('#qrCanvas_' + s);
        const input = root.querySelector('#qrInput_' + s);
        const btn = root.querySelector('#qrBtn_' + s);
        function run() {
            xaExtDrawQRShowcase(canvas, input ? input.value : 'https://xamong.com');
        }
        if (btn) btn.addEventListener('click', run);
        run();
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 바코드 컴포넌트
class XaBarcode extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', '1234567890');
        this.format = this.getValue('format', 'CODE128'); // CODE128, EAN13, UPC, etc.
        this.width = this.getValue('width', 2);
        this.height = this.getValue('height', 100);
        this.displayValue = this.getValue('displayValue', true);
        this.fontSize = this.getValue('fontSize', 14);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'barcode').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #32 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-barcode-host xa-ext-barcode-host--showcase" style="${this.getBaseStyle()};" data-component="barcode" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <div class="barcode-wrap">
                    <canvas class="barcode-canvas" id="barcodeCanvas_${s}" width="280" height="80"></canvas>
                    <p class="barcode-text" id="barcodeText_${s}">8 8 0 1 2 3 4 5 6 7 8 9</p>
                    <div class="qr-input-row">
                        <input class="f-input" id="barcodeInput_${s}" value="880123456789" maxlength="13" style="font-size:12px;font-family:'Syne Mono',monospace">
                        <button type="button" class="qr-gen-btn" id="barcodeBtn_${s}">Draw</button>
                    </div>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const html = `
            <div class="xa-ext-barcode-host xa-ext-barcode-host--single" style="${this.getBaseStyle()};" data-component="barcode" data-component-key="${this.key}" data-key="${this.key}">
                <div class="barcode-container" style="text-align: center; padding: 16px;">
                    <div id="${this.key}_barcode" style="display: inline-block;"></div>
                </div>
                <script>
                    // 바코드 생성 (실제 구현에서는 바코드 라이브러리 필요)
                    generateBarcode('${this.key}', '${this.escapeHtml(this.text)}', '${this.format}', 
                                  ${this.width}, ${this.height}, ${this.displayValue}, ${this.fontSize});
                </script>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="barcode"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-barcode-showcase-init')) return;
        root.setAttribute('data-xa-ext-barcode-showcase-init', '1');
        const s = this._showcaseIdSuffix();
        const canvas = root.querySelector('#barcodeCanvas_' + s);
        const textEl = root.querySelector('#barcodeText_' + s);
        const input = root.querySelector('#barcodeInput_' + s);
        const btn = root.querySelector('#barcodeBtn_' + s);
        function run() {
            xaExtDrawBarcodeShowcase(canvas, textEl, input ? input.value : '880123456789');
        }
        if (btn) btn.addEventListener('click', run);
        run();
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// 서명 패드 컴포넌트
class XaSignaturePad extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.penColor = this.getValue('penColor', '#000000');
        this.penWidth = this.getValue('penWidth', 2);
        this.backgroundColor = this.getValue('backgroundColor', '#FFFFFF');
        this.showClearButton = this.getValue('showClearButton', true);
        this.showSaveButton = this.getValue('showSaveButton', true);
    }

    _showcaseIdSuffix() {
        return String(this.key != null ? this.key : 'signaturePad').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /** component-showcase-ext.html #33 */
    _renderShowcase() {
        const k = this.key;
        const s = this._showcaseIdSuffix();
        return `
            <div class="xa-ext-signature-pad-host xa-ext-signature-pad-host--showcase" style="${this.getBaseStyle()};" data-component="signaturePad" data-component-key="${k}" data-key="${k}" data-ext-showcase="1">
                <canvas class="sig-canvas" id="sigCanvas_${s}"></canvas>
                <p class="sig-hint" id="sigHint_${s}">Sign in the area above</p>
                <div class="sig-toolbar">
                    <div class="sig-color-row" id="sigColors_${s}">
                        <div class="color-swatch sig-color-dot selected" style="background:#F0EEF8;width:20px;height:20px" data-color="#F0EEF8"></div>
                        <div class="color-swatch sig-color-dot" style="background:#7C6AF7;width:20px;height:20px" data-color="#7C6AF7"></div>
                        <div class="color-swatch sig-color-dot" style="background:#34D399;width:20px;height:20px" data-color="#34D399"></div>
                        <div class="color-swatch sig-color-dot" style="background:#F87171;width:20px;height:20px" data-color="#F87171"></div>
                    </div>
                    <div class="sig-thickness">
                        <label>Size</label>
                        <input type="range" id="sigSize_${s}" min="1" max="10" value="2" style="width:60px">
                    </div>
                    <button type="button" class="sig-clear" id="sigClear_${s}">Clear</button>
                    <button type="button" class="sig-save" id="sigSave_${s}">Save PNG</button>
                </div>
            </div>`;
    }
    
    render() {
        if (xaExtIsShowcase(this)) {
            const html = this._renderShowcase();
            this._initializeElement();
            return this.doPolymorph(html);
        }
        const pos = this.parsedPos;
        const canvasWidth = pos.width || 400;
        const canvasHeight = pos.height || 200;
        
        const clearButtonHtml = this.showClearButton ? `
            <button onclick="clearSignature('${this.key}')" 
                    style="padding: 6px 12px; background-color: #dc3545; color: white; 
                           border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                지우기
            </button>
        ` : '';
        
        const saveButtonHtml = this.showSaveButton ? `
            <button onclick="saveSignature('${this.key}')" 
                    style="padding: 6px 12px; background-color: #28a745; color: white; 
                           border: none; border-radius: 4px; cursor: pointer;">
                저장
            </button>
        ` : '';
        
        const html = `
            <div class="xa-ext-signature-pad-host xa-ext-signature-pad-host--single" style="${this.getBaseStyle()};" data-component="signaturePad" data-component-key="${this.key}" data-key="${this.key}">
                <div class="signature-container" style="border: 1px solid #ccc; border-radius: 4px; 
                                                        background: ${this.backgroundColor};">
                    <canvas id="${this.key}_canvas" 
                            width="${canvasWidth}" height="${canvasHeight}"
                            style="display: block; cursor: crosshair; touch-action: none;"
                            onmousedown="startSignature(event, '${this.key}')"
                            onmousemove="drawSignature(event, '${this.key}')"
                            onmouseup="endSignature('${this.key}')"
                            ontouchstart="startSignature(event, '${this.key}')"
                            ontouchmove="drawSignature(event, '${this.key}')"
                            ontouchend="endSignature('${this.key}')">
                    </canvas>
                    <div class="signature-controls" style="padding: 8px; text-align: center; 
                                                           border-top: 1px solid #eee;">
                        ${clearButtonHtml}
                        ${saveButtonHtml}
                    </div>
                </div>
            </div>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }

    onLoadComplete() {
        if (typeof super.onLoadComplete === 'function') {
            super.onLoadComplete();
        }
        if (!xaExtIsShowcase(this)) return;
        const root = document.querySelector('[data-component="signaturePad"][data-key="' + String(this.key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!root || root.getAttribute('data-xa-ext-signaturepad-showcase-init')) return;
        root.setAttribute('data-xa-ext-signaturepad-showcase-init', '1');
        xaExtInitSignaturePadShowcase(root, this._showcaseIdSuffix());
        const reflow = typeof window !== 'undefined' ? window.xaAlReflowAlLayoutAncestors : null;
        if (typeof reflow === 'function' && root) reflow(root);
    }
}

// =============================================================================
// Extended Component Factory Registration (확장 컴포넌트 팩토리 등록)
// =============================================================================

// 기존 ComponentFactory에 확장 컴포넌트 추가
if (typeof ComponentFactory !== 'undefined') {
    // 확장 컴포넌트 클래스 등록
    Object.assign(ComponentFactory.componentClasses, {
        // 입력 컴포넌트
        [ExtendedComponentType.PASSWORD_FIELD]: XaPasswordField,
        [ExtendedComponentType.TEXTAREA]: XaTextarea,
        [ExtendedComponentType.SELECT]: XaSelect,
        [ExtendedComponentType.SLIDER]: XaSlider,
        [ExtendedComponentType.SWITCH]: XaSwitch,
        [ExtendedComponentType.COLOR_PICKER]: XaColorPicker,
        [ExtendedComponentType.DATE_PICKER]: XaDatePicker,
        [ExtendedComponentType.TIME_PICKER]: XaTimePicker,
        [ExtendedComponentType.FILE_PICKER]: XaFilePicker,
        [ExtendedComponentType.IMAGE_PICKER]: XaImagePicker,
        [ExtendedComponentType.RATING]: XaRating,
        
        // 표시 컴포넌트
        [ExtendedComponentType.PROGRESS_BAR]: XaProgressBar,
        [ExtendedComponentType.SPINNER]: XaSpinner,
        [ExtendedComponentType.BADGE]: XaBadge,
        [ExtendedComponentType.AVATAR]: XaAvatar,
        [ExtendedComponentType.ICON]: XaIcon,
        [ExtendedComponentType.DIVIDER]: XaDivider,
        [ExtendedComponentType.ALERT]: XaAlert,
        [ExtendedComponentType.TOOLTIP]: XaTooltip,
        [ExtendedComponentType.MODAL]: XaModal,
        
        // 레이아웃 컴포넌트
        [ExtendedComponentType.TABS]: XaTabs,
        [ExtendedComponentType.ACCORDION]: XaAccordion,
        [ExtendedComponentType.GRID]: XaGrid,
        [ExtendedComponentType.FLEX_BOX]: XaFlexBox,
        [ExtendedComponentType.STACK]: XaStack,
        [ExtendedComponentType.SPACER]: XaSpacer,
        [ExtendedComponentType.CARD]: XaCard,
        
        // 고급 컴포넌트
        [ExtendedComponentType.SEARCH_BAR]: XaSearchBar,
        [ExtendedComponentType.TREE_VIEW]: XaTreeView,
        [ExtendedComponentType.CAROUSEL]: XaCarousel,
        [ExtendedComponentType.GALLERY]: XaGallery,
        [ExtendedComponentType.QR_CODE]: XaQrCode,
        [ExtendedComponentType.BARCODE]: XaBarcode,
        [ExtendedComponentType.SIGNATURE_PAD]: XaSignaturePad
    });
}

// ComponentType에 확장 타입 추가
if (typeof ComponentType !== 'undefined') {
    Object.assign(ComponentType, ExtendedComponentType);
}

// =============================================================================
// Extended Component Helper Functions (확장 컴포넌트 헬퍼 함수)
// =============================================================================

// 비밀번호 표시/숨기기 토글 (component-showcase-ext.html — SVG 아이콘 스왑)
function togglePassword(key) {
    const input = document.getElementById(key);
    if (!input) return;
    const button = input.nextElementSibling;
    if (!button) return;
    const eyeIcon = button.querySelector('svg');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    if (eyeIcon) {
        eyeIcon.innerHTML = show
            ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
            : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    } else {
        button.textContent = show ? '🙈' : '👁️';
    }
}

// 슬라이더 값 업데이트 (렌더 id: key + '~value' 또는 쇼케이스/AL · key + '~sv')
function updateSliderValue(key, value) {
    const id = String(key);
    const el = document.getElementById(id + '~value') || document.getElementById(id + '~sv');
    if (el) el.textContent = value;
}

// 탭 전환 (variant, tabPosition에 따라 스타일 적용)
function switchXaTabs(tabsKey, tabIndex) {
    const tabsContainer = document.querySelector(`[data-key="${tabsKey}"]`);
    if (!tabsContainer) return;
    const headers = tabsContainer.querySelectorAll('.tab-header');
    const contents = tabsContainer.querySelectorAll('.tab-content');
    const variant = tabsContainer.getAttribute('data-tabs-variant') || 'default';
    const pos = tabsContainer.getAttribute('data-tabs-position') || 'top';
    const radiusByPos = { top: '4px 4px 0 0', bottom: '0 0 4px 4px', left: '4px 0 0 4px', right: '0 4px 4px 0' }[pos] || '4px 4px 0 0';
    const underlineSide = { top: 'borderBottom', bottom: 'borderTop', left: 'borderRight', right: 'borderLeft' }[pos] || 'borderBottom';

    headers.forEach((header, index) => {
        const isActive = index === tabIndex;
        header.classList.toggle('active', isActive);
        header.style.borderTop = 'none';
        header.style.borderRight = 'none';
        header.style.borderBottom = 'none';
        header.style.borderLeft = 'none';
        if (variant === 'underline') {
            header.style.backgroundColor = 'transparent';
            header.style.color = isActive ? '#007bff' : '#6b7280';
            header.style.border = 'none';
            header.style[underlineSide] = '2px solid ' + (isActive ? '#007bff' : 'transparent');
            header.style.borderRadius = '0';
        } else if (variant === 'pills') {
            header.style.backgroundColor = isActive ? '#007bff' : '#e9ecef';
            header.style.color = isActive ? 'white' : '#495057';
            header.style.borderRadius = '20px';
        } else {
            header.style.backgroundColor = isActive ? '#007bff' : '#f8f9fa';
            header.style.color = isActive ? 'white' : '#333';
            header.style.border = '1px solid #ddd';
            header.style.borderRadius = radiusByPos;
        }
    });

    contents.forEach((content, index) => {
        content.style.display = index === tabIndex ? 'block' : 'none';
    });
}

// 컬러 피커 관련 함수들
function updateColorPreview(key, color) {
    const preview = document.querySelector(`[data-key="${key}"] .color-preview`);
    const hexInput = document.getElementById(String(key) + '~hex');
    
    if (preview) {
        preview.style.backgroundColor = color;
    }
    if (hexInput) {
        hexInput.value = color;
    }
}

function updateColorFromHex(key, hexColor) {
    const colorInput = document.getElementById(key);
    const preview = document.querySelector(`[data-key="${key}"] .color-preview`);
    
    if (colorInput && /^#[0-9A-F]{6}$/i.test(hexColor)) {
        colorInput.value = hexColor;
        if (preview) {
            preview.style.backgroundColor = hexColor;
        }
    }
}

// 파일 피커 관련 함수들
function handleFileSelect(key, files) {
    const preview = document.getElementById(String(key) + '~preview');
    const previewContent = preview.querySelector('.preview-content');
    
    if (!preview || !previewContent) return;
    
    previewContent.innerHTML = '';
    
    if (files.length === 0) {
        preview.style.display = 'none';
        return;
    }
    
    preview.style.display = 'block';
    
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px; padding: 4px; background-color: #f8f9fa; border-radius: 4px;';
        
        const fileIcon = file.type.startsWith('image/') ? '🖼️' : 
                        file.type.startsWith('video/') ? '🎥' : 
                        file.type.startsWith('audio/') ? '🎵' : '📄';
        
        fileItem.innerHTML = `
            <span style="margin-right: 8px;">${fileIcon}</span>
            <span style="flex: 1; font-size: 14px;">${file.name}</span>
            <span style="font-size: 12px; color: #666;">${formatFileSize(file.size)}</span>
        `;
        
        previewContent.appendChild(fileItem);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 평점 관련 함수들
function setRating(key, rating) {
    const container = document.querySelector(`[data-key="${key}"] .rating-stars`);
    const stars = container.querySelectorAll('.rating-star');
    
    container.setAttribute('data-value', rating);
    
    stars.forEach((star, index) => {
        const filled = (index + 1) <= rating;
        star.style.color = filled ? '#ffc107' : '#e9ecef';
    });
}

function highlightRating(key, rating) {
    const stars = document.querySelectorAll(`[data-key="${key}"] .rating-star`);
    
    stars.forEach((star, index) => {
        const highlighted = (index + 1) <= rating;
        star.style.color = highlighted ? '#ffc107' : '#e9ecef';
    });
}

function resetRating(key) {
    const container = document.querySelector(`[data-key="${key}"] .rating-stars`);
    const currentRating = parseInt(container.getAttribute('data-value'));
    const stars = container.querySelectorAll('.rating-star');
    
    stars.forEach((star, index) => {
        const filled = (index + 1) <= currentRating;
        star.style.color = filled ? '#ffc107' : '#e9ecef';
    });
}

// 알림 관련 함수들
function dismissAlert(key) {
    const alertElement = document.querySelector(`[data-key="${key}"]`);
    if (alertElement) {
        alertElement.style.display = 'none';
    }
}

// 아코디언 관련 함수들 (콘텐츠 id: key + '~content~' + index)
function toggleAccordion(accordionKey, itemIndex, multiple) {
    const container = document.querySelector(`[data-key="${accordionKey}"]`);
    const content = document.getElementById(`${accordionKey}~content~${itemIndex}`);
    const arrow = container.querySelector(`.accordion-item:nth-child(${itemIndex + 1}) .accordion-arrow`);
    
    const isOpen = content.style.display === 'block';
    
    if (!multiple) {
        // 단일 모드: 다른 모든 아이템 닫기
        const allContents = container.querySelectorAll('.accordion-content');
        const allArrows = container.querySelectorAll('.accordion-arrow');
        
        allContents.forEach(c => c.style.display = 'none');
        allArrows.forEach(a => a.style.transform = 'rotate(0deg)');
    }
    
    // 현재 아이템 토글
    content.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}

// 트리 뷰 관련 함수들
function toggleTreeNode(treeKey, nodePath) {
    const container = document.querySelector(`[data-key="${treeKey}"]`);
    // 실제 구현에서는 컴포넌트 인스턴스의 expandedNodes 배열을 수정해야 함
    XCON.log(`Toggle tree node: ${treeKey}, path: ${nodePath}`);
}

// 캐러셀 관련 함수들 (인라인 onclick / 모듈 번들 환경 모두에서 동작하도록 window에도 등록)
const xaCarouselSlideStates = new Map();
const xaCarouselInitializedRoots = new WeakSet();

function getXaCarouselRoot(carouselKey) {
    const k = String(carouselKey);
    const nodes = document.querySelectorAll('[data-component="carousel"]');
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].getAttribute('data-key') === k) return nodes[i];
    }
    return document.querySelector('[data-key="' + k.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
}

function clearXaCarouselTimer(root) {
    if (root && root._xaCarouselTimer) {
        clearInterval(root._xaCarouselTimer);
        root._xaCarouselTimer = null;
    }
}

function syncXaCarouselVisual(carouselKey) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root) return;
    const items = root.querySelectorAll('.carousel-content .carousel-item');
    const dots = root.querySelectorAll('.carousel-dot');
    const n = items.length;
    if (n === 0) return;
    let st = xaCarouselSlideStates.get(carouselKey);
    if (!st) {
        st = { index: 0 };
        xaCarouselSlideStates.set(carouselKey, st);
    }
    st.index = Math.max(0, Math.min(n - 1, st.index));
    items.forEach((el, i) => {
        el.style.display = i === st.index ? 'block' : 'none';
    });
    dots.forEach((dot, i) => {
        dot.style.backgroundColor = i === st.index ? '#007bff' : '#ccc';
    });
}

function restartXaCarouselAutoplay(carouselKey) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root || root.dataset.carouselAutoplay !== 'true') return;
    clearXaCarouselTimer(root);
    const items = root.querySelectorAll('.carousel-content .carousel-item');
    const n = items.length;
    if (n <= 1) return;
    const interval = parseInt(root.dataset.carouselInterval || '3000', 10) || 3000;
    root._xaCarouselTimer = setInterval(() => {
        if (!document.body.contains(root)) {
            clearXaCarouselTimer(root);
            return;
        }
        nextSlide(carouselKey);
    }, interval);
}

function initCarouselInstance(carouselKey) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root) return;
    if (xaCarouselInitializedRoots.has(root)) {
        syncXaCarouselVisual(carouselKey);
        return;
    }
    xaCarouselInitializedRoots.add(root);
    if (!xaCarouselSlideStates.has(carouselKey)) {
        xaCarouselSlideStates.set(carouselKey, { index: 0 });
    }
    syncXaCarouselVisual(carouselKey);

    if (root.dataset.carouselAutoplay === 'true') {
        restartXaCarouselAutoplay(carouselKey);
        root.addEventListener('mouseenter', () => clearXaCarouselTimer(root));
        root.addEventListener('mouseleave', () => restartXaCarouselAutoplay(carouselKey));
    }

    root.addEventListener('click', (e) => {
        if (e.target.closest('.carousel-prev, .carousel-next, .carousel-dot')) {
            restartXaCarouselAutoplay(carouselKey);
        }
    });
}

function nextSlide(carouselKey) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root) return;
    const items = root.querySelectorAll('.carousel-content .carousel-item');
    const n = items.length;
    if (n === 0) return;
    let st = xaCarouselSlideStates.get(carouselKey);
    if (!st) {
        st = { index: 0 };
        xaCarouselSlideStates.set(carouselKey, st);
    }
    st.index = (st.index + 1) % n;
    syncXaCarouselVisual(carouselKey);
}

function previousSlide(carouselKey) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root) return;
    const items = root.querySelectorAll('.carousel-content .carousel-item');
    const n = items.length;
    if (n === 0) return;
    let st = xaCarouselSlideStates.get(carouselKey);
    if (!st) {
        st = { index: 0 };
        xaCarouselSlideStates.set(carouselKey, st);
    }
    st.index = st.index === 0 ? n - 1 : st.index - 1;
    syncXaCarouselVisual(carouselKey);
}

function goToSlide(carouselKey, slideIndex) {
    const root = getXaCarouselRoot(carouselKey);
    if (!root) return;
    const items = root.querySelectorAll('.carousel-content .carousel-item');
    const n = items.length;
    if (n === 0) return;
    let idx = parseInt(slideIndex, 10);
    if (!Number.isFinite(idx)) return;
    idx = Math.max(0, Math.min(n - 1, idx));
    let st = xaCarouselSlideStates.get(carouselKey);
    if (!st) {
        st = { index: 0 };
        xaCarouselSlideStates.set(carouselKey, st);
    }
    st.index = idx;
    syncXaCarouselVisual(carouselKey);
}

window.nextSlide = nextSlide;
window.previousSlide = previousSlide;
window.goToSlide = goToSlide;
window.initCarouselInstance = initCarouselInstance;

// 툴팁 관련 함수들
function showTooltip(key, delay = 0) {
    setTimeout(() => {
        const tooltip = document.getElementById(`${key}_tooltip`);
        if (tooltip) {
            tooltip.style.display = 'block';
            positionTooltip(key);
        }
    }, delay);
}

function hideTooltip(key) {
    const tooltip = document.getElementById(`${key}_tooltip`);
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function toggleTooltip(key) {
    const tooltip = document.getElementById(`${key}_tooltip`);
    if (tooltip) {
        const isVisible = tooltip.style.display === 'block';
        tooltip.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            positionTooltip(key);
        }
    }
}

function positionTooltip(key) {
    const trigger = document.querySelector(`[data-key="${key}"] .tooltip-trigger`);
    const tooltip = document.getElementById(`${key}_tooltip`);
    
    if (!trigger || !tooltip) return;
    
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // 기본 위치 설정 (실제 구현에서는 position 속성에 따라 조정)
    tooltip.style.left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`;
    tooltip.style.top = `${triggerRect.top - tooltipRect.height - 8}px`;
}

// 모달 관련 함수들
function openModal(key) {
    const modal = document.getElementById(`${key}_modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }
}

function closeModal(key) {
    const modal = document.getElementById(`${key}_modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // 배경 스크롤 복원
    }
}

function closeModalOnBackdrop(event, key) {
    if (event.target === event.currentTarget) {
        closeModal(key);
    }
}

// 검색바 관련 함수들
let searchTimeouts = {};

function handleSearchInput(key, value, debounceDelay) {
    const clearButton = document.querySelector(`[data-key="${key}"] .clear-button`);
    
    // 클리어 버튼 표시/숨김
    if (clearButton) {
        clearButton.style.display = value ? 'block' : 'none';
    }
    
    // 디바운스 처리
    if (searchTimeouts[key]) {
        clearTimeout(searchTimeouts[key]);
    }
    
    searchTimeouts[key] = setTimeout(() => {
        performSearch(key, value);
    }, debounceDelay);
}

function handleSearchKeypress(event, key) {
    if (event.key === 'Enter') {
        const input = document.getElementById(`${key}_input`);
        performSearch(key, input.value);
    }
}

function performSearch(key, query) {
    if (!query) {
        const input = document.getElementById(`${key}_input`);
        query = input.value;
    }
    
    XCON.log(`검색 실행: ${key}, 검색어: ${query}`);
    // 실제 구현에서는 검색 로직 실행
}

function clearSearch(key) {
    const input = document.getElementById(`${key}_input`);
    const clearButton = document.querySelector(`[data-key="${key}"] .clear-button`);
    
    if (input) {
        input.value = '';
        input.focus();
    }
    
    if (clearButton) {
        clearButton.style.display = 'none';
    }
    
    // 검색 결과 초기화
    performSearch(key, '');
}

// 갤러리 관련 함수들
let currentGalleryIndex = {};

function openGalleryModal(key, imageIndex) {
    const modal = document.getElementById(`${key}_gallery_modal`);
    const image = document.getElementById(`${key}_modal_image`);
    const component = document.querySelector(`[data-key="${key}"]`);
    
    if (!modal || !image || !component) return;
    
    // 이미지 정보 가져오기 (실제 구현에서는 컴포넌트 인스턴스에서 가져와야 함)
    const images = getGalleryImages(key);
    
    if (images && images[imageIndex]) {
        currentGalleryIndex[key] = imageIndex;
        const imageData = images[imageIndex];
        image.src = imageData.src || imageData;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeGalleryModal(key) {
    const modal = document.getElementById(`${key}_gallery_modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function previousGalleryImage(key) {
    const images = getGalleryImages(key);
    if (!images) return;
    
    const currentIndex = currentGalleryIndex[key] || 0;
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    
    updateGalleryImage(key, newIndex);
}

function nextGalleryImage(key) {
    const images = getGalleryImages(key);
    if (!images) return;
    
    const currentIndex = currentGalleryIndex[key] || 0;
    const newIndex = (currentIndex + 1) % images.length;
    
    updateGalleryImage(key, newIndex);
}

function updateGalleryImage(key, index) {
    const image = document.getElementById(`${key}_modal_image`);
    const images = getGalleryImages(key);
    
    if (image && images && images[index]) {
        currentGalleryIndex[key] = index;
        const imageData = images[index];
        image.src = imageData.src || imageData;
    }
}

function getGalleryImages(key) {
    // 실제 구현에서는 컴포넌트 인스턴스에서 images 배열을 가져와야 함
    const component = document.querySelector(`[data-key="${key}"]`);
    if (component) {
        const imgs = component.querySelectorAll('.gallery-item img');
        return Array.from(imgs).map(img => ({ src: img.src, alt: img.alt }));
    }
    return [];
}

// QR 코드 관련 함수들 (실제 QR 표시: API 이미지 또는 내장 캔버스 생성)
function generateQRCode(keyOrOpts, text, size) {
    console.log('generateQRCode', keyOrOpts, text, size);

    const opts = typeof keyOrOpts === 'object' && keyOrOpts !== null
        ? keyOrOpts
        : { key: keyOrOpts, text: text, size: size, ecc: 'M', fg: '000000', bg: 'ffffff' };
    const key = opts.key;
    const data = String(opts.text != null ? opts.text : '');
    const pixelSize = Math.max(64, Math.min(512, Number(opts.size) || 200));
    const ecc = String(opts.ecc || 'M').toUpperCase().replace(/[^LMQH]/, 'M');
    const fgHex = (opts.fg || '000000').replace(/^#/, '');
    const bgHex = (opts.bg || 'ffffff').replace(/^#/, '');

    const container = document.getElementById(key + '_qr');
    if (!container) return;

    function showPlaceholder() {
        container.innerHTML = '<div style="width:' + pixelSize + 'px;height:' + pixelSize + 'px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:1px solid #ccc;font-size:12px;color:#666;box-sizing:border-box;">QR<br/>' + (data.length > 15 ? data.substring(0, 15) + '…' : data) + '</div>';
    }

    if (typeof window.QRCode === 'function') {
        try {
            container.innerHTML = '';
            new window.QRCode(container, {
                text: data,
                width: pixelSize,
                height: pixelSize,
                colorDark: '#' + fgHex,
                colorLight: '#' + bgHex
            });
            return;
        } catch (e) {
            if (typeof XCON !== 'undefined' && XCON.log) XCON.log('QRCode lib error:', e);
        }
    }

    if (typeof window.QRCode !== 'undefined' && typeof window.QRCode.toCanvas === 'function') {
        try {
            const canvas = document.createElement('canvas');
            container.innerHTML = '';
            container.appendChild(canvas);
            window.QRCode.toCanvas(canvas, data, {
                width: pixelSize,
                margin: 1,
                color: { dark: '#' + fgHex, light: '#' + bgHex },
                errorCorrectionLevel: ecc
            }, function (err) {
                if (err) { container.innerHTML = ''; showPlaceholder(); }
            });
            return;
        } catch (e) {
            if (typeof XCON !== 'undefined' && XCON.log) XCON.log('QRCode.toCanvas error:', e);
        }
    }

    try {
        const url = 'https://api.qrserver.com/v1/create-qr-code/?' + [
            'size=' + pixelSize + 'x' + pixelSize,
            'data=' + encodeURIComponent(data),
            'ecc=' + ecc,
            'color=' + encodeURIComponent(fgHex),
            'bgcolor=' + encodeURIComponent(bgHex)
        ].join('&');
        const img = document.createElement('img');
        img.setAttribute('alt', 'QR code');
        img.style.width = pixelSize + 'px';
        img.style.height = pixelSize + 'px';
        img.style.display = 'block';
        img.onerror = showPlaceholder;
        container.innerHTML = '';
        container.appendChild(img);
        img.src = url;
    } catch (e) {
        showPlaceholder();
    }
}

function initQrCodeElements(root) {
    const el = root && root.nodeType === 1 ? root : document;
    const nodes = el.querySelectorAll ? el.querySelectorAll('[data-qr-opts]') : [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const raw = node.getAttribute('data-qr-opts');
        if (!raw) continue;
        try {
            const opts = JSON.parse(raw);
            if (typeof generateQRCode === 'function') generateQRCode(opts);
            node.removeAttribute('data-qr-opts');
        } catch (e) {}
    }
}

function startQrCodeObserver() {
    if (window._xamongQrObserverStarted) return;
    window._xamongQrObserverStarted = true;
    function run(added) {
        for (let i = 0; i < added.length; i++) {
            const n = added[i];
            if (n.nodeType === 1) {
                if (n.getAttribute && n.getAttribute('data-qr-opts')) initQrCodeElements(n);
                if (n.querySelectorAll) initQrCodeElements(n);
            }
        }
    }
    if (document.body) {
        initQrCodeElements(document.body);
        try {
            const mo = new MutationObserver(function (mutations) {
                for (let m = 0; m < mutations.length; m++) {
                    run(mutations[m].addedNodes || []);
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });
        } catch (e) {}
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            initQrCodeElements(document.body);
            try {
                const mo = new MutationObserver(function (mutations) {
                    for (let m = 0; m < mutations.length; m++) run(mutations[m].addedNodes || []);
                });
                mo.observe(document.body, { childList: true, subtree: true });
            } catch (e) {}
        });
    }
}

/*
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startQrCodeObserver);
    } else {
        startQrCodeObserver();
    }
}
*/

// 바코드 관련 함수들
function generateBarcode(key, text, format, width, height, displayValue, fontSize) {
    const container = document.getElementById(`${key}_barcode`);
    if (!container) return;
    
    // 실제 구현에서는 바코드 라이브러리 사용 (예: JsBarcode)
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="width: ${width * 50}px; height: ${height}px; background: 
                        repeating-linear-gradient(to right, #000 0px, #000 ${width}px, 
                        #fff ${width}px, #fff ${width * 2}px); margin: 0 auto;"></div>
            ${displayValue ? `<div style="font-size: ${fontSize}px; margin-top: 4px;">${text}</div>` : ''}
        </div>
    `;
    
    XCON.log(`바코드 생성: ${key}, 텍스트: ${text}, 형식: ${format}`);
}

// 서명 패드 관련 함수들
let signatureData = {};

function startSignature(event, key) {
    event.preventDefault();
    const canvas = document.getElementById(`${key}_canvas`);
    const ctx = canvas.getContext('2d');
    
    if (!signatureData[key]) {
        signatureData[key] = { drawing: false, ctx: ctx };
    }
    
    signatureData[key].drawing = true;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - rect.left;
    const y = (event.clientY || event.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function drawSignature(event, key) {
    event.preventDefault();
    const data = signatureData[key];
    if (!data || !data.drawing) return;
    
    const canvas = document.getElementById(`${key}_canvas`);
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - rect.left;
    const y = (event.clientY || event.touches[0].clientY) - rect.top;
    
    data.ctx.lineTo(x, y);
    data.ctx.stroke();
}

function endSignature(key) {
    const data = signatureData[key];
    if (data) {
        data.drawing = false;
    }
}

function clearSignature(key) {
    const canvas = document.getElementById(`${key}_canvas`);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignature(key) {
    const canvas = document.getElementById(`${key}_canvas`);
    const dataURL = canvas.toDataURL('image/png');
    
    XCON.log(`서명 저장: ${key}`);
    XCON.log(`데이터 URL: ${dataURL.substring(0, 50)}...`);
    
    // 실제 구현에서는 서버로 전송하거나 로컬 저장
}

// =============================================================================
// Export for Module Systems (모듈 시스템용 내보내기)
// =============================================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ExtendedComponentType,
        // 입력 컴포넌트
        XaPasswordField,
        XaTextarea,
        XaSelect,
        XaSlider,
        XaSwitch,
        XaColorPicker,
        XaDatePicker,
        XaTimePicker,
        XaFilePicker,
        XaImagePicker,
        XaRating,
        // 표시 컴포넌트
        XaProgressBar,
        XaSpinner,
        XaBadge,
        XaAvatar,
        XaIcon,
        XaDivider,
        XaAlert,
        XaTooltip,
        XaModal,
        // 레이아웃 컴포넌트
        XaTabs,
        XaAccordion,
        XaGrid,
        XaFlexBox,
        XaStack,
        XaSpacer,
        XaCard,
        // 고급 컴포넌트
        XaSearchBar,
        XaTreeView,
        XaCarousel,
        XaGallery,
        XaQrCode,
        XaBarcode,
        XaSignaturePad,
        // 헬퍼 함수들
        togglePassword,
        updateSliderValue,
        switchXaTabs,
        updateColorPreview,
        updateColorFromHex,
        handleFileSelect,
        formatFileSize,
        handleImageSelect,
        getImagePickerPreviewPosition,
        checkPreviewEmpty,
        resizeImage,
        applyCrop,
        cancelCrop,
        setRating,
        highlightRating,
        resetRating,
        dismissAlert,
        toggleAccordion,
        toggleTreeNode,
        nextSlide,
        previousSlide,
        goToSlide,
        initCarouselInstance,
        // 새로 추가된 헬퍼 함수들
        showTooltip,
        hideTooltip,
        toggleTooltip,
        positionTooltip,
        openModal,
        closeModal,
        closeModalOnBackdrop,
        handleSearchInput,
        handleSearchKeypress,
        performSearch,
        clearSearch,
        openGalleryModal,
        closeGalleryModal,
        previousGalleryImage,
        nextGalleryImage,
        updateGalleryImage,
        getGalleryImages,
        generateQRCode,
        generateBarcode,
        startSignature,
        drawSignature,
        endSignature,
        clearSignature,
        saveSignature
    };
}

// 확장 컴포넌트 시스템 로드 완료 로그
XCON.log('🎨 Xamong UI Components Extension System loaded successfully!');
XCON.log('📦 Extended components available:', Object.keys(ExtendedComponentType)); 

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 이미지 피커 관련 함수들
function handleImageSelect(key, files) {
    const preview = document.getElementById(String(key) + '~preview');
    const previewContainer = preview.querySelector('.preview-container');
    
    if (!preview || !previewContainer) return;
    
    // 컴포넌트 정보 가져오기
    const componentElement = document.querySelector(`[data-key="${key}"]`);
    const previewPosition = getImagePickerPreviewPosition(key);
    const isCompact = getImagePickerCompactMode(key);
    
    previewContainer.innerHTML = '';
    
    if (files.length === 0) {
        preview.style.display = 'none';
        return;
    }
    
    preview.style.display = 'block';
    
    Array.from(files).forEach((file, index) => {
        if (!file.type.startsWith('image/')) {
            XCON.warn(`파일 ${file.name}은 이미지가 아닙니다.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            
            // 컴팩트 모드에 따른 스타일 조정
            let itemStyle, imgStyle;
            
            if (isCompact) {
                // 컴팩트 모드: 우측 미리보기와 하단 미리보기 구분
                if (previewPosition === 'right') {
                    // 컴팩트 우측 미리보기: 세로로 쌓이는 작은 이미지
                    itemStyle = `position: relative; display: block; margin-bottom: 4px; width: 100%;
                               border: 1px solid #e9ecef; border-radius: 3px; overflow: hidden;
                               background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1);`;
                    imgStyle = `width: 100%; height: 30px; object-fit: cover; display: block;`;
                } else {
                    // 컴팩트 하단 미리보기: 매우 작은 이미지
                    itemStyle = `position: relative; display: inline-block; margin: 2px;
                               border: 1px solid #e9ecef; border-radius: 4px; overflow: hidden;
                               background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1);`;
                    imgStyle = `width: 40px; height: 40px; object-fit: cover; display: block;`;
                }
            } else if (previewPosition === 'right') {
                // 우측 레이아웃: 가로형 이미지
                itemStyle = `position: relative; display: block; margin-bottom: 8px; width: 100%;
                           border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden;
                           background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
                imgStyle = `width: 100%; height: 80px; object-fit: cover; display: block;`;
            } else {
                // 하단 레이아웃: 정사각형 이미지
                itemStyle = `position: relative; display: inline-block; margin: 4px;
                           border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden;
                           background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
                imgStyle = `width: 120px; height: 120px; object-fit: cover; display: block;`;
            }
            
            imageItem.style.cssText = itemStyle;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = imgStyle;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7); color: white; display: none;
                align-items: center; justify-content: center; flex-direction: column;
                font-size: ${isCompact ? '10px' : '12px'}; text-align: center; padding: ${isCompact ? '4px' : '8px'};
            `;
            
            // 파일 정보 표시
            const fileInfo = document.createElement('div');
            if (isCompact) {
                // 컴팩트 모드: 우측과 하단 구분
                if (previewPosition === 'right') {
                    // 컴팩트 우측: 가로형 간단 정보
                    fileInfo.innerHTML = `
                        <div style="display: flex; align-items: center; width: 100%; font-size: 8px;">
                            <span style="font-weight: bold; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${file.name.length > 12 ? file.name.substring(0, 9) + '...' : file.name}
                            </span>
                        </div>
                    `;
                } else {
                    // 컴팩트 하단: 파일명만 간단히
                    fileInfo.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 2px;">
                            ${file.name.length > 8 ? file.name.substring(0, 5) + '...' : file.name}
                        </div>
                    `;
                }
            } else if (previewPosition === 'right') {
                // 우측 레이아웃: 가로형 정보 표시
                fileInfo.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <span style="font-weight: bold; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name}
                        </span>
                        <span style="font-size: 10px; opacity: 0.8; margin-left: 8px;">
                            ${formatFileSize(file.size)}
                        </span>
                    </div>
                `;
            } else {
                // 하단 레이아웃: 세로형 정보 표시
                const fileName = document.createElement('div');
                fileName.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
                fileName.style.cssText = 'margin-bottom: 4px; font-weight: bold;';
                
                const fileSize = document.createElement('div');
                fileSize.textContent = formatFileSize(file.size);
                fileSize.style.cssText = 'font-size: 10px; opacity: 0.8;';
                
                fileInfo.appendChild(fileName);
                fileInfo.appendChild(fileSize);
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '제거';
            removeBtn.style.cssText = `
                margin-top: ${isCompact ? '2px' : '4px'}; padding: ${isCompact ? '1px 4px' : '2px 6px'}; 
                background: #dc3545; border: none; border-radius: 3px; color: white; 
                font-size: ${isCompact ? '8px' : '10px'}; cursor: pointer;
            `;
            removeBtn.onclick = function(e) {
                e.stopPropagation();
                imageItem.remove();
                checkPreviewEmpty(key);
            };
            
            overlay.appendChild(fileInfo);
            overlay.appendChild(removeBtn);
            
            imageItem.appendChild(img);
            imageItem.appendChild(overlay);
            
            // 호버 이벤트
            imageItem.onmouseenter = function() {
                overlay.style.display = 'flex';
            };
            imageItem.onmouseleave = function() {
                overlay.style.display = 'none';
            };
            
            previewContainer.appendChild(imageItem);
        };
        
        reader.readAsDataURL(file);
    });
}

// 이미지 피커의 previewPosition 옵션 가져오기
function getImagePickerPreviewPosition(key) {
    // XCON 데이터에서 previewPosition 값을 가져오는 로직
    // 실제 구현에서는 컴포넌트 인스턴스에서 값을 가져와야 함
    const componentElement = document.querySelector(`[data-key="${key}"]`);
    if (componentElement) {
        const container = componentElement.querySelector('.image-picker-container');
        if (container && container.style.display === 'flex') {
            return 'right';
        }
    }
    return 'bottom';
}

// 이미지 피커의 컴팩트 모드 확인
function getImagePickerCompactMode(key) {
    const componentElement = document.querySelector(`[data-key="${key}"]`);
    if (componentElement) {
        const pos = componentElement.style;
        // 컴포넌트 크기를 통해 컴팩트 모드 판단
        const rect = componentElement.getBoundingClientRect();
        return rect.width < 200 || rect.height < 100;
    }
    return false;
}

function checkPreviewEmpty(key) {
    const preview = document.getElementById(String(key) + '~preview');
    const previewContainer = preview.querySelector('.preview-container');
    
    if (previewContainer.children.length === 0) {
        preview.style.display = 'none';
    }
}

function resizeImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            let { width, height } = img;
            
            // 비율 유지하면서 크기 조정
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, file.type, quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

function applyCrop(key) {
    const modal = document.getElementById(key + '_crop_modal');
    const canvas = document.getElementById(key + '_crop_canvas');
    
    // 크롭 적용 로직 (실제 구현에서는 크롭 라이브러리 사용)
    XCON.log('크롭 적용:', key);
    
    modal.style.display = 'none';
}

function cancelCrop(key) {
    const modal = document.getElementById(key + '_crop_modal');
    modal.style.display = 'none';
}
