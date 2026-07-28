# Тактильное перетаскивание закладок и групп: план реализации

> **Для агентных исполнителей:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: использовать `superpowers:subagent-driven-development` (рекомендуется) или `superpowers:executing-plans` для выполнения этого плана по задачам. Для отслеживания используются чекбоксы.

**Цель:** при перетаскивании схлопывать источник и показывать полупрозрачную копию закладки или группы в целевой позиции.

**Архитектура:** временное представление реализуется DOM-клонами, помеченными `data-dad-preview="true"`. Источник скрывается только после старта drag; preview вставляется в обычный поток целевого контейнера, а вычисление drop-позиции игнорирует preview-узлы.

**Технологии:** React 18, TypeScript, SCSS Modules, Jest + jsdom.

## Глобальные ограничения

- Прозрачность фона preview и плавающего клона — 18%.
- Временные DOM-узлы не меняют dashboard store и не участвуют в расчёте `insertBeforeItemId`.
- Не изменять сортировку пространств.
- Не выполнять `git add` и `git commit` без явного разрешения пользователя.

## Структура файлов

- `src/newtab/feature/dragging/dragAndDrop.ts` — хелперы создания, размещения и очистки preview, а также исключение preview из расчёта позиции.
- `src/newtab/feature/dragging/processItemDragAndDrop.ts` — жизненный цикл preview для закладок, выбранных закладок и групп.
- `src/newtab/feature/dragging/processFolderDragAndDrop.ts` — жизненный цикл preview для папок/групп верхнего уровня.
- `src/newtab/feature/dragging/dragAndDrop.scss` — общий визуальный стиль preview и прозрачного плавающего клона.
- `src/__tests__/dragAndDrop.getItemIdByIndex.test.ts` — unit- и style-контракты механики.

### Задача 1: Хелперы временного preview и расчёт позиции

**Файлы:**
- Изменить: `src/newtab/feature/dragging/dragAndDrop.ts:287-415`
- Изменить: `src/__tests__/dragAndDrop.getItemIdByIndex.test.ts`

**Интерфейсы:**
- Создать: `getDragLayoutElement(targetRoot: HTMLElement): HTMLElement`.
- Создать: `setDragSourceHidden(elements: HTMLElement[]): () => void`.
- Создать: `createDropPreview(targetRoots: HTMLElement[]): HTMLElement[]`.
- Создать: `placeDropPreview(container: HTMLElement, previews: HTMLElement[], index: number): void`.
- Создать: `removeDropPreview(previews: HTMLElement[]): void`.
- `calculateFoldersDropAreas()` и `getItemIdByIndex()` должны игнорировать детей с `data-dad-preview="true"`.

- [ ] **Шаг 1: Написать падающие unit-тесты для preview-узлов**

  Добавить в `dragAndDrop.getItemIdByIndex.test.ts` тесты:

  ```ts
  test("drop preview is marked and can be removed", () => {
    const source = document.createElement("div");
    source.dataset.id = "101";
    const preview = createDropPreview([source]);

    expect(preview[0].dataset.dadPreview).toBe("true");
    document.body.append(preview[0]);
    removeDropPreview(preview);
    expect(document.body.contains(preview[0])).toBe(false);
  });

  test("getItemIdByIndex skips temporary drop previews", () => {
    const container = document.createElement("div");
    const item = (id: string) => {
      const wrapper = document.createElement("div");
      const root = document.createElement("div");
      root.dataset.role = DOM_ROLE.folderItem;
      root.dataset.id = id;
      wrapper.append(root);
      return wrapper;
    };
    const preview = document.createElement("div");
    preview.dataset.dadPreview = "true";
    container.append(item("101"), preview, item("102"));

    expect(getItemIdByIndex(container, 1)).toBe(102);
  });
  ```

