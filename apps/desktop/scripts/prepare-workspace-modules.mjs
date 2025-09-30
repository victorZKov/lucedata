#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import path from "path";
import fs from "fs";
import { cp, mkdir, realpath, rm } from "fs/promises";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");
const packagedRoot = path.join(desktopRoot, "node_modules.packaged");
const packagedNodeModulesDir = path.join(packagedRoot, "node_modules");
const rendererDistSourceDir = path.join(repoRoot, "apps", "renderer", "dist");
const rendererDistTargetDir = path.join(desktopRoot, "dist", "renderer");

const workspacePackages = [
  {
    name: "@sqlhelper/storage",
    sourceDir: path.join(repoRoot, "packages", "storage"),
    include: ["package.json", "dist", "node_modules"]
  },
  {
    name: "@sqlhelper/database-core",
    sourceDir: path.join(repoRoot, "packages", "database-core"),
    include: ["package.json", "dist", "node_modules"]
  },
  {
    name: "@sqlhelper/ai-integration",
    sourceDir: path.join(repoRoot, "packages", "ai-integration"),
    include: ["package.json", "dist", "node_modules"]
  }
];

async function copyRendererDist() {
  if (!fs.existsSync(rendererDistSourceDir)) {
    throw new Error(
      `Renderer build artifacts not found at ${rendererDistSourceDir}. Run 'pnpm -w --filter @sqlhelper/renderer build' before packaging.`
    );
  }

  await mkdir(path.dirname(rendererDistTargetDir), { recursive: true });
  await rm(rendererDistTargetDir, { recursive: true, force: true });
  await cp(rendererDistSourceDir, rendererDistTargetDir, { recursive: true });
  console.log("Renderer dist copied to", rendererDistTargetDir);
}

async function runPnpmDeploy() {
  await rm(packagedRoot, { recursive: true, force: true });
  await mkdir(packagedRoot, { recursive: true });

  await new Promise((resolve, reject) => {
    const subprocess = spawn(
      "pnpm",
      ["--filter", "@sqlhelper/desktop", "--prod", "deploy", packagedRoot],
      { cwd: repoRoot, stdio: "inherit" }
    );

    subprocess.on("error", reject);
    subprocess.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm deploy exited with code ${code}`));
      }
    });
  });

  if (!fs.existsSync(packagedNodeModulesDir)) {
    throw new Error("pnpm deploy did not create node_modules directory.");
  }
}

async function hydrateWorkspacePackage(pkg) {
  const deployedSymlink = path.join(packagedNodeModulesDir, ...pkg.name.split("/"));

  if (!fs.existsSync(deployedSymlink)) {
    throw new Error(`Workspace package ${pkg.name} was not found in deployed node_modules.`);
  }

  const targetDir = await realpath(deployedSymlink);

  for (const entry of pkg.include) {
    const sourcePath = path.join(pkg.sourceDir, entry);
    const targetPath = path.join(targetDir, entry);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Required workspace artifact missing: ${sourcePath}`);
    }

    await rm(targetPath, { recursive: true, force: true });
    await cp(sourcePath, targetPath, { recursive: true, dereference: true });
  }
}

try {
  await runPnpmDeploy();
  await Promise.all(workspacePackages.map(hydrateWorkspacePackage));
  await copyRendererDist();
  console.log("Packaged node_modules prepared for packaging.");
} catch (error) {
  console.error("Failed to prepare packaged node_modules:", error);
  process.exitCode = 1;
}
