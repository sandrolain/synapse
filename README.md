![synapses](https://raw.githubusercontent.com/sandrolain/synapses/bfd1dd3772c0aa7b8356da7404eeffac06c73174/assets/logo.svg?sanitize=true "synapses")

<p align="center">Light library for data propagation</p>

---

Synapses provides a **light reactive communication system** based on observables instances called *Emitter*, which allow the notification and asynchronous exchange of information packets within a webapp, and provide a series of tools to **filter, manipulate and forward** them to other instances observable or other subjects.

Processing information creates a chain of observable nodes that you can subscribe to.

The library is also available of some methods for monitoring and obtaining information from various channels and data sources that a webapp can draw on, including:

- Interval
- DOM events
- Change of cookie value 🍪 
- Change of (local/session)storage item value
- Change parameter query string
- Receiving WebSocket messages
- HTTP fetch polling
- Custom value watchers

---

## Usage

### As TypeScript module

```typescript
/// import specific methods or classes
import { Emitter, fromListener } from "synapses";
// ...

// or entire library
import * as synapses from "synapses";
// ...
```

### As browser EcmaScript module

```html
<script type="module">
/// import specific methods or classes
import { Emitter, fromListener } from "./synapses/esm/index.js";
// ...

// or entire library
import * as synapses from "./synapses/esm/index.js";
// ...
</script>
```

### As commonjs/node.js module

```javascript
/// import specific methods or classes
const { Emitter, fromListener } = require("synapses");
// ...

// or entire library
const synapses = require("synapses");
// ...
```

---

## Documentation

Documentation with examples can be found [clicking here](https://sandrolain.github.io/synapses/docs/typedocs/index.html)

---

## Build types available

This package is written in TypeScript and the build includes type definitions for use in other TypeScript projects.  
The build of this package generates two versions:
- **ES Module**: For use in TypeScript or web projects for browsers that support ES6 modules. Using ES6 import in projects based on node.js (including TypeScript) it allows during the bundling phase (via webpack, rollup or equivalent) to perform the tree-shaking of the dependencies and have a lighter bundle.
- **Universal Module Definition**: To be used directly in projects based on node.js, or into web projects callable via global variable or via requirejs

---

## Status

<table><thead><tr><th>master</th><th>develop</th></tr></thead><tbody><tr><td>

[![Build Status](https://travis-ci.org/sandrolain/synapses.svg?branch=master)](https://travis-ci.org/sandrolain/synapses)

</td><td>

[![Build Status](https://travis-ci.org/sandrolain/synapses.svg?branch=develop)](https://travis-ci.org/sandrolain/synapses)

</td></tr></tbody></table>

---

## License
[![MIT](https://img.shields.io/github/license/sandrolain/synapses)](./LICENSE)

-------------------------

[Sandro Lain](https://www.sandrolain.com/)
