import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ChartInteractionEvent } from '../../types/chartEvents'
import { buildChartEvent } from '../../utils/chartEventProtocol'
import useChartContainerSize from '../../hooks/useChartContainerSize'
import { getChartTheme } from '../../utils/chartTheme'
import { useThemeMode } from '../../hooks/useThemeMode'
import {
  distributeLabelYPositions,
  estimateLabelTextWidth,
  resolveLeaderLineLayout
} from '../../utils/chartLabelLayout'

interface RoseChartProps {
  data: Record<string, unknown>[]
  labelField: string
  valueField: string
  chartId?: string
  activeValue?: string | number | boolean | null
  onDataPointClick?: (event: ChartInteractionEvent) => void
  labelTranslator?: (raw: string) => string
  width?: number | string
  height?: number
}

const identity = (v: string): string => v

const RoseChart: React.FC<RoseChartProps> = ({
  data,
  labelField,
  valueField,
  chartId = 'rose-chart',
  activeValue = null,
  onDataPointClick,
  labelTranslator = identity,
  width = '100%',
  height = 300
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { containerRef, containerSize } = useChartContainerSize()
  const [hiddenLabels, setHiddenLabels] = useState<string[]>([])
  const hiddenLabelSet = useMemo(() => new Set(hiddenLabels), [hiddenLabels])
  const numericWidth = typeof width === 'number' ? width : Number.NaN
  const currentWidth = Number.isFinite(numericWidth)
    ? numericWidth
    : width === '100%'
      ? containerSize.width
      : containerSize.width
  const minDrawWidth = 320
  const minDrawHeight = 220
  const canDraw = currentWidth >= minDrawWidth && height >= minDrawHeight

  const legendWidth = Math.min(Math.max(currentWidth * 0.3, 120), 200)
  const svgWidth = currentWidth - legendWidth

  const { theme } = useThemeMode()
  const chartTheme = useMemo(() => getChartTheme(theme), [theme])

  const labels = useMemo(
    () => data.map((item) => String(item[labelField] ?? '')),
    [data, labelField]
  )
  const color = useMemo(
    () => d3.scaleOrdinal<string, string>().domain(labels).range(chartTheme.palette),
    [labels, chartTheme]
  )

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    d3.select(containerRef.current).selectAll<HTMLDivElement, null>('.chart-tooltip').remove()
    if (!canDraw || svgWidth < 200) return

    const labelMargin = 90
    const maxRadius = Math.min(svgWidth - labelMargin * 2, height - 40) / 2
    if (maxRadius < 30) return
    const innerRadius = 20

    const pieCenterX = svgWidth / 2
    const pieCenterY = height / 2
    const g = svg.append('g').attr('transform', `translate(${pieCenterX},${pieCenterY})`)

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

    const visibleData = data.filter((item) => !hiddenLabelSet.has(String(item[labelField] ?? '')))

    const totalValue = d3.sum(visibleData, (d) => Number(d[valueField]) || 0)
    const maxValue = d3.max(visibleData, (d) => Number(d[valueField]) || 0) || 1

    const radiusScale = d3.scaleSqrt().domain([0, maxValue]).range([innerRadius, maxRadius])

    const pie = d3
      .pie<Record<string, unknown>>()
      .value(1)
      .sort((a, b) => (Number(b[valueField]) || 0) - (Number(a[valueField]) || 0))

    const arcPath = d3
      .arc<d3.PieArcDatum<Record<string, unknown>>>()
      .outerRadius((d) => radiusScale(Number(d.data[valueField]) || 0))
      .innerRadius(innerRadius)
      .padAngle(0.02)
      .cornerRadius(4)

    const labelArc = d3
      .arc<d3.PieArcDatum<Record<string, unknown>>>()
      .outerRadius(maxRadius + 18)
      .innerRadius(maxRadius + 18)

    const pieData = pie(visibleData)
    const arcs = g.selectAll('.arc').data(pieData).enter().append('g').attr('class', 'arc')

    arcs
      .append('path')
      .attr('d', arcPath)
      .attr('fill', (d) => {
        if (activeValue !== null && String(d.data[labelField]) === String(activeValue)) {
          return chartTheme.activeHighlight
        }
        return color(String(d.data[labelField] ?? ''))
      })
      .attr('stroke', 'var(--color-surface)')
      .style('stroke-width', '1px')
      .style('cursor', onDataPointClick ? 'pointer' : 'default')
      .on('mousemove', (event, datum) => {
        const pointer = d3.pointer(event, containerRef.current)
        const rawLabel = String(datum.data[labelField] ?? '--')
        const displayLabel = labelTranslator(rawLabel)
        const value = Number(datum.data[valueField] ?? 0)
        const ratio = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
        tooltip
          .style('opacity', '1')
          .style('left', `${pointer[0] + 12}px`)
          .style('top', `${pointer[1] + 12}px`)
          .html(`${displayLabel}<br/>数量: ${value} (${ratio}%)`)
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0')
      })
      .on('click', (_, datum) => {
        if (!onDataPointClick) return
        const clickedValue = datum.data[labelField]
        if (clickedValue === undefined || clickedValue === null) return
        onDataPointClick(
          buildChartEvent({
            sourceChart: chartId,
            trigger: 'click',
            action:
              activeValue !== null && String(activeValue) === String(clickedValue)
                ? 'clear'
                : 'select',
            dimension: labelField,
            value: clickedValue as string | number | boolean,
            label: String(clickedValue),
            rawData: datum.data
          })
        )
      })

    const halfW = svgWidth / 2
    const halfH = height / 2
    const safeMargin = 24

    const positionedLabels = pieData
      .map((item) => {
        const rawLabel = String(item.data[labelField] ?? '')
        const value = Number(item.data[valueField] ?? 0)
        const ratio = totalValue > 0 ? value / totalValue : 0
        const minimumRatio = visibleData.length > 12 ? 0.04 : 0.025
        if (ratio < minimumRatio) return null

        const [cx, cy] = labelArc.centroid(item)
        const source = arcPath.centroid(item)
        const middle: [number, number] = [cx, cy]
        const isRight = cx >= 0
        const displayLabel = labelTranslator(rawLabel)
        let text = `${displayLabel} ${(ratio * 100).toFixed(1)}%`
        if (text.length > 12) {
          text = text.substring(0, 9) + '...'
        }

        const textWidth = estimateLabelTextWidth(text)
        const xOffset = isRight ? 18 : -18
        let textX = cx + xOffset
        const y = Math.max(-halfH + safeMargin + 6, Math.min(halfH - safeMargin - 6, cy))

        if (isRight) {
          textX = Math.min(textX, halfW - safeMargin - textWidth)
        } else {
          textX = Math.max(textX, -halfW + safeMargin + textWidth)
        }

        const lineLayout = resolveLeaderLineLayout({
          anchor: isRight ? 'start' : 'end',
          textX,
          text,
          textWidth,
          middleX: middle[0],
          y
        })
        if ((isRight && lineLayout.lineEndX <= 0) || (!isRight && lineLayout.lineEndX >= 0)) {
          return null
        }

        return {
          item,
          rawLabel,
          text,
          textWidth,
          textX,
          y,
          source: source as [number, number],
          middle,
          anchor: isRight ? ('start' as const) : ('end' as const)
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const maxLabelCount = Math.max(4, Math.floor((height - 24) / 18))
    const sampledLabels =
      positionedLabels.length <= maxLabelCount
        ? positionedLabels
        : [...positionedLabels].slice(0, maxLabelCount)

    const applyLabelOverlapFix = (entries: typeof positionedLabels): typeof positionedLabels => {
      const minGap = 15
      const bySide = (side: 'start' | 'end'): Array<(typeof positionedLabels)[number]> =>
        entries
          .filter((entry) => entry.anchor === side)
          .sort((a, b) => a.y - b.y)
          .map((entry) => ({ ...entry }))
      const right = bySide('start')
      const left = bySide('end')
      ;[right, left].forEach((group) => {
        const distributedY = distributeLabelYPositions(
          group.map((entry) => entry.y),
          {
            minY: -halfH + safeMargin + 6,
            maxY: halfH - safeMargin - 6,
            minGap
          }
        )

        group.forEach((entry, index) => {
          entry.y = distributedY[index] ?? entry.y
        })
      })
      return [...right, ...left]
    }

    const adjustedLabels = applyLabelOverlapFix(sampledLabels)

    g.selectAll('.label-line')
      .data(adjustedLabels)
      .enter()
      .append('polyline')
      .attr('class', 'label-line')
      .attr('points', (entry) => {
        const lineLayout = resolveLeaderLineLayout({
          anchor: entry.anchor,
          textX: entry.textX,
          text: entry.text,
          textWidth: entry.textWidth,
          middleX: entry.middle[0],
          y: entry.y
        })

        return [entry.source, entry.middle, ...lineLayout.points]
          .map((point) => `${point[0]},${point[1]}`)
          .join(' ')
      })
      .attr('stroke', chartTheme.gridStroke)
      .attr('stroke-width', 1)
      .attr('fill', 'none')

    g.selectAll('.label-text')
      .data(adjustedLabels)
      .enter()
      .append('text')
      .attr('class', 'label-text')
      .attr('x', (entry) => entry.textX)
      .attr('y', (entry) => entry.y)
      .attr('dy', '0.32em')
      .text((entry) => entry.text)
      .style('text-anchor', (entry) => entry.anchor)
      .style('font-size', '11px')
      .style('paint-order', 'stroke')
      .style('stroke', 'var(--color-surface)')
      .style('stroke-width', '2px')
      .style('stroke-linejoin', 'round')
      .style('fill', chartTheme.labelFill)

    return () => {
      tooltip.style('opacity', '0')
    }
  }, [
    activeValue,
    canDraw,
    chartId,
    color,
    containerRef,
    currentWidth,
    data,
    height,
    hiddenLabelSet,
    labelField,
    labelTranslator,
    onDataPointClick,
    svgWidth,
    valueField
  ])

  const toggleLegend = (labelValue: string): void => {
    setHiddenLabels((previous) => {
      const hidden = new Set(previous)
      if (hidden.has(labelValue)) {
        hidden.delete(labelValue)
      } else {
        hidden.add(labelValue)
      }
      return Array.from(hidden)
    })
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {canDraw ? (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <div style={{ flex: 1, minWidth: 0, overflow: 'visible', position: 'relative' }}>
            <svg
              ref={svgRef}
              width={svgWidth}
              height={height}
              style={{ overflow: 'visible', display: 'block' }}
            />
          </div>
          <div
            style={{
              width: legendWidth,
              flexShrink: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: 12,
              paddingLeft: 8,
              paddingRight: 4
            }}
          >
            {data.map((datum) => {
              const rawLabel = String(datum[labelField] ?? '')
              const hidden = hiddenLabelSet.has(rawLabel)
              const displayLabel = labelTranslator(rawLabel)
              let displayText = hidden ? `${displayLabel}（已隐藏）` : displayLabel
              const isTruncated = displayText.length > 12
              if (isTruncated) {
                displayText = displayText.substring(0, 10) + '...'
              }
              return (
                <div
                  key={rawLabel}
                  onClick={() => toggleLegend(rawLabel)}
                  title={hidden ? `${displayLabel}（已隐藏）` : displayLabel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '2px 0',
                    fontSize: 12,
                    color: chartTheme.labelFill,
                    lineHeight: '18px',
                    userSelect: 'none'
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: hidden ? '#d9d9d9' : color(rawLabel)
                    }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {displayText}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <svg ref={svgRef} width="100%" height={height} />
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
        </>
      )}
    </div>
  )
}

export default RoseChart
