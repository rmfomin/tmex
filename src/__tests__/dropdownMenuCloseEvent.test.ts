const fs = require("fs");
const path = require("path");

export {};

test("dropdown menu closes on outside click instead of mousedown", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/components/common/DropdownMenu/DropdownMenu.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("window.setTimeout");
  expect(source).toContain(
    'document.addEventListener("click", onOutsideClick)'
  );
  expect(source).toContain(
    'document.removeEventListener("click", onOutsideClick)'
  );
  expect(source).not.toContain('document.addEventListener("mousedown"');
});
