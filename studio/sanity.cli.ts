import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'o9vxg32e',
    dataset: 'production'
  },
  deployment: {
    appId: 'd05ih8jaj7gb17gqyplzc5ju',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
