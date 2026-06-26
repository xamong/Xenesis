/**
 * XCON (XamongCode Object Notation) JavaScript Implementation
 * Port from C# to JavaScript with browser compatibility
 */
class XCON {
    constructor() {
        this.nameList = [];
        this.valueList = [];
        this.hashtable = new Map();
        this.name = 'XCON';
        this.tag = null;

        // 이벤트 리스너 관리
        this.eventListeners = new Map();

        // 이벤트 억제 시스템
        this.eventsSuppressed = false;        // 이벤트 억제 상태
        this.suppressedEvents = [];           // 억제된 이벤트들 저장
        this.batchUpdateInProgress = false;   // 배치 업데이트 진행 중
        this.rootBatchOperation = null;       // 최상위 배치 작업 참조

        // Undo/Redo 시스템
        this.historyEnabled = false;           // 히스토리 활성화 여부
        this.maxHistorySize = 50;            // 최대 히스토리 크기
        this.undoStack = [];                 // Undo 스택
        this.redoStack = [];                 // Redo 스택
        this.isUndoRedoInProgress = false;   // Undo/Redo 진행 중 플래그
    }

    // 이벤트 관리 메서드들
    addEventListener(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(listener);
        return this;
    }

    removeEventListener(eventType, listener) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
            if (listeners.length === 0) {
                this.eventListeners.delete(eventType);
            }
        }
        return this;
    }

    removeAllEventListeners(eventType) {
        if (eventType) {
            this.eventListeners.delete(eventType);
        } else {
            this.eventListeners.clear();
        }
        return this;
    }

    // 이벤트 발생 메서드
    _fireEvent(eventType, eventData) {
        //__temp_chain로 시작하는 키는 이벤트 발생하지 않음
        if (eventData && eventData.key && eventData.key.startsWith('__temp_chain')) {
            return;
        }

        // 이벤트가 억제된 경우 저장만 하고 실제 발생시키지 않음
        if (this.eventsSuppressed) {
            this.suppressedEvents.push({
                eventType: eventType,
                eventData: eventData,
                timestamp: Date.now()
            });
            return;
        }

        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            listeners.forEach(listener => {
                try {
                    if (typeof listener === 'function') {
                        listener(eventData);
                    }
                } catch (error) {
                    XCON.error(`XCON 이벤트 리스너 오류 (${eventType}):`, error);
                }
            });
        }
    }

    /**
     * 이벤트 억제 시작
     */
    _suppressEvents() {
        this.eventsSuppressed = true;
        this.suppressedEvents = [];
    }

    /**
     * 이벤트 억제 해제 및 최종 통합 이벤트 발생
     */
    _resumeEvents() {
        this.eventsSuppressed = false;

        if (this.suppressedEvents.length > 0) {
            // 억제된 이벤트들을 분석하여 최종 통합 이벤트 생성
            const finalEvent = this._createBatchEvent(this.suppressedEvents);

            // 최종 통합 이벤트 발생
            if (finalEvent) {
                this._fireEvent(finalEvent.eventType, finalEvent.eventData);
            }

            // 억제된 이벤트 목록 초기화
            this.suppressedEvents = [];
        }
    }

    /**
     * 억제된 이벤트들로부터 통합 이벤트 생성
     */
    _createBatchEvent(suppressedEvents) {
        if (suppressedEvents.length === 0) return null;

        // setAttributeWithPath 작업인지 확인
        const isPathUpdate = suppressedEvents.some(e =>
            e.eventData.type === 'add' || e.eventData.type === 'update'
        );

        if (isPathUpdate) {
            // 경로 기반 업데이트의 경우 'pathUpdate' 이벤트 생성
            const lastEvent = suppressedEvents[suppressedEvents.length - 1];

            return {
                eventType: 'pathUpdate',
                eventData: {
                    type: 'pathUpdate',
                    operations: suppressedEvents.map(e => ({
                        type: e.eventData.type,
                        key: e.eventData.key,
                        value: e.eventData.value,
                        oldValue: e.eventData.oldValue,
                        timestamp: e.timestamp
                    })),
                    finalState: {
                        key: lastEvent.eventData.key,
                        value: lastEvent.eventData.value,
                        xcon: this
                    },
                    operationCount: suppressedEvents.length,
                    startTime: suppressedEvents[0].timestamp,
                    endTime: lastEvent.timestamp,
                    xcon: this
                }
            };
        } else {
            // 일반 배치 업데이트
            const lastEvent = suppressedEvents[suppressedEvents.length - 1];

            return {
                eventType: 'batchUpdate',
                eventData: {
                    type: 'batchUpdate',
                    operations: suppressedEvents.map(e => ({
                        type: e.eventData.type,
                        key: e.eventData.key,
                        value: e.eventData.value,
                        oldValue: e.eventData.oldValue,
                        timestamp: e.timestamp
                    })),
                    finalState: {
                        key: lastEvent.eventData.key,
                        value: lastEvent.eventData.value,
                        xcon: this
                    },
                    operationCount: suppressedEvents.length,
                    startTime: suppressedEvents[0].timestamp,
                    endTime: lastEvent.timestamp,
                    xcon: this
                }
            };
        }
    }

    /**
     * 배치 업데이트 실행 (중첩 XCON에도 적용)
     */
    _executeBatchUpdate(operation) {
        // 최상위 배치 작업인지 확인
        const isRootOperation = !this.batchUpdateInProgress;

        if (isRootOperation) {
            this.batchUpdateInProgress = true;
            this.rootBatchOperation = operation;

            // 모든 중첩된 XCON 객체에도 이벤트 억제 적용
            this._suppressEventsRecursively();
        }

        try {
            // 실제 작업 실행
            const result = operation();

            // 최상위 작업이 완료되면 이벤트 복구
            if (isRootOperation) {
                this._resumeEventsRecursively();
                this.batchUpdateInProgress = false;
                this.rootBatchOperation = null;
            }

            return result;
        } catch (error) {
            // 오류 발생 시에도 이벤트 복구
            if (isRootOperation) {
                this._resumeEventsRecursively();
                this.batchUpdateInProgress = false;
                this.rootBatchOperation = null;
            }
            throw error;
        }
    }

    /**
     * 재귀적으로 모든 중첩 XCON 객체의 이벤트 억제
     */
    _suppressEventsRecursively() {
        this._suppressEvents();

        // 모든 값에서 XCON 객체를 찾아 이벤트 억제
        for (let i = 0; i < this.valueList.length; i++) {
            const value = this.valueList[i];
            if (XCON.isXCONObject(value)) {
                value._suppressEventsRecursively();
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (XCON.isXCONObject(item)) {
                        item._suppressEventsRecursively();
                    }
                });
            }
        }
    }

    /**
     * 재귀적으로 모든 중첩 XCON 객체의 이벤트 복구
     */
    _resumeEventsRecursively() {
        // 모든 값에서 XCON 객체를 찾아 이벤트 복구
        for (let i = 0; i < this.valueList.length; i++) {
            const value = this.valueList[i];
            if (XCON.isXCONObject(value)) {
                value._resumeEventsRecursively();
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (XCON.isXCONObject(item)) {
                        item._resumeEventsRecursively();
                    }
                });
            }
        }

        this._resumeEvents();
    }

    /**
     * 억제된 이벤트들을 발생시키지 않고 단순히 제거
     */
    _clearSuppressedEvents() {
        this.suppressedEvents = [];

        // 모든 중첩 XCON 객체의 억제된 이벤트도 제거
        for (let i = 0; i < this.valueList.length; i++) {
            const value = this.valueList[i];
            if (XCON.isXCONObject(value)) {
                value._clearSuppressedEvents();
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (XCON.isXCONObject(item)) {
                        item._clearSuppressedEvents();
                    }
                });
            }
        }
    }

    /**
     * 억제된 이벤트를 발생시키지 않고 이벤트 시스템만 복구
     */
    _resumeEventsRecursivelyWithoutFiring() {
        // 모든 값에서 XCON 객체를 찾아 이벤트 복구
        for (let i = 0; i < this.valueList.length; i++) {
            const value = this.valueList[i];
            if (XCON.isXCONObject(value)) {
                value._resumeEventsRecursivelyWithoutFiring();
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (XCON.isXCONObject(item)) {
                        item._resumeEventsRecursivelyWithoutFiring();
                    }
                });
            }
        }

        // 이벤트 억제만 해제하고 억제된 이벤트는 발생시키지 않음
        this.eventsSuppressed = false;
    }

    /**
     * 억제 상태를 무시하고 직접 이벤트 발생
     */
    _fireEventDirect(eventType, eventData) {
        //__temp_chain로 시작하는 키는 이벤트 발생하지 않음
        if (eventData && eventData.key && eventData.key.startsWith('__temp_chain')) {
            return;
        }
        
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            listeners.forEach(listener => {
                try {
                    if (typeof listener === 'function') {
                        listener(eventData);
                    }
                } catch (error) {
                    XCON.error(`XCON 이벤트 리스너 오류 (${eventType}):`, error);
                }
            });
        }
    }

    // Static configuration
    static TARGET = new Map([['', '']]);
    static USETARGET = true;
    static FORCE = true;
    static INDENT = '    ';
    static ALIST = 'xcon'; //♤♡◇♧
    static ENDALIST = 'xcon'; //♠♥◆♣
    static KTAG = 'n'; //♧
    static DTAG = 'x'; //♤
    static ATAG = 'c'; //♡
    static VTAG = 'o'; //◇
    static ENDKTAG = 'n'; //♣
    static ENDDTAG = 'x'; //♠
    static ENDATAG = 'c'; //♥
    static ENDVTAG = 'o'; //◆
    static TAGLESS = false;

    // Static methods for configuration
    static useTarget(useTarget) {
        XCON.USETARGET = useTarget;
    }

    static setTarget(target) {
        XCON.TARGET.clear();
        XCON.TARGET.set('', '');

        const targets = target.split('|');
        targets.forEach(t => {
            if (!XCON.TARGET.has(t)) {
                XCON.TARGET.set(t, t);
            }
        });
    }

    static setForce(force) {
        XCON.FORCE = force;
    }

    static getIndent() {
        return XCON.INDENT;
    }

    static setIndent(indent) {
        XCON.INDENT = indent;
    }

    static getAListType() {
        return XCON.ALIST;
    }

    static setAListType(alist, endAlist = 'xcon', tagless = false) {
        XCON.ALIST = alist;
        XCON.ENDALIST = endAlist;
        XCON.TAGLESS = tagless;
        if (alist === 'xcon') {
            XCON.KTAG = 'n';
            XCON.DTAG = 'x';
            XCON.ATAG = 'c';
            XCON.VTAG = 'o';
        } else if (alist === 'acon') {
            XCON.KTAG = 'k';
            XCON.DTAG = 'd';
            XCON.ATAG = 'a';
            XCON.VTAG = 'v';
        } else if (alist === 'alist' || alist === 'plist') {
            XCON.KTAG = 'key';
            XCON.DTAG = 'dict';
            XCON.ATAG = 'array';
            XCON.VTAG = 'string';
        } else {
            if (XCON.TAGLESS && XCON.ALIST.length === 4 && XCON.ALIST.length === XCON.ENDALIST.length && XCON.ALIST != XCON.ENDALIST) {
                XCON.KTAG = alist[3];
                XCON.DTAG = alist[0];
                XCON.ATAG = alist[1];
                XCON.VTAG = alist[2];
                XCON.ENDKTAG = endAlist[3];
                XCON.ENDDTAG = endAlist[0];
                XCON.ENDATAG = endAlist[1];
                XCON.ENDVTAG = endAlist[2];
            } else {
                if (alist.length === 4) {
                    XCON.KTAG = alist[3];
                    XCON.DTAG = alist[0];
                    XCON.ATAG = alist[1];
                    XCON.VTAG = alist[2];
                } else {
                    XCON.ALIST = 'xcon';
                    XCON.KTAG = 'n';
                    XCON.DTAG = 'x';
                    XCON.ATAG = 'c';
                    XCON.VTAG = 'o';
                }
            }
        }
    }

    // Properties
    get count() {
        return this.nameList.length;
    }

    get keys() {
        return [...this.nameList];
    }

    get values() {
        return [...this.valueList];
    }

    isXCON() {
        return this.name === 'XCON';
    }

    // Indexer methods
    get(key) {
        if (typeof key === 'number') {
            return this.valueList[key];
        }
        return this.hashtable.get(key);
    }

    set(key, value) {
        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        const oldValue = this.hashtable.get(key);
        const isUpdate = this.hashtable.has(key);

        if (isUpdate) {
            this.hashtable.set(key, value);
            const index = this.nameList.indexOf(key);
            if (index >= 0) {
                this.valueList[index] = value;
            } else {
                this.nameList.push(key);
                this.valueList.push(value);
            }
        } else {
            this.hashtable.set(key, value);
            this.nameList.push(key);
            this.valueList.push(value);
        }

        // 변경 이벤트 발생
        this._fireEvent('change', {
            type: isUpdate ? 'update' : 'add',
            key: key,
            value: value,
            oldValue: oldValue,
            xcon: this
        });

        return this; // 체이닝을 위해 this 반환
    }

    // Basic operations
    add(key, value) {
        if (this.hashtable.has(key)) {
            XCON.error(`XCON.add: ${key} already exists`);
            return this;
        }

        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        this.hashtable.set(key, value);
        this.nameList.push(key);
        this.valueList.push(value);

        // 추가 이벤트 발생
        this._fireEvent('add', {
            type: 'add',
            key: key,
            value: value,
            index: this.nameList.length - 1,
            xcon: this
        });

        return this; // 체이닝을 위해 this 반환 (인덱스 대신)
    }

    insert(index, key, value) {
        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        this.nameList.splice(index, 0, key);
        this.valueList.splice(index, 0, value);
        this.hashtable.set(key, value);

        // 추가 이벤트 발생
        this._fireEvent('insert', {
            type: 'insert',
            key: key,
            value: value,
            index: index,
            xcon: this
        });

        return index;
    }

    remove(key) {
        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        const oldValue = this.hashtable.get(key);
        this.hashtable.delete(key);
        const index = this.nameList.indexOf(key);
        if (index >= 0) {
            this.nameList.splice(index, 1);
            this.valueList.splice(index, 1);

            // 삭제 이벤트 발생
            this._fireEvent('remove', {
                type: 'remove',
                key: key,
                value: oldValue,
                index: index,
                xcon: this
            });
        }
    }

    removeAt(index) {
        if (index < 0 || index >= this.count) return;

        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        const key = this.nameList[index];
        const oldValue = this.valueList[index];
        this.nameList.splice(index, 1);
        this.valueList.splice(index, 1);
        this.hashtable.delete(key);

        // 삭제 이벤트 발생
        this._fireEvent('removeAt', {
            type: 'removeAt',
            key: key,
            value: oldValue,
            index: index,
            xcon: this
        });
    }

    clear() {
        // 히스토리 저장 (변경 전 상태)
        this._saveState();

        const oldData = {
            nameList: [...this.nameList],
            valueList: [...this.valueList],
            hashtable: new Map(this.hashtable)
        };

        this.hashtable.clear();
        this.nameList = [];
        this.valueList = [];

        // 전체 삭제 이벤트 발생
        this._fireEvent('clear', {
            type: 'clear',
            oldData: oldData,
            xcon: this
        });
    }

    contains(key) {
        return this.hashtable.has(key);
    }

    indexOf(key) {
        return this.nameList.indexOf(key);
    }

    getKey(index) {
        if (index < this.nameList.length) {
            return this.nameList[index];
        }
        return '';
    }

    getValue(index) {
        if (index < this.valueList.length) {
            return this.valueList[index];
        }
        return null;
    }

    getString(key) {
        if (this.contains(key)) {
            return String(this.get(key));
        }
        return '';
    }

    copy() {
        return XCON.fromJSON(this.toJSON());
    }

    // Clone method
    clone() {
        const clone = new XCON();
        clone.nameList = [...this.nameList];
        clone.valueList = [...this.valueList];
        clone.hashtable = new Map(this.hashtable);

        // 이벤트 리스너도 복사 (깊은 복사)
        for (const [eventType, listeners] of this.eventListeners) {
            clone.eventListeners.set(eventType, [...listeners]);
        }

        return clone;
    }

    /**
     * XCON 객체를 깊은 복사합니다 (중첩된 XCON 객체와 배열도 재귀적으로 복사)
     * @returns {XCON} 깊은 복사된 XCON 객체
     */
    deepClone() {
        const clone = new XCON();
        clone.name = this.name;
        clone.tag = this.tag;

        // 모든 키-값 쌍을 재귀적으로 복사
        for (let i = 0; i < this.nameList.length; i++) {
            const key = this.nameList[i];
            const value = this.valueList[i];

            if (XCON.isXCONObject(value)) {
                // 중첩된 XCON 객체는 재귀적으로 복사
                clone.add(key, value.deepClone());
            } else if (Array.isArray(value)) {
                // 배열은 각 요소를 재귀적으로 복사
                const clonedArray = value.map(item => {
                    if (XCON.isXCONObject(item)) {
                        return item.deepClone();
                    } else if (Array.isArray(item)) {
                        return item.map(subItem => 
                            XCON.isXCONObject(subItem) ? subItem.deepClone() : subItem
                        );
                    }
                    return item;
                });
                clone.add(key, clonedArray);
            } else {
                // 원시 타입은 그대로 복사
                clone.add(key, value);
            }
        }

        return clone;
    }

    // =============================================================================
    // Undo/Redo 시스템
    // =============================================================================

    /**
     * 현재 상태를 히스토리에 저장합니다
     * @private
     */
    _saveState() {
        if (!this.historyEnabled || this.isUndoRedoInProgress) {
            return;
        }

        try {
            // 현재 상태를 깊은 복사로 저장
            const state = this.deepClone();

            // Undo 스택에 추가
            this.undoStack.push(state);

            // 최대 크기 제한
            if (this.undoStack.length > this.maxHistorySize) {
                this.undoStack.shift(); // 가장 오래된 항목 제거
            }

            // 새로운 변경이 발생하면 Redo 스택 초기화
            this.redoStack = [];

            // 히스토리 변경 이벤트 발생
            this._fireEvent('historyChanged', {
                type: 'historyChanged',
                canUndo: this.undoStack.length > 0,
                canRedo: false,
                undoCount: this.undoStack.length,
                redoCount: 0,
                xcon: this
            });
        } catch (error) {
            XCON.error('XCON._saveState 오류:', error);
        }
    }

    /**
     * 저장된 상태를 복원합니다
     * @param {XCON} state - 복원할 상태
     * @private
     */
    _restoreState(state) {
        if (!state) return;

        // 이벤트 억제 시작
        this._suppressEvents();

        try {
            // 현재 상태를 완전히 교체
            this.nameList = [];
            this.valueList = [];
            this.hashtable.clear();

            // 복원할 상태의 모든 데이터 복사
            for (let i = 0; i < state.nameList.length; i++) {
                const key = state.nameList[i];
                const value = state.valueList[i];

                if (XCON.isXCONObject(value)) {
                    this.add(key, value.deepClone());
                } else if (Array.isArray(value)) {
                    const clonedArray = value.map(item => 
                        XCON.isXCONObject(item) ? item.deepClone() : item
                    );
                    this.add(key, clonedArray);
                } else {
                    this.add(key, value);
                }
            }

            // 복원 완료 이벤트 발생
            this._fireEventDirect('restore', {
                type: 'restore',
                xcon: this,
                timestamp: Date.now()
            });
        } catch (error) {
            XCON.error('XCON._restoreState 오류:', error);
        } finally {
            // 이벤트 억제 해제
            this._resumeEvents();
        }
    }

    /**
     * 이전 상태로 되돌립니다 (Undo)
     * @returns {boolean} Undo 성공 여부
     */
    undo() {
        if (!this.historyEnabled || this.undoStack.length === 0) {
            return false;
        }

        try {
            this.isUndoRedoInProgress = true;

            // 현재 상태를 Redo 스택에 저장
            const currentState = this.deepClone();
            this.redoStack.push(currentState);

            // Undo 스택에서 이전 상태 가져오기
            const previousState = this.undoStack.pop();

            // 상태 복원
            this._restoreState(previousState);

            // 히스토리 변경 이벤트 발생
            this._fireEventDirect('historyChanged', {
                type: 'historyChanged',
                action: 'undo',
                canUndo: this.undoStack.length > 0,
                canRedo: this.redoStack.length > 0,
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length,
                xcon: this
            });

            return true;
        } catch (error) {
            XCON.error('XCON.undo 오류:', error);
            return false;
        } finally {
            this.isUndoRedoInProgress = false;
        }
    }

    /**
     * 되돌린 작업을 다시 실행합니다 (Redo)
     * @returns {boolean} Redo 성공 여부
     */
    redo() {
        if (!this.historyEnabled || this.redoStack.length === 0) {
            return false;
        }

        try {
            this.isUndoRedoInProgress = true;

            // 현재 상태를 Undo 스택에 저장
            const currentState = this.deepClone();
            this.undoStack.push(currentState);

            // Redo 스택에서 다음 상태 가져오기
            const nextState = this.redoStack.pop();

            // 상태 복원
            this._restoreState(nextState);

            // 히스토리 변경 이벤트 발생
            this._fireEventDirect('historyChanged', {
                type: 'historyChanged',
                action: 'redo',
                canUndo: this.undoStack.length > 0,
                canRedo: this.redoStack.length > 0,
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length,
                xcon: this
            });

            return true;
        } catch (error) {
            XCON.error('XCON.redo 오류:', error);
            return false;
        } finally {
            this.isUndoRedoInProgress = false;
        }
    }

    /**
     * Undo 가능 여부를 반환합니다
     * @returns {boolean} Undo 가능 여부
     */
    get canUndo() {
        return this.historyEnabled && this.undoStack.length > 0;
    }

    /**
     * Redo 가능 여부를 반환합니다
     * @returns {boolean} Redo 가능 여부
     */
    get canRedo() {
        return this.historyEnabled && this.redoStack.length > 0;
    }

    /**
     * 히스토리를 모두 초기화합니다
     */
    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];

        // 히스토리 초기화 이벤트 발생
        this._fireEventDirect('historyChanged', {
            type: 'historyChanged',
            action: 'clear',
            canUndo: false,
            canRedo: false,
            undoCount: 0,
            redoCount: 0,
            xcon: this
        });
    }

    /**
     * 히스토리 활성화/비활성화를 설정합니다
     * @param {boolean} enabled - 활성화 여부
     */
    setHistoryEnabled(enabled) {
        this.historyEnabled = enabled;
        if (!enabled) {
            this.clearHistory();
        }
    }

    /**
     * 최대 히스토리 크기를 설정합니다
     * @param {number} size - 최대 히스토리 크기
     */
    setMaxHistorySize(size) {
        if (typeof size === 'number' && size > 0) {
            this.maxHistorySize = size;

            // 현재 스택 크기가 최대 크기를 초과하면 오래된 항목 제거
            while (this.undoStack.length > this.maxHistorySize) {
                this.undoStack.shift();
            }
            while (this.redoStack.length > this.maxHistorySize) {
                this.redoStack.shift();
            }
        }
    }

    /**
     * XCON 객체를 반복 가능하게 만드는 Iterator를 구현합니다.
     * for...of 루프, 구조분해 할당, 스프레드 연산자 등에서 사용할 수 있습니다.
     * 각 반복에서 {key, value} 형태의 객체를 반환합니다.
     * 
     * @generator
     * @yields {{key: string, value: any}} 키-값 쌍 객체
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("name", "홍길동");
     * xcon.add("age", 25);
     * xcon.add("city", "서울");
     * 
     * // for...of 루프로 순회
     * for (const {key, value} of xcon) {
     *     console.log(`${key}: ${value}`);
     * }
     * // 출력: name: 홍길동, age: 25, city: 서울
     * 
     * // 구조분해 할당으로 배열 변환
     * const entries = [...xcon];
     * console.log(entries);
     * // [{key: "name", value: "홍길동"}, {key: "age", value: 25}, {key: "city", value: "서울"}]
     * 
     * // Array.from()으로 배열 변환
     * const array = Array.from(xcon);
     * console.log(array); // 위와 동일한 결과
     * 
     * // 키만 추출
     * const keys = [...xcon].map(({key}) => key);
     * console.log(keys); // ["name", "age", "city"]
     * 
     * // 값만 추출
     * const values = [...xcon].map(({value}) => value);
     * console.log(values); // ["홍길동", 25, "서울"]
     * 
     * // 조건부 순회
     * for (const {key, value} of xcon) {
     *     if (typeof value === 'number') {
     *         console.log(`숫자 속성: ${key} = ${value}`);
     *     }
     * }
     * 
     * // Map 객체로 변환
     * const map = new Map(xcon.map(({key, value}) => [key, value]));
     * 
     * // Set으로 키 수집
     * const keySet = new Set([...xcon].map(({key}) => key));
     */
    *[Symbol.iterator]() {
        for (let i = 0; i < this.nameList.length; i++) {
            yield {
                key: this.nameList[i],
                value: this.valueList[i]
            };
        }
    }

    /**
     * XCON의 각 키-값 쌍에 대해 제공된 함수를 한 번씩 실행합니다.
     * JavaScript Array.forEach()와 유사하지만 키-값 쌍을 다룹니다.
     * 
     * @param {Function} callback - 각 요소에 대해 실행할 함수
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("name", "홍길동");
     * xcon.add("age", 25);
     * xcon.add("city", "서울");
     * 
     * // 모든 키-값 쌍 출력
     * xcon.forEach((key, value) => {
     *     console.log(`${key}: ${value}`);
     * });
     * // 출력: name: 홍길동, age: 25, city: 서울
     * 
     * // 조건부 처리
     * xcon.forEach((key, value) => {
     *     if (typeof value === 'number') {
     *         console.log(`숫자 속성 ${key}: ${value}`);
     *     }
     * });
     */
    forEach(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        for (let i = 0; i < this.nameList.length; i++) {
            callback(this.nameList[i], this.valueList[i]);
        }
    }

    /**
     * XCON의 각 키-값 쌍에 대해 콜백 함수를 호출하고, 그 결과로 새로운 배열을 생성합니다.
     * JavaScript Array.map()과 유사하지만 키-값 쌍을 처리합니다.
     * 
     * @param {Function} callback - 새로운 배열 요소를 생성하는 함수
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     * @returns {Array} 콜백 함수의 결과로 구성된 새 배열
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("apple", 1000);
     * xcon.add("banana", 500);
     * xcon.add("orange", 800);
     * 
     * // 가격 정보를 문자열로 변환
     * const priceStrings = xcon.map((key, value) => `${key}: ${value}원`);
     * console.log(priceStrings);
     * // ["apple: 1000원", "banana: 500원", "orange: 800원"]
     * 
     * // 객체 배열로 변환
     * const products = xcon.map((key, value) => ({
     *     name: key,
     *     price: value,
     *     discounted: value * 0.9
     * }));
     * 
     * // 값만 추출
     * const prices = xcon.map((key, value) => value);
     * console.log(prices); // [1000, 500, 800]
     */
    map(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        const result = [];
        for (let i = 0; i < this.nameList.length; i++) {
            result.push(callback(this.nameList[i], this.valueList[i]));
        }
        return result;
    }

    /**
     * 제공된 테스트 함수를 통과하는 모든 키-값 쌍으로 새로운 배열을 생성합니다.
     * JavaScript Array.filter()와 유사하지만 키-값 쌍을 처리하며, 결과는 {key, value} 객체 배열입니다.
     * 
     * @param {Function} callback - 각 요소를 테스트하는 함수 (true를 반환하면 유지, false면 제외)
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     *   - index: 현재 처리 중인 요소의 인덱스
     *   - xcon: filter를 호출한 XCON 객체
     * @returns {Array<{key: string, value: any}>} 테스트를 통과한 요소들의 객체 배열
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("apple", 1000);
     * xcon.add("banana", 500);
     * xcon.add("orange", 800);
     * xcon.add("grape", 1200);
     * 
     * // 가격이 800원 이상인 상품만 필터링
     * const expensiveItems = xcon.filter((key, value) => value >= 800);
     * console.log(expensiveItems);
     * // [{key: "apple", value: 1000}, {key: "orange", value: 800}, {key: "grape", value: 1200}]
     * 
     * // 특정 키 패턴으로 필터링
     * const aItems = xcon.filter((key, value) => key.startsWith('a'));
     * console.log(aItems);
     * // [{key: "apple", value: 1000}]
     * 
     * // 인덱스를 활용한 필터링 (짝수 인덱스만)
     * const evenIndexItems = xcon.filter((key, value, index) => index % 2 === 0);
     * 
     * // 복합 조건 필터링
     * const premiumFruits = xcon.filter((key, value) => {
     *     return value > 900 && key.length > 4;
     * });
     */
    filter(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        const result = [];
        for (let i = 0; i < this.nameList.length; i++) {
            if (callback(this.nameList[i], this.valueList[i], i, this)) {
                result.push({
                    key: this.nameList[i],
                    value: this.valueList[i]
                });
            }
        }
        return result;
    }

    /**
     * XCON의 각 키-값 쌍에 대해 리듀서 함수를 실행하여 하나의 결과값을 반환합니다.
     * JavaScript Array.reduce()와 유사하지만 키-값 쌍을 처리합니다.
     * 
     * @param {Function} callback - 각 요소에 대해 실행할 리듀서 함수
     *   - accumulator: 누적값 (이전 콜백 호출의 반환값 또는 initialValue)
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     * @param {*} initialValue - 첫 번째 콜백 호출에서 사용할 초기값
     * @returns {*} 리듀서 함수의 최종 결과값
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("apple", 1000);
     * xcon.add("banana", 500);
     * xcon.add("orange", 800);
     * 
     * // 모든 가격의 합계 계산
     * const totalPrice = xcon.reduce((sum, key, value) => {
     *     return typeof value === 'number' ? sum + value : sum;
     * }, 0);
     * console.log(totalPrice); // 2300
     * 
     * // 가장 비싼 상품 찾기
     * const mostExpensive = xcon.reduce((max, key, value) => {
     *     return value > max.price ? {name: key, price: value} : max;
     * }, {name: '', price: 0});
     * console.log(mostExpensive); // {name: "apple", price: 1000}
     * 
     * // 객체로 변환 (키-값 쌍을 일반 객체로)
     * const obj = xcon.reduce((result, key, value) => {
     *     result[key] = value;
     *     return result;
     * }, {});
     * 
     * // 문자열 연결
     * const description = xcon.reduce((text, key, value) => {
     *     return text + `${key}(${value}원) `;
     * }, '상품목록: ');
     * console.log(description); // "상품목록: apple(1000원) banana(500원) orange(800원) "
     */
    reduce(callback, initialValue) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        let accumulator = initialValue;
        for (let i = 0; i < this.nameList.length; i++) {
            accumulator = callback(accumulator, this.nameList[i], this.valueList[i]);
        }
        return accumulator;
    }

    /**
     * XCON의 키-값 쌍 중 적어도 하나가 제공된 테스트 함수를 통과하는지 확인합니다.
     * JavaScript Array.some()과 유사하지만 키-값 쌍을 처리합니다.
     * 
     * @param {Function} callback - 각 요소를 테스트하는 함수
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     * @returns {boolean} 하나라도 테스트를 통과하면 true, 모두 실패하면 false
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("apple", 1000);
     * xcon.add("banana", 500);
     * xcon.add("orange", 800);
     * 
     * // 1000원 이상인 상품이 있는지 확인
     * const hasExpensiveItem = xcon.some((key, value) => value >= 1000);
     * console.log(hasExpensiveItem); // true
     * 
     * // 특정 키가 존재하는지 확인
     * const hasBanana = xcon.some((key, value) => key === 'banana');
     * console.log(hasBanana); // true
     * 
     * // 문자열 값이 있는지 확인
     * const hasStringValue = xcon.some((key, value) => typeof value === 'string');
     * console.log(hasStringValue); // false (모든 값이 숫자)
     * 
     * // 키 이름 패턴 확인
     * const hasLongName = xcon.some((key, value) => key.length > 5);
     * console.log(hasLongName); // true ('banana', 'orange'가 5글자 초과)
     * 
     * // 빈 XCON에서는 항상 false
     * const emptyXcon = new XCON();
     * console.log(emptyXcon.some(() => true)); // false
     */
    some(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        for (let i = 0; i < this.nameList.length; i++) {
            if (callback(this.nameList[i], this.valueList[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * XCON의 모든 키-값 쌍이 제공된 테스트 함수를 통과하는지 확인합니다.
     * JavaScript Array.every()와 유사하지만 키-값 쌍을 처리합니다.
     * 
     * @param {Function} callback - 각 요소를 테스트하는 함수
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     * @returns {boolean} 모든 요소가 테스트를 통과하면 true, 하나라도 실패하면 false
     * @throws {TypeError} callback이 함수가 아닌 경우
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("apple", 1000);
     * xcon.add("banana", 500);
     * xcon.add("orange", 800);
     * 
     * // 모든 상품이 100원 이상인지 확인
     * const allExpensive = xcon.every((key, value) => value >= 100);
     * console.log(allExpensive); // true
     * 
     * // 모든 상품이 1000원 이상인지 확인
     * const allPremium = xcon.every((key, value) => value >= 1000);
     * console.log(allPremium); // false
     * 
     * // 모든 키가 문자열인지 확인
     * const allStringKeys = xcon.every((key, value) => typeof key === 'string');
     * console.log(allStringKeys); // true
     * 
     * // 모든 값이 숫자인지 확인
     * const allNumberValues = xcon.every((key, value) => typeof value === 'number');
     * console.log(allNumberValues); // true
     * 
     * // 모든 키가 5글자 이하인지 확인
     * const allShortNames = xcon.every((key, value) => key.length <= 5);
     * console.log(allShortNames); // false ('banana', 'orange'가 5글자 초과)
     * 
     * // 빈 XCON에서는 항상 true (공허한 참)
     * const emptyXcon = new XCON();
     * console.log(emptyXcon.every(() => false)); // true
     */
    every(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        for (let i = 0; i < this.nameList.length; i++) {
            if (!callback(this.nameList[i], this.valueList[i])) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 재귀적으로 모든 항목을 탐색하여 callback을 실행하는 일반화된 함수
     * 
     * @param {Function} callback - 각 항목에 대해 실행할 콜백 함수
     *   콜백 함수 시그니처: (key, value, xconObj) => void
     *   - key: 현재 처리 중인 키
     *   - value: 현재 처리 중인 값
     *   - xconObj: 현재 XCON 객체 (this)
     * @param {Object} options - 옵션 객체
     *   - includeSelf: boolean - 현재 XCON 객체 자체도 callback에 포함할지 여부 (기본값: true)
     *   - maxDepth: number - 최대 탐색 깊이 (기본값: Infinity, 무제한)
     * 
     * @description
     * XCON 객체의 모든 키-값 쌍을 재귀적으로 탐색하며, 중첩된 XCON 객체와 배열 내의 XCON 객체도 포함합니다.
     * 
     * @example
     * const xcon = new XCON();
     * xcon.add("user", new XCON());
     * xcon.get("user").add("name", "홍길동");
     * xcon.get("user").add("profile", new XCON());
     * xcon.get("user").get("profile").add("age", 25);
     * 
     * // 모든 항목 탐색
     * xcon.traverseRecursively((key, value, obj) => {
     *     console.log(`키: ${key}, 값: ${value}`);
     * });
     * 
     * // 특정 깊이까지만 탐색
     * xcon.traverseRecursively((key, value) => {
     *     console.log(`키: ${key}`);
     * }, { maxDepth: 2 });
     * 
     * // 자기 자신 제외하고 탐색
     * xcon.traverseRecursively((key, value) => {
     *     console.log(`키: ${key}`);
     * }, { includeSelf: false });
     */
    traverseRecursively(callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new TypeError('callback must be a function');
        }
        
        const {
            includeSelf = true,
            maxDepth = Infinity
        } = options;
        
        const traverse = (xconObj, currentDepth = 0) => {
            if (!xconObj || !XCON.isXCONObject(xconObj)) {
                return;
            }
            
            if (currentDepth > maxDepth) {
                return;
            }
            
            // 현재 XCON 객체의 모든 항목 탐색
            for (let i = 0; i < xconObj.nameList.length; i++) {
                const key = xconObj.nameList[i];
                const value = xconObj.valueList[i];
                
                // 자기 자신 포함 옵션이 true이거나 깊이가 0보다 크면 callback 실행
                if (includeSelf || currentDepth > 0) {
                    callback(key, value, xconObj);
                }
                
                // 값이 XCON 객체인 경우 재귀 호출
                if (XCON.isXCONObject(value)) {
                    traverse(value, currentDepth + 1);
                } 
                // 값이 배열인 경우 배열 내의 XCON 객체도 재귀 호출
                else if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (XCON.isXCONObject(item)) {
                            traverse(item, currentDepth + 1);
                        }
                    });
                }
            }
        };
        
        traverse(this, 0);
    }
    
    // Path-based operations
    static getAllPaths(alist, prefix = '') {
        const paths = [];
        if (alist) {
            XCON.collectAllPaths(alist, prefix, paths);
        }
        return paths;
    }

    static collectAllPaths(obj, currentPath, paths) {
        if (!obj || !paths) return;

        if (currentPath.split('.').length > 20) return;

        if (XCON.isXCONObject(obj)) {
            for (let i = 0; i < obj.count; i++) {
                const key = obj.getKey(i);
                if (!key) continue;

                const fullPath = currentPath ? `${currentPath}.${key}` : key;
                paths.push(fullPath);

                const value = obj.getValue(i);
                if (XCON.isXCONObject(value) || Array.isArray(value)) {
                    XCON.collectAllPaths(value, fullPath, paths);
                }
            }
        } else if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const indexPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
                paths.push(indexPath);

                const element = obj[i];
                if (XCON.isXCONObject(element) || Array.isArray(element)) {
                    XCON.collectAllPaths(element, indexPath, paths);
                }
            }
        }
    }

    static getAttributeWithPath(alist, path) {
        if (!path) return null;

        let obj = null;

        try {
            let segments = null;

            if (path.includes('._items(')) {
                segments = path.substring(0, path.indexOf('._items(')).split('.');
                obj = XCON.populateAttribute(alist, segments, 0);

                if (Array.isArray(obj)) {
                    const iof = path.indexOf('._items(');
                    const s1 = path.substring(0, iof);

                    segments = s1.split('.');
                    obj = XCON.populateAttribute(alist, segments, 0);

                    if (Array.isArray(obj)) {
                        const array = obj;
                        segments = path.substring(iof + 1).split('.');

                        const inx = segments[0].substring('_items('.length, segments[0].length - 1);
                        const s2 = path.substring(iof + '._items('.length + inx.length + 2);

                        const index = parseInt(inx);
                        if (isNaN(index)) {
                            XCON.log('INX>', inx);
                            return null;
                        }

                        obj = array[index];
                        if (XCON.isXCONObject(obj)) {
                            const newPath = s2;
                            obj = XCON.getAttributeWithPath(obj, newPath);
                        }
                    }
                }
            } else if (path.includes('._add(')) {
                segments = path.substring(0, path.indexOf('._add(')).split('.');
                obj = XCON.populateAttribute(alist, segments, 0);

                const args = path.substring(path.indexOf('_add(') + '_add('.length, path.length - 1);
                obj = (parseFloat(obj) + parseFloat(args)).toString();
            } else if (path.includes('._strlen(')) {
                segments = path.substring(0, path.indexOf('._strlen(')).split('.');
                obj = XCON.populateAttribute(alist, segments, 0);

                obj = String(obj).length;
            } else if (path.includes('._substr(')) {
                segments = path.substring(0, path.indexOf('._substr(')).split('.');
                obj = XCON.populateAttribute(alist, segments, 0);

                const args = path.substring(path.indexOf('_substr(') + '_substr('.length, path.length - 1);
                const argArray = args.split(',');

                obj = String(obj).substring(parseInt(argArray[0].trim()), parseInt(argArray[0].trim()) + parseInt(argArray[1].trim()));
            } else {
                segments = path.split('.');
                obj = XCON.populateAttribute(alist, segments, 0);
            }
        } catch (ex) {
            XCON.error(ex.toString());
            obj = ex.message;
        }

        return obj;
    }

    static populateAttribute(alist, segments, i) {
        if (i === segments.length) return alist;

        const key = segments[i];
        const obj = alist.get(key);

        if (XCON.isXCONObject(obj)) {
            return XCON.populateAttribute(obj, segments, i + 1);
        } else if (Array.isArray(obj)) {
            return obj;
        } else {
            return obj;
        }
    }

    static setAttributeWithPath(alist, path, value) {
        if (!path) return;

        XCON.logon('setAttributeWithPath', alist, path, value);

        // 히스토리 저장 (변경 전 상태)
        if (alist && typeof alist._saveState === 'function') {
            alist._saveState();
        }

        // 이벤트 리스너가 있는지 확인
        const hasListeners = alist.eventListeners && alist.eventListeners.size > 0;

        // 이전 값 저장 (이벤트 리스너가 있을 때만)
        let oldValue = null;
        if (hasListeners) {
            try {
                oldValue = XCON.getAttributeWithPath(alist, path);
            } catch (e) {
                // 경로가 존재하지 않으면 null로 유지
                oldValue = null;
            }
        }

        // 모든 내부 이벤트 억제
        alist._suppressEventsRecursively();

        try {
            // 실제 데이터 업데이트 수행
            const segments = path.split('.');
            XCON.assignAttribute(alist, segments, 0, value);

            // 이벤트 복구 (하지만 억제된 이벤트들은 발생시키지 않음)
            alist._clearSuppressedEvents();
            alist._resumeEventsRecursivelyWithoutFiring();

            // setAttributeWithPath 전용 이벤트 발생 (이벤트 리스너가 있을 때만)
            if (hasListeners) {
                const eventData = {
                    type: 'pathUpdate',
                    path: path,
                    key: segments[segments.length - 1], // 최종 키
                    value: value,
                    oldValue: oldValue,
                    fullPath: path,
                    segments: segments,
                    xcon: alist,
                    timestamp: Date.now()
                };

                // 직접 이벤트 발생 (억제 상태 무시)
                alist._fireEventDirect('pathUpdate', eventData);

                // 기존 change 이벤트도 발생 (호환성 유지)
                const changeEventData = {
                    type: oldValue === null ? 'add' : 'update',
                    key: segments[segments.length - 1],
                    value: value,
                    oldValue: oldValue,
                    path: path,
                    xcon: alist,
                    timestamp: Date.now()
                };

                alist._fireEventDirect('change', changeEventData);
            }

            return {
                path: path,
                value: value,
                oldValue: oldValue,
                segments: segments
            };

        } catch (error) {
            // 오류 발생 시에도 이벤트 시스템 복구
            alist._clearSuppressedEvents();
            alist._resumeEventsRecursivelyWithoutFiring();
            throw error;
        }
    }

    static assignAttribute(alist, segments, i, value) {
        // 안전성 검사 추가
        if (!segments || !Array.isArray(segments) || segments.length === 0) {
            XCON.warn('assignAttribute: segments가 유효하지 않음', segments);
            return;
        }
        
        if (i < 0 || i >= segments.length) {
            XCON.warn('assignAttribute: 인덱스가 범위를 벗어남', { i, length: segments.length });
            return;
        }

        if (i === segments.length - 1) {
            alist.set(segments[i], value);
        } else {
            const key = segments[i];

            if (!alist.contains(key)) {
                // 다음 세그먼트 존재 여부 확인
                if (i + 1 < segments.length && segments[i + 1] && segments[i + 1].startsWith('_items(')) {
                    alist.add(key, []);
                } else {
                    const newXCON = new XCON();

                    // 부모 XCON이 이벤트 억제 상태라면 새로 생성된 XCON도 동일하게 설정
                    if (alist.eventsSuppressed) {
                        newXCON._suppressEvents();
                    }

                    alist.add(key, newXCON);
                }
            }

            const obj = alist.get(key);
            if (XCON.isXCONObject(obj)) {
                XCON.assignAttribute(obj, segments, i + 1, value);
            } else if (Array.isArray(obj)) {
                XCON.log('AssignAttributeList >', segments[i], ':', segments[i + 1], ':', value);

                // 다음 세그먼트 존재 여부 확인
                if (i + 1 < segments.length && segments[i + 1] && segments[i + 1].startsWith('_items(')) {
                    const inx = segments[i + 1].substring('_items('.length, segments[i + 1].length - 1);
                    const index = parseInt(inx);

                    if (obj.length <= index) {
                        const newXCON = new XCON();

                        // 부모 XCON이 이벤트 억제 상태라면 새로 생성된 XCON도 동일하게 설정
                        if (alist.eventsSuppressed) {
                            newXCON._suppressEvents();
                        }

                        obj.push(newXCON);
                    }

                    XCON.assignAttribute(obj[index], segments, i + 2, value);
                }
            } else {
                XCON.log('AssignAttributeList >', key, ':', obj, ':', typeof obj);
            }
        }
    }

    // XML parsing (simplified)
    static fromXml(xmlString) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');

            XCON.setAListType(doc.documentElement.tagName);

            const rootElement = doc.documentElement.children[0];
            if (rootElement && rootElement.tagName === XCON.DTAG) {
                const alist = new XCON();
                XCON.parseDict(alist, rootElement);
                return alist;
            }
        } catch (ex) {
            XCON.error(`XCON.fromXml: XML parsing error:`, ex);
        }
        return null;
    }

    static parseDict(alist, dict) {
        const children = Array.from(dict.children);

        for (let i = 0; i < children.length; i++) {
            const kNode = children[i];
            if (kNode.tagName === XCON.KTAG) {
                let key = kNode.textContent;

                if (kNode.attributes.length > 0) {
                    const targetAttr = kNode.getAttribute('target');
                    if (XCON.USETARGET) {
                        if (!XCON.TARGET.has(targetAttr)) continue;
                    } else {
                        key = key + '[!' + targetAttr + '!]';
                    }
                } else {
                    if (alist.contains(key)) continue;
                }

                let vNode = null;
                do {
                    vNode = children[++i];
                } while (vNode && vNode.nodeType !== 1);

                if (vNode) {
                    if (vNode.tagName === XCON.VTAG) {
                        alist.set(key, vNode.textContent);
                    } else if (vNode.tagName === 'int' || vNode.tagName === 'integer') {
                        alist.set(key, parseInt(vNode.textContent));
                    } else if (vNode.tagName === 'double' || vNode.tagName === 'real') {
                        alist.set(key, parseFloat(vNode.textContent));
                    } else if (vNode.tagName === 'bool' || vNode.tagName === 'boolean') {
                        alist.set(key, vNode.textContent.toLowerCase() === 'true');
                    } else if (vNode.tagName === 'datetime') {
                        alist.set(key, new Date(vNode.textContent));
                    } else if (vNode.tagName === XCON.ATAG) {
                        const array = [];
                        XCON.parseArray(array, vNode);
                        alist.set(key, array);
                    } else if (vNode.tagName === XCON.DTAG) {
                        const attriList = new XCON();
                        XCON.parseDict(attriList, vNode);
                        alist.set(key, attriList);
                    } else {
                        alist.set(key, vNode.textContent);
                    }
                }
            }
        }
    }

    static parseArray(alist, array) {
        Array.from(array.children).forEach(aNode => {
            if (aNode.tagName === XCON.VTAG) {
                alist.push(aNode.textContent);
            } else if (aNode.tagName === 'int' || aNode.tagName === 'integer') {
                alist.push(parseInt(aNode.textContent));
            } else if (aNode.tagName === 'double' || aNode.tagName === 'real') {
                alist.push(parseFloat(aNode.textContent));
            } else if (aNode.tagName === 'bool' || aNode.tagName === 'boolean') {
                alist.push(aNode.textContent.toLowerCase() === 'true');
            } else if (aNode.tagName === 'datetime') {
                alist.push(new Date(aNode.textContent));
            } else if (aNode.tagName === XCON.ATAG) {
                const array = [];
                XCON.parseArray(array, aNode);
                alist.push(array);
            } else if (aNode.tagName === XCON.DTAG) {
                const attriList = new XCON();
                XCON.parseDict(attriList, aNode);
                alist.push(attriList);
            } else {
                alist.push(aNode.textContent);
            }
        });
    }

    // JSON support
    static fromJSON(json) {
        if (json === null || json === undefined) {
            return null;
        }

        try {
            let jsonObj = null;
            if (typeof json === 'string') {
                jsonObj = JSON.parse(json);
            } else {
                jsonObj = json;
            }
            return XCON.fromJSONObject(jsonObj);
        } catch (ex) {
            throw new Error(`JSON parsing error: ${ex.message}`);
        }
    }

    static fromJSONObject(jsonObj) {
        if (jsonObj === null || jsonObj === undefined) {
            return null;
        }

        if (typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
            const xcon = new XCON();
            for (const [key, value] of Object.entries(jsonObj)) {
                xcon.set(key, XCON.fromJSONObject(value));
            }
            return xcon;
        } else if (Array.isArray(jsonObj)) {
            return jsonObj.map(item => XCON.fromJSONObject(item));
        } else {
            return jsonObj;
        }
    }

    // Serialization
    static serialize(dict, comment = true) {
        let alistformat;
        if (XCON.TAGLESS) {
            alistformat = `<${XCON.ALIST}>
${XCON.INDENT}<${XCON.DTAG}>
{0}${XCON.INDENT}</${XCON.DTAG}>
</${XCON.ALIST}>`;
        } else {
            if (comment) {
                alistformat = `<?xml version="1.0" encoding="utf-8"?>
<!--
***************************************************************************************************
* Author        : ${typeof navigator !== 'undefined' ? navigator.userAgent : 'JavaScript'}
* Creation Date : ${new Date().toISOString()}
* Path or Type  : XCON(XamongCode Object Notation)
* Description   : Generated by Xamong Platform XCON
***************************************************************************************************
-->
<${XCON.ALIST}>
${XCON.INDENT}<${XCON.DTAG}>
{0}${XCON.INDENT}</${XCON.DTAG}>
</${XCON.ALIST}>`;
            } else {
                alistformat = `<?xml version="1.0" encoding="utf-8"?>
<${XCON.ALIST}>
${XCON.INDENT}<${XCON.DTAG}>
{0}${XCON.INDENT}</${XCON.DTAG}>
</${XCON.ALIST}>`;
            }
       }

        const xml = alistformat.replace('{0}', XCON.dictToXmlString(dict, XCON.INDENT + XCON.INDENT));

        if (XCON.TAGLESS) {
            return xml
                .replaceAll(`<${XCON.ALIST}>`, XCON.ALIST)
                .replaceAll(`</${XCON.ALIST}>`, XCON.ENDALIST)
                .replaceAll(`<${XCON.KTAG}>`, XCON.KTAG)
                .replaceAll(`</${XCON.KTAG}>`, XCON.ENDKTAG)
                .replaceAll(`<${XCON.DTAG}>`, XCON.DTAG)
                .replaceAll(`</${XCON.DTAG}>`, XCON.ENDDTAG)
                .replaceAll(`<${XCON.ATAG}>`, XCON.ATAG)
                .replaceAll(`</${XCON.ATAG}>`, XCON.ENDATAG)
                .replaceAll(`<${XCON.VTAG}>`, XCON.VTAG)
                .replaceAll(`</${XCON.VTAG}>`, XCON.ENDVTAG);
        }

        return xml;
    }

    static dictToXmlString(dict, indent) {
        let result = '';

        for (const { key, value } of dict) {
            let actualKey = key;
            let target = '';

            if (key.includes('[!') && key.includes('!]')) {
                target = key.substring(key.indexOf('[!') + 2);
                target = target.substring(0, target.indexOf('!]'));
                actualKey = key.substring(0, key.indexOf('[!'));
            }

            if (XCON.isXCONObject(value)) {
                if (target) {
                    result += `${indent}<${XCON.KTAG} target='${target}'>${actualKey}</${XCON.KTAG}>\n`;
                } else {
                    result += `${indent}<${XCON.KTAG}>${actualKey}</${XCON.KTAG}>\n`;
                }
                result += `${indent}<${XCON.DTAG}>\n`;
                result += XCON.dictToXmlString(value, indent + XCON.INDENT);
                result += `${indent}</${XCON.DTAG}>\n`;
            } else if (Array.isArray(value)) {
                if (target) {
                    result += `${indent}<${XCON.KTAG} target='${target}'>${actualKey}</${XCON.KTAG}>\n`;
                } else {
                    result += `${indent}<${XCON.KTAG}>${actualKey}</${XCON.KTAG}>\n`;
                }
                result += `${indent}<${XCON.ATAG}>\n`;
                result += XCON.arrayToXmlString(value, indent + XCON.INDENT);
                result += `${indent}</${XCON.ATAG}>\n`;
            } else {
                if (target) {
                    result += `${indent}<${XCON.KTAG} target='${target}'>${actualKey}</${XCON.KTAG}>`;
                } else {
                    result += `${indent}<${XCON.KTAG}>${actualKey}</${XCON.KTAG}>`;
                }

                if (value !== null && value !== undefined) {
                    if (typeof value === 'string') {
                        const s = String(value);
                        if (s.includes('\n') || s.includes('<') || s.includes('>') || s.includes('&')) {
                            result += `<${XCON.VTAG}><![CDATA[${s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')}]]></${XCON.VTAG}>\n`;
                        } else {
                            result += `<${XCON.VTAG}>${s}</${XCON.VTAG}>\n`;
                        }
                    } else if (value instanceof Date) {
                        result += `<${XCON.VTAG}>${value.toISOString()}</${XCON.VTAG}>\n`;
                    } else {
                        result += `<${XCON.VTAG}>${value}</${XCON.VTAG}>\n`;
                    }
                } else {
                    result += `<${XCON.VTAG}></${XCON.VTAG}>\n`;
                }
            }
        }

        return result;
    }

    static arrayToXmlString(array, indent) {
        let result = '';

        array.forEach(obj => {
            if (XCON.isXCONObject(obj)) {
                result += `${indent}<${XCON.DTAG}>\n`;
                result += XCON.dictToXmlString(obj, indent + XCON.INDENT);
                result += `${indent}</${XCON.DTAG}>\n`;
            } else if (Array.isArray(obj)) {
                result += `${indent}<${XCON.ATAG}>\n`;
                result += XCON.arrayToXmlString(obj, indent + XCON.INDENT);
                result += `${indent}</${XCON.ATAG}>\n`;
            } else {
                if (obj !== null && obj !== undefined) {
                    if (typeof obj === 'string') {
                        const s = String(obj);
                        if (s.includes('\n') || s.includes('<') || s.includes('>') || s.includes('&')) {
                            result += `${indent}<${XCON.VTAG}><![CDATA[${s.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')}]]></${XCON.VTAG}>\n`;
                        } else {
                            result += `${indent}<${XCON.VTAG}>${s}</${XCON.VTAG}>\n`;
                        }
                    } else if (obj instanceof Date) {
                        result += `${indent}<${XCON.VTAG}>${obj.toISOString()}</${XCON.VTAG}>\n`;
                    } else {
                        result += `${indent}<${XCON.VTAG}>${obj}</${XCON.VTAG}>\n`;
                    }
                } else {
                    result += `${indent}<${XCON.VTAG}></${XCON.VTAG}>\n`;
                }
            }
        });

        return result;
    }

    static deserialize(xml) {
        const trimmed = (xml || '').trim();
        if (!trimmed) return null;

        // XML 형식 여부 판단: '<' 로 시작하면 XML, 아니면 TAGLESS
        if (trimmed.startsWith('<')) {
            return XCON.fromXml(xml);
        }

        return XCON.fromTagless(trimmed);
    }

    /**
     * TAGLESS 포맷 파싱
     *
     * TAGLESS 구조:
     *   - 최상위 시작 4글자 = ALIST  (ALIST[0]=DTAG, [1]=ATAG, [2]=VTAG, [3]=KTAG)
     *   - 최상위 끝   4글자 = ENDALIST ([0]=ENDDTAG, [1]=ENDATAG, [2]=ENDVTAG, [3]=ENDKTAG)
     *   - XML의 <TAG>content</TAG> 구조가 각각 단일 특수문자로 대체됨
     *   - 예) ♤♡◇♧ / ♠♥◆♣  →  ♤=DTAG, ♡=ATAG, ◇=VTAG, ♧=KTAG
     */
    static fromTagless(text) {
        try {
            if (!text || text.length < 8) return null;

            // 앞 4글자 = ALIST (시작 마커), 뒤 4글자 = ENDALIST (종료 마커)
            const alist = text.substring(0, 4);
            const endAlist = text.substring(text.length - 4);

            // ALIST 위치별 역할: [0]=dict, [1]=array, [2]=value, [3]=key/name
            const dtag    = alist[0];
            const atag    = alist[1];
            const vtag    = alist[2];
            const ktag    = alist[3];
            const enddtag  = endAlist[0];
            const endatag  = endAlist[1];
            const endvtag  = endAlist[2];
            const endktag  = endAlist[3];

            // XCON 정적 상태 업데이트 (serialize 와 일관성 유지)
            XCON.TAGLESS  = true;
            XCON.ALIST    = alist;
            XCON.ENDALIST = endAlist;
            XCON.DTAG     = dtag;
            XCON.ATAG     = atag;
            XCON.VTAG     = vtag;
            XCON.KTAG     = ktag;
            XCON.ENDDTAG  = enddtag;
            XCON.ENDATAG  = endatag;
            XCON.ENDVTAG  = endvtag;
            XCON.ENDKTAG  = endktag;

            // ALIST(4글자) ~ ENDALIST(4글자) 사이의 내용 추출
            const inner = text.substring(4, text.length - 4);
            const pos = { i: 0 };

            const skipWs = () => {
                while (pos.i < inner.length && /\s/.test(inner[pos.i])) pos.i++;
            };

            skipWs();

            // 루트는 반드시 DTAG(dict) 로 시작해야 함
            if (pos.i >= inner.length || inner[pos.i] !== dtag) return null;
            pos.i++; // DTAG 소비

            const root = new XCON();
            XCON.parseTaglessDict(root, inner, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);

            return root;
        } catch (ex) {
            XCON.error('XCON.fromTagless: 파싱 오류:', ex);
            return null;
        }
    }

    /**
     * TAGLESS dict 파싱 (DTAG 소비 후 호출, ENDDTAG 까지 읽음)
     */
    static parseTaglessDict(alist, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag) {
        const skipWs = () => {
            while (pos.i < text.length && /\s/.test(text[pos.i])) pos.i++;
        };

        const readUntil = (endChar) => {
            let result = '';
            while (pos.i < text.length && text[pos.i] !== endChar) {
                result += text[pos.i++];
            }
            if (pos.i < text.length) pos.i++; // endChar 소비
            return result;
        };

        const consumeValue = () => {
            skipWs();
            if (pos.i >= text.length) return;
            const ch = text[pos.i];
            if (ch === vtag) {
                pos.i++;
                readUntil(endvtag);
            } else if (ch === dtag) {
                pos.i++;
                XCON.parseTaglessDict(new XCON(), text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
            } else if (ch === atag) {
                pos.i++;
                XCON.parseTaglessArray([], text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
            }
        };

        while (pos.i < text.length) {
            skipWs();
            if (pos.i >= text.length) break;

            const ch = text[pos.i];

            // ENDDTAG → dict 종료
            if (ch === enddtag) {
                pos.i++;
                break;
            }

            // KTAG → key/name 시작
            if (ch !== ktag) {
                pos.i++; // 예상치 못한 문자 스킵
                continue;
            }
            pos.i++; // KTAG 소비

            const key = readUntil(endktag);
            if (!key) continue;

            // 중복 키 처리: 값을 소비하되 저장하지 않음
            if (alist.contains(key)) {
                consumeValue();
                continue;
            }

            skipWs();
            if (pos.i >= text.length) break;

            const valCh = text[pos.i];

            if (valCh === vtag) {
                pos.i++; // VTAG 소비
                let value = readUntil(endvtag);
                // CDATA 처리 (serialize 시 특수문자 값에 CDATA 사용)
                if (value.startsWith('<![CDATA[') && value.endsWith(']]>')) {
                    value = value.slice(9, -3).replace(/\r\n/g, '\n');
                }
                alist.set(key, value);
            } else if (valCh === dtag) {
                pos.i++; // DTAG 소비
                const child = new XCON();
                XCON.parseTaglessDict(child, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
                alist.set(key, child);
            } else if (valCh === atag) {
                pos.i++; // ATAG 소비
                const arr = [];
                XCON.parseTaglessArray(arr, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
                alist.set(key, arr);
            }
        }
    }

    /**
     * TAGLESS array 파싱 (ATAG 소비 후 호출, ENDATAG 까지 읽음)
     */
    static parseTaglessArray(arr, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag) {
        const skipWs = () => {
            while (pos.i < text.length && /\s/.test(text[pos.i])) pos.i++;
        };

        const readUntil = (endChar) => {
            let result = '';
            while (pos.i < text.length && text[pos.i] !== endChar) {
                result += text[pos.i++];
            }
            if (pos.i < text.length) pos.i++; // endChar 소비
            return result;
        };

        while (pos.i < text.length) {
            skipWs();
            if (pos.i >= text.length) break;

            const ch = text[pos.i];

            // ENDATAG → array 종료
            if (ch === endatag) {
                pos.i++;
                break;
            }

            if (ch === vtag) {
                pos.i++; // VTAG 소비
                let value = readUntil(endvtag);
                // CDATA 처리
                if (value.startsWith('<![CDATA[') && value.endsWith(']]>')) {
                    value = value.slice(9, -3).replace(/\r\n/g, '\n');
                }
                arr.push(value);
            } else if (ch === dtag) {
                pos.i++; // DTAG 소비
                const child = new XCON();
                XCON.parseTaglessDict(child, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
                arr.push(child);
            } else if (ch === atag) {
                pos.i++; // ATAG 소비
                const innerArr = [];
                XCON.parseTaglessArray(innerArr, text, pos, dtag, atag, vtag, ktag, enddtag, endatag, endvtag, endktag);
                arr.push(innerArr);
            } else {
                pos.i++; // 예상치 못한 문자 스킵
            }
        }
    }

    toXml() {
        return XCON.serialize(this, false);
    }

    static toXml(dict) {
        return XCON.serialize(dict, false);
    }

    /**
     * TAGLESS 포맷으로 직렬화
     * @param {string} alist    시작 마커 4글자 (기본값: '♤♡◇♧')
     * @param {string} endAlist 종료 마커 4글자 (기본값: '♠♥◆♣')
     *                          [0]=dict, [1]=array, [2]=value, [3]=key/name
     */
    toTagless(alist = '♤♡◇♧', endAlist = '♠♥◆♣') {
        return XCON.toTagless(this, alist, endAlist);
    }

    static toTagless(dict, alist = '♤♡◇♧', endAlist = '♠♥◆♣') {
        // 현재 정적 상태 저장
        const prev = {
            TAGLESS:  XCON.TAGLESS,
            ALIST:    XCON.ALIST,
            ENDALIST: XCON.ENDALIST,
            KTAG:     XCON.KTAG,
            DTAG:     XCON.DTAG,
            ATAG:     XCON.ATAG,
            VTAG:     XCON.VTAG,
            ENDKTAG:  XCON.ENDKTAG,
            ENDDTAG:  XCON.ENDDTAG,
            ENDATAG:  XCON.ENDATAG,
            ENDVTAG:  XCON.ENDVTAG,
        };

        try {
            XCON.setAListType(alist, endAlist, true);
            return XCON.serialize(dict, false);
        } finally {
            // 직렬화 완료(또는 오류) 후 이전 상태 복구
            XCON.TAGLESS  = prev.TAGLESS;
            XCON.ALIST    = prev.ALIST;
            XCON.ENDALIST = prev.ENDALIST;
            XCON.KTAG     = prev.KTAG;
            XCON.DTAG     = prev.DTAG;
            XCON.ATAG     = prev.ATAG;
            XCON.VTAG     = prev.VTAG;
            XCON.ENDKTAG  = prev.ENDKTAG;
            XCON.ENDDTAG  = prev.ENDDTAG;
            XCON.ENDATAG  = prev.ENDATAG;
            XCON.ENDVTAG  = prev.ENDVTAG;
        }
    }

    // JSON conversion
    toJSON(pretty = false) {
        return XCON.toJSON(this, pretty);
    }

    static toJSON(dict, pretty = false) {
        let result = '{\n';
        result += XCON.dictToJSON(dict, XCON.INDENT);
        result += '}\n';

        if (pretty) {
            return XCON.prettyJson(result);
        } else {
            return result;
        }
    }

    static toJSONObject(dict) {
        return JSON.parse(XCON.toJSON(dict, false));
    }

    static dictToJSON(dict, indent) {
        let result = '';
        const entries = Array.from(dict);

        entries.forEach((entry, i) => {
            const { key, value } = entry;
            result += `${indent}"${key}":`;

            if (value === null || value === undefined) {
                result += '""';
            } else {
                if (XCON.isXCONObject(value)) {
                    result += `\n${indent}{\n`;
                    result += XCON.dictToJSON(value, indent + XCON.INDENT);
                    result += `\n${indent}}`;
                } else if (Array.isArray(value)) {
                    result += `\n${indent}[\n`;
                    result += XCON.arrayToJSON(value, indent + XCON.INDENT);
                    result += `\n${indent}]`;
                } else {
                    if (typeof value === 'string') {
                        result += JSON.stringify(value);
                    } else if (typeof value === 'number') {
                        result += value.toString();
                    } else if (XCON.isPlainObject(value)) {
                        result += JSON.stringify(XCON.toPlainJSONObject(value));
                    } else {
                        result += JSON.stringify(value.toString());
                    }
                }
            }

            if (i < entries.length - 1) {
                result += ',';
            }
            result += '\n';
        });

        return result;
    }

    static arrayToJSON(array, indent) {
        let result = '';

        array.forEach((obj, i) => {
            if (obj === null || obj === undefined) {
                result += '""';
            } else {
                if (XCON.isXCONObject(obj)) {
                    result += `\n${indent}{\n`;
                    result += XCON.dictToJSON(obj, indent + XCON.INDENT);
                    result += `\n${indent}}`;
                } else if (Array.isArray(obj)) {
                    result += `\n${indent}[\n`;
                    result += XCON.arrayToJSON(obj, indent + XCON.INDENT);
                    result += `\n${indent}]`;
                } else {
                    result += `${indent}`;
                    if (typeof obj === 'string') {
                        result += JSON.stringify(obj);
                    } else if (typeof obj === 'number') {
                        result += obj.toString();
                    } else if (XCON.isPlainObject(obj)) {
                        result += JSON.stringify(XCON.toPlainJSONObject(obj));
                    } else {
                        result += JSON.stringify(obj.toString());
                    }
                }
            }

            if (i < array.length - 1) {
                result += ',';
            }
            result += '\n';
        });

        return result;
    }

    static isPlainObject(value) {
        return value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !XCON.isXCONObject(value);
    }

    static toPlainJSONObject(value) {
        if (XCON.isXCONObject(value)) {
            const result = {};
            Array.from(value).forEach(({ key, value: child }) => {
                result[key] = XCON.toPlainJSONObject(child);
            });
            return result;
        }
        if (Array.isArray(value)) {
            return value.map(item => XCON.toPlainJSONObject(item));
        }
        if (XCON.isPlainObject(value)) {
            const result = {};
            Object.keys(value).forEach(key => {
                result[key] = XCON.toPlainJSONObject(value[key]);
            });
            return result;
        }
        return value;
    }

    static prettyJson(json) {
        return json.split('\n')
            .map(line => line.trimEnd())
            .filter(line => line.length > 0)
            .join('\n');
    }

    // XCON 객체 여부를 안전하게 확인하는 메서드
    static isXCONObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        // 1. instanceof 검사 (같은 컨텍스트의 XCON)
        if (obj instanceof XCON) {
            return true;
        }

        // 2. constructor.name 검사 (다른 컨텍스트의 XCON)
        if (obj.constructor && obj.constructor.name === 'XCON') {
            return true;
        }

        // 3. 메서드 존재 검사 (XCON 인터페이스)
        if (typeof obj.get === 'function' &&
            typeof obj.set === 'function' &&
            typeof obj[Symbol.iterator] === 'function') {
            return true;
        }

        // 4. 프로토타입 체인 검사
        let proto = Object.getPrototypeOf(obj);
        while (proto) {
            if (proto.constructor && proto.constructor.name === 'XCON') {
                return true;
            }
            proto = Object.getPrototypeOf(proto);
        }

        return false;
    }

    // Print methods
    static print(name, dict) {
        return `#${name}\n${XCON.printDict(dict)}`;
    }

    static printDict(dict) {
        let result = '{\n';
        result += XCON.printInternal(dict, '    ');
        result += '}\n';
        return result;
    }

    static printInternal(dict, indent) {
        let result = '';

        for (const { key, value } of dict) {
            // 더 안전한 XCON 검사
            const isXCONLike = XCON.isXCONObject(value);

            if (isXCONLike) {
                result += `${indent}#${key}\n`;
                result += `${indent}{\n`;
                result += XCON.printInternal(value, indent + '    ');
                result += `${indent}}\n`;
            } else if (Array.isArray(value)) {
                result += `${indent}#${key}\n`;
                result += `${indent}{\n`;
                result += XCON.printArray(value, indent + '    ');
                result += `${indent}}\n`;
            } else {
                result += `${indent}#${key} : ${value}\n`;
            }
        }

        return result;
    }

    static printArray(array, indent) {
        let result = '';

        array.forEach((obj, i) => {
            // 더 안전한 XCON 검사
            const isXCONLike = XCON.isXCONObject(obj);

            if (isXCONLike) {
                result += `${indent}#${i}\n`;
                result += `${indent}{\n`;
                result += XCON.printInternal(obj, indent + '    ');
                result += `${indent}}\n`;
            } else if (Array.isArray(obj)) {
                result += `${indent}#${i}\n`;
                result += `${indent}{\n`;
                result += XCON.printArray(obj, indent + '    ');
                result += `${indent}}\n`;
            } else {
                result += `${indent}#${i} : ${obj}\n`;
            }
        });

        return result;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    console.log("XCON --------------------------- module");
    module.exports = { XCON };
} else if (typeof window !== 'undefined') {
    console.log("XCON --------------------------- window");
    window.XCON = XCON;
}


/**
 * 수정된 JSONObject JavaScript Implementation
 * 파싱 버그 수정 및 안정성 개선
 */
class JSONObject {
    constructor(arg) {
        this.parent = null;
        this.keys = [];
        this.list = [];
        this.b = false;
        this.ln = 0;
        this.str = '';
        this.type = JSONObject.Type.NULL;

        if (arg !== undefined) {
            if (typeof arg === 'string') {
                this._initFromString(arg);
            } else if (typeof arg === 'boolean') {
                this.type = JSONObject.Type.BOOL;
                this.b = arg;
            } else if (typeof arg === 'number') {
                this.type = JSONObject.Type.NUMBER;
                this.ln = arg;
            } else if (arg === JSONObject.Type.OBJECT || arg === JSONObject.Type.ARRAY || arg === JSONObject.Type.NULL) {
                this.type = arg;
                if (arg === JSONObject.Type.OBJECT) {
                    this.keys = [];
                    this.list = [];
                } else if (arg === JSONObject.Type.ARRAY) {
                    this.list = [];
                }
            } else if (typeof arg === 'object' && arg !== null) {
                // Dictionary-like object
                this.type = JSONObject.Type.OBJECT;
                this.keys = [];
                this.list = [];
                for (const [key, value] of Object.entries(arg)) {
                    const keyObj = new JSONObject();
                    keyObj.str = key;
                    this.keys.push(keyObj);
                    this.list.push(new JSONObject(value));
                }
            }
        }
    }

    // Static Type enum
    static Type = {
        NULL: 0,
        STRING: 1,
        NUMBER: 2,
        OBJECT: 3,
        ARRAY: 4,
        BOOL: 5
    };

    // Static getters
    static get obj() {
        return new JSONObject(JSONObject.Type.OBJECT);
    }

    static get arr() {
        return new JSONObject(JSONObject.Type.ARRAY);
    }

    static get nullJO() {
        return new JSONObject(JSONObject.Type.NULL);
    }

    // Indexers
    get(index) {
        if (typeof index === 'number') {
            return this.list[index];
        } else if (typeof index === 'string') {
            return this.getField(index);
        }
        return null;
    }

    _initFromString(str) {
        if (!str) {
            this.type = JSONObject.Type.NULL;
            return;
        }

        str = this._trim(str);

        if (str.length === 0) {
            this.type = JSONObject.Type.NULL;
            return;
        }

        // Handle literals first
        if (str.toLowerCase() === 'true') {
            this.type = JSONObject.Type.BOOL;
            this.b = true;
        } else if (str.toLowerCase() === 'false') {
            this.type = JSONObject.Type.BOOL;
            this.b = false;
        } else if (str === 'null') {
            this.type = JSONObject.Type.NULL;
        } else if (str[0] === '"' && str[str.length - 1] === '"') {
            // Properly quoted string
            this.type = JSONObject.Type.STRING;
            this.str = str.substring(1, str.length - 1);
        } else if (str[0] === "'" && str[str.length - 1] === "'") {
            // Single quoted string (non-standard but supported)
            this.type = JSONObject.Type.STRING;
            this.str = str.substring(1, str.length - 1);
        } else {
            // Try to parse as number
            const num = parseFloat(str);
            if (!isNaN(num) && isFinite(num)) {
                this.ln = num;
                this.type = JSONObject.Type.NUMBER;
            } else {
                const ch = str[0];
                if (ch === '{') {
                    this.type = JSONObject.Type.OBJECT;
                    this.keys = [];
                    this.list = [];
                    this._parseObject(str);
                } else if (ch === '[') {
                    this.type = JSONObject.Type.ARRAY;
                    this.list = [];
                    this._parseArray(str);
                } else {
                    // If we reach here, treat as unquoted string (for compatibility)
                    this.type = JSONObject.Type.STRING;
                    this.str = str;
                    XCON.log('improper JSON formatting:', str);
                }
            }
        }
    }

    _trim(str) {
        // Improved trim function that preserves quoted content
        let result = '';
        let inQuotes = false;
        let quoteChar = null;
        let i = 0;

        // First pass: remove whitespace outside quotes
        while (i < str.length) {
            const char = str[i];

            if (char === '\\' && inQuotes && i + 1 < str.length) {
                // Preserve escape sequences
                result += char + str[i + 1];
                i += 2;
                continue;
            }

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
                result += char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
                result += char;
            } else if (inQuotes) {
                result += char;
            } else if (!/\s/.test(char)) {
                result += char;
            }

            i++;
        }

        return result;
    }

    _parseObject(str) {
        // Improved object parsing with better quote handling
        let depth = 0;
        let inQuotes = false;
        let quoteChar = null;
        let start = 1; // Skip opening brace
        let expectingKey = true;
        let currentKey = '';

        for (let i = 1; i < str.length - 1; i++) {
            const char = str[i];

            // Handle escape sequences
            if (char === '\\' && inQuotes && i + 1 < str.length) {
                i++; // Skip next character
                continue;
            }

            // Handle quotes
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
            }

            if (!inQuotes) {
                if (char === '{' || char === '[') {
                    depth++;
                } else if (char === '}' || char === ']') {
                    depth--;
                } else if (depth === 0) {
                    if (char === ':' && expectingKey) {
                        // Extract key
                        let keyStr = str.substring(start, i).trim();
                        if (keyStr.startsWith('"') && keyStr.endsWith('"')) {
                            keyStr = keyStr.substring(1, keyStr.length - 1);
                        }
                        currentKey = keyStr;
                        expectingKey = false;
                        start = i + 1;
                    } else if (char === ',' || i === str.length - 2) {
                        // Extract value
                        let endPos = (char === ',') ? i : str.length - 1;
                        let valueStr = str.substring(start, endPos).trim();

                        if (currentKey && valueStr) {
                            const keyObj = new JSONObject();
                            keyObj.str = currentKey;
                            this.keys.push(keyObj);
                            this.list.push(new JSONObject(valueStr));
                        }

                        expectingKey = true;
                        start = i + 1;
                        currentKey = '';
                    }
                }
            }
        }

        // Handle the last key-value pair if no trailing comma
        if (!expectingKey && currentKey) {
            let valueStr = str.substring(start, str.length - 1).trim();
            if (valueStr) {
                const keyObj = new JSONObject();
                keyObj.str = currentKey;
                this.keys.push(keyObj);
                this.list.push(new JSONObject(valueStr));
            }
        }
    }

    _parseArray(str) {
        // Improved array parsing
        let depth = 0;
        let inQuotes = false;
        let quoteChar = null;
        let start = 1; // Skip opening bracket

        for (let i = 1; i < str.length - 1; i++) {
            const char = str[i];

            // Handle escape sequences
            if (char === '\\' && inQuotes && i + 1 < str.length) {
                i++; // Skip next character
                continue;
            }

            // Handle quotes
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
            }

            if (!inQuotes) {
                if (char === '{' || char === '[') {
                    depth++;
                } else if (char === '}' || char === ']') {
                    depth--;
                } else if (depth === 0 && (char === ',' || i === str.length - 2)) {
                    // Extract array element
                    let endPos = (char === ',') ? i : str.length - 1;
                    let elementStr = str.substring(start, endPos).trim();

                    if (elementStr) {
                        this.list.push(new JSONObject(elementStr));
                    }

                    start = i + 1;
                }
            }
        }

        // Handle the last element if no trailing comma
        let lastElement = str.substring(start, str.length - 1).trim();
        if (lastElement) {
            this.list.push(new JSONObject(lastElement));
        }
    }

    // Methods
    add(obj) {
        if (obj) {
            if (this.type !== JSONObject.Type.ARRAY) {
                this.type = JSONObject.Type.ARRAY;
            }
            this.list.push(obj);
        }
    }

    addField(name, obj) {
        if (obj) {
            if (this.type !== JSONObject.Type.OBJECT) {
                this.type = JSONObject.Type.OBJECT;
            }
            const keyObj = new JSONObject();
            keyObj.str = name;
            this.keys.push(keyObj);
            this.list.push(obj);
        }
    }

    // Convenience methods for different types
    addBool(val) {
        this.add(new JSONObject(val));
    }

    addNumber(val) {
        this.add(new JSONObject(val));
    }

    addString(val) {
        const obj = new JSONObject();
        obj.type = JSONObject.Type.STRING;
        obj.str = val;
        this.add(obj);
    }

    addFieldBool(name, val) {
        this.addField(name, new JSONObject(val));
    }

    addFieldNumber(name, val) {
        this.addField(name, new JSONObject(val));
    }

    addFieldString(name, val) {
        const obj = new JSONObject();
        obj.type = JSONObject.Type.STRING;
        obj.str = val;
        this.addField(name, obj);
    }

    clear() {
        this.type = JSONObject.Type.NULL;
        this.list = [];
        this.keys = [];
        this.str = '';
        this.ln = 0;
        this.b = false;
    }

    copy() {
        return new JSONObject(this.print());
    }

    getField(name) {
        if (this.type === JSONObject.Type.OBJECT) {
            for (let i = 0; i < this.keys.length; i++) {
                if (this.keys[i].str === name) {
                    return this.list[i];
                }
            }
        }
        return null;
    }

    setField(key, obj) {
        const item = this.hasField(key.str);
        if (item) {
            const index = this.keys.indexOf(item);
            this.list.splice(index, 1);
            this.keys.splice(this.keys.indexOf(item), 1);
        }
        this.addField(key.str, obj);
    }

    hasField(name) {
        if (this.type === JSONObject.Type.OBJECT) {
            for (let i = 0; i < this.keys.length; i++) {
                if (this.keys[i].str === name) {
                    return this.keys[i];
                }
            }
        }
        return null;
    }

    static isNull(jsonObject) {
        return !jsonObject || !jsonObject.list || jsonObject.list.length <= 0 || jsonObject.list[0].type === JSONObject.Type.NULL;
    }

    merge(obj) {
        JSONObject._mergeRecur(this, obj);
    }

    static _mergeRecur(left, right) {
        if (right.type === JSONObject.Type.OBJECT) {
            for (let i = 0; i < right.list.length; i++) {
                if (right.keys[i]) {
                    const key = right.keys[i];
                    const obj3 = right.list[i];

                    if (obj3.type === JSONObject.Type.ARRAY || obj3.type === JSONObject.Type.OBJECT) {
                        if (left.hasField(key.str)) {
                            JSONObject._mergeRecur(left.getField(key.str), obj3);
                        } else {
                            left.addField(key.str, obj3);
                        }
                    } else if (left.hasField(key.str)) {
                        left.setField(key, obj3);
                    } else {
                        left.addField(key.str, obj3);
                    }
                }
            }
        }
    }

    print(depth = 0) {
        const MAX_DEPTH = 1000;

        if (depth++ > MAX_DEPTH) {
            return '';
        }

        let str = '';

        switch (this.type) {
            case JSONObject.Type.NULL:
                return 'null';

            case JSONObject.Type.STRING:
                return `"${this.str}"`;

            case JSONObject.Type.NUMBER:
                return str + this.ln;

            case JSONObject.Type.OBJECT:
                if (this.list.length <= 0) {
                    return '{}';
                }
                str = '{\n';
                for (let i = 0; i < this.list.length; i++) {
                    const str2 = this.keys[i].str;
                    const obj2 = this.list[i];
                    if (obj2) {
                        for (let j = 0; j < depth; j++) {
                            str += '\t';
                        }
                        str += `"${str2}":${obj2.print(depth)}`;
                        if (i < this.list.length - 1) {
                            str += ',';
                        }
                        str += '\n';
                    }
                }
                for (let j = 0; j < depth - 1; j++) {
                    str += '\t';
                }
                return str + '}';

            case JSONObject.Type.ARRAY:
                if (this.list.length <= 0) {
                    return '[]';
                }
                str = '[\n';
                for (let i = 0; i < this.list.length; i++) {
                    const obj3 = this.list[i];
                    if (obj3) {
                        for (let k = 0; k < depth; k++) {
                            str += '\t';
                        }
                        str += obj3.print(depth);
                        if (i < this.list.length - 1) {
                            str += ',';
                        }
                        str += '\n';
                    }
                }
                for (let k = 0; k < depth - 1; k++) {
                    str += '\t';
                }
                return str + ']';

            case JSONObject.Type.BOOL:
                return str + (this.b ? 'true' : 'false');
        }

        return str;
    }

    toXML(depth = 0) {
        const MAX_DEPTH = 1000;

        if (depth === 0) {
            return `<alist>\n    ${this.toXML(1)}\n</alist>`;
        }

        if (depth++ > MAX_DEPTH) {
            return '';
        }

        let str = '';

        switch (this.type) {
            case JSONObject.Type.NULL:
                return '<string></string>';

            case JSONObject.Type.STRING:
                return `<string>${this.str}</string>`;

            case JSONObject.Type.NUMBER:
                return `<string>${this.ln}</string>`;

            case JSONObject.Type.OBJECT:
                if (this.list.length <= 0) {
                    return '<dict></dict>';
                }
                str = '<dict>\n';
                for (let i = 0; i < this.list.length; i++) {
                    const str2 = this.keys[i].str;
                    const obj2 = this.list[i];
                    if (obj2) {
                        for (let j = 0; j < depth; j++) {
                            str += '  ';
                        }
                        str += `<key>${str2}</key>${obj2.toXML(depth)}\n`;
                    }
                }
                return str.substring(0, str.length - 1) + '</dict>';

            case JSONObject.Type.ARRAY:
                if (this.list.length <= 0) {
                    return '<array></array>';
                }
                str = '<array>\n';
                for (const obj3 of this.list) {
                    if (obj3) {
                        for (let k = 0; k < depth; k++) {
                            str += '  ';
                        }
                        str += obj3.toXML(depth) + '\n';
                    }
                }
                return str.substring(0, str.length - 1) + '</array>';

            case JSONObject.Type.BOOL:
                return `<string>${this.b ? 'true' : 'false'}</string>`;
        }

        return str;
    }

    toDictionary() {
        if (this.type === JSONObject.Type.OBJECT) {
            const dictionary = {};
            for (let i = 0; i < this.list.length; i++) {
                const obj2 = this.list[i];
                switch (obj2.type) {
                    case JSONObject.Type.STRING:
                        dictionary[this.keys[i].str] = obj2.str;
                        break;
                    case JSONObject.Type.NUMBER:
                        dictionary[this.keys[i].str] = obj2.ln.toString();
                        break;
                    case JSONObject.Type.BOOL:
                        dictionary[this.keys[i].str] = obj2.b.toString();
                        break;
                    default:
                        XCON.log('Omitting object:', this.keys[i].str, 'in dictionary conversion');
                }
            }
            return dictionary;
        }
        XCON.log('Tried to turn non-Object JSONObject into a dictionary');
        return null;
    }

    toString() {
        return this.print();
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JSONObject };
} else if (typeof window !== 'undefined') {
    window.JSONObject = JSONObject;
}


/**
 * 완전히 독립적인 JSONObjectV2 Implementation
 * 기본 JSONObject에 의존하지 않는 순수한 구현
 */
class JSONObjectV2 {
    // Token types
    static TokenType = {
        LeftBrace: 'LeftBrace',        // {
        RightBrace: 'RightBrace',      // }
        LeftBracket: 'LeftBracket',    // [
        RightBracket: 'RightBracket',  // ]
        Colon: 'Colon',                // :
        Comma: 'Comma',                // ,
        String: 'String',              // "text"
        Number: 'Number',              // 123, 1.23, 1e5
        Boolean: 'Boolean',            // true, false
        Null: 'Null',                  // null
        EOF: 'EOF',                    // End of file
        Invalid: 'Invalid'             // Parse error
    };

    // 독립적인 JSONValue 클래스 (JSONObject를 대체)
    static JSONValue = class {
        constructor(type = 'null', value = null) {
            this.type = type; // 'null', 'string', 'number', 'boolean', 'object', 'array'
            this.value = value;

            // 타입별 속성 (호환성을 위해)
            if (type === 'string') {
                this.str = value;
            } else if (type === 'number') {
                this.ln = value;
            } else if (type === 'boolean') {
                this.b = value;
            } else if (type === 'object') {
                this.keys = [];
                this.list = [];
                this.fields = value || {};
            } else if (type === 'array') {
                this.list = value || [];
            }
        }

        static fromString(str) {
            return new JSONObjectV2.JSONValue('string', str);
        }

        static fromNumber(num) {
            return new JSONObjectV2.JSONValue('number', num);
        }

        static fromBoolean(bool) {
            return new JSONObjectV2.JSONValue('boolean', bool);
        }

        static fromNull() {
            return new JSONObjectV2.JSONValue('null', null);
        }

        static fromObject(obj = {}) {
            const jsonValue = new JSONObjectV2.JSONValue('object', obj);
            // JSONObject 호환성을 위한 속성 설정
            Object.keys(obj).forEach(key => {
                const keyObj = { str: key };
                jsonValue.keys.push(keyObj);
                jsonValue.list.push(obj[key]);
            });
            return jsonValue;
        }

        static fromArray(arr = []) {
            return new JSONObjectV2.JSONValue('array', arr);
        }

        // JSONObject 호환성 메서드
        addField(key, value) {
            if (this.type !== 'object') {
                this.type = 'object';
                this.keys = [];
                this.list = [];
                this.fields = {};
            }

            const keyObj = { str: key };
            this.keys.push(keyObj);
            this.list.push(value);
            this.fields[key] = value;
        }

        add(value) {
            if (this.type !== 'array') {
                this.type = 'array';
                this.list = [];
            }
            this.list.push(value);
        }
    };

    // Token class
    static Token = class {
        constructor(type, value, position, line, column) {
            this.type = type;
            this.value = value;
            this.position = position;
            this.line = line;
            this.column = column;
        }

        toString() {
            return `${this.type}: '${this.value}' at ${this.line}:${this.column}`;
        }
    };

    // JSON Parse Exception
    static JSONParseException = class extends Error {
        constructor(message, position, line, column, context = '') {
            super(`${message} at line ${line}, column ${column}. Context: ${context}`);
            this.name = 'JSONParseException';
            this.position = position;
            this.line = line;
            this.column = column;
            this.context = context;
        }
    };

    // Tokenizer class
    static Tokenizer = class {
        constructor(json) {
            this.json = json;
            this.position = 0;
            this.line = 1;
            this.column = 1;
            this.length = json.length;
        }

        nextToken() {
            this.skipWhitespace();

            if (this.position >= this.length) {
                return new JSONObjectV2.Token(JSONObjectV2.TokenType.EOF, '', this.position, this.line, this.column);
            }

            const ch = this.json[this.position];
            const startPos = this.position;
            const startLine = this.line;
            const startCol = this.column;

            switch (ch) {
                case '{':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.LeftBrace, '{', startPos, startLine, startCol);

                case '}':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.RightBrace, '}', startPos, startLine, startCol);

                case '[':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.LeftBracket, '[', startPos, startLine, startCol);

                case ']':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.RightBracket, ']', startPos, startLine, startCol);

                case ':':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.Colon, ':', startPos, startLine, startCol);

                case ',':
                    this.advance();
                    return new JSONObjectV2.Token(JSONObjectV2.TokenType.Comma, ',', startPos, startLine, startCol);

                case '"':
                    return this.readString(startPos, startLine, startCol);

                case 't':
                case 'f':
                    return this.readBoolean(startPos, startLine, startCol);

                case 'n':
                    return this.readNull(startPos, startLine, startCol);

                default:
                    if (this.isDigit(ch) || ch === '-' || ch === '+') {
                        return this.readNumber(startPos, startLine, startCol);
                    }

                    throw new JSONObjectV2.JSONParseException(`Unexpected character '${ch}'`, this.position, this.line, this.column);
            }
        }

        skipWhitespace() {
            while (this.position < this.length && this.isWhitespace(this.json[this.position])) {
                if (this.json[this.position] === '\n') {
                    this.line++;
                    this.column = 1;
                } else {
                    this.column++;
                }
                this.position++;
            }
        }

        advance() {
            if (this.position < this.length) {
                if (this.json[this.position] === '\n') {
                    this.line++;
                    this.column = 1;
                } else {
                    this.column++;
                }
                this.position++;
            }
        }

        readString(startPos, startLine, startCol) {
            let result = '';
            this.advance(); // Skip opening quote

            while (this.position < this.length && this.json[this.position] !== '"') {
                if (this.json[this.position] === '\\') {
                    this.advance();
                    if (this.position >= this.length) {
                        throw new JSONObjectV2.JSONParseException('Unterminated string escape', this.position, this.line, this.column);
                    }

                    const escaped = this.json[this.position];
                    switch (escaped) {
                        case '"':
                            result += '"';
                            break;
                        case '\\':
                            result += '\\';
                            break;
                        case '/':
                            result += '/';
                            break;
                        case 'b':
                            result += '\b';
                            break;
                        case 'f':
                            result += '\f';
                            break;
                        case 'n':
                            result += '\n';
                            break;
                        case 'r':
                            result += '\r';
                            break;
                        case 't':
                            result += '\t';
                            break;
                        case 'u':
                            if (this.position + 4 >= this.length) {
                                throw new JSONObjectV2.JSONParseException('Invalid unicode escape', this.position, this.line, this.column);
                            }

                            const hex = this.json.substring(this.position + 1, this.position + 5);
                            const unicode = parseInt(hex, 16);
                            if (isNaN(unicode)) {
                                throw new JSONObjectV2.JSONParseException(`Invalid unicode escape '\\u${hex}'`, this.position, this.line, this.column);
                            }
                            result += String.fromCharCode(unicode);
                            this.position += 4;
                            break;
                        default:
                            throw new JSONObjectV2.JSONParseException(`Invalid escape sequence '\\${escaped}'`, this.position, this.line, this.column);
                    }
                } else {
                    result += this.json[this.position];
                }
                this.advance();
            }

            if (this.position >= this.length) {
                throw new JSONObjectV2.JSONParseException('Unterminated string', startPos, startLine, startCol);
            }

            this.advance(); // Skip closing quote
            return new JSONObjectV2.Token(JSONObjectV2.TokenType.String, result, startPos, startLine, startCol);
        }

        readNumber(startPos, startLine, startCol) {
            let result = '';

            if (this.json[this.position] === '-' || this.json[this.position] === '+') {
                result += this.json[this.position];
                this.advance();
            }

            while (this.position < this.length && this.isDigit(this.json[this.position])) {
                result += this.json[this.position];
                this.advance();
            }

            if (this.position < this.length && this.json[this.position] === '.') {
                result += this.json[this.position];
                this.advance();

                while (this.position < this.length && this.isDigit(this.json[this.position])) {
                    result += this.json[this.position];
                    this.advance();
                }
            }

            if (this.position < this.length && (this.json[this.position] === 'e' || this.json[this.position] === 'E')) {
                result += this.json[this.position];
                this.advance();

                if (this.position < this.length && (this.json[this.position] === '+' || this.json[this.position] === '-')) {
                    result += this.json[this.position];
                    this.advance();
                }

                while (this.position < this.length && this.isDigit(this.json[this.position])) {
                    result += this.json[this.position];
                    this.advance();
                }
            }

            if (!result || result === '-' || result === '+') {
                throw new JSONObjectV2.JSONParseException('Invalid number format', startPos, startLine, startCol);
            }

            return new JSONObjectV2.Token(JSONObjectV2.TokenType.Number, result, startPos, startLine, startCol);
        }

        readBoolean(startPos, startLine, startCol) {
            if (this.position + 4 <= this.length && this.json.substring(this.position, this.position + 4) === 'true') {
                this.position += 4;
                this.column += 4;
                return new JSONObjectV2.Token(JSONObjectV2.TokenType.Boolean, 'true', startPos, startLine, startCol);
            }

            if (this.position + 5 <= this.length && this.json.substring(this.position, this.position + 5) === 'false') {
                this.position += 5;
                this.column += 5;
                return new JSONObjectV2.Token(JSONObjectV2.TokenType.Boolean, 'false', startPos, startLine, startCol);
            }

            throw new JSONObjectV2.JSONParseException('Invalid boolean value', this.position, this.line, this.column);
        }

        readNull(startPos, startLine, startCol) {
            if (this.position + 4 <= this.length && this.json.substring(this.position, this.position + 4) === 'null') {
                this.position += 4;
                this.column += 4;
                return new JSONObjectV2.Token(JSONObjectV2.TokenType.Null, 'null', startPos, startLine, startCol);
            }

            throw new JSONObjectV2.JSONParseException('Invalid null value', this.position, this.line, this.column);
        }

        isWhitespace(ch) {
            return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
        }

        isDigit(ch) {
            return ch >= '0' && ch <= '9';
        }
    };

    // Parser class
    static Parser = class {
        constructor(tokens) {
            this.tokens = tokens;
            this.position = 0;
        }

        get currentToken() {
            return this.position < this.tokens.length ? this.tokens[this.position] : this.tokens[this.tokens.length - 1];
        }

        advance() {
            if (this.position < this.tokens.length - 1) {
                this.position++;
            }
        }

        expect(expectedType) {
            if (this.currentToken.type !== expectedType) {
                throw new JSONObjectV2.JSONParseException(
                    `Expected ${expectedType} but found ${this.currentToken.type}`,
                    this.currentToken.position,
                    this.currentToken.line,
                    this.currentToken.column,
                    this.currentToken.value
                );
            }
            this.advance();
        }

        parseValue() {
            switch (this.currentToken.type) {
                case JSONObjectV2.TokenType.LeftBrace:
                    return this.parseObject();

                case JSONObjectV2.TokenType.LeftBracket:
                    return this.parseArray();

                case JSONObjectV2.TokenType.String:
                    const strValue = this.currentToken.value;
                    this.advance();
                    return JSONObjectV2.JSONValue.fromString(strValue);

                case JSONObjectV2.TokenType.Number:
                    const numValue = this.currentToken.value;
                    this.advance();
                    try {
                        const decimalVal = parseFloat(numValue);
                        return JSONObjectV2.JSONValue.fromNumber(decimalVal);
                    } catch (e) {
                        throw new JSONObjectV2.JSONParseException(`Invalid number format: ${numValue}`, this.currentToken.position, this.currentToken.line, this.currentToken.column);
                    }

                case JSONObjectV2.TokenType.Boolean:
                    const boolValue = this.currentToken.value === 'true';
                    this.advance();
                    return JSONObjectV2.JSONValue.fromBoolean(boolValue);

                case JSONObjectV2.TokenType.Null:
                    this.advance();
                    return JSONObjectV2.JSONValue.fromNull();

                default:
                    throw new JSONObjectV2.JSONParseException(
                        `Unexpected token ${this.currentToken.type}`,
                        this.currentToken.position,
                        this.currentToken.line,
                        this.currentToken.column
                    );
            }
        }

        parseObject() {
            const obj = JSONObjectV2.JSONValue.fromObject();
            this.expect(JSONObjectV2.TokenType.LeftBrace);

            if (this.currentToken.type === JSONObjectV2.TokenType.RightBrace) {
                this.advance();
                return obj;
            }

            while (true) {
                if (this.currentToken.type !== JSONObjectV2.TokenType.String) {
                    throw new JSONObjectV2.JSONParseException('Expected string key', this.currentToken.position, this.currentToken.line, this.currentToken.column);
                }

                const key = this.currentToken.value;
                this.advance();

                this.expect(JSONObjectV2.TokenType.Colon);

                const value = this.parseValue();
                obj.addField(key, value);

                if (this.currentToken.type === JSONObjectV2.TokenType.RightBrace) {
                    this.advance();
                    break;
                }

                if (this.currentToken.type === JSONObjectV2.TokenType.Comma) {
                    this.advance();
                    continue;
                }

                throw new JSONObjectV2.JSONParseException('Expected \',\' or \'}\'', this.currentToken.position, this.currentToken.line, this.currentToken.column);
            }

            return obj;
        }

        parseArray() {
            const arr = JSONObjectV2.JSONValue.fromArray();
            this.expect(JSONObjectV2.TokenType.LeftBracket);

            if (this.currentToken.type === JSONObjectV2.TokenType.RightBracket) {
                this.advance();
                return arr;
            }

            while (true) {
                const value = this.parseValue();
                arr.add(value);

                if (this.currentToken.type === JSONObjectV2.TokenType.RightBracket) {
                    this.advance();
                    break;
                }

                if (this.currentToken.type === JSONObjectV2.TokenType.Comma) {
                    this.advance();
                    continue;
                }

                throw new JSONObjectV2.JSONParseException('Expected \',\' or \']\'', this.currentToken.position, this.currentToken.line, this.currentToken.column);
            }

            return arr;
        }
    };

    // Path Segment class
    static PathSegment = class {
        constructor(key, isArrayIndex, arrayIndex) {
            this.key = key;
            this.isArrayIndex = isArrayIndex;
            this.arrayIndex = arrayIndex;
        }

        toString() {
            return this.isArrayIndex ? `[${this.arrayIndex}]` : this.key;
        }
    };

    // Public API methods
    static parse(json) {
        if (!json) {
            return JSONObjectV2.JSONValue.fromNull();
        }

        try {
            const tokens = JSONObjectV2.tokenize(json);
            const parser = new JSONObjectV2.Parser(tokens);
            return parser.parseValue();
        } catch (e) {
            if (e instanceof JSONObjectV2.JSONParseException) {
                throw e;
            }
            throw new JSONObjectV2.JSONParseException(`Unexpected parsing error: ${e.message}`, 0, 1, 1);
        }
    }

    static isValidJSON(json) {
        try {
            JSONObjectV2.parse(json);
            return true;
        } catch (e) {
            return false;
        }
    }

    static tokenize(json) {
        const tokens = [];
        const tokenizer = new JSONObjectV2.Tokenizer(json);

        let token;
        do {
            token = tokenizer.nextToken();
            tokens.push(token);
        } while (token.type !== JSONObjectV2.TokenType.EOF);

        return tokens;
    }

    // Path-based operations
    static getValueByPath(json, path) {
        if (!json || !path) {
            return null;
        }

        try {
            const pathSegments = JSONObjectV2.parsePath(path);
            return JSONObjectV2.navigateToValue(json, pathSegments, 0);
        } catch (e) {
            return null; // 경고 없이 null 반환
        }
    }

    static setValueByPath(json, path, value) {
        if (!json || !path) {
            throw new Error('JSON object and path cannot be null or empty');
        }

        try {
            const pathSegments = JSONObjectV2.parsePath(path);
            const jsonValue = JSONObjectV2.convertToJSONValue(value);
            JSONObjectV2.navigateAndSet(json, pathSegments, 0, jsonValue);
        } catch (e) {
            throw new JSONObjectV2.JSONParseException(`Failed to set value at path '${path}': ${e.message}`, 0, 1, 1);
        }
    }

    static getAllPaths(json, prefix = '') {
        const paths = [];
        JSONObjectV2.collectAllPaths(json, prefix, paths);
        return paths;
    }

    static pathExists(json, path) {
        try {
            const value = JSONObjectV2.getValueByPath(json, path);
            return value !== null;
        } catch (e) {
            return false;
        }
    }

    // 나머지 메서드들은 동일하므로 생략...
    static parsePath(path) {
        const segments = [];
        let current = '';
        let inBrackets = false;

        for (let i = 0; i < path.length; i++) {
            const c = path[i];

            if (c === '[' && !inBrackets) {
                if (current.length > 0) {
                    segments.push(new JSONObjectV2.PathSegment(current, false, -1));
                    current = '';
                }
                inBrackets = true;
                current += c;
            } else if (c === ']' && inBrackets) {
                current += c;
                const bracketContent = current;
                if (bracketContent.length > 2) {
                    const indexStr = bracketContent.substring(1, bracketContent.length - 1);
                    const index = parseInt(indexStr);
                    if (isNaN(index)) {
                        throw new JSONObjectV2.JSONParseException(`Invalid array index: ${indexStr}`, 0, 1, 1);
                    }
                    segments.push(new JSONObjectV2.PathSegment('', true, index));
                }
                current = '';
                inBrackets = false;
            } else if (c === '.' && !inBrackets) {
                if (current.length > 0) {
                    segments.push(new JSONObjectV2.PathSegment(current, false, -1));
                    current = '';
                }
            } else {
                current += c;
            }
        }

        if (current.length > 0) {
            segments.push(new JSONObjectV2.PathSegment(current, false, -1));
        }

        return segments;
    }

    static navigateToValue(json, segments, segmentIndex) {
        if (segmentIndex >= segments.length) {
            return json;
        }

        const segment = segments[segmentIndex];

        if (segment.isArrayIndex) {
            if (json.type !== 'array') {
                return null;
            }

            if (segment.arrayIndex < 0 || segment.arrayIndex >= json.list.length) {
                return null;
            }

            const arrayItem = json.list[segment.arrayIndex];
            return JSONObjectV2.navigateToValue(arrayItem, segments, segmentIndex + 1);
        } else {
            if (json.type !== 'object') {
                return null;
            }

            for (let i = 0; i < json.keys.length; i++) {
                if (json.keys[i].str === segment.key) {
                    const value = json.list[i];
                    return JSONObjectV2.navigateToValue(value, segments, segmentIndex + 1);
                }
            }

            return null;
        }
    }

    static collectAllPaths(json, currentPath, paths) {
        if (!json) return;

        switch (json.type) {
            case 'object':
                for (let i = 0; i < json.keys.length; i++) {
                    const key = json.keys[i].str;
                    const newPath = currentPath ? `${currentPath}.${key}` : key;

                    const value = json.list[i];
                    if (value.type === 'object' || value.type === 'array') {
                        JSONObjectV2.collectAllPaths(value, newPath, paths);
                    } else {
                        paths.push(newPath);
                    }
                }
                break;

            case 'array':
                for (let i = 0; i < json.list.length; i++) {
                    const newPath = `${currentPath}[${i}]`;
                    const value = json.list[i];

                    if (value.type === 'object' || value.type === 'array') {
                        JSONObjectV2.collectAllPaths(value, newPath, paths);
                    } else {
                        paths.push(newPath);
                    }
                }
                break;

            default:
                if (currentPath) {
                    paths.push(currentPath);
                }
                break;
        }
    }

    static convertToJSONValue(value) {
        if (value === null || value === undefined) {
            return JSONObjectV2.JSONValue.fromNull();
        }

        if (value instanceof JSONObjectV2.JSONValue) {
            return value;
        }

        if (typeof value === 'string') {
            return JSONObjectV2.JSONValue.fromString(value);
        }

        if (typeof value === 'boolean') {
            return JSONObjectV2.JSONValue.fromBoolean(value);
        }

        if (typeof value === 'number') {
            return JSONObjectV2.JSONValue.fromNumber(value);
        }

        // For other types, convert to string
        return JSONObjectV2.JSONValue.fromString(value.toString());
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JSONObjectV2 };
} else if (typeof window !== 'undefined') {
    window.JSONObjectV2 = JSONObjectV2;
}


