/**
 * CalcEngine Lookup & Reference Functions
 * 조회 및 참조 관련 함수들
 */

class CalcEngineLookupFunctions {
    constructor(calcEngine) {
        this.calcEngine = calcEngine;
        this.initLookupFunctions();
    }

    initLookupFunctions() {
        // 조회 및 참조 함수들
        this.calcEngine.addFunction("CHOOSE", this.computeChoose.bind(this));
        this.calcEngine.addFunction("COLUMN", this.computeColumn.bind(this));
        this.calcEngine.addFunction("HLOOKUP", this.computeHLookUp.bind(this));
        this.calcEngine.addFunction("INDEX", this.computeIndex.bind(this));
        this.calcEngine.addFunction("INDIRECT", this.computeIndirect.bind(this));
        this.calcEngine.addFunction("MATCH", this.computeMatch.bind(this));
        this.calcEngine.addFunction("OFFSET", this.computeOffSet.bind(this));
        this.calcEngine.addFunction("VLOOKUP", this.computeVLookUp.bind(this));
    }

    // CHOOSE 함수
    computeChoose(arg) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(arg);
        if (args.length < 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const s3 = this.calcEngine.getValueFromArg(args[0]);
        const loc = parseInt(s3);
        
        if (isNaN(loc) || loc > args.length - 1 || loc < 1) {
            return "#VALUE!";
        }
        
        let result = this.calcEngine.getValueFromArg(args[loc]);
        
        // 문자열 리터럴에서 따옴표 제거
        if (typeof result === 'string' && result.startsWith('"') && result.endsWith('"')) {
            result = result.slice(1, -1);
        }
        
        return result;
    }

    // COLUMN 함수
    computeColumn(arg) {
        if (!arg || arg.length === 0) {
            return this.calcEngine.colIndex(this.calcEngine.cell).toString();
        }
        return this.calcEngine.colIndex(arg).toString();
    }

