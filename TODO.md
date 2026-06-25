## TODO - Chart sizing warnings + build issue

- [ ] Inspect chart usage files to confirm where container size becomes 0/-1 during prerender.
- [ ] Patch `components/ui/chart.tsx` to ensure `ResponsiveContainer` always has safe sizing (minWidth/minHeight and/or explicit width/height forwarding).
- [ ] Patch any other chart container components if needed (e.g., wrappers around `ChartContainer`).
- [ ] Re-run `npm run build` to verify warnings disappear.
- [ ] If the `/vercel/...middleware.js.nft.json` error persists, isolate whether it’s a Vercel-specific artifact and ensure Next middleware is not misconfigured.

