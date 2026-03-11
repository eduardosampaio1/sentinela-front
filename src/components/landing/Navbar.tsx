import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </span>
          <span>Sentinela</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Why now
          </a>
          <a href="#detection" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Detection
          </a>
          <a href="#workflow" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Workflow
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Security
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Login
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
