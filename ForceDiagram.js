class ForceDiagram {
  constructor(domSelector) {
    this.links = []
    this.nodes = []
    this.handlers = {}
    this.svg = d3.select(domSelector)
    this.center = {x: this.svg.node().scrollWidth / 2, y: this.svg.node().scrollHeight / 2}
    this.defs = this.svg.append('defs')
    const svgGroup = this.svg
      .append('g')
      .attr('id', 'svgGroup')

    this.simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force('link', d3.forceLink().distance(100).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(1000))
      .force('collide', d3.forceCollide().radius(100).iterations(2))
      .force('center', d3.forceCenter(this.center.x, this.center.y))

    this.drag = d3.drag()
      .on('start', d => handleDragStarted(d, this.simulation))
      .on('drag', d => handleDragged(d))
      .on('end', d => handleDragEnded(d, this.simulation))

    this.zoom = d3.zoom().on('zoom', handleZoom.bind(this))

    this.svg
      .call(this.zoom)
      .call(this.drag)

    this.linkContainer = svgGroup.append('g').attr('class', 'links')
    this.nodeContainer = svgGroup.append('g').attr('class', 'nodes')

    this.update()

    function handleZoom() {
      const transform = `translate(${d3.event.transform.x}, ${d3.event.transform.y}) scale(${d3.event.transform.k})`
      svgGroup.attr('transform', transform)
      if (this.handlers.zoom) {
        this.handlers.zoom(transform)
      }
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
    let linkData = this.linkContainer.selectAll('line').data(this.links, d => d.id)
    let linkEnter = linkData.enter().append('line')
    linkData.exit().remove()
    linkData = linkEnter.merge(linkData)
    this.simulation.force('link').links(this.links)

    let nodeData = this.nodeContainer.selectAll('g').data(this.nodes, d => d.id)
    let nodeEnter = nodeData
      .enter()
      .append('g')
      .attr('id', d => 'node-' + d.id)
      .attr('class', d => 'node' + (d.open ? ' open' : ''))
      .call(this.drag)

    nodeData.exit().remove()

    nodeEnter.filter(d => d.shape === 'circle').call(addCircleNode.bind(this))
    nodeEnter.filter(d => d.shape !== 'circle').call(addRectNode.bind(this))

    nodeEnter.append('text')
      .classed('title', true)
      .text(d => d.name)
      .call(d => wrap(d, 90))

    nodeData = nodeEnter.merge(nodeData)
    this.simulation.nodes(this.nodes).on('tick', () => handleTicks.bind(this)(this.center))

    this.simulation.alpha(0.3)
    this.simulation.restart()

    function bindHandlers(node) {
      Object.keys(this.handlers).forEach(type => node.on(type, this.handlers[type]))
    }

    function addCircleNode(enter) {
      enter.append('circle')
        .classed('node', true)
        .classed('open', d => d.open)
        .attr('r', 50)
        .attr('fill', getBackground.bind(this))
        .call(bindHandlers.bind(this))
    }

    function addRectNode(enter) {
      enter.append('rect')
        .classed('node', true)
        .classed('open', d => d.open)
        .attr('x', -50)
        .attr('y', -35)
        .attr('width', 100)
        .attr('height', 70)
        .attr('fill', getBackground.bind(this))
        .call(bindHandlers.bind(this))
    }

    function handleTicks(center) {
      linkData
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      nodeData.attr('transform', d => 'translate(' + [d.x, d.y] + ')')
    }

    function getBackground(node) {
      if (node.image) {
        this.defs.append('pattern')
          .attr('id', () => 'bg-' + node.id)
          .attr('height', 1).attr('width', 1)
          .append('image')
          .attr('xlink:href', node.image.replace(/ /g, '%20'))
          .attr('height', '100px').attr('width', '100px')
          .attr('preserveAspectRatio', 'xMidYMid slice')
      }

      return node.image ? 'url(#bg-' + node.id + ')' : '#eef'
    }

    function wrap(text, width) {
      text.each(function (node) {
        const text = d3.select(this)
        const words = (node.name || '').split(/[\s-]+/).reverse()
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
  }

  getLinkedNodes(node) {
    return this.links.filter(l => l.source.id === node.id).map(l => l.target)
      .concat(this.links.filter(l => l.target.id === node.id).map(l => l.source))
  }

  nodesConnected(node1, node2) {
    return this.getLinkedNodes(node1).some(n => n.id === node2.id)
  }

  static isConnected(link, node) {
    return link.source.id === node.id || link.target.id === node.id
  }

  add(nodesToAdd, linksToAdd) {
    if (nodesToAdd) {
      nodesToAdd.forEach(n => !this.nodes.some(d => d.id === n.id) && this.nodes.push(n))
    }
    if (linksToAdd) {
      linksToAdd.forEach(l => !this.nodesConnected(l.source, l.target) && this.links.push(l))
    }
  }

  remove(nodesToRemove, linksToRemove) {
    nodesToRemove.forEach(n => {
      if (n.index > -1) {
        this.nodes.splice(n.index, 1)
      }
      this.links.forEach((l, index) => ForceDiagram.isConnected(l, n) && this.links.splice(index, 1))
    })
    linksToRemove.forEach(l => l.index > -1 && this.links.splice(l.index, 1))
  }

  static fixNode(node) {
    node.fx = node.x
    node.fy = node.y
  }

  static releaseNode(node) {
    node.fx = undefined
    node.fy = undefined
  }

  scaleToNode(node, scale) {
    ForceDiagram.fixNode(node)
    this.svg.transition().duration(1000)
      .call(this.zoom.transform, d3.zoomIdentity
        .translate(this.center.x, this.center.y)
        .scale(scale)
        .translate(-node.x, -node.y)
      )
      .on('end', () => ForceDiagram.releaseNode(node))
  }
}
