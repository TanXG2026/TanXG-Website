import {defineArrayMember, defineField, defineType} from 'sanity'

const orderField = defineField({
  name: 'order',
  title: '显示顺序',
  type: 'number',
  initialValue: 0,
})

const enabledField = defineField({
  name: 'enabled',
  title: '在网站上显示',
  type: 'boolean',
  initialValue: true,
})

const slugField = defineField({
  name: 'slug',
  title: '网址编号',
  type: 'slug',
  options: {source: 'title', maxLength: 96},
  validation: (rule) => rule.required(),
})

const blockContent = defineType({
  name: 'blockContent',
  title: '正文',
  type: 'array',
  of: [defineArrayMember({type: 'block'})],
})

const siteSettings = defineType({
  name: 'siteSettings',
  title: '首页与网站设置',
  type: 'document',
  fields: [
    defineField({name: 'heroTitle', title: '首页主标题', type: 'string'}),
    defineField({name: 'heroSubtitle', title: '首页副标题', type: 'string'}),
    defineField({name: 'aboutDate', title: '关于我们日期', type: 'date'}),
    defineField({name: 'aboutTitle', title: '关于我们标题', type: 'string'}),
    defineField({
      name: 'aboutParagraphs',
      title: '关于我们正文',
      type: 'array',
      of: [defineArrayMember({type: 'text', rows: 4})],
    }),
    defineField({name: 'contactEmail', title: '联系邮箱', type: 'string'}),
    defineField({
      name: 'news',
      title: '首页新闻',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'date', title: '日期', type: 'date'}),
            defineField({name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'summary', title: '内容', type: 'text', rows: 3}),
          ],
          preview: {select: {title: 'title', subtitle: 'date'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: '首页与网站设置'})},
})

const pageSettings = defineType({
  name: 'pageSettings',
  title: '页面标题与说明',
  type: 'document',
  fields: [
    defineField({
      name: 'pageKey',
      title: '对应页面',
      type: 'string',
      options: {
        list: [
          {title: '课程检索', value: 'learning'},
          {title: '课程讲义', value: 'courses'},
          {title: '科学研究', value: 'research'},
          {title: '可视化实验室', value: 'visualizations'},
          {title: '科普', value: 'popsci'},
          {title: '科学社区', value: 'community'},
          {title: '团队', value: 'team'},
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', title: '大标题', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'intro', title: '标题下方说明', type: 'text', rows: 3}),
    defineField({name: 'date', title: '可选日期', type: 'date'}),
  ],
  preview: {select: {title: 'title', subtitle: 'pageKey'}},
})

const course = defineType({
  name: 'course',
  title: '课程',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '课程名称', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({name: 'stage', title: '推荐学习阶段', type: 'string'}),
    defineField({name: 'field', title: '课程类别缩写', type: 'string'}),
    defineField({name: 'nature', title: '课程性质', type: 'string'}),
    defineField({name: 'hours', title: '建议学时', type: 'string'}),
    defineField({name: 'summary', title: '课程简介', type: 'text', rows: 5}),
    defineField({
      name: 'prerequisites',
      title: '前置课程',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'followups',
      title: '后续衔接课程',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'textbooks',
      title: '推荐教材与参考书',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'title', title: '书名', type: 'string'}),
            defineField({name: 'author', title: '作者与版本', type: 'string'}),
          ],
          preview: {select: {title: 'title', subtitle: 'author'}},
        }),
      ],
    }),
  ],
  orderings: [{title: '网站显示顺序', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'title', subtitle: 'stage'}},
})

const lectureNote = defineType({
  name: 'lectureNote',
  title: '课程讲义',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '讲义名称', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({
      name: 'level',
      title: '课程层级',
      type: 'string',
      options: {list: ['基础课程', '核心课程', '高阶课程'], layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'term', title: '学期或版本', type: 'string'}),
    defineField({name: 'language', title: '语言', type: 'string', initialValue: '中文'}),
    defineField({name: 'summary', title: '讲义简介', type: 'text', rows: 4}),
    defineField({name: 'cover', title: '上传封面', type: 'image', options: {hotspot: true}}),
    defineField({name: 'coverPath', title: '现有封面路径', type: 'string', description: '迁移旧资源时使用；新内容优先上传封面。'}),
    defineField({name: 'detailPath', title: '现有详情页路径', type: 'string'}),
    defineField({name: 'body', title: '详细介绍', type: 'blockContent'}),
    defineField({name: 'outline', title: '课程大纲', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({
      name: 'downloads',
      title: '讲义文件',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'label', title: '按钮文字', type: 'string'}),
            defineField({name: 'file', title: '上传文件', type: 'file'}),
            defineField({name: 'filePath', title: '现有文件路径', type: 'string'}),
          ],
          preview: {select: {title: 'label'}},
        }),
      ],
    }),
  ],
  orderings: [{title: '网站显示顺序', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'title', subtitle: 'level', media: 'cover'}},
})

const researchDomain = defineType({
  name: 'researchDomain',
  title: '研究领域',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '领域名称', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'code', title: '英文缩写', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'key', title: '筛选编号', type: 'slug', options: {source: 'code'}, validation: (rule) => rule.required()}),
    defineField({name: 'description', title: '领域说明', type: 'text', rows: 3}),
  ],
  preview: {select: {title: 'title', subtitle: 'code'}},
})

