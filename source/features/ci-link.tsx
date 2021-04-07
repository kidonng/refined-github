import './ci-link.css';
import select from 'select-dom';
import onetime from 'onetime';
import {observe} from 'selector-observer';
import * as pageDetect from 'github-url-detection';

import features from '.';
import fetchDom from '../helpers/fetch-dom';
import {buildRepoURL, getConversationNumber} from '../github-helpers';

// Look for the CI icon in the latest 2 days of commits #2990
const getRepoIcon = async (): Promise<HTMLElement | undefined> => fetchDom(
	buildRepoURL('commits'), [
		'.commit-group:nth-of-type(-n+2) .commit-build-statuses', // Pre "Repository refresh" layout
		'.TimelineItem--condensed:nth-of-type(-n+2) .commit-build-statuses'
	].join()
);

const PRIconSelector = '.js-commits-list-item:last-of-type .commit-build-statuses';
const getPRIcon = async (): Promise<HTMLElement | undefined> => fetchDom(
	buildRepoURL('pull', getConversationNumber()!, 'commits'),
	PRIconSelector
);

function removeAnimation(element: HTMLElement): void {
	element.style.animation = 'none';
}

async function initRepo(): Promise<false | void> {
	const icon = await getRepoIcon();
	if (!icon) {
		return false;
	}

	icon.classList.add('rgh-ci-link');
	icon.addEventListener('animationend', event => {
		removeAnimation(event.target as HTMLElement);
	}, {
		once: true
	});

	// Append to title (aware of forks and private repos)
	select('[itemprop="name"]')!.parentElement!.append(icon);
}

async function initPR(): Promise<false | void> {
	const icon = pageDetect.isPRFiles() ? select(PRIconSelector) : await getPRIcon();
	if (!icon) {
		return false;
	}

	icon.classList.add('rgh-ci-link', 'ml-2');
	icon.addEventListener('animationend', event => {
		removeAnimation(event.target as HTMLElement);
	}, {
		once: true
	});
	const headerIcon = icon.cloneNode(true);
	removeAnimation(headerIcon);

	// Append to PR title
	observe('.gh-header-title .f1-light:not(.rgh-ci-link-heading)', {
		add(heading) {
			heading.classList.add('rgh-ci-link-heading');
			heading.append(icon);
		}
	});

	// Append to PR sticky header
	observe('.js-sticky h1:not(.rgh-ci-link-heading)', {
		add(heading) {
			heading.classList.add('rgh-ci-link-heading');
			heading.append(headerIcon);
		}
	});
}

void features.add(__filebasename, {
	include: [
		pageDetect.isRepo
	],
	exclude: [
		pageDetect.isEmptyRepo
	],
	awaitDomReady: false,
	init: initRepo
}, {
	include: [
		pageDetect.isPR
	],
	awaitDomReady: false,
	init: onetime(initPR)
});
