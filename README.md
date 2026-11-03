# Cập nhật V2.2.1 — Giọng đọc và Nhạc nền tách biệt

Xem `README_V221_AMTHANH.md` để cài giọng Windows/Piper và nhạc đã tải từ ngoài.

# NGHỊCH THIÊN TU LUYỆN — V2.2.0 (10 TÍNH NĂNG MỚI)

Đây là bản nâng cấp **mã nguồn thật** từ V2.1.8. Không phải bản hình demo. Ứng dụng là Electron/Canvas và có cửa sổ LIVE 720 × 1280 cho OBS/TikTok LIVE Studio. Không dùng quà tặng để tăng sát thương hay bán ưu thế.

## 10 tính năng mới

1. **Thiên Kiếp Đột Phá**: khi đủ cả Tu Vi và thời gian tham gia đội hình, màn hình zoom vào người chơi, sét đánh vào pháp trận, thay hào quang/trang phục và đọc tên cảnh giới mới. Có nút *Thử Thiên Kiếp* chỉ trong Demo.
2. **Pháp Thuật Theo Cảnh Giới**: tia phép, kiếm khí, hỏa cầu, kiếm trận, thiên lôi và phù ấn thay đổi theo cấp tu sĩ. **KHÔNG nhân sát thương theo cấp**: 1 tim = đúng 1 damage đối với boss khi đang giao chiến.
3. **Boss Thức Tỉnh/Cuồng Nộ**: boss đổi màu/ánh sáng, tăng kích thước và phát hiệu ứng khi xuống 50% rồi 20% HP. Đòn phản công lúc này trừ 8 và 12 điểm khiên thay vì 6 (không trừ Tu Vi người xem). **HP tối đa của cả 9 boss vẫn là 10.000.** Có nút Demo để thử ngay.
4. **Linh Thú Đồng Hành**: hồ ly từ Kết Đan, tiên hạc từ Hóa Thần, Thanh Long từ Hợp Thể. Tu sĩ phải tự chọn trang bị trong Studio để hiện cạnh nhân vật. Linh thú không cộng damage.
5. **Tiên Ma Đại Chiến**: mỗi 30 phút, ưu tiên mở một sự kiện 60 giây trong **khoảng chờ boss**. Đếm tim theo hai phe, phe có nhiều tim hơn nhận +15 Tu Vi cho mỗi thành viên còn ngồi. **Trong khoảng chờ, tim không trừ HP boss**; điểm tương tác +0,1 Tu Vi/tim vẫn áp dụng. Nếu đến mốc 30 phút khi đang đánh boss, sự kiện sẽ chờ đến pha chuẩn bị kế tiếp. Có nút Demo.
6. **Pháp Bảo & Trang Phục**: 4 áo bào, 4 pháp bảo (tính cả mặc định/không trang bị), 4 lựa chọn linh thú (tính cả không triệu hồi). Mở khóa theo cảnh giới, chọn tu sĩ trong mục Nhiệm vụ rồi chọn trang bị. Các vật phẩm chỉ tác động **hình ảnh**, không tăng damage/tim.
7. **Cảnh báo boss trước 60 giây**: hiện thông điệp và giọng đọc trước lần spawn tiếp theo; có lựa chọn bật/tắt riêng thông báo trong phần Âm thanh. Nếu máy Windows không có giọng tiếng Việt, giọng đọc có thể không đúng hoặc không hoạt động.
8. **Hai thanh tiến độ dưới mỗi tu sĩ**: xanh = Tu Vi, tím = phút tham gia đội hình. Studio cũng có bảng hiển thị số điểm và thời gian còn thiếu để lên cấp.
9. **TOP tuần**: xếp hạng Tu Vi kiếm được trong tuần, tổng tim, damage boss và phút tham chiến. Các bảng tuần được đặt lại vào **thứ Hai (giờ Việt Nam)** mà không đặt lại tổng điểm nhân vật. Trên màn LIVE, bảng bên phải lần lượt chuyển các tiêu chí theo chu kỳ.
10. **Tự động sao lưu & chẩn đoán LIVE**: sao lưu dữ liệu khi có thay đổi, tối thiểu khoảng 5 phút một lần, tối đa 10 bản. Có nút Sao lưu ngay / Khôi phục gần nhất (phải ngắt LIVE trước). Theo dõi số sự kiện chat, like, tổng tim và thời gian từ sự kiện cuối; giúp nhận biết app có thực sự nhận dữ liệu LIVE hay không.

## Luật chơi đã giữ nguyên

