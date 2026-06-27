"use client";

import { useActionState } from "react";

import { signupUser, type AuthFormState } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupUser,
    initialState,
  );

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Pavitra Prabhakaran"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="********"
            minLength={8}
            required
          />
          <FieldDescription>
            Use at least 8 characters.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="workspaceName">Workspace name</FieldLabel>
          <Input
            id="workspaceName"
            name="workspaceName"
            type="text"
            autoComplete="organization"
            placeholder="Aurul Analytics"
            required
          />
          <FieldDescription>
            This is where your team&apos;s dashboards, sources, and alerts will live.
          </FieldDescription>
        </Field>

        {state.error ? <FieldError>{state.error}</FieldError> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating workspace..." : "Create workspace"}
        </Button>
      </FieldGroup>
    </form>
  );
}
