// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it } from 'vitest'
import { App } from './App'
import snapshot from './snapshot.json'
import type { Snapshot } from './types'

afterEach(cleanup)

it('honors shareable destination filters and opens the matching advisory', async () => {
  render(<MemoryRouter initialEntries={['/destinations?q=Japan&region=Asia']}><App initial={snapshot as Snapshot} live={false}/></MemoryRouter>)
  expect(screen.getByRole('searchbox', { name: 'Search destinations' }).getAttribute('value')).toBe('Japan')
  expect(screen.getByText('1 destination')).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: /japan/i }))
  expect(await screen.findByRole('heading', { name: 'Japan' })).toBeTruthy()
  expect(screen.getByText(/are not guarantees of personal safety/)).toBeTruthy()
})

