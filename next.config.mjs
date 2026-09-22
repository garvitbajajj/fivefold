/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next generates AGENTS.md and CLAUDE.md on dev by default; this project
  // does not need them and they only add noise to the repository.
  agentRules: false,
};

export default nextConfig;
