'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*global d3*/
var currentZoom = 1;

var ForceDiagram = function () {
  function ForceDiagram(domSelector) {
    var _this = this;

    _classCallCheck(this, ForceDiagram);

    this.links = [];
    this.nodes = [];
    this.handlers = {};
    this.svg = d3.select(domSelector);
    this.center = { x: this.svg.node().width.baseVal.value / 2, y: this.svg.node().height.baseVal.value / 2 };
    this.defs = this.svg.append('defs');
    this.svgGroup = this.svg.append('g').attr('id', 'svgGroup');

    this.simulation = d3.forceSimulation().velocityDecay(0.55).force('link', d3.forceLink().distance(function (d) {
      return d.distance || 100;
    }).id(function (d) {
      return d.id;
    })).force('charge', d3.forceManyBody().strength(-100).distanceMin(1000)).force('collide', d3.forceCollide().radius(function (d) {
      return d.distance || 100;
    }).iterations(2)).force('center', d3.forceCenter(this.center.x, this.center.y)).force('x', d3.forceX(this.center.x).strength(0.1)).force('y', d3.forceY(this.center.y).strength(0.1));

    this.drag = d3.drag().on('start', function (d) {
      return handleDragStarted(d, _this.simulation);
    }).on('drag', function (d) {
      return handleDragged(d);
    }).on('end', function (d) {
      return handleDragEnded(d, _this.simulation);
    });

    this.zoom = d3.zoom().on('zoom', handleZoom.bind(this));

    this.svg.call(this.zoom).call(this.drag);

    this.linkContainer = this.svgGroup.append('g').attr('class', 'links');
    this.nodeContainer = this.svgGroup.append('g').attr('class', 'nodes');

    this.update();

    function handleZoom() {
      var transform = 'translate(' + (d3.event.transform.x || 0) + ', ' + (d3.event.transform.y || 0) + ') scale(' + (d3.event.transform.k || 1) + ')';
      this.svgGroup.attr('transform', transform);
      currentZoom = d3.event.transform.k;
      if (this.handlers.zoom) {
        this.handlers.zoom(transform);
      }
    }

    function handleDragStarted(d, simulation) {
      if (!d3.event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function handleDragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function handleDragEnded(d, simulation) {
      if (!d3.event.active) {
        simulation.alphaTarget(0);
      }
      d.fx = undefined;
      d.fy = undefined;
    }
  }

  _createClass(ForceDiagram, [{
    key: 'addHandler',
    value: function addHandler(type, handler) {
      this.handlers[type] = handler;
    }
  }, {
    key: 'update',
    value: function update() {
      var linkData = this.linkContainer.selectAll('line').data(this.links, function (d) {
        return d.id;
      });
      var linkEnter = linkData.enter().append('line');
      linkData.exit().remove();
      linkData = linkEnter.merge(linkData);
      this.simulation.force('link').links(this.links);

      var nodeData = this.nodeContainer.selectAll('g').data(this.nodes, function (d) {
        return d.id;
      });
      var nodeEnter = nodeData.enter().append('g').attr('id', function (d) {
        return 'node-' + d.id;
      }).attr('class', function (d) {
        return d.className || '';
      }).classed('node', true).classed('open', function (d) {
        return d.open;
      }).classed('withBg', function (d) {
        return d.image;
      }).call(this.drag).call(bindHandlers.bind(this));

      nodeData.exit().remove();

      nodeEnter.filter(function (d) {
        return d.shape === 'circle';
      }).call(addCircleNode.bind(this));
      nodeEnter.filter(function (d) {
        return d.shape === 'rect';
      }).call(addRectNode.bind(this));

      nodeEnter.append('text').classed('title', true).text(function (d) {
        return d.name;
      }).call(function (d) {
        return wrap(d, 90);
      });

      nodeData = nodeEnter.merge(nodeData);
      this.simulation.nodes(this.nodes).on('tick', function () {
        return handleTicks();
      });

      this.simulation.alpha(0.3);
      this.simulation.restart();

      function bindHandlers(node) {
        var _this2 = this;

        Object.keys(this.handlers).forEach(function (type) {
          return node.on(type, _this2.handlers[type]);
        });
      }

      function addCircleNode(enter) {
        enter.append('circle').attr('r', 50).attr('fill', getBackground.bind(this));
      }

      function addRectNode(enter) {
        enter.append('rect').attr('x', -50).attr('y', -35).attr('width', 100).attr('height', 70).attr('fill', getBackground.bind(this));
      }

      function handleTicks() {
        linkData.attr('x1', function (d) {
          return d.source.x;
        }).attr('y1', function (d) {
          return d.source.y;
        }).attr('x2', function (d) {
          return d.target.x;
        }).attr('y2', function (d) {
          return d.target.y;
        });

        nodeData.attr('transform', function (d) {
          return 'translate(' + [d.x, d.y] + ')';
        });
      }

      function getBackground(node) {
        if (node.image) {
          this.defs.select('#bg-' + node.id).remove();
          this.defs.append('pattern').attr('id', function () {
            return 'bg-' + node.id;
          }).attr('height', 1).attr('width', 1).append('image').attr('xlink:href', node.image.replace(/ /g, '%20')).attr('height', '100px').attr('width', '100px').attr('preserveAspectRatio', 'xMidYMid slice');
        }

        return node.image ? 'url(#bg-' + node.id + ')' : '#eef';
      }

      function wrap(text, width) {
        text.each(function (node) {
          node.fontSize = node.fontSize || 1;
          var text = d3.select(this);
          var words = (node.name || '').split(/[\s-]+/).reverse();
          var lineHeight = 1.1;
          var line = [];
          var tspan = text.text(null).append('tspan').attr('style', 'font-size: ' + node.fontSize * 14 + 'px');
          var word = void 0;
          var lineCount = 0;
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(' '));
              lineCount++;
              line = [word];
              tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeight + 'em').text(word).attr('style', 'font-size: ' + node.fontSize * 14 + 'px');
            }
          }
          text.attr('y', -lineCount * 0.3 + 'em');

          var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          var bbox = this.getBBox();
          rect.setAttribute('class', 'text-bg');
          rect.setAttribute('x', bbox.x - 5);
          rect.setAttribute('y', bbox.y - 3);
          rect.setAttribute('width', bbox.width + 10);
          rect.setAttribute('height', bbox.height + 6);
          text.node().parentNode.insertBefore(rect, this);
        });
      }
    }
  }, {
    key: 'getLinkedNodes',
    value: function getLinkedNodes(node) {
      return this.links.filter(function (l) {
        return l.source.id === node.id;
      }).map(function (l) {
        return l.target;
      }).concat(this.links.filter(function (l) {
        return l.target.id === node.id;
      }).map(function (l) {
        return l.source;
      }));
    }
  }, {
    key: 'nodesConnected',
    value: function nodesConnected(node1, node2) {
      return this.getLinkedNodes(node1).some(function (n) {
        return n.id === node2.id;
      });
    }
  }, {
    key: 'add',
    value: function add(nodesToAdd, linksToAdd) {
      var _this3 = this;

      if (nodesToAdd) {
        nodesToAdd.forEach(function (n) {
          return !_this3.nodes.some(function (d) {
            return d.id === n.id;
          }) && _this3.nodes.push(n);
        });
      }
      if (linksToAdd) {
        linksToAdd.forEach(function (l) {
          return !_this3.nodesConnected(l.source, l.target) && _this3.links.push(l);
        });
      }
    }
  }, {
    key: 'remove',
    value: function remove(nodesToRemove, linksToRemove) {
      var _this4 = this;

      nodesToRemove.forEach(function (node) {
        _this4.links = _this4.links.filter(function (l) {
          return !ForceDiagram.isConnected(l, node);
        });
        _this4.nodes = _this4.nodes.filter(function (n) {
          return n.id !== node.id;
        });
      });
      this.links = this.links.filter(function (l) {
        return !linksToRemove.some(function (r) {
          return r.source.id === l.source.id && r.target.id === l.target.id || r.source.id === l.target.id && r.source.id === l.source.id;
        });
      });
    }
  }, {
    key: 'updateNode',
    value: function updateNode(node) {
      node = Object.assign(this.nodes.splice(this.nodes.findIndex(function (n) {
        return n.id === node.id;
      }), 1)[0], node);
      this.update();
      this.nodes.push(node);
    }
  }, {
    key: 'scaleToNode',
    value: function scaleToNode(node, scale) {
      var _this5 = this;

      var diffX = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var diffY = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

      return new Promise(function (resolve) {
        ForceDiagram.fixNode(node);
        _this5.svg.transition().duration(1000).call(_this5.zoom.transform, d3.zoomIdentity.translate(_this5.center.x + diffX, _this5.center.y + diffY).scale(scale).translate(-node.x, -node.y)).on('end', function () {
          ForceDiagram.releaseNode(node);
          resolve(true);
        });
      });
    }
  }, {
    key: 'scale',
    value: function scale(factor) {
      var _this6 = this;

      return new Promise(function (resolve) {
        var m = _this6.svgGroup.node().getAttribute('transform');
        var d = m && m.match(/[\d.]+/g).map(function (a) {
          return +a;
        }) || [0, 0, 1];
        _this6.svg.transition().duration(1000).call(_this6.zoom.transform, d3.zoomIdentity.translate(factor * d[0] - (factor - 1) * _this6.center.x, factor * d[1] - (factor - 1) * _this6.center.y).scale(factor * currentZoom)).on('end', function () {
          return resolve(true);
        });
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      this.svg.attr('style', 'opacity: 0; position: absolute; transition: opacity 0.5s');
    }
  }, {
    key: 'show',
    value: function show() {
      this.svg.attr('style', 'opacity: 1; transition: opacity 0.5s');
    }
  }], [{
    key: 'isConnected',
    value: function isConnected(link, node) {
      return link.source.id === node.id || link.target.id === node.id;
    }
  }, {
    key: 'fixNode',
    value: function fixNode(node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  }, {
    key: 'releaseNode',
    value: function releaseNode(node) {
      node.fx = undefined;
      node.fy = undefined;
    }
  }, {
    key: 'getDomElement',
    value: function getDomElement(node) {
      return document.getElementById('node-' + node.id);
    }
  }]);

  return ForceDiagram;
}();
//# sourceMappingURL=ForceDiagram.js.map