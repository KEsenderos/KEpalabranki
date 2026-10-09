/* js/data.js — メモリ上のデータと保存の窓口（KP.Data） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  var D = KP.Data = {
    words: new Map(),
    cards: new Map(),
    daily: new Map(),
    settings: null,
    syncMeta: null,
    celebratedDay: "",
    deviceId: ""
  };

  function defaultSettings_() {
    return { goal: C.GOAL_DEFAULT, voiceURI: "", syncUrl: "", syncToken: "", conjTenses: C.CONJ_TENSES_DEFAULT.slice() };
  }
  function defaultSyncMeta_() {
    return { lastPushAt: 0, lastPullSeq: 0, lastSuccessAt: 0 };
  }

  function newCard_(wordId, dir, now) {
    return {
      id: wordId + ":" + dir, wordId: wordId, dir: dir,
      unlocked: dir === C.DIR.ES_JA, unlockedAt: 0,
      seen: false, streak: 0, intervalDays: 0, ease: C.EASE_START, dueDay: "",
      correctTotal: 0, wrongTotal: 0, lapses: 0, lastAnsweredAt: 0, updatedAt: now
    };
  }

  function maxOrder_() {
    var m = 0;
    D.words.forEach(function (w) { if (w.order > m) m = w.order; });
    return m;
  }

  // 同じミリ秒の連続を避けるため、呼ぶたびに必ず大きくなる時刻を返す
  var lastNow_ = 0;
  function now_() {
    var n = Date.now();
    if (n <= lastNow_) n = lastNow_ + 1;
    lastNow_ = n;
    return n;
  }
  D.now = now_;

  D.loadAll = function () {
    return Promise.all([
      KP.DB.getAll("words"), KP.DB.getAll("cards"), KP.DB.getAll("daily"), KP.DB.getAll("meta")
    ]).then(function (r) {
      D.words = new Map(); D.cards = new Map(); D.daily = new Map();
      r[0].forEach(function (w) { D.words.set(w.id, w); });
      r[1].forEach(function (c) { D.cards.set(c.id, c); });
      r[2].forEach(function (d) { D.daily.set(d.day, d); });
      D.settings = defaultSettings_();
      D.syncMeta = defaultSyncMeta_();
      r[3].forEach(function (m) {
        if (m.key === "settings") D.settings = Object.assign(defaultSettings_(), m.value);
        if (m.key === "sync") D.syncMeta = Object.assign(defaultSyncMeta_(), m.value);
        if (m.key === "celebratedDay") D.celebratedDay = m.value || "";
        if (m.key === "deviceId") D.deviceId = m.value || "";
      });
      if (!D.deviceId) {
        D.deviceId = KP.Utils.newId("d");
        return D.setMeta("deviceId", D.deviceId);
      }
    });
  };

  D.wordOf = function (card) { return D.words.get(card.wordId); };

  D.cardsOf = function (wordId) {
    return [D.cards.get(wordId + ":" + C.DIR.ES_JA), D.cards.get(wordId + ":" + C.DIR.JA_ES)];
  };

  function buildWord_(fields, order, now) {
    return {
      id: KP.Utils.newId("w"),
      es: fields.es || "", ja: fields.ja || "", category: fields.category || "",
      pos: fields.pos || "", gender: fields.gender || "", exEs: fields.exEs || "",
      exJa: fields.exJa || "", note: fields.note || "", source: fields.source || "",
      suspended: false, order: order, createdAt: now, updatedAt: now
    };
  }

  // 複数の単語をまとめて作る（取り込み用）。各単語にカード2枚
  D.createWords = function (list) {
    var base = maxOrder_();
    var words = [], cards = [];
    list.forEach(function (f, i) {
      var now = now_();
      var w = buildWord_(f, base + i + 1, now);
      words.push(w);
      cards.push(newCard_(w.id, C.DIR.ES_JA, now), newCard_(w.id, C.DIR.JA_ES, now));
    });
    words.forEach(function (w) { D.words.set(w.id, w); });
    cards.forEach(function (c) { D.cards.set(c.id, c); });
    return KP.DB.tx(["words", "cards"], "readwrite", function (s) {
      words.forEach(function (w) { s.words.put(w); });
      cards.forEach(function (c) { s.cards.put(c); });
    }).then(function () { return words; });
  };

  D.createWord = function (fields) {
    return D.createWords([fields]).then(function (ws) { return ws[0]; });
  };

  // [{id, fields}] をまとめて更新（カードは変えない）
  D.updateWords = function (list) {
    var changed = [];
    list.forEach(function (item) {
      var w = D.words.get(item.id);
      if (!w) return;
      var nw = Object.assign({}, w, item.fields, { id: w.id, updatedAt: now_() });
      D.words.set(nw.id, nw);
      changed.push(nw);
    });
    return KP.DB.putMany("words", changed).then(function () { return changed; });
  };

  D.updateWord = function (id, fields) {
    return D.updateWords([{ id: id, fields: fields }]).then(function (ws) { return ws[0]; });
  };

  // card が null のときは回答記録だけ保存（テスト用）
  D.recordAnswer = function (card, log, unlockReverse, countToday) {
    var now = now_();
    var rev = null, day = null;
    if (card) {
      card = Object.assign({}, card, { updatedAt: now });
      D.cards.set(card.id, card);
      if (unlockReverse) {
        var r = D.cards.get(card.wordId + ":" + C.DIR.JA_ES);
        if (r && !r.unlocked) {
          rev = Object.assign({}, r, { unlocked: true, unlockedAt: now, updatedAt: now });
          D.cards.set(rev.id, rev);
        }
      }
    }
    log.updatedAt = log.updatedAt || log.at;
    if (countToday) {
      var key = KP.Utils.dayStr(new Date(log.at));
      var cur = D.daily.get(key) || { day: key, answers: 0 };
      day = { day: key, answers: cur.answers + 1 };
      D.daily.set(key, day);
    }
    var stores = ["logs"];
    if (card) stores.push("cards");
    if (day) stores.push("daily");
    return KP.DB.tx(stores, "readwrite", function (s) {
      s.logs.put(log);
      if (card) s.cards.put(card);
      if (rev) s.cards.put(rev);
      if (day) s.daily.put(day);
    });
  };

  D.saveTest = function (t) { return KP.DB.put("tests", t); };

  D.saveConjLog = function (o) { return KP.DB.put("conjLogs", o); };

  // 5.3b 判定の訂正: カード（と解放の取り消し）と訂正の記録を1回で保存（v1.1）
  D.fixAnswer = function (card, revCard, fixLog) {
    var now = now_();
    card = Object.assign({}, card, { updatedAt: now });
    D.cards.set(card.id, card);
    if (revCard) {
      revCard = Object.assign({}, revCard, { updatedAt: now });
      D.cards.set(revCard.id, revCard);
    }
    fixLog.updatedAt = now;
    return KP.DB.tx(["cards", "logs"], "readwrite", function (s) {
      s.cards.put(card);
      if (revCard) s.cards.put(revCard);
      s.logs.put(fixLog);
    });
  };

  D.setMeta = function (key, value) {
    if (key === "celebratedDay") D.celebratedDay = value;
    return KP.DB.put("meta", { key: key, value: value });
  };

  D.saveSettings = function (obj) {
    D.settings = Object.assign({}, D.settings, obj);
    return D.setMeta("settings", D.settings);
  };

  D.saveSyncMeta = function (obj) {
    D.syncMeta = Object.assign({}, D.syncMeta, obj);
    return D.setMeta("sync", D.syncMeta);
  };

  D.todayCount = function () {
    var d = D.daily.get(KP.Utils.dayStr());
    return d ? d.answers : 0;
  };

  // サーバーから受け取った記録を反映。戻り値は新しく保存した記録の配列（v1.1）
  D.mergeFromServer = function (store, arr) {
    if (!arr || arr.length === 0) return Promise.resolve([]);
    if (store === "words" || store === "cards") {
      var map = store === "words" ? D.words : D.cards;
      var put = [];
      arr.forEach(function (o) {
        var cur = map.get(o.id);
        if (!cur || o.updatedAt > cur.updatedAt) { map.set(o.id, o); put.push(o); }
      });
      if (put.length === 0) return Promise.resolve([]);
      return KP.DB.putMany(store, put).then(function () { return put; });
    }
    // logs・tests・conjLogs は端末に無い id だけを保存する
    return KP.DB.existing(store, arr.map(function (o) { return o.id; })).then(function (have) {
      var fresh = arr.filter(function (o) { return !have.has(o.id); });
      if (fresh.length === 0) return [];
      return KP.DB.putMany(store, fresh).then(function () { return fresh; });
    });
  };

  D.categories = function () {
    var set = {};
    D.words.forEach(function (w) { if (w.category) set[w.category] = true; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, "ja"); });
  };

  // 重複判定用: 正規化したスペイン語 → 単語
  D.esIndex = function () {
    var m = new Map();
    D.words.forEach(function (w) { m.set(KP.Utils.normEs(w.es), w); });
    return m;
  };
})();
