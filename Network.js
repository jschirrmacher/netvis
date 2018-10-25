import ForceDiagram from './ForceDiagram'
import * as d3  from './d3'

const nextId = list => list.reduce((id, entry) => Math.max(id, entry.id), 0) + 1

class Network {
  constructor(dataUrl, domSelector, handlers = {}, texts = {}) {
    handlers.error = handlers.error || (() => undefined)
    this.texts = texts
    this.handlers = handlers
    d3.json(dataUrl)
      .then(data => handlers.prepare ? handlers.prepare(data) : data)
      .then(data => {
        this.diagram = new ForceDiagram(document.querySelector(domSelector))
        if (this.handlers.showDetails) {
          this.details = document.createElement('div')
          this.details.setAttribute('class', 'details')
          document.body.append(this.details)
          this.diagram.addHandler('click', node => this.showDetails(node))
        }

        const node = id => data.nodes.find(node => node.id === id) || handlers.error('Node id ' + id + ' not found');
        let id = 1
        this.links = data.nodes.map(source => {
          source.links = Object.assign({}, ...(source.links || []).map(list => {
            const title = (this.texts && this.texts[list.type]) || list.type
            const links = list.nodes.map(targetId => ({id: id++, source, target: node(targetId)}))
            return {[list.type]: {type: list.type, title, links}}
          }))
          return Object.keys(source.links).map(type => source.links[type].links).reduce((a, b) => a.concat(b), [])
        }).reduce((a, b) => a.concat(b), [])
        this.nodes = data.nodes

        const setBothSidesVisible = d => d.source.visible = d.target.visible = true
        this.links.filter(d => d.source.open || d.target.open).map(setBothSidesVisible)
        const links = this.links.filter(d => d.source.visible && d.target.visible)
        const nodes = this.nodes.filter(d => d.visible)
        this.diagram.add(nodes, links)
        this.diagram.update()

        setTimeout(() => {
          document.body.className = 'initialized'
          this.handlers.initialized && this.handlers.initialized()
        }, 0)
      })
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
      .then(() => {
        document.body.classList.add('dialogOpen')
        nodeEl.classList.add('menuActive')
      })
      .then(() => node.details ? this.d3json(node.details) : node)
      .then(data => this.handlers.showDetails(data, form, node))
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
    node.links[type].links.forEach(link => {
      link.target.visible = true
      this.addNode(link.target)
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
    this.nodes.push(node)
    this.diagram.add([node], [])
  }

  removeNode(node) {
    this.nodes = this.nodes.filter(n => n.id !== node.id)
    this.links = this.links.filter(l => l.source.id !== node.id && l.target.id !== node.id)
    this.diagram.remove([node], [])
    this.diagram.update()
    if (this.handlers.nodeRemoved) {
      this.handlers.nodeRemoved(node)
    }
  }

  getNode(id) {
    return this.nodes.find(node => node.id === id)
  }

  addLinks(links) {
    this.diagram.add([], links
      .map(l => ({id: nextId(this.links), source: this.getNode(l.source.id), target: this.getNode(l.target.id)}))
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
    this.handlers.nameRequired()
      .then(name => name ? name : Promise.reject('no name given'))
      .then(name => {
        let existing = this.nodes.find(node => node.name.toLowerCase() === name.toLowerCase())
        if (!existing) {
          existing = this.handlers.newNode ? this.handlers.newNode(name) : {name}
          existing.id = existing.id || nextId(this.nodes)
          this.nodes.push(existing)
          this.diagram.add([existing], [])
        }
        if (!this.diagram.nodesConnected(node, existing)) {
          const newLink = {id: nextId(this.links), source: node, target: existing}
          if (this.handlers.newLink) {
            this.handlers.newLink(newLink)
          }
          this.links.push(newLink)
          this.diagram.add([], [newLink])
        }

        this.diagram.update()
      })
      .catch(this.handlers.error)
  }

  update() {
    this.diagram.update()
  }

  scale(factor) {
    return this.diagram.scale(factor)
  }
}

export default Network
