# 🚀 05. Hướng Dẫn Deploy Production (Neon + Render + Vercel + Google Sign-In)

> **Nguyên tắc bảo mật bắt buộc:** **KHÔNG** commit file `.env` hay bất kỳ secret thật nào (`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`) lên GitHub. Toàn bộ secret chỉ nhập trực tiếp trên dashboard của Neon, Google Cloud Console, Render và Vercel.

---

## Chạy preflight trước khi push

Chạy từ gốc repo hoặc worktree sau khi cài dependency cho `server` (gồm `requirements-dev.txt`), `client` và `e2e`. Chế độ E2E cần Chromium của Playwright.

```bash
tools/preflight.sh --fast   # Ruff, pytest, test frontend, build tạm và Gitleaks
tools/preflight.sh --e2e    # Thêm Playwright với backend SQLite tạm và Vite preview
```

Khi máy có Gitleaks, preflight quét cả thay đổi đã stage lẫn commit local chưa có trên các nhánh `origin` đã fetch. CI quét các commit của PR. Nếu Playwright lỗi, mở `e2e/playwright-report/index.html` hoặc xem trace trong `e2e/test-results/`. CI còn kiểm tra PostgreSQL và Docker.

---

## 1. Tạo Database trên Neon Postgres

- [ ] Đăng nhập [Neon Console](https://console.neon.tech) → **New Project**.
- [ ] Đặt tên project (ví dụ `saigon-guide-db`), chọn Postgres **16**, chọn Region **AWS Asia Pacific (Singapore) `ap-southeast-1`** (cùng vùng với Render để giảm độ trễ).
- [ ] Trong hộp **Connect**, bật tùy chọn **Connection pooling** và sao chép chuỗi kết nối (có hậu tố `-pooler`):
  ```text
  postgresql://USER:PASS@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```
- [ ] Giữ chuỗi này để dán vào biến `DATABASE_URL` ở bước Render.

---

## 2. Tạo Google OAuth Client ID (Google Identity Services)

Backend xác thực ID token trả về từ nút **Google Sign-In (GIS)**, nên chỉ cần **Authorized JavaScript origins** (không cần điền *Authorized redirect URIs*).

- [ ] Mở [Google Cloud Console](https://console.cloud.google.com) → chọn/tạo project → **APIs & Services → OAuth consent screen** (hoặc **Google Auth Platform → Branding / Audience**).
- [ ] Chọn User Type **External**, điền tên ứng dụng & email hỗ trợ, để Publishing status ở chế độ **Testing**.
- [ ] Tại mục **Test users**, bấm **Add users** và thêm các email Gmail sẽ dùng để kiểm thử đăng nhập.
- [ ] Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
- [ ] Trong **Authorized JavaScript origins**, thêm (không có dấu `/` ở cuối):
  - `http://localhost` *(Google Identity Services yêu cầu thêm cả origin không cổng song song với origin có cổng khi test local)*
  - `http://localhost:5173`
  - `https://<ten-app>.vercel.app` *(có thể thêm ngay nếu đã chọn tên, hoặc bổ sung sau bước 4)*
- [ ] Lưu lại **Client ID** (`xxxxx.apps.googleusercontent.com`) để nhập cho cả `GOOGLE_CLIENT_ID` (Render) và `VITE_GOOGLE_CLIENT_ID` (Vercel).

> **Lưu ý local:** Khi chạy dev ở máy, luôn truy cập trình duyệt bằng `http://localhost:5173`. Google phân biệt `localhost` với `127.0.0.1` và tài liệu GIS khuyến nghị `http://localhost` + `http://localhost:<port>`; mở bằng `127.0.0.1` dễ gặp lỗi `origin_mismatch`.

---

## 3. Deploy Backend lên Render bằng Blueprint (`render.yaml`)

> **Thứ tự:** Render đọc `render.yaml` từ nhánh `main`, nên chỉ làm bước này **sau khi PR thêm `render.yaml` đã merge**. Bước 1 và 2 làm trước được.

- [ ] Mở [Render Dashboard](https://dashboard.render.com) → **New + → Blueprint**.
- [ ] Kết nối GitHub và chọn repository này (nhánh `main`). Render sẽ tự đọc file [`render.yaml`](../render.yaml) ở gốc repo (`saigon-guide-api`, region Singapore, Python `3.12.11`, `autoDeployTrigger: "off"` — deploy do GitHub Actions gọi deploy hook).
- [ ] Nhập các biến môi trường `sync: false` được Render hỏi trên giao diện:
  - `DATABASE_URL`: chuỗi pooled Neon từ bước 1.
  - `GEMINI_API_KEY`: API key Gemini từ Google AI Studio.
  - `GOOGLE_CLIENT_ID`: Client ID từ bước 2.
  - `GOOGLE_PLACES_API_KEY`: API key Google Places (có thể để trống nếu chỉ dùng catalog local TP.HCM).
  - `CORS_ORIGINS`: tạm đặt `http://localhost:5173` (sẽ cập nhật domain Vercel ở bước 5).
- [ ] Biến `JWT_SECRET` được Render tự sinh ngẫu nhiên (`generateValue: true`); `APP_ENV=production` đã cài sẵn.
- [ ] Bấm **Apply** → chờ build hoàn tất và kiểm tra `GET https://<service>.onrender.com/health` trả HTTP `200`.

---

## 4. Deploy Frontend lên Vercel

- [ ] Mở [Vercel Dashboard](https://vercel.com/new) → **Add New… → Project** → Import repository này.
- [ ] Cấu hình dự án:
  - **Root Directory**: `client` (Vercel sẽ tự nhận [`client/vercel.json`](../client/vercel.json)).
  - **Framework Preset**: `Vite` (Build Command `npm run build`, Output Directory `dist`).
- [ ] Mở mục **Environment Variables** và nhập 3 biến:
  - `VITE_USE_BACKEND` = `true`
  - `VITE_API_BASE` = `https://<service>.onrender.com` *(URL Render từ bước 3, không có dấu `/` cuối)*
  - `VITE_GOOGLE_CLIENT_ID` = `<client-id>.apps.googleusercontent.com` *(từ bước 2)*
- [ ] Bấm **Deploy** và ghi lại domain Vercel production (ví dụ `https://saigon-guide.vercel.app`).

---

## 5. Cập Nhật `CORS_ORIGINS` trên Render & Origin trên Google

- [ ] Quay lại **Render Dashboard → `saigon-guide-api` → Environment**.
- [ ] Sửa `CORS_ORIGINS` thành domain Vercel (phân tách bằng dấu phẩy nếu cần thêm preview URL hoặc local, **không** có `/` ở cuối):
  ```text
  https://<ten-app>.vercel.app,http://localhost:5173
  ```
- [ ] Bấm **Save Changes** (hoặc **Manual Deploy → Deploy latest commit**) để backend áp dụng cấu hình CORS mới.
- [ ] Quay lại **Google Cloud Console → Credentials → OAuth Client ID** đảm bảo `https://<ten-app>.vercel.app` đã có trong **Authorized JavaScript origins** (chờ 5–10 phút để Google đồng bộ).

---

## 6. Bật Branch Protection trên GitHub cho `main`

Branch Protection chặn merge PR khi check CI chưa xanh; sau khi merge vào `main`, workflow `Deploy production` ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) điều khiển toàn bộ quá trình kiểm tra và deploy Render → Vercel → Smoke.

- [ ] Vào GitHub repo → **Settings → Branches** (hoặc **Rules → Rulesets**) → tạo rule cho nhánh `main`.
- [ ] Bật **Require a pull request before merging** (khuyến nghị).
- [ ] Bật **Require status checks to pass before merging** và chọn đủ 3 check của workflow `CI`:
  - `Frontend build`
  - `Backend lint and tests`
  - `Postgres startup smoke`
- [ ] Lưu thay đổi.

---

## 7. Smoke Test Sau Deploy

- [ ] Mở `https://<service>.onrender.com/health` → thấy `{"status":"healthy", ...}`.
- [ ] Mở `https://<ten-app>.vercel.app` → giao diện tải đầy đủ, bấm F5 tại một route con (ví dụ `/trip/demo`) không bị lỗi 404.
- [ ] Bấm **Đăng nhập với Google** → popup mở bình thường, đăng nhập thành công bằng email đã thêm vào *Test users*.
- [ ] Tạo mới một lịch trình TP.HCM bằng AI → nhận lịch trình đầy đủ, tải lại trang vẫn giữ chuyến đi trong tài khoản.

---

## 8. Xử Lý Sự Cố Thường Gặp

| Sự cố | Nguyên nhân | Cách khắc phục |
| --- | --- | --- |
| Request đầu tiên chậm ~50 giây rồi mới phản hồi | Gói **Render Free** tự đưa service vào trạng thái ngủ sau ~15 phút không có truy cập | Bình thường với gói Free. Gọi trước `GET /health` trước khi demo hoặc nâng lên gói paid nếu cần luôn thức. |
| Lỗi Google `origin_mismatch` / `The given origin is not allowed` | Origin đang mở chưa có trong *Authorized JavaScript origins*, có dấu `/` cuối, hoặc đang mở `127.0.0.1` | Kiểm tra đúng scheme + host + port (không `/` cuối), local mở `http://localhost:5173`, đợi 5–10 phút sau khi lưu, kiểm tra email có trong *Test users*. |
| Lỗi **CORS** trên trình duyệt (`Blocked by CORS policy`) | `CORS_ORIGINS` trên Render thiếu domain Vercel hoặc dư dấu `/` cuối | Cập nhật chính xác `CORS_ORIGINS` trên Render (dạng `https://app.vercel.app`) rồi redeploy backend. |
| Lỗi `asyncpg` liên quan `sslmode` / `channel_binding` | `asyncpg` không tự nhận query parameter `?sslmode=require&channel_binding=require` từ URL Neon | Đảm bảo backend đã gộp phần chuẩn hóa URL Neon + SSL context trong `server/app/db/session.py` (T-013) và dùng chuỗi pooled hợp lệ từ Neon. |
| Backend thoát ngay khi khởi động do `JWT_SECRET` | Khi `APP_ENV=production`, app chặn khởi động nếu `JWT_SECRET` còn giữ giá trị mặc định | Giữ `generateValue: true` trong Blueprint hoặc đặt chuỗi bí mật ngẫu nhiên (≥ 32 ký tự) trực tiếp trên Render Dashboard. |

---

## 9. CI/CD bằng GitHub Actions

GitHub Actions điều khiển toàn bộ quá trình deploy production qua [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). Render và Vercel **không** tự deploy theo Git nữa — chỉ deploy khi toàn bộ CI (`ci.yml`, `api-smoke.yml`, `e2e.yml`) trên `main` đã xanh, theo thứ tự **Backend → Frontend → Smoke production**.

### Sơ đồ luồng

```mermaid
flowchart LR
    Dev["Push / Merge vào main"] --> CD["deploy.yml (concurrency: deploy-production)"]
    CD --> CI["ci.yml (FE + BE + Postgres + Docker)"]
    CD --> API["api-smoke.yml (Postgres + uvicorn)"]
    CD --> E2E["e2e.yml (Playwright)"]
    CD --> Diff["changes (git diff server/** & render.yaml)"]
    CI --> Gate{"Tất cả CI pass?"}
    API --> Gate
    E2E --> Gate
    Diff --> Gate
    Gate -- "Fail" --> Stop["Chặn deploy production"]
    Gate -- "Pass & backend đổi" --> BE["deploy-backend: Render Deploy Hook (?ref=sha) + poll /health/ready"]
    Gate -- "Pass & chỉ đổi FE/docs" --> FE["deploy-frontend: Vercel CLI (pull → build --prod → deploy --prebuilt --prod)"]
    BE --> FE
    FE --> Smoke["post-deploy.yml: /health/ready + smoke_api --prod + Vercel SPA + CORS"]
    BE -.-> Neon[("Neon Postgres Singapore")]
```

### Secrets và Variables cần cấu hình trên GitHub

- **Nơi đặt:** GitHub repo → **Settings → Environments → New environment** tên `production` (nên đặt toàn bộ secret deploy trong environment `production`, hoặc trong **Settings → Secrets and variables → Actions → Secrets**). Các biến URL không nhạy cảm đặt tại **Settings → Secrets and variables → Actions → Variables**: `PROD_API_URL`, `PROD_WEB_URL`.
- Nếu thiếu bất kỳ secret nào dưới đây, job deploy sẽ **fail ngay với `::error::`** (không skip im lặng).

| Tên | Loại | Cách lấy |
| --- | --- | --- |
| `RENDER_DEPLOY_HOOK_URL` | Secret | Render Dashboard → service `saigon-guide-api` → **Settings → Deploy Hook** → copy URL (`https://api.render.com/deploy/srv-...?key=...`). Giữ bí mật, không in ra log. |
| `VERCEL_TOKEN` | Secret | Vercel Dashboard → **Account Settings → Tokens → Create Token** (chọn scope phù hợp với team/tài khoản chứa project). |
| `VERCEL_ORG_ID` | Secret | Chạy `npx vercel link` trong thư mục `client/` rồi mở `client/.vercel/project.json`, lấy giá trị `orgId` *(không commit thư mục `.vercel/`)*. |
| `VERCEL_PROJECT_ID` | Secret | Lấy giá trị `projectId` trong cùng file `client/.vercel/project.json` sau bước `vercel link`. |
| `PROD_API_URL` | Variable | URL backend Render, ví dụ `https://saigon-guide-api.onrender.com` (không có `/` cuối). |
| `PROD_WEB_URL` | Variable | URL frontend Vercel, ví dụ `https://saigon-guide.vercel.app` (không có `/` cuối). |

> **Lưu ý về Root Directory = `client` khi chạy Vercel CLI:** Trong `deploy.yml`, các lệnh `vercel pull`, `vercel build --prod`, và `vercel deploy --prebuilt --prod` chạy ở **gốc repository** (không `cd client`), vì Vercel CLI đọc `rootDirectory: "client"` từ `.vercel/project.json` sau bước `vercel pull` và tự trỏ vào `client/` khi build.

### 2 việc bắt buộc tắt trên Dashboard

Để tránh Render hoặc Vercel tự deploy song song với GitHub Actions:

1. **Render:** `saigon-guide-api` → **Settings → Build & Deploy → Auto-Deploy = Off** *(đã đồng bộ trong [`render.yaml`](../render.yaml) với `autoDeployTrigger: "off"`).*
2. **Vercel:** Project → **Settings → Git** tắt tự động deploy theo Git *(đã đồng bộ trong [`client/vercel.json`](../client/vercel.json) với `"git": { "deploymentEnabled": false }`; preview deployment do workflow riêng quản lý).*

### Preview cho từng PR (`preview.yml`)

- Dùng chung 3 secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Thiếu secret hoặc PR từ fork thì workflow **skip** (không fail).
- Preview gọi **API production**. Trên Render đặt `CORS_ORIGIN_REGEX` = `^https://website-ai-travel-[a-z0-9-]+-<team-slug>\.vercel\.app$` (thay `<team-slug>`). **Không** dùng `.*\.vercel\.app`.
- Trên Vercel đặt env `VITE_*` cho môi trường **Preview**. Nếu bật Deployment Protection cho Preview thì bước `curl` kiểm preview sẽ nhận 401.

### Cách Rollback khi production gặp sự cố

- **Backend (Render):** Mở **Render Dashboard → `saigon-guide-api` → Events** (hoặc **Deploys**) → chọn bản deploy ổn định gần nhất → bấm **Rollback to this deploy**.
- **Frontend (Vercel):** Chạy `vercel rollback` bằng Vercel CLI (hoặc mở **Vercel Dashboard → Project → Deployments** → chọn bản deploy ổn định trước đó → bấm **… → Promote to Production**).