- [ ] **Шаг 2: Убедиться, что тесты падают по ожидаемой причине**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  ```

  Ожидание: FAIL, так как экспортов `createDropPreview` и `removeDropPreview` ещё нет, а `getItemIdByIndex` считает preview обычным ребёнком.

- [ ] **Шаг 3: Реализовать минимальные DOM-хелперы**

  В `dragAndDrop.ts`:

  ```ts
  export function createDropPreview(targetRoots: HTMLElement[]): HTMLElement[] {
    return targetRoots.map((targetRoot) => {
      const preview = getDragLayoutElement(targetRoot).cloneNode(true) as HTMLElement;
      preview.dataset.dadPreview = "true";
      preview.classList.add("dad-drop-preview");
      return preview;
    });
  }

  export function removeDropPreview(previews: HTMLElement[]) {
    previews.forEach((preview) => preview.remove());
  }
  ```

  `getDragLayoutElement` должен возвращать внешний блок группы для
  `DOM_ROLE.groupHeader`, внешний блок закладки для элемента папки и сам
  sidebar-элемент во всех остальных случаях. `setDragSourceHidden` сохраняет
  прежний inline `display`, ставит `display: none` и возвращает идемпотентную
  функцию восстановления. При размещении preview вставлять клоны перед
  реальным элементом по индексу, игнорируя preview-узлы.

- [ ] **Шаг 4: Исключить preview из геометрии и итогового id**

  Отфильтровать `[data-dad-preview="true"]` при построении `itemRects` и при
  получении ребёнка для `getItemIdByIndex`. Индекс в обоих случаях — индекс
  среди реальных элементов, не среди всех DOM-детей.

- [ ] **Шаг 5: Убедиться, что тесты проходят**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  ```

  Ожидание: PASS.

### Задача 2: Preview для закладок, нескольких выделений и групп

**Файлы:**
- Изменить: `src/newtab/feature/dragging/processItemDragAndDrop.ts:20-161`
- Изменить: `src/newtab/feature/dragging/dragAndDrop.scss`
- Тест: `src/__tests__/dragAndDrop.getItemIdByIndex.test.ts`

**Интерфейсы:**
- Использует `createDropPreview`, `placeDropPreview`, `removeDropPreview` и
  `setDragSourceHidden` из задачи 1.
- Производит: временный preview в целевом контейнере без изменения `onDrop`.

- [ ] **Шаг 1: Написать падающий контрактный тест смены цели**

  Добавить в `dragAndDrop.getItemIdByIndex.test.ts`:

  ```ts
  test("moving a drop preview removes it from the previous container", () => {
    const sourceA = document.createElement("div");
    const sourceB = document.createElement("div");
    const firstContainer = document.createElement("div");
    const secondContainer = document.createElement("div");
    const previews = createDropPreview([sourceA, sourceB]);

    placeDropPreview(firstContainer, previews, 0);
    expect(firstContainer.querySelectorAll('[data-dad-preview="true"]')).toHaveLength(2);

    removeDropPreview(previews);
    placeDropPreview(secondContainer, previews, 0);
    expect(firstContainer.querySelector('[data-dad-preview="true"]')).toBeNull();
    expect(secondContainer.querySelectorAll('[data-dad-preview="true"]')).toHaveLength(2);
  });
  ```

- [ ] **Шаг 2: Убедиться, что тест падает**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  ```

  Ожидание: FAIL, потому что процесс drag пока добавляет только линейный
  `bm-item-placeholder`.

- [ ] **Шаг 3: Заменить линейный placeholder на preview**

  После успешного `config.onDragStarted()`:

  ```ts
  const restoreSource = setDragSourceHidden(
    config.isFolderItem ? targetRoots.map(getDragLayoutElement) : [],
  );
  dropAreas = calculateFoldersDropAreas(folderEls, true);
  ```

  При каждом изменении `dropArea` или индекса: удалить предыдущие preview,
  создать новые через `createDropPreview(targetRoots)` и вставить их в
  `dropArea.element` через `placeDropPreview`. Для `insertAtEnd` вставлять в
  конец целевой группы. Не создавать preview, если курсор вне drop-зоны.

- [ ] **Шаг 4: Очистить временное состояние при любом завершении**

  На `mouseup`, при `onCancel` и при отказе `onDragStarted()` вызвать
  `removeDropPreview` и `restoreSource`. Удалить использование
  `createPlaceholder(true)` и снимание opacity с исходных элементов.

- [ ] **Шаг 5: Проверить прохождение теста и регрессии drag helper**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  npm run typecheck
  ```

  Ожидание: PASS без ошибок TypeScript.

### Задача 3: Preview для перетаскивания папки/группы верхнего уровня

