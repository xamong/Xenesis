/**
 * CalcEngine Statistical Functions
 * 통계 관련 함수들
 */

class CalcEngineStatisticalFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initStatisticalFunctions();
    }

    initStatisticalFunctions() {
        // 통계 함수들
        this.calcEngine.addFunction("AVEDEV", this.computeAvedev.bind(this));
        this.calcEngine.addFunction("AVERAGE", this.computeAvg.bind(this));
        this.calcEngine.addFunction("AVERAGEA", this.computeAveragea.bind(this));
        this.calcEngine.addFunction("AVG", this.computeAvg.bind(this));
        this.calcEngine.addFunction("BINOMDIST", this.computeBinomdist.bind(this));
        this.calcEngine.addFunction("CHIDIST", this.computeChidist.bind(this));
        this.calcEngine.addFunction("CHIINV", this.computeChiinv.bind(this));
        this.calcEngine.addFunction("CHITEST", this.computeChitest.bind(this));
        this.calcEngine.addFunction("CONFIDENCE", this.computeConfidence.bind(this));
        this.calcEngine.addFunction("CORREL", this.computeCorrel.bind(this));
        this.calcEngine.addFunction("COUNT", this.computeCount.bind(this));
        this.calcEngine.addFunction("COUNTA", this.computeCounta.bind(this));
        this.calcEngine.addFunction("COUNTBLANK", this.computeCountblank.bind(this));
        this.calcEngine.addFunction("COUNTIF", this.computeCountif.bind(this));
        this.calcEngine.addFunction("COVAR", this.computeCovar.bind(this));
        this.calcEngine.addFunction("CRITBINOM", this.computeCritbinom.bind(this));
        this.calcEngine.addFunction("DEVSQ", this.computeDevsq.bind(this));
        this.calcEngine.addFunction("EXPONDIST", this.computeExpondist.bind(this));
        this.calcEngine.addFunction("FDIST", this.computeFdist.bind(this));
        this.calcEngine.addFunction("FINV", this.computeFinv.bind(this));
        this.calcEngine.addFunction("FISHER", this.computeFisher.bind(this));
        this.calcEngine.addFunction("FISHERINV", this.computeFisherinv.bind(this));
        this.calcEngine.addFunction("FORECAST", this.computeForecast.bind(this));
        this.calcEngine.addFunction("GAMMADIST", this.computeGammadist.bind(this));
        this.calcEngine.addFunction("GAMMAINV", this.computeGammainv.bind(this));
        this.calcEngine.addFunction("GAMMALN", this.computeGammaln.bind(this));
        this.calcEngine.addFunction("GEOMEAN", this.computeGeomean.bind(this));
        this.calcEngine.addFunction("HARMEAN", this.computeHarmean.bind(this));
        this.calcEngine.addFunction("HYPGEOMDIST", this.computeHypgeomdist.bind(this));
        this.calcEngine.addFunction("INTERCEPT", this.computeIntercept.bind(this));
        this.calcEngine.addFunction("KURT", this.computeKurt.bind(this));
        this.calcEngine.addFunction("LARGE", this.computeLarge.bind(this));
        this.calcEngine.addFunction("LOGINV", this.computeLoginv.bind(this));
        this.calcEngine.addFunction("LOGNORMDIST", this.computeLognormdist.bind(this));
        this.calcEngine.addFunction("MAX", this.computeMax.bind(this));
        this.calcEngine.addFunction("MAXA", this.computeMaxa.bind(this));
        this.calcEngine.addFunction("MEDIAN", this.computeMedian.bind(this));
        this.calcEngine.addFunction("MIN", this.computeMin.bind(this));
        this.calcEngine.addFunction("MINA", this.computeMina.bind(this));
        this.calcEngine.addFunction("MODE", this.computeMode.bind(this));
        this.calcEngine.addFunction("NEGBINOMDIST", this.computeNegbinomdist.bind(this));
        this.calcEngine.addFunction("NORMDIST", this.computeNormdist.bind(this));
        this.calcEngine.addFunction("NORMINV", this.computeNorminv.bind(this));
        this.calcEngine.addFunction("NORMSDIST", this.computeNormsDist.bind(this));
        this.calcEngine.addFunction("NORMSINV", this.computeNormsInv.bind(this));
        this.calcEngine.addFunction("PEARSON", this.computePearson.bind(this));
        this.calcEngine.addFunction("PERCENTILE", this.computePercentile.bind(this));
        this.calcEngine.addFunction("PERCENTRANK", this.computePercentrank.bind(this));
        this.calcEngine.addFunction("PERMUT", this.computePermut.bind(this));
        this.calcEngine.addFunction("POISSON", this.computePoisson.bind(this));
        this.calcEngine.addFunction("PROB", this.computeProb.bind(this));
        this.calcEngine.addFunction("QUARTILE", this.computeQuartile.bind(this));
        this.calcEngine.addFunction("RANK", this.computeRank.bind(this));
        this.calcEngine.addFunction("RSQ", this.computeRsq.bind(this));
        this.calcEngine.addFunction("SKEW", this.computeSkew.bind(this));
        this.calcEngine.addFunction("SLOPE", this.computeSlope.bind(this));
        this.calcEngine.addFunction("SMALL", this.computeSmall.bind(this));
        this.calcEngine.addFunction("STANDARDIZE", this.computeStandardize.bind(this));
        this.calcEngine.addFunction("STDEV", this.computeStdev.bind(this));
        this.calcEngine.addFunction("STDEVA", this.computeStdeva.bind(this));
        this.calcEngine.addFunction("STDEVP", this.computeStdevp.bind(this));
        this.calcEngine.addFunction("STDEVPA", this.computeStdevpa.bind(this));
        this.calcEngine.addFunction("STEYX", this.computeSteyx.bind(this));
        this.calcEngine.addFunction("TRIMMEAN", this.computeTrimmean.bind(this));
        this.calcEngine.addFunction("VAR", this.computeVar.bind(this));
        this.calcEngine.addFunction("VARA", this.computeVara.bind(this));
        this.calcEngine.addFunction("VARP", this.computeVarp.bind(this));
        this.calcEngine.addFunction("VARPA", this.computeVarpa.bind(this));
        this.calcEngine.addFunction("WEIBULL", this.computeWeibull.bind(this));
        this.calcEngine.addFunction("ZTEST", this.computeZtest.bind(this));
    }

    // AVEDEV 함수 - 평균 편차
    computeAvedev(range) {
        let sum = 0;
        const x = [];
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            sum += d;
                            x.push(d);
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        sum += d;
                        x.push(d);
                    }
                }
            }
        }
        
        if (x.length > 0) {
            const ave = sum / x.length;
            sum = 0;
            for (let i = 0; i < x.length; i++) {
                sum += Math.abs(x[i] - ave);
            }
            sum = sum / x.length;
        }
        
        return sum.toString();
    }

    // AVERAGE 함수
    computeAvg(range) {
        let sum = 0;
        let count = 0;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            sum += d;
                            count++;
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        sum += d;
                        count++;
                    }
                }
            }
        }
        
        if (count > 0) {
            sum = sum / count;
        }
        
        return sum.toString();
    }

    // AVERAGEA 함수
    computeAveragea(range) {
        let sum = 0;
        let count = 0;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        count++;
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            sum += d;
                        } else if (this.calcEngine.excelLikeComputations && s1.toLowerCase() === "true") {
                            sum += 1;
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    count++;
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        sum += d;
                    } else if (this.calcEngine.excelLikeComputations && s1.toLowerCase() === "true") {
                        sum += 1;
                    }
                }
            }
        }
        
        if (count > 0) {
            sum = sum / count;
        }
        
        return sum.toString();
    }

    // COUNT 함수
    computeCount(range) {
        let count = 0;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            count++;
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        count++;
                    }
                }
            }
        }
        
        return count.toString();
    }

    // COUNTA 함수
    computeCounta(range) {
        let count = 0;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        count++;
                    }
                }
            } else if (r === "" && this.calcEngine.excelLikeComputations) {
                count++;
            } else if (/^[a-zA-Z]/.test(r) && this.calcEngine.excelLikeComputations) {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    count++;
                }
            } else {
                if (r.length > 0) {
                    count++;
                }
            }
        }
        
        return count.toString();
    }

    // COUNTBLANK 함수
    computeCountblank(range) {
        let count = 0;
        const TICS2 = this.calcEngine.TIC + this.calcEngine.TIC;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length === 0 || s1 === TICS2) {
                        count++;
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length === 0 || s1 === TICS2) {
                    count++;
                }
            }
        }
        
        return count.toString();
    }

    // COUNTIF 함수
    computeCountif(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const criteriaRange = args[0];
        let criteria = args[1];
        
        if (criteria.length > 1 && criteria[0] === this.calcEngine.TIC && "=><".indexOf(criteria[1]) === -1) {
            criteria = "=" + criteria;
        } else {
            criteria = criteria.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        }
        
        const s1 = this.calcEngine.getCellsFromArgs(criteriaRange);
        let sum = 0;
        
        for (let index = 0; index < s1.length; index++) {
            const s = s1[index] + criteria;
            const parsed = this.calcEngine.parse(s);
            const result = this.calcEngine.computedValue(parsed);
            if (result === this.calcEngine.TRUEVALUESTR) {
                sum++;
            }
        }
        
        return sum.toString();
    }

    // MAX 함수
    computeMax(range) {
        let max = null;
        let hasValidNumber = false;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            if (!hasValidNumber) {
                                max = d;
                                hasValidNumber = true;
                            } else {
                                max = Math.max(max, d);
                            }
                        }
                    }
                }
            } else {
                const s1 = (r === "") ? "0" : this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        if (!hasValidNumber) {
                            max = d;
                            hasValidNumber = true;
                        } else {
                            max = Math.max(max, d);
                        }
                    }
                }
            }
        }
        
        if (hasValidNumber) {
            return max.toString();
        }
        return "";
    }

    // MIN 함수
    computeMin(range) {
        let min = Number.MAX_VALUE;
        
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            min = Math.min(min, d);
                        }
                    }
                }
            } else {
                const s1 = (r === "") ? "0" : this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        min = Math.min(min, d);
                    }
                }
            }
        }
        
        if (min !== Number.MAX_VALUE) {
            return min.toString();
        }
        return "";
    }

    // MEDIAN 함수
    computeMedian(range) {
        const dd = this.getDoubleArray(range);
        dd.sort((a, b) => a - b);
        const n = Math.floor(dd.length / 2);
        
        if (dd.length % 2 === 1) {
            return dd[n].toString();
        } else {
            return ((dd[n] + dd[n - 1]) / 2).toString();
        }
    }

    // STDEV 함수
    computeStdev(range) {
        const dd = this.getDoubleArray(range);
        if (dd.length < 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        let xbar = 0;
        return this.sd(dd, xbar).toString();
    }

    // VAR 함수
    computeVar(range) {
        const dd = this.getDoubleArray(range);
        return this.variance(dd).toString();
    }

    // 헬퍼 함수들
    getDoubleArray(range) {
        const result = [];
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            result.push(d);
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        result.push(d);
                    }
                }
            }
        }
        
        return result;
    }

    getDoubleArrayA(range) {
        const result = [];
        this.calcEngine.adjustRangeArg(range);
        const ranges = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        
        for (const r of ranges) {
            if (r.indexOf(':') > -1) {
                const cells = this.calcEngine.getCellsFromArgs(r);
                for (const s of cells) {
                    const s1 = this.calcEngine.getValueFromArg(s);
                    if (s1.length > 0) {
                        const d = parseFloat(s1);
                        if (!isNaN(d)) {
                            result.push(d);
                        } else if (s1.toLowerCase() === "true") {
                            result.push(1);
                        } else {
                            result.push(0);
                        }
                    }
                }
            } else {
                const s1 = this.calcEngine.getValueFromArg(r);
                if (s1.length > 0) {
                    const d = parseFloat(s1);
                    if (!isNaN(d)) {
                        result.push(d);
                    } else if (s1.toLowerCase() === "true") {
                        result.push(1);
                    } else {
                        result.push(0);
                    }
                }
            }
        }
        
        return result;
    }

    // 표준편차 계산
    sd(dd, xbar) {
        const n = dd.length;
        let sum = 0;
        
        for (let i = 0; i < n; i++) {
            sum += dd[i];
        }
        xbar = sum / n;
        
        sum = 0;
        for (let i = 0; i < n; i++) {
            const d = dd[i] - xbar;
            sum += d * d;
        }
        
        return Math.sqrt(sum / (n - 1));
    }

    // 분산 계산
    variance(dd) {
        const n = dd.length;
        if (n < 2) {
            return 0;
        }
        
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += dd[i];
        }
        const xbar = sum / n;
        
        sum = 0;
        for (let i = 0; i < n; i++) {
            const d = dd[i] - xbar;
            sum += d * d;
        }
        
        return sum / (n - 1);
    }

    // 조합 계산
    comb(k, n) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        
        k = Math.min(k, n - k);
        let c = 1;
        for (let i = 0; i < k; i++) {
            c = c * (n - i) / (i + 1);
        }
        return c;
    }

    // NORMSDIST 함수 (표준정규분포)
    computeNormsDist(args) {
        const z = parseFloat(this.calcEngine.getValueFromArg(args));
        if (isNaN(z)) return "#VALUE!";
        
        // 표준정규분포 누적분포함수 근사
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        const x = Math.abs(z) / Math.sqrt(2.0);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return (0.5 * (1.0 + sign * y)).toString();
    }

    // NORMSINV 함수 (표준정규분포 역함수)
    computeNormsInv(args) {
        const probability = parseFloat(this.calcEngine.getValueFromArg(args));
        if (isNaN(probability) || probability <= 0 || probability >= 1) {
            return "#NUM!";
        }
        
        // 간단한 근사값 (실제로는 더 정확한 알고리즘 필요)
        if (probability === 0.5) return "0";
        
        // 대략적인 역함수 계산
        const c0 = 2.515517;
        const c1 = 0.802853;
        const c2 = 0.010328;
        const d1 = 1.432788;
        const d2 = 0.189269;
        const d3 = 0.001308;
        
        let p = probability;
        if (p > 0.5) p = 1 - p;
        
        const t = Math.sqrt(-2 * Math.log(p));
        const result = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
        
        return (probability > 0.5 ? result : -result).toString();
    }

    // 누락된 통계 함수들의 기본 구현
    computeBinomdist(args) { return "#N/A"; }
    computeChidist(args) { return "#N/A"; }
    computeChiinv(args) { return "#N/A"; }
    computeChitest(args) { return "#N/A"; }
    computeConfidence(args) { return "#N/A"; }
    computeCorrel(args) { return "#N/A"; }
    computeCovar(args) { return "#N/A"; }
    computeCritbinom(args) { return "#N/A"; }
    computeDevsq(args) { return "#N/A"; }
    computeExpondist(args) { return "#N/A"; }
    computeFdist(args) { return "#N/A"; }
    computeFinv(args) { return "#N/A"; }
    computeFisher(args) { return "#N/A"; }
    computeFisherinv(args) { return "#N/A"; }
    computeForecast(args) { return "#N/A"; }
    computeGammadist(args) { return "#N/A"; }
    computeGammainv(args) { return "#N/A"; }
    computeGammaln(args) { return "#N/A"; }
    computeGeomean(args) { return "#N/A"; }
    computeHarmean(args) { return "#N/A"; }
    computeHypgeomdist(args) { return "#N/A"; }
    computeIntercept(args) { return "#N/A"; }
    computeKurt(args) { return "#N/A"; }
    computeLarge(args) { return "#N/A"; }
    computeLoginv(args) { return "#N/A"; }
    computeLognormdist(args) { return "#N/A"; }
    computeMaxa(args) { return "#N/A"; }
    computeMina(args) { return "#N/A"; }
    computeMode(args) { return "#N/A"; }
    computeNegbinomdist(args) { return "#N/A"; }
    computeNormdist(args) { return "#N/A"; }
    computeNorminv(args) { return "#N/A"; }
    computePearson(args) { return "#N/A"; }
    computePercentile(args) { return "#N/A"; }
    computePercentrank(args) { return "#N/A"; }
    computePermut(args) { return "#N/A"; }
    computePoisson(args) { return "#N/A"; }
    computeProb(args) { return "#N/A"; }
    computeQuartile(args) { return "#N/A"; }
    computeRank(args) { return "#N/A"; }
    computeRsq(args) { return "#N/A"; }
    computeSkew(args) { return "#N/A"; }
    computeSlope(args) { return "#N/A"; }
    computeSmall(args) { return "#N/A"; }
    computeStandardize(args) { return "#N/A"; }
    computeStdeva(args) { return "#N/A"; }
    computeStdevp(args) { return "#N/A"; }
    computeStdevpa(args) { return "#N/A"; }
    computeSteyx(args) { return "#N/A"; }
    computeTrimmean(args) { return "#N/A"; }
    computeVara(args) { return "#N/A"; }
    computeVarp(args) { return "#N/A"; }
    computeVarpa(args) { return "#N/A"; }
    computeWeibull(args) { return "#N/A"; }
    computeZtest(args) { return "#N/A"; }

    // 기타 통계 함수들도 필요에 따라 구현...
}

// Export
// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineStatisticalFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineStatisticalFunctions = CalcEngineStatisticalFunctions;
}