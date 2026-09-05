(function () {
	'use strict';

	var PROJECT_ID = 'o9vxg32e';
	var DATASET = 'production';
	var API_VERSION = '2026-08-30';
	var UI_TEXT = {};
	var loadErrors = [];
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

	function valueAtPath(source, path) {
		return String(path || '').split('.').reduce(function (value, key) {
			return value && typeof value === 'object' ? value[key] : undefined;
		}, source);
	}

	function uiText(path) {
		var value = valueAtPath(UI_TEXT, path);
		return value === undefined || value === null ? '' : String(value);
	}

	function applyUiSettings(settings) {
		UI_TEXT = settings || {};
		window.TANXG_UI_TEXT = UI_TEXT;

		document.querySelectorAll('[data-ui-text]').forEach(function (element) {
			element.textContent = uiText(element.getAttribute('data-ui-text'));
		});
		document.querySelectorAll('[data-ui-placeholder]').forEach(function (element) {
			element.setAttribute('placeholder', uiText(element.getAttribute('data-ui-placeholder')));
		});
		document.querySelectorAll('[data-ui-alt]').forEach(function (element) {
			element.setAttribute('alt', uiText(element.getAttribute('data-ui-alt')));
		});
		document.querySelectorAll('[data-ui-list]').forEach(function (element) {
			var values = valueAtPath(UI_TEXT, element.getAttribute('data-ui-list'));
			element.replaceChildren();
			(Array.isArray(values) ? values : []).forEach(function (value) {
				element.appendChild(createElement('li', '', value));
			});
		});

		var description = document.querySelector('meta[name="description"]');
		if (description) description.setAttribute('content', uiText('global.metaDescription'));
	}

	function detectPageKey() {
		var hero = document.querySelector('[data-sanity-page]');
		if (hero) return hero.getAttribute('data-sanity-page') || '';

		if (document.querySelector('[data-course-list], [data-course-template]')) return 'learning';
		if (document.querySelector('[data-sanity-lecture-level], [data-sanity-lecture-detail]')) return 'courses';
		if (document.querySelector('[data-sanity-research-domains], [data-sanity-research-cards]')) return 'research';
		if (document.querySelector('[data-sanity-popsci]')) return 'popsci';
		if (document.querySelector('[data-sanity-visualizations], [data-sanity-visual-detail]')) return 'visualizations';
		if (document.querySelector('[data-sanity-community]')) return 'community';
		if (document.querySelector('[data-sanity-team], [data-sanity-member-detail]')) return 'team';

		if (document.querySelector('[data-sanity-content-detail]')) {
			var detailType = new URLSearchParams(window.location.search).get('type');
			if (detailType === 'research' || detailType === 'community') return detailType;
		}

		return '';
	}

	function loadUiSettings() {
		var pageKey = detectPageKey();
		var pageFields = {
			learning: 'learningInterface',
			courses: 'coursesInterface',
			research: 'researchInterface',
			visualizations: 'visualizationsInterface',
			popsci: 'popsciInterface',
			community: 'communityInterface',
			team: 'teamInterface'
		};
		var pageQuery = pageKey
			? '*[_id == ' + quote('pageSettings-' + pageKey) + '][0]'
			: 'null';
		var query = '{"site": *[_id == "siteSettings-main"][0]{globalInterface,homeInterface}, "page": ' + pageQuery + '}';

		return apiQuery(query).then(function (result) {
			var site = result && result.site;
			var page = result && result.page;
			if (!site) throw new Error('Missing siteSettings-main');
			if (pageKey && !page) throw new Error('Missing pageSettings-' + pageKey);

			var fieldName = pageFields[pageKey];
			var pageInterface = fieldName && page ? page[fieldName] || {} : site.homeInterface || {};
			applyUiSettings({
				global: site.globalInterface || {},
				common: pageInterface,
				learning: pageInterface,
				lectures: pageInterface,
				research: pageInterface,
				popsci: pageInterface,
				visualizations: pageInterface,
				team: pageInterface,
				detail: pageInterface
			});
		});
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

	function sanityImagePresentation(image) {
		var presentation = { url: image && image.url ? image.url : '', position: '' };
		if (!presentation.url || !image) return presentation;

		var crop = image.crop;
		var dimensions = image.dimensions;
		if (crop && dimensions && dimensions.width && dimensions.height) {
			var left = Number(crop.left) || 0;
			var right = Number(crop.right) || 0;
			var top = Number(crop.top) || 0;
			var bottom = Number(crop.bottom) || 0;
			var cropWidthRatio = Math.max(0.001, 1 - left - right);
			var cropHeightRatio = Math.max(0.001, 1 - top - bottom);
			var rectangle = [
				Math.round(left * dimensions.width),
				Math.round(top * dimensions.height),
				Math.max(1, Math.round(cropWidthRatio * dimensions.width)),
				Math.max(1, Math.round(cropHeightRatio * dimensions.height)),
			];

			try {
				var transformed = new URL(presentation.url);
				transformed.searchParams.set('rect', rectangle.join(','));
				transformed.searchParams.set('w', '1200');
				transformed.searchParams.set('fit', 'max');
				transformed.searchParams.set('auto', 'format');
				presentation.url = transformed.href;
			} catch (error) {
				// Keep the original image URL if a transformation URL cannot be created.
			}

		}

		if (image.hotspot) {
			var visibleLeft = crop ? Number(crop.left) || 0 : 0;
			var visibleTop = crop ? Number(crop.top) || 0 : 0;
			var visibleWidth = crop ? Math.max(0.001, 1 - visibleLeft - (Number(crop.right) || 0)) : 1;
			var visibleHeight = crop ? Math.max(0.001, 1 - visibleTop - (Number(crop.bottom) || 0)) : 1;
			var x = ((Number(image.hotspot.x) || 0.5) - visibleLeft) / visibleWidth;
			var y = ((Number(image.hotspot.y) || 0.5) - visibleTop) / visibleHeight;
			presentation.position = Math.max(0, Math.min(100, x * 100)) + '% ' + Math.max(0, Math.min(100, y * 100)) + '%';
		}

		return presentation;
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
			if (page.title) document.title = page.title + ' · ' + uiText('global.titleSuffix');
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
					var contact = createElement('p', '', uiText('global.contactPrefix'));
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
					card.appendChild(createElement('h2', '', item.title || uiText('common.newsFallback')));
					card.appendChild(createElement('p', '', item.summary || ''));
					news.appendChild(card);
				});
			}
			document.title = uiText('global.homeTitle');
			notifyRendered();
		});
	}

	function loadCourses() {
		if (!document.querySelector('[data-course-list], [data-course-template]')) return Promise.resolve();
		var query = '*[_type == "course" && enabled != false] | order(order asc, title asc){"id": slug.current,title,stage,field,nature,hours,"content": summary,prerequisites,followups,textbooks[]{title,author}}';
		return apiQuery(query).then(function (courses) {
			window.TANXG_COURSES = Array.isArray(courses) ? courses : [];
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
			image.alt = (lecture.title || uiText('common.unnamedLecture')) + uiText('common.coverSuffix');
			image.loading = 'lazy';
			card.appendChild(image);
		}
		var body = createElement('div', 'lecture-card-body');
		body.appendChild(createElement('p', 'card-kicker', lecture.term || uiText('common.emptyValue')));
		body.appendChild(createElement('h3', '', lecture.title || uiText('common.unnamedLecture')));
		body.appendChild(createElement('p', '', lecture.summary || ''));
		var tags = createElement('div', 'tag-row');
		appendTags(tags, [lecture.level, lecture.language || uiText('common.pdfLabel')]);
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
					empty.appendChild(createElement('p', '', level + uiText('lectures.emptySuffix')));
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
		var query = '*[_type == "lectureNote" && slug.current == ' + quote(slugValue) + '][0]{title,"slug":slug.current,level,term,language,summary,coverPath,"coverUrl":cover.asset->url,body,outlineIntro,outline,feedback,downloads[]{label,filePath,"fileUrl":file.asset->url}}';
		return apiQuery(query).then(function (lecture) {
			if (!lecture) return;
			setText(root, '[data-lecture-term]', lecture.term);
			setText(root, '[data-lecture-title]', lecture.title);
			setText(root, '[data-lecture-summary]', lecture.summary);
			var cover = root.querySelector('[data-lecture-cover]');
			var coverUrl = lecture.coverUrl || siteUrl(lecture.coverPath);
			if (cover && coverUrl) {
				cover.src = coverUrl;
				cover.alt = (lecture.title || uiText('common.unnamedLecture')) + uiText('common.coverSuffix');
				cover.hidden = false;
			}
			appendTags(root.querySelector('[data-lecture-tags]'), [lecture.level, lecture.language]);
			renderBlocks(root.querySelector('[data-lecture-body]'), lecture.body, lecture.summary || uiText('lectures.summaryFallback'));
			setText(root, '[data-lecture-outline-intro]', lecture.outlineIntro);

			var outline = root.querySelector('[data-lecture-outline]');
			if (outline) {
				outline.replaceChildren();
				(Array.isArray(lecture.outline) ? lecture.outline : []).forEach(function (item) { outline.appendChild(createElement('li', '', item)); });
				if (!outline.childNodes.length) outline.appendChild(createElement('li', '', uiText('lectures.outlineFallback')));
			}

			var feedbackSection = root.querySelector('[data-lecture-feedback-section]');
			if (feedbackSection) {
				feedbackSection.hidden = !Array.isArray(lecture.feedback) || lecture.feedback.length === 0;
				if (!feedbackSection.hidden) renderBlocks(feedbackSection.querySelector('[data-lecture-feedback]'), lecture.feedback, '');
			}

			var downloads = root.querySelector('[data-lecture-downloads]');
			if (downloads) {
				downloads.replaceChildren();
				(Array.isArray(lecture.downloads) ? lecture.downloads : []).forEach(function (download) {
					var link = createElement('a', 'button primary', download.label || uiText('common.downloadFileLabel'));
					link.href = download.fileUrl || siteUrl(download.filePath);
					link.target = '_blank';
					link.rel = 'noopener noreferrer';
					downloads.appendChild(link);
				});
				if (!downloads.childNodes.length) downloads.appendChild(createElement('p', '', uiText('lectures.fileFallback')));
			}
			document.title = lecture.title + ' · ' + uiText('global.titleSuffix');
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
				filters.replaceChildren(filterButton('all', uiText('common.allLabel'), true));
				domains.forEach(function (domain) { filters.appendChild(filterButton(domain.key, domain.code, false)); });
			}

			cardsContainer.replaceChildren();
			articles.forEach(function (article) {
				var card = createElement('a', 'content-card filter-card reveal');
				var domain = article.domain || {};
				card.setAttribute('data-filter-card', '');
				card.setAttribute('data-tags', domain.key || '');
				card.href = article.externalUrl || siteUrl('content-template.html?type=research&slug=' + encodeURIComponent(article.slug));
				card.appendChild(createElement('p', 'card-kicker', domain.code || uiText('common.researchFallback')));
				card.appendChild(createElement('h3', '', article.title || uiText('common.unnamedTopic')));
				card.appendChild(createElement('p', '', article.summary || ''));
				var tags = createElement('div', 'tag-row');
				appendTags(tags, [domain.code].concat(article.tags || []));
				card.appendChild(tags);
				cardsContainer.appendChild(card);
			});
			var empty = createElement('p', 'empty-state', uiText('research.emptyText'));
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
						image.alt = item.title + uiText('common.coverSuffix');
						image.loading = 'lazy';
						card.appendChild(image);
					}
					var body = createElement('div', 'resource-card-body');
					body.appendChild(createElement('h3', '', item.title));
					if (item.summary) body.appendChild(createElement('p', '', item.summary));
					var tags = createElement('div', 'tag-row');
					appendTags(tags, [item.category, uiText('common.pdfLabel')]);
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
		var query = '*[_type == "visualization" && enabled != false] | order(order asc, title asc){title,"slug":slug.current,summary,author,relatedCourses,sitePath,externalUrl,"previewImage":previewImage{"url":asset->url,crop,hotspot,"dimensions":asset->metadata.dimensions},domains[]->{title,code,"key":key.current}}';
		return apiQuery(query).then(function (items) {
			var domains = [];
			(items || []).forEach(function (item) {
				(item.domains || []).forEach(function (domain) {
					if (!domains.some(function (existing) { return existing.key === domain.key; })) domains.push(domain);
				});
			});
			var filters = document.querySelector('[data-sanity-visualization-filters]');
			if (filters) {
				filters.replaceChildren(filterButton('all', uiText('common.allLabel'), true));
				domains.forEach(function (domain) { filters.appendChild(filterButton(domain.key, domain.code, false)); });
			}

			cardsContainer.replaceChildren();
			(items || []).forEach(function (item) {
				var card = createElement('a', 'content-card filter-card reveal');
				var domainKeys = (item.domains || []).map(function (domain) { return domain.key; });
				card.setAttribute('data-filter-card', '');
				card.setAttribute('data-tags', domainKeys.join(' '));
				card.href = siteUrl('visualization-template.html?slug=' + encodeURIComponent(item.slug));
				var preview = sanityImagePresentation(item.previewImage);
				if (preview.url) {
					var image = createElement('img', 'resource-card-cover');
					image.src = preview.url;
					if (preview.position) image.style.objectPosition = preview.position;
					image.alt = item.title + uiText('common.previewSuffix');
					image.loading = 'lazy';
					card.appendChild(image);
				} else {
					card.appendChild(createElement('div', 'visual-placeholder', uiText('visualizations.previewPlaceholder')));
				}
				card.appendChild(createElement('h3', '', item.title || uiText('common.unnamedVisualization')));
				card.appendChild(createElement('p', '', item.summary || ''));
				var tags = createElement('div', 'tag-row');
				appendTags(tags, (item.domains || []).map(function (domain) { return domain.code; }));
				card.appendChild(tags);
				cardsContainer.appendChild(card);
			});
			var empty = createElement('p', 'empty-state', uiText('visualizations.emptyText'));
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
					image.alt = member.name + uiText('common.avatarSuffix');
					card.appendChild(image);
				} else {
					card.appendChild(createElement('span', 'person-avatar', uiText('team.avatarPrefix') + ' ' + String(index + 1).padStart(2, '0')));
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
				? [[uiText('detail.typeLabel'), item.domain && (item.domain.code || item.domain.title)], [uiText('detail.authorLabel'), item.author], [uiText('detail.difficultyLabel'), item.difficulty], [uiText('detail.updatedLabel'), item.updatedAtText]]
				: [[uiText('detail.typeLabel'), item.section], [uiText('detail.authorLabel'), item.author], [uiText('detail.dateLabel'), formatDate(item.date)], [uiText('detail.tagsLabel'), (item.tags || []).join('、')]];
			root.querySelectorAll('[data-detail-meta]').forEach(function (meta, index) {
				var value = values[index] || ['', ''];
				setText(meta, 'strong', value[0]);
				setText(meta, 'span', value[1] || uiText('common.emptyValue'));
			});
			renderBlocks(root.querySelector('[data-detail-body]'), item.body, item.summary || uiText('detail.bodyFallback'));
			appendTags(root.querySelector('[data-detail-tags]'), (item.domain ? [item.domain.code] : []).concat(item.tags || []));
			var files = root.querySelector('[data-detail-files]');
			if (files) {
				files.replaceChildren();
				var fileUrl = item.fileUrl || siteUrl(item.filePath);
				if (fileUrl) {
					var link = createElement('a', 'button primary', uiText('detail.openFileLabel'));
					link.href = fileUrl;
					link.target = '_blank';
					link.rel = 'noopener noreferrer';
					files.appendChild(link);
				}
			}
			var back = root.querySelector('[data-detail-back]');
			if (back) {
				back.href = siteUrl(type === 'research' ? 'research/index.html' : 'community/index.html');
					back.textContent = uiText('detail.backLabel');
			}
			document.title = item.title + ' · ' + uiText('global.titleSuffix');
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
				image.alt = member.name + uiText('common.avatarSuffix');
				avatar.replaceWith(image);
			}
			appendTags(root.querySelector('[data-member-tags]'), member.tags || []);
			renderBlocks(root.querySelector('[data-member-bio]'), member.bio, member.summary || uiText('common.emptyValue'));
			renderBlocks(root.querySelector('[data-member-education]'), member.education, uiText('common.emptyValue'));
			renderBlocks(root.querySelector('[data-member-research]'), member.researchInterests, uiText('common.emptyValue'));
			var links = root.querySelector('[data-member-links]');
			if (links) {
				links.replaceChildren();
				(member.contentLinks || []).forEach(function (item) {
					var link = createElement('a', 'button', item.label || uiText('common.viewContentLabel'));
					link.href = siteUrl(item.url);
					links.appendChild(link);
				});
				if (!links.childNodes.length) links.appendChild(createElement('p', '', uiText('team.emptyLinks')));
			}
			document.title = member.name + ' · ' + uiText('global.navTeam') + ' · ' + uiText('global.titleSuffix');
			notifyRendered();
		});
	}

	function loadVisualizationDetail() {
		var root = document.querySelector('[data-sanity-visual-detail]');
		if (!root) return Promise.resolve();
		var slugValue = new URLSearchParams(window.location.search).get('slug');
		if (!slugValue) return Promise.resolve();
		var query = '*[_type == "visualization" && slug.current == ' + quote(slugValue) + '][0]{title,summary,sitePath,externalUrl,instructions,"principlesPdfUrl":principlesPdf.asset->url}';
		return apiQuery(query).then(function (item) {
			if (!item) return;
			setText(root, '[data-visual-title]', item.title);
			setText(root, '[data-visual-summary]', item.summary);
			var frame = root.querySelector('[data-visual-frame]');
			var open = root.querySelector('[data-visual-open]');
			var source = item.externalUrl || siteUrl(item.sitePath);
			if (frame) {
				frame.title = item.title || uiText('common.unnamedVisualization');
				if (source) frame.src = source;
			}
			if (open && source) open.href = source;
			renderBlocks(root.querySelector('[data-visual-instructions]'), item.instructions, uiText('common.emptyValue'));
			var principlesSection = root.querySelector('[data-visual-principles-section]');
			var principlesLink = root.querySelector('[data-visual-principles-pdf]');
			if (principlesSection && principlesLink && item.principlesPdfUrl) {
				principlesLink.href = item.principlesPdfUrl;
				principlesSection.hidden = false;
			}
			document.title = item.title + ' · ' + uiText('global.navVisualizations') + ' · ' + uiText('global.titleSuffix');
			notifyRendered();
		});
	}

	function safely(loader) {
		return Promise.resolve().then(loader).catch(function (error) {
			loadErrors.push(error);
			console.warn('[TanXG Content] 内容加载失败：', error);
		});
	}

	function showLoadError(error) {
		console.warn('[TanXG Content] 无法载入页面：', error);
		var main = document.querySelector('#main');
		if (!main) return;
		var state = createElement('div', 'empty-state', uiText('common.loadError') || '内容加载失败，请刷新页面重试。');
		main.replaceChildren(state);
	}

	function refreshAll() {
		loadErrors = [];
		return loadUiSettings().then(function () {
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
		}).then(function () {
			if (loadErrors.length) showLoadError(loadErrors[0]);
		});
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
		refreshAll().then(finishContentLoading, function (error) {
			showLoadError(error);
			finishContentLoading();
		});
	});
})();
