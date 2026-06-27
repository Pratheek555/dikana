import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>
            Start with one secure analytics workspace for your team.
          </CardDescription>
          <CardAction>
            <Button asChild variant="link" className="px-0">
              <Link href="/login">Log in</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            Already have a workspace? Log in with your email and password.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
