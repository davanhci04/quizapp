// Khớp với QuizApp.Api/DTOs/CatalogDtos.cs.

export interface CatalogQuiz {
  quizId: number;
  title: string;
  description: string | null;
  /** Thời lượng làm bài, phút. */
  duration: number;
  passingScore: number;
  isPublic: boolean;
  questionCount: number;
  totalScoreWeight: number;
  createdAt: string;
}
