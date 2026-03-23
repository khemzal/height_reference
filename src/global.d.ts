interface HeightReferenceApi {
  getWindowState: () => Promise<{
    alwaysOnTop: boolean
    clickThrough: boolean
    opacity: number
  }>
  setAlwaysOnTop: (enabled: boolean) => Promise<void>
  setClickThrough: (enabled: boolean) => Promise<void>
  setOpacity: (opacity: number) => Promise<void>
  saveProject: (
    content: string,
    suggestedPath?: string
  ) => Promise<{ filePath: string } | null>
  loadProject: () => Promise<{
    filePath: string
    content: string
  } | null>
}

interface Window {
  heightReference?: HeightReferenceApi
}
