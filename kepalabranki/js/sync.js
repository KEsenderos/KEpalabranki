/* js/sync.js — スプレッドシートとの同期（KP.Sync） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var running_ = false;

  function isSet_() {
    var s = KP.Data.settings;
    return !!(s && s.syncUrl && s.syncToken);
  }

  function post_(payload) {
    var s = KP.Data.settings;
    payload.token = s.syncToken;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, C.SYNC_TIMEOUT_MS);
    var opts = {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow"
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(s.syncUrl, opts).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (j) {
      clearTimeout(timer);
      if (!j || j.ok !== true) {
        var e = new Error(j && j.error ? j.error : "SERVER");
        e.code = j && j.error;
        throw e;
      }
      return j;
    }, function (err) {
      clearTimeout(timer);
      if (err && err.name === "AbortError") err = new Error("時間切れ");
      throw err;
    });
  }

  function fromSheet_(store, row) {
    var o = {};
    C.SYNC_FIELDS[store].forEach(function (f) {
      var v = row[f], t = C.FIELD_TYPES[f];
      if (t === "b") o[f] = v === true || String(v).toUpperCase() === "TRUE";
      else if (t === "n") o[f] = Number(v) || 0;
      else o[f] = v == null ? "" : String(v);
    });
    return o;
  }

  function toSheet_(store, rec) {
    var o = {};
    C.SYNC_FIELDS[store].forEach(function (f) { o[f] = rec[f] == null ? "" : rec[f]; });
    return o;
  }

  function collect_() {
    var since = KP.Data.syncMeta.lastPushAt;
    return Promise.all(C.SYNC_SHEETS.map(function (st) { return KP.DB.getSince(st, since); }))
      .then(function (lists) {
        var all = [];
        lists.forEach(function (arr, i) {
          var st = C.SYNC_SHEETS[i];
          arr.forEach(function (r) { all.push({ store: st, rec: r }); });
        });
        all.sort(function (a, b) { return a.rec.updatedAt - b.rec.updatedAt; });
        return all;
      });
  }

  function push_() {
    return collect_().then(function (all) {
      if (all.length === 0) return;
      var n = Math.min(C.PUSH_BATCH, all.length);
      var lastAt = all[n - 1].rec.updatedAt;
      while (n < all.length && all[n].rec.updatedAt === lastAt) n++; // 同じ時刻はまとめて送る
      var batch = all.slice(0, n), data = {};
      C.SYNC_SHEETS.forEach(function (st) { data[st] = []; });
      batch.forEach(function (x) { data[x.store].push(toSheet_(x.store, x.rec)); });
      return post_({ action: "push", data: data }).then(function () {
        return KP.Data.saveSyncMeta({ lastPushAt: lastAt });
      }).then(function () {
        if (n < all.length) return push_();
      });
    });
  }

  function pull_(state) {
    return post_({ action: "pull", sinceSeq: KP.Data.syncMeta.lastPullSeq, limit: C.PULL_LIMIT })
      .then(function (j) {
        var data = j.data || {};
        var p = Promise.resolve();
        C.SYNC_SHEETS.forEach(function (st) {
          var arr = (data[st] || []).map(function (r) { return fromSheet_(st, r); });
          state.count += arr.length;
          if (st === "logs" && arr.length) state.gotLogs = true;
          p = p.then(function () { return KP.Data.mergeFromServer(st, arr); });
        });
        return p.then(function () {
          var seq = Number(j.lastSeq) || KP.Data.syncMeta.lastPullSeq;
          return KP.Data.saveSyncMeta({ lastPullSeq: seq });
        }).then(function () {
          if (j.more) return pull_(state);
        });
      });
  }

  function pullAll_() {
    var state = { count: 0, gotLogs: false };
    return pull_(state).then(function () {
      if (state.gotLogs) return KP.Stats.rebuildDaily();
    }).then(function () { return state.count; });
  }

  function reason_(err) {
    if (err && err.code === "AUTH") return C.MSG.SYNC_AUTH;
    return KP.Utils.fill(C.MSG.SYNC_FAIL, { reason: (err && err.message) || "不明" });
  }

  KP.Sync = {
    syncNow: function (opts) {
      var silent = !opts || opts.silent !== false;
      if (running_) return Promise.resolve({ ok: false, reason: "busy" });
      if (!isSet_()) {
        if (!silent) KP.UI.toast(C.MSG.SYNC_NOT_SET);
        return Promise.resolve({ ok: false, reason: "not_set" });
      }
      running_ = true;
      return push_().then(pullAll_).then(function () {
        return KP.Data.saveSyncMeta({ lastSuccessAt: Date.now() });
      }).then(function () {
        if (!silent) KP.UI.toast(C.MSG.SYNC_OK);
        return { ok: true };
      }, function (err) {
        console.error(err);
        if (!silent) KP.UI.toast(reason_(err));
        return { ok: false, reason: reason_(err) };
      }).then(function (r) {
        running_ = false;
        KP.UI.refresh();
        return r;
      });
    },

    ping: function () {
      if (!isSet_()) return Promise.resolve({ ok: false, reason: C.MSG.SYNC_NOT_SET });
      return post_({ action: "ping" }).then(function () { return { ok: true }; },
        function (err) { return { ok: false, reason: reason_(err) }; });
    },

    restore: function () {
      if (!isSet_()) return Promise.resolve({ ok: false, reason: C.MSG.SYNC_NOT_SET, count: 0 });
      if (running_) return Promise.resolve({ ok: false, reason: "busy", count: 0 });
      running_ = true;
      return KP.Data.saveSyncMeta({ lastPullSeq: 0 }).then(pullAll_).then(function (n) {
        return KP.Data.saveSyncMeta({ lastSuccessAt: Date.now() }).then(function () { return { ok: true, count: n }; });
      }, function (err) {
        console.error(err);
        return { ok: false, reason: reason_(err), count: 0 };
      }).then(function (r) {
        running_ = false;
        KP.UI.refresh();
        return r;
      });
    },

    pendingCount: function () {
      return collect_().then(function (all) { return all.length; }, function () { return 0; });
    },

    post_: post_, push_: push_, pull_: pull_, toSheet_: toSheet_, fromSheet_: fromSheet_
  };
})();
