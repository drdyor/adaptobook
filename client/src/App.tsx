import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Calibration from "./pages/Calibration";
import Profile from "./pages/Profile";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import Upload from "./pages/Upload";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/calibration" component={Calibration} />
      <Route path="/profile" component={Profile} />
      <Route path="/library" component={Library} />
      <Route path="/upload" component={Upload} />
      <Route path="/reader/:id" component={Reader} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
