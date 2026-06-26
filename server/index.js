/**
 * Xenesis Desk — Local SQLite API Server
 *
 * core/sqlite/server.js 를 xenesis-desk/server 에 포팅한 버전.
 * Windows / Linux 양 환경에서 동일하게 동작하도록 경로 처리를 path.join 기반으로 수정.
 *
 * 환경변수:
 *   PORT    — 수신 포트 (기본값: 3001)
 *   DB_PATH — database.db 파일 경로 (기본값: <server 디렉터리>/database.db)
 *
 * 실행:
 *   node index.js            # 기본 실행
 *   PORT=4001 node index.js  # 포트 지정 (Windows: set PORT=4001 && node index.js)
 *   npm run dev              # nodemon 으로 자동 재시작
 */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// ─── 경로 설정 ────────────────────────────────────────────────────────────────

const SERVER_DIR = __dirname;
const DB_PATH = process.env.DB_PATH || path.join(SERVER_DIR, 'database.db');
const ASSETS_APPS = path.join(SERVER_DIR, '..', '..', '..', 'assets', 'apps');
const PORT = Number(process.env.PORT) || 3001;

// ─── Express 앱 초기화 ────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(SERVER_DIR, 'public')));

// ─── 데이터베이스 초기화 ──────────────────────────────────────────────────────

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER  PRIMARY KEY AUTOINCREMENT,
    name       TEXT     NOT NULL,
    email      TEXT     NOT NULL,
    age        INTEGER  NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS TB_CODE_INFO_NEW (
    UID         INTEGER  PRIMARY KEY AUTOINCREMENT,
    PID         INTEGER  NOT NULL DEFAULT 0,
    PCODE       VARCHAR(50)  NOT NULL DEFAULT '',
    AID         INTEGER  DEFAULT NULL,
    ACODE       VARCHAR(50)  DEFAULT NULL,
    CODE        VARCHAR(50)  DEFAULT NULL,
    NAME        VARCHAR(100) DEFAULT NULL,
    VALUE       TEXT         DEFAULT NULL,
    TYPE        VARCHAR(10)  DEFAULT NULL,
    FORMORDER   VARCHAR(10)  DEFAULT NULL,
    DESCRIPTION VARCHAR(255) DEFAULT NULL,
    SHOW_YN     CHAR(1)  NOT NULL DEFAULT 'N',
    CID         INTEGER  DEFAULT NULL,
    RID         VARCHAR(32)  DEFAULT NULL,
    RIX         INTEGER  DEFAULT NULL,
    TARGET      VARCHAR(50)  DEFAULT NULL,
    RESERVE     VARCHAR(255) DEFAULT NULL,
    RESERV1     VARCHAR(255) DEFAULT NULL,
    RESERV2     VARCHAR(255) DEFAULT NULL,
    RESERV3     VARCHAR(255) DEFAULT NULL,
    USE_YN      CHAR(1)  NOT NULL DEFAULT 'Y',
    DEL_YN      CHAR(1)  NOT NULL DEFAULT 'N',
    TTSHINT     VARCHAR(255) DEFAULT NULL,
    INSERT_DT   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UPDATE_DT   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS TB_PROJECT_INFO (
    UID          INTEGER  PRIMARY KEY AUTOINCREMENT,
    USERID       VARCHAR(50)  NOT NULL,
    USER_HASH    VARCHAR(32)  DEFAULT NULL,
    JOINID       VARCHAR(50)  NOT NULL,
    PROJECT_ID   VARCHAR(36)  DEFAULT NULL,
    PROJECT_HASH VARCHAR(32)  DEFAULT NULL,
    PROJECT_UUID VARCHAR(64)  DEFAULT NULL,
    PROJECT_NAME VARCHAR(100) DEFAULT NULL,
    TITLE        VARCHAR(100) DEFAULT NULL,
    SUMMARY      VARCHAR(255) DEFAULT NULL,
    DESCRIPTION  TEXT         DEFAULT NULL,
    MOBILE_IMAGE VARCHAR(40)  DEFAULT NULL,
    WEB_IMAGE    VARCHAR(40)  DEFAULT NULL,
    REMARK       TEXT         DEFAULT NULL,
    TEAM         VARCHAR(50)  DEFAULT NULL,
    SAVED        VARCHAR(100) DEFAULT NULL,
    MOCK_UP_NAME VARCHAR(50)  DEFAULT NULL,
    RESOLUTION   VARCHAR(11)  DEFAULT NULL,
    P_SITE_ID    VARCHAR(36)  DEFAULT NULL,
    FAVORITE_YN  CHAR(1)  NOT NULL DEFAULT 'N',
    TEMPLATE_YN  CHAR(1)  NOT NULL DEFAULT 'N',
    RESERVE      VARCHAR(255) DEFAULT NULL,
    RESERV1      VARCHAR(255) DEFAULT NULL,
    RESERV2      VARCHAR(255) DEFAULT NULL,
    RESERV3      VARCHAR(255) DEFAULT NULL,
    USE_YN       CHAR(1)  NOT NULL DEFAULT 'Y',
    DEL_YN       CHAR(1)  NOT NULL DEFAULT 'N',
    TTSHINT      VARCHAR(255) DEFAULT NULL,
    INSERT_DT    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UPDATE_DT    DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 인덱스
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_code_code   ON TB_CODE_INFO_NEW(CODE);
  CREATE INDEX IF NOT EXISTS idx_code_pcode  ON TB_CODE_INFO_NEW(PCODE);
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_proj_userid      ON TB_PROJECT_INFO(USERID);
  CREATE INDEX IF NOT EXISTS idx_proj_project_id  ON TB_PROJECT_INFO(PROJECT_ID);
  CREATE INDEX IF NOT EXISTS idx_proj_project_hash ON TB_PROJECT_INFO(PROJECT_HASH);
`);

// 트리거 (UPDATE_DT 자동 갱신)
db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_users_updated
  AFTER UPDATE ON users
  BEGIN UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_code_updated
  AFTER UPDATE ON TB_CODE_INFO_NEW
  BEGIN UPDATE TB_CODE_INFO_NEW SET UPDATE_DT = CURRENT_TIMESTAMP WHERE UID = NEW.UID; END;
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_project_updated
  AFTER UPDATE ON TB_PROJECT_INFO
  BEGIN UPDATE TB_PROJECT_INFO SET UPDATE_DT = CURRENT_TIMESTAMP WHERE UID = NEW.UID; END;
`);

// 초기 users 샘플 데이터
const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
if (userCount.cnt === 0) {
  const ins = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
  db.transaction((rows) => rows.forEach((r) => ins.run(...r)))([
    ['김철수', 'chulsoo@example.com', 28],
    ['이영희', 'younghee@example.com', 32],
    ['박민수', 'minsoo@example.com', 25],
  ]);
}

// ─── 초기 메타 데이터 ─────────────────────────────────────────────────────────
// admin.js의 initialCodeData / initalProjectData 와 동일한 데이터셋

const INITIAL_CODE_DATA = [
  // ── Metabase 루트 ─────────────────────────────────────────────────────────
  {
    UID: 1,
    PID: 0,
    PCODE: '',
    CODE: 'Metabase',
    NAME: 'Metabase',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000001',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },

  // ── Metabase 1단계 자식 ───────────────────────────────────────────────────
  {
    UID: 2,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'DataType',
    NAME: '데이터타입',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000002',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 3,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'Templates',
    NAME: '템플릿',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000003',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 4,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'Attributes',
    NAME: '속성',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000004',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 5,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'Properties',
    NAME: '프로퍼티',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000005',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 50,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'Data',
    NAME: 'Data',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000050',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 51,
    PID: 1,
    PCODE: 'Metabase',
    CODE: 'Apps',
    NAME: 'Apps',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000051',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },

  // ── Attributes > CodeMgmt ────────────────────────────────────────────────
  {
    UID: 6,
    PID: 4,
    PCODE: 'Attributes',
    CODE: 'CodeMgmt',
    NAME: '코드관리',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000006',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 7,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'UID',
    NAME: 'UID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '101',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 8,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'PID',
    NAME: 'PID',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '102',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 9,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'PCODE',
    NAME: '상속',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '103',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 10,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'CODE',
    NAME: '코드',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '104',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 11,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'NAME',
    NAME: '이름',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '105',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 12,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'VALUE',
    NAME: '값',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '106',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 13,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'TYPE',
    NAME: '종류',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '107',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 14,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'FORMORDER',
    NAME: '정렬순서',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '108',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 15,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'DESCRIPTION',
    NAME: '설명',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '109',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 16,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'SHOW_YN',
    NAME: '표시여부',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '110',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 17,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'USE_YN',
    NAME: '사용여부',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '111',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 18,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'DEL_YN',
    NAME: '삭제여부',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '112',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 19,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'INSERT_DT',
    NAME: '등록시간',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '113',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 20,
    PID: 6,
    PCODE: 'CodeMgmt',
    CODE: 'UPDATE_DT',
    NAME: '수정시간',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '114',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },

  // ── Attributes > TableMgmt ───────────────────────────────────────────────
  {
    UID: 21,
    PID: 4,
    PCODE: 'Attributes',
    CODE: 'TableMgmt',
    NAME: '테이블 관리',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000021',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 23,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'SYSTEM_ID',
    NAME: '시스템 ID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '101',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 24,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'SID',
    NAME: '데이터베이스',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '102',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 25,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'TABLE_ID',
    NAME: '테이블 ID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '104',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 26,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'TABLE_NAME_KR',
    NAME: '한글',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '106',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 27,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'DESCRIPTION',
    NAME: '설명',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '107',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 28,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'TABLE_NAME_ENG',
    NAME: '영문',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '105',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 29,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'TABLE_OP_KIND',
    NAME: '업무 분류 코드',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 30,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'TABLE_OP_KIND_NAME',
    NAME: '업무 분류',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '108',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 31,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'KEYAREA_NAME',
    NAME: '',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 32,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'ROWID',
    NAME: 'ROWID',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 33,
    PID: 21,
    PCODE: 'TableMgmt',
    CODE: 'SCHEMA',
    NAME: '카테고리',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '103',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },

  // ── Attributes > ColumnMgmt ──────────────────────────────────────────────
  {
    UID: 22,
    PID: 4,
    PCODE: 'Attributes',
    CODE: 'ColumnMgmt',
    NAME: '컬럼 관리',
    TYPE: 'GROUP',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '1000000022',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 34,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'SYSTEM_ID',
    NAME: '시스템 ID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '099',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 35,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'SID',
    NAME: '데이터베이스',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '100',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 36,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'TABLE_ID',
    NAME: '테이블 ID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '101',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 37,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_ID',
    NAME: '컬럼 ID',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '102',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 38,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_SEQ',
    NAME: '컬럼 순서',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '102',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 39,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_NAME_KR',
    NAME: '한글명',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '105',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 40,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'DESCRIPTION',
    NAME: '설명',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '106',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 41,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'FK_YN',
    NAME: 'FK 여부',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 42,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'PK_YN',
    NAME: 'PK 여부',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '107',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 43,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'NULL_YN',
    NAME: 'NULL 여부',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '108',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 44,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_SIZE',
    NAME: '컬럼 길이',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '109',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 45,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_TYPE',
    NAME: '데이터 타입',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '110',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 46,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'COLUMN_NAME_ENG',
    NAME: '영문명',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '104',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 47,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'TABLE_OWNER',
    NAME: '소유자',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 48,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'AUTO_VALUE',
    NAME: '자동 채우기',
    TYPE: 'CODE',
    SHOW_YN: 'Y',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '111',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
  {
    UID: 49,
    PID: 22,
    PCODE: 'ColumnMgmt',
    CODE: 'ROWID',
    NAME: 'ROWID',
    TYPE: 'CODE',
    SHOW_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    FORMORDER: '999',
    INSERT_DT: '2024-05-09 10:49:45',
    UPDATE_DT: '2025-07-16 03:06:29',
  },
];

const INITIAL_PROJECT_DATA = [
  {
    UID: 1,
    USERID: 'local',
    JOINID: '0000000000000000000',
    PROJECT_ID: '78feeab5-ea98-4970-8166-2edd92f61e8c',
    PROJECT_HASH: '78feeab5ea98497081662edd92f61e8c',
    PROJECT_UUID: 'ecc9-3af0-44fb-a5b5',
    PROJECT_NAME: 'XamongDemo',
    TITLE: '🍊 자몽 종합 데모',
    SUMMARY: '자몽 프레임워크의 모든 기능을 테스트할 수 있는 종합 데모 앱',
    DESCRIPTION: 'AI를 통해 생성된 프로젝트입니다.',
    SAVED: '',
    MOCK_UP_NAME: '',
    RESOLUTION: '800x900',
    FAVORITE_YN: 'N',
    TEMPLATE_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    INSERT_DT: '2025-07-24 04:22:01',
    UPDATE_DT: '2025-11-12 14:25:32',
  },
  {
    UID: 2,
    USERID: 'local',
    JOINID: '0000000000000000000',
    PROJECT_ID: '67e43796-5f92-4e2f-9a51-93ac2d8d73b6',
    PROJECT_HASH: '67e437965f924e2f9a5193ac2d8d73b6',
    PROJECT_UUID: '6321-e1b1-418b-8bad',
    PROJECT_NAME: 'SampleApp',
    TITLE: '🚀 샘플 앱 (데모)',
    SUMMARY: '자몽 프레임워크 기능을 보여주는 샘플 애플리케이션',
    DESCRIPTION: 'AI를 통해 생성된 프로젝트입니다.',
    SAVED: '',
    MOCK_UP_NAME: '',
    RESOLUTION: '800x700',
    FAVORITE_YN: 'N',
    TEMPLATE_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    INSERT_DT: '2025-07-24 08:16:58',
    UPDATE_DT: '2025-11-12 14:25:45',
  },
  {
    UID: 3,
    USERID: 'local',
    JOINID: '0000000000000000000',
    PROJECT_ID: '7c3fb591-c32b-4440-9081-4f5645bd3633',
    PROJECT_HASH: '7c3fb591c32b444090814f5645bd3633',
    PROJECT_UUID: '9c2b4f9b-1d0e-44a8-91fa-a6455d948e67',
    PROJECT_NAME: 'HotelBookingApp',
    TITLE: '🏨 HotelBookingApp',
    SUMMARY: '호텔 예약 앱 — 검색, 탐색, 즐겨찾기, 예약 기능 포함',
    DESCRIPTION: 'AI를 통해 생성된 프로젝트입니다.',
    SAVED: '',
    MOCK_UP_NAME: '',
    RESOLUTION: '375x812',
    FAVORITE_YN: 'N',
    TEMPLATE_YN: 'N',
    USE_YN: 'Y',
    DEL_YN: 'N',
    INSERT_DT: '2025-07-25 09:59:29',
    UPDATE_DT: '2025-11-12 14:26:09',
  },
];

// ── 자동 시드: TB_CODE_INFO_NEW 가 비어있으면 초기 데이터 삽입 ───────────────

function seedCodes() {
  const cnt = db.prepare('SELECT COUNT(*) AS c FROM TB_CODE_INFO_NEW').get().c;
  if (cnt > 0) return 0;

  const ins = db.prepare(`
    INSERT OR IGNORE INTO TB_CODE_INFO_NEW
      (UID,PID,PCODE,CODE,NAME,TYPE,FORMORDER,SHOW_YN,USE_YN,DEL_YN,INSERT_DT,UPDATE_DT)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const run = db.transaction((rows) =>
    rows.forEach((d) =>
      ins.run(
        d.UID,
        d.PID,
        d.PCODE,
        d.CODE,
        d.NAME,
        d.TYPE,
        d.FORMORDER,
        d.SHOW_YN,
        d.USE_YN,
        d.DEL_YN,
        d.INSERT_DT,
        d.UPDATE_DT,
      ),
    ),
  );
  run(INITIAL_CODE_DATA);
  return INITIAL_CODE_DATA.length;
}

function seedProjects() {
  const cnt = db.prepare('SELECT COUNT(*) AS c FROM TB_PROJECT_INFO').get().c;
  if (cnt > 0) return 0;

  const ins = db.prepare(`
    INSERT OR IGNORE INTO TB_PROJECT_INFO
      (UID,USERID,JOINID,PROJECT_ID,PROJECT_HASH,PROJECT_UUID,PROJECT_NAME,TITLE,SUMMARY,DESCRIPTION,SAVED,MOCK_UP_NAME,RESOLUTION,FAVORITE_YN,TEMPLATE_YN,USE_YN,DEL_YN,INSERT_DT,UPDATE_DT)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const run = db.transaction((rows) =>
    rows.forEach((d) =>
      ins.run(
        d.UID,
        d.USERID,
        d.JOINID,
        d.PROJECT_ID,
        d.PROJECT_HASH,
        d.PROJECT_UUID,
        d.PROJECT_NAME,
        d.TITLE,
        d.SUMMARY,
        d.DESCRIPTION,
        d.SAVED,
        d.MOCK_UP_NAME,
        d.RESOLUTION,
        d.FAVORITE_YN,
        d.TEMPLATE_YN,
        d.USE_YN,
        d.DEL_YN,
        d.INSERT_DT,
        d.UPDATE_DT,
      ),
    ),
  );
  run(INITIAL_PROJECT_DATA);
  return INITIAL_PROJECT_DATA.length;
}

// 서버 시작 시 자동 시드
const seededCodes = seedCodes();
const seededProjects = seedProjects();
if (seededCodes > 0 || seededProjects > 0) {
  console.log(`🌱 초기 데이터 삽입: 코드 ${seededCodes}건, 프로젝트 ${seededProjects}건`);
}

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

function timeAgo(dateString) {
  const diffMin = Math.floor((Date.now() - new Date(dateString)) / 60000);
  if (diffMin < 60) return diffMin <= 1 ? 'just now' : `${diffMin} minutes ago`;
  if (diffMin < 1440) {
    const h = Math.floor(diffMin / 60);
    return h === 1 ? '1 hour ago' : `${h} hours ago`;
  }
  if (diffMin < 10080) {
    const d = Math.floor(diffMin / 1440);
    return d === 1 ? '1 day ago' : `${d} days ago`;
  }
  if (diffMin < 43200) {
    const w = Math.floor(diffMin / 10080);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  const m = Math.floor(diffMin / 43200);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

function projectMeta(name = '', desc = '') {
  const n = name.toLowerCase(),
    d = desc.toLowerCase();
  if (n.includes('chat') || d.includes('chat') || d.includes('message'))
    return { icon: '💬', category: 'Communication' };
  if (n.includes('music') || d.includes('music') || d.includes('sound'))
    return { icon: '🎵', category: 'Entertainment' };
  if (n.includes('fitness') || n.includes('workout')) return { icon: '💪', category: 'Health' };
  if (n.includes('food') || n.includes('coffee') || n.includes('shop')) return { icon: '🍔', category: 'Food' };
  if (n.includes('travel') || n.includes('guide')) return { icon: '✈️', category: 'Travel' };
  if (n.includes('money') || n.includes('finance')) return { icon: '💰', category: 'Finance' };
  if (n.includes('education') || n.includes('learn')) return { icon: '📚', category: 'Education' };
  if (n.includes('game') || n.includes('quiz')) return { icon: '🎮', category: 'Entertainment' };
  if (n.includes('weather') || d.includes('weather')) return { icon: '🌤️', category: 'Utility' };
  if (n.includes('mood') || n.includes('emotion') || n.includes('diary')) return { icon: '😊', category: 'Lifestyle' };
  if (n.includes('brain') || n.includes('iq') || n.includes('mbti')) return { icon: '🧠', category: 'Education' };
  return { icon: '📱', category: 'Utility' };
}

// ─── API: 헬스체크 ────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const codeCount = db.prepare('SELECT COUNT(*) AS c FROM TB_CODE_INFO_NEW').get().c;
  const projectCount = db.prepare('SELECT COUNT(*) AS c FROM TB_PROJECT_INFO').get().c;
  res.json({
    success: true,
    status: 'ok',
    version: '1.0.0',
    db: DB_PATH,
    uptime: Math.floor(process.uptime()),
    stats: { codes: codeCount, projects: projectCount },
  });
});

// ─── API: 초기 데이터 ─────────────────────────────────────────────────────────

/**
 * POST /api/init/seed
 * 테이블이 비어있을 때만 초기 데이터를 삽입합니다 (비파괴적).
 */
app.post('/api/init/seed', (_req, res) => {
  try {
    const codes = seedCodes();
    const projects = seedProjects();
    res.json({
      success: true,
      message:
        codes === 0 && projects === 0
          ? '이미 데이터가 존재합니다. 시드가 건너뛰어졌습니다.'
          : `초기 데이터 삽입 완료: 코드 ${codes}건, 프로젝트 ${projects}건`,
      data: { seededCodes: codes, seededProjects: projects },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/init/reset
 * 모든 코드·프로젝트 데이터를 삭제하고 초기 데이터로 재구축합니다.
 * (users 테이블은 건드리지 않습니다)
 */
app.post('/api/init/reset', (_req, res) => {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM TB_CODE_INFO_NEW').run();
      db.prepare('DELETE FROM TB_PROJECT_INFO').run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('TB_CODE_INFO_NEW','TB_PROJECT_INFO')").run();
    })();

    const insCode = db.prepare(`
      INSERT OR IGNORE INTO TB_CODE_INFO_NEW
        (UID,PID,PCODE,CODE,NAME,TYPE,FORMORDER,SHOW_YN,USE_YN,DEL_YN,INSERT_DT,UPDATE_DT)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    db.transaction((rows) =>
      rows.forEach((d) =>
        insCode.run(
          d.UID,
          d.PID,
          d.PCODE,
          d.CODE,
          d.NAME,
          d.TYPE,
          d.FORMORDER,
          d.SHOW_YN,
          d.USE_YN,
          d.DEL_YN,
          d.INSERT_DT,
          d.UPDATE_DT,
        ),
      ),
    )(INITIAL_CODE_DATA);

    const insProj = db.prepare(`
      INSERT OR IGNORE INTO TB_PROJECT_INFO
        (UID,USERID,JOINID,PROJECT_ID,PROJECT_HASH,PROJECT_UUID,PROJECT_NAME,TITLE,SUMMARY,DESCRIPTION,SAVED,MOCK_UP_NAME,RESOLUTION,FAVORITE_YN,TEMPLATE_YN,USE_YN,DEL_YN,INSERT_DT,UPDATE_DT)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    db.transaction((rows) =>
      rows.forEach((d) =>
        insProj.run(
          d.UID,
          d.USERID,
          d.JOINID,
          d.PROJECT_ID,
          d.PROJECT_HASH,
          d.PROJECT_UUID,
          d.PROJECT_NAME,
          d.TITLE,
          d.SUMMARY,
          d.DESCRIPTION,
          d.SAVED,
          d.MOCK_UP_NAME,
          d.RESOLUTION,
          d.FAVORITE_YN,
          d.TEMPLATE_YN,
          d.USE_YN,
          d.DEL_YN,
          d.INSERT_DT,
          d.UPDATE_DT,
        ),
      ),
    )(INITIAL_PROJECT_DATA);

    res.json({
      success: true,
      message: `데이터 초기화 완료: 코드 ${INITIAL_CODE_DATA.length}건, 프로젝트 ${INITIAL_PROJECT_DATA.length}건`,
      data: { codes: INITIAL_CODE_DATA.length, projects: INITIAL_PROJECT_DATA.length },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: users ───────────────────────────────────────────────────────────────

app.get('/api/users', (_req, res) => {
  try {
    res.json({ success: true, data: db.prepare('SELECT * FROM users ORDER BY id DESC').all() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (row) res.json({ success: true, data: row });
    else res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email, age } = req.body;
    const r = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)').run(name, email, age);
    res
      .status(201)
      .json({ success: true, data: db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { name, email, age } = req.body;
    const r = db.prepare('UPDATE users SET name=?, email=?, age=? WHERE id=?').run(name, email, age, req.params.id);
    if (r.changes > 0)
      res.json({ success: true, data: db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id) });
    else res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const r = db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
    if (r.changes > 0) res.json({ success: true, message: '삭제되었습니다.' });
    else res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/stats', (_req, res) => {
  try {
    const stat = fs.statSync(DB_PATH);
    res.json({
      success: true,
      data: {
        totalUsers: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
        averageAge: db.prepare('SELECT AVG(age) AS a FROM users').get().a,
        dbSize: stat.size,
        lastModified: stat.mtime,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: TB_CODE_INFO_NEW ────────────────────────────────────────────────────

// 순서 중요: /api/codes/tree, /api/codes/attributes, /api/codes/batch,
//            /api/codes/init-codes 를 /api/codes/:uid 보다 먼저 등록해야 충돌 방지

app.get('/api/codes/tree', (_req, res) => {
  try {
    const allNodes = db
      .prepare(`
      SELECT * FROM TB_CODE_INFO_NEW
      WHERE TYPE IN ('GROUP','TABLE') AND DEL_YN = 'N'
      ORDER BY FORMORDER, UID
    `)
      .all();

    function buildChildren(nodes, pid) {
      return nodes.filter((n) => n.PID === pid).map((n) => ({ ...n, children: buildChildren(nodes, n.UID) }));
    }

    const roots = allNodes.filter((n) => !n.PCODE || n.PCODE === '');
    const tree = roots.map((r) => ({ ...r, children: buildChildren(allNodes, r.UID) }));
    res.json({ success: true, data: tree });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/** TYPE = ATTR 인 코드 목록 전체 (원본 fetchAttributes 호환) */
app.get('/api/codes/attributes', (_req, res) => {
  try {
    const rows = db
      .prepare(`
      SELECT * FROM TB_CODE_INFO_NEW WHERE TYPE='ATTR' AND DEL_YN='N' ORDER BY FORMORDER, UID
    `)
      .all();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const CODE_IMPORT_FIELDS = [
  'PID',
  'PCODE',
  'AID',
  'ACODE',
  'CODE',
  'NAME',
  'VALUE',
  'TYPE',
  'FORMORDER',
  'DESCRIPTION',
  'SHOW_YN',
  'CID',
  'RID',
  'RIX',
  'TARGET',
  'RESERVE',
  'RESERV1',
  'RESERV2',
  'RESERV3',
  'USE_YN',
  'TTSHINT',
];

const CODE_IMPORT_UPDATE_FIELDS = [
  'NAME',
  'VALUE',
  'FORMORDER',
  'DESCRIPTION',
  'SHOW_YN',
  'TARGET',
  'RESERVE',
  'RESERV1',
  'RESERV2',
  'RESERV3',
  'USE_YN',
  'TTSHINT',
];

function cleanImportCodeRow(row) {
  const item = {};
  for (const key of CODE_IMPORT_FIELDS) {
    if (row[key] !== undefined) item[key] = row[key];
  }
  item.PID = item.PID ?? 0;
  item.PCODE = item.PCODE ?? '';
  item.SHOW_YN = item.SHOW_YN ?? 'N';
  item.USE_YN = item.USE_YN ?? 'Y';
  return item;
}

function runImportInsert(ins, row) {
  const item = cleanImportCodeRow(row);
  return ins.run(
    item.PID,
    item.PCODE,
    item.AID,
    item.ACODE,
    item.CODE,
    item.NAME,
    item.VALUE,
    item.TYPE,
    item.FORMORDER,
    item.DESCRIPTION,
    item.SHOW_YN,
    item.CID,
    item.RID,
    item.RIX,
    item.TARGET,
    item.RESERVE,
    item.RESERV1,
    item.RESERV2,
    item.RESERV3,
    item.USE_YN,
    item.TTSHINT,
  ).lastInsertRowid;
}

function runImportUpdate(upd, row, existing) {
  const values = CODE_IMPORT_UPDATE_FIELDS.map((key) => (Object.hasOwn(row, key) ? row[key] : existing[key]));
  upd.run(...values, existing.UID);
}

function normalizeImportCompareValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function buildImportUpdateChanges(row, existing) {
  return CODE_IMPORT_UPDATE_FIELDS.filter((key) => Object.hasOwn(row, key))
    .map((key) => ({
      field: key,
      before: normalizeImportCompareValue(existing[key]),
      after: normalizeImportCompareValue(row[key]),
    }))
    .filter((change) => change.before !== change.after);
}

function asImportArray(value) {
  return Array.isArray(value) ? value : [];
}

function getImportConflictPolicy(options = {}) {
  return options.conflictPolicy === 'merge' || options.conflictPolicy === 'update' ? options.conflictPolicy : 'insert';
}

function getImportContext(snapshot, target = {}) {
  if (!snapshot || snapshot.version !== 'xd-meta-xmdb-assist/v1') {
    throw new Error('Unsupported import snapshot.');
  }

  const selectedNode = snapshot.selectedNode || null;
  const templates = asImportArray(snapshot.templates);
  const attributes = asImportArray(snapshot.attributes);
  const instances = asImportArray(snapshot.instances);
  const formFields = asImportArray(snapshot.formFields);
  const targetPid = Number(target.PID ?? target.UID ?? 0) || 0;
  const targetPcode = String(target.PCODE ?? target.CODE ?? '');
  const templateByUid = new Map(templates.filter((row) => row.UID).map((row) => [String(row.UID), row]));
  const attributeByCode = new Map(attributes.filter((row) => row.CODE).map((row) => [String(row.CODE), row]));
  return {
    selectedNode,
    templates,
    attributes,
    instances,
    formFields,
    targetPid,
    targetPcode,
    templateByUid,
    attributeByCode,
  };
}

function getDirectImportTemplateRows(selectedNode, templates, templateByUid) {
  return templates.filter((row) => {
    const uid = row.UID ? String(row.UID) : '';
    const pid = row.PID ? String(row.PID) : '';
    const isRoot = selectedNode?.UID && uid === String(selectedNode.UID);
    const parentKnownInSnapshot = pid && templateByUid.has(pid);
    return isRoot || !parentKnownInSnapshot;
  });
}

function detectImportConflicts(snapshot, target = {}) {
  const { selectedNode, templates, targetPid, templateByUid } = getImportContext(snapshot, target);
  const directRows = getDirectImportTemplateRows(selectedNode, templates, templateByUid);
  const findExisting = db.prepare(`
    SELECT UID,CODE,TYPE,NAME
    FROM TB_CODE_INFO_NEW
    WHERE PID=? AND CODE=? AND COALESCE(TYPE,'')=? AND DEL_YN='N'
    LIMIT 1
  `);
  const conflicts = [];
  for (const row of directRows) {
    if (!row.CODE) continue;
    const type = String(row.TYPE ?? '');
    const existing = findExisting.get(targetPid, String(row.CODE), type);
    if (!existing) continue;
    conflicts.push({
      PID: targetPid,
      CODE: row.CODE,
      TYPE: row.TYPE ?? '',
      existingUID: existing.UID,
      message: `Target already contains ${row.TYPE || 'row'} ${row.CODE}.`,
    });
  }
  return conflicts;
}

function createImportExistingLookup() {
  const findExisting = db.prepare(`
    SELECT *
    FROM TB_CODE_INFO_NEW
    WHERE PID=? AND CODE=? AND COALESCE(TYPE,'')=? AND DEL_YN='N'
    LIMIT 1
  `);
  return (row) => {
    const pid = Number(row.PID ?? 0);
    if (!Number.isFinite(pid) || !row.CODE) return null;
    return findExisting.get(pid, String(row.CODE), String(row.TYPE ?? ''));
  };
}

function makeImportConflict(row, existing, resolution = 'insert') {
  const resolved = resolution !== 'insert';
  const verb = resolution === 'update' ? 'updated' : 'reused';
  const changes = resolution === 'update' ? buildImportUpdateChanges(row, existing) : [];
  return {
    PID: row.PID,
    CODE: row.CODE,
    TYPE: row.TYPE ?? '',
    sourceUID: row.UID,
    existingUID: existing.UID,
    resolved,
    resolution,
    changedFields: changes.length,
    changes,
    message: resolved
      ? changes.length
        ? `Existing ${row.TYPE || 'row'} ${row.CODE} will be ${verb} (${changes.length} fields).`
        : `Existing ${row.TYPE || 'row'} ${row.CODE} will be ${verb}.`
      : `Target already contains ${row.TYPE || 'row'} ${row.CODE}.`,
  };
}

function previewImportCodeSnapshot(snapshot, target = {}, options = {}) {
  const { selectedNode, templates, attributes, instances, formFields, targetPid, targetPcode, templateByUid } =
    getImportContext(snapshot, target);
  const conflictPolicy = getImportConflictPolicy(options);
  const uidMap = {};
  const warnings = [];
  const conflicts = [];
  const findExisting = createImportExistingLookup();
  let insertedTemplates = 0;
  let insertedAttributes = 0;
  let insertedInstances = 0;
  let skippedAttributes = 0;
  let reusedConflicts = 0;
  let updatedConflicts = 0;
  let changedRows = 0;
  let changedFields = 0;

  const pending = [...templates];
  let guard = 0;
  while (pending.length && guard++ < templates.length + 5) {
    let progressed = false;
    for (let i = 0; i < pending.length; i++) {
      const row = pending[i];
      const uid = row.UID ? String(row.UID) : '';
      const pid = row.PID ? String(row.PID) : '';
      const isRoot = selectedNode?.UID && uid === String(selectedNode.UID);
      const parentKnownInSnapshot = pid && templateByUid.has(pid);
      if (!isRoot && parentKnownInSnapshot && !uidMap[pid]) continue;

      const item = cleanImportCodeRow(row);
      if (isRoot || !parentKnownInSnapshot) {
        item.PID = targetPid;
        item.PCODE = targetPcode;
      } else {
        const parent = templateByUid.get(pid);
        item.PID = uidMap[pid];
        item.PCODE = parent?.CODE ?? item.PCODE ?? '';
      }
      const existing = findExisting(item);
      if (existing) {
        const resolution = conflictPolicy === 'update' ? 'update' : conflictPolicy === 'merge' ? 'merge' : 'insert';
        const conflict = makeImportConflict({ ...item, UID: row.UID }, existing, resolution);
        conflicts.push(conflict);
        if (resolution !== 'insert') {
          if (uid) uidMap[uid] = existing.UID;
          reusedConflicts++;
          if (resolution === 'update') {
            updatedConflicts++;
            if (conflict.changedFields) {
              changedRows++;
              changedFields += conflict.changedFields;
            }
          }
          pending.splice(i, 1);
          i--;
          progressed = true;
          continue;
        }
      }
      insertedTemplates++;
      if (uid) uidMap[uid] = `DRY_RUN_${insertedTemplates}`;
      pending.splice(i, 1);
      i--;
      progressed = true;
    }
    if (!progressed) break;
  }

  if (pending.length) {
    warnings.push(`${pending.length} template rows were skipped because their parents could not be mapped.`);
  }

  for (const row of attributes) {
    const pid = row.PID ? String(row.PID) : '';
    if (!pid || !uidMap[pid]) {
      skippedAttributes++;
      continue;
    }
    const item = cleanImportCodeRow(row);
    item.PID = uidMap[pid];
    const existing = findExisting(item);
    if (existing) {
      const resolution = conflictPolicy === 'update' ? 'update' : conflictPolicy === 'merge' ? 'merge' : 'insert';
      const conflict = makeImportConflict({ ...item, UID: row.UID }, existing, resolution);
      conflicts.push(conflict);
      if (resolution !== 'insert') {
        reusedConflicts++;
        if (resolution === 'update') {
          updatedConflicts++;
          if (conflict.changedFields) {
            changedRows++;
            changedFields += conflict.changedFields;
          }
        }
        if (row.UID) uidMap[String(row.UID)] = existing.UID;
        continue;
      }
    }
    insertedAttributes++;
    if (row.UID) uidMap[String(row.UID)] = `DRY_RUN_ATTR_${insertedAttributes}`;
  }

  for (const row of instances) {
    if (row.CODE || row.TYPE) {
      insertedInstances++;
      continue;
    }
    let wroteRowId = false;
    for (const field of formFields) {
      if (!(field.code in row)) continue;
      if (field.code === 'ROWID') wroteRowId = true;
      insertedInstances++;
    }
    if (!wroteRowId) insertedInstances++;
  }

  if (skippedAttributes) {
    warnings.push(
      `${skippedAttributes} attribute rows were skipped because their parent schema nodes were not part of the snapshot.`,
    );
  }
  if (selectedNode?.AID && !uidMap[String(selectedNode.AID)]) {
    warnings.push('AID/ACODE references were preserved where the referenced attribute group was not imported.');
  }

  if (conflicts.some((conflict) => conflict.resolved !== true)) {
    warnings.push(`${conflicts.length} target conflicts were detected. Review them before applying the import.`);
  }

  return {
    dryRun: true,
    conflictPolicy,
    inserted: insertedTemplates + insertedAttributes + insertedInstances,
    insertedTemplates,
    insertedAttributes,
    insertedInstances,
    skippedAttributes,
    reusedConflicts,
    updatedConflicts,
    changedRows,
    changedFields,
    conflicts,
    warnings,
  };
}

function importCodeSnapshot(snapshot, target = {}, options = {}) {
  if (options.dryRun) {
    return previewImportCodeSnapshot(snapshot, target, options);
  }

  const {
    selectedNode,
    templates,
    attributes,
    instances,
    formFields,
    targetPid,
    targetPcode,
    templateByUid,
    attributeByCode,
  } = getImportContext(snapshot, target);
  const conflictPolicy = getImportConflictPolicy(options);
  const uidMap = {};
  const warnings = [];
  const conflicts = [];
  const findExisting = createImportExistingLookup();

  const ins = db.prepare(`
    INSERT INTO TB_CODE_INFO_NEW
      (PID,PCODE,AID,ACODE,CODE,NAME,VALUE,TYPE,FORMORDER,DESCRIPTION,SHOW_YN,CID,RID,RIX,TARGET,RESERVE,RESERV1,RESERV2,RESERV3,USE_YN,TTSHINT)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const upd = db.prepare(`
    UPDATE TB_CODE_INFO_NEW SET
      NAME=?,VALUE=?,FORMORDER=?,DESCRIPTION=?,SHOW_YN=?,TARGET=?,RESERVE=?,RESERV1=?,RESERV2=?,RESERV3=?,USE_YN=?,TTSHINT=?
    WHERE UID=?
  `);

  let insertedTemplates = 0;
  let insertedAttributes = 0;
  let insertedInstances = 0;
  let skippedAttributes = 0;
  let reusedConflicts = 0;
  let updatedConflicts = 0;
  let changedRows = 0;
  let changedFields = 0;

  const tx = db.transaction(() => {
    const pending = [...templates];
    let guard = 0;
    while (pending.length && guard++ < templates.length + 5) {
      let progressed = false;
      for (let i = 0; i < pending.length; i++) {
        const row = pending[i];
        const uid = row.UID ? String(row.UID) : '';
        const pid = row.PID ? String(row.PID) : '';
        const isRoot = selectedNode?.UID && uid === String(selectedNode.UID);
        const parentKnownInSnapshot = pid && templateByUid.has(pid);
        if (!isRoot && parentKnownInSnapshot && !uidMap[pid]) continue;

        const item = cleanImportCodeRow(row);
        if (isRoot || !parentKnownInSnapshot) {
          item.PID = targetPid;
          item.PCODE = targetPcode;
        } else {
          const parent = templateByUid.get(pid);
          item.PID = uidMap[pid];
          item.PCODE = parent?.CODE ?? item.PCODE ?? '';
        }
        if (item.AID && uidMap[String(item.AID)]) item.AID = uidMap[String(item.AID)];
        if (item.CID && uidMap[String(item.CID)]) item.CID = uidMap[String(item.CID)];
        if (conflictPolicy === 'merge' || conflictPolicy === 'update') {
          const existing = findExisting(item);
          if (existing) {
            const conflict = makeImportConflict({ ...item, UID: row.UID }, existing, conflictPolicy);
            conflicts.push(conflict);
            if (conflictPolicy === 'update') {
              updatedConflicts++;
              if (conflict.changedFields) {
                runImportUpdate(upd, row, existing);
                changedRows++;
                changedFields += conflict.changedFields;
              }
            }
            if (uid) uidMap[uid] = existing.UID;
            reusedConflicts++;
            pending.splice(i, 1);
            i--;
            progressed = true;
            continue;
          }
        }
        const newUid = runImportInsert(ins, item);
        if (uid) uidMap[uid] = newUid;
        insertedTemplates++;
        pending.splice(i, 1);
        i--;
        progressed = true;
      }
      if (!progressed) break;
    }

    if (pending.length) {
      warnings.push(`${pending.length} template rows were skipped because their parents could not be mapped.`);
    }

    for (const row of attributes) {
      const pid = row.PID ? String(row.PID) : '';
      if (!pid || !uidMap[pid]) {
        skippedAttributes++;
        continue;
      }
      const item = cleanImportCodeRow(row);
      item.PID = uidMap[pid];
      if (item.AID && uidMap[String(item.AID)]) item.AID = uidMap[String(item.AID)];
      if (item.CID && uidMap[String(item.CID)]) item.CID = uidMap[String(item.CID)];
      if (conflictPolicy === 'merge' || conflictPolicy === 'update') {
        const existing = findExisting(item);
        if (existing) {
          const conflict = makeImportConflict({ ...item, UID: row.UID }, existing, conflictPolicy);
          conflicts.push(conflict);
          if (conflictPolicy === 'update') {
            updatedConflicts++;
            if (conflict.changedFields) {
              runImportUpdate(upd, row, existing);
              changedRows++;
              changedFields += conflict.changedFields;
            }
          }
          if (row.UID) uidMap[String(row.UID)] = existing.UID;
          reusedConflicts++;
          continue;
        }
      }
      const newUid = runImportInsert(ins, item);
      if (row.UID) uidMap[String(row.UID)] = newUid;
      insertedAttributes++;
    }

    const selectedUid = selectedNode?.UID ? String(selectedNode.UID) : '';
    const clonedRootUid = selectedUid ? uidMap[selectedUid] : null;
    const clonedRootCode = selectedNode?.CODE ?? targetPcode;
    for (const row of instances) {
      if (row.CODE || row.TYPE) {
        const item = cleanImportCodeRow(row);
        const pid = item.PID ? String(item.PID) : '';
        if (pid && uidMap[pid]) {
          item.PID = uidMap[pid];
          item.PCODE = templateByUid.get(pid)?.CODE ?? item.PCODE ?? '';
        } else if (clonedRootUid) {
          item.PID = clonedRootUid;
          item.PCODE = clonedRootCode;
        } else {
          item.PID = targetPid;
          item.PCODE = targetPcode;
        }
        if (item.AID && uidMap[String(item.AID)]) item.AID = uidMap[String(item.AID)];
        if (item.CID && uidMap[String(item.CID)]) item.CID = uidMap[String(item.CID)];
        runImportInsert(ins, item);
        insertedInstances++;
        continue;
      }

      const rid = row.RID || `IMPORT_${Date.now()}_${insertedInstances}`;
      let wroteRowId = false;
      for (const field of formFields) {
        if (!(field.code in row)) continue;
        if (field.code === 'ROWID') wroteRowId = true;
        const attr = attributeByCode.get(String(field.code));
        const item = {
          PID: clonedRootUid ?? targetPid,
          PCODE: clonedRootUid ? clonedRootCode : targetPcode,
          AID: selectedNode?.AID,
          ACODE: selectedNode?.ACODE,
          CODE: field.code,
          NAME: attr?.NAME ?? field.label,
          VALUE: row[field.code],
          TYPE: 'DATA',
          FORMORDER: attr?.FORMORDER ?? '',
          CID: attr?.UID && uidMap[String(attr.UID)] ? uidMap[String(attr.UID)] : attr?.UID,
          RID: rid,
          RIX: row.RIX ?? 0,
          SHOW_YN: 'N',
          USE_YN: 'Y',
        };
        runImportInsert(ins, item);
        insertedInstances++;
      }
      if (!wroteRowId) {
        runImportInsert(ins, {
          PID: clonedRootUid ?? targetPid,
          PCODE: clonedRootUid ? clonedRootCode : targetPcode,
          AID: selectedNode?.AID,
          ACODE: selectedNode?.ACODE,
          CODE: 'ROWID',
          NAME: 'ROWID',
          VALUE: rid,
          TYPE: 'DATA',
          RID: rid,
          RIX: row.RIX ?? 0,
          SHOW_YN: 'N',
          USE_YN: 'Y',
        });
        insertedInstances++;
      }
    }
  });

  tx();
  if (skippedAttributes) {
    warnings.push(
      `${skippedAttributes} attribute rows were skipped because their parent schema nodes were not part of the snapshot.`,
    );
  }
  if (selectedNode?.AID && !uidMap[String(selectedNode.AID)]) {
    warnings.push('AID/ACODE references were preserved where the referenced attribute group was not imported.');
  }

  return {
    conflictPolicy,
    inserted: insertedTemplates + insertedAttributes + insertedInstances,
    insertedTemplates,
    insertedAttributes,
    insertedInstances,
    skippedAttributes,
    reusedConflicts,
    updatedConflicts,
    changedRows,
    changedFields,
    conflicts,
    uidMap,
    warnings,
  };
}

app.post('/api/codes/import-snapshot', (req, res) => {
  try {
    const result = importCodeSnapshot(req.body?.snapshot, req.body?.target, {
      dryRun: req.body?.dryRun === true,
      conflictPolicy: req.body?.conflictPolicy,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/codes/batch', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ success: false, error: '유효하지 않은 데이터입니다.' });

  const ins = db.prepare(`
    INSERT INTO TB_CODE_INFO_NEW
      (PID,PCODE,AID,ACODE,CODE,NAME,VALUE,TYPE,FORMORDER,DESCRIPTION,SHOW_YN,CID,RID,RIX,TARGET,RESERVE,RESERV1,RESERV2,RESERV3,USE_YN,TTSHINT)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const upd = db.prepare(`
    UPDATE TB_CODE_INFO_NEW SET
      PID=?,PCODE=?,AID=?,ACODE=?,CODE=?,NAME=?,VALUE=?,TYPE=?,FORMORDER=?,DESCRIPTION=?,SHOW_YN=?,CID=?,RID=?,RIX=?,TARGET=?,RESERVE=?,RESERV1=?,RESERV2=?,RESERV3=?,USE_YN=?,TTSHINT=?
    WHERE UID=?
  `);
  const del = db.prepare('UPDATE TB_CODE_INFO_NEW SET DEL_YN=? WHERE UID=?');

  const run = db.transaction((list) =>
    list.map((item) => {
      if (item._deleted) {
        del.run('Y', item.UID);
        return { UID: item.UID, action: 'deleted' };
      }
      const p = [
        item.PID ?? 0,
        item.PCODE ?? '',
        item.AID,
        item.ACODE,
        item.CODE,
        item.NAME,
        item.VALUE,
        item.TYPE,
        item.FORMORDER,
        item.DESCRIPTION,
        item.SHOW_YN ?? 'N',
        item.CID,
        item.RID,
        item.RIX,
        item.TARGET,
        item.RESERVE,
        item.RESERV1,
        item.RESERV2,
        item.RESERV3,
        item.USE_YN ?? 'Y',
        item.TTSHINT,
      ];
      if (item.UID) {
        upd.run(...p, item.UID);
        return { UID: item.UID, action: 'updated' };
      }
      return { UID: ins.run(...p).lastInsertRowid, action: 'inserted' };
    }),
  );

  try {
    res.json({ success: true, data: run(items) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/codes/init-codes', (_req, res) => {
  try {
    db.prepare('UPDATE TB_CODE_INFO_NEW SET DEL_YN=? WHERE DEL_YN=?').run('Y', 'N');
    res.json({ success: true, message: '코드 정보가 초기화되었습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/codes', (req, res) => {
  try {
    let sql = `SELECT * FROM TB_CODE_INFO_NEW WHERE DEL_YN='N'`;
    const params = [];
    if (req.query.PCODE !== undefined) {
      if (req.query.PCODE === '') sql += ` AND (PCODE IS NULL OR PCODE='')`;
      else {
        sql += ' AND PCODE=?';
        params.push(req.query.PCODE);
      }
    }
    if (req.query.PID !== undefined) {
      sql += ' AND PID=?';
      params.push(req.query.PID);
    }
    if (req.query.TYPE) {
      const types = req.query.TYPE.split(',');
      sql += ` AND TYPE IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }
    if (req.query.CODE) {
      sql += ' AND CODE LIKE ?';
      params.push(`%${req.query.CODE}%`);
    }
    if (req.query.RID) {
      sql += ' AND RID=?';
      params.push(req.query.RID);
    }
    if (req.query.USE_YN) {
      sql += ' AND USE_YN=?';
      params.push(req.query.USE_YN);
    }
    sql += ' ORDER BY FORMORDER, UID';
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/codes/:uid', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM TB_CODE_INFO_NEW WHERE UID=?').get(req.params.uid);
    if (row) res.json({ success: true, data: row });
    else res.status(404).json({ success: false, error: '코드를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/codes', (req, res) => {
  try {
    const {
      PID = 0,
      PCODE = '',
      AID = null,
      ACODE = null,
      CODE = null,
      NAME = null,
      VALUE = null,
      TYPE = null,
      FORMORDER = null,
      DESCRIPTION = null,
      SHOW_YN = 'N',
      CID = null,
      RID = null,
      RIX = null,
      TARGET = null,
      RESERVE = null,
      RESERV1 = null,
      RESERV2 = null,
      RESERV3 = null,
      USE_YN = 'Y',
      TTSHINT = null,
    } = req.body;
    let fo = FORMORDER;
    if (!fo) {
      const mx = db.prepare('SELECT MAX(CAST(FORMORDER AS INTEGER)) AS m FROM TB_CODE_INFO_NEW WHERE PID=?').get(PID);
      fo = String((mx?.m || 0) + 1000);
    }
    const r = db
      .prepare(`
      INSERT INTO TB_CODE_INFO_NEW
        (PID,PCODE,AID,ACODE,CODE,NAME,VALUE,TYPE,FORMORDER,DESCRIPTION,SHOW_YN,CID,RID,RIX,TARGET,RESERVE,RESERV1,RESERV2,RESERV3,USE_YN,TTSHINT)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
      .run(
        PID,
        PCODE,
        AID,
        ACODE,
        CODE,
        NAME,
        VALUE,
        TYPE,
        fo,
        DESCRIPTION,
        SHOW_YN,
        CID,
        RID,
        RIX,
        TARGET,
        RESERVE,
        RESERV1,
        RESERV2,
        RESERV3,
        USE_YN,
        TTSHINT,
      );
    res
      .status(201)
      .json({ success: true, data: db.prepare('SELECT * FROM TB_CODE_INFO_NEW WHERE UID=?').get(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/codes/:uid', (req, res) => {
  try {
    const {
      PID,
      PCODE,
      AID,
      ACODE,
      CODE,
      NAME,
      VALUE,
      TYPE,
      FORMORDER,
      DESCRIPTION,
      SHOW_YN,
      CID,
      RID,
      RIX,
      TARGET,
      RESERVE,
      RESERV1,
      RESERV2,
      RESERV3,
      USE_YN,
      TTSHINT,
    } = req.body;
    const r = db
      .prepare(`
      UPDATE TB_CODE_INFO_NEW SET
        PID=?,PCODE=?,AID=?,ACODE=?,CODE=?,NAME=?,VALUE=?,TYPE=?,FORMORDER=?,DESCRIPTION=?,SHOW_YN=?,CID=?,RID=?,RIX=?,TARGET=?,RESERVE=?,RESERV1=?,RESERV2=?,RESERV3=?,USE_YN=?,TTSHINT=?
      WHERE UID=?
    `)
      .run(
        PID,
        PCODE,
        AID,
        ACODE,
        CODE,
        NAME,
        VALUE,
        TYPE,
        FORMORDER,
        DESCRIPTION,
        SHOW_YN,
        CID,
        RID,
        RIX,
        TARGET,
        RESERVE,
        RESERV1,
        RESERV2,
        RESERV3,
        USE_YN,
        TTSHINT,
        req.params.uid,
      );
    if (r.changes > 0)
      res.json({ success: true, data: db.prepare('SELECT * FROM TB_CODE_INFO_NEW WHERE UID=?').get(req.params.uid) });
    else res.status(404).json({ success: false, error: '코드를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/codes/:uid', (req, res) => {
  try {
    const r = db.prepare('UPDATE TB_CODE_INFO_NEW SET DEL_YN=? WHERE UID=?').run('Y', req.params.uid);
    if (r.changes > 0) res.json({ success: true, message: '코드가 삭제되었습니다.' });
    else res.status(404).json({ success: false, error: '코드를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: TB_PROJECT_INFO ─────────────────────────────────────────────────────

const PROJECT_SELECT_COLS = `UID,USERID,PROJECT_ID,PROJECT_NAME,TITLE,SUMMARY,DESCRIPTION,INSERT_DT,UPDATE_DT,FAVORITE_YN`;

app.get('/api/projects/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userid = req.query.userid || '1617413272651422781';
    const rows = db
      .prepare(`
      SELECT ${PROJECT_SELECT_COLS} FROM TB_PROJECT_INFO
      WHERE DEL_YN='N' AND USE_YN='Y' AND USERID=?
      ORDER BY UPDATE_DT DESC, INSERT_DT DESC LIMIT ?
    `)
      .all(userid, limit);
    res.json({
      success: true,
      data: rows.map((p) => ({
        id: p.PROJECT_ID,
        name: p.PROJECT_NAME || p.TITLE || `Project_${p.PROJECT_ID?.substring(0, 8)}`,
        timeAgo: timeAgo(p.UPDATE_DT || p.INSERT_DT),
        icon: projectMeta(p.PROJECT_NAME, p.DESCRIPTION).icon,
        isPrivate: true,
        projectId: p.PROJECT_ID,
        description: p.DESCRIPTION || p.SUMMARY || 'No description',
        lastModified: p.UPDATE_DT || p.INSERT_DT,
      })),
      count: rows.length,
      userid,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/projects/all', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const category = req.query.category || 'All';
    const search = req.query.search || '';
    const userid = req.query.userid || '1617413272651422781';

    let sql = `SELECT ${PROJECT_SELECT_COLS} FROM TB_PROJECT_INFO WHERE DEL_YN='N' AND USE_YN='Y' AND USERID=?`;
    const params = [userid];
    if (search) {
      sql += ' AND (PROJECT_NAME LIKE ? OR TITLE LIKE ? OR DESCRIPTION LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY UPDATE_DT DESC, INSERT_DT DESC LIMIT ?';
    params.push(limit);

    let rows = db
      .prepare(sql)
      .all(...params)
      .map((p) => {
        const meta = projectMeta(p.PROJECT_NAME, p.DESCRIPTION);
        return {
          id: p.PROJECT_ID,
          name: p.PROJECT_NAME || p.TITLE || `Project_${p.PROJECT_ID?.substring(0, 8)}`,
          timeAgo: timeAgo(p.UPDATE_DT || p.INSERT_DT),
          icon: meta.icon,
          isPrivate: true,
          isStarred: p.FAVORITE_YN === 'Y',
          category: meta.category,
          lastModified: p.UPDATE_DT || p.INSERT_DT,
          description: p.DESCRIPTION || p.SUMMARY || 'No description',
          projectId: p.PROJECT_ID,
        };
      });
    if (category !== 'All') rows = rows.filter((r) => r.category === category);
    res.json({ success: true, data: rows, count: rows.length, userid });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/projects/by-project-id/:projectId', (req, res) => {
  try {
    const row = db
      .prepare('SELECT * FROM TB_PROJECT_INFO WHERE PROJECT_ID=? AND DEL_YN=?')
      .get(req.params.projectId, 'N');
    if (row) res.json({ success: true, data: row });
    else res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/projects', (req, res) => {
  try {
    let sql = `SELECT * FROM TB_PROJECT_INFO WHERE DEL_YN='N'`;
    const params = [];
    if (req.query.USERID) {
      sql += ' AND USERID=?';
      params.push(req.query.USERID);
    }
    if (req.query.PROJECT_ID || req.query.projectId) {
      sql += ' AND PROJECT_ID=?';
      params.push(req.query.PROJECT_ID || req.query.projectId);
    }
    if (req.query.PROJECT_HASH) {
      sql += ' AND PROJECT_HASH=?';
      params.push(req.query.PROJECT_HASH);
    }
    if (req.query.PROJECT_UUID) {
      sql += ' AND PROJECT_UUID=?';
      params.push(req.query.PROJECT_UUID);
    }
    if (req.query.PROJECT_NAME) {
      sql += ' AND PROJECT_NAME=?';
      params.push(req.query.PROJECT_NAME);
    }
    if (req.query.TITLE) {
      sql += ' AND TITLE LIKE ?';
      params.push(`%${req.query.TITLE}%`);
    }
    if (req.query.FAVORITE_YN) {
      sql += ' AND FAVORITE_YN=?';
      params.push(req.query.FAVORITE_YN);
    }
    if (req.query.TEMPLATE_YN) {
      sql += ' AND TEMPLATE_YN=?';
      params.push(req.query.TEMPLATE_YN);
    }
    if (req.query.USE_YN) {
      sql += ' AND USE_YN=?';
      params.push(req.query.USE_YN);
    }
    sql += ' ORDER BY INSERT_DT DESC';
    res.json({ success: true, data: db.prepare(sql).all(...params) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/projects/:uid', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM TB_PROJECT_INFO WHERE UID=?').get(req.params.uid);
    if (row) res.json({ success: true, data: row });
    else res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    // PROJECT_UUID 중복 확인
    if (req.body.PROJECT_UUID) {
      const existing = db.prepare('SELECT * FROM TB_PROJECT_INFO WHERE PROJECT_UUID=?').get(req.body.PROJECT_UUID);
      if (existing) return res.json({ success: true, data: existing });
    }
    const {
      USERID,
      USER_HASH = null,
      JOINID,
      PROJECT_ID = null,
      PROJECT_HASH = null,
      PROJECT_UUID = null,
      PROJECT_NAME = null,
      TITLE = null,
      SUMMARY = null,
      DESCRIPTION = null,
      MOBILE_IMAGE = null,
      WEB_IMAGE = null,
      REMARK = null,
      TEAM = null,
      SAVED = null,
      MOCK_UP_NAME = null,
      RESOLUTION = null,
      P_SITE_ID = null,
      FAVORITE_YN = 'N',
      TEMPLATE_YN = 'N',
      RESERVE = null,
      RESERV1 = null,
      RESERV2 = null,
      RESERV3 = null,
      USE_YN = 'Y',
      TTSHINT = null,
    } = req.body;
    const r = db
      .prepare(`
      INSERT INTO TB_PROJECT_INFO
        (USERID,USER_HASH,JOINID,PROJECT_ID,PROJECT_HASH,PROJECT_UUID,PROJECT_NAME,TITLE,SUMMARY,DESCRIPTION,MOBILE_IMAGE,WEB_IMAGE,REMARK,TEAM,SAVED,MOCK_UP_NAME,RESOLUTION,P_SITE_ID,FAVORITE_YN,TEMPLATE_YN,RESERVE,RESERV1,RESERV2,RESERV3,USE_YN,TTSHINT)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
      .run(
        USERID,
        USER_HASH,
        JOINID,
        PROJECT_ID,
        PROJECT_HASH,
        PROJECT_UUID,
        PROJECT_NAME,
        TITLE,
        SUMMARY,
        DESCRIPTION,
        MOBILE_IMAGE,
        WEB_IMAGE,
        REMARK,
        TEAM,
        SAVED,
        MOCK_UP_NAME,
        RESOLUTION,
        P_SITE_ID,
        FAVORITE_YN,
        TEMPLATE_YN,
        RESERVE,
        RESERV1,
        RESERV2,
        RESERV3,
        USE_YN,
        TTSHINT,
      );
    res
      .status(201)
      .json({ success: true, data: db.prepare('SELECT * FROM TB_PROJECT_INFO WHERE UID=?').get(r.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/projects/:uid', (req, res) => {
  try {
    const {
      USERID,
      USER_HASH,
      JOINID,
      PROJECT_ID,
      PROJECT_HASH,
      PROJECT_UUID,
      PROJECT_NAME,
      TITLE,
      SUMMARY,
      DESCRIPTION,
      MOBILE_IMAGE,
      WEB_IMAGE,
      REMARK,
      TEAM,
      SAVED,
      MOCK_UP_NAME,
      RESOLUTION,
      P_SITE_ID,
      FAVORITE_YN,
      TEMPLATE_YN,
      RESERVE,
      RESERV1,
      RESERV2,
      RESERV3,
      USE_YN,
      TTSHINT,
    } = req.body;
    const r = db
      .prepare(`
      UPDATE TB_PROJECT_INFO SET
        USERID=?,USER_HASH=?,JOINID=?,PROJECT_ID=?,PROJECT_HASH=?,PROJECT_UUID=?,PROJECT_NAME=?,TITLE=?,SUMMARY=?,DESCRIPTION=?,MOBILE_IMAGE=?,WEB_IMAGE=?,REMARK=?,TEAM=?,SAVED=?,MOCK_UP_NAME=?,RESOLUTION=?,P_SITE_ID=?,FAVORITE_YN=?,TEMPLATE_YN=?,RESERVE=?,RESERV1=?,RESERV2=?,RESERV3=?,USE_YN=?,TTSHINT=?
      WHERE UID=?
    `)
      .run(
        USERID,
        USER_HASH,
        JOINID,
        PROJECT_ID,
        PROJECT_HASH,
        PROJECT_UUID,
        PROJECT_NAME,
        TITLE,
        SUMMARY,
        DESCRIPTION,
        MOBILE_IMAGE,
        WEB_IMAGE,
        REMARK,
        TEAM,
        SAVED,
        MOCK_UP_NAME,
        RESOLUTION,
        P_SITE_ID,
        FAVORITE_YN,
        TEMPLATE_YN,
        RESERVE,
        RESERV1,
        RESERV2,
        RESERV3,
        USE_YN,
        TTSHINT,
        req.params.uid,
      );
    if (r.changes > 0)
      res.json({ success: true, data: db.prepare('SELECT * FROM TB_PROJECT_INFO WHERE UID=?').get(req.params.uid) });
    else res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/projects/:uid', (req, res) => {
  try {
    const r = db.prepare('UPDATE TB_PROJECT_INFO SET DEL_YN=? WHERE UID=?').run('Y', req.params.uid);
    if (r.changes > 0) res.json({ success: true, message: '프로젝트가 삭제되었습니다.' });
    else res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/projects/batch', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ success: false, error: '유효하지 않은 데이터입니다.' });

  const ins = db.prepare(`
    INSERT INTO TB_PROJECT_INFO
      (USERID,USER_HASH,JOINID,PROJECT_ID,PROJECT_HASH,PROJECT_UUID,PROJECT_NAME,TITLE,SUMMARY,DESCRIPTION,MOBILE_IMAGE,WEB_IMAGE,REMARK,TEAM,SAVED,MOCK_UP_NAME,RESOLUTION,P_SITE_ID,FAVORITE_YN,TEMPLATE_YN,RESERVE,RESERV1,RESERV2,RESERV3,USE_YN,TTSHINT)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const upd = db.prepare(`
    UPDATE TB_PROJECT_INFO SET
      USERID=?,USER_HASH=?,JOINID=?,PROJECT_ID=?,PROJECT_HASH=?,PROJECT_UUID=?,PROJECT_NAME=?,TITLE=?,SUMMARY=?,DESCRIPTION=?,MOBILE_IMAGE=?,WEB_IMAGE=?,REMARK=?,TEAM=?,SAVED=?,MOCK_UP_NAME=?,RESOLUTION=?,P_SITE_ID=?,FAVORITE_YN=?,TEMPLATE_YN=?,RESERVE=?,RESERV1=?,RESERV2=?,RESERV3=?,USE_YN=?,TTSHINT=?
    WHERE UID=?
  `);
  const del = db.prepare('UPDATE TB_PROJECT_INFO SET DEL_YN=? WHERE UID=?');

  const run = db.transaction((list) =>
    list.map((item) => {
      const p = [
        item.USERID,
        item.USER_HASH,
        item.JOINID,
        item.PROJECT_ID,
        item.PROJECT_HASH,
        item.PROJECT_UUID,
        item.PROJECT_NAME,
        item.TITLE,
        item.SUMMARY,
        item.DESCRIPTION,
        item.MOBILE_IMAGE,
        item.WEB_IMAGE,
        item.REMARK,
        item.TEAM,
        item.SAVED,
        item.MOCK_UP_NAME,
        item.RESOLUTION,
        item.P_SITE_ID,
        item.FAVORITE_YN ?? 'N',
        item.TEMPLATE_YN ?? 'N',
        item.RESERVE,
        item.RESERV1,
        item.RESERV2,
        item.RESERV3,
        item.USE_YN ?? 'Y',
        item.TTSHINT,
      ];
      if (item._deleted) {
        del.run('Y', item.UID);
        return { UID: item.UID, action: 'deleted' };
      }
      if (item.UID) {
        upd.run(...p, item.UID);
        return { UID: item.UID, action: 'updated' };
      }
      return { UID: ins.run(...p).lastInsertRowid, action: 'inserted' };
    }),
  );

  try {
    res.json({ success: true, data: run(items) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: 데이터베이스 관리 ────────────────────────────────────────────────────

app.get('/api/database/tables', (_req, res) => {
  try {
    const tables = db
      .prepare(`
      SELECT name, type FROM sqlite_master
      WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
    `)
      .all()
      .map((t) => ({
        ...t,
        columns: db.prepare(`PRAGMA table_info(${t.name})`).all(),
        rowCount: db.prepare(`SELECT COUNT(*) AS c FROM ${t.name}`).get().c,
      }));
    res.json({ success: true, data: tables });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/database/tables/:tableName/schema', (req, res) => {
  try {
    const { tableName } = req.params;
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    if (!exists) return res.status(404).json({ success: false, error: '테이블을 찾을 수 없습니다.' });
    res.json({
      success: true,
      data: {
        tableName,
        columns: db.prepare(`PRAGMA table_info(${tableName})`).all(),
        indexes: db.prepare(`PRAGMA index_list(${tableName})`).all(),
        foreignKeys: db.prepare(`PRAGMA foreign_key_list(${tableName})`).all(),
        createSql: db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tableName)?.sql || '',
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/database/tables/:tableName/data', (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    if (!exists) return res.status(404).json({ success: false, error: '테이블을 찾을 수 없습니다.' });
    res.json({
      success: true,
      data: {
        rows: db.prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`).all(limit, offset),
        columns: db.prepare(`PRAGMA table_info(${tableName})`).all(),
        totalCount: db.prepare(`SELECT COUNT(*) AS c FROM ${tableName}`).get().c,
        limit,
        offset,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/database/query', (req, res) => {
  try {
    const { sql, params: p = [] } = req.body;
    if (!sql || typeof sql !== 'string')
      return res.status(400).json({ success: false, error: 'SQL 쿼리가 필요합니다.' });
    const t = sql.trim().toLowerCase();
    if (t.startsWith('select')) {
      const rows = db.prepare(sql).all(...p);
      return res.json({ success: true, data: { rows, rowCount: rows.length, type: 'SELECT' } });
    }
    if (t.startsWith('insert') || t.startsWith('update') || t.startsWith('delete')) {
      const r = db.prepare(sql).run(...p);
      return res.json({
        success: true,
        data: {
          changes: r.changes,
          lastInsertRowid: r.lastInsertRowid,
          type: t.startsWith('insert') ? 'INSERT' : t.startsWith('update') ? 'UPDATE' : 'DELETE',
        },
      });
    }
    db.exec(sql);
    res.json({ success: true, data: { message: 'DDL 쿼리가 성공적으로 실행되었습니다.', type: 'DDL' } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/database/tables/:tableName/batch', (req, res) => {
  try {
    const { tableName } = req.params;
    const { operations } = req.body;
    if (!Array.isArray(operations))
      return res.status(400).json({ success: false, error: '유효하지 않은 작업 데이터입니다.' });
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    if (!exists) return res.status(404).json({ success: false, error: '테이블을 찾을 수 없습니다.' });

    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const colNames = columns.map((c) => c.name);
    const pk = columns.find((c) => c.pk === 1)?.name;
    const results = [];

    const txn = db.transaction((ops) => {
      for (const op of ops) {
        if (op.type === 'INSERT') {
          const cols = Object.keys(op.data).filter((c) => colNames.includes(c));
          const r = db
            .prepare(`INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
            .run(...cols.map((c) => op.data[c]));
          results.push({ type: 'INSERT', success: true, lastInsertRowid: r.lastInsertRowid });
        } else if (op.type === 'UPDATE' && pk && op.data[pk]) {
          const cols = Object.keys(op.data).filter((c) => colNames.includes(c) && c !== pk);
          const r = db
            .prepare(`UPDATE ${tableName} SET ${cols.map((c) => `${c}=?`).join(',')} WHERE ${pk}=?`)
            .run(...cols.map((c) => op.data[c]), op.data[pk]);
          results.push({ type: 'UPDATE', success: true, changes: r.changes });
        } else if (op.type === 'DELETE' && pk && op.data[pk]) {
          const r = db.prepare(`DELETE FROM ${tableName} WHERE ${pk}=?`).run(op.data[pk]);
          results.push({ type: 'DELETE', success: true, changes: r.changes });
        } else {
          results.push({ type: op.type, success: false, error: '유효하지 않은 작업입니다.' });
        }
      }
    });
    txn(operations);
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: 프로젝트 파일 구조 ──────────────────────────────────────────────────

function readDirStructure(dirPath, maxDepth = 4, depth = 0) {
  if (depth > maxDepth || !fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          type: 'folder',
          path: fullPath,
          children: readDirStructure(fullPath, maxDepth, depth + 1),
        };
      }
      const ext = path.extname(entry.name).toLowerCase();
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        type: 'file',
        path: fullPath,
        size: stat.size,
        modified: stat.mtime,
        ext: ext.replace('.', ''),
        language: ext2lang(ext),
      };
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function ext2lang(ext) {
  const m = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.md': 'markdown',
    '.xml': 'xml',
    '.xcon': 'xml',
    '.sh': 'shell',
    '.bat': 'batch',
  };
  return m[ext] || 'text';
}

app.get('/api/projects/:projectId/structure', (req, res) => {
  try {
    const project = db
      .prepare('SELECT * FROM TB_PROJECT_INFO WHERE PROJECT_ID=? AND DEL_YN=?')
      .get(req.params.projectId, 'N');
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    const projectPath = path.join(ASSETS_APPS, project.PROJECT_NAME || project.PROJECT_ID);
    if (!fs.existsSync(projectPath)) {
      return res.json({ success: true, data: [], projectPath, exists: false });
    }
    res.json({ success: true, data: readDirStructure(projectPath), projectPath, exists: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── API: 프록시 ──────────────────────────────────────────────────────────────

app.post('/api/proxy-request', async (req, res) => {
  const { targetUrl, params: bodyParams } = req.body;
  if (!targetUrl) return res.status(400).json({ success: false, error: 'targetUrl이 필요합니다.' });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(bodyParams || {}),
    });
    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await response.json() : await response.text();

    // ZIP 응답 처리 (assets/apps 압축 해제)
    if (data && data.data) {
      const appsDir = ASSETS_APPS;
      const projPath = path.join(appsDir, data.appName);
      if (!fs.existsSync(projPath)) {
        fs.mkdirSync(appsDir, { recursive: true });
        const zip = new AdmZip(Buffer.from(data.data, 'base64'));
        zip.extractAllTo(appsDir, true);
      }
    }
    res.json({ success: true, data, status: response.status, statusText: response.statusText });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, targetUrl });
  }
});

app.post('/api/figma/project', async (req, res) => {
  const url = 'https://www.xamong.com/Xamong/XamongControl.aspx';
  const content = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify({
          userid: '1617413272651422781',
          figmaid: '1410893255477126283',
          searchType: 'Recents',
        }),
      ),
    ),
  );
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: `userhome:${content}`,
    });
    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await response.json() : await response.text();
    res.json({ success: true, data, status: response.status, statusText: response.statusText });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── 서버 시작 ────────────────────────────────────────────────────────────────

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Xenesis Desk Server`);
  console.log(`   URL      : http://localhost:${PORT}`);
  console.log(`   DB       : ${DB_PATH}`);
  console.log(`   Assets   : ${ASSETS_APPS}`);
  console.log(`   Node     : ${process.version}`);
  console.log(`   Platform : ${process.platform}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/codes/tree`);
  console.log(`   GET  /api/codes?PCODE=...&TYPE=...`);
  console.log(`   POST /api/codes/batch`);
  console.log(`   POST /api/database/query`);
  console.log(`   GET  /api/projects/recent`);
  console.log(`   GET  /api/database/tables`);
});

// ─── 종료 처리 (Windows: SIGINT / Linux: SIGINT + SIGTERM) ───────────────────

function shutdown(signal) {
  console.log(`\n[${signal}] 서버 종료 중...`);
  server.close(() => {
    db.close();
    console.log('데이터베이스 연결 종료.');
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
