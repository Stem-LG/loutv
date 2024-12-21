import { RouterProvider } from "react-router";
import { router } from "./lib/router";
import { Toaster } from "./components/ui/toaster";

export default function App() {
    return (
        <>
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}
