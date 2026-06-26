/**
 * XamongCode UI Components System - JavaScript Implementation
 * 자몽 UI 컴포넌트 시스템의 JavaScript 구현
 * 가이드의 모든 UI 컴포넌트를 클래스 기반으로 구현
 */

// =============================================================================
// Helper Functions (헬퍼 함수들)
// =============================================================================

/**
 * XCON 객체 여부를 안전하게 확인하는 함수
 * 크로스 컨텍스트 환경에서도 안전하게 작동
 */
function isXCON(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    
    // 0. isXCON 메서드 사용
    if (obj.isXCON && typeof obj.isXCON === 'function') {
        return obj.isXCON();
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

function getXamongPublicProps() {
    if (typeof XamongPublicProps !== 'undefined') return XamongPublicProps;
    if (typeof window !== 'undefined' && window.XamongPublicProps) return window.XamongPublicProps;

    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
        try {
            return require('./xamong-public-props.js');
        } catch (error) {
            return null;
        }
    }

    return null;
}

const XAMONG_THEME_TOKEN_ALIAS_PATTERN = /(^|[\s(:,])@([A-Za-z_][\w-]*)(?=$|[\s),;])/g;

function expandXamongThemeTokenAliases(value) {
    if (value === undefined || value === null) return value;

    const publicProps = getXamongPublicProps();
    if (publicProps && typeof publicProps.expandThemeTokenAliases === 'function') {
        return publicProps.expandThemeTokenAliases(value);
    }

    return String(value).replace(XAMONG_THEME_TOKEN_ALIAS_PATTERN, (_match, prefix, token) => `${prefix}var(--${token})`);
}

const XAMONG_BORDER_SIDE_KEYS = ['borderLeft', 'borderTop', 'borderRight', 'borderBottom'];

function xamongHasKey(source, key) {
    if (!source || typeof source !== 'object') return false;
    if (typeof source.contains === 'function') return source.contains(key);
    return Object.prototype.hasOwnProperty.call(source, key);
}

function xamongGetKey(source, key) {
    if (!source || typeof source !== 'object') return undefined;
    if (typeof source.get === 'function') return source.get(key);
    return source[key];
}

function xamongObjectValue(source, key) {
    if (!source || typeof source !== 'object') return undefined;
    if (typeof source.get === 'function') return source.get(key);
    return source[key];
}

function xamongIsFalseLike(value) {
    return value === false || value === 'false' || value === 0 || value === '0' || value === 'none';
}

function xamongBorderSideIsVisible(source, key) {
    if (!xamongHasKey(source, key)) return false;
    const raw = xamongGetKey(source, key);
    if (raw && typeof raw === 'object') {
        const visible = xamongObjectValue(raw, 'visible');
        if (visible !== undefined && xamongIsFalseLike(visible)) return false;
        const width = xamongObjectValue(raw, 'width');
        if (width !== undefined && xamongIsFalseLike(width)) return false;
        return true;
    }
    return !xamongIsFalseLike(raw) && raw !== '' && raw !== null && raw !== undefined;
}

function xamongFirstBorderSideColor(source, keys) {
    for (const key of keys) {
        const raw = xamongGetKey(source, key);
        if (raw && typeof raw === 'object') {
            const color = xamongObjectValue(raw, 'color');
            if (color !== undefined && color !== null && String(color).trim() !== '') {
                return color;
            }
        }
    }
    return undefined;
}

// =============================================================================
// XaComponent Base Class (기본 컴포넌트 클래스)
// =============================================================================
class XaComponent {
    constructor(xcon, key = null, owner = null) {
        this.xcon = xcon;
        this.key = key;
        this.owner = owner;

        XCON.log('####################################XaComponent constructor', this.key, this.owner);
        if (this.owner && this.owner.key === 'root' && this.owner.allComponents) {
            this.owner.allComponents.set(this.key, this);
        }

        //XCON.log('XaComponent constructor===============================================================');
        //XCON.log('XaComponent constructor', this, this.xcon, this.key, this.owner);
        //XCON.log('XaComponent constructor===============================================================');

        // 하위 컴포넌트 자동 렌더링 활성화 (기본값: true)
        this.autoChildRendering = true;
        
        this.type = this.getValue('type');
        this.pos = this.getValue('pos') || '0,0,100,30';
        this.enabled = this.getValue('enabled', true);
        this.visible = this.getValue('visible', true);
        this.style = this.getValue('style');

        this.id = this.getValue('id');
        this.name = this.getValue('name');
        this.polymorph = this.getValue('polymorph');

        this.anchor = this.getValue('anchor');
        this.dock = this.getValue('dock');
        this.margin = this.getValue('margin');
        this.minmax = this.getValue('minmax');

        this.backgroundColor = this.getValue('backgroundColor', this.getValue('bgColor'));
        this.color = this.getValue('color', this.getValue('fgColor'));
        this.bgColor = this.backgroundColor;
        this.fgColor = this.color;

        this.onClick = this.getValue('onClick');
        
        // 이벤트 전파 제어 속성들
        this.eventPropagation = this.getValue('eventPropagation', 'bubble'); // 'bubble', 'stop', 'capture'
        this.stopPropagation = this.getValue('stopPropagation', false); // 이벤트 전파 중단 여부
        this.preventDefault = this.getValue('preventDefault', false); // 기본 동작 방지 여부
        
        // 위치 및 크기 파싱
        this.parsedPos = this.parsePosition(this.pos);
        
        // 마진 파싱
        this.parsedMargin = this.parseMargin(this.margin);
        
        // dock 파싱
        this.parsedDock = this.parseDock(this.dock);
        
        // 디버깅 로그 (도킹 컴포넌트만)
        if (this.dock && this.dock !== 'none') {
            XCON.log(`🔍 XaComponent ${this.key} - dock: ${this.parsedDock}, margin: ${this.margin} →`, this.parsedMargin);
        }
    }
    
    doPolymorph(content) {
        if (window.EDIT_MODE === true) {
            return content;
        }

        if (this.polymorph && this.polymorph !== 'none' && this.polymorph !== this.type) {
            XCON.logon(`🔍 XaComponent ${this.key} - polymorph: ${this.polymorph} → ${this.type}`);

            if (this.polymorph === 'button') {
                // button 폴리모프 처리: 컴포넌트의 실제 pos에 맞는 투명한 버튼 오버레이 추가
                const pos = this.parsePosition(this.pos);
                
                const buttonOverlayHtml = `
                    <button 
                        class="polymorph-button-overlay" 
                        data-polymorph-key="${this.key}"
                        style="
                            position: absolute;
                            left: ${pos.x}px;
                            top: ${pos.y}px;
                            width: ${pos.width}px;
                            height: ${pos.height}px;
                            background: transparent;
                            border: none;
                            cursor: pointer;
                            z-index: 1000;
                            outline: none;
                            transition: all 0.2s ease;
                            border-radius: 4px;
                        "
                         onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.transform='scale(1.02)'"
                         onmouseout="this.style.background='transparent'; this.style.transform='scale(1)'"
                         onmousedown="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.transform='scale(0.98)'"
                         onmouseup="this.style.background='rgba(59, 130, 246, 0.1)'; this.style.transform='scale(1.02)'"
                        ${this.getClickHandler()}
                    ></button>
                `;
                //onclick="window.XamongUIComponents.handlePolymorphClick('${this.key}', event)"

                // 기존 content와 버튼 오버레이를 함께 반환 (컨테이너로 감싸지 않음)
                const wrappedContent = `${content}${buttonOverlayHtml}`;
                
                XCON.logon(`✅ Button polymorph overlay HTML created for ${this.key} at position (${pos.x}, ${pos.y}, ${pos.width}, ${pos.height})`);
                return wrappedContent;
            } else if (this.polymorph === 'label') {
                //
                // TODO : label 폴리모프 처리
                //
            } else if (this.polymorph === 'textField') {
                // textField 폴리모프 처리: 컴포넌트의 실제 pos에 맞는 텍스트 필드 오버레이 추가
                const pos = this.parsePosition(this.pos);
                
                // 현재 컴포넌트의 배경색과 전경색 적용
                const backgroundColor = this.bgColor ? this.parseColor(this.bgColor) : 'white';
                const textColor = this.fgColor ? this.parseColor(this.fgColor) : 'black';
                
                const placeholderText = this.placeholder ? this.placeholder : this.text ? this.text : '';
                const placeholder = placeholderText ? `placeholder="${placeholderText}"` : '';

                // 스타일 배열로 구성하여 나중에 join
                const styleParts = [
                    `position: absolute`,
                    `left: ${pos.x}px`,
                    `top: ${pos.y}px`,
                    `width: ${pos.width}px`,
                    `height: ${pos.height}px`,
                    `background: ${backgroundColor}`,
                    `color: ${textColor}`,
                    `z-index: 1000`,
                    `outline: none`,
                    `transition: all 0.2s ease`,
                    `border: none`,
                    `box-sizing: border-box`,  // ✅ 레이아웃 안정성을 위해 필수
                    `padding: 0`,              // ✅ 기본 padding 제거
                    `margin: 0`,               // ✅ 기본 margin 제거
                    `font-family: inherit`,    // ✅ 폰트 상속
                    `font-size: inherit`,      // ✅ 폰트 크기 상속
                    `line-height: 1`,          // ✅ 라인 높이 정규화
                    `vertical-align: top`      // ✅ 수직 정렬
                ];
                
                if (this.font) styleParts.push(`font-family: ${this.font}`);
                if (this.fontSize) styleParts.push(`font-size: ${this.fontSize}px`);
                if (this.fontWeight) styleParts.push(`font-weight: ${this.fontWeight}`);
                if (this.fontStyle) styleParts.push(`font-style: ${this.fontStyle}`);
                if (this.bold) styleParts.push(`font-weight: bold`);
                if (this.italic) styleParts.push(`font-style: italic`);
                if (this.underline) styleParts.push(`text-decoration: underline`);
                if (this.strikethrough) styleParts.push(`text-decoration: line-through`);
                if (this.textAlign) styleParts.push(`text-align: ${this.textAlign}`);
                if (this.textVAlign) styleParts.push(`vertical-align: ${this.textVAlign}`);

                // border 속성이 있으면 추가
                if (this.border) {
                    const borderWidth = this.borderWidth || 1;
                    const borderStyle = this.borderStyle || 'solid';
                    const borderColor = this.borderColor ? this.parseColor(this.borderColor) : '#000000';
                    styleParts.push(`border: ${borderWidth}px ${borderStyle} ${borderColor}`);
                }
                
                // round 속성이 있으면 border-radius 추가
                if (this.round) {
                    styleParts.push(`border-radius: ${this.round}px`);
                }
                
                const inputStyle = styleParts.join('; ');
                
                const textFieldOverlayHtml = `
                    <input 
                        type="text"
                        class="polymorph-textfield-overlay" 
                        data-polymorph-key="${this.key}"
                        ${placeholder}
                        style="${inputStyle}"
                    />
                `;
                const wrappedContent = `${content}${textFieldOverlayHtml}`;

                XCON.logon(`✅ TextField polymorph overlay HTML created for ${this.key} at position (${pos.x}, ${pos.y}, ${pos.width}, ${pos.height}) with colors bg:${backgroundColor}, fg:${textColor}`);
                return wrappedContent;
            } else if (this.polymorph === 'image') {
                //
                // TODO : image 폴리모프 처리
                //
            } else if (this.polymorph === 'panel') {
                //
                // TODO : panel 폴리모프 처리
                //
            } else if (this.polymorph === 'checkbox') {
                //
                // TODO : checkbox 폴리모프 처리
                //
            } else if (this.polymorph === 'radioButton') {
                //
                // TODO : radioButton 폴리모프 처리
                //
            } else if (this.polymorph === 'xList') {
                //
                // TODO : xList 폴리모프 처리
                //
            } else if (this.polymorph === 'banner') {
                //
                // TODO : banner 폴리모프 처리
                //
            }
        }

        return content;
    }

    // XCON에서 값 가져오기
    getValue(key, defaultValue = null) {
        if (!this.xcon) return defaultValue;
        
        // XCON 인스턴스의 get 메서드 사용
        if (isXCON(this.xcon)) {
            const publicProps = getXamongPublicProps();
            let value;

            if (publicProps && typeof publicProps.read === 'function') {
                value = publicProps.read(this.xcon, key, publicProps.MISSING);
                if (value === publicProps.MISSING) {
                    return defaultValue;
                }
            } else {
                if (!this.xcon.contains(key)) {
                    return defaultValue;
                }
                value = this.xcon.get(key);
            }

            let result = value !== null && value !== undefined ? value : defaultValue;

            if (result && (defaultValue === true || defaultValue === false)) {
                if (result === 'true') {
                    result = true;
                } else if (result === 'false') {
                    result = false;
                }
            }

            //XCON.log('getValue===============================================================',key);
            //XCON.log('getValue', this, this.owner, this.owner?.playerHost, result, this.xcon);
            //XCON.log('getValue===============================================================',key);

            if (key === 'components' && isXCON(result)) {
                if (result.contains('nameList') && result.contains('valueList')) {
                    /*
                    const nameList = result.valueList[0];
                    const valueList = result.valueList[1];

                    var components = new XCON();
                    for (let i = 0; i < nameList.length; i++) {
                        const name = nameList[i];
                        const value = valueList[i];

                        var dict = new XCON();
                        const nList = value.valueList[0];
                        const vList = value.valueList[1];
                        for (let j = 0; j < nList.length; j++) {
                            const n = nList[j];
                            const v = vList[j];
                            dict.set(n, v);
                            XCON.log('getValue', n, v);
                        }
                        components.set(name, dict);
                    }
                    result = components;
                    */
                    result = this.parseInnerXCON(result);
                }
            }

            // 문자열이고 템플릿 문법이 포함된 경우에만 체인 서비스 사용
            if (typeof result === 'string' && result.includes('{{') && result.includes('}}')) {
                XCON.logon2(`🔗 [체이닝] ${this.key}.${key} 파싱 시도: "${result}"`);
                
                let chainService = null;

                // ⚠️ 중요: owner가 XaController(playerHost를 가진)라면 바로 사용
                if (this.owner && this.owner.playerHost) {
                    try {
                        XCON.logon2(`🔗 [체이닝] ${this.key} - owner: ${this.owner.constructor.name}(${this.owner.key}), playerHost 있음`);
                        
                        chainService = window.XamongServices.ServiceManager.services(this.owner.playerHost).getService('ChainingService');
                    } catch (error) {
                        console.error(`❌ [체이닝] ${this.key} - 체이닝 서비스 오류:`, error);
                    }
                } else {
                    console.warn(`⚠️ [체이닝] ${this.key} - owner 또는 playerHost 없음:`, { 
                        owner: this.owner?.constructor?.name, 
                        key: this.owner?.key,
                        hasPlayerHost: !!this.owner?.playerHost
                    });

                    if (window.XamongServices) {
                        chainService = window.XamongServices.ServiceHelper.getGlobalServiceManager().getService('ChainingService');
                    }
                }

                if (chainService) {
                    const originalResult = result;
                    result = chainService.parse(this.owner, result);
                    XCON.logon3(`🔗 [체이닝] ${this.key}.${key} 파싱 결과: "${originalResult}" → "${result}"`, result);

                    if (defaultValue === true || defaultValue === false) {
                        if (result === 'true') {
                            result = true;
                        } else if (result === 'false') {
                            result = false;
                        }
                    }
                } else {
                    console.warn(`⚠️ [체이닝] ${this.key} - ChainingService를 찾을 수 없음`);
                }
            } else if (key === 'parameter' && isXCON(result)) {
                // TODO : parameter 체이닝 처리
                result = this.chainXcon(key, result);
                console.warn(`🔗 [체이닝] ${this.key}.${key} 파싱 결과: `, result);
            }

            return result;
        }
        
        return defaultValue;
    }
    
    chainXcon(key, dict) {
        console.warn(`🔗 [체이닝] ${this.key}.${key} 파싱 시도: `, dict);

        const chainService = window.XamongServices.ServiceManager.services(this.owner.playerHost)?.getService('ChainingService');
        this.chainDict(dict, chainService);
        return dict;
    }

    chainDict(dict, chainService) {
        for (const {key, value} of dict) {                      
            if (XCON.isXCONObject(value)) {
                this.chainDict(value, chainService);
            } else if (Array.isArray(value)) {
                this.chainArray(value, chainService);
            } else {
                if (chainService && typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
                    const originalValue = value;
                    const newValue = chainService.parse(this.owner, value);
                    console.warn(`🔗 [체이닝] ${this.key}.${key} 파싱 결과: "${originalValue}" → "${newValue}"`, newValue);
                    dict.set(key, newValue);
                } else {
                    console.warn(`⚠️ [체이닝] ${this.key} - ChainingService를 찾을 수 없음`);
                }
            }
        }
    }

    chainArray(array, chainService) {
        array.forEach((obj, i) => {           
            if (XCON.isXCONObject(obj)) {
                this.chainDict(obj, chainService);
            } else if (Array.isArray(obj)) {
                this.chainArray(obj, chainService);
            } else {
                if (chainService && typeof obj === 'string' && obj.includes('{{') && obj.includes('}}')) {
                    const originalValue = obj;
                    const newValue = chainService.parse(this.owner, obj);
                    console.warn(`🔗 [체이닝] ${this.key}.${key} 파싱 결과: "${originalValue}" → "${newValue}"`, newValue);
                    array[i] = newValue;
                } else {
                    console.warn(`⚠️ [체이닝] ${this.key} - ChainingService를 찾을 수 없음`);
                }
            }
        });
    }

    // 위치 정보 파싱 (x,y,width,height)
    parsePosition(pos) {
        const publicProps = getXamongPublicProps();
        if (publicProps && typeof publicProps.normalizeRect === 'function') {
            return publicProps.normalizeRect(pos, { x: 0, y: 0, width: 100, height: 30 });
        }

        if (!pos) return { x: 0, y: 0, width: 100, height: 30 };

        const parts = pos.toString().split(',').map(p => parseInt(p.trim()) || 0);
        return {
            x: parts[0] || 0,
            y: parts[1] || 0,
            width: parts[2] || 100,
            height: parts[3] || 30
        };
    }
    
    // 마진 정보 파싱 (CSS 순서: 상/우/하/좌)
    parseMargin(margin) {
        const publicProps = getXamongPublicProps();
        if (publicProps && typeof publicProps.normalizeSpacing === 'function') {
            return publicProps.normalizeSpacing(margin);
        }

        if (!margin) return { top: 0, right: 0, bottom: 0, left: 0 };

        const parts = margin.toString().split(',').map(p => parseInt(p.trim()) || 0);
        
        if (parts.length === 1) {
            // 모든 방향이 동일한 경우: margin="10" → 10,10,10,10
            const value = parts[0];
            return { top: value, right: value, bottom: value, left: value };
        } else if (parts.length === 4) {
            // 각각 다른 경우: margin="10,5,0,15" → 상/우/하/좌 (CSS 순서)
            return {
                top: parts[0],
                right: parts[1], 
                bottom: parts[2],
                left: parts[3]
            };
        } else {
            // 잘못된 형식인 경우 기본값 반환
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }
    }
    
    // dock 정보 파싱
    parseDock(dock) {
        if (!dock) return 'none';
        
        const validDocks = ['none', 'left', 'right', 'top', 'bottom', 'fill'];
        const dockValue = dock.toString().toLowerCase().trim();
        
        return validDocks.includes(dockValue) ? dockValue : 'none';
    }
    
    // 색상 파싱 (r,g,b,a)
    parseColor(color, a = null) {
        const publicProps = getXamongPublicProps();
        if (publicProps && typeof publicProps.normalizeColor === 'function') {
            return publicProps.normalizeColor(color, a);
        }

        if (!color) return null;

        const raw = color.toString().trim();
        const themed = expandXamongThemeTokenAliases(raw);
        if (themed !== raw) return themed;

        const parts = raw.split(',').map(p => parseInt(p.trim()) || 0);
        if (parts.length >= 3) {
            const alpha = a !== null ? a : (parts.length > 3 ? parts[3] / 255 : 1);
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
        }
        return raw;
    }
    
    // 기본 스타일 생성
    getBaseStyle(useBgColor = true, useFgColor = true) {
        const pos = this.parsedPos;
        const margin = this.parsedMargin;
        const dock = this.parsedDock;
        
        let style = '';
        
        // dock 속성에 따른 스타일 적용
        if (dock === 'none') {
            // 기본 절대 위치 방식
            const actualLeft = pos.x + margin.left;
            const actualTop = pos.y + margin.top;
            const actualWidth = pos.width - margin.left - margin.right - (this.border ? this.borderWidth * 2 : 0);
            const actualHeight = pos.height - margin.top - margin.bottom - (this.border ? this.borderWidth * 2 : 0);
            
            style = `
                position: absolute;
                left: ${actualLeft}px;
                top: ${actualTop}px;
                width: ${actualWidth}px;
                height: ${actualHeight}px;
            `;
        } else {
            // dock 방식 - 컴포넌트 자체는 100% 크기
            switch (dock) {
                case 'left':
                case 'right':
                    style = `
                        position: relative;
                        width: ${pos.width}px;
                        height: 100%;
                        flex-shrink: 0;
                        min-height: 0;
                        box-sizing: border-box;
                    `;
                    break;
                case 'top':
                case 'bottom':
                    style = `
                        position: relative;
                        width: 100%;
                        height: ${pos.height}px;
                        flex-shrink: 0;
                        min-width: 0;
                        box-sizing: border-box;
                    `;
                    break;
                case 'fill':
                    style = `
                        position: relative;
                        width: 100%;
                        height: 100%;
                        flex: 1;
                        min-width: 0;
                        min-height: 0;
                        box-sizing: border-box;
                    `;
                    break;
            }
            
            // 마진 적용
            if (margin.top || margin.right || margin.bottom || margin.left) {
                style += `margin: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px;`;
            }
        }
        
        // 배경색 적용
        if (useBgColor && this.bgColor) {
            style += `background-color: ${this.parseColor(this.bgColor)};`;
        }
        
        // 전경색 적용
        if (useFgColor && this.fgColor) {
            style += `color: ${this.parseColor(this.fgColor)};`;
        }
        
        //XCON.logon3('🔍 [getBaseStyle] ================================ visible:', this.key, this.visible);

        // visible 속성 적용
        if (!this.visible) {
            style += `display: none;`;
        }
        
        // enabled 속성 적용 (시각적 피드백)
        if (!this.enabled) {
            style += `opacity: 0.5; pointer-events: none;`;
        }
        
        // 편집 모드 스타일 추가 (window.EDIT_MODE === true일 때만)
        if (window.EDIT_MODE === true) {
            style += `cursor: pointer; transition: outline 0.2s ease, box-shadow 0.2s ease;`;
        }
        
        // 사용자 정의 스타일 적용
        if (this.style) {
            style += expandXamongThemeTokenAliases(this.style);
        }
        
        return style;
    }
    
    // visible 속성 설정
    setVisible(visible) {
        this.visible = visible;
        
        // DOM 요소가 존재하는 경우 스타일 업데이트
        if (this.element) {
            if (visible) {
                // 보이기: display 속성을 제거하여 원래 값으로 복원
                this.element.style.removeProperty('display');
            } else {
                // 숨기기: display: none 적용
                this.element.style.display = 'none';
            }
        }
    }
    
    // 컴포넌트 속성 업데이트 (transition 액션에서 사용)
    updateProperty(propertyName, value) {
        switch (propertyName) {
            case 'visible':
                // 문자열을 boolean으로 변환
                const boolValue = value === 'true' || value === true;
                this.setVisible(boolValue);
                break;
            case 'text':
                this.text = value;
                if (this.element) {
                    // 텍스트 필드나 입력 요소인 경우
                    const inputElement = this.element.querySelector('input, textarea');
                    if (inputElement) {
                        inputElement.value = value;
                    } else {
                        // 일반 텍스트 요소인 경우
                        this.element.textContent = value;
                    }
                }
                XCON.logon2(`📝 [속성] ${this.key} - text 업데이트: "${value}"`);
                break;
            case 'backgroundColor':
            case 'bgColor':
                this.backgroundColor = value;
                this.bgColor = value;
                if (this.element) {
                    this.element.style.backgroundColor = this.parseColor(value);
                }
                break;
            case 'bgImage':
                if (this.element) {
                    this.element.style.backgroundImage = `url('${value}')`;
                    this.element.style.backgroundSize = 'cover';
                    this.element.style.backgroundPosition = 'center';
                    this.element.style.backgroundRepeat = 'no-repeat';
                }
                break;
            case 'color':
            case 'fgColor':
                this.color = value;
                this.fgColor = value;
                if (this.element) {
                    this.element.style.color = this.parseColor(value);
                }
                break;
            case 'enabled':
                // enabled 속성 업데이트
                const enabledValue = value === 'true' || value === true;
                this.enabled = enabledValue;
                
                if (this.element) {
                    // 폼 요소들의 disabled 속성 처리
                    if (this.element.tagName === 'INPUT' || this.element.tagName === 'BUTTON' || this.element.tagName === 'TEXTAREA') {
                        this.element.disabled = !enabledValue;
                    } else {
                        // 자식 폼 요소들 찾아서 disabled 처리
                        const childInputs = this.element.querySelectorAll('input, button, textarea, select');
                        childInputs.forEach(input => {
                            input.disabled = !enabledValue;
                        });
                    }
                    
                    // 시각적 피드백 적용
                    this.element.style.opacity = enabledValue ? '1' : '0.5';
                    this.element.style.pointerEvents = enabledValue ? '' : 'none';
                }
                XCON.logon2(`🔘 [속성] ${this.key} - enabled 업데이트: ${enabledValue}`);
                break;
            case 'pos':
                // 위치 속성 업데이트
                this.pos = value;
                this.parsedPos = this.parsePosition(value);
                
                if (this.element) {
                    const pos = this.parsedPos;
                    const margin = this.parsedMargin;
                    const dock = this.parsedDock;
                    
                    if (dock === 'none') {
                        // 절대 위치 방식
                        const actualLeft = pos.x + margin.left;
                        const actualTop = pos.y + margin.top;
                        const actualWidth = pos.width - margin.left - margin.right;
                        const actualHeight = pos.height - margin.top - margin.bottom;
                        
                        this.element.style.position = 'absolute';
                        this.element.style.left = `${actualLeft}px`;
                        this.element.style.top = `${actualTop}px`;
                        this.element.style.width = `${actualWidth}px`;
                        this.element.style.height = `${actualHeight}px`;
                    } else {
                        // dock 방식은 width/height만 업데이트
                        if (dock === 'left' || dock === 'right') {
                            this.element.style.width = `${pos.width}px`;
                        } else if (dock === 'top' || dock === 'bottom') {
                            this.element.style.height = `${pos.height}px`;
                        }
                    }
                }
                XCON.logon2(`📐 [속성] ${this.key} - pos 업데이트: ${value}`);
                break;
            case 'style':
                // 사용자 정의 스타일 업데이트
                this.style = value;
                if (this.element) {
                    // 기존 사용자 정의 스타일 제거 후 새로운 스타일 적용
                    // (완전한 재렌더링이 필요할 수 있지만, 간단한 경우 직접 적용)
                    const nextStyle = expandXamongThemeTokenAliases(value);
                    const styleProps = nextStyle.split(';').filter(s => s.trim());
                    styleProps.forEach(prop => {
                        const [property, val] = prop.split(':').map(s => s.trim());
                        if (property && val) {
                            this.element.style[property] = val;
                        }
                    });
                }
                XCON.logon2(`🎨 [속성] ${this.key} - style 업데이트: "${value}"`);
                break;
            case 'checked':
                // 체크박스/라디오버튼 체크 상태 업데이트
                const checkedValue = value === 'true' || value === true;
                this.checked = checkedValue;
                
                if (this.element) {
                    const inputElement = this.element.querySelector('input[type="checkbox"], input[type="radio"]');
                    if (inputElement) {
                        inputElement.checked = checkedValue;
                    }
                }
                XCON.logon2(`☑️ [속성] ${this.key} - checked 업데이트: ${checkedValue}`);
                break;
            case 'state':
                // 체크박스/라디오버튼 상태 업데이트
                this.state = value;
                const stateChecked = value === 'checked';
                this.checked = stateChecked;
                
                if (this.element) {
                    const inputElement = this.element.querySelector('input[type="checkbox"], input[type="radio"]');
                    if (inputElement) {
                        inputElement.checked = stateChecked;
                        if (value === 'indeterminate' && inputElement.type === 'checkbox') {
                            inputElement.indeterminate = true;
                        }
                    }
                }
                XCON.logon2(`🔘 [속성] ${this.key} - state 업데이트: ${value}`);
                break;
            case 'src':
            case 'image':
                // 이미지 소스 업데이트
                if (propertyName === 'src') {
                    this.src = value;
                } else {
                    this.image = value;
                }
                this.finalImageSrc = this.src || this.image || '';
                
                if (this.element) {
                    const imgElement = this.element.querySelector('img');
                    if (imgElement) {
                        imgElement.src = value;
                    }
                }
                XCON.logon2(`🖼️ [속성] ${this.key} - ${propertyName} 업데이트: "${value}"`);
                break;
            case 'url':
                // 비디오/웹뷰 URL 업데이트
                this.url = value;
                
                if (this.element) {
                    const videoElement = this.element.querySelector('video');
                    const iframeElement = this.element.querySelector('iframe');
                    if (videoElement) {
                        videoElement.src = value;
                    } else if (iframeElement) {
                        iframeElement.src = value;
                    }
                }
                XCON.logon2(`🔗 [속성] ${this.key} - url 업데이트: "${value}"`);
                break;
            case 'xcon':
                // Frame/Import 컴포넌트의 XCON 파일 업데이트
                this.xconFile = value;
                
                // 새로운 XCON 파일 로드 (비동기)
                if (this.loadXCONFile && value) {
                    setTimeout(() => {
                        this.loadXCONFile(value);
                    }, 0);
                }
                XCON.logon2(`📄 [속성] ${this.key} - xcon 파일 업데이트: "${value}"`);
                break;
            default:
                // 기타 속성들은 직접 스타일로 적용
                if (this.element && this.element.style[propertyName] !== undefined) {
                    this.element.style[propertyName] = value;
                }
                break;
        }
    }
    
    parseInnerXCON(xcon) {
        const nList = xcon.valueList[0];
        const vList = xcon.valueList[1];

        var dict = new XCON();
        for (let j = 0; j < nList.length; j++) {
            const n = nList[j];
            const v = vList[j];

            if (v.contains && v.contains('nameList') && v.contains('valueList')) {
                dict.set(n, this.parseInnerXCON(v));
            } else {
                dict.set(n, v);
            }
        }
        return dict;
    }

    // 클릭 이벤트 처리
    getClickHandler() {
        if (window.EDIT_MODE === true) return '';

        if (!this.onClick) return '';
        
        XCON.log('------------------------->>>> getClickHandler', this.onClick);
        if (this.onClick.contains && this.onClick.contains('nameList') && this.onClick.contains('valueList')) {
            this.onClick = this.parseInnerXCON(this.onClick);
        }

        // onClick 액션 데이터를 JSON 문자열로 변환하여 data 속성에 설정
        const onClickJson = JSON.stringify(this.onClick).replace(/"/g, '&quot;');
        
        // 이벤트 전파 제어 속성들을 data 속성으로 추가
        const eventPropagationAttr = `data-event-propagation="${this.eventPropagation}"`;
        const stopPropagationAttr = this.stopPropagation ? `data-stop-propagation="true"` : '';
        const preventDefaultAttr = this.preventDefault ? `data-prevent-default="true"` : '';
        
        return `data-on-click="${onClickJson}" ${eventPropagationAttr} ${stopPropagationAttr} ${preventDefaultAttr} onclick="handleComponentClick('${this.key}', this, event)"`;
    }
    
    // 기본 렌더링 (하위 클래스에서 구현)
    // 기본 HTML 생성
    createHTML() {
        const style = this.getBaseStyle();
        const clickHandler = this.getClickHandler();
        
        return `<div style="${style}" data-component="${this.type}" data-component-key="${this.key}" ${clickHandler}>
            ${this.type}: ${this.key}
        </div>`;
    }
    
    // 컴포넌트 렌더링
    render() {       
        if (!this.type) return '';
        
        const html = this.createHTML();
        
        // 렌더링 후 DOM 요소 설정 및 편집 모드 이벤트 연결
        // requestAnimationFrame을 사용하여 브라우저 렌더링 사이클과 동기화
        this._initializeElement();
        
        return this.doPolymorph(html);
    }
    
    // DOM 요소 초기화 (안전한 재시도 로직 포함)
    _initializeElement(func = null) {
        // 이미 초기화 중이면 중복 실행 방지
        if (this._initializingElement) {
            return;
        }
        this._initializingElement = true;
        
        // requestAnimationFrame을 사용하여 브라우저 렌더링 완료 후 실행
        requestAnimationFrame(() => {
            this._findAndSetupElement(0, func);
        });
    }
    
    // 요소 찾기 및 설정 (재시도 로직 포함)
    _findAndSetupElement(retryCount = 0, func = null) {
        const maxRetries = 10; // 최대 10번 재시도 (약 1.6초)
        const retryDelay = 16; // 약 16ms (1 프레임)
        
        // 요소 찾기 시도
        this.element = document.querySelector(`[data-component-key="${this.key}"]`);
        
        if (this.element) {
            if (func) {
                func();
            }

            // 요소를 찾았으면 편집 모드 이벤트 설정
            if (window.EDIT_MODE === true) {
                this.setupEditModeEvents();
            }
            this._initializingElement = false;
        } else if (retryCount < maxRetries) {
            // 요소를 찾지 못했고 재시도 횟수가 남아있으면 재시도
            setTimeout(() => {
                this._findAndSetupElement(retryCount + 1, func);
            }, retryDelay);
        } else {
            // 최대 재시도 횟수 초과
            console.warn(`⚠️ [XaComponent] 요소를 찾을 수 없습니다: ${this.key} (최대 재시도 횟수 초과)`);
            this._initializingElement = false;
        }
    }

    // 편집 모드 이벤트 설정 (window.EDIT_MODE === true일 때만 호출)
    setupEditModeEvents() {
        if (!this.element || window.EDIT_MODE !== true) {
            return;
        }
        
        // 이미 설정된 경우 중복 설정 방지
        if (this._editModeEventsSetup) {
            return;
        }
        this._editModeEventsSetup = true;
        
        // 마우스 위치 추적 (최상단 컴포넌트 확인용)
        let lastMouseX = 0;
        let lastMouseY = 0;
        this.element.addEventListener('mousemove', (e) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
        
        // 마우스 Enter 이벤트 (hover 효과)
        // ⚠️ 중요: 최상단 컴포넌트만 hover 효과 적용
        this.element.addEventListener('mouseenter', (e) => {
            if (window.EDIT_MODE !== true) return;
            
            // 이미 다른 컴포넌트에서 처리되었는지 확인
            if (e._xamongEditModeHoverHandled) {
                return;
            }
            
            // 현재 마우스 위치의 최상단 컴포넌트 찾기
            const topmostComponent = this._getTopmostComponentAtPoint(lastMouseX, lastMouseY);
            
            if (!topmostComponent) {
                // 컴포넌트를 찾지 못한 경우 현재 요소 사용
                e._xamongEditModeHoverHandled = true;
                this._applyHoverEffect(e);
                return;
            }
            
            // 최상단 컴포넌트의 키 확인
            const topmostComponentKey = topmostComponent.getAttribute('data-component-key');
            if (!topmostComponentKey) {
                e._xamongEditModeHoverHandled = true;
                this._applyHoverEffect(e);
                return;
            }
            
            // 최상단 컴포넌트가 현재 컴포넌트인 경우에만 hover 효과 적용
            if (topmostComponentKey === this.key) {
                e._xamongEditModeHoverHandled = true;
                this._applyHoverEffect(e);
            }
        });
        
        // 마우스 Leave 이벤트 (hover 효과 제거)
        // ⚠️ 중요: 최상단 컴포넌트만 hover 효과 제거
        this.element.addEventListener('mouseleave', (e) => {
            if (window.EDIT_MODE !== true) return;
            
            // 이미 다른 컴포넌트에서 처리되었는지 확인
            if (e._xamongEditModeHoverHandled) {
                return;
            }
            
            // 현재 마우스 위치의 최상단 컴포넌트 찾기
            const topmostComponent = this._getTopmostComponentAtPoint(lastMouseX, lastMouseY);
            
            if (!topmostComponent) {
                // 컴포넌트를 찾지 못한 경우 현재 요소 사용
                e._xamongEditModeHoverHandled = true;
                this._removeHoverEffect(e);
                return;
            }
            
            // 최상단 컴포넌트의 키 확인
            const topmostComponentKey = topmostComponent.getAttribute('data-component-key');
            if (!topmostComponentKey) {
                e._xamongEditModeHoverHandled = true;
                this._removeHoverEffect(e);
                return;
            }
            
            // 최상단 컴포넌트가 현재 컴포넌트인 경우에만 hover 효과 제거
            if (topmostComponentKey === this.key) {
                e._xamongEditModeHoverHandled = true;
                this._removeHoverEffect(e);
            }
        });
        
        // 클릭 이벤트 (선택 표시)
        // ⚠️ 중요: 최상단 컴포넌트만 선택되도록 처리
        this.element.addEventListener('click', (e) => {
            if (window.EDIT_MODE !== true) return;
            
            // 이미 다른 컴포넌트에서 선택 처리가 완료되었는지 확인
            if (e._xamongEditModeHandled) {
                return;
            }
            
            // 겹쳐진 컴포넌트 중 최상단 컴포넌트 찾기
            const topmostComponent = this._getTopmostComponentAtPoint(e.clientX, e.clientY);
            
            if (!topmostComponent) {
                // 컴포넌트를 찾지 못한 경우 현재 요소 사용
                e._xamongEditModeHandled = true;
                this._selectComponent(this.element, this, e);
                return;
            }
            
            // 최상단 컴포넌트의 키 확인
            const topmostComponentKey = topmostComponent.getAttribute('data-component-key');
            if (!topmostComponentKey) {
                e._xamongEditModeHandled = true;
                this._selectComponent(this.element, this, e);
                return;
            }
            
            // 최상단 컴포넌트가 현재 컴포넌트인 경우에만 선택
            if (topmostComponentKey === this.key) {
                e._xamongEditModeHandled = true;
                this._selectComponent(this.element, this, e);
            }
            // 다른 컴포넌트가 최상단인 경우, 이벤트가 버블링되어 해당 컴포넌트에서 처리됨
        });
    }
    
    // 클릭 위치의 최상단 컴포넌트 찾기
    _getTopmostComponentAtPoint(x, y) {
        try {
            // 클릭 위치의 모든 요소 가져오기 (상위에서 하위 순서)
            const elementsAtPoint = document.elementsFromPoint(x, y);
            
            // data-component-key 속성을 가진 첫 번째 요소 찾기 (최상단)
            for (const element of elementsAtPoint) {
                if (element.hasAttribute('data-component-key')) {
                    return element;
                }
            }
        } catch (error) {
            // elementsFromPoint가 지원되지 않는 브라우저의 경우 폴백
            console.warn('elementsFromPoint not supported, using fallback:', error);
        }
        
        // 폴백: e.target에서 시작하여 data-component-key를 가진 가장 가까운 부모 찾기
        return null;
    }
    
    // Hover 효과 적용 (최상단 컴포넌트만)
    _applyHoverEffect(event) {
        /*
        // 선택된 상태가 아닐 때만 hover 효과 적용
        if (!this.element.classList.contains('xamong-edit-selected')) {
            this.element.style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
            this.element.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.3)';
        }
        */
       
        // 외부 이벤트 발생
        this.dispatchEditModeEvent('mouseenter', {
            component: this,
            key: this.key,
            type: this.type,
            element: this.element,
            originalEvent: event
        });
    }
    
    // Hover 효과 제거 (최상단 컴포넌트만)
    _removeHoverEffect(event) {
        /*
        // 선택된 상태가 아닐 때만 hover 효과 제거
        if (!this.element.classList.contains('xamong-edit-selected')) {
            this.element.style.outline = '';
            this.element.style.boxShadow = '';
        }
        */

        // 외부 이벤트 발생
        this.dispatchEditModeEvent('mouseleave', {
            component: this,
            key: this.key,
            type: this.type,
            element: this.element,
            originalEvent: event
        });
    }
    
    // 컴포넌트 선택 로직 (중복 코드 제거)
    _selectComponent(element, component, event) {
        /*
        // 기존 선택된 컴포넌트의 선택 표시 제거
        const previouslySelected = document.querySelector('.xamong-edit-selected');
        if (previouslySelected && previouslySelected !== element) {
            previouslySelected.classList.remove('xamong-edit-selected');
            previouslySelected.style.outline = '';
            previouslySelected.style.boxShadow = '';
        }
        
        // 현재 컴포넌트 선택 표시
        element.classList.add('xamong-edit-selected');
        element.style.outline = '2px solid rgba(59, 130, 246, 0.8)';
        element.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
        */

        // 외부 이벤트 발생
        component.dispatchEditModeEvent('click', {
            component: component,
            key: component.key,
            type: component.type,
            element: element,
            originalEvent: event
        });
    }
    
    // 편집 모드 이벤트 디스패치 (외부에서 이벤트 연결 가능)
    dispatchEditModeEvent(eventType, detail) {
        if (window.EDIT_MODE !== true) return;
        
        // CustomEvent를 사용하여 외부에서 이벤트를 감지할 수 있도록 함
        const customEvent = new CustomEvent(`xamong:edit:${eventType}`, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });
        
        // 요소에서 이벤트 발생
        if (this.element) {
            this.element.dispatchEvent(customEvent);
        }
        
        // 전역 이벤트도 발생 (window 레벨)
        window.dispatchEvent(new CustomEvent(`xamong:edit:${eventType}`, {
            detail: detail,
            bubbles: false,
            cancelable: true
        }));
    }
    
    // 편집 모드 이벤트 리스너 제거
    removeEditModeEvents() {
        if (!this.element || !this._editModeEventsSetup) {
            return;
        }
        
        // 이벤트 리스너는 제거하지 않고 플래그만 해제
        // (실제로는 removeEventListener를 호출해야 하지만, 
        //  익명 함수로 등록되어 있어서 참조를 유지해야 함)
        this._editModeEventsSetup = false;
        
        // 선택 표시 제거
        if (this.element.classList.contains('xamong-edit-selected')) {
            this.element.classList.remove('xamong-edit-selected');
            this.element.style.outline = '';
            this.element.style.boxShadow = '';
        }
    }
    
    // 자동 갱신 시작
    startAutoUpdate() {
        // 이미 실행 중이면 중복 시작하지 않음
        if (this._autoUpdateInterval) {
            return;
        }
        
        // 1초마다 컴포넌트 업데이트 체크 (체이닝 처리 포함)
        this._autoUpdateInterval = setInterval(() => {
            this.updateComponent();
        }, 1000);
        
        XCON.log(`🔄 ${this.key} 자동 갱신 시작`);
    }
    
    // 자동 갱신 중지
    stopAutoUpdate() {
        if (this._autoUpdateInterval) {
            clearInterval(this._autoUpdateInterval);
            this._autoUpdateInterval = null;
            XCON.log(`🔄 ${this.key} 자동 갱신 중지`);
        }
    }
    
    // 컴포넌트 해제
    dispose() {
        this.stopAutoUpdate();
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
    
    // 컴포넌트 렌더링 완료 후 호출 (모든 요소가 로딩된 시점)
    onLoadComplete() {
        XCON.log(`🎨 XaController.onLoadComplete() 호출: ${this.key}`);
        
        if (this.isDestroyed) {
            XCON.warn(`⚠️ 파괴된 컨트롤러에서 onLoadComplete() 호출: ${this.key}`);
            return;
        }
        
        // onLoad: 컴포넌트의 모든 요소들이 렌더링되고 완전히 로딩된 시점
        // 최초 한 번만 실행되도록 _onLoadExecuted 플래그 확인
        if (this.onLoad && !this._onLoadExecuted) {
            XCON.log(`🎯 onLoad 액션 실행: ${this.key}`);
            this.executeAction(this.onLoad);
            this._onLoadExecuted = true; // 실행 완료 표시
        } else if (this.onLoad && this._onLoadExecuted) {
            XCON.log(`⏭️ XaController ${this.key}: onLoad는 이미 실행되었으므로 건너뜀`);
        }
        
        // 페이지가 활성화 상태로 설정
        this.isRunning = true;
        this.isStop = false;
        
        XCON.log(`✅ XaController 로드 완료: ${this.key}`);
    }
    
    // 액션 실행 - 전역 executeAction 함수 사용
    executeAction(action) {
        if (action && window.executeAction) {
            XCON.log('XaController executing action:', action);
            window.executeAction(action, this);
        } else if (action) {
            XCON.log('XaController action found but no executeAction function:', action);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.toString().replace(/[&<>"']/g, function(match) {
            const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeMap[match];
        });
    }

    // 인증이 필요한 이미지인지 판단하는 메서드
    needsAuth(imageSrc) {
        // 외부 URL이거나 특정 패턴인 경우 인증 필요
        return imageSrc.startsWith('http') || 
                imageSrc.includes('/api/') || 
                imageSrc.includes('/auth/') ||
                imageSrc.includes('token=');
    }
    
    // 이미지 경로 처리 - 상대 경로인 경우 ApplicationService에서 imagebase 적용
    resolveImagePath(imagePath, playerHost = null) {
        if (!imagePath) return '';
        
        if (playerHost === null || playerHost === undefined) {
            playerHost = this.owner?.playerHost;
        }

        let imageSrc = imagePath;
        if (imageSrc && !imageSrc.startsWith('http://') && !imageSrc.startsWith('https://') && !imageSrc.startsWith('/')) {
            // ⚠️ 중요: playerHost를 통해 ApplicationService 접근
            let appService = null;
            if (playerHost) {
                try {
                    const serviceManager = window.XamongServices.ServiceManager.services(playerHost);
                    if (serviceManager) {
                        appService = serviceManager.getService('ApplicationService');
                    }
                } catch (e) {
                    XCON.warn('playerHost를 통한 ApplicationService 접근 실패:', e.message);
                }

                // Fallback: 기존 방식
                if (!appService) {
                    const appHost = window.appHost;
                    const currentOwner = window.appHost.getCurrentOwner();
                    appService = (appHost && appHost.serviceManager && appHost.serviceManager.getService('ApplicationService')) ||
                                (currentOwner && currentOwner.playerHost && currentOwner.playerHost.serviceManager && currentOwner.playerHost.serviceManager.getService('ApplicationService'));
                }
                
                if (appService && appService.resolveImagePath) {
                    imageSrc = appService.resolveImagePath(imageSrc);
                    XCON.log(`🖼️ resolveImagePath: ${imagePath} → ${imageSrc}`);
                }
            } else {
                if (window.XamongServices) {
                    appService = window.XamongServices.ServiceHelper.getGlobalServiceManager().getService('ApplicationService');
                    if (appService  && appService.repository && appService.repository.contains('selectedAppImageBase')) {
                        imageSrc = `${appService.repository.get('selectedAppImageBase')}/${imageSrc}`;
                    }
                }
            }
        }
        
        const xamongToken = XCON.xamongToken();
        if (xamongToken && xamongToken.userId) {
            imageSrc = imageSrc.replace('/assets/apps/', `/assets/${xamongToken.userId}/apps/`);
        }

        return imageSrc;
    }

    // 비동기적으로 이미지 로드 후 DOM 업데이트하는 메서드
    async loadImageWithAuthAsync(imageUrl, selectors) {
        try {
            // 헤더 설정
            const headers = {};
            XCON.setAuthHeader(headers);
                        
            // fetch로 이미지 로드
            const response = await fetch(imageUrl, {
                method: 'GET',
                headers: headers
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                                
                // DOM에서 해당 이미지 요소 찾아서 업데이트
                this.updateImageElement(blobUrl);
                
                return blobUrl;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(error);
            // 에러 발생 시 원본 URL로 폴백 (이미 설정되어 있음)
        }
    }
    
    // 이미지 요소를 업데이트하는 메서드
    updateImageElement(blobUrl, selectors) {
        // 현재 컴포넌트의 이미지 요소 찾기
        const imageElement = document.querySelector(selectors);     
        if (imageElement) {          
            // 이미지 소스 업데이트
            imageElement.src = blobUrl;
            
            // 로딩 완료 이벤트 추가 (선택사항)
            imageElement.onload = () => {
            };
            
            // 에러 처리
            imageElement.onerror = () => {
            };
        } else {
        }
    }
    
    async loadImageWithAuth(imageUrl) {
        try {
            // 헤더 설정
            const headers = {};           
            XCON.setAuthHeader(headers);

            // Fetch API로 이미지 요청
            const response = await fetch(imageUrl, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                // Blob으로 변환
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                return blobUrl;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            throw error;
        }
    }
}

// =============================================================================
// XaController Base Class (컨트롤러 기본 클래스)
// =============================================================================
class XaController extends XaComponent {
    constructor(xcon, key, playerHost = null) {
        // ⚠️ 중요: XaController는 자신이 owner가 됨
        super(xcon, key, null); // owner는 null로 설정 (최상위 컨트롤러)

        this.playerHost = playerHost;
        this.parentController = null;
        
        // ⚠️ 중요: 자신을 현재 페이지의 owner로 설정
        this.owner = this; // 자기 자신을 owner로 설정

        // 생명주기 상태 관리
        this.isRunning = false;
        this.isStop = true;
        this.isPausing = false;
        this.isLoaded = false;
        this.isDestroyed = false;
        this._onLoadExecuted = false; // onLoad 액션이 이미 실행되었는지 추적

        this.data = new XCON();
        this.fetchedData = new XCON();
        this.parameter = new XCON();
        this.componentData = new XCON(); // 컴포넌트 객체 저장소

        this.allComponents = new Map();
        if (this.key === 'root') {
            this.allComponents.set(this.key, this);
        }

        this.dataTemplate = this.getValue('dataTemplate');
        
        this.padding = this.getValue('padding');

        // 생명주기 액션들
        this.onCreate = this.getValue('onCreate');
        this.onLoad = this.getValue('onLoad');
        this.onResume = this.getValue('onResume');
        this.onPause = this.getValue('onPause');
        this.onUnload = this.getValue('onUnload');
        this.variables = new Map();
        
        this._currentAction = null;
        
        // 전역 컨트롤러 등록 (생명주기 관리용)
        this.registerGlobalController();
    }
    
    // 전역 컨트롤러 등록
    registerGlobalController() {
        if (!window.appHost) return;

        let appService = null;
        const serviceManager = window.XamongServices.ServiceManager.services(this.playerHost);
        if (serviceManager) {
            appService = serviceManager.getService('ApplicationService');
        }
        if (!appService) {
            appService = window.appHost.appService;
        }

        if (!appService.controllers) {
            appService.controllers = new Map();
        }
        appService.controllers.set(this.key, this);
        XCON.log(`🎯 XaController 등록: ${this.key}`);
    }
    
    // 전역 컨트롤러 해제
    unregisterGlobalController() {
        if (!window.appHost) return;

        let appService = null;
        const serviceManager = window.XamongServices.ServiceManager.services(this.playerHost);
        if (serviceManager) {
            appService = serviceManager.getService('ApplicationService');
        }
        if (!appService) {
            appService = window.appHost.appService;
        }

        if (appService.controllers) {
            appService.controllers.delete(this.key);
            XCON.log(`🗑️ XaController 해제: ${this.key}`);
        }
    }
    
    // 페이지 표시 시 (네비게이션에서 호출)
    show(effect) {
        XCON.logon(`🎬 XaController.show() 호출: ${this.key}`);
        
        if (this.isDestroyed) {
            XCON.warn(`⚠️ 파괴된 컨트롤러에서 show() 호출: ${this.key}`);
            return;
        }
        
        // 일시정지 상태에서 재개
        if (this.isPausing) {
            this.resume();
        } else {
            // 처음 표시
            this.isRunning = true;
            this.isStop = false;
            
            // onLoad가 아직 실행되지 않았다면 실행
            if (this.isLoaded && this.onLoad) {
                this.executeAction(this.onLoad);
            }
        }
    }

    // 페이지 숨김 시 (네비게이션에서 호출)
    hide(effect) {
        XCON.logon(`🙈 XaController.hide() 호출: ${this.key}`);
        
        if (this.isDestroyed) {
            XCON.warn(`⚠️ 파괴된 컨트롤러에서 hide() 호출: ${this.key}`);
            return;
        }
        
        // 일시정지 상태로 전환
        this.pause();
    }
    
    // 페이지 일시정지 (다른 페이지로 이동 시)
    pause() {
        XCON.logon(`⏸️ XaController.pause() 호출: ${this.key}`);
        
        if (this.isDestroyed || this.isPausing) {
            return;
        }
        
        this.isPausing = true;
        this.isRunning = false;
        
        // onPause 액션 실행
        if (this.onPause) {
            this.executeAction(this.onPause);
        }
    }
    
    // 페이지 재개 (다른 페이지에서 돌아올 때)
    resume() {
        XCON.logon(`▶️ XaController.resume() 호출: ${this.key}`);
        
        if (this.isDestroyed || !this.isPausing) {
            return;
        }
        
        this.isPausing = false;
        this.isRunning = true;
        this.isStop = false;
        
        // onResume 액션 실행
        if (this.onResume) {
            this.executeAction(this.onResume);
        }
    }
    
    // 페이지 언로드 (페이지가 완전히 닫히거나 종료될 때)
    unload() {
        XCON.logon(`🗑️ XaController.unload() 호출: ${this.key}`);
        
        if (this.isDestroyed) {
            return;
        }
        
        // onUnload 액션 실행
        if (this.onUnload) {
            this.executeAction(this.onUnload);
        }
        
        // 리소스 정리
        this.dispose();
    }
    
    // 컨트롤러 완전 파괴
    dispose() {
        XCON.logon(`💀 XaController.dispose() 호출: ${this.key}`);
        
        if (this.isDestroyed) {
            return;
        }
        
        this.isDestroyed = true;
        this.isRunning = false;
        this.isStop = true;
        this.isPausing = false;
        
        // 데이터 정리
        if (this.data) {
            this.data.clear();
        }
        if (this.fetchedData) {
            this.fetchedData.clear();
        }
        if (this.parameter) {
            this.parameter.clear();
        }
        if (this.componentData) {
            this.componentData.clear();
        }
        
        // 변수 정리
        if (this.variables) {
            this.variables.clear();
        }
        
        if (this.allComponents) {
            this.allComponents.clear();
        }

        // 전역 등록 해제
        this.unregisterGlobalController();
        
        XCON.log(`✅ XaController 파괴 완료: ${this.key}`);
    }

    // 데이터 바인딩 처리
    processDataBinding(template, itemData = null, localVars = {}) {
        if (!template) return template;
        
        let result = template.toString();
        
        // {{item.property}} 형태 처리
        if (itemData) {
            result = result.replace(/\{\{item\.(\w+)\}\}/g, (match, property) => {
                let value;
                
                // XCON 객체인 경우
                if (isXCON(itemData)) {
                    value = itemData.get(property);
                } 
                // 일반 객체인 경우
                else {
                    value = itemData[property];
                }
                
                XCON.log(`Data binding: {{item.${property}}} -> "${value}"`);
                return value !== undefined ? value : match;
            });
        }
        
        // {{local.variable}} 형태 처리
        result = result.replace(/\{\{local\.(\w+)\}\}/g, (match, varName) => {
            const value = localVars[varName] || this.variables.get(varName);
            return value !== undefined ? value : match;
        });
        
        // 삼항 연산자 처리 {{item.property ? 'true' : 'false'}}
        result = result.replace(/\{\{item\.(\w+)\s*\?\s*'([^']+)'\s*:\s*'([^']+)'\}\}/g, 
            (match, property, trueVal, falseVal) => {
                if (itemData) {
                    const value = itemData[property];
                    return value && value !== 'false' ? trueVal : falseVal;
                }
                return match;
            });
        
        // 함수 호출 처리 {{formatNumber(item.price, 0)}}원
        result = result.replace(/\{\{formatNumber\(item\.(\w+),\s*(\d+)\)\}\}([^}]*)/g, 
            (match, property, decimals, suffix) => {
                if (itemData) {
                    const value = itemData[property];
                    if (value !== undefined && !isNaN(value)) {
                        return parseInt(value).toLocaleString('ko-KR') + suffix;
                    }
                }
                return match;
            });
        
        return result;
    }
    
    // 테이블 데이터 추출
    extractTableData(tableComponent) {
        XCON.logon(`XaController.extractTableData called with:`, tableComponent);
        
        if (!tableComponent) return [];
        
        const rows = [];
        let rowsData;
        
        // XCON 객체인 경우
        if (isXCON(tableComponent)) {
            const type = tableComponent.get('type');
            if (type === 'xTable') {
                rowsData = tableComponent.get('rows');
            } else if (type === 'template') {
                const template = tableComponent.get('template');
                if (template) {
                    const tabledata = template.get('tabledata');
                    if (tabledata) {
                        if (typeof tabledata === 'string') {
                            const chainService = window.XamongServices.ServiceManager.services(this.owner.playerHost)?.getService('ChainingService');
                            if (chainService) {
                                console.log('XaController.extractTableData -  ======================= :', tabledata);
                                rowsData = chainService.parse(this.owner, tabledata);
                                console.log('XaController.extractTableData -  >>>>>>>>>>>>>>>>>>>>>>> :', rowsData);
                            }
                        } else {
                            rowsData = tabledata;
                        }
                    }
                }
            } else if (type === 'custom') {
                // TBD
            } else if (type === 'systemdb') {
                // TBD
            } else {
                rowsData = tableComponent.get('rows');
            }
            XCON.log('XCON object - rows:', rowsData);
        } 
        // 일반 객체인 경우
        else if (tableComponent.rows) {
            rowsData = tableComponent.rows;
            XCON.log('Plain object - rows:', rowsData);
        }
        // 직접 배열인 경우
        else if (Array.isArray(tableComponent)) {
            rowsData = tableComponent;
            XCON.log('Direct array:', rowsData);
        }
        
        if (rowsData && Array.isArray(rowsData)) {
            rowsData.forEach((row, index) => {
                XCON.log(`Processing row ${index}:`, row);
                
                if (row && row.data && typeof row.data === 'object') {
                    // XCON 인스턴스
                    const rowObject = {};
                    for (const [key, value] of row.data) {
                        rowObject[key] = value;
                    }
                    rows.push(rowObject);
                    XCON.log(`Added XCON row:`, rowObject);
                } else if (typeof row === 'object' && row !== null) {
                    // 일반 객체
                    rows.push(row);
                    XCON.log(`Added plain row:`, row);
                }
            });
        }
        
        XCON.log(`Final extracted rows:`, rows);
        return rows;
    }
    
    // 컨트롤러 초기화 (컴포넌트 생성 시점)
    initialize() {
        XCON.logon2(`🚀 [생명주기] ${this.key} - initialize() 시작`);
        
        if (this.isDestroyed) {
            console.warn(`⚠️ [생명주기] ${this.key} - 파괴된 컨트롤러에서 initialize() 호출`);
            return;
        }
        
        if (!this.isLoaded) {
            // onCreate 액션 실행 전에 isStop을 false로 설정
            this.isStop = false;
            XCON.logon2(`🔓 [생명주기] ${this.key} - isStop 해제`);
            
            // onCreate: 컴포넌트가 생성되는 시점
            if (this.onCreate) {
                XCON.logon2(`📦 [생명주기] ${this.key} - onCreate 액션 실행 시작`);
                this.executeAction(this.onCreate);
                XCON.logon2(`✅ [생명주기] ${this.key} - onCreate 액션 실행 완료`);
            } else {
                XCON.logon2(`ℹ️ [생명주기] ${this.key} - onCreate 액션 없음`);
            }
            
            this.isLoaded = true;
            XCON.logon2(`✅ [생명주기] ${this.key} - initialize() 완료 (isLoaded: true)`);
        } else {
            XCON.logon2(`⏭️ [생명주기] ${this.key} - 이미 초기화됨, onCreate 중복 실행 방지`);
        }
    }
    
    // 컴포넌트 렌더링 완료 후 호출 (모든 요소가 로딩된 시점)
    onLoadComplete() {
        XCON.logon2(`🎨 [생명주기] ${this.key} - onLoadComplete() 시작 (모든 렌더링 완료 후)`);
        
        if (this.isDestroyed) {
            console.warn(`⚠️ [생명주기] ${this.key} - 파괴된 컨트롤러에서 onLoadComplete() 호출`);
            return;
        }
        
        // onLoad: 컴포넌트의 모든 요소들이 렌더링되고 완전히 로딩된 시점
        if (this.onLoad) {
            XCON.logon2(`🎯 [생명주기] ${this.key} - onLoad 액션 실행 시작`);
            this.executeAction(this.onLoad);
            XCON.logon2(`✅ [생명주기] ${this.key} - onLoad 액션 실행 완료`);
        } else {
            XCON.logon2(`ℹ️ [생명주기] ${this.key} - onLoad 액션 없음`);
        }
        
        // 페이지가 활성화 상태로 설정
        this.isRunning = true;
        this.isStop = false;
        
        XCON.logon2(`🎉 [생명주기] ${this.key} - onLoadComplete() 완료 (isRunning: true, isStop: false)`);
    }
    
    // 액션 실행 - 전역 executeAction 함수 사용
    executeAction(action) {
        if (action && window.executeAction) {
            XCON.log('XaController executing action:', action);
            window.executeAction(action, this);
        } else if (action) {
            XCON.log('XaController action found but no executeAction function:', action);
        }
    }
}

// =============================================================================
// XaForm 컴포넌트 & 컨트롤러
// =============================================================================
class XaForm extends XaController {
    constructor(xcon, key, playerHost = null) {
        super(xcon, key, playerHost);
        this.hidenavbar = this.getValue('hidenavbar', true);
        this.hidebackbtn = this.getValue('hidebackbtn', true);
        this.title = this.getValue('title', '');
        this.bgImage = this.getValue('bgImage');
        this.components = this.getValue('components');
        this.modal = this.getValue('modal', false);
        this.closable = this.getValue('closable', true);
        this.scroll = this.getValue('scroll', 'none');
        this.contentSize = this.getValue('contentSize');
        this.autoChildRendering = true; // 하위 컴포넌트 자동 렌더링 제어

        this.name = this.getValue('name');

        this.triggers = this.getValue('triggers');
        
        // XCON 이벤트 감시 시스템
        this.watchedXCONs = new Map(); // 감시 중인 XCON 객체들과 리스너 저장
        this.eventSubscriptions = new Map(); // 이벤트 구독 정보 저장
        this.isWatchingEnabled = this.triggers ? true : false; // 감시 활성화 상태
        this.isWatchingPaused = false; // 감시 일시정지 상태
        this.renderThrottleTimeout = null; // 렌더링 쓰로틀링용 타이머
        this.pendingPropertyChanges = new Set(); // 대기 중인 속성 변경 이벤트들
    }
    
    disableAutoChildRendering() {
        this.autoChildRendering = false;
        XCON.log(`XaForm ${this.key}: 하위 컴포넌트 자동 렌더링 비활성화`);
    }
    
    getHiddenScrollbarClass() {
        // 고유한 클래스명 생성
        const className = `xa-form-hidden-scrollbar-${this.key}`;
        
        // CSS 스타일 정의
        const cssRules = `
            .${className}::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Edge */
            }
            .${className} {
                -ms-overflow-style: none;  /* IE and Edge */
                scrollbar-width: none;  /* Firefox */
                -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
                scroll-behavior: smooth; /* 부드러운 스크롤 */
            }
        `;
        
        // 스타일 태그가 이미 존재하는지 확인
        const existingStyle = document.getElementById(`style-${className}`);
        if (!existingStyle) {
            // 새로운 스타일 태그 생성 및 추가
            const styleElement = document.createElement('style');
            styleElement.id = `style-${className}`;
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
            
            XCON.log(`🎨 XaForm ${this.key}: 스크롤바 숨김 스타일 추가`);
        }
        
        return className;
    }
    
    // =============================================================================
    // XCON 이벤트 감시 시스템 (React useEffect와 유사한 기능)
    // =============================================================================
    
    /**
     * XCON 감시 시작 - 초기화 시점에서 자동 호출
     */
    startWatching() {
        if (!this.isWatchingEnabled) return;
        
        // 기존 감시 중지 (중복 방지)
        this._stopWatchingInternal();
        
        XCON.logon(`🔍 XaForm ${this.key}: XCON 감시 시작`);
        
        // 1. this.data 감시
        if (this.data && typeof this.data.addEventListener === 'function') {
            this._watchXCON(this.data, 'local');
        }
        
        // 2. appService.repository 감시 (global 데이터)
        const appService = this._getApplicationService();
        if (appService && appService.repository && typeof appService.repository.addEventListener === 'function') {
            //this._watchXCON(appService.repository.get('global'), 'global');
            this._watchXCON(appService.repository, 'global');
        }
    }
    
    /**
     * XCON 감시 중지 - 파괴 시점에서 자동 호출
     */
    stopWatching() {
        XCON.logon(`🛑 XaForm ${this.key}: XCON 감시 중지`);
        this._stopWatchingInternal();
        this.isWatchingEnabled = false;
    }
    
    /**
     * XCON 감시 일시정지 - pause 시점에서 호출
     */
    _pauseWatching() {
        if (!this.isWatchingEnabled) return;
        
        XCON.logon(`⏸️ XaForm ${this.key}: XCON 감시 일시정지`);
        
        // 감시 상태를 일시정지로 설정 (리스너는 유지하되 이벤트 처리 중단)
        this.isWatchingPaused = true;
        
        // 진행 중인 렌더링 타이머 정리
        if (this.renderThrottleTimeout) {
            clearTimeout(this.renderThrottleTimeout);
            this.renderThrottleTimeout = null;
        }
        
        // 대기 중인 변경사항 초기화
        this.pendingPropertyChanges.clear();
    }
    
    /**
     * XCON 감시 재개 - resume 시점에서 호출
     */
    _resumeWatching() {
        if (!this.isWatchingEnabled) return;
        
        XCON.logon(`▶️ XaForm ${this.key}: XCON 감시 재개`);
        
        // 감시 상태를 활성으로 설정
        this.isWatchingPaused = false;
        
        // 감시가 제대로 설정되어 있는지 확인하고 필요시 재시작
        if (this.watchedXCONs.size === 0) {
            XCON.logon(`🔄 XaForm ${this.key}: 재개 시 감시 재설정`);
            this.startWatching();
        }
    }
    
    /**
     * 내부 감시 중지 (플래그 변경 없이)
     */
    _stopWatchingInternal() {
        // 모든 이벤트 리스너 제거
        for (const [xconObj, listeners] of this.watchedXCONs) {
            for (const [eventType, listener] of listeners) {
                if (xconObj && typeof xconObj.removeEventListener === 'function') {
                    xconObj.removeEventListener(eventType, listener);
                }
            }
        }
        
        this.watchedXCONs.clear();
        this.eventSubscriptions.clear();
        this.pendingPropertyChanges.clear();
        
        // 렌더링 타이머 정리
        if (this.renderThrottleTimeout) {
            clearTimeout(this.renderThrottleTimeout);
            this.renderThrottleTimeout = null;
        }
        
        // 일시정지 상태 초기화
        this.isWatchingPaused = false;
    }
    
    /**
     * 특정 XCON 객체 감시 설정
     * @param {XCON} xconObj - 감시할 XCON 객체
     * @param {string} scope - 스코프 ('local' 또는 'global')
     */
    _watchXCON(xconObj, scope) {
        if (!xconObj || typeof xconObj.addEventListener !== 'function') {
            XCON.warn(`XaForm ${this.key}: 유효하지 않은 XCON 객체 (${scope})`);
            return;
        }
        
        // 이미 감시 중인 객체인지 확인 (중복 방지)
        if (this.watchedXCONs.has(xconObj)) {
            XCON.logon(`⚠️ XaForm ${this.key}: ${scope} XCON 이미 감시 중 - 건너뜀`);
            return;
        }
        
        const listeners = new Map();
        
        // 모든 XCON 이벤트 타입에 대해 리스너 등록
        const eventTypes = ['add', 'change', 'insert', 'remove', 'removeAt', 'clear', 'pathUpdate'];
        
        eventTypes.forEach(eventType => {
            const listener = (eventData) => this._handleXCONEvent(eventData, scope, eventType);
            xconObj.addEventListener(eventType, listener);
            listeners.set(eventType, listener);
        });
        
        this.watchedXCONs.set(xconObj, listeners);
        XCON.logon(`✅ XaForm ${this.key}: ${scope} XCON 감시 설정 완료`);
    }
    
    /**
     * XCON 이벤트 처리 핸들러
     * @param {Object} eventData - 이벤트 데이터
     * @param {string} scope - 스코프 ('local' 또는 'global')
     * @param {string} eventType - 이벤트 타입
     */
    _handleXCONEvent(eventData, scope, eventType) {
        if (!this.isWatchingEnabled || this.isDestroyed) return;
        
        // 일시정지 상태에서는 이벤트 처리 중단
        if (this.isWatchingPaused) {
            XCON.logon(`⏸️ XaForm ${this.key}: 일시정지 중이므로 ${scope} XCON 이벤트 무시 (${eventType})`);
            return;
        }
        
        XCON.logon(`🔔 XaForm ${this.key}: ${scope} XCON 이벤트 감지 (${eventType})`, eventData);
        
        // 이벤트 정보를 구조화
        const dependencyChangeEvent = {
            scope: scope,
            eventType: eventType,
            key: eventData.key,
            value: eventData.value,
            oldValue: eventData.oldValue,
            index: eventData.index,
            path: eventData.path,
            timestamp: Date.now(),
            xcon: eventData.xcon
        };
        
        // triggers 실행
        this._executeTriggers(dependencyChangeEvent);
    }
    
    /**
     * triggers 실행
     * @param {Object} dependencyChangeEvent - 속성 변경 이벤트 정보
     */
    _executeTriggers(dependencyChangeEvent) {
        if (!this.triggers) return;
        
        try {
            XCON.logon(`⚡ XaForm ${this.key}: triggers 분석 시작`, dependencyChangeEvent);
            
            // triggers 객체의 모든 트리거를 순회
            for (let i = 0; i < this.triggers.count; i++) {
                const triggerKey = this.triggers.getKey(i);
                const trigger = this.triggers.getValue(i);
                
                if (!trigger || !XCON.isXCONObject(trigger)) continue;
                
                // 트리거 조건 확인
                const shouldExecute = this._shouldExecuteTrigger(trigger, dependencyChangeEvent);
                if (shouldExecute) {
                    XCON.logon(`🎯 XaForm ${this.key}: 트리거 '${triggerKey}' 실행 조건 만족`);
                    
                    // 트리거 실행
                    this._executeSingleTrigger(triggerKey, trigger, dependencyChangeEvent);
                } else {
                    XCON.logon(`🎯 XaForm ${this.key}: 트리거 '${triggerKey}' 실행 조건 불만족`);
                }
            }
        } catch (error) {
            XCON.error(`❌ XaForm ${this.key}: triggers 오류:`, error);
        }
    }
    
    /**
     * 트리거 실행 조건 확인
     * @param {XCON} trigger - 트리거 객체
     * @param {Object} dependencyChangeEvent - 변경 이벤트 정보
     * @returns {boolean} 실행 조건 만족 여부
     */
    _shouldExecuteTrigger(trigger, dependencyChangeEvent) {
        // 1. 이벤트 타입 확인
        const eventFilter = trigger.get('event');
        if (eventFilter && eventFilter !== 'all') {
            if (eventFilter !== dependencyChangeEvent.eventType) {
                return false;
            }
        }
        XCON.logon2('1. 이벤트 타입 확인: ', eventFilter, dependencyChangeEvent.eventType);
        
        // 2. dependency 경로 확인
        const dependencies = trigger.get('dependency');
        if (!dependencies || !Array.isArray(dependencies)) {
            return true; // dependency가 없으면 모든 변경에 반응
        }
        XCON.logon2('2. dependency 경로 확인: ', dependencies);

        // 변경된 경로가 dependency 목록에 포함되는지 확인
        const changedPath = this._getChangedPath(dependencyChangeEvent);
        if (!changedPath) return false;
        
        for (const dependency of dependencies) {
            if (this._pathMatches(changedPath, dependency)) {
                XCON.logon(`✅ XaForm ${this.key}: 경로 매치 - ${changedPath} matches ${dependency}`);
                return true;
            }
        }
        XCON.logon2('3. 변경된 경로 확인: ', changedPath);
        XCON.logon2('4. dependency 목록에 포함되는지 확인: ', dependencies);
        
        return false;
    }
    
    /**
     * 변경된 경로 추출
     * @param {Object} dependencyChangeEvent - 변경 이벤트 정보
     * @returns {string} 변경된 경로
     */
    _getChangedPath(dependencyChangeEvent) {
        // path가 있으면 사용 (setAttributeWithPath에서 제공)
        if (dependencyChangeEvent.path) {
            return dependencyChangeEvent.path;
        }
        
        // key 기반으로 경로 구성
        if (dependencyChangeEvent.key) {
            return `${dependencyChangeEvent.scope}.${dependencyChangeEvent.key}`;
        }
        
        return `${dependencyChangeEvent.scope}`;
    }
    
    /**
     * 경로 매치 확인
     * @param {string} changedPath - 변경된 경로
     * @param {string} dependencyPath - 감시 대상 경로
     * @returns {boolean} 매치 여부
     */
    _pathMatches(changedPath, dependencyPath) {
        XCON.logon2('2.1. 경로 매치 확인: ', changedPath, dependencyPath, 
            changedPath === dependencyPath, 
            dependencyPath.startsWith(changedPath + '.'), 
            changedPath.startsWith(dependencyPath + '.'),
            dependencyPath.endsWith('.' + changedPath),
            changedPath.endsWith('.' + dependencyPath)
        );

        // 정확한 매치
        if (changedPath === dependencyPath) return true;
        
        // 부모 경로 매치 (예: global.userInfo 변경이 global.userInfo.userId에 영향)
        if (dependencyPath.startsWith(changedPath + '.')) return true;
        
        // 하위 경로 매치 (예: global.userInfo.userId 변경이 global.userInfo에 영향)
        if (changedPath.startsWith(dependencyPath + '.')) return true;
        
        // 부모 경로 매치 (예: ui.loading 변경이 local.ui.loading에 영향)
        if (dependencyPath.endsWith('.' + changedPath)) return true;

        // 하위 경로 매치 (예: local.ui.loading 변경이 local.ui에 영향)
        if (changedPath.endsWith('.' + dependencyPath)) return true;
        
        return false;
    }
    
    /**
     * 단일 트리거 실행
     * @param {string} triggerKey - 트리거 키
     * @param {XCON} trigger - 트리거 객체
     * @param {Object} dependencyChangeEvent - 변경 이벤트 정보
     */
    _executeSingleTrigger(triggerKey, trigger, dependencyChangeEvent) {
        try {
            // 액션 실행
            const action = trigger.get('action');
            if (action && XCON.isXCONObject(action)) {
                XCON.logon(`🚀 XaForm ${this.key}: 트리거 '${triggerKey}' 액션 실행`);
                
                const actionContext = {
                    ...dependencyChangeEvent,
                    trigger: trigger,
                    triggerKey: triggerKey,
                    form: this,
                    sender: this
                };
                
                this.executeAction(action, actionContext);
            }
            
            // 렌더링 처리
            const shouldRender = trigger.get('render');
            if (shouldRender === true || shouldRender === 'true') {
                const renderTargets = trigger.get('renderTarget');
                
                if (renderTargets && Array.isArray(renderTargets) && renderTargets.length > 0) {
                    // 특정 컴포넌트만 렌더링
                    XCON.logon(`🎨 XaForm ${this.key}: 트리거 '${triggerKey}' 부분 렌더링`, renderTargets);
                    this._schedulePartialRenderUpdate(renderTargets, dependencyChangeEvent);
                } else {
                    // 전체 렌더링
                    XCON.logon(`🎨 XaForm ${this.key}: 트리거 '${triggerKey}' 전체 렌더링`);
                    
                    // 변경된 속성을 대기 목록에 추가
                    this.pendingPropertyChanges.add(dependencyChangeEvent.path); //`${dependencyChangeEvent.scope}.${dependencyChangeEvent.key}`

                    this._scheduleRenderUpdate(dependencyChangeEvent);
                }
            }
            
        } catch (error) {
            XCON.error(`❌ XaForm ${this.key}: 트리거 '${triggerKey}' 실행 오류:`, error);
        }
    }
    
    /**
     * 부분 렌더링 스케줄링
     * @param {Array} renderTargets - 렌더링 대상 컴포넌트 목록
     * @param {Object} dependencyChangeEvent - 변경 이벤트 정보
     */
    _schedulePartialRenderUpdate(renderTargets, dependencyChangeEvent) {
        // 부분 렌더링 대상을 pendingPropertyChanges에 추가
        renderTargets.forEach(target => {
            this.pendingPropertyChanges.add(`partial:${target}`);
        });
        
        // 일반 렌더링 스케줄링과 동일한 쓰로틀링 적용
        this._scheduleRenderUpdate(dependencyChangeEvent);
    }
    
    /**
     * 화면 갱신 스케줄링 (쓰로틀링 적용)
     * @param {Object} propertyChangeEvent - 속성 변경 이벤트 정보
     */
    _scheduleRenderUpdate(propertyChangeEvent) {        
        // 이미 스케줄된 업데이트가 있으면 기존 타이머 취소
        if (this.renderThrottleTimeout) {
            clearTimeout(this.renderThrottleTimeout);
        }
        
        // 100ms 후에 실제 화면 갱신 실행 (쓰로틀링)
        this.renderThrottleTimeout = setTimeout(() => {
            this._performRenderUpdate();
            this.renderThrottleTimeout = null;
        }, 100);
    }
    
    /**
     * 실제 화면 갱신 수행
     */
    _performRenderUpdate() {
        if (!this.isWatchingEnabled || this.isDestroyed || this.pendingPropertyChanges.size === 0) {
            return;
        }
        
        XCON.logon(`🔄 XaForm ${this.key}: 화면 갱신 수행`, Array.from(this.pendingPropertyChanges));
        
        try {
            // 특정 컴포넌트들만 업데이트하거나 전체 리렌더링 결정
            const shouldFullRerender = this._shouldPerformFullRerender();
            
            if (shouldFullRerender) {
                // 전체 폼 리렌더링
                this._triggerFullRerender();
            } else {
                // 부분 업데이트 (특정 컴포넌트들만)
                this._triggerPartialUpdate();
            }
            
        } catch (error) {
            XCON.error(`❌ XaForm ${this.key}: 화면 갱신 오류:`, error);
        } finally {
            // 대기 중인 변경사항 초기화
            this.pendingPropertyChanges.clear();
        }
    }
    
    /**
     * 전체 리렌더링이 필요한지 판단
     * @returns {boolean}
     */
    _shouldPerformFullRerender() {
        // 부분 렌더링 대상이 있는지 확인
        let hasPartialTargets = false;
        
        for (const changeKey of this.pendingPropertyChanges) {
            // 부분 렌더링 대상이 있으면 부분 렌더링 우선
            if (changeKey.startsWith('partial:')) {
                hasPartialTargets = true;
                continue;
            }
            
            // 전역 데이터 변경이나 구조적 변경이 있는 경우 전체 리렌더링
            if (changeKey.startsWith('global.') || 
                changeKey.includes('components') || 
                changeKey.includes('data.')) {
                return true;
            }
        }
        
        // 부분 렌더링 대상만 있으면 부분 렌더링
        return !hasPartialTargets;
    }
    
    /**
     * 전체 폼 리렌더링 트리거
     */
    _triggerFullRerender() {
        XCON.logon(`🔄 XaForm ${this.key}: 전체 리렌더링 트리거`);
        
        // DOM 요소를 찾아서 다시 렌더링
        // 트리거로 인한 리렌더링이므로 onLoadComplete를 건너뜀
        const formElement = document.querySelector(`[data-key="${this.key}"][data-component="xForm"]`);
        if (formElement) {
            const newHtml = this.render(true); // skipOnLoadComplete = true
            formElement.outerHTML = newHtml;
            XCON.logon(`✅ XaForm ${this.key}: 전체 리렌더링 완료 (onLoad 건너뜀)`);
        }
    }
    
    /**
     * 부분 업데이트 트리거
     */
    _triggerPartialUpdate() {
        XCON.logon(`🔄 XaForm ${this.key}: 부분 업데이트 트리거`);
        
        // 부분 렌더링 대상 추출
        const partialTargets = [];
        const dataChanges = [];
        
        for (const changeKey of this.pendingPropertyChanges) {
            if (changeKey.startsWith('partial:')) {
                // partial: 접두사 제거하고 대상 컴포넌트 추출
                partialTargets.push(changeKey.substring(8));
            } else {
                dataChanges.push(changeKey);
            }
        }
        
        // 특정 컴포넌트들만 업데이트
        if (partialTargets.length > 0) {
            XCON.logon(`🎨 XaForm ${this.key}: 부분 렌더링 대상`, partialTargets);
            this._updateSpecificComponents(partialTargets);
        }
        
        // 데이터 바인딩된 컴포넌트들 업데이트
        for (const changeKey of dataChanges) {
            this._updateBoundComponents(changeKey);
        }
    }
    
    /**
     * 특정 컴포넌트들만 업데이트
     * @param {Array} componentKeys - 업데이트할 컴포넌트 키 목록
     */
    _updateSpecificComponents(componentKeys) {
        try {
            for (const componentKey of componentKeys) {
                XCON.logon3(`🔄 XaForm ${this.key}: 컴포넌트 '${componentKey}' 부분 업데이트`);
              
                const newKey = componentKey.startsWith('self.') ? componentKey.substring(5) : componentKey;
                let component = null;

                newKey.split('.').forEach(key => {
                    component = this._findComponentByKey(key, component);
                    if (!component) {
                        return;
                    }
                });
                
                // 해당 컴포넌트를 찾아서 리렌더링
                if (component) {
                    // 컴포넌트 리렌더링 (기존 DOM 요소 업데이트)
                    this._rerenderComponent(component, newKey.replaceAll('.', '~'));
                } else {
                    XCON.warn(`XaForm ${this.key}: 컴포넌트 '${componentKey}'를 찾을 수 없음`);
                }
            }
        } catch (error) {
            XCON.error(`❌ XaForm ${this.key}: 특정 컴포넌트 업데이트 오류:`, error);
            // 오류 발생 시 전체 리렌더링으로 폴백
            this._triggerFullRerender();
        }
    }
    
    /**
     * 컴포넌트 키로 컴포넌트 찾기
     * @param {string} componentKey - 찾을 컴포넌트 키
     * @returns {Object|null} 컴포넌트 객체 또는 null
     */
    _findComponentByKey(componentKey, parentComponent = null) {
        //console.log(`XaForm._findComponentByKey: ${componentKey}, parentComponent:`, parentComponent);

        // components에서 해당 키의 컴포넌트 찾기
        if (parentComponent) {
            if (parentComponent.contains('components')) {
                return parentComponent.get('components').get(componentKey);
            }
            return parentComponent.get(componentKey);
        } else {
            const components = this.getValue('components');
            if (components && XCON.isXCONObject(components)) {
                return components.get(componentKey);
            }
        }
        return null;
    }
    
    /**
     * 개별 컴포넌트 리렌더링
     * @param {Object} componentData - 컴포넌트 데이터
     * @param {string} componentKey - 컴포넌트 키
     */
    _rerenderComponent(componentData, componentKey) {
        try {
            XCON.logon3(`🔄 XaForm ${this.key}: 컴포넌트 '${componentKey}' 리렌더링`, componentData);
            
            // DOM에서 해당 컴포넌트 요소 찾기
            const key = `${this.key}~${componentKey}`;
            let componentElement = document.getElementById(key);
            if (!componentElement) {
                componentElement = document.querySelector(`[data-key="${key}"]`);
            }
            if (!componentElement) {
                componentElement = document.querySelector(`[data-component-key="${key}"]`);
            }
            if (!componentElement) {
                componentElement = document.querySelector(`[data-component="${componentData.get('type')}"][data-key="${key}"]`);
            }

            if (componentElement) {
                XCON.logon(`🎨 XaForm ${this.key}: 컴포넌트 '${componentKey}' DOM 업데이트`);
                            
                // 컴포넌트 팩토리를 사용해서 새로운 컴포넌트 생성
                if (window.ComponentFactory && window.ComponentFactory.createFromXCON) {
                    XCON.logon2('############################################ ComponentFactory.createFromXCON');
                    XCON.logon2('# XaForm._rerenderComponent ', componentData, key);
                    XCON.logon2('############################################');
    
                    const newComponent = window.ComponentFactory.createFromXCON(componentData, key, this);
                    if (newComponent && newComponent.render) {
                        // 새로운 HTML로 교체
                        const newHTML = newComponent.render();
                        XCON.logon(`🎨 XaForm ${this.key}: 컴포넌트 '${componentKey}' 리렌더링 완료`);
                        componentElement.outerHTML = newHTML;
                    }
                }
            } else {
                XCON.warn(`XaForm ${this.key}: 컴포넌트 '${componentKey}' DOM 요소를 찾을 수 없음`);
            }
        } catch (error) {
            XCON.error(`❌ XaForm ${this.key}: 컴포넌트 '${componentKey}' 리렌더링 오류:`, error);
        }
    }
    
    /**
     * 특정 데이터에 바인딩된 컴포넌트들 업데이트
     * @param {string} changeKey - 변경된 데이터 키
     */
    _updateBoundComponents(changeKey) {
        // 데이터 바인딩된 컴포넌트들을 찾아서 업데이트
        // 예: {{local.userName}} 같은 바인딩을 사용하는 컴포넌트들
        XCON.logon(`🔄 XaForm ${this.key}: ${changeKey}에 바인딩된 컴포넌트 업데이트`);
        
        // TODO: 향후 더 정교한 데이터 바인딩 시스템 구현
        // 현재는 단순히 로그만 출력
    }
    
    /**
     * ApplicationService 접근 (내부용)
     */
    _getApplicationService() {
        // playerHost를 통해 ServiceManager 접근
        if (this.playerHost) {
            try {
                let serviceManager = window.XamongServices.ServiceManager.services(this.playerHost);
                if (serviceManager) {
                    return serviceManager.getService('ApplicationService');
                }
                serviceManager = this.playerHost.serviceManager;
                if (serviceManager) {
                    return serviceManager.getService('ApplicationService');
                }
            } catch (e) {
                XCON.warn('playerHost를 통한 ApplicationService 접근 실패:', e.message);
            }
        }
        
        // Fallback: 전역 appHost에서 가져오기
        if (window.appHost && window.appHost.serviceManager) {
            return window.appHost.serviceManager.getService('ApplicationService');
        }
        
        return null;
    }
    
    /**
     * XaForm 초기화 (부모 initialize 확장)
     */
    initialize() {
        // 부모 클래스의 initialize 호출
        super.initialize();
                
        // XCON 감시 시작
        this.startWatching();
        
        XCON.logon(`🎯 XaForm ${this.key}: 초기화 및 감시 설정 완료`);
    }
    
    /**
     * XaForm 일시정지 - XCON 감시 일시정지
     */
    pause() {
        // 부모 클래스의 pause 호출
        super.pause();
        
        // XCON 감시 일시정지
        this._pauseWatching();
        
        XCON.logon(`⏸️ XaForm ${this.key}: 일시정지 및 XCON 감시 일시정지`);
    }
    
    /**
     * XaForm 재개 - XCON 감시 재시작
     */
    resume() {
        // 부모 클래스의 resume 호출
        super.resume();
        
        // XCON 감시 재시작
        this._resumeWatching();
        
        XCON.logon(`▶️ XaForm ${this.key}: 재개 및 XCON 감시 재시작`);
    }
    
    /**
     * XaForm 파괴 시 정리 작업
     */
    destroy() {
        XCON.logon(`🗑️ XaForm ${this.key}: 파괴 시작`);
        
        // XCON 감시 중지
        this.stopWatching();
        
        // 파괴 상태로 설정
        this.isDestroyed = true;
        
        XCON.log(`✅ XaForm ${this.key}: 파괴 완료`);
    }
    
    /**
     * onLoadComplete
     */
    onLoadComplete() {
        XCON.logon2(`🎯 [생명주기] XaForm ${this.key} - onLoadComplete() 시작 (모든 하위 컴포넌트 렌더링 완료 후)`);
        
        // 부모 클래스의 onLoadComplete 호출 (onLoad 액션 실행)
        super.onLoadComplete();
        
        // 감시 상태 확인 및 재설정 (필요시)
        if (this.isWatchingEnabled && this.watchedXCONs.size === 0) {
            XCON.logon2(`🔄 [생명주기] XaForm ${this.key} - 감시 재설정`);
            this.startWatching();
        }
        
        XCON.logon2(`🎉 [생명주기] XaForm ${this.key} - 전체 생명주기 완료! (감시 중인 XCON: ${this.watchedXCONs.size}개)`);
    }
    
    /**
     * 액션 실행 (부모 executeAction 확장) - 이벤트 컨텍스트 지원
     * @param {Object} action - 실행할 액션
     * @param {Object} eventContext - 이벤트 컨텍스트 (선택사항)
     */
    executeAction(action, eventContext = null) {
        if (action && window.executeAction) {
            XCON.log('XaForm executing action:', action);
            
            // 이벤트 컨텍스트가 있으면 전역 변수로 설정 (액션에서 접근 가능)
            if (eventContext) {
                window._currentEventContext = eventContext;
                XCON.log('XaForm event context set:', eventContext);
            }
            
            try {
                window.executeAction(action, this);
            } finally {
                // 실행 완료 후 컨텍스트 정리
                if (eventContext) {
                    delete window._currentEventContext;
                }
            }
        } else if (action) {
            XCON.log('XaForm action found but no executeAction function:', action);
        }
    }
    
    render(skipOnLoadComplete = false) {
        // playerHost가 없으면 전역 appHost에서 가져오기
        if (!this.playerHost && window.appHost && window.appHost.playerHost) {
            this.playerHost = window.appHost.playerHost;
            XCON.log('🔧 XaForm playerHost 설정:', this.playerHost.constructor.name);
        }
        
        // 현재 XaForm을 전역 현재 컨트롤러로 설정
        window.currentXaForm = this;
        
        XCON.logon2(`🎬 [생명주기] XaForm ${this.key} - render() 시작${skipOnLoadComplete ? ' (트리거 리렌더링, onLoadComplete 건너뜀)' : ''}`);
        
        if (!skipOnLoadComplete) {  
            // 📌 중요: 컴포넌트 렌더링 전에 onCreate 액션 실행
            this.initialize();
        }

        // 배경 스타일 구성 (bgColor 먼저, bgImage 나중에)
        let backgroundStyle = '';
        
        // 1. 배경색 먼저 적용
        if (this.bgColor) {
            backgroundStyle += `background-color: ${this.parseColor(this.bgColor)};`;
        } else {
            backgroundStyle += `background-color: #ffffff;`;
        }
        
        // 2. 배경 이미지 적용 (배경색 위에 렌더링)
        if (this.bgImage) {
            const imageSrc = this.resolveImagePath(this.bgImage, this.playerHost);

            backgroundStyle += `background-image: url('${imageSrc}');`;
            backgroundStyle += `background-size: cover;`;
            backgroundStyle += `background-position: center;`;
            backgroundStyle += `background-repeat: no-repeat;`;
        }
        
        const formStyle = `
            border: ${this.parentController ? '0' : '2'}px solid #e5e7eb;
            border-radius: ${this.name && this.name === 'Virtual Frame' ? 6 : 12}px;
            ${backgroundStyle}
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            overflow: ${this.scroll !== 'none' ? 'auto' : 'hidden'};
            position: relative;
        `;
        
        let html = `<div style="${this.getBaseStyle()}${formStyle}" 
                         data-component="xForm" 
                         data-component-key="${this.key}"
                         data-key="${this.key}"
                         ${this.getClickHandler()}>`;
        
        // 제목 헤더
        let headerHeight = 0;
        if (!this.hidenavbar) {
            headerHeight = 50; // 헤더 높이를 50px로 고정
            html += `
                <div class="xform-header" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 20px;
                    font-size: 18px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 10px 10px 0 0;
                    height: ${headerHeight}px;
                    box-sizing: border-box;
                ">
                    <span>${this.escapeHtml(this.title)}</span>
                    ${this.closable ? `
                        <button style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        " onclick="this.closest('[data-component=xForm]').style.display='none'">×</button>
                    ` : ''}
                </div>
            `;
        }
        
        // 컨텐츠 영역 - 0,0 좌표가 실제 컴포넌트 영역의 시작점이 되도록 설정
        const contentHeight = !this.hidenavbar ? `calc(100% - ${headerHeight}px)` : '100%';
        
        // 스크롤 설정 - 스크롤바 숨김 but 스크롤 기능은 유지
        let scrollStyle = 'hidden';
        let scrollbarHiddenClass = '';
        
        if (this.scroll !== 'none') {
            scrollStyle = 'auto';
            scrollbarHiddenClass = this.getHiddenScrollbarClass();
        }
        
        html += `<div class="xform-content ${scrollbarHiddenClass}" style="
            position: absolute;
            top: ${headerHeight}px;
            left: 0px;
            width: 100%;
            height: ${contentHeight};
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            overflow: ${scrollStyle};
            display: flex;
            flex-direction: column;
        ">
        <div class="xform-dock-container" style="
            display: flex;
            flex-direction: column;
            width: 100%;
            min-height: 100%;
        ">`;
        
        // 컴포넌트들 렌더링
        html += this.renderComponents();
        
        html += `</div></div></div>`;
        
        this._initializeElement();
        
        // 렌더링 완료 후 onLoad 액션 실행 (약간의 지연으로 DOM 렌더링 완료 보장)
        // 단, 트리거로 인한 리렌더링인 경우 onLoadComplete를 건너뜀
        if (!skipOnLoadComplete) {
            setTimeout(() => {
                XCON.logon2(`🔄 [생명주기] XaForm ${this.key} - render() 완료, onLoadComplete 실행`);
                this.onLoadComplete();
            }, 100);
        } else {
            XCON.logon2(`⏭️ [생명주기] XaForm ${this.key} - 트리거 리렌더링이므로 onLoadComplete 건너뜀`);
        }
        
        return html;
    }
        
    renderComponents() {
        if (!this.components) return '<p style="text-align: center; color: #6b7280;">컴포넌트가 없습니다.</p>';
        
        // 자동 렌더링이 비활성화된 경우 빈 컨테이너만 반환 (화면 렌더러에서 개별 처리)
        if (!this.autoChildRendering) {
            XCON.log(`XaForm ${this.key}: 자동 렌더링 비활성화, 빈 컨테이너 반환`);
            return '<div class="xform-components-container"></div>';
        }
        
        XCON.log('🔍 XaForm renderComponents 시작:', this.components);
        XCON.log('🔍 XaForm components.hashtable:', this.components.hashtable);
        
        const componentsOrder = this.components.get('componentsOrder');

        // 모든 컴포넌트 수집
        const allComponents = [];
        const orderArray = componentsOrder ? componentsOrder.split(',') : [];
        
        // 정렬된 순서대로 수집
        if (orderArray.length > 0) {
            orderArray.forEach(componentName => {
                const componentName_trimmed = componentName.trim();
                const component = this.getComponentByName(componentName_trimmed);
                if (component) {
                    if (isXCON(component)) {
                    allComponents.push({
                            key: componentName_trimmed,
                            data: component
                        });
                    } else {
                        // TODO : import component 처리
                    }
                    XCON.log(`순서 기반 컴포넌트 추가: ${componentName_trimmed}`);
                }
            });
        } else {
            // componentsOrder가 없으면 XCON 키 순서 사용
            this.components.keys.forEach(key => {
                if (key === 'componentsOrder') return;
                const component = this.components.get(key);
                if (isXCON(component)) {
                    allComponents.push({
                        key: key,
                        data: component
                    });
                    XCON.log(`XCON 키 순서 컴포넌트 추가: ${key}`);
                } else {
                    // TODO : import component 처리
                }
            });
        }
        
        XCON.log(`🔍 총 ${allComponents.length}개 컴포넌트 렌더링 예정`);
        
        // 컴포넌트들을 dock 속성에 따라 분류
        const dockGroups = {
            top: [],
            left: [],
            right: [],
            bottom: [],
            fill: [],
            none: []
        };
        
        allComponents.forEach((comp, index) => {
            const dockValue = comp.data.get ? comp.data.get('dock') : comp.data.dock;
            const dock = dockValue ? dockValue.toString().toLowerCase() : 'none';
            
            if (dockGroups[dock]) {
                dockGroups[dock].push(comp);
            } else {
                dockGroups.none.push(comp);
            }
        });
        
        // dock 순서에 따라 HTML 생성
        let html = '';
        
        // 1. Top 컴포넌트들
        dockGroups.top.forEach((comp, index) => {
            const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
            if (componentHtml) {
                html += componentHtml;
                XCON.log(`컴포넌트 렌더링 완료 (top): ${comp.key} (${index + 1}/${dockGroups.top.length})`);
            }
        });
        
        // 2. 중간 행 컨테이너 (left, fill, right)
        if (dockGroups.left.length > 0 || dockGroups.right.length > 0 || dockGroups.fill.length > 0) {
            html += `<div style="display: flex; flex-direction: row; flex: 1; width: 100%;">`;
            
            // Left 컴포넌트들
            dockGroups.left.forEach((comp, index) => {
                const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
                if (componentHtml) {
                    html += componentHtml;
                    XCON.log(`컴포넌트 렌더링 완료 (left): ${comp.key} (${index + 1}/${dockGroups.left.length})`);
                }
            });
            
            // Fill 컴포넌트들
            dockGroups.fill.forEach((comp, index) => {
                const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
                if (componentHtml) {
                    html += componentHtml;
                    XCON.log(`컴포넌트 렌더링 완료 (fill): ${comp.key} (${index + 1}/${dockGroups.fill.length})`);
                }
            });
            
            // Right 컴포넌트들
            dockGroups.right.forEach((comp, index) => {
                const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
                if (componentHtml) {
                    html += componentHtml;
                    XCON.log(`컴포넌트 렌더링 완료 (right): ${comp.key} (${index + 1}/${dockGroups.right.length})`);
                }
            });
            
            html += `</div>`;
        }
        
        // 3. Bottom 컴포넌트들
        dockGroups.bottom.forEach((comp, index) => {
            const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
            if (componentHtml) {
                html += componentHtml;
                XCON.log(`컴포넌트 렌더링 완료 (bottom): ${comp.key} (${index + 1}/${dockGroups.bottom.length})`);
            }
        });
        
        // 4. None (절대 위치) 컴포넌트들
        dockGroups.none.forEach((comp, index) => {
            const componentHtml = this.renderSingleComponent(comp.data, `${this.key}~${comp.key}`);
            if (componentHtml) {
                html += componentHtml;
                XCON.log(`컴포넌트 렌더링 완료 (none): ${comp.key} (${index + 1}/${dockGroups.none.length})`);
            }
        });
        
        XCON.log(`🔍 XaForm ${this.key}: 총 HTML 길이 = ${html.length}`);
        XCON.log(`🔍 Dock 분류:`, {
            top: dockGroups.top.length,
            left: dockGroups.left.length,
            right: dockGroups.right.length,
            bottom: dockGroups.bottom.length,
            fill: dockGroups.fill.length,
            none: dockGroups.none.length
        });
        return html;
    }
    
    getComponentByName(name) {
        if (!this.components) return null;
        
        // XCON 내부 속성 체크
        if (!this.components.contains(name)) return null;
        
        // XCON hashtable에서 찾기
        if (this.components.hashtable && this.components.hashtable instanceof Map) {
            return this.components.hashtable.get(name);
        }
        
        // XCON get 메서드 사용
        if (this.components.get && typeof this.components.get === 'function') {
            return this.components.get(name);
        }
        
        // 일반 객체에서 찾기
        return this.components[name];
    }
    
    renderSingleComponent(component, key) {
        // 데이터 바인딩 적용
        const processedComponent = this.applyDataBindingToComponent(component);
        
        XCON.log(`🔍 XaForm.renderSingleComponent() - this.key: ${this.key}`);
        XCON.log(`🔍 XaForm owner(this):`, this);
        XCON.log(`🔍 XaForm playerHost:`, this.playerHost);
        
        // XaForm이 하위 컴포넌트의 owner가 됨
        
        // ⚠️ 중요: ComponentFactory에 owner(this)를 전달
        XCON.log(`🔍 XaForm.renderSingleComponent - 호출 전 owner:`, this);
        XCON.log(`🔍 XaForm.renderSingleComponent - 호출 전 owner 타입:`, this?.constructor?.name);

        XCON.logon2('############################################ ComponentFactory.createFromXCON');
        XCON.logon2('# XaForm.renderSingleComponent ', processedComponent, key);
        XCON.logon2('############################################');

        const uiComponent = ComponentFactory.createFromXCON(processedComponent, key, this);
        if (uiComponent) {
            // 컴포넌트 생성 후 visible 속성 체크
            const visibleValue = uiComponent.getValue('visible', true);


            // visible == false 인 경우도 렌더링, display: none 처리
            //if (visibleValue === false || visibleValue === 'false') {
            //    XCON.logon2(`👁️ [렌더링] ${key} - visible: false, 렌더링 건너뜀`);
            //    return '';
            //}
            
            XCON.log(`🔍 renderSingleComponent - ${key} render() 호출 전, 컴포넌트 타입: ${uiComponent.constructor.name}`);
            
            const html = uiComponent.render();
            
            XCON.log(`🔍 renderSingleComponent - ${key} render() 완료, HTML 길이: ${html ? html.length : 'null'}`);
            XCON.log(`🔍 renderSingleComponent - ${key} HTML 미리보기:`, html ? html.substring(0, 100) + '...' : 'null');
            
            // ✅ 렌더링 후 onLoadComplete 호출 추가 (DOM 렌더링 완료 후)
            setTimeout(() => {
                if (uiComponent.onLoadComplete && typeof uiComponent.onLoadComplete === 'function') {
                    XCON.logon2(`🎯 [생명주기] ${key} - 자식 컴포넌트 onLoadComplete 호출`);
                    uiComponent.onLoadComplete();
                } else {
                    XCON.logon2(`ℹ️ [생명주기] ${key} - onLoadComplete 메서드 없음`);
                }
            }, 10); // DOM 렌더링 완료를 위한 짧은 지연
            
            return html;
        }
        
        return `<div style="padding: 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; margin: 5px;">
            <strong>Error:</strong> Could not render component "${key}"
        </div>`;
    }
    
    applyDataBindingToComponent(component) {
        // XCON 객체인 경우 그대로 반환 (데이터 바인딩은 필요시에만)
        if (isXCON(component)) {
            return component;
        }
        
        // 컴포넌트의 모든 속성에 데이터 바인딩 적용
        const processed = {};
        
        if (component.data && typeof component.data === 'object') {
            for (const [key, value] of component.data) {
                if (typeof value === 'string') {
                    processed[key] = this.processDataBinding(value);
                } else {
                    processed[key] = value;
                }
            }
        } else if (typeof component === 'object') {
            /*
            Object.entries(component).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    processed[key] = this.processDataBinding(value);
                } else {
                    processed[key] = value;
                }
            });
            */
            for (const [key, value] of component.hashtable) {
                if (typeof value === 'string') {
                    processed[key] = this.processDataBinding(value);
                } else {
                    processed[key] = value;
                }
            }
        }
        
        return processed;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// =============================================================================
// XaList 컴포넌트 & 컨트롤러
// =============================================================================
class XaList extends XaController {
    constructor(xcon, key, playerHost = null) {
        super(xcon, key, playerHost);
        this.hidenavbar = this.getValue('hidenavbar', true);
        this.hidebackbtn = this.getValue('hidebackbtn', true);
        this.title = this.getValue('title', '');
        this.orientation = this.getValue('orientation', 'vertical');
        this.rowHeight = this.getValue('rowHeight', 60);
        this.rowWidth = this.getValue('rowWidth', 200);
        this.separatorStyle = this.getValue('separatorStyle', 'line');
        this.separatorColor = this.getValue('separatorColor', '200,200,200,255');
        this.separatorHeight = this.getValue('separatorHeight', 1);
        this.separatorWidth = this.getValue('separatorWidth', 1);
        this.selectionStyle = this.getValue('selectionStyle', 'blue');
        this.selectionColor = this.getValue('selectionColor', '230,230,250,255');
        this.easySelect = this.getValue('easySelect', false);

        this.round = this.getValue('round', '0'); //8

        this.offsetX = this.getValue('offsetX', 0);
        this.offsetY = this.getValue('offsetY', 0);

        this.cellAction = this.getValue('cellAction');
        this.dummyAction = this.getValue('dummyAction');

        this.cellLayout = this.getValue('cellLayout');
        this.dummyLayout = this.getValue('dummyLayout');

        this.layoutSelector = this.getValue('layoutSelector');

        // dataTemplate은 render() 시에 체이닝 처리됨
        //this.dataTemplate = this.getValue('dataTemplate');
        
        // 이벤트 액션들
        this.onRowSelected = this.getValue('onRowSelected');
        this.onRowUnSelected = this.getValue('onRowUnSelected');
        this.onScrollStart = this.getValue('onScrollStart');
        this.onScrollEnd = this.getValue('onScrollEnd');
        this.easySelectAction = this.getValue('easySelectAction');
        this.deleteAction = this.getValue('deleteAction');
        
        // 이벤트 전파 제어 (리스트 전용)
        this.itemEventPropagation = this.getValue('itemEventPropagation', 'bubble'); // 아이템 클릭 시 전파 모드
        this.allowCellEvents = this.getValue('allowCellEvents', true); // 셀 내 컴포넌트 이벤트 허용 여부
        
        // 데이터 및 레이아웃 캐시
        this.tableData = [];
        this.layoutCollection = {};
        this.selectedItems = new Set();
    }
    
    getHiddenScrollbarClass() {
        // 고유한 클래스명 생성
        const className = `xa-list-hidden-scrollbar`; //${this.key}
        
        // CSS 스타일 정의
        const cssRules = `
            /* Webkit 브라우저 (Chrome, Safari, Edge) */
            .${className}::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                background: transparent !important;
            }
            .${className}::-webkit-scrollbar-track {
                display: none !important;
                background: transparent !important;
            }
            .${className}::-webkit-scrollbar-thumb {
                display: none !important;
                background: transparent !important;
            }
            .${className}::-webkit-scrollbar-corner {
                display: none !important;
                background: transparent !important;
            }
            /* 모든 브라우저 공통 */
            .${className} {
                -ms-overflow-style: none !important;  /* IE and Edge */
                scrollbar-width: none !important;  /* Firefox */
                -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
                scroll-behavior: smooth; /* 부드러운 스크롤 */
                /* 스크롤 기능은 유지하되 스크롤바만 숨김 */
            }
        `;
        
        // 스타일 태그가 이미 존재하는지 확인
        const existingStyle = document.getElementById(`style-${className}`);
        if (!existingStyle) {
            // 새로운 스타일 태그 생성 및 추가
            const styleElement = document.createElement('style');
            styleElement.id = `style-${className}`;
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
            
            XCON.log(`🎨 XaList ${this.key}: 스크롤바 숨김 스타일 추가`);
        }
        
        return className;
    }

    render() {
        XCON.logon2(`🎬 [생명주기] XaList ${this.key} - render() 시작`);
        this.initialize();
        
        this.dataTemplate = this.getValue('dataTemplate');

        XCON.log(`XaList ${this.key} - Starting render with dataTemplate:`, this.dataTemplate);
        XCON.log(`XaList ${this.key} - cellLayout:`, this.cellLayout);
        
        // 데이터 추출
        this.tableData = this.extractTableData(this.dataTemplate);
        this.layoutCollection = this.extractLayoutCollection();
        
        XCON.log(`XaList ${this.key} - Data:`, this.tableData.length, 'items');
        XCON.log(`XaList ${this.key} - TableData:`, this.tableData);
        XCON.log(`XaList ${this.key} - Layouts:`, Object.keys(this.layoutCollection));
        XCON.log(`XaList ${this.key} - CellLayout:`, this.cellLayout);
        
        if (this.tableData.length === 0) {
            return this.renderEmptyState();
        }
        
        const toCssLength = (value, fallback = '0px') => {
            if (value === null || value === undefined || value === '') return fallback;
            const raw = String(value).trim();
            return /^-?\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
        };
        const borderVisible = this.getValue('border', false);
        const listBorder = borderVisible
            ? `${toCssLength(this.getValue('borderWidth', 1), '1px')} ${this.getValue('borderStyle', 'solid') || 'solid'} ${this.parseColor(this.getValue('borderColor', 'var(--border)')) || 'var(--border)'}`
            : 'none';
        const listStyle = `
            border: ${listBorder};
            border-radius: ${toCssLength(this.getValue('borderRadius', this.round), '0px')};
            background: ${this.bgColor ? this.parseColor(this.bgColor) : 'transparent'};
            overflow: hidden;
        `;
        //box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        
        let html = `<div style="${this.getBaseStyle()}${listStyle}" 
                         data-component="xList" 
                         data-component-key="${this.key}"
                         data-key="${this.key}"
                         ${this.getClickHandler()}>`;
        
        // 제목 헤더
        if (!this.hidenavbar) {
            html += `
                <div class="xlist-header" style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 12px 16px;
                    font-size: 16px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>${this.escapeHtml(this.title)}</span>
                    <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                        ${this.tableData.length}개
                    </span>
                </div>
            `;
        }
        
        // 리스트 컨텐츠
        const contentHeight = !this.hidenavbar ? 'calc(100% - 50px)' : '100%';
        const isHorizontal = this.orientation === 'horizontal';
        const overflowStyle = isHorizontal ? 
            'overflow-x: auto; overflow-y: hidden;' : 
            'overflow-y: auto; overflow-x: hidden;';
        
        // 스크롤바 숨김 클래스 적용 (스크롤이 발생하는 요소에 적용)
        const scrollbarHiddenClass = this.getHiddenScrollbarClass();
                
        html += `<div class="xlist-content ${scrollbarHiddenClass}" style="
            position: relative;
            width: 100%;
            height: ${contentHeight};
            ${overflowStyle}
        ">`;
        
        // 아이템들 렌더링
        html += this.renderItems();
        
        html += `</div></div>`;
        
        this._initializeElement();

        // 렌더링 완료 후 onLoadComplete 비동기 호출 (모든 하위 컴포넌트 렌더링 대기)
        XCON.logon2(`🕐 [생명주기] XaList ${this.key} - render() 완료, 100ms 후 onLoadComplete 호출 예약`);
        setTimeout(() => {
            this.onLoadComplete();
        }, 100); // 100ms로 증가하여 하위 컴포넌트들의 렌더링 완료를 보장
        
        return html;
    }
    
    renderEmptyState() {
        /*
        return `<div style="${this.getBaseStyle()}" data-component="xList" data-component-key="${this.key}" data-key="${this.key}">
            <div style="
                border: 2px dashed #d1d5db;
                border-radius: 8px;
                padding: 40px;
                text-align: center;
                color: #6b7280;
                background: #f9fafb;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                <h3 style="margin: 0 0 8px 0; color: #374151;">데이터가 없습니다</h3>
                <p style="margin: 0;">dataTemplate을 확인해주세요.</p>
            </div>
        </div>`;
        */
        return `<div style="${this.getBaseStyle()}" data-component="xList" data-component-key="${this.key}" data-key="${this.key}">
        </div>`;
    }
    
    renderItems() {
        const isHorizontal = this.orientation === 'horizontal';
        
        // 아이템 컨테이너 스타일 (orientation에 따라 flexbox 방향 설정)
        const containerStyle = isHorizontal ? `
            display: flex;
            flex-direction: row;
            align-items: stretch;
            height: 100%;
            width: max-content;
            margin-left: ${this.offsetX}px;
            margin-top: ${this.offsetY}px;
        ` : `
            display: flex;
            flex-direction: column;
            width: 100%;
            margin-left: ${this.offsetX}px;
            margin-top: ${this.offsetY}px;
        `;
        
        let html = `<div class="xlist-items-container" style="${containerStyle}">`;
        
        this.tableData.forEach((item, index) => {
            const layoutInfo = this.getItemLayout(item);
            const itemHeight = layoutInfo.rowHeight || this.rowHeight;
            const itemWidth = layoutInfo.rowWidth || this.rowWidth;

            // orientation에 따라 크기 설정
            const itemSizeStyle = isHorizontal ? `
                min-width: ${itemWidth}px;
                width: ${itemWidth}px;
                height: 100%;
                flex-shrink: 0;
            ` : `
                min-height: ${itemHeight}px;
                width: 100%;
            `;
            
            // 선택 상태 확인
            const isSelected = this.selectedItems.has(index);
            const selectionStyle = isSelected ? `
                background: ${this.parseColor(this.selectionColor)};
                border-color: #3b82f6;
            ` : '';
            
            // separatorWidth/separatorHeight에 따른 아이템 간격 설정
            const isLastItem = index === this.tableData.length - 1;
            let separatorMargin = '';
            if (isHorizontal) {
                // 가로 방향: 마지막 아이템이 아니면 오른쪽 마진 추가
                if (!isLastItem && this.separatorWidth > 0) {
                    separatorMargin = `margin-right: ${this.separatorWidth}px;`;
                }
            } else {
                // 세로 방향: 마지막 아이템이 아니면 아래쪽 마진 추가
                if (!isLastItem && this.separatorHeight > 0) {
                    separatorMargin = `margin-bottom: ${this.separatorHeight}px;`;
                }
            }
            
            html += `
                <div class="xlist-item" 
                     data-index="${index}"
                     style="
                        position: relative;
                        ${itemSizeStyle}
                        ${separatorMargin}
                        border: none;
                        border-radius: 6px;
                        background: transparent;
                        transition: all 0.2s;
                        cursor: pointer;
                        ${selectionStyle}
                     "
                     onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
                     onmouseout="this.style.boxShadow='none'"
                     onclick="handleListItemClick('${this.key}', ${index}, this, event)">
            `;
            
            // 레이아웃 렌더링
            XCON.log(`XaList ${this.key}: Item ${index} layout info:`, layoutInfo);
            let layoutType = '';
            if (layoutInfo.layout) {
                const layout = layoutInfo.layout;
                layoutType = this.getLayoutProperty(layout, 'layoutType');
                console.log('layoutType', layoutType);
                if (layoutType === 'youChat') {
                    const bgColor = this.getLayoutProperty(layout, 'bgColor') ?? '#e5e7eb';
                    const fgColor = this.getLayoutProperty(layout, 'fgColor') ?? '#1f2937';
                    const fontSize = this.getLayoutProperty(layout, 'fontSize') ?? 14;
                    const nameTmpl = this.getLayoutProperty(layout, 'name') ?? '';
                    const textTmpl = this.getLayoutProperty(layout, 'text') ?? '{{item.text}}';
                    const imageTmpl = this.getLayoutProperty(layout, 'image');
                    const timestampTmpl = this.getLayoutProperty(layout, 'timestamp');

                    const name = (nameTmpl && this.processDataBinding(String(nameTmpl), item)) || (item && (item.get ? item.get('name') : item.name)) || '';
                    const text = (textTmpl && this.processDataBinding(String(textTmpl), item)) || (item && (item.get ? item.get('text') : item.text)) || '';
                    const image = imageTmpl ? this.processDataBinding(String(imageTmpl), item) : (item && (item.get ? item.get('image') : item.image)) || '';
                    const timestamp = timestampTmpl ? this.processDataBinding(String(timestampTmpl), item) : (item && (item.get ? item.get('timestamp') : item.timestamp)) || '';
                    
                    const nameHtml = name ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px; font-weight: 500;">${this.escapeHtml(String(name))}</div>` : '';
                    const imageSrc = image ? this.resolveImagePath(image) : '';
                    const imgHtml = imageSrc ? `<img src="${this.escapeHtml(String(imageSrc))}" alt="" style="max-width: 48px; max-height: 48px; border-radius: 50%; object-fit: cover; margin-right: 8px; flex-shrink: 0;" />` : '';
                    const tsHtml = timestamp ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${this.escapeHtml(String(timestamp))}</div>` : '';

                    html += `<div style="display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; padding: 6px 0; margin-left: 10px;">
                        <div style="display: flex; align-items: flex-start; max-width: 85%; flex-direction: column;">
                            ${nameHtml}
                            <div style="display: flex; align-items: flex-start;">
                                ${imgHtml}
                                <div style="background: ${this.parseColor(bgColor)}; color: ${this.parseColor(fgColor)}; font-size: ${fontSize}px; padding: 10px 14px; border-radius: 12px 12px 12px 0px; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.06);">
                                    <div>${this.escapeHtml(String(text))}</div>
                                    ${tsHtml}
                                </div>
                            </div>
                        </div>
                    </div>`;
                } else if (layoutType === 'meChat') {
                    const bgColor = this.getLayoutProperty(layout, 'bgColor') ?? '#3b82f6';
                    const fgColor = this.getLayoutProperty(layout, 'fgColor') ?? '#ffffff';
                    const fontSize = this.getLayoutProperty(layout, 'fontSize') ?? 14;
                    const nameTmpl = this.getLayoutProperty(layout, 'name') ?? '';
                    const textTmpl = this.getLayoutProperty(layout, 'text') ?? '{{item.text}}';
                    const imageTmpl = this.getLayoutProperty(layout, 'image');
                    const timestampTmpl = this.getLayoutProperty(layout, 'timestamp');

                    const name = (nameTmpl && this.processDataBinding(String(nameTmpl), item)) || (item && (item.get ? item.get('name') : item.name)) || '';
                    const text = (textTmpl && this.processDataBinding(String(textTmpl), item)) || (item && (item.get ? item.get('text') : item.text)) || '';
                    const image = imageTmpl ? this.processDataBinding(String(imageTmpl), item) : (item && (item.get ? item.get('image') : item.image)) || '';
                    const timestamp = timestampTmpl ? this.processDataBinding(String(timestampTmpl), item) : (item && (item.get ? item.get('timestamp') : item.timestamp)) || '';

                    const nameHtml = name ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px; font-weight: 500; text-align: right;">${this.escapeHtml(String(name))}</div>` : '';
                    const imageSrc = image ? this.resolveImagePath(image) : '';
                    const imgHtml = imageSrc ? `<img src="${this.escapeHtml(String(imageSrc))}" alt="" style="max-width: 48px; max-height: 48px; border-radius: 50%; object-fit: cover; margin-left: 8px; flex-shrink: 0;" />` : '';
                    const tsHtml = timestamp ? `<div style="font-size: 11px; color: rgba(255,255,255,0.85); margin-top: 4px;">${this.escapeHtml(String(timestamp))}</div>` : '';

                    html += `<div style="display: flex; justify-content: flex-end; align-items: flex-start; width: 100%; padding: 6px 0;">
                        <div style="display: flex; align-items: flex-end; max-width: 85%; flex-direction: column; margin-right: 10px;">
                            ${nameHtml}
                            <div style="display: flex; align-items: flex-start; flex-direction: row-reverse;">
                                ${imgHtml}
                                <div style="background: ${this.parseColor(bgColor)}; color: ${this.parseColor(fgColor)}; font-size: ${fontSize}px; padding: 10px 14px; border-radius: 12px 12px 0px 12px; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
                                    <div>${this.escapeHtml(String(text))}</div>
                                    ${tsHtml}
                                </div>
                            </div>
                        </div>
                    </div>`;
                } else {
                    const layoutHtml = this.renderLayoutComponents(layoutInfo.layout, item, layoutInfo.name);
                    XCON.log(`XaList ${this.key}: Item ${index} layout HTML length:`, layoutHtml.length);
                    html += layoutHtml;
                }
            } else {
                XCON.log(`XaList ${this.key}: Item ${index} using default layout`);
                html += this.renderDefaultItem(item);
            }
                        
            // 구분선 (orientation에 따라 세로/가로 구분선)
            if (layoutType !== 'youChat' && layoutType !== 'meChat') {
                if (isHorizontal) {
                    // 가로 방향일 때: 세로 구분선
                    if (index < this.tableData.length - 1 && this.separatorWidth > 0) {
                        html += `<div style="
                        position: absolute;
                        right: -${Math.floor(this.separatorWidth/2)}px;
                        top: 8px;
                        bottom: 8px;
                        width: ${this.separatorWidth}px;
                        background: ${this.parseColor(this.separatorColor)};
                    "></div>`;
                    }
                } else {
                    // 세로 방향일 때: 가로 구분선
                    if (index < this.tableData.length - 1 && this.separatorHeight > 0) {
                        html += `<div style="
                        position: absolute;
                        bottom: -${Math.floor(this.separatorHeight/2)}px;
                        left: 8px;
                        right: 8px;
                        height: ${this.separatorHeight}px;
                        background: ${this.parseColor(this.separatorColor)};
                    "></div>`;
                    }
                }
            }

            html += `</div>`;
        });
        
        html += `</div>`;
        return html;
    }
    
    getItemLayout(item) {
        XCON.log(`XaList ${this.key}: getItemLayout for item:`, item);
        
        // 1. _layout 필드 확인 (XCON 객체와 일반 객체 모두 지원)
        let layoutName = null;
        if (item && item.get && typeof item.get === 'function') {
            layoutName = item.get('_layout');
        } else if (item && typeof item === 'object') {
            layoutName = item._layout;
        }
        XCON.log(`XaList ${this.key}: _layout field:`, layoutName);
        
        if (layoutName) {
            // 2. 인라인 레이아웃 확인
            let inlineLayout = null;
            if (item && item.get && typeof item.get === 'function') {
                inlineLayout = item.get(layoutName);
            } else if (item && typeof item === 'object') {
                inlineLayout = item[layoutName];
            }
            
            if (inlineLayout) {
                XCON.log(`XaList ${this.key}: Found inline layout ${layoutName}:`, inlineLayout);
                XCON.log(`XaList ${this.key}: Inline layout type:`, typeof inlineLayout);
                XCON.log(`XaList ${this.key}: Inline layout keys:`, Object.keys(inlineLayout));
                return this.getLayoutInfo(layoutName, inlineLayout);
            }
            
            // 3. 레이아웃 컬렉션에서 확인
            if (this.layoutCollection[layoutName]) {
                XCON.log(`XaList ${this.key}: Found layout in collection ${layoutName}:`, this.layoutCollection[layoutName]);
                return this.getLayoutInfo(layoutName, this.layoutCollection[layoutName]);
            }
        }
        
        // 4. layoutSelector 확인
        if (this.layoutSelector) {
            const selectorValue = this.processDataBinding(this.layoutSelector, item);
            const selectedLayouts = selectorValue.split(',');
            
            // 동적 레이아웃 생성 (layoutSelector 기반)
            const dynamicLayout = this.createDynamicLayout(selectedLayouts);
            if (dynamicLayout) {
                return this.getLayoutInfo('dynamic', dynamicLayout);
            }
        }
        
        // 5. 기본 cellLayout 사용
        XCON.log(`XaList ${this.key}: Using default cellLayout:`, this.cellLayout);
        const result = this.getLayoutInfo('cellLayout', this.cellLayout);
        XCON.log(`XaList ${this.key}: Final layout result:`, result);
        return result;
    }
    
    getLayoutInfo(name, layout) {
        return {
            name: name,
            layout: layout,
            rowHeight: this.getLayoutProperty(layout, 'rowHeight'),
            rowWidth: this.getLayoutProperty(layout, 'rowWidth')
        };
    }

    createDynamicLayout(selectedLayouts) {
        if (!selectedLayouts || selectedLayouts.length === 0) return null;
        
        const dynamicLayout = { type: 'dynamic' };
        
        selectedLayouts.forEach(layoutName => {
            const trimmedName = layoutName.trim();
            if (this.layoutCollection[trimmedName]) {
                // 선택된 레이아웃의 컴포넌트들을 병합
                const layout = this.layoutCollection[trimmedName];
                if (layout && typeof layout === 'object') {
                    Object.assign(dynamicLayout, layout);
                }
            }
        });
        
        return Object.keys(dynamicLayout).length > 1 ? dynamicLayout : null;
    }
    
    getLayoutProperty(layout, property) {
        if (!layout) return null;

        const publicProps = getXamongPublicProps();
        if (publicProps && typeof publicProps.read === 'function') {
            const value = publicProps.read(layout, property, publicProps.MISSING);
            if (value !== publicProps.MISSING) return value;
        }
        
        if (layout.get && typeof layout.get === 'function') {
            return layout.get(property);
        }
        return layout[property];
    }
    
    extractLayoutCollection() {
        const layouts = {};
        
        for (const [key, value] of this.xcon.hashtable) {
            if (XCON.isXCONObject(value) && this.checkLayout(key, value)) {
                layouts[key] = value;
            }
        }
    
        return layouts;
    }
    
    isLayoutKey(key) {
        const excludeKeys = ['type', 'pos', 'orientation', 'rowHeight', 'rowWidth', 
                           'dataTemplate', 'title', 'separatorStyle', 'separatorColor',
                           'selectionStyle', 'selectionColor', 'easySelect', 'layoutSelector'];
        return !excludeKeys.includes(key) && key.endsWith('Layout');
    }
    checkLayout(key, value) {
        if (value.count > 0) {
            for (const [k, v] of value.hashtable) {
                if (XCON.isXCONObject(v) && v.contains('type') && v.contains('pos')) {
                    return true;
                }
            }
        } 
        return this.isLayoutKey(key);
    }
    
    renderLayoutComponents(layout, itemData, layoutName) {
        XCON.log(`XList ${this.key}: renderLayoutComponents called:`, {layout, itemData, layoutName});
        XCON.log(`XList ${this.key}: Layout type:`, typeof layout);
        XCON.log(`XList ${this.key}: Layout structure:`, layout);
        
        if (!layout) {
            XCON.log(`XList ${this.key}: No layout provided`);
            return '';
        }
        
        let html = '';
        let componentCount = 0;
        
        // XCON 객체의 hashtable 처리
        if (layout.hashtable && layout.hashtable instanceof Map) {
            XCON.log(`XList ${this.key}: Processing XCON layout hashtable`);
            for (const [key, value] of layout.hashtable) {
                if (key !== 'rowHeight' && key !== 'rowWidth' && value && typeof value === 'object') {
                    const componentType = this.getLayoutProperty(value, 'type');
                    XCON.log(`XList ${this.key}: Component ${key} type: ${componentType}`);
                    if (componentType) {
                        html += this.renderLayoutComponent(value, key, itemData);
                        componentCount++;
                    }
                }
            }
        }
        // XCON 객체의 data 속성 처리
        else if (layout.data && typeof layout.data === 'object') {
            XCON.log(`XList ${this.key}: Processing XCON layout data`);
            for (const [key, value] of layout.data) {
                if (key !== 'rowHeight' && key !== 'rowWidth' && value && typeof value === 'object') {
                    const componentType = this.getLayoutProperty(value, 'type');
                    XCON.log(`XList ${this.key}: Component ${key} type: ${componentType}`);
                    if (componentType) {
                        html += this.renderLayoutComponent(value, key, itemData);
                        componentCount++;
                    }
                }
            }
        } 
        // 일반 객체 처리
        else if (typeof layout === 'object') {
            XCON.log(`XList ${this.key}: Processing plain object layout`);
            Object.entries(layout).forEach(([key, value]) => {
                if (key !== 'rowHeight' && key !== 'rowWidth' && value && typeof value === 'object') {
                    const componentType = this.getLayoutProperty(value, 'type');
                    XCON.log(`XList ${this.key}: Component ${key} type: ${componentType}`);
                    if (componentType) {
                        html += this.renderLayoutComponent(value, key, itemData);
                        componentCount++;
                    }
                }
            });
        }
        
        XCON.log(`XList ${this.key}: Rendered ${componentCount} components, HTML length: ${html.length}`);
        return html;
    }
    
    renderLayoutComponent(component, key, itemData) {
        XCON.log(`XList ${this.key}: Rendering layout component ${key}:`, component, 'with data:', itemData);
        
        // 데이터 바인딩 적용
        const processedComponent = this.applyDataBindingToComponent(component, itemData);
        XCON.log(`XList ${this.key}: After data binding:`, processedComponent);
        
        // JSON을 XCON 객체로 변환
        const xcon = XCON.fromJSON(JSON.stringify(processedComponent));
        XCON.log(`XList ${this.key}: XCON object created:`, xcon, itemData);
        
        // XaList가 하위 컴포넌트의 owner가 됨
        this.itemData = itemData;

        // ⚠️ 중요: ComponentFactory에 owner(this)를 전달
        XCON.logon2('############################################ ComponentFactory.createFromXCON');
        XCON.logon2('# XaList.renderLayoutComponent ', xcon, key);
        XCON.logon2('############################################');

        const uiComponent = ComponentFactory.createFromXCON(xcon, key, this);
        if (uiComponent) {
            const rendered = uiComponent.render();
            XCON.log(`XList ${this.key}: Component rendered:`, rendered);
            return rendered;
        }
        
        XCON.error(`XList ${this.key}: Failed to create component for ${key}`);
        return `<div style="padding: 5px; color: #ef4444; font-size: 12px;">
            Error: ${key} (${this.getLayoutProperty(component, 'type')})
        </div>`;
    }
    
    applyDataBindingToComponent(component, itemData) {
        XCON.log(`XList ${this.key}: Applying data binding to component:`, component, 'with itemData:', itemData);
        
        const processValue = (value) => {
            if (typeof value === 'string') {
                const result = this.processDataBinding(value, itemData);
                XCON.log(`XList ${this.key}: Data binding: "${value}" -> "${result}"`);
                return result;
            } else if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    return value.map(item => processValue(item));
                } else {
                    const result = {};
                    /*
                    for (const [key, val] of Object.entries(value)) {
                        result[key] = processValue(val);
                    }
                    */
                    for (const [key, val] of value.hashtable) {
                        result[key] = processValue(val);
                    }
                    return result;
                }
            }
            return value;
        };
        
        // XCON 객체인 경우 hashtable을 직접 처리
        if (component && component.hashtable && component.hashtable instanceof Map) {
            const result = {};
            for (const [key, value] of component.hashtable) {
                result[key] = processValue(value);
            }
            XCON.log(`XList ${this.key}: Data binding result (from XCON):`, result);
            return result;
        }
        
        const processed = processValue(component);
        XCON.log(`XList ${this.key}: Data binding result:`, processed);
        
        return processed;
    }
    
    renderDefaultItem(item) {
        const fields = Object.entries(item)
            .filter(([key]) => !key.startsWith('_'))
            .map(([key, value]) => `<div style="margin: 2px 0;"><strong>${key}:</strong> ${value}</div>`)
            .join('');
        
        return `<div style="padding: 12px;">${fields}</div>`;
    }
    
    // 아이템 선택 처리
    selectItem(index) {
        XCON.log('selectItem1', this.key, index);
        this.selectedItems.add(index);
        XCON.log('selectItem2', this.key, index, this.tableData[index]);
        this.executeAction(this.onRowSelected);
    }
    
    unselectItem(index) {
        XCON.log('unSelectItem1', this.key, index);
        this.selectedItems.delete(index);
        XCON.log('unSelectItem2', this.key, index, this.tableData[index]);
        this.executeAction(this.onRowUnSelected);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// =============================================================================
// UI Components (UI 컴포넌트들)
// =============================================================================

// 📝 Label 컴포넌트
class XaLabel extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', '');

        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);
        this.underline = this.getValue('underline', false);
        this.strikethrough = this.getValue('strikethrough', false);
        this.textAlign = this.getValue('textAlign', 'left');
        this.textVAlign = this.getValue('textVAlign', 'middle');

        this.truncate = this.getValue('truncate', ''); //ellipsis, words, middle, middlewords
        this.truncateLength = this.getValue('truncateLength', '');
        
        // 폰트 크기 자동 조정 옵션 (기본값: false)
        this.autoAdjustFontSize = this.getValue('autoAdjustFontSize', false);

        this.icon = this.getValue('icon');
        this.iconLibrary = this.getValue('iconLibrary', 'material-icons');
    }
    
    render() {
        const textStyle = `
            font-family: ${this.font};
            font-size: ${this.fontSize}px;
            font-weight: ${this.bold ? 'bold' : this.fontWeight};
            font-style: ${this.italic ? 'italic' : 'normal'};
            text-decoration: ${this.getTextDecoration()};
            text-align: ${this.textAlign};
            display: ${this.visible ? 'flex' : 'none'} !important;
            align-items: ${this.getVerticalAlign()};
            justify-content: ${this.getHorizontalAlign()};
            line-height: 1.4;
            padding: 0;
            margin: 0;
        `;
        
        const iconHtml = this.icon ? `<span class="${this.iconLibrary}">${this.icon}</span>` : '';

        const html = `<div style="${this.getBaseStyle()}${textStyle}" 
                     data-component="label" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     ${this.getClickHandler()}>
            ${iconHtml}
            ${this.escapeHtml(this.text)}
        </div>`;
        
        // 렌더링 후 DOM 요소 설정
        /*
        setTimeout(() => {
            this.element = document.querySelector(`[data-component-key="${this.key}"]`);
            // autoAdjustFontSize 옵션이 활성화된 경우에만 텍스트가 컨테이너를 벗어나는 경우 자동으로 폰트 크기 조정
            if (this.element && this.text && !this.truncate && this.autoAdjustFontSize) {
                this.adjustFontSizeToFit();
            }
        }, 0);
        */
        this._initializeElement(() => {
            this.adjustFontSizeToFit();
        });

        return this.doPolymorph(html);
    }
    
    getTextDecoration() {
        const decorations = [];
        if (this.underline) decorations.push('underline');
        if (this.strikethrough) decorations.push('line-through');
        return decorations.length > 0 ? decorations.join(' ') : 'none';
    }
    
    getVerticalAlign() {
        switch (this.textVAlign) {
            case 'top': return 'flex-start';
            case 'bottom': return 'flex-end';
            default: return 'center';
        }
    }
    
    getHorizontalAlign() {
        switch (this.textAlign) {
            case 'center': return 'center';
            case 'right': return 'flex-end';
            default: return 'flex-start';
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 텍스트 크기 측정 메서드
    measureTextSize(text, font, fontSize) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${font}`;
        const metrics = context.measureText(text);
        return {
            width: metrics.width,
            height: fontSize * 1.2 // 대략적인 높이
        };
    }
    
    // 여러 줄로 줄바꿈될 때의 실제 높이 측정
    measureWrappedTextSize(text, font, fontSize, containerWidth) {
        if (!this.element || containerWidth <= 0) {
            return this.measureTextSize(text, font, fontSize);
        }
        
        // 임시 측정용 요소 생성
        const measureElement = document.createElement('div');
        measureElement.style.position = 'absolute';
        measureElement.style.visibility = 'hidden';
        measureElement.style.width = `${containerWidth}px`;
        measureElement.style.fontSize = `${fontSize}px`;
        measureElement.style.fontFamily = font;
        measureElement.style.fontWeight = this.bold ? 'bold' : this.fontWeight;
        measureElement.style.fontStyle = this.italic ? 'italic' : 'normal';
        measureElement.style.lineHeight = '1.4';
        measureElement.style.whiteSpace = 'normal';
        measureElement.style.wordWrap = 'break-word';
        measureElement.style.overflowWrap = 'break-word';
        measureElement.style.padding = '0';
        measureElement.style.margin = '0';
        measureElement.textContent = text;
        
        document.body.appendChild(measureElement);
        
        // 실제 렌더링된 크기 측정
        const width = measureElement.offsetWidth;
        const height = measureElement.offsetHeight;
        
        // 측정 요소 제거
        document.body.removeChild(measureElement);
        
        return { width, height };
    }
    
    // 동적 폰트 크기 조정 메서드
    adjustFontSizeToFit() {
        if (!this.element || !this.text) return;
        
        const padding = 2;
        const containerWidth = this.parsedPos.width - padding;
        const containerHeight = this.parsedPos.height - padding;
        
        if (containerWidth <= 0 || containerHeight <= 0) return;
        
        // 먼저 한 줄로 측정
        const singleLineSize = this.measureTextSize(this.text, this.font, this.fontSize);
        const fontHeight = singleLineSize.height; // 폰트 높이
        
        // 한 줄로 들어가는 경우: 기존 로직대로 처리 (그대로 유지)
        if (singleLineSize.width <= containerWidth) {
            // 한 줄로 들어가면 조정 불필요
            return;
        }
        
        const ratio = containerWidth / singleLineSize.width;
        //XCON.logon3('ratio: ', ratio, this.text);

        // 한 줄로 들어가지 않는 경우: 여러 줄 줄바꿈 가능 여부 확인
        // 컨테이너 높이가 폰트 높이의 2배 이상인 경우만 여러 줄로 처리
        const canWrap = ratio < 0.8; //containerHeight >= fontHeight * 2;

        if (canWrap) {
            // 여러 줄로 줄바꿈 가능: 가로/세로 모두 고려
            const wrappedSize = this.measureWrappedTextSize(this.text, this.font, this.fontSize, containerWidth);
            
            // 가로/세로 비율 계산
            const widthRatio = containerWidth / wrappedSize.width;
            const heightRatio = containerHeight / wrappedSize.height;
            const minRatio = Math.min(widthRatio, heightRatio);
            
            //XCON.logon3('wrappedSize: ', widthRatio, heightRatio, wrappedSize, this.text);

            // 비율 기반으로 폰트 크기 조정
            const newFontSize = Math.max(8, Math.floor(this.fontSize * minRatio)); // 약간의 여유  * 0.98
            
            // 최종 검증: 조정된 폰트 크기로 다시 측정
            const finalWrappedSize = this.measureWrappedTextSize(this.text, this.font, newFontSize, containerWidth);
            
            // 여전히 벗어나면 한 단계 더 줄임
            if (finalWrappedSize.width > containerWidth || finalWrappedSize.height > containerHeight) {
                const saferFontSize = Math.max(8, newFontSize - 1);
                this.element.style.fontSize = `${saferFontSize}px`;
            } else {
                this.element.style.fontSize = `${newFontSize}px`;
            }
        } else {
            // 여러 줄로 줄바꿈 불가능: 기존 로직대로 가로만 고려
            const newFontSize = Math.max(8, Math.floor(this.fontSize * ratio)); // 최소 8px
            this.element.style.fontSize = `${newFontSize}px`;
        }
    }
    
    // pos 속성 업데이트 시 폰트 크기 자동 조정
    updateProperty(key, value) {
        // 부모 클래스의 updateProperty 호출
        super.updateProperty(key, value);
        
        // pos가 업데이트되고 autoAdjustFontSize 옵션이 활성화된 경우 폰트 크기 재조정
        if (key === 'pos' && this.autoAdjustFontSize && this.element && this.text && !this.truncate) {
            // DOM 업데이트 후 폰트 크기 조정을 위해 약간의 지연
            setTimeout(() => {
                this.adjustFontSizeToFit();
            }, 0);
        }
    }    
}

// 🔤 TextField 컴포넌트
class XaTextField extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.placeholder = this.getValue('placeholder', '');
        this.text = this.getValue('text', this.value); // text 속성 추가 지원

        this.value = this.getValue('value', '');
        this.binding = this.getValue('binding', '');

        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);
        this.underline = this.getValue('underline', false);
        this.strikethrough = this.getValue('strikethrough', false);
        this.textAlign = this.getValue('textAlign', 'left');
        this.textVAlign = this.getValue('textVAlign', 'middle');
        
        this.mode = this.getValue('mode', 'text'); // text, password, email, number

        this.inputType = this.getValue('inputType', 'text'); // text, password, email, number
        this.secureTextEntry = this.getValue('secureTextEntry', false);

        this.readonly = this.getValue('readonly', false);
        this.maxLength = this.getValue('maxLength');
        this.clearButton = this.getValue('clearButton', false);

        this.round = this.getValue('round', '0');

        this.border = this.getValue('border', false);
        this.borderColor = this.getValue('borderColor', '229,231,235,255');
        this.borderWidth = this.getValue('borderWidth', '1');

        this.icon = this.getValue('icon');
        this.iconLibrary = this.getValue('iconLibrary', 'material-icons');

        this.onTextChanged = this.getValue('onTextChanged');
        this.onBeginEdit = this.getValue('onBeginEdit');
        this.onEndEdit = this.getValue('onEndEdit');
        this.onKeyDown = this.getValue('onKeyDown');
        this.onKeyUp = this.getValue('onKeyUp');
        this.onMaxLength = this.getValue('onMaxLength');
        this.onEnter = this.getValue('onEnter');
    }
    
    render() {
        let inputType = this.mode === 'password' ? 'password' : 
                         this.mode === 'email' ? 'email' :
                         this.mode === 'number' ? 'number' : 'text';

        if (this.inputType && this.inputType !== 'text') {
            inputType = this.inputType;
        }
        if (this.secureTextEntry) {
            inputType = 'password';
        }

        // 폰트 굵기 처리 (bold 체크박스 우선, 없으면 fontWeight 사용)
        const fontWeight = this.bold ? 'bold' : (typeof this.fontWeight === 'number' ? this.fontWeight : this.fontWeight);
        
        // 폰트 스타일 처리
        const fontStyle = this.italic ? 'italic' : 'normal';
        
        // 텍스트 장식 처리
        const textDecoration = this.getTextDecoration();
        
        // 텍스트 정렬 처리
        const textAlign = this.textAlign || 'left';
        
        // 색상 처리
        const foregroundColor = this.fgColor ? this.parseColor(this.fgColor) : 'black';
        const backgroundColor = this.bgColor ? this.parseColor(this.bgColor) : (this.readonly ? '#f9fafb' : 'transparent');
        
        const inputStyle = `
            background: ${backgroundColor};
            color: ${foregroundColor};
            font-family: ${this.font};
            font-size: ${this.fontSize}px;
            font-weight: ${fontWeight};
            font-style: ${fontStyle};
            text-decoration: ${textDecoration};
            text-align: ${textAlign};
            width: 100%;
            height: 100%;
            border: ${this.border ? `1px solid ${this.parseColor(this.borderColor)}` : 'none'};
            border-width: ${this.borderWidth}px;
            border-radius: ${this.round}px;
            padding: 8px;
            margin: 0;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box;
        `;
        
        // 실제 값 (text 또는 value 속성 중 우선순위)
        const displayValue = this.text || this.value || this.binding || '';
        
        const maxLengthAttr = this.maxLength && this.maxLength > 0 ? `maxlength="${this.maxLength}"` : '';
        const readonlyAttr = this.readonly ? 'readonly' : '';
        
        const iconHtml = this.icon ? `<span class="${this.iconLibrary}">${this.icon}</span>` : '';

        const html = `<div style="${this.getBaseStyle(false, false)}" data-component="textField" data-component-key="${this.key}" data-key="${this.key}">
            <input type="${inputType}" 
                   placeholder="${this.escapeHtml(this.placeholder)}"
                   value="${this.escapeHtml(displayValue)}"
                   style="${inputStyle}"
                   ${maxLengthAttr}
                   ${readonlyAttr}
                   ${this.enabled ? '' : 'disabled'}
                   onfocus="handleTextFieldFocus('${this.key}', this)"
                   onblur="handleTextFieldBlur('${this.key}', this)"
                   oninput="handleTextFieldInput('${this.key}', this)"
                   onkeydown="handleTextFieldKeyDown('${this.key}', this, event)"
                   onkeyup="handleTextFieldKeyUp('${this.key}', this, event)"
                   ${this.getClickHandler()}>
        </div>`;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    getTextDecoration() {
        const decorations = [];
        if (this.underline) decorations.push('underline');
        if (this.strikethrough) decorations.push('line-through');
        return decorations.length > 0 ? decorations.join(' ') : 'none';
    }
    
    getVerticalAlign() {
        switch (this.textVAlign) {
            case 'top': return 'flex-start';
            case 'bottom': return 'flex-end';
            default: return 'center';
        }
    }
    
    getHorizontalAlign() {
        switch (this.textAlign) {
            case 'center': return 'center';
            case 'right': return 'flex-end';
            default: return 'flex-start';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 📝 TextView 컴포넌트
class XaTextView extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('text', '');

        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);
        this.underline = this.getValue('underline', false);
        this.strikethrough = this.getValue('strikethrough', false);
        this.textAlign = this.getValue('textAlign', 'left');
        this.textVAlign = this.getValue('textVAlign', 'top');

        this.editable = this.getValue('editable', false);
        this.html = this.getValue('html', false);
        this.lineNum = this.getValue('lineNum');
        this.maxLength = this.getValue('maxLength');
        this.scroll = this.getValue('scroll', 'vertical');

        // 액션 핸들러
        this.onTextChanged = this.getValue('onTextChanged');
        this.onBeginEdit = this.getValue('onBeginEdit');
        this.onEndEdit = this.getValue('onEndEdit');
        this.onKeyDown = this.getValue('onKeyDown');
        this.onKeyUp = this.getValue('onKeyUp');
    }
    
    render() {
        const fontWeight = this.bold ? 'bold' : this.fontWeight;
        const fontStyle = this.italic ? 'italic' : 'normal';
        const textDecoration = this.getTextDecoration();
        const verticalAlign = this.getVerticalAlign();
        const horizontalAlign = this.getHorizontalAlign();
        
        // 스크롤 설정
        let overflowStyle = 'hidden';
        if (this.scroll === 'vertical') {
            overflowStyle = 'auto';
        } else if (this.scroll === 'horizontal') {
            overflowStyle = 'auto';
        } else if (this.scroll === 'both') {
            overflowStyle = 'auto';
        }
        
        const textAreaStyle = `
            width: 100%;
            height: 100%;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 8px;
            margin: 0;
            font-family: ${this.font};
            font-size: ${this.fontSize}px;
            font-weight: ${fontWeight};
            font-style: ${fontStyle};
            text-decoration: ${textDecoration};
            text-align: ${horizontalAlign};
            vertical-align: ${verticalAlign};
            outline: none;
            resize: none;
            overflow: ${overflowStyle};
            background: ${this.editable ? 'white' : '#f9fafb'};
            color: ${this.parseColor(this.fgColor)};
            box-sizing: border-box;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        
        const maxLengthAttr = this.maxLength && this.maxLength > 0 ? `maxlength="${this.maxLength}"` : '';
        const readonlyAttr = this.editable ? '' : 'readonly';
        const rowsAttr = this.lineNum ? `rows="${this.lineNum}"` : 'rows="4"';
        
        // HTML 형식 지원 여부에 따른 처리
        if (this.html && !this.editable) {
            // HTML 형식이고 편집 불가능한 경우 div 사용
            const divStyle = `
                width: 100%;
                height: 100%;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 8px;
                margin: 0;
                font-family: ${this.font};
                font-size: ${this.fontSize}px;
                font-weight: ${fontWeight};
                font-style: ${fontStyle};
                text-decoration: ${textDecoration};
                text-align: ${horizontalAlign};
                overflow: ${overflowStyle};
                background: #f9fafb;
                color: ${this.parseColor(this.fgColor)};
                box-sizing: border-box;
                word-wrap: break-word;
            `;
            
            const content = `<div style="${this.getBaseStyle()}" data-component="textView" data-component-key="${this.key}" data-key="${this.key}">
                <div style="${divStyle}" ${this.getClickHandler()}>
                    ${this.text}
                </div>
            </div>`;

            this._initializeElement();

            return this.doPolymorph(content);
        } else {
            // 일반 textarea 사용
            const content = `<div style="${this.getBaseStyle()}" data-component="textView" data-component-key="${this.key}" data-key="${this.key}">
                <textarea 
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
    
    getTextDecoration() {
        const decorations = [];
        if (this.underline) decorations.push('underline');
        if (this.strikethrough) decorations.push('line-through');
        return decorations.length > 0 ? decorations.join(' ') : 'none';
    }
    
    getVerticalAlign() {
        switch (this.textVAlign) {
            case 'top': return 'top';
            case 'middle': return 'middle';
            case 'bottom': return 'bottom';
            default: return 'top';
        }
    }
    
    getHorizontalAlign() {
        switch (this.textAlign) {
            case 'left': return 'left';
            case 'center': return 'center';
            case 'right': return 'right';
            default: return 'left';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 🔘 Button 컴포넌트
class XaButton extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('label', this.getValue('text', ''));
        this.title = this.getValue('title', '');
        
        this.round = this.getValue('round', '0');

        this.border = this.getValue('border', false);
        this.borderColor = this.getValue('borderColor', '229,231,235,255');
        this.borderWidth = this.getValue('borderWidth', '1');
       
        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.textAlign = this.getValue('textAlign', 'center');
        this.textVAlign = this.getValue('textVAlign', 'middle');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);

        // 폰트 크기 자동 조정 옵션 (기본값: false)
        this.autoAdjustFontSize = this.getValue('autoAdjustFontSize', false);

        this.icon = this.getValue('icon');
        this.iconLibrary = this.getValue('iconLibrary', 'material-icons');

        this.image = this.getValue('image');
        this.pressedImage = this.getValue('pressedImage');
        this.rolloverImage = this.getValue('rolloverImage');
        this.disabledImage = this.getValue('disabledImage');

        if (this.xcon.contains('textColor')) {
            this.fgColor = this.getValue('textColor');
        }

        if (this.xcon.contains('components')) {
            this.components = this.getValue('components');
        }
    }
    
    render() {
        if (this.components) {
            let backgroundStyle = '';
        
            if (this.bgColor) {
                backgroundStyle += `background-color: ${this.parseColor(this.bgColor)};`;
            } else {
                backgroundStyle += `background-color: transparent;`;
            }
            
            if (this.image) {
                const imageSrc = this.resolveImagePath(this.image);
    
                backgroundStyle += `background-image: url('${imageSrc}');`;
                backgroundStyle += `background-size: cover;`;
                backgroundStyle += `background-position: center;`;
                backgroundStyle += `background-repeat: no-repeat;`;
            }
            backgroundStyle = '';

            const buttonStyle = `
                border: ${this.border ? `${this.borderWidth}px ${this.borderStyle} ${this.parseColor(this.borderColor)}` : 'none'};
                border-radius: ${this.round}px;
                ${backgroundStyle}
                cursor: ${this.enabled && this.visible ? 'pointer' : 'not-allowed'};
                transition: transform 0.1s ease, box-shadow 0.1s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;

            const componentsHtml = this.renderComponents(this.components);

            const content = `<div style="${this.getBaseStyle()}${buttonStyle}" 
                data-component="button" 
                data-component-key="${this.key}"
                data-key="${this.key}"
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'; const overlay = this.querySelector('.button-hover-overlay'); if(overlay) overlay.style.backgroundColor='rgba(59, 130, 246, 0.1)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'; const overlay = this.querySelector('.button-hover-overlay'); if(overlay) overlay.style.backgroundColor='transparent'"
                onmousedown="this.style.transform='translateY(1px)'; const overlay = this.querySelector('.button-hover-overlay'); if(overlay) overlay.style.backgroundColor='rgba(59, 130, 246, 0.2)'"
                onmouseup="this.style.transform='translateY(-1px)'; const overlay = this.querySelector('.button-hover-overlay'); if(overlay) overlay.style.backgroundColor='rgba(59, 130, 246, 0.1)'"
                ${this.getClickHandler()}>
                    <div class="button-hover-overlay" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: transparent;
                        border-radius: ${this.round}px;
                        pointer-events: none;
                        transition: background-color 0.1s ease;
                    "></div>
                    <div class="button-content-wrapper" style="
                        width: 100%;
                        height: 100%;
                        position: relative;
                        pointer-events: none;
                    ">
                        ${componentsHtml}
                    </div>
                </div>`

            this._initializeElement();

            return this.doPolymorph(content);
        } else {
            //'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            const buttonStyle = `
                border: ${this.border ? `1px solid ${this.parseColor(this.borderColor)}` : 'none'};
                border-width: ${this.borderWidth}px;
                border-radius: ${this.round}px;
                background: ${this.bgColor ? this.parseColor(this.bgColor) : '#ffffff'}; //#3b82f6
                color: ${this.fgColor ? this.parseColor(this.fgColor) : '#ccc'};
                font-family: ${this.font};
                font-size: ${this.fontSize}px;
                font-weight: ${this.bold ? 'bold' : this.fontWeight};
                font-style: ${this.italic ? 'italic' : 'normal'};
                text-align: ${this.textAlign};
                display: ${this.visible ? 'flex' : 'none'} !important;
                align-items: ${this.getVerticalAlign()};
                justify-content: ${this.getHorizontalAlign()};
                cursor: ${this.enabled && this.visible ? 'pointer' : 'not-allowed'};
                gap: 8px;
                margin: 0;
                padding: 0;            
            `;
            
            // 이미지 경로 처리 - 상대 경로인 경우 ApplicationService에서 imagebase 적용
            const imageSrc = this.resolveImagePath(this.image);
            
            const imageHtml = this.image ? `<img src="${imageSrc}" style="max-height: 80%; max-width: 80%;" alt="">` : '';
            let iconHtml = this.icon ? `<span class="${this.iconLibrary}">${this.icon}</span>` : '';
            
            if (this.icon === 'plus' && this.iconLibrary.startsWith('material')) {
                iconHtml = this.icon ? `<span class="${this.iconLibrary}">add</span>` : '';
            } else
            if (this.icon === 'google') {
                iconHtml = `<span class="bi bi-google"></span>`;
            } else if (this.icon === 'facebook') {
                iconHtml = `<span class="bi bi-facebook"></span>`;
            } else if (this.icon === 'twitter') {
                iconHtml = `<span class="bi bi-twitter"></span>`;
            } else if (this.icon === 'instagram') {
                iconHtml = `<span class="bi bi-instagram"></span>`;
            } else if (this.icon === 'linkedin') {
                iconHtml = `<span class="bi bi-linkedin"></span>`;
            } else if (this.icon === 'youtube') {
                iconHtml = `<span class="bi bi-youtube"></span>`;
            } else if (this.icon === 'vimeo') {
                iconHtml = `<span class="bi bi-vimeo"></span>`;
            } else if (this.icon === 'github') {
                iconHtml = `<span class="bi bi-github"></span>`;
            } else if (this.icon === 'gitlab') {
                iconHtml = `<span class="bi bi-gitlab"></span>`;
            } else if (this.icon === 'tiktok') {
                iconHtml = `<span class="bi bi-tiktok"></span>`;
            } else if (this.icon === 'pinterest') {
                iconHtml = `<span class="bi bi-pinterest"></span>`;
            } else if (this.icon === 'reddit') {
                iconHtml = `<span class="bi bi-reddit"></span>`;
            } else if (this.icon === 'soundcloud') {
                iconHtml = `<span class="bi bi-soundcloud"></span>`;
            } else if (this.icon === 'spotify') {
                iconHtml = `<span class="bi bi-spotify"></span>`;
            } else if (this.icon === 'apple') {
                iconHtml = `<span class="bi bi-apple"></span>`;
            } else if (this.icon === 'linux') {
                iconHtml = `<span class="bi bi-linux"></span>`;
            } else if (this.icon === 'macos') {
                iconHtml = `<span class="bi bi-macos"></span>`;
            } else if (this.icon === 'android') {
                iconHtml = `<span class="bi bi-android"></span>`;
            } else if (this.icon === 'ios') {
                iconHtml = `<span class="bi bi-ios"></span>`;
            } else if (this.icon === 'windows') {
                iconHtml = `<span class="bi bi-windows"></span>`;
            } 

            const content = `<button style="${this.getBaseStyle()}${buttonStyle}" 
                            data-component="button" 
                            data-component-key="${this.key}"
                            data-key="${this.key}"
                            ${this.enabled ? '' : 'disabled'}
                            title="${this.title}"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
                            onmousedown="this.style.transform='translateY(1px)'"
                            onmouseup="this.style.transform='translateY(-1px)'"
                            ${this.getClickHandler()}>
                ${imageHtml}
                ${iconHtml}
                ${this.escapeHtml(this.text)}
            </button>`;

            this._initializeElement(() => {
                this.adjustFontSizeToFit();
            });
    
            return this.doPolymorph(content);
        }
    }

    renderComponents(components) {
        if (!components) return '';
                
        let html = '';
        
        const componentsOrder = components.get('componentsOrder');

        const allComponents = [];
        const orderArray = componentsOrder ? componentsOrder.split(',') : [];

        if (orderArray.length > 0) {
            orderArray.forEach(componentName => {
                const componentName_trimmed = componentName.trim();
                if (components.contains(componentName_trimmed)) {
                    const component = components.get(componentName_trimmed);
                    allComponents.push({
                        key: componentName_trimmed,
                        data: component
                    });
                }
            });
        } else {
            components.keys.forEach(key => {
                if (key === 'componentsOrder') return;
                const component = components.get(key);
                allComponents.push({
                    key: key,
                    data: component
                });
            });
        }
        
        allComponents.forEach((comp, index) => {
            const component = comp.data;
            const componentHtml = this.renderSingleComponent(component, `${this.key}~${comp.key}`);
            if (componentHtml) {
                html += componentHtml;
            }
        });    
    
        return html;
    }
    
    renderSingleComponent(component, key) {
        const uiComponent = ComponentFactory.createFromXCON(component, key, this.owner);
        if (uiComponent) {
            const html = uiComponent.render();

            return html;
        }
        
        return `<div style="padding: 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; margin: 5px;">
            <strong>Error:</strong> Could not render component "${key}"
        </div>`;
    }

    getVerticalAlign() {
        switch (this.textVAlign) {
            case 'top': return 'flex-start';
            case 'bottom': return 'flex-end';
            default: return 'center';
        }
    }
    
    getHorizontalAlign() {
        switch (this.textAlign) {
            case 'center': return 'center';
            case 'right': return 'flex-end';
            default: return 'flex-start';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 텍스트 크기 측정 메서드
    measureTextSize(text, font, fontSize) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${font}`;
        const metrics = context.measureText(text);
        return {
            width: metrics.width,
            height: fontSize * 1.2 // 대략적인 높이
        };
    }
    
    // 여러 줄로 줄바꿈될 때의 실제 높이 측정
    measureWrappedTextSize(text, font, fontSize, containerWidth) {
        if (!this.element || containerWidth <= 0) {
            return this.measureTextSize(text, font, fontSize);
        }
        
        // 임시 측정용 요소 생성
        const measureElement = document.createElement('div');
        measureElement.style.position = 'absolute';
        measureElement.style.visibility = 'hidden';
        measureElement.style.width = `${containerWidth}px`;
        measureElement.style.fontSize = `${fontSize}px`;
        measureElement.style.fontFamily = font;
        measureElement.style.fontWeight = this.bold ? 'bold' : this.fontWeight;
        measureElement.style.fontStyle = this.italic ? 'italic' : 'normal';
        measureElement.style.lineHeight = '1.4';
        measureElement.style.whiteSpace = 'normal';
        measureElement.style.wordWrap = 'break-word';
        measureElement.style.overflowWrap = 'break-word';
        measureElement.style.padding = '0';
        measureElement.style.margin = '0';
        measureElement.textContent = text;
        
        document.body.appendChild(measureElement);
        
        // 실제 렌더링된 크기 측정
        const width = measureElement.offsetWidth;
        const height = measureElement.offsetHeight;
        
        // 측정 요소 제거
        document.body.removeChild(measureElement);
        
        return { width, height };
    }
    
    // 동적 폰트 크기 조정 메서드
    adjustFontSizeToFit() {
        if (!this.element || !this.text) return;
        
        const padding = 2;
        const containerWidth = this.parsedPos.width - padding;
        const containerHeight = this.parsedPos.height - padding;
        
        if (containerWidth <= 0 || containerHeight <= 0) return;
        
        // 먼저 한 줄로 측정
        const singleLineSize = this.measureTextSize(this.text, this.font, this.fontSize);
        const fontHeight = singleLineSize.height; // 폰트 높이
        
        // 한 줄로 들어가는 경우: 기존 로직대로 처리 (그대로 유지)
        if (singleLineSize.width <= containerWidth) {
            // 한 줄로 들어가면 조정 불필요
            return;
        }
        
        const ratio = containerWidth / singleLineSize.width;
        //XCON.logon3('ratio: ', ratio, this.text);

        // 한 줄로 들어가지 않는 경우: 여러 줄 줄바꿈 가능 여부 확인
        // 컨테이너 높이가 폰트 높이의 2배 이상인 경우만 여러 줄로 처리
        const canWrap = ratio < 0.8; //containerHeight >= fontHeight * 2;

        if (canWrap) {
            // 여러 줄로 줄바꿈 가능: 가로/세로 모두 고려
            const wrappedSize = this.measureWrappedTextSize(this.text, this.font, this.fontSize, containerWidth);
            
            // 가로/세로 비율 계산
            const widthRatio = containerWidth / wrappedSize.width;
            const heightRatio = containerHeight / wrappedSize.height;
            const minRatio = Math.min(widthRatio, heightRatio);
            
            //XCON.logon3('wrappedSize: ', widthRatio, heightRatio, wrappedSize, this.text);

            // 비율 기반으로 폰트 크기 조정
            const newFontSize = Math.max(8, Math.floor(this.fontSize * minRatio)); // 약간의 여유  * 0.98
            
            // 최종 검증: 조정된 폰트 크기로 다시 측정
            const finalWrappedSize = this.measureWrappedTextSize(this.text, this.font, newFontSize, containerWidth);
            
            // 여전히 벗어나면 한 단계 더 줄임
            if (finalWrappedSize.width > containerWidth || finalWrappedSize.height > containerHeight) {
                const saferFontSize = Math.max(8, newFontSize - 1);
                this.element.style.fontSize = `${saferFontSize}px`;
            } else {
                this.element.style.fontSize = `${newFontSize}px`;
            }
        } else {
            // 여러 줄로 줄바꿈 불가능: 기존 로직대로 가로만 고려
            const newFontSize = Math.max(8, Math.floor(this.fontSize * ratio)); // 최소 8px
            this.element.style.fontSize = `${newFontSize}px`;
        }
    }
    
    // pos 속성 업데이트 시 폰트 크기 자동 조정
    updateProperty(key, value) {
        // 부모 클래스의 updateProperty 호출
        super.updateProperty(key, value);
        
        // pos가 업데이트되고 autoAdjustFontSize 옵션이 활성화된 경우 폰트 크기 재조정
        if (key === 'pos' && this.autoAdjustFontSize && this.element && this.text && !this.truncate) {
            // DOM 업데이트 후 폰트 크기 조정을 위해 약간의 지연
            setTimeout(() => {
                this.adjustFontSizeToFit();
            }, 0);
        }
    }    
}

// 📦 Panel 컴포넌트
class XaPanel extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.onCreate = this.getValue('onCreate');
        if (this.onCreate) {
            XCON.logon2('XaPanel.onCreate=======================================================================', this.onCreate);
            XCON.logon2('XaPanel.onCreate=======================================================================', this.owner);
            this.executeAction(this.onCreate);
            XCON.logon2('XaPanel.onCreate=======================================================================');
        }

        this.bgImage = this.getValue('bgImage');

        this.components = this.getValue('components');

        this.scroll = this.getValue('scroll', 'none'); // none, vertical, horizontal, auto
        this.contentSize = this.getValue('contentSize');

        this.round = this.getValue('round', '0');

        this.border = this.getValue('border', false);
        this.borderWidth = this.getValue('borderWidth', '1');
        this.borderStyle = this.getValue('borderStyle', 'solid'); // solid, dashed, dotted, double
        this.borderColor = this.getValue('borderColor', '229,231,235,255');
        this.borderLeft = this.getValue('borderLeft', '1');
        this.borderTop = this.getValue('borderTop', '1');
        this.borderRight = this.getValue('borderRight', '1');
        this.borderBottom = this.getValue('borderBottom', '1');

        const explicitBorderSides = XAMONG_BORDER_SIDE_KEYS.filter((sideKey) => xamongBorderSideIsVisible(this.xcon, sideKey));
        if (explicitBorderSides.length > 0) {
            if (!xamongHasKey(this.xcon, 'border')) {
                this.border = true;
            }
            if (!xamongHasKey(this.xcon, 'borderWidth')) {
                this.borderWidth = '-1';
            }
            if (!xamongBorderSideIsVisible(this.xcon, 'borderLeft')) this.borderLeft = 0;
            if (!xamongBorderSideIsVisible(this.xcon, 'borderTop')) this.borderTop = 0;
            if (!xamongBorderSideIsVisible(this.xcon, 'borderRight')) this.borderRight = 0;
            if (!xamongBorderSideIsVisible(this.xcon, 'borderBottom')) this.borderBottom = 0;
            const sideColor = xamongFirstBorderSideColor(this.xcon, explicitBorderSides);
            if (sideColor !== undefined && !xamongHasKey(this.xcon, 'borderColor')) {
                const border = xamongGetKey(this.xcon, 'border');
                const hasGroupedColor = border && typeof border === 'object' && xamongObjectValue(border, 'color') !== undefined;
                if (!hasGroupedColor) {
                    this.borderColor = sideColor;
                }
            }
        }

        this.shadow = this.getValue('shadow', false);
        this.shadowColor = this.getValue('shadowColor', '0,0,0,255');
        this.shadowOpacity = this.getValue('shadowOpacity', '0.1');
        this.shadowBlur = this.getValue('shadowBlur', '8');
        this.shadowRadius = this.getValue('shadowRadius', '0');

        this.scrollbarVisible = this.getValue('scrollbarVisible', false);

        this.autoChildRendering = true; // 하위 컴포넌트 자동 렌더링 제어

        if (!this.xcon.contains('border') && 
            (this.xcon.contains('borderColor') || this.xcon.contains('borderWidth'))) {
            this.border = true;
        }
        if (!this.xcon.contains('shadow') && 
            (this.xcon.contains('shadowColor') || this.xcon.contains('shadowOpacity') || this.xcon.contains('shadowBlur') || this.xcon.contains('shadowRadius'))) {
            this.shadow = true;
        }
    }
    
    // 자동 하위 렌더링 비활성화 (더 이상 사용되지 않음 - 기본적으로 활성화)
    disableAutoChildRendering() {
        this.autoChildRendering = false;
        XCON.log(`XaPanel ${this.key}: 하위 컴포넌트 자동 렌더링 비활성화`);
    }
    
    // 스크롤바 숨김 CSS 클래스 생성
    getHiddenScrollbarClass() {
        // 고유한 클래스명 생성
        const className = `xa-panel-hidden-scrollbar`; //-${this.key}
        
        // CSS 스타일 정의 - 스크롤바는 숨기되 스크롤 기능은 유지
        const cssRules = `
            /* Webkit 브라우저 (Chrome, Safari, Edge) */
            .${className}::-webkit-scrollbar,
            .${className} .xa-al-panel__body::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
                background: transparent;
            }
            .${className}::-webkit-scrollbar-track,
            .${className} .xa-al-panel__body::-webkit-scrollbar-track {
                display: none;
                background: transparent;
            }
            .${className}::-webkit-scrollbar-thumb,
            .${className} .xa-al-panel__body::-webkit-scrollbar-thumb {
                display: none;
                background: transparent;
            }
            /* 모든 브라우저 공통 */
            .${className},
            .${className} .xa-al-panel__body {
                -ms-overflow-style: none;  /* IE and Edge */
                scrollbar-width: none;  /* Firefox */
                -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
                scroll-behavior: smooth; /* 부드러운 스크롤 */
                /* 스크롤 기능은 유지하되 스크롤바만 숨김 */
            }
        `;
        
        // 스타일 태그가 이미 존재하는지 확인
        const existingStyle = document.getElementById(`style-${className}`);
        if (!existingStyle) {
            // 새로운 스타일 태그 생성 및 추가
            const styleElement = document.createElement('style');
            styleElement.id = `style-${className}`;
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
            
            XCON.log(`🎨 XaPanel ${this.key}: 스크롤바 숨김 스타일 추가 (스크롤 기능 유지)`);
        }
        
        return className;
    }
    
    render() {
        // 스크롤 설정 개선 - scrollbarVisible 속성에 따라 스크롤바 표시/숨김 제어
        let overflowX = 'hidden';
        let overflowY = 'hidden';
        let scrollbarHiddenClass = '';
        
        if (this.scroll !== 'none') {
            // 스크롤 방향별 처리 - overflow-x와 overflow-y를 명시적으로 분리
            if (this.scroll === 'vertical') {
                overflowX = 'hidden';  // 가로 스크롤 비활성화
                overflowY = 'auto';    // 세로 스크롤 활성화 (필요시만 표시)
            } else if (this.scroll === 'horizontal') {
                overflowX = 'auto';    // 가로 스크롤 활성화 (필요시만 표시)
                overflowY = 'hidden';  // 세로 스크롤 비활성화
            } else if (this.scroll === 'both' || this.scroll === 'auto') {
                overflowX = 'auto';    // 양방향 스크롤 활성화
                overflowY = 'auto';
            }
            
            // 스크롤바 숨김 처리 (기본값: 숨김)
            if (!this.scrollbarVisible) {
                scrollbarHiddenClass = this.getHiddenScrollbarClass();
                XCON.log(`📜 XaPanel ${this.key}: 스크롤바 숨김 모드 (${this.scroll}) - overflow-x: ${overflowX}, overflow-y: ${overflowY}`);
            }
        }
        
        // 배경 스타일 구성 (bgColor 먼저, bgImage 나중에)
        let backgroundStyle = '';
        
        // 1. 배경색 먼저 적용
        if (this.bgColor) {
            backgroundStyle += `background-color: ${this.parseColor(this.bgColor)};`;
        } else {
            backgroundStyle += `background-color: transparent;`;
        }
        
        // 2. 배경 이미지 적용 (배경색 위에 렌더링)
        if (this.bgImage) {
            // 이미지 경로 처리 - 상대 경로인 경우 ApplicationService에서 imagebase 적용
            const imageSrc = this.resolveImagePath(this.bgImage);

            backgroundStyle += `background-image: url('${imageSrc}');`;
            backgroundStyle += `background-size: cover;`;
            backgroundStyle += `background-position: center;`;
            backgroundStyle += `background-repeat: no-repeat;`;
        }
        
        // border 스타일 구성 - borderWidth가 -1이면 개별 border 속성 사용
        let borderStyle = '';
        if (this.border) {
            if (this.borderWidth === '-1' || this.borderWidth === -1) {
                // 개별 border 속성 사용
                borderStyle = `
                    border-left: ${this.borderLeft}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                    border-top: ${this.borderTop}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                    border-right: ${this.borderRight}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                    border-bottom: ${this.borderBottom}px ${this.borderStyle} ${this.parseColor(this.borderColor)};
                `;
            } else {
                // 통합 border 속성 사용
                borderStyle = `border: ${this.borderWidth}px ${this.borderStyle} ${this.parseColor(this.borderColor)};`;
            }
        } else {
            borderStyle = 'border: none;';
        }
        
        const panelStyle = `
            ${borderStyle}
            border-radius: ${this.round}px;
            ${backgroundStyle}
            overflow-x: ${overflowX};
            overflow-y: ${overflowY};
            box-shadow: ${this.shadow ? `0 ${this.shadowBlur}px ${this.shadowRadius}px ${this.shadowOpacity === '1' ? this.parseColor(this.shadowColor) : this.parseColor(this.shadowColor, this.shadowOpacity)}` : 'none'};
            display: ${this.visible ? 'flex' : 'none'} !important;
            flex-direction: column;
        `;
        
        const componentsHtml = this.components && this.autoChildRendering ? 
            this.renderComponents(this.components) : 
            '<div class="panel-content"></div>';
        
        // 도킹 컴포넌트에 마진이 있는 경우 래퍼로 감싸기
        const dock = this.parsedDock;
        const hasMargin = this.margin && this.margin !== '' && this.margin !== '0';
        
        const content = `<div style="${this.getBaseStyle()}${panelStyle}" 
                     class="${scrollbarHiddenClass}"
                     data-component="panel" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     ${this.getClickHandler()}>
            <div class="panel-content-wrapper" style="
                width: 100%;
                height: 100%;
                position: relative;
                ${this.scroll !== 'none' ? 'min-height: 100%;' : ''}
            ">
                ${componentsHtml}
            </div>
        </div>`;
        
        // 렌더링 후 DOM 요소 설정
        //setTimeout(() => {
        //    this.element = document.querySelector(`[data-component-key="${this.key}"]`);
        //}, 0);
        
        this._initializeElement();

        if (dock !== 'none' && hasMargin) {
            // 도킹 컴포넌트의 마진 래퍼 스타일
            const wrapperStyle = this.getDockWrapperStyle(dock, this.parsedMargin);
            return `<div style="${wrapperStyle}">${content}</div>`;
        }
        
        return this.doPolymorph(content);
    }
    
    renderComponents(components) {
        if (!components) return '';
        
        // 자동 렌더링이 비활성화된 경우 빈 컨테이너만 반환 (화면 렌더러에서 개별 처리)
        if (!this.autoChildRendering) {
            XCON.log(`XaPanel ${this.key}: 자동 렌더링 비활성화, 빈 컨테이너 반환`);
            return '<div class="panel-components-container"></div>';
        }
        
        XCON.log('🔍 XaPanel renderComponents 시작:', components);
        XCON.log('🔍 XaPanel components type:', typeof components);
        
        let html = '';
        
        // XCON 인스턴스인 경우 - hashtable을 사용
        if (isXCON(components)) {
            XCON.log('🔍 XCON 객체 처리');
            
            const componentsOrder = components.get('componentsOrder');

            // 모든 컴포넌트 수집
            const allComponents = [];
            const orderArray = componentsOrder ? componentsOrder.split(',') : [];

            // 정렬된 순서대로 수집
            if (orderArray.length > 0) {
                orderArray.forEach(componentName => {
                    const componentName_trimmed = componentName.trim();
                    if (components.contains(componentName_trimmed)) {
                        const component = components.get(componentName_trimmed);
                        if (isXCON(component)) {
                            allComponents.push({
                                key: componentName_trimmed,
                                data: component
                            });
                            XCON.log(`순서 기반 컴포넌트 추가: ${componentName_trimmed}`);
                        } else {
                            // TODO : import component 처리
                        }
                    }
                });
            } else {
                // componentsOrder가 없으면 XCON 키 순서 사용
                components.keys.forEach(key => {
                    if (key === 'componentsOrder') return;
                    const component = components.get(key);
                    if (isXCON(component)) {
                        allComponents.push({
                            key: key,
                            data: component
                        });
                        XCON.log(`XCON 키 순서 컴포넌트 추가: ${key}`);
                    } else {
                        // TODO : import component 처리
                    }
                });
            }
            
            XCON.log(`🔍 총 ${allComponents.length}개 컴포넌트 렌더링 예정`);

            allComponents.forEach((comp, index) => {
                const component = comp.data;
                if (isXCON(component)) {
                    const componentHtml = this.renderSingleComponent(component, `${this.key}~${comp.key}`);
                    if (componentHtml) {
                        html += componentHtml;
                        XCON.log(`XaPanel 컴포넌트 렌더링 완료: ${comp.key} (${index + 1}/${components.keys.length})`);
                    }
                }
            });    
        }
        
        XCON.log(`🔍 XaPanel ${this.key}: 총 HTML 길이 = ${html.length}`);
        return html;
    }
    
    renderSingleComponent(component, key) {
        // ⚠️ 중요: XaPanel의 하위 컴포넌트들은 XaPanel의 owner(최상위 XaController)를 owner로 사용
        XCON.log(`🔍 XaPanel.renderSingleComponent() - this.key: ${this.key}`);
        XCON.log(`🔍 XaPanel.owner:`, this.owner);
        XCON.log(`🔍 XaPanel.owner 타입:`, this.owner?.constructor?.name);
        XCON.log(`🔍 XaPanel.owner playerHost:`, this.owner?.playerHost);
        
        // XaPanel의 owner를 하위 컴포넌트에게 전달
        
        // ⚠️ 중요: ComponentFactory에 XaPanel의 owner를 전달
        XCON.logon2('############################################ ComponentFactory.createFromXCON');
        XCON.logon2('# XaPanel.renderSingleComponent ', component, key);
        XCON.logon2('############################################');

        const uiComponent = ComponentFactory.createFromXCON(component, key, this.owner);
        if (uiComponent) {
            const html = uiComponent.render();

            // ✅ 렌더링 후 onLoadComplete 호출 추가 (DOM 렌더링 완료 후)
            setTimeout(() => {
                if (uiComponent instanceof XaCustomComponent) {
                    if (uiComponent.onLoadComplete && typeof uiComponent.onLoadComplete === 'function') {
                        XCON.logon2(`🎯 [생명주기] ${key} - XaCustomComponent.onLoadComplete 호출`);
                        uiComponent.onLoadComplete();
                    } else {
                        XCON.logon2(`ℹ️ [생명주기] ${key} - XaCustomComponent.onLoadComplete 메서드 없음`);
                    }
                }
            }, 10); // DOM 렌더링 완료를 위한 짧은 지연
            
            return html;
        }
        
        return `<div style="padding: 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; margin: 5px;">
            <strong>Error:</strong> Could not render component "${key}"
        </div>`;
    }

    getDockWrapperStyle(dock, margin) {
        let style = '';
        if (dock === 'top') {
            style += `margin-top: ${margin.top}px; width: 100%;`;
        } else if (dock === 'left') {
            style += `margin-left: ${margin.left}px;  height: 100%;`;
        } else if (dock === 'right') {
            style += `margin-right: ${margin.right}px; height: 100%;`;
        } else if (dock === 'bottom') {
            style += `margin-bottom: ${margin.bottom}px; width: 100%;`;
        } else if (dock === 'fill') {
            style += `margin: ${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px; width: 100%; height: 100%;`;
        }
        return style;
    }
}

// ☑️ Checkbox 컴포넌트
class XaCheckbox extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('label', this.getValue('text', ''));

        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.textAlign = this.getValue('textAlign', 'center');
        this.textVAlign = this.getValue('textVAlign', 'middle');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);

        this.checked = this.getValue('checked', false);
        this.state = this.getValue('state', 'unchecked'); // unchecked, checked, indeterminate

        this.checkedImage = this.getValue('checkedImage');
        this.uncheckedImage = this.getValue('uncheckedImage');
        this.indeterminateImage = this.getValue('indeterminateImage');
        this.disabledImage = this.getValue('disabledImage');

        // 이벤트 속성들
        this.onCheckedChanged = this.getValue('onCheckedChanged');
        this.onChange = this.getValue('onChange');
        this.onChecked = this.getValue('onChecked');
        this.onUnchecked = this.getValue('onUnchecked');
        this.onIndeterminate = this.getValue('onIndeterminate');
    }
    
    render() {
        const checkboxStyle = `
            display: ${this.visible ? 'flex' : 'none'} !important;
            align-items: center;
            gap: 8px;
            cursor: ${this.enabled && this.visible ? 'pointer' : 'not-allowed'};
            font-size: ${this.fontSize}px;
        `;
        
        const content = `<label style="${this.getBaseStyle()}${checkboxStyle}" 
                       data-component="checkbox" 
                       data-component-key="${this.key}"
                       data-key="${this.key}">
            <input type="checkbox" 
                   ${this.checked ? 'checked' : ''}
                   ${this.enabled ? '' : 'disabled'}
                   style="margin: 0; transform: scale(1.2);"
                   onchange="handleCheckboxChange('${this.key}', this)"
                   ${this.getClickHandler()}>
            <span style="color: ${this.fgColor ? this.parseColor(this.fgColor) : 'inherit'};">
                ${this.escapeHtml(this.text)}
            </span>
        </label>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 🔘 RadioButton 컴포넌트
class XaRadioButton extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.text = this.getValue('label', this.getValue('text', ''));

        this.font = this.getValue('font', 'Arial');
        this.fontSize = this.getValue('fontSize', 14);
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.textAlign = this.getValue('textAlign', 'center');
        this.textVAlign = this.getValue('textVAlign', 'middle');
        this.bold = this.getValue('bold', false);
        this.italic = this.getValue('italic', false);
        
        this.checked = this.getValue('checked', false);
        this.state = this.getValue('state', 'unchecked'); // unchecked, checked
        this.groupName = this.getValue('groupName', 'radioGroup');

        this.checkedImage = this.getValue('checkedImage');
        this.uncheckedImage = this.getValue('uncheckedImage');
        this.disabledImage = this.getValue('disabledImage');

        // 이벤트 속성들
        this.onCheckedChanged = this.getValue('onCheckedChanged');
        this.onChange = this.getValue('onChange');
        this.onChecked = this.getValue('onChecked');
        this.onUnchecked = this.getValue('onUnchecked');
    }
    
    render() {
        const radioStyle = `
            display: ${this.visible ? 'flex' : 'none'} !important;
            align-items: center;
            gap: 8px;
            cursor: ${this.enabled && this.visible ? 'pointer' : 'not-allowed'};
            font-size: ${this.fontSize}px;
        `;
        
        const content = `<label style="${this.getBaseStyle()}${radioStyle}" 
                       data-component="radioButton" 
                       data-component-key="${this.key}"
                       data-key="${this.key}">
            <input type="radio" 
                   name="${this.groupName}"
                   ${this.checked ? 'checked' : ''}
                   ${this.enabled ? '' : 'disabled'}
                   style="margin: 0; transform: scale(1.2);"
                   onchange="handleRadioButtonChange('${this.key}', this)"
                   ${this.getClickHandler()}>
            <span style="color: ${this.fgColor ? this.parseColor(this.fgColor) : 'inherit'};">
                ${this.escapeHtml(this.text)}
            </span>
        </label>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 🖼️ Image 컴포넌트
class XaImage extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.image = this.getValue('image', '');
        this.src = this.getValue('src', this.image || ''); // src 우선, image 대체
        this.fit = this.getValue('fit', 'auto'); // auto, none, center, stretch, fit, fill, cover, contain, scale-down, tile, zoom
        this.imageAlign = this.getValue('imageAlign', 'center'); // topleft, topcenter, topright, middleleft, middlecenter, middleright, bottomleft, bottomcenter, bottomright
        this.alt = this.getValue('alt', '');

        // 애니메이션 속성
        this.images = this.getValue('images', null); // 이미지 배열
        this.animation = this.getValue('animation', false);
        this.duration = this.getValue('duration', '1');
        this.animationMode = this.getValue('animationMode', 'loop'); // loop, once

        // 크기 속성
        this.width = this.getValue('width', '');
        this.height = this.getValue('height', '');
        this.maxWidth = this.getValue('maxWidth', '');
        this.maxHeight = this.getValue('maxHeight', '');

        // 스타일 속성
        this.borderRadius = this.getValue('borderRadius', '0px');
        this.border = this.getValue('border', '');
        this.shadow = this.getValue('shadow', '');
        this.opacity = this.getValue('opacity', '1');

        // 로딩 및 에러 처리
        this.loading = this.getValue('loading', 'lazy'); // lazy, eager
        this.fallbackImage = this.getValue('fallbackImage', '');
        this.showPlaceholder = this.getValue('showPlaceholder', false);

        // 최종 이미지 소스 결정 (src 우선, image 대체)
        this.finalImageSrc = this.src || this.image || '';
    }
    
    render() {
        // Object-fit 매핑
        const objectFitMap = {
            'auto': 'contain',
            'none': 'none',
            'center': 'none',
            'stretch': 'fill',
            'fit': 'contain',
            'contain': 'contain',
            'fill': 'cover',
            'cover': 'cover',
            'scale-down': 'scale-down',
            'tile': 'none',
            'zoom': 'cover'
        };
        const objectFit = objectFitMap[this.fit] || 'contain';
        
        // 이미지 경로 처리 - finalImageSrc 사용 (src 우선, image 대체)
        let imageSrc = this.resolveImagePath(this.finalImageSrc);
        
        // 컨테이너 스타일 구성 - pos 값을 우선으로 하고 추가 스타일만 적용
        let containerStyle = this.getBaseStyle();
        
        // pos 값이 우선이므로 width/height는 무시하고 다른 스타일만 적용
        const additionalStyles = [];
        if (this.maxWidth) additionalStyles.push(`max-width: ${this.maxWidth}`);
        if (this.maxHeight) additionalStyles.push(`max-height: ${this.maxHeight}`);
        
        // 스타일 속성 적용
        if (this.border) additionalStyles.push(`border: ${this.border}`);
        if (this.shadow) additionalStyles.push(`box-shadow: ${this.shadow}`);
        if (this.opacity !== '1') additionalStyles.push(`opacity: ${this.opacity}`);
        
        if (additionalStyles.length > 0) {
            containerStyle += '; ' + additionalStyles.join('; ');
        }
        
        // 이미지 스타일 구성
        const imageStyles = [
            `width: 100%`,
            `height: 100%`,
            `object-fit: ${objectFit}`,
            `border-radius: ${this.borderRadius}`
        ];
        
        // imageAlign 처리 (object-position으로 변환)
        const alignMap = {
            'topleft': 'top left',
            'topcenter': 'top center', 
            'topright': 'top right',
            'middleleft': 'center left',
            'middlecenter': 'center center',
            'middleright': 'center right',
            'bottomleft': 'bottom left',
            'bottomcenter': 'bottom center',
            'bottomright': 'bottom right',
            'center': 'center center'
        };
        const objectPosition = alignMap[this.imageAlign] || 'center center';
        imageStyles.push(`object-position: ${objectPosition}`);
        
        const imageStyle = imageStyles.join('; ');
        
        // 에러 처리 및 플레이스홀더 구성
        const errorHandler = this.showPlaceholder ? 
            `onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"` : 
            `onerror="this.style.display='none'"`;
        
        const fallbackSrc = this.fallbackImage ? `; if(this.src !== '${this.fallbackImage}') { this.src = '${this.fallbackImage}'; this.style.display = 'block'; }` : '';
        
        // 플레이스홀더 스타일
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
        
        // 애니메이션 처리
        if (this.animation && this.images && Array.isArray(this.images) && this.images.length > 1) {
            // 이미지 애니메이션 로직
            const animationId = `img_anim_${this.key}~${Date.now()}`;
            const duration = parseFloat(this.duration) * 1000 || 1000;
            
            const animationScript = `
                <script>
                (function() {
                    const images = ${JSON.stringify(this.images)};
                    const container = document.querySelector('[data-key="${this.key}"] img');
                    const duration = ${duration};
                    const mode = '${this.animationMode}';
                    let currentIndex = 0;
                    
                    function nextImage() {
                        currentIndex = (currentIndex + 1) % images.length;
                        if (container) {
                            container.src = images[currentIndex];
                        }
                        
                        if (mode === 'loop' || currentIndex < images.length - 1) {
                            setTimeout(nextImage, duration);
                        }
                    }
                    
                    if (images.length > 1) {
                        setTimeout(nextImage, duration);
                    }
                })();
                </script>
            `;
            
            const html = `<div style="${containerStyle}" data-component="image" data-component-key="${this.key}" data-key="${this.key}">
                <img src="${imageSrc}" 
                     alt="${this.escapeHtml(this.alt)}"
                     style="${imageStyle}"
                     loading="${this.loading}"
                     ${errorHandler}${fallbackSrc}
                     ${this.getClickHandler()}>
                ${this.showPlaceholder ? `<div style="${placeholderStyle}">🎨</div>` : ''}
                ${animationScript}
            </div>`;
            
            this._initializeElement();

            return this.doPolymorph(html);
        }
        
        /*
        // 초기 렌더링은 원본 URL로 시작
        let blobUrl = imageSrc;
        // 인증이 필요한 경우 비동기적으로 로드 후 DOM 업데이트
        if (this.needsAuth(imageSrc)) {
            // 비동기적으로 이미지 로드 후 DOM 업데이트
            this.loadImageWithAuthAsync(imageSrc, `[data-component="image"][data-key="${this.key}"] img`);
        }
        */

        // 기본 렌더링
        const content = `<div style="${containerStyle}" data-component="image" data-component-key="${this.key}" data-key="${this.key}">
            <img src="${imageSrc}" 
                 alt="${this.escapeHtml(this.alt)}"
                 style="${imageStyle}"
                 loading="${this.loading}"
                 ${errorHandler}${fallbackSrc}
                 ${this.getClickHandler()}>
            ${this.showPlaceholder ? `<div style="${placeholderStyle}">🎨</div>` : ''}
        </div>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
}

// 🎥 VideoView 컴포넌트
class XaVideoView extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.url = this.getValue('url', '');
        this.autoplay = this.getValue('autoplay', false);
        this.controls = this.getValue('controls', true);
        this.loop = this.getValue('loop', false);
        this.muted = this.getValue('muted', false);
    }
    
    render() {
        const videoStyle = `
            width: 100%;
            height: 100%;
            border-radius: 4px;
        `;
        
        const content = `<div style="${this.getBaseStyle()}" data-component="videoView" data-component-key="${this.key}" data-key="${this.key}">
            <video style="${videoStyle}"
                   src="${this.url}"
                   ${this.controls ? 'controls' : ''}
                   ${this.autoplay ? 'autoplay' : ''}
                   ${this.loop ? 'loop' : ''}
                   ${this.muted ? 'muted' : ''}
                   ${this.getClickHandler()}>
                브라우저가 비디오를 지원하지 않습니다.
            </video>
        </div>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
}

// 🌐 WebView 컴포넌트
class XaWebView extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.url = this.getValue('url', '');
        this.htmlBody = this.getValue('htmlBody', '');
    }
    
    render() {
        const iframeStyle = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 4px;
        `;
        
        if (this.htmlBody) {
            // HTML 콘텐츠는 이스케이프하지 않고 직접 사용
            const safeHtmlBody = this.htmlBody.replace(/"/g, '&quot;');
            const content = `<div style="${this.getBaseStyle()}" data-component="webView" data-component-key="${this.key}" data-key="${this.key}">
                <iframe style="${iframeStyle}" 
                        srcdoc="${safeHtmlBody}"
                        ${this.getClickHandler()}></iframe>
            </div>`;

            this._initializeElement();

            return this.doPolymorph(content);
        } else {
            const content = `<div style="${this.getBaseStyle()}" data-component="webView" data-component-key="${this.key}" data-key="${this.key}">
                <iframe style="${iframeStyle}" 
                        src="${this.url}"
                        ${this.getClickHandler()}></iframe>
            </div>`;

            this._initializeElement();

            return this.doPolymorph(content);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 🎠 Banner 컴포넌트
class XaBanner extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.orientation = this.getValue('orientation', 'horizontal');
        this.indicator = this.getValue('indicator', true);
        this.indicatorColor = this.getValue('indicatorColor', '255,255,255,255');
        this.views = this.getValue('views', []);
        this.autoScroll = this.getValue('autoScroll', false);
        this.duration = this.getValue('duration', 3000);
        this.loop = this.getValue('loop', true);
        this.rolling = this.getValue('rolling', false); // 롤링 모드 추가
        
        this.round = this.getValue('round', '0');

        this.border = this.getValue('border', false);
        this.borderWidth = this.getValue('borderWidth', '1');
        this.borderStyle = this.getValue('borderStyle', 'solid'); // solid, dashed, dotted, double
        this.borderColor = this.getValue('borderColor', '229,231,235,255');

        this.shadow = this.getValue('shadow', false);
        this.shadowColor = this.getValue('shadowColor', '0,0,0,255');
        this.shadowOpacity = this.getValue('shadowOpacity', '0.1');
        this.shadowBlur = this.getValue('shadowBlur', '8');
        this.shadowRadius = this.getValue('shadowRadius', '0');

        if (!this.xcon.contains('border') && 
            (this.xcon.contains('borderColor') || this.xcon.contains('borderWidth'))) {
            this.border = true;
        }
        if (!this.xcon.contains('shadow') && 
            (this.xcon.contains('shadowColor') || this.xcon.contains('shadowOpacity') || this.xcon.contains('shadowBlur') || this.xcon.contains('shadowRadius'))) {
            this.shadow = true;
        }

        let _bc = String(this.getValue('bannerChrome', '') || '').trim().toLowerCase();
        if (!_bc && String(this.getValue('bannerVariant', '') || '').trim().toLowerCase() === 'hero') {
            _bc = 'landing';
        }
        this.bannerChrome = _bc || 'default';

        // 디버깅 로그 추가
        XCON.log('XaBanner constructor:', {
            key: this.key,
            views: this.views,
            viewsLength: this.views ? this.views.length : 'null',
            viewsType: typeof this.views,
            indicator: this.indicator,
            loop: this.loop,
            rolling: this.rolling,
            bannerChrome: this.bannerChrome,
            xcon: this.xcon
        });
    }
    
    render() {
        const baseStyle = this.getBaseStyle();
        const baseIsPositioned = /position:\s*(absolute|fixed|sticky)/i.test(baseStyle);
        const containerStyle = `
            overflow: hidden;
            border-radius: ${this.round}px;
            ${baseIsPositioned ? '' : 'position: relative;'}
            cursor: grab;
            border: ${this.border ? `${this.borderWidth}px ${this.borderStyle} ${this.parseColor(this.borderColor)}` : 'none'};
            box-shadow: ${this.shadow ? `${this.shadowBlur}px ${this.shadowRadius}px ${this.shadowOpacity === '1' ? this.parseColor(this.shadowColor) : this.parseColor(this.shadowColor, this.shadowOpacity)}` : 'none'};
        `;
        
        const flexDirection = this.orientation === 'vertical' ? 'column' : 'row';
        
        XCON.log(`Banner ${this.key} render:`, {
            orientation: this.orientation,
            flexDirection: flexDirection,
            autoScroll: this.autoScroll,
            duration: this.duration,
            viewsCount: this.views ? this.views.length : 0
        });
        
        const viewsHtml = this.renderViews();
        const indicatorHtml = this.indicator
            ? (this.bannerChrome === 'landing' ? this.renderLandingChrome() : this.renderIndicator())
            : '';

        const bannerContainerStyle = this.orientation === 'vertical'
            ? `display: flex; flex-direction: column; transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; width: 100%; height: auto;`
            : `display: flex; flex-direction: row; transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; width: auto; height: 100%;`;
        
        const content = `<div style="${baseStyle}${containerStyle}" 
                     data-component="banner" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     data-orientation="${this.orientation}"
                     data-auto-scroll="${this.autoScroll}"
                     data-duration="${this.duration}"
                     data-loop="${this.loop}"
                     data-rolling="${this.rolling}"
                     data-banner-chrome="${this.bannerChrome}"
                     ${this.getClickHandler()}>
            <div class="banner-container" 
                 style="${bannerContainerStyle}"
                 onmousedown="handleBannerMouseDown(event, '${this.key}')"
                 ontouchstart="handleBannerTouchStart(event, '${this.key}')">
                ${viewsHtml}
            </div>
            ${indicatorHtml}
        </div>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
    
    renderViews() {
        XCON.log('renderViews called:', {
            views: this.views,
            isArray: Array.isArray(this.views),
            length: this.views ? this.views.length : 'null',
            rolling: this.rolling
        });
        
        if (!Array.isArray(this.views)) {
            XCON.warn('views is not an array:', this.views);
            return '<div style="flex: 0 0 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666;">No views data</div>';
        }
        
        if (this.views.length === 0) {
            XCON.warn('views array is empty');
            return '<div style="flex: 0 0 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666;">Empty views</div>';
        }
        
        // 롤링 모드: 슬라이드가 2장 이상일 때만 첫 장을 끝에 복제(1장이면 무한 루프 불필요·이중 표시 방지)
        let viewsToRender = [...this.views];
        if (this.rolling && this.loop && this.views.length > 1) {
            viewsToRender.push(this.views[0]);
        }
        
        const slideFactory =
            typeof window !== 'undefined' &&
            window.ComponentFactoryAL &&
            typeof window.ComponentFactoryAL.createFromXCON === 'function'
                ? window.ComponentFactoryAL
                : ComponentFactory;

        return viewsToRender.map((view, index) => {
            XCON.log(`Rendering view ${index}:`, view);
            
            // 방향에 따라 다른 스타일 적용 - 각 view가 전체 크기를 차지하도록
            /*
            const viewStyle = this.orientation === 'vertical' 
                ? `
                    flex: 0 0 100%;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    box-sizing: border-box;
                    border: 1px solid #00ff00;
                    background: rgba(255,0,0,0.2);
                `
                : `
                    flex: 0 0 100%;
                    width: 100%;
                    height: 100%;
                    position: relative;
                    box-sizing: border-box;
                    border: 1px solid #0000ff;
                    background: rgba(0,255,0,0.2);
                `;
            */    
            const viewStyle = `
                    position: relative;
                    box-sizing: border-box;
                    flex-shrink: 0;
                    min-width: 0;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    justify-content: flex-start;
                    overflow: hidden;
                `;
            
            try {
                // 각 view를 컴포넌트로 생성 (AL 팩토리가 있으면 XaLabelAL/XaImageAL 등으로 생성 → stripAbsolute·풀폭 적용)
                const viewKey = this.key ? `${this.key}~bannerView_${index}` : `bannerView_${index}`;
                const component = slideFactory.createFromXCON(view, viewKey, this.owner);
                
                if (component) {
                    XCON.log(`✅ View ${index} component created:`, component.constructor.name);
                    const componentHtml = component.render();
                    
                    return `<div class="banner-slide" style="${viewStyle}">
                        ${componentHtml}
                    </div>`;
                } else {
                    XCON.warn(`❌ Failed to create component for view ${index}`);
                    return `<div class="banner-slide" style="${viewStyle}; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; align-items: center; justify-content: center;">
                        View ${index + 1} (Component Error)
                    </div>`;
                }
            } catch (error) {
                XCON.error(`❌ Error rendering view ${index}:`, error);
                return `<div class="banner-slide" style="${viewStyle}; background: linear-gradient(135deg, #f87171 0%, #dc2626 100%); color: white; align-items: center; justify-content: center;">
                    View ${index + 1} (Error)
                </div>`;
            }
        }).join('');
    }
    
    renderIndicator() {
        if (!Array.isArray(this.views) || this.views.length === 0) {
            return '';
        }
        
        const indicatorStyle = `
            position: absolute;
            bottom: 10px;
            left: 0;
            right: 0;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            pointer-events: none;
        `;
        
        const dots = Array.from({ length: this.views.length }, (_, i) => {
            const dotStyle = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${this.parseColor(this.indicatorColor)};
                opacity: ${i === 0 ? '1' : '0.5'};
                cursor: pointer;
                transition: opacity 0.3s;
                pointer-events: auto;
            `;
            return `<div class="banner-indicator" style="${dotStyle}"></div>`;
        }).join('');
        
        return `<div style="${indicatorStyle}">${dots}</div>`;
    }

    /** banner.html 스타일: 좌우 화살표 + 하단 바(도트·카운터·일시정지) */
    renderLandingChrome() {
        if (!Array.isArray(this.views) || this.views.length === 0) {
            return '';
        }
        const n = this.views.length;
        const keyEnc = encodeURIComponent(this.key);
        const ic = this.parseColor(this.indicatorColor);

        const dots = Array.from({ length: n }, (_, i) => {
            const dotStyle = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${ic};
                opacity: ${i === 0 ? '1' : '0.45'};
                cursor: pointer;
                transition: opacity 0.25s ease, transform 0.2s ease;
                border: none;
                padding: 0;
                flex-shrink: 0;
            `;
            return `<button type="button" class="banner-indicator xa-landing-banner__dot" data-xa-landing-dot="${i}" data-banner-key="${keyEnc}" aria-label="슬라이드 ${i + 1}" style="${dotStyle}"></button>`;
        }).join('');

        const arrow = (points) =>
            `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${points}"/></svg>`;

        return `
            <button type="button" class="xa-landing-banner__arrow xa-landing-banner__arrow--prev" data-xa-landing-nav="prev" data-banner-key="${keyEnc}" aria-label="이전 슬라이드">${arrow('15 18 9 12 15 6')}</button>
            <button type="button" class="xa-landing-banner__arrow xa-landing-banner__arrow--next" data-xa-landing-nav="next" data-banner-key="${keyEnc}" aria-label="다음 슬라이드">${arrow('9 18 15 12 9 6')}</button>
            <div class="xa-landing-banner__bottom">
                <div class="xa-landing-banner__dots">${dots}</div>
                <div class="xa-landing-banner__counter"><span class="xa-landing-banner__counter-current">1</span><span class="xa-landing-banner__counter-sep">/</span><span class="xa-landing-banner__counter-total">${n}</span></div>
                <button type="button" class="xa-landing-banner__pause" data-xa-landing-nav="pause" data-banner-key="${keyEnc}" aria-label="자동재생 일시정지">
                    <svg class="xa-landing-banner__pause-icon" viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                </button>
            </div>`;
    }
}

// 🖼️ Frame 컴포넌트
class XaFrame extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.xconFile = this.getValue('xcon', '');
        this.parameter = this.getValue('parameter');
        this.contentSize = this.getValue('contentSize');
        this.border = this.getValue('border', false);

        this.pending = this.getValue('pending', false);

        this.scroll = this.getValue('scroll', 'none'); // none, vertical, horizontal
        this.scrollbarVisible = this.getValue('scrollbarVisible', false);

        this.onShowEffect = this.getValue('onShowEffect');
        this.onHideEffect = this.getValue('onHideEffect');

        if (!this.xconFile && this.xcon.contains('xconFile')) {
            this.xconFile = this.xcon.get('xconFile');
        }

        this.xconContent = null;
        this.isLoading = false;
        this.loadError = null;
    }
    
    // 스크롤바 숨김 CSS 클래스 생성 (XaPanel과 동일한 기능)
    getHiddenScrollbarClass() {
        // 고유한 클래스명 생성
        const className = `xa-frame-hidden-scrollbar`; //-${this.key}
        
        // CSS 스타일 정의 - 스크롤바는 숨기되 스크롤 기능은 유지
        const cssRules = `
            /* Webkit 브라우저 (Chrome, Safari, Edge) */
            .${className}::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
                background: transparent;
            }
            .${className}::-webkit-scrollbar-track {
                display: none;
                background: transparent;
            }
            .${className}::-webkit-scrollbar-thumb {
                display: none;
                background: transparent;
            }
            /* 모든 브라우저 공통 */
            .${className} {
                -ms-overflow-style: none;  /* IE and Edge */
                scrollbar-width: none;  /* Firefox */
                -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
                scroll-behavior: smooth; /* 부드러운 스크롤 */
                /* 스크롤 기능은 유지하되 스크롤바만 숨김 */
            }
        `;
        
        // 스타일 태그가 이미 존재하는지 확인
        const existingStyle = document.getElementById(`style-${className}`);
        if (!existingStyle) {
            // 새로운 스타일 태그 생성 및 추가
            const styleElement = document.createElement('style');
            styleElement.id = `style-${className}`;
            styleElement.textContent = cssRules;
            document.head.appendChild(styleElement);
            
            XCON.log(`🎨 XaFrame ${this.key}: 스크롤바 숨김 스타일 추가 (스크롤 기능 유지)`);
        }
        
        return className;
    }
    
    async loadXCONFile(filePath) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.loadError = null;
        
        try {
            XCON.log(`Frame ${this.key}: Loading XCON file: ${filePath}`);
                        
            if (window.appHost) {
                try {
                    const fileUrl = window.appHost.resolveXCONUrl(filePath);
                    XCON.log(`🔗 페이지 URL: ${fileUrl}`);
                                
                    const headers = {};
                    XCON.setAuthHeader(headers);
    
                    // 페이지 XCON 로드
                    const response = await fetch(window.APP_HOST_URL + fileUrl, { headers: headers });
                    if (!response.ok) {
                        throw new Error(`XCON 파일 로드 실패: ${response.status}`);
                    }
                    
                    const xconContent = await response.text();
        
                    this.xconContent = window.XCON.deserialize(xconContent);
                } catch (error) {
                    XCON.error(`Frame ${this.key}: XCON 파싱 실패:`, error);
                    throw new Error(`XCON 파싱 실패: ${error.message}`);
                }
            } else {
                let jsonData;
                
                // 내장 데이터 먼저 확인
                if (window.frameTestData && window.frameTestData[filePath]) {
                    jsonData = window.frameTestData[filePath];
                    XCON.log(`Frame ${this.key}: Using embedded data for ${filePath}`);
                } else {
                    // 파일 로드 시도
                    try {
                        const response = await fetch(`${window.appHost.appBasePath}${filePath}`);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        jsonData = await response.json();
                    } catch (fetchError) {
                        XCON.warn(`Frame ${this.key}: Fetch failed, trying fallback data:`, fetchError);
                        
                        // 폴백 데이터 사용
                        jsonData = this.getFallbackData(filePath);
                        if (!jsonData) {
                            throw new Error(`파일 로드 실패 및 폴백 데이터 없음: ${fetchError.message}`);
                        }
                    }
                }
                
                XCON.log(`Frame ${this.key}: XCON data loaded:`, jsonData);
                
                // 파라미터 바인딩 처리
                const processedData = this.processParameterBinding(jsonData);
                XCON.log(`Frame ${this.key}: Parameter binding processed:`, processedData);
                
                // JSON을 XCON 객체로 변환
                this.xconContent = XCON.fromJSON(JSON.stringify(processedData));            
            }

        } catch (error) {
            XCON.error(`Frame ${this.key}: Failed to load XCON file:`, error);
            this.loadError = error.message;
            this.xconContent = null;
        } finally {
            this.isLoading = false;
        }
        
        // 프레임 다시 렌더링
        this.updateFrameContent();
    }
    
    processParameterBinding(data) {
        if (!this.parameter) return data;
        
        const processValue = (value) => {
            if (typeof value === 'string') {
                // {{parameter.key}} 형태의 바인딩 처리
                return value.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
                    try {
                        // 간단한 표현식 평가
                        const cleanExpr = expression.trim();
                        
                        if (cleanExpr.startsWith('parameter.')) {
                            const paramKey = cleanExpr.substring(10); // 'parameter.' 제거
                            const keys = paramKey.split('.');
                            let result = this.parameter;
                            
                            for (const key of keys) {
                                if (result && typeof result === 'object') {
                                    result = result[key];
                                } else {
                                    result = undefined;
                                    break;
                                }
                            }
                            
                            return result !== undefined ? String(result) : match;
                        }
                        
                        // 기본값 처리 (parameter.key || 'default')
                        if (cleanExpr.includes('||')) {
                            const [expr, defaultValue] = cleanExpr.split('||').map(s => s.trim());
                            if (expr.startsWith('parameter.')) {
                                const paramKey = expr.substring(10);
                                const keys = paramKey.split('.');
                                let result = this.parameter;
                                
                                for (const key of keys) {
                                    if (result && typeof result === 'object') {
                                        result = result[key];
                                    } else {
                                        result = undefined;
                                        break;
                                    }
                                }
                                
                                if (result !== undefined) {
                                    return String(result);
                                } else {
                                    // 기본값에서 따옴표 제거
                                    return defaultValue.replace(/^['"]|['"]$/g, '');
                                }
                            }
                        }
                        
                        return match;
                    } catch (e) {
                        XCON.warn(`Frame ${this.key}: Parameter binding error:`, e);
                        return match;
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    return value.map(item => processValue(item));
                } else {
                    const result = {};
                    if (value.hashtable && value.hashtable instanceof Map) {
                        for (const [key, val] of value.hashtable) {
                            result[key] = processValue(val);
                        }
                    } else {
                        for (const [key, val] of Object.entries(value)) {
                            result[key] = processValue(val);
                        }
                    }
                    return result;
                }
            }
            return value;
        };
        
        return processValue(data);
    }
    
    getFallbackData(filePath) {
        // 내장 폴백 데이터
        const fallbackData = {
            'test-frame-simple.json': {
                "type": "panel",
                "pos": "0,0,280,180",
                "bgColor": "59,130,246,255",
                "components": {
                    "titleLabel": {
                        "type": "label",
                        "pos": "20,20,240,30",
                        "text": "📄 프레임 내부 콘텐츠",
                        "fontSize": "18",
                        "fontWeight": "bold",
                        "fgColor": "255,255,255,255"
                    },
                    "descLabel": {
                        "type": "label",
                        "pos": "20,60,240,40",
                        "text": "이 콘텐츠는 내장 데이터에서 로드되었습니다.",
                        "fontSize": "14",
                        "fgColor": "255,255,255,200"
                    },
                    "actionBtn": {
                        "type": "button",
                        "pos": "20,120,100,30",
                        "text": "클릭!",
                        "bgColor": "255,255,255,255",
                        "fgColor": "59,130,246,255"
                    }
                }
            },
            'test-frame-form.json': {
                "type": "xForm",
                "pos": "0,0,280,180",
                "title": "프레임 폼",
                "bgColor": "255,255,255,255",
                "components": {
                    "nameLabel": {
                        "type": "label",
                        "pos": "20,20,80,25",
                        "text": "이름:",
                        "fontSize": "14"
                    },
                    "nameField": {
                        "type": "textField",
                        "pos": "110,20,140,25",
                        "placeholder": "이름을 입력하세요"
                    },
                    "emailLabel": {
                        "type": "label",
                        "pos": "20,55,80,25",
                        "text": "이메일:",
                        "fontSize": "14"
                    },
                    "emailField": {
                        "type": "textField",
                        "pos": "110,55,140,25",
                        "placeholder": "이메일을 입력하세요"
                    },
                    "submitBtn": {
                        "type": "button",
                        "pos": "20,125,80,30",
                        "text": "제출",
                        "bgColor": "16,185,129,255",
                        "fgColor": "255,255,255,255"
                    }
                }
            },
            'test-frame-complex.json': {
                "type": "panel",
                "pos": "0,0,280,180",
                "bgColor": "248,250,252,255",
                "components": {
                    "headerPanel": {
                        "type": "panel",
                        "pos": "0,0,280,40",
                        "bgColor": "99,102,241,255",
                        "components": {
                            "titleLabel": {
                                "type": "label",
                                "pos": "10,10,200,20",
                                "text": "🔧 복합 프레임 콘텐츠",
                                "fontSize": "14",
                                "fontWeight": "bold",
                                "fgColor": "255,255,255,255"
                            }
                        }
                    },
                    "contentPanel": {
                        "type": "panel",
                        "pos": "10,50,260,80",
                        "bgColor": "255,255,255,255",
                        "components": {
                            "infoLabel": {
                                "type": "label",
                                "pos": "10,10,240,20",
                                "text": "내장 데이터에서 로드된 복합 콘텐츠",
                                "fontSize": "12",
                                "fgColor": "75,85,99,255"
                            },
                            "saveBtn": {
                                "type": "button",
                                "pos": "10,35,100,25",
                                "text": "저장",
                                "bgColor": "16,185,129,255",
                                "fgColor": "255,255,255,255"
                            }
                        }
                    }
                }
            },
            'test-frame-with-params.json': {
                "type": "panel",
                "pos": "0,0,280,180",
                "bgColor": "255,255,255,255",
                "components": {
                    "titleLabel": {
                        "type": "label",
                        "pos": "20,20,240,30",
                        "text": "📊 파라미터 테스트",
                        "fontSize": "16",
                        "fontWeight": "bold",
                        "fgColor": "59,130,246,255",
                        "textAlign": "center"
                    },
                    "userInfoPanel": {
                        "type": "panel",
                        "pos": "20,60,240,80",
                        "bgColor": "249,250,251,255",
                        "components": {
                            "userLabel": {
                                "type": "label",
                                "pos": "10,10,220,20",
                                "text": "사용자: {{parameter.userName || 'Unknown'}}",
                                "fontSize": "14",
                                "fgColor": "75,85,99,255"
                            },
                            "modeLabel": {
                                "type": "label",
                                "pos": "10,35,220,20",
                                "text": "모드: {{parameter.mode || 'default'}}",
                                "fontSize": "14",
                                "fgColor": "75,85,99,255"
                            },
                            "versionLabel": {
                                "type": "label",
                                "pos": "10,60,220,20",
                                "text": "버전: {{parameter.appVersion || '1.0.0'}}",
                                "fontSize": "14",
                                "fgColor": "75,85,99,255"
                            }
                        }
                    }
                }
            }
        };
        
        return fallbackData[filePath] || null;
    }
    
    updateFrameContent() {
        const frameElement = document.querySelector(`[data-key="${this.key}"]`);
        if (frameElement) {
            const contentArea = frameElement.querySelector('.frame-content');
            if (contentArea) {
                contentArea.innerHTML = this.getContentHtml();
            }
        }
    }
    
    getContentHtml() {
        if (this.isLoading) {
            return `<div style="text-align: center; color: #6b7280; padding: 20px;">
                <div style="margin-bottom: 10px;">⏳ 로딩 중...</div>
                <div style="font-size: 12px;">XCON 파일을 불러오고 있습니다</div>
            </div>`;
        }
        
        if (this.loadError) {
            const isFileAccessError = this.loadError.includes('Failed to fetch') || this.loadError.includes('CORS');
            const errorMessage = isFileAccessError ? 
                'CORS 정책으로 인해 파일 로드 실패. 로컬 서버를 사용하거나 내장 데이터를 사용합니다.' : 
                this.loadError;
            
            return `<div style="text-align: center; color: #dc2626; padding: 20px;">
                <div style="margin-bottom: 10px;">❌ 로드 실패</div>
                <div style="font-size: 12px; margin-bottom: 10px;">${errorMessage}</div>
                ${isFileAccessError ? 
                    `<div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">
                        💡 해결방법:<br/>
                        1. 로컬 서버 실행: <code>python -m http.server 8000</code><br/>
                        2. 또는 내장 데이터로 테스트 계속 진행
                    </div>` : ''}
                <button onclick="reloadFrame('${this.key}')" style="margin-top: 10px; padding: 5px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">다시 시도</button>
            </div>`;
        }
        
        if (this.xconContent) {
            // 컴포넌트 생성
            XCON.logon2('############################################ ComponentFactory.createFromXCON');
            XCON.logon2('# XaFrame.loadXCONFile ', this.xconContent, `frame~${this.key}~content`);
            XCON.logon2('############################################');

            if (this.pending) {
                return `<div style="text-align: center; color: #6b7280; padding: 20px;">
                </div>`;
            }

            const component = ComponentFactory.createFromXCON(this.xconContent, `frame~${this.key}~content`, this.owner);
            this.contnet = component;

            if (component) {
                if (component.parameter) {
                    component.parameter = this.parameter;
                }
                const html = component.render();
                XCON.log(`Frame ${this.key}: Content rendered successfully`);
                return html;
            } else {
                throw new Error('Failed to create component from XCON data');
            }
        }
        
        if (this.xconFile) {
            return `<div style="text-align: center; color: #6b7280; padding: 20px;">
                <div style="margin-bottom: 10px;">📄 XCON 파일 대기</div>
                <div style="font-size: 12px;">${this.xconFile}</div>
                <button onclick="loadFrameContent('${this.key}')" style="margin-top: 10px; padding: 5px 10px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">로드</button>
            </div>`;
        }
        
        return `<div style="text-align: center; color: #6b7280; padding: 20px;">
            <div style="margin-bottom: 10px;">📄 Frame</div>
            <div style="font-size: 12px;">XCON 파일이 지정되지 않았습니다</div>
            ${this.parameter ? `<br><small>Parameters: ${JSON.stringify(this.parameter)}</small>` : ''}
        </div>`;
    }
    
    render() {
        // 스크롤 설정 개선 - scrollbarVisible 속성에 따라 스크롤바 표시/숨김 제어
        let scrollStyle = 'hidden';
        let scrollbarHiddenClass = '';
        
        if (this.scroll !== 'none') {
            // 스크롤 방향별 처리 - 더 안정적인 auto 방식 사용
            if (this.scroll === 'vertical') {
                scrollStyle = 'hidden auto'; // overflow-x: hidden, overflow-y: auto
            } else if (this.scroll === 'horizontal') {
                scrollStyle = 'auto hidden'; // overflow-x: auto, overflow-y: hidden
            } else {
                scrollStyle = 'auto'; // both directions
            }
           
            // 스크롤바 숨김 처리 (기본값: 숨김)
            if (!this.scrollbarVisible) {
                scrollbarHiddenClass = this.getHiddenScrollbarClass();
                XCON.log(`📜 XaFrame ${this.key}: 스크롤바 숨김 모드 (${this.scroll})`);
            }            
        }
        
        const frameStyle = `
            border: ${this.border ? '1px solid #e5e7eb' : 'none'};
            border-radius: 6px;
            background: #ffffff;
            overflow: ${scrollStyle};
            position: relative;
        `;
        
        // 자동 로드 시작 (XCON 파일이 지정된 경우)
        if (this.xconFile && !this.isLoading && !this.xconContent && !this.loadError) {
            setTimeout(() => this.loadXCONFile(this.xconFile), 100);
        }
        
        const content = `<div style="${this.getBaseStyle()}${frameStyle}" 
                     class="${scrollbarHiddenClass}"
                     data-component="frame" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     data-xcon-file="${this.xconFile}"
                     ${this.getClickHandler()}>
            <div class="frame-content" style="width: 100%; height: 100%; position: relative;">
                ${this.getContentHtml()}
            </div>
        </div>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }
}

// 🖼️ Import 컴포넌트
class XaImport extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        this.xconFile = this.getValue('xcon', '');
        this.parameter = this.getValue('parameter');

        if (!this.xconFile && this.xcon.contains('xconFile')) {
            this.xconFile = this.xcon.get('xconFile');
        }

        this.xconContent = null;
        this.isLoading = false;
        this.loadError = null;
    }
    
    async loadXCONFile(filePath) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.loadError = null;
        
        try {
            XCON.logon(`Import ${this.key}: Loading XCON file: ${filePath}`);
                        
            const fileUrl = window.appHost?.resolveXCONUrl(filePath);
            XCON.logon(`🔗 컴포넌트 URL: ${fileUrl}`);
                        
            const headers = {};
            XCON.setAuthHeader(headers);

            // 페이지 XCON 로드
            const response = await fetch(window.APP_HOST_URL + fileUrl, { headers: headers });
            if (!response.ok) {
                throw new Error(`XCON 파일 로드 실패: ${response.status}`);
            }
            
            const xconText = await response.text();
            this.xconContent = window.XCON.deserialize(xconText);

            if (this.parameter) {
                this.owner.parameter = this.parameter;
            }

            /*
            // 컴포넌트 생성
            XCON.logon2('############################################ ComponentFactory.createFromXCON');
            XCON.logon2('# XaImport.loadXCONFile ', xcon, `${this.key}`);
            XCON.logon2('############################################');

            const component = ComponentFactory.createFromXCON(xcon, `${this.key}`, this.owner);
            XCON.logon(`🔗 컴포넌트 생성: ${component.key}`, component);
            if (component) {
                this.loadedContent = component.render();
                XCON.logon(`Import ${this.key}: Content rendered successfully`);
            } else {
                throw new Error('Failed to create component from XCON data');
            }   
            */
        } catch (error) {
            XCON.error(`Import ${this.key}: Failed to load XCON file:`, error);
            this.loadError = error.message;
            this.xconContent = null;
        } finally {
            this.isLoading = false;
        }
        
        // 프레임 다시 렌더링
        this.updateFrameContent();
    }
        
    updateFrameContent() {
        const frameElement = document.querySelector(`[data-key="${this.key}"]`);
        if (frameElement) {
            // 상대 좌표
            const contentArea = frameElement.querySelector('.import-content');
            if (contentArea) {
                contentArea.outerHTML = this.getContentHtml();
            }
            // 절대 좌표
            //frameElement.outerHTML = this.getContentHtml();
        }
    }
    
    getContentHtml() {
        if (this.isLoading) {
            return `<div style="text-align: center; color: #6b7280; padding: 20px;">
                <div style="margin-bottom: 10px;">⏳ 로딩 중...</div>
                <div style="font-size: 12px;">XCON 파일을 불러오고 있습니다</div>
            </div>`;
        }
        
        if (this.loadError) {
            const isFileAccessError = this.loadError.includes('Failed to fetch') || this.loadError.includes('CORS');
            const errorMessage = isFileAccessError ? 
                'CORS 정책으로 인해 파일 로드 실패. 로컬 서버를 사용하거나 내장 데이터를 사용합니다.' : 
                this.loadError;
            
            return `<div style="text-align: center; color: #dc2626; padding: 20px;">
                <div style="margin-bottom: 10px;">❌ 로드 실패</div>
                <div style="font-size: 12px; margin-bottom: 10px;">${errorMessage}</div>
                ${isFileAccessError ? 
                    `<div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">
                        💡 해결방법:<br/>
                        1. 로컬 서버 실행: <code>python -m http.server 8000</code><br/>
                        2. 또는 내장 데이터로 테스트 계속 진행
                    </div>` : ''}
                <button onclick="reloadFrame('${this.key}')" style="margin-top: 10px; padding: 5px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">다시 시도</button>
            </div>`;
        }
        
        if (this.xconContent) {
            const key = this.xconFile.substring(0, this.xconFile.lastIndexOf('.xcon'));
            const components = new XCON();
            components.set(key, this.xconContent);

            this.content = components;

            return this.renderComponents(components);
        }
        
        if (this.xconFile) {
            return `<div style="text-align: center; color: #6b7280; padding: 20px;">
                <div style="margin-bottom: 10px;">📄 XCON 파일 대기</div>
                <div style="font-size: 12px;">${this.xconFile}</div>
                <button onclick="loadImportContent('${this.key}')" style="margin-top: 10px; padding: 5px 10px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">로드</button>
            </div>`;
        }
        
        return `<div style="text-align: center; color: #6b7280; padding: 20px;">
            <div style="margin-bottom: 10px;">📄 Frame</div>
            <div style="font-size: 12px;">XCON 파일이 지정되지 않았습니다</div>
            ${this.parameter ? `<br><small>Parameters: ${JSON.stringify(this.parameter)}</small>` : ''}
        </div>`;
    }
    
    render() {
        const frameStyle = `
            border: ${this.border ? '1px solid #e5e7eb' : 'none'};
            border-radius: 6px;
            background: #ffffff;
            overflow: auto;
            position: relative;
        `;
        
        // 자동 로드 시작 (XCON 파일이 지정된 경우)
        if (this.xconFile && !this.isLoading && !this.xconContent && !this.loadError) {
            setTimeout(() => this.loadXCONFile(this.xconFile), 100);
        }
        
        const content = `<div style="${this.getBaseStyle()}${frameStyle}" 
                     data-component="import" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     data-xcon-file="${this.xconFile}"
                     ${this.getClickHandler()}>
            <div class="import-content" style="width: 100%; height: 100%; position: relative;">
                ${this.getContentHtml()}
            </div>
        </div>`;

        this._initializeElement();

        return this.doPolymorph(content);
    }

    
    renderComponents(components) {
        if (!components) return '';
        
        // 자동 렌더링이 비활성화된 경우 빈 컨테이너만 반환 (화면 렌더러에서 개별 처리)
        if (!this.autoChildRendering) {
            XCON.log(`XaImport ${this.key}: 자동 렌더링 비활성화, 빈 컨테이너 반환`);
            return '<div class="import-components-container"></div>';
        }
        
        XCON.log('🔍 XaImport renderComponents 시작:', components);
        XCON.log('🔍 XaImport components type:', typeof components);
        
        let html = '';
        
        // XCON 인스턴스인 경우 - hashtable을 사용
        if (isXCON(components)) {
            XCON.log('🔍 XCON 객체 처리');
            
            const componentsOrder = components.get('componentsOrder');

            // 모든 컴포넌트 수집
            const allComponents = [];
            const orderArray = componentsOrder ? componentsOrder.split(',') : [];

            // 정렬된 순서대로 수집
            if (orderArray.length > 0) {
                orderArray.forEach(componentName => {
                    const componentName_trimmed = componentName.trim();
                    if (components.contains(componentName_trimmed)) {
                        const component = components.get(componentName_trimmed);
                        if (isXCON(component)) {
                            allComponents.push({
                                key: componentName_trimmed,
                                data: component
                            });
                            XCON.log(`순서 기반 컴포넌트 추가: ${componentName_trimmed}`);
                        } else {
                            // TODO : import component 처리
                        }
                    }
                });
            } else {
                // componentsOrder가 없으면 XCON 키 순서 사용
                components.keys.forEach(key => {
                    if (key === 'componentsOrder') return;
                    const component = components.get(key);
                    if (isXCON(component)) {
                        allComponents.push({
                            key: key,
                            data: component
                        });
                        XCON.log(`XCON 키 순서 컴포넌트 추가: ${key}`);
                    } else {
                        // TODO : import component 처리
                    }
                });
            }
            
            XCON.log(`🔍 총 ${allComponents.length}개 컴포넌트 렌더링 예정`);

            allComponents.forEach((comp, index) => {
                const component = comp.data;
                if (isXCON(component)) {
                    const componentHtml = this.renderSingleComponent(component, `${this.key}~${comp.key}`);
                    if (componentHtml) {
                        html += componentHtml;
                        XCON.log(`XaImport 컴포넌트 렌더링 완료: ${comp.key} (${index + 1}/${components.keys.length})`);
                    }
                }
            });    
        }
        
        XCON.log(`🔍 XaImport ${this.key}: 총 HTML 길이 = ${html.length}`);
        return html;
    }

    renderSingleComponent(component, key) {
        // ⚠️ 중요: XaPanel의 하위 컴포넌트들은 XaPanel의 owner(최상위 XaController)를 owner로 사용
        XCON.log(`🔍 XaImport.renderSingleComponent() - this.key: ${this.key}`);
        XCON.log(`🔍 XaImport.owner:`, this.owner);
        XCON.log(`🔍 XaImport.owner 타입:`, this.owner?.constructor?.name);
        XCON.log(`🔍 XaImport.owner playerHost:`, this.owner?.playerHost);
        
        // XaPanel의 owner를 하위 컴포넌트에게 전달
        
        // ⚠️ 중요: ComponentFactory에 XaPanel의 owner를 전달
        XCON.logon2('############################################ ComponentFactory.createFromXCON');
        XCON.logon2('# XaImport.renderSingleComponent ', component, key);
        XCON.logon2('############################################');

        const uiComponent = ComponentFactory.createFromXCON(component, key, this.owner);
        if (uiComponent) {
            const html = uiComponent.render();

            // ✅ 렌더링 후 onLoadComplete 호출 추가 (DOM 렌더링 완료 후)
            setTimeout(() => {
                if (uiComponent instanceof XaCustomComponent) {
                    if (uiComponent.onLoadComplete && typeof uiComponent.onLoadComplete === 'function') {
                        XCON.logon2(`🎯 [생명주기] ${key} - XaCustomComponent.onLoadComplete 호출`);
                        uiComponent.onLoadComplete();
                    } else {
                        XCON.logon2(`ℹ️ [생명주기] ${key} - XaCustomComponent.onLoadComplete 메서드 없음`);
                    }
                }
            }, 10); // DOM 렌더링 완료를 위한 짧은 지연
            
            return html;
        }
        
        return `<div style="padding: 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 4px; margin: 5px;">
            <strong>Error:</strong> Could not render component "${key}"
        </div>`;
    }
}

// 🖼️ Shape 컴포넌트
class XaShape extends XaComponent {
    constructor(xcon, key, owner) {
        super(xcon, key, owner);
        
        // =============================================================================
        // 📝 텍스트 속성
        // =============================================================================
        this.text = this.getValue('text', '');
        this.html = this.getValue('html', ''); // HTML 콘텐츠 지원
        this.font = this.getValue('font', 'Arial, sans-serif');
        this.fontSize = this.getValue('fontSize', '14px');
        this.fontWeight = this.getValue('fontWeight', 'normal');
        this.fontStyle = this.getValue('fontStyle', 'normal');
        this.textDecoration = this.getValue('textDecoration', 'none');
        this.lineHeight = this.getValue('lineHeight', 'normal');
        this.letterSpacing = this.getValue('letterSpacing', 'normal');
        this.wordSpacing = this.getValue('wordSpacing', 'normal');
        
        // 텍스트 정렬
        this.textAlign = this.getValue('textAlign', 'left'); // left, center, right, justify
        this.verticalAlign = this.getValue('verticalAlign', 'middle'); // top, middle, bottom
        
        // 텍스트 효과
        this.textShadow = this.getValue('textShadow', '');
        this.textStroke = this.getValue('textStroke', ''); // CSS text-stroke
        this.textOutline = this.getValue('textOutline', ''); // 외곽선
        
        // 텍스트 자르기
        this.textOverflow = this.getValue('textOverflow', 'visible'); // visible, hidden, ellipsis, clip
        this.whiteSpace = this.getValue('whiteSpace', 'normal'); // normal, nowrap, pre, pre-wrap
        this.wordWrap = this.getValue('wordWrap', 'normal'); // normal, break-word
        this.maxLines = this.getValue('maxLines', ''); // 최대 줄 수
        
        // =============================================================================
        // 🖼️ 이미지 속성
        // =============================================================================
        this.image = this.getValue('image', '');
        this.src = this.getValue('src', this.image || '');
        this.backgroundImage = this.getValue('backgroundImage', '');
        this.imageMode = this.getValue('imageMode', 'background'); // background, content, overlay
        this.imageFit = this.getValue('imageFit', 'cover'); // cover, contain, fill, none, scale-down
        this.imagePosition = this.getValue('imagePosition', 'center'); // CSS background-position
        this.imageRepeat = this.getValue('imageRepeat', 'no-repeat'); // repeat, no-repeat, repeat-x, repeat-y
        this.imageSize = this.getValue('imageSize', 'cover'); // auto, cover, contain, 또는 구체적 크기
        this.imageOpacity = this.getValue('imageOpacity', '1');
        this.imageBlendMode = this.getValue('imageBlendMode', 'normal'); // CSS mix-blend-mode
        
        // 이미지 필터
        this.imageFilter = this.getValue('imageFilter', ''); // CSS filter
        this.imageBlur = this.getValue('imageBlur', '0');
        this.imageBrightness = this.getValue('imageBrightness', '1');
        this.imageContrast = this.getValue('imageContrast', '1');
        this.imageSaturate = this.getValue('imageSaturate', '1');
        this.imageHueRotate = this.getValue('imageHueRotate', '0deg');
        
        // 이미지 애니메이션
        this.images = this.getValue('images', null); // 이미지 배열
        this.imageAnimation = this.getValue('imageAnimation', false);
        this.animationDuration = this.getValue('animationDuration', '3s');
        this.animationMode = this.getValue('animationMode', 'infinite'); // infinite, once, count
        this.animationDirection = this.getValue('animationDirection', 'normal'); // normal, reverse, alternate
        
        // =============================================================================
        // 🎨 배경 속성
        // =============================================================================
        this.backgroundColor = this.getValue('backgroundColor', this.bgColor || '');
        this.backgroundGradient = this.getValue('backgroundGradient', ''); // CSS gradient
        this.gradientType = this.getValue('gradientType', 'linear'); // linear, radial, conic
        this.gradientDirection = this.getValue('gradientDirection', 'to right'); // 그라데이션 방향
        this.gradientColors = this.getValue('gradientColors', []); // 색상 배열
        this.gradientStops = this.getValue('gradientStops', []); // 색상 정지점
        
        // 패턴 배경
        this.backgroundPattern = this.getValue('backgroundPattern', ''); // dots, stripes, grid 등
        this.patternSize = this.getValue('patternSize', '10px');
        this.patternColor = this.getValue('patternColor', '#000000');
        this.patternOpacity = this.getValue('patternOpacity', '0.1');
        
        this.round = this.getValue('round', '0');

        // =============================================================================
        // 🔲 테두리 속성
        // =============================================================================
        this.border = this.getValue('border', false);
        this.borderWidth = this.getValue('borderWidth', '1');
        this.borderStyle = this.getValue('borderStyle', 'solid'); // solid, dashed, dotted, double
        this.borderColor = this.getValue('borderColor', '229,231,235,255');
        this.borderRadius = this.getValue('borderRadius', '0');
        
        // 개별 테두리
        this.borderTop = this.getValue('borderTop', '');
        this.borderRight = this.getValue('borderRight', '');
        this.borderBottom = this.getValue('borderBottom', '');
        this.borderLeft = this.getValue('borderLeft', '');
        
        // 개별 모서리 반지름
        this.borderTopLeftRadius = this.getValue('borderTopLeftRadius', '');
        this.borderTopRightRadius = this.getValue('borderTopRightRadius', '');
        this.borderBottomLeftRadius = this.getValue('borderBottomLeftRadius', '');
        this.borderBottomRightRadius = this.getValue('borderBottomRightRadius', '');
        
        // 테두리 이미지
        this.borderImage = this.getValue('borderImage', '');
        this.borderImageSource = this.getValue('borderImageSource', '');
        this.borderImageSlice = this.getValue('borderImageSlice', '');
        this.borderImageRepeat = this.getValue('borderImageRepeat', 'stretch');
        
        // =============================================================================
        // ✨ 효과 속성
        // =============================================================================
        this.boxShadow = this.getValue('boxShadow', this.shadow || '');
        this.dropShadow = this.getValue('dropShadow', ''); // CSS drop-shadow filter
        this.innerShadow = this.getValue('innerShadow', ''); // inset shadow
        this.glow = this.getValue('glow', ''); // 발광 효과
        this.glowColor = this.getValue('glowColor', '#ffffff');
        this.glowIntensity = this.getValue('glowIntensity', '10px');
        
        // 투명도 및 블렌딩
        this.opacity = this.getValue('opacity', '1');
        this.blendMode = this.getValue('blendMode', 'normal'); // CSS mix-blend-mode
        
        // 필터 효과
        this.filter = this.getValue('filter', '');
        this.blur = this.getValue('blur', '0');
        this.brightness = this.getValue('brightness', '1');
        this.contrast = this.getValue('contrast', '1');
        this.saturate = this.getValue('saturate', '1');
        this.hueRotate = this.getValue('hueRotate', '0deg');
        this.invert = this.getValue('invert', '0');
        this.sepia = this.getValue('sepia', '0');
        this.grayscale = this.getValue('grayscale', '0');
        
        // =============================================================================
        // 🔄 변형 속성
        // =============================================================================
        this.transform = this.getValue('transform', '');
        this.rotate = this.getValue('rotate', '0deg');
        this.scale = this.getValue('scale', '1');
        this.scaleX = this.getValue('scaleX', '1');
        this.scaleY = this.getValue('scaleY', '1');
        this.skew = this.getValue('skew', '0deg');
        this.skewX = this.getValue('skewX', '0deg');
        this.skewY = this.getValue('skewY', '0deg');
        this.translateX = this.getValue('translateX', '0');
        this.translateY = this.getValue('translateY', '0');
        this.transformOrigin = this.getValue('transformOrigin', 'center');
        
        // =============================================================================
        // 🎭 애니메이션 속성
        // =============================================================================
        this.animation = this.getValue('animation', '');
        this.animationName = this.getValue('animationName', '');
        this.animationTimingFunction = this.getValue('animationTimingFunction', 'ease');
        this.animationDelay = this.getValue('animationDelay', '0s');
        this.animationIterationCount = this.getValue('animationIterationCount', '1');
        this.animationFillMode = this.getValue('animationFillMode', 'none');
        
        // 트랜지션
        this.transition = this.getValue('transition', '');
        this.transitionProperty = this.getValue('transitionProperty', 'all');
        this.transitionDuration = this.getValue('transitionDuration', '0.3s');
        this.transitionTimingFunction = this.getValue('transitionTimingFunction', 'ease');
        this.transitionDelay = this.getValue('transitionDelay', '0s');
        
        // =============================================================================
        // 📐 모양 속성
        // =============================================================================
        this.shape = this.getValue('shape', 'rectangle'); // rectangle, circle, ellipse, triangle, polygon, star, custom
        this.shapePoints = this.getValue('shapePoints', ''); // 다각형 점들
        this.clipPath = this.getValue('clipPath', ''); // CSS clip-path
        
        // 원형 속성
        this.circleRadius = this.getValue('circleRadius', '50%');
        
        // 다각형 속성
        this.polygonSides = this.getValue('polygonSides', '6');
        this.starPoints = this.getValue('starPoints', '5');
        this.starInnerRadius = this.getValue('starInnerRadius', '0.5');
        
        // =============================================================================
        // 🔧 기타 속성
        // =============================================================================
        this.cursor = this.getValue('cursor', 'default');
        this.userSelect = this.getValue('userSelect', 'auto');
        this.pointerEvents = this.getValue('pointerEvents', 'auto');
        this.overflow = this.getValue('overflow', 'visible');
        this.zIndex = this.getValue('zIndex', 'auto');
        
        // 접근성
        this.alt = this.getValue('alt', '');
        this.title = this.getValue('title', '');
        this.ariaLabel = this.getValue('ariaLabel', '');
        this.role = this.getValue('role', '');
        
        // 반응형
        this.responsive = this.getValue('responsive', false);
        this.minWidth = this.getValue('minWidth', '');
        this.maxWidth = this.getValue('maxWidth', '');
        this.minHeight = this.getValue('minHeight', '');
        this.maxHeight = this.getValue('maxHeight', '');
        
        // 디버그
        this.debug = this.getValue('debug', false);
        this.showBounds = this.getValue('showBounds', false);
    }
    
    // =============================================================================
    // 🎨 스타일 생성 메서드들
    // =============================================================================
    
    /**
     * 배경 스타일 생성
     */
    generateBackgroundStyle() {
        const styles = [];
        
        // 단색 배경
        if (this.backgroundColor) {
            styles.push(`background-color: ${this.backgroundColor}`);
        }
        
        // 그라데이션 배경
        if (this.backgroundGradient) {
            styles.push(`background: ${this.backgroundGradient}`);
        } else if (this.gradientColors && this.gradientColors.length > 1) {
            const gradient = this.generateGradient();
            if (gradient) {
                styles.push(`background: ${gradient}`);
            }
        }
        
        // 배경 이미지
        if (this.backgroundImage || (this.imageMode === 'background' && (this.src || this.image))) {
            const bgImage = this.backgroundImage || this.src || this.image;
            let resolvedImage = this.resolveImagePath(bgImage);

            styles.push(`background-image: url('${resolvedImage}')`);
            styles.push(`background-size: ${this.imageSize}`);
            styles.push(`background-position: ${this.imagePosition}`);
            styles.push(`background-repeat: ${this.imageRepeat}`);
            
            if (this.imageOpacity !== '1') {
                styles.push(`background-color: rgba(255,255,255,${1 - parseFloat(this.imageOpacity)})`);
                styles.push(`background-blend-mode: multiply`);
            }
        }
        
        // 패턴 배경
        if (this.backgroundPattern) {
            let pattern = this.generatePattern();
            if (pattern) {
                styles.push(`background-image: ${pattern}`);
            }
        }
        
        return styles;
    }
    
    /**
     * 그라데이션 생성
     */
    generateGradient() {
        if (!this.gradientColors || this.gradientColors.length < 2) return null;
        
        let gradient = '';
        const colors = this.gradientColors.map((color, index) => {
            const stop = this.gradientStops && this.gradientStops[index] ? ` ${this.gradientStops[index]}` : '';
            return `${color}${stop}`;
        }).join(', ');
        
        switch (this.gradientType) {
            case 'linear':
                gradient = `linear-gradient(${this.gradientDirection}, ${colors})`;
                break;
            case 'radial':
                gradient = `radial-gradient(${this.gradientDirection || 'circle'}, ${colors})`;
                break;
            case 'conic':
                gradient = `conic-gradient(${this.gradientDirection || 'from 0deg'}, ${colors})`;
                break;
            default:
                gradient = `linear-gradient(${this.gradientDirection}, ${colors})`;
        }
        
        return gradient;
    }
    
    /**
     * 패턴 생성
     */
    generatePattern() {
        const size = this.patternSize;
        const color = this.patternColor;
        const opacity = this.patternOpacity;
        
        switch (this.backgroundPattern) {
            case 'dots':
                return `radial-gradient(circle at center, ${color} 1px, transparent 1px)`;
            case 'stripes':
                return `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent ${size})`;
            case 'grid':
                return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
            case 'checkerboard':
                return `conic-gradient(${color} 90deg, transparent 90deg 180deg, ${color} 180deg 270deg, transparent 270deg)`;
            default:
                return null;
        }
    }
    
    /**
     * 테두리 스타일 생성
     */
    generateBorderStyle() {
        const styles = [];
        
        // 통합 테두리 또는 개별 테두리
        if (this.border) {
            // borderWidth가 -1이면 개별 border 속성 사용
            if (this.borderWidth === '-1' || this.borderWidth === -1) {
                // 개별 border 속성 사용
                if (this.borderLeft) styles.push(`border-left: ${this.borderLeft}px ${this.borderStyle} ${this.parseColor(this.borderColor)}`);
                if (this.borderTop) styles.push(`border-top: ${this.borderTop}px ${this.borderStyle} ${this.parseColor(this.borderColor)}`);
                if (this.borderRight) styles.push(`border-right: ${this.borderRight}px ${this.borderStyle} ${this.parseColor(this.borderColor)}`);
                if (this.borderBottom) styles.push(`border-bottom: ${this.borderBottom}px ${this.borderStyle} ${this.parseColor(this.borderColor)}`);
            } else {
                // 통합 border 속성 사용
                styles.push(`border: ${this.borderWidth}px ${this.borderStyle} ${this.parseColor(this.borderColor)}`);
            }
        } else {
            styles.push(`border: none`);
        }
        
        //if (this.borderWidth !== '0') {
        //    styles.push(`border-width: ${this.borderWidth}px`);
        //    styles.push(`border-style: ${this.borderStyle}`);
        //    styles.push(`border-color: ${this.parseColor(this.borderColor)}`);
        //}
        
        // 모서리 반지름
        if (this.borderRadius !== '0') {
            styles.push(`border-radius: ${this.borderRadius}px`);
        }
        if (this.round !== '0') {
            styles.push(`border-radius: ${this.round}px`);
        }
        
        // 개별 모서리 반지름
        if (this.borderTopLeftRadius) styles.push(`border-top-left-radius: ${this.borderTopLeftRadius}px`);
        if (this.borderTopRightRadius) styles.push(`border-top-right-radius: ${this.borderTopRightRadius}px`);
        if (this.borderBottomLeftRadius) styles.push(`border-bottom-left-radius: ${this.borderBottomLeftRadius}px`);
        if (this.borderBottomRightRadius) styles.push(`border-bottom-right-radius: ${this.borderBottomRightRadius}px`);
        
        // 테두리 이미지
        if (this.borderImage) {
            styles.push(`border-image: ${this.borderImage}`);
        } else if (this.borderImageSource) {
            styles.push(`border-image-source: url('${this.resolveImagePath(this.borderImageSource)}')`);
            if (this.borderImageSlice) styles.push(`border-image-slice: ${this.borderImageSlice}`);
            styles.push(`border-image-repeat: ${this.borderImageRepeat}`);
        }
        
        return styles;
    }
    
    /**
     * 텍스트 스타일 생성
     */
    generateTextStyle() {
        const styles = [];
        
        // 폰트 속성
        styles.push(`font-family: ${this.font}`);
        styles.push(`font-size: ${this.fontSize}`);
        styles.push(`font-weight: ${this.fontWeight}`);
        styles.push(`font-style: ${this.fontStyle}`);
        styles.push(`text-decoration: ${this.textDecoration}`);
        styles.push(`line-height: ${this.lineHeight}`);
        styles.push(`letter-spacing: ${this.letterSpacing}`);
        styles.push(`word-spacing: ${this.wordSpacing}`);
        
        // 텍스트 정렬
        styles.push(`text-align: ${this.textAlign}`);
        
        // 수직 정렬을 위한 flexbox 설정
        if (this.verticalAlign !== 'top') {
            styles.push(`display: flex`);
            styles.push(`align-items: ${this.verticalAlign === 'middle' ? 'center' : this.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'}`);
            if (this.textAlign !== 'left') {
                styles.push(`justify-content: ${this.textAlign === 'center' ? 'center' : this.textAlign === 'right' ? 'flex-end' : 'flex-start'}`);
            }
        }
        
        // 텍스트 효과
        if (this.textShadow) styles.push(`text-shadow: ${this.textShadow}`);
        if (this.textStroke) styles.push(`-webkit-text-stroke: ${this.textStroke}`);
        if (this.textOutline) {
            styles.push(`text-shadow: -1px -1px 0 ${this.textOutline}, 1px -1px 0 ${this.textOutline}, -1px 1px 0 ${this.textOutline}, 1px 1px 0 ${this.textOutline}`);
        }
        
        // 텍스트 오버플로우
        styles.push(`white-space: ${this.whiteSpace}`);
        styles.push(`word-wrap: ${this.wordWrap}`);
        
        if (this.textOverflow === 'ellipsis') {
            styles.push(`overflow: hidden`);
            styles.push(`text-overflow: ellipsis`);
            if (this.whiteSpace === 'normal') {
                styles.push(`white-space: nowrap`);
            }
        } else if (this.textOverflow === 'clip') {
            styles.push(`overflow: hidden`);
        }
        
        // 최대 줄 수
        if (this.maxLines) {
            styles.push(`display: -webkit-box`);
            styles.push(`-webkit-line-clamp: ${this.maxLines}`);
            styles.push(`-webkit-box-orient: vertical`);
            styles.push(`overflow: hidden`);
        }
        
        return styles;
    }
    
    /**
     * 효과 스타일 생성
     */
    generateEffectStyle() {
        const styles = [];
        
        // 그림자
        if (this.boxShadow) {
            styles.push(`box-shadow: ${this.boxShadow}`);
        }
        if (this.innerShadow) {
            const existing = this.boxShadow ? `${this.boxShadow}, ` : '';
            styles.push(`box-shadow: ${existing}inset ${this.innerShadow}`);
        }
        
        // 발광 효과
        if (this.glow) {
            const glowShadow = `0 0 ${this.glowIntensity} ${this.glowColor}`;
            const existing = this.boxShadow || this.innerShadow ? `, ${glowShadow}` : glowShadow;
            if (!this.boxShadow && !this.innerShadow) {
                styles.push(`box-shadow: ${glowShadow}`);
            }
        }
        
        // 투명도
        if (this.opacity !== '1') {
            styles.push(`opacity: ${this.opacity}`);
        }
        
        // 블렌딩 모드
        if (this.blendMode !== 'normal') {
            styles.push(`mix-blend-mode: ${this.blendMode}`);
        }
        
        // 필터 효과
        const filters = [];
        if (this.filter) {
            filters.push(this.filter);
        } else {
            if (this.blur !== '0') filters.push(`blur(${this.blur})`);
            if (this.brightness !== '1') filters.push(`brightness(${this.brightness})`);
            if (this.contrast !== '1') filters.push(`contrast(${this.contrast})`);
            if (this.saturate !== '1') filters.push(`saturate(${this.saturate})`);
            if (this.hueRotate !== '0deg') filters.push(`hue-rotate(${this.hueRotate})`);
            if (this.invert !== '0') filters.push(`invert(${this.invert})`);
            if (this.sepia !== '0') filters.push(`sepia(${this.sepia})`);
            if (this.grayscale !== '0') filters.push(`grayscale(${this.grayscale})`);
            if (this.dropShadow) filters.push(`drop-shadow(${this.dropShadow})`);
        }
        
        if (filters.length > 0) {
            styles.push(`filter: ${filters.join(' ')}`);
        }
        
        return styles;
    }
    
    /**
     * 변형 스타일 생성
     */
    generateTransformStyle() {
        const styles = [];
        
        if (this.transform) {
            styles.push(`transform: ${this.transform}`);
        } else {
            const transforms = [];
            if (this.translateX !== '0' || this.translateY !== '0') {
                transforms.push(`translate(${this.translateX}, ${this.translateY})`);
            }
            if (this.rotate !== '0deg') transforms.push(`rotate(${this.rotate})`);
            if (this.scale !== '1') transforms.push(`scale(${this.scale})`);
            if (this.scaleX !== '1' || this.scaleY !== '1') {
                transforms.push(`scale(${this.scaleX}, ${this.scaleY})`);
            }
            if (this.skew !== '0deg') transforms.push(`skew(${this.skew})`);
            if (this.skewX !== '0deg') transforms.push(`skewX(${this.skewX})`);
            if (this.skewY !== '0deg') transforms.push(`skewY(${this.skewY})`);
            
            if (transforms.length > 0) {
                styles.push(`transform: ${transforms.join(' ')}`);
            }
        }
        
        if (this.transformOrigin !== 'center') {
            styles.push(`transform-origin: ${this.transformOrigin}`);
        }
        
        return styles;
    }
    
    /**
     * 애니메이션 스타일 생성
     */
    generateAnimationStyle() {
        const styles = [];
        
        // CSS 애니메이션
        if (this.animation) {
            styles.push(`animation: ${this.animation}`);
        } else if (this.animationName) {
            const animationProps = [
                this.animationName,
                this.animationDuration,
                this.animationTimingFunction,
                this.animationDelay,
                this.animationIterationCount,
                this.animationDirection,
                this.animationFillMode
            ].join(' ');
            styles.push(`animation: ${animationProps}`);
        }
        
        // 트랜지션
        if (this.transition) {
            styles.push(`transition: ${this.transition}`);
        } else if (this.transitionProperty !== 'all' || this.transitionDuration !== '0.3s') {
            const transitionProps = [
                this.transitionProperty,
                this.transitionDuration,
                this.transitionTimingFunction,
                this.transitionDelay
            ].join(' ');
            styles.push(`transition: ${transitionProps}`);
        }
        
        return styles;
    }
    
    /**
     * 모양 스타일 생성
     */
    generateShapeStyle() {
        const styles = [];
        
        // 클립 패스
        if (this.clipPath) {
            styles.push(`clip-path: ${this.clipPath}`);
        } else if (this.shape !== 'rectangle') {
            const clipPath = this.generateClipPath();
            if (clipPath) {
                styles.push(`clip-path: ${clipPath}`);
            }
        }
        
        return styles;
    }
    
    /**
     * 클립 패스 생성
     */
    generateClipPath() {
        switch (this.shape) {
            case 'circle':
                return `circle(${this.circleRadius})`;
            case 'ellipse':
                return `ellipse(50% 50%)`;
            case 'triangle':
                return `polygon(50% 0%, 0% 100%, 100% 100%)`;
            case 'hexagon':
                return `polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)`;
            case 'star':
                return this.generateStarClipPath();
            case 'polygon':
                return this.generatePolygonClipPath();
            case 'custom':
                return this.shapePoints;
            default:
                return null;
        }
    }
    
    /**
     * 별 모양 클립 패스 생성
     */
    generateStarClipPath() {
        const points = parseInt(this.starPoints) || 5;
        const innerRadius = parseFloat(this.starInnerRadius) || 0.5;
        const coords = [];
        
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? 1 : innerRadius;
            const x = 50 + 50 * radius * Math.cos(angle);
            const y = 50 + 50 * radius * Math.sin(angle);
            coords.push(`${x}% ${y}%`);
        }
        
        return `polygon(${coords.join(', ')})`;
    }
    
    /**
     * 다각형 클립 패스 생성
     */
    generatePolygonClipPath() {
        const sides = parseInt(this.polygonSides) || 6;
        const coords = [];
        
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = 50 + 50 * Math.cos(angle);
            const y = 50 + 50 * Math.sin(angle);
            coords.push(`${x}% ${y}%`);
        }
        
        return `polygon(${coords.join(', ')})`;
    }
        
    /**
     * 기타 스타일 생성
     */
    generateMiscStyle() {
        const styles = [];
        
        if (this.cursor !== 'default') styles.push(`cursor: ${this.cursor}`);
        if (this.userSelect !== 'auto') styles.push(`user-select: ${this.userSelect}`);
        if (this.pointerEvents !== 'auto') styles.push(`pointer-events: ${this.pointerEvents}`);
        if (this.overflow !== 'visible') styles.push(`overflow: ${this.overflow}`);
        if (this.zIndex !== 'auto') styles.push(`z-index: ${this.zIndex}`);
        
        // 반응형 크기
        if (this.minWidth) styles.push(`min-width: ${this.minWidth}`);
        if (this.maxWidth) styles.push(`max-width: ${this.maxWidth}`);
        if (this.minHeight) styles.push(`min-height: ${this.minHeight}`);
        if (this.maxHeight) styles.push(`max-height: ${this.maxHeight}`);
        
        // 디버그 스타일
        if (this.debug || this.showBounds) {
            styles.push(`outline: 2px dashed #ff0000`);
            styles.push(`outline-offset: -1px`);
        }
        
        return styles;
    }
    
    // =============================================================================
    // 🎭 렌더링 메서드
    // =============================================================================
    
    render() {
        // 기본 스타일 가져오기
        let containerStyle = this.getBaseStyle();
        
        // 모든 스타일 생성
        const backgroundStyles = this.generateBackgroundStyle();
        const borderStyles = this.generateBorderStyle();
        const textStyles = this.generateTextStyle();
        const effectStyles = this.generateEffectStyle();
        const transformStyles = this.generateTransformStyle();
        const animationStyles = this.generateAnimationStyle();
        const shapeStyles = this.generateShapeStyle();
        const miscStyles = this.generateMiscStyle();
        
        // 모든 스타일 합치기
        const allStyles = [
            ...backgroundStyles,
            ...borderStyles,
            ...textStyles,
            ...effectStyles,
            ...transformStyles,
            ...animationStyles,
            ...shapeStyles,
            ...miscStyles
        ];
        
        if (allStyles.length > 0) {
            containerStyle += '; ' + allStyles.join('; ');
        }

        containerStyle = expandXamongThemeTokenAliases(containerStyle);
        
        // 콘텐츠 생성
        const content = this.generateContent();
        
        // 접근성 속성
        const accessibilityAttrs = this.generateAccessibilityAttributes();
        
        // 이벤트 핸들러
        const eventHandlers = this.getClickHandler();
        
        // 애니메이션 스크립트
        const animationScript = this.generateAnimationScript();
        
        const html = `<div style="${containerStyle}" 
                     data-component="shape" 
                     data-component-key="${this.key}"
                     data-key="${this.key}"
                     data-shape="${this.shape}"
                     ${accessibilityAttrs}
                     ${eventHandlers}>
            ${content}
            ${animationScript}
        </div>`;

        this._initializeElement();

        return this.doPolymorph(html);
    }
    
    /**
     * 콘텐츠 생성
     */
    generateContent() {
        let content = '';
        
        // HTML 콘텐츠 우선
        if (this.html) {
            content = this.html;
        } else if (this.text) {
            content = this.escapeHtml(this.text);
        }
        
        // 이미지 콘텐츠 모드
        if (this.imageMode === 'content' && (this.src || this.image)) {
            let imageSrc = this.resolveImagePath(this.src || this.image);
            const imageFilter = this.generateImageFilter();
            
            /*
            // 초기 렌더링은 원본 URL로 시작
            let blobUrl = imageSrc;
            // 인증이 필요한 경우 비동기적으로 로드 후 DOM 업데이트
            if (this.needsAuth(imageSrc)) {
                // 비동기적으로 이미지 로드 후 DOM 업데이트
                this.loadImageWithAuthAsync(imageSrc, `[data-component="image"][data-key="${this.key}"] img`);
            }
            */

            content = `<img src="${imageSrc}" 
                           alt="${this.escapeHtml(this.alt)}"
                           style="width: 100%; height: 100%; object-fit: ${this.imageFit}; ${imageFilter}"
                           loading="lazy"
                           onerror="this.style.display='none'">`;
        }
        
        // 오버레이 이미지
        if (this.imageMode === 'overlay' && (this.src || this.image)) {
            let imageSrc = this.resolveImagePath(this.src || this.image);
            const imageFilter = this.generateImageFilter();
            
            content += `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
                                   background-image: url('${imageSrc}'); 
                                   background-size: ${this.imageSize}; 
                                   background-position: ${this.imagePosition}; 
                                   background-repeat: ${this.imageRepeat};
                                   opacity: ${this.imageOpacity};
                                   mix-blend-mode: ${this.imageBlendMode};
                                   ${imageFilter}
                                   pointer-events: none;"></div>`;
        }
        
        return content;
    }
    
    /**
     * 이미지 필터 생성
     */
    generateImageFilter() {
        if (this.imageFilter) return `filter: ${this.imageFilter};`;
        
        const filters = [];
        if (this.imageBlur !== '0') filters.push(`blur(${this.imageBlur})`);
        if (this.imageBrightness !== '1') filters.push(`brightness(${this.imageBrightness})`);
        if (this.imageContrast !== '1') filters.push(`contrast(${this.imageContrast})`);
        if (this.imageSaturate !== '1') filters.push(`saturate(${this.imageSaturate})`);
        if (this.imageHueRotate !== '0deg') filters.push(`hue-rotate(${this.imageHueRotate})`);
        
        return filters.length > 0 ? `filter: ${filters.join(' ')};` : '';
    }
    
    /**
     * 접근성 속성 생성
     */
    generateAccessibilityAttributes() {
        const attrs = [];
        
        if (this.alt) attrs.push(`alt="${this.escapeHtml(this.alt)}"`);
        if (this.title) attrs.push(`title="${this.escapeHtml(this.title)}"`);
        if (this.ariaLabel) attrs.push(`aria-label="${this.escapeHtml(this.ariaLabel)}"`);
        if (this.role) attrs.push(`role="${this.role}"`);
        
        return attrs.join(' ');
    }
    
    /**
     * 애니메이션 스크립트 생성
     */
    generateAnimationScript() {
        if (!this.imageAnimation || !this.images || !Array.isArray(this.images) || this.images.length <= 1) {
            return '';
        }
        
        const animationId = `shape_anim_${this.key}_${Date.now()}`;
        const duration = parseFloat(this.animationDuration) * 1000 || 3000;
        
        return `
            <script>
            (function() {
                const images = ${JSON.stringify(this.images.map(img => this.resolveImagePath(img)))};
                const container = document.querySelector('[data-key="${this.key}"]');
                const duration = ${duration};
                const mode = '${this.animationMode}';
                const direction = '${this.animationDirection}';
                let currentIndex = 0;
                let forward = true;
                let iterationCount = 0;
                const maxIterations = mode === 'infinite' ? Infinity : (parseInt(mode) || 1);
                
                function updateBackground() {
                    if (container && images[currentIndex]) {
                        container.style.backgroundImage = \`url('\${images[currentIndex]}')\`;
                    }
                }
                
                function nextFrame() {
                    if (iterationCount >= maxIterations) return;
                    
                    if (direction === 'alternate') {
                        if (forward) {
                            currentIndex++;
                            if (currentIndex >= images.length - 1) {
                                forward = false;
                                iterationCount++;
                            }
                        } else {
                            currentIndex--;
                            if (currentIndex <= 0) {
                                forward = true;
                                iterationCount++;
                            }
                        }
                    } else if (direction === 'reverse') {
                        currentIndex = currentIndex <= 0 ? images.length - 1 : currentIndex - 1;
                        if (currentIndex === images.length - 1) iterationCount++;
                    } else {
                        currentIndex = (currentIndex + 1) % images.length;
                        if (currentIndex === 0) iterationCount++;
                    }
                    
                    updateBackground();
                    
                    if (iterationCount < maxIterations) {
                        setTimeout(nextFrame, duration);
                    }
                }
                
                if (images.length > 1) {
                    updateBackground();
                    setTimeout(nextFrame, duration);
                }
            })();
            </script>
        `;
    }
    
    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}


// =============================================================================
// Component Factory (컴포넌트 팩토리)
// =============================================================================
const ComponentType = {
    // Controllers
    X_FORM: 'xForm',
    X_LIST: 'xList',
    
    // Components
    LABEL: 'label',
    TEXT_FIELD: 'textField',
    BUTTON: 'button',
    PANEL: 'panel',
    CHECKBOX: 'checkbox',
    RADIO_BUTTON: 'radioButton',
    IMAGE: 'image',    
    TEXT_VIEW: 'textView',
    VIDEO_VIEW: 'videoView',
    WEB_VIEW: 'webView',
    BANNER: 'banner',
    FRAME: 'frame',
    IMPORT: 'import',
    SHAPE: 'shape'
};

class ComponentFactory {
    static typeAliases = {
        form: ComponentType.X_FORM,
        list: ComponentType.X_LIST
    };

    static componentClasses = {
        // Controllers
        [ComponentType.X_FORM]: XaForm,
        [ComponentType.X_LIST]: XaList,
        form: XaForm,
        list: XaList,
        
        // Components
        [ComponentType.LABEL]: XaLabel,
        [ComponentType.TEXT_FIELD]: XaTextField,
        [ComponentType.TEXT_VIEW]: XaTextView,
        [ComponentType.BUTTON]: XaButton,
        [ComponentType.PANEL]: XaPanel,
        [ComponentType.CHECKBOX]: XaCheckbox,
        [ComponentType.RADIO_BUTTON]: XaRadioButton,
        [ComponentType.IMAGE]: XaImage,
        [ComponentType.VIDEO_VIEW]: XaVideoView,
        [ComponentType.WEB_VIEW]: XaWebView,
        [ComponentType.BANNER]: XaBanner,
        [ComponentType.FRAME]: XaFrame,
        [ComponentType.IMPORT]: XaImport,
        [ComponentType.SHAPE]: XaShape
    };

    static normalizeType(type) {
        const publicProps = getXamongPublicProps();
        if (publicProps && typeof publicProps.normalizeComponentType === 'function') {
            return publicProps.normalizeComponentType(type);
        }
        return this.typeAliases[type] || type;
    }
    
    static create(type, xcon, key, owner = null) {
        type = this.normalizeType(type);
        const ComponentClass = this.componentClasses[type];
        if (!ComponentClass) {
            XCON.warn(`Unknown component type: ${type}`);
            return new XaComponent(xcon, key, owner);
        }
        
        let component;
        
        // XaController 계열 컴포넌트에는 playerHost 전달
        if (ComponentClass === XaForm || ComponentClass === XaList || ComponentClass === XaController) {
            // owner가 XaController이면 playerHost를 추출
            const playerHost = owner && owner.playerHost ? owner.playerHost : null;
            component = new ComponentClass(xcon, key, playerHost);
        } else {
            // 일반 컴포넌트에는 owner 전달
            component = new ComponentClass(xcon, key, owner);        
        }
        
        return component;
    }
    
    static createFromXCON(xcon, key, owner = null) {
        XCON.log(`🔍 ComponentFactory.createFromXCON - 받은 owner:`, owner, xcon);
        XCON.log(`🔍 ComponentFactory.createFromXCON - 받은 owner 타입:`, owner?.constructor?.name);
        
        if (!xcon) {
            XCON.warn(`Component ${key} has no xcon`, xcon);
            return null;
        }
        
        // 타입 추출 - 더 포괄적인 방법으로
        let type = xcon.get('type');
        if (!type) {
            XCON.warn(`Component ${key} has no type`, xcon);
            return null;
        }
        type = ComponentFactory.normalizeType(type);
        
        // ComponentFactory.create 로직을 직접 구현하여 매개변수 전달 문제 해결
        XCON.log(`🔍 ComponentFactory.createFromXCON - 찾는 타입: "${type}"`);
        XCON.log(`🔍 ComponentFactory.componentClasses 키들:`, Object.keys(ComponentFactory.componentClasses));
        
        const ComponentClass = ComponentFactory.componentClasses[type];
        if (!ComponentClass) {
            XCON.warn(`Unknown component type: ${type}`);
            XCON.logon(`🔍 사용 가능한 컴포넌트 타입들:`, Object.keys(ComponentFactory.componentClasses));
            return new XaComponent(xcon, key, owner);
        }
        
        XCON.log(`🔍 ComponentFactory.createFromXCON - 찾은 클래스:`, ComponentClass.name);
        
        let component;
        
        // XaController 계열 컴포넌트에는 playerHost 전달
        if (ComponentClass === XaForm || ComponentClass === XaList || ComponentClass === XaController) {
            const playerHost = owner && owner.playerHost ? owner.playerHost : null;
            component = new ComponentClass(xcon, key, playerHost);
        } else {
            component = new ComponentClass(xcon, key, owner);        
        }
        
        XCON.log(`🔍 --------------------createFromXCON - 직접 구현 - 생성된 컴포넌트:`, component);
        XCON.log(`🔍 --------------------createFromXCON - 직접 구현 - 생성된 컴포넌트 owner:`, component.owner, owner);
        
        // 키에서 owner 접두사 제거 (예: "Login01~usernameField" -> "usernameField")
        const componentName = component.key.includes('~') ? component.key.split('~').pop() : component.key;

        if (owner === component.owner){
            // 컴포넌트를 owner.componentData에 등록 (self/parent 체이닝용)
            if (component.owner && component.owner.componentData && component.key) {
                const currentOwner = window.appHost?.getCurrentOwner() || window.currentXaForm;
                if (currentOwner === component.owner) {
                    component.owner.componentData.set(componentName, component);
                } else { // cellLayout (첫번째 레이아웃 컴포넌트만 등록 -> 추후 인덱스 추가)
                    if (!component.owner.componentData.contains(componentName)) {
                        component.owner.componentData.set(componentName, component);
                    }
                }
                XCON.log(`🔗 컴포넌트 등록1111: ${componentName} -> component.owner.componentData`, currentOwner === component.owner);
            }
        } else {
            // xList or (xForm in XaFrame)
            if (owner && owner.componentData && component.key){               
                owner.componentData.set(componentName, component);
                component.parentController = owner;
                owner.allComponents.set(component.key, component);
                XCON.log(`🔗 컴포넌트 등록2222: ${componentName} -> owner.componentData`);
            } 
            // owner is IPlayerHost
            else {                
                component.owner.componentData.set(componentName, component);
                XCON.log(`🔗 컴포넌트 등록3333: ${componentName} -> component.owner.componentData`);
            }
        }
        
        return component;
    }
}

// =============================================================================
// Event Handlers (이벤트 핸들러)
// =============================================================================

// =============================================================================
function handleComponentClick(componentKey, element, event = null) {
    const isCapturePhase = event && event._xamongCapturePhase;
    XCON.logon2(`🖱️ [이벤트] 컴포넌트 클릭: ${componentKey} ${isCapturePhase ? '(캡처 단계)' : '(일반 단계)'}`, element);
    
    // 이벤트 전파 제어 속성 확인
    const eventPropagation = element.dataset.eventPropagation || 'bubble';
    const shouldStopPropagation = element.dataset.stopPropagation === 'true';
    const shouldPreventDefault = element.dataset.preventDefault === 'true';
    
    XCON.logon2(`🔄 [이벤트] ${componentKey} - 전파 모드: ${eventPropagation}, 중단: ${shouldStopPropagation}, 기본동작방지: ${shouldPreventDefault}`);
    
    // capture 모드에서는 이미 리스트에서 호출되었으므로 전파 제어 로직 단순화
    if (isCapturePhase && eventPropagation === 'capture') {
        XCON.logon2(`📥 [이벤트] ${componentKey} - 캡처 모드로 실행됨`);
    } else if (!isCapturePhase) {
        // 일반 단계에서의 이벤트 전파 제어 적용
        if (event) {
            if (shouldPreventDefault) {
                event.preventDefault();
                XCON.logon2(`🚫 [이벤트] ${componentKey} - 기본 동작 방지됨`);
            }
            
            if (shouldStopPropagation || eventPropagation === 'stop') {
                event.stopPropagation();
                XCON.logon2(`⏹️ [이벤트] ${componentKey} - 이벤트 전파 중단됨`);
            }
            
            // capture 모드가 아닌 경우에만 핸들링 마킹
            if (eventPropagation !== 'capture') {
                event._xamongHandled = true;
                event._xamongComponentKey = componentKey;
                event._xamongPropagationMode = eventPropagation;
            }
        }
    } else {
        // capture 모드 컴포넌트가 일반 단계에서 클릭된 경우 무시
        XCON.logon2(`🚫 [이벤트] ${componentKey} - capture 모드 컴포넌트는 일반 단계에서 무시됨`);
        return;
    }
    
    // 컴포넌트의 onClick 액션 데이터 찾기
    const onClickData = element.dataset.onClick || element.getAttribute('data-on-click');
    if (onClickData) {
        try {
            // HTML 엔티티 디코딩 및 JSON 파싱
            const cleanedData = onClickData.replace(/&quot;/g, '"');
            const actionData = XCON.fromJSON(cleanedData);
            
            // 마우스 이벤트 데이터를 _eventArgs로 생성
            const eventArgs = createMouseEventArgs(event, element);
            
            XCON.logon2(`⚡ [이벤트] ${componentKey} - onClick 액션 실행:`, actionData);
            XCON.logon2(`📊 [이벤트] ${componentKey} - 이벤트 인자:`, eventArgs);
            
            const component = getComponentByKey(componentKey);

            // 액션 실행 시 eventArgs 전달
            executeActionWithEventArgs(actionData, component /*element*/, eventArgs, 'onClick');
        } catch (error) {
            XCON.error('Failed to parse onClick action data:', error, onClickData);
        }
    }
}

// 🔧 마우스 이벤트 아규먼트 생성
function createMouseEventArgs(event, element) {
    if (!event) {
        // 이벤트 객체가 없는 경우 기본값 생성
        event = {
            clientX: 0,
            clientY: 0,
            button: 0,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            type: 'click'
        };
    }
    
    const rect = element.getBoundingClientRect();
    const componentKey = element.dataset.key || element.getAttribute('data-key') || 'unknown';
    
    return new XCON()
        .set('clientX', event.clientX || 0)
        .set('clientY', event.clientY || 0)
        .set('mouseX', event.clientX || 0)
        .set('mouseY', event.clientY || 0)
        .set('localX', (event.clientX || 0) - rect.left)
        .set('localY', (event.clientY || 0) - rect.top)
        .set('button', event.button || 0)
        .set('ctrlKey', event.ctrlKey || false)
        .set('shiftKey', event.shiftKey || false)
        .set('altKey', event.altKey || false)
        .set('metaKey', event.metaKey || false)
        .set('type', event.type || 'click')
        .set('componentKey', componentKey)
        .set('elementWidth', rect.width)
        .set('elementHeight', rect.height)
        .set('elementX', rect.left)
        .set('elementY', rect.top);
}

// 🔧 이벤트 아규먼트와 함께 액션 실행
function executeActionWithEventArgs(actionData, sender, eventArgs, holderName) {
    if (window.EDIT_MODE) {
        return;
    }
    
    if (!actionData) {
        XCON.log('ℹ️ Action data is null/undefined - skipping action execution');
        return;
    }

    // 문자열인 경우 JSON 파싱 시도
    if (typeof actionData === 'string') {
        try {
            actionData = XCON.fromJSON(actionData);
            XCON.log('🔧 Parsed string actionData to object:', actionData);
        } catch (error) {
            XCON.error('❌ Failed to parse actionData string:', error, actionData);
            return;
        }
    } 
    if (!(actionData instanceof XCON)) {
        actionData = XCON.fromJSONObject(actionData);
    }
    
    // 빈 액션 홀더 체크 (XCON 객체가 비어있는 경우)
    if (actionData.count === 0) {
        XCON.log('ℹ️ Empty action holder - skipping action execution');
        return;
    }
    
    // chain 추출
    let chain = null;
    if (actionData.contains('chain')) {
        chain = actionData.get('chain');
    }

    // type 추출
    let actionType = null;
    if (actionData.contains('type')) {
        actionType = actionData.getString('type');
    }
                
    // 실제 Owner 찾기
    // 1. 전역 현재 XaForm 찾기
    let actualOwner = sender?.owner;
    if (!actualOwner) {
        if (window.appHost) {
            actualOwner = window.appHost.getCurrentOwner();
        }

        if (!actualOwner && window.currentXaForm && window.currentXaForm instanceof XaForm) {
            XCON.log(`✅ Found current XaForm:`, window.currentXaForm.constructor.name);
            actualOwner = window.currentXaForm;
        }
        
        // 2. 전역 appHost에서 현재 활성 컨트롤러 찾기
        if (!actualOwner && window.appHost && window.appHost.getCurrentController) {
            const currentController = window.appHost.getCurrentController();
            if (currentController && (currentController instanceof XaForm || currentController instanceof XaList)) {
                XCON.log(`✅ Found current controller from appHost:`, currentController.constructor.name);
                actualOwner = currentController;
            }
        }    
    }

    // Owner를 찾지 못한 경우 액션 실행 중단
    if (!actualOwner) {
        console.warn('#################################################################################');
        console.warn("OOPS!!! executeActionWithEventArgs: no valid owner found for", sender);
        console.warn('#################################################################################');
        const componentKey = sender.element?.dataset?.key || sender.element?.getAttribute?.('data-key') || 'unknown';
        XCON.error(`❌ Cannot execute action ${actionType} - no valid owner found for ${componentKey}`);
        return;
    }
    
    //actualOwner.sender = sender;

    if (!actionType) {
        if (!chain) {
            XCON.log('ℹ️ Action data missing type and chain property - skipping action execution');
            return;
        } else {
            XCON.log('🔍 Executing chain:', chain);
            const nullAction = new NullAction(actualOwner);

            nullAction.initAction(holderName, eventArgs);
            
            nullAction.chain = chain;
            nullAction.execute(sender);
            return;
        }
    }   

    XCON.log(`🎯 Executing action with eventArgs: ${actionType}`, actionData);
    
    try {
        if (typeof ActionFactory !== 'undefined' && ActionFactory && ActionFactory.createFromXCON) {
            XCON.logon3('🔧 Using ActionFactory.createFromXCON for:', actionType);
            
            // ActionFactory를 사용하여 액션 생성 (XCON에서 직접 생성)
            const action = ActionFactory.createFromXCON(actionData, actualOwner);
            if (action) {
                XCON.logon3('✅ Action created successfully:', action.constructor.name, actualOwner, sender);
                
                // _eventArgs와 _holderName 설정
                action.initAction(holderName, eventArgs);

                // 액션 실행 (체인 포함)
                action.execute(sender);
                return;
            } else {
                XCON.warn('⚠️ ActionFactory.createFromXCON returned null for:', actionType);
            }
        }
        
        // ActionFactory가 없거나 액션 생성 실패 시 오류 처리
        XCON.error('❌ ActionFactory가 없거나 액션 생성 실패:', actionType);
    } catch (error) {
        XCON.error('❌ Action execution error:', error);
    }
}

// 리스트 아이템 클릭 핸들러
function handleListItemClick(listKey, itemIndex, element, event = null) {
    XCON.logon2(`🔘 [이벤트] 리스트 아이템 클릭: ${listKey}[${itemIndex}]`, element);
    
    // capture 모드 처리를 위한 플래그 확인
    const isCapturePhase = event && event._xamongCapturePhase;
    
    // 하위 컴포넌트에서 이벤트 전파가 중단되었는지 확인 (bubble 단계에서만)
    if (event && event._xamongHandled && !isCapturePhase) {
        const componentKey = event._xamongComponentKey;
        const propagationMode = event._xamongPropagationMode;
        
        XCON.logon2(`🛑 [이벤트] ${listKey}[${itemIndex}] - 하위 컴포넌트 ${componentKey}에서 이미 처리됨 (모드: ${propagationMode})`);
        
        // 'stop' 모드이거나 stopPropagation이 호출된 경우 리스트 이벤트 실행하지 않음
        if (propagationMode === 'stop' || event.defaultPrevented) {
            XCON.logon2(`⏹️ [이벤트] ${listKey}[${itemIndex}] - 리스트 아이템 클릭 이벤트 중단됨`);
            return;
        }
        
        // 'bubble' 모드인 경우 리스트 이벤트도 실행
        if (propagationMode === 'bubble') {
            XCON.logon2(`🔄 [이벤트] ${listKey}[${itemIndex}] - 버블링 모드로 리스트 이벤트 계속 실행`);
        }
    }
    
    // capture 모드 컴포넌트가 있는지 확인하고 캡처 단계 처리
    if (!isCapturePhase && event) {
        const captureComponents = element.querySelectorAll('[data-event-propagation="capture"]');
        if (captureComponents.length > 0) {
            XCON.logon2(`📥 [이벤트] ${listKey}[${itemIndex}] - capture 모드 컴포넌트 발견, 캡처 단계 시작`);
            
            // 먼저 리스트 이벤트 실행 (capture 단계)
            event._xamongCapturePhase = true;
            executeListItemAction(listKey, itemIndex, element, event);
            
            // 각 capture 모드 컴포넌트의 이벤트 실행
            captureComponents.forEach(captureElement => {
                const componentKey = captureElement.dataset.key || captureElement.getAttribute('data-key');
                if (componentKey) {
                    XCON.logon2(`📥 [이벤트] ${listKey}[${itemIndex}] - capture 컴포넌트 ${componentKey} 이벤트 실행`);
                    handleComponentClick(componentKey, captureElement, event);
                }
            });
            
            return; // capture 단계에서 처리 완료
        }
    }

    // 일반적인 bubble 모드 또는 capture 단계가 아닌 경우 리스트 액션 실행
    if (!isCapturePhase) {
        executeListItemAction(listKey, itemIndex, element, event);
    }
}

// 리스트 아이템 액션 실행 함수 (분리)
function executeListItemAction(listKey, itemIndex, element, event) {
    if (window.EDIT_MODE) {
        return;
    }
    
    const isCapturePhase = event && event._xamongCapturePhase;
    XCON.logon2(`🎯 [이벤트] ${listKey}[${itemIndex}] - 리스트 액션 실행 ${isCapturePhase ? '(캡처 단계)' : '(버블 단계)'}`);
    
    // 선택 상태 토글
    const isSelected = element.classList.contains('selected');
    
    if (isSelected) {
        element.classList.remove('selected');
        element.style.background = 'transparent';
        element.style.borderColor = 'transparent';
    } else {
        // 다른 선택된 아이템들 해제 (single selection)
        const listContainer = element.closest('[data-component="xList"]');
        if (listContainer) {
            const selectedItems = listContainer.querySelectorAll('.xlist-item.selected');
            selectedItems.forEach(item => {
                item.classList.remove('selected');
                item.style.background = 'transparent';
                item.style.borderColor = 'transparent';
            });
        }
        
        element.classList.add('selected');
        element.style.background = 'rgba(59, 130, 246, 0.1)';
        element.style.borderColor = '#3b82f6';
    }
    
    // XaList 인스턴스의 선택 처리
    if (window.appHost) {
        const owner = window.appHost.getCurrentOwner();
        if (owner) {
            const listInstance = owner.allComponents.get(listKey);
            if (listInstance) {
                if (isSelected) {
                    listInstance.unselectItem(itemIndex);
                } else {
                    listInstance.selectItem(itemIndex);
                }

                if (listInstance.cellAction) {
                    try {
                        listInstance.itemData = listInstance.tableData[itemIndex];

                        const actionData = listInstance.cellAction;
                        
                        // 마우스 이벤트 데이터를 _eventArgs로 생성
                        const eventArgs = createMouseEventArgs(event, element);
                        
                        XCON.logon2(`⚡ [이벤트] ${listKey}[${itemIndex}] - 리스트 액션 데이터:`, actionData);
                        XCON.logon2(`📊 [이벤트] ${listKey}[${itemIndex}] - 이벤트 인자:`, eventArgs);
                        
                        // 액션 실행 시 eventArgs 전달
                        executeActionWithEventArgs(actionData, listInstance, eventArgs, 'action');
                    } catch (error) {
                        XCON.error('Failed to parse onClick action data:', error, actionData);
                    }
                }
            }
        }
    } else {
        if (window.XamongUIComponents && window.XamongUIComponents.listInstances) {
            const listInstance = window.XamongUIComponents.listInstances[listKey];
            if (listInstance) {
                if (isSelected) {
                    listInstance.unselectItem(itemIndex);
                } else {
                    listInstance.selectItem(itemIndex);
                }
            }
        }
    }
    
    // 시각적 피드백 (capture 단계에서는 제외)
    if (!isCapturePhase) {
        element.style.transform = 'scale(0.98)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 100);
    }
}

// 액션 실행 함수 - xamong-actions.js의 ActionFactory 사용 (v3.0)
function executeAction(actionData, sender = null) {
    // 기본 이벤트 아규먼트 생성 (eventArgs가 없는 경우)
    const defaultEventArgs = new XCON().set('value', 'default');
    
    // executeActionWithEventArgs 호출
    executeActionWithEventArgs(actionData, sender, defaultEventArgs, 'default');
}


// =============================================================================
// Global Export
// =============================================================================
window.XamongUIComponents = {
    // Base Classes
    XaComponent,
    XaController,
    ComponentType,
    ComponentFactory,
    
    // Controllers
    XaForm,
    XaList,
    
    // Component Classes
    XaLabel,
    XaTextField,
    XaButton,
    XaPanel,
    XaCheckbox,
    XaRadioButton,
    XaImage,
    XaTextView,
    XaVideoView,
    XaWebView,
    XaBanner,
    XaFrame,
    XaImport,
    XaShape,

    // Helper Functions
    handleComponentClick,
    handleListItemClick,
    executeAction: executeAction,
    
    // Instance Storage
    listInstances: {},
    frameInstances: {}
};

// XamongUIComponents에 renderComponent 메서드 추가
window.XamongUIComponents.renderComponent = function(component, key, params = null) {
    XCON.log(`🔍 XamongUIComponents.renderComponent: ${key}`, component);
    
    // 컴포넌트 타입 확인
    let componentType = component.get('type');
    XCON.log(`🔍 Component type: ${componentType}`);
    
    // ⚠️ 중요: 최상위 컴포넌트는 playerHost를 받고, 하위 컴포넌트는 owner를 받아야 함
    let ownerOrPlayerHost = null;
    if (key === 'root') {
        // 최상위 컴포넌트(XaController 계열)는 playerHost를 받음
        ownerOrPlayerHost = window.appHost && window.appHost.playerHost ? window.appHost.playerHost : null;
        XCON.log(`🔍 최상위 컴포넌트 - PlayerHost:`, ownerOrPlayerHost);
    } else {
        // 하위 컴포넌트는 owner를 받지 않음 (각 컴포넌트에서 자체적으로 owner 처리)
        ownerOrPlayerHost = null;
        XCON.log(`🔍 하위 컴포넌트 - Owner: null (자체 처리)`);
    }
    
    XCON.logon2('############################################ ComponentFactory.createFromXCON');
    XCON.logon2('# XamongUIComponents.renderComponent ', component, key);
    XCON.logon2('############################################');

    const uiComponent = ComponentFactory.createFromXCON(component, key, ownerOrPlayerHost);
    if (params && ownerOrPlayerHost) {
        uiComponent.parameter = params;
    }
    XCON.log(`🔍 Created UI component:`, uiComponent);
    
    if (uiComponent) {
        // XaList 인스턴스 저장
        if (uiComponent instanceof XaList) {
            window.XamongUIComponents.listInstances[key] = uiComponent;
        }
        const renderedHtml = uiComponent.render();
        XCON.log(`✅ Rendered HTML for ${key}:`, renderedHtml.substring(0, 100) + '...');
        return renderedHtml;
    }
    
    // 기본 렌더링으로 폴백
    XCON.log(`❌ Failed to create component for ${key}, showing fallback`);
    return `<div style="padding: 10px; background: #f3f4f6; border-radius: 4px; margin: 5px;">
        <strong>${key}:</strong> Unknown component type (${componentType || 'null'})
    </div>`;
};

// =============================================================================
// Banner 상호작용 처리
// =============================================================================

// 배너 상태 관리
const bannerStates = new Map();

function getBannerState(bannerKey) {
    if (!bannerStates.has(bannerKey)) {
        bannerStates.set(bannerKey, {
            currentIndex: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            autoScrollTimer: null,
            viewCount: 0,
            stableSlidePx: 0
        });
    }
    return bannerStates.get(bannerKey);
}

// translateX/Y(%)는 '트랙 전체' 기준이라 한 칸씩 넘기려면 뷰포트 픽셀 기준으로 이동해야 함
// 롤링 시 마지막→클론 구간에서 subpixel·측정 흔들림이 튐으로 보이지 않도록 약간 길고 감속 위주 이징
const BANNER_TRANSITION = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)';

function getBannerViewportAxisSize(bannerElement, orientation) {
    if (orientation === 'vertical') {
        return bannerElement.clientHeight || bannerElement.offsetHeight || 0;
    }
    return bannerElement.clientWidth || bannerElement.offsetWidth || 0;
}

/** 트랙·슬라이드 크기를 뷰포트에 맞춤. 반환값: 주축 한 칸 크기(px) */
function syncBannerTrackLayout(bannerElement, container) {
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const n = container.children.length;
    if (n === 0) return 0;
    const raw = getBannerViewportAxisSize(bannerElement, orientation);
    const bannerKey = bannerElement.getAttribute('data-key');
    const state = bannerKey ? getBannerState(bannerKey) : null;
    let axisSize = raw > 0 ? Math.round(raw) : 0;
    if (state && axisSize <= 0 && state.stableSlidePx > 0) {
        axisSize = state.stableSlidePx;
    }
    if (state && axisSize > 0) {
        if (state.stableSlidePx > 0 && Math.abs(axisSize - state.stableSlidePx) <= 2) {
            axisSize = state.stableSlidePx;
        } else {
            state.stableSlidePx = axisSize;
        }
    }
    if (axisSize <= 0) return 0;
    if (orientation === 'horizontal') {
        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.width = `${n * axisSize}px`;
        container.style.height = '100%';
        Array.from(container.children).forEach((child) => {
            child.style.flex = `0 0 ${axisSize}px`;
            child.style.width = `${axisSize}px`;
            child.style.minWidth = `${axisSize}px`;
            child.style.maxWidth = `${axisSize}px`;
            child.style.boxSizing = 'border-box';
        });
    } else {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.width = '100%';
        container.style.height = `${n * axisSize}px`;
        Array.from(container.children).forEach((child) => {
            child.style.flex = `0 0 ${axisSize}px`;
            child.style.height = `${axisSize}px`;
            child.style.minHeight = `${axisSize}px`;
            child.style.maxHeight = `${axisSize}px`;
            child.style.boxSizing = 'border-box';
        });
    }
    return axisSize;
}

/** 롤링: 복제 슬라이드로 transform 전환이 끝나면 즉시 실제 첫 인덱스(0)로 스냅 — interval 한 틱 대기로 첫 장이 두 번 보이는 현상 방지 */
function bannerRollingTransitionEndHandler(ev) {
    if (ev.propertyName !== 'transform') return;
    const container = ev.currentTarget;
    if (ev.target !== container) return;
    const bannerElement = container.closest('[data-component="banner"]');
    if (!bannerElement) return;
    if (bannerElement.dataset.rolling !== 'true' || bannerElement.dataset.loop !== 'true') return;
    const bannerKey = bannerElement.dataset.key;
    if (!bannerKey) return;
    const state = getBannerState(bannerKey);
    if (state.isDragging) return;
    state.viewCount = container.children.length;
    if (state.viewCount <= 1) return;
    const cloneIndex = state.viewCount - 1;
    if (state.currentIndex !== cloneIndex) return;
    container.style.transition = 'none';
    state.currentIndex = 0;
    updateBannerPosition(bannerKey, { transition: false });
    void container.offsetHeight;
    requestAnimationFrame(() => {
        container.style.transition = BANNER_TRANSITION;
    });
}

function ensureBannerRollingTransitionEnd(bannerKey) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement) return;
    if (bannerElement.dataset.rolling !== 'true' || bannerElement.dataset.loop !== 'true') return;
    const container = bannerElement.querySelector('.banner-container');
    if (!container || container.children.length <= 1) return;
    if (container.dataset.xaRollingBound === '1') return;
    container.dataset.xaRollingBound = '1';
    container.addEventListener('transitionend', bannerRollingTransitionEndHandler);
}

/**
 * 드래그 종료 시 인덱스 반영. 롤링에서 클론·첫 슬라이드 순환을 직접 처리한 경우 true (호출부에서 바로 updateBannerPosition 생략).
 */
function applyBannerSwipeAfterDrag(bannerKey, deltaX, deltaY) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    const state = getBannerState(bannerKey);
    if (!bannerElement) return false;
    const container = bannerElement.querySelector('.banner-container');
    if (!container) return false;

    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const rolling = bannerElement.dataset.rolling === 'true';
    const loop = bannerElement.dataset.loop === 'true';
    const threshold = 50;
    state.viewCount = container.children.length;
    const vc = state.viewCount;
    const lastIdx = vc - 1;
    const lastReal = rolling && loop && vc > 1 ? vc - 2 : lastIdx;

    const primaryDelta = orientation === 'horizontal' ? deltaX : deltaY;
    if (Math.abs(primaryDelta) <= threshold) {
        return false;
    }

    const isHorizontal = orientation === 'horizontal';
    const wantNext = isHorizontal ? primaryDelta < 0 : primaryDelta < 0;
    const wantPrev = isHorizontal ? primaryDelta > 0 : primaryDelta > 0;

    if (rolling && loop && vc > 1) {
        if (wantNext) {
            if (state.currentIndex < lastReal) {
                state.currentIndex++;
            } else if (state.currentIndex === lastReal) {
                state.currentIndex++;
            } else if (state.currentIndex === lastIdx) {
                container.style.transition = 'none';
                state.currentIndex = 0;
                updateBannerPosition(bannerKey, { transition: false });
                requestAnimationFrame(() => {
                    container.style.transition = BANNER_TRANSITION;
                    state.currentIndex = 1;
                    updateBannerPosition(bannerKey);
                });
                return true;
            }
        } else if (wantPrev) {
            if (state.currentIndex === lastIdx) {
                state.currentIndex = lastReal;
            } else if (state.currentIndex > 0) {
                state.currentIndex--;
            } else {
                container.style.transition = 'none';
                state.currentIndex = lastReal;
                updateBannerPosition(bannerKey, { transition: false });
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        container.style.transition = BANNER_TRANSITION;
                    });
                });
                return true;
            }
        }
        return false;
    }

    if (wantNext && state.currentIndex < lastIdx) {
        state.currentIndex++;
    } else if (wantPrev && state.currentIndex > 0) {
        state.currentIndex--;
    }
    return false;
}

function handleBannerMouseDown(event, bannerKey) {
    event.preventDefault();
    const state = getBannerState(bannerKey);
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    
    if (!bannerElement) return;
    
    state.isDragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;
    
    bannerElement.style.cursor = 'grabbing';
    
    // 자동 스크롤 중지
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }

    const container = bannerElement.querySelector('.banner-container');
    if (container) {
        state.viewCount = container.children.length;
        syncBannerTrackLayout(bannerElement, container);
        container.style.transition = 'none';
    }
    
    const moveHandler = (e) => handleBannerMouseMove(e, bannerKey);
    const upHandler = (e) => handleBannerMouseUp(e, bannerKey, moveHandler, upHandler);
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
}

function handleBannerMouseMove(event, bannerKey) {
    const state = getBannerState(bannerKey);
    if (!state.isDragging) return;
    
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    const container = bannerElement.querySelector('.banner-container');
    
    if (!container) return;
    
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    state.viewCount = container.children.length;
    const axisSize = syncBannerTrackLayout(bannerElement, container);
    if (axisSize <= 0) return;

    if (orientation === 'horizontal') {
        const offset = -Math.round(state.currentIndex * axisSize) + deltaX;
        container.style.transform = `translate3d(${offset}px,0,0)`;
    } else {
        const offset = -Math.round(state.currentIndex * axisSize) + deltaY;
        container.style.transform = `translate3d(0,${offset}px,0)`;
    }
}

function handleBannerMouseUp(event, bannerKey, moveHandler, upHandler) {
    const state = getBannerState(bannerKey);
    if (!state.isDragging) return;
    
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    const container = bannerElement.querySelector('.banner-container');
    
    if (!bannerElement || !container) return;
    
    state.isDragging = false;
    bannerElement.style.cursor = 'grab';
    container.style.transition = BANNER_TRANSITION;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    const swipeHandled = applyBannerSwipeAfterDrag(bannerKey, deltaX, deltaY);
    if (!swipeHandled) {
        updateBannerPosition(bannerKey);
    }
    
    // 자동 스크롤 재시작
    startAutoScroll(bannerKey);
    
    // 이벤트 리스너 제거
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
}

function handleBannerTouchStart(event, bannerKey) {
    event.preventDefault();
    const touch = event.touches[0];
    const state = getBannerState(bannerKey);
    
    state.isDragging = true;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    
    // 자동 스크롤 중지
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }

    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (bannerElement) {
        const container = bannerElement.querySelector('.banner-container');
        if (container) {
            state.viewCount = container.children.length;
            syncBannerTrackLayout(bannerElement, container);
            container.style.transition = 'none';
        }
    }
    
    const moveHandler = (e) => handleBannerTouchMove(e, bannerKey);
    const endHandler = (e) => handleBannerTouchEnd(e, bannerKey, moveHandler, endHandler);
    
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', endHandler);
}

function handleBannerTouchMove(event, bannerKey) {
    const state = getBannerState(bannerKey);
    if (!state.isDragging) return;
    
    const touch = event.touches[0];
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    const container = bannerElement.querySelector('.banner-container');
    
    if (!container) return;
    
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    state.viewCount = container.children.length;
    const axisSize = syncBannerTrackLayout(bannerElement, container);
    if (axisSize <= 0) return;

    if (orientation === 'horizontal') {
        const offset = -Math.round(state.currentIndex * axisSize) + deltaX;
        container.style.transform = `translate3d(${offset}px,0,0)`;
    } else {
        const offset = -Math.round(state.currentIndex * axisSize) + deltaY;
        container.style.transform = `translate3d(0,${offset}px,0)`;
    }
}

function handleBannerTouchEnd(event, bannerKey, moveHandler, endHandler) {
    const state = getBannerState(bannerKey);
    if (!state.isDragging) return;
    
    const touch = event.changedTouches[0];
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    const container = bannerElement.querySelector('.banner-container');
    
    if (!bannerElement || !container) return;
    
    state.isDragging = false;
    container.style.transition = BANNER_TRANSITION;

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    const swipeHandled = applyBannerSwipeAfterDrag(bannerKey, deltaX, deltaY);
    if (!swipeHandled) {
        updateBannerPosition(bannerKey);
    }
    
    // 자동 스크롤 재시작
    startAutoScroll(bannerKey);
    
    // 이벤트 리스너 제거
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);
}

function updateBannerPosition(bannerKey, opts) {
    const state = getBannerState(bannerKey);
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    
    // 배너 요소가 없으면 타이머 정리하고 종료
    if (!bannerElement) {
        if (state.autoScrollTimer) {
            clearInterval(state.autoScrollTimer);
            state.autoScrollTimer = null;
        }
        return;
    }
    
    const container = bannerElement.querySelector('.banner-container');
    
    if (!container) return;

    state.viewCount = container.children.length;
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const axisSize = syncBannerTrackLayout(bannerElement, container);

    if (!opts || opts.transition !== false) {
        container.style.transition = BANNER_TRANSITION;
    }

    const offsetPx = axisSize > 0 ? -Math.round(state.currentIndex * axisSize) : 0;

    XCON.log(`updateBannerPosition ${bannerKey}:`, {
        orientation,
        currentIndex: state.currentIndex,
        offsetPx,
        viewCount: state.viewCount
    });

    if (orientation === 'horizontal') {
        container.style.transform = `translate3d(${offsetPx}px,0,0)`;
    } else {
        container.style.transform = `translate3d(0,${offsetPx}px,0)`;
    }
    
    // 인디케이터 업데이트
    updateBannerIndicator(bannerKey);
}

function updateBannerIndicator(bannerKey) {
    const state = getBannerState(bannerKey);
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    
    // 배너 요소가 없으면 종료
    if (!bannerElement) return;
    
    const indicators = bannerElement.querySelectorAll('.banner-indicator');
    const dotCount = indicators.length;
    if (dotCount === 0) return;

    const rolling = bannerElement.dataset.rolling === 'true';
    const loop = bannerElement.dataset.loop === 'true';
    let highlightIndex = state.currentIndex;
    if (rolling && loop && state.currentIndex >= dotCount) {
        highlightIndex = 0;
    } else {
        highlightIndex = Math.min(Math.max(0, state.currentIndex), dotCount - 1);
    }

    const inactiveOp = bannerElement.dataset.bannerChrome === 'landing' ? '0.45' : '0.5';
    indicators.forEach((indicator, index) => {
        const on = index === highlightIndex;
        indicator.style.opacity = on ? '1' : inactiveOp;
        if (indicator.classList && indicator.classList.contains('xa-landing-banner__dot')) {
            indicator.classList.toggle('xa-landing-banner__dot--active', on);
        }
    });

    const curEl = bannerElement.querySelector('.xa-landing-banner__counter-current');
    if (curEl) {
        curEl.textContent = String(highlightIndex + 1);
    }
}

function decodeBannerKeyFromDataset(enc) {
    try {
        return decodeURIComponent(enc || '');
    } catch (e) {
        return '';
    }
}

function updateLandingPauseButtonUi(bannerKey) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement) return;
    const icon = bannerElement.querySelector('[data-xa-landing-nav="pause"] .xa-landing-banner__pause-icon');
    if (!icon) return;
    const paused = bannerElement.dataset.landingPaused === 'true';
    icon.innerHTML = paused
        ? '<polygon points="5 3 19 12 5 21 5 3"/>'
        : '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
}

function toggleBannerLandingPause(bannerKey) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement || bannerElement.dataset.bannerChrome !== 'landing') return;
    const next = bannerElement.dataset.landingPaused === 'true' ? 'false' : 'true';
    bannerElement.dataset.landingPaused = next;
    const state = getBannerState(bannerKey);
    if (next === 'true') {
        if (state.autoScrollTimer) {
            clearInterval(state.autoScrollTimer);
            state.autoScrollTimer = null;
        }
    } else {
        startAutoScroll(bannerKey);
    }
    updateLandingPauseButtonUi(bannerKey);
}

function bannerLandingGoToSlide(bannerKey, logicalIdx) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement) return;
    const state = getBannerState(bannerKey);
    const container = bannerElement.querySelector('.banner-container');
    if (!container) return;
    const dots = bannerElement.querySelectorAll('.banner-indicator');
    const n = dots.length;
    if (n === 0) return;
    const target = Math.max(0, Math.min(logicalIdx | 0, n - 1));
    state.currentIndex = target;
    updateBannerPosition(bannerKey);
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }
    updateLandingPauseButtonUi(bannerKey);
    if (bannerElement.dataset.landingPaused !== 'true') {
        startAutoScroll(bannerKey);
    }
}

function bannerLandingNavBySwipe(bannerKey, direction) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement) return;
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    const state = getBannerState(bannerKey);
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }
    const dx = orientation === 'horizontal' ? (direction === 'next' ? -120 : 120) : 0;
    const dy = orientation === 'vertical' ? (direction === 'next' ? -120 : 120) : 0;
    const handled = applyBannerSwipeAfterDrag(bannerKey, dx, dy);
    if (!handled) {
        updateBannerPosition(bannerKey);
    }
    updateLandingPauseButtonUi(bannerKey);
    if (bannerElement.dataset.landingPaused !== 'true') {
        startAutoScroll(bannerKey);
    }
}

function onBannerLandingChromeClick(ev) {
    const dot = ev.target.closest('[data-xa-landing-dot]');
    const nav = ev.target.closest('[data-xa-landing-nav]');
    const el = dot || nav;
    if (!el) return;
    const enc = el.getAttribute('data-banner-key');
    const bannerKey = decodeBannerKeyFromDataset(enc);
    if (!bannerKey) return;
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement || bannerElement.dataset.bannerChrome !== 'landing') return;
    ev.preventDefault();
    ev.stopPropagation();
    if (dot) {
        const idx = parseInt(dot.getAttribute('data-xa-landing-dot'), 10);
        if (!isNaN(idx)) {
            bannerLandingGoToSlide(bannerKey, idx);
        }
        return;
    }
    const action = el.getAttribute('data-xa-landing-nav');
    if (action === 'pause') {
        toggleBannerLandingPause(bannerKey);
        return;
    }
    if (action === 'prev') {
        bannerLandingNavBySwipe(bannerKey, 'prev');
    } else if (action === 'next') {
        bannerLandingNavBySwipe(bannerKey, 'next');
    }
}

function ensureBannerLandingChromeInteractions(bannerElement) {
    if (!bannerElement || bannerElement.dataset.bannerChrome !== 'landing') return;
    if (bannerElement.dataset.xaLandingUiBound === '1') return;
    bannerElement.dataset.xaLandingUiBound = '1';
    bannerElement.addEventListener('click', onBannerLandingChromeClick);
    bannerElement.addEventListener('mouseenter', () => {
        if (bannerElement.dataset.landingPaused === 'true') return;
        const st = getBannerState(bannerElement.dataset.key);
        if (st && st.autoScrollTimer) {
            clearInterval(st.autoScrollTimer);
            st.autoScrollTimer = null;
        }
    });
    bannerElement.addEventListener('mouseleave', () => {
        if (bannerElement.dataset.landingPaused === 'true') return;
        startAutoScroll(bannerElement.dataset.key);
    });
}

function startAutoScroll(bannerKey) {
    const bannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
    if (!bannerElement) return;

    if (bannerElement.dataset.bannerChrome === 'landing' && bannerElement.dataset.landingPaused === 'true') {
        return;
    }
    
    const autoScroll = bannerElement.dataset.autoScroll === 'true';
    const duration = parseInt(bannerElement.dataset.duration) || 3000;
    const loop = bannerElement.dataset.loop === 'true';
    const rolling = bannerElement.dataset.rolling === 'true';
    const orientation = bannerElement.dataset.orientation || 'horizontal';
    
    XCON.log(`startAutoScroll ${bannerKey}:`, {
        autoScroll,
        duration,
        loop,
        rolling,
        orientation
    });
    
    if (!autoScroll) return;
    
    const state = getBannerState(bannerKey);
    const container = bannerElement.querySelector('.banner-container');
    
    if (!container) return;
    
    // 기존 타이머 정리
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }
    
    state.viewCount = container.children.length;
    
    state.autoScrollTimer = setInterval(() => {
        // 드래그 중이거나 요소가 없으면 건너뛰기
        if (state.isDragging) return;
        
        // 요소 존재 확인
        const currentBannerElement = document.querySelector(`[data-key="${bannerKey}"]`);
        if (!currentBannerElement) {
            clearInterval(state.autoScrollTimer);
            state.autoScrollTimer = null;
            return;
        }
        
        const currentRolling = currentBannerElement.dataset.rolling === 'true';
        const currentLoop = currentBannerElement.dataset.loop === 'true';

        state.viewCount = currentBannerElement.querySelector('.banner-container')?.children.length || state.viewCount;

        // transitionend 미발생 시에만 interval로 스냅(대부분은 transitionend에서 즉시 처리)
        if (currentRolling && currentLoop && state.viewCount > 1 && state.currentIndex === state.viewCount - 1) {
            const snapContainer = currentBannerElement.querySelector('.banner-container');
            if (snapContainer) {
                snapContainer.style.transition = 'none';
                state.currentIndex = 0;
                updateBannerPosition(bannerKey, { transition: false });
                void snapContainer.offsetHeight;
                requestAnimationFrame(() => {
                    snapContainer.style.transition = BANNER_TRANSITION;
                });
            }
            return;
        }

        state.currentIndex++;

        if (!currentRolling || !currentLoop || state.viewCount <= 1) {
            if (state.currentIndex >= state.viewCount) {
                if (currentLoop) {
                    state.currentIndex = 0;
                } else {
                    state.currentIndex = state.viewCount - 1;
                    clearInterval(state.autoScrollTimer);
                    state.autoScrollTimer = null;
                    return;
                }
            }
        } else if (state.currentIndex >= state.viewCount) {
            state.currentIndex = 0;
        }

        updateBannerPosition(bannerKey);
    }, duration);
}

// 배너 정리 함수
function cleanupBanner(bannerKey) {
    const state = getBannerState(bannerKey);
    if (state.autoScrollTimer) {
        clearInterval(state.autoScrollTimer);
        state.autoScrollTimer = null;
    }
    // 상태 맵에서 제거
    bannerStates.delete(bannerKey);
}

// 모든 배너 정리
function cleanupAllBanners() {
    bannerStates.forEach((state, bannerKey) => {
        if (state.autoScrollTimer) {
            clearInterval(state.autoScrollTimer);
        }
    });
    bannerStates.clear();
}

// 배너 초기화 (DOM 로드 후 호출)
function initializeBanners() {
    // 기존 배너들 정리
    cleanupAllBanners();
    
    const banners = document.querySelectorAll('[data-component="banner"]');
    banners.forEach(banner => {
        const bannerKey = banner.dataset.key;
        if (bannerKey) {
            if (banner.dataset.bannerChrome === 'landing' && banner.dataset.landingPaused == null) {
                banner.dataset.landingPaused = 'false';
            }
            updateBannerPosition(bannerKey);
            ensureBannerRollingTransitionEnd(bannerKey);
            ensureBannerLandingChromeInteractions(banner);
            startAutoScroll(bannerKey);
            updateLandingPauseButtonUi(bannerKey);
        }
    });
}

// DOM 로드 후 배너 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBanners);
} else {
    setTimeout(initializeBanners, 100);
}

// 전역 함수로 등록
window.handleBannerMouseDown = handleBannerMouseDown;
window.handleBannerTouchStart = handleBannerTouchStart;
window.initializeBanners = initializeBanners;
window.cleanupBanner = cleanupBanner;
window.cleanupAllBanners = cleanupAllBanners;

// =============================================================================
// Frame 관련 전역 함수들
// =============================================================================

// 프레임 인스턴스 저장소
window.frameInstances = {};

// 프레임 컴포넌트 생성 시 인스턴스 저장
const originalComponentFactoryCreate = ComponentFactory.create;
ComponentFactory.create = function(type, xcon, key) {
    const component = originalComponentFactoryCreate.call(this, type, xcon, key);
    
    // 프레임 인스턴스 저장
    if (component instanceof XaFrame) {
        window.frameInstances[key] = component;
    }
    
    return component;
};

// 프레임 콘텐츠 로드 함수
window.loadFrameContent = function(frameKey) {
    const frameElement = document.querySelector(`[data-key="${frameKey}"]`);
    if (frameElement) {
        const xconFile = frameElement.getAttribute('data-xcon-file');
        if (xconFile) {
            // 프레임 인스턴스 찾기
            const frameInstance = window.frameInstances?.[frameKey];
            if (frameInstance) {
                frameInstance.loadXCONFile(xconFile);
            } else {
                XCON.error(`Frame instance not found for key: ${frameKey}`);
            }
        }
    }
};

// 프레임 다시 로드 함수
window.reloadFrame = function(frameKey) {
    const frameElement = document.querySelector(`[data-key="${frameKey}"]`);
    if (frameElement) {
        const xconFile = frameElement.getAttribute('data-xcon-file');
        if (xconFile) {
            // 프레임 인스턴스 찾기
            const frameInstance = window.frameInstances?.[frameKey];
            if (frameInstance) {
                frameInstance.loadError = null;
                frameInstance.xconContent = null;
                frameInstance.loadXCONFile(xconFile);
            } else {
                XCON.error(`Frame instance not found for key: ${frameKey}`);
            }
        }
    }
};


// =============================================================================
// TextField 이벤트 핸들러들
// =============================================================================

// 🔤 TextField 이벤트 핸들러들
function handleTextFieldFocus(componentKey, element) {
    XCON.log('TextField focused:', componentKey, element);
    
    // 포커스 스타일 적용
    element.style.borderColor = '#3b82f6';
    
    // onBeginEdit 이벤트 실행
    const component = getComponentByKey(componentKey);
    if (component && component.onBeginEdit) {
        // 포커스 이벤트 아규먼트 생성
        const focusEventArgs = new XCON()
            .set('value', element.value)
            .set('componentKey', componentKey)
            .set('hasFocus', true);
        
        executeActionWithEventArgs(component.onBeginEdit, component /*element*/, focusEventArgs, 'onBeginEdit');
    }
}

function handleTextFieldBlur(componentKey, element) {
    XCON.log('TextField blurred:', componentKey, element);
    
    // 블러 스타일 적용
    element.style.borderColor = '#d1d5db';
    
    // onEndEdit 이벤트 실행
    const component = getComponentByKey(componentKey);
    if (component && component.onEndEdit) {
        // 블러 이벤트 아규먼트 생성
        const blurEventArgs = new XCON()
            .set('value', element.value)
            .set('componentKey', componentKey)
            .set('hasFocus', false);
        
        executeActionWithEventArgs(component.onEndEdit, component /*element*/, blurEventArgs, 'onEndEdit');
    }
}

function handleTextFieldInput(componentKey, element) {
    XCON.log('TextField input changed:', componentKey, element.value);
    
    // 컴포넌트 값 업데이트
    const component = getComponentByKey(componentKey);
    XCON.log('TextField input changed:', component, window.appHost.getCurrentOwner());
    if (component) {
        // 컴포넌트의 value와 text 속성 모두 업데이트
        component.value = element.value;
        component.text = element.value;
        
        // 전역 데이터 저장 (자몽 체인에서 참조할 수 있도록)
        if (!window.currentTextFieldValues) {
            window.currentTextFieldValues = {};
        }
        window.currentTextFieldValues[componentKey] = element.value;
        
        // sender 객체에 value 속성 추가 (자몽 체인에서 {{sender.value}} 참조를 위해)
        element.value = element.value; // 이미 있지만 명시적으로 설정
        
        // maxLength 체크
        if (component.maxLength && element.value.length >= component.maxLength) {
            if (component.onMaxLength) {
                executeAction(component.onMaxLength, component); // element);
            }
        }
        
        // onTextChanged 이벤트 실행 (element를 sender로 전달)
        if (component.onTextChanged) {
            XCON.log('🔤 onTextChanged 이벤트 실행:', componentKey, element.value);
            
            // TextField 이벤트 아규먼트 생성
            const textEventArgs = new XCON()
                .set('value', element.value)
                .set('oldValue', component.previousValue || '')
                .set('length', element.value.length)
                .set('maxLength', component.maxLength || 0)
                .set('componentKey', componentKey)
                .set('isEmpty', element.value.length === 0)
                .set('isFull', component.maxLength && element.value.length >= component.maxLength);
            
            // 이전 값 저장 (다음 변경 시 참조용)
            component.previousValue = element.value;
            
            // saveData 액션인 경우 직접 처리
            /*
            if (component.onTextChanged instanceof XCON && component.onTextChanged.getString('type') === 'saveData') {
                const target = component.onTextChanged.getString('target');
                const key = component.onTextChanged.getString('key');
                
                XCON.log('🔤 saveData 직접 처리:', target, key, element.value);
                
                // 데이터 저장 로직 직접 실행
                if (target === 'local') {
                    // 현재 XaForm의 data 속성에 저장 (자몽 체인 표준 방식)
                    if (window.currentXaForm) {
                        if (!window.currentXaForm.data) {
                            window.currentXaForm.data = new XCON();
                        }
                        
                        // XCON 객체에 키-값 저장
                        if (!window.currentXaForm.data.contains(key)) {
                            window.currentXaForm.data.set(key, new XCON());
                        }
                        
                        const keyData = window.currentXaForm.data.get(key);
                        if (keyData instanceof XCON) {
                            keyData.set('value', element.value);
                            XCON.log('✅ XaForm.data에 저장:', `${key}.value`, element.value);
                            XCON.log('📊 현재 XaForm.data:', window.currentXaForm.data);
                        }
                    }
                }
            }
            */
           
            executeActionWithEventArgs(component.onTextChanged, component /*element*/, textEventArgs, 'onTextChanged');
        }
    }
}

function handleTextFieldKeyDown(componentKey, element, event) {
    XCON.log('TextField key down:', componentKey, event.key);
    
    const component = getComponentByKey(componentKey);
    if (component) {
        // 키보드 이벤트 아규먼트 생성
        const keyEventArgs = new XCON()
            .set('key', event.key)
            .set('keyCode', event.keyCode || event.which)
            .set('ctrlKey', event.ctrlKey)
            .set('shiftKey', event.shiftKey)
            .set('altKey', event.altKey)
            .set('metaKey', event.metaKey)
            .set('value', element.value)
            .set('componentKey', componentKey)
            .set('isEnter', event.key === 'Enter')
            .set('isEscape', event.key === 'Escape')
            .set('isTab', event.key === 'Tab');
        
        // Enter 키 처리
        if (event.key === 'Enter' && component.onEnter) {
            event.preventDefault();
            executeActionWithEventArgs(component.onEnter, component /*element*/, keyEventArgs, 'onEnter');
        }
        
        // onKeyDown 이벤트 실행
        if (component.onKeyDown) {
            executeActionWithEventArgs(component.onKeyDown, component /*element*/, keyEventArgs, 'onKeyDown');
        }
    }
}

function handleTextFieldKeyUp(componentKey, element, event) {
    XCON.log('TextField key up:', componentKey, event.key);
    
    const component = getComponentByKey(componentKey);
    if (component && component.onKeyUp) {
        // 키보드 이벤트 아규먼트 생성
        const keyEventArgs = new XCON()
            .set('key', event.key)
            .set('keyCode', event.keyCode || event.which)
            .set('ctrlKey', event.ctrlKey)
            .set('shiftKey', event.shiftKey)
            .set('altKey', event.altKey)
            .set('metaKey', event.metaKey)
            .set('value', element.value)
            .set('componentKey', componentKey)
            .set('isEnter', event.key === 'Enter')
            .set('isEscape', event.key === 'Escape')
            .set('isTab', event.key === 'Tab');
        
        executeActionWithEventArgs(component.onKeyUp, component /*element*/, keyEventArgs, 'onKeyUp');
    }
}

// 컴포넌트 키로 컴포넌트 찾기 헬퍼 함수
function getComponentByKey(componentKey) {

    const componentName = componentKey.includes('~') ? componentKey.split('~').pop() : componentKey;

    if (window.appHost) {
        return window.appHost.getCurrentOwner().componentData.get(componentName);
    }
    
    if (window.currentXaForm) {
        return window.currentXaForm.componentData.get(componentName);
    }
    
    // 전역 컴포넌트 레지스트리에서 찾기
    if (window.globalComponentRegistry && window.globalComponentRegistry[componentName]) {
        return window.globalComponentRegistry[componentName];
    }
    
    return null;
}

// 다른 컴포넌트 이벤트 핸들러들도 추가
function handleCheckboxChange(componentKey, element) {
    XCON.log('Checkbox changed:', componentKey, element.checked);
    
    const component = getComponentByKey(componentKey);
    if (component) {
        component.checked = element.checked;
        
        if (component.onCheckedChanged) {
            // 체크박스 이벤트 아규먼트 생성
            const checkboxEventArgs = new XCON()
                .set('checked', element.checked)
                .set('value', element.checked ? 'true' : 'false')
                .set('componentKey', componentKey)
                .set('isChecked', element.checked)
                .set('text', component.text || '');
            
            executeActionWithEventArgs(component.onCheckedChanged, component /*element*/, checkboxEventArgs, 'onCheckedChanged');
        }
    }
}

function handleRadioButtonChange(componentKey, element) {
    XCON.log('RadioButton changed:', componentKey, element.checked);
    
    const component = getComponentByKey(componentKey);
    if (component) {
        component.checked = element.checked;
        
        if (component.onCheckedChanged) {
            // 라디오 버튼 이벤트 아규먼트 생성
            const radioEventArgs = new XCON()
                .set('checked', element.checked)
                .set('value', element.value || element.checked ? 'true' : 'false')
                .set('componentKey', componentKey)
                .set('isSelected', element.checked)
                .set('text', component.text || '')
                .set('groupName', element.name || '');
            
            executeActionWithEventArgs(component.onCheckedChanged, component /*element*/, radioEventArgs, 'onCheckedChanged');
        }
    }
}

// 전역 스코프에 TextField 이벤트 핸들러들 추가
window.handleTextFieldFocus = handleTextFieldFocus;
window.handleTextFieldBlur = handleTextFieldBlur;
window.handleTextFieldInput = handleTextFieldInput;
window.handleTextFieldKeyDown = handleTextFieldKeyDown;
window.handleTextFieldKeyUp = handleTextFieldKeyUp;
window.handleTextViewFocus = handleTextViewFocus;
window.handleTextViewBlur = handleTextViewBlur;
window.handleTextViewInput = handleTextViewInput;
window.handleTextViewKeyDown = handleTextViewKeyDown;
window.handleTextViewKeyUp = handleTextViewKeyUp;
window.getComponentByKey = getComponentByKey;
window.handleCheckboxChange = handleCheckboxChange;
window.handleRadioButtonChange = handleRadioButtonChange;

// 🔄 TextView 이벤트 핸들러
function handleTextViewFocus(componentKey, element) {
    XCON.log('📝 TextView 포커스:', componentKey, element.value);
    
    const component = getComponentByKey(componentKey);
    if (component && component.onBeginEdit) {
        try {
            executeAction(component.onBeginEdit, component);
        } catch (error) {
            XCON.error('TextView beginEdit 액션 실행 실패:', error);
        }
    }
}

function handleTextViewBlur(componentKey, element) {
    XCON.log('📝 TextView 블러:', componentKey, element.value);
    
    const component = getComponentByKey(componentKey);
    if (component && component.onEndEdit) {
        try {
            executeAction(component.onEndEdit, component);
        } catch (error) {
            XCON.error('TextView endEdit 액션 실행 실패:', error);
        }
    }
}

function handleTextViewInput(componentKey, element) {
    XCON.log('📝 TextView 입력:', componentKey, element.value);
    
    const component = getComponentByKey(componentKey);
    if (component) {
        // 컴포넌트의 text 속성 업데이트
        component.text = element.value;
        
        // maxLength 체크
        if (component.maxLength && element.value.length > component.maxLength) {
            element.value = element.value.substring(0, component.maxLength);
            component.text = element.value;
        }
        
        // onTextChanged 액션 실행
        if (component.onTextChanged) {
            try {
                executeAction(component.onTextChanged, component);
            } catch (error) {
                XCON.error('TextView textChanged 액션 실행 실패:', error);
            }
        }
    }
}

function handleTextViewKeyDown(componentKey, element, event) {
    XCON.log('📝 TextView 키 다운:', componentKey, event.key);
    
    const component = getComponentByKey(componentKey);
    if (component && component.onKeyDown) {
        try {
            // 키 이벤트 정보를 포함한 EventArgs 생성
            const eventArgs = {
                type: 'keyDown',
                key: event.key,
                keyCode: event.keyCode,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                value: element.value
            };
            
            executeActionWithEventArgs(component.onKeyDown, component /*element*/, eventArgs, 'onKeyDown');
        } catch (error) {
            XCON.error('TextView keyDown 액션 실행 실패:', error);
        }
    }
}

function handleTextViewKeyUp(componentKey, element, event) {
    XCON.log('📝 TextView 키 업:', componentKey, event.key);
    
    const component = getComponentByKey(componentKey);
    if (component && component.onKeyUp) {
        try {
            // 키 이벤트 정보를 포함한 EventArgs 생성
            const eventArgs = {
                type: 'keyUp',
                key: event.key,
                keyCode: event.keyCode,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                value: element.value
            };
            
            executeActionWithEventArgs(component.onKeyUp, component /*element*/, eventArgs, 'onKeyUp');
        } catch (error) {
            XCON.error('TextView keyUp 액션 실행 실패:', error);
        }
    }
}

// =============================================================================
// Polymorph Click Handler
// =============================================================================

// 폴리모프 버튼 클릭 핸들러
window.XamongUIComponents.handlePolymorphClick = function(componentKey, event) {
    event.preventDefault();
    event.stopPropagation();
    
    XCON.logon(`🔘 Polymorph button clicked: ${componentKey}`);
    
    // 컴포넌트 인스턴스 찾기
    let componentInstance = null;
    
    // 현재 활성화된 XaForm에서 컴포넌트 찾기
    const currentOwner = window.appHost.getCurrentOwner();
    if (currentOwner && currentOwner.componentInstances) {
        componentInstance = currentOwner.componentInstances[componentKey];
    }
    
    // XaList 인스턴스에서도 찾기
    if (!componentInstance && window.XamongUIComponents.listInstances) {
        for (const listKey in window.XamongUIComponents.listInstances) {
            const listInstance = window.XamongUIComponents.listInstances[listKey];
            if (listInstance && listInstance.componentInstances && listInstance.componentInstances[componentKey]) {
                componentInstance = listInstance.componentInstances[componentKey];
                break;
            }
        }
    }
    
    // 컴포넌트 인스턴스를 찾았으면 onClick 액션 실행
    if (componentInstance && componentInstance.owner && componentInstance.owner.executeAction) {
        XCON.logon(`✅ Executing onClick action for polymorph component: ${componentKey}`);
        componentInstance.owner.executeAction('onClick', componentInstance);
    } else {
        XCON.logon(`⚠️ Could not find component instance or owner for: ${componentKey}`);
    }
};

// =============================================================================
// 추가 액션 함수들 - 모듈화된 액션 파일들을 로드
// =============================================================================

// 액션 모듈들을 동적으로 로드하는 함수
function loadActionModules() {
    const actionModules = [
        'xamong-fallback-actions-core.js',      // 핵심 액션들
        'xamong-fallback-actions-data.js',      // 데이터 액션들
        'xamong-fallback-actions-communication.js', // 통신 액션들
        'xamong-fallback-actions-ui.js',        // UI 액션들
        'xamong-fallback-actions-media.js',     // 미디어 액션들
        'xamong-fallback-actions-control.js'    // 제어 액션들
    ];
    
    actionModules.forEach(module => {
        const script = document.createElement('script');
        script.src = `libs/${module}`;
        script.async = false; // 순서대로 로드
        document.head.appendChild(script);
    });
}

// 페이지 로드 시 액션 모듈들 로드
if (typeof window !== 'undefined') {
    //loadActionModules();
}

// executeAction을 전역 스코프에 노출
window.executeAction = executeAction;

// 중복 제거됨 - 위의 통합된 XamongUIComponents 객체 사용

// ComponentFactory를 전역에 할당
window.ComponentFactory = ComponentFactory;

XCON.log("XamongCode UI Components System with Controllers loaded successfully!");
XCON.log("Available component types:", Object.keys(ComponentType));
XCON.log("Controllers: xForm, xList");
XCON.log("Components:", Object.keys(ComponentType).filter(k => !k.startsWith('X_')));
XCON.log("Banner interaction system initialized!");
XCON.log("Frame system initialized!");
XCON.log("Complete Action System initialized! (xamong-actions.js compatible) - v3.0");
XCON.log("TextField event handlers initialized!");
XCON.log("TextView event handlers initialized!");
XCON.log("✅ ComponentFactory assigned to window.ComponentFactory");
