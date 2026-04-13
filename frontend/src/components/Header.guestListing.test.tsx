import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";

jest.mock("@/components/NotificationDropdown", () => ({
  NotificationDropdown: () => null,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

jest.mock("@/lib/api", () => ({
  apiClient: { getFavorites: jest.fn() },
}));

describe("Header guest Add Listing", () => {
  it("links Add Listing to the dashboard for logged-out users", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    const addListing = screen.getAllByRole("link", { name: /add listing/i }).find(
      (el) => el.getAttribute("href") === "/dashboard"
    );
    expect(addListing).toBeDefined();
  });
});
