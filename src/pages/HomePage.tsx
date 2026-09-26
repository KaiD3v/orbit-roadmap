import { useEffect, useState } from 'react'
import { Achievements } from '../components/Achievements'
import { Hero } from '../components/Hero'
import { Journey } from '../components/Journey'
import { NextStep } from '../components/NextStep'
import type { Filter } from '../domain/filter'
import type { PageProps } from './types'

export function HomePage({ notify, openArea, openShare }: PageProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  // Ir para uma fase pela sidebar limpa busca e filtro, senão a fase pode estar escondida pelo filtro.
  useEffect(() => {
    function onHash() {
      if (!location.hash.startsWith('#fase-')) return
      setSearch('')
      setFilter('all')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <>
      <Hero />
      <NextStep notify={notify} open={openArea} />
      <Journey
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilter={setFilter}
        open={openArea}
        openShare={openShare}
      />
      <Achievements openShare={openShare} />
    </>
  )
}
