import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.TEST_BASE_URL;
if (!base || !["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("API tests require an isolated local test server.");

const account = () => ({
  email: `api-${randomUUID()}@example.test`,
  password: randomUUID(),
  name: "API test",
});
async function request(path, { cookie, method = "GET", body, ...rest } = {}) {
  return fetch(new URL(path, base), {
    method,
    redirect: "manual",
    headers: {
      origin: base,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });
}
async function register() {
  const response = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: account(),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

const savedDesign = {
  version: 1,
  templateId: 3,
  dotsOptions: {
    type: "dots",
    color: "#000000",
    gradient: {
      type: "linear",
      rotation: 45,
      colorStops: [
        { offset: 0, color: "#405DE6" },
        { offset: 1, color: "#C13584" },
      ],
    },
  },
  cornersSquareOptions: { type: "extra-rounded", color: "#405DE6" },
  cornersDotOptions: { type: "dot", color: "#C13584" },
  backgroundOptions: { color: "#ffffff" },
  logoId: "whatsapp",
  frame: { style: "blue", text: "SCAN ME" },
};

async function createManagedCode(cookie, title, destination, tracked = true) {
  const response = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { title, destination_url: destination, tracking_enabled: tracked },
  });
  assert.equal(response.status, 201);
  return response.json();
}

test("overview totals describe only the signed-in account", async () => {
  const anonymous = await request("/overview");
  assert.equal(anonymous.status, 307);
  assert.equal(anonymous.headers.get("location"), "/auth?next=%2Foverview");
  const owner = await register();
  const stranger = await register();
  const other = await createManagedCode(stranger, "Private campaign from another account", "https://example.test/private");
  const active = await createManagedCode(owner, "Active", "https://example.test/active");
  assert.equal((await fetch(active.trackingUrl, { redirect: "manual" })).status, 302);
  assert.equal((await fetch(other.trackingUrl, { redirect: "manual" })).status, 302);
  await createManagedCode(owner, "Direct", "https://example.test/direct", false);
  const paused = await createManagedCode(owner, "Paused", "https://example.test/paused");
  assert.equal((await request(`/api/qr-codes/${paused.qrCode.id}`, {
    cookie: owner, method: "PATCH", body: { is_active: false },
  })).status, 200);
  const overview = await request("/overview", { cookie: owner });
  assert.equal(overview.status, 200);
  const html = await overview.text();
  assert.match(html, /Total QR Codes<\/dt><dd[^>]*>3<\/dd>/);
  assert.match(html, /Active tracked codes<\/dt><dd[^>]*>1<\/dd>/);
  assert.match(html, /Inactive tracked codes<\/dt><dd[^>]*>1<\/dd>/);
  assert.match(html, /Total Scans<\/dt><dd[^>]*>1<\/dd>/);
  assert.match(html, />Scans<\/dt><dd[^>]*>1<\/dd>/);
  assert.doesNotMatch(html, /Private campaign from another account/);
});

test("management searches, filters and paginates the authenticated account only", async () => {
  const owner = await register();
  const stranger = await register();
  await createManagedCode(stranger, "Report private", "https://example.test/report");
  for (let number = 1; number <= 21; number++) {
    await createManagedCode(owner, `Report ${number}`, `https://example.test/${number}`, number !== 21);
  }
  await createManagedCode(owner, "Literal 100%_done", "https://example.test/destination-match");

  const list = async (query) => {
    const response = await request(`/api/qr-codes?${query}`, { cookie: owner });
    assert.equal(response.status, 200);
    return response.json();
  };
  const first = await list("page=1&q=REPORT");
  const second = await list("page=2&q=REPORT");
  assert.equal(first.total, 21);
  assert.equal(first.qrCodes.length, 20);
  assert.deepEqual(second.qrCodes.map((qr) => qr.title), ["Report 1"]);
  assert.equal(new Set([...first.qrCodes, ...second.qrCodes].map((qr) => qr.id)).size, 21);
  assert.equal((await list("page=1&q=report&mode=tracked&status=active")).total, 20);
  assert.equal((await list("page=1&q=report&mode=direct")).total, 1);
  assert.equal((await list("page=1&q=destination-match")).total, 1);
  assert.equal((await list("page=1&q=100%25_")).total, 1);
  assert.equal((await list("page=99&q=report")).page, 2);
});

test("tracking can be paused and resumed without losing the URL or scans", async () => {
  const owner = await register();
  const stranger = await register();
  const initial = await createManagedCode(owner, "Campaign", "https://example.test/campaign");
  const direct = await createManagedCode(owner, "Direct", "https://example.test/direct", false);
  const change = (cookie, id, is_active) => request(`/api/qr-codes/${id}`, {
    method: "PATCH", cookie, body: { is_active },
  });
  const scan = () => fetch(initial.trackingUrl, { redirect: "manual" });
  assert.equal((await scan()).status, 302);
  assert.equal((await change(stranger, initial.qrCode.id, false)).status, 404);
  assert.equal((await change(owner, direct.qrCode.id, false)).status, 404);
  const pausedResponse = await change(owner, initial.qrCode.id, false);
  assert.equal(pausedResponse.status, 200);
  const paused = await pausedResponse.json();
  assert.equal(paused.qrCode.is_active, false);
  assert.equal((await scan()).status, 410);
  const pausedList = await (await request("/api/qr-codes?page=1&status=inactive", { cookie: owner })).json();
  assert.deepEqual(pausedList.qrCodes.map((qr) => qr.id), [initial.qrCode.id]);
  const resumedResponse = await change(owner, initial.qrCode.id, true);
  assert.equal(resumedResponse.status, 200);
  const resumed = await resumedResponse.json();
  assert.equal(resumed.qrCode.is_active, true);
  assert.equal(resumed.trackingUrl, initial.trackingUrl);
  assert.equal(resumed.qrCode.destination_url, initial.qrCode.destination_url);
  assert.deepEqual(resumed.qrCode.design, initial.qrCode.design);
  assert.equal(resumed.qrCode.total_scans, 1);
  assert.equal((await scan()).status, 302);
});

test("a user can save and retrieve a direct QR with its full design", async () => {
  const cookie = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: {
      destination_url: "https://example.com/design",
      design: savedDesign,
      tracking_enabled: false,
    },
  });
  assert.equal(created.status, 201);
  const result = await created.json();
  const response = await request(`/api/qr-codes/${result.qrCode.id}`, {
    cookie,
  });
  assert.equal(response.status, 200);
  const retrieved = await response.json();
  assert.deepEqual(retrieved.qrCode.design, savedDesign);
  assert.equal(retrieved.qrCode.tracking_enabled, false);
  assert.equal(retrieved.trackingUrl, null);
});

test("updating a tracked QR design preserves its public URL, content and scans without duplication", async () => {
  const cookie = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: {
      destination_url: "https://example.com/stable",
      design: savedDesign,
    },
  });
  const initial = await created.json();
  assert.equal(
    (await fetch(initial.trackingUrl, { redirect: "manual" })).status,
    302,
  );
  const changed = {
    ...savedDesign,
    logoId: null,
    frame: { style: "red", text: "NEW DESIGN" },
  };
  const response = await request(`/api/qr-codes/${initial.qrCode.id}`, {
    method: "PATCH",
    cookie,
    body: { design: changed },
  });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.trackingUrl, initial.trackingUrl);
  assert.equal(updated.qrCode.short_code, initial.qrCode.short_code);
  assert.equal(updated.qrCode.destination_url, "https://example.com/stable");
  assert.equal(updated.qrCode.total_scans, 1);
  const retrieved = await (
    await request(`/api/qr-codes/${initial.qrCode.id}`, { cookie })
  ).json();
  assert.deepEqual(retrieved.qrCode.design, changed);
  const list = await (await request("/api/qr-codes", { cookie })).json();
  assert.equal(list.qrCodes.length, 1);
  assert.deepEqual(list.qrCodes[0].design, changed);
});

test("design reads and writes reject other accounts, invalid designs, forged fields and foreign origins", async () => {
  const owner = await register(),
    stranger = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie: owner,
    body: {
      destination_url: "https://example.com/private-design",
      design: savedDesign,
    },
  });
  const { qrCode } = await created.json();
  const path = `/api/qr-codes/${qrCode.id}`;
  assert.equal((await request(path)).status, 401);
  assert.equal((await request(path, { cookie: stranger })).status, 404);
  assert.equal(
    (
      await request(path, {
        method: "PATCH",
        cookie: stranger,
        body: { design: savedDesign },
      })
    ).status,
    404,
  );
  for (const body of [
    { design: { ...savedDesign, version: 2 } },
    { design: { ...savedDesign, logoId: "https://example.com/remote.svg" } },
    {
      design: {
        ...savedDesign,
        dotsOptions: { type: "square", color: "url(https://example.com/)" },
      },
    },
    {
      design: {
        ...savedDesign,
        dotsOptions: { type: "square", color: "#ffffff" },
      },
    },
    { design: savedDesign, user_id: randomUUID() },
    { design: savedDesign, destination_url: "https://example.com/change" },
    { design: savedDesign, tracking_enabled: false },
    { design: { ...savedDesign, rawSvg: "<script>not-allowed</script>" } },
  ])
    assert.equal(
      (await request(path, { method: "PATCH", cookie: owner, body })).status,
      400,
    );
  const foreign = await fetch(new URL(path, base), {
    method: "PATCH",
    headers: {
      cookie: owner,
      origin: "https://foreign.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ design: savedDesign }),
  });
  assert.equal(foreign.status, 403);
  const after = await (await request(path, { cookie: owner })).json();
  assert.deepEqual(after.qrCode.design, savedDesign);
});

test("legacy callers can omit design and retain a usable tracked QR without invented historical appearance", async () => {
  const cookie = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { destination_url: "https://example.com/legacy" },
  });
  assert.equal(created.status, 201);
  const initial = await created.json();
  const retrieved = await (
    await request(`/api/qr-codes/${initial.qrCode.id}`, { cookie })
  ).json();
  assert.equal(retrieved.qrCode.design, null);
  assert.equal(retrieved.qrCode.tracking_enabled, true);
  assert.equal(
    (await fetch(retrieved.trackingUrl, { redirect: "manual" })).headers.get(
      "location",
    ),
    "https://example.com/legacy",
  );
});

test("a new user can register and retrieve their own session", async () => {
  const profile = account();
  const response = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: profile,
  });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  assert.ok(
    cookies.some((value) => /httponly/i.test(value)),
    "Session cookie must be HTTP-only",
  );
  const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
  const session = await request("/api/auth/get-session", { cookie });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.email, profile.email);
});

test("anonymous visitors are redirected away from the protected workspace", async () => {
  for (const path of ["/app", "/my-qrcodes"]) {
    const response = await request(path);
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get("location"), base).pathname,
      "/auth",
    );
  }
});

test("a user can log in, refresh their session and log out; incorrect credentials are rejected", async () => {
  const profile = account();
  await request("/api/auth/sign-up/email", { method: "POST", body: profile });
  const wrong = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: { email: profile.email, password: randomUUID() },
  });
  assert.equal(wrong.status, 401);
  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: profile,
  });
  assert.equal(login.status, 200);
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const before = await request("/api/auth/get-session", { cookie });
  assert.equal((await before.json()).user.email, profile.email);
  assert.equal(
    (await request("/api/auth/sign-out", { method: "POST", body: {}, cookie }))
      .status,
    200,
  );
  const after = await request("/api/auth/get-session", { cookie });
  assert.equal(await after.json(), null);
});

test("a user can create a tracked QR and see it in their own list", async () => {
  const cookie = await register();
  const response = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: {
      destination_url: "https://example.com/offer",
      title: "My offer",
      qr_type: "website",
    },
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.qrCode.title, "My offer");
  assert.equal(new URL(result.trackingUrl).origin, base);
  assert.equal(
    new URL(result.trackingUrl).searchParams.get("code"),
    result.qrCode.short_code,
  );
  const listed = await request("/api/qr-codes", { cookie });
  assert.equal(listed.status, 200);
  assert.ok(
    (await listed.json()).qrCodes.some((item) => item.id === result.qrCode.id),
  );
});

test("scanning a QR redirects and records events exactly once; HEAD does not record a scan", async () => {
  const cookie = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { destination_url: "https://example.com/campaign" },
  });
  assert.equal(created.status, 201);
  const { qrCode, trackingUrl } = await created.json();
  const head = await fetch(trackingUrl, { method: "HEAD", redirect: "manual" });
  assert.equal(head.status, 302);
  const scans = await Promise.all(
    Array.from({ length: 4 }, () =>
      fetch(trackingUrl, {
        redirect: "manual",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36",
        },
      }),
    ),
  );
  for (const scan of scans) {
    assert.equal(scan.status, 302);
    assert.equal(scan.headers.get("location"), "https://example.com/campaign");
    assert.match(scan.headers.get("cache-control"), /no-store/);
  }
  const response = await request(
    `/api/qr-codes/${qrCode.short_code}/analytics`,
    { cookie },
  );
  assert.equal(response.status, 200);
  const stats = await response.json();
  assert.equal(stats.analytics.totalScans, 4);
  assert.equal(stats.qrCode.total_scans, 4);
  assert.equal(stats.analytics.osBreakdown.Android, 4);
});

