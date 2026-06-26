/**
 * XamongChain JavaScript Parser System
 * 자몽 체인 파서/토크나이저를 JavaScript로 포팅
 * XCON.js 기반 데이터 처리 시스템
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

/**
 * CSS 색상 값을 RGBA 문자열(255,255,255,255)로 변환하는 함수
 * @param {string} cssColor - CSS 색상 값 (rgb, rgba, hex 등)
 * @returns {string} - "255,255,255,255" 형태의 문자열
 */
function convertCssColorToRgbaString(cssColor) {
    if (!cssColor || cssColor === 'transparent') {
        return '0,0,0,0';
    }

    // 임시 div 요소를 만들어서 브라우저가 색상을 정규화하도록 함
    const tempDiv = document.createElement('div');
    tempDiv.style.color = cssColor;
    document.body.appendChild(tempDiv);

    // getComputedStyle로 정규화된 색상 값 가져오기
    const computedColor = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    // rgb() 또는 rgba() 형태의 문자열 파싱
    const rgbaMatch = computedColor.match(/rgba?\(([^)]+)\)/);
    if (!rgbaMatch) {
        XCON.warn(`색상 파싱 실패: ${cssColor} → ${computedColor}`);
        return '0,0,0,255'; // 기본값: 검은색
    }

    const values = rgbaMatch[1].split(',').map(v => v.trim());

    // RGB 값 (0-255)
    const r = Math.round(parseFloat(values[0]) || 0);
    const g = Math.round(parseFloat(values[1]) || 0);
    const b = Math.round(parseFloat(values[2]) || 0);

    // 알파 값 (0-1 → 0-255로 변환)
    let a = 255; // 기본값: 완전 불투명
    if (values.length > 3) {
        const alphaValue = parseFloat(values[3]) || 0;
        a = Math.round(alphaValue * 255);
    }

    // 값 범위 제한 (0-255)
    const clampedR = Math.max(0, Math.min(255, r));
    const clampedG = Math.max(0, Math.min(255, g));
    const clampedB = Math.max(0, Math.min(255, b));
    const clampedA = Math.max(0, Math.min(255, a));

    return `${clampedR},${clampedG},${clampedB},${clampedA}`;
}

// ============================================================================
// 1. ApplicationService (XCON Repository 관리)
// ============================================================================
// Move to xamong-core.js

// ============================================================================
// 2. XaController Interface
// ============================================================================
// Move to xamong-ui-components.js

// ============================================================================
// 3. DataStore (XCON 기반 데이터 저장소)
// ============================================================================
class DataStore {
    constructor(owner = null) {
        this.xconData = new XCON();
        this.owner = owner;
        this.objectHash = new Map();
        this.currentSender = null; // 현재 액션을 발생시킨 sender 객체
    }

    set(path, value) {
        if (!path) {
            throw new Error("Path cannot be null or empty");
        }

        if (!this.owner) {
            if (window.XamongServices) {
                const chainService = window.XamongServices.ServiceHelper.getGlobalServiceManager().getService('ChainingService');
                if (chainService && chainService.previewMode) {
                    this.xconData = chainService.previewRepo;
                }
            }

            try {
                XCON.setAttributeWithPath(this.xconData, path, value);
            } catch (ex) {
                throw new Error(`Failed to set value at path '${path}': ${ex.message}`);
            }
            return;
        }

        let dict = null;

        // 가상 환경 확인
        const appService = this.owner.playerHost?.getService?.('ApplicationService');
        const isVirtualMode = appService?.isVirtual?.() || false;

        if (isVirtualMode) {
            // 가상 환경에서는 모든 경로를 Repository에 저장
            const repository = appService?.getRepository();

            if (repository) {
                // 점으로 분리된 경로 처리 (user.name, global.title 등)
                const pathParts = path.split('.');
                if (pathParts.length > 1) {
                    // 루트 객체가 없으면 생성
                    if (!repository.contains(pathParts[0])) {
                        repository.set(pathParts[0], new XCON());
                        XCON.logon3(`🔍 가상 환경 SET: 루트 객체 생성 - "${pathParts[0]}"`);
                    }
                    const rootData = repository.get(pathParts[0]);
                    if (rootData instanceof XCON) {
                        dict = rootData;
                        path = pathParts.slice(1).join('.');
                        XCON.logon3(`🔍 가상 환경 SET: 중첩 경로 저장 - root="${pathParts[0]}", subPath="${path}"`);
                    }
                } else {
                    // 단일 키는 직접 Repository에 저장
                    dict = repository;
                    XCON.logon3(`🔍 가상 환경 SET: 직접 키 저장 - "${path}"`);
                }
            }
        } else if (path.startsWith("storage.")) {
            XCON.logon3('_localStorage', path, value);

            path = path.substring(8);

            value = localStorage.setItem(path, value);
            return;
        } else if (path.startsWith("global.")) {
            dict = appService?.getRepository();
        } else {
            if (path.startsWith("self.")) {
                path = path.substring(5);
                dict = this.owner.componentData || this.owner.data;
            } else if (path.startsWith("parent.")) {
                path = path.substring(7);
                dict = this.owner.parentController?.componentData || this.owner.parentController?.data;
            } else if (path.startsWith("local.")) {
                path = path.substring(6);
                //dict = this.owner.parentController?.data || this.owner.data;
                dict = this.owner.data;
            } else {
                dict = this.owner.data;
            }
        }

        if (dict) {
            this._setAttributeWithPath(dict, path, value);
        }
    }

    get(path) {
        if (!path) return '';

        if (!this.owner) {
            if (window.XamongServices) {
                const chainService = window.XamongServices.ServiceHelper.getGlobalServiceManager().getService('ChainingService');
                if (chainService && chainService.previewMode) {
                    this.xconData = chainService.previewRepo;
                }
            }

            try {
                const result = XCON.getAttributeWithPath(this.xconData, path);
                return result == null ? '' : result;
            } catch {
                return '';
            }
        }

        let value = null;

        XCON.logon2("========================#### " + path, this.currentSender, this.currentEventArgs, this.owner._currentAction);
        if (path === 'value' && this.currentEventArgs) {
            //XCON.logon2("========================#### value ", this.currentEventArgs?.get('value'), this.currentSender?.tagName,
            //this.owner, this.currentSender, this.currentEventArgs, this.owner.allComponents.get(this.currentEventArgs?.get('componentKey')));

            value = this.currentEventArgs?.get('value');

            return value == null ? '' : value;
        }

        if (path === "map.base") {
            const appService = this.getApplicationService();
            value = appService?.appHost.appBasePath;
        } else if (path.startsWith("storage.")) {
            path = path.substring(8);

            value = localStorage.getItem(path);
            return value;
        } else if (path.startsWith("args.")) {
            path = path.substring(5);

            // 1. 현재 액션의 eventArgs 우선 사용
            let eventArgs = this.owner._currentAction?._eventArgs;

            // 2. DataStore에 설정된 eventArgs 사용
            if (!eventArgs) {
                eventArgs = this.currentEventArgs;
            }

            if (eventArgs) {
                XCON.logon3(`🔍 args 체이닝: path="${path}", eventArgs=`, eventArgs);

                if (typeof eventArgs === 'string' && path === "value") {
                    value = eventArgs;
                } else if (eventArgs instanceof XCON) {
                    value = eventArgs.get(path);
                } else if (typeof eventArgs === 'object') {
                    value = eventArgs[path];
                }

                XCON.logon3(`🔍 args 체이닝 결과: value=`, value);
            } else {
                XCON.warn(`🔍 eventArgs가 없습니다. path="${path}"`);
            }
        } else if (path.startsWith("sender.")) {
            // sender 접두사 처리
            path = path.substring(7);
            const senderObject = this.currentSender;

            if (senderObject) {
                XCON.logon3(`🔍 sender 체이닝: path="${path}", sender=`, senderObject);

                // DOM 요소인 경우 실시간 값 읽기
                if (senderObject.nodeType === Node.ELEMENT_NODE) {
                    value = this._getSenderDOMValue(senderObject, path);
                }
                // 컴포넌트 객체인 경우 속성 접근
                else if (senderObject && typeof senderObject === 'object') {
                    value = this._getSenderComponentValue(senderObject, path);
                }

                XCON.logon3(`🔍 sender 체이닝 결과: value=`, value);
            } else {
                XCON.warn(`🔍 sender 객체가 없습니다. path="${path}"`);
            }
        } else {
            let dict = null;

            // 가상 환경 확인
            const appService = this.getApplicationService();
            const isVirtualMode = appService?.isVirtual?.() || false;

            if (isVirtualMode) {
                // 가상 환경에서는 모든 경로를 Repository에서 찾기
                const repository = appService?.getRepository();
                XCON.logon3(`🔍 가상 환경 모드: 모든 변수를 Repository에서 검색 - path="${path}"`);

                if (repository) {
                    // 직접 path로 찾기 (user, global, app 등)
                    if (repository.contains(path)) {
                        dict = repository;
                        XCON.logon3(`🔍 가상 환경: 직접 키 발견 - "${path}"`);
                    } else {
                        // 점으로 분리된 경로 처리 (user.name, global.title 등)
                        const pathParts = path.split('.');
                        if (pathParts.length > 1 && repository.contains(pathParts[0])) {
                            const rootData = repository.get(pathParts[0]);
                            if (rootData) {
                                dict = rootData;
                                path = pathParts.slice(1).join('.');
                                XCON.logon3(`🔍 가상 환경: 중첩 경로 처리 - root="${pathParts[0]}", subPath="${path}"`);
                            }
                        }
                    }
                }

                if (!dict) {
                    XCON.logon3(`🔍 가상 환경: Repository에서 경로를 찾을 수 없음 - "${path}"`);
                    return null;
                }
            } else if (path.startsWith("global.") || path.startsWith("app.") || path.startsWith("config.") ||
                path.startsWith("map.") || path.startsWith("style.") || path.startsWith("device.") ||
                path.startsWith("current.") || path.startsWith("session.")) {
                const repository = appService?.getRepository();

                //XCON.logon3(`🔍 getApplicationService:`, appService);
                //XCON.logon3(`🔍 getRepository:`, repository);

                if (path.startsWith("global.")) {
                    // global 데이터는 repository의 'global' 키에 저장됨
                    const globalPath = path.substring(7); // "global." 제거
                    const globalData = repository?.get('global');


                    if (globalData) {
                        dict = globalData;
                        path = globalPath;

                    } else {
                        console.warn(`⚠️ [DataStore] global 데이터 없음: globalPath="${globalPath}"`);
                        return null;
                    }
                } else {
                    dict = repository;
                }
            } else if (path.startsWith("parameter.")) {
                path = path.substring(10);
                dict = this.owner.parameter;
                XCON.logon(`🔍 parameter 체이닝: path="${path}", owner.parameter=`, dict, this.owner);
            } else {
                if (path.startsWith("self.")) {
                    path = path.substring(5);
                    dict = this.owner.componentData || this.owner.data;
                    XCON.logon3(`🔍 self 체이닝: path="${path}", owner=`, this.owner);
                    XCON.logon3(`🔍 self 체이닝: componentData=`, this.owner.componentData);
                    XCON.logon3(`🔍 self 체이닝: componentData 키들=`, this.owner.componentData ? Array.from(this.owner.componentData.nameList || []) : 'null');
                } else if (path.startsWith("parent.")) {
                    path = path.substring(7);
                    dict = this.owner.parentController?.componentData || this.owner.parentController?.data;
                } else if (path.startsWith("local.")) {
                    path = path.substring(6);
                    // local 데이터는 현재 owner의 data에 저장됨
                    const currentOwner = window.appHost.getCurrentOwner();
                    if (currentOwner && this.owner.key != 'root') {
                        dict = currentOwner.data;
                    } else {
                        dict = this.owner.data;
                    }
                    XCON.logon3(`🔍 local 체이닝: path="${path}", owner.data=`, dict);
                } else if (path.startsWith("record.")) {
                    dict = this.owner.data;
                    XCON.logon3(`🔍 record 체이닝: path="${path}", owner.data=`, dict);
                } else {
                    if (path.startsWith("item.")) {
                        XCON.logon3(`🔍 item 체이닝: path="${path}", owner.itemData=`, this.owner.itemData, this.currentSender);
                        if (this.owner.itemData) {
                            dict = this.owner.itemData;
                        } else if (this.currentSender && this.currentSender.itemData) {
                            dict = this.currentSender.itemData;
                        } else {
                            dict = this.owner.data;
                        }
                    } else {
                        dict = this.owner.data;
                    }
                }
            }

            if (dict) {
                XCON.logon3(`🔍 _getAttributeWithPath 호출: dict=`, dict, `path="${path}"`);
                value = this._getAttributeWithPath(dict, path);
                XCON.logon3(`🔍 _getAttributeWithPath 결과: value=`, value);
                if (!value) {
                    if (path.startsWith("item.")) {
                        value = this._getAttributeWithPath(dict, path.substring(5));
                    } else {
                        if (!path.startsWith("record.responseData.")) {
                            value = this._getAttributeWithPath(dict, "record.responseData." + path);
                        }
                    }
                }
            }
        }

        // 자몽체인에서는 null/undefined를 빈 문자열로 반환
        return value == null ? '' : value;
    }

    getObject(key) {
        return this.objectHash.get(key);
    }

    setObject(key, value) {
        this.objectHash.set(key, value);
    }

    _getAttributeWithPath(xcon, path) {
        if (!path) return '';

        try {
            const pathParts = path.split('.');
            const result = this._populateAttributeList(xcon, pathParts, 0);
            return result == null ? '' : result;
        } catch (ex) {
            XCON.error('getAttributeWithPath error:', ex);
            return '';
        }
    }

