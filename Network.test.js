/* eslint-env node, mocha */

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
require('should')

function getNodeLevels(network) {
  return Object.assign({}, ...[...Array(5).keys()].map(id => ({[id + 1]: network.getNode(id + 1).level})))
}

describe('Network', () => {
  before(function () {
    this.jsdom = require('jsdom-global')()

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
})
