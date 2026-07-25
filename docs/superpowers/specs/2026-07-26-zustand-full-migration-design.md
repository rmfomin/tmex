# Полный переход newtab state на Zustand

## Цель

Полностью заменить самописный `useReducer`-store в `src/newtab/state` на Zustand, сохранив пользовательское поведение Tablo. В финальном коде отсутствуют legacy reducer, `Action`, `ActionPayload`, `DispatchContext` и compatibility bridge.

## Владение состоянием

### Dashboard store

`state/dashboard/dashboardStore.ts` владеет сохранённой моделью закладок:

- `spaces`, `currentSpaceId`;
- CRUD spaces, folders, bookmark items и групп;
- операции перемещения и fractional positions;
- undo history.

Чистые преобразования остаются в `state/dashboard/domain.ts`. Store вызывает их синхронно через именованные actions. Каждая команда описывает пользовательское намерение, например `createFolder`, `moveFolderItems`, `archiveItem`, а не общий `updateState`.

### UI store

`state/ui/uiStore.ts` владеет состоянием интерфейса:

- search, search filters и режим фильтрации;
- notification;
- `itemInEdit`, page, sidebar hover;
- preferences: show recent/archived/not used, sidebar collapsed, open links in new tab, color theme, hidden feature.

Настройки, которые сейчас сохраняются в Chrome storage, выделяются в serializable `PersistedPreferences`. Таймер автоскрытия уведомления и применение DOM-темы остаются внешними controllers.

### Chrome runtime store

`state/chrome-runtime/chromeRuntimeStore.ts` остаётся владельцем текущих tabs, истории, current window, последних активных tabs и `loaded`. Он не сохраняется в `chrome.storage`.

### Storage sync

`state/storage-sync` объединяет serializable state dashboard и preferences в текущий v3-формат:

- загружает и нормализует данные из `chrome.storage.local`;
- выполняет hydration всех stores до монтирования React;
- с debounce сохраняет только persisted fields;
- рассылает и принимает BroadcastChannel-сообщения;
- не сохраняет runtime state, undo history, notification и edit state.

`zustand/persist` не используется: проекту нужны асинхронный Chrome adapter, v3-normalization и синхронизация между вкладками.

## Controllers и эффекты

Store actions не вызывают Chrome API, storage, DOM или таймеры.

- `chrome-runtime/controller.ts` подписывается на Chrome tabs/windows/history events и обновляет runtime store.
- `chrome-runtime/commands.ts` закрывает Chrome tabs и оптимистично обновляет runtime store.
- `storage-sync/controller.ts` связывает stores с `chrome.storage.local` и BroadcastChannel.
- `ui/themeController.ts` применяет CSS-тему и следит за системной темой.
- `ui/useNotificationAutoHide.ts` запускает/отменяет таймер скрытия notification.

## Компоненты

Компоненты перестают получать полный `AppState` и `dispatch` из Context. Они читают минимальные данные через store selector и вызывают actions нужного store. Props остаются только для локальных/иерархических данных, например конкретного `FolderV3` или `BookmarkItemV3`.

`App.tsx` монтирует controllers и отображает верхнеуровневые экраны на основе selector-ов UI/runtime store. В нём не остаётся `useReducer`, compatibility `AppState` или action bridge.

## Startup и синхронизация

```text
index.tsx
  → storage-sync hydrate + v3 normalization
  → dashboardStore.hydrate + uiStore.hydratePreferences
  → themeController.apply
  → mount App

App
  → start chrome runtime controller
  → start storage-sync controller
  → UI selector subscriptions
```

Storage controller начинает подписку только после hydration, поэтому пустые initial values не могут перезаписать сохранённые данные.

## Удаляемый код

- `src/newtab/state/actions.ts`;
- `src/newtab/state/state.ts`;
- старый `src/newtab/state/storage.ts` после переноса его функций в storage-sync/theme controller;
- `src/newtab/state/chrome-runtime/runtimeActionBridge.ts`;
- все импорты `Action`, `ActionPayload`, `ActionDispatcher`, `AppState`, `DispatchContext`, `stateReducer`;
- reducer-specific tests, заменённые domain/store/controller tests.

Чистые traversal и position helpers сохраняются, но переезжают или получают новые импорты, если их старое размещение относится только к reducer.

## Проверки

- Для каждой перенесённой domain-operation есть unit test, написанный до реализации.
- Store tests покрывают действия и неизменность state.
- Storage/controller tests используют dependency injection вместо Chrome API.
- Полный Jest suite, `npm run typecheck`, production build и watch compilation проходят.
- Поиск по `src` не находит imports legacy action/reducer API или файлов legacy reducer.

## Ограничения

- Не менять формат backup v3 и ключи `chrome.storage.local`.
- Не менять тексты, поведение hotkeys, drag-and-drop, импорт/экспорт и undo semantics.
- Не добавлять Redux, React Query или новую persistence-библиотеку.
- Архитектурные комментарии на русском сохраняются как учебные.
