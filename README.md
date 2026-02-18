# AI Task — Time Tracker

## Author

**Elshad Aghayev**  
📧 Email: elshadaghazade@gmail.com  
📱 Phone: +48 721 668 065  

If you have any questions, suggestions, or collaboration ideas, feel free to reach out.

---

A simple time tracking app built with **Next.js (App Router)** + **Prisma** + **PostgreSQL**.

## Requirements

- **Node.js 20+**
- **Docker** + **Docker Compose**
- (Optional) `pnpm` / `npm` / `yarn` — examples below use **npm**

---

## 1) Start PostgreSQL (Docker)

This project includes a `docker-compose.yaml` in the repository root.

```bash
docker compose up -d
docker compose ps
docker compose down
```

## Configure environment variables

Copy the example env file:

```
cp .env.example .env
```

Update ```.env``` if needed:

```
DATABASE_URL="postgres://[username]:[password]@[host]:5432/task"
DEFAULT_USER_ID=1
```

### Notes

- **DATABASE_URL** must match your Docker Postgres credentials and port.
- **DEFAULT_USER_ID** is used by the API to create/find a local dev user automatically.

## Install dependencies

```
npm install
```

## Prisma / Database setup

```
npx prisma generate
npm run db:migrate

```

## Run the app

Start dev server:

```
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)


## Useful commands

- Start dev server: ```npm run dev```
- Build production: ```npm run build```
- Start production: ```npm run start```
- Lint: ```npm run lint```
- Prisma Studio (DB UI):
    ```
    npx prisma studio
    ```


## Troubleshooting

### “Missing user. Provide x-user-id header or set DEFAULT_USER_ID”

Make sure ```.env``` contains:

```
DEFAULT_USER_ID=1
```


### “Cannot connect to database”

- Check Docker is running: docker compose ps
- Confirm Postgres host/port in DATABASE_URL
- If Postgres is exposed on localhost, typical host is localhost

Example (common default):

```
DATABASE_URL="postgres://postgres:postgres@localhost:5432/task"
```

### Prisma client errors

Regenerate client:

```
npx prisma generate
```