test("another account cannot list, inspect or delete a user QR; the owner can delete it", async () => {
  const owner = await register();
  const stranger = await register();
  const created = await request("/api/qr-codes", {
    method: "POST",
    cookie: owner,
    body: { destination_url: "https://example.com/private" },
  });
  const { qrCode, trackingUrl } = await created.json();
  const list = await request("/api/qr-codes", { cookie: stranger });
  assert.ok(!(await list.json()).qrCodes.some((item) => item.id === qrCode.id));
  assert.equal(
    (
      await request(`/api/qr-codes/${qrCode.short_code}/analytics`, {
        cookie: owner,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/api/qr-codes/${qrCode.short_code}/analytics`, {
        cookie: stranger,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/api/qr-codes/${qrCode.id}`, {
        method: "DELETE",
        cookie: stranger,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/api/qr-codes/${qrCode.id}`, {
        method: "DELETE",
        cookie: owner,
      })
    ).status,
    200,
  );
  assert.equal((await fetch(trackingUrl, { redirect: "manual" })).status, 404);
});

test("unauthenticated API access, unsafe targets and forged ownership are rejected", async () => {
  assert.equal((await request("/api/qr-codes")).status, 401);
  assert.equal(
    (
      await request("/api/qr-codes", {
        method: "POST",
        body: { destination_url: "https://example.com/" },
      })
    ).status,
    401,
  );
  const cookie = await register();
  for (const body of [
    { destination_url: "javascript:alert(1)" },
    { destination_url: "https://example.com/", user_id: randomUUID() },
  ]) {
    assert.equal(
      (await request("/api/qr-codes", { method: "POST", cookie, body })).status,
      400,
    );
  }
  const foreignOrigin = await fetch(new URL("/api/qr-codes", base), {
    method: "POST",
    headers: {
      cookie,
      origin: "https://foreign.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({ destination_url: "https://example.com/" }),
  });
  assert.equal(foreignOrigin.status, 403);
  assert.equal((await request("/qr?code=missing-code")).status, 404);
});

test("an internationalized destination redirects using a valid encoded Location header", async () => {
  const cookie = await register();
  const response = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { destination_url: "https://example.com/مرحبا" },
  });
  assert.equal(response.status, 201);
  const { trackingUrl } = await response.json();
  const scan = await fetch(trackingUrl, { redirect: "manual" });
  assert.equal(scan.status, 302);
  assert.equal(
    scan.headers.get("location"),
    "https://example.com/%D9%85%D8%B1%D8%AD%D8%A8%D8%A7",
  );
});

test("a valid long destination is independent of the optional display title", async () => {
  const cookie = await register();
  const destination = "https://example.com/?campaign=" + "a".repeat(500);
  const response = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { destination_url: destination },
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.qrCode.destination_url, destination);
  assert.ok(result.qrCode.title.length <= 255);
});

test("a valid Unicode display title uses the same character limit as Postgres", async () => {
  const cookie = await register();
  const destination = "https://example.com/" + "😀".repeat(128);
  const response = await request("/api/qr-codes", {
    method: "POST",
    cookie,
    body: { destination_url: destination, title: destination },
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).qrCode.title, destination);
});

test("global QR suggestions rank title matches and never cross account boundaries", async () => {
  const search = (q, cookie) => request('/api/qr-codes/search?' + new URLSearchParams({ q }), { cookie });
  assert.equal((await search("launch")).status, 401);
  const owner = await register();
  const stranger = await register();
  await createManagedCode(stranger, "Launch", "https://example.test/another-account");
  const destinationMatch = await createManagedCode(owner, "Campaign", "https://example.test/a-launch");
  const exactMatch = await createManagedCode(owner, "Launch", "https://example.test/campaign");
  const literalMatch = await createManagedCode(owner, "SKU_1%", "https://example.test/literal");
  await createManagedCode(owner, "SKUx1x", "https://example.test/any");
  const response = await search(" lAuNcH ", owner);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.deepEqual((await response.json()).results.map(item => item.id), [exactMatch.qrCode.id, destinationMatch.qrCode.id]);
  assert.deepEqual((await (await search("SKU_1%", owner)).json()).results.map(item => item.id), [literalMatch.qrCode.id]);
  assert.deepEqual((await (await search("   ", owner)).json()).results, []);
});

test("list operators, dates, layout and stable sort compose with text and pagination", async () => {
  const owner = await register();
  const other = await register();
  await createManagedCode(other, "Team Aardvark", "https://example.test/team");
  const expected = [];
  for (let index = 23; index >= 1; index--) {
    const title = `Team ${String(index).padStart(2, "0")}`;
    const { qrCode } = await createManagedCode(owner, title, `https://example.test/team/${index}`);
    expected.unshift(qrCode);
  }
  await createManagedCode(owner, "Team 00", "https://example.test/team/direct", false);
  await createManagedCode(owner, "Team 99", "https://example.test/ignore/team");
  const scanned = await createManagedCode(owner, "Team 98", "https://example.test/team/scanned");
  assert.equal((await fetch(scanned.trackingUrl, { redirect: "manual" })).status, 302);
  const rules = JSON.stringify([
    ["mode", "is_not", "direct"], ["destination", "not_contains", "/ignore/"], ["scans", "lte", "٠"],
    ["created", "is", expected[0].created_at.slice(0, 10)],
  ]);
  const query = (page) => new URLSearchParams({ q: "TEAM", sort: "name", view: "grid", rules, page });
  const first = await (await request("/api/qr-codes?" + query("1"), { cookie: owner })).json();
  const second = await (await request("/api/qr-codes?" + query("2"), { cookie: owner })).json();
  assert.equal(first.total, 23);
  assert.equal(second.page, 2);
  assert.equal(second.pages, 2);
  assert.deepEqual([...first.qrCodes, ...second.qrCodes].map(row => row.id), expected.map(row => row.id));

  const exact = await (await request("/api/qr-codes?focus=" + expected[0].id, { cookie: owner })).json();
  assert.deepEqual(exact.qrCodes.map(row => row.id), [expected[0].id]);
  assert.equal((await (await request("/api/qr-codes?focus=" + expected[0].id, { cookie: other })).json()).total, 0);
});

test("folders, labels, watchlists and bulk updates are scoped to the account", async () => {
  const owner = await register();
  const other = await register();
  const { qrCode: tracked } = await createManagedCode(owner, "Tracked example", "https://example.test/t");
  const { qrCode: direct } = await createManagedCode(owner, "Direct example", "https://example.test/d", false);
  const { qrCode: foreign } = await createManagedCode(other, "Other example", "https://example.test/x");
  const collection = (cookie, action, fields) => request("/api/qr-codes/organization", {
    cookie, method: "POST", body: { action, ...fields },
  });
  const edit = (cookie, qrCode, body) => request(`/api/qr-codes/${qrCode.id}/organization`, {
    cookie, method: "PATCH", body,
  });
  const folder = await (await collection(owner, "create", { collection: "folder", name: "Guides" })).json();
  const label = await (await collection(owner, "create", { collection: "label", name: "Launch" })).json();
  const privateFolder = await (await collection(other, "create", { collection: "folder", name: "Guides" })).json();
  const privateLabel = await (await collection(other, "create", { collection: "label", name: "Launch" })).json();
  assert.equal((await collection(owner, "create", { collection: "folder", name: " guides " })).status, 409);
  assert.equal((await collection(owner, "rename", { collection: "folder", name: "Stolen", id: privateFolder.id })).status, 404);
  assert.equal((await request("/api/qr-codes/organization")).status, 401);
  assert.deepEqual(await (await request("/api/qr-codes/organization", { cookie: owner })).json(), { folders: [folder], labels: [label] });
  assert.equal((await edit(owner, tracked, { folderId: privateFolder.id })).status, 404);
  assert.equal((await edit(owner, foreign, { folderId: folder.id })).status, 404);
  assert.equal((await edit(owner, direct, { watched: true })).status, 400);
  assert.equal((await edit(owner, tracked, { folderId: folder.id })).status, 200);
  assert.equal((await edit(owner, tracked, { watched: true })).status, 200);

  const bulk = (labelIds) => request("/api/qr-codes/bulk", {
    cookie: owner, method: "POST", body: { ids: [tracked.id, foreign.id, direct.id], labelIds },
  });
  assert.equal((await bulk([label.id, privateLabel.id])).status, 404);
  assert.equal((await (await request("/api/qr-codes?label=" + label.id, { cookie: owner })).json()).total, 0);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await bulk([label.id]);
    assert.equal(result.status, 200);
    assert.deepEqual((await result.json()).results, [
      { id: tracked.id, status: "updated" }, { id: foreign.id, status: "not_found" }, { id: direct.id, status: "updated" },
    ]);
  }
  const filters = new URLSearchParams({ folder: folder.id, label: label.id, watch: "yes", q: "tracked" });
  const result = await (await request("/api/qr-codes?" + filters, { cookie: owner })).json();
  assert.equal(result.total, 1);
  assert.equal(result.qrCodes[0].id, tracked.id);
  assert.deepEqual(result.qrCodes[0].label_ids, [label.id]);
  assert.equal((await (await request("/api/qr-codes?label=" + label.id, { cookie: other })).json()).total, 0);

  assert.equal((await collection(owner, "delete", { collection: "folder", id: folder.id })).status, 200);
  assert.equal((await edit(owner, tracked, { labelId: label.id, labeled: false })).status, 200);
  const retained = await (await request("/api/qr-codes?focus=" + tracked.id, { cookie: owner })).json();
  assert.equal(retained.qrCodes[0].folder_id, null);
  assert.deepEqual(retained.qrCodes[0].label_ids, []);
  assert.equal(retained.qrCodes[0].watched, true);
});

test("CSV import persists valid rows once and reports invalid rows without access across accounts", async () => {
  const owner = await register();
  const other = await register();
  const csv = 'title,destination_url,mode\r\n"Guide, Arabic",https://example.test/a,direct\r\nBad,ftp://example.test,tracked\r\nSpring,https://example.test/b,tracked\r\n';
  const id = randomUUID();
  const upload = (body, options = {}) => fetch(new URL("/api/qr-codes/import", base), {
    method: "POST",
    body,
    headers: { origin: options.origin || base, cookie: options.cookie ?? owner, "content-type": "text/csv", "x-qr-import-id": id },
  });
  assert.equal((await upload(csv, { origin: "https://other.example" })).status, 403);
  assert.equal((await upload(csv, { cookie: "" })).status, 401);
  assert.equal((await upload("wrong,header\nsite,https://example.test")).status, 400);
  assert.equal((await upload("X".repeat(128 * 1024 + 1))).status, 413);
  const [first, duplicate] = await Promise.all([upload(csv), upload(csv)]);
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  const outcome = await first.json();
  assert.deepEqual(await duplicate.json(), outcome);
  assert.deepEqual(outcome.rows.map(row => [row.line, row.status]), [[2, "created"], [3, "invalid"], [4, "created"]]);
  assert.deepEqual(outcome.rows[1], { line: 3, status: "invalid", issue: "invalid_destination" });
  assert.deepEqual([outcome.created, outcome.invalid, outcome.failed], [2, 1, 0]);
  const list = await (await request("/api/qr-codes?page=1", { cookie: owner })).json();
  assert.equal(list.total, 2);
  const imported = await (await request("/api/qr-codes/" + outcome.rows[0].id, { cookie: owner })).json();
  assert.equal(imported.qrCode.design, null);
  assert.equal(imported.qrCode.title, "Guide, Arabic");
  assert.equal(imported.trackingUrl, null);
  const tracked = await (await request("/api/qr-codes/" + outcome.rows[2].id, { cookie: owner })).json();
  assert.equal((await fetch(tracked.trackingUrl, { redirect: "manual" })).status, 302);
  assert.equal((await request("/api/qr-codes/" + outcome.rows[2].id, { cookie: other })).status, 404);
});

test("static QR types store structured content and encode the payload server-side", async () => {
  const owner = await register();
  const stranger = await register();
  const create = (cookie, body) => request("/api/qr-codes", { method: "POST", cookie, body });
  const wifi = await create(owner, {
    content: { type: "wifi", ssid: "Office;5G", security: "WPA", password: "s3cret:pass" },
    design: savedDesign,
  });
  assert.equal(wifi.status, 201);
  const { qrCode, trackingUrl } = await wifi.json();
  assert.equal(trackingUrl, null);
  assert.equal(qrCode.qr_type, "wifi");
  assert.equal(qrCode.tracking_enabled, false);
  assert.equal(qrCode.destination_url, String.raw`WIFI:T:WPA;S:Office\;5G;P:s3cret\:pass;;`);
  assert.equal(qrCode.title, "Wi-Fi · Office;5G");
  assert.deepEqual(qrCode.content, { type: "wifi", ssid: "Office;5G", security: "WPA", password: "s3cret:pass", hidden: false });

  const arabic = await (await create(owner, { title: "نص", content: { type: "text", text: "مرحبا" } })).json();
  assert.equal(arabic.qrCode.destination_url, "مرحبا");
  assert.equal(arabic.qrCode.title, "نص");
  const phone = await (await create(owner, { content: { type: "phone", number: "+55 (11) 4000-1234" } })).json();
  assert.equal(phone.qrCode.destination_url, "tel:+551140001234");

  const rejected = [
    { content: { type: "wifi", ssid: "Home", security: "WPA", password: "" } },
    { content: { type: "text", text: "tracked" }, tracking_enabled: true },
    { content: { type: "email", to: "team@example.com" }, destination_url: "https://example.test" },
    { content: { type: "website", url: "https://example.test" } },
    { qr_type: "text", destination_url: "https://example.test/not-static" },
    { content: { type: "text", text: "م".repeat(700) } },
  ];
  for (const body of rejected) assert.equal((await create(owner, body)).status, 400, JSON.stringify(body).slice(0, 80));

  const reopened = await request(`/api/qr-codes/${qrCode.id}`, { cookie: owner });
  assert.deepEqual((await reopened.json()).qrCode.content, qrCode.content);
  assert.equal((await request(`/api/qr-codes/${qrCode.id}`, { cookie: stranger })).status, 404);
  const search = await (await request("/api/qr-codes/search?q=Office", { cookie: owner })).json();
  assert.equal(JSON.stringify(search).includes("s3cret"), false);
  const byPassword = await (await request("/api/qr-codes/search?q=s3cret", { cookie: owner })).json();
  assert.equal(JSON.stringify(byPassword).includes(qrCode.id), false);
  const overview = await (await request("/overview", { cookie: owner })).text();
  assert.equal(overview.includes("s3cret"), false);
  assert.equal((await request(`/api/qr-codes/${qrCode.id}`, {
    cookie: owner, method: "PATCH", body: { destination_url: "https://example.test/new" },
  })).status, 409);
});

test("tracked QR destination changes keep the URL, scans and an owner-only history", async () => {
  const owner = await register();
  const stranger = await register();
  const created = await createManagedCode(owner, "Campaign", "https://example.test/first");
  const { qrCode, trackingUrl } = created;
  const first = await fetch(trackingUrl, { redirect: "manual" });
  assert.equal(first.status, 302);
  assert.equal(first.headers.get("location"), "https://example.test/first");

  const change = (cookie, destination_url, origin) => request(`/api/qr-codes/${qrCode.id}`, {
    cookie, method: "PATCH", body: { destination_url }, ...(origin ? { headers: { origin, "content-type": "application/json", cookie } } : {}),
  });
  assert.equal((await change(stranger, "https://example.test/hijack")).status, 404);
  assert.equal((await change(owner, "https://example.test/x", "https://attacker.test")).status, 403);
  assert.equal((await change(owner, "javascript:alert(1)")).status, 400);
  assert.equal((await change(owner, "https://user:pw@example.test/")).status, 400);
  assert.equal((await change(owner, "https://example.test/first")).status, 409);
  const updated = await change(owner, "https://example.test/second?ref=qr");
  assert.equal(updated.status, 200);
  const body = await updated.json();
  assert.equal(body.trackingUrl, trackingUrl);
  assert.equal(body.qrCode.short_code, qrCode.short_code);
  assert.equal(body.qrCode.destination_url, "https://example.test/second?ref=qr");

  const second = await fetch(trackingUrl, { redirect: "manual" });
  assert.equal(second.headers.get("location"), "https://example.test/second?ref=qr");
  const reopened = await (await request(`/api/qr-codes/${qrCode.id}`, { cookie: owner })).json();
  assert.equal(reopened.qrCode.total_scans, 2);

  const history = await request(`/api/qr-codes/${qrCode.id}/destinations`, { cookie: owner });
  assert.equal(history.status, 200);
  assert.match(history.headers.get("cache-control"), /no-store/);
  const { changes } = await history.json();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].previous_url, "https://example.test/first");
  assert.equal(changes[0].new_url, "https://example.test/second?ref=qr");
  assert.equal((await request(`/api/qr-codes/${qrCode.id}/destinations`, { cookie: stranger })).status, 404);
  assert.equal((await request(`/api/qr-codes/${qrCode.id}/destinations`)).status, 401);

  const direct = await createManagedCode(owner, "Printed", "https://example.test/direct", false);
  assert.equal((await request(`/api/qr-codes/${direct.qrCode.id}`, {
    cookie: owner, method: "PATCH", body: { destination_url: "https://example.test/other" },
  })).status, 409);
});

// Synthetic scan history is seeded directly in the disposable test database; behaviour is read through HTTP.
async function withTestDatabase(callback) {
  const { default: pg } = await import("pg");
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname.startsWith("/qrconnect_test_"));
  const pool = new pg.Pool({ connectionString: url.toString(), max: 1 });
  try { return await callback(pool); } finally { await pool.end(); }
}
const utcDay = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const at = (offset, hour) => `${utcDay(offset)}T${String(hour).padStart(2, "0")}:15:00Z`;

