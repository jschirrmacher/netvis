class NodeRenderer {
  constructor(options = {imageSuppressionLevel: -1, levelSteps: 0}) {
    this.options = options
  }

  setup(svg) {
    this.defs = svg.append('defs')
  }

  render(enter) {
    enter.filter(d => d.shape === 'circle')
      .append('circle')
      .attr('r', 50)
      .attr('fill', this.getBackground.bind(this))
    enter.filter(d => d.shape === 'rect')
      .append('rect')
      .attr('x', -50)
      .attr('y', -35)
      .attr('width', 100)
      .attr('height', 70)
      .attr('fill', this.getBackground.bind(this))
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
    const scale = this.options.levelSteps ? ` scale(${1 - d.level * this.options.levelSteps})` : ''
    return `translate(${[d.x, d.y]})${scale}`
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
}

export default NodeRenderer
