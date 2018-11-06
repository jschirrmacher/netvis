/* eslint-env node, mocha */

const sinon = require('sinon')

const node1 = {id: 1, name: 'Node 1', links: {topic: [2]}}
const node2 = {id: 2, name: 'Node 2', links: {topic: [3]}}
const node3 = {id: 3, name: 'Node 3', links: {topic: [4]}}
const node4 = {id: 4, name: 'Node 4', links: {topic: [5]}}
const node5 = {id: 5, name: 'Node 5'}
const node5a = {id: 5, name: 'Node 5', links: {topic: [1]}}

const deepCopy = arr => arr.map(e => Object.assign({}, e))
global.fetch = function (url) {
  return new Promise((resolve, reject) => {
    if (url === '/x') {
      resolve({ok: true, json: () => ({nodes: deepCopy([node1, node2, node3, node4, node5])})})
    } else if (url === '/y') {
      resolve({ok: true, json: () => ({nodes: deepCopy([node1, node2, node3, node4, node5a])})})
    } else {
      reject('Unknown path')
    }
  })
}
const Network = require('./Network').default
const should = require('should')

function getNodeLevels(network) {
  return Object.assign({}, ...[...Array(5).keys()].map(id => ({[id + 1]: network.getNode(id + 1).level})))
}

describe('Network', () => {
  before(function () {
    this.jsdom = require('jsdom-global')()
    window.Element.prototype.getComputedTextLength = function() {
      return 200
    }
    window.HTMLUnknownElement.prototype.getBBox = function () {
      return [0, 0, 200, 200]
    }

    const svg = document.createElement('svg')
    svg.setAttribute('id', 'root')
    svg.width = {baseVal: 500}
    svg.height = {baseVal: 500}
    document.body.appendChild(svg)
  })

  after(function () {
    this.jsdom()
  })

  it('should calculate distances of the nodes', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
      initialized: () => {
        network.setDistancesToNode(network.getNode(1))
        getNodeLevels(network).should.deepEqual({1: 0, 2: 1, 3: 2, 4: 3, 5: 4})
        done()
      }
    }})
  })

  it('should restrict distance calculation to a given maximum', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', maxLevel: 2, handlers: {
      initialized: () => {
        network.setDistancesToNode(network.getNode(1))
        getNodeLevels(network).should.deepEqual({1: 0, 2: 1, 3: 2, 4: 2, 5: 2})
        done()
      }
    }})
  })

  it('should stop calculation in cyclic graphs', done => {
    const network = new Network({dataUrl: '/y', domSelector: '#root', handlers: {
      initialized: () => {
        network.setDistancesToNode(network.getNode(1))
        getNodeLevels(network).should.deepEqual({1: 0, 2: 1, 3: 2, 4: 2, 5: 1})
        done()
      }
    }})
  })

  it('should show connections of a given type', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
      initialized: () => {
        network.diagram = {
          add: sinon.fake(),
          update: sinon.fake()
        }
        network.showNodes(node1, 'topic')
        network.nodes.map(n => n.visible).should.deepEqual([undefined, true, undefined, undefined, undefined])
        network.diagram.add.callCount.should.equal(1)
        network.diagram.add.args[0][0][0].id.should.equal(2)
        network.diagram.add.args[0][0][0].name.should.equal('Node 2')
        network.diagram.update.callCount.should.equal(1)
        network.diagram.update.calledWith().should.be.true()
        done()
      }
    }})
  })

  it('should open all connections of a node', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
      initialized: () => {
        network.diagram = {
          scaleToNode: sinon.fake(),
          add: sinon.fake(),
          update: sinon.fake()
        }
        network.openNode(node1)
        network.getNode(2).visible.should.be.true()
        network.diagram.scaleToNode.callCount.should.equal(1)
        network.diagram.scaleToNode.calledWith(node1, 1).should.be.true()
        network.diagram.add.callCount.should.equal(1)
        network.diagram.add.calledWith([network.getNode(2)], [network.getNode(1).links.topic[0]]).should.be.true()
        network.diagram.update.callCount.should.equal(1)
        network.diagram.update.calledWith().should.be.true()
        done()
      }
    }})
  })

  it('should close all connections of a node', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            scaleToNode: sinon.fake(),
            getLinkedNodes: sinon.fake.returns([node2]),
            remove: sinon.fake(),
            update: sinon.fake()
          }
          network.getNode(1).open = true
          network.getNode(2).visible = true
          network.closeNode(node1)
          should.not.exist(network.getNode(2).visible)
          network.diagram.scaleToNode.callCount.should.equal(1)
          network.diagram.scaleToNode.calledWith(node1, 1).should.be.true()
          network.diagram.remove.callCount.should.equal(1)
          network.diagram.remove.args[0][0][0].id.should.equal(2)
          network.diagram.remove.args[0][0][0].name.should.equal('Node 2')
          network.diagram.update.callCount.should.equal(1)
          network.diagram.update.calledWith().should.be.true()
          done()
        }
      }})
  })

  it('should toggle node visibilty', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            add: sinon.fake(),
            remove: sinon.fake(),
            scaleToNode: sinon.fake(),
            update: sinon.fake(),
            getLinkedNodes: sinon.fake.returns([])
          }

          network.toggle(node4)
          node4.open.should.be.true()
          network.diagram.add.callCount.should.equal(2)

          network.toggle(node4)
          node4.open.should.be.false()
          network.diagram.remove.callCount.should.equal(2)
          done()
        }
      }})
  })

  it('should route update requests to the diagram', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            update: sinon.fake()
          }
          network.update()
          network.diagram.update.callCount.should.equal(1)
          network.diagram.update.calledWith().should.be.true()
          done()
        }
      }})
  })

  it('should route scale requests to the diagram', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            scale: sinon.fake()
          }
          network.scale(2)
          network.diagram.scale.callCount.should.equal(1)
          network.diagram.scale.calledWith(2).should.be.true()
          done()
        }
      }})
  })

  it('should allow to add a node', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            add: sinon.fake()
          }
          const node = {id: 6, name: 'Added Node'}
          network.addNode(node)
          network.nodes.length.should.equal(6)
          network.nodes[5].id.should.equal(6)
          network.diagram.add.callCount.should.equal(1)
          network.diagram.add.calledWith([node], []).should.be.true()
          done()
        }
      }})
  })

  it('should compute links in new nodes', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          const node = {id: 6, name: 'Added Node', links: {topics: [2]}}
          network.addNode(node)
          node.should.have.property('linkedNodes')
          Object.keys(node.linkedNodes).should.deepEqual(['2'])
          node.links.topics[0].source.id.should.equal(6)
          node.links.topics[0].target.id.should.equal(2)
          network.links.length.should.equal(5)
          network.links[4].source.id.should.equal(6)
          network.links[4].target.id.should.equal(2)
          done()
        }
      }})
  })

  it('should allow to remove a node', done => {
    const network = new Network({dataUrl: '/x', domSelector: '#root', handlers: {
        initialized: () => {
          network.diagram = {
            remove: sinon.fake(),
            update: sinon.fake()
          }
          network.removeNode(node3)
          network.nodes.length.should.equal(4)
          network.nodes[2].id.should.equal(4)
          network.diagram.remove.callCount.should.equal(1)
          network.diagram.remove.calledWith([node3], []).should.be.true()
          network.diagram.update.callCount.should.equal(1)
          network.diagram.update.calledWith().should.be.true()
          done()
        }
      }})
  })
})
