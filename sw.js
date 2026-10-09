/* sw.js — オフライン用キャッシュ・更新検出 — KEpalabranki v1.1.4 */
"use strict";
var CACHE_VERSION = "1.1.4"; // KP.Config.APP_VERSION と同じ値にする
var CACHE_NAME = "kp-cache-" + CACHE_VERSION;
var APP_SHELL_FILES = [
  "./", "./index.html", "./manifest.webmanifest", "./css/style.css",
  "./js/config.js", "./js/utils.js", "./js/db.js", "./js/data.js", "./js/srs.js", "./js/queue.js",
  "./js/choices.js", "./js/stats.js", "./js/speech.js", "./js/importer.js", "./js/sync.js", "./js/ui.js",
  "./js/screenHome.js", "./js/screenStudy.js", "./js/screenTest.js", "./js/screenProgress.js",
  "./js/screenWords.js", "./js/screenSettings.js", "./js/conj.js", "./js/screenConj.js", "./js/main.js",
  "./data/conjugations.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./icons/favicon.ico", "./icons/favicon-32.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(APP_SHELL_FILES); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// 自分のサイトの GET だけをキャッシュ優先で返す（GASへの通信は通さない）
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // v1.1: data フォルダ（活用データ）はネット優先。つながらなければキャッシュ
  if (new URL(req.url).pathname.indexOf("/data/") >= 0) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      if (res.ok) caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req);
  }));
});
