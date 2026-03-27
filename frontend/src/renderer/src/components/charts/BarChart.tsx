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

interface BarChartProps {
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

const BarChart: React.FC<BarChartProps> = ({
  data,
  xField,
  yField,
  chartId = 'bar-chart',
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
    
    const defs = svg.append('defs')
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

    const x = d3.scaleBand().domain(xDomain).range([0, innerWidth]).padding(0.1)

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

    const maxTicks = Math.max(1, Math.floor(innerWidth / 72))
    const tickStep = Math.max(1, Math.ceil(xDomain.length / maxTicks))
    const tickValues = xDomain.filter(
      (_, index) => index % tickStep === 0 || index === xDomain.length - 1
    )

    const xAxis = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(tickValues))
    xAxis
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
      const seriesCount = visibleSeries.length
      const bandwidth = x.bandwidth()
      const subBarWidth = seriesCount > 0 ? bandwidth / seriesCount : bandwidth

      visibleSeries.forEach((series, seriesIdx) => {
        const gradientId = `bar-grad-${chartId}-${seriesIdx}`
        const gradient = defs.append('linearGradient')
          .attr('id', gradientId)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '0%')
          .attr('y2', '100%')
        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', series.color)
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', series.color)
          .attr('stop-opacity', 0.6)

        const dataMap = new Map(series.data.map((d) => [String(d[xField]), d]))

        g.selectAll(`.bar-s${seriesIdx}`)
          .data(xDomain.filter((k) => dataMap.has(k)))
          .enter()
          .append('rect')
          .attr('class', `bar-s${seriesIdx}`)
          .attr('x', (k) => x(k)! + seriesIdx * subBarWidth)
          .attr('y', (k) => y(Number(dataMap.get(k)![yField] ?? 0)))
          .attr('width', Math.max(subBarWidth - 1, 1))
          .attr('height', (k) =>
            Math.max(innerHeight - y(Number(dataMap.get(k)![yField] ?? 0)) - 1, 0)
          )
          .attr('fill', `url(#${gradientId})`)
          .attr('rx', 2)
          .attr('ry', 2)
          .style('cursor', 'default')
          .on('mousemove', (event, k) => {
            const pointer = d3.pointer(event, containerRef.current)
            const displayLabel = labelTranslator(k)
            let html = `<strong>${displayLabel}</strong>`
            for (const s of visibleSeries) {
              const row = s.data.find((d) => String(d[xField]) === k)
              const val = row ? Number(row[yField] ?? 0) : 0
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
      
      const gradientId = `bar-grad-${chartId}-single`
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%')
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', chartTheme.palette[0])
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', chartTheme.palette[0])
        .attr('stop-opacity', 0.6)

      g.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(String(d[xField]))!)
        .attr('y', (d) => (singleVisible ? y(Number(d[yField])) : y(0)))
        .attr('width', x.bandwidth())
        .attr('height', (d) =>
          singleVisible ? Math.max(innerHeight - y(Number(d[yField])) - 1, 0) : 0
        )
        .attr('fill', (d) =>
          activeValue !== null && String(d[xField]) === String(activeValue) ? chartTheme.activeHighlight : `url(#${gradientId})`
        )
        .attr('rx', 2)
        .attr('ry', 2)
        .style('cursor', onDataPointClick ? 'pointer' : 'default')
        .style('opacity', singleVisible ? '1' : '0')
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
    }

    return () => {
      tooltip.style('opacity', '0')
    }
  }, [
    activeValue,
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

export default BarChart
