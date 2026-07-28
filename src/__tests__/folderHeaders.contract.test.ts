const fs = require("fs");
const path = require("path");

export {};

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("folder and group header contracts", () => {
  test("group header styles keep the title row aligned with inner items", () => {
    const source = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.module.scss"
    );

    expect(source).toContain("padding-left: 22px;");
  });

  test("group hover background is drawn with an inset pseudo element", () => {
    const source = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.module.scss"
    );

    expect(source).toContain("&::before");
    expect(source).toContain("inset: 0 0 0 15px;");
    expect(source).toContain("z-index: 0;");
    expect(source).toContain(".header {");
    expect(source).toContain(".items {");
  });

  test("folder title enters edit mode via double click instead of single click", () => {
    const source = readSource("newtab/components/common/Folder/Folder.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
  });

  test("group header supports a context menu with rename and open-all actions", () => {
    const source = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.tsx"
    );

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
    expect(source).toMatch(
      /<button[\s\S]*className=\{cn\(styles\.toggle[\s\S]*<\/button>[\s\S]*<EditableTitle/
    );
    expect(source).toContain("Rename");
    expect(source).toContain("Open all tabs");
    expect(source).toContain("onContextMenu={onHeaderContextMenu}");
  });

  test("group rename uses a compact single-line input", () => {
    const groupSource = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.tsx"
    );
    const editableTitleSource = readSource(
      "newtab/components/common/EditableTitle/EditableTitle.tsx"
    );
    const groupStyles = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.module.scss"
    );

    expect(groupSource).toMatch(/<EditableTitle[\s\S]*singleLine/);
    expect(editableTitleSource).toContain("singleLine?: boolean;");
    expect(editableTitleSource).toMatch(
      /p\.singleLine \? \(\s*<input[\s\S]*?\) : \(\s*<textarea/
    );
    expect(groupStyles).toMatch(
      /\.header input\.title \{[\s\S]*background: none;/
    );
  });

  test("group open-all action opens non-archived group bookmarks in background tabs", () => {
    const source = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.tsx"
    );

    const openAllFunction = source.match(
      /function onOpenAllTabs\(\) \{([\s\S]*?)\n  \}/
    )?.[1];

    expect(openAllFunction).toContain("p.items.forEach");
    expect(openAllFunction).toContain("!item.archived");
    expect(openAllFunction).toContain(
      "chrome.tabs.create({ url: item.url, active: false })"
    );
    expect(openAllFunction).toContain("setShowMenu(false)");
  });

  test("group header menu confirms before deleting the group", () => {
    const source = readSource(
      "newtab/components/common/FolderGroup/FolderGroup.tsx"
    );

    const deleteFunction = source.match(
      /function onDelete\(\) \{([\s\S]*?)\n  \}/,
    )?.[1];

    expect(source).toMatch(
      /className="dropdown-menu__button dropdown-menu__button--dander focusable"[\s\S]*?Delete group/,
    );
    expect(deleteFunction).toMatch(
      /if \(confirm\([^)]*\)\) \{\s*deleteFolderGroup\(p\.group\.id\);\s*\}/,
    );
  });
});
