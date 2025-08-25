import * as util from 'util';

import mockConsole from '../mock-console';

const { test } = QUnit;

QUnit.module('mock-console', function() {
  test('mocks the console when called', function(assert) {
    let { resetConsole } = mockConsole();

    assert.ok(util.types.isProxy(console));

    resetConsole();
  });

  test('resets the console when resetConsole called', function(assert) {
    let { resetConsole } = mockConsole();

    assert.ok(util.types.isProxy(console));

    resetConsole();

    assert.notOk(util.types.isProxy(console));
  });

  test('resets the console when resetConsole called via destructor', function(assert) {
    let { resetConsole } = mockConsole();

    assert.ok(util.types.isProxy(console));

    resetConsole();

    assert.notOk(util.types.isProxy(console));
  });

  test('captures state when console methods are called', function(assert) {
    let { resetConsole, consoleState } = mockConsole();

    console.log('This is a message');

    assert.equal(consoleState.getState('log'), 'This is a message');

    resetConsole();
  });

  test('throws when invalid console methods are retrieved from state', function(assert) {
    let { resetConsole, consoleState } = mockConsole();

    console.log('This is a message');

    assert.throws(() => {
      consoleState.getState('foo');
    });

    resetConsole();
  });

  test('captures state when console methods are called repeatedly', function(assert) {
    let { resetConsole, consoleState } = mockConsole();

    console.log('This is a message');
    console.log('And so is this');

    assert.equal(
      consoleState.getState('log'),
      `This is a message
And so is this`
    );

    resetConsole();
  });
});
