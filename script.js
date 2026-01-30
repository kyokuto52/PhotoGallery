// Intro animation control
(function() {
    const DURATION = 1600; // 与 CSS 动画时间保持一致（ms）

    function finishIntro() {
        if (document.body.classList.contains('intro-done')) return;
        document.body.classList.add('intro-done');

        // 移除 overlay 节点以释放点击事件
        const overlay = document.getElementById('introOverlay');
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    // 当 DOM 就绪后开始计时
    document.addEventListener('DOMContentLoaded', function() {
        // 如果没有 overlay，则立即标记为完成
        const overlay = document.getElementById('introOverlay');
        if (!overlay) return document.body.classList.add('intro-done');

        // 设定超时，防止动画未触发或资源阻塞
        const t = setTimeout(() => finishIntro(), DURATION + 300);

        // 允许用户通过点击或按键跳过动画
        function skip() {
            clearTimeout(t);
            finishIntro();
        }

        overlay.addEventListener('click', skip, { once: true });
        document.addEventListener('keydown', skip, { once: true });

        // 在动画结束后清理
        overlay.addEventListener('animationend', function(e) {
            // 监听 introFadeOut 完成
            if (e.animationName === 'introFadeOut') {
                finishIntro();
            }
        });
    });
})();

// 浏览模式配置
let currentViewMode = 'full';
let currentSortMode = 'time-desc'; // 默认由新到旧排序

// 浏览模式选择器初始化
function initializeViewModeSelector() {
    const viewModeBtn = document.getElementById('viewModeBtn');
    const viewModeDropdown = document.getElementById('viewModeDropdown');
    
    if (!viewModeBtn || !viewModeDropdown) return;
    
    // 判断是否为移动端
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // 更新下拉菜单位置（移动端）
    function updateDropdownPosition() {
        if (!isMobile()) return;
        
        const btnRect = viewModeBtn.getBoundingClientRect();
        const dropdown = viewModeDropdown;
        
        // 计算位置：在按钮下方，右对齐
        dropdown.style.top = (btnRect.bottom + window.scrollY + 8) + 'px';
        dropdown.style.right = (window.innerWidth - btnRect.right) + 'px';
    }
    
    viewModeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 移动端需要计算位置
        if (isMobile()) {
            updateDropdownPosition();
        }
        
        viewModeDropdown.classList.toggle('show');
        viewModeBtn.classList.toggle('active');
    });
    
    // 窗口大小改变时更新位置
    window.addEventListener('resize', function() {
        if (isMobile() && viewModeDropdown.classList.contains('show')) {
            updateDropdownPosition();
        }
    });
    
    // 滚动时更新位置
    window.addEventListener('scroll', function() {
        if (isMobile() && viewModeDropdown.classList.contains('show')) {
            updateDropdownPosition();
        }
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function(e) {
        if (!viewModeBtn.contains(e.target) && !viewModeDropdown.contains(e.target)) {
        viewModeDropdown.classList.remove('show');
        viewModeBtn.classList.remove('active');
        }
    });
    
    // 浏览模式选择
    viewModeDropdown.addEventListener('click', function(e) {
        if (e.target.classList.contains('dropdown-item')) {
            const mode = e.target.dataset.mode;
            currentViewMode = mode;
            changeViewMode(mode);
            
            // 更新按钮文字
            const btnText = viewModeBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = e.target.textContent;
            }
            
            // 关闭菜单
            viewModeDropdown.classList.remove('show');
            viewModeBtn.classList.remove('active');
        }
    });
}

// 改变浏览模式 - 使用 !important 强制覆盖
function changeViewMode(mode) {
    const photoItems = document.querySelectorAll('.photo-item');
    
    photoItems.forEach(item => {
        const photoInfo = item.querySelector('.photo-info');
        const photoTags = item.querySelector('.photo-tags');
        
        // 移除所有类
        item.classList.remove('image-only');
        
        // 根据模式显示相应元素
        if (mode === 'full') {
            // 显示标签
            if (photoInfo) {
                photoInfo.style.setProperty('display', 'block', 'important');
                photoInfo.style.setProperty('padding', '20px', 'important');
            }
            if (photoTags) {
                photoTags.style.setProperty('display', 'flex', 'important');
            }
        } else if (mode === 'image') {
            // 仅图片
            item.classList.add('image-only');
        }
    });
}

