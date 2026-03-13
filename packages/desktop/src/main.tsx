import { initDesktopPlatform } from './platform/electron'
import { bootstrapOpenBunnyDOMApp } from '@openbunny/ui-web/bootstrap'

bootstrapOpenBunnyDOMApp(initDesktopPlatform)
