# Backup, Portability & Database Strategy — Mohit Tailoring POS

## Database Architecture & Local Hard Disk Backup Strategy

### Live Database vs Local External Hard Disk
- **Live Database**: Hosted on standard PostgreSQL / Supabase Cloud instance.
- **Local 1TB HDD / External Drive**: Designated strictly as an **Archive / Backup Destination**, not the live transactional engine.

---

## 1. Automated PostgreSQL Dump & Export Workflow

### Database Backup via Supabase CLI / `pg_dump`
To create a complete local SQL snapshot of the Mohit Tailoring database:

```bash
# Export schema + data to local SQL archive
pg_dump "postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  --clean --if-exists --inserts -f "backup_mohit_tailoring_$(date +%Y%m%d).sql"
```

### Automated Backup Script for Local 1TB HDD (`backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/Volumes/External1TB/MohitTailoringBackups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/mohit_tailoring_backup_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "Starting Mohit Tailoring Database Backup to 1TB HDD..."
pg_dump "$DATABASE_URL" --clean --if-exists --inserts -f "$FILENAME"

gzip "$FILENAME"
echo "Backup saved successfully to $FILENAME.gz"
```

---

## 2. Database Restoration Workflow

To restore a local backup SQL file to a new PostgreSQL server:

```bash
# Uncompress backup file
gunzip mohit_tailoring_backup_20260922_120000.sql.gz

# Restore snapshot to target database
psql "postgres://postgres:[PASSWORD]@[TARGET-HOST]:5432/postgres" -f mohit_tailoring_backup_20260922_120000.sql
```

---

## 3. Hosting Guidelines: Supabase Free vs Production Pro

### Development Tier (Supabase Free Plan)
- **Appropriate For**: Initial development, testing, staging, and prototype demos.
- **Inactivity Pausing**: Supabase Free plan projects pause after 7 days of inactivity.

### Production Tier (Supabase Pro / Dedicated PostgreSQL)
- **Recommendation**: Upgrade project to **Supabase Pro** ($25/mo) or host on dedicated PostgreSQL for production deployment.
- **Benefits**: Zero inactivity pausing, automated daily backups, 8GB database storage, and 100K monthly active users.
