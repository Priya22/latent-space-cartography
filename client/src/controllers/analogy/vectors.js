import * as d3 from 'd3'
import _ from 'lodash'
import {moveToFront} from './util'

const NEIGHBOR_BIN = [0, 10, 100, 500]
const MAX_NEIGHBORS = 1000

class Vectors {
  constructor (scales, parent, dispatch, styles = {}) {
    /**
     * Public
     */
    this.lineWidth = styles.lineWidth || 2
    this.background = styles.background || '#fff'
    this.data_type = 'image'
    this.hide = false

    /**
     * Private
     */
    this._scales = scales
    this._parent = parent
    this._dispatch = dispatch

    this._max_neighbors = MAX_NEIGHBORS

    /**
     * Data
     */
    this.primary = null
    this.analogy = null

    /**
     * Initialization
     */
    this._registerCallback()
  }

  /**
   * Draw a vector for image data.
   * @param vector
   * @private
   */
  _drawImageVector (vector) {
    if (!vector) {
      return
    }

    let scales = this._scales
    let img_size = _computeImageSize()
    let img_padding = 10
    let chart_height = img_size + img_padding + 5

    let line = d3.line()
      .x((d) => scales.x(d.x))
      .y((d) => scales.y(d.y))

    // group
    let group = this._parent.append('g')
      .datum(vector) // so we can retrieve later
      .classed('vector-group', true)
      .on('mouseover', () => {moveToFront(group)})

    // line background
    this._drawLine(line, vector, group)
      .classed('vector-background', true)
      .style('stroke', this.background)
      .style('stroke-opacity', 0.9)
      .style('stroke-linecap', 'round')
      .style('stroke-width', 10)

    // draw lines with different textures
    _.each(NEIGHBOR_BIN, (num, j) => {
      let bin = _.filter(vector, (d) => d.neighbors >= num)
      let path = this._drawLine(line, bin, group)
      this._styleTexture(path, j)
    })

    // connector
    let yy = d3.scaleLinear()
      .range([0, chart_height])
      .domain([0, this._max_neighbors])

    let link = d3.linkVertical()
      .source((d) => [scales.x(d.x), scales.y(d.y) + yy(d.neighbors)])
      .target((d) => [scales.x(d.x), scales.y(d.y) - img_padding])

    group.selectAll('.vector-connector')
      .data(vector)
      .enter()
      .append('path')
      .classed('vector-connector', true)
      .attr('d', link)
      .attr('stroke-width', 0)

    // dot at each sampled location
    group.selectAll('.vector-dot')
      .data(vector)
      .enter()
      .append('circle')
      .classed('vector-dot', true)
      .attr('r', 3)
      .attr('cx', (d) => scales.x(d.x))
      .attr('cy', (d) => scales.y(d.y))
      .style('fill', '#fff')
      .style('stroke', (d) => d.neighbors > NEIGHBOR_BIN[3] ? '#222' : '#888')
      .style('stroke-width', 2)

    // image shadow
    let shadow = group.selectAll('.vector-img-shadow')
      .data(vector)
      .enter()
      .append('image')
      .classed('vector-img-shadow', true)
      .attr('xlink:href', (d) => `/data/temp/${d.image}`)
      .style('filter', 'url(#shadow)')
    _styleImage(shadow, img_size, img_padding)

    // images
    let images = group.selectAll('.vector-img')
      .data(vector)
      .enter()
      .append('image')
      .classed('vector-img', true)
      .attr('xlink:href', (d) => `/data/temp/${d.image}`)
    _styleImage(images, img_size, img_padding)

    function _styleImage(img, size, padding) {
      return img
        .attr('x', (d) => scales.x(d.x) - size * 0.5)
        .attr('y', (d) => scales.y(d.y) - size - padding)
        .attr('width', () => size)
        .attr('height', () => size)
    }

    function _computeImageSize () {
      const size_min = 20
      const size_max = 48

      let x = scales.x(vector[0].x) - scales.x(vector[1].x)
      let y = scales.y(vector[0].y) - scales.y(vector[1].y)
      let gap = Math.sqrt(x * x + y * y)

      return _.clamp(Math.floor(gap * 0.7), size_min, size_max)
    }
  }

