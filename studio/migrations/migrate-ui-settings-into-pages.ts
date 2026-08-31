import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-08-31'})

type TextMap = Record<string, unknown>

function object(value: unknown): TextMap {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as TextMap) : {}
}

function pick(source: TextMap, keys: string[]): TextMap {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]))
}

async function main() {
  const ui = await client.fetch<TextMap | null>('*[_id == "uiSettings-main"][0]')
  if (!ui) throw new Error('找不到已发布的 uiSettings-main，无法迁移。')

  const global = object(ui.global)
  const common = object(ui.common)
  const learning = object(ui.learning)
  const lectures = object(ui.lectures)
  const research = object(ui.research)
  const popsci = object(ui.popsci)
  const visualizations = object(ui.visualizations)
  const team = object(ui.team)
  const detail = object(ui.detail)

  const pageInterfaces: Record<string, TextMap> = {
    learning: {
      ...learning,
      ...pick(common, ['emptyValue', 'loadError']),
    },
    courses: {
      ...lectures,
      ...pick(common, [
        'emptyValue',
        'loadError',
        'pdfLabel',
        'unnamedLecture',
        'coverSuffix',
        'downloadFileLabel',
      ]),
    },
    research: {
      ...research,
      ...pick(common, ['allLabel', 'loadError', 'researchFallback', 'unnamedTopic', 'emptyValue']),
      ...pick(detail, [
        'typeLabel',
        'authorLabel',
        'difficultyLabel',
        'updatedLabel',
        'tagsLabel',
        'bodyHeading',
        'tagsHeading',
        'filesHeading',
        'openFileLabel',
        'bodyFallback',
      ]),
      backLabel: detail.backResearch,
    },
    visualizations: {
      ...visualizations,
      ...pick(common, ['allLabel', 'loadError', 'previewSuffix', 'unnamedVisualization', 'emptyValue']),
      relatedFallback: team.emptyLinks,
    },
    popsci: {
      ...popsci,
      ...pick(common, ['loadError', 'coverSuffix', 'pdfLabel']),
    },
    community: {
      ...pick(common, ['loadError', 'emptyValue']),
      ...pick(detail, [
        'typeLabel',
        'authorLabel',
        'dateLabel',
        'tagsLabel',
        'bodyHeading',
        'tagsHeading',
        'filesHeading',
        'bodyFallback',
      ]),
      backLabel: detail.backCommunity,
    },
    team: {
      ...team,
      ...pick(common, ['loadError', 'emptyValue', 'avatarSuffix', 'viewContentLabel']),
    },
  }

  const pageFieldNames: Record<string, string> = {
    learning: 'learningInterface',
    courses: 'coursesInterface',
    research: 'researchInterface',
    visualizations: 'visualizationsInterface',
    popsci: 'popsciInterface',
    community: 'communityInterface',
    team: 'teamInterface',
  }

  const transaction = client.transaction()
  transaction.patch('siteSettings-main', (patch) =>
    patch.set({
      globalInterface: global,
      homeInterface: {
        ...pick(common, ['newsFallback', 'loadError']),
      },
    }),
  )

  for (const [pageKey, interfaceText] of Object.entries(pageInterfaces)) {
    transaction.patch(`pageSettings-${pageKey}`, (patch) =>
      patch.set({[pageFieldNames[pageKey]]: interfaceText}),
    )
  }

  const result = await transaction.commit()
  console.log(`页面界面文字迁移完成：${result.transactionId}`)
}

main().catch((error) => {
  console.error(error)
  throw error
})
