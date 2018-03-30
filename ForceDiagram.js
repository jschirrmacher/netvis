class ForceDiagram {
  constructor(domSelector) {
    this.links = []
    this.nodes = []
    this.handlers = {}
    const svg = d3.select(domSelector)
    const center = [svg.node().scrollWidth / 2, svg.node().scrollHeight / 2]
    this.defs = svg.append('defs')
    const svgGroup = svg
      .append('svg:g')
      .attr('transform', 'translate(' + center + ')')
      .append('g')
      .attr('id', 'svgGroup')

    this.simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force('link', d3.forceLink().distance(100).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(1000))
      .force('collide', d3.forceCollide().radius(100).iterations(2))

    this.drag = d3.drag()
      .on('start', d => handleDragStarted(d, this.simulation))
      .on('drag', d => handleDragged(d))
      .on('end', d => handleDragEnded(d, this.simulation))

    svg
      .call(d3.zoom().on('zoom', handleZoom))
      .call(this.drag)

    this.linkContainer = svgGroup.append('g').attr('class', 'links')
    this.nodeContainer = svgGroup.append('g').attr('class', 'nodes')

    this.update()

    const timer = d3.timer(() => {
      svg.attr('class', 'initialized')
      timer.stop()
    }, 50)

    function handleZoom() {
      svgGroup.attr('transform',
        `translate(${d3.event.transform.x}, ${d3.event.transform.y})` + ' ' +
        `scale(${d3.event.transform.k})`)
    }

    function handleDragStarted(d, simulation) {
      if (!d3.event.active) {
        simulation.alphaTarget(0.3).restart()
      }
      d.fx = d.x
      d.fy = d.y
    }

    function handleDragged(d) {
      d.fx = d3.event.x
      d.fy = d3.event.y
    }

    function handleDragEnded(d, simulation) {
      if (!d3.event.active) {
        simulation.alphaTarget(0)
      }
      d.fx = undefined
      d.fy = undefined
    }
  }

  addHandler(type, handler) {
    this.handlers[type] = handler
  }

  update() {
    let nodeData = this.linkContainer.selectAll('line').data(this.links, d => d.id)
    let nodeEnter = nodeData.enter().append('line')
    nodeData.exit().remove()
    nodeData = nodeEnter.merge(nodeData)
    this.simulation.force('link').links(this.links)

    let graphNodesData = this.nodeContainer.selectAll('g').data(this.nodes, d => d.id)
    let graphNodesEnter = graphNodesData
      .enter()
      .append('g')
      .attr('id', d => d.id)
      .attr('class', d => 'node' + (d.open ? ' open' : ''))
      .call(this.drag)

    Object.keys(this.handlers).forEach(type => graphNodesEnter.on(type, this.handlers[type]))
    graphNodesData.exit().remove()

    graphNodesEnter
      .append('circle')
      .classed('node', true)
      .attr('r', 50)
      .attr('fill', d => this.getBackground(d.id, d.logo))

    graphNodesEnter
      .append('text')
      .text(d => d.name)
      .call(d => this.wrap(d, 90))

    graphNodesData = graphNodesEnter.merge(graphNodesData)
    this.simulation.nodes(this.nodes).on('tick', handleTicks)

    this.simulation.restart()
    this.simulation.alpha(1)

    function handleTicks() {
      nodeData
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      graphNodesData.attr('transform', d => 'translate(' + [d.x, d.y] + ')')
    }
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

  add(nodesToAdd, linksToAdd) {
    if (nodesToAdd) {
      nodesToAdd.forEach(n => this.nodes.push(n))
    }
    if (linksToAdd) {
      linksToAdd.forEach(l => this.links.push(l))
    }
  }

  remove(dToRemove) {
    const nIndex = this.nodes.indexOf(dToRemove)
    if (nIndex > -1) {
      this.nodes.splice(nIndex, 1)
    }

    const isidConnected = (link, id) => link.source.id === id || link.target.id === id
    this.links.forEach((l, index) => isidConnected(l, dToRemove.id) && this.links.splice(index, 1))
  }
}
