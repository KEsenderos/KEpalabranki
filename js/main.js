/* js/main.js — 起動（KP.Main） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var swReg_ = null;
  var lastCheck_ = 0;

  function registerServiceWorker_() {
    if (!("serviceWorker" in navigator)) return;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (hadController) KP.UI.showUpdateBanner();
    });
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      swReg_ = reg; lastCheck_ = Date.now();
    }).catch(function (e) { console.error(e); });
  }

  function checkUpdate_() {
    if (!swReg_ || Date.now() - lastCheck_ < C.UPDATE_CHECK_MIN_MS) return;
    lastCheck_ = Date.now();
    swReg_.update().catch(function () { /* 無視 */ });
  }

  function fatal_(text) {
    var f = document.getElementById("fatal");
    f.textContent = text;
    f.hidden = false;
  }

  KP.Main = {
    start: function () {
      KP.DB.open().then(function () {
        return KP.Data.loadAll();
      }).then(function () {
        KP.Speech.init();
        KP.UI.init();
        KP.UI.show("home");
        registerServiceWorker_();
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(function () { /* 無視 */ });
        }
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            KP.Sync.syncNow({ silent: true });
          } else {
            checkUpdate_();
            KP.UI.refresh();
          }
        });
        KP.Sync.syncNow({ silent: true });
      }).catch(function (e) {
        console.error(e);
        fatal_(C.MSG.NO_STORAGE);
      });
    },

    registerServiceWorker_: registerServiceWorker_,
    checkUpdate_: checkUpdate_
  };

  document.addEventListener("DOMContentLoaded", KP.Main.start);
})();