    _populateAttributeList(xcon, pathParts, index) {
        XCON.logon3(`🔍 _populateAttributeList: index=${index}, pathParts=`, pathParts, `xcon=`, xcon);

        if (index === pathParts.length) return xcon;

        const key = pathParts[index];
        let value;

        // XCON 객체인 경우 .isXCON() 메서드 사용
        if (xcon && xcon.isXCON && typeof xcon.isXCON === 'function' && xcon.isXCON()) {
            value = xcon.get(key);
            XCON.logon3(`🔍 XCON.get("${key}")=`, value);

            // app.timestamp인 경우 실시간 타임스탬프 반환
            if (key === 'timestamp') {
                // 현재 처리 중인 경로가 app 컨텍스트인지 확인
                if (this.isAppContext(xcon)) {
                    value = new Date().toLocaleString();
                    XCON.logon3(`🔍 app.timestamp 실시간 생성: "${value}"`);
                }
            }
        }
        // 일반 JavaScript 객체인 경우 직접 속성 접근 (컴포넌트 객체)
        else if (xcon && typeof xcon === 'object') {
            value = xcon[key];
            XCON.logon3(`🔍 객체["${key}"]=`, value, `객체 키들=`, Object.keys(xcon));
        }
        else {
            XCON.logon3(`🔍 xcon이 null이거나 객체가 아님:`, xcon);
            return '';
        }

        if (value instanceof XCON) {
            return this._populateAttributeList(value, pathParts, index + 1);
        } else if (Array.isArray(value)) {
            return value;
        } else if (value && value.type && value.key && value.pos) { // value instanceof XaComponent //value && value.type && value.key && value.pos
            XCON.logon3(`🔍 XaComponent 체이닝: value=`, value);

            if (pathParts.length > index + 1) {
                const nextKey = pathParts[index + 1];

                let v = null;

                // DOM 요소 찾기 (여러 방법 시도)
                let targetElement = document.getElementById(value.key);
                if (!targetElement) {
                    targetElement = document.querySelector(`[data-key="${value.key}"]`);
                }
                if (!targetElement) {
                    targetElement = document.querySelector(`[data-component-key="${value.key}"]`);
                }
                if (!targetElement) {
                    targetElement = document.querySelector(`[data-component="${value.type}"][data-key="${value.key}"]`);
                }

                if (targetElement) {
                    XCON.logon3(`🎯 DOM 요소 발견: ${value.key}`, targetElement.tagName, targetElement);
                    switch (nextKey) {
                        case 'text':
                            // 텍스트 요소에서 값 가져오기
                            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                                //XCON.logon2('1111');
                                v = targetElement.value;
                            } else {
                                // 자식 요소에서 INPUT이나 TEXTAREA 찾기
                                const childInput = targetElement.querySelector('input, textarea');
                                if (childInput) {
                                    //XCON.logon2('2222');
                                    v = childInput.value;
                                    XCON.logon3(`📝 자식 요소에서 텍스트 값 가져오기: ${childInput.tagName} → ${v}`);
                                } else {
                                    const overlayElement = document.querySelector(`[data-polymorph-key="${value.key}"]`);
                                    if (overlayElement) {
                                        if (overlayElement.tagName === 'INPUT' || overlayElement.tagName === 'TEXTAREA') {
                                            //XCON.logon2('3333');
                                            v = overlayElement.value;
                                        } else {
                                            //XCON.logon2('4444');
                                            v = overlayElement.textContent || overlayElement.innerText || '';
                                        }
                                    } else {
                                        //XCON.logon2('5555');
                                        v = targetElement.textContent || targetElement.innerText || '';
                                    }
                                }
                            }
                            XCON.logon3(`📝 텍스트 값 가져오기: ${v}`);
                            break;

                        case 'bgColor':
                            // 배경색 값 가져오기 (CSS 색상을 RGBA 형식으로 변환)
                            const computedStyle = window.getComputedStyle(targetElement);
                            const backgroundColor = computedStyle.backgroundColor;
                            v = convertCssColorToRgbaString(backgroundColor);
                            XCON.logon3(`🎨 배경색 값 가져오기: ${backgroundColor} → ${v}`);
                            break;

                        case 'fgColor':
                            // 글자색 값 가져오기
                            const computedStyleFg = window.getComputedStyle(targetElement);
                            const color = computedStyleFg.color;
                            v = convertCssColorToRgbaString(color);
                            XCON.logon3(`🎨 글자색 값 가져오기: ${color} → ${v}`);
                            break;

                        case 'fontSize':
                            // 폰트 크기 값 가져오기
                            const computedStyleFs = window.getComputedStyle(targetElement);
                            const fontSize = computedStyleFs.fontSize;
                            // px 단위 제거하고 숫자만 반환
                            v = fontSize ? parseInt(fontSize.replace('px', '')) : '';
                            XCON.logon3(`📏 폰트 크기 값 가져오기: ${v}`);
                            break;

                        case 'fontWeight':
                            // 폰트 굵기 값 가져오기
                            const computedStyleFw = window.getComputedStyle(targetElement);
                            const fontWeight = computedStyleFw.fontWeight;
                            v = fontWeight || '';
                            XCON.logon3(`🔤 폰트 굵기 값 가져오기: ${v}`);
                            break;

                        case 'bold':
                            // 굵게 속성 값 가져오기
                            const computedStyleBold = window.getComputedStyle(targetElement);
                            const fontWeightBold = computedStyleBold.fontWeight;
                            v = fontWeightBold === 'bold' || fontWeightBold === '700' || parseInt(fontWeightBold) >= 700;
                            XCON.logon3(`🔤 굵게 속성 값 가져오기: ${v}`);
                            break;

                        case 'textAlign':
                            // 텍스트 정렬 값 가져오기
                            const computedStyleTa = window.getComputedStyle(targetElement);
                            const textAlign = computedStyleTa.textAlign;
                            v = textAlign || '';
                            XCON.logon3(`📐 텍스트 정렬 값 가져오기: ${v}`);
                            break;

                        case 'visible':
                            // 가시성 값 가져오기
                            const computedStyleVis = window.getComputedStyle(targetElement);
                            const display = computedStyleVis.display;
                            const visibility = computedStyleVis.visibility;
                            v = display !== 'none' && visibility !== 'hidden';
                            XCON.logon3(`👁️ 가시성 값 가져오기: ${v}`);
                            break;

                        case 'enabled':
                            // 활성화 상태 값 가져오기
                            let enabledValue = true;

                            // 현재 요소가 INPUT, BUTTON, TEXTAREA인 경우
                            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'BUTTON' || targetElement.tagName === 'TEXTAREA') {
                                enabledValue = !targetElement.disabled;
                            } else {
                                // 자식 요소에서 INPUT, BUTTON, TEXTAREA 찾기
                                const childInput = targetElement.querySelector('input, button, textarea');
                                if (childInput) {
                                    enabledValue = !childInput.disabled;
                                    XCON.logon3(`🔘 자식 요소에서 활성화 상태 확인: ${childInput.tagName} → ${enabledValue}`);
                                }
                            }

                            // opacity도 체크 (0.5 이하면 비활성화로 간주)
                            const computedStyleEn = window.getComputedStyle(targetElement);
                            const opacity = parseFloat(computedStyleEn.opacity);
                            if (opacity <= 0.5) {
                                enabledValue = false;
                            }

                            v = enabledValue;
                            XCON.logon3(`🔘 활성화 상태 값 가져오기: ${v}`);
                            break;

                        case 'pos':
                            // 위치 및 크기 값 가져오기
                            const computedStylePos = window.getComputedStyle(targetElement);
                            const rect = targetElement.getBoundingClientRect();
                            const left = parseInt(computedStylePos.left) || rect.left;
                            const top = parseInt(computedStylePos.top) || rect.top;
                            const width = parseInt(computedStylePos.width) || rect.width;
                            const height = parseInt(computedStylePos.height) || rect.height;
                            v = `${left},${top},${width},${height}`;
                            XCON.logon3(`📍 위치/크기 값 가져오기: ${v}`);
                            break;

                        default:
                            // 기타 속성들은 스타일에서 값 가져오기
                            const computedStyleDefault = window.getComputedStyle(targetElement);
                            if (computedStyleDefault.hasOwnProperty(nextKey)) {
                                v = computedStyleDefault[nextKey] || '';
                                XCON.logon3(`🔧 기타 스타일 값 가져오기: ${nextKey} = ${v}`);
                            } else {
                                // 기본값으로 xcon 객체의 값 사용
                                v = value[nextKey] || '';
                                XCON.warn(`❓ 알 수 없는 속성, 기본값 사용: ${nextKey} = ${v}`);
                            }
                            break;
                    }
                } else {
                    /*
                    Object.keys(value).forEach(key => {
                        if (key === nextKey) {
                            XCON.logon3(`🔍 XaComponent 체이닝: key=${key}, value=`, value[key]);
                            v = value[key];
                        }
                    });
                    */
                    v = value[nextKey] || '';
                    XCON.warn(`⚠️ DOM 요소를 찾을 수 없습니다: ${value.key}`);
                }
                return v;
            }
            return value;
        } else {
            XCON.logon3(`🔍 최종 값 반환: value=`, value);
            return value == null ? '' : value;
        }
    }

    _setAttributeWithPath(xcon, path, value) {
        if (!path) return;

        console.warn('🔗 [체이닝] _setAttributeWithPath', xcon, path, value);
        
        // 이벤트 리스너가 있는지 확인
        const hasListeners = xcon.eventListeners && xcon.eventListeners.size > 0;
        
        // 이전 값 저장 (이벤트 리스너가 있을 때만)
        let oldValue = null;
        if (hasListeners) {
            try {
                oldValue = this._getAttributeWithPath(xcon, path);
            } catch (e) {
                // 경로가 존재하지 않으면 null로 유지
                oldValue = null;
            }
        }

        // 모든 내부 이벤트 억제
        xcon._suppressEventsRecursively();

        try {
            // 실제 데이터 업데이트 수행
            const pathParts = path.split('.');
            this._assignAttributeList(xcon, pathParts, 0, value);
                
            // 이벤트 복구 (하지만 억제된 이벤트들은 발생시키지 않음)
            xcon._clearSuppressedEvents();
            xcon._resumeEventsRecursivelyWithoutFiring();
            
            // setAttributeWithPath 전용 이벤트 발생 (이벤트 리스너가 있을 때만)
            if (hasListeners) {
                const eventData = {
                    type: 'pathUpdate',
                    path: path,
                    key: pathParts[pathParts.length - 1], // 최종 키
                    value: value,
                    oldValue: oldValue,
                    fullPath: path,
                    segments: pathParts,
                    xcon: xcon,
                    timestamp: Date.now()
                };
                
                // 직접 이벤트 발생 (억제 상태 무시)
                xcon._fireEventDirect('pathUpdate', eventData);
                
                // 기존 change 이벤트도 발생 (호환성 유지)
                const changeEventData = {
                    type: oldValue === null ? 'add' : 'update',
                    key: pathParts[pathParts.length - 1],
                    value: value,
                    oldValue: oldValue,
                    path: path,
                    xcon: xcon,
                    timestamp: Date.now()
                };
                
                xcon._fireEventDirect('change', changeEventData);
            }
            
            return {
                path: path,
                value: value,
                oldValue: oldValue,
                segments: pathParts
            };
            
        } catch (error) {
            // 오류 발생 시에도 이벤트 시스템 복구
            xcon._clearSuppressedEvents();
            xcon._resumeEventsRecursivelyWithoutFiring();
            throw error;
        }
    }

    _assignAttributeList(xcon, pathParts, index, value) {
        if (index === pathParts.length - 1) {
            xcon.set(pathParts[index], value);
        } else {
            const key = pathParts[index];

            if (!xcon.contains(key)) {
                if (pathParts[index + 1].startsWith("_items(")) {
                    xcon.add(key, []);
                } else {
                    xcon.add(key, new XCON());
                }
            }

            const obj = xcon.get(key);
            if (obj instanceof XCON) {
                this._assignAttributeList(obj, pathParts, index + 1, value);
            } else if (Array.isArray(obj)) {
                if (pathParts[index + 1].startsWith("_items(")) {
                    const indexStr = pathParts[index + 1].substring("_items(".length, pathParts[index + 1].length - 1);
                    const itemIndex = parseInt(indexStr);
                    this._assignAttributeList(obj[itemIndex], pathParts, index + 2, value);
                }
            } else if (obj && obj.type && obj.key && obj.pos) { //obj instanceof XaComponent
                XCON.logon3('=====================================================================');
                XCON.logon3(`🔍 XaComponent 체이닝: set obj=`, obj);
                XCON.logon3('=====================================================================');
                if (pathParts.length > index + 1) {
                    const nextKey = pathParts[index + 1];

                    let v = null;

                    Object.keys(obj).forEach(key => {
                        if (key === nextKey) {
                            XCON.logon3(`🔍 XaComponent 체이닝: key=${key}, value=`, value);
                            obj[key] = value;
                        }
                    });

                    // DOM 요소 찾기 (여러 방법 시도)
                    let targetElement = document.getElementById(obj.key);
                    if (!targetElement) {
                        targetElement = document.querySelector(`[data-key="${obj.key}"]`);
                    }
                    if (!targetElement) {
                        targetElement = document.querySelector(`[data-component-key="${obj.key}"]`);
                    }
                    if (!targetElement) {
                        targetElement = document.querySelector(`[data-component="${obj.type}"][data-key="${obj.key}"]`);
                    }

                    if (targetElement) {
                        XCON.logon3(`🎯 DOM 요소 발견: ${obj.key}`, targetElement);

                        try {
                            // XCON 색상 형식(r,g,b,a)을 CSS 색상으로 변환
                            const parseXaColor = (colorValue) => {
                                if (!colorValue || typeof colorValue !== 'string') {
                                    return 'transparent';
                                }

                                // 이미 CSS 색상 형식인 경우 그대로 반환
                                if (colorValue.startsWith('#') || colorValue.startsWith('rgb') || colorValue.startsWith('hsl')) {
                                    return colorValue;
                                }

                                // XCON 색상 형식 (r,g,b,a) 파싱
                                const parts = colorValue.split(',').map(v => parseInt(v.trim()));
                                if (parts.length >= 3) {
                                    const r = Math.max(0, Math.min(255, parts[0]));
                                    const g = Math.max(0, Math.min(255, parts[1]));
                                    const b = Math.max(0, Math.min(255, parts[2]));
                                    const a = parts.length >= 4 ? Math.max(0, Math.min(255, parts[3])) / 255 : 1;

                                    return `rgba(${r}, ${g}, ${b}, ${a})`;
                                }

                                return 'transparent';
                            }

                            // 속성별 DOM 업데이트
                            switch (nextKey) {
                                case 'text':
                                    // 텍스트 요소 업데이트
                                    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                                        targetElement.value = String(value);
                                    } else {
                                        // 자식 요소에서 INPUT이나 TEXTAREA 찾기
                                        const childInput = targetElement.querySelector('input, textarea');
                                        if (childInput) {
                                            childInput.value = String(value);
                                            XCON.logon3(`📝 자식 요소에서 텍스트 값 가져오기: ${childInput.tagName} → ${v}`);
                                        } else {
                                            targetElement.textContent = String(value);
                                        }
                                    }
                                    XCON.logon3(`📝 텍스트 업데이트: ${value}`);
                                    break;

                                case 'bgColor':
                                    // 배경색 업데이트 (RGBA 형식을 CSS 색상으로 변환)
                                    const bgColor = parseXaColor(String(value));
                                    targetElement.style.backgroundColor = bgColor;
                                    XCON.logon3(`🎨 배경색 업데이트: ${value} → ${bgColor}`);
                                    break;

                                case 'fgColor':
                                    // 글자색 업데이트
                                    const fgColor = parseXaColor(String(value));
                                    targetElement.style.color = fgColor;
                                    XCON.logon3(`🎨 글자색 업데이트: ${value} → ${fgColor}`);
                                    break;

                                case 'fontSize':
                                    // 폰트 크기 업데이트
                                    targetElement.style.fontSize = String(value) + 'px';
                                    XCON.logon3(`📏 폰트 크기 업데이트: ${value}px`);
                                    break;

                                case 'fontWeight':
                                    // 폰트 굵기 업데이트
                                    targetElement.style.fontWeight = String(value);
                                    XCON.logon3(`🔤 폰트 굵기 업데이트: ${value}`);
                                    break;

                                case 'bold':
                                    // 굵게 속성 업데이트
                                    const boldValue = value === 'true' || value === true || value === 'bold';
                                    targetElement.style.fontWeight = boldValue ? 'bold' : 'normal';
                                    XCON.logon3(`🔤 굵게 속성 업데이트: ${value} → ${boldValue}`);
                                    break;

                                case 'textAlign':
                                    // 텍스트 정렬 업데이트
                                    targetElement.style.textAlign = String(value);
                                    if (obj.type === 'label') {
                                        switch (value) {
                                          case 'center': targetElement.style.justifyContent = 'center'; break;
                                          case 'right': targetElement.style.justifyContent = 'flex-end'; break;
                                          default: targetElement.style.justifyContent = 'flex-start'; break;
                                        }
                                    }                            
                                    XCON.logon3(`📐 텍스트 정렬 업데이트: ${value}`);
                                    break;

                                case 'textVAlign':
                                    // 텍스트 수직 정렬 업데이트
                                    if (obj.type === 'label') {
                                        switch (value) {
                                        case 'top': targetElement.style.alignItems = 'flex-start'; break;
                                        case 'bottom': targetElement.style.alignItems = 'flex-end'; break;
                                        default: targetElement.style.alignItems = 'center'; break;
                                        }
                                    } else {
                                        targetElement.style.alignItems = String(value);
                                    }
                                    XCON.logon3(`📏 텍스트 수직 정렬 업데이트: ${value}`);
                                    break;
                              
                                case 'visible':
                                    // 가시성 업데이트
                                    const visibleValue = value === 'true' || value === true;
                                    if (visibleValue) {
                                        // 보이기: display 속성을 제거하여 원래 값으로 복원
                                        targetElement.style.removeProperty('display');
                                    } else {
                                        // 숨기기: display: none 적용
                                        targetElement.style.display = 'none';
                                    }
                                    XCON.logon3(`👁️ 가시성 업데이트: ${visibleValue}`);
                                    break;

                                case 'enabled':
                                    // 활성화 상태 업데이트
                                    const enabledValue = value === 'true' || value === true;
                                    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'BUTTON' || targetElement.tagName === 'TEXTAREA') {
                                        targetElement.disabled = !enabledValue;
                                    } else {
                                        // 자식 요소에서 INPUT, BUTTON, TEXTAREA 찾기
                                        const childInput = targetElement.querySelector('input, button, textarea');
                                        if (childInput) {
                                            childInput.disabled = !enabledValue;
                                            XCON.logon3(`🔘 자식 요소에서 활성화 상태 확인: ${childInput.tagName} → ${enabledValue}`);
                                        } else {
                                            targetElement.disabled = !enabledValue;
                                            XCON.logon3(`🔘 자식 요소에서 활성화 상태 확인: ${targetElement.tagName} → ${enabledValue}`);
                                        }
                                    }
                                    targetElement.style.opacity = enabledValue ? '1' : '0.5';
                                    XCON.logon3(`🔘 활성화 상태 업데이트: ${value} → ${enabledValue}`);
                                    break;

                                case 'pos':
                                    // 위치 및 크기 업데이트
                                    const posValues = String(value).split(',').map(v => parseInt(v.trim()));
                                    if (posValues.length >= 4) {
                                        targetElement.style.left = posValues[0] + 'px';
                                        targetElement.style.top = posValues[1] + 'px';
                                        targetElement.style.width = posValues[2] + 'px';
                                        targetElement.style.height = posValues[3] + 'px';
                                        XCON.logon3(`📍 위치/크기 업데이트: ${posValues[0]},${posValues[1]},${posValues[2]},${posValues[3]}`);
                                    }
                                    break;

                                case 'placeholder':
                                    // 플레이스홀더 요소 업데이트
                                    if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
                                        targetElement.placeholder = String(value);
                                        XCON.logon3(`📝 플레이스홀더 업데이트: ${value}`);
                                    } else {
                                        // 자식 요소에서 INPUT이나 TEXTAREA 찾기
                                        const childInput = targetElement.querySelector('input, textarea');
                                        if (childInput) {
                                        childInput.placeholder = String(value);
                                        XCON.logon3(`📝 자식 요소에서 플레이스홀더 업데이트: ${childInput.tagName} → ${value}`);
                                        }
                                    }
                                    break;
                              
                                default:
                                    // 기타 속성들은 직접 스타일로 적용 시도
                                    if (targetElement.style.hasOwnProperty(nextKey)) {
                                        targetElement.style[nextKey] = String(value);
                                        XCON.logon3(`🔧 기타 스타일 업데이트: ${nextKey} = ${value}`);
                                    } else {
                                        XCON.warn(`❓ 알 수 없는 속성: ${nextKey}`);
                                    }
                                    break;
                            }
                        } catch (e) {
                            XCON.warn(`❓ 속성 업데이트 오류: ${e}`);
                        }
                    } else {
                        XCON.warn(`⚠️ DOM 요소를 찾을 수 없습니다: ${obj.key}`);
                    }
                }
            }
        }
    }

    clear() {
        if (!this.owner) {
            this.xconData.clear();
        }
    }

    dispose() {
        this.objectHash.clear();
        this.owner = null;
        this.currentSender = null;
    }

    // sender 객체 설정 메서드
    setSender(sender) {
        this.currentSender = sender;
        XCON.logon3(`🔍 DataStore.setSender:`, sender);
    }

    // EventArgs 설정
    setEventArgs(eventArgs) {
        this.currentEventArgs = eventArgs;
        XCON.logon3('🔗 DataStore: eventArgs 설정됨', eventArgs);
    }

    // ApplicationService 가져오기 (XaAction과 동일한 방식)
    getApplicationService() {
        // owner의 playerHost를 통해 ServiceManager 접근
        if (this.owner && this.owner.playerHost) {
            try {
                let serviceManager = window.XamongServices.ServiceManager.services(this.owner.playerHost);
                if (serviceManager) {
                    return serviceManager.getService('ApplicationService');
                }
                serviceManager = this.owner.playerHost.serviceManager;
                if (serviceManager) {
                    return serviceManager.getService('ApplicationService');
                }
            } catch (e) {
                XCON.warn('owner.playerHost를 통한 ApplicationService 접근 실패:', e.message);
            }
        }

        // AppHost를 통해 접근 (fallback)
        if (window.appHost && window.appHost.appService) {
            return window.appHost.appService;
        }

        XCON.warn('ApplicationService를 찾을 수 없습니다. owner:', this.owner);
        return null;
    }

    // app 컨텍스트인지 확인하는 메서드
    isAppContext(xcon) {
        // XCON 객체에서 app 관련 키들이 있는지 확인
        if (xcon && xcon.get && typeof xcon.get === 'function') {
            // app의 기본 속성들이 있는지 확인
            const hasAppKeys = xcon.get('name') || xcon.get('version') || xcon.get('basePath');
            if (hasAppKeys) {
                return true;
            }
        }

        // repository에서 app 경로로 접근하는 경우
        const appService = this.getApplicationService();
        const repository = appService?.getRepository();
        if (repository && xcon === repository) {
            return true;
        }

        return false;
    }

    // DOM 요소에서 sender 값 가져오기
    _getSenderDOMValue(domElement, path) {
        XCON.logon3(`🔍 _getSenderDOMValue: path="${path}", element=`, domElement);

        switch (path) {
            case 'text':
            case 'value':
                // input, textarea 등의 값
                if (domElement.tagName === 'INPUT' || domElement.tagName === 'TEXTAREA') {
                    return domElement.value || '';
                }
                // 다른 요소들의 텍스트 내용
                return domElement.textContent || domElement.innerText || '';

            case 'checked':
                // checkbox, radio button의 체크 상태
                if (domElement.type === 'checkbox' || domElement.type === 'radio') {
                    return domElement.checked;
                }
                return false;

            case 'selected':
                // select option의 선택 상태
                if (domElement.tagName === 'OPTION') {
                    return domElement.selected;
                }
                return false;

            case 'selectedValue':
                // select의 선택된 값
                if (domElement.tagName === 'SELECT') {
                    return domElement.value || '';
                }
                return '';

            case 'id':
                return domElement.id || '';

            case 'className':
                return domElement.className || '';

            case 'tagName':
                return domElement.tagName || '';

            case 'key':
                return domElement.dataset?.key || '';

            default:
                // 기본적으로 속성 또는 데이터 속성 접근
                return domElement.getAttribute(path) ||
                    domElement.dataset?.[path] ||
                    domElement[path] || '';
        }
    }

    // 컴포넌트 객체에서 sender 값 가져오기
    _getSenderComponentValue(component, path) {
        XCON.logon3(`🔍 _getSenderComponentValue: path="${path}", component=`, component);

        // 컴포넌트 타입별 특별 처리
        if (component.type === 'textField' || component.type === 'textView') {
            if (path === 'text' || path === 'value') {
                // DOM에서 실시간 값 읽기 시도
                if (component.key) {
                    const domElement = document.querySelector(`[data-key="${component.key}"] input, [data-key="${component.key}"] textarea`);
                    if (domElement) {
                        return domElement.value || '';
                    }
                }
                // DOM 요소가 없으면 컴포넌트 속성 사용
                return component.text || component.value || '';
            }
        }

        if (component.type === 'checkbox' || component.type === 'radioButton') {
            if (path === 'checked') {
                // DOM에서 실시간 상태 읽기 시도
                if (component.key) {
                    const domElement = document.querySelector(`[data-key="${component.key}"] input[type="checkbox"], [data-key="${component.key}"] input[type="radio"]`);
                    if (domElement) {
                        return domElement.checked;
                    }
                }
                // DOM 요소가 없으면 컴포넌트 속성 사용
                return component.checked || false;
            }
        }

        if (component.type === 'button') {
            if (path === 'text') {
                return component.text || '';
            }
        }

        // 기본적으로 컴포넌트 속성 접근
        return component[path] || '';
    }
}

