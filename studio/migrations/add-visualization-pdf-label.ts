import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-04'})

async function main() {
  const ids = await client.fetch<string[]>(
    '*[_id in ["pageSettings-visualizations", "drafts.pageSettings-visualizations"]]._id',
  )

  if (!ids.length) throw new Error('找不到可视化实验室页面设置。')

  const transaction = client.transaction()
  ids.forEach((id) => {
    transaction.patch(id, (patch) =>
      patch.setIfMissing({'visualizationsInterface.principlesPdfLabel': '打开物理原理 PDF'}),
    )
  })
  await transaction.commit()
  console.log(`已更新 ${ids.length} 份可视化实验室页面设置。`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
