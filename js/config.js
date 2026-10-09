/* js/config.js — 定数（KP.Config） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};

  KP.Config = {
    APP_NAME: "KEpalabranki",
    APP_VERSION: "1.0.1",
    DB_NAME: "kepalabranki-db",
    DB_VERSION: 1,

    DIR: { ES_JA: "ES_JA", JA_ES: "JA_ES" },
    RESULT: { OK: "OK", NG: "NG" },
    METHOD: { SELF: "SELF", MC: "MC" },
    MODE: { STUDY: "STUDY", TEST: "TEST" },
    SESSION: { NORMAL: "NORMAL", AHEAD: "AHEAD", CUSTOM: "CUSTOM" },
    PHASE_LABEL: {
      DUE: "復習", RELEARN: "もう一度", NEW: "新規", REVERSE: "新規（日→スペ）",
      AHEAD: "先取り", CUSTOM: "選んだ単語"
    },

    EASE_START: 2.5, EASE_MIN: 1.3, EASE_MAX: 3.0,
    EASE_UP: 0.05, EASE_DOWN: 0.20,
    FIRST_INTERVAL: 1, SECOND_INTERVAL: 3,
    MAX_INTERVAL: 365,
    MC_FACTOR: 0.5,
    RELEARN_GAP: 5,
    UNLOCK_REVERSE_DAYS: 7,
    STAGE_SETTLED_DAYS: 7, STAGE_MASTERED_DAYS: 30,
    DAY_START_HOUR: 4,
    STAGE: { UNSEEN: "未学習", LEARNING: "学習中", SETTLED: "定着", MASTERED: "習得" },

    GOAL_DEFAULT: 30, GOAL_MIN: 1, GOAL_MAX: 500,
    CHOICE_COUNT: 4,
    TEST_COUNTS: [10, 20, 50],
    TEST_HISTORY_MAX: 20,
    WORD_LIST_PAGE: 100,
    SEARCH_DELAY_MS: 300,
    TOAST_MS: 2500,
    GOAL_OVERLAY_MS: 1500,

    SPEECH_LANGS: ["es-MX", "es-US", "es-419", "es-ES", "es"],
    SPEECH_RATE: 0.9,
    VOICE_TEST_TEXT: "Hola, ¿cómo estás?",

    SYNC_EVERY_ANSWERS: 20,
    SYNC_TIMEOUT_MS: 20000,
    PUSH_BATCH: 500,
    PULL_LIMIT: 3000,
    SYNC_WARN_DAYS: 3,
    UPDATE_CHECK_MIN_MS: 600000,

    POS_PAREN_RE: /（(名詞・女性|名詞・男性|形容詞|副詞|固有名詞|代名詞|接続詞|前置詞|その他)）\s*$/,
    LATIN_RE: /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/,
    GENDER_LABEL: { m: "el", f: "la" },

    SYNC_SHEETS: ["words", "cards", "logs", "tests"],
    SYNC_FIELDS: {
      words: ["id", "es", "ja", "category", "pos", "gender", "exEs", "exJa", "note", "source",
        "suspended", "order", "createdAt", "updatedAt"],
      cards: ["id", "wordId", "dir", "unlocked", "unlockedAt", "seen", "streak", "intervalDays",
        "ease", "dueDay", "correctTotal", "wrongTotal", "lapses", "lastAnsweredAt", "updatedAt"],
      logs: ["id", "at", "cardId", "wordId", "dir", "result", "method", "mode", "updatedAt"],
      tests: ["id", "at", "range", "rangeValue", "count", "correct", "wrongWordIds", "updatedAt"]
    },
    // 同期で受け取った文字を戻すときの型（b=真偽, n=数値。書いていない項目は文字）
    FIELD_TYPES: {
      suspended: "b", unlocked: "b", seen: "b",
      order: "n", createdAt: "n", updatedAt: "n", unlockedAt: "n", streak: "n",
      intervalDays: "n", ease: "n", correctTotal: "n", wrongTotal: "n", lapses: "n",
      lastAnsweredAt: "n", at: "n", count: "n", correct: "n"
    },

    MSG: {
      SAVE_ERROR: "保存に失敗しました。もう一度試してください",
      REVIEW_DONE: "復習が終わりました。ここから新しい単語です",
      ALL_DONE: "出題できる単語がありません。単語を追加してください",
      AHEAD_DONE: "先取りできる単語はもうありません",
      TEST_EMPTY: "この範囲には単語がありません",
      NO_VOICE: "スペイン語の音声が見つかりません",
      IMPORT_BAD_FORMAT: "CSVの形式が読み取れません（3章の形式を確認してください）",
      IMPORT_DONE: "{n}語を追加、{m}語を更新しました",
      WORD_REQUIRED: "スペイン語・日本語・カテゴリは必須です",
      WORD_DUPLICATE: "同じスペイン語の単語がすでにあります",
      WORD_SAVED: "保存しました",
      SYNC_OK: "同期しました",
      SYNC_FAIL: "同期できませんでした（{reason}）",
      SYNC_NOT_SET: "同期のURLと合言葉を設定してください",
      SYNC_AUTH: "合言葉が違います",
      RESTORE_DONE: "復元しました（{n}件）",
      GOAL_DONE: "🎉 今日の目標達成！",
      UPDATE_AVAILABLE: "新しい版があります。ここをタップして更新",
      SYNC_WARN: "バックアップが{n}日できていません。設定を確認してください",
      SYNC_WARN_NEVER: "バックアップがまだできていません。設定を確認してください",
      SYNC_WARN_UNSET: "バックアップが未設定です。設定から設定してください",
      NO_STORAGE: "この環境では記録を保存できません（Safariの通常モードで開いてください）"
    }
  };
})();
