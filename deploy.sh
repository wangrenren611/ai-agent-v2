#!/bin/bash

# Personal Blog Website Deployment Script
# This script prepares the website for deployment

echo "🚀 Personal Blog Website Deployment Script"
echo "=========================================="

# Create deployment directory
DEPLOY_DIR="personal-blog-deploy"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
mkdir -p $DEPLOY_DIR

# Copy essential files
echo "📋 Copying website files..."
cp personal-blog.html $DEPLOY_DIR/index.html
cp personal-blog-README.md $DEPLOY_DIR/README.md

# Create a simple .htaccess for better routing
echo "⚙️ Creating .htaccess file..."
cat > $DEPLOY_DIR/.htaccess << 'EOF'
# Enable rewrite engine
RewriteEngine On

# Force HTTPS (uncomment in production)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

# Remove .html extension
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}\.html -f
RewriteRule ^(.*)$ $1.html [NC,L]

# Custom error pages
ErrorDocument 404 /404.html
ErrorDocument 500 /500.html

# Security headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"

# CORS for fonts
<FilesMatch "\.(ttf|ttc|otf|eot|woff|woff2|font.css)$">
    Header set Access-Control-Allow-Origin "*"
</FilesMatch>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache control
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
EOF

# Create a simple 404 page
echo "🔧 Creating 404 error page..."
cat > $DEPLOY_DIR/404.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found | Personal Blog</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            font-family: 'Quicksand', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <div class="text-center text-white p-8">
        <h1 class="text-6xl font-bold mb-4">404</h1>
        <h2 class="text-3xl font-semibold mb-6">Page Not Found</h2>
        <p class="text-xl mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
        </p>
        <a href="/" class="inline-block bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200">
            ← Back to Home
        </a>
    </div>
</body>
</html>
EOF

# Create deployment instructions
echo "📝 Creating deployment instructions..."
cat > $DEPLOY_DIR/DEPLOYMENT.md << 'EOF'
# Deployment Instructions

## Quick Deployment Options

### Option 1: Netlify (Recommended)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the entire folder to "Deploy manually"
3. Your site will be live instantly at `*.netlify.app`

### Option 2: Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import Git repository or drag and drop folder
3. Deploy with one click

### Option 3: GitHub Pages
1. Create a new GitHub repository
2. Push all files to the repository
3. Go to Settings → Pages → Select main branch
4. Your site will be at `username.github.io/repository-name`

### Option 4: Traditional Web Hosting
1. Upload all files via FTP to your web hosting
2. Ensure `.htaccess` file is uploaded
3. Update DNS settings if using custom domain

## Post-Deployment Checklist

### 1. Update Configuration
- [ ] Replace placeholder content with personal information
- [ ] Update social media links in About section
- [ ] Add real project images and descriptions
- [ ] Update newsletter form action URL

### 2. SEO Optimization
- [ ] Update meta tags in index.html
- [ ] Add Google Analytics tracking code
- [ ] Submit sitemap to Google Search Console
- [ ] Set up proper Open Graph tags

### 3. Newsletter Integration
- [ ] Connect form to Mailchimp/ConvertKit
- [ ] Set up confirmation emails
- [ ] Create welcome email sequence

### 4. Performance Testing
- [ ] Run Google PageSpeed Insights
- [ ] Test on multiple devices
- [ ] Check browser compatibility
- [ ] Verify SSL certificate

## Custom Domain Setup

### Netlify/Vercel
1. Go to Domain settings
2. Add custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### Traditional Hosting
1. Update DNS A record to point to hosting IP
2. Add domain in hosting control panel
3. Install SSL certificate (Let's Encrypt)

## Maintenance

### Regular Updates
- Update blog content regularly
- Refresh portfolio projects
- Monitor newsletter performance
- Check for broken links

### Security
- Keep dependencies updated
- Monitor for security vulnerabilities
- Regular backups
- SSL certificate renewal

## Support
For issues or questions:
1. Check the README.md file
2. Review browser console for errors
3. Test with JavaScript disabled
4. Validate HTML at validator.w3.org

## File Structure
```
personal-blog-deploy/
├── index.html          # Main website file
├── README.md           # Project documentation
├── .htaccess          # Apache configuration
├── 404.html           # Custom error page
└── DEPLOYMENT.md      # This file
```
EOF

# Create a simple package.json for Node.js deployment
echo "📦 Creating package.json for Node.js deployment..."
cat > $DEPLOY_DIR/package.json << 'EOF'
{
  "name": "personal-blog",
  "version": "1.0.0",
  "description": "Modern personal blog and portfolio website",
  "main": "index.html",
  "scripts": {
    "start": "npx serve .",
    "dev": "npx serve .",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "keywords": ["blog", "portfolio", "personal", "website"],
  "author": "Alex Chen",
  "license": "MIT",
  "devDependencies": {
    "serve": "^14.0.0"
  }
}
EOF

echo "✅ Deployment package created successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "   Total files: $(find $DEPLOY_DIR -type f | wc -l)"
echo "   Total size: $(du -sh $DEPLOY_DIR | cut -f1)"
echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Quick test:"
echo "  cd $DEPLOY_DIR && npx serve ."
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "📚 See $DEPLOY_DIR/DEPLOYMENT.md for detailed instructions"