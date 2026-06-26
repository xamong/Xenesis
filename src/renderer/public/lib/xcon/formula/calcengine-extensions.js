/**
 * CalcEngine Extensions for AutoGen Functions
 * C# 코드를 JavaScript로 포팅한 확장 함수들
 */

// CalcEngine 클래스에 추가할 메서드들
class CalcEngineExtensions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.rand = null;
        
        // 함수 등록을 위한 초기화
        this.initAutoGenFunctions();
    }

    // 이전 함수 추가 이벤트 핸들러
    calcEngine_PrevAddFunction(sender, e) {
        // AutoGen 관련 함수들 등록
        this.calcEngine.addFunction("AUTOGEN", this.computeAutoGen.bind(this));
        this.calcEngine.addFunction("LPAD", this.computeLpad.bind(this));
        this.calcEngine.addFunction("RPAD", this.computeRpad.bind(this));
        this.calcEngine.addFunction("GUID", this.computeGuid.bind(this));
        this.calcEngine.addFunction("BASE64", this.computeBase64.bind(this));
        this.calcEngine.addFunction("ESAB64", this.computeEsab64.bind(this));
        this.calcEngine.addFunction("BASE64URL", this.computeBase64Url.bind(this));
        this.calcEngine.addFunction("ESAB64URL", this.computeEsab64Url.bind(this));
        this.calcEngine.addFunction("SHA256", this.computeSha256.bind(this));
        this.calcEngine.addFunction("MD5", this.computeMd5.bind(this));
        this.calcEngine.addFunction("ESCAPE", this.computeEscape.bind(this));
        this.calcEngine.addFunction("EPACSE", this.computeUnescape.bind(this));
        this.calcEngine.addFunction("PASSWORD", this.computePassword.bind(this));
        this.calcEngine.addFunction("RANDOM", this.computeRandom.bind(this));
        this.calcEngine.addFunction("NRANDOM", this.computeNRandom.bind(this));
        this.calcEngine.addFunction("ARANDOM", this.computeARandom.bind(this));
        this.calcEngine.addFunction("ANRANDOM", this.computeANRandom.bind(this));
        this.calcEngine.addFunction("CAPITAL", this.computeCapital.bind(this));
        this.calcEngine.addFunction("HEXA", this.computeHexa.bind(this));
        this.calcEngine.addFunction("FORMATDATE", this.computeFormatDate.bind(this));
        this.calcEngine.addFunction("UNIXTIME", this.computeUnixTime.bind(this));
        this.calcEngine.addFunction("CHOICE", this.computeChoice.bind(this));
        this.calcEngine.addFunction("RANDOMCOLOR", this.computeRandomColor.bind(this));
        
        // Actions
        this.calcEngine.addFunction("ALERT", this.computeAlert.bind(this));
    }

    // 초기화 함수
    initAutoGenFunctions() {
        if (this.calcEngine.prevAddFunction) {
            this.calcEngine.prevAddFunction(this.calcEngine, {});
        }
        this.calcEngine_PrevAddFunction(this.calcEngine, {});
    }

    // === AutoGen 함수 구현 ===
    
    computeAutoGen(args) {
        XCON.log("------- AutoGen : " + args);
        // stripTics0 호출하여 TIC 문자 제거 후 값 반환
        return this.stripTics0(this.calcEngine.getValueFromArg(args));
    }

    computeLpad(args) {
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (argList.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let s1 = this.stripTics0(this.calcEngine.getValueFromArg(argList[0]));
        const s2 = this.stripTics0(this.calcEngine.getValueFromArg(argList[1]));
        const s3 = this.stripTics0(this.calcEngine.getValueFromArg(argList[2]));
        
        const padLength = parseInt(s2);
        const padChar = s3.length > 0 ? s3[0] : ' ';
    
        s1 = s1.padStart(padLength, padChar);        

        return this.calcEngine.TIC + s1 + this.calcEngine.TIC;
    }

    computeRpad(args) {
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (argList.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let s1 = this.stripTics0(this.calcEngine.getValueFromArg(argList[0]));
        const s2 = this.stripTics0(this.calcEngine.getValueFromArg(argList[1]));
        const s3 = this.stripTics0(this.calcEngine.getValueFromArg(argList[2]));
        
        const padLength = parseInt(s2);
        const padChar = s3.length > 0 ? s3[0] : ' ';
        
        s1 = s1.padEnd(padLength, padChar);
        
        return this.calcEngine.TIC + s1 + this.calcEngine.TIC;
    }

    computeGuid(args) {
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        
        // GUID 생성 함수
        const generateGuid = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        
        if (argList.length > 0 && argList[0].length > 0) {
            const format = this.stripTics0(argList[0]);
            const guid = generateGuid();
            
            // 형식에 따른 변환
            switch(format.toUpperCase()) {
                case 'N':
                    return guid.replace(/-/g, '');
                case 'D':
                    return guid;
                case 'B':
                    return '{' + guid + '}';
                case 'P':
                    return '(' + guid + ')';
                default:
                    return guid;
            }
        }
        
        return generateGuid();
    }

    computeBase64(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        // btoa는 Latin1 문자열만 처리 가능하므로 UTF-8 인코딩 필요
        const utf8Bytes = unescape(encodeURIComponent(s));
        return btoa(utf8Bytes);
    }

    computeEsab64(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        // atob로 디코딩 후 UTF-8 디코딩
        const latin1String = atob(s);
        return decodeURIComponent(escape(latin1String));
    }

    computeBase64Url(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        const utf8Bytes = unescape(encodeURIComponent(s));
        let base64 = btoa(utf8Bytes);
        
        // URL-safe 변환
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    computeEsab64Url(args) {
        let s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        
        // URL-safe에서 일반 base64로 변환
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        
        // 패딩 추가
        while (s.length % 4 !== 0) {
            s += '=';
        }
        
        const latin1String = atob(s);
        return decodeURIComponent(escape(latin1String));
    }

    computeSha256(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        
        // 브라우저 환경에서는 Web Crypto API 사용
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            // 비동기 처리가 필요하므로 동기 버전 구현
            // 실제 구현시에는 라이브러리 사용 권장
            return this.sha256Sync(s);
        }
        
        // Node.js 환경
        if (typeof require !== 'undefined') {
            const crypto = require('crypto');
            return crypto.createHash('sha256').update(s).digest('hex');
        }
        
        return "SHA256_NOT_AVAILABLE";
    }

    computeMd5(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        
        // 간단한 MD5 구현 또는 라이브러리 사용
        // 실제 구현시에는 crypto-js 같은 라이브러리 사용 권장
        return this.md5Sync(s);
    }

    computeEscape(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        return encodeURIComponent(s);
    }

    computeUnescape(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        return decodeURIComponent(s);
    }

    computePassword(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        let n = parseInt(s) || 0;
        
        if (n === 0) {
            n = Math.floor(Math.random() * 9) + 8; // 8~16
        }
        
        const special0 = "!@^*_[]:\",./?>~`\\";
        const special1 = "!@#$^*()-_=+[]{};:'\",.<>/?~`\\";
        
        let password = "";
        for (let i = 0; i < n; i++) {
            const t = Math.floor(Math.random() * 4);
            if (t === 0) {
                password += Math.floor(Math.random() * 10);
            } else if (t === 1) {
                password += String.fromCharCode(Math.floor(Math.random() * 26) + 65); // A-Z
            } else if (t === 2) {
                password += String.fromCharCode(Math.floor(Math.random() * 26) + 97); // a-z
            } else {
                if (i === 0) {
                    password += special0[Math.floor(Math.random() * special0.length)];
                } else {
                    password += special1[Math.floor(Math.random() * special1.length)];
                }
            }
        }
        
        return password;
    }

    computeRandom(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (argList.length !== 1 && argList.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        if (argList.length === 1) {
            const n = parseInt(this.stripTics0(this.calcEngine.getValueFromArg(argList[0])));
            return Math.floor(Math.random() * n).toString();
        } else {
            const m = parseInt(this.stripTics0(this.calcEngine.getValueFromArg(argList[0])));
            const n = parseInt(this.stripTics0(this.calcEngine.getValueFromArg(argList[1])));
            return (Math.floor(Math.random() * (n - m)) + m).toString();
        }
    }

    computeNRandom(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        let n = parseInt(s) || 0;
        
        if (n === 0) {
            n = Math.floor(Math.random() * 32) + 1; // 1~32
        }
        
        let result = "";
        for (let i = 0; i < n; i++) {
            result += Math.floor(Math.random() * 10);
        }
        
        return this.calcEngine.TIC + result + this.calcEngine.TIC;
    }

    computeARandom(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        let n = parseInt(s) || 0;
        
        if (n === 0) {
            n = Math.floor(Math.random() * 32) + 1; // 1~32
        }
        
        let result = "";
        for (let i = 0; i < n; i++) {
            result += String.fromCharCode(Math.floor(Math.random() * 26) + 65); // A-Z
        }
        
        return result;
    }

    computeANRandom(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (argList.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const n1 = parseInt(this.stripTics0(this.calcEngine.getValueFromArg(argList[0])));
        const n2 = parseInt(this.stripTics0(this.calcEngine.getValueFromArg(argList[1])));
        
        let result = "";
        
        // 알파벳
        for (let i = 0; i < n1; i++) {
            result += String.fromCharCode(Math.floor(Math.random() * 26) + 65); // A-Z
        }
        
        // 숫자
        for (let i = 0; i < n2; i++) {
            result += Math.floor(Math.random() * 10);
        }
        
        return result;
    }

    computeCapital(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        
        if (s.length > 1) {
            return s[0].toUpperCase() + s.substring(1).toLowerCase();
        } else {
            return s.toUpperCase();
        }
    }

    computeHexa(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        const num = parseInt(s);
        return num.toString(16).toUpperCase();
    }

    computeFormatDate(args) {
        XCON.log(`🔍 FORMATDATE 함수 호출, args: "${args}"`);
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        XCON.log(`🔍 FORMATDATE 분리된 인자들:`, argList);
        
        if (argList.length !== 2) {
            XCON.log(`🔍 FORMATDATE 잘못된 인자 개수: ${argList.length}`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const dateArg = this.calcEngine.getValueFromArg(argList[0]);
        const format = this.stripTics0(this.calcEngine.getValueFromArg(argList[1]));
        XCON.log(`🔍 FORMATDATE 날짜 인자: "${dateArg}", 포맷: "${format}"`);
        
        let date;
        
        // 날짜 파싱
        const dateStr = dateArg.replace(new RegExp(this.calcEngine.TIC, 'g'), '');
        XCON.log(`🔍 FORMATDATE 따옴표 제거 후: "${dateStr}"`);
        const numValue = parseFloat(dateStr);
        XCON.log(`🔍 FORMATDATE 숫자 변환: ${numValue}`);
        
        if (!isNaN(numValue)) {
            // Excel 시리얼 날짜 (OLE Automation date)
            XCON.log(`🔍 FORMATDATE 시리얼 날짜로 처리`);
            date = this.fromOADate(numValue);
        } else {
            XCON.log(`🔍 FORMATDATE 문자열 날짜로 처리`);
            date = new Date(dateStr);
            XCON.log(`🔍 FORMATDATE 문자열 날짜 파싱 결과: ${date}`);
        }
        
        if (isNaN(date.getTime())) {
            XCON.log(`🔍 FORMATDATE 유효하지 않은 날짜`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        // 날짜 포맷팅
        const result = this.formatDate(date, format);
        XCON.log(`🔍 FORMATDATE 최종 결과: "${result}"`);
        return result;
    }

    computeUnixTime(args) {
        let dt = new Date();
        
        if (args && args.length > 0) {
            const dateArg = this.calcEngine.getValueFromArg(args);
            const dateStr = dateArg.replace(new RegExp(this.calcEngine.TIC, 'g'), '');
            
            const numValue = parseFloat(dateStr);
            if (!isNaN(numValue)) {
                dt = this.fromOADate(numValue);
            } else {
                dt = new Date(dateStr);
            }
        }
        
        // Unix timestamp in milliseconds
        return dt.getTime().toString();
    }

    computeChoice(args) {
        if (!this.rand) {
            this.rand = Math.random;
        }
        
        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        const index = Math.floor(Math.random() * argList.length);
        return argList[index];
    }

    computeRandomColor(args) {
        let s = 'white';
        let sys = 'xamong';

        const argList = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        if (argList.length === 2) {
            s = this.stripTics0(this.calcEngine.getValueFromArg(argList[0]));
            sys = this.stripTics0(this.calcEngine.getValueFromArg(argList[1]));
        } else if (argList.length === 1) {
            s = this.stripTics0(this.calcEngine.getValueFromArg(argList[0]));
        }
        
        let mix = { r: 255, g: 255, b: 255, a: 255 }; // White
        
        switch(s.toLowerCase()) {
            case 'white': mix = { r: 255, g: 255, b: 255, a: 255 }; break;
            case 'red': mix = { r: 255, g: 0, b: 0, a: 255 }; break;
            case 'green': mix = { r: 0, g: 255, b: 0, a: 255 }; break;
            case 'blue': mix = { r: 0, g: 0, b: 255, a: 255 }; break;
            case 'black': mix = { r: 0, g: 0, b: 0, a: 255 }; break;
            default:
                try {
                    const sp = s.split(',');
                    if (sp.length === 4) {
                        mix = {
                            r: parseInt(sp[0]) || 0,
                            g: parseInt(sp[1]) || 0,
                            b: parseInt(sp[2]) || 0,
                            a: parseInt(sp[3]) || 0
                        };
                    }
                } catch (e) {
                    // 기본값 사용
                }
                break;
        }
        
        const color = this.generateRandomColor(mix);
        if (sys === 'xamong') {
            return `${color.r},${color.g},${color.b},${color.a}`;
        } else if (sys === 'figma') {
            return `${color.r},${color.g},${color.b},${color.a / 255}`;
        } else if (sys === 'rgba') {
            return `rgba(${color.r},${color.g},${color.b},${color.a / 255})`;
        } else if (sys === 'hex') {
            return `#${color.r.toString(16)}${color.g.toString(16)}${color.b.toString(16)}`;
        } else {
            return `${color.r},${color.g},${color.b},${color.a}`;
        }   
    }

    // === Action 함수 ===
    
    computeAlert(args) {
        const s = this.stripTics0(this.calcEngine.getValueFromArg(args));
        return `<xcon><x><n>type</n><o>alert</o><n>message</n><o>${s}</o></x></xcon>`;
    }

    // === 유틸리티 함수들 ===
    
    stripTics0(s) {
        if (!s) return "";
        
        if (s.length > 1 && s[0] === this.calcEngine.TIC && s[s.length - 1] === this.calcEngine.TIC) {
            return s.substring(1, s.length - 1);
        }
        return s;
    }

    // Excel OLE Automation date 변환
    fromOADate(oaDate) {
        XCON.log(`🔍 FORMATDATE fromOADate 호출, oaDate: ${oaDate}`);
        let days = oaDate;
        
        // Excel의 1900년 윤년 버그 보정 (정적 속성과 인스턴스 속성 모두 확인)
        const treat1900AsLeapYear = this.calcEngine.Treat1900AsLeapYear || 
                                   (typeof CalcEngine !== 'undefined' && CalcEngine.Treat1900AsLeapYear) || 
                                   true; // 기본값으로 true 사용
        
        XCON.log(`🔍 FORMATDATE Treat1900AsLeapYear 설정: ${treat1900AsLeapYear}`);
        
        if (treat1900AsLeapYear && days > 60) {
            days -= 1;
            XCON.log(`🔍 FORMATDATE 1900년 윤년 버그 보정 적용, 조정된 days: ${days}`);
        }
        
        const baseDate = new Date(1899, 11, 30); // 1899년 12월 30일
        const result = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        XCON.log(`🔍 FORMATDATE fromOADate 결과: ${result}`);
        return result;
    }

    // 날짜 포맷팅 함수
    formatDate(date, format) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        let result = format;
        
        // 년도
        result = result.replace(/yyyy/g, year.toString());
        result = result.replace(/yy/g, (year % 100).toString().padStart(2, '0'));
        
        // 월
        result = result.replace(/MM/g, month.toString().padStart(2, '0'));
        result = result.replace(/M/g, month.toString());
        
        // 일
        result = result.replace(/dd/g, day.toString().padStart(2, '0'));
        result = result.replace(/d/g, day.toString());
        
        // 시간
        result = result.replace(/HH/g, hours.toString().padStart(2, '0'));
        result = result.replace(/H/g, hours.toString());
        result = result.replace(/hh/g, ((hours % 12) || 12).toString().padStart(2, '0'));
        result = result.replace(/h/g, ((hours % 12) || 12).toString());
        
        // 분
        result = result.replace(/mm/g, minutes.toString().padStart(2, '0'));
        result = result.replace(/m/g, minutes.toString());
        
        // 초
        result = result.replace(/ss/g, seconds.toString().padStart(2, '0'));
        result = result.replace(/s/g, seconds.toString());
        
        return result;
    }

    // 랜덤 색상 생성
    generateRandomColor(mixColor) {
        const red = Math.floor((Math.random() * 256 + mixColor.r) / 2);
        const green = Math.floor((Math.random() * 256 + mixColor.g) / 2);
        const blue = Math.floor((Math.random() * 256 + mixColor.b) / 2);
        const alpha = mixColor.a;
        
        return { r: red, g: green, b: blue, a: alpha };
    }

    // 간단한 SHA256 구현 (동기)
    sha256Sync(str) {
        // 실제 구현시에는 crypto-js 같은 라이브러리 사용
        // 여기서는 placeholder 반환
        return "SHA256_" + str.length.toString(16);
    }

    // 간단한 MD5 구현 (동기)
    md5Sync(str) {
        if (window.XCON) {
            return window.XCON.hex_md5(str);
        }
        // 실제 구현시에는 crypto-js 같은 라이브러리 사용
        // 여기서는 placeholder 반환
        return "MD5_" + str.length.toString(16);
    }
}

// CalcEngine에 확장 기능 연결
function extendCalcEngine(calcEngine) {
    const extensions = new CalcEngineExtensions(calcEngine);
    
    // CalcEngine 인스턴스에 확장 메서드 추가
    calcEngine.computeAutoGen = extensions.computeAutoGen.bind(extensions);
    calcEngine.computeLpad = extensions.computeLpad.bind(extensions);
    calcEngine.computeRpad = extensions.computeRpad.bind(extensions);
    calcEngine.computeGuid = extensions.computeGuid.bind(extensions);
    calcEngine.computeBase64 = extensions.computeBase64.bind(extensions);
    calcEngine.computeEsab64 = extensions.computeEsab64.bind(extensions);
    calcEngine.computeBase64Url = extensions.computeBase64Url.bind(extensions);
    calcEngine.computeEsab64Url = extensions.computeEsab64Url.bind(extensions);
    calcEngine.computeSha256 = extensions.computeSha256.bind(extensions);
    calcEngine.computeMd5 = extensions.computeMd5.bind(extensions);
    calcEngine.computeEscape = extensions.computeEscape.bind(extensions);
    calcEngine.computeUnescape = extensions.computeUnescape.bind(extensions);
    calcEngine.computePassword = extensions.computePassword.bind(extensions);
    calcEngine.computeRandom = extensions.computeRandom.bind(extensions);
    calcEngine.computeNRandom = extensions.computeNRandom.bind(extensions);
    calcEngine.computeARandom = extensions.computeARandom.bind(extensions);
    calcEngine.computeANRandom = extensions.computeANRandom.bind(extensions);
    calcEngine.computeCapital = extensions.computeCapital.bind(extensions);
    calcEngine.computeHexa = extensions.computeHexa.bind(extensions);
    calcEngine.computeFormatDate = extensions.computeFormatDate.bind(extensions);
    calcEngine.computeUnixTime = extensions.computeUnixTime.bind(extensions);
    calcEngine.computeChoice = extensions.computeChoice.bind(extensions);
    calcEngine.computeRandomColor = extensions.computeRandomColor.bind(extensions);
    calcEngine.computeQuotient = extensions.computeQuotient.bind(extensions);
    calcEngine.computeAlert = extensions.computeAlert.bind(extensions);
    
    return extensions;
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CalcEngineExtensions, extendCalcEngine };
} else if (typeof window !== 'undefined') {
    window.CalcEngineExtensions = CalcEngineExtensions;
    window.extendCalcEngine = extendCalcEngine;
}