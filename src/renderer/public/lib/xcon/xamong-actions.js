/**
 * Xamong Action System - JavaScript Port
 * 자몽 액션 시스템의 JavaScript 포팅 버전
 * XCON과 연계하여 동작하는 액션 프레임워크
 */

// =============================================================================
// Helper Functions (헬퍼 함수들)
// =============================================================================

/**
 * XCON 객체 여부를 안전하게 확인하는 함수
 * 크로스 컨텍스트 환경에서도 안전하게 작동
 */
function isXCONObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    // 1. instanceof 검사 (같은 컨텍스트의 XCON)
    if (typeof XCON !== 'undefined' && obj instanceof XCON) {
        return true;
    }

    // 2. constructor.name 검사 (다른 컨텍스트의 XCON)
    if (obj.constructor && obj.constructor.name === 'XCON') {
        return true;
    }

    // 3. 메서드 존재 검사 (XCON 인터페이스)
    if (typeof obj.get === 'function' &&
        typeof obj.set === 'function' &&
        typeof obj[Symbol.iterator] === 'function') {
        return true;
    }

    // 4. 프로토타입 체인 검사
    let proto = Object.getPrototypeOf(obj);
    while (proto) {
        if (proto.constructor && proto.constructor.name === 'XCON') {
            return true;
        }
        proto = Object.getPrototypeOf(proto);
    }

    return false;
}

const XAMONG_ACTION_THEME_TOKEN_ALIAS_PATTERN = /(^|[\s(:,])@([A-Za-z_][\w-]*)(?=$|[\s),;])/g;

function expandXamongActionThemeTokenAliases(value) {
    if (value === undefined || value === null) return value;

    const publicProps =
        (typeof XamongPublicProps !== 'undefined' && XamongPublicProps) ||
        (typeof window !== 'undefined' && window.XamongPublicProps) ||
        null;

    if (publicProps && typeof publicProps.expandThemeTokenAliases === 'function') {
        return publicProps.expandThemeTokenAliases(value);
    }

    return String(value).replace(XAMONG_ACTION_THEME_TOKEN_ALIAS_PATTERN, (_match, prefix, token) => `${prefix}var(--${token})`);
}

// =============================================================================
// Action Type Enumeration
// =============================================================================
const ActionType = {
    NONE: 'none',
    NULL: 'null',
    LOG: 'log',
    CUSTOM: 'custom',
    CALL_ACTION: 'callAction',
    SLEEP: 'sleep',
    BATCH: 'batch',
    CONDITION: 'condition',
    SELECT: 'select',
    LOOP: 'loop',
    FORMULA: 'formula',
    CHAIN: 'chain',
    SCRIPT: 'script',
    CALL_API: 'callApi',
    ASYNC: 'async',
    TRY: 'try',
    ACTIVITY: 'activity',
    QUERY: 'query',
    LOAD_TABLE: 'loadTable',
    SAVE_TABLE: 'saveTable',
    SAVE_DATA: 'saveData',
    SEND_EMAIL: 'sendEmail',
    SEND_SMS: 'sendSms',
    SEND_PUSH: 'sendPush',
    ALERT: 'alert',
    TOAST: 'toast',
    MAKE_ROOT: 'makeRoot',
    GO_HOME: 'goHome',
    GO_BACK: 'goBack',
    GO_GO_BACK: 'gogoBack',
    CREATE_COMPONENTS: 'createComponents',
    TRANSITION: 'transition',
    DATE_PICKER: 'datePicker',
    IMAGE_PICKER: 'imagePicker',
    COLOR_PICKER: 'colorPicker',
    FILE_PICKER: 'filePicker',
    SOUND: 'sound',
    LAUNCH: 'launch',
    EVENT: 'event'
};

// =============================================================================
// XaAction Base Class (기본 액션 클래스)
// =============================================================================
class XaAction {
    constructor(owner) {
        this.owner = owner;
        this.target = null;
        this.applyVariables = false;
        this.success = null;
        this.failure = null;
        this.after = null;
        this.chain = [];
        this.validTest = null;
        this._index = 0;
        this.dict = null;
        this.isComponentReloadRequired = false;
        this._holderName = null;
        this._eventArgs = null;

        this.reloadComponent = false;

        // Services 초기화 - owner를 통해 실제 서비스 접근
        this.appService = this.getApplicationService();
        this.stringService = this.getStringService();
    }

    // 실제 ApplicationService 접근
    getApplicationService() {
        // ⚠️ 중요: owner의 playerHost를 통해 ServiceManager 접근 (UI 컴포넌트와 동일한 방식)
        if (this.owner && this.owner.playerHost) {
            try {
                let serviceManager = this.owner.playerHost.serviceManager;
                if (!serviceManager) {
                    serviceManager = window.XamongServices.ServiceManager.services(this.owner.playerHost);
                }
                if (serviceManager) {
                    return serviceManager.getService('ApplicationService');
                }
            } catch (e) {
                XCON.warn('owner.playerHost를 통한 ApplicationService 접근 실패:', e.message);
            }
        }

        // owner를 통해 서비스 접근 (fallback)
        if (this.owner && this.owner.serviceManager) {
            return this.owner.serviceManager.getService('ApplicationService');
        }

        // owner에 appService가 직접 있는 경우 (fallback)
        if (this.owner && this.owner.appService) {
            return this.owner.appService;
        }

        // AppHost를 통해 접근 (fallback)
        if (window.appHost && window.appHost.appService) {
            return window.appHost.appService;
        }

        // 전역 ApplicationService (fallback)
        if (window.ApplicationService) {
            return window.ApplicationService;
        }

        XCON.warn('ApplicationService를 찾을 수 없습니다. owner:', this.owner);
        return null;
    }

    // 실제 StringService 접근
    getStringService() {
        // ⚠️ 중요: owner의 playerHost를 통해 ServiceManager 접근 (UI 컴포넌트와 동일한 방식)
        if (this.owner && this.owner.playerHost) {
            try {
                let serviceManager = this.owner.playerHost.serviceManager;
                if (!serviceManager) {
                    serviceManager = window.XamongServices.ServiceManager.services(this.owner.playerHost);
                }
                if (serviceManager) {
                    return serviceManager.getService('StringService');
                }
            } catch (e) {
                XCON.warn('owner.playerHost를 통한 StringService 접근 실패:', e.message);
            }
        }

        // owner를 통해 서비스 접근 (fallback)
        if (this.owner && this.owner.serviceManager) {
            return this.owner.serviceManager.getService('StringService');
        }

        // AppHost를 통해 접근 (fallback)
        if (window.appHost && window.appHost.serviceManager) {
            return window.appHost.serviceManager.getService('StringService');
        }

        // 전역 StringService (fallback)
        if (window.StringService) {
            return window.StringService;
        }

        XCON.warn('StringService를 찾을 수 없습니다. owner:', this.owner);
        return null;
    }

    get id() { return this._id; }
    set id(value) { this._id = value; }

    get index() { return this._index; }
    set index(value) { this._index = value; }

    get dictData() { return this.dict; }
    set dictData(value) { this.dict = value; }

    get ownerController() { return this.owner; }
    set ownerController(value) { this.owner = value; }

    // 홀더 및 인자 초기화
    initAction(holder, eventArgs = null) {
        this._holderName = holder;
        if (eventArgs) {
            this._eventArgs = eventArgs;
        }
        this.initHolderAndArgs();
    }

    initHolderAndArgs() {
        if (this._holderName && this.owner) {
            if (this.owner._currentAction !== undefined) {
                this.owner._currentAction = this;
            }
        }

        // DataStore에 현재 액션의 eventArgs 설정
        if (this._eventArgs && this.owner && this.owner.chainingService) {
            this.owner.chainingService.dataStore.setEventArgs(this._eventArgs);
        }
    }

    // 평가 메서드 (하위 클래스에서 구현)
    evaluate(dict) {
        return false;
    }

    // 실행 메서드 (하위 클래스에서 구현)
    execute(sender) {
        this.executeChain(sender);
        this.log("XaAction", this.owner, sender);
    }

    // 제어 메서드들
    start() { }
    stop() { }
    pause() { }
    resume() { }

    // 체인 실행
    executeChain(sender) {
        this.initHolderAndArgs();

        if (this.chain && this.chain.length > 0) {
            this.chain.forEach(seq => {
                XCON.log(`#### SEQ : ${seq} : ${this.stringService.parseChainWithSender(this.owner, sender, seq)}`);
            });
        }
    }

    // 로그 기록
    log(message, controller, sender) {
        let cname = "";
        if (controller) {
            cname = controller.name || controller.constructor.name || "Unknown";
        }

        let oname = "";
        if (sender && sender.name) {
            oname = sender.name;
        }

        const timestamp = new Date().toLocaleTimeString();
        XCON.log(`${timestamp}> [${cname}] [${oname}] - ${message} => ${this._holderName || "null"}.${this._eventArgs || "empty"}`);

        // 액션 로그에 기록
        if (window.logAction) {
            window.logAction(message, `${cname} -> ${oname}`);
        }
    }

    // 문자열 파싱 메서드들
    parseChain(sender, input) {
        if (!input) return "";

        // XaList와 item 처리
        if (sender && sender.constructor.name === 'XaList' && input.includes("{{item.")) {
            return this.stringService.parseChainWithSender(sender, sender, input);
        } else {
            return this.stringService.parseChainWithSender(this.owner, sender, input);
        }
    }

    parseString(sender, input) {
        if (!input) return "";

        // ChainingService를 사용하여 파싱
        try {
            const chainingService = this.getChainingService();
            if (chainingService) {
                // sender와 eventArgs 모두 포함하여 파싱
                if (chainingService.parseWithSenderAndEventArgs && this._eventArgs) {
                    const result = chainingService.parseWithSenderAndEventArgs(this.owner || sender, input, sender, this._eventArgs);
                    XCON.log(`🔍 parseString (sender+eventArgs) 결과: "${input}" → "${result}"`);
                    return result;
                } else if (chainingService.parseWithEventArgs && this._eventArgs) {
                    const result = chainingService.parseWithEventArgs(this.owner || sender, input, this._eventArgs);
                    XCON.log(`🔍 parseString (eventArgs) 결과: "${input}" → "${result}"`);
                    return result;
                } else if (chainingService.parseWithSender) {
                    // sender 정보를 포함하여 파싱
                    const result = chainingService.parseWithSender(this.owner || sender, input, sender);
                    XCON.log(`🔍 parseString (sender) 결과: "${input}" → "${result}"`);
                    return result;
                } else {
                    XCON.warn('ChainingService.parseWithSender 메서드를 찾을 수 없습니다.');
                }
            }
        } catch (e) {
            XCON.warn('ChainingService parseString 오류:', e.message);
        }

        // Fallback: 기본 템플릿 파싱 로직
        if (input.includes("{{") && input.includes("}}")) {
            return this.processTemplate(input);
        }

        return input;
    }

    parseObject(sender, input) {
        if (!input) return null;

        // ChainingService를 사용하여 파싱
        try {
            const chainingService = this.getChainingService();
            if (chainingService) {
                // sender와 eventArgs 모두 포함하여 파싱
                if (chainingService.parseObjectWithSenderAndEventArgs && this._eventArgs) {
                    const result = chainingService.parseObjectWithSenderAndEventArgs(this.owner || sender, input, sender, this._eventArgs);
                    XCON.log(`🔍 parseObject (sender+eventArgs) 결과:`, { input, result });
                    return result;
                } else if (chainingService.parseObjectWithSender) {
                    // sender 정보를 포함하여 파싱
                    const result = chainingService.parseObjectWithSender(this.owner || sender, input, sender);
                    XCON.log(`🔍 parseObject (sender) 결과:`, { input, result });
                    return result;
                }
            }
        } catch (e) {
            XCON.warn('ChainingService parseObject 오류:', e.message);
        }

        // Fallback: 기존 로직
        // {{...}} 패턴을 {@...} 패턴으로 변환
        let processed = input;
        while (processed.includes("{{") && processed.includes("}}")) {
            processed = processed.replace("{{", "{@").replace("}}", "}");
        }

        // 다양한 형태의 참조 처리
        if (processed.startsWith("@")) {
            processed = "{" + processed + "}";
        }
        if (processed.startsWith("$")) {
            processed = "{@" + processed.substring(1) + "}";
        }
        if (processed.startsWith("{$")) {
            processed = "{@" + processed.substring(2) + "}";
        }

        // 정규식으로 {@...} 패턴 찾기
        const pattern = /\{\@([^\}]*)\}/g;
        let match;
        let propertyValue = null;

        while ((match = pattern.exec(processed)) !== null) {
            if (match.length > 0) {
                const token = match[0];
                const propertyName = match[1];

                if (propertyName.startsWith("record.responseData.")) {
                    propertyValue = this.appService.getAttributeWithPath(this.owner.data, propertyName);
                } else if (propertyName.startsWith("record.")) {
                    propertyValue = this.appService.getAttributeWithPath(this.owner.data, propertyName.replace("record.", "record.responseData."));
                } else if (propertyName.startsWith("parameter.")) {
                    propertyValue = this.appService.getAttributeWithPath(this.owner.parameter, propertyName.substring(10));
                } else {
                    propertyValue = this.appService.getAttributeWithPath(this.owner.data, propertyName);
                }
            }
        }

        return propertyValue || input;
    }

    // ChainingService를 가져오는 헬퍼 메서드
    getChainingService() {
        try {
            // 1. owner의 playerHost를 통해 ServiceManager 가져오기
            if (this.owner && this.owner.playerHost) {
                const serviceManager = window.XamongServices.ServiceManager.services(this.owner.playerHost);
                if (serviceManager) {
                    return serviceManager.getService('ChainingService');
                }
            }

            // 2. appService를 통해 ServiceManager 가져오기
            if (this.appService && this.appService.services) {
                return this.appService.services.getService('ChainingService');
            }

            // 3. 전역 appHost를 통해 ServiceManager 가져오기
            if (window.appHost && window.appHost.serviceManager) {
                return window.appHost.serviceManager.getService('ChainingService');
            }

            // 4. 전역 ServiceManager에서 가져오기 (fallback)
            if (typeof window.XamongServices !== 'undefined' && window.XamongServices.ServiceManager) {
                const defaultServiceManager = window.XamongServices.ServiceManager.services(window.appHost || window.playerHost);
                if (defaultServiceManager) {
                    return defaultServiceManager.getService('ChainingService');
                }
            }

            return null;
        } catch (e) {
            XCON.warn('ChainingService 가져오기 실패:', e.message);
            return null;
        }
    }

    // 템플릿 처리
    processTemplate(template) {
        if (!template) return "";

        return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
            try {
                // 체인 파싱 시도
                if (window.XamongChain && window.XamongChain.parseExpression) {
                    return window.XamongChain.parseExpression(expression, this.owner.data || {});
                }

                // 간단한 경로 파싱
                const value = this.getValueByPath(this.owner.data, expression.trim());
                return value !== undefined ? value : match;
            } catch (e) {
                XCON.warn(`Template parsing error for ${match}:`, e);
                return match;
            }
        });
    }

    // 경로로 값 가져오기
    getValueByPath(obj, path) {
        if (!obj || !path) return undefined;

        try {
            if (obj instanceof XCON) {
                return XCON.getAttributeWithPath(obj, path);
            }

            return path.split('.').reduce((current, key) => {
                return current && current[key] !== undefined ? current[key] : undefined;
            }, obj);
        } catch (e) {
            return undefined;
        }
    }

    // Dictionary와 Array 파싱
    parseDict(dict) {
        if (!dict) return new XCON();

        const newDict = new XCON();

        if (dict instanceof XCON) {
            for (const { key, value } of dict) {
                if (value instanceof XCON) {
                    newDict.set(key, this.parseDict(value));
                } else if (Array.isArray(value)) {
                    newDict.set(key, this.parseArray(value));
                } else {
                    newDict.set(key, this.stringService.parse(this.owner, value.toString()));
                }
            }
        }

        return newDict;
    }

    parseArray(array) {
        if (!Array.isArray(array)) return [];

        return array.map(item => {
            if (item instanceof XCON) {
                return this.parseDict(item);
            } else if (Array.isArray(item)) {
                return this.parseArray(item);
            } else {
                return this.stringService.parse(this.owner, item.toString());
            }
        });
    }

    // JSON 포맷팅
    prettyJson(json) {
        if (!json) return "";

        try {
            const obj = typeof json === 'string' ? JSON.parse(json) : json;
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return json.toString();
        }
    }

    // 부모 컨트롤러 찾기
    getParent() {
        if (this.target === "self") {
            return this.owner;
        }

        let parent = this.getParentByTarget(this.target);
        if (!parent) {
            parent = this.owner;
        }

        return parent;
    }

    getParentByTarget(target) {
        if (!target || target === "self") {
            return this.owner;
        } else if (target === "parent") {
            return this.owner.parentController;
        } else if (target === "parent.parent") {
            return this.owner.parentController?.parentController;
        } else if (target === "parent.parent.parent") {
            return this.owner.parentController?.parentController?.parentController;
        } else {
            // 복잡한 경로 처리
            const parts = target.split('.');
            return this.getParentByParts(this.owner, parts, 0);
        }
    }

    getParentByParts(parent, parts, index) {
        if (index >= parts.length) {
            return parent;
        }

        const part = parts[index];

        if (part === "parent") {
            return this.getParentByParts(parent.parentController, parts, index + 1);
        } else if (part === "self") {
            return this.getParentByParts(parent, parts, index + 1);
        }

        // 데이터에서 찾기
        if (parent.data && parent.data.get && parent.data.get(part)) {
            return this.getParentByParts(parent.data.get(part), parts, index + 1);
        }

        return parent;
    }


}

// =============================================================================
// Basic Action Implementations
// =============================================================================

// Null Action
class NullAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.NULL;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("NullAction", this.owner, sender);
    }
}

// Log Action
class LogAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.LOG;
        this.message = "";
        this.level = "info"; // debug, info, warning, error, fatal
        this.color = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("LogAction", this.owner, sender);

        let newMessage = this.message;

        if (this.message && (this.message.includes("{{") || this.message.includes("{@"))) {
            newMessage = this.parseString(sender, this.message);
        }

        if (this._eventArgs) {
            XCON.log(`${newMessage} -> ${this._eventArgs}`);
        } else {
            XCON.log(newMessage);
        }

        // 토스트 액션으로 변환하여 실행
        const toastXcon = new XCON();
        toastXcon.set('type', 'toast');
        toastXcon.set('message', newMessage);

        const toastAction = ActionFactory.create('toast', this.owner);
        toastAction.dict = toastXcon;
        toastAction.message = newMessage;
        toastAction.execute(sender);
    }
}

// Custom Action
class CustomAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CUSTOM;
        this.method = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("CustomAction", this.owner, sender);

        const parameters = new XCON();
        if (this.dict && this.dict.contains('parameter')) {
            const pList = this.dict.get('parameter');

            if (pList instanceof XCON) {
                for (const { key, value } of pList) {
                    const s = this.parseString(sender, value.toString());
                    if (s.startsWith("(object:")) {
                        parameters.set(key, this.parseObject(sender, value.toString()));
                    } else {
                        parameters.set(key, s);
                    }
                }
            }
        }

        const result = this.appService.appHost.doCustomAction(this.method, parameters);

        if (!this.owner.data.contains("record")) {
            this.owner.data.set("record", new XCON());
        }
        this.owner.data.get("record").set("responseData", result);

        const isSuccess = result && result.contains("_state_") && result.get("_state_").toString() === "success";

        if (isSuccess && this.success) {
            this.success._eventArgs = this._eventArgs;
            this.success.execute(sender);
        } else if (!isSuccess && this.failure) {
            this.failure._eventArgs = this._eventArgs;
            this.failure.execute(sender);
        }
    }
}

