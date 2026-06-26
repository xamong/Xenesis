/**
 * CalcEngine - JavaScript port of C# Formula Calculation Engine
 * Preserves all existing functionality from the original C# implementation
 */

class CalcEngine {
    constructor(parentObject) {
        // Core properties
        this.grid = parentObject;
        this.grid.wireParentObject();
        this.grid.valueChanged = this.grid_ValueChanged.bind(this);
        
        // Constants
        this.ABSOLUTEZERO = 1e-20;
        
        // Character constants for operations
        this.CHAR_add = '+';
        this.CHAR_subtract = '-';
        this.CHAR_multiply = '*';
        this.CHAR_divide = '/';
        this.CHAR_and = 'i';
        this.CHAR_or = 'w';
        this.CHAR_equal = '=';
        this.CHAR_noequal = 'p';
        this.CHAR_greater = '>';
        this.CHAR_less = '<';
        this.CHAR_greatereq = 'h';
        this.CHAR_lesseq = 'f';
        this.CHAR_EM = 'r';
        this.CHAR_EP = 'x';
        
        // Special operation characters
        this.CHAR_ORop = String.fromCharCode(139);
        this.CHAR_ANDop = String.fromCharCode(140);
        this.CHAR_IFop = String.fromCharCode(142);
        this.CHAR_XORop = String.fromCharCode(141);
        this.CHAR_THENop = String.fromCharCode(143);
        this.CHAR_ELSEop = String.fromCharCode(144);
        this.CHAR_NOTop = String.fromCharCode(145);
        
        // Markers and delimiters
        this.BMARKER = String.fromCharCode(146);
        this.BMARKER2 = this.BMARKER + this.BMARKER;
        this.BRACELEFT = "{";
        this.BRACERIGHT = "}";
        this.BRACERIGHTnLEFT = ")(";
        this.BRACEDELIMETER = [','];
        this.CHARTIC = "'";
        
        // Token constants
        this.TOKEN_add = 'a';
        this.TOKEN_subtract = 's';
        this.TOKEN_multiply = 'm';
        this.TOKEN_divide = 'd';
        this.TOKEN_and = 'c';
        this.TOKEN_or = String.fromCharCode(126);
        this.TOKEN_equal = 'e';
        this.TOKEN_less = 'l';
        this.TOKEN_greater = 'g';
        this.TOKEN_lesseq = 'k';
        this.TOKEN_greatereq = 'j';
        this.TOKEN_noequal = 'o';
        this.TOKEN_EP = 't';
        this.TOKEN_EM = 'v';
        this.TOKEN_ORop = String.fromCharCode(132);
        this.TOKEN_ANDop = String.fromCharCode(133);
        this.TOKEN_XORop = String.fromCharCode(134);
        this.TOKEN_IFop = String.fromCharCode(135);
        this.TOKEN_THENop = String.fromCharCode(136);
        this.TOKEN_ELSEop = String.fromCharCode(137);
        this.TOKEN_NOTop = String.fromCharCode(138);
        
        // Bracket markers
        this.RIGHTBRACKET = String.fromCharCode(131);
        this.LEFTBRACKET = String.fromCharCode(130);
        this.IFMarker = "qIF" + String.fromCharCode(130);
        
        // Configuration flags
        this.allowShortCircuitIFs = false;
        this.alwaysComputeDuringRefresh = true;
        this.calculationsSuspended = false;
        this.checkDanglingStack = false;
        this.supportLogicalOperators = false;
        this.supportRangeOperands = false;
        this.supportsSheetRanges = true;
        this.throwCircularException = false;
        this.rethrowExceptions = true;
        this.rethrowLibraryComputationExceptions = false;
        this.useDatesInCalcs = false;
        this.useDependencies = false;
        this.useNoAmpersandQuotes = false;
        this.treatStringsAsZero = true;
        this.excelLikeComputations = false;
        this.preserveFormula = false;
        this.ensureIFCallDuringShortCircuit = false;
        this.forceRefreshCall = false;
        this.getValueFromArgPreserveLeadingZeros = false;
        this.ignoreValueChanged = false;
        
        // Data structures
        this._formulaInfoTable = {};
        this.dependentCells = {};
        this.dependentFormulaCells = {};
        this.refreshedCells = {};
        this.namedRanges = {};
        this.namedRangesNonScoped = {};
        this.libraryFunctions = {};
        this.processedCells = [];
        this.circCheckList = [];
        this.iterationValues = {};
        
        // String constants
        this.TRUEVALUESTR = "TRUE";
        this.FALSEVALUESTR = "FALSE";
        this.TIC = "\"";
        this.STRING_empty = "";
        this.STRING_and = "&";
        this.STRING_or = "^";
        this.STRING_E = "E";
        this.STRING_EM = "E-";
        this.STRING_EP = "E+";
        this.STRING_fixedreference = "$";
        this.STRING_greatereq = ">=";
        this.STRING_lesseq = "<=";
        this.STRING_noequal = "<>";
        this.UNIQUESTRINGMARKER = String.fromCharCode(127);
        
        // Numeric properties
        this.calcID = 0;
        this.columnMaxCount = -1;
        this.rowMaxCount = -1;
        this.computedValueLevel = 0;
        this.computeFunctionLevel = 0;
        this.dependencyLevel = 0;
        this.iterationMaxCount = 0;
        this.iterationMaxTolerance = 0.001;
        this.maximumRecursiveCalls = 100;
        
        // Other properties
        this.cell = "";
        this.dateTime1900 = new Date(1900, 0, 1, 0, 0, 0);
        this.dateTime1900Double = this.dateTime1900.valueOf();
        this.tempSheetPlaceHolder = String.fromCharCode(133);
        this.markerChar = '`';
        this.markers = "()+-*/=><.,!";
        this.sheetToken = '!';
        this.validFunctionNameChars = "_";
        this.validPrecedingChars = null;
        this.sortedSheetNames = null;
        this.variableNamesToTokens = null;
        this.variableTokensToNames = null;
        this.libraryComputationException = null;
        this.rand = null;
        this.errorStrings = null;
        this.formulaErrorStrings = null;
        this.reservedWordOperators = null;
        
        // Error string indices
        this.operators_cannot_start_an_expression = 0;
        this.cannot_parse = 1;
        this.bad_library = 2;
        this.invalid_char_in_front_of = 3;
        this.number_contains_2_decimal_points = 4;
        this.expression_cannot_end_with_an_operator = 5;
        this.invalid_characters_following_an_operator = 6;
        this.invalid_char_in_number = 7;
        this.mismatched_parentheses = 8;
        this.unknown_formula_name = 9;
        this.requires_a_single_argument = 10;
        this.requires_3_args = 11;
        this.invalid_Math_argument = 12;
        this.requires_2_args = 13;
        this.bad_index = 14;
        this.too_complex = 15;
        this.circular_reference_ = 16;
        this.missing_formula = 17;
        this.improper_formula = 18;
        this.invalid_expression = 19;
        this.cell_empty = 20;
        this.bad_formula = 21;
        this.empty_expression = 22;
        this.virtual_mode_required = 23;
        this.mismatched_tics = 24;
        this.wrong_number_arguments = 25;
        this.invalid_arguments = 26;
        this.iterations_dont_converge = 27;
        this.already_registered = 28;
        this.calculation_overflow = 29;
        this.missing_sheet = 30;
        
        // Reserved word indices
        this.reservedWord_OR = 0;
        this.reservedWord_AND = 1;
        this.reservedWord_XOR = 2;
        this.reservedWord_IF = 3;
        this.reservedWord_THEN = 4;
        this.reservedWord_ELSE = 5;
        this.reservedWord_NOT = 6;
        
        // State flags
        this.inAPull = false;
        this.inHandleIterations = false;
        this.inRecalculateRange = false;
        this.isRangeOperand = false;
        this.lockDependencies = false;
        this.isError = false;
        
        // Initialize components
        this.initializeErrorStrings();
        this.initTokens();
        this.initLibraryFunctions();
        
        // Static properties simulation
        CalcEngine._formulaChar = CalcEngine._formulaChar || '=';
        CalcEngine._parseArgumentSeparator = CalcEngine._parseArgumentSeparator || ',';
        CalcEngine._parseDecimalSeparator = CalcEngine._parseDecimalSeparator || '.';
        CalcEngine._maxStackDepth = CalcEngine._maxStackDepth || 50;
        CalcEngine._tokenCount = CalcEngine._tokenCount || 0;
        CalcEngine._sheetFamilyID = CalcEngine._sheetFamilyID || 0;
        CalcEngine._modelToSheetID = CalcEngine._modelToSheetID || {};
        CalcEngine._sheetFamiliesList = CalcEngine._sheetFamiliesList || {};
        CalcEngine._defaultFamilyItem = CalcEngine._defaultFamilyItem || null;
        
        // Constants
        CalcEngine.Treat1900AsLeapYear = true;
        
        // Statistical constants
        this.factorialTable = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];
        this.gammaAs = [0.918938533204673, 0.000595238095238, 0.000793650793651, 0.002777777777778, 0.083333333333333];
        this.gauss_n = 16;
        this.gauss_w = [
            0.09654008851, 0.09563872008, 0.09384439908, 0.09117387870,
            0.08765209300, 0.08331192423, 0.07819389579, 0.07234579411,
            0.06582222278, 0.05868409348, 0.05099805926, 0.04283589802,
            0.03427386291, 0.02539206531, 0.01627439473, 0.00701861001
        ];
        this.gauss_x = [
            0.04830766569, 0.14447196158, 0.23928736225, 0.33186860228,
            0.42135127613, 0.50689990893, 0.58771575724, 0.66304426693,
            0.73218211874, 0.79448379597, 0.84936761373, 0.89632115577,
            0.93490607594, 0.96476225559, 0.98561151155, 0.99726386185
        ];
    }

    // Initialize error strings
    initializeErrorStrings() {
        this._FormulaErrorStrings = [
            "binary operators cannot start an expression",
            "cannot parse",
            "bad library",
            "invalid char in front of",
            "number contains 2 decimal points",
            "expression cannot end with an operator",
            "invalid characters following an operator",
            "invalid character in number",
            "mismatched parentheses",
            "unknown formula name",
            "requires a single argument",
            "requires 3 arguments",
            "invalid Math argument",
            "requires 2 arguments",
            "#NAME?",
            "too complex",
            "circular reference: ",
            "missing formula",
            "improper formula",
            "invalid expression",
            "cell empty",
            "bad formula",
            "empty expression",
            "",
            "mismatched string quotes",
            "wrong number of arguments",
            "invalid arguments",
            "iterations do not converge",
            "Control named '{0}' is already registered",
            "Calculation overflow",
            "Missing sheet"
        ];
        
        this.reloadErrorStrings();
    }

    // Initialize tokens
    initTokens() {
        this.tokens = [
            this.TOKEN_add,
            this.TOKEN_subtract,
            this.TOKEN_multiply,
            this.TOKEN_divide,
            this.TOKEN_less,
            this.TOKEN_greater,
            this.TOKEN_equal,
            this.TOKEN_lesseq,
            this.TOKEN_greatereq,
            this.TOKEN_noequal,
            this.TOKEN_and,
            this.TOKEN_or
        ];
    }

    // Get formula error strings
    get FormulaErrorStrings() {
        this.isError = true;
        return this._FormulaErrorStrings;
    }

    // Reload error strings
    reloadErrorStrings() {
        if (!this.formulaErrorStrings) {
            this.formulaErrorStrings = [];
        }
        this.formulaErrorStrings.length = 0;
        this.formulaErrorStrings.push(...this._FormulaErrorStrings);
    }

    // Get error strings
    get ErrorStrings() {
        if (!this.errorStrings) {
            this.errorStrings = [];
            this.errorStrings.push(
                "N/A", "#VALUE!", "#REF!", "#DIV/0!", 
                "#NUM!", "#NAME?", "#NULL!"
            );
        }
        return this.errorStrings;
    }

    set ErrorStrings(value) {
        this.errorStrings = value;
    }

    // Get reserved word operators
    get ReservedWordOperators() {
        if (!this.reservedWordOperators) {
            this.reservedWordOperators = [
                " or ", " and ", " xor ", "if ", 
                " then ", " else ", "not "
            ];
        }
        return this.reservedWordOperators;
    }

    set ReservedWordOperators(value) {
        this.reservedWordOperators = value;
    }

    // Get valid preceding characters
    get ValidPrecedingChars() {
        if (!this.validPrecedingChars) {
            this.validPrecedingChars = ` (+-*/^&<>=${CalcEngine.ParseArgumentSeparator}`;
        }
        return this.validPrecedingChars;
    }

    set ValidPrecedingChars(value) {
        this.validPrecedingChars = value;
    }

    // Static getters/setters
    static get FormulaCharacter() {
        if (!CalcEngine._formulaChar || CalcEngine._formulaChar === '\0') {
            CalcEngine._formulaChar = '=';
        }
        return CalcEngine._formulaChar;
    }

    static set FormulaCharacter(value) {
        CalcEngine._formulaChar = value;
    }

    static get ParseArgumentSeparator() {
        if (!CalcEngine._parseArgumentSeparator || CalcEngine._parseArgumentSeparator === '\0') {
            CalcEngine._parseArgumentSeparator = ',';
        }
        return CalcEngine._parseArgumentSeparator;
    }

    static set ParseArgumentSeparator(value) {
        CalcEngine._parseArgumentSeparator = value;
    }

    static get ParseDecimalSeparator() {
        if (!CalcEngine._parseDecimalSeparator || CalcEngine._parseDecimalSeparator === '\0') {
            CalcEngine._parseDecimalSeparator = '.';
        }
        return CalcEngine._parseDecimalSeparator;
    }

    static set ParseDecimalSeparator(value) {
        CalcEngine._parseDecimalSeparator = value;
    }

    static get MaxStackDepth() {
        if (!CalcEngine._maxStackDepth || CalcEngine._maxStackDepth === 0) {
            CalcEngine._maxStackDepth = 50;
        }
        return CalcEngine._maxStackDepth;
    }

    static set MaxStackDepth(value) {
        CalcEngine._maxStackDepth = value;
    }

    // Initialize library functions
    initLibraryFunctions() {
        this.libraryFunctions = {};
        
        // Fire pre-add function event
        if (this.prevAddFunction) {
            this.prevAddFunction(this, {});
        }
        
        // TODO: Add library functions here
        // this.addFunction("SUM", this.computeSum.bind(this));
        // this.addFunction("AVERAGE", this.computeAverage.bind(this));
        // etc.
        
        // Fire post-add function event
        if (this.postAddFunction) {
            this.postAddFunction(this, {});
        }
    }

    // Add a library function
    addFunction(name, func) {
        name = name.toUpperCase();
        if (!this.libraryFunctions[name]) {
            this.libraryFunctions[name] = func;
            return true;
        }
        return false;
    }

    // Remove a library function
    removeFunction(name) {
        if (this.libraryFunctions[name]) {
            delete this.libraryFunctions[name];
            return true;
        }
        return false;
    }

    // Get formula info table
    get FormulaInfoTable() {
        if (this.isSheeted) {
            const family = CalcEngine.getSheetFamilyItem(this.grid);
            if (!family.sheetFormulaInfoTable) {
                family.sheetFormulaInfoTable = {};
            }
            return family.sheetFormulaInfoTable;
        } else {
            if (!this._formulaInfoTable) {
                this._formulaInfoTable = {};
            }
            return this._formulaInfoTable;
        }
    }

    // Get dependent cells
    get DependentCells() {
        if (this.isSheeted) {
            const family = CalcEngine.getSheetFamilyItem(this.grid);
            if (!family.sheetDependentCells) {
                family.sheetDependentCells = {};
            }
            return family.sheetDependentCells;
        } else {
            if (!this.dependentCells) {
                this.dependentCells = {};
            }
            return this.dependentCells;
        }
    }

    // Get dependent formula cells
    get DependentFormulaCells() {
        if (this.isSheeted) {
            const family = CalcEngine.getSheetFamilyItem(this.grid);
            if (!family.sheetDependentFormulaCells) {
                family.sheetDependentFormulaCells = {};
            }
            return family.sheetDependentFormulaCells;
        } else {
            if (!this.dependentFormulaCells) {
                this.dependentFormulaCells = {};
            }
            return this.dependentFormulaCells;
        }
    }

    // Check if is sheeted
    get isSheeted() {
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        return family ? family.isSheeted : false;
    }

    // Get named ranges
    get NamedRanges() {
        if (!this.namedRanges) {
            this.namedRanges = {};
            this.namedRangesNonScoped = {};
        }
        return this.namedRanges;
    }

    set NamedRanges(value) {
        this.namedRanges = value;
        this.populateNamedRangesNonScoped();
    }

    // Populate non-scoped named ranges
    populateNamedRangesNonScoped() {
        if (!this.namedRangesNonScoped) {
            this.namedRangesNonScoped = {};
        }
        this.namedRangesNonScoped = {};
        for (const key in this.NamedRanges) {
            this.checkAddNonScopedNamedRange(key);
        }
    }

    // Check and add non-scoped named range
    checkAddNonScopedNamedRange(key) {
        const loc = key.indexOf('!');
        if (loc > -1) {
            const key1 = key.substring(loc + 1);
            if (!this.namedRangesNonScoped[key1]) {
                this.namedRangesNonScoped[key1] = this.NamedRanges[key];
            }
        }
    }

    // Add named range
    addNamedRange(name, range) {
        name = name.toUpperCase();
        if (!this.NamedRanges[name]) {
            this.NamedRanges[name] = range;
            this.checkAddNonScopedNamedRange(name);
            return true;
        }
        return false;
    }

    // Remove named range
    removeNamedRange(name) {
        name = name.toUpperCase();
        if (this.NamedRanges[name]) {
            delete this.NamedRanges[name];
            this.populateNamedRangesNonScoped();
            return true;
        }
        return false;
    }

    // Get iteration values
    get IterationValues() {
        if (!this.iterationValues) {
            this.iterationValues = {};
        }
        return this.iterationValues;
    }

    // Parse and compute formula
    parseAndComputeFormula(formula) {
        XCON.log(`🔍 CalcEngine.parseAndComputeFormula 시작: "${formula}"`);
        
        if (formula.length > 0 && formula[0] === CalcEngine.FormulaCharacter) {
            formula = formula.substring(1);
        }
        if (formula.length > 0 && formula[0] === '+') {
            formula = formula.substring(1);
        }
        if (formula.length > 1 && formula[0] === CalcEngine.ParseDecimalSeparator) {
            if (formula[1] >= '0' && formula[1] <= '9') {
                formula = "0" + CalcEngine.ParseDecimalSeparator + formula.substring(1);
            }
        }
        
        const tempFormula = formula.replace(/ /g, "");
        
        // Validate parentheses
        for (let i = tempFormula.indexOf("("); i !== -1 && i < tempFormula.length; i++) {
            if (i > 0) {
                if (!isNaN(tempFormula[i - 1])) {
                    if (!this.checkHasCharBeforeNumber(tempFormula.substring(0, i))) {
                        throw new Error(this.FormulaErrorStrings[this.bad_formula] + " " + tempFormula.substring(0, i + 1));
                    }
                }
                const next = tempFormula.substring(i + 1).indexOf('(');
                if (next === -1) {
                    break;
                } else {
                    i += next;
                }
            }
        }
        
        for (let i = tempFormula.indexOf(")"); i !== -1 && i < tempFormula.length - 1; i++) {
            if (!isNaN(tempFormula[i + 1])) {
                throw new Error(this.FormulaErrorStrings[this.bad_formula] + " " + tempFormula.substring(0, i + 2));
            }
            const next = tempFormula.substring(i + 1).indexOf(')');
            if (next === -1) {
                break;
            } else {
                i += next;
            }
        }
        
        const s = this.parse(formula);
        XCON.log(`🔍 parse 결과: "${s}"`);
        
        const result = this.computedValue(s);
        XCON.log(`🔍 computedValue 결과:`, result, typeof result);
        
        return result;
    }

    // Parse formula
    parseFormula(formula) {
        if (formula.length > 0 && formula[0] === CalcEngine.FormulaCharacter) {
            formula = formula.substring(1);
        }
        if (formula.length > 0 && formula[0] === '+') {
            formula = formula.substring(1);
        }
        
        this.isRangeOperand = this.supportRangeOperands && this.isRange(formula);
        
        if (this.checkDanglingStack && formula.replace(/ /g, "").indexOf(this.BRACERIGHTnLEFT) > -1) {
            this.computedValueLevel = 0;
            return this.FormulaErrorStrings[this.improper_formula];
        }
        
        return this.parse(formula.trim());
    }

    // Parse function
    parse(text) {
        if (!text || text.length === 0) {
            return text;
        }
        
        this.getFormulaText(text);
        
        if (this.supportLogicalOperators) {
            this.markReserveWords(text);
        }
        
        if (CalcEngine.FormulaCharacter && CalcEngine.FormulaCharacter === text[0]) {
            text = text.substring(1);
        }
        
        if (Object.keys(this.NamedRanges).length > 0) {
            if (this.NamedRanges[text.toUpperCase()]) {
                text = this.NamedRanges[text.toUpperCase()].toUpperCase();
            } else {
                let scopedRange = "";
                if (this.checkIfScopedRange(text.toUpperCase(), scopedRange)) {
                    text = scopedRange.toUpperCase();
                }
            }
        }
        
        const saveResult = this.saveStrings(text);
        text = saveResult.text;
        const formulaStrings = saveResult.strings;
        
        text = text.replace(this.BRACELEFT, this.TIC);
        text = text.replace(this.BRACERIGHT, this.TIC);
        text = text.replace("-+", "-");
        
        // 문자열 마커를 제외하고 대문자 변환
        text = this.toUpperCaseExceptStrings(text, formulaStrings);
        
        if (text.indexOf(this.sheetToken) > -1) {
            const family = CalcEngine.getSheetFamilyItem(this.grid);
            if (family.SheetNameToParentObject && Object.keys(family.SheetNameToParentObject).length > 0) {
                try {
                    this.putTokensForSheets(text);
                } catch (ex) {
                    if (this.rethrowExceptions) {
                        throw ex;
                    } else {
                        return ex.message;
                    }
                }
            }
        }
        
        if (this.isRangeOperand) {
            this.isRangeOperand = false;
            return this.getCellFrom(this.parseSimple(text));
        }
        
        text = text.replace(/ /g, "");
        text = text.replace("=>", ">=");
        text = text.replace("=<", "<=");
        
        try {
            text = this.markLibraryFormulas(text);
        } catch (ex) {
            if (this.rethrowExceptions) {
                throw ex;
            } else {
                return ex.message;
            }
        }
        
        let i;
        while ((i = text.indexOf(')')) > -1) {
            const k = text.substring(0, i).lastIndexOf('(');
            if (k === -1) {
                throw new Error(this.FormulaErrorStrings[this.mismatched_parentheses]);
            }
            if (k === i - 1) {
                throw new Error(this.FormulaErrorStrings[this.empty_expression]);
            }
            const s = text.substring(k + 1, i);
            text = text.substring(0, k) + this.parseSimple(s) + text.substring(i + 1);
        }
        
        if (text.indexOf('(') > -1) {
            throw new Error(this.FormulaErrorStrings[this.mismatched_parentheses]);
        }
        
        let retValue = this.parseSimple(text);
        if (formulaStrings && Object.keys(formulaStrings).length > 0) {
            retValue = this.setStrings(retValue, formulaStrings);
        }
        
        return retValue;
    }

    // Compute formula
    computeFormula(parsedFormula) {
        if (this.throwCircularException) {
            if (this.iterationMaxCount > 0) {
                if (this.computedValueLevel === 0) {
                    this.circCheckList = [];
                    this.circCheckList.push(this.cell);
                } else if (this.circCheckList.indexOf(this.cell) > -1) {
                    if (!this.IterationValues[this.cell]) {
                        this.IterationValues[this.cell] = "0";
                    }
                    return this.IterationValues[this.cell].toString();
                }
            } else {
                if (this.computedValueLevel === 0) {
                    this.circCheckList = [];
                } else if (this.circCheckList.indexOf(this.cell) > -1) {
                    this.computedValueLevel = 0;
                    this.circCheckList = [];
                    throw new Error(this.FormulaErrorStrings[this.circular_reference_]);
                }
                this.circCheckList.push(this.cell);
            }
        }
        
        const s = this.computedValue(parsedFormula);
        if (this.useNoAmpersandQuotes && s.length > 1 && 
            s[0] === this.TIC[0] && s[s.length - 1] === this.TIC[0]) {
            return s.substring(1, s.length - 1);
        }
        return s;
    }

    // Compute value
    computedValue(formula) {
        if (!formula || formula.length === 0) {
            return formula;
        }
        
        try {
            this.computedValueLevel++;
            if (this.computedValueLevel > this.maximumRecursiveCalls) {
                this.computedValueLevel = 0;
                throw new Error(this.FormulaErrorStrings[this.too_complex]);
            }
            
            const stack = [];
            let i = 0;
            let sheet = "";
            
            // Handle short circuit IFs if enabled
            if (this.allowShortCircuitIFs && this.ensureIFCallDuringShortCircuit) {
                let loc = -1;
                do {
                    if (i < formula.length && (i = formula.indexOf(this.IFMarker, i)) > -1) {
                        loc = this.matchingRightBracket(formula.substring(i));
                        if (loc > -1) {
                            const func = this.libraryFunctions["IF"];
                            let result = "";
                            try {
                                result = func(formula.substring(i + this.IFMarker.length, loc - this.IFMarker.length));
                            } catch (ex) {
                                if (this.rethrowLibraryComputationExceptions) {
                                    this.libraryComputationException = ex;
                                    throw ex;
                                }
                            }
                            this.markupResultToIncludeInFormula(result);
                            let rightPiece = "";
                            if (i + loc + 1 < formula.length) {
                                rightPiece = formula.substring(i + loc + 1);
                            }
                            formula = formula.substring(0, i) + result + rightPiece;
                        }
                    }
                } while (formula.includes(this.IFMarker) && loc > -1);
            }
            
            i = 0;
            while (i < formula.length) {
                if (formula[i] === this.BMARKER) {
                    i++;
                    continue;
                }
                
                let uFound = formula[i] === 'u';
                if (uFound) {
                    i++;
                    if (i >= formula.length) continue;
                    if (formula[i] === this.BMARKER) {
                        i++;
                    }
                    if (i >= formula.length) continue;
                }
                
                // Handle percentage
                if (formula[i] === '%' && stack.length > 0) {
                    const o = stack[stack.length - 1];
                    const d = parseFloat(o.toString());
                    if (!isNaN(d)) {
                        stack.pop();
                        stack.push(d / 100);
                    }
                    i++;
                    continue;
                }
                
                // Handle sheet token
                if (formula[i] === this.sheetToken) {
                    sheet = formula[i];
                    i++;
                    while (i < formula.length && formula[i] !== this.sheetToken) {
                        sheet += formula[i];
                        i++;
                    }
                    if (i < formula.length) {
                        sheet += formula[i];
                        i++;
                    } else {
                        continue;
                    }
                }
                
                // Handle TRUE/FALSE values
                if (formula.substring(i).startsWith(this.TRUEVALUESTR)) {
                    stack.push(this.TRUEVALUESTR);
                    i += this.TRUEVALUESTR.length;
                } else if (formula.substring(i).startsWith(this.FALSEVALUESTR)) {
                    stack.push(this.FALSEVALUESTR);
                    i += this.FALSEVALUESTR.length;
                } else if (formula[i] === this.TIC[0]) {
                    // Handle quoted strings
                    let s = formula[i];
                    i++;
                    while (i < formula.length && formula[i] !== this.TIC[0]) {
                        s += formula[i];
                        i++;
                    }
                    stack.push(s + this.TIC);
                    i++;
                } else if (this.isUpperCase(formula[i])) {
                    // Handle cell references and functions
                    const s = this.processUpperCase(formula, i, sheet);
                    if (uFound) {
                        const val = this.getValueFromParentObject(s);
                        const d3 = parseFloat(val);
                        if (!isNaN(d3)) {
                            stack.push((-d3).toString());
                        } else {
                            stack.push(val);
                        }
                    } else {
                        stack.push(this.getValueFromParentObject(s));
                    }
                } else if (formula[i] === 'q') {
                    // Handle library functions
                    formula = this.computeInteriorFunctions(formula);
                    const ii = formula.substring(i + 1).indexOf(this.LEFTBRACKET);
                    if (ii > 0) {
                        // Process function arguments
                        let bracketCount = 0;
                        let bracketFound = false;
                        const start = ii + i + 2;
                        let k = start;
                        while (k < formula.length && (formula[k] !== this.RIGHTBRACKET || bracketCount > 0)) {
                            if (formula[k] === this.LEFTBRACKET) {
                                bracketCount++;
                                bracketFound = true;
                            } else if (formula[k] === this.LEFTBRACKET) {
                                bracketCount--;
                            }
                            k++;
                        }
                        
                        if (bracketFound) {
                            const s = formula.substring(start, k - 2);
                            let s1 = "";
                            const splits = this.splitArgsPreservingQuotedCommas(s);
                            for (const t of splits) {
                                if (s1.length > 0) {
                                    s1 += ",";
                                }
                                const j = this.findLastqNotInBrackets(t);
                                if (j > 0) {
                                    s1 += t.substring(0, j) + this.computedValue(t.substring(j));
                                } else {
                                    s1 += this.computedValue(t);
                                }
                            }
                            formula = formula.substring(0, start) + s1 + formula.substring(k - 2);
                        }
                        
                        const name = formula.substring(i + 1, i + ii + 1);
                        if (name === "AVG" && this.excelLikeComputations) {
                            return this.FormulaErrorStrings[this.bad_index];
                        }
                        
                        if (this.libraryFunctions[name]) {
                            const j = formula.substring(i + ii + 1).indexOf(this.RIGHTBRACKET);
                            const args = formula.substring(i + ii + 2, i + ii + 2 + j - 1);
                            XCON.log(`🔍 함수 호출: ${name}("${args}")`);
                            
                            try {
                                const func = this.libraryFunctions[name];
                                XCON.log(`🔍 함수 객체:`, func, typeof func);
                                const result = func(args);
                                XCON.log(`🔍 함수 실행 결과:`, result, typeof result);
                                
                                // Safe result handling - ensure we push a valid value
                                if (result === null || result === undefined) {
                                    stack.push("");
                                } else if (typeof result === 'string') {
                                    stack.push(result);
                                } else if (typeof result === 'number' && !isNaN(result)) {
                                    stack.push(result.toString());
                                } else if (typeof result === 'boolean') {
                                    stack.push(result ? this.TRUEVALUESTR : this.FALSEVALUESTR);
                                } else if (result && typeof result.toString === 'function') {
                                    stack.push(result.toString());
                                } else {
                                    // Fallback for unexpected result types
                                    stack.push(String(result || ""));
                                }
                            } catch (ex) {
                                if (this.rethrowLibraryComputationExceptions) {
                                    this.libraryComputationException = ex;
                                    throw ex;
                                }
                                return ex.message;
                            }
                            i += j + ii + 2;
                        } else {
                            return this.FormulaErrorStrings[this.missing_formula];
                        }
                    } else if (formula[0] === this.BMARKER) {
                        i = 0;
                        stack.length = 0;
                        continue;
                    } else {
                        return this.FormulaErrorStrings[this.improper_formula];
                    }
                } else if (this.isDigit(formula[i]) || formula[i] === 'u') {
                    // Handle numbers
                    let s = "";
                    if (formula[i] === 'u' || uFound) {
                        s = "-";
                        if (!uFound) {
                            i++;
                        } else {
                            uFound = false;
                        }
                    }
                    
                    if (i < formula.length && this.isUpperCase(formula[i])) {
                        s += this.getValueFromParentObject(this.processUpperCase(formula, i, sheet));
                    } else {
                        while (i < formula.length && (this.isDigit(formula[i]) || formula[i] === CalcEngine.ParseDecimalSeparator)) {
                            s += formula[i];
                            i++;
                        }
                    }
                    stack.push(s);
                } else {
                    // Handle operators
                    switch (formula[i]) {
                        case '#':
                            i += 4;
                            stack.push("#N/A");
                            break;
                        case 'n':
                            i++;
                            let s = "";
                            if (formula.substring(i).startsWith("Infinity")) {
                                s = "Infinity";
                                i += s.length;
                            } else if (formula.substring(i).startsWith("uInfinity")) {
                                s = "Infinity";
                                i += s.length + 1;
                            } else if (formula.substring(i).startsWith(this.TRUEVALUESTR)) {
                                s = this.TRUEVALUESTR;
                                i += s.length;
                            } else if (formula.substring(i).startsWith(this.FALSEVALUESTR)) {
                                s = this.FALSEVALUESTR;
                                i += s.length;
                            } else if (i <= formula.length - 3 && formula.substring(i, i + 3) === "NaN") {
                                i += 3;
                                s = "0";
                            } else {
                                if (formula[i] === 'u' || uFound) {
                                    s = "-";
                                    if (!uFound) {
                                        i++;
                                    } else {
                                        uFound = false;
                                    }
                                }
                                while (i < formula.length && (this.isDigit(formula[i]) || formula[i] === CalcEngine.ParseDecimalSeparator)) {
                                    s += formula[i];
                                    i++;
                                }
                                if (i < formula.length && formula[i] === '%') {
                                    i++;
                                    if (s.length === 0) {
                                        if (stack.length > 0) {
                                            const o = stack[stack.length - 1];
                                            const d = parseFloat(o.toString());
                                            if (!isNaN(d)) {
                                                stack.pop();
                                                s = (d / 100).toString();
                                            }
                                        }
                                    } else {
                                        s = (parseFloat(s) / 100).toString();
                                    }
                                } else if (i < formula.length - 2 && formula[i] === 'E' && (formula[i + 1] === '+' || formula[i + 1] === '-')) {
                                    s += formula.substring(i, i + 4);
                                    i += 4;
                                }
                            }
                            stack.push(s);
                            break;
                        case this.TOKEN_add:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 + d).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_subtract:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 - d).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_multiply:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 * d).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_divide:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 / d).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_EP:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 * Math.pow(10, d)).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_EM:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push((d1 * Math.pow(10, -d)).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_less:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 < d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    val = (s2.toUpperCase().replace(this.TIC, "").localeCompare(s1.toUpperCase().replace(this.TIC, "")) < 0) 
                                        ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_greater:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 > d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    val = (s2.toUpperCase().replace(this.TIC, "").localeCompare(s1.toUpperCase().replace(this.TIC, "")) > 0) 
                                        ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_equal:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 === d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    if ((s1.length > 0 && s1[0] === '#' && this.ErrorStrings.indexOf(s1) > -1) ||
                                        (s2.length > 0 && s2[0] === '#' && this.ErrorStrings.indexOf(s2) > -1) ||
                                        (s1.length > 0 && this.formulaErrorStrings.indexOf(s1) > -1) ||
                                        (s2.length > 0 && this.formulaErrorStrings.indexOf(s2) > -1)) {
                                        val = "#N/A";
                                    } else {
                                        val = (s1.toUpperCase().replace(this.TIC, "") === s2.toUpperCase().replace(this.TIC, "")) 
                                            ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_lesseq:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 <= d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    val = (s1.toUpperCase().replace(this.TIC, "").localeCompare(s2.toUpperCase().replace(this.TIC, "")) <= 0) 
                                        ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_greatereq:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 >= d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    val = (s1.toUpperCase().replace(this.TIC, "").localeCompare(s2.toUpperCase().replace(this.TIC, "")) >= 0) 
                                        ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_noequal:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                if (s1.length === 0) s1 = "0";
                                if (s2.length === 0) s2 = "0";
                                const d = parseFloat(s1);
                                const d1 = parseFloat(s2);
                                let val;
                                if (!isNaN(d) && !isNaN(d1)) {
                                    val = (d1 !== d) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                } else {
                                    val = (s1.toUpperCase().replace(this.TIC, "") !== s2.toUpperCase().replace(this.TIC, "")) 
                                        ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                }
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_and:
                            {
                                const s1 = this.popString(stack);
                                const s2 = this.popString(stack);
                                if (this.useNoAmpersandQuotes) {
                                    stack.push(s2 + s1);
                                } else {
                                    stack.push(this.TIC + s2 + s1 + this.TIC);
                                }
                                i++;
                            }
                            break;
                        case this.TOKEN_or:
                            {
                                const d = this.pop(stack);
                                const d1 = this.pop(stack);
                                stack.push(Math.pow(d1, d).toString());
                                i++;
                            }
                            break;
                        case this.TOKEN_ORop:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                let val;
                                if (s1.length === 0) {
                                    s1 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s1);
                                    if (!isNaN(d)) {
                                        s1 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                if (s2.length === 0) {
                                    s2 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s2);
                                    if (!isNaN(d)) {
                                        s2 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                val = (s1.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR ||
                                       s2.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR) 
                                       ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_ANDop:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                let val;
                                if (s1.length === 0) {
                                    s1 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s1);
                                    if (!isNaN(d)) {
                                        s1 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                if (s2.length === 0) {
                                    s2 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s2);
                                    if (!isNaN(d)) {
                                        s2 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                val = (s1.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR &&
                                       s2.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR) 
                                       ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_XORop:
                            {
                                let s1 = this.popString(stack);
                                let s2 = this.popString(stack);
                                let val;
                                if (s1.length === 0) {
                                    s1 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s1);
                                    if (!isNaN(d)) {
                                        s1 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                if (s2.length === 0) {
                                    s2 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s2);
                                    if (!isNaN(d)) {
                                        s2 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                val = ((s1.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR && 
                                        s2.toUpperCase().replace(this.TIC, "") !== this.TRUEVALUESTR) ||
                                       (s2.toUpperCase().replace(this.TIC, "") === this.TRUEVALUESTR && 
                                        s1.toUpperCase().replace(this.TIC, "") !== this.TRUEVALUESTR))
                                       ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                stack.push(val);
                                i++;
                            }
                            break;
                        case this.TOKEN_NOTop:
                            {
                                let s1 = this.popString(stack);
                                let val;
                                if (s1.length === 0) {
                                    s1 = this.FALSEVALUESTR;
                                } else {
                                    const d = parseFloat(s1);
                                    if (!isNaN(d)) {
                                        s1 = (d !== 0) ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                    }
                                }
                                val = (s1.toUpperCase().replace(this.TIC, "") === this.FALSEVALUESTR)
                                    ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                                stack.push(val);
                                i++;
                            }
                            break;
                        default:
                            this.computedValueLevel = 0;
                            throw new Error(this.FormulaErrorStrings[this.invalid_expression]);
                    }
                }
            }
            
            // Check dangling stack
            if (this.checkDanglingStack && stack.length > 1 && formula.length > 1 &&
                (!formula.startsWith(this.BMARKER) || !formula.endsWith(this.BMARKER) ||
                 formula.indexOf(this.BMARKER2) > -1)) {
                this.computedValueLevel = 0;
                return this.FormulaErrorStrings[this.improper_formula];
            }
            
            if (stack.length === 0) {
                return "";
            } else {
                let s = "";
                let cc = stack.length;
                do {
                    const stackItem = stack.pop();
                    // Safe conversion to string
                    let itemStr = "";
                    if (stackItem === null || stackItem === undefined) {
                        itemStr = "";
                    } else if (typeof stackItem === 'string') {
                        itemStr = stackItem;
                    } else if (typeof stackItem === 'number' && !isNaN(stackItem)) {
                        itemStr = stackItem.toString();
                    } else if (typeof stackItem === 'boolean') {
                        itemStr = stackItem ? this.TRUEVALUESTR : this.FALSEVALUESTR;
                    } else if (stackItem && typeof stackItem.toString === 'function') {
                        itemStr = stackItem.toString();
                    } else {
                        itemStr = String(stackItem || "");
                    }
                    
                    s = itemStr + s;
                    if (!this.checkDanglingStack && !isNaN(parseFloat(s))) {
                        return s;
                    }
                    cc--;
                } while (cc > 0 && !(s.includes(this.FALSEVALUESTR) || s.includes(this.TRUEVALUESTR)));
                return s;
            }
        } catch (ex) {
            this.isError = true;
            this.computedValueLevel = 0;
            
            if (ex.message.indexOf(this._FormulaErrorStrings[this.circular_reference_]) > -1 ||
                (this.rethrowLibraryComputationExceptions && this.libraryComputationException)) {
                if (this.rethrowLibraryComputationExceptions && this.libraryComputationException) {
                    throw this.libraryComputationException;
                }
                throw ex;
            }
            
            if (ex.message.indexOf(this._FormulaErrorStrings[this.cell_empty]) > -1) {
                return "";
            } else {
                if (this.rethrowLibraryComputationExceptions) {
                    this.libraryComputationException = ex;
                    throw ex;
                }
                return ex.message;
            }
        } finally {
            this.computedValueLevel--;
            if (this.computedValueLevel < 0) {
                this.computedValueLevel = 0;
            }
        }
    }

    // Helper methods
    isUpperCase(char) {
        return char >= 'A' && char <= 'Z';
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isLetter(char) {
        return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
    }

    isLetterOrDigit(char) {
        return this.isLetter(char) || this.isDigit(char);
    }

    // Pop value from stack
    pop(stack) {
        if (stack.length === 0) {
            if (this.treatStringsAsZero) {
                return 0;
            }
            return 0;
        }
        
        const o = stack.pop();
        if (o === null || o === undefined) {
            if (this.treatStringsAsZero) {
                return 0;
            }
            return 0;
        }
        
        const s = o.toString().replace(new RegExp(this.TIC, 'g'), "");
        if (s.startsWith("#") || s.length === 0) {
            return 0;
        }
        if (s === this.TRUEVALUESTR) {
            return 1;
        } else if (s === this.FALSEVALUESTR) {
            return 0;
        }
        
        const d = parseFloat(s);
        if (!isNaN(d)) {
            return d;
        } else if (this.useDatesInCalcs) {
            const dt = new Date(o);
            if (this.isDate(o, dt)) {
                return this.getSerialDateTimeFromDate(dt);
            } else {
                return 0;
            }
        }
        
        if (this.treatStringsAsZero) {
            return 0;
        } else if (o.toString().length > 0) {
            return NaN;
        }
        return 0;
    }

    // Pop string from stack
    popString(stack) {
        if (stack.length === 0) {
            return "";
        }
        
        const o = stack.pop();
        if (o === null || o === undefined) {
            return "";
        }
        
        if (this.useDatesInCalcs) {
            const dt = new Date(o);
            if (this.isDate(o, dt)) {
                return this.getSerialDateTimeFromDate(dt).toString();
            }
        }
        
        return this.stripTics(o.toString());
    }

    // Strip TIC characters
    stripTics(s) {
        if (s.length > 1 && s[0] === this.TIC[0] && s[s.length - 1] === this.TIC[0]) {
            if (s.substring(1, s.length - 1).indexOf(this.TIC) === -1) {
                s = s.substring(1, s.length - 1);
            }
        }
        return s;
    }

    // Check if is date
    isDate(o, date) {
        try {
            date = new Date(o.toString());
            return date >= this.dateTime1900 && !isNaN(date);
        } catch {
            return false;
        }
    }

    // Get serial date time from date
    getSerialDateTimeFromDate(dt) {
        let d = dt.valueOf() - this.dateTime1900Double;
        d = 1 + (dt.valueOf() - this.dateTime1900Double) / (1000 * 60 * 60 * 24);
        if (CalcEngine.Treat1900AsLeapYear && d > 59) {
            d += 1;
        }
        return d;
    }

    // Process upper case (cell references)
    processUpperCase(formula, i, sheet) {
        let s = "";
        while (i.value < formula.length && this.isUpperCase(formula[i.value])) {
            s += formula[i.value];
            i.value++;
        }
        while (i.value < formula.length && this.isDigit(formula[i.value])) {
            s += formula[i.value];
            i.value++;
        }
        
        if (this.supportRangeOperands && i.value < formula.length && formula[i.value] === ':') {
            s += formula[i.value];
            i.value++;
            if (i.value < formula.length && formula[i.value] === this.sheetToken) {
                s += formula[i.value];
                i.value++;
                while (i.value < formula.length && formula[i.value] !== this.sheetToken) {
                    s += formula[i.value];
                    i.value++;
                }
            }
            while (i.value < formula.length && this.isUpperCase(formula[i.value])) {
                s += formula[i.value];
                i.value++;
            }
            while (i.value < formula.length && this.isDigit(formula[i.value])) {
                s += formula[i.value];
                i.value++;
            }
            s = sheet.value + s;
            sheet.value = "";
            s = this.getCellFrom(s);
        } else {
            s = sheet.value + s;
            sheet.value = "";
        }
        return s;
    }

    // Split arguments preserving quoted commas
    splitArgsPreservingQuotedCommas(args) {
        if (args.indexOf(this.TIC) === -1) {
            let splitted = null;
            if (CalcEngine.ParseArgumentSeparator !== ',' && 
                (args.includes(CalcEngine.ParseArgumentSeparator) || args.includes(","))) {
                args = args.replace(new RegExp(CalcEngine.ParseArgumentSeparator, 'g'), ',');
                splitted = args.split(',');
                args = args.replace(/,/g, CalcEngine.ParseArgumentSeparator);
            } else {
                splitted = args.split(CalcEngine.ParseArgumentSeparator);
            }
            return splitted;
        }
        
        const saveResult = this.saveStrings(args);
        const formulaStrings = saveResult.strings;
        const results = saveResult.text.split(CalcEngine.ParseArgumentSeparator);
        const pieces = [];
        for (const s of results) {
            let s1 = s;
            s1 = this.setStrings(s1, formulaStrings);
            pieces.push(s1);
        }
        return pieces;
    }

    // Save strings (handle quoted strings)
    saveStrings(text) {
        const strings = {};
        const TICs2 = this.TIC + this.TIC;
        let id = 0;
        let i = text.indexOf(this.TIC);
        
        if (i > -1) {
            while (i > -1 && i < text.length) {
                const j = (i + 1) < text.length ? text.indexOf(this.TIC, i + 1) : -1;
                if (j > -1) {
                    const key = this.TIC + this.UNIQUESTRINGMARKER + id.toString() + this.TIC;
                    if (j < text.length - 2 && text[j + 1] === this.TIC[0]) {
                        j = text.indexOf(this.TIC, j + 2);
                        if (j === -1) {
                            throw new Error(this.FormulaErrorStrings[this.mismatched_tics]);
                        }
                    }
                    let s = text.substring(i, j + 1);
                    strings[key] = s;
                    s = s.replace(TICs2, this.TIC);
                    id++;
                    text = text.substring(0, i) + key + text.substring(j + 1);
                    i = i + key.length;
                    if (i < text.length) {
                        i = text.indexOf(this.TIC, i);
                    }
                } else if (j === -1 && text.indexOf(this.sheetToken) > -1 && i < text.indexOf(this.sheetToken, i)) {
                    let sheetName = '';
                    for (let k = text.indexOf(this.sheetToken, i) - 1; k > -1; k--) {
                        if (!this.ValidPrecedingChars.includes(text[k])) {
                            sheetName = text[k] + sheetName;
                        } else {
                            break;
                        }
                    }
                    if (!(sheetName.startsWith("'") && sheetName.endsWith("'"))) {
                        throw new Error(this.FormulaErrorStrings[this.mismatched_tics]);
                    }
                    if (sheetName.startsWith("'")) {
                        sheetName = sheetName.substring(1);
                    }
                    if (sheetName.endsWith("'")) {
                        sheetName = sheetName.substring(0, sheetName.length - 1);
                    }
                    if (!this.sortedSheetNames || !this.sortedSheetNames.includes(sheetName.toUpperCase())) {
                        throw new Error(this.FormulaErrorStrings[this.missing_sheet]);
                    }
                    if ((i + 1) < text.length) {
                        i = text.indexOf(this.TIC, i + 1);
                    }
                } else {
                    throw new Error(this.FormulaErrorStrings[this.mismatched_tics]);
                }
            }
        }
        return { text, strings };
    }

    // Set strings back
    setStrings(retValue, strings) {
        for (const s in strings) {
            retValue = retValue.replace(s, strings[s]);
        }
        return retValue;
    }

    // Convert to uppercase except string markers
    toUpperCaseExceptStrings(text, formulaStrings) {
        XCON.log(`🔍 toUpperCaseExceptStrings 호출:`, text);
        XCON.log(`🔍 formulaStrings:`, formulaStrings);
        
        if (!formulaStrings || Object.keys(formulaStrings).length === 0) {
            XCON.log(`🔍 formulaStrings 없음, 일반 대문자 변환`);
            return text.toUpperCase();
        }
        
        let result = text;
        const markers = Object.keys(formulaStrings);
        XCON.log(`🔍 마커들:`, markers);
        
        // 문자열 마커들을 임시 플레이스홀더로 교체
        const placeholders = {};
        markers.forEach((marker, index) => {
            const placeholder = `__STRING_PLACEHOLDER_${index}__`;
            placeholders[placeholder] = marker;
            result = result.replace(new RegExp(this.escapeRegExp(marker), 'g'), placeholder);
            XCON.log(`🔍 마커 교체: ${marker} → ${placeholder}`);
        });
        
        XCON.log(`🔍 마커 교체 후:`, result);
        
        // 대문자 변환
        result = result.toUpperCase();
        XCON.log(`🔍 대문자 변환 후:`, result);
        
        // 플레이스홀더를 원래 마커로 복원
        Object.keys(placeholders).forEach(placeholder => {
            result = result.replace(new RegExp(placeholder, 'g'), placeholders[placeholder]);
            XCON.log(`🔍 플레이스홀더 복원: ${placeholder} → ${placeholders[placeholder]}`);
        });
        
        XCON.log(`🔍 최종 결과:`, result);
        return result;
    }

    // Escape special regex characters
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Adjust range arguments for statistical functions
    adjustRangeArg(range) {
        // 이 메서드는 Excel 호환성을 위해 범위 인수를 조정합니다
        // 현재는 단순히 원본 range를 반환합니다
        return range;
    }

    // Get formula text
    getFormulaText(text) {
        if (this.formulaParsing) {
            const e = { text: text };
            this.formulaParsing(this, e);
            return e.text;
        }
        return text;
    }

    // Mark reserved words
    markReserveWords(text) {
        let copy = text.toLowerCase();
        if (copy.trimStart().startsWith(this.ReservedWordOperators[this.reservedWord_IF])) {
            this.markIF(copy, text);
        }
        this.mark(copy, text, this.ReservedWordOperators[this.reservedWord_NOT], this.CHAR_NOTop, true);
        this.mark(copy, text, this.ReservedWordOperators[this.reservedWord_OR], this.CHAR_ORop, false);
        this.mark(copy, text, this.ReservedWordOperators[this.reservedWord_AND], this.CHAR_ANDop, false);
        this.mark(copy, text, this.ReservedWordOperators[this.reservedWord_XOR], this.CHAR_XORop, false);
        return text;
    }

    // Mark tokens
    mark(copy, text, op, token, checkPrecedingChar) {
        let loc = 0;
        loc = checkPrecedingChar ? this.findAndCheckPrecedingChar(copy, op, loc) : copy.indexOf(op);
        const len = op.length;
        while (loc > -1) {
            copy = copy.substring(0, loc) + token + copy.substring(loc + len);
            text = text.substring(0, loc) + token + text.substring(loc + len);
            loc = checkPrecedingChar ? this.findAndCheckPrecedingChar(copy, op, loc) : copy.indexOf(op, loc);
        }
        return { copy, text };
    }

    // Find and check preceding char
    findAndCheckPrecedingChar(copy, op, loc) {
        let loc1 = copy.indexOf(op, loc);
        if (loc1 > 0) {
            while (loc1 > -1 && this.ValidPrecedingChars.indexOf(copy[loc1 - 1]) === -1) {
                loc1 = copy.indexOf(op, loc1 + 1);
            }
        }
        return loc1;
    }

    // Mark IF statements
    markIF(copy, text) {
        const locIF = copy.indexOf(this.ReservedWordOperators[this.reservedWord_IF]);
        const locTHEN = copy.indexOf(this.ReservedWordOperators[this.reservedWord_THEN]);
        const locELSE = copy.indexOf(this.ReservedWordOperators[this.reservedWord_ELSE]);
        
        if (locELSE > -1 && locTHEN > -1) {
            const ifStart = this.ReservedWordOperators[this.reservedWord_IF].length;
            const ifLength = locTHEN - ifStart;
            const thenStart = locTHEN + this.ReservedWordOperators[this.reservedWord_THEN].length;
            const thenLength = locELSE - thenStart;
            const elseStart = locELSE + this.ReservedWordOperators[this.reservedWord_ELSE].length;
            const elseLength = text.length - elseStart;
            
            text = `IF((${text.substring(ifStart, ifStart + ifLength)})${CalcEngine.ParseArgumentSeparator}(${text.substring(thenStart, thenStart + thenLength)})${CalcEngine.ParseArgumentSeparator}(${text.substring(elseStart, elseStart + elseLength)}))`;
            copy = `IF((${copy.substring(ifStart, ifStart + ifLength)})${CalcEngine.ParseArgumentSeparator}(${copy.substring(thenStart, thenStart + thenLength)})${CalcEngine.ParseArgumentSeparator}(${copy.substring(elseStart, elseStart + elseLength)}))`;
        } else if (locTHEN > -1) {
            const ifStart = 0;
            const ifLength = locTHEN;
            const thenStart = locTHEN + this.ReservedWordOperators[this.reservedWord_THEN].length;
            const thenLength = text.length - thenStart + 1;
            
            text = `IF((${text.substring(ifStart, ifLength)})${CalcEngine.ParseArgumentSeparator}(${text.substring(thenStart, thenStart + thenLength)}))`;
            copy = `IF((${copy.substring(ifStart, ifLength)})${CalcEngine.ParseArgumentSeparator}(${copy.substring(thenStart, thenStart + thenLength)}))`;
        }
        
        return { copy, text };
    }

    // Mark library formulas
    markLibraryFormulas(formula) {
        let rightParens = formula.indexOf(')');
        if (rightParens === -1) {
            this.markNamedRanges(formula);
            return formula;
        } else {
            while (rightParens > -1) {
                let parenCount = 0;
                let leftParens = rightParens - 1;
                while (leftParens > -1 && (formula[leftParens] !== '(' || parenCount !== 0)) {
                    if (formula[leftParens] === ')') {
                        parenCount++;
                    } else if (formula[leftParens] === ')') {
                        parenCount--;
                    }
                    leftParens--;
                }
                
                if (leftParens === -1) {
                    throw new Error(this.FormulaErrorStrings[this.mismatched_parentheses]);
                }
                
                let i = leftParens - 1;
                while (i > -1 && (this.isLetterOrDigit(formula[i]) || this.validFunctionNameChars.indexOf(formula[i]) > -1)) {
                    i--;
                }
                
                const len = leftParens - i - 1;
                if (len > 0 && this.libraryFunctions[formula.substring(i + 1, i + 1 + len)]) {
                    let s = formula.substring(leftParens, rightParens + 1);
                    s = this.markNamedRanges(s);
                    formula = formula.substring(0, i + 1) + 'q' + formula.substring(i + 1, i + 1 + len) + 
                             s.replace(/\(/g, this.LEFTBRACKET).replace(/\)/g, this.RIGHTBRACKET) + 
                             formula.substring(rightParens + 1);
                } else if (len > 0) {
                    if (this.unknownFunction) {
                        const family = CalcEngine.getSheetFamilyItem(this.grid);
                        let grd = this.grid;
                        const sheet = this.sheetToken(this.cell);
                        let s = this.cell;
                        if (sheet.length > 0) {
                            grd = family.TokenToParentObject[sheet];
                            s = s.substring(s.lastIndexOf(this.sheetToken) + 1);
                        }
                        for (const key in family.SheetNameToParentObject) {
                            if (family.SheetNameToParentObject[key] === grd) {
                                s = key + this.sheetToken + s;
                                break;
                            }
                        }
                        const args = {
                            missingFunctionName: formula.substring(i + 1, i + 1 + len),
                            cellLocation: s
                        };
                        this.unknownFunction(this, args);
                    }
                    throw new Error(this.FormulaErrorStrings[this.unknown_formula_name] + " " + formula.substring(i + 1, i + 1 + len));
                } else {
                    let s = "";
                    if (leftParens > 0) {
                        s = formula.substring(0, leftParens);
                    }
                    s = s + '{' + formula.substring(leftParens + 1, rightParens) + '}';
                    if (rightParens < formula.length) {
                        s = s + formula.substring(rightParens + 1);
                    }
                    s = this.markNamedRanges(s);
                    formula = s;
                }
                rightParens = formula.indexOf(')');
            }
        }
        return formula.replace(/{/g, '(').replace(/}/g, ')');
    }

    // Mark named ranges
    markNamedRanges(argList) {
        const markers = [')', CalcEngine.ParseArgumentSeparator, '}', '+', '-', '*', '/', '<', '>', '=', '&'];
        let i = (argList.length > 0 && argList[0] === '(') ? 1 : 0;
        let end = -1;
        
        for (let j = i; j < argList.length; j++) {
            if (markers.includes(argList[j])) {
                end = j - i;
                break;
            }
        }
        
        while (end > -1 && end + i < argList.length) {
            let scopedRange = "";
            let s = this.NamedRanges[argList.substring(i, i + end)] || null;
            
            if (s === null) {
                const result = this.checkIfScopedRange(argList.substring(i, i + end));
                if (result.found) {
                    s = result.scopedRange;
                }
            }
            
            if (s !== null) {
                s = s.toUpperCase();
                this.putTokensForSheets(s);
                s = this.markLibraryFormulas(s);
            }
            
            if (s !== null) {
                argList = argList.substring(0, i) + s + argList.substring(i + end);
                i += s.length + 1;
            } else {
                i += end + 1;
                while (i < argList.length && !this.isUpperCase(argList[i])) {
                    i++;
                }
            }
            
            end = -1;
            for (let j = i; j < argList.length; j++) {
                if (markers.includes(argList[j])) {
                    end = j - i;
                    break;
                }
            }
            
            if (end === -1 && i < argList.length) {
                s = Object.keys(this.NamedRanges).length > 0 ? this.NamedRanges[argList.substring(i)] : s;
                if (s === null) {
                    const result = this.checkIfScopedRange(argList.substring(i));
                    if (result.found) {
                        s = result.scopedRange;
                    }
                }
                if (s !== null) {
                    s = s.toUpperCase();
                    this.putTokensForSheets(s);
                    s = this.markLibraryFormulas(s);
                    if (s !== null) {
                        argList = argList.substring(0, i) + s;
                        i += s.length + 1;
                    }
                }
                end = (i < argList.length) ? -1 : -1;
                for (let j = i; j < argList.length; j++) {
                    if (markers.includes(argList[j])) {
                        end = j - i;
                        break;
                    }
                }
            }
        }
        return argList;
    }

    // Check if scoped range
    checkIfScopedRange(text) {
        let scopedRange = "";
        let found = false;
        const id = this.getSheetID(this.grid);
        const token = '!' + id.toString() + '!';
        const sheet = CalcEngine.getSheetFamilyItem(this.grid);
        
        if (!sheet.SheetNameToToken) {
            return { found, scopedRange };
        }
        
        for (const name in sheet.SheetNameToToken) {
            if (sheet.SheetNameToToken[name] === token) {
                const s = (name + '!' + text).toUpperCase();
                if (this.NamedRanges[s]) {
                    scopedRange = this.NamedRanges[s].toUpperCase();
                    found = true;
                }
            }
        }
        return { found, scopedRange };
    }

    // Put tokens for sheets
    putTokensForSheets(text) {
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        if (this.supportsSheetRanges) {
            text = this.handleSheetRanges(text, family);
        }
        
        if (this.sortedSheetNames) {
            for (const name of this.sortedSheetNames) {
                let token = family.SheetNameToToken[name];
                token = token.replace(new RegExp(this.sheetToken, 'g'), this.tempSheetPlaceHolder);
                let s = "'" + name.toUpperCase() + "'" + this.sheetToken;
                if (text.indexOf(s) === -1) {
                    s = name.toUpperCase() + this.sheetToken;
                }
                text = text.replace(s, token);
            }
        }
        text = text.replace(new RegExp(this.tempSheetPlaceHolder, 'g'), this.sheetToken);
        return text;
    }

    // Handle sheet ranges
    handleSheetRanges(text, family) {
        let sheetLoc = text.indexOf(this.sheetToken);
        let start = 0;
        
        while (sheetLoc > 0) {
            const colonLoc = text.substring(start, sheetLoc).lastIndexOf(':');
            if (colonLoc > -1) {
                const rightSide = text.substring(start + colonLoc + 1, sheetLoc).toUpperCase().replace(/'/g, "");
                if (family.SheetNameToToken[rightSide.trim()]) {
                    let leftStart = start + colonLoc - 1;
                    while (leftStart > 0 && this.markers.indexOf(text[leftStart]) === -1) {
                        leftStart--;
                    }
                    const leftSide = text.substring(leftStart + 1, colonLoc + start).toUpperCase().replace(/'/g, "");
                    if (family.SheetNameToToken[leftSide.trim()]) {
                        let rightEnd = sheetLoc + start + 1;
                        while (rightEnd < text.length && this.markers.indexOf(text[rightEnd]) === -1) {
                            rightEnd++;
                        }
                        const otherSide = text.substring(start + sheetLoc + 1, rightEnd);
                        let left = family.SheetNameToToken[leftSide.trim()];
                        let right = family.SheetNameToToken[rightSide.trim()];
                        if (right.localeCompare(left) === -1) {
                            const s = left;
                            left = right;
                            right = s;
                        }
                        let replacement = "";
                        for (const name of this.sortedSheetNames) {
                            const s = family.SheetNameToToken[name];
                            const sint = parseInt(s.replace(/!/g, ''));
                            const leftint = parseInt(left.replace(/!/g, ''));
                            const rightint = parseInt(right.replace(/!/g, ''));
                            if (sint >= leftint && sint <= rightint) {
                                if (replacement.length > 0) {
                                    replacement += CalcEngine.ParseArgumentSeparator;
                                }
                                replacement += name + String.fromCharCode(131) + otherSide;
                            }
                        }
                        text = text.substring(0, leftStart + 1) + replacement + text.substring(rightEnd);
                        start = text.length - rightEnd;
                    } else {
                        start = sheetLoc + start;
                    }
                } else {
                    start = sheetLoc + start;
                }
            } else {
                start = sheetLoc + start;
            }
            sheetLoc = text.substring(start + 1).indexOf(this.sheetToken) + 1;
        }
        return text.replace(new RegExp(String.fromCharCode(131), 'g'), this.sheetToken);
    }

    // Parse simple
    parseSimple(text) {
        if (text.length > 0 && text[0] === '+') {
            text = text.substring(1);
        }
        if (text === "#N/A" || text === "#N~A") {
            return "#N/A";
        } else if (text.indexOf("#N/A") > -1) {
            text = text.replace(/#N\/A/g, "#N~A");
        }
        
        text = this.handleEmbeddedEs(text);
        
        text = text.replace(this.STRING_lesseq, this.CHAR_lesseq)
                   .replace(this.STRING_greatereq, this.CHAR_greatereq)
                   .replace(this.STRING_noequal, this.CHAR_noequal)
                   .replace(this.STRING_fixedreference, this.STRING_empty)
                   .replace(this.STRING_or, this.CHAR_or)
                   .replace(this.STRING_and, this.CHAR_and);
        
        if (text.length === 0) {
            return text;
        }
        
        let needToContinue = true;
        
        text = this.parseSimpleInternal(text, [this.TOKEN_EP, this.TOKEN_EM], [this.CHAR_EP, this.CHAR_EM], needToContinue);
        text = this.parseSimpleInternal(text, [this.TOKEN_or], [this.CHAR_or], needToContinue);
        if (needToContinue.value) {
            text = this.parseSimpleInternal(text, [this.TOKEN_multiply, this.TOKEN_divide], [this.CHAR_multiply, this.CHAR_divide], needToContinue);
        }
        if (needToContinue.value) {
            text = this.parseSimpleInternal(text, [this.TOKEN_add, this.TOKEN_subtract], [this.CHAR_add, this.CHAR_subtract], needToContinue);
        }
        if (needToContinue.value) {
            text = this.parseSimpleInternal(text, 
                [this.TOKEN_less, this.TOKEN_greater, this.TOKEN_equal, this.TOKEN_lesseq, this.TOKEN_greatereq, this.TOKEN_noequal],
                [this.CHAR_less, this.CHAR_greater, this.CHAR_equal, this.CHAR_lesseq, this.CHAR_greatereq, this.CHAR_noequal],
                needToContinue);
        }
        if (this.supportLogicalOperators && needToContinue.value) {
            text = this.parseSimpleInternal(text, [this.TOKEN_NOTop], [this.CHAR_NOTop], needToContinue);
        }
        if (this.supportLogicalOperators && needToContinue.value) {
            text = this.parseSimpleInternal(text, [this.TOKEN_ORop, this.TOKEN_ANDop, this.TOKEN_XORop], 
                [this.CHAR_ORop, this.CHAR_ANDop, this.CHAR_XORop], needToContinue);
        }
        if (needToContinue.value) {
            text = this.parseSimpleInternal(text, [this.TOKEN_and], [this.CHAR_and], needToContinue);
        }
        
        return text;
    }

    // Parse simple internal
    parseSimpleInternal(text, markers, operators, needToContinue) {
        let i;
        let op = "";
        for (const c of operators) {
            op += c;
        }
        
        // Handle negative numbers
        text = text.replace(/---/g, "-").replace(/--/g, "+")
                   .replace(new RegExp(CalcEngine.ParseArgumentSeparator + "-", 'g'), CalcEngine.ParseArgumentSeparator + "u")
                   .replace(new RegExp(this.LEFTBRACKET + "-", 'g'), this.LEFTBRACKET + "u")
                   .replace(/=-/g, "=u").replace(/>-/g, ">u").replace(/<-/g, "<u")
                   .replace(/\/-/g, "/u").replace(/\*-/g, "*u").replace(/\+-/g, "-")
                   .replace(/--/g, "-u").replace(/w-/g, "wu");
        
        text = text.replace(/,\+/g, ",").replace(new RegExp(this.LEFTBRACKET + "\\+", 'g'), this.LEFTBRACKET)
                   .replace(/=\+/g, "=").replace(/>\+/g, ">").replace(/<\+/g, "<")
                   .replace(/\/\+/g, "/").replace(/\*\+/g, "*").replace(/\+\+/g, "+");
        
        if (text.length > 0 && text[0] === '-') {
            text = "0" + text;
        } else if (text.length > 0 && text[0] === '+') {
            text = text.substring(1);
        }
        
        // Process operators
        const operatorIndices = [];
        for (let idx = 0; idx < text.length; idx++) {
            if (operators.includes(text[idx])) {
                operatorIndices.push(idx);
            }
        }
        
        if (operatorIndices.length > 0) {
            while ((i = this.findFirstOperator(text, operators)) > -1) {
                let left = "";
                let right = "";
                let leftIndex = 0;
                let rightIndex = 0;
                const isNotOperator = this.supportLogicalOperators && text[i] === this.CHAR_NOTop;
                let j;
                
                if (!isNotOperator) {
                    if (i < 1 && text[i] !== '-') {
                        throw new Error(this.FormulaErrorStrings[this.operators_cannot_start_an_expression]);
                    }
                    j = i - 1;
                    if (i === 0 && text[i] === '-') {
                        text = this.BMARKER + "nu" + text.substring(1) + this.BMARKER;
                        continue;
                    } else if (text[j] === this.TIC[0]) {
                        const k = text.substring(0, j - 1).lastIndexOf(this.TIC);
                        if (k < 0) {
                            throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                        }
                        left = text.substring(k, j + 1);
                        leftIndex = k;
                    } else if (text[j] === this.BMARKER) {
                        const k = this.findLastNonQB(text.substring(0, j - 1));
                        if (k < 0) {
                            throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                        }
                        left = text.substring(k + 1, j);
                        leftIndex = k + 1;
                    } else if (text[j] === this.RIGHTBRACKET) {
                        let bracketCount = 0;
                        let k = j - 1;
                        while (k > 0 && (text[k] !== 'q' || bracketCount !== 0)) {
                            if (text[k] === 'q') {
                                bracketCount--;
                            } else if (text[k] === this.RIGHTBRACKET) {
                                bracketCount++;
                            }
                            k--;
                        }
                        if (k < 0) {
                            throw new Error(this.FormulaErrorStrings[this.bad_library]);
                        }
                        left = text.substring(k, j + 1);
                        leftIndex = k;
                    } else if (!this.isDigit(text[j]) && text[j] !== '%') {
                        while (j >= 0 && (this.isUpperCase(text[j]) || text[j] === '_' || text[j] === '.')) {
                            j--;
                        }
                        left = text.substring(j + 1, i);
                        leftIndex = j + 1;
                        let result = { scopedRange: "" };
                        if (this.NamedRanges[left]) {
                            left = this.parse(this.NamedRanges[left]);
                        } else if (this.checkIfScopedRange(left, result) && result.scopedRange) {
                            left = this.parse(result.scopedRange);
                        } else if (left === this.TRUEVALUESTR) {
                            left = 'n' + this.TRUEVALUESTR;
                        } else if (left === this.FALSEVALUESTR) {
                            left = 'n' + this.FALSEVALUESTR;
                        } else {
                            throw new Error(this.FormulaErrorStrings[this.invalid_char_in_front_of] + " " + text[i]);
                        }
                    } else {
                        let period = false;
                        let percent = false;
                        while (j > -1 && (this.isDigit(text[j]) || (!period && text[j] === CalcEngine.ParseDecimalSeparator) ||
                               (!percent && text[j] === '%') || text[j] === 'u')) {
                            if (text[j] === CalcEngine.ParseDecimalSeparator) {
                                period = true;
                            } else if (text[j] === '%') {
                                percent = true;
                            }
                            j--;
                        }
                        if (j > -1 && period && text[j] === CalcEngine.ParseDecimalSeparator) {
                            throw new Error(this.FormulaErrorStrings[this.number_contains_2_decimal_points]);
                        }
                        j++;
                        if (j === 0 || (j > 0 && !this.isUpperCase(text[j - 1]))) {
                            left = 'n' + text.substring(j, i);
                            leftIndex = j;
                        } else {
                            j--;
                            while (j > -1 && this.isUpperCase(text[j])) {
                                j--;
                            }
                            if (j > -1 && text[j] === 'u') {
                                j--;
                            }
                            if (j > -1 && text[j] === this.sheetToken) {
                                j--;
                                while (j > -1 && text[j] !== this.sheetToken) {
                                    j--;
                                }
                                if (j > -1 && text[j] === this.sheetToken) {
                                    j--;
                                }
                            }
                            if (j > -1 && text[j] === ':') {
                                j--;
                                while (j > -1 && this.isDigit(text[j])) {
                                    j--;
                                }
                                while (j > -1 && this.isUpperCase(text[j])) {
                                    j--;
                                }
                                if (j > -1 && text[j] === this.sheetToken) {
                                    j--;
                                    while (j > -1 && text[j] !== this.sheetToken) {
                                        j--;
                                    }
                                    if (j > -1 && text[j] === this.sheetToken) {
                                        j--;
                                    }
                                }
                                j++;
                                left = text.substring(j, i);
                                left = this.getCellFrom(left);
                            } else {
                                j++;
                                left = text.substring(j, i);
                            }
                            this.updateDependencies(left);
                            leftIndex = j;
                        }
                    }
                } else {
                    leftIndex = i;
                }
                
                if (i === text.length - 1) {
                    throw new Error(this.FormulaErrorStrings[this.expression_cannot_end_with_an_operator]);
                } else {
                    j = i + 1;
                    let isU = text[j] === 'u';
                    if (isU) {
                        j++;
                    }
                    if (text[j] === this.TIC[0]) {
                        const k = text.substring(j + 1).indexOf(this.TIC);
                        if (k < 0) {
                            throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                        }
                        right = text.substring(j, j + k + 2);
                        rightIndex = j + k + 2;
                    } else if (text[j] === this.BMARKER) {
                        const k = this.findNonQB(text.substring(j + 1));
                        if (k < 0) {
                            throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                        }
                        right = text.substring(j + 1, j + 1 + k);
                        if (isU) {
                            right = right + "nu1m";
                        }
                        rightIndex = k + j + 2;
                    } else if (text[j] === 'q') {
                        let bracketCount = 0;
                        let k = j + 1;
                        while (k < text.length && (text[k] !== this.RIGHTBRACKET || bracketCount !== 0)) {
                            if (text[k] === this.RIGHTBRACKET) {
                                bracketCount++;
                            } else if (text[k] === 'q') {
                                bracketCount--;
                            }
                            k++;
                        }
                        if (k === text.length) {
                            throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                        }
                        right = text.substring(j, k + 1);
                        if (isU) {
                            right = 'u' + right;
                        }
                        rightIndex = k + 1;
                    } else if (this.isDigit(text[j]) || text[j] === CalcEngine.ParseDecimalSeparator) {
                        let period = text[j] === CalcEngine.ParseDecimalSeparator;
                        j++;
                        while (j < text.length && (this.isDigit(text[j]) || (!period && text[j] === CalcEngine.ParseDecimalSeparator))) {
                            if (text[j] === CalcEngine.ParseDecimalSeparator) {
                                period = true;
                            }
                            j++;
                        }
                        if (j < text.length && text[j] === '%') {
                            j++;
                        }
                        if (period && j < text.length && text[j] === CalcEngine.ParseDecimalSeparator) {
                            throw new Error(this.FormulaErrorStrings[this.number_contains_2_decimal_points]);
                        }
                        right = 'n' + text.substring(i + 1, j);
                        rightIndex = j;
                    } else if (this.isUpperCase(text[j]) || text[j] === this.sheetToken || text[j] === 'u') {
                        if (text[j] === this.sheetToken) {
                            j++;
                            while (j < text.length && text[j] !== this.sheetToken) {
                                j++;
                            }
                        }
                        j++;
                        let j0 = 0;
                        while (j < text.length && (this.isUpperCase(text[j]) || text[j] === '_' || text[j] === '.')) {
                            j++;
                            j0++;
                        }
                        let noCellReference = (j === text.length) || !this.isDigit(text[j]);
                        if (j0 > 4) {
                            while (j < text.length && (this.isUpperCase(text[j]) || this.isDigit(text[j]))) {
                                j++;
                            }
                            noCellReference = true;
                        }
                        while (j < text.length && this.isDigit(text[j])) {
                            j++;
                        }
                        if (j < text.length && text[j] === ':') {
                            j++;
                            if (j < text.length && text[j] === this.sheetToken) {
                                j++;
                                while (j < text.length && text[j] !== this.sheetToken) {
                                    j++;
                                }
                                if (j < text.length && text[j] === this.sheetToken) {
                                    j++;
                                }
                            }
                            while (j < text.length && this.isUpperCase(text[j])) {
                                j++;
                            }
                            while (j < text.length && this.isDigit(text[j])) {
                                j++;
                            }
                            j--;
                            right = text.substring(i + 1, j + 1);
                            right = this.getCellFrom(right);
                        } else {
                            j--;
                            right = text.substring(i + 1, j + 1);
                            if (isU) {
                                right = 'u' + right;
                            }
                        }
                        if (!noCellReference) {
                            this.updateDependencies(right);
                        } else {
                            let result = { scopedRange: "" };
                            if (this.NamedRanges[right]) {
                                right = this.parse(this.NamedRanges[right]);
                            } else if (this.checkIfScopedRange(right, result) && result.scopedRange) {
                                right = this.parse(result.scopedRange);
                            } else if (right === this.TRUEVALUESTR) {
                                right = 'n' + this.TRUEVALUESTR;
                            } else if (right === this.FALSEVALUESTR) {
                                right = 'n' + this.FALSEVALUESTR;
                            } else {
                                throw new Error(this.FormulaErrorStrings[this.invalid_characters_following_an_operator]);
                            }
                        }
                        rightIndex = j + 1;
                    } else {
                        throw new Error(this.FormulaErrorStrings[this.invalid_characters_following_an_operator]);
                    }
                }
                
                const p = op.indexOf(text[i]);
                let s = this.BMARKER + this.zapBlocks(left) + this.zapBlocks(right) + markers[p] + this.BMARKER;
                if (leftIndex > 0) {
                    s = text.substring(0, leftIndex) + s;
                }
                if (rightIndex < text.length) {
                    s = s + text.substring(rightIndex);
                }
                s = s.replace(this.BMARKER2, this.BMARKER);
                text = s;
            }
        } else {
            const j = text.length - 1;
            if (text[j] === this.BMARKER) {
                const k = this.findLastNonQB(text.substring(0, j - 1));
                if (k < 0) {
                    throw new Error(this.FormulaErrorStrings[this.cannot_parse]);
                }
            } else if (text[j] === this.RIGHTBRACKET) {
                let bracketCount = 0;
                let k = j - 1;
                while (k > 0 && (text[k] !== 'q' || bracketCount !== 0)) {
                    if (text[k] === 'q') {
                        bracketCount--;
                    } else if (text[k] === this.RIGHTBRACKET) {
                        bracketCount++;
                    }
                    k--;
                }
                if (k < 0) {
                    throw new Error(this.FormulaErrorStrings[this.bad_library]);
                }
            } else if (!this.isDigit(text[j])) {
                // Nothing to do
            } else {
                let period = false;
                let percent = false;
                let jj = j;
                while (jj > -1 && (this.isDigit(text[jj]) || (!period && text[jj] === CalcEngine.ParseDecimalSeparator) ||
                       (!percent && text[jj] === '%'))) {
                    if (text[jj] === CalcEngine.ParseDecimalSeparator) {
                        period = true;
                    } else if (text[jj] === '%') {
                        percent = true;
                    }
                    jj--;
                }
                if (jj > -1 && period && text[jj] === CalcEngine.ParseDecimalSeparator) {
                    throw new Error(this.FormulaErrorStrings[this.number_contains_2_decimal_points]);
                }
            }
            
            if (text.length > 0 && (this.isUpperCase(text[0]) || text[0] === this.sheetToken)) {
                let ok = true;
                let checkLetter = true;
                let oneTokenFound = false;
                
                for (let k = 0; k < text.length; ++k) {
                    if (text[k] === this.sheetToken) {
                        if (k > 0 && !oneTokenFound) {
                            throw new Error(this.FormulaErrorStrings[this.missing_sheet]);
                        }
                        oneTokenFound = true;
                        k++;
                        while (k < text.length && this.isDigit(text[k])) {
                            k++;
                        }
                        if (k === text.length || text[k] !== this.sheetToken) {
                            ok = false;
                            break;
                        }
                    } else {
                        if (!checkLetter && this.isLetter(text[k])) {
                            ok = false;
                            break;
                        }
                        if (this.isLetterOrDigit(text[k]) || text[k] === this.sheetToken) {
                            checkLetter = this.isUpperCase(text[k]);
                        } else {
                            ok = false;
                            break;
                        }
                    }
                }
                
                if (ok) {
                    this.updateDependencies(text);
                    needToContinue.value = false;
                }
            }
        }
        
        return text;
    }

    // Find first operator
    findFirstOperator(text, operators) {
        let firstIndex = -1;
        for (let i = 0; i < text.length; i++) {
            if (operators.includes(text[i])) {
                return i;
            }
        }
        return firstIndex;
    }

    // Handle embedded Es
    handleEmbeddedEs(text) {
        let j = 0;
        while (j > -1 && (j = text.indexOf(this.STRING_EP, j)) > -1) {
            if (this.notInBlock(text, j)) {
                let left = j;
                while (left > 0 && (this.isDigit(text[left - 1]) || text[left - 1] === CalcEngine.ParseDecimalSeparator)) {
                    left--;
                }
                if (left !== j && (left === 0 || !this.isUpperCase(text[left - 1]))) {
                    let right = j + this.STRING_EP.length;
                    while (right < text.length && this.isDigit(text[right])) {
                        right++;
                    }
                    if (right !== j + this.STRING_EP.length) {
                        text = text.substring(0, j) + this.CHAR_EP + text.substring(j + this.STRING_EP.length);
                    }
                }
            }
            j++;
        }
        
        j = 0;
        while (j > -1 && (j = text.indexOf(this.STRING_EM, j)) > -1) {
            if (this.notInBlock(text, j)) {
                let left = j;
                while (left > 0 && (this.isDigit(text[left - 1]) || text[left - 1] === CalcEngine.ParseDecimalSeparator)) {
                    left--;
                }
                if (left !== j && (left === 0 || !this.isUpperCase(text[left - 1]))) {
                    let right = j + this.STRING_EM.length;
                    while (right < text.length && this.isDigit(text[right])) {
                        right++;
                    }
                    if (right !== j + this.STRING_EM.length) {
                        text = text.substring(0, j) + this.CHAR_EM + text.substring(j + this.STRING_EM.length);
                    }
                }
            }
            j++;
        }
        
        j = 0;
        while (j > -1 && (j = text.indexOf(this.STRING_E, j)) > -1 && text[0] !== this.BMARKER) {
            if (this.notInBlock(text, j)) {
                let left = j;
                while (left > 0 && (this.isDigit(text[left - 1]) || text[left - 1] === CalcEngine.ParseDecimalSeparator)) {
                    left--;
                }
                if (left !== j && (left === 0 || !this.isUpperCase(text[left - 1]))) {
                    let right = j + this.STRING_E.length;
                    while (right < text.length && this.isDigit(text[right])) {
                        right++;
                    }
                    if (right !== j + this.STRING_E.length && (left === -1 || !this.isUpperCase(text[left]))) {
                        text = text.substring(0, j) + this.CHAR_EP + text.substring(j + this.STRING_E.length);
                    }
                }
            }
            j++;
        }
        
        return text;
    }

    // Not in block
    notInBlock(text, position) {
        let i = text.indexOf(this.BMARKER);
        let inBlock = false;
        while (i > -1 && i < position) {
            inBlock = !inBlock;
            i = text.indexOf(this.BMARKER, i + 1);
        }
        return !inBlock;
    }

    // Find last non QB
    findLastNonQB(text) {
        let ret = -1;
        if (text.indexOf(this.BMARKER) > -1) {
            let bracketLevel = 0;
            for (let i = text.length - 1; i >= 0; --i) {
                if (text[i] === this.RIGHTBRACKET) {
                    bracketLevel--;
                } else if (text[i] === this.LEFTBRACKET) {
                    bracketLevel++;
                } else if (text[i] === this.BMARKER && bracketLevel === 0) {
                    ret = i;
                    break;
                }
            }
        }
        return ret;
    }

    // Find non QB
    findNonQB(text) {
        let ret = -1;
        if (text.indexOf(this.BMARKER) > -1) {
            let bracketLevel = 0;
            for (let i = 0; i < text.length; ++i) {
                if (text[i] === this.RIGHTBRACKET) {
                    bracketLevel--;
                } else if (text[i] === this.LEFTBRACKET) {
                    bracketLevel++;
                } else if (text[i] === this.BMARKER && bracketLevel === 0) {
                    ret = i;
                    break;
                }
            }
        }
        return ret;
    }

    // Find last q not in brackets
    findLastqNotInBrackets(s) {
        let found = -1;
        let lastBracket = false;
        let i = s.length - 1;
        while (i > -1) {
            if (s[i] === 'q' && lastBracket) {
                found = i;
                break;
            }
            if (s[i] === this.LEFTBRACKET) {
                lastBracket = true;
            } else if (s[i] === this.RIGHTBRACKET) {
                lastBracket = false;
            }
            i--;
        }
        return found;
    }

    // Matching right bracket
    matchingRightBracket(formula) {
        let ret = -1;
        let loc = 1;
        let bracketLevel = 0;
        const token = this.sheetToken(formula);
        
        while (ret === -1 && loc < formula.length) {
            if (formula[loc] === this.RIGHTBRACKET) {
                if (bracketLevel === 0) {
                    ret = loc;
                } else {
                    bracketLevel--;
                    if (bracketLevel === 0 && loc === formula.length - 1) {
                        ret = loc;
                    }
                }
            } else if (formula[loc] === 'q') {
                const val = loc + 1;
                if (val < formula.length) {
                    const result = { value: val };
                    const libFunc = this.processUpperCase(formula, result, { value: token });
                    if (libFunc !== '' && this.libraryFunctions[libFunc]) {
                        bracketLevel++;
                    }
                }
            }
            loc++;
        }
        return ret;
    }

    // Zap blocks
    zapBlocks(text) {
        if (text.indexOf(this.BMARKER) > -1) {
            let bracketLevel = 0;
            let result = "";
            for (let i = 0; i < text.length; ++i) {
                if (text[i] === this.RIGHTBRACKET) {
                    bracketLevel--;
                    result += text[i];
                } else if (text[i] === this.LEFTBRACKET) {
                    bracketLevel++;
                    result += text[i];
                } else if (text[i] === this.BMARKER && bracketLevel === 0) {
                    // Skip BMARKER
                } else {
                    result += text[i];
                }
            }
            return result;
        }
        return text;
    }

    // Check has char before number
    checkHasCharBeforeNumber(tempFormula) {
        let check = false;
        for (let x = tempFormula.length - 1; x > 0; x--) {
            if (this.isLetter(tempFormula[x])) {
                check = true;
                break;
            }
        }
        return check;
    }

    // Is range
    isRange(range) {
        let isRange = false;
        const i = range.indexOf(':');
        if (i > 1 && i < range.length - 2) {
            let j = i - 1;
            if (this.isDigit(range[j])) {
                let needToCheckRightSide = false;
                j--;
                while (j > 0 && this.isDigit(range[j])) {
                    j--;
                }
                if (this.isLetter(range[j])) {
                    j--;
                    while (j >= 0 && this.isLetter(range[j])) {
                        j--;
                    }
                    if (j > -1 && range[j] === this.STRING_fixedreference[0]) {
                        j--;
                    }
                    if (j < 0) {
                        needToCheckRightSide = true;
                    } else {
                        if (range[j] === this.sheetToken) {
                            if (j-- > 1 && range[j] === this.CHARTIC) {
                                needToCheckRightSide = range.substring(0, j - 1).lastIndexOf(this.CHARTIC) === 0;
                            } else if (j > 0 && this.isDigit(range[j])) {
                                needToCheckRightSide = range.substring(0, j).lastIndexOf(this.sheetToken) === 0;
                            }
                        }
                    }
                }
                if (needToCheckRightSide) {
                    j = i + 1;
                    if (j < range.length - 6 && range[j] === this.CHARTIC) {
                        j = range.indexOf(this.sheetToken, j + 1);
                        if (j < range.length - 2) {
                            j++;
                        }
                    }
                    if (j < range.length - 2 && range[j] === this.STRING_fixedreference[0]) {
                        j++;
                    }
                    if (this.isLetter(range[j])) {
                        j++;
                        while (j < range.length - 1 && this.isLetter(range[j])) {
                            j++;
                        }
                        if (this.isDigit(range[j])) {
                            j++;
                            while (j < range.length && this.isDigit(range[j])) {
                                j++;
                            }
                            isRange = j === range.length;
                        }
                    }
                }
            }
        }
        return isRange;
    }

    // Sheet token
    sheetToken(s) {
        let i = 0;
        let s1 = "";
        if (i < s.length && s[i] === this.sheetToken) {
            i++;
            while (i < s.length && s[i] !== this.sheetToken) {
                i++;
            }
            s1 = s.substring(0, i + 1);
        }
        if (i < s.length) {
            return s1;
        }
        throw new Error(this.FormulaErrorStrings[this.bad_index]);
    }

    // Get cell from range
    getCellFrom(range) {
        let s = "";
        const cells = this.getCellsFromArgs(range);
        const last = cells.length - 1;
        const r1 = this.rowIndex(cells[0]);
        let x;
        if (r1 === this.rowIndex(cells[last])) {
            const c1 = this.colIndex(cells[0]);
            const c2 = this.colIndex(cells[last]);
            const c = this.colIndex(this.cell);
            if (c >= c1 && c <= c2) {
                s = `${RangeInfo.getAlphaLabel(c)}${r1}`;
            }
        } else if ((x = this.colIndex(cells[0])) === this.colIndex(cells[last])) {
            const r2 = this.rowIndex(cells[last]);
            const r = this.rowIndex(this.cell);
            if (r >= r1 && r <= r2) {
                s = `${RangeInfo.getAlphaLabel(x)}${r}`;
            }
        }
        return s;
    }

    // Get cells from args
    getCellsFromArgs(args) {
        this.markColonsInQuotes(args);
        let row1, col1;
        let i = args.indexOf(':');
        
        if (i === -1) {
            args = args.replace(new RegExp(this.markerChar, 'g'), ':');
            i = args.indexOf(CalcEngine.ParseArgumentSeparator);
            if (i === -1) {
                row1 = this.rowIndex(args);
                col1 = this.colIndex(args);
                return [args];
            } else {
                return this.splitArgsPreservingQuotedCommas(args);
            }
        }
        
        let sheet = "";
        let j = args.indexOf(this.sheetToken);
        if (j > -1) {
            const j1 = args.indexOf(this.sheetToken, j + 1);
            if (j1 > -1) {
                sheet = args.substring(j, j1 + 1);
                args = args.replace(sheet, "");
                i = args.indexOf(':');
            }
        }
        
        if (i > 0 && this.isLetter(args[i - 1])) {
            const count = (this.rowMaxCount > 0) ? this.rowMaxCount : 50;
            // Assuming grid supports row count
            const actualCount = this.grid.getRowCount ? this.grid.getRowCount() : count;
            args = args.substring(0, i) + "1:" + args.substring(i + 1) + actualCount.toString();
            i = args.indexOf(':');
        } else if (i > 0 && this.isDigit(args[i - 1])) {
            let k1 = i - 2;
            while (k1 >= 0 && this.isDigit(args[k1])) {
                k1--;
            }
            if (k1 === -1 || !this.isLetter(args[k1])) {
                const count = (this.columnMaxCount > 0) ? this.columnMaxCount : 50;
                // Assuming grid supports column count
                const actualCount = this.grid.getColumnCount ? this.grid.getColumnCount() : count;
                args = "A" + args.substring(0, i) + ":" + RangeInfo.getAlphaLabel(actualCount) + args.substring(i + 1);
                i = args.indexOf(':');
            }
        }
        
        row1 = this.rowIndex(args.substring(0, i));
        col1 = this.colIndex(args.substring(0, i));
        const row2 = this.rowIndex(args.substring(i + 1));
        const col2 = this.colIndex(args.substring(i + 1));
        
        const minRow = Math.min(row1, row2);
        const maxRow = Math.max(row1, row2);
        const minCol = Math.min(col1, col2);
        const maxCol = Math.max(col1, col2);
        
        const numCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
        const cells = new Array(numCells);
        let k = 0;
        
        for (let r = minRow; r <= maxRow; ++r) {
            for (let c = minCol; c <= maxCol; ++c) {
                try {
                    cells[k++] = sheet + RangeInfo.getAlphaLabel(c) + r.toString();
                } catch {
                    continue;
                }
            }
        }
        
        return cells;
    }

    // Mark colons in quotes
    markColonsInQuotes(args) {
        let inQuotes = false;
        let result = args;
        for (let i = 0; i < result.length; ++i) {
            if (result[i] === this.TIC[0]) {
                inQuotes = !inQuotes;
            } else if (result[i] === ':' && inQuotes) {
                result = result.substring(0, i) + this.markerChar + result.substring(i + 1);
            }
        }
        return result;
    }

    // Row index
    rowIndex(s) {
        let i = 0;
        if (i < s.length && s[i] === this.sheetToken) {
            i++;
            while (i < s.length && s[i] !== this.sheetToken) {
                i++;
            }
            i++;
        }
        while (i < s.length && this.isLetter(s[i])) {
            i++;
        }
        if (i < s.length) {
            return parseInt(s.substring(i));
        }
        throw new Error(this.FormulaErrorStrings[this.bad_index]);
    }

    // Column index
    colIndex(s) {
        let i = 0;
        let k = 0;
        s = s.toUpperCase();
        if (i < s.length && s[i] === this.sheetToken) {
            i++;
            while (i < s.length && s[i] !== this.sheetToken) {
                i++;
            }
            i++;
        }
        while (i < s.length && this.isLetter(s[i])) {
            k = k * 26 + (s.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
            i++;
        }
        if (k === 0) {
            throw new Error(this.FormulaErrorStrings[this.bad_index]);
        }
        return k;
    }

    // Get value from argument
    getValueFromArg(arg) {
        let d;
        
        if (!arg || arg.length === 0) {
            return "";
        } else if (arg[0] === this.TIC[0]) {
            return arg;
        } else if (arg[0] === this.BMARKER || arg[0] === 'q') {
            arg = arg.replace(/{/g, '(');
            arg = arg.replace(/}/g, ')');
            return this.computedValue(arg);
        } else if (arg.length > 1 && arg.substring(0, 2) === "ub") {
            arg = arg.replace(/{/g, '(');
            arg = arg.replace(/}/g, ')');
            const ggg = arg.substring(1);
            const val = this.computedValue(ggg);
            const d2 = parseFloat(val);
            if (!isNaN(d2)) {
                return (-d2).toString();
            }
            return this.computedValue(arg);
        } else {
            if (arg.startsWith("unu")) {
                arg = "n" + arg.substring(3);
            } else if (arg.startsWith("un")) {
                arg = "-" + arg.substring(2);
            }
            arg = arg.replace(/u/g, '-');
            
            if (!this.isUpperCase(arg[0]) && 
                (this.isDigit(arg[0]) || arg[0] === CalcEngine.ParseDecimalSeparator || arg[0] === '-' || arg[0] === 'n')) {
                if (arg[0] === 'n') {
                    arg = arg.substring(1);
                }
                d = parseFloat(arg);
                if (!isNaN(d)) {
                    return this.getValueFromArgPreserveLeadingZeros ? arg : d.toString();
                } else if (arg.startsWith(this.TRUEVALUESTR) || arg.startsWith(this.FALSEVALUESTR)) {
                    return arg;
                }
            }
        }
        
        if ((arg.indexOf('+') === -1 && arg.indexOf('-') === -1 && arg.indexOf('/') === -1 && 
             arg.indexOf('*') === -1 && arg.indexOf(')') === -1 && arg.indexOf('{') === -1 &&
             this.isUpperCase(arg[0])) || arg[0] === this.sheetToken) {
            if (arg === this.cell) {
                const ht = this.DependentCells[arg];
                if (ht && ht.indexOf(arg) > -1) {
                    ht.splice(ht.indexOf(arg), 1);
                }
                this.clearFormulaDependentCells(this.cell);
                throw new Error(this.FormulaErrorStrings[this.circular_reference_] + arg);
            }
            let s1 = this.getValueFromParentObject(arg);
            if (arg !== this.TRUEVALUESTR && arg !== this.FALSEVALUESTR) {
                if (!this.getValueFromArgPreserveLeadingZeros && s1.length > 0) {
                    d = parseFloat(s1.replace(new RegExp(this.TIC, 'g'), ""));
                    if (!isNaN(d)) {
                        s1 = d.toString();
                    }
                }
                this.updateDependencies(arg);
            }
            return s1;
        }
        
        arg = arg.replace(/{/g, '(');
        arg = arg.replace(/}/g, ')');
        arg = this.parse(arg);
        if (arg.endsWith("%")) {
            d = parseFloat(arg.substring(0, arg.length - 1));
            if (!isNaN(d)) {
                arg = (d / 100).toString();
            }
        }
        
        if (arg === "#VALUE!") {
            return "#VALUE!";
        }
        
        try {
            const result = this.computedValue(arg);
            // Ensure we return a safe string value
            if (result === null || result === undefined) {
                return "";
            } else if (typeof result === 'string') {
                return result;
            } else if (typeof result === 'number' && !isNaN(result)) {
                return result.toString();
            } else if (typeof result === 'boolean') {
                return result ? this.TRUEVALUESTR : this.FALSEVALUESTR;
            } else if (result && typeof result.toString === 'function') {
                return result.toString();
            } else {
                return String(result || "");
            }
        } catch (ex) {
            return "#ERROR!";
        }
    }

    // Get value from parent object
    getValueFromParentObject(cell1) {
        if (cell1 === this.TRUEVALUESTR || cell1 === this.FALSEVALUESTR) {
            return cell1;
        }
        
        const i = cell1.lastIndexOf(this.sheetToken);
        let row, col;
        let grd = this.grid;
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        
        if (i > -1 && family.TokenToParentObject) {
            this.grid = family.TokenToParentObject[cell1.substring(0, i + 1)];
            row = this.rowIndex(cell1);
            col = this.colIndex(cell1);
        } else {
            row = this.rowIndex(cell1);
            col = this.colIndex(cell1);
            if (this.isSheeted && family.ParentObjectToToken) {
                cell1 = family.ParentObjectToToken[this.grid] + cell1;
            }
        }
        
        const saveCell = this.cell;
        this.cell = cell1;
        
        if (this.iterationMaxCount > 0) {
            if (this.circCheckList.indexOf(this.cell) > -1 && this.computedValueLevel > 0) {
                this.grid = grd;
                this.cell = saveCell;
                if (!this.IterationValues[this.cell]) {
                    this.IterationValues[this.cell] = "0";
                }
                return this.IterationValues[this.cell].toString();
            } else if (this.IterationValues[this.cell] && this.computedValueLevel > 0) {
                return this.IterationValues[this.cell].toString();
            }
        }
        
        const val = this.getValueComputeFormulaIfNecessary(row, col, this.grid);
        this.grid = grd;
        this.cell = saveCell;
        return val;
    }

    // Get value compute formula if necessary
    getValueComputeFormulaIfNecessary(row, col, grd) {
        let formula = this.FormulaInfoTable[this.cell];
        const o = grd.getValueRowCol(row, col);
        let val = (o !== null && o !== undefined) ? o.toString() : "";
        
        if (val.length > 0 && val[0] === CalcEngine.FormulaCharacter) {
            if (formula) {
                // Formula exists
            } else {
                formula = new FormulaInfo();
                formula.FormulaText = o.toString();
                if (!this.DependentFormulaCells[this.cell]) {
                    this.DependentFormulaCells[this.cell] = {};
                }
                let compute = true;
                try {
                    formula.ParsedFormula = this.parseFormula(o.toString());
                } catch (ex) {
                    if (this.inAPull) {
                        val = ex.message;
                        formula = null;
                    } else {
                        formula.FormulaValue = ex.message;
                    }
                    compute = false;
                }
                if (compute) {
                    formula.FormulaValue = this.computeFormula(formula.ParsedFormula);
                }
                if (formula) {
                    formula.calcID = this.calcID;
                    this.FormulaInfoTable[this.cell] = formula;
                    val = formula.FormulaValue || "";
                }
            }
        }
        
        if (formula) {
            if (this.calculationsSuspended && !this.inAPull) {
                val = formula.FormulaValue || "";
            } else {
                val = this.computeFormula(formula.ParsedFormula);
                formula.FormulaValue = val;
                formula.calcID = this.calcID;
            }
        }
        
        if (val === null || val === undefined) {
            val = "";
        }
        
        if (val.endsWith("%")) {
            const d = parseFloat(val.substring(0, val.length - 1));
            if (!isNaN(d)) {
                val = (d / 100).toString();
            }
        }
        
        return val;
    }

    // Update dependencies
    updateDependencies(s) {
        if (this.lockDependencies || !this.useDependencies) {
            return;
        }
        
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        let cell1 = this.cell;
        
        if (family.SheetNameToParentObject && cell1.indexOf(this.sheetToken) === -1) {
            const token = family.ParentObjectToToken[this.grid];
            cell1 = token + cell1;
        }
        
        if (family.SheetNameToParentObject && s.indexOf(this.sheetToken) === -1) {
            const token = family.ParentObjectToToken[this.grid];
            s = token + s;
        }
        
        if (!this.DependentCells[s]) {
            const ht1 = [];
            this.DependentCells[s] = ht1;
            ht1.push(cell1);
            
            if (this.DependentFormulaCells[s]) {
                const ht = this.DependentFormulaCells[s];
                if (ht) {
                    for (const s1 in ht) {
                        let ht2 = this.DependentCells[s1];
                        if (!ht2) {
                            ht2 = [];
                            this.DependentCells[s1] = ht2;
                        }
                        if (ht2.indexOf(cell1) === -1) {
                            ht2.push(cell1);
                        }
                    }
                }
            }
            
            this.addToFormulaDependentCells(s);
            
            if (this.DependentCells[cell1]) {
                const ht = this.DependentCells[cell1];
                if (ht && ht !== ht1) {
                    for (const s1 of ht) {
                        ht1.push(s1);
                    }
                }
            }
        } else {
            const ht1 = this.DependentCells[s];
            if (ht1.indexOf(cell1) === -1) {
                ht1.push(cell1);
            }
            
            this.addToFormulaDependentCells(s);
            
            if (this.DependentFormulaCells[s]) {
                const ht = this.DependentFormulaCells[s];
                if (ht) {
                    for (const s1 in ht) {
                        let ht2 = this.DependentCells[s1];
                        if (!ht2) {
                            ht2 = [];
                            this.DependentCells[s1] = ht2;
                        }
                        if (ht2.indexOf(cell1) === -1) {
                            ht2.push(cell1);
                        }
                    }
                }
            }
        }
    }

    // Add to formula dependent cells
    addToFormulaDependentCells(s) {
        let cell1 = this.cell;
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        
        if (family.SheetNameToParentObject && family.ParentObjectToToken && 
            family.ParentObjectToToken[this.grid] && cell1.indexOf(this.sheetToken) === -1) {
            const token = family.ParentObjectToToken[this.grid];
            cell1 = token + cell1;
        }
        
        if (!this.DependentFormulaCells[cell1]) {
            this.DependentFormulaCells[cell1] = {};
            this.DependentFormulaCells[cell1][s] = s;
        } else if (!this.DependentFormulaCells[cell1][s]) {
            this.DependentFormulaCells[cell1][s] = s;
        }
    }

    // Clear formula dependent cells
    clearFormulaDependentCells(cell) {
        const ht = this.DependentFormulaCells[cell];
        if (ht) {
            for (const s in ht) {
                const al = this.DependentCells[s];
                if (al) {
                    const index = al.indexOf(cell);
                    if (index > -1) {
                        al.splice(index, 1);
                    }
                    if (al.length === 0) {
                        delete this.DependentCells[s];
                    }
                }
            }
            delete this.DependentFormulaCells[cell];
        }
    }

    // Grid value changed event handler
    grid_ValueChanged(sender, e) {
        if (this.ignoreValueChanged) {
            return;
        }
        
        const grd = sender;
        this.grid = sender;
        let computedValueChanged = true;
        const family = CalcEngine.getSheetFamilyItem(grd);
        let s = RangeInfo.getAlphaLabel(e.colIndex) + e.rowIndex.toString();
        
        if (family.SheetNameToParentObject && Object.keys(family.SheetNameToParentObject).length > 0) {
            let token = "";
            if (family.ParentObjectToToken && family.ParentObjectToToken[grd]) {
                token = family.ParentObjectToToken[grd];
            }
            s = token + s;
        }
        
        if (e.value.length > 0 && e.value[0] === CalcEngine.FormulaCharacter) {
            this.cell = s;
            let formula;
            let compute = true;
            
            if (this.FormulaInfoTable[s]) {
                formula = this.FormulaInfoTable[s];
                if (e.value !== formula.FormulaText || !formula.ParsedFormula) {
                    formula.FormulaText = e.value;
                    this.clearFormulaDependentCells(this.cell);
                    try {
                        formula.ParsedFormula = this.parseFormula(e.value);
                    } catch (ex) {
                        formula.FormulaValue = ex.message;
                        compute = false;
                    }
                }
                if (compute) {
                    const s1 = this.computeFormula(formula.ParsedFormula);
                    computedValueChanged = (s1 !== formula.FormulaValue) || this.forceRefreshCall;
                    formula.FormulaValue = s1;
                }
                formula.calcID = this.calcID;
            } else {
                formula = new FormulaInfo();
                formula.FormulaText = e.value;
                if (!this.DependentFormulaCells[s]) {
                    this.DependentFormulaCells[s] = {};
                }
                try {
                    formula.ParsedFormula = this.parseFormula(e.value);
                } catch (ex) {
                    formula.FormulaValue = ex.message;
                    compute = false;
                }
                if (compute) {
                    formula.FormulaValue = this.computeFormula(formula.ParsedFormula);
                }
                formula.calcID = this.calcID;
                this.FormulaInfoTable[s] = formula;
            }
            
            if (this.iterationMaxCount > 0 && compute && !this.inHandleIterations) {
                if (s === this.cell) {
                    this.handleIterations(formula);
                }
            }
            
            const saveIVC = this.ignoreValueChanged;
            this.ignoreValueChanged = true;
            grd.setValueRowCol(formula.FormulaValue, e.rowIndex, e.colIndex);
            this.ignoreValueChanged = saveIVC;
        } else if (!this.inRecalculateRange && this.FormulaInfoTable[s]) {
            delete this.FormulaInfoTable[s];
            this.clearFormulaDependentCells(s);
        }
        
        if (computedValueChanged && this.DependentCells[s]) {
            this.dependencyLevel = 0;
            this.refresh(s);
        }
    }

    // Handle iterations
    handleIterations(formula) {
        this.inHandleIterations = true;
        let oldValue = 0;
        let d = 0;
        let count = 1;
        let first = true;
        
        while (count < this.iterationMaxCount && (first || !this.checkUnderTolerance(d, oldValue))) {
            first = false;
            if (!this.IterationValues[this.cell]) {
                this.IterationValues[this.cell] = "0";
            }
            this.IterationValues[this.cell] = formula.FormulaValue.length === 0 ? "0" : formula.FormulaValue;
            formula.FormulaValue = this.computeFormula(formula.ParsedFormula);
            oldValue = d;
            d = parseFloat(formula.FormulaValue);
            if (isNaN(d)) d = 0;
            count++;
        }
        
        this.IterationValues[this.cell] = formula.FormulaValue.length === 0 ? "0" : formula.FormulaValue;
        this.inHandleIterations = false;
    }

    // Check under tolerance
    checkUnderTolerance(d, oldValue) {
        if (Math.abs(oldValue) > this.ABSOLUTEZERO) {
            return Math.abs((d - oldValue) / oldValue) < this.iterationMaxTolerance;
        } else {
            return Math.abs(d - oldValue) < this.iterationMaxTolerance;
        }
    }

    // Refresh
    refresh(s) {
        if (this.calculationsSuspended) {
            return;
        }
        
        if (this.dependencyLevel === 0) {
            this.refreshedCells = {};
        }
        
        if (this.DependentCells[s] && this.DependentCells[s]) {
            this.dependencyLevel++;
            try {
                const family = CalcEngine.getSheetFamilyItem(this.grid);
                const ht = this.DependentCells[s];
                const save1 = this.lockDependencies;
                this.lockDependencies = true;
                
                for (const s1 of ht) {
                    if (s1) {
                        let grd = this.grid;
                        const sheet = this.sheetToken(s1);
                        if (sheet.length > 0) {
                            this.grid = family.TokenToParentObject[sheet];
                        }
                        const row = this.rowIndex(s1);
                        const col = this.colIndex(s1);
                        const info = this.FormulaInfoTable[s1];
                        
                        if (info) {
                            const save = this.cell;
                            this.cell = s1;
                            if (this.alwaysComputeDuringRefresh || info.calcID !== this.calcID || info.FormulaValue.length === 0) {
                                info.FormulaValue = this.computeFormula(info.ParsedFormula);
                            }
                            info.calcID = this.calcID;
                            this.cell = save;
                            const saveIVC = this.ignoreValueChanged;
                            this.ignoreValueChanged = true;
                            this.grid.setValueRowCol(info.FormulaValue, row, col);
                            this.ignoreValueChanged = saveIVC;
                            if (!this.refreshedCells[s1]) {
                                this.refreshedCells[s1] = 0;
                                this.refresh(s1);
                            }
                        }
                        this.grid = grd;
                    }
                }
                this.lockDependencies = save1;
            } finally {
                if (!this.refreshedCells[s]) {
                    this.refreshedCells[s] = 0;
                }
                this.dependencyLevel--;
                if (this.dependencyLevel === 0) {
                    this.refreshedCells = {};
                }
            }
        }
    }

    // Update calc ID
    updateCalcID() {
        this.calcID++;
        if (this.calcID === Number.MAX_SAFE_INTEGER) {
            this.calcID = Number.MIN_SAFE_INTEGER + 1;
        }
    }

    // Get calc ID
    getCalcID() {
        return this.calcID;
    }

    // Pull updated value
    pullUpdatedValue(cellRef) {
        this.inAPull = true;
        const grd = this.grid;
        const saveCell = this.cell;
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        let s = cellRef.toUpperCase();
        let i;
        
        if ((i = s.indexOf(this.sheetToken)) === -1 && this.cell !== '') {
            i = this.cell.indexOf(this.sheetToken, 1);
            if (i > -1 && family.TokenToParentObject) {
                s = this.cell.substring(0, i + 1) + s;
                this.grid = family.TokenToParentObject[this.cell.substring(0, i + 1)];
            }
        } else {
            if (i > 0 && family.SheetNameToToken && family.TokenToParentObject) {
                const token = family.SheetNameToToken[s.substring(0, i)];
                s = token + s.substring(i + 1);
                this.grid = family.TokenToParentObject[token];
                this.cell = s;
            }
        }
        
        this.updateCalcID();
        let txt;
        
        if (!this.DependentFormulaCells[s] && !this.FormulaInfoTable[s]) {
            txt = this.getValueFromParentObject(s);
            const saveIVC = this.ignoreValueChanged;
            this.ignoreValueChanged = true;
            const row = this.rowIndex(s);
            const col = this.colIndex(s);
            if (this.preserveFormula) {
                const token = this.sheetToken(cellRef);
                if (token === '') {
                    const tokenId = "!" + this.getSheetID(this.grid) + "!";
                    const formula = this.FormulaInfoTable[tokenId + s];
                    this.grid.setValueRowCol(formula.FormulaText, row, col);
                } else {
                    this.grid.setValueRowCol(txt, row, col);
                }
            } else {
                this.grid.setValueRowCol(txt, row, col);
            }
            this.ignoreValueChanged = saveIVC;
        } else {
            this.processedCells = [];
            this.updateDependenciesAndCell(s);
            this.processedCells = [];
            txt = this.getValueFromParentObject(s);
        }
        
        this.grid = grd;
        this.cell = saveCell;
        this.inAPull = false;
        return txt;
    }

    // Update dependencies and cell
    updateDependenciesAndCell(cell1) {
        const grd = this.grid;
        const family = CalcEngine.getSheetFamilyItem(this.grid);
        const sheet = this.sheetToken(cell1);
        if (sheet.length > 0) {
            this.grid = family.TokenToParentObject[sheet];
        }
        
        if (this.FormulaInfoTable[cell1]) {
            const formula = this.FormulaInfoTable[cell1];
            if (formula.calcID !== this.calcID) {
                const saveCell = this.cell;
                this.cell = cell1;
                if (this.iterationMaxCount > 0 && this.circCheckList.indexOf(this.cell) > -1) {
                    this.handleIterations(formula);
                } else {
                    formula.FormulaValue = this.computeFormula(formula.ParsedFormula);
                }
                
                if (this.DependentCells[cell1]) {
                    const ht = this.DependentCells[cell1];
                    for (const s of ht) {
                        const f = this.FormulaInfoTable[s];
                        if (f) {
                            f.calcID = Number.MIN_SAFE_INTEGER;
                        }
                    }
                }
                formula.calcID = this.calcID;
                this.cell = saveCell;
            }
            
            const saveIVC = this.ignoreValueChanged;
            this.ignoreValueChanged = true;
            const row = this.rowIndex(cell1);
            const col = this.colIndex(cell1);
            if (this.preserveFormula) {
                this.grid.setValueRowCol(formula.FormulaText, row, col);
            }
            this.ignoreValueChanged = saveIVC;
            this.grid = grd;
            
            if (this.processedCells.includes(cell1)) {
                return;
            } else {
                this.processedCells.push(cell1);
            }
            
            if (this.DependentFormulaCells[cell1]) {
                const ht = this.DependentFormulaCells[cell1];
                for (const c in ht) {
                    this.updateDependenciesAndCell(c);
                }
            }
        }
    }

    // Compute interior functions
    computeInteriorFunctions(formula) {
        try {
            if (!formula || formula.length === 0) {
                return formula;
            }
            this.computeFunctionLevel++;
            let q = this.findLastqNotInBrackets(formula);
            while (q > 0) {
                const last = formula.substring(q).indexOf(this.RIGHTBRACKET);
                if (last === -1) {
                    return this.FormulaErrorStrings[this.bad_formula];
                }
                let s = formula.substring(q, q + last + 1);
                s = this.computedValue(s);
                //
                // FIX : 문자열 따옴표 문제로 변수 처리 되는 현상 해결
                // this.markupResultToIncludeInFormula(s); 에서 s = this.markupResultToIncludeInFormula(s); 로 변경
                //
                s = this.markupResultToIncludeInFormula(s);
                formula = formula.substring(0, q) + s + formula.substring(q + last + 1);
                q = this.findLastqNotInBrackets(formula);
            }
        } catch (ex) {
            if (this.rethrowLibraryComputationExceptions && this.libraryComputationException) {
                throw this.libraryComputationException;
            }
            return ex.message;
        } finally {
            this.computeFunctionLevel--;
        }
        return formula;
    }

    // Markup result to include in formula
    markupResultToIncludeInFormula(s) {
        const d3 = parseFloat(s);
        if (s.length > 0 && s[0] === '-' && !isNaN(d3)) {
            return "nu" + s.substring(1);
        } else if (s.length > 0 && 
                  (s[0] === this.TIC[0] || s[0] === this.BMARKER || s[0] === '#')) {
            return s;
        } else if (s.startsWith(this.TRUEVALUESTR) || s.startsWith(this.FALSEVALUESTR)) {
            return s;
        } else {
            const d = parseFloat(s);
            if (!isNaN(d)) {
                s = s.toString();
                s = s.replace(new RegExp(CalcEngine.ParseArgumentSeparator, 'g'), String.fromCharCode(32));
                return 'n' + s;
            } else {
                if (!this.isRange(s)) {
                    return this.TIC + s + this.TIC;
                }
                return s;
            }
        }
    }

    // Get sheet ID
    getSheetID(grd) {
        const family = CalcEngine.getSheetFamilyItem(grd);
        if (family.SheetNameToParentObject) {
            const token = family.ParentObjectToToken[grd];
            const tokenStr = token.replace(/!/g, "");
            const d = parseFloat(tokenStr);
            if (!isNaN(d)) {
                return parseInt(d);
            }
        }
        return -1;
    }

    // Recalculate range
    recalculateRange(range, data) {
        this.inRecalculateRange = true;
        for (let row = range.top; row <= range.bottom; ++row) {
            for (let col = range.left; col <= range.right; ++col) {
                data.setValueRowCol(data.getValueRowCol(row, col), row, col);
            }
        }
        this.inRecalculateRange = false;
    }

    // Refresh range
    refreshRange(range) {
        for (let r = range.top; r <= range.bottom; r++) {
            for (let c = range.left; c <= range.right; c++) {
                const s = RangeInfo.getAlphaLabel(c) + r.toString();
                this.dependencyLevel = 0;
                this.refresh(s);
            }
        }
    }

    // Clear library computation exception
    clearLibraryComputationException() {
        this.libraryComputationException = null;
    }

    // Dispose
    dispose() {
        if (this.grid && this.grid.valueChanged) {
            this.grid.valueChanged = null;
        }
        if (this.libraryFunctions) {
            this.libraryFunctions = {};
        }
        this.libraryFunctions = null;
    }

    // Static methods
    static createSheetFamilyID() {
        if (CalcEngine._sheetFamilyID === Number.MAX_SAFE_INTEGER) {
            CalcEngine._sheetFamilyID = Number.MIN_SAFE_INTEGER;
        }
        return CalcEngine._sheetFamilyID++;
    }

    static getSheetFamilyItem(model) {
        if (CalcEngine._sheetFamilyID === 0) {
            if (!CalcEngine._defaultFamilyItem) {
                CalcEngine._defaultFamilyItem = new GridSheetFamilyItem();
            }
            return CalcEngine._defaultFamilyItem;
        }
        
        if (!CalcEngine._sheetFamiliesList) {
            CalcEngine._sheetFamiliesList = {};
        }
        
        const i = CalcEngine._modelToSheetID[model];
        if (!CalcEngine._sheetFamiliesList[i]) {
            CalcEngine._sheetFamiliesList[i] = new GridSheetFamilyItem();
        }
        return CalcEngine._sheetFamiliesList[i];
    }

    static resetSheetFamilyID() {
        CalcEngine._sheetFamilyID = 0;
        if (CalcEngine._modelToSheetID) {
            CalcEngine._modelToSheetID = {};
        }
        if (CalcEngine._sheetFamiliesList) {
            CalcEngine._sheetFamiliesList = {};
            CalcEngine.resetSheetIDs();
        }
    }

    static resetSheetIDs() {
        CalcEngine._tokenCount = 0;
    }

    static registerGridAsSheet(refName, model, sheetFamilyID) {
        if (CalcEngine._modelToSheetID) {
            model.wireParentObject();
            model.valueChanged = this.grid_ValueChanged.bind(this);
        }
        
        if (!CalcEngine._modelToSheetID) {
            CalcEngine._modelToSheetID = {};
        }
        
        if (!CalcEngine._modelToSheetID[model]) {
            CalcEngine._modelToSheetID[model] = sheetFamilyID;
        }
        
        const family = CalcEngine.getSheetFamilyItem(model);
        family.isSheeted = true;
        const refName1 = refName.toUpperCase();
        
        if (!family.SheetNameToParentObject) {
            family.SheetNameToParentObject = {};
        }
        if (!family.TokenToParentObject) {
            family.TokenToParentObject = {};
        }
        if (!family.SheetNameToToken) {
            family.SheetNameToToken = {};
        }
        if (!family.ParentObjectToToken) {
            family.ParentObjectToToken = {};
        }
        
        if (family.SheetNameToParentObject[refName1]) {
            const token = family.SheetNameToToken[refName1];
            family.TokenToParentObject[token] = model;
            family.ParentObjectToToken[model] = token;
        } else {
            const token = '!' + CalcEngine._tokenCount.toString() + '!';
            CalcEngine._tokenCount++;
            family.TokenToParentObject[token] = model;
            family.SheetNameToToken[refName1] = token;
            family.SheetNameToParentObject[refName1] = model;
            family.ParentObjectToToken[model] = token;
            this.sortedSheetNames = null;
        }
    }

    static unregisterGridAsSheet(refName, model) {
        const family = CalcEngine.getSheetFamilyItem(model);
        const refName1 = refName.toUpperCase();
        
        if (family.SheetNameToParentObject && family.SheetNameToParentObject[refName1]) {
            delete family.SheetNameToParentObject[refName1];
            const token = family.SheetNameToToken[refName1];
            delete family.SheetNameToToken[refName1];
            delete family.TokenToParentObject[token];
            delete family.ParentObjectToToken[model];
        }
    }
}

// Formula Info class
class FormulaInfo {
    constructor() {
        this.FormulaText = "";
        this.ParsedFormula = "";
        this.FormulaValue = "";
        this.calcID = 0;
    }
}

// Grid Sheet Family Item class
class GridSheetFamilyItem {
    constructor() {
        this.isSheeted = false;
        this.sheetFormulaInfoTable = null;
        this.sheetDependentCells = null;
        this.sheetDependentFormulaCells = null;
        this.SheetNameToParentObject = null;
        this.TokenToParentObject = null;
        this.SheetNameToToken = null;
        this.ParentObjectToToken = null;
    }
}

// Range Info class
class RangeInfo {
    constructor(top, left, bottom, right) {
        this.top = top;
        this.left = left;
        this.bottom = bottom;
        this.right = right;
    }

    static getAlphaLabel(col) {
        let s = "";
        while (col > 0) {
            const remainder = (col - 1) % 26;
            s = String.fromCharCode(65 + remainder) + s;
            col = Math.floor((col - 1) / 26);
        }
        return s;
    }
}

// Length Comparer class
class LenComparer {
    compare(x, y) {
        return y.toString().length - x.toString().length;
    }
}

// Export the CalcEngine
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CalcEngine, FormulaInfo, GridSheetFamilyItem, RangeInfo };
}
        