test("bots and immediate repeats redirect without being counted", async () => {
  const owner = await register();
  const { qrCode, trackingUrl } = await createManagedCode(owner, "Counting rules", "https://example.test/count");
  const trusted = process.env.TEST_TRUSTED_PROXY_BASE_URL;
  assert.ok(trusted && new URL(trusted).hostname === "localhost");
  const trustedUrl = new URL(new URL(trackingUrl).pathname + new URL(trackingUrl).search, trusted);
  const scan = (agent, address) => fetch(trustedUrl, { redirect: "manual", headers: { "user-agent": agent, ...(address ? { "x-forwarded-for": address } : {}) } });
  const phone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Mobile/15E148 Safari/604.1";
  for (const response of [
    await scan("Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)", "203.0.113.5"),
    await scan("WhatsApp/2.23.20.0 A"),
    await scan(phone, "203.0.113.7"),
    await scan(phone, "203.0.113.7"),
    await scan(phone + " Chrome", "203.0.113.7"),
    await scan(phone, "203.0.113.8"),
  ]) {
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "https://example.test/count");
  }
  const record = await (await request(`/api/qr-codes/${qrCode.id}`, { cookie: owner })).json();
  assert.equal(record.qrCode.total_scans, 3);
  const today = utcDay(0);
  const analytics = await (await request(`/api/analytics?from=${today}&to=${today}&qr=${qrCode.id}`, { cookie: owner })).json();
  assert.deepEqual(analytics.summary, { scans: 3, uniqueScanners: 3, scansWithoutAddress: 0 });
});

test("consolidated analytics match seeded totals, filters, previous period and export", async () => {
  const owner = await register();
  const stranger = await register();
  const first = await createManagedCode(owner, '=HYPERLINK("http://evil.test")', "https://example.test/a");
  const second = await createManagedCode(owner, "Second", "https://example.test/b");
  const foreign = await createManagedCode(stranger, "Foreign", "https://example.test/foreign");
  await withTestDatabase(async (db) => {
    const insert = (qr, offset, hour, device, country, ip) => db.query(
      "INSERT INTO qrconnect.qr_scans (qr_code_id, scanned_at, device_type, os, browser, country, ip_address, user_agent) VALUES ($1, $2, $3, 'iOS', 'Safari', $4, $5, 'Synthetic phone')",
      [qr.qrCode.id, at(offset, hour), device, country, ip]);
    // Current period: the last 10 UTC days. First QR: 5 scans, second: 2.
    await insert(first, 0, 9, "mobile", "Brazil", "198.51.100.1");
    await insert(first, -1, 9, "mobile", "Brazil", "198.51.100.1");
    await insert(first, -3, 14, "mobile", "Brazil", "198.51.100.2");
    await insert(first, -5, 14, "desktop", "United States", null);
    await insert(first, -9, 23, "desktop", "United States", "198.51.100.3");
    await insert(second, -2, 9, "tablet", "Brazil", "198.51.100.1");
    await insert(second, -4, 9, "mobile", null, "198.51.100.4");
    // Previous period: the 10 days before. First QR: 3 scans.
    await insert(first, -10, 9, "mobile", "Brazil", "198.51.100.1");
    await insert(first, -15, 9, "mobile", "Brazil", "198.51.100.9");
    await insert(first, -19, 9, "desktop", "Brazil", null);
    // Outside both periods and from another account.
    await insert(first, -40, 9, "mobile", "Brazil", "198.51.100.1");
    await insert(foreign, 0, 9, "mobile", "Brazil", "198.51.100.1");
  });
  const range = `from=${utcDay(-9)}&to=${utcDay(0)}`;
  const read = async (query, cookie = owner) => {
    const response = await request(`/api/analytics?${query}`, { cookie });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    return response.json();
  };
  const all = await read(range);
  assert.deepEqual(all.previous, { from: utcDay(-19), to: utcDay(-10) });
  // Unique scanners are distinct address + browser pairs: .1, .2, .3 for the first QR and .1, .4 for the second share one pair.
  assert.deepEqual(all.summary, { scans: 7, uniqueScanners: 4, scansWithoutAddress: 1 });
  assert.deepEqual(all.previousSummary, { scans: 3, uniqueScanners: 2, scansWithoutAddress: 1 });
  assert.equal(all.series.length, 10);
  assert.equal(all.series.reduce((sum, day) => sum + day.scans, 0), 7);
  assert.equal(all.series.reduce((sum, day) => sum + day.previous, 0), 3);
  assert.deepEqual(all.series.at(-1), { day: utcDay(0), scans: 1, previous: 1 });
  assert.deepEqual(all.byQr.map((row) => [row.id, row.scans]), [[first.qrCode.id, 5], [second.qrCode.id, 2]]);
  assert.deepEqual(all.byDevice, { mobile: 4, desktop: 2, tablet: 1 });
  assert.deepEqual(all.byCountry, { Brazil: 4, "United States": 2, Unknown: 1 });
  assert.equal(all.byHour[9], 4);
  assert.equal(all.byHour[14], 2);
  assert.equal(all.byHour[23], 1);
  assert.ok(!all.codes.some((code) => code.id === foreign.qrCode.id));

  const one = await read(`${range}&qr=${first.qrCode.id}`);
  assert.equal(one.summary.scans, 5);
  assert.equal(one.previousSummary.scans, 3);
  assert.equal((await read(`${range}&device=mobile`)).summary.scans, 4);
  assert.equal((await read(`${range}&country=United%20States`)).summary.scans, 2);
  assert.equal((await read(`${range}&device=desktop&country=Brazil`)).summary.scans, 0);

  const isolated = await read(`${range}&qr=${first.qrCode.id}`, stranger);
  assert.equal(isolated.summary.scans, 0);
  assert.equal((await read(range, stranger)).summary.scans, 1);
  assert.equal((await request(`/api/analytics?${range}`)).status, 401);
  assert.equal((await request(`/api/analytics/export?${range}`)).status, 401);

  const exported = await request(`/api/analytics/export?${range}`, { cookie: owner });
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-type"), /text\/csv/);
  assert.match(exported.headers.get("content-disposition"), /attachment; filename="qrconnect-scans-/);
  const lines = (await exported.text()).replace(/^﻿/, "").trim().split("\r\n");
  assert.equal(lines[0], "date_utc,qr_name,short_code,scans,unique_scanners,scans_without_address");
  assert.equal(lines.length - 1, 7);
  assert.equal(lines.slice(1).reduce((sum, line) => sum + Number(line.split(",").at(-3)), 0), 7);
  assert.ok(lines.some((line) => line.includes(`"'=HYPERLINK(""http://evil.test"")"`)));
  assert.ok(!lines.some((line) => line.includes(foreign.qrCode.short_code)));

  const page = await request(`/analytics?${range}`, { cookie: owner });
  assert.equal(page.status, 200);
  assert.equal((await request("/analytics")).status, 307);
});

test("lifecycle states classify tracked codes and filter the list", async () => {
  const owner = await register();
  const stranger = await register();
  const make = (title) => createManagedCode(owner, title, "https://example.test/" + title);
  const [, steady, declining, quiet, paused] = await Promise.all(["fresh", "steady", "declining", "quiet", "paused"].map(make));
  await createManagedCode(owner, "direct", "https://example.test/direct", false);
  await createManagedCode(stranger, "foreign declining", "https://example.test/foreign");
  await withTestDatabase(async (db) => {
    const old = new Date(Date.now() - 40 * 86400000).toISOString();
    for (const qr of [steady, declining, quiet, paused])
      await db.query("UPDATE qrconnect.qr_codes SET created_at = $2 WHERE id = $1", [qr.qrCode.id, old]);
    const scan = (qr, daysAgo) => db.query("INSERT INTO qrconnect.qr_scans (qr_code_id, scanned_at) VALUES ($1, now() - make_interval(days => $2))", [qr.qrCode.id, daysAgo]);
    await scan(steady, 2);
    for (let index = 0; index < 5; index++) await scan(declining, 20);
    await scan(declining, 3);
    await scan(quiet, 35);
  });
  assert.equal((await request(`/api/qr-codes/${paused.qrCode.id}`, { cookie: owner, method: "PATCH", body: { is_active: false } })).status, 200);
  const list = async (state) => (await (await request(`/api/qr-codes?lifecycle=${state}`, { cookie: owner })).json()).qrCodes.map((qr) => qr.title);
  assert.deepEqual(await list("new"), ["fresh"]);
  assert.deepEqual(await list("active"), ["steady"]);
  assert.deepEqual(await list("declining"), ["declining"]);
  assert.deepEqual(await list("no_scans"), ["quiet"]);
  assert.deepEqual(await list("paused"), ["paused"]);
  const overview = await (await request("/overview", { cookie: owner })).text();
  for (const [label, count] of [["New", 1], ["Active", 1], ["Declining", 1], ["No scans", 1], ["Paused", 1], ["Direct QR Codes", 1]])
    assert.match(overview, new RegExp(`>${label}<!-- --> \\(<!-- -->${count}<!-- -->\\)`), label);
});

async function outboxMessage(to, kind) {
  const { readdir, readFile } = await import("node:fs/promises");
  const directory = process.env.TEST_EMAIL_OUTBOX_DIR;
  assert.ok(directory, "The API runner must configure the local email outbox.");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    for (const name of (await readdir(directory).catch(() => [])).sort()) {
      const message = JSON.parse(await readFile(`${directory}/${name}`, "utf8"));
      if (message.to === to && message.kind === kind) return message;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}
const cookieOf = (response) => response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");

test("private pages send anonymous visitors to sign in with a safe return address", async () => {
  const cases = [["/overview", "/overview"], ["/analytics?qr=abc&preset=7", "/analytics?qr=abc&preset=7"], ["/app?edit=123", "/app?edit=123"]];
  for (const [path, next] of cases) {
    const response = await request(path);
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location"), base);
    assert.equal(location.pathname, "/auth");
    assert.equal(location.searchParams.get("next"), next);
  }
  for (const path of ["/auth", "/auth?mode=signup", "/auth/forgot-password", "/auth/reset-password?token=bogus-token-1234"]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("x-robots-tag") ?? (await response.text()), /noindex/i, path);
  }
  const robots = await (await request("/robots.txt")).text();
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/my-qrcodes/);
  const sitemap = await (await request("/sitemap.xml")).text();
  assert.match(sitemap, /<loc>http:\/\/localhost:\d+\/<\/loc>/);
  assert.doesNotMatch(sitemap, /overview|my-qrcodes|auth/);
});

test("sign-up sends a bilingual confirmation link that verifies the address", async () => {
  const profile = account();
  const signUp = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: { ...profile, callbackURL: "/auth?verified=1&next=%2Foverview" },
  });
  assert.equal(signUp.status, 200);
  const cookie = cookieOf(signUp);
  assert.equal((await (await request("/api/auth/get-session", { cookie })).json()).user.emailVerified, false);
  const message = await outboxMessage(profile.email, "verify-email");
  assert.ok(message, "verification email");
  assert.match(message.text, /Confirm the email address/);
  assert.match(message.text, /أكّد عنوان البريد/);
  const link = new URL(message.url);
  assert.equal(link.origin, base);
  const verify = await request(link.pathname + link.search);
  assert.equal(verify.status, 302);
  const landing = new URL(verify.headers.get("location"), base);
  assert.equal(landing.pathname, "/auth");
  assert.equal(landing.searchParams.get("verified"), "1");
  assert.equal(landing.searchParams.get("error"), null);
  assert.equal((await (await request("/api/auth/get-session", { cookie })).json()).user.emailVerified, true);
  const reused = await request(link.pathname + "?token=not-a-valid-token&callbackURL=%2Fauth%3Fverified%3D1");
  assert.match(new URL(reused.headers.get("location"), base).searchParams.get("error") ?? "", /token/i);
});

