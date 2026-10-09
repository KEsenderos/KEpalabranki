/* js/utils.js — 日付・文字・CSVの補助（KP.Utils） — KEpalabranki v1.0.1 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;

  function pad2_(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDay_(d) { return d.getFullYear() + "-" + pad2_(d.getMonth() + 1) + "-" + pad2_(d.getDate()); }

  function stripTags_(s) { return String(s || "").replace(/<[^>]*>/g, ""); }

  KP.Utils = {
    // 1日の区切りは DAY_START_HOUR（4時）。現地時刻から4時間引いた日付
    dayStr: function (date) {
      var d = date || new Date();
      return fmtDay_(new Date(d.getTime() - C.DAY_START_HOUR * 3600000));
    },

    addDays: function (day, n) {
      var p = String(day).split("-");
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n, 12, 0, 0);
      return fmtDay_(d);
    },

    newId: function (prefix) {
      var r = Math.random().toString(36).slice(2, 6);
      while (r.length < 4) r += "0";
      return prefix + Date.now().toString(36) + r;
    },

    normEs: function (s) {
      return String(s || "").normalize("NFC").trim().replace(/\s+/g, " ");
    },

    splitJa: function (ja) {
      return String(ja || "").split(/<br\s*\/?>/i);
    },

    stripTags: stripTags_,

    meaningMain: function (ja) {
      var first = stripTags_(KP.Utils.splitJa(ja)[0]);
      return first.replace(C.POS_PAREN_RE, "").trim();
    },

    jaFront: function (ja) {
      var lines = KP.Utils.splitJa(ja);
      var out = [lines[0]];
      if (lines.length > 1 && lines[1].trim() !== "" && !C.LATIN_RE.test(stripTags_(lines[1]))) {
        out.push(lines[1]);
      }
      return out.join("<br>");
    },

    esSpeak: function (es) {
      return String(es || "").split("（")[0].trim();
    },

    genderFromJa: function (ja) {
      var first = KP.Utils.splitJa(ja)[0];
      if (first.indexOf("（名詞・女性）") >= 0) return "f";
      if (first.indexOf("（名詞・男性）") >= 0) return "m";
      return "";
    },

    escapeHtml: function (s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    // 全部エスケープしてから <br> <i> </i> <b> </b> だけ戻す
    safeHtml: function (s) {
      return KP.Utils.escapeHtml(s).replace(/&lt;(\/?)(br|i|b)\s*\/?&gt;/gi, function (m, slash, tag) {
        tag = tag.toLowerCase();
        if (tag === "br") return "<br>";
        return "<" + slash + tag + ">";
      });
    },

    // RFC4180。BOM除去。空行を除く
    parseCsv: function (text) {
      var s = String(text || "");
      if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
      var rows = [], row = [], field = "", i = 0, inQ = false, ch;
      while (i < s.length) {
        ch = s[i];
        if (inQ) {
          if (ch === '"') {
            if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
            inQ = false; i++; continue;
          }
          field += ch; i++; continue;
        }
        if (ch === '"') { inQ = true; i++; continue; }
        if (ch === ",") { row.push(field); field = ""; i++; continue; }
        if (ch === "\r") { i++; continue; }
        if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
        field += ch; i++;
      }
      if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
      return rows.filter(function (r) {
        return !(r.length === 1 && r[0].trim() === "") && r.some(function (c) { return c.trim() !== ""; });
      });
    },

    shuffle: function (arr) {
      var a = arr.slice(), j, t;
      for (var i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },

    fmtDateTime: function (ms) {
      var d = new Date(ms);
      return pad2_(d.getMonth() + 1) + "/" + pad2_(d.getDate()) + " " + pad2_(d.getHours()) + ":" + pad2_(d.getMinutes());
    },

    debounce: function (fn, ms) {
      var t = null;
      return function () {
        var self = this, args = arguments;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(self, args); }, ms);
      };
    },

    clamp: function (v, min, max) { return Math.min(max, Math.max(min, v)); },

    fill: function (template, values) {
      return String(template).replace(/\{(\w+)\}/g, function (m, k) {
        return values && values[k] != null ? values[k] : m;
      });
    }
  };
})();
