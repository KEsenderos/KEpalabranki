/* js/importer.js — CSV取り込み（KP.Importer） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var U = null;

  var STANDARD_MAP = {
    spanish: "es", japanese: "ja", category: "category", pos: "pos", gender: "gender",
    example_es: "exEs", example_ja: "exJa", note: "note", source: "source"
  };

  function normGender_(g) {
    g = String(g || "").trim().toLowerCase();
    if (g === "m" || g === "男性" || g === "el") return "m";
    if (g === "f" || g === "女性" || g === "la") return "f";
    return "";
  }

  function fromKelupalabrasRow_(row) {
    if (row.length !== 4) return null;
    var es = row[0].trim();
    var lines = U.splitJa(row[1]).filter(function (l) { return !/^\s*〔[^〕]*〕\s*$/.test(l); });
    var ja = lines.join("<br>").trim();
    if (es === "" || ja === "") return null;
    return {
      es: es, ja: ja, pos: row[2].trim(), category: row[2].trim(), source: row[3].trim(),
      gender: U.genderFromJa(ja), exEs: "", exJa: "", note: ""
    };
  }

  function fromStandardRow_(row, idx) {
    var f = {};
    Object.keys(idx).forEach(function (key) {
      var v = row[idx[key]];
      f[key] = v == null ? "" : String(v).trim();
    });
    if (!f.es || !f.ja || !f.category) return null;
    if ("gender" in f) f.gender = normGender_(f.gender);
    return f;
  }

  KP.Importer = {
    fromKelupalabrasRow_: fromKelupalabrasRow_,
    fromStandardRow_: fromStandardRow_,

    // 戻り値 {format, items:[{fields, existingId}], newCount, dupCount, badCount} または {format:null}
    analyze: function (text) {
      U = KP.Utils;
      var rows = U.parseCsv(text);
      if (rows.length === 0) return { format: null };
      var format = null, idx = null, body = rows;
      var head = rows[0][0].replace(/\s/g, "").toLowerCase();
      if (head === "spanish") {
        format = "STANDARD";
        idx = {};
        rows[0].forEach(function (h, i) {
          var k = STANDARD_MAP[String(h).replace(/\s/g, "").toLowerCase()];
          if (k && !(k in idx)) idx[k] = i;
        });
        if (!("es" in idx) || !("ja" in idx) || !("category" in idx)) return { format: null };
        body = rows.slice(1);
      } else if (rows.every(function (r) { return r.length === 4; })) {
        format = "KELUPALABRAS";
      } else {
        return { format: null };
      }

      var esIdx = KP.Data.esIndex();
      var seen = {};
      var items = [], newCount = 0, dupCount = 0, badCount = 0;
      body.forEach(function (r) {
        var f = format === "STANDARD" ? fromStandardRow_(r, idx) : fromKelupalabrasRow_(r);
        if (!f) { badCount++; return; }
        var key = U.normEs(f.es);
        if (seen[key]) { dupCount++; return; }
        seen[key] = true;
        var ex = esIdx.get(key);
        if (ex) dupCount++; else newCount++;
        items.push({ fields: f, existingId: ex ? ex.id : null });
      });
      return { format: format, items: items, newCount: newCount, dupCount: dupCount, badCount: badCount };
    },

    // dupMode: "SKIP" | "OVERWRITE"。戻り値 Promise<{added, updated}>
    run: function (analysis, dupMode) {
      var news = [], upd = [];
      analysis.items.forEach(function (it) {
        if (!it.existingId) { news.push(it.fields); return; }
        if (dupMode !== "OVERWRITE") return;
        var f = {};
        Object.keys(it.fields).forEach(function (k) {
          if (k !== "es" && it.fields[k] !== "") f[k] = it.fields[k];
        });
        upd.push({ id: it.existingId, fields: f });
      });
      var p1 = news.length ? KP.Data.createWords(news) : Promise.resolve([]);
      return p1.then(function () {
        return upd.length ? KP.Data.updateWords(upd) : [];
      }).then(function () {
        return { added: news.length, updated: upd.length };
      });
    }
  };
})();
