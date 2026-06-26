/**
 * Xamong Service System - Complete JavaScript Port
 * 자몽 서비스 시스템의 완전한 JavaScript 포팅 버전
 * 기존 ChainingService와 통합된 서비스 관리 시스템
 */

class IAppHost {
    constructor() {
        this.serviceManager = null;
        this.appService = null;
    }

    doCustomAction(method, params) {
        XCON.log(`Custom action: ${method}`, params);
        return new XCON();
    }
    showAlert(title, message, buttons, sender) {
        alert(`${title}: ${message}`);
        return buttons[0] || {};
    }
    showToast(message, delay) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            XCON.log(`Toast: ${message}`);
        }
    }
    doActivity(xcon, params, type) {
        XCON.log(`Activity: ${xcon}`, params);
    }
    makeHome(xcon, params) {
        XCON.log(`Make home: ${xcon}`, params);
    }
    goHome() {
        XCON.log('Go home');
    }
    goBack() {
        XCON.log('Go back');
    }
    goGoBack() {
        XCON.log('Go go back');
    }
    play(file) {
        XCON.log(`Play: ${file}`);
    }
}

if (typeof window !== 'undefined') {   
    // 전역 접근을 위한 window 객체에 등록
    window.XamongCore = {
        IAppHost
    };
    
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IAppHost
    };
}


// =============================================================================
// 1. IPlayerHost Interface (플레이어 호스트 인터페이스)
// =============================================================================
class IPlayerHost {
    constructor() {
        // IPlayerHost 기본 구현 - 추상 인터페이스
    }

    // 서브클래스에서 구현해야 할 메서드들
    getService(serviceType) {
        throw new Error('getService must be implemented by concrete player host');
    }

    // 추가 확장 가능한 메서드들
    getName() {
        return this.name || 'DefaultPlayerHost';
    }

    getId() {
        return this.id || this.generateId();
    }

