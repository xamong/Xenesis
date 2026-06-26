/**
 * QuickCalc.js - JavaScript port of QuickCalc.cs
 * Maintains all existing functionality from the original C# implementation
 */

// Forward declaration for FormulaInfoSetAction enum
const FormulaInfoSetAction = {
    FormulaSet: 0,
    NonFormulaSet: 1,
    CalculatedValueSet: 2
};

/**
 * CalcQuickBase - Base class for CalcQuick
 */
class CalcQuickBase extends EventTarget {
    constructor(resetStaticMembers = false) {
        super();
        this.initCalcQuick(resetStaticMembers);
    }

    // Private fields
    _calcQuickID = 0;
    _controlModifiedFlags = new Map();
    _dataStore = null;
    _engine = null;
    _keyToRowsMap = {};
    _keyToVectors = {};
    _nameToControlMap = {};
    _rowsToKeyMap = {};
    autoCalc = false;
    cellPrefix = "!0!A";
    checkKeys = true;
    disposeEngineResource = true;
    ignoreChanges = false;

    // Constants
    static LEFTBRACE = "{";
    static TIC = '"';
    static LEFTBRACKET = '[';
    static RIGHTBRACKET = ']';
    static VALIDLEFTCHARS = "+-*/><=^(,&";
    static VALIDRIGHTCHARS = "+-*/><=^),&";

    /**
     * Initialize CalcQuick structures
     * @param {boolean} resetStaticMembers - Whether to reset static members
     */
    initCalcQuick(resetStaticMembers) {
        this._dataStore = new FormulaInfoHashtable();
        this._rowsToKeyMap = {};
        this._keyToRowsMap = {};
        this._keyToVectors = {};
        this._controlModifiedFlags = new Map();
        this._nameToControlMap = {};

        this._engine = this.createEngine();

        if (resetStaticMembers && CalcEngine.resetSheetFamilyID) {
            CalcEngine.resetSheetFamilyID();
            if (this._engine.DependentFormulaCells) {
                this._engine.DependentFormulaCells = {};
            }
            if (this._engine.DependentCells) {
                this._engine.DependentCells = {};
            }
        }

        // Set up sheet family ID and register grid (optional)
        try {
            if (typeof CalcEngine !== 'undefined' && CalcEngine.createSheetFamilyID) {
                const i = CalcEngine.createSheetFamilyID();
                this.cellPrefix = `!${i}!A`;
                if (this._engine.registerGridAsSheet) {
                    this._engine.registerGridAsSheet(`Sheet${this.calcQuickID}`, this, i);
                }
            }
        } catch (e) {
            XCON.warn('CalcEngine sheet registration failed:', e.message);
        }

        // Configure engine for local calculations (optional)
        try {
            if (this._engine.CalculatingSuspended !== undefined) {
                this._engine.CalculatingSuspended = true;
            }
            if (this._engine.IgnoreValueChanged !== undefined) {
                this._engine.IgnoreValueChanged = true;
            }
        } catch (e) {
            XCON.warn('CalcEngine configuration failed:', e.message);
        }
    }

    /**
     * Create and configure the calculation engine
     * @returns {CalcEngine} The configured calculation engine
     */
    createEngine() {
        const engine = new CalcEngine(this);
        if (engine.UseFormulaValues !== undefined) {
            engine.UseFormulaValues = true;
        }

        // Initialize all function extensions for browser environment
        this.initializeAllFunctions(engine);

        return engine;
    }

