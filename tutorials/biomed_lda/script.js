document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    let isProgrammaticScroll = false;

    // --- Hide LDAvis controls on the main document ---
    const enforceHiding = () => {
        // Hide SVG text nodes by content (CSS can't match text content)
        document.querySelectorAll('#visual-pane svg text').forEach(el => {
            if (el.textContent.includes('Intertopic Distance Map') ||
                el.textContent.includes('relevance metric') ||
                el.textContent.includes('Slide to')) {
                el.style.display = 'none';
            }
        });

        // Hide lambda slider container divs (rendered after LDAvis init)
        document.querySelectorAll('[id*="-sliderDiv"], [id*="lambda-controls"]').forEach(el => {
            el.style.display = 'none';
        });
    };

    // --- Make the LDAvis SVG fill its container responsively ---
    const makeResponsive = () => {
        const vizPane = document.getElementById('visual-pane');
        if (!vizPane) return;
        const svg = vizPane.querySelector('svg');
        if (!svg || svg.dataset.responsive) return;

        const w = svg.getAttribute('width');
        const h = svg.getAttribute('height');
        if (w && h) {
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.dataset.responsive = 'true';
        }
    };

    // --- Left → Right: find circle by topic ID and click it ---
    const syncNarrativeToVisualization = (topicId) => {
        if (topicId === '0' || !topicId) {
            // Deselect: click the SVG background if a topic is active
            const activeDot = document.querySelector('circle.dot.selected, circle.dot[style*="stroke-width: 3"]');
            if (activeDot) activeDot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
        }
        const id = parseInt(topicId, 10);
        const dots = document.querySelectorAll('circle.dot');
        for (const dot of dots) {
            const d = dot.__data__;
            if (d && (d.topics === id || d.topic === id)) {
                dot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return;
            }
        }
    };

    // --- Scroll a step so its centre sits at 38% from the top ---
    const scrollToStep = (targetStep) => {
        const rect = targetStep.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const targetScrollY = window.scrollY + cardCenter - window.innerHeight * 0.38;
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    };

    // --- Right → Left: react to LDAvis setting window.location.hash ---
    const jumpToNarrativeCard = (topicId) => {
        const targetStep = document.querySelector(`.step[data-topic="${topicId}"]`);
        if (targetStep && !targetStep.classList.contains('active')) {
            isProgrammaticScroll = true;
            steps.forEach(s => s.classList.remove('active'));
            targetStep.classList.add('active');
            scrollToStep(targetStep);
            setTimeout(() => { isProgrammaticScroll = false; }, 1000);
        }
    };

    // --- Keyboard navigation (arrow keys, page up/down) ---
    const stepsArray = Array.from(steps);
    document.addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) return;
        e.preventDefault();

        const currentIndex = stepsArray.findIndex(s => s.classList.contains('active'));
        const delta = (e.key === 'ArrowDown' || e.key === 'PageDown') ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(stepsArray.length - 1, currentIndex + delta));

        if (nextIndex === currentIndex) return;

        isProgrammaticScroll = true;
        steps.forEach(s => s.classList.remove('active'));
        const nextStep = stepsArray[nextIndex];
        nextStep.classList.add('active');
        scrollToStep(nextStep);
        syncNarrativeToVisualization(nextStep.getAttribute('data-topic'));
        setTimeout(() => { isProgrammaticScroll = false; }, 1000);
    });

    window.addEventListener('hashchange', () => {
        const match = window.location.hash.match(/topic=(\d+)/);
        if (match && match[1]) {
            jumpToNarrativeCard(match[1]);
        } else {
            jumpToNarrativeCard('0');
        }
    });

    // --- Scroll observer: Left → Right ---
    const observer = new IntersectionObserver((entries) => {
        if (isProgrammaticScroll) return;
        const intersecting = entries.find(e => e.isIntersecting);
        if (intersecting) {
            steps.forEach(s => s.classList.remove('active'));
            intersecting.target.classList.add('active');
            const topicId = intersecting.target.getAttribute('data-topic');
            syncNarrativeToVisualization(topicId);
        }
    }, {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    });

    steps.forEach(step => observer.observe(step));

    // Poll until LDAvis SVG renders, then make it responsive.
    // Keep hiding controls for a short while since LDAvis renders them asynchronously.
    let hideCount = 0;
    const initInterval = setInterval(() => {
        const svg = document.querySelector('#visual-pane svg');
        if (svg) makeResponsive();
        enforceHiding();
        hideCount++;
        if (hideCount >= 20) clearInterval(initInterval); // stop after ~2s
    }, 100);

    // --- Theme toggle ---
    const checkbox = document.getElementById('viz-theme-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            document.body.classList.toggle('light-viz', checkbox.checked);
        });
    }
});