**Файлы:**
- Изменить: `src/newtab/feature/dragging/processFolderDragAndDrop.ts:18-132`
- Изменить: `src/newtab/feature/dragging/dragAndDrop.scss`
- Тест: `src/__tests__/dragAndDrop.getItemIdByIndex.test.ts`

**Интерфейсы:**
- Использует `setDragSourceHidden`, `createDropPreview`, `placeDropPreview` и
  `removeDropPreview` из задачи 1.
- Не меняет `PConfigFolder.onDrop` и поведение зон пространств.

- [ ] **Шаг 1: Написать падающий тест preview папки**

  Добавить в `dragAndDrop.getItemIdByIndex.test.ts`:

  ```ts
  test("folder preview is inserted before the selected folder", () => {
    const folders = document.createElement("div");
    const source = document.createElement("div");
    source.dataset.role = DOM_ROLE.folder;
    const target = document.createElement("div");
    target.dataset.role = DOM_ROLE.folder;
    folders.append(source, target);
    const previews = createDropPreview([source]);

    placeDropPreview(folders, previews, 1);
    expect(folders.children[1].dataset.dadPreview).toBe("true");
    removeDropPreview(previews);
    expect(folders.children).toHaveLength(2);
  });
  ```

- [ ] **Шаг 2: Убедиться, что тест падает**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  ```

  Ожидание: FAIL, потому что текущая реализация использует
  `bm-folder-placeholder` — вертикальную синюю линию.

- [ ] **Шаг 3: Вставить preview вместо вертикальной линии**

  При старте drag скрыть `targetRoot` через `setDragSourceHidden` и
  пересчитать `dropFoldersAreas`. При наведении на другую папку создать клон
  `targetRoot`, вставить его перед/после `dropArea.element` согласно
  `insertBefore`, удалить старый preview при смене позиции. При наведении на
  пространство preview не показывать, но сохранить существующее переключение
  пространства.

- [ ] **Шаг 4: Восстановить источник и проверить drop**

  На `mouseup` удалить preview и вызвать восстановление источника до
  `config.onDrop` либо `config.onCancel`. Удалить `createPlaceholder(false)` и
  прямое изменение `targetRoot.style.opacity`.

- [ ] **Шаг 5: Запустить тесты и проверку типов**

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  npm run typecheck
  ```

  Ожидание: PASS.

### Задача 4: Стили и финальная проверка

**Файлы:**
- Изменить: `src/newtab/feature/dragging/dragAndDrop.scss`
- Изменить: `src/__tests__/dragAndDrop.getItemIdByIndex.test.ts`

**Интерфейсы:**
- `dad-drop-preview` — общий класс временной копии.
- `data-dad-preview="true"` — маркер, используемый только временным preview.

- [ ] **Шаг 1: Написать падающие style-контракты**

  Добавить проверки содержимого SCSS:

  ```ts
  expect(source).toContain(".dad-drop-preview");
  expect(source).toContain("opacity: 0.18");
  expect(source).toContain("pointer-events: none");
  expect(source).toContain("background-color: rgb(209 224 255 / 18%)");
  ```

- [ ] **Шаг 2: Убедиться, что style-контракты падают**

  Запустить:

  ```bash
  npm test -- src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand
  ```

  Ожидание: FAIL, потому что отсутствует класс preview и плотный фон
  `[data-selected="true"]` не переопределён для `.dad-dummy`.

- [ ] **Шаг 3: Добавить минимальные стили**

  В `dragAndDrop.scss` определить:

  ```scss
  .dad-drop-preview {
    opacity: 0.18;
    pointer-events: none;
  }

  .dad-dummy [data-selected="true"] {
    background-color: rgb(209 224 255 / 18%);
  }
  ```

  Не добавлять outline или синюю линию как основной индикатор позиции.

- [ ] **Шаг 4: Запустить полный набор автоматических проверок**

  ```bash
  npm test -- --runInBand
  npm run typecheck
  ```

  Ожидание: PASS.

- [ ] **Шаг 5: Выполнить ручную проверку в расширении**

  Проверить четыре сценария: одна закладка, несколько выбранных закладок,
  группа закладок, папка верхнего уровня. Для каждого убедиться, что источник
  схлопывается, preview появляется в корректном месте, отмена восстанавливает
  раскладку, а drop сохраняет ожидаемый порядок.
