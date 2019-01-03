import ForceDiagram from './ForceDiagram'
import NodeRenderer from './NodeRenderer'
import * as d3 from './d3'

let nextLinkId = 1
const nextId = list => list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1
const defaults = {
  maxLevel: 99999,
  handlers: {
    error: () => {
    }
  }
}

class Network {
  constructor(options, domSelector, handlers = {}) {
    if (typeof options === 'string') {
      console.log('Deprecation notice: Using separate parameters for Network constructor is deprecated, use options structure instead.') // eslint-disable-line no-console
      options = {dataUrl: options, domSelector, handlers}
    }
    this.options = Object.assign({}, defaults, options)
    this.options.nodeRenderer = this.options.nodeRenderer || new NodeRenderer()

    d3.json(this.options.dataUrl, options.fetchOptions)
      .then(data => this.options.handlers.prepare ? this.options.handlers.prepare(data) : data)
      .then(data => {
        const domElem = document.querySelector(this.options.domSelector)
        this.diagram = new ForceDiagram(domElem, this.options)
        if (this.options.handlers.showDetails) {
          this.details = document.createElement('div')
          this.details.setAttribute('class', 'details')
          document.body.append(this.details)
        }

        this.nodes = data.nodes
        this.links = this.computeLinks(this.nodes)

        const setBothSidesVisible = d => d.source.visible = d.target.visible = true
        this.links.filter(d => d.source.open || d.target.open).map(setBothSidesVisible)
        const links = this.links.filter(d => d.source.visible && d.target.visible)
        const nodes = this.nodes.filter(d => d.visible)
        this.setDistancesToNode(nodes[0] || this.nodes[0])
        this.diagram.add(nodes, links)
        this.diagram.update()

        setTimeout(() => {
          document.body.className = 'initialized'
          this.options.handlers.initialized && this.options.handlers.initialized()
        }, 0)
      })
      .catch(error => logger.error(error))

    const self = this
    document.addEventListener("click", function (event) {
      if (false === self.handleClicks(event)) {
        event.stopImmediatePropagation()
        event.preventDefault()
        return false
      }
    })
  }

  handleClicks(t) {
    const path = t.path || t.composedPath && t.composedPath() || []

    const refLinksIndex = path.findIndex(t => t.className && "reflinks" === t.className.baseVal)
    if (refLinksIndex >= 0) {
      this.showNodes(path[refLinksIndex + 1].__data__, path[refLinksIndex - 1].dataset.ref)
      return false
    }

    const nodeIndex = path.find(t => t.classList && t.classList.contains("node"))
    if (nodeIndex) {
      this.showDetails(nodeIndex.__data__)
      return false
    }
  }

  computeLinks(nodes) {
    nodes.forEach(node => {
      node.links = node.links || {}
      node.linkedNodes = {}
    })
    return nodes.map(source => {
      return Object.keys(source.links).map(type => {
        return source.links[type] = source.links[type].map(target => {
          target = this.getNode((target.target && target.target.id) || target)
          source.linkedNodes[target.id] = target
          target.linkedNodes[source.id] = source
          return {id: nextLinkId++, source, target}
        })
      }).reduce((a, b) => a.concat(b), [])
    }).reduce((a, b) => a.concat(b), [])
  }

  setLevel(node, level) {
    if (node.level > level) {
      node.level = level
      if (level < this.options.maxLevel) {
        Object.values(node.linkedNodes).forEach(n => this.setLevel(n, level + 1))
      }
    }
  }

  setDistancesToNode(node) {
    this.nodes.forEach(n => n.level = this.options.maxLevel)
    this.setLevel(node, 0)
  }

