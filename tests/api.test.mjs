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