// Call Action Action
class CallActionAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CALL_ACTION;
        this.name = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("CallActionAction", this.owner, sender);

        // dict에서 action 이름 가져오기
        if (this.dict) {
            const actionName = this.dict.get ? this.dict.get('action') : this.dict.action;
            if (actionName) {
                this.name = actionName;
            }
        }

        XCON.log(`🔍 CallActionAction: 호출할 액션 이름 = "${this.name}"`);

        let parent = this.owner;
        if (this.owner.constructor.name === 'DefaultXaController') {
            parent = this.owner.parentController;
        }

        XCON.log(`🔍 CallActionAction: parent = ${parent.constructor.name}, xcon 존재 = ${!!parent.xcon}`);

        // parent.xcon에서 액션 찾기
        if (parent.xcon && parent.xcon.contains && parent.xcon.contains(this.name)) {
            XCON.log(`✅ CallActionAction: 액션 발견 - ${this.name}`);

            // parameter 처리: 호출되는 액션에서 참조할 수 있도록 parent.data에 설정
            const paramObj = this.dict ? this.dict.get('parameter') : null;
            if (paramObj instanceof XCON) {
                XCON.log(`🔧 CallActionAction: parameter 전달 시작`);
                for (const { key, value } of paramObj) {
                    const parsedValue = this.parseString(sender, value.toString());
                    parent.data.set(key, parsedValue);
                    XCON.log(`  - parameter.${key} = "${parsedValue}"`);
                }
            }

            const callObj = parent.xcon.get(this.name);
            if (Array.isArray(callObj)) {
                const batchAction = new BatchAction(this.owner);
                callObj.forEach(item => {
                    batchAction.actions.push(this.appService.evaluateAction(item, this.owner));
                });
                batchAction._eventArgs = this._eventArgs;
                batchAction.execute(sender);
            } else {
                const action = this.appService.evaluateAction(callObj, this.owner);
                action._eventArgs = this._eventArgs;
                action.execute(sender);
            }

            if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        } else {
            XCON.error(`❌ CallActionAction: 액션을 찾을 수 없습니다 - ${this.name}`);
            XCON.log(`🔍 parent.xcon 내용:`, parent.xcon);

            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        }
    }
}

// Sleep Action
class SleepAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SLEEP;
        this.duration = "1000";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SleepAction", this.owner, sender);

        let timeout = 1000;
        if (this.duration) {
            try {
                timeout = parseInt(this.parseString(sender, this.duration), 10);
            } catch (e) {
                XCON.warn("Invalid duration:", this.duration);
            }
        }

        // JavaScript에서는 실제 블로킹 sleep 대신 setTimeout 사용
        setTimeout(() => {
            XCON.log(`Sleep completed: ${timeout}ms`);
            if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        }, timeout);
    }
}

// Batch Action
class BatchAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.BATCH;
        this.mode = "queue"; // queue, parallel
        this.reloadComponent = false;
        this.actions = [];
        this.bStop = false;
        this.currentAction = null;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("BatchAction", this.owner, sender);

        try {
            if (this.mode === "parallel") {
                if (this.actions.length === 1) {
                    this.actions[0].execute(sender);
                } else if (this.actions.length > 1) {
                    // 병렬 실행 (Promise.all 사용)
                    const promises = this.actions.map(action => {
                        return new Promise((resolve) => {
                            action._eventArgs = this._eventArgs;
                            setTimeout(() => {
                                action.execute(sender);
                                resolve();
                            }, 0);
                        });
                    });

                    Promise.all(promises).then(() => {
                        XCON.log("All batch actions completed");
                    });
                }
            } else {
                // 순차 실행 (비동기 처리)
                this.executeSequentially(this.actions, sender, 0);
            }
        } finally {
            if (this.isComponentReloadRequired && this.reloadComponent) {
                // 컴포넌트 리로드 로직
                XCON.log("Component reload required");
            }
        }
    }

    /**
     * 액션들을 순차적으로 실행 (비동기 처리)
     */
    executeSequentially(actions, sender, index) {
        XCON.log(`🔍 executeSequentially 호출: index=${index}, actions.length=${actions.length}`);
        XCON.log(`🔍 중단 조건 확인: bStop=${this.bStop}, owner.isStop=${this.owner && this.owner.isStop}`);

        // 모든 액션이 완료되었거나 중단된 경우
        if (index >= actions.length || this.bStop || (this.owner && this.owner.isStop)) {
            XCON.log(`✅ BatchAction 순차 실행 완료: ${index}/${actions.length}`);
            return;
        }

        const action = actions[index];
        XCON.log(`---> BatchAction.Execute : ${action.constructor.name} (${index + 1}/${actions.length})`);

        this.currentAction = action;
        action._eventArgs = this._eventArgs;

        // SleepAction인 경우 특별 처리
        if (action instanceof SleepAction) {
            XCON.log(`⏰ SleepAction 감지: 비동기 대기 처리`);
            this.executeSleepActionAsync(action, sender, () => {
                // SleepAction 완료 후 다음 액션 실행
                this.executeSequentially(actions, sender, index + 1);
            });
        } else {
            // 일반 액션 실행
            try {
                action.execute(sender);
                // 다음 액션을 약간의 지연 후 실행 (UI 업데이트 시간 확보)
                setTimeout(() => {
                    this.executeSequentially(actions, sender, index + 1);
                }, 10);
            } catch (error) {
                XCON.error(`❌ BatchAction 실행 오류:`, error);
                // 오류가 발생해도 다음 액션 계속 실행
                setTimeout(() => {
                    this.executeSequentially(actions, sender, index + 1);
                }, 10);
            }
        }
    }

    /**
     * SleepAction을 비동기적으로 실행
     */
    executeSleepActionAsync(sleepAction, sender, callback) {
        sleepAction.executeChain(sender);
        sleepAction.log("SleepAction", sleepAction.owner, sender);

        let timeout = 1000;
        if (sleepAction.duration) {
            try {
                timeout = parseInt(sleepAction.parseString(sender, sleepAction.duration), 10);
            } catch (e) {
                XCON.warn("Invalid duration:", sleepAction.duration);
            }
        }

        XCON.log(`⏰ Sleep 시작: ${timeout}ms`);

        setTimeout(() => {
            XCON.log(`✅ Sleep 완료: ${timeout}ms`);
            if (sleepAction.success) {
                sleepAction.success._eventArgs = sleepAction._eventArgs;
                sleepAction.success.execute(sender);
            }
            // 콜백 실행 (다음 액션으로 진행)
            if (callback) {
                callback();
            }
        }, timeout);
    }

    stop() {
        this.bStop = true;
        if (this.currentAction && this.currentAction.stop) {
            this.currentAction.stop();
        }
    }

    pause() {
        if (this.currentAction && this.currentAction.pause) {
            this.currentAction.pause();
        }
    }

    resume() {
        if (this.currentAction && this.currentAction.resume) {
            this.currentAction.resume();
        }
    }
}

// Condition Action
class ConditionAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CONDITION;
        this.condition = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("ConditionAction", this.owner, sender);

        XCON.log("ConditionAction", this.dict);

        let result = false;

        if (this.condition && this.condition !== "") {
            result = this.parseString(sender, this.condition);
        } else if (this.dict && this.dict.contains('args')) {
            const args = this.dict.get('args');

            const arg1 = this.parseString(sender, args.get('arg1').toString());
            const arg2 = args.get('arg2').toString();
            const arg3 = this.parseString(sender, args.get('arg3').toString());

            XCON.log(`---> ${arg1} ${arg2} ${arg3}`);

            // 비교 연산자 처리
            switch (arg2) {
                case "eq":
                    result = (arg1 === arg3);
                    break;
                case "neq":
                    result = (arg1 !== arg3);
                    break;
                case "lt":
                    result = arg1 < arg3;
                    break;
                case "gt":
                    result = arg1 > arg3;
                    break;
                case "lteq":
                    result = arg1 <= arg3;
                    break;
                case "gteq":
                    result = arg1 >= arg3;
                    break;
                case "strlen":
                    result = (arg1.length === parseInt(arg3, 10));
                    break;
                default:
                    XCON.warn(`Unknown condition operator: ${arg2}`);
                    break;
            }
        }

        if (result) {
            if (this.then) {
                this.then._eventArgs = this._eventArgs;
                this.then.execute(sender);
            } else if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        } else if (!result) {
            if (this.else) {
                this.else._eventArgs = this._eventArgs;
                this.else.execute(sender);
            } else if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        }
    }
}

// Select Action
class SelectAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SELECT;
        this.selector = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SelectAction", this.owner, sender);

        let output = this.parseChain(sender, this.selector);
        if (!output) {
            output = this.parseString(sender, this.selector);
        }

        this.selector = output;

        if (this.cases) {
            const action = this.appService.evaluateAction(this.cases.get(this.selector), this.owner);
            if (action) {
                action._eventArgs = this._eventArgs;
                action.execute(sender);
            }
        } else if (this.dict && this.dict.contains(this.selector)) {
            const action = this.appService.evaluateAction(this.dict.get(this.selector), this.owner);
            if (action) {
                action._eventArgs = this._eventArgs;
                action.execute(sender);
            }
        } else if (this.dict && this.dict.contains('default')) {
            const action = this.appService.evaluateAction(this.dict.get('default'), this.owner);
            if (action) {
                action._eventArgs = this._eventArgs;
                action.execute(sender);
            }
        }
    }
}

// Loop Action
class LoopAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.LOOP;
        this.mode = "default"; // default, concurrency
        this.separator = "|";
        this.iterator = "";
        this.action = null;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("LoopAction", this.owner, sender);

        const parameters = new XCON();
        if (this.dict && this.dict.contains('parameter')) {
            const pList = this.dict.get('parameter');
            if (pList instanceof XCON) {
                for (const { key, value } of pList) {
                    const s = this.parseString(sender, value.toString());
                    if (s.startsWith("(object:")) {
                        parameters.set(key, this.parseObject(sender, value.toString()));
                    } else {
                        parameters.set(key, s);
                    }
                }
            }
        }

        let array = null;

        if (this.dict && this.dict.contains('each')) {
            const eachObj = this.dict.get('each');
            if (Array.isArray(eachObj)) {
                array = eachObj;
            } else if (eachObj instanceof XCON) {
                if (eachObj.contains('type') && eachObj.get('type').toString() === 'xTable') {
                    // xTable 처리
                    array = eachObj.get('rows') || [];
                } else {
                    array = Array.from(eachObj.values());
                }
            }
        } else {
            // separator와 iterator 처리
            const separator = this.separator.replace("\\r", "\r").replace("\\n", "\n") || "|";
            const iteratorValue = this.parseObject(sender, this.iterator);

            if (iteratorValue) {
                const s = iteratorValue.toString();
                const n = parseInt(s, 10);

                if (!isNaN(n)) {
                    // 숫자인 경우 1부터 n까지 배열 생성
                    array = Array.from({ length: n }, (_, i) => (i + 1).toString());
                } else {
                    // 문자열 분할
                    if (separator === "\r\n") {
                        array = s.replace("\r\n", "\n").split("\n");
                    } else {
                        array = s.split(separator);
                    }
                }
            }
        }

        if (array && array.length > 0) {
            if (array.length > 1 && this.mode === "concurrency") {
                // 병렬 처리
                this.owner.fetchedData.clear();

                const promises = array.map((item, i) => {
                    return new Promise((resolve) => {
                        const fData = new XCON();
                        fData.set('chain', i.toString());

                        if (item instanceof XCON) {
                            for (const { key, value } of item) {
                                fData.set(key, value);
                            }
                        } else {
                            fData.set('value', item);
                        }

                        this.owner.fetchedData.set(i.toString(), fData);

                        setTimeout(() => {
                            if (this.action) {
                                const actionCopy = this.appService.evaluateAction(this.action.dict, this.owner);
                                actionCopy.index = i;
                                actionCopy.execute(sender);
                            }
                            resolve();
                        }, 0);
                    });
                });

                Promise.all(promises).then(() => {
                    this.owner.fetchedData.clear();
                    XCON.log("Loop concurrency completed");
                });
            } else {
                // 순차 처리
                this.owner.fetchedData.clear();

                array.forEach((item, i) => {
                    this.owner.fetchedData.set('chain', i.toString());

                    if (item instanceof XCON) {
                        for (const { key, value } of item) {
                            this.owner.fetchedData.set(key, value);
                        }
                    } else {
                        this.owner.fetchedData.set('value', item);
                    }

                    if (this.action) {
                        this.action._eventArgs = this._eventArgs;
                        this.action.execute(sender);
                    }
                });

                this.owner.fetchedData.clear();
            }
        }
    }
}

// Script Action
class ScriptAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SCRIPT;
        this.language = "javascript";
        this.code = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("ScriptAction", this.owner, sender);

        const result = new XCON();

        try {
            if (this.language.toLowerCase() === "javascript") {
                let jsCode = this.parseString(sender, this.code);

                //
                // TODO: 아래 func를 실행하는 적절한 jsCode 예제를 아래에 만들어줘.
                //
/*
jsCode example: 

// jsCode는 함수 본문으로 실행됩니다.
// 사용 가능한 파라미터: owner, sender, XCON, result

// 예제 1: 간단한 계산 및 결과 저장
const sum = 10 + 20;
result.set('sum', sum);
result.set('message', '계산 완료');

// 예제 2: owner.data에서 데이터 읽기
const userName = owner.data.get('userName') || 'Guest';
result.set('greeting', `안녕하세요, ${userName}님!`);

// 예제 3: 비동기 작업 (async/await 사용 가능)
const loadData = async () => {
    try {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        result.set('data', JSON.stringify(data));
        result.set('status', 'success');
    } catch (error) {
        result.set('status', 'error');
        result.set('error', error.message);
    }
};
await loadData();

// 예제 4: owner.data에 데이터 저장
owner.data.set('lastExecuted', new Date().toISOString());
result.set('executed', true);

// 예제 5: XCON 객체 생성 및 사용
const tempXcon = new XCON();
tempXcon.add('key1', 'value1');
tempXcon.add('key2', 'value2');
result.set('tempData', tempXcon);

// 예제 6: sender 정보 활용
if (sender) {
    result.set('senderType', sender.type || 'unknown');
    result.set('senderKey', sender.key || 'unknown');
}

// 예제 7: 복잡한 로직 예제 (API 호출 및 데이터 처리)
const API_BASE = 'https://api.example.com';
const loadAll = async () => {
    try {
        const res1 = await fetch(`${API_BASE}/endpoint1`);
        const res2 = await fetch(`${API_BASE}/endpoint2`);
        
        if (!res1.ok || !res2.ok) {
            throw new Error('네트워크 오류');
        }
        
        const data1 = await res1.json();
        const data2 = await res2.json();
        
        // 데이터 처리
        const processed = {
            count: (data1.items || []).length + (data2.items || []).length,
            timestamp: new Date().toISOString()
        };
        
        // 결과 저장
        result.set('processed', JSON.stringify(processed));
        result.set('data1', JSON.stringify(data1));
        result.set('data2', JSON.stringify(data2));
        
        // owner.data에도 저장 가능
        owner.data.set('lastProcessed', processed.timestamp);
    } catch (err) {
        result.set('error', err.message);
        throw err; // 에러를 다시 던지면 failure 액션이 실행됨
    }
};
await loadAll();

// 주의사항:
// - result XCON 객체에 결과를 저장하면 체인에서 사용 가능
// - return 문은 사용하지 않음 (함수 본문이므로)
// - 에러를 throw하면 failure 액션이 실행됨
// - owner.data를 수정하면 전역 데이터에 반영됨

*/

                // HTML 엔티티 디코딩 (예: &amp; -> &, &lt; -> <, &gt; -> >, &quot; -> ")
                if (jsCode && typeof jsCode === 'string') {
                    // 텍스트 영역을 생성하여 HTML 엔티티 디코딩 (가장 안전한 방법)
                    const textarea = document.createElement('textarea');
                    textarea.innerHTML = jsCode;
                    jsCode = textarea.value;
                    
                    // 추가로 일반적인 HTML 엔티티 직접 치환 (textarea가 없는 환경 대비)
                    jsCode = jsCode
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&#x27;/g, "'");
                }

                // JavaScript 코드 실행
                const func = new Function('owner', 'sender', 'XCON', 'result', jsCode);
                func(this.owner, sender, XCON, result);

                result.set('_state_', 'success');
                result.set('ResultCode', 'T');
                result.set('ResultMsg', 'JavaScript execution completed');
            } else if (this.language.toLowerCase() === "python") {
                // Python은 브라우저에서 직접 실행할 수 없으므로 로그만 출력
                XCON.log("Python execution not supported in browser");
                result.set('_state_', 'failure');
                result.set('ResultCode', 'F');
                result.set('ResultMsg', 'Python execution not supported in browser');
            } else {
                // 기타 언어 처리
                XCON.log(`Unsupported language: ${this.language}`);
                result.set('_state_', 'failure');
                result.set('ResultCode', 'F');
                result.set('ResultMsg', `Unsupported language: ${this.language}`);
            }
        } catch (e) {
            XCON.error("Script execution error:", e);
            result.set('_state_', 'failure');
            result.set('ResultCode', 'F');
            result.set('ResultMsg', e.message);
        }

        const isSuccess = result.contains('_state_') && result.get('_state_').toString() === 'success';

        if (!this.owner.data.contains("record")) {
            this.owner.data.set("record", new XCON());
        }
        this.owner.data.get("record").set("responseData", result);

        if (isSuccess && this.success) {
            this.success._eventArgs = this._eventArgs;
            this.success.execute(sender);
        } else if (!isSuccess && this.failure) {
            this.failure._eventArgs = this._eventArgs;
            this.failure.execute(sender);
        }
    }
}

