const fs = require("fs");
const path = require("path");

export {};

describe("compiled style selectors", () => {
  test("build emits dist/style.css", () => {
    const cssPath = path.join(__dirname, "../../dist/style.css");

    expect(fs.existsSync(cssPath)).toBe(true);
  });

  test("build does not emit an unused js companion for styles", () => {
    const styleJsPath = path.join(__dirname, "../../dist/js/style.js");

    expect(fs.existsSync(styleJsPath)).toBe(false);
  });

  test("compiled css contains critical newtab selectors", () => {
    const cssPath = path.join(__dirname, "../../dist/style.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain(".app");
    expect(css).toContain(".btn__setting");
    expect(css).toContain(".dropdown-menu");
    expect(css).toContain(".modal-wrapper");
  });

  test("bookmarks module keeps component-owned selectors local", () => {
    const modulePath = path.join(
      __dirname,
      "../newtab/components/common/Bookmarks/Bookmarks.module.scss",
    );
    const moduleScss = fs.readFileSync(modulePath, "utf8");

    expect(moduleScss).not.toMatch(/:global\(\.bookmarks-box\)/);
    expect(moduleScss).not.toMatch(/:global\(\.empty-dashboard/);
    expect(moduleScss).toContain("&:global(.bookmarks)");
  });
});
