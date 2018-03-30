'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Network = function () {
  function Network(dataUrl, domSelector) {
    var _this = this;

    var handlers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Network);

    this.handlers = handlers;
    d3.json(dataUrl, function (error, data) {
      if (error) throw error;
      _this.diagram = new ForceDiagram(document.querySelector(domSelector), data.auth);
      _this.diagram.addHandler('click', _this.toggle.bind(_this));
      _this.diagram.addHandler('newConnection', _this.newConnection.bind(_this));
      var getNode = function getNode(id) {
        var result = data.nodes.find(function (node) {
          return node.id === id;
        });
        if (!result) {
          console.error('Node id ' + id + ' not found');
        }
        return result;
      };
      _this.links = data.links.map(function (link, id) {
        return {
          id: id + 1,
          source: getNode(link.source),
          target: getNode(link.target)
        };
      });
      _this.nodes = data.nodes;

      var links = _this.links.filter(function (d) {
        if (d.source.open || d.target.open) {
          d.source.visible = d.target.visible = true;
        }
        return d.source.visible && d.target.visible;
      });
      var nodes = _this.nodes.filter(function (d) {
        return d.visible;
      });
      _this.diagram.add(nodes, links);
      _this.diagram.update();

      setTimeout(function () {
        return document.body.className = 'initialized';
      }, 1);
    });
  }

  _createClass(Network, [{
    key: 'toggle',
    value: function toggle(node) {
      var _this2 = this;

      var otherNode = function otherNode(link) {
        return link.source.id === node.id ? link.target : link.source;
      };
      node.open = !node.open;
      this.links.filter(function (link) {
        return link.source.id === node.id || link.target.id === node.id;
      }).forEach(function (link) {
        if (node.open && _this2.links.indexOf(link) !== false) {
          otherNode(link).visible = true;
          _this2.diagram.add([otherNode(link)], [link]);
        } else if (!node.open && !link.source.open && !link.target.open) {
          otherNode(link).visible = otherNode(link).keepVisible;
          if (!otherNode(link).visible) {
            _this2.diagram.remove(otherNode(link));
          }
        }
      });

      this.diagram.update();
    }
  }, {
    key: 'newConnection',
    value: function newConnection(node, name) {
      var link = void 0;
      var existing = this.nodes.find(function (node) {
        return node.name === name;
      });
      if (!existing) {
        if (this.handlers.newNode) {
          existing = this.handlers.newNode(name);
        } else {
          existing = { name: name };
        }
        if (!existing.id) {
          existing.id = this.nodes.reduce(function (id, node) {
            return Math.max(id, node.id);
          }, 0) + 1;
        }
        this.diagram.add([existing], []);
      } else {
        link = this.links.find(function (link) {
          return link.source.id === existing.id || link.target.id === existing.id;
        });
      }
      if (!link) {
        var newLink = { source: node, target: existing };
        if (this.handlers.newLink) {
          this.handlers.newLink(newLink);
        }
        this.diagram.add([], [newLink]);
      }

      this.diagram.update();
    }
  }]);

  return Network;
}();
//# sourceMappingURL=Network.js.map