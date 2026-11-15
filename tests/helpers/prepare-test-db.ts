import {execFileSync} from "node:child_process";
export default function setup(){execFileSync(process.execPath,["node_modules/prisma/build/index.js","migrate","deploy"],{env:{...process.env},stdio:"pipe"});execFileSync(process.execPath,["node_modules/tsx/dist/cli.mjs","prisma/seed.ts"],{env:{...process.env,DEMO_SEED:"true"},stdio:"pipe"});}
