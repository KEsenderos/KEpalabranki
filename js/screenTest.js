/* js/screenTest.js — 確認テスト（KP.ScreenTest） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var U = KP.Utils;
  var $ = function (id) { return document.getElementById(id); };

  var range_ = "ALL", count_ = C.TEST_COUNTS[0];
  var cards_ = [], idx_ = 0, correct_ = 0, wrong_ = [], choices_ = [], answered_ = false;
  var lastTest_ = null;

  function step_(name) {
    ["test-setup", "test-run", "test-result"].forEach(function (id) { $(id).hidden = id !== name; });
    window.scrollTo(0, 0);
  }

  function renderSetup_() {
    ["ALL", "MASTERED", "CATEGORY"].forEach(function (r) {
      var b = $("btn-range-" + r.toLowerCase());
      b.classList.toggle("selected", r === range_);
      b.setAttribute("aria-pressed", r === range_ ? "true" : "false");
    });
    $("sel-test-category").hidden = range_ !== "CATEGORY";
    C.TEST_COUNTS.forEach(function (n) {
      var b = $("btn-count-" + n);
      b.classList.toggle("selected", n === count_);
      b.setAttribute("aria-pressed", n === count_ ? "true" : "false");
    });
  }

  function pool_() {
    var cat = $("sel-test-category").value;
    var out = [];
    KP.Data.words.forEach(function (w) {
      if (w.suspended) return;
      var c = KP.Data.cards.get(w.id + ":" + C.DIR.ES_JA);
      if (!c) return;
      if (range_ === "ALL" && !c.seen) return;
      if (range_ === "MASTERED" && KP.SRS.stageOf(c) !== C.STAGE.MASTERED) return;
      if (range_ === "CATEGORY" && w.category !== cat) return;
      out.push(c);
    });
    return out;
  }

  function begin_() {
    var pool = pool_();
    if (pool.length === 0) { KP.UI.toast(C.MSG.TEST_EMPTY); return; }
    cards_ = U.shuffle(pool).slice(0, count_);
    idx_ = 0; correct_ = 0; wrong_ = [];
    step_("test-run");
    showQuestion_();
  }

  function showQuestion_() {
    answered_ = false;
    var card = cards_[idx_], word = KP.Data.wordOf(card);
    $("txt-test-progress").textContent = (idx_ + 1) + " / " + cards_.length;
    $("txt-test-front").textContent = word.es;
    choices_ = KP.Choices.make(card);
    for (var i = 0; i < C.CHOICE_COUNT; i++) {
      var b = $("btn-test-choice-" + i);
      b.hidden = i >= choices_.length;
      b.textContent = choices_[i] ? choices_[i].text : "";
      b.className = "choice";
      b.disabled = false;
    }
    $("txt-test-answer").hidden = true;
    $("btn-test-next").hidden = true;
  }

  function choose_(i) {
    if (answered_ || !choices_[i]) return;
    answered_ = true;
    var card = cards_[idx_], word = KP.Data.wordOf(card);
    var ok = choices_[i].correct;
    for (var k = 0; k < choices_.length; k++) {
      var b = $("btn-test-choice-" + k);
      b.disabled = true;
      if (choices_[k].correct) b.classList.add("choice-ok");
    }
    if (!ok) $("btn-test-choice-" + i).classList.add("choice-ng");
    if (ok) correct_++; else wrong_.push(word.id);
    var a = $("txt-test-answer");
    a.textContent = ok ? "○ 正解" : "× 正解: " + U.meaningMain(word.ja);
    a.className = "result " + (ok ? "result-ok" : "result-ng");
    a.hidden = false;
    $("btn-test-next").hidden = false;
    var now = Date.now();
    KP.Data.recordAnswer(null, {
      id: U.newId("l"), at: now, cardId: card.id, wordId: card.wordId, dir: card.dir,
      result: ok ? C.RESULT.OK : C.RESULT.NG, method: C.METHOD.MC, mode: C.MODE.TEST, updatedAt: now
    }, false, false).catch(function (e) { console.error(e); });
  }

  function next_() {
    idx_++;
    if (idx_ >= cards_.length) finish_(); else showQuestion_();
  }

  function finish_() {
    var now = Date.now();
    var t = {
      id: U.newId("t"), at: now, range: range_,
      rangeValue: range_ === "CATEGORY" ? $("sel-test-category").value : "",
      count: cards_.length, correct: correct_, wrongWordIds: JSON.stringify(wrong_), updatedAt: now
    };
    lastTest_ = t;
    step_("test-result");
    var pct = Math.round(correct_ / cards_.length * 100);
    $("txt-test-score").textContent = correct_ + " / " + cards_.length + "　" + pct + "%";
    var list = $("list-test-wrong");
    list.innerHTML = "";
    wrong_.forEach(function (id) {
      var w = KP.Data.words.get(id);
      var li = document.createElement("li");
      var es = document.createElement("span"); es.className = "w-es"; es.textContent = w.es;
      var ja = document.createElement("span"); ja.className = "w-ja"; ja.textContent = U.meaningMain(w.ja);
      li.appendChild(es); li.appendChild(ja);
      list.appendChild(li);
    });
    $("box-test-wrong").hidden = wrong_.length === 0;
    $("btn-test-review").hidden = wrong_.length === 0;

    KP.DB.getAll("tests").then(function (all) {
      var prev = all.filter(function (x) { return x.range === t.range && x.rangeValue === t.rangeValue; })
        .sort(function (a, b) { return b.at - a.at; })[0];
      if (prev) {
        var pp = Math.round(prev.correct / prev.count * 100), d = pct - pp;
        $("txt-test-compare").textContent = "前回 " + pp + "% → 今回 " + pct + "%（" + (d >= 0 ? "+" : "") + d + "）";
      } else {
        $("txt-test-compare").textContent = "初回";
      }
      all.push(t);
      all.sort(function (a, b) { return a.at - b.at; });
      drawHistory_(all.slice(-C.TEST_HISTORY_MAX));
      return KP.Data.saveTest(t);
    }).catch(function (e) { console.error(e); KP.UI.toast(C.MSG.SAVE_ERROR); });
  }

  function drawHistory_(tests) {
    var W = 320, H = 160, L = 30, R = 10, T = 10, B = 28;
    var n = tests.length;
    var xs = function (i) { return n <= 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (n - 1); };
    var ys = function (p) { return T + (100 - p) * (H - T - B) / 100; };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="正答率の履歴">';
    [0, 50, 100].forEach(function (p) {
      s += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(p) + '" y2="' + ys(p) + '"/>';
      s += '<text class="axis" x="' + (L - 4) + '" y="' + (ys(p) + 4) + '" text-anchor="end">' + p + "</text>";
    });
    var pts = tests.map(function (t, i) {
      return { x: xs(i), y: ys(Math.round(t.correct / t.count * 100)), t: t };
    });
    if (pts.length > 1) {
      s += '<polyline class="line" points="' + pts.map(function (p) { return p.x + "," + p.y; }).join(" ") + '"/>';
    }
    pts.forEach(function (p, i) {
      s += '<circle class="dot" cx="' + p.x + '" cy="' + p.y + '" r="4"/>';
      if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) {
        var d = new Date(p.t.at);
        s += '<text class="axis" x="' + p.x + '" y="' + (H - 8) + '" text-anchor="middle">' + (d.getMonth() + 1) + "/" + d.getDate() + "</text>";
      }
    });
    s += "</svg>";
    $("chart-test-history").innerHTML = s;
  }

  KP.ScreenTest = {
    init: function () {
      ["ALL", "MASTERED", "CATEGORY"].forEach(function (r) {
        $("btn-range-" + r.toLowerCase()).addEventListener("click", function () { range_ = r; renderSetup_(); });
      });
      C.TEST_COUNTS.forEach(function (n) {
        $("btn-count-" + n).addEventListener("click", function () { count_ = n; renderSetup_(); });
      });
      $("btn-test-begin").addEventListener("click", begin_);
      $("btn-test-back").addEventListener("click", function () { KP.UI.show("home"); });
      $("btn-test-quit").addEventListener("click", function () { KP.UI.show("home"); });
      $("btn-test-next").addEventListener("click", next_);
      $("btn-test-home").addEventListener("click", function () { KP.UI.show("home"); });
      $("btn-test-review").addEventListener("click", function () {
        var ids = JSON.parse(lastTest_.wrongWordIds).map(function (id) { return id + ":" + C.DIR.ES_JA; });
        KP.UI.show("study", { session: C.SESSION.CUSTOM, cardIds: ids });
      });
      for (var i = 0; i < C.CHOICE_COUNT; i++) {
        (function (k) { $("btn-test-choice-" + k).addEventListener("click", function () { choose_(k); }); })(i);
      }
      $("btn-test-speak").addEventListener("click", function () {
        if (cards_[idx_]) KP.Speech.speak(U.esSpeak(KP.Data.wordOf(cards_[idx_]).es));
      });
    },

    onShow: function () {
      var sel = $("sel-test-category"), cur = sel.value;
      sel.innerHTML = "";
      KP.Data.categories().forEach(function (c) {
        var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
      });
      if (cur && KP.Data.categories().indexOf(cur) >= 0) sel.value = cur;
      renderSetup_();
      step_("test-setup");
    },

    begin_: begin_, showQuestion_: showQuestion_, choose_: choose_, finish_: finish_, drawHistory_: drawHistory_
  };
})();