- Bình luận bình thường: **+2 Tu Vi, 0 damage**. Bình luận `tiên` hoặc `ma` để chọn phe.
- Thả **1 tim = +0,1 Tu Vi và 1 damage** (chỉ khi đã ở trong đội hình, đang đánh boss). Tim trong thời gian chờ vẫn +0,1 Tu Vi, không đánh boss.
- Follow +30 Tu Vi, share +20 Tu Vi; nhiệm vụ ngày và thưởng TOP/đội thắng cộng **riêng**.
- **60 vị trí cố định**: 30 Tiên Đạo + 30 Ma Đạo, không tự đuổi người sau 5 phút.
- **9 boss, mỗi boss 10.000 HP**. Mới LIVE: chờ 5 phút không có boss → đánh 5 phút tối đa → boss biến mất → chờ lại 5 phút, quay vòng qua cả 9 boss vô hạn. Boss chết sớm thì bắt đầu chờ 5 phút mới.
- 9 cấp với các mốc **Tu Vi** 0 / 50 / 100 / 250 / 400 / 550 / 700 / 850 / 1.100 và **thời gian tham gia** 0 / 5 / 15 / 25 / 40 / 55 / 65 / 75 / 90 phút. Cần đủ cả hai điều kiện.
- Giữ nguyên nền Bồng Lai tiên cảnh từ ảnh bạn cung cấp và **9 ảnh boss riêng của V2.1.4**.

## Cài bản vá lên V2.1.8

1. **Thoát hoàn toàn** phần mềm, ngắt TikTok LIVE và sao lưu thư mục mã nguồn, cũng như dữ liệu trong `%APPDATA%\\nghich-thien-tu-luyen-studio` nếu có.
2. Giải nén `NghichThien_V220_BanVa.zip`, **chép tất cả các file/thư mục bên trong** vào gốc dự án V2.1.8 (ví dụ `C:\\TuTien`), chọn **Replace** khi hỏi ghi đè.
3. Mở Terminal trong thư mục dự án:

```powershell
npm install
npm test
npm run check:build
npm start
```

4. Trên Studio, chọn tu sĩ trong **Nhiệm vụ**, mở phần **Pháp Bảo · Trang Phục · Linh Thú** để chọn đồ. Dùng **Thử Thiên Kiếp** trong Demo để xem hiệu ứng nhanh, **Thử Đại Chiến** để kiểm tra điểm tim hai phe và **Thử boss cuồng nộ** để kiểm tra lúc 20% HP.
5. Nếu sử dụng EXE được đóng gói trước đây, **mã nguồn cập nhật không tự cập nhật EXE đã cài**. Chạy `npm run dist:win` trên máy có bộ công cụ Electron để tạo bộ cài mới tại `release/`.

## Lưu & khôi phục

Dữ liệu vẫn nằm ở thư mục `%APPDATA%\\nghich-thien-tu-luyen-studio`, tên tệp chính `nghichthien-data-v2.json`, các bản sao lưu ở thư mục `backups`. Lưu trữ sử dụng tên tệp được kiểm tra chặt, không chấp nhận đường dẫn tùy ý. Khi khôi phục phải xác nhận trước; chương trình sao lưu tình trạng hiện tại rồi mới khôi phục và tải lại Studio. **Hãy ngắt LIVE trước khi khôi phục.**

TOP tuần và trang bị sử dụng bản dữ liệu lưu **V7**. Có thể nạp dữ liệu V2–V6, tự khởi tạo các trường mới. Tu Vi, ghế, phe, điểm nhiệm vụ và thời gian cũ được giữ. Không dùng dữ liệu này để xác thực thời gian **người xem thực tế** đang mở TikTok: đó là thời gian nhân vật có mặt trong đội hình khi ứng dụng đang chạy. Chuyển tài khoản TikTok kết nối hay thay đổi tên có thể làm sai lệch việc ghép danh tính nếu nguồn TikTok không gửi ID nhất quán.

## Giới hạn kiểm thử

- `npm test`: kiểm tra gameplay/tiến độ, boss/duel, tuần, đồ mở khóa, lưu phiên cũ, backup, xử lý dữ liệu TikTok mô phỏng.
- `python scripts/visual_test.py`: kiểm tra giao diện 9:16, 60 người và 28 ảnh đang tải.
- `python scripts/v22_smoke.py`: kiểm tra tab mới, trang bị linh thú, duel, boss 50/20%, và lỗi JavaScript bằng Chromium.
- **Chưa thể xác nhận kết nối với LIVE TikTok thực tế trên máy Windows của bạn**, chưa thử giọng đọc Windows, và chưa tạo sẵn một installer `.exe`.

Các hiệu ứng, linh thú và pháp bảo dùng Canvas 2D kết hợp 9 ảnh boss hiện có; chưa phải mô hình 3D điều khiển bằng xương.
