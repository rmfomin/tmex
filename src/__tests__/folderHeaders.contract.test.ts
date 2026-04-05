const fs = require("fs");
const path = require("path");

export {};

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("folder and group header contracts", () => {
  test("group header styles keep the title row aligned with inner items", () => {
    const source = readSource("newtab/components/FolderGroup/FolderGroup.module.scss");

    expect(source).toContain("padding-left: 22px;");
  });

  test("group hover background is drawn with an inset pseudo element", () => {
    const source = readSource("newtab/components/FolderGroup/FolderGroup.module.scss");

    expect(source).toContain(":global(.folder-group::before)");
    expect(source).toContain("inset: 0 0 0 10px;");
    expect(source).toContain("z-index: 0;");
    expect(source).toContain(":global(.folder-group__header) {");
    expect(source).toContain(":global(.folder-group__items) {");
  });

  test("folder title enters edit mode via double click instead of single click", () => {
    const source = readSource("newtab/components/Folder/Folder.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
  });

  test("group header supports a context menu with rename and open-all actions", () => {
    const source = readSource("newtab/components/FolderGroup/FolderGroup.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
    expect(source).toMatch(
      /<button[\s\S]*className=\{CL\("folder-group__toggle"[\s\S]*<\/button>[\s\S]*<EditableTitle/,
    );
    expect(source).toContain("Rename");
    expect(source).toContain("Open all tabs");
    expect(source).toContain("onContextMenu={onHeaderContextMenu}");
  });
});
