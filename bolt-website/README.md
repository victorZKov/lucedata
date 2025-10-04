# LuceData - Website & Documentation Content

This directory contains all the content needed to build the LuceData product website and documentation.

## 📁 Directory Structure

```
bolt-website/
├── README.md                     ← You are here
├── SUMMARY.md                    ← Quick summary of all changes
├── STRUCTURE.md                  ← Complete website structure guide
│
├── product-website-pack.txt      ← Main prompt for bolt.new ⭐
├── product-website-prompt.txt    ← Alternative/simplified prompt
│
├── privacy-policy.md             ← Privacy Policy
├── terms-of-use.md               ← Terms of Use
├── LICENSE.md                    ← Software License Agreement
│
└── docs/                         ← Documentation files
    ├── README.md                 ← Documentation home page
    ├── installation.md           ← Installation guide
    ├── add-ai-engine.md          ← AI engine configuration
    ├── add-connection.md         ← Database connections
    ├── connections-tree.md       ← Navigation guide
    └── work-area.md              ← Query editor guide
```

## 🚀 Quick Start

### Building the Website

1. **Go to [bolt.new](https://bolt.new)**

2. **Copy the content** from `product-website-pack.txt`

3. **Paste it into bolt.new** and let it generate the website

4. **Customize** as needed:
   - Add your branding/logo
   - Upload screenshots
   - Adjust colors/theme
   - Configure beta registration form

5. **Deploy** to Vercel or your preferred hosting

---

## 📄 File Descriptions

### Main Website Prompts

#### `product-website-pack.txt` ⭐
**Use this one!** Complete prompt for building the product website with bolt.new.

**Includes:**
- Website structure (7 sections)
- Feature descriptions with marketing copy
- Beta registration flow
- Documentation links
- SEO requirements
- Tech stack recommendations

#### `product-website-prompt.txt`
Alternative/simplified version of the website prompt. Use this if you want a more minimal approach.

---

### Legal Documents

#### `privacy-policy.md`
Complete privacy policy covering:
- Data collection and usage
- Local vs. cloud storage
- Third-party AI services
- User rights (GDPR-compliant)
- Contact information

#### `terms-of-use.md`
Complete terms of service covering:
- Beta program terms
- BYOM responsibilities
- User control over database operations
- Disclaimers and liability
- Commercial version transition

#### `LICENSE.md`
Software license agreement covering:
- Beta license terms (current)
- Commercial license terms (future)
- Intellectual property rights
- Permitted and prohibited uses
- Warranty disclaimers
- Beta to commercial transition

---

### Documentation Files (`docs/`)

#### `docs/README.md`
Documentation portal home page with:
- Table of contents
- Quick links to all guides
- Common tasks
- Support information

#### `docs/installation.md`
Installation guide covering:
- System requirements (macOS, Windows)
- Beta registration
- Download and installation steps
- First launch setup
- Troubleshooting

#### `docs/add-ai-engine.md`
AI engine configuration guide covering:
- Supported providers (OpenAI, Azure, Claude, Gemini, Ollama)
- Getting API keys
- Configuration steps for each provider
- Managing multiple engines
- Cost management

#### `docs/add-connection.md`
Database connection guide covering:
- SQL Server connections
- PostgreSQL connections
- SQLite connections
- Permission configuration
- Security best practices
- Troubleshooting

#### `docs/connections-tree.md`
Connections Tree navigation guide covering:
- Tree structure and hierarchy
- Navigation techniques
- Working with database objects
- Context menus and actions
- Searching and filtering
- Keyboard shortcuts

#### `docs/work-area.md`
Work Area and query editing guide covering:
- Query tab management
- SQL editor features
- Executing queries
- Viewing and exporting results
- Query history
- Snippets and templates
- Keyboard shortcuts

---

### Supporting Documents

#### `SUMMARY.md`
Quick summary of all content created and changes made. Read this first for an overview.

#### `STRUCTURE.md`
Detailed website structure document with:
- Complete file structure
- Key messages emphasized
- Recommended website navigation
- Completion checklist
- Next steps

---

## 🎯 Key Features Highlighted

### Free Beta with Registration
✅ App is free during beta  
✅ Users register to receive download link via email  
✅ Available for macOS and Windows (Linux coming soon)

### BYOM (Bring Your Own Model)
✅ Beta users provide their own AI API keys  
✅ Supports: OpenAI, Azure, Claude, Gemini, Ollama  
✅ Commercial version will include custom DB-specialized model (updated weekly)  
✅ BYOM remains available in commercial version

### User Control & Safety
✅ AI proposes SQL queries, user executes them  
✅ Full write and DDL operations supported  
✅ All operations require user confirmation  
✅ Operations respect connection permissions

### Security & Privacy
✅ Credentials stored locally with encryption  
✅ No access to user data or credentials  
✅ Transparent about third-party AI usage  
✅ User responsible for AI provider compliance

---

## 📧 Email Addresses

Make sure to set up these email addresses before launching:
- **support@lucedata.com** - General support
- **beta@lucedata.com** - Beta feedback
- **privacy@lucedata.com** - Privacy inquiries
- **legal@lucedata.com** - Legal inquiries

---

## 🎨 Design Recommendations

### Color Scheme
- Dark theme (primary): Professional, dev-tool aesthetic
- Light theme (optional): Clean, accessible alternative
- Accent colors: Blues/purples (trust, technology)

### Typography
- Headers: Bold, modern sans-serif (e.g., Inter, Roboto)
- Body: Readable sans-serif (e.g., System UI, Segoe UI)
- Code: Monospace (e.g., Fira Code, JetBrains Mono)

### Visual Elements
- Screenshots of the app in action
- Icons for features (🗄️ databases, 🤖 AI, 🔒 security)
- Subtle animations (hover effects, transitions)
- Code blocks with syntax highlighting

---

## 📱 Website Pages

### Recommended Structure

1. **Home** (`/`)
   - Hero with beta registration
   - Feature highlights
   - Screenshots
   - CTA to register

2. **Features** (`/features`)
   - Detailed feature descriptions
   - Use cases
   - Comparison with alternatives

3. **Register/Download** (`/register`)
   - Beta registration form
   - Email confirmation flow

4. **Docs** (`/docs`)
   - Documentation portal
   - All guides and references

5. **Changelog** (`/changelog`)
   - Version history
   - Release notes

6. **Support** (`/support`)
   - FAQ
   - Contact form
   - Beta feedback

---

## ✅ Pre-Launch Checklist

### Content
- [x] Website prompt created
- [x] Privacy policy written
- [x] Terms of use written
- [x] All documentation written

### Technical Setup Needed
- [ ] Set up email addresses (support@, beta@, privacy@, legal@)
- [ ] Configure beta registration form
- [ ] Set up email automation for download links
- [ ] Host download files (DMG, MSI)
- [ ] Generate checksums for downloads
- [ ] Set up analytics (Google Analytics, Plausible, etc.)
- [ ] Configure domain and SSL
- [ ] Test registration flow end-to-end

### Marketing
- [ ] Prepare screenshots and demo videos
- [ ] Create social media accounts
- [ ] Prepare launch announcement
- [ ] Set up email newsletter
- [ ] Create GitHub repository (if making public)

---

## 🛠️ Development Notes

### For bolt.new
- Use `product-website-pack.txt` as the main prompt
- Specify Next.js + Tailwind CSS
- Request dark/light theme toggle
- Ask for responsive design
- Include SEO optimization

### For Vercel Deployment
```bash
# If building with Next.js
npm install
npm run build
vercel deploy
```

### Environment Variables Needed
```env
# Email service (e.g., SendGrid, Mailgun)
EMAIL_API_KEY=your_api_key

# Database for registrations (e.g., Supabase, MongoDB)
DATABASE_URL=your_database_url

# Analytics (optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

---

## 📚 Additional Resources

### Tools & Services You May Need
- **Email Service**: SendGrid, Mailgun, AWS SES
- **Form Backend**: Formspree, Basin, custom API
- **Database**: Supabase, MongoDB Atlas, PostgreSQL
- **Hosting**: Vercel, Netlify, AWS Amplify
- **CDN**: Cloudflare, AWS CloudFront
- **Analytics**: Plausible, Google Analytics, Fathom

---

## 🤝 Support

Questions about the content or website build?
- **Email**: support@lucedata.com
- **Beta Feedback**: beta@lucedata.com

---

## 📝 License

© 2025 LuceData. All rights reserved.

---

**Ready to build?** Start with `product-website-pack.txt` and bolt.new! 🚀
