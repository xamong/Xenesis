/**
 * CalcEngine All Functions Integration
 * 모든 함수 카테고리를 통합하여 CalcEngine에 적용
 */

// 개별 함수 모듈들을 import
const CalcEngineExtensions = require('./calcengine-extensions');
const CalcEngineMathFunctions = require('./calcengine-math-functions');
const CalcEngineStatisticalFunctions = require('./calcengine-statistical-functions');
const CalcEngineTextFunctions = require('./calcengine-text-functions');
const CalcEngineDateTimeFunctions = require('./calcengine-datetime-functions');
const CalcEngineLogicalFunctions = require('./calcengine-logical-functions');
const CalcEngineLookupFunctions = require('./calcengine-lookup-functions');
const CalcEngineFinancialFunctions = require('./calcengine-financial-functions');

/**
 * CalcEngine에 모든 함수를 등록하는 함수
 * @param {CalcEngine} calcEngine - CalcEngine 인스턴스
 */
function initializeAllFunctions(calcEngine) {
    // 1. AutoGen 확장 함수들 (C# ComputeX.Xamong.cs, ComputeX.AutoGen.cs)
    new CalcEngineExtensions(calcEngine);

    // 2. 수학 함수들
    new CalcEngineMathFunctions(calcEngine);

    // 3. 통계 함수들
    new CalcEngineStatisticalFunctions(calcEngine);

    // 4. 텍스트 함수들
    new CalcEngineTextFunctions(calcEngine);

    // 5. 날짜/시간 함수들
    new CalcEngineDateTimeFunctions(calcEngine);

    // 6. 논리 함수들
    new CalcEngineLogicalFunctions(calcEngine);

    // 7. 조회 및 참조 함수들
    new CalcEngineLookupFunctions(calcEngine);

    // 8. 재무 함수들
    new CalcEngineFinancialFunctions(calcEngine);

    // 추가 함수들 직접 등록
    registerAdditionalFunctions(calcEngine);
}

/**
 * 누락된 추가 함수들 등록
 */
function registerAdditionalFunctions(calcEngine) {
    // SUMIF 함수
    calcEngine.addFunction("SUMIF", computeSumif.bind(null, calcEngine));
    
    // SUMPRODUCT 함수
    calcEngine.addFunction("SUMPRODUCT", computeSumProduct.bind(null, calcEngine));
    
    // SUMSQ 함수
    calcEngine.addFunction("SUMSQ", computeSumsq.bind(null, calcEngine));
    
    // SUM 함수
    calcEngine.addFunction("SUM", computeSum.bind(null, calcEngine));
    
    // PRODUCT 함수
    calcEngine.addFunction("PRODUCT", computeProduct.bind(null, calcEngine));
    
    // ROW 함수
    calcEngine.addFunction("ROW", computeRow.bind(null, calcEngine));
    
    // 집계 함수들
    calcEngine.addFunction("SUMX2MY2", computeSumx2my2.bind(null, calcEngine));
    calcEngine.addFunction("SUMX2PY2", computeSumx2py2.bind(null, calcEngine));
    calcEngine.addFunction("SUMXMY2", computeSumxmy2.bind(null, calcEngine));
}

// SUMIF 함수 구현
function computeSumif(calcEngine, argList) {
    const args = calcEngine.splitArgsPreservingQuotedCommas(argList);
    if (args.length !== 2 && args.length !== 3) {
        return calcEngine.FormulaErrorStrings[calcEngine.wrong_number_arguments];
    }
    
    const criteriaRange = args[0];
    let criteria = args[1];
    
    if (criteria.length < 1) {
        return "0";
    }
    
    let op = '=';
    let offset = (criteria.length > 0 && criteria[0] === calcEngine.TIC) ? 1 : 0;
    
    // 연산자 파싱
    if (criteria.substring(offset).startsWith(">=")) {
        criteria = criteria.substring(offset + 2, criteria.length - 2 * offset);
        op = '>=';
    } else if (criteria.substring(offset).startsWith("<=")) {
        criteria = criteria.substring(offset + 2, criteria.length - 2 * offset);
        op = '<=';
    } else if (criteria.substring(offset).startsWith("<")) {
        criteria = criteria.substring(offset + 1, criteria.length - 1 - 2 * offset);
        op = '<';
    } else if (criteria.substring(offset).startsWith(">")) {
        criteria = criteria.substring(offset + 1, criteria.length - 1 - 2 * offset);
        op = '>';
    } else if (criteria.substring(offset).startsWith("=")) {
        criteria = criteria.substring(offset + 1, criteria.length - 1 - 2 * offset);
    }
    
    criteria = criteria.replace(new RegExp(calcEngine.TIC, 'g'), "");
    const compare = parseFloat(criteria);
    const numer = !isNaN(compare);
    
    const sumRange = (args.length === 2) ? criteriaRange : args[2];
    const s1 = calcEngine.getCellsFromArgs(criteriaRange);
    const s2 = calcEngine.getCellsFromArgs(sumRange);
    
    let sum = 0;
    
    for (let index = 0; index < s1.length && index < s2.length; index++) {
        const s = calcEngine.getValueFromArg(s1[index]);
        const d = parseFloat(s);
        
        let match = false;
        switch (op) {
            case '=':
                match = s.replace(new RegExp(calcEngine.TIC, 'g'), "") === criteria;
                break;
            case '>=':
                if (!isNaN(d) && numer) match = d >= compare;
                break;
            case '>':
                if (!isNaN(d) && numer) match = d > compare;
                break;
            case '<':
                if (!isNaN(d) && numer) match = d < compare;
                break;
            case '<=':
                if (!isNaN(d) && numer) match = d <= compare;
                break;
        }
        
        if (match) {
            const val = calcEngine.getValueFromArg(s2[index]);
            const num = parseFloat(val);
            if (!isNaN(num)) {
                sum += num;
            }
        }
    }
    
    return sum.toString();
}