    // HLOOKUP 함수
    computeHLookUp(range) {
        const s = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        let lookUp = this.calcEngine.getValueFromArg(s[0]);
        lookUp = lookUp.replace(new RegExp(this.calcEngine.TIC, 'g'), "").toUpperCase();
        
        const r = s[1].replace(/"/g, "");
        const o1 = this.calcEngine.getValueFromArg(s[2]).replace(/"/g, "");
        const d = parseFloat(o1);
        
        if (isNaN(d)) {
            return "#N/A";
        }
        
        const row = Math.floor(d);
        let match = true;
        
        if (s.length === 4) {
            match = this.calcEngine.getValueFromArg(s[3]) === this.calcEngine.TRUEVALUESTR;
        }
        
        const typeIsNumber = match ? !isNaN(parseFloat(lookUp)) : false;
        let i = r.indexOf(":");
        
        if (i === -1) {
            return "#N/A";
        }
        
        const k = r.substring(0, i).lastIndexOf(this.calcEngine.sheetToken);
        let grd = this.calcEngine.grid;
        const family = this.calcEngine.getSheetFamilyItem(this.calcEngine.grid);
        
        if (k > -1) {
            this.calcEngine.grid = family.TokenToParentObject[r.substring(0, k + 1)];
        }
        
        const row1 = this.calcEngine.rowIndex(r.substring(0, i));
        const col1 = this.calcEngine.colIndex(r.substring(0, i));
        const row2 = this.calcEngine.rowIndex(r.substring(i + 1));
        const col2 = this.calcEngine.colIndex(r.substring(i + 1));
        
        let val = "";
        let lastCol = col1;
        let s1 = "";
        let d1 = 0;
        
        for (let col = col1; col <= col2; col++) {
            s1 = this.calcEngine.getValueFromParentObject(this.calcEngine.grid, row1, col)
                .toString().toUpperCase().replace(/"/g, "");
            
            if (s1 === lookUp || 
                (match && (typeIsNumber ? 
                    (!isNaN(parseFloat(s1)) && (parseFloat(s1) > parseFloat(lookUp))) : 
                    (s1.localeCompare(lookUp) > 0)))) {
                if (s1 === lookUp) {
                    lastCol = col;
                }
                break;
            }
            lastCol = col;
        }
        
        if (match || s1 === lookUp) {
            val = this.calcEngine.getValueFromParentObject(this.calcEngine.grid, row + row1 - 1, lastCol).toString();
            
            if (val.length > 0 && val[0] === this.calcEngine.FormulaCharacter) {
                val = this.calcEngine.parseFormula(val);
            }
            
            const dVal = parseFloat(val);
            if (val.length > 0 && val[0] !== this.calcEngine.TIC && isNaN(dVal)) {
                val = this.calcEngine.TIC + val + this.calcEngine.TIC;
            }
        } else {
            val = "#N/A";
        }
        
        this.calcEngine.grid = grd;
        return val;
    }

    // 헬퍼 함수
    matchCompare(value1, value2) {
        const num1 = parseFloat(value1);
        const num2 = parseFloat(value2);
        
        if (!isNaN(num1) && !isNaN(num2)) {
            return num1 - num2;
        }
        
        return value1.localeCompare(value2);
    }

    // INDEX 함수
    computeIndex(arg) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(arg);
        if (args.length > 3 || args.length === 0) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        let r = args[0];
        r = r.replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        const i = r.indexOf(":");
        
        if (i === -1) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        if (arg.indexOf("#N/A") > -1 || arg.indexOf("#N~A") > -1) {
            return "#N/A";
        }
        
        const sheet = this.calcEngine.getSheetTokenFromReference(r);
        
        let row = 1;
        let col = 1;
        
        if (args.length >= 2) {
            const d = parseFloat(this.calcEngine.getValueFromArg(args[1]));
            if (!isNaN(d)) {
                row = Math.floor(d);
            } else {
                return "#REF";
            }
        }
        
        if (args.length >= 3) {
            const d = parseFloat(this.calcEngine.getValueFromArg(args[2]));
            if (!isNaN(d)) {
                col = Math.floor(d);
            } else {
                return "#REF";
            }
        }
        
        const top = this.calcEngine.rowIndex(r.substring(0, i));
        const bot = this.calcEngine.rowIndex(r.substring(i + 1));
        const left = this.calcEngine.colIndex(r.substring(0, i));
        const right = this.calcEngine.colIndex(r.substring(i + 1));
        
        if (row > bot - top + 1 || col > right - left + 1) {
            return "#REF";
        }
        
        row = this.calcEngine.rowIndex(r.substring(0, i)) + row - 1;
        col = this.calcEngine.colIndex(r.substring(0, i)) + col - 1;
        
        return this.calcEngine.getValueFromArg(
            `${sheet}${this.calcEngine.RangeInfo.getAlphaLabel(col)}${row}`
        );
    }

    // INDIRECT 함수
    computeIndirect(args) {
        if (args[args.length - 1] === this.calcEngine.BMARKER) {
            args = this.calcEngine.getValueFromArg(args);
        }
        
        const arg = this.calcEngine.splitArgsPreservingQuotedCommas(args);
        
        if (arg.length === 0 || arg.length > 2) {
            throw new Error("No. of argument cant be less than 1 or more than 2.");
        }
        
        arg[0] = arg[0].toUpperCase();
        this.calcEngine.putTokensForSheets(arg[0]);
        const sheetToken1 = this.calcEngine.sheetToken(arg[0].replace(new RegExp(this.calcEngine.TIC, 'g'), ""));
        
        if (sheetToken1 && sheetToken1.length > 0) {
            arg[0] = arg[0].replace(sheetToken1, "");
        }
        
        if (arg.length === 2 && arg[1] === this.calcEngine.FALSEVALUESTR) {
            // R1C1 형식 처리
            const hasTIC = arg[0].startsWith(this.calcEngine.TIC) && arg[0].endsWith(this.calcEngine.TIC);
            const rcCell = arg[0].toUpperCase().replace(new RegExp(this.calcEngine.TIC, 'g'), "");
            const cells = rcCell.split(':');
            
            if (cells.length > 2) {
                return "#REF!";
            }
            
            const rc = cells[0].split(/[RC]/);
            const filtered = rc.filter(x => x !== "");
            
            if (filtered.length >= 2) {
                arg[0] = this.calcEngine.RangeInfo.getAlphaLabel(parseInt(filtered[1])) + filtered[0];
                
                if (cells.length === 2) {
                    const st = this.calcEngine.sheetToken(cells[1]);
                    if (st && st.length > 0) {
                        cells[1] = cells[1].replace(st, "");
                    }
                    const rc2 = cells[1].split(/[RC]/);
                    const filtered2 = rc2.filter(x => x !== "");
                    if (filtered2.length >= 2) {
                        arg[0] += ":" + this.calcEngine.RangeInfo.getAlphaLabel(parseInt(filtered2[1])) + filtered2[0];
                    }
                }
                
                if (hasTIC) {
                    arg[0] = this.calcEngine.TIC + arg[0] + this.calcEngine.TIC;
                }
            }
        }
        
        let cellReference = "";
        if (arg[0].startsWith(this.calcEngine.TIC)) {
            cellReference = sheetToken1 + arg[0].replace(new RegExp(this.calcEngine.TIC, 'g'), "");
        } else {
            if (this.calcEngine.isCellReference(arg[0])) {
                cellReference = this.calcEngine.getValueFromArg(sheetToken1 + arg[0]);
                
                if (this.calcEngine.namedRanges[cellReference.toUpperCase()]) {
                    cellReference = this.calcEngine.namedRanges[cellReference.toUpperCase()].toString();
                    cellReference = cellReference.toUpperCase();
                    cellReference = cellReference.replace(/\$/g, "");
                    this.calcEngine.putTokensForSheets(cellReference);
                    if (!cellReference.startsWith(this.calcEngine.sheetToken)) {
                        cellReference = sheetToken1 + cellReference;
                    }
                } else {
                    const scopedRange = this.calcEngine.checkIfScopedRange(cellReference.toUpperCase());
                    if (scopedRange) {
                        cellReference = scopedRange.toString();
                        cellReference = cellReference.toUpperCase();
                        cellReference = cellReference.replace(/\$/g, "");
                        this.calcEngine.putTokensForSheets(cellReference);
                        if (!cellReference.startsWith(this.calcEngine.sheetToken)) {
                            cellReference = sheetToken1 + cellReference;
                        }
                    } else if (this.calcEngine.isCellReference(cellReference)) {
                        return this.calcEngine.getValueFromArg(cellReference);
                    } else {
                        return cellReference;
                    }
                }
            } else {
                cellReference = arg[0];
            }
        }
        
        if (!this.calcEngine.isCellReference(cellReference)) {
            let scopedRange = "";
            
            if (this.calcEngine.namedRanges[cellReference.toUpperCase()]) {
                cellReference = this.calcEngine.namedRanges[cellReference.toUpperCase()].toString();
                if (!cellReference.startsWith(this.calcEngine.sheetToken)) {
                    cellReference = sheetToken1 + cellReference;
                }
            } else if ((scopedRange = this.calcEngine.checkIfScopedRange(cellReference.toUpperCase()))) {
                cellReference = scopedRange.toString();
                if (!cellReference.startsWith(this.calcEngine.sheetToken)) {
                    cellReference = sheetToken1 + cellReference;
                }
            } else {
                return "#REF!";
            }
        }
        
        if (cellReference.includes(":")) {
            return cellReference;
        }
        
        return this.calcEngine.getValueFromArg(cellReference);
    }

    // MATCH 함수
    computeMatch(arg) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(arg);
        if (args.length !== 3 && args.length !== 2) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const r = args[1];
        const i = r.indexOf(":");
        
        if (i === -1) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.invalid_arguments];
        }
        