    generateId() {
        return `host_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 호스트 생명주기 메서드들
    initialize() {
        // 호스트 초기화 로직
    }

    dispose() {
        // 호스트 정리 로직
    }
}

// =============================================================================
// 2. IService Interface (서비스 인터페이스)
// =============================================================================
class IService {
    constructor() {
        this.initializeHandlers = [];
        this.unloadHandlers = [];
    }

    // Event handlers for Initialize and Unload
    addInitializeHandler(handler) {
        this.initializeHandlers.push(handler);
    }

    removeInitializeHandler(handler) {
        const index = this.initializeHandlers.indexOf(handler);
        if (index > -1) {
            this.initializeHandlers.splice(index, 1);
        }
    }

    addUnloadHandler(handler) {
        this.unloadHandlers.push(handler);
    }

    removeUnloadHandler(handler) {
        const index = this.unloadHandlers.indexOf(handler);
        if (index > -1) {
            this.unloadHandlers.splice(index, 1);
        }
    }

    // Abstract methods - must be implemented by concrete services
    initializeService() {
        throw new Error('initializeService must be implemented by concrete service');
    }

    unloadService() {
        throw new Error('unloadService must be implemented by concrete service');
    }
}

// =============================================================================
// 3. AbstractService (추상 서비스 기본 클래스)
// =============================================================================
class AbstractService extends IService {
    constructor(services) {
        super();
        this.services = services;
    }

    get Services() {
        return this.services;
    }

    onInitialize(e = {}) {
        this.initializeHandlers.forEach(handler => {
            try {
                handler(this, e);
            } catch (error) {
                XCON.error('Error in initialize handler:', error);
            }
        });
    }

    onUnload(e = {}) {
        this.unloadHandlers.forEach(handler => {
            try {
                handler(this, e);
            } catch (error) {
                XCON.error('Error in unload handler:', error);
            }
        });
    }

    initializeService() {
        this.onInitialize();
    }

    unloadService() {
        this.onUnload();
    }
}

// =============================================================================
// 4. StringService (문자열 서비스)
// =============================================================================
class StringService extends AbstractService {
    constructor(services) {
        super(services);
        this.macroPatterns = new Map();
        this.initializeMacroPatterns();
    }

    initializeMacroPatterns() {
        // 기본 매크로 패턴들 초기화
        this.macroPatterns.set(/\$\{date\}/g, () => new Date().toLocaleDateString());
        this.macroPatterns.set(/\$\{time\}/g, () => new Date().toLocaleTimeString());
        this.macroPatterns.set(/\$\{datetime\}/g, () => new Date().toLocaleString());
        this.macroPatterns.set(/\$\{timestamp\}/g, () => Date.now().toString());
    }

    parseMacro(input) {
        if (!input || typeof input !== 'string') {
            return input;
        }

        let result = input;
        
        for (const [pattern, replacer] of this.macroPatterns) {
            result = result.replace(pattern, replacer);
        }

        return result;
    }

    addMacroPattern(pattern, replacer) {
        this.macroPatterns.set(pattern, replacer);
    }

    removeMacroPattern(pattern) {
        this.macroPatterns.delete(pattern);
    }

    parseChain(owner, input) {
        // ChainingService를 사용하여 객체 파싱
        try {
            const chainingService = this.services.getService('ChainingService');
            if (chainingService) {
                return chainingService.parse(owner, input);
            }
        } catch (e) {
            XCON.warn('ChainingService를 통한 parseChain 실패:', e.message);
        }

        // Fallback: 기본 처리
        return input;
    }
    parseChainWithSender(owner, sender, input) {
        // ChainingService를 사용하여 객체 파싱
        try {
            const chainingService = this.services.getService('ChainingService');
            if (chainingService) {
                return chainingService.parseWithSender(owner, input, sender);
            }
        } catch (e) {
            XCON.warn('ChainingService를 통한 parseChainWithSender 실패:', e.message);
        }

        // Fallback: 기본 처리
        return input;
    }
    parseObject(owner, input) {
        // ChainingService를 사용하여 객체 파싱
        try {
            const chainingService = this.services.getService('ChainingService');
            if (chainingService) {
                return chainingService.parseObject(owner, input);
            }
        } catch (e) {
            XCON.warn('ChainingService를 통한 parseObject 실패:', e.message);
        }

        // Fallback: 기본 처리
        return input;
    }
}

// =============================================================================
// 5. ShellService (셸 서비스)
// =============================================================================
class ShellService extends AbstractService {
    constructor(services) {
        super(services);
        this.commands = new Map();
        this.initializeCommands();
    }

    initializeCommands() {
        // 기본 명령어들 등록
        this.commands.set('help', this.helpCommand.bind(this));
        this.commands.set('clear', this.clearCommand.bind(this));
        this.commands.set('version', this.versionCommand.bind(this));
    }

    executeCommand(command, args = []) {
        const cmd = this.commands.get(command);
        if (cmd) {
            return cmd(args);
        } else {
            return `Unknown command: ${command}`;
        }
    }

    registerCommand(name, handler) {
        this.commands.set(name, handler);
    }

    helpCommand(args) {
        const commands = Array.from(this.commands.keys()).join(', ');
        return `Available commands: ${commands}`;
    }

    clearCommand(args) {
        if (typeof console !== 'undefined' && console.clear) {
            console.clear();
        }
        return 'Console cleared';
    }

    versionCommand(args) {
        return 'Xamong Service System v1.0.0';
    }
}

// =============================================================================
// 6. PropertyService (속성 서비스)
// =============================================================================
class PropertyService extends AbstractService {
    constructor(services) {
        super(services);
        this.properties = new Map();
        this.defaultProperties = new Map();
        this.initializeDefaultProperties();
    }

    initializeDefaultProperties() {
        // 기본 속성들 설정
        this.defaultProperties.set('system.name', 'Xamong Service System');
        this.defaultProperties.set('system.version', '1.0.0');
        this.defaultProperties.set('system.environment', 'browser');
        this.defaultProperties.set('system.timestamp', Date.now());
    }

    loadProperties() {
        // 기본 속성들을 실제 속성으로 복사
        for (const [key, value] of this.defaultProperties) {
            if (!this.properties.has(key)) {
                this.properties.set(key, value);
            }
        }

        try {
            // 로컬 스토리지에서 속성 로드 (브라우저 환경)
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('xamong.properties');
                if (stored) {
                    const storedProps = JSON.parse(stored);
                    for (const [key, value] of Object.entries(storedProps)) {
                        this.properties.set(key, value);
                    }
                }
            }
        } catch (error) {
            //XCON.warn('Failed to load properties from localStorage:', error);
            /*
            if (typeof parent !== 'undefined' && parent.postMessage) {
                parent.postMessage({ type: 'client-storage-get-item', key: 'xamong.properties' }, '*');
            }
            */
        }
    }

    saveProperties() {
        const propsObj = {};
        try {
            for (const [key, value] of this.properties) {
                propsObj[key] = value;
            }
            // 로컬 스토리지에 속성 저장 (브라우저 환경)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('xamong.properties', JSON.stringify(propsObj));
            }
        } catch (error) {
            //XCON.warn('Failed to save properties to localStorage:', error);
            /*
            if (typeof parent !== 'undefined' && parent.postMessage) {
                parent.postMessage({ type: 'client-storage-set-item', key: 'xamong.properties', value: propsObj }, '*');
            }
            */
        }

    }

    getProperty(key, defaultValue = null) {
        return this.properties.get(key) || defaultValue;
    }

    setProperty(key, value) {
        this.properties.set(key, value);
        this.saveProperties();
    }

    removeProperty(key) {
        const result = this.properties.delete(key);
        this.saveProperties();
        return result;
    }

    getAllProperties() {
        return new Map(this.properties);
    }

    initializeService() {
        super.initializeService();
        this.loadProperties();
    }
}

// =============================================================================
// 7. ResourceService (리소스 서비스)
// =============================================================================
class ResourceService extends AbstractService {
    constructor(services) {
        super(services);
        this.resources = new Map();
        this.resourceCache = new Map();
    }

    loadResource(key, url) {
        return new Promise((resolve, reject) => {
            if (this.resourceCache.has(key)) {
                resolve(this.resourceCache.get(key));
                return;
            }

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    this.resourceCache.set(key, data);
                    this.resources.set(key, url);
                    resolve(data);
                })
                .catch(error => {
                    XCON.error(`Failed to load resource ${key} from ${url}:`, error);
                    reject(error);
                });
        });
    }

    getResource(key) {
        return this.resourceCache.get(key);
    }

    hasResource(key) {
        return this.resourceCache.has(key);
    }

    removeResource(key) {
        this.resourceCache.delete(key);
        this.resources.delete(key);
    }

    clearCache() {
        this.resourceCache.clear();
    }
}

// =============================================================================
// 8. LogService (로그 서비스)
// =============================================================================
class LogService extends AbstractService {
    constructor(services) {
        super(services);
        this.logs = [];
        this.maxLogs = 1000;
        this.logLevel = 'INFO';
        this.logLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        // 로그 레벨 체크
        if (this.logLevels.indexOf(level) >= this.logLevels.indexOf(this.logLevel)) {
            this.logs.push(logEntry);

            // 최대 로그 수 체크
            if (this.logs.length > this.maxLogs) {
                this.logs.shift();
            }

            // 콘솔에도 출력
            this.outputToConsole(logEntry);
        }
    }

    outputToConsole(logEntry) {
        const { timestamp, level, message, data } = logEntry;
        const logMessage = `[${timestamp}] ${level}: ${message}`;

        switch (level) {
            case 'DEBUG':
                XCON.debug(logMessage, data);
                break;
            case 'INFO':
                XCON.info(logMessage, data);
                break;
            case 'WARN':
                XCON.warn(logMessage, data);
                break;
            case 'ERROR':
                XCON.error(logMessage, data);
                break;
            default:
                XCON.log(logMessage, data);
        }
    }

    debug(message, data) {
        this.log('DEBUG', message, data);
    }

    info(message, data) {
        this.log('INFO', message, data);
    }

    warn(message, data) {
        this.log('WARN', message, data);
    }

    error(message, data) {
        this.log('ERROR', message, data);
    }

    getLogs(level = null, limit = null) {
        let filteredLogs = this.logs;

        if (level) {
            filteredLogs = this.logs.filter(log => log.level === level);
        }

        if (limit) {
            filteredLogs = filteredLogs.slice(-limit);
        }

        return [...filteredLogs];
    }

    clearLogs() {
        this.logs = [];
    }

    setLogLevel(level) {
        if (this.logLevels.includes(level)) {
            this.logLevel = level;
        }
    }
}

// =============================================================================
// 9. ApplicationService (기존 기능 유지하면서 확장)
// =============================================================================
class ApplicationService extends AbstractService {
    constructor(services) {
        super(services);
        this.repository = new XCON();
        this.styleInfo = new XCON();
        this.controllers = new Map();
        this.imagebase = null; // 이미지 베이스 경로 캐시
        this.virtual = false; // 가상 환경 플래그 (기본값: false)
    }

    get Repository() {
        return this.repository;
    }

    getRepository() {
        return this.repository;
    }

    get StyleInfo() {
        return this.styleInfo;
    }

    attach(appHost) {
        this.appHost = appHost;
    }

    // 가상 환경 설정
    setVirtual(isVirtual) {
        this.virtual = isVirtual;
        XCON.log(`🔧 ApplicationService 가상 환경 설정: ${isVirtual}`);
    }

    // 가상 환경 여부 확인
    isVirtual() {
        return this.virtual;
    }

    // 이미지 베이스 경로 설정 (앱 초기화 시 한번만 호출)
    setImageBase(imagebase) {
        this.imagebase = imagebase;
    }

    // 이미지 베이스 경로 가져오기
    getImageBase() {
        if (this.imagebase === null) {
            // 아직 설정되지 않았다면 repository에서 가져오기
            this.imagebase = XCON.getAttributeWithPath(this.repository, 'map.imagebase') || '';
        }
        return this.imagebase;
    }

    // 상대 경로를 절대 경로로 변환
    resolveImagePath(imagePath) {
        if (!imagePath || imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
            return imagePath; // 이미 절대 경로이거나 빈 값
        }
        
        const imagebase = this.getImageBase();
        return imagebase ? `${imagebase}/${imagePath}` : imagePath;
    }

    // XCON 데이터에서 Action 객체 생성
    evaluateAction(xconData, owner) {
        try {
            // ActionFactory를 사용하여 액션 생성
            if (typeof ActionFactory !== 'undefined' && ActionFactory.createFromXCON) {
                const action = ActionFactory.createFromXCON(xconData, owner);
                XCON.log(`✅ ApplicationService.evaluateAction: 액션 생성 성공 - ${action.constructor.name}`);
                return action;
            } else {
                XCON.error('❌ ApplicationService.evaluateAction: ActionFactory를 찾을 수 없습니다');
                return null;
            }
        } catch (error) {
            XCON.error('❌ ApplicationService.evaluateAction: 액션 생성 실패:', error);
            return null;
        }
    }
}

// =============================================================================
// 10. DataService (데이터 서비스)
// =============================================================================
class DataService extends AbstractService {
    constructor(services) {
        super(services);
        this.dataStore = new Map();
        this.schemas = new Map();
    }

    setData(key, value, schema = null) {
        if (schema && this.schemas.has(schema)) {
            // 스키마 검증 로직
            if (!this.validateSchema(value, this.schemas.get(schema))) {
                throw new Error(`Data does not match schema: ${schema}`);
            }
        }

        this.dataStore.set(key, value);
    }

    getData(key, defaultValue = null) {
        return this.dataStore.get(key) || defaultValue;
    }

    hasData(key) {
        return this.dataStore.has(key);
    }

    removeData(key) {
        return this.dataStore.delete(key);
    }

    clearData() {
        this.dataStore.clear();
    }

    registerSchema(name, schema) {
        this.schemas.set(name, schema);
    }

    validateSchema(data, schema) {
        // 간단한 스키마 검증 로직
        if (typeof schema === 'object' && schema.type) {
            return typeof data === schema.type;
        }
        return true;
    }

    getAllKeys() {
        return Array.from(this.dataStore.keys());
    }

    getAllData() {
        return new Map(this.dataStore);
    }
}

// =============================================================================
// 11. RemoteService (원격 서비스)
// =============================================================================
class RemoteService extends AbstractService {
    constructor(services) {
        super(services);
        this.endpoints = new Map();
        this.defaultTimeout = 30000; // 30 seconds
    }

    registerEndpoint(name, config) {
        this.endpoints.set(name, {
            url: config.url,
            method: config.method || 'GET',
            headers: config.headers || {},
            timeout: config.timeout || this.defaultTimeout
        });
    }

    async callEndpoint(name, data = null, options = {}) {
        const endpoint = this.endpoints.get(name);
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${name}`);
        }

        const config = {
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                ...endpoint.headers,
                ...options.headers
            }
        };

        if (data && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

        try {
            const response = await fetch(endpoint.url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            return responseData;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    removeEndpoint(name) {
        return this.endpoints.delete(name);
    }

    getEndpoints() {
        return Array.from(this.endpoints.keys());
    }
}

// =============================================================================
// 12. AutoGenService (자동 생성 서비스)
// =============================================================================
class AutoGenService extends AbstractService {
    constructor(services) {
        super(services);
        
        const initHandler = (sender, e) => {
            XCON.log('🔧 AutoGenService: 초기화 시작');

            // CalcQuick이 정의되어 있을 때만 초기화
            if (typeof CalcQuick !== 'undefined') {
                this.calculator = new CalcQuick();
                XCON.log('🔧 AutoGenService: CalcQuick 계산기 초기화 완료');
            } else {
                this.calculator = null;
                XCON.warn('⚠️ AutoGenService: CalcQuick이 정의되지 않음. 계산 기능 비활성화');
            }
            
            this.lookupList = new Map();
            this.generators = new Map();
            this.templates = new Map();
            this.initializeGenerators();
        };      
        this.addInitializeHandler(initHandler);
    }

    initializeGenerators() {
        // CalcQuick이 사용 가능할 때만 계산기 관련 초기화
        if (this.calculator && this.calculator._engine && typeof this.calculator._engine.addFunction === 'function') {
            this.calculator._engine.addFunction("LOOKUP", this.computeLookup.bind(this));
            this.calculator.set('white', 'white');
            this.calculator.set('red', 'red');
            this.calculator.set('green', 'green');
            this.calculator.set('black', 'black');
            XCON.log('🔧 AutoGenService: 계산기 함수 및 변수 초기화 완료');
        } else {
            XCON.warn('⚠️ AutoGenService: 계산기가 없어 관련 초기화 건너뜀');
        }

        //loadPreset();
        //loadLookup();
        //loadDummy();

        // UUID 생성기
        this.generators.set('uuid', () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        });

        // 랜덤 숫자 생성기
        this.generators.set('randomNumber', (min = 0, max = 100) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        });

        // 랜덤 문자열 생성기
        this.generators.set('randomString', (length = 8) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        });

        // 타임스탬프 생성기
        this.generators.set('timestamp', () => {
            return Date.now();
        });
    }

    computeLookup(args) {
        XCON.log("------- Lookup : " + args);

        if (!this.calculator) {
            XCON.warn('⚠️ AutoGenService: 계산기가 없어 LOOKUP 함수 사용 불가');
            return '';
        }

        const key = this.calculator._engine.stripTics(this.calculator._engine.getValueFromArg(args));
        if (this.lookupList && this.lookupList.has(key)) {
            const values = this.lookupList.get(key);
            const array = Array.isArray(values) ? values : [values];
            const randomIndex = Math.floor(Math.random() * array.length);
            return values[randomIndex];
        }
        return '';
    }

    generate(expr, ...args) {
        const generator = this.generators.get(expr);
        if (generator) {
            return generator(...args);
        } else {
            if (!this.calculator) {
                XCON.warn('⚠️ AutoGenService: 계산기가 없어 표현식 계산 불가:', expr);
                return 'ERROR: Calculator not available';
            }
    
            this.calculator._engine.isError = false;
            let result = this.calculator.parseAndCompute(expr);
            if (this.calculator._engine.isError) {
                result = 'ERROR:' + result;
            }
            return result;
        }
    }

    registerLookup(name, value) {
        this.lookupList.set(name, value);
    }

    registerGenerator(name, generator) {
        this.generators.set(name, generator);
    }

    registerTemplate(name, template) {
        this.templates.set(name, template);
    }

    generateFromTemplate(templateName, data = {}) {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }

        let result = template;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(placeholder, value);
        }

        return result;
    }

    getGenerators() {
        return Array.from(this.generators.keys());
    }

    getTemplates() {
        return Array.from(this.templates.keys());
    }
}

