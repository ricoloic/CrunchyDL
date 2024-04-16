const isProduction = process.env.NODE_ENV !== 'development'

export function openNewWindow(urlprod: string, urldev: string, w: string) {
  const newWindow = window.open(isProduction ? urlprod : urldev, '_blank', w)
  if (newWindow) {
    newWindow.focus()
  }
}