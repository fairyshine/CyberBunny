import { initDesktopPlatform } from './platform/electron'
import { renderOpenBunnyApp } from '@openbunny/ui-web/bootstrap'

// Initialize desktop platform before rendering
initDesktopPlatform()

renderOpenBunnyApp(document.getElementById('root')!)
