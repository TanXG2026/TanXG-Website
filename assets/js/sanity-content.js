(function () {
	'use strict';

	var PROJECT_ID = 'o9vxg32e';
	var DATASET = 'production';
	var API_VERSION = '2026-08-30';
	var scriptUrl = document.currentScript ? new URL(document.currentScript.src, window.location.href) : new URL('assets/js/sanity-content.js', window.location.href);
	var siteRootUrl = new URL('../../', scriptUrl);

	function apiQuery(groq) {
		var endpoint = 'https://' + PROJECT_ID + '.api.sanity.io/v' + API_VERSION + '/data/query/' + DATASET;
		return fetch(endpoint + '?perspective=published&query=' + encodeURIComponent(groq), {
			headers: { Accept: 'application/json' }
		}).then(function (response) {
			if (!response.ok) throw new Error('Sanity request failed: ' + response.status);
			return response.json();
		}).then(function (payload) {
			if (payload && payload.error) throw new Error(payload.error.description || 'Sanity query failed');
			return payload ? payload.result : null;
		});
	}

	function quote(value) {
		return JSON.stringify(String(value || ''));
	}

	function siteUrl(value) {
		if (!value) return '';
		if (/^(https?:|mailto:)/i.test(value)) return value;
		if (/^(javascript:|data:)/i.test(value)) return '#';
		try {
			return new URL(String(value).replace(/^\/+/, ''), siteRootUrl).href;
		} catch (error) {
			return '#';
		}
	}

	function createElement(tagName, className, text) {
		var element = document.createElement(tagName);
		if (className) element.className = className;
		if (text !== undefined && text !== null) element.textContent = text;
		return element;
	}

	function setText(root, selector, value) {
		var element = root ? root.querySelector(selector) : null;
		if (element && value !== undefined && value !== null && value !== '') element.textContent = value;
	}

	function formatDate(value) {
		if (!value) return '';
		var date = new Date(value + (String(value).length === 10 ? 'T00:00:00' : ''));
		if (Number.isNaN(date.getTime())) return value;
		return date.getFullYear() + ' 年 ' + (date.getMonth() + 1) + ' 月 ' + date.getDate() + ' 日';
	}

	function appendTags(container, tags) {
		if (!container) return;
		container.replaceChildren();
		(tags || []).filter(Boolean).forEach(function (tag) {
			container.appendChild(createElement('span', 'tag', tag));
		});
	}

	function blockText(block) {
		return (block && Array.isArray(block.children) ? block.children : []).map(function (child) {
			return child && child.text ? child.text : '';
		}).join('');
	}

	function renderBlocks(container, blocks, fallback) {
		if (!container) return;
		container.replaceChildren();
		var values = Array.isArray(blocks) ? blocks : [];
		var activeList = null;
		var activeListType = '';

		values.forEach(function (block) {
			var text = blockText(block);
			if (!text) return;

			if (block.listItem) {
				var listType = block.listItem === 'number' ? 'ol' : 'ul';
				if (!activeList || activeListType !== listType) {
					activeList = document.createElement(listType);
					activeListType = listType;
					container.appendChild(activeList);
				}
				activeList.appendChild(createElement('li', '', text));
				return;
			}

			activeList = null;
			activeListType = '';
			var tagName = block.style === 'h2' ? 'h2' : block.style === 'h3' ? 'h3' : block.style === 'blockquote' ? 'blockquote' : 'p';
			container.appendChild(createElement(tagName, '', text));
		});

		if (!container.childNodes.length && fallback) container.appendChild(createElement('p', '', fallback));
	}

	function notifyRendered() {
		document.dispatchEvent(new CustomEvent('tanxg:content-rendered'));
	}

	function loadPageSettings() {
		var hero = document.querySelector('[data-sanity-page]');
		if (!hero) return Promise.resolve();
		var pageKey = hero.getAttribute('data-sanity-page');
		return apiQuery('*[_type == "pageSettings" && pageKey == ' + quote(pageKey) + '][0]{title,intro,date}').then(function (page) {
			if (!page) return;
			setText(hero, '[data-sanity-page-title]', page.title);
			setText(hero, '[data-sanity-page-intro]', page.intro);
			setText(hero, '[data-sanity-page-date]', formatDate(page.date));
		});
	}

	function loadHome() {
		var home = document.querySelector('[data-sanity-home]');
		if (!home) return Promise.resolve();
		return apiQuery('*[_id == "siteSettings-main"][0]{heroTitle,heroSubtitle,aboutDate,aboutTitle,aboutParagraphs,contactEmail,news[]{date,title,summary}}').then(function (settings) {
			if (!settings) return;
			setText(document, '[data-sanity-home-hero-title]', settings.heroTitle);
			setText(document, '[data-sanity-home-hero-subtitle]', settings.heroSubtitle);
			setText(home, '[data-sanity-about-date]', formatDate(settings.aboutDate));
			setText(home, '[data-sanity-about-title]', settings.aboutTitle);

			var copy = home.querySelector('[data-sanity-about-copy]');
			if (copy && Array.isArray(settings.aboutParagraphs)) {
				copy.replaceChildren();
				settings.aboutParagraphs.filter(Boolean).forEach(function (paragraph) {
					copy.appendChild(createElement('p', '', paragraph));
				});
				if (settings.contactEmail) {
					var contact = createElement('p', '', '联系邮箱：');
					var link = createElement('a', '', settings.contactEmail);
					link.href = 'mailto:' + settings.contactEmail;
					contact.appendChild(link);
					copy.appendChild(contact);
				}
			}

			var news = home.querySelector('[data-sanity-home-news]');
			if (news && Array.isArray(settings.news)) {
				news.replaceChildren();
				settings.news.forEach(function (item) {
					var card = createElement('article', 'home-news-card reveal');
					card.appendChild(createElement('p', 'home-date', formatDate(item.date)));
					card.appendChild(createElement('h2', '', item.title || '新闻'));
					card.appendChild(createElement('p', '', item.summary || ''));
					news.appendChild(card);
				});
			}
			notifyRendered();
		});
	}

	function loadCourses() {
		if (!document.querySelector('[data-course-list], [data-course-template]')) return Promise.resolve();
		var query = '*[_type == "course" && enabled != false] | order(order asc, title asc){"id": slug.current,title,stage,field,nature,hours,"content": summary,prerequisites,followups,textbooks[]{title,author}}';
		return apiQuery(query).then(function (courses) {
			if (!Array.isArray(courses) || !courses.length) return;
			window.TANXG_COURSES = courses;
			document.dispatchEvent(new CustomEvent('tanxg:courses-updated'));
		});
	}

	function lectureCard(lecture) {
		var card = createElement('a', 'content-card lecture-card reveal');
		card.href = lecture.detailPath
			? siteUrl(lecture.detailPath)
			: siteUrl('courses/lecture-notes/detail.html?slug=' + encodeURIComponent(lecture.slug));
		var coverUrl = lecture.coverUrl || siteUrl(lecture.coverPath);
		if (coverUrl) {
			var image = createElement('img', 'lecture-card-cover');
			image.src = coverUrl;
			image.alt = (lecture.title || '讲义') + '封面';
			image.loading = 'lazy';
			card.appendChild(image);
		}
		var body = createElement('div', 'lecture-card-body');
		body.appendChild(createElement('p', 'card-kicker', lecture.term || '持续更新'));
		body.appendChild(createElement('h3', '', lecture.title || '未命名讲义'));
		body.appendChild(createElement('p', '', lecture.summary || ''));
		var tags = createElement('div', 'tag-row');
		appendTags(tags, [lecture.level, lecture.language || 'PDF']);
		body.appendChild(tags);
		card.appendChild(body);
		return card;
	}

	function loadLectureList() {
		var containers = document.querySelectorAll('[data-sanity-lecture-level]');
		if (!containers.length) return Promise.resolve();
		var query = '*[_type == "lectureNote" && enabled != false] | order(order asc, title asc){title,"slug":slug.current,level,term,language,summary,coverPath,detailPath,"coverUrl":cover.asset->url}';
		return apiQuery(query).then(function (lectures) {
			containers.forEach(function (container) {
				var level = container.getAttribute('data-sanity-lecture-level');
				var items = (lectures || []).filter(function (lecture) { return lecture.level === level; });
				container.replaceChildren();
				if (!items.length) {
					var empty = createElement('div', 'empty-state');
					empty.appendChild(createElement('p', '', level + '讲义暂待添加。'));
					container.appendChild(empty);
					return;
				}
				var grid = createElement('div', 'card-grid');
				items.forEach(function (lecture) { grid.appendChild(lectureCard(lecture)); });
				container.appendChild(grid);
			});
			notifyRendered();
		});
	}

	function loadLectureDetail() {
		var root = document.querySelector('[data-sanity-lecture-detail]');
		if (!root) return Promise.resolve();
		var params = new URLSearchParams(window.location.search);
		var slugValue = root.getAttribute('data-lecture-slug') || params.get('slug');
		if (!slugValue) return Promise.resolve();
		var query = '*[_type == "lectureNote" && slug.current == ' + quote(slugValue) + '][0]{title,"slug":slug.current,level,term,language,summary,coverPath,"coverUrl":cover.asset->url,body,outline,downloads[]{label,filePath,"fileUrl":file.asset->url}}';
		return apiQuery(query).then(function (lecture) {
			if (!lecture) return;
			setText(root, '[data-lecture-term]', lecture.term);
			setText(root, '[data-lecture-title]', lecture.title);
			setText(root, '[data-lecture-summary]', lecture.summary);
			var cover = root.querySelector('[data-lecture-cover]');
			var coverUrl = lecture.coverUrl || siteUrl(lecture.coverPath);
			if (cover && coverUrl) {
				cover.src = coverUrl;
				cover.alt = (lecture.title || '讲义') + '封面';
			}
			appendTags(root.querySelector('[data-lecture-tags]'), [lecture.level, lecture.language]);
			renderBlocks(root.querySelector('[data-lecture-body]'), lecture.body, lecture.summary || '内容待补充。');

			var outline = root.querySelector('[data-lecture-outline]');
			if (outline && Array.isArray(lecture.outline)) {
				outline.replaceChildren();
				lecture.outline.forEach(function (item) { outline.appendChild(createElement('li', '', item)); });
			}

			var downloads = root.querySelector('[data-lecture-downloads]');
			if (downloads && Array.isArray(lecture.downloads)) {
				downloads.replaceChildren();
				lecture.downloads.forEach(function (download) {
					var link = createElement('a', 'button primary', download.label || '下载文件');
					link.href = download.fileUrl || siteUrl(download.filePath);
					link.target = '_blank';
					link.rel = 'noopener noreferrer';
					downloads.appendChild(link);
				});
			}
			document.title = lecture.title + ' · 探星阁';
			notifyRendered();
		});
	}

	function domainButton(domain) {
		var button = createElement('button', 'domain-card reveal');
		button.type = 'button';
		button.setAttribute('data-domain-filter', domain.key);
		button.setAttribute('aria-pressed', 'false');
		button.appendChild(createElement('span', 'domain-code', domain.code));
		button.appendChild(createElement('h3', '', domain.title));
		return button;
	}

	function filterButton(value, label, active) {
		var button = createElement('button', 'filter-button' + (active ? ' is-active' : ''), label);
		button.type = 'button';
		button.setAttribute('data-filter', value);
		button.setAttribute('aria-pressed', String(Boolean(active)));
		return button;
	}

	function loadResearch() {
		var domainsContainer = document.querySelector('[data-sanity-research-domains]');
		var cardsContainer = document.querySelector('[data-sanity-research-cards]');
		if (!domainsContainer || !cardsContainer) return Promise.resolve();
		var domainsQuery = '*[_type == "researchDomain" && enabled != false] | order(order asc){title,code,"key":key.current,description}';
		var articlesQuery = '*[_type == "researchArticle" && enabled != false] | order(order asc, title asc){title,"slug":slug.current,summary,author,difficulty,updatedAtText,tags,externalUrl,domain->{title,code,"key":key.current}}';
		return Promise.all([apiQuery(domainsQuery), apiQuery(articlesQuery)]).then(function (results) {
			var domains = results[0] || [];
			var articles = results[1] || [];
			domainsContainer.replaceChildren();
			domains.forEach(function (domain) { domainsContainer.appendChild(domainButton(domain)); });

			var filters = document.querySelector('[data-sanity-research-filters]');
			if (filters) {
				filters.replaceChildren(filterButton('all', '全部', true));
				domains.forEach(function (domain) { filters.appendChild(filterButton(domain.key, domain.code, false)); });
			}

			cardsContainer.replaceChildren();
			articles.forEach(function (article) {
				var card = createElement('a', 'content-card filter-card reveal');
				var domain = article.domain || {};
				card.setAttribute('data-filter-card', '');
				card.setAttribute('data-tags', domain.key || '');
				card.href = article.externalUrl || siteUrl('content-template.html?type=research&slug=' + encodeURIComponent(article.slug));
				card.appendChild(createElement('p', 'card-kicker', domain.code || '研究'));
				card.appendChild(createElement('h3', '', article.title || '未命名专题'));
				card.appendChild(createElement('p', '', article.summary || ''));
				var tags = createElement('div', 'tag-row');
				appendTags(tags, [domain.code].concat(article.tags || []));
				card.appendChild(tags);
				cardsContainer.appendChild(card);
			});
			var empty = createElement('p', 'empty-state', '该分类暂无内容。');
			empty.hidden = true;
			empty.setAttribute('data-empty-state', '');
			cardsContainer.appendChild(empty);
			notifyRendered();
		});
	}

	function loadPopularScience() {
		var root = document.querySelector('[data-sanity-popsci]');
		if (!root) return Promise.resolve();
		var query = '*[_type == "popularScience" && enabled != false] | order(order asc, title asc){title,"slug":slug.current,category,summary,coverPath,filePath,"coverUrl":cover.asset->url,"fileUrl":file.asset->url}';
		return apiQuery(query).then(function (items) {
			var categories = [];
			(items || []).forEach(function (item) {
				if (categories.indexOf(item.category) === -1) categories.push(item.category);
			});
			root.replaceChildren();
			categories.forEach(function (category, categoryIndex) {
				var section = createElement('section', 'section-block resource-section');
				var heading = createElement('header', 'section-heading');
				var headingId = 'popsci-category-' + categoryIndex;
				var title = createElement('h2', '', category);
				title.id = headingId;
				heading.appendChild(title);
				section.setAttribute('aria-labelledby', headingId);
				section.appendChild(heading);
				var grid = createElement('div', 'card-grid');
				items.filter(function (item) { return item.category === category; }).forEach(function (item) {
					var card = createElement('a', 'content-card resource-card reveal');
					card.href = item.fileUrl || siteUrl(item.filePath);
					card.target = '_blank';
					card.rel = 'noopener noreferrer';
					var coverUrl = item.coverUrl || siteUrl(item.coverPath);
					if (coverUrl) {
						var image = createElement('img', 'resource-card-cover');
						image.src = coverUrl;
						image.alt = item.title + '封面';
						image.loading = 'lazy';
						card.appendChild(image);
					}
					var body = createElement('div', 'resource-card-body');
					body.appendChild(createElement('h3', '', item.title));
					if (item.summary) body.appendChild(createElement('p', '', item.summary));
					var tags = createElement('div', 'tag-row');
					appendTags(tags, [item.category, 'PDF']);
					body.appendChild(tags);
					card.appendChild(body);
					grid.appendChild(card);
				});
				section.appendChild(grid);
				root.appendChild(section);
			});
			notifyRendered();
		});
	}

	function loadVisualizations() {
		var cardsContainer = document.querySelector('[data-sanity-visualizations]');
		if (!cardsContainer) return Promise.resolve();
		var query = '*[_type == "visualization" && enabled != false] | order(order asc, title asc){title,"slug":slug.current,summary,difficulty,author,relatedCourses,sitePath,externalUrl,"previewUrl":previewImage.asset->url,domains[]->{title,code,"key":key.current}}';
		return apiQuery(query).then(function (items) {
			var domains = [];
			(items || []).forEach(function (item) {
				(item.domains || []).forEach(function (domain) {
					if (!domains.some(function (existing) { return existing.key === domain.key; })) domains.push(domain);
				});
			});
			var filters = document.querySelector('[data-sanity-visualization-filters]');
			if (filters) {
				filters.replaceChildren(filterButton('all', '全部', true));
				domains.forEach(function (domain) { filters.appendChild(filterButton(domain.key, domain.code, false)); });
			}

			cardsContainer.replaceChildren();
			(items || []).forEach(function (item) {
				var card = createElement('a', 'content-card filter-card reveal');
				var domainKeys = (item.domains || []).map(function (domain) { return domain.key; });
				card.setAttribute('data-filter-card', '');
				card.setAttribute('data-tags', domainKeys.join(' '));
				card.href = siteUrl('visualization-template.html?slug=' + encodeURIComponent(item.slug));
				if (item.previewUrl) {
					var image = createElement('img', 'resource-card-cover');
					image.src = item.previewUrl;
					image.alt = item.title + '预览';
					card.appendChild(image);
				} else {
					card.appendChild(createElement('div', 'visual-placeholder', '交互预览区域'));
				}
				card.appendChild(createElement('h3', '', item.title));
				card.appendChild(createElement('p', '', item.summary || ''));
				var tags = createElement('div', 'tag-row');
				appendTags(tags, (item.domains || []).map(function (domain) { return domain.code; }));
				card.appendChild(tags);
				cardsContainer.appendChild(card);
			});
			var empty = createElement('p', 'empty-state', '该分类暂无可视化项目。');
			empty.hidden = true;
			empty.setAttribute('data-empty-state', '');
			cardsContainer.appendChild(empty);
			notifyRendered();
		});
	}

	function loadCommunity() {
		var root = document.querySelector('[data-sanity-community]');
		if (!root) return Promise.resolve();
		var query = '*[_type == "communityPost" && enabled != false] | order(order asc, date desc){title,"slug":slug.current,section,summary,author,date,tags,externalUrl}';
		return apiQuery(query).then(function (items) {
			var sections = [];
			(items || []).forEach(function (item) { if (sections.indexOf(item.section) === -1) sections.push(item.section); });
			root.replaceChildren();
			sections.forEach(function (sectionName) {
				var section = createElement('div', 'section-block');
				var heading = createElement('header', 'section-heading');
				heading.appendChild(createElement('h2', '', sectionName));
				section.appendChild(heading);
				var grid = createElement('div', 'card-grid');
				items.filter(function (item) { return item.section === sectionName; }).forEach(function (item) {
					var card = createElement('a', 'content-card reveal');
					card.href = item.externalUrl || siteUrl('content-template.html?type=community&slug=' + encodeURIComponent(item.slug));
					card.appendChild(createElement('span', 'card-icon icon solid ' + (sectionName === '成长故事' ? 'fa-seedling' : 'fa-handshake')));
					card.appendChild(createElement('h3', '', item.title));
					card.appendChild(createElement('p', '', item.summary || ''));
					var tags = createElement('div', 'tag-row');
					appendTags(tags, item.tags || []);
					card.appendChild(tags);
					grid.appendChild(card);
				});
				section.appendChild(grid);
				root.appendChild(section);
			});
			notifyRendered();
		});
	}

	function loadTeam() {
		var grid = document.querySelector('[data-sanity-team]');
		if (!grid) return Promise.resolve();
		var query = '*[_type == "teamMember" && enabled != false] | order(order asc, name asc){name,"slug":slug.current,role,summary,tags,avatarPath,"avatarUrl":avatar.asset->url}';
		return apiQuery(query).then(function (members) {
			grid.replaceChildren();
			(members || []).forEach(function (member, index) {
				var card = createElement('a', 'person-card reveal');
				card.href = siteUrl('team/profile-template.html?slug=' + encodeURIComponent(member.slug));
				var avatarUrl = member.avatarUrl || siteUrl(member.avatarPath);
				if (avatarUrl) {
					var image = createElement('img', 'person-avatar');
					image.src = avatarUrl;
					image.alt = member.name + '头像';
					card.appendChild(image);
				} else {
					card.appendChild(createElement('span', 'person-avatar', '成员 ' + String(index + 1).padStart(2, '0')));
				}
				card.appendChild(createElement('h3', '', member.name));
				card.appendChild(createElement('p', '', member.summary || member.role || ''));
				var tags = createElement('div', 'tag-row');
				appendTags(tags, member.tags || []);
				card.appendChild(tags);
				grid.appendChild(card);
			});
			notifyRendered();
		});
	}

	function loadContentDetail() {
		var root = document.querySelector('[data-sanity-content-detail]');
		if (!root) return Promise.resolve();
		var params = new URLSearchParams(window.location.search);
		var type = params.get('type');
		var slugValue = params.get('slug');
		if (!slugValue || ['research', 'community'].indexOf(type) === -1) return Promise.resolve();

		var query = type === 'research'
			? '*[_type == "researchArticle" && slug.current == ' + quote(slugValue) + '][0]{title,summary,author,difficulty,updatedAtText,tags,body,filePath,"fileUrl":file.asset->url,domain->{title,code}}'
			: '*[_type == "communityPost" && slug.current == ' + quote(slugValue) + '][0]{title,summary,author,date,tags,body,section}';

		return apiQuery(query).then(function (item) {
			if (!item) return;
			setText(root, '[data-detail-title]', item.title);
			setText(root, '[data-detail-summary]', item.summary);
			var values = type === 'research'
				? [['类型', item.domain && (item.domain.code || item.domain.title)], ['作者', item.author], ['难度', item.difficulty], ['更新', item.updatedAtText]]
				: [['类型', item.section], ['作者', item.author], ['日期', formatDate(item.date)], ['标签', (item.tags || []).join('、')]];
			root.querySelectorAll('[data-detail-meta]').forEach(function (meta, index) {
				var value = values[index] || ['', ''];
				setText(meta, 'strong', value[0]);
				setText(meta, 'span', value[1] || '待补充');
			});
			renderBlocks(root.querySelector('[data-detail-body]'), item.body, item.summary || '内容待补充。');
			appendTags(root.querySelector('[data-detail-tags]'), (item.domain ? [item.domain.code] : []).concat(item.tags || []));
			var files = root.querySelector('[data-detail-files]');
			if (files) {
				files.replaceChildren();
				var fileUrl = item.fileUrl || siteUrl(item.filePath);
				if (fileUrl) {
					var link = createElement('a', 'button primary', '打开附件');
					link.href = fileUrl;
					link.target = '_blank';
					link.rel = 'noopener noreferrer';
					files.appendChild(link);
				}
			}
			var back = root.querySelector('[data-detail-back]');
			if (back) {
				back.href = siteUrl(type === 'research' ? 'research/index.html' : 'community/index.html');
				back.textContent = type === 'research' ? '← 返回科学研究' : '← 返回科学社区';
			}
			document.title = item.title + ' · 探星阁';
			notifyRendered();
		});
	}

	function loadMemberDetail() {
		var root = document.querySelector('[data-sanity-member-detail]');
		if (!root) return Promise.resolve();
		var slugValue = new URLSearchParams(window.location.search).get('slug');
		if (!slugValue) return Promise.resolve();
		var query = '*[_type == "teamMember" && slug.current == ' + quote(slugValue) + '][0]{name,role,summary,tags,avatarPath,"avatarUrl":avatar.asset->url,bio,education,researchInterests,contentLinks[]{label,url}}';
		return apiQuery(query).then(function (member) {
			if (!member) return;
			setText(root, '[data-member-name]', member.name);
			setText(root, '[data-member-role]', member.role);
			var avatar = root.querySelector('[data-member-avatar]');
			var avatarUrl = member.avatarUrl || siteUrl(member.avatarPath);
			if (avatar && avatarUrl) {
				var image = createElement('img', 'person-avatar');
				image.src = avatarUrl;
				image.alt = member.name + '头像';
				avatar.replaceWith(image);
			}
			appendTags(root.querySelector('[data-member-tags]'), member.tags || []);
			renderBlocks(root.querySelector('[data-member-bio]'), member.bio, member.summary || '待填写。');
			renderBlocks(root.querySelector('[data-member-education]'), member.education, '待填写。');
			renderBlocks(root.querySelector('[data-member-research]'), member.researchInterests, '待填写。');
			var links = root.querySelector('[data-member-links]');
			if (links) {
				links.replaceChildren();
				(member.contentLinks || []).forEach(function (item) {
					var link = createElement('a', 'button', item.label || '查看内容');
					link.href = siteUrl(item.url);
					links.appendChild(link);
				});
				if (!links.childNodes.length) links.appendChild(createElement('p', '', '内容待添加。'));
			}
			document.title = member.name + ' · 团队 · 探星阁';
			notifyRendered();
		});
	}

	function loadVisualizationDetail() {
		var root = document.querySelector('[data-sanity-visual-detail]');
		if (!root) return Promise.resolve();
		var slugValue = new URLSearchParams(window.location.search).get('slug');
		if (!slugValue) return Promise.resolve();
		var query = '*[_type == "visualization" && slug.current == ' + quote(slugValue) + '][0]{title,summary,difficulty,author,relatedCourses,sitePath,externalUrl,instructions,principles,relatedText,domains[]->{title,code}}';
		return apiQuery(query).then(function (item) {
			if (!item) return;
			setText(root, '[data-visual-title]', item.title);
			setText(root, '[data-visual-summary]', item.summary);
			var values = [
				['领域', (item.domains || []).map(function (domain) { return domain.code; }).join('、')],
				['难度', item.difficulty],
				['作者', item.author],
				['关联课程', (item.relatedCourses || []).join('、')],
			];
			root.querySelectorAll('[data-visual-meta]').forEach(function (meta, index) {
				setText(meta, 'strong', values[index][0]);
				setText(meta, 'span', values[index][1] || '待补充');
			});
			var frame = root.querySelector('[data-visual-frame]');
			var open = root.querySelector('[data-visual-open]');
			var source = item.externalUrl || siteUrl(item.sitePath);
			if (frame && source) frame.src = source;
			if (open && source) open.href = source;
			renderBlocks(root.querySelector('[data-visual-instructions]'), item.instructions, '待填写。');
			renderBlocks(root.querySelector('[data-visual-principles]'), item.principles, '待填写。');
			renderBlocks(root.querySelector('[data-visual-related]'), item.relatedText, '内容待添加。');
			document.title = item.title + ' · 可视化实验室 · 探星阁';
			notifyRendered();
		});
	}

	function safely(loader) {
		return Promise.resolve().then(loader).catch(function (error) {
			console.warn('[TanXG Content] 使用本地备用内容：', error);
		});
	}

	function refreshAll() {
		return Promise.all([
			safely(loadPageSettings),
			safely(loadHome),
			safely(loadCourses),
			safely(loadLectureList),
			safely(loadLectureDetail),
			safely(loadResearch),
			safely(loadPopularScience),
			safely(loadVisualizations),
			safely(loadCommunity),
			safely(loadTeam),
			safely(loadContentDetail),
			safely(loadMemberDetail),
			safely(loadVisualizationDetail),
		]);
	}

	function finishContentLoading() {
		if (typeof window.TANXG_FINISH_CONTENT_LOADING === 'function') {
			window.TANXG_FINISH_CONTENT_LOADING();
			return;
		}
		document.documentElement.classList.remove('sanity-loading');
		document.documentElement.classList.add('sanity-ready');
	}

	window.TANXG_SANITY = {
		projectId: PROJECT_ID,
		dataset: DATASET,
		refresh: refreshAll,
	};

	document.addEventListener('DOMContentLoaded', function () {
		refreshAll().then(finishContentLoading, finishContentLoading);
	});
})();
