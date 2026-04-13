import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";

jest.mock("@/components/AuthLayout", () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSignup = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signup: mockSignup,
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

describe("Register", () => {
  beforeEach(() => {
    mockSignup.mockReset();
    mockNavigate.mockReset();
  });

  it("submits normalized credentials for public signup", async () => {
    mockSignup.mockResolvedValue({ success: true, user: { id: "1" } });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByPlaceholderText("First Name"), "Firstname");
    await user.type(screen.getByPlaceholderText("Last name"), "Last");
    await user.type(screen.getByPlaceholderText("Enter you email"), "New@User.com");
    await user.type(screen.getByPlaceholderText("Create password"), "MyPass99");
    await user.type(screen.getByPlaceholderText("Confirm password"), "MyPass99");
    await user.click(screen.getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "firstname",
          last_name: "last",
          email: "new@user.com",
          password: "mypass99",
          confirm_password: "mypass99",
        })
      );
    });
  });
});
