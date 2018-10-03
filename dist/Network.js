'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*global d3,ForceDiagram, module*/
var nextId = function nextId(list) {
  return list.reduce(function (id, entry) {
    return Math.max(id, entry.id);
  }, 0) + 1;
};

var Network = function () {
  _createClass(Network, [{
    key: 'd3json',
    value: function d3json(what) {
      return new Promise(function (resolve, reject) {
        d3.json(what, function (error, data) {
          return error ? reject(error) : resolve(data);
        });
      });
    }
  }]);

  function Network(dataUrl, domSelector) {
    var _this = this;

    var handlers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var texts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    _classCallCheck(this, Network);

    handlers.error = handlers.error || function () {
      return undefined;
    };
    this.texts = texts;
    this.handlers = handlers;
    this.d3json(dataUrl).then(function (data) {
      _this.diagram = new ForceDiagram(document.querySelector(domSelector));
      if (_this.handlers.showDetails) {
        _this.details = document.createElement('div');
        _this.details.setAttribute('class', 'details');
        document.body.append(_this.details);
        _this.diagram.addHandler('click', function (node) {
          return _this.showDetails(node);
        });
      }

      var node = function node(id) {
        return data.nodes.find(function (node) {
          return node.id === id;
        }) || handlers.error('Node id ' + id + ' not found');
      };
      var id = 1;
      _this.links = data.nodes.map(function (source) {
        source.links = Object.assign.apply(Object, [{}].concat(_toConsumableArray((source.links || []).map(function (list) {
          var title = _this.texts && _this.texts[list.type] || list.type;
          var links = list.nodes.map(function (targetId) {
            return { id: id++, source: source, target: node(targetId) };
          });
          return _defineProperty({}, list.type, { type: list.type, title: title, links: links });
        }))));
        return Object.keys(source.links).map(function (type) {
          return source.links[type].links;
        }).reduce(function (a, b) {
          return a.concat(b);
        }, []);
      }).reduce(function (a, b) {
        return a.concat(b);
      }, []);
      _this.nodes = data.nodes;

      var setBothSidesVisible = function setBothSidesVisible(d) {
        return d.source.visible = d.target.visible = true;
      };
      _this.links.filter(function (d) {
        return d.source.open || d.target.open;
      }).map(setBothSidesVisible);
      var links = _this.links.filter(function (d) {
        return d.source.visible && d.target.visible;
      });
      var nodes = _this.nodes.filter(function (d) {
        return d.visible;
      });
      _this.diagram.add(nodes, links);
      _this.diagram.update();

      setTimeout(function () {
        document.body.className = 'initialized';
        _this.handlers.initialized && _this.handlers.initialized();
      }, 0);
    });
  }

  _createClass(Network, [{
    key: 'showDetails',
    value: function showDetails(node) {
      var _this2 = this;

      ForceDiagram.fixNode(node);
      var nodeEl = ForceDiagram.getDomElement(node);
      var container = document.createElement('div');
      var form = document.createElement('div');
      form.setAttribute('class', 'detailForm');
      container.appendChild(form);
      this.details.appendChild(container);
      this.diagram.scaleToNode(node, 1.2, -175, -30).then(function () {
        document.body.classList.add('dialogOpen');
        nodeEl.classList.add('menuActive');
      }).then(function () {
        return node.details ? _this2.d3json(node.details) : node;
      }).then(function (data) {
        return _this2.handlers.showDetails(data, form, node);
      }).catch(console.error) // eslint-disable-line no-console
      .then(function (newData) {
        node = newData || node;
        document.body.classList.remove('dialogOpen');
        nodeEl.classList.remove('menuActive');
        _this2.details.innerHTML = '';
        _this2.diagram.updateNode(node);
        _this2.diagram.update();
      });
    }
  }, {
    key: 'showNodes',
    value: function showNodes(node, type) {
      var _this3 = this;

      node.links[type].links.forEach(function (link) {
        link.target.visible = true;
        _this3.addNode(link.target);
        _this3.diagram.add([link.target], [link]);
      });
      this.diagram.update();
    }
  }, {
    key: 'toggle',
    value: function toggle(node) {
      return node.open ? this.closeNode(node) : this.openNode(node);
    }
  }, {
    key: 'closeNode',
    value: function closeNode(node) {
      var _this4 = this;

      node.open = false;
      this.links.filter(function (link) {
        return link.source.id === node.id || link.target.id === node.id;
      }).forEach(function (link) {
        var otherNode = link.source.id === node.id ? link.target : link.source;
        if (_this4.diagram.getLinkedNodes(otherNode).length === 1) {
          otherNode.visible = otherNode.keepVisible;
          if (!otherNode.visible) {
            _this4.diagram.remove([otherNode], []);
          }
        } else {
          _this4.diagram.remove([], [link]);
        }
      });

      this.diagram.scaleToNode(node, 1);
      this.diagram.update();
    }
  }, {
    key: 'openNode',
    value: function openNode(node) {
      var _this5 = this;

      node.open = true;
      this.links.filter(function (link) {
        return link.source.id === node.id || link.target.id === node.id;
      }).forEach(function (link) {
        var otherNode = link.source.id === node.id ? link.target : link.source;
        otherNode.visible = true;
        otherNode.x = node.x;
        otherNode.y = node.y;
        _this5.diagram.add([otherNode], [link]);
      });

      this.diagram.scaleToNode(node, 1);
      this.diagram.update();
    }
  }, {
    key: 'addNode',
    value: function addNode(node) {
      this.nodes.push(node);
      this.diagram.add([node], []);
    }
  }, {
    key: 'removeNode',
    value: function removeNode(node) {
      this.nodes = this.nodes.filter(function (n) {
        return n.id !== node.id;
      });
      this.links = this.links.filter(function (l) {
        return l.source.id !== node.id && l.target.id !== node.id;
      });
      this.diagram.remove([node], []);
      this.diagram.update();
      if (this.handlers.nodeRemoved) {
        this.handlers.nodeRemoved(node);
      }
    }
  }, {
    key: 'getNode',
    value: function getNode(id) {
      return this.nodes.find(function (node) {
        return node.id === id;
      });
    }
  }, {
    key: 'addLinks',
    value: function addLinks(links) {
      var _this6 = this;

      this.diagram.add([], links.map(function (l) {
        return { id: nextId(_this6.links), source: _this6.getNode(l.source.id), target: _this6.getNode(l.target.id) };
      }).map(function (l) {
        _this6.links.push(l);
        return l;
      }));
    }
  }, {
    key: 'removeLinks',
    value: function removeLinks(links) {
      var cmpLink = function cmpLink(a, b) {
        return a.source.id === b.source.id && a.target.id === b.target.id;
      };
      this.links = this.links.filter(function (l) {
        return !links.some(function (r) {
          return cmpLink(l, r);
        });
      });
      this.diagram.remove([], links);
    }
  }, {
    key: 'newConnection',
    value: function newConnection(node) {
      var _this7 = this;

      this.handlers.nameRequired().then(function (name) {
        return name ? name : Promise.reject('no name given');
      }).then(function (name) {
        var existing = _this7.nodes.find(function (node) {
          return node.name.toLowerCase() === name.toLowerCase();
        });
        if (!existing) {
          existing = _this7.handlers.newNode ? _this7.handlers.newNode(name) : { name: name };
          existing.id = existing.id || nextId(_this7.nodes);
          _this7.nodes.push(existing);
          _this7.diagram.add([existing], []);
        }
        if (!_this7.diagram.nodesConnected(node, existing)) {
          var newLink = { id: nextId(_this7.links), source: node, target: existing };
          if (_this7.handlers.newLink) {
            _this7.handlers.newLink(newLink);
          }
          _this7.links.push(newLink);
          _this7.diagram.add([], [newLink]);
        }

        _this7.diagram.update();
      }).catch(this.handlers.error);
    }
  }, {
    key: 'update',
    value: function update() {
      this.diagram.update();
    }
  }, {
    key: 'scale',
    value: function scale(factor) {
      return this.diagram.scale(factor);
    }
  }]);

  return Network;
}();

module.exports = Network;
//# sourceMappingURL=Network.js.map