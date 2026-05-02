Object.defineProperty(global, "__OVERRIDE_NEWTAB", {
  value: false,
  configurable: true,
});

Object.defineProperty(global, "BroadcastChannel", {
  value: class {
    postMessage() {}
    close() {}
  },
  configurable: true,
});

type MediaQueryListener = (event: { matches: boolean }) => void;

function setupDocument() {
  const classes = new Set<string>();

  Object.defineProperty(global, "document", {
    value: {
      documentElement: {
        classList: {
          add: (className: string) => classes.add(className),
          remove: (className: string) => classes.delete(className),
          contains: (className: string) => classes.has(className),
        },
      },
    },
    configurable: true,
  });
}

function setupMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners: MediaQueryListener[] = [];

  Object.defineProperty(global, "window", {
    value: {},
    configurable: true,
  });

  Object.defineProperty((global as any).window, "matchMedia", {
    value: () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_eventName: string, listener: MediaQueryListener) => {
        listeners.push(listener);
      },
      removeEventListener: jest.fn(),
    }),
    configurable: true,
  });

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

afterEach(() => {
  jest.resetModules();
});

test("applyTheme uses system color scheme and reacts to system changes", () => {
  setupDocument();
  const media = setupMatchMedia(false);
  const { applyTheme } = require("@/newtab/state/storage");

  applyTheme("system");

  expect(document.documentElement.classList.contains("dark-theme")).toBe(false);

  media.setMatches(true);
  expect(document.documentElement.classList.contains("dark-theme")).toBe(true);

  media.setMatches(false);
  expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
});

test("applyTheme ignores system changes after selecting a fixed theme", () => {
  setupDocument();
  const media = setupMatchMedia(false);
  const { applyTheme } = require("@/newtab/state/storage");

  applyTheme("dark");
  media.setMatches(false);

  expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
});
