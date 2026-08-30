import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import {fileURLToPath} from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const studioDir = path.resolve(scriptsDir, '..')
const siteDir = path.resolve(studioDir, '..')

const source = fs.readFileSync(path.join(siteDir, 'assets/data/courses-data.js'), 'utf8')
const context = {window: {}}
vm.runInNewContext(source, context)
const courses = Array.isArray(context.window.TANXG_COURSES) ? context.window.TANXG_COURSES : []

let keyIndex = 0
const key = (prefix = 'item') => `${prefix}-${String((keyIndex += 1)).padStart(4, '0')}`
const slug = (current) => ({_type: 'slug', current})
const paragraph = (text) => ({
  _type: 'block',
  _key: key('block'),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key('span'), text, marks: []}],
})
const body = (...paragraphs) => paragraphs.filter(Boolean).map(paragraph)
const strings = (values = []) => values.map((value) => String(value))
const keyedObjects = (values = [], prefix = 'object') =>
  values.map((value) => ({_key: key(prefix), ...value}))

const documents = []

documents.push({
  _id: 'siteSettings-main',
  _type: 'siteSettings',
  heroTitle: 'TanXG · P&A',
  heroSubtitle: '探星阁 · 物理与天文',
  aboutDate: '2026-08-16',
  aboutTitle: '关于我们',
  aboutParagraphs: [
    '探星阁于 2023 年 8 月由 D.Liang 及其高中同学在高考完的暑假创建。团队名称“探星阁”正是其高中的班名，寓意着知识与真理宛如天上的繁星，值得我们去探寻。',
    '探星阁 · 物理&天文，是一个以物理与天文领域本科生与研究生为主要成员的科学团队，同时承担起搭建面向研究生、本科生、中学生和大众爱好者的物理与天文社区的责任。我们诚挚地欢迎您加入探星阁物理与天文团队，共创一个杰出的科学社区！',
  ],
  contactEmail: 'dl_phy@qq.com',
  news: keyedObjects([
    {date: '2026-05-01', title: '新闻 1', summary: '祝贺探星阁新版网站正式上线！'},
  ], 'news'),
})

const pageSettings = [
  ['learning', '课程检索', '搜索课程名称，查看课程定位、修读顺序与教材建议。'],
  ['courses', '课程讲义', '按学习阶段查看探星阁物理与天文讲义。'],
  ['research', '科学研究', '六个研究领域与专题内容。'],
  ['visualizations', '可视化实验室', '交互页面与科学演示。'],
  ['popsci', '科普', '面向公众的物理与天文内容。'],
  ['community', '科学社区', '合作、成长、经验与交流。'],
  ['team', '团队', '探星阁团队成员。'],
]

pageSettings.forEach(([pageKey, title, intro]) => {
  documents.push({_id: `pageSettings-${pageKey}`, _type: 'pageSettings', pageKey, title, intro})
})

courses.forEach((course, order) => {
  documents.push({
    _id: `course-${course.id}`,
    _type: 'course',
    order,
    enabled: true,
    title: course.title,
    slug: slug(course.id),
    stage: course.stage || '',
    field: course.field || '',
    nature: course.nature || '',
    hours: course.hours || '',
    summary: course.content || '',
    prerequisites: strings(course.prerequisites),
    followups: strings(course.followups),
    textbooks: keyedObjects(
      (course.textbooks || []).map((book) => ({
        title: typeof book === 'string' ? book : book.title || '',
        author: typeof book === 'string' ? '' : book.author || '',
      })),
      'book',
    ),
  })
})

const lectures = [
  {
    id: 'theoretical-mechanics',
    level: '核心课程',
    title: '理论力学讲义（中文）',
    term: '2026 年春季',
    summary: '解析力学与经典场论中文讲义。',
    coverPath: 'courses/lecture-notes/assets/mcover.jpg',
    detailPath: 'courses/lecture-notes/theoretical-mechanics.html',
    outline: ['拉格朗日力学', '变分法与哈密顿原理', '哈密顿力学', '经典场论'],
    downloads: [{label: '下载 PDF', filePath: 'courses/lecture-notes/assets/Analytical machanics.pdf'}],
  },
  {
    id: 'electrodynamics',
    level: '核心课程',
    title: '电动力学讲义（中文）',
    term: '2026 年春季',
    summary: '经典电动力学中文讲义。',
    coverPath: 'courses/lecture-notes/assets/emcover.jpg',
    detailPath: 'courses/lecture-notes/electrodynamics.html',
    outline: ['电动力学的数学基础', '麦克斯韦方程组', '静电学', '静磁学', '电磁波'],
    downloads: [{label: '下载 PDF', filePath: 'courses/lecture-notes/assets/electrodynamics.pdf'}],
  },
  {
    id: 'general-relativity',
    level: '高阶课程',
    title: '广义相对论讲义（中文）',
    term: '2026 年春季',
    summary: '面向初学者的广义相对论研讨课中文讲义。',
    coverPath: 'courses/lecture-notes/assets/grcover.png',
    detailPath: 'courses/lecture-notes/general-relativity.html',
    body: body('这是梁同学为 2026 年春季学期校内广义相对论研讨课使用的课程讲义。本研讨课面向初学者，旨在搭建集体学习与学术交流的平台。课程通过讨论与分享讲解广义相对论基础知识，优先关注物理概念和直观的物理图像，而非严格的数学形式体系。'),
    outline: ['第一章：狭义相对论', '第二章：微分几何基础（Ⅰ）', '第三章：微分几何基础（Ⅱ）', '第四章：爱因斯坦场方程', '第五章：史瓦西时空', '第六章：黑洞', '第七章：引力波', '第八章：宇宙学'],
    downloads: [
      {label: '第一章（PDF）', filePath: 'courses/lecture-notes/assets/1.pdf'},
      {label: '第二章（PDF）', filePath: 'courses/lecture-notes/assets/2.pdf'},
      {label: '第三章（PDF）', filePath: 'courses/lecture-notes/assets/3.pdf'},
    ],
  },
]