test("password reset is single-use, signs out other sessions and never reveals unknown accounts", async () => {
  const profile = account();
  const signUp = await request("/api/auth/sign-up/email", { method: "POST", body: profile });
  const oldCookie = cookieOf(signUp);
  const unknown = await request("/api/auth/request-password-reset", {
    method: "POST",
    body: { email: `nobody-${randomUUID()}@example.test`, redirectTo: "/auth/reset-password" },
  });
  const known = await request("/api/auth/request-password-reset", {
    method: "POST",
    body: { email: profile.email, redirectTo: "/auth/reset-password" },
  });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  assert.deepEqual(await unknown.json(), await known.json());
  const foreign = await request("/api/auth/request-password-reset", {
    method: "POST",
    body: { email: profile.email, redirectTo: "https://evil.example/steal" },
  });
  assert.equal(foreign.status, 403);
  const message = await outboxMessage(profile.email, "reset-password");
  assert.ok(message, "reset email");
  assert.match(message.text, /reset the password/);
  assert.match(message.html, /dir="rtl"/);
  const link = new URL(message.url);
  const callback = await request(link.pathname + link.search);
  assert.equal(callback.status, 302);
  const page = new URL(callback.headers.get("location"), base);
  assert.equal(page.pathname, "/auth/reset-password");
  const token = page.searchParams.get("token");
  assert.ok(token);
  const shortPassword = await request("/api/auth/reset-password", { method: "POST", body: { newPassword: "short", token } });
  assert.equal(shortPassword.status, 400);
  const newPassword = randomUUID();
  const reset = await request("/api/auth/reset-password", { method: "POST", body: { newPassword, token } });
  assert.equal(reset.status, 200);
  assert.equal(await (await request("/api/auth/get-session", { cookie: oldCookie })).json(), null, "old session revoked");
  const reuse = await request("/api/auth/reset-password", { method: "POST", body: { newPassword: randomUUID(), token } });
  assert.equal(reuse.status, 400);
  assert.equal((await request("/api/auth/sign-in/email", { method: "POST", body: profile })).status, 401);
  const signIn = await request("/api/auth/sign-in/email", { method: "POST", body: { email: profile.email, password: newPassword } });
  assert.equal(signIn.status, 200);
  const expired = await request(link.pathname + link.search);
  assert.equal(new URL(expired.headers.get("location"), base).searchParams.get("error"), "INVALID_TOKEN");
});

test("account email is capped per account without changing the public answer", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const profile = account();
  await request("/api/auth/sign-up/email", { method: "POST", body: profile });
  const answers = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await request("/api/auth/request-password-reset", {
      method: "POST",
      body: { email: profile.email, redirectTo: "/auth/reset-password" },
    });
    assert.equal(response.status, 200);
    answers.push(JSON.stringify(await response.json()));
  }
  assert.equal(new Set(answers).size, 1);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const directory = process.env.TEST_EMAIL_OUTBOX_DIR;
  let sent = 0;
  for (const name of await readdir(directory)) {
    const message = JSON.parse(await readFile(`${directory}/${name}`, "utf8"));
    if (message.to === profile.email && message.kind === "reset-password") sent++;
  }
  assert.equal(sent, 3);
});

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
async function uploadFile(cookie, bytes, name, extra = {}) {
  const form = new FormData();
  form.set("file", new Blob([bytes]), name);
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return fetch(new URL("/api/assets", base), { method: "POST", redirect: "manual", headers: { origin: base, cookie }, body: form });
}

test("asset uploads keep the detected type, serve safely and stay private to the account", async () => {
  const owner = await register();
  const other = await register();
  const upload = await uploadFile(owner, tinyPng, "logo.png");
  assert.equal(upload.status, 201);
  const { asset } = await upload.json();
  assert.equal(asset.kind, "image");
  assert.equal(asset.mime_type, "image/png");
  assert.deepEqual([asset.width, asset.height, asset.size_bytes], [1, 1, tinyPng.length]);
  const pdf = await (await uploadFile(owner, Buffer.from("%PDF-1.4\n%%EOF\n"), "menu.txt")).json();
  assert.equal(pdf.asset.mime_type, "application/pdf");
  assert.equal(pdf.asset.name, "menu.txt");

  const file = await request(`/api/assets/${asset.id}/file`, { cookie: owner });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "image/png");
  assert.equal(file.headers.get("x-content-type-options"), "nosniff");
  assert.match(file.headers.get("content-security-policy"), /sandbox/);
  assert.match(file.headers.get("cache-control"), /no-store/);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), tinyPng);
  assert.match((await request(`/api/assets/${pdf.asset.id}/file?download=1`, { cookie: owner })).headers.get("content-disposition"), /^attachment/);

  const list = await (await request("/api/assets", { cookie: owner })).json();
  assert.equal(list.total, 2);
  assert.equal(list.usage.bytes, tinyPng.length + pdf.asset.size_bytes);
  assert.equal((await (await request("/api/assets?kind=document", { cookie: owner })).json()).items[0].id, pdf.asset.id);

  assert.equal((await (await request("/api/assets", { cookie: other })).json()).total, 0);
  assert.equal((await request(`/api/assets/${asset.id}/file`, { cookie: other })).status, 404);
  assert.equal((await request(`/api/assets/${asset.id}`, { method: "PATCH", cookie: other, body: { name: "stolen" } })).status, 404);
  assert.equal((await request(`/api/assets/${asset.id}`, { method: "DELETE", cookie: other })).status, 404);
  assert.equal((await request(`/api/assets/${asset.id}/file`)).status, 401);
  const foreignOrigin = await fetch(new URL("/api/assets", base), { method: "POST", headers: { origin: "https://evil.example", cookie: owner }, body: new FormData() });
  assert.equal(foreignOrigin.status, 403);
});

test("asset uploads reject disguised, empty, oversized and over-quota files", async () => {
  const cookie = await register();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  assert.equal((await uploadFile(cookie, svg, "logo.svg")).status, 415);
  assert.equal((await uploadFile(cookie, Buffer.from("plain text pretending"), "photo.png")).status, 415);
  assert.equal((await uploadFile(cookie, Buffer.alloc(0), "empty.png")).status, 400);
  const big = Buffer.concat([tinyPng, Buffer.alloc(4 * 1024 * 1024)]);
  assert.equal((await uploadFile(cookie, big, "big.png")).status, 413);
  const chunk = Buffer.concat([tinyPng, Buffer.alloc(4 * 1024 * 1024 - tinyPng.length)]);
  for (let index = 0; index < 12; index++) assert.equal((await uploadFile(cookie, chunk, `chunk-${index}.png`)).status, 201);
  const full = await uploadFile(cookie, chunk, "one-more.png");
  assert.equal(full.status, 409);
  assert.match((await full.json()).error, /space/);
  const usage = (await (await request("/api/assets", { cookie })).json()).usage;
  assert.equal(usage.bytes, 12 * chunk.length);
});

test("asset folders, renaming, search and QR logo reuse are scoped to the account", async () => {
  const owner = await register();
  const other = await register();
  const { asset } = await (await uploadFile(owner, tinyPng, "Brand mark.png")).json();
  const { asset: pdf } = await (await uploadFile(owner, Buffer.from("%PDF-1.4\n"), "Menu.pdf")).json();
  const created = await request("/api/asset-folders", { method: "POST", cookie: owner, body: { action: "create", name: "Logos" } });
  assert.equal(created.status, 200);
  const folder = (await created.json()).folders[0];
  assert.equal((await request("/api/asset-folders", { method: "POST", cookie: owner, body: { action: "create", name: "Logos" } })).status, 409);
  const otherFolder = (await (await request("/api/asset-folders", { method: "POST", cookie: other, body: { action: "create", name: "Mine" } })).json()).folders[0];
  assert.equal((await request(`/api/assets/${asset.id}`, { method: "PATCH", cookie: owner, body: { folder_id: otherFolder.id } })).status, 404);
  const moved = await request(`/api/assets/${asset.id}`, { method: "PATCH", cookie: owner, body: { folder_id: folder.id, name: "  Logo principal / v2 " } });
  assert.equal(moved.status, 200);
  assert.equal((await moved.json()).asset.name, "Logo principal  v2");
  const inFolder = await (await request(`/api/assets?folder=${folder.id}`, { cookie: owner })).json();
  assert.deepEqual(inFolder.items.map((item) => item.id), [asset.id]);
  assert.equal(inFolder.folders[0].files, 1);
  assert.deepEqual((await (await request("/api/assets?q=principal", { cookie: owner })).json()).items.map((item) => item.id), [asset.id]);
  assert.equal((await (await request("/api/assets?q=%25", { cookie: owner })).json()).total, 0);

  const design = { ...savedDesign, logoId: null, logoAssetId: asset.id };
  const qr = await request("/api/qr-codes", { method: "POST", cookie: owner, body: { title: "With library logo", destination_url: "https://example.test/", design } });
  assert.equal(qr.status, 201);
  const qrId = (await qr.json()).qrCode.id;
  for (const [cookie, logoAssetId] of [[other, asset.id], [owner, pdf.id], [owner, randomUUID()]]) {
    const refused = await request("/api/qr-codes", { method: "POST", cookie, body: { title: "x", destination_url: "https://example.test/", design: { ...design, logoAssetId } } });
    assert.equal(refused.status, 400);
  }
  assert.equal((await (await request(`/api/assets?folder=${folder.id}`, { cookie: owner })).json()).items[0].qr_uses, 1);

  await request("/api/asset-folders", { method: "POST", cookie: owner, body: { action: "delete", id: folder.id } });
  const afterFolder = await (await request("/api/assets?folder=none", { cookie: owner })).json();
  assert.equal(afterFolder.total, 2);
  assert.equal(afterFolder.folders.length, 0);

  const removed = await request(`/api/assets/${asset.id}`, { method: "DELETE", cookie: owner });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).qr_codes_updated, 1);
  const saved = await (await request(`/api/qr-codes/${qrId}`, { cookie: owner })).json();
  assert.equal(saved.qrCode.design.logoAssetId, undefined);
  assert.equal(saved.qrCode.design.templateId, savedDesign.templateId);
  assert.equal((await request(`/api/assets/${asset.id}/file`, { cookie: owner })).status, 404);
});

test("asset downloads use safe file names and PDFs stay viewable", async () => {
  const cookie = await register();
  const { asset } = await (await uploadFile(cookie, Buffer.from("%PDF-1.4\n"), "menu'(v2)‮.html")).json();
  assert.equal(asset.name, "menu'(v2).html");
  const file = await request(`/api/assets/${asset.id}/file?download=1`, { cookie });
  const disposition = file.headers.get("content-disposition");
  assert.match(disposition, /^attachment; filename="file\.pdf"; filename\*=UTF-8''menu%27%28v2%29\.html$/);
  assert.doesNotMatch(file.headers.get("content-security-policy"), /sandbox/);
  assert.equal(file.headers.get("content-type"), "application/pdf");
});

async function newLinkpage(cookie, template = "business") {
  const response = await request("/api/linkpages", { method: "POST", cookie, body: { template, creation_key: randomUUID() } });
  assert.equal(response.status, 201);
  return (await response.json()).linkpage;
}
const lpBlock = (extra) => ({ id: Math.random().toString(36).slice(2, 12).padEnd(10, "0"), ...extra });
const formulaLabel = '=HYPERLINK("x")';

test("linkpage drafts are created once per key, stay private and publish to a stable public address", async () => {
  const owner = await register();
  const other = await register();
  const key = randomUUID();
  const first = await request("/api/linkpages", { method: "POST", cookie: owner, body: { template: "blank", creation_key: key } });
  const again = await request("/api/linkpages", { method: "POST", cookie: owner, body: { template: "blank", creation_key: key } });
  assert.equal(first.status, 201);
  assert.equal(again.status, 200);
  const page = (await first.json()).linkpage;
  assert.equal((await again.json()).linkpage.id, page.id);
  assert.equal((await (await request("/api/linkpages", { cookie: owner })).json()).linkpages.length, 1);
  assert.equal((await request("/api/linkpages", { method: "POST", cookie: owner, body: { template: "nope", creation_key: randomUUID() } })).status, 400);

  const draft = { ...page.draft, profile: { ...page.draft.profile, name: "Café Lisboa" },
    blocks: [lpBlock({ type: "link", label: "Menu", url: "https://example.test/menu" }), lpBlock({ type: "phone", label: "Call", phone: "+351 210 000 000" })] };
  const unsafe = { ...draft, blocks: [lpBlock({ type: "link", label: "x", url: "javascript:alert(1)" })] };
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: unsafe } })).status, 400);
  const saved = await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft, title: "Lisboa internal" } });
  assert.equal(saved.status, 200);
  const slug = `cafe-${randomUUID().slice(0, 8)}`;
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: "api" } })).status, 400);
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug } })).status, 200);
  const taken = await newLinkpage(other);
  assert.equal((await request(`/api/linkpages/${taken.id}`, { method: "PATCH", cookie: other, body: { slug } })).status, 409);

  assert.equal((await request(`/p/${slug}`)).status, 404, "draft is private");
  const foreignCalls = [["GET", ""], ["PATCH", "", { title: "x" }], ["DELETE", ""], ["POST", "/publish", { publish: true }], ["POST", "/qr"], ["GET", "/analytics"]];
  for (const [method, path, body] of foreignCalls) {
    assert.equal((await request(`/api/linkpages/${page.id}${path}`, { method, cookie: other, body })).status, 404, `${method} ${path}`);
  }
  const published = await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  assert.equal(published.status, 200);
  const html = await (await request(`/p/${slug}`)).text();
  assert.match(html, /Café Lisboa/);
  assert.doesNotMatch(html, /Lisboa internal/, "internal name is not public");
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: `${slug}-x` } })).status, 409);

  const later = { ...draft, profile: { ...draft.profile, name: "Draft only name" } };
  await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: later } });
  assert.doesNotMatch(await (await request(`/p/${slug}`)).text(), /Draft only name/, "draft edits wait for publish");
  assert.equal((await (await request(`/api/linkpages/${page.id}`, { cookie: owner })).json()).linkpage.has_unpublished_changes, true);

  const qr = await request(`/api/linkpages/${page.id}/qr`, { method: "POST", cookie: owner });
  assert.equal(qr.status, 201);
  const qrId = (await qr.json()).qr_code_id;
  const qrAgain = await request(`/api/linkpages/${page.id}/qr`, { method: "POST", cookie: owner });
  assert.equal((await qrAgain.json()).qr_code_id, qrId);
  const qrRecord = (await (await request(`/api/qr-codes/${qrId}`, { cookie: owner })).json()).qrCode;
  assert.equal(qrRecord.destination_url, `${base}/p/${slug}`);
  const scan = await request(`/qr?code=${qrRecord.short_code}`);
  assert.equal(scan.status, 302);
  assert.equal(scan.headers.get("location"), `${base}/p/${slug}`);

  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: false } });
  assert.equal((await request(`/p/${slug}`)).status, 404);
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  assert.match(await (await request(`/p/${slug}`)).text(), /Draft only name/);
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "DELETE", cookie: owner })).status, 200);
  assert.equal((await request(`/p/${slug}`)).status, 404);
});

