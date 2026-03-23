# Calculator-Led Website and App Design Brief

## 1. Objective

Build the website and app around the same design language used in the current calculator experience so the product feels:

- financially trustworthy
- modern and premium without looking like a generic fintech template
- educational, not just transactional
- high-conversion for borrowers who need clarity on loans, refinancing, eligibility, prepayment, and loan comparisons

The calculators already establish the strongest direction. Future website pages and app screens should inherit that direction instead of inventing a new one.

This document defines the design system, UX principles, interaction patterns, content tone, implementation rules, and delivery expectations an agent should follow.

## 2. Core Design Intent

The product should feel like:

- a sharp financial advisory tool
- a guided decision assistant
- data-rich but easy to understand
- polished enough for a serious borrower

It should not feel like:

- a bank legacy portal
- a flashy crypto dashboard
- a startup landing page with shallow visuals
- a cluttered insurance comparison site

The current calculators succeed because they combine:

- strong hierarchy
- soft premium colors
- rounded surfaces
- generous whitespace
- clear card segmentation
- educational copy next to hard numbers
- charts that prove the point visually

That exact philosophy should extend to the full website and app.

## 3. Product Positioning Through Design

The design must communicate these product values:

1. Clarity before persuasion.
2. Numbers must feel understandable, not intimidating.
3. Every screen should help the user make a better borrowing decision.
4. Complex financial decisions should be broken into obvious chunks.
5. Visual styling should reinforce trust, not hype.

## 4. Reference Style From Existing Calculators

The current calculator UI establishes the baseline. Preserve these traits:

- light canvas background
- dark blue as the primary trust color
- teal/cyan accents for positive actions and insights
- subtle red or amber only for warnings, loss, or expensive choices
- large rounded containers, typically `rounded-2xl` to `rounded-3xl`
- white cards with soft borders and restrained shadows
- bold headlines with strong numeric emphasis
- clear separation between input panels, result panels, and educational sections
- interactive charts placed in clean cards rather than noisy dashboards
- sticky or persistent top-level navigation where useful

## 5. Visual Design System

### 5.1 Color Strategy

Base palette direction:

- Primary Trust: deep blue
- Secondary Depth: darker navy-blue
- Positive Accent: teal/cyan
- Success: green
- Warning: amber
- Danger/Overpayment: rose/red
- Background: warm off-white or very light neutral
- Surface: white
- Border: soft slate/blue-gray

Suggested semantic usage:

- `Primary`: headings, active tabs, hero surfaces, key actions
- `Accent`: highlights, savings, progress, insight indicators
- `Success`: favorable comparisons, recommended paths
- `Danger`: expensive loan choices, hidden costs, risk alerts
- `Neutral`: body text, secondary surfaces, dividers

Do not overuse bright saturated colors. Color should guide understanding, not compete for attention.

### 5.2 Typography

The current experience relies on clear, modern, readable typography with strong numeric emphasis.

Typography rules:

- headlines: bold, compact, high-contrast
- section titles: medium to bold
- body: readable, quiet, spacious
- labels: small uppercase tracking for structured finance fields
- numbers: large, bold, and visually dominant

Use typography to separate:

- explanation
- inputs
- results
- warnings
- educational insights

Numbers should always be easier to scan than surrounding copy.

### 5.3 Shape Language

Use:

- rounded corners generously
- soft shadows
- low-noise gradients
- subtle rings/borders
- padded sections with breathing room

Avoid:

- sharp enterprise tables everywhere
- hard black separators
- tiny cramped input fields
- overly flat layouts without card structure

### 5.4 Motion

Motion should be purposeful and restrained.

Use motion for:

- section reveal on scroll
- chart reveal
- card entrance
- state toggles
- expanding tables or schedules

Avoid:

- decorative bouncing
- excessive hover transforms
- gimmicky loading sequences

Motion should make the experience feel responsive and refined, not playful.

## 6. UX Principles

### 6.1 Educational UX

Each tool or page should answer:

- what is this
- what should I enter
- what does the result mean
- what action should I consider next

Do not stop at raw numbers. Every calculation page should include:

- a result summary
- a plain-language interpretation
- a recommendation or warning when relevant
- a visual breakdown where useful

### 6.2 Progressive Disclosure

Do not show everything at once if it increases cognitive load.

Preferred approach:

- show essential inputs first
- present the headline result immediately
- reveal deeper detail after the main answer
- use expandable schedules, charts, and educational notes beneath primary conclusions

### 6.3 Comparison-First Thinking

