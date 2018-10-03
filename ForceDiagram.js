/*global d3*/
let currentZoom = 1

class ForceDiagram {
  constructor(domSelector) {
    this.links = []
    this.nodes = []
    this.handlers = {}
    this.svg = d3.select(domSelector)
    this.center = {x: this.svg.node().width.baseVal.value / 2, y: this.svg.node().height.baseVal.value / 2}
    this.defs = this.svg.append('defs')
    this.svgGroup = this.svg
      .append('g')
      .attr('id', 'svgGroup')

    this.simulation = d3.forceSimulation()
      .velocityDecay(0.55)
      .force('link', d3.forceLink().distance(d => d.distance || 100).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100).distanceMin(1000))
      .force('collide', d3.forceCollide().radius(d => d.distance || 100).iterations(2))
      .force('center', d3.forceCenter(this.center.x, this.center.y))
      .force('x', d3.forceX(this.center.x).strength(0.1))
      .force('y', d3.forceY(this.center.y).strength(0.1))

    this.drag = d3.drag()
      .on('start', d => handleDragStarted(d, this.simulation))
      .on('drag', d => handleDragged(d))
      .on('end', d => handleDragEnded(d, this.simulation))

    this.zoom = d3.zoom().on('zoom', handleZoom.bind(this))

    this.svg
      .call(this.zoom)
      .call(this.drag)

    this.linkContainer = this.svgGroup.append('g').attr('class', 'links')
    this.nodeContainer = this.svgGroup.append('g').attr('class', 'nodes')

    this.update()

    function handleZoom() {
      const transform = `translate(${d3.event.transform.x || 0}, ${d3.event.transform.y || 0}) scale(${d3.event.transform.k || 1})`
      this.svgGroup.attr('transform', transform)
      currentZoom = d3.event.transform.k
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

    let nodeData = this.nodeContainer.selectAll('.node').data(this.nodes, d => d.id)
    let nodeEnter = nodeData
      .enter()
      .append('g')
      .attr('id', d => 'node-' + d.id)
      .attr('class', d => d.className || '')
      .classed('node', true)
      .classed('open', d => d.open)
      .classed('withBg', d => d.image)
      .call(this.drag)
      .call(bindHandlers.bind(this))

    nodeData.exit().remove()

    nodeEnter.filter(d => d.shape === 'circle').call(addCircleNode.bind(this))
    nodeEnter.filter(d => d.shape === 'rect').call(addRectNode.bind(this))

    nodeEnter.append('g')
      .append('text')
      .classed('title', true)
      .text(d => d.name)
      .call(d => wrap(d, 90))

    nodeData = nodeEnter.merge(nodeData)
    this.simulation.nodes(this.nodes).on('tick', () => handleTicks())

    this.simulation.alpha(0.3)
    this.simulation.restart()

    function bindHandlers(node) {
      Object.keys(this.handlers).forEach(type => node.on(type, this.handlers[type]))
    }

    function addCircleNode(enter) {
      enter.append('circle')
        .attr('r', 50)
        .attr('fill', getBackground.bind(this))
    }

    function addRectNode(enter) {
      enter.append('rect')
        .attr('x', -50)
        .attr('y', -35)
        .attr('width', 100)
        .attr('height', 70)
        .attr('fill', getBackground.bind(this))
    }

    function handleTicks() {
      linkData
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      nodeData.attr('transform', d => 'translate(' + [d.x, d.y] + ')')
    }

    function getBackground(node) {
      if (node.image) {
        this.defs.select('#bg-' + node.id).remove()
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
        node.fontSize = node.fontSize || 1
        const text = d3.select(this)
        const words = (node.name || '').split(/[\s-]+/).reverse()
        const lineHeight = 1.1
        let line = []
        let tspan = text.text(null).append('tspan').attr('style', 'font-size: ' + (node.fontSize * 14) + 'px')
        let word
        let lineCount = 0
        while ((word = words.pop())) {
          line.push(word)
          tspan.text(line.join(' '))
          if (tspan.node().getComputedTextLength() > width) {
            line.pop()
            tspan.text(line.join(' '))
            lineCount++
            line = [word]
            tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeight + 'em').text(word)
              .attr('style', 'font-size: ' + (node.fontSize * 14) + 'px')
          }
        }
        text.attr('y', (-lineCount * 0.3) + 'em')

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        const bbox = this.getBBox()
        rect.setAttribute('class', 'text-bg')
        rect.setAttribute('x', bbox.x - 5)
        rect.setAttribute('y', bbox.y - 3)
        rect.setAttribute('width', bbox.width + 10)
        rect.setAttribute('height', bbox.height + 6)
        text.node().parentNode.insertBefore(rect, this)
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
    nodesToRemove.forEach(node => {
      this.links = this.links.filter(l => !ForceDiagram.isConnected(l, node))
      this.nodes = this.nodes.filter(n => n.id !== node.id)
    })
    this.links = this.links.filter(l => !linksToRemove.some(r => {
      return (r.source.id === l.source.id && r.target.id === l.target.id)
        || (r.source.id === l.target.id && r.source.id === l.source.id)
    }))
  }

  updateNode(node) {
    node = Object.assign(this.nodes.splice(this.nodes.findIndex(n => n.id === node.id), 1)[0], node)
    this.update()
    this.nodes.push(node)
  }

  static fixNode(node) {
    node.fx = node.x
    node.fy = node.y
  }

  static releaseNode(node) {
    node.fx = undefined
    node.fy = undefined
  }

  scaleToNode(node, scale, diffX = 0, diffY = 0) {
    return new Promise(resolve => {
      ForceDiagram.fixNode(node)
      this.svg.transition().duration(1000)
        .call(this.zoom.transform, d3.zoomIdentity
          .translate(this.center.x + diffX, this.center.y + diffY)
          .scale(scale)
          .translate(-node.x, -node.y)
        )
        .on('end', () => {
          ForceDiagram.releaseNode(node)
          resolve(true)
        })
    })
  }

  scale(factor) {
    return new Promise(resolve => {
      const m = this.svgGroup.node().getAttribute('transform')
      const d = (m && m.match(/[\d.]+/g).map(a => +a)) || [0, 0, 1]
      this.svg.transition().duration(1000)
        .call(this.zoom.transform, d3.zoomIdentity
          .translate(factor * d[0] - (factor - 1) * this.center.x, factor * d[1] - (factor - 1) * this.center.y)
          .scale(factor * currentZoom))
        .on('end', () => resolve(true))
    })
  }

  hide() {
    this.svg.attr('style', 'opacity: 0; position: absolute; transition: opacity 0.5s')
  }

  show() {
    this.svg.attr('style', 'opacity: 1; transition: opacity 0.5s')
  }

  static getDomElement(node) {
    return document.getElementById('node-' + node.id)
  }
}
