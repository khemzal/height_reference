import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import './App.css'
import {
  parseProject,
  serializeProject,
  type HeightGuideLine,
  type HeightReferenceProject,
  type OverlayState,
  type ReferenceItem,
} from './project/schema'

// Active drag operation on the board. Only one interaction is tracked at a time.
type DragState =
  | {
      type: 'item'
      itemId: string
      offsetX: number
      offsetY: number
    }
  | {
      type: 'baseline'
      itemId: string
    }
  | {
      type: 'guide-line'
      lineId: string
    }

type BoardState = {
  width: number
  height: number
  baselineY: number
}

type ViewportPanState = {
  pointerId: number
  startClientX: number
  startClientY: number
  startScrollLeft: number
  startScrollTop: number
}

const defaultOverlayState: OverlayState = {
  alwaysOnTop: true,
  clickThrough: false,
  opacity: 0.96,
}

const initialBoardState: BoardState = {
  width: 6000,
  height: 3600,
  baselineY: 980,
}

const boardExpandStep = 1600
const boardExpandThreshold = 320

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

// New guide lines start slightly above the shared floor so they are immediately visible.
const createGuideLine = (boardHeight: number): HeightGuideLine => ({
  id: crypto.randomUUID(),
  name: 'Výšková reference',
  color: '#f59e0b',
  y: clamp(initialBoardState.baselineY - 220, 40, boardHeight - 40),
  width: 0,
})

// Imported images are stored as data URLs so the project can be saved into a single JSON file.
const readFileAsReference = (file: File, index: number): Promise<ReferenceItem> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      const image = new Image()

      image.onload = () => {
        const maxHeight = 540
        const scale = clamp(maxHeight / image.height, 0.18, 1)

        resolve({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ''),
          src,
          width: image.width,
          height: image.height,
          x: 240 + index * 300,
          y: 220,
          scale,
          opacity: 1,
          baselineY: image.height * 0.92,
        })
      }

      image.onerror = () => {
        reject(new Error(`Nepodařilo se načíst obrázek ${file.name}.`))
      }

      image.src = src
    }

    reader.onerror = () => {
      reject(new Error(`Nepodařilo se přečíst soubor ${file.name}.`))
    }

    reader.readAsDataURL(file)
  })

