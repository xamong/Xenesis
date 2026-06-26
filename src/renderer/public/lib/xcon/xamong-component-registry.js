/**
 * Xamong Component Registry System
 * 자몽 컴포넌트 레지스트리 시스템
 * 확장 가능한 컴포넌트 등록 및 관리 시스템
 */

// =============================================================================
// Component Registry Class (컴포넌트 레지스트리)
// =============================================================================
class XamongComponentRegistry {
    constructor() {
        this.components = new Map();
        this.libraries = new Map();
        this.loadingPromises = new Map();
        this.loadedLibraries = new Set();
        this.eventListeners = new Map();
        this.config = {
            autoLoad: true,
            cacheDuration: 3600000, // 1시간
            retryAttempts: 3,
            retryDelay: 1000
        };
        
        this.init();
    }
    
    init() {
        // 기본 컴포넌트 등록
        this.registerDefaultComponents();
        
        // 기본 라이브러리 설정 등록
        this.registerDefaultLibraries();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        XCON.log('✅ Xamong Component Registry initialized');
    }
    
    // =============================================================================
    // Component Registration (컴포넌트 등록)
    // =============================================================================
    
    /**
     * 컴포넌트 등록
     * @param {string} type - 컴포넌트 타입
     * @param {Function} componentClass - 컴포넌트 클래스
     * @param {Object} config - 컴포넌트 설정
     */
    registerComponent(type, componentClass, config = {}) {
        const componentInfo = {
            type,
            componentClass,
            config: {
                dependencies: [],
                category: 'custom',
                description: '',
                version: '1.0.0',
                author: '',
                ...config
            },
            registeredAt: new Date(),
            isLoaded: false
        };
        
        this.components.set(type, componentInfo);
        
        // ComponentFactory에 등록
        if (typeof ComponentFactory !== 'undefined') {
            ComponentFactory.componentClasses[type] = componentClass;
        }
        
        // 이벤트 발생
        this.emit('componentRegistered', { type, componentInfo });
        
        XCON.log(`✅ Component registered: ${type}`);
        return componentInfo;
    }
    
    /**
     * 컴포넌트 등록 해제
     * @param {string} type - 컴포넌트 타입
     */
    unregisterComponent(type) {
        const componentInfo = this.components.get(type);
        if (!componentInfo) {
            XCON.warn(`Component not found: ${type}`);
            return false;
        }
        
        this.components.delete(type);
        
        // ComponentFactory에서 제거
        if (typeof ComponentFactory !== 'undefined' && ComponentFactory.componentClasses[type]) {
            delete ComponentFactory.componentClasses[type];
        }
        
        // 이벤트 발생
        this.emit('componentUnregistered', { type, componentInfo });
        
        XCON.log(`✅ Component unregistered: ${type}`);
        return true;
    }
    
    /**
     * 컴포넌트 정보 조회
     * @param {string} type - 컴포넌트 타입
     */
    getComponent(type) {
        return this.components.get(type);
    }
    
    /**
     * 모든 컴포넌트 목록 조회
     */
    getAllComponents() {
        return Array.from(this.components.values());
    }
    
    /**
     * 카테고리별 컴포넌트 조회
     * @param {string} category - 카테고리
     */
    getComponentsByCategory(category) {
        return this.getAllComponents().filter(comp => comp.config.category === category);
    }
    
    // =============================================================================
    // Library Management (라이브러리 관리)
    // =============================================================================
    
    /**
     * 라이브러리 등록
     * @param {string} name - 라이브러리 이름
     * @param {Object} config - 라이브러리 설정
     */
    registerLibrary(name, config) {
        const libraryInfo = {
            name,
            config: {
                scripts: [],
                styles: [],
                dependencies: [],
                version: '1.0.0',
                cdnUrl: '',
                localPath: '',
                check: () => false,
                onLoad: () => {},
                onError: () => {},
                ...config
            },
            registeredAt: new Date(),
            isLoaded: false,
            loadedAt: null,
            loadError: null
        };
        
        this.libraries.set(name, libraryInfo);
        
        XCON.log(`✅ Library registered: ${name}`);
        return libraryInfo;
    }
    
