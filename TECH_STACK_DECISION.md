# bonza Travel App - Tech Stack & API Plan

## TECH STACK

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management (simpler than Redux)
- **React Router** for navigation
- **Axios** for API calls

Why React?
✅ Largest community
✅ Best documentation
✅ Most job opportunities
✅ Easy to learn
✅ Perfect for real-time updates

### Backend
- **Node.js** (JavaScript runtime)
- **Express.js** (web framework)
- **PostgreSQL** (database)
- **Prisma** (database toolkit, easier than raw SQL)
- **JWT** (authentication)
- **Stripe** (payment processing)

Why Node.js?
✅ Same language front-to-back (less mental switching)
✅ Fast and scalable
✅ Great for real-time features
✅ Perfect for API-heavy apps

### Database
- **PostgreSQL** (production database)
- **Prisma ORM** (write queries in JavaScript, not SQL)
- **Redis** (caching, optional Phase 2)

Why PostgreSQL?
✅ Production-grade
✅ ACID compliance (data safety)
✅ Powerful queries
✅ Industry standard

### Authentication
- **JWT tokens** (stateless authentication)
- **bcrypt** (password hashing)
- **Plaid SDK** (loyalty point retrieval)

### Deployment & Infrastructure
- **Local development** first (weeks 1-3)
- **AWS** (weeks 4+, optional)
  - EC2 for backend
  - RDS for PostgreSQL
  - S3 for static files
  - CloudFront for CDN

---

## API INTEGRATION PLAN

### Phase 1: Mock APIs (Development MVP)

During building (weeks 1-3):
- **Claude API**: Real (you need this for optimization)
- **Plaid API**: Mock (returns fake data)
- **Amadeus API**: Mock (returns fake flight data)
- **Booking.com API**: Mock (returns fake hotel data)
- **Hertz API**: Mock (returns fake car rental data)

Cost: ~$20-50 (only Claude API charges)

### Phase 2: Real APIs (After MVP Launch)

