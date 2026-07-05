$ErrorActionPreference = "Stop"
Set-Location "e:\vacansee-au"

function Get-CommitMessage {
    param([string]$Path)

    $name = Split-Path $Path -Leaf
    $dir = Split-Path $Path -Parent

    switch ($Path) {
        ".gitignore" { return "Add gitignore" }
        ".env.example" { return "Add env example template" }
        "package.json" { return "Add package.json" }
        "package-lock.json" { return "Add package-lock.json" }
        "README.md" { return "Add README" }
        "CONTRIBUTING.md" { return "Add contributing guide" }
        "components.json" { return "Add shadcn components config" }
        "eslint.config.mjs" { return "Add ESLint config" }
        "next.config.ts" { return "Add Next.js config" }
        "postcss.config.mjs" { return "Add PostCSS config" }
        "tailwind.config.js" { return "Add Tailwind config" }
        "tsconfig.json" { return "Add TypeScript config" }
        "vercel.json" { return "Add Vercel deployment config" }
        "prisma.config.ts" { return "Add Prisma config" }
        "academic_calendar_cache.json" { return "Add root academic calendar cache" }
        ".github/workflows/backup-database.yml" { return "Add daily database backup workflow" }
        ".github/workflows/codeql.yml" { return "Add CodeQL security workflow" }
        ".github/workflows/update-timetable.yml" { return "Add timetable update workflow" }
        "prisma/schema.prisma" { return "Add Prisma schema for AU tables" }
        "prisma/migrations/migration_lock.toml" { return "Add Prisma migration lock" }
        "public/manifest.json" { return "Add PWA manifest" }
        "public/sw.js" { return "Add service worker" }
        "public/offline.html" { return "Add offline fallback page" }
        "public/robots.txt" { return "Add robots.txt" }
        "public/browserconfig.xml" { return "Add browser tile config" }
        "public/scheduleData.json" { return "Add pre-aggregated schedule data" }
        "public/classes.csv" { return "Add classes CSV export" }
        "scripts/requirements.txt" { return "Add Python script dependencies" }
        "src/proxy.ts" { return "Add auth proxy middleware" }
        "src/styles/globals.css" { return "Add global styles" }
        default { }
    }

    if ($Path -match "^prisma/migrations/.+/migration\.sql$") {
        $migration = ($Path -split "/")[-2]
        return "Add migration $migration"
    }
    if ($Path -match "^public/raw/raw_timetable_(.+)\.json$") {
        $campus = $Matches[1] -replace "_", " "
        return "Add raw timetable for $campus"
    }
    if ($Path -match "^public/cache/") {
        return "Add cache file $name"
    }
    if ($Path -match "^public/fonts/") {
        return "Add font $name"
    }
    if ($Path -match "^public/.*\.(png|ico|svg)$") {
        return "Add icon asset $name"
    }
    if ($Path -match "^scripts/") {
        $base = [System.IO.Path]::GetFileNameWithoutExtension($name)
        return "Add script $base"
    }
    if ($Path -match "^src/app/api/(.+)/route\.ts$") {
        return "Add API route /$($Matches[1])"
    }
    if ($Path -match "^src/app/(.+)/page\.tsx$") {
        return "Add page /$($Matches[1])"
    }
    if ($Path -match "^src/app/(.+\.tsx)$") {
        return "Add app $($Matches[1])"
    }
    if ($Path -match "^src/components/jr/") {
        return "Add JR component $name"
    }
    if ($Path -match "^src/components/ui/") {
        return "Add UI component $name"
    }
    if ($Path -match "^src/components/") {
        return "Add component $name"
    }
    if ($Path -match "^src/contexts/") {
        return "Add context $name"
    }
    if ($Path -match "^src/hooks/") {
        return "Add hook $name"
    }
    if ($Path -match "^src/lib/supabase/") {
        return "Add Supabase helper $name"
    }
    if ($Path -match "^src/lib/") {
        return "Add lib $name"
    }
    if ($Path -match "^src/services/") {
        return "Add service $name"
    }
    if ($Path -match "^src/types/") {
        return "Add types $name"
    }
    if ($Path -match "^src/views/") {
        $view = [System.IO.Path]::GetFileNameWithoutExtension($name)
        return "Add $view view"
    }
    if ($Path -match "^src/constants/") {
        return "Add shared constants"
    }

    return "Add $Path"
}

$files = git ls-files --others --exclude-standard
$total = @($files).Count
$i = 0

foreach ($file in $files) {
    $i++
    $msg = Get-CommitMessage -Path $file
    git add -- "$file"
    git commit -m $msg | Out-Null
    Write-Host "[$i/$total] $msg"
}

Write-Host "Done. $total commits created."
