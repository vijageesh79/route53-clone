"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useAuth, ApiError } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { notify } = useNotification();
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await login(username, password);
      notify("success", "Signed in successfully");
      router.push("/hosted-zones");
    } catch (err) {
      notify("error", "Sign in failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <SpaceBetween size="l">
        <Box textAlign="center">
          <Box fontSize="display-l" fontWeight="bold" color="text-status-warning">
            aws
          </Box>
          <Header variant="h1" description="Sign in to your account">
            Route 53
          </Header>
        </Box>
        <FormField label="Username">
          <Input value={username} onChange={({ detail }) => setUsername(detail.value)} autoFocus />
        </FormField>
        <FormField label="Password">
          <Input type="password" value={password} onChange={({ detail }) => setPassword(detail.value)} />
        </FormField>
        <Button variant="primary" loading={loading} onClick={handleSubmit} fullWidth>
          Sign in
        </Button>
        <Box variant="p" color="text-body-secondary" textAlign="center">
          Demo credentials: admin / admin123
        </Box>
      </SpaceBetween>
    </Container>
  );
}