  showDetails(node) {
    ForceDiagram.fixNode(node)
    const nodeEl = ForceDiagram.getDomElement(node)
    const container = document.createElement('div')
    const form = document.createElement('div')
    form.setAttribute('class', 'detailForm')
    container.appendChild(form)
    this.details.appendChild(container)
    this.diagram.scaleToNode(node, 1.2, -175, -30)
      .then(({y}) => {
        document.body.classList.add('dialogOpen')
        nodeEl.classList.add('menuActive')
        this.setDistancesToNode(node)
        container.setAttribute('style', 'padding-top: ' + (y - 123) + 'px')
      })
      .then(() => node.details ? this.d3json(node.details) : node)
      .then(data => this.options.handlers.showDetails(data, form, node))
      .catch(console.error) // eslint-disable-line no-console
      .then(newData => {
        node = newData || node
        document.body.classList.remove('dialogOpen')
        nodeEl.classList.remove('menuActive')
        this.details.innerHTML = ''
        this.diagram.updateNode(node)
        this.diagram.update()
      })
  }

  showNodes(node, type) {
    node.links[type].forEach(link => {
      link.target.visible = true
      link.target.x = node.x
      link.target.y = node.y
      this.diagram.add([link.target], [link])
    })
    this.diagram.update()
  }

  toggle(node) {
    return node.open ? this.closeNode(node) : this.openNode(node)
  }

  closeNode(node) {
    node.open = false
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        const otherNode = link.source.id === node.id ? link.target : link.source
        if (this.diagram.getLinkedNodes(otherNode).length === 1) {
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

  openNode(node) {
    node.open = true
    this.links
      .filter(link => link.source.id === node.id || link.target.id === node.id)
      .forEach(link => {
        const otherNode = link.source.id === node.id ? link.target : link.source
        otherNode.visible = true
        otherNode.x = node.x
        otherNode.y = node.y
        this.diagram.add([otherNode], [link])
      })

    this.diagram.scaleToNode(node, 1)
    this.diagram.update()
  }

  addNode(node) {
    const links = this.computeLinks([node])
    this.nodes.push(node)
    links.forEach(link => this.links.push(link))
    this.diagram.add([node], links)
  }

  removeNode(node) {
    this.nodes = this.nodes.filter(n => n.id !== node.id)
    this.links = this.links.filter(l => l.source.id !== node.id && l.target.id !== node.id)
    this.diagram.remove([node], [])
    this.diagram.update()
    if (this.options.handlers.nodeRemoved) {
      this.options.handlers.nodeRemoved(node)
    }
  }

  getNode(id) {
    return this.nodes.find(node => node.id === id)
  }

  updateNode(node) {
    this.diagram.updateNode(node)
    this.diagram.update()
  }

  scaleToNode(node) {
    this.diagram.scaleToNode(node, 1)
  }

  addLinks(links) {
    this.diagram.add([], links
      .map(l => ({id: nextLinkId++, source: this.getNode(l.source.id), target: this.getNode(l.target.id)}))
      .map(l => {
        this.links.push(l)
        return l
      }))
  }

  removeLinks(links) {
    const cmpLink = (a, b) => (a.source.id === b.source.id && a.target.id === b.target.id)
    this.links = this.links.filter(l => !links.some(r => cmpLink(l, r)))
    this.diagram.remove([], links)
  }

  newConnection(node) {
    this.options.handlers.nameRequired()
      .then(name => name ? name : Promise.reject('no name given'))
      .then(name => {
        let existing = this.nodes.find(node => node.name.toLowerCase() === name.toLowerCase())
        if (!existing) {
          existing = this.options.handlers.newNode ? this.options.handlers.newNode(name) : {name}
          existing.id = existing.id || nextId(this.nodes)
          this.nodes.push(existing)
          this.diagram.add([existing], [])
        }
        if (!this.diagram.nodesConnected(node, existing)) {
          const newLink = {id: nextLinkId++, source: node, target: existing}
          if (this.options.handlers.newLink) {
            this.options.handlers.newLink(newLink)
          }
          this.links.push(newLink)
          this.diagram.add([], [newLink])
        }

        this.diagram.update()
      })
      .catch(this.options.handlers.error)
  }

  update() {
    this.diagram.update()
  }

  scale(factor) {
    return this.diagram.scale(factor)
  }
}

export default Network