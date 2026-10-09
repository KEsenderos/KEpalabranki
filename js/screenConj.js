/* js/screenConj.js — 活用タブ（KP.ScreenConj） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var U = KP.Utils;
  var $ = function (id) { return document.getElementById(id); };

  var tenses_ = [];
  var verbs_ = [];
  var qs_ = [];       // 出題済みの問題
  var q_ = null;
  var idx_ = 0, correct_ = 0, wrong_ = [], answered_ = false, lastVerb_ = null;

  function step_(name) {
    ["conj-setup", "conj-run", "conj-result"].forEach(function (id) { $(id).hidden = id !== name; });
    $("tabbar").hidden = name !== "conj-setup";
    window.scrollTo(0, 0);
  }

  function renderTenseBtns_() {
    C.CONJ_TENSES.forEach(function (tt) {
      var b = $("btn-conj-tense-" + tt[0]);
      var on = tenses_.indexOf(tt[0]) >= 0;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("btn-conj-begin").disabled = !KP.Conj.loaded() || verbs_.length === 0 || tenses_.length === 0;
  }

  function renderSetup_() {
    var ok = KP.Conj.loaded();
    $("txt-conj-data").textContent = ok ? "活用データ: " + KP.Conj.dataVersion() + "・" + KP.Conj.count() + "動詞" : C.MSG.CONJ_LOAD_ERROR;
    verbs_ = ok ? KP.Conj.quizVerbs() : [];
    $("txt-conj-verbs").textContent = !ok ? "" : verbs_.length ? "出題できる動詞: " + verbs_.length + "個（単語帳で学習した動詞）" : C.MSG.CONJ_NO_VERBS;
    var miss = ok ? KP.Conj.missingVerbs() : [];
    $("box-conj-missing").hidden = miss.length === 0;
    $("txt-conj-missing-msg").textContent = U.fill(C.MSG.CONJ_MISSING, { n: miss.length });
    $("txt-conj-missing").hidden = true;
    renderTenseBtns_();
    KP.Conj.tenseStats().then(function (st) {
      var ul = $("list-conj-stats");
      ul.innerHTML = "";
      if (!st.length) { var li0 = document.createElement("li"); li0.className = "muted"; li0.textContent = "まだ記録がありません"; ul.appendChild(li0); return; }
      st.forEach(function (x) {
        var li = document.createElement("li");
        li.textContent = x.label;
        var n = document.createElement("span"); n.className = "num";
        n.textContent = Math.round(x.ok / x.total * 100) + "%（" + x.total + "問）";
        li.appendChild(n); ul.appendChild(li);
      });
    });
  }

  function copyMissing_() {
    var text = KP.Conj.missingVerbs().join("、");
    var shown = function () { var t = $("txt-conj-missing"); t.textContent = text; t.hidden = false; };
    try {
      navigator.clipboard.writeText(text).then(function () { KP.UI.toast(C.MSG.CONJ_COPIED); }, shown);
    } catch (e) { shown(); }
  }

  function begin_() {
    if (!verbs_.length || !tenses_.length) return;
    idx_ = 0; correct_ = 0; wrong_ = []; lastVerb_ = null; qs_ = [];
    step_("conj-run");
    showQuestion_();
  }

  function nextVerb_() {
    if (verbs_.length === 1) return verbs_[0];
    var v;
    do { v = verbs_[Math.floor(Math.random() * verbs_.length)]; } while (v === lastVerb_);
    lastVerb_ = v;
    return v;
  }

  function showQuestion_() {
    answered_ = false;
    q_ = KP.Conj.makeQuestion(nextVerb_(), tenses_);
    $("txt-conj-progress").textContent = (idx_ + 1) + " / " + C.CONJ_QUIZ_COUNT;
    $("txt-conj-qtype").textContent = q_.qtype === C.CONJ_QTYPE.FORM ? "活用形を選ぶ" : "どの活用か選ぶ";
    $("txt-conj-prompt").textContent = q_.prompt;
    for (var i = 0; i < C.CHOICE_COUNT; i++) {
      var b = $("btn-conj-choice-" + i);
      var c = q_.choices[i];
      b.hidden = !c;
      b.textContent = c ? c.text : "";
      b.className = "choice";
      b.disabled = false;
    }
    $("txt-conj-result").hidden = true;
    $("box-conj-table").hidden = true;
    $("btn-conj-next").hidden = true;
  }

  function choose_(i) {
    if (answered_ || !q_.choices[i]) return;
    answered_ = true;
    var ch = q_.choices[i], ok = ch.correct;
    for (var k = 0; k < q_.choices.length; k++) {
      var b = $("btn-conj-choice-" + k);
      b.disabled = true;
      if (q_.choices[k].correct) b.classList.add("choice-ok");
    }
    if (!ok) $("btn-conj-choice-" + i).classList.add("choice-ng");
    if (ok) correct_++;
    else wrong_.push(q_);
    var right = q_.choices.filter(function (c) { return c.correct; })[0];
    var r = $("txt-conj-result");
    r.textContent = ok ? "○ 正解" : "× 正解: " + right.text;
    r.className = "result " + (ok ? "result-ok" : "result-ng");
    r.hidden = false;
    renderTable_(q_, ok ? null : ch);
    $("btn-conj-next").textContent = idx_ + 1 >= C.CONJ_QUIZ_COUNT ? "結果を見る" : "次へ";
    $("btn-conj-next").hidden = false;
    var now = Date.now();
    KP.Data.saveConjLog({ id: U.newId("c"), at: now, verb: q_.inf, tense: q_.tense, person: q_.person,
      qtype: q_.qtype, result: ok ? C.RESULT.OK : C.RESULT.NG, updatedAt: now }).catch(function (e) { console.error(e); });
    var t = document.querySelector("#list-conj-table .cell-asked");
    try { (t ? t.closest(".conj-tense") : $("box-conj-table")).scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { /* 無視 */ }
  }

  function renderTable_(q, chosen) {
    var v = KP.Conj.get(q.inf);
    $("txt-conj-inf").textContent = q.inf;
    $("txt-conj-meaning").textContent = KP.Conj.meaningOf(q.inf);
    $("txt-conj-type").textContent = v.typeLabel;
    $("txt-conj-note").textContent = v.note || "";
    $("txt-conj-note").hidden = !v.note;
    $("txt-conj-parts").textContent = "現在分詞 " + v.ger + " ／ 過去分詞 " + v.pp;
    var box = $("list-conj-table");
    box.innerHTML = "";
    C.CONJ_TENSES.forEach(function (tt) {
      var forms = v.t[tt[0]];
      var sec = document.createElement("div"); sec.className = "conj-tense";
      var h = document.createElement("div"); h.className = "conj-tense-h"; h.textContent = tt[1];
      sec.appendChild(h);
      var tbl = document.createElement("table"); tbl.className = "conj-table";
      for (var p = 0; p < 6; p++) {
        var tr = document.createElement("tr");
        if (p === C.CONJ_SKIP_PERSON) tr.className = "vos";
        var th = document.createElement("th"); th.textContent = C.CONJ_PERSONS_SHORT[p];
        var td = document.createElement("td");
        var f = forms[p];
        td.textContent = f == null ? "—" : f;
        if (f != null) {
          if (tt[0] === q.tense && p === q.person) td.classList.add("cell-asked");
          else if (q.qtype === C.CONJ_QTYPE.SLOT && f === q.form) td.classList.add("cell-same");
          if (chosen) {
            var hitForm = q.qtype === C.CONJ_QTYPE.FORM && f === chosen.text;
            var hitSlot = q.qtype === C.CONJ_QTYPE.SLOT && tt[0] === chosen.tense && p === chosen.person;
            if (hitForm || hitSlot) td.classList.add("cell-wrong");
          }
        }
        tr.appendChild(th); tr.appendChild(td); tbl.appendChild(tr);
      }
      sec.appendChild(tbl);
      box.appendChild(sec);
    });
    $("box-conj-table").hidden = false;
  }

  function next_() {
    idx_++;
    if (idx_ >= C.CONJ_QUIZ_COUNT) finish_(); else showQuestion_();
  }

  function finish_() {
    step_("conj-result");
    $("txt-conj-score").textContent = correct_ + " / " + C.CONJ_QUIZ_COUNT + "　" + Math.round(correct_ / C.CONJ_QUIZ_COUNT * 100) + "%";
    var ul = $("list-conj-wrong");
    ul.innerHTML = "";
    wrong_.forEach(function (q) {
      var li = document.createElement("li");
      li.textContent = q.form + "（" + q.inf + "）＝" + KP.Conj.tenseLabel(q.tense) + "・" + C.CONJ_PERSONS[q.person];
      ul.appendChild(li);
    });
    $("box-conj-wrong").hidden = wrong_.length === 0;
    KP.Sync.syncNow({ silent: true });
  }

  KP.ScreenConj = {
    init: function () {
      C.CONJ_TENSES.forEach(function (tt) {
        $("btn-conj-tense-" + tt[0]).addEventListener("click", function () {
          var i = tenses_.indexOf(tt[0]);
          if (i >= 0) tenses_.splice(i, 1); else tenses_.push(tt[0]);
          KP.Data.saveSettings({ conjTenses: tenses_.slice() });
          renderTenseBtns_();
        });
      });
      $("btn-conj-begin").addEventListener("click", begin_);
      $("btn-conj-copy-missing").addEventListener("click", copyMissing_);
      $("btn-conj-quit").addEventListener("click", function () { step_("conj-setup"); renderSetup_(); });
      $("btn-conj-next").addEventListener("click", next_);
      $("btn-conj-again").addEventListener("click", begin_);
      $("btn-conj-back").addEventListener("click", function () { step_("conj-setup"); renderSetup_(); });
      $("btn-conj-speak").addEventListener("click", function () {
        if (q_) KP.Speech.speak(q_.qtype === C.CONJ_QTYPE.FORM ? q_.inf : q_.form);
      });
      for (var i = 0; i < C.CHOICE_COUNT; i++) {
        (function (k) { $("btn-conj-choice-" + k).addEventListener("click", function () { choose_(k); }); })(i);
      }
    },

    onShow: function () {
      var saved = KP.Data.settings.conjTenses;
      tenses_ = (Array.isArray(saved) ? saved : C.CONJ_TENSES_DEFAULT).filter(function (k) {
        return C.CONJ_TENSES.some(function (tt) { return tt[0] === k; });
      });
      step_("conj-setup");
      $("txt-conj-data").textContent = "活用データを読み込み中…";
      KP.Conj.load().then(renderSetup_);
    },

    renderSetup_: renderSetup_, begin_: begin_, showQuestion_: showQuestion_, choose_: choose_,
    renderTable_: renderTable_, next_: next_, finish_: finish_, copyMissing_: copyMissing_
  };
})();
