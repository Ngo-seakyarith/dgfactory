import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/9u9rdfh7t/thedgacademy/Trainer%20Photo/**",
      },
    ],
  },
};

export default withWorkflow(nextConfig);
