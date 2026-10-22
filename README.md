# hello-data

Backend API for the Hello Chrome extension. Requires Node 24 (`.nvmrc`).

## Run

```sh
npm ci
npm test
npm run check
PORT=3000 npm start
```

`GET /` returns `Hello!`. `GET /version` keeps the existing API value `0.0.7`; it is independent of the package version. `GET /deploy-revision.txt` returns the full build SHA from `APP_REVISION`, and `GET /healthz` returns the same revision in JSON. Photo, stock, crypto, and weather routes remain under `/v1/`.

The stock cache lasts 60 seconds. Set `CACHE_FILE=/data/cache.json` to store it in the project-owned mounted data directory. It is disposable: missing or malformed data is recreated, and writes use an atomic rename. The historical photo dataset in `db/parsed.json` is committed to the repository.

## Deploy

Production hostname: `hello-data.amirs.dev`. After review, push `feat/pet-project-migration`, then run:

```sh
npm run deploy
```

This command requires a clean working tree and an exact match between local `HEAD` and the live `origin/feat/pet-project-migration` tip. It sends that full SHA to `/usr/local/sbin/pet-project-deploy-root` over existing root SSH at `143.110.220.15`. The host wrapper independently validates the project and pushed revision before building and switching the container.

`DEPLOY_SSH_DESTINATION` and `DEPLOY_REMOTE_EXECUTABLE` override the transport for tests or a separately reviewed host change. No SSH credential is stored in this repository.
