
export interface StringifiedError {
  message: string;
  stack: string;
}


export function stringifyError(error?: Error) {
  const workerError: StringifiedError = {
    message: (error && error.message) || '',
    stack: (error && error.stack) || '',
  } 
  return workerError;
}