// Call API Action
class CallApiAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CALL_API;
        this.method = "GET";
        this.url = "";
        this.contentType = "application/json; charset=UTF-8";
        this.command = "";
        this.manager = "";
    }

    async execute(sender) {
        this.executeChain(sender);
        this.log("CallApiAction", this.owner, sender);

        const headerInfo = new XCON();

        if (this.dict && this.dict.contains('header')) {
            const header = this.dict.get('header');
            let hasContentType = false;

            if (header instanceof XCON) {
                for (const { key, value } of header) {
                    const val = this.parseString(sender, value.toString());
                    if (key.toLowerCase() === "content-type") {
                        this.contentType = val;
                        hasContentType = true;
                    }
                    headerInfo.set(key, val);
                }
            }

            if (!hasContentType) {
                headerInfo.set("Content-Type", this.contentType);
            }
        } else {
            // 헤더 정보가 없을 때 기본 Content-Type 설정
            headerInfo.set("Content-Type", this.contentType);
        }

        const newUrl = this.parseString(sender, this.url);
        XCON.log("url:", newUrl);

        try {
            let response;

            if (this.method === "GET") {
                let finalUrl = newUrl;

                if (this.dict && this.dict.contains('parameter')) {
                    const params = new URLSearchParams();
                    const parameter = this.dict.get('parameter');

                    if (parameter instanceof XCON) {
                        for (const { key, value } of parameter) {
                            params.append(key, this.parseString(sender, value.toString()));
                        }
                    }

                    finalUrl += "?" + params.toString();
                }


                const headers = {};

                if (headerInfo instanceof XCON) {
                    for (const { key, value } of headerInfo) {
                        headers[key] = value;
                    }
                }

                // JWT 토큰이 있으면 추가
                XCON.setAuthHeader(headers);

                response = await fetch(finalUrl, {
                    method: "GET",
                    headers: headers
                });
            } else if (this.method === "POST") {
                const contents = new XCON();

                if (this.dict && this.dict.contains('parameter')) {
                    const parameter = this.dict.get('parameter');
                    if (parameter instanceof XCON) {
                        for (const { key, value } of parameter) {
                            if (value instanceof XCON) {
                                contents.set(key, this.parseDict(value));
                            } else if (Array.isArray(value)) {
                                contents.set(key, this.parseArray(value));
                            } else {
                                contents.set(key, this.parseString(sender, value.toString()));
                            }
                        }
                    }
                }

                let payload;
                if (this.command) {
                    const jsonStr = this.prettyJson(contents.toJSON());
                    payload = this.command + ":" + btoa(jsonStr);
                } else {
                    payload = this.prettyJson(contents.toJSON());
                }

                const headers = {};

                if (headerInfo instanceof XCON) {
                    for (const { key, value } of headerInfo) {
                        headers[key] = value;
                    }
                }

                // JWT 토큰이 있으면 추가
                XCON.setAuthHeader(headers);

                response = await fetch(newUrl, {
                    method: "POST",
                    headers: headers,
                    body: payload
                });
            }

            const responseText = await response.text();
            console.log("API Response:", responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                let data = responseText;
                try {
                    data = btoa(responseText);
                } catch (e) {
                }
                result = {
                    _state_: response.ok ? "success" : "failure",
                    Data: data
                };
            }

            window.XCON?.logon3("result:", result);

            // 하드코딩: returnCode가 "S"이면 성공으로 처리
            const isSuccess = result && (result.success ||result._state_ === "success" || result.returnCode === "S");

            const flag = false;
            if (flag) {
                if (this.success) {
                    this.success._eventArgs = this._eventArgs;
                    this.success.execute(sender);
                }
            } else {
                if (isSuccess) {
                    let data = null;
                    try {
                        // xNode 결과 처리
                        if (result.result) {
                            const rr = result.result;
                            if (rr.action) {
                                if (rr.action === 'query') {
                                    if (rr.type === 'SELECT') {
                                        data = rr.rows;
                                    } else if (rr.type === 'INSERT') {
                                        data = rr.lastInsertRowid;
                                    } else if (rr.type === 'UPDATE') {
                                        data = rr.changes;
                                    } else if (rr.type === 'DELETE') {
                                        data = rr.changes;
                                    }
                                } else {
                                    data = rr;
                                }
                            } else {
                                data = rr;
                            }
                        } else if (result.Data) {
                            data = JSON.parse(atob(result.Data));
                        } else {
                            data = result;
                        }
                    } catch (e) {
                        data = result;
                    }

                    if (data) {
                        if (!this.owner.data.contains("record")) {
                            this.owner.data.set("record", new XCON());
                        }

                        let responseData;
                        if (typeof data === 'string') {
                            responseData = XCON.fromJSON(data);
                        } else {
                            responseData = XCON.fromJSON(JSON.stringify(data));
                        }
                        this.owner.data.get("record").set("responseData", responseData);
                    }

                    if (this.success) {
                        this.success._eventArgs = this._eventArgs;
                        this.success.execute(sender);
                    }
                } else {
                    if (this.failure) {
                        this.failure._eventArgs = this._eventArgs;
                        this.failure.execute(sender);
                    }
                }
            }
        } catch (error) {
            XCON.error("API call failed:", error);
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        } finally {
            if (this.after) {
                this.after._eventArgs = this._eventArgs;
                this.after.execute(sender);
            }
        }
    }
}

// Try Action
class TryAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.TRY;
        this.try = null;
        this.catch = null;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("TryAction", this.owner, sender);

        if (this.dict) {
            if (this.dict.contains('try')) {
                this.try = ActionFactory.createFromXCON(this.dict.get('try'), this.owner);
            }
            if (this.dict.contains('catch')) {
                this.catch = ActionFactory.createFromXCON(this.dict.get('catch'), this.owner);
            }
        }

        try {
            if (this.try != null) {
                this.try._eventArgs = this._eventArgs;
                this.try.execute(sender);
            }
        } catch (error) {
            if (this.catch != null) {
                this.catch._eventArgs = this._eventArgs;
                this.catch.execute(sender);
            }
        }
    }
}

// Alert Action
class AlertAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.ALERT;
        this.title = "";
        this.message = "";
        this.msg = "";
    }

    async execute(sender) {
        this.executeChain(sender);
        this.log("AlertAction", this.owner, sender);

        let newTitle = this.title;
        let newMessage = this.msg || this.message;

        if (this.title && (this.title.includes("{{") || this.title.includes("{@"))) {
            newTitle = this.parseString(sender, this.title);
        }
        if (newMessage && (newMessage.includes("{{") || newMessage.includes("{@"))) {
            newMessage = this.parseString(sender, newMessage);
        }

        const alertButtons = [];

        if (this.dict && (this.dict.contains ? this.dict.contains('buttons') : this.dict.buttons)) {
            const btns = this.dict.get ? this.dict.get('buttons') : this.dict.buttons;
            XCON.log('🔍 AlertAction 버튼 파싱 시작:');
            XCON.log('  - btns 타입:', typeof btns);
            XCON.log('  - btns instanceof XCON:', btns instanceof XCON);
            XCON.log('  - Array.isArray(btns):', Array.isArray(btns));
            XCON.log('  - btns:', btns);

            if (Array.isArray(btns)) {
                XCON.log('  - 배열로 처리, 길이:', btns.length);
                btns.forEach((btn, index) => {
                    XCON.log(`  - 버튼 ${index}:`, btn);
                    if (btn instanceof XCON) {
                        const title = btn.get('title') || btn.get('text') || '확인';
                        const button = {
                            title: title.toString(),
                            sender: sender,
                            action: btn.contains('action') && this.appService ? this.appService.evaluateAction(btn.get('action'), this.owner) : null
                        };
                        XCON.log(`  - 버튼 ${index} 생성:`, button.title);
                        alertButtons.push(button);
                    }
                });
            } else if (btns instanceof XCON) {
                XCON.log('  - XCON 컬렉션으로 처리');
                XCON.log('  - nameList:', btns.nameList);
                XCON.log('  - valueList:', btns.valueList);
                XCON.log('  - nameList.length:', btns.nameList ? btns.nameList.length : 'undefined');

                // XCON 컬렉션을 배열로 변환
                const buttonArray = [];
                if (btns.nameList && btns.valueList) {
                    for (let i = 0; i < btns.nameList.length; i++) {
                        buttonArray.push(btns.valueList[i]);
                    }
                } else {
                    // nameList가 없는 경우, values() 메서드 사용
                    for (const value of btns.values()) {
                        buttonArray.push(value);
                    }
                }

                XCON.log('  - buttonArray 길이:', buttonArray.length);
                buttonArray.forEach((btn, index) => {
                    XCON.log(`  - XCON 버튼 ${index}:`, btn);
                    if (btn instanceof XCON) {
                        const title = btn.get('title') || btn.get('text') || '확인';
                        const button = {
                            title: title.toString(),
                            sender: sender,
                            action: btn.contains('action') && this.appService ? this.appService.evaluateAction(btn.get('action'), this.owner) : null
                        };
                        XCON.log(`  - XCON 버튼 ${index} 생성:`, button.title);
                        alertButtons.push(button);
                    }
                });
            } else {
                XCON.log('  - 알 수 없는 버튼 타입');
            }
        }

        if (alertButtons.length === 0) {
            XCON.log('  - 버튼이 없어서 기본 확인 버튼 추가');
            alertButtons.push({
                title: "확인",
                sender: sender,
                action: null
            });
        }

        XCON.log('🔔 AlertAction 최종 버튼 개수:', alertButtons.length);
        alertButtons.forEach((btn, index) => {
            XCON.log(`  - 버튼 ${index}: ${btn.title}`);
        });

        // EventArgs 전달
        alertButtons.forEach(button => {
            if (button.action) {
                button.action._eventArgs = this._eventArgs;
            }
        });

        // ApplicationService와 appHost가 있는지 확인
        XCON.log('🔍 AlertAction 서비스 확인:');
        XCON.log('  - this.appService:', this.appService);
        XCON.log('  - this.appService.appHost:', this.appService ? this.appService.appHost : 'appService 없음');

        if (this.appService && this.appService.appHost) {
            XCON.log('✅ appService.appHost 존재, showAlert 호출');
            try {
                const result = await this.appService.appHost.showAlert(newTitle, newMessage, alertButtons, sender);
                XCON.log('🔔 Alert 결과:', result);
                // showAlert에서 이미 액션이 실행되므로 여기서는 추가 처리 불필요
            } catch (error) {
                XCON.error('Alert 실행 오류:', error);
            }
        } else {
            XCON.log('❌ appService 또는 appHost 없음, 기본 alert 사용');
            // 서비스가 없으면 기본 alert 사용
            alert(`${newTitle}\n\n${newMessage}`);
        }
    }
}

// Toast Action
class ToastAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.TOAST;
        this.message = "";
        this.delay = "2000";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("ToastAction", this.owner, sender);

        let newMessage = this.message;

        if (this.message && (this.message.includes("{{") || this.message.includes("{@"))) {
            newMessage = this.parseString(sender, this.message);
        }

        let milliseconds = 2000;
        if (this.delay) {
            try {
                milliseconds = parseInt(this.delay, 10);
            } catch (e) {
                XCON.warn("Invalid delay:", this.delay);
            }
        }

        XCON.log('🔍 ToastAction 실행 중...');
        XCON.log('  - message:', newMessage);
        XCON.log('  - delay:', milliseconds);

        // ApplicationService를 통해 AppHost에 접근
        const appService = this.getApplicationService();
        XCON.log('  - appService:', appService);

        if (appService && appService.appHost) {
            XCON.log('✅ appService.appHost로 showToast() 호출');
            appService.appHost.showToast(newMessage, milliseconds);
        } else {
            // 직접 전역 appHost 접근 시도
            if (window.appHost) {
                XCON.log('✅ window.appHost로 showToast() 호출');
                window.appHost.showToast(newMessage, milliseconds);
            } else {
                XCON.log('❌ Toast - AppHost를 찾을 수 없습니다, 콘솔 출력');
                XCON.log(`Toast: ${newMessage}`);
            }
        }
    }
}

// Navigation Actions
class MakeRootAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.MAKE_ROOT;
        this.xcon = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("MakeRootAction", this.owner, sender);

        if (!this.xcon || this.xcon.trim() === "") {
            XCON.log("MakeRootAction: xcon is empty");
            return;
        }
        
        const thisParameter = new XCON();

        if (this.dict && this.dict.contains('parameter')) {
            const parameters = this.dict.get('parameter');
            if (parameters instanceof XCON) {
                for (const { key, value } of parameters) {
                    if (key !== "this.TYPE") {
                        thisParameter.set(key, this.parseObject(sender, value.toString()));
                    }
                }
            }
        }

        if (this.appService && this.appService.appHost) {
            this.appService.appHost.makeHome(this.xcon, thisParameter);
        } else {
            XCON.log(`MakeHome: ${this.xcon}`);
        }
    }
}

class GoHomeAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.GO_HOME;
        this.refresh = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("GoHomeAction", this.owner, sender);

        // ApplicationService를 통해 AppHost에 접근
        const appService = this.getApplicationService();
        if (appService && appService.appHost) {
            appService.appHost.goHome();
        } else {
            // 직접 전역 appHost 접근 시도
            if (window.appHost) {
                window.appHost.goHome();
            } else {
                XCON.log('GoHome - AppHost를 찾을 수 없습니다');
            }
        }
    }
}

class GoBackAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.GO_BACK;
        this.refresh = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("GoBackAction", this.owner, sender);

        XCON.log('🔍 GoBackAction 실행 중...');
        XCON.log('  - this.owner:', this.owner);
        XCON.log('  - window.appHost:', window.appHost);

        // ApplicationService를 통해 AppHost에 접근
        const appService = this.getApplicationService();
        XCON.log('  - appService:', appService);

        if (appService && appService.appHost) {
            XCON.log('✅ appService.appHost로 goBack() 호출');
            appService.appHost.goBack();
        } else {
            // 직접 전역 appHost 접근 시도
            if (window.appHost) {
                XCON.log('✅ window.appHost로 goBack() 호출');
                window.appHost.goBack();
            } else {
                XCON.log('❌ GoBack - AppHost를 찾을 수 없습니다');
            }
        }
    }
}

class GoGoBackAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.GO_GO_BACK;
        this.refresh = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("GoGoBackAction", this.owner, sender);

        // ApplicationService를 통해 AppHost에 접근
        const appService = this.getApplicationService();
        if (appService && appService.appHost) {
            appService.appHost.goGoBack();
        } else {
            // 직접 전역 appHost 접근 시도
            if (window.appHost) {
                window.appHost.goGoBack();
            } else {
                XCON.log('GoGoBack - AppHost를 찾을 수 없습니다');
            }
        }
    }
}

