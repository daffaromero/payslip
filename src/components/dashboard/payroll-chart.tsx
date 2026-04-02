'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export interface ChartPoint { month: string; total: number }

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(key: string) {
  const [, m] = key.split('-')
  return ID_MONTHS[parseInt(m, 10) - 1]
}

export function PayrollChart({ data }: { data: ChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 600
  const H = 180
  const pt = 28, pr = 8, pb = 36, pl = 8
  const cw = W - pl - pr
  const ch = H - pt - pb

  const max = Math.max(...data.map(d => d.total), 1)
  const barSlot = cw / data.length
  const barW = Math.max(barSlot * 0.55, 4)
  const gap = (barSlot - barW) / 2

  const gridLines = 4
  const hasData = data.some(d => d.total > 0)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Grafik payroll bulanan"
      >
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = pt + (ch / gridLines) * i
          return (
            <line
              key={i}
              x1={pl} y1={y} x2={W - pr} y2={y}
              stroke="var(--border)"
              strokeWidth={0.75}
              strokeDasharray={i === gridLines ? 'none' : '3 3'}
            />
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = hasData ? Math.max((d.total / max) * ch, d.total > 0 ? 3 : 0) : 0
          const x = pl + i * barSlot + gap
          const y = pt + ch - barH
          const isHovered = hovered === i
          const isEmpty = d.total === 0

          return (
            <g key={d.month}>
              {/* Hover hit area */}
              <rect
                x={pl + i * barSlot}
                y={pt}
                width={barSlot}
                height={ch}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: isEmpty ? 'default' : 'pointer' }}
              />

              {/* Bar */}
              {!isEmpty && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={isHovered ? 'var(--accent)' : '#93c5fd'}
                  style={{ transition: 'fill 0.1s' }}
                />
              )}

              {/* Value label above bar on hover */}
              {isHovered && !isEmpty && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--accent)"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {formatCurrency(d.total)}
                </text>
              )}

              {/* Month label */}
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill={isHovered ? 'var(--text-primary)' : 'var(--text-tertiary)'}
                fontWeight={isHovered ? 600 : 400}
                style={{ fontFamily: 'var(--font-sans)', transition: 'fill 0.1s' }}
              >
                {monthLabel(d.month)}
              </text>
            </g>
          )
        })}

        {/* Empty state overlay */}
        {!hasData && (
          <text
            x={W / 2}
            y={pt + ch / 2 + 4}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-tertiary)"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Belum ada data payroll
          </text>
        )}
      </svg>
    </div>
  )
}
