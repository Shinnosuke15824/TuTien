# ⚔️ NGHỊCH THIÊN TU LUYỆN — TIKTOK LIVE STUDIO

**Phiên bản:** `2.2.1` · **Nền tảng:** Windows · **Công nghệ:** Electron, JavaScript, HTML/CSS, Canvas 2D, Node.js

**Nghịch Thiên Tu Luyện** là ứng dụng game tu tiên tương tác với **TikTok LIVE**. Người xem bình luận để gia nhập **Tiên Đạo** hoặc **Ma Đạo**, tích lũy **Tu Vi**, đột phá **9 cảnh giới**, thả tim để gây sát thương lên boss và cùng phe tham gia các sự kiện. Ứng dụng có cửa sổ phát hình **9:16** riêng để sử dụng với **OBS Studio** hoặc **TikTok LIVE Studio**.

> **Lưu ý:** Đây là dự án ứng dụng desktop, **không phải website để chạy trực tiếp trên GitHub Pages**. TikTok LIVE được kết nối qua thư viện bên thứ ba `tiktok-live-connector`, không phải API chính thức của TikTok; kết nối thực tế có thể phụ thuộc phiên bản thư viện, trạng thái phiên LIVE và chính sách TikTok.

## 📸 Hình ảnh minh họa

<p align="center">
  <img src="preview_v220_formation.png" alt="Đội hình 60 tu sĩ trên màn hình LIVE" width="260" />
  <img src="preview_v220_boss_20.png" alt="Boss cuồng nộ khi còn 20 phần trăm máu" width="260" />
  <img src="preview_audio_voice_v221.png" alt="Cài đặt giọng đọc V2.2.1" width="260" />
</p>

*Các ảnh trên là ảnh thử giao diện được kèm trong mã nguồn. Nếu ảnh không hiển thị trên GitHub, hãy kiểm tra chúng đã được commit cùng `README.md`.*

---

## ✨ Tính năng chính

| Nhóm | Chức năng |
| --- | --- |
| **Tương tác TikTok LIVE** | Nhận bình luận, tim, lượt theo dõi, chia sẻ; chẩn đoán và thử kết nối lại khi mất mạng |
| **Tiên Đạo / Ma Đạo** | Tối đa **60 tu sĩ**, chia đều **30 người/phe**, không tự hết hạn vị trí |
| **9 cảnh giới** | Tăng cấp khi đạt **đủ Tu Vi và thời gian trong đội hình**; có hiệu ứng Thiên Kiếp |
| **9 boss** | **10.000 HP/boss**, chờ 5 phút → đánh tối đa 5 phút → chờ 5 phút; xoay vòng vô hạn |
| **Kỹ năng pháp thuật** | Kiếm khí, hỏa cầu, thiên lôi, kiếm trận và hiệu ứng khác theo cảnh giới |
| **Boss thức tỉnh** | Biến đổi hiệu ứng ở **50% HP**, cuồng nộ ở **20% HP** |
| **Linh thú & trang bị** | Trang phục, pháp bảo, linh thú mở khóa theo cảnh giới; chỉ ảnh hưởng ngoại hình và hiệu ứng |
| **Tiên Ma Đại Chiến** | Sự kiện đua tim khoảng **30 phút/lần**, diễn ra khi đang chờ boss |
| **Nhiệm vụ & xếp hạng** | 7 nhiệm vụ ngày, TOP sát thương boss, TOP Tu Vi và các bảng TOP tuần |
| **Âm thanh** | Giọng đọc tiếng Việt và nhạc nền được cài đặt **độc lập**; có thể nhập nhạc ngoài và giọng Piper |
| **Lưu trữ** | Lưu tiến độ, sao lưu/khôi phục dữ liệu và hiển thị chẩn đoán sự kiện LIVE |
| **Phát trực tiếp** | Cửa sổ LIVE riêng tỷ lệ **9:16**, nền Bồng Lai tiên cảnh và 9 ảnh boss |

### Luật tương tác

| Hành động người xem | Tu Vi cơ bản | Sát thương boss |
| --- | ---: | ---: |
| Bình luận bất kỳ | **+2** | **0** |
| Thả **1 tim** | **+0,1** | **1** nếu đang đánh boss |
| Thả **10 tim** | **+1** | **10** nếu đang đánh boss |
| Theo dõi kênh | **+30** (một lần/người trong dữ liệu ứng dụng) | 0 |
| Chia sẻ LIVE | **+20** (có chống lặp) | 0 |

