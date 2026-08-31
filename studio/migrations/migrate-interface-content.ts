import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-08-31'})

function block(text: string, key: string) {
  return {
    _key: `block-${key}`,
    _type: 'block',
    children: [{_key: `span-${key}`, _type: 'span', marks: [], text}],
    markDefs: [],
    style: 'normal',
  }
}

const uiSettings = {
  global: {
    homeTitle: '探星阁 · P&A',
    titleSuffix: '探星阁',
    metaDescription: '探星阁物理与天文网站',
    continueLabel: '继续',
    logoAlt: '探星阁标志',
    contactPrefix: '联系邮箱：',
    navHome: '首页',
    navLearning: '课程检索',
    navCourses: '课程讲义',
    navResearch: '科学研究',
    navVisualizations: '可视化实验室',
    navPopsci: '科普',
    navCommunity: '科学社区',
    navTeam: '团队',
    footerOwner: 'TanXG',
    footerFrameworkPrefix: '框架基于',
    footerFrameworkName: 'HTML5 UP',
  },
  common: {
    allLabel: '全部',
    emptyValue: '待补充',
    pdfLabel: 'PDF',
    loadError: '内容加载失败，请刷新页面重试。',
    newsFallback: '新闻',
    unnamedLecture: '未命名讲义',
    unnamedTopic: '未命名专题',
    unnamedVisualization: '未命名可视化项目',
    coverSuffix: '封面',
    avatarSuffix: '头像',
    previewSuffix: '预览',
    researchFallback: '研究',
    downloadFileLabel: '下载文件',
    viewContentLabel: '查看内容',
  },
  learning: {
    searchLabel: '查找课程',
    searchPlaceholder: '输入课程名称，例如：量子力学',
    clearLabel: '清除',
    loadingStatus: '加载中...',
    foundPrefix: '找到',
    countSuffix: '门课程',
    noResultsTitle: '没有找到对应课程',
    noResultsText: '可以尝试缩短关键词，或搜索课程的其他常用名称。',
    unavailableText: '课程资料暂时无法载入',
    backLabel: '← 返回',
    stageLabel: '推荐学习阶段',
    natureLabel: '课程性质',
    hoursLabel: '建议学时',
    summaryHeading: '课程简介',
    textbooksHeading: '推荐教材与参考书',
    courseFallback: '课程名称',
    summaryFallback: '内容简介待补充。',
    textbookFallback: '教材待补充',
    authorFallback: '作者与版本待补充',
  },
  lectures: {
    noticeTitle: '下载说明',
    noticeItems: [
      '探星阁所有讲义均免费下载；转载时请注明出处，严禁私自用于商业用途。',
      '点击相应卡片进入详情页，可查看讲义介绍并获取 PDF 下载入口。',
      '讲义随时更新，请及时留意；如下载链接失效，请通过电子邮件或官方微信公众号反馈。',
    ],
    foundationLabel: '基础课程',
    coreLabel: '核心课程',
    advancedLabel: '高阶课程',
    emptySuffix: '讲义暂待添加。',
    backLabel: '← 返回课程讲义',
    introHeading: '讲义简介',
    outlineHeading: '课程大纲',
    feedbackHeading: '勘误与反馈',
    downloadHeading: '下载讲义',
    summaryFallback: '讲义简介待补充。',
    outlineFallback: '大纲待补充。',
    fileFallback: '文件待上传。',
  },
  research: {
    topicsHeading: '专题内容',
    emptyText: '该分类暂无内容。',
  },
  popsci: {
    noticeItems: [
      '探星阁所有科普资源均可免费分享；转载时请注明出处，未经授权不得用于商业用途。',
      '点击相应卡片即可直接打开 PDF，支持在线查看与下载。',
      '如资源链接失效，请及时通过电子邮件或官方微信公众号反馈。',
    ],
  },
  visualizations: {
    previewPlaceholder: '交互预览区域',
    emptyText: '该分类暂无可视化项目。',
    backLabel: '← 返回可视化实验室',
    domainLabel: '领域',
    difficultyLabel: '难度',
    authorLabel: '作者',
    relatedCoursesLabel: '关联课程',
    fullscreenLabel: '全屏查看',
    openLabel: '独立打开',
    instructionsHeading: '操作说明',
    principlesHeading: '物理原理',
    relatedHeading: '相关内容',
  },
  team: {
    cardsHeading: '成员卡片',
    avatarPrefix: '成员',
    backLabel: '← 返回团队',
    bioHeading: '个人简介',
    educationHeading: '教育背景',
    researchHeading: '研究方向',
    contentHeading: '探星阁内容',
    emptyLinks: '内容待添加。',
  },
  detail: {
    backResearch: '← 返回科学研究',
    backCommunity: '← 返回科学社区',
    typeLabel: '类型',
    authorLabel: '作者',
    difficultyLabel: '难度',
    updatedLabel: '更新',
    dateLabel: '日期',
    tagsLabel: '标签',
    bodyHeading: '正文',
    tagsHeading: '标签',
    filesHeading: '文件与相关内容',
    openFileLabel: '打开附件',
    bodyFallback: '内容待补充。',
  },
}

async function main() {
  const lectures = await client.fetch<
    Array<{_id: string; _rev: string; slug?: {current?: string}; outlineIntro?: string; feedback?: unknown[]}>
  >('*[_type == "lectureNote"]{_id,_rev,slug,outlineIntro,feedback}')

  const transaction = client.transaction()
  transaction.createIfNotExists({_id: 'uiSettings-main', _type: 'uiSettings'})
  transaction.patch('uiSettings-main', (patch) => patch.setIfMissing(uiSettings))

  for (const lecture of lectures) {
    const slug = lecture.slug?.current
    const missing: Record<string, unknown> = {}

    if (!lecture.outlineIntro) {
      missing.outlineIntro =
        slug === 'general-relativity'
          ? '讲义包含详细的文字内容，以便自主学习。课程大纲如下：'
          : '本讲义涵盖：'
    }

    if (slug === 'general-relativity' && (!lecture.feedback || lecture.feedback.length === 0)) {
      missing.feedback = [
        block(
          '限于作者学识，如发现错误或不妥之处，欢迎批评指正并提出反馈。联系邮箱：dl_phy@qq.com',
          'feedback-gr',
        ),
      ]
    }

    if (Object.keys(missing).length > 0) {
      transaction.patch(lecture._id, (patch) => patch.ifRevisionId(lecture._rev).setIfMissing(missing))
    }
  }

  const result = await transaction.commit()
  console.log(`Migration complete at ${result.transactionId}`)
}

main().catch((error) => {
  console.error(error)
  throw error
})