test("linkpage views and clicks are counted once, without bots, and match analytics and export", async () => {
  const owner = await register();
  const page = await newLinkpage(owner, "blank");
  const link = lpBlock({ type: "link", label: formulaLabel, url: "https://example.test/menu" });
  const phone = lpBlock({ type: "phone", label: "Call", phone: "+351 210 000 000" });
  const draft = { ...page.draft, profile: { ...page.draft.profile, name: "Counted" }, blocks: [link, phone] };
  await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft } });
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const slug = page.slug;
  const browser = { origin: base, "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1" };
  assert.equal((await request(`/p/${slug}/view`, { method: "POST", headers: browser })).status, 204);
  assert.equal((await request(`/p/${slug}/view`, { method: "POST", headers: browser })).status, 204);
  assert.equal((await request(`/p/${slug}/view`, { method: "POST", headers: { origin: base, "user-agent": "facebookexternalhit/1.1" } })).status, 204);
  assert.equal((await fetch(new URL(`/p/${slug}/view`, base), { method: "POST", headers: { origin: "https://evil.example" } })).status, 403);
  const click = await request(`/p/${slug}/go/${link.id}`, { headers: browser });
  assert.equal(click.status, 302);
  assert.equal(click.headers.get("location"), "https://example.test/menu");
  assert.equal((await request(`/p/${slug}/go/${phone.id}`, { headers: browser })).headers.get("location"), "tel:+351210000000");
  assert.equal((await request(`/p/${slug}/go/${"z".repeat(10)}`)).status, 404);
  await request(`/p/${slug}/go/${link.id}`, { headers: { "user-agent": "Slackbot-LinkExpanding 1.0" } });

  const today = new Date().toISOString().slice(0, 10);
  const data = await (await request(`/api/linkpages/${page.id}/analytics?from=${today}&to=${today}`, { cookie: owner })).json();
  assert.deepEqual([data.summary.views, data.summary.clicks], [2, 2]);
  assert.deepEqual(data.blocks.map((item) => [item.label, item.clicks]).sort(), [[formulaLabel, 1], ["Call", 1]].sort());
  assert.equal(data.devices.mobile, 2);
  assert.deepEqual(data.daily, [{ day: today, views: 2, clicks: 2 }]);
  const desktopOnly = await (await request(`/api/linkpages/${page.id}/analytics?from=${today}&to=${today}&device=desktop`, { cookie: owner })).json();
  assert.equal(desktopOnly.summary.views, 0);
  const csv = await (await request(`/api/linkpages/${page.id}/analytics/export?from=${today}&to=${today}`, { cookie: owner })).text();
  assert.ok(csv.includes(`${today},2,2`));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.equal((await (await request("/api/linkpages", { cookie: owner })).json()).linkpages[0].views_30d, 2);
});

test("linkpage images are public only when the published page uses them", async () => {
  const owner = await register();
  const other = await register();
  const { asset: avatar } = await (await uploadFile(owner, tinyPng, "avatar.png")).json();
  const { asset: privateFile } = await (await uploadFile(owner, tinyPng, "private.png")).json();
  const { asset: foreign } = await (await uploadFile(other, tinyPng, "foreign.png")).json();
  const page = await newLinkpage(owner, "blank");
  const draft = (avatarAssetId) => ({ ...page.draft, profile: { ...page.draft.profile, name: "Media", avatarAssetId } });
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: draft(foreign.id) } })).status, 400);
  await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: draft(avatar.id) } });
  assert.equal((await request(`/p/${page.slug}/media/${avatar.id}`)).status, 404, "unpublished");
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const media = await request(`/p/${page.slug}/media/${avatar.id}`);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");
  assert.match(media.headers.get("content-security-policy"), /sandbox/);
  assert.equal((await request(`/p/${page.slug}/media/${privateFile.id}`)).status, 404);
  assert.equal((await request(`/p/${page.slug}/media/${foreign.id}`)).status, 404);
  assert.ok((await (await request(`/p/${page.slug}`)).text()).includes(`/p/${page.slug}/media/${avatar.id}`));
});

test("linkpage addresses are never handed to another account and QR links survive renames and deletion", async () => {
  const owner = await register();
  const other = await register();
  const page = await newLinkpage(owner, "blank");
  const first = `first-${randomUUID().slice(0, 8)}`;
  const second = `second-${randomUUID().slice(0, 8)}`;
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: first } })).status, 200);
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: second } })).status, 200);
  const squatter = await newLinkpage(other, "blank");
  assert.equal((await request(`/api/linkpages/${squatter.id}`, { method: "PATCH", cookie: other, body: { slug: first } })).status, 409, "old address stays reserved");
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: first } })).status, 200, "owner may reuse it");

  const qr = await (await request(`/api/linkpages/${page.id}/qr`, { method: "POST", cookie: owner })).json();
  const renamed = await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { slug: second } });
  assert.equal(renamed.status, 409, "a QR code locks the address before publishing");

  const removed = await (await request(`/api/linkpages/${page.id}`, { method: "DELETE", cookie: owner })).json();
  assert.equal(removed.qr_code_deactivated, true);
  const code = (await (await request(`/api/qr-codes/${qr.qr_code_id}`, { cookie: owner })).json()).qrCode;
  assert.equal(code.is_active, false);
  assert.equal((await request(`/qr?code=${code.short_code}`)).status, 410);
  assert.equal((await request(`/api/linkpages/${squatter.id}`, { method: "PATCH", cookie: other, body: { slug: first } })).status, 409, "deleted address is not released");
});

test("embedded or cross-site requests do not count as linkpage views or clicks", async () => {
  const owner = await register();
  const page = await newLinkpage(owner, "blank");
  const link = lpBlock({ type: "link", label: "Go", url: "https://example.test/go" });
  await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: { ...page.draft, profile: { ...page.draft.profile, name: "Embeds" }, blocks: [link] } } });
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const embedded = await request(`/p/${page.slug}/go/${link.id}`, { headers: { "sec-fetch-dest": "image", "sec-fetch-site": "cross-site" } });
  assert.equal(embedded.status, 302, "still redirects");
  assert.equal((await request(`/p/${page.slug}/view`, { method: "POST", headers: { origin: base, "sec-fetch-site": "cross-site" } })).status, 204);
  const today = new Date().toISOString().slice(0, 10);
  const data = await (await request(`/api/linkpages/${page.id}/analytics?from=${today}&to=${today}`, { cookie: owner })).json();
  assert.deepEqual([data.summary.views, data.summary.clicks], [0, 0]);
  const tooBig = await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { title: "x".repeat(70 * 1024) } });
  assert.equal(tooBig.status, 413);
});

async function newCard(cookie, firstName = "Sara") {
  const response = await request("/api/cards", { method: "POST", cookie, body: { template: "classic", creation_key: randomUUID(), first_name: firstName } });
  assert.equal(response.status, 201);
  return (await response.json()).card;
}
const cardDraft = (card, extra = {}) => ({
  ...card.draft,
  person: { ...card.draft.person, firstName: "سارة", lastName: "Haddad", title: "Sales", company: "Example Co." },
  contact: { phones: [{ label: "mobile", number: "+966 50 000 0000" }], emails: [{ label: "work", address: "sara@example.com" }], website: "https://example.com/", address: "Riyadh" },
  links: [{ network: "linkedin", url: "https://linkedin.com/in/sara" }],
  exchange: { enabled: true, purpose: "I will send you our catalogue." },
  ...extra,
});

