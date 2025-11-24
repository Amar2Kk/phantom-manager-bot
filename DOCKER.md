# Docker Database Setup

This project includes a Docker Compose configuration for running PostgreSQL locally.

## Quick Start

### Start the Database

```bash
docker compose up -d
```

This will:

-   Pull the PostgreSQL 16 Alpine image
-   Create a container named `phantom-bot-db`
-   Expose PostgreSQL on port `5432`
-   Create persistent storage for data
-   Set up health checks

### Database Credentials

The database is configured with these credentials:

```
Host:     localhost
Port:     5432
Database: phantom_bot
User:     phantom_user
Password: phantom_password
```

**Connection String:**

```
DATABASE_URL=postgresql://phantom_user:phantom_password@localhost:5432/phantom_bot
```

This is already configured in your `.env` file!

### Initialize the Database

After starting Docker, push the schema:

```bash
pnpm db:push
```

Optionally, seed with test data:

```bash
pnpm db:seed
```

## Docker Commands

### Start Database

```bash
docker compose up -d
```

### Stop Database

```bash
docker compose down
```

### Stop and Remove Data

```bash
docker compose down -v
```

### View Logs

```bash
docker compose logs -f postgres
```

### Check Status

```bash
docker compose ps
```

### Restart Database

```bash
docker compose restart
```

## Connecting to the Database

### Via psql (Command Line)

```bash
docker exec -it phantom-bot-db psql -U phantom_user -d phantom_bot
```

Common psql commands:

-   `\dt` - List all tables
-   `\d table_name` - Describe table structure
-   `\q` - Quit
-   `SELECT * FROM guilds;` - Query data

### Via Prisma Studio (GUI)

```bash
pnpm db:studio
```

Opens a web interface at http://localhost:5555

### Via Database Client

Use any PostgreSQL client (DBeaver, pgAdmin, TablePlus, etc.) with these settings:

-   Host: `localhost`
-   Port: `5432`
-   Database: `phantom_bot`
-   Username: `phantom_user`
-   Password: `phantom_password`

## Troubleshooting

### Port Already in Use

If port 5432 is already in use, you can change it in `docker-compose.yml`:

```yaml
ports:
    - "5433:5432" # Change 5433 to any available port
```

Then update your DATABASE_URL:

```
DATABASE_URL=postgresql://phantom_user:phantom_password@localhost:5433/phantom_bot
```

### Database Not Starting

Check logs:

```bash
docker compose logs postgres
```

Common issues:

1. Docker not running
2. Port conflict
3. Insufficient permissions

### Reset Database

To start fresh:

```bash
# Stop and remove everything (including data)
docker compose down -v

# Start again
docker compose up -d

# Push schema
pnpm db:push

# Seed data
pnpm db:seed
```

### Check Database Health

```bash
docker exec phantom-bot-db pg_isready -U phantom_user
```

Should return: `/var/run/postgresql:5432 - accepting connections`

## Data Persistence

Your database data is stored in a Docker volume named `postgres_data`. This means:

-   ✅ Data persists across container restarts
-   ✅ Data survives `docker compose down`
-   ❌ Data is removed with `docker compose down -v`

To backup data:

```bash
docker exec phantom-bot-db pg_dump -U phantom_user phantom_bot > backup.sql
```

To restore data:

```bash
cat backup.sql | docker exec -i phantom-bot-db psql -U phantom_user -d phantom_bot
```

## Production Considerations

This Docker setup is perfect for:

-   ✅ Local development
-   ✅ Testing
-   ✅ Personal projects

For production, consider:

-   Cloud-hosted PostgreSQL (Supabase, Neon, Railway)
-   Managed database services
-   Proper security (strong passwords, SSL)
-   Regular backups
-   Monitoring and alerts

## Switching to Cloud Database

To switch from Docker to a cloud database:

1. Get your cloud database URL
2. Update `.env`:
    ```
    DATABASE_URL=your_cloud_database_url
    ```
3. Run migrations:
    ```bash
    pnpm db:push
    ```
4. Stop local Docker database:
    ```bash
    docker compose down
    ```

## Docker Compose Configuration

The `docker-compose.yml` file includes:

-   **PostgreSQL 16 Alpine** - Lightweight, latest stable version
-   **Health checks** - Ensures database is ready before connections
-   **Persistent volumes** - Data survives container restarts
-   **Port mapping** - Access from localhost
-   **Auto-restart** - Restarts on failure (unless stopped manually)

## Additional Resources

-   [Docker Documentation](https://docs.docker.com/)
-   [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
-   [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
