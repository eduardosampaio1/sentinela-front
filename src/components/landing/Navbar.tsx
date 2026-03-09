import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground">
          Sentinela
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Product</a>
          <a href="#metrics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Metrics</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Login
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              Start Free
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
