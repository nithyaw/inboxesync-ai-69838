# Onebox – Real-Time AI Email Aggregator

## Project Info

**Live URL**: https://onebox-ai.netlify.app/  
**Assignment**: ReachInbox Backend Engineering – Feature-Rich Onebox for Emails

Onebox is an AI-powered email management platform that allows users to connect multiple IMAP email accounts, view emails in real-time, search efficiently, categorize using AI, and get suggested replies for outreach. It also supports Slack and webhook integrations for automation.

---

## How to Run the Project Locally

**Requirements:** Node.js (v18+) and npm, Docker & Docker Compose  

Steps to run locally using VS Code or any IDE:

```bash
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to project directory
cd reachinbox-onebox

# Step 3: Install dependencies
npm install

# Step 4: Create a .env file in the project root with the following variables
# (Replace with your actual credentials and keys)
PORT=4000
IMAP1_USER=your_email1@example.com
IMAP1_PASS=app_password1
IMAP2_USER=your_email2@example.com
IMAP2_PASS=app_password2
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_SECURE=true
ELASTIC_URL=http://localhost:9200
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook
WEBHOOK_SITE_URL=https://webhook.site/your_url
OPENAI_KEY=sk-xxxx           # optional for AI features
GEMINI_API_KEY=xxxx           # optional for AI features



# Step 5: Start Docker services for Elasticsearch & Qdrant
docker-compose up -d

# Step 6: Start backend server
npx ts-node src/server.ts

# Step 7: (Optional) Start frontend development server if included
npm run dev
