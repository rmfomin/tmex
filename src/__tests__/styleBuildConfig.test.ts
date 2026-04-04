const fs = require("fs");
const path = require("path");
const { getCommonConfig } = require("../../webpack/webpack.common");

export {};

describe("style build configuration", () => {
  test("newtab html keeps linking the compiled style.css asset", () => {
    const htmlPath = path.join(__dirname, "../../public/newtab.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('href="style.css"');
  });

  test("scss is the only source stylesheet for the compiled asset", () => {
    const scssPath = path.join(__dirname, "../../public/style.scss");
    const legacyCssPath = path.join(__dirname, "../../public/style.css");

    expect(fs.existsSync(scssPath)).toBe(true);
    expect(fs.existsSync(legacyCssPath)).toBe(false);
  });

  test("webpack supports component scss modules", () => {
    const config = getCommonConfig({});
    const moduleRule = config.module.rules.find((rule: { test?: RegExp }) =>
      String(rule.test).includes("module"),
    );

    expect(moduleRule).toBeDefined();
  });
});
