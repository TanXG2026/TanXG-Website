(function () {
	'use strict';

	var root = document.documentElement;
	var finished = false;

	function finish() {
		if (finished) return;
		finished = true;
		window.clearTimeout(window.TANXG_SANITY_LOADING_TIMER);
		root.classList.remove('sanity-loading');
		root.classList.add('sanity-ready');
	}

	root.classList.add('sanity-loading');
	window.TANXG_FINISH_CONTENT_LOADING = finish;
	window.TANXG_SANITY_LOADING_TIMER = window.setTimeout(finish, 8000);
})();