Loan decisions are comparative by nature. The interface should frequently compare:

- current vs improved scenario
- expensive vs optimal option
- flat vs reducing
- lower EMI vs shorter tenure
- user input vs bank rule

Comparison should be visible in:

- card pairs
- highlight callouts
- chart splits
- summary verdict boxes

### 6.4 Trust Through Transparency

Wherever calculations are presented, the UI should make the logic feel transparent.

That means:

- formula-backed results
- supporting explanation
- amortization visibility
- clear assumptions
- exact money difference in comparisons

Avoid black-box presentation.

## 7. Information Architecture For Website

The website should be structured around calculator-led discovery and education.

Recommended top-level sections:

1. Home
2. Calculators
3. Loan Guides
4. Compare Options
5. Eligibility / Planning
6. About / Trust
7. Contact or Lead Capture

### 7.1 Home Page

Purpose:

- immediately establish trust
- explain the product simply
- drive users into the right calculator or workflow

Recommended home structure:

1. Hero section
2. Trust/value proposition strip
3. Primary calculator entry cards
4. “Why this matters” comparison section
5. Educational highlights
6. Testimonials or proof
7. CTA footer

Hero content should include:

- one strong promise
- one supporting line
- one primary CTA
- one secondary CTA
- optional visual snapshot of calculator outputs or chart cards

### 7.2 Calculators Hub

This page should feel like the product’s command center.

Each calculator card should include:

- name
- problem it solves
- one-line explanation
- visual tag for category
- CTA to open calculator

Categories may include:

- refinance/rate reduction
- loan eligibility
- prepayment
- flat vs reducing
- future EMI planning
- tenure optimization

### 7.3 Educational Pages

These pages should inherit calculator styling, not become generic blog pages.

Use:

- explanatory sections with supporting visuals
- inline stat cards
- comparison blocks
- FAQ accordions
- calculator CTA blocks embedded within content

## 8. Information Architecture For App

The app should feel like the website condensed into guided, high-frequency actions.

Recommended app navigation:

1. Dashboard
2. Calculators
3. Compare
4. Learn
5. Profile / Saved Scenarios

### 8.1 Dashboard

Should prioritize:

- resume recent calculations
- saved scenarios
- quick actions
- educational prompts tied to user context

### 8.2 Calculator Screen Pattern

Every calculator in the app should follow a consistent structure:

1. Header with clear title and short explanation
2. Input section
3. Primary results
4. Verdict or recommendation
5. Charts
6. Expanded table or detailed breakdown
7. Save/share/next-step actions

### 8.3 Saved State

The app should allow:

- save scenario
- compare against previous scenario
- reopen last calculation
- export/share summary

This is useful for users discussing loans with family or advisors.

## 9. Component Strategy

Agents implementing the website/app should reuse a common component library based on the calculator patterns.

Core components:

- page shell
- section header
- stat card
- comparison card
- input field
- currency input
- segmented tab switcher
- verdict alert
- chart card
- expandable detail panel
- info callout
- CTA block
- sticky summary bar
- comparison table

### 9.1 Inputs

Inputs should:

- be large and easy to scan
- include suffix or prefix units
- support formatted values
- validate in real time
- avoid visual clutter

### 9.2 Cards

Cards should be the primary layout unit.

Card patterns:

- white background
- soft border
- subtle shadow
- large radius
- 20 to 32px internal padding depending on screen size

### 9.3 Alerts and Verdict Boxes

Verdict boxes are important because they convert calculation into user understanding.

Each verdict box should:

- summarize the outcome
- state the exact difference when relevant
- use semantic color
- include a next-step implication

### 9.4 Charts

Charts should not exist for decoration. Each one must answer a specific user question.

Use charts for:

- total cost breakdown
- cumulative savings
- rate scenario comparisons
- interest vs principal balance over time

Avoid dense multi-series charts unless the insight is genuinely clear.

## 10. Content and Microcopy Rules

Tone should be:

- direct
- trustworthy
- calm
- educational
- not salesy

Use plain finance language. When technical terms appear, explain them immediately or nearby.

Good copy patterns:

- “This option costs you more overall.”
- “Your interest burden falls faster here.”
- “This is the amount charged purely as interest.”
- “This method keeps charging interest on the original principal.”

Avoid:

- hype
- aggressive conversion copy
- jargon without explanation
- vague claims like “best plan” without evidence

## 11. Responsiveness Requirements

The same design language must translate cleanly across desktop and mobile.

### Desktop

Prioritize:

- side-by-side comparisons
- wider chart cards
- richer explanatory layout

