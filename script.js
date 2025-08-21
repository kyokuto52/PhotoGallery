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
        photoItem.innerHTML = `
            <img src="${photo.src}" alt="${photo.title}" loading="lazy">
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
        photos.splice(0, photos.length, ...normalized);
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
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.title;
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
    
    lightbox.classList.add("show");
    document.body.style.overflow = "hidden";
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
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.title;
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
}

// 显示下一张
function showNextPhoto() {
    currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
    const photo = currentPhotos[currentPhotoIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.title;
    const t = document.getElementById('infoTitle');
    const d = document.getElementById('infoDesc');
    const tg = document.getElementById('infoTags');
    if (t) t.textContent = photo.title || '';
    if (d) d.textContent = photo.description || '';
    if (tg) tg.innerHTML = Array.isArray(photo.tags) ? photo.tags.map(x => `<span class=\"tag\">${x}</span>`).join('') : '';
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