// ============================================================================
// 4. Token Types & Classes
// ============================================================================
const TokenType = {
    TEXT: 'TEXT',
    VARIABLE_START: 'VARIABLE_START',
    VARIABLE_END: 'VARIABLE_END',
    IDENTIFIER: 'IDENTIFIER',
    DOT: 'DOT',
    COLON: 'COLON',
    FUNCTION_PREFIX: 'FUNCTION_PREFIX',
    ASSIGNMENT_PREFIX: 'ASSIGNMENT_PREFIX',
    FUNCTION_CHAIN: 'FUNCTION_CHAIN',
    PAREN_OPEN: 'PAREN_OPEN',
    PAREN_CLOSE: 'PAREN_CLOSE',
    COMMA: 'COMMA',
    BACKTICK: 'BACKTICK',
    BACKTICK_CONTENT: 'BACKTICK_CONTENT',
    QUESTION: 'QUESTION',
    EQUALS: 'EQUALS',
    FILTER_VALUE: 'FILTER_VALUE',
    PIPE_ARROW: 'PIPE_ARROW',
    SEMICOLON_DOUBLE: 'SEMICOLON_DOUBLE',
    FUNCTION_NAME: 'FUNCTION_NAME',
    PARAMETER_VALUE: 'PARAMETER_VALUE',
    CHAIN_SEPARATOR: 'CHAIN_SEPARATOR',
    STRING_LITERAL: 'STRING_LITERAL',
    NUMBER_LITERAL: 'NUMBER_LITERAL',
    BOOLEAN_LITERAL: 'BOOLEAN_LITERAL',
    WHITESPACE: 'WHITESPACE',
    UNKNOWN: 'UNKNOWN',
    EOF: 'EOF'
};

// ============================================================================
// 4.5. Advanced Nested Expression Parser
// ============================================================================
class NestedExpressionParser {
    constructor() {
        this.maxDepth = 20;
    }

    /**
     * 중첩된 표현식을 안전하게 파싱하는 메서드
     * @param {string} input - 파싱할 입력 문자열
     * @returns {Array} - 파싱된 구조화된 표현식 배열
     */
    parseNestedExpression(input) {
        XCON.logon3(`🔍 NestedExpressionParser 시작: "${input}"`);
        
        const result = this._parseExpression(input, 0);
        XCON.logon3(`🔍 NestedExpressionParser 결과:`, result);
        
        return result;
    }

    /**
     * 재귀적으로 표현식을 파싱하는 메서드
     * @param {string} input - 파싱할 문자열
     * @param {number} depth - 현재 중첩 깊이
     * @returns {Object} - 파싱된 표현식 객체
     */
    _parseExpression(input, depth) {
        if (depth > this.maxDepth) {
            throw new Error(`최대 중첩 깊이(${this.maxDepth})를 초과했습니다.`);
        }

        XCON.logon3(`  ${'  '.repeat(depth)}깊이 ${depth}: "${input}"`);

        // 빈 문자열 처리
        if (!input || input.trim() === '') {
            return { type: 'empty', value: '' };
        }

        // 백틱 문자열 감지 및 처리 (가장 먼저 처리)
        if (input.startsWith('`')) {
            const backtickResult = this._parseBacktickString(input);
            if (backtickResult) {
                return backtickResult;
            }
        }

        // 삼항 연산자 감지 및 처리
        if (this._containsTernaryOperator(input)) {
            return this._parseTernaryExpression(input, depth);
        }

        // 할당 연산자 감지 및 처리
        if (this._containsAssignmentOperator(input)) {
            return this._parseAssignmentExpression(input, depth);
        }

        // 함수 체이닝 감지 및 처리
        if (this._containsFunctionChaining(input)) {
            return this._parseFunctionChainExpression(input, depth);
        }

        // 변수 표현식 처리
        if (this._containsVariableExpression(input)) {
            return this._parseVariableExpression(input, depth);
        }

        // 리터럴 값 처리
        return this._parseLiteralExpression(input);
    }

    /**
     * 삼항 연산자가 포함되어 있는지 확인
     */
    _containsTernaryOperator(input) {
        return this._findTernaryOperatorPosition(input) !== null;
    }

    /**
     * 삼항 연산자의 위치를 찾는 메서드 (중첩 고려, 백틱 문자열 제외)
     */
    _findTernaryOperatorPosition(input) {
        let braceLevel = 0;
        let questionPos = -1;
        let colonPos = -1;
        let inBacktick = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const nextChar = i < input.length - 1 ? input[i + 1] : '';

            // 백틱 문자열 처리
            if (char === '`' && !inBacktick) {
                inBacktick = true;
                continue;
            } else if (char === '`' && inBacktick) {
                inBacktick = false;
                continue;
            }

            // 백틱 내부는 건너뛰기
            if (inBacktick) {
                continue;
            }

            // 중괄호 레벨 추적
            if (char === '{' && nextChar === '{') {
                braceLevel++;
                i++; // {{ 건너뛰기
            } else if (char === '}' && nextChar === '}') {
                braceLevel--;
                i++; // }} 건너뛰기
            }
            // 최상위 레벨에서만 삼항 연산자 찾기
            else if (braceLevel === 0) {
                if (char === '?' && questionPos === -1) {
                    questionPos = i;
                } else if (char === ':' && questionPos !== -1 && colonPos === -1) {
                    colonPos = i;
                }
            }
        }

        if (questionPos !== -1 && colonPos !== -1 && questionPos < colonPos) {
            return { question: questionPos, colon: colonPos };
        }

        return null;
    }

    /**
     * 삼항 연산자 표현식을 파싱
     */
    _parseTernaryExpression(input, depth) {
        const positions = this._findTernaryOperatorPosition(input);
        if (!positions) {
            throw new Error('삼항 연산자 위치를 찾을 수 없습니다.');
        }

        const condition = input.substring(0, positions.question).trim();
        const trueValue = input.substring(positions.question + 1, positions.colon).trim();
        const falseValue = input.substring(positions.colon + 1).trim();

        XCON.logon3(`  ${'  '.repeat(depth)}삼항 연산자 파싱:`);
        XCON.logon3(`  ${'  '.repeat(depth)}  조건: "${condition}"`);
        XCON.logon3(`  ${'  '.repeat(depth)}  참값: "${trueValue}"`);
        XCON.logon3(`  ${'  '.repeat(depth)}  거짓값: "${falseValue}"`);

        return {
            type: 'ternary',
            condition: this._parseExpression(condition, depth + 1),
            trueValue: this._parseExpression(trueValue, depth + 1),
            falseValue: this._parseExpression(falseValue, depth + 1)
        };
    }

    /**
     * 할당 연산자가 포함되어 있는지 확인
     */
    _containsAssignmentOperator(input) {
        return this._findAssignmentOperatorPosition(input) !== -1;
    }

    /**
     * 할당 연산자의 위치를 찾는 메서드 (백틱 문자열 제외)
     */
    _findAssignmentOperatorPosition(input) {
        let braceLevel = 0;
        let inBacktick = false;

        for (let i = 0; i < input.length - 1; i++) {
            const char = input[i];
            const nextChar = input[i + 1];

            // 백틱 문자열 처리
            if (char === '`' && !inBacktick) {
                inBacktick = true;
                continue;
            } else if (char === '`' && inBacktick) {
                inBacktick = false;
                continue;
            }

            // 백틱 내부는 건너뛰기
            if (inBacktick) {
                continue;
            }

            // 중괄호 레벨 추적
            if (char === '{' && nextChar === '{') {
                braceLevel++;
                i++; // {{ 건너뛰기
            } else if (char === '}' && nextChar === '}') {
                braceLevel--;
                i++; // }} 건너뛰기
            }
            // 최상위 레벨에서만 할당 연산자 찾기
            else if (braceLevel === 0 && char === '.' && nextChar === '=') {
                return i;
            }
        }

        return -1;
    }

    /**
     * 할당 연산자 표현식을 파싱
     */
    _parseAssignmentExpression(input, depth) {
        const assignPos = this._findAssignmentOperatorPosition(input);
        if (assignPos === -1) {
            throw new Error('할당 연산자 위치를 찾을 수 없습니다.');
        }

        const variablePath = input.substring(0, assignPos).trim();
        const remaining = input.substring(assignPos + 2).trim();

        XCON.logon3(`  ${'  '.repeat(depth)}할당 연산자 파싱:`);
        XCON.logon3(`  ${'  '.repeat(depth)}  변수: "${variablePath}"`);
        XCON.logon3(`  ${'  '.repeat(depth)}  값: "${remaining}"`);

        // 괄호로 둘러싸인 값 처리 (백틱 문자열 고려)
        let assignValue = remaining;
        if (remaining.startsWith('(')) {
            // 백틱 문자열을 고려하여 괄호 매칭
            let parenLevel = 0;
            let inBacktick = false;
            let foundClosingParen = false;
            let closingParenPos = -1;
            
            for (let i = 0; i < remaining.length; i++) {
                // 백틱 문자열 처리
                if (remaining[i] === '`' && !inBacktick) {
                    inBacktick = true;
                    continue;
                } else if (remaining[i] === '`' && inBacktick) {
                    inBacktick = false;
                    continue;
                }
                
                // 백틱 내부는 괄호 카운트에서 제외
                if (inBacktick) {
                    continue;
                }
                
                if (remaining[i] === '(') {
                    parenLevel++;
                } else if (remaining[i] === ')') {
                    parenLevel--;
                    if (parenLevel === 0 && i === remaining.length - 1) {
                        // 최상위 레벨에서 마지막 문자가 ')'인 경우
                        foundClosingParen = true;
                        closingParenPos = i;
                        break;
                    }
                }
            }
            
            if (foundClosingParen && closingParenPos > 0) {
                assignValue = remaining.substring(1, closingParenPos).trim();
            }
        }

        return {
            type: 'assignment',
            variable: variablePath,
            value: this._parseExpression(assignValue, depth + 1)
        };
    }

    /**
     * 함수 체이닝이 포함되어 있는지 확인
     */
    _containsFunctionChaining(input) {
        let braceLevel = 0;
        let chainCount = 0;

        for (let i = 0; i < input.length - 1; i++) {
            const char = input[i];
            const nextChar = input[i + 1];

            if (char === '{' && nextChar === '{') {
                braceLevel++;
                i++;
            } else if (char === '}' && nextChar === '}') {
                braceLevel--;
                i++;
            } else if (braceLevel === 0 && char === '.' && nextChar === '_') {
                chainCount++;
            }
        }

        return chainCount > 0;
    }

    /**
     * 함수 체이닝 표현식을 파싱
     */
    _parseFunctionChainExpression(input, depth) {
        XCON.logon3(`  ${'  '.repeat(depth)}함수 체이닝 파싱: "${input}"`);

        const parts = this._splitFunctionChain(input);
        const baseVariable = parts.shift(); // 첫 번째 요소는 기본 변수

        return {
            type: 'function_chain',
            baseVariable: baseVariable,
            functions: parts.map(part => this._parseFunctionCall(part))
        };
    }

    /**
     * 함수 체이닝을 분할하는 메서드 (백틱 문자열 제외)
     */
    _splitFunctionChain(input) {
        const parts = [];
        let currentPart = '';
        let braceLevel = 0;
        let parenLevel = 0;
        let inBacktick = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const nextChar = i < input.length - 1 ? input[i + 1] : '';

            // 백틱 문자열 처리
            if (char === '`' && !inBacktick) {
                inBacktick = true;
                currentPart += char;
                continue;
            } else if (char === '`' && inBacktick) {
                inBacktick = false;
                currentPart += char;
                continue;
            }

            // 백틱 내부는 그대로 추가
            if (inBacktick) {
                currentPart += char;
                continue;
            }

            if (char === '{' && nextChar === '{') {
                braceLevel++;
                currentPart += char + nextChar;
                i++;
            } else if (char === '}' && nextChar === '}') {
                braceLevel--;
                currentPart += char + nextChar;
                i++;
            } else if (char === '(') {
                parenLevel++;
                currentPart += char;
            } else if (char === ')') {
                parenLevel--;
                currentPart += char;
            } else if (char === '.' && nextChar === '_' && braceLevel === 0 && parenLevel === 0) {
                // 함수 체이닝 구분점
                if (currentPart.trim()) {
                    parts.push(currentPart.trim());
                }
                currentPart = '';
                i++; // ._ 건너뛰기
            } else {
                currentPart += char;
            }
        }

        if (currentPart.trim()) {
            parts.push(currentPart.trim());
        }

        return parts;
    }

    /**
     * 함수 호출을 파싱
     */
    _parseFunctionCall(functionStr) {
        const parenPos = functionStr.indexOf('(');
        if (parenPos === -1) {
            return {
                name: functionStr,
                parameters: []
            };
        }

        const functionName = functionStr.substring(0, parenPos).trim();
        const paramStr = functionStr.substring(parenPos + 1, functionStr.lastIndexOf(')')).trim();

        let parameters = [];
        if (paramStr) {
            parameters = this._splitParameters(paramStr);
        }

        return {
            name: functionName,
            parameters: parameters
        };
    }

    /**
     * 매개변수를 분할하는 메서드 (백틱 문자열 제외)
     */
    _splitParameters(paramStr) {
        const params = [];
        let currentParam = '';
        let braceLevel = 0;
        let parenLevel = 0;
        let inQuotes = false;
        let quoteChar = '';
        let inBacktick = false;

        for (let i = 0; i < paramStr.length; i++) {
            const char = paramStr[i];
            const nextChar = i < paramStr.length - 1 ? paramStr[i + 1] : '';

            // 백틱 문자열 처리
            if (char === '`' && !inBacktick) {
                inBacktick = true;
                currentParam += char;
                continue;
            } else if (char === '`' && inBacktick) {
                inBacktick = false;
                currentParam += char;
                continue;
            }

            // 백틱 내부는 그대로 추가
            if (inBacktick) {
                currentParam += char;
                continue;
            }

            if (!inQuotes) {
                if (char === '"' || char === "'") {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === '{' && nextChar === '{') {
                    braceLevel++;
                    currentParam += char + nextChar;
                    i++;
                    continue;
                } else if (char === '}' && nextChar === '}') {
                    braceLevel--;
                    currentParam += char + nextChar;
                    i++;
                    continue;
                } else if (char === '(') {
                    parenLevel++;
                } else if (char === ')') {
                    parenLevel--;
                } else if (char === ',' && braceLevel === 0 && parenLevel === 0) {
                    params.push(currentParam.trim());
                    currentParam = '';
                    continue;
                }
            } else {
                if (char === quoteChar && (i === 0 || paramStr[i - 1] !== '\\')) {
                    inQuotes = false;
                    quoteChar = '';
                }
            }

            currentParam += char;
        }

        if (currentParam.trim()) {
            params.push(currentParam.trim());
        }

        return params;
    }

    /**
     * 변수 표현식이 포함되어 있는지 확인
     */
    _containsVariableExpression(input) {
        return input.includes('{{') && input.includes('}}');
    }

    /**
     * 변수 표현식을 파싱
     */
    _parseVariableExpression(input, depth) {
        XCON.logon3(`  ${'  '.repeat(depth)}변수 표현식 파싱: "${input}"`);

        // 중첩된 변수들을 추출
        const nestedVariables = this._extractNestedVariables(input, depth);

        return {
            type: 'variable_expression',
            raw: input,
            nestedVariables: nestedVariables
        };
    }

    /**
     * 중첩된 변수들을 추출 (백틱 문자열 제외)
     */
    _extractNestedVariables(input, depth) {
        const variables = [];
        let i = 0;
        let inBacktick = false;

        while (i < input.length) {
            // 백틱 문자열 처리
            if (input[i] === '`' && !inBacktick) {
                inBacktick = true;
                i++;
                continue;
            } else if (input[i] === '`' && inBacktick) {
                inBacktick = false;
                i++;
                continue;
            }

            // 백틱 내부는 변수 추출에서 제외
            if (inBacktick) {
                i++;
                continue;
            }

            if (i < input.length - 1 && input[i] === '{' && input[i + 1] === '{') {
                const varStart = i + 2;
                let braceCount = 1;
                let varEnd = varStart;
                let inBacktickInVar = false;

                while (varEnd < input.length - 1 && braceCount > 0) {
                    // 변수 표현식 내부의 백틱 처리
                    if (input[varEnd] === '`' && !inBacktickInVar) {
                        inBacktickInVar = true;
                        varEnd++;
                        continue;
                    } else if (input[varEnd] === '`' && inBacktickInVar) {
                        inBacktickInVar = false;
                        varEnd++;
                        continue;
                    }

                    // 백틱 내부는 중괄호 카운트에서 제외
                    if (inBacktickInVar) {
                        varEnd++;
                        continue;
                    }

                    if (input[varEnd] === '{' && input[varEnd + 1] === '{') {
                        braceCount++;
                        varEnd += 2;
                    } else if (input[varEnd] === '}' && input[varEnd + 1] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            break;
                        }
                        varEnd += 2;
                    } else {
                        varEnd++;
                    }
                }

                if (braceCount === 0 && varEnd < input.length - 1) {
                    const variableContent = input.substring(varStart, varEnd);
                    XCON.logon3(`  ${'  '.repeat(depth)}  중첩 변수 발견: "${variableContent}"`);
                    
                    const parsed = this._parseExpression(variableContent, depth + 1);
                    if (parsed.type === 'string' && parsed.value !== '' && parsed.value === variableContent) {
                        parsed.type = 'identifier';
                    }

                    variables.push({
                        start: i,
                        end: varEnd + 2,
                        content: variableContent,
                        parsed: parsed
                    });

                    i = varEnd + 2;
                } else {
                    i++;
                }
            } else {
                i++;
            }
        }

        return variables;
    }

    /**
     * 백틱 문자열을 파싱하는 메서드
     * 백틱으로 감싼 문자열은 순수 문자열로 인식 (따옴표, 특수문자, 엔터 등 모든 기호 포함)
     */
    _parseBacktickString(input) {
        if (!input.startsWith('`')) {
            return null;
        }

        let i = 1; // 첫 번째 백틱 건너뛰기
        let content = '';
        let foundClosingBacktick = false;

        while (i < input.length) {
            if (input[i] === '`') {
                // 닫는 백틱 발견
                foundClosingBacktick = true;
                break;
            }
            // 백틱 내부의 모든 문자는 그대로 포함 (이스케이프 처리 없음)
            content += input[i];
            i++;
        }

        if (!foundClosingBacktick) {
            // 닫는 백틱이 없으면 백틱 문자열이 아님
            return null;
        }

        XCON.logon3(`백틱 문자열 파싱: "${content}"`);
        
        return {
            type: 'string',
            value: content
        };
    }

    /**
     * 리터럴 표현식을 파싱
     */
    _parseLiteralExpression(input) {
        const trimmed = input.trim();
        
        // 빈 괄호 처리 - 자몽체인에서는 빈 문자열
        if (trimmed === '()' || trimmed === '') {
            return {
                type: 'string',
                value: ''
            };
        }

        // 숫자 체크
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return {
                type: 'number',
                value: parseFloat(trimmed)
            };
        }

        // 불린 체크
        const lowerTrimmed = trimmed.toLowerCase();
        if (lowerTrimmed === 'true' || lowerTrimmed === 'false') {
            return {
                type: 'boolean',
                value: lowerTrimmed === 'true'
            };
        }

        // 문자열 리터럴 체크 (따옴표로 감싸진 경우)
        if ((input.startsWith('"') && input.endsWith('"')) || 
            (input.startsWith("'") && input.endsWith("'"))) {
            return {
                type: 'string',
                value: input.substring(1, input.length - 1)
            };
        }

        // 변수 패턴 체크 (점이 포함된 경우만 변수로 처리)
        if (trimmed.includes('.') || trimmed.startsWith('args.') || trimmed.startsWith('sender.') || 
            trimmed.startsWith('global.') || trimmed.startsWith('app.') || trimmed.startsWith('user.') ||
            trimmed.startsWith('system.') || trimmed.startsWith('config.') || trimmed.startsWith('map.') ||
            trimmed.startsWith('style.') || trimmed.startsWith('device.') || trimmed.startsWith('current.') ||
            trimmed.startsWith('session.') || trimmed.startsWith('parameter.') || trimmed.startsWith('self.') ||
            trimmed.startsWith('parent.') || trimmed.startsWith('local.') || trimmed.startsWith('item.')) {
            return {
                type: 'identifier',
                value: trimmed
            };
        }

        // 자몽체인 특성: 기본적으로 문자열로 처리 (따옴표 없어도)
        return {
            type: 'string',
            value: trimmed
        };
    }
}

class Token {
    constructor(type, value, startPos, endPos, line, column) {
        this.type = type;
        this.value = value;
        this.startPosition = startPos;
        this.endPosition = endPos;
        this.line = line;
        this.column = column;
        this.metadata = new Map();
    }

