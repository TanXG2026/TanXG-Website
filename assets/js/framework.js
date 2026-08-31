(function () {
	'use strict';

	function uiText(path) {
		var source = window.TANXG_UI_TEXT || {};
		var value = String(path || '').split('.').reduce(function (current, key) {
			return current && typeof current === 'object' ? current[key] : undefined;
		}, source);
		return value === undefined || value === null ? '' : String(value);
	}

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

	function initHomeScroll() {
		var button = document.querySelector('[data-home-scroll]');
		var target = document.querySelector('#nav');
		if (!button || !target || button.hasAttribute('data-home-scroll-bound')) return;

		button.setAttribute('data-home-scroll-bound', '');
		button.addEventListener('click', function (event) {
			event.preventDefault();
			window.scrollTo({
				top: target.getBoundingClientRect().top + window.pageYOffset,
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
			});
		});
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
				if (button.hasAttribute('data-filter-bound')) return;
				button.setAttribute('data-filter-bound', '');
				button.addEventListener('click', function () {
					setActiveFilter(group, button.getAttribute('data-filter'));
				});
			});
		});

		document.querySelectorAll('[data-domain-filter]').forEach(function (card) {
			if (card.hasAttribute('data-domain-filter-bound')) return;
			card.setAttribute('data-domain-filter-bound', '');
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

		card.appendChild(createTextElement('p', 'card-kicker', course.field || uiText('learning.courseFallback')));
		card.appendChild(createTextElement('h2', '', course.title || uiText('learning.courseFallback')));

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
			if (status) status.textContent = uiText('learning.unavailableText');
			if (empty) empty.hidden = false;
		}
	}

	function initCourseSearch() {
		var input = document.querySelector('[data-course-search]');
		var list = document.querySelector('[data-course-list]');
		if (!input || !list) return;

		var clearButton = document.querySelector('[data-course-search-clear]');
		var status = document.querySelector('.course-search-status');
		var empty = document.querySelector('[data-course-empty]');
		var savedState = getCourseDirectoryHistoryState();
		var scrollFrame = null;

		if (savedState && typeof savedState.query === 'string') {
			input.value = savedState.query;
		}

		function renderResults() {
			var cards = Array.prototype.slice.call(list.querySelectorAll('[data-course-card]'));
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
				status.textContent = query
					? uiText('learning.foundPrefix') + ' ' + visibleCount + ' ' + uiText('learning.countSuffix')
					: visibleCount + ' ' + uiText('learning.countSuffix');
			}
			if (empty) empty.hidden = visibleCount !== 0;
			if (clearButton) clearButton.hidden = !query;
		}

		function renderAndSave() {
			renderResults();
			saveCourseDirectoryHistoryState(input);
		}

		if (!input.hasAttribute('data-course-search-bound')) {
			input.setAttribute('data-course-search-bound', '');
			input.addEventListener('input', renderAndSave);
			input.addEventListener('search', renderAndSave);
			input.addEventListener('keydown', function (event) {
				if (event.key !== 'Escape' || !input.value) return;
				input.value = '';
				renderAndSave();
			});
		}

		if (clearButton && !clearButton.hasAttribute('data-course-clear-bound')) {
			clearButton.setAttribute('data-course-clear-bound', '');
			clearButton.addEventListener('click', function () {
				input.value = '';
				renderAndSave();
				input.focus();
			});
		}

		if (!list.hasAttribute('data-course-list-bound')) {
			list.setAttribute('data-course-list-bound', '');
			list.addEventListener('click', function (event) {
				if (!event.target.closest('[data-course-card]')) return;
				saveCourseDirectoryHistoryState(input);
			});
		}

		if (!document.documentElement.hasAttribute('data-course-history-bound')) {
			document.documentElement.setAttribute('data-course-history-bound', '');
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
		}

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

		if (backLink && params.get('from') === 'directory' && !backLink.hasAttribute('data-history-back-bound')) {
			backLink.setAttribute('data-history-back-bound', '');
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
				item.textContent = value || fallback || uiText('common.emptyValue');
			});
		}

		function renderList(selector, values, renderer) {
			var container = document.querySelector(selector);
			if (!container) return;
			container.replaceChildren();
			(values && values.length ? values : [uiText('common.emptyValue')]).forEach(function (value) {
				container.appendChild(renderer(value));
			});
		}

		function renderPathway(selector, values) {
			var items = values && values.length ? values : [uiText('common.emptyValue')];
			var container = document.querySelector(selector);
			if (!container) return;
			container.classList.toggle('is-single', items.length === 1);
			container.classList.toggle('is-multiple', items.length > 1);
			container.replaceChildren();
			items.forEach(function (value) {
				container.appendChild(createTextElement('span', 'pathway-node', value));
			});
		}

		setText('[data-course-title]', selected.title, uiText('learning.courseFallback'));
		setText('[data-course-stage]', selected.stage);
		setText('[data-course-nature]', selected.nature);
		setText('[data-course-hours]', selected.hours);
		setText('[data-course-content]', selected.content, uiText('learning.summaryFallback'));

		renderPathway('[data-course-prerequisites]', selected.prerequisites);
		renderPathway('[data-course-followups]', selected.followups);
		renderList('[data-course-textbooks]', selected.textbooks, function (book) {
			var item = document.createElement('li');
			if (typeof book === 'string') {
				item.appendChild(createTextElement('strong', '', book));
				return item;
			}
			item.appendChild(createTextElement('strong', '', book.title || uiText('learning.textbookFallback')));
			item.appendChild(createTextElement('span', '', book.author || uiText('learning.authorFallback')));
			return item;
		});

		document.title = (selected.title || uiText('learning.courseFallback')) + ' · ' + uiText('global.navLearning') + ' · ' + uiText('global.titleSuffix');
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
		initHomeScroll();
		initCourseDirectory();
		initCourseTemplate();
		document.documentElement.classList.add('reveal-ready');
		initReveal();
		initAccordions();
		initFilters();
		initCourseSearch();
		initFullscreen();
	});

	document.addEventListener('tanxg:courses-updated', function () {
		initCourseDirectory();
		initCourseTemplate();
		initCourseSearch();
		initReveal();
	});

	document.addEventListener('tanxg:content-rendered', function () {
		initReveal();
		initFilters();
	});
})();
