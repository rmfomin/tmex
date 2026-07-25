import { Action } from "@/newtab/state/state";
import { createChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import { createDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { createRuntimeActionBridge } from "@/newtab/state/chrome-runtime/runtimeActionBridge";
import { createUiStore } from "@/newtab/state/ui/uiStore";

function createTab(id: number): chrome.tabs.Tab {
  return {
    id,
    windowId: 1,
    index: 0,
    active: false,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    title: `Вкладка ${id}`,
    url: `https://example.com/${id}`,
  };
}

test("bridge направляет SetTabsOrHistory в Zustand runtime store", () => {
  const runtimeStore = createChromeRuntimeStore();
  const legacyDispatch = jest.fn();
  const closeTabs = jest.fn();
  const dispatch = createRuntimeActionBridge({
    runtimeStore,
    legacyDispatch,
    closeTabs,
  });
  const tab = createTab(1);

  dispatch({ type: Action.SetTabsOrHistory, tabs: [tab] });

  expect(runtimeStore.getState().tabs).toEqual([tab]);
  expect(legacyDispatch).not.toHaveBeenCalled();
});

test("bridge передаёт не runtime action в legacy reducer", () => {
  const legacyDispatch = jest.fn();
  const dispatch = createRuntimeActionBridge({
    runtimeStore: createChromeRuntimeStore(),
    legacyDispatch,
    closeTabs: jest.fn(),
  });
  const action = { type: Action.UpdateSearch, value: "grafana" } as const;

  dispatch(action);

  expect(legacyDispatch).toHaveBeenCalledWith(action);
});

test("bridge разделяет runtime и legacy поля UpdateAppState", () => {
  const runtimeStore = createChromeRuntimeStore();
  const legacyDispatch = jest.fn();
  const dispatch = createRuntimeActionBridge({
    runtimeStore,
    legacyDispatch,
    closeTabs: jest.fn(),
  });

  dispatch({
    type: Action.UpdateAppState,
    newState: { lastActiveTabIds: [4, 3], search: "monitoring" },
  });

  expect(runtimeStore.getState().lastActiveTabIds).toEqual([4, 3]);
  expect(legacyDispatch).toHaveBeenCalledWith({
    type: Action.UpdateAppState,
    newState: { search: "monitoring" },
  });
});

test("bridge передаёт закрытие tabs внешней команде", () => {
  const closeTabs = jest.fn();
  const dispatch = createRuntimeActionBridge({
    runtimeStore: createChromeRuntimeStore(),
    legacyDispatch: jest.fn(),
    closeTabs,
  });

  dispatch({ type: Action.CloseTabs, tabIds: [1, 2] });

  expect(closeTabs).toHaveBeenCalledWith([1, 2]);
});

test("bridge направляет dashboard и UI actions в соответствующие Zustand stores", () => {
  const dashboardStore = createDashboardStore({ spaces: [], currentSpaceId: -1 });
  const uiStore = createUiStore();
  const legacyDispatch = jest.fn();
  const dispatch = createRuntimeActionBridge({
    runtimeStore: createChromeRuntimeStore(),
    dashboardStore,
    uiStore,
    legacyDispatch,
    closeTabs: jest.fn(),
  });

  dispatch({ type: Action.CreateSpace, spaceId: 1, title: "Работа" });
  dispatch({ type: Action.UpdateSearch, value: "grafana" });
  dispatch({ type: Action.ShowNotification, message: "Saved" });

  expect(dashboardStore.getState().spaces).toEqual([
    expect.objectContaining({ id: 1, title: "Работа" }),
  ]);
  expect(uiStore.getState()).toMatchObject({
    search: "grafana",
    notification: { visible: true, message: "Saved" },
  });
  expect(legacyDispatch).not.toHaveBeenCalled();
});
