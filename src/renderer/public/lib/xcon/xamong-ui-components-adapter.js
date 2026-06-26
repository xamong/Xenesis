/**
 * Xamong UI Components Adapter - 커스텀 컴포넌트 통합 시스템
 * 사용자가 자몽 내부 시스템을 건드리지 않고 커스텀 컴포넌트를 등록하고 사용할 수 있는 어댑터
 */

// =============================================================================
// 커스텀 컴포넌트 베이스 클래스
// =============================================================================

/**
 * XaCustomComponent - 모든 커스텀 컴포넌트의 기본 클래스
 * 자몽의 XaComponent를 확장하여 사용자 친화적인 인터페이스 제공
 */
class XaCustomComponent extends XaComponent {
    constructor(xcon, key, owner = null) {
        super(xcon, key, owner);
        this.customType = 'custom';
        this.version = '1.0.0';
        this.author = 'Unknown';
        this.description = 'Custom Component';

        this.alProps = null;

        // 커스텀 컴포넌트 초기화
        this.initializeCustomComponent();
        this._syncAlPropsFromXcon();
    }

    /**
     * Auto-layout: XCON 의 al / al* 를 병합해 stripAbsoluteToFlexItem 에서 읽을 수 있게 함
     */
    _syncAlPropsFromXcon() {
        try {
            const w = typeof window !== 'undefined' ? window : globalThis;
            const AL = w.XamongUIComponentsAL;
            if (AL && typeof AL.buildAlPropsFromXcon === 'function') {
                this.alProps = AL.buildAlPropsFromXcon(this);
            }
        } catch (e) {
            /* ignore */
        }
    }
    
    /**
     * 커스텀 컴포넌트 초기화 (오버라이드 가능)
     */
    initializeCustomComponent() {
        // 서브클래스에서 구현
    }
    
    /**
     * 컴포넌트 메타데이터 설정
     */
    setMetadata(metadata) {
        this.customType = metadata.type || this.customType;
        this.version = metadata.version || this.version;
        this.author = metadata.author || this.author;
        this.description = metadata.description || this.description;
        this.category = metadata.category || 'custom';
        this.icon = metadata.icon || '🧩';
        return this;
    }
    
    /**
     * 기본 스타일 생성 (XaComponent의 메서드 확장)
     */
    getBaseStyle(useBgColor = true, useFgColor = true) {
        const baseStyle = super.getBaseStyle(useBgColor, useFgColor);
        const w = typeof window !== 'undefined' ? window : globalThis;
        const AL = w.XamongUIComponentsAL;

        /* AL 패널 스택은 flex — 절대좌표(pos) 기본 스타일이면 형제·헤더와 겹침 */
        let layoutStyle = baseStyle;
        if (AL && typeof AL.applyAlFlexBaseStyle === 'function') {
            layoutStyle = AL.applyAlFlexBaseStyle(this, baseStyle);
        } else {
            layoutStyle =
                baseStyle
                    .replace(/position:\s*absolute;?/gi, 'position: relative;')
                    .replace(/\s*left:\s*[^;]+;?/gi, '')
                    .replace(/\s*top:\s*[^;]+;?/gi, '') +
                'align-self:stretch;width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:0;';
        }

        const customStyle =
            'border: 1px solid #e5e7eb; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

        return layoutStyle + customStyle;
    }

    updateProperty(propertyName, value) {
        super.updateProperty(propertyName, value);
        if (
            propertyName === 'al' ||
            (typeof propertyName === 'string' && /^al[A-Z]/.test(propertyName))
        ) {
            this._syncAlPropsFromXcon();
        }
    }
    
    /**
     * 커스텀 스타일 생성 헬퍼 (객체 형태로 반환)
     */
    createCustomStyle() {
        return {
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxSizing: 'border-box'
        };
    }
    
    /**
     * 커스텀 이벤트 핸들러 등록
     */
    registerEventHandler(eventName, handler) {
        if (!this.customEventHandlers) {
            this.customEventHandlers = new Map();
        }
        this.customEventHandlers.set(eventName, handler);
        return this;
    }
    
