/* js/speech.js — 読み上げ（KP.Speech） — KEpalabranki v1.1.3 */
(function () {
  "use strict";
  var KP = window.KP = window.KP || {};
  var C = KP.Config;
  var voices_ = [];

  function load_() {
    if (!window.speechSynthesis) return;
    voices_ = window.speechSynthesis.getVoices().filter(function (v) {
      return String(v.lang).replace("_", "-").toLowerCase().indexOf("es") === 0;
    });
  }

  function pick_() {
    var uri = KP.Data.settings && KP.Data.settings.voiceURI;
    var i, j, lang;
    if (uri) {
      for (i = 0; i < voices_.length; i++) if (voices_[i].voiceURI === uri) return voices_[i];
    }
    for (j = 0; j < C.SPEECH_LANGS.length; j++) {
      lang = C.SPEECH_LANGS[j].toLowerCase();
      for (i = 0; i < voices_.length; i++) {
        if (String(voices_[i].lang).replace("_", "-").toLowerCase().indexOf(lang) === 0) return voices_[i];
      }
    }
    return voices_[0] || null;
  }

  KP.Speech = {
    init: function () {
      if (!window.speechSynthesis) return;
      load_();
      try {
        window.speechSynthesis.addEventListener("voiceschanged", load_);
      } catch (e) {
        window.speechSynthesis.onvoiceschanged = load_;
      }
    },

    voices: function () { load_(); return voices_.slice(); },

    speak: function (text) {
      if (!window.speechSynthesis || !text) { KP.UI.toast(C.MSG.NO_VOICE); return; }
      load_();
      var v = pick_();
      if (!v) { KP.UI.toast(C.MSG.NO_VOICE); return; }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.voice = v;
      u.lang = v.lang;
      u.rate = C.SPEECH_RATE;
      window.speechSynthesis.speak(u);
    }
  };
})();
