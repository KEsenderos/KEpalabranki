/* js/screenHome.js — ホーム（KP.ScreenHome） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var $ = function (id) { return document.getElementById(id); };

  function syncWarn_() {
    var s = KP.Data.settings, m = KP.Data.syncMeta;
    if (!s.syncUrl || !s.syncToken) return C.MSG.SYNC_WARN_UNSET;
    if (!m.lastSuccessAt) return C.MSG.SYNC_WARN_NEVER;
    var days = Math.floor((Date.now() - m.lastSuccessAt) / 86400000);
    if (days >= C.SYNC_WARN_DAYS) return KP.Utils.fill(C.MSG.SYNC_WARN, { n: days });
    return "";
  }

  KP.ScreenHome = {
    init: function () {
      $("btn-start-study").addEventListener("click", function () {
        KP.UI.show("study", { session: C.SESSION.NORMAL });
      });
      $("btn-start-ahead").addEventListener("click", function () {
        KP.UI.show("study", { session: C.SESSION.AHEAD });
      });
      $("btn-start-test").addEventListener("click", function () { KP.UI.show("test"); });
      $("banner-sync-warn").addEventListener("click", function () { KP.UI.show("settings"); });
    },

    onShow: function () {
      var S = KP.Stats;
      var streak = S.streak();
      $("txt-streak").textContent = streak > 0 ? "🔥 " + streak + "日連続" : "今日から始めよう";
      var count = KP.Data.todayCount(), goal = KP.Data.settings.goal;
      $("banner-not-studied").hidden = count > 0;
      $("txt-today-count").textContent = "今日 " + count;
      $("txt-goal").textContent = count >= goal ? "目標達成 ✓" : "/ 目標 " + goal;
      $("bar-goal").style.width = Math.min(100, Math.round(count / goal * 100)) + "%";
      var due = S.dueCount();
      $("txt-due-count").textContent = "復習待ち " + due + "枚";
      $("txt-tomorrow-count").textContent = "明日 " + S.tomorrowCount() + "枚";
      $("txt-week-count").textContent = "7日以内 " + S.weekCount() + "枚";
      $("btn-start-study").textContent = due > 0 ? "学習開始" : "新しい単語を学習";
      $("btn-start-ahead").hidden = !(due === 0 && S.aheadCount() > 0);
      var w = syncWarn_();
      $("banner-sync-warn").hidden = w === "";
      $("banner-sync-warn").textContent = w;
    }
  };
})();
