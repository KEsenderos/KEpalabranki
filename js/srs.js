/* js/srs.js — 間隔反復の計算（KP.SRS） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  KP.SRS = {
    applyAnswer: function (card, result, method, today) {
      var c = Object.assign({}, card), wasInterval = c.intervalDays;
      c.lastAnsweredAt = Date.now();
      if (result === C.RESULT.NG) {
        if (wasInterval >= 1) { c.lapses += 1; c.ease = Math.max(C.EASE_MIN, c.ease - C.EASE_DOWN); }
        c.streak = 0; c.intervalDays = 0; c.dueDay = today; c.wrongTotal += 1; c.seen = true;
        return { card: c, requeue: true, unlockReverse: false };
      }
      if (c.seen && wasInterval >= 1 && c.dueDay > today) { // 先取り
        c.correctTotal += 1;
        return { card: c, requeue: false, unlockReverse: false };
      }
      c.streak += 1;
      var n = c.streak === 1 ? C.FIRST_INTERVAL
        : c.streak === 2 ? C.SECOND_INTERVAL
          : Math.max(wasInterval + 1, Math.round(wasInterval * c.ease));
      n = Math.min(n, C.MAX_INTERVAL);
      if (method === C.METHOD.MC) n = Math.max(1, Math.round(n * C.MC_FACTOR));
      else if (wasInterval >= 1) c.ease = Math.min(C.EASE_MAX, c.ease + C.EASE_UP);
      c.intervalDays = n; c.dueDay = KP.Utils.addDays(today, n);
      c.correctTotal += 1; c.seen = true;
      var unlock = c.dir === C.DIR.ES_JA && n >= C.UNLOCK_REVERSE_DAYS;
      return { card: c, requeue: false, unlockReverse: unlock };
    },

    isDue: function (card, today) {
      return card.unlocked && card.seen && card.dueDay !== "" && card.dueDay <= today;
    },

    isAhead: function (card, today) {
      return card.unlocked && card.seen && card.intervalDays >= 1 && card.dueDay > today;
    },

    stageOf: function (card) {
      if (!card || !card.seen) return C.STAGE.UNSEEN;
      if (card.intervalDays < C.STAGE_SETTLED_DAYS) return C.STAGE.LEARNING;
      if (card.intervalDays < C.STAGE_MASTERED_DAYS) return C.STAGE.SETTLED;
      return C.STAGE.MASTERED;
    }
  };
})();
