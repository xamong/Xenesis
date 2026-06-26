/**
 * CalcEngine Text Functions
 * 텍스트/문자열 관련 함수들
 */

class CalcEngineTextFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initTextFunctions();
    }

    initTextFunctions() {
        // 텍스트 함수들
        this.calcEngine.addFunction("CHAR", this.computeChar.bind(this));
        this.calcEngine.addFunction("CONCATENATE", this.computeConcatenate.bind(this));
        this.calcEngine.addFunction("CONCAT", this.computeConcatenate.bind(this));
        this.calcEngine.addFunction("DOLLAR", this.computeDollar.bind(this));
        this.calcEngine.addFunction("EXACT", this.computeExact.bind(this));
        this.calcEngine.addFunction("FIND", this.computeFind.bind(this));
        this.calcEngine.addFunction("FIXED", this.computeFixed.bind(this));
        this.calcEngine.addFunction("LEFT", this.computeLeft.bind(this));
        this.calcEngine.addFunction("LEN", this.computeLen.bind(this));
        this.calcEngine.addFunction("LOWER", this.computeLower.bind(this));
        this.calcEngine.addFunction("MID", this.computeMid.bind(this));
        // PROPER 함수는 CalcEngineExtensions의 CAPITAL 함수와 동일하므로 여기서는 제외
        this.calcEngine.addFunction("REPLACE", this.computeSubstitute.bind(this)); // Substitute와 유사
        this.calcEngine.addFunction("RIGHT", this.computeRight.bind(this));
        this.calcEngine.addFunction("SUBSTITUTE", this.computeSubstitute.bind(this));
        this.calcEngine.addFunction("TEXT", this.computeText.bind(this));
        this.calcEngine.addFunction("TRIM", this.computeTrim.bind(this));
        this.calcEngine.addFunction("UPPER", this.computeUpper.bind(this));
        this.calcEngine.addFunction("VALUE", this.computeValue.bind(this));
    }

    // CHAR 함수
    computeChar(arg) {
        const s = this.calcEngine.getValueFromArg(arg);
        const i = parseInt(s);
        if (!isNaN(i) && i > 0 && i < 256) {
            return String.fromCharCode(i);
        }
        return "#VALUE!";
    }

    // CONCATENATE 함수 (공통 함수 사용)
    computeConcatenate(range) {
        return this.safeExecute('CONCATENATE', () => {
            XCON.log(`🔍 CONCATENATE 함수 호출, range: "${range}"`);
            
            const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
            XCON.log(`🔍 CONCATENATE splitArgs 결과:`, args);
            
            const values = this.safeGetMultipleArgs(args, 'CONCATENATE');
            const result = values.join('');
            
            XCON.log(`🔍 CONCATENATE 최종 결과: "${result}"`);
            return result;
        });
    }

    // DOLLAR 함수 (안전한 버전)
    computeDollar(args) {
        try {
            const argsArray = this.calcEngine.splitArgsPreservingQuotedCommas(args);
            
            let s1, s2 = "2";
            
            // 첫 번째 인자 (숫자) 안전하게 처리
            try {
                const arg1 = argsArray[0].trim();
                if (arg1.startsWith('"') && arg1.endsWith('"')) {
                    s1 = arg1.slice(1, -1);
                } else {
                    s1 = this.calcEngine.getValueFromArg(arg1);
                    if (typeof s1 === 'string' && s1.startsWith('"') && s1.endsWith('"')) {
                        s1 = s1.slice(1, -1);
                    }
                }
            } catch (e) {
                s1 = argsArray[0].trim();
                if (s1.startsWith('"') && s1.endsWith('"')) {
                    s1 = s1.slice(1, -1);
                }
            }
            
            // 두 번째 인자 (소수점 자리수) 안전하게 처리
            if (argsArray.length >= 2) {
                try {
                    const arg2 = argsArray[1].trim();
                    if (arg2.startsWith('"') && arg2.endsWith('"')) {
                        s2 = arg2.slice(1, -1);
                    } else {
                        s2 = this.calcEngine.getValueFromArg(arg2);
                        if (typeof s2 === 'string' && s2.startsWith('"') && s2.endsWith('"')) {
                            s2 = s2.slice(1, -1);
                        }
                    }
                } catch (e) {
                    s2 = argsArray[1].trim();
                    if (s2.startsWith('"') && s2.endsWith('"')) {
                        s2 = s2.slice(1, -1);
                    }
                }
            }
            
            const number = parseFloat(s1) || 0;
            let decimals = parseFloat(s2);
            
            if (isNaN(decimals)) {
                decimals = 2;
            }
            
            // 통화 형식으로 포맷
            const options = {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            };
            
            return number.toLocaleString('en-US', options);
            
        } catch (error) {
            XCON.log(`🔍 DOLLAR 함수 오류:`, error);
            return "#ERROR!";
        }
    }

    // EXACT 함수 (공통 함수 사용)
    computeExact(range) {
        return this.safeExecute('EXACT', () => {
            this.calcEngine.adjustRangeArg(range);
            const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
            
            if (args.length !== 2) {
                return this.calcEngine.FormulaErrorStrings ? 
                    this.calcEngine.FormulaErrorStrings[this.calcEngine.requires_2_args] : 
                    "#ERROR!";
            }
            
            const [s1Raw, s2Raw] = this.safeGetMultipleArgs(args, 'EXACT');
            
            // 숫자 변환 시도
            let s1 = s1Raw, s2 = s2Raw;
            const d1 = parseFloat(s1);
            if (!isNaN(d1)) {
                s1 = d1.toString();
            }
            
            const d2 = parseFloat(s2);
            if (!isNaN(d2)) {
                s2 = d2.toString();
            }
            
            return s1 === s2 ? 
                (this.calcEngine.TRUEVALUESTR || "TRUE") : 
                (this.calcEngine.FALSEVALUESTR || "FALSE");
        });
    }

    // FIND 함수 (공통 함수 사용)
    computeFind(arg) {
        return this.safeExecute('FIND', () => {
            const args = this.calcEngine.splitArgsPreservingQuotedCommas(arg);
            if (args.length !== 2 && args.length !== 3) {
                return this.calcEngine.FormulaErrorStrings ? 
                    this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments] : 
                    "#ERROR!";
            }
            
            const values = this.safeGetMultipleArgs(args, 'FIND');
            const lookFor = this.stripTics0(values[0]);
            const lookIn = this.stripTics0(values[1]);
            
            let start = 1;
            if (args.length === 3) {
                const parsed = parseInt(values[2]);
                if (!isNaN(parsed)) {
                    start = parsed;
                }
            }
            
            if (start <= 0 || start > lookIn.length) {
                return "#VALUE!";
            }
            
            const loc = lookIn.indexOf(lookFor, start - 1);
            if (loc < 0) {
                return "#VALUE!";
            }
            
            return (loc + 1).toString();
        });
    }

    // FIXED 함수
    computeFixed(args) {
        const argsArray = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        const s1 = this.calcEngine.getValueFromArg(argsArray[0]);
        let s2 = "2";
        let s3 = "FALSE";
        
        if (argsArray.length > 1) {
            s2 = argsArray[1];
        }
        if (argsArray.length > 2) {
            s3 = argsArray[2];
        }
        
        s2 = this.calcEngine.getValueFromArg(s2);
        s3 = this.calcEngine.getValueFromArg(s3);
        
        const number = parseFloat(s1) || 0;
        let decimals = parseFloat(s2);
        if (isNaN(decimals)) {
            decimals = 2;
        }
        
        let no_commas = false;
        const no_commas_flag = parseFloat(s3);
        if (!isNaN(no_commas_flag)) {
            no_commas = no_commas_flag !== 0;
        } else {
            if (s3.toUpperCase() === this.calcEngine.FALSEVALUESTR) {
                no_commas = false;
            } else if (s3.toUpperCase() === this.calcEngine.TRUEVALUESTR) {
                no_commas = true;
            } else {
                return "#NAME?";
            }
        }
        
        const options = {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            useGrouping: !no_commas
        };
        
        return number.toLocaleString('en-US', options);
    }

    // LEFT 함수
    computeLeft(range) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        if (args.length !== 1 && args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const value = this.calcEngine.getValueFromArg(args[0]);
        let text = String(value || '');
        
        // 따옴표 제거
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        
        // TIC 문자 처리 (기존 로직 유지)
        const hasTics = text.startsWith(this.calcEngine.TIC) && text.endsWith(this.calcEngine.TIC);
        
        const s2 = (args.length === 2) ? args[1] : "1";
        const len = parseInt(this.calcEngine.computedValue(s2)) + (hasTics ? 1 : 0);
        
        const actualLen = (text.length >= len) ? len : text.length;
        text = text.substring(0, actualLen);
        
        if (hasTics && !text.endsWith(this.calcEngine.TIC)) {
            text = text + this.calcEngine.TIC;
        }
        
        return text;
    }

    // LEN 함수
    computeLen(range) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        if (args.length !== 1) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const value = this.calcEngine.getValueFromArg(args[0]);
        let text = String(value || '');
        
        // 따옴표 제거
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        
        // TIC 문자 처리 (기존 로직 유지)
        const hasTics = text.startsWith(this.calcEngine.TIC) && text.endsWith(this.calcEngine.TIC);
        
        return (hasTics ? text.length - 2 : text.length).toString();
    }

    // LOWER 함수
    computeLower(args) {
        const value = this.calcEngine.getValueFromArg(args);
        let text = String(value || '');
        // 따옴표 제거
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        return text.toLowerCase();
    }

    // MID 함수
    computeMid(range) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        if (args.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let text = this.calcEngine.getValueFromArg(args[0]);
        const startPos = parseInt(this.calcEngine.getValueFromArg(args[1]));
        const length = parseInt(this.calcEngine.getValueFromArg(args[2]));
        
        // 문자열 리터럴에서 따옴표 제거
        if (typeof text === 'string' && text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        
        if (isNaN(startPos) || isNaN(length) || startPos < 1 || length < 0) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        // JavaScript는 0-based index이므로 1을 빼줌
        const start = startPos - 1;
        const result = text.substring(start, start + length);
        
        return result;
    }



    // SUBSTITUTE 함수 (안전한 버전)
    computeSubstitute(range) {
        try {
            const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
            if (args.length !== 3 && args.length !== 4) {
                return this.calcEngine.FormulaErrorStrings ? 
                    this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments] : 
                    "#ERROR!";
            }
            
            let s1, s2, s3;
            
            // 첫 번째 인자 (원본 텍스트) 안전하게 처리
            try {
                const arg1 = args[0].trim();
                if (arg1.startsWith('"') && arg1.endsWith('"')) {
                    s1 = arg1.slice(1, -1);
                } else {
                    s1 = this.calcEngine.getValueFromArg(arg1);
                    if (typeof s1 === 'string' && s1.startsWith('"') && s1.endsWith('"')) {
                        s1 = s1.slice(1, -1);
                    }
                }
                s1 = this.stripTics0(s1);
            } catch (e) {
                s1 = this.stripTics0(args[0].trim());
                if (s1.startsWith('"') && s1.endsWith('"')) {
                    s1 = s1.slice(1, -1);
                }
            }
            
            // 두 번째 인자 (찾을 텍스트) 안전하게 처리
            try {
                const arg2 = args[1].trim();
                if (arg2.startsWith('"') && arg2.endsWith('"')) {
                    s2 = arg2.slice(1, -1);
                } else {
                    s2 = this.calcEngine.getValueFromArg(arg2);
                    if (typeof s2 === 'string' && s2.startsWith('"') && s2.endsWith('"')) {
                        s2 = s2.slice(1, -1);
                    }
                }
                s2 = this.stripTics0(s2);
            } catch (e) {
                s2 = this.stripTics0(args[1].trim());
                if (s2.startsWith('"') && s2.endsWith('"')) {
                    s2 = s2.slice(1, -1);
                }
            }
            
            // 세 번째 인자 (대체할 텍스트) 안전하게 처리
            try {
                const arg3 = args[2].trim();
                if (arg3.startsWith('"') && arg3.endsWith('"')) {
                    s3 = arg3.slice(1, -1);
                } else {
                    s3 = this.calcEngine.getValueFromArg(arg3);
                    if (typeof s3 === 'string' && s3.startsWith('"') && s3.endsWith('"')) {
                        s3 = s3.slice(1, -1);
                    }
                }
                s3 = this.stripTics0(s3);
            } catch (e) {
                s3 = this.stripTics0(args[2].trim());
                if (s3.startsWith('"') && s3.endsWith('"')) {
                    s3 = s3.slice(1, -1);
                }
            }
            
            if (args.length === 3) {
                // 모든 항목 대체
                s1 = s1.replace(new RegExp(this.escapeRegExp(s2), 'g'), s3);
            } else {
                // 네 번째 인자 (몇 번째 항목) 안전하게 처리
                let s4;
                try {
                    const arg4 = args[3].trim();
                    if (arg4.startsWith('"') && arg4.endsWith('"')) {
                        s4 = arg4.slice(1, -1);
                    } else {
                        s4 = this.calcEngine.getValueFromArg(arg4);
                    }
                } catch (e) {
                    s4 = args[3].trim();
                }
                
                const d = parseFloat(s4);
                if (!isNaN(d)) {
                    let count = Math.floor(d);
                    let loc = -1;
                    while (count > 0 && (loc = s1.indexOf(s2, loc + 1)) > -1) {
                        count--;
                    }
                    if (count === 0 && loc > -1) {
                        s1 = s1.substring(0, loc) + s3 + s1.substring(loc + s2.length);
                    }
                }
            }
            
            return (this.calcEngine.TIC || '"') + s1 + (this.calcEngine.TIC || '"');
            
        } catch (error) {
            XCON.log(`🔍 SUBSTITUTE 함수 오류:`, error);
            return "#ERROR!";
        }
    }

    // TEXT 함수
    computeText(range) {
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        const s1 = this.calcEngine.getValueFromArg(ranges[0]);
        const s2 = ranges[1].replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        
        const d = parseFloat(s1);
        if (!isNaN(d)) {
            if (s2.length > 0 && /[MDYST]/i.test(s2)) {
                // 날짜 형식
                const s2Format = s2.replace(/m/g, 'M').replace(/Y/g, 'y').replace(/D/g, 'd');
                const dt = this.fromOADate(d);
                return dt.toString(s2Format);
            } else {
                // 숫자 형식
                return this.formatNumber(d, s2);
            }
        }
        
        return this.calcEngine.TIC + s1 + this.calcEngine.TIC;
    }

    // TRIM 함수
    computeTrim(args) {
        let text = this.calcEngine.getValueFromArg(args);
        
        // 문자열 리터럴에서 따옴표 제거
        if (typeof text === 'string' && text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        
        // 앞뒤 공백 제거 및 중복 공백 제거
        let result = text.trim();
        let len = 0;
        while (result.length !== len) {
            len = result.length;
            result = result.replace(/  /g, " ");
        }
        
        return result;
    }

    // UPPER 함수
    computeUpper(args) {
        XCON.log(`🔍 UPPER 함수 호출, args:`, args, typeof args);
        
        const value = this.calcEngine.getValueFromArg(args);
        XCON.log(`🔍 getValueFromArg 결과:`, value, typeof value);
        
        let text = String(value || '');
        // 따옴표 제거
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        
        const result = text.toUpperCase();
        XCON.log(`🔍 UPPER 함수 결과:`, result, typeof result);
        return result;
    }



    // VALUE 함수
    computeValue(range) {
        return this.calcEngine.getValueFromArg(range);
    }

    // 헬퍼 함수들
    
    /**
     * 안전하게 인자 값을 가져오는 공통 함수
     * @param {string} arg - 처리할 인자
     * @param {number} index - 인자 인덱스 (디버깅용)
     * @param {string} functionName - 함수명 (디버깅용)
     * @returns {string} 처리된 값
     */
    safeGetArgValue(arg, index = 0, functionName = 'Unknown') {
        try {
            const trimmedArg = arg.trim();
            XCON.log(`🔍 ${functionName} 처리 중 인자 ${index}: "${trimmedArg}"`);
            
            let value;
            
            // 이미 따옴표로 둘러싸인 문자열인 경우 직접 처리
            if (trimmedArg.startsWith('"') && trimmedArg.endsWith('"')) {
                value = trimmedArg.slice(1, -1);
                XCON.log(`🔍 ${functionName} 문자열 리터럴: "${value}"`);
            } else {
                // 변수나 계산 결과인 경우 CalcEngine을 통해 처리
                value = this.calcEngine.getValueFromArg(trimmedArg);
                XCON.log(`🔍 ${functionName} getValueFromArg 결과: "${value}"`);
                
                // 결과가 따옴표로 둘러싸인 경우 제거
                if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                    XCON.log(`🔍 ${functionName} 결과 따옴표 제거: "${value}"`);
                }
            }
            
            return value;
            
        } catch (argError) {
            XCON.log(`🔍 ${functionName} 인자 처리 오류 (${index}):`, argError);
            
            // 오류 발생 시 원본 값 사용 (따옴표 제거)
            let fallbackValue = arg.trim();
            if (fallbackValue.startsWith('"') && fallbackValue.endsWith('"')) {
                fallbackValue = fallbackValue.slice(1, -1);
            }
            XCON.log(`🔍 ${functionName} 오류 시 대체값 사용: "${fallbackValue}"`);
            return fallbackValue;
        }
    }

    /**
     * 안전하게 여러 인자들을 처리하는 공통 함수
     * @param {Array} args - 인자 배열
     * @param {string} functionName - 함수명 (디버깅용)
     * @returns {Array} 처리된 값들의 배열
     */
    safeGetMultipleArgs(args, functionName = 'Unknown') {
        const results = [];
        for (let i = 0; i < args.length; i++) {
            const value = this.safeGetArgValue(args[i], i, functionName);
            results.push(value);
        }
        return results;
    }

    /**
     * 안전한 함수 실행을 위한 래퍼
     * @param {string} functionName - 함수명
     * @param {Function} func - 실행할 함수
     * @returns {*} 함수 실행 결과 또는 "#ERROR!"
     */
    safeExecute(functionName, func) {
        try {
            return func();
        } catch (error) {
            XCON.log(`🔍 ${functionName} 함수 전체 오류:`, error);
            return "#ERROR!";
        }
    }

    stripTics0(s) {
        if (!s) return "";
        
        if (s.length > 1 && s[0] === this.calcEngine.TIC && s[s.length - 1] === this.calcEngine.TIC) {
            return s.substring(1, s.length - 1);
        }
        return s;
    }

    isSeparatorInTIC(text) {
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === this.calcEngine.TIC) {
                inQuotes = !inQuotes;
            } else if (text[i] === this.calcEngine.ParseArgumentSeparator && inQuotes) {
                return true;
            }
        }
        return false;
    }

    getStringArray(text) {
        const result = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i] === this.calcEngine.TIC) {
                inQuotes = !inQuotes;
                current += text[i];
            } else if (text[i] === this.calcEngine.ParseArgumentSeparator && !inQuotes) {
                if (current.length > 0) {
                    result.push(current);
                    current = "";
                }
            } else {
                current += text[i];
            }
        }
        
        if (current.length > 0) {
            result.push(current);
        }
        
        return result;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // RIGHT 함수
    computeRight(range) {
        XCON.log(`🔍 RIGHT 함수 호출, range:`, range);
        
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        XCON.log(`🔍 splitArgs 결과:`, args);
        
        if (args.length !== 1 && args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const value = this.calcEngine.getValueFromArg(args[0]);
        XCON.log(`🔍 getValueFromArg 결과:`, value, typeof value);
        
        let text = String(value || '');
        // 따옴표 제거
        if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
        }
        XCON.log(`🔍 따옴표 제거 후:`, text, `길이: ${text.length}`);
        
        const numCharsArg = args.length > 1 ? args[1] : "1";
        XCON.log(`🔍 numCharsArg:`, numCharsArg);
        
        const numChars = parseInt(this.calcEngine.computedValue(numCharsArg));
        XCON.log(`🔍 numChars:`, numChars);
        
        if (numChars < 0) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        const result = text.slice(-numChars);
        XCON.log(`🔍 slice(-${numChars}) 결과:`, result, `길이: ${result.length}`);
        
        return result;
    }

    fromOADate(oaDate) {
        const baseDate = new Date(1899, 11, 30);
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        return new Date(baseDate.getTime() + oaDate * millisecondsPerDay);
    }

    formatNumber(number, format) {
        // 간단한 숫자 포맷팅 구현
        if (format === "0") {
            return Math.round(number).toString();
        } else if (format.match(/0\.0+/)) {
            const decimals = format.split('.')[1].length;
            return number.toFixed(decimals);
        }
        return number.toString();
    }
}

// Export
// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineTextFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineTextFunctions = CalcEngineTextFunctions;
}