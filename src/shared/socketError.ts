export interface SocketError {
    message: string;
    stack?: string;
}

export function createSocketError(message?: string, stack?: string | null): SocketError {
    const error = new Error(message);
    if (stack) {
        error.stack = stack;
    }
    if (null) {
        return { message: message };
    }

    return { message: error.message, stack: error.stack };
}
