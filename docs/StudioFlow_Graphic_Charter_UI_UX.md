# StudioFlow --- Graphic Charter & Web UI/UX Concept

**Project:** StudioFlow\
**Tagline:** AI-Powered Operating System for Photography Studios\
**Application type:** Responsive web application built with Next.js\
**Visual direction:** Modern SaaS + Professional Photography + AI

------------------------------------------------------------------------

## 1. Brand Identity

### Brand concept

StudioFlow is a centralized web platform for photography studios. Its
visual identity should communicate creativity, precision,
professionalism, and intelligent automation.

-   **Studio** represents photography, creative work, and professional
    studio operations.
-   **Flow** represents a smooth, connected workflow from photo upload
    to final delivery.
-   **AI** represents intelligent assistance across photo management,
    editing, resource planning, and project tracking.

### Brand personality

-   Modern and professional
-   Creative but not visually cluttered
-   Trustworthy and organized
-   Intelligent and helpful
-   Photography-focused

### Tagline

**AI-Powered Operating System for Photography Studios**

------------------------------------------------------------------------

## 2. Application Logo

### Logo concept

The proposed logo combines a camera-aperture or shutter symbol with the
wordmark **StudioFlow**.

-   The aperture symbol represents photography and image capture.
-   The connected geometric blades suggest a continuous workflow.
-   The blue gradient or blue accent represents technology and
    intelligence.
-   The wordmark uses a clean, bold sans-serif typeface.

### Logo variations

1.  **Primary logo:** Blue aperture icon + StudioFlow wordmark on a
    light background.
2.  **Dark-background logo:** White wordmark with a blue icon/accent.
3.  **Light-background logo:** Dark wordmark with a blue icon/accent.
4.  **Icon-only version:** Aperture symbol for the favicon, app icon,
    and compact sidebar branding.

### Logo usage rules

-   Keep clear space around the logo.
-   Do not stretch, rotate, or distort the symbol.
-   Use the icon-only version when space is limited.
-   Maintain strong contrast between the logo and its background.
-   Avoid placing the logo over visually busy photographs without a
    suitable overlay.

------------------------------------------------------------------------

## 3. Typography

### Primary font

**Plus Jakarta Sans**

A modern sans-serif font suitable for a polished SaaS dashboard. It
supports clear headings, readable interface text, and a contemporary
product identity.

### Alternatives

-   **Inter** --- highly readable and suitable for dense data
    interfaces.
-   **Geist** --- clean and modern for a Next.js-oriented product
    interface.

Choose one primary font for the product and use it consistently.

### Typographic hierarchy

  -----------------------------------------------------------------------
  UI Element              Recommended Style       Usage
  ----------------------- ----------------------- -----------------------
  Page title              28--32 px, Bold         Main heading of each
                                                  page

  Section title           20--24 px, SemiBold     Major content sections

  Card title              16--18 px, SemiBold     Dashboard and module
                                                  cards

  Body text               14--16 px, Regular      Descriptions and main
                                                  content

  Supporting text         12--13 px, Regular      Metadata, timestamps,
                                                  helper text

  Button label            14 px, Medium/SemiBold  Actions and navigation
  -----------------------------------------------------------------------

Use consistent line heights and avoid using too many font weights on the
same screen.

------------------------------------------------------------------------

## 4. Color Palette

The palette combines dark charcoal and slate surfaces with a vivid blue
primary accent. Purple is reserved for AI-related elements.

  -----------------------------------------------------------------------
  Color Name              Hex Code                Purpose
  ----------------------- ----------------------- -----------------------
  Charcoal                `#0B0F14`               Main dark background,
                                                  dark navigation

  Slate                   `#1F2937`               Dark surfaces,
                                                  sidebars, secondary
                                                  panels

  Gray                    `#6B7280`               Secondary text,
                                                  borders, muted labels

  Light Gray              `#E5E7EB`               Dividers, disabled
                                                  surfaces, subtle
                                                  backgrounds

  White                   `#FFFFFF`               Main light surfaces and
                                                  cards

  Primary Blue            `#3B82F6`               Primary actions, active
                                                  navigation, links

  Success Green           `#10B981`               Completed states and
                                                  successful actions

  Warning Amber           `#F59E0B`               Warnings and items
                                                  needing attention

  Error Red               `#EF4444`               Errors, destructive
                                                  actions, failed states

  AI Purple               `#8B5CF6`               AI badges,
                                                  recommendations,
                                                  AI-specific panels
  -----------------------------------------------------------------------

### Color usage rules

-   Use **Primary Blue** for the main call to action and active
    navigation.
-   Use **AI Purple** only for AI features, suggestions, and
    processing-related elements.
-   Use green, amber, and red consistently for status feedback.
-   Keep body text high-contrast and readable.
-   Do not use every accent color at once; preserve a calm interface.

------------------------------------------------------------------------

## 5. Iconography

Use a consistent line-icon family such as **Lucide**.

### Recommended icon concepts

