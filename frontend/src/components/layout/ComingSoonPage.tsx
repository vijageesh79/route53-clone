"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";

export function ComingSoonPage({ title }: { title: string }) {
  const router = useRouter();

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="This feature is not available in this Route 53 clone demo.">
        {title}
      </Header>
      <Box textAlign="center" padding="xxl">
        <SpaceBetween size="m">
          <Header variant="h2">Coming Soon</Header>
          <Box variant="p" color="text-body-secondary">
            The {title} section is a placeholder in this assignment demo.
          </Box>
          <Button variant="primary" onClick={() => router.push("/hosted-zones")}>
            Go to Hosted zones
          </Button>
        </SpaceBetween>
      </Box>
    </SpaceBetween>
  );
}