// Formula Action
class FormulaAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.FORMULA;
        this.expr = null;
    }

    execute(sender) {
        // 기존 체인 실행 및 로깅 기능 유지
        this.executeChain(sender);
        this.log("FormulaAction", this.owner, sender);

        // 표현식 파싱 (기존 ParseString 기능 유지)
        this.expr = this.parseString(sender, this.expr);

        // AutoGenService 획득 (기존 ServiceManager 패턴 유지)
        const autogenService = this.getAutoGenService();

        // 줄바꿈 문자 제거 (기존 로직 유지)
        const cleanExpr = this.expr.replace(/\r\n/g, "").replace(/\n/g, "");

        // 수식 실행 및 결과 생성
        const result = autogenService.generate(cleanExpr);
        XCON.log(result);

        // 결과 처리 (기존 로직 완전 유지)
        this.processResult(result, sender);
    }

    /**
     * AutoGenService 획득
     * ServiceManager.Services 패턴을 JavaScript로 포팅
     */
    getAutoGenService() {
        // ServiceManager 패턴 유지
        const serviceManager = window.ServiceManager || this.createMockServiceManager();
        const services = serviceManager.getServices(this.owner.playerHost);
        return services.getService('AutoGenService') || this.createMockAutoGenService();
    }

    /**
     * Mock ServiceManager 생성 (실제 서비스가 없을 때)
     */
    createMockServiceManager() {
        return {
            getServices: (playerHost) => ({
                getService: (serviceType) => {
                    if (serviceType === 'AutoGenService') {
                        return this.createMockAutoGenService();
                    }
                    return null;
                }
            })
        };
    }

    /**
     * Mock AutoGenService 생성
     * 실제 수식 처리 기능 구현
     */
    createMockAutoGenService() {
        return {
            generate: (expression) => {
                try {
                    // 자몽체인 표현식 처리
                    if (this.isXamongChainExpression(expression)) {
                        return this.processXamongChainExpression(expression);
                    }

                    // 엑셀 함수 스타일 처리
                    if (this.isExcelFunction(expression)) {
                        return this.processExcelFunction(expression);
                    }

                    // 일반 수학 표현식 처리
                    return this.processMathExpression(expression);

                } catch (error) {
                    return `ERROR:${error.message}`;
                }
            }
        };
    }

    /**
     * 결과 처리 (기존 C# 로직 완전 유지)
     */
    processResult(result, sender) {
        let processedResult = result;

        // 따옴표 제거 (기존 로직 유지)
        if (processedResult.length > 1 &&
            processedResult.startsWith('"') &&
            processedResult.endsWith('"')) {
            processedResult = processedResult.substring(1, processedResult.length - 2);
        }

        // XCON 액션 처리 (기존 로직 유지)
        if (processedResult.startsWith("<xcon>") && processedResult.endsWith("</xcon>")) {
            this.processXconAction(processedResult, sender);
            return;
        }

        // 일반 결과 처리 (기존 로직 유지)
        this.processGeneralResult(processedResult, sender);
    }

    /**
     * XCON 액션 처리 (기존 C# 로직 유지)
     */
    processXconAction(xconString, sender) {
        const evaluatedDict = XCON.deserialize(xconString);
        const appService = this.appService || window.ApplicationService;
        const action = appService.evaluateAction(evaluatedDict, this.owner);
        action.execute(sender);
    }

    /**
     * 일반 결과 처리 (기존 C# 로직 완전 유지)
     */
    processGeneralResult(result, sender) {
        const responseData = new XCON();

        // record 초기화 (기존 로직 유지)
        if (!this.owner.data.contains("record")) {
            this.owner.data.set("record", new XCON());
        }
        this.owner.data.get("record").set("responseData", responseData);

        // 에러 처리 (기존 로직 유지)
        if (result.startsWith("ERROR:")) {
            responseData.set("_state_", "failure");
            responseData.set("ResultCode", "F");
            responseData.set("ResultMsg", result.substring(6));

            if (this.failure != null) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        } else {
            // 성공 처리 (기존 로직 유지)
            responseData.set("_state_", "success");
            responseData.set("ResultCode", "T");
            responseData.set("ResultMsg", result);

            if (this.success != null) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        }
    }

    /**
     * 자몽체인 표현식 여부 확인
     */
    isXamongChainExpression(expression) {
        return expression.includes('{{') && expression.includes('}}');
    }

    /**
     * 엑셀 함수 스타일 여부 확인
     */
    isExcelFunction(expression) {
        const excelFunctions = [
            'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'IF', 'CONCAT', 'LEFT', 'RIGHT',
            'MID', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'PASSWORD', 'RANDOM', 'NOW',
            'TODAY', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND'
        ];

        const upperExpr = expression.toUpperCase();
        return excelFunctions.some(func => upperExpr.includes(func + '('));
    }

    /**
     * 자몽체인 표현식 처리
     */
    processXamongChainExpression(expression) {
        try {
            // XamongChainParser 사용 (프로젝트 지식 기반)
            const parser = new XamongChainParser();
            parser.setDataStore(this.owner.data);
            return parser.parse(expression);
        } catch (error) {
            throw new Error(`자몽체인 표현식 처리 오류: ${error.message}`);
        }
    }

    /**
     * 엑셀 함수 처리
     */
    processExcelFunction(expression) {
        try {
            // 기본적인 엑셀 함수들 구현
            const result = this.evaluateExcelFunction(expression);
            return result.toString();
        } catch (error) {
            throw new Error(`엑셀 함수 처리 오류: ${error.message}`);
        }
    }

    /**
     * 일반 수학 표현식 처리
     */
    processMathExpression(expression) {
        try {
            // 안전한 수학 표현식 평가
            const sanitized = this.sanitizeMathExpression(expression);
            const result = Function(`"use strict"; return (${sanitized})`)();
            return result.toString();
        } catch (error) {
            throw new Error(`수학 표현식 처리 오류: ${error.message}`);
        }
    }

    /**
     * 엑셀 함수 평가
     */
    evaluateExcelFunction(expression) {
        const upperExpr = expression.toUpperCase();

        // SUM 함수
        if (upperExpr.includes('SUM(')) {
            const params = this.extractFunctionParams(expression);
            return params.reduce((sum, param) => sum + parseFloat(param), 0);
        }

        // AVG 함수
        if (upperExpr.includes('AVG(')) {
            const params = this.extractFunctionParams(expression);
            const sum = params.reduce((sum, param) => sum + parseFloat(param), 0);
            return sum / params.length;
        }

        // COUNT 함수
        if (upperExpr.includes('COUNT(')) {
            const params = this.extractFunctionParams(expression);
            return params.length;
        }

        // MAX 함수
        if (upperExpr.includes('MAX(')) {
            const params = this.extractFunctionParams(expression);
            return Math.max(...params.map(p => parseFloat(p)));
        }

        // MIN 함수
        if (upperExpr.includes('MIN(')) {
            const params = this.extractFunctionParams(expression);
            return Math.min(...params.map(p => parseFloat(p)));
        }

        // IF 함수
        if (upperExpr.includes('IF(')) {
            const params = this.extractFunctionParams(expression);
            const condition = this.evaluateCondition(params[0]);
            return condition ? params[1] : params[2];
        }

        // CONCAT 함수
        if (upperExpr.includes('CONCAT(')) {
            const params = this.extractFunctionParams(expression);
            return params.join('');
        }

        // LEFT 함수
        if (upperExpr.includes('LEFT(')) {
            const params = this.extractFunctionParams(expression);
            return params[0].substring(0, parseInt(params[1]));
        }

        // RIGHT 함수
        if (upperExpr.includes('RIGHT(')) {
            const params = this.extractFunctionParams(expression);
            const str = params[0];
            const len = parseInt(params[1]);
            return str.substring(str.length - len);
        }

        // MID 함수
        if (upperExpr.includes('MID(')) {
            const params = this.extractFunctionParams(expression);
            const str = params[0];
            const start = parseInt(params[1]) - 1; // 1-based to 0-based
            const len = parseInt(params[2]);
            return str.substring(start, start + len);
        }

        // LEN 함수
        if (upperExpr.includes('LEN(')) {
            const params = this.extractFunctionParams(expression);
            return params[0].length;
        }

        // UPPER 함수
        if (upperExpr.includes('UPPER(')) {
            const params = this.extractFunctionParams(expression);
            return params[0].toUpperCase();
        }

        // LOWER 함수
        if (upperExpr.includes('LOWER(')) {
            const params = this.extractFunctionParams(expression);
            return params[0].toLowerCase();
        }

        // TRIM 함수
        if (upperExpr.includes('TRIM(')) {
            const params = this.extractFunctionParams(expression);
            return params[0].trim();
        }

        // PASSWORD 함수
        if (upperExpr.includes('PASSWORD(')) {
            const params = this.extractFunctionParams(expression);
            const length = parseInt(params[0]) || 8;
            return this.generatePassword(length);
        }

        // RANDOM 함수
        if (upperExpr.includes('RANDOM(')) {
            const params = this.extractFunctionParams(expression);
            if (params.length === 0) {
                return Math.random();
            } else if (params.length === 1) {
                return Math.floor(Math.random() * parseInt(params[0]));
            } else {
                const min = parseInt(params[0]);
                const max = parseInt(params[1]);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        }

        // NOW 함수
        if (upperExpr.includes('NOW(')) {
            return new Date().toISOString();
        }

        // TODAY 함수
        if (upperExpr.includes('TODAY(')) {
            return new Date().toISOString().split('T')[0];
        }

        // YEAR 함수
        if (upperExpr.includes('YEAR(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getFullYear();
        }

        // MONTH 함수
        if (upperExpr.includes('MONTH(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getMonth() + 1;
        }

        // DAY 함수
        if (upperExpr.includes('DAY(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getDate();
        }

        // HOUR 함수
        if (upperExpr.includes('HOUR(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getHours();
        }

        // MINUTE 함수
        if (upperExpr.includes('MINUTE(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getMinutes();
        }

        // SECOND 함수
        if (upperExpr.includes('SECOND(')) {
            const params = this.extractFunctionParams(expression);
            return new Date(params[0]).getSeconds();
        }

        throw new Error(`지원하지 않는 함수: ${expression}`);
    }

    /**
     * 함수 파라미터 추출
     */
    extractFunctionParams(expression) {
        const match = expression.match(/\(([^)]+)\)/);
        if (!match) return [];

        const paramsStr = match[1];
        const params = paramsStr.split(',').map(p => p.trim());
        return params.map(p => p.replace(/^["']|["']$/g, '')); // 따옴표 제거
    }

    /**
     * 조건 평가
     */
    evaluateCondition(condition) {
        try {
            const sanitized = this.sanitizeMathExpression(condition);
            return Function(`"use strict"; return (${sanitized})`)();
        } catch (error) {
            return false;
        }
    }

    /**
     * 수학 표현식 정리
     */
    sanitizeMathExpression(expression) {
        // 안전한 수학 표현식만 허용
        const allowed = /^[0-9+\-*/().\s<>=!&|]+$/;
        if (!allowed.test(expression)) {
            throw new Error('허용되지 않는 문자가 포함된 표현식');
        }
        return expression;
    }

    /**
     * 패스워드 생성
     */
    generatePassword(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Chain Action
class ChainAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CHAIN;
        this.statements = [];
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("ChainAction", this.owner, sender);

        if (this.statements && this.statements.length > 0) {
            this.statements.forEach(seq => {
                XCON.log(`#### SEQ : ${seq} : ${this.stringService.parseChain(this.owner, seq)}`);
            });
        }
    }
}

// Activity Action
class ActivityAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.ACTIVITY;
        this.navigation = 'navigate'; // 'navigate' | 'swap' | 'overlay' | 'scroll_to' | 'change_to'
        this.transition = null; // 'dissolve' | 'smart_animate' | 'scroll_animate' | 'move_in' | 'move_out' | 'push' | 'slide_in' | 'slide_out' | 'none'
        this.duration = 0; // 밀리초
        this.easing = null; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-and-out' | 'ease-in-back' | 'ease-out-back' | 'ease-in-and-out-back' | 'custom-cubic-bezier' | 'custom-spring' | 'gentle' | 'quick' | 'bouncy' | 'slow'
        this.option = null; // 'x1,y1,x2,y2' | 'mass,stiffness,damping,initialVelocity'
        this.direction = null; // 'left' | 'right' | 'top' | 'bottom'
        this.matchLayers = null; // 'all' | 'current' | 'next' | 'previous'
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("ActivityAction", this.owner, sender);

        // 파라미터 처리
        const parameters = this.processParameters(sender);

        // 디버그 모드 체크
        if (this.isDebugMode()) {
            this.printDebugInfo();
        }

        // 액티비티 실행
        try {
            // appHost 확인 - 여러 경로로 접근 시도
            let appHost = null;

            // 1. appService를 통한 접근
            if (this.appService && this.appService.appHost) {
                appHost = this.appService.appHost;
            }
            // 2. 전역 appHost 접근
            else if (window.appHost) {
                appHost = window.appHost;
            }
            // 3. owner를 통한 접근
            else if (this.owner && this.owner.appHost) {
                appHost = this.owner.appHost;
            }

            if (appHost) {
                // Dict에서 xcon 속성 추출
                let activityXcon = null;
                if (this.Dict && this.Dict.contains && this.Dict.contains('xcon')) {
                    activityXcon = this.Dict.get('xcon');
                } else if (this.Dict && typeof this.Dict === 'object' && this.Dict.xcon) {
                    activityXcon = this.Dict.xcon;
                }

                if (activityXcon) {
                    // XCON 파일명 파싱 처리
                    const parsedXcon = this.parseString(sender, activityXcon);
                    XCON.log(`🎯 ActivityAction: ${parsedXcon} 실행`);
                    appHost.doActivity(parsedXcon, parameters, this.type);
                } else {
                    XCON.warn("ActivityAction: xcon 속성을 찾을 수 없습니다.", this.Dict);
                }
            } else {
                XCON.error("ActivityAction: ApplicationService 또는 appHost를 찾을 수 없습니다.");
                XCON.log("Debug info:");
                XCON.log("  - this.appService:", this.appService);
                XCON.log("  - window.appHost:", window.appHost);
                XCON.log("  - this.owner:", this.owner);
                XCON.log("  - this.owner.appHost:", this.owner ? this.owner.appHost : 'owner is null');
            }

            // 성공 처리
            if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        } catch (error) {
            XCON.error("ActivityAction 실행 오류:", error);

            // 실패 처리
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        }
    }

    /**
     * 파라미터 처리
     */
    processParameters(sender) {
        const parameters = new XCON();

        if (this.dict && this.dict.contains && this.dict.contains('parameter')) {
            const paramDict = this.dict.get('parameter');

            if (paramDict instanceof XCON) {
                for (const { key, value } of paramDict) {
                    const parsedValue = this.parseString(sender, value.toString());
                    parameters.set(key, parsedValue);
                }
            }
        }

        return parameters;
    }

    /**
     * 디버그 모드 확인
     */
    isDebugMode() {
        return window.DEBUG_MODE || false;
    }

    /**
     * 디버그 정보 출력
     */
    printDebugInfo() {
        XCON.log("=== ActivityAction Debug Info ===");
        XCON.log("Type:", this.type);
        XCON.log("Dict:", this.Dict);
        XCON.log("Owner:", this.Owner);
        XCON.log("================================");
    }

    /**
     * Dict 접근자
     */
    get Dict() {
        return this.dict;
    }

    set Dict(value) {
        this.dict = value;
    }

    /**
     * Owner 접근자
     */
    get Owner() {
        return this.owner;
    }

    set Owner(value) {
        this.owner = value;
    }
}

// Load Table Action
class LoadTableAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.LOAD_TABLE;
        this.xTable = "";
        this.isAsync = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("LoadTableAction", this.owner, sender);

        //window.APP_BASE_PATH
        //window.CURRENT_APP_NAME
        //window.appHost.appName
        //this.owner.playerHost.name
        //XCON.getAttributeWithPath(window.appHost.appService.repository, 'app.name');
        //XCON.getAttributeWithPath(this.getApplicationService().repository, 'app.name');

        const appName = window.appHost.appName;
        if (this.isAsync && this.isAsync.toString() === 'true') {
            this.loadFileContentAsync(sender, appName);
        } else {
            this.loadFileContent(sender, appName);
        }
    }

    loadFileContent(sender, appName) {
        try {
            let xcon = null;

            const useApi = true;
            if (useApi) {
                // 동기 XMLHttpRequest를 사용하여 파일 내용 가져오기
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${window.APP_HOST_URL}/api/file-content?path=${appName}/assets/database.xcon`, false); // false = 동기
                xhr.send();

                if (xhr.status !== 200) {
                    throw new Error(`파일 로드 실패: ${xhr.status} ${xhr.statusText}`);
                }

                const jsonContent = xhr.responseText;

                if (!jsonContent || jsonContent.trim() === '') {
                    throw new Error('파일 내용이 비어있습니다.');
                }

                let jsonObj;
                try {
                    jsonObj = JSON.parse(jsonContent);
                } catch (parseError) {
                    throw new Error(`JSON 파싱 실패: ${parseError.message}`);
                }

                const xconContent = jsonObj.content;

                if (!xconContent) {
                    throw new Error('XCON 내용을 찾을 수 없습니다.');
                }

                xcon = XCON.deserialize(xconContent);
            } else {
                // 동기 XMLHttpRequest를 사용하여 파일 내용 가져오기
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `/assets/apps/${appName}/assets/database.xcon`, false); // false = 동기
                xhr.send();

                if (xhr.status !== 200) {
                    throw new Error(`파일 로드 실패: ${xhr.status} ${xhr.statusText}`);
                }

                const xconContent = xhr.responseText;

                if (!xconContent || xconContent.trim() === '') {
                    throw new Error('파일 내용이 비어있습니다.');
                }

                xcon = XCON.deserialize(xconContent);
            }

            window.XCON?.logon2('database.xcon', xcon);

            const xTable = xcon.get(this.xTable);
            //window.XCON?.logon2('xTable', xTable);
            //const columns = xTable.get('columns');
            //window.XCON?.logon2('columns', columns);
            //const rows = xTable.get('rows');
            //window.XCON?.logon2('rows', rows);

            const result = new XCON();

            if (xTable) {
                result.set("_state_", 'success');
                result.set(this.xTable, xTable);
            } else {
                result.set("_state_", 'failure');
            }

            if (!this.owner.data.contains("record")) {
                this.owner.data.set("record", new XCON());
            }
            this.owner.data.get("record").set("responseData", result);

            const isSuccess = result && result.contains("_state_") && result.get("_state_").toString() === "success";

            if (isSuccess && this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            } else if (!isSuccess && this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        } catch (error) {
            XCON.error("SaveTableAction 실행 오류:", error);
        }
    }

    async loadFileContentAsync(sender, appName) {
        try {
            let xcon = null;

            const useApi = true;
            if (useApi) {
                // API를 통해 파일 내용 가져오기
                const response = await fetch(`${window.APP_HOST_URL}/api/file-content?path=${appName}/assets/database.xcon`);

                if (!response.ok) {
                    throw new Error(`파일 로드 실패: ${response.status} ${response.statusText}`);
                }

                const jsonContent = await response.text();

                if (!jsonContent || jsonContent.trim() === '') {
                    throw new Error('파일 내용이 비어있습니다.');
                }

                let jsonObj;
                try {
                    jsonObj = JSON.parse(jsonContent);
                } catch (parseError) {
                    throw new Error(`JSON 파싱 실패: ${parseError.message}`);
                }

                const xconContent = jsonObj.content;

                if (!xconContent) {
                    throw new Error('XCON 내용을 찾을 수 없습니다.');
                }

                xcon = XCON.deserialize(xconContent);
            } else {
                // 파일 내용 가져오기
                const response = await fetch(`${window.APP_HOST_URL}/assets/apps/${appName}/assets/database.xcon`);

                if (!response.ok) {
                    throw new Error(`파일 로드 실패: ${response.status} ${response.statusText}`);
                }

                const xconContent = await response.text();

                if (!xconContent || xconContent.trim() === '') {
                    throw new Error('파일 내용이 비어있습니다.');
                }

                xcon = XCON.deserialize(xconContent);
            }

            window.XCON?.logon2('database.xcon', xcon);

            const xTable = xcon.get(this.xTable);
            //window.XCON?.logon2('xTable', xTable);
            //const columns = xTable.get('columns');
            //window.XCON?.logon2('columns', columns);
            //const rows = xTable.get('rows');
            //window.XCON?.logon2('rows', rows);

            const result = new XCON();

            if (xTable) {
                result.set("_state_", 'success');
                result.set(this.xTable, xTable);
            } else {
                result.set("_state_", 'failure');
            }

            if (!this.owner.data.contains("record")) {
                this.owner.data.set("record", new XCON());
            }
            this.owner.data.get("record").set("responseData", result);

            const isSuccess = result && result.contains("_state_") && result.get("_state_").toString() === "success";

            if (isSuccess && this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            } else if (!isSuccess && this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        } catch (error) {
            XCON.error("SaveTableAction 실행 오류:", error);
        }
    }
}

// Save Table Action
class SaveTableAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SAVE_TABLE;
        this.xTable = "";
        this.tableName = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SaveTableAction", this.owner, sender);

        const appName = window.appHost.appName;
        this.saveFileContent(appName);
    }

    async saveFileContent(appName) {
        try {
            const response = await fetch(`${window.APP_HOST_URL}/api/save-file?path=${appName}/assets/database.xcon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                window.XCON.log('✅ File saved successfully:', fileTab.path);
                // TODO: Toast 알림 추가
            } else {
                throw new Error(result.error || 'Failed to save file');
            }
        } catch (error) {
            window.XCON.error('❌ Error saving file:', error);
            // TODO: 에러 알림 추가
        }
    }
}

// Save Data Action
class SaveDataAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SAVE_DATA;
        this.key = "";
        this.data = new XCON();
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SaveDataAction", this.owner, sender);

        XCON.log(`🔍 SaveDataAction 실행: target="${this.target}", key="${this.key}"`);
        XCON.log(`🔍 SaveDataAction data:`, this.data);
        XCON.log(`🔍 SaveDataAction owner:`, this.owner);

        // 대상 딕셔너리 획득
        const targetDict = this.getTargetDictionary();

        if (!targetDict) {
            XCON.error("SaveDataAction: 저장할 대상을 찾을 수 없습니다.");
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
            return;
        }

        try {
            // 키가 비어있는지 확인
            if (this.isKeyEmpty()) {
                this.saveDataDirectly(targetDict, sender);
            } else {
                this.saveDataWithKey(targetDict, sender);
            }

            // 성공 처리
            if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }
        } catch (error) {
            XCON.error("SaveDataAction 실행 오류:", error);

            // 실패 처리
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        }
    }

    /**
     * 대상 딕셔너리 획득
     */
    getTargetDictionary() {
        const appService = this.getApplicationService();

        if (this.target) {
            if (this.target === 'local') {
                // 로컬 저장소: owner의 data 사용
                if (this.owner && this.owner.data) {
                    XCON.log("SaveDataAction: 로컬 저장소 사용 (owner.data)");
                    return this.owner.data;
                } else {
                    XCON.warn("SaveDataAction: owner.data가 없습니다. 새로운 XCON 생성");
                    return new XCON();
                }
            } else if (this.target === 'global') {
                // 전역 저장소: ApplicationService.repository의 'global' 키 사용
                if (appService && appService.repository) {
                    const globalData = appService.repository.get('global');
                    if (globalData) {
                        XCON.log("SaveDataAction: 전역 저장소 사용 (repository.global)");
                        XCON.log("🔍 현재 global 저장소 내용:", globalData);
                        return globalData;
                    } else {
                        XCON.error("SaveDataAction: global 저장소가 초기화되지 않았습니다.");
                        return new XCON();
                    }
                } else {
                    XCON.error("SaveDataAction: ApplicationService 또는 repository를 찾을 수 없습니다.");
                    return new XCON();
                }
            } else {
                // 기타 target은 전역 저장소로 처리
                XCON.warn(`SaveDataAction: 알 수 없는 target '${this.target}', 전역 저장소 사용`);
                if (appService && appService.repository) {
                    const globalData = appService.repository.get('global');
                    if (globalData) {
                        return globalData;
                    } else {
                        XCON.error("SaveDataAction: global 저장소가 초기화되지 않았습니다.");
                        return new XCON();
                    }
                } else {
                    return new XCON();
                }
            }
        }

        // target이 없으면 로컬 저장소 기본 사용
        XCON.log("SaveDataAction: target이 없어 로컬 저장소 기본 사용");
        if (this.owner && this.owner.data) {
            return this.owner.data;
        }

        return new XCON();
    }

    /**
     * 키가 비어있는지 확인
     */
    isKeyEmpty() {
        return !this.key || this.key.trim() === "";
    }

    /**
     * 키 없이 직접 저장 (data 객체 전체를 저장)
     */
    saveDataDirectly(targetDict, sender) {
        try {
            // this.data의 내용을 targetDict에 복사
            if (this.data && this.data instanceof XCON) {
                for (let i = 0; i < this.data.count; i++) {
                    const key = this.data.getKey(i);
                    const value = this.data.getValue(i);
                    targetDict.set(key, value);
                    XCON.log(`SaveDataAction: 직접 저장 완료 - ${key}: ${value}`);
                }
            } else {
                XCON.warn("SaveDataAction: 저장할 데이터가 없거나 XCON이 아닙니다.");
            }
        } catch (error) {
            XCON.error("SaveDataAction: 직접 저장 중 오류:", error);
            throw error;
        }
    }

    /**
     * 키와 함께 저장 (특정 키에 data 저장)
     * data는 무조건 XCON 타입이어야 함
     */
    saveDataWithKey(targetDict, sender) {
        try {
            let parsedKey = this.parseString(sender, this.key);

            if (parsedKey.includes('.')) {
                const keyParts = parsedKey.split('.');
                for (let i = 0; i < keyParts.length - 1; i++) {
                    const key = keyParts[i];
                    if (targetDict.contains(key)) {
                        targetDict = targetDict.get(key);
                    } else {
                        targetDict.set(key, new XCON());
                    }
                }
                parsedKey = keyParts[keyParts.length - 1];
            }

            let xconData;

            if (this.data instanceof XCON) {
                xconData = this.data;
            } else if (typeof this.data === 'object' && this.data !== null) {
                // 일반 JavaScript 객체를 XCON으로 변환
                xconData = this.convertObjectToXCON(this.data);
                XCON.log(`SaveDataAction: JavaScript 객체를 XCON으로 변환 완료`);
            } else if (typeof this.data === 'string') {
                xconData = this.parseObject(sender, this.data);
                XCON.log(`SaveDataAction: 문자열을 XCON으로 변환 완료`);
            } else {
                XCON.error("SaveDataAction: data는 객체 타입이어야 합니다.");
                throw new Error("SaveDataAction: data는 객체 타입이어야 합니다.");
            }

            if (xconData && xconData instanceof XCON) {
                // XCON 데이터의 각 값을 체이닝 파싱 후 저장
                const parsedData = this.parseDataValues(xconData, sender);
                XCON.log('parsedData', parsedKey, parsedData);
                if (targetDict.contains(parsedKey)) {
                    XCON.log('parsedKey', parsedKey, 'already exists');
                    const dict = targetDict.get(parsedKey);
                    if (dict && dict instanceof XCON) {
                        for (const { key, value } of parsedData) {
                            dict.set(key, value);
                        }
                    } else {
                        XCON.warn('parsedKey', parsedKey, 'is not XCON');
                        targetDict.set(parsedKey, parsedData);
                    }
                } else {
                    targetDict.set(parsedKey, parsedData);
                }

                XCON.log(`SaveDataAction: 키 저장 완료 - ${parsedKey}: `, parsedData);
    
                // 자몽 체인에서 사용할 수 있도록 AppHost에도 저장
                this.saveToAppHost(parsedKey, parsedData);    
            } else {
                targetDict.set(parsedKey, xconData ? xconData : '');
            }
        } catch (error) {
            XCON.error("SaveDataAction: 키 저장 중 오류:", error);
            throw error;
        }
    }

    /**
     * JavaScript 객체를 XCON으로 변환
     */
    convertObjectToXCON(obj) {
        /*
        const xcon = new XCON();
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 중첩 객체인 경우 재귀적으로 변환
                xcon.set(key, this.convertObjectToXCON(value));
            } else {
                // 기본 타입은 그대로 저장
                xcon.set(key, value);
            }
        }
        
        return xcon;
        */
        return XCON.fromJSONObject(obj);
    }

    /**
     * XCON 데이터의 각 값을 체이닝 파싱
     */
    parseDataValues(xconData, sender) {
        const parsedData = new XCON();

        for (let i = 0; i < xconData.count; i++) {
            const key = xconData.getKey(i);
            const value = xconData.getValue(i);

            let parsedValue;
            if (typeof value === 'string') {
                // 문자열인 경우 체이닝 파싱 수행
                parsedValue = this.parseString(sender, value);
                XCON.log(`SaveDataAction: 체이닝 파싱 - ${key}: "${value}" → "${parsedValue}"`);
            } else if (value instanceof XCON) {
                // 중첩 XCON인 경우 재귀 파싱
                parsedValue = this.parseDataValues(value, sender);
            } else {
                // 기타 타입은 그대로 사용
                parsedValue = value;
            }

            parsedData.set(key, parsedValue);
        }

        return parsedData;
    }

    /**
     * AppHost에 데이터 저장 (자몽 체인 시스템 연동)
     * XCON 객체의 각 키-값 쌍을 개별적으로 저장하여 체인 접근 가능
     */
    saveToAppHost(key, xconValue) {
        try {
            const appService = this.getApplicationService();
            if (appService && appService.appHost && xconValue instanceof XCON) {
                const prefix = this.target === 'global' ? `global.${key}` : `local.${key}`; //${this.owner?.name || 'unknown'}. <- 이거 왜 추가했지?

                // XCON 객체의 각 키-값을 개별적으로 저장
                for (let i = 0; i < xconValue.count; i++) {
                    const subKey = xconValue.getKey(i);
                    const subValue = xconValue.getValue(i);
                    const fullPath = `${prefix}.${subKey}`;

                    appService.appHost.setData(fullPath, subValue);
                    XCON.log(`SaveDataAction: AppHost 저장 - ${fullPath}: ${subValue}`);
                }

                // 전체 XCON 객체도 저장 (중첩 구조 접근용)
                appService.appHost.setData(prefix, xconValue);
                XCON.log(`SaveDataAction: AppHost 전체 객체 저장 - ${prefix}`);
            }
        } catch (error) {
            XCON.error("SaveDataAction: AppHost 저장 중 오류:", error);
        }
    }
}

