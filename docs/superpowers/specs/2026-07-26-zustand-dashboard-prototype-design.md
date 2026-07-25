# Прототип Zustand для dashboard state

## Цель

Проверить, подходит ли Zustand для будущей полной замены текущего `useReducer` в `src/newtab/state`, не подключая новый store к работающему UI и не создавая второй источник истины в runtime.

## Границы прототипа

- Добавить зависимость `zustand`.
- Создать vanilla `dashboardStore` для `spaces` и `currentSpaceId`.
- Реализовать чистые операции выбора space, обновления folder и переноса folder между spaces.
- Добавить изолированную границу persistence с внедряемым адаптером: чтение снапшота, debounce-сохранение, сигнал синхронизации.
- Покрыть domain-функции, store и persistence тестами.
- Не менять `App.tsx`, текущий reducer, `chrome.storage.local`, `BroadcastChannel` и рабочие компоненты.

## Архитектура

`dashboard/domain.ts` содержит только функции преобразования state. Они не используют React, Zustand, Chrome API, DOM или таймеры.

`dashboard/dashboardStore.ts` создаёт vanilla Zustand store. Его actions вызывают чистые функции из `domain.ts`, поэтому это аналог RTK slice: state и именованные сценарии собраны вместе, но внешние эффекты отсутствуют.

`storage-sync/dashboardPersistence.ts` — инфраструктурная граница. Она принимает адаптер хранения и broadcast-функцию через аргументы, чтобы не зависеть от Chrome в тестах. В полной миграции сюда попадут адаптер `chrome.storage.local`, нормализация v3 и `BroadcastChannel`.

React в будущем будет подписываться через `useStore(dashboardStore, selector)`. Vanilla store позволяет тем же данным пользоваться и Chrome callback-коду через `dashboardStore.getState()`.

## Инварианты

- Каждый folder принадлежит ровно одному space.
- `currentSpaceId` всегда указывает на существующий space; если spaces пусты, равен `-1`.
- Обновление или перенос несуществующего folder не меняет state.
- Неподходящий `spaceId` при выборе заменяется на первый space по текущему порядку, либо на `-1`.
- Store не вызывает Chrome API, DOM API, таймеры или persistence.
- Persistence не запускается до явного вызова `start`, чтобы hydration не перезаписала сохранённые данные.

## Учебные комментарии

В новых архитектурных файлах будут комментарии на русском языке: назначение vanilla store, связь с RTK slice/selector, причина чистых domain-функций и причина вынесения persistence из store. Комментарии объясняют решения, а не повторяют строки кода.

## Неприменённые решения

- Не использовать `zustand/persist`: у проекта уже есть асинхронное Chrome-хранилище, нормализация формата v3 и межвкладочная синхронизация.
- Не переносить undo в прототип: это отдельная вертикальная задача после проверки базового CRUD и persistence boundary.
- Не мигрировать React-компоненты: подключение UI до подтверждения прототипа нарушит требование об одном источнике истины.
