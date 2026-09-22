# Claude Rules — au-registry-checkup

Rules for any Claude session working on this project.

## Delivery workflow

When Claude makes code changes to this project (via chat, not directly against
the user's local files), the user needs a way to get those changes from the
delivered zip into their local git clone. Every time Claude delivers an
updated version of this project as a zip file, Claude must **also** provide
the PowerShell commands to unzip it and copy it into the local repo, using
these fixed paths:

- Downloaded zip lands in: `D:\Chrome_Downloads`
- Local git clone lives at: `D:\Chrome_Downloads\au-registry-checkup\au-registry-checkup`

Template to reuse (update `$zipPath` if the filename changes):

```powershell
# --- Paths ---
$zipPath    = "D:\Chrome_Downloads\au-registry-checkup-updated.zip"
$extractTo  = "D:\Chrome_Downloads\au-registry-checkup-updated"
$repoPath   = "D:\Chrome_Downloads\au-registry-checkup\au-registry-checkup"

# --- 1. Unzip the download (into its own temp folder first) ---
Expand-Archive -Path $zipPath -DestinationPath $extractTo -Force

# --- 2. Copy the extracted files into the git repo, overwriting existing ones ---
Copy-Item -Path "$extractTo\*" -Destination $repoPath -Recurse -Force

# --- 3. Clean up the temp extraction folder ---
Remove-Item -Path $extractTo -Recurse -Force

# --- 4. Stage, commit, and push ---
cd $repoPath
git status
git add -A
git commit -m "Describe the change here"
git push origin main   # or master - check with: git branch --show-current
```

Notes for Claude to keep in mind:
- Check the actual downloaded filename in `D:\Chrome_Downloads` before assuming
  it matches `$zipPath` exactly (browsers append ` (1)`, etc. on repeat
  downloads).
- `Copy-Item -Force` overwrites files but does not delete files that exist in
  the repo but not in the new zip.
- Never assume the default branch name — tell the user to confirm with
  `git branch --show-current` before pushing.

## File naming

Each delivered zip must have a unique filename — never reuse
`au-registry-checkup-updated.zip` from a prior delivery. Repeat downloads of
the same filename land in the browser's Downloads folder as `(1)`, `(2)`,
etc., which silently breaks the fixed `$zipPath` in the PowerShell template
above (it would point at a stale copy). Instead, suffix the filename with a
date/time stamp, e.g. `au-registry-checkup-20260922-1153.zip`, so each
delivery is unambiguous and the PowerShell snippet Claude sends always
references the file that was actually just downloaded.

The PowerShell template's `$zipPath` line should be updated to match the
exact filename delivered that turn, or use the "grab the newest zip"
approach below so the user doesn't have to edit it themselves:

```powershell
$zipPath = Get-ChildItem "D:\Chrome_Downloads\au-registry-checkup-*.zip" |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
```

## Domain conventions

- Every Outlook/registry email in this app ends in `@africanunion.org`. Any
  input field that collects one of these addresses should only take the
  local part (before the `@`) and append the domain automatically, rather
  than letting it be typed or edited freely.
