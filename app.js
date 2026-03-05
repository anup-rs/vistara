/**
 * Vistara Photography App
 * Main Application Logic
 * Handles photo management, AI simulation, ranking system, and UI interactions
 */

// Application State
const state = {
    photos: [],
    currentView: 'home',
    theme: localStorage.getItem('theme') || 'system',
    grouping: localStorage.getItem('grouping') || 'day',
    aiEnabled: localStorage.getItem('aiEnabled') !== 'false',
    user: {
        xp: parseInt(localStorage.getItem('userXP')) || 0,
        rank: localStorage.getItem('userRank') || 'Frame Seeker'
    },
    currentViewerIndex: 0,
    selectedFiles: []
};

// Rank System Configuration
const rankSystem = {
    ranks: [
        { name: 'Frame Seeker', xp: 0, level: 'Beginner' },
        { name: 'Light Observer', xp: 100, level: 'Beginner' },
        { name: 'Visual Explorer', xp: 250, level: 'Beginner' },
        { name: 'Composition Artist', xp: 500, level: 'Intermediate' },
        { name: 'Street Storyteller', xp: 1000, level: 'Intermediate' },
        { name: 'Nature Hunter', xp: 1750, level: 'Intermediate' },
        { name: 'Light Sculptor', xp: 3000, level: 'Advanced' },
        { name: 'Moment Catcher', xp: 5000, level: 'Advanced' },
        { name: 'Visionary Photographer', xp: 8000, level: 'Advanced' },
        { name: 'Master of Frames', xp: 12000, level: 'Elite' },
        { name: 'Visual Architect', xp: 17000, level: 'Elite' },
        { name: 'Grand Photographer', xp: 25000, level: 'Elite' }
    ],
    
    getRank(xp) {
        for (let i = this.ranks.length - 1; i >= 0; i--) {
            if (xp >= this.ranks[i].xp) {
                return this.ranks[i];
            }
        }
        return this.ranks[0];
    },
    
    getNextRank(xp) {
        const currentRank = this.getRank(xp);
        const currentIndex = this.ranks.findIndex(r => r.name === currentRank.name);
        return this.ranks[currentIndex + 1] || null;
    },
    
    getProgress(xp) {
        const currentRank = this.getRank(xp);
        const nextRank = this.getNextRank(xp);
        if (!nextRank) return 100;
        
        const range = nextRank.xp - currentRank.xp;
        const progress = xp - currentRank.xp;
        return Math.min(100, Math.max(0, (progress / range) * 100));
    }
};

// AI Categories
const aiCategories = ['Portrait', 'Nature', 'Wildlife', 'Street Photography', 'Landscape', 'Architecture', 'Night Photography'];

// AI Feedback Templates
const aiFeedback = {
    excellent: [
        "Exceptional composition! The use of leading lines draws the viewer perfectly.",
        "Masterful lighting control. The dynamic range is perfectly balanced.",
        "Outstanding subject isolation. The bokeh quality enhances the main subject beautifully.",
        "Perfect moment captured! The timing creates strong emotional impact."
    ],
    good: [
        "Great framing. Consider adjusting the exposure for better highlight control.",
        "Nice color harmony. The background could be less distracting.",
        "Good sharpness on the subject. Try using the rule of thirds for better balance.",
        "Lovely lighting. A slightly lower angle might add more drama."
    ],
    average: [
        "Decent capture. The composition could benefit from the rule of thirds.",
        "Average exposure. Consider HDR mode for high-contrast scenes.",
        "The subject is interesting but the focus seems slightly soft.",
        "Good attempt. Watch out for distracting elements at the edges."
    ],
    poor: [
        "The image appears blurry. Check your shutter speed or use a tripod.",
        "Overexposed highlights. Try reducing exposure compensation.",
        "The composition feels unbalanced. Consider cropping to improve framing.",
        "Underexposed subject. Look for better lighting conditions or use fill flash."
    ]
};