Once you have users:
- **Claude API**: Keep as-is
- **Plaid API**: Real integration (connects to user's credit cards)
- **Amadeus API**: Real (charges per search, ~$0.50-2 per call)
- **Booking.com**: Real affiliate (free, you get commission)
- **Hertz**: Real affiliate (free, you get commission)

Cost: TBD based on usage

### Why This Approach?

```
Building with mock APIs:
✅ Fast (no API calls, instant responses)
✅ Free (except Claude API)
✅ Perfect for testing
✅ No need for API keys yet
✅ Can test edge cases easily

Once you launch:
✅ Switch to real APIs
✅ Add real data
✅ Get real affiliate revenue
```

---

## TOKEN COST BREAKDOWN

### Claude Code Build (Using Claude Sonnet 4.6)

```
PHASE 1: Architecture & Setup (Week 1)
- System design document
- Database schema design
- Project structure
Estimated tokens: 25,000 input + 10,000 output = 35,000
Cost: (25,000 × $0.000003) + (10,000 × $0.000015) = $0.225

PHASE 2: Backend Development (Week 1-2)
- Express server setup
- Plaid integration (mock)
- Database models with Prisma
- API endpoints (trips, optimize, scenarios, booking)
- Error handling & validation
Estimated tokens: 80,000 input + 60,000 output = 140,000
Cost: (80,000 × $0.000003) + (60,000 × $0.000015) = $1.14

PHASE 3: Frontend Development (Week 2-3)
- React components (input, optimization, booking)
- Chat interface for Claude advisor
- State management with Zustand
- API integration
- Styling with Tailwind
Estimated tokens: 70,000 input + 80,000 output = 150,000
Cost: (70,000 × $0.000003) + (80,000 × $0.000015) = $1.41

PHASE 4: Integration & Testing (Week 3)
- Connect frontend to backend
- Test all flows
- Edge case handling
- Error scenarios
Estimated tokens: 40,000 input + 50,000 output = 90,000
Cost: (40,000 × $0.000003) + (50,000 × $0.000015) = $0.87

PHASE 5: Deployment & DevOps (Week 3-4)
- Docker containerization
- AWS setup (optional)
- CI/CD pipeline
- Monitoring setup
Estimated tokens: 30,000 input + 20,000 output = 50,000
Cost: (30,000 × $0.000003) + (20,000 × $0.000015) = $0.39

PHASE 6: Refinements & Bug Fixes (Week 4)
- Final optimizations
- UI/UX polish
- Performance improvements
Estimated tokens: 35,000 input + 25,000 output = 60,000
Cost: (35,000 × $0.000003) + (25,000 × $0.000015) = $0.48

────────────────────────────────────────────────
TOTAL CLAUDE CODE BUILD: ~525,000 tokens
TOTAL API COST: ~$4.54

REALISTIC ESTIMATE (with iterations): $20-50
```

### Runtime Costs (After Launch)

```
CLAUDE API (Per User Per Month)
- Average 1.5 optimization requests/month per user
- Average 2,000 tokens per optimization
- At 1,000 users: 3,000,000 tokens/month
- Cost: (1,800,000 × $0.000003) + (1,200,000 × $0.000015) = $24.60/month
- Per user: $0.025/month

As you scale:
- 5,000 users: $123/month
- 10,000 users: $246/month
- 50,000 users: $1,230/month

This is tiny compared to affiliate revenue ($90,000+/month at scale)
```

---

## BUILDING STRATEGY

### Timeline

```
MONDAY: Setup & Phase 1
- 2 hours: Install Claude Code, get API key
- 4 hours: Run Phase 1 prompt (architecture)
- Review output

TUESDAY-WEDNESDAY: Phase 2 (Backend)
- 16 hours: Run Phase 2 prompt (build backend)
- 4 hours: Review and test
- Run Phase 2B if needed (fixes)

THURSDAY-FRIDAY: Phase 3 (Frontend)
- 16 hours: Run Phase 3 prompt (build frontend)
- 4 hours: Review and test
- Run Phase 3B if needed (fixes)

WEEK 2:
- Phase 4: Integration (8 hours)
- Phase 5: Deployment (6 hours)
- Phase 6: Polish (6 hours)

TOTAL EFFORT: ~75 hours over 2 weeks
TOTAL COST: ~$20-50
```

### Success Metrics

By the end of Week 2, you should have:
✅ Working backend API (5 endpoints)
✅ React frontend with chat interface
✅ PostgreSQL database with mock data
✅ Authentication system
✅ Trip optimization working (with Claude API)
✅ Booking link generation
✅ Affiliate tracking setup
✅ Deployed locally (ready to test)

---

## HOW TO START

### Step 1: API Account Setup (30 minutes, Monday morning)

```bash
1. Go to https://console.anthropic.com
2. Click "Sign Up"
3. Create account with email
4. Add payment method (credit card)
5. Go to "API Keys"
6. Click "Create Key"
7. Copy the key (keep it secret!)
```

### Step 2: Install Claude Code (15 minutes)

```bash
# Open Terminal (Mac) or Command Prompt (Windows)

# Install Node.js first (if you don't have it)
# Go to nodejs.org, download, install

# Then run:
npm install -g @anthropic-ai/claude-code

# Set your API key:
export ANTHROPIC_API_KEY="your-key-from-step-1"

# On Windows use:
set ANTHROPIC_API_KEY=your-key-from-step-1

# Test it works:
claude-code --version
```

### Step 3: Create Your Project Folder (5 minutes)

```bash
# Create folder
mkdir bonza-travel-app
cd bonza-travel-app

# Initialize Git (optional but recommended)
git init

# Initialize Node.js project
npm init -y
```

### Step 4: Start Claude Code (1 minute)

```bash
# In your project folder:
claude-code

# You should see:
# Claude Code> What would you like me to build?
```

### Step 5: Paste Phase 1 Prompt (See next file)

---

## WHAT YOU'LL SEE

When you run Claude Code with the prompt:

```
Claude Code> [reading your prompt...]
Claude Code> Creating project structure...
Claude Code> 
✓ Created: src/
✓ Created: src/backend/
✓ Created: src/frontend/
✓ Created: src/backend/server.js
✓ Created: src/backend/db/schema.prisma
✓ Created: src/frontend/App.jsx
✓ Created: docker-compose.yml
✓ Created: package.json
✓ Created: .gitignore
✓ Created: README.md

Claude Code> Backend structure created. Building database schema...
Claude Code> Done!

Claude Code> Current project cost: $0.32 (475,000 tokens used)
Claude Code> What's next?
```

---

## TOKEN COST TRACKING

### How to See Your Costs

Claude Code shows you costs automatically:

```
After each step:
Claude Code> Current project cost: $0.45

At any time, type:
/cost

And it shows:
Total tokens used: 235,000
Input tokens: 140,000 ($0.42)
Output tokens: 95,000 ($1.43)
Total cost so far: $1.85
```

### Budget Limit

To avoid surprises:

```bash
# In your console, set a budget:
export ANTHROPIC_BUDGET_LIMIT=50

# Now if you hit $50 in tokens, Claude Code stops
# (prevents accidental huge bills)
```

---

## DECISION LOG

> The sections above are the original Week-1 plan and are kept for history. Some of it has
> since changed in practice (frontend is **JSX, not TypeScript**; auth is **Clerk**, not
> JWT/bcrypt). `CLAUDE.md` is the authoritative current spec. This log records notable
> architecture decisions made after that plan.

### 2026-07-28 — Infrastructure lives in the monorepo, not a separate repo

**Decision:** Keep the AWS CDK infrastructure as an isolated package at `infra/` **inside this
repo**, rather than splitting it into a standalone infrastructure repository.

**Rationale:**
- The infra already depends directly on app code. The jobs Lambda builds its image from the
  repo root (`DockerImageCode.fromImageAsset("../", { file: "Dockerfile.jobs" })`), and the
  API/frontend Dockerfiles are the deploy artifacts the stack references. Splitting would turn
  these into cross-repo ECR-publish/consume plumbing we don't need yet.
- The infra provisions around contracts defined in app code — `.env.example` / the `has*` env
  gates map to Secrets Manager keys, the Prisma schema maps to RDS. Keeping them together means
  an app+infra change (e.g. "add Sentry DSN + provision the secret + wire the Lambda env") is a
  single atomic, reviewable, revertible commit instead of two ordered PRs across repos.
- Team size is one — the separate-repo benefits (infra-team access boundary, independent release
  cadence, shared infra modules across products) all assume org boundaries that don't exist here.

**`infra/` is still a self-contained npm package** (own `aws-cdk-lib`/`constructs` deps, own
`tsconfig`, `cdk synth -c env=<name>`). That "isolated package, same repo" middle ground is the
target state. Optional future polish: root `package.json` workspaces to unify install/CI.

**Revisit if any of these become true:** a dedicated platform/SRE team should own infra without
app write access · multiple products share the same infra modules · infra release cadence must
be fully decoupled (e.g. compliance-gated deploys) · the CDK app grows to many stacks across
many accounts. None apply today.

---