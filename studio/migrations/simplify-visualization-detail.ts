import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-05'})

async function main() {
  const ids = await client.fetch<string[]>(
    '*[_id in ["pageSettings-visualizations", "drafts.pageSettings-visualizations"]]._id',
  )

  if (!ids.length) throw new Error('找不到可视化实验室页面设置。')

  const transaction = client.transaction()
  ids.forEach((id) => {
    transaction.patch(id, (patch) =>
      patch
        .set({
          'visualizationsInterface.openLabel': '独立打开',
          'visualizationsInterface.principlesHeading': '使用手册',
          'visualizationsInterface.principlesPdfLabel': '打开使用手册 PDF',
        })
        .unset([
          'visualizationsInterface.domainLabel',
          'visualizationsInterface.authorLabel',
          'visualizationsInterface.relatedCoursesLabel',
          'visualizationsInterface.instructionsHeading',
        ]),
    )
  })

  await transaction.commit()
  console.log(`已更新 ${ids.length} 份可视化实验室页面设置。`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