// Initialize App
const app = {
    init() {
        this.loadTheme();
        this.loadPhotos();
        this.renderGallery();
        this.renderCollections();
        this.updateRankDisplay();
        lucide.createIcons();
        
        // Setup touch gestures for viewer
        this.setupGestures();
        
        // Check system theme preference
        if (state.theme === 'system') {
            this.checkSystemTheme();
        }
    },

    // Theme Management
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.applyTheme(savedTheme);
        document.getElementById('theme-select').value = savedTheme;
    },

    applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark');
        } else if (theme === 'light') {
            html.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }
    },

    checkSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addListener((e) => {
            if (state.theme === 'system') {
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        });
    },

    toggleTheme() {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    },

    setTheme(theme) {
        state.theme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        this.showToast(`Theme set to ${theme}`);
    },

    // Navigation
    navigate(view) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show target view
        document.getElementById(`view-${view}`).classList.remove('hidden');
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-primary-600', 'dark:text-primary-400');
            btn.classList.add('text-gray-400');
        });
        
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-400');
            activeBtn.classList.add('text-primary-600', 'dark:text-primary-400');
        }
        
        state.currentView = view;
        
        // Refresh data for specific views
        if (view === 'rank') this.updateRankDisplay();
        if (view === 'collections') this.renderCollections();
        
        window.scrollTo(0, 0);
    },

    // Photo Management
    loadPhotos() {
        const saved = localStorage.getItem('vistaraPhotos');
        if (saved) {
            state.photos = JSON.parse(saved);
        }
    },

    savePhotos() {
        localStorage.setItem('vistaraPhotos', JSON.stringify(state.photos));
    },

    handleFileSelect(input) {
        const files = Array.from(input.files);
        if (files.length === 0) return;
        
        if (files.length > 50) {
            this.showToast('Maximum 50 photos allowed per batch');
            return;
        }
        
        state.selectedFiles = files;
        
        // Show previews
        const previewContainer = document.getElementById('upload-preview');
        previewContainer.innerHTML = '';
        previewContainer.classList.remove('hidden');
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'aspect-square rounded-lg overflow-hidden bg-gray-200 relative';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-full object-cover">
                    ${index === 0 ? '<div class="absolute top-1 right-1 bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded">Best</div>' : ''}
                `;
                previewContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        
        // Enable upload button
        const btn = document.getElementById('upload-btn');
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btn.textContent = `Analyze ${files.length} Photo${files.length > 1 ? 's' : ''}`;
    },

    async processUpload() {
        if (state.selectedFiles.length === 0) return;
        
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingStatus = document.getElementById('loading-status');
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.classList.add('flex');
        
        const statuses = ['Analyzing composition...', 'Detecting lighting...', 'Checking sharpness...', 'Categorizing scene...', 'Calculating score...'];
        
        for (let i = 0; i < state.selectedFiles.length; i++) {
            const file = state.selectedFiles[i];
            loadingStatus.textContent = statuses[i % statuses.length];
            
            // Simulate AI processing delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const photoData = await this.analyzePhoto(file);
            state.photos.unshift(photoData);
            
            // Update XP based on score
            this.addXP(photoData.score);
        }
        
        this.savePhotos();
        this.renderGallery();
        this.renderCollections();
        
        loadingOverlay.classList.add('hidden');
        loadingOverlay.classList.remove('flex');
        
        state.selectedFiles = [];
        document.getElementById('upload-preview').innerHTML = '';
        document.getElementById('upload-preview').classList.add('hidden');
        document.getElementById('upload-btn').disabled = true;
        document.getElementById('upload-btn').classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('upload-btn').textContent = 'Analyze & Upload';
        document.getElementById('file-input').value = '';
        
        this.showToast('Photos uploaded successfully!');
        this.navigate('home');
    },

    analyzePhoto(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Simulate AI Analysis
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 100;
                    canvas.height = 100;
                    ctx.drawImage(img, 0, 0, 100, 100);
                    
                    // Get image data for basic analysis
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    const data = imageData.data;
                    
                    // Calculate brightness (simple metric)
                    let brightness = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                    }
                    brightness = brightness / (data.length / 4);
                    
                    // Generate AI metrics based on image characteristics
                    const baseScore = Math.floor(Math.random() * 40) + 60; // 60-100 base
                    const sharpness = Math.floor(Math.random() * 20) + 80;
                    const composition = Math.floor(Math.random() * 30) + 70;
                    const lighting = Math.min(100, Math.floor(brightness / 2.55) + Math.floor(Math.random() * 20));
                    
                    const finalScore = Math.floor((baseScore + sharpness + composition + lighting) / 4);
                    
                    // Determine category based on color analysis (simplified)
                    const category = this.detectCategory(data);
                    
                    // Generate feedback
                    let feedbackList;
                    if (finalScore >= 85) feedbackList = aiFeedback.excellent;
                    else if (finalScore >= 70) feedbackList = aiFeedback.good;
                    else if (finalScore >= 50) feedbackList = aiFeedback.average;
                    else feedbackList = aiFeedback.poor;
                    
                    const feedback = feedbackList[Math.floor(Math.random() * feedbackList.length)];
                    
                    resolve({
                        id: Date.now() + Math.random(),
                        src: e.target.result,
                        date: new Date().toISOString(),
                        score: finalScore,
                        category: category,
                        feedback: feedback,
                        metadata: {
                            sharpness,
                            composition,
                            lighting,
                            colorHarmony: Math.floor(Math.random() * 30) + 70
                        },
                        isBest: false // Will be determined by comparison
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    detectCategory(imageData) {
        // Simplified category detection based on color analysis
        const data = imageData;
        let r = 0, g = 0, b = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        
        const total = (data.length / 4);
        r /= total;
        g /= total;
        b /= total;
        
        // Simple heuristics for demo purposes
        if (g > r && g > b) return 'Nature';
        if (b > r && b > g) return 'Night Photography';
        if (r > 150 && g > 150 && b > 150) return 'Architecture';
        if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return 'Street Photography';
        
        return aiCategories[Math.floor(Math.random() * aiCategories.length)];
    },

    // Gallery Management
    renderGallery() {
        const container = document.getElementById('gallery-container');
        container.innerHTML = '';
        
        if (state.photos.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i data-lucide="image-off" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No photos yet. Tap + to upload!</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }
        
        // Group photos
        const groups = this.groupPhotos(state.photos, state.grouping);
        
        Object.entries(groups).forEach(([dateKey, photos]) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'animate-fade-in';
            
            const dateLabel = this.formatDateLabel(dateKey, state.grouping);
            
            groupDiv.innerHTML = `
                <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 sticky top-0 bg-white dark:bg-dark-bg py-2 z-10">${dateLabel}</h3>
                <div class="grid grid-cols-3 gap-1">
                    ${photos.map((photo, idx) => `
                        <div class="photo-item aspect-square relative overflow-hidden rounded-lg bg-gray-200 dark:bg-dark-surface cursor-pointer group" 
                             onclick="app.openViewer(${state.photos.indexOf(photo)})">
                            <img src="${photo.src}" class="w-full h-full object-cover" loading="lazy">
                            ${photo.score >= 85 ? '<div class="absolute top-1 right-1 bg-primary-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-lg">★</div>' : ''}
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.appendChild(groupDiv);
        });
        
        lucide.createIcons();
    },

    groupPhotos(photos, grouping) {
        const groups = {};
        
        photos.forEach(photo => {
            const date = new Date(photo.date);
            let key;
            
            if (grouping === 'day') {
                key = date.toDateString();
            } else if (grouping === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toDateString();
            } else {
                key = `${date.getMonth()}-${date.getFullYear()}`;
            }
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(photo);
        });
        
        return groups;
    },

    formatDateLabel(key, grouping) {
        const date = new Date(key);
        if (grouping === 'month') {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    changeGrouping(mode) {
        state.grouping = mode;
        localStorage.setItem('grouping', mode);
        document.getElementById('grouping-select').value = mode;
        document.getElementById('settings-grouping').value = mode;
        this.renderGallery();
    },

    // Collections
    renderCollections() {
        const container = document.getElementById('collections-container');
        const gridContainer = document.getElementById('collections-grid');
        
        // Count photos per category
        const counts = {};
        aiCategories.forEach(cat => counts[cat] = 0);
        state.photos.forEach(photo => {
            if (counts[photo.category] !== undefined) {
                counts[photo.category]++;
            }
        });
        
        // Render horizontal scroll
        container.innerHTML = aiCategories.map(cat => `
            <button onclick="app.filterByCategory('${cat}')" 
                    class="flex-shrink-0 relative w-24 h-24 rounded-2xl overflow-hidden ${counts[cat] === 0 ? 'opacity-50' : ''}">
                <div class="absolute inset-0 bg-gradient-to-br from-primary-600/80 to-purple-600/80"></div>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                    <i data-lucide="${this.getCategoryIcon(cat)}" class="w-6 h-6 mb-1"></i>
                    <span class="text-[10px] font-medium text-center leading-tight">${cat}</span>
                    <span class="text-[10px] opacity-80">${counts[cat]}</span>
                </div>
            </button>
        `).join('');
        
        // Render grid view
        if (gridContainer) {
            gridContainer.innerHTML = aiCategories.map(cat => `
                <div onclick="app.filterByCategory('${cat}')" 
                     class="bg-gray-100 dark:bg-dark-surface rounded-2xl p-4 flex flex-col items-center justify-center aspect-square cursor-pointer hover:scale-105 transition-transform ${counts[cat] === 0 ? 'opacity-50' : ''}">
                    <i data-lucide="${this.getCategoryIcon(cat)}" class="w-8 h-8 mb-2 text-primary-600 dark:text-primary-400"></i>
                    <span class="text-sm font-medium text-center">${cat}</span>
                    <span class="text-xs text-gray-500 mt-1">${counts[cat]} photos</span>
                </div>
            `).join('');
        }
        
        lucide.createIcons();
    },

    getCategoryIcon(category) {
        const icons = {
            'Portrait': 'user',
            'Nature': 'leaf',
            'Wildlife': 'cat',
            'Street Photography': 'building-2',
            'Landscape': 'mountain',
            'Architecture': 'home',
            'Night Photography': 'moon'
        };
        return icons[category] || 'image';
    },

    filterByCategory(category) {
        const filtered = state.photos.filter(p => p.category === category);
        // For demo, just show toast. In full app, would navigate to filtered view
        this.showToast(`${filtered.length} photos in ${category}`);
    },

    // Photo Viewer
    openViewer(index) {
        state.currentViewerIndex = index;
        const photo = state.photos[index];
        
        document.getElementById('viewer-image').src = photo.src;
        document.getElementById('viewer-score').textContent = photo.score;
        document.getElementById('viewer-category').textContent = photo.category;
        document.getElementById('viewer-feedback').textContent = photo.feedback;
        document.getElementById('viewer-date').innerHTML = `
            <i data-lucide="calendar" class="w-3 h-3 inline"></i>
            ${new Date(photo.date).toLocaleDateString()}
        `;
        
        const rankBadge = document.getElementById('viewer-rank-badge');
        if (photo.score >= 85) {
            rankBadge.textContent = 'Excellent';
            rankBadge.className = 'px-3 py-1 bg-green-500 rounded-full text-xs font-bold';
        } else if (photo.score >= 70) {
            rankBadge.textContent = 'Good';
            rankBadge.className = 'px-3 py-1 bg-blue-500 rounded-full text-xs font-bold';
        } else if (photo.score >= 50) {
            rankBadge.textContent = 'Average';
            rankBadge.className = 'px-3 py-1 bg-yellow-500 rounded-full text-xs font-bold';
        } else {
            rankBadge.textContent = 'Poor';
            rankBadge.className = 'px-3 py-1 bg-red-500 rounded-full text-xs font-bold';
        }
        
        document.getElementById('photo-viewer').classList.remove('hidden');
        document.getElementById('photo-viewer').classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        lucide.createIcons();
    },

    closeViewer() {
        document.getElementById('photo-viewer').classList.add('hidden');
        document.getElementById('photo-viewer').classList.remove('flex');
        document.body.style.overflow = '';
        this.hideAIInfo();
    },

    showAIInfo() {
        const overlay = document.getElementById('ai-overlay');
        overlay.classList.remove('translate-y-full');
    },

    hideAIInfo() {
        const overlay = document.getElementById('ai-overlay');
        overlay.classList.add('translate-y-full');
    },

    deleteCurrentPhoto() {
        if (confirm('Delete this photo?')) {
            state.photos.splice(state.currentViewerIndex, 1);
            this.savePhotos();
            this.renderGallery();
            this.closeViewer();
            this.showToast('Photo deleted');
        }
    },

    setupGestures() {
        let startX = 0;
        let currentX = 0;
        const viewer = document.getElementById('viewer-container');
        
        viewer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        
        viewer.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            if (Math.abs(diff) > 50) {
                document.getElementById(diff > 0 ? 'prev-hint' : 'next-hint').style.opacity = '1';
            }
        }, { passive: true });
        
        viewer.addEventListener('touchend', (e) => {
            const diff = currentX - startX;
            document.getElementById('prev-hint').style.opacity = '0';
            document.getElementById('next-hint').style.opacity = '0';
            
            if (Math.abs(diff) > 100) {
                if (diff > 0 && state.currentViewerIndex > 0) {
                    this.openViewer(state.currentViewerIndex - 1);
                } else if (diff < 0 && state.currentViewerIndex < state.photos.length - 1) {
                    this.openViewer(state.currentViewerIndex + 1);
                }
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('photo-viewer').classList.contains('hidden')) return;
            
            if (e.key === 'ArrowLeft' && state.currentViewerIndex > 0) {
                this.openViewer(state.currentViewerIndex - 1);
            } else if (e.key === 'ArrowRight' && state.currentViewerIndex < state.photos.length - 1) {
                this.openViewer(state.currentViewerIndex + 1);
            } else if (e.key === 'Escape') {
                this.closeViewer();
            }
        });
    },

    // Ranking System
    addXP(score) {
        let xp = 0;
        if (score >= 85) xp = 50;
        else if (score >= 70) xp = 25;
        else if (score >= 50) xp = 10;
        else xp = -10;
        
        state.user.xp = Math.max(0, state.user.xp + xp);
        
        const newRank = rankSystem.getRank(state.user.xp);
        if (newRank.name !== state.user.rank) {
            state.user.rank = newRank.name;
            this.showToast(`🎉 Rank Up! You are now ${newRank.name}`);
        }
        
        localStorage.setItem('userXP', state.user.xp);
        localStorage.setItem('userRank', state.user.rank);
        this.updateRankDisplay();
    },

    updateRankDisplay() {
        const currentRank = rankSystem.getRank(state.user.xp);
        const nextRank = rankSystem.getNextRank(state.user.xp);
        const progress = rankSystem.getProgress(state.user.xp);
        
        document.getElementById('current-rank-title').textContent = currentRank.name;
        document.getElementById('current-xp').textContent = `${state.user.xp} XP`;
        document.getElementById('xp-progress').style.width = `${progress}%`;
        
        if (nextRank) {
            document.getElementById('next-rank-info').textContent = `${nextRank.xp - state.user.xp} XP to ${nextRank.name}`;
            document.getElementById('target-xp').textContent = `${nextRank.xp} XP`;
        } else {
            document.getElementById('next-rank-info').textContent = 'Maximum Rank Achieved!';
            document.getElementById('target-xp').textContent = 'MAX';
        }
        
        // Stats
        document.getElementById('total-photos').textContent = state.photos.length;
        const avgScore = state.photos.length > 0 
            ? Math.floor(state.photos.reduce((a, b) => a + b.score, 0) / state.photos.length)
            : 0;
        document.getElementById('avg-score').textContent = avgScore;
        document.getElementById('best-photo-count').textContent = state.photos.filter(p => p.score >= 85).length;
        
        // Render rank list
        const ranksList = document.getElementById('ranks-list');
        ranksList.innerHTML = rankSystem.ranks.map(rank => {
            const isCurrent = rank.name === currentRank.name;
            const isUnlocked = state.user.xp >= rank.xp;
            
            return `
                <div class="flex items-center gap-3 p-3 rounded-xl ${isCurrent ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' : 'bg-gray-50 dark:bg-dark-surface opacity-60'}">
                    <div class="w-10 h-10 rounded-full ${isUnlocked ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'} flex items-center justify-center">
                        <i data-lucide="${isUnlocked ? 'check' : 'lock'}" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium ${isCurrent ? 'text-primary-700 dark:text-primary-300' : ''}">${rank.name}</p>
                        <p class="text-xs text-gray-500">${rank.level} • ${rank.xp} XP required</p>
                    </div>
                    ${isCurrent ? '<span class="text-xs font-bold text-primary-600 dark:text-primary-400">CURRENT</span>' : ''}
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    },

    // Settings
    toggleAI(enabled) {
        state.aiEnabled = enabled;
        localStorage.setItem('aiEnabled', enabled);
        this.showToast(`AI Analysis ${enabled ? 'enabled' : 'disabled'}`);
    },

    clearStorage() {
        if (confirm('Clear all photos and data? This cannot be undone.')) {
            localStorage.removeItem('vistaraPhotos');
            localStorage.removeItem('userXP');
            localStorage.removeItem('userRank');
            state.photos = [];
            state.user.xp = 0;
            state.user.rank = 'Frame Seeker';
            this.renderGallery();
            this.updateRankDisplay();
            this.showToast('All data cleared');
        }
    },

    // Utilities
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('opacity-0', 'pointer-events-none');
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'pointer-events-none');
        }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});