// Create Components Action
class CreateComponentsAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.CREATE_COMPONENTS;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("CreateComponentsAction", this.owner, sender);

        // 부모 컴포넌트 획득
        const parent = this.getParent();

        if (!parent) {
            XCON.error("CreateComponentsAction: 부모 컴포넌트를 찾을 수 없습니다.");
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
            return;
        }

        try {
            // XaForm인지 확인
            if (this.isXaForm(parent)) {
                XCON.log("CreateComponentsAction: XaForm에서 컴포넌트 생성");
                this.invokeComponentCreation(parent, sender);
            } else {
                XCON.log("CreateComponentsAction: 일반 컴포넌트에서 컴포넌트 생성");
                this.executeComponentCreation(parent, sender);
            }

            // 성공 처리
            if (this.success) {
                this.success._eventArgs = this._eventArgs;
                this.success.execute(sender);
            }

        } catch (error) {
            XCON.error("CreateComponentsAction 실행 오류:", error);
            this.handleComponentCreationError(parent, error, sender);
        }
    }

    /**
     * XaForm 여부 확인
     */
    isXaForm(parent) {
        return parent && (
            parent.constructor.name === 'XaForm' ||
            parent.type === 'form' ||
            (parent.element && parent.element.tagName === 'FORM')
        );
    }

    /**
     * 컴포넌트 생성 호출 (XaForm용)
     */
    invokeComponentCreation(parent, sender) {
        if (parent.invokeCreateComponents) {
            parent.invokeCreateComponents(this.dict, sender);
        } else {
            // 폴백: 직접 컴포넌트 생성
            this.executeComponentCreation(parent, sender);
        }
    }

    /**
     * 컴포넌트 생성 실행
     */
    executeComponentCreation(parent, sender) {
        if (!this.dict || !this.dict.contains('components')) {
            XCON.warn("CreateComponentsAction: 생성할 컴포넌트 정보가 없습니다.");
            return;
        }

        const components = this.dict.get('components');
        this.createComponentsFallback(parent, components, sender);
    }

    /**
     * 컴포넌트 생성 오류 처리
     */
    handleComponentCreationError(parent, error, sender) {
        XCON.error("컴포넌트 생성 중 오류 발생:", error);

        if (this.failure) {
            this.failure._eventArgs = this._eventArgs;
            this.failure.execute(sender);
        }
    }

    /**
     * 컴포넌트 생성 폴백
     */
    createComponentsFallback(parent, components, sender) {
        if (components instanceof XCON) {
            for (const { key, value } of components) {
                try {
                    this.createSingleComponent(parent, key, value, sender);
                } catch (error) {
                    XCON.error(`컴포넌트 '${key}' 생성 오류:`, error);
                }
            }
        }
    }

    /**
     * 단일 컴포넌트 생성
     */
    createSingleComponent(parent, componentKey, componentData, sender) {
        XCON.log(`컴포넌트 생성: ${componentKey}`);

        // 컴포넌트 데이터 파싱
        const parsedData = this.parseComponentData(componentData, sender);

        // 컴포넌트 생성 (실제 구현은 UI 프레임워크에 따라 다름)
        const component = this.createComponent(parsedData);

        // 부모에 추가
        this.addComponentToParent(parent, componentKey, component);

        // 생성 완료 알림
        this.notifyComponentCreated(parent, componentKey, component);
    }

    /**
     * 컴포넌트 데이터 파싱
     */
    parseComponentData(componentData, sender) {
        if (typeof componentData === 'string') {
            return this.parseString(sender, componentData);
        }

        if (componentData instanceof XCON) {
            const parsed = new XCON();
            for (const { key, value } of componentData) {
                const parsedValue = this.parseString(sender, value.toString());
                parsed.set(key, parsedValue);
            }
            return parsed;
        }

        return componentData;
    }

    /**
     * 컴포넌트 생성 (추상 메서드)
     */
    createComponent(componentData) {
        // 실제 구현은 UI 프레임워크에 따라 다름
        return {
            type: componentData.type || 'div',
            data: componentData,
            element: document.createElement(componentData.type || 'div')
        };
    }

    /**
     * 부모에 컴포넌트 추가
     */
    addComponentToParent(parent, componentKey, component) {
        if (parent.data) {
            parent.data.set(componentKey, component);
        }

        if (parent.element && component.element) {
            parent.element.appendChild(component.element);
        }
    }

    /**
     * 컴포넌트 생성 완료 알림
     */
    notifyComponentCreated(parent, componentKey, component) {
        XCON.log(`컴포넌트 '${componentKey}' 생성 완료`);

        // 이벤트 발생 (필요한 경우)
        if (window.dispatchEvent) {
            const event = new CustomEvent('componentCreated', {
                detail: {
                    parent: parent,
                    key: componentKey,
                    component: component
                }
            });
            window.dispatchEvent(event);
        }
    }

    /**
     * Dict 접근자
     */
    get Dict() {
        return this.dict;
    }

    set Dict(value) {
        this.dict = value;
    }

    /**
     * Owner 접근자
     */
    get Owner() {
        return this.owner;
    }

    set Owner(value) {
        this.owner = value;
    }
}

