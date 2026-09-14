import type { Metadata } from "next";
import LoginPage from "../(pages)/Login/LoginPage";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in or sign up to Growth Hub with your mobile number or Google account.",
};

export default function Login() {
  return <LoginPage />;
}
