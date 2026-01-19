/**
 * 个人博客网站 JavaScript
 * 实现导航栏滚动效果、主题切换、移动端菜单等功能
 */

// ============================================
// DOM 元素选择器
// ============================================
const navbar = document.querySelector('.navbar');
const themeToggle = document.querySelector('.theme-toggle');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');
const backToTopBtn = document.querySelector('.back-to-top');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');
const articleItems = document.querySelectorAll('.article-item');

// ============================================
// 初始化应用
// ============================================
function init() {
    initTheme();
    initNavbar();
    initMobileMenu();
    initBackToTop();
    initFilters();
    initSearch();
    initNewsletterForm();
}

// ============================================
// 主题管理
// ============================================
function initTheme() {
    // 检查本地存储的主题偏好
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 设置初始主题
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // 更新主题切换图标
    updateThemeIcon();

    // 监听主题切换按钮
    themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const icon = themeToggle.querySelector('i');

    if (currentTheme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ============================================
// 导航栏滚动效果
// ============================================
function initNavbar() {
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // 添加滚动阴影效果
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// 移动端菜单
// ============================================
function initMobileMenu() {
    if (!mobileMenuBtn) return;

    mobileMenuBtn.addEventListener('click', toggleMobileMenu);

    // 点击菜单外部关闭菜单
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            closeMobileMenu();
        }
    });

    // 点击菜单项后关闭菜单
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
}

function toggleMobileMenu() {
    navMenu.classList.toggle('open');
    const icon = mobileMenuBtn.querySelector('i');

    if (navMenu.classList.contains('open')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

function closeMobileMenu() {
    navMenu.classList.remove('open');
    const icon = mobileMenuBtn.querySelector('i');
    icon.className = 'fas fa-bars';
}

// ============================================
// 回到顶部按钮
// ============================================
function initBackToTop() {
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ============================================
// 文章分类筛选
// ============================================
function initFilters() {
    if (filterTabs.length === 0) return;

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;

            // 更新激活状态
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 筛选文章
            filterArticles(filter);
        });
    });
}

function filterArticles(filter) {
    if (articleItems.length === 0) return;

    articleItems.forEach(item => {
        const category = item.dataset.category;

        if (filter === 'all' || category === filter) {
            item.style.display = 'grid';
            // 添加淡入动画
            item.style.opacity = '0';
            setTimeout(() => {
                item.style.opacity = '1';
            }, 50);
        } else {
            item.style.display = 'none';
        }
    });
}

// ============================================
// 搜索功能
// ============================================
function initSearch() {
    if (!searchInput) return;

    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // 防抖
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchArticles(query);
        }, 300);
    });
}

function searchArticles(query) {
    if (articleItems.length === 0) return;

    articleItems.forEach(item => {
        const title = item.querySelector('.article-item-title').textContent.toLowerCase();
        const excerpt = item.querySelector('.article-item-excerpt').textContent.toLowerCase();
        const tags = Array.from(item.querySelectorAll('.tag')).map(t => t.textContent.toLowerCase()).join(' ');

        const matchesSearch = title.includes(query) ||
                             excerpt.includes(query) ||
                             tags.includes(query);

        if (matchesSearch || query === '') {
            item.style.display = 'grid';
            item.style.opacity = '0';
            setTimeout(() => {
                item.style.opacity = '1';
            }, 50);
        } else {
            item.style.display = 'none';
        }
    });
}

// ============================================
// 订阅表单
// ============================================
function initNewsletterForm() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        if (validateEmail(email)) {
            // 模拟提交
            const button = form.querySelector('button');
            const originalText = button.innerHTML;

            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 订阅中...';

            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-check"></i> 订阅成功';
                button.style.backgroundColor = 'var(--accent)';

                // 清空输入
                emailInput.value = '';

                // 3秒后恢复按钮
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = originalText;
                    button.style.backgroundColor = '';
                }, 3000);
            }, 1500);
        } else {
            // 显示错误提示
            emailInput.style.borderColor = 'var(--danger)';
            emailInput.focus();

            setTimeout(() => {
                emailInput.style.borderColor = '';
            }, 3000);
        }
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ============================================
// 平滑滚动
// ============================================
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

// ============================================
// 图片懒加载
// ============================================
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;

                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// 动画元素进入视图
// ============================================
function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;

    const animatedElements = document.querySelectorAll('.article-card, .category-card, .skill-item, .achievement-card, .interest-card');

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                animationObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        animationObserver.observe(el);
    });
}

// ============================================
// 复制文本功能
// ============================================
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    } else {
        // 回退方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('已复制到剪贴板');
    }
}

// ============================================
// Toast 提示
// ============================================
function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--text-primary);
        color: var(--bg-primary);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    document.body.appendChild(toast);

    // 触发重排以启用过渡
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
}

// ============================================
// 键盘导航支持
// ============================================
document.addEventListener('keydown', (e) => {
    // ESC 键关闭移动菜单
    if (e.key === 'Escape') {
        closeMobileMenu();
    }

    // Ctrl/Cmd + K 打开搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// ============================================
// 性能优化：节流和防抖
// ============================================
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const args = arguments;
        const context = this;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// ============================================
// 页面加载完成后的操作
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    init();
    initLazyLoading();
    initScrollAnimations();
});

// ============================================
// 页面可见性变化
// ============================================
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.classList.add('page-hidden');
    } else {
        document.body.classList.remove('page-hidden');
    }
});

// ============================================
// 导出函数供外部使用
// ============================================
window.BlogApp = {
    toggleTheme,
    copyToClipboard,
    showToast,
    validateEmail
};

console.log('博客网站已加载 | 林雨轩的个人博客');