// =============================================================================
// 13. PostboxService (포스트박스 서비스)
// =============================================================================
class PostboxService extends AbstractService {
    constructor(services) {
        super(services);
        this.messages = [];
        this.subscribers = new Map();
        this.maxMessages = 100;
    }

    publish(topic, message, data = null) {
        const messageObj = {
            id: this.generateMessageId(),
            topic,
            message,
            data,
            timestamp: Date.now()
        };

        this.messages.push(messageObj);

        // 최대 메시지 수 관리
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        // 구독자들에게 메시지 전달
        const topicSubscribers = this.subscribers.get(topic) || [];
        topicSubscribers.forEach(callback => {
            try {
                callback(messageObj);
            } catch (error) {
                XCON.error('Error in message subscriber:', error);
            }
        });

        return messageObj.id;
    }

    subscribe(topic, callback) {
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, []);
        }
        this.subscribers.get(topic).push(callback);

        // 구독 해제 함수 반환
        return () => {
            const subscribers = this.subscribers.get(topic);
            if (subscribers) {
                const index = subscribers.indexOf(callback);
                if (index > -1) {
                    subscribers.splice(index, 1);
                }
            }
        };
    }

    unsubscribe(topic, callback = null) {
        if (callback) {
            const subscribers = this.subscribers.get(topic);
            if (subscribers) {
                const index = subscribers.indexOf(callback);
                if (index > -1) {
                    subscribers.splice(index, 1);
                }
            }
        } else {
            this.subscribers.delete(topic);
        }
    }

    getMessages(topic = null, limit = null) {
        let filteredMessages = this.messages;

        if (topic) {
            filteredMessages = this.messages.filter(msg => msg.topic === topic);
        }

        if (limit) {
            filteredMessages = filteredMessages.slice(-limit);
        }

        return [...filteredMessages];
    }

    clearMessages(topic = null) {
        if (topic) {
            this.messages = this.messages.filter(msg => msg.topic !== topic);
        } else {
            this.messages = [];
        }
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTopics() {
        return Array.from(this.subscribers.keys());
    }

    getSubscriberCount(topic) {
        const subscribers = this.subscribers.get(topic);
        return subscribers ? subscribers.length : 0;
    }
}

