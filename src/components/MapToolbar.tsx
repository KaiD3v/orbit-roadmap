import { FILTERS, type Filter } from '../domain/filter'

export function MapToolbar({ search, onSearch, filter, onFilter, matches }: {
  search: string
  onSearch: (value: string) => void
  filter: Filter
  onFilter: (value: Filter) => void
  matches: number
}) {
  return (
    <>
      <div className="toolbar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar área ou tópico"
            aria-label="Encontrar área ou tópico no mapa"
            value={search}
            onChange={event => onSearch(event.target.value)}
          />
        </label>
        <div className="filter-group" role="group" aria-label="Filtrar áreas">
          {FILTERS.map(({ value, label }) => (
            <button
              type="button"
              className={`filter ${filter === value ? 'active' : ''}`}
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="map-legend">
        <span><i className="legend-dot" /> Próximo passo</span>
        <span><i className="legend-dot finished" /> Área concluída</span>
        <span><i className="legend-dot extension" /> Só extras</span>
        <span>{matches} {matches === 1 ? 'área' : 'áreas'}</span>
      </p>
    </>
  )
}