    /**
     * 라이브러리 로드
     * @param {string} name - 라이브러리 이름
     * @param {boolean} force - 강제 로드 여부
     */
    async loadLibrary(name, force = false) {
        const libraryInfo = this.libraries.get(name);
        if (!libraryInfo) {
            throw new Error(`Library not found: ${name}`);
        }
        
        // 이미 로드된 경우
        if (!force && this.loadedLibraries.has(name)) {
            return Promise.resolve();
        }
        
        // 로딩 중인 경우
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        // 로드 시작
        const loadPromise = this._loadLibraryInternal(name, libraryInfo);
        this.loadingPromises.set(name, loadPromise);
        
        try {
            await loadPromise;
            this.loadedLibraries.add(name);
            this.loadingPromises.delete(name);
            
            libraryInfo.isLoaded = true;
            libraryInfo.loadedAt = new Date();
            libraryInfo.loadError = null;
            
            // 성공 콜백 실행
            if (libraryInfo.config.onLoad) {
                libraryInfo.config.onLoad();
            }
            
            // 이벤트 발생
            this.emit('libraryLoaded', { name, libraryInfo });
            
            XCON.log(`✅ Library loaded: ${name}`);
            
        } catch (error) {
            this.loadingPromises.delete(name);
            libraryInfo.loadError = error;
            
            // 에러 콜백 실행
            if (libraryInfo.config.onError) {
                libraryInfo.config.onError(error);
            }
            
            // 이벤트 발생
            this.emit('libraryError', { name, error, libraryInfo });
            
            XCON.error(`❌ Failed to load library: ${name}`, error);
            throw error;
        }
        
        return loadPromise;
    }
    
    /**
     * 라이브러리 내부 로드 로직
     * @private
     */
    async _loadLibraryInternal(name, libraryInfo) {
        const config = libraryInfo.config;
        
        // 의존성 먼저 로드
        if (config.dependencies && config.dependencies.length > 0) {
            for (const dep of config.dependencies) {
                await this.loadLibrary(dep);
            }
        }
        
        // 이미 로드되었는지 확인
        if (config.check && config.check()) {
            return Promise.resolve();
        }
        
        // 스타일 로드
        if (config.styles && config.styles.length > 0) {
            await Promise.all(config.styles.map(url => this._loadStylesheet(url)));
        }
        
        // 스크립트 로드
        if (config.scripts && config.scripts.length > 0) {
            for (const url of config.scripts) {
                await this._loadScript(url);
            }
        }
        
        // 로드 확인
        if (config.check && !config.check()) {
            throw new Error(`Library ${name} failed to load properly`);
        }
    }
    
