const fs = require("fs");
const path = require("path");

export {};

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("folder and group header contracts", () => {
  test("folder title enters edit mode via double click instead of single click", () => {
    const source = readSource("newtab/components/Folder/Folder.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
  });

  test("group header supports a context menu with rename and open-all actions", () => {
    const source = readSource("newtab/components/FolderGroup/FolderGroup.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
    expect(source).toContain("Rename");
    expect(source).toContain("Open all tabs");
    expect(source).toContain("onContextMenu={onHeaderContextMenu}");
  });
});
