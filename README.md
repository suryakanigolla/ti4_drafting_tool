# TI4 Drafting Tool

Next.js app for private Twilight Imperium 4 faction drafting.

## Features

- Host can create a room and configure faction pool:
  - Base game (required)
  - Prophecy of Kings
  - Codex 1
  - Codex 2
- Players join via 6-character room code.
- Host starts draft once everyone joins.
- Every player receives 2 private faction options and picks 1.
- Other players cannot view your options or selection.
- Room closes automatically once all picks are submitted and displays **Happy Gaming**.

## Environment variables

Add the Vercel Blob read/write token before running locally:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_read_write_token
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.
