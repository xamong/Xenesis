/**
 * Xamong UI — Auto Layout + Theme (v1)
 * 기존 xamong-ui-components.js 이후에 로드합니다.
 * 좌표(absolute) 대신 flex 기반 자동 배치와 CSS 변수 테마를 사용합니다.
 *
 * =============================================================================
 * XCON / JSON / XML 스펙 — Auto-layout 전용 속성 (al)
 * =============================================================================
 * 모든 AL 컴포넌트는 생성자에서 getValue로 속성을 읽고 this.alProps에 병합 결과를 둡니다.
 *
 * (1) 중첩 객체 `al` — 권장 (한 번에 그룹화)
 *   al: { gap, padding, direction, alignItems, justifyContent,
 *         flex, alignSelf, width, maxWidth, minHeight,
 *         autoHeight, fixedHeight, maxHeight, usePosMinHeight }
 *   · panel 전용: autoHeight(기본 true), fixedHeight, maxHeight, usePosMinHeight
 *
 * (2) 플랫 속성 — XML 등에서 어트리뷰트만 쓸 때 (al* 는 중첩보다 우선)
 *   alGap, alPadding, alDirection, alAlignItems, alJustifyContent,
 *   alFlex, alAlignSelf, alWidth, alMaxWidth, alMinHeight,
 *   alAutoHeight, alFixedHeight, alMaxHeight, alUsePosMinHeight
 *
 * (3) 런타임: updateProperty('al' | 'alGap' | …) 시 alProps 재계산
 *
 * === XaButtonAL 전용 (getValue) — HTML .btn 과 맞춤 ===
 * · buttonAppearance: 'link' | 'text' — 배경·테두리·그림자 제거(텍스트 링크)
 * · alButtonSegment: 'first' | 'middle' | 'last' | 'only'(기본) — 세그먼트 컨트롤 연결 모서리
 * · alButtonSplit: 'main' | 'caret' | '' — 스플릿 버튼 좌/우 조각
 * · loading: true — 로딩 스피너
 * · alButtonLayout: 'row'(기본) | 'column' | 'col' | 'vertical' — 아이콘·이미지·레이블 flex 방향(세로 스택은 하단 탭바 등)
 * · alButtonLayoutGap: CSS gap (예: 4px) — 미지정 시 row=8px, column=4px
 * · border: true 일 때만 테두리 렌더. false(기본)는 테두리·ghost 그림자 없음(플랫).
 *
 * === XaLabelAL 전용 (getValue, XCON/JSON/XML) ===
 * · labelPadding, borderRadius, borderWidth, borderColor, borderStyle
 * · prefixDot (true: 태그 앞 점), suffixText / suffixTextColor (예: 필수 *)
 * · editorialBar, editorialBarColor (에디토리얼 좌측 바)
 * · hintText (폼 라벨 아래 보조 문구 — 세로 스택)
 * · bgColor / fgColor — 기본 XaLabel과 동일 (배지 배경·글자색)
 * · shimmer: true — 스켈레톤용 그라데이션 반짝임(.xa-al-sk-shimmer, 테마 키프레임)
 * · shimmerDirection: 'rtl'(기본, 우→좌) | 'ltr' — 반짝임 이동 방향
 * · textAlign / textVAlign — XaLabel과 동일; AL 본문 flex에 justify-content / align-items로 반영(getHorizontalAlign·getVerticalAlign)
 *
 * === XaPanelAL — style 속성 ===
 * · XaComponent.style(사용자 정의)은 getBaseStyle()에 포함되지만, 패널 본문의 border/배경(panelStyle)이
 *   그 뒤에 붙으면 border: 단축 속성이 좌측 강조선(border-left) 등을 덮어쓸 수 있음.
 * · render()에서는 레이아웃용 getBaseStyle에 style을 잠시 제외한 뒤, panelStyle 다음에 style을 다시 붙인다.
 *
 * === XaTextFieldAL 전용 (getValue) — component-showcase-basic.html .tf 정렬 ===
 * · fieldState: '' | 'success' | 'error' — 테두리·글로우
 * · prefixIcon / suffixIcon: email | search | lock | check | visibility (인라인 SVG)
 * · prefixText / suffixText: 문자 애드온(예: ₩, KRW)
 * · leadingBlock: 'https://' 등 — tf-pre + 입력 결합
 * · postButton: 'Apply' — 입력 오른쪽 결합 버튼
 * · floatLabel: 설정 시 플로팅 라벨 모드(Company Name)
 * · otpIndex / otpGroup: OTP 칸 자동 포커스 이동(data 속성, boot에서 init)
 * · otpLayout: 'row'(기본) | 'column' — OTP 칸을 flex 행에서 한 줄로 쌓을지·세로로 쌓을지(행 패널 + width:100% 동작과 연동)
 *
 * === XaImageAL 전용 (getValue) — component-showcase-basic.html 이미지 데모 정렬 ===
 * · overlayTag / overlayTitle / overlaySub — 하단 그라데이션·좌상단 배지 오버레이(HTML, .xa-al-img-overlay-*)
 *
 * === XaCheckboxAL 전용 — component-showcase-basic.html §06 (.cb-item / .cb-card / pill) ===
 * · checkboxVariant: ''(기본 list) | 'card' | 'pill' | 'terms' — 네이티브 체크 대신 커스텀 박스·카드·필터 알약
 * · checkboxAppearance: '' | 'green' | 'blue' — 체크 시 박스 색(.cb-box--green / --blue)
 * · indeterminate: true — 부분 선택(Select All) 막대 표시
 * · labelHtml: 문자열 — terms 등 리치 HTML 라벨(데모 전용, 신뢰된 XCON에서만 사용)
 *
 * === XaRadioButtonAL 전용 — component-showcase-basic.html §07 (.rb-item / .rb-btn-group / .rb-plan) ===
 * · radioVariant: ''(기본 list) | 'segment' | 'plan' | 'rating' — 네이티브 라디오 대신 HTML 데모와 동일 마크업
 * · value — 그룹 내 input value (미지정 시 텍스트 기반 식별용 기본값)
 * · planName / planPriceMain / planPricePer / planFeatures — plan 변형(기능 줄은 | 로 구분)
 * · ratingValue — rating 변형(1~5, 기본 4)
 * === XaPanelAL — stackMode · 레이어 겹침(히어로·캐러셀 크롬) ===
 * · stackMode: 'flow'(기본) | 'layers' | 'layer' | 'overlap' — 자식을 동일 그리드 셀에 겹쳐 쌓음(CSS grid 1×1).
 * · 자식 컴포넌트 al: layerZ, layerFlexDirection, layerAlignItems, layerJustifyContent, layerPointerEvents, layerPadding
 *   (플랫: alLayerZ, alLayerFlexDirection, alLayerAlignItems …) — 각 레이어는 flex로 내부 정렬만 담당.
 * · layerPointerEvents (기본: 통과 — 가상 레이어): 레이아웃 겹침만 하고 포인터는 가로채지 않음(xamong-autolayout-theme.css 참고).
 *   — 미지정·through·none: 통과. 전면 차단은 alLayerPointerEvents: auto|capture|block(래퍼에 .xa-al-panel__layer--pe-capture).
 *   — 테마는 레이어 직계 .xa-al-panel-root 만 pointer-events:none(후손 전부 none 금지). 카드·알약 전체 히트는 .xa-al-layer-hit.
 *
 * === XaPanelAL al.stackClass — 패널 본문 스택에 추가 클래스(예: 세그먼트 그룹 래퍼 .xa-al-rb-btn-group) ===
 *
 * === XaTextViewAL 전용 — component-showcase-basic.html §08 (.tv-article / .tv-code / .tv-truncate) ===
 * · html: true + editable: false 일 때 text를 HTML로 렌더(신뢰된 XCON 전용)
 * · textViewVariant: 'article' | 'code' | 'truncate' | 'list' | 'metadata' — 데모 마크업·스타일 정렬
 *
 * === XaVideoViewAL 전용 — component-showcase-basic.html §09 (.vv-showcase / .video-player) ===
 * · videoViewMode: 'showcase' — 포스터·커스텀 컨트롤·썸네일 스트립 데모(원본 HTML과 동일 클래스명)
 *
 * === XaWebViewAL 전용 — component-showcase-basic.html §10 (.wv-showcase / .browser-frame) ===
 * · webViewMode: 'showcase' — 탭·주소창·로드 바·정적 콘텐츠 데모(원본 HTML과 동일 클래스명, iframe 미사용)
 *
 * === XaShapeAL — 도형 (xamong-ui-components.js XaShape) ===
 * · flex 스택에서 절대좌표를 제거하고 al.flex / al.width 등으로 배치 — 미등록 시 겹침·높이 0으로 보일 수 있음
 *
 * === XaListAL — 리스트 (xamong-ui-components.js XaList) ===
 * · stripAbsoluteToFlexItem + xListVariant: showcase 일 때 pos 고정 높이 완화 · 루트에 xa-al-xlist-root 클래스 (테마 CSS)
 * · al.minHeight / al.maxHeight 로 뷰포트 높이 제어
 *
 * === XaBannerAL — 배너 슬라이더 (xamong-ui-components.js XaBanner) ===
 * · al / alWidth 등: 폼 스택 안에서 가로 풀 · 세로 고정 높이(슬라이드 측정에 필요)
 * · bannerHeight: 루트 박스 높이(CSS, 예: 320px, min(72vw, 420px)) — 미지정 시 al.fixedHeight / al.minHeight / 기본 320px
 * · bannerVariant: '' | 'hero' | 'compact' — 루트에 xa-al-banner--* 클래스(테마 그라데이션·인디케이터 보조)
 * · views: XCON 배열(각 슬라이드는 panel / label / image 등)
 * · 렌더 후 window.initializeBanners() 로 트랙 동기화·자동재생(페이지 로드 시 한 번 + 쇼케이스 innerHTML 후 한 번)
 *
 * === xamong-ui-components-ext.js 확장 타입 — AL 래퍼 ===
 * · passwordField — label, value, placeholder, showToggle, showStrength(기본 true), minLength 등;
 *   AL에선 pos 높이를 풀어 라벨·강도 바·힌트가 잘리지 않게 함
 * · textarea — label, f-textarea, 글자 수 푸터, 세로 리사이즈; pos 높이 제거 + window.xaAlReflowAlLayoutAncestors 로
 *   패널·폼 스택이 동적 높이에 맞춰 다시 잡히게 함
 * · select — selectVariant: showcase 시 Native(f-select)+Custom 드롭다운(component-showcase-ext #03); AL에서 showcase일 때 높이 auto
 * · progressBar — XaProgressBar: progress-item / progress-fill--a–d, animated 시 .xa-ext-progress-stripes(테마 CSS; 아래 progressBar 분기)
 * · slider — XaSlider: slider-wrap·f-range·--fill(component-showcase-ext #04), 단일은 sliderLabel·showSliderLabels·showValue; 아래 slider 분기
 * · switch — XaSwitch: switch-row·switch__track(component-showcase-ext #05), 단일 행은 switchTitle/switchSubtitle·size(switch--sm/md/lg); 아래 switch 분기
 * · spinner — XaSpinner: spinnerType(ring|dots|pulse|bars)·size·color, 마크업은 xamong-autolayout-theme.css 의 .sp-ring / .sp-dots 등과 동일(EXT 등록은 아래 spinner 분기)
 * · colorPicker, datePicker, timePicker,
 *   filePicker, imagePicker, rating, badge, avatar, icon, divider,
 *   alert, tooltip, modal, tabs, accordion, grid, flexBox, stack, spacer, card,
 *   searchBar, treeView, carousel, gallery, qrCode, barcode, signaturePad
 * · getBaseStyle에서 stripAbsoluteToFlexItem 적용, al / al* 병합은 buildAlPropsFromXcon과 동일
 * =============================================================================
 */