    /**
     * 커스텀 이벤트 발생
     */
    emitCustomEvent(eventName, data = {}) {
        window.XCON?.logon2('############################################');
        window.XCON?.logon2('# XaCustomComponent.emitCustomEvent ', eventName, data, this.owner);
        window.XCON?.logon2('############################################');

        if (this.customEventHandlers && this.customEventHandlers.has(eventName)) {
            const handler = this.customEventHandlers.get(eventName);
            try {
                handler.call(this, data);
            } catch (error) {
                XCON.error(`Custom event handler error for ${eventName}:`, error);
            }
        }
        
        // 부모 컴포넌트로 이벤트 버블링
        if (this.owner && typeof this.owner.onCustomEvent === 'function') {
            this.owner.onCustomEvent(eventName, data, this);
        }
    }
    
    /**
     * 데이터 바인딩 헬퍼
     */
    bindData(dataPath, defaultValue = null) {
        const value = this.getValue(dataPath, defaultValue);
        
        // 자몽체인 표현식 처리
        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
            return this.parseChainExpression(value);
        }
        
        return value;
    }
    
    /**
     * 자몽체인 표현식 파싱 헬퍼
     */
    parseChainExpression(expression) {
        if (this.owner && this.owner.playerHost) {
            try {
                const chainService = window.XamongServices?.ServiceManager?.services(this.owner.playerHost)?.getService('ChainingService');
                if (chainService) {
                    return chainService.parse(this.owner, expression);
                }
            } catch (error) {
                XCON.warn('Chain expression parsing failed:', error);
            }
        }
        return expression;
    }
    
    /**
     * 반응형 업데이트 (데이터 변경 시 자동 재렌더링)
     */
    enableReactiveUpdate(dataPaths = []) {
        this.reactivePaths = dataPaths;
        
        /*
        // 데이터 변경 감지를 위한 옵저버 설정 (간단한 구현)
        if (this.owner && this.owner.playerHost) {
            // 실제 구현에서는 더 정교한 옵저버 패턴 사용
            this.reactiveUpdateInterval = setInterval(() => {
                this.checkDataChanges();
            }, 1000);
        }
        */

        //
        // TODO: 반응형 업데이트 구현 : 트리거 이벤트 발생 시 자동 재렌더링 방식으로 구현 필요
        //
        
        return this;
    }
    
    /**
     * 데이터 변경 확인 및 업데이트
     */
    checkDataChanges() {
        if (!this.reactivePaths || this.reactivePaths.length === 0) return;
        
        let hasChanges = false;
        const currentValues = {};
        
        for (const path of this.reactivePaths) {
            const currentValue = this.bindData(path);
            if (!this.lastValues) this.lastValues = {};
            
            if (this.lastValues[path] !== currentValue) {
                this.lastValues[path] = currentValue;
                currentValues[path] = currentValue;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            this.onDataChanged(currentValues);
        }
    }
    
    /**
     * 데이터 변경 시 호출되는 메서드 (오버라이드 가능)
     */
    onDataChanged(changedData) {
        // 서브클래스에서 구현
        XCON.log('Data changed:', changedData);
    }
    
    /**
     * 컴포넌트 정리
     */
    dispose() {
        if (this.reactiveUpdateInterval) {
            clearInterval(this.reactiveUpdateInterval);
            this.reactiveUpdateInterval = null;
        }
        
        if (this.customEventHandlers) {
            this.customEventHandlers.clear();
        }
        
        // 서브클래스에서 추가 정리 작업 수행
        this.onDispose();
    }
    
    /**
     * 컴포넌트 정리 시 호출되는 메서드 (오버라이드 가능)
     */
    onDispose() {
        // 서브클래스에서 구현
    }
}

window.XaCustomComponent = XaCustomComponent;

// =============================================================================
// 커스텀 컴포넌트 어댑터 시스템
// =============================================================================

/**
 * XamongComponentAdapter - 커스텀 컴포넌트 등록 및 관리 시스템
 */
class XamongComponentAdapter {
    constructor() {
        this.customComponents = new Map();
        this.componentCategories = new Map();
        this.componentMetadata = new Map();
        this.initialized = false;
        
        // 기본 카테고리 등록
        this.registerCategory('custom', '커스텀', '🧩');
        this.registerCategory('chart', '차트', '📊');
        this.registerCategory('form', '폼', '📝');
        this.registerCategory('media', '미디어', '🎬');
        this.registerCategory('utility', '유틸리티', '🔧');
    }
    
