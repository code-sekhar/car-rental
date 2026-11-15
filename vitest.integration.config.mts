import "dotenv/config";
import {defineConfig} from "vitest/config";
import {fileURLToPath} from "node:url";
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith("_test"))throw new Error("Integration tests require a separate TEST_DATABASE_URL ending in _test.");
process.env.DATABASE_URL=url;process.env.MAIL_TRANSPORT="file";process.env.ALLOW_LOCAL_MAIL="true";process.env.LOCAL_MAIL_DIRECTORY=".local/test-mail";
export default defineConfig({resolve:{alias:{"server-only":fileURLToPath(new URL("./tests/helpers/server-only.ts",import.meta.url)),"@":fileURLToPath(new URL("./",import.meta.url))}},test:{include:["tests/integration/**/*.test.ts"],globalSetup:["./tests/helpers/prepare-test-db.ts"],fileParallelism:false,maxWorkers:1,testTimeout:20000}});