**Cách gia nhập phe:** Bình luận `tiên` để vào **Tiên Đạo** hoặc `ma` để vào **Ma Đạo**. Hệ thống có hỗ trợ một số cách viết tương đương và nhận cả tiếng Việt có dấu.

**Quy tắc sát thương:** Bình luận **không đánh boss**. Tim chỉ gây damage khi người chơi đã có vị trí trong phe và boss đang ở trạng thái **chiến đấu**. Trong lúc chờ boss, tim vẫn cộng +0,1 Tu Vi/tim nhưng **không gây sát thương**. Phần thưởng nhiệm vụ và sự kiện được cộng riêng với Tu Vi cơ bản.

### Hệ thống 9 cảnh giới

Người chơi phải **đạt cả hai điều kiện** sau mới đột phá:

| STT | Cảnh giới | Tu Vi tối thiểu | Thời gian tham gia tích lũy |
| ---: | --- | ---: | ---: |
| 1 | Phàm Nhân | 0 | 0 phút |
| 2 | Trúc Cơ Kỳ | 50 | 5 phút |
| 3 | Kết Đan Kỳ | 100 | 15 phút |
| 4 | Nguyên Anh Kỳ | 250 | 25 phút |
| 5 | Hóa Thần Kỳ | 400 | 40 phút |
| 6 | Luyện Hư Kỳ | 550 | 55 phút |
| 7 | Hợp Thể Kỳ | 700 | 65 phút |
| 8 | Đại Thừa Kỳ | 850 | 75 phút |
| 9 | Độ Kiếp Kỳ | 1.100 | 90 phút |

**Quan trọng:** “Thời gian tham gia” là thời gian nhân vật có mặt trong đội hình **khi ứng dụng đang chạy**, không phải phép đo chứng minh người xem thực sự đang mở TikTok. Thời gian không tự tích lũy khi ứng dụng đã tắt.

### Chu kỳ 9 boss

1. **Hỏa Kỳ Lân Ma Tôn**
2. **Huyết Ảnh Lang Vương**
3. **Lôi Đình Cự Viên**
4. **Cửu U Xà Hoàng**
5. **Thiên Ma Kiếm Chủ**
6. **Băng Phách Hồ Yêu**
7. **U Minh Quỷ Tướng**
8. **Thôn Thiên Côn Bằng**
9. **Cổ Thần Ma Đế**

Mỗi boss có **10.000 HP**. Khi bắt đầu phiên LIVE, màn hình **chờ 5 phút không có boss**; sau đó boss xuất hiện để người chơi đánh trong **tối đa 5 phút**. Hết giờ hoặc boss bị hạ thì boss biến mất và **bắt đầu đếm chờ 5 phút mới**. Sau boss thứ 9, trò chơi quay về boss thứ 1 và tiếp tục không giới hạn số vòng.

- Boss xuống **50% HP**: xuất hiện hiệu ứng thức tỉnh.
- Boss xuống **20% HP**: chuyển sang trạng thái cuồng nộ, phản công mạnh hơn vào **khiên phe**.
- Phe gây sát thương nhiều hơn nhận thưởng khi kết thúc trận; người đứng đầu sát thương nhận thưởng TOP.
- Sự kiện **Tiên Ma Đại Chiến** hoạt động riêng trong thời gian chờ boss: hai phe đua tim trong 60 giây và phe thắng được thưởng Tu Vi.

### Nhiệm vụ hằng ngày

| Nhiệm vụ | Phần thưởng Tu Vi |
| --- | ---: |
| Bình luận 5 lần | +20 |
| Thả 20 tim | +30 |
| Theo dõi kênh | +30 |
| Chia sẻ LIVE | +40 |
| Tham gia đánh boss | +25 |
| Gây 20 sát thương boss | +35 |
| Gia nhập một phe | +10 |

Nhiệm vụ được làm mới theo **ngày tại Việt Nam**. Tổng Tu Vi đã nhận không bị xóa khi làm mới nhiệm vụ.

---

## 🛠 Công nghệ và cấu trúc dự án

