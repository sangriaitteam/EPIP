import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../utils/helpers'

/**
 * Table component — responsive with horizontal scroll on mobile.
 *
 * Props:
 *  - columns: [{ key, label, sortable?, render?(value, row) }]
 *  - data: array of row objects
 *  - searchable: show search input
 *  - minWidth: min-width of inner <table> (default '600px') to trigger scroll on small screens
 *  - className
 */
const Table = ({ columns, data, searchable = false, minWidth = '600px', className }) => {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch]   = useState('')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  let filtered = data || []
  if (search && searchable) {
    filtered = filtered.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    )
  }
  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  return (
    <div className={cn('w-full', className)}>
      {searchable && (
        <div className="relative mb-3 sm:mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Scroll wrapper — enables horizontal scroll on mobile */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-dark-600 -mx-0">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-gray-50 dark:bg-dark-700">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-primary-500 select-none'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col flex-shrink-0">
                        <ChevronUp size={10} className={sortKey === col.key && sortDir === 'asc' ? 'text-primary-500' : 'opacity-30'} />
                        <ChevronDown size={10} className={sortKey === col.key && sortDir === 'desc' ? 'text-primary-500' : 'opacity-30'} />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                  No data found
                </td>
              </tr>
            ) : filtered.map((row, i) => (
              <tr
                key={i}
                className="bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                {columns.map(col => (
                  <td key={col.key} className="px-3 sm:px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Showing {filtered.length} of {data?.length ?? 0} records
      </p>
    </div>
  )
}

export default Table