-   Dashboard: layout grid
-   Photo library: images or image
-   Albums: folder
-   AI features: sparkles
-   Client gallery: gallery horizontal or images
-   Employees: users
-   Projects: briefcase or folder
-   Tasks: check-square
-   Calendar: calendar-days
-   Files: file-text
-   Search: search
-   Settings: settings
-   Notifications: bell
-   Upload: cloud-upload
-   Editing: sliders-horizontal
-   Security: shield-check

### Icon rules

-   Use consistent stroke weight and sizing.
-   Prefer simple line icons over decorative illustrations.
-   Pair unfamiliar icons with labels.
-   Use blue for active navigation and purple for AI-specific actions.
-   Do not rely on color alone to communicate status.

------------------------------------------------------------------------

## 6. UI Components

### Buttons

-   **Primary:** Blue background with white text.
-   **Secondary:** White or transparent background with a subtle border.
-   **Ghost:** Minimal styling for secondary actions and toolbar
    controls.
-   **Destructive:** Red styling for deletion or irreversible actions.

Buttons should have clear labels, visible hover/focus states, and
disabled states.

### Form controls

Use consistent styling for: - Text inputs - Search fields - Select
menus - Date pickers - Checkboxes and radio buttons - File-upload
zones - Filter controls

Inputs should have labels, helpful validation messages, and clear error
states.

### Cards and panels

Use cards to group: - Dashboard statistics - Recent projects - AI
recommendations - Photo details - Processing jobs - Upcoming tasks

Use subtle borders, restrained shadows, and consistent corner radii.

### Tables and lists

Tables should support clear column labels, readable row spacing, status
badges, and useful sorting or filtering where needed. On narrow screens,
use responsive layouts or horizontal scrolling rather than squeezing
content.

### Feedback elements

-   Success alert
-   Warning alert
-   Error alert
-   Informational message
-   Loading spinner or skeleton
-   Upload progress
-   AI processing progress
-   Empty state with a clear next action
-   Confirmation dialog for destructive actions

------------------------------------------------------------------------

## 7. Photography and AI Visual Language

### Photography-focused interface

Photography is the core of StudioFlow, so image previews should be
prominent.

-   Use consistent thumbnail ratios within a gallery.
-   Keep photo grids spacious and easy to scan.
-   Support hover actions without obscuring the image.
-   Make selected photos visually distinct.
-   Provide a larger preview when a photo is opened.
-   Use a before/after comparison for editing features.
-   Use dark surfaces selectively where they help images stand out.

### AI visual language

AI should be recognizable but not overwhelming.

-   Use a small **AI Powered** or **AI Suggestion** label.
-   Use purple accents for AI recommendations and AI-specific panels.
-   Show progress during analysis or processing.
-   Explain recommendations briefly when possible.
-   Display confidence or relevance indicators only when the system can
    provide meaningful values.
-   Let users review AI-generated results before applying important
    changes.

------------------------------------------------------------------------

## 8. Layout and Spacing

### Main application layout

The recommended desktop layout contains:

1.  **Sidebar:** Primary navigation for Dashboard, Photos, Galleries,
    Projects, Team, and Settings.
2.  **Top bar:** Current page context, search, notifications, and user
    profile.
3.  **Main content:** Page title, primary actions, filters, and the
    page's main content.
4.  **Optional detail panel:** Contextual information for a selected
    photo, project, or processing job.

### Spacing principles

-   Use a consistent spacing scale.
-   Group related information visually.
-   Leave enough whitespace around major sections.
-   Keep page titles and primary actions easy to find.
-   Avoid unnecessary borders and decorative elements.
-   Maintain consistent alignment across all modules.

------------------------------------------------------------------------

## 9. Responsive Design

StudioFlow is a **web application**, not a mobile-only application. The
interface should adapt to different viewport sizes.

### Desktop

-   Persistent sidebar
-   Multi-column dashboards
-   Dense photo grids
-   Full project tables and detail panels

### Tablet

-   Collapsible sidebar
-   Fewer columns in photo grids
-   Simplified tables
-   Larger touch targets

### Mobile browser

-   Collapsed navigation or menu drawer
-   Single-column content where appropriate
-   Compact project cards
-   Touch-friendly gallery selection
-   Essential actions prioritized over secondary controls

The core workflows should remain usable at all supported sizes.

------------------------------------------------------------------------

## 10. UI/UX Conception --- Four Key Web Screens

These screens define the initial visual direction. They are conceptual
designs and can be implemented as Next.js pages.

### Screen 1 --- Dashboard

**Purpose:** Give the studio owner a quick overview of studio activity.

**Main elements** - Sidebar navigation - Welcome message and current
studio context - Statistics cards: active projects, pending tasks, new
photos, clients - Recent projects with status and deadlines - Upcoming
tasks - Quick actions such as "New Project" and "Upload Photos" -
Optional AI insights panel

**UX principles** - Show the most important information first. - Make
common actions accessible in one click. - Use status badges
consistently. - Avoid overwhelming the dashboard with too many metrics.

