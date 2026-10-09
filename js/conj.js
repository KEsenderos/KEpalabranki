/* js/conj.js — 活用データの読み込み・問題作り（KP.Conj） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  var data_ = null;
  var loading_ = null;

  function tenseLabel_(key) {
    for (var i = 0; i < C.CONJ_TENSES.length; i++) if (C.CONJ_TENSES[i][0] === key) return C.CONJ_TENSES[i][1];
    return key;
  }

  function pick_(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // 単語帳の動詞（出題停止を除く）の原形 → 最初の単語
  function verbWords_(seenOnly) {
    var m = new Map();
    var list = [];
    KP.Data.words.forEach(function (w) { list.push(w); });
    list.sort(function (a, b) { return a.order - b.order; });
    list.forEach(function (w) {
      if (w.pos !== "動詞" || w.suspended) return;
      if (seenOnly) {
        var c = KP.Data.cards.get(w.id + ":" + C.DIR.ES_JA);
        if (!c || !c.seen) return;
      }
      var inf = KP.Utils.infinitiveOf(w);
      if (inf && !m.has(inf)) m.set(inf, w);
    });
    return m;
  }

  // 出題できるマス（vosotros と命令法の yo を除く）
  function slots_(verb, tenses) {
    var out = [];
    tenses.forEach(function (t) {
      var forms = verb.t[t];
      if (!forms) return;
      for (var p = 0; p < 6; p++) {
        if (p === C.CONJ_SKIP_PERSON || forms[p] == null) continue;
        out.push({ tense: t, person: p, form: forms[p] });
      }
    });
    return out;
  }

  function allCells_(verb) {
    var out = [];
    C.CONJ_TENSES.forEach(function (tt) {
      var forms = verb.t[tt[0]];
      if (!forms) return;
      for (var p = 0; p < 6; p++) if (forms[p] != null) out.push({ tense: tt[0], person: p, form: forms[p] });
    });
    return out;
  }

  function slotLabel_(s) { return tenseLabel_(s.tense) + "・" + C.CONJ_PERSONS[s.person]; }

  KP.Conj = {
    tenseLabel: tenseLabel_,

    load: function () {
      if (data_) return Promise.resolve(true);
      if (loading_) return loading_;
      loading_ = fetch(C.CONJ_DATA_URL).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).then(function (j) {
        if (!j || !j.verbs) throw new Error("BAD_DATA");
        data_ = j; loading_ = null; return true;
      }, function (e) {
        console.error(e); loading_ = null; return false;
      });
      return loading_;
    },

    loaded: function () { return !!data_; },
    has: function (inf) { return !!(data_ && data_.verbs[inf]); },
    get: function (inf) { return data_ ? data_.verbs[inf] : null; },
    dataVersion: function () { return data_ ? data_.dataVersion : ""; },
    count: function () { return data_ ? Object.keys(data_.verbs).length : 0; },

    quizVerbs: function () {
      var out = [];
      verbWords_(true).forEach(function (w, inf) { if (KP.Conj.has(inf)) out.push(inf); });
      return out;
    },

    missingVerbs: function () {
      var out = [];
      verbWords_(false).forEach(function (w, inf) { if (!KP.Conj.has(inf)) out.push(inf); });
      return out;
    },

    meaningOf: function (inf) {
      var w = verbWords_(false).get(inf);
      return w ? KP.Utils.meaningMain(w.ja) : "";
    },

    makeQuestion: function (inf, tenses) {
      var verb = KP.Conj.get(inf);
      var cand = slots_(verb, tenses);
      var ask = pick_(cand);
      var qtype = Math.random() < 0.5 ? C.CONJ_QTYPE.FORM : C.CONJ_QTYPE.SLOT;
      var cells = allCells_(verb);
      var choices = [];
      var used = {};
      var prompt;
      if (qtype === C.CONJ_QTYPE.FORM) {
        prompt = KP.Utils.fill(C.MSG.CONJ_FORM_Q, {
          inf: inf, meaning: KP.Conj.meaningOf(inf), tense: tenseLabel_(ask.tense), person: C.CONJ_PERSONS[ask.person]
        });
        used[ask.form] = true;
        choices.push({ text: ask.form, tense: ask.tense, person: ask.person, correct: true });
        var sameT = KP.Utils.shuffle(cells.filter(function (c) { return c.tense === ask.tense && c.person !== ask.person; }));
        var sameP = KP.Utils.shuffle(cells.filter(function (c) { return c.person === ask.person && c.tense !== ask.tense; }));
        var rest = KP.Utils.shuffle(cells);
        var pools = [sameT, sameP, sameT, sameP, rest];
        pools.forEach(function (pool) {
          if (choices.length >= C.CHOICE_COUNT) return;
          for (var i = 0; i < pool.length; i++) {
            if (!used[pool[i].form]) {
              used[pool[i].form] = true;
              choices.push({ text: pool[i].form, tense: pool[i].tense, person: pool[i].person, correct: false });
              return;
            }
          }
        });
        // 足りなければ全マスから
        for (var j = 0; j < rest.length && choices.length < C.CHOICE_COUNT; j++) {
          if (!used[rest[j].form]) {
            used[rest[j].form] = true;
            choices.push({ text: rest[j].form, tense: rest[j].tense, person: rest[j].person, correct: false });
          }
        }
      } else {
        prompt = KP.Utils.fill(C.MSG.CONJ_SLOT_Q, { form: ask.form, inf: inf });
        choices.push({ text: slotLabel_(ask), tense: ask.tense, person: ask.person, correct: true });
        var others = cells.filter(function (c) { return c.form !== ask.form && c.person !== C.CONJ_SKIP_PERSON; });
        var oT = KP.Utils.shuffle(others.filter(function (c) { return c.tense === ask.tense; }));
        var oP = KP.Utils.shuffle(others.filter(function (c) { return c.person === ask.person; }));
        var oR = KP.Utils.shuffle(others);
        [oT, oP, oT, oP, oR, oR, oR].forEach(function (pool) {
          if (choices.length >= C.CHOICE_COUNT) return;
          for (var i = 0; i < pool.length; i++) {
            var lab = slotLabel_(pool[i]);
            if (!used[lab] && lab !== choices[0].text) {
              used[lab] = true;
              choices.push({ text: lab, tense: pool[i].tense, person: pool[i].person, correct: false });
              return;
            }
          }
        });
      }
      return { inf: inf, tense: ask.tense, person: ask.person, form: ask.form, qtype: qtype, prompt: prompt,
        choices: KP.Utils.shuffle(choices) };
    },

    tenseStats: function () {
      return KP.DB.getAll("conjLogs").then(function (logs) {
        logs.sort(function (a, b) { return b.at - a.at; });
        logs = logs.slice(0, C.CONJ_STATS_RECENT);
        var m = {};
        logs.forEach(function (l) {
          var x = m[l.tense] || (m[l.tense] = { tense: l.tense, label: tenseLabel_(l.tense), ok: 0, total: 0 });
          x.total++;
          if (l.result === C.RESULT.OK) x.ok++;
        });
        return Object.keys(m).map(function (k) { return m[k]; })
          .sort(function (a, b) { return a.ok / a.total - b.ok / b.total; });
      }, function () { return []; });
    }
  };
})();
