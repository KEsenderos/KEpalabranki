/* js/stats.js — 段階・連続日数・予定数（KP.Stats） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  function activeCards_(fn) {
    var n = 0;
    KP.Data.cards.forEach(function (c) {
      var w = KP.Data.wordOf(c);
      if (w && !w.suspended && fn(c)) n++;
    });
    return n;
  }

  KP.Stats = {
    stageCounts: function () {
      var r = { UNSEEN: 0, LEARNING: 0, SETTLED: 0, MASTERED: 0, total: 0 };
      var key = {}; key[C.STAGE.UNSEEN] = "UNSEEN"; key[C.STAGE.LEARNING] = "LEARNING";
      key[C.STAGE.SETTLED] = "SETTLED"; key[C.STAGE.MASTERED] = "MASTERED";
      KP.Data.words.forEach(function (w) {
        if (w.suspended) return;
        var c = KP.Data.cards.get(w.id + ":" + C.DIR.ES_JA);
        r[key[KP.SRS.stageOf(c)]]++;
        r.total++;
      });
      return r;
    },

    streak: function () {
      var d = KP.Utils.dayStr(), n = 0;
      function has_(day) { var x = KP.Data.daily.get(day); return !!x && x.answers > 0; }
      if (!has_(d)) d = KP.Utils.addDays(d, -1);
      while (has_(d)) { n++; d = KP.Utils.addDays(d, -1); }
      return n;
    },

    dueCount: function () {
      var t = KP.Utils.dayStr();
      return activeCards_(function (c) { return KP.SRS.isDue(c, t); });
    },

    tomorrowCount: function () {
      var t1 = KP.Utils.addDays(KP.Utils.dayStr(), 1);
      return activeCards_(function (c) { return c.unlocked && c.seen && c.dueDay === t1; });
    },

    weekCount: function () {
      var t = KP.Utils.dayStr(), t1 = KP.Utils.addDays(t, 1), t7 = KP.Utils.addDays(t, 7);
      return activeCards_(function (c) { return c.unlocked && c.seen && c.dueDay >= t1 && c.dueDay <= t7; });
    },

    aheadCount: function () {
      var t = KP.Utils.dayStr();
      return activeCards_(function (c) { return KP.SRS.isAhead(c, t); });
    },

    reverseCount: function () {
      return activeCards_(function (c) { return c.dir === C.DIR.JA_ES && c.unlocked; });
    },

    rebuildDaily: function () {
      return KP.DB.getAll("logs").then(function (logs) {
        var m = new Map();
        logs.forEach(function (l) {
          if (l.mode !== C.MODE.STUDY) return;
          var d = KP.Utils.dayStr(new Date(l.at));
          var cur = m.get(d) || { day: d, answers: 0 };
          cur.answers++;
          m.set(d, cur);
        });
        KP.Data.daily = m;
        var arr = [];
        m.forEach(function (v) { arr.push(v); });
        return KP.DB.clear("daily").then(function () { return KP.DB.putMany("daily", arr); });
      });
    }
  };
})();
