import { IndexableConsole, MockConsole, MockConsoleOptions } from './types';
import ConsoleState from './console-state';

let originalConsole: any;
let consoleState: ConsoleState;
let mockConsoleOptions: MockConsoleOptions | undefined;

let consoleProxyHandler: ProxyHandler<IndexableConsole> = {
  get(target, propKey: PropertyKey) {
    const method = <string>propKey;
    const originalMethod = target[method];

    return function(...args: any[]) {
      consoleState.record(method, args[0]);

      if (mockConsoleOptions !== undefined && !mockConsoleOptions.suppressOutput) {
        originalMethod.apply(originalConsole, args);
      }
    };
  },
};

export default function mockConsole(options?: MockConsoleOptions): MockConsole {
  originalConsole = console;
  consoleState = new ConsoleState();
  mockConsoleOptions = options;

  console = new Proxy(console, consoleProxyHandler);

  return { resetConsole, consoleState };
}

export function resetConsole(): void {
  console = originalConsole;
}
