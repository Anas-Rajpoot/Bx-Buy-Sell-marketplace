import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

jest.mock("@/components/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("Login", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("calls login with email normalized and password matching signup normalization", async () => {
    mockLogin.mockImplementation(async () => {
      localStorage.setItem("auth_token", "test-access-token");
      localStorage.setItem("user_data", JSON.stringify({ id: "1", email: "user@mail.com" }));
      return { success: true, user: { id: "1" } };
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/enter your email/i), "User@Mail.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "MySecret1");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@mail.com", "mysecret1");
    });
    expect(localStorage.getItem("auth_token")).toBe("test-access-token");
  });

  it("shows error when login fails", async () => {
    const { toast } = require("sonner");
    mockLogin.mockResolvedValue({ success: false, error: "Invalid Credentials" });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/enter your email/i), "a@b.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid Credentials");
    });
  });

  it("navigates to dashboard when listing publish is pending in session", async () => {
    const { LISTING_PUBLISH_PENDING_SESSION_KEY } = require("@/lib/listingGuestSession");
    sessionStorage.setItem(LISTING_PUBLISH_PENDING_SESSION_KEY, "1");
    mockLogin.mockResolvedValue({ success: true, user: { id: "1" } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/enter your email/i), "a@b.com");
    await user.type(screen.getByPlaceholderText(/enter your password/i), "pw");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});