    get length() {
        return this.endPosition - this.startPosition;
    }

    toString() {
        return `${this.type}(${this.value}) [${this.startPosition}-${this.endPosition}] L${this.line}:C${this.column}`;
    }
}

class TokenizeResult {
    constructor() {
        this.tokens = [];
        this.errors = [];
        this.warnings = [];
        this.statistics = new Map();
    }

    addError(message, position, line, column) {
        this.errors.push(`[${line}:${column}] ${message} (pos: ${position})`);
    }

    addWarning(message, position, line, column) {
        this.warnings.push(`[${line}:${column}] ${message} (pos: ${position})`);
    }

    calculateStatistics() {
        this.statistics.set('TotalTokens', this.tokens.length);

        const tokenTypeCounts = new Map();
        this.tokens.forEach(token => {
            tokenTypeCounts.set(token.type, (tokenTypeCounts.get(token.type) || 0) + 1);
        });
        this.statistics.set('TokenTypes', tokenTypeCounts);

        this.statistics.set('VariableCount', this.tokens.filter(t => t.type === TokenType.VARIABLE_START).length);
        this.statistics.set('FunctionCount', this.tokens.filter(t => t.type === TokenType.FUNCTION_PREFIX).length);
        this.statistics.set('ChainCount', this.tokens.filter(t => t.type === TokenType.FUNCTION_CHAIN).length);
        this.statistics.set('BacktickCount', this.tokens.filter(t => t.type === TokenType.BACKTICK).length);

        this.statistics.set('HasChaining', this.tokens.some(t => t.type === TokenType.FUNCTION_CHAIN));
        this.statistics.set('MaxChainLength', this._calculateMaxChainLength());

        const functionNames = new Map();
        this.tokens.filter(t => t.type === TokenType.FUNCTION_NAME).forEach(token => {
            functionNames.set(token.value, (functionNames.get(token.value) || 0) + 1);
        });
        this.statistics.set('FunctionUsage', functionNames);
    }

    _calculateMaxChainLength() {
        let maxLength = 0;
        let currentLength = 0;

        for (const token of this.tokens) {
            if (token.type === TokenType.FUNCTION_PREFIX) {
                currentLength++;
            } else if (token.type === TokenType.VARIABLE_END ||
                (token.type !== TokenType.FUNCTION_NAME &&
                    token.type !== TokenType.PAREN_OPEN &&
                    token.type !== TokenType.PAREN_CLOSE &&
                    token.type !== TokenType.PARAMETER_VALUE)) {
                if (currentLength > maxLength) {
                    maxLength = currentLength;
                }
                currentLength = 0;
            }
        }

        return maxLength;
    }
}

