const fs = require("fs");
const path = require("path");

export {};

test("App читает runtime state из Zustand и создаёт transition bridge", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../newtab/components/root/App.tsx"),
    "utf8",
  );

  expect(source).toContain("useChromeRuntimeStore");
  expect(source).toContain("createRuntimeActionBridge");
  expect(source).toContain("chrome.tabs.remove");
  expect(source).toContain("chromeRuntimeStore.getState().closeTabs");
});
