import dayjs from 'dayjs'
import 'dayjs/locale/es'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(localizedFormat)
dayjs.extend(advancedFormat)
dayjs.locale('es')

/**
 * Formatea un monto numérico en Soles Peruanos: "S/. 150.00"
 */
export function formatCurrency(amount) {
  const num = Number(amount)
  return `S/. ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Formatea una fecha ISO "2025-06-15" en texto largo: "domingo, 15 de junio de 2025"
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  // dayjs("2025-06-15") puede parsear mal en algunos locales por el offset de timezone
  // Construimos con partes para evitar problemas de UTC
  const [y, m, d] = dateStr.split('-').map(Number)
  return dayjs(new Date(y, m - 1, d)).format('dddd, D [de] MMMM [de] YYYY')
}

/**
 * Formatea una fecha ISO en texto corto: "15 jun. 2025"
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return dayjs(new Date(y, m - 1, d)).format('D MMM YYYY')
}
