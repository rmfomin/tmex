const fs = require("fs");
const path = require("path");

export {};

test("spaces list keeps global drag-and-drop class hooks", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/components/common/SpacesList/SpacesList.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("spaces-list");
  expect(source).toContain("spaces-list__item");
  expect(source).toContain("spaces-list__delete-button");
});