    /**
     * 스크립트 로드
     * @private
     */
    _loadScript(url) {
        return new Promise((resolve, reject) => {
            // 이미 로드된 스크립트인지 확인
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }
    
    /**
     * 스타일시트 로드
     * @private
     */
    _loadStylesheet(url) {
        return new Promise((resolve, reject) => {
            // 이미 로드된 스타일시트인지 확인
            const existingLink = document.querySelector(`link[href="${url}"]`);
            if (existingLink) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
            document.head.appendChild(link);
        });
    }
    
    /**
     * 라이브러리 로드 상태 확인
     * @param {string} name - 라이브러리 이름
     */
    isLibraryLoaded(name) {
        return this.loadedLibraries.has(name);
    }
    
    /**
     * 모든 라이브러리 목록 조회
     */
    getAllLibraries() {
        return Array.from(this.libraries.values());
    }
    
    // =============================================================================
    // Component Creation (컴포넌트 생성)
    // =============================================================================
    
    /**
     * 컴포넌트 생성 (의존성 자동 로드)
     * @param {string} type - 컴포넌트 타입
     * @param {Object} xcon - XCON 데이터
     * @param {string} key - 컴포넌트 키
     * @param {Object} owner - 소유자
     */
    async createComponent(type, xcon, key, owner = null) {
        const componentInfo = this.components.get(type);
        if (!componentInfo) {
            throw new Error(`Component not found: ${type}`);
        }
        
        // 의존성 라이브러리 로드
        if (componentInfo.config.dependencies && componentInfo.config.dependencies.length > 0) {
            for (const dep of componentInfo.config.dependencies) {
                await this.loadLibrary(dep);
            }
        }
        
        // 컴포넌트 생성
        const ComponentClass = componentInfo.componentClass;
        const component = new ComponentClass(xcon, key, owner);
        
        // 이벤트 발생
        this.emit('componentCreated', { type, component, key });
        
        return component;
    }
    
    /**
     * 컴포넌트 팩토리 연동
     * @param {string} type - 컴포넌트 타입
     * @param {Object} xcon - XCON 데이터
     * @param {string} key - 컴포넌트 키
     * @param {Object} owner - 소유자
     */
    async createComponentWithFactory(type, xcon, key, owner = null) {
        // 의존성 확인 및 로드
        await this.ensureDependencies(type);
        
        // ComponentFactory 사용
        if (typeof ComponentFactory !== 'undefined') {
            return ComponentFactory.create(type, xcon, key, owner);
        } else {
            return await this.createComponent(type, xcon, key, owner);
        }
    }
    
    /**
     * 컴포넌트 의존성 확인 및 로드
     * @param {string} type - 컴포넌트 타입
     */
    async ensureDependencies(type) {
        const componentInfo = this.components.get(type);
        if (!componentInfo || !componentInfo.config.dependencies) {
            return;
        }
        
        const loadPromises = componentInfo.config.dependencies.map(dep => this.loadLibrary(dep));
        await Promise.all(loadPromises);
    }
    
    // =============================================================================
    // Event System (이벤트 시스템)
    // =============================================================================
    
    /**
     * 이벤트 리스너 등록
     * @param {string} event - 이벤트 이름
     * @param {Function} listener - 리스너 함수
     */
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
    }
    
    /**
     * 이벤트 리스너 제거
     * @param {string} event - 이벤트 이름
     * @param {Function} listener - 리스너 함수
     */
    off(event, listener) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * 이벤트 발생
     * @param {string} event - 이벤트 이름
     * @param {Object} data - 이벤트 데이터
     */
    emit(event, data) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        
        const listeners = this.eventListeners.get(event);
        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                XCON.error(`Event listener error for ${event}:`, error);
            }
        });
    }
    
    // =============================================================================
    // Default Registration (기본 등록)
    // =============================================================================
    
    /**
     * 기본 컴포넌트 등록
     */
    registerDefaultComponents() {
        // 기본 자몽 컴포넌트들
        const defaultComponents = [
            { type: 'label', class: 'XaLabel', category: 'basic' },
            { type: 'button', class: 'XaButton', category: 'basic' },
            { type: 'textField', class: 'XaTextField', category: 'input' },
            { type: 'panel', class: 'XaPanel', category: 'layout' },
            { type: 'image', class: 'XaImage', category: 'media' },
            { type: 'videoView', class: 'XaVideoView', category: 'media' },
            { type: 'webView', class: 'XaWebView', category: 'media' },
            { type: 'banner', class: 'XaBanner', category: 'layout' },
            { type: 'frame', class: 'XaFrame', category: 'layout' },
            { type: 'form', class: 'XaForm', category: 'controller' },
            { type: 'list', class: 'XaList', category: 'controller' }
        ];
        
        defaultComponents.forEach(comp => {
            if (typeof window[comp.class] !== 'undefined') {
                this.registerComponent(comp.type, window[comp.class], {
                    category: comp.category,
                    description: `Default ${comp.type} component`,
                    version: '1.0.0',
                    author: 'Xamong Framework'
                });
            }
        });
        
        // 확장 컴포넌트들
        const extendedComponents = [
            { type: 'passwordField', class: 'XaPasswordField', category: 'input' },
            { type: 'textarea', class: 'XaTextarea', category: 'input' },
            { type: 'select', class: 'XaSelect', category: 'input' },
            { type: 'slider', class: 'XaSlider', category: 'input' },
            { type: 'switch', class: 'XaSwitch', category: 'input' },
            { type: 'progressBar', class: 'XaProgressBar', category: 'display' },
            { type: 'spinner', class: 'XaSpinner', category: 'display' },
            { type: 'badge', class: 'XaBadge', category: 'display' },
            { type: 'avatar', class: 'XaAvatar', category: 'display' },
            { type: 'tabs', class: 'XaTabs', category: 'layout' },
            { type: 'card', class: 'XaCard', category: 'layout' }
        ];
        
        extendedComponents.forEach(comp => {
            if (typeof window[comp.class] !== 'undefined') {
                this.registerComponent(comp.type, window[comp.class], {
                    category: comp.category,
                    description: `Extended ${comp.type} component`,
                    version: '1.0.0',
                    author: 'Xamong Framework'
                });
            }
        });
        
        // 서드파티 컴포넌트들
        const thirdPartyComponents = [
            { 
                type: 'flipbook', 
                class: 'XaFlipbook', 
                category: 'third-party',
                dependencies: ['jquery', 'turnjs']
            },
            { 
                type: 'chart', 
                class: 'XaChart', 
                category: 'third-party',
                dependencies: ['chart.js']
            },
            { 
                type: 'codeEditor', 
                class: 'XaCodeEditor', 
                category: 'third-party',
                dependencies: ['codemirror']
            },
            { 
                type: 'richEditor', 
                class: 'XaRichEditor', 
                category: 'third-party',
                dependencies: ['quill']
            },
            { 
                type: 'dataViz', 
                class: 'XaDataViz', 
                category: 'third-party',
                dependencies: ['d3']
            }
        ];
        
        thirdPartyComponents.forEach(comp => {
            if (typeof window[comp.class] !== 'undefined') {
                this.registerComponent(comp.type, window[comp.class], {
                    category: comp.category,
                    dependencies: comp.dependencies || [],
                    description: `Third-party ${comp.type} component`,
                    version: '1.0.0',
                    author: 'Xamong Framework'
                });
            }
        });
    }
    
    /**
     * 기본 라이브러리 등록
     */
    registerDefaultLibraries() {
        // jQuery
        this.registerLibrary('jquery', {
            scripts: ['https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js'],
            check: () => typeof $ !== 'undefined',
            version: '3.7.1',
            description: 'jQuery JavaScript Library'
        });
        
        // Turn.js
        this.registerLibrary('turnjs', {
            scripts: ['https://cdn.jsdelivr.net/npm/turn.js@4.1.0/turn.min.js'],
            dependencies: ['jquery'],
            check: () => typeof $ !== 'undefined' && typeof $.fn.turn !== 'undefined',
            version: '4.1.0',
            description: 'Turn.js Page Flip Library'
        });
        
        // Chart.js
        this.registerLibrary('chart.js', {
            scripts: ['https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'],
            check: () => typeof Chart !== 'undefined',
            version: '4.4.0',
            description: 'Chart.js Data Visualization Library'
        });
        
        // CodeMirror
        this.registerLibrary('codemirror', {
            scripts: [
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/javascript/javascript.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/css/css.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/xml/xml.js',
                'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/htmlmixed/htmlmixed.js'
            ],
            styles: ['https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.css'],
            check: () => typeof CodeMirror !== 'undefined',
            version: '5.65.16',
            description: 'CodeMirror Code Editor'
        });
        
        // Quill
        this.registerLibrary('quill', {
            scripts: ['https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.js'],
            styles: ['https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css'],
            check: () => typeof Quill !== 'undefined',
            version: '1.3.7',
            description: 'Quill Rich Text Editor'
        });
        
        // D3.js
        this.registerLibrary('d3', {
            scripts: ['https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js'],
            check: () => typeof d3 !== 'undefined',
            version: '7.8.5',
            description: 'D3.js Data Visualization Library'
        });
        
        // Leaflet
        this.registerLibrary('leaflet', {
            scripts: ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
            styles: ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'],
            check: () => typeof L !== 'undefined',
            version: '1.9.4',
            description: 'Leaflet Interactive Maps'
        });
        
        // FullCalendar
        this.registerLibrary('fullcalendar', {
            scripts: ['https://cdn.jsdelivr.net/npm/fullcalendar@6.1.9/index.global.min.js'],
            check: () => typeof FullCalendar !== 'undefined',
            version: '6.1.9',
            description: 'FullCalendar Event Calendar'
        });
        
        // DataTables
        this.registerLibrary('datatables', {
            scripts: ['https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js'],
            styles: ['https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css'],
            dependencies: ['jquery'],
            check: () => typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined',
            version: '1.13.7',
            description: 'DataTables Table Plugin'
        });
        
        // Three.js
        this.registerLibrary('three', {
            scripts: ['https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js'],
            check: () => typeof THREE !== 'undefined',
            version: '0.158.0',
            description: 'Three.js 3D Library'
        });
        
        // Video.js
        this.registerLibrary('videojs', {
            scripts: ['https://vjs.zencdn.net/8.6.1/video.min.js'],
            styles: ['https://vjs.zencdn.net/8.6.1/video-js.css'],
            check: () => typeof videojs !== 'undefined',
            version: '8.6.1',
            description: 'Video.js HTML5 Video Player'
        });
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 컴포넌트 등록 이벤트
        this.on('componentRegistered', (data) => {
            XCON.log(`📦 Component registered: ${data.type}`);
        });
        
        // 라이브러리 로드 이벤트
        this.on('libraryLoaded', (data) => {
            XCON.log(`📚 Library loaded: ${data.name}`);
        });
        
        // 에러 이벤트
        this.on('libraryError', (data) => {
            XCON.error(`❌ Library error: ${data.name}`, data.error);
        });
    }
    
    // =============================================================================
    // Utility Methods (유틸리티 메서드)
    // =============================================================================
    
    /**
     * 레지스트리 상태 조회
     */
    getStatus() {
        return {
            components: this.components.size,
            libraries: this.libraries.size,
            loadedLibraries: this.loadedLibraries.size,
            loadingPromises: this.loadingPromises.size
        };
    }
    
    /**
     * 컴포넌트 검색
     * @param {string} query - 검색 쿼리
     */
    searchComponents(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [type, info] of this.components) {
            if (type.toLowerCase().includes(lowerQuery) || 
                info.config.description.toLowerCase().includes(lowerQuery) ||
                info.config.category.toLowerCase().includes(lowerQuery)) {
                results.push({ type, ...info });
            }
        }
        
        return results;
    }
    
    /**
     * 디버그 정보 출력
     */
    debug() {
        console.group('🔍 Xamong Component Registry Debug');
        XCON.log('Components:', this.components);
        XCON.log('Libraries:', this.libraries);
        XCON.log('Loaded Libraries:', this.loadedLibraries);
        XCON.log('Loading Promises:', this.loadingPromises);
        XCON.log('Status:', this.getStatus());
        console.groupEnd();
    }
    
    /**
     * 레지스트리 정리
     */
    cleanup() {
        this.components.clear();
        this.libraries.clear();
        this.loadingPromises.clear();
        this.loadedLibraries.clear();
        this.eventListeners.clear();
        
        XCON.log('✅ Component Registry cleaned up');
    }
}

