class netvis {
  constructor(initialNetwork, domSelector) {
    this.network = initialNetwork
    const getNode = id => this.network.nodes.find(this.isNode(id))
    this.network.links = this.network.links.map(d => ({source: getNode(d.source), target: getNode(d.target)}))
    const svg = d3.select(domSelector)
    this.defs = svg.append('defs')
    this.svgGroup = svg
      .append('svg:g')
      .attr('id', 'svgGroup')

    this.simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force('link', d3.forceLink().distance(100).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(1000))
      .force('collide', d3.forceCollide().radius(100).iterations(2))

    this.drag = d3.drag()
      .on('start', d => this.handleDragStarted(d))
      .on('drag', d => this.handleDragged(d))
      .on('end', d => this.handleDragEnded(d))

    svg
      .call(d3.zoom().on('zoom', () => this.handleZoom()))
      .call(this.drag)

    this.linkContainer = this.svgGroup.append('g').attr('class', 'links')
    this.nodeContainer = this.svgGroup.append('g').attr('class', 'nodes')

    this.update()

    const timer = d3.timer(() => {
      svg.attr('class', 'initialized')
      timer.stop()
    }, 50)
  }

  getFilteredLinks() {
    return this.network.links.filter(d => {
      if (d.source.open || d.target.open) {
        d.source.visible = d.target.visible = true
      }
      return d.source.visible && d.target.visible
    })
  }

  getFilteredNodes() {
    return this.network.nodes.filter(d => d.visible)
  }

  update() {
    const filteredLinks = this.getFilteredLinks()
    this.link = this.linkContainer.selectAll('line').data(filteredLinks)
    const linkEnter = this.link.enter().append('line')
    this.link.exit().remove()
    this.link = linkEnter.merge(this.link)

    const filteredNodes = this.getFilteredNodes()
    this.node = this.nodeContainer.selectAll('node').data(filteredNodes)
    const nodeEnter = this.node.enter().append('g')
      .attr('class', d => 'node' + (d.open ? ' open' : ''))
      .on('click', d => this.toggleNode(d))
      .call(this.drag)

    nodeEnter.append('circle')
      .attr('r', 50)
      .attr('fill', d => this.getBackground(d.id, d.logo))

    nodeEnter.append('text')
      .text(d => d.name)
      .call(d => this.wrap(d, 90))

    this.node.exit().remove()
    this.node = nodeEnter.merge(this.node)

    this.simulation.nodes(filteredNodes).on('tick', () => this.tick())
    this.simulation.force('link').links(filteredLinks)
    this.simulation.restart()
    this.simulation.alpha(0.1)
  }

  toggleNode(d) {
    d.open = !d.open
    this.update()
  }

  tick() {
    this.link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    this.node
      .attr('transform', d => 'translate(' + d.x + ', ' + d.y + ')')
  }

  getBackground(id, logo) {
    if (logo) {
      this.defs.append('pattern')
        .attr('id', () => 'bg-' + id)
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
      let line = []
      let tspan = text.text(null).append('tspan')
      let word
      let lineCount = 0
      while (word = words.pop()) {
        line.push(word)
        tspan.text(line.join(' '))
        if (tspan.node().getComputedTextLength() > width) {
          line.pop()
          tspan.text(line.join(' '))
          lineCount++
          line = [word]
          tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeight + 'em').text(word)
        }
      }
      text.attr('y', (-lineCount * 0.3) + 'em')
    })
  }

  handleDragStarted(d) {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0.3).restart()
    }
    d.fx = d.x
    d.fy = d.y
  }

  handleDragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
  }

  handleDragEnded(d) {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0)
    }
    d.fx = undefined
    d.fy = undefined
  }

  handleZoom() {
    this.svgGroup
      .attr('transform',
        `translate(${d3.event.transform.x}, ${d3.event.transform.y})` + ' ' +
        `scale(${d3.event.transform.k})`)
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
