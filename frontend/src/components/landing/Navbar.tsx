import { Button } from "../../ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/clerk-react";

const navLinks = [
	{ label: "Home", href: "#" },
	{ label: "Features", href: "#features" },
	{ label: "Demo", href: "#demo" },
	{ label: "Testimonials", href: "#testimonials" },
];

export default function Navbar() {
	return (
		<motion.nav
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut" }}
			className="fixed w-full z-50 top-0 left-0 bg-black/20 backdrop-blur-lg border-b border-white/5"
		>
			<div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-20">
				<div className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
					DataSense
				</div>
				<div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
					{navLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="hover:text-cyan-300 transition-colors duration-300"
						>
							{link.label}
						</a>
					))}
				</div>
				<div className="flex items-center gap-4">
					<SignedOut>
						<SignInButton mode="modal">
							<Button variant="outline" className="border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400">
								Sign In
							</Button>
						</SignInButton>
						<SignUpButton mode="modal">
							<Button className="bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/10 text-white font-semibold rounded-lg transition-all duration-300">
								Sign Up
							</Button>
						</SignUpButton>
					</SignedOut>
					<SignedIn>
						<Button asChild className="bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/10 text-white font-semibold rounded-lg transition-all duration-300">
							<Link to="/dashboard">Dashboard</Link>
						</Button>
						<UserButton afterSignOutUrl="/" />
					</SignedIn>
				</div>
			</div>
		</motion.nav>
	);
}
