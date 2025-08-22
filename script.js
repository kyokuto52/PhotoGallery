// 浏览模式配置
let currentViewMode = 'full';

// 浏览模式选择器初始化
function initializeViewModeSelector() {
    const viewModeBtn = document.getElementById('viewModeBtn');
    const viewModeDropdown = document.getElementById('viewModeDropdown');
    
    if (!viewModeBtn || !viewModeDropdown) return;
    
    viewModeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        viewModeDropdown.classList.toggle('show');
        viewModeBtn.classList.toggle('active');
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function() {
        viewModeDropdown.classList.remove('show');
        viewModeBtn.classList.remove('active');
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
        const photoTitle = item.querySelector('.photo-title');
        const photoDesc = item.querySelector('.photo-description');
        const photoTags = item.querySelector('.photo-tags');
        
        // 先隐藏所有元素，使用 !important
        if (photoInfo) photoInfo.style.setProperty('display', 'none', 'important');
        if (photoTitle) photoTitle.style.setProperty('display', 'none', 'important');
        if (photoDesc) photoDesc.style.setProperty('display', 'none', 'important');
        if (photoTags) photoTags.style.setProperty('display', 'none', 'important');
        
        // 移除所有类
        item.classList.remove('image-only');
        
        // 根据模式显示相应元素，使用 !important
        if (mode === 'full') {
            if (photoInfo) {
                photoInfo.style.setProperty('display', 'block', 'important');
                photoInfo.style.setProperty('padding', '20px', 'important');
            }
            if (photoTitle) {
                photoTitle.style.setProperty('display', 'block', 'important');
                photoTitle.style.setProperty('margin-bottom', '12px', 'important');
            }
            if (photoDesc) {
                photoDesc.style.setProperty('display', 'block', 'important');
                photoDesc.style.setProperty('margin-bottom', '12px', 'important');
            }
            if (photoTags) {
                photoTags.style.setProperty('display', 'flex', 'important');
                photoTags.style.setProperty('margin-bottom', '0', 'important');
            }
        } else if (mode === 'tags') {
            if (photoInfo) {
                photoInfo.style.setProperty('display', 'block', 'important');
                photoInfo.style.setProperty('padding', '20px', 'important');
            }
            if (photoTags) {
                photoTags.style.setProperty('display', 'flex', 'important');
                photoTags.style.setProperty('margin-bottom', '0', 'important');
            }
        } else if (mode === 'image') {
            item.classList.add('image-only');
        }
    });
}

// 照片数据来源改为静态 JSON（photos.json）
const photos = [];

// 当前显示的照片
let currentPhotos = [...photos];
let currentPhotoIndex = 0;
let currentTagFilter = 'all';
let currentPage = 1;
const PAGE_SIZE = 12;

// DOM 元素
const photoGallery = document.getElementById("photoGallery");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const closeLightbox = document.getElementById("closeLightbox");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const filterBtns = document.querySelectorAll(".filter-btn");
const pagination = document.getElementById("pagination");

// 初始化
document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    fetchPhotosFromJson();
    initializeViewModeSelector();
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
                <h3 class="photo-title">${photo.title}</h3>
                <p class="photo-description">${photo.description}</p>
                <div class="photo-tags">${Array.isArray(photo.tags) ? photo.tags.map(t => `<span class=\"tag\">${t}</span>`).join('') : ''}</div>
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
    const unique = new Set();
    photos.forEach(p => (Array.isArray(p.tags) ? p.tags : []).forEach(t => unique.add(t)));
    // 清空“全部”之外的内容
    controls.innerHTML = '';

    const bracketL = document.createElement('span');
    bracketL.textContent = '[';
    bracketL.className = 'tag-bracket';
    controls.appendChild(bracketL);

    // 全部按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.textContent = '全部';
    allBtn.addEventListener('click', () => {
        currentTagFilter = 'all';
        currentPage = 1;
        filterPhotosByTag('all');
        controls.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
        allBtn.classList.add('active');
    });
    controls.appendChild(allBtn);

    const tags = Array.from(unique).sort();
    tags.forEach((tag, idx) => {
        const sep = document.createElement('span');
        sep.textContent = '|';
        sep.className = 'tag-sep';
        controls.appendChild(sep);

        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = tag;
        btn.textContent = tag;
        btn.addEventListener('click', () => {
            currentTagFilter = tag;
            currentPage = 1;
            filterPhotosByTag(tag);
            controls.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
        });
        controls.appendChild(btn);
    });

    const bracketR = document.createElement('span');
    bracketR.textContent = ']';
    bracketR.className = 'tag-bracket';
    controls.appendChild(bracketR);
}

// 绑定事件
function setupEventListeners() {
    // 初始“全部”按钮
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterPhotosByTag(filter);
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 关闭灯箱
    closeLightbox.addEventListener("click", closeLightboxHandler);
    lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
            closeLightboxHandler();
        }
    });
    
    // 导航按钮
    prevBtn.addEventListener("click", showPrevPhoto);
    nextBtn.addEventListener("click", showNextPhoto);
    
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
            if (!Array.isArray(p.tags)) {
                const t = (p.category && typeof p.category === 'string') ? [p.category] : [];
                return { ...p, tags: t };
            }
            return p;
        });
        
        // 为每张照片添加缩略图路径（如果存在）
        const withThumbnails = normalized.map(p => {
            // 如果原图在data文件夹中，尝试生成对应的缩略图路径
            if (p.src && p.src.startsWith('data/')) {
                const thumbnailPath = p.src.replace('data/', 'thumbnails/');
                return { ...p, thumbnail: thumbnailPath };
            }
            return p;
        });
        
        photos.splice(0, photos.length, ...withThumbnails);
        currentPhotos = [...photos];
        renderPhotos();
        renderTagControls();
    } catch (e) {
        console.warn('加载 photos.json 失败', e);
        photoGallery.innerHTML = '<div style="text-align:center;color:#6c757d;padding:40px;">无法加载照片数据。请确认仓库根目录存在 <code>photos.json</code>，且结构为数组或 { photos: [...] }。<br/>你也可以在页面上设置 window.PHOTOS_JSON_URL 指向正确路径。</div>';
    }
}

// 过滤照片（按标签）
function filterPhotosByTag(tag) {
    if (tag === 'all') {
        currentPhotos = [...photos];
    } else {
        currentPhotos = photos.filter(p => Array.isArray(p.tags) && p.tags.includes(tag));
    }
    currentPage = 1;
    renderPhotos();
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