// =============================================================================
// 14. Enhanced ChainingService (기존 체이닝 서비스 통합)
// =============================================================================
class ChainingService extends AbstractService {
    constructor(services) {
        super(services);
        this.stringService = null;

        this.previewMode = false;
        this.previewRepo = new XCON();
    }

    initializeService() {
        super.initializeService();
        this.stringService = this.services.getService('StringService');
    }

    setPreviewMode(mode) {
        this.previewMode = mode;
    }

    parse(owner, input) {
        try {
            XCON.log('🔍 ChainingService.parse 호출:', { input, owner });
            XCON.log('🔍 Owner 타입:', owner?.constructor?.name);
            XCON.log('🔍 Owner playerHost:', owner?.playerHost);
            XCON.log('🔍 Owner playerHost 타입:', owner?.playerHost?.constructor?.name);
            
            // XamongChain에서 DataStore와 ParserFactory 가져오기
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성
                const dataStore = new window.XamongChain.DataStore(owner);                      
                // DataStore에 설정된 데이터 확인
                //XCON.log('🔍 DataStore에 설정된 map.mainhost:', dataStore.get('map.mainhost'));
                
                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Smart');
                let parsedResult = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService 파싱 결과:', { input, parsedResult });
                
                if (typeof parsedResult === 'string' && parsedResult.startsWith('(object:')) {
                    return dataStore.getObject(parsedResult);
                }

                if (parsedResult.startsWith('"') && parsedResult.endsWith('"')) {
                    parsedResult = parsedResult.slice(1, -1);
                }
    
                // StringService가 있으면 매크로 파싱도 수행
                if (this.stringService && this.stringService.parseMacro) {
                    return this.stringService.parseMacro(parsedResult);
                }
                
                return parsedResult;
            } else {
                // Fallback: 기본적인 문자열 처리
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.stringService ? this.stringService.parseMacro(input) : input;
            }
        } catch (ex) {
            XCON.error('ChainingService 파싱 오류:', ex.message);
            return input || '';
        }
    }

    parseObject(owner, input) {
        try {
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                const dataStore = new window.XamongChain.DataStore(owner);
                
                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Basic');
                const result = currentParser.parse(input);
                
                XCON.log('---------------------->>>> ParseObject:', result);
                
                if (typeof result === 'string' && result.startsWith('(object:')) {
                    return dataStore.getObject(result);
                } else {
                    return result;
                }
            } else {
                // Fallback
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, returning input as-is');
                return input;
            }
        } catch (ex) {
            XCON.error('ChainingService parseObject 오류:', ex.message);
            return null;
        }
    }

    // sender를 포함한 파싱 메서드들
    parseWithSender(owner, input, sender) {
        try {
            XCON.log('🔍 ChainingService.parseWithSender 호출:', { input, owner, sender });
            XCON.log('🔍 Owner 타입:', owner?.constructor?.name);
            XCON.log('🔍 Sender 타입:', sender?.constructor?.name, 'tagName:', sender?.tagName);
            
            // XamongChain에서 DataStore와 ParserFactory 가져오기
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성 및 sender 설정
                const dataStore = new window.XamongChain.DataStore(owner);
                dataStore.setSender(sender);
                if (owner._currentAction) {
                    dataStore.setEventArgs(owner._currentAction._eventArgs);
                }

                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Smart');
                const parsedResult = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService sender 포함 파싱 결과:', { input, parsedResult });
                
                // StringService가 있으면 매크로 파싱도 수행
                if (this.stringService && this.stringService.parseMacro) {
                    return this.stringService.parseMacro(parsedResult);
                }
                
                return parsedResult;
            } else {
                // Fallback: 기본 파싱 사용
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.parse(owner, input);
            }
        } catch (ex) {
            XCON.error('ChainingService parseWithSender 오류:', ex.message);
            return input || '';
        }
    }

    parseObjectWithSender(owner, input, sender) {
        try {
            XCON.log('🔍 ChainingService.parseObjectWithSender 호출:', { input, owner, sender });
            
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성 및 sender 설정
                const dataStore = new window.XamongChain.DataStore(owner);
                dataStore.setSender(sender);
                if (owner._currentAction) {
                    dataStore.setEventArgs(owner._currentAction._eventArgs);
                }

                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Basic');
                const result = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService sender 포함 객체 파싱 결과:', { input, result });
                
                if (typeof result === 'string' && result.startsWith('(object:')) {
                    return dataStore.getObject(result);
                } else {
                    return result;
                }
            } else {
                // Fallback: 기본 파싱 사용
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.parseObject(owner, input);
            }
        } catch (ex) {
            XCON.error('ChainingService parseObjectWithSender 오류:', ex.message);
            return null;
        }
    }
    
    // EventArgs와 함께 파싱 (args 체이닝 지원)
    parseWithEventArgs(owner, input, eventArgs) {
        try {
            XCON.log('🔍 ChainingService.parseWithEventArgs 호출:', { input, owner, eventArgs });
            
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성 및 eventArgs 설정
                const dataStore = new window.XamongChain.DataStore(owner);
                dataStore.setEventArgs(eventArgs);
                
                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Smart');
                const parsedResult = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService eventArgs 포함 파싱 결과:', { input, parsedResult });
                
                // StringService가 있으면 매크로 파싱도 수행
                if (this.stringService && this.stringService.parseMacro) {
                    return this.stringService.parseMacro(parsedResult);
                }
                
                return parsedResult;
            } else {
                // Fallback: 기본 파싱 사용
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.parse(owner, input);
            }
        } catch (ex) {
            XCON.error('ChainingService parseWithEventArgs 오류:', ex.message);
            return input || '';
        }
    }
    
    // Sender와 EventArgs 모두 설정하여 파싱
    parseWithSenderAndEventArgs(owner, input, sender, eventArgs) {
        try {
            XCON.log('🔍 ChainingService.parseWithSenderAndEventArgs 호출:', { input, owner, sender, eventArgs });
            
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성 및 sender와 eventArgs 설정
                const dataStore = new window.XamongChain.DataStore(owner);
                dataStore.setSender(sender);
                dataStore.setEventArgs(eventArgs);
                
                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Smart');
                const parsedResult = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService sender+eventArgs 포함 파싱 결과:', { input, parsedResult });
                
                // StringService가 있으면 매크로 파싱도 수행
                if (this.stringService && this.stringService.parseMacro) {
                    return this.stringService.parseMacro(parsedResult);
                }
                
                return parsedResult;
            } else {
                // Fallback: 기본 파싱 사용
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.parse(owner, input);
            }
        } catch (ex) {
            XCON.error('ChainingService parseWithSenderAndEventArgs 오류:', ex.message);
            return input || '';
        }
    }
    
    // 객체의 모든 값을 sender와 eventArgs와 함께 파싱
    parseObjectWithSenderAndEventArgs(owner, input, sender, eventArgs) {
        try {
            XCON.log('🔍 ChainingService.parseObjectWithSenderAndEventArgs 호출:', { input, owner, sender, eventArgs });
            
            if (typeof window !== 'undefined' && window.XamongChain && 
                window.XamongChain.DataStore && window.XamongChain.ParserFactory) {
                
                // DataStore 생성 및 sender와 eventArgs 설정
                const dataStore = new window.XamongChain.DataStore(owner);
                dataStore.setSender(sender);
                dataStore.setEventArgs(eventArgs);
                
                const currentParser = window.XamongChain.ParserFactory.createParser(dataStore, 'Basic');
                const result = currentParser.parse(input);
                
                XCON.log('🔍 ChainingService sender+eventArgs 포함 객체 파싱 결과:', { input, result });
                
                if (typeof result === 'string' && result.startsWith('(object:')) {
                    return dataStore.getObject(result);
                } else {
                    return result;
                }
            } else {
                // Fallback: 기본 파싱 사용
                XCON.warn('XamongChain.DataStore or XamongChain.ParserFactory not available, using fallback');
                return this.parseObject(owner, input);
            }
        } catch (ex) {
            XCON.error('ChainingService parseObjectWithSenderAndEventArgs 오류:', ex.message);
            return null;
        }
    }
}

