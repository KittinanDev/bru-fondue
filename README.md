This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Authentication (step 2)

- Schema includes separate AuthCredential, AuthSession and AuthLoginLimit tables; existing User and Ticket data is preserved.
- Local setup after installing dependencies: `npx prisma db push`, then `npx tsx scripts/setup-test-logins.ts` for the five existing seeded accounts. Never run the destructive seed against data you want to retain. Provisioning does not overwrite existing credentials.
- Test credentials live in `.local/test-accounts.md`, outside public assets and ignored by Git. They are for the local test installation only.
- To provision/reset an existing user's password, set `BRU_NEW_PASSWORD` in the current process environment, run `npx tsx scripts/set-password.ts email@example.test`, then remove that environment variable. The script requires 12–128 characters and revokes existing sessions; it never prints the password. Replace the example email with the existing account email.
- Public deployments require HTTPS and `APP_ORIGIN` set to the exact public origin (no trailing slash), especially behind a reverse proxy. Cookies use Secure on non-loopback hosts. Local HTTP is supported at localhost/127.0.0.1 only.
- Sessions expire after 8 hours and are stored hashed. Account disabling through `AuthCredential.disabledAt` rejects existing sessions as well as new logins.
- Login attempts are limited per normalized email to 5 per 15-minute window and stored in the database; deploy-level global/IP request limits remain a separate operations concern.
- Local integration tests: start the workspace production server on port 3107, then run `node scripts/test-auth.mjs` and `node scripts/test-permissions.mjs` sequentially. They create uniquely named temporary fixtures, clean them in finally, and do not reset the database. Use `TEST_BASE_URL` only for another local port serving this same workspace/database.
- The UI offers administrator-assisted account setup/reset. Public sign-up, email reset, MFA and SSO are not implemented in this step.
- Tester handoff: `TEST-STEP-2.md`. Remaining stages: `IMPLEMENTATION-PLAN.md`.