- **Electron**: ứng dụng Windows, cửa sổ quản lý Studio và cửa sổ LIVE riêng.
- **JavaScript + HTML + CSS**: giao diện và xử lý tương tác.
- **Canvas 2D**: nhân vật, boss, pháp thuật, hiệu ứng và nền 9:16.
- **Node.js**: xử lý sự kiện, lưu dữ liệu, âm thanh và kiểm thử.
- **`tiktok-live-connector`**: đọc sự kiện TikTok LIVE khi có thể kết nối.
- **Windows Speech Synthesis / Piper**: hai lựa chọn tổng hợp giọng đọc.

```text
TuTien/
├── assets/                       # Ảnh nền, boss, nhân vật, âm thanh mặc định
├── build/                        # Biểu tượng ứng dụng Windows
├── scripts/                      # Kiểm tra đóng gói và công cụ hỗ trợ
├── tests/                        # Kiểm thử gameplay, LIVE, boss, lưu trữ, âm thanh
├── audio-service.cjs             # Nhạc ngoài và xử lý giọng Piper
├── game-core.js                  # Luật game, Tu Vi, cảnh giới, boss, nhiệm vụ
├── index.html                    # Giao diện Studio
├── renderer.js                   # Render Canvas và xử lý giao diện
├── style.css                     # Giao diện quản lý
├── live-output.html              # Cửa sổ phát LIVE 9:16
├── live-output.css
├── live-output-*.js              # Truyền hình ảnh và tín hiệu cho cửa sổ LIVE
├── main.js                       # Electron main process, IPC, cửa sổ
├── preload.js                    # Giao tiếp an toàn giữa giao diện và Electron
├── persistent-store.cjs          # Lưu dữ liệu, sao lưu, khôi phục
├── tiktok-service.cjs            # Kết nối và chuẩn hóa sự kiện TikTok
├── package.json                  # Thư viện, lệnh chạy và build
└── README.md                     # Tài liệu dự án
```

*Danh sách trên tóm tắt các thành phần chính; thư mục còn có tài nguyên và tài liệu theo phiên bản.*

---

## 🚀 Cài đặt và chạy ứng dụng

### Yêu cầu

- **Windows 10/11 (x64)** để chạy và đóng gói bản cài Windows.
- **Node.js và npm** (nên sử dụng bản LTS còn được hỗ trợ).
- **Git** nếu muốn tải hoặc cập nhật mã nguồn từ GitHub.
- **OBS Studio** hoặc **TikTok LIVE Studio** nếu muốn phát hình lên LIVE.

### Chạy từ mã nguồn

Nếu dự án đã ở `C:\TuTien`, mở Terminal của VS Code và chạy:

```powershell
cd C:\TuTien
npm install
npm test
npm run check:build
npm start
```

Nếu bạn có quyền truy cập repository GitHub, cũng có thể tải mã nguồn bằng Git:

```powershell
git clone https://github.com/Shinnosuke15824/TuTien.git
cd TuTien
npm install
npm start
```

> Repository riêng tư (Private) yêu cầu tài khoản được cấp quyền. `npm install` cần kết nối Internet để tải các thư viện phụ thuộc.

### Đóng gói bộ cài `.exe` cho Windows

```powershell
npm run dist:win
```

File cài dự kiến được xuất vào:

```text
release/NghichThienTuLuyen-Setup-2.2.1-x64.exe
```

Đây là **bộ cài NSIS**. Không đưa `node_modules/`, `release/` hoặc file EXE được build vào lịch sử mã nguồn thông thường; nếu muốn chia sẻ bộ cài, hãy tải nó lên mục **GitHub Releases**. File `.exe` chỉ có sau khi quá trình build trên Windows hoàn tất thành công.

---

## 🎮 Cách sử dụng

### Chơi thử không cần TikTok LIVE

1. Khởi động ứng dụng bằng `npm start`.
2. Vào phần **Thử tính năng không cần LIVE**.
3. Tạo một tu sĩ thử nghiệm, chọn **Gia nhập Tiên Đạo** hoặc **Gia nhập Ma Đạo**.
4. Dùng nút **Xuất hiện boss ngay (Demo)** để bỏ qua thời gian chờ trong lượt thử.
5. Dùng **Thử bình luận** và **Thả tim** để xem Tu Vi và HP boss thay đổi.
6. Thử các tính năng Thiên Kiếp, Tiên Ma Đại Chiến và boss cuồng nộ bằng các nút Demo tương ứng.

