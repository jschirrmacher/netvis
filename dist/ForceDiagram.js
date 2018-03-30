'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ForceDiagram = function () {
  function ForceDiagram(domSelector) {
    var _this = this;

    _classCallCheck(this, ForceDiagram);

    this.links = [];
    this.nodes = [];
    this.handlers = {};
    var svg = d3.select(domSelector);
    this.center = { x: svg.node().scrollWidth / 2, y: svg.node().scrollHeight / 2 };
    this.defs = svg.append('defs');
    var svgGroup = svg.append('g').attr('id', 'svgGroup');

    this.simulation = d3.forceSimulation().velocityDecay(0.55).force('link', d3.forceLink().distance(100).id(function (d) {
      return d.id;
    })).force('charge', d3.forceManyBody().strength(-100).distanceMin(1000)).force('collide', d3.forceCollide().radius(100).iterations(2));

    this.drag = d3.drag().on('start', function (d) {
      return handleDragStarted(d, _this.simulation);
    }).on('drag', function (d) {
      return handleDragged(d);
    }).on('end', function (d) {
      return handleDragEnded(d, _this.simulation);
    });

    svg.call(d3.zoom().on('zoom', handleZoom)).call(this.drag);

    this.linkContainer = svgGroup.append('g').attr('class', 'links');
    this.nodeContainer = svgGroup.append('g').attr('class', 'nodes');

    this.update();

    function handleZoom() {
      svgGroup.attr('transform', 'translate(' + d3.event.transform.x + ', ' + d3.event.transform.y + ')' + ' ' + ('scale(' + d3.event.transform.k + ')'));
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
        return d.id;
      }).attr('class', function (d) {
        return 'node' + (d.open ? ' open' : '');
      }).call(this.drag);

      Object.keys(this.handlers).forEach(function (type) {
        return nodeEnter.on(type, _this2.handlers[type]);
      });
      nodeData.exit().remove();

      nodeEnter.filter(function (d) {
        return d.shape === 'circle';
      }).append('circle').classed('node', true).attr('r', 50).attr('fill', function (d) {
        return getBackground(d.id, d.logo, _this2.defs);
      });

      nodeEnter.filter(function (d) {
        return d.shape === 'rect';
      }).append('rect').classed('node', true).attr('x', -50).attr('y', -35).attr('width', 100).attr('height', 70).attr('fill', function (d) {
        return getBackground(d.id, d.logo, _this2.defs);
      });

      nodeEnter.append('text').text(function (d) {
        return d.name;
      }).call(function (d) {
        return wrap(d, 90);
      });

      nodeData = nodeEnter.merge(nodeData);
      this.simulation.nodes(this.nodes).on('tick', function () {
        return handleTicks(_this2.center);
      });

      this.simulation.restart();
      this.simulation.alpha(1);

      function handleTicks(center) {
        linkData.attr('x1', function (d) {
          return d.source.x + center.x;
        }).attr('y1', function (d) {
          return d.source.y + center.y;
        }).attr('x2', function (d) {
          return d.target.x + center.x;
        }).attr('y2', function (d) {
          return d.target.y + center.y;
        });

        nodeData.attr('transform', function (d) {
          return 'translate(' + [d.x + center.x, d.y + center.y] + ')';
        });
      }

      function getBackground(id, logo, defs) {
        if (logo) {
          defs.append('pattern').attr('id', function () {
            return 'bg-' + id;
          }).attr('height', 1).attr('width', 1).append('image').attr('xlink:href', logo.replace(/ /g, '%20')).attr('height', '100px').attr('width', '100px').attr('preserveAspectRatio', 'xMidYMid slice');
        }

        return logo ? 'url(#bg-' + id + ')' : '#ffe';
      }

      function wrap(text, width) {
        text.each(function (node) {
          var text = d3.select(this);
          var words = node.name.split(/[\s-]+/).reverse();
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
    key: 'add',
    value: function add(nodesToAdd, linksToAdd) {
      var _this3 = this;

      if (nodesToAdd) {
        nodesToAdd.forEach(function (n) {
          return _this3.nodes.push(n);
        });
      }
      if (linksToAdd) {
        linksToAdd.forEach(function (l) {
          return _this3.links.push(l);
        });
      }
    }
  }, {
    key: 'remove',
    value: function remove(dToRemove) {
      var _this4 = this;

      var nIndex = this.nodes.indexOf(dToRemove);
      if (nIndex > -1) {
        this.nodes.splice(nIndex, 1);
      }

      var isidConnected = function isidConnected(link, id) {
        return link.source.id === id || link.target.id === id;
      };
      this.links.forEach(function (l, index) {
        return isidConnected(l, dToRemove.id) && _this4.links.splice(index, 1);
      });
    }
  }]);

  return ForceDiagram;
}();
//# sourceMappingURL=ForceDiagram.js.map