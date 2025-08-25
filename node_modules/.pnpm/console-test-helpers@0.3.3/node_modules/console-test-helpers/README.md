# console-test-helpers

When building CLIs that output to the console, it's useful to be able to record
and validate the console output for subsequent verification. Doing so requires a
console replacement to record the _actual_ console output. `console-test-helpers` provides this.

## Installation

```bash
yarn add console-test-helpers --dev

# or

npm install console-test-helpers --save-dev
```

## Usage

`console-test-helpers` replaces the real console with a fake, which stores the output
in addition to acting as a proxy for all console calls. This means the console will behave
the same, but will gather output for later validation. Validation can be performed using
fixtures that can be asserted against.

Below is an example of its usage in `qunit-console-test-helpers`, this sister package to `console-test-helpers`.

```ts
export function setupMockConsole(hooks: NestedHooks, options: MockConsoleOptions) {
  let resetConsole: () => void;

  setupFixtures(options); // from the qunit-fixtures package

  hooks.beforeEach(function() {
    ({ resetConsole, consoleState } = mockConsole(options));
  });

  hooks.afterEach(function() {
    resetConsole();
  });
}
```

And below is how it's used within tests.

```js
import { module, test } from 'qunit';
import { setupMockConsole } from 'qunit-console-test-helpers';

// ...
module('With mocked console', function(hooks) {
  setupMockConsole(hooks, { fixturePath: './tests/fixtures' });

  test('Something that mocks the console', function(assert) {
    somethingThatUsesConsole();

    assert.console().matches('fixture-name');
  });
});
```

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## License

This project is licensed under the [MIT License](LICENSE.md).
