/* js/screenWords.js — 単語帳・編集・取り込み（KP.ScreenWords） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var U = KP.Utils;
  var $ = function (id) { return document.getElementById(id); };

  var limit_ = C.WORD_LIST_PAGE;
  var editingId_ = null;
  var analysis_ = null;

  var STAGE_CLASS = {};
  STAGE_CLASS[C.STAGE.UNSEEN] = "unseen"; STAGE_CLASS[C.STAGE.LEARNING] = "learning";
  STAGE_CLASS[C.STAGE.SETTLED] = "settled"; STAGE_CLASS[C.STAGE.MASTERED] = "mastered";

  function filtered_() {
    var q = $("input-word-search").value.trim().toLowerCase();
    var cat = $("sel-word-category").value;
    var out = [];
    KP.Data.words.forEach(function (w) {
      if (cat && w.category !== cat) return;
      if (q && w.es.toLowerCase().indexOf(q) < 0 && U.stripTags(w.ja).toLowerCase().indexOf(q) < 0) return;
      out.push(w);
    });
    out.sort(function (a, b) { return a.order - b.order; });
    return out;
  }

  function renderList_() {
    var all = filtered_();
    $("txt-word-count").textContent = all.length + "語";
    var list = $("list-words");
    list.innerHTML = "";
    var frag = document.createDocumentFragment();
    all.slice(0, limit_).forEach(function (w) {
      var li = document.createElement("li");
      li.setAttribute("data-id", w.id);
      var st = KP.SRS.stageOf(KP.Data.cards.get(w.id + ":" + C.DIR.ES_JA));
      var dot = document.createElement("span");
      dot.className = "stage-dot " + STAGE_CLASS[st];
      dot.title = st;
      var es = document.createElement("span"); es.className = "w-es"; es.textContent = w.es;
      var ja = document.createElement("span"); ja.className = "w-ja"; ja.textContent = U.meaningMain(w.ja);
      li.appendChild(dot); li.appendChild(es); li.appendChild(ja);
      frag.appendChild(li);
    });
    list.appendChild(frag);
    $("btn-word-more").hidden = all.length <= limit_;
  }

  function fillCategoryLists_() {
    var cats = KP.Data.categories();
    var sel = $("sel-word-category"), cur = sel.value;
    sel.innerHTML = '<option value="">すべてのカテゴリ</option>';
    cats.forEach(function (c) {
      var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o);
    });
    sel.value = cats.indexOf(cur) >= 0 ? cur : "";
    var dl = $("list-categories");
    dl.innerHTML = "";
    cats.forEach(function (c) { var o = document.createElement("option"); o.value = c; dl.appendChild(o); });
    var pos = {};
    KP.Data.words.forEach(function (w) { if (w.pos) pos[w.pos] = true; });
    var dp = $("list-pos");
    dp.innerHTML = "";
    Object.keys(pos).sort().forEach(function (p) { var o = document.createElement("option"); o.value = p; dp.appendChild(o); });
  }

  function openEdit_(id) {
    editingId_ = id || null;
    var w = id ? KP.Data.words.get(id) : null;
    $("txt-we-title").textContent = w ? "単語の編集" : "単語の追加";
    $("input-we-es").value = w ? w.es : "";
    $("input-we-ja").value = w ? String(w.ja).replace(/<br\s*\/?>/gi, "\n") : "";
    $("input-we-category").value = w ? w.category : "";
    $("input-we-pos").value = w ? w.pos : "";
    $("sel-we-gender").value = w ? w.gender : "";
    $("input-we-ex-es").value = w ? w.exEs : "";
    $("input-we-ex-ja").value = w ? w.exJa : "";
    $("input-we-note").value = w ? w.note : "";
    $("input-we-source").value = w ? w.source : "";
    KP.UI.show("word-edit");
  }

  function save_() {
    var f = {
      es: $("input-we-es").value.trim(),
      ja: $("input-we-ja").value.trim().replace(/\r?\n/g, "<br>"),
      category: $("input-we-category").value.trim(),
      pos: $("input-we-pos").value.trim(),
      gender: $("sel-we-gender").value,
      exEs: $("input-we-ex-es").value.trim(),
      exJa: $("input-we-ex-ja").value.trim(),
      note: $("input-we-note").value.trim(),
      source: $("input-we-source").value.trim()
    };
    if (!f.es || !f.ja || !f.category) { KP.UI.toast(C.MSG.WORD_REQUIRED); return; }
    var dup = KP.Data.esIndex().get(U.normEs(f.es));
    if (dup && dup.id !== editingId_) { KP.UI.toast(C.MSG.WORD_DUPLICATE); return; }
    var p = editingId_ ? KP.Data.updateWord(editingId_, f) : KP.Data.createWord(f);
    p.then(function () {
      KP.UI.toast(C.MSG.WORD_SAVED);
      KP.Sync.syncNow({ silent: true });
      KP.UI.show("words");
    }, function (e) { console.error(e); KP.UI.toast(C.MSG.SAVE_ERROR); });
  }

  function openImport_() {
    analysis_ = null;
    $("input-import-file").value = "";
    $("txt-import-summary").textContent = "CSVファイルを選んでください";
    $("btn-import-run").disabled = true;
    $("sel-import-dup").value = "SKIP";
    KP.UI.show("import");
  }

  function onFile_(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      analysis_ = KP.Importer.analyze(String(reader.result));
      if (!analysis_.format) {
        $("txt-import-summary").textContent = C.MSG.IMPORT_BAD_FORMAT;
        $("btn-import-run").disabled = true;
        return;
      }
      $("txt-import-summary").textContent =
        "形式: " + (analysis_.format === "STANDARD" ? "標準" : "KElupalabras") +
        "／新規 " + analysis_.newCount + "語／重複 " + analysis_.dupCount + "語／読めない行 " + analysis_.badCount + "行";
      $("btn-import-run").disabled = false;
    };
    reader.onerror = function () { $("txt-import-summary").textContent = C.MSG.IMPORT_BAD_FORMAT; };
    reader.readAsText(file, "utf-8");
  }

  function runImport_() {
    if (!analysis_ || !analysis_.format) return;
    $("btn-import-run").disabled = true;
    KP.Importer.run(analysis_, $("sel-import-dup").value).then(function (r) {
      KP.UI.toast(U.fill(C.MSG.IMPORT_DONE, { n: r.added, m: r.updated }));
      KP.Sync.syncNow({ silent: true });
      KP.UI.show("words");
    }, function (e) {
      console.error(e);
      KP.UI.toast(C.MSG.SAVE_ERROR);
      $("btn-import-run").disabled = false;
    });
  }

  KP.ScreenWords = {
    init: function () {
      var deb = U.debounce(function () { limit_ = C.WORD_LIST_PAGE; renderList_(); }, C.SEARCH_DELAY_MS);
      $("input-word-search").addEventListener("input", deb);
      $("sel-word-category").addEventListener("change", function () { limit_ = C.WORD_LIST_PAGE; renderList_(); });
      $("btn-word-more").addEventListener("click", function () { limit_ += C.WORD_LIST_PAGE; renderList_(); });
      $("list-words").addEventListener("click", function (e) {
        var li = e.target.closest("li[data-id]");
        if (li) openEdit_(li.getAttribute("data-id"));
      });
      $("btn-word-add").addEventListener("click", function () { openEdit_(null); });
      $("btn-word-import").addEventListener("click", openImport_);
      $("btn-we-save").addEventListener("click", save_);
      $("btn-we-cancel").addEventListener("click", function () { KP.UI.show("words"); });
      $("btn-we-speak").addEventListener("click", function () {
        KP.Speech.speak(U.esSpeak($("input-we-es").value));
      });
      $("btn-import-choose").addEventListener("click", function () { $("input-import-file").click(); });
      $("input-import-file").addEventListener("change", function (e) { onFile_(e.target.files[0]); });
      $("btn-import-run").addEventListener("click", runImport_);
      $("btn-import-cancel").addEventListener("click", function () { KP.UI.show("words"); });
    },

    onShow: function () {
      limit_ = C.WORD_LIST_PAGE;
      fillCategoryLists_();
      renderList_();
    },

    renderList_: renderList_, openEdit_: openEdit_, save_: save_, openImport_: openImport_, runImport_: runImport_
  };
})();
