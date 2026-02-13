/**
 * BibTeX Parser and Loader for Publications and Presentations
 * Reads bib files directly and generates HTML
 */

const BibLoader = {
    // Month order for sorting
    MONTH_ORDER: {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7,
        'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    },

    MONTH_NAMES: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    /**
     * Clean LaTeX formatting from text
     */
    cleanLatex(text) {
        if (!text) return '';

        // First, remove APACSortNoop
        text = text.replace(/\{*\\?\\?APACSortNoop\{[^}]*\}\}*/g, '');

        // Remove \textbf{} 
        text = text.replace(/\\textbf\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');

        // Remove \textcolor
        text = text.replace(/\\textcolor\{[^}]*\}\{([^{}]*)\}/g, '$1');

        // Remove \textit
        text = text.replace(/\\textit\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '$1');

        // Handle special LaTeX characters
        text = text.replace(/\\&/g, '&');
        text = text.replace(/\\'{a}/g, 'á');
        text = text.replace(/\\"{a}/g, 'ä');
        text = text.replace(/\\"{o}/g, 'ö');
        text = text.replace(/\\"{u}/g, 'ü');
        text = text.replace(/\\"a/g, 'ä');
        text = text.replace(/\\"o/g, 'ö');
        text = text.replace(/\\"u/g, 'ü');
        text = text.replace(/\\LaTeX/g, 'LaTeX');

        // Remove \url{} wrapper
        text = text.replace(/\\url\{([^}]*)\}/g, '$1');

        // Remove remaining backslashes before special chars
        text = text.replace(/\\([&%$#_{}])/g, '$1');

        // Clean up leftover braces
        text = text.replace(/\{\s*\}/g, '');
        text = text.replace(/\{\}/g, '');

        // Remove single-level wrapper braces
        for (let i = 0; i < 3; i++) {
            text = text.replace(/^\{([^{}]+)\}$/, '$1');
            text = text.replace(/\{([^{}]*)\}/g, '$1');
        }

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    },

    /**
     * Parse a bib file content and return list of entries
     */
    parseBibFile(content, sourceName) {
        const entries = [];
        content = content.replace(/\r\n/g, '\n');

        // Split by @ at start of line
        const chunks = content.split(/^@/m);

        for (const chunk of chunks) {
            if (!chunk.trim()) continue;

            const firstBrace = chunk.indexOf('{');
            const comma = chunk.indexOf(',');
            if (firstBrace === -1 || comma === -1) continue;

            const type = chunk.substring(0, firstBrace).trim().toLowerCase();
            const key = chunk.substring(firstBrace + 1, comma).trim();
            const body = chunk.substring(comma + 1);

            const entry = {
                type: type,
                key: key,
                _source: sourceName
            };

            // Extract fields
            const fieldPattern = /(\w+)\s*=\s*\{/g;
            let fieldMatch;

            while ((fieldMatch = fieldPattern.exec(body)) !== null) {
                const fieldName = fieldMatch[1].toLowerCase();
                const startIndex = fieldMatch.index + fieldMatch[0].length;

                let braceCount = 1;
                let endIndex = startIndex;

                while (braceCount > 0 && endIndex < body.length) {
                    if (body[endIndex] === '{') braceCount++;
                    else if (body[endIndex] === '}') braceCount--;
                    endIndex++;
                }

                if (braceCount === 0) {
                    const val = body.substring(startIndex, endIndex - 1);
                    entry[fieldName] = val.trim();
                }
            }

            // Handle unbraced numeric fields
            const numericPattern = /(\w+)\s*=\s*(\d+)/g;
            let numMatch;
            while ((numMatch = numericPattern.exec(body)) !== null) {
                const fieldName = numMatch[1].toLowerCase();
                if (!entry[fieldName]) {
                    entry[fieldName] = numMatch[2];
                }
            }

            entries.push(entry);
        }

        return entries;
    },

    /**
     * Parse year string
     */
    parseYearMonth(yearStr) {
        if (!yearStr) return { year: 0, month: 0, display: '' };
        yearStr = this.cleanLatex(String(yearStr)).trim();

        if (yearStr.toLowerCase().includes('in prep') || yearStr.toLowerCase().includes('forthcoming')) {
            return { year: 9999, month: 12, display: 'In prep.' };
        }
        if (yearStr.toLowerCase().includes('under review')) {
            return { year: 9998, month: 12, display: 'Under<br>Review' };
        }

        const monthYearMatch = yearStr.match(/(\w+),?\s*(\d{4})/);
        if (monthYearMatch) {
            const monthStr = monthYearMatch[1].toLowerCase();
            const year = parseInt(monthYearMatch[2]);
            const month = this.MONTH_ORDER[monthStr] || 6;
            return { year, month, display: yearStr };
        }

        const yearMatch = yearStr.match(/(\d{4})/);
        if (yearMatch) {
            return { year: parseInt(yearMatch[1]), month: 6, display: yearStr };
        }

        return { year: 0, month: 0, display: yearStr };
    },

    /**
     * Format author string
     */
    formatAuthors(authorStr) {
        let author = this.cleanLatex(authorStr);
        author = author.replace(/\s+and\s+/g, ', ');
        author = author.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
        author = author.replace(/\bLam,?\s*(C\.?|Charles)\b/gi, '<strong>Lam, C.</strong>');
        return author;
    },

    /**
     * Determine tags
     */
    getEntryTags(entry) {
        const tags = new Set();

        if (entry.keywords) {
            const keywordsStr = entry.keywords.toLowerCase();
            if (keywordsStr.includes('eap')) tags.add('eap');
            if (keywordsStr.includes('linguistics')) tags.add('linguistics');
            if (keywordsStr.includes('hk studies') || keywordsStr.includes('hk')) tags.add('hk');
        }

        if (tags.size > 0) return Array.from(tags).sort();

        // Fallback checks
        if (entry._source && entry._source.includes('-hk')) tags.add('hk');

        if (entry.tags) {
            const tagStr = entry.tags.toLowerCase();
            ['eap', 'linguistics', 'hk'].forEach(tag => {
                if (tagStr.includes(tag)) tags.add(tag);
            });
        }

        const searchText = [
            entry.title || '',
            entry.note || '',
            entry.journal || '',
            entry.booktitle || ''
        ].join(' ').toLowerCase();

        const eapKeywords = ['eap', 'foundation year', 'academic purpose', 'syllabus',
            'baleap', 'inform', 'teaching', 'pedagog', 'writing', 'genai'];
        if (eapKeywords.some(kw => searchText.includes(kw))) tags.add('eap');

        const lingKeywords = ['linguistics', 'cantonese', 'syntax', 'corpus', 'nlp'];
        if (lingKeywords.some(kw => searchText.includes(kw))) tags.add('linguistics');

        const hkKeywords = ['hong kong', 'cantopop', 'humor', 'dayo wong'];
        if (hkKeywords.some(kw => searchText.includes(kw))) tags.add('hk');

        if (tags.size === 0) tags.add('linguistics');

        return Array.from(tags).sort();
    },

    convertToFirstLast(name) {
        name = name.trim();
        if (name.includes(',')) {
            const parts = name.split(',').map(p => p.trim());
            if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
        }
        return name;
    },

    getCoAuthors(authorStr) {
        let author = this.cleanLatex(authorStr);
        author = author.replace(/\s+and\s+/g, '|||');
        const parts = author.split('|||');
        const coAuthors = [];
        for (let part of parts) {
            part = part.trim();
            if (/\bLam,?\s*(C\.?|Charles)\b/i.test(part)) continue;
            if (part) coAuthors.push(this.convertToFirstLast(part));
        }
        return coAuthors;
    },

    generatePublicationHTML(entry, showYear = true) {
        const tags = this.getEntryTags(entry);
        const dataCategories = tags.join(' ');
        const yearInfo = this.parseYearMonth(entry.year || '');
        const yearDisplay = yearInfo.year >= 9998 ? yearInfo.display : String(yearInfo.year);
        const title = this.cleanLatex(entry.title || '');

        let citation = `<span class="pub-title">${title}</span>`;

        if (entry.type === 'article') {
            const journal = this.cleanLatex(entry.journal || '');
            const volume = entry.volume || '';
            const number = entry.number || '';
            const pages = (entry.pages || '').replace(/--/g, '–');
            citation += `. <em>${journal}</em>`;
            if (volume) citation += `, <em>${volume}</em>` + (number ? `(${number})` : '');
            if (pages) citation += `, ${pages}`;
        } else if (['incollection', 'inbook'].includes(entry.type)) {
            const booktitle = this.cleanLatex(entry.booktitle || '');
            const editor = this.cleanLatex(entry.editor || '');
            const publisher = this.cleanLatex(entry.publisher || '');

            if (editor) {
                const editorNames = editor.split(/\s+and\s+/).map(e => this.convertToFirstLast(e.trim())).join(' and ');
                citation += `. In ${editorNames} (Eds.), <em>${booktitle}</em>`;
            } else {
                citation += `. <em>${booktitle}</em>`;
            }
            if (publisher) citation += `. ${publisher}`;
        } else if (entry.type === 'inproceedings') {
            const booktitle = this.cleanLatex(entry.booktitle || '');
            citation += `. <em>${booktitle}</em>`;
        } else if (entry.type === 'book') {
            const publisher = this.cleanLatex(entry.publisher || '');
            citation = `<em>${title}</em>. ${publisher}`;
        }

        const coAuthors = this.getCoAuthors(entry.author || '');
        if (coAuthors.length > 0) citation += ` (with ${coAuthors.join(', ')})`;

        const tagHTML = tags.map(tag => {
            const label = { eap: 'EAP', linguistics: 'Linguistics', hk: 'HK Studies' }[tag] || tag;
            return `<span class="category-tag ${tag}">${label}</span>`;
        }).join('');

        const linkHTML = entry.url ? `<a href="${entry.url}" target="_blank" class="pub-link">View Article →</a>` : '';
        const yearClass = showYear ? '' : ' duplicate-date';

        return `<article class="pub-card" data-categories="${dataCategories}">
                    <span class="pub-year${yearClass}">${yearDisplay}</span>
                    <div class="pub-card-main">
                        <div class="pub-card-content"><p class="pub-content">${citation}</p></div>
                        <div class="pub-card-actions">${tagHTML}${linkHTML}</div>
                    </div>
                </article>`;
    },

    generatePresentationHTML(entry, showDate = true) {
        const tags = this.getEntryTags(entry);
        const dataCategories = tags.join(' ');
        const yearInfo = this.parseYearMonth(entry.year || '');
        const dateDisplay = yearInfo.year >= 9998 ? yearInfo.display : `${this.MONTH_NAMES[yearInfo.month]} ${yearInfo.year}`;
        const title = this.cleanLatex(entry.title || '');
        let note = this.cleanLatex(entry.note || '');

        if (note.includes(',')) {
            const parts = note.split(',');
            const lastPart = parts.pop().trim();
            const eventPart = parts.join(',').trim();
            note = `<em>${eventPart}</em>, ${lastPart}`;
        }

        const coAuthors = this.getCoAuthors(entry.author || '');
        if (coAuthors.length > 0) note += ` (with ${coAuthors.join(', ')})`;

        const tagHTML = tags.map(tag => {
            const label = { eap: 'EAP', linguistics: 'Linguistics', hk: 'HK Studies' }[tag] || tag;
            return `<span class="category-tag ${tag}">${label}</span>`;
        }).join('');

        const dateClass = showDate ? '' : ' duplicate-date';

        return `<div class="timeline-item" data-categories="${dataCategories}">
                    <div class="timeline-date${dateClass}">${dateDisplay}</div>
                    <div class="timeline-content">
                        <div class="timeline-content-main"><p><span class="pub-title">${title}</span>. ${note}</p></div>
                        <div class="timeline-content-actions">${tagHTML}</div>
                    </div>
                </div>`;
    },

    async fetchBibFile(url, sourceName) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const content = await response.text();
            return this.parseBibFile(content, sourceName);
        } catch (error) {
            console.warn(`Failed to fetch ${url}: ${error}`);
            return [];
        }
    },

    async loadPublications(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<p class="loading">Loading publications...</p>';
        const allEntries = await this.fetchBibFile('papers.bib', 'papers');

        allEntries.sort((a, b) => {
            if (a.sortkey && b.sortkey) {
                if (a.sortkey > b.sortkey) return -1;
                if (a.sortkey < b.sortkey) return 1;
                return 0;
            }
            const aInfo = this.parseYearMonth(a.year || '');
            const bInfo = this.parseYearMonth(b.year || '');
            if (bInfo.year !== aInfo.year) return bInfo.year - aInfo.year;
            return bInfo.month - aInfo.month;
        });

        const currentYear = new Date().getFullYear();
        const cutoffYear = currentYear - 1;
        let html = '';
        let lastYear = null;

        if (allEntries.length === 0) html = '<p class="empty-state">No publications found.</p>';
        else {
            for (const entry of allEntries) {
                const yearInfo = this.parseYearMonth(entry.year || '');
                const showYear = yearInfo.year !== lastYear;
                let entryHTML = this.generatePublicationHTML(entry, showYear);
                if (yearInfo.year < cutoffYear && yearInfo.year < 9998) {
                    entryHTML = entryHTML.replace('class="pub-card"', 'class="pub-card hidden"');
                }
                html += entryHTML + '\n\n';
                lastYear = yearInfo.year;
            }
        }
        container.innerHTML = html;
        if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
        if (typeof setupFiltering === 'function') setupFiltering('publications-list', 'pub-filters');
    },

    async loadPresentations(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<p class="loading">Loading presentations...</p>';
        const allEntries = await this.fetchBibFile('presentations.bib', 'presentations');

        allEntries.sort((a, b) => {
            if (a.sortkey && b.sortkey) {
                if (a.sortkey > b.sortkey) return -1;
                if (a.sortkey < b.sortkey) return 1;
                return 0;
            }
            const aInfo = this.parseYearMonth(a.year || '');
            const bInfo = this.parseYearMonth(b.year || '');
            if (bInfo.year !== aInfo.year) return bInfo.year - aInfo.year;
            return bInfo.month - aInfo.month;
        });

        const currentYear = new Date().getFullYear();
        const cutoffYear = currentYear - 1;
        let html = '';
        let lastDate = null;

        if (allEntries.length === 0) html = '<p class="empty-state">No presentations found.</p>';
        else {
            for (const entry of allEntries) {
                const yearInfo = this.parseYearMonth(entry.year || '');
                const currentDate = `${yearInfo.year}-${yearInfo.month}`;
                const showDate = currentDate !== lastDate;
                let entryHTML = this.generatePresentationHTML(entry, showDate);
                if (yearInfo.year < cutoffYear && yearInfo.year < 9998) {
                    entryHTML = entryHTML.replace('class="timeline-item"', 'class="timeline-item hidden"');
                }
                html += entryHTML + '\n\n';
                lastDate = currentDate;
            }
        }
        container.innerHTML = html;
        if (typeof hideDuplicateDates === 'function') hideDuplicateDates();
        if (typeof setupFiltering === 'function') setupFiltering('presentations-list', 'pres-filters');
    },

    init() {
        this.loadPublications('publications-list');
        this.loadPresentations('presentations-list');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    BibLoader.init();
});

