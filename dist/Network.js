'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var nextId = function nextId(list) {
  return list.reduce(function (id, entry) {
    return Math.max(id, entry.id);
  }, 0) + 1;
};

var overlay = void 0;
var commandView = void 0;

var Network = function () {
  function Network(dataUrl, domSelector) {
    var _this = this;

    var handlers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Network);

    this.handlers = handlers;
    d3.json(dataUrl, function (error, data) {
      if (error) throw error;
      _this.diagram = new ForceDiagram(document.querySelector(domSelector));
      if (overlay = document.querySelector(domSelector + ' .commandOverlay')) {
        overlay.addEventListener('click', function () {
          return _this.hideCommandsView(_this.activeNode);
        });
      }
      if (commandView = document.querySelector(domSelector + ' .commandContainer')) {
        Array.from(commandView.querySelectorAll('.command')).forEach(function (command) {
          command.addEventListener('click', function () {
            return _this[command.dataset.click](_this.activeNode);
          });
          command.visibleIf = function (node) {
            return command.dataset.visible ? eval(command.dataset.visible) : true;
          };
        });
        _this.diagram.addHandler('click', _this.showCommandsView.bind(_this));
        _this.diagram.addHandler('zoom', function (transform) {
          return commandView.setAttribute('transform', transform);
        });
      }

      var node = function node(id) {
        return data.nodes.find(function (node) {
          return node.id === id;
        }) || console.error('Node id ' + id + ' not found');
      };
      _this.links = data.links.map(function (link, id) {
        return { id: id + 1, source: node(link.source), target: node(link.target) };
      });
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
    key: 'showCommandsView',
    value: function showCommandsView(node) {
      var setActive = function setActive(el) {
        el.parentNode.appendChild(el);
        el.classList.add('active');
      };
      var activate = function activate(el) {
        return el && setActive(el);
      };
      var px = function px(n) {
        return n ? n + 'px' : n;
      };
      ForceDiagram.fixNode(node);
      this.activeNode = node;
      this.diagram.getDomElement(node).classList.add('menuActive');
      Array.from(commandView.querySelectorAll('.command')).forEach(function (cmd) {
        return cmd.classList.toggle('active', !!cmd.visibleIf(node));
      });
      activate(overlay);
      activate(commandView);
      if (commandView) {
        commandView.children[0].setAttribute('style', 'transform: translate(' + px(node.x) + ',' + px(node.y) + ')');
      }
    }
  }, {
    key: 'hideCommandsView',
    value: function hideCommandsView(node) {
      var setInactive = function setInactive(el) {
        el.parentNode.insertBefore(el, el.parentNode.children[0]);
        el.classList.remove('active');
      };
      var deactivate = function deactivate(el) {
        return el && setInactive(el);
      };

      if (node) {
        ForceDiagram.releaseNode(node);
        this.diagram.getDomElement(node).classList.remove('menuActive');
      }
      deactivate(overlay);
      deactivate(commandView);
    }
  }, {
    key: 'toggle',
    value: function toggle(node) {
      return node.open ? this.closeNode(node) : this.openNode(node);
    }
  }, {
    key: 'closeNode',
    value: function closeNode(node) {
      var _this2 = this;

      node.open = false;
      this.links.filter(function (link) {
        return link.source.id === node.id || link.target.id === node.id;
      }).forEach(function (link) {
        var otherNode = link.source.id === node.id ? link.target : link.source;
        if (_this2.diagram.getLinkedNodes(otherNode).length === 1) {
          otherNode.visible = otherNode.keepVisible;
          if (!otherNode.visible) {
            _this2.diagram.remove([otherNode], []);
          }
        } else {
          _this2.diagram.remove([], [link]);
        }
      });

      this.diagram.scaleToNode(node, 1);
      this.diagram.update();
      this.hideCommandsView(node);
    }
  }, {
    key: 'openNode',
    value: function openNode(node) {
      var _this3 = this;

      node.open = true;
      this.links.filter(function (link) {
        return link.source.id === node.id || link.target.id === node.id;
      }).forEach(function (link) {
        var otherNode = link.source.id === node.id ? link.target : link.source;
        otherNode.visible = true;
        otherNode.x = node.x;
        otherNode.y = node.y;
        _this3.diagram.add([otherNode], [link]);
      });

      this.diagram.scaleToNode(node, 1);
      this.diagram.update();
      this.hideCommandsView(node);
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
      this.hideCommandsView(node);
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
      var _this4 = this;

      this.diagram.add([], links.map(function (l) {
        return { id: nextId(_this4.links), source: _this4.getNode(l.source.id), target: _this4.getNode(l.target.id) };
      }).map(function (l) {
        _this4.links.push(l);
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
      var _this5 = this;

      this.hideCommandsView(node);
      this.handlers.nameRequired().then(function (name) {
        return name ? name : Promise.reject('no name given');
      }).then(function (name) {
        var existing = _this5.nodes.find(function (node) {
          return node.name.toLowerCase() === name.toLowerCase();
        });
        if (!existing) {
          existing = _this5.handlers.newNode ? _this5.handlers.newNode(name) : { name: name };
          existing.id = existing.id || nextId(_this5.nodes);
          _this5.nodes.push(existing);
          _this5.diagram.add([existing], []);
        }
        if (!_this5.diagram.nodesConnected(node, existing)) {
          var newLink = { id: nextId(_this5.links), source: node, target: existing };
          if (_this5.handlers.newLink) {
            _this5.handlers.newLink(newLink);
          }
          _this5.links.push(newLink);
          _this5.diagram.add([], [newLink]);
        }

        _this5.diagram.update();
      }).catch(console.error);
    }
  }, {
    key: 'update',
    value: function update() {
      this.diagram.update();
    }
  }, {
    key: 'showDetails',
    value: function showDetails(node) {
      var _this6 = this;

      if (this.handlers.showDetails) {
        document.body.classList.add('dialogOpen');
        this.hideCommandsView(node);
        this.diagram.scaleToNode(node, 1000).then(function () {
          return new Promise(function (resolve) {
            return d3.json(node.details, function (error, data) {
              return resolve([error, data]);
            });
          });
        }).then(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              error = _ref2[0],
              data = _ref2[1];

          return error ? Promise.reject(error) : data;
        }).then(function (data) {
          _this6.diagram.hide();
          return _this6.handlers.showDetails(data);
        }).then(function (newData) {
          node = newData || node;
          document.body.classList.remove('dialogOpen');
          _this6.diagram.show();
          _this6.diagram.updateNode(node);
          _this6.diagram.scaleToNode(node, 1);
          _this6.diagram.update();
        });
      }
    }
  }, {
    key: 'scale',
    value: function scale(factor) {
      return this.diagram.scale(factor);
    }
  }]);

  return Network;
}();
//# sourceMappingURL=Network.js.map