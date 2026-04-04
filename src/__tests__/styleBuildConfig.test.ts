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

  test("folder item uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderItem/FolderItem.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderItem.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("folder group uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderGroup/FolderGroup.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderGroup.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("folder uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Folder/Folder.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Folder.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Sidebar/Sidebar.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Sidebar.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("bookmarks uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Bookmarks/Bookmarks.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Bookmarks.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("editable title uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/EditableTitle/EditableTitle.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/EditableTitle.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("bookmarks importer uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/BookmarksImporter/BookmarksImporter.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/BookmarksImporter.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("import bookmarks from settings uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/ImportBookmarksFromSettings/ImportBookmarksFromSettings.tsx",
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/ImportBookmarksFromSettings.tsx",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("keyboard and mouse manager stays shared in the flat structure", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/KeyboardAndMouseManager.tsx",
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("canvas stays flat because the repo already has components/canvas", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Canvas.tsx",
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("settings options stays shared in the flat structure", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SettingsOptions.tsx",
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("toolbar component was removed", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar/Toolbar.tsx",
    );
    const stylesheetPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar/Toolbar.module.scss",
    );

    expect(fs.existsSync(folderComponentPath)).toBe(false);
    expect(fs.existsSync(stylesheetPath)).toBe(false);
  });

  test("bookmarks local helpers are colocated with bookmarks", () => {
    const colocatedViewStatePath = path.join(
      __dirname,
      "../../src/newtab/components/Bookmarks/getBookmarksViewState.ts",
    );
    const legacyViewStatePath = path.join(
      __dirname,
      "../../src/newtab/components/getBookmarksViewState.ts",
    );
    const colocatedEmptyStatePath = path.join(
      __dirname,
      "../../src/newtab/components/Bookmarks/isEmptyDashboard.ts",
    );
    const legacyEmptyStatePath = path.join(
      __dirname,
      "../../src/newtab/components/isEmptyDashboard.ts",
    );

    expect(fs.existsSync(colocatedViewStatePath)).toBe(true);
    expect(fs.existsSync(legacyViewStatePath)).toBe(false);
    expect(fs.existsSync(colocatedEmptyStatePath)).toBe(true);
    expect(fs.existsSync(legacyEmptyStatePath)).toBe(false);
  });

  test("folder local helpers are colocated with folder", () => {
    const colocatedHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/Folder/getFolderDisplayItems.ts",
    );
    const legacyHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/getFolderDisplayItems.ts",
    );

    expect(fs.existsSync(colocatedHelperPath)).toBe(true);
    expect(fs.existsSync(legacyHelperPath)).toBe(false);
  });
});