    /**
     * Initialize all function extensions for CalcEngine (browser version)
     * @param {CalcEngine} engine - The CalcEngine instance
     */
    initializeAllFunctions(engine) {
        const functionExtensions = [
            { name: 'CalcEngineExtensions', label: 'CalcEngineExtensions' },
            { name: 'CalcEngineMathFunctions', label: 'CalcEngineMathFunctions (SQRT, ABS, etc.)' },
            { name: 'CalcEngineStatisticalFunctions', label: 'CalcEngineStatisticalFunctions' },
            { name: 'CalcEngineTextFunctions', label: 'CalcEngineTextFunctions' },
            { name: 'CalcEngineDateTimeFunctions', label: 'CalcEngineDateTimeFunctions' },
            { name: 'CalcEngineLogicalFunctions', label: 'CalcEngineLogicalFunctions' },
            { name: 'CalcEngineLookupFunctions', label: 'CalcEngineLookupFunctions' },
            { name: 'CalcEngineFinancialFunctions', label: 'CalcEngineFinancialFunctions' }
        ];

        for (const extension of functionExtensions) {
            try {
                XCON.log(`🔍 Checking ${extension.name}:`, typeof window[extension.name]);
                if (typeof window[extension.name] !== 'undefined') {
                    XCON.log(`🔍 Creating instance of ${extension.name}`);
                    const instance = new window[extension.name](engine);
                    XCON.log(`✅ ${extension.label} loaded successfully`);
                    
                    // 논리 함수들이 제대로 등록되었는지 확인
                    if (extension.name === 'CalcEngineLogicalFunctions') {
                        XCON.log(`🔍 논리 함수 등록 확인:`);
                        XCON.log(`  - IF: ${!!engine.libraryFunctions['IF']}`);
                        XCON.log(`  - AND: ${!!engine.libraryFunctions['AND']}`);
                        XCON.log(`  - OR: ${!!engine.libraryFunctions['OR']}`);
                        XCON.log(`  - NOT: ${!!engine.libraryFunctions['NOT']}`);
                        XCON.log(`  - TRUE: ${!!engine.libraryFunctions['TRUE']}`);
                        XCON.log(`  - FALSE: ${!!engine.libraryFunctions['FALSE']}`);
                    }
                } else {
                    XCON.warn(`⚠️ ${extension.name} not available in window object`);
                    XCON.log(`🔍 Available in window:`, Object.keys(window).filter(k => k.includes('CalcEngine')));
                }
            } catch (e) {
                XCON.error(`❌ Failed to load ${extension.name}:`, e.message, e.stack);
                // Continue with other extensions even if one fails
            }
        }

        // Register additional common functions
        try {
            this.registerAdditionalFunctions(engine);
        } catch (e) {
            XCON.error('❌ Additional function registration failed:', e.message);
        }



        // 논리 함수들이 등록되지 않은 경우 직접 등록
        const logicalFunctions = ['IF', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE'];
        const missingLogical = logicalFunctions.filter(fn => !engine.libraryFunctions[fn]);
        
        if (missingLogical.length > 0) {
            XCON.warn(`⚠️ 누락된 논리 함수들: ${missingLogical.join(', ')}`);
            XCON.log(`🔧 논리 함수들을 직접 등록 시도...`);
            
            try {
                if (typeof window.CalcEngineLogicalFunctions !== 'undefined') {
                    XCON.log(`🔧 CalcEngineLogicalFunctions 직접 인스턴스 생성`);
                    new window.CalcEngineLogicalFunctions(engine);
                } else {
                    XCON.error(`❌ CalcEngineLogicalFunctions를 찾을 수 없음`);
                }
            } catch (e) {
                XCON.error(`❌ 논리 함수 직접 등록 실패:`, e);
            }
        }
    }

    /**
     * Register additional common functions
     * @param {CalcEngine} engine - The CalcEngine instance
     */
    registerAdditionalFunctions(engine) {
        try {
            // Check if engine has the required methods
            if (!engine || !engine.addFunction) {
                XCON.warn('Engine does not support addFunction method');
                return;
            }

            // 논리 함수들을 직접 구현 (백업용)
            if (!engine.libraryFunctions['IF']) {
                XCON.log('🔧 논리 함수들을 직접 등록합니다...');
                
                engine.addFunction("IF", function(args) {
                    try {
                        XCON.log(`🔍 IF 함수 직접 구현 호출, args: "${args}"`);
                        const argArray = engine.splitArgsPreservingQuotedCommas(args);
                        XCON.log(`🔍 IF splitArgs 결과:`, argArray);
                        
                        if (argArray.length < 2 || argArray.length > 3) {
                            XCON.log(`🔍 IF 인자 개수 오류: ${argArray.length}`);
                            return "#ERROR!";
                        }
                        
                        // 조건 평가
                        let conditionResult;
                        const condition = argArray[0].trim();
                        XCON.log(`🔍 IF 조건식: "${condition}"`);
                        
                        // CalcEngine이 조건식을 처리하지 못하는 경우 JavaScript로 직접 평가
                        if (condition.includes('=') || condition.includes('>') || condition.includes('<')) {
                            XCON.log(`🔍 IF: 비교 연산자 감지, JavaScript로 직접 평가`);
                            try {
                                // = 를 == 로 변환 (JavaScript 비교 연산자)
                                const jsCondition = condition.replace(/([^=!><])=([^=])/g, '$1==$2');
                                XCON.log(`🔍 IF: JavaScript 조건식: "${jsCondition}"`);
                                conditionResult = eval(jsCondition) ? "1" : "0";
                                XCON.log(`🔍 IF: JavaScript 평가 결과: "${conditionResult}"`);
                            } catch (evalError) {
                                XCON.log(`🔍 IF: JavaScript 평가 오류:`, evalError);
                                conditionResult = "0";
                            }
                        } else {
                            try {
                                conditionResult = engine.computedValue(engine.parse(condition));
                                XCON.log(`🔍 IF 조건 평가 결과: "${conditionResult}"`);
                            } catch (e) {
                                XCON.log(`🔍 IF 조건 평가 오류, getValueFromArg 시도:`, e.message);
                                conditionResult = engine.getValueFromArg(condition);
                                XCON.log(`🔍 IF getValueFromArg 결과: "${conditionResult}"`);
                            }
                        }
                        
                        let isTrue = false;
                        if (conditionResult === "TRUE" || conditionResult === "1") {
                            isTrue = true;
                        } else if (conditionResult === "FALSE" || conditionResult === "0") {
                            isTrue = false;
                        } else {
                            const d = parseFloat(conditionResult);
                            if (!isNaN(d)) {
                                isTrue = (d !== 0);
                            } else {
                                // 문자열의 경우 빈 문자열이면 false
                                isTrue = (conditionResult && conditionResult.length > 0);
                            }
                        }
                        
                        XCON.log(`🔍 IF 최종 조건 평가: ${isTrue}`);
                        
                        if (isTrue) {
                            let result = engine.getValueFromArg(argArray[1]);
                            if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
                                result = result.slice(1, -1);
                            }
                            XCON.log(`🔍 IF TRUE 결과: "${result}"`);
                            return result;
                        } else {
                            if (argArray.length === 3) {
                                let result = engine.getValueFromArg(argArray[2]);
                                if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
                                    result = result.slice(1, -1);
                                }
                                XCON.log(`🔍 IF FALSE 결과: "${result}"`);
                                return result;
                            } else {
                                XCON.log(`🔍 IF 기본 FALSE 반환`);
                                return "FALSE";
                            }
                        }
                    } catch (ex) {
                        XCON.log(`🔍 IF 함수 오류:`, ex);
                        return "#ERROR!";
                    }
                });
                
                engine.addFunction("AND", function(args) {
                    try {
                        const argArray = engine.splitArgsPreservingQuotedCommas(args);
                        for (const arg of argArray) {
                            let result;
                            if (arg === "TRUE") {
                                continue;
                            } else if (arg === "FALSE") {
                                return "FALSE";
                            } else {
                                // CalcEngine이 조건식을 처리하지 못하는 경우 JavaScript로 직접 평가
                                if (arg.includes('=') || arg.includes('>') || arg.includes('<')) {
                                    try {
                                        const jsCondition = arg.replace(/([^=!><])=([^=])/g, '$1==$2');
                                        result = eval(jsCondition) ? "1" : "0";
                                    } catch (evalError) {
                                        result = "0";
                                    }
                                } else {
                                    try {
                                        result = engine.computedValue(engine.parse(arg));
                                    } catch (e) {
                                        result = engine.getValueFromArg(arg);
                                    }
                                }
                                
                                if (result === "FALSE") return "FALSE";
                                const d = parseFloat(result);
                                if (!isNaN(d) && d === 0) return "FALSE";
                            }
                        }
                        return "TRUE";
                    } catch (ex) {
                        return "#ERROR!";
                    }
                });
                
                engine.addFunction("OR", function(args) {
                    try {
                        XCON.log(`🔍 OR 함수 호출, args: "${args}"`);
                        const argArray = engine.splitArgsPreservingQuotedCommas(args);
                        XCON.log(`🔍 OR splitArgs 결과:`, argArray);
                        
                        for (const arg of argArray) {
                            const trimmedArg = arg.trim();
                            XCON.log(`🔍 OR 처리 중인 인자: "${trimmedArg}"`);
                            
                            let result;
                            if (trimmedArg === "TRUE") {
                                XCON.log(`🔍 OR: TRUE 값 감지, TRUE 반환`);
                                return "TRUE";
                            } else if (trimmedArg === "FALSE") {
                                XCON.log(`🔍 OR: FALSE 값 감지, 계속 진행`);
                                continue;
                            } else {
                                // CalcEngine이 조건식을 처리하지 못하는 경우 JavaScript로 직접 평가
                                if (trimmedArg.includes('=') || trimmedArg.includes('>') || trimmedArg.includes('<')) {
                                    XCON.log(`🔍 OR: 비교 연산자 감지, JavaScript로 직접 평가`);
                                    try {
                                        // = 를 == 로 변환 (JavaScript 비교 연산자)
                                        const jsCondition = trimmedArg.replace(/([^=!><])=([^=])/g, '$1==$2');
                                        XCON.log(`🔍 OR: JavaScript 조건식: "${jsCondition}"`);
                                        result = eval(jsCondition) ? "1" : "0";
                                        XCON.log(`🔍 OR: JavaScript 평가 결과: "${result}"`);
                                    } catch (evalError) {
                                        XCON.log(`🔍 OR: JavaScript 평가 오류:`, evalError);
                                        result = "0";
                                    }
                                } else {
                                    try {
                                        result = engine.computedValue(engine.parse(trimmedArg));
                                        XCON.log(`🔍 OR: 조건식 "${trimmedArg}" 평가 결과: "${result}"`);
                                    } catch (e) {
                                        XCON.log(`🔍 OR: 조건식 파싱 오류, getValueFromArg 시도:`, e.message);
                                        result = engine.getValueFromArg(trimmedArg);
                                        XCON.log(`🔍 OR: getValueFromArg 결과: "${result}"`);
                                    }
                                }
                                
                                if (result === "TRUE" || result === "1") {
                                    XCON.log(`🔍 OR: TRUE 결과 감지, TRUE 반환`);
                                    return "TRUE";
                                }
                                const d = parseFloat(result);
                                if (!isNaN(d) && d !== 0) {
                                    XCON.log(`🔍 OR: 0이 아닌 숫자 ${d}, TRUE 반환`);
                                    return "TRUE";
                                }
                                XCON.log(`🔍 OR: FALSE 조건, 계속 진행`);
                            }
                        }
                        XCON.log(`🔍 OR: 모든 조건이 FALSE, FALSE 반환`);
                        return "FALSE";
                    } catch (ex) {
                        XCON.log(`🔍 OR 함수 오류:`, ex);
                        return "#ERROR!";
                    }
                });
                
                engine.addFunction("NOT", function(args) {
                    try {
                        let result;
                        if (args === "TRUE") {
                            return "FALSE";
                        } else if (args === "FALSE") {
                            return "TRUE";
                        } else {
                            // CalcEngine이 조건식을 처리하지 못하는 경우 JavaScript로 직접 평가
                            if (args.includes('=') || args.includes('>') || args.includes('<')) {
                                try {
                                    const jsCondition = args.replace(/([^=!><])=([^=])/g, '$1==$2');
                                    result = eval(jsCondition) ? "1" : "0";
                                } catch (evalError) {
                                    result = "0";
                                }
                            } else {
                                try {
                                    result = engine.computedValue(engine.parse(args));
                                } catch (e) {
                                    result = engine.getValueFromArg(args);
                                }
                            }
                            
                            if (result === "TRUE") return "FALSE";
                            if (result === "FALSE") return "TRUE";
                            const d = parseFloat(result);
                            if (!isNaN(d)) {
                                return d !== 0 ? "FALSE" : "TRUE";
                            }
                            return "TRUE";
                        }
                    } catch (ex) {
                        return "#ERROR!";
                    }
                });
                
                engine.addFunction("TRUE", function(args) {
                    return "TRUE";
                });
                
                engine.addFunction("FALSE", function(args) {
                    return "FALSE";
                });
                
                XCON.log('✅ 논리 함수들 직접 등록 완료');
            }

            // CONCAT 함수를 항상 강제로 등록 (개선된 안전한 버전)
            XCON.log('🔧 안전한 CONCAT 함수를 강제로 등록합니다...');
            XCON.log('🔍 현재 CONCAT 함수 상태:', !!engine.libraryFunctions['CONCAT']);
            {
                XCON.log('🔧 안전한 CONCAT 함수를 직접 등록합니다...');
                
                engine.addFunction("CONCAT", function(args) {
                    XCON.log(`🔍 안전한 CONCAT 함수 호출, args: "${args}"`);
                    
                    try {
                        const argArray = engine.splitArgsPreservingQuotedCommas(args);
                        XCON.log(`🔍 CONCAT splitArgs 결과:`, argArray);
                        
                        let result = '';
                        for (let i = 0; i < argArray.length; i++) {
                            const arg = argArray[i].trim();
                            XCON.log(`🔍 CONCAT 처리 중 인자 ${i}: "${arg}"`);
                            
                            let value;
                            try {
                                // 이미 따옴표로 둘러싸인 문자열인 경우
                                if (arg.startsWith('"') && arg.endsWith('"')) {
                                    value = arg.slice(1, -1);
                                    XCON.log(`🔍 CONCAT 문자열 리터럴: "${value}"`);
                                } else {
                                    // 변수나 계산 결과인 경우
                                    value = engine.getValueFromArg(arg);
                                    XCON.log(`🔍 CONCAT getValueFromArg 결과: "${value}"`);
                                    
                                    // 결과가 따옴표로 둘러싸인 경우 제거
                                    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
                                        value = value.slice(1, -1);
                                        XCON.log(`🔍 CONCAT 결과 따옴표 제거: "${value}"`);
                                    }
                                }
                                
                                result += value;
                                XCON.log(`🔍 CONCAT 현재까지 결과: "${result}"`);
                                
                            } catch (argError) {
                                XCON.log(`🔍 CONCAT 인자 처리 오류 (${i}):`, argError);
                                // 오류 발생 시 원본 값 사용 (따옴표 제거)
                                let fallbackValue = arg;
                                if (fallbackValue.startsWith('"') && fallbackValue.endsWith('"')) {
                                    fallbackValue = fallbackValue.slice(1, -1);
                                }
                                result += fallbackValue;
                                XCON.log(`🔍 CONCAT 오류 시 대체값 사용: "${fallbackValue}"`);
                            }
                        }
                        
                        XCON.log(`🔍 안전한 CONCAT 최종 결과: "${result}"`);
                        return result;
                        
                    } catch (error) {
                        XCON.log(`🔍 CONCAT 함수 전체 오류:`, error);
                        return "#ERROR!";
                    }
                });
                
                XCON.log('✅ 안전한 CONCAT 함수 직접 등록 완료');
            }

