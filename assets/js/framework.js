(function () {
	'use strict';

	function initReveal() {
		var items = document.querySelectorAll('.reveal');
		if (!items.length) return;

		if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			items.forEach(function (item) { item.classList.add('is-visible'); });
			return;
		}

		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				entry.target.classList.add('is-visible');
				observer.unobserve(entry.target);
			});
		}, { threshold: 0.12 });

		items.forEach(function (item) { observer.observe(item); });
	}

	function initAccordions() {
		document.querySelectorAll('[data-accordion]').forEach(function (accordion) {
			var single = accordion.hasAttribute('data-accordion-single');
			var triggers = accordion.querySelectorAll('[data-accordion-trigger]');

			triggers.forEach(function (trigger) {
				trigger.addEventListener('click', function () {
					var willOpen = trigger.getAttribute('aria-expanded') !== 'true';

					if (single) {
						triggers.forEach(function (other) {
							other.setAttribute('aria-expanded', 'false');
						});
					}

					trigger.setAttribute('aria-expanded', String(willOpen));
				});
			});
		});
	}

	function applyFilter(group, value) {
		var targetSelector = group.getAttribute('data-filter-target');
		var target = targetSelector ? document.querySelector(targetSelector) : group.parentElement;
		if (!target) return;

		var visibleCount = 0;
		target.querySelectorAll('[data-filter-card]').forEach(function (card) {
			var tags = (card.getAttribute('data-tags') || '').split(/\s+/);
			var show = value === 'all' || tags.indexOf(value) !== -1;
			card.hidden = !show;
			if (show) visibleCount += 1;
		});

		target.querySelectorAll('[data-empty-state]').forEach(function (empty) {
			empty.hidden = visibleCount !== 0;
		});
	}

	function setActiveFilter(group, value) {
		group.querySelectorAll('[data-filter]').forEach(function (button) {
			var active = button.getAttribute('data-filter') === value;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-pressed', String(active));
		});
		applyFilter(group, value);
	}

	function initFilters() {
		document.querySelectorAll('[data-filter-group]').forEach(function (group) {
			group.querySelectorAll('[data-filter]').forEach(function (button) {
				button.addEventListener('click', function () {
					setActiveFilter(group, button.getAttribute('data-filter'));
				});
			});
		});

		document.querySelectorAll('[data-domain-filter]').forEach(function (card) {
			card.addEventListener('click', function () {
				var value = card.getAttribute('data-domain-filter');
				var group = document.querySelector('[data-filter-group="research"]');
				if (!group) return;

				document.querySelectorAll('[data-domain-filter]').forEach(function (other) {
					other.classList.toggle('is-active', other === card);
					other.setAttribute('aria-pressed', String(other === card));
				});

				setActiveFilter(group, value);
				document.querySelector('#research-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
			});
		});
	}

	function normalizeCourseQuery(value) {
		return (value || '').toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim();
	}

	function getCourseData() {
		return Array.isArray(window.TANXG_COURSES) ? window.TANXG_COURSES : [];
	}

	function getCourseDirectoryHistoryState() {
		var state = window.history.state;
		if (!state || typeof state !== 'object' || !state.courseDirectory) return null;
		return state.courseDirectory;
	}

	function saveCourseDirectoryHistoryState(input) {
		if (!window.history || !window.history.replaceState) return;

		var currentState = window.history.state;
		var nextState = currentState && typeof currentState === 'object'
			? Object.assign({}, currentState)
			: {};

		nextState.courseDirectory = {
			query: input ? input.value : '',
			scrollY: window.scrollY || window.pageYOffset || 0
		};
		window.history.replaceState(nextState, document.title, window.location.href);
	}

	function createTextElement(tagName, className, textValue) {
		var element = document.createElement(tagName);
		if (className) element.className = className;
		element.textContent = textValue || '';
		return element;
	}

	function createCourseCard(course) {
		var card = document.createElement('a');
		var searchParts = [course.title, course.stage, course.field, course.nature];

		card.className = 'content-card course-card reveal';
		card.href = 'course-template.html?id=' + encodeURIComponent(course.id) + '&from=directory';
		card.setAttribute('data-course-card', '');
		card.setAttribute('data-course-search-text', searchParts.join(' '));

		card.appendChild(createTextElement('p', 'card-kicker', course.field || '课程'));
		card.appendChild(createTextElement('h2', '', course.title || '未命名课程'));

		var tags = createTextElement('div', 'tag-row', '');
		[course.stage].filter(Boolean).forEach(function (tag) {
			tags.appendChild(createTextElement('span', 'tag', tag));
		});
		card.appendChild(tags);
		return card;
	}

	function initCourseDirectory() {
		var list = document.querySelector('[data-course-list]');
		if (!list) return;

		var courses = getCourseData();
		var fragment = document.createDocumentFragment();
		courses.forEach(function (course) {
			fragment.appendChild(createCourseCard(course));
		});
		list.replaceChildren(fragment);

		if (!courses.length) {
			var status = document.querySelector('.course-search-status');
			var empty = document.querySelector('[data-course-empty]');
			if (status) status.textContent = '课程资料暂时无法载入';
			if (empty) empty.hidden = false;
		}
	}

	function initCourseSearch() {
		var input = document.querySelector('[data-course-search]');
		var list = document.querySelector('[data-course-list]');
		if (!input || !list) return;

		var cards = Array.prototype.slice.call(list.querySelectorAll('[data-course-card]'));
		var clearButton = document.querySelector('[data-course-search-clear]');
		var status = document.querySelector('.course-search-status');
		var empty = document.querySelector('[data-course-empty]');
		var savedState = getCourseDirectoryHistoryState();
		var scrollFrame = null;

		if (savedState && typeof savedState.query === 'string') {
			input.value = savedState.query;
		}

		function renderResults() {
			var query = normalizeCourseQuery(input.value);
			var terms = query ? query.split(' ') : [];
			var visibleCount = 0;

			cards.forEach(function (card) {
				var searchText = normalizeCourseQuery((card.getAttribute('data-course-search-text') || '') + ' ' + card.textContent);
				var show = terms.every(function (term) { return searchText.indexOf(term) !== -1; });
				card.hidden = !show;
				if (show) visibleCount += 1;
			});

			if (status) {
				status.textContent = query ? '找到 ' + visibleCount + ' 门课程' : visibleCount + ' 门课程';
			}
			if (empty) empty.hidden = visibleCount !== 0;
			if (clearButton) clearButton.hidden = !query;
		}

		function renderAndSave() {
			renderResults();
			saveCourseDirectoryHistoryState(input);
		}

		input.addEventListener('input', renderAndSave);
		input.addEventListener('search', renderAndSave);
		input.addEventListener('keydown', function (event) {
			if (event.key !== 'Escape' || !input.value) return;
			input.value = '';
			renderAndSave();
		});

		if (clearButton) {
			clearButton.addEventListener('click', function () {
				input.value = '';
				renderAndSave();
				input.focus();
			});
		}

		cards.forEach(function (card) {
			card.addEventListener('click', function () {
				saveCourseDirectoryHistoryState(input);
			});
		});

		window.addEventListener('scroll', function () {
			if (scrollFrame !== null) return;
			scrollFrame = window.requestAnimationFrame(function () {
				scrollFrame = null;
				saveCourseDirectoryHistoryState(input);
			});
		}, { passive: true });

		window.addEventListener('pagehide', function () {
			saveCourseDirectoryHistoryState(input);
		});

		renderResults();

		if (savedState && Number.isFinite(Number(savedState.scrollY))) {
			window.requestAnimationFrame(function () {
				window.requestAnimationFrame(function () {
					window.scrollTo(0, Number(savedState.scrollY));
				});
			});
		}
	}

	function initCourseTemplate() {
		if (!document.querySelector('[data-course-template]')) return;

		var params = new URLSearchParams(window.location.search);
		var id = params.get('id');
		var selected = getCourseData().find(function (item) { return item.id === id; });
		var backLink = document.querySelector('[data-course-back]');

		if (backLink && params.get('from') === 'directory') {
			backLink.addEventListener('click', function (event) {
				if (window.history.length <= 1) return;
				event.preventDefault();
				window.history.back();
			});
		}

		if (!selected && params.get('course')) {
			selected = {
				title: params.get('course'),
				stage: params.get('stage')
			};
		}
		if (!selected) return;

		function setText(selector, value, fallback) {
			document.querySelectorAll(selector).forEach(function (item) {
				item.textContent = value || fallback || '待补充';
			});
		}

		function renderList(selector, values, renderer) {
			var container = document.querySelector(selector);
			if (!container) return;
			container.replaceChildren();
			(values && values.length ? values : ['待补充']).forEach(function (value) {
				container.appendChild(renderer(value));
			});
		}

		function renderPathway(selector, values) {
			var items = values && values.length ? values : ['待补充'];
			var container = document.querySelector(selector);
			if (!container) return;
			container.classList.toggle('is-single', items.length === 1);
			container.classList.toggle('is-multiple', items.length > 1);
			container.replaceChildren();
			items.forEach(function (value) {
				container.appendChild(createTextElement('span', 'pathway-node', value));
			});
		}

		setText('[data-course-title]', selected.title, '课程名称');
		setText('[data-course-stage]', selected.stage);
		setText('[data-course-nature]', selected.nature);
		setText('[data-course-hours]', selected.hours);
		setText('[data-course-content]', selected.content, '内容简介待补充。');

		renderPathway('[data-course-prerequisites]', selected.prerequisites);
		renderPathway('[data-course-followups]', selected.followups);
		renderList('[data-course-textbooks]', selected.textbooks, function (book) {
			var item = document.createElement('li');
			if (typeof book === 'string') {
				item.appendChild(createTextElement('strong', '', book));
				return item;
			}
			item.appendChild(createTextElement('strong', '', book.title || '教材待补充'));
			item.appendChild(createTextElement('span', '', book.author || '作者与版本待补充'));
			return item;
		});

		document.title = (selected.title || '课程详情') + ' · 课程检索 · 探星阁';
	}

	function initFullscreen() {
		document.querySelectorAll('[data-fullscreen-target]').forEach(function (button) {
			var selector = button.getAttribute('data-fullscreen-target');
			var target = selector ? document.querySelector(selector) : null;
			if (!target || !target.requestFullscreen) {
				button.hidden = true;
				return;
			}

			button.addEventListener('click', function () {
				target.requestFullscreen();
			});
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		initCourseDirectory();
		initCourseTemplate();
		document.documentElement.classList.add('reveal-ready');
		initReveal();
		initAccordions();
		initFilters();
		initCourseSearch();
		initFullscreen();
	});
})();
