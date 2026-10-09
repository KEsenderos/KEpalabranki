/* js/screenStudy.js — 学習（KP.ScreenStudy） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var U = KP.Utils;
  var $ = function (id) { return document.getElementById(id); };

  var session_ = null;
  var item_ = null;       // {card, phase}
  var choices_ = [];
  var answered_ = false;
  var answerCount_ = 0;
  var fix_ = null;        // 5.3b 訂正用の写し {beforeCard, beforeRev, done}

  function choiceBtn_(i) { return $("btn-choice-" + i); }

  function updateProgress_() {
    $("txt-study-progress").textContent = "今日 " + KP.Data.todayCount() + " / " + KP.Data.settings.goal;
  }

  function showCard_(item) {
    item_ = item; answered_ = false;
    var card = item.card, word = KP.Data.wordOf(card);
    var esJa = card.dir === C.DIR.ES_JA;
    $("txt-study-phase").textContent = C.PHASE_LABEL[item.phase] || "";
    var badge = $("badge-dir");
    badge.textContent = esJa ? "スペ→日" : "日→スペ";
    badge.classList.toggle("badge-rev", !esJa);
    var front = $("txt-front");
    if (esJa) { front.textContent = word.es; front.className = "front front-es"; }
    else { front.innerHTML = U.safeHtml(U.jaFront(word.ja, word.pos)); front.className = "front front-ja"; }
    $("btn-speak").hidden = !esJa;

    choices_ = KP.Choices.make(card);
    var showMc = choices_.length >= 2;
    $("area-choices").hidden = !showMc;
    for (var i = 0; i < C.CHOICE_COUNT; i++) {
      var b = choiceBtn_(i);
      b.hidden = i >= choices_.length;
      b.textContent = "？";
      b.className = "choice masked";
      b.disabled = true;
    }
    $("btn-reveal-choices").hidden = !showMc;
    $("row-judge").hidden = false;
    $("area-answer").hidden = true;
    $("btn-next").hidden = true;
    updateProgress_();
  }

  function reveal_() {
    if (answered_) return;
    for (var i = 0; i < choices_.length; i++) {
      var b = choiceBtn_(i);
      b.textContent = choices_[i].text;
      b.className = "choice";
      b.disabled = false;
    }
    $("btn-reveal-choices").hidden = true;
    $("row-judge").hidden = true;
  }

  function choose_(i) {
    if (answered_ || !choices_[i]) return;
    var ok = choices_[i].correct;
    for (var k = 0; k < choices_.length; k++) {
      var b = choiceBtn_(k);
      b.disabled = true;
      if (choices_[k].correct) b.classList.add("choice-ok");
    }
    if (!ok) choiceBtn_(i).classList.add("choice-ng");
    answer_(ok ? C.RESULT.OK : C.RESULT.NG, C.METHOD.MC);
  }

  function answer_(result, method) {
    if (answered_) return;
    answered_ = true;
    var card = item_.card, word = KP.Data.wordOf(card);
    var today = U.dayStr();
    fix_ = null;
    if (result === C.RESULT.OK && method === C.METHOD.SELF) {
      var rv = KP.Data.cards.get(card.wordId + ":" + C.DIR.JA_ES);
      fix_ = { beforeCard: Object.assign({}, card), beforeRev: rv ? Object.assign({}, rv) : null };
    }
    var r = KP.SRS.applyAnswer(card, result, method, today);
    var now = Date.now();
    var log = {
      id: U.newId("l"), at: now, cardId: card.id, wordId: card.wordId, dir: card.dir,
      result: result, method: method, mode: C.MODE.STUDY, updatedAt: now
    };
    KP.Data.recordAnswer(r.card, log, r.unlockReverse, true).catch(function (e) {
      console.error(e); KP.UI.toast(C.MSG.SAVE_ERROR);
    });
    if (r.requeue) KP.Queue.requeue(r.card);

    // 答えの表示
    if (method === C.METHOD.SELF) $("area-choices").hidden = true;
    $("btn-reveal-choices").hidden = true;
    $("row-judge").hidden = true;
    var ok = result === C.RESULT.OK;
    var res = $("txt-result");
    res.textContent = ok ? "○ 正解" : "× もう一度出ます";
    res.className = "result " + (ok ? "result-ok" : "result-ng");
    $("btn-fix-ng").hidden = !fix_;
    var verbRev = card.dir === C.DIR.JA_ES && word.pos === "動詞";
    var es = $("txt-answer-es");
    es.innerHTML = "";
    if (word.gender === "m" || word.gender === "f") {
      var g = document.createElement("span");
      g.className = "gender gender-" + word.gender;
      g.textContent = C.GENDER_LABEL[word.gender] + " ";
      es.appendChild(g);
    }
    es.appendChild(document.createTextNode(verbRev ? U.infinitiveOf(word) : word.es));
    var orig = $("txt-answer-orig");
    orig.hidden = !verbRev;
    orig.textContent = verbRev ? "記事中の形: " + word.es : "";
    $("txt-answer-ja").innerHTML = U.safeHtml(word.ja);
    var ex = $("txt-answer-ex");
    if (word.exEs || word.exJa) {
      ex.innerHTML = "<div class=\"ex-es\">" + U.escapeHtml(word.exEs) + "</div><div class=\"ex-ja\">" + U.escapeHtml(word.exJa) + "</div>";
      ex.hidden = false;
    } else { ex.hidden = true; ex.innerHTML = ""; }
    $("area-answer").hidden = false;
    $("btn-next").hidden = false;
    updateProgress_();
    // 4択の下に出た答えが画面の外に隠れないように
    try { $("area-answer").scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { /* 無視 */ }

    // 目標達成
    var goal = KP.Data.settings.goal;
    if (KP.Data.todayCount() >= goal && KP.Data.celebratedDay !== today) {
      KP.Data.setMeta("celebratedDay", today);
      celebrate_();
    }
    answerCount_++;
    if (answerCount_ % C.SYNC_EVERY_ANSWERS === 0) KP.Sync.syncNow({ silent: true });
  }

  // 5.3b 「やっぱり間違い」
  function fix_ng_() {
    if (!fix_ || !item_) return;
    var f = fix_; fix_ = null;
    $("btn-fix-ng").hidden = true;
    var today = U.dayStr();
    var r = KP.SRS.applyAnswer(f.beforeCard, C.RESULT.NG, C.METHOD.SELF, today);
    var rev = null;
    var curRev = KP.Data.cards.get(f.beforeCard.wordId + ":" + C.DIR.JA_ES);
    if (f.beforeRev && !f.beforeRev.unlocked && curRev && curRev.unlocked) {
      rev = Object.assign({}, curRev, { unlocked: false, unlockedAt: 0 });
    }
    var now = Date.now(), c = f.beforeCard;
    var log = { id: U.newId("l"), at: now, cardId: c.id, wordId: c.wordId, dir: c.dir,
      result: C.RESULT.NG, method: C.METHOD.SELF, mode: C.MODE.FIX, updatedAt: now };
    KP.Data.fixAnswer(r.card, rev, log).catch(function (e) { console.error(e); KP.UI.toast(C.MSG.SAVE_ERROR); });
    KP.Queue.requeue(r.card);
    var res = $("txt-result");
    res.textContent = "× もう一度出ます";
    res.className = "result result-ng";
    KP.UI.toast(C.MSG.FIX_DONE);
  }

  function next_() {
    var item = KP.Queue.next();
    if (!item) {
      var msg = session_ === C.SESSION.NORMAL ? C.MSG.ALL_DONE
        : session_ === C.SESSION.AHEAD ? C.MSG.AHEAD_DONE : "";
      if (msg) KP.UI.toast(msg);
      end_();
      return;
    }
    if (item.reviewDone) KP.UI.toast(C.MSG.REVIEW_DONE);
    showCard_(item);
  }

  function end_() {
    KP.Sync.syncNow({ silent: true });
    KP.UI.show("home");
  }

  function celebrate_() {
    var o = $("overlay-goal");
    o.textContent = C.MSG.GOAL_DONE;
    o.hidden = false;
    o.classList.remove("play");
    void o.offsetWidth; // アニメーションをやり直すため
    o.classList.add("play");
    setTimeout(function () { o.hidden = true; o.classList.remove("play"); }, C.GOAL_OVERLAY_MS);
  }

  KP.ScreenStudy = {
    init: function () {
      $("btn-study-end").addEventListener("click", end_);
      $("btn-ok").addEventListener("click", function () { answer_(C.RESULT.OK, C.METHOD.SELF); });
      $("btn-ng").addEventListener("click", function () { answer_(C.RESULT.NG, C.METHOD.SELF); });
      $("btn-reveal-choices").addEventListener("click", reveal_);
      $("btn-next").addEventListener("click", next_);
      for (var i = 0; i < C.CHOICE_COUNT; i++) {
        (function (k) { choiceBtn_(k).addEventListener("click", function () { choose_(k); }); })(i);
      }
      $("btn-speak").addEventListener("click", function () {
        if (item_) KP.Speech.speak(U.esSpeak(KP.Data.wordOf(item_.card).es));
      });
      $("btn-speak-answer").addEventListener("click", function () {
        if (!item_) return;
        var w = KP.Data.wordOf(item_.card);
        var verbRev = item_.card.dir === C.DIR.JA_ES && w.pos === "動詞";
        KP.Speech.speak(verbRev ? U.infinitiveOf(w) : U.esSpeak(w.es));
      });
      $("btn-fix-ng").addEventListener("click", fix_ng_);
    },

    onShow: function (params) {
      session_ = params.session || C.SESSION.NORMAL;
      answerCount_ = 0;
      KP.Queue.start(session_, params.cardIds);
      next_();
    },

    showCard_: showCard_, reveal_: reveal_, answer_: answer_, next_: next_, end_: end_, celebrate_: celebrate_, fix_: fix_ng_
  };
})();
