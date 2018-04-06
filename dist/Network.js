'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function maxId(list) {
  return list.reduce(function (id, entry) {
    return Math.max(id, entry.id);
  }, 0) + 1;
}

var Network = function () {
  function Network(dataUrl, domSelector) {
    var _this = this;

    var handlers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Network);

    this.handlers = handlers;
    d3.json(dataUrl, function (error, data) {
      if (error) throw error;
      _this.diagram = new ForceDiagram(document.querySelector(domSelector));
      _this.commandsOverlay = document.querySelector(domSelector + ' .commandOverlay');
      if (_this.commandsOverlay) {
        _this.commands = _this.commandsOverlay.querySelector('.commands');
        Array.from(_this.commands.children).forEach(function (command) {
          command.addEventListener('click', function () {
            return _this[command.dataset.click](_this.activeNode);
          });
          command.visibleIf = function (node) {
            return command.dataset.visible ? eval(command.dataset.visible) : true;
          };
        });
        _this.diagram.addHandler('click', _this.showCommandsView.bind(_this));
        _this.diagram.addHandler('zoom', _this.applyTransform.bind(_this));
      }

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
    key: 'showCommandsView',
    value: function showCommandsView(node) {
      var px = function px(n) {
        return n ? n + 'px' : n;
      };
      ForceDiagram.fixNode(node);
      this.activeNode = node;
      Array.from(this.commands.children).forEach(function (cmd) {
        return cmd.classList.toggle('active', !!cmd.visibleIf(node));
      });
      var overlay = this.commandsOverlay;
      overlay.parentNode.appendChild(overlay); // move to end of svg elements to have the menu on top
      overlay.classList.add('active');
      var view = this.commands;
      view.setAttribute('x', px(node.x));
      view.setAttribute('y', px(node.y));
      view.classList.add('active');
      overlay.addEventListener('click', clickHandler);

      function clickHandler(event) {
        overlay.removeEventListener('click', clickHandler);
        ForceDiagram.releaseNode(node);
        view.classList.remove('active');
        overlay.classList.remove('active');
        // move to start of svg elements to make nodes accessible
        overlay.parentNode.insertBefore(overlay, overlay.parentNode.children[0]);
      }
    }
  }, {
    key: 'applyTransform',
    value: function applyTransform(transform) {
      this.commandsOverlay.querySelector('.commands').setAttribute('transform', transform);
    }
  }, {
    key: 'toggle',
    value: function toggle(node) {
      if (node.open) {
        this.closeNode(node);
      } else {
        this.openNode(node);
      }
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
    }
  }, {
    key: 'newConnection',
    value: function newConnection(node) {
      var _this4 = this;

      this.handlers.nameRequired().then(function (name) {
        return name ? name : Promise.reject('no name given');
      }).then(function (name) {
        var link = void 0;
        var existing = _this4.nodes.find(function (node) {
          return node.name === name;
        });
        if (!existing) {
          if (_this4.handlers.newNode) {
            existing = _this4.handlers.newNode(name);
          } else {
            existing = { name: name };
          }
          if (!existing.id) {
            existing.id = _this4.nodes.reduce(function (id, node) {
              return Math.max(id, node.id);
            }, 0) + 1;
          }
          _this4.diagram.add([existing], []);
        } else {
          link = _this4.links.find(function (link) {
            return link.source.id === existing.id || link.target.id === existing.id;
          });
        }
        if (!link) {
          var id = maxId(_this4.links) + 1;
          var newLink = { id: id, source: node, target: existing };
          if (_this4.handlers.newLink) {
            _this4.handlers.newLink(newLink);
          }
          _this4.diagram.add([], [newLink]);
        }

        _this4.diagram.update();
      }).catch(function (error) {
        return console.error;
      });
    }
  }, {
    key: 'showDetails',
    value: function showDetails(node) {
      var _this5 = this;

      if (this.handlers.showDetails) {
        this.diagram.scaleToNode(node, 1000).then(function () {
          return new Promise(function (resolve, reject) {
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
          _this5.diagram.hide();
          return _this5.handlers.showDetails(data);
        }).then(function () {
          _this5.diagram.show();
          _this5.diagram.scaleToNode(node, 1);
        });
      }
    }
  }]);

  return Network;
}();
//# sourceMappingURL=Network.js.map