// =============================================================================
// 15. ServiceManager (서비스 관리자)
// =============================================================================
class ServiceManager {
    constructor() {
        this.serviceList = [];
        this.servicesHashtable = new Map();
        this._playerHost = null;
        this.initializeExtternalHandlers = [];
        
        // 기본 서비스들 추가 - 각 ServiceManager 인스턴스마다 새로운 서비스 인스턴스 생성
        this.addService(new ShellService(this));
        this.addService(new StringService(this));
        
        XCON.log(`New ServiceManager instance created - Services initialized: ${this.serviceList.length}`);
    }

    // Static properties and methods
    static defaultServiceManagerHash = new Map();
    static _wfHost = true;
    static initProps = false;
    static domainPath = '';
    static workDirectory = '';
    static dataDirectory = '';
    static confDirectory = '';
    static helpDirectory = '';
    static logsDirectory = '';

    static init(wfHost = true) {
        ServiceManager._wfHost = wfHost;

        if (!ServiceManager.initProps) {
            try {
                let rootPath = '';
                
                if (ServiceManager.wfHost) {
                    // 브라우저 환경
                    rootPath = window.location.origin;
                    ServiceManager.domainPath = rootPath;
                } else {
                    // Node.js 환경 (가정)
                    if (typeof process !== 'undefined' && process.cwd) {
                        rootPath = process.cwd();
                        ServiceManager.domainPath = rootPath;
                    }
                }

                // 디렉토리 경로 설정 (브라우저에서는 가상 경로)
                ServiceManager.workDirectory = rootPath + '/work/';
                ServiceManager.dataDirectory = rootPath + '/data/';
                ServiceManager.confDirectory = rootPath + '/conf/';
                ServiceManager.helpDirectory = rootPath + '/help/';
                ServiceManager.logsDirectory = rootPath + '/logs/';

            } catch (ex) {
                XCON.error('ServiceManager 초기화 오류:', ex.toString());
            }

            ServiceManager.initProps = true;
        }
    }

