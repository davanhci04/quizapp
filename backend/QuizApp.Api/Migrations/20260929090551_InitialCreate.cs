using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace QuizApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Role",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_name = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Role", x => x.role_id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_id = table.Column<int>(type: "int", nullable: false),
                    username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.user_id);
                    table.ForeignKey(
                        name: "FK_User_Role_role_id",
                        column: x => x.role_id,
                        principalTable: "Role",
                        principalColumn: "role_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Question",
                columns: table => new
                {
                    question_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    created_by = table.Column<int>(type: "int", nullable: false),
                    content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    question_type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    difficulty = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Question", x => x.question_id);
                    table.ForeignKey(
                        name: "FK_Question_User_created_by",
                        column: x => x.created_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Quiz",
                columns: table => new
                {
                    quiz_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    created_by = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    duration = table.Column<int>(type: "int", nullable: false),
                    passing_score = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    is_public = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quiz", x => x.quiz_id);
                    table.ForeignKey(
                        name: "FK_Quiz_User_created_by",
                        column: x => x.created_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Answer",
                columns: table => new
                {
                    answer_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    question_id = table.Column<int>(type: "int", nullable: false),
                    answer_text = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    is_correct = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    display_order = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Answer", x => x.answer_id);
                    table.ForeignKey(
                        name: "FK_Answer_Question_question_id",
                        column: x => x.question_id,
                        principalTable: "Question",
                        principalColumn: "question_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizAttempt",
                columns: table => new
                {
                    attempt_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    quiz_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    started_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    total_score = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    is_passed = table.Column<bool>(type: "bit", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "InProgress")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizAttempt", x => x.attempt_id);
                    table.ForeignKey(
                        name: "FK_QuizAttempt_Quiz_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "Quiz",
                        principalColumn: "quiz_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuizAttempt_User_user_id",
                        column: x => x.user_id,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "QuizQuestion",
                columns: table => new
                {
                    quiz_question_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    quiz_id = table.Column<int>(type: "int", nullable: false),
                    question_id = table.Column<int>(type: "int", nullable: false),
                    display_order = table.Column<int>(type: "int", nullable: false),
                    score_weight = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 1.00m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizQuestion", x => x.quiz_question_id);
                    table.ForeignKey(
                        name: "FK_QuizQuestion_Question_question_id",
                        column: x => x.question_id,
                        principalTable: "Question",
                        principalColumn: "question_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_QuizQuestion_Quiz_quiz_id",
                        column: x => x.quiz_id,
                        principalTable: "Quiz",
                        principalColumn: "quiz_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AttemptAnswer",
                columns: table => new
                {
                    attempt_answer_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    attempt_id = table.Column<int>(type: "int", nullable: false),
                    question_id = table.Column<int>(type: "int", nullable: false),
                    selected_answer_id = table.Column<int>(type: "int", nullable: true),
                    is_correct = table.Column<bool>(type: "bit", nullable: false),
                    answered_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttemptAnswer", x => x.attempt_answer_id);
                    table.ForeignKey(
                        name: "FK_AttemptAnswer_Answer_selected_answer_id",
                        column: x => x.selected_answer_id,
                        principalTable: "Answer",
                        principalColumn: "answer_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AttemptAnswer_Question_question_id",
                        column: x => x.question_id,
                        principalTable: "Question",
                        principalColumn: "question_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AttemptAnswer_QuizAttempt_attempt_id",
                        column: x => x.attempt_id,
                        principalTable: "QuizAttempt",
                        principalColumn: "attempt_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Role",
                columns: new[] { "role_id", "description", "role_name" },
                values: new object[,]
                {
                    { 1, "Quản trị viên: quản lý quiz và ngân hàng câu hỏi", "Admin" },
                    { 2, "Người dùng: làm quiz và xem kết quả", "User" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Answer_question_id",
                table: "Answer",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "IX_AttemptAnswer_attempt_id",
                table: "AttemptAnswer",
                column: "attempt_id");

            migrationBuilder.CreateIndex(
                name: "IX_AttemptAnswer_question_id",
                table: "AttemptAnswer",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "IX_AttemptAnswer_selected_answer_id",
                table: "AttemptAnswer",
                column: "selected_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_Question_created_by",
                table: "Question",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_Quiz_created_by",
                table: "Quiz",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttempt_quiz_id",
                table: "QuizAttempt",
                column: "quiz_id");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttempt_user_id",
                table: "QuizAttempt",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestion_question_id",
                table: "QuizQuestion",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "IX_QuizQuestion_quiz_id_question_id",
                table: "QuizQuestion",
                columns: new[] { "quiz_id", "question_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Role_role_name",
                table: "Role",
                column: "role_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_email",
                table: "User",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_User_role_id",
                table: "User",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_User_username",
                table: "User",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttemptAnswer");

            migrationBuilder.DropTable(
                name: "QuizQuestion");

            migrationBuilder.DropTable(
                name: "Answer");

            migrationBuilder.DropTable(
                name: "QuizAttempt");

            migrationBuilder.DropTable(
                name: "Question");

            migrationBuilder.DropTable(
                name: "Quiz");

            migrationBuilder.DropTable(
                name: "User");

            migrationBuilder.DropTable(
                name: "Role");
        }
    }
}
