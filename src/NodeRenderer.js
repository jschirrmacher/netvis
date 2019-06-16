import * as d3 from './d3'

class NodeRenderer {
  constructor(options = {imageSuppressionLevel: -1, levelSteps: 0}) {
    this.options = options
  }

  setup(svg) {
    this.defs = svg.append('defs')
  }

  render(enter) {
    this.renderCircle(enter.filter(d => d.shape === 'circle'))
    this.renderRect(enter.filter(d => d.shape === 'rect'))
    this.renderTitle(enter)
    if (this.options.showRefLinks) {
      this.renderRefLinks(enter)
    }
  }

  renderCircle(enter) {
    enter.append('circle')
      .attr('r', d => d.radius || 50)
      .attr('fill', this.getBackground.bind(this))
  }

  renderRect(enter) {
    enter.append('rect')
      .attr('x', d => (d.width || 100) / -2)
      .attr('y', d => (d.width || 70) / -2)
      .attr('width', d => d.width || 100)
      .attr('height', d => d.height || 70)
      .attr('fill', this.getBackground.bind(this))
  }

  renderTitle(enter) {
    enter.append('g')
      .classed('title', true)
      .append('text')
      .text(d => d.name)
      .call(d => this.wrap(d, (d.width || d.radius * 2 || 100) - 10))
  }

  calculateRefLinkPosition(d) {
    const types = Object.keys(d.links || {})
    const angle = Math.PI / 8
    const radius = d.radius || 70
    return types.map((type, i) => ({
      type,
      fontSize: d.fontSize,
      x: radius * Math.cos((i - types.length / 2) * angle),
      y: radius * Math.sin((i - types.length / 2) * angle)
    }))
  }

  renderRefLinks(enter) {
    enter.append('g')
      .attr('class', 'reflinks')
      .selectAll(null)
      .data(this.calculateRefLinkPosition.bind(this))
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('data-ref', d => d.type)
      .append('text')
      .call(this.renderRefLinksContent.bind(this))
  }

  renderRefLinksContent(enter) {
    enter
      .text(d => (this.options.texts && this.options.texts[d.type]) || d.type)
      .call(d => this.makeTextBackground(d, false, 15, 8))
  }

  getBackground(node) {
    const beyondMaxLevel = this.options.imageSuppressionLevel >= 0 && node.level >= this.options.imageSuppressionLevel
    if (!node.image || beyondMaxLevel) {
      return '#eef'
    }
    this.defs.select('#bg-' + node.id).remove()
    this.defs.append('pattern')
      .attr('id', () => 'bg-' + node.id)
      .attr('height', 1).attr('width', 1)
      .append('image')
      .attr('xlink:href', node.image.replace(/ /g, '%20'))
      .attr('height', '100px').attr('width', '100px')
      .attr('preserveAspectRatio', 'xMidYMid slice')

    return 'url(#bg-' + node.id + ')'
  }

  getTransformation(d) {
    const scale = this.options.levelSteps ? ` scale(${1 - (d.level || 1) * this.options.levelSteps})` : ''
    return `translate(${[d.x || 0, d.y || 0]})${scale}`
  }

  getClass(d) {
    return [
      'node',
      d.className,
      d.open && 'open',
      d.image && 'withBg',
      'level-' + d.level
    ].filter(c => c).join(' ')
  }

  wrap(text, width, fixedWidth = false) {
    const self = this
    text.each(function (node) {
      node.fontSize = node.fontSize || 1
      const text = d3.select(this).attr('style', 'font-size: ' + (node.fontSize * 14) + 'px')
      const words = (node.name || '').split(/[\s-]+/).reverse()
      const lineHeight = 1.1
      let line = []
      let tspan = text.text(null).append('tspan')
      let word
      let lineCount = 0
      while ((word = words.pop())) {
        line.push(word)
        tspan.text(line.join(' '))
        if (line.length > 1 && tspan.node().getComputedTextLength() > width) {
          line.pop()
          tspan.text(line.join(' '))
          lineCount++
          line = [word]
          tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeight + 'em').text(word)
        }
      }
      text.attr('y', (-lineCount * 0.3) + 'em')
      node.bbox = self.makeTextBackground(text, fixedWidth && width)
    })
  }

  makeTextBackground(text, width, paddingX = 5, paddingY = 3) {
    let bbox
    text.each(function () {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bbox = this.getBBox()
      rect.setAttribute('class', 'text-bg')
      rect.setAttribute('x', bbox.x - paddingX)
      rect.setAttribute('y', bbox.y - paddingY)
      rect.setAttribute('width', (width || bbox.width) + 2 * paddingX)
      rect.setAttribute('height', bbox.height + 2 * paddingY)
      this.parentNode.insertBefore(rect, this)
    })
    return bbox
  }
}

export default NodeRenderer
