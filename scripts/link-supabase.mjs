import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const region = process.env.SUPABASE_REGION || "eu-west-3";

function supabase(args, { capture = false } = {}) {
  return spawnSync("npx", ["supabase", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function must(result, label) {
  if (result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }
    throw new Error(`${label} failed.`);
  }
  return result.stdout ?? "";
}

function parseJson(text) {
  const start = text.search(/[[{]/);
  if (start === -1) {
    throw new Error("Expected JSON from the Supabase CLI.");
  }
  return JSON.parse(text.slice(start));
}

function accessToken() {
  const file = path.join(homedir(), ".supabase", "access-token");
  return readFileSync(file, "utf8").trim();
}

async function management(token, urlPath, options = {}) {
  const response = await fetch(`https://api.supabase.com${urlPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase API ${response.status}: ${body.slice(0, 400)}`);
  }
  return body ? JSON.parse(body) : null;
}

function saveAccessToken(token) {
  const dir = path.join(homedir(), ".supabase");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "access-token"), `${token.trim()}\n`, { mode: 0o600 });
}

function ensureLogin() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    saveAccessToken(process.env.SUPABASE_ACCESS_TOKEN);
  }
  const listed = supabase(["projects", "list", "--output", "json"], { capture: true });
  if (listed.status === 0) {
    return;
  }
  if (stdin.isTTY) {
    console.log("\nSign in to Supabase in the browser window that opens.\n");
    const login = supabase(["login"]);
    if (login.status !== 0) {
      process.exit(login.status ?? 1);
    }
    return;
  }
  console.error(`
This session cannot open the Supabase login prompt.

In your own terminal, from the project folder, run:

  npm run supabase:link

Sign in when the browser opens. The command will create or link the project,
apply the database, and write .env.local.

Or create a token at https://supabase.com/dashboard/account/tokens and run:

  SUPABASE_ACCESS_TOKEN=sbp_your_token npm run supabase:link
`);
  process.exit(1);
}

function listProjects() {
  const listed = supabase(["projects", "list", "--output", "json"], { capture: true });
  must(listed, "Listing projects");
  const projects = parseJson(listed.stdout);
  return Array.isArray(projects) ? projects : [];
}

function chooseProject(projects) {
  const requested = process.env.SUPABASE_PROJECT_REF;
  if (requested) {
    const match = projects.find((project) => project.id === requested || project.ref === requested);
    if (!match) {
      throw new Error(`No Supabase project matches SUPABASE_PROJECT_REF=${requested}.`);
    }
    return match;
  }
  const named = projects.find((project) =>
    ["caramba-online", "caramba"].includes(String(project.name).toLowerCase()),
  );
  if (named) {
    return named;
  }
  if (projects.length === 1) {
    return projects[0];
  }
  return null;
}

async function createProject(token) {
  const orgs = await management(token, "/v1/organizations");
  const org = Array.isArray(orgs) ? orgs[0] : null;
  if (!org?.id) {
    throw new Error("Your Supabase account has no organization yet. Create one at https://supabase.com/dashboard and run this again.");
  }
  const dbPassword = randomBytes(24).toString("base64url");
  console.log(`Creating project "caramba-online" in ${region}...`);
  const created = await management(token, "/v1/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "caramba-online",
      organization_id: org.id,
      region,
      db_pass: dbPassword,
    }),
  });
  const ref = created.ref ?? created.id;
  writeFileSync(path.join(root, "supabase", ".temp", "db-password"), `${dbPassword}\n`, {
    mode: 0o600,
  });
  console.log(`Project ${ref} is being created. Waiting until it is ready...`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const project = await management(token, `/v1/projects/${ref}`);
    if (project.status === "ACTIVE_HEALTHY") {
      return { id: ref, name: "caramba-online", region };
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error("The project is still starting. Wait a minute, then run npm run supabase:link again.");
}

function projectRef(project) {
  return project.id ?? project.ref;
}

async function applyMigration(token, ref) {
  const sql = readFileSync(path.join(root, "supabase", "migrations", "001_init.sql"), "utf8");
  console.log("Applying the Caramba database migration...");
  await management(token, `/v1/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  });
}

function pickKey(keys, kinds) {
  const list = Array.isArray(keys) ? keys : Object.entries(keys).map(([name, api_key]) => ({ name, api_key }));
  const match = list.find((key) => kinds.includes(key.name) || kinds.includes(key.type));
  const value = match?.api_key ?? match?.key ?? match?.value;
  if (!value || value.includes("…") || value.includes("...")) {
    return null;
  }
  return value;
}

async function writeEnv(token, ref) {
  const keys = await management(token, `/v1/projects/${ref}/api-keys?reveal=true`);
  const anon = pickKey(keys, ["anon", "publishable"]);
  const service = pickKey(keys, ["service_role", "secret"]);
  if (!anon || !service) {
    throw new Error("Could not read the anon and service role keys. Open Project Settings → API and paste them into .env.local.");
  }
  const contents = [
    `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    "",
    "# Leave unset in production.",
    "CARAMBA_TEST_MODE=",
    "",
  ].join("\n");
  writeFileSync(path.join(root, ".env.local"), contents, { mode: 0o600 });
}

async function main() {
  ensureLogin();
  const token = accessToken();
  let projects = listProjects();
  let project = chooseProject(projects);
  if (!project && projects.length > 1 && !process.env.SUPABASE_PROJECT_REF) {
    console.log("More than one Supabase project was found:");
    for (const entry of projects) {
      console.log(`- ${entry.name}  ${projectRef(entry)}`);
    }
    console.log("\nRun again with SUPABASE_PROJECT_REF set to the project you want.");
    process.exit(1);
  }
  if (!project) {
    project = await createProject(token);
    projects = listProjects();
    project = chooseProject(projects) ?? project;
  }

  const ref = projectRef(project);
  console.log(`Using Supabase project ${project.name ?? "caramba-online"} (${ref}).`);
  await applyMigration(token, ref);
  const link = supabase(["link", "--project-ref", ref, "--yes"]);
  if (link.status !== 0) {
    console.log("The database is ready. Linking the CLI can be finished later with npm run supabase:link.");
  }
  await writeEnv(token, ref);
  console.log("\nSupabase is connected. Restart the dev server so it picks up .env.local.");
  console.log(`Project URL: https://${ref}.supabase.co`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