test("cards publish a public profile with vCard, counted actions and private drafts", async () => {
  const owner = await register();
  const other = await register();
  const key = randomUUID();
  const created = await request("/api/cards", { method: "POST", cookie: owner, body: { template: "ocean", creation_key: key, first_name: "Sara" } });
  const repeated = await request("/api/cards", { method: "POST", cookie: owner, body: { template: "ocean", creation_key: key, first_name: "Sara" } });
  assert.equal(created.status, 201);
  assert.equal(repeated.status, 200);
  const card = (await created.json()).card;
  assert.equal((await repeated.json()).card.id, card.id);
  assert.equal((await request(`/api/cards/${card.id}`, { method: "PATCH", cookie: owner, body: { draft: { ...cardDraft(card), contact: { ...cardDraft(card).contact, website: "javascript:x" } } } })).status, 400);
  assert.equal((await request(`/api/cards/${card.id}`, { method: "PATCH", cookie: owner, body: { draft: cardDraft(card) } })).status, 200);
  assert.equal((await request(`/c/${card.slug}`)).status, 404, "draft stays private");
  for (const [method, path, body] of [["GET", ""], ["PATCH", "", { title: "x" }], ["DELETE", ""], ["POST", "/publish", { publish: true }], ["POST", "/qr"], ["GET", "/analytics"]]) {
    assert.equal((await request(`/api/cards/${card.id}${path}`, { method, cookie: other, body })).status, 404, `${method} ${path}`);
  }
  assert.equal((await request(`/api/cards/${card.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } })).status, 200);
  const html = await (await request(`/c/${card.slug}`)).text();
  assert.match(html, /سارة/);
  assert.match(html, /Save contact/);

  const browser = { origin: base, "user-agent": "Mozilla/5.0 (Linux; Android 14) Mobile Chrome/131" };
  assert.equal((await request(`/c/${card.slug}/view`, { method: "POST", headers: browser })).status, 204);
  const vcard = await request(`/c/${card.slug}/vcard`, { headers: browser });
  assert.equal(vcard.status, 200);
  assert.match(vcard.headers.get("content-type"), /^text\/vcard; charset=utf-8/);
  assert.match(vcard.headers.get("content-disposition"), /attachment; filename=".+\.vcf"/);
  const vcardText = await vcard.text();
  assert.ok(vcardText.replace(/\r\n /g, "").includes("FN;CHARSET=UTF-8:سارة Haddad"));
  assert.ok(vcardText.includes(`URL;TYPE=CARD:${base}/c/${card.slug}`));
  const call = await request(`/c/${card.slug}/go/phone-0`, { headers: browser });
  assert.equal(call.status, 302);
  assert.equal(call.headers.get("location"), "tel:+966500000000");
  assert.equal((await request(`/c/${card.slug}/go/address`, { headers: browser })).headers.get("location"), "https://www.google.com/maps/search/?api=1&query=Riyadh");
  assert.equal((await request(`/c/${card.slug}/go/phone-9`, { headers: browser })).status, 404);
  await request(`/c/${card.slug}/vcard`, { headers: { "user-agent": "WhatsApp/2.23" } });

  const today = new Date().toISOString().slice(0, 10);
  const data = await (await request(`/api/cards/${card.id}/analytics?from=${today}&to=${today}`, { cookie: owner })).json();
  assert.deepEqual([data.summary.views, data.summary.saves, data.summary.actions], [1, 1, 2]);
  assert.deepEqual(data.actions.map((item) => [item.target, item.total]).sort(), [["address", 1], ["phone-0", 1]]);
  const csv = await (await request(`/api/cards/${card.id}/analytics/export?from=${today}&to=${today}`, { cookie: owner })).text();
  assert.ok(csv.includes(`${today},1,1,2,0`));

  const later = cardDraft(card, { person: { ...cardDraft(card).person, title: "Director" } });
  await request(`/api/cards/${card.id}`, { method: "PATCH", cookie: owner, body: { draft: later } });
  assert.doesNotMatch(await (await request(`/c/${card.slug}`)).text(), /Director/);
  await request(`/api/cards/${card.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  assert.match(await (await request(`/c/${card.slug}`)).text(), /Director/, "same address shows the new version");
  const qr = await (await request(`/api/cards/${card.id}/qr`, { method: "POST", cookie: owner })).json();
  const code = (await (await request(`/api/qr-codes/${qr.qr_code_id}`, { cookie: owner })).json()).qrCode;
  assert.equal(code.destination_url, `${base}/c/${card.slug}`);
  const removed = await (await request(`/api/cards/${card.id}`, { method: "DELETE", cookie: owner })).json();
  assert.equal(removed.qr_code_deactivated, true);
  assert.equal((await request(`/c/${card.slug}`)).status, 404);
});

test("contact exchange stores consent, rejects abuse and stays private to the card owner", async () => {
  const owner = await register();
  const other = await register();
  const card = await newCard(owner);
  await request(`/api/cards/${card.id}`, { method: "PATCH", cookie: owner, body: { draft: cardDraft(card) } });
  await request(`/api/cards/${card.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const send = (body, headers = {}) => request(`/c/${card.slug}/contact`, { method: "POST", body, headers: { origin: base, "content-type": "application/json", ...headers } });
  assert.equal((await send({ name: "Ana", email: "ana@example.com", consent: false })).status, 400);
  assert.equal((await send({ name: "Ana", consent: true })).status, 400, "needs a way to reply");
  assert.equal((await fetch(new URL(`/c/${card.slug}/contact`, base), { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ name: "x", email: "x@example.com", consent: true }) })).status, 403);
  assert.equal((await send({ name: "Bot", email: "bot@example.com", consent: true, website: "spam" })).status, 201, "honeypot looks accepted");
  const formula = "=HYPERLINK(\"https://evil.example\")";
  assert.equal((await send({ name: formula, email: "ana@example.com", phone: "", company: "Acme", message: "Olá", consent: true })).status, 201);
  const list = await (await request("/api/cards/contacts", { cookie: owner })).json();
  assert.equal(list.contacts.length, 1, "honeypot submission was not stored");
  assert.equal(list.contacts[0].consent_text, "I will send you our catalogue.");
  assert.equal(list.contacts[0].card_id, card.id);
  assert.equal((await (await request("/api/cards/contacts", { cookie: other })).json()).contacts.length, 0);
  assert.equal((await request(`/api/cards/contacts/${list.contacts[0].id}`, { method: "DELETE", cookie: other })).status, 404);
  const csv = await (await request("/api/cards/contacts?format=csv", { cookie: owner })).text();
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.equal((await (await request("/api/cards/contacts?q=acme", { cookie: owner })).json()).contacts.length, 1);
  for (let index = 0; index < 20; index++) await send({ name: `Flood ${index}`, email: `f${index}@example.com`, consent: true });
  assert.equal((await send({ name: "Too many", email: "late@example.com", consent: true })).status, 429);
  assert.equal((await request(`/api/cards/contacts/${list.contacts[0].id}`, { method: "DELETE", cookie: owner })).status, 200);
  const disabled = cardDraft(card, { exchange: { enabled: false, purpose: "" } });
  await request(`/api/cards/${card.id}`, { method: "PATCH", cookie: owner, body: { draft: disabled } });
  await request(`/api/cards/${card.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  assert.equal((await send({ name: "Ana", email: "ana@example.com", consent: true })).status, 404);
});

async function newForm(cookie, template = "contact") {
  const response = await request("/api/forms", { method: "POST", cookie, body: { template, creation_key: randomUUID() } });
  assert.equal(response.status, 201);
  return (await response.json()).form;
}
const formTokens = new Map();
/** The public page renders a signed token that must be at least two seconds old when answers are sent. */
async function formToken(slug) {
  if (!formTokens.has(slug)) {
    const html = await (await request(`/f/${slug}`)).text();
    const token = html.match(/\\?"token\\?":\\?"(\d+\.[A-Za-z0-9_-]+)\\?"/)?.[1];
    assert.ok(token, "form page renders a submission token");
    formTokens.set(slug, token);
    await new Promise((resolve) => setTimeout(resolve, 2100));
  }
  return formTokens.get(slug);
}
const submit = async (slug, body, headers = {}) => request(`/f/${slug}/submit`, { method: "POST", body: { form_token: await formToken(slug).catch(() => undefined), ...body }, headers: { origin: base, "content-type": "application/json", ...headers } });

test("forms publish, accept valid answers without an account and stay private to the owner", async () => {
  const owner = await register();
  const other = await register();
  const key = randomUUID();
  const first = await request("/api/forms", { method: "POST", cookie: owner, body: { template: "contact", creation_key: key } });
  const again = await request("/api/forms", { method: "POST", cookie: owner, body: { template: "contact", creation_key: key } });
  assert.equal(first.status, 201);
  assert.equal(again.status, 200);
  const form = (await first.json()).form;
  const [name, email, phone, message] = form.draft.fields;
  assert.equal((await request(`/f/${form.slug}/submit`, { method: "POST", body: { answers: {} } })).status, 404, "drafts do not accept answers");
  for (const [method, path, body] of [["GET", ""], ["PATCH", "", { title: "x" }], ["DELETE", ""], ["POST", "/publish", { publish: true }], ["POST", "/qr"], ["GET", "/responses"]]) {
    assert.equal((await request(`/api/forms/${form.id}${path}`, { method, cookie: other, body })).status, 404, `${method} ${path}`);
  }
  assert.equal((await request(`/api/forms/${form.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } })).status, 200);
  assert.match(await (await request(`/f/${form.slug}`)).text(), /Contact us/);

  const html = await (await request(`/f/${form.slug}`)).text();
  const fresh = html.match(/\\?"token\\?":\\?"(\d+\.[A-Za-z0-9_-]+)\\?"/)?.[1];
  const tooFast = await request(`/f/${form.slug}/submit`, { method: "POST", body: { form_token: fresh, answers: { [name.id]: "Ana", [email.id]: "ana@example.com", [message.id]: "Hi" }, consent: true } });
  assert.equal(tooFast.status, 400, "a page loaded less than two seconds ago cannot submit");
  assert.equal((await request(`/f/${form.slug}/submit`, { method: "POST", body: { form_token: "1.forged", answers: {} } })).status, 400);
  const invalid = await submit(form.slug, { answers: { [name.id]: "", [email.id]: "nope" }, consent: true });
  assert.equal(invalid.status, 400);
  const fields = (await invalid.json()).fields;
  assert.deepEqual(Object.keys(fields).sort(), [name.id, email.id, message.id].sort());
  const noConsent = await submit(form.slug, { answers: { [name.id]: "Ana", [email.id]: "ana@example.com", [message.id]: "Hi" } });
  assert.equal(noConsent.status, 400);
  assert.ok((await noConsent.json()).fields.consent);
  assert.equal((await fetch(new URL(`/f/${form.slug}/submit`, base), { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" })).status, 403);
  assert.equal((await submit(form.slug, { answers: { [name.id]: "Bot", [email.id]: "bot@example.com", [message.id]: "x" }, consent: true, company_website: "spam" })).status, 201);
  const formula = "=HYPERLINK(\"https://evil.example\")";
  const accepted = await submit(form.slug, { answers: { [name.id]: formula, [email.id]: "ana@example.com", [phone.id]: "+55 11 5555 0000", [message.id]: "Olá\nmundo", unknown: "dropped" }, consent: true });
  assert.equal(accepted.status, 201);

  const list = await (await request(`/api/forms/${form.id}/responses`, { cookie: owner })).json();
  assert.equal(list.total, 1, "honeypot answer was not stored");
  assert.deepEqual(Object.keys(list.responses[0].answers).sort(), [name.id, email.id, phone.id, message.id].sort());
  assert.equal(list.responses[0].consent_text, "I agree to be contacted about my message.");
  assert.equal((await (await request(`/api/forms/${form.id}/responses`, { cookie: other })).status), 404);
  const csv = await (await request(`/api/forms/${form.id}/responses?format=csv`, { cookie: owner })).text();
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"Olá\nmundo"'));

  const edited = { ...form.draft, fields: [name, email, { ...message, label: "Your message" }] };
  await request(`/api/forms/${form.id}`, { method: "PATCH", cookie: owner, body: { draft: edited } });
  await request(`/api/forms/${form.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const after = await (await request(`/api/forms/${form.id}/responses?format=csv`, { cookie: owner })).text();
  assert.ok(after.split("\r\n")[0].includes("Your message (edited)"), "answers given to the old wording are flagged");
  assert.ok(after.split("\r\n")[0].includes("Phone (removed)"), "answers to removed questions stay exportable");

  assert.equal((await request(`/api/forms/${form.id}/responses/${list.responses[0].id}`, { method: "DELETE", cookie: other })).status, 404);
  await request(`/api/forms/${form.id}`, { method: "PATCH", cookie: owner, body: { accepting_responses: false } });
  assert.equal((await submit(form.slug, { answers: { [name.id]: "Late", [email.id]: "late@example.com", [message.id]: "x" }, consent: true })).status, 410);
  assert.match(await (await request(`/f/${form.slug}`)).text(), /not accepting answers/);
  assert.equal((await request(`/api/forms/${form.id}/responses/${list.responses[0].id}`, { method: "DELETE", cookie: owner })).status, 200);
  const qr = await (await request(`/api/forms/${form.id}/qr`, { method: "POST", cookie: owner })).json();
  assert.equal((await (await request(`/api/qr-codes/${qr.qr_code_id}`, { cookie: owner })).json()).qrCode.destination_url, `${base}/f/${form.slug}`);
  assert.equal((await (await request(`/api/forms/${form.id}`, { method: "DELETE", cookie: owner })).json()).qr_code_deactivated, true);
  assert.equal((await request(`/f/${form.slug}`)).status, 404);
});

test("form submissions are rate limited and size limited", async () => {
  const owner = await register();
  const form = await newForm(owner, "blank");
  await request(`/api/forms/${form.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const [answer] = form.draft.fields;
  const big = await submit(form.slug, { answers: { [answer.id]: "x".repeat(40 * 1024) } });
  assert.equal(big.status, 413);
  for (let index = 0; index < 30; index++) assert.equal((await submit(form.slug, { answers: { [answer.id]: `A ${index}` } })).status, 201);
  assert.equal((await submit(form.slug, { answers: { [answer.id]: "one more" } })).status, 429);
  const browser = { origin: base, "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/131" };
  assert.equal((await request(`/f/${form.slug}/view`, { method: "POST", headers: browser })).status, 204);
  const data = await (await request(`/api/forms/${form.id}/responses`, { cookie: owner })).json();
  assert.equal(data.total, 30);
  assert.equal(data.stats.views, 1);
  assert.equal(data.stats.submits, 30);
  assert.equal(data.responses.length, 30);
});

async function person() {
  const profile = account();
  const response = await request("/api/auth/sign-up/email", { method: "POST", body: profile });
  assert.equal(response.status, 200);
  // With email delivery on, invitations need a confirmed address; confirm it through the local outbox.
  const message = await outboxMessage(profile.email, "verify-email");
  const link = new URL(message.url);
  await request(link.pathname + link.search);
  return { email: profile.email, session: cookieOf(response), cookie: cookieOf(response) };
}
/** Switches the active workspace; the workspace cookie is added to the session cookie. */
async function useWorkspace(member, workspaceId) {
  const response = await request("/api/workspaces/active", { method: "POST", cookie: member.session, body: { id: workspaceId } });
  if (response.status !== 200) return response.status;
  member.cookie = `${member.session}; ${response.headers.getSetCookie()[0].split(";")[0]}`;
  return 200;
}
async function inviteAndAccept(owner, member, role) {
  const invite = await request("/api/workspaces/current/invitations", { method: "POST", cookie: owner.cookie, body: { email: member.email, role } });
  assert.equal(invite.status, 201);
  const { url } = await invite.json();
  const token = url.split("/invite/")[1];
  const accepted = await request("/api/invitations/accept", { method: "POST", cookie: member.session, body: { token } });
  assert.equal(accepted.status, 200);
  member.cookie = `${member.session}; ${accepted.headers.getSetCookie()[0].split(";")[0]}`;
  return token;
}

test("organizations share content by role, and removing a member ends access immediately", async () => {
  const owner = await person();
  const editor = await person();
  const viewer = await person();
  const outsider = await person();
  const created = await request("/api/workspaces", { method: "POST", cookie: owner.session, body: { name: "Acme Marketing" } });
  assert.equal(created.status, 201);
  const org = (await created.json()).workspace;
  assert.equal(await useWorkspace(outsider, org.id), 404, "non-members cannot select the organization");
  assert.equal(await useWorkspace(owner, org.id), 200);

  const orgQr = await request("/api/qr-codes", { method: "POST", cookie: owner.cookie, body: { title: "Org poster", destination_url: "https://example.test/org" } });
  assert.equal(orgQr.status, 201);
  const orgQrId = (await orgQr.json()).qrCode.id;
  const personal = await request("/api/qr-codes", { method: "POST", cookie: owner.session, body: { title: "Personal flyer", destination_url: "https://example.test/me" } });
  assert.equal(personal.status, 201);
  const titles = async (cookie) => (await (await request("/api/qr-codes?page=1", { cookie })).json()).qrCodes.map((qr) => qr.title);
  assert.deepEqual(await titles(owner.cookie), ["Org poster"]);
  assert.deepEqual(await titles(owner.session), ["Personal flyer"], "personal workspace stays separate");

  const editorToken = await inviteAndAccept(owner, editor, "editor");
  await inviteAndAccept(owner, viewer, "viewer");
  assert.deepEqual(await titles(editor.cookie), ["Org poster"]);
  const linkpage = await request("/api/linkpages", { method: "POST", cookie: editor.cookie, body: { template: "blank", creation_key: randomUUID() } });
  assert.equal(linkpage.status, 201, "editors create content in the organization");
  assert.equal((await (await request("/api/linkpages", { cookie: owner.cookie })).json()).linkpages.length, 1, "owners see what editors create");
  assert.equal((await request("/api/invitations/accept", { method: "POST", cookie: editor.session, body: { token: editorToken } })).status, 404, "a link works once");

  assert.deepEqual(await titles(viewer.cookie), ["Org poster"], "viewers read");
  assert.equal((await request("/api/qr-codes", { method: "POST", cookie: viewer.cookie, body: { title: "x", destination_url: "https://example.test/" } })).status, 403);
  assert.equal((await request(`/api/qr-codes/${orgQrId}`, { method: "DELETE", cookie: viewer.cookie })).status, 403);
  assert.equal((await request("/api/workspaces/current/invitations", { method: "POST", cookie: viewer.cookie, body: { email: "x@example.test", role: "viewer" } })).status, 403);
  assert.equal((await request("/api/workspaces/current/invitations", { method: "POST", cookie: editor.cookie, body: { email: "x@example.test", role: "viewer" } })).status, 403);
  const members = await (await request("/api/workspaces/current/members", { cookie: viewer.cookie })).json();
  assert.equal(members.members.length, 3);
  assert.deepEqual(members.invitations, [], "only managers see pending invitations");

  const stale = await request("/api/qr-codes", { method: "POST", cookie: owner.session, headers: { origin: base, cookie: owner.session, "content-type": "application/json", "x-workspace-id": org.id },
    body: { title: "Wrong tab", destination_url: "https://example.test/tab" } });
  assert.equal(stale.status, 409, "a tab showing another workspace cannot write after a switch");
  const viewerEditor = await request(`/linkpages/${(await linkpage.clone().json()).linkpage.id}`, { cookie: viewer.cookie });
  assert.equal(viewerEditor.status, 404, "viewers do not get an editable editor");
  assert.equal((await request(`/linkpages/${(await linkpage.clone().json()).linkpage.id}`, { cookie: editor.cookie })).status, 200);
  const forged = { ...outsider, cookie: `${outsider.session}; qrc_workspace=${org.id}` };
  assert.deepEqual(await titles(forged.cookie), [], "a forged workspace cookie falls back to the personal workspace");
  assert.equal((await request(`/api/qr-codes/${orgQrId}`, { cookie: forged.cookie })).status, 404);

  assert.equal((await request(`/api/workspaces/current/members/${owner.session && (await (await request("/api/auth/get-session", { cookie: owner.session })).json()).user.id}`, { method: "DELETE", cookie: owner.cookie })).status, 409, "the last owner cannot leave");
  const editorId = (await (await request("/api/auth/get-session", { cookie: editor.session })).json()).user.id;
  assert.equal((await request(`/api/workspaces/current/members/${editorId}`, { method: "PATCH", cookie: owner.cookie, body: { role: "admin" } })).status, 200);
  const viewerId = (await (await request("/api/auth/get-session", { cookie: viewer.session })).json()).user.id;
  assert.equal((await request(`/api/workspaces/current/members/${viewerId}`, { method: "PATCH", cookie: editor.cookie, body: { role: "owner" } })).status, 403, "admins cannot make owners");
  assert.equal((await request(`/api/workspaces/current/members/${viewerId}`, { method: "DELETE", cookie: editor.cookie })).status, 200, "admins remove viewers");
  assert.deepEqual(await titles(viewer.cookie), [], "removed member loses access on the next request");
  assert.equal((await request(`/api/qr-codes/${orgQrId}`, { cookie: viewer.cookie })).status, 404);
  const scan = await request(`/qr?code=${(await (await request(`/api/qr-codes/${orgQrId}`, { cookie: owner.cookie })).json()).qrCode.short_code}`);
  assert.equal(scan.status, 302, "published QR codes keep working for the public");

  assert.equal((await request("/api/workspaces/current", { method: "DELETE", cookie: editor.cookie, body: { confirm_name: "Acme Marketing" } })).status, 403, "only owners delete");
  assert.equal((await request("/api/workspaces/current", { method: "DELETE", cookie: owner.cookie, body: { confirm_name: "Wrong" } })).status, 400);
  assert.equal((await request("/api/workspaces/current", { method: "DELETE", cookie: owner.cookie, body: { confirm_name: "Acme Marketing" } })).status, 200);
  assert.deepEqual(await titles(owner.cookie), ["Personal flyer"], "after deletion the owner is back in the personal workspace");
  assert.equal((await request(`/qr?code=${(await (await request(`/api/qr-codes/${(await personal.clone().json()).qrCode.id}`, { cookie: owner.session })).json()).qrCode.short_code}`)).status, 302);
});

test("invitations are bound to the invited email, can be revoked and never leak details", async () => {
  const owner = await person();
  const invited = await person();
  const stranger = await person();
  const unverifiedProfile = account();
  const unverified = cookieOf(await request("/api/auth/sign-up/email", { method: "POST", body: unverifiedProfile }));
  const org = (await (await request("/api/workspaces", { method: "POST", cookie: owner.session, body: { name: "Studio" } })).json()).workspace;
  await useWorkspace(owner, org.id);
  const invite = await (await request("/api/workspaces/current/invitations", { method: "POST", cookie: owner.cookie, body: { email: invited.email.toUpperCase(), role: "editor" } })).json();
  const token = invite.url.split("/invite/")[1];
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal((await request("/api/invitations/accept", { method: "POST", cookie: stranger.session, body: { token } })).status, 403, "other email addresses cannot accept");
  const forUnverified = await (await request("/api/workspaces/current/invitations", { method: "POST", cookie: owner.cookie, body: { email: unverifiedProfile.email, role: "viewer" } })).json();
  const unconfirmed = await request("/api/invitations/accept", { method: "POST", cookie: unverified, body: { token: forUnverified.url.split("/invite/")[1] } });
  assert.equal(unconfirmed.status, 403, "an unconfirmed address cannot claim an invitation");
  const page = await request(`/invite/${token}`, { cookie: invited.session });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Studio/);
  assert.equal((await request(`/invite/${token}`)).status, 307, "the link asks to sign in first");
  assert.doesNotMatch(await (await request(`/invite/${"x".repeat(43)}`, { cookie: invited.session })).text(), /Studio/);
  assert.equal((await request(`/api/workspaces/current/invitations/${invite.invitation.id}`, { method: "DELETE", cookie: owner.cookie })).status, 200);
  assert.equal((await request("/api/invitations/accept", { method: "POST", cookie: invited.session, body: { token } })).status, 404, "revoked links stop working");
  const again = await (await request("/api/workspaces/current/invitations", { method: "POST", cookie: owner.cookie, body: { email: invited.email, role: "viewer" } })).json();
  assert.equal((await request("/api/invitations/accept", { method: "POST", cookie: invited.session, body: { token: again.url.split("/invite/")[1] } })).status, 200);
  assert.equal((await request("/api/workspaces/current/invitations", { method: "POST", cookie: owner.cookie, body: { email: invited.email, role: "viewer" } })).status, 409, "members are not invited twice");
  const list = await (await request("/api/workspaces", { cookie: invited.session })).json();
  assert.deepEqual(list.workspaces.map((item) => [item.kind, item.role]).sort(), [["organization", "viewer"], ["personal", "owner"]]);
});

test("linked QR codes open published pages, cards, forms and library files and follow them", async () => {
  const owner = await register();
  const other = await register();
  const page = await newLinkpage(owner, "business");
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const draftForm = await newForm(owner, "contact");
  const foreignCard = await newCard(other);
  await request(`/api/cards/${foreignCard.id}/publish`, { method: "POST", cookie: other, body: { publish: true } });

  const created = await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "linkpage", id: page.id }, design: savedDesign } });
  assert.equal(created.status, 201);
  const qr = (await created.json()).qrCode;
  assert.equal(qr.qr_type, "linkpage");
  assert.equal(qr.destination_url, `${base}/p/${page.slug}`);
  assert.equal(qr.tracking_enabled, true);
  assert.equal(qr.title, page.title);
  assert.ok(qr.created_by, "the creator is recorded");
  const scan = await request(`/qr?code=${qr.short_code}`);
  assert.equal(scan.headers.get("location"), `${base}/p/${page.slug}`);
  assert.equal((await request(`/api/qr-codes/${qr.id}`, { method: "PATCH", cookie: owner, body: { destination_url: "https://example.test/elsewhere" } })).status, 409, "linked codes follow their item");
  assert.equal((await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "form", id: draftForm.id } } })).status, 400, "unpublished items cannot be linked");
  assert.equal((await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "card", id: foreignCard.id } } })).status, 400, "items of another workspace cannot be linked");
  assert.equal((await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "linkpage", id: page.id }, destination_url: "https://evil.example/" } })).status, 400);

  const { asset } = await (await uploadFile(owner, Buffer.from("%PDF-1.4\n%%EOF\n"), "menu.pdf")).json();
  const fileQr = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "file", id: asset.id } } })).json()).qrCode;
  const publicUrl = new URL(fileQr.destination_url);
  assert.match(publicUrl.pathname, /^\/a\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{32}$/);
  const file = await request(publicUrl.pathname);
  assert.equal(file.status, 200, "the file opens without a session");
  assert.equal(file.headers.get("content-type"), "application/pdf");
  assert.equal((await request(publicUrl.pathname.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).status, 404, "a forged signature is refused");
  await request(`/api/qr-codes/${fileQr.id}`, { method: "PATCH", cookie: owner, body: { is_active: false } });
  assert.equal((await request(publicUrl.pathname)).status, 404, "pausing the only file QR revokes the public file");
  await request(`/api/qr-codes/${fileQr.id}`, { method: "PATCH", cookie: owner, body: { is_active: true } });
  assert.equal((await request(publicUrl.pathname)).status, 200);
  const removedAsset = await (await request(`/api/assets/${asset.id}`, { method: "DELETE", cookie: owner })).json();
  assert.equal(removedAsset.qr_codes_deactivated, 1);
  assert.equal((await request(publicUrl.pathname)).status, 404, "deleting the file ends the public address");
  assert.equal((await request(`/api/linkpages/${page.id}`, { method: "DELETE", cookie: owner })).status, 200);
  assert.equal((await (await request(`/api/qr-codes/${qr.id}`, { cookie: owner })).json()).qrCode.is_active, false, "deleting the page deactivates codes linked to it");
  assert.equal((await request("/api/qr-codes", { method: "POST", cookie: owner, body: { qr_type: "file", destination_url: "https://evil.example/" } })).status, 400, "linked types need an item");
});

test("a decoded QR image finds its code only in the current workspace", async () => {
  const owner = await register();
  const other = await register();
  const tracked = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { title: "Tracked poster", destination_url: "https://example.test/poster" } })).json());
  const found = await request("/api/qr-codes/lookup", { method: "POST", cookie: owner, body: { data: tracked.trackingUrl } });
  assert.equal(found.status, 200);
  assert.equal((await found.json()).id, tracked.qrCode.id);
  const wifi = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { content: { type: "text", text: "Hello table 4" } } })).json()).qrCode;
  assert.equal((await (await request("/api/qr-codes/lookup", { method: "POST", cookie: owner, body: { data: "Hello table 4" } })).json()).id, wifi.id);
  assert.equal((await request("/api/qr-codes/lookup", { method: "POST", cookie: other, body: { data: tracked.trackingUrl } })).status, 404);
  assert.equal((await request("/api/qr-codes/lookup", { method: "POST", cookie: owner, body: { data: "https://unknown.example/" } })).status, 404);
});

test("saved design templates belong to the workspace and keep library logos private", async () => {
  const owner = await register();
  const other = await register();
  const { asset } = await (await uploadFile(owner, tinyPng, "logo.png")).json();
  const { asset: foreign } = await (await uploadFile(other, tinyPng, "logo.png")).json();
  const saved = await request("/api/qr-templates", { method: "POST", cookie: owner, body: { name: "Brand blue", design: { ...savedDesign, logoId: null, logoAssetId: asset.id } } });
  assert.equal(saved.status, 201);
  const template = (await saved.json()).template;
  assert.equal((await request("/api/qr-templates", { method: "POST", cookie: owner, body: { name: "Stolen", design: { ...savedDesign, logoAssetId: foreign.id } } })).status, 400);
  assert.equal((await request("/api/qr-templates", { method: "POST", cookie: owner, body: { name: "", design: savedDesign } })).status, 400);
  assert.deepEqual((await (await request("/api/qr-templates", { cookie: owner })).json()).templates.map((item) => item.name), ["Brand blue"]);
  assert.deepEqual((await (await request("/api/qr-templates", { cookie: other })).json()).templates, []);
  assert.equal((await request(`/api/qr-templates/${template.id}`, { method: "DELETE", cookie: other })).status, 404);
  assert.equal((await request(`/api/qr-templates/${template.id}`, { method: "DELETE", cookie: owner })).status, 200);
});

test("the created-by-me filter separates members' codes in a shared workspace", async () => {
  const owner = await person();
  const member = await person();
  const org = (await (await request("/api/workspaces", { method: "POST", cookie: owner.session, body: { name: "Shared" } })).json()).workspace;
  await useWorkspace(owner, org.id);
  await inviteAndAccept(owner, member, "editor");
  await request("/api/qr-codes", { method: "POST", cookie: owner.cookie, body: { title: "Owner code", destination_url: "https://example.test/o" } });
  await request("/api/qr-codes", { method: "POST", cookie: member.cookie, body: { title: "Member code", destination_url: "https://example.test/m" } });
  const titles = async (cookie, query) => (await (await request(`/api/qr-codes?page=1${query}`, { cookie })).json()).qrCodes.map((qr) => qr.title).sort();
  assert.deepEqual(await titles(owner.cookie, ""), ["Member code", "Owner code"]);
  assert.deepEqual(await titles(owner.cookie, "&creator=me"), ["Owner code"]);
  assert.deepEqual(await titles(member.cookie, "&creator=me"), ["Member code"]);
});

/** GET with an explicit Host header, as a custom domain would send it. */
async function getWithHost(path, host) {
  const { request: httpRequest } = await import("node:http");
  const target = new URL(path, base);
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: "GET", headers: { host } }, (res) => {
      res.resume();
      res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location }));
    });
    req.on("error", reject);
    req.end();
  });
}
const createTracked = async (cookie, title, destination) => (await (await request("/api/qr-codes", { method: "POST", cookie, body: { title, destination_url: destination } })).json()).qrCode;
const unlock = (body) => request("/qr/unlock", { method: "POST", body });

test("password-protected codes open only after the right password, with attempt limits", async () => {
  const owner = await register();
  const qr = await createTracked(owner, "Protected", "https://example.test/secret");
  assert.equal((await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { password: "abc" } })).status, 400, "too short");
  const saved = await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { password: "open sesame" } });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).rules.hasPassword, true);
  const record = await (await request(`/api/qr-codes/${qr.id}`, { cookie: owner })).json();
  assert.doesNotMatch(JSON.stringify(record), /passwordHash|passwordSalt|open sesame/, "the password never leaves the server");
  const scan = await request(`/qr?code=${qr.short_code}`);
  assert.equal(scan.status, 302);
  assert.equal(scan.headers.get("location"), `${base}/qr/gate?code=${qr.short_code}`);
  assert.match(await (await request(`/qr/gate?code=${qr.short_code}`)).text(), /protected by a password/);
  assert.equal((await unlock({ code: qr.short_code, password: "wrong" })).status, 403);
  assert.equal((await fetch(new URL("/qr/unlock", base), { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" })).status, 403);
  const opened = await unlock({ code: qr.short_code, password: "open sesame" });
  assert.equal(opened.status, 200);
  assert.equal((await opened.json()).destination, "https://example.test/secret");
  const counted = await (await request(`/api/qr-codes/${qr.id}`, { cookie: owner })).json();
  assert.equal(counted.qrCode.total_scans, 1, "only the unlocked scan counts");
  for (let attempt = 0; attempt < 49; attempt++) await unlock({ code: qr.short_code, password: `guess-${attempt}` });
  assert.equal((await unlock({ code: qr.short_code, password: "open sesame" })).status, 429, "guessing is slowed down even for the right password");
  const other = await register();
  assert.equal((await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: other, body: { password: null } })).status, 404);
  const direct = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { title: "Direct", destination_url: "https://example.test/d", tracking_enabled: false } })).json()).qrCode;
  assert.equal((await request(`/api/qr-codes/${direct.id}/rules`, { method: "PATCH", cookie: owner, body: { askLocation: true } })).status, 409, "direct codes cannot have rules");
  const page = await newLinkpage(owner, "blank");
  await request(`/api/linkpages/${page.id}`, { method: "PATCH", cookie: owner, body: { draft: { ...page.draft, profile: { ...page.draft.profile, name: "Public" } } } });
  await request(`/api/linkpages/${page.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
  const linked = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { link: { kind: "linkpage", id: page.id } } })).json()).qrCode;
  assert.equal((await request(`/api/qr-codes/${linked.id}/rules`, { method: "PATCH", cookie: owner, body: { password: "secret-pass" } })).status, 409, "a password would not protect a public page");
});

test("schedules use time zones and send people to the fallback outside the window", async () => {
  const owner = await register();
  const qr = await createTracked(owner, "Event", "https://example.test/event");
  const past = { timezone: "Asia/Riyadh", startsAt: null, endsAt: "2020-01-01T00:00", days: [], from: null, to: null };
  await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { schedule: past } });
  const ended = await request(`/qr?code=${qr.short_code}`);
  assert.equal(ended.status, 410);
  assert.match(await ended.text(), /has ended/);
  assert.equal((await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { fallbackUrl: "javascript:alert(1)" } })).status, 400);
  await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { fallbackUrl: "https://example.test/next-year" } });
  const fallback = await request(`/qr?code=${qr.short_code}`);
  assert.equal(fallback.headers.get("location"), "https://example.test/next-year");
  const future = { ...past, endsAt: null, startsAt: "2099-01-01T00:00" };
  await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { schedule: future, fallbackUrl: null } });
  assert.match(await (await request(`/qr?code=${qr.short_code}`)).text(), /not active yet/);
  await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { schedule: null } });
  assert.equal((await request(`/qr?code=${qr.short_code}`)).headers.get("location"), "https://example.test/event");
  assert.equal((await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { schedule: { ...past, timezone: "Mars/Base" } } })).status, 400);
});

