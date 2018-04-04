function maxId(list) {
  return list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1
}

class Network {
  constructor(dataUrl, domSelector, handlers = {}) {
    this.handlers = handlers
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      this.diagram.addHandler('click', this.toggle.bind(this))
      if (this.handlers.nameRequired) {
        this.diagram.addHandler('newConnection', this.newConnection.bind(this))
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

  toggle(node) {
    node.open = !node.open
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        const otherNode = link.source.id === node.id ? link.target : link.source
        if (node.open) {
          otherNode.visible = true
          otherNode.x = node.x
          otherNode.y = node.y
          this.diagram.add([otherNode], [link])
        } else if (this.diagram.getLinkedNodes(otherNode).length === 1) {
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

  newConnection(node) {
    this.handlers.nameRequired()
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
  }
}
