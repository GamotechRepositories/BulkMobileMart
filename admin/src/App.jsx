import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Admin from "./pages/Admin";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Admin />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