        let m = 1;
        if (args.length === 3) {
            const d = parseFloat(this.calcEngine.getValueFromArg(args[2]));
            if (!isNaN(d)) {
                m = Math.floor(d);
            }
        }
        
        const searchItem = this.calcEngine.getValueFromArg(args[0]).replace(new RegExp(this.calcEngine.TIC, 'g'), "").toUpperCase();
        const cells = this.calcEngine.getCellsFromArgs(r);
        let index = 1;
        let oldValue = "";
        let newValue;
        
        for (const s of cells) {
            newValue = this.calcEngine.getValueFromArg(s).replace(new RegExp(this.calcEngine.TIC, 'g'), "").toUpperCase();
            
            if (oldValue !== "") {
                if (m === 1) {
                    if (this.matchCompare(newValue, oldValue) < 0) {
                        index = -1;
                        break;
                    }
                } else if (m === -1) {
                    if (this.matchCompare(newValue, oldValue) > 0) {
                        index = -1;
                        break;
                    }
                }
            }
            
            if (m === 0 && newValue === searchItem) {
                break;
            } else if (m === 1 && this.matchCompare(searchItem, newValue) < 0) {
                index--;
                break;
            } else if (m === -1 && this.matchCompare(searchItem, newValue) > 0) {
                index--;
                break;
            }
            
            index++;
            oldValue = newValue;
        }
        
        if (m !== 0 && index === cells.length + 1) {
            index = cells.length;
        }
        
