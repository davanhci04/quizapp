# Database Design — Quiz Application System

Tài liệu này là nguồn chuẩn (source of truth) cho thiết kế cơ sở dữ liệu.
Mọi Entity / DbContext / Migration phải khớp với tài liệu này.
Sơ đồ ERD: `docs/Figure8_ERD_QuestionBank.png`

---

## Nguyên tắc chung

- Dùng **EF Core Code-First**. Schema được sinh ra từ Entity classes + Migration.
- **KHÔNG sửa schema trực tiếp trong SSMS.** Mọi thay đổi phải đi qua Migration.
- Tên bảng trong DB: số ít, PascalCase (`Quiz`, `QuizQuestion`, `AttemptAnswer`).
- Mọi khóa chính là `int`, `IDENTITY(1,1)`.
- Mọi cột thời gian dùng `datetime2`.

---

## 1. Role

| Column | Type | Constraint |
|---|---|---|
| role_id | int | PK, identity |
| role_name | nvarchar(20) | NOT NULL, UNIQUE |
| description | nvarchar(200) | NULL |

Dữ liệu seed bắt buộc: `Admin`, `User`.

---

## 2. User

| Column | Type | Constraint |
|---|---|---|
| user_id | int | PK, identity |
| role_id | int | FK → Role.role_id, NOT NULL |
| username | nvarchar(50) | NOT NULL, UNIQUE |
| email | nvarchar(100) | NOT NULL, UNIQUE |
| password_hash | nvarchar(255) | NOT NULL |
| status | nvarchar(20) | NOT NULL, default `Active` |
| created_at | datetime2 | NOT NULL, default UTC now |

- `status` nhận: `Active`, `Inactive`, `Locked`.
- `password_hash` lưu hash (BCrypt hoặc ASP.NET Identity PasswordHasher). **Không bao giờ lưu plaintext.**
- Quy tắc khóa tài khoản: sai mật khẩu 5 lần liên tiếp → `Locked` trong 30 phút.

---

## 3. Quiz

| Column | Type | Constraint |
|---|---|---|
| quiz_id | int | PK, identity |
| created_by | int | FK → User.user_id, NOT NULL |
| title | nvarchar(200) | NOT NULL |
| description | nvarchar(500) | NULL |
| duration | int | NOT NULL, tính bằng phút |
| passing_score | decimal(5,2) | NOT NULL, ngưỡng đạt |
| status | nvarchar(20) | NOT NULL, default `Draft` |
| is_public | bit | NOT NULL, default 0 |
| created_at | datetime2 | NOT NULL |

- `status` nhận: `Draft`, `Published`, `Archived`.
- Chỉ quiz `Published` mới cho User làm bài.
- `is_public = 1` thì Guest thấy được trong danh sách quiz công khai.

---

## 4. Question  (Question Bank — dùng chung)

| Column | Type | Constraint |
|---|---|---|
| question_id | int | PK, identity |
| created_by | int | FK → User.user_id, NOT NULL |
| content | nvarchar(max) | NOT NULL |
| question_type | nvarchar(30) | NOT NULL |
| category | nvarchar(100) | NULL |
| difficulty | nvarchar(20) | NULL |
| status | nvarchar(20) | NOT NULL, default `Active` |
| created_at | datetime2 | NOT NULL |

- **Question KHÔNG có `quiz_id`.** Câu hỏi độc lập, thuộc ngân hàng dùng chung.
- `question_type` nhận: `MultipleChoice`, `SingleChoice`, `TrueFalse`, `FillInTheBlanks`, `ShortAnswer`, `LongAnswer`.
- `difficulty` nhận: `Easy`, `Medium`, `Hard`.
- `status` nhận: `Active`, `Archived`. Câu hỏi đã được trả lời trong bài nộp thì archive, không xóa cứng.
- `category` dùng để lọc khi Admin tìm câu hỏi trong ngân hàng.

---

## 5. QuizQuestion  (bảng trung gian N-N)

| Column | Type | Constraint |
|---|---|---|
| quiz_question_id | int | PK, identity |
| quiz_id | int | FK → Quiz.quiz_id, NOT NULL |
| question_id | int | FK → Question.question_id, NOT NULL |
| display_order | int | NOT NULL |
| score_weight | decimal(5,2) | NOT NULL, default 1.00 |

- UNIQUE constraint trên cặp (`quiz_id`, `question_id`) — một câu hỏi chỉ xuất hiện tối đa 1 lần trong cùng 1 quiz.
- `display_order` và `score_weight` thuộc về bảng này, **KHÔNG** thuộc Question — vì cùng một câu hỏi có thể ở vị trí khác nhau và có điểm khác nhau tùy từng quiz.
- Xóa Quiz → xóa các dòng QuizQuestion (cascade), nhưng **KHÔNG** xóa Question.

