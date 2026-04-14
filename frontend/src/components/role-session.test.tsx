import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { RoleSession } from "@/components/role-session";
import { loginUser, registerUser } from "@/lib/api";
import { clearSession, readSession, writeSession } from "@/lib/session";


vi.mock("@/lib/api", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_EVENT: "food-delivery-session-changed",
  clearSession: vi.fn(),
  readSession: vi.fn(),
  writeSession: vi.fn(),
}));


const mockedLoginUser = vi.mocked(loginUser);
const mockedRegisterUser = vi.mocked(registerUser);
const mockedReadSession = vi.mocked(readSession);
const mockedWriteSession = vi.mocked(writeSession);
const mockedClearSession = vi.mocked(clearSession);

describe("RoleSession", () => {
  beforeEach(() => {
    mockedReadSession.mockReturnValue({ token: null, user: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers and stores a session for the requested role", async () => {
    mockedRegisterUser.mockResolvedValue({
      access_token: "customer-token",
      token_type: "bearer",
      user: { id: 1, role: "customer", name: "Alice", email: "alice@example.com" },
    });

    render(
      createElement(RoleSession, {
        role: "customer",
        title: "顾客入口",
        description: "顾客登录",
      }),
    );

    const inputs = screen.getAllByPlaceholderText(/请输入/);
    await userEvent.type(inputs[2], "Alice");
    await userEvent.type(inputs[3], "alice@example.com");
    await userEvent.type(inputs[4], "secret123");
    await userEvent.click(screen.getByRole("button", { name: "注册" }));

    await waitFor(() => {
      expect(mockedRegisterUser).toHaveBeenCalledWith({
        role: "customer",
        name: "Alice",
        email: "alice@example.com",
        password: "secret123",
      });
      expect(mockedWriteSession).toHaveBeenCalledWith("customer-token", {
        id: 1,
        role: "customer",
        name: "Alice",
        email: "alice@example.com",
      });
      expect(screen.getByText("已登录，当前账号：Alice。")).toBeInTheDocument();
    });
  });

  it("rejects login when the returned role does not match the requested role", async () => {
    mockedLoginUser.mockResolvedValue({
      access_token: "admin-token",
      token_type: "bearer",
      user: { id: 9, role: "admin", name: "Admin", email: "admin@example.com" },
    });

    render(
      createElement(RoleSession, {
        role: "customer",
        title: "顾客入口",
        description: "顾客登录",
      }),
    );

    const inputs = screen.getAllByPlaceholderText(/请输入/);
    await userEvent.type(inputs[0], "admin@example.com");
    await userEvent.type(inputs[1], "secret123");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(mockedLoginUser).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "secret123",
      });
      expect(mockedClearSession).toHaveBeenCalled();
      expect(mockedWriteSession).not.toHaveBeenCalled();
      expect(screen.getByText("当前账号角色是管理员，不是顾客。")).toBeInTheDocument();
    });
  });

  it("shows the logged-in state and allows logout", async () => {
    mockedReadSession.mockReturnValue({
      token: "merchant-token",
      user: { id: 5, role: "merchant", name: "Merchant", email: "merchant@example.com" },
    });

    render(
      createElement(RoleSession, {
        role: "merchant",
        title: "商家入口",
        description: "商家登录",
      }),
    );

    expect(screen.getByText("Merchant")).toBeInTheDocument();
    expect(screen.getByText("当前登录：merchant@example.com · 角色：商家")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(mockedClearSession).toHaveBeenCalled();
    expect(screen.getByText("已退出登录。")).toBeInTheDocument();
  });
});
