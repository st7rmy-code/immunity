// Единая точка запуска браузера для всех тестов.
// PW_BROWSER=chromium (по умолчанию) | chrome | msedge | webkit | firefox
// chrome/msedge — установленные браузеры (channel), webkit ≈ Safari.
const pw = require('playwright');
const fs = require('fs');
const NAME = process.env.PW_BROWSER || 'chromium';
async function launch(opts = {}) {
  if (NAME === 'webkit') return pw.webkit.launch(opts);
  if (NAME === 'firefox') return pw.firefox.launch(opts);
  if (NAME === 'chrome') {
    const exe = ['/opt/google/chrome/chrome', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));
    return pw.chromium.launch(Object.assign({}, opts, exe ? { executablePath: exe } : { channel: 'chrome' }));
  }
  if (NAME === 'msedge') return pw.chromium.launch(Object.assign({}, opts, { channel: 'msedge' }));
  return pw.chromium.launch(opts);
}
// аргументы chromium другим движкам не нужны
const args = a => (NAME === 'webkit' || NAME === 'firefox') ? {} : { args: a };
module.exports = { launch, args, NAME };
