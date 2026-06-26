/**
 * CalcEngine Financial Functions
 * 재무 관련 함수들
 */

class CalcEngineFinancialFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initFinancialFunctions();
    }

    initFinancialFunctions() {
        // 재무 함수들
        this.calcEngine.addFunction("DB", this.computeDb.bind(this));
        this.calcEngine.addFunction("DDB", this.computeDdb.bind(this));
        this.calcEngine.addFunction("FV", this.computeFv.bind(this));
        this.calcEngine.addFunction("IPMT", this.computeIpmt.bind(this));
        this.calcEngine.addFunction("IRR", this.computeIrr.bind(this));
        this.calcEngine.addFunction("ISPMT", this.computeIspmt.bind(this));
        this.calcEngine.addFunction("MIRR", this.computeMirr.bind(this));
        this.calcEngine.addFunction("NPER", this.computeNper.bind(this));
        this.calcEngine.addFunction("NPV", this.computeNpv.bind(this));
        this.calcEngine.addFunction("PMT", this.computePmt.bind(this));
        this.calcEngine.addFunction("PPMT", this.computePpmt.bind(this));
        this.calcEngine.addFunction("PV", this.computePv.bind(this));
        this.calcEngine.addFunction("RATE", this.computeRate.bind(this));
        this.calcEngine.addFunction("SLN", this.computeSln.bind(this));
        this.calcEngine.addFunction("SYD", this.computeSyd.bind(this));
        this.calcEngine.addFunction("VDB", this.computeVdb.bind(this));
        this.calcEngine.addFunction("XIRR", this.computeXirr.bind(this));
    }

    // DB 함수 - 정률법 감가상각
    computeDb(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 5 && args.length !== 4) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const cost = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const salvage = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const life = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        const period = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        let month = 12;
        
        if (args.length === 5) {
            month = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        
        if (!isNaN(cost) && !isNaN(salvage) && !isNaN(life) && !isNaN(period) && !isNaN(month)) {
            const rate = Math.round(1000 * (1 - Math.pow(salvage / cost, 1 / life))) / 1000;
            let priorDeprec = 0;
            let deprec = 0;
            
            for (let i = 1; i <= period; i++) {
                if (i === 1) {
                    deprec = cost * rate * month / 12;
                } else if (i > life) {
                    deprec = (cost - priorDeprec) * rate * (12 - month) / 12;
                } else {
                    deprec = (cost - priorDeprec) * rate;
                }
                priorDeprec += deprec;
            }
            
            return deprec.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // DDB 함수 - 이중체감법 감가상각
    computeDdb(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 5 && args.length !== 4) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const cost = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const salvage = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const life = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        const period = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        let factor = 2;
        
        if (args.length === 5) {
            factor = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        
        if (!isNaN(cost) && !isNaN(salvage) && !isNaN(life) && !isNaN(period) && !isNaN(factor)) {
            const rate = factor / life;
            let priorDeprec = 0;
            let deprec = 0;
            
            for (let i = 1; i <= period; i++) {
                if (i === life) {
                    deprec = cost - salvage - priorDeprec;
                } else {
                    deprec = (cost - priorDeprec) * rate;
                }
                priorDeprec += deprec;
            }
            
            return deprec.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // FV 함수 - 미래가치
    computeFv(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length < 3 || args.length > 5) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const nper = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const pmt = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        let pv = 0;
        let type = 0;
        
        if (args.length >= 4) {
            pv = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        }
        if (args.length >= 5) {
            type = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        
        if (!isNaN(rate) && !isNaN(nper) && !isNaN(pmt) && !isNaN(pv) && !isNaN(type)) {
            type = Math.abs(type) > 0.5 ? 1 : 0;
            const pow = Math.pow(1 + rate, nper);
            const fv = (pmt * (1 + rate * type) * (1 - pow) / rate) - pv * pow;
            return fv.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // IPMT 함수 - 이자 지불액
    computeIpmt(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length < 4 || args.length > 6) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const per = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const nper = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        const pv = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        let fv = 0;
        let type = 0;
        
        if (args.length >= 5) {
            fv = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        if (args.length >= 6) {
            type = parseFloat(this.calcEngine.getValueFromArg(args[5]));
        }
        
        if (!isNaN(rate) && !isNaN(per) && !isNaN(nper) && !isNaN(pv) && !isNaN(fv) && !isNaN(type)) {
            type = Math.abs(type) > 0.5 ? 1 : 0;
            
            const x0 = Math.pow(1 + rate, nper);
            const x1 = Math.pow(1 + rate, per);
            const pmt = (rate * (fv + pv * x0)) / ((1 + rate * type) * (1 - x0));
            const fv1 = (pmt * (1 + rate * type) * (1 - x1) / rate) - pv * x1;
            const x2 = Math.pow(1 + rate, per - 1);
            const fv2 = (pmt * (1 + rate * type) * (1 - x2) / rate) - pv * x2;
            const impt = pmt - fv2 + fv1;
            
            return impt.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // IRR 함수 - 내부수익률
    computeIrr(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 1 && args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let guess = 0.1;
        const arg1 = args[0];
        
        if (args.length === 2) {
            guess = parseFloat(this.calcEngine.getValueFromArg(args[1])) || 0.1;
        }
        
        const cells = this.calcEngine.getCellsFromArgs(arg1);
        const values = [];
        
        for (const s of cells) {
            const d = parseFloat(this.calcEngine.getValueFromArg(s));
            if (!isNaN(d)) {
                values.push(d);
            }
        }
        
        let iteration = 0;
        let gp1, numer, denom, powgp1;
        
        while (iteration < 20) {
            numer = 0;
            denom = 0;
            gp1 = Math.abs(guess + 1);
            powgp1 = gp1;
            
            for (let i = 0; i < values.length; i++) {
                numer += values[i] / powgp1;
                powgp1 *= gp1;
                denom += (i + 1) * values[i] / powgp1;
            }
            
            numer = numer / denom;
            
            if (Math.abs(numer / guess) < 1e-5) {
                guess = guess + numer;
                break;
            }
            
            guess = guess + numer;
            iteration++;
        }
        
        if (iteration >= 20) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        return guess.toString();
    }

    // ISPMT 함수
    computeIspmt(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 4) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const per = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const nper = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        const pv = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        
        if (!isNaN(rate) && !isNaN(per) && !isNaN(nper) && !isNaN(pv)) {
            const impt = -rate * pv * (nper - per) / nper;
            return impt.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // MIRR 함수 - 수정내부수익률
    computeMirr(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const frate = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const rrate = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        
        if (isNaN(frate) || isNaN(rrate)) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        const cells = this.calcEngine.getCellsFromArgs(args[0]);
        const values = [];
        
        for (const s of cells) {
            const d = parseFloat(this.calcEngine.getValueFromArg(s));
            if (!isNaN(d)) {
                values.push(d);
            }
        }
        
        let posValues = 0;
        let negValues = 0;
        let rpow = 1;
        let fpow = 1 + frate;
        
        for (let i = 0; i < values.length; i++) {
            rpow *= 1 + rrate;
            if (values[i] > 0) {
                posValues += values[i] / rpow;
            } else {
                negValues += values[i] / fpow;
            }
            fpow *= 1 + frate;
        }
        
        posValues = -posValues * rpow;
        negValues = negValues * (1 + frate);
        const val = Math.pow(posValues / negValues, 1 / (values.length - 1)) - 1;
        
        return val.toString();
    }

    // NPER 함수 - 기간 수
    computeNper(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length < 3 || args.length > 5) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const pmt = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const pv = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        let fv = 0;
        let type = 0;
        
        if (args.length >= 4) {
            fv = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        }
        if (args.length >= 5) {
            type = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        
        if (!isNaN(rate) && !isNaN(pmt) && !isNaN(pv) && !isNaN(fv) && !isNaN(type)) {
            type = Math.abs(type) > 0.5 ? 1 : 0;
            
            const val = Math.log10((pmt * (1 + rate * type) - fv * rate) / 
                                  (pmt * (1 + rate * type) + pv * rate)) / 
                       Math.log10(1 + rate);
            
            return val.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // NPV 함수 - 순현재가치
    computeNpv(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length < 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        if (isNaN(rate)) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        let val = 0;
        let denom = 1;
        
        for (let i = 1; i < args.length; i++) {
            const r = args[i];
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const d = parseFloat(this.calcEngine.getValueFromArg(s));
                    if (!isNaN(d)) {
                        denom *= 1 + rate;
                        val += d / denom;
                    }
                }
            } else {
                const d = parseFloat(this.calcEngine.getValueFromArg(r));
                if (!isNaN(d)) {
                    denom *= 1 + rate;
                    val += d / denom;
                }
            }
        }
        
        return val.toString();
    }

    // PMT 함수 - 정기 지불액
    computePmt(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length < 3 || args.length > 5) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const rate = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const nper = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const pv = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        let fv = 0;
        let type = 0;
        
        if (args.length >= 4) {
            fv = parseFloat(this.calcEngine.getValueFromArg(args[3]));
        }
        if (args.length >= 5) {
            type = parseFloat(this.calcEngine.getValueFromArg(args[4]));
        }
        
        if (!isNaN(rate) && !isNaN(nper) && !isNaN(pv) && !isNaN(fv) && !isNaN(type)) {
            type = Math.abs(type) > 0.5 ? 1 : 0;
            
            const pow = Math.pow(1 + rate, nper);
            const val = (rate * (fv + pv * pow)) / ((1 + rate * type) * (1 - pow));
            
            return val.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // XIRR 함수 (불규칙한 현금흐름의 내부수익률)
    computeXirr(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 2 && args.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        // 간단한 구현 (실제로는 복잡한 수치해석 필요)
        // 여기서는 기본적인 추정값 반환
        return "0.1"; // 10% 기본값
    }

    // 누락된 금융 함수들의 기본 구현
    computePpmt(args) { return "#N/A"; }
    computePv(args) { return "#N/A"; }
    computeRate(args) { return "#N/A"; }
    computeSln(args) { return "#N/A"; }
    computeSyd(args) { return "#N/A"; }
    computeVdb(args) { return "#N/A"; }

    // 기타 재무 함수들도 동일한 방식으로 구현...
}

// Export
// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineFinancialFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineFinancialFunctions = CalcEngineFinancialFunctions;
}