class Network {
  constructor(dataUrl, domSelector) {
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      this.diagram.addHandler('click', node => this.toggle(node))
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
    const otherNode = link => link.source.id === node.id ? link.target : link.source
    node.open = !node.open
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        if (node.open && this.links.indexOf(link) !== false) {
          otherNode(link).visible = true
          this.diagram.add([otherNode(link)], [link])
        } else if (!node.open && !link.source.open && !link.target.open) {
          otherNode(link).visible = otherNode(link).keepVisible
          if (!otherNode(link).visible) {
            this.diagram.remove(otherNode(link))
          }
        }
      })

    this.diagram.update()
  }
}
