import type { FormEvent } from "react";
import { KeyRound, Loader2, UserIcon } from "lucide-react";

import { ErrorCode, type ErrorResponse } from "@workspace/shared";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";

import { getFieldError } from "@/lib/api-error";

import { useLogin } from "./hooks";

function getRootErrorMessage(error: ErrorResponse): string {
    switch (error.code) {
        case ErrorCode.UNAUTHORIZED:
            return "Incorrect username or password.";
        case ErrorCode.FORBIDDEN:
            return "Your account is not allowed to sign in. Contact your administrator.";
        case ErrorCode.TOO_MANY_REQUESTS:
            return "Too many attempts. Please wait a moment and try again.";
        case ErrorCode.SERVICE_UNAVAILABLE:
            return error.message;
        case ErrorCode.INTERNAL_ERROR:
            return "Something went wrong on our side. Please try again.";
        default:
            return getFieldError(error, "_root") ?? error.message;
    }
}

export function Component() {
    const login = useLogin();
    const error = login.error;

    const usernameError = getFieldError(error, "username");
    const passwordError = getFieldError(error, "password");
    // Field-level errors are shown next to their input; everything else goes above the button.
    const rootError = error && !usernameError && !passwordError ? getRootErrorMessage(error) : undefined;

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (login.isPending) return;

        const form = new FormData(event.currentTarget);
        login.mutate({
            username: String(form.get("username") ?? "").trim(),
            password: String(form.get("password") ?? ""),
        });
        // On success the cached user is set and <GuestOnly> redirects to the page the user came from.
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter the username and password provided by your administrator.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="flex flex-col" onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field orientation={"responsive"} data-invalid={!!usernameError}>
                            <FieldLabel htmlFor="username">Username</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    type="text"
                                    id="username"
                                    required
                                    aria-label="username"
                                    name="username"
                                    autoComplete="username"
                                    disabled={login.isPending}
                                    aria-invalid={!!usernameError}
                                />
                                <InputGroupAddon>
                                    <UserIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            {usernameError && <FieldError>{usernameError}</FieldError>}
                        </Field>
                        <Field orientation={"responsive"} data-invalid={!!passwordError}>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    type="password"
                                    id="password"
                                    required
                                    aria-label="password"
                                    name="password"
                                    autoComplete="current-password"
                                    disabled={login.isPending}
                                    aria-invalid={!!passwordError}
                                />
                                <InputGroupAddon>
                                    <KeyRound />
                                </InputGroupAddon>
                            </InputGroup>
                            {passwordError && <FieldError>{passwordError}</FieldError>}
                        </Field>
                    </FieldGroup>

                    {rootError && <FieldError className="mt-4">{rootError}</FieldError>}

                    <Button className="mt-4" type="submit" size={"lg"} disabled={login.isPending}>
                        {login.isPending && <Loader2 className="animate-spin" />}
                        {login.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
