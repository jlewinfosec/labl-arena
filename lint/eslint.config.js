const globals = require("globals");
module.exports = [{
  files: ["all.js"],
  languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.browser, qrcode: "readonly", QRCode: "readonly", jsQR: "readonly" } },
  rules: { "no-undef": "error" }
}];
