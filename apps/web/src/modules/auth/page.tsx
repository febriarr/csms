import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group";
import { KeyRound, UserIcon } from "lucide-react";

export function Component() {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Masukkan username dan password yang diberikan oleh administrator.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="flex flex-col">
                    <FieldGroup>
                        <Field orientation={"responsive"}>
                            <FieldLabel htmlFor="username">Username</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    type="text"
                                    id="username"
                                    required
                                    aria-label="username"
                                    name="username"
                                />
                                <InputGroupAddon>
                                    <UserIcon />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                        <Field orientation={"responsive"}>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    type="password"
                                    id="password"
                                    required
                                    aria-label="password"
                                    name="password"
                                />
                                <InputGroupAddon>
                                    <KeyRound />
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                    </FieldGroup>

                    <Button className="mt-4" type="submit" size={"lg"}>
                        Login
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
