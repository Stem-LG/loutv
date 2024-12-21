import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAppStore } from "@/store/useAppStore";
import { authenticate, type AuthenticationStatus } from "@/lib/api/iptv";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    server: z.string().url("Must be a valid URL"),
});

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAppStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<AuthenticationStatus>({
        success: false,
        loading: false,
        message: "",
    });
    const [progress, setProgress] = useState(0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            server: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        setError("");
        setProgress(0);
        setStatus({
            success: false,
            loading: true,
            message: "Starting authentication...",
        });

        try {
            const finalStatus = await authenticate(values, (status) => {
                setStatus(status);
                // Extract progress percentage from the message if it contains one
                if (status.message.includes("%")) {
                    const match = status.message.match(/(\d+)%/);
                    if (match) {
                        setProgress(parseInt(match[1]));
                    }
                }
            });

            if (finalStatus.success) {
                login(values);
                navigate("/");
            } else {
                setError(finalStatus.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect to server");
        } finally {
            setIsLoading(false);
            setStatus((prev) => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Login to IPTV</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input {...field} autoFocus disabled={isLoading} />
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
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="server"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Server URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="http://your-server.com"
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {status.loading && (
                                <div className="space-y-2">
                                    <Progress value={progress} className="w-full h-2" />
                                    <p className="text-sm text-muted-foreground text-center">{status.message}</p>
                                </div>
                            )}
                            {error && <div className="text-sm text-destructive text-center">{error}</div>}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Processing..." : "Login"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
