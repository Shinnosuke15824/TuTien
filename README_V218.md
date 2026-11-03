# Nghịch Thiên Tu Luyện V2.1.8 — Chu kỳ boss 5 + 5 phút

## Luật mới
- Khi **bắt đầu kết nối TikTok LIVE thành công**, màn hình chỉ có phong cảnh Bồng Lai và đội hình tu sĩ. **Không có boss trong 5 phút đầu tiên**.
- Đúng 05:00, boss đầu tiên xuất hiện với **10.000 HP**, thời gian đánh tối đa **05:00**.
- Hết 5 phút chiến đấu, hoặc khi boss bị hạ sớm, boss **biến mất ngay**. Phần mềm **bắt đầu một bộ đếm chờ 05:00 mới**.
- Hết 5 phút chờ, boss kế tiếp trong danh sách 9 boss xuất hiện. Sau boss thứ 9 lại quay về boss thứ 1, lặp vô hạn.
- Ví dụ, nếu không boss nào bị hạ sớm: 00:00–05:00 chờ; 05:00–10:00 đánh; 10:00–15:00 chờ; 15:00–20:00 đánh; ...
- **Thắng boss sớm**: nếu hạ boss ở phút 07:30, boss tiếp theo xuất hiện ở phút **12:30** (sau 5 phút chờ mới).

## Giữ nguyên
- 60 người chia đều 30 Tiên Đạo / 30 Ma Đạo, không hết hạn ghế.
- Bình luận +2 Tu Vi, không đánh boss; 1 tim +0,1 Tu Vi và gây 1 damage trong lúc chiến đấu.
- Follow/share, daily quest, thưởng top sát thương +50, phe thắng +20 cho mỗi thành viên còn trong đội hình.
- 9 boss, tài nguyên ảnh V2.1.7, Bồng Lai tiên cảnh, giọng đọc, cửa sổ LIVE 9:16.
- Mốc thăng cấp: Tu Vi 0, 50, 100, 250, 400, 550, 700, 850, 1100; thời gian 0, 5, 15, 25, 40, 55, 65, 75, 90 phút.

## Cách cài bản vá từ V2.1.7
1. Đóng Nghịch Thiên Tu Luyện; sao lưu dự án và dữ liệu.
2. Giải nén ZIP rồi chép các file vào thư mục gốc dự án; chép `tests/game.test.cjs` vào thư mục `tests`.
3. Giữ nguyên toàn bộ thư mục `assets` — **bản vá không chứa/tác động vào hình boss**.
4. Chạy `npm test` rồi `npm start`.
5. Thử **Demo**: chọn phe, nhấn `Xuất hiện boss ngay (Demo)`, thả 10 tim để thấy boss giảm đúng 10 HP. Chờ tự động được mô phỏng bởi các bài test `npm test`.

## Chú ý khi cập nhật save cũ
- Trạng thái trận đấu cũ V2.1.7 tự đổi thành **chờ boss 5 phút**, nhưng giữ tên, phe, ghế, Tu Vi và nhiệm vụ của mọi người.
- Khi TikTok LIVE kết nối thành công **lần đầu trong phiên**, bộ đếm chờ sẽ bắt đầu từ 05:00. Nếu mất mạng rồi tự kết nối lại, đồng hồ không bị khởi động lại.
- Chế độ Demo có nút **Xuất hiện boss ngay** chỉ để thử chức năng; nút này không thay luật LIVE thật.
- Mã nguồn chưa xác nhận kết nối LIVE thực tế trên Windows của bạn; hãy kiểm tra ở Studio sau cập nhật.
