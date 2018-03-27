class netvis {
  constructor(initialNetwork, domSelector) {
    this.network = initialNetwork
    const svg = d3.select(domSelector)
    const defs = svg.append('defs')

    const simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force('link', d3.forceLink().distance(100).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(10000))
      .force('collide', d3.forceCollide().radius(100).iterations(2))
      .force('center', d3.forceCenter(+svg.attr('width') / 2, +svg.attr('height') / 2))

    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.network.links)
      .enter().append('line')

    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.network.nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', 50)

    const title = svg.append('g')
      .attr('class', 'title')
      .selectAll('text')
      .data(this.network.nodes)
      .enter().append('text')
      .text(d => d.name)
      .call(d => this.wrap(d, 90))

    simulation
      .nodes(this.network.nodes)
      .on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)

        title
          .attr('x', d => d.x)
          .attr('y', d => d.y + 5)
      })

    simulation.force('link')
      .links(this.network.links)

    d3.timer(() => this.loadImages(defs), 2000)
  }

  loadImages(defs) {
    d3.selectAll('.node')
      .attr('fill', d => this.getBackground(d.id, d.logo, defs))
  }

  getBackground(id, logo, defs) {
    if (logo) {
      defs.append('pattern')
        .attr('id', d => 'bg-' + id)
        .attr('height', 1).attr('width', 1)
        .append('image')
        .attr('xlink:href', logo.replace(/ /g, '%20'))
        .attr('height', '100px').attr('width', '100px')
        .attr('preserveAspectRatio', 'xMidYMid slice')
    }

    return logo ? 'url(#bg-' + id + ')' : '#ffe'
  }

  wrap(text, width) {
    text.each(function (node) {
      const text = d3.select(this)
      const words = node.name.split(/[\s-]+/).reverse()
      const lineHeight = 1.1
      let lineNumber = 0
      let line = []
      let tspan = text.text(null).append('tspan')
      let word
      let dx = 0
      while (word = words.pop()) {
        line.push(word)
        tspan.text(line.join(' '))
        if (tspan.node().getComputedTextLength() > width) {
          line.pop()
          tspan.text(line.join(' '))
          dx = -tspan.node().getComputedTextLength()
          line = [word]
          tspan = text.append('tspan').attr('dx', dx + 'px').attr('dy', lineHeight + 'em').text(word)
        }
      }
    })
  }

  isNode(id) {
    return n => n.id === id
  }

  createNode(nodeInfo) {
    nodeInfo.open = true
    this.network.nodes.push(nodeInfo)
  }

  removeNode(nodeInfo) {
    this.network.links = network.links.filter(l => l.target !== nodeInfo.id && l.source !== nodeInfo.id)
    this.network.nodes.splice(this.network.nodes.findIndex(isNode(node.id)), 1)
  }

  createLink(from, nodeInfo) {
    if (!this.network.nodes.some(isNode(node.id))) {
      this.network.createNode(nodeInfo)
    }
    this.network.links.push({target: nodeInfo.id, source: from.id})
  }

  removeLink(from, to) {
    const isAffected = l => (l.target === from.id && l.source === to.id) || (l.target === to.id && l.source === from.id)
    this.network.links.splice(this.network.links.findIndex(isAffected), 1)
  }

  handleChange(change) {
    this[change.command](change.info)
    return this
  }
}