// =============================================================================
// XCON.log - console.log와 동일한 기능을 제공하는 로깅 함수
// =============================================================================

/**
 * console.log와 완전히 동일한 기능을 제공하는 XCON 로깅 함수
 * 사용법: XCON.log('message', obj1, obj2, ...)
 * 
 * 특징:
 * - 다중 인수 지원 (console.log와 동일)
 * - 객체 깊은 출력 지원
 * - XCON 객체 특별 처리
 * - 포맷팅 문자열 지원 (%s, %d, %i, %f, %o, %O, %c)
 * - 스택 트레이스 정보 포함
 */
XCON.log = function (...args) {
    //XCON.logon(...args);
}
XCON.logon = function (...args) {

}
XCON.logon2 = function (...args) {
    //console.log(...args);
}
XCON.logon3 = function (...args) {

}
XCON.logon4 = function (...args) {
    // console.log가 없는 환경에서는 아무것도 하지 않음
    if (typeof console === 'undefined' || typeof console.log !== 'function') {
        return;
    }

    // 인수가 없으면 빈 줄 출력
    if (args.length === 0) {
        console.log();
        return;
    }

    // 처리된 인수들을 저장할 배열
    const processedArgs = [];

    // 각 인수를 처리
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        processedArgs.push(XCON._processLogArgument(arg));
    }

    // 호출 위치 정보를 자동으로 추가 (PRESERVE_STACK이 true일 때)
    if (XCON.LOG_PRESERVE_STACK) {
        const callerInfo = XCON._getCallerInfo();
        if (callerInfo) {
            // 호출 위치를 첫 번째 인수 앞에 추가
            processedArgs.unshift(`[${callerInfo}]`);
        }
    }

    // 스택 트레이스 정보 추가 (선택사항)
    if (XCON.LOG_INCLUDE_STACK) {
        const stack = XCON._getCallerInfo();
        if (stack) {
            processedArgs.push(`\n📍 ${stack}`);
        }
    }

    // console.log 호출 - 브라우저 최적화를 위해 다양한 방법 시도
    if (XCON.LOG_PRESERVE_STACK) {
        try {
            // 방법 1: bind를 사용하여 컨텍스트 유지
            const boundLog = console.log.bind(console);
            boundLog(...processedArgs);
            return;
        } catch (e) {
            // 폴백으로 계속 진행
        }
    }

    // 기본 console.log 호출
    console.log.apply(console, processedArgs);
};
XCON.logf = function (...args) {

}