  /**
   * Draw a vector for generic data.
   * @param vector
   * @private
   */
  _drawGenericVector (vector) {
    if (!vector) {
      return
    }

    let scales = this._scales

    let line = d3.line()
      .x((d) => scales.x(d.x))
      .y((d) => scales.y(d.y))

    // group
    let group = this._parent.append('g')
      .datum(vector) // so we can retrieve later
      .classed('vector-group', true)
      .on('mouseover', () => {moveToFront(group)})

    // line background
    this._drawLine(line, vector, group)
      .classed('vector-background', true)
      .style('stroke', this.background)
      .style('stroke-opacity', 0.9)
      .style('stroke-linecap', 'round')
      .style('stroke-width', 10)

    // draw lines with different textures
    _.each(NEIGHBOR_BIN, (num, j) => {
      let bin = _.filter(vector, (d) => d.neighbors >= num)
      let path = this._drawLine(line, bin, group)
      this._styleTexture(path, j)
    })

    // dot at each sampled location
    group.selectAll('.vector-dot')
      .data(vector)
      .enter()
      .append('circle')
      .classed('vector-dot', true)
      .attr('r', 3)
      .attr('cx', (d) => scales.x(d.x))
      .attr('cy', (d) => scales.y(d.y))
      .style('fill', '#fff')
      .style('stroke', (d) => d.neighbors > NEIGHBOR_BIN[3] ? '#222' : '#888')
      .style('stroke-width', 2)
  }

  _drawHull (pts, color) {
    let layer = this._parent.select('.halo_layer')

    if (pts && pts.length) {
      let vertices = _.map(pts, (p) => [this._scales.x(p.x), this._scales.y(p.y)])
      layer.append('path')
        .attr('class', 'hull-vector')
        .datum(d3.polygonHull(vertices))
        .attr('d', (d) => 'M' + d.join('L') + 'Z')
        .style('fill', () => color)
        .style('fill-opacity', 0.2)
    }
  }

  _drawCone () {
    let start = this.primary.points_start
    let end = this.primary.points_end

    this._drawHull(start.concat(end), '#ccc')
    this._drawHull(start, '#8358d5')
    this._drawHull(end, '#f4c44c')
  }

  /**
   * Register callbacks to dispatcher.
   * @private
   */
  _registerCallback () {
    this._dispatch.on('toggle-background.vector', (color) => {
      this.background = color
      d3.selectAll('.vector-background')
        .style('stroke', color)
    })
  }

  /**
   * Style an SVG path according to the category
   * @param path
   * @param category
   * @private
   */
  _styleTexture (path, category) {
    switch (category) {
      case 0:
        return path
          .style('stroke', '#aaa')
          .style('stroke-dasharray', '2, 2')
          .style('stroke-width', 1)
      case 1:
        return path
          .style('stroke', '#888')
          .style('stroke-dasharray', '4, 4')
          .style('stroke-width', this.lineWidth)
      case 2:
        return path
          .style('stroke', '#888')
          .style('stroke-width', this.lineWidth)
      case 3:
        return path
          .style('stroke', '#222')
          .style('stroke-width', this.lineWidth)
    }
  }

  _drawLine (line, vector, container) {
    return container.append('path')
      .datum(vector)
      .classed('line', true)
      .attr('d', line)
  }

  clearData () {
    this.primary = null
    this.analogy = null
  }

  /**
   * Redraw everything (e.g. because scale is updated)
   */
  redraw () {
    // remove previous vector
    d3.selectAll('.vector-group').remove()

    // remove cone
    let layer = this._parent.select('.halo_layer')
    layer.selectAll('.hull-vector').remove()

    if(this.primary && !this.hide) {
      // draw vectors
      let drawFunc = this.data_type === 'image' ? this._drawImageVector.bind(this) :
        this._drawGenericVector.bind(this)
      drawFunc(this.primary.line)
      drawFunc(this.analogy)

      // draw confidence cone
      this._drawCone()

      // dim other marks
      this._parent.selectAll('.mark-img-group')
        .attr('opacity', 0.5)
    }
  }
}

export default Vectors
