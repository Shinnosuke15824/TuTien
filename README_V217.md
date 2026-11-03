# NGHỊCH THIÊN TU LUYỆN — V2.1.7 (SỬA LUẬT TIM & TU VI)

Bản nâng cấp từ V2.1.6, **không xóa dữ liệu, không thay hình boss, background, âm thanh, cửa sổ LIVE 9:16**.

## Luật mới
- Bình luận bất kỳ: **+2 Tu Vi**; hoàn toàn **không gây damage** cho boss. `tiên`/`ma` vẫn dùng để chọn phe.
- Một lượt tim: **+0,1 Tu Vi**; trong trận đánh khi đã vào phe, **1 tim = đúng 1 damage**.
- Ví dụ khi boss đang chiến đấu: 1 tim = 1 damage / +0,1 Tu Vi; 10 tim = 10 damage / +1 Tu Vi; 100 tim = 100 damage / +10 Tu Vi.
- Nếu boss đã hết máu, sát thương thực tế dừng ở số máu còn lại. Tim vẫn được tính Tu Vi khi người xem được nhận dạng, kể cả ngoài trận.
- Thưởng **daily quest** vẫn được cộng riêng (ví dụ: đủ 20 tim được thưởng thêm +30 Tu Vi một lần/ngày); top damage +50 và phe thắng +20 không đổi.

## 9 mốc cảnh giới mới
| Cảnh giới | Tu Vi | Phút tham gia đội hình |
|---|---:|---:|
| Phàm Nhân | 0 | 0 |
| Trúc Cơ Kỳ | 50 | 5 |
| Kết Đan Kỳ | 100 | 15 |
| Nguyên Anh Kỳ | 250 | 25 |
| Hóa Thần Kỳ | 400 | 40 |
| Luyện Hư Kỳ | 550 | 55 |
| Hợp Thể Kỳ | 700 | 65 |
| Đại Thừa Kỳ | 850 | 75 |
| Độ Kiếp Kỳ | 1.100 | 90 |

Người chơi phải đủ **cả Tu Vi và thời gian tham gia đội hình** mới được đột phá. Dữ liệu Tu Vi tích lũy được giữ nguyên.

## Cài bản vá vào dự án hiện tại
1. Đóng Nghịch Thiên Tu Luyện, sao lưu thư mục dự án V2.1.6 (vd: `C:\TuTien`).
2. Giải nén bản vá; chép trực tiếp các file và thư mục `tests` vào **thư mục gốc** dự án. Chọn ghi đè.
3. Mở Terminal của VS Code tại thư mục dự án:
   ```powershell
   npm test
   npm run check:build
   npm start
   ```
4. Ở chế độ Demo, bấm **Gia nhập Tiên Đạo**, **Xuất hiện boss**, **Thử bình luận**, **Thả 10 tim**. Bình luận không trừ máu, 10 tim trừ đúng 10 HP (khi boss còn ít nhất 10 HP).
5. Nếu đang dùng `.exe` cũ thì chạy `npm install` rồi `npm run dist:win` để tạo lại bộ cài Windows.

## Những file thay đổi
- `game-core.js`: mốc cảnh giới, quy tắc damage từ tim, Tu Vi lẻ 0,1.
- `renderer.js`: bảng xếp hạng và tên nhân vật hiển thị chính xác điểm lẻ, sửa nhãn và chẩn đoán.
- `index.html`: văn bản luật chơi và hướng dẫn Demo.
- `tiktok-service.cjs`: giữ số tim trong sự kiện lớn hơn 200 (tới 10.000 mỗi sự kiện) và không biến sự kiện 0 tim thành 1 tim giả.
- `package.json`: version 2.1.7.
- `tests/game.test.cjs`, `tests/damage-diagnostic.test.cjs`, `tests/live-events.test.cjs`: kiểm thử phù hợp luật mới.

**Không có** thay đổi ở kết nối LIVE, bộ 9 ảnh boss, nền Bồng Lai, nhiệm vụ ngày, nhạc, 60 vị trí, popup đột phá hoặc thời gian boss.

## Giới hạn cần biết
- Chỉ tính damage từ tim của người **đã chọn phe và có vị trí trong 60 người**, khi boss đang trong thời gian chiến đấu. Chưa vào phe / đang chờ boss / boss chết: tim vẫn +0,1 Tu Vi nhưng không trừ HP.
- Số lượt tim mà chương trình nhận được phụ thuộc sự kiện TikTok Connector. Một sự kiện có `count=500` được tính 500 tim; đây là con số chương trình nhận, không tự xác minh số lần chạm trên điện thoại.
