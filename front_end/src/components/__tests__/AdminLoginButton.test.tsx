import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLoginButton from "@/components/AdminLoginButton";

describe("AdminLoginButton", () => {
  it("관리자 로그인 페이지(/login)로 연결되는 링크", () => {
    render(<AdminLoginButton />);
    const link = screen.getByRole("link", { name: "관리자 로그인" });
    expect(link).toHaveAttribute("href", "/login");
  });
});
