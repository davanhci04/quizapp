\# Quiz Application System



Đồ án SRS — hệ thống quiz trắc nghiệm trực tuyến.

Spec đầy đủ ở `docs/SRS\_QuizApplication.pdf`, thiết kế DB ở `docs/database-design.md`.



\## Tech stack

\- Backend: ASP.NET Core Web API (.NET 10 LTS), EF Core 10, SQL Server 2025

\- Frontend: Angular (standalone components), TypeScript

\- DB: SQL Server localhost, schema quản lý BẰNG EF Core Migration (không sửa tay trong SSMS)

\- IDE: Visual Studio 2026 (backend), Antigravity (frontend), SSMS 22 (xem DB)

\## Cấu trúc

\- `backend/` — solution .NET, mở bằng Visual Studio

\- `frontend/quiz-app/` — Angular app

\- `docs/` — tài liệu SRS, ERD



\## Actors \& quyền

\- Guest: xem quiz công khai, đăng ký

\- User: làm quiz, xem kết quả

\- Admin: quản lý quiz + question bank



\## Quy tắc quan trọng

\- Question nằm trong question bank dùng chung, liên kết với Quiz qua bảng QuizQuestion (N-N)

\- display\_order và score\_weight thuộc QuizQuestion, KHÔNG thuộc Question

\- AttemptAnswer.is\_correct là snapshot lúc chấm bài, không tính lại từ Answer

\- Mỗi Question phải có >= 2 Answer và >= 1 đáp án đúng



\## Lệnh hay dùng

\- Backend build: `cd backend \&\& dotnet build`

\- Migration: `dotnet ef migrations add <Name> \&\& dotnet ef database update`

\- Frontend: `cd frontend/quiz-app \&\& npm start`

