function nextId(list) {
  return list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1
}

let overlay
let commandView
let activeNode

class Network {
  constructor(dataUrl, domSelector, handlers = {}) {
    overlay = document.querySelector(domSelector + ' .commandOverlay')
    commandView = document.querySelector(domSelector + ' .commandContainer')
    this.handlers = handlers
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      if (overlay) {
        overlay.addEventListener('click', () => this.hideCommandsView(activeNode))
      }
      if (commandView) {
        Array.from(commandView.querySelectorAll('.command')).forEach(command => {
          command.addEventListener('click', () => this[command.dataset.click](this.activeNode))
          command.visibleIf = node => command.dataset.visible ? eval(command.dataset.visible) : true
        })
        this.diagram.addHandler('click', this.showCommandsView.bind(this))
        this.diagram.addHandler('zoom', transform => commandView.setAttribute('transform', transform))
      }

      const getNode = id => {
        const result = data.nodes.find(node => node.id === id)
        if (!result) {
          console.error('Node id ' + id + ' not found')
        }
        return result
      }
      this.links = data.links.map((link, id) => ({
        id: id + 1,
        source: getNode(link.source),
        target: getNode(link.target)
      }))
      this.nodes = data.nodes

      const links = this.links.filter(d => {
        if (d.source.open || d.target.open) {
          d.source.visible = d.target.visible = true
        }
        return d.source.visible && d.target.visible
      })
      const nodes = this.nodes.filter(d => d.visible)
      this.diagram.add(nodes, links)
      this.diagram.update()

      setTimeout(() => document.body.className = 'initialized', 1)
    })
  }

  showCommandsView(node) {
    function activate(el) {
      if (el) {
        el.parentNode.appendChild(el)
        el.classList.add('active')
      }
    }

    const px = n => n ? (n + 'px') : n
    activeNode = node
    ForceDiagram.fixNode(node)
    this.activeNode = node
    Array.from(commandView.querySelectorAll('.command')).forEach(cmd => cmd.classList.toggle('active', !!cmd.visibleIf(node)))
    activate(overlay)
    activate(commandView)
    if (commandView) {
      commandView.children[0].setAttribute('style', 'transform: translate(' + px(node.x) + ',' + px(node.y) + ')')
    }
  }

  hideCommandsView(node) {
    function deactivate(el) {
      if (el) {
        el.parentNode.insertBefore(el, el.parentNode.children[0])
        el.classList.remove('active')
      }
    }

    ForceDiagram.releaseNode(node)
    deactivate(overlay)
    deactivate(commandView)
  }

  toggle(node) {
    if (node.open) {
      this.closeNode(node)
    } else {
      this.openNode(node)
    }
  }

  closeNode(node) {
    node.open = false
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        const otherNode = link.source.id === node.id ? link.target : link.source
        if (this.diagram.getLinkedNodes(otherNode).length === 1) {
          otherNode.visible = otherNode.keepVisible
          if (!otherNode.visible) {
            this.diagram.remove([otherNode], [])
          }
        } else {
          this.diagram.remove([], [link])
        }
      })

    this.diagram.scaleToNode(node, 1)
    this.diagram.update()
    this.hideCommandsView(node)
  }

  openNode(node) {
    node.open = true
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        const otherNode = link.source.id === node.id ? link.target : link.source
        otherNode.visible = true
        otherNode.x = node.x
        otherNode.y = node.y
        this.diagram.add([otherNode], [link])
      })

    this.diagram.scaleToNode(node, 1)
    this.diagram.update()
    this.hideCommandsView(node)
  }

  newConnection(node) {
    this.hideCommandsView(node)
    this.handlers.nameRequired()
      .then(name => name ? name : Promise.reject('no name given'))
      .then(name => {
        let existing = this.nodes.find(node => node.name === name)
        if (!existing) {
          existing = this.handlers.newNode ? this.handlers.newNode(name) : {name}
          existing.id = existing.id || nextId(this.nodes)
          this.diagram.add([existing], [])
        }
        if (!this.diagram.nodesConnected(node, existing)) {
          const newLink = {id: nextId(this.links), source: node, target: existing}
          if (this.handlers.newLink) {
            this.handlers.newLink(newLink)
          }
          this.diagram.add([], [newLink])
        }

        this.diagram.update()
      })
      .catch(error => console.error)
  }

  showDetails(node) {
    if (this.handlers.showDetails) {
      this.hideCommandsView(node)
      this.diagram.scaleToNode(node, 1000)
        .then(() => new Promise((resolve, reject) => d3.json(node.details, (error, data) => resolve([error, data]))))
        .then(([error, data]) => error ? Promise.reject(error) : data)
        .then(data => {
          this.diagram.hide()
          return this.handlers.showDetails(data)
        })
        .then(() => {
          this.diagram.show()
          this.diagram.scaleToNode(node, 1)
        })
    }
  }
}
