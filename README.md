# TravelWise

TravelWise is a Next.js travel-planning application with bundled CSV datasets
and a server-side recommendation API.

## Run locally

Requirements: Node.js 20.9 or newer and Yarn 4.

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Locally, the recommendation endpoint reads the CSV files from
`public/datasets/csv_file`. The Python CLI also uses these local files.

## Verify a production build

Run the same build used by a hosting provider:

```bash
yarn build
yarn start
```

Then open [http://localhost:3000](http://localhost:3000). The home page should
return `200 OK`, and `POST /api/recommendations` should return a validation
response when called without a travel plan.

## Deploy to Vercel

The 636 MB source CSV directory and the local-only Python CLI are excluded
from Vercel deployments by `.vercelignore`. The Next.js recommendation API fetches losslessly compressed
copies from object storage, so complete source rows remain available. The
smaller `public/datasets/travel_countries.csv` stays in the deployment because
the browser uses it.

1. Create a **public** Vercel Blob store and connect it to this project.
2. Install and sign in to the Vercel CLI, then link this repository with
   `vercel link`. Select the same project to which the public Blob store is
   connected. Run `vercel env pull .env.local`, then verify credentials with
   `vercel blob list --limit 1`. If this reports missing credentials, connect
   the store to the project and its Development environment in the Vercel
   dashboard, then pull the environment again. `.env.local` is gitignored;
   do not share its credentials.
3. From the project root, run
   `bash scripts/upload-datasets-to-vercel-blob.sh`. This uploads gzip copies
   under `travelwise-v1/csv_file/`. The raw local CSV files are unchanged.
4. Copy the public Blob URL printed for one uploaded file. Remove its filename
   and trailing slash. For example, if the file URL is
   `https://STORE.public.blob.vercel-storage.com/travelwise-v1/csv_file/ES_Spain.csv.gz`,
   set `TRAVEL_DATA_BASE_URL` to
   `https://STORE.public.blob.vercel-storage.com/travelwise-v1/csv_file`.
   Add this **server-side** environment variable for every Vercel environment
   where recommendations must work. Do not prefix it with `NEXT_PUBLIC_`.
5. Push the repository to GitHub. Import it at [vercel.com/new](https://vercel.com/new),
   select the folder containing `package.json` as the root, and use the Next.js
   framework preset. Deploy and test a full recommendation request.

If the dataset changes, upload it under a new prefix and update
`TRAVEL_DATA_BASE_URL` to that version; immutable paths avoid stale Blob
caches. Local development requires no Blob environment variable. The Python
CLI is not part of the deployed request path and continues to read local CSVs.

Do not configure this project as a static export: `/api/recommendations` is a
dynamic server route and must run on a Node.js runtime.

## Project commands

- `yarn dev` - start the development server
- `yarn build` - create an optimized production build
- `yarn start` - serve the production build
- `yarn lint` - run ESLint

For more information, see the
[Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying).
