/**
 * Wire host DB into @nebutra/license once per process for landing API routes.
 */
import { getSystemDb } from "@nebutra/db";
import { configureLicenseSystemDb } from "@nebutra/license";

configureLicenseSystemDb(getSystemDb);
