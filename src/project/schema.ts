export type OverlayState = {
  alwaysOnTop: boolean
  clickThrough: boolean
  opacity: number
}

export type ReferenceItem = {
  id: string
  name: string
  src: string
  width: number
  height: number
  x: number
  y: number
  scale: number
  opacity: number
  baselineY: number
}

export type HeightGuideLine = {
  id: string
  name: string
  color: string
  y: number
  width: number
}

export type HeightReferenceProject = {
  version: 1
  savedAt: string
  board: {
    width: number
    height: number
    baselineY: number
  }
  overlayState: OverlayState
  items: ReferenceItem[]
  guideLines: HeightGuideLine[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isReferenceItem = (value: unknown): value is ReferenceItem => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.src === 'string' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.scale === 'number' &&
    typeof value.opacity === 'number' &&
    typeof value.baselineY === 'number'
  )
}

const isHeightGuideLine = (value: unknown): value is HeightGuideLine => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number'
  )
}

export const isHeightReferenceProject = (
  value: unknown
): value is HeightReferenceProject => {
  if (!isRecord(value) || value.version !== 1) {
    return false
  }

  if (!isRecord(value.board) || !isRecord(value.overlayState)) {
    return false
  }

  return (
    typeof value.savedAt === 'string' &&
    typeof value.board.width === 'number' &&
    typeof value.board.height === 'number' &&
    typeof value.board.baselineY === 'number' &&
    typeof value.overlayState.alwaysOnTop === 'boolean' &&
    typeof value.overlayState.clickThrough === 'boolean' &&
    typeof value.overlayState.opacity === 'number' &&
    Array.isArray(value.items) &&
    value.items.every(isReferenceItem) &&
    Array.isArray(value.guideLines) &&
    value.guideLines.every(isHeightGuideLine)
  )
}

export const serializeProject = (project: HeightReferenceProject) =>
  JSON.stringify(project, null, 2)

export const parseProject = (raw: string): HeightReferenceProject => {
  const parsed: unknown = JSON.parse(raw)

  if (
    isRecord(parsed) &&
    parsed.version === 1 &&
    !('guideLines' in parsed)
  ) {
    parsed.guideLines = []
  }

  if (isRecord(parsed) && Array.isArray(parsed.guideLines)) {
    parsed.guideLines = parsed.guideLines.map((line) => {
      if (isRecord(line) && !('width' in line)) {
        return {
          ...line,
          width: 1600,
        }
      }

      return line
    })
  }

  if (!isHeightReferenceProject(parsed)) {
    throw new Error('Soubor projektu nemá podporovaný formát.')
  }

  return parsed
}