// ============================================================================
// 5. Enhanced Inline Function Processor
// ============================================================================
class EnhancedInlineFunctionProcessor {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.random = Math.random;
    }

    executeFunction(variablePath, functionName, parameters) {
        const currentValue = this.dataStore.get(variablePath);

        switch (functionName.toLowerCase()) {
            // 기본 함수들
            case 'isempty':
            case 'empty':
                return this._isEmpty(currentValue);
            case 'isnoempty':
            case 'isnotempty':
            case 'noempty':
            case 'notempty':
                return !this._isEmpty(currentValue);
            case 'length':
            case 'len':
            case 'count':
                return this._getLength(currentValue);
            case 'setvalue':
            case '=':
            case 'set':
                return this._setValue(variablePath, currentValue, parameters);

            case 'default':
                return this._defaultValue(currentValue, parameters);
    
            // 수학 연산
            case 'add':
                if (Array.isArray(currentValue)) {
                    return this._addItem(currentValue, parameters);
                } else {
                    return this._mathAdd(currentValue, parameters);
                }
            case '+':
                return this._mathAdd(currentValue, parameters);
            case 'subtract':
            case 'sub':
            case '-':
                return this._mathSubtract(currentValue, parameters);
            case 'multiply':
            case 'mul':
            case '*':
                return this._mathMultiply(currentValue, parameters);
            case 'divide':
            case 'div':
            case '/':
                return this._mathDivide(currentValue, parameters);
            case 'mod':
            case '%':
            case 'modulo':
                return this._mathMod(currentValue, parameters);
            case 'power':
            case 'pow':
            case '^':
                return this._mathPower(currentValue, parameters);
            case 'sqrt':
            case 'squareroot':
                return this._mathSqrt(currentValue);
            case 'abs':
            case 'absolute':
                return this._mathAbs(currentValue);
            case 'round':
                return this._mathRound(currentValue, parameters);
            case 'floor':
                return this._mathFloor(currentValue);
            case 'ceiling':
            case 'ceil':
                return this._mathCeiling(currentValue);
            case 'trunc':
                return this._mathTrunc(currentValue);    
            case 'min':
                return this._mathMin(currentValue, parameters);
            case 'max':
                return this._mathMax(currentValue, parameters);
            case 'toLocalestring':
                return this._numberToLocaleString(currentValue);    
    
            // 문자열 함수들
            case 'upper':
            case 'toupper':
            case 'uppercase':
                return this._stringUpper(currentValue);
            case 'lower':
            case 'tolower':
            case 'lowercase':
                return this._stringLower(currentValue);
            case 'trim':
                return this._stringTrim(currentValue);
            case 'trimstart':
            case 'ltrim':
                return this._stringTrimStart(currentValue);
            case 'trimend':
            case 'rtrim':
                return this._stringTrimEnd(currentValue);
            case 'tostring':
                return this._stringToString(currentValue);    
            case 'tonumber':
                return this._stringToNumber(currentValue);    
            case 'substring':
            case 'substr':
                return this._stringSubstring(currentValue, parameters);
            case 'left':
                return this._stringLeft(currentValue, parameters);
            case 'right':
                return this._stringRight(currentValue, parameters);
            case 'replace':
                return this._stringReplace(currentValue, parameters);
            case 'contains':
            case 'includes':
                    return this._stringContains(currentValue, parameters);
            case 'startswith':
            case 'starts':
                return this._stringStartsWith(currentValue, parameters);
            case 'endswith':
            case 'ends':
                return this._stringEndsWith(currentValue, parameters);
            case 'split':
                return this._stringSplit(currentValue, parameters);
            case 'join':
                return this._stringJoin(currentValue, parameters);
    
            // 날짜/시간 함수들
            case 'now':
                return new Date();
            case 'today':
                return new Date(new Date().toDateString());
            case 'adddays':
                return this._dateAddDays(currentValue, parameters);
            case 'addhours':
                return this._dateAddHours(currentValue, parameters);
            case 'format':
            case 'dateformat':
                return this._dateFormat(currentValue, parameters);
            case 'year':
                return this._dateGetYear(currentValue);
            case 'month':
                return this._dateGetMonth(currentValue);
            case 'day':
                return this._dateGetDay(currentValue);

            // 논리 연산
            case 'and':
            case '&&':
                return this._logicalAnd(currentValue, parameters);
            case 'or':
            case '||':
                return this._logicalOr(currentValue, parameters);
            case 'not':
            case '!':
                return this._logicalNot(currentValue);
            case 'equals':
            case 'eq':
            case '==':
                return this._logicalEquals(currentValue, parameters);
            case 'greaterthan':
            case 'gt':
            case '>':
                return this._logicalGreaterThan(currentValue, parameters);
            case 'greaterthanorequal':
            case 'gte':
            case '>=':
                return this._logicalGreaterThanOrEqual(currentValue, parameters);
            case 'lessthan':
            case 'lt':
            case '<':
                return this._logicalLessThan(currentValue, parameters);
            case 'lessthanorequal':
            case 'lte':
            case '<=':
                return this._logicalLessThanOrEqual(currentValue, parameters);
            case 'notequals':
            case 'neq':
            case 'ne':
            case '!=':
                return this._logicalNotEquals(currentValue, parameters);
                
            // 정규식 함수들
            case 'matches':
                return this._stringMatches(currentValue, parameters);       // 정규식이 문자열과 매칭되는지 확인 (boolean 반환)
            case 'match':
                return this._stringMatch(currentValue, parameters);           // 정규식 매칭 결과 반환 (첫 번째 매칭 문자열 또는 null)
            case 'matchall':
                return this._stringMatchAll(currentValue, parameters);        // 모든 정규식 매칭 결과를 배열로 반환
            case 'matchfirst':
                return this._stringMatchFirst(currentValue, parameters);      // 첫 번째 매칭 결과 반환
            case 'matchlast':
                return this._stringMatchLast(currentValue, parameters);       // 마지막 매칭 결과 반환

            // 문자열 연결 함수
            case 'concat':
            case 'concatenate':
                return this._stringConcat(currentValue, parameters);

            // 배열/컬렉션 함수들
            case 'items':
                return this._arrayItems(currentValue, parameters);
            case 'first':
                return this._arrayFirst(currentValue);
            case 'last':
                return this._arrayLast(currentValue);
            case 'at':
            case 'index':
                return this._arrayAt(currentValue, parameters);
            case 'slice':
                return this._arraySlice(currentValue, parameters);
            case 'take':
                return this._arrayTake(currentValue, parameters);
            case 'skip':
                return this._arraySkip(currentValue, parameters);
            case 'findby':
                return this._arrayFindBy(currentValue, parameters);
    
            // 변환 함수들
            case 'toint':
            case 'int':
                return this._convertToInt(currentValue);
            case 'todouble':
            case 'double':
            case 'float':
                return this._convertToDouble(currentValue);
            case 'tobool':
            case 'bool':
            case 'boolean':
                return this._convertToBool(currentValue);

            // 유틸리티 함수들
            case 'random':
            case 'rand':
                return this._utilRandom(parameters);
            case 'guid':
            case 'uuid':
                return this._generateGuid();
            case 'isnull':
                return currentValue == null;
            case 'isnotnull':
                return currentValue != null;

            // 조건부 함수들
            case 'if':
            case 'ternary':
                return this._conditionalIf(currentValue, parameters);
            case 'switch':
            case 'case':
                return this._conditionalSwitch(currentValue, parameters);
              
            // render 함수
            case 'render':
                return this._render(variablePath, currentValue);
                
            // eval 함수
            case 'eval':
                return this._eval(variablePath, currentValue, parameters);

            default:
                //throw new Error(`지원하지 않는 인라인 함수: ${functionName}`);
                return `지원하지 않는 인라인 함수: ${functionName}`;
        }
    }

    // 기본 함수들 구현
    _isEmpty(value) {
        if (value == null) return true;
        if (typeof value === 'string') return value === '';
        if (Array.isArray(value)) return value.length === 0;
        return false;
    }

    _getLength(value) {
        if (value == null) return 0;
        if (typeof value === 'string') return value.length;
        if (Array.isArray(value)) return value.length;
        return value.toString().length;
    }

    _defaultValue(value, parameters) {
        if (parameters.length === 0) return value;
        if (value == null) {
            return parameters[0].trim();
        }
        return value;
    }

    _setValue(variablePath, currentValue, parameters) {
        if (parameters.length === 0) return '';
        let newValue = parameters.join(',').trim();
        
        // undefined를 빈 문자열로 변환
        if (newValue === 'undefined' || newValue === 'null') {
            newValue = '';
        }

        XCON.logon4(`setValue: ${variablePath} = ${currentValue} -> ${newValue}`);

        if (newValue.startsWith('(object:')) {
            const obj = this.dataStore.getObject(newValue);
            this.dataStore.set(variablePath, obj);
        } else if (newValue.startsWith('{') && newValue.endsWith('}')) {
            try {
                this.dataStore.set(variablePath, XCON.fromJSON(newValue));
            } catch (e) {
                this.dataStore.set(variablePath, newValue);
            }
        } else {
            this.dataStore.set(variablePath, newValue);
        }

        return newValue;
    }

    // 수학 연산 구현
    _mathAdd(value, parameters) {
        if (parameters.length === 0) return value;

        const current = this._convertToDouble(value);
        let result = current;

        for (const param of parameters) {
            const addValue = this._convertToDouble(param.trim());
            result += addValue;
        }

        return Number.isInteger(result) ? result : result;
    }

    _mathSubtract(value, parameters) {
        if (parameters.length === 0) return value;
        let result = this._convertToDouble(value);

        for (const param of parameters) {
            const subValue = this._convertToDouble(param.trim());
            result -= subValue;
        }

        return Number.isInteger(result) ? result : result;
    }

    _mathMultiply(value, parameters) {
        if (parameters.length === 0) return value;
        let result = this._convertToDouble(value);

        for (const param of parameters) {
            const mulValue = this._convertToDouble(param.trim());
            result *= mulValue;
        }

        return Number.isInteger(result) ? result : result;
    }

    _mathDivide(value, parameters) {
        if (parameters.length === 0) return value;
        let result = this._convertToDouble(value);

        for (const param of parameters) {
            const divValue = this._convertToDouble(param.trim());
            if (divValue === 0) throw new Error('0으로 나눌 수 없습니다.');
            result /= divValue;
        }

        return Number.isInteger(result) ? result : result;
    }

    _mathMod(value, parameters) {
        if (parameters.length === 0) return value;
        const current = this._convertToDouble(value);
        const modValue = this._convertToDouble(parameters[0].trim());
        if (modValue === 0) throw new Error('0으로 나머지 연산을 할 수 없습니다.');
        return current % modValue;
    }

    _mathPower(value, parameters) {
        if (parameters.length === 0) return value;
        const baseValue = this._convertToDouble(value);
        const exponent = this._convertToDouble(parameters[0].trim());
        return Math.pow(baseValue, exponent);
    }

    _mathSqrt(value) {
        return Math.sqrt(this._convertToDouble(value));
    }

    _mathAbs(value) {
        return Math.abs(this._convertToDouble(value));
    }

    _mathRound(value, parameters) {
        const current = this._convertToDouble(value);
        let digits = 0;
        if (parameters.length > 0) {
            digits = parseInt(parameters[0].trim()) || 0;
        }
        return Number(current.toFixed(digits));
    }

    _mathFloor(value) {
        return Math.floor(this._convertToDouble(value));
    }

    _mathCeiling(value) {
        return Math.ceil(this._convertToDouble(value));
    }

    _mathTrunc(value) {
        return Math.trunc(this._convertToDouble(value));
    }

    _mathMin(value, parameters) {
        const values = [this._convertToDouble(value)];
        for (const param of parameters) {
            values.push(this._convertToDouble(param.trim()));
        }
        return Math.min(...values);
    }

    _mathMax(value, parameters) {
        const values = [this._convertToDouble(value)];
        for (const param of parameters) {
            values.push(this._convertToDouble(param.trim()));
        }
        return Math.max(...values);
    }

    _numberToLocaleString(value) {
        return Number(value).toLocaleString();
    }

    // 문자열 함수들 구현
    _stringUpper(value) {
        return (value?.toString() || '').toUpperCase();
    }

    _stringLower(value) {
        return (value?.toString() || '').toLowerCase();
    }

    _stringTrim(value) {
        return (value?.toString() || '').trim();
    }

    _stringTrimStart(value) {
        return (value?.toString() || '').trimStart();
    }

    _stringTrimEnd(value) {
        return (value?.toString() || '').trimEnd();
    }

    _stringToString(value) {
        return (value?.toString() || '');
    }

    _stringToNumber(value) {    
        return Number(value?.toString() || 0);
    }

    _stringSubstring(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return str;

        if (parameters.length === 1) {
            const start = parseInt(parameters[0].trim());
            if (start < 0 || start >= str.length) return '';
            return str.substring(start);
        } else if (parameters.length >= 2) {
            const start = parseInt(parameters[0].trim());
            let length = parseInt(parameters[1].trim());
            if (start < 0 || start >= str.length) return '';
            if (start + length > str.length) length = str.length - start;
            if (length <= 0) return '';
            return str.substring(start, start + length);
        }
        return str;
    }

    _stringLeft(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return str;
        const length = parseInt(parameters[0].trim());
        if (length <= 0) return '';
        return str.length <= length ? str : str.substring(0, length);
    }

    _stringRight(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return str;
        const length = parseInt(parameters[0].trim());
        if (length <= 0) return '';
        return str.length <= length ? str : str.substring(str.length - length);
    }

    _stringReplace(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length < 2) return str;
        const oldValue = parameters[0].trim();
        const newValue = parameters[1].trim();
        return str.replaceAll(oldValue, newValue);
    }

    _stringContains(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return false;
        return str.includes(parameters[0].trim());
    }

    _stringStartsWith(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return false;
        return str.startsWith(parameters[0].trim());
    }

    _stringEndsWith(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return false;
        return str.endsWith(parameters[0].trim());
    }

    _stringSplit(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return [str];
        const separator = parameters[0].trim();
        return str.split(separator);
    }

    _stringJoin(value, parameters) {
        if (Array.isArray(value)) {
            const separator = parameters.length > 0 ? parameters[0].trim() : '';
            return value.join(separator);
        }
        return value?.toString() || '';
    }

    // 정규식 함수들 구현
    _stringMatches(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return false;
        try {
            const pattern = parameters[0].trim();
            const regex = new RegExp(pattern);
            return regex.test(str);
        } catch (e) {
            return false;
        }
    }

    _stringMatch(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return null;
        try {
            const pattern = parameters[0].trim();
            const regex = new RegExp(pattern);
            const match = str.match(regex);
            return match ? match[0] : null;
        } catch (e) {
            return null;
        }
    }

    _stringMatchAll(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return [];
        try {
            const pattern = parameters[0].trim();
            const regex = new RegExp(pattern, 'g');
            const matches = str.matchAll(regex);
            const results = [];
            for (const match of matches) {
                results.push(match[0]);
            }
            return results;
        } catch (e) {
            return [];
        }
    }

    _stringMatchFirst(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return null;
        try {
            const pattern = parameters[0].trim();
            const regex = new RegExp(pattern);
            const match = str.match(regex);
            return match ? match[0] : null;
        } catch (e) {
            return null;
        }
    }

    _stringMatchLast(value, parameters) {
        const str = value?.toString() || '';
        if (parameters.length === 0) return null;
        try {
            const pattern = parameters[0].trim();
            const regex = new RegExp(pattern, 'g');
            const matches = Array.from(str.matchAll(regex));
            return matches.length > 0 ? matches[matches.length - 1][0] : null;
        } catch (e) {
            return null;
        }
    }

    // 날짜/시간 함수들 구현
    _dateAddDays(value, parameters) {
        const date = this._tryParseDate(value);
        if (!date || parameters.length === 0) return value;
        const days = parseFloat(parameters[0].trim());
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    _dateAddHours(value, parameters) {
        const date = this._tryParseDate(value);
        if (!date || parameters.length === 0) return value;
        const hours = parseFloat(parameters[0].trim());
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    _dateFormat(value, parameters) {
        const date = this._tryParseDate(value);
        if (!date) return value;
        if (parameters.length === 0) return date.toString();

        // 간단한 형식 지원
        const format = parameters[0].trim();
        return this._formatDate(date, format);
    }

    _dateGetYear(value) {
        const date = this._tryParseDate(value);
        return date ? date.getFullYear() : 0;
    }

    _dateGetMonth(value) {
        const date = this._tryParseDate(value);
        return date ? date.getMonth() + 1 : 0;
    }

    _dateGetDay(value) {
        const date = this._tryParseDate(value);
        return date ? date.getDate() : 0;
    }

    _tryParseDate(value) {
        if (value instanceof Date) return value;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    _formatDate(date, format) {
        // 기본적인 형식 지원
        return format
            .replace('yyyy', date.getFullYear().toString())
            .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
            .replace('dd', date.getDate().toString().padStart(2, '0'))
            .replace('HH', date.getHours().toString().padStart(2, '0'))
            .replace('mm', date.getMinutes().toString().padStart(2, '0'))
            .replace('ss', date.getSeconds().toString().padStart(2, '0'));
    }

    // 논리 연산 구현
    _logicalAnd(value, parameters) {
        let current = this._convertToBool(value);
        for (const param of parameters) {
            current = current && this._convertToBool(param.trim());
        }
        return current;
    }

    _logicalOr(value, parameters) {
        let current = this._convertToBool(value);
        for (const param of parameters) {
            current = current || this._convertToBool(param.trim());
        }
        return current;
    }

    _logicalNot(value) {
        return !this._convertToBool(value);
    }

    _logicalEquals(value, parameters) {
        if (parameters.length === 0) return false;
        const valueStr = value?.toString() || '';
        const compareStr = parameters[0].trim();
        const result = valueStr.toLowerCase() === compareStr.toLowerCase();

        return result;
    }

    _logicalGreaterThan(value, parameters) {
        if (parameters.length === 0) return false;
        const current = this._convertToDouble(value);
        const compare = this._convertToDouble(parameters[0].trim());
        return current > compare;
    }

    _logicalLessThan(value, parameters) {
        if (parameters.length === 0) return false;
        const current = this._convertToDouble(value);
        const compare = this._convertToDouble(parameters[0].trim());
        return current < compare;
    }

    _logicalGreaterThanOrEqual(value, parameters) {
        if (parameters.length === 0) return false;
        const current = this._convertToDouble(value);
        const compare = this._convertToDouble(parameters[0].trim());
        return current >= compare;
    }

    _logicalLessThanOrEqual(value, parameters) {
        if (parameters.length === 0) return false;
        const current = this._convertToDouble(value);
        const compare = this._convertToDouble(parameters[0].trim());
        return current <= compare;
    }

    _logicalNotEquals(value, parameters) {
        if (parameters.length === 0) return true;
        const valueStr = value?.toString() || '';
        const compareStr = parameters[0].trim();
        return valueStr.toLowerCase() !== compareStr.toLowerCase();
    }

    _stringConcat(value, parameters) {
        let result = value?.toString() || '';
        for (const param of parameters) {
            result += param.trim();
        }
        return result;
    }

    _arraySlice(value, parameters) {
        if (parameters.length === 0) return value;
        const start = parseInt(parameters[0].trim());
        const end = parseInt(parameters[1].trim());
        return value.slice(start, end);
    }

    _arrayTake(value, parameters) {
        if (parameters.length === 0) return value;
        const count = parseInt(parameters[0].trim());
        return value.slice(0, count);
    }

    _arraySkip(value, parameters) {
        if (parameters.length === 0) return value;
        const count = parseInt(parameters[0].trim());
        return value.slice(count);
    }

    _arrayFindBy(value, parameters) {
        if (parameters.length === 0) return value;
        const key = parameters[0].trim();
        const val = parameters[1].trim();
        return value.find(item => item[key] === val);
    }

    // 배열 함수들 구현
    _arrayItems(value, parameters) {
        return this._arrayAt(value, parameters);
    }

    _arrayFirst(value) {
        if (Array.isArray(value) && value.length > 0) return value[0];
        const str = value?.toString() || '';
        return str.length > 0 ? str[0] : null;
    }

    _arrayLast(value) {
        if (Array.isArray(value) && value.length > 0) return value[value.length - 1];
        const str = value?.toString() || '';
        return str.length > 0 ? str[str.length - 1] : null;
    }

    _arrayAt(value, parameters) {
        if (parameters.length === 0) return null;
        const index = parseInt(parameters[0].trim());

        if (Array.isArray(value)) {
            return (index >= 0 && index < value.length) ? value[index] : null;
        } else {
            const str = value?.toString() || '';
            return (index >= 0 && index < str.length) ? str[index] : null;
        }
    }

    _addItem(value, parameters) {
        if (Array.isArray(value)) {
            value.push(...parameters);
        }
        return value;
    }

    // 변환 함수들 구현
    _convertToDouble(value) {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    _convertToInt(value) {
        const num = parseInt(value);
        return isNaN(num) ? 0 : num;
    }

    _convertToBool(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const str = value.toLowerCase();
            return str === 'true' || str === '1' || str === 'yes' || str === 'y' || str === 'on';
        }
        return !!value;
    }

    // 유틸리티 함수들 구현
    _utilRandom(parameters) {
        if (parameters.length >= 2) {
            const min = parseInt(parameters[0].trim());
            const max = parseInt(parameters[1].trim());
            return Math.floor(Math.random() * (max - min + 1)) + min;
        } else if (parameters.length === 1) {
            const max = parseInt(parameters[0].trim());
            return Math.floor(Math.random() * (max + 1));
        }
        return Math.random();
    }

    _generateGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    _conditionalIf(value, parameters) {
        if (parameters.length < 2) return value;

        const condition = this._convertToBool(value);
        const trueValue = parameters[0].trim();
        const falseValue = parameters[1].trim();
        return condition ? trueValue : falseValue;
    }

    _conditionalSwitch(value, parameters) {
        const valueStr = value?.toString() || '';

        // parameters: case1, result1, case2, result2, ..., default
        for (let i = 0; i < parameters.length - 1; i += 2) {
            if (i + 1 < parameters.length) {
                const caseValue = parameters[i].trim();
                const result = parameters[i + 1].trim();

                if (valueStr === caseValue) {
                    return result;
                }
            }
        }

        // 기본값 반환 (마지막 매개변수)
        if (parameters.length % 2 === 1) {
            return parameters[parameters.length - 1].trim();
        }

        return value;
    }

    // render 함수 구현
    _render(variablePath, value) {
        console.log(`--------------------------------render: variablePath=${variablePath}, value=`, value);
        if (value instanceof XaComponent) {
            if (value.pending) {
                value.pending = false;
            }
            const html = value.render();
            //console.log(html);

            /*
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const firstChild = tempDiv.firstElementChild;
            console.log('---------------------------------------------');
            console.log(tempDiv.innerHTML);
            */

            value.element.outerHTML = html;
        }

        return value;
    }
    
    // eval 함수 구현
    _eval(variablePath, context, parameters) {
        if (parameters.length === 0) {
            throw new Error('eval 함수는 최소 1개의 매개변수가 필요합니다.');
        }

        let expression = parameters.join(',').trim();
        XCON.logon3(`Eval 함수 실행:`);
        XCON.logon3(`  변수 경로: ${variablePath}`);
        XCON.logon3(`  컨텍스트 값: ${context}`);
        XCON.logon3(`  원본 표현식: ${expression}`);

        try {
            expression = this._replaceEvalVariables(expression, context);
            XCON.logon3(`  치환 후 표현식: ${expression}`);

            // JavaScript의 eval 사용 (주의: 보안상 위험할 수 있음)
            const result = Function(`"use strict"; return (${expression})`)();
            XCON.logon3(`  계산 결과: ${result}`);

            return result;
        } catch (ex) {
            XCON.logon3(`  계산 오류: ${ex.message}`);
            return `[EVAL_ERROR: ${ex.message}]`;
        }
    }

    _replaceEvalVariables(expression, context) {
        if (context != null) {
            let contextStr = context.toString();

            if (!this._isNumeric(contextStr)) {
                contextStr = `"${contextStr.replace(/"/g, '\\"')}"`;
            }

            expression = expression.replace(/\bvalue\b/g, contextStr);
            expression = expression.replace(/\bthis\b/g, contextStr);
            expression = expression.replace(/\bself\b/g, contextStr);

            XCON.logon3(`    변수 치환: value -> ${contextStr}`);
        } else {
            expression = expression.replace(/\bvalue\b/g, '0');
            expression = expression.replace(/\bthis\b/g, '0');
            expression = expression.replace(/\bself\b/g, '0');
        }

        return expression;
    }

    _isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
}

// ============================================================================
// 6. Filter Processor
// ============================================================================
class FilterProcessor {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.parser = null;
    }

    setParser(parser) {
        this.parser = parser;
    }

    processFilters(value, filters) {
        XCON.logon3('🔍 FilterProcessor.processFilters 호출:', { value, filters });
        
        if (!filters || Object.keys(filters).length === 0) {
            XCON.logon3('🔍 필터가 없음, 원래 값 반환:', value);
            return value;
        }

        for (const [filterName, filterValue] of Object.entries(filters)) {
            XCON.logon3(`🔍 필터 처리: ${filterName}=${filterValue}, 현재값:`, value);
            const oldValue = value;
            value = this._processSingleFilter(value, filterName, filterValue);
            XCON.logon3(`🔍 필터 처리 결과: ${oldValue} → ${value}`);
        }

        XCON.logon3('🔍 FilterProcessor 최종 결과:', value);
        return value;
    }

    _processSingleFilter(value, filterName, filterValue) {
        switch (filterName.toLowerCase()) {
            case 'default':
                // null, undefined, 또는 빈 문자열일 때 기본값 반환
                XCON.logon3('🔍 Default 필터 처리:', { value, filterValue, isNull: value == null, isEmpty: typeof value === 'string' && !value });
                if (value == null || (typeof value === 'string' && !value)) {
                    XCON.logon3('🔍 Default 필터 적용: 기본값 반환', filterValue);
                    return filterValue;
                }
                XCON.logon3('🔍 Default 필터 적용 안함: 원래 값 반환', value);
                return value;
            case 'format':
                return this._applyFormat(value, filterValue);
            case 'autogen':
                if (value == null || (typeof value === 'string' && !value)) {
                    // AutoGenService 호출 (필요시 구현)
                    return `[AUTOGEN:${filterValue}]`;
                }
                return value;
            default:
                if (filterValue.includes('?') && filterValue.includes(':')) {
                    return this._processTernaryOperator(value, filterName, filterValue);
                }
                throw new Error(`지원하지 않는 필터: ${filterName}`);
        }
    }

    _processTernaryOperator(value, condition, ternaryExpression) {
        const questionIndex = ternaryExpression.indexOf('?');
        const colonIndex = ternaryExpression.lastIndexOf(':');

        if (questionIndex === -1 || colonIndex === -1 || questionIndex >= colonIndex) {
            throw new Error(`잘못된 삼항 연산자 형식: ${condition}:${ternaryExpression}`);
        }

        const trueValue = ternaryExpression.substring(questionIndex + 1, colonIndex).trim();
        const falseValue = ternaryExpression.substring(colonIndex + 1).trim();

        const isConditionMet = this._isConditionMet(value, condition);
        const selectedValue = isConditionMet ? trueValue : falseValue;

        XCON.logon3(`삼항 연산자 디버그:`);
        XCON.logon3(`  조건값: ${condition}`);
        XCON.logon3(`  실제값: ${value}`);
        XCON.logon3(`  조건만족: ${isConditionMet}`);
        XCON.logon3(`  참값: ${trueValue}`);
        XCON.logon3(`  거짓값: ${falseValue}`);
        XCON.logon3(`  선택된값: ${selectedValue}`);

        if (this.parser && selectedValue) {
            if ((selectedValue.startsWith('{{') && selectedValue.endsWith('}}')) ||
                selectedValue.includes('{{') || selectedValue.includes('._') || selectedValue.includes('.=')) {
                let wrappedValue = selectedValue;
                if (!selectedValue.startsWith('{{')) {
                    wrappedValue = `{{${selectedValue}}}`;
                }
                return this.parser.parse(wrappedValue);
            }
        }

        return selectedValue;
    }

    _isConditionMet(value, conditionValue) {
        if (value == null) {
            return !conditionValue || conditionValue.toLowerCase() === 'null';
        }

        const valueStr = value.toString();

        XCON.logon3(`조건 비교: '${valueStr}' == '${conditionValue}'`);

        // 불린 비교
        if (conditionValue.toLowerCase() === 'true' || conditionValue.toLowerCase() === 'false') {
            const boolCondition = conditionValue.toLowerCase() === 'true';
            const boolValue = valueStr.toLowerCase() === 'true';
            const result = boolValue === boolCondition;
            XCON.logon3(`불린 비교 결과: ${result}`);
            return result;
        }

        // 숫자 비교
        const numValue = parseFloat(valueStr);
        const numCondition = parseFloat(conditionValue);
        if (!isNaN(numValue) && !isNaN(numCondition)) {
            const result = Math.abs(numValue - numCondition) < 0.0001;
            XCON.logon3(`숫자 비교 결과: ${result}`);
            return result;
        }

        // 문자열 비교
        const stringResult = valueStr.toLowerCase() === conditionValue.toLowerCase();
        XCON.logon3(`문자열 비교 결과: ${stringResult}`);
        return stringResult;
    }

    _applyFormat(value, format) {
        if (value == null) return null;

        switch (format.toLowerCase()) {
            case 'base64':
                return btoa(unescape(encodeURIComponent(value.toString())));
            case 'upper':
                return value.toString().toUpperCase();
            case 'lower':
                return value.toString().toLowerCase();
            default:
                throw new Error(`지원하지 않는 포맷: ${format}`);
        }
    }
}

// ============================================================================
// 7. Variable Info & Parser Interface
// ============================================================================
class VariableInfo {
    constructor() {
        this.path = '';
        this.filters = new Map();
    }
}

class IVariableParser {
    parse(input) {
        throw new Error('Not implemented');
    }

    extractVariables(input) {
        throw new Error('Not implemented');
    }

    get maxNestingDepth() {
        return this._maxNestingDepth || 10;
    }

    set maxNestingDepth(value) {
        this._maxNestingDepth = value;
    }
}

// ============================================================================
// 8. Variable Parser (기본 파서)
// ============================================================================
class VariableParser extends IVariableParser {
    constructor(dataStore) {
        super();
        this.dataStore = dataStore;
        this.filterProcessor = new FilterProcessor(dataStore);
        this.functionProcessor = new EnhancedInlineFunctionProcessor(dataStore);
        this.maxNestingDepth = 10;

        this.filterProcessor.setParser(this);
    }

    parse(input) {
        XCON.logon3('🔍 VariableParser.parse 호출됨:', input);
        return this._parse(input, 0);
    }

    _parse(input, currentDepth) {
        if (!input) return input;

        if (currentDepth >= this.maxNestingDepth) {
            throw new Error(`최대 중첩 깊이(${this.maxNestingDepth})를 초과했습니다.`);
        }

        return this._replaceVariablesWithNesting(input, currentDepth);
    }

    _replaceVariablesWithNesting(input, currentDepth) {
        let result = '';
        let i = 0;
        let inBacktick = false;

        if (currentDepth === 0) {
            XCON.logon3(`VariableParser 입력: ${input}`);
        }

        // 중첩 표현식 파서 사용
        const nestedParser = new NestedExpressionParser();

        while (i < input.length) {
            // 백틱 문자열 처리
            if (input[i] === '`' && !inBacktick) {
                inBacktick = true;
                result += input[i];
                i++;
                continue;
            } else if (input[i] === '`' && inBacktick) {
                inBacktick = false;
                result += input[i];
                i++;
                continue;
            }

            // 백틱 내부는 변수 추출에서 제외
            if (inBacktick) {
                result += input[i];
                i++;
                continue;
            }

            if (i < input.length - 1 && input[i] === '{' && input[i + 1] === '{') {
                XCON.logon3(`{{ 발견, 위치: ${i}`);

                const varStart = i + 2;
                let braceCount = 1;
                let varEnd = varStart;
                let inBacktickInVar = false;

                // }} 찾기 (백틱 내부는 제외)
                while (varEnd < input.length && braceCount > 0) {
                    // 변수 표현식 내부의 백틱 처리
                    if (input[varEnd] === '`' && !inBacktickInVar) {
                        inBacktickInVar = true;
                        varEnd++;
                        continue;
                    } else if (input[varEnd] === '`' && inBacktickInVar) {
                        inBacktickInVar = false;
                        varEnd++;
                        continue;
                    }

                    // 백틱 내부는 중괄호 카운트에서 제외
                    if (inBacktickInVar) {
                        varEnd++;
                        continue;
                    }

                    // 중괄호 매칭
                    if (varEnd < input.length - 1 && input[varEnd] === '{' && input[varEnd + 1] === '{') {
                        braceCount++;
                        varEnd += 2;
                        XCON.logon3(`  중첩 {{ 발견, braceCount: ${braceCount}, 위치: ${varEnd - 2}`);
                    } else if (varEnd < input.length - 1 && input[varEnd] === '}' && input[varEnd + 1] === '}') {
                        braceCount--;
                        XCON.logon3(`  }} 발견, braceCount: ${braceCount}, 위치: ${varEnd}`);
                        if (braceCount === 0) {
                            break;
                        }
                        varEnd += 2;
                    } else {
                        varEnd++;
                    }
                }

                // }} 찾기 성공
                if (braceCount === 0 && varEnd < input.length) {
                    const variableExpression = input.substring(varStart, varEnd);
                    XCON.logon3(`추출된 변수 표현식: ${variableExpression}`);

                    try {
                        // 새로운 중첩 표현식 파서 사용
                        const parsedExpression = nestedParser.parseNestedExpression(variableExpression);
                        const evaluatedResult = this._evaluateParsedExpression(parsedExpression, currentDepth + 1);

                        XCON.logon('중첩 표현식 파싱 결과: ', evaluatedResult);

                        const value = this._getStringOrObject(evaluatedResult);
                        result += value?.toString() || '';
                    } catch (error) {
                        XCON.warn(`중첩 표현식 파싱 실패, 기존 방식으로 fallback: ${error.message}`);
                        
                        // Fallback to original parsing logic
                        if (variableExpression.includes('?') && variableExpression.includes(':')) {
                            XCON.logon('삼항 연산자 감지 - 함수와 삼항 연산자 복합 처리');
                            const functionResult = this._processComplexExpression(variableExpression, currentDepth + 1);
                            result += functionResult;
                        } else if (variableExpression.includes('._') || variableExpression.includes('.=')) {
                            XCON.logon('인라인 함수 감지');
                            const functionResult = this._processInlineFunction(variableExpression, currentDepth + 1);
                            result += functionResult;
                        } else {
                            XCON.logon('일반 변수 처리');
                            const resolvedExpression = this._resolveNestedVariables(variableExpression, currentDepth + 1);
                            const varInfo = this._parseVariableExpression(resolvedExpression);
                            let value = this.dataStore.get(varInfo.path);

                            XCON.logon(`🔍 변수 처리 결과: value=`, value);

                            const processedValue = this.filterProcessor.processFilters(value, Object.fromEntries(varInfo.filters));

                            value = this._getStringOrObject(processedValue);
                            result += value?.toString() || '';
                        }
                    }

                    i = varEnd + 2;
                } else {
                    XCON.logon3(`매칭되는 }}를 찾지 못함, braceCount: ${braceCount}`);
                    result += input[i];
                    i++;
                }
            } else {
                result += input[i];
                i++;
            }
        }

        const finalResult = result;
        XCON.logon3(`ReplaceVariablesWithNesting 결과: ${finalResult}`);
        return finalResult;
    }

    _getStringOrObject(value) {
        if (value && (value instanceof XCON || Array.isArray(value) || (value.type && value.key && value.pos))) { //processedValue instanceof XaComponent
            const key = `(object:${Math.abs(this._hashCode(value))})`;
            this.dataStore.setObject(key, value);
            return key;
        }
        return value;
    }

    /**
     * 파싱된 표현식을 평가하는 메서드
     */
    _evaluateParsedExpression(parsedExpression, currentDepth) {
        XCON.logon3(`🔍 표현식 평가 시작:`, parsedExpression);

        switch (parsedExpression.type) {
            case 'empty':
                return '';

            case 'ternary':
                return this._evaluateTernaryExpression(parsedExpression, currentDepth);

            case 'assignment':
                return this._evaluateAssignmentExpression(parsedExpression, currentDepth);

            case 'function_chain':
                return this._evaluateFunctionChainExpression(parsedExpression, currentDepth);

            case 'variable_expression':
                return this._evaluateVariableExpression(parsedExpression, currentDepth);

            case 'number':
                return parsedExpression.value;

            case 'boolean':
                return parsedExpression.value;

            case 'string':
                return parsedExpression.value;

            case 'identifier':
                // 체이닝 함수가 포함된 경우 ChainedVariableParser로 처리
                if (parsedExpression.value.includes('._')) {
                    XCON.logon3(`🔍 체이닝 함수가 포함된 식별자 감지: "${parsedExpression.value}"`);
                    const chainedParser = new ChainedVariableParser(this.dataStore);
                    const chainResult = chainedParser._replaceVariablesWithChaining(`{{${parsedExpression.value}}}`);
                    XCON.logon3(`🔍 체이닝 처리 결과: "${chainResult}"`);
                    return chainResult;
                }
                
                // 필터가 포함된 경우 필터 처리
                if (parsedExpression.value.includes(':')) {
                    XCON.logon3(`🔍 필터가 포함된 식별자 감지: "${parsedExpression.value}"`);
                    const varInfo = this._parseVariableExpression(parsedExpression.value);
                    let value = this.dataStore.get(varInfo.path);
                    XCON.logon3(`🔍 변수 처리 결과: value=`, value);
                    
                    const processedValue = this.filterProcessor.processFilters(value, Object.fromEntries(varInfo.filters));
                    XCON.logon3(`🔍 필터 처리 결과:`, processedValue);
                    return processedValue == null ? '' : processedValue;
                }
                
                // 단순 식별자는 변수로 처리
                const value = this.dataStore.get(parsedExpression.value);
                XCON.logon3(`🔍 식별자 "${parsedExpression.value}" 값:`, value);
                return value == null ? '' : value;

            default:
                XCON.warn(`알 수 없는 표현식 타입: ${parsedExpression.type}`);
                return parsedExpression.value || '';
        }
    }

    /**
     * 삼항 연산자 표현식 평가
     */
    _evaluateTernaryExpression(ternaryExpr, currentDepth) {
        XCON.logon3(`🔍 삼항 연산자 평가 시작`);
        
        // 조건 평가
        const conditionResult = this._evaluateParsedExpression(ternaryExpr.condition, currentDepth + 1);
        XCON.logon3(`🔍 조건 결과:`, conditionResult);
        
        // 조건을 불린으로 변환
        let isConditionTrue = false;
        if (typeof conditionResult === 'boolean') {
            isConditionTrue = conditionResult;
        } else if (typeof conditionResult === 'string') {
            isConditionTrue = conditionResult.toLowerCase() === 'true' || (conditionResult !== '' && conditionResult !== '0' && conditionResult !== 'false');
        } else if (typeof conditionResult === 'number') {
            isConditionTrue = conditionResult !== 0;
        } else {
            isConditionTrue = !!conditionResult;
        }
        
        XCON.logon3(`🔍 조건 불린 변환:`, isConditionTrue);
        
        // 조건에 따라 값 선택
        const selectedExpression = isConditionTrue ? ternaryExpr.trueValue : ternaryExpr.falseValue;
        const result = this._evaluateParsedExpression(selectedExpression, currentDepth + 1);
        
        XCON.logon3(`🔍 삼항 연산자 최종 결과:`, result);
        return result;
    }

    /**
     * 할당 표현식 평가
     */
    _evaluateAssignmentExpression(assignmentExpr, currentDepth) {
        XCON.logon3(`🔍 할당 표현식 평가 시작: ${assignmentExpr.variable}`);
        
        // 안전성 검사 추가
        if (!assignmentExpr || !assignmentExpr.variable) {
            XCON.warn('할당 표현식이 유효하지 않음:', assignmentExpr);
            return null;
        }
        
        // 할당할 값 평가
        const assignValue = this._evaluateParsedExpression(assignmentExpr.value, currentDepth + 1);
        XCON.logon3(`🔍 할당할 값:`, assignValue);
        
        // 할당 실행
        try {
            // functionProcessor 존재 여부 확인
            if (!this.functionProcessor || typeof this.functionProcessor.executeFunction !== 'function') {
                XCON.warn('functionProcessor가 유효하지 않음');
                return assignValue;
            }
            
            const result = this.functionProcessor.executeFunction(assignmentExpr.variable, '=', [assignValue]);
            XCON.logon3(`🔍 할당 결과:`, result);
            return result;
        } catch (error) {
            XCON.error(`할당 실행 오류: ${error.message}`);
            return assignValue;
        }
    }

    /**
     * 함수 체이닝 표현식 평가
     */
    _evaluateFunctionChainExpression(chainExpr, currentDepth) {
        XCON.logon3(`🔍 함수 체이닝 평가 시작: ${chainExpr.baseVariable}`);
        
        let currentValue = this.dataStore.get(chainExpr.baseVariable);
        XCON.logon3(`🔍 기본 변수 값:`, currentValue);
        
        // 함수들을 순차적으로 실행
        for (const func of chainExpr.functions) {
            try {
                XCON.logon3(`🔍 함수 실행: ${func.name}(${func.parameters.join(', ')})`);
                
                // 매개변수들을 평가
                const evaluatedParams = func.parameters.map(param => {
                    // 매개변수가 표현식인 경우 평가
                    if (typeof param === 'object' && param.type) {
                        return this._evaluateParsedExpression(param, currentDepth + 1);
                    }
                    
                    // 매개변수가 {{}} 형태의 중첩 표현식인 경우
                    if (typeof param === 'string' && param.includes('{{') && param.includes('}}')) {
                        XCON.logon3(`🔍 중첩 표현식 파라미터 평가: "${param}"`);
                        const nestedResult = this._parseAndEvaluate(param, currentDepth + 1);
                        XCON.logon3(`🔍 중첩 표현식 결과: "${nestedResult}"`);
                        return nestedResult;
                    }
                    
                    return param;
                });
                
                currentValue = this.functionProcessor.executeFunction(
                    chainExpr.baseVariable, 
                    func.name, 
                    evaluatedParams
                );
                XCON.logon3(`🔍 함수 실행 결과:`, currentValue);
            } catch (error) {
                XCON.error(`함수 실행 오류 (${func.name}): ${error.message}`);
                break;
            }
        }
        
        return currentValue;
    }

    /**
     * 변수 표현식 평가
     */
    _evaluateVariableExpression(varExpr, currentDepth) {
        XCON.logon3(`🔍 변수 표현식 평가: ${varExpr.raw}`);
        
        // 중첩된 변수들이 있으면 먼저 해결
        if (varExpr.nestedVariables && varExpr.nestedVariables.length > 0) {
            let resolvedExpression = varExpr.raw;
            
            // 뒤에서부터 처리하여 인덱스 변화 방지
            for (let i = varExpr.nestedVariables.length - 1; i >= 0; i--) {
                const nestedVar = varExpr.nestedVariables[i];

                XCON.logon3(`🔍 중첩 변수 평가: `, nestedVar);

                const evaluatedValue = this._evaluateParsedExpression(nestedVar.parsed, currentDepth + 1);
                
                XCON.logon3(`🔍 중첩 변수 해결: "${nestedVar.content}" -> "${evaluatedValue}"`, evaluatedValue);
                
                const value = this._getStringOrObject(evaluatedValue);

                // 원본 문자열에서 {{...}} 부분을 평가된 값으로 교체
                const before = resolvedExpression.substring(0, nestedVar.start);
                const after = resolvedExpression.substring(nestedVar.end);
                resolvedExpression = before + value + after;
            }
            
            XCON.logon3(`🔍 중첩 변수 해결 후: "${resolvedExpression}"`, resolvedExpression);
            
            // 해결된 표현식을 다시 파싱하여 처리
            if (resolvedExpression !== varExpr.raw) {
                return this._parse(resolvedExpression, currentDepth + 1);
            }
        }
        
        // 중첩 변수가 없거나 해결되지 않은 경우 기존 로직 사용
        const varInfo = this._parseVariableExpression(varExpr.raw);
        let value = this.dataStore.get(varInfo.path);
        
        const processedValue = this.filterProcessor.processFilters(value, Object.fromEntries(varInfo.filters));
        
        return this._getStringOrObject(processedValue);
    }

    _processComplexExpression(expression, currentDepth) {
        XCON.logon3(`복합 표현식 처리: ${expression}`);

        const questionIndex = expression.indexOf('?');
        if (questionIndex === -1) return '';

        const conditionPart = expression.substring(0, questionIndex).trim();
        const ternaryPart = expression.substring(questionIndex).trim();

        XCON.logon3(`  조건부: ${conditionPart}`);
        XCON.logon3(`  삼항부: ${ternaryPart}`);

        let conditionResult = false;

        if (conditionPart.includes('._')) {
            const functionResult = this._processRegularFunction(conditionPart);
            XCON.logon3(`  함수 실행 결과: ${functionResult}`);

            if (typeof functionResult === 'boolean') {
                conditionResult = functionResult;
            } else if (functionResult === 'true') {
                conditionResult = true;
            } else if (functionResult === 'false') {
                conditionResult = false;
            } else {
                conditionResult = !!(functionResult && functionResult !== '0');
            }
        } else {
            const resolvedExpression = this._resolveNestedVariables(conditionPart, currentDepth);
            const varInfo = this._parseVariableExpression(resolvedExpression);
            
            let value = this.dataStore.get(varInfo.path);

            value = this._getStringOrObject(value);

            if (typeof value === 'boolean') {
                conditionResult = value;
            } else {
                conditionResult = !!(value && value.toString());
            }
        }

        const result = this._parseTernaryValues(ternaryPart, conditionResult, currentDepth);
        XCON.logon3(`  조건 결과: ${conditionResult}, 반환값: ${result}`);

        return result;
    }

    _parseTernaryValues(ternaryPart, conditionResult, currentDepth) {
        if (!ternaryPart.startsWith('?')) return '';

        const valuesPart = ternaryPart.substring(1).trim();
        const colonIndex = this._findTernaryColonIndex(valuesPart);
        if (colonIndex === -1) return '';

        const trueValue = valuesPart.substring(0, colonIndex).trim();
        const falseValue = valuesPart.substring(colonIndex + 1).trim();

        XCON.logon3(`    참값: '${trueValue}'`);
        XCON.logon3(`    거짓값: '${falseValue}'`);

        const selectedValue = conditionResult ? trueValue : falseValue;
        XCON.logon3(`    선택된 값: '${selectedValue}'`);

        if (selectedValue.includes('{{') && selectedValue.includes('}}')) {
            XCON.logon3(`    중첩 변수 감지, 재귀 파싱 시작`);
            const resolved = this._resolveNestedVariables(selectedValue, currentDepth);
            XCON.logon3(`    중첩 변수 파싱 결과: '${resolved}'`);
            return resolved;
        } else {
            return selectedValue.replace(/['"]/g, '');
        }
    }

    _findTernaryColonIndex(valuesPart) {
        let braceLevel = 0;
        let index = 0;

        while (index < valuesPart.length) {
            if (index < valuesPart.length - 1 && valuesPart[index] === '{' && valuesPart[index + 1] === '{') {
                braceLevel++;
                index += 2;
            } else if (index < valuesPart.length - 1 && valuesPart[index] === '}' && valuesPart[index + 1] === '}') {
                braceLevel--;
                index += 2;
            } else if (valuesPart[index] === ':' && braceLevel === 0) {
                return index;
            } else {
                index++;
            }
        }

        return -1;
    }

    _processInlineFunction(expression, currentDepth) {
        const resolvedExpression = this._resolveNestedVariables(expression, currentDepth);

        if (resolvedExpression.includes('.=')) {
            return this._processAssignmentFunction(resolvedExpression);
        }

        if (resolvedExpression.includes('._')) {
            return this._processRegularFunction(resolvedExpression);
        }

        return '';
    }

    _processAssignmentFunction(expression) {
        const assignIndex = expression.indexOf('.=');
        if (assignIndex === -1) return '';

        const variablePath = expression.substring(0, assignIndex).trim();
        const remaining = expression.substring(assignIndex + 2).trim();

        if (remaining.startsWith('(') && remaining.endsWith(')')) {
            const paramValue = remaining.substring(1, remaining.length - 1).trim();
            const parameters = [paramValue];
            XCON.logon3(`🔍 할당 함수 처리: variablePath='${variablePath}', paramValue='${paramValue}'`);
            const result = this.functionProcessor.executeFunction(variablePath, '=', parameters);
            return result?.toString() || '';
        }

        return '';
    }

    _processRegularFunction(expression) {
        const funcIndex = expression.indexOf('._');
        if (funcIndex === -1) return '';

        const variablePath = expression.substring(0, funcIndex).trim();
        const funcPart = expression.substring(funcIndex + 2).trim();

        XCON.logon3(`함수 처리: variablePath='${variablePath}', funcPart='${funcPart}'`);

        if (funcPart.includes('`')) {
            return this._processFunctionWithBackticks(variablePath, funcPart);
        }

        return this._processNormalFunction(variablePath, funcPart);
    }

    _processFunctionWithBackticks(variablePath, funcPart) {
        return this._parseBacktickFunction(variablePath, funcPart);
    }

    _parseBacktickFunction(variablePath, funcPart) {
        XCON.logon3(`백틱 함수 파싱 시작: '${funcPart}'`);

        const openParenIndex = funcPart.indexOf('(');
        if (openParenIndex === -1) return '';

        const functionName = funcPart.substring(0, openParenIndex).trim();

        const firstBacktickIndex = funcPart.indexOf('`', openParenIndex);
        if (firstBacktickIndex === -1) return '';

        const secondBacktickIndex = this._findMatchingBacktick(funcPart, firstBacktickIndex);
        if (secondBacktickIndex === -1) return '';

        let backtickExpression = funcPart.substring(firstBacktickIndex + 1, secondBacktickIndex);

        const closeParenIndex = funcPart.indexOf(')', secondBacktickIndex);
        if (closeParenIndex === -1) {
            XCON.logon3('경고: 닫는 괄호를 찾을 수 없음');
        }

        backtickExpression = this._normalizeMultilineExpression(backtickExpression);

        XCON.logon3(`백틱 함수 파싱 결과:`);
        XCON.logon3(`  함수명: '${functionName}'`);
        XCON.logon3(`  표현식: '${backtickExpression}'`);

        const result = this.functionProcessor.executeFunction(variablePath, functionName, [backtickExpression]);
        return result?.toString() || '';
    }

    _findMatchingBacktick(text, startIndex) {
        for (let i = startIndex + 1; i < text.length; i++) {
            if (text[i] === '`') {
                if (i > 0 && text[i - 1] === '\\') continue;
                return i;
            }
        }
        return -1;
    }

    _normalizeMultilineExpression(expression) {
        if (!expression) return expression;

        XCON.logon3(`원본 표현식: '${expression}'`);

        expression = this._processPipelineStyle(expression);
        const normalized = expression.trim().replace(/\s+/g, ' ').replace(/;;/g, '; ');

        XCON.logon3(`정규화된 표현식: '${normalized}'`);

        return normalized;
    }

    _processPipelineStyle(expression) {
        if (!expression.includes('|>')) return expression;

        XCON.logon3(`파이프라인 처리 전: '${expression}'`);

        const stages = expression.split('|>');

        if (stages.length <= 1) return expression;

        let result = stages[0].trim();

        for (let i = 1; i < stages.length; i++) {
            const stage = stages[i].trim();

            if (stage.includes('value')) {
                result = stage.replace(/\bvalue\b/g, `(${result})`);
            } else {
                result = `(${result}) ${stage}`;
            }
        }

        XCON.logon3(`파이프라인 처리 후: '${result}'`);

        return result;
    }

    _processNormalFunction(variablePath, funcPart) {
        const openParenIndex = funcPart.indexOf('(');
        const closeParenIndex = funcPart.lastIndexOf(')');

        if (openParenIndex === -1 || closeParenIndex === -1 || openParenIndex >= closeParenIndex) {
            const functionName = funcPart;
            const result = this.functionProcessor.executeFunction(variablePath, functionName, []);
            return result?.toString() || '';
        } else {
            const functionName = funcPart.substring(0, openParenIndex).trim();
            const paramString = funcPart.substring(openParenIndex + 1, closeParenIndex).trim();

            let parameters;
            if (!paramString) {
                parameters = [];
            } else {
                parameters = paramString.split(',').map(p => p.trim());
            }

            const result = this.functionProcessor.executeFunction(variablePath, functionName, parameters);
            return result?.toString() || '';
        }
    }

    _resolveNestedVariables(expression, currentDepth) {
        if (currentDepth >= this.maxNestingDepth) {
            throw new Error(`최대 중첩 깊이(${this.maxNestingDepth})를 초과했습니다.`);
        }

        if (expression.includes('{{')) {
            return this._parse(expression, currentDepth);
        }

        return expression;
    }

    _parseVariableExpression(expression) {
        const varInfo = new VariableInfo();

        XCON.logon3(`ParseVariableExpression 입력: ${expression}`);

        // 백틱 내부를 고려하여 콜론과 물음표 찾기
        const findCharOutsideBacktick = (str, char, startIndex = 0) => {
            let inBacktick = false;
            for (let i = startIndex; i < str.length; i++) {
                if (str[i] === '`') {
                    inBacktick = !inBacktick;
                } else if (!inBacktick && str[i] === char) {
                    return i;
                }
            }
            return -1;
        };

        // 삼항 연산자 처리 (백틱 내부 제외)
        const questionIndex = findCharOutsideBacktick(expression, '?');
        if (questionIndex > 0) {
            const colonIndex = findCharOutsideBacktick(expression, ':', questionIndex + 1);
            if (colonIndex > questionIndex) {
                const beforeQuestion = expression.substring(0, questionIndex);
                const lastColonIndex = findCharOutsideBacktick(beforeQuestion, ':', 0);
                
                if (lastColonIndex > 0) {
                    varInfo.path = beforeQuestion.substring(0, lastColonIndex).trim();
                    const condition = beforeQuestion.substring(lastColonIndex + 1).trim();
                    const ternaryPart = expression.substring(questionIndex).trim();
                    varInfo.filters.set(condition, ternaryPart);

                    XCON.logon3(`  삼항 연산자 감지:`);
                    XCON.logon3(`    경로: ${varInfo.path}`);
                    XCON.logon3(`    조건: ${condition}`);
                    XCON.logon3(`    삼항부: ${ternaryPart}`);
                } else {
                    varInfo.path = beforeQuestion.trim();
                    const ternaryPart = expression.substring(questionIndex).trim();
                    varInfo.filters.set(varInfo.path, ternaryPart);
                    varInfo.path = '';

                    XCON.logon3(`  조건만 있는 삼항 연산자:`);
                    XCON.logon3(`    조건: ${beforeQuestion}`);
                    XCON.logon3(`    삼항부: ${ternaryPart}`);
                }
                return varInfo;
            }
        }

        // 콜론으로 분할 (백틱 내부 제외)
        const parts = this._splitByColonOutsideBacktick(expression);
        varInfo.path = parts[0].trim();

        XCON.logon3(`  일반 변수: ${varInfo.path}`);

        for (let i = 1; i < parts.length; i++) {
            const filterPart = parts[i].trim();
            this._parseFilter(filterPart, varInfo.filters);
            XCON.logon3(`    필터: ${filterPart}`);
        }

        return varInfo;
    }

    /**
     * 백틱 내부를 제외하고 콜론으로 분할
     */
    _splitByColonOutsideBacktick(expression) {
        const parts = [];
        let currentPart = '';
        let inBacktick = false;

        for (let i = 0; i < expression.length; i++) {
            if (expression[i] === '`') {
                inBacktick = !inBacktick;
                currentPart += expression[i];
            } else if (!inBacktick && expression[i] === ':') {
                parts.push(currentPart);
                currentPart = '';
            } else {
                currentPart += expression[i];
            }
        }

        if (currentPart) {
            parts.push(currentPart);
        }

        return parts;
    }

    _parseFilter(filterExpression, filters) {
        const equalIndex = filterExpression.indexOf('=');
        if (equalIndex > 0) {
            const filterName = filterExpression.substring(0, equalIndex).trim();
            const filterValue = filterExpression.substring(equalIndex + 1).trim();
            filters.set(filterName, filterValue);
        } else {
            filters.set(filterExpression, '');
        }
    }

    extractVariables(input) {
        return this._extractVariables(input, 0);
    }

    _extractVariables(input, currentDepth) {
        const variables = [];

        if (!input) return variables;

        if (currentDepth >= this.maxNestingDepth) return variables;

        let i = 0;
        let inBacktick = false;

        while (i < input.length) {
            // 백틱 문자열 처리
            if (input[i] === '`' && !inBacktick) {
                inBacktick = true;
                i++;
                continue;
            } else if (input[i] === '`' && inBacktick) {
                inBacktick = false;
                i++;
                continue;
            }

            // 백틱 내부는 변수 추출에서 제외 (백틱 내부의 {{ }}는 변수로 인식하지 않음)
            if (inBacktick) {
                i++;
                continue;
            }

            // {{ 발견
            if (i < input.length - 1 && input[i] === '{' && input[i + 1] === '{') {
                const varStart = i + 2;
                let braceCount = 1;
                let varEnd = varStart;
                let inBacktickInVar = false;

                // }} 찾기 (백틱 내부는 제외)
                while (varEnd < input.length && braceCount > 0) {
                    // 변수 표현식 내부의 백틱 처리
                    if (input[varEnd] === '`' && !inBacktickInVar) {
                        inBacktickInVar = true;
                        varEnd++;
                        continue;
                    } else if (input[varEnd] === '`' && inBacktickInVar) {
                        inBacktickInVar = false;
                        varEnd++;
                        continue;
                    }

                    // 백틱 내부는 중괄호 카운트에서 제외
                    if (inBacktickInVar) {
                        varEnd++;
                        continue;
                    }

                    // 중괄호 매칭
                    if (varEnd < input.length - 1 && input[varEnd] === '{' && input[varEnd + 1] === '{') {
                        braceCount++;
                        varEnd += 2;
                    } else if (varEnd < input.length - 1 && input[varEnd] === '}' && input[varEnd + 1] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            break;
                        }
                        varEnd += 2;
                    } else {
                        varEnd++;
                    }
                }

                // }} 찾기 성공
                if (braceCount === 0 && varEnd < input.length) {
                    const length = varEnd - varStart;
                    if (varStart >= 0 && varStart < input.length && length >= 0 && varStart + length <= input.length) {
                        const variableExpression = input.substring(varStart, varEnd);

                        // 중첩 변수 추출
                        const nestedVariables = this._extractVariables(variableExpression, currentDepth + 1);
                        variables.push(...nestedVariables);

                        // 변수 표현식 파싱
                        try {
                            const resolvedExpression = this._resolveNestedVariables(variableExpression, currentDepth + 1);
                            variables.push(this._parseVariableExpression(resolvedExpression));
                        } catch {
                            variables.push(this._parseVariableExpression(variableExpression));
                        }
                    }

                    i = varEnd + 2; // }} 다음으로 이동
                } else {
                    // }} 찾기 실패 (불완전한 표현식)
                    i++;
                }
            } else {
                i++;
            }
        }

        return variables;
    }

    _hashCode(obj) {
        let hash = 0;
        try {
            let str;
            if (obj && obj.type && obj.key && obj.pos) { //obj instanceof XaComponent
                str = obj.key;
            } else {
                str = JSON.stringify(obj);
            }
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 32비트 정수로 변환
            }
        } catch (e) {
            XCON.logon3(`🔍 _hashCode 오류: ${e}`);
        }
        return hash;
    }

    /**
     * 중첩된 표현식을 파싱하고 평가하는 헬퍼 메서드
     */
    _parseAndEvaluate(expression, currentDepth) {
        try {
            XCON.logon3(`🔍 중첩 표현식 재귀 파싱: "${expression}"`);
            
            // VariableParser를 사용하여 중첩 표현식 처리
            const variableParser = new VariableParser(this.dataStore);
            const result = variableParser._replaceVariablesWithNesting(expression);
            
            XCON.logon3(`🔍 중첩 표현식 파싱 결과: "${result}"`);
            return result;
        } catch (error) {
            XCON.error(`중첩 표현식 파싱/평가 오류: ${error.message}`);
            return expression; // 실패 시 원본 반환
        }
    }
}

// ============================================================================
// 9. Chained Variable Parser (체이닝 전용 파서)
// ============================================================================
class ChainInfo {
    constructor() {
        this.baseVariable = '';
        this.functionCalls = [];
    }
}

class FunctionCall {
    constructor() {
        this.name = '';
        this.parameters = [];
    }
}

class ChainedVariableParser extends IVariableParser {
    constructor(dataStore) {
        super();
        this.dataStore = dataStore;
        this.filterProcessor = new FilterProcessor(dataStore);
        this.functionProcessor = new EnhancedInlineFunctionProcessor(dataStore);
        this.baseParser = new VariableParser(dataStore);
        this.maxNestingDepth = 10;

        this.filterProcessor.setParser(this);
    }

    parse(input) {
        return this._parse(input, 0);
    }

    _parse(input, currentDepth) {
        if (!input) return input;

        if (currentDepth >= this.maxNestingDepth) {
            throw new Error(`최대 중첩 깊이(${this.maxNestingDepth})를 초과했습니다.`);
        }

        return this._replaceVariablesWithChaining(input, currentDepth);
    }

    _replaceVariablesWithChaining(input, currentDepth) {
        let result = '';
        let i = 0;

        XCON.logon3(`ChainedVariableParser 입력: ${input}`);

        while (i < input.length) {
            if (i < input.length - 1 && input[i] === '{' && input[i + 1] === '{') {
                XCON.logon3(`{{ 발견, 위치: ${i}`);

                const varStart = i + 2;
                let braceCount = 1;
                let varEnd = varStart;

                while (varEnd < input.length - 1 && braceCount > 0) {
                    if (input[varEnd] === '{' && input[varEnd + 1] === '{') {
                        braceCount++;
                        varEnd += 2;
                    } else if (input[varEnd] === '}' && input[varEnd + 1] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            break;
                        }
                        varEnd += 2;
                    } else {
                        varEnd++;
                    }
                }

                if (braceCount === 0 && varEnd < input.length - 1) {
                    const variableExpression = input.substring(varStart, varEnd);
                    // 삼항 연산자가 있으면 기존 파서에게 위임 (우선순위 높음)
                    if (variableExpression.includes('?') && variableExpression.includes(':')) {
                        const wrappedExpression = `{{${variableExpression}}}`;
                        const baseResult = this.baseParser.parse(wrappedExpression);
                        result += baseResult;
                    }
                    // 체이닝 함수가 있는지 확인
                    else if (this._isChainedFunction(variableExpression)) {
                        const chainResult = this._processChainedFunction(variableExpression, currentDepth + 1);
                        result += chainResult;
                    } else if (variableExpression.includes('._') || variableExpression.includes('.=')) {
                        const functionResult = this._processSingleInlineFunction(variableExpression, currentDepth + 1);
                        result += functionResult;
                    } else {
                        const wrappedExpression = `{{${variableExpression}}}`;
                        const baseResult = this.baseParser.parse(wrappedExpression);
                        result += baseResult;
                    }

                    i = varEnd + 2;
                } else {
                    result += input[i];
                    i++;
                }
            } else {
                result += input[i];
                i++;
            }
        }

        const finalResult = result;
        XCON.logon3(`ChainedVariableParser 결과: ${finalResult}`);
        return finalResult;
    }

    _isChainedFunction(expression) {
        let chainCount = 0;
        let index = 0;

        XCON.logon3(`체이닝 감지 검사: ${expression}`);

        while ((index = expression.indexOf('._', index)) !== -1) {
            chainCount++;
            index += 2;
            XCON.logon3(`  ._ 패턴 발견 #${chainCount}, 위치: ${index - 2}`);
        }

        const isChained = chainCount >= 2;
        XCON.logon3(`  체이닝 결과: ${isChained} (._패턴 개수: ${chainCount})`);

        return isChained;
    }

    _processChainedFunction(expression, currentDepth) {
        XCON.logon3(`체이닝 함수 처리 시작: ${expression}`);

        const resolvedExpression = this._resolveNestedVariables(expression, currentDepth);
        XCON.logon3(`중첩 변수 해결 후: ${resolvedExpression}`);

        const chainInfo = this._analyzeChain(resolvedExpression);
        XCON.logon3(`체이닝 분석 결과:`);
        XCON.logon3(`  기본 변수: ${chainInfo.baseVariable}`);
        XCON.logon3(`  함수 체인: ${chainInfo.functionCalls.map(f => f.name).join(' -> ')}`);

        return this._executeChain(chainInfo);
    }

    _processSingleInlineFunction(expression, currentDepth) {
        const resolvedExpression = this._resolveNestedVariables(expression, currentDepth);

        if (resolvedExpression.includes('.=')) {
            return this._processAssignmentFunction(resolvedExpression);
        }

        if (resolvedExpression.includes('._')) {
            return this._processRegularFunction(resolvedExpression);
        }

        return '';
    }

    _analyzeChain(expression) {
        const chainInfo = new ChainInfo();

        const firstFuncIndex = expression.indexOf('._');
        if (firstFuncIndex === -1) {
            chainInfo.baseVariable = expression;
            return chainInfo;
        }

        chainInfo.baseVariable = expression.substring(0, firstFuncIndex).trim();
        const functionPart = expression.substring(firstFuncIndex + 2);

        chainInfo.functionCalls = this._parseFunctionChain(functionPart);

        return chainInfo;
    }

    _parseFunctionChain(functionChain) {
        const functions = [];
        let currentFunction = '';
        let parenDepth = 0;
        let i = 0;

        while (i < functionChain.length) {
            const c = functionChain[i];

            if (c === '(' && parenDepth === 0) {
                parenDepth++;
                currentFunction += c;
            } else if (c === '(') {
                parenDepth++;
                currentFunction += c;
            } else if (c === ')') {
                parenDepth--;
                currentFunction += c;

                if (parenDepth === 0) {
                    functions.push(this._parseSingleFunction(currentFunction));
                    currentFunction = '';

                    if (i + 2 < functionChain.length &&
                        functionChain[i + 1] === '.' &&
                        functionChain[i + 2] === '_') {
                        i += 2; // ._ 건너뛰기
                    }
                }
            } else if (c === '.' && parenDepth === 0 &&
                i + 1 < functionChain.length &&
                functionChain[i + 1] === '_') {
                if (currentFunction.length > 0) {
                    functions.push(this._parseSingleFunction(currentFunction));
                    currentFunction = '';
                }
                i++; // _ 건너뛰기
            } else if (parenDepth === 0 &&
                (c === '.' || /\s/.test(c)) &&
                currentFunction.length > 0) {
                functions.push(this._parseSingleFunction(currentFunction));
                currentFunction = '';

                if (c === '.' && i + 1 < functionChain.length && functionChain[i + 1] === '_') {
                    i++; // _ 건너뛰기
                }
            } else {
                currentFunction += c;
            }

            i++;
        }

        if (currentFunction.length > 0) {
            functions.push(this._parseSingleFunction(currentFunction));
        }

        return functions;
    }

    _parseSingleFunction(functionText) {
        functionText = functionText.trim();

        const openParenIndex = functionText.indexOf('(');
        if (openParenIndex === -1) {
            const func = new FunctionCall();
            func.name = functionText;
            func.parameters = [];
            return func;
        }

        const functionName = functionText.substring(0, openParenIndex).trim();
        const closeParenIndex = functionText.lastIndexOf(')');

        if (closeParenIndex === -1 || openParenIndex >= closeParenIndex) {
            const func = new FunctionCall();
            func.name = functionName;
            func.parameters = [];
            return func;
        }

        const paramString = functionText.substring(openParenIndex + 1, closeParenIndex).trim();

        const func = new FunctionCall();
        func.name = functionName;

        if (!paramString) {
            func.parameters = [];
        } else {
            func.parameters = this._splitParameters(paramString);
        }

        return func;
    }

    _splitParameters(paramString) {
        const parameters = [];
        let currentParam = '';
        let parenDepth = 0;
        let bracketDepth = 0;
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < paramString.length; i++) {
            const c = paramString[i];

            if (!inQuotes) {
                if (c === '"' || c === "'") {
                    inQuotes = true;
                    quoteChar = c;
                    currentParam += c;
                } else if (c === '(') {
                    parenDepth++;
                    currentParam += c;
                } else if (c === ')') {
                    parenDepth--;
                    currentParam += c;
                } else if (c === '[') {
                    bracketDepth++;
                    currentParam += c;
                } else if (c === ']') {
                    bracketDepth--;
                    currentParam += c;
                } else if (c === ',' && parenDepth === 0 && bracketDepth === 0) {
                    parameters.push(currentParam.trim());
                    currentParam = '';
                } else {
                    currentParam += c;
                }
            } else {
                if (c === quoteChar && (i === 0 || paramString[i - 1] !== '\\')) {
                    inQuotes = false;
                    quoteChar = '';
                }
                currentParam += c;
            }
        }

        if (currentParam.length > 0) {
            parameters.push(currentParam.trim());
        }

        return parameters;
    }

    _executeChain(chainInfo) {
        let currentValue = this.dataStore.get(chainInfo.baseVariable);

        XCON.logon3(`체이닝 실행 시작:`);
        XCON.logon3(`  기본 변수: ${chainInfo.baseVariable}`);
        XCON.logon3(`  초기값: ${currentValue}`);

        for (const functionCall of chainInfo.functionCalls) {
            XCON.logon3(`  함수 실행: ${functionCall.name}(${functionCall.parameters.join(', ')})`);
            XCON.logon3(`    현재값: ${currentValue}`);

            try {
                const tempPath = `__temp_chain_${this._generateTempId()}`;
                this.dataStore.set(tempPath, currentValue);

                XCON.logon3(`    임시 경로: ${tempPath}, 임시값: ${this.dataStore.get(tempPath)}`);

                const result = this.functionProcessor.executeFunction(tempPath, functionCall.name, functionCall.parameters);

                XCON.logon3(`    함수 실행 결과: ${result}`);

                currentValue = result;

                XCON.logon3(`    업데이트된 현재값: ${currentValue}`);
            } catch (ex) {
                XCON.logon3(`    오류: ${ex.message}`);
                return `[CHAIN_ERROR: ${ex.message}]`;
            }
        }

        XCON.logon3(`체이닝 최종 결과: ${currentValue}`);
        return currentValue?.toString() || '';
    }

    _processAssignmentFunction(expression) {
        const assignIndex = expression.indexOf('.=');
        if (assignIndex === -1) return '';

        const variablePath = expression.substring(0, assignIndex).trim();
        const remaining = expression.substring(assignIndex + 2).trim();

        if (remaining.startsWith('(') && remaining.endsWith(')')) {
            const paramValue = remaining.substring(1, remaining.length - 2).trim();
            const parameters = [paramValue];
            const result = this.functionProcessor.executeFunction(variablePath, '=', parameters);
            return result?.toString() || '';
        }

        return '';
    }

    _processRegularFunction(expression) {
        const funcIndex = expression.indexOf('._');
        if (funcIndex === -1) return '';

        const variablePath = expression.substring(0, funcIndex).trim();
        const funcPart = expression.substring(funcIndex + 2).trim();

        const openParenIndex = funcPart.indexOf('(');
        const closeParenIndex = funcPart.lastIndexOf(')');

        if (openParenIndex === -1 || closeParenIndex === -1 || openParenIndex >= closeParenIndex) {
            const functionName = funcPart;
            const result = this.functionProcessor.executeFunction(variablePath, functionName, []);
            return result?.toString() || '';
        } else {
            const functionName = funcPart.substring(0, openParenIndex).trim();
            const paramString = funcPart.substring(openParenIndex + 1, closeParenIndex).trim();

            let parameters;
            if (!paramString) {
                parameters = [];
            } else {
                parameters = this._splitParameters(paramString);
            }

            const result = this.functionProcessor.executeFunction(variablePath, functionName, parameters);
            return result?.toString() || '';
        }
    }

    _resolveNestedVariables(expression, currentDepth) {
        if (currentDepth >= this.maxNestingDepth) {
            throw new Error(`최대 중첩 깊이(${this.maxNestingDepth})를 초과했습니다.`);
        }

        if (expression.includes('{{')) {
            return this._parse(expression, currentDepth);
        }

        return expression;
    }

    _generateTempId() {
        return Math.random().toString(36).substr(2, 9);
    }

    extractVariables(input) {
        try {
            return this.baseParser.extractVariables(input);
        } catch (ex) {
            XCON.logon3(`변수 추출 중 오류 발생: ${ex.message}`);
            return this._extractVariablesSafe(input);
        }
    }

    _extractVariablesSafe(input) {
        const variables = [];

        if (!input) return variables;

        const regex = /\{\{([^{}]+)\}\}/g;
        let match;

        while ((match = regex.exec(input)) !== null) {
            try {
                const expression = match[1];
                const varInfo = new VariableInfo();
                varInfo.path = expression;
                variables.push(varInfo);
            } catch (ex) {
                XCON.logon3(`변수 파싱 오류: ${ex.message}`);
            }
        }

        return variables;
    }
}

