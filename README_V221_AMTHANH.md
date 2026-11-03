# Nghịch Thiên Tu Luyện V2.2.1 — Giọng đọc / Nhạc nền độc lập

Bản vá dành cho V2.2.0, chép đè **nội dung** ZIP vào thư mục dự án (ví dụ `C:\TuTien`). Không xoá dữ liệu người chơi.

## 1. Cài đặt

1. Đóng chương trình (kể cả bản `.exe` nếu đang chạy) và sao lưu thư mục dự án.
2. Giải nén ZIP bản vá và chép mọi file, thư mục bên trong vào dự án V2.2.0, chọn ghi đè.
3. Trong VS Code chạy `npm install`, `npm test`, `npm run check:build`, `npm start`.
4. Nếu bạn dùng bản Windows đã được đóng gói thì chạy `npm run dist:win` để tạo bản cài mới. Bản vá mã nguồn không tự thay thế chương trình đã cài.

## 2. Hai bảng âm thanh mới

### Bảng 🎙 Giọng đọc

- Đọc bình luận và thông báo là 2 lựa chọn độc lập.
- Chọn **Giọng Windows** → chọn giọng tiếng Việt đã cài. Nếu mới cài giọng, bấm **Quét lại giọng đã cài**.
- Hoặc chọn **Giọng AI Piper tải từ bên ngoài**:
  1. Tải và giải nén bản Piper dành cho Windows, ví dụ bộ có `piper.exe`. Đặt các file thư viện/DLL đi cùng chương trình trong thư mục gốc của Piper.
  2. Tải bộ giọng Piper (ưu tiên model tiếng Việt tương thích) có **cả hai file**: `ten-model.onnx` và `ten-model.onnx.json` nằm cùng thư mục, cùng tên.
  3. Bấm **Chọn piper.exe** → chọn chương trình đã giải nén.
  4. Bấm **Chọn model giọng .onnx** → chọn file model tiếng Việt.
  5. Bấm **Thử giọng đọc**. Khi có bình luận mới, phần mềm gửi câu đó tới Piper trên máy, tạo WAV tạm và phát. Không có kết nối Internet để tổng hợp giọng.
- Có **âm lượng giọng riêng** (mặc định 95%), **tốc độ riêng** (mặc định 0,95×), nút **Ngừng đọc**.
- Piper là chương trình và model **do bạn tự cung cấp**; bản vá không chứa giọng AI thương mại, không tự tải model hoặc thực hiện chuyển đổi giọng từ MP3.
- Một file MP3/WAV ghi âm giọng của người khác là **âm thanh cố định**, không phải model TTS; không thể chỉ nhập file đó để đọc mọi bình luận mới.

### Bảng ♫ Nhạc nền

- Bấm **Nhập nhạc từ máy** → chọn MP3, WAV, OGG, M4A hoặc FLAC đã tải.
- Nhạc được **sao chép vào thư mục dữ liệu ứng dụng**, không ảnh hưởng file gốc. Giới hạn 200 MB/file. Loại file được nhận không đồng nghĩa mọi codec đều phát được: nếu báo lỗi, hãy đổi nhạc sang MP3 hoặc WAV thông dụng.
- Bấm **Nghe thử nhạc**, bật **Bật nhạc nền (lặp liên tục)**, điều chỉnh **âm lượng nhạc riêng**, hoặc **Tạm dừng**.
- **Dùng nhạc mặc định** để quay lại bài Linh khí nguyên bản.
- Bật **Tự giảm nhạc lúc giọng đọc phát** để nhạc hạ còn 22% của âm lượng đang đặt, sau đó trở lại mức cũ; có thể tắt tùy chọn này.

## 3. Ghi nhớ và an toàn

- Cấu hình giọng, nhạc và âm lượng được lưu cùng cài đặt Studio trong `%APPDATA%\nghich-thien-tu-luyen-studio` (Windows).
- Model và Piper sử dụng đường dẫn đã chọn trên máy. **Nếu di chuyển, đổi tên hoặc xóa** chương trình/model, hãy chọn lại.
- File nhạc được nhập vào thư mục dữ liệu ứng dụng nên vẫn có thể phát nếu bạn xóa file nhạc gốc.
- Việc đọc bình luận và giọng thông báo dùng cùng hàng đợi giọng, các câu thông báo được ưu tiên; nhạc nền luôn phát độc lập.
- Khi phát bằng OBS/TikTok LIVE Studio, cần chọn đúng nguồn **Desktop audio / Application audio** từ máy chạy Studio nếu phần mềm phát video trong cửa sổ riêng; ghi hình cửa sổ LIVE 9:16 chỉ ghi hình, không tự bảo đảm OBS bắt được âm thanh.

## 4. Luật chơi được giữ nguyên

- Bình luận **+2 Tu Vi, không gây sát thương**.
- **1 tim = +0,1 Tu Vi và 1 damage boss** khi đang chiến đấu và đã có phe.
- Đội hình **60 người (30 Tiên / 30 Ma)**; 9 boss xoay vòng vô hạn, mỗi boss 10.000 HP.
- **Chờ 5 phút → đánh boss tối đa 5 phút → chờ 5 phút tiếp**.
- Thăng cấp vẫn cần cả Tu Vi và thời gian tham chiến: 0–5–15–25–40–55–65–75–90 phút.
- Tính năng V2.2.0 gồm Thiên Kiếp, skill, boss biến đổi, linh thú, Tiên Ma Đại Chiến, trang bị, cảnh báo, tiến độ, TOP tuần, sao lưu đều được giữ.

## 5. Kiểm thử

- `npm test`: 67 bài Node.js thành công, gồm 6 bài kiểm thử mới về nguồn âm thanh.
- `npm run check:build`: kiểm tra file mã nguồn và tài nguyên.
- Đã kiểm tra giao diện 2 bảng bằng Chromium/Playwright: đổi nguồn giọng, chọn tốc độ/âm lượng riêng, không phát sinh lỗi JavaScript.
- **Chưa xác minh Piper với model giọng thật trên Windows, giọng cài trong Windows, hoặc đường tiếng trong OBS/TikTok LIVE của người sử dụng.** Chương trình Piper mẫu đã được giả lập trong kiểm thử.