### Kết nối TikTok LIVE

1. Mở một phiên LIVE thật từ tài khoản TikTok của bạn.
2. Vào phần **Kết nối TikTok LIVE** trong Studio.
3. Nhập **username** của tài khoản đang phát (ví dụ `@ten_tai_khoan`). **Room ID** có thể để trống nếu không biết.
4. Bấm **Kết nối LIVE** và theo dõi trạng thái hoặc **Chi tiết chẩn đoán**.
5. Người xem bình luận `tiên`/`ma` để gia nhập; trong trận đánh boss, thả tim để gây sát thương.
6. Nếu tim không được tính, kiểm tra trạng thái boss, phe, vị trí của người xem và nhật ký sự kiện.

**Lưu ý kết nối:** Thư viện TikTok LIVE không chính thức có thể bị ảnh hưởng bởi thay đổi của TikTok. Một lượt kết nối thành công trong chế độ Demo không chứng minh khả năng nhận dữ liệu từ LIVE thật.

### Phát hình lên OBS / TikTok LIVE Studio

1. Trong Studio bấm **Mở màn hình LIVE**.
2. Mở OBS hoặc TikTok LIVE Studio, thêm nguồn **Window Capture / Chụp cửa sổ**.
3. Chọn cửa sổ **“Nghịch Thiên Tu Luyện — LIVE 9:16”**.
4. Thiết lập khung phát dọc (ví dụ **1080 × 1920**), căn chỉnh cửa sổ LIVE cho vừa khung.
5. Đảm bảo OBS/TikTok LIVE Studio **bắt được âm thanh ứng dụng hoặc âm thanh máy tính** nếu bạn muốn phát giọng đọc và nhạc nền. Chụp hình cửa sổ không đồng nghĩa với tự động thu được âm thanh.

---

## 🎙 Giọng đọc và 🎵 nhạc nền (V2.2.1)

Hai phần cài đặt **độc lập**; có thể thay đổi âm lượng và bật/tắt riêng.

### Giọng đọc

- Chọn **giọng đã cài trong Windows** và thiết lập âm lượng/tốc độ.
- Hoặc dùng **Piper TTS** tải từ bên ngoài: chọn `piper.exe`, một model `ten-model.onnx` và file cấu hình **cùng tên** `ten-model.onnx.json` đặt cạnh model.
- Có các tùy chọn đọc bình luận, đọc thông báo, thử giọng và dừng đọc.
- Một file **MP3/WAV ghi âm sẵn không phải model TTS** và không thể tự đọc bình luận mới của người xem.
- Piper/model không nằm sẵn trong dự án; bạn cần tải và cài đặt riêng. Chất lượng giọng phụ thuộc model đã chọn.

### Nhạc nền

- Có thể dùng nhạc mặc định hoặc nhập nhạc từ máy: **MP3, WAV, OGG, M4A, FLAC**.
- Có nút nghe thử, phát lặp, tạm dừng và điều chỉnh âm lượng riêng.
- Có tùy chọn **tự giảm nhạc khi giọng đọc phát** để dễ nghe lời bình luận.
- File nhạc được sao chép vào thư mục dữ liệu ứng dụng; một số định dạng/codec có thể không được phát trên mọi máy. Hãy thử MP3 hoặc WAV nếu gặp lỗi.

Xem hướng dẫn chi tiết: [`README_V221_AMTHANH.md`](README_V221_AMTHANH.md).

---

## 💾 Dữ liệu người chơi, sao lưu và bảo mật

Dữ liệu ứng dụng Windows được lưu **ngoài thư mục cài đặt**, tại:

```text
%APPDATA%\nghich-thien-tu-luyen-studio\
├── nghichthien-data-v2.json
└── backups\
```