// ============================================================================
// 10. Smart Variable Parser (자동 선택 파서)
// ============================================================================
class SmartVariableParser extends IVariableParser {
    constructor(dataStore) {
        super();
        this.dataStore = dataStore;
        this.basicParser = new VariableParser(dataStore);
        this.chainedParser = new ChainedVariableParser(dataStore);
    }

    get maxNestingDepth() {
        return this.basicParser.maxNestingDepth;
    }

    set maxNestingDepth(value) {
        this.basicParser.maxNestingDepth = value;
        this.chainedParser.maxNestingDepth = value;
    }

    parse(input) {
        XCON.logon3('🔍 SmartVariableParser.parse 호출됨:', input);
        if (!input) return input;

        // 할당 표현식 우선 체크 (.= 포함된 경우)
        if (this._hasAssignmentOperator(input)) {
            XCON.logon3('SmartParser: 할당 패턴 감지 → VariableParser 사용');
            return this.basicParser.parse(input);
        }

        if (this._hasChainedFunctions(input)) {
            XCON.logon3('SmartParser: 체이닝 패턴 감지 → ChainedVariableParser 사용');
            return this.chainedParser.parse(input);
        } else {
            XCON.logon3('SmartParser: 일반 패턴 → VariableParser 사용');
            return this.basicParser.parse(input);
        }
    }

