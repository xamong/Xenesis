/**
 * CalcEngine Date/Time Functions
 * 날짜/시간 관련 함수들
 */

class CalcEngineDateTimeFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.dateTime1900 = new Date(1900, 0, 1);
        this.initDateTimeFunctions();
    }

    initDateTimeFunctions() {
        // 날짜/시간 함수들
        this.calcEngine.addFunction("DATE", this.computeDate.bind(this));
        this.calcEngine.addFunction("DATEVALUE", this.computeDatevalue.bind(this));
        this.calcEngine.addFunction("DAY", this.computeDay.bind(this));
        this.calcEngine.addFunction("DAYS360", this.computeDays360.bind(this));
        this.calcEngine.addFunction("HOUR", this.computeHour.bind(this));
        this.calcEngine.addFunction("MINUTE", this.computeMinute.bind(this));
        this.calcEngine.addFunction("MONTH", this.computeMonth.bind(this));
        this.calcEngine.addFunction("NOW", this.computeNow.bind(this));
        this.calcEngine.addFunction("SECOND", this.computeSecond.bind(this));
        this.calcEngine.addFunction("TIME", this.computeTime.bind(this));
        this.calcEngine.addFunction("TIMEVALUE", this.computeTimevalue.bind(this));
        this.calcEngine.addFunction("TODAY", this.computeToday.bind(this));
        this.calcEngine.addFunction("WEEKDAY", this.computeWeekday.bind(this));
        this.calcEngine.addFunction("YEAR", this.computeYear.bind(this));
    }

    // DATE 함수
    computeDate(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let year = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        let month = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        let day = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            while (month > 12) {
                month -= 12;
                year++;
            }
            
            const days = this.getSerialDateFromDate(year, month, day);
            
            if (this.calcEngine.excelLikeComputations) {
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString();
            }
            
            return days.toString();
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // DATEVALUE 함수
    computeDatevalue(argList) {
        XCON.log(`🔍 DATEVALUE 함수 호출, argList: "${argList}"`);
        const value = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 DATEVALUE getValueFromArg 결과: "${value}"`);
        const dateStr = value.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 DATEVALUE 따옴표 제거 후: "${dateStr}"`);
        
        try {
            const dt = new Date(dateStr);
            if (isNaN(dt.getTime())) {
                XCON.log(`🔍 DATEVALUE 날짜 파싱 실패`);
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            
            XCON.log(`🔍 DATEVALUE 날짜 파싱 성공: ${dt}`);
            
            // getSerialDateFromDate 헬퍼 함수 사용하여 일관된 시리얼 날짜 계산
            const serialDate = this.getSerialDateFromDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
            XCON.log(`🔍 DATEVALUE 시리얼 날짜: ${serialDate}`);
            
            return serialDate.toString();
        } catch (e) {
            XCON.log(`🔍 DATEVALUE 파싱 오류:`, e);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
    }

    // DAY 함수
    computeDay(argList) {
        XCON.log(`🔍 DAY 함수 호출, argList: "${argList}"`);
        const s = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 DAY getValueFromArg 결과: "${s}"`);
        const cleanS = s.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 DAY 따옴표 제거 후: "${cleanS}"`);
        
        // 먼저 문자열이 날짜 형식인지 확인 (하이픈, 슬래시 등이 포함된 경우)
        if (cleanS.includes('-') || cleanS.includes('/') || cleanS.includes(' ')) {
            XCON.log(`🔍 DAY 날짜 형식 문자열로 판단`);
            let date = new Date(cleanS);
            if (!isNaN(date.getTime())) {
                XCON.log(`🔍 DAY 문자열 날짜 파싱 성공: ${date}`);
                const day = date.getDate();
                XCON.log(`🔍 DAY 문자열에서 추출한 일: ${day}`);
                return day.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialdate = parseFloat(cleanS);
        XCON.log(`🔍 DAY 시리얼 날짜 파싱: ${serialdate}`);
        if (!isNaN(serialdate) && serialdate >= 1 && cleanS === serialdate.toString()) {
            XCON.log(`🔍 DAY 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 DAY getDateFromSerialDate 호출 전`);
            const date = this.getDateFromSerialDate(serialdate);
            XCON.log(`🔍 DAY getDateFromSerialDate 결과: ${date}`);
            const day = date.getDate();
            XCON.log(`🔍 DAY 시리얼에서 추출한 일: ${day}`);
            return day.toString();
        }
        
        // 일반 문자열 날짜 형식 시도
        let date = new Date(cleanS);
        if (!isNaN(date.getTime())) {
            XCON.log(`🔍 DAY 일반 문자열 날짜 파싱 성공: ${date}`);
            const day = date.getDate();
            XCON.log(`🔍 DAY 일반 문자열에서 추출한 일: ${day}`);
            return day.toString();
        }
        
        // 시리얼 날짜가 1보다 작은 경우
        if (!isNaN(serialdate) && serialdate < 1) {
            XCON.log(`🔍 DAY 시리얼 날짜가 1보다 작음, 0 반환`);
            return "0";
        }
        
        XCON.log(`🔍 DAY 함수 오류: 유효하지 않은 인수`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // DAYS360 함수
    computeDays360(argList) {
        XCON.log(`🔍 DAYS360 함수 호출, argList: "${argList}"`);
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        XCON.log(`🔍 DAYS360 분리된 인자들:`, args);
        
        if (args.length !== 2 && args.length !== 3) {
            XCON.log(`🔍 DAYS360 잘못된 인자 개수: ${args.length}`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        // 첫 번째 날짜 처리
        const arg1 = this.calcEngine.getValueFromArg(args[0]);
        const cleanArg1 = arg1.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 DAYS360 첫 번째 인자 처리: "${cleanArg1}"`);
        
        let serialdate1;
        if (cleanArg1.includes('-') || cleanArg1.includes('/')) {
            // 날짜 문자열인 경우
            const dt1 = new Date(cleanArg1);
            if (isNaN(dt1.getTime())) {
                XCON.log(`🔍 DAYS360 첫 번째 날짜 파싱 실패`);
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            serialdate1 = this.getSerialDateFromDate(dt1.getFullYear(), dt1.getMonth() + 1, dt1.getDate());
            XCON.log(`🔍 DAYS360 첫 번째 날짜를 시리얼로 변환: ${serialdate1}`);
        } else {
            // 시리얼 날짜인 경우
            serialdate1 = parseFloat(cleanArg1);
            XCON.log(`🔍 DAYS360 첫 번째 시리얼 날짜: ${serialdate1}`);
        }
        
        // 두 번째 날짜 처리
        const arg2 = this.calcEngine.getValueFromArg(args[1]);
        const cleanArg2 = arg2.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 DAYS360 두 번째 인자 처리: "${cleanArg2}"`);
        
        let serialdate2;
        if (cleanArg2.includes('-') || cleanArg2.includes('/')) {
            // 날짜 문자열인 경우
            const dt2 = new Date(cleanArg2);
            if (isNaN(dt2.getTime())) {
                XCON.log(`🔍 DAYS360 두 번째 날짜 파싱 실패`);
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            serialdate2 = this.getSerialDateFromDate(dt2.getFullYear(), dt2.getMonth() + 1, dt2.getDate());
            XCON.log(`🔍 DAYS360 두 번째 날짜를 시리얼로 변환: ${serialdate2}`);
        } else {
            // 시리얼 날짜인 경우
            serialdate2 = parseFloat(cleanArg2);
            XCON.log(`🔍 DAYS360 두 번째 시리얼 날짜: ${serialdate2}`);
        }
        
        // 세 번째 인자 (method) 처리
        const method = (args.length === 3) ? (args[2] === this.calcEngine.TRUEVALUESTR) : false;
        XCON.log(`🔍 DAYS360 method: ${method}`);
        
        if (!isNaN(serialdate1) && !isNaN(serialdate2)) {
            let dt1 = this.getDateFromSerialDate(serialdate1);
            let dt2 = this.getDateFromSerialDate(serialdate2);
            XCON.log(`🔍 DAYS360 변환된 날짜들: ${dt1} ~ ${dt2}`);
            
            let flipSign = false;
            
            if (dt1.getDate() === 31) {
                dt1 = new Date(dt1.getFullYear(), dt1.getMonth(), 30);
                XCON.log(`🔍 DAYS360 첫 번째 날짜 31일 조정: ${dt1}`);
            }
            
            if (dt2.getDate() === 31 && !method && dt1.getDate() < 30) {
                dt2 = new Date(dt2.getFullYear(), dt2.getMonth() + 1, 1);
                XCON.log(`🔍 DAYS360 두 번째 날짜 31일 조정 (다음달 1일): ${dt2}`);
            } else if (dt2.getDate() === 31) {
                dt2 = new Date(dt2.getFullYear(), dt2.getMonth(), 30);
                XCON.log(`🔍 DAYS360 두 번째 날짜 31일 조정 (30일): ${dt2}`);
            }
            
            if (dt2 < dt1) {
                flipSign = true;
                const t = dt1;
                dt1 = dt2;
                dt2 = t;
                XCON.log(`🔍 DAYS360 날짜 순서 변경, flipSign: true`);
            }
            
            let days = dt2.getDate() - dt1.getDate();
            days += 30 * (dt2.getMonth() - dt1.getMonth());
            days += 360 * (dt2.getFullYear() - dt1.getFullYear());
            
            if (flipSign) {
                days = -days;
            }
            
            XCON.log(`🔍 DAYS360 계산 결과: ${days}일`);
            return days.toString();
        }
        
        XCON.log(`🔍 DAYS360 유효하지 않은 인자들`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // HOUR 함수
    computeHour(argList) {
        XCON.log(`🔍 HOUR 함수 호출, argList: "${argList}"`);
        const value = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 HOUR getValueFromArg 결과: "${value}"`);
        const cleanValue = value.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 HOUR 따옴표 제거 후: "${cleanValue}"`);
        
        // 먼저 문자열이 시간/날짜 형식인지 확인 (콜론, 하이픈, 슬래시 등이 포함된 경우)
        if (cleanValue.includes(':') || cleanValue.includes('-') || cleanValue.includes('/') || cleanValue.includes(' ')) {
            XCON.log(`🔍 HOUR 시간/날짜 형식 문자열로 판단`);
            let dt = new Date(cleanValue);
            
            // 시간만 있는 경우 (예: "14:30:45") 오늘 날짜와 결합
            if (isNaN(dt.getTime()) && cleanValue.includes(':') && !cleanValue.includes('-') && !cleanValue.includes('/')) {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dateTimeString = `${today}T${cleanValue}`;
                XCON.log(`🔍 HOUR 시간 문자열을 날짜와 결합: "${dateTimeString}"`);
                dt = new Date(dateTimeString);
            }
            
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 HOUR 문자열 시간/날짜 파싱 성공: ${dt}`);
                const hour = dt.getHours();
                XCON.log(`🔍 HOUR 문자열에서 추출한 시간: ${hour}`);
                return hour.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialDate = parseFloat(cleanValue);
        XCON.log(`🔍 HOUR 시리얼 날짜 파싱: ${serialDate}`);
        if (!isNaN(serialDate) && cleanValue === serialDate.toString()) {
            XCON.log(`🔍 HOUR 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 HOUR fromOADate 호출 전`);
            const dt = this.fromOADate(serialDate);
            XCON.log(`🔍 HOUR fromOADate 결과: ${dt}`);
            const hour = dt.getHours();
            XCON.log(`🔍 HOUR 시리얼에서 추출한 시간: ${hour}`);
            return hour.toString();
        }
        
        // 일반 문자열 시간/날짜 형식 시도
        let dt;
        try {
            dt = new Date(cleanValue);
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 HOUR 일반 문자열 시간/날짜 파싱 성공: ${dt}`);
                const hour = dt.getHours();
                XCON.log(`🔍 HOUR 일반 문자열에서 추출한 시간: ${hour}`);
                return hour.toString();
            }
        } catch (e) {
            XCON.log(`🔍 HOUR 일반 문자열 시간/날짜 파싱 실패:`, e);
        }
        
        XCON.log(`🔍 HOUR 함수 기본값 0 반환`);
        return "0";
    }

    // MINUTE 함수
    computeMinute(argList) {
        XCON.log(`🔍 MINUTE 함수 호출, argList: "${argList}"`);
        const value = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 MINUTE getValueFromArg 결과: "${value}"`);
        const cleanValue = value.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 MINUTE 따옴표 제거 후: "${cleanValue}"`);
        
        // 먼저 문자열이 시간/날짜 형식인지 확인 (콜론, 하이픈, 슬래시 등이 포함된 경우)
        if (cleanValue.includes(':') || cleanValue.includes('-') || cleanValue.includes('/') || cleanValue.includes(' ')) {
            XCON.log(`🔍 MINUTE 시간/날짜 형식 문자열로 판단`);
            let dt = new Date(cleanValue);
            
            // 시간만 있는 경우 (예: "14:30:45") 오늘 날짜와 결합
            if (isNaN(dt.getTime()) && cleanValue.includes(':') && !cleanValue.includes('-') && !cleanValue.includes('/')) {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dateTimeString = `${today}T${cleanValue}`;
                XCON.log(`🔍 MINUTE 시간 문자열을 날짜와 결합: "${dateTimeString}"`);
                dt = new Date(dateTimeString);
            }
            
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 MINUTE 문자열 시간/날짜 파싱 성공: ${dt}`);
                const minute = dt.getMinutes();
                XCON.log(`🔍 MINUTE 문자열에서 추출한 분: ${minute}`);
                return minute.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialDate = parseFloat(cleanValue);
        XCON.log(`🔍 MINUTE 시리얼 날짜 파싱: ${serialDate}`);
        if (!isNaN(serialDate) && cleanValue === serialDate.toString()) {
            XCON.log(`🔍 MINUTE 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 MINUTE fromOADate 호출 전`);
            const dt = this.fromOADate(serialDate);
            XCON.log(`🔍 MINUTE fromOADate 결과: ${dt}`);
            const minute = dt.getMinutes();
            XCON.log(`🔍 MINUTE 시리얼에서 추출한 분: ${minute}`);
            return minute.toString();
        }
        
        // 일반 문자열 시간/날짜 형식 시도
        let dt;
        try {
            dt = new Date(cleanValue);
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 MINUTE 일반 문자열 시간/날짜 파싱 성공: ${dt}`);
                const minute = dt.getMinutes();
                XCON.log(`🔍 MINUTE 일반 문자열에서 추출한 분: ${minute}`);
                return minute.toString();
            }
        } catch (e) {
            XCON.log(`🔍 MINUTE 일반 문자열 시간/날짜 파싱 실패:`, e);
        }
        
        XCON.log(`🔍 MINUTE 함수 기본값 0 반환`);
        return "0";
    }

    // MONTH 함수
    computeMonth(argList) {
        XCON.log(`🔍 MONTH 함수 호출, argList: "${argList}"`);
        const s = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 MONTH getValueFromArg 결과: "${s}"`);
        const cleanS = s.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 MONTH 따옴표 제거 후: "${cleanS}"`);
        
        // 먼저 문자열이 날짜 형식인지 확인 (하이픈, 슬래시 등이 포함된 경우)
        if (cleanS.includes('-') || cleanS.includes('/') || cleanS.includes(' ')) {
            XCON.log(`🔍 MONTH 날짜 형식 문자열로 판단`);
            let date = new Date(cleanS);
            if (!isNaN(date.getTime())) {
                XCON.log(`🔍 MONTH 문자열 날짜 파싱 성공: ${date}`);
                const month = date.getMonth() + 1;
                XCON.log(`🔍 MONTH 문자열에서 추출한 월: ${month}`);
                return month.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialdate = parseFloat(cleanS);
        XCON.log(`🔍 MONTH 시리얼 날짜 파싱: ${serialdate}`);
        if (!isNaN(serialdate) && serialdate >= 1 && cleanS === serialdate.toString()) {
            XCON.log(`🔍 MONTH 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 MONTH getDateFromSerialDate 호출 전`);
            const date = this.getDateFromSerialDate(serialdate);
            XCON.log(`🔍 MONTH getDateFromSerialDate 결과: ${date}`);
            const month = date.getMonth() + 1;
            XCON.log(`🔍 MONTH 시리얼에서 추출한 월: ${month}`);
            return month.toString();
        }
        
        // 일반 문자열 날짜 형식 시도
        let date = new Date(cleanS);
        if (!isNaN(date.getTime())) {
            XCON.log(`🔍 MONTH 일반 문자열 날짜 파싱 성공: ${date}`);
            const month = date.getMonth() + 1;
            XCON.log(`🔍 MONTH 일반 문자열에서 추출한 월: ${month}`);
            return month.toString();
        }
        
        // 시리얼 날짜가 1보다 작은 경우
        if (!isNaN(serialdate) && serialdate < 1) {
            XCON.log(`🔍 MONTH 시리얼 날짜가 1보다 작음, 1 반환`);
            return "1";
        }
        
        XCON.log(`🔍 MONTH 함수 오류: 유효하지 않은 인수`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // NOW 함수
    computeNow(argList) {
        const dt = new Date();
        XCON.log(`🔍 NOW 함수 호출, 현재 날짜시간: ${dt}`);
        const oaDate = this.toOADate(dt);
        XCON.log(`🔍 NOW OLE Automation Date: ${oaDate}`);
        return oaDate.toString();
    }

    // SECOND 함수
    computeSecond(argList) {
        XCON.log(`🔍 SECOND 함수 호출, argList: "${argList}"`);
        const value = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 SECOND getValueFromArg 결과: "${value}"`);
        const cleanValue = value.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 SECOND 따옴표 제거 후: "${cleanValue}"`);
        
        // 먼저 문자열이 시간/날짜 형식인지 확인 (콜론, 하이픈, 슬래시 등이 포함된 경우)
        if (cleanValue.includes(':') || cleanValue.includes('-') || cleanValue.includes('/') || cleanValue.includes(' ')) {
            XCON.log(`🔍 SECOND 시간/날짜 형식 문자열로 판단`);
            let dt = new Date(cleanValue);
            
            // 시간만 있는 경우 (예: "14:30:45") 오늘 날짜와 결합
            if (isNaN(dt.getTime()) && cleanValue.includes(':') && !cleanValue.includes('-') && !cleanValue.includes('/')) {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dateTimeString = `${today}T${cleanValue}`;
                XCON.log(`🔍 SECOND 시간 문자열을 날짜와 결합: "${dateTimeString}"`);
                dt = new Date(dateTimeString);
            }
            
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 SECOND 문자열 시간/날짜 파싱 성공: ${dt}`);
                const second = dt.getSeconds();
                XCON.log(`🔍 SECOND 문자열에서 추출한 초: ${second}`);
                return second.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialDate = parseFloat(cleanValue);
        XCON.log(`🔍 SECOND 시리얼 날짜 파싱: ${serialDate}`);
        if (!isNaN(serialDate) && cleanValue === serialDate.toString()) {
            XCON.log(`🔍 SECOND 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 SECOND fromOADate 호출 전`);
            const dt = this.fromOADate(serialDate);
            XCON.log(`🔍 SECOND fromOADate 결과: ${dt}`);
            const second = dt.getSeconds();
            XCON.log(`🔍 SECOND 시리얼에서 추출한 초: ${second}`);
            return second.toString();
        }
        
        // 일반 문자열 시간/날짜 형식 시도
        let dt;
        try {
            dt = new Date(cleanValue);
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 SECOND 일반 문자열 시간/날짜 파싱 성공: ${dt}`);
                const second = dt.getSeconds();
                XCON.log(`🔍 SECOND 일반 문자열에서 추출한 초: ${second}`);
                return second.toString();
            }
        } catch (e) {
            XCON.log(`🔍 SECOND 일반 문자열 시간/날짜 파싱 실패:`, e);
        }
        
        XCON.log(`🔍 SECOND 함수 기본값 0 반환`);
        return "0";
    }

    // TIME 함수
    computeTime(argList) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        if (args.length !== 3) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const hour = parseFloat(this.calcEngine.getValueFromArg(args[0]));
        const minute = parseFloat(this.calcEngine.getValueFromArg(args[1]));
        const second = parseFloat(this.calcEngine.getValueFromArg(args[2]));
        
        if (!isNaN(hour) && !isNaN(minute) && !isNaN(second)) {
            const time = (hour + (minute + second / 60) / 60) / 24;
            return time.toFixed(9);
        }
        
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // TIMEVALUE 함수
    computeTimevalue(argList) {
        XCON.log(`🔍 TIMEVALUE 함수 호출, argList: "${argList}"`);
        const value = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 TIMEVALUE getValueFromArg 결과: "${value}"`);
        const cleanValue = value.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 TIMEVALUE 따옴표 제거 후: "${cleanValue}"`);
        
        try {
            let dt = new Date(cleanValue);
            
            // 시간만 있는 경우 (예: "14:30:45", "2:30 PM") 오늘 날짜와 결합
            if (isNaN(dt.getTime()) && cleanValue.includes(':')) {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dateTimeString = `${today}T${cleanValue}`;
                XCON.log(`🔍 TIMEVALUE 시간 문자열을 날짜와 결합: "${dateTimeString}"`);
                dt = new Date(dateTimeString);
                
                // T 형식이 안되면 공백으로 시도
                if (isNaN(dt.getTime())) {
                    const dateTimeString2 = `${today} ${cleanValue}`;
                    XCON.log(`🔍 TIMEVALUE 공백으로 시간 결합 재시도: "${dateTimeString2}"`);
                    dt = new Date(dateTimeString2);
                }
            }
            
            if (!isNaN(dt.getTime())) {
                XCON.log(`🔍 TIMEVALUE 시간 파싱 성공: ${dt}`);
                // 시간을 하루의 소수점으로 변환 (0~1 사이 값)
                const time = (dt.getHours() + (dt.getMinutes() + dt.getSeconds() / 60) / 60) / 24;
                XCON.log(`🔍 TIMEVALUE 계산된 시간 값: ${time}`);
                return time.toString();
            }
        } catch (e) {
            XCON.log(`🔍 TIMEVALUE 파싱 오류:`, e);
        }
        
        XCON.log(`🔍 TIMEVALUE 유효하지 않은 시간 형식`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // TODAY 함수
    computeToday(argList) {
        const dt = new Date();
        XCON.log(`🔍 TODAY 함수 호출, 현재 날짜: ${dt}`);
        
        // 시간 부분을 제거하고 날짜만 사용 (00:00:00으로 설정)
        const dateOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        XCON.log(`🔍 TODAY 시간 제거 후 날짜: ${dateOnly}`);
        
        // NOW()와 동일한 OLE Automation Date 시스템 사용
        const oaDate = this.toOADate(dateOnly);
        XCON.log(`🔍 TODAY OLE Automation Date: ${oaDate}`);
        
        // 정수 부분만 반환 (날짜만, 시간 제외)
        const serialDate = Math.floor(oaDate);
        XCON.log(`🔍 TODAY 최종 시리얼 날짜: ${serialDate}`);
        
        return serialDate.toString();
    }

    // WEEKDAY 함수
    computeWeekday(argList) {
        XCON.log(`🔍 WEEKDAY 함수 호출, argList: "${argList}"`);
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(argList);
        XCON.log(`🔍 WEEKDAY 분리된 인자들:`, args);
        
        if (args.length !== 1 && args.length !== 2) {
            XCON.log(`🔍 WEEKDAY 잘못된 인자 개수: ${args.length}`);
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        // 첫 번째 인자 (날짜) 처리
        const arg1 = this.calcEngine.getValueFromArg(args[0]);
        const cleanArg1 = arg1.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 WEEKDAY 첫 번째 인자 처리: "${cleanArg1}"`);
        
        let serialdate;
        if (cleanArg1.includes('-') || cleanArg1.includes('/') || cleanArg1.includes(' ')) {
            // 날짜 문자열인 경우
            const dt = new Date(cleanArg1);
            if (isNaN(dt.getTime())) {
                XCON.log(`🔍 WEEKDAY 날짜 파싱 실패`);
                return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
            }
            serialdate = this.getSerialDateFromDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
            XCON.log(`🔍 WEEKDAY 날짜를 시리얼로 변환: ${serialdate}`);
        } else {
            // 시리얼 날짜인 경우
            serialdate = parseFloat(cleanArg1);
            XCON.log(`🔍 WEEKDAY 시리얼 날짜: ${serialdate}`);
        }
        
        // 두 번째 인자 (return_type) 처리
        let return_type = 1;
        if (args.length === 2) {
            return_type = parseFloat(this.calcEngine.getValueFromArg(args[1]));
            XCON.log(`🔍 WEEKDAY return_type: ${return_type}`);
        }
        
        if (!isNaN(serialdate)) {
            const dt = this.getDateFromSerialDate(serialdate);
            XCON.log(`🔍 WEEKDAY 변환된 날짜: ${dt}`);
            let day = dt.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
            XCON.log(`🔍 WEEKDAY JavaScript getDay() 결과: ${day}`);
            
            if (return_type === 1) {
                // Excel 기본: 1=일요일, 2=월요일, ..., 7=토요일
                day += 1;
                XCON.log(`🔍 WEEKDAY return_type=1 조정 후: ${day}`);
            } else if (return_type === 2) {
                // 1=월요일, 2=화요일, ..., 7=일요일
                if (day === 0) {
                    day = 7;
                } else {
                    // day는 그대로
                }
                XCON.log(`🔍 WEEKDAY return_type=2 조정 후: ${day}`);
            } else if (return_type === 3) {
                // 0=월요일, 1=화요일, ..., 6=일요일
                if (day === 0) {
                    day = 6; // 일요일 → 6
                } else {
                    day -= 1; // 월요일(1) → 0, 화요일(2) → 1, ...
                }
                XCON.log(`🔍 WEEKDAY return_type=3 조정 후: ${day}`);
            }
            
            XCON.log(`🔍 WEEKDAY 최종 결과: ${day}`);
            return day.toString();
        }
        
        XCON.log(`🔍 WEEKDAY 유효하지 않은 날짜`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // YEAR 함수
    computeYear(argList) {
        XCON.log(`🔍 YEAR 함수 호출, argList: "${argList}"`);
        const s = this.calcEngine.getValueFromArg(argList);
        XCON.log(`🔍 YEAR getValueFromArg 결과: "${s}"`);
        const cleanS = s.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        XCON.log(`🔍 YEAR 따옴표 제거 후: "${cleanS}"`);
        
        // 먼저 문자열이 날짜 형식인지 확인 (하이픈, 슬래시 등이 포함된 경우)
        if (cleanS.includes('-') || cleanS.includes('/') || cleanS.includes(' ')) {
            XCON.log(`🔍 YEAR 날짜 형식 문자열로 판단`);
            let date = new Date(cleanS);
            if (!isNaN(date.getTime())) {
                XCON.log(`🔍 YEAR 문자열 날짜 파싱 성공: ${date}`);
                const year = date.getFullYear();
                XCON.log(`🔍 YEAR 문자열에서 추출한 연도: ${year}`);
                return year.toString();
            }
        }
        
        // 순수한 숫자인 경우만 시리얼 날짜로 처리
        const serialdate = parseFloat(cleanS);
        XCON.log(`🔍 YEAR 시리얼 날짜 파싱: ${serialdate}`);
        if (!isNaN(serialdate) && serialdate >= 1 && cleanS === serialdate.toString()) {
            XCON.log(`🔍 YEAR 순수한 숫자로 시리얼 날짜 처리`);
            XCON.log(`🔍 YEAR getDateFromSerialDate 호출 전`);
            const date = this.getDateFromSerialDate(serialdate);
            XCON.log(`🔍 YEAR getDateFromSerialDate 결과: ${date}`);
            const year = date.getFullYear();
            XCON.log(`🔍 YEAR 시리얼에서 추출한 연도: ${year}`);
            return year.toString();
        }
        
        // 일반 문자열 날짜 형식 시도
        let date = new Date(cleanS);
        if (!isNaN(date.getTime())) {
            XCON.log(`🔍 YEAR 일반 문자열 날짜 파싱 성공: ${date}`);
            const year = date.getFullYear();
            XCON.log(`🔍 YEAR 일반 문자열에서 추출한 연도: ${year}`);
            return year.toString();
        }
        
        // 시리얼 날짜가 1보다 작은 경우
        if (!isNaN(serialdate) && serialdate < 1) {
            XCON.log(`🔍 YEAR 시리얼 날짜가 1보다 작음, 1900 반환`);
            return "1900";
        }
        
        XCON.log(`🔍 YEAR 함수 오류: 유효하지 않은 인수`);
        return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
    }

    // 헬퍼 함수들
    getSerialDateFromDate(year, month, day) {
        // 1900년 1월 1일을 기준으로 시리얼 날짜 계산
        const baseDate = new Date(1900, 0, 1); // 1900년 1월 1일
        const targetDate = new Date(year, month - 1, day); // month는 0-based
        const timeDiff = targetDate.getTime() - baseDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // Excel의 1900년 윤년 버그 보정 (1900년 2월 29일이 존재한다고 가정)
        let serialDate = daysDiff + 1; // 1900년 1월 1일이 1이므로 +1
        
        // Excel의 1900년 윤년 버그 보정 (정적 속성과 인스턴스 속성 모두 확인)
        const treat1900AsLeapYear = this.calcEngine.Treat1900AsLeapYear || 
                                   (typeof CalcEngine !== 'undefined' && CalcEngine.Treat1900AsLeapYear) || 
                                   true; // 기본값으로 true 사용
        
        if (treat1900AsLeapYear && serialDate > 59) {
            serialDate += 1; // 1900년 2월 29일 이후 날짜는 +1
        }
        
        return serialDate;
    }

    getDateFromSerialDate(serialDate) {
        let days = Math.floor(serialDate);
        
        // Excel의 1900년 윤년 버그 보정 (정적 속성과 인스턴스 속성 모두 확인)
        const treat1900AsLeapYear = this.calcEngine.Treat1900AsLeapYear || 
                                   (typeof CalcEngine !== 'undefined' && CalcEngine.Treat1900AsLeapYear) || 
                                   true; // 기본값으로 true 사용
        
        // Excel의 1900년 윤년 버그 보정
        if (treat1900AsLeapYear && days > 60) {
            days -= 1; // 1900년 2월 29일 이후 날짜는 -1
        } else if (days === 60) {
            // 1900년 2월 29일 (존재하지 않는 날짜)을 1900년 2월 28일로 처리
            days = 59;
        }
        
        const baseDate = new Date(1900, 0, 1); // 1900년 1월 1일
        return new Date(baseDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    }

    toOADate(date) {
        // OLE Automation Date는 1899년 12월 30일을 기준으로 함 (UTC 기준)
        const baseDate = new Date(Date.UTC(1899, 11, 30)); // UTC로 생성
        
        // 입력 날짜도 UTC 기준으로 변환
        const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 
                                         date.getHours(), date.getMinutes(), date.getSeconds()));
        
        const timeDiff = utcDate.getTime() - baseDate.getTime();
        const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
        
        XCON.log(`🔍 toOADate 계산: baseDate=${baseDate}, utcDate=${utcDate}, daysDiff=${daysDiff}`);
        
        // Excel의 1900년 윤년 버그 보정 (정적 속성과 인스턴스 속성 모두 확인)
        const treat1900AsLeapYear = this.calcEngine.Treat1900AsLeapYear || 
                                   (typeof CalcEngine !== 'undefined' && CalcEngine.Treat1900AsLeapYear) || 
                                   true; // 기본값으로 true 사용
        
        // Excel의 1900년 윤년 버그 보정
        if (treat1900AsLeapYear && daysDiff > 59) {
            const result = daysDiff + 1;
            XCON.log(`🔍 toOADate 윤년 버그 보정 적용: ${daysDiff} → ${result}`);
            return result;
        }
        
        XCON.log(`🔍 toOADate 최종 결과: ${daysDiff}`);
        return daysDiff;
    }

    fromOADate(oaDate) {
        let days = oaDate;
        
        // Excel의 1900년 윤년 버그 보정 (정적 속성과 인스턴스 속성 모두 확인)
        const treat1900AsLeapYear = this.calcEngine.Treat1900AsLeapYear || 
                                   (typeof CalcEngine !== 'undefined' && CalcEngine.Treat1900AsLeapYear) || 
                                   true; // 기본값으로 true 사용
        
        if (treat1900AsLeapYear && days > 60) {
            days -= 1;
            XCON.log(`🔍 fromOADate 윤년 버그 보정 적용: ${oaDate} → ${days}`);
        }
        
        // UTC 기준으로 계산
        const baseDate = new Date(Date.UTC(1899, 11, 30)); // UTC로 생성
        const result = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        
        XCON.log(`🔍 fromOADate 계산: baseDate=${baseDate}, days=${days}, result=${result}`);
        return result;
    }
}

// Export
// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineDateTimeFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineDateTimeFunctions = CalcEngineDateTimeFunctions;
}