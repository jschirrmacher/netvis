/*global window*/
import * as d3 from './d3'

class ForceDiagram {
  constructor(domSelector, options = {}) {
    this.options = options
    this.links = []
    this.nodes = []
    this.handlers = {}
    this.svg = d3.select(domSelector)
    this.setCenter()
    window.addEventListener('resize', () => this.setCenter())
    this.options.nodeRenderer.setup(this.svg)
    this.svgGroup = this.svg
      .append('g')
      .attr('id', 'svgGroup')

    const manyBody = d3.forceManyBody()
    const charge = this.options.charge && this.options.charge(manyBody) || manyBody.strength(-100).distanceMin(1000)
    const d3Collide = d3.forceCollide()
    const collide = this.options.collide && this.options.collide(d3Collide) || d3Collide.radius(d => d.radius || d.width / 2 || 50).iterations(2)
    const d3ForceX = d3.forceX(this.center.x)
    const forceX = this.options.forceX && this.options.forceX(d3ForceX) || d3ForceX.strength(0.1)
    const d3ForceY = d3.forceY(this.center.y)
    const forceY = this.options.forceY && this.options.forceY(d3ForceY) || d3ForceY.strength(0.1)
    this.simulation = d3.forceSimulation()
      .velocityDecay(this.options.velocityDecay || 0.55)
      .force('link', d3.forceLink().distance(d => d.distance || 100).id(d => d.id))
      .force('charge', charge)
      .force('collide', collide)
      .force('center', d3.forceCenter(this.center.x, this.center.y))
      .force('x', forceX)
      .force('y', forceY)

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
      this.currentZoom = d3.event.transform.k
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

  setCenter() {
    this.center = {x: this.svg.node().width.baseVal.value / 2, y: this.svg.node().height.baseVal.value / 2}
  }

  addHandler(type, handler) {
    this.handlers[type] = handler
  }

  update() {
    const nodeRenderer = this.options.nodeRenderer
    let linkData = this.linkContainer.selectAll('line').data(this.links, d => d.id)
    const linkEnter = linkData.enter().append('line')

    if (this.options.useMarkers) {
      linkEnter
        .attr('marker-start', 'url(#marker-start)')
        .attr('marker-end', 'url(#marker-end)')
    }
    linkData.exit().remove()
    linkData = linkEnter.merge(linkData)
    this.simulation.force('link').links(this.links)

    let nodeData = this.nodeContainer.selectAll('.node').data(this.nodes, d => d.id)
    const nodeEnter = nodeData
      .enter()
      .append('g')
      .attr('id', d => 'node-' + d.id)
      .attr('class', nodeRenderer.getClass.bind(nodeRenderer))
      .call(this.drag)
      .call(bindHandlers.bind(this))

    nodeData.exit().remove()

    nodeEnter.call(nodeRenderer.render.bind(nodeRenderer))

    nodeData = nodeEnter.merge(nodeData)
    nodeData.call(nodeRenderer.update.bind(nodeRenderer))
    this.simulation.nodes(this.nodes).on('tick', () => handleTicks.bind(this)())

    this.simulation.alpha(0.3)
    this.simulation.restart()

    function bindHandlers(node) {
      Object.keys(this.handlers).forEach(type => node.on(type, this.handlers[type]))
    }

    function lineLength(d) {
      return Math.sqrt(Math.pow(d.target.y - d.source.y, 2) + Math.pow(d.target.x - d.source.x, 2))
    }

    function nodeRadius(node) {
      return node.radius || ((node.width + node.height) / 4) || 50
    }

    function lineX1(d) {
      const length = lineLength(d)
      const dx = d.target.x - d.source.x
      return d.source.x + dx * (1 - (length - nodeRadius(d.source)) / length)
    }

    function lineX2(d) {
      const length = lineLength(d)
      const dx = d.target.x - d.source.x
      return d.target.x - dx * (1 - (length - nodeRadius(d.target)) / length)
    }

    function lineY1(d) {
      const length = lineLength(d)
      const dy = d.target.y - d.source.y
      return d.source.y + dy * (1 - (length - nodeRadius(d.source)) / length)
    }

    function lineY2(d) {
      const length = lineLength(d)
      const dy = d.target.y - d.source.y
      return d.target.y - dy * (1 - (length - nodeRadius(d.target)) / length)
    }

    function handleTicks() {
      linkData
        .attr('x1', lineX1)
        .attr('y1', lineY1)
        .attr('x2', lineX2)
        .attr('y2', lineY2)
        .attr('class', d => 'level-' + Math.max(d.source.level, d.target.level))
        .attr('stroke-width', d => d.width || 1)

      nodeData
        .attr('transform', d => nodeRenderer.getTransformation.call(nodeRenderer, d))
        .attr('class', d => nodeRenderer.getClass.call(nodeRenderer, d))
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

  static equalLinks(l1, l2) {
    return (l2.source.id === l1.source.id && l2.target.id === l1.target.id)
      || (l2.source.id === l1.target.id && l2.target.id === l1.source.id)
  }

  remove(nodesToRemove, linksToRemove) {
    nodesToRemove.forEach(node => {
      this.links = this.links.filter(l => !ForceDiagram.isConnected(l, node))
      this.nodes = this.nodes.filter(n => n.id !== node.id)
    })
    this.links = this.links.filter(l => !linksToRemove.some(r => ForceDiagram.equalLinks(l, r)))
  }

  getConnections(node) {
    return this.links.filter(l => l.source.id === node.id || l.target.id === node.id)
  }

  updateNode(node) {
    this.nodes = this.nodes.map(n => n.id === node.id ? node : n)
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
      const x = this.center.x + diffX
      const y = this.center.y + diffY
      this.svg.transition().duration(1000)
        .call(this.zoom.transform, d3.zoomIdentity
          .translate(x, y)
          .scale(scale)
          .translate(-node.x, -node.y)
        )
        .on('end', () => {
          ForceDiagram.releaseNode(node)
          resolve({x, y})
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
          .scale(factor * this.currentZoom))
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

export default ForceDiagram
