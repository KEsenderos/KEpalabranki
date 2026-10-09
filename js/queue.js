/* js/queue.js — 出題の順番（KP.Queue） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  var session_ = null;
  var list_ = [];        // [{id, phase}]
  var newPool_ = [];     // 新しい単語の ES_JA カードid（order 順）
  var newPos_ = 0;
  var hadDue_ = false;   // 開始時に復習があったか
  var reviewDoneShown_ = false;
  var lastId_ = null;

  function active_(card) {
    var w = KP.Data.wordOf(card);
    return !!w && !w.suspended;
  }

  function takeNew_() {
    while (newPos_ < newPool_.length) {
      var c = KP.Data.cards.get(newPool_[newPos_++]);
      if (c && !c.seen && active_(c)) return { id: c.id, phase: "NEW" };
    }
    return null;
  }

  KP.Queue = {
    start: function (session, cardIds) {
      var today = KP.Utils.dayStr();
      var D = KP.Data, all = [];
      D.cards.forEach(function (c) { all.push(c); });
      session_ = session; list_ = []; newPool_ = []; newPos_ = 0;
      reviewDoneShown_ = false; lastId_ = null;

      if (session === C.SESSION.NORMAL) {
        var due = KP.Utils.shuffle(all.filter(function (c) { return KP.SRS.isDue(c, today) && active_(c); }));
        due.sort(function (a, b) { return a.dueDay < b.dueDay ? -1 : a.dueDay > b.dueDay ? 1 : 0; });
        list_ = due.map(function (c) { return { id: c.id, phase: "DUE" }; });
        hadDue_ = list_.length > 0;
        var rev = all.filter(function (c) { return c.dir === C.DIR.JA_ES && c.unlocked && !c.seen && active_(c); });
        rev.sort(function (a, b) { return a.unlockedAt - b.unlockedAt; });
        rev.forEach(function (c) { list_.push({ id: c.id, phase: "REVERSE" }); });
        var news = all.filter(function (c) { return c.dir === C.DIR.ES_JA && !c.seen && active_(c); });
        news.sort(function (a, b) { return D.wordOf(a).order - D.wordOf(b).order; });
        newPool_ = news.map(function (c) { return c.id; });
      } else if (session === C.SESSION.AHEAD) {
        var ahead = all.filter(function (c) { return KP.SRS.isAhead(c, today) && active_(c); });
        ahead.sort(function (a, b) { return a.dueDay < b.dueDay ? -1 : a.dueDay > b.dueDay ? 1 : 0; });
        list_ = ahead.map(function (c) { return { id: c.id, phase: "AHEAD" }; });
        hadDue_ = false;
      } else {
        list_ = (cardIds || []).filter(function (id) { return D.cards.has(id); })
          .map(function (id) { return { id: id, phase: "CUSTOM" }; });
        hadDue_ = false;
      }
    },

    // 戻り値 {card, phase, reviewDone} または null
    next: function () {
      var reviewDone = false;
      if (list_.length === 0 && session_ === C.SESSION.NORMAL) {
        var n = takeNew_();
        if (n) {
          list_.push(n);
          if (hadDue_ && !reviewDoneShown_) { reviewDone = true; reviewDoneShown_ = true; }
        }
      }
      if (list_.length === 0) return null;
      if (list_[0].id === lastId_ && list_.length > 1) {
        var t = list_[0]; list_[0] = list_[1]; list_[1] = t;
      }
      var item = list_.shift();
      lastId_ = item.id;
      return { card: KP.Data.cards.get(item.id), phase: item.phase, reviewDone: reviewDone };
    },

    requeue: function (card) {
      var pos = C.RELEARN_GAP - 1;
      if (session_ === C.SESSION.NORMAL) {
        while (list_.length < pos) {
          var n = takeNew_();
          if (!n) break;
          list_.push(n);
        }
      }
      list_.splice(Math.min(pos, list_.length), 0, { id: card.id, phase: "RELEARN" });
    },

    remainingDue: function () {
      return list_.filter(function (x) { return x.phase === "DUE"; }).length;
    }
  };
})();
