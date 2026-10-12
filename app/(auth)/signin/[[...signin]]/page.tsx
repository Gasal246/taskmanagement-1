/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

const formSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().max(128),
});

type AccountState = "idle" | "checking" | "password" | "setup" | "missing" | "error";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [accountState, setAccountState] = useState<AccountState>("idle");
  const [accountMessage, setAccountMessage] = useState("");
  const [sendingSetup, setSendingSetup] = useState(false);
  const [setupSent, setSetupSent] = useState(false);
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.status == "authenticated") {
      const destination = new URLSearchParams(window.location.search).get("callbackUrl") || "";
      router.replace(/^\/notifications\/[a-f0-9]{24}$/i.test(destination) ? destination : "/");
    }
  }, [session, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const email = form.watch("email");

  useEffect(() => {
    setAccountState("idle");
    setAccountMessage("");
    setSetupSent(false);
    form.setValue("password", "");

    const parsedEmail = z.string().trim().email().max(254).safeParse(email);
    if (!parsedEmail.success) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAccountState("checking");
      try {
        const response = await fetch("/api/auth/password-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsedEmail.data }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to check this account.");

        if (!result.exists) {
          setAccountState("missing");
          setAccountMessage("No active account was found for this email address.");
        } else {
          setAccountState(result.hasPassword ? "password" : "setup");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setAccountState("error");
        setAccountMessage(error instanceof Error ? error.message : "Unable to check this account.");
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [email, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (accountState !== "password") return;
    if (values.password.length < 6) {
      form.setError("password", { message: "Enter your password (at least 6 characters)." });
      return;
    }
    setLoading(true);
    try {
      const response = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
        isSuper: "false",
      });
      if (response?.error) {
        toast("Login Failed!", {
          description: response.status === 503 ? "Sign-in is temporarily unavailable. Please try again shortly." : response.error,
        });
      }
      if (response?.ok) {
        form.reset();
        toast("Login Success..", {
          description: "Welcome back " + values.email,
        });
      }
    } catch {
      toast("Unable to sign in", { description: "Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  async function sendSetPasswordEmail() {
    if (accountState !== "setup") return;
    setSendingSetup(true);
    try {
      const response = await fetch("/api/users/verification/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, kind: "link" }),
      });
      const result = await response.json();
      if (!response.ok || result?.status === false) throw new Error(result?.message || "Unable to send the email.");
      setSetupSent(true);
      toast.success("Set-password email sent", { description: "Please check your inbox and spam folder." });
    } catch (error) {
      toast.error("Email not sent", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSendingSetup(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-6 text-slate-100">
      <div className="absolute top-6 flex w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h1 className="text-sm font-semibold tracking-wide text-slate-200">Task Manager</h1>
        </div>
        <Link
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          <span className="flex items-center gap-1"><ExternalLink size={14} /> Docs</span>
        </Link>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          {/* <p className="text-xs tracking-[0.25em] text-slate-400">Welcome Back</p> */}
          <h2 className="mt-2 text-3xl font-bold text-white">Sign In</h2>
          <p className="mt-2 text-sm text-slate-400">Signin and get started with your workspace.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="email" autoComplete="username" placeholder="Enter your email"
                      className="border-slate-700 bg-transparent"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {accountState === "checking" && (
              <p className="text-sm text-slate-400">Checking your account…</p>
            )}

            {accountState === "password" && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Enter your password"
                        type="password" autoComplete="current-password"
                        {...field}
                        className="border-slate-700 bg-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(accountState === "missing" || accountState === "error") && (
              <p role="alert" className="text-sm text-rose-300">{accountMessage}</p>
            )}

            {accountState === "setup" && setupSent && (
              <p className="text-sm text-emerald-300">Check your email for the link to set your password.</p>
            )}

            {accountState === "password" && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  href={`/forgetpassword?email=${encodeURIComponent(email)}`}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Forgot password?
                </Link>
                <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
              </div>
            )}

            {accountState === "setup" && (
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={sendSetPasswordEmail} disabled={sendingSetup || setupSent}>
                  {sendingSetup ? "Sending…" : setupSent ? "Email sent" : "Set password"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>

      <div className="absolute bottom-16 w-full max-w-2xl px-2">
        <p className="text-center text-sm text-slate-400">
          Task Manager is a workflow management platform for organizing tasks, projects, and team operations in one place.{" "}
          <Link
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
          >
            Read the docs
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
