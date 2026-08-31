import type {StructureResolver} from 'sanity/structure'

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
      S.documentTypeListItem('pageSettings').title('各页面标题与说明'),
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
