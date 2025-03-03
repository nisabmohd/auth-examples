import { ZodError, type ZodIssue } from "zod";

const formatZodIssue = (issue: ZodIssue): string => {
    const { path, message } = issue;
    const pathString = path.join(".");

    return `${pathString}: ${message}`;
};

// Format the Zod error message with only the current error
export const formatZodError = (error: ZodError): string => {
    const { issues } = error;

    if (issues.length) {
        const currentIssue = issues[0];
        return formatZodIssue(currentIssue);
    }

    return "Validation error";
};

export function getErrorMessage(err: unknown) {
    if (err instanceof ZodError) {
        return formatZodError(err);
    }
    if (err instanceof Error) return err.message;
    return "Something went wrong";
}