    /**
     * 어댑터 초기화
     */
    initialize() {
        if (this.initialized) return;
        
        XCON.logon('🔌 XamongComponentAdapter 초기화 중...');
        
        // ComponentFactory 확장
        this.extendComponentFactory();
        
        // XamongUtils 확장 (3rd-party 컴포넌트 지원)
        this.extendXamongUtils();
        
        this.initialized = true;
        XCON.logon('✅ XamongComponentAdapter 초기화 완료');
    }
    
    /**
     * ComponentFactory 확장
     */
    extendComponentFactory() {
        // ComponentFactory가 로드될 때까지 대기하는 함수
        const waitForComponentFactory = () => {
            XCON.log('🔍 Checking for ComponentFactory...', {
                hasWindow: typeof window !== 'undefined',
                hasComponentFactory: !!window.ComponentFactory,
                componentFactoryType: typeof window.ComponentFactory
            });
            
            if (!window.ComponentFactory) {
                XCON.log('⏳ Waiting for ComponentFactory to load...');
                setTimeout(waitForComponentFactory, 100);
                return;
            }
            
            XCON.log('✅ ComponentFactory found, extending...');
            this.doExtendComponentFactory();
        };
        
        waitForComponentFactory();
    }
    
    /**
     * 실제 ComponentFactory 확장 작업
     */
    doExtendComponentFactory() {
        // 원본 create 메서드 백업
        const originalCreate = ComponentFactory.create.bind(ComponentFactory);
        const originalCreateFromXCON = ComponentFactory.createFromXCON.bind(ComponentFactory);
        
        // create 메서드 확장
        ComponentFactory.create = (type, xcon, key, owner = null) => {
            // 커스텀 컴포넌트 확인
            if (this.customComponents.has(type)) {
                const CustomComponentClass = this.customComponents.get(type);
                XCON.log(`🧩 Creating custom component: ${type}`);
                return new CustomComponentClass(xcon, key, owner);
            }
            
            // 기본 컴포넌트 생성
            return originalCreate(type, xcon, key, owner);
        };
        
        // createFromXCON 메서드 확장
        ComponentFactory.createFromXCON = (xcon, key, owner = null) => {
            if (!xcon) return null;
            
            const type = xcon.get('type');
            if (!type) return null;
            
            // 커스텀 컴포넌트 확인
            if (this.customComponents.has(type)) {
                const CustomComponentClass = this.customComponents.get(type);
                XCON.log(`🧩 Creating custom component from XCON: ${type}`);
                const component = new CustomComponentClass(xcon, key, owner);

                // 키에서 owner 접두사 제거 (예: "Login01~usernameField" -> "usernameField")
                const componentName = component.key.includes('~') ? component.key.split('~').pop() : component.key;

                if (owner === component.owner){
                    // 컴포넌트를 owner.componentData에 등록 (self/parent 체이닝용)
                    if (component.owner && component.owner.componentData && component.key) {
                        component.owner.componentData.set(componentName, component);
                        XCON.log(`🔗 커스텀 컴포넌트 등록1111: ${componentName} -> owner.componentData`);
                    }
                } else {
                    // xList or (xForm in XaFrame)
                    if (owner && owner.componentData && component.key){               
                        owner.componentData.set(componentName, component);
                        component.parentController = owner;
                        owner.allComponents.set(component.key, component);
                        XCON.log(`🔗 커스텀 컴포넌트 등록2222: ${componentName} -> owner.componentData`);
                    } 
                    // owner is IPlayerHost
                    else {                
                        component.owner.componentData.set(componentName, component);
                        XCON.log(`🔗 커스텀 컴포넌트 등록3333: ${componentName} -> owner.componentData`);
                    }
                }
        
                return component;
            }
            
            // 기본 컴포넌트 생성
            return originalCreateFromXCON(xcon, key, owner);
        };
        
        XCON.log('🔧 ComponentFactory extended successfully');
    }
    
