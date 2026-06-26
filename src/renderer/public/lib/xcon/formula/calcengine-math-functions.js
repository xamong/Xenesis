/**
 * CalcEngine Math Functions
 * 수학 관련 함수들
 */

class CalcEngineMathFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initMathFunctions();
    }

    initMathFunctions() {
        // 기본 수학 함수들
        this.calcEngine.addFunction("ABS", this.computeAbs.bind(this));
        this.calcEngine.addFunction("ACOS", this.computeAcos.bind(this));
        this.calcEngine.addFunction("ACOSH", this.computeAcosh.bind(this));
        this.calcEngine.addFunction("ASIN", this.computeAsin.bind(this));
        this.calcEngine.addFunction("ASINH", this.computeAsinh.bind(this));
        this.calcEngine.addFunction("ATAN", this.computeAtan.bind(this));
        this.calcEngine.addFunction("ATAN2", this.computeAtan2.bind(this));
        this.calcEngine.addFunction("ATANH", this.computeAtanh.bind(this));
        this.calcEngine.addFunction("CEILING", this.computeCeiling.bind(this));
        this.calcEngine.addFunction("COS", this.computeCos.bind(this));
        this.calcEngine.addFunction("COSH", this.computeCosh.bind(this));
        this.calcEngine.addFunction("DEGREES", this.computeDegrees.bind(this));
        this.calcEngine.addFunction("EVEN", this.computeEven.bind(this));
        this.calcEngine.addFunction("EXP", this.computeExp.bind(this));
        this.calcEngine.addFunction("FACT", this.computeFact.bind(this));
        this.calcEngine.addFunction("FLOOR", this.computeFloor.bind(this));
        this.calcEngine.addFunction("INT", this.computeInt.bind(this));
        this.calcEngine.addFunction("LN", this.computeLn.bind(this));
        this.calcEngine.addFunction("LOG", this.computeLog.bind(this));
        this.calcEngine.addFunction("LOG10", this.computeLog10.bind(this));
        this.calcEngine.addFunction("MOD", this.computeMod.bind(this));
        this.calcEngine.addFunction("ODD", this.computeOdd.bind(this));
        this.calcEngine.addFunction("PI", this.computePI.bind(this));
        this.calcEngine.addFunction("POW", this.computePow.bind(this));
        this.calcEngine.addFunction("RADIANS", this.computeRadians.bind(this));
        this.calcEngine.addFunction("RAND", this.computeRand.bind(this));
        this.calcEngine.addFunction("ROUND", this.computeRound.bind(this));
        this.calcEngine.addFunction("ROUNDDOWN", this.computeRounddown.bind(this));
        this.calcEngine.addFunction("ROUNDUP", this.computeRoundup.bind(this));
        this.calcEngine.addFunction("SIGN", this.computeSign.bind(this));
        this.calcEngine.addFunction("SIN", this.computeSin.bind(this));
        this.calcEngine.addFunction("SINH", this.computeSinh.bind(this));
        this.calcEngine.addFunction("SQRT", this.computeSqrt.bind(this));
        this.calcEngine.addFunction("TAN", this.computeTan.bind(this));
        this.calcEngine.addFunction("TANH", this.computeTanh.bind(this));
        this.calcEngine.addFunction("TRUNC", this.computeTrunc.bind(this));

        // 추가 엑셀 함수
        this.calcEngine.addFunction("QUOTIENT", this.computeQuotient.bind(this));     
    }

    // 계승 테이블 (0! ~ 12!)
    factorialTable = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

    // ABS 함수
    computeAbs(args) {
        return this.computeMath(args, Math.abs);
    }

    // ACOS 함수
    computeAcos(args) {
        return this.computeMath(args, Math.acos);
    }

    // ACOSH 함수
    computeAcosh(args) {
        const z = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(z) && z >= 1) {
            return (Math.log(z + Math.sqrt(z * z - 1))).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // ASIN 함수
    computeAsin(args) {
        return this.computeMath(args, Math.asin);
    }

    // ASINH 함수
    computeAsinh(args) {
        const z = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(z)) {
            return (Math.sign(z) * Math.log(Math.abs(z) + Math.sqrt(z * z + 1))).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // ATAN 함수
    computeAtan(args) {
        return this.computeMath(args, Math.atan);
    }

    // ATAN2 함수
    computeAtan2(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.requires_2_args];
        }
        
        const x = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const y = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        
        if (!isNaN(x) && !isNaN(y)) {
            return Math.atan2(y, x).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // ATANH 함수
    computeAtanh(args) {
        const z = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(z) && Math.abs(z) < 1) {
            return (0.5 * Math.sign(z) * Math.log((1 + Math.abs(z)) / (1 - Math.abs(z)))).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // CEILING 함수
    computeCeiling(args) {
        const range = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        
        // 1개 파라미터인 경우 (기본 significance = 1)
        if (range.length === 1) {
            const d1 = parseFloat(this.calcEngine.getValueFromArg(range[0]));
            if (!isNaN(d1)) {
                return Math.ceil(d1).toString();
            }
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        // 2개 파라미터인 경우
        if (range.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const d1 = parseFloat(this.calcEngine.getValueFromArg(range[0]));
        const d2 = parseFloat(this.calcEngine.getValueFromArg(range[1]));
        
        if (!isNaN(d1) && !isNaN(d2)) {
            if (d1 === 0) return "0";
            if (d1 * d2 <= 0) {
                if (this.calcEngine.excelLikeComputations) {
                    if (d1 * d2 === 0) return "0";
                    return "#NUM!";
                }
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            
            let d3 = Math.floor(d1 / d2) * d2;
            if (d2 > 0) {
                while (d3 < d1) {
                    d3 += d2;
                }
            } else {
                while (d3 > d1) {
                    d3 += d2;
                }
            }
            return d3.toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // COS 함수
    computeCos(args) {
        return this.computeMath(args, Math.cos);
    }

    // COSH 함수
    computeCosh(args) {
        return this.computeMath(args, Math.cosh);
    }

    // DEGREES 함수
    computeDegrees(args) {
        const radians = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(radians)) {
            return (180 * radians / Math.PI).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // EVEN 함수
    computeEven(args) {
        const number = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(number)) {
            const sgn = Math.sign(number);
            let n = Math.abs(number);
            if (Math.floor(n) !== n) {
                n = Math.floor(n + 1);
            }
            if ((n % 2) === 1) {
                return (sgn * (n + 1)).toString();
            } else {
                return (sgn * n).toString();
            }
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // EXP 함수
    computeExp(args) {
        return this.computeMath(args, Math.exp);
    }

    // FACT 함수
    computeFact(args) {
        const number = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(number) && number >= 0) {
            const x = Math.floor(number);
            let fact = 0;
            if (x > 12) {
                fact = this.factorialTable[12];
                for (let i = 13; i <= x; i++) {
                    fact *= i;
                }
            } else {
                fact = this.factorialTable[x];
            }
            return fact.toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // FLOOR 함수
    computeFloor(args) {
        const range = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        
        // 1개 파라미터인 경우 (기본 significance = 1)
        if (range.length === 1) {
            const d1 = parseFloat(this.calcEngine.getValueFromArg(range[0]));
            if (!isNaN(d1)) {
                return Math.floor(d1).toString();
            }
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        // 2개 파라미터인 경우
        if (range.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const d1 = parseFloat(this.calcEngine.getValueFromArg(range[0]));
        const d2 = parseFloat(this.calcEngine.getValueFromArg(range[1]));
        
        if (!isNaN(d1) && !isNaN(d2)) {
            if (d1 === 0) return "0";
            if (d1 * d2 <= 0) {
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            
            let d3 = Math.ceil(d1 / d2) * d2;
            if (d2 > 0) {
                while (d3 > d1) {
                    d3 -= d2;
                }
            } else {
                while (d3 < d1) {
                    d3 -= d2;
                }
            }
            return d3.toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // INT 함수
    computeInt(range) {
        const value = this.calcEngine.getValueFromArg(range);
        const d = parseFloat(value);
        if (!isNaN(d)) {
            const d1 = (d < 0) ? -1 : 1;
            const d2 = (d < 0) ? 1 : 0;
            return (d1 * Math.floor(d2 + Math.abs(d))).toString();
        }
        return "0";
    }

    // LN 함수
    computeLn(args) {
        return this.computeMath(args, Math.log);
    }

    // LOG 함수
    computeLog(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length > 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        if (args.length === 2) {
            const x = parseFloat(this.calcEngine.getValueFromArg(args[0]));
            const b = parseFloat(this.calcEngine.getValueFromArg(args[1]));
            if (!isNaN(x) && !isNaN(b)) {
                return (Math.log10(x) / Math.log10(b)).toString();
            }
        }
        
        return this.computeMath(argList, Math.log10);
    }

    // LOG10 함수
    computeLog10(args) {
        return this.computeMath(args, Math.log10);
    }

    // MOD 함수
    computeMod(range) {
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        const s1 = this.calcEngine.getValueFromArg(ranges[0]);
        const s2 = this.calcEngine.getValueFromArg(ranges[1]);
        return (parseInt(s1) % parseInt(s2)).toString();
    }

    // ODD 함수
    computeOdd(args) {
        const number = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(number)) {
            const sgn = Math.sign(number);
            let n = Math.abs(number);
            if (Math.floor(n) !== n) {
                n = Math.floor(n + 1);
            }
            if ((n % 2) === 0) {
                return (sgn * (n + 1)).toString();
            } else {
                return (sgn * n).toString();
            }
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // PI 함수
    computePI(args) {
        return Math.PI.toString();
    }

    // POW 함수
    computePow(args) {
        const s = this.calcEngine.getCellsFromArgs(args);
        if (s.length === 2) {
            const s1 = this.calcEngine.getValueFromArg(s[0]);
            const s2 = this.calcEngine.getValueFromArg(s[1]);
            const d1 = parseFloat(s1);
            const d2 = parseFloat(s2);
            if (!isNaN(d1) && !isNaN(d2)) {
                return Math.pow(d1, d2).toString();
            }
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.requires_2_args];
    }

    // RADIANS 함수
    computeRadians(args) {
        const degrees = parseFloat(this.calcEngine.getValueFromArg(args));
        if (!isNaN(degrees)) {
            return (Math.PI * degrees / 180).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // RAND 함수
    computeRand(args) {
        if (!this.calcEngine.rand) {
            this.calcEngine.rand = Math.random;
        }
        return Math.random().toFixed(15);
    }

    // ROUND 함수
    computeRound(argList) {
        XCON.log(`🔍 ROUND 함수 호출, argList: "${argList}"`);
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        XCON.log(`🔍 splitArgs 결과:`, args, `개수: ${args.length}`);
        
        if (args.length === 1) {
            XCON.log(`🔍 단일 인자로 Math.round 사용`);
            return this.computeMath(argList, Math.round);
        }
        
        if (args.length !== 2) {
            XCON.log(`🔍 인자 개수 오류: ${args.length}`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        const numStr = this.calcEngine.getValueFromArg(args[0]);
        const digStr = this.calcEngine.getValueFromArg(args[1]);
        XCON.log(`🔍 numStr: "${numStr}", digStr: "${digStr}"`);
        
        const x = parseFloat(numStr);
        const digits = parseInt(digStr);
        XCON.log(`🔍 x: ${x}, digits: ${digits}`);
        
        if (isNaN(x) || isNaN(digits)) {
            XCON.log(`🔍 파싱 오류: x=${x}, digits=${digits}`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        let result;
        if (digits >= 0) {
            const multiplier = Math.pow(10, digits);
            result = (Math.round(x * multiplier) / multiplier).toString();
            XCON.log(`🔍 양수 digits, multiplier: ${multiplier}, 결과: ${result}`);
        } else {
            const multiplier = Math.pow(10, -digits);
            result = (Math.round(x / multiplier) * multiplier).toString();
            XCON.log(`🔍 음수 digits, multiplier: ${multiplier}, 결과: ${result}`);
        }
        
        return result;
    }

    // ROUNDDOWN 함수
    computeRounddown(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        
        if (args.length === 1) {
            let x = parseFloat(this.calcEngine.getValueFromArg(argList)) || 0;
            x = x - 0.4999999999 * Math.sign(x);
            return this.computeRound(x.toString());
        } else if (args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        let x = parseFloat(this.calcEngine.getValueFromArg(args[0])) || 0;
        const digits = parseFloat(this.calcEngine.getValueFromArg(args[1])) || 0;
        x = x - 0.4999999999 * Math.pow(10, -digits) * Math.sign(x);
        return this.computeRound(`${x},${digits}`);
    }

    // ROUNDUP 함수
    computeRoundup(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        
        if (args.length === 1) {
            let x = parseFloat(this.calcEngine.getValueFromArg(argList)) || 0;
            if (x > 0) {
                x += 0.4999999999;
            } else if (x < 0) {
                x -= 0.4999999999;
            }
            return Math.round(x).toString();
        } else if (args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        let x = parseFloat(this.calcEngine.getValueFromArg(args[0])) || 0;
        let digits = Math.ceil(parseFloat(this.calcEngine.getValueFromArg(args[1])) || 0);
        
        if (digits >= 0) {
            if (x > 0) {
                x += 0.4999999999 / Math.pow(10, digits);
            } else if (x < 0) {
                x -= 0.4999999999 / Math.pow(10, digits);
            }
            const factor = Math.pow(10, digits);
            x = Math.round(x * factor) / factor;
        } else {
            if (x > 0) {
                x = (x / Math.pow(10, -digits)) + 0.49999;
            } else if (x < 0) {
                x = (x / Math.pow(10, -digits)) - 0.49999;
            }
            x = Math.round(x) * Math.pow(10, -digits);
        }
        
        return x.toString();
    }

    // SIGN 함수
    computeSign(args) {
        let d;
        let s1;
        
        if (args.length > 0 && !isNaN(args[0]) && args.indexOf(this.calcEngine.ParseArgumentSeparator) === -1) {
            d = parseFloat(args);
            if (!isNaN(d)) {
                return Math.sign(d).toString();
            }
        } else if (args.length > 0 && (args[0] === this.calcEngine.BMARKER || args[0] === 'u' || args[0] === 'n' || args.match(/[+\-*/^&<>=]/))) {
            const argsProcessed = args.replace(/{/g, '(').replace(/}/g, ')');
            s1 = this.calcEngine.computedValue(argsProcessed);
            d = parseFloat(s1);
            if (!isNaN(d)) {
                return Math.sign(d).toString();
            }
        } else {
            const cells = this.calcEngine.getCellsFromArgs(args);
            for (const s of cells) {
                s1 = this.calcEngine.getValueFromArg(s);
                if (s1.length > 0) {
                    d = parseFloat(s1);
                    if (!isNaN(d)) {
                        return Math.sign(d).toString();
                    }
                }
            }
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_Math_argument];
    }

    // SIN 함수
    computeSin(args) {
        return this.computeMath(args, Math.sin);
    }

    // SINH 함수
    computeSinh(args) {
        return this.computeMath(args, Math.sinh);
    }

    // SQRT 함수
    computeSqrt(args) {
        return this.computeMath(args, Math.sqrt);
    }

    // TAN 함수
    computeTan(args) {
        return this.computeMath(args, Math.tan);
    }

    // TANH 함수
    computeTanh(args) {
        return this.computeMath(args, Math.tanh);
    }

    // TRUNC 함수
    computeTrunc(range) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        let digits = 0;
        
        if (args.length === 2) {
            digits = parseInt(this.calcEngine.getValueFromArg(args[1])) || 0;
        }
        
        const value = this.calcEngine.getValueFromArg(args[0]);
        const d = parseFloat(value);
        
        if (!isNaN(d)) {
            const normalizer = Math.pow(10, digits);
            const d1 = (d < 0) ? -1 : 1;
            const result = d1 * Math.floor(normalizer * Math.abs(d)) / normalizer;
            
            if (digits === 0) {
                return result.toFixed(0);
            } else {
                return result.toFixed(digits);
            }
        }
        
        return "0";
    }

    // === 추가 Excel 함수 ===

    computeQuotient(args) {
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (ranges.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const s1 = this.calcEngine.getValueFromArg(ranges[0]);
        const s2 = this.calcEngine.getValueFromArg(ranges[1]);
        
        const n1 = parseInt(s1);
        const n2 = parseInt(s2);
        
        if (n2 === 0) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.div_zero];
        }
        
        return Math.floor(n1 / n2).toString();
    }

    // 공통 수학 함수 처리
    computeMath(args, mathFunc) {
        const value = this.calcEngine.getValueFromArg(args);
        const num = parseFloat(value);
        if (!isNaN(num)) {
            return mathFunc(num).toString();
        }
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_Math_argument];
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineMathFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineMathFunctions = CalcEngineMathFunctions;
}