test("location is stored only when the visitor shares it, rounded to about 1 km", async () => {
  const owner = await register();
  const qr = await createTracked(owner, "Where", "https://example.test/where");
  await request(`/api/qr-codes/${qr.id}/rules`, { method: "PATCH", cookie: owner, body: { askLocation: true } });
  assert.equal((await request(`/qr?code=${qr.short_code}`)).headers.get("location"), `${base}/qr/gate?code=${qr.short_code}`);
  const browser = { origin: base, "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone) Mobile Safari" };
  const shared = await request("/qr/unlock", { method: "POST", headers: browser, body: { code: qr.short_code, location: { latitude: 38.722252, longitude: -9.139337 } } });
  assert.equal(shared.status, 200);
  const declined = await request("/qr/unlock", { method: "POST", headers: { ...browser, "user-agent": "Mozilla/5.0 (Android) Mobile Chrome" }, body: { code: qr.short_code } });
  assert.equal(declined.status, 200);
  assert.equal((await request("/qr/unlock", { method: "POST", headers: browser, body: { code: qr.short_code, location: { latitude: 91, longitude: 0 } } })).status, 400);
  const rows = await withTestDatabase(async (pool) => (await pool.query("select latitude, longitude from qrconnect.qr_scans where qr_code_id = $1 order by scanned_at", [qr.id])).rows);
  assert.deepEqual(rows, [{ latitude: 38.72, longitude: -9.14 }, { latitude: null, longitude: null }]);
});