const researchArticle = defineType({
  name: 'researchArticle',
  title: '研究专题',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '专题标题', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({name: 'domain', title: '所属领域', type: 'reference', to: [{type: 'researchDomain'}], validation: (rule) => rule.required()}),
    defineField({name: 'summary', title: '摘要', type: 'text', rows: 4}),
    defineField({name: 'author', title: '作者', type: 'string'}),
    defineField({name: 'difficulty', title: '难度', type: 'string'}),
    defineField({name: 'updatedAtText', title: '更新说明', type: 'string'}),
    defineField({name: 'tags', title: '标签', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'body', title: '正文', type: 'blockContent'}),
    defineField({name: 'file', title: '上传附件', type: 'file'}),
    defineField({name: 'filePath', title: '现有附件路径', type: 'string'}),
    defineField({name: 'externalUrl', title: '外部链接', type: 'url'}),
  ],
  preview: {select: {title: 'title', subtitle: 'domain.code'}},
})

const popularScience = defineType({
  name: 'popularScience',
  title: '科普资源',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({name: 'category', title: '分类', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'summary', title: '简介', type: 'text', rows: 3}),
    defineField({name: 'cover', title: '上传封面', type: 'image', options: {hotspot: true}}),
    defineField({name: 'coverPath', title: '现有封面路径', type: 'string'}),
    defineField({name: 'file', title: '上传 PDF', type: 'file'}),
    defineField({name: 'filePath', title: '现有 PDF 路径', type: 'string'}),
  ],
  preview: {select: {title: 'title', subtitle: 'category', media: 'cover'}},
})

const visualization = defineType({
  name: 'visualization',
  title: '可视化项目',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '项目名称', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({name: 'domains', title: '研究领域标签', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'researchDomain'}]})]}),
    defineField({name: 'summary', title: '项目简介', type: 'text', rows: 4}),
    defineField({name: 'difficulty', title: '难度', type: 'string'}),
    defineField({name: 'author', title: '作者', type: 'string'}),
    defineField({name: 'relatedCourses', title: '关联课程', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'previewImage', title: '预览图', type: 'image', options: {hotspot: true}}),
    defineField({name: 'sitePath', title: '交互 HTML 路径', type: 'string', description: '例如 visualizations/demo-placeholder.html'}),
    defineField({name: 'externalUrl', title: '外部交互地址', type: 'url'}),
    defineField({name: 'instructions', title: '操作说明', type: 'blockContent'}),
    defineField({name: 'principles', title: '物理原理', type: 'blockContent'}),
    defineField({name: 'relatedText', title: '相关内容', type: 'blockContent'}),
  ],
  preview: {select: {title: 'title', subtitle: 'difficulty', media: 'previewImage'}},
})

const communityPost = defineType({
  name: 'communityPost',
  title: '社区内容',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required()}),
    slugField,
    defineField({name: 'section', title: '所属板块', type: 'string', options: {list: ['科研伙伴', '成长故事'], layout: 'radio'}, validation: (rule) => rule.required()}),
    defineField({name: 'summary', title: '摘要', type: 'text', rows: 4}),
    defineField({name: 'author', title: '作者', type: 'string'}),
    defineField({name: 'date', title: '日期', type: 'date'}),
    defineField({name: 'tags', title: '标签', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'body', title: '正文', type: 'blockContent'}),
    defineField({name: 'externalUrl', title: '外部链接', type: 'url'}),
  ],
  preview: {select: {title: 'title', subtitle: 'section'}},
})

const teamMember = defineType({
  name: 'teamMember',
  title: '团队成员',
  type: 'document',
  fields: [
    orderField,
    enabledField,
    defineField({name: 'name', title: '姓名', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', title: '网址编号', type: 'slug', options: {source: 'name'}, validation: (rule) => rule.required()}),
    defineField({name: 'role', title: '当前身份', type: 'string'}),
    defineField({name: 'summary', title: '卡片简介', type: 'text', rows: 3}),
    defineField({name: 'avatar', title: '头像', type: 'image', options: {hotspot: true}}),
    defineField({name: 'avatarPath', title: '现有头像路径', type: 'string'}),
    defineField({name: 'tags', title: '研究标签', type: 'array', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'bio', title: '个人简介', type: 'blockContent'}),
    defineField({name: 'education', title: '教育背景', type: 'blockContent'}),
    defineField({name: 'researchInterests', title: '研究方向', type: 'blockContent'}),
    defineField({
      name: 'contentLinks',
      title: '探星阁内容',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'label', title: '显示名称', type: 'string'}),
            defineField({name: 'url', title: '链接', type: 'string'}),
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        }),
      ],
    }),
  ],
  orderings: [{title: '网站显示顺序', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'role', media: 'avatar'}},
})

export const schemaTypes = [
  blockContent,
  siteSettings,
  pageSettings,
  course,
  lectureNote,
  researchDomain,
  researchArticle,
  popularScience,
  visualization,
  communityPost,
  teamMember,
]