// SUM 함수 구현
function computeSum(calcEngine, range) {
    let sum = 0;
    
    calcEngine.adjustRangeArg(range);
    const ranges = calcEngine.splitArgsPreservingQuotedCommas(range);
    
    for (const r of ranges) {
        if (r.indexOf(':') > -1) {
            const cells = calcEngine.getCellsFromArgs(r);
            for (const s of cells) {
                try {
                    const s1 = calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            sum += d;
                        }
                    }
                } catch (ex) {
                    if (calcEngine.rethrowLibraryComputationExceptions && 
                        calcEngine.libraryComputationException) {
                        throw calcEngine.libraryComputationException;
                    }
                    return ex.message;
                }
            }
        } else {
            try {
                const s1 = calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        sum += d;
                    }
                }
            } catch (ex) {
                if (calcEngine.rethrowLibraryComputationExceptions && 
                    calcEngine.libraryComputationException) {
                    throw calcEngine.libraryComputationException;
                }
                return ex.message;
            }
        }
    }
    
    return sum.toString();
}

// SUMPRODUCT 함수 구현
function computeSumProduct(calcEngine, range) {
    let sum = 0;
    let count = 0;
    let vector = null;
    
    calcEngine.adjustRangeArg(range);
    const ranges = calcEngine.splitArgsPreservingQuotedCommas(range);
    
    for (const r of ranges) {
        if (r.indexOf(':') > -1) {
            const i = r.indexOf(":");
            const row1 = calcEngine.rowIndex(r.substring(0, i));
            const col1 = calcEngine.colIndex(r.substring(0, i));
            const row2 = calcEngine.rowIndex(r.substring(i + 1));
            const col2 = calcEngine.colIndex(r.substring(i + 1));
            
            if (vector === null) {
                count = (row2 - row1 + 1) * (col2 - col1 + 1);
                vector = new Array(count).fill(1);
            }
            
            const family = calcEngine.getSheetFamilyItem(calcEngine.grid);
            const s = calcEngine.getSheetTokenFromReference(r);
            const grd = (!s || s.length === 0) ? calcEngine.grid : family.TokenToParentObject[s];
            
            let idx = 0;
            for (let row = row1; row <= row2; row++) {
                for (let col = col1; col <= col2; col++) {
                    const val = calcEngine.getValueFromParentObject(grd, row, col)
                        .replace(new RegExp(calcEngine.TIC, 'g'), "");
                    const d = parseFloat(val);
                    
                    if (!isNaN(d)) {
                        vector[idx] = vector[idx] * d;
                    } else {
                        vector[idx] = 0;
                    }
                    idx++;
                }
            }
        } else {
            break;
        }
    }
    
    for (let i = 0; i < count; i++) {
        sum += vector[i];
    }
    
    return sum.toString();
}

// SUMSQ 함수 구현
function computeSumsq(calcEngine, range) {
    let sum = 0;
    
    calcEngine.adjustRangeArg(range);
    const ranges = calcEngine.splitArgsPreservingQuotedCommas(range);
    
    for (const r of ranges) {
        if (r.indexOf(':') > -1) {
            const cells = calcEngine.getCellsFromArgs(r);
            for (const s of cells) {
                try {
                    const s1 = calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            sum += d * d;
                        }
                    }
                } catch (ex) {
                    if (calcEngine.rethrowLibraryComputationExceptions && 
                        calcEngine.libraryComputationException) {
                        throw calcEngine.libraryComputationException;
                    }
                    return ex.message;
                }
            }
        } else {
            try {
                const s1 = calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        sum += d * d;
                    }
                }
            } catch (ex) {
                if (calcEngine.rethrowLibraryComputationExceptions && 
                    calcEngine.libraryComputationException) {
                    throw calcEngine.libraryComputationException;
                }
                return ex.message;
            }
        }
    }
    
    return sum.toString();
}

