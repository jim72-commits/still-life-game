// GDPR NOTE: This implementation uses Google Analytics 4 with default settings.
// Before publishing to EU audiences consider adding a cookie consent banner
// or switching to a privacy-first analytics provider like Plausible.io

const Analytics = {
  _send(eventName, params) {
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName, params);
      }
    } catch (_) { /* analytics should never break the game */ }
  },

  levelStart(levelNumber) {
    this._send("level_start", { level_number: levelNumber });
  },

  levelComplete(levelNumber, attemptCount) {
    this._send("level_complete", {
      level_number: levelNumber,
      attempt_count: attemptCount,
    });
  },

  levelFail(levelNumber) {
    this._send("level_fail", { level_number: levelNumber });
  },

  hintUsed(levelNumber, hintType) {
    this._send("hint_used", {
      level_number: levelNumber,
      hint_type: hintType,
    });
  },

  chapterComplete(chapterName, rating) {
    this._send("chapter_complete", {
      chapter_name: chapterName,
      rating: rating,
    });
  },

  cutsceneSkipped() {
    this._send("cutscene_skipped", {});
  },
};