    /**
     * XamongUtils 확장 (3rd-party 컴포넌트 지원)
     */
    extendXamongUtils() {
        if (!window.XamongUtils) {
            window.XamongUtils = {};
        }
        
        // 원본 createComponent 메서드 백업
        const originalCreateComponent = window.XamongUtils.createComponent;
        
        // createComponent 메서드 확장
        window.XamongUtils.createComponent = async (type, xcon, key, owner = null) => {
            // 커스텀 비동기 컴포넌트 확인
            if (this.customComponents.has(type)) {
                const CustomComponentClass = this.customComponents.get(type);
                const metadata = this.componentMetadata.get(type);
                
                XCON.log(`🧩 Creating async custom component: ${type}`);
                
                // 비동기 컴포넌트인 경우 초기화 대기
                const component = new CustomComponentClass(xcon, key, owner);
                
                if (metadata && metadata.async && component.initializeAsync) {
                    await component.initializeAsync();
                }
                
                return component;
            }
            
            // 기본 3rd-party 컴포넌트 생성
            if (originalCreateComponent) {
                return await originalCreateComponent(type, xcon, key, owner);
            }
            
            // fallback: ComponentFactory 사용
            return ComponentFactory.create(type, xcon, key, owner);
        };
    }
    
    /**
     * 커스텀 컴포넌트 등록
     */
    registerComponent(type, ComponentClass, metadata = {}) {
        if (this.customComponents.has(type)) {
            XCON.warn(`Component type '${type}' is already registered`);
            return false;
        }
        
        // 컴포넌트 클래스 검증
        if (!ComponentClass || typeof ComponentClass !== 'function') {
            throw new Error(`Invalid component class for type '${type}'`);
        }
        
        // XaCustomComponent 상속 확인
        if (!this.isValidCustomComponent(ComponentClass)) {
            throw new Error(`Component '${type}' must extend XaCustomComponent`);
        }
        
        // 메타데이터 설정
        const fullMetadata = {
            type: type,
            category: 'custom',
            icon: '🧩',
            version: '1.0.0',
            author: 'Unknown',
            description: `Custom component: ${type}`,
            async: false,
            dependencies: [],
            ...metadata
        };
        
        // 등록
        this.customComponents.set(type, ComponentClass);
        this.componentMetadata.set(type, fullMetadata);
        
        // 카테고리에 추가
        const category = fullMetadata.category;
        if (!this.componentCategories.has(category)) {
            this.registerCategory(category, category, '📁');
        }
        
        XCON.log(`✅ Custom component '${type}' registered successfully`);
        XCON.log(`📋 Metadata:`, fullMetadata);
        
        return true;
    }
    
    /**
     * 커스텀 컴포넌트 클래스 유효성 검증
     */
    isValidCustomComponent(ComponentClass) {
        // 프로토타입 체인 확인
        let proto = ComponentClass.prototype;
        while (proto) {
            if (proto.constructor === XaCustomComponent) {
                return true;
            }
            proto = Object.getPrototypeOf(proto);
        }
        return false;
    }
    
    /**
     * 컴포넌트 등록 해제
     */
    unregisterComponent(type) {
        if (!this.customComponents.has(type)) {
            XCON.warn(`Component type '${type}' is not registered`);
            return false;
        }
        
        this.customComponents.delete(type);
        this.componentMetadata.delete(type);
        
        XCON.log(`🗑️ Custom component '${type}' unregistered`);
        return true;
    }
    
    /**
     * 카테고리 등록
     */
    registerCategory(id, name, icon) {
        this.componentCategories.set(id, { id, name, icon });
    }
    
    /**
     * 등록된 컴포넌트 목록 조회
     */
    getRegisteredComponents() {
        const components = [];
        for (const [type, ComponentClass] of this.customComponents) {
            const metadata = this.componentMetadata.get(type);
            components.push({
                type,
                ComponentClass,
                metadata
            });
        }
        return components;
    }
    
    /**
     * 카테고리별 컴포넌트 조회
     */
    getComponentsByCategory(category) {
        return this.getRegisteredComponents().filter(comp => 
            comp.metadata.category === category
        );
    }
    
