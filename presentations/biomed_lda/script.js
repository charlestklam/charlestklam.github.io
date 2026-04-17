document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    let isProgrammaticScroll = false;

    // --- Hide LDAvis controls on the main document ---
    const enforceHiding = () => {
        // Hide SVG text nodes by content (CSS can't match text content)
        const bgColor = document.body.classList.contains('light-viz') ? '#f8fafc' : '#0f172a';
        document.querySelectorAll('#visual-pane svg text').forEach(el => {
            const t = el.textContent.trim();
            if (t.includes('Intertopic Distance Map') ||
                t.includes('relevance metric') ||
                t.includes('Slide to')) {
                el.style.display = 'none';
            }
            if (t.includes('Marginal topic distribution')) {
                el.style.display = 'none';
            }
            if (t === '2%' || t === '5%' || t === '10%') {
                el.style.display = 'none';
            }
        });

        // Hide size legend dashed circles and their connecting lines
        document.querySelectorAll('#visual-pane svg circle').forEach(c => {
            const da = c.getAttribute('stroke-dasharray') || c.style['stroke-dasharray'];
            if (da) {
                c.style.setProperty('stroke', 'none', 'important');
                c.style.setProperty('fill', 'none', 'important');
                // Also hide sibling lines in the same group
                if (c.parentNode) {
                    c.parentNode.querySelectorAll('line').forEach(ln => {
                        ln.style.setProperty('stroke', 'none', 'important');
                    });
                }
            }
        });

        // Hide lambda slider container divs (rendered after LDAvis init)
        document.querySelectorAll('[id*="-sliderDiv"], [id*="lambda-controls"]').forEach(el => {
            el.style.display = 'none';
        });
    };

    // --- Mirror "N% of tokens" at the bottom of the left (MDS) panel ---
    const setupFreqMirror = () => {
        const svg = document.querySelector('#visual-pane svg');
        if (!svg || svg.dataset.freqMirror) return;
        svg.dataset.freqMirror = 'true';

        const ns = 'http://www.w3.org/2000/svg';
        const mirrorText = document.createElementNS(ns, 'text');
        // x=295: center of left panel (margin.left=30 + mdswidth/2=265)
        // y=750: near bottom of SVG coordinate space (total height ~780)
        mirrorText.setAttribute('x', '295');
        mirrorText.setAttribute('y', '750');
        mirrorText.setAttribute('text-anchor', 'middle');
        mirrorText.setAttribute('font-size', '16');
        mirrorText.id = 'ldavis-freq-mirror';
        svg.appendChild(mirrorText);

        const syncFreq = () => {
            // Wait briefly for pyLDAvis to finish updating the DOM
            setTimeout(() => {
                let found = '';
                svg.querySelectorAll('text').forEach(el => {
                    if (el.id === 'ldavis-freq-mirror') return;
                    const match = el.textContent.match(/([\d.]+% of tokens)/);
                    if (match) found = match[1];
                });
                mirrorText.textContent = found;
            }, 80);
        };

        svg.addEventListener('click', syncFreq);
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
        const topicNum = parseInt(topicId, 10);
        if (!topicId || topicNum < 1 || topicNum > 10) {
            // Deselect: click the transparent background rect of the MDS plot,
            // which pyLDAvis uses as its own reset/click-away handler
            const bgRect = document.querySelector('#visual-pane svg rect');
            if (bgRect) bgRect.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
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

    // Use MutationObserver to reliably catch the SVG once pyLDAvis finishes
    // loading asynchronously, then apply viewBox + hiding fixes.
    const vizPane = document.getElementById('visual-pane');
    const svgObserver = new MutationObserver(() => {
        const svg = vizPane.querySelector('svg');
        if (svg) {
            makeResponsive();
            setupFreqMirror();
            // Run enforceHiding several times to catch elements added after SVG
            let count = 0;
            const hideInterval = setInterval(() => {
                enforceHiding();
                if (++count >= 20) clearInterval(hideInterval);
            }, 100);
            svgObserver.disconnect();
        }
    });
    svgObserver.observe(vizPane, { childList: true, subtree: true });

    // Also run immediately in case the SVG is already present
    if (vizPane.querySelector('svg')) {
        makeResponsive();
        setupFreqMirror();
        enforceHiding();
        svgObserver.disconnect();
    }

    // --- Theme toggle ---
    const checkbox = document.getElementById('viz-theme-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            document.body.classList.toggle('light-viz', checkbox.checked);
        });
    }
});
