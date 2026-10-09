/* gas/Code.gs — スプレッドシート同期（Apps Script） — KEpalabranki v1.0.1
 * Script Properties: SYNC_TOKEN（合言葉）, SEQ（通し番号）
 * 初回だけ setupSheets を手で実行する。
 */

var FIELDS = {
  words: ['id', 'es', 'ja', 'category', 'pos', 'gender', 'exEs', 'exJa', 'note', 'source',
    'suspended', 'order', 'createdAt', 'updatedAt', 'seq'],
  cards: ['id', 'wordId', 'dir', 'unlocked', 'unlockedAt', 'seen', 'streak', 'intervalDays',
    'ease', 'dueDay', 'correctTotal', 'wrongTotal', 'lapses', 'lastAnsweredAt', 'updatedAt', 'seq'],
  logs: ['id', 'at', 'cardId', 'wordId', 'dir', 'result', 'method', 'mode', 'updatedAt', 'seq'],
  tests: ['id', 'at', 'range', 'rangeValue', 'count', 'correct', 'wrongWordIds', 'updatedAt', 'seq']
};
var SHEETS = ['words', 'cards', 'logs', 'tests'];
var APPEND_ONLY = { logs: true, tests: true };

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  SHEETS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var h = FIELDS[name];
    sh.getRange(1, 1, sh.getMaxRows(), h.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  ['シート1', 'Sheet1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SEQ')) props.setProperty('SEQ', '0');
  var token = props.getProperty('SYNC_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('SYNC_TOKEN', token);
  }
  console.log('合言葉: ' + token);
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
    if (!token || req.token !== token) return json_({ ok: false, error: 'AUTH' });
    if (req.action === 'ping') return json_({ ok: true, serverNow: Date.now() });
    if (req.action === 'push') { push_(req.data || {}); return json_({ ok: true, serverNow: Date.now() }); }
    if (req.action === 'pull') return json_(pull_(Number(req.sinceSeq) || 0, Number(req.limit) || 3000));
    return json_({ ok: false, error: 'BAD_REQUEST' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'SERVER' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 値を文字にする。=,+,-,@ で始まる文字は数式にならないよう ' を付ける
function esc_(v) {
  if (v === null || v === undefined) return '';
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  var s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function push_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = PropertiesService.getScriptProperties();
    var seq = Number(props.getProperty('SEQ')) || 0;
    SHEETS.forEach(function (name) {
      var recs = data[name] || [];
      if (recs.length === 0) return;
      var sh = ss.getSheetByName(name);
      var h = FIELDS[name];
      var updCol = h.indexOf('updatedAt');
      var lastRow = sh.getLastRow();
      var n = Math.max(lastRow - 1, 0);
      var values = [], idToRow = {}, changed = false;
      if (n > 0) {
        if (APPEND_ONLY[name]) {
          sh.getRange(2, 1, n, 1).getValues().forEach(function (r, i) { idToRow[String(r[0])] = i; });
        } else {
          values = sh.getRange(2, 1, n, h.length).getValues();
          values.forEach(function (r, i) { idToRow[String(r[0])] = i; });
        }
      }
      var newRows = [];
      recs.forEach(function (rec) {
        var id = String(rec.id);
        var i = idToRow[id];
        if (i !== undefined) {
          if (APPEND_ONLY[name]) return;
          if (i >= 0) {
            if (Number(values[i][updCol]) >= Number(rec.updatedAt)) return; // 同じか新しいものが既にある
            seq++;
            values[i] = rowOf_(rec, h, seq);
            changed = true;
          } else {
            var j = -i - 1; // 同じ送信の中で追加した行
            if (Number(newRows[j][updCol]) >= Number(rec.updatedAt)) return;
            seq++;
            newRows[j] = rowOf_(rec, h, seq);
          }
          return;
        }
        seq++;
        newRows.push(rowOf_(rec, h, seq));
        idToRow[id] = -newRows.length; // 追加分は負の番号で覚える
      });
      if (changed && values.length) sh.getRange(2, 1, values.length, h.length).setValues(values);
      if (newRows.length) {
        var start = lastRow + 1;
        var need = start + newRows.length - 1 - sh.getMaxRows();
        if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
        var rg = sh.getRange(start, 1, newRows.length, h.length);
        rg.setNumberFormat('@');
        rg.setValues(newRows);
      }
    });
    props.setProperty('SEQ', String(seq));
  } finally {
    lock.releaseLock();
  }
}

function rowOf_(rec, h, seq) {
  return h.map(function (f) { return f === 'seq' ? String(seq) : esc_(rec[f]); });
}

function pull_(sinceSeq, limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var items = [];
  SHEETS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    var h = FIELDS[name];
    var n = sh.getLastRow() - 1;
    if (n <= 0) return;
    var seqCol = h.indexOf('seq');
    sh.getRange(2, 1, n, h.length).getValues().forEach(function (r) {
      var s = Number(r[seqCol]) || 0;
      if (s <= sinceSeq) return;
      var o = {};
      h.forEach(function (f, i) { if (f !== 'seq') o[f] = r[i]; });
      items.push({ store: name, seq: s, rec: o });
    });
  });
  items.sort(function (a, b) { return a.seq - b.seq; });
  var page = items.slice(0, limit);
  var data = { words: [], cards: [], logs: [], tests: [] };
  page.forEach(function (x) { data[x.store].push(x.rec); });
  return {
    ok: true, serverNow: Date.now(), data: data,
    lastSeq: page.length ? page[page.length - 1].seq : sinceSeq,
    more: items.length > limit
  };
}