    static get wfHost() {
        return ServiceManager._wfHost;
    }

    static attach(host) {
        XCON.logon('#####################################################################');
        XCON.logon('# Attach                                                            #', host);
        XCON.logon('#####################################################################');

        if (!ServiceManager.defaultServiceManagerHash.has(host)) {
            // 각 PlayerHost마다 완전히 새로운 ServiceManager 인스턴스 생성
            const serviceManager = new ServiceManager();
            serviceManager.playerHost = host;
            
            // 각 PlayerHost마다 독립적인 서비스 인스턴스들 생성
            serviceManager.initializeService();
            
            ServiceManager.defaultServiceManagerHash.set(host, serviceManager);
            
            XCON.log(`New ServiceManager created for PlayerHost: ${host.getName ? host.getName() : host.toString()}`);
            XCON.log(`Total active PlayerHosts: ${ServiceManager.defaultServiceManagerHash.size}`);
        } else {
            XCON.log(`ServiceManager already exists for PlayerHost: ${host.getName ? host.getName() : host.toString()}`);
        }
    }

    static detach(host) {
        const removed = ServiceManager.defaultServiceManagerHash.delete(host);
        if (removed) {
            XCON.log(`ServiceManager detached for PlayerHost: ${host.getName ? host.getName() : host.toString()}`);
            XCON.log(`Remaining active PlayerHosts: ${ServiceManager.defaultServiceManagerHash.size}`);
        }

        XCON.log('#####################################################################');
        XCON.log('# Detach                                                            #');
        XCON.log('#####################################################################');

        return removed;
    }

    static services(host) {
        return ServiceManager.defaultServiceManagerHash.get(host);
    }

    // Directory getters
    static get domainPath() {
        return ServiceManager.domainPath;
    }

    static get workDirectory() {
        return ServiceManager.workDirectory;
    }

    static get dataDirectory() {
        return ServiceManager.dataDirectory;
    }

    static get confDirectory() {
        return ServiceManager.confDirectory;
    }

    static get helpDirectory() {
        return ServiceManager.helpDirectory;
    }

    static get logsDirectory() {
        return ServiceManager.logsDirectory;
    }

    static setWorkDirectory(workdir) {
        ServiceManager.workDirectory = workdir;
    }

    // Instance methods
    get playerHost() {
        return this._playerHost;
    }

    set playerHost(value) {
        if (value && !(value instanceof IPlayerHost)) {
            XCON.warn('PlayerHost should implement IPlayerHost interface');
        }
        this._playerHost = value;
    }

    addInitializeExternalHandler(handler) {
        this.initializeExtternalHandlers.push(handler);
    }

    removeInitializeExternalHandler(handler) {
        const index = this.initializeExtternalHandlers.indexOf(handler);
        if (index > -1) {
            this.initializeExtternalHandlers.splice(index, 1);
        }
    }

    initializeService() {
        XCON.logon(`Initializing services for PlayerHost: ${this._playerHost ? this._playerHost.getName() : 'None'}`);
        
        // PropertyService 먼저 초기화
        const propertyService = new PropertyService(this);

        const propertyInitHandler = (sender, e) => {
            propertyService.loadProperties();
        };      
        propertyService.addInitializeHandler(propertyInitHandler);

        this.addService(propertyService);

        // 다른 서비스들 추가 - 각각 새로운 인스턴스
        this.addService(new ResourceService(this));
        this.addService(new LogService(this));
        this.addService(new ApplicationService(this)); // 각 PlayerHost마다 독립적인 ApplicationService!
        this.addService(new ChainingService(this));
        this.addService(new DataService(this));
        this.addService(new RemoteService(this));
        this.addService(new AutoGenService(this));
        this.addService(new PostboxService(this));

        XCON.logon(`Total services created for this PlayerHost: ${this.serviceList.length}`);

        // 외부 초기화 핸들러들 실행
        if (this.initializeExternalHandlers) {
            this.initializeExternalHandlers.forEach(handler => {
                try {
                    handler(this, {});
                } catch (error) {
                    XCON.error('Error in external initialize handler:', error);
                }
            });
        }
        // 모든 서비스 초기화
        this.serviceList.forEach((service, index) => {
            try {
                service.initializeService();
                XCON.log(`Service ${index + 1}/${this.serviceList.length} initialized: ${service.constructor.name}`);
            } catch (error) {
                XCON.error(`Error initializing service ${service.constructor.name}:`, error);
            }
        });
        
        propertyService.removeInitializeHandler(propertyInitHandler);

        XCON.logon('#########################################################################');
        XCON.logon(`ServiceManager initialization completed for PlayerHost: ${this._playerHost ? this._playerHost.getName() : 'None'}`);
        XCON.logon('#########################################################################');
    }

