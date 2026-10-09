/* js/db.js — IndexedDB の窓口（KP.DB） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var db_ = null;

  function reqP_(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function store_(name, mode) {
    return db_.transaction(name, mode || "readonly").objectStore(name);
  }

  KP.DB = {
    open: function () {
      return new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error("NO_INDEXEDDB")); return; }
        var req;
        try { req = indexedDB.open(C.DB_NAME, C.DB_VERSION); } catch (e) { reject(e); return; }
        req.onupgradeneeded = function () {
          var d = req.result, s;
          if (!d.objectStoreNames.contains("words")) {
            s = d.createObjectStore("words", { keyPath: "id" });
            s.createIndex("updatedAt", "updatedAt");
          }
          if (!d.objectStoreNames.contains("cards")) {
            s = d.createObjectStore("cards", { keyPath: "id" });
            s.createIndex("wordId", "wordId");
            s.createIndex("updatedAt", "updatedAt");
          }
          if (!d.objectStoreNames.contains("logs")) {
            s = d.createObjectStore("logs", { keyPath: "id" });
            s.createIndex("updatedAt", "updatedAt");
          }
          if (!d.objectStoreNames.contains("tests")) {
            s = d.createObjectStore("tests", { keyPath: "id" });
            s.createIndex("updatedAt", "updatedAt");
          }
          if (!d.objectStoreNames.contains("daily")) d.createObjectStore("daily", { keyPath: "day" });
          if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "key" });
        };
        req.onsuccess = function () { db_ = req.result; resolve(db_); };
        req.onerror = function () { reject(req.error); };
        req.onblocked = function () { reject(new Error("BLOCKED")); };
      });
    },

    getAll: function (name) { return reqP_(store_(name).getAll()); },

    get: function (name, key) { return reqP_(store_(name).get(key)); },

    put: function (name, obj) { return reqP_(store_(name, "readwrite").put(obj)); },

    putMany: function (name, arr) {
      return KP.DB.tx([name], "readwrite", function (s) {
        arr.forEach(function (o) { s[name].put(o); });
      });
    },

    clear: function (name) { return reqP_(store_(name, "readwrite").clear()); },

    // stores の名前の配列を1つのトランザクションで。fn(storesObj) の中で put などを呼ぶ
    tx: function (stores, mode, fn) {
      return new Promise(function (resolve, reject) {
        var t = db_.transaction(stores, mode);
        var obj = {};
        stores.forEach(function (n) { obj[n] = t.objectStore(n); });
        t.oncomplete = function () { resolve(); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error("ABORT")); };
        try { fn(obj); } catch (e) { try { t.abort(); } catch (e2) { /* 無視 */ } reject(e); }
      });
    },

    // updatedAt が ts より大きいもの（古い順）
    getSince: function (name, ts) {
      var idx = store_(name).index("updatedAt");
      return reqP_(idx.getAll(IDBKeyRange.lowerBound(ts, true)));
    }
  };
})();
