const fs = require("fs");
const path = require("path");

export {};

test("search input is rendered from sidebar instead of top bar", () => {
  const sidebarSource = fs.readFileSync(
    path.join(__dirname, "../newtab/components/common/Sidebar/Sidebar.tsx"),
    "utf8"
  );
  const topBarSource = fs.readFileSync(
    path.join(__dirname, "../newtab/components/common/TopBar/TopBar.tsx"),
    "utf8"
  );

  expect(sidebarSource).toContain("<SearchInput");
  expect(sidebarSource).toContain("search={p.appState.search}");
  expect(topBarSource).not.toContain('className="search"');
  expect(topBarSource).not.toContain("handleSearchKeyDown");
});
