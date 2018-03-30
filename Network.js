class Network {
  constructor(dataUrl, domSelector) {
    d3.json(dataUrl, (error, data) => {
      if (error) throw error
      this.diagram = new ForceDiagram(document.querySelector(domSelector))
      this.diagram.addHandler('click', node => this.toggle(node))
      const getNode = id => data.nodes.find(node => node.id === id)
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
    })
  }

  toggle(node) {
    const otherNode = link => link.source.id === node.id ? link.target : link.source
    node.open = !node.open
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        if (node.open) {  // node was opened
          if (this.links.indexOf(link) !== false) {
            this.links.push(link)
            otherNode(link).visible = true
          }
        } else {  // node was closed
          if (!link.source.open && !link.target.open) {
            this.links.splice(this.links.indexOf(link), 1)
            otherNode(link).visible = false
          }
        }
      })

    this.diagram.update()
  }
}
