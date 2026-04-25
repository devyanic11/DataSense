import { Github, Twitter, Mail } from "lucide-react";

export default function Footer() {
	return (
		<footer className="mt-20 py-10 px-8 bg-white/10 backdrop-blur-md shadow-inner">
			<div className="flex flex-col md:flex-row justify-between items-center gap-4">
				<div>
					<span className="font-bold text-cyan-400">DataSense</span> &copy; {new Date().getFullYear()}<br />
					<span className="text-slate-400 text-sm">AI-powered analytics for everyone.</span>
				</div>
				<div className="flex gap-6 mt-2">
					<a href="https://github.com/" target="_blank" rel="noopener noreferrer"><Github className="w-5 h-5 hover:text-cyan-400" /></a>
					<a href="https://twitter.com/" target="_blank" rel="noopener noreferrer"><Twitter className="w-5 h-5 hover:text-cyan-400" /></a>
					<a href="mailto:info@datasense.com"><Mail className="w-5 h-5 hover:text-cyan-400" /></a>
				</div>
			</div>
		</footer>
	);
}