**Suggested route:** `/dashboard`

### Screen 2 --- AI Photo Library

**Purpose:** Help users upload, browse, filter, and organize large photo
collections.

**Main elements** - Page title and prominent upload button - Search
field for photo names, tags, or natural-language queries - Filters for
album, date, tags, quality, and AI analysis status - Responsive photo
grid - Selection checkboxes and bulk actions - AI labels for blur
detection, duplicate/similar images, or generated tags - Optional
details panel for the selected photo

**UX principles** - Keep photos visually prominent. - Make bulk
selection easy. - Show AI analysis status and results clearly. - Provide
feedback during uploads and processing.

**Suggested route:** `/photos`

### Screen 3 --- Client Gallery

**Purpose:** Allow clients to review photos and communicate their
choices to the studio.

**Main elements** - Gallery title and event/client information - Tabs
for Gallery, Favorites, Selection, and Comments - Large photo preview
with thumbnail navigation - Favorite and selection controls - Comment or
feedback area - Share and download actions where permitted - AI
recommendation panel with a short explanation

**UX principles** - Make the gallery simple for non-technical clients. -
Distinguish favorites from final selections. - Make selection state
unmistakable. - Keep AI suggestions helpful and optional.

**Suggested route:** `/galleries/[galleryId]`

### Screen 4 --- Project Manager

**Purpose:** Track a photography project from preparation through final
delivery.

**Main elements** - Project name, client/event details, and current
status - Overview, Tasks, Files, Timeline, and AI Insights tabs - Task
list with owners, deadlines, and progress - Project documents and
uploaded briefs - Upcoming deadlines and risk indicators - AI assistant
panel for document summaries, task suggestions, or potential risks

**UX principles** - Make deadlines and next actions easy to identify. -
Keep project files and tasks connected to the project. - Explain
AI-generated task or risk suggestions. - Allow users to review
suggestions before applying them.

**Suggested route:** `/projects/[projectId]`

------------------------------------------------------------------------

## 11. Shared Navigation Structure

Recommended initial sidebar:

1.  Dashboard
2.  Photo Library
3.  Client Galleries
4.  Projects
5.  Team & Resources
6.  AI Editing Lab
7.  Clients
8.  Settings

Navigation items should be permission-aware. For example, clients should
only see their own shared galleries and permitted actions, while studio
employees should see features allowed by their roles.

------------------------------------------------------------------------

## 12. Design Principles

1.  **Clarity:** Every screen should have a clear purpose.
2.  **Consistency:** Reuse typography, spacing, colors, and components.
3.  **Visual focus:** Let photography remain the visual centerpiece.
4.  **Efficiency:** Make common actions easy to reach.
5.  **AI transparency:** Explain AI suggestions and show processing
    states.
6.  **User control:** Let users review AI results before consequential
    actions.
7.  **Accessibility:** Maintain contrast, keyboard focus, labels, and
    readable text.
8.  **Responsiveness:** Support desktop, tablet, and mobile browsers.
9.  **Scalability:** Build shared components that work across all five
    modules.

------------------------------------------------------------------------

## 13. Implementation Notes for Next.js

-   Use a shared application shell for the sidebar, top bar, and page
    content.
-   Keep reusable components in a shared UI directory.
-   Organize feature pages and logic by module.
-   Use typed interfaces for shared data and API contracts.
-   Include loading, empty, error, and success states from the
    beginning.
-   Use mock data to develop each screen independently before backend
    integration.
-   Keep authorization checks on the server for protected operations;
    hiding UI controls alone is not security.
-   Treat the visual concepts as a design system, not as a requirement
    to copy every screen pixel-for-pixel.

### Suggested initial routes

``` text
app/
├── dashboard/
│   └── page.tsx
├── photos/
│   └── page.tsx
├── galleries/
│   └── [galleryId]/
│       └── page.tsx
├── projects/
│   └── [projectId]/
│       └── page.tsx
└── settings/
    └── page.tsx
```

------------------------------------------------------------------------

## 14. Graphic Charter Summary

-   **Brand:** StudioFlow
-   **Tagline:** AI-Powered Operating System for Photography Studios
-   **Logo:** Geometric camera-aperture symbol + StudioFlow wordmark
-   **Primary font:** Plus Jakarta Sans
-   **Primary color:** Blue `#3B82F6`
-   **Base colors:** Charcoal `#0B0F14`, Slate `#1F2937`, Gray
    `#6B7280`, Light Gray `#E5E7EB`, White `#FFFFFF`
-   **Status colors:** Green `#10B981`, Amber `#F59E0B`, Red `#EF4444`
-   **AI accent:** Purple `#8B5CF6`
-   **Icon style:** Consistent line icons, such as Lucide
-   **UI direction:** Clean, modern, image-focused, responsive SaaS
-   **Key screens:** Dashboard, AI Photo Library, Client Gallery,
    Project Manager
