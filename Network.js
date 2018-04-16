const nextId = list => list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1

let overlay
let commandView

class Network {
  constructor(dataUrl, domSelector, handlers = {}) {
    this.handlers = handlers
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      if ((overlay = document.querySelector(domSelector + ' .commandOverlay'))) {
        overlay.addEventListener('click', () => this.hideCommandsView(this.activeNode))
      }
      if ((commandView = document.querySelector(domSelector + ' .commandContainer'))) {
        Array.from(commandView.querySelectorAll('.command')).forEach(command => {
          command.addEventListener('click', () => this[command.dataset.click](this.activeNode))
          command.visibleIf = node => command.dataset.visible ? eval(command.dataset.visible) : true
        })
        this.diagram.addHandler('click', this.showCommandsView.bind(this))
        this.diagram.addHandler('zoom', transform => commandView.setAttribute('transform', transform))
      }

      const node = id => data.nodes.find(node => node.id === id) || console.error('Node id ' + id + ' not found')
      this.links = data.links.map((link, id) => ({id: id + 1, source: node(link.source), target: node(link.target)}))
      this.nodes = data.nodes

      const setBothSidesVisible = d => d.source.visible = d.target.visible = true
      this.links.filter(d => d.source.open || d.target.open).map(setBothSidesVisible)
      const links = this.links.filter(d => d.source.visible && d.target.visible)
      const nodes = this.nodes.filter(d => d.visible)
      this.diagram.add(nodes, links)
      this.diagram.update()

      setTimeout(() => document.body.className = 'initialized', 0)
    })
  }

  showCommandsView(node) {
    const setActive = el => {
      el.parentNode.appendChild(el)
      el.classList.add('active')
    }
    const activate = el => el && setActive(el)
    const px = n => n ? (n + 'px') : n
    ForceDiagram.fixNode(node)
    this.activeNode = node
    this.diagram.getDomElement(node).classList.add('menuActive')
    Array.from(commandView.querySelectorAll('.command')).forEach(cmd => cmd.classList.toggle('active', !!cmd.visibleIf(node)))
    activate(overlay)
    activate(commandView)
    if (commandView) {
      commandView.children[0].setAttribute('style', 'transform: translate(' + px(node.x) + ',' + px(node.y) + ')')
    }
  }

  hideCommandsView(node) {
    const setInactive = el => {
      el.parentNode.insertBefore(el, el.parentNode.children[0])
      el.classList.remove('active')
    }
    const deactivate = el => el && setInactive(el)

    if (node) {
      ForceDiagram.releaseNode(node)
      this.diagram.getDomElement(node).classList.remove('menuActive')
    }
    deactivate(overlay)
    deactivate(commandView)
  }

  toggle(node) {
    return node.open ? this.closeNode(node) : this.openNode(node)
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
      document.body.classList.add('dialogOpen')
      this.hideCommandsView(node)
      this.diagram.scaleToNode(node, 1000)
        .then(() => new Promise((resolve, reject) => d3.json(node.details, (error, data) => resolve([error, data]))))
        .then(([error, data]) => error ? Promise.reject(error) : data)
        .then(data => {
          this.diagram.hide()
          return this.handlers.showDetails(data)
        })
        .then(() => {
          document.body.classList.remove('dialogOpen')
          this.diagram.show()
          this.diagram.scaleToNode(node, 1)
        })
    }
  }

  scale(factor) {
    this.diagram.scale(factor)
  }
}