    /**
     * 컴포넌트 메타데이터 조회
     */
    getComponentMetadata(type) {
        return this.componentMetadata.get(type);
    }
    
    /**
     * 모든 카테고리 조회
     */
    getCategories() {
        return Array.from(this.componentCategories.values());
    }
    
    /**
     * 컴포넌트 존재 여부 확인
     */
    hasComponent(type) {
        return this.customComponents.has(type);
    }
    
    /**
     * 의존성 로딩
     */
    async loadDependencies(type) {
        const metadata = this.componentMetadata.get(type);
        if (!metadata || !metadata.dependencies || metadata.dependencies.length === 0) {
            return true;
        }
        
        XCON.log(`📦 Loading dependencies for ${type}:`, metadata.dependencies);
        
        try {
            for (const dep of metadata.dependencies) {
                await this.loadDependency(dep);
            }
            return true;
        } catch (error) {
            XCON.error(`❌ Failed to load dependencies for ${type}:`, error);
            return false;
        }
    }
    
    /**
     * 개별 의존성 로딩
     */
    async loadDependency(dependency) {
        return new Promise((resolve, reject) => {
            if (typeof dependency === 'string') {
                // URL로 스크립트 로딩
                const script = document.createElement('script');
                script.src = dependency;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load ${dependency}`));
                document.head.appendChild(script);
            } else if (dependency.type === 'css') {
                // CSS 로딩
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = dependency.url;
                link.onload = () => resolve();
                link.onerror = () => reject(new Error(`Failed to load CSS ${dependency.url}`));
                document.head.appendChild(link);
            } else {
                resolve(); // 이미 로딩된 것으로 간주
            }
        });
    }
}

// =============================================================================
// 전역 어댑터 인스턴스 생성 및 초기화
// =============================================================================

// 전역 어댑터 인스턴스
window.XamongComponentAdapter = new XamongComponentAdapter();

// DOM 로딩 완료 후 자동 초기화 (지연시간 증가)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        XCON.logon('🚀 DOMContentLoaded fired, initializing XamongComponentAdapter...');
        XCON.logon('📊 Current window objects:', {
            hasXCON: !!window.XCON,
            hasComponentFactory: !!window.ComponentFactory,
            hasXamongUtils: !!window.XamongUtils,
            loadedScripts: Array.from(document.scripts).map(s => s.src.split('/').pop()).filter(s => s.includes('xamong'))
        });
        // 다른 스크립트들이 로드될 시간을 더 줌
        //setTimeout(() => {
        //    window.XamongComponentAdapter.initialize();
        //}, 500);
        window.XamongComponentAdapter.initialize();
    });
} else {
    XCON.logon('🚀 DOM already loaded, initializing XamongComponentAdapter...');
    XCON.logon('📊 Current window objects:', {
        hasXCON: !!window.XCON,
        hasComponentFactory: !!window.ComponentFactory,
        hasXamongUtils: !!window.XamongUtils,
        loadedScripts: Array.from(document.scripts).map(s => s.src.split('/').pop()).filter(s => s.includes('xamong'))
    });
    // 이미 로딩 완료된 경우 더 긴 지연시간
    //setTimeout(() => {
    //    window.XamongComponentAdapter.initialize();
    //}, 500);
    window.XamongComponentAdapter.initialize();
}

// =============================================================================
// 헬퍼 함수들
// =============================================================================

/**
 * 간편한 컴포넌트 등록 함수
 */
window.registerXamongComponent = function(type, ComponentClass, metadata = {}) {
    return window.XamongComponentAdapter.registerComponent(type, ComponentClass, metadata);
};

/**
 * 컴포넌트 등록 해제 함수
 */
window.unregisterXamongComponent = function(type) {
    return window.XamongComponentAdapter.unregisterComponent(type);
};

/**
 * 등록된 컴포넌트 목록 조회 함수
 */
window.getXamongUIComponents = function(category = null) {
    if (category) {
        return window.XamongComponentAdapter.getComponentsByCategory(category);
    }
    return window.XamongComponentAdapter.getRegisteredComponents();
};

// 하위 호환성을 위한 별칭
window.getXamongComponents = window.getXamongUIComponents;

console.log('🔌 Xamong UI Components Adapter loaded successfully'); 