// Transition Action
class TransitionAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.TRANSITION;        
    }

    async execute(sender) {
        this.executeChain(sender);
        this.log("TransitionAction", this.owner, sender);

        // 부모 컴포넌트 획득
        const parent = this.getParent();

        if (!parent) {
            XCON.error("TransitionAction: 부모 컴포넌트를 찾을 수 없습니다.");
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
            return;
        }

        // 디버그 모드 확인
        if (this.isDebugMode()) {
            XCON.log("TransitionAction Debug Mode");
        }

        // 유효성 테스트 처리
        this.processValidTest();

        // 컴포넌트 처리 및 모든 트랜지션 완료 대기
        try {
            await this.processComponents(parent, sender);
            
            // 모든 트랜지션이 완료되면 success 실행
            if (this.success) {
                XCON.log("✅ TransitionAction: 모든 트랜지션 완료, success 액션 실행");
                this.success._eventArgs = this._eventArgs;
                
                // success 액션이 Promise를 반환할 수 있으므로 await 처리
                const result = this.success.execute(sender);
                if (result instanceof Promise) {
                    await result;
                }
            }
        } catch (error) {
            XCON.error("TransitionAction: 트랜지션 처리 중 오류:", error);
            if (this.failure) {
                this.failure._eventArgs = this._eventArgs;
                this.failure.execute(sender);
            }
        }
    }

    /**
     * 디버그 모드 확인
     */
    isDebugMode() {
        return window.DEBUG_MODE || false;
    }

    /**
     * 유효성 테스트 처리
     */
    processValidTest() {
        if (this.validTest && Array.isArray(this.validTest)) {
            this.validTest.forEach(valList => {
                if (valList instanceof XCON) {
                    for (const { key, value } of valList) {
                        XCON.log(`ValidTest: ${key} = ${value}`);
                    }
                }
            });
        }
    }

    /**
     * 컴포넌트들 처리 (모든 트랜지션 완료를 기다림)
     */
    async processComponents(parent, sender) {
        if (!this.dict || !this.dict.contains('components')) {
            XCON.warn("TransitionAction: 처리할 컴포넌트 정보가 없습니다.");
            // components가 없으면 즉시 완료 (다음 success 액션 실행)
            return;
        }

        const components = this.dict.get('components');
        if (!(components instanceof XCON)) {
            return;
        }

        // 컴포넌트가 비어있는지 확인
        if (components.count === 0) {
            XCON.log("TransitionAction: 처리할 컴포넌트가 없습니다.");
            return;
        }

        // 모든 컴포넌트의 트랜지션 완료를 추적하는 Promise 배열
        const transitionPromises = [];

        for (const { key, value } of components) {
            const promise = this.processComponent(parent, key, value, sender);
            if (promise instanceof Promise) {
                transitionPromises.push(promise);
            }
        }

        // 모든 트랜지션이 완료될 때까지 대기
        if (transitionPromises.length > 0) {
            XCON.log(`⏳ TransitionAction: ${transitionPromises.length}개의 트랜지션 완료 대기 중...`);
            
            // Promise.allSettled 사용: 일부 실패해도 계속 진행 (모바일 안정성 향상)
            const results = await Promise.allSettled(transitionPromises);
            
            // 실패한 트랜지션 로깅
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                XCON.warn(`⚠️ TransitionAction: ${failures.length}개의 트랜지션이 실패했습니다.`);
                failures.forEach((failure, index) => {
                    XCON.error(`  - 실패 ${index + 1}:`, failure.reason);
                });
            }
            
            XCON.log("✅ TransitionAction: 모든 트랜지션 완료 (일부 실패 포함 가능)");
        }
    }

    /**
     * 단일 컴포넌트 처리 (트랜지션 완료 Promise 반환)
     */
    async processComponent(parent, componentKey, componentData, sender) {
        XCON.log(`🔍 TransitionAction: 컴포넌트 '${componentKey}' 찾기 시작`);

        // 1. 먼저 parent.data에서 찾기
        let component = null;
        if (parent.data && parent.data.contains && parent.data.contains(componentKey)) {
            component = parent.data.get(componentKey);
            XCON.log(`✅ parent.data에서 컴포넌트 발견: ${componentKey}`);
        }

        // 2. parent.data에서 찾지 못한 경우 DOM에서 찾기
        if (!component) {
            const fullKey = `${parent.key}~${componentKey}`;
            XCON.log(`🔍 DOM 검색 시도: [data-key="${fullKey}"]`);

            let element = document.querySelector(`[data-key="${fullKey}"]`);
            if (!element) {
                // data-component-key 속성으로도 시도
                XCON.log(`🔍 DOM 검색 시도: [data-component-key="${fullKey}"]`);
                element = document.querySelector(`[data-component-key="${fullKey}"]`);
            }

            if (element) {
                // DOM 요소를 기반으로 가상 컴포넌트 객체 생성
                component = {
                    element: element,
                    key: fullKey,
                    type: element.getAttribute('data-component') || 'unknown'
                };
                XCON.log(`✅ DOM에서 컴포넌트 발견: ${fullKey}`);
            } else {
                XCON.log(`❌ DOM에서도 컴포넌트를 찾을 수 없습니다: ${fullKey}`);

                // 디버깅을 위해 실제 DOM 구조 확인
                const allElements = document.querySelectorAll('[data-key]');
                XCON.log(`🔍 DOM에 존재하는 data-key 속성들:`,
                    Array.from(allElements).map(el => el.getAttribute('data-key')));

                const allComponentKeys = document.querySelectorAll('[data-component-key]');
                XCON.log(`🔍 DOM에 존재하는 data-component-key 속성들:`,
                    Array.from(allComponentKeys).map(el => el.getAttribute('data-component-key')));

                // 패널 컴포넌트들만 별도로 확인
                const panelElements = document.querySelectorAll('[data-component="panel"]');
                XCON.log(`🔍 DOM에 존재하는 panel 컴포넌트들:`,
                    Array.from(panelElements).map(el => ({
                        key: el.getAttribute('data-component-key'),
                        visible: el.style.display !== 'none',
                        element: el
                    })));

                // loadingOverlay 관련 요소 특별 검색
                const loadingElements = document.querySelectorAll('*[data-component-key*="loading"], *[data-key*="loading"]');
                XCON.log(`🔍 loading 관련 요소들:`,
                    Array.from(loadingElements).map(el => ({
                        key: el.getAttribute('data-component-key') || el.getAttribute('data-key'),
                        tagName: el.tagName,
                        visible: el.style.display !== 'none',
                        element: el
                    })));
            }
        }

        // 3. 여전히 찾지 못한 경우 전체 DOM에서 검색
        if (!component) {
            XCON.log(`🔍 전체 DOM 검색: [data-key*="${componentKey}"]`);
            let elements = document.querySelectorAll(`[data-key*="${componentKey}"]`);

            if (elements.length === 0) {
                XCON.log(`🔍 전체 DOM 검색: [data-component-key*="${componentKey}"]`);
                elements = document.querySelectorAll(`[data-component-key*="${componentKey}"]`);
            }

            if (elements.length > 0) {
                const element = elements[0];
                component = {
                    element: element,
                    key: element.getAttribute('data-key') || element.getAttribute('data-component-key'),
                    type: element.getAttribute('data-component') || 'unknown'
                };
                XCON.log(`✅ 전체 DOM 검색에서 컴포넌트 발견: ${component.key}`);
            } else {
                XCON.log(`❌ 전체 DOM 검색에서도 컴포넌트를 찾을 수 없습니다: ${componentKey}`);

                // 4. 마지막으로 dock 래퍼 내부에서 검색
                XCON.log(`🔍 dock 래퍼 내부 검색 시도`);
                const wrapperElements = document.querySelectorAll('div[style*="position: absolute"]');
                for (const wrapper of wrapperElements) {
                    const innerElement = wrapper.querySelector(`[data-component-key*="${componentKey}"]`);
                    if (innerElement) {
                        component = {
                            element: innerElement,
                            key: innerElement.getAttribute('data-component-key'),
                            type: innerElement.getAttribute('data-component') || 'unknown'
                        };
                        XCON.log(`✅ dock 래퍼 내부에서 컴포넌트 발견: ${component.key}`);
                        break;
                    }
                }
            }
        }

        if (!component) {
            XCON.log(`❌ TransitionAction: 컴포넌트 '${componentKey}'를 찾을 수 없습니다.`);
            return Promise.resolve();
        }

        if (!this.isXaComponent(component)) {
            XCON.log(`TransitionAction: '${componentKey}'는 XaComponent가 아닙니다.`);
            return Promise.resolve();
        }

        try {
            // 컴포넌트 타입별 처리 (Promise 반환)
            if (this.isDockPanel(component)) {
                return this.processDockPanelTransition(component, componentData, sender);
            } else {
                return this.processGeneralTransition(component, componentData, sender);
            }
        } catch (error) {
            XCON.error(`컴포넌트 '${componentKey}' 트랜지션 오류:`, error);
            return Promise.resolve();
        }
    }

    /**
     * XaComponent 여부 확인
     */
    isXaComponent(obj) {
        return obj && (
            obj.constructor.name.includes('Component') ||
            obj.type === 'component' ||
            obj.element !== undefined
        );
    }

    /**
     * DockPanel 여부 확인
     */
    isDockPanel(obj) {
        return obj && (
            obj.constructor.name === 'DockPanel' ||
            obj.type === 'dockPanel' ||
            (obj.element && obj.element.classList.contains('dock-panel'))
        );
    }

    /**
     * DockPanel 트랜지션 처리 (트랜지션 완료 Promise 반환)
     */
    async processDockPanelTransition(component, componentData, sender) {
        if (!(componentData instanceof XCON)) return Promise.resolve();

        const effect = this.getEffect(componentData);
        if (effect) {
            return this.processDockPanelExpansion(component, effect);
        }
        return Promise.resolve();
    }

    /**
     * 이펙트 획득
     */
    getEffect(componentData) {
        if (componentData.contains('effect')) {
            return componentData.get('effect');
        }
        return null;
    }

    /**
     * DockPanel 확장 처리 (트랜지션 완료 Promise 반환)
     */
    async processDockPanelExpansion(component, effect) {
        if (!(effect instanceof XCON)) return Promise.resolve();

        let isExpanded = false;

        if (effect.contains('expanded')) {
            isExpanded = effect.get('expanded').toString() === 'true';
        }

        // 애니메이션 실행 및 완료 대기
        return this.animateDockPanelExpansion(component.element, isExpanded);
    }

    /**
     * 모바일 환경 감지
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && window.innerHeight <= 1024);
    }

    /**
     * DockPanel 확장 애니메이션 (트랜지션 완료 Promise 반환)
     */
    animateDockPanelExpansion(element, isExpanded) {
        if (!element) return Promise.resolve();

        const duration = 300; // 밀리초
        const isMobile = this.isMobileDevice();
        // 모바일에서는 더 긴 타임아웃 사용
        const timeoutBuffer = isMobile ? duration * 2 + 300 : duration + 100;

        return new Promise((resolve) => {
            let isResolved = false;
            const resolveOnce = () => {
                if (isResolved) return;
                isResolved = true;
                resolve();
            };

            // 변경되는 속성들 추적
            const properties = ['transform', 'opacity'];
            const completedProperties = new Set();
            let timeoutId = null;
            let rafId = null;

            // transitionend 이벤트 리스너 등록
            const handleTransitionEnd = (e) => {
                // 이벤트가 해당 요소의 트랜지션인지 확인
                if (e.target === element && e.propertyName && properties.includes(e.propertyName)) {
                    completedProperties.add(e.propertyName);
                    XCON.log(`⏳ DockPanel 트랜지션 진행: ${e.propertyName} 완료 (${completedProperties.size}/${properties.length})`);

                    // 모든 속성의 트랜지션이 완료되었는지 확인
                    if (completedProperties.size >= properties.length) {
                        cleanup();
                        XCON.log(`✅ DockPanel 트랜지션 완료: ${element.getAttribute('data-key') || 'unknown'}`);
                        resolveOnce();
                    }
                }
            };

            // 폴링 방식으로도 확인 (모바일 대응)
            const checkTransitionComplete = () => {
                if (isResolved) return;
                
                const computedStyle = window.getComputedStyle(element);
                const transition = computedStyle.transition;
                
                // transition이 'none'이거나 없으면 완료된 것으로 간주
                if (!transition || transition === 'none' || transition === 'all 0s ease 0s') {
                    cleanup();
                    XCON.log(`✅ DockPanel 트랜지션 완료 (폴링): ${element.getAttribute('data-key') || 'unknown'}`);
                    resolveOnce();
                    return;
                }
                
                rafId = requestAnimationFrame(checkTransitionComplete);
            };

            const cleanup = () => {
                element.removeEventListener('transitionend', handleTransitionEnd);
                if (timeoutId) clearTimeout(timeoutId);
                if (rafId) cancelAnimationFrame(rafId);
            };

            element.addEventListener('transitionend', handleTransitionEnd);

            // 트랜지션 시작
            if (isExpanded) {
                element.style.transition = `all ${duration}ms ease-in-out`;
                element.style.transform = 'scale(1.1)';
                element.style.opacity = '1';
            } else {
                element.style.transition = `all ${duration}ms ease-in-out`;
                element.style.transform = 'scale(0.9)';
                element.style.opacity = '0.7';
            }

            // 모바일에서는 폴링 방식도 사용
            if (isMobile) {
                // 약간의 지연 후 폴링 시작 (트랜지션이 시작된 후)
                setTimeout(() => {
                    if (!isResolved) {
                        rafId = requestAnimationFrame(checkTransitionComplete);
                    }
                }, duration / 2);
            }

            // 트랜지션이 즉시 완료되거나 이벤트가 발생하지 않을 수 있는 경우를 대비한 타임아웃
            timeoutId = setTimeout(() => {
                cleanup();
                XCON.log(`⏰ DockPanel 트랜지션 타임아웃 (${timeoutBuffer}ms 경과), 완료 처리`);
                resolveOnce();
            }, timeoutBuffer);
        });
    }

    /**
     * 일반 트랜지션 처리 (트랜지션 완료 Promise 반환)
     */
    async processGeneralTransition(component, componentData, sender) {
        XCON.log(`🎬 일반 트랜지션 처리 시작:`, component.key || component.type);

        if (!(componentData instanceof XCON)) {
            XCON.log(`❌ componentData가 XCON이 아닙니다:`, componentData);
            return Promise.resolve();
        }

        const transitionPromises = [];

        // visible 속성 직접 처리
        if (componentData.contains('visible')) {
            const visible = componentData.get('visible');
            const boolValue = visible === 'true' || visible === true;
            XCON.log(`👁️ visible 속성 변경: ${component.key} → ${boolValue}`);
            const visibilityPromise = this.setComponentVisibility(component, boolValue);
            if (visibilityPromise instanceof Promise) {
                transitionPromises.push(visibilityPromise);
            }
        }

        // effect 속성 처리
        const effect = this.getEffect(componentData);
        if (effect) {
            XCON.log(`🎨 effect 처리:`, effect);
            try {
                // UI 업데이트 호출 및 트랜지션 완료 대기
                const effectPromise = new Promise((resolve) => {
                    this.invokeUIUpdate(() => {
                        const promise = this.applyTransitionEffect(component, effect, componentData, sender);
                        if (promise instanceof Promise) {
                            promise.then(resolve);
                        } else {
                            resolve();
                        }
                    });
                });
                transitionPromises.push(effectPromise);
            } catch (error) {
                XCON.error("일반 트랜지션 처리 오류:", error);
            }
        }

        // 모든 트랜지션이 완료될 때까지 대기
        if (transitionPromises.length > 0) {
            await Promise.all(transitionPromises);
        }

        XCON.log(`✅ 일반 트랜지션 처리 완료: ${component.key || component.type}`);
        return Promise.resolve();
    }

    /**
     * 트랜지션 이펙트 적용 (트랜지션 완료 Promise 반환)
     */
    async applyTransitionEffect(component, effect, componentData, sender) {
        if (!(effect instanceof XCON)) return Promise.resolve();

        const transitionPromises = [];

        //
        // TODO: endPos외 나머지 속성도 duration에 따른 애니메이션 처리 필요
        //

        // 가시성 설정
        if (effect.contains('hidden')) {
            const hidden = effect.get('hidden').toString() === 'true';
            const visibilityPromise = this.setComponentVisibility(component, !hidden);
            if (visibilityPromise instanceof Promise) {
                transitionPromises.push(visibilityPromise);
            }
        }

        // 위치 애니메이션
        if (effect.contains('endPos')) {
            const endPosStr = effect.get('endPos').toString();
            const rect = this.parseRectangle(endPosStr);
            if (rect) {
                const positionPromise = this.processEndPositionAnimation(component, effect, rect);
                if (positionPromise instanceof Promise) {
                    transitionPromises.push(positionPromise);
                }
            }
        }

        this.setComponentProperty(component, effect, componentData, 'bgColor');
        this.setComponentProperty(component, effect, componentData, 'fgColor');
        this.setComponentProperty(component, effect, componentData, 'text');
        this.setComponentProperty(component, effect, componentData, 'border');
        this.setComponentProperty(component, effect, componentData, 'round');
        this.setComponentProperty(component, effect, componentData, 'image');

        // 모든 트랜지션이 완료될 때까지 대기
        if (transitionPromises.length > 0) {
            await Promise.all(transitionPromises);
        }

        return Promise.resolve();
    }

    /**
     * UI 업데이트 호출
     */
    invokeUIUpdate(callback) {
        if (typeof callback === 'function') {
            // 다음 프레임에서 실행
            requestAnimationFrame(callback);
        }
    }

    /**
     * 컴포넌트 가시성 설정 (트랜지션 완료 Promise 반환)
     */
    setComponentVisibility(component, visible) {
        if (!component.element) {
            XCON.log(`❌ 컴포넌트 element가 없습니다:`, component);
            return Promise.resolve();
        }

        XCON.log(`🎭 가시성 설정: ${component.key} → ${visible}`);

        // display 변경은 즉시이므로 Promise로 즉시 resolve
        // 단, opacity나 visibility 트랜지션이 있는 경우를 대비
        return new Promise((resolve) => {
            // 원래 display 스타일 저장/복원
            if (visible) {
                // 보이기
                const originalDisplay = component.element.getAttribute('data-original-display');
                if (originalDisplay) {
                    component.element.style.display = originalDisplay;
                } else {
                    // 기본값 설정 (패널은 보통 block이나 flex)
                    const computedStyle = window.getComputedStyle(component.element);
                    const currentDisplay = computedStyle.display;
                    if (currentDisplay === 'none') {
                        component.element.style.display = 'block';
                    } else {
                        component.element.style.display = currentDisplay;
                    }
                }
                component.element.style.opacity = '1';
                component.element.style.visibility = 'visible';
                XCON.log(`✅ 컴포넌트 표시: ${component.key}`);
            } else {
                // 숨기기 전에 원래 display 스타일 저장
                const currentDisplay = window.getComputedStyle(component.element).display;
                if (currentDisplay !== 'none') {
                    component.element.setAttribute('data-original-display', currentDisplay);
                }

                component.element.style.display = 'none';
                component.element.style.opacity = '0';
                component.element.style.visibility = 'hidden';
                XCON.log(`✅ 컴포넌트 숨김: ${component.key}`);
            }

            // display 변경은 즉시이므로 다음 프레임에서 resolve
            // 모바일에서는 추가 지연
            const delay = this.isMobileDevice() ? 2 : 1;
            let frameCount = 0;
            const checkFrame = () => {
                frameCount++;
                if (frameCount >= delay) {
                    resolve();
                } else {
                    requestAnimationFrame(checkFrame);
                }
            };
            requestAnimationFrame(checkFrame);
        });
    }

    /**
     * 끝 위치 애니메이션 처리 (트랜지션 완료 Promise 반환)
     */
    processEndPositionAnimation(component, effect, rect) {
        if (!component.element) return Promise.resolve();

        const duration = effect.contains('duration') ?
            parseFloat(effect.get('duration').toString()) * 1000 : 300;

        // easing 파싱: 문자열 또는 객체 형태 지원
        let easingType = 'linear';
        let easingParams = {};
        
        if (effect.contains('easing')) {
            const easingValue = effect.get('easing');
            
            if (typeof easingValue === 'string') {
                // 문자열 형태: 'linear', 'ease-in' 등
                easingType = easingValue;
                if (easingType === 'custom-cubic-bezier' && effect.contains('option')) {
                    const bezier = effect.get('option');
                    const bezierArray = bezier.split(',');
                    easingParams = {
                        x1: parseFloat(bezierArray[0]),
                        y1: parseFloat(bezierArray[1]),
                        x2: parseFloat(bezierArray[2]),
                        y2: parseFloat(bezierArray[3])
                    };
                } else  if (easingType === 'custom-spring' && effect.contains('option')) {
                    const spring = effect.get('option');
                    const springArray = spring.split(',');
                    easingParams = {
                        mass: parseFloat(springArray[0]),
                        stiffness: parseFloat(springArray[1]),
                        damping: parseFloat(springArray[2])
                    };
                }
            } else if (easingValue instanceof XCON) {
                // XCON 객체 형태: Figma 스타일
                //easingType = easingValue.contains('type') ? 
                //    easingValue.get('type').toString().toLowerCase().replace(/_/g, '-') : 'linear';
                easingType = easingValue.contains('type') ? easingValue.get('type').toString() : 'linear';

                // CUSTOM_CUBIC_BEZIER 파라미터 추출 easingFunctionCubicBezier
                if (easingType === 'custom-cubic-bezier' && easingValue.contains('option')) {
                    const bezier = easingValue.get('option');
                    if (bezier instanceof XCON) {
                        easingParams = {
                            x1: bezier.contains('x1') ? parseFloat(bezier.get('x1').toString()) : 0.42,
                            y1: bezier.contains('y1') ? parseFloat(bezier.get('y1').toString()) : 0,
                            x2: bezier.contains('x2') ? parseFloat(bezier.get('x2').toString()) : 0.58,
                            y2: bezier.contains('y2') ? parseFloat(bezier.get('y2').toString()) : 1
                        };
                    } else {
                        const bezierArray = bezier.split(',');
                        easingParams = {
                            x1: parseFloat(bezierArray[0]),
                            y1: parseFloat(bezierArray[1]),
                            x2: parseFloat(bezierArray[2]),
                            y2: parseFloat(bezierArray[3])
                        };
                    }
                } else 
                // CUSTOM_SPRING 파라미터 추출 easingFunctionSpring
                if (easingType === 'custom-spring' && easingValue.contains('option')) {
                    const spring = easingValue.get('option');
                    if (spring instanceof XCON) {
                        easingParams = {
                            mass: spring.contains('mass') ? parseFloat(spring.get('mass').toString()) : 1,
                            stiffness: spring.contains('stiffness') ? parseFloat(spring.get('stiffness').toString()) : 100,
                            damping: spring.contains('damping') ? parseFloat(spring.get('damping').toString()) : 10
                        };
                    } else {
                        const springArray = spring.split(',');
                        easingParams = {
                            mass: parseFloat(springArray[0]),
                            stiffness: parseFloat(springArray[1]),
                            damping: parseFloat(springArray[2])
                        };
                    }
                }
            }
        }

        // Cubic Bezier 계산 함수 (Newton-Raphson 방법 사용)
        const cubicBezier = (x1, y1, x2, y2) => {
            // Bezier 곡선의 x(t)를 계산
            const bezierX = (t) => {
                const mt = 1 - t;
                return 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t;
            };
            
            // Bezier 곡선의 y(t)를 계산
            const bezierY = (t) => {
                const mt = 1 - t;
                return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t;
            };
            
            // x(t)의 미분 (Newton-Raphson을 위한 도함수)
            const bezierXDerivative = (t) => {
                const mt = 1 - t;
                return 3 * mt * mt * x1 + 6 * mt * t * (x2 - x1) + 3 * t * t * (1 - x2);
            };
            
            // 주어진 x에 대해 t를 찾기 (Newton-Raphson)
            const findT = (x) => {
                if (x <= 0) return 0;
                if (x >= 1) return 1;
                
                // 초기 추정값 (이분법으로 시작)
                let t = x;
                for (let i = 0; i < 8; i++) {
                    const xAtT = bezierX(t);
                    const diff = xAtT - x;
                    if (Math.abs(diff) < 0.0001) break;
                    
                    const derivative = bezierXDerivative(t);
                    if (Math.abs(derivative) < 0.0001) {
                        // 도함수가 0에 가까우면 이분법 사용
                        if (xAtT > x) {
                            t = t - (t - 0) / 2;
                        } else {
                            t = t + (1 - t) / 2;
                        }
                    } else {
                        t = t - diff / derivative;
                    }
                    t = Math.max(0, Math.min(1, t)); // 0~1 범위로 제한
                }
                return t;
            };
            
            return (t) => {
                const tValue = findT(t);
                return bezierY(tValue);
            };
        };

        // 스프링 물리 시뮬레이션 함수
        const springEasing = (mass, stiffness, damping, durationMs) => {
            // 스프링 상수 계산
            const k = stiffness;
            const c = damping;
            const m = mass;
            
            // 감쇠 비율 계산
            const zeta = c / (2 * Math.sqrt(k * m)); // 감쇠 비율
            
            // 고유 진동수 (rad/s)
            const omega0 = Math.sqrt(k / m);
            
            // duration을 초 단위로 변환
            const durationSec = durationMs / 1000;
            
            // 스프링 응답 계산
            return (t) => {
                if (t <= 0) return 0;
                if (t >= 1) return 1;
                
                // 정규화된 시간(0~1)을 실제 시간(초)으로 변환
                const actualTime = t * durationSec;
                
                if (zeta < 1) {
                    // 미흡 감쇠 (Underdamped): 진동하면서 수렴
                    const omega = omega0 * Math.sqrt(1 - zeta * zeta); // 감쇠 진동수
                    const A = 1;
                    const phi = Math.atan2(omega, zeta * omega0);
                    const response = 1 - A * Math.exp(-zeta * omega0 * actualTime) * 
                        Math.cos(omega * actualTime - phi) / Math.cos(phi);
                    return Math.max(0, Math.min(1, response));
                } else if (Math.abs(zeta - 1) < 0.001) {
                    // 임계 감쇠 (Critically damped)
                    const response = 1 - (1 + omega0 * actualTime) * Math.exp(-omega0 * actualTime);
                    return Math.max(0, Math.min(1, response));
                } else {
                    // 과도 감쇠 (Overdamped)
                    const sqrtTerm = Math.sqrt(zeta * zeta - 1);
                    const r1 = -zeta * omega0 + omega0 * sqrtTerm;
                    const r2 = -zeta * omega0 - omega0 * sqrtTerm;
                    const A = (r2) / (r2 - r1);
                    const B = 1 - A;
                    const response = 1 - (A * Math.exp(r1 * actualTime) + B * Math.exp(r2 * actualTime));
                    return Math.max(0, Math.min(1, response));
                }
            };
        };

        // Easing 함수 정의
        const getEasingFunction = (type, params, durationMs) => {
            switch (type) {
                case 'linear':
                    return (t) => t;
                
                case 'ease-in':
                    return (t) => t * t * t;
                
                case 'ease-out':
                    return (t) => 1 - Math.pow(1 - t, 3);
                
                case 'ease-in-and-out':
                    return (t) => {
                        return t < 0.5 
                            ? 4 * t * t * t 
                            : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    };
                
                case 'ease-in-back': {
                    const c1 = 1.70158;
                    const c3 = c1 + 1;
                    return (t) => c3 * t * t * t - c1 * t * t;
                }
                
                case 'ease-out-back': {
                    const c1 = 1.70158;
                    const c3 = c1 + 1;
                    return (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                }
                
                case 'ease-in-and-out-back': {
                    const c1 = 1.70158;
                    const c2 = c1 * 1.525;
                    return (t) => {
                        return t < 0.5
                            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
                    };
                }
                
                case 'custom-cubic-bezier': {
                    // 파라미터가 있으면 사용, 없으면 기본값
                    const x1 = params.x1 !== undefined ? params.x1 : 0.42;
                    const y1 = params.y1 !== undefined ? params.y1 : 0;
                    const x2 = params.x2 !== undefined ? params.x2 : 0.58;
                    const y2 = params.y2 !== undefined ? params.y2 : 1;
                    return cubicBezier(x1, y1, x2, y2);
                }
                
                case 'custom-spring': {
                    // 파라미터가 있으면 사용, 없으면 기본값
                    const mass = params.mass !== undefined ? params.mass : 1;
                    const stiffness = params.stiffness !== undefined ? params.stiffness : 100;
                    const damping = params.damping !== undefined ? params.damping : 10;
                    return springEasing(mass, stiffness, damping, duration);
                }
                
                case 'gentle': {
                    // 부드럽고 자연스러운 애니메이션: 느린 시작과 느린 끝
                    return (t) => {
                        return t < 0.5
                            ? 2 * t * t * (3 - 2 * t)
                            : 1 - Math.pow(-2 * t + 2, 2) / 2;
                           // t * t * t * (t * (t * 6 - 15) + 10);
                    };
                }
                
                case 'quick':
                    return (t) => 1 - Math.pow(1 - t, 4);
                
                case 'bouncy': {
                    const bounces = params.bounces !== undefined ? params.bounces : 3;
                    const bounceStrength = params.bounceStrength !== undefined ? params.bounceStrength : 0.3;
                    return (t) => {
                        if (t < 1) {
                            const base = 1 - Math.pow(1 - t, 3);
                            const bounce = Math.sin(t * Math.PI * bounces) * bounceStrength * (1 - t);
                            return Math.min(1, base + bounce);
                        }
                        return 1;
                    };
                }
                
                case 'slow':
                    return (t) => {
                        return t < 0.5
                            ? 0.5 * Math.pow(2 * t, 3)
                            : 0.5 * (Math.pow(2 * t - 2, 3) + 2);
                    };
                
                default:
                    return (t) => t; // 기본값: linear
            }
        };

        const element = component.element;
        const isMobile = this.isMobileDevice();
        
        // easing 함수 가져오기
        const easingFunc = getEasingFunction(easingType, easingParams, duration);
        
        // 초기 위치 저장
        const startRect = {
            left: parseFloat(element.style.left) || element.offsetLeft,
            top: parseFloat(element.style.top) || element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight
        };
        
        // 목표 위치와의 차이 계산
        const delta = {
            left: rect.x - startRect.left,
            top: rect.y - startRect.top,
            width: rect.width - startRect.width,
            height: rect.height - startRect.height
        };
        
        // 애니메이션 시작 시간
        const startTime = performance.now();
        let rafId = null;
        let timeoutId = null;
        let isResolved = false;
        
        const cleanup = () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };
        
        const resolveOnce = (resolve) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            
            // 최종 위치 정확히 설정 (반올림 오차 보정)
            element.style.left = rect.x + 'px';
            element.style.top = rect.y + 'px';
            element.style.width = rect.width + 'px';
            element.style.height = rect.height + 'px';
            
            XCON.log(`✅ 위치 애니메이션 완료 (${easingType}): ${component.key || 'unknown'}`);
            resolve();
        };
        
        return new Promise((resolve) => {
            // 애니메이션 프레임 함수
            const animate = (currentTime) => {
                if (isResolved) return;
                
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1); // 0 ~ 1
                
                // easing 함수 적용
                const easedProgress = easingFunc(progress);
                
                // 현재 위치 계산
                const currentLeft = startRect.left + delta.left * easedProgress;
                const currentTop = startRect.top + delta.top * easedProgress;
                const currentWidth = startRect.width + delta.width * easedProgress;
                const currentHeight = startRect.height + delta.height * easedProgress;
                
                // 요소 위치 업데이트
                element.style.left = currentLeft + 'px';
                element.style.top = currentTop + 'px';
                element.style.width = currentWidth + 'px';
                element.style.height = currentHeight + 'px';
                
                // 애니메이션 완료 확인
                if (progress >= 1) {
                    resolveOnce(resolve);
                    return;
                }
                
                // 다음 프레임 요청
                rafId = requestAnimationFrame(animate);
            };
            
            // 애니메이션 시작
            rafId = requestAnimationFrame(animate);
            
            // 타임아웃 설정 (안전장치)
            const timeoutBuffer = isMobile ? duration * 2 + 300 : duration + 100;
            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    XCON.log(`⏰ 위치 애니메이션 타임아웃 (${timeoutBuffer}ms 경과), 완료 처리`);
                    resolveOnce(resolve);
                }
            }, timeoutBuffer);
        });
    }

    setComponentProperty(component, effect, componentData, key) {
        if (!componentData.contains(key) && !effect.contains(key)) return;
        if (component && typeof component === 'object') {
            try {
                const value = componentData.get(key) || effect.get(key);
                // 컴포넌트가 updateProperty 메서드를 가지고 있는 경우 우선 사용
                if (typeof component.updateProperty === 'function') {
                    component.updateProperty(key, value);
                    return;
                }

                // 기존 방식으로 처리
                component[key] = value;

                // DOM 요소가 있다면 업데이트
                if (component.element) {
                    this.updateElementProperty(component.element, key, value);
                }
            } catch (e) {
                XCON.warn("Failed to set component property:", e);
            }
        }
    }

    updateElementProperty(element, key, value) {
        switch (key) {
            case 'text':
                element.textContent = value;
                break;
            case 'visible':
                const visibleValue = value === 'true' || value === true;
                if (visibleValue) {
                    // 보이기: display 속성을 제거하여 원래 값으로 복원
                    element.style.removeProperty('display');
                } else {
                    // 숨기기: display: none 적용
                    element.style.display = 'none';
                }
                break;
            case 'enabled':
                element.disabled = value !== 'true';
                break;
            case 'bgColor':
                element.style.backgroundColor = this.parseColor(value);
                break;
            case 'fgColor':
                element.style.color = this.parseColor(value);
                break;
            case 'image':
                let resolvedImage = this.resolveImagePath(value);

                const xamongToken = XCON.xamongToken();
                if (xamongToken.userId) {
                    resolvedImage = resolvedImage.replace('/assets/apps/', `/assets/${xamongToken.userId}/apps/`);
                }
    
                element.style.backgroundImage = `url('${resolvedImage}')`;
                element.style.backgroundSize = 'cover';
                element.style.backgroundPosition = 'center';
                element.style.backgroundRepeat = 'no-repeat';
                break;
            default:
                if (element.style[key] !== undefined) {
                    element.style[key] = expandXamongActionThemeTokenAliases(value);
                }
                break;
        }
    }

    parseColor(colorString) {
        if (!colorString) return '';

        const raw = String(colorString).trim();
        const themed = expandXamongActionThemeTokenAliases(raw);
        if (themed !== raw) return themed;

        // "r,g,b,a" 형태의 색상을 rgba로 변환
        const parts = raw.split(',');
        if (parts.length >= 3) {
            const r = parseInt(parts[0], 10);
            const g = parseInt(parts[1], 10);
            const b = parseInt(parts[2], 10);
            const a = parts.length > 3 ? parseFloat(parts[3]) / 255 : 1;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        return raw;
    }

    /**
     * 사각형 파싱
     */
    parseRectangle(rectString) {
        try {
            // "x,y,width,height" 형식 파싱
            const parts = rectString.split(',').map(p => parseFloat(p.trim()));
            if (parts.length === 4 && parts.every(p => this.isValidNumber(p))) {
                return {
                    x: parts[0],
                    y: parts[1],
                    width: parts[2],
                    height: parts[3]
                };
            }
        } catch (error) {
            XCON.error("사각형 파싱 오류:", error);
        }
        return null;
    }

    /**
     * 유효한 숫자 확인
     */
    isValidNumber(value) {
        return !isNaN(value) && isFinite(value);
    }

    /**
     * 이미지 경로 해결
     */
    resolveImagePath(imagePath) {
        if (!imagePath || imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
            return imagePath;
        }
                
        if (this.appService && this.appService.resolveImagePath) {
            return this.appService.resolveImagePath(imagePath);
        }
        
        return imagePath;
    }

    /**
     * Dict 접근자
     */
    get Dict() {
        return this.dict;
    }

    set Dict(value) {
        this.dict = value;
    }

    /**
     * Owner 접근자
     */
    get Owner() {
        return this.owner;
    }

    set Owner(value) {
        this.owner = value;
    }
}