lectures.forEach((lecture, order) => {
  documents.push({
    _id: `lecture-${lecture.id}`,
    _type: 'lectureNote',
    order,
    enabled: true,
    language: '中文',
    ...lecture,
    slug: slug(lecture.id),
    downloads: keyedObjects(lecture.downloads, 'download'),
  })
})

const domains = [
  ['aa', 'A&A', '天文学与天体物理'],
  ['grc', 'GR&C', '引力与宇宙学'],
  ['hep', 'HEP', '高能物理'],
  ['amo', 'AMO', '原子、分子与光物理'],
  ['cmp', 'CMP', '凝聚态物理'],
  ['qst', 'QST', '量子科学与技术'],
]

domains.forEach(([domainKey, code, title], order) => {
  documents.push({
    _id: `researchDomain-${domainKey}`,
    _type: 'researchDomain',
    order,
    enabled: true,
    title,
    code,
    key: slug(domainKey),
  })
  documents.push({
    _id: `researchArticle-${domainKey}-placeholder`,
    _type: 'researchArticle',
    order,
    enabled: true,
    title: '专题标题占位',
    slug: slug(`${domainKey}-placeholder`),
    domain: {_type: 'reference', _ref: `researchDomain-${domainKey}`},
    summary: '摘要与作者位置。',
    tags: ['专题讲义'],
  })
})

const popularScienceItems = [
  ['solar-system-tour', '太阳系一日游', '天文学', '太阳系一日游'],
  ['planet-names', '八大行星名称的由来', '天文学', '八大行星名称的由来'],
  ['universe-size', '宇宙有多大？', '天文学', '宇宙有多大'],
  ['ancient-chinese-astronomy', '中国古代天文学略谈', '天文学', '中国古代天文学略谈'],
  ['cosmic-zoo', '宇宙动物园奇妙夜', '天文学', '宇宙动物园奇妙夜'],
  ['timbre', '“音色”背后的奥秘', '生活中的物理', '音色背后的奥秘'],
]

popularScienceItems.forEach(([id, title, category, filename], order) => {
  documents.push({
    _id: `popularScience-${id}`,
    _type: 'popularScience',
    order,
    enabled: true,
    title,
    slug: slug(id),
    category,
    coverPath: `popsci/resources/${filename}.png`,
    filePath: `popsci/resources/${filename}.pdf`,
  })
})

const visualizations = [
  ['visual-aa-grc', '可视化标题占位', ['aa', 'grc'], '操作说明与关联课程位置。'],
  ['visual-amo-qst', '可视化标题占位', ['amo', 'qst'], '操作说明与关联课程位置。'],
  ['visual-cmp-qst', '可视化标题占位', ['cmp', 'qst'], '操作说明与关联课程位置。'],
]

visualizations.forEach(([id, title, domainKeys, summary], order) => {
  documents.push({
    _id: `visualization-${id}`,
    _type: 'visualization',
    order,
    enabled: true,
    title,
    slug: slug(id),
    domains: domainKeys.map((domainKey) => ({_type: 'reference', _key: key('domain'), _ref: `researchDomain-${domainKey}`})),
    summary,
    sitePath: 'visualizations/demo-placeholder.html',
  })
})

const communityPosts = [
  ['research-partner-placeholder', '科研伙伴', '社区内容占位', '合作项目、工具或伙伴内容。', ['合作', '文章']],
  ['growth-story-placeholder', '成长故事', '社区内容占位', '学习经历、成长与经验分享。', ['成长', '故事']],
]

communityPosts.forEach(([id, section, title, summary, tags], order) => {
  documents.push({_id: `communityPost-${id}`, _type: 'communityPost', order, enabled: true, title, slug: slug(id), section, summary, tags})
})

const teamTags = [['A&A', 'GR&C'], ['AMO', 'QST'], ['CMP', 'HEP']]
teamTags.forEach((tags, order) => {
  const id = `member-${order + 1}`
  documents.push({
    _id: `teamMember-${id}`,
    _type: 'teamMember',
    order,
    enabled: true,
    name: '成员姓名',
    slug: slug(id),
    role: '当前身份',
    summary: '身份与一句话简介。',
    tags,
    bio: body('待填写。'),
    education: body('待填写。'),
    researchInterests: body('待填写。'),
  })
})

fs.writeFileSync(path.join(studioDir, 'seed.ndjson'), `${documents.map((document) => JSON.stringify(document)).join('\n')}\n`)
console.log(`Generated ${documents.length} documents, including ${courses.length} courses.`)