(function (global) {
    'use strict';

    /** xamong-ui-components.js는 XaForm 등을 window가 아니라 XamongUIComponents에만 노출한다. */
    const UIC = global.XamongUIComponents;
    const CF = global.ComponentFactory || (UIC && UIC.ComponentFactory);
    const PublicProps = global.XamongPublicProps || null;
    const XaForm = UIC && UIC.XaForm;
    const XaList = UIC && UIC.XaList;
    const XaController = UIC && UIC.XaController;
    const XaLabel = UIC && UIC.XaLabel;
    const XaTextField = UIC && UIC.XaTextField;
    const XaTextView = UIC && UIC.XaTextView;
    const XaButton = UIC && UIC.XaButton;
    const XaPanel = UIC && UIC.XaPanel;
    const XaImage = UIC && UIC.XaImage;
    const XaCheckbox = UIC && UIC.XaCheckbox;
    const XaRadioButton = UIC && UIC.XaRadioButton;
    const XaVideoView = UIC && UIC.XaVideoView;
    const XaWebView = UIC && UIC.XaWebView;
    const XaBanner = UIC && UIC.XaBanner;
    const XaShape = UIC && UIC.XaShape;

    if (!CF || !UIC || !XaForm) {
        console.error('[xamong-ui-components-autolayout] xamong-ui-components.js를 먼저 완전히 로드하세요. (필요: window.ComponentFactory, window.XamongUIComponents.XaForm)');
        return;
    }

    const THEME_TOKEN_ALIAS_PATTERN = /(^|[\s(:,])@([A-Za-z_][\w-]*)(?=$|[\s),;])/g;

    function expandThemeTokenAliases(value) {
        if (value === undefined || value === null) return value;
        if (PublicProps && typeof PublicProps.expandThemeTokenAliases === 'function') {
            return PublicProps.expandThemeTokenAliases(value);
        }
        return String(value).replace(THEME_TOKEN_ALIAS_PATTERN, (_match, prefix, token) => `${prefix}var(--${token})`);
    }

    const AL_NESTED_KEYS = [
        'gap', 'padding', 'direction', 'alignItems', 'justifyContent',
        'autoHeight', 'fixedHeight', 'maxHeight', 'minHeight', 'usePosMinHeight',
        'flex', 'alignSelf', 'width', 'maxWidth', 'minWidth',
        'stackClass',
        'stackMode',
        'layerZ', 'layerFlexDirection', 'layerAlignItems', 'layerJustifyContent', 'layerPointerEvents', 'layerPadding'
    ];

    /** XCON 또는 일반 객체 모두에서 al 속성 읽기 (중첩 al 전용) */
    function readAlProps(raw) {
        if (!raw) return {};
        const isX = raw && typeof raw.get === 'function' && typeof raw.contains === 'function';
        if (isX) {
            const o = {};
            AL_NESTED_KEYS.forEach((k) => {
                if (raw.contains(k)) o[k] = raw.get(k);
            });
            return o;
        }
        return typeof raw === 'object' ? raw : {};
    }

    /** 플랫 키 → alProps 필드 (getValue로 읽음, 중첩 al 보다 우선) */
    const AL_FLAT_TO_CANON = [
        ['gap', 'alGap'],
        ['padding', 'alPadding'],
        ['direction', 'alDirection'],
        ['alignItems', 'alAlignItems'],
        ['justifyContent', 'alJustifyContent'],
        ['flex', 'alFlex'],
        ['alignSelf', 'alAlignSelf'],
        ['width', 'alWidth'],
        ['maxWidth', 'alMaxWidth'],
        ['minWidth', 'alMinWidth'],
        ['minHeight', 'alMinHeight'],
        ['autoHeight', 'alAutoHeight'],
        ['fixedHeight', 'alFixedHeight'],
        ['maxHeight', 'alMaxHeight'],
        ['usePosMinHeight', 'alUsePosMinHeight'],
        ['stackClass', 'alStackClass'],
        ['stackMode', 'alStackMode'],
        ['layerZ', 'alLayerZ'],
        ['layerFlexDirection', 'alLayerFlexDirection'],
        ['layerAlignItems', 'alLayerAlignItems'],
        ['layerJustifyContent', 'alLayerJustifyContent'],
        ['layerPointerEvents', 'alLayerPointerEvents'],
        ['layerPadding', 'alLayerPadding']
    ];

    /**
     * 생성자·updateProperty에서 호출: getValue('al') + 플랫 al* 병합
     * @param {import('./xamong-ui-components.js').XaComponent} xa
     */
    function buildAlPropsFromXcon(xa) {
        const nested = readAlProps(xa.getValue ? xa.getValue('al', null) : null);
        const out = Object.assign({}, nested);
        if (!xa || !xa.xcon) return out;
        AL_FLAT_TO_CANON.forEach(([canonical, flatKey]) => {
            if (xa.xcon.contains(flatKey)) {
                out[canonical] = xa.getValue(flatKey);
            }
        });
        return out;
    }

    /**
     * renderComponentsALLayers 등에서 순수 XCON만 있을 때 al + al* 병합
     * 주의: XCON.getValue(i)는 숫자 인덱스 전용이다. 키 문자열로는 get(key)를 써야 한다.
     */
    function buildAlPropsFromRawXcon(xcon) {
        if (!xcon || typeof xcon.contains !== 'function' || typeof xcon.get !== 'function') return {};
        const nested = readAlProps(xcon.contains('al') ? xcon.get('al') : null);
        const out = Object.assign({}, nested);
        AL_FLAT_TO_CANON.forEach(([canonical, flatKey]) => {
            if (xcon.contains(flatKey)) {
                out[canonical] = xcon.get(flatKey);
            }
        });
        return out;
    }

    function hasAlPropsObject(al) {
        return !!(al && typeof al === 'object' && Object.keys(al).length > 0);
    }

    function usesCoordinateLayout(comp) {
        return !!(comp && comp._xconParentCoordinateLayout);
    }

    function hasBoxChrome(comp) {
        if (!comp) return false;
        const bg = comp.bgColor || comp.backgroundColor || (comp.getValue && (comp.getValue('backgroundColor', '') || comp.getValue('bgColor', '')));
        const border = comp.border === true || comp.border === 'true' || comp.border === 1 || comp.border === '1';
        const borderObj = comp.getValue && comp.getValue('border', null);
        const borderVisible = borderObj && typeof borderObj === 'object' && borderObj.visible !== false && borderObj.visible !== 'false';
        const radius = comp.getValue && (comp.getValue('borderRadius', '') || comp.getValue('radius', ''));
        const padding = comp.getValue && comp.getValue('labelPadding', '');
        return !!(bg || border || borderVisible || radius || padding);
    }

    function getAlProps(comp) {
        if (comp && comp.alProps && typeof comp.alProps === 'object') {
            return comp.alProps;
        }
        return buildAlPropsFromXcon(comp);
    }

    function shouldRefreshAlPropsKey(key) {
        if (key === 'al') return true;
        return /^al[A-Z]/.test(String(key || ''));
    }

    /** 기본 true: pos 높이를 박스에 고정하지 않고 콘텐츠에 맞춤 */
    function panelAutoHeight(al) {
        if (!al) return true;
        if (al.fixedHeight === true || al.fixedHeight === 'true' || al.fixedHeight === '1') return false;
        if (al.autoHeight === false || al.autoHeight === 'false') return false;
        return true;
    }

    /**
     * stackMode:layers — layerPointerEvents
     * · 기본: 레이어 래퍼 pointer-events:none + 테마에서 레이어 직계 패널만 none(후손 패널까지 none 이면 일부 환경에서 클릭 소멸).
     * · 인터랙티브(버튼 등)는 초깃값 auto 로 수신; “패널 전체” 히트는 .xa-al-layer-hit 또는 alLayerPointerEvents:capture.
     */
    function normalizeLayerPointerEvents(raw) {
        const pass = { pe: 'none', extraClass: '' };
        const capture = { pe: 'auto', extraClass: ' xa-al-panel__layer--pe-capture' };
        if (raw == null || String(raw).trim() === '') {
            return pass;
        }
        const s = String(raw).trim().toLowerCase();
        if (s === 'auto' || s === 'all' || s === 'fill' || s === 'capture' || s === 'block') {
            return capture;
        }
        if (s === 'through' || s === 'passthrough' || s === 'pass-through' || s === 'pe-through' || s === 'none' || s === 'off') {
            return pass;
        }
        return pass;
    }

    /**
     * stackMode: layers — 자식 XCON의 al(및 alLayer*)에서 레이어 래퍼 인라인 스타일 생성
     */
    function readChildLayerOverlapStyle(xcon, index) {
        const o = buildAlPropsFromRawXcon(xcon);
        const zRaw = o.layerZ;
        let zIndex = 10 + index * 10;
        if (zRaw != null && String(zRaw).trim() !== '') {
            const n = parseInt(String(zRaw), 10);
            if (!isNaN(n)) zIndex = n;
        }
        const flexDir = o.layerFlexDirection || 'row';
        const alignItems = o.layerAlignItems || 'stretch';
        const justifyContent = o.layerJustifyContent || 'stretch';
        const padding = o.layerPadding != null && o.layerPadding !== '' ? o.layerPadding : '0';
        const pe = normalizeLayerPointerEvents(o.layerPointerEvents);
        /* 그리드 셀을 채워야 정렬이 동작. min-height:0 은 행 높이가 느슨할 때 레이어가 줄어 하단 고정이 깨질 수 있음 */
        return {
            style: `grid-area:1/1/-1/-1;align-self:stretch;place-self:stretch;width:100%;height:100%;min-width:0;min-height:100%;display:flex;flex-direction:${flexDir};align-items:${alignItems};justify-content:${justifyContent};z-index:${zIndex};padding:${padding};pointer-events:${pe.pe};box-sizing:border-box;`,
            extraClass: pe.extraClass || ''
        };
    }

    function isPanelStackLayersMode(alProps) {
        const raw = alProps && alProps.stackMode != null ? String(alProps.stackMode).trim().toLowerCase() : '';
        return raw === 'layers' || raw === 'layer' || raw === 'overlap';
    }

    /** @param {import('./xamong-ui-components.js').XaComponent} comp */
    function stripAbsoluteToFlexItem(comp, baseCss) {
        let s = baseCss || '';
        if (usesCoordinateLayout(comp)) {
            return `${s}box-sizing:border-box;`;
        }
        s = s.replace(/position:\s*absolute;?/gi, 'position: relative;');
        s = s.replace(/\s*left:\s*[^;]+;?/gi, '');
        s = s.replace(/\s*top:\s*[^;]+;?/gi, '');
        const al = getAlProps(comp);
        const ctor = comp.constructor && comp.constructor.name;
        const isBtn = ctor === 'XaButtonAL' || ctor === 'XaButton';
        const isImg = ctor === 'XaImageAL' || ctor === 'XaImage';
        const isBanner = ctor === 'XaBannerAL' || ctor === 'XaBanner';
        const isLabel = ctor === 'XaLabelAL' || ctor === 'XaLabel';
        const isBoxedLabel = isLabel && hasBoxChrome(comp);
        const hasAlKeys = al && typeof al === 'object' && Object.keys(al).length > 0;
        const parentAl = comp && comp._xconParentAlProps && typeof comp._xconParentAlProps === 'object'
            ? comp._xconParentAlProps
            : null;
        const parentDirection = parentAl && parentAl.direction != null
            ? String(parentAl.direction).trim().toLowerCase()
            : '';
        const parentIsRow = parentDirection === 'row';
        /** OTP 한 칸: 행 패널에서 width:100%를 주면 칸마다 줄바꿈되어 세로처럼 보임 → 기본은 줄어든 폭 */
        let otpRowShrink = false;
        if (ctor === 'XaTextFieldAL' && comp.getValue) {
            const oi = comp.getValue('otpIndex', '');
            const hasOtp = oi !== '' && oi != null && oi !== undefined;
            const layout = String(comp.getValue('otpLayout', 'row') || 'row').toLowerCase();
            otpRowShrink = hasOtp && layout !== 'column';
        }
        if (hasAlKeys) {
            if (al.flex != null) s += `flex: ${al.flex};`;
            if (al.alignSelf) s += `align-self: ${al.alignSelf};`;
            if (al.width) s += `width: ${al.width};`;
            if (al.minHeight) s += `min-height: ${al.minHeight};`;
            if (al.maxWidth) s += `max-width: ${al.maxWidth};`;
            if (al.minWidth) s += `min-width: ${al.minWidth};`;
            if (otpRowShrink && al.flex == null && !al.width) {
                s += 'flex: 0 0 auto; width: auto; max-width: 100%;';
                if (!al.alignSelf) s += 'align-self: center;';
            }
        } else if (isBtn || isBoxedLabel) {
            /*
             * Buttons and boxed labels keep their authored pos width/height.
             * The public renderer treats `at x y w h` as the visual box; appending
             * width:auto here makes bottom-tab labels expand by text width and can
             * push the fifth tab outside the phone frame.
             */
            s += parentIsRow
                ? 'align-self: flex-start; flex: 0 1 auto; max-width: 100%; min-width: 0;'
                : 'align-self: flex-start; flex: 0 0 auto; max-width: 100%;';
        } else if (isImg) {
            /* 이미지: pos 폭·높이 유지 (width:100% 덮어쓰면 행 안에서 타원·띠처럼 늘어남) */
            s += 'align-self: flex-start; flex: 0 0 auto; max-width: 100%; min-width: 0;';
        } else if (isBanner) {
            /* 배너: 한 열 전체 너비 + 명시 높이(getBaseStyle)로 슬라이드 뷰포트 측정 */
            s += 'align-self: stretch; width: 100%; max-width: 100%; min-width: 0; flex: 0 0 auto;';
        } else if (otpRowShrink) {
            s += 'align-self: center; flex: 0 0 auto; width: auto; max-width: 100%;';
        } else if (parentIsRow) {
            /* row 스택의 일반 자식은 pos 폭을 보존해야 다음 형제가 같은 줄에 배치된다. */
            s += 'flex: 0 0 auto; max-width: 100%; min-width: 0;';
        } else {
            s += 'align-self: stretch; width: 100%; max-width: 100%; min-width: 0;';
        }
        s += isBtn ? 'box-sizing: border-box;' : 'box-sizing: border-box; min-height: 0;';

        /* 배너 슬라이드 자식(bannerView_*): pos 고정 폭·높이(예: 560×260)를 제거하고 뷰포트(슬롯)에 맞춤 */
        const isBannerSlideView = comp && comp.key && String(comp.key).includes('bannerView_');
        if (isBannerSlideView) {
            s = s.replace(/\s*width:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*max-width:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*max-height:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*min-width:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*min-height:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*flex:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*align-self:\s*[^;]+;?/gi, '');
            s +=
                'align-self: stretch; flex: 1 1 auto; width: 100%; height: 100%; max-width: 100%; max-height: 100%; min-width: 0; min-height: 0;';
        }
        return s;
    }

    class XaLabelAL extends XaLabel {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
            this._initLabelAlChrome();
        }

        _initLabelAlChrome() {
            this.labelPadding = this.getValue('labelPadding', '');
            this.borderRadius = this.getValue('borderRadius', '');
            this.borderWidth = this.getValue('borderWidth', '');
            this.borderColor = this.getValue('borderColor', '');
            this.borderStyle = this.getValue('borderStyle', 'solid');
            this.prefixDot = this.getValue('prefixDot', false);
            this.suffixText = this.getValue('suffixText', '');
            this.suffixTextColor = this.getValue('suffixTextColor', '');
            this.editorialBar = this.getValue('editorialBar', false);
            this.editorialBarColor = this.getValue('editorialBarColor', 'var(--accent)');
            this.hintText = this.getValue('hintText', '');
        }

        _labelChromeStyle() {
            let s = '';
            if (this.labelPadding) s += `padding:${this.labelPadding};`;
            if (this.borderRadius) s += `border-radius:${this.borderRadius};`;
            if (this.borderWidth) {
                s += `border-width:${this.borderWidth};border-style:${this.borderStyle};box-sizing:border-box;`;
                if (this.borderColor) s += `border-color:${this._resolveCssColor(this.borderColor, '')};`;
            }
            return s;
        }

        _resolveCssColor(val, fallback) {
            if (!val) return fallback || '';
            const str = String(val).trim();
            if (str.indexOf('var(') === 0) return str;
            /* parseColor(r,g,b,a)는 "rgba(...)" 문자열을 잘못 쪼갬 — 테두리 등은 그대로 통과 */
            if (/^(rgba?|hsla?)\(/i.test(str)) return str;
            if (str.charAt(0) === '#') return str;
            return this.parseColor(str) || str;
        }

        /** 내부 본문이 display:flex라 text-align만으로는 가로 정렬이 안 먹음 → justify-content로 맞춤 */
        _justifyContentFromTextAlign() {
            const ta = String(this.textAlign || 'left').toLowerCase();
            if (ta === 'center' || ta === 'middle') return 'center';
            if (ta === 'right' || ta === 'end') return 'flex-end';
            if (ta === 'justify') return 'space-between';
            return 'flex-start';
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
            if (this._isLabelChromeKey(key)) this._initLabelAlChrome();
        }

        _isLabelChromeKey(key) {
            return [
                'labelPadding', 'borderRadius', 'borderWidth', 'borderColor', 'borderStyle',
                'prefixDot', 'suffixText', 'suffixTextColor', 'editorialBar', 'editorialBarColor', 'hintText'
            ].indexOf(key) >= 0;
        }

        /** @returns {{ on: boolean, dir: 'ltr' | 'rtl' }} */
        _parseShimmerOptions() {
            const raw = this.getValue('shimmer', '');
            const on =
                raw === true ||
                raw === 'true' ||
                raw === '1' ||
                String(raw).toLowerCase() === 'on';
            let dir = String(this.getValue('shimmerDirection', 'rtl') || 'rtl').toLowerCase();
            if (dir === 'rl' || dir === 'reverse' || dir === 'right' || dir === 'backward') dir = 'rtl';
            if (dir === 'lr' || dir === 'forward' || dir === 'left') dir = 'ltr';
            if (dir !== 'ltr' && dir !== 'rtl') dir = 'rtl';
            return { on, dir };
        }

        _shimmerClassList() {
            const { on, dir } = this._parseShimmerOptions();
            if (!on) return '';
            const mod = dir === 'ltr' ? ' xa-al-sk-shimmer--ltr' : ' xa-al-sk-shimmer--rtl';
            return ` xa-al-sk-shimmer${mod}`;
        }

        getBaseStyle(useBg = true, useFg = true) {
            const isBannerSlideView = this.key && String(this.key).includes('bannerView_');
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const al = getAlProps(this);
            /* pos 높이(예: 기본 28px)가 고정이면 다줄 라벨이 삐져 나와 다음 카드와 겹침 — 패널과 동일하게 기본은 높이 auto */
            if (panelAutoHeight(al) && !isBannerSlideView && !usesCoordinateLayout(this) && !hasBoxChrome(this)) {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height: auto !important;';
            }
            /* al.width 있을 때 조기 return 하면 아래 shimmer·560 처리가 빠져 스켈레톤 애니메이션이 안 보일 수 있음 */
            if (!isBannerSlideView && (!al || al.width == null || String(al.width).trim() === '')) {
                /* mkLabelV2 기본 pos 폭 560px만 풀폭으로 취급 — 56px 배지·스켈레톤 등 고정 폭은 유지 */
                if (/\bwidth:\s*560px/i.test(s)) {
                    s = s.replace(/\bwidth:\s*560px;?/gi, '');
                    s += 'width: auto; max-width: 100%; min-width: 0;';
                }
            }
            const sh = this._parseShimmerOptions();
            if (sh.on) {
                const animName = sh.dir === 'ltr' ? 'xa-al-shimmer-ltr' : 'xa-al-shimmer-rtl';
                /* 클래스만으로는 인라인 style과 충돌 시 애니메이션이 무시되는 경우가 있어 동일 값을 인라인으로 고정 */
                s += 'position: relative !important; overflow: hidden !important;';
                s +=
                    'background: linear-gradient(90deg, var(--bg2) 25%, var(--bg) 50%, var(--bg2) 75%) !important;';
                s += 'background-size: 200% 100% !important;';
                s += `animation: ${animName} 1.5s infinite !important;`;
            }
            return s;
        }

        render() {
            const base = this.getBaseStyle(true, true);
            const chrome = this._labelChromeStyle();
            const lh = this.getValue('lineHeight', '');
            const lineHeightCss =
                lh !== '' && lh != null ? String(lh) : '1.4';
            const textStyle = `
                font-family: ${this.font};
                font-size: ${this.fontSize}px;
                font-weight: ${this.bold ? 'bold' : this.fontWeight};
                font-style: ${this.italic ? 'italic' : 'normal'};
                text-decoration: ${this.getTextDecoration()};
                text-align: ${this.textAlign};
                line-height: ${lineHeightCss};
                padding: 0;
                margin: 0;
                min-width: 0;
            `;

            const iconHtml = this.icon ? `<span class="${this.iconLibrary}">${this.icon}</span>` : '';
            const dotOn = this.prefixDot === true || this.prefixDot === 'true' || this.prefixDot === '1';
            const dotHtml = dotOn
                ? '<span style="width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;"></span>'
                : '';

            let suffixHtml = '';
            if (this.suffixText) {
                const sc = this.suffixTextColor
                    ? this._resolveCssColor(this.suffixTextColor, '')
                    : 'inherit';
                suffixHtml = `<span style="color:${sc};margin-left:3px;">${this.escapeHtml(this.suffixText)}</span>`;
            }

            const editorial = this.editorialBar === true || this.editorialBar === 'true' || this.editorialBar === '1';
            const barCol = this._resolveCssColor(this.editorialBarColor, 'var(--accent)');
            const sk = this._parseShimmerOptions();
            const jc = this._justifyContentFromTextAlign();
            const va = this.getVerticalAlign();

            let mainHtml = '';
            if (editorial) {
                mainHtml = `
                    <div style="display:flex;align-items:${va};gap:12px;width:100%;min-width:0;">
                        <span style="flex-shrink:0;width:28px;height:2px;background:${barCol};"></span>
                        <span style="${textStyle}flex:1;display:flex;align-items:${va};flex-wrap:wrap;gap:5px;justify-content:${jc};">
                            ${iconHtml}
                            ${this.escapeHtml(this.text)}${suffixHtml}
                        </span>
                    </div>`;
            } else if (sk.on) {
                /* 스켈레톤: 텍스트(nbsp)가 위에 그려져 그라데이션이 가려지지 않도록 투명 처리 */
                mainHtml = `
                    <span style="${textStyle}display:flex;align-items:${va};flex-wrap:wrap;gap:5px;width:100%;min-height:100%;opacity:0;pointer-events:none;justify-content:${jc};">
                        ${dotHtml}
                        ${iconHtml}
                        ${this.escapeHtml(this.text)}${suffixHtml}
                    </span>`;
            } else {
                /* 가로 flex 줄에서 align-items = textVAlign(top/middle/bottom → getVerticalAlign) */
                mainHtml = `
                    <span style="${textStyle}display:flex;align-items:${va};justify-content:${jc};flex-wrap:wrap;gap:5px;width:100%;">
                        ${dotHtml}
                        ${iconHtml}
                        ${this.escapeHtml(this.text)}${suffixHtml}
                    </span>`;
            }

            const hintHtml = this.hintText
                ? `<div style="font-size:11px;color:var(--ink-3,#888);margin-top:4px;line-height:1.45;">${this.escapeHtml(this.hintText)}</div>`
                : '';

            const visDisp = this.visible ? 'flex' : 'none';
            const outerJustify = this.hintText ? 'flex-start' : va;
            const outerLayout = `display:${visDisp} !important;flex-direction:column;align-items:stretch;justify-content:${outerJustify};`;

            const extraClass = this.getValue('cssClass', '') || this.getValue('htmlClass', '');
            const labelCls = `xa-al-label${extraClass ? ` ${extraClass}` : ''}${this._shimmerClassList()}`;

            const html = `<div class="${labelCls}" style="${base}${chrome}${outerLayout}"
                     data-component="label"
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     ${this.getClickHandler()}>
                ${mainHtml}
                ${hintHtml}
            </div>`;

            this._initializeElement(() => {
                this.adjustFontSizeToFit();
            });

            return this.doPolymorph(html);
        }
    }

    const XA_AL_TF_ICONS = {
        email: '<svg class="xa-al-tf-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        search: '<svg class="xa-al-tf-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        lock: '<svg class="xa-al-tf-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        check: '<svg class="xa-al-tf-ico xa-al-tf-ico--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
        visibility: '<svg class="xa-al-tf-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    };

    function xaAlTfIconHtml(name) {
        if (!name) return '';
        const k = String(name).toLowerCase();
        return XA_AL_TF_ICONS[k] || '';
    }

    class XaTextFieldAL extends XaTextField {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            return stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
        }

        render() {
            let inputType =
                this.mode === 'password'
                    ? 'password'
                    : this.mode === 'email'
                        ? 'email'
                        : this.mode === 'number'
                            ? 'number'
                            : 'text';
            if (this.inputType && this.inputType !== 'text') {
                inputType = this.inputType;
            }
            if (this.secureTextEntry) {
                inputType = 'password';
            }

            const fontWeight = this.bold ? 'bold' : this.fontWeight;
            const fontStyle = this.italic ? 'italic' : 'normal';
            const textDecoration = this.getTextDecoration();
            const textAlign = this.textAlign || 'left';

            const foregroundColor = this.fgColor ? this.parseColor(this.fgColor) : '';
            const backgroundColor = this.bgColor ? this.parseColor(this.bgColor) : '';

            const displayValue = this.text || this.value || this.binding || '';
            const maxLengthAttr =
                this.maxLength && this.maxLength > 0 ? `maxlength="${this.maxLength}"` : '';
            const readonlyAttr = this.readonly ? 'readonly' : '';
            const disabledAttr = this.enabled ? '' : 'disabled';

            const fieldState = this.getValue('fieldState', '');
            const prefixIcon = this.getValue('prefixIcon', '');
            const suffixIcon = this.getValue('suffixIcon', '');
            const prefixText = this.getValue('prefixText', '');
            const suffixText = this.getValue('suffixText', '');
            const leadingBlock = this.getValue('leadingBlock', '');
            const postButton = this.getValue('postButton', '');
            const floatLabel = this.getValue('floatLabel', '');
            const otpIndexRaw = this.getValue('otpIndex', '');
            const otpGroup = this.getValue('otpGroup', 'al-otp');

            const stateClass =
                fieldState === 'success'
                    ? ' xa-al-tf--success'
                    : fieldState === 'error'
                        ? ' xa-al-tf--error'
                        : '';
            const hasOtp =
                otpIndexRaw !== '' &&
                otpIndexRaw !== null &&
                otpIndexRaw !== undefined;
            const otpClass = hasOtp ? ' xa-al-tf--otp' : '';

            let inputClass = `xa-al-tf${stateClass}${otpClass}`;
            if (leadingBlock) {
                inputClass += ' xa-al-tf--with-leading';
            }
            if (postButton) {
                inputClass += ' xa-al-tf--has-post';
            }
            if (floatLabel) {
                inputClass += ' xa-al-tf-float';
            }

            const colorInline = foregroundColor ? `color: ${foregroundColor};` : '';
            const bgInline = backgroundColor ? `background: ${backgroundColor};` : '';
            const hasExplicitBorder =
                this.xcon && typeof this.xcon.contains === 'function' && this.xcon.contains('border');
            const hasExplicitRadius =
                hasExplicitBorder ||
                (this.xcon && typeof this.xcon.contains === 'function' &&
                    (this.xcon.contains('round') || this.xcon.contains('borderRadius')));
            const toCssLength = (value, fallback = '0px') => {
                if (value === undefined || value === null || value === '') return fallback;
                if (typeof value === 'number') return `${value}px`;
                const raw = String(value).trim();
                if (/^-?\d+(?:\.\d+)?$/.test(raw)) return `${raw}px`;
                return raw;
            };
            const borderStyle = this.getValue('borderStyle', 'solid') || 'solid';
            const borderInline = hasExplicitBorder
                ? this.border
                    ? `border: ${toCssLength(this.borderWidth || 1, '1px')} ${borderStyle} ${this.parseColor(this.borderColor)};`
                    : 'border: none; box-shadow: none;'
                : '';
            const radiusInline =
                hasExplicitRadius && this.round !== undefined && this.round !== null && String(this.round).trim() !== ''
                    ? `border-radius: ${toCssLength(this.round)};`
                    : '';
            const prefixIconHtml = xaAlTfIconHtml(prefixIcon);
            const suffixIconHtml = xaAlTfIconHtml(suffixIcon);
            const prefixPaddingInline = prefixIconHtml
                ? 'padding-left: 38px;'
                : prefixText
                    ? 'padding-left: 34px;'
                    : '';
            const suffixPaddingInline = suffixIconHtml || suffixText ? 'padding-right: 38px;' : '';

            const fontStack =
                this.font && String(this.font).trim()
                    ? this.font
                    : "var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)";
            const inputStyle = `
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                margin: 0;
                outline: none;
                font-family: ${fontStack};
                font-size: ${this.fontSize}px;
                font-weight: ${fontWeight};
                font-style: ${fontStyle};
                text-decoration: ${textDecoration};
                text-align: ${textAlign};
                ${colorInline}
                ${bgInline}
                ${borderInline}
                ${radiusInline}
                ${prefixPaddingInline}
                ${suffixPaddingInline}
                min-height: 0;
            `;
            const fillWrapAttr = 'style="height:100%;min-height:0;"';

            const safeId = `xa_tf_${String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            const ph = this.escapeHtml(this.placeholder || '');
            const val = this.escapeHtml(displayValue);

            let wrapClass = 'xa-al-tf-addon-wrap';
            if (prefixIconHtml) wrapClass += ' has-prefix';
            if (prefixText) wrapClass += ' has-prefix-text';
            if (suffixIconHtml || suffixText) wrapClass += ' has-suffix';

            const otpData = hasOtp
                ? ` data-xa-otp-group="${this.escapeHtml(String(otpGroup))}" data-xa-otp-index="${this.escapeHtml(String(otpIndexRaw))}"`
                : '';

            const onInputFloat =
                floatLabel !== ''
                    ? " if(this.classList.contains('xa-al-tf-float')){this.classList.toggle('xa-al-tf-float--has-val',this.value.length>0);}"
                    : '';

            const commonInputAttrs = `type="${inputType}"
                   placeholder="${ph}"
                   value="${val}"
                   style="${inputStyle}"
                   class="${inputClass}"
                   id="${safeId}"
                   ${maxLengthAttr}
                   ${readonlyAttr}
                   ${disabledAttr}
                   ${otpData}
                   onfocus="handleTextFieldFocus('${this.key}', this)"
                   onblur="handleTextFieldBlur('${this.key}', this)"
                   oninput="handleTextFieldInput('${this.key}', this);${onInputFloat}"
                   onkeydown="handleTextFieldKeyDown('${this.key}', this, event)"
                   onkeyup="handleTextFieldKeyUp('${this.key}', this, event)"
                   ${this.getClickHandler()}`;

            let inner = '';

            if (floatLabel) {
                inner = `
            <div class="xa-al-tf-float-group" ${fillWrapAttr}>
                <input ${commonInputAttrs} />
                <label class="xa-al-tf-float-label" for="${safeId}">${this.escapeHtml(floatLabel)}</label>
            </div>`;
            } else if (leadingBlock && postButton) {
                inner = '<!-- leadingBlock+postButton 동시 사용 미지원 -->';
            } else if (leadingBlock) {
                inner = `
            <div class="xa-al-tf-block-wrap" ${fillWrapAttr}>
                <span class="xa-al-tf-pre">${this.escapeHtml(leadingBlock)}</span>
                <input ${commonInputAttrs} />
            </div>`;
            } else if (postButton) {
                inner = `
            <div class="xa-al-tf-block-wrap" ${fillWrapAttr}>
                <input ${commonInputAttrs} />
                <button type="button" class="xa-al-tf-post" onclick="this.textContent=this.textContent==='Apply'?'✓ Applied':'Apply'">${this.escapeHtml(postButton)}</button>
            </div>`;
            } else if (prefixIconHtml || suffixIconHtml || prefixText || suffixText) {
                const prefixHtml = prefixIconHtml
                    ? `<span class="xa-al-tf-prefix xa-al-tf-prefix-icon">${prefixIconHtml}</span>`
                    : prefixText
                        ? `<span class="xa-al-tf-prefix">${this.escapeHtml(prefixText)}</span>`
                        : '';
                const suffixIsBtn = suffixIcon === 'visibility';
                const suffixHtml = suffixIconHtml
                    ? suffixIsBtn
                        ? `<button type="button" class="xa-al-tf-suffix xa-al-tf-suffix-btn" aria-label="Toggle password" onclick="window.xaAlTogglePasswordVisibility && window.xaAlTogglePasswordVisibility(this)">${suffixIconHtml}</button>`
                        : `<span class="xa-al-tf-suffix${suffixIcon === 'check' ? ' xa-al-tf-suffix--success' : ''}">${suffixIconHtml}</span>`
                    : suffixText
                        ? `<span class="xa-al-tf-suffix xa-al-tf-suffix-text">${this.escapeHtml(suffixText)}</span>`
                        : '';
                inner = `
            <div class="${wrapClass}" ${fillWrapAttr}>
                ${prefixHtml}
                <input ${commonInputAttrs} />
                ${suffixHtml}
            </div>`;
            } else {
                inner = `<input ${commonInputAttrs} />`;
            }

            const html = `<div style="${this.getBaseStyle(false, false)}" class="xa-al-tf-root" data-component="textField" data-component-key="${this.key}" data-key="${this.key}">
            ${inner}
        </div>`;

            this._initializeElement();

            return this.doPolymorph(html);
        }
    }

    class XaTextViewAL extends XaTextView {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            if (this.html && !this.editable) {
                const v = String(this.getValue('textViewVariant', '') || '').toLowerCase();
                const staticModes = ['article', 'code', 'truncate', 'list', 'metadata'];
                if (staticModes.indexOf(v) >= 0) {
                    s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                    s += 'height:auto;min-height:0;max-width:100%;width:100%;box-sizing:border-box;';
                }
            }
            return s;
        }

        _renderStaticHtmlReadonly() {
            const base = this.getBaseStyle(true, true);
            const inner = this.text || '';
            const content = `<div style="${base}" class="xa-al-tv-root xa-al-tv-root--html" data-component="textView" data-component-key="${this.key}" data-key="${this.key}">
                <div class="xa-al-tv-html-chrome">${inner}</div>
            </div>`;
            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderStaticVariant(variant) {
            const base = this.getBaseStyle(true, true);
            const inner = this.text || '';
            const open = `<div style="${base}" class="xa-al-tv-root xa-al-tv-static" data-component="textView" data-component-key="${this.key}" data-key="${this.key}">`;

            if (variant === 'truncate') {
                const rid = `xa_tv_trunc_${String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                const content = `${open}
                <div class="tv-truncate collapsed" id="${rid}">${inner}</div>
                <button type="button" class="tv-read-more" data-xa-trunc-toggle="${rid}">Read more ↓</button>
            </div>`;
                this._initializeElement();
                return this.doPolymorph(content);
            }

            const content = `${open}${inner}</div>`;
            this._initializeElement();
            return this.doPolymorph(content);
        }

        render() {
            if (this.html && !this.editable) {
                const v = String(this.getValue('textViewVariant', '') || '').toLowerCase();
                const staticModes = ['article', 'code', 'truncate', 'list', 'metadata'];
                if (staticModes.indexOf(v) >= 0) {
                    return this._renderStaticVariant(v);
                }
                return this._renderStaticHtmlReadonly();
            }
            const fontWeight = this.bold ? 'bold' : this.fontWeight;
            const fontStyle = this.italic ? 'italic' : 'normal';
            const textDecoration = this.getTextDecoration();
            const horizontalAlign = this.getHorizontalAlign();
            const verticalAlign = this.getVerticalAlign();

            let overflowStyle = 'hidden';
            if (this.scroll === 'vertical') overflowStyle = 'auto';
            else if (this.scroll === 'horizontal') overflowStyle = 'auto';
            else if (this.scroll === 'both') overflowStyle = 'auto';

            const tvFont =
                this.font && String(this.font).trim()
                    ? this.font
                    : "var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)";
            const tvColor = this.fgColor ? this.parseColor(this.fgColor) : '';
            const textAreaStyle = `
                width: 100%;
                height: 100%;
                min-height: 80px;
                margin: 0;
                font-family: ${tvFont};
                font-size: ${this.fontSize}px;
                ${tvColor ? `color: ${tvColor};` : ''}
                font-weight: ${fontWeight};
                font-style: ${fontStyle};
                text-decoration: ${textDecoration};
                text-align: ${horizontalAlign};
                vertical-align: ${verticalAlign};
                outline: none;
                resize: vertical;
                overflow: ${overflowStyle};
                box-sizing: border-box;
                white-space: pre-wrap;
                word-wrap: break-word;
            `;

            const maxLengthAttr =
                this.maxLength && this.maxLength > 0 ? `maxlength="${this.maxLength}"` : '';
            const readonlyAttr = this.editable ? '' : 'readonly';
            const rowsAttr = this.lineNum ? `rows="${this.lineNum}"` : 'rows="4"';

            const content = `<div style="${this.getBaseStyle()}" class="xa-al-tv-root" data-component="textView" data-component-key="${this.key}" data-key="${this.key}">
                <textarea
                       class="xa-al-tf xa-al-tf-multiline"
                       style="${textAreaStyle}"
                       ${maxLengthAttr}
                       ${readonlyAttr}
                       ${rowsAttr}
                       ${this.enabled ? '' : 'disabled'}
                       placeholder="${this.escapeHtml(this.placeholder || '')}"
                       onfocus="handleTextViewFocus('${this.key}', this)"
                       onblur="handleTextViewBlur('${this.key}', this)"
                       oninput="handleTextViewInput('${this.key}', this)"
                       onkeydown="handleTextViewKeyDown('${this.key}', this, event)"
                       onkeyup="handleTextViewKeyUp('${this.key}', this, event)"
                       ${this.getClickHandler()}>${this.escapeHtml(this.text)}</textarea>
            </div>`;

            this._initializeElement();

            return this.doPolymorph(content);
        }
    }

    class XaVideoViewAL extends XaVideoView {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const mode = String(this.getValue('videoViewMode', '') || '').toLowerCase();
            if (mode === 'showcase') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto;min-height:0;width:100%;max-width:100%;position:relative;box-sizing:border-box;';
            }
            return s;
        }

        render() {
            const mode = String(this.getValue('videoViewMode', '') || '').toLowerCase();
            if (mode === 'showcase') {
                return this._renderShowcase();
            }
            return super.render();
        }

        /** component-showcase-basic.html §09 — id 접두사로 인스턴스 구분 */
        _renderShowcase() {
            const base = this.getBaseStyle(true, true);
            const sk = String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_');
            const idPlayer = `xa_vv_player_${sk}`;
            const idPoster = `xa_vv_poster_${sk}`;
            const idFill = `xa_vv_fill_${sk}`;
            const idThumb = `xa_vv_thumb_${sk}`;
            const idVcPlay = `xa_vv_vcplay_${sk}`;
            const idVcTime = `xa_vv_time_${sk}`;

            const content = `<div style="${base}" class="xa-al-vv-root" data-component="videoView" data-component-key="${this.key}" data-key="${this.key}" data-xa-vv-key="${sk}">
<div class="vv-showcase">
<div class="video-player" id="${idPlayer}">
<div class="video-player__poster" id="${idPoster}" onclick="window.xaAlVvPosterHide && window.xaAlVvPosterHide('${idPoster}')">
  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&amp;q=80" alt="">
  <div class="video-player__poster-inner">
    <div class="video-player__play-btn">
      <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>
    <div class="video-player__title">Mountain Timelapse · 4K</div>
    <div class="video-player__sub">42:18 · Nature Collection · 2026</div>
  </div>
</div>
<div class="video-controls">
  <div class="video-progress" id="xa_vv_prog_${sk}">
    <div class="video-progress__fill" id="${idFill}" style="width:35%"></div>
    <div class="video-progress__thumb" id="${idThumb}" style="right:calc(65% - 6px)"></div>
  </div>
  <div class="video-ctrl-row">
    <button type="button" class="vc-btn vc-fill" id="${idVcPlay}" onclick="window.xaAlVvTogglePlay && window.xaAlVvTogglePlay('${sk}')">
      <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" style="fill:currentColor"/></svg>
    </button>
    <button type="button" class="vc-btn vc-fill" onclick="window.xaAlVvSkipTime && window.xaAlVvSkipTime('${sk}', -10)">
      <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.84"/></svg>
    </button>
    <span class="vc-time" id="${idVcTime}">0:00 / 42:18</span>
    <span class="vc-spacer"></span>
    <div class="vc-vol">
      <button type="button" class="vc-btn" aria-label="Volume">
        <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      </button>
      <div class="vc-vol-slider"><div class="vc-vol-fill"></div></div>
    </div>
    <button type="button" class="vc-btn" aria-label="Fullscreen">
      <svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
    </button>
  </div>
</div>
</div>

<div class="sub-label">Playlist</div>
<div class="video-thumb-strip">
<div class="vt-item active">
  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&amp;q=60" alt="">
  <span class="vt-dur">42:18</span>
</div>
<div class="vt-item">
  <img src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&amp;q=60" alt="">
  <span class="vt-dur">28:05</span>
</div>
<div class="vt-item">
  <img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&amp;q=60" alt="">
  <span class="vt-dur">15:40</span>
</div>
<div class="vt-item">
  <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&amp;q=60" alt="">
  <span class="vt-dur">1:02:33</span>
</div>
<div class="vt-item">
  <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&amp;q=60" alt="">
  <span class="vt-dur">08:22</span>
</div>
<div class="vt-item">
  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&amp;q=60" alt="">
  <span class="vt-dur">33:17</span>
</div>
</div>
</div>
</div>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }
    }

    /** component-showcase-basic.html §10 — 탭 콘텐츠(원본 wvContents 와 동일) */
    const XA_AL_WV_URLS = [
        'https://xamong.com',
        'https://xamong.com/dashboard',
        'https://docs.xamong.com'
    ];
    const XA_AL_WV_TAB_CONTENTS = [
        '<img class="wv-hero" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&amp;q=80" alt=""><div class="wv-tags"><span class="wv-tag">Design System</span><span class="wv-tag">Components</span><span class="wv-tag">Open Source</span></div><h1>Welcome to Xamong UI</h1><p>A production-ready component library built for modern web applications. Accessible, composable, and beautifully designed from the ground up.</p><h2>Getting Started</h2><p>Install via npm: <code style="background:var(--bg2);padding:2px 6px;border-radius:4px;font-family:\'JetBrains Mono\',monospace;font-size:12px">npm install @xamong/ui</code></p><p>Browse the full <a href="#">component documentation →</a></p>',
        '<h1>Dashboard</h1><p>Overview of your analytics, active users, and system health.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px"><div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--ink)">2,847</div><div style="font-size:11px;color:var(--ink-3)">Active Users</div></div><div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--ink)">₩4.2M</div><div style="font-size:11px;color:var(--ink-3)">Monthly Revenue</div></div><div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--ink)">98.9%</div><div style="font-size:11px;color:var(--ink-3)">Uptime</div></div></div>',
        '<h1>Documentation</h1><h2>Quick Start</h2><p>Follow these steps to integrate the component library into your project.</p><ol style="padding-left:20px;font-size:13px;color:var(--ink-2);line-height:2"><li>Install the package via npm or yarn</li><li>Import components as needed</li><li>Apply your custom theme tokens</li><li>Deploy and enjoy production-ready UI</li></ol>'
    ];

    const xaAlWvActiveByKey = Object.create(null);
    function xaAlWvGetActive(sk) {
        if (xaAlWvActiveByKey[sk] === undefined) xaAlWvActiveByKey[sk] = 0;
        return xaAlWvActiveByKey[sk];
    }

    function xaAlWvRegisterShowcaseApi(g) {
        if (typeof g.xaAlWvNavigate === 'function') return;
        g.xaAlWvNavigate = function (sk, idx) {
            const fill = document.getElementById('xa_wv_load_' + sk);
            const contentEl = document.getElementById('xa_wv_content_' + sk);
            if (!fill || !contentEl) return;
            const i = idx !== undefined && idx !== null ? idx : xaAlWvGetActive(sk);
            fill.style.width = '0%';
            setTimeout(() => {
                fill.style.transition = 'width .6s ease';
                fill.style.width = '85%';
            }, 30);
            setTimeout(() => {
                fill.style.width = '100%';
            }, 680);
            setTimeout(() => {
                fill.style.width = '0%';
                fill.style.transition = 'none';
            }, 1200);
            setTimeout(() => {
                contentEl.innerHTML = XA_AL_WV_TAB_CONTENTS[i] || XA_AL_WV_TAB_CONTENTS[0];
            }, 400);
        };
        g.xaAlWvSelectTab = function (tab, idx, sk) {
            const tabsRoot = document.getElementById('xa_wv_tabs_' + sk);
            if (!tabsRoot) return;
            tabsRoot.querySelectorAll('.browser-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            xaAlWvActiveByKey[sk] = idx;
            const urlInp = document.getElementById('xa_wv_url_' + sk);
            if (urlInp && XA_AL_WV_URLS[idx] !== undefined) {
                urlInp.value = XA_AL_WV_URLS[idx];
            }
            g.xaAlWvNavigate(sk, idx);
        };
    }
    xaAlWvRegisterShowcaseApi(global);

    class XaWebViewAL extends XaWebView {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const mode = String(this.getValue('webViewMode', '') || '').toLowerCase();
            if (mode === 'showcase') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto;min-height:0;width:100%;max-width:100%;position:relative;box-sizing:border-box;';
            }
            return s;
        }

        render() {
            const mode = String(this.getValue('webViewMode', '') || '').toLowerCase();
            if (mode === 'showcase') {
                return this._renderShowcase();
            }
            return super.render();
        }

        /** component-showcase-basic.html §10 — id 접두사로 인스턴스 구분 */
        _renderShowcase() {
            const base = this.getBaseStyle(true, true);
            const sk = String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_');
            const idLoad = `xa_wv_load_${sk}`;
            const idUrl = `xa_wv_url_${sk}`;
            const idTabs = `xa_wv_tabs_${sk}`;
            const idContent = `xa_wv_content_${sk}`;
            const initialHtml = XA_AL_WV_TAB_CONTENTS[0] || '';

            const content = `<div style="${base}" class="xa-al-wv-root" data-component="webView" data-component-key="${this.key}" data-key="${this.key}" data-xa-wv-key="${sk}">
<div class="wv-showcase">
<div class="browser-frame">
<div class="wv-load-bar"><div class="wv-load-fill" id="${idLoad}"></div></div>
<div class="browser-titlebar">
  <div class="browser-dots">
    <div class="browser-dot browser-dot--red"></div>
    <div class="browser-dot browser-dot--yellow"></div>
    <div class="browser-dot browser-dot--green"></div>
  </div>
  <div class="browser-nav-btns">
    <button type="button" class="browser-nav-btn" disabled aria-label="Back"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
    <button type="button" class="browser-nav-btn" aria-label="Forward" onclick="window.xaAlWvNavigate&amp;&amp;window.xaAlWvNavigate('${sk}')"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
  </div>
  <div class="browser-url-bar">
    <span class="lock-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
    <input class="browser-url-input" id="${idUrl}" value="https://xamong.com" onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();window.xaAlWvNavigate&amp;&amp;window.xaAlWvNavigate(&quot;${sk}&quot;)}">
    <button type="button" class="browser-reload" aria-label="Reload" onclick="window.xaAlWvNavigate&amp;&amp;window.xaAlWvNavigate('${sk}')"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
  </div>
</div>
<div class="browser-tabs" id="${idTabs}">
  <div class="browser-tab active" onclick="window.xaAlWvSelectTab&amp;&amp;window.xaAlWvSelectTab(this,0,'${sk}')">
    <span class="browser-tab__favicon">🏠</span>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis">xamong.com</span>
    <span class="browser-tab__close" onclick="event.stopPropagation()">×</span>
  </div>
  <div class="browser-tab" onclick="window.xaAlWvSelectTab&amp;&amp;window.xaAlWvSelectTab(this,1,'${sk}')">
    <span class="browser-tab__favicon">📊</span>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis">Dashboard</span>
    <span class="browser-tab__close" onclick="event.stopPropagation()">×</span>
  </div>
  <div class="browser-tab" onclick="window.xaAlWvSelectTab&amp;&amp;window.xaAlWvSelectTab(this,2,'${sk}')">
    <span class="browser-tab__favicon">📖</span>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis">Docs</span>
    <span class="browser-tab__close" onclick="event.stopPropagation()">×</span>
  </div>
  <div class="browser-tab__add">+</div>
</div>
<div class="browser-body">
  <div class="wv-content" id="${idContent}">${initialHtml}</div>
</div>
</div>
</div>
</div>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }
    }

    /**
     * HTML 데모(.btn)와 같이 패딩·아이콘·그림자를 갖춘 버튼. Material 폰트 없이도 SVG 아이콘 사용.
     */
    function xaAlButtonPadding(fontSizePx, explicit) {
        if (explicit) return explicit;
        const s = Number(fontSizePx) || 14;
        if (s <= 11) return '5px 12px';
        if (s <= 12) return '6px 14px';
        if (s <= 13) return '8px 16px';
        if (s <= 14) return '10px 18px';
        return '12px 22px';
    }

    function xaAlButtonMinHeight(fontSizePx, posH) {
        const ph = parseInt(posH, 10);
        if (ph > 0) return `${ph}px`;
        const s = Number(fontSizePx) || 14;
        if (s <= 11) return '30px';
        if (s <= 12) return '34px';
        if (s <= 13) return '38px';
        if (s <= 14) return '40px';
        return '46px';
    }

    const XA_AL_BTN_ICON_SVG = {
        check: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
        approve: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
        info: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        add: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        favorite: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        share: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
        edit: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        delete: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
        search: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        file_download: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        cloud_download: '<svg class="xa-al-btn__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    };

    /** @param {string} [fgCss] 버튼과 동일한 전경색(이미 parseColor 등으로 해석된 CSS 값). Material ligature 폴백에만 인라인 color로 적용(SVG 아이콘은 currentColor로 버튼 color 상속). */
    function xaAlButtonIconHtml(icon, iconLibrary, fgCss) {
        if (!icon) return '';
        const key = String(icon).toLowerCase();
        if (XA_AL_BTN_ICON_SVG[key]) return XA_AL_BTN_ICON_SVG[key];
        /* 폴백: Material ligature (폰트 로드 시에만 보임) */
        const colorAttr =
            fgCss != null && String(fgCss).trim() !== ''
                ? ` style="color:${String(fgCss).replace(/"/g, '&quot;')}"`
                : '';
        return `<span class="${iconLibrary || 'material-icons'}"${colorAttr}>${icon}</span>`;
    }

    /** component-showcase-basic.html 의 .btn--primary / secondary / semantic 과 유사한 그림자 */
    function xaAlButtonBoxShadow(rawBg, ghostish, isLink) {
        if (isLink) return 'none';
        if (ghostish) {
            return 'var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08)), 0 1px 2px rgba(60,45,25,0.05)';
        }
        const r = String(rawBg || '');
        if (r.indexOf('--accent') >= 0) {
            return '0 2px 10px rgba(var(--accent-rgb), 0.34), 0 1px 3px rgba(60,45,25,0.08)';
        }
        if (r.indexOf('--green') >= 0) {
            return '0 2px 10px rgba(45, 125, 79, 0.32), 0 1px 3px rgba(60,45,25,0.06)';
        }
        if (r.indexOf('--red') >= 0) {
            return '0 2px 10px rgba(192, 58, 43, 0.32), 0 1px 3px rgba(60,45,25,0.06)';
        }
        if (r.indexOf('--blue') >= 0) {
            return '0 2px 10px rgba(43, 95, 160, 0.28), 0 1px 3px rgba(60,45,25,0.06)';
        }
        if (r.indexOf('28,23,16') >= 0 || r.indexOf('55,65,81') >= 0) {
            return '0 2px 10px rgba(28, 23, 16, 0.22), 0 1px 3px rgba(60,45,25,0.08)';
        }
        return '0 2px 10px rgba(60,45,25,0.14), var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08))';
    }

    class XaButtonAL extends XaButton {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            return stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
        }

        render() {
            if (this.components) {
                return super.render();
            }

            const pos = this.parsedPos || { width: 120, height: 40 };
            const fontSize = this.fontSize || 14;
            const padExplicit = this.getValue('buttonPadding', '') || this.getValue('padding', '');
            const stackLayoutRaw = String(this.getValue('alButtonLayout', 'row') || 'row').toLowerCase();
            const isStackCol =
                stackLayoutRaw === 'column' ||
                stackLayoutRaw === 'col' ||
                stackLayoutRaw === 'vertical';
            const stackGapRaw = this.getValue('alButtonLayoutGap', '');
            const stackGap =
                stackGapRaw !== '' && stackGapRaw != null && String(stackGapRaw).trim() !== ''
                    ? String(stackGapRaw).trim()
                    : isStackCol
                        ? '4px'
                        : '8px';
            let padding = xaAlButtonPadding(fontSize, padExplicit);
            const minH = xaAlButtonMinHeight(fontSize, pos.height);
            const rawLoad = this.getValue('loading', false);
            const loading = rawLoad === true || rawLoad === 'true' || rawLoad === '1';
            const al = getAlProps(this);
            const block = al && al.width === '100%';
            const appearance = this.getValue('buttonAppearance', '');
            const isLink = appearance === 'link' || appearance === 'text';
            if (isStackCol && !padExplicit && !isLink) {
                padding = '8px 4px';
            }
            const seg = this.getValue('alButtonSegment', 'only');
            const split = this.getValue('alButtonSplit', '') || '';

            const bw = (() => {
                const n = parseFloat(String(this.borderWidth != null ? this.borderWidth : '1.5'), 10);
                return Number.isFinite(n) ? n : 1.5;
            })();
            const bStyle = this.borderStyle || 'solid';

            const bg = this.bgColor ? this.parseColor(this.bgColor) : '#ffffff';
            const rawBg = String(this.bgColor || '');
            const bgStr = rawBg.toLowerCase().replace(/\s/g, '');
            const transparentBg = !this.bgColor || bgStr.indexOf('transparent') >= 0;
            const lightSurfaceBg =
                bgStr === '#fff' ||
                bgStr === '#ffffff' ||
                bgStr === 'white' ||
                /^rgba?\(\s*255\s*,\s*255\s*,\s*255\b/.test(bgStr);
            const cssSurfaceToken = /var\(\s*--surface/.test(rawBg);
            let ghostish = transparentBg || lightSurfaceBg || cssSurfaceToken;
            if (isLink) ghostish = true;

            let fg = this.fgColor
                ? this.parseColor(this.fgColor)
                : isLink
                    ? 'var(--accent, #C4622D)'
                    : ghostish
                        ? 'var(--ink-2, #6B5F4E)'
                        : '#ffffff';

            /* border: false(기본) — 테두리 없음. 예전 ghostish 헤어라인은 탭바 등에서 격자처럼 보여 제거함. 윤곽이 필요하면 border: true + borderColor. */
            const borderExplicit =
                this.border === true || this.border === 'true' || this.border === '1' || this.border === 1;
            const borderCss =
                isLink || !borderExplicit ? 'none' : `${bw}px ${bStyle} ${this.parseColor(this.borderColor)}`;

            let round =
                this.round !== undefined && this.round !== null && this.round !== ''
                    ? `${this.round}px`
                    : 'var(--r-sm, 6px)';
            const pw = parseInt(pos.width, 10) || 0;
            const ph = parseInt(pos.height, 10) || 0;

            const imageSrc = this.image ? this.resolveImagePath(this.image) : '';
            const imageHtml = this.image ? `<img class="xa-al-btn__img" src="${imageSrc}" alt="">` : '';

            let iconHtml = xaAlButtonIconHtml(this.icon, this.iconLibrary, fg);
            if (this.icon === 'plus' && String(this.iconLibrary || '').startsWith('material')) {
                iconHtml = XA_AL_BTN_ICON_SVG.add;
            }

            const textTrim = String(this.text == null ? '' : this.text).trim();
            const iconOnly = !textTrim && (!!this.icon || !!this.image) && !loading && !isLink;

            let sizeCss = '';
            if (iconOnly && pw > 0 && ph > 0) {
                const side = Math.min(pw, ph);
                padding = padExplicit || '0';
                sizeCss = `width: ${side}px; min-width: ${side}px; height: ${side}px; min-height: ${side}px;`;
                const rr = parseFloat(String(this.round != null ? this.round : '0'), 10);
                if (Number.isFinite(rr) && rr >= side / 2 - 1) {
                    round = '50%';
                }
            }

            const spinHtml = loading
                ? '<span class="xa-al-btn__spinner" aria-hidden="true"></span>'
                : '';

            const labelHtml = iconOnly
                ? '<span class="xa-al-btn__label xa-al-btn__label--empty" aria-hidden="true"></span>'
                : `<span class="xa-al-btn__label">${this.escapeHtml(this.text)}</span>`;

            const innerHtml = `${imageHtml}${iconHtml}${labelHtml}${spinHtml}`;

            let segClass = '';
            if (seg === 'first') segClass = ' xa-al-btn--seg-first';
            else if (seg === 'middle') segClass = ' xa-al-btn--seg-mid';
            else if (seg === 'last') segClass = ' xa-al-btn--seg-last';

            let splitClass = '';
            if (split === 'main') splitClass = ' xa-al-btn--split-main';
            else if (split === 'caret') splitClass = ' xa-al-btn--split-caret';

            const useSegmentChrome = seg !== 'only' && seg !== '';
            const useSplitChrome = split === 'main' || split === 'caret';
            const radiusCss = useSegmentChrome || useSplitChrome ? '' : `border-radius: ${round};`;

            const iconOnlyClass = iconOnly ? ' xa-al-btn--icon-only' : '';
            const linkClass = isLink ? ' xa-al-btn--link' : '';
            const stackColClass = isStackCol ? ' xa-al-btn--stack-col' : '';

            const stateClass = !this.enabled ? ' xa-al-btn--disabled' : '';
            const loadClass = loading ? ' xa-al-btn--loading' : '';
            const blockClass = block ? ' xa-al-btn--block' : '';

            const boxShadow = isLink
                ? 'none'
                : !borderExplicit && ghostish
                    ? 'none'
                    : xaAlButtonBoxShadow(rawBg, ghostish, isLink);
            const bgCss = isLink ? 'transparent' : bg;

            let flexDirection = 'row';
            let justifyContent = this.getHorizontalAlign();
            let alignItems = 'center';
            if (isStackCol) {
                flexDirection = 'column';
                justifyContent = this.getVerticalAlign();
                switch (this.textAlign) {
                    case 'center':
                        alignItems = 'center';
                        break;
                    case 'right':
                        alignItems = 'flex-end';
                        break;
                    default:
                        alignItems = 'flex-start';
                }
            }

            const buttonStyle = `
                border: ${borderCss};
                ${radiusCss}
                background: ${bgCss};
                color: ${fg};
                font-family: var(--font-body, ${this.font});
                font-size: ${fontSize}px;
                font-weight: ${this.bold ? 'bold' : this.fontWeight};
                font-style: ${this.italic ? 'italic' : 'normal'};
                text-align: ${this.textAlign};
                display: ${this.visible ? 'inline-flex' : 'none'} !important;
                align-items: ${alignItems};
                justify-content: ${justifyContent};
                flex-direction: ${flexDirection};
                gap: ${stackGap};
                margin: 0;
                padding: ${isLink ? '4px 8px' : padding};
                min-height: ${iconOnly ? 'auto' : minH};
                ${sizeCss}
                line-height: 1.2;
                white-space: ${isLink ? 'normal' : 'nowrap'};
                cursor: ${this.enabled && this.visible && !loading ? 'pointer' : 'not-allowed'};
                box-sizing: border-box;
                box-shadow: ${boxShadow};
                transition: filter 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                outline: none;
            `;

            const ariaLabel =
                this.title ||
                (iconOnly && this.icon ? String(this.icon) : '') ||
                textTrim ||
                '';
            const ariaAttr = ariaLabel ? ` aria-label="${this.escapeHtml(ariaLabel)}"` : '';

            const base = this.getBaseStyle(true, true);

            const content = `<button type="button" class="xa-al-btn${linkClass}${iconOnlyClass}${stackColClass}${segClass}${splitClass}${stateClass}${loadClass}${blockClass}" style="${base}${buttonStyle}"
                            data-component="button"
                            data-component-key="${this.key}"
                            data-key="${this.key}"
                            ${this.enabled && !loading ? '' : 'disabled'}
                            title="${this.escapeHtml(this.title || '')}"
                            ${ariaAttr}
                            ${this.getClickHandler()}>
                ${innerHtml}
            </button>`;

            this._initializeElement(() => {
                if (this.adjustFontSizeToFit) this.adjustFontSizeToFit();
            });

            return this.doPolymorph(content);
        }
    }

    class XaImageAL extends XaImage {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            return stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
        }

        render() {
            if (this.animation && this.images && Array.isArray(this.images) && this.images.length > 1) {
                return super.render();
            }

            const overlayTag = this.getValue('overlayTag', '');
            const overlayTitle = this.getValue('overlayTitle', '');
            const overlaySub = this.getValue('overlaySub', '');
            const hasOverlay =
                String(overlayTag || '').trim() !== '' ||
                String(overlayTitle || '').trim() !== '' ||
                String(overlaySub || '').trim() !== '' ||
                String(this.getValue('overlayCta', '') || '').trim() !== '';

            if (!hasOverlay) {
                return super.render();
            }

            const objectFitMap = {
                auto: 'contain',
                none: 'none',
                center: 'none',
                stretch: 'fill',
                fit: 'contain',
                fill: 'cover',
                tile: 'none',
                zoom: 'cover'
            };
            const objectFit = objectFitMap[this.fit] || 'contain';

            let imageSrc = this.resolveImagePath(this.finalImageSrc);

            let containerStyle = this.getBaseStyle();
            const additionalStyles = [];
            if (this.maxWidth) additionalStyles.push(`max-width: ${this.maxWidth}`);
            if (this.maxHeight) additionalStyles.push(`max-height: ${this.maxHeight}`);
            if (this.border) additionalStyles.push(`border: ${this.border}`);
            if (this.shadow) additionalStyles.push(`box-shadow: ${this.shadow}`);
            if (this.opacity !== '1') additionalStyles.push(`opacity: ${this.opacity}`);
            additionalStyles.push(`border-radius: ${this.borderRadius}`);
            additionalStyles.push('overflow: hidden');
            if (additionalStyles.length > 0) {
                containerStyle += `; ${additionalStyles.join('; ')}`;
            }

            const imageStyles = [
                'width: 100%',
                'height: 100%',
                `object-fit: ${objectFit}`,
                'border-radius: 0',
                'display: block'
            ];
            const alignMap = {
                topleft: 'top left',
                topcenter: 'top center',
                topright: 'top right',
                middleleft: 'center left',
                middlecenter: 'center center',
                middleright: 'center right',
                bottomleft: 'bottom left',
                bottomcenter: 'bottom center',
                bottomright: 'bottom right',
                center: 'center center'
            };
            const objectPosition = alignMap[this.imageAlign] || 'center center';
            imageStyles.push(`object-position: ${objectPosition}`);

            const imageStyle = imageStyles.join('; ');

            const errorHandler = this.showPlaceholder
                ? `onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"`
                : `onerror="this.style.display='none'"`;

            const fallbackSrc = this.fallbackImage
                ? `; if(this.src !== '${this.fallbackImage}') { this.src = '${this.fallbackImage}'; this.style.display='block'; }`
                : '';

            const tagHtml =
                String(overlayTag || '').trim() !== ''
                    ? `<span class="xa-al-img-overlay-tag">${this.escapeHtml(String(overlayTag))}</span>`
                    : '';

            const t1 = String(overlayTitle || '').trim();
            const t2 = String(overlaySub || '').trim();
            const t1Html = t1
                ? t1
                      .split('\n')
                      .map((line) => this.escapeHtml(line))
                      .join('<br>')
                : '';
            const t2Html = t2
                ? t2
                      .split('\n')
                      .map((line) => this.escapeHtml(line))
                      .join('<br>')
                : '';
            const overlayCta = String(this.getValue('overlayCta', '') || '').trim();
            const ctaHtml = overlayCta
                ? `<span class="xa-al-img-overlay-cta" role="presentation">${this.escapeHtml(overlayCta)}</span>`
                : '';
            const textBlock =
                t1 || t2 || overlayCta
                    ? `<div class="xa-al-img-overlay">
                ${t1Html ? `<div class="xa-al-img-overlay-title">${t1Html}</div>` : ''}
                ${t2Html ? `<div class="xa-al-img-overlay-sub">${t2Html}</div>` : ''}
                ${ctaHtml}
            </div>`
                    : '';

            const placeholderDisplay = this.showPlaceholder ? 'none' : 'none';
            const placeholderStyle = `
            width: 100%;
            height: 100%;
            background: #f3f4f6;
            display: ${placeholderDisplay};
            align-items: center;
            justify-content: center;
            color: #6b7280;
            font-size: 12px;
            border-radius: ${this.borderRadius};
        `;

            const content = `<div style="${containerStyle}"
                     class="xa-al-img-overlay-wrap"
                     data-component="image"
                     data-component-key="${this.key}"
                     data-key="${this.key}">
            <img src="${imageSrc}"
                 alt="${this.escapeHtml(this.alt)}"
                 style="${imageStyle}"
                 loading="${this.loading}"
                 ${errorHandler}${fallbackSrc}
                 ${this.getClickHandler()}>
            ${tagHtml}
            ${textBlock}
            ${this.showPlaceholder ? `<div style="${placeholderStyle}">🎨</div>` : ''}
        </div>`;

            this._initializeElement();

            return this.doPolymorph(content);
        }
    }

    const XA_AL_CB_SVG_CHECK =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

    function xaAlCbSplitTitleSub(text) {
        const t = String(text || '');
        const idx = t.indexOf(' · ');
        if (idx === -1) return { title: t, sub: '' };
        return { title: t.slice(0, idx), sub: t.slice(idx + 3) };
    }

    /** "📊 Analytics · Track behavior" → 아이콘(첫 이모지) + 제목 + 부제 */
    function xaAlCbParseCardText(text) {
        const t = String(text || '').trim();
        const re = /^(\p{Extended_Pictographic})\s+(.+)$/u;
        const m = t.match(re);
        if (!m) {
            const s = xaAlCbSplitTitleSub(t);
            return { icon: '', title: s.title, sub: s.sub };
        }
        const s2 = xaAlCbSplitTitleSub(m[2]);
        return { icon: m[1], title: s2.title, sub: s2.sub };
    }

    class XaCheckboxAL extends XaCheckbox {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const v = String(this.getValue('checkboxVariant', '') || '').toLowerCase();
            /* pos 기본 높이(예: 28px)가 카드·필·약관 행에 그대로 적용되면 콘텐츠가 잘림 */
            if (v === 'card' || v === 'pill' || v === 'terms') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto;';
            }
            if (v === 'card') {
                s += 'min-height:min-content;overflow:visible;box-sizing:border-box;';
            }
            if (v === 'pill') {
                s = s.replace(/\bwidth:\s*\d+px;?/gi, '');
                s += 'width:auto;max-width:100%;flex:0 0 auto;align-self:flex-start;';
            }
            return s;
        }

        render() {
            const variant = String(this.getValue('checkboxVariant', '') || '').toLowerCase();
            if (variant === 'pill') return this._renderPill();
            if (variant === 'card') return this._renderCard();
            if (variant === 'terms') return this._renderTerms();
            return this._renderList();
        }

        _appearanceMod() {
            const a = String(this.getValue('checkboxAppearance', '') || '').toLowerCase();
            if (a === 'green' || a === 'blue') return a;
            return '';
        }

        _isIndeterminate() {
            const raw = this.getValue('indeterminate', false);
            return (
                raw === true ||
                raw === 'true' ||
                raw === '1' ||
                this.state === 'indeterminate'
            );
        }

        _renderList() {
            const base = this.getBaseStyle(true, true);
            const indet = this._isIndeterminate();
            const appearance = this._appearanceMod();
            const labelHtml = this.getValue('labelHtml', '');

            let boxClass = 'xa-al-cb-box';
            if (appearance) boxClass += ` xa-al-cb-box--${appearance}`;
            if (indet) boxClass += ' xa-al-cb-box--indeterminate';

            const disabledCls = !this.enabled ? ' xa-al-cb-item--disabled' : '';
            const checkedAttr = this.checked && !indet ? 'checked' : '';

            let labelInner;
            if (labelHtml) {
                labelInner = `<span class="xa-al-cb-terms-wrap">${labelHtml}</span>`;
            } else {
                const parts = xaAlCbSplitTitleSub(this.text);
                labelInner =
                    parts.sub !== ''
                        ? `<span class="xa-al-cb-label"><p>${this.escapeHtml(parts.title)}</p><small>${this.escapeHtml(parts.sub)}</small></span>`
                        : `<span class="xa-al-cb-label xa-al-cb-label--plain">${this.escapeHtml(parts.title)}</span>`;
            }

            const content = `<label class="xa-al-cb-item${disabledCls}" style="${base}"
                data-component="checkbox"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="checkbox" class="xa-al-cb-input"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    ${indet ? 'data-xa-indeterminate="1"' : ''}
                    onchange="handleCheckboxChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <span class="${boxClass}" aria-hidden="true">${XA_AL_CB_SVG_CHECK}</span>
                ${labelInner}
            </label>`;

            this._initializeElement(() => {
                const inp = this.element && this.element.querySelector('.xa-al-cb-input');
                if (inp && indet) {
                    inp.indeterminate = true;
                }
            });

            return this.doPolymorph(content);
        }

        _renderCard() {
            const base = this.getBaseStyle(true, true);
            const { icon, title, sub } = xaAlCbParseCardText(this.text);
            const checkedAttr = this.checked ? 'checked' : '';
            const disabledCls = !this.enabled ? ' xa-al-cb-item--disabled' : '';

            const subHtml = sub
                ? `<div class="xa-al-cb-card-sub">${this.escapeHtml(sub)}</div>`
                : '';

            const content = `<label class="xa-al-cb-card${disabledCls}" style="${base}"
                data-component="checkbox"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="checkbox" class="xa-al-cb-card-input"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleCheckboxChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <span class="xa-al-cb-card-check" aria-hidden="true">${XA_AL_CB_SVG_CHECK}</span>
                ${icon ? `<div class="xa-al-cb-card-icon">${this.escapeHtml(icon)}</div>` : ''}
                <div class="xa-al-cb-card-title">${this.escapeHtml(title)}</div>
                ${subHtml}
            </label>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderPill() {
            const base = this.getBaseStyle(true, true);
            const checkedAttr = this.checked ? 'checked' : '';
            const disabledCls = !this.enabled ? ' xa-al-cb-item--disabled' : '';
            const t = this.escapeHtml(this.text || '');

            const content = `<label class="xa-al-cb-pill${disabledCls}" style="${base}"
                data-component="checkbox"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="checkbox" class="xa-al-cb-pill-input"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleCheckboxChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <span class="xa-al-cb-pill-lbl">${t}</span>
            </label>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderTerms() {
            const base = this.getBaseStyle(true, true);
            const labelHtml = this.getValue('labelHtml', '');
            const checkedAttr = this.checked ? 'checked' : '';

            const inner = labelHtml || this.escapeHtml(this.text || '');
            const content = `<label class="xa-al-cb-item xa-al-cb-item--terms" style="${base}align-items:flex-start;"
                data-component="checkbox"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="checkbox" class="xa-al-cb-input"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleCheckboxChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <span class="xa-al-cb-box" aria-hidden="true" style="margin-top:2px">${XA_AL_CB_SVG_CHECK}</span>
                <span class="xa-al-cb-terms-wrap">${inner}</span>
            </label>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }
    }

    function xaAlRbInputValue(comp) {
        const v = comp.getValue ? comp.getValue('value', '') : '';
        if (v !== '' && v != null) return String(v);
        const t = String(comp.text || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9_-]/g, '');
        return t || 'opt';
    }

    function xaAlRbSplitFeatures(raw) {
        const s = String(raw || '').trim();
        if (!s) return [];
        if (s.indexOf('|') >= 0) {
            return s
                .split('|')
                .map((x) => x.trim())
                .filter(Boolean);
        }
        return s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    }

    class XaRadioButtonAL extends XaRadioButton {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const v = String(this.getValue('radioVariant', '') || '').toLowerCase();
            if (v === '' || v === 'list') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto;width:100%;min-width:0;box-sizing:border-box;';
            } else if (v === 'segment') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s = s.replace(/\bwidth:\s*[^;]+;?/gi, '');
                s += 'height:auto;flex:1 1 0;min-width:0;width:auto;max-width:100%;align-self:stretch;box-sizing:border-box;';
            } else if (v === 'plan') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s = s.replace(/\bwidth:\s*[^;]+;?/gi, '');
                s += 'height:auto;flex:1 1 0;min-width:0;width:auto;max-width:100%;align-self:stretch;box-sizing:border-box;';
            } else if (v === 'rating') {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto;width:100%;min-width:0;box-sizing:border-box;';
            }
            return s;
        }

        render() {
            const v = String(this.getValue('radioVariant', '') || '').toLowerCase();
            if (v === 'segment') return this._renderSegment();
            if (v === 'plan') return this._renderPlan();
            if (v === 'rating') return this._renderRating();
            return this._renderList();
        }

        _renderList() {
            const base = this.getBaseStyle(true, true);
            const parts = xaAlCbSplitTitleSub(this.text);
            const labelInner =
                parts.sub !== ''
                    ? `<div class="xa-al-cb-label"><p>${this.escapeHtml(parts.title)}</p><small>${this.escapeHtml(
                          parts.sub
                      )}</small></div>`
                    : `<div class="xa-al-cb-label xa-al-cb-label--plain">${this.escapeHtml(parts.title)}</div>`;

            const disabledCls = !this.enabled ? ' xa-al-rb-item--disabled' : '';
            const checkedAttr = this.checked ? 'checked' : '';
            const safeId = `xa_rb_${String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            const val = this.escapeHtml(xaAlRbInputValue(this));
            const grp = this.escapeHtml(this.groupName || 'radioGroup');

            const content = `<label class="xa-al-rb-item${disabledCls}" style="${base}"
                data-component="radioButton"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="radio" class="xa-al-rb-input" id="${safeId}"
                    name="${grp}"
                    value="${val}"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleRadioButtonChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <span class="xa-al-rb-circle" aria-hidden="true"></span>
                ${labelInner}
            </label>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderSegment() {
            const base = this.getBaseStyle(true, true);
            const safeId = `xa_rb_${String(this.key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            const val = this.escapeHtml(xaAlRbInputValue(this));
            const grp = this.escapeHtml(this.groupName || 'radioGroup');
            const checkedAttr = this.checked ? 'checked' : '';
            const lbl = this.escapeHtml(String(this.text || ''));

            const content = `<div class="xa-al-rb-btn-item" style="${base}"
                data-component="radioButton"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="radio" class="xa-al-rb-seg-inp" id="${safeId}"
                    name="${grp}"
                    value="${val}"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleRadioButtonChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <label class="xa-al-rb-btn-label" for="${safeId}">${lbl}</label>
            </div>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderPlan() {
            const base = this.getBaseStyle(true, true);
            const name = this.escapeHtml(String(this.getValue('planName', '') || this.text || ''));
            const priceMain = this.escapeHtml(String(this.getValue('planPriceMain', '') || ''));
            const pricePerRaw = String(this.getValue('planPricePer', '') || '');
            const pricePer = pricePerRaw !== '' ? this.escapeHtml(pricePerRaw) : '';
            const feats = xaAlRbSplitFeatures(this.getValue('planFeatures', ''));
            const featsHtml = feats
                .map((line) => `<div class="xa-al-rb-plan__feat">${this.escapeHtml(line)}</div>`)
                .join('');

            const val = this.escapeHtml(xaAlRbInputValue(this));
            const grp = this.escapeHtml(this.groupName || 'radioGroup');
            const checkedAttr = this.checked ? 'checked' : '';

            const content = `<label class="xa-al-rb-plan" style="${base}"
                data-component="radioButton"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <input type="radio" class="xa-al-rb-plan-input" name="${grp}" value="${val}"
                    ${checkedAttr}
                    ${this.enabled ? '' : 'disabled'}
                    onchange="handleRadioButtonChange('${this.key}', this)"
                    ${this.getClickHandler()}>
                <div class="xa-al-rb-plan__badge">Popular</div>
                <div class="xa-al-rb-plan__name">${name}</div>
                <div class="xa-al-rb-plan__price">${priceMain}${
                pricePer !== '' ? `<span class="xa-al-rb-plan__per">${pricePer}</span>` : '<span class="xa-al-rb-plan__per"></span>'
            }</div>
                <div class="xa-al-rb-plan__features">${featsHtml}</div>
            </label>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }

        _renderRating() {
            const base = this.getBaseStyle(true, true);
            let n = parseInt(String(this.getValue('ratingValue', '4') || '4'), 10);
            if (Number.isNaN(n)) n = 4;
            n = Math.max(0, Math.min(5, n));

            let stars = '';
            for (let i = 1; i <= 5; i += 1) {
                stars += `<span class="xa-al-rb-star${i <= n ? ' on' : ''}" data-v="${i}" role="presentation">★</span>`;
            }
            const cap = `${n.toFixed(1)} out of 5 stars`;

            const content = `<div class="xa-al-rb-rating-wrap" style="${base}"
                data-component="radioButton"
                data-component-key="${this.key}"
                data-key="${this.key}">
                <div class="xa-al-rb-rating-row" data-xa-rating-value="${n}">${stars}</div>
                <p class="xa-al-rb-rating-cap">${this.escapeHtml(cap)}</p>
            </div>`;

            this._initializeElement();
            return this.doPolymorph(content);
        }
    }

    class XaPanelAL extends XaPanel {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            const full = super.getBaseStyle(useBg, useFg);
            if (/display:\s*none/i.test(full)) {
                return full;
            }
            const al = this.alProps;
            const autoH = panelAutoHeight(al);

            let s = full;
            if (usesCoordinateLayout(this)) {
                s += 'box-sizing: border-box;';
                if (!/display:\s*flex/i.test(s)) {
                    s += 'display: flex; flex-direction: column;';
                }
                return s;
            }
            s = s.replace(/position:\s*absolute;?/gi, 'position: relative;');
            s = s.replace(/\s*left:\s*[^;]+;?/gi, '');
            s = s.replace(/\s*top:\s*[^;]+;?/gi, '');
            const hasOwnAl = hasAlPropsObject(al);
            /*
             * Public renderer preserves pos width/height for plain coordinate panels.
             * If a panel has no `al`, it is still a coordinate box even when its parent
             * is an AL flow container. Removing height collapses hero/status cards and
             * makes full rendering diverge from the public renderer.
             */
            if (autoH && hasOwnAl) {
                s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                s += 'height: auto;';
            }
            /*
             * 교차축 stretch(기본 align-items)로 세로 스택에서 폭을 채움. 루트에 width:100%를 항상 붙이면
             * 부모 스택이 가로(row)일 때 형제 패널이 각각 100%를 요구해 한 줄·flex 비율이 깨짐(도크 3열 등).
             * 필요 시 XCON al.width / alWidth 로만 명시.
             */
            s += 'align-self: stretch; max-width: 100%; min-width: 0;';
            if (al && al.width != null && String(al.width).trim() !== '') {
                s += `width: ${al.width};`;
            }
            if (al && al.maxWidth) s += `max-width: ${al.maxWidth};`;

            if (!autoH) {
                if (al && al.minHeight) s += `min-height: ${al.minHeight};`;
                s += 'flex: 0 0 auto;';
            } else if (al && (al.usePosMinHeight === true || al.usePosMinHeight === 'true')) {
                const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                if (pos && pos.height) s += `min-height: ${pos.height}px;`;
                s += 'flex: 0 0 auto; min-height: auto;';
            } else {
                s += 'flex: 0 0 auto; min-height: auto;';
            }

            s += 'box-sizing: border-box;';
            if (!/display:\s*flex/i.test(s)) {
                s += 'display: flex; flex-direction: column;';
            }
            if (al && al.flex != null) s += `flex: ${al.flex};`;
            return s;
        }

        /**
         * 폼(xForm)과 동일하게 순서 기반으로 자식을 모으고, 상위에 applyDataBindingToComponent가 있으면 바인딩 적용.
         */
        renderComponentsAL() {
            if (!this.components) {
                return '<p style="text-align:center;color:var(--ink-3,#888);">컴포넌트가 없습니다.</p>';
            }
            if (!this.autoChildRendering) {
                return '<div class="xa-al-components-placeholder"></div>';
            }

            const allComponents = [];
            const componentsOrder = this.components.get('componentsOrder');
            const orderArray = typeof componentsOrder === 'string' ? componentsOrder.split(',') : [];

            if (orderArray.length > 0) {
                orderArray.forEach((name) => {
                    const n = name.trim();
                    if (this.components.contains(n)) {
                        const component = this.components.get(n);
                        if (isXCON(component)) {
                            allComponents.push({ key: n, data: component });
                        }
                    }
                });
            } else {
                this.components.keys.forEach((k) => {
                    if (k === 'componentsOrder') return;
                    const component = this.components.get(k);
                    if (isXCON(component)) {
                        allComponents.push({ key: k, data: component });
                    }
                });
            }

            let html = '';
            const bind =
                this.owner &&
                typeof this.owner.applyDataBindingToComponent === 'function'
                    ? (c) => this.owner.applyDataBindingToComponent(c)
                    : (c) => c;

            allComponents.forEach((comp) => {
                const processed = bind(comp.data);
                html += this.renderSingleComponentAL(processed, `${this.key}~${comp.key}`);
            });
            return html;
        }

        /**
         * stackMode: layers — 자식을 동일 그리드 셀에 겹쳐 쌓음(각 자식 al.layer* 로 z·정렬·패딩).
         */
        renderComponentsALLayers() {
            if (!this.components) {
                return '<p style="text-align:center;color:var(--ink-3,#888);">컴포넌트가 없습니다.</p>';
            }
            if (!this.autoChildRendering) {
                return '<div class="xa-al-components-placeholder"></div>';
            }

            const allComponents = [];
            const componentsOrder = this.components.get('componentsOrder');
            const orderArray = typeof componentsOrder === 'string' ? componentsOrder.split(',') : [];

            if (orderArray.length > 0) {
                orderArray.forEach((name) => {
                    const n = name.trim();
                    if (this.components.contains(n)) {
                        const component = this.components.get(n);
                        if (isXCON(component)) {
                            allComponents.push({ key: n, data: component });
                        }
                    }
                });
            } else {
                this.components.keys.forEach((k) => {
                    if (k === 'componentsOrder') return;
                    const component = this.components.get(k);
                    if (isXCON(component)) {
                        allComponents.push({ key: k, data: component });
                    }
                });
            }

            let html = '';
            const bind =
                this.owner &&
                typeof this.owner.applyDataBindingToComponent === 'function'
                    ? (c) => this.owner.applyDataBindingToComponent(c)
                    : (c) => c;

            allComponents.forEach((comp, idx) => {
                const processed = bind(comp.data);
                const inner = this.renderSingleComponentAL(processed, `${this.key}~${comp.key}`);
                const layer = readChildLayerOverlapStyle(processed, idx);
                html += `<div class="xa-al-panel__layer${layer.extraClass || ''}" style="${layer.style}">${inner}</div>`;
            });
            return html;
        }

        renderSingleComponentAL(component, key) {
            const ui = ComponentFactoryAL.createFromXCON(component, key, this.owner);
            if (!ui) {
                return `<div class="xa-al-error">컴포넌트 생성 실패: ${key}</div>`;
            }
            if (this._xconUseCoordinateLayout) {
                ui._xconParentCoordinateLayout = true;
            } else {
                ui._xconParentAlProps = this.alProps;
            }
            const html = ui.render();
            setTimeout(() => {
                if (ui.onLoadComplete && typeof ui.onLoadComplete === 'function') {
                    ui.onLoadComplete();
                }
            }, 10);
            return html;
        }

        /**
         * 좌표 기반 panel.render() 대신, 자식을 flex 스택(gap·패딩·스크롤 영역)으로 감싼다.
         */
        render() {
            this._xconUseCoordinateLayout = !hasAlPropsObject(this.alProps);
            let overflowX = 'hidden';
            let overflowY = 'hidden';
            let scrollbarHiddenClass = '';

            if (this.scroll !== 'none') {
                if (this.scroll === 'vertical') {
                    overflowX = 'hidden';
                    overflowY = 'auto';
                } else if (this.scroll === 'horizontal') {
                    overflowX = 'auto';
                    overflowY = 'hidden';
                } else if (this.scroll === 'both' || this.scroll === 'auto') {
                    overflowX = 'auto';
                    overflowY = 'auto';
                }
                if (!this.scrollbarVisible) {
                    scrollbarHiddenClass = this.getHiddenScrollbarClass();
                }
            }

            let backgroundStyle = '';
            if (this.bgColor) {
                backgroundStyle += `background-color: ${this.parseColor(this.bgColor)};`;
            } else {
                backgroundStyle += `background-color: transparent;`;
            }
            if (this.bgImage) {
                const imageSrc = this.resolveImagePath(this.bgImage);
                backgroundStyle += `background-image: url('${imageSrc}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
            }

            let borderStyle = '';
            if (this.border) {
                if (this.borderWidth === '-1' || this.borderWidth === -1) {
                    borderStyle = `
                        border-left: ${this.borderLeft}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                        border-top: ${this.borderTop}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                        border-right: ${this.borderRight}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                        border-bottom: ${this.borderBottom}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                    `;
                } else {
                    borderStyle = `border: ${this.borderWidth}px ${this.borderStyle} ${this.parseColor(this.borderColor)};`;
                }
            } else {
                borderStyle = 'border: none;';
            }

            const alProps = this.alProps;
            const coordinateLayout = this._xconUseCoordinateLayout;
            const gap = alProps.gap != null ? alProps.gap : 'var(--xa-gap-md,12px)';
            const pad = alProps.padding != null ? alProps.padding : 'var(--xa-pad-md,16px)';
            const stackExtraClass =
                alProps && alProps.stackClass
                    ? ` ${String(alProps.stackClass).trim().replace(/\s+/g, ' ')}`
                    : '';
            const stackDir = alProps.direction === 'row' ? 'row' : 'column';
            const alignItems = alProps.alignItems || 'stretch';
            const justify = alProps.justifyContent || (stackDir === 'row' ? 'flex-start' : 'flex-start');

            const autoH = panelAutoHeight(alProps);
            const isLayersStack = isPanelStackLayersMode(alProps);
            let layersStackMin = 'min(72vw, 420px)';
            if (isLayersStack) {
                const ap = alProps;
                if (ap && ap.minHeight != null && String(ap.minHeight).trim() !== '') {
                    layersStackMin = String(ap.minHeight).trim();
                } else if (!autoH && ap && ap.fixedHeight != null && String(ap.fixedHeight).trim() !== '') {
                    layersStackMin = String(ap.fixedHeight).trim();
                } else {
                    const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                    if (pos && pos.height) layersStackMin = `${pos.height}px`;
                }
            }

            const contentScrolls = this.scroll !== 'none';
            let bodyFlexStyle;
            let stackFlexStyle;
            let bodyMaxH = '';
            if (coordinateLayout) {
                bodyFlexStyle = contentScrolls ? 'flex: 1 1 auto; min-height: 0;' : 'flex: 1 1 auto; min-height: 0;';
                stackFlexStyle = 'flex: 1 1 auto; min-height: 0; width: 100%; height: 100%;';
                if (contentScrolls && (this.scroll === 'vertical' || this.scroll === 'both' || this.scroll === 'auto')) {
                    const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                    const mh = alProps.maxHeight || (pos && pos.height ? `${pos.height}px` : '');
                    if (mh) bodyMaxH = `max-height: ${mh};`;
                }
            } else if (isLayersStack) {
                bodyFlexStyle = contentScrolls
                    ? 'flex: 1 1 auto; min-height: 0;'
                    : autoH
                      ? 'flex: 0 0 auto; min-height: auto;'
                      : 'flex: 1 1 auto; min-height: 0;';
                if (contentScrolls) {
                    if (this.scroll === 'vertical') {
                        stackFlexStyle = 'flex: 0 0 auto; min-height: min-content; width: 100%;';
                    } else if (this.scroll === 'horizontal') {
                        stackFlexStyle = 'flex: 0 0 auto; min-width: min-content; width: 100%;';
                    } else {
                        stackFlexStyle = 'flex: 0 0 auto; min-height: min-content; min-width: min-content; width: 100%;';
                    }
                    if (this.scroll === 'vertical' || this.scroll === 'both' || this.scroll === 'auto') {
                        const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                        const mh = alProps.maxHeight || (pos && pos.height ? `${pos.height}px` : '');
                        if (mh) bodyMaxH = `max-height: ${mh};`;
                    }
                } else if (autoH) {
                    stackFlexStyle = 'flex: 0 0 auto; width: 100%; min-height: 0;';
                } else {
                    stackFlexStyle = 'flex: 1 1 auto; min-height: 0; width: 100%;';
                }
                /*
                 * layers: stackBoxStyle 앞부분의 min-height: ${layersStackMin} 을 이어 붙는 stackFlexStyle 의
                 * min-height:0 이 덮어써 그리드 행 높이가 0이 될 수 있음 → min-height:0 만 제거( flex 는 유지 ).
                 */
                if (stackFlexStyle) {
                    stackFlexStyle = String(stackFlexStyle).replace(/\s*min-height:\s*0;?/gi, '');
                }
            } else if (contentScrolls) {
                bodyFlexStyle = 'flex: 1 1 auto; min-height: 0;';
                /*
                 * 세로 스크롤: 스택에 flex:1을 주면 스택이 스크롤 뷰포트 높이만큼 늘어나고,
                 * 자식은 위쪽에만 붙어 하단에 빈 영역이 생김(폰 쇼케이스 탭바 위 흰 갭).
                 * 스크롤은 .xa-al-panel__body가 담당하므로 스택은 콘텐츠 높이만 쓰면 됨(flex: 0 0 auto).
                 */
                if (this.scroll === 'vertical') {
                    stackFlexStyle = 'flex: 0 0 auto; min-height: min-content;';
                } else if (this.scroll === 'horizontal') {
                    stackFlexStyle = 'flex: 0 0 auto; min-width: min-content;';
                } else {
                    stackFlexStyle = 'flex: 0 0 auto; min-height: min-content; min-width: min-content;';
                }
                if (this.scroll === 'vertical' || this.scroll === 'both' || this.scroll === 'auto') {
                    const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                    const mh = alProps.maxHeight || (pos && pos.height ? `${pos.height}px` : '');
                    if (mh) bodyMaxH = `max-height: ${mh};`;
                }
            } else if (autoH) {
                bodyFlexStyle = 'flex: 0 0 auto; min-height: auto;';
                stackFlexStyle = 'flex: 0 0 auto; min-height: min-content;';
            } else {
                bodyFlexStyle = 'flex: 1 1 auto; min-height: 0;';
                stackFlexStyle = 'flex: 1; min-height: 0;';
            }

            const outerOverflow =
                this.scroll === 'none' ? 'hidden' : 'hidden';

            const panelStyle = `
                ${borderStyle}
                border-radius: ${this.round}px;
                ${backgroundStyle}
                overflow: ${outerOverflow};
                box-shadow: ${this.shadow ? `0 ${this.shadowBlur}px ${this.shadowRadius}px ${this.shadowOpacity === '1' ? this.parseColor(this.shadowColor) : this.parseColor(this.shadowColor, this.shadowOpacity)}` : 'none'};
                display: ${this.visible ? 'flex' : 'none'} !important;
                flex-direction: column;
                min-width: 0;
            `;

            const componentsHtml =
                this.components && this.autoChildRendering
                    ? isLayersStack
                        ? this.renderComponentsALLayers()
                        : this.renderComponentsAL()
                    : '<div class="panel-content"></div>';

            let stackBoxClass = `xa-al-panel__stack${stackExtraClass}`;
            let stackBoxStyle;
            if (coordinateLayout) {
                stackBoxClass += ' xa-al-panel__stack--absolute';
                stackBoxStyle = `
                        position: relative;
                        display: block;
                        width: 100%;
                        height: 100%;
                        min-height: 100%;
                        box-sizing: border-box;
                        padding: 0;
                        ${stackFlexStyle}
                    `;
            } else if (isLayersStack) {
                stackBoxClass += ' xa-al-panel__stack--layers';
                stackBoxStyle = `
                        display: grid;
                        grid-template-columns: 1fr;
                        grid-template-rows: 1fr;
                        gap: 0;
                        align-items: stretch;
                        justify-items: stretch;
                        width: 100%;
                        min-height: ${layersStackMin};
                        ${!autoH ? 'height: 100%;' : ''}
                        box-sizing: border-box;
                        padding: 0;
                        ${stackFlexStyle}
                    `;
            } else {
                const rawWrap = alProps.wrap != null ? alProps.wrap : null;
                const stackWrap = rawWrap === true
                    ? 'wrap'
                    : rawWrap === false
                      ? 'nowrap'
                      : rawWrap != null && String(rawWrap).trim() !== ''
                        ? String(rawWrap).trim()
                        : 'nowrap';
                stackBoxStyle = `
                        display: flex;
                        flex-direction: ${stackDir};
                        flex-wrap: ${stackWrap};
                        align-items: ${alignItems};
                        justify-content: ${justify};
                        gap: ${gap};
                        width: 100%;
                        min-height: min-content;
                        box-sizing: border-box;
                        padding: ${pad};
                        ${stackFlexStyle}
                    `;
            }

            const bodyOverflowY = this.scroll === 'none' ? 'hidden' : overflowY;
            const bodyOverflowX = this.scroll === 'none' ? 'hidden' : overflowX;

            const rawUserChrome = this.style || '';
            const userChrome = expandThemeTokenAliases(rawUserChrome);
            this.style = '';
            const baseLayout = this.getBaseStyle(true, true);
            this.style = rawUserChrome;

            const content = `<div style="${baseLayout}${panelStyle}${userChrome}"
                     class="xa-al-panel-root ${scrollbarHiddenClass}"
                     data-component="panel"
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     ${this.getClickHandler()}>
                <div class="xa-al-panel__body" style="
                    ${bodyFlexStyle}
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    ${bodyMaxH}
                    overflow-x: ${bodyOverflowX};
                    overflow-y: ${bodyOverflowY};
                ">
                    <div class="${stackBoxClass}" style="${stackBoxStyle}">
                        ${componentsHtml}
                    </div>
                </div>
            </div>`;

            this._initializeElement();

            const dock = this.parsedDock;
            const hasMargin = this.margin && this.margin !== '' && this.margin !== '0';
            if (dock !== 'none' && hasMargin) {
                const wrapperStyle = this.getDockWrapperStyle(dock, this.parsedMargin);
                return `<div style="${wrapperStyle}">${content}</div>`;
            }

            return this.doPolymorph(content);
        }

        renderComponents() {
            return this.renderComponentsAL();
        }

        renderSingleComponent(component, key) {
            return this.renderSingleComponentAL(component, key);
        }
    }

    class XaBannerAL extends XaBanner {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        /** 슬라이드 트랙이 뷰포트 크기를 알 수 있도록 루트 높이·너비 명시 */
        _xaAlBannerOuterChrome() {
            const al = getAlProps(this);
            let h = this.getValue('bannerHeight', '');
            if (!h || String(h).trim() === '') {
                if (al && al.fixedHeight != null && String(al.fixedHeight).trim() !== '') h = al.fixedHeight;
                else if (al && al.minHeight != null && String(al.minHeight).trim() !== '') h = al.minHeight;
                else {
                    const pos = this.parsePosition && this.pos ? this.parsePosition(this.pos) : null;
                    h = usesCoordinateLayout(this) && pos && pos.height ? `${pos.height}px` : '320px';
                }
            }
            let s = usesCoordinateLayout(this)
                ? 'min-width:0;box-sizing:border-box;'
                : 'width:100%;min-width:0;box-sizing:border-box;';
            s += `height:${h};`;
            if (al && al.maxHeight != null && String(al.maxHeight).trim() !== '') {
                s += `max-height:${al.maxHeight};`;
            }
            return s;
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            s += this._xaAlBannerOuterChrome();
            return s;
        }

        render() {
            const variantRaw = String(this.getValue('bannerVariant', '') || '').trim();
            const safe = variantRaw.replace(/[^a-zA-Z0-9_-]/g, '');
            const isLanding =
                String(this.getValue('bannerChrome', '') || '').trim().toLowerCase() === 'landing' ||
                String(this.getValue('bannerVariant', '') || '').trim().toLowerCase() === 'hero';
            const cls =
                'xa-al-banner' +
                (safe ? ` xa-al-banner--${safe}` : '') +
                (isLanding ? ' xa-al-banner--landing' : '');
            const html = super.render();
            if (!html || html.indexOf('data-component="banner"') < 0) return html;
            return html.replace(/<div style="/, `<div class="${cls}" style="`);
        }
    }

    /**
     * XaShape — AL 패널/폼 flex 스택 안에서 position:absolute 를 제거하고 pos 크기를 유지.
     * (등록 누락 시 도형이 겹치거나 이후 형제가 보이지 않는 것처럼 보임)
     */
    class XaShapeAL extends XaShape {
        constructor(xcon, key, owner) {
            super(xcon, key, owner);
            this.alProps = buildAlPropsFromXcon(this);
        }
        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }
        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const al = getAlProps(this);
            const hasAl = al && typeof al === 'object' && Object.keys(al).length > 0;
            /* stripAbsolute 기본 else: width:100% — al 없는 shape는 pos 기준 고정 박스로 */
            if (!hasAl) {
                const pos = this.parsedPos || {};
                const pw = parseInt(pos.width, 10) || 0;
                const ph = parseInt(pos.height, 10) || 0;
                s = s.replace(/\bwidth:\s*100%;?/gi, '');
                s = s.replace(/\bmax-width:\s*100%;?/gi, '');
                s = s.replace(/\balign-self:\s*stretch;?/gi, 'align-self: flex-start;');
                if (pw > 0) s += `width:${pw}px;max-width:100%;`;
                if (ph > 0) s += `height:${ph}px;`;
                s += 'flex:0 0 auto;box-sizing:border-box;';
            }
            return s;
        }
    }

    class XaListAL extends XaList {
        constructor(xcon, key, playerHost) {
            super(xcon, key, playerHost);
            this.alProps = buildAlPropsFromXcon(this);
        }
        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
            const al = getAlProps(this);
            const v = String(this.getValue('xListVariant', '') || '').toLowerCase();
            if (v === 'showcase' || (al && (al.minHeight || al.maxHeight))) {
                s = s.replace(/\bheight:\s*[^;]+;?/gi, '');
                s += 'height:auto !important;min-height:0;';
            }
            if (al && al.minHeight) s += `min-height:${al.minHeight};`;
            if (al && al.maxHeight) s += `max-height:${al.maxHeight};`;
            if (usesCoordinateLayout(this)) {
                s += 'min-width:0;box-sizing:border-box;';
                return s;
            }
            s += 'align-self:stretch;width:100%;max-width:100%;min-width:0;box-sizing:border-box;';
            return s;
        }

        render() {
            const html = super.render();
            if (!html || html.indexOf('data-component="xList"') < 0) return html;
            return html.replace('<div style="', '<div class="xa-al-xlist-root" style="');
        }
    }

    /**
     * 폼: 헤더·본문을 flex로 구성하고, 자식은 순서대로 세로 스택(테마 변수 사용).
     * al / alGap / alPadding 등은 생성자에서 this.alProps로 병합 (패널·리프와 동일 스펙).
     */
    class XaFormAL extends XaForm {
        constructor(xcon, key, playerHost) {
            super(xcon, key, playerHost);
            this.alProps = buildAlPropsFromXcon(this);
        }

        updateProperty(key, value) {
            super.updateProperty(key, value);
            if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
        }

        toPositiveNumber(value, fallback) {
            const n = Number.parseFloat(String(value ?? '').trim());
            if (Number.isFinite(n) && n > 0) return n;
            return fallback;
        }

        getRootFormViewportFitStyle() {
            const base = `
                position: relative;
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                min-height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            `;
            if (String(this.key || '') !== 'root') return base;

            const pos = this.parsedPos || (this.parsePosition && this.pos ? this.parsePosition(this.pos) : null) || {};
            const configWidth = global.appHost && typeof global.appHost.getData === 'function'
                ? global.appHost.getData('config.width')
                : null;
            const configHeight = global.appHost && typeof global.appHost.getData === 'function'
                ? global.appHost.getData('config.height')
                : null;
            const intrinsicWidth = this.toPositiveNumber(configWidth, this.toPositiveNumber(pos.width, 402));
            const intrinsicHeight = this.toPositiveNumber(configHeight, this.toPositiveNumber(pos.height, 800));

            return `
                position: relative;
                display: flex;
                flex-direction: column;
                width: ${intrinsicWidth}px;
                max-width: 100%;
                height: min(${intrinsicHeight}px, calc(100vh - 24px));
                max-height: min(${intrinsicHeight}px, calc(100vh - 24px));
                min-height: 0;
                flex: 0 0 auto;
                box-sizing: border-box;
                overflow: hidden;
            `;
        }

        getBaseStyle(useBg = true, useFg = true) {
            let s = this.getRootFormViewportFitStyle();
            const full = super.getBaseStyle(useBg, useFg);
            if (full.includes('display: none')) s += 'display: none !important;';
            if (!this.enabled) s += 'opacity: 0.5; pointer-events: none;';
            if (this.style) s += expandThemeTokenAliases(this.style);
            return s;
        }

        render(skipOnLoadComplete = false) {
            this._xconUseCoordinateLayout = !hasAlPropsObject(this.alProps);
            if (!this.playerHost && global.appHost && global.appHost.playerHost) {
                this.playerHost = global.appHost.playerHost;
            }
            global.currentXaForm = this;

            if (!skipOnLoadComplete) this.initialize();

            let backgroundStyle = '';
            if (this.bgColor) {
                backgroundStyle += `background-color: ${this.parseColor(this.bgColor)};`;
            } else {
                backgroundStyle += `background: var(--surface, #fff);`;
            }
            if (this.bgImage) {
                const imageSrc = this.resolveImagePath(this.bgImage, this.playerHost);
                backgroundStyle += `background-image: url('${imageSrc}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
            }

            const formStyle = `
                border: ${this.parentController ? '0' : '1px solid var(--border, rgba(0,0,0,.08))'};
                border-radius: var(--r-lg, 16px);
                ${backgroundStyle}
                box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,.08));
                overflow: ${this.scroll !== 'none' ? 'auto' : 'hidden'};
            `;

            let html = `<div class="xa-al-form-root" style="${this.getBaseStyle()}${formStyle}"
                data-component="xForm" data-component-key="${this.key}" data-key="${this.key}"
                ${this.getClickHandler()}>`;

            let headerHeight = 0;
            if (!this.hidenavbar) {
                headerHeight = 52;
                html += `
                <div class="xa-al-form__header" style="height:${headerHeight}px;flex-shrink:0;">
                    <span>${this.escapeHtml(this.title)}</span>
                    ${this.closable ? `<button type="button" class="xa-al-close" aria-label="close"
                        onclick="this.closest('[data-component=xForm]').style.display='none'">×</button>` : ''}
                </div>`;
            }

            let scrollStyle = 'hidden';
            let scrollbarHiddenClass = '';
            if (this.scroll !== 'none') {
                scrollStyle = 'auto';
                scrollbarHiddenClass = this.getHiddenScrollbarClass();
            }

            html += `<div class="xa-al-form__body ${scrollbarHiddenClass}" style="
                flex:1;
                min-height:0;
                display:flex;
                flex-direction:column;
                overflow-y:${scrollStyle};
                overflow-x:hidden;
            ">`;
            const formGap = this.alProps.gap != null ? this.alProps.gap : 'var(--xa-gap-md,12px)';
            const formPad = this.alProps.padding != null ? this.alProps.padding : 'var(--xa-pad-md,16px)';
            const stackStyle = this._xconUseCoordinateLayout
                ? `
                position:relative;
                display:block;
                width:100%;
                min-height:100%;
                height:100%;
                box-sizing:border-box;
                padding:0;
                flex:1 1 auto;
            `
                : `
                display:flex;
                flex-direction:column;
                align-items:stretch;
                gap:${formGap};
                width:100%;
                min-height:min-content;
                box-sizing:border-box;
                padding:${formPad};
                flex:1;
            `;
            html += `<div class="xa-al-form__stack${this._xconUseCoordinateLayout ? ' xa-al-form__stack--absolute' : ''}" style="${stackStyle}">`;
            html += this.renderComponentsAL();
            html += `</div></div></div>`;

            this._initializeElement();

            if (!skipOnLoadComplete) {
                setTimeout(() => this.onLoadComplete(), 100);
            }
            return html;
        }

        /** dock 분류 없이 순서대로 세로 스택 */
        renderComponentsAL() {
            if (!this.components) {
                return '<p style="text-align:center;color:var(--ink-3,#888);">컴포넌트가 없습니다.</p>';
            }
            if (!this.autoChildRendering) {
                return '<div class="xa-al-components-placeholder"></div>';
            }

            const allComponents = [];
            const componentsOrder = this.components.get('componentsOrder');
            const orderArray = typeof componentsOrder === 'string' ? componentsOrder.split(',') : [];

            if (orderArray.length > 0) {
                orderArray.forEach((name) => {
                    const n = name.trim();
                    const component = this.getComponentByName(n);
                    if (component && isXCON(component)) {
                        allComponents.push({ key: n, data: component });
                    }
                });
            } else {
                this.components.keys.forEach((k) => {
                    if (k === 'componentsOrder') return;
                    const component = this.components.get(k);
                    if (isXCON(component)) {
                        allComponents.push({ key: k, data: component });
                    }
                });
            }

            let html = '';
            allComponents.forEach((comp) => {
                const processed = this.applyDataBindingToComponent(comp.data);
                html += this.renderSingleComponentAL(processed, `${this.key}~${comp.key}`);
            });
            return html;
        }

        renderComponents() {
            return this.renderComponentsAL();
        }

        renderSingleComponentAL(component, key) {
            const ui = ComponentFactoryAL.createFromXCON(component, key, this);
            if (!ui) {
                return `<div class="xa-al-error">컴포넌트 생성 실패: ${key}</div>`;
            }
            if (this._xconUseCoordinateLayout) {
                ui._xconParentCoordinateLayout = true;
            } else {
                ui._xconParentAlProps = this.alProps;
            }
            const html = ui.render();
            setTimeout(() => {
                if (ui.onLoadComplete && typeof ui.onLoadComplete === 'function') {
                    ui.onLoadComplete();
                }
            }, 10);
            return html;
        }

        renderSingleComponent(component, key) {
            return this.renderSingleComponentAL(component, key);
        }
    }

    function isXCON(o) {
        return o && typeof o.get === 'function' && typeof o.contains === 'function';
    }

    /**
     * xamong-ui-components-ext.js의 확장 클래스용 표준 AL 래퍼 (flex 스택 내 절대좌표 제거).
     * @param {new (...args: any[]) => import('./xamong-ui-components.js').XaComponent} Base
     */
    function createExtAlClass(Base) {
        return class extends Base {
            constructor(xcon, key, owner) {
                super(xcon, key, owner);
                this.alProps = buildAlPropsFromXcon(this);
            }
            updateProperty(key, value) {
                super.updateProperty(key, value);
                if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
            }
            getBaseStyle(useBg = true, useFg = true) {
                let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                if (String(this.getValue('extVariant', '') || '').toLowerCase() === 'showcase') {
                    s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                    s += 'height:auto;min-height:0;align-self:stretch;';
                }
                return s;
            }
        };
    }

    /**
     * xamong-ui-components-ext.js — ExtendedComponentType 값과 동일 (ComponentFactory.componentClasses 키).
     * window.Xa* 전역에 의존하지 않고 CF에서 직접 해석해 AL 매핑을 보장한다.
     */
    const EXT_COMPONENT_TYPE_KEYS = [
        'passwordField', 'textarea', 'select', 'slider', 'switch',
        'colorPicker', 'datePicker', 'timePicker', 'filePicker', 'imagePicker',
        'rating', 'progressBar', 'spinner', 'badge', 'avatar', 'icon',
        'divider', 'alert', 'tooltip', 'modal', 'tabs', 'accordion',
        'grid', 'flexBox', 'stack', 'spacer', 'card', 'searchBar',
        'treeView', 'carousel', 'gallery', 'qrCode', 'barcode', 'signaturePad'
    ];

    function getExtBaseClassFromFactory(typeKey) {
        if (!CF || !CF.componentClasses || !typeKey) return null;
        let Cls = CF.componentClasses[typeKey];
        if (typeof CF.resolveComponentClass === 'function') {
            Cls = CF.resolveComponentClass(Cls);
        } else if (typeof Cls === 'string') {
            Cls = global[Cls] || null;
        }
        return typeof Cls === 'function' ? Cls : null;
    }

    const AL_BY_CLASS = new Map([
        [XaForm, XaFormAL],
        [XaLabel, XaLabelAL],
        [XaTextField, XaTextFieldAL],
        [XaTextView, XaTextViewAL],
        [XaButton, XaButtonAL],
        [XaPanel, XaPanelAL],
        [XaImage, XaImageAL],
        [XaCheckbox, XaCheckboxAL],
        [XaRadioButton, XaRadioButtonAL],
        [XaVideoView, XaVideoViewAL],
        [XaWebView, XaWebViewAL],
        [XaBanner, XaBannerAL],
        [XaShape, XaShapeAL],
        [XaList, XaListAL]
    ]);

    /** 확장(ext) 컴포넌트: ComponentFactory의 기본 클래스와 동일 참조로 매핑 */
    function registerExtAlPair(Base, AL) {
        if (typeof Base === 'function' && typeof AL === 'function') {
            AL_BY_CLASS.set(Base, AL);
        }
    }

    /**
     * XaSelect: XCON에서 options가 배열이 아닌 객체/빈 값일 때 .map 오류 방지.
     */
    function normalizeSelectOptions(raw) {
        if (raw == null) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'object') {
            if (typeof raw.get === 'function' && typeof raw.contains === 'function') {
                if (raw.contains('valueList')) {
                    const vl = raw.get('valueList');
                    if (Array.isArray(vl)) return vl;
                }
                const nl = raw.nameList;
                const vl = raw.valueList;
                if (Array.isArray(vl) && vl.length) return vl;
                if (Array.isArray(nl) && Array.isArray(vl) && nl.length === vl.length) {
                    return vl;
                }
            }
            if (Array.isArray(raw.valueList)) return raw.valueList;
        }
        return [];
    }

    EXT_COMPONENT_TYPE_KEYS.forEach((typeKey) => {
        const Base = getExtBaseClassFromFactory(typeKey);
        if (!Base) return;
        if (typeKey === 'passwordField') {
            const PasswordFieldAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                    return `${s}height:auto;min-height:0;`;
                }
            };
            registerExtAlPair(Base, PasswordFieldAL);
            return;
        }
        if (typeKey === 'textarea') {
            const TextareaAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                    return `${s}height:auto;min-height:0;align-self:stretch;`;
                }
            };
            registerExtAlPair(Base, TextareaAL);
            return;
        }
        if (typeKey === 'select') {
            const SelectAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                    this.options = normalizeSelectOptions(this.options);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                    if (key === 'options') {
                        this.options = normalizeSelectOptions(this.getValue('options', []));
                    }
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    const v = String(this.getValue('selectVariant', '') || '').toLowerCase();
                    if (v === 'showcase') {
                        s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                        s += 'height:auto;min-height:0;';
                    }
                    return s;
                }
            };
            registerExtAlPair(Base, SelectAL);
            return;
        }
        if (typeKey === 'slider') {
            const SliderAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    if (String(this.getValue('extVariant', '') || '').toLowerCase() === 'showcase') {
                        s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                        s += 'height:auto;min-height:0;align-self:stretch;';
                    }
                    return s;
                }
            };
            registerExtAlPair(Base, SliderAL);
            return;
        }
        if (typeKey === 'switch') {
            const SwitchAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    if (String(this.getValue('extVariant', '') || '').toLowerCase() === 'showcase') {
                        s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                        s += 'height:auto;min-height:0;align-self:stretch;';
                    }
                    return s;
                }
            };
            registerExtAlPair(Base, SwitchAL);
            return;
        }
        if (typeKey === 'progressBar') {
            const ProgressBarAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    if (String(this.getValue('extVariant', '') || '').toLowerCase() === 'showcase') {
                        s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                        s += 'height:auto;min-height:0;align-self:stretch;';
                    }
                    return s;
                }
            };
            registerExtAlPair(Base, ProgressBarAL);
            return;
        }
        if (typeKey === 'spinner') {
            const SpinnerAL = class extends Base {
                constructor(xcon, key, owner) {
                    super(xcon, key, owner);
                    this.alProps = buildAlPropsFromXcon(this);
                }
                updateProperty(key, value) {
                    super.updateProperty(key, value);
                    if (shouldRefreshAlPropsKey(key)) this.alProps = buildAlPropsFromXcon(this);
                }
                getBaseStyle(useBg = true, useFg = true) {
                    let s = stripAbsoluteToFlexItem(this, super.getBaseStyle(useBg, useFg));
                    if (String(this.getValue('extVariant', '') || '').toLowerCase() === 'showcase') {
                        s = s.replace(/\s*height:\s*[^;]+;?/gi, '');
                        s += 'height:auto;min-height:0;align-self:stretch;';
                    }
                    return s;
                }
            };
            registerExtAlPair(Base, SpinnerAL);
            return;
        }
        registerExtAlPair(Base, createExtAlClass(Base));
    });

    /**
     * 리사이즈·내용 변화로 요소 높이가 바뀔 때 상위 AL 패널/폼 flex 스택이 재계산되도록 힌트.
     * (textarea 세로 드래그, 향후 동적 높이 컴포넌트에서 재사용)
     */
    function xaAlReflowAlLayoutAncestors(el) {
        if (!el) return;
        let n = el;
        const selectors = [
            '.xa-al-panel-root',
            '.xa-al-panel__body',
            '.xa-al-panel__stack',
            '.xa-al-form-root',
            '.xa-al-form__body',
            '.xa-al-form__stack'
        ];
        for (let d = 0; d < 24 && n && n !== document.body; d++) {
            if (n.nodeType === 1 && n.matches) {
                for (let i = 0; i < selectors.length; i++) {
                    if (n.matches(selectors[i])) {
                        void n.offsetHeight;
                        break;
                    }
                }
            }
            n = n.parentElement;
        }
    }

    global.xaAlReflowAlLayoutAncestors = xaAlReflowAlLayoutAncestors;

    function xaAlBindIntrinsicResize(el) {
        if (!el || typeof ResizeObserver === 'undefined') {
            return function noop() {};
        }
        const ro = new ResizeObserver(() => {
            xaAlReflowAlLayoutAncestors(el);
        });
        ro.observe(el);
        return function disconnect() {
            try {
                ro.disconnect();
            } catch (e) {
                /* ignore */
            }
        };
    }

    function needsPlayerHost(Cls) {
        return Cls === XaForm || Cls === XaList || Cls === XaController
            || Cls === XaFormAL || Cls === XaListAL;
    }

    /**
     * renderComponent('root')는 세 번째 인자로 PlayerHost 단독을 넘긴다.
     * 기존 팩토리는 owner.playerHost만 보므로 null이 되어 ApplicationService를 못 찾는다.
     */
    function resolvePlayerHostForFactory(owner) {
        if (!owner) {
            return global.appHost && global.appHost.playerHost ? global.appHost.playerHost : null;
        }
        if (owner.playerHost) {
            return owner.playerHost;
        }
        if (typeof owner.getService === 'function' && typeof owner.setServiceManager === 'function') {
            return owner;
        }
        let cur = owner;
        let ph = null;
        while (cur && !ph) {
            ph = cur.playerHost || null;
            cur = cur.owner || cur.parentController || null;
        }
        if (!ph && global.appHost && global.appHost.playerHost) {
            ph = global.appHost.playerHost;
        }
        if (!ph) {
            const co = global.appHost && global.appHost.getCurrentOwner ? global.appHost.getCurrentOwner() : null;
            ph = co && co.playerHost ? co.playerHost : null;
        }
        return ph;
    }

    const ComponentFactoryAL = {
        AL_BY_CLASS,

        createFromXCON(xcon, key, owner) {
            if (!xcon) {
                XCON.warn(`[AL] Component ${key} has no xcon`);
                return null;
            }
            let type = xcon.get('type');
            if (type && PublicProps && typeof PublicProps.normalizeComponentType === 'function') {
                type = PublicProps.normalizeComponentType(type);
            }
            // 구버전 ComponentFactory에는 typeAliases가 없을 수 있음 (publish용 축약 빌드)
            if (type && CF.typeAliases) {
                type = CF.typeAliases[type] || type;
            }
            if (!type) {
                XCON.warn(`[AL] Component ${key} has no type`);
                return null;
            }

            const classes = CF.componentClasses;
            if (!classes) {
                XCON.error('[AL] ComponentFactory.componentClasses가 없습니다.');
                return null;
            }

            let ComponentClass = classes[type];
            if (typeof CF.resolveComponentClass === 'function') {
                ComponentClass = CF.resolveComponentClass(ComponentClass);
            } else if (typeof ComponentClass === 'string') {
                ComponentClass = global[ComponentClass] || null;
            }

            if (AL_BY_CLASS.has(ComponentClass)) {
                ComponentClass = AL_BY_CLASS.get(ComponentClass);
            }

            if (!ComponentClass) {
                /* xamong-ui-components-adapter.js 가 ComponentFactory.createFromXCON 을 패치해
                 * registerXamongComponent 로 등록한 타입은 여기서가 아니라 코어 팩토리에서 생성된다.
                 * AL 전용 componentClasses 에 없는 커스텀 타입은 코어 팩토리에 위임한다. */
                const CFMain = global.ComponentFactory;
                if (CFMain && typeof CFMain.createFromXCON === 'function') {
                    try {
                        const viaCore = CFMain.createFromXCON(xcon, key, owner);
                        if (viaCore) {
                            if (typeof CF.registerComponent === 'function') {
                                CF.registerComponent(viaCore, key, owner);
                            }
                            return viaCore;
                        }
                    } catch (e) {
                        XCON.warn('[AL] ComponentFactory.createFromXCON (adapter/core) failed:', e);
                    }
                }
                const XaGenericClass = global.XaGeneric;
                if (XaGenericClass) {
                    const c = new XaGenericClass(xcon, key, owner);
                    if (typeof CF.registerComponent === 'function') {
                        CF.registerComponent(c, key, owner);
                    }
                    return c;
                }
                XCON.warn(`[AL] Unknown type: ${type}`);
                const Base = UIC && UIC.XaComponent;
                return Base ? new Base(xcon, key, owner) : null;
            }

            let component;
            if (needsPlayerHost(ComponentClass)) {
                const playerHost = resolvePlayerHostForFactory(owner);
                component = new ComponentClass(xcon, key, playerHost);
            } else {
                component = new ComponentClass(xcon, key, owner);
            }

            if (typeof CF.registerComponent === 'function') {
                CF.registerComponent(component, key, owner);
            }
            return component;
        }
    };

    global.ComponentFactoryAL = ComponentFactoryAL;
    global.XaFormAL = XaFormAL;
    global.XaPanelAL = XaPanelAL;

    global.XamongUIComponentsAL = {
        version: '1.0.0',
        ComponentFactoryAL,

        /** XCON에서 al 병합 규칙 (도구·테스트용) */
        buildAlPropsFromXcon,
        readAlProps,
        AL_NESTED_KEYS,
        AL_FLAT_TO_CANON,

        /**
         * XaCustomComponent 등 AL 플렉스 행에 넣을 때 — 절대좌표 제거 + 폭·정렬 보정
         * (xamong-ui-components-adapter.js 의 XaCustomComponent.getBaseStyle 에서 호출)
         */
        applyAlFlexBaseStyle(comp, baseCss) {
            return stripAbsoluteToFlexItem(comp, baseCss);
        },

        /** 동적 높이 변화 시 상위 AL 패널/폼 레이아웃 재계산 힌트 (textarea 리사이즈 등) */
        xaAlReflowAlLayoutAncestors,
        /** ResizeObserver로 요소 크기 변화 시 reflow (반환값: disconnect 함수) */
        xaAlBindIntrinsicResize,

        renderComponent(component, key, params = null) {
            XCON.log(`[AL] renderComponent: ${key}`, component);
            let ownerOrPlayerHost = null;
            if (key === 'root') {
                ownerOrPlayerHost = global.appHost && global.appHost.playerHost ? global.appHost.playerHost : null;
            }
            const ui = ComponentFactoryAL.createFromXCON(component, key, ownerOrPlayerHost);
            if (params && ownerOrPlayerHost) ui.parameter = params;
            if (ui) {
                if (ui instanceof XaList) {
                    global.XamongUIComponents.listInstances[key] = ui;
                }
                return ui.render();
            }
            return `<div class="xa-al-error">Unknown root</div>`;
        },

        setTheme(mode) {
            if (mode === 'dark' || mode === 'light') {
                document.documentElement.setAttribute('data-theme', mode);
            }
        },

        initThemeFromStorage() {
            // Theme is controlled by gstyle.xcon in app hosts.
        }
    };

    global.XamongUIComponentsAL.initThemeFromStorage();
})(typeof window !== 'undefined' ? window : globalThis);