// =============================================================================
// Global Instance (전역 인스턴스)
// =============================================================================

// 전역 레지스트리 인스턴스 생성
if (!window.XamongRegistry) {
    window.XamongRegistry = new XamongComponentRegistry();
}

// ComponentFactory 확장
if (typeof ComponentFactory !== 'undefined') {
    // 기존 create 메서드 백업
    const originalCreate = ComponentFactory.create;
    
    // 새로운 create 메서드 (의존성 자동 로드)
    ComponentFactory.createWithDependencies = async function(type, xcon, key, owner = null) {
        return await window.XamongRegistry.createComponentWithFactory(type, xcon, key, owner);
    };
    
    // 동기 create 메서드는 기존 방식 유지
    ComponentFactory.create = originalCreate;
}

// 전역 유틸리티 함수들
window.XamongUtils = {
    /**
     * 컴포넌트 등록
     */
    registerComponent: (type, componentClass, config) => {
        return window.XamongRegistry.registerComponent(type, componentClass, config);
    },
    
    /**
     * 라이브러리 로드
     */
    loadLibrary: (name, force = false) => {
        return window.XamongRegistry.loadLibrary(name, force);
    },
    
    /**
     * 의존성과 함께 컴포넌트 생성
     */
    createComponent: (type, xcon, key, owner = null) => {
        return window.XamongRegistry.createComponentWithFactory(type, xcon, key, owner);
    },
    
    /**
     * 레지스트리 상태 조회
     */
    getRegistryStatus: () => {
        return window.XamongRegistry.getStatus();
    },
    
    /**
     * 컴포넌트 검색
     */
    searchComponents: (query) => {
        return window.XamongRegistry.searchComponents(query);
    }
};

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.XamongRegistry) {
        window.XamongRegistry.cleanup();
    }
});

XCON.log('✅ Xamong Component Registry System loaded successfully'); 
