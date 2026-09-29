namespace QuizApp.Api.Entities;

public enum UserStatus { Active, Inactive, Locked }

public enum QuizStatus { Draft, Published, Archived }

public enum QuestionType { MultipleChoice, SingleChoice, TrueFalse, FillInTheBlanks, ShortAnswer, LongAnswer }

public enum QuestionDifficulty { Easy, Medium, Hard }

public enum QuestionStatus { Active, Archived }

public enum AttemptStatus { InProgress, Submitted, TimedOut }
