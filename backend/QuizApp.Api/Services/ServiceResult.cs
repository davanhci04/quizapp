namespace QuizApp.Api.Services;

public enum ServiceError
{
    None,
    NotFound,
    Validation,
    Conflict,
    /// <summary>Thao tác ảnh hưởng dữ liệu đang được dùng; client phải gửi lại kèm confirm=true.</summary>
    ConfirmationRequired,
}

public record ServiceResult<T>(T? Value, ServiceError Error = ServiceError.None, string? Message = null, int? Count = null)
{
    public bool Succeeded => Error == ServiceError.None;

    public static ServiceResult<T> Ok(T value) => new(value);
    public static ServiceResult<T> NotFound(string message) => new(default, ServiceError.NotFound, message);
    public static ServiceResult<T> Invalid(string message) => new(default, ServiceError.Validation, message);
    public static ServiceResult<T> Conflict(string message) => new(default, ServiceError.Conflict, message);
    public static ServiceResult<T> NeedsConfirmation(string message, int count) =>
        new(default, ServiceError.ConfirmationRequired, message, count);
}