    extractVariables(input) {
        if (!input) return [];
        return this.basicParser.extractVariables(input);
    }

    _hasAssignmentOperator(input) {
        // 할당 연산자 .= 패턴 체크
        return input.includes('.=');
    }

    _hasChainedFunctions(input) {
        const variableBlocks = this._extractVariableBlocks(input);

        for (const block of variableBlocks) {
            if (this._isChainedPattern(block)) {
                XCON.logon3(`  체이닝 블록 발견: ${block}`);
                return true;
            }
        }

        return false;
    }

    _extractVariableBlocks(input) {
        const blocks = [];
        let i = 0;

        while (i < input.length - 1) {
            if (input[i] === '{' && input[i + 1] === '{') {
                const start = i + 2;
                let braceCount = 1;
                let end = start;

                while (end < input.length - 1 && braceCount > 0) {
                    if (input[end] === '{' && input[end + 1] === '{') {
                        braceCount++;
                        end += 2;
                    } else if (input[end] === '}' && input[end + 1] === '}') {
                        braceCount--;
                        if (braceCount === 0) break;
                        end += 2;
                    } else {
                        end++;
                    }
                }

                if (braceCount === 0) {
                    const block = input.substring(start, end);
                    blocks.push(block);
                    i = end + 2;
                } else {
                    i++;
                }
            } else {
                i++;
            }
        }

        return blocks;
    }

    _isChainedPattern(block) {
        let chainCount = 0;
        let index = 0;

        while ((index = block.indexOf('._', index)) !== -1) {
            const nextIndex = index + 2;
            if (nextIndex < block.length &&
                (/[a-zA-Z_]/.test(block[nextIndex]))) {
                chainCount++;

                if (chainCount >= 2) return true;
            }

            index += 2;
        }

        return false;
    }

    getParserType(input) {
        if (this._hasChainedFunctions(input)) {
            return 'ChainedVariableParser';
        } else {
            return 'VariableParser';
        }
    }
}

// ============================================================================
// 11. Parser Factory
// ============================================================================
const ParserType = {
    Basic: 'Basic',
    Chained: 'Chained',
    Smart: 'Smart'
};

class ParserFactory {
    static createOptimalParser(dataStore) {
        return new SmartVariableParser(dataStore);
    }

    static createParser(dataStore, type) {
        switch (type) {
            case ParserType.Basic:
                return new VariableParser(dataStore);
            case ParserType.Chained:
                return new ChainedVariableParser(dataStore);
            case ParserType.Smart:
            default:
                return new SmartVariableParser(dataStore);
        }
    }
}

// ============================================================================
// 12. Chaining Service (통합 서비스)
// ============================================================================
// Move to xamong-core.js

