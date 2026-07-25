# Перенос Chrome runtime state в Zustand

## Цель

Подключить Zustand к работающему расширению через независимый runtime-срез: открытые вкладки, недавняя история, активное окно, последние активные вкладки и флаг готовности приложения.

## Почему не dashboard

Текущий reducer остаётся источником истины для полного CRUD `spaces`, `folders`, `items` и undo. Частичный перенос только `spaces` сделал бы новый store и reducer конкурентными владельцами одних данных. Runtime-данные не сохраняются в `chrome.storage.local`, поэтому их можно перенести отдельно без этого риска.

## Архитектура

`chrome-runtime/chromeRuntimeStore.ts` — vanilla Zustand store с семантическими actions: установить tabs/history, обновить tab, удалить закрытые tabs и установить данные текущего окна. Store не использует Chrome API.

`chrome-runtime/runtimeActionBridge.ts` временно адаптирует старый `ActionDispatcher`. Он направляет runtime actions в Zustand, остальные передаёт старому reducer. Закрытие вкладок передаётся внедрённой команде, которая находится в `App.tsx`, потому что только controller-слой имеет право вызывать `chrome.tabs.remove`.

`App.tsx` использует Zustand как источник runtime-данных при построении совместимого `AppState` для существующих компонентов. Это сохраняет их API на первом этапе. Значения runtime-полей старого reducer больше не обновляются и не читаются UI.

## Поток данных

```text
Chrome event / Promise result
  → runtime-aware dispatch bridge
  → chromeRuntimeStore action
  → App подписывается на Zustand
  → существующие компоненты получают актуальный AppState
```

## Инварианты

- Только `chromeRuntimeStore` владеет актуальными runtime-полями после старта `App`.
- Zustand store и domain actions не вызывают Chrome API, storage, DOM или таймеры.
- `Action.CloseTabs` вызывает Chrome API в `App.tsx` и сразу удаляет tabs из Zustand state оптимистично.
- Действия, не относящиеся к runtime, передаются в старый reducer без изменений.
- Текущий UI и public props компонентов не меняются в этом шаге.

## Проверки

- Unit-тест store покрывает обновление и удаление tabs, частичное обновление history и runtime-полей.
- Unit-тест bridge подтверждает маршрутизацию runtime и legacy actions.
- Полный Jest suite, typecheck и production build проходят.
