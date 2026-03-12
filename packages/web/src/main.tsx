import { initBrowserPlatform } from './platform/browser'
import { renderOpenBunnyApp } from '@openbunny/ui-web/bootstrap'

// Initialize browser platform before rendering
initBrowserPlatform()

renderOpenBunnyApp(document.getElementById('root')!)