    unloadAllServices() {
        this.serviceList.forEach(service => {
            try {
                service.unloadService();
            } catch (error) {
                XCON.error('Error unloading service:', error);
            }
        });
    }

    addService(service) {
        this.serviceList.push(service);
    }

    addServices(services) {
        services.forEach(service => {
            this.addService(service);
        });
    }

    isInstanceOfType(type, service) {
        if (typeof type === 'string') {
            return service.constructor.name === type || 
                   service.constructor.name === type + 'Service';
        }
        
        return service instanceof type;
    }

    getService(serviceType) {
        // 캐시에서 먼저 확인
        let cached = this.servicesHashtable.get(serviceType);
        if (cached) {
            return cached;
        }

        // 서비스 목록에서 검색
        for (const service of this.serviceList) {
            if (this.isInstanceOfType(serviceType, service)) {
                this.servicesHashtable.set(serviceType, service);
                return service;
            }
        }

        return null;
    }

    getAllServices() {
        return [...this.serviceList];
    }

    getServiceByName(name) {
        return this.serviceList.find(service => 
            service.constructor.name === name || 
            service.constructor.name === name + 'Service'
        );
    }

    hasService(serviceType) {
        return this.getService(serviceType) !== null;
    }

    removeService(serviceType) {
        const service = this.getService(serviceType);
        if (service) {
            const index = this.serviceList.indexOf(service);
            if (index > -1) {
                this.serviceList.splice(index, 1);
                this.servicesHashtable.delete(serviceType);
                
                try {
                    service.unloadService();
                } catch (error) {
                    XCON.error('Error unloading removed service:', error);
                }
                
                return true;
            }
        }
        return false;
    }
}

// =============================================================================
// 16. DefaultPlayerHost (기본 플레이어 호스트 구현)
// =============================================================================
class DefaultPlayerHost extends IPlayerHost {
    constructor(name = 'DefaultPlayerHost') {
        super();
        this.name = name;
        this.id = this.generateId();
        this.serviceManager = null;
        this.services = new Map();
    }

    getService(serviceType) {
        if (this.serviceManager) {
            return this.serviceManager.getService(serviceType);
        }
        
        // Fallback: 직접 등록된 서비스에서 찾기
        if (typeof serviceType === 'string') {
            return this.services.get(serviceType);
        }
        
        for (const [key, service] of this.services) {
            if (service instanceof serviceType) {
                return service;
            }
        }
        
        return null;
    }

    setServiceManager(serviceManager) {
        this.serviceManager = serviceManager;
    }

    registerService(name, service) {
        this.services.set(name, service);
    }

    unregisterService(name) {
        return this.services.delete(name);
    }

    getAllServices() {
        const allServices = new Map(this.services);
        
        if (this.serviceManager) {
            const managerServices = this.serviceManager.getAllServices();
            managerServices.forEach(service => {
                const name = service.constructor.name;
                if (!allServices.has(name)) {
                    allServices.set(name, service);
                }
            });
        }
        
        return allServices;
    }

    initialize() {
        super.initialize();
        XCON.log(`PlayerHost '${this.name}' initialized with ID: ${this.id}`);
    }

    dispose() {
        super.dispose();
        this.services.clear();
        this.serviceManager = null;
        XCON.log(`PlayerHost '${this.name}' disposed`);
    }
}

// =============================================================================
// 17. 전역 초기화 및 내보내기
// =============================================================================

// ServiceManager 자동 초기화
if (typeof window !== 'undefined') {
    // 브라우저 환경
    ServiceManager.init(true);
    
    // 전역 접근을 위한 window 객체에 등록
    window.XamongServices = {
        ServiceManager,
        IPlayerHost,
        DefaultPlayerHost,
        IService,
        AbstractService,
        StringService,
        ShellService,
        PropertyService,
        ResourceService,
        LogService,
        ApplicationService,
        DataService,
        RemoteService,
        AutoGenService,
        PostboxService,
        ChainingService
    };
    
    XCON.logon('#########################################################################');
    XCON.logon(`# 기본 서비스 매니저 인스턴스 생성`);
    XCON.logon('#########################################################################');

    // 기본 서비스 매니저 인스턴스 생성
    window.defaultServiceManager = new ServiceManager();
    window.defaultServiceManager.initializeService();
    
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js 환경
    ServiceManager.init(false);
    
    module.exports = {
        ServiceManager,
        IPlayerHost,
        DefaultPlayerHost,
        IService,
        AbstractService,
        StringService,
        ShellService,
        PropertyService,
        ResourceService,
        LogService,
        ApplicationService,
        DataService,
        RemoteService,
        AutoGenService,
        PostboxService,
        ChainingService
    };
}

// =============================================================================
// 18. 사용 예제 및 헬퍼 함수들
// =============================================================================

/**
 * 서비스 매니저 헬퍼 함수들
 */
class ServiceHelper {
    static createDefaultServiceManager() {
        const manager = new ServiceManager();
        manager.initializeService();
        return manager;
    }

    static getGlobalServiceManager() {
        if (typeof window !== 'undefined' && window.defaultServiceManager) {
            return window.defaultServiceManager;
        }
        return null;
    }

    static createServiceWithHost(host) {
        // host가 IPlayerHost를 구현하지 않으면 DefaultPlayerHost로 래핑
        let playerHost = host;
        if (!(host instanceof IPlayerHost)) {
            playerHost = new DefaultPlayerHost(host.name || 'WrappedHost');
            // 원본 host의 속성들을 복사
            Object.assign(playerHost, host);
        }
        
        // attach 호출 시 자동으로 새로운 ServiceManager와 서비스들이 생성됨
        ServiceManager.attach(playerHost);
        const manager = ServiceManager.services(playerHost);
        
        if (manager) {
            playerHost.setServiceManager(manager);
            XCON.log(`ServiceManager attached to PlayerHost: ${playerHost.getName()}`);
            XCON.log(`PlayerHost ${playerHost.getName()} now has ${manager.serviceList.length} services`);
        }
        
        return manager;
    }

    static createPlayerHost(name = 'CustomPlayerHost') {
        return new DefaultPlayerHost(name);
    }