// Sound Action
class SoundAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.SOUND;
        this.src = "";
        this.command = "";
        this.loop = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SoundAction", this.owner, sender);

        const wavfile = this.parseString(sender, this.src);
        if (this.appService && this.appService.appHost) {
            this.appService.appHost.play(wavfile);
        } else {
            XCON.log(`Play: ${wavfile}`);
        }
    }
}

// =============================================================================
// Action Factory
// =============================================================================
class ActionFactory {
    static getTypeString(actionClass) {
        const typeMap = {
            'NullAction': ActionType.NULL,
            'LogAction': ActionType.LOG,
            'CustomAction': ActionType.CUSTOM,
            'CallActionAction': ActionType.CALL_ACTION,
            'SleepAction': ActionType.SLEEP,
            'BatchAction': ActionType.BATCH,
            'ConditionAction': ActionType.CONDITION,
            'SelectAction': ActionType.SELECT,
            'LoopAction': ActionType.LOOP,
            'ScriptAction': ActionType.SCRIPT,
            'CallApiAction': ActionType.CALL_API,
            'TryAction': ActionType.TRY,
            'AlertAction': ActionType.ALERT,
            'ToastAction': ActionType.TOAST,
            'MakeRootAction': ActionType.MAKE_ROOT,
            'GoHomeAction': ActionType.GO_HOME,
            'GoBackAction': ActionType.GO_BACK,
            'GoGoBackAction': ActionType.GO_GO_BACK,
            'SoundAction': ActionType.SOUND,
            'FormulaAction': ActionType.FORMULA,
            'ChainAction': ActionType.CHAIN,
            'ActivityAction': ActionType.ACTIVITY,
            'LoadTableAction': ActionType.LOAD_TABLE,
            'SaveTableAction': ActionType.SAVE_TABLE,
            'SaveDataAction': ActionType.SAVE_DATA,
            'CreateComponentsAction': ActionType.CREATE_COMPONENTS,
            'TransitionAction': ActionType.TRANSITION
        };

        return typeMap[actionClass.name] || ActionType.NONE;
    }

    static create(type, owner) {
        // 타입 별칭 매핑 (호환성을 위해)
        const typeAliases = {
            'set': ActionType.SAVE_DATA,
            'save': ActionType.SAVE_DATA,
            'data': ActionType.SAVE_DATA
        };

        // 별칭이 있으면 실제 타입으로 변환
        const actualType = typeAliases[type] || type;

        const actionClasses = {
            [ActionType.NULL]: NullAction,
            [ActionType.LOG]: LogAction,
            [ActionType.CUSTOM]: CustomAction,
            [ActionType.CALL_ACTION]: CallActionAction,
            [ActionType.SLEEP]: SleepAction,
            [ActionType.BATCH]: BatchAction,
            [ActionType.CONDITION]: ConditionAction,
            [ActionType.SELECT]: SelectAction,
            [ActionType.LOOP]: LoopAction,
            [ActionType.SCRIPT]: ScriptAction,
            [ActionType.CALL_API]: CallApiAction,
            [ActionType.TRY]: TryAction,
            [ActionType.ALERT]: AlertAction,
            [ActionType.TOAST]: ToastAction,
            [ActionType.MAKE_ROOT]: MakeRootAction,
            [ActionType.GO_HOME]: GoHomeAction,
            [ActionType.GO_BACK]: GoBackAction,
            [ActionType.GO_GO_BACK]: GoGoBackAction,
            [ActionType.SOUND]: SoundAction,
            [ActionType.FORMULA]: FormulaAction,
            [ActionType.CHAIN]: ChainAction,
            [ActionType.ACTIVITY]: ActivityAction,
            [ActionType.LOAD_TABLE]: LoadTableAction,
            [ActionType.SAVE_TABLE]: SaveTableAction,
            [ActionType.SAVE_DATA]: SaveDataAction,
            [ActionType.CREATE_COMPONENTS]: CreateComponentsAction,
            [ActionType.TRANSITION]: TransitionAction
        };

        const ActionClass = actionClasses[actualType];
        if (!ActionClass) {
            XCON.warn(`Unknown action type: ${type} (mapped to: ${actualType})`);
            return new XaAction(owner);
        }

        return new ActionClass(owner);
    }

    static createFromXCON(xcon, owner) {
        XCON.log("#################### createFromXCON", xcon, owner);

        // XCON 객체 또는 일반 객체 모두 처리
        const hasProperty = (obj, key) => {
            if (obj && typeof obj.contains === 'function') {
                return obj.contains(key);
            }
            return obj && typeof obj === 'object' && key in obj;
        };

        const getProperty = (obj, key) => {
            if (obj && typeof obj.get === 'function') {
                return obj.get(key);
            }
            return obj && typeof obj === 'object' ? obj[key] : null;
        };

        if (!xcon) {
            return new NullAction(owner);
        }

        const chain = hasProperty(xcon, 'chain') ? getProperty(xcon, 'chain') : null;
        XCON.log("#################### CHAIN", chain);

        if (!hasProperty(xcon, 'type')) {
            const nullAction = new NullAction(owner);
            nullAction.chain = chain;
            return nullAction;
        }

        const type = getProperty(xcon, 'type')?.toString();
        const action = this.create(type, owner);

        XCON.log("#################### createFromXCON", xcon);

        // 딕셔너리 설정
        action.dict = xcon;
        action.chain = chain;

        // 공통 속성 설정
        if (hasProperty(xcon, 'target')) {
            action.target = getProperty(xcon, 'target')?.toString();
        }

        // 타입별 속성 설정 (XCON 객체인 경우)
        if (xcon && typeof xcon[Symbol.iterator] === 'function') {
            for (const { key, value } of xcon) {
                if (key !== 'type') {
                    // CallActionAction의 경우 action -> name 매핑
                    if (action instanceof CallActionAction && key === 'action') {
                        action.name = value;
                    } else if (action.hasOwnProperty(key)) {
                        action[key] = value;
                    }
                }
            }
        } else if (xcon && typeof xcon === 'object') {
            // 일반 객체인 경우
            for (const [key, value] of Object.entries(xcon)) {
                if (key !== 'type') {
                    // CallActionAction의 경우 action -> name 매핑
                    if (action instanceof CallActionAction && key === 'action') {
                        action.name = value;
                    } else if (action.hasOwnProperty(key)) {
                        action[key] = value;
                    }
                }
            }
        }

        // success, failure, after 액션 설정
        if (hasProperty(xcon, 'success')) {
            action.success = this.createFromXCON(getProperty(xcon, 'success'), owner);
        }
        if (hasProperty(xcon, 'failure')) {
            action.failure = this.createFromXCON(getProperty(xcon, 'failure'), owner);
        }
        if (hasProperty(xcon, 'after')) {
            action.after = this.createFromXCON(getProperty(xcon, 'after'), owner);
        }

        // 배치 액션의 actions 설정
        if (action instanceof BatchAction && hasProperty(xcon, 'actions')) {
            const actions = getProperty(xcon, 'actions');
            XCON.log('🔍 BatchAction actions 설정:', actions);
            XCON.log('🔍 actions 타입:', typeof actions);
            XCON.log('🔍 actions instanceof XCON:', actions instanceof XCON);

            if (Array.isArray(actions)) {
                //action.actions = actions.map(actionXcon => this.createFromXCON(actionXcon, owner));
                //action.actions = actions;

                action.actions = [];
                for (const actionXcon of actions) {
                    XCON.log(actionXcon);
                    action.actions.push(this.createFromXCON(actionXcon, owner));
                }

                XCON.log('🔍 BatchAction actions 배열로 설정:', action.actions.length);
            } else if (actions instanceof XCON) {
                // XCON 컬렉션 처리 (c 태그)
                const actionList = [];
                for (const { key, value } of actions) {
                    XCON.log(`🔍 BatchAction actions[${key}]:`, value);
                    actionList.push(this.createFromXCON(value, owner));
                }
                action.actions = actionList;
                XCON.log('🔍 BatchAction actions XCON 컬렉션으로 설정:', action.actions.length);
            } else {
                XCON.log('🔍 BatchAction actions 설정 실패 - 알 수 없는 형식');
            }
        }

        // 루프 액션의 action 설정
        if (action instanceof LoopAction && hasProperty(xcon, 'action')) {
            action.action = this.createFromXCON(getProperty(xcon, 'action'), owner);
        }

        return action;
    }
}

// =============================================================================
// Event Action System (이벤트 액션 시스템)
// =============================================================================

// Event Action Base Class
class EventAction extends XaAction {
    constructor(owner) {
        super(owner);
        this.type = ActionType.EVENT;
        this.command = "";
        this.afterEvent = null;
    }

    execute(sender) {
        this.log("EventAction", this.owner, sender);
    }

    onAfterEvent(sender) {
        if (this.afterEvent) {
            this.afterEvent._eventArgs = this._eventArgs;
            this.afterEvent.execute(sender);
        }
    }
}

// Timeline Event Action
class TimelineEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "timeline";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("TimelineEventAction : " + this.target, this.owner, sender);

        const parent = this.getParent();

        if (this.validTest) {
            this.validTest.forEach(valList => {
                if (valList instanceof XCON) {
                    for (const { key, value } of valList) {
                        XCON.log("----> validTest = " + key + " : " + value);
                    }
                }
            });
        }

        if (this.dict && this.dict.contains('components')) {
            const components = this.dict.get('components');
            if (components instanceof XCON) {
                for (const { key, value } of components) {
                    if (parent.data && parent.data.contains(key)) {
                        const obj = parent.data.get(key);
                        if (obj && obj.constructor.name.includes('Component')) {
                            const component = obj;
                            const effectDict = value instanceof XCON ? value.get('effect') : null;

                            if (effectDict instanceof XCON) {
                                this.applyTimelineEffect(component, effectDict, sender);
                            }
                        } else {
                            XCON.log("---> TimelineEventAction : XaComponent 아님 " + obj);
                        }
                    } else {
                        XCON.log("---> TimelineEventAction : " + key + "이(가) 없음.");
                    }
                }
            }
        }

        this.onAfterEvent(sender);
    }

    applyTimelineEffect(component, effect, sender) {
        if (!effect instanceof XCON) return;

        let hidden = false;
        let endPos = null;
        let duration = 0;
        let command = "";

        if (effect.contains('hidden')) {
            hidden = effect.get('hidden').toString() === 'true';
            this.setComponentVisibility(component, !hidden);
        }

        if (effect.contains('endPos')) {
            endPos = this.parseRectangle(effect.get('endPos').toString());
        }

        if (effect.contains('duration')) {
            duration = parseFloat(effect.get('duration').toString()) * 1000; // 초를 밀리초로
        }

        if (effect.contains('command')) {
            command = this.parseString(sender, effect.get('command').toString());
        }

        if (endPos && duration > 0) {
            this.animateComponent(component, endPos, duration, command);
        }
    }

    setComponentVisibility(component, visible) {
        if (component.element) {
            if (visible) {
                // 보이기: display 속성을 제거하여 원래 값으로 복원
                component.element.style.removeProperty('display');
            } else {
                // 숨기기: display: none 적용
                component.element.style.display = 'none';
            }
        }
    }

    animateComponent(component, endPos, duration, command) {
        if (!component.element) return;

        const element = component.element;
        const startPos = element.getBoundingClientRect();

        element.style.transition = `all ${duration}ms ease-in-out`;
        element.style.left = endPos.x + 'px';
        element.style.top = endPos.y + 'px';
        element.style.width = endPos.width + 'px';
        element.style.height = endPos.height + 'px';

        setTimeout(() => {
            element.style.transition = '';
            if (component.initWithTimeline) {
                component.initWithTimeline(command);
            }
        }, duration);
    }

    parseRectangle(rectString) {
        const parts = rectString.split(',').map(s => parseFloat(s.trim()));
        return {
            x: parts[0] || 0,
            y: parts[1] || 0,
            width: parts[2] || 0,
            height: parts[3] || 0
        };
    }
}

// Start Event Action
class StartEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "start";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("StartEventAction : " + this.target, this.owner, sender);

        const component = this.getTargetComponent();
        if (component) {
            XCON.log("-------> " + component);
            if (component.start && typeof component.start === 'function') {
                component.start();
            }
        }

        this.onAfterEvent(sender);
    }

    getTargetComponent() {
        if (!this.target) return null;

        const parts = this.target.split('.');
        let parent = this.owner;

        if (parent.constructor.name === 'DefaultXaController') {
            parent = parent.parentController;
        }

        return this.getComponentByPath(parent, parts, 0);
    }

    getComponentByPath(parent, parts, index) {
        if (index >= parts.length) return null;

        if (index === parts.length - 1) {
            return parent.data ? parent.data.get(parts[index]) : null;
        }

        const part = parts[index];
        if (part === "self") {
            return this.getComponentByPath(parent, parts, index + 1);
        } else if (part === "parent") {
            return this.getComponentByPath(parent.parentController, parts, index + 1);
        } else {
            const nextParent = parent.data ? parent.data.get(part) : null;
            return nextParent ? this.getComponentByPath(nextParent, parts, index + 1) : null;
        }
    }
}

// Stop Event Action
class StopEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "stop";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("StopEventAction", this.owner, sender);

        const component = this.getTargetComponent();
        if (component) {
            XCON.log("-------> " + component);
            if (component.stop && typeof component.stop === 'function') {
                component.stop();
            }
        }

        this.onAfterEvent(sender);
    }

    getTargetComponent() {
        return new StartEventAction(this.owner).getTargetComponent.call(this);
    }
}

// Set Object Values Event Action
class SetObjectValuesEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "setObjectValues";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SetObjectValuesEventAction : " + this.target, this.owner, sender);

        if (this.dict && this.dict.contains('values')) {
            const values = this.dict.get('values');
            if (values instanceof XCON) {
                for (const { key, value } of values) {
                    const val = this.parseString(sender, value.toString());

                    if (key.startsWith("global.")) {
                        this.appService.setAttributeWithPath(this.appService.repository, key, val);
                    } else if (key.startsWith(this.target)) {
                        const parent = this.getParent();
                        const path = key.substring(this.target.length + 1);
                        this.setObjectValueWithPath(parent.data, path, val);
                    } else {
                        const component = this.getTargetComponent();
                        if (component) {
                            this.setComponentProperty(component, key, val);
                        }
                    }
                }
            }
        }

        this.onAfterEvent(sender);
    }

    setObjectValueWithPath(data, path, value) {
        if (!data || !path) return;

        try {
            if (data instanceof XCON) {
                XCON.setAttributeWithPath(data, path, value);
            } else {
                const parts = path.split('.');
                let current = data;

                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }

                current[parts[parts.length - 1]] = value;
            }
        } catch (e) {
            XCON.warn("Failed to set object value:", e);
        }
    }

    setComponentProperty(component, key, value) {
        if (component && typeof component === 'object') {
            try {
                // 컴포넌트가 updateProperty 메서드를 가지고 있는 경우 우선 사용
                if (typeof component.updateProperty === 'function') {
                    component.updateProperty(key, value);
                    return;
                }

                // 기존 방식으로 처리
                component[key] = value;

                // DOM 요소가 있다면 업데이트
                if (component.element) {
                    this.updateElementProperty(component.element, key, value);
                }
            } catch (e) {
                XCON.warn("Failed to set component property:", e);
            }
        }
    }

    updateElementProperty(element, key, value) {
        switch (key) {
            case 'text':
                element.textContent = value;
                break;
            case 'visible':
                const visibleValue = value === 'true' || value === true;
                if (visibleValue) {
                    // 보이기: display 속성을 제거하여 원래 값으로 복원
                    element.style.removeProperty('display');
                } else {
                    // 숨기기: display: none 적용
                    element.style.display = 'none';
                }
                break;
            case 'enabled':
                element.disabled = value !== 'true';
                break;
            case 'bgColor':
                element.style.backgroundColor = this.parseColor(value);
                break;
            case 'fgColor':
                element.style.color = this.parseColor(value);
                break;
            default:
                if (element.style[key] !== undefined) {
                    element.style[key] = expandXamongActionThemeTokenAliases(value);
                }
                break;
        }
    }

    parseColor(colorString) {
        if (!colorString) return '';

        const raw = String(colorString).trim();
        const themed = expandXamongActionThemeTokenAliases(raw);
        if (themed !== raw) return themed;

        // "r,g,b,a" 형태의 색상을 rgba로 변환
        const parts = raw.split(',');
        if (parts.length >= 3) {
            const r = parseInt(parts[0], 10);
            const g = parseInt(parts[1], 10);
            const b = parseInt(parts[2], 10);
            const a = parts.length > 3 ? parseFloat(parts[3]) / 255 : 1;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        return raw;
    }

    getTargetComponent() {
        return new StartEventAction(this.owner).getTargetComponent.call(this);
    }
}

