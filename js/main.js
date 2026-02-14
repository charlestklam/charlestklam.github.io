/**
 * Charles Lam - Alternative Design
 * Interactive JavaScript with filtering, toggle, and sidebar navigation
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== Filter functionality =====
    setupFilters('pub-filters', 'publications-list', '.pub-card', 'pub-empty');
    setupFilters('pres-filters', 'presentations-list', '.timeline-item', 'pres-empty');

    // ===== Toggle functionality =====
    setupToggle('toggle-publications', 'publications-list', '.pub-card');
    setupToggle('toggle-presentations', 'presentations-list', '.timeline-item');

    // ===== Smooth scroll for navigation =====
    setupSmoothScroll();

    // ===== Active sidebar link on scroll =====
    setupScrollSpy();
});

/**
 * Setup filter buttons for a section
 */
function setupFilters(filterGroupId, containerId, itemSelector, emptyStateId) {
    const filterGroup = document.getElementById(filterGroupId);
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById(emptyStateId);

    if (!filterGroup || !container) return;

    const filterButtons = filterGroup.querySelectorAll('.filter-btn');
    const allItems = container.querySelectorAll(itemSelector);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            let visibleCount = 0;

            allItems.forEach(item => {
                const categories = item.dataset.categories || '';
                const categoryList = categories.split(' ');
                const matches = filter === 'all' || categoryList.includes(filter);

                if (matches) {
                    item.classList.remove('filtered-out');
                    if (!item.classList.contains('hidden')) {
                        visibleCount++;
                    }
                } else {
                    item.classList.add('filtered-out');
                }
            });

            // Count including hidden items
            allItems.forEach(item => {
                const categories = item.dataset.categories || '';
                const categoryList = categories.split(' ');
                const matches = filter === 'all' || categoryList.includes(filter);
                if (matches) visibleCount++;
            });

            // Show/hide empty state
            if (emptyState) {
                emptyState.classList.toggle('visible', visibleCount === 0);
            }

            // Check if currently expanded
            const toggleBtn = document.getElementById(containerId === 'publications-list' ? 'toggle-publications' : 'toggle-presentations');
            const isExpanded = toggleBtn && toggleBtn.classList.contains('expanded');

            // Only reset toggle if NOT expanded
            if (toggleBtn && !isExpanded) {
                toggleBtn.classList.remove('expanded');
                const btnText = toggleBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = containerId === 'publications-list'
                        ? 'Show All Publications'
                        : 'Show All Presentations';
                }
            }

            // Re-hide originally hidden items ONLY if not expanded
            if (!isExpanded) {
                allItems.forEach(item => {
                    if (item.dataset.originallyHidden === 'true') {
                        item.classList.add('hidden');
                    }
                });
            }

            // Recalculate duplicate dates based on visible items
            hideDuplicateDates();
        });
    });

    // Store original hidden state
    allItems.forEach(item => {
        if (item.classList.contains('hidden')) {
            item.dataset.originallyHidden = 'true';
        }
    });
}

/**
 * Setup toggle functionality
 */
function setupToggle(buttonId, containerId, itemSelector) {
    const button = document.getElementById(buttonId);
    const container = document.getElementById(containerId);

    if (!button || !container) return;

    button.addEventListener('click', () => {
        const isExpanded = !button.classList.contains('expanded');

        const allItems = container.querySelectorAll(itemSelector);
        const hiddenItemsCount = Array.from(allItems).filter(item => item.dataset.originallyHidden === 'true').length;

        allItems.forEach((item, index) => {
            if (item.dataset.originallyHidden === 'true') {
                if (isExpanded) {
                    setTimeout(() => {
                        item.classList.remove('hidden');
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(10px)';
                        item.offsetHeight;
                        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, index * 30);
                } else {
                    item.classList.add('hidden');
                    item.style.opacity = '';
                    item.style.transform = '';
                    item.style.transition = '';
                }
            }
        });

        // Recalculate duplicate dates after animation completes
        if (isExpanded) {
            // Wait for all items to be revealed before recalculating
            setTimeout(() => {
                hideDuplicateDates();
            }, hiddenItemsCount * 30 + 100);
        } else {
            // Immediately recalculate when collapsing
            hideDuplicateDates();
        }

        const btnText = button.querySelector('.btn-text');

        if (isExpanded) {
            btnText.textContent = 'Show Less';
            button.classList.add('expanded');
        } else {
            btnText.textContent = buttonId.includes('publications')
                ? 'Show All Publications'
                : 'Show All Presentations';
            button.classList.remove('expanded');
        }
    });
}

/**
 * Smooth scroll for anchor links
 */
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Scroll spy for active sidebar links
 */
function setupScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    function updateActiveLink() {
        let current = '';
        const scrollPosition = window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Check if we're near the bottom of the page (within 100px)
        // If so, highlight the last section (tutorials)
        if (scrollPosition + windowHeight >= documentHeight - 100) {
            current = 'tutorials';
        } else if (scrollPosition < 200) {
            // Special case for About section which is at the top
            current = 'about';
        } else {
            // Normal scroll spy logic
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.clientHeight;

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
        }

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Run once on load
}

/**
 * Hide duplicate dates in timeline items and publications
 * Only considers visible items (not hidden or filtered-out)
 */
function hideDuplicateDates() {
    // Handle presentations timeline
    const timelineItems = document.querySelectorAll('.timeline-item');
    let lastDate = '';

    timelineItems.forEach(item => {
        const dateEl = item.querySelector('.timeline-date');
        if (dateEl) {
            // Check if item is visible (not hidden and not filtered out)
            const isVisible = !item.classList.contains('hidden') && !item.classList.contains('filtered-out');

            if (isVisible) {
                const currentDate = dateEl.textContent.trim();
                if (currentDate === lastDate) {
                    dateEl.classList.add('duplicate-date');
                } else {
                    dateEl.classList.remove('duplicate-date');
                    lastDate = currentDate;
                }
            } else {
                // Hidden items should not affect the duplicate logic
                // but we should reset their duplicate class so they show correctly when revealed
                dateEl.classList.remove('duplicate-date');
            }
        }
    });

    // Handle publications
    const pubCards = document.querySelectorAll('.pub-card');
    let lastYear = '';

    pubCards.forEach(card => {
        const yearEl = card.querySelector('.pub-year');
        if (yearEl) {
            // Check if item is visible (not hidden and not filtered out)
            const isVisible = !card.classList.contains('hidden') && !card.classList.contains('filtered-out');

            if (isVisible) {
                const currentYear = yearEl.textContent.trim();
                if (currentYear === lastYear) {
                    yearEl.classList.add('duplicate-date');
                } else {
                    yearEl.classList.remove('duplicate-date');
                    lastYear = currentYear;
                }
            } else {
                // Hidden items should not affect the duplicate logic
                yearEl.classList.remove('duplicate-date');
            }
        }
    });
}

// Call hideDuplicateDates on load
document.addEventListener('DOMContentLoaded', hideDuplicateDates);
