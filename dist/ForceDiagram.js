'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var currentZoom = 1;

var ForceDiagram = function () {
  function ForceDiagram(domSelector) {
    var _this = this;

    _classCallCheck(this, ForceDiagram);

    this.links = [];
    this.nodes = [];
    this.handlers = {};
    this.svg = d3.select(domSelector);
    this.center = { x: this.svg.node().scrollWidth / 2, y: this.svg.node().scrollHeight / 2 };
    this.defs = this.svg.append('defs');
    var svgGroup = this.svg.append('g').attr('id', 'svgGroup');

    this.simulation = d3.forceSimulation().velocityDecay(0.55).force('link', d3.forceLink().distance(100).id(function (d) {
      return d.id;
    })).force('charge', d3.forceManyBody().strength(-100).distanceMin(1000)).force('collide', d3.forceCollide().radius(100).iterations(2)).force('center', d3.forceCenter(this.center.x, this.center.y));

    this.drag = d3.drag().on('start', function (d) {
      return handleDragStarted(d, _this.simulation);
    }).on('drag', function (d) {
      return handleDragged(d);
    }).on('end', function (d) {
      return handleDragEnded(d, _this.simulation);
    });

    this.zoom = d3.zoom().on('zoom', handleZoom.bind(this));

    this.svg.call(this.zoom).call(this.drag);

    this.linkContainer = svgGroup.append('g').attr('class', 'links');
    this.nodeContainer = svgGroup.append('g').attr('class', 'nodes');

    this.update();

    function handleZoom() {
      var transform = 'translate(' + d3.event.transform.x + ', ' + d3.event.transform.y + ') scale(' + d3.event.transform.k + ')';
      svgGroup.attr('transform', transform);
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
      var _this2 = this;

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
      }).classed('node', true).classed('open', function (d) {
        return d.open;
      }).classed('withBg', function (d) {
        return d.image;
      }).call(this.drag);

      nodeData.exit().remove();

      nodeEnter.filter(function (d) {
        return d.shape === 'circle';
      }).call(addCircleNode.bind(this));
      nodeEnter.filter(function (d) {
        return d.shape !== 'circle';
      }).call(addRectNode.bind(this));

      nodeEnter.append('text').classed('title', true).text(function (d) {
        return d.name;
      }).call(function (d) {
        return wrap(d, 90);
      });

      nodeData = nodeEnter.merge(nodeData);
      this.simulation.nodes(this.nodes).on('tick', function () {
        return handleTicks.bind(_this2)(_this2.center);
      });

      this.simulation.alpha(0.3);
      this.simulation.restart();

      function bindHandlers(node) {
        var _this3 = this;

        Object.keys(this.handlers).forEach(function (type) {
          return node.on(type, _this3.handlers[type]);
        });
      }

      function addCircleNode(enter) {
        enter.append('circle').classed('node', true).classed('open', function (d) {
          return d.open;
        }).attr('r', 50).attr('fill', getBackground.bind(this)).call(bindHandlers.bind(this));
      }

      function addRectNode(enter) {
        enter.append('rect').classed('node', true).classed('open', function (d) {
          return d.open;
        }).attr('x', -50).attr('y', -35).attr('width', 100).attr('height', 70).attr('fill', getBackground.bind(this)).call(bindHandlers.bind(this));
      }

      function handleTicks(center) {
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
          this.defs.append('pattern').attr('id', function () {
            return 'bg-' + node.id;
          }).attr('height', 1).attr('width', 1).append('image').attr('xlink:href', node.image.replace(/ /g, '%20')).attr('height', '100px').attr('width', '100px').attr('preserveAspectRatio', 'xMidYMid slice');
        }

        return node.image ? 'url(#bg-' + node.id + ')' : '#eef';
      }

      function wrap(text, width) {
        text.each(function (node) {
          var text = d3.select(this);
          var words = (node.name || '').split(/[\s-]+/).reverse();
          var lineHeight = 1.1;
          var line = [];
          var tspan = text.text(null).append('tspan');
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
              tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeight + 'em').text(word);
            }
          }
          text.attr('y', -lineCount * 0.3 + 'em');
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
      var _this4 = this;

      if (nodesToAdd) {
        nodesToAdd.forEach(function (n) {
          return !_this4.nodes.some(function (d) {
            return d.id === n.id;
          }) && _this4.nodes.push(n);
        });
      }
      if (linksToAdd) {
        linksToAdd.forEach(function (l) {
          return !_this4.nodesConnected(l.source, l.target) && _this4.links.push(l);
        });
      }
    }
  }, {
    key: 'remove',
    value: function remove(nodesToRemove, linksToRemove) {
      var _this5 = this;

      nodesToRemove.forEach(function (n) {
        if (n.index > -1) {
          _this5.nodes.splice(n.index, 1);
        }
        _this5.links.forEach(function (l, index) {
          return ForceDiagram.isConnected(l, n) && _this5.links.splice(index, 1);
        });
      });
      linksToRemove.forEach(function (l) {
        return l.index > -1 && _this5.links.splice(l.index, 1);
      });
    }
  }, {
    key: 'scaleToNode',
    value: function scaleToNode(node, scale) {
      var _this6 = this;

      return new Promise(function (resolve) {
        ForceDiagram.fixNode(node);
        _this6.svg.transition().duration(1000).call(_this6.zoom.transform, d3.zoomIdentity.translate(_this6.center.x, _this6.center.y).scale(scale).translate(-node.x, -node.y)).on('end', function () {
          ForceDiagram.releaseNode(node);
          resolve(true);
        });
      });
    }
  }, {
    key: 'scale',
    value: function scale(factor) {
      var _this7 = this;

      return new Promise(function (resolve) {
        _this7.svg.transition().duration(1000).call(_this7.zoom.transform, d3.zoomIdentity.scale(factor * currentZoom)).on('end', function () {
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
  }]);

  return ForceDiagram;
}();
//# sourceMappingURL=ForceDiagram.js.map