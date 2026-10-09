/* js/choices.js — 4択の作成（KP.Choices） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  // 日→スペの動詞は原形（v1.1）
  function textOf_(w, isEsJa) {
    if (isEsJa) return KP.Utils.meaningMain(w.ja);
    return w.pos === "動詞" ? KP.Utils.infinitiveOf(w) : w.es;
  }

  KP.Choices = {
    // 戻り値 [{text, wordId, correct}]（シャッフル済み）
    make: function (card) {
      var word = KP.Data.wordOf(card);
      var isEsJa = card.dir === C.DIR.ES_JA;
      var correctText = textOf_(word, isEsJa);
      var used = {}; used[correctText] = true;
      var need = C.CHOICE_COUNT - 1;
      var picked = [];

      function collect_(filterFn) {
        var cand = [];
        KP.Data.words.forEach(function (w) {
          if (w.suspended || w.id === word.id || !filterFn(w)) return;
          var t = textOf_(w, isEsJa);
          if (t === "" || used[t]) return;
          cand.push({ w: w, t: t });
        });
        cand = KP.Utils.shuffle(cand);
        for (var i = 0; i < cand.length && picked.length < need; i++) {
          if (used[cand[i].t]) continue;
          used[cand[i].t] = true;
          picked.push({ text: cand[i].t, wordId: cand[i].w.id, correct: false });
        }
      }

      collect_(function (w) { return w.category === word.category; });
      if (picked.length < need) collect_(function () { return true; });
      picked.push({ text: correctText, wordId: word.id, correct: true });
      return KP.Utils.shuffle(picked);
    }
  };
})();
