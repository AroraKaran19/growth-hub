import type { Metadata } from "next";
import { withDefaults } from "@/config/homeDefaults";
import { getHomeOverrides } from "@/libs/api/site";
import LoginPage from "../(pages)/Login/LoginPage";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in or sign up to Growth Hub with your mobile number or Google account.",
};

export default async function Login() {
  const { signin } = withDefaults(await getHomeOverrides());
  return <LoginPage image={signin.member} />;
}
