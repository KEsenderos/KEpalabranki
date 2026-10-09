/* js/ui.js — 共通の画面処理・タブ・トースト（KP.UI） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  var current_ = null;
  var toastTimer_ = null;
  var NO_TAB = { study: true, test: true, "word-edit": true, "import": true };
  var REFRESHABLE = { home: true, settings: true, progress: true };

  function handlers_() {
    return {
      home: KP.ScreenHome.onShow,
      study: KP.ScreenStudy.onShow,
      test: KP.ScreenTest.onShow,
      progress: KP.ScreenProgress.onShow,
      words: KP.ScreenWords.onShow,
      settings: KP.ScreenSettings.onShow
    };
  }

  KP.UI = {
    $: function (id) { return document.getElementById(id); },

    init: function () {
      var tabs = document.querySelectorAll("#tabbar [data-screen]");
      Array.prototype.forEach.call(tabs, function (b) {
        b.addEventListener("click", function () { KP.UI.show(b.getAttribute("data-screen")); });
      });
      KP.UI.$("banner-update").addEventListener("click", function () { location.reload(); });
      KP.ScreenHome.init();
      KP.ScreenStudy.init();
      KP.ScreenTest.init();
      KP.ScreenProgress.init();
      KP.ScreenWords.init();
      KP.ScreenSettings.init();
    },

    show: function (name, params) {
      var screens = document.querySelectorAll(".screen");
      Array.prototype.forEach.call(screens, function (s) {
        s.hidden = s.id !== "screen-" + name;
      });
      current_ = name;
      KP.UI.$("tabbar").hidden = !!NO_TAB[name];
      var tabs = document.querySelectorAll("#tabbar [data-screen]");
      Array.prototype.forEach.call(tabs, function (b) {
        b.classList.toggle("active", b.getAttribute("data-screen") === name);
      });
      window.scrollTo(0, 0);
      var h = handlers_()[name];
      if (h) h(params || {});
    },

    current: function () { return current_; },

    // 同期のあとなどに、学習中でなければ今の画面を描き直す
    refresh: function () {
      if (current_ && REFRESHABLE[current_]) handlers_()[current_]({});
    },

    toast: function (text) {
      var t = KP.UI.$("toast");
      t.textContent = text;
      t.hidden = false;
      clearTimeout(toastTimer_);
      toastTimer_ = setTimeout(function () { t.hidden = true; }, C.TOAST_MS);
    },

    showUpdateBanner: function () {
      var b = KP.UI.$("banner-update");
      b.textContent = C.MSG.UPDATE_AVAILABLE;
      b.hidden = false;
    }
  };
})();