// ============================================================================
// 13. Enhanced Variable Tokenizer
// ============================================================================
const LexerState = {
    TEXT: 'TEXT',
    VARIABLE: 'VARIABLE',
    FUNCTION_CALL: 'FUNCTION_CALL',
    FUNCTION_CHAIN: 'FUNCTION_CHAIN',
    BACKTICK_CONTENT: 'BACKTICK_CONTENT',
    FILTER_VALUE: 'FILTER_VALUE',
    STRING_LITERAL: 'STRING_LITERAL',
    PARAMETER_LIST: 'PARAMETER_LIST'
};

const KNOWN_FUNCTIONS = new Set([
    // 기본 함수들
    'isempty', 'empty', 'length', 'len', 'count', 'setvalue', 'set',

    // 수학 연산
    'add', 'subtract', 'sub', 'multiply', 'mul', 'divide', 'div', 'mod', 'modulo',
    'power', 'pow', 'sqrt', 'squareroot', 'abs', 'absolute', 'round', 'floor',
    'ceiling', 'ceil', 'min', 'max', 'sin', 'cos', 'tan', 'log', 'log10', 'exp',

    // 문자열 함수들
    'upper', 'toupper', 'uppercase', 'lower', 'tolower', 'lowercase',
    'trim', 'trimstart', 'ltrim', 'trimend', 'rtrim', 'substring', 'substr',
    'left', 'right', 'mid', 'middle', 'replace', 'contains', 'startswith', 'starts',
    'endswith', 'ends', 'indexof', 'find', 'lastindexof', 'findlast', 'split', 'join',
    'repeat', 'reverse', 'padleft', 'lpad', 'padright', 'rpad', 'removewhitespace', 'compact',
    'capitalize', 'camelcase', 'pascalcase', 'kebabcase', 'snakecase',

    // 날짜/시간 함수들
    'now', 'today', 'utcnow', 'adddays', 'addhours', 'addminutes', 'addseconds',
    'addmonths', 'addyears', 'format', 'dateformat', 'tostring', 'year', 'month', 'day',
    'hour', 'minute', 'second', 'dayofweek', 'dayofyear',

    // 논리 연산
    'and', 'or', 'not', 'equals', 'eq', 'notequals', 'ne', 'greaterthan', 'gt',
    'lessthan', 'lt', 'gte', 'lte',

    // 배열/컬렉션
    'first', 'last', 'at', 'index', 'push', 'append', 'pop', 'unique', 'distinct',
    'sort', 'reverse_array',

    // 변환 함수들
    'toint', 'int', 'todouble', 'double', 'float', 'tobool', 'bool', 'boolean',
    'todate', 'date', 'base64encode', 'base64', 'base64decode', 'urlencode', 'urldecode',
    'htmlencode', 'htmldecode',

    // 유틸리티 함수들
    'random', 'rand', 'randomstring', 'guid', 'uuid', 'hash', 'gethashcode',
    'isnull', 'isnotnull', 'isnumber', 'isdate', 'isemail', 'isurl', 'coalesce', 'ifnull',
    'default', 'defaultvalue',

    // 조건부 함수들
    'if', 'ternary', 'switch', 'case',

    // 기존 eval 함수
    'eval',

    // 별칭들
    '+', '-', '*', '/', '%', '^', '==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'
]);

class EnhancedVariableTokenizer {
    constructor() {
        this.stateStack = [];
    }

    tokenize(input) {
        this.input = input || '';
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.state = LexerState.TEXT;
        this.stateStack = [];
        this.result = new TokenizeResult();
        this.variableNestingLevel = 0;
        this.chainDepth = 0;

        try {
            while (this.position < this.input.length) {
                const processed = this._processCurrentPosition();

                if (!processed) {
                    this._handleUnknownCharacter();
                }
            }

            this._addToken(TokenType.EOF, '');
            this._postProcessChaining();
        } catch (ex) {
            this.result.addError(`토큰화 중 예외 발생: ${ex.message}`, this.position, this.line, this.column);
        }

        this.result.calculateStatistics();
        return this.result;
    }

    _processCurrentPosition() {
        if (this._tryProcessVariableBoundary()) {
            return true;
        }

        switch (this.state) {
            case LexerState.TEXT:
                return this._processTextMode();
            case LexerState.VARIABLE:
                return this._processVariableMode();
            case LexerState.FUNCTION_CALL:
            case LexerState.FUNCTION_CHAIN:
                return this._processFunctionMode();
            case LexerState.PARAMETER_LIST:
                return this._processParameterMode();
            case LexerState.BACKTICK_CONTENT:
                return this._processBacktickMode();
            case LexerState.FILTER_VALUE:
                return this._processFilterMode();
            case LexerState.STRING_LITERAL:
                return this._processStringMode();
            default:
                return false;
        }
    }

    _tryProcessVariableBoundary() {
        if (this._matchString('{{')) {
            this._addToken(TokenType.VARIABLE_START, '{{');
            this.variableNestingLevel++;

            if (this.state !== LexerState.VARIABLE) {
                this._pushState(LexerState.VARIABLE);
            } else {
                this.stateStack.push(LexerState.VARIABLE);
            }
            return true;
        }

        if (this._isInVariableContext() && this._matchString('}}')) {
            this._addToken(TokenType.VARIABLE_END, '}}');
            this.variableNestingLevel--;
            this.chainDepth = 0;

            if (this.variableNestingLevel <= 0) {
                this.variableNestingLevel = 0;
                this.state = LexerState.TEXT;
                this.stateStack = [];
            } else {
                if (this.stateStack.length > 0) {
                    this.state = this.stateStack.pop();
                } else {
                    this.state = LexerState.VARIABLE;
                }
            }
            return true;
        }

        return false;
    }

    _processTextMode() {
        return this._collectTextUntilVariable();
    }

    _processVariableMode() {
        this._skipWhitespace();

        if (this._matchString('._')) {
            this._addToken(TokenType.FUNCTION_PREFIX, '._');
            this.chainDepth++;
            this._pushState(this.chainDepth > 1 ? LexerState.FUNCTION_CHAIN : LexerState.FUNCTION_CALL);
            return true;
        }

        if (this._matchString('.=')) {
            this._addToken(TokenType.ASSIGNMENT_PREFIX, '.=');
            this._pushState(LexerState.FUNCTION_CALL);
            return true;
        }

        if (this._matchChar('?')) {
            this._addToken(TokenType.QUESTION, '?');
            return true;
        }

        if (this._matchChar(':')) {
            this._addToken(TokenType.COLON, ':');
            return true;
        }

        if (this._matchChar('=')) {
            this._addToken(TokenType.EQUALS, '=');
            this._pushState(LexerState.FILTER_VALUE);
            return true;
        }

        if (this._matchChar('.')) {
            this._addToken(TokenType.DOT, '.');
            return true;
        }

        if (this._matchIdentifier()) {
            return true;
        }

        return this._collectVariableContent();
    }

    _processFunctionMode() {
        this._skipWhitespace();

        if (this._matchChar('`')) {
            this._addToken(TokenType.BACKTICK, '`');
            this._pushState(LexerState.BACKTICK_CONTENT);
            return true;
        }

        if (this._matchChar('"')) {
            this._addToken(TokenType.STRING_LITERAL, '"');
            this._pushState(LexerState.STRING_LITERAL);
            return true;
        }

        if (this._matchChar('(')) {
            this._addToken(TokenType.PAREN_OPEN, '(');
            this._pushState(LexerState.PARAMETER_LIST);
            return true;
        }

        if (this._matchChar(')')) {
            this._addToken(TokenType.PAREN_CLOSE, ')');
            this._popState();
            return true;
        }

        if (this._matchChar(',')) {
            this._addToken(TokenType.COMMA, ',');
            return true;
        }

        if (this._matchFunctionName()) {
            return true;
        }

        return this._collectFunctionContent();
    }

    _processParameterMode() {
        this._skipWhitespace();

        if (this._matchChar('`')) {
            this._addToken(TokenType.BACKTICK, '`');
            this._pushState(LexerState.BACKTICK_CONTENT);
            return true;
        }

        if (this._matchChar('"')) {
            this._addToken(TokenType.STRING_LITERAL, '"');
            this._pushState(LexerState.STRING_LITERAL);
            return true;
        }

        if (this._matchChar(',')) {
            this._addToken(TokenType.COMMA, ',');
            return true;
        }

        if (this._matchChar(')')) {
            this._addToken(TokenType.PAREN_CLOSE, ')');
            this._popState(); // PARAMETER_LIST 종료
            this._popState(); // FUNCTION_CALL 종료
            return true;
        }

        if (this._matchNumberLiteral()) {
            return true;
        }

        if (this._matchBooleanLiteral()) {
            return true;
        }

        return this._collectParameterValue();
    }

    _processBacktickMode() {
        if (this._matchChar('`')) {
            this._addToken(TokenType.BACKTICK, '`');
            this._popState();
            return true;
        }

        if (this._matchString('|>')) {
            this._addToken(TokenType.PIPE_ARROW, '|>');
            return true;
        }

        if (this._matchString(';;')) {
            this._addToken(TokenType.SEMICOLON_DOUBLE, ';;');
            return true;
        }

        return this._collectBacktickContent();
    }

    _processFilterMode() {
        const ch = this._peekChar();
        if (ch === ':' || ch === '}') {
            this._popState();
            return false;
        }

        return this._collectFilterValue();
    }

    _processStringMode() {
        if (this._matchChar('"')) {
            this._addToken(TokenType.STRING_LITERAL, '"');
            this._popState();
            return true;
        }

        return this._collectStringContent();
    }

    // 유틸리티 메서드들
    _matchString(str) {
        if (this.position + str.length <= this.input.length) {
            return this.input.substring(this.position, this.position + str.length) === str;
        }
        return false;
    }

    _matchChar(ch) {
        return this.position < this.input.length && this.input[this.position] === ch;
    }

    _peekChar() {
        return this.position < this.input.length ? this.input[this.position] : '\0';
    }

    _isInVariableContext() {
        return this.state === LexerState.VARIABLE ||
            this.state === LexerState.FUNCTION_CALL ||
            this.state === LexerState.FUNCTION_CHAIN ||
            this.state === LexerState.FILTER_VALUE ||
            this.state === LexerState.PARAMETER_LIST;
    }

    _addToken(type, value) {
        const startPos = this.position;
        const endPos = this.position + value.length;

        this.result.tokens.push(new Token(type, value, startPos, endPos, this.line, this.column));

        for (let i = 0; i < value.length; i++) {
            if (this.position < this.input.length && this.input[this.position] === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }
            this.position++;
        }
    }

    _matchFunctionName() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;

        if (this.position < this.input.length && (/[a-zA-Z_]/.test(this.input[this.position]))) {
            let identifier = '';

            while (this.position < this.input.length &&
                (/[a-zA-Z0-9_]/.test(this.input[this.position]))) {
                identifier += this.input[this.position];
                this._advance();
            }

            if (identifier.length > 0) {
                const funcName = identifier;

                const tokenType = KNOWN_FUNCTIONS.has(funcName.toLowerCase())
                    ? TokenType.FUNCTION_NAME
                    : TokenType.IDENTIFIER;

                const token = new Token(tokenType, funcName, startPos, this.position, startLine, startColumn);

                if (tokenType === TokenType.FUNCTION_NAME) {
                    token.metadata.set('IsKnownFunction', true);
                    token.metadata.set('ChainDepth', this.chainDepth);
                }

                this.result.tokens.push(token);
                return true;
            }
        }

        return false;
    }

    _matchIdentifier() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;

        if (this.position < this.input.length && (/[a-zA-Z_]/.test(this.input[this.position]))) {
            let identifier = '';

            while (this.position < this.input.length &&
                (/[a-zA-Z0-9_]/.test(this.input[this.position]))) {
                identifier += this.input[this.position];
                this._advance();
            }

            if (identifier.length > 0) {
                this.result.tokens.push(new Token(TokenType.IDENTIFIER, identifier,
                    startPos, this.position, startLine, startColumn));
                return true;
            }
        }

        return false;
    }

    _matchNumberLiteral() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;

        if (this.position < this.input.length && (/\d/.test(this.input[this.position]) || this.input[this.position] === '-')) {
            let number = '';
            let hasDecimal = false;

            if (this.input[this.position] === '-') {
                number += this.input[this.position];
                this._advance();
            }

            while (this.position < this.input.length) {
                const ch = this.input[this.position];

                if (/\d/.test(ch)) {
                    number += ch;
                    this._advance();
                } else if (ch === '.' && !hasDecimal) {
                    hasDecimal = true;
                    number += ch;
                    this._advance();
                } else {
                    break;
                }
            }

            if (number.length > 0 && number !== '-') {
                this.result.tokens.push(new Token(TokenType.NUMBER_LITERAL, number,
                    startPos, this.position, startLine, startColumn));
                return true;
            }
        }

        // 실패 시 위치 원복
        this.position = startPos;
        this.line = startLine;
        this.column = startColumn;
        return false;
    }

    _matchBooleanLiteral() {
        const booleans = ['true', 'false', 'True', 'False', 'TRUE', 'FALSE'];

        for (const boolStr of booleans) {
            if (this._matchString(boolStr)) {
                if (this.position >= this.input.length ||
                    (!/[a-zA-Z0-9_]/.test(this.input[this.position]))) {
                    this._addToken(TokenType.BOOLEAN_LITERAL, boolStr);
                    return true;
                }
            }
        }

        return false;
    }

    // 콘텐츠 수집 메서드들
    _collectTextUntilVariable() {
        if (this.position >= this.input.length) return false;

        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let text = '';

        while (this.position < this.input.length) {
            if (this.position < this.input.length - 1 && this.input.substring(this.position, this.position + 2) === '{{') {
                break;
            }

            text += this.input[this.position];
            this._advance();
        }

        if (text.length > 0) {
            this.result.tokens.push(new Token(TokenType.TEXT, text,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectVariableContent() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let text = '';

        while (this.position < this.input.length) {
            const ch = this.input[this.position];

            if (ch === '}' || ch === '{' || ch === ':' || ch === '?' || ch === '=' ||
                ch === '.' || ch === '(' || ch === ')' || ch === '`' ||
                /\s/.test(ch)) {
                break;
            }

            text += ch;
            this._advance();
        }

        if (text.length > 0) {
            const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text);
            const tokenType = isIdentifier ? TokenType.IDENTIFIER : TokenType.FILTER_VALUE;

            this.result.tokens.push(new Token(tokenType, text,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectFunctionContent() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let text = '';

        while (this.position < this.input.length) {
            const ch = this.input[this.position];

            if (ch === ')' || ch === ',' || ch === '`' ||
                (this.position < this.input.length - 1 && this.input.substring(this.position, this.position + 2) === '}}') ||
                /\s/.test(ch)) {
                break;
            }

            text += ch;
            this._advance();
        }

        if (text.length > 0) {
            const isIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text);
            const tokenType = isIdentifier ? TokenType.IDENTIFIER : TokenType.PARAMETER_VALUE;

            this.result.tokens.push(new Token(tokenType, text,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectParameterValue() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (this.position < this.input.length) {
            const ch = this.input[this.position];

            if (ch === ',' || ch === ')' ||
                (this.position < this.input.length - 1 && this.input.substring(this.position, this.position + 2) === '}}') ||
                /\s/.test(ch)) {
                break;
            }

            value += ch;
            this._advance();
        }

        if (value.length > 0) {
            this.result.tokens.push(new Token(TokenType.PARAMETER_VALUE, value,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectBacktickContent() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let content = '';

        while (this.position < this.input.length && this.input[this.position] !== '`') {
            if (this.position < this.input.length - 1) {
                const twoChar = this.input.substring(this.position, this.position + 2);
                if (twoChar === '|>' || twoChar === ';;') {
                    break;
                }
            }

            content += this.input[this.position];
            this._advance();
        }

        if (content.length > 0) {
            this.result.tokens.push(new Token(TokenType.BACKTICK_CONTENT, content,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectFilterValue() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (this.position < this.input.length) {
            const ch = this.input[this.position];

            if (ch === ':' || ch === '}') {
                break;
            }

            value += ch;
            this._advance();
        }

        if (value.length > 0) {
            this.result.tokens.push(new Token(TokenType.FILTER_VALUE, value.trim(),
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    _collectStringContent() {
        const startPos = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        let content = '';

        while (this.position < this.input.length && this.input[this.position] !== '"') {
            const ch = this.input[this.position];

            if (ch === '\\' && this.position + 1 < this.input.length) {
                content += ch;
                this._advance();
                if (this.position < this.input.length) {
                    content += this.input[this.position];
                    this._advance();
                }
            } else {
                content += ch;
                this._advance();
            }
        }

        if (content.length > 0) {
            this.result.tokens.push(new Token(TokenType.STRING_LITERAL, content,
                startPos, this.position, startLine, startColumn));
            return true;
        }

        return false;
    }

    // 상태 관리
    _pushState(newState) {
        this.stateStack.push(this.state);
        this.state = newState;
    }

    _popState() {
        if (this.stateStack.length > 0) {
            this.state = this.stateStack.pop();
        } else {
            this.state = this.variableNestingLevel > 0 ? LexerState.VARIABLE : LexerState.TEXT;
        }
    }

    _skipWhitespace() {
        while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
            this._advance();
        }
    }

    _advance() {
        if (this.position < this.input.length) {
            if (this.input[this.position] === '\n') {
                this.line++;
                this.column = 1;
            } else {
                this.column++;
            }
            this.position++;
        }
    }

    _handleUnknownCharacter() {
        const unknownChar = this.input[this.position].toString();
        this._addToken(TokenType.UNKNOWN, unknownChar);
        this.result.addError(`알 수 없는 문자: '${unknownChar}' (상태: ${this.state})`, this.position, this.line, this.column);
    }

    // 후처리
    _postProcessChaining() {
        for (let i = 0; i < this.result.tokens.length - 1; i++) {
            const current = this.result.tokens[i];
            const next = this.result.tokens[i + 1];

            if (current.type === TokenType.PAREN_CLOSE && next.type === TokenType.FUNCTION_PREFIX) {
                const chainToken = new Token(TokenType.CHAIN_SEPARATOR, '->',
                    current.endPosition, next.startPosition,
                    current.line, current.column);
                chainToken.metadata.set('IsVirtual', true);

                this.result.tokens.splice(i + 1, 0, chainToken);
                i++;
            }
        }

        // 체이닝 길이 마킹
        let chainLength = 0;
        for (let i = 0; i < this.result.tokens.length; i++) {
            const token = this.result.tokens[i];

            if (token.type === TokenType.FUNCTION_PREFIX) {
                chainLength++;
            } else if (token.type === TokenType.VARIABLE_END) {
                if (chainLength >= 2) {
                    for (let j = i - 1; j >= 0; j--) {
                        if (this.result.tokens[j].type === TokenType.VARIABLE_START) {
                            this.result.tokens[j].metadata.set('HasChaining', true);
                            this.result.tokens[j].metadata.set('ChainLength', chainLength);
                            break;
                        }
                    }
                }
                chainLength = 0;
            }
        }
    }
}

// ============================================================================
// 14. Export Classes (모듈 내보내기)
// ============================================================================

// 메인 클래스들을 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 환경
    module.exports = {
        DataStore,
        TokenType,
        Token,
        TokenizeResult,
        EnhancedInlineFunctionProcessor,
        FilterProcessor,
        VariableInfo,
        IVariableParser,
        VariableParser,
        ChainedVariableParser,
        SmartVariableParser,
        ParserFactory,
        ParserType,
        EnhancedVariableTokenizer,
        LexerState,
        KNOWN_FUNCTIONS
    };
} else {
    // 브라우저 환경
    window.XamongChain = {
        DataStore,
        TokenType,
        Token,
        TokenizeResult,
        NestedExpressionParser,
        EnhancedInlineFunctionProcessor,
        FilterProcessor,
        VariableInfo,
        IVariableParser,
        VariableParser,
        ChainedVariableParser,
        SmartVariableParser,
        ParserFactory,
        ParserType,
        EnhancedVariableTokenizer,
        LexerState,
        KNOWN_FUNCTIONS
    };
}