/**
 * XCON.log 설정 옵션들
 */
XCON.LOG_INCLUDE_STACK = false;  // 스택 트레이스 포함 여부
XCON.LOG_MAX_DEPTH = 10;         // 객체 출력 최대 깊이
XCON.LOG_MAX_ARRAY_LENGTH = 100; // 배열 출력 최대 길이
XCON.LOG_PRESERVE_STACK = true;  // 실제 호출 위치 표시 여부

/**
 * 로그 인수 처리 함수 (내부용)
 * @param {*} arg - 처리할 인수
 * @returns {*} 처리된 인수
 */
XCON._processLogArgument = function (arg) {
    // null, undefined 처리
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    // 원시 타입은 그대로 반환
    if (typeof arg === 'string' ||
        typeof arg === 'number' ||
        typeof arg === 'boolean' ||
        typeof arg === 'symbol' ||
        typeof arg === 'bigint') {
        return arg;
    }

    // 함수 처리
    if (typeof arg === 'function') {
        return `[Function: ${arg.name || 'anonymous'}]`;
    }

    // XCON 객체 특별 처리
    if (XCON.isXCONObject(arg)) {
        //return XCON._formatXCONForLog(arg);
        return XCON._formatObjectForLog(arg);
    }

    // 배열 처리
    if (Array.isArray(arg)) {
        return XCON._formatArrayForLog(arg);
    }

    // Date 객체 처리
    if (arg instanceof Date) {
        return arg.toISOString();
    }

    // Error 객체 처리
    if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack}`;
    }

    // 일반 객체 처리
    if (typeof arg === 'object') {
        return XCON._formatObjectForLog(arg);
    }

    // 기타 타입은 문자열로 변환
    return String(arg);
};

/**
 * XCON 객체를 로그용으로 포맷팅
 * @param {XCON} xcon - XCON 객체
 * @returns {string} 포맷팅된 문자열
 */
XCON._formatXCONForLog = function (xcon) {
    if (!xcon || xcon.count === 0) {
        return 'XCON {}';
    }

    const items = [];
    let count = 0;

    for (const { key, value } of xcon) {
        if (count >= XCON.LOG_MAX_ARRAY_LENGTH) {
            items.push(`... ${xcon.count - count} more items`);
            break;
        }

        let formattedValue;
        if (XCON.isXCONObject(value)) {
            formattedValue = `XCON {${value.count} items}`;
        } else if (Array.isArray(value)) {
            formattedValue = `Array(${value.length})`;
        } else if (typeof value === 'object' && value !== null) {
            formattedValue = '[Object]';
        } else if (typeof value === 'string') {
            formattedValue = `"${value}"`;
        } else {
            formattedValue = String(value);
        }

        items.push(`  ${key}: ${formattedValue}`);
        count++;
    }

    return `XCON {\n${items.join('\n')}\n}`;
};

/**
 * 배열을 로그용으로 포맷팅
 * @param {Array} arr - 배열
 * @returns {Array} 처리된 배열
 */
XCON._formatArrayForLog = function (arr) {
    if (arr.length === 0) return [];

    const result = [];
    const maxLength = Math.min(arr.length, XCON.LOG_MAX_ARRAY_LENGTH);

    for (let i = 0; i < maxLength; i++) {
        result.push(XCON._processLogArgument(arr[i]));
    }

    if (arr.length > XCON.LOG_MAX_ARRAY_LENGTH) {
        result.push(`... ${arr.length - XCON.LOG_MAX_ARRAY_LENGTH} more items`);
    }

    return result;
};

/**
 * 일반 객체를 로그용으로 포맷팅
 * @param {Object} obj - 객체
 * @param {number} depth - 현재 깊이
 * @returns {Object|string} 처리된 객체
 */
XCON._formatObjectForLog = function (obj, depth = 0) {
    if (depth >= XCON.LOG_MAX_DEPTH) {
        return '[Object: max depth reached]';
    }

    // 순환 참조 방지를 위한 WeakSet 사용
    if (!XCON._logCircularRefs) {
        XCON._logCircularRefs = new WeakSet();
    }

    if (XCON._logCircularRefs.has(obj)) {
        return '[Circular Reference]';
    }

    XCON._logCircularRefs.add(obj);

    try {
        const result = {};
        const keys = Object.keys(obj);
        const maxKeys = Math.min(keys.length, XCON.LOG_MAX_ARRAY_LENGTH);

        for (let i = 0; i < maxKeys; i++) {
            const key = keys[i];
            try {
                const value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    result[key] = XCON._formatObjectForLog(value, depth + 1);
                } else {
                    result[key] = XCON._processLogArgument(value);
                }
            } catch (e) {
                result[key] = '[Error accessing property]';
            }
        }

        if (keys.length > XCON.LOG_MAX_ARRAY_LENGTH) {
            result['...'] = `${keys.length - XCON.LOG_MAX_ARRAY_LENGTH} more properties`;
        }

        return result;
    } finally {
        XCON._logCircularRefs.delete(obj);
    }
};

/**
 * 호출자 정보 가져오기 (스택 트레이스)
 * @returns {string|null} 호출자 정보
 */
XCON._getCallerInfo = function () {
    try {
        const stack = new Error().stack;
        if (!stack) return null;

        const lines = stack.split('\n');
        // XCON.log 호출을 제외한 첫 번째 호출자 찾기
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.includes('XCON.log') && !line.includes('XCON.warn') && !line.includes('XCON.error') && !line.includes('XCON.group') && !line.includes('XCON._')) {
                // 파일명과 라인 번호 추출
                const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
                if (match) {
                    const [, file, lineNum, colNum] = match;
                    const fileName = file.split('/').pop() || file;
                    return `${fileName}:${lineNum}:${colNum}`;
                }
                return line;
            }
        }
    } catch (e) {
        return null;
    }
    return null;
};

/**
 * XCON.log 설정 함수들
 */
XCON.setLogConfig = function (options) {
    if (options.includeStack !== undefined) {
        XCON.LOG_INCLUDE_STACK = Boolean(options.includeStack);
    }
    if (options.maxDepth !== undefined) {
        XCON.LOG_MAX_DEPTH = Math.max(1, parseInt(options.maxDepth) || 3);
    }
    if (options.maxArrayLength !== undefined) {
        XCON.LOG_MAX_ARRAY_LENGTH = Math.max(1, parseInt(options.maxArrayLength) || 100);
    }
    if (options.preserveStack !== undefined) {
        XCON.LOG_PRESERVE_STACK = Boolean(options.preserveStack);
    }
};

/**
 * 추가 로깅 함수들 (console의 다른 메서드들과 동일)
 */
XCON.warn = function (...args) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.warn.apply(console, processedArgs);
    }
};

XCON.error = function (...args) {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.error.apply(console, processedArgs);
    }
};

XCON.info = function (...args) {
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.info.apply(console, processedArgs);
    }
};

XCON.debug = function (...args) {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.debug.apply(console, processedArgs);
    }
};

XCON.table = function (data, columns) {
    if (typeof console !== 'undefined' && typeof console.table === 'function') {
        // XCON 객체를 일반 객체로 변환
        if (XCON.isXCONObject(data)) {
            const converted = {};
            for (const { key, value } of data) {
                converted[key] = value;
            }
            console.table(converted, columns);
        } else {
            console.table(data, columns);
        }
    }
};

/**
 * 콘솔 그룹 관련 함수들
 */
XCON.group = function (...args) {
    if (typeof console !== 'undefined' && typeof console.group === 'function') {
        if (args.length === 0) {
            console.group();
            return;
        }

        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.group.apply(console, processedArgs);
    }
};

XCON.groupCollapsed = function (...args) {
    if (typeof console !== 'undefined' && typeof console.groupCollapsed === 'function') {
        if (args.length === 0) {
            console.groupCollapsed();
            return;
        }

        const processedArgs = args.map(arg => XCON._processLogArgument(arg));

        // 호출 위치 정보 추가
        if (XCON.LOG_PRESERVE_STACK) {
            const callerInfo = XCON._getCallerInfo();
            if (callerInfo) {
                processedArgs.unshift(`[${callerInfo}]`);
            }
        }

        console.groupCollapsed.apply(console, processedArgs);
    }
};

XCON.groupEnd = function () {
    if (typeof console !== 'undefined' && typeof console.groupEnd === 'function') {
        console.groupEnd();
    }
};

XCON.hex_md5 = function (str) {
    function md5cycle(x, k) {
        let a = x[0], b = x[1], c = x[2], d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function md51(s) {
        const n = s.length;
        const state = [1732584193, -271733879, -1732584194, 271733878];
        let i;
        for (i = 64; i <= s.length; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < s.length; i++)
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i++) tail[i] = 0;
        }
        tail[14] = n * 8;
        md5cycle(state, tail);
        return state;
    }

    function md5blk(s) {
        const md5blks = [];
        for (let i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i)
                + (s.charCodeAt(i + 1) << 8)
                + (s.charCodeAt(i + 2) << 16)
                + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function rhex(n) {
        let s = '';
        for (let j = 0; j < 4; j++)
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
                + hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
    }

    function hex(x) {
        const result = [];
        for (let i = 0; i < x.length; i++)
            result[i] = rhex(x[i]);
        return result.join('');
    }

    function add32(a, b) {
        return (a + b) & 0xFFFFFFFF;
    }

    const hex_chr = '0123456789abcdef'.split('');

    return hex(md51(str));
};

XCON.deviceId = function () {
    const nav = window.navigator;
    const screen = window.screen;
    let guid = ''+nav.mimeTypes.length;
    guid += ''+nav.userAgent.replace(/\D+/g, '');
    guid += ''+nav.plugins.length;
    guid += ''+screen.height || '';
    guid += ''+screen.width || '';
    guid += ''+screen.pixelDepth || '';

    const hex = XCON.hex_md5(guid);

    return hex.substring(0,8)+"-"+hex.substring(8, 12)+"-"+hex.substring(12, 16)+"-"+hex.substring(16, 20)+"-"+hex.substring(20);
};

XCON.generateUUID = function () {
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); // 사용 가능한 경우 더욱 정확한 시간을 사용
    }
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;

    /*
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    */
};

XCON.generateGUID = function () {
    let guid = '';
    for (let i = 0; i < 32; i++) {
        guid += Math.floor(Math.random() * 16).toString(16);
    }
    return guid;
};

XCON.guid = function (format) {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    if (format == "D") {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    } else if (format == "N") {
        return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
    } else if (format == "P") {
        return "(" + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4() + ")";
    } else if (format == "B") {
        return "{" + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4() + "}";
    } else {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }
}

XCON.xamongToken = function (token) {
    if (token) {
        if (typeof localStorage !== 'undefined') {
            try {
                if (token.remove) {
                    localStorage.removeItem('xamong_token');
                } else {
                    localStorage.setItem('xamong_token', JSON.stringify(token));
                }
            } catch (error) {
                //XCON.warn('Failed to save xamong token to localStorage:', error);
            }
        }
    } else {
        if (window.XAMONG_TOKEN) {
            return window.XAMONG_TOKEN;
        } else {
            try {
                const xamongToken = JSON.parse(localStorage.getItem('xamong_token') || '{}');
                return xamongToken;
            } catch (error) {
                return null;
            }
        }
    }
}

XCON.setAuthHeader = function (headers) {
    const xamongToken = XCON.xamongToken();
    if (xamongToken && xamongToken.token) {
        headers['Authorization'] = `Bearer ${xamongToken.token}`;
    }
}

// ES6 모듈 내보내기
//export { XCON, JSONObject, JSONObjectV2 };

// Node: 최종 export에 XCON 포함 (벤치마크/테스트용)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { XCON, JSONObject, JSONObjectV2 };
}
