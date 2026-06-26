/**
 * CalcEngine Logical Functions
 * 논리 관련 함수들
 */

class CalcEngineLogicalFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initLogicalFunctions();
    }

    initLogicalFunctions() {
        // 논리 함수들
        this.calcEngine.addFunction("AND", this.computeAnd.bind(this));
        this.calcEngine.addFunction("FALSE", this.computeFalse.bind(this));
        this.calcEngine.addFunction("IF", this.computeIf.bind(this));
        this.calcEngine.addFunction("ISBLANK", this.computeIsBlank.bind(this));
        this.calcEngine.addFunction("ISERR", this.computeIsErr.bind(this));
        this.calcEngine.addFunction("ISERROR", this.computeIsError.bind(this));
        this.calcEngine.addFunction("ISLOGICAL", this.computeIsLogical.bind(this));
        this.calcEngine.addFunction("ISNA", this.computeIsNA.bind(this));
        this.calcEngine.addFunction("ISNONTEXT", this.computeIsNonText.bind(this));
        this.calcEngine.addFunction("ISNUMBER", this.computeIsNumber.bind(this));
        this.calcEngine.addFunction("ISTEXT", this.computeIsText.bind(this));
        this.calcEngine.addFunction("NOT", this.computeNot.bind(this));
        this.calcEngine.addFunction("OR", this.computeOr.bind(this));
        this.calcEngine.addFunction("TRUE", this.computeTrue.bind(this));
    }

    // AND 함수
    computeAnd(range) {
        try {
            XCON.log(`🔍 AND 함수 호출, range: "${range}"`);
            const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
            XCON.log(`🔍 AND splitArgs 결과:`, ranges);
            
            for (const r of ranges) {
                let conditionResult;
                const trimmedR = r.trim();
                
                XCON.log(`🔍 AND 처리 중인 인자: "${trimmedR}"`);
                
                // 직접적인 TRUE/FALSE 값 처리
                if (trimmedR === "TRUE" || trimmedR === this.calcEngine.TRUEVALUESTR) {
                    XCON.log(`🔍 AND: TRUE 값 감지`);
                    continue; // TRUE는 AND에서 계속 진행
                } else if (trimmedR === "FALSE" || trimmedR === this.calcEngine.FALSEVALUESTR) {
                    XCON.log(`🔍 AND: FALSE 값 감지, FALSE 반환`);
                    return this.calcEngine.FALSEVALUESTR;
                } else {
                    // 조건식을 안전하게 평가
                    try {
                        XCON.log(`🔍 AND: 조건식 평가 시작 "${trimmedR}"`);
                        conditionResult = this.calcEngine.computedValue(this.calcEngine.parse(trimmedR));
                        XCON.log(`🔍 AND: 조건식 결과 "${conditionResult}"`);
                    } catch (parseEx) {
                        XCON.log(`🔍 AND: 조건식 파싱 오류, getValueFromArg 시도:`, parseEx);
                        conditionResult = this.calcEngine.getValueFromArg(trimmedR);
                        XCON.log(`🔍 AND: getValueFromArg 결과 "${conditionResult}"`);
                    }
                    
                    // 결과 평가
                    if (conditionResult === this.calcEngine.FALSEVALUESTR || conditionResult === "FALSE") {
                        XCON.log(`🔍 AND: 결과가 FALSE, FALSE 반환`);
                        return this.calcEngine.FALSEVALUESTR;
                    }
                    
                    const d = parseFloat(conditionResult);
                    if (!isNaN(d) && d === 0) {
                        XCON.log(`🔍 AND: 결과가 0, FALSE 반환`);
                        return this.calcEngine.FALSEVALUESTR;
                    }
                    
                    XCON.log(`🔍 AND: 조건 통과`);
                }
            }
            
            XCON.log(`🔍 AND: 모든 조건 통과, TRUE 반환`);
            return this.calcEngine.TRUEVALUESTR;
            
        } catch (ex) {
            XCON.log(`🔍 AND 함수 오류:`, ex);
            return "#ERROR!";
        }
    }

    // FALSE 함수
    computeFalse(empty) {
        XCON.log(`🔍 FALSE 함수 호출`);
        XCON.log(`🔍 FALSE 반환값:`, this.calcEngine.FALSEVALUESTR);
        return this.calcEngine.FALSEVALUESTR;
    }

    // IF 함수
    computeIf(args) {
        XCON.log(`🔍 IF 함수 호출, args: "${args}"`);
        const s = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        XCON.log(`🔍 splitArgsPreservingQuotedCommas 결과:`, s);
        
        // IF 함수는 최소 2개, 최대 3개의 인자가 필요합니다
        if (s.length < 2 || s.length > 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        try {
            // 첫 번째 인자(조건)를 평가
            const conditionStr = s[0].trim();
            XCON.log(`🔍 조건식 원본: "${conditionStr}"`);
            
            let isTrue = false;
            
            // TRUE/FALSE 문자열 직접 처리
            if (conditionStr === "TRUE" || conditionStr === this.calcEngine.TRUEVALUESTR) {
                isTrue = true;
                XCON.log(`🔍 TRUE 문자열 직접 처리: ${isTrue}`);
            } else if (conditionStr === "FALSE" || conditionStr === this.calcEngine.FALSEVALUESTR) {
                isTrue = false;
                XCON.log(`🔍 FALSE 문자열 직접 처리: ${isTrue}`);
            } else if (this.isComparisonExpression(conditionStr)) {
                // 비교 연산자 직접 처리
                isTrue = this.evaluateComparison(conditionStr);
                XCON.log(`🔍 비교 연산자 직접 처리: ${conditionStr} = ${isTrue}`);
            } else {
                // 일반적인 값 평가
                try {
                    const conditionResult = this.calcEngine.computedValue(this.calcEngine.parse(conditionStr));
                    XCON.log(`🔍 일반 조건식 계산 결과: "${conditionResult}" (타입: ${typeof conditionResult})`);
                    
                    if (conditionResult === this.calcEngine.TRUEVALUESTR || conditionResult === "TRUE") {
                        isTrue = true;
                    } else if (conditionResult === this.calcEngine.FALSEVALUESTR || conditionResult === "FALSE") {
                        isTrue = false;
                    } else {
                        const d = parseFloat(conditionResult);
                        if (!isNaN(d)) {
                            isTrue = (d !== 0);
                        } else {
                            // 문자열의 경우 빈 문자열이면 false, 그 외는 true
                            isTrue = (conditionResult && conditionResult.length > 0 && conditionResult !== "invalid expression");
                        }
                    }
                } catch (parseError) {
                    XCON.log(`🔍 파싱 오류, 문자열로 처리:`, parseError);
                    isTrue = (conditionStr && conditionStr.length > 0);
                }
            }
            
            XCON.log(`🔍 최종 조건 평가: ${isTrue}`);
            
            if (isTrue) {
                let result = this.calcEngine.getValueFromArg(s[1]);
                // 문자열 리터럴에서 따옴표 제거
                if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
                    result = result.slice(1, -1);
                }
                return result;
            } else {
                if (s.length === 3) {
                    let result = this.calcEngine.getValueFromArg(s[2]);
                    // 문자열 리터럴에서 따옴표 제거
                    if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
                        result = result.slice(1, -1);
                    }
                    return result;
                } else {
                    return this.calcEngine.FALSEVALUESTR; // Excel's default if no false_value is provided
                }
            }
        } catch (ex) {
            XCON.log(`🔍 IF 함수 오류:`, ex);
            return "#ERROR!";
        }
    }

    // 비교 연산자 표현식인지 확인
    isComparisonExpression(expr) {
        return /^[^<>=]*[<>=]+[^<>=]*$/.test(expr.trim());
    }

    // 비교 연산자 직접 평가
    evaluateComparison(expr) {
        try {
            const trimmed = expr.trim();
            
            // = 연산자
            if (trimmed.includes('=')) {
                const parts = trimmed.split('=');
                if (parts.length === 2) {
                    const left = parseFloat(parts[0].trim());
                    const right = parseFloat(parts[1].trim());
                    if (!isNaN(left) && !isNaN(right)) {
                        return left === right;
                    }
                }
            }
            
            // > 연산자
            if (trimmed.includes('>')) {
                const parts = trimmed.split('>');
                if (parts.length === 2) {
                    const left = parseFloat(parts[0].trim());
                    const right = parseFloat(parts[1].trim());
                    if (!isNaN(left) && !isNaN(right)) {
                        return left > right;
                    }
                }
            }
            
            // < 연산자
            if (trimmed.includes('<')) {
                const parts = trimmed.split('<');
                if (parts.length === 2) {
                    const left = parseFloat(parts[0].trim());
                    const right = parseFloat(parts[1].trim());
                    if (!isNaN(left) && !isNaN(right)) {
                        return left < right;
                    }
                }
            }
            
            return false;
        } catch (e) {
            XCON.log(`🔍 비교 연산자 평가 오류:`, e);
            return false;
        }
    }

    // ISBLANK 函数
    computeIsBlank(args) {
        const value = this.calcEngine.getValueFromArg(args);
        return value === "" ? this.calcEngine.TRUEVALUESTR : this.calcEngine.FALSEVALUESTR;
    }

    // ISERR 함数
    computeIsErr(range) {
        const value = this.calcEngine.getValueFromArg(range).toUpperCase().replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        
        if ((value.startsWith("NAN") || 
             value.startsWith("-NAN") || 
             value.startsWith("INFINITY") || 
             value.startsWith("-INFINITY") || 
             value.startsWith("#") || 
             value.startsWith("n#")) && 
            !value.startsWith("#N/A")) {
            return this.calcEngine.TRUEVALUESTR;
        }
        
        return this.calcEngine.FALSEVALUESTR;
    }

    // ISERROR 函数
    computeIsError(range) {
        let value = range;
        if (range.length > 0 && !range.startsWith("#")) {
            value = this.calcEngine.getValueFromArg(range);
        }
        
        value = value.toUpperCase().replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        
        if (value.startsWith("NAN") || 
            value.startsWith("-NAN") || 
            value.startsWith("INFINITY") || 
            value.startsWith("-INFINITY") || 
            value.startsWith("#") || 
            value.startsWith("n#")) {
            return this.calcEngine.TRUEVALUESTR;
        }
        
        return this.calcEngine.FALSEVALUESTR;
    }

    // ISLOGICAL 函数
    computeIsLogical(args) {
        const value = this.calcEngine.getValueFromArg(args).toUpperCase();
        
        if (value === this.calcEngine.FALSEVALUESTR || value === this.calcEngine.TRUEVALUESTR) {
            return this.calcEngine.TRUEVALUESTR;
        }
        
        return this.calcEngine.FALSEVALUESTR;
    }

    // ISNA 函数
    computeIsNA(args) {
        const value = this.calcEngine.getValueFromArg(args).toUpperCase();
        
        if (value.startsWith("#N/A")) {
            return this.calcEngine.TRUEVALUESTR;
        }
        
        return this.calcEngine.FALSEVALUESTR;
    }

    // ISNONTEXT 函数
    computeIsNonText(args) {
        return this.computeIsText(args) === this.calcEngine.TRUEVALUESTR ? 
               this.calcEngine.FALSEVALUESTR : this.calcEngine.TRUEVALUESTR;
    }

    // ISNUMBER 函数
    computeIsNumber(range) {
        const value = this.calcEngine.getValueFromArg(range);
        const d = parseFloat(value);
        
        return !isNaN(d) ? this.calcEngine.TRUEVALUESTR : this.calcEngine.FALSEVALUESTR;
    }

    // ISTEXT 函数
    computeIsText(args) {
        const s = this.calcEngine.getValueFromArg(args);
        const d = parseFloat(s);
        
        return (s.length > 0 && isNaN(d)) ? this.calcEngine.TRUEVALUESTR : this.calcEngine.FALSEVALUESTR;
    }

    // NOT 함수
    computeNot(args) {
        try {
            XCON.log(`🔍 NOT 함수 호출, args: "${args}"`);
            
            const conditionStr = args.trim();
            XCON.log(`🔍 조건식 원본: "${conditionStr}"`);
            
            let isTrue = false;
            
            // TRUE/FALSE 문자열 직접 처리
            if (conditionStr === "TRUE" || conditionStr === this.calcEngine.TRUEVALUESTR) {
                isTrue = true;
                XCON.log(`🔍 TRUE 문자열 직접 처리: ${isTrue}`);
            } else if (conditionStr === "FALSE" || conditionStr === this.calcEngine.FALSEVALUESTR) {
                isTrue = false;
                XCON.log(`🔍 FALSE 문자열 직접 처리: ${isTrue}`);
            } else if (this.isComparisonExpression(conditionStr)) {
                // 비교 연산자 직접 처리
                isTrue = this.evaluateComparison(conditionStr);
                XCON.log(`🔍 비교 연산자 직접 처리: ${conditionStr} = ${isTrue}`);
            } else {
                // 일반적인 값 평가
                try {
                    const conditionResult = this.calcEngine.computedValue(this.calcEngine.parse(conditionStr));
                    XCON.log(`🔍 일반 조건식 계산 결과: "${conditionResult}" (타입: ${typeof conditionResult})`);
                    
                    if (conditionResult === this.calcEngine.TRUEVALUESTR || conditionResult === "TRUE") {
                        isTrue = true;
                    } else if (conditionResult === this.calcEngine.FALSEVALUESTR || conditionResult === "FALSE") {
                        isTrue = false;
                    } else {
                        const d = parseFloat(conditionResult);
                        if (!isNaN(d)) {
                            isTrue = (d !== 0);
                        } else {
                            // 문자열의 경우 빈 문자열이면 false, 그 외는 true
                            isTrue = (conditionResult && conditionResult.length > 0 && conditionResult !== "invalid expression");
                        }
                    }
                } catch (parseError) {
                    XCON.log(`🔍 파싱 오류, 문자열로 처리:`, parseError);
                    isTrue = (conditionStr && conditionStr.length > 0);
                }
            }
            
            XCON.log(`🔍 조건 평가 결과: ${isTrue}`);
            
            // NOT 연산: true면 false, false면 true 반환
            const result = isTrue ? this.calcEngine.FALSEVALUESTR : this.calcEngine.TRUEVALUESTR;
            XCON.log(`🔍 NOT 최종 결과: ${result}`);
            return result;
        } catch (ex) {
            XCON.log(`🔍 NOT 함수 오류:`, ex);
            return "#ERROR!";
        }
    }

    // OR 함수
    computeOr(range) {
        try {
            XCON.log(`🔍 OR 함수 호출, range: "${range}"`);
            const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
            XCON.log(`🔍 OR 분리된 인자들:`, ranges);
            
            for (const r of ranges) {
                const conditionStr = r.trim();
                XCON.log(`🔍 OR 조건 평가: "${conditionStr}"`);
                
                let isTrue = false;
                
                if (r.indexOf(':') > -1) {
                    // 범위 처리 (일반적으로 사용되지 않음)
                    const cells = this.calcEngine.getCellsFromArgs(r);
                    for (const s of cells) {
                        const s1 = this.calcEngine.getValueFromArg(s);
                        if (s1 === this.calcEngine.TRUEVALUESTR || s1 === "TRUE") {
                            XCON.log(`🔍 OR 범위에서 TRUE 발견: ${s1}`);
                            return this.calcEngine.TRUEVALUESTR;
                        }
                        const d = parseFloat(s1);
                        if (!isNaN(d) && d !== 0) {
                            XCON.log(`🔍 OR 범위에서 0이 아닌 값 발견: ${d}`);
                            return this.calcEngine.TRUEVALUESTR;
                        }
                    }
                } else {
                    // TRUE/FALSE 문자열 직접 처리
                    if (conditionStr === "TRUE" || conditionStr === this.calcEngine.TRUEVALUESTR) {
                        XCON.log(`🔍 OR TRUE 문자열 직접 처리`);
                        return this.calcEngine.TRUEVALUESTR;
                    } else if (conditionStr === "FALSE" || conditionStr === this.calcEngine.FALSEVALUESTR) {
                        XCON.log(`🔍 OR FALSE 문자열 직접 처리`);
                        isTrue = false;
                    } else if (this.isComparisonExpression(conditionStr)) {
                        // 비교 연산자 직접 처리
                        isTrue = this.evaluateComparison(conditionStr);
                        XCON.log(`🔍 OR 비교 연산자 직접 처리: ${conditionStr} = ${isTrue}`);
                        if (isTrue) {
                            return this.calcEngine.TRUEVALUESTR;
                        }
                    } else {
                        // 일반적인 값 평가
                        try {
                            const conditionResult = this.calcEngine.computedValue(this.calcEngine.parse(conditionStr));
                            XCON.log(`🔍 OR 일반 조건식 계산 결과: "${conditionResult}"`);
                            
                            if (conditionResult === this.calcEngine.TRUEVALUESTR || conditionResult === "TRUE") {
                                XCON.log(`🔍 OR 계산 결과가 TRUE`);
                                return this.calcEngine.TRUEVALUESTR;
                            }
                            
                            const d = parseFloat(conditionResult);
                            if (!isNaN(d) && d !== 0) {
                                XCON.log(`🔍 OR 계산 결과가 0이 아닌 숫자: ${d}`);
                                return this.calcEngine.TRUEVALUESTR;
                            }
                        } catch (parseError) {
                            XCON.log(`🔍 OR 파싱 오류:`, parseError);
                            // 파싱 실패 시 문자열로 처리
                            if (conditionStr && conditionStr.length > 0) {
                                XCON.log(`🔍 OR 문자열로 TRUE 처리`);
                                return this.calcEngine.TRUEVALUESTR;
                            }
                        }
                    }
                }
            }
            
            XCON.log(`🔍 OR 모든 조건이 FALSE, 최종 결과: FALSE`);
            return this.calcEngine.FALSEVALUESTR;
            
        } catch (ex) {
            XCON.log(`🔍 OR 함수 오류:`, ex);
            return "#ERROR!";
        }
    }

    // TRUE 함수
    computeTrue(empty) {
        XCON.log(`🔍 TRUE 함수 호출`);
        XCON.log(`🔍 TRUE 반환값:`, this.calcEngine.TRUEVALUESTR);
        return this.calcEngine.TRUEVALUESTR;
    }
}

// Export
// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineLogicalFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineLogicalFunctions = CalcEngineLogicalFunctions;
}