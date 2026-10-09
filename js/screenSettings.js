/* js/screenSettings.js — 設定（KP.ScreenSettings） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var U = KP.Utils;
  var $ = function (id) { return document.getElementById(id); };

  function renderVoices_() {
    var sel = $("sel-voice");
    sel.innerHTML = '<option value="">自動（メキシコ優先）</option>';
    KP.Speech.voices().forEach(function (v) {
      var o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = v.name + "（" + v.lang + "）";
      sel.appendChild(o);
    });
    sel.value = KP.Data.settings.voiceURI || "";
    if (sel.value !== (KP.Data.settings.voiceURI || "")) sel.value = "";
  }

  function renderSyncStatus_() {
    var m = KP.Data.syncMeta;
    var last = m.lastSuccessAt ? U.fmtDateTime(m.lastSuccessAt) : "未実施";
    $("txt-sync-status").textContent = "最終同期: " + last;
    KP.Sync.pendingCount().then(function (n) {
      $("txt-sync-status").textContent = "最終同期: " + last + " ／ 未送信 " + n + "件";
    });
  }

  // iPhoneはボタンを押しても入力欄の change が起きないことがあるため、先に保存する
  function commit_() {
    return KP.Data.saveSettings({
      syncUrl: document.getElementById("input-sync-url").value.trim(),
      syncToken: document.getElementById("input-sync-token").value.trim()
    });
  }

  function withBusy_(btn, fn) {
    btn.disabled = true;
    var run = fn;
    fn = function () { return commit_().then(run); };
    fn().then(function () { btn.disabled = false; }, function () { btn.disabled = false; });
  }

  KP.ScreenSettings = {
    init: function () {
      $("input-goal").addEventListener("change", function () {
        var n = Math.round(Number(this.value));
        if (!isFinite(n)) n = C.GOAL_DEFAULT;
        n = U.clamp(n, C.GOAL_MIN, C.GOAL_MAX);
        this.value = n;
        KP.Data.saveSettings({ goal: n });
      });
      $("sel-voice").addEventListener("change", function () {
        KP.Data.saveSettings({ voiceURI: this.value });
      });
      $("btn-voice-test").addEventListener("click", function () { KP.Speech.speak(C.VOICE_TEST_TEXT); });
      $("input-sync-url").addEventListener("change", function () {
        KP.Data.saveSettings({ syncUrl: this.value.trim() });
      });
      $("input-sync-token").addEventListener("change", function () {
        KP.Data.saveSettings({ syncToken: this.value.trim() });
      });
      $("btn-sync-test").addEventListener("click", function () {
        var b = this;
        withBusy_(b, function () {
          return KP.Sync.ping().then(function (r) { KP.UI.toast(r.ok ? C.MSG.SYNC_OK : r.reason); });
        });
      });
      $("btn-sync-now").addEventListener("click", function () {
        var b = this;
        withBusy_(b, function () { return KP.Sync.syncNow({ silent: false }); });
      });
      $("btn-sync-restore").addEventListener("click", function () {
        var b = this;
        withBusy_(b, function () {
          return KP.Sync.restore().then(function (r) {
            KP.UI.toast(r.ok ? U.fill(C.MSG.RESTORE_DONE, { n: r.count }) : r.reason);
          });
        });
      });
    },

    onShow: function () {
      var s = KP.Data.settings;
      $("input-goal").value = s.goal;
      $("input-sync-url").value = s.syncUrl;
      $("input-sync-token").value = s.syncToken;
      renderVoices_();
      renderSyncStatus_();
      $("txt-version").textContent = "v" + C.APP_VERSION;
    },

    renderSyncStatus_: renderSyncStatus_
  };
})();
