
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpanGrid = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.2.1";

  const BorderDirection = Object.freeze({
    None: 0,
    Top: 1,
    Bottom: 2,
    Right: 4,
    Left: 8,
    All: 1 | 2 | 4 | 8,
  });

  function rect(x = 0, y = 0, width = 0, height = 0) {
    return { x, y, width, height };
  }

  function rectRight(value) {
    return value.x + value.width;
  }

  function rectBottom(value) {
    return value.y + value.height;
  }

  function rectContainsPoint(value, x, y) {
    return x >= value.x && y >= value.y && x < rectRight(value) && y < rectBottom(value);
  }

  function rectUnion(first, second) {
    const x = Math.min(first.x, second.x);
    const y = Math.min(first.y, second.y);
    const right = Math.max(rectRight(first), rectRight(second));
    const bottom = Math.max(rectBottom(first), rectBottom(second));
    return rect(x, y, right - x, bottom - y);
  }

  function rectIntersects(first, second) {
    return (
      first.x < rectRight(second) &&
      rectRight(first) > second.x &&
      first.y < rectBottom(second) &&
      rectBottom(first) > second.y
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function normalizeZoom(value) {
    const zoom = Number(value);
    if (!Number.isFinite(zoom) || zoom <= 0) return 1;
    return clamp(zoom, 0.25, 4);
  }

  function normalizeScrollMode(value) {
    return value === "cell" ? "cell" : "pixel";
  }

  function normalizeLineStyle(value) {
    return ["Solid", "Dash", "Dot"].includes(value) ? value : "Solid";
  }

  function normalizeLineWidth(value) {
    const width = Number(value);
    if (!Number.isFinite(width) || width <= 0) return 1;
    return Math.max(1, Math.round(width));
  }

  function normalizePasteOverflow(value) {
    return value === "expand" ? "expand" : "truncate";
  }

  function normalizeCellMode(value) {
    return value === "html" ? "html" : "default";
  }

  function borderSideBit(side) {
    if (side === "left") return BorderDirection.Left;
    if (side === "right") return BorderDirection.Right;
    if (side === "top") return BorderDirection.Top;
    if (side === "bottom") return BorderDirection.Bottom;
    return BorderDirection.None;
  }

  function borderColorForSide(border, side) {
    if (side === "left") return border.leftColor;
    if (side === "right") return border.rightColor;
    if (side === "top") return border.topColor;
    if (side === "bottom") return border.bottomColor;
    return border.leftColor;
  }

  function borderSideName(side, suffix) {
    return `${side}${suffix}`;
  }

  function borderLineStyleForSide(border, side) {
    return normalizeLineStyle(border[borderSideName(side, "LineStyle")] ?? border.lineStyle);
  }

  function borderLineWidthForSide(border, side) {
    return normalizeLineWidth(border[borderSideName(side, "LineWidth")] ?? border.lineWidth);
  }

  function setBorderColorForSide(border, side, color) {
    if (side === "left") border.leftColor = color;
    if (side === "right") border.rightColor = color;
    if (side === "top") border.topColor = color;
    if (side === "bottom") border.bottomColor = color;
  }

  function serializeBorder(border) {
    if (!border) return null;
    return {
      leftColor: border.leftColor,
      rightColor: border.rightColor,
      topColor: border.topColor,
      bottomColor: border.bottomColor,
      borderDirection: border.borderDirection,
      lineStyle: border.lineStyle,
      lineWidth: border.lineWidth,
      leftLineStyle: border.leftLineStyle,
      rightLineStyle: border.rightLineStyle,
      topLineStyle: border.topLineStyle,
      bottomLineStyle: border.bottomLineStyle,
      leftLineWidth: border.leftLineWidth,
      rightLineWidth: border.rightLineWidth,
      topLineWidth: border.topLineWidth,
      bottomLineWidth: border.bottomLineWidth,
      inheritUnspecified: border.inheritUnspecified,
    };
  }

  function deserializeBorder(value) {
    if (!value) return null;
    return value instanceof SpanGridBorder ? value.clone() : new SpanGridBorder(value);
  }

  function serializeCell(cell) {
    return {
      text: cell.text,
      mode: normalizeCellMode(cell.mode),
      name: cell.name,
      backColor: cell.backColor,
      foreColor: cell.foreColor,
      font: cell.font,
      textAlign: cell.textAlign,
      backgroundImageUrl: cell.backgroundImageUrl,
      backgroundImageLayout: cell.backgroundImageLayout,
      backgroundImageAlign: cell.backgroundImageAlign,
      border: serializeBorder(cell.border),
    };
  }

  function applySerializedCell(cell, value = {}) {
    if ("text" in value) cell.text = String(value.text ?? "");
    if ("mode" in value) cell.mode = normalizeCellMode(value.mode);
    if ("name" in value) cell.name = String(value.name ?? "");
    if ("backColor" in value) cell.backColor = (value.backColor != null && value.backColor !== '') ? value.backColor : "#ffffff";
    if ("foreColor" in value) cell.foreColor = (value.foreColor != null && value.foreColor !== '') ? value.foreColor : "#000000";
    if ("font" in value) cell.font = value.font || "9pt sans-serif";
    if ("textAlign" in value) cell.textAlign = value.textAlign || "MiddleCenter";
    if ("backgroundImageUrl" in value) cell.backgroundImageUrl = value.backgroundImageUrl || "";
    if ("backgroundImageLayout" in value) cell.backgroundImageLayout = value.backgroundImageLayout || "None";
    if ("backgroundImageAlign" in value) cell.backgroundImageAlign = value.backgroundImageAlign || "TopLeft";
    if ("border" in value) cell.border = deserializeBorder(value.border);
  }

  function paddingForBorderStyle(borderStyle) {
    if (borderStyle === "FixedSingle") return 1;
    if (borderStyle === "Fixed3D") return 2;
    return 0;
  }

  class SpanGridCell {
    constructor(options = {}) {
      this.backColor = options.backColor || "#ffffff";
      this.backgroundImage = options.backgroundImage || null;
      this.backgroundImageUrl = options.backgroundImageUrl || "";
      this.backgroundImageLayout = options.backgroundImageLayout || "None";
      this.backgroundImageAlign = options.backgroundImageAlign || "TopLeft";
      this.border = options.border ?? null;
      this.bounds = rect();
      this.font = options.font || "9pt sans-serif";
      this.foreColor = options.foreColor || "#000000";
      this.mode = normalizeCellMode(options.mode);
      this.name = options.name || "";
      this.span = false;
      this.text = options.text || "";
      this.textAlign = options.textAlign || "MiddleCenter";
      this.visible = true;
      this.row = null;
      this.col = null;
      this.tag = options.tag;
    }

    clone() {
      return new SpanGridCell({
        backColor: this.backColor,
        backgroundImage: this.backgroundImage,
        backgroundImageUrl: this.backgroundImageUrl,
        backgroundImageLayout: this.backgroundImageLayout,
        backgroundImageAlign: this.backgroundImageAlign,
        border: this.border ? this.border.clone() : null,
        font: this.font,
        foreColor: this.foreColor,
        mode: this.mode,
        name: this.name,
        text: this.text,
        textAlign: this.textAlign,
        tag: this.tag,
      });
    }
  }

  class SpanGridRow {
    static CELL_HEIGHT = 26;
    static MIN_HEIGHT = 10;

    constructor(options = {}) {
      this.height = options.height || SpanGridRow.CELL_HEIGHT;
      this.cells = [];
      this.customCellFactory = options.customCellFactory || null;
      this.border = options.border ?? null;
      this.grid = null;
    }

    createCell() {
      return this.customCellFactory ? this.customCellFactory() : new SpanGridCell();
    }

    clone() {
      return new SpanGridRow({ height: this.height, customCellFactory: this.customCellFactory, border: this.border ? this.border.clone() : null });
    }
  }

  class SpanGridCol {
    static CELL_WIDTH = 50;
    static MIN_WIDTH = 10;

    constructor(options = {}) {
      this.width = options.width || SpanGridCol.CELL_WIDTH;
      this.border = options.border ?? null;
      this.grid = null;
    }

    clone() {
      return new SpanGridCol({ width: this.width, border: this.border ? this.border.clone() : null });
    }
  }

  class SpanGridMerge {
    constructor(sCell = null, eCell = null) {
      this.sCell = sCell;
      this.eCell = eCell;
    }
  }

  class SpanGridFixed {
    constructor(row = null, col = null) {
      this.row = row;
      this.col = col;
      this.rowIndex = -1;
      this.colIndex = -1;
    }
  }

  /**
   * Canvas 2D API 의 서브셋을 SVG 요소 스트림으로 변환하는 경량 컨텍스트.
   * SpanGridCanvasView.draw() 가 사용하는 메서드만 구현되어 있다.
   */
  class SvgContext {
    constructor(width, height) {
      this._w = width;
      this._h = height;
      this._parts = [];   // SVG 요소 문자열 배열
      this._defs  = [];   // <defs> 안에 들어갈 clipPath 등
      this._seq   = 0;    // clipPath ID 시퀀스
      this._path  = [];   // 현재 path 세그먼트
      this._s     = this._fresh();
      this._stack = [];   // save/restore 스택
    }

    _fresh() {
      return {
        fill: '#ffffff', stroke: '#000000',
        lw: 1, alpha: 1,
        font: '10px sans-serif', ta: 'start', tb: 'alphabetic',
        dash: [], clip: null,
        m: [1, 0, 0, 1, 0, 0],  // [a,b,c,d,e,f] 아핀 변환행렬
      };
    }

    // ── 프로퍼티 ────────────────────────────────────────────────────────────
    set fillStyle(v)   { this._s.fill   = v; }
    get fillStyle()    { return this._s.fill; }
    set strokeStyle(v) { this._s.stroke = v; }
    get strokeStyle()  { return this._s.stroke; }
    set lineWidth(v)   { this._s.lw     = v; }
    get lineWidth()    { return this._s.lw; }
    set globalAlpha(v) { this._s.alpha  = v; }
    get globalAlpha()  { return this._s.alpha; }
    set font(v)        { this._s.font   = v; }
    get font()         { return this._s.font; }
    set textAlign(v)   { this._s.ta     = v; }
    get textAlign()    { return this._s.ta; }
    set textBaseline(v){ this._s.tb     = v; }
    get textBaseline() { return this._s.tb; }

    // ── 변환 ────────────────────────────────────────────────────────────────
    /** 행렬 합성: M × N */
    _mul(M, N) {
      return [
        M[0]*N[0]+M[2]*N[1], M[1]*N[0]+M[3]*N[1],
        M[0]*N[2]+M[2]*N[3], M[1]*N[2]+M[3]*N[3],
        M[0]*N[4]+M[2]*N[5]+M[4], M[1]*N[4]+M[3]*N[5]+M[5],
      ];
    }

    setTransform(a, b, c, d, e, f) { this._s.m = [a, b, c, d, e, f]; }
    scale(sx, sy)     { this._s.m = this._mul(this._s.m, [sx,0,0,sy,0,0]); }
    translate(tx, ty) { this._s.m = this._mul(this._s.m, [1,0,0,1,tx,ty]); }

    /** 좌표 변환 */
    _pt(x, y) {
      const m = this._s.m;
      return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
    }

    // ── 상태 저장/복원 ───────────────────────────────────────────────────────
    save() {
      this._stack.push(Object.assign({}, this._s, { m: this._s.m.slice(), dash: this._s.dash.slice() }));
    }
    restore() {
      if (this._stack.length) this._s = this._stack.pop();
    }

    // ── 패스 ────────────────────────────────────────────────────────────────
    beginPath() { this._path = []; }

    moveTo(x, y) {
      const [px, py] = this._pt(x, y);
      this._path.push(`M${this._r(px)},${this._r(py)}`);
    }
    lineTo(x, y) {
      const [px, py] = this._pt(x, y);
      this._path.push(`L${this._r(px)},${this._r(py)}`);
    }
    rect(x, y, w, h) {
      const [x1, y1] = this._pt(x,   y  );
      const [x2, y2] = this._pt(x+w, y+h);
      const rx = Math.min(x1,x2), ry = Math.min(y1,y2);
      const rw = Math.abs(x2-x1), rh = Math.abs(y2-y1);
      this._path.push(`M${this._r(rx)},${this._r(ry)}h${this._r(rw)}v${this._r(rh)}h${this._r(-rw)}Z`);
    }

    _pd() { return this._path.join(''); }

    clip() {
      const d = this._pd();
      if (!d) return;
      const id = `vc${this._seq++}`;
      this._defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`);
      this._s.clip = id;
    }

    stroke() {
      const d = this._pd();
      if (!d) return;
      this._out(
        `<path d="${d}" fill="none" stroke="${this._e(this._s.stroke)}" stroke-width="${this._r(this._s.lw)}"${this._da()} stroke-linecap="square"${this._aa()}${this._ca()}/>`
      );
    }

    // ── 기본 도형 ────────────────────────────────────────────────────────────
    _tr(x, y, w, h) {
      const [x1,y1] = this._pt(x,   y  );
      const [x2,y2] = this._pt(x+w, y+h);
      return { x:Math.min(x1,x2), y:Math.min(y1,y2), w:Math.abs(x2-x1), h:Math.abs(y2-y1) };
    }

    clearRect() { /* no-op */ }

    fillRect(x, y, w, h) {
      const b = this._tr(x,y,w,h);
      this._out(
        `<rect x="${this._r(b.x)}" y="${this._r(b.y)}" width="${this._r(b.w)}" height="${this._r(b.h)}" fill="${this._e(this._s.fill)}"${this._aa()}${this._ca()}/>`
      );
    }

    strokeRect(x, y, w, h) {
      const b = this._tr(x,y,w,h);
      this._out(
        `<rect x="${this._r(b.x)}" y="${this._r(b.y)}" width="${this._r(b.w)}" height="${this._r(b.h)}" fill="none" stroke="${this._e(this._s.stroke)}" stroke-width="${this._r(this._s.lw)}"${this._da()}${this._aa()}${this._ca()}/>`
      );
    }

    // ── 텍스트 ───────────────────────────────────────────────────────────────
    fillText(text, x, y /*, maxWidth – 클립으로 처리 */) {
      if (!text) return;
      const [px, py] = this._pt(x, y);
      const anchor =
        this._s.ta === 'center' ? 'middle' :
        this._s.ta === 'right'  ? 'end'    : 'start';
      const baseline =
        this._s.tb === 'top'    ? 'hanging'         :
        this._s.tb === 'bottom' ? 'text-after-edge' :
        this._s.tb === 'middle' ? 'central'         : 'auto';
      this._out(
        `<text x="${this._r(px)}" y="${this._r(py)}" style="font:${this._e(this._s.font)}" fill="${this._e(this._s.fill)}" text-anchor="${anchor}" dominant-baseline="${baseline}"${this._aa()}${this._ca()}>${this._e(text)}</text>`
      );
    }

    // ── 선 스타일 ─────────────────────────────────────────────────────────────
    setLineDash(arr) { this._s.dash = Array.isArray(arr) ? arr.slice() : []; }

    // ── 내부 헬퍼 ────────────────────────────────────────────────────────────
    _out(el) { this._parts.push(el); }
    _r(v)    { return Math.round(v * 100) / 100; }
    _e(s)    { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    _ca()    { return this._s.clip ? ` clip-path="url(#${this._s.clip})"` : ''; }
    _aa()    { const a = this._s.alpha; return (a != null && a < 1) ? ` opacity="${this._r(a)}"` : ''; }
    _da()    { const d = this._s.dash; return (d && d.length) ? ` stroke-dasharray="${d.map(v=>this._r(v)).join(',')}"` : ''; }

    // ── 최종 SVG 문자열 생성 ──────────────────────────────────────────────────
    toSVGString() {
      const defs = this._defs.length ? `<defs>${this._defs.join('')}</defs>` : '';
      return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${this._w}" height="${this._h}" viewBox="0 0 ${this._w} ${this._h}">` +
        defs + this._parts.join('') +
        `</svg>`
      );
    }
  }

  class SpanGridBorder {
    constructor(options = {}) {
      const color = options.color || "#a0a0a0";
      this.leftColor = options.leftColor || color;
      this.rightColor = options.rightColor || color;
      this.topColor = options.topColor || color;
      this.bottomColor = options.bottomColor || color;
      this.borderDirection = options.borderDirection ?? BorderDirection.All;
      this.lineStyle = normalizeLineStyle(options.lineStyle);
      this.lineWidth = normalizeLineWidth(options.lineWidth);
      this.leftLineStyle = options.leftLineStyle;
      this.rightLineStyle = options.rightLineStyle;
      this.topLineStyle = options.topLineStyle;
      this.bottomLineStyle = options.bottomLineStyle;
      this.leftLineWidth = options.leftLineWidth;
      this.rightLineWidth = options.rightLineWidth;
      this.topLineWidth = options.topLineWidth;
      this.bottomLineWidth = options.bottomLineWidth;
      this.inheritUnspecified = Boolean(options.inheritUnspecified);
    }

    clone() {
      return new SpanGridBorder({
        leftColor: this.leftColor,
        rightColor: this.rightColor,
        topColor: this.topColor,
        bottomColor: this.bottomColor,
        borderDirection: this.borderDirection,
        lineStyle: this.lineStyle,
        lineWidth: this.lineWidth,
        leftLineStyle: this.leftLineStyle,
        rightLineStyle: this.rightLineStyle,
        topLineStyle: this.topLineStyle,
        bottomLineStyle: this.bottomLineStyle,
        leftLineWidth: this.leftLineWidth,
        rightLineWidth: this.rightLineWidth,
        topLineWidth: this.topLineWidth,
        bottomLineWidth: this.bottomLineWidth,
        inheritUnspecified: this.inheritUnspecified,
      });
    }

    setColor(color) {
      this.leftColor = color;
      this.rightColor = color;
      this.topColor = color;
      this.bottomColor = color;
      return this;
    }

    setLineStyle(lineStyle) {
      const nextStyle = normalizeLineStyle(lineStyle);
      this.lineStyle = nextStyle;
      this.leftLineStyle = nextStyle;
      this.rightLineStyle = nextStyle;
      this.topLineStyle = nextStyle;
      this.bottomLineStyle = nextStyle;
      return this;
    }

    setLineWidth(lineWidth) {
      const nextWidth = normalizeLineWidth(lineWidth);
      this.lineWidth = nextWidth;
      this.leftLineWidth = nextWidth;
      this.rightLineWidth = nextWidth;
      this.topLineWidth = nextWidth;
      this.bottomLineWidth = nextWidth;
      return this;
    }

    setSide(side, options = {}) {
      if (options.color != null) setBorderColorForSide(this, side, options.color);
      if (options.lineStyle != null) this[borderSideName(side, "LineStyle")] = normalizeLineStyle(options.lineStyle);
      if (options.lineWidth != null) this[borderSideName(side, "LineWidth")] = normalizeLineWidth(options.lineWidth);
      const sideBit = borderSideBit(side);
      if (options.visible === true) this.borderDirection |= sideBit;
      if (options.visible === false) this.borderDirection &= ~sideBit;
      return this;
    }
  }

  class SpanGridControl {
    constructor(options = {}) {
      this.width = options.width || 400;
      this.height = options.height || 200;
      this.rows = [];
      this.cols = [];
      this.merges = [];
      this.fixed = options.fixed || new SpanGridFixed();
      this.borderStyle = options.borderStyle || "Fixed3D";
      this.borderDirection = options.borderDirection ?? BorderDirection.All;
      this.borderColor = options.borderColor || "#000000";
      this.backColor = options.backColor || "#ffffff";
      this.gridBorder =
        options.gridBorder ||
        new SpanGridBorder({
          color: options.lineColor || "#a0a0a0",
          lineStyle: options.lineStyle || "Solid",
          lineWidth: options.lineWidth || 1,
        });
      this.lineColor = options.lineColor || this.gridBorder.leftColor;
      this.lineStyle = options.lineStyle || this.gridBorder.lineStyle;
      this.focusColor = options.focusColor || "#3b82f6"; //"#d22f27";
      this.selectionFillAlpha = options.selectionFillAlpha ?? 0.12;
      this.expand = Boolean(options.expand);
      this.autoScroll = options.autoScroll !== false;
      this.zoom = normalizeZoom(options.zoom ?? 1);
      this.scrollMode = normalizeScrollMode(options.scrollMode);
      // XAMONG-FIX: 0이 falsy이므로 || 대신 null 체크 사용 (scrollBarSize=0 명시 시 0으로 보존)
      this.scrollBarSize = options.scrollBarSize != null ? options.scrollBarSize : 16;
      this.reserveScrollbarInViewport = options.reserveScrollbarInViewport === true;
      this.fitCellWidth = options.fitCellWidth || 150;
      this.fitCellHeight = options.fitCellHeight || 100;
      this.scrollX = 0;
      this.scrollY = 0;
      this.scrollMaxX = 0;
      this.scrollMaxY = 0;
      this.hScrollVisible = false;
      this.vScrollVisible = false;
      this.clientRect = rect();
      this.viewportRect = rect();
      /** Inner client area (width/height minus border padding) before optional scrollbar reserve. Same units as width/height. */
      this.innerLayoutWidth = 0;
      this.innerLayoutHeight = 0;
      this.fixedWidth = 0;
      this.fixedHeight = 0;
      this.gridWidth = 0;
      this.gridHeight = 0;
      this.selectedObjects = [];
      this.selectedCell = null;
      this.selectedRow = null;
      this.selectedCol = null;
      this.selectedBorderLine = null;
      this._cellClickHandlers = [];
      this._selectionChangeHandlers = [];
    }

    addRow(row = new SpanGridRow()) {
      row.grid = this;
      this.rows.push(row);
      this._ensureRowCells(row);
      this.layout();
      return row;
    }

    addCol(col = new SpanGridCol()) {
      col.grid = this;
      this.cols.push(col);
      for (const row of this.rows) {
        this._ensureRowCells(row);
      }
      this.layout();
      return col;
    }

    getCell(rowIndex, colIndex) {
      if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) return null;
      if (rowIndex < 0 || rowIndex >= this.rows.length) return null;
      if (colIndex < 0 || colIndex >= this.cols.length) return null;
      return this.rows[rowIndex].cells[colIndex] || null;
    }

    cellIndex(cell) {
      if (!cell || !cell.row) return { row: -1, col: -1 };
      return {
        row: this.rows.indexOf(cell.row),
        col: cell.row.cells.indexOf(cell),
      };
    }

    layout() {
      const padding = paddingForBorderStyle(this.borderStyle);
      const contentWidth = this.cols.reduce((sum, col) => sum + col.width, 0) + this.cols.length + 1;
      const contentHeight = this.rows.reduce((sum, row) => sum + row.height, 0) + this.rows.length + 1;
      const availableWidth = Math.max(0, this.width - padding * 2);
      const availableHeight = Math.max(0, this.height - padding * 2);
      this.innerLayoutWidth = availableWidth;
      this.innerLayoutHeight = availableHeight;

      this.clientRect = rect(
        padding,
        padding,
        this.expand ? availableWidth : contentWidth,
        this.expand ? availableHeight : contentHeight
      );

      let viewportWidth = availableWidth;
      let viewportHeight = availableHeight;
      if (this.autoScroll && !this.expand) {
        if (this.reserveScrollbarInViewport) {
          let hVisible = contentWidth * this.zoom > viewportWidth;
          let vVisible = contentHeight * this.zoom > viewportHeight;
          if (vVisible) hVisible = contentWidth * this.zoom > Math.max(0, viewportWidth - this.scrollBarSize);
          if (hVisible) vVisible = contentHeight * this.zoom > Math.max(0, viewportHeight - this.scrollBarSize);
          if (vVisible) viewportWidth = Math.max(0, viewportWidth - this.scrollBarSize);
          if (hVisible) viewportHeight = Math.max(0, viewportHeight - this.scrollBarSize);
          this.hScrollVisible = hVisible;
          this.vScrollVisible = vVisible;
        } else {
          this.hScrollVisible = contentWidth * this.zoom > viewportWidth;
          this.vScrollVisible = contentHeight * this.zoom > viewportHeight;
        }
      } else {
        this.hScrollVisible = false;
        this.vScrollVisible = false;
      }

      this.viewportRect = rect(padding, padding, viewportWidth, viewportHeight);
      this.scrollMaxX = Math.max(0, this.clientRect.width - this.viewportRect.width / this.zoom);
      this.scrollMaxY = Math.max(0, this.clientRect.height - this.viewportRect.height / this.zoom);
      this.scrollX = Math.max(0, Math.min(this.scrollX, this.scrollMaxX));
      this.scrollY = Math.max(0, Math.min(this.scrollY, this.scrollMaxY));

      this.gridWidth = this.expand ? this.clientRect.width : contentWidth;
      this.gridHeight = this.expand ? this.clientRect.height : contentHeight;
      this._layoutCells();
      this._layoutMerges();
      this._layoutFixedRegions();
      return this;
    }

    setZoom(zoom) {
      this.zoom = normalizeZoom(zoom);
      this.layout();
      return this.zoom;
    }

    setZoomPercent(percent) {
      return this.setZoom(Number(percent) / 100);
    }

    getZoomPercent() {
      return Math.round(this.zoom * 100);
    }

    setScrollMode(mode) {
      this.scrollMode = normalizeScrollMode(mode);
      this.scrollTo(this.scrollX, this.scrollY);
      return this.scrollMode;
    }

    mergeCells(row1, col1, row2, col2) {
      const startRow = Math.min(row1, row2);
      const endRow = Math.max(row1, row2);
      const startCol = Math.min(col1, col2);
      const endCol = Math.max(col1, col2);
      const sCell = this.getCell(startRow, startCol);
      const eCell = this.getCell(endRow, endCol);
      if (!sCell || !eCell) {
        throw new RangeError("Cannot merge cells outside the grid.");
      }
      const merge = new SpanGridMerge(sCell, eCell);
      this.merges.push(merge);
      this.layout();
      return merge;
    }

    splitCell(cell) {
      const index = this.merges.findIndex((merge) => merge.sCell === cell);
      if (index === -1) return false;
      this.merges.splice(index, 1);
      this.layout();
      return true;
    }

    splitSelectedCell() {
      return this.selectedCell ? this.splitCell(this.selectedCell) : false;
    }

    onCellClick(handler) {
      this._cellClickHandlers.push(handler);
      return () => {
        const index = this._cellClickHandlers.indexOf(handler);
        if (index !== -1) this._cellClickHandlers.splice(index, 1);
      };
    }

    selectCell(rowOrCell, colIndex) {
      const cell = rowOrCell instanceof SpanGridCell ? rowOrCell : this.getCell(rowOrCell, colIndex);
      if (!cell) return null;
      this.selectedCell = cell;
      this.selectedRow = null;
      this.selectedCol = null;
      this.selectedBorderLine = null;
      this.selectedObjects = [cell];
      const row = this.rows.indexOf(cell.row);
      const col = cell.row ? cell.row.cells.indexOf(cell) : -1;
      const args = { row, col, cell };
      for (const handler of this._cellClickHandlers.slice()) {
        handler(args);
      }
      this._emitSelectionChange({ type: "cell", row, col, cell, objects: this.selectedObjects.slice() });
      return cell;
    }

    selectCells(cells) {
      this.selectedObjects = cells.slice();
      this.selectedCell = cells.length === 1 ? cells[0] : null;
      this.selectedRow = null;
      this.selectedCol = null;
      this.selectedBorderLine = null;
      this._emitSelectionChange({ type: cells.length === 1 ? "cell" : "cells", cells: cells.slice(), objects: this.selectedObjects.slice() });
      return this.selectedObjects;
    }

    selectRow(rowOrIndex) {
      const row = rowOrIndex instanceof SpanGridRow ? rowOrIndex : this.rows[rowOrIndex];
      if (!row) return null;
      this.selectedCell = null;
      this.selectedRow = row;
      this.selectedCol = null;
      this.selectedBorderLine = null;
      this.selectedObjects = [row];
      const index = this.rows.indexOf(row);
      this._emitSelectionChange({ type: "row", row, index, objects: this.selectedObjects.slice() });
      return row;
    }

    selectCol(colOrIndex) {
      const col = colOrIndex instanceof SpanGridCol ? colOrIndex : this.cols[colOrIndex];
      if (!col) return null;
      this.selectedCell = null;
      this.selectedRow = null;
      this.selectedCol = col;
      this.selectedBorderLine = null;
      this.selectedObjects = [col];
      const index = this.cols.indexOf(col);
      this._emitSelectionChange({ type: "col", col, index, objects: this.selectedObjects.slice() });
      return col;
    }

    selectGrid() {
      this.selectedCell = null;
      this.selectedRow = null;
      this.selectedCol = null;
      this.selectedBorderLine = null;
      this.selectedObjects = [this];
      this._emitSelectionChange({ type: "grid", grid: this, objects: this.selectedObjects.slice() });
      return this;
    }

    selectBorderLine(type, index, side) {
      const line = {
        type,
        index,
        side,
        item: type === "row" ? this.rows[index] : this.cols[index],
      };
      if (!line.item) return null;
      this.selectedCell = null;
      this.selectedRow = type === "row" ? line.item : null;
      this.selectedCol = type === "col" ? line.item : null;
      this.selectedBorderLine = line;
      this.selectedObjects = [line];
      this._emitSelectionChange({ type: "border-line", line, objects: this.selectedObjects.slice() });
      return line;
    }

    setRowHeight(rowOrIndex, height) {
      const row = rowOrIndex instanceof SpanGridRow ? rowOrIndex : this.rows[rowOrIndex];
      if (!row) return null;
      const nextHeight = Math.max(SpanGridRow.MIN_HEIGHT, Math.round(Number(height) || 0));
      row.height = nextHeight;
      this.layout();
      return nextHeight;
    }

    setColWidth(colOrIndex, width) {
      const col = colOrIndex instanceof SpanGridCol ? colOrIndex : this.cols[colOrIndex];
      if (!col) return null;
      const nextWidth = Math.max(SpanGridCol.MIN_WIDTH, Math.round(Number(width) || 0));
      col.width = nextWidth;
      this.layout();
      return nextWidth;
    }

    resolveCellBorder(cell, side) {
      const sideBit = borderSideBit(side);
      const candidates = this._borderCandidates(cell, side);
      for (const candidate of candidates) {
        if (!candidate.border) continue;
        const border = candidate.border;
        const lineStyle = borderLineStyleForSide(border, side);
        if ((border.borderDirection & sideBit) === 0) {
          if (border.inheritUnspecified) continue;
          return {
            visible: false,
            color: null,
            lineStyle,
            lineWidth: 0,
            source: candidate.source,
            priority: candidate.priority,
            border,
            side,
          };
        }
        return {
          visible: true,
          color: borderColorForSide(border, side),
          lineStyle,
          lineWidth: borderLineWidthForSide(border, side),
          source: candidate.source,
          priority: candidate.priority,
          border,
          side,
        };
      }
      return {
        visible: false,
        color: null,
        lineStyle: "Solid",
        lineWidth: 0,
        source: "none",
        priority: -1,
        border: null,
        side,
      };
    }

    _borderCandidates(cell, side) {
      const row = cell ? cell.row : null;
      const col = cell ? cell.col : null;
      const rowCandidate = { border: row ? row.border : null, source: "row", priority: 1 };
      const colCandidate = { border: col ? col.border : null, source: "col", priority: 1 };
      const candidates = [{ border: cell ? cell.border : null, source: "cell", priority: 2 }];
      if (side === "top" || side === "bottom") {
        candidates.push(rowCandidate, colCandidate);
      } else {
        candidates.push(colCandidate, rowCandidate);
      }
      candidates.push({ border: this.gridBorder, source: "grid", priority: 0 });
      return candidates;
    }

    applyPropertiesToSelectedCells(properties) {
      const cells = this.selectedCells;
      for (const cell of cells) {
        Object.assign(cell, properties);
      }
      return cells.length;
    }

    nextCellFrom(cell, action) {
      const current = this.cellIndex(cell);
      if (current.row < 0 || current.col < 0) return null;
      let row = current.row;
      let col = current.col;
      if (action === "enter" || action === "arrow-down") {
        row += 1;
        if (row >= this.rows.length) {
          row = 0;
          col += 1;
        }
      } else if (action === "tab" || action === "arrow-right") {
        col += 1;
        if (col >= this.cols.length) {
          col = 0;
          row += 1;
        }
      } else if (action === "shift-tab" || action === "arrow-left") {
        col -= 1;
        if (col < 0) {
          col = this.cols.length - 1;
          row -= 1;
        }
      } else if (action === "shift-enter" || action === "arrow-up") {
        row -= 1;
        if (row < 0) {
          row = this.rows.length - 1;
          col -= 1;
        }
      }
      if (row < 0 || col < 0 || row >= this.rows.length || col >= this.cols.length) return cell;
      row = clamp(row, 0, Math.max(0, this.rows.length - 1));
      col = clamp(col, 0, Math.max(0, this.cols.length - 1));
      return this.getCell(row, col) || cell;
    }

    selectNextCell(action) {
      const cell = this.nextCellFrom(this.selectedCell || this.selectedCells[0], action);
      return cell ? this.selectCell(cell) : null;
    }

    copySelectionToTsv(cells = this.selectedCells) {
      if (!cells || cells.length === 0) return "";
      const bounds = this._selectedCellIndexBounds(cells);
      const rows = [];
      for (let row = bounds.minRow; row <= bounds.maxRow; row += 1) {
        const values = [];
        for (let col = bounds.minCol; col <= bounds.maxCol; col += 1) {
          const cell = this.getCell(row, col);
          values.push(this._textToTsvValue(cell ? cell.text : ""));
        }
        rows.push(values.join("\t"));
      }
      return rows.join("\n");
    }

    pasteTsv(text, options = {}) {
      const table = this.parseTsv(text);
      const start = this.cellIndex(this.selectedCell || this.selectedCells[0] || this.getCell(0, 0));
      if (start.row < 0 || start.col < 0 || table.length === 0) {
        return { rows: 0, cols: 0, cells: 0, expandedRows: 0, expandedCols: 0 };
      }

      const sourceRows = table.length;
      const sourceCols = table.reduce((max, row) => Math.max(max, row.length), 0);
      let expandedRows = 0;
      let expandedCols = 0;
      if (normalizePasteOverflow(options.overflow) === "expand") {
        const targetRows = start.row + sourceRows;
        const targetCols = start.col + sourceCols;
        expandedRows = Math.max(0, targetRows - this.rows.length);
        expandedCols = Math.max(0, targetCols - this.cols.length);
        this.ensureSize(targetRows, targetCols);
      }

      const maxRows = Math.max(0, this.rows.length - start.row);
      const maxCols = Math.max(0, this.cols.length - start.col);
      const rows = Math.min(sourceRows, maxRows);
      const cols = Math.min(sourceCols, maxCols);
      let cells = 0;
      for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
        for (let colOffset = 0; colOffset < cols; colOffset += 1) {
          const cell = this.getCell(start.row + rowOffset, start.col + colOffset);
          if (!cell) continue;
          cell.text = table[rowOffset][colOffset] ?? "";
          cells += 1;
        }
      }
      this.layout();
      return { rows, cols, cells, expandedRows, expandedCols };
    }

    parseTsv(text) {
      const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");
      if (normalized.length === 0) return [];
      return normalized.split("\n").map((row) => row.split("\t"));
    }

    getData() {
      return this.rows.map((row) => {
        return this.cols.map((_, colIndex) => String(row.cells[colIndex]?.text ?? ""));
      });
    }

    setData(data, options = {}) {
      const table = Array.isArray(data)
        ? data.map((row) => (Array.isArray(row) ? row : [row]))
        : [];
      const sourceRows = table.length;
      const sourceCols = table.reduce((max, row) => Math.max(max, row.length), 0);
      let expandedRows = 0;
      let expandedCols = 0;

      if (options.expand !== false) {
        expandedRows = Math.max(0, sourceRows - this.rows.length);
        expandedCols = Math.max(0, sourceCols - this.cols.length);
        this.ensureSize(Math.max(this.rows.length, sourceRows), Math.max(this.cols.length, sourceCols));
      }

      const rows = Math.min(sourceRows, this.rows.length);
      const cols = Math.min(sourceCols, this.cols.length);
      let cells = 0;
      for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        for (let colIndex = 0; colIndex < cols; colIndex += 1) {
          const cell = this.getCell(rowIndex, colIndex);
          if (!cell) continue;
          cell.text = String(table[rowIndex][colIndex] ?? "");
          cells += 1;
        }
      }
      this.layout();
      return { rows, cols, cells, expandedRows, expandedCols };
    }

    toImage() {
      const padding = paddingForBorderStyle(this.borderStyle);
      const contentWidth = this.cols.reduce((sum, col) => sum + col.width, 0) + this.cols.length + 1;
      const contentHeight = this.rows.reduce((sum, row) => sum + row.height, 0) + this.rows.length + 1;
      // zoom=1 기준 자연 크기로 렌더링한다.
      // drawOuterBorders 가 우측/하단 테두리를 (padding + contentWidth) 위치에 그리므로
      // 캔버스는 padding*2 여유를 포함한 크기여야 한다.
      const imgW = Math.max(1, Math.round(contentWidth + padding * 2));
      const imgH = Math.max(1, Math.round(contentHeight + padding * 2));

      const drawToCanvas = (canvas) => {
        const savedWidth = this.width;
        const savedHeight = this.height;
        const savedScrollX = this.scrollX;
        const savedScrollY = this.scrollY;
        const savedZoom = this.zoom;          // zoom 보존
        try {
          this.width = imgW;
          this.height = imgH;
          this.scrollX = 0;
          this.scrollY = 0;
          this.zoom = 1;                      // 자연 크기(1x)로 렌더링
          this.layout();
          // null 캔버스로 생성하면 bind/resize 호출 없이 view만 준비됨
          const view = new SpanGridCanvasView(null, this, { readonly: true });
          view.canvas = canvas;
          view.devicePixelRatio = 1;
          view.draw();
        } finally {
          this.width = savedWidth;
          this.height = savedHeight;
          this.scrollX = savedScrollX;
          this.scrollY = savedScrollY;
          this.zoom = savedZoom;              // zoom 복원
          this.layout();
        }
      };

      // 브라우저 환경: document.createElement('canvas') 사용 (동기 toDataURL 지원)
      if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = imgW;
        canvas.height = imgH;
        drawToCanvas(canvas);
        return Promise.resolve({ dataURL: canvas.toDataURL("image/png"), width: imgW, height: imgH });
      }

      // OffscreenCanvas 환경 (Web Worker 등): convertToBlob 비동기 처리
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(imgW, imgH);
        drawToCanvas(canvas);
        return canvas.convertToBlob({ type: "image/png" }).then((blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ dataURL: /** @type {string} */ (reader.result), width: imgW, height: imgH });
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
        );
      }

      return Promise.resolve(null);
    }

    toSVG() {
      // ── 레이아웃 크기 계산 (toImage() 와 동일한 방식) ─────────────────────
      const padding = paddingForBorderStyle(this.borderStyle);
      const contentWidth  = this.cols.reduce((sum, col) => sum + col.width,  0) + this.cols.length + 1;
      const contentHeight = this.rows.reduce((sum, row) => sum + row.height, 0) + this.rows.length + 1;
      const imgW = Math.max(1, Math.round(contentWidth  + padding * 2));
      const imgH = Math.max(1, Math.round(contentHeight + padding * 2));

      // ── 상태 보존 ──────────────────────────────────────────────────────────
      const savedWidth   = this.width;
      const savedHeight  = this.height;
      const savedScrollX = this.scrollX;
      const savedScrollY = this.scrollY;
      const savedZoom    = this.zoom;

      try {
        this.width   = imgW;
        this.height  = imgH;
        this.scrollX = 0;
        this.scrollY = 0;
        this.zoom    = 1;
        this.layout();

        // 보조 메서드 활용을 위한 임시 뷰 (캔버스 없음)
        const view = new SpanGridCanvasView(null, this, { readonly: true });

        // ── 유틸 ─────────────────────────────────────────────────────────────
        /** SVG 특수문자 이스케이프 */
        const esc = (s) =>
          String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        /** 숫자 반올림 (소수 2자리) */
        const r2 = (v) => Math.round(v * 100) / 100;

        /** lineDash → stroke-dasharray 속성 문자열 */
        const dashAttr = (lineStyle) => {
          if (lineStyle === 'Dash') return ' stroke-dasharray="6,4"';
          if (lineStyle === 'Dot')  return ' stroke-dasharray="2,4"';
          return '';
        };

        const svgParts = [];   // 실제 SVG 요소
        const defParts = [];   // <defs> 클립패스
        let   clipSeq  = 0;

        // ── 배경 ─────────────────────────────────────────────────────────────
        svgParts.push(
          `<rect x="0" y="0" width="${imgW}" height="${imgH}" fill="${esc(this.backColor || '#ffffff')}"/>`
        );

        // ── 셀 수집 (span 포함 모든 행/열) ───────────────────────────────────
        /** 셀 배경 + 텍스트를 SVG 로 직렬화 */
        const serializeCell = (cell) => {
          const b = cell.bounds;
          if (b.width <= 0 || b.height <= 0) return;

          // 배경
          svgParts.push(
            `<rect x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.width)}" height="${r2(b.height)}" fill="${esc(cell.backColor || '#ffffff')}"/>`
          );

          // 텍스트 (html 모드 제외)
          if (cell.text && normalizeCellMode(cell.mode) !== 'html') {
            const al  = alignmentParts(cell.textAlign || 'MiddleCenter');
            const pad = 5;
            const tx  =
              al.horizontal === 'left'  ? b.x + pad :
              al.horizontal === 'right' ? b.x + b.width - pad :
                                          b.x + b.width  / 2;
            const ty  =
              al.vertical === 'top'    ? b.y + pad :
              al.vertical === 'bottom' ? b.y + b.height - pad :
                                          b.y + b.height / 2;
            const anchor   =
              al.horizontal === 'left'  ? 'start' :
              al.horizontal === 'right' ? 'end'   : 'middle';
            const baseline =
              al.vertical === 'top'    ? 'hanging'         :
              al.vertical === 'bottom' ? 'text-after-edge' : 'central';

            const cpId = `sgcp${clipSeq++}`;
            defParts.push(
              `<clipPath id="${cpId}"><rect x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.width)}" height="${r2(b.height)}"/></clipPath>`
            );
            svgParts.push(
              `<text x="${r2(tx)}" y="${r2(ty)}" style="font:${esc(cell.font || '9pt sans-serif')}" fill="${esc(cell.foreColor || '#000000')}" text-anchor="${anchor}" dominant-baseline="${baseline}" clip-path="url(#${cpId})">${esc(cell.text)}</text>`
            );
          }
        };

        // 일반 셀 (span 셀 제외 – 병합 셀의 sCell 은 별도 처리)
        for (const row of this.rows) {
          for (const cell of row.cells) {
            if (!cell.span) serializeCell(cell);
          }
        }

        // 병합 셀 (sCell 기준으로 전체 병합 영역 그리기)
        for (const merge of this.merges) {
          if (merge.sCell && merge.sCell.visible) serializeCell(merge.sCell);
        }

        // ── 셀 테두리 (drawCellBorders 와 동일 로직 → SVG line) ──────────────
        // 모든 visible 셀 (merge sCell 포함)
        const allCells = [];
        for (const row of this.rows) {
          for (const cell of row.cells) {
            if (cell.visible) allCells.push(cell);
          }
        }
        for (const merge of this.merges) {
          if (merge.sCell && merge.sCell.visible) allCells.push(merge.sCell);
        }

        const segments = new Map();
        for (const cell of allCells) {
          for (const side of ['left', 'top', 'right', 'bottom']) {
            const border = this.resolveCellBorder(cell, side);
            const seg    = view.borderSegmentForSide(cell, side, border);
            const key    = view.borderSegmentKey(seg);
            const exist  = segments.get(key);
            if (!exist || seg.priority >= exist.priority) segments.set(key, seg);
          }
        }

        const orderedSegs = [...segments.values()]
          .filter((s) => s.visible)
          .sort((a, b) => a.priority - b.priority);

        for (const seg of orderedSegs) {
          const lw = normalizeLineWidth(seg.lineWidth);
          svgParts.push(
            `<line x1="${r2(seg.x1)}" y1="${r2(seg.y1)}" x2="${r2(seg.x2)}" y2="${r2(seg.y2)}" stroke="${esc(seg.color)}" stroke-width="${lw}"${dashAttr(seg.lineStyle)} stroke-linecap="square"/>`
          );
        }

        // ── 외곽 테두리 (drawOuterBorders 와 동일 로직 → SVG line) ─────────
        const ob  = this.gridBorder;
        const crl = this.clientRect;
        if (ob && crl) {
          const lft = r2(crl.x * this.zoom);
          const top = r2(crl.y * this.zoom);
          const rgt = r2((crl.x + this.gridWidth)  * this.zoom);
          const btm = r2((crl.y + this.gridHeight) * this.zoom);
          const lw  = normalizeLineWidth(ob.lineWidth) * this.zoom;
          const da  = dashAttr(ob.lineStyle);
          const BD  = BorderDirection;

          if ((ob.borderDirection & BD.Left)   !== 0)
            svgParts.push(`<line x1="${lft + 0.5}" y1="${top}" x2="${lft + 0.5}" y2="${btm}" stroke="${esc(ob.leftColor)}"   stroke-width="${lw}"${da} stroke-linecap="square"/>`);
          if ((ob.borderDirection & BD.Top)    !== 0)
            svgParts.push(`<line x1="${lft}" y1="${top + 0.5}" x2="${rgt}" y2="${top + 0.5}" stroke="${esc(ob.topColor)}"    stroke-width="${lw}"${da} stroke-linecap="square"/>`);
          if ((ob.borderDirection & BD.Right)  !== 0)
            svgParts.push(`<line x1="${rgt + 0.5}" y1="${top}" x2="${rgt + 0.5}" y2="${btm}" stroke="${esc(ob.rightColor)}"  stroke-width="${lw}"${da} stroke-linecap="square"/>`);
          if ((ob.borderDirection & BD.Bottom) !== 0)
            svgParts.push(`<line x1="${lft}" y1="${btm + 0.5}" x2="${rgt}" y2="${btm + 0.5}" stroke="${esc(ob.bottomColor)}" stroke-width="${lw}"${da} stroke-linecap="square"/>`);
        }

        // ── SVG 조립 ─────────────────────────────────────────────────────────
        const defsStr = defParts.length
          ? `<defs>${defParts.join('')}</defs>`
          : '';
        return (
          `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}" viewBox="0 0 ${imgW} ${imgH}">` +
          defsStr +
          svgParts.join('') +
          `</svg>`
        );
      } finally {
        // ── 상태 복원 ──────────────────────────────────────────────────────
        this.width   = savedWidth;
        this.height  = savedHeight;
        this.scrollX = savedScrollX;
        this.scrollY = savedScrollY;
        this.zoom    = savedZoom;
        this.layout();
      }
    }

    toVector() {
      // ── 레이아웃 크기 계산 (toImage / toSVG 와 동일 방식) ─────────────────
      const padding = paddingForBorderStyle(this.borderStyle);
      const contentWidth  = this.cols.reduce((sum, col) => sum + col.width,  0) + this.cols.length + 1;
      const contentHeight = this.rows.reduce((sum, row) => sum + row.height, 0) + this.rows.length + 1;
      const imgW = Math.max(1, Math.round(contentWidth  + padding * 2));
      const imgH = Math.max(1, Math.round(contentHeight + padding * 2));

      // ── 상태 보존 ─────────────────────────────────────────────────────────
      const savedWidth   = this.width;
      const savedHeight  = this.height;
      const savedScrollX = this.scrollX;
      const savedScrollY = this.scrollY;
      const savedZoom    = this.zoom;
      // 선택 상태 제거 (선택 하이라이트를 SVG에 포함하지 않음)
      // selectedCells 는 getter(selectedObjects 파생)이므로 backing field 를 저장
      const savedObjects    = this.selectedObjects.slice();
      const savedRow        = this.selectedRow;
      const savedCol        = this.selectedCol;
      const savedBorderLine = this.selectedBorderLine;

      try {
        this.width   = imgW;
        this.height  = imgH;
        this.scrollX = 0;
        this.scrollY = 0;
        this.zoom    = 1;
        this.selectedObjects    = [];
        this.selectedRow        = null;
        this.selectedCol        = null;
        this.selectedBorderLine = null;
        this.layout();

        // ── SVG 컨텍스트 + 가짜 캔버스 생성 ──────────────────────────────────
        const svgCtx = new SvgContext(imgW, imgH);

        const fakeCanvas = {
          width:       imgW,
          height:      imgH,
          clientWidth: imgW,
          clientHeight: imgH,
          getContext: (type) => (type === '2d' ? svgCtx : null),
        };

        // null 캔버스로 뷰 생성 후 fakeCanvas 교체 (bind/resize 회피)
        const view = new SpanGridCanvasView(null, this, { readonly: true });
        view.canvas = fakeCanvas;
        view.devicePixelRatio = 1;

        // 드로우 실행 → svgCtx 에 모든 draw call 캡처됨
        view.draw();

        return svgCtx.toSVGString();
      } finally {
        // ── 상태 복원 ─────────────────────────────────────────────────────
        this.width   = savedWidth;
        this.height  = savedHeight;
        this.scrollX = savedScrollX;
        this.scrollY = savedScrollY;
        this.zoom    = savedZoom;
        this.selectedObjects    = savedObjects;
        this.selectedRow        = savedRow;
        this.selectedCol        = savedCol;
        this.selectedBorderLine = savedBorderLine;
        this.layout();
      }
    }

    toJSON() {
      const fixedRow = this.fixed.row ? this.rows.indexOf(this.fixed.row) : this.fixed.rowIndex;
      const fixedCol = this.fixed.col ? this.cols.indexOf(this.fixed.col) : this.fixed.colIndex;
      return {
        version: VERSION,
        width: this.width,
        height: this.height,
        borderStyle: this.borderStyle,
        borderDirection: this.borderDirection,
        borderColor: this.borderColor,
        backColor: this.backColor,
        focusColor: this.focusColor,
        selectionFillAlpha: this.selectionFillAlpha,
        expand: this.expand,
        autoScroll: this.autoScroll,
        zoom: this.zoom,
        scrollMode: this.scrollMode,
        scrollBarSize: this.scrollBarSize,
        reserveScrollbarInViewport: this.reserveScrollbarInViewport,
        fitCellWidth: this.fitCellWidth,
        fitCellHeight: this.fitCellHeight,
        gridBorder: serializeBorder(this.gridBorder),
        fixed: { row: fixedRow, col: fixedCol },
        cols: this.cols.map((col) => ({
          width: col.width,
          border: serializeBorder(col.border),
        })),
        rows: this.rows.map((row) => ({
          height: row.height,
          border: serializeBorder(row.border),
          cells: row.cells.map((cell) => serializeCell(cell)),
        })),
        merges: this.merges
          .map((merge) => ({
            start: this.cellIndex(merge.sCell),
            end: this.cellIndex(merge.eCell),
          }))
          .filter((merge) => merge.start.row >= 0 && merge.start.col >= 0 && merge.end.row >= 0 && merge.end.col >= 0),
      };
    }

    static fromJSON(snapshot = {}) {
      if (!snapshot || typeof snapshot !== "object") snapshot = {};
      const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
      const cols = Array.isArray(snapshot.cols) ? snapshot.cols : [];
      const inferredColCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row?.cells) ? row.cells.length : 0), 0);
      const colCount = Math.max(cols.length, inferredColCount);
      const grid = new SpanGridControl({
        width: snapshot.width,
        height: snapshot.height,
        borderStyle: snapshot.borderStyle,
        borderDirection: snapshot.borderDirection,
        borderColor: snapshot.borderColor,
        backColor: snapshot.backColor,
        focusColor: snapshot.focusColor,
        selectionFillAlpha: snapshot.selectionFillAlpha,
        expand: snapshot.expand,
        autoScroll: snapshot.autoScroll,
        zoom: snapshot.zoom,
        scrollMode: snapshot.scrollMode,
        scrollBarSize: snapshot.scrollBarSize,
        // External scrollbars (siblings): do not default to in-viewport reserve — matches constructor default.
        reserveScrollbarInViewport:
          snapshot && Object.prototype.hasOwnProperty.call(snapshot, "reserveScrollbarInViewport")
            ? Boolean(snapshot.reserveScrollbarInViewport)
            : false,
        fitCellWidth: snapshot.fitCellWidth,
        fitCellHeight: snapshot.fitCellHeight,
        gridBorder: deserializeBorder(snapshot.gridBorder) || undefined,
      });

      for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
        const source = cols[colIndex] || {};
        grid.addCol(new SpanGridCol({
          width: source.width,
          border: deserializeBorder(source.border),
        }));
      }

      for (const rowSource of rows) {
        const source = rowSource || {};
        const row = grid.addRow(new SpanGridRow({
          height: source.height,
          border: deserializeBorder(source.border),
        }));
        if (Array.isArray(source.cells)) {
          for (let colIndex = 0; colIndex < source.cells.length; colIndex += 1) {
            applySerializedCell(row.cells[colIndex], source.cells[colIndex] || {});
          }
        }
      }

      const fixedRowIndex = Number.isInteger(snapshot.fixed?.row) ? snapshot.fixed.row : -1;
      const fixedColIndex = Number.isInteger(snapshot.fixed?.col) ? snapshot.fixed.col : -1;
      grid.fixed = new SpanGridFixed(grid.rows[fixedRowIndex] || null, grid.cols[fixedColIndex] || null);
      grid.fixed.rowIndex = fixedRowIndex;
      grid.fixed.colIndex = fixedColIndex;

      if (Array.isArray(snapshot.merges)) {
        for (const mergeSource of snapshot.merges) {
          const merge = mergeSource || {};
          const start = merge.start || {};
          const end = merge.end || {};
          if (grid.getCell(start.row, start.col) && grid.getCell(end.row, end.col)) {
            grid.mergeCells(start.row, start.col, end.row, end.col);
          }
        }
      }
      grid.layout();
      return grid;
    }

    ensureSize(rowCount, colCount) {
      const targetCols = Math.max(0, Math.round(Number(colCount) || 0));
      const targetRows = Math.max(0, Math.round(Number(rowCount) || 0));
      while (this.cols.length < targetCols) {
        const col = new SpanGridCol();
        col.grid = this;
        this.cols.push(col);
      }
      for (const row of this.rows) {
        this._ensureRowCells(row);
      }
      while (this.rows.length < targetRows) {
        const row = new SpanGridRow();
        row.grid = this;
        this.rows.push(row);
        this._ensureRowCells(row);
      }
      this.layout();
    }

    _textToTsvValue(value) {
      return String(value ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ");
    }

    applyBorderToSelectedLine(template) {
      if (!this.selectedBorderLine) return false;
      const line = this.selectedBorderLine;
      const border = line.item.border || new SpanGridBorder({
        color: this.gridBorder.leftColor,
        borderDirection: BorderDirection.None,
        lineStyle: this.gridBorder.lineStyle,
        lineWidth: this.gridBorder.lineWidth,
        inheritUnspecified: true,
      });
      border.inheritUnspecified = true;
      this._copyBorderSide(border, line.side, template, line.side);
      line.item.border = border;
      this.layout();
      return true;
    }

    applyBorderToSelectedCells(template) {
      const cells = this.selectedCells;
      if (cells.length === 0) return 0;
      const bounds = this._selectedCellIndexBounds(cells);
      for (const cell of cells) {
        const rowIndex = this.rows.indexOf(cell.row);
        const colIndex = cell.row ? cell.row.cells.indexOf(cell) : -1;
        const border = cell.border || new SpanGridBorder({
          color: this.gridBorder.leftColor,
          borderDirection: BorderDirection.None,
          lineStyle: this.gridBorder.lineStyle,
          lineWidth: this.gridBorder.lineWidth,
          inheritUnspecified: true,
        });
        border.inheritUnspecified = true;
        if (rowIndex === bounds.minRow) this._copyBorderSide(border, "top", template, "top");
        if (rowIndex === bounds.maxRow) this._copyBorderSide(border, "bottom", template, "bottom");
        if (colIndex === bounds.minCol) this._copyBorderSide(border, "left", template, "left");
        if (colIndex === bounds.maxCol) this._copyBorderSide(border, "right", template, "right");
        cell.border = border;
      }
      this.layout();
      return cells.length;
    }

    _copyBorderSide(target, targetSide, template, templateSide = targetSide) {
      const visible = (template.borderDirection & borderSideBit(templateSide)) !== 0;
      target.setSide(targetSide, {
        color: borderColorForSide(template, templateSide),
        lineStyle: borderLineStyleForSide(template, templateSide),
        lineWidth: borderLineWidthForSide(template, templateSide),
        visible,
      });
    }

    _selectedCellIndexBounds(cells) {
      let minRow = Infinity;
      let maxRow = -1;
      let minCol = Infinity;
      let maxCol = -1;
      for (const cell of cells) {
        const rowIndex = this.rows.indexOf(cell.row);
        const colIndex = cell.row ? cell.row.cells.indexOf(cell) : -1;
        if (rowIndex < 0 || colIndex < 0) continue;
        minRow = Math.min(minRow, rowIndex);
        maxRow = Math.max(maxRow, rowIndex);
        minCol = Math.min(minCol, colIndex);
        maxCol = Math.max(maxCol, colIndex);
      }
      return { minRow, maxRow, minCol, maxCol };
    }

    onSelectionChange(handler) {
      this._selectionChangeHandlers.push(handler);
      return () => {
        const index = this._selectionChangeHandlers.indexOf(handler);
        if (index !== -1) this._selectionChangeHandlers.splice(index, 1);
      };
    }

    selectCellsInViewRect(x1, y1, x2, y2) {
      const first = this.pointToGrid(x1, y1);
      const second = this.pointToGrid(x2, y2);
      const selectionRect = rect(
        Math.min(first.x, second.x),
        Math.min(first.y, second.y),
        Math.abs(first.x - second.x),
        Math.abs(first.y - second.y)
      );
      if (selectionRect.width === 0) selectionRect.width = 1;
      if (selectionRect.height === 0) selectionRect.height = 1;
      const cells = [];
      for (const row of this.rows) {
        for (const cell of row.cells) {
          if (cell.visible && rectIntersects(cell.bounds, selectionRect)) {
            cells.push(cell);
          }
        }
      }
      return this.selectCells(cells);
    }

    selectCellsInLogicalRect(gx1, gy1, gx2, gy2) {
      const selectionRect = rect(
        Math.min(gx1, gx2),
        Math.min(gy1, gy2),
        Math.abs(gx1 - gx2),
        Math.abs(gy1 - gy2)
      );
      if (selectionRect.width === 0) selectionRect.width = 1;
      if (selectionRect.height === 0) selectionRect.height = 1;
      const cells = [];
      for (const row of this.rows) {
        for (const cell of row.cells) {
          if (cell.visible && rectIntersects(cell.bounds, selectionRect)) {
            cells.push(cell);
          }
        }
      }
      return this.selectCells(cells);
    }

    mergeSelectedCells() {
      const cells = this.selectedCells;
      if (cells.length < 2) return null;
      let row1 = Infinity;
      let col1 = Infinity;
      let row2 = -1;
      let col2 = -1;
      for (const cell of cells) {
        const rowIndex = this.rows.indexOf(cell.row);
        const colIndex = cell.row.cells.indexOf(cell);
        row1 = Math.min(row1, rowIndex);
        col1 = Math.min(col1, colIndex);
        row2 = Math.max(row2, rowIndex);
        col2 = Math.max(col2, colIndex);
      }
      const merge = this.mergeCells(row1, col1, row2, col2);
      this.selectCell(merge.sCell);
      return merge;
    }

    setFixedCell(cell) {
      if (!cell) return;
      this.fixed = new SpanGridFixed(cell.row, cell.col);
      this.layout();
    }

    clearFixed() {
      this.fixed = new SpanGridFixed();
      this.layout();
    }

    get selectedCells() {
      return this.selectedObjects.filter((item) => item instanceof SpanGridCell);
    }

    _emitSelectionChange(args) {
      for (const handler of this._selectionChangeHandlers.slice()) {
        handler(args);
      }
    }

    pointToGrid(x, y) {
      const fixedRight = (this.viewportRect.x + this.fixedWidth) * this.zoom;
      const fixedBottom = (this.viewportRect.y + this.fixedHeight) * this.zoom;
      const logicalX = x / this.zoom;
      const logicalY = y / this.zoom;
      return {
        x: x >= fixedRight ? logicalX + this.scrollX : logicalX,
        y: y >= fixedBottom ? logicalY + this.scrollY : logicalY,
      };
    }

    hitTest(x, y) {
      const point = this.pointToGrid(x, y);
      for (const row of this.rows) {
        for (const cell of row.cells) {
          if (cell.visible && rectContainsPoint(cell.bounds, point.x, point.y)) {
            return cell;
          }
        }
      }
      return null;
    }

    scrollTo(x, y) {
      let nextX = clamp(Number(x) || 0, 0, this.scrollMaxX);
      let nextY = clamp(Number(y) || 0, 0, this.scrollMaxY);
      if (this.scrollMode === "cell") {
        nextX = this._snapScrollToCell("x", nextX);
        nextY = this._snapScrollToCell("y", nextY);
      }
      this.scrollX = clamp(nextX, 0, this.scrollMaxX);
      this.scrollY = clamp(nextY, 0, this.scrollMaxY);
      return { x: this.scrollX, y: this.scrollY };
    }

    scrollBy(deltaX, deltaY) {
      const x = Number(deltaX) || 0;
      const y = Number(deltaY) || 0;
      if (this.scrollMode === "cell") {
        const nextX = x === 0 ? this.scrollX : this._nextCellScroll("x", this.scrollX, x);
        const nextY = y === 0 ? this.scrollY : this._nextCellScroll("y", this.scrollY, y);
        this.scrollX = clamp(nextX, 0, this.scrollMaxX);
        this.scrollY = clamp(nextY, 0, this.scrollMaxY);
        return { x: this.scrollX, y: this.scrollY };
      }
      return this.scrollTo(this.scrollX + x / this.zoom, this.scrollY + y / this.zoom);
    }

    ensureVisible(cell) {
      if (!cell) return;
      const bodyLeft = this.viewportRect.x + this.fixedWidth;
      const bodyTop = this.viewportRect.y + this.fixedHeight;
      const bodyWidth = Math.max(0, this.viewportRect.width / this.zoom - this.fixedWidth);
      const bodyHeight = Math.max(0, this.viewportRect.height / this.zoom - this.fixedHeight);
      let nextX = this.scrollX;
      let nextY = this.scrollY;

      if (cell.bounds.x >= bodyLeft) {
        const visibleLeft = this.scrollX + bodyLeft;
        const visibleRight = visibleLeft + bodyWidth;
        if (rectRight(cell.bounds) > visibleRight) {
          nextX += rectRight(cell.bounds) - visibleRight;
        } else if (cell.bounds.x < visibleLeft) {
          nextX -= visibleLeft - cell.bounds.x;
        }
      }

      if (cell.bounds.y >= bodyTop) {
        const visibleTop = this.scrollY + bodyTop;
        const visibleBottom = visibleTop + bodyHeight;
        if (rectBottom(cell.bounds) > visibleBottom) {
          nextY += rectBottom(cell.bounds) - visibleBottom;
        } else if (cell.bounds.y < visibleTop) {
          nextY -= visibleTop - cell.bounds.y;
        }
      }

      this.scrollTo(nextX, nextY);
    }

    _ensureRowCells(row) {
      for (let index = row.cells.length; index < this.cols.length; index += 1) {
        const cell = row.createCell();
        cell.row = row;
        cell.col = this.cols[index];
        row.cells.push(cell);
      }
      for (let index = 0; index < row.cells.length; index += 1) {
        row.cells[index].row = row;
        row.cells[index].col = this.cols[index] || null;
      }
    }

    _layoutCells() {
      let y = this.clientRect.y;
      for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex += 1) {
        const row = this.rows[rowIndex];
        let x = this.clientRect.x;
        if (rowIndex > 0) y += this.rows[rowIndex - 1].height;

        for (let colIndex = 0; colIndex < this.cols.length; colIndex += 1) {
          const col = this.cols[colIndex];
          if (colIndex > 0) x += this.cols[colIndex - 1].width;
          const cell = row.cells[colIndex];
          cell.row = row;
          cell.col = col;
          cell.span = false;
          cell.visible = true;
          cell.bounds = rect(x + colIndex + 1, y + rowIndex + 1, col.width, row.height);
          if (this.expand && colIndex === this.cols.length - 1) {
            cell.bounds.width = this.clientRect.width - (x + colIndex + 2) + this.clientRect.x;
          }
        }
      }
    }

    _layoutFixedRegions() {
      this.fixedWidth = 0;
      this.fixedHeight = 0;

      const fixedColIndex = this.fixed.col ? this.cols.indexOf(this.fixed.col) : this.fixed.colIndex;
      if (fixedColIndex >= 0) {
        let x = 0;
        for (let index = 0; index <= fixedColIndex && index < this.cols.length; index += 1) {
          x += this.cols[index].width;
        }
        this.fixedWidth = x + fixedColIndex + 1;
      }

      const fixedRowIndex = this.fixed.row ? this.rows.indexOf(this.fixed.row) : this.fixed.rowIndex;
      if (fixedRowIndex >= 0) {
        let y = 0;
        for (let index = 0; index <= fixedRowIndex && index < this.rows.length; index += 1) {
          y += this.rows[index].height;
        }
        this.fixedHeight = y + fixedRowIndex + 1;
      }
    }

    _layoutMerges() {
      for (const merge of this.merges) {
        const startRow = this.rows.indexOf(merge.sCell ? merge.sCell.row : null);
        const startCol = merge.sCell && merge.sCell.row ? merge.sCell.row.cells.indexOf(merge.sCell) : -1;
        const endRow = this.rows.indexOf(merge.eCell ? merge.eCell.row : null);
        const endCol = merge.eCell && merge.eCell.row ? merge.eCell.row.cells.indexOf(merge.eCell) : -1;
        if (startRow < 0 || startCol < 0 || endRow < 0 || endCol < 0) continue;

        const row1 = Math.min(startRow, endRow);
        const row2 = Math.max(startRow, endRow);
        const col1 = Math.min(startCol, endCol);
        const col2 = Math.max(startCol, endCol);
        const sCell = this.getCell(row1, col1);
        const eCell = this.getCell(row2, col2);
        merge.sCell = sCell;
        merge.eCell = eCell;
        sCell.span = true;
        sCell.visible = true;
        sCell.bounds = rectUnion(sCell.bounds, eCell.bounds);

        for (let rowIndex = row1; rowIndex <= row2; rowIndex += 1) {
          for (let colIndex = col1; colIndex <= col2; colIndex += 1) {
            const cell = this.getCell(rowIndex, colIndex);
            if (cell !== sCell) {
              cell.visible = false;
            }
          }
        }
      }
    }

    _scrollOffsets(axis) {
      const items = axis === "x" ? this.cols : this.rows;
      const max = axis === "x" ? this.scrollMaxX : this.scrollMaxY;
      const sizeKey = axis === "x" ? "width" : "height";
      const offsets = [0];
      let position = 0;
      for (let index = 0; index < items.length; index += 1) {
        if (index > 0) offsets.push(position);
        position += items[index][sizeKey] + 1;
      }
      offsets.push(max);
      return [...new Set(offsets.filter((value) => value >= 0 && value <= max).map((value) => Math.round(value)))].sort((a, b) => a - b);
    }

    _snapScrollToCell(axis, value) {
      const offsets = this._scrollOffsets(axis);
      if (offsets.length === 0) return 0;
      return offsets.reduce((closest, current) => {
        return Math.abs(current - value) < Math.abs(closest - value) ? current : closest;
      }, offsets[0]);
    }

    _nextCellScroll(axis, value, delta) {
      const offsets = this._scrollOffsets(axis);
      if (offsets.length === 0) return 0;
      const epsilon = 0.0001;
      if (delta > 0) {
        return offsets.find((offset) => offset > value + epsilon) ?? offsets[offsets.length - 1];
      }
      for (let index = offsets.length - 1; index >= 0; index -= 1) {
        if (offsets[index] < value - epsilon) return offsets[index];
      }
      return offsets[0];
    }

    // ── AutoFit ──────────────────────────────────────────────────────────────
    /**
     * 지정된 열의 모든 셀 내용을 측정하여 열 너비를 자동 조정합니다.
     * @param {number} colIndex - 조정할 열 인덱스
     * @param {{ padding?: number, minWidth?: number, maxWidth?: number }} [options]
     * @returns {number|null} 설정된 너비 또는 null
     */
    autoFitCol(colIndex, options = {}) {
      const { padding = 14, minWidth = SpanGridCol.MIN_WIDTH, maxWidth = 600 } = options;
      const col = this.cols[colIndex];
      if (!col) return null;
      if (typeof document === 'undefined') return null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      let best = minWidth;
      for (let ri = 0; ri < this.rows.length; ri++) {
        const cell = this.getCell(ri, colIndex);
        if (!cell || !cell.visible || cell.span) continue;
        const text = cell.text || '';
        if (!text) continue;
        ctx.font = cell.font || '11px system-ui, sans-serif';
        const w = ctx.measureText(text).width;
        const needed = Math.ceil(w) + padding;
        if (needed > best) best = needed;
      }
      return this.setColWidth(colIndex, Math.min(best, maxWidth));
    }

    /**
     * 모든 열의 내용에 맞게 너비를 자동 조정하고 레이아웃을 다시 계산합니다.
     *
     * @param {{
     *   padding?   : number,
     *   minWidth?  : number,
     *   maxWidth?  : number,
     *   fill?      : boolean,
     *   fixedCols? : Record<number, number>
     * }} [options]
     *   - padding    : 텍스트 너비에 더할 여백 (px, 기본 14)
     *   - minWidth   : 열의 최소 너비 (기본 SpanGridCol.MIN_WIDTH)
     *   - maxWidth   : 열의 최대 너비 (기본 600)
     *   - fill       : true이면, 모든 열의 합이 그리드 너비보다 작을 때
     *                  유연 열을 비율에 맞게 늘려 그리드를 꽉 채웁니다.
     *                  자투리 픽셀은 마지막 유연 열에 추가됩니다. (기본 false)
     *   - fixedCols  : { [colIndex]: width } 형태의 객체.
     *                  지정된 열은 해당 너비로 고정되며 자동 조정과 fill 분배에서 제외됩니다.
     *                  예: fixedCols: { 0: 32, 5: 60 }
     * @returns {SpanGridControl} this (체이닝 지원)
     */
    autoFitCols(options = {}) {
      const { fill = false, padding, minWidth, maxWidth, fixedCols = {} } = options;
      const colOpts = { padding, minWidth, maxWidth };
      const N = this.cols.length;

      // ── 1단계: 각 열을 콘텐츠 너비로 조정 (고정 열은 지정 너비로 설정) ────────
      for (let ci = 0; ci < N; ci++) {
        if (Object.prototype.hasOwnProperty.call(fixedCols, ci)) {
          // 고정 열: 지정 너비를 그대로 적용, 자동 측정 생략
          this.setColWidth(ci, fixedCols[ci]);
        } else {
          this.autoFitCol(ci, colOpts);
        }
      }

      // ── 2단계: 초기 레이아웃 (innerLayoutWidth 계산) ────────────────────────
      this.layout();

      // ── 3단계: fill 옵션 처리 (고정 열 제외한 유연 열만 늘림) ────────────────
      if (fill && N > 0) {
        // layout() 과 동일 공식: contentWidth = sum(col.width) + N + 1 (구분선 1px × N+1)
        const linePixels    = N + 1;
        const totalColWidth = this.cols.reduce((sum, col) => sum + col.width, 0);
        const contentWidth  = totalColWidth + linePixels;
        const available     = this.innerLayoutWidth;   // layout() 이후 유효

        if (available > 0 && contentWidth < available) {
          // 고정 열을 제외한 유연 열 인덱스 목록
          const flexIndices = [];
          let fixedTotalWidth = 0;
          for (let ci = 0; ci < N; ci++) {
            if (Object.prototype.hasOwnProperty.call(fixedCols, ci)) {
              fixedTotalWidth += this.cols[ci].width;
            } else {
              flexIndices.push(ci);
            }
          }

          if (flexIndices.length > 0) {
            const budget       = available - linePixels;
            const flexBudget   = budget - fixedTotalWidth;  // 유연 열에 배분할 예산
            const flexTotal    = totalColWidth - fixedTotalWidth;
            const effectiveMin = (minWidth != null ? minWidth : SpanGridCol.MIN_WIDTH) || 0;

            if (flexBudget > 0 && flexTotal > 0) {
              const ratio       = flexBudget / flexTotal;
              const lastFlex    = flexIndices[flexIndices.length - 1];
              let allocated     = 0;

              for (let i = 0; i < flexIndices.length - 1; i++) {
                const ci  = flexIndices[i];
                const newW = Math.max(Math.floor(this.cols[ci].width * ratio), effectiveMin);
                this.setColWidth(ci, newW);
                allocated += this.cols[ci].width;
              }

              // 마지막 유연 열: 자투리를 포함해 정확히 flexBudget을 채움
              const lastW = Math.max(flexBudget - allocated, effectiveMin);
              this.setColWidth(lastFlex, lastW);

              // 최종 레이아웃 재계산
              this.layout();
            }
          }
        }
      }

      return this;
    }
  }

  function alignmentParts(textAlign) {
    const vertical = textAlign.startsWith("Top") ? "top" : textAlign.startsWith("Bottom") ? "bottom" : "middle";
    const horizontal = textAlign.endsWith("Left") ? "left" : textAlign.endsWith("Right") ? "right" : "center";
    return { vertical, horizontal };
  }

  function imageAlignRect(bounds, width, height, imageAlign = "TopLeft") {
    const vertical = imageAlign.startsWith("Middle") ? "middle" : imageAlign.startsWith("Bottom") ? "bottom" : "top";
    const horizontal = imageAlign.endsWith("Center") ? "center" : imageAlign.endsWith("Right") ? "right" : "left";
    const x =
      horizontal === "left"
        ? bounds.x
        : horizontal === "right"
          ? rectRight(bounds) - width
          : bounds.x + (bounds.width - width) / 2;
    const y =
      vertical === "top"
        ? bounds.y
        : vertical === "bottom"
          ? rectBottom(bounds) - height
          : bounds.y + (bounds.height - height) / 2;
    return { x, y, width, height };
  }

  function lineDashForStyle(lineStyle, scale = 1) {
    if (lineStyle === "Dash") return [6 * scale, 4 * scale];
    if (lineStyle === "Dot") return [2 * scale, 4 * scale];
    return [];
  }

  function drawRoundedNothing() {
    return undefined;
  }

  function sanitizeCellHtml(value) {
    let html = String(value ?? "");
    html = html.replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
    html = html.replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");
    html = html.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "");
    html = html.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");
    html = html.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "");
    html = html.replace(/\s+(href|src|xlink:href)\s*=\s*"javascript:[^"]*"/gi, "");
    html = html.replace(/\s+(href|src|xlink:href)\s*=\s*'javascript:[^']*'/gi, "");
    html = html.replace(/\s+(href|src|xlink:href)\s*=\s*javascript:[^\s>]+/gi, "");
    return html;
  }

  // ── SpanGrid i18n ────────────────────────────────────────
  const STATUS_I18N = {
    en: {
      fixedRow:       'Fixed Row',
      fixedCol:       'Fixed Col',
      fixedBoth:      'Fixed Row/Col',
      grid:           'Grid',
      cellsSelected:  function(n)    { return n + ' cells selected'; },
      row:            function(i)    { return 'Row ' + i; },
      col:            function(i)    { return 'Col ' + i; },
      cell:           function(r, c) { return 'Cell (' + r + ', ' + c + ')'; },
      borderRowBelow: function(i)    { return 'Row ' + i + ' bottom border'; },
      borderColRight: function(i)    { return 'Col ' + i + ' right border'; },
    },
    ko: {
      fixedRow:       '고정 행',
      fixedCol:       '고정 열',
      fixedBoth:      '고정 행/열',
      grid:           '그리드',
      cellsSelected:  function(n)    { return n + '개 셀 선택'; },
      row:            function(i)    { return '행 ' + i; },
      col:            function(i)    { return '열 ' + i; },
      cell:           function(r, c) { return '셀 (' + r + ', ' + c + ')'; },
      borderRowBelow: function(i)    { return '행 ' + i + ' 아래 테두리'; },
      borderColRight: function(i)    { return '열 ' + i + ' 오른쪽 테두리'; },
    },
  };

  let _spanGridLocale = 'en';

  /** 전역 언어를 설정합니다. 'en' 또는 'ko' (향후 추가 가능). */
  function setLocale(lang) {
    if (STATUS_I18N[lang]) _spanGridLocale = lang;
  }

  /**
   * SpanGrid 내부 번역 함수.
   * @param {string} locale - 인스턴스 로케일 (null이면 전역 _spanGridLocale 사용)
   * @param {string} key    - STATUS_I18N 키
   * @param {...*}   args   - 문자열 생성 함수에 전달할 인수
   */
  function _sg(locale, key) {
    const l = (locale && STATUS_I18N[locale]) ? locale : _spanGridLocale;
    const entry = (STATUS_I18N[l] && STATUS_I18N[l][key]) || STATUS_I18N.en[key] || key;
    const extraArgs = Array.prototype.slice.call(arguments, 2);
    return typeof entry === 'function' ? entry.apply(null, extraArgs) : entry;
  }
  // ─────────────────────────────────────────────────────────

  class SpanGridCanvasView {
    constructor(canvas, grid = new SpanGridControl(), options = {}) {
      this.canvas = canvas;
      this.grid = grid;
      this.locale = options.locale || null;
      this.hScroll = options.hScroll || null;
      this.vScroll = options.vScroll || null;
      this.statusElement = options.statusElement || null;
      this.pasteOverflow = normalizePasteOverflow(options.pasteOverflow);
      this.readonly = Boolean(options.readonly ?? options.readOnly);
      this.dragging = false;
      this.dragStart = null;
      this.resizeTarget = null;
      this._autoScrollRAF = null;
      this._autoScrollPoint = null;
      this.editor = null;
      this.editingCell = null;
      this.htmlLayer = null;
      this.htmlRegions = {};
      this.htmlCellNodes = new Map();
      this.devicePixelRatio = 1;
      this._boundDraw = () => this.draw();
      this._boundResize = () => this.resize();
      this._boundMouseDown = (event) => this.onMouseDown(event);
      this._boundMouseMove = (event) => this.onMouseMove(event);
      this._boundMouseUp = (event) => this.onMouseUp(event);
      this._boundWheel = (event) => this.onWheel(event);
      this._boundDoubleClick = (event) => this.onDoubleClick(event);
      this._boundKeyDown = (event) => this.onKeyDown(event);
      this._boundCopy = (event) => this.onCopy(event);
      this._boundPaste = (event) => this.onPaste(event);
      this._boundContextMenu = (event) => {
        event.preventDefault();
        if (typeof window.showSgContextMenu === 'function') {
          window.showSgContextMenu(event.clientX, event.clientY);
        }
      };
      this._boundHScrollInput = () => {
        this.grid.scrollTo(Number(this.hScroll.value), this.grid.scrollY);
        this.draw();
      };
      this._boundVScrollInput = () => {
        this.grid.scrollTo(this.grid.scrollX, Number(this.vScroll.value));
        this.draw();
      };
      this._boundEditorKeyDown = (event) => this.onEditorKeyDown(event);
      this._boundEditorBlur = () => this.commitCellEdit();
      this._isBound = false;
      this._interactiveBound = false;
      if (this.canvas) {
        this.bind();
        this.resize();
      }
    }

    bind() {
      if (!this.canvas || this._isBound) return;
      if (!this.canvas.hasAttribute("tabindex")) {
        this.canvas.tabIndex = 0;
      }
      if (!this.readonly) {
        this.canvas.addEventListener("mousedown", this._boundMouseDown);
        this.canvas.addEventListener("mousemove", this._boundMouseMove);
        this.canvas.addEventListener("mouseup", this._boundMouseUp);
        this.canvas.addEventListener("mouseleave", this._boundMouseUp);
        this.canvas.addEventListener("wheel", this._boundWheel, { passive: false });
        this.canvas.addEventListener("dblclick", this._boundDoubleClick);
        this.canvas.addEventListener("keydown", this._boundKeyDown);
        this.canvas.addEventListener("copy", this._boundCopy);
        this.canvas.addEventListener("paste", this._boundPaste);
        this.canvas.addEventListener("contextmenu", this._boundContextMenu);
        this._interactiveBound = true;
      }
      if (this.hScroll) {
        this.hScroll.addEventListener("input", this._boundHScrollInput);
      }
      if (this.vScroll) {
        this.vScroll.addEventListener("input", this._boundVScrollInput);
      }
      if (typeof window !== "undefined") {
        window.addEventListener("resize", this._boundResize);
      }
      this._isBound = true;
    }

    destroy() {
      this._stopAutoScroll();
      if (this.canvas && this._isBound && this._interactiveBound) {
        this.canvas.removeEventListener("mousedown", this._boundMouseDown);
        this.canvas.removeEventListener("mousemove", this._boundMouseMove);
        this.canvas.removeEventListener("mouseup", this._boundMouseUp);
        this.canvas.removeEventListener("mouseleave", this._boundMouseUp);
        this.canvas.removeEventListener("wheel", this._boundWheel, { passive: false });
        this.canvas.removeEventListener("dblclick", this._boundDoubleClick);
        this.canvas.removeEventListener("keydown", this._boundKeyDown);
        this.canvas.removeEventListener("copy", this._boundCopy);
        this.canvas.removeEventListener("paste", this._boundPaste);
        this.canvas.removeEventListener("contextmenu", this._boundContextMenu);
      }
      this._interactiveBound = false;
      if (this.hScroll && this._isBound) {
        this.hScroll.removeEventListener("input", this._boundHScrollInput);
      }
      if (this.vScroll && this._isBound) {
        this.vScroll.removeEventListener("input", this._boundVScrollInput);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", this._boundResize);
      }
      if (this.editor) {
        this.editor.removeEventListener("keydown", this._boundEditorKeyDown);
        this.editor.removeEventListener("blur", this._boundEditorBlur);
        if (this.editor.parentElement && typeof this.editor.parentElement.removeChild === "function") {
          this.editor.parentElement.removeChild(this.editor);
        }
        this.editor = null;
      }
      this.editingCell = null;
      if (this.htmlLayer && this.htmlLayer.parentElement && typeof this.htmlLayer.parentElement.removeChild === "function") {
        this.htmlLayer.parentElement.removeChild(this.htmlLayer);
      }
      this.htmlLayer = null;
      this.htmlRegions = {};
      this.htmlCellNodes.clear();
      this._isBound = false;
    }

    resize() {
      if (!this.canvas) return;
      const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssWidth = this.canvas.clientWidth || this.canvas.width || this.grid.width;
      const cssHeight = this.canvas.clientHeight || this.canvas.height || this.grid.height;
      this.devicePixelRatio = ratio;
      this.canvas.width = Math.max(1, Math.round(cssWidth * ratio));
      this.canvas.height = Math.max(1, Math.round(cssHeight * ratio));
      this.grid.width = cssWidth;
      this.grid.height = cssHeight;
      this.draw();
    }

    draw() {
      if (!this.canvas) return;
      this.grid.layout();
      this.syncScrollBars();

      const ctx = this.canvas.getContext("2d");
      const ratio = this.devicePixelRatio;
      const width = this.canvas.width / ratio;
      const height = this.canvas.height / ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = this.grid.backColor || "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const fixedWidth = this.grid.fixedWidth * this.grid.zoom;
      const fixedHeight = this.grid.fixedHeight * this.grid.zoom;

      this.drawRegion(ctx, fixedWidth, fixedHeight, this.grid.viewportRect.width - fixedWidth, this.grid.viewportRect.height - fixedHeight, -this.grid.scrollX, -this.grid.scrollY, "body");

      if (this.grid.fixedWidth > 0 || this.grid.fixedHeight > 0) {
        this.drawRegion(ctx, 0, 0, fixedWidth, fixedHeight, 0, 0, "corner");
        this.drawRegion(ctx, fixedWidth, 0, this.grid.viewportRect.width - fixedWidth, fixedHeight, -this.grid.scrollX, 0, "header");
        this.drawRegion(ctx, 0, fixedHeight, fixedWidth, this.grid.viewportRect.height - fixedHeight, 0, -this.grid.scrollY, "left");
      }

      this.drawOuterBorders(ctx);
      this.syncHtmlOverlay();
      this.updateStatus();
    }

    drawRegion(ctx, x, y, width, height, translateX, translateY, region) {
      if (width <= 0 || height <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.grid.viewportRect.x * this.grid.zoom + x, this.grid.viewportRect.y * this.grid.zoom + y, width, height);
      ctx.clip();
      ctx.scale(this.grid.zoom, this.grid.zoom);
      ctx.translate(translateX, translateY);
      this.drawGrid(ctx, region);
      ctx.restore();
    }

    drawGrid(ctx, region = "body") {
      const grid = this.grid;
      const cells = this.cellsForRegion(region, false);
      for (const cell of cells) {
        if (!cell.span) this.drawCell(ctx, cell);
      }
      for (const merge of grid.merges) {
        if (merge.sCell && merge.sCell.visible && this.cellRegion(merge.sCell) === region && this.cellIntersectsRegion(merge.sCell, region)) {
          this.drawCell(ctx, merge.sCell);
        }
      }
      this.drawCellBorders(ctx, cells);
      this.drawSelection(ctx, region);
    }

    fixedRowIndex() {
      return this.grid.fixed.row ? this.grid.rows.indexOf(this.grid.fixed.row) : this.grid.fixed.rowIndex;
    }

    fixedColIndex() {
      return this.grid.fixed.col ? this.grid.cols.indexOf(this.grid.fixed.col) : this.grid.fixed.colIndex;
    }

    cellRegion(cell) {
      const rowIndex = this.grid.rows.indexOf(cell.row);
      const colIndex = cell.row ? cell.row.cells.indexOf(cell) : -1;
      const fixedRowIndex = this.fixedRowIndex();
      const fixedColIndex = this.fixedColIndex();
      const inFixedRow = fixedRowIndex >= 0 && rowIndex >= 0 && rowIndex <= fixedRowIndex;
      const inFixedCol = fixedColIndex >= 0 && colIndex >= 0 && colIndex <= fixedColIndex;

      if (inFixedRow && inFixedCol) return "corner";
      if (inFixedRow) return "header";
      if (inFixedCol) return "left";
      return "body";
    }

    cellsForRegion(region, ensureLayout = true) {
      if (ensureLayout) this.grid.layout();
      const cells = [];
      for (const row of this.grid.rows) {
        for (const cell of row.cells) {
          if (cell.visible && this.cellRegion(cell) === region && this.cellIntersectsRegion(cell, region)) {
            cells.push(cell);
          }
        }
      }
      return cells;
    }

    cellIntersectsRegion(cell, region) {
      return rectIntersects(cell.bounds, this.visibleGridRectForRegion(region));
    }

    visibleGridRectForRegion(region) {
      const grid = this.grid;
      const zoom = grid.zoom || 1;
      const viewportWidth = grid.viewportRect.width / zoom;
      const viewportHeight = grid.viewportRect.height / zoom;
      const bodyWidth = Math.max(0, viewportWidth - grid.fixedWidth);
      const bodyHeight = Math.max(0, viewportHeight - grid.fixedHeight);

      if (region === "corner") {
        return rect(grid.viewportRect.x, grid.viewportRect.y, grid.fixedWidth, grid.fixedHeight);
      }
      if (region === "header") {
        return rect(grid.viewportRect.x + grid.fixedWidth + grid.scrollX, grid.viewportRect.y, bodyWidth, grid.fixedHeight);
      }
      if (region === "left") {
        return rect(grid.viewportRect.x, grid.viewportRect.y + grid.fixedHeight + grid.scrollY, grid.fixedWidth, bodyHeight);
      }
      return rect(
        grid.viewportRect.x + grid.fixedWidth + grid.scrollX,
        grid.viewportRect.y + grid.fixedHeight + grid.scrollY,
        bodyWidth,
        bodyHeight
      );
    }

    drawCell(ctx, cell) {
      const bounds = cell.bounds;
      ctx.fillStyle = cell.backColor;
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      if (cell.backgroundImage && cell.backgroundImage.complete) {
        this.drawBackgroundImage(ctx, cell);
      }

      if (cell.text && normalizeCellMode(cell.mode) !== "html") {
        const align = alignmentParts(cell.textAlign);
        const padding = 5;
        ctx.save();
        ctx.beginPath();
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.clip();
        ctx.font = cell.font;
        ctx.fillStyle = cell.foreColor;
        ctx.textAlign = align.horizontal;
        ctx.textBaseline = align.vertical === "top" ? "top" : align.vertical === "bottom" ? "bottom" : "middle";
        const textX =
          align.horizontal === "left"
            ? bounds.x + padding
            : align.horizontal === "right"
              ? rectRight(bounds) - padding
              : bounds.x + bounds.width / 2;
        const textY =
          align.vertical === "top"
            ? bounds.y + padding
            : align.vertical === "bottom"
              ? rectBottom(bounds) - padding
              : bounds.y + bounds.height / 2;
        ctx.fillText(cell.text, textX, textY, Math.max(0, bounds.width - padding * 2));
        ctx.restore();
      }
    }

    drawBackgroundImage(ctx, cell) {
      const image = cell.backgroundImage;
      const bounds = cell.bounds;
      const layout = cell.backgroundImageLayout || "None";
      const imageWidth = image.width || bounds.width || 1;
      const imageHeight = image.height || bounds.height || 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.clip();

      if (layout === "Stretch") {
        ctx.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height);
      } else if (layout === "Tile") {
        const pattern = typeof ctx.createPattern === "function" ? ctx.createPattern(image, "repeat") : null;
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        } else {
          for (let x = bounds.x; x < rectRight(bounds); x += imageWidth) {
            for (let y = bounds.y; y < rectBottom(bounds); y += imageHeight) {
              ctx.drawImage(image, x, y);
            }
          }
        }
      } else if (layout === "Zoom") {
        const scale = Math.min(bounds.width / imageWidth, bounds.height / imageHeight);
        const width = imageWidth * scale;
        const height = imageHeight * scale;
        const target = imageAlignRect(bounds, width, height, cell.backgroundImageAlign || "MiddleCenter");
        ctx.drawImage(image, target.x, target.y, target.width, target.height);
      } else if (layout === "Fit") {
        let width = bounds.width;
        let height = width * (this.grid.fitCellHeight / this.grid.fitCellWidth);
        if (height > bounds.height) {
          height = bounds.height;
          width = height * (this.grid.fitCellWidth / this.grid.fitCellHeight);
        }
        const target = imageAlignRect(bounds, width, height, "MiddleCenter");
        ctx.drawImage(image, target.x, target.y, target.width, target.height);
      } else {
        const align = layout === "Center" ? "MiddleCenter" : cell.backgroundImageAlign;
        const target = imageAlignRect(bounds, imageWidth, imageHeight, align);
        ctx.drawImage(image, target.x, target.y);
      }
      ctx.restore();
    }

    drawGridLines(ctx) {
      this.drawCellBorders(ctx, this.cellsForRegion("body"));
    }

    drawCellBorders(ctx, cells) {
      const segments = new Map();
      for (const cell of cells) {
        for (const side of ["left", "top", "right", "bottom"]) {
          const border = this.grid.resolveCellBorder(cell, side);
          const segment = this.borderSegmentForSide(cell, side, border);
          const key = this.borderSegmentKey(segment);
          const existing = segments.get(key);
          if (!existing || segment.priority >= existing.priority) {
            segments.set(key, segment);
          }
        }
      }

      const ordered = [...segments.values()]
        .filter((segment) => segment.visible)
        .sort((first, second) => first.priority - second.priority);
      for (const segment of ordered) {
        this.drawBorderSegment(ctx, segment);
      }
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
    }

    borderSegmentForSide(cell, side, border) {
      const bounds = cell.bounds;
      const left = bounds.x - 0.5;
      const top = bounds.y - 0.5;
      const right = rectRight(bounds) + 0.5;
      const bottom = rectBottom(bounds) + 0.5;
      let x1 = left;
      let y1 = top;
      let x2 = right;
      let y2 = top;
      if (side === "left") {
        x2 = left;
        y2 = bottom;
      } else if (side === "right") {
        x1 = right;
        x2 = right;
        y2 = bottom;
      } else if (side === "bottom") {
        y1 = bottom;
        y2 = bottom;
      }
      return {
        visible: border.visible,
        color: border.color,
        lineStyle: border.lineStyle,
        lineWidth: border.lineWidth,
        priority: border.priority,
        source: border.source,
        side,
        x1,
        y1,
        x2,
        y2,
      };
    }

    borderSegmentKey(segment) {
      return [segment.x1, segment.y1, segment.x2, segment.y2]
        .map((value) => Math.round(value * 1000) / 1000)
        .join(",");
    }

    drawBorderSegment(ctx, segment) {
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = segment.lineWidth;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash(lineDashForStyle(segment.lineStyle));
      }
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }

    drawSelection(ctx, region = "body") {
      if (this.readonly) return;
      if (this.grid.selectedBorderLine) {
        this.drawSelectedBorderLine(ctx, region);
        return;
      }
      let cells = this.grid.selectedCells.filter((cell) => this.cellRegion(cell) === region);
      if (cells.length === 0 && this.grid.selectedRow) {
        cells = this.grid.selectedRow.cells.filter((cell) => cell.visible && this.cellRegion(cell) === region);
      }
      if (cells.length === 0 && this.grid.selectedCol) {
        cells = this.grid.rows
          .map((row) => row.cells[this.grid.cols.indexOf(this.grid.selectedCol)])
          .filter((cell) => cell && cell.visible && this.cellRegion(cell) === region);
      }
      if (cells.length === 0) return;
      const bounds = cells.reduce((current, cell) => (current ? rectUnion(current, cell.bounds) : { ...cell.bounds }), null);
      const focusColor = this.grid.focusColor || "#3b82f6";
      const fillAlpha = this.grid.selectionFillAlpha != null ? this.grid.selectionFillAlpha : 0.12;
      ctx.save();
      ctx.fillStyle = focusColor;
      ctx.globalAlpha = fillAlpha;
      ctx.fillRect(bounds.x + 1, bounds.y + 1, Math.max(0, bounds.width - 2), Math.max(0, bounds.height - 2));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = focusColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bounds.x + 1, bounds.y + 1, Math.max(0, bounds.width - 2), Math.max(0, bounds.height - 2));
      ctx.restore();
    }

    drawSelectedBorderLine(ctx, region = "body") {
      const segment = this.selectedBorderLineSegment(region);
      if (!segment) return;
      const focusColor = this.grid.focusColor || "#3b82f6";
      const fillAlpha = this.grid.selectionFillAlpha != null ? this.grid.selectionFillAlpha : 0.12;
      const cells = this.selectedBorderLineCells(region);
      if (cells.length > 0) {
        const bounds = cells.reduce((current, cell) => (current ? rectUnion(current, cell.bounds) : { ...cell.bounds }), null);
        if (bounds) {
          ctx.save();
          ctx.fillStyle = focusColor;
          ctx.globalAlpha = fillAlpha;
          ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.restore();
        }
      }
      ctx.save();
      ctx.strokeStyle = focusColor;
      ctx.lineWidth = 2;
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
      ctx.restore();
    }

    selectedBorderLineCells(region = "body") {
      const line = this.grid.selectedBorderLine;
      if (!line) return [];
      if (!this.regionMatchesBorderLine(line, region)) return [];
      if (line.type === "row") {
        const row = this.grid.rows[line.index];
        if (!row) return [];
        return row.cells.filter((cell) => cell && cell.visible && this.cellRegion(cell) === region);
      }
      return this.grid.rows
        .map((_, rowIndex) => this.grid.getCell(rowIndex, line.index))
        .filter((cell) => cell && cell.visible && this.cellRegion(cell) === region);
    }

    selectedBorderLineSegment(region = "body") {
      const line = this.grid.selectedBorderLine;
      if (!line) return null;
      if (!this.regionMatchesBorderLine(line, region)) return null;

      if (line.type === "row") {
        const row = this.grid.rows[line.index];
        if (!row || row.cells.length === 0) return null;
        const cells = row.cells.filter(Boolean);
        const first = cells[0];
        const last = cells[cells.length - 1];
        const y = rectBottom(first.bounds) + 0.5;
        return {
          x1: first.bounds.x - 0.5,
          y1: y,
          x2: rectRight(last.bounds) + 0.5,
          y2: y,
        };
      }

      const first = this.grid.getCell(0, line.index);
      const last = this.grid.getCell(this.grid.rows.length - 1, line.index);
      if (!first || !last) return null;
      const x = rectRight(first.bounds) + 0.5;
      return {
        x1: x,
        y1: first.bounds.y - 0.5,
        x2: x,
        y2: rectBottom(last.bounds) + 0.5,
      };
    }

    regionMatchesBorderLine(line, region) {
      if (line.type === "row") {
        const fixedRowIndex = this.fixedRowIndex();
        const fixed = fixedRowIndex >= 0 && line.index <= fixedRowIndex;
        return fixed ? region === "corner" || region === "header" : region === "left" || region === "body";
      }
      const fixedColIndex = this.fixedColIndex();
      const fixed = fixedColIndex >= 0 && line.index <= fixedColIndex;
      return fixed ? region === "corner" || region === "left" : region === "header" || region === "body";
    }

    drawOuterBorders(ctx) {
      const grid = this.grid;
      const border = grid.gridBorder;
      const left = grid.clientRect.x * grid.zoom;
      const top = grid.clientRect.y * grid.zoom;
      const right = (grid.clientRect.x + grid.gridWidth) * grid.zoom;
      const bottom = (grid.clientRect.y + grid.gridHeight) * grid.zoom;
      ctx.lineWidth = normalizeLineWidth(border.lineWidth) * grid.zoom;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash(lineDashForStyle(border.lineStyle, grid.zoom));
      }
      if ((border.borderDirection & BorderDirection.Left) !== 0) {
        ctx.strokeStyle = border.leftColor;
        ctx.beginPath();
        ctx.moveTo(left + 0.5, top);
        ctx.lineTo(left + 0.5, bottom);
        ctx.stroke();
      }
      if ((border.borderDirection & BorderDirection.Top) !== 0) {
        ctx.strokeStyle = border.topColor;
        ctx.beginPath();
        ctx.moveTo(left, top + 0.5);
        ctx.lineTo(right, top + 0.5);
        ctx.stroke();
      }
      if ((border.borderDirection & BorderDirection.Right) !== 0) {
        ctx.strokeStyle = border.rightColor;
        ctx.beginPath();
        ctx.moveTo(right + 0.5, top);
        ctx.lineTo(right + 0.5, bottom);
        ctx.stroke();
      }
      if ((border.borderDirection & BorderDirection.Bottom) !== 0) {
        ctx.strokeStyle = border.bottomColor;
        ctx.beginPath();
        ctx.moveTo(left, bottom + 0.5);
        ctx.lineTo(right, bottom + 0.5);
        ctx.stroke();
      }
      if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
      drawRoundedNothing();
    }

    syncScrollBars() {
      if (this.hScroll) {
        this.hScroll.min = "0";
        this.hScroll.max = String(this.grid.scrollMaxX);
        this.hScroll.value = String(this.grid.scrollX);
        this.hScroll.step = "1";
        this.hScroll.disabled = this.grid.scrollMaxX === 0;
      }
      if (this.vScroll) {
        this.vScroll.min = "0";
        this.vScroll.max = String(this.grid.scrollMaxY);
        this.vScroll.value = String(this.grid.scrollY);
        this.vScroll.step = "1";
        this.vScroll.disabled = this.grid.scrollMaxY === 0;
      }
    }

    htmlRegionNames() {
      return ["body", "header", "left", "corner"];
    }

    ensureHtmlLayer() {
      if (this.htmlLayer || !this.canvas || !this.canvas.parentElement || typeof document === "undefined") {
        return this.htmlLayer;
      }
      const layer = document.createElement("div");
      layer.className = "span-grid-html-layer";
      Object.assign(layer.style, {
        position: "absolute",
        pointerEvents: "none",
        overflow: "visible",
        zIndex: "2",
      });

      for (const region of this.htmlRegionNames()) {
        const regionLayer = document.createElement("div");
        regionLayer.className = `span-grid-html-region span-grid-html-region-${region}`;
        if (regionLayer.dataset) regionLayer.dataset.region = region;
        Object.assign(regionLayer.style, {
          position: "absolute",
          overflow: "hidden",
          pointerEvents: "none",
        });
        layer.appendChild(regionLayer);
        this.htmlRegions[region] = regionLayer;
      }

      this.canvas.parentElement.appendChild(layer);
      this.htmlLayer = layer;
      return layer;
    }

    syncHtmlOverlay() {
      const hasVisibleHtmlCells = this.htmlRegionNames().some((region) => {
        return this.cellsForRegion(region, false).some((cell) => normalizeCellMode(cell.mode) === "html");
      });
      if (!hasVisibleHtmlCells && !this.htmlLayer) return;
      const layer = this.ensureHtmlLayer();
      if (!layer) return;
      this.positionHtmlLayer();
      this.positionHtmlRegions();

      const active = new Set();
      for (const region of this.htmlRegionNames()) {
        const regionLayer = this.htmlRegions[region];
        if (!regionLayer) continue;
        const cells = this.cellsForRegion(region, false).filter((cell) => normalizeCellMode(cell.mode) === "html");
        for (const cell of cells) {
          const key = this.htmlCellKey(cell);
          active.add(key);
          let node = this.htmlCellNodes.get(key);
          if (!node) {
            node = document.createElement("div");
            node.className = "span-grid-html-cell";
            Object.assign(node.style, {
              position: "absolute",
              boxSizing: "border-box",
              overflow: "hidden",
              pointerEvents: "none",
              padding: "4px 6px",
            });
            this.htmlCellNodes.set(key, node);
          }
          if (node.parentElement !== regionLayer) {
            if (node.parentElement && typeof node.parentElement.removeChild === "function") {
              node.parentElement.removeChild(node);
            }
            regionLayer.appendChild(node);
          }
          const html = this.sanitizeCellHtml(cell.text);
          if (node._spanGridHtml !== html) {
            node.innerHTML = html;
            node._spanGridHtml = html;
          }
          this.positionHtmlCellNode(node, cell, region);
        }
      }

      for (const [key, node] of this.htmlCellNodes) {
        if (active.has(key)) continue;
        if (node.parentElement && typeof node.parentElement.removeChild === "function") {
          node.parentElement.removeChild(node);
        }
        this.htmlCellNodes.delete(key);
      }
    }

    sanitizeCellHtml(html) {
      return sanitizeCellHtml(html);
    }

    htmlCellKey(cell) {
      const index = this.grid.cellIndex(cell);
      return `${index.row}:${index.col}`;
    }

    positionHtmlLayer() {
      if (!this.htmlLayer || !this.canvas) return;
      const width = this.canvas.clientWidth || this.canvas.width / this.devicePixelRatio || this.grid.width;
      const height = this.canvas.clientHeight || this.canvas.height / this.devicePixelRatio || this.grid.height;
      Object.assign(this.htmlLayer.style, {
        left: `${this.canvas.offsetLeft || 0}px`,
        top: `${this.canvas.offsetTop || 0}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    }

    positionHtmlRegions() {
      for (const region of this.htmlRegionNames()) {
        const node = this.htmlRegions[region];
        if (!node) continue;
        const frame = this.htmlRegionFrame(region);
        Object.assign(node.style, {
          left: `${frame.x}px`,
          top: `${frame.y}px`,
          width: `${frame.width}px`,
          height: `${frame.height}px`,
          display: frame.width > 0 && frame.height > 0 ? "block" : "none",
        });
      }
    }

    htmlRegionFrame(region) {
      const grid = this.grid;
      const zoom = grid.zoom;
      const viewportX = grid.viewportRect.x * zoom;
      const viewportY = grid.viewportRect.y * zoom;
      const fixedWidth = grid.fixedWidth * zoom;
      const fixedHeight = grid.fixedHeight * zoom;
      const bodyWidth = Math.max(0, grid.viewportRect.width - fixedWidth);
      const bodyHeight = Math.max(0, grid.viewportRect.height - fixedHeight);
      if (region === "corner") {
        return rect(viewportX, viewportY, fixedWidth, fixedHeight);
      }
      if (region === "header") {
        return rect(viewportX + fixedWidth, viewportY, bodyWidth, fixedHeight);
      }
      if (region === "left") {
        return rect(viewportX, viewportY + fixedHeight, fixedWidth, bodyHeight);
      }
      return rect(viewportX + fixedWidth, viewportY + fixedHeight, bodyWidth, bodyHeight);
    }

    positionHtmlCellNode(node, cell, region) {
      const frame = this.htmlRegionFrame(region);
      const bounds = this.cellToLocalRect(cell);
      const align = alignmentParts(cell.textAlign || "MiddleCenter");
      Object.assign(node.style, {
        left: `${bounds.x - frame.x}px`,
        top: `${bounds.y - frame.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        display: "flex",
        alignItems: align.vertical === "top" ? "flex-start" : align.vertical === "bottom" ? "flex-end" : "center",
        justifyContent: align.horizontal === "left" ? "flex-start" : align.horizontal === "right" ? "flex-end" : "center",
        textAlign: align.horizontal,
        color: cell.foreColor,
        font: cell.font,
      });
    }

    localPoint(event) {
      const box = this.canvas.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    }

    cellToLocalRect(cell) {
      const region = this.cellRegion(cell);
      let x = cell.bounds.x;
      let y = cell.bounds.y;
      if (region === "body" || region === "header") x -= this.grid.scrollX;
      if (region === "body" || region === "left") y -= this.grid.scrollY;
      return {
        x: x * this.grid.zoom,
        y: y * this.grid.zoom,
        width: cell.bounds.width * this.grid.zoom,
        height: cell.bounds.height * this.grid.zoom,
      };
    }

    ensureEditor() {
      if (this.editor || !this.canvas || !this.canvas.parentElement || typeof document === "undefined") return this.editor;
      const editor = document.createElement("input");
      editor.type = "text";
      editor.className = "span-grid-cell-editor";
      editor.autocomplete = "off";
      editor.spellcheck = false;
      editor.style.position = "absolute";
      editor.style.zIndex = "5";
      editor.style.display = "none";
      editor.addEventListener("keydown", this._boundEditorKeyDown);
      editor.addEventListener("blur", this._boundEditorBlur);
      this.canvas.parentElement.appendChild(editor);
      this.editor = editor;
      return editor;
    }

    startCellEdit(cell = this.grid.selectedCell, initialValue) {
      if (this.readonly) return false;
      if (!cell || !this.canvas) return false;
      // Per-cell 편집 제어: cell.tag.editable === false 이면 편집 불가
      // tag 가 없거나 editable 속성이 없으면 편집 허용 (기본 동작 유지)
      if (cell.tag != null && cell.tag.editable === false) return false;
      this.grid.selectCell(cell);
      this.grid.ensureVisible(cell);
      this.draw();
      const editor = this.ensureEditor();
      if (!editor) return false;
      const bounds = this.cellToLocalRect(cell);
      editor.style.left = `${this.canvas.offsetLeft + bounds.x + 1}px`;
      editor.style.top = `${this.canvas.offsetTop + bounds.y + 1}px`;
      editor.style.width = `${Math.max(24, bounds.width - 2)}px`;
      editor.style.height = `${Math.max(20, bounds.height - 2)}px`;
      editor.style.display = "block";
      editor.value = initialValue != null ? initialValue : cell.text;
      this.editingCell = cell;
      editor.focus();
      editor.select();
      return true;
    }

    commitCellEdit(moveAction = null) {
      if (!this.editor || !this.editingCell) return false;
      const cell = this.editingCell;
      cell.text = this.editor.value;
      this.hideCellEditor();
      if (moveAction) {
        const next = this.grid.nextCellFrom(cell, moveAction);
        if (next) this.grid.selectCell(next);
        if (next) this.grid.ensureVisible(next);
      }
      this.draw();
      return true;
    }

    cancelCellEdit() {
      if (!this.editor || !this.editingCell) return false;
      this.hideCellEditor();
      this.draw();
      return true;
    }

    hideCellEditor() {
      if (this.editor) this.editor.style.display = "none";
      this.editingCell = null;
      if (this.canvas && typeof this.canvas.focus === "function") this.canvas.focus();
    }

    hitDivider(x, y, tolerance = 4) {
      this.grid.layout();
      const grid = this.grid;
      const point = grid.pointToGrid(x, y);
      const toleranceLogical = tolerance / grid.zoom;
      const gridRect = rect(grid.clientRect.x, grid.clientRect.y, grid.gridWidth, grid.gridHeight);
      if (
        point.x < gridRect.x - toleranceLogical ||
        point.y < gridRect.y - toleranceLogical ||
        point.x > rectRight(gridRect) + toleranceLogical ||
        point.y > rectBottom(gridRect) + toleranceLogical
      ) {
        return null;
      }

      const rowTarget = this.rowDividerAt(point, toleranceLogical);
      const colTarget = this.colDividerAt(point, toleranceLogical);
      if (rowTarget && colTarget) {
        return rowTarget.distance <= colTarget.distance ? rowTarget : colTarget;
      }
      return rowTarget || colTarget;
    }

    rowDividerAt(point, tolerance) {
      if (this.grid.cols.length === 0) return null;
      for (let rowIndex = 0; rowIndex < this.grid.rows.length; rowIndex += 1) {
        const cell = this.grid.getCell(rowIndex, 0);
        if (!cell) continue;
        const lineY = rectBottom(cell.bounds);
        const withinY = Math.abs(point.y - lineY) <= tolerance;
        const withinX = point.x >= this.grid.clientRect.x && point.x <= this.grid.clientRect.x + this.grid.gridWidth;
        if (withinY && withinX) {
          return {
            type: "row",
            index: rowIndex,
            side: "bottom",
            item: this.grid.rows[rowIndex],
            distance: Math.abs(point.y - lineY),
          };
        }
      }
      return null;
    }

    colDividerAt(point, tolerance) {
      if (this.grid.rows.length === 0) return null;
      for (let colIndex = 0; colIndex < this.grid.cols.length; colIndex += 1) {
        const cell = this.grid.getCell(0, colIndex);
        if (!cell) continue;
        const lineX = rectRight(cell.bounds);
        const withinX = Math.abs(point.x - lineX) <= tolerance;
        const withinY = point.y >= this.grid.clientRect.y && point.y <= this.grid.clientRect.y + this.grid.gridHeight;
        if (withinX && withinY) {
          return {
            type: "col",
            index: colIndex,
            side: "right",
            item: this.grid.cols[colIndex],
            distance: Math.abs(point.x - lineX),
          };
        }
      }
      return null;
    }

    beginDividerResize(target, point) {
      if (!target) return false;
      this.resizeTarget = {
        type: target.type,
        index: target.index,
        item: target.item,
        startX: point.x,
        startY: point.y,
        startSize: target.type === "row" ? target.item.height : target.item.width,
      };
      return true;
    }

    resizeDividerTo(point) {
      if (!this.resizeTarget) return null;
      if (this.resizeTarget.type === "row") {
        const delta = (point.y - this.resizeTarget.startY) / this.grid.zoom;
        return this.grid.setRowHeight(this.resizeTarget.index, this.resizeTarget.startSize + delta);
      }
      const delta = (point.x - this.resizeTarget.startX) / this.grid.zoom;
      return this.grid.setColWidth(this.resizeTarget.index, this.resizeTarget.startSize + delta);
    }

    finishPointerAction() {
      this.dragging = false;
      this.dragStart = null;
      this.dragStartGrid = null;
      this.resizeTarget = null;
      this._stopAutoScroll();
    }

    updateCursor(point) {
      if (!this.canvas || this.resizeTarget) return;
      const divider = this.hitDivider(point.x, point.y);
      this.canvas.style.cursor = divider ? `${divider.type}-resize` : "default";
    }

    onMouseDown(event) {
      if (this.readonly) return;
      if (typeof this.canvas.focus === "function") this.canvas.focus();
      const point = this.localPoint(event);
      const divider = this.hitDivider(point.x, point.y);
      if (divider) {
        this.grid.selectBorderLine(divider.type, divider.index, divider.side);
        this.beginDividerResize(divider, point);
        this.dragging = false;
        this.dragStart = null;
        this.draw();
        return;
      }
      const cell = this.grid.hitTest(point.x, point.y);
      this.dragging = true;
      this.dragStart = point;
      this.dragStartGrid = this.grid.pointToGrid(point.x, point.y);
      if (cell) {
        this.grid.selectCell(cell);
      } else {
        this.grid.selectCells([]);
      }
      this.draw();
    }

    onMouseMove(event) {
      if (this.readonly) return;
      const point = this.localPoint(event);
      if (this.resizeTarget) {
        this.resizeDividerTo(point);
        this.draw();
        return;
      }
      if (!this.dragging || !this.dragStart) {
        this.updateCursor(point);
        return;
      }
      this._autoScrollPoint = point;
      const endGrid = this.grid.pointToGrid(point.x, point.y);
      this.grid.selectCellsInLogicalRect(this.dragStartGrid.x, this.dragStartGrid.y, endGrid.x, endGrid.y);
      this.draw();
      const delta = this._getAutoScrollDelta(point);
      if (delta.dx !== 0 || delta.dy !== 0) {
        this._startAutoScroll();
      } else {
        this._stopAutoScroll();
      }
    }

    onMouseUp() {
      this.finishPointerAction();
    }

    _getAutoScrollDelta(point) {
      const grid = this.grid;
      const zoom = grid.zoom;
      const vp = grid.viewportRect;
      const vpLeft = vp.x * zoom;
      const vpTop = vp.y * zoom;
      const vpRight = (vp.x + vp.width) * zoom;
      const vpBottom = (vp.y + vp.height) * zoom;
      const zone = 40;
      const maxSpeed = 12;
      let dx = 0;
      let dy = 0;
      if (point.x > vpRight - zone) {
        dx = maxSpeed * Math.min(1, (point.x - (vpRight - zone)) / zone);
      } else if (point.x < vpLeft + zone) {
        dx = -maxSpeed * Math.min(1, ((vpLeft + zone) - point.x) / zone);
      }
      if (point.y > vpBottom - zone) {
        dy = maxSpeed * Math.min(1, (point.y - (vpBottom - zone)) / zone);
      } else if (point.y < vpTop + zone) {
        dy = -maxSpeed * Math.min(1, ((vpTop + zone) - point.y) / zone);
      }
      return { dx, dy };
    }

    _startAutoScroll() {
      if (this._autoScrollRAF) return;
      if (typeof requestAnimationFrame === "undefined") return;
      const loop = () => {
        if (!this.dragging || !this.dragStart || !this.dragStartGrid || !this._autoScrollPoint) {
          this._autoScrollRAF = null;
          return;
        }
        const delta = this._getAutoScrollDelta(this._autoScrollPoint);
        if (delta.dx === 0 && delta.dy === 0) {
          this._autoScrollRAF = null;
          return;
        }
        this.grid.scrollBy(delta.dx, delta.dy);
        const autoEndGrid = this.grid.pointToGrid(this._autoScrollPoint.x, this._autoScrollPoint.y);
        this.grid.selectCellsInLogicalRect(
          this.dragStartGrid.x, this.dragStartGrid.y,
          autoEndGrid.x, autoEndGrid.y
        );
        this.draw();
        this._autoScrollRAF = requestAnimationFrame(loop);
      };
      this._autoScrollRAF = requestAnimationFrame(loop);
    }

    _stopAutoScroll() {
      if (this._autoScrollRAF) {
        if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this._autoScrollRAF);
        this._autoScrollRAF = null;
      }
    }

    onWheel(event) {
      if (this.readonly) return;
      event.preventDefault();
      const deltaX = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
      const deltaY = event.shiftKey ? 0 : event.deltaY;
      this.grid.scrollBy(deltaX, deltaY);
      this.draw();
    }

    onDoubleClick(event) {
      if (this.readonly) return;
      const point = this.localPoint(event);
      const divider = this.hitDivider(point.x, point.y);
      if (divider) {
        if (divider.type === "row") {
          this.grid.selectBorderLine(divider.type, divider.index, divider.side);
          this.grid.setRowHeight(divider.index, SpanGridRow.MIN_HEIGHT);
        } else {
          this.grid.selectBorderLine(divider.type, divider.index, divider.side);
          this.grid.setColWidth(divider.index, SpanGridCol.MIN_WIDTH);
        }
        this.draw();
        return;
      }
      const cell = this.grid.hitTest(point.x, point.y);
      if (cell) {
        this.startCellEdit(cell);
      }
    }

    onEditorKeyDown(event) {
      if (this.readonly) return;
      if (event.key === "Enter") {
        event.preventDefault();
        this.commitCellEdit(event.shiftKey ? "shift-enter" : "enter");
      } else if (event.key === "Tab") {
        event.preventDefault();
        this.commitCellEdit(event.shiftKey ? "shift-tab" : "tab");
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.cancelCellEdit();
      }
    }

    onKeyDown(event) {
      if (this.readonly) return;
      if (this.editingCell) return;
      if (event.ctrlKey || event.metaKey) return;
      let action = null;
      if (event.key === "Enter") action = event.shiftKey ? "shift-enter" : "enter";
      if (event.key === "Tab") action = event.shiftKey ? "shift-tab" : "tab";
      if (event.key === "ArrowDown") action = "arrow-down";
      if (event.key === "ArrowUp") action = "arrow-up";
      if (event.key === "ArrowLeft") action = "arrow-left";
      if (event.key === "ArrowRight") action = "arrow-right";
      if (action) {
        event.preventDefault();
        const cell = this.grid.selectNextCell(action);
        if (cell) this.grid.ensureVisible(cell);
        this.draw();
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        this.startCellEdit();
        return;
      }
      if (event.key.length === 1 && !event.altKey) {
        const cell = this.grid.selectedCell || this.grid.selectedCells[0];
        if (cell) {
          event.preventDefault();
          this.startCellEdit(cell, event.key);
        }
      }
    }

    onCopy(event) {
      if (this.readonly) return;
      const text = this.grid.copySelectionToTsv();
      if (!text) return;
      event.preventDefault();
      event.clipboardData.setData("text/plain", text);
    }

    onPaste(event) {
      if (this.readonly) return;
      const text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
      if (!text) return;
      event.preventDefault();
      this.grid.pasteTsv(text, { overflow: this.pasteOverflow });
      this.draw();
    }

    fixedRowStatusLabel(rowIndex) {
      const fixedRowIndex = this.fixedRowIndex();
      return fixedRowIndex >= 0 && rowIndex >= 0 && rowIndex <= fixedRowIndex ? _sg(this.locale, 'fixedRow') : "";
    }

    fixedColStatusLabel(colIndex) {
      const fixedColIndex = this.fixedColIndex();
      return fixedColIndex >= 0 && colIndex >= 0 && colIndex <= fixedColIndex ? _sg(this.locale, 'fixedCol') : "";
    }

    fixedCellStatusLabel(rowIndex, colIndex) {
      const fixedRow = this.fixedRowStatusLabel(rowIndex);
      const fixedCol = this.fixedColStatusLabel(colIndex);
      if (fixedRow && fixedCol) return _sg(this.locale, 'fixedBoth');
      return fixedRow || fixedCol;
    }

    statusWithFixedLabel(base, fixedLabel) {
      return fixedLabel ? `${base} · ${fixedLabel}` : base;
    }

    updateStatus() {
      if (!this.statusElement) return;
      if (this.grid.selectedBorderLine) {
        const line = this.grid.selectedBorderLine;
        this.statusElement.textContent = line.type === "row"
          ? _sg(this.locale, 'borderRowBelow', line.index)
          : _sg(this.locale, 'borderColRight', line.index);
        return;
      }
      if (this.grid.selectedRow) {
        const row = this.grid.rows.indexOf(this.grid.selectedRow);
        this.statusElement.textContent = this.statusWithFixedLabel(_sg(this.locale, 'row', row), this.fixedRowStatusLabel(row));
        return;
      }
      if (this.grid.selectedCol) {
        const col = this.grid.cols.indexOf(this.grid.selectedCol);
        this.statusElement.textContent = this.statusWithFixedLabel(_sg(this.locale, 'col', col), this.fixedColStatusLabel(col));
        return;
      }
      if (this.grid.selectedObjects[0] === this.grid) {
        this.statusElement.textContent = _sg(this.locale, 'grid');
        return;
      }
      const cell = this.grid.selectedCell;
      if (!cell) {
        this.statusElement.textContent = _sg(this.locale, 'cellsSelected', this.grid.selectedCells.length);
        return;
      }
      const row = this.grid.rows.indexOf(cell.row);
      const col = cell.row.cells.indexOf(cell);
      this.statusElement.textContent = this.statusWithFixedLabel(_sg(this.locale, 'cell', row, col), this.fixedCellStatusLabel(row, col));
    }

    /**
     * 모든 열을 내용에 맞게 자동 조정하고 다시 그립니다.
     * @param {{
     *   padding?   : number,
     *   minWidth?  : number,
     *   maxWidth?  : number,
     *   fill?      : boolean,
     *   fixedCols? : Record<number, number>
     * }} [options]
     *   - fixedCols : { [colIndex]: width } — 지정 열을 고정 너비로 설정하고 자동조정 및 fill 분배에서 제외
     *                 예: fixedCols: { 0: 32 }  → 0번 열을 32px로 고정
     * @returns {SpanGridCanvasView} this (체이닝 지원)
     */
    autoFit(options = {}) {
      this.grid.autoFitCols(options);
      this.resize();
      this.draw();
      return this;
    }
  }

  function createDemoGrid() {
    const grid = new SpanGridControl({ width: 900, height: 480, borderStyle: "None" });
    [90, 120, 130, 120, 110, 140].forEach((width) => grid.addCol(new SpanGridCol({ width })));
    [30, 34, 34, 34, 34, 34, 34, 44].forEach((height) => grid.addRow(new SpanGridRow({ height })));

    const headers = ["Header", "Status", "Owner", "Start", "Finish", "Notes"];
    headers.forEach((text, index) => {
      const cell = grid.getCell(0, index);
      cell.text = text;
      cell.backColor = "#253449";
      cell.foreColor = "#ffffff";
      cell.font = "bold 13px sans-serif";
    });

    for (let row = 1; row < grid.rows.length; row += 1) {
      for (let col = 0; col < grid.cols.length; col += 1) {
        const cell = grid.getCell(row, col);
        cell.text = col === 0 ? `Item ${row}` : `R${row} C${col}`;
        cell.backColor = row % 2 === 0 ? "#f6f8fb" : "#ffffff";
        cell.foreColor = "#17202f";
        cell.textAlign = col === 0 || col === 5 ? "MiddleLeft" : "MiddleCenter";
      }
    }

    //grid.getCell(1, 1).text = "Merged status area";
    //grid.getCell(1, 1).backColor = "#e6f1ff";
    //grid.mergeCells(1, 1, 2, 2);

    grid.fixed = new SpanGridFixed(grid.rows[0], grid.cols[0]);
    grid.layout();
    return grid;
  }

  function runSmokeTests() {
    const grid = createDemoGrid();
    const messages = [];
    if (grid.merges.length > 0 && grid.merges[0].sCell.span) messages.push("merge");
    if (grid.hitTest(10, 10) === grid.getCell(0, 0)) messages.push("hit-test");
    grid.selectCell(1, 1);
    if (grid.selectedCell === grid.getCell(1, 1)) messages.push("selection");
    grid.ensureVisible(grid.getCell(grid.rows.length - 1, grid.cols.length - 1));
    if (grid.scrollX >= 0 && grid.scrollY >= 0) messages.push("scroll");
    grid.setZoomPercent(150);
    if (grid.zoom === 1.5 && grid.hitTest(15, 15) === grid.getCell(0, 0)) messages.push("zoom");
    grid.setScrollMode("cell");
    grid.scrollTo(0, 0);
    grid.scrollBy(1, 1);
    if (grid.scrollMode === "cell" && (grid.scrollX > 0 || grid.scrollY > 0)) messages.push("scroll-mode");
    return { ok: messages.length === 6, messages };
  }

  SpanGridControl.VERSION = VERSION;
  SpanGridCanvasView.VERSION = VERSION;

  return {
    BorderDirection,
    VERSION,
    SpanGridBorder,
    SpanGridCanvasView,
    SpanGridCell,
    SpanGridCol,
    SpanGridControl,
    SpanGridFixed,
    SpanGridMerge,
    SpanGridRow,
    createDemoGrid,
    runSmokeTests,
    setLocale,
    STATUS_I18N,
  };
});
