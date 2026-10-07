# BRU Fondue — UI / UX design specification

## Product and audience
Campus maintenance for Buriram Rajabhat University. Students and staff report issues; facilities administrators assign repairs; technicians update work; reporters evaluate completed repairs. Thai is the primary language.

## Information architecture and wireframe
1. Shared navigation: brand → home, overview, how it works, role-specific workspace → report CTA. Compact account menu retains demo role switching and mobile navigation.
2. Hero: two-column 6/6 composition. Left: purpose label, value proposition, supporting copy, report action and workflow anchor. Right: interactive sample repair ticket with three selectable progress stages. Sample data is explicitly labeled.
3. Institutional trust strip: university identity and three factual platform capabilities. No invented adoption or performance metrics.
4. Features: three equal cards for reporting, progress tracking, and feedback. Each has one icon, one headline, short supporting copy, and a quiet caption.
5. Workflow: report → assign and repair → review. Direct link into existing report form.
6. Closing invitation: concise message and report action.
7. Footer: identity, mission, ticket-history link, copyright.

Existing application routes remain available: /report, /my-tickets, /tickets/[id], /admin/tickets, /admin/dashboard, /admin/reports/pdf, /technician/jobs. This implementation redesigns the landing page and shared shell; internal workflow forms and tables retain their existing functionality and layouts.

## Layout and responsive system
- Main content: 1152px maximum, conceptual 12-column grid.
- Hero: 6/6; features and workflow: 4/4/4.
- Base spacing: 8px. Common intervals 8, 16, 24, 32, 48, 64, 96px; optical adjustments for compact preview.
- Desktop gutters: 40px; tablet 24px; mobile 20px.
- Major sections: roughly 80–100px vertical spacing; mobile 48–64px.
- At 800px hero and navigation simplify; feature cards stack below Tailwind md (768px); workflow stacks at 480px.
- Cards use 1px borders; shadows reserved for the product preview and account menu.

## Design tokens
| Token | Value | Purpose |
| --- | --- | --- |
| Background | #FAFAF8 | Warm, quiet canvas |
| Surface | #FFFFFF | Cards and panels |
| Text | #202322 | Main text |
| Muted | #727571 | Supporting text |
| Accent | #5351D8 | Primary action |
| Border | #E5E7E2 | Hairline separation |
| Sage surface | #EFF0EB | Preview stage |
| Radius | 8 / 12 / 16 / 22px | Buttons / cards / sections / preview |

Typography: Geist for Latin; preferred IBM Plex Sans Thai with Leelawadee UI and Tahoma fallbacks. The Thai font is not downloaded at build time; bundle a licensed font locally if identical Thai rendering across platforms is required.

| Level | Desktop size | Line height |
| --- | --- | --- |
| Display / hero H1 | 66px (responsive 49–66px) | 1.35 |
| Section H2 | 32px (27px mobile) | 1.55 |
| Card H3 | 17px | 1.6 |
| Body | 15–16px | 1.6; introductory Thai copy 1.95 |
| Supporting | 12–14px | 1.9 |
| Caption | 10–12px | 1.6 |

The miniature preview intentionally uses smaller type than the primary interface; it is a demonstration, not the working repair form.

## Components and interaction
- app/page.tsx: server-rendered hero, trust strip, Tailwind feature grid, workflow, closing action and footer.
- components/ProductPreview.tsx: small client component; real buttons select received, in-progress, or completed state, with aria-pressed and a polite live region.
- components/Navbar.tsx: server-loaded role-aware navigation, mobile account menu and existing account switcher.
- app/globals.css: reusable visual tokens, responsive layout, focus rings and reduced-motion support.
- app/layout.tsx: shared typeface, Thai document language, metadata and keyboard skip link.

No new endpoints or data mutations were introduced. Primary CTAs use the existing reporting flow. Status labels communicate meaning without relying only on color. No pricing section is needed for the free campus service.
