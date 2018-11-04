# NetVis - The Network Visualizer

This package visualizes network dependencies.

[![Screenshot - click to see it in action](https://jschirrmacher.github.io/netvis-server/public/netvis.gif)](https://jschirrmacher.github.io/netvis-server/public/)

[Click image to see it live](https://jschirrmacher.github.io/netvis-server/public/)

It uses https://d3js.org/ library's force diagram and adds a couple of
functions to make it ease to use it with json formatted data, which might be
static (from a simple file) or could be created dynamically by a server program.

Features:

- Can show different types of nodes: circle or rectangle
- Optimized for large networks by letting the user click on the nodes
  to show the connections of the node. Nodes which are farther away,
  gets smaller and don't show an image any more to save performance and
  gain overview
- Can create new or delete existing nodes and connections with event
  handlers for easy backend attachment
- Can show node details on demand
- Draggable and zoomable canvas, draggable nodes
- Programmable zoom (e.g. for screen buttons)
- Written completely in ES6
- [Example application](https://jschirrmacher.github.io/netvis-server/) available

## [Usage](https://github.com/jschirrmacher/netvis/wiki/Usage)

## [Change log](https://github.com/jschirrmacher/netvis/wiki/ChangeLog)

## [Contribute to NetVis](https://github.com/jschirrmacher/netvis/wiki/Contribute)

## [History of NetVis](https://github.com/jschirrmacher/netvis/wiki/History)

[![CircleCI](https://circleci.com/gh/jschirrmacher/netvis.svg?style=svg)](https://circleci.com/gh/jschirrmacher/netvis)
