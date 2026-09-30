using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuizApp.Api.Migrations
{
    /// <inheritdoc />
    public partial class UniqueOpenAttempt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuizAttempt_quiz_id",
                table: "QuizAttempt");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttempt_quiz_id_user_id",
                table: "QuizAttempt",
                columns: new[] { "quiz_id", "user_id" },
                unique: true,
                filter: "[status] = 'InProgress'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuizAttempt_quiz_id_user_id",
                table: "QuizAttempt");

            migrationBuilder.CreateIndex(
                name: "IX_QuizAttempt_quiz_id",
                table: "QuizAttempt",
                column: "quiz_id");
        }
    }
}