test("aliases are permanent extra short codes that never move to another code", async () => {
  const owner = await register();
  const other = await register();
  const qr = await createTracked(owner, "Menu", "https://example.test/menu");
  const alias = `menu-${randomUUID().slice(0, 6)}`;
  assert.equal((await request(`/api/qr-codes/${qr.id}/aliases`, { method: "POST", cookie: owner, body: { alias: "a" } })).status, 400);
  assert.equal((await request(`/api/qr-codes/${qr.id}/aliases`, { method: "POST", cookie: owner, body: { alias } })).status, 201);
  assert.equal((await request(`/r/${alias}`)).headers.get("location"), "https://example.test/menu");
  assert.equal((await request(`/qr?code=${alias}`)).headers.get("location"), "https://example.test/menu");
  assert.equal((await request(`/r/${qr.short_code}`)).status, 302, "the original short code keeps working");
  const otherQr = await createTracked(other, "Theirs", "https://example.test/theirs");
  assert.equal((await request(`/api/qr-codes/${otherQr.id}/aliases`, { method: "POST", cookie: other, body: { alias } })).status, 409);
  assert.equal((await request(`/api/qr-codes/${qr.id}/aliases`, { cookie: other })).status, 404);
  assert.deepEqual((await (await request(`/api/qr-codes/${qr.id}/aliases`, { cookie: owner })).json()).aliases.map((item) => item.alias), [alias]);
  await request(`/api/qr-codes/${qr.id}`, { method: "DELETE", cookie: owner });
  assert.equal((await request(`/r/${alias}`)).status, 410, "the alias of a deleted code stays reserved");
  assert.equal((await request(`/api/qr-codes/${otherQr.id}/aliases`, { method: "POST", cookie: other, body: { alias } })).status, 409, "and is never given to another code");
});

test("custom domains need a DNS TXT proof and only serve codes of their workspace", async () => {
  const { readFile, writeFile } = await import("node:fs/promises");
  const owner = await register();
  const other = await register();
  const hostname = `qr-${randomUUID().slice(0, 8)}.example.com`;
  assert.equal((await request("/api/domains", { method: "POST", cookie: owner, body: { hostname: "localhost" } })).status, 400);
  const added = await request("/api/domains", { method: "POST", cookie: owner, body: { hostname: `HTTPS://${hostname.toUpperCase()}/x` } });
  assert.equal(added.status, 201);
  const domain = (await added.json()).domain;
  assert.equal(domain.hostname, hostname);
  assert.equal((await request("/api/domains", { method: "POST", cookie: other, body: { hostname } })).status, 201, "a pending claim does not block anyone");
  const qr = await createTracked(owner, "Branded", "https://example.test/branded");
  assert.equal((await request(`/api/qr-codes/${qr.id}/domain`, { method: "PATCH", cookie: owner, body: { domain_id: domain.id } })).status, 409, "unverified domains cannot be used");
  assert.equal((await (await request(`/api/domains/${domain.id}/verify`, { method: "POST", cookie: owner })).json()).verified, false);
  const fixtures = process.env.TEST_DNS_FIXTURES;
  const records = JSON.parse(await readFile(fixtures, "utf8").catch(() => "{}"));
  records[domain.record_name] = [[domain.record_value]];
  await writeFile(fixtures, JSON.stringify(records));
  assert.equal((await request(`/api/domains/${domain.id}/verify`, { method: "POST", cookie: other })).status, 404);
  assert.equal((await (await request(`/api/domains/${domain.id}/verify`, { method: "POST", cookie: owner })).json()).verified, true);
  assert.equal((await request("/api/domains", { method: "POST", cookie: other, body: { hostname } })).status, 409, "a verified domain has one owner");
  const assigned = await request(`/api/qr-codes/${qr.id}/domain`, { method: "PATCH", cookie: owner, body: { domain_id: domain.id } });
  assert.equal((await assigned.json()).tracking_host, hostname);
  const record = await (await request(`/api/qr-codes/${qr.id}`, { cookie: owner })).json();
  assert.equal(record.trackingUrl, `https://${hostname}/r/${qr.short_code}`);
  assert.deepEqual(await getWithHost(`/r/${qr.short_code}`, hostname), { status: 302, location: "https://example.test/branded" });
  const otherQr = await createTracked(other, "Not theirs", "https://example.test/other");
  assert.equal((await getWithHost(`/r/${otherQr.short_code}`, hostname)).status, 404, "a domain does not serve another workspace's codes");
  assert.equal((await getWithHost(`/r/${qr.short_code}`, "unverified.example.org")).status, 404);
  assert.equal((await request(`/r/${qr.short_code}`)).status, 302, "the app address keeps working for printed codes");
  assert.equal((await request(`/api/domains/${domain.id}`, { method: "DELETE", cookie: owner })).status, 409, "a domain in use cannot be removed");
  await request(`/api/qr-codes/${qr.id}/domain`, { method: "PATCH", cookie: owner, body: { domain_id: null } });
  assert.equal((await getWithHost(`/r/${qr.short_code}`, hostname)).status, 302, "codes printed with an earlier domain keep working");
  assert.equal((await request(`/api/domains/${domain.id}`, { method: "DELETE", cookie: owner })).status, 409, "a domain printed in codes can never be removed");
  const pending = await request("/api/domains", { method: "POST", cookie: other, body: { hostname: `other-${hostname}` } });
  assert.equal(pending.status, 201);
  assert.equal((await request("/api/domains", { method: "POST", cookie: owner, body: { hostname: `other-${hostname}` } })).status, 201, "an unverified claim does not block the real owner");
});

/** Local webhook receiver; answers with the next queued status (200 by default). */
async function webhookReceiver() {
  const { createServer } = await import("node:http");
  const received = [];
  const answers = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => { received.push({ headers: req.headers, body }); res.statusCode = answers.shift() ?? 200; res.end("ok"); });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}/hook`, received, answers, close: () => new Promise((resolve) => server.close(resolve)) };
}
const waitFor = async (predicate) => { for (let index = 0; index < 50 && !predicate(); index++) await new Promise((resolve) => setTimeout(resolve, 100)); };
const v1 = (path, key, { method = "GET", body } = {}) => fetch(new URL(path, base), { method, headers: { authorization: `Bearer ${key}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });

test("API keys are scoped to their workspace, revocable and rate limited", async () => {
  const owner = await register();
  const other = await register();
  await request("/api/qr-codes", { method: "POST", cookie: owner, body: { title: "Owner code", destination_url: "https://example.test/o" } });
  const theirs = (await (await request("/api/qr-codes", { method: "POST", cookie: other, body: { title: "Other code", destination_url: "https://example.test/x" } })).json()).qrCode;
  const created = await request("/api/developers/keys", { method: "POST", cookie: owner, body: { name: "Reader", scopes: ["qr:read"] } });
  assert.equal(created.status, 201);
  const { key, apiKey } = await created.json();
  assert.match(key, /^qrc_[a-z0-9]{12}_[A-Za-z0-9_-]{43}$/);
  assert.doesNotMatch(JSON.stringify(await (await request("/api/developers/keys", { cookie: owner })).json()), new RegExp(key.split("_")[2]), "the secret is shown only once");
  const list = await v1("/api/v1/qr-codes", key);
  assert.equal(list.status, 200);
  assert.equal(list.headers.get("x-ratelimit-limit"), "60");
  assert.deepEqual((await list.json()).data.map((qr) => qr.title), ["Owner code"]);
  assert.equal((await v1(`/api/v1/qr-codes/${theirs.id}`, key)).status, 404, "another workspace's code is not visible");
  assert.equal((await v1("/api/v1/qr-codes", key, { method: "POST", body: { title: "x", destination_url: "https://example.test/" } })).status, 403, "read keys cannot write");
  assert.equal((await v1("/api/v1/analytics", key)).status, 403);
  assert.equal((await v1("/api/v1/qr-codes", "qrc_aaaaaaaaaaaa_" + "x".repeat(43))).status, 401);
  assert.equal((await fetch(new URL("/api/v1/qr-codes", base))).status, 401);
  assert.equal((await request("/api/v1/qr-codes", { cookie: owner })).status, 401, "a browser session is not an API key");

  const writer = (await (await request("/api/developers/keys", { method: "POST", cookie: owner, body: { name: "Writer", scopes: ["qr:write", "analytics:read"] } })).json()).key;
  const made = await v1("/api/v1/qr-codes", writer, { method: "POST", body: { title: "From API", destination_url: "https://example.test/api" } });
  assert.equal(made.status, 201);
  const madeId = (await made.json()).qrCode.id;
  assert.equal((await v1(`/api/v1/qr-codes/${madeId}`, writer, { method: "PATCH", body: { is_active: false } })).status, 200);
  assert.equal((await v1("/api/v1/analytics?from=2026-01-01&to=2026-01-31", writer)).status, 200);
  assert.equal((await v1(`/api/v1/qr-codes/${theirs.id}`, writer, { method: "DELETE" })).status, 404);

  assert.equal((await request(`/api/developers/keys/${apiKey.id}`, { method: "DELETE", cookie: other })).status, 404);
  assert.equal((await request(`/api/developers/keys/${apiKey.id}`, { method: "DELETE", cookie: owner })).status, 200);
  assert.equal((await v1("/api/v1/qr-codes", key)).status, 401, "revoked keys stop working");

  let limited = null;
  for (let index = 0; index < 70 && !limited; index++) { const response = await v1("/api/v1/qr-codes/" + madeId, writer.replace("x", "x")); if (response.status === 429) limited = response; }
  if (!limited) for (let index = 0; index < 70 && !limited; index++) { const response = await v1("/api/v1/analytics", writer); if (response.status === 429) limited = response; }
  assert.ok(limited, "the 61st request in a minute is refused");
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);
});

test("webhooks are signed, retried, redelivered with the same id and never reach private networks", async () => {
  const { createHmac } = await import("node:crypto");
  const owner = await register();
  const other = await register();
  const receiver = await webhookReceiver();
  try {
    assert.equal((await request("/api/developers/webhooks", { method: "POST", cookie: owner, body: { url: "https://10.0.0.5/hook", events: ["qr.scanned"] } })).status, 400);
    assert.equal((await request("/api/developers/webhooks", { method: "POST", cookie: owner, body: { url: "http://example.com/hook", events: ["qr.scanned"] } })).status, 400, "plain HTTP is refused");
    const created = await request("/api/developers/webhooks", { method: "POST", cookie: owner, body: { url: receiver.url, events: ["qr.scanned", "form.submitted"] } });
    assert.equal(created.status, 201);
    const { webhook, secret } = await created.json();
    assert.match(secret, /^whsec_/);
    assert.doesNotMatch(JSON.stringify(await (await request("/api/developers/webhooks", { cookie: owner })).json()), new RegExp(secret));

    const qr = (await (await request("/api/qr-codes", { method: "POST", cookie: owner, body: { title: "Hooked", destination_url: "https://example.test/h" } })).json()).qrCode;
    receiver.answers.push(500);
    await request(`/qr?code=${qr.short_code}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone) Mobile Safari" } });
    await waitFor(() => receiver.received.length >= 1);
    const first = receiver.received[0];
    const [, timestamp, v1sig] = first.headers["qrconnect-signature"].match(/^t=(\d+),v1=([0-9a-f]{64})$/);
    assert.equal(v1sig, createHmac("sha256", secret).update(`${timestamp}.${first.body}`).digest("hex"), "the signature matches the secret");
    assert.ok(Math.abs(Date.now() / 1000 - Number(timestamp)) < 300);
    const event = JSON.parse(first.body);
    assert.equal(event.type, "qr.scanned");
    assert.equal(event.data.qr_code_id, qr.id);
    assert.equal(first.headers["qrconnect-event-id"], event.id);

    const deliveries = await (await request(`/api/developers/webhooks/${webhook.id}`, { cookie: owner })).json();
    const failed = deliveries.deliveries.find((item) => item.event === "qr.scanned");
    assert.equal(failed.status, "pending");
    assert.equal(failed.attempts, 1);
    assert.equal(failed.last_status_code, 500);
    assert.ok(failed.next_attempt_at, "a retry is scheduled");
    assert.equal((await request(`/api/developers/deliveries/${failed.id}`, { method: "POST", cookie: other })).status, 404);
    const again = await (await request(`/api/developers/deliveries/${failed.id}`, { method: "POST", cookie: owner })).json();
    assert.equal(again.delivery.status, "delivered");
    assert.equal(JSON.parse(receiver.received.at(-1).body).id, event.id, "redelivery keeps the event id");

    const form = await newForm(owner, "blank");
    await request(`/api/forms/${form.id}/publish`, { method: "POST", cookie: owner, body: { publish: true } });
    await submit(form.slug, { answers: { [form.draft.fields[0].id]: "Webhook answer" } });
    await waitFor(() => receiver.received.some((item) => JSON.parse(item.body).type === "form.submitted"));
    const formEvent = JSON.parse(receiver.received.find((item) => JSON.parse(item.body).type === "form.submitted").body);
    assert.equal(formEvent.data.answers[0].value, "Webhook answer");

    await request(`/api/developers/webhooks/${webhook.id}`, { method: "PATCH", cookie: owner, body: { active: false } });
    const before = receiver.received.length;
    await request(`/qr?code=${qr.short_code}`, { headers: { "user-agent": "Mozilla/5.0 (Android) Mobile Chrome" } });
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(receiver.received.length, before, "paused webhooks receive nothing");
    const ping = await (await request(`/api/developers/webhooks/${webhook.id}/ping`, { method: "POST", cookie: owner })).json();
    assert.equal(ping.delivery.status, "delivered");
    assert.equal((await request(`/api/developers/webhooks/${webhook.id}`, { cookie: other })).status, 404);
    assert.equal((await request("/api/cron/webhooks")).status, 401, "the retry job needs its secret");
  } finally {
    await receiver.close();
  }
});
