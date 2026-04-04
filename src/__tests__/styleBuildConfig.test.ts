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

  test("notification uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Notification/Notification.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Notification.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("spaces list uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SpacesList/SpacesList.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SpacesList.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("top bar uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/TopBar/TopBar.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/TopBar.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("toolbar uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar/Toolbar.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar item uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarItem/SidebarItem.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarItem.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar open tabs uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarOpenTabs/SidebarOpenTabs.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarOpenTabs.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar recent uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarRecent/SidebarRecent.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarRecent.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });
});