function App() {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const boardShellRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [overlayState, setOverlayState] = useState(defaultOverlayState)
  const [boardState, setBoardState] = useState(initialBoardState)
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [guideLines, setGuideLines] = useState<HeightGuideLine[]>([])
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedGuideLineId, setSelectedGuideLineId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [viewportPanState, setViewportPanState] =
    useState<ViewportPanState | null>(null)
  const [viewportScrollLeft, setViewportScrollLeft] = useState(0)
  const [statusMessage, setStatusMessage] = useState(
    'Importuj první reference a posuň jejich podlahovou linku.'
  )

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  const selectedGuideLine = useMemo(
    () => guideLines.find((line) => line.id === selectedGuideLineId) ?? null,
    [guideLines, selectedGuideLineId]
  )

  // Clicking empty space clears both item and guide line selection.
  const clearSelection = () => {
    setSelectedId(null)
    setSelectedGuideLineId(null)
  }

  // Item and guide line selection are intentionally mutually exclusive to keep the inspector simple.
  const selectItem = (itemId: string) => {
    setSelectedId(itemId)
    setSelectedGuideLineId(null)
  }

  const selectGuideLine = (lineId: string) => {
    setSelectedGuideLineId(lineId)
    setSelectedId(null)
  }

  useEffect(() => {
    // Renderer starts by asking Electron for the real window state so the UI matches the native window.
    const loadWindowState = async () => {
      const api = window.heightReference

      if (!api) {
        return
      }

      const nextState = await api.getWindowState()
      setOverlayState(nextState)
    }

    void loadWindowState()
  }, [])

  useEffect(() => {
    // Global pointer listeners keep dragging active even when the cursor leaves the original element.
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState || !boardRef.current) {
        return
      }

      const boardRect = boardRef.current.getBoundingClientRect()
      const localX = event.clientX - boardRect.left
      const localY = event.clientY - boardRect.top

      if (dragState.type === 'item') {
        setItems((currentItems) =>
          currentItems.map((item) => {
            if (item.id !== dragState.itemId) {
              return item
            }

            const scaledWidth = item.width * item.scale
            const scaledHeight = item.height * item.scale

            return {
              ...item,
              x: clamp(
                localX - dragState.offsetX,
                0,
                boardState.width - scaledWidth
              ),
              y: clamp(
                localY - dragState.offsetY,
                0,
                boardState.height - scaledHeight
              ),
            }
          })
        )

        return
      }

      if (dragState.type === 'guide-line') {
        setGuideLines((currentLines) =>
          currentLines.map((line) =>
            line.id === dragState.lineId
              ? {
                  ...line,
                  y: clamp(localY, 24, boardState.height - 24),
                }
              : line
          )
        )

        return
      }

      setItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== dragState.itemId) {
            return item
          }

          return {
            ...item,
            baselineY: clamp((localY - item.y) / item.scale, 0, item.height),
          }
        })
      )
    }

    const handlePointerUp = () => {
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragState, boardState.height, boardState.width])

  // Window settings are mirrored locally first, then forwarded to Electron through the preload bridge.
  const updateWindowState = async (nextState: Partial<OverlayState>) => {
    const mergedState = { ...overlayState, ...nextState }
    setOverlayState(mergedState)

    const api = window.heightReference

    if (!api) {
      return
    }

    if (typeof nextState.alwaysOnTop === 'boolean') {
      await api.setAlwaysOnTop(nextState.alwaysOnTop)
    }

    if (typeof nextState.clickThrough === 'boolean') {
      await api.setClickThrough(nextState.clickThrough)
    }

    if (typeof nextState.opacity === 'number') {
      await api.setOpacity(nextState.opacity)
    }
  }

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? [])

    if (incomingFiles.length === 0) {
      return
    }

    try {
      const nextItems = await Promise.all(
        incomingFiles.map((file, index) =>
          readFileAsReference(file, items.length + index)
        )
      )

      setItems((currentItems) => [...currentItems, ...nextItems])
      setSelectedId(nextItems.at(-1)?.id ?? null)
      setStatusMessage(`Načetla jsem ${nextItems.length} referencí.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import selhal.'
      setStatusMessage(message)
    } finally {
      event.target.value = ''
    }
  }

  const alignItemToBaseline = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              y: boardState.baselineY - item.baselineY * item.scale,
            }
          : item
      )
    )
  }

  const alignAllItems = () => {
    setItems((currentItems) =>
      currentItems.map((item) => ({
        ...item,
        y: boardState.baselineY - item.baselineY * item.scale,
      }))
    )
    setStatusMessage('Všechny reference jsou zarovnané na společnou podlahu.')
  }

  const updateSelectedItem = (updater: (item: ReferenceItem) => ReferenceItem) => {
    if (!selectedId) {
      return
    }

    setItems((currentItems) =>
      currentItems.map((item) => (item.id === selectedId ? updater(item) : item))
    )
  }

  const removeSelectedItem = () => {
    if (!selectedId) {
      return
    }

    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== selectedId)
    )
    setSelectedId(null)
  }

  const addGuideLine = () => {
    const nextLine = createGuideLine(boardState.height)
    setGuideLines((currentLines) => [...currentLines, nextLine])
    selectGuideLine(nextLine.id)
    setStatusMessage('Přidala jsem novou výškovou referenční linku.')
  }

  const updateSelectedGuideLine = (
    updater: (line: HeightGuideLine) => HeightGuideLine
  ) => {
    if (!selectedGuideLineId) {
      return
    }

    setGuideLines((currentLines) =>
      currentLines.map((line) =>
        line.id === selectedGuideLineId ? updater(line) : line
      )
    )
  }

  const removeSelectedGuideLine = () => {
    if (!selectedGuideLineId) {
      return
    }

    setGuideLines((currentLines) =>
      currentLines.filter((line) => line.id !== selectedGuideLineId)
    )
    setSelectedGuideLineId(null)
  }

  const createProjectPayload = (): HeightReferenceProject => ({
    version: 1,
    savedAt: new Date().toISOString(),
    board: {
      width: boardState.width,
      height: boardState.height,
      baselineY: boardState.baselineY,
    },
    overlayState,
    items,
    guideLines,
  })

  const handleSaveProject = async () => {
    const api = window.heightReference

    if (!api) {
      setStatusMessage('Ukládání projektu je dostupné jen v desktop appce.')
      return
    }

    try {
      const result = await api.saveProject(
        serializeProject(createProjectPayload()),
        projectPath ?? undefined
      )

      if (!result) {
        setStatusMessage('Uložení projektu bylo zrušené.')
        return
      }

      setProjectPath(result.filePath)
      setStatusMessage('Projekt byl úspěšně uložený.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Uložení selhalo.'
      setStatusMessage(message)
    }
  }

  const handleLoadProject = async () => {
    const api = window.heightReference

    if (!api) {
      setStatusMessage('Načítání projektu je dostupné jen v desktop appce.')
      return
    }

    try {
      const result = await api.loadProject()

      if (!result) {
        setStatusMessage('Načtení projektu bylo zrušené.')
        return
      }

      const project = parseProject(result.content)
        setBoardState(project.board)
      setItems(project.items)
        setGuideLines(project.guideLines)
      setOverlayState(project.overlayState)
      setSelectedId(project.items[0]?.id ?? null)
        setSelectedGuideLineId(project.guideLines[0]?.id ?? null)
      setProjectPath(result.filePath)

      await updateWindowState(project.overlayState)

      setStatusMessage(`Načetla jsem projekt se ${project.items.length} referencemi.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Načtení selhalo.'
      setStatusMessage(message)
    }
  }

  const expandWorkspaceIfNeeded = (scrollLeft: number) => {
    const shell = boardShellRef.current

    if (!shell) {
      return
    }

    const needsRight =
      boardState.width - (scrollLeft + shell.clientWidth) < boardExpandThreshold

    if (!needsRight) {
      return
    }

    const addRight = boardExpandStep

    // The board only grows to the right so already positioned references never shift unexpectedly.
    setBoardState((currentBoard) => ({
      ...currentBoard,
      width: currentBoard.width + addRight,
    }))
  }

  const handleBoardPanStart = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 1 || !boardShellRef.current) {
      return
    }

    event.preventDefault()

    const shell = boardShellRef.current
    shell.setPointerCapture(event.pointerId)

    setViewportPanState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: shell.scrollLeft,
      startScrollTop: shell.scrollTop,
    })
  }

  const handleBoardPanMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!viewportPanState || !boardShellRef.current) {
      return
    }

    if (event.pointerId !== viewportPanState.pointerId) {
      return
    }

    const shell = boardShellRef.current
    const nextScrollLeft =
      viewportPanState.startScrollLeft -
      (event.clientX - viewportPanState.startClientX)
    const nextScrollTop =
      viewportPanState.startScrollTop -
      (event.clientY - viewportPanState.startClientY)

    // Panning is implemented by scrolling the viewport rather than moving the board content itself.
    shell.scrollLeft = nextScrollLeft
    shell.scrollTop = nextScrollTop
    setViewportScrollLeft(shell.scrollLeft)

    expandWorkspaceIfNeeded(shell.scrollLeft)
  }

  const handleBoardPanEnd = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!viewportPanState || !boardShellRef.current) {
      return
    }

    if (event.pointerId !== viewportPanState.pointerId) {
      return
    }

    if (boardShellRef.current.hasPointerCapture(event.pointerId)) {
      boardShellRef.current.releasePointerCapture(event.pointerId)
    }

    setViewportPanState(null)
  }

  const handleBoardShellScroll = () => {
    const shell = boardShellRef.current

    if (!shell) {
      return
    }

    setViewportScrollLeft(shell.scrollLeft)
    expandWorkspaceIfNeeded(shell.scrollLeft)
  }

  return (
    <main className={sidebarVisible ? 'app-shell' : 'app-shell app-shell-sidebar-hidden'}>
      <aside className={sidebarVisible ? 'sidebar' : 'sidebar sidebar-hidden'}>
        <div className="sidebar-topbar">
          <span className="eyebrow">Menu</span>
          <button
            type="button"
            className="secondary icon-button"
            onClick={() => setSidebarVisible(false)}
          >
            Schovat
          </button>
        </div>

        <div className="panel hero-panel">
          <span className="eyebrow">Height reference</span>
          <h1>První overlay prototyp</h1>
          <p>
            Importuj reference, nastav jejich podlahovou linku a pak je srovnej na
            jednu společnou baseline.
          </p>
          <div className="hero-actions">
            <button onClick={() => fileInputRef.current?.click()}>Přidat obrázky</button>
            <button className="secondary" onClick={alignAllItems} disabled={!items.length}>
              Zarovnat vše
            </button>
            <button className="secondary" onClick={() => void handleSaveProject()}>
              Uložit projekt
            </button>
            <button className="secondary" onClick={() => void handleLoadProject()}>
              Načíst projekt
            </button>
          </div>
          <p className="hint">
            {projectPath ? `Aktuální projekt: ${projectPath}` : 'Projekt zatím není uložený.'}
          </p>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFilesSelected}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Overlay okno</h2>
            <span className="pill">Ctrl+Shift+Space</span>
          </div>

          <label className="toggle-row">
            <span>Vždy nahoře</span>
            <input
              type="checkbox"
              checked={overlayState.alwaysOnTop}
              onChange={(event) => {
                void updateWindowState({ alwaysOnTop: event.target.checked })
              }}
            />
          </label>

          <label className="toggle-row">
            <span>Click-through režim</span>
            <input
              type="checkbox"
              checked={overlayState.clickThrough}
              onChange={(event) => {
                void updateWindowState({ clickThrough: event.target.checked })
              }}
            />
          </label>

          <label className="slider-row">
            <span>Průhlednost okna</span>
            <input
              type="range"
              min="0.35"
              max="1"
              step="0.01"
              value={overlayState.opacity}
              onChange={(event) => {
                void updateWindowState({ opacity: Number(event.target.value) })
              }}
            />
            <strong>{Math.round(overlayState.opacity * 100)} %</strong>
          </label>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Vybraná reference</h2>
            {selectedItem ? <span className="pill active">aktivní</span> : null}
          </div>

          {selectedItem ? (
            <div className="inspector">
              <h3>{selectedItem.name}</h3>

              <label className="slider-row">
                <span>Měřítko</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.6"
                  step="0.01"
                  value={selectedItem.scale}
                  onChange={(event) => {
                    updateSelectedItem((item) => ({
                      ...item,
                      scale: Number(event.target.value),
                    }))
                  }}
                />
                <strong>{selectedItem.scale.toFixed(2)}×</strong>
              </label>

              <label className="slider-row">
                <span>Opacity obrázku</span>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.01"
                  value={selectedItem.opacity}
                  onChange={(event) => {
                    updateSelectedItem((item) => ({
                      ...item,
                      opacity: Number(event.target.value),
                    }))
                  }}
                />
                <strong>{Math.round(selectedItem.opacity * 100)} %</strong>
              </label>

              <div className="button-row">
                <button className="secondary" onClick={() => alignItemToBaseline(selectedItem.id)}>
                  Zarovnat vybranou
                </button>
                <button className="danger" onClick={removeSelectedItem}>
                  Odebrat
                </button>
              </div>

              <p className="hint">
                Podlahovou linku posouváš přímo v náhledu tažením modré čáry.
              </p>
            </div>
          ) : (
            <p className="empty-copy">
              Zatím nic není vybrané. Klikni na referenci v ploše nebo v seznamu.
            </p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Výškové linky</h2>
            <span className="pill">{guideLines.length}</span>
          </div>

          <div className="button-row">
            <button className="secondary" onClick={addGuideLine}>
              Přidat linku
            </button>
          </div>

          {selectedGuideLine ? (
            <div className="inspector">
              <label className="field-group">
                <span>Název linky</span>
                <input
                  type="text"
                  value={selectedGuideLine.name}
                  onChange={(event) => {
                    updateSelectedGuideLine((line) => ({
                      ...line,
                      name: event.target.value,
                    }))
                  }}
                />
              </label>

              <label className="field-group">
                <span>Barva</span>
                <input
                  className="color-input"
                  type="color"
                  value={selectedGuideLine.color}
                  onChange={(event) => {
                    updateSelectedGuideLine((line) => ({
                      ...line,
                      color: event.target.value,
                    }))
                  }}
                />
              </label>

              <label className="slider-row">
                <span>Výška linky</span>
                <input
                  type="range"
                  min="24"
                  max={String(boardState.height - 24)}
                  step="1"
                  value={selectedGuideLine.y}
                  onChange={(event) => {
                    updateSelectedGuideLine((line) => ({
                      ...line,
                      y: Number(event.target.value),
                    }))
                  }}
                />
                <strong>{Math.round(selectedGuideLine.y)} px</strong>
              </label>

              <div className="button-row">
                <button className="danger" onClick={removeSelectedGuideLine}>
                  Odebrat linku
                </button>
              </div>

              <p className="hint">
                Linku můžeš také chytit přímo v ploše a táhnout nahoru nebo dolů.
              </p>
            </div>
          ) : (
            <p className="empty-copy">
              Přidej vlastní výškovou linku, pojmenuj ji a vyber jí barvu.
            </p>
          )}

          {guideLines.length ? (
            <ul className="reference-list compact-list">
              {guideLines.map((line) => (
                <li key={line.id}>
                  <button
                    className={
                      selectedGuideLineId === line.id
                        ? 'reference-chip active-chip'
                        : 'reference-chip'
                    }
                    onClick={() => selectGuideLine(line.id)}
                  >
                    <span className="line-chip-label">
                      <span
                        className="color-dot"
                        style={{ backgroundColor: line.color }}
                      />
                      {line.name}
                    </span>
                    <small>{Math.round(line.y)} px</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="panel list-panel">
          <div className="panel-header">
            <h2>Reference</h2>
            <span className="pill">{items.length}</span>
          </div>

          {items.length ? (
            <ul className="reference-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    className={selectedId === item.id ? 'reference-chip active-chip' : 'reference-chip'}
                    onClick={() => selectItem(item.id)}
                  >
                    <span>{item.name}</span>
                    <small>{Math.round(item.height * item.scale)} px</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">Sem se po importu vypíše seznam postav.</p>
          )}
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <h2>Pracovní plocha</h2>
            <p>{statusMessage}</p>
          </div>
          <div className="workspace-badges">
            {!sidebarVisible ? (
              <button
                type="button"
                className="secondary"
                onClick={() => setSidebarVisible(true)}
              >
                Ukázat menu
              </button>
            ) : null}
            <span className="pill active">MVP</span>
            <span className="pill">Baseline preview</span>
          </div>
        </header>

        <div
          ref={boardShellRef}
          className={viewportPanState ? 'board-shell board-shell-panning' : 'board-shell'}
          onPointerDown={handleBoardPanStart}
          onPointerMove={handleBoardPanMove}
          onPointerUp={handleBoardPanEnd}
          onPointerCancel={handleBoardPanEnd}
          onScroll={handleBoardShellScroll}
          onAuxClick={(event) => {
            if (event.button === 1) {
              event.preventDefault()
            }
          }}
        >
          <div
            ref={boardRef}
            className="board"
            style={{ width: boardState.width, height: boardState.height }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return
              }

              clearSelection()
            }}
          >
            <div className="grid" />
            <div className="global-baseline" style={{ top: boardState.baselineY }}>
              <span style={{ left: Math.max(18, viewportScrollLeft) }}>
                Společná podlaha
              </span>
            </div>

            {guideLines.map((line) => (
              <button
                key={line.id}
                type="button"
                className={
                  selectedGuideLineId === line.id
                    ? 'custom-guide-line selected-guide-line'
                    : 'custom-guide-line'
                }
                style={{
                  top: line.y,
                  '--guide-color': line.color,
                } as CSSProperties}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return
                  }

                  event.stopPropagation()
                  selectGuideLine(line.id)
                  setDragState({ type: 'guide-line', lineId: line.id })
                }}
              >
                {/* The label stays at the line start until it would leave the viewport, then it pins left. */}
                <span style={{ left: Math.max(18, viewportScrollLeft) }}>
                  {line.name}
                </span>
              </button>
            ))}

            {items.map((item) => {
              const scaledWidth = item.width * item.scale
              const scaledHeight = item.height * item.scale

              return (
                <article
                  key={item.id}
                  className={selectedId === item.id ? 'reference-card selected' : 'reference-card'}
                  style={{
                    width: scaledWidth,
                    height: scaledHeight,
                    transform: `translate(${item.x}px, ${item.y}px)`,
                    opacity: item.opacity,
                  }}
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return
                    }

                    if (
                      event.target instanceof HTMLElement &&
                      event.target.dataset.role === 'baseline-handle'
                    ) {
                      return
                    }

                    event.stopPropagation()
                    selectItem(item.id)
                    setDragState({
                      type: 'item',
                      itemId: item.id,
                      offsetX:
                        event.clientX - event.currentTarget.getBoundingClientRect().left,
                      offsetY:
                        event.clientY - event.currentTarget.getBoundingClientRect().top,
                    })
                  }}
                >
                  <img src={item.src} alt={item.name} draggable={false} />
                  {/* The per-image baseline is only shown for the selected reference to reduce visual noise. */}
                  {selectedId === item.id ? (
                    <button
                      type="button"
                      className="baseline-handle"
                      data-role="baseline-handle"
                      style={{ top: item.baselineY * item.scale }}
                      onPointerDown={(event) => {
                        if (event.button !== 0) {
                          return
                        }

                        event.stopPropagation()
                        selectItem(item.id)
                        setDragState({ type: 'baseline', itemId: item.id })
                      }}
                    >
                      <span>{item.name}</span>
                    </button>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>

        <footer className="workspace-footer">
          <p>
            Tip: click-through režim vypneš globálně zkratkou <strong>Ctrl+Shift+Space</strong>,
            i když je okno zrovna neklikatelné. Pracovní plochu posouváš podržením
            kolečka myši.
          </p>
        </footer>
      </section>
    </main>
  )
}

export default App
