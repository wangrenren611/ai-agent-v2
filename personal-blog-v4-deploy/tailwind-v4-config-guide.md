# Tailwind CSS v4 配置指南

## 概述
Tailwind CSS v4 引入了全新的 CSS-first 配置方式，不再需要传统的 `tailwind.config.js` 文件。以下是完整的配置说明。

## 基本配置

### 1. 通过 CDN 使用 (开发环境)
```html
<!-- 在 head 标签中添加 -->
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

### 2. 自定义主题配置
```css
<style>
@import "tailwindcss";

/* 使用 @theme 指令定义自定义主题 */
@theme {
  /* 自定义颜色 */
  --color-primary: #18181B;
  --color-secondary: #3F3F46;
  --color-accent: #2563EB;
  --color-background: #FAFAFA;
  --color-text: #09090B;
  
  /* 自定义字体 */
  --font-heading: 'Caveat', cursive;
  --font-body: 'Quicksand', sans-serif;
  
  /* 自定义动画 */
  --animate-fade-in: fadeIn 0.5s ease-in-out;
  --animate-slide-up: slideUp 0.6s ease-out;
  
  /* 定义关键帧动画 */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
</style>
```

## 完整配置示例

### HTML 结构
```html
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS v4 Play CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    
    <!-- 自定义配置 -->
    <style>
        @import "tailwindcss";
        
        /* 主题配置 */
        @theme {
            /* 颜色系统 */
            --color-primary: #18181B;
            --color-secondary: #3F3F46;
            --color-accent: #2563EB;
            --color-background: #FAFAFA;
            --color-text: #09090B;
            
            /* 字体系统 */
            --font-heading: 'Caveat', cursive;
            --font-body: 'Quicksand', sans-serif;
            
            /* 动画系统 */
            --animate-fade-in: fadeIn 0.5s ease-in-out;
            --animate-slide-up: slideUp 0.6s ease-out;
            --animate-typewriter: typewriter 3s steps(40) 1s 1 normal both;
            --animate-blink: blink 0.75s step-end infinite;
            
            /* 关键帧动画 */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes typewriter {
                from { width: 0; }
                to { width: 100%; }
            }
            
            @keyframes blink {
                0%, 100% { border-color: transparent; }
                50% { border-color: var(--color-accent); }
            }
        }
        
        /* 减少运动偏好支持 */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* 自定义工具类 */
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .dark .glass-card {
            background: rgba(30, 30, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .hover-lift {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        /* 自定义颜色工具类 */
        .bg-primary { background-color: var(--color-primary); }
        .text-primary { color: var(--color-primary); }
        .border-primary { border-color: var(--color-primary); }
        
        .bg-secondary { background-color: var(--color-secondary); }
        .text-secondary { color: var(--color-secondary); }
        .border-secondary { border-color: var(--color-secondary); }
        
        .bg-accent { background-color: var(--color-accent); }
        .text-accent { color: var(--color-accent); }
        .border-accent { border-color: var(--color-accent); }
        
        .bg-background { background-color: var(--color-background); }
        .text-text { color: var(--color-text); }
        
        /* 自定义字体工具类 */
        .font-heading { font-family: var(--font-heading); }
        .font-body { font-family: var(--font-body); }
        
        /* 动画工具类 */
        .animate-fade-in { animation: var(--animate-fade-in); }
        .animate-slide-up { animation: var(--animate-slide-up); }
    </style>
</head>
<body class="bg-background text-text font-body min-h-screen transition-colors duration-300">
    <!-- 页面内容 -->
</body>
</html>
```

## 配置选项详解

### 1. 颜色配置
```css
@theme {
  /* 主色调 */
  --color-primary: #18181B;
  --color-secondary: #3F3F46;
  --color-accent: #2563EB;
  
  /* 背景和文本 */
  --color-background: #FAFAFA;
  --color-text: #09090B;
  
  /* 扩展 Tailwind 默认颜色 */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  /* ... 其他颜色 */
}
```

### 2. 字体配置
```css
@theme {
  /* 自定义字体族 */
  --font-heading: 'Caveat', cursive;
  --font-body: 'Quicksand', sans-serif;
  
  /* 字体大小 (可选) */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  /* ... 其他字体大小 */
}
```

### 3. 动画配置
```css
@theme {
  /* 定义动画名称和值 */
  --animate-fade-in: fadeIn 0.5s ease-in-out;
  --animate-slide-up: slideUp 0.6s ease-out;
  
  /* 定义关键帧 */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
```

### 4. 间距和尺寸
```css
@theme {
  /* 自定义间距 */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  /* ... 其他间距 */
  
  /* 断点 */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

## 使用自定义配置

### 在 HTML 中使用
```html
<!-- 使用自定义颜色 -->
<div class="bg-primary text-text">
  <h1 class="font-heading text-4xl">标题</h1>
  <p class="font-body text-secondary">正文内容</p>
</div>

<!-- 使用自定义动画 -->
<div class="animate-fade-in">
  淡入效果的内容
</div>

<!-- 使用玻璃态效果 -->
<div class="glass-card rounded-xl p-6">
  玻璃态卡片
</div>

<!-- 使用悬停效果 -->
<button class="bg-accent text-white px-4 py-2 rounded-lg hover-lift">
  悬停按钮
</button>
```

## 生产环境配置

### 1. 安装 Tailwind CSS v4
```bash
npm install -D tailwindcss@next
```

### 2. 创建 CSS 文件
```css
/* styles.css */
@import "tailwindcss";

@theme {
  /* 你的自定义配置 */
  --color-primary: #18181B;
  --color-secondary: #3F3F46;
  --color-accent: #2563EB;
  --color-background: #FAFAFA;
  --color-text: #09090B;
  
  --font-heading: 'Caveat', cursive;
  --font-body: 'Quicksand', sans-serif;
}

/* 自定义工具类 */
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass-card {
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 3. 构建 CSS
```bash
npx tailwindcss -i ./styles.css -o ./dist/output.css
```

### 4. 在 HTML 中引用
```html
<link href="/dist/output.css" rel="stylesheet">
```

## 最佳实践

### 1. 组织配置
```css
/* 按功能模块组织 */
@theme {
  /* 颜色系统 */
  --color-brand: #2563EB;
  --color-surface: #FFFFFF;
  --color-on-surface: #18181B;
  
  /* 字体系统 */
  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  
  /* 间距系统 */
  --spacing-base: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* 动画系统 */
  --animate-fade: fade 0.3s ease;
  --animate-slide: slide 0.4s ease-out;
}
```

### 2. 使用 CSS 变量
```css
:root {
  /* 定义 CSS 变量 */
  --primary-color: #2563EB;
  --secondary-color: #3F3F46;
}

@theme {
  /* 引用 CSS 变量 */
  --color-primary: var(--primary-color);
  --color-secondary: var(--secondary-color);
}
```

### 3. 深色模式支持
```css
/* 自动深色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #60A5FA;
    --background-color: #0F172A;
  }
}

/* 手动切换 */
.dark {
  --primary-color: #60A5FA;
  --background-color: #0F172A;
}
```

## 常见问题

### 1. CDN 与本地构建的区别
- **CDN**: 适合开发、原型、演示
- **本地构建**: 适合生产环境，性能更好

### 2. 自定义工具类不生效
确保在 `@import "tailwindcss";` 之后定义自定义工具类。

### 3. 动画性能优化
```css
/* 使用 transform 和 opacity 进行动画 */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 避免使用 width/height 动画 */
.bad-animation {
  animation: widthChange 1s ease; /* 性能差 */
}

.good-animation {
  animation: transformChange 1s ease; /* 性能好 */
}
```

### 4. 浏览器兼容性
- Tailwind CSS v4 需要现代浏览器支持
- 使用 PostCSS 和 Autoprefixer 处理兼容性

## 迁移指南

### 从 v3 迁移到 v4
1. 移除 `tailwind.config.js` 文件
2. 将配置移动到 CSS 中的 `@theme` 指令
3. 更新构建流程
4. 测试所有自定义工具类

### 配置映射示例
```javascript
// v3 tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#18181B',
        accent: '#2563EB',
      },
      fontFamily: {
        heading: ['Caveat', 'cursive'],
      },
    },
  },
}

// v4 CSS 配置
@theme {
  --color-primary: #18181B;
  --color-accent: #2563EB;
  --font-heading: 'Caveat', cursive;
}
```

## 总结
Tailwind CSS v4 的 CSS-first 配置方式更加直观和灵活。通过 `@theme` 指令，你可以在 CSS 中直接定义所有配置，无需额外的 JavaScript 配置文件。这种方式特别适合：
- 快速原型开发
- 简单的静态网站
- 希望减少构建步骤的项目
- 需要灵活配置的场景