    static verifyServiceIsolation() {
        XCON.log('\n=== 🔍 PlayerHost 서비스 격리 검증 ===');
        
        // 두 개의 다른 PlayerHost 생성
        const host1 = ServiceHelper.createPlayerHost('App1');
        const host2 = ServiceHelper.createPlayerHost('App2');
        
        // 각각에 대해 ServiceManager 생성
        const manager1 = ServiceHelper.createServiceWithHost(host1);
        const manager2 = ServiceHelper.createServiceWithHost(host2);
        
        // ApplicationService 인스턴스 비교
        const app1 = manager1.getService('ApplicationService');
        const app2 = manager2.getService('ApplicationService');
        
        XCON.log(`ApplicationService 인스턴스 비교:`);
        XCON.log(`  App1 ApplicationService: ${app1.constructor.name}@${app1.toString().slice(-8)}`);
        XCON.log(`  App2 ApplicationService: ${app2.constructor.name}@${app2.toString().slice(-8)}`);
        XCON.log(`  서로 다른 인스턴스인가? ${app1 !== app2 ? '✅ YES' : '❌ NO'}`);
        
        // Repository 격리 테스트
        app1.repository.set('test', 'value1');
        app2.repository.set('test', 'value2');
        
        XCON.log(`Repository 격리 테스트:`);
        XCON.log(`  App1 Repository test: "${app1.repository.get('test')}"`);
        XCON.log(`  App2 Repository test: "${app2.repository.get('test')}"`);
        XCON.log(`  Repository가 격리되었는가? ${app1.repository.get('test') !== app2.repository.get('test') ? '✅ YES' : '❌ NO'}`);
        
        // StringService 격리 테스트
        const string1 = manager1.getService('StringService');
        const string2 = manager2.getService('StringService');
        
        XCON.log(`StringService 인스턴스 비교:`);
        XCON.log(`  App1 StringService: ${string1.constructor.name}@${string1.toString().slice(-8)}`);
        XCON.log(`  App2 StringService: ${string2.constructor.name}@${string2.toString().slice(-8)}`);
        XCON.log(`  서로 다른 인스턴스인가? ${string1 !== string2 ? '✅ YES' : '❌ NO'}`);
        
        // 서비스 개수 확인
        XCON.log(`서비스 개수:`);
        XCON.log(`  App1 총 서비스: ${manager1.serviceList.length}개`);
        XCON.log(`  App2 총 서비스: ${manager2.serviceList.length}개`);
        
        // 메모리 정리
        ServiceManager.detach(host1);
        ServiceManager.detach(host2);
        
        XCON.log('=== 검증 완료 ===\n');
        
        return {
            app1, app2, string1, string2,
            repositoryIsolated: app1.repository.get('test') !== app2.repository.get('test'),
            servicesIsolated: app1 !== app2 && string1 !== string2
        };
    }

    static logServiceInfo(serviceManager) {
        const services = serviceManager.getAllServices();
        XCON.log('=== Service Manager Information ===');
        XCON.log(`Total services: ${services.length}`);
        services.forEach((service, index) => {
            XCON.log(`${index + 1}. ${service.constructor.name}`);
        });
        XCON.log('===================================');
    }
}

// 헬퍼도 전역에 등록
if (typeof window !== 'undefined') {
    window.XamongServices.ServiceHelper = ServiceHelper;
    window.XamongServices.DefaultPlayerHost = DefaultPlayerHost;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports.ServiceHelper = ServiceHelper;
    module.exports.DefaultPlayerHost = DefaultPlayerHost;
}

/**
 * 사용 예제:
 * 
 * // ✅ 서비스 격리 검증
 * const result = ServiceHelper.verifyServiceIsolation();
 * XCON.log('격리 테스트 결과:', result.servicesIsolated);
 * 
 * // ✅ IPlayerHost 구현체 생성 - 각각 독립적인 서비스들
 * const playerHost1 = ServiceHelper.createPlayerHost('MyApp1');
 * const playerHost2 = ServiceHelper.createPlayerHost('MyApp2');
 * const manager1 = ServiceHelper.createServiceWithHost(playerHost1);
 * const manager2 = ServiceHelper.createServiceWithHost(playerHost2);
 * 
 * // ✅ 각 PlayerHost의 ApplicationService는 완전히 다른 인스턴스
 * const app1 = manager1.getService('ApplicationService');
 * const app2 = manager2.getService('ApplicationService');
 * XCON.log('ApplicationService 격리됨:', app1 !== app2); // true
 * 
 * // ✅ Repository도 완전히 격리됨
 * app1.repository.set('config.theme', 'dark');
 * app2.repository.set('config.theme', 'light');
 * XCON.log('App1 theme:', app1.repository.get('config.theme')); // 'dark'
 * XCON.log('App2 theme:', app2.repository.get('config.theme')); // 'light'
 * 
 * // ✅ 체이닝 서비스도 각각 독립적
 * const chain1 = manager1.getService('ChainingService');
 * const chain2 = manager2.getService('ChainingService');
 * XCON.log('ChainingService 격리됨:', chain1 !== chain2); // true
 * 
 * // ✅ 기존 기능 완전 유지
 * const owner = { someData: 'test' };
 * const parsed1 = chain1.parse(owner, '{{someVariable._upper()}}');
 * const parsed2 = chain2.parse(owner, '{{someVariable._lower()}}');
 * 
 * // ✅ 포스트박스도 각각 독립적
 * const postbox1 = manager1.getService('PostboxService');
 * const postbox2 = manager2.getService('PostboxService');
 * 
 * postbox1.subscribe('user.login', (msg) => XCON.log('App1:', msg.data));
 * postbox2.subscribe('user.login', (msg) => XCON.log('App2:', msg.data));
 * 
 * postbox1.publish('user.login', 'User login', { app: 'App1' }); // App1에만 전달
 * postbox2.publish('user.login', 'User login', { app: 'App2' }); // App2에만 전달
 * 
 * // ✅ PlayerHost를 통한 직접 서비스 접근도 격리됨
 * const serviceFromHost1 = playerHost1.getService('LogService');
 * const serviceFromHost2 = playerHost2.getService('LogService');
 * XCON.log('LogService 격리됨:', serviceFromHost1 !== serviceFromHost2); // true
 */