- Tiến độ gồm Tu Vi, cảnh giới, thời gian tham gia, phe, vị trí, nhiệm vụ, trang bị và các thông tin phiên chơi.
- Có chức năng **Sao lưu ngay**, tự động sao lưu và khôi phục bản gần nhất. **Ngắt kết nối LIVE trước khi khôi phục**.
- Mã dữ liệu lưu hiện dùng **V7** và có hỗ trợ đọc các định dạng lưu cũ trong `game-core.js`.
- **Không commit** dữ liệu người chơi, file cấu hình cá nhân, token/cookie hoặc file ghi log nhạy cảm lên GitHub.
- Các phép thuật, trang bị và linh thú chủ yếu là **hiệu ứng hình ảnh**, không làm tăng damage của một tim.
- Dự án **không sử dụng quà tặng TikTok để bán sức mạnh hay cộng sát thương**.

### Khuyến nghị `.gitignore`

```gitignore
node_modules/
release/
dist/
out/
*.tmp
*.log
.env
.env.*
!.env.example
backups/
user-data/
*.exe
*.zip
```

**Không** thêm `assets/` vào `.gitignore` nếu muốn đưa ảnh boss, nền và âm thanh mặc định lên GitHub. Hãy kiểm tra giấy phép sử dụng đối với ảnh, nhạc và model bên ngoài trước khi công khai repository.

---

## ✅ Kiểm thử

Chạy kiểm tra gameplay, nguồn LIVE giả lập và hệ thống âm thanh:

```powershell
npm test
npm run check:build
```

**Kết quả được báo cáo ở bản V2.2.1:** tổng **67** bài test, **66 đạt**, **0 thất bại**, **1 bỏ qua**. Bài bỏ qua liên quan việc chạy Piper thực tế để tạo WAV; cần bộ Piper và model giọng phù hợp trên Windows để thử đầy đủ.

Các kiểm thử tự động không thay thế việc kiểm tra trên tài khoản TikTok LIVE thật, thử audio Windows/Piper thật hay xác minh nguồn âm thanh của OBS.

### Một số lỗi thường gặp

| Hiện tượng | Cách kiểm tra |
| --- | --- |
| `npm` không được nhận diện | Cài Node.js, mở lại VS Code/Terminal |
| Lỗi thiếu package | Chạy lại `npm install` trong đúng thư mục dự án |
| Không gây sát thương | Đảm bảo đã vào phe, đang **battle**, có nhận tim thật; bình luận không gây damage |
| Hình boss không xuất hiện lúc đầu | Đây là hành vi đúng: **chờ 5 phút** trước khi spawn |
| Giọng đọc không hoạt động | Kiểm tra giọng Windows hoặc đường dẫn `piper.exe`, `.onnx`, `.onnx.json` |
| Nhạc ngoài không phát | Thử MP3/WAV và xem trạng thái trong bảng Nhạc nền |
| OBS không có tiếng | Thêm hoặc chọn đúng nguồn thu **Desktop/Application audio** |
| Dữ liệu không khôi phục được | Ngắt LIVE, kiểm tra danh sách sao lưu; nên sao chép dữ liệu trước khi thao tác |

---

## 📁 Tài liệu theo phiên bản

- [`README_V217.md`](README_V217.md) — Cơ chế sát thương từ tim và tính Tu Vi theo bước 0,1.
- [`README_V218.md`](README_V218.md) — Chu kỳ boss 5 phút chờ / 5 phút chiến đấu.
- [`README_V220.md`](README_V220.md) — 10 tính năng trong bản V2.2.
- [`README_V221_AMTHANH.md`](README_V221_AMTHANH.md) — Giọng đọc Windows/Piper và nhạc nền nhập từ máy.

## 📌 Trạng thái phát triển

Phiên bản hiện tại **V2.2.1** dành cho mục đích phát triển và vận hành ứng dụng tương tác LIVE trên Windows. Phần hiển thị là **Canvas 2D**, không phải mô hình nhân vật/boss 3D có xương. Cần tự kiểm tra kết nối TikTok, âm thanh và quyền sử dụng tài nguyên trên môi trường LIVE của bạn.

**Giấy phép:** Repository chưa xác định giấy phép sử dụng mã nguồn trong tài liệu này. Nếu bạn muốn công khai để người khác sử dụng, sao chép hoặc đóng góp, hãy chọn và thêm tệp `LICENSE` phù hợp; không nên mặc định là MIT khi chưa có tệp giấy phép.

---

**Dự án: Nghịch Thiên Tu Luyện — TikTok LIVE Studio · V2.2.1**
