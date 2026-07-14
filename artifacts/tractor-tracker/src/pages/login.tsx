import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Lock, Smartphone, Tractor, BarChart3, Shield } from "lucide-react";
import logoUrl from "/smart-lekka-logo.png";

const loginSchema = z.object({
  mobile: z.string().min(1, "JCB Number / Mobile is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function TermsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="text-sm text-muted-foreground space-y-4 pb-2">
            <p className="font-semibold text-foreground">Smart Lekka — Terms of Use</p>
            <p>By using this application, you agree to the following terms and conditions set forth by BSP Tech Solutions.</p>
            <div>
              <p className="font-medium text-foreground mb-1">1. Acceptance of Terms</p>
              <p>Access to and use of Smart Lekka is subject to these Terms. By logging in, you confirm that you have read, understood, and accepted these Terms.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">2. Use of the Application</p>
              <p>Smart Lekka is a work and payment tracking tool for agricultural field operations. Users must use this system only for legitimate work tracking and payment management purposes.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">3. Account Responsibility</p>
              <p>You are responsible for maintaining the confidentiality of your JCB Number and password. Any activity under your account is your responsibility.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">4. Data Accuracy</p>
              <p>You agree to enter accurate and truthful information regarding work sessions, hours, and payments.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">5. Data Privacy</p>
              <p>All data entered into Smart Lekka is owned by the client organisation. BSP Tech Solutions will not share or disclose your data to third parties without explicit consent.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">6. Role-Based Access</p>
              <p>Access to data and features is governed by your assigned role (Admin, Supervisor, or JCB User). You must not attempt to access features beyond your assigned permissions.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">7. Intellectual Property</p>
              <p>Smart Lekka and all related software, designs, and content are the property of BSP Tech Solutions. You may not copy, modify, or distribute any part of this application without written permission.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">8. Governing Law</p>
              <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.</p>
            </div>
            <p className="border-t pt-3">For questions, contact: <a href="mailto:Support@BSPTechSolutions.com" className="text-primary hover:underline">Support@BSPTechSolutions.com</a></p>
          </div>
        </ScrollArea>
        <Button onClick={onClose} className="mt-2 w-full">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

const features = [
  { icon: Tractor, label: "Track JCB Work Sessions", desc: "Live timer & manual entry" },
  { icon: BarChart3, label: "Daily Settlement Reports", desc: "Per-JCB financial summaries" },
  { icon: Shield, label: "Role-Based Access", desc: "Supervisor, JCB & Admin roles" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [termsOpen, setTermsOpen] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        setLocation("/");
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: (error as any).data?.error || "Invalid JCB number / mobile or password",
          variant: "destructive",
        });
      },
    },
  });

  const onSubmit = (data: LoginValues) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-[45%] bg-sidebar flex-col justify-between p-10 relative overflow-hidden shrink-0">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sidebar-primary/10" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-sidebar-primary/8" />
          <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-white/3" />
        </div>

        <div className="relative z-10">
          <img src={logoUrl} alt="Smart Lekka" className="h-14 w-auto object-contain" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">
              Track Work.<br />Settle Easy.
            </h1>
            <p className="text-sidebar-foreground/50 mt-3 text-sm leading-relaxed">
              Complete JCB work & payment management for agricultural operations — from field tracking to daily settlements.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-sidebar-foreground/40">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-sidebar-foreground/30">
            A product of <span className="text-sidebar-foreground/50 font-semibold">BSP Tech Solutions</span>
          </p>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <img src={logoUrl} alt="Smart Lekka" className="h-20 w-auto object-contain mx-auto mb-2" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your Smart Lekka account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">JCB Number / Mobile</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Enter JCB number or mobile"
                          className="pl-10 h-11"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10 h-11"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-sm"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="text-primary hover:underline font-medium"
              >
                Terms & Conditions
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Support:{" "}
              <a href="mailto:Support@BSPTechSolutions.com" className="text-primary hover:underline">
                Support@BSPTechSolutions.com
              </a>
            </p>
          </div>
        </div>
      </div>

      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  );
}
