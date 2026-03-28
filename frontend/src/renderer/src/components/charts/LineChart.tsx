import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ChartInteractionEvent } from '../../types/chartEvents'
import { buildChartEvent } from '../../utils/chartEventProtocol'
import useChartContainerSize from '../../hooks/useChartContainerSize'
import { getChartTheme } from '../../utils/chartTheme'
import { useThemeMode } from '../../hooks/useThemeMode'

export interface ChartSeries {
  data: Record<string, unknown>[]
  label: string
  color: string
}

interface LineChartProps {
  data: Record<string, unknown>[]
  xField: string
  yField: string
  chartId?: string
  activeValue?: string | number | boolean | null
  onDataPointClick?: (event: ChartInteractionEvent) => void
  labelTranslator?: (raw: string) => string
  yFieldLabel?: string
  series?: ChartSeries[]
  width?: number | string
  height?: number
}

const identity = (v: string): string => v

const LineChart: React.FC<LineChartProps> = ({
  data,
  xField,
  yField,
  chartId = 'line-chart',
  activeValue = null,
  onDataPointClick,
  labelTranslator = identity,
  yFieldLabel,
  series: externalSeries,
  width = '100%',
  height = 300
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { containerRef, containerSize } = useChartContainerSize()
  const [hiddenSeriesLabels, setHiddenSeriesLabels] = useState<Set<string>>(new Set())
  const [brushSelectedKeys, setBrushSelectedKeys] = useState<string[]>([])
  const brushSelectedSet = useMemo(() => new Set(brushSelectedKeys), [brushSelectedKeys])
  const numericWidth = typeof width === 'number' ? width : Number.NaN
  const currentWidth = Number.isFinite(numericWidth)
    ? numericWidth
    : width === '100%'
      ? containerSize.width
      : containerSize.width
  const minDrawWidth = 280
  const minDrawHeight = 200
  const canDraw = currentWidth >= minDrawWidth && height >= minDrawHeight

  const { theme } = useThemeMode()
  const chartTheme = useMemo(() => getChartTheme(theme), [theme])

  const isMultiSeries = externalSeries && externalSeries.length > 0

  const allSeries: ChartSeries[] = useMemo(() => {
    if (isMultiSeries) return externalSeries!
    return [{ data, label: yFieldLabel ?? '当前', color: chartTheme.palette[0] }]
  }, [data, externalSeries, isMultiSeries, yFieldLabel, chartTheme])

  const visibleSeries = useMemo(
    () => allSeries.filter((s) => !hiddenSeriesLabels.has(s.label)),
    [allSeries, hiddenSeriesLabels]
  )

  const toggleSeries = (label: string): void => {
    setHiddenSeriesLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if ((!data || data.length === 0) && !isMultiSeries) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    d3.select(containerRef.current).selectAll<HTMLDivElement, null>('.chart-tooltip').remove()
    if (!canDraw) return

    const margin = { top: isMultiSeries ? 44 : 36, right: 30, bottom: 46, left: 60 }
    const innerWidth = currentWidth - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Add gradient definition
    const defs = svg.append('defs')
    const gradientId = `line-fill-${chartId}`
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
    gradient.append('stop').attr('offset', '0%').attr('stop-color', chartTheme.lineFillGradient[0])
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', chartTheme.lineFillGradient[1])

    const tooltip = d3
      .select(containerRef.current)
      .selectAll<HTMLDivElement, null>('.chart-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('padding', '6px 8px')
      .style('background', chartTheme.tooltipBackground)
      .style('color', chartTheme.labelFill)
      .style('border', `1px solid ${chartTheme.gridStroke}`)
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.1)')
      .style('font-size', '12px')
      .style('border-radius', '4px')
      .style('z-index', '10')
      .style('white-space', 'nowrap')

    const xDomainSet = new Set<string>()
    for (const s of visibleSeries) {
      for (const d of s.data) xDomainSet.add(String(d[xField]))
    }
    if (!isMultiSeries) {
      for (const d of data) xDomainSet.add(String(d[xField]))
    }
    const xDomain = Array.from(xDomainSet)

    const x = d3.scalePoint().domain(xDomain).range([0, innerWidth]).padding(0.5)

    let yMax = 0
    for (const s of visibleSeries) {
      for (const d of s.data) {
        const v = Number(d[yField])
        if (v > yMax) yMax = v
      }
    }
    const y = d3
      .scaleLinear()
      .domain([0, yMax || 1])
      .nice()
      .range([innerHeight, 0])

    const maxTicks = Math.max(1, Math.floor(innerWidth / 78))
    const tickStep = Math.max(1, Math.ceil(xDomain.length / maxTicks))
    const tickValues = xDomain.filter(
      (_, index) => index % tickStep === 0 || index === xDomain.length - 1
    )

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(tickValues))
      .selectAll('text')
      .attr('transform', 'translate(0,0)')
      .style('text-anchor', 'middle')
      .text((d) => {
        const translated = labelTranslator(String(d))
        return translated.length > 8 ? translated.substring(0, 6) + '...' : translated
      })
      .append('title')
      .text((d) => labelTranslator(String(d)))

    const yAxis = g.append('g').call(d3.axisLeft(y))

    // Add horizontal grid lines
    yAxis
      .selectAll('.tick line')
      .clone()
      .attr('x2', innerWidth)
      .attr('stroke', chartTheme.gridStroke)
      .attr('stroke-opacity', 1)
      .attr('stroke-dasharray', '3,3')

    if (isMultiSeries) {
      visibleSeries.forEach((series) => {
        const lineGen = d3
          .line<Record<string, unknown>>()
          .x((d) => x(String(d[xField]))!)
          .y((d) => y(Number(d[yField])))

        if (series.label === allSeries[0].label) {
          const areaGen = d3
            .area<Record<string, unknown>>()
            .x((d) => x(String(d[xField]))!)
            .y0(innerHeight)
            .y1((d) => y(Number(d[yField])))

          g.append('path').datum(series.data).attr('fill', `url(#${gradientId})`).attr('d', areaGen)
        }

        g.append('path')
          .datum(series.data)
          .attr('fill', 'none')
          .attr('stroke', series.color)
          .attr('stroke-width', 2)
          .attr('d', lineGen)

        g.selectAll(`.dot-${series.label}`)
          .data(series.data)
          .enter()
          .append('circle')
          .attr('cx', (d) => x(String(d[xField]))!)
          .attr('cy', (d) => y(Number(d[yField])))
          .attr('r', 3.5)
          .attr('fill', series.color)
          .style('cursor', 'default')
          .on('mousemove', (event, datum) => {
            const pointer = d3.pointer(event, containerRef.current)
            const key = String(datum[xField] ?? '--')
            const displayLabel = labelTranslator(key)
            let html = `<strong>${displayLabel}</strong>`
            for (const s of visibleSeries) {
              const row = s.data.find((d) => String(d[xField]) === key)
              const val = row ? Number(row[yField] ?? 0) : '-'
              html += `<br/><span style="color:${s.color}">■</span> ${s.label}: ${val}`
            }
            tooltip
              .style('opacity', '1')
              .style('left', `${pointer[0] + 12}px`)
              .style('top', `${pointer[1] + 12}px`)
              .html(html)
          })
          .on('mouseleave', () => tooltip.style('opacity', '0'))
      })
    } else {
      const singleVisible = visibleSeries.length > 0

      const lineGen = d3
        .line<Record<string, unknown>>()
        .x((d) => x(String(d[xField]))!)
        .y((d) => y(Number(d[yField])))

      if (singleVisible) {
        const areaGen = d3
          .area<Record<string, unknown>>()
          .x((d) => x(String(d[xField]))!)
          .y0(innerHeight)
          .y1((d) => y(Number(d[yField])))

        g.append('path').datum(data).attr('fill', `url(#${gradientId})`).attr('d', areaGen)

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', chartTheme.palette[0])
          .attr('stroke-width', 2)
          .attr('d', lineGen)
      }

      g.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (d) => x(String(d[xField]))!)
        .attr('cy', (d) => y(Number(d[yField])))
        .attr('r', (d) => {
          if (!singleVisible) return 0
          const key = String(d[xField] ?? '')
          if (brushSelectedSet.size > 0 && brushSelectedSet.has(key)) return 6
          return 4
        })
        .attr('fill', (d) => {
          const key = String(d[xField] ?? '')
          if (!singleVisible) return 'transparent'
          if (activeValue !== null && key === String(activeValue)) return chartTheme.activeHighlight
          if (brushSelectedSet.size > 0) {
            return brushSelectedSet.has(key) ? chartTheme.palette[0] : '#d9d9d9'
          }
          return chartTheme.palette[0]
        })
        .style('cursor', onDataPointClick ? 'pointer' : 'default')
        .on('mousemove', (event, datum) => {
          const pointer = d3.pointer(event, containerRef.current)
          const rawLabel = String(datum[xField] ?? '--')
          const displayLabel = labelTranslator(rawLabel)
          tooltip
            .style('opacity', '1')
            .style('left', `${pointer[0] + 12}px`)
            .style('top', `${pointer[1] + 12}px`)
            .html(`${displayLabel}<br/>${yFieldLabel ?? yField}: ${Number(datum[yField] ?? 0)}`)
        })
        .on('mouseleave', () => tooltip.style('opacity', '0'))
        .on('click', (_, datum) => {
          if (!onDataPointClick) return
          const clickedValue = datum[xField]
          if (clickedValue === undefined || clickedValue === null) return
          onDataPointClick(
            buildChartEvent({
              sourceChart: chartId,
              trigger: 'click',
              action:
                activeValue !== null && String(activeValue) === String(clickedValue)
                  ? 'clear'
                  : 'select',
              dimension: xField,
              value: clickedValue as string | number | boolean,
              label: String(clickedValue),
              rawData: datum
            })
          )
        })

      const brush = d3
        .brushX()
        .extent([
          [0, 0],
          [innerWidth, innerHeight]
        ])
        .on('end', (event) => {
          const selection = event.selection as [number, number] | null
          if (!selection || !singleVisible) {
            setBrushSelectedKeys([])
            if (onDataPointClick) {
              onDataPointClick(
                buildChartEvent({
                  sourceChart: chartId,
                  trigger: 'brush',
                  action: 'clear',
                  dimension: xField,
                  value: [],
                  label: '清除刷选',
                  rawData: {}
                })
              )
            }
            return
          }

          const selectedRows = data.filter((datum) => {
            const pointX = x(String(datum[xField])) ?? -1
            return pointX >= selection[0] && pointX <= selection[1]
          })

          const selectedValues = selectedRows
            .map((datum) => datum[xField])
            .filter(
              (value): value is string | number =>
                typeof value === 'string' || typeof value === 'number'
            )

          const selectedKeys = selectedValues.map((value) => String(value))
          setBrushSelectedKeys(selectedKeys)

          if (!onDataPointClick) return

          if (selectedValues.length === 0) {
            onDataPointClick(
              buildChartEvent({
                sourceChart: chartId,
                trigger: 'brush',
                action: 'clear',
                dimension: xField,
                value: [],
                label: '清除刷选',
                rawData: {}
              })
            )
            return
          }

          onDataPointClick(
            buildChartEvent({
              sourceChart: chartId,
              trigger: 'brush',
              action: 'brush',
              dimension: xField,
              value: selectedValues,
              label: `${String(selectedValues[0])} - ${String(selectedValues[selectedValues.length - 1])}`,
              rawData: { selectedValues, selectedCount: selectedValues.length }
            })
          )
        })

      if (singleVisible) {
        g.append('g').attr('class', 'brush-layer').call(brush)
      }
    }

    return () => {
      tooltip.style('opacity', '0')
    }
  }, [
    activeValue,
    brushSelectedSet,
    canDraw,
    chartId,
    containerRef,
    currentWidth,
    data,
    height,
    visibleSeries,
    isMultiSeries,
    labelTranslator,
    onDataPointClick,
    xField,
    yField,
    yFieldLabel
  ])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {isMultiSeries && canDraw && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            padding: '4px 8px',
            fontSize: 12,
            userSelect: 'none'
          }}
        >
          {allSeries.map((s) => {
            const hidden = hiddenSeriesLabels.has(s.label)
            return (
              <span
                key={s.label}
                onClick={() => toggleSeries(s.label)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  opacity: hidden ? 0.4 : 1
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: hidden ? '#d9d9d9' : s.color,
                    display: 'inline-block'
                  }}
                />
                <span style={{ color: 'var(--color-text-secondary, #595959)' }}>{s.label}</span>
              </span>
            )
          })}
        </div>
      )}
      <svg ref={svgRef} width="100%" height={height} style={{ overflow: 'visible' }} />
      {!canDraw ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8c8c8c',
            fontSize: 12
          }}
        >
          当前容器尺寸过小，已暂停绘制
        </div>
      ) : null}
    </div>
  )
}

export default LineChart