// 照片数据来源改为静态 JSON（photos.json）
const photos = [];

// 当前显示的照片
let currentPhotos = [...photos];
let currentPhotoIndex = 0;
let currentCameraFilter = 'all';
let currentLensFilter = 'all';
let currentPage = 1;
const PAGE_SIZE = 12;

// DOM 元素
const photoGallery = document.getElementById("photoGallery");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const filterBtns = document.querySelectorAll(".filter-btn");
const pagination = document.getElementById("pagination");

// 初始化
document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    fetchPhotosFromJson();
    initializeViewModeSelector();
    initializeSortSelector();
    changeViewMode('full');
});


// 渲染照片
function renderPhotos() {
    photoGallery.innerHTML = "";

    // 分页
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = currentPhotos.slice(start, end);

    pageItems.forEach((photo, index) => {
        const photoItem = document.createElement("div");
        photoItem.className = "photo-item";
        
        // 优先使用缩略图，如果没有则使用原图
        const imageSrc = photo.thumbnail || photo.src;
        
        photoItem.innerHTML = `
            <img src="${imageSrc}" alt="${photo.title}" loading="lazy" data-original="${photo.src}">
            <div class="photo-info">
                <div class="photo-meta">
                    <span class="photo-camera">${photo.camera || ''}</span>
                    <div class="photo-tags">${Array.isArray(photo.tags) ? photo.tags.map(t => `<span class=\"tag\">${t}</span>`).join('') : ''}</div>
                </div>
            </div>
        `;
        
        const globalIndex = start + index;
        photoItem.addEventListener("click", () => openLightbox(globalIndex));
        photoGallery.appendChild(photoItem);
    });

    renderPagination();
    
    // 重新应用当前的浏览模式
    changeViewMode(currentViewMode);
}

// 动态渲染标签筛选按钮
function renderTagControls() {
    const controls = document.getElementById('tagControls');
    if (!controls) return;

    // 收集相机集合；镜头集合**按当前相机筛选**以便只展示有图片的镜头
    const cameras = new Set();
    photos.forEach(p => { if (p.camera) cameras.add(p.camera); });

    // 当相机未选择（all）时，展示所有镜头；否则只展示与当前相机匹配的镜头
    const lenses = new Set();
    photos.forEach(p => {
        if (currentCameraFilter === 'all' || p.camera === currentCameraFilter) {
            if (Array.isArray(p.tags)) p.tags.forEach(t => lenses.add(t));
        }
    });

    controls.innerHTML = '';

    // 创建单行辅助函数
    function makeRow(title, items, type) {
        const row = document.createElement('div');
        row.className = 'filter-row';

        const label = document.createElement('span');
        label.className = 'filter-row-label';
        label.textContent = title + ':';
        row.appendChild(label);

        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn' + ((type === 'camera' && currentCameraFilter === 'all') || (type === 'lens' && currentLensFilter === 'all') ? ' active' : '');
        allBtn.dataset.filter = 'all';
        allBtn.dataset.type = type;
        allBtn.textContent = '全部';
        allBtn.addEventListener('click', () => {
            if (type === 'camera') {
                currentCameraFilter = 'all';
                // 切换相机后重置不可用的镜头选择
                if (!currentPhotos.some(p => Array.isArray(p.tags) && p.tags.includes(currentLensFilter))) {
                    currentLensFilter = 'all';
                }
                applySort(currentSortMode);
                // 重新渲染以刷新镜头行
                renderTagControls();
            } else {
                currentLensFilter = 'all';
                applySort(currentSortMode);
                // 更新 active（在同一行内）
                row.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
                allBtn.classList.add('active');
            }
        });
        row.appendChild(allBtn);

        const arr = Array.from(items).sort();
        arr.forEach(it => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn' + ((type === 'camera' && currentCameraFilter === it) || (type === 'lens' && currentLensFilter === it) ? ' active' : '');
            btn.dataset.filter = it;
            btn.dataset.type = type;
            btn.textContent = it;
            btn.addEventListener('click', () => {
                if (type === 'camera') {
                    currentCameraFilter = it;
                    // 切换相机后若当前 lens 不存在于结果中则重置为 all
                    if (!currentPhotos.some(p => Array.isArray(p.tags) && p.tags.includes(currentLensFilter))) {
                        currentLensFilter = 'all';
                    }
                    applySort(currentSortMode);
                    // 重新渲染以刷新镜头行
                    renderTagControls();
                } else {
                    currentLensFilter = it;
                    applySort(currentSortMode);
                    // 更新 active（在同一行内）
                    row.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
            row.appendChild(btn);
        });

        return row;
    }

    // Camera row
    const camRow = makeRow('相机', cameras, 'camera');
    controls.appendChild(camRow);

    // Lens row
    const lensRow = makeRow('镜头', lenses, 'lens');
    controls.appendChild(lensRow);
}

// 绑定事件
function setupEventListeners() {
    // 标签按钮由 renderTagControls 动态生成并绑定
    
    // 关闭灯箱 - 移动端和桌面端
    const closeLightboxMobile = document.getElementById('closeLightbox');
    const closeLightboxDesktop = document.getElementById('closeLightboxDesktop');
    
    if (closeLightboxMobile) closeLightboxMobile.addEventListener("click", closeLightboxHandler);
    if (closeLightboxDesktop) closeLightboxDesktop.addEventListener("click", closeLightboxHandler);
    lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
            closeLightboxHandler();
        }
    });
    
    // 导航按钮 - 移动端和桌面端
    const prevBtnMobile = document.getElementById('prevBtn');
    const nextBtnMobile = document.getElementById('nextBtn');
    const prevBtnDesktop = document.getElementById('prevBtnDesktop');
    const nextBtnDesktop = document.getElementById('nextBtnDesktop');
    
    if (prevBtnMobile) prevBtnMobile.addEventListener("click", showPrevPhoto);
    if (nextBtnMobile) nextBtnMobile.addEventListener("click", showNextPhoto);
    if (prevBtnDesktop) prevBtnDesktop.addEventListener("click", showPrevPhoto);
    if (nextBtnDesktop) nextBtnDesktop.addEventListener("click", showNextPhoto);
    
    // 键盘事件
    document.addEventListener("keydown", handleKeyboard);
}

// 从静态 JSON 拉取照片（兼容 {photos: []} 或直接数组）
async function fetchPhotosFromJson() {
    try {
        const jsonPath = (window.PHOTOS_JSON_URL || 'photos.json') + '?v=' + Date.now();
        const res = await fetch(jsonPath, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload.photos) ? payload.photos : []);
        // 兼容旧结构：无 tags 则尝试用 category 映射
        const normalized = list.map(p => {
            // ensure tags exists
            let tags = Array.isArray(p.tags) ? p.tags : ((p.category && typeof p.category === 'string') ? [p.category] : []);
            // derive camera from EXIF if not present
            let camera = p.camera || '';
            if (!camera && p.exif) {
                camera = p.exif['相机型号'] || p.exif['相机品牌'] || '';
            }
            return { ...p, tags, camera };
        });
        
        // 为每张照片添加缩略图路径（如果存在），并优先使用 JPG 缩略图以兼容浏览器
        const withThumbnails = normalized.map(p => {
            // 优先使用 photos.json 中的 thumbnailPath 字段（可能来自管理员上传）
            let thumb = p.thumbnailPath || null;
            if (thumb) thumb = thumb.replace(/\\/g, '/');

            // 如果没有 thumbnailPath，基于 src 生成
            if (!thumb && p.src && p.src.startsWith('data/')) {
                thumb = p.src.replace('data/', 'thumbnails/');
            }

            if (thumb) {
                // 若是 HEIC/HEIF 扩展名，优先尝试对应的 .jpg 缩略图
                const lower = thumb.toLowerCase();
                if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
                    const jpgThumb = thumb.replace(/\.(heic|heif)$/i, '.jpg');
                    // 使用 .jpg 路径（生成脚本已创建 .jpg 缩略图）
                    thumb = jpgThumb;
                }
                return { ...p, thumbnail: thumb };
            }
            return p;
        });
        
        photos.splice(0, photos.length, ...withThumbnails);
        // 应用当前排序
        applySort(currentSortMode);
        renderPhotos();
        renderTagControls();
    } catch (e) {
        console.warn('加载 photos.json 失败', e);
        photoGallery.innerHTML = '<div style="text-align:center;color:#6c757d;padding:40px;">无法加载照片数据。请确认仓库根目录存在 <code>photos.json</code>，且结构为数组或 { photos: [...] }。<br/>你也可以在页面上设置 window.PHOTOS_JSON_URL 指向正确路径。</div>';
    }
}

// 获取照片的时间戳
function getPhotoTimestamp(photo) {
    // 优先使用EXIF中的原始拍摄时间
    if (photo.exif && photo.exif['原始拍摄时间']) {
        const timeStr = photo.exif['原始拍摄时间'];
        // 格式: "2022:10:23 17:15:54"
        const date = new Date(timeStr.replace(/:/g, '-').replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
            return date.getTime();
        }
    }
    
    // 其次使用EXIF中的拍摄时间
    if (photo.exif && photo.exif['拍摄时间']) {
        const timeStr = photo.exif['拍摄时间'];
        const date = new Date(timeStr.replace(/:/g, '-').replace(' ', 'T'));
        if (!isNaN(date.getTime())) {
            return date.getTime();
        }
    }
    
    // 从文件名中提取时间戳（如果文件名以时间戳开头）
    if (photo.src) {
        const match = photo.src.match(/(\d{13})/);
        if (match) {
            return parseInt(match[1]);
        }
    }
    
    // 使用id作为后备（假设id是按时间顺序的）
    return photo.id || 0;
}

// 排序照片
function applySort(sortMode) {
    // 先按相机与镜头过滤
    const filtered = photos.filter(p => {
        const okCamera = currentCameraFilter === 'all' || (p.camera && p.camera === currentCameraFilter);
        const okLens = currentLensFilter === 'all' || (Array.isArray(p.tags) && p.tags.includes(currentLensFilter));
        return okCamera && okLens;
    });

    if (sortMode === 'time-asc') {
        currentPhotos = filtered.sort((a, b) => getPhotoTimestamp(a) - getPhotoTimestamp(b));
    } else if (sortMode === 'time-desc') {
        currentPhotos = filtered.sort((a, b) => getPhotoTimestamp(b) - getPhotoTimestamp(a));
    } else {
        currentPhotos = filtered;
    }

    currentPage = 1;
    renderPhotos();
}

// 排序选择器初始化
function initializeSortSelector() {
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    
    if (!sortBtn || !sortDropdown) return;
    
    // 判断是否为移动端
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // 更新下拉菜单位置（移动端）
    function updateDropdownPosition() {
        if (!isMobile()) return;
        
        const btnRect = sortBtn.getBoundingClientRect();
        const dropdown = sortDropdown;
        
        // 计算位置：在按钮下方，右对齐
        dropdown.style.top = (btnRect.bottom + window.scrollY + 8) + 'px';
        dropdown.style.right = (window.innerWidth - btnRect.right) + 'px';
    }
    
    sortBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // 移动端需要计算位置
        if (isMobile()) {
            updateDropdownPosition();
        }
        
        sortDropdown.classList.toggle('show');
        sortBtn.classList.toggle('active');
    });
    
    // 窗口大小改变时更新位置
    window.addEventListener('resize', function() {
        if (isMobile() && sortDropdown.classList.contains('show')) {
            updateDropdownPosition();
        }
    });
    
    // 滚动时更新位置
    window.addEventListener('scroll', function() {
        if (isMobile() && sortDropdown.classList.contains('show')) {
            updateDropdownPosition();
        }
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function(e) {
        if (!sortBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove('show');
            sortBtn.classList.remove('active');
        }
    });
    
    // 排序选择
    sortDropdown.addEventListener('click', function(e) {
        if (e.target.classList.contains('dropdown-item')) {
            const sortMode = e.target.dataset.sort;
            currentSortMode = sortMode;
            applySort(sortMode);
            
            // 更新按钮文字
            const btnText = sortBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = e.target.textContent;
            }
            
            // 关闭菜单
            sortDropdown.classList.remove('show');
            sortBtn.classList.remove('active');
        }
    });
    
    // 设置初始按钮文字
    const initialText = currentSortMode === 'time-desc' ? '由新到旧' : '由旧到新';
    const btnText = sortBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = initialText;
    }
}

// 过滤照片（按标签）
function filterPhotosByTag(tag) {
    // 兼容旧代码：将单一标签过滤视为镜头过滤
    currentLensFilter = tag;
    applySort(currentSortMode);
}

function renderPagination() {
    if (!pagination) return;
    pagination.innerHTML = '';
    const total = currentPhotos.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.textContent = '上一页';
    prev.disabled = currentPage === 1;
    prev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage -= 1;
            renderPhotos();
        }
    });
    pagination.appendChild(prev);

    const makeBtn = (p) => {
        const b = document.createElement('button');
        b.textContent = String(p);
        if (p === currentPage) b.classList.add('active');
        b.addEventListener('click', () => { currentPage = p; renderPhotos(); });
        return b;
    };
    const addEllipsis = () => {
        const s = document.createElement('span');
        s.textContent = '...';
        s.style.padding = '8px 4px';
        pagination.appendChild(s);
    };

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pagination.appendChild(makeBtn(i));
    } else {
        if (currentPage <= 4) {
            for (let i = 1; i <= 5; i++) pagination.appendChild(makeBtn(i));
            addEllipsis();
            pagination.appendChild(makeBtn(totalPages));
        } else if (currentPage >= totalPages - 3) {
            pagination.appendChild(makeBtn(1));
            addEllipsis();
            for (let i = totalPages - 4; i <= totalPages; i++) pagination.appendChild(makeBtn(i));
        } else {
            pagination.appendChild(makeBtn(1));
            addEllipsis();
            for (let i = currentPage - 1; i <= currentPage + 1; i++) pagination.appendChild(makeBtn(i));
            addEllipsis();
            pagination.appendChild(makeBtn(totalPages));
        }
    }

    const next = document.createElement('button');
    next.textContent = '下一页';
    next.disabled = currentPage === totalPages;
    next.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            renderPhotos();
        }
    });
    pagination.appendChild(next);
}

// 打开灯箱
function openLightbox(index) {
    currentPhotoIndex = index;
    const photo = currentPhotos[index];
    
    // 先显示灯箱，立即显示UI布局
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
    
    // 重置图片加载状态
    lightboxImage.classList.remove('loaded');
    
    // 显示占位符
    const placeholder = document.getElementById('imagePlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    
    // 设置图片信息
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    const exifSection = document.getElementById('exifSection');
    const exifGrid = document.getElementById('exifGrid');
    
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
    
    // 显示EXIF元数据
    if (photo.exif && Object.keys(photo.exif).length > 0) {
        displayExifData(photo.exif, exifGrid);
        if (exifSection) exifSection.style.display = 'block';
    } else {
        if (exifSection) exifSection.style.display = 'none';
    }
    
    // 预加载图片
    const img = new Image();
    img.onload = function() {
        // 图片加载完成后，设置src并显示
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.title;
        
        // 隐藏占位符
        const placeholder = document.getElementById('imagePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // 添加淡入效果
        setTimeout(() => {
            lightboxImage.classList.add('loaded');
        }, 100);
    };
    
    img.onerror = function() {
        // 图片加载失败时，显示错误信息
        lightboxImage.src = '';
        lightboxImage.alt = '图片加载失败';
        lightboxImage.classList.add('loaded');
        
        // 隐藏占位符
        const placeholder = document.getElementById('imagePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    // 开始加载图片
    img.src = photo.src;
}

// 关闭灯箱
function closeLightboxHandler() {
    lightbox.classList.remove("show");
    document.body.style.overflow = "";
}

// 显示上一张
function showPrevPhoto() {
    currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
    const photo = currentPhotos[currentPhotoIndex];
    
    // 重置图片加载状态
    lightboxImage.classList.remove('loaded');
    
    // 设置图片信息
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    const exifSection = document.getElementById('exifSection');
    const exifGrid = document.getElementById('exifGrid');
    
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
    
    // 显示EXIF元数据
    if (photo.exif && Object.keys(photo.exif).length > 0) {
        displayExifData(photo.exif, exifGrid);
        if (exifSection) exifSection.style.display = 'block';
    } else {
        if (exifSection) exifSection.style.display = 'none';
    }
    
    // 显示占位符
    const placeholder = document.getElementById('imagePlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    
    // 预加载图片
    const img = new Image();
    img.onload = function() {
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.title;
        
        // 隐藏占位符
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        setTimeout(() => {
            lightboxImage.classList.add('loaded');
        }, 100);
    };
    
    img.onerror = function() {
        lightboxImage.src = '';
        lightboxImage.alt = '图片加载失败';
        lightboxImage.classList.add('loaded');
        
        // 隐藏占位符
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    img.src = photo.src;
}

// 显示下一张
function showNextPhoto() {
    currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
    const photo = currentPhotos[currentPhotoIndex];
    
    // 重置图片加载状态
    lightboxImage.classList.remove('loaded');
    
    // 设置图片信息
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    const exifSection = document.getElementById('exifSection');
    const exifGrid = document.getElementById('exifGrid');
    
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
    
    // 显示EXIF元数据
    if (photo.exif && Object.keys(photo.exif).length > 0) {
        displayExifData(photo.exif, exifGrid);
        if (exifSection) exifSection.style.display = 'block';
    } else {
        if (exifSection) exifSection.style.display = 'none';
    }
    
    // 显示占位符
    const placeholder = document.getElementById('imagePlaceholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    
    // 预加载图片
    const img = new Image();
    img.onload = function() {
        lightboxImage.src = photo.src;
        lightboxImage.alt = photo.title;
        
        // 隐藏占位符
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        setTimeout(() => {
            lightboxImage.classList.add('loaded');
        }, 100);
    };
    
    img.onerror = function() {
        lightboxImage.src = '';
        lightboxImage.alt = '图片加载失败';
        lightboxImage.classList.add('loaded');
        
        // 隐藏占位符
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    img.src = photo.src;
}

// 键盘事件
function handleKeyboard(e) {
    if (!lightbox.classList.contains("show")) return;
    
    switch(e.key) {
        case "Escape":
            closeLightboxHandler();
            break;
        case "ArrowLeft":
            showPrevPhoto();
            break;
        case "ArrowRight":
            showNextPhoto();
            break;
    }
}

// 显示EXIF元数据
function displayExifData(exifData, container) {
    if (!container) return;
    
    // 定义所有参数（使用暗色显示）
    const cameraParams = [
        '相机品牌', '相机型号', '镜头型号', '焦距', '光圈值', '曝光时间', 'ISO感光度', '原始拍摄时间'
    ];
    
    // 定义参数显示顺序和别名
    const paramOrder = [
        { key: '相机品牌', alias: '相机品牌' },
        { key: '相机型号', alias: '相机型号' },
        { key: '镜头型号', alias: '镜头型号' },
        { key: '焦距', alias: '焦距' },
        { key: '光圈值', alias: '光圈值' },
        { key: '曝光时间', alias: '快门速度' },
        { key: 'ISO感光度', alias: 'ISO感光度' },
        { key: '原始拍摄时间', alias: '拍摄时间' }
    ];
    
    let html = '';
    
            paramOrder.forEach(param => {
            if (exifData[param.key]) {
                const value = exifData[param.key];
                
                html += `
                    <div class="exif-item camera-param">
                        <div class="exif-label">${param.alias}</div>
                        <div class="exif-value">${value}</div>
                    </div>
                `;
            }
        });
    
    // 如果没有找到任何参数，显示提示信息
    if (!html) {
        html = `
            <div class="exif-item">
                <div class="exif-label">无EXIF数据</div>
                <div class="exif-value">此图片没有拍摄参数信息</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 新增照片的函数
function addPhoto(photoData) {
    photos.push({
        id: photos.length + 1,
        ...photoData
    });
    
    // 若当前显示为"全部"分类，则重新渲染
    const activeFilter = document.querySelector(".filter-btn.active").dataset.filter;
    if (activeFilter === "all") {
        currentPhotos = [...photos];
        renderPhotos();
    }
}

// 示例：动态添加照片
// addPhoto({
//     src: "你的照片URL",
//     title: "照片标题",
//     description: "照片描述",
//     category: "nature" // 或 "portrait", "street"
// });
