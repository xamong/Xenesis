/**
 * Xamong UI Components Advanced - Third-party Library Integration
 * 자몽 UI 컴포넌트 고급 - 서드파티 라이브러리 통합
 * Chart.js, CodeMirror, D3.js, Quill.js 등 다양한 라이브러리 연동
 */

// =============================================================================
// Advanced Component Types (고급 컴포넌트 타입)
// =============================================================================
const AdvancedComponentType = {
    // 차트 컴포넌트
    CHART: 'chart',
    
    // 코드 에디터 컴포넌트
    CODE_EDITOR: 'codeEditor',
    
    // 리치 텍스트 에디터 컴포넌트
    RICH_EDITOR: 'richEditor',
    
    // 데이터 시각화 컴포넌트
    DATA_VIZ: 'dataViz',
    
    // 플립북 컴포넌트
    FLIPBOOK: 'flipbook',
    
    // 네트워크 다이어그램 컴포넌트
    NETWORK_DIAGRAM: 'networkDiagram',
    
    // 지도 컴포넌트
    MAP: 'map',
    
    // 캘린더 컴포넌트
    CALENDAR: 'calendar',
    
    // 파일 업로드 컴포넌트
    FILE_UPLOAD: 'fileUpload',
    
    // 데이터 테이블 컴포넌트
    DATA_TABLE: 'dataTable',
    
    // 미디어 플레이어 컴포넌트
    MEDIA_PLAYER: 'mediaPlayer',
    
    // 3D 뷰어 컴포넌트
    THREE_D_VIEWER: 'threeDViewer'
};

// =============================================================================
// Library Loading System (라이브러리 로딩 시스템)
// =============================================================================
class LibraryLoader {
    static loadedLibraries = new Set();
    static loadingPromises = new Map();
    
    static libraryConfigs = {
        'chart.js': {
            scripts: ['https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'],
            check: () => {
                // Chart 객체가 존재하고 완전히 초기화되었는지 확인
                const isLoaded = typeof Chart !== 'undefined' && 
                        typeof Chart.defaults !== 'undefined' &&
                        typeof Chart.register !== 'undefined' &&
                        Chart.defaults.elements !== undefined;
                XCON.log('🔍 chart.js check function result:', isLoaded);
                if (isLoaded) {
                    XCON.log('✅ Chart.js is fully available and initialized');
                } else {
                    XCON.log('❌ Chart.js is not fully available:', {
                        Chart: typeof Chart !== 'undefined',
                        defaults: typeof Chart !== 'undefined' && typeof Chart.defaults !== 'undefined',
                        register: typeof Chart !== 'undefined' && typeof Chart.register !== 'undefined',
                        elements: typeof Chart !== 'undefined' && Chart.defaults && Chart.defaults.elements !== undefined
                    });
                }
                return isLoaded;
            }
        },
        'codemirror': {
            scripts: [
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/javascript/javascript.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/css/css.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/xml/xml.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/htmlmixed/htmlmixed.js'
            ],
            styles: ['https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.css'],
            check: () => typeof CodeMirror !== 'undefined'
        },
        'quill': {
            scripts: ['https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.js'],
            styles: ['https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css'],
            check: () => typeof Quill !== 'undefined'
        },
        'd3': {
            scripts: ['https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js'],
            check: () => typeof d3 !== 'undefined'
        },
        'd3v3': {
            scripts: ['https://d3js.org/d3.v3.min.js'],
            check: () => typeof d3 !== 'undefined'
        },
        'leaflet': {
            scripts: ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
            styles: ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'],
            check: () => typeof L !== 'undefined'
        },
        'fullcalendar': {
            scripts: ['https://cdn.jsdelivr.net/npm/fullcalendar@6.1.9/index.global.min.js'],
            check: () => typeof FullCalendar !== 'undefined'
        },
        'datatables': {
            scripts: [
                'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
                'https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js'
            ],
            styles: ['https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css'],
            check: () => typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined'
        },
        'three': {
            scripts: ['https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js'],
            check: () => typeof THREE !== 'undefined'
        },
        'videojs': {
            scripts: ['https://vjs.zencdn.net/8.6.1/video.min.js'],
            styles: ['https://vjs.zencdn.net/8.6.1/video-js.css'],
            check: () => typeof videojs !== 'undefined'
        }
    };
    
    static async loadLibrary(libraryName, config) {
        XCON.log('🔍 LibraryLoader.loadLibrary()1', libraryName);
        
        // 라이브러리가 로드됨으로 기록되어 있어도 실제 객체가 존재하는지 확인
        if (this.loadedLibraries.has(libraryName)) {
            // 실제 라이브러리 객체가 존재하는지 확인
            const isActuallyLoaded = await this._checkLibraryAvailability(libraryName, config);
            if (isActuallyLoaded) {
                return Promise.resolve();
            } else {
                // 라이브러리가 로드됨으로 기록되어 있지만 실제로는 사용할 수 없는 상태
                XCON.warn(`⚠️ Library ${libraryName} was marked as loaded but is not available, reloading...`);
                this.loadedLibraries.delete(libraryName);
            }
        }
        XCON.log('🔍 LibraryLoader.loadLibrary()2', libraryName);
        if (this.loadingPromises.has(libraryName)) {
            return this.loadingPromises.get(libraryName);
        }
        XCON.log('🔍 LibraryLoader.loadLibrary()3', libraryName);

        // D3.js 버전 충돌 방지
        if (libraryName === 'd3v3' && this.loadedLibraries.has('d3')) {
            XCON.warn('⚠️ D3.js v7 already loaded, skipping v3 to prevent conflicts');
            return Promise.resolve();
        }
        if (libraryName === 'd3' && this.loadedLibraries.has('d3v3')) {
            XCON.warn('⚠️ D3.js v3 already loaded, skipping v7 to prevent conflicts');
            return Promise.resolve();
        }
       
        const loadPromise = this._loadLibraryInternal(libraryName, config);
        this.loadingPromises.set(libraryName, loadPromise);
        
        try {
            await loadPromise;
            this.loadedLibraries.add(libraryName);
            this.loadingPromises.delete(libraryName);
            XCON.log(`✅ Library loaded: ${libraryName}`);
        } catch (error) {
            this.loadingPromises.delete(libraryName);
            XCON.error(`❌ Failed to load library: ${libraryName}`, error);
            throw error;
        }
        
        return loadPromise;
    }
    
    static async _checkLibraryAvailability(libraryName, config) {
        const libConfig = config || this.libraryConfigs[libraryName];
        if (!libConfig || !libConfig.check) {
            return true; // check 함수가 없으면 기본적으로 로드됨으로 간주
        }
        
        return libConfig.check();
    }
    
    static async _loadLibraryInternal(libraryName, config) {
        XCON.log(`🔍 _loadLibraryInternal: Starting load for ${libraryName}`);
        
        const libConfig = config || this.libraryConfigs[libraryName];
        if (!libConfig) {
            throw new Error(`Unknown library: ${libraryName}`);
        }
        
        XCON.log(`🔍 _loadLibraryInternal: Config found for ${libraryName}`, libConfig);
        
        // 이미 로드되었는지 확인
        if (libConfig.check && libConfig.check()) {
            XCON.log(`✅ _loadLibraryInternal: ${libraryName} already loaded, skipping`);
            return Promise.resolve();
        }
        
        XCON.log(`🔍 _loadLibraryInternal: ${libraryName} not loaded, proceeding with load`);
        
        // 스타일 로드
        if (libConfig.styles) {
            XCON.log(`🔍 _loadLibraryInternal: Loading styles for ${libraryName}`, libConfig.styles);
            await Promise.all(libConfig.styles.map(url => this._loadStylesheet(url)));
        }
        
        // 스크립트 로드
        if (libConfig.scripts) {
            XCON.log(`🔍 _loadLibraryInternal: Loading scripts for ${libraryName}`, libConfig.scripts);
            for (const url of libConfig.scripts) {
                await this._loadScript(url);
            }
        }
        
        // 로드 확인
        XCON.log(`🔍 _loadLibraryInternal: Checking if ${libraryName} loaded properly`);
        if (libConfig.check && !libConfig.check()) {
            XCON.error(`❌ _loadLibraryInternal: ${libraryName} failed final check`);
            throw new Error(`Library ${libraryName} failed to load properly`);
        }
        
        XCON.log(`✅ _loadLibraryInternal: ${libraryName} loaded successfully`);
    }
    
    static _loadScript(url) {
        return new Promise((resolve, reject) => {
            XCON.log(`🔍 _loadScript: Starting to load ${url}`);
            
            // 이미 로드된 스크립트가 있는지 확인
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                XCON.log(`⚠️ _loadScript: Script already exists in DOM: ${url}`);
                // 스크립트가 이미 있어도 Chart 객체가 실제로 사용 가능한지 확인
                if (url.includes('chart.js') && typeof Chart === 'undefined') {
                    XCON.log(`❌ _loadScript: Chart.js script exists but Chart object not available`);
                    // 기존 스크립트 제거하고 다시 로드
                    existingScript.remove();
                } else {
                    resolve();
                    return;
                }
            }
            
            const script = document.createElement('script');
            script.src = url;
            
            // 스크립트 로딩 타임아웃 설정 (10초)
            const timeoutId = setTimeout(() => {
                XCON.error(`❌ _loadScript: Timeout loading ${url}`);
                script.remove();
                reject(new Error(`Timeout loading script: ${url}`));
            }, 10000);
            
            script.onload = () => {
                clearTimeout(timeoutId);
                XCON.log(`✅ _loadScript: Successfully loaded ${url}`);
                XCON.log(`🔍 _loadScript: Chart object available:`, typeof Chart !== 'undefined');
                if (typeof Chart !== 'undefined') {
                    XCON.log(`🔍 _loadScript: Chart.defaults available:`, typeof Chart.defaults !== 'undefined');
                    XCON.log(`🔍 _loadScript: Chart.register available:`, typeof Chart.register !== 'undefined');
                    XCON.log(`🔍 _loadScript: Chart version:`, Chart.version || 'unknown');
                }
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeoutId);
                XCON.error(`❌ _loadScript: Failed to load ${url}`, error);
                XCON.error(`🔍 _loadScript: Network error details:`, {
                    type: error.type,
                    target: error.target,
                    currentTarget: error.currentTarget
                });
                reject(error);
            };
            
            XCON.log(`🔍 _loadScript: Appending script to head`);
            document.head.appendChild(script);
        });
    }
    
    static _loadStylesheet(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
}

