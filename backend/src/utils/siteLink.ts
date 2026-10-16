import { env } from "../config/env";

export const siteLink = (path: string) => `${env().frontendUrl.replace(/\/+$/, "")}${path}`;
