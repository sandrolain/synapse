![synapse](https://raw.githubusercontent.com/sandrolain/synapse/bca5cd9db541fa539bc2b920407254bd69c604e0/assets/logo.svg?sanitize=true "synapse")

<p align="center">

**Synapse**  
TS/JS library for data propagation

</p>

Synapse provides a light communication system based on observables instances called **Emitter**, which allow the notification and asynchronous exchange of information packets within a webapp, and provide a series of tools to filter, manipulate and forward them to other instances observable or other subjects.

Processing information creates a chain of observable nodes that you can subscribe to.

The library is also available of some methods for monitoring and obtaining information from various channels and data sources that a webapp can draw on, including:

- interval
- DOM events
- Change of cookie value 🍪 
- Change of (local/session)storage item value
- Change parameter query string
- Receiving WebSocket messages
- HTTP fetch polling
- Custom value watchers

---

# Getting Started

*W.I.P.*

---

## Build types available

This package is written in TypeScript and the build includes type definitions for use in other TypeScript projects.  
The build of this package generates two versions:
- **ES Module**: For use in TypeScript or web projects for browsers that support ES6 modules. Using ES6 import in projects based on node.js (including TypeScript) it allows during the bundling phase (via webpack, rollup or equivalent) to perform the tree-shaking of the dependencies and have a lighter bundle.
- **Universal Module Definition**: To be used directly in projects based on node.js, or into web projects callable via global variable or via requirejs

---

## Status

<table><thead><tr><th>master</th><th>develop</th></tr></thead><tbody><tr><td>

[![Build Status](https://travis-ci.org/sandrolain/synapse.svg?branch=master)](https://travis-ci.org/sandrolain/synapse)

</td><td>

[![Build Status](https://travis-ci.org/sandrolain/synapse.svg?branch=develop)](https://travis-ci.org/sandrolain/synapse)

</td></tr></tbody></table>

---

## License
[![MIT](https://img.shields.io/github/license/sandrolain/synapse)](./LICENSE)

-------------------------

[Sandro Lain](https://www.sandrolain.com/)
