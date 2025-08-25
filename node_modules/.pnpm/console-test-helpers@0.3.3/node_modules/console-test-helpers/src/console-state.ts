const CONSOLE_WRITE_METHODS = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'dir',
  'trace',
  'group',
  'groupCollapsed',
  'groupEnd',
  'table',
];

export default class ConsoleState {
  state: Map<string, Array<string>>;

  constructor() {
    this.state = new Map<string, Array<string>>();
  }

  record(method: string, message: string) {
    this.verifyMethod(method);

    if (!this.state.has(method)) {
      this.state.set(method, []);
    }

    let methodState = this.state.get(method);

    methodState?.push(message);
  }

  getState(method: string): string {
    this.verifyMethod(method);

    return this.state.get(method)?.join('\n') || '';
  }

  log(): string {
    return this.getState('log');
  }

  debug(): string {
    return this.getState('debug');
  }

  info(): string {
    return this.getState('info');
  }

  warn(): string {
    return this.getState('warn');
  }

  error(): string {
    return this.getState('error');
  }

  dir(): string {
    return this.getState('dir');
  }

  group(): string {
    return this.getState('group');
  }

  groupCollapsed(): string {
    return this.getState('groupCollapsed');
  }

  groupEnd(): string {
    return this.getState('groupEnd');
  }

  table(): string {
    return this.getState('table');
  }

  private verifyMethod(method: string) {
    if (!CONSOLE_WRITE_METHODS.includes(method)) {
      throw new Error(`The supplied method '${method}' is not supported`);
    }
  }
}