// =============================================================================
// XaChart Class (Chart.js 기반 차트 컴포넌트)
// =============================================================================
class XaChart extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // pos 값 직접 수정 (부모에서 잘못 설정된 경우)
        if (xcon && xcon.get && xcon.get('pos')) {
            const directPos = xcon.get('pos');
            if (directPos && directPos !== this.pos) {
                XCON.log(`🔧 XaChart pos 값 수정: "${this.pos}" → "${directPos}"`);
                this.pos = directPos;
                this.parsedPos = this.parsePosition(this.pos);
            }
        }
        
        // 차트 속성들
        this.chartType = this.getValue('chartType', 'bar');
        this.chartData = this.getValue('chartData', {});
        this.chartOptions = this.getValue('chartOptions', {});
        this.width = this.getValue('width', 400);
        this.height = this.getValue('height', 300);
        this.responsive = this.getValue('responsive', true);
        this.animation = this.getValue('animation', true);
        
        // 이벤트 핸들러
        this.onDataPointClick = this.getValue('onDataPointClick');
        this.onChartReady = this.getValue('onChartReady');
        
        // 내부 상태
        this.chartInstance = null;
        this.isInitialized = false;
    }
    
    render() {
        const chartId = `chart-${this.key}`;
        
        const containerStyle = `
            ${this.getBaseStyle()}
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            box-sizing: border-box;
        `;
        
        const html = `
            <div class="xa-chart-container" style="${containerStyle}" data-component="chart" data-component-key="${this.key}" data-key="${this.key}">
                <canvas id="${chartId}" style="width: 100%; height: 100%;"></canvas>
                <div id="chart-loading-${this.key}" class="chart-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #666;
                    font-size: 14px;
                ">차트 로딩 중...</div>
            </div>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        
        XCON.logon('🔍 ####################################################################################');
        XCON.logon('🔍 XaChart.onLoadComplete()', this);
        XCON.logon('🔍 ####################################################################################');

        // DOM 렌더링 완료를 기다린 후 차트 초기화
        setTimeout(async () => {
            await this.initializeChart();
        }, 100);
    }
    
    // DOM 요소가 준비될 때까지 대기하는 유틸리티 메서드
    async waitForElement(elementId, maxWait = 3000) {
        const startTime = Date.now();
        XCON.log(`🔍 Waiting for element: ${elementId}`);
        
        while (Date.now() - startTime < maxWait) {
            const element = document.getElementById(elementId);
            if (element) {
                XCON.log(`✅ Element found: ${elementId}`);
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        XCON.log(`❌ Element not found after ${maxWait}ms: ${elementId}`);
        XCON.log(`🔍 Available elements with key "${this.key}":`, 
                   Array.from(document.querySelectorAll(`[id*="${this.key}"]`)).map(el => el.id));
        XCON.log(`🔍 All elements with 'chart' in id:`, 
                   Array.from(document.querySelectorAll(`[id*="chart"]`)).map(el => el.id));
        return null;
    }
    
    async initializeChart() {
        XCON.log('🔍 XaChart.initializeChart()', this.isInitialized);
        if (this.isInitialized) return;
        
        try {
            XCON.log('🔍 XaChart.initializeChart() 1');
            // Chart.js 라이브러리 로드
            await LibraryLoader.loadLibrary('chart.js');
            XCON.log('🔍 XaChart.initializeChart() 2');
            
            // Chart 객체 상태 확인
            XCON.log('🔍 Chart object status after load:');
            XCON.log('  - Chart exists:', typeof Chart !== 'undefined');
            XCON.log('  - Chart.defaults exists:', typeof Chart !== 'undefined' && typeof Chart.defaults !== 'undefined');
            XCON.log('  - Chart.register exists:', typeof Chart !== 'undefined' && typeof Chart.register !== 'undefined');
            XCON.log('  - Chart constructor:', typeof Chart !== 'undefined' && typeof Chart === 'function');
            
            if (typeof Chart === 'undefined') {
                XCON.error('❌ Chart object is not available after library load');
                throw new Error('Chart.js library not loaded properly');
            }
            const chartId = `chart-${this.key}`;
            let canvas = await this.waitForElement(chartId);
            XCON.log('🔍 XaChart.initializeChart() 3');

            if (!canvas) {
                XCON.error(`❌ Chart canvas not found: ${chartId}`);
                return;
            }
            
            XCON.log(`✅ Canvas found: ${chartId}`);
            const loadingDiv = document.getElementById(`chart-loading-${this.key}`);
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            let chartData = this.chartData;
            let chartOptions = this.chartOptions;
            if (chartData && chartData.constructor && chartData.constructor.name === 'XCON') {
                XCON.logon('🔧 XCON 데이터를 Chart.js 형식으로 변환');
                chartData = JSON.parse(this.chartData.toJSON());
            }
            if (chartOptions && chartOptions.constructor && chartOptions.constructor.name === 'XCON') {
                XCON.logon('🔧 XCON 옵션을 Chart.js 형식으로 변환');
                chartOptions = JSON.parse(this.chartOptions.toJSON());
            }

            // 차트 설정
            const config = {
                type: this.chartType,
                data: chartData,
                options: {
                    responsive: this.responsive,
                    animation: this.animation,
                    onClick: (event, elements) => {
                        if (elements.length > 0 && this.onDataPointClick) {
                            this.executeAction(this.onDataPointClick);
                        }
                    },
                    ...chartOptions
                }
            };
            
            // Chart.js 인스턴스 생성
            XCON.logon('🔍 Creating Chart instance with config:', config);
            XCON.logon('🔍 Canvas element:', canvas);
            XCON.logon('🔍 Canvas dimensions:', canvas.width, 'x', canvas.height);
            XCON.logon('🔍 xChart dimensions:', this.width, 'x', this.height);
 
            try {
                this.chartInstance = new Chart(canvas, config);
                XCON.log('✅ Chart instance created successfully:', this.chartInstance);
                this.isInitialized = true;
            } catch (chartError) {
                XCON.error('❌ Failed to create Chart instance:', chartError);
                throw chartError;
            }
            
            // 전역 인스턴스 저장
            if (!window.chartInstances) {
                window.chartInstances = {};
            }
            window.chartInstances[this.key] = this.chartInstance;
            
            // 차트 준비 완료 이벤트
            if (this.onChartReady) {
                this.executeAction(this.onChartReady);
            }
            
            XCON.log(`✅ Chart ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error(`❌ Chart ${this.key} initialization failed:`, error);
            
            // 에러 표시
            const loadingDiv = document.getElementById(`chart-loading-${this.key}`);
            if (loadingDiv) {
                loadingDiv.innerHTML = '차트 로딩 실패';
                loadingDiv.style.color = '#e74c3c';
            }
        }
    }
    
    updateData(newData) {
        if (this.chartInstance) {
            this.chartInstance.data = newData;
            this.chartInstance.update();
        }
    }
    
    dispose() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        if (window.chartInstances && window.chartInstances[this.key]) {
            delete window.chartInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// XaCodeEditor Class (CodeMirror 기반 코드 에디터)
// =============================================================================
class XaCodeEditor extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // pos 값 직접 수정 (부모에서 잘못 설정된 경우)
        if (xcon && xcon.get && xcon.get('pos')) {
            const directPos = xcon.get('pos');
            if (directPos && directPos !== this.pos) {
                XCON.log(`🔧 XaCodeEditor pos 값 수정: "${this.pos}" → "${directPos}"`);
                this.pos = directPos;
                this.parsedPos = this.parsePosition(this.pos);
            }
        }

        // 에디터 속성들
        this.mode = this.getValue('mode', 'javascript');
        this.theme = this.getValue('theme', 'default');
        this.lineNumbers = this.getValue('lineNumbers', true);
        this.readOnly = this.getValue('readOnly', false);
        this.value = this.getValue('value', '');
        this.placeholder = this.getValue('placeholder', '코드를 입력하세요...');
        
        // 이벤트 핸들러
        this.onChange = this.getValue('onChange');
        this.onFocus = this.getValue('onFocus');
        this.onBlur = this.getValue('onBlur');
        
        // 내부 상태
        this.editorInstance = null;
        this.isInitialized = false;
    }
    
    render() {
        const editorId = `editor-${this.key}`;
        const { x, y, width, height } = this.parsedPos;
        
        // 디버깅 로그 추가
        XCON.log(`🔍 XaCodeEditor.render() - key: ${this.key}`);
        XCON.log(`🔍 pos from XCON: ${this.pos}`);
        XCON.log(`🔍 parsedPos:`, this.parsedPos);
        XCON.log(`🔍 Rendering with: x=${x}, y=${y}, width=${width}, height=${height}`);
        
        const containerStyle = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            min-height: ${height}px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            box-sizing: border-box;
        `;
        
        const html = `
            <div class="xa-code-editor-container" style="${containerStyle}" data-component="codeEditor" data-component-key="${this.key}" data-key="${this.key}">
                <textarea id="${editorId}" placeholder="${this.placeholder}" style="
                    width: 100%;
                    height: 100%;
                    border: none;
                    outline: none;
                    resize: none;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    padding: 10px;
                    box-sizing: border-box;
                ">${this.value}</textarea>
                <div id="editor-loading-${this.key}" class="editor-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #666;
                    font-size: 14px;
                    z-index: 1000;
                ">에디터 로딩 중...</div>
            </div>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    // DOM 요소가 준비될 때까지 대기하는 유틸리티 메서드
    async waitForElement(elementId, maxWait = 3000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const element = document.getElementById(elementId);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        XCON.log(`🔍 Available elements with key "${this.key}":`, 
                   Array.from(document.querySelectorAll(`[id*="${this.key}"]`)).map(el => el.id));
        return null;
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        await this.initializeEditor();
    }
    
    async initializeEditor() {
        if (this.isInitialized) return;
        
        try {
            // CodeMirror 라이브러리 로드
            await LibraryLoader.loadLibrary('codemirror');
            
            const editorId = `editor-${this.key}`;
            const textarea = await this.waitForElement(editorId);
            
            if (!textarea) {
                XCON.error(`Editor textarea not found: ${editorId}`);
                return;
            }
            
            const loadingDiv = document.getElementById(`editor-loading-${this.key}`);
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // CodeMirror 인스턴스 생성
            this.editorInstance = CodeMirror.fromTextArea(textarea, {
                mode: this.mode,
                theme: this.theme,
                lineNumbers: this.lineNumbers,
                readOnly: this.readOnly,
                placeholder: this.placeholder
            });
            
            // CodeMirror 사이즈 설정
            const { width, height } = this.parsedPos;
            XCON.log(`🔍 Setting CodeMirror size: ${width}x${height}`);
            
            // 명시적 사이즈 설정
            this.editorInstance.setSize(width - 2, height - 2);
            
            // CodeMirror 컨테이너에 CSS 스타일 강제 적용
            const cmElement = this.editorInstance.getWrapperElement();
            if (cmElement) {
                cmElement.style.width = `${width - 2}px`;
                cmElement.style.height = `${height - 2}px`;
                cmElement.style.minHeight = `${height - 2}px`;
                cmElement.style.maxHeight = `${height - 2}px`;
                cmElement.style.border = 'none';
                cmElement.style.fontSize = '14px';
                
                // 스크롤 영역도 설정
                const scrollElement = cmElement.querySelector('.CodeMirror-scroll');
                if (scrollElement) {
                    scrollElement.style.height = `${height - 2}px`;
                    scrollElement.style.minHeight = `${height - 2}px`;
                    scrollElement.style.maxHeight = `${height - 2}px`;
                }
                
                XCON.log(`✅ CodeMirror wrapper styled: ${cmElement.style.width} x ${cmElement.style.height}`);
            }
            
            // 여러 번 refresh 호출로 확실히 렌더링
            setTimeout(() => {
                this.editorInstance.refresh();
                this.editorInstance.setSize(width - 2, height - 2);
            }, 100);
            
            setTimeout(() => {
                this.editorInstance.refresh();
                
                // 최종 사이즈 강제 적용
                const cmElement = this.editorInstance.getWrapperElement();
                if (cmElement) {
                    cmElement.style.height = `${height - 2}px`;
                    cmElement.style.minHeight = `${height - 2}px`;
                    
                    const scrollElement = cmElement.querySelector('.CodeMirror-scroll');
                    if (scrollElement) {
                        scrollElement.style.height = `${height - 2}px`;
                        scrollElement.style.minHeight = `${height - 2}px`;
                    }
                }
            }, 300);
            
            // 이벤트 핸들러 등록
            this.editorInstance.on('change', (instance, changeObj) => {
                if (this.onChange) {
                    this.executeAction(this.onChange);
                }
            });
            
            this.editorInstance.on('focus', (instance) => {
                if (this.onFocus) {
                    this.executeAction(this.onFocus);
                }
            });
            
            this.editorInstance.on('blur', (instance) => {
                if (this.onBlur) {
                    this.executeAction(this.onBlur);
                }
            });
            
            this.isInitialized = true;
            
            // 전역 인스턴스 저장
            if (!window.editorInstances) {
                window.editorInstances = {};
            }
            window.editorInstances[this.key] = this.editorInstance;
            
            XCON.log(`✅ Code Editor ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error(`❌ Code Editor ${this.key} initialization failed:`, error);
            
            // 에러 표시
            const loadingDiv = document.getElementById(`editor-loading-${this.key}`);
            if (loadingDiv) {
                loadingDiv.innerHTML = '에디터 로딩 실패';
                loadingDiv.style.color = '#e74c3c';
            }
        }
    }
    
    getEditorValue() {
        return this.editorInstance ? this.editorInstance.getValue() : '';
    }
    
    setEditorValue(value) {
        if (this.editorInstance) {
            this.editorInstance.setValue(value);
        }
    }
   
    dispose() {
        if (this.editorInstance) {
            this.editorInstance.toTextArea();
            this.editorInstance = null;
        }
        
        if (window.editorInstances && window.editorInstances[this.key]) {
            delete window.editorInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// XaRichEditor Class (Quill.js 기반 리치 텍스트 에디터)
// =============================================================================
class XaRichEditor extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // pos 값 직접 수정 (부모에서 잘못 설정된 경우)
        if (xcon && xcon.get && xcon.get('pos')) {
            const directPos = xcon.get('pos');
            if (directPos && directPos !== this.pos) {
                XCON.log(`🔧 XaRichEditor pos 값 수정: "${this.pos}" → "${directPos}"`);
                this.pos = directPos;
                this.parsedPos = this.parsePosition(this.pos);
            }
        }
        
        // 에디터 속성들
        this.theme = this.getValue('theme', 'snow');
        this.placeholder = this.getValue('placeholder', '내용을 입력하세요...');
        this.readOnly = this.getValue('readOnly', false);
        this.modules = this.getValue('modules', {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['clean'],
                ['link', 'image', 'video']
            ]
        });
        
        // 이벤트 핸들러
        this.onTextChange = this.getValue('onTextChange');
        this.onSelectionChange = this.getValue('onSelectionChange');
        
        // 내부 상태
        this.quillInstance = null;
        this.isInitialized = false;
    }
    
    render() {
        const editorId = `rich-editor-${this.key}`;
        const { x, y, width, height } = this.parsedPos;
        
        const containerStyle = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        `;
        
        const html = `
            <div class="xa-rich-editor-container" style="${containerStyle}" data-component="richEditor" data-component-key="${this.key}" data-key="${this.key}">
                <div id="${editorId}" style="height: 100%;"></div>
                <div id="rich-editor-loading-${this.key}" class="rich-editor-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #666;
                    font-size: 14px;
                ">리치 에디터 로딩 중...</div>
            </div>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        await this.initializeEditor();
    }
    
    async initializeEditor() {
        if (this.isInitialized) return;
        
        try {
            // Quill 라이브러리 로드
            await LibraryLoader.loadLibrary('quill');
            
            const editorId = `rich-editor-${this.key}`;
            const container = document.getElementById(editorId);
            const loadingDiv = document.getElementById(`rich-editor-loading-${this.key}`);
            
            if (!container) {
                XCON.error(`Rich editor container not found: ${editorId}`);
                return;
            }
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // Quill 인스턴스 생성
            this.quillInstance = new Quill(container, {
                theme: this.theme,
                placeholder: this.placeholder,
                readOnly: this.readOnly,
                modules: this.modules
            });
            
            // 이벤트 핸들러 등록
            this.quillInstance.on('text-change', (delta, oldDelta, source) => {
                if (this.onTextChange) {
                    this.executeAction(this.onTextChange);
                }
            });
            
            this.quillInstance.on('selection-change', (range, oldRange, source) => {
                if (this.onSelectionChange) {
                    this.executeAction(this.onSelectionChange);
                }
            });
            
            this.isInitialized = true;
            
            // 전역 인스턴스 저장
            if (!window.richEditorInstances) {
                window.richEditorInstances = {};
            }
            window.richEditorInstances[this.key] = this.quillInstance;
            
            XCON.log(`✅ Rich Editor ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error(`❌ Rich Editor ${this.key} initialization failed:`, error);
            
            // 에러 표시
            const loadingDiv = document.getElementById(`rich-editor-loading-${this.key}`);
            if (loadingDiv) {
                loadingDiv.innerHTML = '리치 에디터 로딩 실패';
                loadingDiv.style.color = '#e74c3c';
            }
        }
    }
    
    getContents() {
        return this.quillInstance ? this.quillInstance.getContents() : null;
    }
    
    setContents(contents) {
        if (this.quillInstance) {
            this.quillInstance.setContents(contents);
        }
    }
    
    getText() {
        return this.quillInstance ? this.quillInstance.getText() : '';
    }
    
    dispose() {
        if (this.quillInstance) {
            // Quill 인스턴스 정리
            this.quillInstance = null;
        }
        
        if (window.richEditorInstances && window.richEditorInstances[this.key]) {
            delete window.richEditorInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// XaDataViz Class (D3.js 기반 데이터 시각화)
// =============================================================================
class XaDataViz extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // pos 값 직접 수정 (부모에서 잘못 설정된 경우)
        if (xcon && xcon.get && xcon.get('pos')) {
            const directPos = xcon.get('pos');
            if (directPos && directPos !== this.pos) {
                XCON.log(`🔧 XaDataViz pos 값 수정: "${this.pos}" → "${directPos}"`);
                this.pos = directPos;
                this.parsedPos = this.parsePosition(this.pos);
            }
        }
        
        // 시각화 속성들
        this.vizType = this.getValue('vizType', 'bar');
        this.data = this.getValue('data', []);
        this.config = this.getValue('config', {});
        this.interactive = this.getValue('interactive', true);
        
        // 이벤트 핸들러
        this.onElementClick = this.getValue('onElementClick');
        this.onElementHover = this.getValue('onElementHover');
        
        // 내부 상태
        this.svg = null;
        this.isInitialized = false;
    }
    
    render() {
        const vizId = `dataviz-${this.key}`;
        const { x, y, width, height } = this.parsedPos;
        
        const containerStyle = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
        `;
        
        const html = `
            <div class="xa-dataviz-container" style="${containerStyle}" data-component="dataViz" data-component-key="${this.key}" data-key="${this.key}">
                <div id="${vizId}" style="width: 100%; height: 100%;"></div>
                <div id="dataviz-loading-${this.key}" class="dataviz-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #666;
                    font-size: 14px;
                ">데이터 시각화 로딩 중...</div>
            </div>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        await this.initializeVisualization();
    }
    
    async initializeVisualization() {
        if (this.isInitialized) return;
        
        try {
            // D3.js 라이브러리 로드 확인
            if (typeof d3 === 'undefined') {
                await LibraryLoader.loadLibrary('d3');
            }
            
            // D3.js 필수 함수 확인
            if (!d3.scaleOrdinal || !d3.schemeCategory10) {
                throw new Error('D3.js 라이브러리가 완전히 로드되지 않았습니다.');
            }
            
            const vizId = `dataviz-${this.key}`;
            const container = document.getElementById(vizId);
            const loadingDiv = document.getElementById(`dataviz-loading-${this.key}`);
            
            if (!container) {
                XCON.error(`Data visualization container not found: ${vizId}`);
                return;
            }
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // SVG 생성
            const containerRect = container.getBoundingClientRect();
            this.svg = d3.select(container)
                .append('svg')
                .attr('width', containerRect.width)
                .attr('height', containerRect.height);
            
            // 시각화 타입에 따른 렌더링
            this.renderVisualization();
            
            this.isInitialized = true;
            
            // 전역 인스턴스 저장
            if (!window.dataVizInstances) {
                window.dataVizInstances = {};
            }
            window.dataVizInstances[this.key] = this;
            
            XCON.log(`✅ Data Visualization ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error(`❌ Data Visualization ${this.key} initialization failed:`, error);
            
            // 에러 표시
            const loadingDiv = document.getElementById(`dataviz-loading-${this.key}`);
            if (loadingDiv) {
                loadingDiv.innerHTML = '데이터 시각화 로딩 실패';
                loadingDiv.style.color = '#e74c3c';
            }
        }
    }
    
    renderVisualization() {
        if (!this.svg) {
            XCON.error('SVG not initialized');
            return;
        }
        
        if (!this.data || this.data.length === 0) {
            XCON.warn('No data provided for visualization');
            // 빈 데이터 메시지 표시
            this.svg.selectAll('*').remove();
            this.svg.append('text')
                .attr('x', '50%')
                .attr('y', '50%')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '16px')
                .style('fill', '#666')
                .text('데이터가 없습니다');
            return;
        }
        
        try {
            // 기존 내용 제거
            this.svg.selectAll('*').remove();
            
            // 기본 막대 차트 구현
            if (this.vizType === 'bar') {
                this.renderBarChart();
            } else if (this.vizType === 'line') {
                this.renderLineChart();
            } else if (this.vizType === 'pie') {
                this.renderPieChart();
            } else {
                this.renderBarChart(); // 기본값
            }
        } catch (error) {
            XCON.error('Visualization rendering failed:', error);
            this.svg.selectAll('*').remove();
            this.svg.append('text')
                .attr('x', '50%')
                .attr('y', '50%')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('font-size', '16px')
                .style('fill', '#e74c3c')
                .text('시각화 렌더링 실패');
        }
    }
    
    renderBarChart() {
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const width = this.svg.attr('width') - margin.left - margin.right;
        const height = this.svg.attr('height') - margin.top - margin.bottom;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const x = d3.scaleBand()
            .rangeRound([0, width])
            .padding(0.1)
            .domain(this.data.map(d => d.label));
        
        const y = d3.scaleLinear()
            .rangeRound([height, 0])
            .domain([0, d3.max(this.data, d => d.value)]);
        
        g.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        g.append('g')
            .attr('class', 'axis axis--y')
            .call(d3.axisLeft(y));
        
        g.selectAll('.bar')
            .data(this.data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.label))
            .attr('y', d => y(d.value))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.value))
            .attr('fill', '#3498db')
            .on('click', (event, d) => {
                if (this.onElementClick) {
                    this.executeAction(this.onElementClick);
                }
            })
            .on('mouseover', (event, d) => {
                if (this.onElementHover) {
                    this.executeAction(this.onElementHover);
                }
            });
    }
    
    renderLineChart() {
        // 라인 차트 구현
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const width = this.svg.attr('width') - margin.left - margin.right;
        const height = this.svg.attr('height') - margin.top - margin.bottom;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const x = d3.scalePoint()
            .range([0, width])
            .domain(this.data.map(d => d.label));
        
        const y = d3.scaleLinear()
            .range([height, 0])
            .domain(d3.extent(this.data, d => d.value));
        
        const line = d3.line()
            .x(d => x(d.label))
            .y(d => y(d.value));
        
        g.append('g')
            .attr('class', 'axis axis--x')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x));
        
        g.append('g')
            .attr('class', 'axis axis--y')
            .call(d3.axisLeft(y));
        
        g.append('path')
            .datum(this.data)
            .attr('class', 'line')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2);
        
        g.selectAll('.dot')
            .data(this.data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.label))
            .attr('cy', d => y(d.value))
            .attr('r', 4)
            .attr('fill', '#3498db')
            .on('click', (event, d) => {
                if (this.onElementClick) {
                    this.executeAction(this.onElementClick);
                }
            });
    }
    
    renderPieChart() {
        // 파이 차트 구현
        const width = this.svg.attr('width');
        const height = this.svg.attr('height');
        const radius = Math.min(width, height) / 2 - 20;
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);
        
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        const pie = d3.pie()
            .value(d => d.value);
        
        const path = d3.arc()
            .outerRadius(radius)
            .innerRadius(0);
        
        const arc = g.selectAll('.arc')
            .data(pie(this.data))
            .enter().append('g')
            .attr('class', 'arc');
        
        arc.append('path')
            .attr('d', path)
            .attr('fill', (d, i) => color(i))
            .on('click', (event, d) => {
                if (this.onElementClick) {
                    this.executeAction(this.onElementClick);
                }
            });
        
        arc.append('text')
            .attr('transform', d => `translate(${path.centroid(d)})`)
            .attr('dy', '0.35em')
            .style('text-anchor', 'middle')
            .text(d => d.data.label);
    }
    
    updateData(newData) {
        this.data = newData;
        if (this.svg) {
            this.svg.selectAll('*').remove();
            this.renderVisualization();
        }
    }
    
    dispose() {
        if (this.svg) {
            this.svg.remove();
            this.svg = null;
        }
        
        if (window.dataVizInstances && window.dataVizInstances[this.key]) {
            delete window.dataVizInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// XaFlipbook Class (Turn.js 기반 플립북 컴포넌트)
// =============================================================================
class XaFlipbook extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // Flipbook 특정 속성들
        this.pageWidth = this.getValue('pageWidth', 600);
        this.pageHeight = this.getValue('pageHeight', 900);
        this.pages = this.getValue('pages', 1);
        this.pageFolder = this.getValue('pageFolder', 'content/magazine');
        this.loadRegions = this.getValue('loadRegions', false);
        this.autoCenter = this.getValue('autoCenter', true);
        this.duration = this.getValue('duration', 600);
        this.acceleration = this.getValue('acceleration', true);
        this.gradients = this.getValue('gradients', true);
        this.elevation = this.getValue('elevation', 50);
        this.when = this.getValue('when', {});
        
        // 페이지 데이터 (XCON 배열로 정의 가능)
        this.pageData = this.getValue('pageData', []);
        
        // 컨트롤 표시 여부
        this.showControls = this.getValue('showControls', true);
        this.showSlider = this.getValue('showSlider', true);
        this.showMiniatures = this.getValue('showMiniatures', true);
        this.showZoom = this.getValue('showZoom', true);
        this.showFullscreen = this.getValue('showFullscreen', true);
        
        // 이벤트 핸들러들
        this.onTurned = this.getValue('onTurned');
        this.onTurning = this.getValue('onTurning');
        this.onStart = this.getValue('onStart');
        this.onEnd = this.getValue('onEnd');
        this.onMissing = this.getValue('onMissing');
        
        // 내부 상태
        this.currentPage = 1;
        this.isInitialized = false;
        this.flipbookInstance = null;
    }
    
    render() {
        const flipbookId = `flipbook-${this.key}`;
        const viewerId = `viewer-${this.key}`;
        const controlsId = `controls-${this.key}`;
        const miniatureId = `miniatures-${this.key}`;
        
        // 플립북 컨테이너는 고정 크기 사용 (pos 값 무시)
        const containerStyle = `
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 500px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
        `;
        
        const html = `
            <div class="xa-flipbook-container" style="${containerStyle}" data-component="flipbook" data-component-key="${this.key}" data-key="${this.key}">
                <div class="catalog-app">
                    <div id="${viewerId}" class="flipbook-viewer">
                        <div id="${flipbookId}" class="ui-flipbook">
                            ${this.renderPages()}
                            ${this.showControls ? '<a ignore="1" class="ui-arrow-control ui-arrow-next-page"></a>' : ''}
                            ${this.showControls ? '<a ignore="1" class="ui-arrow-control ui-arrow-previous-page"></a>' : ''}
                        </div>
                    </div>
                    
                    ${this.showControls ? this.renderControls(controlsId) : ''}
                    ${this.showMiniatures ? this.renderMiniatures(miniatureId) : ''}
                </div>
            </div>
            
            <style>
                .xa-flipbook-container {
                    position: relative !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 500px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: #f8f9fa !important;
                }
                
                .catalog-app {
                    width: 100% !important;
                    height: 100% !important;
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                .flipbook-viewer {
                    position: relative !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-width: 600px !important;
                    min-height: 400px !important;
                }
                
                .ui-flipbook {
                    position: relative !important;
                    margin: 0 auto !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                    border-radius: 8px !important;
                    overflow: visible !important;
                }
                
                .ui-flipbook .page {
                    background: white !important;
                    border: 1px solid #ddd !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    overflow: hidden !important;
                }
                
                .ui-flipbook .page img {
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: contain !important;
                }
                
                .page-content {
                    width: 100% !important;
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                    box-sizing: border-box !important;
                }
                
                .flipbook-controls {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.7);
                    padding: 10px;
                    border-radius: 5px;
                    display: flex;
                    gap: 10px;
                    z-index: 1000;
                }
                
                .flipbook-control-btn {
                    background: #333;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .flipbook-control-btn:hover {
                    background: #555;
                }
                
                .flipbook-page-info {
                    color: white;
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                    margin: 0 10px;
                }
                
                .flipbook-miniatures {
                    position: absolute;
                    bottom: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    padding: 10px;
                    border-radius: 5px;
                    display: none;
                    max-width: 80%;
                    overflow-x: auto;
                }
                
                .flipbook-miniature {
                    display: inline-block;
                    width: 60px;
                    height: 80px;
                    margin: 0 5px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .flipbook-miniature:hover {
                    border-color: #fff;
                }
                
                .flipbook-miniature.active {
                    border-color: #007bff;
                }
                
                .flipbook-miniature img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .ui-arrow-control {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 50px;
                    height: 50px;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 1001;
                    border-radius: 25px;
                    font-size: 24px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }
                
                .ui-arrow-control:hover {
                    background: rgba(0, 0, 0, 0.8);
                    border-color: rgba(255, 255, 255, 0.6);
                    transform: translateY(-50%) scale(1.1);
                }
                
                .ui-arrow-next-page {
                    right: 10px;
                }
                
                .ui-arrow-previous-page {
                    left: 10px;
                }
                
                .ui-arrow-next-page::before {
                    content: '›';
                }
                
                .ui-arrow-previous-page::before {
                    content: '‹';
                }
            </style>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    renderPages() {
        let pagesHtml = '';
        
        // pageData가 있으면 XCON 데이터로 페이지 생성
        if (this.pageData && this.pageData.length > 0) {
            this.pageData.forEach((pageInfo, index) => {
                const pageNum = index + 1;
                const content = this.parsePageContent(pageInfo);
                pagesHtml += `<div class="page" data-page="${pageNum}">${content}</div>`;
            });
        } else {
            // 기본 이미지 페이지 생성
            for (let i = 1; i <= this.pages; i++) {
                pagesHtml += `
                    <div class="page" data-page="${i}">
                        <img src="${this.pageFolder}/${i}.jpg" alt="Page ${i}" onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\\'padding: 20px; text-align: center; color: #666;\\'>Page ${i}<br>Image not found</div>'" />
                    </div>
                `;
            }
        }
        
        return pagesHtml;
    }
    
    parsePageContent(pageInfo) {
        // pageInfo는 XCON 객체로 다양한 콘텐츠 타입 지원
        const type = pageInfo.type || 'image';
        
        switch (type) {
            case 'image':
                return `<img src="${pageInfo.src}" alt="${pageInfo.alt || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`;
            
            case 'html':
                return pageInfo.content || '';
            
            case 'text':
                return `
                    <div style="padding: 20px; height: 100%; overflow-y: auto; font-family: Arial, sans-serif;">
                        <h2 style="margin-top: 0;">${pageInfo.title || ''}</h2>
                        <p>${pageInfo.content || ''}</p>
                    </div>
                `;
            
            case 'mixed':
                return `
                    <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                        ${pageInfo.image ? `<img src="${pageInfo.image}" style="width: 100%; height: 60%; object-fit: cover; margin-bottom: 10px;" />` : ''}
                        <div style="flex: 1; overflow-y: auto;">
                            <h3>${pageInfo.title || ''}</h3>
                            <p>${pageInfo.content || ''}</p>
                        </div>
                    </div>
                `;
            
            default:
                return `<div style="padding: 20px;">Page content</div>`;
        }
    }
    
    renderControls(controlsId) {
        return `
            <div id="${controlsId}" class="flipbook-controls">
                <button class="flipbook-control-btn" onclick="window.flipbookInstances['${this.key}'].previous()">‹</button>
                <div class="flipbook-page-info">
                    <span id="current-page-${this.key}">1</span> / <span id="total-pages-${this.key}">${this.pages}</span>
                </div>
                <button class="flipbook-control-btn" onclick="window.flipbookInstances['${this.key}'].next()">›</button>
                ${this.showMiniatures ? `<button class="flipbook-control-btn" onclick="window.flipbookInstances['${this.key}'].toggleMiniatures()">⊞</button>` : ''}
                ${this.showZoom ? `<button class="flipbook-control-btn" onclick="window.flipbookInstances['${this.key}'].toggleZoom()">⊕</button>` : ''}
                ${this.showFullscreen ? `<button class="flipbook-control-btn" onclick="window.flipbookInstances['${this.key}'].toggleFullscreen()">⛶</button>` : ''}
            </div>
        `;
    }
    
    renderMiniatures(miniatureId) {
        let miniatureHtml = '';
        
        for (let i = 1; i <= this.pages; i++) {
            const thumbSrc = this.pageData && this.pageData[i-1] && this.pageData[i-1].thumbnail 
                ? this.pageData[i-1].thumbnail 
                : `${this.pageFolder}/${i}.jpg`;
            
            miniatureHtml += `
                <div class="flipbook-miniature" onclick="window.flipbookInstances['${this.key}'].goToPage(${i})">
                    <img src="${thumbSrc}" alt="Page ${i}" />
                </div>
            `;
        }
        
        return `
            <div id="${miniatureId}" class="flipbook-miniatures">
                ${miniatureHtml}
            </div>
        `;
    }
    
    async onLoadComplete() {
        await super.onLoadComplete();
        await this.initializeFlipbook();
    }
    
    async initializeFlipbook() {
        if (this.isInitialized) return;
        
        // Turn.js 라이브러리 로드 확인
        if (typeof $ === 'undefined' || typeof $.fn.turn === 'undefined') {
            XCON.error('Turn.js library is not loaded. Please include Turn.js before using XaFlipbook.');
            return;
        }
        
        const flipbookId = `flipbook-${this.key}`;
        const $flipbook = $(`#${flipbookId}`);
        
        if ($flipbook.length === 0) {
            XCON.error(`Flipbook element not found: ${flipbookId}`);
            return;
        }
        
        // 전역 인스턴스 저장소 초기화
        if (!window.flipbookInstances) {
            window.flipbookInstances = {};
        }
        
        // 컨테이너 크기 설정
        const container = $flipbook.closest('.xa-flipbook-container');
        const parentContainer = container.parent();
        
        // 실제 사용 가능한 크기 계산
        const containerWidth = parentContainer.width() || container.width() || 800;
        const containerHeight = parentContainer.height() || container.height() || 600;
        
        XCON.log(`📏 컨테이너 크기 측정:`, {
            parent: { width: parentContainer.width(), height: parentContainer.height() },
            container: { width: container.width(), height: container.height() },
            used: { width: containerWidth, height: containerHeight }
        });
        
        // 페이지 크기를 컨테이너에 맞게 조정
        let adjustedPageWidth = this.pageWidth;
        let adjustedPageHeight = this.pageHeight;
        
        // 컨테이너 크기에 맞춰 스케일 조정
        const aspectRatio = this.pageWidth / this.pageHeight;
        const maxWidth = containerWidth * 0.4; // 두 페이지이므로 40%씩 (여백 고려)
        const maxHeight = containerHeight * 0.7; // 70% 높이 사용 (컨트롤 공간 고려)
        
        if (maxWidth / aspectRatio <= maxHeight) {
            // 너비 기준으로 조정
            adjustedPageWidth = maxWidth;
            adjustedPageHeight = maxWidth / aspectRatio;
        } else {
            // 높이 기준으로 조정
            adjustedPageHeight = maxHeight;
            adjustedPageWidth = maxHeight * aspectRatio;
        }
        
        // 최소 크기 보장
        adjustedPageWidth = Math.max(adjustedPageWidth, 250);
        adjustedPageHeight = Math.max(adjustedPageHeight, 300);
        
        // 최대 크기 제한
        adjustedPageWidth = Math.min(adjustedPageWidth, 400);
        adjustedPageHeight = Math.min(adjustedPageHeight, 500);
        
        XCON.log(`📖 Flipbook ${this.key} 초기화:`, {
            container: { width: containerWidth, height: containerHeight },
            original: { width: this.pageWidth, height: this.pageHeight },
            adjusted: { width: adjustedPageWidth, height: adjustedPageHeight }
        });
        
        // Turn.js 초기화 옵션
        const turnOptions = {
            width: adjustedPageWidth * 2, // 두 페이지 너비
            height: adjustedPageHeight,
            autoCenter: this.autoCenter,
            duration: this.duration,
            acceleration: this.acceleration,
            gradients: this.gradients,
            elevation: this.elevation,
            display: 'double',
            when: {
                turned: (event, page, pageObject) => {
                    this.currentPage = page;
                    this.updatePageInfo();
                    this.updateMiniatures();
                    
                    XCON.log(`📄 페이지 전환: ${page}`);
                    
                    if (this.onTurned) {
                        this.executeAction(this.onTurned);
                    }
                },
                turning: (event, page, pageObject) => {
                    if (this.onTurning) {
                        this.executeAction(this.onTurning);
                    }
                },
                start: (event, pageObject, corner) => {
                    if (this.onStart) {
                        this.executeAction(this.onStart);
                    }
                },
                end: (event, pageObject, turned) => {
                    if (this.onEnd) {
                        this.executeAction(this.onEnd);
                    }
                },
                missing: (event, pages) => {
                    XCON.log(`📋 페이지 누락: ${pages}`);
                    if (this.onMissing) {
                        this.executeAction(this.onMissing);
                    }
                }
            }
        };
        
        // 커스텀 when 이벤트 병합
        if (this.when && typeof this.when === 'object') {
            Object.assign(turnOptions.when, this.when);
        }
        
        // 기존 Turn.js 인스턴스가 있으면 제거
        if ($flipbook.data('turn')) {
            $flipbook.turn('destroy');
        }
        
        // Turn.js 초기화
        $flipbook.turn(turnOptions);
        
        this.flipbookInstance = $flipbook;
        this.isInitialized = true;
        
        // 전역 인스턴스에 컨트롤 메서드 등록
        window.flipbookInstances[this.key] = {
            next: () => this.nextPage(),
            previous: () => this.previousPage(),
            goToPage: (page) => this.goToPage(page),
            toggleMiniatures: () => this.toggleMiniatures(),
            toggleZoom: () => this.toggleZoom(),
            toggleFullscreen: () => this.toggleFullscreen(),
            getCurrentPage: () => this.currentPage,
            getTotalPages: () => this.pages,
            getInstance: () => this.flipbookInstance
        };
        
        // 초기 페이지 정보 업데이트
        this.updatePageInfo();
        this.updateMiniatures();
        
        XCON.log(`✅ Flipbook ${this.key} initialized successfully`);
    }
    
    // 페이지 이동 메서드들
    nextPage() {
        if (this.flipbookInstance) {
            this.flipbookInstance.turn('next');
        }
    }
    
    previousPage() {
        if (this.flipbookInstance) {
            this.flipbookInstance.turn('previous');
        }
    }
    
    goToPage(page) {
        if (this.flipbookInstance) {
            this.flipbookInstance.turn('page', page);
        }
    }
    
    // UI 업데이트 메서드들
    updatePageInfo() {
        const currentPageElement = document.getElementById(`current-page-${this.key}`);
        const totalPagesElement = document.getElementById(`total-pages-${this.key}`);
        
        if (currentPageElement) {
            currentPageElement.textContent = this.currentPage;
        }
        
        if (totalPagesElement) {
            totalPagesElement.textContent = this.pages;
        }
    }
    
    updateMiniatures() {
        const miniatures = document.querySelectorAll(`#miniatures-${this.key} .flipbook-miniature`);
        miniatures.forEach((miniature, index) => {
            miniature.classList.toggle('active', index + 1 === this.currentPage);
        });
    }
    
    toggleMiniatures() {
        const miniatures = document.getElementById(`miniatures-${this.key}`);
        if (miniatures) {
            miniatures.style.display = miniatures.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    toggleZoom() {
        if (this.flipbookInstance) {
            // 줌 기능 구현 (Turn.js의 zoom 기능 활용)
            const currentZoom = this.flipbookInstance.turn('zoom') || 1;
            const newZoom = currentZoom === 1 ? 1.5 : 1;
            this.flipbookInstance.turn('zoom', newZoom);
        }
    }
    
    toggleFullscreen() {
        const container = document.querySelector(`[data-key="${this.key}"]`);
        if (container) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen();
            }
        }
    }
    
    // 정리 메서드
    dispose() {
        if (this.flipbookInstance) {
            this.flipbookInstance.turn('destroy');
            this.flipbookInstance = null;
        }
        
        if (window.flipbookInstances && window.flipbookInstances[this.key]) {
            delete window.flipbookInstances[this.key];
        }
        
        this.isInitialized = false;
        
        super.dispose();
    }
}

// =============================================================================
// XaNetworkDiagram Class (D3.js 기반 네트워크 관계도 컴포넌트)
// =============================================================================
class XaNetworkDiagram extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // 네트워크 다이어그램 속성들
        this.width = this.getValue('width', 800);
        this.height = this.getValue('height', 600);
        this.nodeRadius = this.getValue('nodeRadius', 25);
        this.linkDistance = this.getValue('linkDistance', 80);
        this.charge = this.getValue('charge', -1500);
        this.friction = this.getValue('friction', 0.75);
        this.gravity = this.getValue('gravity', 0.08);
        
        // 데이터 속성들
        this.data = this.getValue('data', null);
        this.nodes = this.getValue('nodes', []);
        this.links = this.getValue('links', []);
        this.rootNodeId = this.getValue('rootNodeId', null);
        
        // 모던 스타일 속성들
        this.nodeColor = this.getValue('nodeColor', '#667eea');
        this.linkColor = this.getValue('linkColor', '#cbd5e0');
        this.refLinkColor = this.getValue('refLinkColor', '#a0aec0');
        this.backgroundColor = this.getValue('backgroundColor', '#f7fafc');
        this.showLabels = this.getValue('showLabels', true);
        this.showArrows = this.getValue('showArrows', true);
        
        // 추가 모던 스타일 속성들
        this.primaryColor = this.getValue('primaryColor', '#667eea');
        this.secondaryColor = this.getValue('secondaryColor', '#764ba2');
        this.accentColor = this.getValue('accentColor', '#f093fb');
        this.textColor = this.getValue('textColor', '#2d3748');
        this.shadowColor = this.getValue('shadowColor', 'rgba(0, 0, 0, 0.1)');
        
        // 인터랙션 속성들
        this.enableDrag = this.getValue('enableDrag', true);
        this.enableZoom = this.getValue('enableZoom', true);
        this.enableClick = this.getValue('enableClick', true);
        this.enableHover = this.getValue('enableHover', true);
        
        // 이벤트 핸들러들
        this.onNodeClick = this.getValue('onNodeClick');
        this.onNodeDrag = this.getValue('onNodeDrag');
        this.onNodeHover = this.getValue('onNodeHover');
        this.onLinkClick = this.getValue('onLinkClick');
        
        // 내부 상태
        this.isInitialized = false;
        this.svg = null;
        this.force = null;
        this.nodeElements = null;
        this.linkElements = null;
        this.labelElements = null;
        this.tooltip = null;
        this.zoom = null;
        this.rootNode = null;
        this.expandedNodes = new Set();
    }
    
    render() {
        const diagramId = `network-diagram-${this.key}`;
        const containerId = `network-container-${this.key}`;
        
        // pos 값을 우선으로 사용하고, width/height 속성은 내부 SVG 크기 조정에만 사용
        const pos = this.parsedPos;
        const containerWidth = pos.width || this.width;
        const containerHeight = pos.height || this.height;
        
        const html = `
            <div style="${this.getBaseStyle()}" data-component="networkDiagram" data-component-key="${this.key}" data-key="${this.key}">
                <div id="${containerId}" class="xa-network-diagram-container" data-key="${this.key}" style="width: 100%; height: 100%;">
                    <svg id="${diagramId}" class="network-svg" style="width: 100%; height: 100%;"></svg>
                    <div class="network-tooltip"></div>
                </div>
            </div>
            
            <style>
                .xa-network-diagram-container {
                    position: relative;
                    background: linear-gradient(135deg, ${this.backgroundColor} 0%, #e2e8f0 100%);
                    border: none;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06);
                    backdrop-filter: blur(10px);
                }
                
                .network-svg {
                    cursor: grab;
                    transition: all 0.3s ease;
                }
                
                .network-svg:active {
                    cursor: grabbing;
                }
                
                .network-node {
                    cursor: pointer;
                    stroke: #ffffff;
                    stroke-width: 3px;
                    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
                    transition: stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease;
                }
                
                .network-node:hover {
                    stroke: ${this.accentColor};
                    stroke-width: 4px;
                    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.2));
                }
                
                .network-node.root-node {
                    stroke: #ffffff;
                    stroke-width: 5px;
                    filter: drop-shadow(0 8px 16px rgba(102, 126, 234, 0.4));
                }
                
                .network-node.expanded {
                    stroke: ${this.accentColor};
                    stroke-width: 4px;
                    filter: drop-shadow(0 6px 12px rgba(240, 147, 251, 0.3));
                }
                
                .network-link {
                    fill: none;
                    stroke: ${this.linkColor};
                    stroke-width: 3px;
                    stroke-opacity: 0.7;
                    transition: all 0.3s ease;
                }
                
                .network-link:hover {
                    stroke: ${this.primaryColor};
                    stroke-width: 4px;
                    stroke-opacity: 0.9;
                }
                
                .network-link.ref-link {
                    stroke: ${this.refLinkColor};
                    stroke-opacity: 0.5;
                    stroke-width: 2px;
                    stroke-dasharray: 8,4;
                    animation: dash 2s linear infinite;
                }
                
                @keyframes dash {
                    to {
                        stroke-dashoffset: -12;
                    }
                }
                
                .network-link.marker-only {
                    stroke: ${this.accentColor};
                    stroke-opacity: 0.7;
                    stroke-width: 3px;
                }
                
                .network-label {
                    fill: ${this.textColor};
                    font: 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                    font-weight: 600;
                    text-anchor: middle;
                    pointer-events: none;
                    user-select: none;
                    text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
                    transition: all 0.3s ease;
                }
                
                .network-label:hover {
                    fill: ${this.primaryColor};
                    font-weight: 700;
                }
                
                .network-label.root-label {
                    font-weight: 800;
                    font-size: 14px;
                    fill: ${this.primaryColor};
                    text-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
                }
                
                .network-tooltip {
                    position: absolute;
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
                    color: white;
                    padding: 16px 20px;
                    border-radius: 12px;
                    font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-weight: 500;
                    pointer-events: none;
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1000;
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    text-align: center;
                }
                
                .network-tooltip.show {
                    opacity: 1;
                    transform: translateY(-4px);
                }
                
                .network-tooltip::before {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 8px solid transparent;
                    border-top-color: rgba(102, 126, 234, 0.95);
                }
                
                .network-arrow {
                    fill: ${this.linkColor};
                    transition: all 0.3s ease;
                }
                
                .network-arrow.ref-arrow {
                    fill: ${this.refLinkColor};
                }
                
                .network-group {
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .network-group:hover {
                    /* 스케일링 제거 - D3.js에서 직접 처리 */
                }
                
                .network-border {
                    fill: none;
                    stroke: ${this.refLinkColor};
                    stroke-width: 2px;
                    stroke-opacity: 0.4;
                    stroke-dasharray: 5,5;
                    transition: all 0.3s ease;
                }
                
                .network-border:hover {
                    stroke: ${this.primaryColor};
                    stroke-opacity: 0.8;
                    stroke-width: 3px;
                }
                
                .network-image {
                    pointer-events: none;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
                }
                
                .loading-spinner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 18px;
                    color: ${this.textColor};
                    font-weight: 500;
                    animation: pulse 2s ease-in-out infinite;
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            </style>
        `;
        
        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        await super.onLoadComplete();
        
        // D3.js v3 라이브러리 로드 확인
        if (typeof d3 === 'undefined') {
            await LibraryLoader.loadLibrary('d3v3');
        }
        
        await this.initializeNetworkDiagram();
    }
    
    async initializeNetworkDiagram() {
        if (this.isInitialized) return;
        
        const diagramId = `network-diagram-${this.key}`;
        const containerId = `network-container-${this.key}`;
        
        const container = document.getElementById(containerId);
        if (!container) {
            XCON.error(`Network diagram container not found: ${containerId}`);
            return;
        }
        
        // 컨테이너 크기 확인 (pos 값 우선 사용)
        const pos = this.parsedPos;
        const containerWidth = pos.width || this.width || 800;
        const containerHeight = pos.height || this.height || 600;
        
        // SVG 초기화
        this.svg = d3.select(`#${diagramId}`)
            .attr('width', containerWidth)
            .attr('height', containerHeight);
        
        // 화살표 마커 정의
        this.createArrowMarkers();
        
        // 그라디언트 정의
        this.createGradients();
        
        // 배경 사각형
        const backgroundRect = this.svg.append('rect')
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .style('fill', this.backgroundColor)
            .style('pointer-events', 'all');
        
        // 줌 기능 설정 (배경에만 적용)
        if (this.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on('zoom', (event) => this.handleZoom(event));
            
            // 배경 사각형에만 줌 이벤트 적용
            backgroundRect.call(this.zoom);
        }
        
        // 메인 그룹 생성
        this.mainGroup = this.svg.append('g')
            .attr('class', 'main-group');
        
        // 툴팁 초기화
        this.tooltip = d3.select(`#${containerId} .network-tooltip`);
        
        // Force simulation 초기화 (D3.js v7)
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(this.linkDistance))
            .force('charge', d3.forceManyBody().strength(this.charge))
            .force('center', d3.forceCenter(containerWidth / 2, containerHeight / 2))
            .force('collision', d3.forceCollide().radius(this.nodeRadius + 5))
            .alphaDecay(0.0228) // 기본값 사용 (1 - friction 대신)
            .velocityDecay(this.friction)
            .on('tick', () => this.tick());
        
        // 데이터 로드 및 렌더링
        if (this.data) {
            this.loadData(this.data);
        } else if (this.nodes.length > 0) {
            this.updateDiagram();
        }
        
        this.isInitialized = true;
        XCON.log(`✅ Network diagram ${this.key} initialized successfully`);
    }
    
    createArrowMarkers() {
        const defs = this.svg.append('defs');
        
        // 일반 링크용 화살표
        defs.append('marker')
            .attr('id', `arrow-${this.key}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'network-arrow');
        
        // 참조 링크용 화살표
        defs.append('marker')
            .attr('id', `ref-arrow-${this.key}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('refY', 0)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'network-arrow ref-arrow');
    }
    
    createGradients() {
        const defs = this.svg.select('defs');
        
        // 모던한 그라디언트들
        const gradients = [
            { 
                id: 'earth', 
                colors: [this.primaryColor, this.secondaryColor],
                name: 'Primary Gradient'
            },
            { 
                id: 'jupiter', 
                colors: [this.accentColor, '#ff6b6b'],
                name: 'Accent Gradient'
            },
            { 
                id: 'venus', 
                colors: ['#ffeaa7', '#fdcb6e'],
                name: 'Warm Gradient'
            },
            { 
                id: 'neptune', 
                colors: [this.primaryColor, '#74b9ff'],
                name: 'Cool Gradient'
            },
            { 
                id: 'mars', 
                colors: ['#fd79a8', '#e84393'],
                name: 'Pink Gradient'
            }
        ];
        
        gradients.forEach(grad => {
            // 방사형 그라디언트
            const radialGradient = defs.append('radialGradient')
                .attr('id', `gradient-${grad.id}-${this.key}`)
                .attr('cx', '30%')
                .attr('cy', '30%')
                .attr('r', '70%');
            
            radialGradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', d3.rgb(grad.colors[0]).brighter(0.5))
                .attr('stop-opacity', 0.9);
            
            radialGradient.append('stop')
                .attr('offset', '70%')
                .attr('stop-color', grad.colors[0])
                .attr('stop-opacity', 1);
            
            radialGradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', grad.colors[1])
                .attr('stop-opacity', 1);
            
            // 선형 그라디언트 (호버 효과용)
            const linearGradient = defs.append('linearGradient')
                .attr('id', `linear-gradient-${grad.id}-${this.key}`)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '100%')
                .attr('y2', '100%');
            
            linearGradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', grad.colors[0])
                .attr('stop-opacity', 1);
            
            linearGradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', grad.colors[1])
                .attr('stop-opacity', 1);
        });
        
        // 글로우 효과용 필터
        const filter = defs.append('filter')
            .attr('id', `glow-${this.key}`)
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }
    
    loadData(data) {
        try {
            // 데이터 구조 파싱
            this.processedData = {
                nodes: [],
                links: [],
                nodeMap: new Map(),
                infos: data.infos || {},
                names: data.names || {},
                subfolders: data.subfolders || {}
            };
            
            // 노드 생성
            const list = data.list || {};
            const nodeIds = Object.keys(list);
            
            nodeIds.forEach((nodeId, index) => {
                // 노드들을 원형으로 배치하여 초기 위치 설정
                const angle = (index / nodeIds.length) * 2 * Math.PI;
                const radius = Math.min(containerWidth, containerHeight) / 4;
                const centerX = containerWidth / 2;
                const centerY = containerHeight / 2;
                
                const node = {
                    id: nodeId,
                    name: data.names[nodeId] || nodeId,
                    info: data.infos[nodeId] || {},
                    connections: list[nodeId] || [],
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius,
                    type: nodeId.startsWith('A') ? 'folder' : 'node'
                };
                
                // 루트 노드 식별
                if (node.name.startsWith('ROOT:')) {
                    node.name = node.name.substring(5);
                    node.isRoot = true;
                    // 루트 노드는 중앙에 고정
                    node.fx = centerX;
                    node.fy = centerY;
                    this.rootNode = node;
                }
                
                this.processedData.nodes.push(node);
                this.processedData.nodeMap.set(nodeId, node);
            });
            
            // 링크 생성
            this.processedData.nodes.forEach(source => {
                source.connections.forEach(targetId => {
                    if (targetId !== source.id) {
                        const target = this.processedData.nodeMap.get(targetId);
                        if (target) {
                            this.processedData.links.push({
                                source: source,
                                target: target,
                                id: targetId,
                                type: source.type === 'folder' ? 'folder' : 'normal'
                            });
                        }
                    }
                });
            });
            
            this.updateDiagram();
            
        } catch (error) {
            XCON.error('Error loading network data:', error);
        }
    }
    
    updateDiagram() {
        if (!this.processedData) return;
        
        // Force simulation 업데이트 (D3.js v7)
        this.simulation.nodes(this.processedData.nodes);
        this.simulation.force('link').links(this.processedData.links);
        this.simulation.alpha(1).restart();
        
        // 링크 렌더링
        this.renderLinks();
        
        // 노드 렌더링
        this.renderNodes();
        
        // 라벨 렌더링
        if (this.showLabels) {
            this.renderLabels();
        }
    }
    
    renderLinks() {
        this.linkElements = this.mainGroup.selectAll('.network-link')
            .data(this.processedData.links, d => `${d.source.id}-${d.target.id}`);
        
        // 기존 링크 제거
        this.linkElements.exit().remove();
        
        const linkEnter = this.linkElements.enter()
            .append('path')
            .attr('class', d => `network-link ${d.type === 'folder' ? 'ref-link' : ''}`)
            .attr('marker-end', d => {
                const markerType = d.type === 'folder' ? 'ref-arrow' : 'arrow';
                return this.showArrows ? `url(#${markerType}-${this.key})` : '';
            })
            .style('opacity', d => {
                // 링크 표시 로직
                if (d.source.isRoot || d.target.isRoot) return 1;
                if (d.type === 'folder') return 0.5;
                return 0.8;
            });
        
        // 기존 링크와 새로운 링크 병합
        this.linkElements = linkEnter.merge(this.linkElements);
    }
    
    renderNodes() {
        this.nodeElements = this.mainGroup.selectAll('.network-group')
            .data(this.processedData.nodes, d => d.id);
        
        // 기존 노드 제거
        this.nodeElements.exit().remove();
        
        const nodeEnter = this.nodeElements.enter()
            .append('g')
            .attr('class', 'network-group');
        
        // 노드 테두리
        nodeEnter.append('circle')
            .attr('class', 'network-border')
            .attr('r', d => d.type === 'folder' ? 7 : this.nodeRadius)
            .style('opacity', d => d.info.icon ? 1 : 0);
        
        // 노드 아이콘 (있는 경우)
        nodeEnter.append('image')
            .attr('class', 'network-image')
            .attr('xlink:href', d => d.info.icon || '')
            .attr('x', -15)
            .attr('y', -15)
            .attr('width', 30)
            .attr('height', 30)
            .style('opacity', d => d.info.icon ? 1 : 0);
        
        // 노드 원
        nodeEnter.append('circle')
            .attr('class', d => `network-node ${d.isRoot ? 'root-node' : ''} ${this.expandedNodes.has(d.id) ? 'expanded' : ''}`)
            .attr('r', d => d.type === 'folder' ? 7 : this.nodeRadius)
            .style('fill', d => this.getNodeColor(d))
            .style('opacity', d => d.info.icon ? 0 : 0.8);
        
        // 인터랙션 추가 (D3.js v7)
        if (this.enableClick) {
            nodeEnter.on('click', (event, d) => {
                event.stopPropagation(); // 이벤트 버블링 방지
                this.handleNodeClick(d);
            });
        }
        
        if (this.enableHover) {
            nodeEnter.on('mouseover', (event, d) => {
                event.stopPropagation(); // 이벤트 버블링 방지
                this.handleNodeHover(d, true);
            })
            .on('mouseout', (event, d) => {
                event.stopPropagation(); // 이벤트 버블링 방지
                this.handleNodeHover(d, false);
            });
        }
        
        if (this.enableDrag) {
            const drag = d3.drag()
                .on('start', (event, d) => {
                    event.sourceEvent.stopPropagation(); // 줌 이벤트 방지
                    this.handleDragStart(d);
                })
                .on('drag', (event, d) => {
                    event.sourceEvent.stopPropagation(); // 줌 이벤트 방지
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    event.sourceEvent.stopPropagation(); // 줌 이벤트 방지
                    this.handleDragEnd(d);
                });
            
            nodeEnter.call(drag);
        }
        
        // 기존 노드와 새로운 노드 병합
        this.nodeElements = nodeEnter.merge(this.nodeElements);
    }
    
    renderLabels() {
        this.labelElements = this.mainGroup.selectAll('.network-label')
            .data(this.processedData.nodes, d => d.id);
        
        // 기존 라벨 제거
        this.labelElements.exit().remove();
        
        const labelEnter = this.labelElements.enter()
            .append('text')
            .attr('class', d => `network-label ${d.isRoot ? 'root-label' : ''}`)
            .text(d => {
                let text = d.name;
                // 폴더의 경우 하위 항목 수 표시
                if (d.type === 'folder' && this.processedData.subfolders[d.id]) {
                    const subfolder = this.processedData.subfolders[d.id];
                    const count = Object.keys(subfolder.lists || {}).length;
                    text += `(${count})`;
                }
                return text;
            })
            .attr('dy', d => d.type === 'folder' ? 4 : -25)
            .style('font-size', d => d.type === 'folder' ? '9px' : '11px');
        
        // 기존 라벨과 새로운 라벨 병합
        this.labelElements = labelEnter.merge(this.labelElements);
    }
    
    getNodeColor(node) {
        if (node.info.color) return node.info.color;
        if (node.isRoot) return `url(#gradient-neptune-${this.key})`;
        if (node.type === 'folder') {
            return node.name.includes('/') ? 
                `url(#gradient-jupiter-${this.key})` : 
                `url(#gradient-venus-${this.key})`;
        }
        return `url(#gradient-earth-${this.key})`;
    }
    
    handleNodeClick(node) {
        if (node.type === 'folder') {
            this.toggleFolder(node);
        }
        
        if (this.onNodeClick) {
            this.executeAction(this.onNodeClick, { node });
        }
    }
    
    handleNodeHover(node, isEnter) {
        // 노드 요소 찾기
        const nodeElement = this.nodeElements.filter(d => d.id === node.id);
        const nodeCircle = nodeElement.select('.network-node');
        
        if (isEnter) {
            // 호버 시 스케일링 (D3.js 내에서 처리)
            nodeCircle.transition()
                .duration(200)
                .attr('r', d => (d.type === 'folder' ? 7 : this.nodeRadius) * 1.15);
            
            this.showTooltip(node);
        } else {
            // 호버 해제 시 원래 크기로 복원
            nodeCircle.transition()
                .duration(200)
                .attr('r', d => d.type === 'folder' ? 7 : this.nodeRadius);
            
            this.hideTooltip();
        }
        
        if (this.onNodeHover) {
            this.executeAction(this.onNodeHover, { node, isEnter });
        }
    }
    
    handleDragStart(node) {
        // 드래그 시작 시 노드 고정 (D3.js v7)
        node.fx = node.x;
        node.fy = node.y;
        node.dragStartTime = Date.now();
        
        // 물리 시뮬레이션 일시 중지
        this.simulation.alphaTarget(0.3).restart();
    }
    
    handleDragEnd(node) {
        // 드래그 종료 시 처리
        const dragDuration = Date.now() - (node.dragStartTime || 0);
        
        // 짧은 드래그는 클릭으로 간주
        if (dragDuration < 100) {
            node.fx = null;
            node.fy = null;
        }
        
        // 물리 시뮬레이션 재개
        this.simulation.alphaTarget(0);
    }
    
    toggleFolder(folderNode) {
        const isExpanded = this.expandedNodes.has(folderNode.id);
        
        if (isExpanded) {
            this.expandedNodes.delete(folderNode.id);
            // 폴더 축소 로직
            this.collapseFolderContents(folderNode);
        } else {
            this.expandedNodes.add(folderNode.id);
            // 폴더 확장 로직
            this.expandFolderContents(folderNode);
        }
        
        this.updateDiagram();
    }
    
    expandFolderContents(folderNode) {
        const subfolder = this.processedData.subfolders[folderNode.id];
        if (!subfolder) return;
        
        // 하위 노드들 추가
        Object.keys(subfolder.lists || {}).forEach(nodeId => {
            if (!this.processedData.nodeMap.has(nodeId)) {
                const node = {
                    id: nodeId,
                    name: subfolder.objects[nodeId] || nodeId,
                    info: subfolder.infos[nodeId] || {},
                    connections: subfolder.lists[nodeId] || [],
                    x: folderNode.x + Math.random() * 100 - 50,
                    y: folderNode.y + Math.random() * 100 - 50,
                    fixed: false,
                    type: 'node',
                    parentFolder: folderNode
                };
                
                this.processedData.nodes.push(node);
                this.processedData.nodeMap.set(nodeId, node);
                
                // 링크 추가
                this.processedData.links.push({
                    source: folderNode,
                    target: node,
                    id: nodeId,
                    type: 'folder'
                });
            }
        });
    }
    
    collapseFolderContents(folderNode) {
        // 하위 노드들 제거
        this.processedData.nodes = this.processedData.nodes.filter(node => 
            node.parentFolder !== folderNode);
        
        this.processedData.links = this.processedData.links.filter(link => 
            link.source !== folderNode || link.type !== 'folder');
        
        // 맵에서도 제거
        this.processedData.nodes.forEach(node => {
            if (node.parentFolder === folderNode) {
                this.processedData.nodeMap.delete(node.id);
            }
        });
    }
    
    showTooltip(node) {
        const info = node.info;
        let content = `<strong>${node.name}</strong>`;
        
        if (info.cid) content += `<br>ID: ${info.cid}`;
        if (info.tid) content += `<br>Type: ${info.tid}`;
        
        this.tooltip
            .html(content)
            .style('opacity', 1)
            .style('left', (d3.event.pageX + 10) + 'px')
            .style('top', (d3.event.pageY - 10) + 'px');
    }
    
    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }
    
    handleZoom(event) {
        // 줌 이벤트가 노드 드래그와 충돌하지 않도록 처리 (D3.js v7)
        if (event.sourceEvent && event.sourceEvent.type === 'mousemove') {
            // 마우스 이동 중에는 줌 적용하지 않음
            return;
        }
        
        this.mainGroup.attr('transform', event.transform);
    }
    
    tick() {
        // 클러스터링 및 충돌 방지
        this.processedData.nodes.forEach(node => {
            this.applyClusterForce(node);
        });
        
        // 링크 업데이트
        if (this.linkElements) {
            this.linkElements.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
        }
        
        // 노드 업데이트
        if (this.nodeElements) {
            this.nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
        }
        
        // 라벨 업데이트
        if (this.labelElements) {
            this.labelElements.attr('transform', d => `translate(${d.x},${d.y})`);
        }
    }
    
    applyClusterForce(node) {
        if (!this.rootNode) return;
        
        const alpha = 120;
        const forceNorm = 400;
        
        if (node.type === 'folder') {
            // 폴더 노드는 루트 주변에 배치
            const dx = node.x - this.rootNode.x;
            const dy = node.y - this.rootNode.y;
            const norm = Math.sqrt(dx * dx + dy * dy);
            
            if (norm > 0 && !node.fixed) {
                const targetDistance = this.expandedNodes.has(node.id) ? alpha : 30;
                node.x = this.rootNode.x + (dx / norm) * targetDistance;
                node.y = this.rootNode.y + (dy / norm) * targetDistance;
            }
        } else if (node.parentFolder) {
            // 하위 노드는 부모 폴더 주변에 배치
            const dx = node.x - node.parentFolder.x;
            const dy = node.y - node.parentFolder.y;
            const norm = Math.sqrt(dx * dx + dy * dy);
            
            if (norm > forceNorm && !node.fixed) {
                node.x = node.parentFolder.x + (dx / norm) * forceNorm;
                node.y = node.parentFolder.y + (dy / norm) * forceNorm;
            }
        }
    }
    
    // 공개 메서드들
    setData(data) {
        this.data = data;
        if (this.isInitialized) {
            this.loadData(data);
        }
    }
    
    addNode(node) {
        if (this.processedData) {
            this.processedData.nodes.push(node);
            this.processedData.nodeMap.set(node.id, node);
            this.updateDiagram();
        }
    }
    
    removeNode(nodeId) {
        if (this.processedData) {
            this.processedData.nodes = this.processedData.nodes.filter(n => n.id !== nodeId);
            this.processedData.nodeMap.delete(nodeId);
            this.processedData.links = this.processedData.links.filter(l => 
                l.source.id !== nodeId && l.target.id !== nodeId);
            this.updateDiagram();
        }
    }
    
    focusNode(nodeId) {
        const node = this.processedData?.nodeMap.get(nodeId);
        if (node && this.enableZoom) {
            const pos = this.parsedPos;
            const containerWidth = pos.width || this.width || 800;
            const containerHeight = pos.height || this.height || 600;
            
            const scale = 1.5;
            const transform = d3.zoomIdentity
                .translate(containerWidth / 2, containerHeight / 2)
                .scale(scale)
                .translate(-node.x, -node.y);
            
            this.svg.transition().duration(750).call(this.zoom.transform, transform);
        }
    }
    
    resetZoom() {
        if (this.enableZoom) {
            this.svg.transition().duration(750).call(this.zoom.transform, d3.zoomIdentity);
        }
    }
    
    dispose() {
        if (this.simulation) {
            this.simulation.stop();
        }
        
        if (this.svg) {
            this.svg.remove();
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// 지도 컴포넌트 (Leaflet 기반)
// =============================================================================
class XaMap extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.type = AdvancedComponentType.MAP;
        
        // 지도 속성
        this.width = this.xcon.getValue('width') || 400;
        this.height = this.xcon.getValue('height') || 300;
        this.latitude = parseFloat(this.xcon.getValue('latitude')) || 37.5665;
        this.longitude = parseFloat(this.xcon.getValue('longitude')) || 126.9780;
        this.zoom = parseInt(this.xcon.getValue('zoom')) || 10;
        this.tileLayer = this.xcon.getValue('tileLayer') || 'OpenStreetMap';
        this.enableZoom = this.xcon.getValue('enableZoom') !== 'false';
        this.enablePan = this.xcon.getValue('enablePan') !== 'false';
        this.markers = this.parseMarkers(this.xcon.getValue('markers'));
        this.showControls = this.xcon.getValue('showControls') !== 'false';
        
        // 지도 인스턴스
        this.map = null;
        this.markerLayer = null;
        this.isInitialized = false;
    }
    
    parseMarkers(markersData) {
        if (!markersData) return [];
        
        try {
            if (typeof markersData === 'string') {
                return JSON.parse(markersData);
            }
            return markersData;
        } catch (e) {
            XCON.warn('Invalid markers data:', e);
            return [];
        }
    }
    
    render() {
        const html = `
            <div style="${this.getBaseStyle()}" data-component="map" data-component-key="${this.key}" data-key="${this.key}">
                <div class="xa-map-container" style="width: 100%; height: 100%;">
                    <div id="map-${this.key}" class="xa-map" style="width: 100%; height: 100%; border-radius: 8px;"></div>
                <div id="map-loading-${this.key}" class="xa-map-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 255, 255, 0.9);
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                ">
                    <div class="spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 10px;
                    "></div>
                    <p>지도 로딩 중...</p>
                </div>
            </div>
            
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .xa-map-container {
                    position: relative;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .xa-map .leaflet-control-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .xa-map .leaflet-popup-content-wrapper {
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                .xa-map .leaflet-popup-content {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.4;
                }
            </style>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        await this.initializeMap();
    }
    
    async initializeMap() {
        if (this.isInitialized) return;
        
        try {
            // Leaflet 라이브러리 로드
            await LibraryLoader.loadLibrary('leaflet');
            
            const mapId = `map-${this.key}`;
            const mapContainer = document.getElementById(mapId);
            const loadingDiv = document.getElementById(`map-loading-${this.key}`);
            
            if (!mapContainer) {
                XCON.error(`Map container not found: ${mapId}`);
                return;
            }
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // 지도 초기화
            this.map = L.map(mapId, {
                center: [this.latitude, this.longitude],
                zoom: this.zoom,
                zoomControl: this.showControls,
                dragging: this.enablePan,
                touchZoom: this.enableZoom,
                doubleClickZoom: this.enableZoom,
                scrollWheelZoom: this.enableZoom,
                boxZoom: this.enableZoom,
                keyboard: this.enableZoom
            });
            
            // 타일 레이어 추가
            this.addTileLayer();
            
            // 마커 레이어 초기화
            this.markerLayer = L.layerGroup().addTo(this.map);
            
            // 마커 추가
            this.addMarkers();
            
            this.isInitialized = true;
            
            // 전역 인스턴스 저장
            if (!window.mapInstances) {
                window.mapInstances = {};
            }
            window.mapInstances[this.key] = this;
            
            XCON.log(`✅ Map ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error('Map initialization failed:', error);
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div style="color: #dc3545;">
                        <strong>지도 로딩 실패</strong><br>
                        ${error.message}
                    </div>
                `;
            }
        }
    }
    
    addTileLayer() {
        const tileProviders = {
            'OpenStreetMap': {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            },
            'CartoDB': {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO'
            },
            'Satellite': {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: '© Esri'
            }
        };
        
        const provider = tileProviders[this.tileLayer] || tileProviders['OpenStreetMap'];
        
        L.tileLayer(provider.url, {
            attribution: provider.attribution,
            maxZoom: 18
        }).addTo(this.map);
    }
    
    addMarkers() {
        this.markers.forEach(marker => {
            const leafletMarker = L.marker([marker.lat, marker.lng]);
            
            if (marker.popup) {
                leafletMarker.bindPopup(marker.popup);
            }
            
            if (marker.icon) {
                const customIcon = L.icon({
                    iconUrl: marker.icon,
                    iconSize: marker.iconSize || [25, 41],
                    iconAnchor: marker.iconAnchor || [12, 41],
                    popupAnchor: marker.popupAnchor || [1, -34]
                });
                leafletMarker.setIcon(customIcon);
            }
            
            leafletMarker.addTo(this.markerLayer);
        });
    }
    
    addMarker(lat, lng, options = {}) {
        const marker = L.marker([lat, lng]);
        
        if (options.popup) {
            marker.bindPopup(options.popup);
        }
        
        if (options.icon) {
            const customIcon = L.icon({
                iconUrl: options.icon,
                iconSize: options.iconSize || [25, 41],
                iconAnchor: options.iconAnchor || [12, 41],
                popupAnchor: options.popupAnchor || [1, -34]
            });
            marker.setIcon(customIcon);
        }
        
        marker.addTo(this.markerLayer);
        return marker;
    }
    
    removeMarker(marker) {
        if (this.markerLayer) {
            this.markerLayer.removeLayer(marker);
        }
    }
    
    clearMarkers() {
        if (this.markerLayer) {
            this.markerLayer.clearLayers();
        }
    }
    
    setCenter(lat, lng, zoom) {
        if (this.map) {
            this.map.setView([lat, lng], zoom || this.zoom);
        }
    }
    
    fitBounds(bounds) {
        if (this.map) {
            this.map.fitBounds(bounds);
        }
    }
    
    dispose() {
        if (this.map) {
            this.map.remove();
        }
        
        if (window.mapInstances && window.mapInstances[this.key]) {
            delete window.mapInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// 캘린더 컴포넌트 (FullCalendar 기반)
// =============================================================================
class XaCalendar extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.type = AdvancedComponentType.CALENDAR;
        
        // 캘린더 속성
        this.width = this.xcon.getValue('width') || 800;
        this.height = this.xcon.getValue('height') || 600;
        this.initialView = this.xcon.getValue('initialView') || 'dayGridMonth';
        this.headerToolbar = this.parseHeaderToolbar(this.xcon.getValue('headerToolbar'));
        this.events = this.parseEvents(this.xcon.getValue('events'));
        this.editable = this.xcon.getValue('editable') !== 'false';
        this.selectable = this.xcon.getValue('selectable') !== 'false';
        this.weekends = this.xcon.getValue('weekends') !== 'false';
        this.locale = this.xcon.getValue('locale') || 'ko';
        this.theme = this.xcon.getValue('theme') || 'standard';
        
        // 캘린더 인스턴스
        this.calendar = null;
        this.isInitialized = false;
    }
    
    parseHeaderToolbar(toolbarData) {
        if (!toolbarData) {
            return {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            };
        }
        
        try {
            if (typeof toolbarData === 'string') {
                return JSON.parse(toolbarData);
            }
            return toolbarData;
        } catch (e) {
            XCON.warn('Invalid header toolbar data:', e);
            return {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            };
        }
    }
    
    parseEvents(eventsData) {
        if (!eventsData) return [];
        
        try {
            if (typeof eventsData === 'string') {
                return JSON.parse(eventsData);
            }
            return eventsData;
        } catch (e) {
            XCON.warn('Invalid events data:', e);
            return [];
        }
    }
    
    render() {
        const html = `
            <div style="${this.getBaseStyle()}" data-component="calendar" data-component-key="${this.key}" data-key="${this.key}">
                <div class="xa-calendar-container" style="width: 100%; height: 100%;">
                    <div id="calendar-${this.key}" class="xa-calendar" style="width: 100%; height: 100%;"></div>
                <div id="calendar-loading-${this.key}" class="xa-calendar-loading" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 255, 255, 0.9);
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                ">
                    <div class="spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 10px;
                    "></div>
                    <p>캘린더 로딩 중...</p>
                </div>
            </div>
            
            <style>
                .xa-calendar-container {
                    position: relative;
                    background: #ffffff;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .xa-calendar .fc-theme-standard .fc-scrollgrid {
                    border: 1px solid #dee2e6;
                }
                
                .xa-calendar .fc-theme-standard .fc-col-header-cell {
                    background: #f8f9fa;
                    border-color: #dee2e6;
                }
                
                .xa-calendar .fc-theme-standard .fc-daygrid-day {
                    border-color: #dee2e6;
                }
                
                .xa-calendar .fc-button-primary {
                    background: #667eea;
                    border-color: #667eea;
                }
                
                .xa-calendar .fc-button-primary:hover {
                    background: #5a67d8;
                    border-color: #5a67d8;
                }
                
                .xa-calendar .fc-event {
                    border-radius: 4px;
                    border: none;
                    padding: 2px 4px;
                }
                
                .xa-calendar .fc-event-title {
                    font-weight: 500;
                }
                
                .xa-calendar .fc-today {
                    background: rgba(102, 126, 234, 0.1) !important;
                }
            </style>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        await this.initializeCalendar();
    }
    
    async initializeCalendar() {
        if (this.isInitialized) return;
        
        try {
            // FullCalendar 라이브러리 로드
            await LibraryLoader.loadLibrary('fullcalendar');
            
            const calendarId = `calendar-${this.key}`;
            const calendarContainer = document.getElementById(calendarId);
            const loadingDiv = document.getElementById(`calendar-loading-${this.key}`);
            
            if (!calendarContainer) {
                XCON.error(`Calendar container not found: ${calendarId}`);
                return;
            }
            
            // 로딩 표시 숨기기
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
            // 캘린더 초기화
            this.calendar = new FullCalendar.Calendar(calendarContainer, {
                initialView: this.initialView,
                headerToolbar: this.headerToolbar,
                events: this.events,
                editable: this.editable,
                selectable: this.selectable,
                weekends: this.weekends,
                locale: this.locale,
                height: '100%',
                
                // 이벤트 핸들러
                eventClick: (info) => this.handleEventClick(info),
                dateClick: (info) => this.handleDateClick(info),
                select: (info) => this.handleDateSelect(info),
                eventDrop: (info) => this.handleEventDrop(info),
                eventResize: (info) => this.handleEventResize(info),
                
                // 스타일링
                themeSystem: this.theme,
                dayMaxEvents: 3,
                moreLinkClick: 'popover',
                
                // 버튼 텍스트 한국어화
                buttonText: {
                    today: '오늘',
                    month: '월',
                    week: '주',
                    day: '일',
                    list: '목록'
                }
            });
            
            this.calendar.render();
            
            this.isInitialized = true;
            
            // 전역 인스턴스 저장
            if (!window.calendarInstances) {
                window.calendarInstances = {};
            }
            window.calendarInstances[this.key] = this;
            
            XCON.log(`✅ Calendar ${this.key} initialized successfully`);
            
        } catch (error) {
            XCON.error('Calendar initialization failed:', error);
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div style="color: #dc3545;">
                        <strong>캘린더 로딩 실패</strong><br>
                        ${error.message}
                    </div>
                `;
            }
        }
    }
    
    handleEventClick(info) {
        XCON.log('Event clicked:', info.event);
        
        // 이벤트 상세 정보 표시
        const event = info.event;
        const details = `
            제목: ${event.title}
            시작: ${event.start.toLocaleString()}
            ${event.end ? '종료: ' + event.end.toLocaleString() : ''}
            ${event.extendedProps.description ? '설명: ' + event.extendedProps.description : ''}
        `;
        
        alert(details);
    }
    
    handleDateClick(info) {
        XCON.log('Date clicked:', info.dateStr);
        
        // 새 이벤트 생성 예시
        const title = prompt('새 이벤트 제목을 입력하세요:');
        if (title) {
            this.addEvent({
                title: title,
                start: info.dateStr,
                allDay: true
            });
        }
    }
    
    handleDateSelect(info) {
        XCON.log('Date range selected:', info.startStr, 'to', info.endStr);
        
        // 범위 선택 시 이벤트 생성
        const title = prompt('새 이벤트 제목을 입력하세요:');
        if (title) {
            this.addEvent({
                title: title,
                start: info.startStr,
                end: info.endStr,
                allDay: info.allDay
            });
        }
        
        this.calendar.unselect();
    }
    
    handleEventDrop(info) {
        XCON.log('Event dropped:', info.event.title, 'to', info.event.start);
        
        // 이벤트 이동 처리
        alert(`"${info.event.title}" 이벤트가 ${info.event.start.toLocaleDateString()}로 이동되었습니다.`);
    }
    
    handleEventResize(info) {
        XCON.log('Event resized:', info.event.title);
        
        // 이벤트 크기 변경 처리
        alert(`"${info.event.title}" 이벤트 시간이 변경되었습니다.`);
    }
    
    addEvent(eventData) {
        if (this.calendar) {
            this.calendar.addEvent(eventData);
        }
    }
    
    removeEvent(eventId) {
        if (this.calendar) {
            const event = this.calendar.getEventById(eventId);
            if (event) {
                event.remove();
            }
        }
    }
    
    updateEvent(eventId, updates) {
        if (this.calendar) {
            const event = this.calendar.getEventById(eventId);
            if (event) {
                Object.keys(updates).forEach(key => {
                    event.setProp(key, updates[key]);
                });
            }
        }
    }
    
    getEvents() {
        if (this.calendar) {
            return this.calendar.getEvents();
        }
        return [];
    }
    
    gotoDate(date) {
        if (this.calendar) {
            this.calendar.gotoDate(date);
        }
    }
    
    changeView(viewName) {
        if (this.calendar) {
            this.calendar.changeView(viewName);
        }
    }
    
    dispose() {
        if (this.calendar) {
            this.calendar.destroy();
        }
        
        if (window.calendarInstances && window.calendarInstances[this.key]) {
            delete window.calendarInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// 파일 업로드 컴포넌트 (드래그 앤 드롭 지원)
// =============================================================================
class XaFileUpload extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.type = AdvancedComponentType.FILE_UPLOAD;
        
        // 파일 업로드 속성
        this.width = this.xcon.getValue('width') || 400;
        this.height = this.xcon.getValue('height') || 200;
        this.maxFiles = parseInt(this.xcon.getValue('maxFiles')) || 5;
        this.maxFileSize = parseInt(this.xcon.getValue('maxFileSize')) || 10 * 1024 * 1024; // 10MB
        this.acceptedTypes = this.parseAcceptedTypes(this.xcon.getValue('acceptedTypes'));
        this.multiple = this.xcon.getValue('multiple') !== 'false';
        this.showPreview = this.xcon.getValue('showPreview') !== 'false';
        this.uploadUrl = this.xcon.getValue('uploadUrl') || '';
        this.autoUpload = this.xcon.getValue('autoUpload') === 'true';
        
        // 파일 관리
        this.files = [];
        this.isInitialized = false;
    }
    
    parseAcceptedTypes(typesData) {
        if (!typesData) return ['*/*'];
        
        try {
            if (typeof typesData === 'string') {
                return typesData.split(',').map(type => type.trim());
            }
            return typesData;
        } catch (e) {
            XCON.warn('Invalid accepted types data:', e);
            return ['*/*'];
        }
    }
    
    render() {
        const html = `
            <div style="${this.getBaseStyle()}" data-component="fileUpload" data-component-key="${this.key}" data-key="${this.key}">
                <div class="xa-file-upload-container" style="width: 100%; height: 100%;">
                    <div class="xa-file-upload-dropzone" id="dropzone-${this.key}" style="
                        width: 100%;
                        height: 100%;
                    border: 2px dashed #dee2e6;
                    border-radius: 8px;
                    background: #f8f9fa;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                ">
                    <div class="upload-icon" style="
                        width: 48px;
                        height: 48px;
                        background: #667eea;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 16px;
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </div>
                    <h3 style="margin: 0 0 8px 0; color: #495057; font-size: 18px;">파일을 드래그하거나 클릭하세요</h3>
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">
                        최대 ${this.maxFiles}개 파일, 파일당 ${this.formatFileSize(this.maxFileSize)}까지
                    </p>
                    <input type="file" id="file-input-${this.key}" style="display: none;" 
                           ${this.multiple ? 'multiple' : ''} 
                           accept="${this.acceptedTypes.join(',')}">
                </div>
                
                <div class="xa-file-list" id="file-list-${this.key}" style="
                    margin-top: 16px;
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    background: white;
                    display: none;
                "></div>
                
                <div class="xa-upload-controls" style="
                    margin-top: 16px;
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                ">
                    <button id="clear-btn-${this.key}" class="xa-btn xa-btn-secondary" style="
                        padding: 8px 16px;
                        border: 1px solid #dee2e6;
                        background: white;
                        color: #6c757d;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        display: none;
                    ">전체 삭제</button>
                    
                    <button id="upload-btn-${this.key}" class="xa-btn xa-btn-primary" style="
                        padding: 8px 16px;
                        border: none;
                        background: #667eea;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        display: none;
                    ">업로드</button>
                </div>
            </div>
            
            <style>
                .xa-file-upload-dropzone:hover {
                    border-color: #667eea;
                    background: #f0f2ff;
                }
                
                .xa-file-upload-dropzone.drag-over {
                    border-color: #667eea;
                    background: #e8ebff;
                    transform: scale(1.02);
                }
                
                .xa-file-item {
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #f1f3f4;
                    transition: background-color 0.2s;
                }
                
                .xa-file-item:hover {
                    background: #f8f9fa;
                }
                
                .xa-file-item:last-child {
                    border-bottom: none;
                }
                
                .xa-file-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    color: white;
                }
                
                .xa-file-info {
                    flex: 1;
                }
                
                .xa-file-name {
                    font-weight: 500;
                    color: #495057;
                    margin-bottom: 4px;
                }
                
                .xa-file-size {
                    font-size: 12px;
                    color: #6c757d;
                }
                
                .xa-file-progress {
                    width: 100%;
                    height: 4px;
                    background: #e9ecef;
                    border-radius: 2px;
                    margin-top: 4px;
                    overflow: hidden;
                }
                
                .xa-file-progress-bar {
                    height: 100%;
                    background: #667eea;
                    border-radius: 2px;
                    transition: width 0.3s ease;
                }
                
                .xa-file-remove {
                    width: 24px;
                    height: 24px;
                    border: none;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 8px;
                }
                
                .xa-file-remove:hover {
                    background: #c82333;
                }
                
                .xa-btn:hover {
                    opacity: 0.9;
                }
                
                .xa-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            </style>
        `;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    async onLoadComplete() {
        super.onLoadComplete();
        this.initializeFileUpload();
    }
    
    initializeFileUpload() {
        if (this.isInitialized) return;
        
        const dropzone = document.getElementById(`dropzone-${this.key}`);
        const fileInput = document.getElementById(`file-input-${this.key}`);
        const clearBtn = document.getElementById(`clear-btn-${this.key}`);
        const uploadBtn = document.getElementById(`upload-btn-${this.key}`);
        
        if (!dropzone || !fileInput) {
            XCON.error('File upload elements not found');
            return;
        }
        
        // 드래그 앤 드롭 이벤트
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // 클릭 이벤트
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // 버튼 이벤트
        clearBtn.addEventListener('click', () => {
            this.clearFiles();
        });
        
        uploadBtn.addEventListener('click', () => {
            this.uploadFiles();
        });
        
        this.isInitialized = true;
        
        // 전역 인스턴스 저장
        if (!window.fileUploadInstances) {
            window.fileUploadInstances = {};
        }
        window.fileUploadInstances[this.key] = this;
        
        XCON.log(`✅ File upload ${this.key} initialized successfully`);
    }
    
    handleFiles(fileList) {
        const files = Array.from(fileList);
        
        // 파일 개수 제한 확인
        if (this.files.length + files.length > this.maxFiles) {
            alert(`최대 ${this.maxFiles}개의 파일만 업로드할 수 있습니다.`);
            return;
        }
        
        files.forEach(file => {
            // 파일 크기 확인
            if (file.size > this.maxFileSize) {
                alert(`파일 "${file.name}"이 너무 큽니다. 최대 ${this.formatFileSize(this.maxFileSize)}까지 업로드 가능합니다.`);
                return;
            }
            
            // 파일 타입 확인
            if (!this.isAcceptedType(file.type)) {
                alert(`파일 "${file.name}"의 형식이 지원되지 않습니다.`);
                return;
            }
            
            // 중복 파일 확인
            if (this.files.some(f => f.name === file.name && f.size === file.size)) {
                alert(`파일 "${file.name}"은 이미 추가되었습니다.`);
                return;
            }
            
            const fileObj = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                status: 'ready',
                progress: 0
            };
            
            this.files.push(fileObj);
        });
        
        this.renderFileList();
        this.updateControls();
        
        // 자동 업로드
        if (this.autoUpload && this.uploadUrl) {
            this.uploadFiles();
        }
    }
    
    isAcceptedType(fileType) {
        if (this.acceptedTypes.includes('*/*')) return true;
        
        return this.acceptedTypes.some(acceptedType => {
            if (acceptedType.endsWith('/*')) {
                const category = acceptedType.split('/')[0];
                return fileType.startsWith(category + '/');
            }
            return fileType === acceptedType;
        });
    }
    
    renderFileList() {
        const fileList = document.getElementById(`file-list-${this.key}`);
        
        if (this.files.length === 0) {
            fileList.style.display = 'none';
            return;
        }
        
        fileList.style.display = 'block';
        fileList.innerHTML = this.files.map(file => `
            <div class="xa-file-item" data-file-id="${file.id}">
                <div class="xa-file-icon" style="background: ${this.getFileColor(file.type)};">
                    ${this.getFileExtension(file.name).toUpperCase()}
                </div>
                <div class="xa-file-info">
                    <div class="xa-file-name">${file.name}</div>
                    <div class="xa-file-size">${this.formatFileSize(file.size)}</div>
                    ${file.status === 'uploading' ? `
                        <div class="xa-file-progress">
                            <div class="xa-file-progress-bar" style="width: ${file.progress}%"></div>
                        </div>
                    ` : ''}
                </div>
                <button class="xa-file-remove" onclick="window.fileUploadInstances['${this.key}'].removeFile('${file.id}')">
                    ×
                </button>
            </div>
        `).join('');
    }
    
    getFileColor(fileType) {
        const colors = {
            'image': '#28a745',
            'video': '#dc3545',
            'audio': '#ffc107',
            'text': '#17a2b8',
            'application/pdf': '#dc3545',
            'application/zip': '#6c757d',
            'application/x-zip-compressed': '#6c757d'
        };
        
        for (const [type, color] of Object.entries(colors)) {
            if (fileType.startsWith(type)) {
                return color;
            }
        }
        
        return '#6c757d';
    }
    
    getFileExtension(filename) {
        return filename.split('.').pop() || 'FILE';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    removeFile(fileId) {
        this.files = this.files.filter(file => file.id != fileId);
        this.renderFileList();
        this.updateControls();
    }
    
    clearFiles() {
        this.files = [];
        this.renderFileList();
        this.updateControls();
    }
    
    updateControls() {
        const clearBtn = document.getElementById(`clear-btn-${this.key}`);
        const uploadBtn = document.getElementById(`upload-btn-${this.key}`);
        
        if (this.files.length > 0) {
            clearBtn.style.display = 'block';
            if (this.uploadUrl) {
                uploadBtn.style.display = 'block';
            }
        } else {
            clearBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        }
    }
    
    async uploadFiles() {
        if (!this.uploadUrl) {
            alert('업로드 URL이 설정되지 않았습니다.');
            return;
        }
        
        const readyFiles = this.files.filter(file => file.status === 'ready');
        
        for (const fileObj of readyFiles) {
            await this.uploadFile(fileObj);
        }
    }
    
    async uploadFile(fileObj) {
        fileObj.status = 'uploading';
        fileObj.progress = 0;
        this.renderFileList();
        
        const formData = new FormData();
        formData.append('file', fileObj.file);
        
        try {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    fileObj.progress = Math.round((e.loaded / e.total) * 100);
                    this.renderFileList();
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    fileObj.status = 'completed';
                    XCON.log(`File ${fileObj.name} uploaded successfully`);
                } else {
                    fileObj.status = 'error';
                    XCON.error(`Upload failed for ${fileObj.name}`);
                }
                this.renderFileList();
            });
            
            xhr.addEventListener('error', () => {
                fileObj.status = 'error';
                XCON.error(`Upload error for ${fileObj.name}`);
                this.renderFileList();
            });
            
            xhr.open('POST', this.uploadUrl);
            xhr.send(formData);
            
        } catch (error) {
            fileObj.status = 'error';
            XCON.error('Upload error:', error);
            this.renderFileList();
        }
    }
    
    getFiles() {
        return this.files;
    }
    
    getCompletedFiles() {
        return this.files.filter(file => file.status === 'completed');
    }
    
    dispose() {
        if (window.fileUploadInstances && window.fileUploadInstances[this.key]) {
            delete window.fileUploadInstances[this.key];
        }
        
        this.isInitialized = false;
        super.dispose();
    }
}

// =============================================================================
// ComponentFactory 확장 - 고급 컴포넌트 등록
// =============================================================================
if (typeof ComponentFactory !== 'undefined') {
    // 기존 componentClasses에 고급 컴포넌트 추가
    Object.assign(ComponentFactory.componentClasses, {
        [AdvancedComponentType.CHART]: XaChart,
        [AdvancedComponentType.CODE_EDITOR]: XaCodeEditor,
        [AdvancedComponentType.RICH_EDITOR]: XaRichEditor,
        [AdvancedComponentType.DATA_VIZ]: XaDataViz,
        [AdvancedComponentType.FLIPBOOK]: XaFlipbook,
        [AdvancedComponentType.NETWORK_DIAGRAM]: XaNetworkDiagram,
        [AdvancedComponentType.MAP]: XaMap,
        [AdvancedComponentType.CALENDAR]: XaCalendar,
        [AdvancedComponentType.FILE_UPLOAD]: XaFileUpload
    });
    
    XCON.log('✅ Advanced components registered to ComponentFactory');
} else {
    XCON.warn('⚠️ ComponentFactory not found. Advanced components cannot be registered.');
}

// =============================================================================
// 전역 유틸리티 함수들
// =============================================================================

/**
 * 모든 고급 컴포넌트 인스턴스 정리
 */
function cleanupAllAdvancedComponents() {
    // 차트 인스턴스 정리
    if (window.chartInstances) {
        Object.values(window.chartInstances).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        window.chartInstances = {};
    }
    
    // 에디터 인스턴스 정리
    if (window.editorInstances) {
        Object.values(window.editorInstances).forEach(editor => {
            if (editor && editor.toTextArea) {
                editor.toTextArea();
            }
        });
        window.editorInstances = {};
    }
    
    // 리치 에디터 인스턴스 정리
    if (window.richEditorInstances) {
        window.richEditorInstances = {};
    }
    
    // 데이터 시각화 인스턴스 정리
    if (window.dataVizInstances) {
        Object.values(window.dataVizInstances).forEach(viz => {
            if (viz && viz.dispose) {
                viz.dispose();
            }
        });
        window.dataVizInstances = {};
    }
    
    // Flipbook 인스턴스들 정리
    if (window.flipbookInstances) {
        Object.keys(window.flipbookInstances).forEach(key => {
            const instance = window.flipbookInstances[key];
            if (instance && instance.getInstance) {
                const $flipbook = instance.getInstance();
                if ($flipbook && $flipbook.turn) {
                    $flipbook.turn('destroy');
                }
            }
        });
        window.flipbookInstances = {};
    }
    
    // Network Diagram 인스턴스들 정리
    if (window.networkDiagramInstances) {
        Object.values(window.networkDiagramInstances).forEach(instance => {
            if (instance && instance.dispose) {
                instance.dispose();
            }
        });
        window.networkDiagramInstances = {};
    }
    
    // Map 인스턴스들 정리
    if (window.mapInstances) {
        Object.values(window.mapInstances).forEach(instance => {
            if (instance && instance.dispose) {
                instance.dispose();
            }
        });
        window.mapInstances = {};
    }
    
    // Calendar 인스턴스들 정리
    if (window.calendarInstances) {
        Object.values(window.calendarInstances).forEach(instance => {
            if (instance && instance.dispose) {
                instance.dispose();
            }
        });
        window.calendarInstances = {};
    }
    
    // File Upload 인스턴스들 정리
    if (window.fileUploadInstances) {
        Object.values(window.fileUploadInstances).forEach(instance => {
            if (instance && instance.dispose) {
                instance.dispose();
            }
        });
        window.fileUploadInstances = {};
    }
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', cleanupAllAdvancedComponents);

// Turn.js 라이브러리 동적 로드 함수
function loadTurnJSLibrary(callback) {
    // jQuery 먼저 로드
    if (typeof $ === 'undefined') {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'third-party/Turn.js-5/assets/js/jquery-2.0.3.min.js';
        jqueryScript.onload = () => {
            // Turn.js 로드
            const turnScript = document.createElement('script');
            turnScript.src = 'third-party/Turn.js-5/assets/js/turn.min.js';
            turnScript.onload = callback;
            document.head.appendChild(turnScript);
        };
        document.head.appendChild(jqueryScript);
    } else if (typeof $.fn.turn === 'undefined') {
        // jQuery는 있지만 Turn.js가 없는 경우
        const turnScript = document.createElement('script');
        turnScript.src = 'third-party/Turn.js-5/assets/js/turn.min.js';
        turnScript.onload = callback;
        document.head.appendChild(turnScript);
    } else {
        // 모든 라이브러리가 이미 로드된 경우
        callback();
    }
}

// 전역 객체 등록
window.XamongAdvancedComponents = {
    AdvancedComponentType,
    LibraryLoader,
    XaChart,
    XaCodeEditor,
    XaRichEditor,
    XaDataViz,
    XaFlipbook,
    XaNetworkDiagram,
    XaMap,
    XaCalendar,
    XaFileUpload,
    loadTurnJSLibrary,
    cleanupAllAdvancedComponents
};

XCON.log('✅ Xamong UI Components Advanced loaded successfully'); 