            // 기존 CONCATENATE 함수도 안전한 버전으로 개선 (덮어쓰기)
            XCON.log('🔧 안전한 CONCATENATE 함수를 강제로 개선합니다...');
            XCON.log('🔍 현재 CONCATENATE 함수 상태:', !!engine.libraryFunctions['CONCATENATE']);
            {
                XCON.log('🔧 기존 CONCATENATE 함수를 안전한 버전으로 교체합니다...');
                
                engine.addFunction("CONCATENATE", function(args) {
                    XCON.log(`🔍 안전한 CONCATENATE 함수 호출, args: "${args}"`);
                    
                    try {
                        const argArray = engine.splitArgsPreservingQuotedCommas(args);
                        XCON.log(`🔍 CONCATENATE splitArgs 결과:`, argArray);
                        
                        let result = '';
                        for (let i = 0; i < argArray.length; i++) {
                            const arg = argArray[i].trim();
                            XCON.log(`🔍 CONCATENATE 처리 중 인자 ${i}: "${arg}"`);
                            
                            let value;
                            try {
                                // 이미 따옴표로 둘러싸인 문자열인 경우
                                if (arg.startsWith('"') && arg.endsWith('"')) {
                                    value = arg.slice(1, -1);
                                    XCON.log(`🔍 CONCATENATE 문자열 리터럴: "${value}"`);
                                } else {
                                    // 변수나 계산 결과인 경우
                                    value = engine.getValueFromArg(arg);
                                    XCON.log(`🔍 CONCATENATE getValueFromArg 결과: "${value}"`);
                                    
                                    // 결과가 따옴표로 둘러싸인 경우 제거
                                    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
                                        value = value.slice(1, -1);
                                        XCON.log(`🔍 CONCATENATE 결과 따옴표 제거: "${value}"`);
                                    }
                                }
                                
                                result += value;
                                XCON.log(`🔍 CONCATENATE 현재까지 결과: "${result}"`);
                                
                            } catch (argError) {
                                XCON.log(`🔍 CONCATENATE 인자 처리 오류 (${i}):`, argError);
                                // 오류 발생 시 원본 값 사용 (따옴표 제거)
                                let fallbackValue = arg;
                                if (fallbackValue.startsWith('"') && fallbackValue.endsWith('"')) {
                                    fallbackValue = fallbackValue.slice(1, -1);
                                }
                                result += fallbackValue;
                                XCON.log(`🔍 CONCATENATE 오류 시 대체값 사용: "${fallbackValue}"`);
                            }
                        }
                        
                        XCON.log(`🔍 안전한 CONCATENATE 최종 결과: "${result}"`);
                        return result;
                        
                    } catch (error) {
                        XCON.log(`🔍 CONCATENATE 함수 전체 오류:`, error);
                        return "#ERROR!";
                    }
                });
                
