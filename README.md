# README

This package visualizes network dependencies.

[![Screenshot - click to see it in action](https://jschirrmacher.github.io/netvis/example/netvis.png)](https://jschirrmacher.github.io/netvis/example/netvis.html)

It uses the famous https://d3js.org/ library's force diagram and adds a couple of
functions to make it ease to use it with json formatted data, which might be
static (from a simple file) or could be created dynamically by a server program.

Features:

- Can show different types of nodes: circle or rectangle
- can show large networks by letting the user click on the nodes to hide or show the connections of the node
- Draggable and zoomable canvas, draggable nodes
- Written completely in ES6

## Usage

To use the package, all you need to do is include some JavaScripts into your html

    <script src="//d3js.org/d3.v4.min.js"></script>
    <script src="https://jschirrmacher.github.io/netvis/dist/Network.js"></script>
    <script src="https://jschirrmacher.github.io/netvis/dist/ForceDiagram.js"></script>

and define a SVG image like that:

    <svg id="root"></svg>

All you need else is an initialization call:

    <script>
      new Network('data.json', '#root')
    </script>

It reads data from the URL given as the first parameter and displays the network
in the svg referenced by the selector defined by the second parameter.

You can find a simple example in the file `example/netvis.html` in this package. It uses a
stylesheet `example/netvis.css` which was compiled via https://sass-lang.com/ from `example/netvis.scss`.
I like Sass very much because it helps using DRY principles, but you are free to use
another tool for that or to write css by yourself.

## Stucture of network data

The data which is displayed, needs to be JSON encoded and must contain two parts,
`nodes` and `links` on the top level:

    {
        "nodes": [],
        "links": []
    }

Nodes is a list of nodes to display, and links - you guessed it - the list of links
between these nodes.

Each node therefore has an ID, which can be referenced in `links`:

    {
        "nodes": [
            {"id": 1, "name": "First", "shape": "circle", "open": true},
            {"id": 2, "name": "Second", "shape": "rect", "open": true}
        ],
        "links": [
            {"source": 1, "target": 2}
        ]
    }

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
  even if the user clicks on it. By making important nodes (the root
  of the network for example) always visible, the user cannot by
  inadvertenty close all nodes in the network.
- `connectable` - when set `true`, an icon is shown when the user hovers over
  a node, allowing to create a new node connected to the current one. See the
  chapter "Handlers" to learn what you should do to make that persistent.

You find a more complete example in the file `example/data.json`.

## Handlers

When calling `new Network()` (see above), there is an optional third parameter,
which is an object containing event handlers which are called, if the user
does an action which requires the network to be changed permanently.

These are the possible events:

- `nameRequired` - The user is required to enter or select a node name. This
  event is sent, if a new connection is to be created. The handler should
  open a dialog and return a Promise which receives the entered node name.
- `newNode` - a new node was created. The handler gets the node name as a
  parameter. It should return a data structure for the new node which is then
  added to the network visualization.
- `newLink` - a new link between two nodes was created. The handler
  gets the data structure `{source, target}` of the link as a parameter.

Normally, an application should store the new data in a database or a file
system, when newNode or newLink events arrive.

If the handlers aren't defined, simply nothing happens.

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

## History

I created the visualisation tool primarily for a conference I was organizing,
http://www.leancamp.net/

After doing that for two times in 2015 and 2016, I found that many of the
participants liked to get in contact with others with similar topics or
with others who engage with a specific topic, but they didn't know, who
that could be.

So, for the third event, I created a first version of this tool and added
a node for each participant directly after he or she bought a ticket.
After confirming the e-mail address, the participant could then add his
or her topics, so creating additional connected nodes.

Time by time, the network developed and connected members by their interests.
The feedback was great and some asked me for the tool, so that they can
use it for own conferences.

A little time I thought of using it as a business model, but life wanted
differently, I switched from freelance to a permanent position in DB Systel,
a subsidiary of Deutsche Bahn AG, so I could not continue this business model.

Since I am organizing a similar conference now (2018), https://xcamp.co/, I
wanted to use the tool again, but found that there is a new version of
d3.js, and wanted to use it. And, as you might know, if you are a developer,
you just don't like the code you have developed years before. We all learn,
and therefore I decided to start from scratch and create an open source
version, which you see here.