// Set New Data Event Action
class SetNewDataEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "setNewData";
        this.dataTemplate = null;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SetNewDataEventAction", this.owner, sender);

        if (this.owner.constructor.name === 'XaList') {
            this.setListNewData(this.owner);
        } else if (this.owner.constructor.name === 'XaForm') {
            this.setFormNewData();
        }

        this.onAfterEvent(sender);
    }

    setListNewData(list) {
        if (list.setNewData && typeof list.setNewData === 'function') {
            list.setNewData(this.dataTemplate);
        }
    }

    setFormNewData() {
        let path = this.target;
        if (path && path.startsWith("self.")) {
            path = path.substring(5);
        }

        const targetObj = XCON.getAttributeWithPath(this.owner.data, path);
        if (targetObj) {
            if (targetObj.constructor.name === 'XaList' && targetObj.setNewData) {
                targetObj.setNewData(this.dataTemplate);
            } else if (targetObj.constructor.name === 'XaTreeView' && targetObj.setNewData) {
                targetObj.setNewData(this.dataTemplate);
            }
        }
    }
}

// Add New Block Event Action (for XaDocument/XaChatDocument)
class AddNewBlockEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "addNewBlock";
        this.blockType = "";
        this.simulate = false;
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("AddNewBlockEventAction : " + this.target, this.owner, sender);

        try {
            const paramObj = this.dict ? this.dict.get('parameter') : null;
            if (paramObj instanceof XCON) {
                let path = this.target;
                if (path && path.startsWith("self.")) {
                    path = path.substring(5);
                }

                const docObj = this.appService.getAttributeWithPath(this.owner.data, path);

                if (docObj) {
                    if (docObj.constructor.name === 'XaDocument') {
                        this.handleDocumentBlock(docObj, paramObj);
                    } else if (docObj.constructor.name === 'XaChatDocument') {
                        this.handleChatDocumentBlock(docObj, paramObj, sender);
                    }
                }
            }
        } catch (ex) {
            XCON.error("AddNewBlockEventAction error:", ex);
        }

        this.onAfterEvent(sender);
    }

    handleDocumentBlock(document, params) {
        if (this.blockType === "card") {
            const title = params.get('title').toString();
            const content = this.stringService.parse(this.owner, params.get('content').toString());

            const code = atob(content); // Base64 디코딩
            const markdownText = `@card(title="${title}", content="${code.length}")`;

            if (document.addMarkdownBlock) {
                document.addMarkdownBlock(markdownText, code);
            }

            if (document.scrollToEnd) {
                document.scrollToEnd();
            }
        }
    }

    handleChatDocumentBlock(chatDocument, params, sender) {
        switch (this.blockType) {
            case "user":
                const userMessage = params.get('message').toString();
                if (chatDocument.appendUserMessage) {
                    chatDocument.appendUserMessage(userMessage);
                }
                break;

            case "assistant":
                const assistantMessage = params.get('message').toString();
                if (chatDocument.appendAssistantMessage) {
                    chatDocument.appendAssistantMessage(assistantMessage);
                }
                break;

            case "xcon":
                const xcon = this.stringService.parse(this.owner, params.get('code').toString());
                const markdownCode = `\`\`\`xcon\n${xcon}\n\`\`\``;
                if (chatDocument.appendMarkdown) {
                    chatDocument.appendMarkdown(markdownCode, this.simulate);
                }
                break;

            case "xmd":
                const code = params.get('code').toString();
                if (chatDocument.appendMarkdownUI) {
                    chatDocument.appendMarkdownUI(code);
                }
                break;

            case "history":
                const historyObj = this.stringService.parseObject(this.owner, params.get('history').toString());
                if (Array.isArray(historyObj)) {
                    this.processHistoryData(chatDocument, historyObj);
                }
                break;

            default:
                if (params.contains('userMessage') && params.contains('assistantMessage')) {
                    const userMsg = params.get('userMessage').toString();
                    const assistantMsg = params.get('assistantMessage').toString();

                    if (chatDocument.appendUserMessage) {
                        chatDocument.appendUserMessage(userMsg);
                    }
                    if (chatDocument.appendAssistantMessage) {
                        chatDocument.appendAssistantMessage(assistantMsg);
                    }
                } else {
                    const xconData = XCON.serialize(params, false);
                    const markdownCode = `\`\`\`xcon\n${xconData}\n\`\`\``;
                    if (chatDocument.appendMarkdown) {
                        chatDocument.appendMarkdown(markdownCode, this.simulate);
                    }
                }
                break;
        }
    }

    processHistoryData(chatDocument, history) {
        history.forEach(chatInfo => {
            if (chatInfo instanceof XCON) {
                const projectName = chatInfo.get('projectName');
                if (projectName && projectName.toString().trim()) {
                    // 프로젝트 관련 처리
                    if (!this.owner.data.contains("record")) {
                        this.owner.data.set("record", new XCON());
                    }
                    this.owner.data.get("record").set("responseData", chatInfo);
                } else {
                    // 일반 채팅 메시지 처리
                    const userMessage = chatInfo.get('userMessage');
                    const assistantMessage = chatInfo.get('assistantMessage');

                    if (userMessage && chatDocument.appendUserMessage) {
                        chatDocument.appendUserMessage(userMessage.toString());
                    }
                    if (assistantMessage && chatDocument.appendAssistantMessage) {
                        chatDocument.appendAssistantMessage(assistantMessage.toString());
                    }
                }
            }
        });
    }
}

// List Event Actions

// Easy Select Event Action
class EasySelectEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "easySelect";
        this.value = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("EasySelectEventAction", this.owner, sender);

        if (this.owner.constructor.name === 'XaList') {
            if (this.owner.easySelect && typeof this.owner.easySelect === 'function') {
                this.owner.easySelect(this.value);
            }
        }

        this.onAfterEvent(sender);
    }
}

// Add New Row Event Action
class AddNewRowEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "addNewRow";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("AddNewRowEventAction : " + this.target, this.owner, sender);

        const paramObj = this.dict ? this.dict.get('parameter') : null;
        if (paramObj instanceof XCON) {
            const newData = new XCON();

            for (const { key, value } of paramObj) {
                const s = this.parseString(sender, value.toString());
                if (s.startsWith("(object:")) {
                    newData.set(key, this.parseObject(sender, value.toString()));
                } else {
                    newData.set(key, s);
                }
            }

            const parent = this.getParent();
            XCON.log("----------------------> GetParent: " + parent);

            if (parent.constructor.name === 'XaList') {
                if (parent.addNewRow && typeof parent.addNewRow === 'function') {
                    parent.addNewRow(newData);
                }
                if (parent.ensureVisible && typeof parent.ensureVisible === 'function') {
                    parent.ensureVisible();
                }
            }
        }

        this.onAfterEvent(sender);
    }
}

// Ensure Visible Event Action
class EnsureVisibleEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "ensureVisible";
        this.rowNum = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("EnsureVisibleEventAction : " + this.target, this.owner, sender);

        const parent = this.getParent();
        XCON.log("----------------------> GetParent: " + parent);

        if (parent.constructor.name === 'XaList') {
            if (!this.rowNum) {
                if (parent.ensureVisible && typeof parent.ensureVisible === 'function') {
                    parent.ensureVisible();
                }
            } else {
                const rowNumber = parseInt(this.stringService.parse(this.rowNum), 10);
                if (parent.ensureVisibleWithRowNum && typeof parent.ensureVisibleWithRowNum === 'function') {
                    parent.ensureVisibleWithRowNum(rowNumber);
                }
            }
        }

        this.onAfterEvent(sender);
    }
}

// Update Rows Event Action
class UpdateRowsEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "updateRows";
        this.rowNum = "";
        this.animationEffect = "";
        this.conditions = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("UpdateRowsEventAction", this.owner, sender);

        let p1 = "";
        let p2 = "";
        let updateType = "";

        if (this.conditions.startsWith("@_layout=")) {
            p1 = this.conditions.substring("@_layout=".length);
            if (this.dict && this.dict.contains('record')) {
                p2 = this.appService.getAttributeWithPath(this.dict, "record._layout").toString();
            }
            updateType = "layout";
        } else if (this.conditions.startsWith("@_action=")) {
            p1 = this.conditions.substring("@_action=".length);
            if (this.dict && this.dict.contains('record')) {
                p2 = this.appService.getAttributeWithPath(this.dict, "record._action").toString();
            }
            updateType = "action";
        } else if (this.conditions.startsWith("@rowSelected=")) {
            p1 = this.conditions.substring("@rowSelected=".length);
            if (this.dict && this.dict.contains('record')) {
                p2 = this.appService.getAttributeWithPath(this.dict, "record._layout").toString();
            }
            updateType = "rowSelected";
        } else {
            XCON.log(">>>> Unknown condition : " + this.conditions);
        }

        if (this.owner.constructor.name === 'XaList') {
            if (this.owner.updateRows && typeof this.owner.updateRows === 'function') {
                this.owner.updateRows(p1, p2, updateType);
            }
        }

        this.onAfterEvent(sender);
    }
}

// Media Control Event Action
class MediaControlEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "mediaControl";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("MediaControlEventAction : " + this.target, this.owner, sender);

        const parent = this.getParent();

        if (this.dict && this.dict.contains('components')) {
            const components = this.dict.get('components');
            if (components instanceof XCON) {
                for (const { key, value } of components) {
                    if (parent.data && parent.data.contains(key)) {
                        const obj = parent.data.get(key);

                        if (obj && obj.constructor.name.includes('Component')) {
                            const component = obj;
                            const ctl = value instanceof XCON ? value.get('ctl').toString() : "";

                            if (component.constructor.name === 'XaVideoView') {
                                this.controlVideoView(component, ctl);
                            }
                        } else {
                            XCON.log("---> MediaControlEventAction : XaComponent 아님 " + obj);
                        }
                    } else {
                        XCON.log("---> MediaControlEventAction : " + key + "이(가) 없음.");
                    }
                }
            }
        }

        this.onAfterEvent(sender);
    }

    controlVideoView(videoView, control) {
        switch (control) {
            case "play":
                if (videoView.play && typeof videoView.play === 'function') {
                    videoView.play();
                }
                break;
            case "pause":
                if (videoView.pause && typeof videoView.pause === 'function') {
                    videoView.pause();
                }
                break;
            case "stop":
                if (videoView.stop && typeof videoView.stop === 'function') {
                    videoView.stop();
                }
                break;
            case "close":
                if (videoView.close && typeof videoView.close === 'function') {
                    videoView.close();
                }
                break;
            default:
                XCON.log("Unknown media control:", control);
                break;
        }
    }
}

// File Event Actions

// Save File Event Action
class SaveFileEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "saveFile";
        this.fileName = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("SaveFileEventAction : " + this.target, this.owner, sender);

        const saveFileName = this.parseString(sender, this.fileName);

        // 브라우저에서 파일 저장 구현
        this.downloadFile(saveFileName, "");

        this.onAfterEvent(sender);
    }

    downloadFile(filename, content) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

// Open File Event Action
class OpenFileEventAction extends EventAction {
    constructor(owner) {
        super(owner);
        this.type = "openFile";
        this.fileName = "";
    }

    execute(sender) {
        this.executeChain(sender);
        this.log("OpenFileEventAction : " + this.target, this.owner, sender);

        const openFileName = this.parseString(sender, this.fileName);

        // 브라우저에서 파일 열기 구현
        this.openFileDialog(openFileName);

        this.onAfterEvent(sender);
    }

    openFileDialog(filename) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                XCON.log("File selected:", file.name);
                // 파일 처리 로직 구현
            }
        };
        input.click();
    }
}

// =============================================================================
// Command Type Enumeration
// =============================================================================
const CommandType = {
    NONE: 'none',
    START: 'start',
    STOP: 'stop',
    ADD_NEW_BLOCK: 'addNewBlock',
    LAUNCH_WEB: 'launchweb',
    LAUNCH_MAP: 'launchmap',
    LAUNCH_MAIL: 'launchmail',
    LAUNCH_SMS: 'launchsms',
    LAUNCH_TEL: 'launchtel',
    REFRESH: 'refresh',
    SET_OBJECT_VALUES: 'setObjectValues',
    SET_NEW_DATA: 'setNewData',
    SET_TITLE: 'setTitle',
    SET_PROMPT: 'setPrompt',
    TIMELINE: 'timeline',
    RELOAD_FORM: 'reloadForm',
    GO_BACK_AND_REFRESH: 'goBackAndRefreah',
    EASY_SELECT: 'easySelect',
    RELOAD_DATA: 'reloadData',
    SELECT_ROW: 'selectRow',
    SET_ENABLED: 'setEnabled',
    SET_VALUES: 'setValues',
    STOP_ACTION: 'stopAction',
    ADD_NEW_ROW: 'addNewRow',
    DELETE_ROWS: 'deleteRows',
    UPDATE_ROWS: 'updateRows',
    SET_FOCUS: 'setFocus',
    ENSURE_VISIBLE: 'ensureVisible',
    MEDIA_CONTROL: 'mediaControl',
    SAVE_FILE: 'saveFile',
    OPEN_FILE: 'openFile'
};

// =============================================================================
// Event Factory
// =============================================================================
class EventFactory {
    static getTypeString(eventClass) {
        const typeMap = {
            'StartEventAction': CommandType.START,
            'StopEventAction': CommandType.STOP,
            'TimelineEventAction': CommandType.TIMELINE,
            'SetObjectValuesEventAction': CommandType.SET_OBJECT_VALUES,
            'SetNewDataEventAction': CommandType.SET_NEW_DATA,
            'AddNewBlockEventAction': CommandType.ADD_NEW_BLOCK,
            'EasySelectEventAction': CommandType.EASY_SELECT,
            'AddNewRowEventAction': CommandType.ADD_NEW_ROW,
            'EnsureVisibleEventAction': CommandType.ENSURE_VISIBLE,
            'UpdateRowsEventAction': CommandType.UPDATE_ROWS,
            'MediaControlEventAction': CommandType.MEDIA_CONTROL,
            'SaveFileEventAction': CommandType.SAVE_FILE,
            'OpenFileEventAction': CommandType.OPEN_FILE
        };

        return typeMap[eventClass.name] || CommandType.NONE;
    }

    static create(type, owner) {
        const eventClasses = {
            [CommandType.START]: StartEventAction,
            [CommandType.STOP]: StopEventAction,
            [CommandType.TIMELINE]: TimelineEventAction,
            [CommandType.SET_OBJECT_VALUES]: SetObjectValuesEventAction,
            [CommandType.SET_NEW_DATA]: SetNewDataEventAction,
            [CommandType.ADD_NEW_BLOCK]: AddNewBlockEventAction,
            [CommandType.EASY_SELECT]: EasySelectEventAction,
            [CommandType.ADD_NEW_ROW]: AddNewRowEventAction,
            [CommandType.ENSURE_VISIBLE]: EnsureVisibleEventAction,
            [CommandType.UPDATE_ROWS]: UpdateRowsEventAction,
            [CommandType.MEDIA_CONTROL]: MediaControlEventAction,
            [CommandType.SAVE_FILE]: SaveFileEventAction,
            [CommandType.OPEN_FILE]: OpenFileEventAction
        };

        const EventClass = eventClasses[type];
        if (!EventClass) {
            XCON.warn(`Unknown event type: ${type}`);
            return new EventAction(owner);
        }

        return new EventClass(owner);
    }
}

// ActionFactory 확장 - 이벤트 액션 타입 추가
ActionType.START = 'start';
ActionType.STOP = 'stop';
ActionType.TIMELINE = 'timeline';
ActionType.SET_OBJECT_VALUES = 'setObjectValues';
ActionType.SET_NEW_DATA = 'setNewData';
ActionType.ADD_NEW_BLOCK = 'addNewBlock';
ActionType.EASY_SELECT = 'easySelect';
ActionType.ADD_NEW_ROW = 'addNewRow';
ActionType.ENSURE_VISIBLE = 'ensureVisible';
ActionType.UPDATE_ROWS = 'updateRows';
ActionType.MEDIA_CONTROL = 'mediaControl';
ActionType.SAVE_FILE = 'saveFile';
ActionType.OPEN_FILE = 'openFile';

// ActionFactory.create 메서드 확장
const originalCreate = ActionFactory.create;
ActionFactory.create = function (type, owner) {
    // 이벤트 액션 타입들 처리
    const eventActionClasses = {
        'start': StartEventAction,
        'stop': StopEventAction,
        'timeline': TimelineEventAction,
        'setObjectValues': SetObjectValuesEventAction,
        'setNewData': SetNewDataEventAction,
        'addNewBlock': AddNewBlockEventAction,
        'easySelect': EasySelectEventAction,
        'addNewRow': AddNewRowEventAction,
        'ensureVisible': EnsureVisibleEventAction,
        'updateRows': UpdateRowsEventAction,
        'mediaControl': MediaControlEventAction,
        'saveFile': SaveFileEventAction,
        'openFile': OpenFileEventAction
    };

    const EventActionClass = eventActionClasses[type];
    if (EventActionClass) {
        return new EventActionClass(owner);
    }

    // 기존 액션 타입들은 원래 메서드로 처리
    return originalCreate.call(this, type, owner);
};

// =============================================================================
// Global Export
// =============================================================================
window.XamongActions = {
    XaAction,
    ActionType,
    ActionFactory,
    CommandType,
    EventFactory,

    // Action Classes
    NullAction,
    LogAction,
    CustomAction,
    CallActionAction,
    SleepAction,
    BatchAction,
    ConditionAction,
    SelectAction,
    LoopAction,
    ScriptAction,
    CallApiAction,
    TryAction,
    ActivityAction,
    AlertAction,
    ToastAction,
    MakeRootAction,
    GoHomeAction,
    GoBackAction,
    GoGoBackAction,
    FormulaAction,
    ChainAction,
    SaveDataAction,
    LoadTableAction,
    SaveTableAction,
    CreateComponentsAction,
    TransitionAction,
    SoundAction,

    // Event Action Classes
    EventAction,
    TimelineEventAction,
    StartEventAction,
    StopEventAction,
    SetObjectValuesEventAction,
    SetNewDataEventAction,
    AddNewBlockEventAction,
    EasySelectEventAction,
    AddNewRowEventAction,
    EnsureVisibleEventAction,
    UpdateRowsEventAction,
    MediaControlEventAction,
    SaveFileEventAction,
    OpenFileEventAction
};

XCON.log("Xamong Action System with Event Actions loaded successfully!");