// PRODUCT 함수 구현
function computeProduct(calcEngine, range) {
    let prod = 1;
    let nohits = true;
    
    calcEngine.adjustRangeArg(range);
    const ranges = calcEngine.splitArgsPreservingQuotedCommas(range);
    
    for (const r of ranges) {
        if (r.indexOf(':') > -1) {
            const cells = calcEngine.getCellsFromArgs(r);
            for (const s of cells) {
                try {
                    const s1 = calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            prod *= d;
                            nohits = false;
                        }
                    }
                } catch (ex) {
                    return ex.message;
                }
            }
        } else {
            try {
                const s1 = calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        prod *= d;
                        nohits = false;
                    }
                }
            } catch (ex) {
                return ex.message;
            }
        }
    }
    
    return nohits ? "0" : prod.toString();
}

// ROW 함수 구현
function computeRow(calcEngine, arg) {
    if (!arg || arg.length === 0) {
        return calcEngine.rowIndex(calcEngine.cell).toString();
    }
    return calcEngine.rowIndex(arg).toString();
}

// SUMX2MY2 함수 구현
function computeSumx2my2(calcEngine, range) {
    const args = calcEngine.splitArgsPreservingQuotedCommas(range);
    if (args.length !== 2) {
        return calcEngine.FormulaErrorStrings[calcEngine.requires_2_args];
    }
    
    const x = calcEngine.getCellsFromArgs(args[0]);
    const y = calcEngine.getCellsFromArgs(args[1]);
    
    if (x.length !== y.length) {
        return calcEngine.FormulaErrorStrings[calcEngine.invalid_arguments];
    }
    
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
        const x1 = parseFloat(calcEngine.getValueFromArg(x[i]));
        const y1 = parseFloat(calcEngine.getValueFromArg(y[i]));
        
        if (!isNaN(x1) && !isNaN(y1)) {
            sum += x1 * x1 - y1 * y1;
        }
    }
    
    return sum.toString();
}

// SUMX2PY2 함수 구현
function computeSumx2py2(calcEngine, range) {
    const args = calcEngine.splitArgsPreservingQuotedCommas(range);
    if (args.length !== 2) {
        return calcEngine.FormulaErrorStrings[calcEngine.requires_2_args];
    }
    
    const x = calcEngine.getCellsFromArgs(args[0]);
    const y = calcEngine.getCellsFromArgs(args[1]);
    
    if (x.length !== y.length) {
        return calcEngine.FormulaErrorStrings[calcEngine.invalid_arguments];
    }
    
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
        const x1 = parseFloat(calcEngine.getValueFromArg(x[i]));
        const y1 = parseFloat(calcEngine.getValueFromArg(y[i]));
        
        if (!isNaN(x1) && !isNaN(y1)) {
            sum += x1 * x1 + y1 * y1;
        }
    }
    
    return sum.toString();
}

// SUMXMY2 함수 구현
function computeSumxmy2(calcEngine, range) {
    const args = calcEngine.splitArgsPreservingQuotedCommas(range);
    if (args.length !== 2) {
        return calcEngine.FormulaErrorStrings[calcEngine.requires_2_args];
    }
    
    const x = calcEngine.getCellsFromArgs(args[0]);
    const y = calcEngine.getCellsFromArgs(args[1]);
    
    if (x.length !== y.length) {
        return calcEngine.FormulaErrorStrings[calcEngine.invalid_arguments];
    }
    
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
        const x1 = parseFloat(calcEngine.getValueFromArg(x[i]));
        const y1 = parseFloat(calcEngine.getValueFromArg(y[i]));
        
        if (!isNaN(x1) && !isNaN(y1)) {
            sum += Math.pow(x1 - y1, 2);
        }
    }
    
    return sum.toString();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeAllFunctions,
        // 개별 클래스들도 export
        CalcEngineExtensions,
        CalcEngineMathFunctions,
        CalcEngineStatisticalFunctions,
        CalcEngineTextFunctions,
        CalcEngineDateTimeFunctions,
        CalcEngineLogicalFunctions,
        CalcEngineLookupFunctions,
        CalcEngineFinancialFunctions
    };
}