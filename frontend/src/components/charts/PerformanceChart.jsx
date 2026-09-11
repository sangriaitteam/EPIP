import React from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PolarRadiusAxis
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-dark-700 border border-gray-100 dark:border-dark-600 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export const PerformanceLineChart = ({ data }) => {
  const { isDark } = useTheme()
  const gridColor = isDark ? '#334155' : '#f1f5f9'
  const textColor = isDark ? '#94a3b8' : '#6b7280'

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[50, 100]} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad)" name="Score" dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="target" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" name="Target" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const AttendanceBarChart = ({ data }) => {
  const { isDark } = useTheme()
  const gridColor = isDark ? '#334155' : '#f1f5f9'
  const textColor = isDark ? '#94a3b8' : '#6b7280'

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={16}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="week" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="present" fill="#22c55e" radius={[4, 4, 0, 0]} name="Present" />
        <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
        <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Absent" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const PerformanceRadarChart = ({ data }) => {
  const { isDark } = useTheme()
  const textColor = isDark ? '#94a3b8' : '#6b7280'

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} />
        <PolarAngleAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: textColor, fontSize: 10 }} />
        <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export const DepartmentBarChart = ({ data }) => {
  const { isDark } = useTheme()
  const gridColor = isDark ? '#334155' : '#f1f5f9'
  const textColor = isDark ? '#94a3b8' : '#6b7280'

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg Score" />
      </BarChart>
    </ResponsiveContainer>
  )
}
