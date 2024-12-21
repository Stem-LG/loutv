import { createBrowserRouter } from "react-router";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import CategoriesPage from "@/pages/CategoriesPage";
import ItemsPage from "@/pages/ItemsPage";
import PlayerPage from "@/pages/PlayerPage";
import ProfilePage from "@/pages/ProfilePage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <HomePage />,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/profile",
        element: <ProfilePage />,
    },
    {
        path: "/categories/:type",
        element: <CategoriesPage />,
    },
    {
        path: "/items/:categoryId",
        element: <ItemsPage />,
    },
    {
        path: "/player/:url",
        element: <PlayerPage />,
    },
]);
