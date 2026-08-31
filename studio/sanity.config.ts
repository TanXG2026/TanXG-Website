import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {BulkPublishNavbar} from './components/BulkPublishNavbar'

export default defineConfig({
  name: 'default',
  title: 'TanXG-Web内容编辑中心',

  projectId: 'o9vxg32e',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(
        (template) => !['siteSettings', 'uiSettings', 'pageSettings'].includes(template.schemaType),
      ),
  },

  studio: {
    components: {
      navbar: BulkPublishNavbar,
    },
  },
})
