# life-calendar
An interactive calendar of your life.

## Run (Deno, no npm)
1) Install Deno if you don’t have it: https://deno.com.
2) From the repo root, start the dev server:
```sh
deno task dev
```
3) Open http://localhost:8000 to view the app.

## Type-check and bundle
- Type-check: `deno task check`
- Bundle fresh browser JS: `deno task bundle` (writes `app.js` from `app.ts`; uses import map)
