class netvis {
  constructor(domSelector) {
    this.network = {'nodes': [], 'links': []}
    const svg = d3.select(domSelector)
    const center = [svg.node().scrollWidth / 2, svg.node().scrollHeight / 2]
    this.defs = svg.append('defs')
    this.svgGroup = svg
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

  update() {
    let graphLinksData = this.linkContainer.selectAll('line').data(this.network.links)
    let graphLinksEnter = graphLinksData.enter().append('line')
    graphLinksData.exit().remove()
    graphLinksData = graphLinksEnter.merge(graphLinksData)
    this.simulation.force('link').links(this.network.links)

    let graphNodesData = this.nodeContainer.selectAll('g').data(this.network.nodes, d => d.id)
    let graphNodesEnter = graphNodesData
      .enter()
      .append('g')
      .attr('id', d => d.id || null)
      .attr('class', d => 'node' + (d.open ? ' open' : ''))
      .on('click', d => this.toggleNode(d))
      .call(this.drag)

    graphNodesData.exit().remove()

    graphNodesEnter
      .append('circle')
      .classed('node', true)
      .attr('r', d => 50)
      .attr('fill', d => this.getBackground(d.id, d.logo))

    graphNodesEnter
      .append('text')
      .attr('id', d => 'label_' + d.id)
      .text(d => d.name)
      .call(d => this.wrap(d, 90))

    graphNodesData = graphNodesEnter.merge(graphNodesData)
    this.simulation.nodes(this.network.nodes).on('tick', handleTicks)

    this.simulation.restart()
    this.simulation.alpha(1)

    function handleTicks() {
      graphLinksData
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      graphNodesData.attr('transform', d => 'translate(' + [d.x, d.y] + ')')
    }
  }

  toggleNode(d) {
    const otherNode = (l, d) => l.source.id === d.id ? l.target : l.source
    d.open = !d.open
    this.network.links.filter(l => l.source.id === d.id || l.target.id === d.id).forEach(l => {
      if (!d.open) {
        if (!l.source.open && !l.target.open) {
          this.network.links.splice(this.network.links.indexOf(l), 1)
          otherNode(l, d).visible = false
        }
      } else {
        if (this.network.links.indexOf(l) !== false) {
          this.network.links.push(l)
          otherNode(l, d).visible = true
        }
      }
    })

    this.update()
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

  add(nodesToAdd, linksToAdd) {
    if (nodesToAdd) {
      nodesToAdd.forEach(n => this.network.nodes.push(n))
    }
    if (linksToAdd) {
      linksToAdd.forEach(l => this.network.links.push(l))
    }

    this.update()
  }

  remove(dToRemove) {
    const nIndex = this.network.nodes.indexOf(dToRemove)
    if (nIndex > -1) {
      this.network.nodes.splice(nIndex, 1)
    }

    const isidConnected = (link, id) => link.source.id === id || link.target.id === id
    this.network.links.forEach((l, index) => isidConnected(l, dToRemove.id) && this.network.links.splice(index, 1))

    this.update()
  }
}