---

## 6. Answer

| Column | Type | Constraint |
|---|---|---|
| answer_id | int | PK, identity |
| question_id | int | FK → Question.question_id, NOT NULL |
| answer_text | nvarchar(500) | NOT NULL |
| is_correct | bit | NOT NULL, default 0 |
| display_order | int | NOT NULL |

- Ràng buộc nghiệp vụ (validate ở tầng service, không phải DB constraint):
  mỗi Question phải có **>= 2 Answer** và **>= 1 Answer có `is_correct = 1`**.
- Xóa Question → cascade xóa Answer.

---

## 7. QuizAttempt

| Column | Type | Constraint |
|---|---|---|
| attempt_id | int | PK, identity |
| quiz_id | int | FK → Quiz.quiz_id, NOT NULL |
| user_id | int | FK → User.user_id, NOT NULL |
| started_at | datetime2 | NOT NULL |
| submitted_at | datetime2 | NULL |
| total_score | decimal(5,2) | NULL |
| is_passed | bit | NULL |
| status | nvarchar(20) | NOT NULL, default `InProgress` |

- `status` nhận: `InProgress`, `Submitted`, `TimedOut`.
- `submitted_at`, `total_score`, `is_passed` là NULL khi bài chưa nộp.
- Hết thời gian (`started_at + Quiz.duration`) → hệ thống tự nộp, `status = TimedOut`.
- `is_passed` = (`total_score` >= `Quiz.passing_score`).

---

## 8. AttemptAnswer

| Column | Type | Constraint |
|---|---|---|
| attempt_answer_id | int | PK, identity |
| attempt_id | int | FK → QuizAttempt.attempt_id, NOT NULL |
| question_id | int | FK → Question.question_id, NOT NULL |
| selected_answer_id | int | FK → Answer.answer_id, **NULL được** |
| is_correct | bit | NOT NULL |
| answered_at | datetime2 | NOT NULL |

- `selected_answer_id` NULL nghĩa là User bỏ trống câu đó.
- **`is_correct` là snapshot tại thời điểm chấm bài.** Không được tính lại bằng cách join sang `Answer.is_correct`. Lý do: câu hỏi nằm trong ngân hàng dùng chung, Admin có thể sửa đáp án đúng sau này; nếu tính lại thì kết quả cũ của User sẽ bị thay đổi sai lệch.
- Xóa QuizAttempt → cascade xóa AttemptAnswer.
- FK tới Question và Answer dùng `DeleteBehavior.Restrict` để tránh multiple cascade paths trong SQL Server.

---

## Tổng hợp quan hệ

| Quan hệ | Kiểu |
|---|---|
| Role → User | 1 : N |
| User → Quiz (created_by) | 1 : N |
| User → Question (created_by) | 1 : N |
| Quiz → QuizQuestion | 1 : N |
| Question → QuizQuestion | 1 : N |
| Question → Answer | 1 : N |
| User → QuizAttempt | 1 : N |
| Quiz → QuizAttempt | 1 : N |
| QuizAttempt → AttemptAnswer | 1 : N |
| Question → AttemptAnswer | 1 : N |
| Answer → AttemptAnswer | 1 : N |

Kết quả: **Quiz ↔ Question là quan hệ N-N** thông qua `QuizQuestion`.

---

## Business Rules cần enforce ở tầng service

| ID | Rule |
|---|---|
| BR-01 | Email và username phải là duy nhất khi đăng ký |
| BR-02 | Mật khẩu tối thiểu 8 ký tự, có chữ và số |
| BR-03 | Sai mật khẩu 5 lần liên tiếp → khóa tài khoản 30 phút |
| BR-04 | Chỉ quiz `Published` mới cho phép làm bài |
| BR-05 | Hết giờ → tự động nộp bài với các đáp án hiện có |
| BR-06 | Mỗi question phải có >= 2 answer và >= 1 answer đúng |
| BR-07 | Mỗi quiz phải có >= 1 question mới được chuyển sang `Published` |
| BR-09 | `is_passed` xác định bằng `total_score >= passing_score` |
| BR-11 | Một question chỉ xuất hiện tối đa 1 lần trong cùng 1 quiz |
| BR-12 | Cảnh báo Admin trước khi sửa/xóa question đang được nhiều quiz dùng |
| BR-13 | Question đã có trong bài nộp thì archive, không xóa cứng |
| BR-14 | Xóa quiz chỉ xóa liên kết QuizQuestion, giữ nguyên question trong ngân hàng |

---

## Cấu hình kết nối

Named instance, Windows Authentication:

```
Server=localhost\\MSSQLSERVER03;Database=QuizAppDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

Database `QuizAppDb` được tạo tự động bởi `dotnet ef database update`, không tạo tay trong SSMS.