### Mobile

Prioritize:

- vertical stacking
- sticky CTA or summary where useful
- simplified tables with horizontal scroll
- strong spacing between sections
- very readable numbers

Non-negotiables:

- no cramped comparison cards
- no tiny chart labels
- no hidden critical insights below unreadable tables

## 12. Accessibility Requirements

The visual system must remain accessible.

Requirements:

- sufficient contrast for text and key metrics
- visible focus states
- semantic headings
- labeled inputs
- charts with textual backup values
- alerts not communicated by color alone

For financial software, accessibility is not optional. Important numbers must remain readable and understandable for all users.

## 13. Data Presentation Rules

All monetary values should:

- use Indian numbering when the product is India-focused
- be consistently formatted
- use decimals only when useful
- never mix styles on the same screen

For example:

- results: `₹1,25,000.00`
- compact summaries: `₹1.25L` only where appropriate

The agent should define where full currency and compact currency are each appropriate, then apply consistently.

## 14. Design Tokens To Formalize

The implementation team should formalize tokens for:

- colors
- typography scale
- spacing scale
- radii
- shadows
- borders
- motion durations
- z-index layers

Suggested token groups:

- `color.bg`
- `color.surface`
- `color.primary`
- `color.accent`
- `color.success`
- `color.warning`
- `color.danger`
- `color.text.primary`
- `color.text.secondary`
- `radius.card`
- `shadow.card`
- `space.section`
- `space.card`

This is essential so the website and app stay aligned.

## 15. UX Patterns To Reuse Everywhere

The calculators reveal several patterns worth standardizing:

1. Sticky top-level navigation for mode switching.
2. Prominent hero summary before deep detail.
3. Inputs on one side and outcome context on the other.
4. Comparison cards with clear winner/loser signaling.
5. Supporting charts below headline results.
6. Progressive deep-dive tables beneath visual summaries.
7. Educational callouts mixed into the calculation flow.

These should become reusable patterns across product surfaces.

## 16. Website Feature Recommendations

To reflect the calculator experience in the broader website, add:

- a calculator snapshot section on the homepage
- smart entry points based on user intent
- comparison-based landing pages
- educational sections that visually mirror tool result cards
- embedded charts or static visual equivalents
- “Try this calculator” CTAs inside content blocks

Recommended high-value pages:

- Flat vs Reducing Balance explainer
- How much loan can I get
- When refinancing saves money
- EMI vs tenure decision guide
- Prepayment timing guide

## 17. App Feature Recommendations

To reflect the same design system in the app, include:

- scenario bookmarking
- compare saved scenarios
- calculators as modular flows
- result summaries optimized for quick return visits
- chart cards that remain legible on smaller screens
- educational nudges after result generation

## 18. Engineering Guidance For Implementing The Design

Agents building the website/app should:

- preserve the current calculator palette and component feel
- extract reusable primitives from the calculator code
- avoid creating a second competing visual system
- use Tailwind utility patterns consistently
- keep cards, spacing, and typography visually aligned across web and app

Recommended implementation approach:

1. audit current calculator UI patterns
2. define shared tokens
3. extract reusable components
4. build page templates
5. apply templates to website sections
6. adapt patterns for mobile app screens

## 19. Deliverables Expected From A Design/Implementation Agent

If another agent is asked to execute this vision, it should deliver:

1. Design system definition
2. Component inventory
3. Website sitemap
4. App navigation map
5. High-fidelity layout direction for major screens
6. Responsive rules
7. Tailwind token/theme proposal
8. Reusable components or screen templates
9. Copy tone guidelines
10. Phased rollout plan

## 20. Screen-Level Requirements

The following screens should be designed first because they define the rest of the system:

1. Home page
2. Calculators hub
3. Single calculator page template
4. Educational article page template
5. App dashboard
6. App calculator result screen
7. Saved comparison screen

## 21. Quality Bar

The final experience should meet this bar:

- looks coherent across website and app
- feels like one product family
- makes financial decisions easier to understand
- keeps the clarity and polish of the current calculators
- avoids generic fintech design patterns
- translates numbers into action and confidence

## 22. Explicit Instruction For Any Agent Using This Brief

Do not redesign from scratch.

Start from the existing calculator language and expand it into a full product system.

Preserve:

- the blue-teal trust palette
- rounded card-heavy layout
- strong numeric emphasis
- educational comparison style
- clear result storytelling

When in doubt, choose the direction that makes the product feel more trustworthy, more explanatory, and more consistent with the current calculators.