        if (index > 0 && index <= cells.length) {
            return index.toString();
        } else {
            return "#N/A";
        }
    }

    // OFFSET 함수
    computeOffSet(arg) {
        const args = this.calcEngine.splitArgsPreservingQuotedCommas(arg);
        if (args.length !== 3 && args.length !== 5) {
            return this.calcEngine.FormulaErrorStrings[this.calcEngine.wrong_number_arguments];
        }
        
        const r = args[0];
        const rows = parseInt(this.calcEngine.getValueFromArg(args[1])) || -1;
        const cols = parseInt(this.calcEngine.getValueFromArg(args[2])) || -1;
        
        let width = -1;
        let height = -1;
        
        if (args.length === 5) {
            height = (parseInt(this.calcEngine.getValueFromArg(args[3])) || 2) - 1;
            width = (parseInt(this.calcEngine.getValueFromArg(args[4])) || 2) - 1;
        }
        
        let i = r.indexOf(":");
        let singleCell = i === -1;
        
        if (singleCell) {
            i = r.length;
        }
        
        singleCell &= width <= 0 && height <= 0;
        const sheet = this.calcEngine.getSheetTokenFromReference(r);
        
        const row1 = this.calcEngine.rowIndex(r.substring(0, i)) + rows;
        const col1 = this.calcEngine.colIndex(r.substring(0, i)) + cols;
        const row2 = i < r.length ? this.calcEngine.rowIndex(r.substring(i + 1)) + rows : row1;
        const col2 = i < r.length ? this.calcEngine.colIndex(r.substring(i + 1)) + cols : col1;
        
        if (height < 1) {
            height = Math.abs(row1 - row2);
        }
        if (width < 1) {
            width = Math.abs(col1 - col2);
        }
        
        if (singleCell) {
            return this.calcEngine.computedValue(
                `${sheet}${this.calcEngine.RangeInfo.getAlphaLabel(col1)}${row1}`
            );
        } else {
            return `${sheet}${this.calcEngine.RangeInfo.getAlphaLabel(col1)}${row1}:${this.calcEngine.RangeInfo.getAlphaLabel(col1 + width)}${row1 + height}`;
        }
    }

    // VLOOKUP 함수
    computeVLookUp(range) {
        const s = this.calcEngine.splitArgsPreservingQuotedCommas(range);
        let lookUp = this.calcEngine.getValueFromArg(s[0]);
        lookUp = lookUp.replace(new RegExp(this.calcEngine.TIC, 'g'), "").toUpperCase();
        
        const r = s[1].replace(/"/g, "");
        const o1 = this.calcEngine.getValueFromArg(s[2]).replace(/"/g, "");
        const d = parseFloat(o1);
        
        if (isNaN(d) || o1 === "NaN") {
            return "#N/A";
        }
        
        const col = Math.floor(d);
        let match = true;
        
        if (s.length === 4) {
            match = this.calcEngine.getValueFromArg(s[3]) === this.calcEngine.TRUEVALUESTR;
        }
        
        const typeIsNumber = match ? !isNaN(parseFloat(lookUp)) : false;
        let i = r.indexOf(":");
        
        if (i === -1) {
            r = r + ":" + r;
            i = r.indexOf(":");
        }
        
        const k = r.substring(0, i).lastIndexOf(this.calcEngine.sheetToken);
        let grd = this.calcEngine.grid;
        const family = this.calcEngine.getSheetFamilyItem(this.calcEngine.grid);
        
        if (k > -1) {
            this.calcEngine.grid = family.TokenToParentObject[r.substring(0, k + 1)];
        }
        
        const row1 = this.calcEngine.rowIndex(r.substring(0, i));
        const col1 = this.calcEngine.colIndex(r.substring(0, i));
        const row2 = this.calcEngine.rowIndex(r.substring(i + 1));
        const col2 = this.calcEngine.colIndex(r.substring(i + 1));
        
        let val = "";
        let lastRow = row1;
        let s1 = "";
        let d1 = 0;
        
        for (let row = row1; row <= row2; row++) {
            s1 = this.calcEngine.getValueFromParentObject(this.calcEngine.grid, row, col1)
                .toString().toUpperCase().replace(/"/g, "");
            
            if (s1 === lookUp || 
                (match && (typeIsNumber ? 
                    (!isNaN(parseFloat(s1)) && (parseFloat(s1) > parseFloat(lookUp))) : 
                    (s1.localeCompare(lookUp) > 0)))) {
                if (s1.toUpperCase() === lookUp) {
                    lastRow = row;
                }
                break;
            }
            lastRow = row;
        }
        
        if (match || s1 === lookUp) {
            val = this.calcEngine.getValueFromParentObject(this.calcEngine.grid, lastRow, col + col1 - 1).toString();
            
            if (val.length > 0 && val[0] === this.calcEngine.FormulaCharacter) {
                val = this.calcEngine.parseFormula(val);
            }
            
            const dVal = parseFloat(val);
            if (val.length > 0 && val[0] !== this.calcEngine.TIC && isNaN(dVal)) {
                val = this.calcEngine.TIC + val + this.calcEngine.TIC;
            }
        }
        
        return val;
    }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalcEngineLookupFunctions;
} else if (typeof window !== 'undefined') {
    window.CalcEngineLookupFunctions = CalcEngineLookupFunctions;
}