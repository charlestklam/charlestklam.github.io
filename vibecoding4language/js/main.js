document.addEventListener('DOMContentLoaded', () => {

    // Style configuration cycle matching index positions to accents
    const accents = [
        { rgb: '99, 102, 241', glow: 'rgba(99, 102, 241, 0.15)', placeholderClass: 'placeholder-gradient-1' }, // Indigo
        { rgb: '16, 185, 129', glow: 'rgba(16, 185, 129, 0.15)', placeholderClass: 'placeholder-gradient-2' }, // Emerald
        { rgb: '249, 115, 22',  glow: 'rgba(249, 115, 22, 0.15)',  placeholderClass: 'placeholder-gradient-3' }, // Orange
        { rgb: '236, 72, 153', glow: 'rgba(236, 72, 153, 0.15)', placeholderClass: 'placeholder-gradient-4' }, // Pink
        { rgb: '14, 165, 233',  glow: 'rgba(14, 165, 233, 0.15)',  placeholderClass: 'placeholder-gradient-5' }  // Sky
    ];

    // Fallback data in case of CORS restriction when opening index.html locally via file:// protocol
    const fallbackData = [
        {
            "title": "Style Scalpel",
            "author": "Muhammad Ismail",
            "affiliation": "Eötvös Loránd University, Hungary",
            "area": "Stylistics",
            "url": "https://stylescalpel.com/",
            "video_link": "",
            "description": "Style Scalpel is a web application that aims to make AI-text analysis more transparent through stylometric evidence. Adopting a forensic authorship-attribution approach, the application examines what linguistic and stylometric evidence supports that attribution, how the evidence can be inspected, and how cautiously the result should be reported. The application is also available in a Windows release, GitHub documentation, an OSF archive/DOI, and interactive 132-feature visualization maps."
        },
        {
            "title": "Vocab Learning",
            "author": "Ariadna Estefanía Pinto Avilez",
            "affiliation": "Universidad de Concepción, Chile",
            "area": "Vocab Learning",
            "url": "",
            "video_link": "",
            "description": ""
        },
        {
            "title": "Interactional Competence",
            "author": "Tap Tantiwich",
            "affiliation": "School of Languages, Societies and Cultures, University of Leeds, UK",
            "area": "Interactional Competence",
            "url": "",
            "video_link": "",
            "description": ""
        },
        {
            "title": "Historical Ling",
            "author": "Catherine Wong",
            "affiliation": "Digital Humanities Institute, University of Sheffield, UK",
            "area": "Historical Ling",
            "url": "",
            "video_link": "",
            "description": ""
        },
        {
            "title": "Merlin’s Syntax Studio",
            "author": "Merlin Yang",
            "affiliation": "Zhejiang University of Technology, China",
            "area": "Syntax",
            "url": "https://ailinguistics.cloud/mss/",
            "video_link": "",
            "description": ""
        }
    ];

    /* ==========================================
       1. DATA FETCH & RENDERING ENGINE
       ========================================== */
    if (window.location.protocol === 'file:') {
        console.log("Local filesystem access detected (file://). Activating fallback data to bypass CORS restrictions.");
        renderContent(fallbackData);
        initializeInteractions();
    } else {
        fetch('app_details.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                renderContent(data);
                initializeInteractions();
            })
            .catch(err => {
                console.error("JSON fetch failed. Falling back to embedded dataset.", err);
                renderContent(fallbackData);
                initializeInteractions();
            });
    }

    function renderContent(data) {
        const navContainer = document.getElementById('nav-links-container');
        const miniGridContainer = document.getElementById('hero-mini-grid-container');
        const showcaseContainer = document.getElementById('showcase-container');

        // Reset containers
        navContainer.innerHTML = '';
        miniGridContainer.innerHTML = '';
        showcaseContainer.innerHTML = '';

        data.forEach((app, index) => {
            const accent = accents[index % accents.length];
            const indexStr = String(index + 1).padStart(2, '0');
            
            // Handle titles with bracket notes or long titles gracefully
            const shortName = app.title.includes('[') 
                ? app.title.split('[')[1].replace(']', '') 
                : app.title.split(' ')[0];
                
            const isReverse = index % 2 === 1 ? 'card-reverse' : '';
            
            // Safely parse mockup Slug domain name or use a default slug
            const mockupSlug = app.url 
                ? app.url.replace('https://', '').replace('http://', '').split('/')[0] 
                : `${app.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.local`;

            // 1. Navigation item
            const navLink = document.createElement('a');
            navLink.href = `#app-${index + 1}`;
            navLink.className = 'nav-item';
            navLink.textContent = shortName;
            navContainer.appendChild(navLink);

            // 2. Hero sidebar card
            const miniCard = document.createElement('a');
            miniCard.href = `#app-${index + 1}`;
            miniCard.className = 'hero-mini-card';
            miniCard.style.cssText = `--accent-color: ${accent.rgb}; --accent-glow: ${accent.glow};`;
            miniCard.innerHTML = `
                <div class="mini-thumbnail ${accent.placeholderClass}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="10 8 16 12 10 16 10 8"/>
                    </svg>
                </div>
                <div class="mini-info">
                    <span class="mini-cat">${app.area || "Workshop Tool"}</span>
                    <span class="mini-name">${app.title}</span>
                </div>
                <span class="mini-index">${indexStr}</span>
            `;
            miniGridContainer.appendChild(miniCard);

            // Compose dynamic author metadata structure
            let metaHtml = '';
            if (app.author || app.affiliation) {
                const parts = [];
                if (app.author) parts.push(`By ${app.author}`);
                if (app.affiliation) parts.push(app.affiliation);
                metaHtml = `<div class="app-meta"><span class="app-author-info">${parts.join(' &bull; ')}</span></div>`;
            }

            // Compose description HTML with fallback placeholder
            const descriptionHtml = app.description
                ? `<p class="app-description">${app.description}</p>`
                : `<p class="app-description" style="font-style: italic; opacity: 0.6;">A description for this project will be added soon.</p>`;

            // Compose CTA action button with fallback placeholder
            const ctaBtnHtml = app.url
                ? `<a href="${app.url}" target="_blank" rel="noopener" class="btn-card-cta" id="cta-app-${index + 1}">
                       Launch App
                       <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <path d="M5 3H13M13 3V11M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>
                   </a>`
                : `<span class="btn-card-cta" style="background: var(--text-muted); opacity: 0.65; cursor: not-allowed; box-shadow: none;">
                       Link Coming Soon
                   </span>`;

            // 3. Showcase detail section card
            const section = document.createElement('section');
            section.className = `showcase-card reveal ${isReverse}`;
            section.id = `app-${index + 1}`;
            section.style.cssText = `--accent-color: ${accent.rgb}; --accent-glow: ${accent.glow};`;
            section.innerHTML = `
                <div class="card-content">
                    <span class="app-number" id="num-badge-${index + 1}">${indexStr}</span>
                    <span class="app-category">${app.area || "Workshop Tool"}</span>
                    <h2 class="app-title">${app.title}</h2>
                    ${metaHtml}
                    ${descriptionHtml}
                    <div class="app-actions">
                        ${ctaBtnHtml}
                    </div>
                </div>
                <div class="card-visual">
                    <div class="device-mockup">
                        <div class="mockup-header">
                            <span class="mockup-dot red"></span>
                            <span class="mockup-dot yellow"></span>
                            <span class="mockup-dot green"></span>
                            <span class="mockup-title">${mockupSlug}</span>
                        </div>
                        <div class="mockup-body">
                            <div class="video-placeholder ${accent.placeholderClass}">
                                <div class="placeholder-icon">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polygon points="10 8 16 12 10 16 10 8"/>
                                    </svg>
                                </div>
                                <span class="placeholder-text">${app.title}</span>
                            </div>
                            <video class="showcase-video" loop muted playsinline>
                                ${app.video_link ? `<source src="${app.video_link}" type="video/mp4">` : ''}
                            </video>
                        </div>
                    </div>
                </div>
            `;
            showcaseContainer.appendChild(section);
        });
    }

    /* ==========================================
       2. INTERACTION ENGINE (REVEALS, PLAYBACK, PARALLAX)
       ========================================== */
    function initializeInteractions() {
        
        // --- 2.1 Scroll Reveals ---
        const revealElements = document.querySelectorAll('.reveal');
        
        const revealObserverOptions = {
            root: null,
            threshold: 0.15,
            rootMargin: '0px 0px -60px 0px'
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, revealObserverOptions);

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });

        // --- 2.2 Video Playback Observability ---
        const videos = document.querySelectorAll('.showcase-video');

        const videoObserverOptions = {
            root: null,
            threshold: 0.3,
            rootMargin: '0px'
        };

        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                
                if (entry.isIntersecting) {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(() => {});
                    }
                } else {
                    video.pause();
                }
            });
        }, videoObserverOptions);

        videos.forEach(video => {
            video.addEventListener('loadeddata', () => {
                video.classList.add('loaded');
            });
            videoObserver.observe(video);
        });

        // --- 2.3 Smooth Nav scrolls with offset ---
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    
                    const headerHeight = document.querySelector('.site-header').offsetHeight || 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 20;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // --- 2.4 Parallax Number Shifts ---
        const appNumbers = document.querySelectorAll('.app-number');
        let isScrolling = false;

        const handleParallax = () => {
            const scrollTop = window.pageYOffset;
            
            appNumbers.forEach(badge => {
                const parentCard = badge.closest('.showcase-card');
                if (!parentCard) return;

                const rect = parentCard.getBoundingClientRect();
                const cardTop = rect.top + scrollTop;
                const cardHeight = rect.height;
                const windowHeight = window.innerHeight;

                if (rect.top < windowHeight && rect.bottom > 0) {
                    const relativeScroll = (scrollTop + windowHeight - cardTop) / (windowHeight + cardHeight);
                    const shiftY = (relativeScroll - 0.5) * 80; 
                    badge.style.transform = `translateY(${shiftY}px)`;
                }
            });
            
            isScrolling = false;
        };

        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(handleParallax);
                isScrolling = true;
            }
        });
        
        // Run parallax once on load to align initial visible cards
        handleParallax();
    }

});
