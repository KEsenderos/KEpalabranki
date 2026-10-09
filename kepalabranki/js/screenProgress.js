/* js/screenProgress.js — 進捗（KP.ScreenProgress） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = [["UNSEEN", "unseen"], ["LEARNING", "learning"], ["SETTLED", "settled"], ["MASTERED", "mastered"]];

  KP.ScreenProgress = {
    init: function () {},

    onShow: function () {
      var r = KP.Stats.stageCounts();
      var bar = $("stage-bar");
      bar.innerHTML = "";
      KEYS.forEach(function (k) {
        var n = r[k[0]], pct = r.total ? Math.round(n / r.total * 1000) / 10 : 0;
        $("txt-stage-" + k[1]).textContent = n + "語（" + pct + "%）";
        if (n > 0) {
          var seg = document.createElement("div");
          seg.className = "seg seg-" + k[1];
          seg.style.width = (r.total ? n / r.total * 100 : 0) + "%";
          bar.appendChild(seg);
        }
      });
      $("txt-total-words").textContent = r.total + "語";
      $("txt-reverse-count").textContent = KP.Stats.reverseCount() + "語";
      $("txt-progress-streak").textContent = KP.Stats.streak() + "日";
    }
  };
})();
