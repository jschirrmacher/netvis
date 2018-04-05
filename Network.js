function maxId(list) {
  return list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1
}

class Network {
  constructor(dataUrl, domSelector, handlers = {}) {
    this.handlers = handlers
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      this.commandsOverlay = document.querySelector(domSelector + ' .commandOverlay')
      if (this.commandsOverlay) {
        this.commands = this.commandsOverlay.querySelector('.commands')
        Array.from(this.commands.children).forEach(command => {
          command.onClick = () => this[command.dataset.click](this.activeNode)
          command.visibleIf = node => command.dataset.visible ? eval(command.dataset.visible) : true
        })
        this.diagram.addHandler('click', this.showCommandsView.bind(this))
        this.diagram.addHandler('zoom', this.applyTransform.bind(this))
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
    const px = n => n ? (n + 'px') : n
    ForceDiagram.fixNode(node)
    this.activeNode = node
    Array.from(this.commands.children).forEach(cmd => cmd.classList.toggle('active', !!cmd.visibleIf(node)))
    const overlay = this.commandsOverlay
    overlay.parentNode.appendChild(overlay) // move to end of svg elements to have the menu on top
    overlay.classList.add('active')
    const view = this.commands
    view.setAttribute('x', px(node.x))
    view.setAttribute('y', px(node.y))
    view.classList.add('active')
    overlay.addEventListener('click', clickHandler)

    function clickHandler(event) {
      overlay.removeEventListener('click', clickHandler)
      ForceDiagram.releaseNode(node)
      view.classList.remove('active')
      overlay.classList.remove('active')
      // move to start of svg elements to make nodes accessible
      overlay.parentNode.insertBefore(overlay, overlay.parentNode.children[0])
    }
  }

  applyTransform(transform) {
    this.commandsOverlay.querySelector('.commands').setAttribute('transform', transform)
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
  }

  newConnection(node) {
    this.handlers.nameRequired()
      .then(name => name ? name : Promise.reject('no name given'))
      .then(name => {
        let link
        let existing = this.nodes.find(node => node.name === name)
        if (!existing) {
          if (this.handlers.newNode) {
            existing = this.handlers.newNode(name)
          } else {
            existing = {name}
          }
          if (!existing.id) {
            existing.id = this.nodes.reduce((id, node) => Math.max(id, node.id), 0) + 1
          }
          this.diagram.add([existing], [])
        } else {
          link = this.links.find(link => link.source.id === existing.id || link.target.id === existing.id)
        }
        if (!link) {
          const id = maxId(this.links) + 1
          const newLink = {id, source: node, target: existing}
          if (this.handlers.newLink) {
            this.handlers.newLink(newLink)
          }
          this.diagram.add([], [newLink])
        }

        this.diagram.update()
      })
      .catch(error => console.error)
  }
}
