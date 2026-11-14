import { geoDistance } from 'd3-geo'
import countries from './destination-geography.json'
import type { Advisory } from './types'

// Country centers and land borders from mledoze/countries (ODbL 1.0).
const geography = new Map(countries.map(country => [country.cca3, country]))

export function relatedDestinations(destination: Advisory, advisories: Advisory[]) {
  const origin = destination.iso3 ? geography.get(destination.iso3) : undefined
  if (!origin) return []

  const [latitude, longitude] = origin.latlng
  return advisories.flatMap(advisory => {
    const country = advisory.iso3 ? geography.get(advisory.iso3) : undefined
    if (!country || country === origin) return []

    const [candidateLatitude, candidateLongitude] = country.latlng
    return [{
      advisory,
      sharesBorder: origin.borders.includes(country.cca3) || country.borders.includes(origin.cca3),
      distance: geoDistance([longitude, latitude], [candidateLongitude, candidateLatitude]),
    }]
  }).sort((a, b) => Number(b.sharesBorder) - Number(a.sharesBorder) ||
    a.distance - b.distance || a.advisory.name.localeCompare(b.advisory.name, 'en'))
    .slice(0, 3)
    .map(({ advisory }) => advisory)
}
