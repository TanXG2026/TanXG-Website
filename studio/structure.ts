import type {StructureResolver} from 'sanity/structure'

const pageSettingsPages = [
  {id: 'pageSettings-learning', title: '课程检索页面'},
  {id: 'pageSettings-courses', title: '课程讲义页面'},
  {id: 'pageSettings-research', title: '科学研究页面'},
  {id: 'pageSettings-visualizations', title: '可视化实验室页面'},
  {id: 'pageSettings-popsci', title: '科普页面'},
  {id: 'pageSettings-community', title: '科学社区页面'},
  {id: 'pageSettings-team', title: '团队页面'},
]

export const structure: StructureResolver = (S) =>
  S.list()
    .id('tanxg-content-root')
    .title('TanXG-Web内容编辑中心')
    .items([
      S.listItem()
        .id('site-settings')
        .title('首页与网站设置')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings-main')),
      S.listItem()
        .id('ui-settings')
        .title('网站界面文字')
        .child(S.document().schemaType('uiSettings').documentId('uiSettings-main')),
      S.divider(),
      ...pageSettingsPages.map((page) =>
        S.listItem()
          .id(page.id)
          .title(page.title)
          .child(S.document().schemaType('pageSettings').documentId(page.id).title(page.title)),
      ),
      S.divider(),
      S.documentTypeListItem('course').title('课程检索'),
      S.documentTypeListItem('lectureNote').title('课程讲义'),
      S.divider(),
      S.listItem()
        .id('research')
        .title('科学研究')
        .child(
          S.list()
            .id('research-root')
            .title('科学研究')
            .items([
              S.documentTypeListItem('researchDomain').title('研究领域'),
              S.documentTypeListItem('researchArticle').title('研究专题'),
            ]),
        ),
      S.documentTypeListItem('visualization').title('可视化实验室'),
      S.documentTypeListItem('popularScience').title('科普'),
      S.documentTypeListItem('communityPost').title('科学社区'),
      S.documentTypeListItem('teamMember').title('团队成员'),
    ])
