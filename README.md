# Tab Race

[![Greenkeeper badge](https://badges.greenkeeper.io/KayleePop/tab-race.svg)](https://greenkeeper.io/) [![Travis badge](https://travis-ci.org/KayleePop/tab-race.svg?branch=master)](https://travis-ci.org/KayleePop/tab-race) [![standard badge](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![npm](https://img.shields.io/npm/v/tab-race.svg)](https://www.npmjs.com/package/tab-race)

A solution for race conditions between browser threads.

Uses the insert-only [IndexedDB add request](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/add) to ensure that only one thread wins a race.

## Goals

- Robust across browsers
- Fully tested

## Usage

```javascript
const { race, endRace } = require('tab-race')

// will only resolve with true once until the race is ended
// even across sessions, tabs, and workers
if (await race('log-race')) {
  console.log('winner!')

  // allow a new winner when this tab is closed
  window.onunload = () => endRace('log-race')
}
```

## API

### async race(name)

Resolves with true if this is the single winning execution and false otherwise. Uses indexedDB, so anywhere that can access the same indexedDB databases will participate in the same races (sessions, tabs, and workers for the same domain).

`name` specifies which race to participate in. Using a different `name` allows for multiple concurrent races that don't interfere.

### endRace(name)

Synchronous function that resets the race with `name` to allow another winner.

It will successfully end the race when executed in an [unload event handler](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event).

Make sure `race(name)` finishes on all threads before calling `endRace(name)` or there will be multiple winners. Keep in mind that the minimum setTimeout() length for background tabs is 1000ms.
