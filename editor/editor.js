(function () {
	'use strict';

	var DRAFT_KEY = 'tanxg-course-editor-draft-v1';
	var MAX_HISTORY = 40;
	var draftTimer = null;
	var toastTimer = null;
	var draggedCourseId = null;

	function deepClone(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function list(value) {
		return Array.isArray(value) ? value : [];
	}

	function normalizeCourse(course, index) {
		return {
			id: String(course.id || ('course-' + Date.now() + '-' + index)),
			title: String(course.title || '未命名课程'),
			stage: String(course.stage || ''),
			field: String(course.field || ''),
			nature: String(course.nature || ''),
			hours: String(course.hours || ''),
			prerequisites: list(course.prerequisites).map(String),
			followups: list(course.followups).map(String),
			content: String(course.content || (Array.isArray(course.topics) ? course.topics.join('、') : '')),
			textbooks: list(course.textbooks).map(function (book) {
				if (typeof book === 'string') return { title: book, author: '' };
				return { title: String(book.title || ''), author: String(book.author || '') };
			})
		};
	}

	var initialCourses = Array.isArray(window.TANXG_COURSES) ? window.TANXG_COURSES : [];
	var state = {
		courses: initialCourses.map(normalizeCourse),
		selectedId: initialCourses.length ? String(initialCourses[0].id) : null,
		dirty: false,
		history: [],
		serverSnapshot: JSON.stringify(initialCourses.map(normalizeCourse))
	};

	var elements = {
		grid: document.querySelector('[data-editor-course-grid]'),
		empty: document.querySelector('[data-editor-empty]'),
		search: document.querySelector('[data-editor-search]'),
		form: document.querySelector('[data-course-form]'),
		inspectorEmpty: document.querySelector('[data-inspector-empty]'),
		inspectorTitle: document.querySelector('[data-inspector-title]'),
		previewCourse: document.querySelector('[data-preview-course]'),
		save: document.querySelector('[data-save]'),
		saveState: document.querySelector('[data-save-state]'),
		undo: document.querySelector('[data-undo]'),
		add: document.querySelector('[data-add-course]'),
		deleteCourse: document.querySelector('[data-delete-course]'),
		toast: document.querySelector('[data-toast]'),
		draftBanner: document.querySelector('[data-draft-banner]'),
		restoreDraft: document.querySelector('[data-restore-draft]'),
		discardDraft: document.querySelector('[data-discard-draft]')
	};

	function selectedCourse() {
		return state.courses.find(function (course) { return course.id === state.selectedId; }) || null;
	}

	function normalizeSearch(value) {
		return String(value || '').toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim();
	}

	function splitLines(value) {
		return String(value || '').split(/\n/).map(function (item) { return item.trim(); }).filter(Boolean);
	}

	function parseBooks(value) {
		return splitLines(value).map(function (line) {
			var parts = line.split('|');
			return {
				title: (parts.shift() || '').trim(),
				author: parts.join('|').trim()
			};
		}).filter(function (book) { return book.title || book.author; });
	}

	function formatBooks(books) {
		return list(books).map(function (book) {
			return [book.title || '', book.author || ''].filter(Boolean).join(' | ');
		}).join('\n');
	}

	function fieldValue(course, field, mode) {
		var value = course[field];
		if (mode === 'lines') return list(value).join('\n');
		if (mode === 'books') return formatBooks(value);
		return value || '';
	}

	function readField(input) {
		var mode = input.getAttribute('data-list-field');
		if (mode === 'lines') return splitLines(input.value);
		if (mode === 'books') return parseBooks(input.value);
		return input.value;
	}

	function setSaveState(type, message) {
		elements.saveState.classList.toggle('is-dirty', type === 'dirty');
		elements.saveState.classList.toggle('is-error', type === 'error');
		elements.saveState.lastChild.nodeValue = message;
	}

	function showToast(message) {
		clearTimeout(toastTimer);
		elements.toast.textContent = message;
		elements.toast.hidden = false;
		toastTimer = window.setTimeout(function () {
			elements.toast.hidden = true;
		}, 2600);
	}

	function saveDraftSoon() {
		clearTimeout(draftTimer);
		draftTimer = window.setTimeout(function () {
			try {
				localStorage.setItem(DRAFT_KEY, JSON.stringify(state.courses));
			} catch (error) {
				setSaveState('error', '草稿暂时无法保存');
			}
		}, 250);
	}

	function markDirty() {
		state.dirty = true;
		setSaveState('dirty', '有尚未保存的修改');
		saveDraftSoon();
	}

	function pushHistory() {
		var snapshot = JSON.stringify(state.courses);
		if (state.history[state.history.length - 1] === snapshot) return;
		state.history.push(snapshot);
		if (state.history.length > MAX_HISTORY) state.history.shift();
		elements.undo.disabled = false;
	}

	function restoreCourses(snapshot) {
		var restored = JSON.parse(snapshot).map(normalizeCourse);
		state.courses = restored;
		if (!selectedCourse()) state.selectedId = restored.length ? restored[0].id : null;
		markDirty();
		renderAll();
	}

	function undo() {
		if (!state.history.length) return;
		var snapshot = state.history.pop();
		restoreCourses(snapshot);
		elements.undo.disabled = state.history.length === 0;
		showToast('已撤销上一步修改');
	}

	function createElement(tagName, className, text) {
		var element = document.createElement(tagName);
		if (className) element.className = className;
		if (typeof text !== 'undefined') element.textContent = text;
		return element;
	}

	function updateInspectorField(field, value) {
		if (!elements.form || !selectedCourse()) return;
		var input = elements.form.querySelector('[data-field="' + field + '"]');
		if (input) input.value = value;
		if (field === 'title') {
			elements.inspectorTitle.textContent = value || '未命名课程';
		}
	}

	function bindInlineEditor(element, course, field) {
		element.contentEditable = 'true';
		element.spellcheck = false;

		element.addEventListener('focus', function () {
			selectCourse(course.id);
			if (!element.hasAttribute('data-history-captured')) {
				pushHistory();
				element.setAttribute('data-history-captured', 'true');
			}
		});

		element.addEventListener('keydown', function (event) {
			if (event.key !== 'Enter') return;
			event.preventDefault();
			element.blur();
		});

		element.addEventListener('paste', function (event) {
			event.preventDefault();
			var text = (event.clipboardData || window.clipboardData).getData('text/plain');
			document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
		});

		element.addEventListener('input', function () {
			course[field] = element.textContent;
			updateInspectorField(field, course[field]);
			markDirty();
		});

		element.addEventListener('blur', function () {
			element.removeAttribute('data-history-captured');
			course[field] = element.textContent.replace(/\s+/g, ' ').trim();
			if (field === 'title' && !course[field]) course[field] = '未命名课程';
			element.textContent = course[field];
			updateInspectorField(field, course[field]);
		});
	}

	function courseMatches(course, query) {
		var terms = normalizeSearch(query).split(' ').filter(Boolean);
		var haystack = normalizeSearch([
			course.title,
			course.stage,
			course.field,
			course.nature
		].join(' '));
		return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
	}

	function moveCourseBefore(sourceId, targetId) {
		if (!sourceId || !targetId || sourceId === targetId) return;
		var sourceIndex = state.courses.findIndex(function (course) { return course.id === sourceId; });
		var targetIndex = state.courses.findIndex(function (course) { return course.id === targetId; });
		if (sourceIndex < 0 || targetIndex < 0) return;

		pushHistory();
		var moved = state.courses.splice(sourceIndex, 1)[0];
		if (sourceIndex < targetIndex) targetIndex -= 1;
		state.courses.splice(targetIndex, 0, moved);
		markDirty();
		renderGrid();
	}

	function createCourseCard(course) {
		var card = createElement('article', 'editor-course-card');
		card.setAttribute('data-editor-card', course.id);
		card.classList.toggle('is-selected', course.id === state.selectedId);

		var handle = createElement('button', 'editor-card-handle fas fa-grip-vertical');
		handle.type = 'button';
		handle.draggable = true;
		handle.title = '拖动排序';
		handle.setAttribute('aria-label', '拖动“' + course.title + '”调整顺序');
		card.appendChild(handle);

		var kicker = createElement('p', 'editor-card-kicker', course.field || '课程');
		var title = createElement('h2', '', course.title || '未命名课程');
		bindInlineEditor(title, course, 'title');
		card.appendChild(kicker);
		card.appendChild(title);
		if (course.stage) card.appendChild(createElement('span', 'editor-card-stage', course.stage));

		card.addEventListener('click', function () { selectCourse(course.id); });
		handle.addEventListener('click', function (event) { event.stopPropagation(); });
		handle.addEventListener('dragstart', function (event) {
			draggedCourseId = course.id;
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', course.id);
		});
		handle.addEventListener('dragend', function () {
			draggedCourseId = null;
			document.querySelectorAll('.is-drag-over').forEach(function (item) {
				item.classList.remove('is-drag-over');
			});
		});
		card.addEventListener('dragover', function (event) {
			if (!draggedCourseId || draggedCourseId === course.id) return;
			event.preventDefault();
			card.classList.add('is-drag-over');
		});
		card.addEventListener('dragleave', function () { card.classList.remove('is-drag-over'); });
		card.addEventListener('drop', function (event) {
			event.preventDefault();
			card.classList.remove('is-drag-over');
			moveCourseBefore(draggedCourseId || event.dataTransfer.getData('text/plain'), course.id);
		});

		return card;
	}

	function renderGrid() {
		var query = elements.search.value;
		var visible = state.courses.filter(function (course) { return courseMatches(course, query); });
		var fragment = document.createDocumentFragment();
		visible.forEach(function (course) { fragment.appendChild(createCourseCard(course)); });
		elements.grid.replaceChildren(fragment);
		elements.empty.hidden = visible.length !== 0;
	}

	function renderInspector() {
		var course = selectedCourse();
		elements.inspectorEmpty.hidden = Boolean(course);
		elements.form.hidden = !course;
		if (!course) return;

		elements.inspectorTitle.textContent = course.title || '未命名课程';
		elements.previewCourse.href = '../learning/course-template.html?id=' + encodeURIComponent(course.id);
		elements.form.querySelectorAll('[data-field]').forEach(function (input) {
			input.value = fieldValue(course, input.getAttribute('data-field'), input.getAttribute('data-list-field'));
		});

		var index = state.courses.indexOf(course);
		elements.form.querySelector('[data-move-course="up"]').disabled = index <= 0;
		elements.form.querySelector('[data-move-course="down"]').disabled = index < 0 || index >= state.courses.length - 1;
	}

	function renderAll() {
		renderGrid();
		renderInspector();
	}

	function selectCourse(id) {
		if (state.selectedId === id) return;
		state.selectedId = id;
		document.querySelectorAll('[data-editor-card]').forEach(function (card) {
			card.classList.toggle('is-selected', card.getAttribute('data-editor-card') === id);
		});
		renderInspector();
	}

	function addCourse() {
		pushHistory();
		var newCourse = normalizeCourse({
			id: 'course-' + Date.now(),
			title: '新课程',
			stage: '待补充',
			field: '课程类别',
			nature: '待补充',
			hours: '待补充',
			content: '',
			textbooks: [{ title: '教材待补充', author: '作者与版本' }]
		}, state.courses.length);
		state.courses.push(newCourse);
		state.selectedId = newCourse.id;
		markDirty();
		elements.search.value = '';
		renderAll();
		var titleInput = elements.form.querySelector('[data-field="title"]');
		titleInput.focus();
		titleInput.select();
	}

	function deleteCourse() {
		var course = selectedCourse();
		if (!course) return;
		if (!window.confirm('确定删除“' + course.title + '”吗？保存前仍可点击撤销。')) return;

		pushHistory();
		var index = state.courses.indexOf(course);
		state.courses.splice(index, 1);
		state.selectedId = state.courses.length ? state.courses[Math.min(index, state.courses.length - 1)].id : null;
		markDirty();
		renderAll();
	}

	function moveSelected(direction) {
		var course = selectedCourse();
		if (!course) return;
		var index = state.courses.indexOf(course);
		var target = direction === 'up' ? index - 1 : index + 1;
		if (target < 0 || target >= state.courses.length) return;

		pushHistory();
		state.courses.splice(index, 1);
		state.courses.splice(target, 0, course);
		markDirty();
		renderAll();
	}

	function validateCourses() {
		var ids = {};
		for (var i = 0; i < state.courses.length; i += 1) {
			var course = state.courses[i];
			if (!course.title.trim()) return '第 ' + (i + 1) + ' 门课程还没有名称。';
			if (ids[course.id]) return '课程资料中出现了重复编号。';
			ids[course.id] = true;
		}
		return '';
	}

	async function saveCourses() {
		var errorMessage = validateCourses();
		if (errorMessage) {
			showToast(errorMessage);
			return;
		}
		if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
			setSaveState('error', '请双击“启动内容编辑器”后再保存');
			showToast('当前是只读预览，请通过启动器打开编辑器。');
			return;
		}

		elements.save.disabled = true;
		setSaveState('dirty', '正在保存…');
		try {
			var response = await fetch('/api/courses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ courses: state.courses })
			});
			var result = await response.json();
			if (!response.ok || !result.ok) throw new Error(result.message || '保存失败');

			state.serverSnapshot = JSON.stringify(state.courses);
			state.dirty = false;
			localStorage.removeItem(DRAFT_KEY);
			setSaveState('saved', '所有修改已保存');
			showToast('课程简介已经保存到网站');
		} catch (error) {
			setSaveState('error', '保存失败，草稿仍保留');
			showToast(error.message || '保存失败，请检查编辑器是否仍在运行。');
		} finally {
			elements.save.disabled = false;
		}
	}

	function checkDraft() {
		try {
			var draft = localStorage.getItem(DRAFT_KEY);
			if (draft && draft !== state.serverSnapshot) elements.draftBanner.hidden = false;
		} catch (error) {
			// 浏览器禁用本地存储时，编辑器仍可正常手动保存。
		}
	}

	elements.search.addEventListener('input', renderGrid);
	elements.add.addEventListener('click', addCourse);
	elements.deleteCourse.addEventListener('click', deleteCourse);
	elements.undo.addEventListener('click', undo);
	elements.save.addEventListener('click', saveCourses);

	elements.form.addEventListener('focusin', function (event) {
		if (!event.target.hasAttribute('data-field') || event.target.hasAttribute('data-history-captured')) return;
		pushHistory();
		event.target.setAttribute('data-history-captured', 'true');
	});

	elements.form.addEventListener('focusout', function (event) {
		if (event.target.hasAttribute('data-field')) event.target.removeAttribute('data-history-captured');
	});

	elements.form.addEventListener('input', function (event) {
		var input = event.target.closest('[data-field]');
		var course = selectedCourse();
		if (!input || !course) return;
		course[input.getAttribute('data-field')] = readField(input);
		markDirty();
		renderGrid();
		elements.inspectorTitle.textContent = course.title || '未命名课程';
	});

	elements.form.querySelectorAll('[data-move-course]').forEach(function (button) {
		button.addEventListener('click', function () { moveSelected(button.getAttribute('data-move-course')); });
	});

	elements.restoreDraft.addEventListener('click', function () {
		try {
			var draft = localStorage.getItem(DRAFT_KEY);
			if (draft) restoreCourses(draft);
			elements.draftBanner.hidden = true;
			showToast('已恢复上次的草稿');
		} catch (error) {
			showToast('草稿无法恢复');
		}
	});

	elements.discardDraft.addEventListener('click', function () {
		localStorage.removeItem(DRAFT_KEY);
		elements.draftBanner.hidden = true;
	});

	window.addEventListener('beforeunload', function (event) {
		if (!state.dirty) return;
		event.preventDefault();
		event.returnValue = '';
	});

	document.addEventListener('keydown', function (event) {
		if (!(event.metaKey || event.ctrlKey)) return;
		if (event.key.toLowerCase() === 's') {
			event.preventDefault();
			saveCourses();
		}
		if (event.key.toLowerCase() === 'z' && !event.target.matches('input, textarea, [contenteditable="true"]')) {
			event.preventDefault();
			undo();
		}
	});

	renderAll();
	checkDraft();
})();
