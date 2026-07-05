#!/usr/bin/env node

/**
 * Vercel Ignored Build Step
 *
 * This script tells Vercel whether to skip a build based on the commit message.
 * If the commit message contains "[skip ci]" or "skip deploy", the build will be skipped.
 *
 * Exit codes:
 * - 0: Skip the build
 * - 1: Continue with the build
 */

const { execSync } = require("child_process");

try {
  // Get the latest commit message
  const commitMessage = execSync("git log -1 --pretty=%B", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();

  console.log("Latest commit message:", commitMessage);

  // Check if the commit message contains skip patterns
  const skipPatterns = ["[skip ci]", "[skip deploy]"];
  const shouldSkip = skipPatterns.some((pattern) =>
    commitMessage.toLowerCase().includes(pattern.toLowerCase()),
  );

  if (shouldSkip) {
    console.log("Build skipped - commit message contains skip instruction");
    process.exit(0); // Skip build
  } else {
    console.log("Proceeding with build");
    process.exit(1); // Continue with build
  }
} catch (error) {
  console.error("Error checking commit message:", error.message);
  console.log("Proceeding with build due to error");
  process.exit(1); // Continue with build on error
}
