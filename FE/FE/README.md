# Sài Gòn Guide — Hướng dẫn chạy ứng dụng

Tài liệu này hướng dẫn thành viên trong nhóm cài đặt và chạy phiên bản frontend của Sài Gòn Guide trên máy cá nhân.

## 1. Yêu cầu

- Cài [Node.js phiên bản 20 trở lên](https://nodejs.org/). Khi cài Node.js, npm sẽ được cài kèm.
- Tải hoặc clone toàn bộ dự án về máy. Không chỉ chép riêng thư mục `src`.

> Ghi chú: Nếu thư mục dự án tải về có cấu trúc `FE/FE`, hãy mở thư mục con `FE` bên trong — nơi chứa `package.json`.

## 2. Cài đặt và chạy lần đầu

Mở Terminal (PowerShell, Command Prompt hoặc Terminal trong VS Code), chuyển đến thư mục chứa `package.json`, rồi chạy:

```bash
npm install
npm run dev
```

Khi terminal hiện địa chỉ local, mở địa chỉ đó trong trình duyệt. Thông thường là:

```text
http://localhost:5173
```

Giữ terminal đang chạy trong lúc sử dụng trang web. Nhấn `Ctrl + C` trong terminal để dừng ứng dụng.

## 3. Những lần chạy tiếp theo

Sau khi đã cài thư viện ở bước trên, lần sau chỉ cần mở terminal tại thư mục chứa `package.json` và chạy:

```bash
npm run dev
```

Nếu cổng `5173` đang được ứng dụng khác sử dụng, Vite sẽ hiển thị một địa chỉ khác trong terminal. Hãy mở đúng địa chỉ được hiển thị.

## 4. Các trang chính

| Đường dẫn | Nội dung |
| --- | --- |
| `/` | Trang chủ và form lên kế hoạch |
| `/trips` | Danh sách chuyến đi mẫu và chuyến đã tạo |
| `/trip/:id` | Lịch trình, ngân sách, bản đồ và khung chat |
| `/s/:token` | Trang xem lịch trình được chia sẻ |
| `/settings` | Cài đặt |

## 5. Lưu ý về phiên bản hiện tại

- Đây là bản frontend xem trước, chưa kết nối backend, cơ sở dữ liệu hoặc dịch vụ AI thật.
- Chuyến đi và cài đặt được lưu trong `localStorage` của trình duyệt trên từng máy. Dữ liệu không tự đồng bộ giữa các thành viên.
- Các ảnh sử dụng trong giao diện nằm trong `public/images`. Giữ nguyên thư mục này khi gửi dự án.
- Có thể đổi ngôn ngữ Việt/Anh bằng nút ngôn ngữ trên thanh điều hướng.
