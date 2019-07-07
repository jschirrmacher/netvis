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
  },
  logger: console
}

class Network {
  constructor(options, domSelector, handlers = {}) {
    if (typeof options === 'string') {
      defaults.logger.warn('Deprecation notice: Using separate parameters for Network constructor is deprecated, use options structure instead.')
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
        this.options.handlers.clickOnNode = this.options.handlers.clickOnNode || this.showDetails.bind(this)
        this.options.handlers.clickOnRefLink = this.options.handlers.clickOnRefLink || this.toggleNodes.bind(this)

        this.nodes = data.nodes
        this.links = this.computeLinks(this.nodes)

        function setBothSidesVisible(l) {
          l.source.visible = l.target.visible = l.visible = true
        }

        function linkShouldBeVisible(l) {
          return l.source.open || l.target.open || (l.source.visible && l.target.visible)
        }

        this.links.filter(d => linkShouldBeVisible(d)).map(setBothSidesVisible)
        this.setDistancesToNode(this.nodes.filter(d => d.visible)[0] || this.nodes[0])
        this.update()

        setTimeout(() => {
          document.body.classList.add('initialized')
          this.options.handlers.initialized && this.options.handlers.initialized()
        }, 0)
      })
      .catch(error => this.options.logger.error(error))

    const self = this
    document.addEventListener("click", function (event) {
      if (false === self.handleClicks(event)) {
        event.stopImmediatePropagation()
        event.preventDefault()
        return false
      }
    })
  }

  handleClicks(event) {
    const path = event.path || event.composedPath && event.composedPath() || []
    const handlers = {
      reflinks: index => this.options.handlers.clickOnRefLink(path[index + 1].__data__, path[index - 1].dataset.ref),
      node:     index => this.options.handlers.clickOnNode(path[index].__data__)
    }
    return !!Object.keys(handlers).findIndex(className => {
      const index = path.findIndex(t => t.classList && t.classList.contains(className))
      if (index >= 0) {
        handlers[className](index)
      }
      return index >= 0
    })
  }

  computeLinks(nodes) {
    const handler = this.options.handlers.prepareLink || (data => data)
    nodes.forEach(node => {
      node.links = node.links || {}
      node.linkedNodes = {}
    })
    return nodes.map(source => {
      return Object.keys(source.links).map(type => {
        return source.links[type] = source.links[type].map(info => {
          if (info.target && info.target.id) {
            return info
          } else {
            const target = this.getNode(info)
            source.linkedNodes[target.id] = target
            target.linkedNodes[source.id] = source
            return handler({id: nextLinkId++, source, target})
          }
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
    const diffX = this.options.detailsDialogOffsetX || -175
    const diffY = this.options.detailsDialogOffsetY || -30
    this.diagram.scaleToNode(node, 1.2, diffX, diffY)
      .then(({y}) => {
        document.body.classList.add('dialogOpen')
        nodeEl.classList.add('menuActive')
        this.setDistancesToNode(node)
        container.setAttribute('style', 'padding-top: ' + (y - 123) + 'px')
      })
      .then(() => node.details ? d3.json(node.details) : node)
      .then(data => this.options.handlers.showDetails(data, form, node))
      .catch(this.options.logger.error)
      .then(newData => {
        node = newData || node
        document.body.classList.remove('dialogOpen')
        nodeEl.classList.remove('menuActive')
        this.details.innerHTML = ''
        this.diagram.updateNode(node)
        this.diagram.update()
      })
  }

  getNumClosedLinks(node) {
    return Object.keys(node.linkedNodes).length - this.getNumOpenLinks(node)
  }

  getNumOpenLinks(node) {
    return this.diagram.links.filter(n => n.source.id === node.id || n.target.id === node.id).length
  }

  toggleNodes(node, type) {
    const links = node.links[type]
    if (links && links.length) {
      const allNodesVisible = !links.some(l => !l.visible)
      if (allNodesVisible) {
        links
          .map(l => {
            l.visible = false
            return l.target
          })
          .filter(n => !Object.values(n.links).some(links => links.some(link => link.visible)))
          .forEach(n => n.visible = false)
      } else {
        links.forEach(l => {
          l.visible = true
          l.target.visible = true
        })
      }
      this.update()
    }
  }

  showNodes(node, type) {
    const nodes = (node.links[type] || [])
      .filter(link => !link.target.visible)
      .map(link => link.target)
      .filter(node => node.visible = true)
    if (nodes.length) {
      node.links[type].forEach(l => l.visible = true)
      this.update()
    }
  }

  getNumberOfVisibleConnections(node) {
    return Object.keys(node.links).reduce((sum, type) => sum + node.links[type].filter(l => l.target.visible).length, 0)
  }

  hideNodes(node, type) {
    const nodes = (node.links[type] ||[])
      .map(link => {
        link.visible = false
        return link.target
      })
      .filter(node => node.visible && this.getNumberOfVisibleConnections(node) === 1)
      .filter(node => !(node.visible = false))
    if (nodes.length || node.links[type].length) {
      this.update()
    }
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
        } else {
          link.visible = false
        }
      })

    this.diagram.scaleToNode(node, 1)
    this.update()
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
        link.visible = true
      })

    this.diagram.scaleToNode(node, 1)
    this.update()
  }

  addNode(node) {
    const links = this.computeLinks([node])
    node.visible = true
    this.nodes.push(node)
    links.forEach(link => {
      link.visible = true
      this.links.push(link)
    })
  }

  removeNode(node) {
    this.nodes = this.nodes.filter(n => n.id !== node.id)
    this.links = this.links.filter(l => l.source.id !== node.id && l.target.id !== node.id)
    node.visible = false
    this.update()
    if (this.options.handlers.nodeRemoved) {
      this.options.handlers.nodeRemoved(node)
    }
  }

  getNode(id) {
    return this.nodes.find(node => node.id === id)
  }

  updateNode(node) {
    this.updateNodes([node])
  }

  updateNodes(nodes) {
    this.computeLinks(nodes)
    nodes.forEach(node => this.diagram.updateNode(node))
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
    this.links = this.links
      .filter(l => !links.some(r => cmpLink(l, r)))
      .forEach(l => l.visible = true)
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
    this.diagram.links = this.links.filter(d => d.visible)
    this.diagram.nodes = this.nodes.filter(d => d.visible)
    this.diagram.update()
  }

  scale(factor) {
    return this.diagram.scale(factor)
  }
}

export default Network
