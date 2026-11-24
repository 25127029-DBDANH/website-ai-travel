# 🚀 05. Hướng Dẫn Deploy Production (Neon + Render + Vercel + Google Sign-In)

> **Nguyên tắc bảo mật bắt buộc:** **KHÔNG** commit file `.env` hay bất kỳ secret thật nào (`DATABASE_URL`, `GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`) lên GitHub. Toàn bộ secret chỉ nhập trực tiếp trên dashboard của Neon, Google Cloud Console, Render và Vercel.

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
- [ ] Kết nối GitHub và chọn repository này (nhánh `main`). Render sẽ tự đọc file [`render.yaml`](../render.yaml) ở gốc repo (`saigon-guide-api`, region Singapore, Python `3.12.11`, `autoDeployTrigger: checksPass`).
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

Nhờ `autoDeployTrigger: checksPass` trong `render.yaml`, Render chỉ tự động deploy khi các check CI trên `main` xanh.

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

## 9. Luồng CI/CD Tổng Quan

```mermaid
flowchart LR
    Dev["Developer push / PR"] --> GHA["GitHub Actions CI"]
    GHA --> FE["Frontend: npm test + npm run build"]
    GHA --> BE["Backend: ruff + pytest"]
    GHA --> PG["Postgres 16: create_tables x2 + seed_places"]
    FE --> Gate{"CI pass trên main?"}
    BE --> Gate
    PG --> Gate
    Gate -- "Pass" --> Render["Render autoDeployTrigger: checksPass (server/**)"]
    Gate -- "Fail" --> Block["Chặn deploy backend"]
    Render --> Neon[("Neon Postgres Singapore")]
    Dev --> Vercel["Vercel Auto Deploy (client/)"]
    Vercel --> User["Trình duyệt người dùng"]
    User --> Render
```
