# README

This package visualizes network dependencies.

[![Screenshot - click to see it in action](https://jschirrmacher.github.io/netvis/example/netvis.png)](https://jschirrmacher.github.io/netvis/example/netvis.html)
[Click here to see it live](https://jschirrmacher.github.io/netvis/example/)

It uses the famous https://d3js.org/ library's force diagram and adds a couple of
functions to make it ease to use it with json formatted data, which might be
static (from a simple file) or could be created dynamically by a server program.

Features:

- Can show different types of nodes: circle or rectangle
- Optimized for large networks by letting the user click on the nodes to hide or show the connections of the node
- Can create new or delete existing nodes and connections with event handlers for easy backend attachment
- Can show node details on demand
- Draggable and zoomable canvas, draggable nodes
- Programmable zoom (e.g. for screen buttons)
- Written completely in ES6

## Usage

To use the package, all you need to do is include some JavaScripts into your html

```html
<script src="//d3js.org/d3.v4.min.js"></script>
<script src="https://jschirrmacher.github.io/netvis/dist/Network.js"></script>
<script src="https://jschirrmacher.github.io/netvis/dist/ForceDiagram.js"></script>
```

and define a SVG image like that:

```html
<svg id="root"></svg>
```

All you need else is an initialization call:

```html
<script>
  new Network('data.json', '#root')
</script>
```

It reads data from the URL given as the first parameter and displays the network
in the svg referenced by the selector defined by the second parameter.

You can find a simple example in the file `example/netvis.html` in this package. It uses a
stylesheet `example/netvis.css` which was compiled via https://sass-lang.com/ from `example/netvis.scss`.
I like Sass very much because it helps using DRY principles, but you are free to use
another tool for that or to write css by yourself.

## Stucture of network data

The data which is displayed, needs to be JSON encoded and must contain two parts,
`nodes` and `links` on the top level:

```json
{
    "nodes": [],
    "links": []
}
```

Nodes is a list of nodes to display, and links - you guessed it - the list of links
between these nodes.

Each node therefore has an ID, which can be referenced in `links`:

```json
{
    "nodes": [
        {"id": 1, "name": "First", "shape": "circle", "open": true},
        {"id": 2, "name": "Second", "shape": "rect", "open": true}
    ],
    "links": [
        {"source": 1, "target": 2}
    ]
}
```

The `name` contains the name of the node and is displayed inside the node,
the `shape` defines the shape of the node.

There are some optional attributes in a node:

- `image` - image to use as the background for the node. THis could be a photo
  of the person represented by the node, a logo or some other picture.
  It should not be too large, because this influences performance very much.
- `visible` - makes the node initially visible but can be closed by the
  user.
- `open` identifies nodes which should be initially visible together with
  the nodes linked to it, regardless of their initial visibility.
- `keepVisible` - this attribute, when set `true`, keeps the node visible
  and it can't be closed by the user. By making important nodes (the root
  of the network for example) always visible, the user cannot by
  inadvertenty close all nodes in the network.
- `connectable` - when set `true`, a button is shown when the user clicks
  a node, allowing to create a new node connected to the current one. See the
  chapter "Handlers" to learn what you should do to make that persistent.
- `deletable` - a flag indicating that the node may be deleted.
- `details` - an URL which returns detail data for the node in JSON format.
- `fontSize` - a relative size for the text (1 as the default)
- `className` - a css class to style nodes

You find a more complete example in the file `example/data.json`.

## Handlers

When calling `new Network()` (see above), there is an optional third parameter,
which is an object containing event handlers which are called, if the user
does an action which requires the network to be changed permanently.

These are the possible events:

- `initialized` - Is called when the diagram is initialized
- `nameRequired` - The user is required to enter or select a node name. This
  event is sent, if a new connection is to be created. The handler should
  open a dialog and return a Promise which receives the entered node name.
- `newNode` - a new node was created. The handler gets the node name as a
  parameter. It should return a data structure for the new node which is then
  added to the network visualization.
- `nodeRemoved` - a node was deleted. The handler gets the data structure
  defining the node. All connections of the node are deleted as well.
- `newLink` - a new link between two nodes was created. The handler
  gets the data structure `{source, target}` of the link as a parameter.
- `showDetails` - the node has been clicked to show its details.
  The handler function gets a parameter with the detail data of the node,
  the DOM element to which the details form should be placed into and the
  d3 node structure for the node clicked.
  It should return a promise which resolves, when the details dialog is
  closed by the user and should be hidden.

Normally, an application should store data in a database or a file
system, when `newNode`, `nodeRemoved` or `newLink` events arrive.

If the handlers aren't defined, simply nothing happens.

## Network functions

Available functions are currently:

- openNode - shows the node's connections.
- closeNode - hides the connections of the node, leaving these, which are
  explicitly shown by other opened nodes.
- newConnection - create a new connection after asking the user about the name
  for the connected node. If the new node doesn't yet exist, it is created.
- removeNode - Delete the node with all its connections.
- showDetails - Loads details for the given node and shows a dialog box with this
  detail info. The dialog itself is generated by the `showDetails` handler which
  gets this detail data as a paramter.


## Changing nodes

When executing the `showDetails` command, an event handler with the same name is called which is normally used to
display detail information about the selected node. If you use a dialog form to let the user change this information,
you can change the node's representation by resolving to this changed information.

A typical implemention could be like this:

```javascript
function showDetails(data, form) {
  return new Promise(resolve => {
    form.innerHTML = detailFormTemplate(data)
    form.addEventListener('submit', event => {
      event.preventDefault()
      Object.keys(data).forEach(function (key) {
        data[key] = form.elements[key].value
      })
      resolve(data)
    })
  })
}
```

## Zoom buttons

You can add zoom buttons like in the following example:

```html
<div class="zoom">
    <div>
        <div id="zoomOut" onclick="network.scale(0.66)">&#xe016</div>
        <div id="zoomIn" onclick="network.scale(1.5)">&#xe015</div>
    </div>
</div>
```
The intermediate `<div>` is needed to position the buttons in the vertical center.

## Change log

### V3.0
- Improved user experience by reducing the number of clicks needed to show node details.
- Command buttons on the node are removed. Instead, you should use buttons in the details dialog form.
- Your `showDetails` event handler should not append or remove the form to the document body any more. This is done
  automatically now, so you only need to assign the html code to the `innerHTML` property of the `form` parameter.
- The example has two different views now which can be shown via two buttons at the window top.

### V2.10
- Distance between nodes can be configured
- Enhanced example to show different views of the same data

### V2.9
- Can start a dev session via `npm start` using `forever --watch` for an easier development cycle

### V2.8
- New functions to add nodes and to add and remove links

### V2.7
- Nodes can have an optional 'className' attribute which is used to css class them

### V2.6
- Nodes can have an optional 'fontSize' attribute
- Text background is now generated automatically, so there is no need to define text-only
  rectangles any more

### V2.5
- Added a feature to update nodes via the `showDetails` handler

### V2.4
- Fixed an error when removing nodes from the diagram which kept some links and nodes visible
- Moved dependency to Babel to dev-dependencies

### V2.3
- New feature: 'initialized' event

### V2.2
- New feature: Nodes can be deleted if they have the attribute `deleteable`
- Fixed: Fixed problems with hiding and showing nodes
- Fixed: when creating new nodes, identify existing nodes case-insensitivly
- Updated example: command button titles in english, white background for zoom buttons

### V2.1
- New feature: zoom buttons
- Fixed: Javascript error when clicked on background

### V2.0
- Re-organized expected command button DOM structure, so you might need to
  adapt them. See chapter "command buttons" for details.

### V1.2
- Show details of a node, if it has an attribute `details`
- New function `hide` and `show` in `ForceDiagram`
- New function `showDetails` in `Network`

### V1.1
- Moved command buttons out of the classes to make them more easily stylable,
  thus requiring you to define them explicitly in your svg (see chapter
  'Command buttons'.
- Click on nodes doesn't open and close them any more, instead, a menu is
  shown with buttons to show or hide the connections.
- New functions `Network.openNode()` and `Network.closeNode`.

## Contributing

You are invited to fork this repository and contribute own enhancements,
and I gladly accept pull requests.

However, to get coding, you need to utilize a ES6 compiler to make the
code runnable in a browser. The ES6 compiler transforms the files into
"old" Javascript code and should place it in the `dist` folder.
I use https://babeljs.io/ for that, you get it automatically, if you run
`npm install`. WebStorm, my favourite IDE, has a file watcher, which
calls babel every time I make changes to one of the .js files, so it is
very convenient and I recommend that very much.

I recently added a node.js / express.js example application (can be found
in the example folder), so if you have node.js installed, you may just
run `npm i` to install dependencies and then `npm start`. The browser
should start automatically and show the example network. If you make
changes to the code, it should automatically refresh due to the `watch`
option of the utilized `forever` (just have a look into `package.json`
to see how I did it).

It would be great if the mechanism to generate browser compatible code
from ES6 would be independent of WebStorm, so if you have spare time...
;-)


## History

I created the visualisation tool primarily for a conference I was organizing,
http://www.leancamp.net/

After doing that two times in 2015 and 2016, I found that many of the
participants liked to get in contact with others with similar topics or
with others who engage with a specific topic, but they didn't know, who
that could be.

So, for the third event, I created a first version of this tool and added
a node for each participant directly after he or she bought a ticket.
After confirming the e-mail address, the participants could then add their
topics, so creating additional connected nodes.

Time by time, the network developed and connected members by their interests.
The feedback was great and some people asked me for the tool, so that they can
use it for own conferences. And so they did. Even large companies.

A little time I thought of using it as a business model, but life wanted
differently, I switched from freelance to a permanent position in DB Systel,
a subsidiary of Deutsche Bahn AG, so I could not continue this business model.

Nevertheless, I was organizing a similar conference in 2018, https://xcamp.co/,
and I wanted to use the tool again. But I found that there was a new version of
d3.js (v4), and wanted to use it. And, as you might know, if you are a developer,
you just don't like the code you have developed years before. We all learn,
and therefore I decided to start from scratch and create an open source
version, which you see here.