                XCON.log('✅ 안전한 CONCATENATE 함수 개선 완료');
            }

            // 함수 등록 검증
            XCON.log('🔍 최종 함수 등록 상태 확인:');
            XCON.log('  - CONCAT:', !!engine.libraryFunctions['CONCAT']);
            XCON.log('  - CONCATENATE:', !!engine.libraryFunctions['CONCATENATE']);
            
            if (engine.libraryFunctions['CONCAT']) {
                XCON.log('  - CONCAT 함수 타입:', typeof engine.libraryFunctions['CONCAT']);
            }
            if (engine.libraryFunctions['CONCATENATE']) {
                XCON.log('  - CONCATENATE 함수 타입:', typeof engine.libraryFunctions['CONCATENATE']);
            }

            // SUM function (commonly used) - only if not already registered
            const hasSumFunction = engine.hasFunction ? engine.hasFunction('SUM') : false;

            if (!hasSumFunction) {
                engine.addFunction("SUM", function (argList) {
                    try {
                        const args = engine.splitArgsPreservingQuotedCommas ?
                            engine.splitArgsPreservingQuotedCommas(argList) :
                            argList.split(',');

                        let sum = 0;
                        for (const arg of args) {
                            // getValueFromArg를 사용하여 값을 올바르게 가져옴
                            const valueStr = engine.getValueFromArg ? 
                                engine.getValueFromArg(arg.trim()) : 
                                arg.trim();
                            const value = parseFloat(valueStr);
                            if (!isNaN(value)) {
                                sum += value;
                            }
                        }
                        return sum.toString();
                    } catch (error) {
                        return "#ERROR!";
                    }
                });
                XCON.log('✅ Additional SUM function registered');
            } else {
                XCON.log('✅ SUM function already available');
            }

        } catch (e) {
            XCON.warn('Additional function registration failed:', e.message);
        }
    }

    /**
     * Register an array of controls
     * @param {Array} controls - Array of control objects
     */
    registerControlArray(controls) {
        for (const c of controls) {
            this.registerControl(c);
        }
        this.autoCalc = true;
    }

    /**
     * Register a single control
     * @param {Object} c - Control object with name/id and text/value properties
     */
    registerControl(c) {
        // Subscribe once
        if (Object.keys(this._nameToControlMap).length === 0) {
            this.addEventListener('valueSet', this.calcQuickValueSet.bind(this));
        }

        // Use name attribute if available, otherwise use id
        const controlName = c.name || c.id;
        if (!controlName) {
            throw new Error('Control must have either name or id attribute');
        }

        // Use text property if available, otherwise use value
        const controlValue = c.text !== undefined ? c.text : c.value;

        if (this._controlModifiedFlags.has(c) || this._nameToControlMap[controlName]) {
            XCON.warn(`Control already registered: ${controlName}. Skipping registration.`);
            return; // Skip registration instead of throwing error
        }

        this._controlModifiedFlags.set(c, false);
        this._nameToControlMap[controlName.toUpperCase()] = c;

        this[controlName] = controlValue;

        // Add event listeners based on control type
        if (c.tagName === 'SELECT') {
            c.addEventListener('change', this.control_TextChanged.bind(this));
        } else if (c.tagName === 'INPUT') {
            c.addEventListener('input', this.control_TextChanged.bind(this));
        } else if (c.type === 'combobox') {
            c.addEventListener('selectedIndexChanged', this.control_TextChanged.bind(this));
        } else {
            c.addEventListener('textChanged', this.control_TextChanged.bind(this));
        }
    }

    /**
     * Handle control text changes
     * @param {Event} e - Event object
     */
    control_TextChanged(e) {
        if (this.ignoreChanges) {
            return;
        }

        const sender = e.target || e.currentTarget;
        this._controlModifiedFlags.set(sender, true);

        // Update the internal value
        const controlName = sender.name || sender.id;
        if (controlName) {
            this[controlName] = sender.value;
        }

        if (this.autoCalc) {
            this.recalculate();
        }
    }

    /**
     * Handle value set events
     * @param {Event} e - Value set event
     */
    calcQuickValueSet(e) {
        // Implementation for value set handling
        // XCON.log('Value set:', e.detail); // Commented out for performance
    }

    /**
     * Recalculate all formulas
     */
    recalculate() {
        // Implementation for recalculation
        XCON.log('Recalculating...');
    }

    // Properties
    get calcQuickID() {
        this._calcQuickID++;
        if (this._calcQuickID === Number.MAX_SAFE_INTEGER) {
            this._calcQuickID = 1;
        }
        return this._calcQuickID;
    }

    get DataStore() {
        return this._dataStore;
    }

    /**
     * Wire parent object - required by CalcEngine
     */
    wireParentObject() {
        // Implementation for CalcEngine integration
    }

    /**
     * Handle grid value changed events
     */
    grid_ValueChanged(sender, e) {
        // Handle value changed events from the grid
        XCON.log('Grid value changed:', sender, e);
    }

    /**
     * Get value by key
     * @param {string} key - The key to get value for
     * @returns {string} The value
     */
    get(key) {
        key = key.toUpperCase();

        if (this._dataStore.has(key)) {
            const fInfo = this._dataStore.get(key);
            let s = fInfo.FormulaText;

            // Check if it's a formula and needs recalculation
            const needsCalculation = s && s.length > 0 && s[0] === '=' &&
                (fInfo.calcID === null || fInfo.calcID === undefined ||
                    (this._engine.getCalcID && fInfo.calcID !== this._engine.getCalcID()));

            if (needsCalculation) {
                try {
                    if (this._engine.cell !== undefined && this._keyToRowsMap[key]) {
                        this._engine.cell = this.cellPrefix + this._keyToRowsMap[key].toString();
                    }

                    const formulaWithoutEquals = s.substring(1); // strip out formula character
                    const markedFormula = this.markKeys(formulaWithoutEquals);

                    // Try CalcEngine methods
                    let calculated = false;

                    // Use the safe parseAndCompute method instead of direct CalcEngine calls
                    const result = this.parseAndCompute(formulaWithoutEquals);
                    if (result && result !== "#ERROR!") {
                        fInfo.FormulaValue = result;
                        calculated = true;
                    }

                    // If all methods failed, set error
                    if (!calculated) {
                        fInfo.FormulaValue = "#ERROR!";
                    }
                } catch (ex) {
                    fInfo.FormulaValue = ex.message || "#ERROR!";
                }

                // Update calcID if available
                if (this._engine.getCalcID) {
                    fInfo.calcID = this._engine.getCalcID();
                }

                if (this.dispatchEvent) {
                    this.dispatchEvent(new CustomEvent('valueSet', {
                        detail: { key: key, value: fInfo.FormulaValue, action: FormulaInfoSetAction.CalculatedValueSet }
                    }));
                }
            }

            return this._dataStore.get(key).FormulaValue || "";
        } else if (this._keyToVectors[key]) {
            return this._keyToVectors[key].toString();
        } else {
            return "";
        }
    }

    /**
     * Set value by key
     * @param {string} key - The key to set value for
     * @param {string} value - The value to set
     */
    set(key, value) {
        key = key.toUpperCase();
        let s = value.toString().trim();

        if (!this._dataStore.has(key)) {
            // Create new entry
            this._dataStore.set(key, new FormulaInfo());
            this._keyToRowsMap[key] = Object.keys(this._keyToRowsMap).length + 1;
            this._rowsToKeyMap[Object.keys(this._rowsToKeyMap).length + 1] = key;
        }

        if (this._keyToVectors[key]) {
            delete this._keyToVectors[key];
        }

        const fInfo = this._dataStore.get(key);

        if (s.length > 0 && s[0] === '=') {
            fInfo.FormulaText = s;
            if (this.dispatchEvent) {
                this.dispatchEvent(new CustomEvent('valueSet', {
                    detail: { key: key, value: s, action: FormulaInfoSetAction.FormulaSet }
                }));
            }
        } else if (fInfo.FormulaValue !== s) {
            fInfo.FormulaText = "";
            fInfo.ParsedFormula = "";
            fInfo.FormulaValue = s;
            if (this.dispatchEvent) {
                this.dispatchEvent(new CustomEvent('valueSet', {
                    detail: { key: key, value: s, action: FormulaInfoSetAction.NonFormulaSet }
                }));
            }
        }

        if (this.autoCalc) {
            this.updateDependencies(key);
        }
    }

    /**
     * Mark keys in formula for processing
     * @param {string} formula - The formula to process
     * @returns {string} The processed formula
     */
    markKeys(formula) {
        // Simple approach: replace variables with their values directly
        // This avoids complex parsing and potential infinite loops

        // Create a map of all available variables
        const variables = new Map();

        // Add data store variables (get current values, not cached)
        for (const [key, fInfo] of this._dataStore) {
            if (fInfo.FormulaText && !fInfo.FormulaText.startsWith('=')) {
                // For non-formula values, use the text directly
                variables.set(key.toLowerCase(), fInfo.FormulaText);
            } else if (!fInfo.FormulaText || !fInfo.FormulaText.startsWith('=')) {
                // For simple values, use FormulaText or FormulaValue
                const value = fInfo.FormulaText || fInfo.FormulaValue;
                if (value !== undefined && value !== "") {
                    variables.set(key.toLowerCase(), value);
                }
            }
        }

        // Also check if we have updated values that haven't been processed yet
        // This ensures we get the most recent values for variable substitution
        for (const [key, fInfo] of this._dataStore) {
            if (!fInfo.FormulaText || !fInfo.FormulaText.startsWith('=')) {
                // This is a simple value, check if we have a more recent value
                const keyUpper = key.toUpperCase();
                if (this._nameToControlMap[keyUpper]) {
                    const control = this._nameToControlMap[keyUpper];
                    if (control && control.value !== undefined && control.value !== "") {
                        variables.set(key.toLowerCase(), control.value);
                    }
                }
            }
        }

        // Add control variables (get current values from DOM)
        for (const [key, control] of Object.entries(this._nameToControlMap)) {
            if (control) {
                // Get current value from the control
                let currentValue = control.value;
                if (control.tagName === 'INPUT' || control.tagName === 'TEXTAREA') {
                    currentValue = control.value;
                } else if (control.tagName === 'SELECT') {
                    currentValue = control.value;
                } else if (control.textContent !== undefined) {
                    currentValue = control.textContent;
                }

                if (currentValue !== undefined && currentValue !== "") {
                    variables.set(key.toLowerCase(), currentValue);
                }
            }
        }

        // Replace variables in formula
        // Use word boundaries to avoid partial matches
        const originalFormula = formula;
        for (const [varName, value] of variables) {
            const regex = new RegExp('\\b' + varName + '\\b', 'gi');
            if (regex.test(formula)) {
                formula = formula.replace(regex, value);
            }
        }

        // Debug log to see variable substitution
        if (originalFormula !== formula) {
            XCON.log(`Variable substitution: "${originalFormula}" -> "${formula}"`);
            XCON.log('Available variables:', Array.from(variables.entries()));
        }

        return formula;
    }



    /**
     * Update dependencies for a key
     * @param {string} key - The key that triggered the update
     */
    updateDependencies(key) {
        if (this.autoCalc) {
            const s = this.cellPrefix + this._keyToRowsMap[key].toString();
            this.setDirty();

            // Smart dependency update - only recalculate formulas that depend on this key
            const keyLower = key.toLowerCase();
            for (const [k, fInfo] of this._dataStore) {
                if (fInfo.FormulaText && fInfo.FormulaText.startsWith('=')) {
                    // Check if this formula depends on the changed key
                    const formulaLower = fInfo.FormulaText.toLowerCase();
                    const regex = new RegExp('\\b' + keyLower + '\\b');
                    if (regex.test(formulaLower)) {
                        // Clear calcID to force recalculation
                        fInfo.calcID = null;
                        this.get(k); // This will trigger recalculation
                    }
                }
            }
        }
    }

    /**
     * Force all calculations to be performed
     */
    setDirty() {
        if (this._engine && this._engine.updateCalcID) {
            this._engine.updateCalcID();
        }
    }

    /**
     * Parse and compute a formula directly
     * @param {string} formulaText - The formula to parse and compute
     * @returns {string} The computed result
     */
    parseAndCompute(formulaText) {
        XCON.log(`🔍 parseAndCompute 시작: "${formulaText}"`);
        
        if (formulaText.length > 0 && formulaText[0] === '=') {
            formulaText = formulaText.substring(1);
        }

        // First try to substitute variables
        const markedFormula = this.markKeys(formulaText);
        XCON.log(`🔍 markKeys 결과: "${markedFormula}"`);

        // Enhanced JavaScript-first approach
        // Skip CalcEngine entirely for complex formulas to avoid errors
        const hasComplexFunctions = /\b(SQRT|SIN|COS|TAN|LOG|LN|EXP|POWER)\s*\(/i.test(markedFormula);
        XCON.log(`🔍 hasComplexFunctions: ${hasComplexFunctions}`);

        if (hasComplexFunctions) {
            XCON.log('🔍 JavaScript fallback으로 직접 이동 (복잡한 함수)');
            // Skip CalcEngine and go directly to JavaScript evaluation
        } else {
            // Try CalcEngine first (with enhanced safety) for simple formulas
            XCON.log('🔍 CalcEngine 시도 중...');
            try {
                if (this._engine && this._engine.parseAndComputeFormula) {
                    // Create a safe wrapper for the formula
                    let result;
                    try {
                        XCON.log(`🔍 CalcEngine.parseAndComputeFormula("${markedFormula}") 호출`);
                        result = this._engine.parseAndComputeFormula(markedFormula);
                        XCON.log(`🔍 CalcEngine 결과:`, result, typeof result);
                    } catch (innerEx) {
                        // Any CalcEngine error triggers fallback
                        XCON.warn('🔍 CalcEngine error, falling back to JavaScript:', innerEx.message);
                        result = null;
                    }

                    // Handle different result types safely
                    if (result !== null && result !== undefined) {
                        // Convert result to string based on type
                        if (typeof result === 'string') {
                            if (result !== "invalid expression" && result !== "#ERROR!") {
                                return result;
                            }
                        } else if (typeof result === 'number' && !isNaN(result)) {
                            return result.toString();
                        } else if (typeof result === 'boolean') {
                            return result.toString();
                        } else if (result && typeof result.toString === 'function') {
                            const strResult = result.toString();
                            if (strResult !== "invalid expression" && strResult !== "#ERROR!") {
                                return strResult;
                            }
                        }
                    }
                }
            } catch (ex) {
                XCON.warn('CalcEngine failed:', ex.message);
            }
        }

        // Enhanced JavaScript fallback with comprehensive function support
        try {
            // XCON.log('JavaScript fallback processing:', markedFormula); // Reduced logging

            // Try to handle basic math functions
            let evalFormula = markedFormula;

            // Replace common functions with JavaScript equivalents
            const functionReplacements = {
                'SQRT': 'Math.sqrt',
                'ABS': 'Math.abs',
                'ROUND': 'Math.round',
                'SIN': 'Math.sin',
                'COS': 'Math.cos',
                'TAN': 'Math.tan',
                'LOG': 'Math.log10',
                'LN': 'Math.log',
                'EXP': 'Math.exp',
                'POWER': 'Math.pow',
                'MAX': 'Math.max',
                'MIN': 'Math.min'
            };

            for (const [xlFunc, jsFunc] of Object.entries(functionReplacements)) {
                const regex = new RegExp(`\\b${xlFunc}\\s*\\(`, 'gi');
                evalFormula = evalFormula.replace(regex, `${jsFunc}(`);
            }

            // Convert single = to == for comparison (but not in assignments)
            // This handles cases like IF(1=2, ...) where = should be comparison
            evalFormula = evalFormula.replace(/([^=!<>])=([^=])/g, '$1==$2');

            // XCON.log('After function replacement:', evalFormula); // Reduced logging for performance

            // Clean the formula for safe evaluation
            const cleanFormula = this.sanitizeForEval(evalFormula);
            // XCON.log('After sanitization:', cleanFormula); // Reduced logging for performance

            if (cleanFormula) {
                const result = eval(cleanFormula);
                // XCON.log('Eval result:', result, typeof result); // Reduced logging for performance

                if (typeof result === 'number' && !isNaN(result)) {
                    return result.toString();
                } else if (typeof result === 'string' && result !== '') {
                    return result;
                }
            } else {
                XCON.warn('Formula failed sanitization:', evalFormula);
            }
        } catch (evalEx) {
            XCON.warn('JavaScript eval failed:', evalEx.message);
            XCON.warn('Failed formula:', evalFormula);
        }

        return "#ERROR!";
    }

    /**
     * Sanitize formula for safe JavaScript evaluation
     * @param {string} formula - The formula to sanitize
     * @returns {string} The sanitized formula or null if unsafe
     */
    sanitizeForEval(formula) {
        // Allow basic math operations, numbers, Math functions, and ternary operators
        const safePattern = /^[\d\s+\-*/.(),A-Za-z?:><=!&|]+$/;
        if (!safePattern.test(formula)) {
            return null;
        }

        // Only allow Math.* functions and basic operations
        const allowedFunctions = /Math\.(sqrt|abs|round|sin|cos|tan|log10|log|exp|pow|max|min)/g;
        const mathFunctionCount = (formula.match(allowedFunctions) || []).length;
        const totalFunctionCount = (formula.match(/[A-Za-z]+\(/g) || []).length;

        // If there are functions that are not Math functions, reject
        if (totalFunctionCount > mathFunctionCount) {
            return null;
        }

        // Check for balanced parentheses
        let parenCount = 0;
        for (const char of formula) {
            if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            if (parenCount < 0) return null;
        }
        if (parenCount !== 0) return null;

        return formula;
    }

    /**
     * Get the calculation engine
     * @returns {CalcEngine} The engine instance
     */
    get Engine() {
        return this._engine;
    }
}

/**
 * CalcQuick - JavaScript implementation
 */
class CalcQuick extends CalcQuickBase {
    constructor(resetStaticMembers = false) {
        super(resetStaticMembers);
    }
}

/**
 * FormulaInfoHashtable class - extends Map for formula storage
 */
class FormulaInfoHashtable extends Map {
    constructor() {
        super();
    }

    get(key) {
        return super.get(key);
    }

    set(key, value) {
        return super.set(key, value);
    }
}

// FormulaInfo and RangeInfo classes are defined in calcengine.js

// Export classes for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CalcQuick,
        CalcQuickBase,
        FormulaInfoHashtable,
        FormulaInfoSetAction
    };
}